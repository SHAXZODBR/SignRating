import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform, Alert, RefreshControl } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore, useConnectionsStore } from '@/stores';
import { Connection } from '@/types';
import { checkNearbyConnections } from '@/lib/proximity';

export default function HomeScreen() {
    const { user } = useAuthStore();
    const { connections, fetchConnections, fetchPendingRequests, loading } = useConnectionsStore();
    const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
            const interval = setInterval(handleCheckNearby, 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        await Promise.all([
            fetchConnections(user.id),
            fetchPendingRequests(user.id),
            handleCheckNearby()
        ]);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleCheckNearby = async () => {
        if (!user) return;
        try {
            const nearby = await checkNearbyConnections(user.id);
            setNearbyUsers(nearby);
        } catch (error) {
            console.error('Nearby check error:', error);
        }
    };

    const handleCreatePass = async (connection: Connection, type: 'meet' | 'call' | 'chat') => {
        const otherUserId = connection.user_a === user?.id ? connection.user_b : connection.user_a;
        try {
            const { data, error } = await supabase
                .from('interaction_passes')
                .insert({
                    type,
                    user_a: user?.id,
                    user_b: otherUserId,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;
            router.push(`/rate/${data.id}`);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create pass');
        }
    };

    const renderConnection = ({ item }: { item: Connection }) => {
        const otherUser = item.user_a === user?.id ? item.user_b_data : item.user_a_data;

        return (
            <View style={styles.glassCard}>
                <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                {/* Gloss Reflection */}
                <View style={styles.cardReflection} />

                <TouchableOpacity
                    style={styles.cardInfo}
                    onPress={() => router.push(`/user/${otherUser?.id}`)}
                >
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: otherUser?.avatar_url || 'https://via.placeholder.com/100' }}
                            style={styles.avatar}
                        />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{otherUser?.name}</Text>
                        <Text style={styles.userHandle}>@{otherUser?.username}</Text>
                    </View>
                    <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>⭐ {otherUser?.big_score?.toFixed(1) || '0.0'}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleCreatePass(item, 'meet')}>
                        <Text style={styles.actionEmoji}>🤝</Text>
                        <Text style={styles.actionLabel}>Meet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleCreatePass(item, 'call')}>
                        <Text style={styles.actionEmoji}>📞</Text>
                        <Text style={styles.actionLabel}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleCreatePass(item, 'chat')}>
                        <Text style={styles.actionEmoji}>💬</Text>
                        <Text style={styles.actionLabel}>Chat</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlow} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>REAL WORLD</Text>
                    <Text style={styles.title}>Reputation</Text>
                </View>
            </View>

            <FlatList
                data={connections}
                renderItem={renderConnection}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator style={styles.loader} color={colors.primary} />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🌊</Text>
                            <Text style={styles.emptyTitle}>Liquid State</Text>
                            <Text style={styles.emptyText}>Find humans to start building your collective score.</Text>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    bgGlow: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: colors.primaryLight,
        opacity: 0.12,
        filter: Platform.OS === 'web' ? 'blur(100px)' : undefined,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        marginTop: spacing.md,
    },
    greeting: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '900',
        letterSpacing: 4,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: colors.text,
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: 110,
    },
    glassCard: {
        ...glassStyles.container,
        marginBottom: spacing.md,
        padding: spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        borderColor: 'rgba(255, 255, 255, 0.95)',
        shadowColor: '#fff',
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    cardReflection: {
        position: 'absolute',
        top: 5,
        left: '5%',
        width: '40%',
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 5,
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#fff',
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    userInfo: {
        marginLeft: spacing.md,
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.text,
    },
    userHandle: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    scoreBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    scoreText: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '900',
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.03)',
    },
    actionBtn: {
        flex: 1,
        alignItems: 'center',
    },
    actionEmoji: {
        fontSize: 22,
        marginBottom: 4,
    },
    actionLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    loader: {
        marginTop: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
    },
    emptyText: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 50,
        marginTop: 12,
        fontWeight: '500',
        lineHeight: 22,
    },
});
