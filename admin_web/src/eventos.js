import { db } from './firebase.js';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';

// References - List View
const viewList = document.getElementById('view-conteudos');
const eventosBody = document.getElementById('eventsTableBody');
const openModalBtn = document.getElementById('openEventModalBtn');

// References - Modal
const eventModal = document.getElementById('eventModal');
const closeEvModalBtn = document.getElementById('closeEvModalBtn');
const cancelEvModalBtn = document.getElementById('cancelEvModalBtn');
const saveEventBtn = document.getElementById('saveEventBtn');
const domEvName = document.getElementById('ev-name');

// References - Details View
const viewDetails = document.getElementById('view-evento-detalhes');
const btnBackToEvents = document.getElementById('btnBackToEvents');
const titleDetails = document.getElementById('detalhesEventTitle');
const tabsList = document.getElementById('eventDaysTabsList');
const activeDaySettingsContainer = document.getElementById('activeDaySettings');
const detailsEventNameInput = document.getElementById('detailsEventNameInput');
const activeDayLabel = document.getElementById('activeDayLabel');
const activeDayDate = document.getElementById('activeDayDate');
const btnDelActiveDay = document.getElementById('btnDelActiveDay');
const btnAddActivity = document.getElementById('btnAddActivity');
const accordionContainer = document.getElementById('activitiesAccordionContainer');

// Global State
let globalEventsMap = {};
let currentEditingEvent = null; // Full event object being edited in details view
let currentActiveDayIndex = -1;

export function initEventos() {
    setupModalEvents();
    setupDetailsEvents();
    listenEvents();
}

function listenEvents() {
    onSnapshot(collection(db, "events"), (snapshot) => {
        eventosBody.innerHTML = '';
        globalEventsMap = {};

        if (snapshot.empty) {
            eventosBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted)">Nenhum evento criado.</td></tr>';
            return;
        }

        // Render List, sorting Active first
        const docs = [];
        snapshot.forEach(d => {
            const data = d.data();
            globalEventsMap[data.id] = data;
            docs.push(data);
        });

        docs.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0)); // Active at top

        docs.forEach(ev => {
            const tr = document.createElement('tr');

            let statusHtml = ev.isActive
                ? `<span class="badge" style="background:rgba(52, 211, 153, 0.2); color:#10b981; border-color:rgba(52, 211, 153, 0.3)">⭐ ATIVO NO APP</span>`
                : `<span class="badge" style="background:rgba(245, 158, 11, 0.2); color:#f59e0b; border-color:rgba(245, 158, 11, 0.3)">INATIVO</span>`;

            if (ev.isActive) {
                tr.style.background = 'rgba(59, 130, 246, 0.05)';
            }

            tr.innerHTML = `
                <td><strong>${ev.name || 'Sem Nome'}</strong><br><span style="font-size:0.75rem; color:var(--text-muted)">ID: ${ev.id}</span></td>
                <td>${(ev.days || []).length} dia(s) configurado(s)</td>
                <td>${statusHtml}</td>
                <td>
                    ${!ev.isActive ? `<button class="btn-make-active" data-id="${ev.id}" style="background:none; border:none; cursor:pointer; color:var(--primary); margin-right:12px; font-size:12px;">🌟 Tornar Ativo</button>` : `<span style="display:inline-block; width: 85px; margin-right:12px"></span>`}
                    <button class="btn-edit-details btn-primary" data-id="${ev.id}" style="padding:4px 8px; font-size:12px; margin-right:8px;">Gerenciar Eventos</button>
                    <button class="btn-del" data-id="${ev.id}" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:12px;">Excluir</button>
                </td>
            `;

            tr.querySelector('.btn-edit-details').addEventListener('click', () => {
                openEventDetails(ev.id);
            });

            if (!ev.isActive) {
                tr.querySelector('.btn-make-active').addEventListener('click', () => {
                    makeEventActive(ev.id);
                });
            }

            tr.querySelector('.btn-del').addEventListener('click', async () => {
                if (confirm("Deseja realmente apagar este Evento Mestre e perder TODOS OS CONTEÚDOS E DIAS cadastrados nele?")) {
                    await deleteDoc(doc(db, "events", ev.id));
                    if (currentEditingEvent && currentEditingEvent.id === ev.id) {
                        closeEventDetails(); // Force close if editing deleted event
                    }
                }
            });

            eventosBody.appendChild(tr);
        });

        // Live update the editing view if it's currently open
        if (currentEditingEvent) {
            const updatedCurrentEvent = globalEventsMap[currentEditingEvent.id];
            // Only auto re-render if we didn't cause the change to avoid input focus loss loops
            // We do a naive check: if the event deleted, close. Else just keep ref.
            if (!updatedCurrentEvent) closeEventDetails();
        }
    });
}

