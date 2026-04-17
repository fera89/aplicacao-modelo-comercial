import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import { FirebaseService } from '../services/FirebaseService';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

// Scoring constants
const POINTS_PER_LESSON = 10;

export const LessonScreen = ({ navigation, route }) => {
    const { courseId, moduleId, lesson, totalLessons, requireFullWatch } = route.params;
    const { user, updateProgress } = useApp();

    const videoRef = useRef(null);
    const [status, setStatus] = useState({});
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const [videoError, setVideoError] = useState(false);

    const handlePlaybackStatusUpdate = useCallback((playbackStatus) => {
        setStatus(playbackStatus);

        if (playbackStatus.isLoaded) {
            setLoading(false);
        }

        // Check if video finished
        if (playbackStatus.didJustFinish && !completed) {
            markAsCompleted();
        }
    }, [completed]);

    const markAsCompleted = async () => {
        if (completed) return;
        setCompleted(true);

        try {
            if (user?.id) {
                const result = await FirebaseService.markLessonCompleted(
                    user.id, courseId, moduleId, lesson.id, totalLessons, 0
                );
                updateProgress(courseId, {
                    completedLessons: result.completedLessons,
                    progress: result.progress
                });

                // Award points
                await FirebaseService.addPoints(user.id, POINTS_PER_LESSON, 'lesson_completed');
            }
        } catch (e) {
            console.error('Error marking lesson completed', e);
        }
    };

    const handleManualComplete = () => {
        if (requireFullWatch) {
            Alert.alert(
                'Assista a aula completa',
                'Este curso exige que você assista ao vídeo inteiro para marcar como concluído.'
            );
            return;
        }
        markAsCompleted();
    };

    const handleVideoError = (error) => {
        console.error('Video error:', error);
        setVideoError(true);
        setLoading(false);
    };

    const formatTime = (millis) => {
        if (!millis) return '0:00';
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progress = status.durationMillis
        ? (status.positionMillis / status.durationMillis) * 100
        : 0;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title}</Text>
                {completed && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                )}
                {!completed && <View style={{ width: 24 }} />}
            </View>

            {/* Video Player */}
            <View style={styles.videoContainer}>
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>Carregando vídeo...</Text>
                    </View>
                )}

                {videoError ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                        <Text style={styles.errorText}>Não foi possível carregar o vídeo</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => setVideoError(false)}>
                            <Text style={styles.retryText}>Tentar novamente</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Video
                        ref={videoRef}
                        style={styles.video}
                        source={{ uri: lesson.videoUrl }}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                        onError={handleVideoError}
                        shouldPlay={false}
                    />
                )}
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatTime(status.positionMillis)}</Text>
                    <Text style={styles.timeText}>{formatTime(status.durationMillis)}</Text>
                </View>
            </View>

            {/* Lesson Info */}
            <View style={styles.infoSection}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                {lesson.description ? (
                    <Text style={styles.lessonDesc}>{lesson.description}</Text>
                ) : null}

                {/* Completion Status */}
                {completed ? (
                    <View style={styles.completedBanner}>
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                        <View>
                            <Text style={styles.completedText}>Aula concluída!</Text>
                            <Text style={styles.completedSubtext}>+{POINTS_PER_LESSON} pontos</Text>
                        </View>
                    </View>
                ) : !requireFullWatch ? (
                    <TouchableOpacity style={styles.completeBtn} onPress={handleManualComplete}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                        <Text style={styles.completeBtnText}>Marcar como concluída</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.watchHint}>
                        <Ionicons name="information-circle" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.watchHintText}>
                            Assista o vídeo até o final para marcar como concluída
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 12,
        backgroundColor: theme.colors.surface,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 12,
    },
    videoContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 1,
    },
    loadingText: {
        color: '#FFF',
        marginTop: 12,
        fontSize: 14,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        color: '#FFF',
        marginTop: 12,
        fontSize: 14,
    },
    retryBtn: {
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
    },
    retryText: {
        color: '#FFF',
        fontWeight: '600',
    },
    progressSection: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    progressBar: {
        height: 3,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    timeText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    infoSection: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 20,
    },
    lessonTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    lessonDesc: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
        lineHeight: 20,
    },
    completedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(56, 142, 60, 0.1)',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        gap: 12,
    },
    completedText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    completedSubtext: {
        fontSize: 12,
        color: theme.colors.success,
        marginTop: 2,
    },
    completeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        gap: 8,
    },
    completeBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    watchHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        gap: 8,
    },
    watchHintText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        flex: 1,
    },
});
