import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Fix: Firebase v10+ checks `window !== window.top` to detect embedded environments.
// In React Native, global.window.top is undefined, so the check evaluates to true and
// Firebase throws "Cannot create devtools websocket connections in embedded environments".
// Setting global.top = global makes window.top === window, bypassing the crash.
if (typeof global !== 'undefined') {
    global.top = global;
    global.__FIREBASE_DEFAULTS__ = {};
}

const firebaseConfig = {
    apiKey: "AIzaSyAnYi_DUhqJTE_PD57sLKRFSSGdcn_kJJw",
    authDomain: "prot-veicul-base.firebaseapp.com",
    projectId: "prot-veicul-base",
    storageBucket: "prot-veicul-base.firebasestorage.app",
    messagingSenderId: "546715224469",
    appId: "1:546715224469:web:2edcffaebf8347bb634e9c",
    measurementId: "G-FX5DCYMPXQ"
};

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with long polling to fix "offline" errors on some Android networks
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

// Analytics (optional — not supported on all devices)
export let analytics;
isSupported().then((supported) => {
    if (supported) {
        try {
            analytics = getAnalytics(app);
        } catch (e) {
            console.warn("Firebase Analytics initialization failed", e);
        }
    }
}).catch(e => {
    console.warn("Firebase Analytics support check failed", e);
});

// Auth with AsyncStorage persistence
let authObj;
try {
    authObj = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
} catch (e) {
    authObj = getAuth(app);
}
export const auth = authObj;

export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");
