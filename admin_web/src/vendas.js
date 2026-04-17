import { db } from './firebase.js';
import { collection, onSnapshot, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';

// ─── Module state ─────────────────────────────────────────────────────────────
let salesUnsubscribe = null;
let goalUnsubscribe = null;
let countdownInterval = null;
let usersCache = [];
let currentGoal = null;
let currentSales = [];

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initVendas() {
    loadUsers().then(() => {
        const month = getMonthValue();
        loadSalesForMonth(month);
        loadGoalForMonth(month);
    });
    setupEventListeners();
}

function getMonthValue() {
    return document.getElementById('vendas-month')?.value || getCurrentMonth();
}

function getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
}

// ─── Users ────────────────────────────────────────────────────────────────────
async function loadUsers() {
    const snapshot = await getDocs(collection(db, 'users'));
    usersCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── Sales ────────────────────────────────────────────────────────────────────
function loadSalesForMonth(month) {
    if (salesUnsubscribe) salesUnsubscribe();
    const q = query(collection(db, 'sales_monthly'), where('month', '==', month));
    salesUnsubscribe = onSnapshot(q, (snap) => {
        currentSales = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        currentSales.sort((a, b) => (b.value || 0) - (a.value || 0));
        renderSalesTable(currentSales, month);
    });
}

function renderSalesTable(sales, month) {
    const tbody = document.getElementById('vendasTableBody');
    if (!tbody) return;

    const [year, m] = month.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthLabel = `${monthNames[parseInt(m) - 1]}/${year}`;
    const totalValue = sales.reduce((s, r) => s + (r.value || 0), 0);
    const totalQty   = sales.reduce((s, r) => s + (r.quantity || 0), 0);

    const summaryEl = document.getElementById('vendasSummary');
    if (summaryEl) {
        summaryEl.innerHTML =
            `<span style="margin-right:24px;">📦 <strong>${totalQty}</strong> vendas totais</span>` +
            `<span>💰 Total: <strong style="color:var(--primary);">R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>` +
            `<span style="margin-left:24px;color:var(--text-muted);">Competência: ${monthLabel}</span>`;
    }

    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">Nenhuma venda registrada para este mês.</td></tr>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    tbody.innerHTML = sales.map((s, i) => {
        const medal = medals[i] || `<span style="color:var(--text-muted);">#${i + 1}</span>`;
        const avatar = s.userPhotoURL
            ? `<img src="${s.userPhotoURL}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;">`
            : `<span style="display:inline-flex;width:32px;height:32px;border-radius:50%;background:rgba(16,185,129,0.2);align-items:center;justify-content:center;font-weight:bold;color:var(--primary);font-size:13px;">${(s.userName || '?')[0].toUpperCase()}</span>`;

        return `
            <tr>
                <td style="font-size:1.2rem;">${medal}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        ${avatar}
                        <strong>${s.userName || 'Sem nome'}</strong>
                    </div>
                </td>
                <td>${s.quantity || 0}</td>
                <td><strong style="color:var(--primary);">R$ ${(s.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
                <td>${buildProgressCell(s)}</td>
                <td>
                    <button class="btn-secondary" style="padding:4px 12px;font-size:0.82rem;"
                        onclick="window._editSale('${s.userId}','${(s.userName || '').replace(/'/g, "\\'")}',${s.quantity || 0},${s.value || 0})">
                        Editar
                    </button>
                </td>
            </tr>`;
    }).join('');
}

function buildProgressCell(s) {
    if (!currentGoal) return '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>';
    const parts = [];
    if (currentGoal.targetValue > 0) {
        parts.push(progressBarHtml(s.value || 0, currentGoal.targetValue,
            `R$ ${(s.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })} / R$ ${currentGoal.targetValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`));
    }
    if (currentGoal.targetQuantity > 0) {
        parts.push(progressBarHtml(s.quantity || 0, currentGoal.targetQuantity,
            `${s.quantity || 0} / ${currentGoal.targetQuantity} vendas`));
    }
    return parts.length ? `<div style="min-width:160px;">${parts.join('<div style="height:6px;"></div>')}</div>`
                        : '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>';
}

function progressBarHtml(current, target, label) {
    const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    const color = pct >= 100 ? '#FFD700' : pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
    return `
        <div>
            <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-muted);margin-bottom:3px;">
                <span>${label}</span>
                <strong style="color:${color};">${pct}%</strong>
            </div>
            <div style="height:7px;background:rgba(0,0,0,0.1);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.5s ease;"></div>
            </div>
        </div>`;
}

