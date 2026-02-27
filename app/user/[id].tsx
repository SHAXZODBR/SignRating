import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useState, useEffect } from 'react';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore, useConnectionsStore } from '@/stores';
import { User, Connection } from '@/types';
import { checkNearbyConnections, createGPSProximityPass } from '@/lib/proximity';

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user: currentUser, isBypass } = useAuthStore();
    const { fetchConnections, blockUser } = useConnectionsStore();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [connection, setConnection] = useState<Connection | null>(null);
    const [isNearby, setIsNearby] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, [id]);

    const fetchUserData = async () => {
        if (!id) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setUser(data);

            if (currentUser) {
                const { data: conn } = await supabase
                    .from('connections')
                    .select('*')
                    .or(`and(user_a.eq.${currentUser.id},user_b.eq.${id}),and(user_a.eq.${id},user_b.eq.${currentUser.id})`)
                    .single();

                setConnection(conn);
                const nearby = await checkNearbyConnections(currentUser.id);
                setIsNearby(nearby.some(nu => nu.user.id === id));
            }
        } catch (error: any) {
            console.error('Fetch user error:', error);
            Alert.alert('Protocol Error', 'Failed to synchronize user handshake data.');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!currentUser || !user) return;
        setActionLoading(true);

        try {
            const { data, error } = await supabase
                .from('connections')
                .insert({ user_a: currentUser.id, user_b: user.id, status: 'pending' })
                .select()
                .single();

            if (error) throw error;
            setConnection(data);
            Alert.alert('Protocol Initiated', `Handshake requested with ${user.name}`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreatePass = async (type: 'meet' | 'call' | 'chat') => {
        if (!currentUser || !user) return;
        setActionLoading(true);

        try {
            const { data, error } = await supabase
                .from('interaction_passes')
                .insert({ type, user_a: currentUser.id, user_b: user.id, status: 'pending' })
                .select()
                .single();

            if (error) throw error;
            router.push(`/rate/${data.id}`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBlockUser = () => {
        if (!currentUser || !user) return;
        Alert.alert(
            'Block User',
            `Are you sure you want to block ${user.name}? This will remove your connection and they won't be able to contact you.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        await blockUser(currentUser.id, user.id);
                        setActionLoading(false);
                        Alert.alert('Blocked', `${user.name} has been blocked.`);
                        router.back();
                    }
                },
            ]
        );
    };

    if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
    if (!user) return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" iconColor={colors.text} size={30} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Not Found</Text>
                <View style={{ width: 44 }} />
            </View>
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyText}>Profile not found</Text>
            </View>
        </SafeAreaView>
    );

    const isMutual = connection?.status === 'accepted';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlow} />

            <View style={styles.header}>
                <IconButton icon="chevron-left" iconColor={colors.text} size={30} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Interaction Profile</Text>
                {currentUser?.id !== user.id ? (
                    <IconButton icon="block-helper" iconColor={colors.error} size={22} onPress={handleBlockUser} />
                ) : (
                    <View style={{ width: 44 }} />
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileBox}>
                    <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={glassStyles.reflection} />
                    <View style={styles.glossyTop} />

                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: user.avatar_url || 'https://via.placeholder.com/200' }} style={styles.avatar} />
                        {isNearby && <View style={styles.nearbyBadge}><Text style={styles.nearbyText}>NEARBY 📍</Text></View>}
                    </View>

                    <Text style={styles.name}>{user.name}</Text>
                    <Text style={styles.handle}>@{user.username}</Text>

                    <View style={styles.scoreGlass}>
                        <Text style={styles.scoreValue}>{user.big_score?.toFixed(1) || '0.0'}</Text>
                        <Text style={styles.scoreLabel}>TRUST INDEX ⭐</Text>
                    </View>

                    {currentUser?.id !== user.id && (
                        <View style={styles.actionContainer}>
                            {actionLoading ? (
                                <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
                            ) : !connection ? (
                                <Button mode="contained" onPress={handleConnect} style={styles.primaryBtn} labelStyle={styles.btnLabel}>
                                    Connect Handshake
                                </Button>
                            ) : connection.status === 'pending' ? (
                                <View style={styles.statusBox}>
                                    <Text style={styles.statusLabel}>PROTOCOL PENDING</Text>
                                    <Text style={styles.statusSub}>Waiting for mutual acknowledgement.</Text>
                                </View>
                            ) : isMutual ? (
                                <View style={styles.connectedBox}>
                                    {isNearby ? (
                                        <Button
                                            mode="contained"
                                            onPress={async () => {
                                                if (currentUser && user) {
                                                    setActionLoading(true);
                                                    try {
                                                        const passId = await createGPSProximityPass(currentUser.id, user.id);
                                                        if (passId) router.push(`/rate/${passId}`);
                                                    } catch (err: any) {
                                                        Alert.alert('Error', err.message);
                                                    } finally {
                                                        setActionLoading(false);
                                                    }
                                                }
                                            }}
                                            style={styles.nearbyBtn}
                                            labelStyle={styles.btnLabel}
                                        >
                                            📍 Rate Encounter
                                        </Button>
                                    ) : (
                                        <>
                                            <Text style={styles.interactionTitle}>CREATE INTERACTION PASS</Text>
                                            <View style={styles.passRow}>
                                                <TouchableOpacity style={styles.passBtn} onPress={() => handleCreatePass('meet')}>
                                                    <Text style={styles.passEmoji}>🤝</Text>
                                                    <Text style={styles.passLabel}>Meet</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.passBtn} onPress={() => handleCreatePass('call')}>
                                                    <Text style={styles.passEmoji}>📞</Text>
                                                    <Text style={styles.passLabel}>Call</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.passBtn} onPress={() => handleCreatePass('chat')}>
                                                    <Text style={styles.passEmoji}>💬</Text>
                                                    <Text style={styles.passLabel}>Chat</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.statusBox}>
                                    <Text style={styles.statusLabel}>CONNECTION RESTRICTED</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    bgGlow: {
        position: 'absolute',
        bottom: -50,
        left: -50,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.secondary,
        opacity: 0.06,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xs,
        height: 50,
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
    scrollContent: { padding: spacing.md },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
    emptyText: { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
    profileBox: {
        ...glassStyles.container,
        padding: spacing.lg,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        borderColor: 'rgba(255, 255, 255, 0.95)',
    },
    glossyTop: {
        position: 'absolute',
        top: 4,
        width: '50%',
        height: 2.5,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 5,
    },
    avatarContainer: { marginBottom: spacing.md, position: 'relative' },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: '#fff' },
    nearbyBadge: { position: 'absolute', bottom: -5, backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, alignSelf: 'center', shadowColor: colors.success, shadowOpacity: 0.2, shadowRadius: 4 },
    nearbyText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    name: { fontSize: 26, fontWeight: '900', color: colors.text },
    handle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg, fontWeight: '500' },
    scoreGlass: { backgroundColor: 'rgba(0,0,0,0.015)', width: '100%', padding: spacing.lg, borderRadius: 20, alignItems: 'center', marginBottom: spacing.lg },
    scoreValue: { fontSize: 50, fontWeight: '900', color: colors.accent },
    scoreLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
    actionContainer: { width: '100%' },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 6 },
    nearbyBtn: { backgroundColor: colors.success, borderRadius: 14, paddingVertical: 6 },
    btnLabel: { fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
    statusBox: { alignItems: 'center', padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 14 },
    statusLabel: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1.5 },
    statusSub: { fontSize: 10, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
    connectedBox: { width: '100%', alignItems: 'center' },
    interactionTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, marginBottom: spacing.md, letterSpacing: 1.5 },
    passRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    passBtn: { flex: 1, alignItems: 'center', padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 14, marginHorizontal: 4, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.9)' },
    passEmoji: { fontSize: 22, marginBottom: 2 },
    passLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
});
