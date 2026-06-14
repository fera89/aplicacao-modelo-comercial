import { auth } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

const loginForm   = document.getElementById('loginForm');
const emailInput  = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loginBtn    = document.getElementById('loginBtn');

// This is the admin login page — always go to admin panel
onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace('/');
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorMessage.style.display = 'none';
    loginBtn.textContent = 'Autenticando...';
    loginBtn.disabled = true;

    try {
        const credential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        await redirectByRole(credential.user);
    } catch (error) {
        console.error('Login failed:', error);
        errorMessage.style.display = 'block';
        errorMessage.textContent = error.code === 'auth/invalid-credential'
            ? 'Usuário ou senha incorretos.'
            : 'Erro ao fazer login. Tente novamente.';
    } finally {
        loginBtn.textContent = 'Acessar Painel';
        loginBtn.disabled = false;
    }
});
