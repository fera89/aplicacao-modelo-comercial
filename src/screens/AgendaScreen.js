import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const MOCK_AGENDA = [
    // --- DIA 1 ---
    {
        id: '1',
        day: 1,
        time: '08:00',
        title: 'Credenciamento & Café',
        location: 'Hall de Entrada',
        description: 'Networking inicial e retirada de kits.',
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1000',
        featured: false
    },
    {
        id: '2',
        day: 1,
        time: '09:00',
        title: 'Abertura Oficial: O Futuro Regenerativo',
        location: 'Palco Principal',
        description: 'Boas-vindas com a diretoria e visão geral do evento.',
        speaker: 'Ana Silva (CEO)',
        image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=1000',
        featured: true
    },
    {
        id: '3',
        day: 1,
        time: '10:30',
        title: 'Painel: ESG na Prática Corporativa',
        location: 'Auditório Azul',
        description: 'Casos reais de implementação de governança ambiental.',
        speaker: 'Carlos Mendes & Lucia Ferreira',
        image: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=1000',
        featured: true
    },
    {
        id: '4',
        day: 1,
        time: '12:00',
        title: 'Almoço Sustentável (Plant-based)',
        location: 'Restaurante Central',
        description: 'Experiência gastronômica com ingredientes locais.',
        image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=1000',
        featured: false
    },
    // --- DIA 2 ---
    {
        id: '5',
        day: 2,
        time: '09:00',
        title: 'Workshop: Economia Circular',
        location: 'Sala de Vidro',
        description: 'Dinâmica prática para repensar processos produtivos.',
        image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1000',
        featured: true
    },
    {
        id: '6',
        day: 2,
        time: '11:00',
        title: 'Inovação Social & Tech',
        location: 'Auditório Azul',
        description: 'Como a tecnologia pode impulsionar impacto social.',
        speaker: 'Roberto Gomez',
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1000',
        featured: false
    },
    {
        id: '7',
        day: 2,
        time: '16:30',
        title: 'Encerramento & Happy Hour',
        location: 'Rooftop',
        description: 'Música ao vivo e coquetéis orgânicos.',
        image: 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?auto=format&fit=crop&q=80&w=1000',
        featured: true
    },
];

export const AgendaScreen = () => {
    const [selectedDay, setSelectedDay] = useState(1);
    const featuredEvents = MOCK_AGENDA.filter(item => item.featured);
    const dayEvents = MOCK_AGENDA.filter(item => item.day === selectedDay);

    const renderFeaturedItem = (item) => (
        <View key={item.id} style={styles.featuredCard}>
            <Image source={{ uri: item.image }} style={styles.featuredImage} resizeMode="cover" />
            <View style={styles.featuredOverlay}>
                <View style={styles.featuredTag}>
                    <Typography variant="caption" style={styles.featuredTagText}>Destaque • Dia {item.day}</Typography>
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

    const DayTab = ({ day, label, date }) => (
        <TouchableOpacity
            style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
            onPress={() => setSelectedDay(day)}
        >
            <Typography variant="h3" style={[styles.dayTabTitle, selectedDay === day && styles.dayTabTitleActive]}>
                {label}
            </Typography>
            <Typography variant="caption" style={[styles.dayTabDate, selectedDay === day && styles.dayTabDateActive]}>
                {date}
            </Typography>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Typography variant="h2">Agenda</Typography>
                    <Typography variant="body" style={{ color: theme.colors.textSecondary }}>Insight na Prática 2026</Typography>
                </View>

                {/* Featured Carousel */}
                <Typography variant="h3" style={styles.sectionTitle}>Principais Atrações</Typography>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
                    {featuredEvents.map(renderFeaturedItem)}
                </ScrollView>

                {/* Full Schedule List */}
                <Typography variant="h3" style={[styles.sectionTitle, { marginTop: theme.spacing.l }]}>Cronograma Completo</Typography>

                {/* Day Tabs */}
                <View style={styles.tabsContainer}>
                    <DayTab day={1} label="Dia 1" date="15 Out" />
                    <DayTab day={2} label="Dia 2" date="16 Out" />
                </View>

                <View style={styles.listContainer}>
                    {dayEvents.map((item) => (
                        <View key={item.id}>
                            {renderListItem({ item })}
                        </View>
                    ))}
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
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: theme.borderRadius.s,
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
