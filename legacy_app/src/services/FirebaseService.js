import { db } from './firebaseConfig';
import { collection, addDoc, updateDoc, doc, increment, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const FirebaseService = {
    async updateUser(userId, data) {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, data);
            console.log('FirebaseService: User updated successfully');
        } catch (error) {
            console.error('FirebaseService: Error updating user', error);
            throw error;
        }
    },

    async logImpact(userId, impactData) {
        try {
            await addDoc(collection(db, 'impact_logs'), {
                userId,
                timestamp: new Date(),
                ...impactData
            });
            console.log('FirebaseService: Impact logged successfully');
        } catch (error) {
            console.error('FirebaseService: Error logging impact', error);
        }
    },

    async updateEventStats(newStats) {
        try {
            const statsRef = doc(db, 'events', 'insight_2026');

            await setDoc(statsRef, {
                totalCo2Saved: increment(newStats.co2Saved || 0),
                totalCarbonFootprint: increment(newStats.carbonFootprint || 0),
                totalActions: increment(1)
            }, { merge: true });

            console.log('FirebaseService: Event stats updated');
        } catch (error) {
            console.error('FirebaseService: Error updating stats', error);
        }
    },

    subscribeToEventStats(callback) {
        const statsRef = doc(db, 'events', 'insight_2026');

        return onSnapshot(statsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                callback({
                    totalAttendees: data.totalAttendees || 0,
                    carbonFootprint: data.totalCarbonFootprint || 0,
                    co2Saved: data.totalCo2Saved || 0,
                    totalActions: data.totalActions || 0
                });
            }
        }, (error) => {
            console.error("FirebaseService: Error waiting for stats", error);
        });
    }
};