async function makeEventActive(newActiveId) {
    // 1. Fetch all currently active
    const qSnapshot = await getDocs(collection(db, "events"));
    const batch = writeBatch(db);

    qSnapshot.forEach(d => {
        const data = d.data();
        if (data.isActive && data.id !== newActiveId) {
            batch.update(doc(db, "events", data.id), { isActive: false });
        }
        if (data.id === newActiveId) {
            batch.update(doc(db, "events", newActiveId), { isActive: true });
        }
    });

    await batch.commit();
}


// -----------------------------------------
// Modal - Create Master Event
// -----------------------------------------
function setupModalEvents() {
    const toggleModal = (show) => {
        eventModal.classList.toggle('active', show);
        if (!show) domEvName.value = '';
    };

    openModalBtn.addEventListener('click', () => toggleModal(true));
    closeEvModalBtn.addEventListener('click', () => toggleModal(false));
    cancelEvModalBtn.addEventListener('click', () => toggleModal(false));

    saveEventBtn.addEventListener('click', async () => {
        if (!domEvName.value) return alert("O evento precisa de um nome.");

        saveEventBtn.disabled = true;
        saveEventBtn.textContent = "Criando...";

        const newId = "evt-" + Date.now();
        const payload = {
            id: newId,
            name: domEvName.value,
            isActive: false,
            days: []
        };

        try {
            await setDoc(doc(db, "events", payload.id), payload);
            toggleModal(false);
            openEventDetails(newId); // Open builder straight away
        } catch (e) {
            alert("Erro: " + e.message);
        } finally {
            saveEventBtn.disabled = false;
            saveEventBtn.textContent = "Iniciar Rascunho";
        }
    });
}


// -----------------------------------------
// Sub-Page - Event Details Builder 
// -----------------------------------------
function generateId() { return Math.random().toString(36).substring(2, 9); }

function setupDetailsEvents() {
    btnBackToEvents.addEventListener('click', () => {
        closeEventDetails();
    });

    // Binding Master Title Changes
    detailsEventNameInput.addEventListener('change', (e) => {
        if (currentEditingEvent) {
            currentEditingEvent.name = e.target.value;
            titleDetails.textContent = `Configurando: ${currentEditingEvent.name}`;
            pushEventUpdateTotal(); // Using a wrapper function for pushing entire document
        }
    });

    // Binding Day Changes
    activeDayLabel.addEventListener('change', (e) => updateActiveDayField('label', e.target.value));
    activeDayDate.addEventListener('change', (e) => updateActiveDayField('date', e.target.value));

    btnDelActiveDay.addEventListener('click', () => {
        if (currentActiveDayIndex > -1) {
            if (confirm("Deseja apagar este dia inteiro e todas as suas atividades?")) {
                currentEditingEvent.days.splice(currentActiveDayIndex, 1);
                currentActiveDayIndex = currentEditingEvent.days.length > 0 ? 0 : -1;
                pushEventUpdate();
                renderDetailsView();
            }
        }
    });

    btnAddActivity.addEventListener('click', () => {
        if (currentActiveDayIndex > -1) {
            const newAct = {
                id: 'act-' + generateId(),
                title: 'Nova Atividade',
                time: '08:00',
                speaker: '',
                location: '',
                description: '',
                featured: false,
                actionLinks: []
            };
            if (!currentEditingEvent.days[currentActiveDayIndex].schedule) {
                currentEditingEvent.days[currentActiveDayIndex].schedule = [];
            }
            currentEditingEvent.days[currentActiveDayIndex].schedule.push(newAct);
            pushEventUpdate();
            renderDetailsView();
        }
    });
}

function openEventDetails(eventId) {
    currentEditingEvent = JSON.parse(JSON.stringify(globalEventsMap[eventId])); // Deep clone to edit locally before pushing
    if ((currentEditingEvent.days || []).length > 0) {
        currentActiveDayIndex = 0;
    } else {
        currentActiveDayIndex = -1;
    }

    viewList.style.display = 'none';
    viewDetails.style.display = 'block';

    renderDetailsView();
}

