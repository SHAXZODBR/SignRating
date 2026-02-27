import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform, Alert, RefreshControl } from 'react-native';
import { ActivityIndicator, Button, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore, useConnectionsStore } from '@/stores';
import { Connection } from '@/types';
import { checkNearbyConnections } from '@/lib/proximity';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';

export default function HomeScreen() {
    const { user, setUser } = useAuthStore();
    const { connections, pendingRequests, fetchConnections, fetchPendingRequests, acceptRequest, declineRequest, loading } = useConnectionsStore();
    const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (user) {
            const initHome = async () => {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert(
                            'Location Required',
                            'Enable location services to see nearby connections automatically.',
                            [
                                { text: 'Okay', style: 'cancel' },
                                { text: 'Settings', onPress: Linking.openSettings }
                            ]
                        );
                    }
                } catch (error) {
                    console.error('Permission request error:', error);
                }
                loadData();
            };

            initHome();

            // Real-time connections subscription
            const connSub = supabase
                .channel('connections_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'connections',
                    filter: `user_b=eq.${user.id}`
                }, () => fetchPendingRequests(user.id))
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'connections',
                    filter: `user_a=eq.${user.id}`
                }, () => fetchConnections(user.id))
                .subscribe();

            // Real-time interaction passes subscription (Incoming requests)
            const passSub = supabase
                .channel('passes_changes')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'interaction_passes',
                    filter: `user_b=eq.${user.id}`
                }, (payload) => {
                    Alert.alert('Protocol Interaction', 'A new handshake encounter has been initiated.');
                    router.push(`/rate/${payload.new.id}`);
                })
                .subscribe();

            // Real-time ratings subscription (Score updates)
            const ratingSub = supabase
                .channel('ratings_revealed')
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'ratings',
                    filter: `ratee_id=eq.${user.id}`
                }, async (payload) => {
                    if (payload.new.revealed && !payload.old.revealed) {
                        // Rating was just revealed!
                        Alert.alert('Index Updated', 'A new reputation record has been decrypted. Your Trust Index has been recalibrated.');

                        // Re-fetch user data to update big_score in store
                        const { data: updatedUser } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', user.id)
                            .single();

                        if (updatedUser) setUser(updatedUser);
                    }
                })
                .subscribe();

            const interval = setInterval(handleCheckNearby, 30000);
            return () => {
                clearInterval(interval);
                connSub.unsubscribe();
                passSub.unsubscribe();
                ratingSub.unsubscribe();
            };
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

    const handleAccept = async (connectionId: string) => {
        await acceptRequest(connectionId);
        Alert.alert('Connected! 🤝', 'Handshake accepted successfully.');
    };

    const handleDecline = async (connectionId: string) => {
        Alert.alert(
            'Decline Request',
            'Are you sure you want to decline this handshake?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        await declineRequest(connectionId);
                    }
                },
            ]
        );
    };

    const renderPendingRequest = ({ item }: { item: Connection }) => {
        // The requester is user_a (they sent the request)
        const requester = item.user_a_data;
        if (!requester) return null;

        return (
            <View style={styles.pendingCard}>
                <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                <View style={styles.pendingCardReflection} />

                <TouchableOpacity
                    style={styles.pendingInfo}
                    onPress={() => router.push(`/user/${requester.id}`)}
                >
                    <View style={styles.avatarWrapperMini}>
                        <Image
                            source={{ uri: requester.avatar_url || 'https://via.placeholder.com/100' }}
                            style={styles.avatar}
                        />
                    </View>
                    <View style={styles.userInfoMini}>
                        <Text style={styles.userNameMini}>{requester.name}</Text>
                        <Text style={styles.userHandleMini}>@{requester.username}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.pendingActions}>
                    <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleDecline(item.id)}
                    >
                        <Text style={styles.declineBtnText}>✕</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAccept(item.id)}
                    >
                        <Text style={styles.acceptBtnText}>✓ Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderConnection = ({ item }: { item: Connection }) => {
        const otherUser = item.user_a === user?.id ? item.user_b_data : item.user_a_data;

        return (
            <View style={styles.glassCard}>
                <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                <View style={styles.cardReflection} />

                <View style={styles.cardContent}>
                    <TouchableOpacity
                        style={styles.cardInfo}
                        onPress={() => router.push(`/user/${otherUser?.id}`)}
                    >
                        <View style={styles.avatarWrapperMini}>
                            <Image
                                source={{ uri: otherUser?.avatar_url || 'https://via.placeholder.com/100' }}
                                style={styles.avatar}
                            />
                        </View>
                        <View style={styles.userInfoMini}>
                            <Text style={styles.userNameMini}>{otherUser?.name}</Text>
                            <Text style={styles.userHandleMini}>@{otherUser?.username}</Text>
                        </View>
                        <View style={styles.scoreBadgeMini}>
                            <Text style={styles.scoreTextMini}>⭐ {otherUser?.big_score?.toFixed(1) || '0.0'}</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.actionRowMini}>
                        <TouchableOpacity style={styles.actionBtnMini} onPress={() => handleCreatePass(item, 'meet')}>
                            <Text style={styles.actionEmojiMini}>🤝</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnMini} onPress={() => handleCreatePass(item, 'call')}>
                            <Text style={styles.actionEmojiMini}>📞</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnMini} onPress={() => handleCreatePass(item, 'chat')}>
                            <Text style={styles.actionEmojiMini}>💬</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    // Combine pending + connections for header section rendering
    const listData = connections;

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
                data={listData}
                renderItem={renderConnection}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListHeaderComponent={
                    pendingRequests.length > 0 ? (
                        <View style={styles.pendingSection}>
                            <Text style={styles.sectionLabel}>INCOMING HANDSHAKES</Text>
                            {pendingRequests.map((req) => (
                                <View key={req.id}>
                                    {renderPendingRequest({ item: req })}
                                </View>
                            ))}
                            <View style={styles.sectionDivider} />
                            <Text style={styles.sectionLabel}>YOUR CONNECTIONS</Text>
                        </View>
                    ) : null
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
    // Pending requests section
    pendingSection: {
        marginBottom: spacing.md,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.textMuted,
        letterSpacing: 2,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.04)',
        marginVertical: spacing.lg,
    },
    pendingCard: {
        ...glassStyles.container,
        marginBottom: spacing.sm,
        padding: spacing.md,
        backgroundColor: 'rgba(245, 158, 11, 0.04)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    pendingCardReflection: {
        position: 'absolute',
        top: 3,
        left: '5%',
        width: '30%',
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 5,
    },
    pendingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    pendingActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    declineBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.15)',
    },
    declineBtnText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '900',
    },
    acceptBtn: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.lg,
        paddingVertical: 10,
        borderRadius: 20,
    },
    acceptBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
    },
    // Connection cards
    glassCard: {
        ...glassStyles.container,
        marginBottom: spacing.sm,
        padding: spacing.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        borderColor: 'rgba(255, 255, 255, 0.95)',
    },
    cardReflection: {
        position: 'absolute',
        top: 3,
        left: '5%',
        width: '30%',
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 5,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarWrapperMini: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#fff',
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    userInfoMini: {
        marginLeft: spacing.sm,
        flex: 1,
    },
    userNameMini: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
    },
    userHandleMini: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    scoreBadgeMini: {
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        marginRight: spacing.sm,
    },
    scoreTextMini: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '800',
    },
    actionRowMini: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtnMini: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    actionEmojiMini: {
        fontSize: 18,
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
