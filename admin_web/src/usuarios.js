import { db, secondaryAuth } from './firebase.js';
import { collection, onSnapshot, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const openModalBtn = document.getElementById('openUserModalBtn');
const closeModalBtn = document.getElementById('closeUserModalBtn');
const cancelModalBtn = document.getElementById('cancelUserModalBtn');
const saveBtn = document.getElementById('saveUserBtn');
const userModal = document.getElementById('userModal');
const usersTableBody = document.getElementById('usersTableBody');
const newUserForm = document.getElementById('newUserForm');

// Initialize real-time listener
export function initUsers() {
    setupModalEvents();
    listenUsers();
}

function listenUsers() {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        usersTableBody.innerHTML = '';

        if (snapshot.empty) {
            usersTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">Nenhum usuário cadastrado.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const user = doc.data();
            const date = new Date(user.createdAt).toLocaleDateString();
            const badgeClass = user.role === 'admin' ? 'style="background:rgba(239, 68, 68, 0.2); color:#ef4444; border-color:rgba(239,68,68,0.3)"' : '';

            usersTableBody.innerHTML += `
                <tr>
                    <td><strong>${user.name}</strong></td>
                    <td>${user.email}</td>
                    <td>${user.phone || '-'}</td>
                    <td><span class="badge" ${badgeClass}>${user.role.toUpperCase()}</span></td>
                    <td>
                        Evt: ${date}<br>
                        <span style="font-size:0.75rem; color:var(--text-muted)">${user.address || 'Sem Endereço'}</span>
                    </td>
                </tr>
            `;
        });
    });
}

function setupModalEvents() {
    const toggleModal = (show) => {
        userModal.classList.toggle('active', show);
        if (!show) newUserForm.reset();
    };

    openModalBtn.addEventListener('click', () => toggleModal(true));
    closeModalBtn.addEventListener('click', () => toggleModal(false));
    cancelModalBtn.addEventListener('click', () => toggleModal(false));

    newUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = "Processando...";

        const email = document.getElementById('nu-email').value;
        const password = document.getElementById('nu-password').value;
        const name = document.getElementById('nu-name').value;
        const phone = document.getElementById('nu-phone').value;
        const address = document.getElementById('nu-address').value;
        const instagram = document.getElementById('nu-instagram').value;
        const role = document.getElementById('nu-role').value;

        try {
            // 1. Create Auth Account using Secondary App Instance
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            // 2. Map payload dynamically expected by the mobile app structure
            const payload = {
                id: uid,
                email,
                name,
                phone,
                address,
                instagram,
                role: role,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                authProvider: 'email',
                stats: {
                    points: 0,
                    surveysCompleted: 0,
                    activitiesJoined: 0
                },
                preferences: { notifications: true }
            };

            // 3. Inject direct on Primary Firestore App
            await setDoc(doc(db, "users", uid), payload);

            // 4. Force signing secondary out 
            await secondaryAuth.signOut();

            toggleModal(false);
            alert("Usuário criado com sucesso no banco de dados.");

        } catch (error) {
            console.error("User Creation Error:", error);
            alert("Falha: " + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Registrar";
        }
    });
}
