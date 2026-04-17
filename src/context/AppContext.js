import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { FirebaseService } from '../services/FirebaseService';
import { auth, db } from '../services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

// Configure notification handler (shows notifications even when app is open)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [userProgress, setUserProgress] = useState({}); // { courseId: { progress, completedLessons, ... } }

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser && !firebaseUser.isAnonymous) {
                try {
                    console.log("AppContext: Persisted session found for UID:", firebaseUser.uid);
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const userData = { id: firebaseUser.uid, ...userDoc.data() };
                        setUser(userData);
                        registerPushToken(firebaseUser.uid);
                        // Load user progress
                        loadUserProgress(firebaseUser.uid);
                    } else {
                        setUser({ id: firebaseUser.uid, email: firebaseUser.email });
                    }
                } catch (e) {
                    console.error("AppContext: Error restoring user session:", e);
                    // Fallback — at least set basic user
                    setUser({ id: firebaseUser.uid, email: firebaseUser.email });
                }
            } else {
                setUser(null);
                setUserProgress({});
            }
            setInitializing(false);
        });

        return () => {
            unsubscribeAuth();
        };
    }, []);

    const loadUserProgress = async (userId) => {
        try {
            const progress = await FirebaseService.getAllUserProgress(userId);
            setUserProgress(progress);
        } catch (e) {
            console.error("AppContext: Error loading progress:", e);
        }
    };

    const registerPushToken = async (userId) => {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('AppContext: Push notification permission not granted');
                return;
            }

            const projectId = '54c79732-2741-4567-88ef-8dbd96036a0f';
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            const expoPushToken = tokenData.data;

            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                expoPushToken: expoPushToken,
                pushTokenUpdatedAt: new Date().toISOString(),
                platform: Platform.OS
            });
        } catch (e) {
            console.warn('AppContext: Could not register push token:', e);
        }
    };

    const login = (userData) => {
        setUser(userData);
        if (userData?.id) {
            registerPushToken(userData.id);
            loadUserProgress(userData.id);
        }
    };

    const logout = () => {
        setUser(null);
        setUserProgress({});
    };

    const updateProgress = (courseId, progressData) => {
        setUserProgress(prev => ({
            ...prev,
            [courseId]: { ...prev[courseId], ...progressData }
        }));
    };

    const refreshUser = async () => {
        if (!user?.id) return;
        try {
            const userRef = doc(db, 'users', user.id);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                setUser({ id: user.id, ...userDoc.data() });
            }
        } catch (e) {
            console.error("AppContext: Error refreshing user:", e);
        }
    };

    return (
        <AppContext.Provider value={{
            user,
            initializing,
            userProgress,
            login,
            logout,
            updateProgress,
            refreshUser,
            loadUserProgress,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
