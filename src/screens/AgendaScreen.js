import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db } from '../services/firebaseConfig';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export const AgendaScreen = () => {
    const [activeEvent, setActiveEvent] = useState(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const q = query(collection(db, "events"), where("isActive", "==", true), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const eventData = snapshot.docs[0].data();
                setActiveEvent(eventData);
            } else {
                setActiveEvent(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching agenda:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Get active day data
    const currentDayData = activeEvent?.days && activeEvent.days.length > selectedDayIndex
        ? activeEvent.days[selectedDayIndex]
        : null;

    const dayEvents = currentDayData?.schedule || [];

    // Global Featured events across all days inside the event
    const featuredEvents = [];
    if (activeEvent?.days) {
        activeEvent.days.forEach((day, dIdx) => {
            (day.schedule || []).forEach(act => {
                if (act.featured) {
                    featuredEvents.push({ ...act, dayIndex: dIdx, dayLabel: day.label || `Dia ${dIdx + 1}` });
                }
            });
        });
    }

    const renderFeaturedItem = (item, idx) => (
        <View key={item.id || idx} style={styles.featuredCard}>
            <Image source={{ uri: item.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000' }} style={styles.featuredImage} resizeMode="cover" />
            <View style={styles.featuredOverlay}>
                <View style={styles.featuredTag}>
                    <Typography variant="caption" style={styles.featuredTagText}>Destaque • {item.dayLabel}</Typography>
                </View>
                <Typography variant="h3" style={styles.featuredTitle}>{item.title}</Typography>
                <View style={styles.featuredMetaRow}>
                    <Ionicons name="time-outline" size={14} color="#FFF" />
                    <Typography variant="caption" style={styles.featuredMetaText}>{item.time}</Typography>
                    <View style={{ width: 8 }} />
                    <Ionicons name="location-outline" size={14} color="#FFF" />
                    <Typography variant="caption" style={styles.featuredMetaText}>{item.location}</Typography>
                </View>
            </View>
        </View>
    );

    const renderListItem = ({ item }) => (
        <View style={styles.listItem}>
            <View style={styles.timeColumn}>
                <Typography variant="body" style={styles.listTime}>{item.time}</Typography>
                <View style={styles.timeLine} />
            </View>
            <View style={styles.cardContent}>
                <Image source={{ uri: item.image }} style={styles.listImage} />
                <View style={styles.textContainer}>
                    <Typography variant="body" style={styles.listTitle}>{item.title}</Typography>
                    <Typography variant="caption" style={styles.listLocation}>📍 {item.location}</Typography>
                    {item.speaker && (
                        <Typography variant="caption" style={styles.listSpeaker}>🗣️ {item.speaker}</Typography>
                    )}
                </View>
            </View>
        </View>
    );

    const DayTab = ({ idx, label, date }) => (
        <TouchableOpacity
            style={[styles.dayTab, selectedDayIndex === idx && styles.dayTabActive]}
            onPress={() => setSelectedDayIndex(idx)}
        >
            <Typography variant="h3" style={[styles.dayTabTitle, selectedDayIndex === idx && styles.dayTabTitleActive]}>
                {label}
            </Typography>
            <Typography variant="caption" style={[styles.dayTabDate, selectedDayIndex === idx && styles.dayTabDateActive]}>
                {date || ' '}
            </Typography>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="body">Buscando cronograma...</Typography>
                </View>
            </ScreenWrapper>
        );
    }

    if (!activeEvent || !activeEvent.days || activeEvent.days.length === 0) {
        return (
            <ScreenWrapper>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Typography variant="h3" style={{ textAlign: 'center', marginBottom: 10 }}>Nenhum treinamento ativo</Typography>
                    <Typography variant="body" style={{ textAlign: 'center', color: theme.colors.textSecondary }}>O administrador ainda não programou o cronograma da edição atual.</Typography>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Typography variant="h2">Agenda</Typography>
                    <Typography variant="body" style={{ color: theme.colors.textSecondary }}>{activeEvent.name || 'Edição Atual'}</Typography>
                </View>

                {/* Featured Carousel */}
                {featuredEvents.length > 0 && (
                    <>
                        <Typography variant="h3" style={styles.sectionTitle}>Principais Atrações</Typography>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
                            {featuredEvents.map((act, idx) => renderFeaturedItem(act, idx))}
                        </ScrollView>
                    </>
                )}

                {/* Full Schedule List */}
                <Typography variant="h3" style={[styles.sectionTitle, { marginTop: featuredEvents.length > 0 ? theme.spacing.l : 0 }]}>Cronograma Completo</Typography>

                {/* Day Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.m }} contentContainerStyle={{ gap: 8 }}>
                    {activeEvent.days.map((day, idx) => (
                        <DayTab key={idx} idx={idx} label={day.label || `Dia ${idx + 1}`} date={day.date} />
                    ))}
                </ScrollView>

                <View style={styles.listContainer}>
                    {dayEvents.length === 0 ? (
                        <Typography variant="body" style={{ textAlign: 'center', color: theme.colors.textSecondary, marginTop: 20 }}>Nenhuma atividade neste dia.</Typography>
                    ) : (
                        dayEvents.map((item, idx) => (
                            <View key={item.id || idx}>
                                {renderListItem({ item })}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: theme.spacing.xl,
    },
    header: {
        marginBottom: theme.spacing.m,
    },
    sectionTitle: {
        marginBottom: theme.spacing.m,
    },
    featuredScroll: {
        marginHorizontal: -theme.spacing.m,
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.s,
    },
    featuredCard: {
        width: width * 0.75,
        height: 180,
        marginRight: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    featuredImage: {
        width: '100%',
        height: '100%',
    },
    featuredOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
        padding: theme.spacing.m,
    },
    featuredTag: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    featuredTagText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 10,
    },
    featuredTitle: {
        color: '#FFF',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    featuredMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featuredMetaText: {
        color: '#EEE',
        marginLeft: 4,
        fontSize: 12,
    },
    listContainer: {
        marginTop: theme.spacing.s,
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: theme.spacing.m,
    },
    timeColumn: {
        alignItems: 'center',
        marginRight: theme.spacing.m,
        width: 50,
    },
    listTime: {
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    timeLine: {
        flex: 1,
        width: 2,
        backgroundColor: theme.colors.border,
        borderRadius: 1,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.s,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    listImage: {
        width: 60,
        height: 60,
        borderRadius: theme.borderRadius.s,
        backgroundColor: '#eee',
    },
    textContainer: {
        flex: 1,
        marginLeft: theme.spacing.m,
        justifyContent: 'center',
    },
    listTitle: {
        fontWeight: '600',
        fontSize: 15,
        marginBottom: 2,
    },
    listLocation: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 2,
    },
    listSpeaker: {
        color: theme.colors.secondary,
        fontSize: 12,
        fontWeight: '500',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginBottom: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: 4,
        gap: 8,
    },
    dayTab: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.s,
        backgroundColor: theme.colors.surface,
        minWidth: 100,
    },
    dayTabActive: {
        backgroundColor: theme.colors.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    dayTabTitle: {
        color: theme.colors.textSecondary,
        marginBottom: 0,
        fontWeight: '600',
    },
    dayTabTitleActive: {
        color: '#FFF',
    },
    dayTabDate: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    dayTabDateActive: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
});