function closeEventDetails() {
    currentEditingEvent = null;
    currentActiveDayIndex = -1;
    viewList.style.display = 'block';
    viewDetails.style.display = 'none';
}

function renderDetailsView() {
    if (!currentEditingEvent) return;

    // Safety check array exists
    if (!currentEditingEvent.days) currentEditingEvent.days = [];

    titleDetails.textContent = `Configurando: ${currentEditingEvent.name}`;
    detailsEventNameInput.value = currentEditingEvent.name || '';

    renderTabs();

    if (currentActiveDayIndex === -1 || currentEditingEvent.days.length === 0) {
        activeDaySettingsContainer.style.display = 'none';
        btnAddActivity.style.display = 'none';
        accordionContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 32px 0;">Crie uma aba de dia para comecar a adicionar palestras.</p>';
    } else {
        activeDaySettingsContainer.style.display = 'block';
        btnAddActivity.style.display = 'inline-block';

        const actDay = currentEditingEvent.days[currentActiveDayIndex];
        activeDayLabel.value = actDay.label || '';
        activeDayDate.value = actDay.date || '';

        renderAccordions(actDay);
    }
}

function renderTabs() {
    tabsList.innerHTML = '';

    currentEditingEvent.days.forEach((day, idx) => {
        const btn = document.createElement('button');
        btn.textContent = day.label || `Dia ${idx + 1}`;
        if (idx === currentActiveDayIndex) btn.classList.add('active');

        btn.addEventListener('click', () => {
            currentActiveDayIndex = idx;
            renderDetailsView();
        });

        tabsList.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.classList.add('btn-add-tab');
    addBtn.textContent = '+ Adicionar Dia';
    addBtn.addEventListener('click', () => {
        currentEditingEvent.days.push({
            id: 'day-' + generateId(),
            label: `Dia ${currentEditingEvent.days.length + 1}`,
            date: '',
            schedule: []
        });
        currentActiveDayIndex = currentEditingEvent.days.length - 1;
        pushEventUpdate();
        renderDetailsView();
    });
    tabsList.appendChild(addBtn);
}


function renderAccordions(activeDay) {
    accordionContainer.innerHTML = '';
    const schedule = activeDay.schedule || [];

    if (schedule.length === 0) {
        accordionContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 32px 0;">Não há atividades configuradas neste dia. Clique em Nova Atividade acima.</p>';
        return;
    }

    schedule.forEach((act, actIdx) => {
        const accItem = document.createElement('div');
        accItem.className = 'accordion-item';

        // Header
        const header = document.createElement('div');
        header.className = 'accordion-header';

        // Short view in header
        header.innerHTML = `
            <div>
                 <strong style="color:var(--primary); margin-right:8px;">${act.time || '--:--'}</strong> 
                 ${act.title || 'Sem Título'}
            </div>
            <div style="display:flex; gap: 8px; align-items:center;">
                ${act.featured ? '<span style="font-size:10px; background:var(--primary); color:white; padding:2px 6px; border-radius:4px;">DESTAQUE</span>' : ''}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="acc-chevron" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s;"><path d="M6 9l6 6 6-6"/></svg>
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'accordion-body';

        body.innerHTML = `
            <div style="display:flex; gap:16px; margin-bottom: 12px;">
                 <div style="flex:1;">
                     <label style="font-size:0.8rem; color:var(--text-muted); font-weight: 500;">Horário de Início</label><br>
                     <input type="time" class="inp-time form-control" value="${act.time || ''}" style="width:100%; margin-top:4px;">
                 </div>
                 <div style="flex:3;">
                     <label style="font-size:0.8rem; color:var(--text-muted); font-weight: 500;">Título da Palestra / Atividade</label><br>
                     <input type="text" class="inp-title form-control" value="${act.title || ''}" placeholder="Nome principal" style="width:100%; margin-top:4px;">
                 </div>
            </div>

            <div style="display:flex; gap:16px; margin-bottom: 12px;">
                 <div style="flex:2;">
                     <label style="font-size:0.8rem; color:var(--text-muted); font-weight: 500;">Nome do Palestrante (Opcional)</label><br>
                     <input type="text" class="inp-speaker form-control" value="${act.speaker || ''}" placeholder="Dr. Fulano" style="width:100%; margin-top:4px;">
                 </div>
                 <div style="flex:2;">
                     <label style="font-size:0.8rem; color:var(--text-muted); font-weight: 500;">Local da Palestra</label><br>
                     <input type="text" class="inp-location form-control" value="${act.location || ''}" placeholder="Palco A, Sala 3..." style="width:100%; margin-top:4px;">
                 </div>
            </div>

            <div style="margin-bottom: 12px;">
                 <label style="font-size:0.8rem; color:var(--text-muted); font-weight: 500;">Descrição Rápida</label><br>
                 <textarea class="inp-desc form-control" rows="2" style="width:100%; margin-top:4px; max-width:100%;">${act.description || ''}</textarea>
            </div>

             <div style="margin-bottom: 16px; display:flex; align-items:center; gap:8px;">
                 <input type="checkbox" class="inp-feat" ${act.featured ? 'checked' : ''} id="feat-${act.id}" style="width: 18px; height: 18px; cursor: pointer;">
                 <label for="feat-${act.id}" style="cursor: pointer;"><strong>Destacar este evento?</strong> (Aparecerá com cor chamativa no app)</label>
            </div>

            <div style="border-top: 1px dashed var(--glass-border); padding-top: 16px; margin-top: 16px; display:flex; justify-content:space-between; align-items: center;">
                 <button class="del-btn btn-del-act">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    Excluir Esta Atividade
                 </button>
                 <span style="color:var(--text-muted); font-size: 0.8rem;">Todas as alterações são salvas automaticamente.</span>
            </div>
        `;

        // Interaction bindings
        header.addEventListener('click', () => {
            const isOpen = accItem.classList.contains('open');
            // Close all others
            document.querySelectorAll('.accordion-item').forEach(el => {
                el.classList.remove('open');
                el.querySelector('.acc-chevron').style.transform = 'rotate(0deg)';
            });

            if (!isOpen) {
                accItem.classList.add('open');
                header.querySelector('.acc-chevron').style.transform = 'rotate(180deg)';
            }
        });

        const bindField = (selector, key, isCheck = false) => {
            const input = body.querySelector(selector);
            input.addEventListener('change', (e) => {
                act[key] = isCheck ? e.target.checked : e.target.value;
                pushEventUpdate();
                // Rerender specific text in header manually to avoid full re-render collapsing accordion
                if (key === 'time' || key === 'title' || key === 'featured') {
                    header.innerHTML = `
                        <div>
                             <strong style="color:var(--primary); margin-right:8px;">${act.time || '--:--'}</strong> 
                             ${act.title || 'Sem Título'}
                        </div>
                        <div style="display:flex; gap: 8px; align-items:center;">
                            ${act.featured ? '<span style="font-size:10px; background:var(--primary); color:white; padding:2px 6px; border-radius:4px;">DESTAQUE</span>' : ''}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="acc-chevron" stroke="currentColor" stroke-width="2" style="transform: rotate(180deg);"><path d="M6 9l6 6 6-6"/></svg>
                        </div>
                    `;
                }
            });
        };

        bindField('.inp-time', 'time');
        bindField('.inp-title', 'title');
        bindField('.inp-speaker', 'speaker');
        bindField('.inp-location', 'location');
        bindField('.inp-desc', 'description');
        bindField('.inp-feat', 'featured', true);

        body.querySelector('.btn-del-act').addEventListener('click', () => {
            if (confirm("Excluir esta atividade?")) {
                schedule.splice(actIdx, 1);
                pushEventUpdate();
                renderDetailsView();
            }
        });

        accItem.appendChild(header);
        accItem.appendChild(body);
        accordionContainer.appendChild(accItem);
    });
}

function updateActiveDayField(key, value) {
    if (currentActiveDayIndex > -1) {
        currentEditingEvent.days[currentActiveDayIndex][key] = value;
        pushEventUpdate();
        if (key === 'label') { renderTabs(); }
    }
}

// Background Saver
let saveTimeout = null;
function pushEventUpdate() {
    // We throttle saving a bit
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        try {
            // currentEditingEvent contains the full mutated truth 
            await updateDoc(doc(db, "events", currentEditingEvent.id), {
                days: currentEditingEvent.days
            });
        } catch (e) {
            console.error("Auto-save event error:", e);
        }
    }, 1000);
}

// Full background saver (when name changes)
function pushEventUpdateTotal() {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        try {
            await updateDoc(doc(db, "events", currentEditingEvent.id), {
                name: currentEditingEvent.name,
                days: currentEditingEvent.days
            });
        } catch (e) {
            console.error("Auto-save event full error:", e);
        }
    }, 1000);
}
