import React from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export const HomeScreen = ({ navigation }) => {
    const { user } = useApp();

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Header / Greeting with Mini Stats */}
                <View style={styles.header}>
                    <View>
                        <Typography variant="h2" style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Participante'}!</Typography>
                        <Typography variant="body" style={styles.date}>15 de Outubro, 2026</Typography>
                    </View>
                    <TouchableOpacity style={styles.miniStatsConfig} onPress={() => navigation.navigate('ESGCheckInEdit', { isEditing: true })}>
                        <View style={styles.miniStatItem}>
                            <Ionicons name="leaf" size={16} color={theme.colors.primary} />
                            <Typography variant="caption" style={styles.miniStatValue}>{user?.impact?.co2Saved?.toFixed(1) || '0.0'}kg</Typography>
                        </View>
                        <View style={styles.miniStatItem}>
                            <Ionicons name="trophy" size={16} color="#FFD700" />
                            <Typography variant="caption" style={styles.miniStatValue}>{user?.stats?.points || 0} pts</Typography>
                        </View>
                        <Typography variant="caption" style={{ fontSize: 10, color: theme.colors.primary, marginTop: 4, textAlign: 'center' }}>Editar Dados</Typography>
                    </TouchableOpacity>
                </View>

                {/* Next Activity Placeholder */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Typography variant="h3">Próxima Atividade</Typography>
                        <TouchableOpacity onPress={() => navigation.navigate('Agenda')}>
                            <Typography variant="caption" style={styles.seeAll}>Ver agenda</Typography>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.activityCard}>
                        <View style={styles.timeTag}>
                            <Typography variant="caption" style={styles.timeText}>10:00</Typography>
                        </View>
                        <View style={styles.activityContent}>
                            <Typography variant="body" style={styles.activityTitle}>Keynote: O Futuro Regenerativo</Typography>
                            <Typography variant="caption" style={styles.activityLocation}>📍 Palco Principal</Typography>
                        </View>
                    </View>
                </View>

                {/* Highlights (Destaques) */}
                <View style={styles.section}>
                    <Typography variant="h3" style={styles.sectionTitle}>Destaques</Typography>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsContainer}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={styles.highlightCard}>
                                <View style={styles.highlightImagePlaceholder} />
                                <Typography variant="caption" style={styles.highlightText}>Novidade {i}</Typography>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Sponsors / Supporters */}
                <View style={styles.section}>
                    <Typography variant="h3" style={styles.sectionTitle}>Apoiadores</Typography>
                    <View style={styles.sponsorsGrid}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={styles.sponsorPlaceholder}>
                                <Typography variant="caption" style={{ color: '#aaa' }}>Logo {i}</Typography>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scroll: {
        paddingBottom: theme.spacing.xl,
    },
    header: {
        marginBottom: theme.spacing.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    miniStatsConfig: {
        backgroundColor: theme.colors.surface,
        padding: 8,
        borderRadius: theme.borderRadius.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    miniStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    miniStatValue: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
        color: theme.colors.text,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.l,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        gap: 10,
    },
    cardTitle: {
        marginBottom: 0,
    },
    impactStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: theme.spacing.m,
    },
    statValue: {
        textAlign: 'center',
        color: theme.colors.primary,
    },
    unit: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    divider: {
        width: 1,
        backgroundColor: theme.colors.border,
    },
    actionButton: {
        marginTop: theme.spacing.s,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    seeAll: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    activityCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background, // Slightly different from surface if needed, or stick to surface
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.s,
        padding: theme.spacing.m,
        alignItems: 'center',
    },
    timeTag: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginRight: 12,
    },
    timeText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontWeight: '600',
        marginBottom: 2,
    },
    activityLocation: {
        color: theme.colors.textSecondary,
    },
    sectionTitle: {
        marginBottom: theme.spacing.s,
    },
    highlightsContainer: {
        marginHorizontal: -theme.spacing.m, // negative margin to allow full-width scrolling
        paddingHorizontal: theme.spacing.m,
    },
    highlightCard: {
        width: 140,
        marginRight: theme.spacing.m,
    },
    highlightImagePlaceholder: {
        width: '100%',
        height: 100,
        backgroundColor: '#e0e0e0',
        borderRadius: theme.borderRadius.s,
        marginBottom: 8,
    },
    highlightText: {
        textAlign: 'center',
    },
    sponsorsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    sponsorPlaceholder: {
        width: '22%', // Roughly 4 per row
        aspectRatio: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: theme.borderRadius.s,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    }

});
