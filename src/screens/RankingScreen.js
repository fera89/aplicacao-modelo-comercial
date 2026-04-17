import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, Animated } from 'react-native';
import { theme } from '../theme/Theme';
import { useApp } from '../context/AppContext';
import { FirebaseService } from '../services/FirebaseService';
import Ionicons from '@expo/vector-icons/Ionicons';

const MEDAL_COLORS = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

function getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
}

function getMonthLabel(month) {
    const [year, m] = month.split('-');
    const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${names[parseInt(m) - 1]}/${year}`;
}

function formatCountdown(deadline) {
    const diff = new Date(deadline) - new Date();
    if (diff <= 0) return 'Prazo encerrado';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
}

function formatDeadline(deadline) {
    return new Date(deadline).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ─── Animated progress bar ───────────────────────────────────────────────────
const ProgressBar = ({ current, target }) => {
    const pct = target > 0 ? Math.min((current / target), 1) : 0;
    const pctRounded = Math.round(pct * 100);
    const animWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animWidth, {
            toValue: pct,
            duration: 600,
            useNativeDriver: false,
        }).start();
    }, [pct]);

    const color = pctRounded >= 100 ? '#FFD700'
                : pctRounded >= 75  ? theme.colors.primary
                : pctRounded >= 40  ? '#f59e0b'
                : '#ef4444';

    return (
        <View style={styles.pbWrap}>
            <View style={styles.pbTrack}>
                <Animated.View style={[styles.pbFill, {
                    width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    backgroundColor: color
                }]} />
            </View>
            <Text style={[styles.pbPct, { color }]}>{pctRounded}%</Text>
        </View>
    );
};

// ─── Goal card ───────────────────────────────────────────────────────────────
const GoalCard = ({ goal }) => {
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        if (!goal?.deadline) return;
        const tick = () => setCountdown(formatCountdown(goal.deadline));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [goal?.deadline]);

    if (!goal) return null;

    const hasValue = goal.targetValue > 0;
    const hasQty   = goal.targetQuantity > 0;

    return (
        <View style={styles.goalCard}>
            <View style={styles.goalCardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle}>🎯 {goal.title || 'Meta do Mês'}</Text>
                    <View style={styles.goalTargetsRow}>
                        {hasValue && (
                            <View style={styles.goalChip}>
                                <Text style={styles.goalChipText}>
                                    💰 R$ {goal.targetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                        )}
                        {hasQty && (
                            <View style={styles.goalChip}>
                                <Text style={styles.goalChipText}>📦 {goal.targetQuantity} vendas</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {goal.deadline && (
                <View style={styles.goalFooter}>
                    <Text style={styles.goalDeadlineLabel}>
                        Prazo: {formatDeadline(goal.deadline)}
                    </Text>
                    <View style={styles.countdownBadge}>
                        <Text style={styles.countdownText}>{countdown}</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

// ─── Sales tab ───────────────────────────────────────────────────────────────
const SalesRanking = () => {
    const [sales, setSales]   = useState([]);
    const [goal, setGoal]     = useState(null);
    const [loading, setLoading] = useState(true);
    const month = getCurrentMonth();

    useEffect(() => {
        const unsub = FirebaseService.subscribeToSalesRanking(month, (data) => {
            setSales(data);
            setLoading(false);
        });
        return () => unsub && unsub();
    }, [month]);

    useEffect(() => {
        const unsub = FirebaseService.subscribeToSalesGoal(month, setGoal);
        return () => unsub && unsub();
    }, [month]);

    const totalValue = sales.reduce((s, r) => s + (r.value || 0), 0);
    const totalQty   = sales.reduce((s, r) => s + (r.quantity || 0), 0);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    return (
        <FlatList
            data={sales}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
                <>
                    <GoalCard goal={goal} />

                    {/* Summary card */}
                    <View style={styles.myCard}>
                        <View style={styles.myCardHalf}>
                            <Text style={styles.myCardLabel}>Total Vendas</Text>
                            <Text style={styles.myCardValue}>{totalQty}</Text>
                        </View>
                        <View style={styles.myCardDivider} />
                        <View style={styles.myCardHalf}>
                            <Text style={styles.myCardLabel}>Valor Total</Text>
                            <Text style={[styles.myCardValue, { fontSize: 15 }]}>
                                {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.monthLabel}>Competência: {getMonthLabel(month)}</Text>
                </>
            )}
            renderItem={({ item, index }) => {
                const position   = index + 1;
                const medalColor = MEDAL_COLORS[position];
                const hasValue   = goal?.targetValue > 0;
                const hasQty     = goal?.targetQuantity > 0;

                return (
                    <View style={styles.row}>
                        <View style={[styles.posBadge, medalColor && { backgroundColor: medalColor }]}>
                            <Text style={[styles.posText, medalColor && { color: '#FFF' }]}>{position}</Text>
                        </View>
                        {item.userPhotoURL
                            ? <Image source={{ uri: item.userPhotoURL }} style={styles.avatar} />
                            : <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
                              </View>
                        }
                        <View style={styles.rowInfo}>
                            <Text style={styles.rowName} numberOfLines={1}>
                                {item.userName || 'Vendedor'}
                            </Text>
                            <Text style={styles.rowSub}>
                                {item.quantity || 0} {(item.quantity || 0) === 1 ? 'venda' : 'vendas'}
                            </Text>
                            {hasValue && (
                                <ProgressBar current={item.value || 0} target={goal.targetValue} />
                            )}
                            {hasQty && (
                                <ProgressBar current={item.quantity || 0} target={goal.targetQuantity} />
                            )}
                        </View>
                        <View style={styles.scoreBox}>
                            <Text style={[styles.scoreMain, { fontSize: 13 }]}>
                                {(item.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </Text>
                            {hasValue && (
                                <Text style={[styles.scoreLabel, { color: theme.colors.primary }]}>
                                    {Math.round(((item.value || 0) / goal.targetValue) * 100)}% meta
                                </Text>
                            )}
                        </View>
                    </View>
                );
            }}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name="bar-chart-outline" size={64} color={theme.colors.border} />
                    <Text style={styles.emptyTitle}>Sem dados de vendas</Text>
                    <Text style={styles.emptySub}>O admin ainda não registrou as vendas deste mês.</Text>
                </View>
            }
        />
    );
};

// ─── Engagement tab ──────────────────────────────────────────────────────────
const EngagementRanking = ({ user }) => {
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter]   = useState('total');

    useEffect(() => {
        const unsub = FirebaseService.subscribeToRanking((data) => {
            setRanking(data);
            setLoading(false);
        });
        return () => unsub && unsub();
    }, []);

    const pointsField = filter === 'weekly' ? 'weeklyPoints' : filter === 'monthly' ? 'monthlyPoints' : 'totalPoints';

    const sorted = [...ranking]
        .sort((a, b) => (b[pointsField] || 0) - (a[pointsField] || 0))
        .map((item, i) => ({ ...item, position: i + 1 }));

    const mine = sorted.find(r => r.id === user?.id);

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    return (
        <FlatList
            data={sorted}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
                <>
                    <View style={styles.myCard}>
                        <View style={styles.myCardHalf}>
                            <Text style={styles.myCardLabel}>Sua Posição</Text>
                            <Text style={styles.myCardValue}>#{mine?.position || '-'}</Text>
                        </View>
                        <View style={styles.myCardDivider} />
                        <View style={styles.myCardHalf}>
                            <Text style={styles.myCardLabel}>Seus Pontos</Text>
                            <Text style={styles.myCardValue}>
                                {(mine?.[pointsField] || 0).toLocaleString('pt-BR')}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.filterRow}>
                        {[['Geral','total'],['Semanal','weekly'],['Mensal','monthly']].map(([label, val]) => (
                            <Text key={val}
                                style={[styles.filterBtn, filter === val && styles.filterBtnActive]}
                                onPress={() => setFilter(val)}>
                                {label}
                            </Text>
                        ))}
                    </View>
                </>
            )}
            renderItem={({ item }) => {
                const isMe       = item.id === user?.id;
                const pts        = item[pointsField] || 0;
                const medalColor = MEDAL_COLORS[item.position];
                return (
                    <View style={[styles.row, isMe && styles.rowMe]}>
                        <View style={[styles.posBadge, medalColor && { backgroundColor: medalColor }]}>
                            <Text style={[styles.posText, medalColor && { color: '#FFF' }]}>{item.position}</Text>
                        </View>
                        {item.photoURL
                            ? <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                            : <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
                              </View>
                        }
                        <View style={styles.rowInfo}>
                            <Text style={[styles.rowName, isMe && { color: theme.colors.primary }]} numberOfLines={1}>
                                {item.name || 'Vendedor'}{isMe ? ' (Você)' : ''}
                            </Text>
                            <View style={styles.badgesRow}>
                                {item.coursesCompleted > 0 && (
                                    <View style={styles.badge}>
                                        <Ionicons name="book" size={10} color={theme.colors.primary} />
                                        <Text style={styles.badgeText}>{item.coursesCompleted}</Text>
                                    </View>
                                )}
                                {item.certificatesEarned > 0 && (
                                    <View style={styles.badge}>
                                        <Ionicons name="ribbon" size={10} color="#FFD700" />
                                        <Text style={styles.badgeText}>{item.certificatesEarned}</Text>
                                    </View>
                                )}
                                {item.currentStreak >= 7 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>🔥 {item.currentStreak}d</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={styles.scoreBox}>
                            <Text style={[styles.scoreMain, isMe && { color: theme.colors.primary }]}>
                                {pts.toLocaleString('pt-BR')}
                            </Text>
                            <Text style={styles.scoreLabel}>pts</Text>
                        </View>
                    </View>
                );
            }}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name="trophy-outline" size={64} color={theme.colors.border} />
                    <Text style={styles.emptyTitle}>Ranking vazio</Text>
                    <Text style={styles.emptySub}>Complete cursos e provas para aparecer aqui!</Text>
                </View>
            }
        />
    );
};

// ─── Main screen ─────────────────────────────────────────────────────────────
export const RankingScreen = () => {
    const { user } = useApp();
    const [tab, setTab] = useState('vendas');

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🏆 Ranking</Text>
                <Text style={styles.headerSubtitle}>Quem está liderando a corrida?</Text>
                <View style={styles.tabRow}>
                    <Text style={[styles.tabBtn, tab === 'vendas'      && styles.tabBtnActive]} onPress={() => setTab('vendas')}>
                        💰 Vendas
                    </Text>
                    <Text style={[styles.tabBtn, tab === 'engajamento' && styles.tabBtnActive]} onPress={() => setTab('engajamento')}>
                        ⚡ Engajamento
                    </Text>
                </View>
            </View>

            {tab === 'vendas' ? <SalesRanking /> : <EngagementRanking user={user} />}
        </View>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: theme.colors.background },
    center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle:    { fontSize: 28, fontWeight: 'bold', color: theme.colors.text },
    headerSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },

    tabRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
    tabBtn: {
        paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20,
        fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary,
        backgroundColor: theme.colors.background, overflow: 'hidden',
    },
    tabBtnActive: { backgroundColor: theme.colors.primary, color: '#FFF' },

    // ─── Goal card ──────────────────────────────────────
    goalCard: {
        margin: 16,
        marginBottom: 8,
        padding: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(255,215,0,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.25)',
    },
    goalCardTop:    { flexDirection: 'row', alignItems: 'flex-start' },
    goalTitle:      { fontSize: 14, fontWeight: '700', color: '#b45309' },
    goalTargetsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 },
    goalChip: {
        backgroundColor: 'rgba(255,215,0,0.12)',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 10,
    },
    goalChipText: { fontSize: 12, fontWeight: '600', color: '#92400e' },

    goalFooter: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,215,0,0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    goalDeadlineLabel: { fontSize: 11, color: theme.colors.textSecondary },
    countdownBadge: {
        backgroundColor: 'rgba(255,215,0,0.15)',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 10,
    },
    countdownText: {
        fontSize: 13, fontWeight: '800',
        color: '#92400e',
        fontVariant: ['tabular-nums'],
    },

    // ─── Summary card ───────────────────────────────────
    myCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(46,125,50,0.08)',
        borderRadius: 16, padding: 16,
        marginHorizontal: 16, marginBottom: 8,
        borderWidth: 1, borderColor: 'rgba(46,125,50,0.2)',
    },
    myCardHalf:    { flex: 1, alignItems: 'center' },
    myCardDivider: { width: 1, backgroundColor: 'rgba(46,125,50,0.2)' },
    myCardLabel:   { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
    myCardValue:   { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary, marginTop: 4 },
    monthLabel:    { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 8 },

    filterRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
    filterBtn: {
        paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16,
        fontSize: 13, color: theme.colors.textSecondary,
        backgroundColor: theme.colors.surface, overflow: 'hidden', fontWeight: '500',
    },
    filterBtnActive: { backgroundColor: theme.colors.primary, color: '#FFF' },

    listContent: { paddingHorizontal: 16, paddingBottom: 100 },

    // ─── Rows ───────────────────────────────────────────
    row: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: theme.colors.surface,
        padding: 12, borderRadius: 12, marginBottom: 8,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    rowMe: { borderColor: theme.colors.primary, backgroundColor: 'rgba(46,125,50,0.03)' },

    posBadge: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: theme.colors.background,
        justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 4,
    },
    posText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },

    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, marginTop: 2 },
    avatarPlaceholder: {
        backgroundColor: theme.colors.background,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: theme.colors.border,
    },

    rowInfo:  { flex: 1, minWidth: 0 },
    rowName:  { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    rowSub:   { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

    badgesRow: { flexDirection: 'row', marginTop: 4, gap: 6 },
    badge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(46,125,50,0.08)',
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 2,
    },
    badgeText: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '500' },

    scoreBox:   { alignItems: 'flex-end', paddingLeft: 8, paddingTop: 2 },
    scoreMain:  { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
    scoreLabel: { fontSize: 10, color: theme.colors.textSecondary, textTransform: 'uppercase' },

    // ─── Progress bar ────────────────────────────────────
    pbWrap:  { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
    pbTrack: { flex: 1, height: 5, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
    pbFill:  { height: '100%', borderRadius: 3 },
    pbPct:   { fontSize: 10, fontWeight: '700', minWidth: 28, textAlign: 'right' },

    // ─── Empty state ─────────────────────────────────────
    empty:      { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginTop: 16 },
    emptySub:   { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },
});
