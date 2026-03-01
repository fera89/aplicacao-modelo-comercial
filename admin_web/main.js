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
    const testRef = collection(db, 'events');
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
import { initEventos } from './src/eventos.js'
import { initNotificacoes } from './src/notificacoes.js'
import { initDestaques } from './src/destaques.js'
import { initApoiadores } from './src/apoiadores.js'

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

        // Hide event details sub-view when switching away
        const eventDetails = document.getElementById('view-evento-detalhes');
        if (eventDetails) eventDetails.style.display = 'none';

        // Add active to current
        const targetViewId = btn.getAttribute('data-view');
        btn.classList.add('active');
        document.getElementById(`view-${targetViewId}`).classList.add('active');

        // Update header title
        const headerTitle = document.querySelector('.header-title');
        const titles = {
            dashboard: 'Dashboard Overview',
            conteudos: 'Gerenciar Eventos',
            usuarios: 'Usuários',
            notificacoes: 'Push Notifications',
            destaques: 'Destaques',
            apoiadores: 'Apoiadores'
        };
        if (headerTitle) headerTitle.textContent = titles[targetViewId] || 'AppINP Admin';

        // Lazy load module data on click
        if (targetViewId === 'usuarios' && !window.usuariosLoaded) {
            initUsers();
            window.usuariosLoaded = true;
        }
        if (targetViewId === 'conteudos' && !window.conteudosLoaded) {
            initEventos();
            window.conteudosLoaded = true;
        }
        if (targetViewId === 'notificacoes' && !window.notificacoesLoaded) {
            initNotificacoes();
            window.notificacoesLoaded = true;
        }
        if (targetViewId === 'destaques' && !window.destaquesLoaded) {
            initDestaques();
            window.destaquesLoaded = true;
        }
        if (targetViewId === 'apoiadores' && !window.apoiadoresLoaded) {
            initApoiadores();
            window.apoiadoresLoaded = true;
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

// ESG Tracking Logic
const globalCo2Stat = document.getElementById('global-co2-stat');
const btnEnterPresentationMode = document.getElementById('btnEnterPresentationMode');
let totalEsgScore = 0;

if (globalCo2Stat) {
    onSnapshot(collection(db, "esg_responses"), (snapshot) => {
        let sum = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            sum += (data.carbonAvoidedKg || 0);
        });
        totalEsgScore = sum;
        globalCo2Stat.textContent = `${sum.toFixed(1)} kg`;

        const presentationNumber = document.getElementById('presentation-esg-number');
        if (presentationNumber) {
            presentationNumber.textContent = `${sum.toFixed(1)}`;
        }
    });
}

// Fullscreen Presentation Mode (Telão)
if (btnEnterPresentationMode) {
    btnEnterPresentationMode.addEventListener('click', () => {
        launchEsgPresentation();
    });
}

function launchEsgPresentation() {
    const overlay = document.createElement('div');
    overlay.id = 'esg-presentation-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = '#0f172a'; // Dark slate
    overlay.style.color = 'var(--bg-color)';
    overlay.style.zIndex = 9999;
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.fontFamily = "'Inter', sans-serif";

    // Earth Icon
    const earthSvg = `
         <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 32px;">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            <path d="M2 12h20"></path>
         </svg>
     `;

    overlay.innerHTML = `
         ${earthSvg}
         <h1 style="font-size: 3rem; font-weight: 300; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 4px; color: var(--text-muted);">Impacto ODS / ESG</h1>
         <div style="display:flex; align-items: baseline; justify-content: center; gap: 24px;">
              <span id="presentation-esg-number" style="font-size: 14rem; font-weight: 800; line-height: 1; color: var(--primary); text-shadow: 0 0 40px rgba(16, 185, 129, 0.4);">${totalEsgScore.toFixed(1)}</span>
              <span style="font-size: 4rem; font-weight: bold; color: var(--primary);">kg</span>
         </div>
         <h2 style="font-size: 2.5rem; font-weight: 400; margin-top: 24px; color: var(--text-muted);">de CO₂ evitados pelos participantes nesta edição.</h2>
         
         <button id="btnClosePresentation" style="position: absolute; top: 32px; right: 32px; background: rgba(255,255,255,0.1); border:none; color: white; width: 64px; height: 64px; border-radius: 32px; cursor: pointer; display: flex; align-items:center; justify-content:center; transition: all 0.3s;">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
             </svg>
         </button>
     `;

    document.body.appendChild(overlay);

    // Request Fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
        });
    }

    document.getElementById('btnClosePresentation').addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        overlay.remove();
    });

    // Hover effect for close btn
    const closer = document.getElementById('btnClosePresentation');
    closer.addEventListener('mouseenter', () => closer.style.background = 'rgba(239, 68, 68, 0.8)');
    closer.addEventListener('mouseleave', () => closer.style.background = 'rgba(255,255,255,0.1)');
}
