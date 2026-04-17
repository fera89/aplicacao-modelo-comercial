import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import { FirebaseService } from '../services/FirebaseService';
import Ionicons from '@expo/vector-icons/Ionicons';
import { auth } from '../services/firebaseConfig';

export const ProfileScreen = ({ navigation }) => {
    const { user, logout, refreshUser } = useApp();
    const [certificates, setCertificates] = useState([]);

    useEffect(() => {
        loadCertificates();
    }, []);

    const loadCertificates = async () => {
        if (!user?.id) return;
        try {
            const certs = await FirebaseService.getUserCertificates(user.id);
            setCertificates(certs);
        } catch (e) {
            console.error('Error loading certificates', e);
        }
    };

    const handleLogout = () => {
        Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await auth.signOut();
                        logout();
                    } catch (e) {
                        console.error('Error signing out', e);
                    }
                }
            }
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Perfil</Text>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {user?.photoURL ? (
                        <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
                        </View>
                    )}
                    <Text style={styles.userName}>{user?.name || 'Vendedor'}</Text>
                    <Text style={styles.userEmail}>{user?.email || ''}</Text>
                    {user?.phone ? (
                        <Text style={styles.userPhone}>{user.phone}</Text>
                    ) : null}
                </View>

                {/* Stats Summary */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{certificates.length}</Text>
                        <Text style={styles.statLabel}>Certificados</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{user?.coursesCompleted || 0}</Text>
                        <Text style={styles.statLabel}>Cursos</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{user?.totalPoints || 0}</Text>
                        <Text style={styles.statLabel}>Pontos</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}>
                            <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.menuText}>Editar Perfil</Text>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, { backgroundColor: 'rgba(21, 101, 192, 0.1)' }]}>
                            <Ionicons name="notifications-outline" size={20} color={theme.colors.secondary} />
                        </View>
                        <Text style={styles.menuText}>Notificações</Text>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={[styles.menuIcon, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
                            <Ionicons name="help-circle-outline" size={20} color="#DAA520" />
                        </View>
                        <Text style={styles.menuText}>Ajuda & Suporte</Text>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
                    <Text style={styles.logoutText}>Sair da Conta</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Versão 1.0.1</Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    scroll: {
        flex: 1,
    },
    profileCard: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: theme.colors.surface,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
    },
    avatarPlaceholder: {
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 12,
    },
    userEmail: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    userPhone: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        marginTop: 1,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: theme.colors.border,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    menuSection: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        fontWeight: '500',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(211, 47, 47, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(211, 47, 47, 0.2)',
        gap: 8,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.error,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 24,
    },
});
