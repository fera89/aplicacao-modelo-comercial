import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    doc, getDoc, collection, query, where, getDocs,
    addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { getRole } from './auth-role.js';

// ── State ─────────────────────────────────────────────────────────────────────
let currentUser     = null;
let currentUserData = null;
let kanbanConfig    = { stages: [], closingStageId: '' };
let allLeads        = [];
let leadsUnsub      = null;
let subsUnsub       = null;

// ── Auth Guard ────────────────────────────────────────────────────────────────
let _clientRoleChecked = false;
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.replace('/client-login.html'); return; }

    if (_clientRoleChecked) return;
    _clientRoleChecked = true;

    const role = await getRole(user.uid);
    if (role === 'admin') { window.location.replace('/'); return; }
    // 'user' or 'unknown' — proceed as client

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    currentUser     = user;
    currentUserData = { id: user.uid, ...(userDoc.exists() ? userDoc.data() : {}) };
    document.getElementById('user-name-display').textContent = currentUserData.name || user.email;
    loadDashboardStats();
});

// ── Navigation ────────────────────────────────────────────────────────────────
const TITLES = { inicio: 'Início', leads: 'Meus Leads', vendas: 'Minhas Vendas', ranking: 'Ranking' };
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        if (btn.id === 'logoutBtn') return;
        e.preventDefault();
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        const v = btn.dataset.view;
        btn.classList.add('active');
        document.getElementById(`view-${v}`).classList.add('active');
        document.getElementById('header-title').textContent = TITLES[v] || '';
        if (v === 'leads'   && !window._leadsLoaded)   { initKanban();    window._leadsLoaded   = true; }
        if (v === 'vendas'  && !window._vendasLoaded)  { initMyVendas();  window._vendasLoaded  = true; }
        if (v === 'ranking' && !window._rankingLoaded) { initRanking();   window._rankingLoaded = true; }
    });
});
document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); signOut(auth); });

