import { db } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';

let unsubscribeHistory = null;

/**
 * Initializes the Notifications module:
 * - Wires up send/schedule form
 * - Loads notification history from Firestore
 */
export function initNotificacoes() {
    const titleInput = document.getElementById('notif-title');
    const bodyInput = document.getElementById('notif-body');
    const typeSelect = document.getElementById('notif-type');
    const datetimeInput = document.getElementById('notif-datetime');
    const scheduleFields = document.getElementById('schedule-fields');
    const sendBtn = document.getElementById('btnSendNotification');

    // Toggle datetime picker visibility
    typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'scheduled') {
            scheduleFields.style.display = 'block';
            // Default to 5 minutes from now
            const now = new Date();
            now.setMinutes(now.getMinutes() + 5);
            datetimeInput.value = toLocalDatetimeString(now);
        } else {
            scheduleFields.style.display = 'none';
        }
    });

    // Send button
    sendBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();

        if (!title || !body) {
            alert('Preencha o título e a mensagem da notificação.');
            return;
        }

        const isScheduled = typeSelect.value === 'scheduled';
        let scheduledAt = null;

        if (isScheduled) {
            const dt = datetimeInput.value;
            if (!dt) {
                alert('Selecione uma data e hora para o agendamento.');
                return;
            }
            scheduledAt = Timestamp.fromDate(new Date(dt));
        }

        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;">Enviando...</span>';

        try {
            const notificationData = {
                title,
                body,
                createdAt: Timestamp.now(),
                status: isScheduled ? 'scheduled' : 'pending',
            };

            if (scheduledAt) {
                notificationData.scheduledAt = scheduledAt;
            }

            await addDoc(collection(db, 'notifications'), notificationData);

            // Clear form
            titleInput.value = '';
            bodyInput.value = '';
            typeSelect.value = 'immediate';
            scheduleFields.style.display = 'none';

            showToast(isScheduled ? '⏰ Notificação agendada com sucesso!' : '✅ Notificação enviada!');
        } catch (error) {
            console.error('Error sending notification:', error);
            alert('Erro ao enviar notificação: ' + error.message);
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2L11 13"></path>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                </svg>
                Enviar`;
        }
    });

    // Load history
    loadNotificationHistory();
}

/**
 * Subscribe to notification history from Firestore (realtime)
 */
function loadNotificationHistory() {
    const tableBody = document.getElementById('notificationsTableBody');

    if (unsubscribeHistory) unsubscribeHistory();

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));

    unsubscribeHistory = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; color: var(--text-muted); padding: 32px;">
                        Nenhuma notificação enviada ainda.
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = document.createElement('tr');

            const statusBadge = getStatusBadge(data.status);
            const dateStr = formatDate(data.sentAt || data.scheduledAt || data.createdAt);

            row.innerHTML = `
                <td style="font-weight:500; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(data.title || '')}</td>
                <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-secondary);">${escapeHtml(data.body || '')}</td>
                <td>${statusBadge}</td>
                <td style="text-align:center;">${data.recipientCount ?? '—'}</td>
                <td style="color:var(--text-muted); font-size:0.8rem; white-space:nowrap;">${dateStr}</td>
            `;
            tableBody.appendChild(row);
        });
    }, (error) => {
        console.error('Error loading notification history:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color: #ef4444; padding: 32px;">
                    Erro ao carregar histórico.
                </td>
            </tr>`;
    });
}

// ─── Helpers ─────────────────────────────────────────

function getStatusBadge(status) {
    const styles = {
        sent: { bg: 'rgba(16,185,129,0.15)', color: '#059669', label: 'Enviada' },
        pending: { bg: 'rgba(234,179,8,0.15)', color: '#ca8a04', label: 'Enviando...' },
        scheduled: { bg: 'rgba(59,130,246,0.15)', color: '#2563eb', label: 'Agendada' },
        error: { bg: 'rgba(239,68,68,0.15)', color: '#dc2626', label: 'Erro' },
    };

    const s = styles[status] || styles.pending;
    return `<span style="
        display:inline-block;
        padding:4px 10px;
        border-radius:6px;
        font-size:0.78rem;
        font-weight:600;
        background:${s.bg};
        color:${s.color};
    ">${s.label}</span>`;
}

function formatDate(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function toLocalDatetimeString(date) {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 32px;
        right: 32px;
        background: #1e293b;
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        font-weight: 500;
        font-size: 0.9rem;
        z-index: 9999;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
