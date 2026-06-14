import { auth } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getRole } from './auth-role.js';

const loginForm   = document.getElementById('loginForm');
const emailInput  = document.getElementById('email');
const passInput   = document.getElementById('password');
const errorMsg    = document.getElementById('errorMessage');
const loginBtn    = document.getElementById('loginBtn');

async function redirectByRole(user) {
    const role = await getRole(user.uid);
    window.location.replace(role === 'admin' ? '/' : '/client.html');
}

onAuthStateChanged(auth, async (user) => {
    if (user) await redirectByRole(user);
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';
    loginBtn.textContent = 'Autenticando...';
    loginBtn.disabled = true;
    try {
        const { user } = await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
        await redirectByRole(user);
    } catch (error) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = ['auth/invalid-credential','auth/user-not-found','auth/wrong-password'].includes(error.code)
            ? 'Usuário ou senha incorretos.'
            : 'Erro ao fazer login. Tente novamente.';
        loginBtn.textContent = 'Entrar';
        loginBtn.disabled = false;
    }
});
