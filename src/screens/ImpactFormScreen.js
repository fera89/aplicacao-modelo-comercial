import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import { calculateTransportEmissions, calculateHabitSavings, EMISSION_FACTORS } from '../utils/SustainabilityCalculator';

export const ImpactFormScreen = ({ navigation }) => {
    const { addImpact } = useApp();
    const [transportMode, setTransportMode] = useState('');
    const [distance, setDistance] = useState('');
    const [passengers, setPassengers] = useState('1');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!transportMode || !distance) {
            Alert.alert('Erro', 'Por favor, preencha o meio de transporte e a distância.');
            return;
        }

        setLoading(true);

        // Simulate calculation and saving delay
        setTimeout(() => {
            const dist = parseFloat(distance);
            const pass = parseInt(passengers);

            const emissions = calculateTransportEmissions(transportMode, dist, pass);

            // Calculate savings compared to a standard car (single occupancy) benchmark
            const baselineEmissions = calculateTransportEmissions('car_gasoline', dist, 1);
            const savings = Math.max(0, baselineEmissions - emissions);

            addImpact({
                type: 'transport',
                mode: transportMode,
                distance: dist,
                co2Emitted: emissions,
                co2Saved: savings
            });

            setLoading(false);
            Alert.alert('Sucesso!', `Você emitiu ${emissions.toFixed(2)}kg CO2 e economizou ${savings.toFixed(2)}kg comparado a um carro individual!`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        }, 1000);
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Typography variant="h2" style={styles.title}>Registrar Transporte</Typography>

                <View style={styles.formGroup}>
                    <Typography variant="body" style={styles.label}>Meio de Transporte</Typography>
                    <View style={styles.chipContainer}>
                        {Object.keys(EMISSION_FACTORS).map((mode) => (
                            <Button
                                key={mode}
                                title={mode.replace('_', ' ')}
                                variant={transportMode === mode ? 'primary' : 'secondary'}
                                onPress={() => setTransportMode(mode)}
                                style={styles.chip}
                            />
                        ))}
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Typography variant="body" style={styles.label}>Distância (km)</Typography>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: 15"
                        keyboardType="numeric"
                        value={distance}
                        onChangeText={setDistance}
                        placeholderTextColor={theme.colors.textSecondary}
                    />
                </View>

                {['car_gasoline', 'car_ethanol', 'rideshare'].includes(transportMode) && (
                    <View style={styles.formGroup}>
                        <Typography variant="body" style={styles.label}>Pessoas no veículo (incluindo você)</Typography>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 2"
                            keyboardType="numeric"
                            value={passengers}
                            onChangeText={setPassengers}
                            placeholderTextColor={theme.colors.textSecondary}
                        />
                    </View>
                )}

                <View style={styles.actions}>
                    <Button title="Salvar Impacto" onPress={handleSave} loading={loading} />
                    <Button title="Cancelar" variant="secondary" onPress={() => navigation.goBack()} style={styles.cancelButton} />
                </View>
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
    },
    formGroup: {
        marginBottom: theme.spacing.m,
    },
    label: {
        marginBottom: theme.spacing.s,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.s,
        padding: theme.spacing.m,
        fontSize: 16,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        minHeight: 36,
        paddingVertical: 4,
        paddingHorizontal: 12,
        marginBottom: 4,
    },
    actions: {
        marginTop: theme.spacing.l,
    },
    cancelButton: {
        marginTop: theme.spacing.m,
    }
});
