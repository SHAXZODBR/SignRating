import { View, Text, StyleSheet, ScrollView, Share, TouchableOpacity, Switch, Platform } from 'react-native';
import { Button, IconButton, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { useAuthStore } from '@/stores';

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();

    const handleShare = async () => {
        if (!user) return;
        try {
            await Share.share({
                message: `Check out my reputation score on Rating: ${user.big_score?.toFixed(1) || '0.0'}⭐. Connect with me @${user.username}`,
                url: `https://ratingapp.link/user/${user.id}`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    if (!user) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlow} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Account</Text>
                    <IconButton icon="dots-vertical" iconColor={colors.primary} size={28} onPress={() => { }} />
                </View>

                <View style={styles.profileGlass}>
                    <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                    {/* Liquid Gloss Reflection */}
                    <View style={styles.glossyTop} />

                    <View style={styles.avatarWrapper}>
                        <Avatar.Image
                            size={120}
                            source={{ uri: user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky' }}
                            style={styles.avatar}
                        />
                        <View style={styles.activeDot} />
                    </View>

                    <Text style={styles.name}>{user.name}</Text>
                    <Text style={styles.handle}>@{user.username}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{user.big_score?.toFixed(1) || '0.0'}</Text>
                            <Text style={styles.statLabel}>INDEX</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{user.total_ratings || 0}</Text>
                            <Text style={styles.statLabel}>RATINGS</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.qrGlass}>
                    <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                    <Text style={styles.qrTitle}>HANDSHAKE ID</Text>
                    <View style={styles.qrContainer}>
                        <QRCode
                            value={`rating:${user.id}`}
                            size={170}
                            color={colors.text}
                            backgroundColor="transparent"
                        />
                    </View>
                    <Button
                        mode="contained"
                        onPress={handleShare}
                        style={styles.shareBtn}
                        labelStyle={styles.shareLabel}
                        icon="share-variant"
                    >
                        Share Identity
                    </Button>
                </View>

                <View style={styles.settingsBox}>
                    <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
                        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                        <Text style={styles.settingText}>Identity Visibility</Text>
                        <Switch value={true} trackColor={{ false: '#eee', true: colors.primary }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={logout} activeOpacity={0.7}>
                        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                        <Text style={styles.logoutText}>Relinquish Session</Text>
                        <IconButton icon="power" iconColor={colors.error} size={22} />
                    </TouchableOpacity>
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
    bgGlow: {
        position: 'absolute',
        top: -100,
        left: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: colors.secondary,
        opacity: 0.1,
        filter: Platform.OS === 'web' ? 'blur(100px)' : undefined,
    },
    scrollContent: { paddingBottom: 120 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    headerTitle: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: 1 },
    profileGlass: {
        ...glassStyles.container,
        margin: spacing.md,
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        borderColor: 'rgba(255, 255, 255, 0.95)',
    },
    glossyTop: {
        position: 'absolute',
        top: 6,
        width: '50%',
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 10,
    },
    avatarWrapper: { marginBottom: spacing.md, position: 'relative' },
    avatar: { backgroundColor: '#fff', borderWidth: 3, borderColor: '#fff', shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 10 },
    activeDot: { position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.success, borderWidth: 4, borderColor: '#fff' },
    name: { fontSize: 26, fontWeight: '900', color: colors.text },
    handle: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.xl, fontWeight: '600' },
    statsRow: { flexDirection: 'row', width: '100%', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 20, padding: spacing.lg },
    statBox: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 32, fontWeight: '900', color: colors.primary },
    statLabel: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 2 },
    divider: { width: 1.5, height: 35, backgroundColor: 'rgba(0,0,0,0.04)' },
    qrGlass: {
        ...glassStyles.container,
        margin: spacing.md,
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    qrTitle: { fontSize: 12, fontWeight: '900', color: colors.textSecondary, marginBottom: spacing.xl, letterSpacing: 3 },
    qrContainer: { padding: spacing.lg, backgroundColor: '#fff', borderRadius: 28, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
    shareBtn: { marginTop: spacing.xl, width: '100%', borderRadius: 18, backgroundColor: colors.primary, paddingVertical: 6 },
    shareLabel: { fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    settingsBox: { margin: spacing.md },
    settingItem: {
        ...glassStyles.container,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        marginBottom: spacing.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    settingText: { fontSize: 16, color: colors.text, fontWeight: '700' },
    logoutText: { fontSize: 16, color: colors.error, fontWeight: '800' },
    logoutItem: { borderColor: 'rgba(239, 68, 68, 0.15)', backgroundColor: 'rgba(239, 68, 68, 0.02)' },
});
