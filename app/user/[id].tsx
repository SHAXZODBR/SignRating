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
    const { fetchConnections } = useConnectionsStore();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [connection, setConnection] = useState<Connection | null>(null);
    const [isNearby, setIsNearby] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, [id]);

    const fetchUserData = async () => {
        if (!id) return;
        setLoading(true);

        const isBypass = useAuthStore.getState().isBypass;

        // Bypass logic for testing
        if (isBypass && id === '00000000-0000-0000-0000-000000000001') {
            console.log('Bypass: Loading mock user data');
            const mockUser: User = {
                id: id,
                email: 'test01@reputation.protocol',
                name: 'Test Identity 01',
                username: 'test01',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test01',
                big_score: 4.8,
                total_ratings: 12,
                created_at: new Date().toISOString()
            };
            setUser(mockUser);
            setLoading(false);
            return;
        }

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
        } catch (error) {
            console.error('Fetch user error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!currentUser || !user) return;

        // Bypass logic for testing
        if (isBypass) {
            console.log('Bypass: Simulating connection request');
            const mockConn: Connection = {
                id: 'mock-conn-' + Math.random().toString(36).substring(7),
                user_a: currentUser.id,
                user_b: user.id,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            setConnection(mockConn);
            Alert.alert('Protocol Initiated (Bypass)', `Handshake requested with ${user.name}`);
            return;
        }

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
        }
    };

    const handleCreatePass = async (type: 'meet' | 'call' | 'chat') => {
        if (!currentUser || !user) return;

        // Bypass logic for testing
        if (isBypass) {
            console.log('Bypass: Simulating pass creation');
            const mockPassId = 'mock-pass-' + Math.random().toString(36).substring(7);
            router.push(`/rate/${mockPassId}`);
            return;
        }

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
        }
    };

    if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
    if (!user) return <View style={styles.container}><Text>No profile found</Text></View>;

    const isMutual = connection?.status === 'accepted';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlow} />

            <View style={styles.header}>
                <IconButton icon="chevron-left" iconColor={colors.text} size={30} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Interaction Profile</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileBox}>
                    <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={glassStyles.reflection} />
                    {/* Gloss Reflection */}
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
                            {!connection ? (
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
                                                    const passId = await createGPSProximityPass(currentUser.id, user.id);
                                                    if (passId) router.push(`/rate/${passId}`);
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
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    bgGlow: {
        position: 'absolute',
        bottom: -100,
        left: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: colors.secondary,
        opacity: 0.08,
        filter: Platform.OS === 'web' ? 'blur(100px)' : undefined,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
    },
    headerTitle: { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: 1 },
    scrollContent: { padding: spacing.lg },
    profileBox: {
        ...glassStyles.container,
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        borderColor: 'rgba(255, 255, 255, 0.95)',
    },
    glossyTop: {
        position: 'absolute',
        top: 5,
        width: '60%',
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 5,
    },
    avatarContainer: { marginBottom: spacing.lg, position: 'relative' },
    avatar: { width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: '#fff' },
    nearbyBadge: { position: 'absolute', bottom: -5, backgroundColor: colors.success, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, alignSelf: 'center', shadowColor: colors.success, shadowOpacity: 0.3, shadowRadius: 5 },
    nearbyText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    name: { fontSize: 30, fontWeight: '900', color: colors.text },
    handle: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.xl, fontWeight: '600' },
    scoreGlass: { backgroundColor: 'rgba(0,0,0,0.02)', width: '100%', padding: spacing.xl, borderRadius: 24, alignItems: 'center', marginBottom: spacing.xl },
    scoreValue: { fontSize: 60, fontWeight: '900', color: colors.accent },
    scoreLabel: { fontSize: 12, fontWeight: '900', color: colors.primary, letterSpacing: 3 },
    actionContainer: { width: '100%' },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 8 },
    nearbyBtn: { backgroundColor: colors.success, borderRadius: 18, paddingVertical: 8 },
    btnLabel: { fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    statusBox: { alignItems: 'center', padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 16 },
    statusLabel: { fontSize: 12, fontWeight: '900', color: colors.textMuted, letterSpacing: 2 },
    statusSub: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
    connectedBox: { width: '100%', alignItems: 'center' },
    interactionTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, marginBottom: spacing.md, letterSpacing: 2 },
    passRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    passBtn: { flex: 1, alignItems: 'center', padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, marginHorizontal: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)' },
    passEmoji: { fontSize: 26, marginBottom: 4 },
    passLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
});
