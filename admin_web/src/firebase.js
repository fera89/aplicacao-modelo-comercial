import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAJpWEG7hp1f4QZGuWNk_nsguBq2o_C40s",
  authDomain: "insight-na-pratica-2026.firebaseapp.com",
  projectId: "insight-na-pratica-2026",
  storageBucket: "insight-na-pratica-2026.firebasestorage.app",
  messagingSenderId: "757016188722",
  appId: "1:757016188722:web:ebc00906bfaf11ad60292b",
  measurementId: "G-1KXZYLFSD6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Secondary App (Used exclusively for creating accounts without logging out the primary Admin)
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