// ─── Goal ─────────────────────────────────────────────────────────────────────
function loadGoalForMonth(month) {
    if (goalUnsubscribe) goalUnsubscribe();
    goalUnsubscribe = onSnapshot(doc(db, 'sales_goals', month), (snap) => {
        currentGoal = snap.exists() ? snap.data() : null;
        renderGoalCard(currentGoal);
        // Re-render table so progress bars update
        renderSalesTable(currentSales, month);
    });
}

function renderGoalCard(goal) {
    const titleEl = document.getElementById('goal-card-title');
    const detailsEl = document.getElementById('goal-card-details');
    const countdownEl = document.getElementById('goal-card-countdown');
    if (!titleEl) return;

    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }

    if (!goal) {
        titleEl.textContent = '🎯 Nenhuma meta definida para este mês';
        detailsEl.innerHTML = '';
        countdownEl.innerHTML = '';
        return;
    }

    titleEl.textContent = `🎯 ${goal.title || 'Meta do Mês'}`;

    const details = [];
    if (goal.targetValue > 0)    details.push(`<span>💰 Meta valor: <strong>R$ ${goal.targetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> / vendedor</span>`);
    if (goal.targetQuantity > 0) details.push(`<span>📦 Meta qtd.: <strong>${goal.targetQuantity} vendas</strong> / vendedor</span>`);
    detailsEl.innerHTML = details.join('');

    if (goal.deadline) {
        const updateCountdown = () => {
            countdownEl.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);">⏱ Prazo: ${formatDeadline(goal.deadline)} — </span><strong id="goal-cd-text" style="color:var(--primary);">${formatCountdown(goal.deadline)}</strong>`;
        };
        updateCountdown();
        countdownInterval = setInterval(() => {
            const cdEl = document.getElementById('goal-cd-text');
            if (cdEl) cdEl.textContent = formatCountdown(goal.deadline);
        }, 1000);
    } else {
        countdownEl.innerHTML = '';
    }
}

// ─── Goal modal ───────────────────────────────────────────────────────────────
function openGoalModal() {
    const modal = document.getElementById('goalModal');
    if (!modal) return;
    if (currentGoal) {
        document.getElementById('meta-title').value      = currentGoal.title || '';
        document.getElementById('meta-target-value').value = currentGoal.targetValue > 0 ? formatMoneyDisplay(currentGoal.targetValue) : '';
        document.getElementById('meta-target-qty').value   = currentGoal.targetQuantity || '';
        document.getElementById('meta-deadline').value     = currentGoal.deadline ? currentGoal.deadline.slice(0, 16) : '';
    } else {
        document.getElementById('goalForm').reset();
    }
    modal.style.display = 'flex';
}

function closeGoalModal() {
    const modal = document.getElementById('goalModal');
    if (modal) modal.style.display = 'none';
}

async function saveGoal() {
    const month    = getMonthValue();
    const title    = document.getElementById('meta-title').value.trim();
    const targetV  = parseMoney(document.getElementById('meta-target-value').value);
    const targetQ  = parseInt(document.getElementById('meta-target-qty').value) || 0;
    const deadline = document.getElementById('meta-deadline').value; // "YYYY-MM-DDTHH:MM"

    if (!deadline) { alert('Informe a data e hora limite.'); return; }
    if (targetV <= 0 && targetQ <= 0) { alert('Defina ao menos meta de valor ou meta de quantidade.'); return; }

    const btn = document.getElementById('saveGoalBtn');
    btn.textContent = 'Salvando...'; btn.disabled = true;
    try {
        await setDoc(doc(db, 'sales_goals', month), {
            title: title || `Meta ${getMonthLabel(month)}`,
            targetValue: targetV,
            targetQuantity: targetQ,
            deadline,
            month,
            updatedAt: new Date().toISOString()
        });
        closeGoalModal();
    } catch (e) {
        alert('Erro ao salvar meta: ' + e.message);
    } finally {
        btn.textContent = 'Salvar Meta'; btn.disabled = false;
    }
}

