import { db, storage } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

let unsubscribe = null;

export function initApoiadores() {
    const grid = document.getElementById('apoiadoresGrid');
    const addBtn = document.getElementById('openApoiadoresModalBtn');

    addBtn.addEventListener('click', () => showModal());
    loadApoiadores(grid);
}

function loadApoiadores(grid) {
    if (unsubscribe) unsubscribe();

    const q = query(collection(db, 'sponsors'), orderBy('order', 'asc'));
    unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding:48px 0;">Nenhum apoiador cadastrado.</p>';
            return;
        }
        grid.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const card = document.createElement('div');
            card.style.cssText = 'background:white; border-radius:16px; border:1px solid rgba(16,185,129,0.1); overflow:hidden; transition:transform 0.2s; cursor:pointer; text-align:center;';
            card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-4px)');
            card.addEventListener('mouseleave', () => card.style.transform = '');

            card.innerHTML = `
                <div style="width:100%; height:140px; background:#f8fafc; display:flex; align-items:center; justify-content:center; padding:16px;">
                    ${data.logoUrl ? `<img src="${data.logoUrl}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<div style="color:var(--text-muted); font-size:0.85rem;">Sem logo</div>'}
                </div>
                <div style="padding:14px;">
                    <h4 style="margin-bottom:4px; font-size:0.9rem;">${esc(data.name)}</h4>
                    ${data.website ? `<a href="${data.website}" target="_blank" style="color:var(--primary); font-size:0.75rem; text-decoration:none;">Visitar site ↗</a>` : ''}
                    <div style="display:flex; gap:8px; margin-top:12px; justify-content:center;">
                        <button class="edit-btn" style="background:none; border:1px solid var(--glass-border); border-radius:6px; padding:6px 10px; cursor:pointer; font-size:0.78rem; color:var(--text-secondary);">Editar</button>
                        <button class="del-btn" style="font-size:0.78rem; padding:6px 10px;">Excluir</button>
                    </div>
                </div>
            `;

            card.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); showModal(docSnap.id, data); });
            card.querySelector('.del-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Excluir apoiador "${data.name}"?`)) {
                    deleteDoc(doc(db, 'sponsors', docSnap.id));
                }
            });

            grid.appendChild(card);
        });
    });
}

function showModal(editId = null, editData = null) {
    const existing = document.getElementById('apoiador-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'apoiador-modal-overlay';
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '1001';

    overlay.innerHTML = `
        <div class="modal-content" style="max-width:520px;">
            <div class="modal-header">
                <h2>${editId ? 'Editar Apoiador' : 'Novo Apoiador'}</h2>
                <button class="close-btn" id="closeApoiadorModal">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="form-group">
                <label>Nome da Institui\u00e7\u00e3o</label>
                <input type="text" id="apo-name" value="${esc(editData?.name || '')}" placeholder="Nome do apoiador">
            </div>
            <div class="form-group">
                <label>Descri\u00e7\u00e3o (sobre a institui\u00e7\u00e3o)</label>
                <textarea id="apo-desc" rows="3" style="width:100%; resize:vertical;" placeholder="Breve descri\u00e7\u00e3o da institui\u00e7\u00e3o...">${esc(editData?.description || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Website (opcional)</label>
                <input type="url" id="apo-website" value="${esc(editData?.website || '')}" placeholder="https://...">
            </div>
            <div class="form-group">
                <label>Logo</label>
                ${editData?.logoUrl ? `<img src="${editData.logoUrl}" style="max-width:200px; max-height:80px; object-fit:contain; margin-bottom:8px; display:block;">` : ''}
                <input type="file" id="apo-logo" accept="image/*" style="width:100%;">
            </div>
            <div class="form-group">
                <label>Ordem (menor = aparece primeiro)</label>
                <input type="number" id="apo-order" value="${editData?.order ?? 0}" style="width:100px;">
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" id="cancelApoiadorModal" style="color:var(--text-secondary);">Cancelar</button>
                <button class="btn-primary" id="saveApoiadorBtn">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#closeApoiadorModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cancelApoiadorModal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#saveApoiadorBtn').addEventListener('click', async () => {
        const name = document.getElementById('apo-name').value.trim();
        const description = document.getElementById('apo-desc').value.trim();
        const website = document.getElementById('apo-website').value.trim();
        const order = parseInt(document.getElementById('apo-order').value) || 0;
        const fileInput = document.getElementById('apo-logo');

        if (!name) { alert('Preencha o nome.'); return; }

        const saveBtn = overlay.querySelector('#saveApoiadorBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';

        try {
            let logoUrl = editData?.logoUrl || '';

            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const storageRef = ref(storage, `sponsors/${Date.now()}_${file.name}`);
                const snap = await uploadBytes(storageRef, file);
                logoUrl = await getDownloadURL(snap.ref);
            }

            const payload = { name, description, website, logoUrl, order };

            if (editId) {
                await updateDoc(doc(db, 'sponsors', editId), payload);
            } else {
                payload.createdAt = Timestamp.now();
                await addDoc(collection(db, 'sponsors'), payload);
            }

            overlay.remove();
        } catch (err) {
            console.error('Error saving sponsor:', err);
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
