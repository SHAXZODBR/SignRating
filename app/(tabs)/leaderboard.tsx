import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Platform } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/types';

export default function LeaderboardScreen() {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

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

    const renderLeader = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const isTop3 = index < 3;
        const colors_top = [colors.accent, '#94A3B8', '#B45309'];

        return (
            <View style={[styles.leaderGlass, isTop3 && styles.topCard]}>
                <BlurView intensity={isTop3 ? 70 : 40} tint="light" style={StyleSheet.absoluteFill} />
                {/* Liquid Gloss Reflection */}
                <View style={styles.cardReflection} />

                <View style={styles.rankBox}>
                    <Text style={[styles.rankText, isTop3 && { color: colors_top[index] }]}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </Text>
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
                <Text style={styles.title}>Global Trust</Text>
            </View>

            <FlatList
                data={leaders}
                renderItem={renderLeader}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    loading ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgGlow: { position: 'absolute', top: -100, left: -50, width: 450, height: 450, borderRadius: 225, backgroundColor: colors.primaryLight, opacity: 0.1, filter: Platform.OS === 'web' ? 'blur(100px)' : undefined },
    header: { padding: spacing.xl, paddingBottom: spacing.md },
    topLabel: { fontSize: 12, fontWeight: '900', color: colors.primary, letterSpacing: 5 },
    title: { fontSize: 36, fontWeight: '900', color: colors.text, marginTop: 4 },
    list: { padding: spacing.md, paddingBottom: 110 },
    leaderGlass: {
        ...glassStyles.container,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        marginBottom: spacing.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        borderColor: 'rgba(255, 255, 255, 0.95)',
        shadowColor: '#fff',
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    cardReflection: {
        position: 'absolute',
        top: 4,
        left: '10%',
        width: '30%',
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 5,
    },
    topCard: { paddingVertical: spacing.lg, borderColor: 'rgba(245, 158, 11, 0.25)', backgroundColor: 'rgba(255, 248, 230, 0.5)' },
    rankBox: { width: 50, alignItems: 'center' },
    rankText: { fontSize: 18, fontWeight: '900', color: colors.textMuted },
    avatarWrapper: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#fff' },
    avatar: { width: '100%', height: '100%' },
    info: { flex: 1, marginLeft: spacing.md },
    name: { fontSize: 16, fontWeight: '900', color: colors.text },
    handle: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    scoreBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
    scoreValue: { fontSize: 16, fontWeight: '900', color: colors.accent },
    scoreStar: { fontSize: 10, marginLeft: 2 },
    loader: { marginTop: 100 },
});
