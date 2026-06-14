import { db } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Returns 'admin' | 'user' | 'unknown'
 * Checks `admins` collection first, then falls back to `users.role`.
 * Never throws — Firestore errors are swallowed and treated as unknown.
 */
export async function getRole(uid) {
    try {
        const adminDoc = await getDoc(doc(db, 'admins', uid));
        if (adminDoc.exists()) return 'admin';
    } catch (_) { /* permission denied or network error */ }

    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data().role === 'admin' ? 'admin' : 'user';
        }
    } catch (_) { /* permission denied or network error */ }

    return 'unknown';
}
