import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export const ESGCheckInScreen = ({ navigation, route }) => {
    const { user, completeESGCheckIn, updateESGData } = useApp();
    const isEditing = route?.params?.isEditing || false;

    const [currentStep, setCurrentStep] = useState(1); // Optional: if we want multi-step, but requirement says "form" so maybe one scroll. Let's do single scroll for speed.

    // Form State
    const [formData, setFormData] = useState({
        role: user?.esgData?.role || '',
        transportMode: user?.esgData?.transportMode || '',
        distance: user?.esgData?.distance || '',
        carOccupancy: user?.esgData?.carOccupancy || '',
        returnSameMode: user?.esgData?.returnSameMode || null, // true/false
        broughtCup: user?.esgData?.broughtCup || null, // true/false
    });

    useEffect(() => {
        if (isEditing && user?.esgData) {
            setFormData(user.esgData);
        }
    }, [isEditing, user]);

    const handleSelect = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validate = () => {
        if (!formData.role) return 'Selecione seu perfil (Pergunta 1).';
        if (!formData.transportMode) return 'Selecione seu transporte (Pergunta 2).';
        if (!formData.distance) return 'Selecione a distância aproximada (Pergunta 3).';
        // Logic for Q4: Only if car related
        const isCar = ['Carro-sozinho', 'Carona', 'App'].includes(formData.transportMode);
        if (isCar && !formData.carOccupancy) return 'Indique quantas pessoas no veículo (Pergunta 4).';

        if (formData.returnSameMode === null) return 'Responda se pretende voltar com o mesmo modal (Pergunta 5).';
        if (formData.broughtCup === null) return 'Responda se trouxe copo reutilizável (Pergunta 6).';

        return null;
    };

    const handleSubmit = async () => {
        const error = validate();
        if (error) {
            Alert.alert('Atenção', error);
            return;
        }

        try {
            await completeESGCheckIn(formData);
            // If editing, go back. If flow, AppNavigator handles it via user state change.
            if (isEditing) {
                Alert.alert('Sucesso', 'Dados atualizados!');
                navigation.goBack();
            } else {
                // The navigation reset happens automatically in AppNavigator when user state updates
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Erro', 'Não foi possível salvar os dados. Tente novamente.');
        }
    };

    // Helper for rendering options
    const RadioOption = ({ label, value, selectedValue, onSelect }) => (
        <TouchableOpacity
            style={[styles.option, selectedValue === value && styles.optionSelected]}
            onPress={() => onSelect(value)}
        >
            <Ionicons
                name={selectedValue === value ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={selectedValue === value ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Typography variant="body" style={[styles.optionText, selectedValue === value && styles.optionTextSelected]}>
                {label}
            </Typography>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Ionicons name="leaf-outline" size={40} color={theme.colors.primary} style={{ marginBottom: 10 }} />
                    <Typography variant="h2">Check-in Sustentável</Typography>
                    <Typography variant="body" style={styles.subtitle}>
                        Ajude-nos a medir o impacto do treinamento respondendo a 6 perguntas rápidas.
                    </Typography>
                </View>

                {/* Q1: Role */}
                <View style={styles.questionContainer}>
                    <Typography variant="h3" style={styles.questionTitle}>1. Você é:</Typography>
                    {['Participante', 'Palestrante', 'Equipe'].map(opt => (
                        <RadioOption
                            key={opt} label={opt} value={opt}
                            selectedValue={formData.role}
                            onSelect={(v) => handleSelect('role', v)}
                        />
                    ))}
                </View>

                {/* Q2: Transport */}
                <View style={styles.questionContainer}>
                    <Typography variant="h3" style={styles.questionTitle}>2. Seu deslocamento principal hoje:</Typography>
                    {['A pé', 'Bike', 'Transporte público', 'Carro-sozinho', 'Carona', 'App'].map(opt => (
                        <RadioOption
                            key={opt} label={opt} value={opt}
                            selectedValue={formData.transportMode}
                            onSelect={(v) => handleSelect('transportMode', v)}
                        />
                    ))}
                </View>

                {/* Q3: Distance */}
                <View style={styles.questionContainer}>
                    <Typography variant="h3" style={styles.questionTitle}>3. Distância aproximada (ida):</Typography>
                    {['0–5 km', '5–10 km', '10–20 km', '20–50 km', '>50 km'].map(opt => (
                        <RadioOption
                            key={opt} label={opt} value={opt}
                            selectedValue={formData.distance}
                            onSelect={(v) => handleSelect('distance', v)}
                        />
                    ))}
                </View>

                {/* Q4: Car Occupancy (Conditional) */}
                {['Carro-sozinho', 'Carona', 'App'].includes(formData.transportMode) && (
                    <View style={styles.questionContainer}>
                        <Typography variant="h3" style={styles.questionTitle}>4. Se veio de carro, quantas pessoas no veículo?</Typography>
                        {['1', '2', '3', '4+'].map(opt => (
                            <RadioOption
                                key={opt} label={opt} value={opt}
                                selectedValue={formData.carOccupancy}
                                onSelect={(v) => handleSelect('carOccupancy', v)}
                            />
                        ))}
                    </View>
                )}

                {/* Q5: Return Same Mode */}
                <View style={styles.questionContainer}>
                    <Typography variant="h3" style={styles.questionTitle}>5. Pretende voltar com o mesmo modal?</Typography>
                    <View style={styles.row}>
                        <RadioOption label="Sim" value={true} selectedValue={formData.returnSameMode} onSelect={(v) => handleSelect('returnSameMode', v)} />
                        <View style={{ width: 20 }} />
                        <RadioOption label="Não" value={false} selectedValue={formData.returnSameMode} onSelect={(v) => handleSelect('returnSameMode', v)} />
                    </View>
                </View>

                {/* Q6: Brought Cup */}
                <View style={styles.questionContainer}>
                    <Typography variant="h3" style={styles.questionTitle}>6. Trouxe garrafa/copo reutilizável?</Typography>
                    <View style={styles.row}>
                        <RadioOption label="Sim" value={true} selectedValue={formData.broughtCup} onSelect={(v) => handleSelect('broughtCup', v)} />
                        <View style={{ width: 20 }} />
                        <RadioOption label="Não" value={false} selectedValue={formData.broughtCup} onSelect={(v) => handleSelect('broughtCup', v)} />
                    </View>
                </View>

                <Button
                    title={isEditing ? "Atualizar Dados" : "Confirmar Check-in"}
                    onPress={handleSubmit}
                    style={styles.submitButton}
                />

                {!isEditing && (
                    <Typography variant="caption" style={styles.dica}>
                        * O preenchimento é necessário para a retirada do seu kit.
                    </Typography>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scroll: {
        padding: theme.spacing.m,
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    subtitle: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        marginTop: 8,
    },
    questionContainer: {
        marginBottom: theme.spacing.l,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    questionTitle: {
        marginBottom: theme.spacing.m,
        fontSize: 16,
        color: theme.colors.text,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.s,
        marginBottom: 8,
    },
    optionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: '#e8f5e9', // Light green
    },
    optionText: {
        marginLeft: 10,
    },
    optionTextSelected: {
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    row: {
        flexDirection: 'row',
    },
    submitButton: {
        marginTop: theme.spacing.m,
    },
    dica: {
        textAlign: 'center',
        marginTop: 16,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    }
});
