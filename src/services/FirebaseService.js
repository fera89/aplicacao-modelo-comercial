import { db, storage, functions } from './firebaseConfig';
import { collection, addDoc, updateDoc, doc, increment, getDoc, getDocs, setDoc, onSnapshot, query, where, orderBy, limit, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, getDownloadURL } from 'firebase/storage';

export const FirebaseService = {
    // ─── User ────────────────────────────────────────────
    async updateUser(userId, data) {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, data);
        } catch (error) {
            console.error('FirebaseService: Error updating user', error);
            throw error;
        }
    },

    // ─── Courses ─────────────────────────────────────────
    subscribeToCourses(callback) {
        const q = query(
            collection(db, 'courses'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
        );
        return onSnapshot(q, (snapshot) => {
            const courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(courses);
        }, (error) => {
            console.error('FirebaseService: Error subscribing to courses', error);
        });
    },

    async getCourseById(courseId) {
        try {
            const ref_ = doc(db, 'courses', courseId);
            const snap = await getDoc(ref_);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }
            return null;
        } catch (error) {
            console.error('FirebaseService: Error getting course', error);
            throw error;
        }
    },

    async getCourseModules(courseId) {
        try {
            const q = query(
                collection(db, 'courses', courseId, 'modules'),
                orderBy('order', 'asc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error('FirebaseService: Error getting modules', error);
            throw error;
        }
    },

    // ─── Progress ────────────────────────────────────────
    async getUserCourseProgress(userId, courseId) {
        try {
            const ref_ = doc(db, 'user_progress', userId, 'courses', courseId);
            const snap = await getDoc(ref_);
            if (snap.exists()) {
                return snap.data();
            }
            return null;
        } catch (error) {
            console.error('FirebaseService: Error getting progress', error);
            return null;
        }
    },

    async getAllUserProgress(userId) {
        try {
            const q = collection(db, 'user_progress', userId, 'courses');
            const snapshot = await getDocs(q);
            const progress = {};
            snapshot.docs.forEach(d => {
                progress[d.id] = d.data();
            });
            return progress;
        } catch (error) {
            console.error('FirebaseService: Error getting all progress', error);
            return {};
        }
    },

    async markLessonCompleted(userId, courseId, moduleId, lessonId, totalLessons, totalModules) {
        try {
            const progressRef = doc(db, 'user_progress', userId, 'courses', courseId);
            const snap = await getDoc(progressRef);
            const current = snap.exists() ? snap.data() : {
                startedAt: new Date().toISOString(),
                completedLessons: [],
                completedModules: [],
                progress: 0,
                status: 'in_progress'
            };

            const completedLessons = current.completedLessons || [];
            if (!completedLessons.includes(lessonId)) {
                completedLessons.push(lessonId);
            }

            // Calculate progress based on lesson completion
            const progress = Math.round((completedLessons.length / totalLessons) * 100);

            await setDoc(progressRef, {
                ...current,
                completedLessons,
                progress: Math.min(progress, 100),
                lastAccessedAt: new Date().toISOString(),
                status: progress >= 100 ? 'completed' : 'in_progress'
            });

            return { completedLessons, progress };
        } catch (error) {
            console.error('FirebaseService: Error marking lesson completed', error);
            throw error;
        }
    },

    async markModuleCompleted(userId, courseId, moduleId) {
        try {
            const progressRef = doc(db, 'user_progress', userId, 'courses', courseId);
            const snap = await getDoc(progressRef);
            if (!snap.exists()) return;

            const current = snap.data();
            const completedModules = current.completedModules || [];
            if (!completedModules.includes(moduleId)) {
                completedModules.push(moduleId);
            }

            await updateDoc(progressRef, { completedModules });
        } catch (error) {
            console.error('FirebaseService: Error marking module completed', error);
        }
    },

    // ─── Exams ───────────────────────────────────────────
    async getExam(examId) {
        try {
            const ref_ = doc(db, 'exams', examId);
            const snap = await getDoc(ref_);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }
            return null;
        } catch (error) {
            console.error('FirebaseService: Error getting exam', error);
            throw error;
        }
    },

    async getStandaloneExams() {
        try {
            const q = query(
                collection(db, 'exams'),
                where('standalone', '==', true),
                where('active', '==', true)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error('FirebaseService: Error getting standalone exams', error);
            return [];
        }
    },

    async generateTestFromAI(isTrainingMode, certificationId, examId) {
        try {
            const generateFn = httpsCallable(functions, 'generateCertificationTest', { timeout: 300000 });
            const result = await generateFn({ isTrainingMode, certificationId, examId });
            return result.data;
        } catch (error) {
            console.error('FirebaseService: Error generating test from AI', error);
            throw error;
        }
    },

    async getFeedbackFromAI(questionText, selectedOptionText, correctOptionText, certificationId) {
        try {
            const feedbackFn = httpsCallable(functions, 'getTrainingFeedback');
            const result = await feedbackFn({ questionText, selectedOptionText, correctOptionText, certificationId });
            return result.data.feedback;
        } catch (error) {
            console.error('FirebaseService: Error getting feedback from AI', error);
            throw error;
        }
    },

    async updateAttempt(attemptId, data) {
        try {
            const ref_ = doc(db, 'exam_attempts', attemptId);
            await updateDoc(ref_, data);
        } catch (error) {
            console.error('FirebaseService: Error updating attempt', error);
        }
    },

    // ─── Certifications ──────────────────────────────────
    async getCertifications() {
        try {
            const q = query(
                collection(db, 'certifications'),
                where('active', '==', true)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error('FirebaseService: Error getting certifications', error);
            return [];
        }
    },

    async getCertificationRules(certificationId) {
        try {
            if (!certificationId) return null;
            const ref_ = doc(db, 'certifications', certificationId);
            const snap = await getDoc(ref_);
            if (snap.exists()) {
                return snap.data();
            }
            return null;
        } catch (error) {
            console.error('FirebaseService: Error getting certification rules', error);
            throw error;
        }
    },

    async getUserCertificates(userId) {
        try {
            const q = query(
                collection(db, 'certificates'),
                where('userId', '==', userId),
                orderBy('issuedAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error('FirebaseService: Error getting user certificates', error);
            return [];
        }
    },

    // ─── Sales Goal ──────────────────────────────────────
    subscribeToSalesGoal(month, callback) {
        return onSnapshot(doc(db, 'sales_goals', month), (snap) => {
            callback(snap.exists() ? snap.data() : null);
        }, (error) => {
            console.error('FirebaseService: Error subscribing to sales goal', error);
        });
    },

    // ─── Sales Ranking ───────────────────────────────────
    subscribeToSalesRanking(month, callback) {
        const q = query(
            collection(db, 'sales_monthly'),
            where('month', '==', month)
        );
        return onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (b.value || 0) - (a.value || 0));
            callback(items);
        }, (error) => {
            console.error('FirebaseService: Error subscribing to sales ranking', error);
        });
    },

    // ─── Ranking ─────────────────────────────────────────
    subscribeToRanking(callback, limitCount = 50) {
        const q = query(
            collection(db, 'ranking_scores'),
            orderBy('totalPoints', 'desc'),
            limit(limitCount)
        );
        return onSnapshot(q, (snapshot) => {
            const ranking = snapshot.docs.map((d, index) => ({
                id: d.id,
                position: index + 1,
                ...d.data()
            }));
            callback(ranking);
        }, (error) => {
            console.error('FirebaseService: Error subscribing to ranking', error);
        });
    },

    async addPoints(userId, points, action) {
        try {
            const rankRef = doc(db, 'ranking_scores', userId);
            const snap = await getDoc(rankRef);

            if (snap.exists()) {
                await updateDoc(rankRef, {
                    totalPoints: increment(points),
                    weeklyPoints: increment(points),
                    monthlyPoints: increment(points),
                    lastActivityAt: new Date().toISOString()
                });
            } else {
                // Get user name for display
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : {};

                await setDoc(rankRef, {
                    name: userData.name || userData.email || 'Vendedor',
                    photoURL: userData.photoURL || null,
                    totalPoints: points,
                    weeklyPoints: points,
                    monthlyPoints: points,
                    coursesCompleted: 0,
                    examsCompleted: 0,
                    certificatesEarned: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    lastActivityAt: new Date().toISOString(),
                    badges: []
                });
            }

            // Log point event
            await addDoc(collection(db, 'points_log'), {
                userId,
                points,
                action,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('FirebaseService: Error adding points', error);
        }
    },

    // ─── Assistant ────────────────────────────────────────
    async askAssistant(message, history = [], imageBase64 = null) {
        try {
            const askFn = httpsCallable(functions, 'askAssistant', { timeout: 300000 });
            const result = await askFn({ message, history, imageBase64 });
            return result.data.reply;
        } catch (error) {
            console.error('FirebaseService: Error asking assistant', error);
            throw error;
        }
    },

    // ─── Video URL ───────────────────────────────────────
    async getVideoUrl(storagePath) {
        try {
            const videoRef = ref(storage, storagePath);
            return await getDownloadURL(videoRef);
        } catch (error) {
            console.error('FirebaseService: Error getting video URL', error);
            throw error;
        }
    }
};
