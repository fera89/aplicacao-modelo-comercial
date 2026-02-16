import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button as RSButton } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { theme } from '../theme/Theme';

export const QRCodeScreen = ({ navigation }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    if (!permission) {
        // Camera permissions are still loading.
        return <ScreenWrapper><Typography>Requesting permissions...</Typography></ScreenWrapper>;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <ScreenWrapper style={styles.container}>
                <Typography variant="h2" style={styles.message}>Precisamos acesso à câmera para o check-in</Typography>
                <Button onPress={requestPermission} title="Permitir Câmera" />
            </ScreenWrapper>
        );
    }

    const handleBarCodeScanned = ({ type, data }) => {
        setScanned(true);
        // TODO: Validate QR code data here (e.g., check if it's the correct event code)
        // For now, assume any QR is valid and proceed to Auth
        navigation.navigate('Auth', { eventId: data });
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            />
            <View style={styles.overlay}>
                <Typography variant="h2" style={styles.title}>Escaneie o QR Code do Evento</Typography>
                <View style={styles.scanArea} />
                <Typography variant="body" style={styles.instruction}>Posicione o código dentro do quadrado</Typography>
            </View>
            {scanned && (
                <Button title={'Escanear Novamente'} onPress={() => setScanned(false)} style={styles.rescanButton} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    title: {
        color: '#FFF',
        marginBottom: 40,
        textAlign: 'center',
    },
    scanArea: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        backgroundColor: 'transparent',
        borderRadius: 20,
    },
    instruction: {
        color: '#FFF',
        marginTop: 20,
    },
    rescanButton: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        width: '80%',
    }
});
