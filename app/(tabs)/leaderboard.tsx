import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Platform, RefreshControl } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { translations } from '@/lib/i18n';
import { useSettingsStore } from '@/stores';

export default function LeaderboardScreen() {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { language } = useSettingsStore();
    const t = translations[language];

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, username, avatar_url, big_score, total_ratings')
                .order('big_score', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLeaders(data || []);
        } catch (error) {
            console.error('Leaderboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchLeaderboard();
        setRefreshing(false);
    };

    const renderLeader = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const isTop3 = index < 3;
        const colors_top = [colors.accent, '#94A3B8', '#B45309'];

        return (
            <View style={[styles.leaderGlass, isTop3 && styles.topCard]}>
                <BlurView intensity={isTop3 ? 70 : 40} tint="light" style={StyleSheet.absoluteFill} />
                <View style={styles.cardReflection} />

                <View style={styles.rankBox}>
                    {index === 0 ? (
                        <MaterialCommunityIcons name="trophy" size={24} color="#F59E0B" />
                    ) : index === 1 ? (
                        <MaterialCommunityIcons name="trophy-outline" size={20} color="#94A3B8" />
                    ) : index === 2 ? (
                        <MaterialCommunityIcons name="trophy-variant-outline" size={18} color="#B45309" />
                    ) : (
                        <Text style={styles.rankText}>{index + 1}</Text>
                    )}
                </View>

                <View style={styles.avatarWrapper}>
                    <Image source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }} style={styles.avatar} />
                </View>

                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.handle}>@{item.username}</Text>
                </View>

                <View style={styles.scoreBox}>
                    <Text style={styles.scoreValue}>{item.big_score?.toFixed(1) || '0.0'}</Text>
                    <Text style={styles.scoreStar}>⭐</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlow} />

            <View style={styles.header}>
                <Text style={styles.topLabel}>LIQUID ELITE</Text>
                <Text style={styles.title}>{t.leaderboard}</Text>
            </View>

            <FlatList
                data={leaders}
                renderItem={renderLeader}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator style={styles.loader} color={colors.primary} />
                    ) : (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyEmoji}>🏆</Text>
                            <Text style={styles.emptyText}>No reputation leaders yet</Text>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgGlow: { position: 'absolute', top: -100, left: -50, width: 450, height: 450, borderRadius: 225, backgroundColor: colors.primaryLight, opacity: 0.1 },
    header: { padding: spacing.lg, paddingBottom: spacing.sm },
    topLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 3 },
    title: { fontSize: 32, fontWeight: '900', color: colors.text, marginTop: 2 },
    list: { padding: spacing.sm, paddingBottom: 110 },
    leaderGlass: {
        ...glassStyles.container,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        marginBottom: 6,
        backgroundColor: colors.glass,
        borderColor: colors.glassBorder,
    },
    cardReflection: {
        position: 'absolute',
        top: 3,
        left: '10%',
        width: '30%',
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 5,
    },
    topCard: { paddingVertical: spacing.md, borderColor: 'rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(255, 248, 230, 0.5)' },
    rankBox: { width: 40, alignItems: 'center' },
    rankText: { fontSize: 16, fontWeight: '900', color: colors.textMuted },
    avatarWrapper: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#fff' },
    avatar: { width: '100%', height: '100%' },
    info: { flex: 1, marginLeft: spacing.sm },
    name: { fontSize: 15, fontWeight: '800', color: colors.text },
    handle: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    scoreBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    scoreValue: { fontSize: 15, fontWeight: '900', color: colors.accent },
    scoreStar: { fontSize: 10, marginLeft: 2 },
    loader: { marginTop: 100 },
    emptyBox: { alignItems: 'center', marginTop: 100 },
    emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
    emptyText: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
});
