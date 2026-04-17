import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import { FirebaseService } from '../services/FirebaseService';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

export const CoursesScreen = ({ navigation }) => {
    const { user, userProgress } = useApp();
    const [courses, setCourses] = useState([]);
    const [standaloneExams, setStandaloneExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'exams'

    useEffect(() => {
        const unsubscribe = FirebaseService.subscribeToCourses((data) => {
            setCourses(data);
            setLoading(false);
        });

        loadStandaloneExams();

        return () => unsubscribe && unsubscribe();
    }, []);

    const loadStandaloneExams = async () => {
        try {
            const exams = await FirebaseService.getStandaloneExams();
            setStandaloneExams(exams);
        } catch (e) {
            console.error('Error loading standalone exams', e);
        }
    };

    const getProgressForCourse = (courseId) => {
        return userProgress[courseId] || null;
    };

    const renderCourseCard = ({ item }) => {
        const progress = getProgressForCourse(item.id);
        const progressPercent = progress?.progress || 0;
        const status = progress?.status || 'not_started';

        return (
            <TouchableOpacity
                style={styles.courseCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
            >
                {item.coverImage ? (
                    <Image source={{ uri: item.coverImage }} style={styles.courseCover} />
                ) : (
                    <View style={[styles.courseCover, styles.courseCoverPlaceholder]}>
                        <Ionicons name="book" size={40} color={theme.colors.primary} />
                    </View>
                )}

                <View style={styles.courseInfo}>
                    <View style={styles.courseHeader}>
                        <Text style={styles.courseName} numberOfLines={2}>{item.name}</Text>
                        {status === 'completed' && (
                            <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                        )}
                    </View>

                    {item.description ? (
                        <Text style={styles.courseDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}

                    <View style={styles.courseMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="layers-outline" size={14} color={theme.colors.textSecondary} />
                            <Text style={styles.metaText}>{item.totalModules || 0} módulos</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="play-circle-outline" size={14} color={theme.colors.textSecondary} />
                            <Text style={styles.metaText}>{item.totalLessons || 0} aulas</Text>
                        </View>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{progressPercent}%</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderExamCard = ({ item }) => (
        <TouchableOpacity
            style={styles.examCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CertificationTest', {
                examId: item.id,
                certificationId: item.certificationId,
                certificationName: item.name,
            })}
        >
            <View style={styles.examIcon}>
                <Ionicons name="document-text" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.examInfo}>
                <Text style={styles.examName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.examDesc} numberOfLines={1}>
                    {item.questionCount || 20} questões • Nota mínima: {item.minScore || 70}%
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Carregando cursos...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Vendedor'} 👋</Text>
                    <Text style={styles.subGreeting}>Continue sua jornada de aprendizado</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'courses' && styles.tabActive]}
                    onPress={() => setActiveTab('courses')}
                >
                    <Ionicons name="book" size={18} color={activeTab === 'courses' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'courses' && styles.tabTextActive]}>Cursos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'exams' && styles.tabActive]}
                    onPress={() => setActiveTab('exams')}
                >
                    <Ionicons name="document-text" size={18} color={activeTab === 'exams' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'exams' && styles.tabTextActive]}>Provas Avulsas</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'courses' ? (
                <FlatList
                    data={courses}
                    renderItem={renderCourseCard}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="book-outline" size={64} color={theme.colors.border} />
                            <Text style={styles.emptyTitle}>Nenhum curso disponível</Text>
                            <Text style={styles.emptySubtitle}>Os cursos serão exibidos aqui quando estiverem disponíveis.</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={standaloneExams}
                    renderItem={renderExamCard}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={64} color={theme.colors.border} />
                            <Text style={styles.emptyTitle}>Nenhuma prova avulsa</Text>
                            <Text style={styles.emptySubtitle}>Provas independentes aparecerão aqui.</Text>
                        </View>
                    }
                />
            )}
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
    loadingText: {
        marginTop: 12,
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    subGreeting: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        gap: 6,
    },
    tabActive: {
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
    },
    tabText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    tabTextActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    courseCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    courseCover: {
        width: '100%',
        height: 140,
        backgroundColor: theme.colors.background,
    },
    courseCoverPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseInfo: {
        padding: 16,
    },
    courseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    courseName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        marginRight: 8,
    },
    courseDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 6,
        lineHeight: 18,
    },
    courseMeta: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
        minWidth: 35,
        textAlign: 'right',
    },
    examCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    examIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    examInfo: {
        flex: 1,
    },
    examName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    examDesc: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
});
