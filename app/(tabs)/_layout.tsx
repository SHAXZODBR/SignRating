import React from 'react';
import { Tabs, router } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, spacing, borderRadius } from '@/lib/theme';
import { Text } from 'react-native-paper';

const TAB_BAR_MARGIN = 16;

// Custom Tab Icon Component
function TabIcon({ emoji, focused, label, width }: { emoji: string; focused: boolean; label: string; width: number }) {
    return (
        <View style={[styles.tabItem, { width: width / 5 }]}>
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                <Text style={[styles.tabEmoji, { opacity: focused ? 1 : 0.6, transform: [{ scale: focused ? 1.2 : 1 }] }]}>
                    {emoji}
                </Text>
            </View>
            <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.textMuted, opacity: focused ? 1 : 0.8 }]}>
                {label}
            </Text>
        </View>
    );
}

// Custom Floating Action Button for Scanner
function ScannerButton({ onPress, width }: { onPress: () => void; width: number }) {
    return (
        <View style={[styles.scannerWrapper, { width: width / 5 }]}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onPress}
                style={styles.scannerButton}
            >
                <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill}>
                    <View style={styles.scannerInner}>
                        <Text style={styles.scannerEmoji}>📸</Text>
                    </View>
                    <View style={styles.reflection} />
                </BlurView>
            </TouchableOpacity>
        </View>
    );
}

export default function TabsLayout() {
    const { width } = Dimensions.get('window');
    const tabBarWidth = width - (TAB_BAR_MARGIN * 2);
    const itemWidth = tabBarWidth / 5;

    return (
        <View style={styles.container}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarShowLabel: false,
                    tabBarStyle: [styles.tabBar, { left: TAB_BAR_MARGIN, right: TAB_BAR_MARGIN }],
                    tabBarBackground: () => (
                        <BlurView
                            intensity={100}
                            tint="light"
                            style={styles.blurBg}
                        />
                    ),
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: colors.textMuted,
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon emoji="🏠" focused={focused} label="Home" width={tabBarWidth} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="map"
                    options={{
                        title: 'Radar',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon emoji="🌐" focused={focused} label="Radar" width={tabBarWidth} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="scan"
                    options={{
                        title: 'Scan',
                        tabBarIcon: () => null,
                        tabBarButton: () => (
                            <ScannerButton onPress={() => router.push('/(tabs)/scan')} width={tabBarWidth} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="leaderboard"
                    options={{
                        title: 'Top',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon emoji="🏆" focused={focused} label="Top" width={tabBarWidth} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Me',
                        tabBarIcon: ({ focused }) => (
                            <TabIcon emoji="👤" focused={focused} label="Me" width={tabBarWidth} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="index"
                    options={{ href: null }}
                />
            </Tabs>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    tabBar: {
        position: 'absolute',
        bottom: spacing.lg,
        height: 80,
        backgroundColor: 'transparent',
        borderRadius: borderRadius.xl,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.9)', // Bright reflective border
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        paddingBottom: 0,
        borderTopWidth: 1.5,
        overflow: 'visible', // Allow scanner to overflow
    },
    blurBg: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 10,
    },
    iconContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    iconContainerActive: {
        backgroundColor: 'rgba(14, 165, 233, 0.08)',
    },
    tabEmoji: {
        fontSize: 22,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    scannerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scannerButton: {
        top: -30, // Raise higher
        width: 72,
        height: 72,
        borderRadius: 36,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    scannerInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerEmoji: {
        fontSize: 30,
    },
    reflection: {
        position: 'absolute',
        top: 4,
        left: '15%',
        width: '30%',
        height: '25%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 10,
        transform: [{ rotate: '-15deg' }],
    },
});
