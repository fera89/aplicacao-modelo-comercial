import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { theme } from '../theme/Theme';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export const PermissionsScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(false);

    const requestPermissions = async () => {
        setLoading(true);
        try {
            // Location
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus !== 'granted') {
                Alert.alert('Atenção', 'Sem acesso à localização, algumas funcionalidades de mobilidade podem ser limitadas.');
            }

            // Notifications
            try {
                const { status: notifStatus } = await Notifications.requestPermissionsAsync();
                if (notifStatus === 'granted') {
                    console.log('Notifications permission granted');
                }
            } catch (notifError) {
                console.warn('Notifications permission request failed:', notifError);
            }

            // Navigate to Home regardless of result (don't block user)
            navigation.replace('MainTabs');

        } catch (error) {
            console.log('Error requesting permissions:', error);
            Alert.alert('Erro', 'Ocorreu um erro ao verificar permissões, mas vamos continuar.');
            navigation.replace('MainTabs'); // Fallback
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <Typography variant="h2" style={styles.title}>Quase lá!</Typography>
                <Typography variant="body" style={styles.description}>
                    Para uma experiência completa no App de Treinamento, precisamos de algumas permissões:
                </Typography>

                <View style={styles.permissionItem}>
                    <Typography variant="h3">📍 Localização</Typography>
                    <Typography variant="caption">Para calcular automaticamente a distância do seu deslocamento e emissões.</Typography>
                </View>

                <View style={styles.permissionItem}>
                    <Typography variant="h3">🔔 Notificações</Typography>
                    <Typography variant="caption">Para te avisar sobre o início das palestras e atualizações do treinamento.</Typography>
                </View>

                <Button title="Permitir e Continuar" onPress={requestPermissions} loading={loading} style={styles.button} />
                <Button title="Pular por enquanto" variant="secondary" onPress={() => navigation.replace('MainTabs')} style={styles.skipButton} />
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
    },
    title: {
        textAlign: 'center',
        marginBottom: theme.spacing.m,
    },
    description: {
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
        color: theme.colors.textSecondary,
    },
    permissionItem: {
        marginBottom: theme.spacing.l,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    button: {
        marginTop: theme.spacing.l,
    },
    skipButton: {
        marginTop: theme.spacing.s,
        borderWidth: 0,
    }
});