// ─── Event listeners ──────────────────────────────────────────────────────────
function setupEventListeners() {
    const monthInput = document.getElementById('vendas-month');
    if (monthInput) {
        monthInput.value = getCurrentMonth();
        monthInput.addEventListener('change', () => {
            const month = monthInput.value;
            loadSalesForMonth(month);
            loadGoalForMonth(month);
        });
    }

    // Money masks
    applyMoneyMask(document.getElementById('sales-value'));
    applyMoneyMask(document.getElementById('meta-target-value'));

    document.getElementById('btnAddSale')?.addEventListener('click', () => openSalesModal());
    document.getElementById('btnSetGoal')?.addEventListener('click', openGoalModal);

    document.getElementById('salesForm')?.addEventListener('submit', async (e) => {
        e.preventDefault(); await saveSaleEntry();
    });
    document.getElementById('goalForm')?.addEventListener('submit', async (e) => {
        e.preventDefault(); await saveGoal();
    });

    document.getElementById('closeSalesModalBtn')?.addEventListener('click', closeSalesModal);
    document.getElementById('cancelSalesModalBtn')?.addEventListener('click', closeSalesModal);
    document.getElementById('closeGoalModalBtn')?.addEventListener('click', closeGoalModal);
    document.getElementById('cancelGoalModalBtn')?.addEventListener('click', closeGoalModal);

    document.getElementById('btnOpenPublicRanking')?.addEventListener('click', () => {
        window.open('/ranking.html', '_blank');
    });

    window._editSale = (userId, userName, quantity, value) => {
        openSalesModal(userId, userName, quantity, value);
    };
}

// ─── Sales modal ──────────────────────────────────────────────────────────────
function closeSalesModal() {
    const modal = document.getElementById('salesModal');
    if (modal) modal.style.display = 'none';
}

function openSalesModal(userId = null, userName = '', quantity = 0, value = 0) {
    const modal  = document.getElementById('salesModal');
    const title  = document.getElementById('salesModalTitle');
    const select = document.getElementById('sales-user-select');

    select.innerHTML = '<option value="">Selecionar vendedor...</option>';
    usersCache.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.name || u.email || u.id;
        select.appendChild(opt);
    });

    if (userId) {
        title.textContent = `Editar — ${userName}`;
        select.value = userId; select.disabled = true;
        document.getElementById('sales-quantity').value = quantity;
        document.getElementById('sales-value').value = value > 0 ? formatMoneyDisplay(value) : '';
    } else {
        title.textContent = 'Registrar Vendas';
        select.disabled = false; select.value = '';
        document.getElementById('sales-quantity').value = '';
        document.getElementById('sales-value').value = '';
    }
    modal.style.display = 'flex';
}

async function saveSaleEntry() {
    const userId   = document.getElementById('sales-user-select').value;
    const quantity = parseInt(document.getElementById('sales-quantity').value) || 0;
    const value    = parseMoney(document.getElementById('sales-value').value);
    const month    = getMonthValue();

    if (!userId) { alert('Selecione um vendedor.'); return; }

    const user  = usersCache.find(u => u.id === userId);
    const docId = `${userId}_${month}`;

    const btn = document.getElementById('saveSalesBtn');
    btn.textContent = 'Salvando...'; btn.disabled = true;
    try {
        await setDoc(doc(db, 'sales_monthly', docId), {
            userId,
            userName:     user?.name || user?.email || 'Vendedor',
            userPhotoURL: user?.photoURL || null,
            quantity, value, month,
            updatedAt: new Date().toISOString()
        });
        closeSalesModal();
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
    } finally {
        btn.textContent = 'Salvar'; btn.disabled = false;
    }
}

// ─── Money mask ───────────────────────────────────────────────────────────────
/** Parse "2.000.000,50" or "2000000" or "2000000.50" → 2000000.50 */
function parseMoney(str) {
    str = (str || '').trim();
    if (!str) return 0;
    // Brazilian format: dots = thousands, comma = decimal
    // e.g.  "2.000.000,50" → remove dots → "2000000,50" → comma→dot → "2000000.50"
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

/** Format 2000000.5 → "2.000.000,50" */
function formatMoneyDisplay(value) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Attach live centavos-style mask to a text input */
function applyMoneyMask(inputEl) {
    if (!inputEl) return;

    inputEl.addEventListener('input', () => {
        // Keep only digits
        const digits = inputEl.value.replace(/\D/g, '');
        if (!digits) { inputEl.value = ''; return; }
        // Interpret as centavos: last 2 digits are decimal cents
        const cents = parseInt(digits, 10);
        inputEl.value = (cents / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    });

    // On focus, keep formatted but move cursor to end
    inputEl.addEventListener('focus', () => {
        setTimeout(() => {
            inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
        }, 0);
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCountdown(deadline) {
    const diff = new Date(deadline) - new Date();
    if (diff <= 0) return 'Prazo encerrado';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
}

function formatDeadline(deadline) {
    return new Date(deadline).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getMonthLabel(month) {
    const [year, m] = month.split('-');
    const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${names[parseInt(m) - 1]}/${year}`;
}
