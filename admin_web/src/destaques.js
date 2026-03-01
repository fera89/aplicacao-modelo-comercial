import { db, storage } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

let unsubscribe = null;

export function initDestaques() {
    const grid = document.getElementById('destaquesGrid');
    const addBtn = document.getElementById('openDestaquesModalBtn');

    addBtn.addEventListener('click', () => showModal());
    loadDestaques(grid);
}

function loadDestaques(grid) {
    if (unsubscribe) unsubscribe();

    const q = query(collection(db, 'highlights'), orderBy('order', 'asc'));
    unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding:48px 0;">Nenhum destaque cadastrado.</p>';
            return;
        }
        grid.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const card = document.createElement('div');
            card.style.cssText = 'background:white; border-radius:16px; border:1px solid rgba(16,185,129,0.1); overflow:hidden; transition:transform 0.2s; cursor:pointer;';
            card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-4px)');
            card.addEventListener('mouseleave', () => card.style.transform = '');

            card.innerHTML = `
                <div style="width:100%; height:160px; background:#f1f5f9; overflow:hidden;">
                    ${data.imageUrl ? `<img src="${data.imageUrl}" style="width:100%; height:100%; object-fit:cover;">` : '<div style="height:100%; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">Sem imagem</div>'}
                </div>
                <div style="padding:16px;">
                    <h4 style="margin-bottom:4px; font-size:0.95rem;">${esc(data.title)}</h4>
                    <p style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${esc(data.description || '')}</p>
                    ${data.linkUrl ? `<a href="${data.linkUrl}" target="_blank" style="color:var(--primary); font-size:0.8rem; font-weight:600; text-decoration:none;">Abrir link ↗</a>` : ''}
                    <div style="display:flex; gap:8px; margin-top:12px; justify-content:flex-end;">
                        <button class="edit-btn" style="background:none; border:1px solid var(--glass-border); border-radius:6px; padding:6px 10px; cursor:pointer; font-size:0.78rem; color:var(--text-secondary);">Editar</button>
                        <button class="del-btn" style="font-size:0.78rem; padding:6px 10px;">Excluir</button>
                    </div>
                </div>
            `;

            card.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); showModal(docSnap.id, data); });
            card.querySelector('.del-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Excluir destaque "${data.title}"?`)) {
                    deleteDoc(doc(db, 'highlights', docSnap.id));
                }
            });

            grid.appendChild(card);
        });
    });
}

function showModal(editId = null, editData = null) {
    const existing = document.getElementById('destaque-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'destaque-modal-overlay';
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '1001';

    overlay.innerHTML = `
        <div class="modal-content" style="max-width:520px;">
            <div class="modal-header">
                <h2>${editId ? 'Editar Destaque' : 'Novo Destaque'}</h2>
                <button class="close-btn" id="closeDestaqueModal">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="form-group">
                <label>Título</label>
                <input type="text" id="dest-title" value="${esc(editData?.title || '')}" placeholder="Título do destaque">
            </div>
            <div class="form-group">
                <label>Descrição</label>
                <textarea id="dest-desc" rows="3" style="width:100%; resize:vertical;" placeholder="Descrição curta...">${esc(editData?.description || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Link Externo (opcional)</label>
                <input type="url" id="dest-link" value="${esc(editData?.linkUrl || '')}" placeholder="https://...">
            </div>
            <div class="form-group">
                <label>Imagem</label>
                ${editData?.imageUrl ? `<img src="${editData.imageUrl}" style="width:100%; max-height:120px; object-fit:cover; border-radius:8px; margin-bottom:8px;">` : ''}
                <input type="file" id="dest-image" accept="image/*" style="width:100%;">
            </div>
            <div class="form-group">
                <label>Ordem (menor = aparece primeiro)</label>
                <input type="number" id="dest-order" value="${editData?.order ?? 0}" style="width:100px;">
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" id="cancelDestaqueModal" style="color:var(--text-secondary);">Cancelar</button>
                <button class="btn-primary" id="saveDestaqueBtn">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#closeDestaqueModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cancelDestaqueModal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#saveDestaqueBtn').addEventListener('click', async () => {
        const title = document.getElementById('dest-title').value.trim();
        const description = document.getElementById('dest-desc').value.trim();
        const linkUrl = document.getElementById('dest-link').value.trim();
        const order = parseInt(document.getElementById('dest-order').value) || 0;
        const fileInput = document.getElementById('dest-image');

        if (!title) { alert('Preencha o título.'); return; }

        const saveBtn = overlay.querySelector('#saveDestaqueBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';

        try {
            let imageUrl = editData?.imageUrl || '';

            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const storageRef = ref(storage, `highlights/${Date.now()}_${file.name}`);
                const snap = await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(snap.ref);
            }

            const payload = { title, description, linkUrl, imageUrl, order };

            if (editId) {
                await updateDoc(doc(db, 'highlights', editId), payload);
            } else {
                payload.createdAt = Timestamp.now();
                await addDoc(collection(db, 'highlights'), payload);
            }

            overlay.remove();
        } catch (err) {
            console.error('Error saving highlight:', err);
            alert('Erro ao salvar: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salvar';
        }
    });
}

function esc(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
