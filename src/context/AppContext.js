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
    const [user, setUser] = useState(null); // User data after check-in
    const [initializing, setInitializing] = useState(true); // Auth loading state
    const [themePreference, setThemePreference] = useState('light'); // Theme preference
    const [eventStats, setEventStats] = useState({
        totalAttendees: 0,
        carbonFootprint: 0,
        wasteDiverted: 0,
    }); // Global event stats

    useEffect(() => {
        // Listen for persisted auth state to restore session on app restart
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser && !firebaseUser.isAnonymous) {
                try {
                    console.log("AppContext: Persisted session found for UID:", firebaseUser.uid);
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const userData = { id: firebaseUser.uid, ...userDoc.data() };
                        setUser(userData);
                        console.log("AppContext: User session restored from Firestore");
                        registerPushToken(firebaseUser.uid);
                    } else {
                        // User doc missing — set basic info
                        setUser({ id: firebaseUser.uid, email: firebaseUser.email });
                        console.log("AppContext: User session restored (no Firestore profile)");
                    }
                } catch (e) {
                    console.error("AppContext: Error restoring user session:", e);
                }
            } else {
                setUser(null);
            }
            setInitializing(false);
        });

        // Subscribe to global stats
        const unsubscribe = FirebaseService.subscribeToEventStats((stats) => {
            setEventStats(prev => ({ ...prev, ...stats }));
        });

        return () => {
            unsubscribeAuth();
            unsubscribe && unsubscribe();
        };
    }, []);

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

            // Get Expo Push Token
            const projectId = '54c79732-2741-4567-88ef-8dbd96036a0f';
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            const expoPushToken = tokenData.data;
            console.log('AppContext: ExpoPushToken:', expoPushToken);

            // Save to Firestore
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                expoPushToken: expoPushToken,
                pushTokenUpdatedAt: new Date().toISOString(),
                platform: Platform.OS
            });
            console.log('AppContext: Push token saved to Firestore');
        } catch (e) {
            console.warn('AppContext: Could not register push token:', e);
        }
    };

    const login = (userData) => {
        setUser(userData);
        if (userData?.id) {
            registerPushToken(userData.id);
        }
    };

    const logout = () => {
        setUser(null);
    };

    const addImpact = async (entry) => {
        // entry: { type: 'transport'|'habit', co2Kept: number, unreleased: number, ... }

        // Update local user stats (optimistic UI update)
        setUser(prev => ({
            ...prev,
            impact: {
                co2Saved: (prev?.impact?.co2Saved || 0) + (entry.co2Saved || 0),
                actions: (prev?.impact?.actions || 0) + 1,
            }
        }));

        // Update global stats locally
        updateStats({
            totalAttendees: eventStats.totalAttendees,
            carbonFootprint: eventStats.carbonFootprint + (entry.co2Emitted || 0),
            co2Saved: (eventStats.co2Saved || 0) + (entry.co2Saved || 0),
        });

        // Persist to Firebase
        if (user?.id) {
            await FirebaseService.logImpact(user.id, entry);
            await FirebaseService.updateEventStats({
                co2Saved: entry.co2Saved,
                carbonFootprint: entry.co2Emitted
            });
        }
    };

    const updateStats = (newStats) => {
        setEventStats(prev => ({ ...prev, ...newStats }));
    };

    const completeESGCheckIn = async (data) => {
        // Calculate Carbon Avoided
        // Baseline: Single-occupancy car emits ~0.2kg CO2 per km.
        // Formula variables:
        let avoidedKg = 0;
        let km = 0;

        switch (data.distance) {
            case '0–5 km': km = 2.5; break;
            case '5–10 km': km = 7.5; break;
            case '10–20 km': km = 15; break;
            case '20–50 km': km = 35; break;
            case '>50 km': km = 60; break;
            default: km = 0;
        }

        // Multiplied by 2 if returning same mode
        if (data.returnSameMode) km = km * 2;

        const baseEmission = km * 0.2; // The generic scenario (alone in a car)

        if (data.transportMode === 'A pé' || data.transportMode === 'Bike') {
            // 100% savings compared to car
            avoidedKg = baseEmission;
        } else if (data.transportMode === 'Transporte público') {
            // Bus/Train emits ~0.04kg/km. Saving 0.16kg/km
            avoidedKg = km * 0.16;
        } else if (data.transportMode === 'Carona' || data.transportMode === 'App') {
            // Roughly dividing the 0.2 across occupants
            const occ = parseInt(data.carOccupancy) || 2; // default at least 2 for carpool
            const emissionPerPerson = 0.2 / occ;
            avoidedKg = km * (0.2 - emissionPerPerson);
        } else if (data.transportMode === 'Carro-sozinho') {
            avoidedKg = 0; // No savings
        }

        // Add tiny bonus for bringing their own cup
        if (data.broughtCup) avoidedKg += 0.5;

        // Optimistic update
        const updatedUser = {
            ...user,
            hasCompletedESGCheckIn: true,
            esgData: data,
            impact: {
                ...user?.impact,
                co2Saved: (user?.impact?.co2Saved || 0) + avoidedKg
            }
        };
        setUser(updatedUser);

        // Persist
        if (user?.id) {
            await FirebaseService.updateUser(user.id, {
                hasCompletedESGCheckIn: true,
                esgData: data,
                'impact.co2Saved': updatedUser.impact.co2Saved
            });
            await FirebaseService.submitESGData(user.id, user.name || user.email, data, avoidedKg);
        }
    };

    return (
        <AppContext.Provider value={{
            user,
            initializing,
            login,
            logout,
            themePreference,
            setThemePreference,
            eventStats,
            updateStats,
            addImpact,
            completeESGCheckIn
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
