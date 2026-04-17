import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { theme } from '../theme/Theme';
import { db } from '../services/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export const CertificationsListScreen = () => {
    const navigation = useNavigation();
    const [certifications, setCertifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'certifications'), where('active', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(doc => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setCertifications(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CertificationTest', {
                certificationId: item.id,
                certificationName: item.name,
                minScore: item.minScore || 70,
                orientations: item.orientations || null
            })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name="ribbon-outline" size={24} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="school" size={28} color={theme.colors.primary} />
                <Text style={styles.title}>Certificações</Text>
            </View>
            <Text style={styles.subtitle}>Explore trilhas de aprendizado e obtenha novas certificações.</Text>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : certifications.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="information-circle-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>Nenhuma certificação disponível no momento.</Text>
                </View>
            ) : (
                <FlatList
                    data={certifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        paddingHorizontal: 20,
        marginBottom: 20,
        marginTop: 4,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 16,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
