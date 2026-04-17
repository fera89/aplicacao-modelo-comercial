import { db, functions } from './firebase.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

let courses = [];
let currentCourseId = null;
let currentModules = [];

export function initCursos() {
    loadCourses();
    setupEventListeners();
}

// ─── Event Listeners ─────────────────────────────────
function setupEventListeners() {
    // New Course Button
    document.getElementById('btnNewCourse')?.addEventListener('click', () => openCourseModal());

    // Course Form
    document.getElementById('courseForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCourse();
    });

    // Close/Cancel course modal
    document.getElementById('closeCourseModalBtn')?.addEventListener('click', closeCourseModal);
    document.getElementById('cancelCourseModalBtn')?.addEventListener('click', closeCourseModal);

    // Back to courses list
    document.getElementById('btnBackToCourses')?.addEventListener('click', () => {
        document.getElementById('cursos-list-view').style.display = 'block';
        document.getElementById('cursos-detail-view').style.display = 'none';
    });

    // Add Module
    document.getElementById('btnAddModule')?.addEventListener('click', () => openModuleModal());

    // Module Form
    document.getElementById('moduleForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveModule();
    });

    // Close/Cancel module modal
    document.getElementById('closeModuleModalBtn')?.addEventListener('click', closeModuleModal);
    document.getElementById('cancelModuleModalBtn')?.addEventListener('click', closeModuleModal);

    // Lesson Form
    document.getElementById('lessonForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveLesson();
    });

    document.getElementById('closeLessonModalBtn')?.addEventListener('click', closeLessonModal);
    document.getElementById('cancelLessonModalBtn')?.addEventListener('click', closeLessonModal);

    // Exam Form
    document.getElementById('examForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveExam();
    });

    document.getElementById('closeExamModalBtn')?.addEventListener('click', closeExamModal);
    document.getElementById('cancelExamModalBtn')?.addEventListener('click', closeExamModal);
}

// ─── Load Courses ────────────────────────────────────
async function loadCourses() {
    const container = document.getElementById('coursesList');
    if (!container) return;
    container.innerHTML = '<p style="color: var(--text-muted);">Carregando cursos...</p>';

    try {
        const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        courses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCoursesList();
    } catch (e) {
        console.error('Error loading courses', e);
        container.innerHTML = '<p style="color: #ef4444;">Erro ao carregar cursos.</p>';
    }
}

