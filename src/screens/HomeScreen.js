import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Linking, Animated, Dimensions } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db } from '../services/firebaseConfig';
import { collection, query, where, limit, orderBy, onSnapshot } from 'firebase/firestore';

const SPONSOR_LOGO_SIZE = 80;
const SPONSOR_GAP = 16;

export const HomeScreen = ({ navigation }) => {
    const { user } = useApp();
    const [nextActivity, setNextActivity] = React.useState(null);
    const [eventName, setEventName] = React.useState('Aguardando evento...');
    const [highlights, setHighlights] = React.useState([]);
    const [sponsors, setSponsors] = React.useState([]);
    const [selectedHighlight, setSelectedHighlight] = React.useState(null);
    const [selectedSponsor, setSelectedSponsor] = React.useState(null);

    const [totalEventCarbon, setTotalEventCarbon] = React.useState(0);
    const [myCarbon, setMyCarbon] = React.useState(0);

    const sponsorScrollRef = useRef(null);

    React.useEffect(() => {
        const q = query(collection(db, "events"), where("isActive", "==", true), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const eventData = snapshot.docs[0].data();
                setEventName(eventData.name || 'Edição Atual');
                let firstFeat = null;
                let firstAct = null;
                if (eventData.days) {
                    for (const day of eventData.days) {
                        if (day.schedule && day.schedule.length > 0) {
                            if (!firstAct) firstAct = day.schedule[0];
                            const feat = day.schedule.find(a => a.featured);
                            if (feat && !firstFeat) firstFeat = feat;
                        }
                    }
                }
                setNextActivity(firstFeat || firstAct || null);
            } else {
                setEventName('Nenhum evento ativo');
                setNextActivity(null);
            }
        });

        const unsubscribeESG = onSnapshot(collection(db, "esg_responses"), (snapshot) => {
            let sum = 0;
            let mySum = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                const val = data.carbonAvoidedKg || 0;
                sum += val;
                if (user && doc.id === user.id) mySum = val;
            });
            setTotalEventCarbon(sum);
            setMyCarbon(mySum);
        });

        const qHighlights = query(collection(db, "highlights"), orderBy("order", "asc"));
        const unsubHighlights = onSnapshot(qHighlights, (snapshot) => {
            const items = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
            setHighlights(items);
        });

        const qSponsors = query(collection(db, "sponsors"), orderBy("order", "asc"));
        const unsubSponsors = onSnapshot(qSponsors, (snapshot) => {
            const items = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
            setSponsors(items);
        });

        return () => {
            unsubscribe();
            unsubscribeESG();
            unsubHighlights();
            unsubSponsors();
        };
    }, [user?.id]);

    // Auto-scroll sponsors cyclically
    useEffect(() => {
        if (sponsors.length < 2) return;
        const totalWidth = sponsors.length * (SPONSOR_LOGO_SIZE + SPONSOR_GAP);
        let offset = 0;
        const interval = setInterval(() => {
            offset += 1;
            if (offset >= totalWidth) offset = 0;
            if (sponsorScrollRef.current) {
                sponsorScrollRef.current.scrollTo({ x: offset, animated: false });
            }
        }, 30);
        return () => clearInterval(interval);
    }, [sponsors]);

    // Duplicate once for seamless loop
    const displaySponsors = sponsors.length > 0 ? [...sponsors, ...sponsors] : [];

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Typography variant="h2" style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Participante'}!</Typography>
                        <Typography variant="body" style={styles.date}>15 de Outubro, 2026</Typography>
                    </View>
                    <TouchableOpacity style={styles.miniStatsConfig} onPress={() => navigation.navigate('ESGCheckInEdit', { isEditing: true })}>
                        <View style={styles.miniStatItem}>
                            <Ionicons name="leaf" size={16} color={theme.colors.primary} />
                            <Typography variant="caption" style={styles.miniStatValue}>{myCarbon?.toFixed(1) || '0.0'}kg</Typography>
                        </View>
                        <Typography variant="caption" style={{ fontSize: 10, color: theme.colors.primary, marginTop: 4, textAlign: 'center' }}>Refazer Checkin</Typography>
                    </TouchableOpacity>
                </View>

                {/* ESG Banner */}
                <View style={styles.esgBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="earth" size={24} color="#FFF" />
                        <Typography variant="h3" style={{ color: '#FFF', marginLeft: 8, marginBottom: 0 }}>Impacto do Evento</Typography>
                    </View>
                    <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>
                        Total de emissão de Carbono (CO₂) evitada pelos participantes até o momento:
                    </Typography>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Typography variant="h1" style={{ color: '#FFF', fontSize: 36, marginBottom: 0 }}>{totalEventCarbon.toFixed(1)}</Typography>
                            <Typography variant="body" style={{ color: '#FFF', marginLeft: 4 }}>kg/CO₂</Typography>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>Sua colaboração:</Typography>
                            <Typography variant="body" style={{ color: '#FFF', fontWeight: 'bold' }}>{myCarbon.toFixed(1)} kg</Typography>
                        </View>
                    </View>
                </View>

                {/* Next Activity */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Typography variant="h3">Eventos: {eventName}</Typography>
                        <TouchableOpacity onPress={() => navigation.navigate('Agenda')}>
                            <Typography variant="caption" style={styles.seeAll}>Ver agenda</Typography>
                        </TouchableOpacity>
                    </View>
                    {nextActivity ? (
                        <View style={styles.activityCard}>
                            <View style={styles.timeTag}>
                                <Typography variant="caption" style={styles.timeText}>{nextActivity.time || '--:--'}</Typography>
                            </View>
                            <View style={styles.activityContent}>
                                <Typography variant="body" style={styles.activityTitle}>{nextActivity.title}</Typography>
                                <Typography variant="caption" style={styles.activityLocation}>📍 {nextActivity.location || 'Local a definir'}</Typography>
                            </View>
                        </View>
                    ) : (
                        <View style={[styles.activityCard, { justifyContent: 'center', paddingVertical: 24 }]}>
                            <Typography variant="body" style={{ color: theme.colors.textSecondary }}>Nenhuma atividade programada ainda.</Typography>
                        </View>
                    )}
                </View>

                {/* Highlights (Destaques) */}
                <View style={styles.section}>
                    <Typography variant="h3" style={styles.sectionTitle}>Destaques</Typography>
                    {highlights.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsContainer}>
                            {highlights.map((item) => (
                                <TouchableOpacity key={item.id} style={styles.highlightCard} onPress={() => setSelectedHighlight(item)}>
                                    {item.imageUrl ? (
                                        <Image source={{ uri: item.imageUrl }} style={styles.highlightImage} />
                                    ) : (
                                        <View style={styles.highlightImagePlaceholder} />
                                    )}
                                    <Typography variant="caption" style={styles.highlightText} numberOfLines={2}>{item.title}</Typography>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>Nenhum destaque disponível.</Typography>
                    )}
                </View>

                {/* Sponsors / Apoiadores */}
                <View style={styles.section}>
                    <Typography variant="h3" style={styles.sectionTitle}>Apoiadores</Typography>
                    {displaySponsors.length > 0 ? (
                        <ScrollView
                            ref={sponsorScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            scrollEnabled={true}
                            style={{ marginHorizontal: -theme.spacing.m, paddingHorizontal: theme.spacing.m }}
                        >
                            {displaySponsors.map((item, index) => (
                                <TouchableOpacity
                                    key={`${item.id}_${index}`}
                                    style={styles.sponsorItem}
                                    onPress={() => setSelectedSponsor(item)}
                                >
                                    {item.logoUrl ? (
                                        <Image source={{ uri: item.logoUrl }} style={styles.sponsorLogo} resizeMode="contain" />
                                    ) : (
                                        <View style={[styles.sponsorLogo, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Typography variant="caption" style={{ color: '#aaa', fontSize: 10 }}>{item.name?.charAt(0)}</Typography>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>Nenhum apoiador cadastrado.</Typography>
                    )}
                </View>

            </ScrollView>

            {/* Highlight Detail Modal */}
            <Modal visible={!!selectedHighlight} transparent animationType="slide" onRequestClose={() => setSelectedHighlight(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedHighlight(null)}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        {selectedHighlight?.imageUrl && (
                            <Image source={{ uri: selectedHighlight.imageUrl }} style={styles.modalImage} />
                        )}
                        <Typography variant="h3" style={{ marginBottom: 8 }}>{selectedHighlight?.title}</Typography>
                        <Typography variant="body" style={{ color: theme.colors.textSecondary, marginBottom: 20, lineHeight: 22 }}>
                            {selectedHighlight?.description || 'Sem descrição.'}
                        </Typography>
                        {selectedHighlight?.linkUrl ? (
                            <Button
                                title="Abrir Link ↗"
                                onPress={() => Linking.openURL(selectedHighlight.linkUrl)}
                                style={{ backgroundColor: theme.colors.primary }}
                            />
                        ) : null}
                    </View>
                </View>
            </Modal>

            {/* Sponsor Detail Modal */}
            <Modal visible={!!selectedSponsor} transparent animationType="slide" onRequestClose={() => setSelectedSponsor(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedSponsor(null)}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        {selectedSponsor?.logoUrl && (
                            <Image source={{ uri: selectedSponsor.logoUrl }} style={styles.sponsorModalLogo} resizeMode="contain" />
                        )}
                        <Typography variant="h3" style={{ marginBottom: 8, textAlign: 'center' }}>{selectedSponsor?.name}</Typography>
                        <Typography variant="body" style={{ color: theme.colors.textSecondary, marginBottom: 20, lineHeight: 22, textAlign: 'center' }}>
                            {selectedSponsor?.description || 'Sem informações adicionais.'}
                        </Typography>
                        {selectedSponsor?.website ? (
                            <Button
                                title="Visitar Site ↗"
                                onPress={() => Linking.openURL(selectedSponsor.website)}
                                style={{ backgroundColor: theme.colors.primary }}
                            />
                        ) : null}
                    </View>
                </View>
            </Modal>

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
    esgBanner: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.l,
        marginBottom: theme.spacing.xl,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
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
        backgroundColor: theme.colors.background,
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
        marginHorizontal: -theme.spacing.m,
        paddingHorizontal: theme.spacing.m,
    },
    highlightCard: {
        width: 160,
        marginRight: theme.spacing.m,
    },
    highlightImage: {
        width: '100%',
        height: 110,
        borderRadius: theme.borderRadius.s,
        marginBottom: 8,
        backgroundColor: '#e0e0e0',
    },
    highlightImagePlaceholder: {
        width: '100%',
        height: 110,
        backgroundColor: '#e0e0e0',
        borderRadius: theme.borderRadius.s,
        marginBottom: 8,
    },
    highlightText: {
        textAlign: 'center',
        fontWeight: '500',
    },
    sponsorItem: {
        width: SPONSOR_LOGO_SIZE,
        height: SPONSOR_LOGO_SIZE,
        marginRight: SPONSOR_GAP,
        borderRadius: theme.borderRadius.s,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    sponsorLogo: {
        width: SPONSOR_LOGO_SIZE - 16,
        height: SPONSOR_LOGO_SIZE - 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 16,
        maxHeight: '80%',
    },
    modalClose: {
        alignSelf: 'flex-end',
        padding: 8,
        marginBottom: 8,
    },
    modalImage: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        marginBottom: 16,
        backgroundColor: '#f0f0f0',
    },
    sponsorModalLogo: {
        width: 120,
        height: 80,
        alignSelf: 'center',
        marginBottom: 16,
    },
});
