import { db } from './firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CONFIG_REF = () => doc(db, 'kanban_config', 'settings');

let stages = [];
let closingStageId = '';

// ── Public ────────────────────────────────────────────────────────────────────
export async function initKanbanConfig() {
    await loadConfig();
    renderList();
    setupEvents();
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadConfig() {
    const snap = await getDoc(CONFIG_REF());
    if (snap.exists()) {
        const d = snap.data();
        stages = d.stages || defaultStages();
        closingStageId = d.closingStageId || stages[stages.length - 1]?.id || '';
    } else {
        stages = defaultStages();
        closingStageId = 'fechado';
    }
}

function defaultStages() {
    return [
        { id: 'novo',     label: 'Novo Lead',        color: '#3b82f6', points: 10  },
        { id: 'contato',  label: 'Em Contato',        color: '#f59e0b', points: 20  },
        { id: 'proposta', label: 'Proposta Enviada',  color: '#8b5cf6', points: 40  },
        { id: 'fechado',  label: 'Fechado',           color: '#10b981', points: 100 },
        { id: 'perdido',  label: 'Perdido',           color: '#ef4444', points: 5   },
    ];
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderList() {
    const container = document.getElementById('kanban-stages-list');
    if (!container) return;
    container.innerHTML = '';
    stages.forEach((stage, idx) => container.appendChild(makeRow(stage, idx)));
}

function makeRow(stage, idx) {
    const isClosing = stage.id === closingStageId;
    const row = document.createElement('div');
    row.dataset.idx = idx;
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--glass-border);border-radius:10px;background:white;margin-bottom:8px;';
    row.innerHTML = `
        <input type="color" class="sc" data-idx="${idx}" value="${stage.color}"
            style="height:36px;width:44px;border:none;padding:0;cursor:pointer;border-radius:6px;flex-shrink:0;">
        <input type="text" class="sl" data-idx="${idx}" value="${escHtml(stage.label)}" placeholder="Nome da etapa"
            style="flex:1;padding:8px 10px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;">
            <span style="font-size:.68rem;color:var(--text-muted);">Pontos</span>
            <input type="number" class="sp" data-idx="${idx}" value="${stage.points || 0}"
                style="width:64px;text-align:center;padding:6px 4px;">
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;min-width:80px;">
            <span style="font-size:.68rem;color:var(--primary);font-weight:600;" title="Leads nesta etapa geram submissão de venda">Fechamento</span>
            <input type="radio" name="closing-stage" class="scl" data-id="${stage.id}" ${isClosing ? 'checked' : ''}
                style="width:auto;cursor:pointer;width:18px;height:18px;">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
            <button onclick="window._stageUp(${idx})" ${idx === 0 ? 'disabled' : ''}
                style="padding:2px 8px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;background:white;font-size:.8rem;">↑</button>
            <button onclick="window._stageDown(${idx})" ${idx === stages.length - 1 ? 'disabled' : ''}
                style="padding:2px 8px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;background:white;font-size:.8rem;">↓</button>
        </div>
        <button onclick="window._stageDelete(${idx})"
            style="padding:6px 10px;border:none;border-radius:6px;background:rgba(239,68,68,.1);color:#ef4444;cursor:pointer;font-weight:700;flex-shrink:0;">✕</button>`;
    return row;
}

// ── Events ────────────────────────────────────────────────────────────────────
function setupEvents() {
    document.getElementById('btnAddStage')?.addEventListener('click', () => {
        collect();
        stages.push({ id: `stage_${Date.now()}`, label: 'Nova Etapa', color: '#94a3b8', points: 10 });
        renderList();
        document.getElementById('kanban-stages-list')?.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('btnSaveKanbanConfig')?.addEventListener('click', saveConfig);

    document.getElementById('kanban-stages-list')?.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.idx);
        if (e.target.classList.contains('sl')) stages[idx].label = e.target.value;
        if (e.target.classList.contains('sc')) stages[idx].color = e.target.value;
        if (e.target.classList.contains('sp')) stages[idx].points = parseInt(e.target.value) || 0;
        if (e.target.classList.contains('scl')) closingStageId = e.target.dataset.id;
    });

    window._stageUp = (idx) => { collect(); if (idx > 0) { swap(idx, idx - 1); renderList(); } };
    window._stageDown = (idx) => { collect(); if (idx < stages.length - 1) { swap(idx, idx + 1); renderList(); } };
    window._stageDelete = (idx) => {
        collect();
        if (stages.length <= 1) { alert('É necessário ao menos 1 etapa.'); return; }
        const s = stages[idx];
        if (!confirm(`Excluir a etapa "${s.label}"?\n\nLeads nessa etapa irão para uma coluna temporária até serem movidos.`)) return;
        stages.splice(idx, 1);
        if (closingStageId === s.id) closingStageId = stages[stages.length - 1]?.id || '';
        renderList();
    };
}

function swap(a, b) { [stages[a], stages[b]] = [stages[b], stages[a]]; }

function collect() {
    document.querySelectorAll('.sl').forEach(el => { const i = parseInt(el.dataset.idx); if (stages[i]) stages[i].label  = el.value; });
    document.querySelectorAll('.sc').forEach(el => { const i = parseInt(el.dataset.idx); if (stages[i]) stages[i].color  = el.value; });
    document.querySelectorAll('.sp').forEach(el => { const i = parseInt(el.dataset.idx); if (stages[i]) stages[i].points = parseInt(el.value) || 0; });
}

async function saveConfig() {
    collect();
    if (!closingStageId) { alert('Selecione uma coluna de fechamento.'); return; }
    const btn = document.getElementById('btnSaveKanbanConfig');
    btn.textContent = 'Salvando...'; btn.disabled = true;
    try {
        await setDoc(CONFIG_REF(), { stages, closingStageId, updatedAt: new Date().toISOString() });
        btn.textContent = '✓ Configuração salva!';
        setTimeout(() => { btn.textContent = 'Salvar Configuração'; btn.disabled = false; }, 2500);
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
        btn.textContent = 'Salvar Configuração'; btn.disabled = false;
    }
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
