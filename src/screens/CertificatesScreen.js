import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import { FirebaseService } from '../services/FirebaseService';
import Ionicons from '@expo/vector-icons/Ionicons';

export const CertificatesScreen = ({ navigation }) => {
    const { user } = useApp();
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCertificates();
    }, []);

    const loadCertificates = async () => {
        if (!user?.id) { setLoading(false); return; }
        try {
            const certs = await FirebaseService.getUserCertificates(user.id);
            setCertificates(certs);
        } catch (e) {
            console.error('Error loading certificates', e);
        } finally {
            setLoading(false);
        }
    };

    const getStatus = (cert) => {
        if (!cert.expiresAt) return { label: 'Ativo', color: theme.colors.success, icon: 'checkmark-circle' };
        const expires = new Date(cert.expiresAt);
        const now = new Date();
        const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) return { label: 'Expirado', color: theme.colors.error, icon: 'close-circle' };
        if (daysLeft < 30) return { label: `Expira em ${daysLeft}d`, color: '#F59E0B', icon: 'warning' };
        return { label: 'Ativo', color: theme.colors.success, icon: 'checkmark-circle' };
    };

    const renderCertificate = ({ item }) => {
        const status = getStatus(item);
        const issueDate = item.issuedAt ? new Date(item.issuedAt).toLocaleDateString('pt-BR') : '-';

        return (
            <TouchableOpacity
                style={styles.certCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Certificate', {
                    certificationId: item.certificationId,
                    certificateData: item,
                })}
            >
                <View style={styles.certIcon}>
                    <Ionicons name="ribbon" size={32} color={theme.colors.primary} />
                </View>

                <View style={styles.certInfo}>
                    <Text style={styles.certName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.certMeta}>Nota: {item.score}% • Emitido: {issueDate}</Text>

                    <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
                        <Ionicons name={status.icon} size={14} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🎓 Certificados</Text>
                <Text style={styles.headerSubtitle}>{certificates.length} certificado(s) obtido(s)</Text>
            </View>

            <FlatList
                data={certificates}
                renderItem={renderCertificate}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="school-outline" size={64} color={theme.colors.border} />
                        <Text style={styles.emptyTitle}>Nenhum certificado ainda</Text>
                        <Text style={styles.emptySubtitle}>
                            Complete cursos e provas para obter seus certificados digitais.
                        </Text>
                        <TouchableOpacity
                            style={styles.goToCoursesBtn}
                            onPress={() => navigation.navigate('Cursos')}
                        >
                            <Text style={styles.goToCoursesBtnText}>Ver Cursos Disponíveis</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
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
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    certCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    certIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(46, 125, 50, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    certInfo: {
        flex: 1,
    },
    certName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    certMeta: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 6,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    goToCoursesBtn: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
    },
    goToCoursesBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
