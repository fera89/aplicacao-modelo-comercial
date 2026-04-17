import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../theme/Theme';
import { FirebaseService } from '../services/FirebaseService';
import { useApp } from '../context/AppContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

export const CertificationTestScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { certificationId, certificationName, minScore = 70, orientations } = route.params || {};

    const { user, login } = useApp();

    // Setup state
    const [modeSelected, setModeSelected] = useState(false);
    const [isTrainingMode, setIsTrainingMode] = useState(false);

    // Exam state
    const [attemptId, setAttemptId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionIndex: selectedOptionId }

    // Training State
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState(null);
    const [optionsGuessed, setOptionsGuessed] = useState({}); // { "A": true, "B": false }

    // Result state
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [passed, setPassed] = useState(false);
    const [saving, setSaving] = useState(false);

    const startTest = async (training) => {
        setIsTrainingMode(training);
        setModeSelected(true);
        setLoading(true);

        try {
            const data = await FirebaseService.generateTestFromAI(training, certificationId);
            if (data.questions && data.questions.length > 0) {
                setQuestions(data.questions);
                setAttemptId(data.attemptId);
            } else {
                throw new Error("No questions returned from AI.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível gerar a prova. Verifique sua conexão ou tente novamente mais tarde.');
            setModeSelected(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = async (optionId) => {
        // Enforce lock if currently fetching feedback or already answered correctly in training
        if (feedbackLoading) return;

        const currentQ = questions[currentQuestionIdx];

        if (isTrainingMode) {
            if (optionsGuessed[optionId] || optionsGuessed[currentQ.correctOptionId]) {
                // Already guessed this or already got it right
                return;
            }

            setAnswers(prev => ({ ...prev, [currentQuestionIdx]: optionId }));
            const isCorrect = optionId === currentQ.correctOptionId;

            setOptionsGuessed(prev => ({ ...prev, [optionId]: isCorrect }));

            if (!isCorrect) {
                setFeedbackLoading(true);
                try {
                    const optionText = currentQ.options.find(o => o.id === optionId)?.text;
                    const correctText = currentQ.options.find(o => o.id === currentQ.correctOptionId)?.text;
                    const fbk = await FirebaseService.getFeedbackFromAI(currentQ.text, optionText, correctText, certificationId);
                    setFeedbackMessage(fbk);
                } catch (e) {
                    setFeedbackMessage("Ops! Você errou. Tente novamente ponderando as regras da SUSEP.");
                } finally {
                    setFeedbackLoading(false);
                }
            } else {
                setFeedbackMessage("Correto! Muito bem.");
            }

        } else {
            // Exam mode: just record the answer
            setAnswers(prev => ({ ...prev, [currentQuestionIdx]: optionId }));
        }
    };

    const handleNext = async () => {
        if (!answers[currentQuestionIdx]) {
            Alert.alert('Atenção', 'Selecione uma resposta para continuar.');
            return;
        }

        const currentQ = questions[currentQuestionIdx];

        if (isTrainingMode && !optionsGuessed[currentQ.correctOptionId]) {
            Alert.alert('Atenção', 'Você deve encontrar a resposta correta antes de prosseguir no modo Treino.');
            return;
        }

        // Save progress to firebase attempt
        if (attemptId) {
            FirebaseService.updateAttempt(attemptId, {
                [`answers.${currentQuestionIdx}`]: answers[currentQuestionIdx],
            });
        }

        if (currentQuestionIdx < questions.length - 1) {
            setCurrentQuestionIdx(prev => prev + 1);
            setFeedbackMessage(null);
            setOptionsGuessed({});
        } else {
            finishTest();
        }
    };

    const finishTest = async () => {
        setSaving(true);
        // Calculate Score
        let correctCount = 0;
        questions.forEach((q, idx) => {
            const selectedOptId = answers[idx];
            if (selectedOptId === q.correctOptionId) {
                correctCount++;
            }
        });

        // Utilizar o minScore customizado vindo da lista de certificações (passado por rota), padrão: 70
        const finalScore = Math.round((correctCount / questions.length) * 100);
        // In training mode, we don't officially pass/fail the certificate, it's just practice.
        const hasPassed = !isTrainingMode && finalScore >= minScore;

        setScore(finalScore);
        setPassed(hasPassed);

        // Update Attempt Document
        if (attemptId) {
            await FirebaseService.updateAttempt(attemptId, {
                status: hasPassed ? 'passed' : 'failed',
                score: finalScore,
                finishedAt: new Date().toISOString()
            });
        }

        // Save to Firebase User if Exam Mode
        if (user?.id && !isTrainingMode && certificationId) {
            const certRecord = {
                score: finalScore,
                date: new Date().toISOString(),
                passed: hasPassed,
                name: certificationName || 'Certificação'
            };

            if (hasPassed) {
                const expires = new Date();
                expires.setMonth(expires.getMonth() + 3); // 3 months validity for example
                certRecord.expiresAt = expires.toISOString();
            }

            // Maintain old standard behavior to not break legacy code if missing ID
            const updateData = {};
            updateData[`certifications.${certificationId}`] = certRecord;

            try {
                await FirebaseService.updateUser(user.id, updateData);
                const updatedUser = {
                    ...user,
                    certifications: {
                        ...(user.certifications || {}),
                        [certificationId]: certRecord
                    }
                };
                login(updatedUser);
            } catch (error) {
                console.error("Failed to save cert data", error);
            }
        }

        setSaving(false);
        setIsFinished(true);
    };

    if (!modeSelected) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="school-outline" size={64} color={theme.colors.primary} />
                <Text style={styles.title}>{certificationName || 'Preparação e Certificação'}</Text>

                {orientations ? (
                    <Text style={styles.subtitle}>{orientations}</Text>
                ) : (
                    <Text style={styles.subtitle}>
                        A inteligência artificial irá formular uma prova exclusiva e dinâmica baseada nas normas da certificação.
                    </Text>
                )}

                {user?.certifications?.[certificationId]?.passed && (
                    <TouchableOpacity style={[styles.buttonPrimary, { marginBottom: 16, backgroundColor: theme.colors.success }]} onPress={() => navigation.navigate('Certificate', { certificationId })}>
                        <Ionicons name="ribbon-outline" size={20} color={theme.colors.surface} />
                        <Text style={styles.buttonPrimaryText}>Ver Meu Certificado</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={[styles.buttonPrimary, { marginBottom: 16 }]} onPress={() => startTest(false)}>
                    <Ionicons name="document-text" size={20} color={theme.colors.surface} />
                    <Text style={styles.buttonPrimaryText}>Iniciar Avaliação Oficial</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.buttonSecondary} onPress={() => startTest(true)}>
                    <Ionicons name="fitness-outline" size={20} color={theme.colors.text} />
                    <Text style={styles.buttonSecondaryText}>Modo Treino (Com Feedback IA)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 32 }} onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.colors.textSecondary }}>Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>A IA está formulando sua prova...</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 8 }}>Isso pode levar de 10 a 20 segundos.</Text>
            </View>
        );
    }

    if (isFinished) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons
                    name={isTrainingMode ? "trophy-outline" : (passed ? "checkmark-circle" : "close-circle")}
                    size={80}
                    color={isTrainingMode ? theme.colors.primary : (passed ? theme.colors.success : theme.colors.danger)}
                />

                <Text style={styles.title}>
                    {isTrainingMode ? 'Treino Finalizado' : (passed ? 'Aprovado!' : 'Reprovado')}
                </Text>

                <Text style={styles.subtitle}>
                    {isTrainingMode ? `Você concluiu as questões de treino.` : `Sua nota: ${score}% (Mínimo: 70%)`}
                </Text>

                {(passed && !isTrainingMode) ? (
                    <TouchableOpacity style={styles.buttonPrimary} onPress={() => navigation.navigate('Certificate')}>
                        <Text style={styles.buttonPrimaryText}>Ver meu Certificado</Text>
                        <Ionicons name="arrow-forward" size={20} color={theme.colors.surface} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.buttonSecondary}
                        onPress={() => {
                            setIsFinished(false);
                            setModeSelected(false);
                            setCurrentQuestionIdx(0);
                            setAnswers({});
                            setOptionsGuessed({});
                            setFeedbackMessage(null);
                        }}
                    >
                        <Text style={styles.buttonSecondaryText}>Concluir e Voltar</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    if (questions.length === 0) return null;

    const currentQ = questions[currentQuestionIdx];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{isTrainingMode ? 'Modo Treino' : 'Avaliação'} - {currentQuestionIdx + 1}/{questions.length}</Text>
                <Text style={styles.progressText}>{Math.round((currentQuestionIdx / questions.length) * 100)}%</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.questionText}>{currentQ.text}</Text>

                    <View style={styles.optionsContainer}>
                        {currentQ.options.map((opt) => {
                            const isSelected = answers[currentQuestionIdx] === opt.id;

                            // Style calculation for training mode
                            let optStyle = [styles.optionBtn];
                            let textStyle = [styles.optionText];
                            let radioStyle = [styles.radio];
                            let dotStyle = styles.radioInner;

                            if (isTrainingMode) {
                                if (optionsGuessed[opt.id] === true) {
                                    optStyle.push({ borderColor: theme.colors.success, backgroundColor: 'rgba(16,185,129,0.1)' });
                                    textStyle.push({ color: theme.colors.success, fontWeight: 'bold' });
                                    radioStyle.push({ borderColor: theme.colors.success });
                                    dotStyle = { ...dotStyle, backgroundColor: theme.colors.success };
                                } else if (optionsGuessed[opt.id] === false) {
                                    optStyle.push({ borderColor: theme.colors.danger, backgroundColor: 'rgba(239,68,68,0.1)' });
                                    textStyle.push({ color: theme.colors.danger, textDecorationLine: 'line-through' });
                                    radioStyle.push({ borderColor: theme.colors.danger });
                                } else if (isSelected) {
                                    // Should not happen unless resolving
                                    optStyle.push(styles.optionSelected);
                                    textStyle.push(styles.optionTextSelected);
                                    radioStyle.push(styles.radioSelected);
                                }
                            } else {
                                if (isSelected) {
                                    optStyle.push(styles.optionSelected);
                                    textStyle.push(styles.optionTextSelected);
                                    radioStyle.push(styles.radioSelected);
                                }
                            }

                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={optStyle}
                                    onPress={() => handleSelectOption(opt.id)}
                                >
                                    <View style={radioStyle}>
                                        {(isSelected || optionsGuessed[opt.id] !== undefined) && <View style={dotStyle} />}
                                    </View>
                                    <Text style={textStyle}>{opt.id}) {opt.text}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {feedbackLoading && (
                        <View style={styles.feedbackBox}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={styles.feedbackText}>A IA está analisando sua resposta...</Text>
                        </View>
                    )}

                    {feedbackMessage && !feedbackLoading && (
                        <View style={[styles.feedbackBox, optionsGuessed[currentQ.correctOptionId] ? styles.feedbackSuccess : styles.feedbackError]}>
                            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.buttonPrimary}
                    onPress={handleNext}
                    disabled={saving || feedbackLoading}
                >
                    {saving ? (
                        <ActivityIndicator color={theme.colors.surface} />
                    ) : (
                        <Text style={styles.buttonPrimaryText}>
                            {currentQuestionIdx < questions.length - 1 ? 'Avançar' : 'Finalizar Prova'}
                        </Text>
                    )}
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        color: theme.colors.primary,
        fontWeight: 'bold'
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 16,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: 8,
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 24
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    progressText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 40
    },
    questionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 24,
        lineHeight: 26,
    },
    optionsContainer: {
        gap: 12,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    optionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(16,185,129,0.05)',
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.colors.border,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: theme.colors.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
    },
    optionText: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 22
    },
    optionTextSelected: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    feedbackBox: {
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(16,185,129,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    feedbackSuccess: {
        backgroundColor: 'rgba(16,185,129,0.1)',
        borderColor: theme.colors.success,
        borderWidth: 1
    },
    feedbackError: {
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderColor: theme.colors.danger,
        borderWidth: 1
    },
    feedbackText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20
    },
    footer: {
        padding: 20,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    buttonPrimary: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
    },
    buttonPrimaryText: {
        color: theme.colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
    },
    buttonSecondaryText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

