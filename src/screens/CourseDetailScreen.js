import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import { FirebaseService } from '../services/FirebaseService';
import Ionicons from '@expo/vector-icons/Ionicons';

export const CourseDetailScreen = ({ navigation, route }) => {
    const { courseId } = route.params;
    const { user, userProgress, updateProgress } = useApp();

    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);

    const progress = userProgress[courseId] || {};
    const completedLessons = progress.completedLessons || [];
    const completedModules = progress.completedModules || [];

    useEffect(() => {
        loadCourse();
    }, [courseId]);

    const loadCourse = async () => {
        try {
            const courseData = await FirebaseService.getCourseById(courseId);
            setCourse(courseData);

            const modulesData = await FirebaseService.getCourseModules(courseId);
            setModules(modulesData);
        } catch (e) {
            console.error('Error loading course', e);
            Alert.alert('Erro', 'Não foi possível carregar o curso.');
        } finally {
            setLoading(false);
        }
    };

    const isModuleUnlocked = (moduleIndex) => {
        if (moduleIndex === 0) return true; // First module always unlocked
        const prevModule = modules[moduleIndex - 1];
        if (!prevModule) return false;

        // Check if all lessons of previous module are completed
        const prevLessons = prevModule.lessons || [];
        const allPrevCompleted = prevLessons.every(l => completedLessons.includes(l.id));

        // If previous module has exam, check if module is marked as completed
        if (prevModule.examId) {
            return allPrevCompleted && completedModules.includes(prevModule.id);
        }

        return allPrevCompleted;
    };

    const isLessonCompleted = (lessonId) => completedLessons.includes(lessonId);

    const getModuleProgress = (module) => {
        const lessons = module.lessons || [];
        if (lessons.length === 0) return 0;
        const completed = lessons.filter(l => completedLessons.includes(l.id)).length;
        return Math.round((completed / lessons.length) * 100);
    };

    const areAllLessonsComplete = (module) => {
        const lessons = module.lessons || [];
        return lessons.length > 0 && lessons.every(l => completedLessons.includes(l.id));
    };

    const handleLessonPress = (module, lesson, moduleIndex) => {
        if (!isModuleUnlocked(moduleIndex)) {
            Alert.alert('Módulo Bloqueado', 'Complete o módulo anterior para desbloquear este.');
            return;
        }

        const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);

        navigation.navigate('Lesson', {
            courseId,
            moduleId: module.id,
            lesson,
            totalLessons,
            requireFullWatch: course?.requireFullWatch ?? true,
        });
    };

    const handleExamPress = (module, moduleIndex) => {
        if (!isModuleUnlocked(moduleIndex)) {
            Alert.alert('Módulo Bloqueado', 'Complete o módulo anterior.');
            return;
        }

        if (!areAllLessonsComplete(module)) {
            Alert.alert('Aulas Pendentes', 'Assista todas as aulas deste módulo antes de fazer a prova.');
            return;
        }

        navigation.navigate('CertificationTest', {
            examId: module.examId,
            courseId,
            moduleId: module.id,
            certificationName: module.name,
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!course) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                <Text style={styles.errorText}>Curso não encontrado</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{course.name}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Cover */}
                {course.coverImage ? (
                    <Image source={{ uri: course.coverImage }} style={styles.coverImage} />
                ) : (
                    <View style={[styles.coverImage, styles.coverPlaceholder]}>
                        <Ionicons name="book" size={56} color={theme.colors.primary} />
                    </View>
                )}

                {/* Course Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.courseTitle}>{course.name}</Text>
                    {course.description ? (
                        <Text style={styles.courseDesc}>{course.description}</Text>
                    ) : null}

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="layers" size={16} color={theme.colors.primary} />
                            <Text style={styles.statText}>{modules.length} módulos</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="play-circle" size={16} color={theme.colors.primary} />
                            <Text style={styles.statText}>
                                {modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0)} aulas
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="trending-up" size={16} color={theme.colors.primary} />
                            <Text style={styles.statText}>{progress.progress || 0}% concluído</Text>
                        </View>
                    </View>

                    {/* Global progress bar */}
                    <View style={styles.globalProgress}>
                        <View style={[styles.globalProgressFill, { width: `${progress.progress || 0}%` }]} />
                    </View>
                </View>

                {/* Modules */}
                <View style={styles.modulesSection}>
                    <Text style={styles.sectionTitle}>Conteúdo do Curso</Text>

                    {modules.map((module, moduleIndex) => {
                        const unlocked = isModuleUnlocked(moduleIndex);
                        const moduleProgress = getModuleProgress(module);
                        const moduleComplete = completedModules.includes(module.id);

                        return (
                            <View key={module.id} style={[styles.moduleCard, !unlocked && styles.moduleCardLocked]}>
                                {/* Module Header */}
                                <View style={styles.moduleHeader}>
                                    <View style={[styles.moduleNumber, moduleComplete && styles.moduleNumberComplete]}>
                                        {moduleComplete ? (
                                            <Ionicons name="checkmark" size={16} color="#FFF" />
                                        ) : !unlocked ? (
                                            <Ionicons name="lock-closed" size={14} color={theme.colors.textSecondary} />
                                        ) : (
                                            <Text style={styles.moduleNumberText}>{moduleIndex + 1}</Text>
                                        )}
                                    </View>
                                    <View style={styles.moduleInfo}>
                                        <Text style={[styles.moduleName, !unlocked && styles.lockedText]}>
                                            {module.name}
                                        </Text>
                                        <Text style={styles.moduleSubtext}>
                                            {module.lessons?.length || 0} aulas • {moduleProgress}%
                                        </Text>
                                    </View>
                                </View>

                                {/* Lessons */}
                                {unlocked && (module.lessons || []).map((lesson, lessonIndex) => {
                                    const completed = isLessonCompleted(lesson.id);
                                    return (
                                        <TouchableOpacity
                                            key={lesson.id}
                                            style={styles.lessonItem}
                                            onPress={() => handleLessonPress(module, lesson, moduleIndex)}
                                        >
                                            <View style={[styles.lessonIcon, completed && styles.lessonIconComplete]}>
                                                {completed ? (
                                                    <Ionicons name="checkmark" size={14} color="#FFF" />
                                                ) : (
                                                    <Ionicons name="play" size={12} color={theme.colors.primary} />
                                                )}
                                            </View>
                                            <View style={styles.lessonInfo}>
                                                <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
                                                {lesson.duration ? (
                                                    <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                {/* Module Exam */}
                                {unlocked && module.examId && (
                                    <TouchableOpacity
                                        style={[styles.examButton, !areAllLessonsComplete(module) && styles.examButtonDisabled]}
                                        onPress={() => handleExamPress(module, moduleIndex)}
                                    >
                                        <Ionicons name="document-text" size={18} color={areAllLessonsComplete(module) ? theme.colors.primary : theme.colors.textSecondary} />
                                        <Text style={[styles.examButtonText, !areAllLessonsComplete(module) && styles.lockedText]}>
                                            Avaliação do Módulo
                                        </Text>
                                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>

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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: theme.colors.error,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
    },
    coverImage: {
        width: '100%',
        height: 180,
        backgroundColor: theme.colors.border,
    },
    coverPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(46, 125, 50, 0.05)',
    },
    infoSection: {
        padding: 20,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    courseTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    courseDesc: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    globalProgress: {
        height: 4,
        backgroundColor: theme.colors.border,
        borderRadius: 2,
        marginTop: 16,
        overflow: 'hidden',
    },
    globalProgressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    modulesSection: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
    },
    moduleCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    moduleCardLocked: {
        opacity: 0.5,
    },
    moduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    moduleNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    moduleNumberComplete: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    moduleNumberText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    moduleInfo: {
        flex: 1,
    },
    moduleName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    moduleSubtext: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    lockedText: {
        color: theme.colors.textSecondary,
    },
    lessonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingLeft: 44,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    lessonIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    lessonIconComplete: {
        backgroundColor: theme.colors.success,
    },
    lessonInfo: {
        flex: 1,
    },
    lessonTitle: {
        fontSize: 14,
        color: theme.colors.text,
    },
    lessonDuration: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    examButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
        backgroundColor: 'rgba(46, 125, 50, 0.05)',
        borderRadius: 12,
        gap: 8,
    },
    examButtonDisabled: {
        opacity: 0.5,
    },
    examButtonText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
});
