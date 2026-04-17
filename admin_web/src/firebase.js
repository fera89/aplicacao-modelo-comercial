import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

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
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1");

// Secondary App (Used exclusively for creating accounts without logging out the primary Admin)
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
