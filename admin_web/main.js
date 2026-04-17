import './style.css'
import { db, auth } from './src/firebase.js'
import { collection, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'

// Authentication Guard
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Redirect to login if not authenticated
        window.location.replace('/login.html');
    } else {
        // Show user info
        const userProfileName = document.querySelector('.user-profile span');
        if (userProfileName) {
            userProfileName.textContent = user.email; // Fallback
            // Try to fetch extended admin data from the exclusive admins collection
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                if (adminDoc.exists() && adminDoc.data().name) {
                    userProfileName.textContent = adminDoc.data().name;
                }
            } catch (e) {
                console.warn("Could not fetch admin name.", e);
            }
        }
    }
});

// Reference Elements
const fbStatusEl = document.getElementById('fb-status')

// Check Firebase connection logic (listening to a basic public config or simply capturing load state)
try {
    // A simplistic connection test by creating a snapshot listener on a typical table ('users' or 'content')
    // We don't read the docs securely yet, just see if the snapshot is able to reach
    const testRef = collection(db, 'users');
    onSnapshot(testRef, (snapshot) => {
        fbStatusEl.textContent = 'Online / Conectado';
        fbStatusEl.style.color = '#34d399';
    }, (err) => {
        console.warn("Firestore connection check failed", err);
    });

    // Set online instantly if initialized successfully
    fbStatusEl.textContent = 'Online / SDK Ativo';
} catch (error) {
    fbStatusEl.textContent = 'Erro de Conexão';
    fbStatusEl.style.color = '#ef4444';
    console.error("Firebase init issue:", error);
}

// Init Modules
import { initUsers } from './src/usuarios.js'
import { initNotificacoes } from './src/notificacoes.js'
import { initCompliance } from './src/compliance.js'
import { initAssistant } from './src/assistant.js'
import { initCursos } from './src/cursos.js'
import { initVendas } from './src/vendas.js'

// View Management System
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view-section');

navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.id === 'logoutBtn') return; // let logout handle its own event
        e.preventDefault();

        // Remove active class from buttons and views
        navBtns.forEach(b => b.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));

        // Add active to current
        const targetViewId = btn.getAttribute('data-view');
        btn.classList.add('active');
        document.getElementById(`view-${targetViewId}`).classList.add('active');

        // Update header title
        const headerTitle = document.querySelector('.header-title');
        const titles = {
            dashboard: 'Dashboard Overview',
            cursos: 'Gestão de Cursos',
            usuarios: 'Usuários',
            notificacoes: 'Push Notifications',
            compliance: 'Compliance & Provas',
            vendas: 'Ranking de Vendas',
            assistant: 'Assistente Virtual IA'
        };
        if (headerTitle) headerTitle.textContent = titles[targetViewId] || 'AppINP Admin';

        // Lazy load module data on click
        if (targetViewId === 'cursos' && !window.cursosLoaded) {
            initCursos();
            window.cursosLoaded = true;
        }
        if (targetViewId === 'usuarios' && !window.usuariosLoaded) {
            initUsers();
            window.usuariosLoaded = true;
        }
        if (targetViewId === 'notificacoes' && !window.notificacoesLoaded) {
            initNotificacoes();
            window.notificacoesLoaded = true;
        }
        if (targetViewId === 'compliance' && !window.complianceLoaded) {
            initCompliance();
            window.complianceLoaded = true;
        }
        if (targetViewId === 'vendas' && !window.vendasLoaded) {
            initVendas();
            window.vendasLoaded = true;
        }
        if (targetViewId === 'assistant' && !window.assistantLoaded) {
            initAssistant();
            window.assistantLoaded = true;
        }
    });
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
        } catch (err) {
            console.error(err);
        }
    });
}

