import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const registerForm = document.getElementById('registerForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const registerBtn = document.getElementById('registerBtn');

let isRegistering = false;

// Listen for already logged in state (or prevent register page display when auth)
onAuthStateChanged(auth, (user) => {
    if (user && !isRegistering) {
        window.location.replace('/');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    registerBtn.textContent = 'Cadastrando...';
    registerBtn.disabled = true;

    isRegistering = true;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Force creation of Admin profile
        await setDoc(doc(db, 'admins', uid), {
            id: uid,
            email: email,
            name: "Admin Inicial",
            role: "admin",
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            stats: { points: 0, surveysCompleted: 0, activitiesJoined: 0 },
            preferences: { notifications: true }
        });

        successMessage.style.display = 'block';
        console.log("Account created and profile secured:", userCredential.user.email);
        setTimeout(() => { window.location.replace('/'); }, 1500);
    } catch (error) {
        console.error("Registration failed:", error);
        errorMessage.style.display = 'block';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage.textContent = 'Este e-mail já está sendo usado.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage.textContent = 'A senha deve ter pelo menos 6 caracteres.';
        } else {
            errorMessage.textContent = 'Erro ao criar conta: ' + error.message;
        }
        registerBtn.textContent = 'Criar Conta';
        registerBtn.disabled = false;
    }
});