// ── Dashboard Stats ───────────────────────────────────────────────────────────
async function loadDashboardStats() {
    const [cfg, leadsSnap, pendingSnap, approvedSnap] = await Promise.all([
        getDoc(doc(db, 'kanban_config', 'settings')),
        getDocs(query(collection(db, 'leads'), where('userId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'sale_submissions'), where('userId', '==', currentUser.uid), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'sale_submissions'), where('userId', '==', currentUser.uid), where('status', '==', 'approved'), where('month', '==', new Date().toISOString().slice(0, 7)))),
    ]);

    const cfgData   = cfg.exists() ? cfg.data() : {};
    const stageMap  = Object.fromEntries((cfgData.stages || []).map(s => [s.id, s]));
    const leads     = leadsSnap.docs.map(d => d.data());
    const totalPts  = leads.reduce((s, l) => s + (stageMap[l.stage]?.points || 0), 0);
    const totalVal  = approvedSnap.docs.reduce((s, d) => s + (d.data().value || 0), 0);
    const closing   = cfgData.closingStageId || '';

    document.getElementById('stat-points').textContent  = totalPts.toLocaleString('pt-BR');
    document.getElementById('stat-leads').textContent   = leads.length;
    document.getElementById('stat-fechados').textContent= leads.filter(l => l.stage === closing).length;
    document.getElementById('stat-pending').textContent = pendingSnap.size;
    document.getElementById('stat-approved').textContent= totalVal > 0
        ? `R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '0';
}

// ── Kanban ────────────────────────────────────────────────────────────────────
async function initKanban() {
    // Load config first, then subscribe to leads
    const snap = await getDoc(doc(db, 'kanban_config', 'settings'));
    if (snap.exists()) {
        kanbanConfig = snap.data();
    } else {
        kanbanConfig = {
            stages: [
                { id: 'novo',     label: 'Novo Lead',       color: '#3b82f6', points: 10  },
                { id: 'contato',  label: 'Em Contato',      color: '#f59e0b', points: 20  },
                { id: 'proposta', label: 'Proposta Enviada', color: '#8b5cf6', points: 40  },
                { id: 'fechado',  label: 'Fechado',          color: '#10b981', points: 100 },
                { id: 'perdido',  label: 'Perdido',          color: '#ef4444', points: 5   },
            ],
            closingStageId: 'fechado',
        };
    }

    leadsUnsub = onSnapshot(
        query(collection(db, 'leads'), where('userId', '==', currentUser.uid)),
        snap => {
            allLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            renderKanban();
            updatePointsBadge();
        }
    );

    document.getElementById('btnNewLead').addEventListener('click', () => openLeadModal());
    document.getElementById('leadForm').addEventListener('submit', saveLead);
    document.getElementById('closeLeadModal').addEventListener('click', closeLeadModal);
    document.getElementById('cancelLeadModal').addEventListener('click', closeLeadModal);
}

// ── Kanban Render ─────────────────────────────────────────────────────────────
function renderKanban() {
    const board    = document.getElementById('kanban-board');
    const stageIds = new Set(kanbanConfig.stages.map(s => s.id));

    // Ghost leads: those whose stage is no longer in config
    const ghostLeads = allLeads.filter(l => !stageIds.has(l.stage));

    board.innerHTML = '';

    // Render configured columns
    kanbanConfig.stages.forEach(stage => {
        const colLeads = allLeads.filter(l => l.stage === stage.id);
        board.appendChild(makeColumn(stage, colLeads, false));
    });

    // Ghost column — only if there are orphan leads
    if (ghostLeads.length > 0) {
        const ghostStage = { id: '__ghost__', label: '⚠️ Etapa Removida', color: '#94a3b8', points: 0 };
        board.appendChild(makeColumn(ghostStage, ghostLeads, true));
    }
}

function makeColumn(stage, leads, isGhost) {
    const col = document.createElement('div');
    col.className = 'kanban-col';
    if (isGhost) col.style.opacity = '0.75';
    col.dataset.stage = stage.id;

    const isClosing = stage.id === kanbanConfig.closingStageId;
    const closingLabel = isClosing ? ' <span style="font-size:.65rem;background:rgba(255,255,255,.25);padding:1px 6px;border-radius:99px;vertical-align:middle;">✓ Fechamento</span>' : '';

    col.innerHTML = `
        <div class="kanban-col-header" style="background:${stage.color};">
            <span>${escHtml(stage.label)}${closingLabel}</span>
            <span class="kanban-count">${leads.length}</span>
        </div>
        <div class="kanban-col-body" id="col-${stage.id}"></div>`;

    if (!isGhost) {
        const body = col.querySelector('.kanban-col-body');
        body.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
        body.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        body.addEventListener('drop', async e => { e.preventDefault(); col.classList.remove('drag-over'); await dropLead(e, stage.id); });
    }

    leads.forEach(lead => col.querySelector('.kanban-col-body').appendChild(makeCard(lead, stage)));
    return col;
}

function makeCard(lead, stage) {
    const card = document.createElement('div');
    card.className  = 'lead-card';
    card.draggable  = !stage.id.startsWith('__ghost__');
    card.dataset.id = lead.id;
    card.style.borderLeftColor = stage.color || '#94a3b8';

    const date = lead.createdAt?.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt || 0);
    const valueStr = lead.value > 0
        ? `<div class="lead-card-value">R$ ${Number(lead.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>`
        : '';

    card.innerHTML = `
        <div class="lead-card-name">${escHtml(lead.name)}</div>
        <div class="lead-card-phone">${escHtml(lead.phone || '')}</div>
        ${valueStr}
        <div class="lead-card-date">${date.toLocaleDateString('pt-BR')}</div>
        ${stage.points ? `<div class="lead-card-pts">+${stage.points} pts</div>` : ''}
        <div class="lead-card-actions">
            <button class="btn-xs btn-xs-edit" data-id="${lead.id}">Editar</button>
            <button class="btn-xs btn-xs-del"  data-id="${lead.id}">Excluir</button>
        </div>`;

    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', lead.id); card.style.opacity = '.5'; });
    card.addEventListener('dragend',   () => { card.style.opacity = '1'; });
    card.querySelector('.btn-xs-edit').addEventListener('click', e => { e.stopPropagation(); openLeadModal(lead); });
    card.querySelector('.btn-xs-del').addEventListener('click',  e => { e.stopPropagation(); deleteLead(lead.id, lead.name); });
    return card;
}

function updatePointsBadge() {
    const stageMap = Object.fromEntries(kanbanConfig.stages.map(s => [s.id, s]));
    const total    = allLeads.reduce((s, l) => s + (stageMap[l.stage]?.points || 0), 0);
    document.getElementById('stat-points').textContent = total.toLocaleString('pt-BR');
    document.getElementById('stat-leads').textContent  = allLeads.length;
    document.getElementById('stat-fechados').textContent =
        allLeads.filter(l => l.stage === kanbanConfig.closingStageId).length;
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
async function dropLead(e, newStage) {
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;
    const lead = allLeads.find(l => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    if (newStage === kanbanConfig.closingStageId) {
        const stageCfg = kanbanConfig.stages.find(s => s.id === newStage);
        const valStr   = lead.value > 0
            ? `R$ ${Number(lead.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : 'sem valor definido';
        if (!confirm(`Mover "${lead.name}" para "${stageCfg?.label}"?\n\nUma submissão de venda (${valStr}) será gerada para aprovação do administrador.`)) return;

        // Check for existing pending submission for this lead
        const existSnap = await getDocs(query(
            collection(db, 'sale_submissions'),
            where('leadId', '==', leadId),
            where('status', '==', 'pending')
        ));
        if (!existSnap.empty) {
            alert('Já existe uma submissão pendente para este lead.');
            return;
        }

        // Update lead + create submission
        const month = new Date().toISOString().slice(0, 7);
        await Promise.all([
            updateDoc(doc(db, 'leads', leadId), { stage: newStage, updatedAt: serverTimestamp() }),
            addDoc(collection(db, 'sale_submissions'), {
                userId:      currentUser.uid,
                userName:    currentUserData.name || currentUser.email,
                month,
                quantity:    1,
                value:       lead.value || 0,
                notes:       `Lead: ${lead.name}${lead.phone ? ' · ' + lead.phone : ''}`,
                leadId,
                status:      'pending',
                submittedAt: serverTimestamp(),
            }),
        ]);
    } else {
        await updateDoc(doc(db, 'leads', leadId), { stage: newStage, updatedAt: serverTimestamp() });
    }
}

// ── Lead Modal ────────────────────────────────────────────────────────────────
function openLeadModal(lead = null) {
    document.getElementById('leadModalTitle').textContent = lead ? 'Editar Lead' : 'Novo Lead';
    document.getElementById('lead-id').value    = lead?.id    || '';
    document.getElementById('lead-name').value  = lead?.name  || '';
    document.getElementById('lead-phone').value = lead?.phone || '';
    document.getElementById('lead-email').value = lead?.email || '';
    document.getElementById('lead-notes').value = lead?.notes || '';

    const valueEl = document.getElementById('lead-value');
    valueEl.value = lead?.value > 0
        ? Number(lead.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        : '';

    const stageGroup = document.getElementById('lead-stage-group');
    stageGroup.style.display = lead ? 'block' : 'none';
    if (lead) {
        const sel = document.getElementById('lead-stage');
        sel.innerHTML = kanbanConfig.stages
            .map(s => `<option value="${s.id}" ${s.id === lead.stage ? 'selected' : ''}>${escHtml(s.label)}</option>`)
            .join('');
    }

    document.getElementById('leadModal').classList.add('active');
    if (!window._leadMoneyMaskApplied) {
        applyMoneyMask(valueEl);
        window._leadMoneyMaskApplied = true;
    }
}

function closeLeadModal() {
    document.getElementById('leadModal').classList.remove('active');
    document.getElementById('leadForm').reset();
    document.getElementById('lead-id').value = '';
    document.getElementById('lead-stage-group').style.display = 'none';
}

async function saveLead(e) {
    e.preventDefault();
    const id  = document.getElementById('lead-id').value;
    const btn = document.getElementById('saveLeadBtn');
    btn.textContent = 'Salvando...'; btn.disabled = true;

    const payload = {
        name:     document.getElementById('lead-name').value.trim(),
        phone:    document.getElementById('lead-phone').value.trim(),
        email:    document.getElementById('lead-email').value.trim(),
        notes:    document.getElementById('lead-notes').value.trim(),
        value:    parseMoney(document.getElementById('lead-value').value),
        userId:   currentUser.uid,
        userName: currentUserData.name || currentUser.email,
    };

    try {
        if (id) {
            payload.stage     = document.getElementById('lead-stage').value;
            payload.updatedAt = serverTimestamp();
            await updateDoc(doc(db, 'leads', id), payload);
        } else {
            payload.stage     = kanbanConfig.stages[0]?.id || 'novo';
            payload.createdAt = serverTimestamp();
            payload.updatedAt = serverTimestamp();
            await addDoc(collection(db, 'leads'), payload);
        }
        closeLeadModal();
    } catch (err) {
        alert('Erro ao salvar lead: ' + err.message);
    } finally {
        btn.textContent = 'Salvar'; btn.disabled = false;
    }
}

async function deleteLead(id, name) {
    if (!confirm(`Excluir o lead "${name}"?`)) return;
    await deleteDoc(doc(db, 'leads', id));
}

// ── Minhas Vendas ─────────────────────────────────────────────────────────────
function initMyVendas() {
    document.getElementById('sale-month').value = new Date().toISOString().slice(0, 7);
    applyMoneyMask(document.getElementById('sale-value'));

    subsUnsub = onSnapshot(
        query(collection(db, 'sale_submissions'), where('userId', '==', currentUser.uid)),
        snap => {
            const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
            renderSubmissions(subs);
        }
    );

    document.getElementById('btnSubmitSale').addEventListener('click', () =>
        document.getElementById('saleModal').classList.add('active'));
    document.getElementById('closeSaleModal').addEventListener('click', closeSaleModal);
    document.getElementById('cancelSaleModal').addEventListener('click', closeSaleModal);
    document.getElementById('saleForm').addEventListener('submit', submitSale);
}

function closeSaleModal() {
    document.getElementById('saleModal').classList.remove('active');
    document.getElementById('saleForm').reset();
}

function renderSubmissions(subs) {
    const tbody = document.getElementById('submissions-tbody');
    const MN    = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    if (!subs.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">Nenhuma venda registrada ainda.</td></tr>';
        return;
    }
    tbody.innerHTML = subs.map(s => {
        const [yr, mo] = (s.month || '').split('-');
        const label = mo ? `${MN[parseInt(mo)-1]}/${yr}` : s.month;
        const date  = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(0);
        const badge = { pending: '<span class="badge badge-pending">Aguardando</span>', approved: '<span class="badge badge-approved">Aprovado</span>', rejected: '<span class="badge badge-rejected">Reprovado</span>' }[s.status] || '';
        return `<tr>
            <td>${label}</td>
            <td>${s.quantity || 0}</td>
            <td><strong style="color:var(--primary);">R$ ${(s.value||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></td>
            <td style="font-size:.82rem;color:var(--text-muted);">${escHtml(s.notes||'—')}</td>
            <td>${badge}${s.status==='rejected'&&s.adminNotes?`<br><span style="font-size:.75rem;color:var(--text-muted);">${escHtml(s.adminNotes)}</span>`:''}</td>
            <td style="font-size:.82rem;color:var(--text-muted);">${date.toLocaleDateString('pt-BR')}</td>
        </tr>`;
    }).join('');
}

async function submitSale(e) {
    e.preventDefault();
    const btn = document.getElementById('saveSaleBtn');
    btn.textContent = 'Enviando...'; btn.disabled = true;
    const month    = document.getElementById('sale-month').value;
    const quantity = parseInt(document.getElementById('sale-quantity').value) || 0;
    const value    = parseMoney(document.getElementById('sale-value').value);
    const notes    = document.getElementById('sale-notes').value.trim();
    if (!month || quantity < 1 || value <= 0) {
        alert('Preencha todos os campos obrigatórios.');
        btn.textContent = 'Enviar para Aprovação'; btn.disabled = false;
        return;
    }
    try {
        await addDoc(collection(db, 'sale_submissions'), {
            userId: currentUser.uid, userName: currentUserData.name || currentUser.email,
            month, quantity, value, notes, status: 'pending', submittedAt: serverTimestamp(),
        });
        closeSaleModal();
    } catch (err) {
        alert('Erro: ' + err.message);
    } finally {
        btn.textContent = 'Enviar para Aprovação'; btn.disabled = false;
    }
}

// ── Ranking ───────────────────────────────────────────────────────────────────
function initRanking() {
    const input = document.getElementById('ranking-month');
    input.value = new Date().toISOString().slice(0, 7);
    loadRanking(input.value);
    input.addEventListener('change', () => loadRanking(input.value));
}

async function loadRanking(month) {
    const list = document.getElementById('ranking-list');
    list.innerHTML = '<p style="color:var(--text-muted);">Carregando...</p>';

    const [goalDoc, salesSnap] = await Promise.all([
        getDoc(doc(db, 'sales_goals', month)),
        getDocs(query(collection(db, 'sales_monthly'), where('month', '==', month))),
    ]);

    const banner = document.getElementById('goal-banner');
    if (goalDoc.exists()) {
        const g = goalDoc.data();
        banner.style.display = 'block';
        document.getElementById('ranking-goal-title').textContent = `🎯 ${g.title || 'Meta do Mês'}`;
        const p = [];
        if (g.targetValue > 0)    p.push(`Valor: R$ ${Number(g.targetValue).toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
        if (g.targetQuantity > 0) p.push(`Quantidade: ${g.targetQuantity} vendas`);
        document.getElementById('ranking-goal-details').textContent = p.join(' · ');
    } else {
        banner.style.display = 'none';
    }

    if (salesSnap.empty) { list.innerHTML = '<p style="color:var(--text-muted);">Nenhuma venda aprovada para este mês.</p>'; return; }

    const sales  = salesSnap.docs.map(d => d.data()).sort((a, b) => (b.value||0) - (a.value||0));
    const target = goalDoc.exists() ? goalDoc.data().targetValue || 0 : 0;
    list.innerHTML = '';
    sales.forEach((s, i) => {
        const pos = i + 1, isMe = s.userId === currentUser.uid;
        const pct = target > 0 ? Math.min(100, Math.round((s.value / target) * 100)) : 0;
        const el  = document.createElement('div');
        el.className = `ranking-row${isMe ? ' me-highlight' : ''}`;
        el.innerHTML = `
            <div class="ranking-pos ${pos<=3?['top1','top2','top3'][pos-1]:''}">${pos<=3?['🥇','🥈','🥉'][pos-1]:pos}</div>
            <div style="flex:1;font-weight:600;font-size:.93rem;${isMe?'color:var(--primary);':''}">
                ${escHtml(s.userName||s.userId)}${isMe?' <span style="font-size:.75rem;">(você)</span>':''}
            </div>
            <div style="text-align:right;">
                <strong style="display:block;">R$ ${(s.value||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
                <span style="font-size:.8rem;color:var(--text-muted);">${s.quantity||0} venda${s.quantity!==1?'s':''}</span>
            </div>
            ${target>0?`<div style="text-align:right;min-width:80px;"><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div><span style="font-size:.72rem;color:var(--text-muted);">${pct}% da meta</span></div>`:''}`;
        list.appendChild(el);
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseMoney(str) {
    return parseFloat((str||'').trim().replace(/\./g,'').replace(',','.')) || 0;
}
function applyMoneyMask(el) {
    if (!el) return;
    el.addEventListener('input', () => {
        const d = el.value.replace(/\D/g,'');
        el.value = d ? (parseInt(d,10)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
    });
    el.addEventListener('focus', () => setTimeout(() => { el.selectionStart = el.selectionEnd = el.value.length; }, 0));
}
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
