import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useApp } from '../context/AppContext';
import { theme } from '../theme/Theme';
import Ionicons from '@expo/vector-icons/Ionicons';

// Screens
import { AuthScreen } from '../screens/AuthScreen';
import { CoursesScreen } from '../screens/CoursesScreen';
import { CourseDetailScreen } from '../screens/CourseDetailScreen';
import { LessonScreen } from '../screens/LessonScreen';
import { RankingScreen } from '../screens/RankingScreen';
import { AssistantScreen } from '../screens/AssistantScreen';
import { CertificatesScreen } from '../screens/CertificatesScreen';
import { CertificateScreen } from '../screens/CertificateScreen';
import { CertificationTestScreen } from '../screens/CertificationTestScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ComplianceScreen } from '../screens/ComplianceScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarStyle: {
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
            },
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Cursos') {
                    iconName = focused ? 'book' : 'book-outline';
                } else if (route.name === 'Ranking') {
                    iconName = focused ? 'trophy' : 'trophy-outline';
                } else if (route.name === 'Assistente') {
                    iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                } else if (route.name === 'Certificados') {
                    iconName = focused ? 'school' : 'school-outline';
                } else if (route.name === 'Perfil') {
                    iconName = focused ? 'person' : 'person-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
            },
        })}
    >
        <Tab.Screen name="Cursos" component={CoursesScreen} />
        <Tab.Screen name="Ranking" component={RankingScreen} />
        <Tab.Screen name="Assistente" component={AssistantScreen} />
        <Tab.Screen name="Certificados" component={CertificatesScreen} />
        <Tab.Screen name="Perfil" component={ProfileScreen} />
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
                    <Stack.Screen name="Auth" component={AuthScreen} />
                ) : (
                    <>
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
                        <Stack.Screen name="Lesson" component={LessonScreen} />
                        <Stack.Screen name="CertificationTest" component={CertificationTestScreen} />
                        <Stack.Screen name="Certificate" component={CertificateScreen} />
                        <Stack.Screen name="Compliance" component={ComplianceScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
