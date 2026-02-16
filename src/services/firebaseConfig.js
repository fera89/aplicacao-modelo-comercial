import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyAJpWEG7hp1f4QZGuWNk_nsguBq2o_C40s",
    authDomain: "insight-na-pratica-2026.firebaseapp.com",
    projectId: "insight-na-pratica-2026",
    storageBucket: "insight-na-pratica-2026.firebasestorage.app",
    messagingSenderId: "757016188722",
    appId: "1:757016188722:web:ebc00906bfaf11ad60292b",
    measurementId: "G-1KXZYLFSD6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
// Use initializeFirestore to configure long polling which fixes "offline" errors on some Android networks
import { initializeFirestore } from "firebase/firestore";
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

// Analytics
export let analytics;
isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Storage
import { getStorage } from "firebase/storage";
export const storage = getStorage(app);
