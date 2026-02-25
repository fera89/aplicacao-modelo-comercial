import { auth } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');

// Redirect user if they're already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace('/');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    errorMessage.style.display = 'none';
    loginBtn.textContent = 'Autenticando...';
    loginBtn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the redirect
    } catch (error) {
        console.error("Login failed:", error);
        errorMessage.style.display = 'block';

        if (error.code === 'auth/invalid-credential') {
            errorMessage.textContent = 'Usuário ou senha incorretos.';
        } else {
            errorMessage.textContent = 'Erro ao fazer login. Tente novamente.';
        }
    } finally {
        loginBtn.textContent = 'Acessar Painel';
        loginBtn.disabled = false;
    }
});
