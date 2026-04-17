import { db } from './src/firebase.js';
import { collection, doc, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';

// ─── State ────────────────────────────────────────────────────────────────────
let currentGoal = null;
let goalCountdownInterval = null;

// ─── Clock ────────────────────────────────────────────────────────────────────
function startClock() {
    const el = document.getElementById('clock');
    const tick = () => { el.textContent = new Date().toLocaleTimeString('pt-BR'); };
    tick();
    setInterval(tick, 1000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
}

function getMonthLabel(month) {
    const [year, m] = month.split('-');
    const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${names[parseInt(m) - 1]} ${year}`;
}

function formatCountdown(deadline) {
    const diff = new Date(deadline) - new Date();
    if (diff <= 0) return '⌛ Prazo encerrado';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `⏱ ${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `⏱ ${h}h ${m}m ${s}s`;
    return `⏱ ${m}m ${s}s`;
}

function posBadge(i) {
    if (i === 0) return '<div class="pos gold">🥇</div>';
    if (i === 1) return '<div class="pos silver">🥈</div>';
    if (i === 2) return '<div class="pos bronze">🥉</div>';
    return `<div class="pos">${i + 1}</div>`;
}

function avatarHtml(photoURL, name) {
    const initial = (name || '?')[0].toUpperCase();
    return photoURL
        ? `<div class="avatar"><img src="${photoURL}" alt="${initial}"></div>`
        : `<div class="avatar">${initial}</div>`;
}

function progressBarHtml(current, target) {
    if (!target || target <= 0) return '';
    const pct = Math.min(Math.round((current / target) * 100), 100);
    const color = pct >= 100 ? '#FFD700' : pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
    return `
        <div class="progress-wrap">
            <div class="progress-track">
                <div class="progress-fill" style="width:${pct}%;background:${color};"></div>
            </div>
            <span class="progress-pct" style="color:${color};">${pct}%</span>
        </div>`;
}

// ─── Fullscreen ───────────────────────────────────────────────────────────────
document.getElementById('fsBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
});

// ─── Goal banner ──────────────────────────────────────────────────────────────
function renderGoalBanner(goal) {
    const banner = document.getElementById('goal-banner');
    const cdEl   = document.getElementById('goal-countdown');
    if (!banner) return;

    if (goalCountdownInterval) { clearInterval(goalCountdownInterval); goalCountdownInterval = null; }

    if (!goal) {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'flex';

    const targets = [];
    if (goal.targetValue    > 0) targets.push(`💰 R$ ${goal.targetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / vendedor`);
    if (goal.targetQuantity > 0) targets.push(`📦 ${goal.targetQuantity} vendas / vendedor`);

    document.getElementById('goal-title').textContent    = goal.title || 'Meta do Mês';
    document.getElementById('goal-targets').textContent  = targets.join('  ·  ');
    document.getElementById('goal-deadline').textContent = goal.deadline
        ? new Date(goal.deadline).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : '';

    if (goal.deadline) {
        const tick = () => { if (cdEl) cdEl.textContent = formatCountdown(goal.deadline); };
        tick();
        goalCountdownInterval = setInterval(tick, 1000);
    }
}

// ─── Sales list ───────────────────────────────────────────────────────────────
function renderSalesList(items) {
    const list     = document.getElementById('sales-list');
    const subtitle = document.getElementById('sales-subtitle');

    if (items.length === 0) {
        list.innerHTML = '<li class="empty-state">Nenhuma venda registrada este mês.</li>';
        return;
    }

    const totalValue = items.reduce((s, r) => s + (r.value || 0), 0);
    let subtitleText = `Total: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    if (currentGoal?.targetValue > 0) {
        const teamPct = Math.round((totalValue / (currentGoal.targetValue * items.length)) * 100);
        subtitleText += `  ·  Equipe: ${teamPct}% da meta`;
    }
    subtitle.textContent = subtitleText;

    list.innerHTML = items.slice(0, 15).map((r, i) => {
        const valuePct = (currentGoal?.targetValue > 0)
            ? Math.min(Math.round(((r.value || 0) / currentGoal.targetValue) * 100), 100) : null;
        const qtyPct   = (currentGoal?.targetQuantity > 0)
            ? Math.min(Math.round(((r.quantity || 0) / currentGoal.targetQuantity) * 100), 100) : null;

        return `
        <li class="rank-row" style="animation-delay:${i * 0.04}s">
            ${posBadge(i)}
            ${avatarHtml(r.userPhotoURL, r.userName)}
            <div class="info">
                <div class="info-name">${r.userName || 'Vendedor'}</div>
                <div class="info-sub">${r.quantity || 0} ${(r.quantity || 0) === 1 ? 'venda' : 'vendas'}</div>
                ${currentGoal?.targetValue    > 0 ? progressBarHtml(r.value    || 0, currentGoal.targetValue)    : ''}
                ${currentGoal?.targetQuantity > 0 ? progressBarHtml(r.quantity || 0, currentGoal.targetQuantity) : ''}
            </div>
            <div class="score">
                <div class="score-main">R$ ${(r.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div class="score-label">${valuePct !== null ? `${valuePct}% da meta` : 'valor'}</div>
            </div>
        </li>`;
    }).join('');
}

// ─── Engagement list ──────────────────────────────────────────────────────────
function renderEngageList(items) {
    const list = document.getElementById('engage-list');
    if (items.length === 0) {
        list.innerHTML = '<li class="empty-state">Nenhuma pontuação registrada.</li>';
        return;
    }
    list.innerHTML = items.slice(0, 15).map((r, i) => `
        <li class="rank-row" style="animation-delay:${i * 0.04}s">
            ${posBadge(i)}
            ${avatarHtml(r.photoURL, r.name)}
            <div class="info">
                <div class="info-name">${r.name || 'Participante'}</div>
                <div class="info-sub">
                    ${r.coursesCompleted  > 0 ? `📚 ${r.coursesCompleted} curso${r.coursesCompleted > 1 ? 's' : ''}` : ''}
                    ${r.certificatesEarned > 0 ? ` · 🎓 ${r.certificatesEarned}` : ''}
                    ${r.currentStreak     >= 7 ? ` · 🔥 ${r.currentStreak}d` : ''}
                </div>
            </div>
            <div class="score">
                <div class="score-main">${(r.monthlyPoints || 0).toLocaleString('pt-BR')}</div>
                <div class="score-label">pts mês</div>
            </div>
        </li>`).join('');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
startClock();

const month = getCurrentMonth();
document.getElementById('header-month').textContent = getMonthLabel(month);

// Goal subscription
onSnapshot(doc(db, 'sales_goals', month), (snap) => {
    currentGoal = snap.exists() ? snap.data() : null;
    renderGoalBanner(currentGoal);
    // Trigger sales re-render so progress bars update
    const list = document.getElementById('sales-list');
    if (list && list._lastItems) renderSalesList(list._lastItems);
}, (err) => console.warn('sales_goals read error:', err));

// Sales subscription
onSnapshot(
    query(collection(db, 'sales_monthly'), where('month', '==', month)),
    (snap) => {
        const items = snap.docs.map(d => d.data());
        items.sort((a, b) => (b.value || 0) - (a.value || 0));
        document.getElementById('sales-list')._lastItems = items;
        renderSalesList(items);
    },
    (err) => console.warn('sales_monthly read error (check Firestore rules):', err)
);

// Engagement subscription
onSnapshot(
    query(collection(db, 'ranking_scores'), orderBy('monthlyPoints', 'desc'), limit(15)),
    (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderEngageList(items);
    },
    (err) => console.warn('ranking_scores read error:', err)
);
