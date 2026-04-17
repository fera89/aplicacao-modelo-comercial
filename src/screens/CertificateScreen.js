import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db } from '../services/firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export const CertificateScreen = () => {
    const { user } = useApp();
    const navigation = useNavigation();
    const route = useRoute();

    // Get certification context or fallback to legacy top-level for backwards compatibility
    const { certificationId } = route.params || {};
    const certRecord = certificationId ? user?.certifications?.[certificationId] : null;

    const isCertified = certRecord ? certRecord.passed : user?.isCertified;
    const certNameStr = certRecord?.name || 'Regulatória e SUSEP';
    const rawScore = certRecord?.score ?? user?.certificationScore ?? 0;
    const rawDate = certRecord?.date || user?.certificationDate;
    const rawExpires = certRecord?.expiresAt || user?.certificationExpiresAt;

    const [template, setTemplate] = React.useState(null);

    React.useEffect(() => {
        let unsubCert = null;
        let unsubTemplate = null;

        if (certificationId) {
            unsubCert = onSnapshot(doc(db, 'certifications', certificationId), (certDoc) => {
                if (certDoc.exists()) {
                    const tId = certDoc.data().templateId;
                    if (tId) {
                        if (unsubTemplate) unsubTemplate();
                        unsubTemplate = onSnapshot(doc(db, 'certificate_templates', tId), (tplDoc) => {
                            if (tplDoc.exists()) {
                                setTemplate(tplDoc.data());
                            } else {
                                setTemplate(null);
                            }
                        });
                    } else {
                        setTemplate(null);
                        if (unsubTemplate) {
                            unsubTemplate();
                            unsubTemplate = null;
                        }
                    }
                }
            });
        }

        return () => {
            if (unsubCert) unsubCert();
            if (unsubTemplate) unsubTemplate();
        };
    }, [certificationId]);

    // Derived style variables based on template or fallback defaults
    const primaryColor = template?.textColor || theme.colors.primary;
    const secondaryColor = template?.textSecondaryColor || theme.colors.textSecondary;
    let bgColor = template?.bgColor || theme.colors.surface;
    const bgOpacity = template?.bgOpacity !== undefined ? template.bgOpacity : 1;

    if (bgColor.startsWith('#') && bgColor.length === 7) {
        const r = parseInt(bgColor.substring(1, 3), 16);
        const g = parseInt(bgColor.substring(3, 5), 16);
        const b = parseInt(bgColor.substring(5, 7), 16);
        bgColor = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
    }

    const bgImage = template?.bgImage || null;
    const customFont = template?.fontFamily && template.fontFamily !== 'System' ? template.fontFamily : 'System';

    const handleShare = async () => {
        try {
            const certDate = rawDate ? new Date(rawDate).toLocaleDateString('pt-BR') : 'N/A';
            const expDate = rawExpires ? new Date(rawExpires).toLocaleDateString('pt-BR') : 'N/A';
            const score = rawScore;
            const name = user?.name || user?.email || 'Consultor';

            const htmlContent = `
                <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap');
                            body { 
                                font-family: ${customFont === 'monospace' ? "'Roboto Mono', monospace" : (customFont === 'serif' ? 'serif' : "'Helvetica', 'Arial', sans-serif")};
                                text-align: center; 
                                color: ${primaryColor}; 
                                margin: 0;
                            }
                            .bg-layer {
                                position: absolute;
                                top: 0; left: 0; right: 0; bottom: 0;
                                background-color: ${bgColor};
                                ${bgImage ? `background-image: url('${bgImage}'); background-size: cover; background-position: center; opacity: 0.15;` : ''}
                                z-index: -1;
                            }
                            .boundary { background: transparent; border: 10px solid ${primaryColor}; padding: 40px; margin: 20px; border-radius: 20px; position: relative; z-index: 1;}
                            h1 { font-size: 50px; color: ${primaryColor}; margin-bottom: 10px; }
                            h2 { font-size: 30px; font-weight: normal; margin-top: 0; color: ${secondaryColor}; }
                            .name { font-size: 40px; font-weight: bold; margin: 40px 0; text-decoration: underline; color: ${primaryColor}; }
                            .details { font-size: 20px; line-height: 1.6; margin-bottom: 40px; color: ${secondaryColor}; }
                            .footer { display: flex; justify-content: space-around; margin-top: 50px; font-size: 18px; color: ${secondaryColor}; }
                        </style>
                    </head>
                    <body>
                        <div class="bg-layer"></div>
                        <div class="boundary">
                            <h1>Certificado de Conformidade</h1>
                            <h2>${certNameStr}</h2>
                            
                            <p class="details">Certificamos que</p>
                            <div class="name">${name}</div>
                            
                            <p class="details">
                                Concluiu com êxito o treinamento obrigatório de adequação regulatória,<br>
                                obtendo aproveitamento de <strong style="color: ${primaryColor}">${score}%</strong> na avaliação.
                            </p>
                            
                            <div class="footer">
                                <div><strong style="color: ${primaryColor}">Data de Emissão:</strong><br>${certDate}</div>
                                <div><strong style="color: ${primaryColor}">Válido até:</strong><br>${expDate}</div>
                            </div>
                        </div>
                    </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            } else {
                Alert.alert('Erro', 'O compartilhamento não está disponível no seu dispositivo.');
            }

        } catch (error) {
            console.error('Erro ao gerar PDF', error);
            Alert.alert('Erro', 'Não foi possível gerar e compartilhar o certificado.');
        }
    };

    if (!isCertified) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="lock-closed" size={64} color={theme.colors.textMuted} />
                <Text style={styles.title}>Não Certificado</Text>
                <Text style={styles.subtitle}>Você precisa ser aprovado na prova para ver seu certificado.</Text>
                <TouchableOpacity style={styles.buttonPrimary} onPress={() => navigation.navigate('Certificações')}>
                    <Text style={styles.buttonPrimaryText}>Ver Trilhas de Estudo</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const certDate = rawDate ? new Date(rawDate).toLocaleDateString('pt-BR') : 'N/A';
    const expDate = rawExpires ? new Date(rawExpires).toLocaleDateString('pt-BR') : 'N/A';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('MainTabs')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Seu Certificado</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
                <View style={[
                    styles.certificateCard,
                    { backgroundColor: bgColor, borderColor: primaryColor }
                ]}>
                    <Ionicons name="ribbon" size={64} color={primaryColor} />
                    <Text style={[
                        styles.certTitle,
                        { color: primaryColor, fontFamily: customFont === 'System' ? undefined : customFont }
                    ]}>
                        Certificado de Conformidade
                    </Text>

                    <Text style={[styles.certText, { color: secondaryColor }]}>Concedido a:</Text>
                    <Text style={[
                        styles.certName,
                        { color: primaryColor, fontFamily: customFont === 'System' ? undefined : customFont }
                    ]}>
                        {user.name || user.email || 'Consultor'}
                    </Text>

                    <Text style={[styles.certDesc, { color: secondaryColor }]}>
                        Por ter concluído a capacitação e aderido às normas exigidas na trilha de aprendizado:
                        {'\n'}<Text style={{ fontWeight: 'bold', color: primaryColor }}>{certNameStr}</Text>
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: secondaryColor }]}>Aproveitamento</Text>
                            <Text style={[styles.statValue, { color: primaryColor }]}>{rawScore}%</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: secondaryColor }]}>Emissão</Text>
                            <Text style={[styles.statValue, { color: primaryColor }]}>{certDate}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: secondaryColor }]}>Validade</Text>
                            <Text style={[styles.statValue, { color: primaryColor }]}>{expDate}</Text>
                        </View>
                    </View>

                    <View style={styles.qrContainer}>
                        <QRCode
                            value={`https://appinp.com/cert/${user.id}`}
                            size={100}
                            color={primaryColor}
                            backgroundColor="transparent"
                        />
                        <Text style={[styles.qrLabel, { color: primaryColor }]}>Escaneie para validar</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.buttonShare} onPress={handleShare}>
                    <Ionicons name="share-social" size={20} color={theme.colors.surface} />
                    <Text style={styles.buttonShareText}>Exportar & Compartilhar PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('MainTabs')}>
                    <Text style={styles.buttonSecondaryText}>Ir para o Aplicativo &gt;</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
        marginBottom: 24,
        textAlign: 'center',
    },
    certificateCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        width: '100%',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        marginBottom: 24,
    },
    certTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginTop: 12,
        textAlign: 'center',
    },
    certText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 24,
    },
    certName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 4,
        textAlign: 'center',
    },
    certDesc: {
        fontSize: 14,
        color: theme.colors.text,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 22,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    statBox: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 4,
    },
    qrContainer: {
        marginTop: 32,
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(16,185,129,0.05)',
        borderRadius: 16,
    },
    qrLabel: {
        fontSize: 12,
        color: theme.colors.primary,
        marginTop: 8,
        fontWeight: '600',
    },
    buttonShare: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        gap: 8,
        marginBottom: 16,
    },
    buttonShareText: {
        color: theme.colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonSecondary: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    buttonSecondaryText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonPrimary: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 16,
    },
    buttonPrimaryText: {
        color: theme.colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    }
});
