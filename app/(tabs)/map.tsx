import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Animated, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Avatar, IconButton, ActivityIndicator } from 'react-native-paper';
import { colors, spacing, borderRadius, glassStyles, fontSize } from '@/lib/theme';
import { useAuthStore, useConnectionsStore } from '@/stores';
import { checkNearbyConnections, createGPSProximityPass } from '@/lib/proximity';
import { NearbyUser } from '@/types';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const RADAR_SIZE = width * 0.85;

export default function MapScreen() {
    const { user: currentUser } = useAuthStore();
    const { connections } = useConnectionsStore();
    const [nearby, setNearby] = useState<NearbyUser[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const initMap = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        'Location Required',
                        'Please enable location services in your settings to use the radar.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: Linking.openSettings }
                        ]
                    );
                }
            } catch (error) {
                console.error('Map Permission request error:', error);
            }
            refreshNearby();
        };

        // Radar Animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                })
            ])
        ).start();

        initMap();
        const interval = setInterval(refreshNearby, 15000); // 15s refresh
        return () => clearInterval(interval);
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshNearby();
        setRefreshing(false);
    };

    const refreshNearby = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const nearbyUsers = await checkNearbyConnections(currentUser.id);
            setNearby(nearbyUsers);
        } catch (error) {
            console.error('Error refreshing nearby:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickRate = (userId: string) => {
        router.push(`/user/${userId}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlow} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Liquid Radar</Text>
                <IconButton
                    icon="refresh"
                    iconColor={colors.primary}
                    onPress={refreshNearby}
                    loading={loading}
                />
            </View>

            <View style={styles.radarContainer}>
                {/* Visual Radar Rings */}
                <View style={styles.radarRingLarge} />
                <View style={styles.radarRingMedium} />
                <View style={styles.radarRingSmall} />

                {/* Animated Pulse */}
                <Animated.View
                    style={[
                        styles.radarPulse,
                        {
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseAnim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.6, 0.3, 0]
                            })
                        }
                    ]}
                />

                {/* Center User */}
                <View style={styles.centerOuter}>
                    <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                    <Avatar.Image
                        size={60}
                        source={{ uri: currentUser?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me' }}
                    />
                    <View style={styles.centerGlow} />
                </View>

                {/* Nearby Users Map Plot */}
                {nearby.map((nu, index) => {
                    // Logic to spread them around the radar (Mock positioning if real GPS isn't exact)
                    const angle = (index * (360 / Math.max(nearby.length, 1))) * (Math.PI / 180);
                    const distance = 80 + (Math.random() * 40); // Within radar bounds
                    const x = Math.cos(angle) * distance;
                    const y = Math.sin(angle) * distance;

                    return (
                        <TouchableOpacity
                            key={nu.user.id}
                            style={[styles.nearbyUser, { transform: [{ translateX: x }, { translateY: y }] }]}
                            onPress={() => handleQuickRate(nu.user.id)}
                        >
                            <View style={styles.userGlass}>
                                <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
                                <Avatar.Image size={44} source={{ uri: nu.user.avatar_url || '' }} />
                                <View style={styles.glossyReflection} />
                            </View>
                            <View style={styles.userStatusDot} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView
                contentContainerStyle={styles.nearbyList}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                <Text style={styles.sectionTitle}>PROXIMITY PROTOCOL</Text>
                {nearby.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                        <Text style={styles.emptyText}>Scanning for nearby identities...</Text>
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 15 }} />
                    </View>
                ) : (
                    nearby.map(nu => (
                        <TouchableOpacity
                            key={nu.user.id}
                            style={styles.nearbyCard}
                            onPress={() => handleQuickRate(nu.user.id)}
                        >
                            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                            <Avatar.Image size={50} source={{ uri: nu.user.avatar_url || '' }} />
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardName}>{nu.user.name}</Text>
                                <Text style={styles.cardScore}>{nu.user.big_score?.toFixed(1)} INDEX</Text>
                            </View>
                            <IconButton icon="star-face" iconColor={colors.accent} size={24} />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
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
        top: -150,
        right: -150,
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: colors.primary,
        opacity: 0.05,

    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: 1,
    },
    radarContainer: {
        height: RADAR_SIZE,
        width: RADAR_SIZE,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginVertical: spacing.xl,
    },
    radarRingLarge: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: RADAR_SIZE / 2,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.1)',
        backgroundColor: 'rgba(14, 165, 233, 0.02)',
    },
    radarRingMedium: {
        position: 'absolute',
        width: '70%',
        height: '70%',
        borderRadius: (RADAR_SIZE * 0.7) / 2,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.15)',
    },
    radarRingSmall: {
        position: 'absolute',
        width: '40%',
        height: '40%',
        borderRadius: (RADAR_SIZE * 0.4) / 2,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.2)',
    },
    radarPulse: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: RADAR_SIZE / 2,
        backgroundColor: colors.primary,
    },
    centerOuter: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
        overflow: 'hidden',
    },
    centerGlow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: colors.primary,
        opacity: 0.1,
    },
    nearbyUser: {
        position: 'absolute',
        width: 54,
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userGlass: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderWidth: 1.5,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...glassStyles.glow,
    },
    glossyReflection: {
        position: 'absolute',
        top: 2,
        left: '20%',
        width: '30%',
        height: '20%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 10,
    },
    userStatusDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.success,
        borderWidth: 2,
        borderColor: '#fff',
    },
    nearbyList: {
        padding: spacing.xl,
        paddingBottom: 120,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.textMuted,
        letterSpacing: 2,
        marginBottom: spacing.lg,
    },
    emptyBox: {
        ...glassStyles.container,
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    nearbyCard: {
        ...glassStyles.container,
        flexDirection: 'row',
        padding: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    cardInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    cardName: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.text,
    },
    cardScore: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.primary,
        marginTop: 2,
    },
});
