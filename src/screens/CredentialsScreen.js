import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, TextInput, Switch, Linking } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import QRCode from 'react-native-qrcode-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { storage, db } from '../services/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

const AVATARS = [
    'https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-person-with-pink-hair_23-2149436186.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-business-man-with-glasses_23-2149436194.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-person-with-long-hair_23-2149436197.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-person-with-glasses_23-2149436190.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-business-woman-with-glasses_23-2149436193.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-teenager-with-funny-face-glasses_23-2149436185.jpg',
    'https://img.freepik.com/free-psd/3d-illustration-bald-person_23-2149436183.jpg'
];

const BACKGROUND_COLORS = [
    theme.colors.primary, // Default Green
    '#2c3e50', // Dark Blue
    '#8e44ad', // Purple
    '#e67e22', // Orange
    '#c0392b', // Red
    '#16a085'  // Teal
];

export const CredentialsScreen = () => {
    const { user, login } = useApp();
    const [selectedAvatar, setSelectedAvatar] = useState(user?.photoURL || AVATARS[0]);
    const [selectedBg, setSelectedBg] = useState(user?.badgeColor || theme.colors.primary);
    const [uploading, setUploading] = useState(false);

    // Social Links State
    const [socials, setSocials] = useState({
        linkedin: user?.social?.linkedin || '',
        instagram: user?.social?.instagram || '',
        whatsapp: user?.social?.whatsapp || ''
    });

    // Privacy State
    const [privacy, setPrivacy] = useState({
        linkedin: user?.privacy?.linkedin ?? true, // Default public
        instagram: user?.privacy?.instagram ?? true,
        whatsapp: user?.privacy?.whatsapp ?? false // Default private
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Update local state if user context updates from elsewhere
        if (user) {
            setSelectedAvatar(user.photoURL || AVATARS[0]);
            setSelectedBg(user.badgeColor || theme.colors.primary);
            setSocials({
                linkedin: user.social?.linkedin || '',
                instagram: user.social?.instagram || '',
                whatsapp: user.social?.whatsapp || ''
            });
            setPrivacy({
                linkedin: user.privacy?.linkedin ?? true,
                instagram: user.privacy?.instagram ?? true,
                whatsapp: user.privacy?.whatsapp ?? false
            });
        }
    }, [user]);

    const handleAvatarSelect = async (uri) => {
        setSelectedAvatar(uri);
        // If it's one of the default avatars, we just update the user profile with the URL
        if (AVATARS.includes(uri)) {
            await updateField('photoURL', uri);
        }
    };

    const handleBgSelect = async (color) => {
        setSelectedBg(color);
        await updateField('badgeColor', color);
    };

    const updateField = async (field, value) => {
        if (!user?.id) return;
        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { [field]: value });
            login({ ...user, [field]: value });
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
        }
    };

    const saveSocials = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                social: socials,
                privacy: privacy
            });
            login({ ...user, social: socials, privacy: privacy });
            Alert.alert("Sucesso", "Perfil atualizado!");
        } catch (error) {
            console.error("Error saving socials:", error);
            Alert.alert("Erro", "Falha ao salvar perfil.");
        } finally {
            setSaving(false);
        }
    };

    const uploadImage = async (uri) => {
        if (!user?.id) return;
        setUploading(true);
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const filename = `profile_photos/${user.id}_${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            setSelectedAvatar(downloadURL);
            await updateField('photoURL', downloadURL);
            Alert.alert("Sucesso", "Foto de perfil atualizada!");
        } catch (error) {
            console.error("Upload error:", error);
            Alert.alert("Erro", "Falha ao enviar imagem.");
        } finally {
            setUploading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para mudar a foto.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            await uploadImage(result.assets[0].uri);
        }
    };

    // Allow taking a photo directly
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à sua câmera.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            await uploadImage(result.assets[0].uri);
        }
    }

    const showImageOptions = () => {
        Alert.alert(
            "Alterar Foto",
            "Escolha uma opção",
            [
                { text: "Galeria", onPress: pickImage },
                { text: "Câmera", onPress: takePhoto },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    return (
        <ScreenWrapper style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Typography variant="h2" style={styles.headerTitle}>Sua Credencial</Typography>

                {/* Badge Card */}
                <View style={styles.badgeContainer}>
                    {/* Customizable Background Header */}
                    <View style={[styles.badgeHeader, { backgroundColor: selectedBg }]}>
                        <View style={styles.hole} />
                        <Typography variant="h3" style={styles.eventName}>INSIGHT 2026</Typography>
                        <Typography variant="caption" style={styles.eventDate}>15-17 OUTUBRO • SÃO PAULO</Typography>
                    </View>

                    {/* Avatar Section - Adjusted to fix overlap */}
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarWrapper}>
                            {uploading ? (
                                <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee' }]}>
                                    <ActivityIndicator color={theme.colors.primary} />
                                </View>
                            ) : selectedAvatar ? (
                                <Image source={{ uri: selectedAvatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ddd' }]}>
                                    <Ionicons name="person" size={50} color="#999" />
                                </View>
                            )}
                            <TouchableOpacity style={styles.editIcon} onPress={showImageOptions}>
                                <Ionicons name="camera" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.userInfo}>
                        <Typography variant="h2" style={styles.userName}>{user?.name || 'Participante'}</Typography>
                        <Typography variant="body" style={styles.userRole}>{user?.role?.toUpperCase() || 'PARTICIPANTE'}</Typography>
                    </View>

                    <View style={styles.qrSection}>
                        <View style={styles.qrBorder}>
                            <QRCode
                                value={user?.id || 'guest'}
                                size={140}
                                color="#000"
                                backgroundColor="#FFF"
                            />
                        </View>
                        <Typography variant="caption" style={styles.qrInstruction}>Apresente este código na entrada</Typography>
                    </View>
                </View>

                {/* Customization Options */}
                <View style={styles.customizationSection}>

                    {/* Background Selector */}
                    <Typography variant="h3" style={styles.selectorTitle}>Personalizar Crachá</Typography>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bgSelector}>
                        {BACKGROUND_COLORS.map((color, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleBgSelect(color)}
                                style={[styles.bgOption, { backgroundColor: color }, selectedBg === color && styles.selectedBg]}
                            >
                                {selectedBg === color && <Ionicons name="checkmark" size={20} color="#FFF" />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Avatar Selector */}
                    <View style={styles.avatarHeaderRow}>
                        <Typography variant="body" style={{ fontWeight: 'bold' }}>Avatar</Typography>
                        <TouchableOpacity onPress={showImageOptions} style={styles.uploadButton}>
                            <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.primary} />
                            <Typography variant="caption" style={{ color: theme.colors.primary, marginLeft: 4 }}>Upload</Typography>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarScroll}>
                        {AVATARS.map((uri, index) => (
                            <TouchableOpacity key={index} onPress={() => handleAvatarSelect(uri)} style={[styles.avatarOption, selectedAvatar === uri && styles.selectedAvatar]}>
                                <Image source={{ uri }} style={styles.avatarThumb} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.divider} />

                {/* Social Links Form */}
                <View style={styles.formSection}>
                    <Typography variant="h3" style={styles.sectionHeader}>Meu Networking</Typography>
                    <Typography variant="caption" style={styles.sectionSubHeader}>Adicione seus links para que outros participantes possam te encontrar.</Typography>

                    {/* LinkedIn */}
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Ionicons name="logo-linkedin" size={20} color="#0077b5" />
                            <Typography variant="body" style={styles.inputLabel}>LinkedIn Profile URL</Typography>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="https://linkedin.com/in/seu-perfil"
                            value={socials.linkedin}
                            onChangeText={(text) => setSocials({ ...socials, linkedin: text })}
                            autoCapitalize="none"
                        />
                        <View style={styles.privacyRow}>
                            <Typography variant="caption" style={styles.privacyText}>
                                {privacy.linkedin ? 'Público (Visível no QR Code)' : 'Privado (Apenas conexões)'}
                            </Typography>
                            <Switch
                                trackColor={{ false: "#767577", true: theme.colors.primary }}
                                thumbColor={privacy.linkedin ? "#f4f3f4" : "#f4f3f4"}
                                onValueChange={(val) => setPrivacy({ ...privacy, linkedin: val })}
                                value={privacy.linkedin}
                            />
                        </View>
                    </View>

                    {/* Instagram */}
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Ionicons name="logo-instagram" size={20} color="#e1306c" />
                            <Typography variant="body" style={styles.inputLabel}>Instagram Username</Typography>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="@seu.usuario"
                            value={socials.instagram}
                            onChangeText={(text) => setSocials({ ...socials, instagram: text })}
                            autoCapitalize="none"
                        />
                        <View style={styles.privacyRow}>
                            <Typography variant="caption" style={styles.privacyText}>
                                {privacy.instagram ? 'Público' : 'Privado'}
                            </Typography>
                            <Switch
                                trackColor={{ false: "#767577", true: theme.colors.primary }}
                                onValueChange={(val) => setPrivacy({ ...privacy, instagram: val })}
                                value={privacy.instagram}
                            />
                        </View>
                    </View>

                    {/* WhatsApp */}
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                            <Typography variant="body" style={styles.inputLabel}>WhatsApp</Typography>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="+55 (11) 99999-9999"
                            value={socials.whatsapp}
                            onChangeText={(text) => setSocials({ ...socials, whatsapp: text })}
                            keyboardType="phone-pad"
                        />
                        <View style={styles.privacyRow}>
                            <Typography variant="caption" style={styles.privacyText}>
                                {privacy.whatsapp ? 'Público' : 'Privado (Recomendado)'}
                            </Typography>
                            <Switch
                                trackColor={{ false: "#767577", true: theme.colors.primary }}
                                onValueChange={(val) => setPrivacy({ ...privacy, whatsapp: val })}
                                value={privacy.whatsapp}
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={saveSocials} disabled={saving}>
                        {saving ? <ActivityIndicator color="#FFF" /> : <Typography variant="h3" style={{ color: '#FFF' }}>Salvar Alterações</Typography>}
                    </TouchableOpacity>

                </View>

            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    scroll: {
        alignItems: 'center',
        paddingBottom: 60,
        width: '100%',
    },
    headerTitle: {
        marginBottom: 20,
    },
    badgeContainer: {
        width: 320,
        backgroundColor: '#FFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
        marginBottom: 30,
    },
    badgeHeader: {
        width: '100%',
        paddingVertical: 25,
        paddingHorizontal: 20,
        alignItems: 'center',
        paddingBottom: 45, // Extra padding for avatar overlap
        position: 'relative',
    },
    hole: {
        width: 60,
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 4,
        position: 'absolute',
        top: 12,
    },
    eventName: {
        color: '#FFF',
        fontWeight: '900',
        letterSpacing: 2,
        fontSize: 18,
    },
    eventDate: {
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
        fontWeight: '600',
    },
    avatarContainer: {
        alignItems: 'center',
        marginTop: -40, // Pull up into header
        marginBottom: 10,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 5,
        borderColor: '#FFF',
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.secondary,
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    userName: {
        color: '#333',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    userRole: {
        color: theme.colors.textSecondary,
        letterSpacing: 1.5,
        fontWeight: '700',
        fontSize: 12,
    },
    qrSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    qrBorder: {
        padding: 12,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    qrInstruction: {
        marginTop: 12,
        color: '#888',
        fontSize: 12,
    },
    customizationSection: {
        width: '100%',
        paddingHorizontal: 20,
    },
    selectorTitle: {
        marginBottom: 10,
        color: theme.colors.text,
    },
    bgSelector: {
        marginBottom: 25,
        flexDirection: 'row',
    },
    bgOption: {
        width: 45,
        height: 45,
        borderRadius: 25,
        marginRight: 15,
        borderWidth: 2,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedBg: {
        borderColor: theme.colors.text,
        borderWidth: 2,
    },
    avatarHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
    },
    avatarScroll: {
        paddingVertical: 5,
        marginBottom: 20,
    },
    avatarOption: {
        padding: 2,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: 'transparent',
        marginRight: 12,
    },
    selectedAvatar: {
        borderColor: theme.colors.primary,
    },
    avatarThumb: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    divider: {
        width: '90%',
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 20,
    },
    formSection: {
        width: '100%',
        paddingHorizontal: 20,
    },
    sectionHeader: {
        marginBottom: 4,
    },
    sectionSubHeader: {
        color: theme.colors.textSecondary,
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
        backgroundColor: theme.colors.surface,
        padding: 15,
        borderRadius: theme.borderRadius.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    inputLabel: {
        marginLeft: 8,
        fontWeight: '600',
        color: theme.colors.text,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.s,
        padding: 12,
        marginBottom: 12,
        backgroundColor: theme.colors.background,
    },
    privacyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    privacyText: {
        color: theme.colors.textSecondary,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
});
