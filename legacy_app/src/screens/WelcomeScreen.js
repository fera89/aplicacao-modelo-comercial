import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { useApp } from '../context/AppContext';
import { theme } from '../theme/Theme';

export const WelcomeScreen = ({ navigation }) => {
    const { login } = useApp();

    const handleCheckIn = () => {
        navigation.navigate('QRCode');
    };

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <Typography variant="h1" style={styles.title}>Insight na Prática 2026</Typography>
                <Typography variant="body" style={styles.subtitle}>Evento Sustentável ESG</Typography>

                <View style={styles.spacer} />

                <Button title="Check-in / Entrar" onPress={handleCheckIn} />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        marginBottom: theme.spacing.s,
        textAlign: 'center',
        color: theme.colors.primary,
    },
    subtitle: {
        marginBottom: theme.spacing.xl,
        textAlign: 'center',
        color: theme.colors.textSecondary,
    },
    spacer: {
        height: 48,
    },
});