function renderCoursesList() {
    const container = document.getElementById('coursesList');
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <h3>Nenhum curso criado</h3>
                <p>Clique em "Novo Curso" para começar</p>
            </div>`;
        return;
    }

    container.innerHTML = courses.map(c => `
        <div class="card" style="margin-bottom: 12px; cursor: pointer;" onclick="window._openCourseDetail('${c.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <h3 style="margin: 0;">${c.name}</h3>
                    <p style="color: var(--text-muted); margin: 4px 0 0 0; font-size: 0.85rem;">
                        ${c.totalModules || 0} módulos • ${c.totalLessons || 0} aulas •
                        <span style="color: ${c.status === 'active' ? 'var(--primary)' : '#f59e0b'};">
                            ${c.status === 'active' ? '✅ Ativo' : '📝 Rascunho'}
                        </span>
                    </p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-secondary" style="padding: 6px 12px;" onclick="event.stopPropagation(); window._editCourse('${c.id}')">Editar</button>
                    <button class="btn-secondary" style="padding: 6px 12px; color: #ef4444;" onclick="event.stopPropagation(); window._deleteCourse('${c.id}')">Excluir</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ─── Course CRUD ─────────────────────────────────────
function openCourseModal(courseData = null) {
    document.getElementById('courseModal').style.display = 'flex';
    document.getElementById('courseModalTitle').textContent = courseData ? 'Editar Curso' : 'Novo Curso';
    document.getElementById('course-id').value = courseData?.id || '';
    document.getElementById('course-name').value = courseData?.name || '';
    document.getElementById('course-description').value = courseData?.description || '';
    document.getElementById('course-coverImage').value = courseData?.coverImage || '';
    document.getElementById('course-status').value = courseData?.status || 'draft';
    document.getElementById('course-requireFullWatch').checked = courseData?.requireFullWatch ?? true;
}

function closeCourseModal() {
    document.getElementById('courseModal').style.display = 'none';
}

async function saveCourse() {
    const id = document.getElementById('course-id').value;
    const data = {
        name: document.getElementById('course-name').value,
        description: document.getElementById('course-description').value,
        coverImage: document.getElementById('course-coverImage').value,
        status: document.getElementById('course-status').value,
        requireFullWatch: document.getElementById('course-requireFullWatch').checked,
        updatedAt: new Date().toISOString(),
    };

    try {
        if (id) {
            await updateDoc(doc(db, 'courses', id), data);
        } else {
            data.createdAt = new Date().toISOString();
            data.totalModules = 0;
            data.totalLessons = 0;
            data.totalDuration = 0;
            await addDoc(collection(db, 'courses'), data);
        }
        closeCourseModal();
        loadCourses();
    } catch (e) {
        console.error('Error saving course', e);
        alert('Erro ao salvar curso: ' + e.message);
    }
}

// ─── Course Detail View ──────────────────────────────
window._openCourseDetail = async function (courseId) {
    currentCourseId = courseId;
    document.getElementById('cursos-list-view').style.display = 'none';
    document.getElementById('cursos-detail-view').style.display = 'block';

    const course = courses.find(c => c.id === courseId);
    document.getElementById('detail-course-name').textContent = course?.name || 'Curso';

    await loadModules(courseId);
};

window._editCourse = function (courseId) {
    const course = courses.find(c => c.id === courseId);
    if (course) openCourseModal(course);
};

window._deleteCourse = async function (courseId) {
    if (!confirm('Tem certeza que deseja excluir este curso e todos seus módulos/aulas?')) return;
    try {
        await deleteDoc(doc(db, 'courses', courseId));
        loadCourses();
    } catch (e) {
        alert('Erro ao excluir: ' + e.message);
    }
};

// ─── Modules ─────────────────────────────────────────
async function loadModules(courseId) {
    const container = document.getElementById('modulesList');
    container.innerHTML = '<p style="color: var(--text-muted);">Carregando módulos...</p>';

    try {
        const q = query(collection(db, 'courses', courseId, 'modules'), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        currentModules = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderModules();

        // Update course stats
        const totalLessons = currentModules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
        await updateDoc(doc(db, 'courses', courseId), {
            totalModules: currentModules.length,
            totalLessons: totalLessons
        });
    } catch (e) {
        console.error('Error loading modules', e);
        container.innerHTML = '<p style="color: #ef4444;">Erro ao carregar módulos.</p>';
    }
}

function renderModules() {
    const container = document.getElementById('modulesList');
    if (currentModules.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 40px 0;">
                <p>Nenhum módulo ainda. Clique em "Adicionar Módulo" para começar.</p>
            </div>`;
        return;
    }

    container.innerHTML = currentModules.map((m, i) => {
        const lessons = m.lessons || [];
        return `
        <div class="card" style="margin-bottom: 16px; border-left: 3px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3 style="margin: 0;">Módulo ${i + 1}: ${m.name}</h3>
                    <p style="color: var(--text-muted); margin: 4px 0 0 0; font-size: 0.85rem;">
                        ${lessons.length} aula(s) ${m.examId ? '• 📝 Prova vinculada' : ''}
                    </p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;"
                        onclick="window._addLesson('${m.id}')">+ Aula</button>
                    <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;"
                        onclick="window._configExam('${m.id}')">📝 Prova</button>
                    <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; color: #ef4444;"
                        onclick="window._deleteModule('${m.id}')">Excluir</button>
                </div>
            </div>
            ${lessons.length > 0 ? `
                <div style="margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px;">
                    ${lessons.map((l, li) => `
                        <div style="display: flex; align-items: center; padding: 8px 0; gap: 8px; ${li > 0 ? 'border-top: 1px solid var(--border);' : ''}">
                            <span style="color: var(--primary); font-weight: bold; min-width: 24px;">${li + 1}.</span>
                            <span style="flex: 1;">${l.title}</span>
                            <span style="color: var(--text-muted); font-size: 0.8rem;">${l.duration || ''}</span>
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444;"
                                onclick="window._deleteLesson('${m.id}', '${l.id}')">✕</button>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
        `;
    }).join('');
}

// Module CRUD
function openModuleModal() {
    document.getElementById('moduleModal').style.display = 'flex';
    document.getElementById('module-name').value = '';
    document.getElementById('module-description').value = '';
    document.getElementById('module-order').value = currentModules.length + 1;
}

function closeModuleModal() {
    document.getElementById('moduleModal').style.display = 'none';
}

async function saveModule() {
    if (!currentCourseId) return;
    const data = {
        name: document.getElementById('module-name').value,
        description: document.getElementById('module-description').value,
        order: parseInt(document.getElementById('module-order').value) || 1,
        lessons: [],
        examId: null,
    };

    try {
        await addDoc(collection(db, 'courses', currentCourseId, 'modules'), data);
        closeModuleModal();
        loadModules(currentCourseId);
    } catch (e) {
        alert('Erro ao salvar módulo: ' + e.message);
    }
}

window._deleteModule = async function (moduleId) {
    if (!confirm('Excluir este módulo e suas aulas?')) return;
    try {
        await deleteDoc(doc(db, 'courses', currentCourseId, 'modules', moduleId));
        loadModules(currentCourseId);
    } catch (e) {
        alert('Erro: ' + e.message);
    }
};

// ─── Video Upload via Signed URL + XHR (bypasses Firebase SDK HTTP/2 bug) ───
async function uploadVideoViaSignedUrl(file, storagePath, progressEl) {
    const contentType = file.type || 'video/mp4';

    // 1. Get signed upload URL from Cloud Function
    progressEl.textContent = 'Preparando upload...';
    progressEl.style.color = 'var(--primary)';
    const getSignedUploadUrl = httpsCallable(functions, 'getSignedUploadUrl');
    const { data } = await getSignedUploadUrl({ filePath: storagePath, contentType });
    const { uploadUrl } = data;

    // 2. Upload directly via XHR — avoids the ERR_HTTP2_PROTOCOL_ERROR do Firebase SDK
    await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.timeout = 60 * 60 * 1000; // 1h timeout para arquivos grandes

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressEl.textContent = `Fazendo upload do vídeo... ${percent}%`;
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload falhou: HTTP ${xhr.status} ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => reject(new Error('Erro de rede durante o upload'));
        xhr.ontimeout = () => reject(new Error('Timeout: upload demorou mais de 1 hora'));

        xhr.send(file);
    });

    // 3. Finalize: set download token + CDN cache headers via Cloud Function
    progressEl.textContent = 'Finalizando...';
    const finalizeVideoUpload = httpsCallable(functions, 'finalizeVideoUpload');
    const result = await finalizeVideoUpload({ filePath: storagePath });
    return result.data.downloadUrl;
}

// ─── Lessons ─────────────────────────────────────────
let currentLessonModuleId = null;

window._addLesson = function (moduleId) {
    currentLessonModuleId = moduleId;
    document.getElementById('lessonModal').style.display = 'flex';
    document.getElementById('lesson-title').value = '';
    document.getElementById('lesson-description').value = '';
    document.getElementById('lesson-duration').value = '';
    document.getElementById('lesson-videoFile').value = '';
    document.getElementById('lesson-uploadProgress').style.display = 'none';
    document.getElementById('lesson-uploadProgress').textContent = '';
};

function closeLessonModal() {
    document.getElementById('lessonModal').style.display = 'none';
}

async function saveLesson() {
    if (!currentCourseId || !currentLessonModuleId) return;

    const fileInput = document.getElementById('lesson-videoFile');
    const file = fileInput.files[0];

    const lessonId = 'lesson_' + Date.now();
    const title = document.getElementById('lesson-title').value;
    const description = document.getElementById('lesson-description').value;
    const duration = document.getElementById('lesson-duration').value;

    let videoUrl = '';

    // Upload video if provided
    if (file) {
        const progressEl = document.getElementById('lesson-uploadProgress');
        progressEl.style.display = 'block';

        const storagePath = `course_videos/${currentCourseId}/${currentLessonModuleId}/${lessonId}_${file.name}`;

        try {
            videoUrl = await uploadVideoViaSignedUrl(file, storagePath, progressEl);
            progressEl.textContent = '✅ Upload concluído!';
            progressEl.style.color = 'var(--primary)';
        } catch (e) {
            progressEl.textContent = `❌ Falha no upload: ${e.message}`;
            progressEl.style.color = '#ef4444';
            throw e;
        }
    }

    // Add lesson to module's lessons array
    try {
        const moduleRef = doc(db, 'courses', currentCourseId, 'modules', currentLessonModuleId);
        const moduleSnap = await getDoc(moduleRef);
        const moduleData = moduleSnap.data();
        const lessons = moduleData.lessons || [];

        lessons.push({
            id: lessonId,
            title,
            description,
            duration,
            videoUrl,
            order: lessons.length + 1,
        });

        await updateDoc(moduleRef, { lessons });
        closeLessonModal();
        loadModules(currentCourseId);
    } catch (e) {
        alert('Erro ao salvar aula: ' + e.message);
    }
}

window._deleteLesson = async function (moduleId, lessonId) {
    if (!confirm('Excluir esta aula?')) return;
    try {
        const moduleRef = doc(db, 'courses', currentCourseId, 'modules', moduleId);
        const moduleSnap = await getDoc(moduleRef);
        const lessons = (moduleSnap.data().lessons || []).filter(l => l.id !== lessonId);
        await updateDoc(moduleRef, { lessons });
        loadModules(currentCourseId);
    } catch (e) {
        alert('Erro: ' + e.message);
    }
};

// ─── Exam Config ─────────────────────────────────────
let currentExamModuleId = null;

window._configExam = async function (moduleId) {
    currentExamModuleId = moduleId;
    const module = currentModules.find(m => m.id === moduleId);

    // Load existing exam if any
    if (module?.examId) {
        try {
            const examSnap = await getDoc(doc(db, 'exams', module.examId));
            if (examSnap.exists()) {
                const exam = examSnap.data();
                document.getElementById('exam-questionCount').value = exam.questionCount || 20;
                document.getElementById('exam-minScore').value = exam.minScore || 70;
                document.getElementById('exam-timerEnabled').checked = exam.timerEnabled || false;
                document.getElementById('exam-timerMinutes').value = exam.timerMinutes || 30;
                document.getElementById('exam-randomize').checked = exam.randomizeQuestions ?? true;
                document.getElementById('exam-aiGenerated').checked = exam.aiGenerated ?? true;
                document.getElementById('exam-maxAttempts').value = exam.maxAttempts || 0;
                document.getElementById('exam-showFeedback').checked = exam.showFeedback ?? true;
                document.getElementById('exam-context').value = exam.contextContent || '';
            }
        } catch (e) {
            console.error('Error loading exam', e);
        }
    } else {
        // Defaults
        document.getElementById('exam-questionCount').value = 20;
        document.getElementById('exam-minScore').value = 70;
        document.getElementById('exam-timerEnabled').checked = false;
        document.getElementById('exam-timerMinutes').value = 30;
        document.getElementById('exam-randomize').checked = true;
        document.getElementById('exam-aiGenerated').checked = true;
        document.getElementById('exam-maxAttempts').value = 0;
        document.getElementById('exam-showFeedback').checked = true;
        document.getElementById('exam-context').value = '';
    }

    document.getElementById('examModal').style.display = 'flex';
};

function closeExamModal() {
    document.getElementById('examModal').style.display = 'none';
}

async function saveExam() {
    if (!currentCourseId || !currentExamModuleId) return;

    const module = currentModules.find(m => m.id === currentExamModuleId);
    const examData = {
        courseId: currentCourseId,
        moduleId: currentExamModuleId,
        name: `Avaliação - ${module?.name || 'Módulo'}`,
        standalone: false,
        active: true,
        questionCount: parseInt(document.getElementById('exam-questionCount').value) || 20,
        minScore: parseInt(document.getElementById('exam-minScore').value) || 70,
        timerEnabled: document.getElementById('exam-timerEnabled').checked,
        timerMinutes: parseInt(document.getElementById('exam-timerMinutes').value) || 30,
        randomizeQuestions: document.getElementById('exam-randomize').checked,
        aiGenerated: document.getElementById('exam-aiGenerated').checked,
        maxAttempts: parseInt(document.getElementById('exam-maxAttempts').value) || 0,
        showFeedback: document.getElementById('exam-showFeedback').checked,
        contextContent: document.getElementById('exam-context').value,
        updatedAt: new Date().toISOString(),
    };

    try {
        let examId;
        if (module?.examId) {
            examId = module.examId;
            await updateDoc(doc(db, 'exams', examId), examData);
        } else {
            examData.createdAt = new Date().toISOString();
            examData.questions = [];
            const examRef = await addDoc(collection(db, 'exams'), examData);
            examId = examRef.id;
            // Link exam to module
            await updateDoc(doc(db, 'courses', currentCourseId, 'modules', currentExamModuleId), {
                examId: examId
            });
        }
        closeExamModal();
        loadModules(currentCourseId);
    } catch (e) {
        alert('Erro ao salvar prova: ' + e.message);
    }
}
