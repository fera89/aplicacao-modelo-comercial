import React, { createContext, useState, useContext, useEffect } from 'react';
import { FirebaseService } from '../services/FirebaseService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null); // User data after check-in
    const [themePreference, setThemePreference] = useState('light'); // Theme preference
    const [eventStats, setEventStats] = useState({
        totalAttendees: 0,
        carbonFootprint: 0,
        wasteDiverted: 0,
    }); // Global event stats

    useEffect(() => {
        // Subscribe to global stats
        const unsubscribe = FirebaseService.subscribeToEventStats((stats) => {
            setEventStats(prev => ({ ...prev, ...stats }));
        });

        return () => unsubscribe && unsubscribe();
    }, []);

    const login = (userData) => {
        setUser(userData);
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
        // Optimistic update
        const updatedUser = {
            ...user,
            hasCompletedESGCheckIn: true,
            esgData: data
        };
        setUser(updatedUser);

        // Persist
        if (user?.id) {
            await FirebaseService.updateUser(user.id, {
                hasCompletedESGCheckIn: true,
                esgData: data
            });
        }
    };

    return (
        <AppContext.Provider value={{
            user,
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
