import { useState } from 'react';
import { StyleSheet, Text, View, Image, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { IconButton, Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { User } from '@/types';

export default function ScanScreen() {
    const { isBypass } = useAuthStore();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scannedUser, setScannedUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    if (!permission) return <View style={styles.container} />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Camera access is required to scan handshakes.</Text>
                <Button onPress={requestPermission} mode="contained" style={styles.permissionBtn}>Enable Camera</Button>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned || loading || !data.startsWith('rating:')) return;
        setScanned(true);
        setLoading(true);
        const userId = data.split(':')[1];

        // Bypass logic for testing
        if (isBypass && userId === '00000000-0000-0000-0000-000000000001') {
            console.log('Bypass: Detected mock protocol user');
            const mockScannedUser: User = {
                id: userId,
                email: 'test01@reputation.protocol',
                name: 'Test Identity 01',
                username: 'test01',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test01',
                big_score: 4.8,
                total_ratings: 12,
                created_at: new Date().toISOString()
            };
            setScannedUser(mockScannedUser);
            setLoading(false);
            return;
        }

        try {
            const { data: userData, error } = await supabase.from('users').select('*').eq('id', userId).single();
            if (error) throw error;
            setScannedUser(userData);
        } catch (err) {
            console.error('Scan error:', err);
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFill}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />

            <SafeAreaView style={styles.overlay}>
                <View style={styles.header}>
                    <IconButton icon="close" iconColor="#fff" size={30} onPress={() => router.back()} />
                    <Text style={styles.headerTitle}>SCAN PROTOCOL</Text>
                    <IconButton icon="lightbulb-on" iconColor="#fff" size={26} onPress={() => { }} />
                </View>

                <View style={styles.centerContainer}>
                    {!scannedUser && (
                        <View style={styles.scanTarget}>
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                            <View style={styles.liquidIndicator} />
                            <Text style={styles.scanHint}>Align handshake QR with fluid precision</Text>
                        </View>
                    )}
                </View>

                {scannedUser && (
                    <View style={styles.resultBox}>
                        <View style={styles.glassCard}>
                            <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />
                            <View style={styles.glossReflection} />

                            <View style={styles.userRow}>
                                <View style={styles.avatarWrapper}>
                                    <Image source={{ uri: scannedUser.avatar_url || 'https://via.placeholder.com/100' }} style={styles.avatar} />
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{scannedUser.name}</Text>
                                    <Text style={styles.userHandle}>@{scannedUser.username}</Text>
                                </View>
                                <View style={styles.scoreBadge}>
                                    <Text style={styles.scoreText}>⭐ {scannedUser.big_score?.toFixed(1) || '0.0'}</Text>
                                </View>
                            </View>

                            <View style={styles.actions}>
                                <Button mode="outlined" onPress={() => { setScanned(false); setScannedUser(null); }} style={styles.cancelBtn} textColor={colors.textSecondary} labelStyle={styles.btnLabel}>Recalibrate</Button>
                                <Button mode="contained" onPress={() => router.push(`/user/${scannedUser.id}`)} style={styles.viewBtn} labelStyle={styles.btnLabel}>Access Profile</Button>
                            </View>
                        </View>
                    </View>
                )}

                {loading && <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
    overlay: { flex: 1, justifyContent: 'space-between' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.sm },
    headerTitle: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 3 },
    message: { textAlign: 'center', color: colors.text, marginBottom: 20 },
    permissionBtn: { marginHorizontal: 60, borderRadius: 18 },
    scanTarget: { width: 280, height: 280, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' },
    corner: { position: 'absolute', width: 45, height: 45, borderColor: colors.primary, borderWidth: 4, borderRadius: 15 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    liquidIndicator: { width: '80%', height: 2, backgroundColor: colors.primary, opacity: 0.6, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
    scanHint: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 350, textAlign: 'center', opacity: 0.9, letterSpacing: 1 },
    resultBox: { padding: spacing.lg, paddingBottom: 40 },
    glassCard: {
        ...glassStyles.container,
        padding: spacing.xl,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderColor: 'rgba(255, 255, 255, 1)',
        shadowColor: '#fff',
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    glossReflection: {
        position: 'absolute',
        top: 6,
        left: '10%',
        width: '40%',
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 5,
    },
    userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
    avatarWrapper: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#fff' },
    avatar: { width: '100%', height: '100%' },
    userInfo: { marginLeft: spacing.md, flex: 1 },
    userName: { fontSize: 22, fontWeight: '900', color: colors.text },
    userHandle: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    scoreBadge: { backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
    scoreText: { color: colors.accent, fontWeight: '900', fontSize: 16 },
    actions: { flexDirection: 'row', justifyContent: 'space-between' },
    cancelBtn: { flex: 1, marginRight: spacing.sm, borderRadius: 15, borderColor: 'rgba(0,0,0,0.1)' },
    viewBtn: { flex: 2, borderRadius: 15, backgroundColor: colors.primary },
    btnLabel: { fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
    loading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
});
