import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';

export const StatsScreen = () => {
    const { eventStats } = useApp();

    return (
        <ScreenWrapper>
            <Typography variant="h2" style={styles.title}>Impacto do Treinamento</Typography>

            <View style={styles.statCard}>
                <Typography variant="h1" style={styles.statValue}>
                    {eventStats?.co2Saved?.toFixed(1) || '0.0'} kg
                </Typography>
                <Typography variant="body">CO2 Evitados (Total)</Typography>
            </View>

            <View style={styles.statCard}>
                <Typography variant="h1" style={styles.statValue}>
                    {eventStats?.carbonFootprint?.toFixed(1) || '0.0'} kg
                </Typography>
                <Typography variant="body">Emissões Totais Estimadas</Typography>
            </View>

            <Typography variant="caption" style={styles.footer}>Dados em tempo real</Typography>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    title: {
        marginBottom: theme.spacing.l,
    },
    statCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statValue: {
        color: theme.colors.primary,
        fontSize: 48,
        marginBottom: theme.spacing.s,
    },
    footer: {
        textAlign: 'center',
        marginTop: theme.spacing.l,
    }
});
