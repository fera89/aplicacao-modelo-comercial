import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export const AuthScreen = ({ navigation }) => {
    const { login } = useApp();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    // ... form state ...
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [instagram, setInstagram] = useState('');


    // Hardcoded Proxy URI (Fixed per user request)
    const redirectUri = 'https://auth.expo.io/@fera89/AppINP';

    // Google Auth Request
    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: '757016188722-f0plmkahdq80lgsc5s6cj6t21160e398.apps.googleusercontent.com',
        androidClientId: '757016188722-f0plmkahdq80lgsc5s6cj6t21160e398.apps.googleusercontent.com',
        redirectUri: redirectUri
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            handleGoogleSignIn(credential);
        }
    }, [response]);

    const handleGoogleSignIn = async (credential) => {
        setLoading(true);
        console.log('Handling Google Sign-In...');
        try {
            const userCredential = await signInWithCredential(auth, credential);
            const uid = userCredential.user.uid;
            console.log('Google Sign-In Success:', uid);

            // Check if user exists in Firestore
            const userRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                // Update last login
                await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
                login({ id: uid, ...userDoc.data() });
            } else {
                // New User via Google - Create FULL profile
                const userData = {
                    id: uid,
                    email: userCredential.user.email,
                    name: userCredential.user.displayName || 'Usuário Google',
                    photoUrl: userCredential.user.photoURL,
                    role: 'user', // Default role
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    authProvider: 'google',
                    stats: {
                        points: 0,
                        surveysCompleted: 0,
                        activitiesJoined: 0
                    },
                    preferences: {
                        notifications: true
                    }
                };

                await setDoc(userRef, userData);
                login(userData);
            }

        } catch (error) {
            console.error('Google Auth Error:', error);
            Alert.alert('Erro Google', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha email e senha.');
            return;
        }

        console.log('Starting Auth Process...', { isLogin, email }); // Debug Log
        setLoading(true);
        try {
            let userCredential;
            if (isLogin) {
                // Login
                console.log('Attempting SignIn...');
                userCredential = await signInWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;
                console.log('SignIn UserID:', uid);

                // Fetch profile
                console.log('Fetching User Profile...');
                const userRef = doc(db, 'users', uid);
                const fetchProfile = getDoc(userRef);
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore Read Timeout: Verifique sua internet ou Regras de Segurança')), 10000));

                const userDoc = await Promise.race([fetchProfile, timeout]);
                console.log('Profile Fetched:', userDoc.exists());

                if (userDoc.exists()) {
                    // Update last login
                    await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
                    login({ id: uid, ...userDoc.data() });
                } else {
                    // Fallback if doc is missing (shouldn't happen often)
                    login({ id: uid, email: userCredential.user.email });
                }
            } else {
                // Sign Up
                if (!name) {
                    Alert.alert('Erro', 'Nome é obrigatório para cadastro.');
                    setLoading(false);
                    return;
                }

                console.log('Attempting CreateUser...');
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;
                console.log('Created UserID:', uid);

                const userData = {
                    id: uid,
                    email,
                    name,
                    phone,
                    address,
                    instagram,
                    role: 'user', // Default role
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    authProvider: 'email',
                    stats: {
                        points: 0,
                        surveysCompleted: 0,
                        activitiesJoined: 0
                    },
                    preferences: {
                        notifications: true
                    }
                };

                // Persist extended profile
                console.log('Persisting User Profile...');
                const saveProfile = setDoc(doc(db, 'users', uid), userData);
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore Connection Timeout: Verifique sua internet ou Regras de Segurança')), 10000));

                await Promise.race([saveProfile, timeout]);
                console.log('Profile Persisted');

                login(userData);
            }
        } catch (error) {
            console.error('Auth Error:', error);
            if (error.message.includes('Timeout') || error.code === 'unavailable') {
                Alert.alert(
                    'Erro de Conexão',
                    'Não foi possível salvar/carregar seu perfil no banco de dados. Deseja continuar mesmo assim? (Modo Offline)',
                    [
                        { text: 'Tentar Novamente', style: 'cancel' },
                        {
                            text: 'Continuar Offline',
                            onPress: () => {
                                // Fallback login with basic data
                                const uid = auth.currentUser?.uid || 'offline-id';
                                login({ id: uid, email, name: name || 'Usuário Offline' });
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Erro de Autenticação', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Typography variant="h2" style={styles.title}>{isLogin ? 'Login' : 'Criar Conta'}</Typography>

                {!isLogin && (
                    <>
                        <View style={styles.formGroup}>
                            <Typography variant="body" style={styles.label}>Nome Completo</Typography>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={theme.colors.textSecondary} />
                        </View>
                        <View style={styles.formGroup}>
                            <Typography variant="body" style={styles.label}>Telefone</Typography>
                            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="(XX) XXXXX-XXXX" keyboardType="phone-pad" placeholderTextColor={theme.colors.textSecondary} />
                        </View>
                        <View style={styles.formGroup}>
                            <Typography variant="body" style={styles.label}>Endereço</Typography>
                            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Sua cidade/estado" placeholderTextColor={theme.colors.textSecondary} />
                        </View>
                        <View style={styles.formGroup}>
                            <Typography variant="body" style={styles.label}>Instagram (Opcional)</Typography>
                            <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} placeholder="@seuusuario" autoCapitalize="none" placeholderTextColor={theme.colors.textSecondary} />
                        </View>
                    </>
                )}

                <View style={styles.formGroup}>
                    <Typography variant="body" style={styles.label}>Email</Typography>
                    <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@exemplo.com" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={theme.colors.textSecondary} />
                </View>

                <View style={styles.formGroup}>
                    <Typography variant="body" style={styles.label}>Senha</Typography>
                    <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="******" secureTextEntry placeholderTextColor={theme.colors.textSecondary} />
                </View>

                <Button
                    title={isLogin ? "Entrar" : "Cadastrar"}
                    onPress={handleAuth}
                    loading={loading}
                    style={styles.mainButton}
                />

                {/* 
                <Button
                    title="Entrar com Google"
                    variant="secondary"
                    onPress={() => promptAsync()}
                    disabled={!request}
                    style={styles.googleButton}
                /> 
                */}

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleContainer}>
                    <Typography variant="body" style={styles.toggleText}>
                        {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                    </Typography>
                </TouchableOpacity>

            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scroll: {
        paddingBottom: theme.spacing.xl,
    },
    title: {
        marginBottom: theme.spacing.l,
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: theme.spacing.m,
    },
    label: {
        marginBottom: theme.spacing.xs,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.s,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
    },
    mainButton: {
        marginTop: theme.spacing.m,
    },
    googleButton: {
        marginTop: theme.spacing.s,
    },
    toggleContainer: {
        marginTop: theme.spacing.l,
        alignItems: 'center',
    },
    toggleText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    }
});
