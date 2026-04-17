import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../theme/Theme';
import { FirebaseService } from '../services/FirebaseService';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

export const ComplianceScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { certificationId, certificationName } = route.params || {};

    const [rules, setRules] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRules();
    }, [certificationId]);

    const loadRules = async () => {
        try {
            const data = await FirebaseService.getCertificationRules(certificationId);
            if (data) {
                setRules(data);
            } else {
                setRules({
                    canSay: 'Nenhum conteúdo definido ainda.',
                    cannotSay: '',
                    mutualism: '',
                    promises: ''
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Carregando Apostila...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Ionicons name="book" size={32} color={theme.colors.primary} />
                <Text style={styles.title} numberOfLines={1}>{certificationName || 'Compliance'}</Text>
            </View>
            <Text style={styles.subtitle}>{rules?.description || 'Estudo recomendado antes de realizar a prova de certificação.'}</Text>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.success }]}>
                        <Ionicons name="checkmark-circle" size={20} /> O que PODE falar
                    </Text>
                    <Text style={styles.sectionText}>{rules?.canSay || '-'}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>
                        <Ionicons name="close-circle" size={20} /> O que NÃO PODE falar
                    </Text>
                    <Text style={styles.sectionText}>{rules?.cannotSay || '-'}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="people" size={20} /> Como explicar o Mutualismo
                    </Text>
                    <Text style={styles.sectionText}>{rules?.mutualism || '-'}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="warning" size={20} /> Como evitar Promessa Indevida
                    </Text>
                    <Text style={styles.sectionText}>{rules?.promises || rules?.guidelines || '-'}</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('CertificationTest', { certificationId, certificationName })}
                >
                    <Text style={styles.primaryButtonText}>Ir para a Prova de Certificação</Text>
                    <Ionicons name="arrow-forward" size={20} color={theme.colors.surface} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: 12,
        color: theme.colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 10,
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
    },
    scroll: {
        flex: 1,
        paddingHorizontal: 20,
    },
    section: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionText: {
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 22,
    },
    footer: {
        padding: 20,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: theme.colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
