import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ImpactFormScreen } from '../screens/ImpactFormScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { NetworkingScreen } from '../screens/NetworkingScreen';
import { useApp } from '../context/AppContext';
import { theme } from '../theme/Theme';
// Ionicons is part of expo-vector-icons which is standard in Expo
import Ionicons from '@expo/vector-icons/Ionicons';

import { QRCodeScreen } from '../screens/QRCodeScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { PermissionsScreen } from '../screens/PermissionsScreen';
import { CredentialsScreen } from '../screens/CredentialsScreen';
import { ESGCheckInScreen } from '../screens/ESGCheckInScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Home') {
                    iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Agenda') {
                    iconName = focused ? 'calendar' : 'calendar-outline';
                } else if (route.name === 'Networking') {
                    iconName = focused ? 'people' : 'people-outline';
                } else if (route.name === 'Credenciais') {
                    iconName = focused ? 'id-card' : 'id-card-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
            },
        })}
    >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Agenda" component={AgendaScreen} />
        <Tab.Screen name="Networking" component={NetworkingScreen} />
        <Tab.Screen name="Credenciais" component={CredentialsScreen} />
    </Tab.Navigator>
);

export const AppNavigator = () => {
    const { user, initializing } = useApp();

    // Show loading screen while Firebase checks for a persisted session
    if (initializing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    <>
                        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
                    </>
                ) : !user.hasCompletedESGCheckIn ? (
                    <>
                        {/* Check-in Obrigatório */}
                        <Stack.Screen name="ESGCheckIn" component={ESGCheckInScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Permissions" component={PermissionsScreen} />
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="ImpactForm" component={ImpactFormScreen} options={{ presentation: 'modal', headerShown: true, title: 'Registrar Ação' }} />
                        {/* Allow editing from Home */}
                        <Stack.Screen name="ESGCheckInEdit" component={ESGCheckInScreen} options={{ headerShown: true, title: 'Editar Check-in' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
