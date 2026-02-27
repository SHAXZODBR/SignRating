import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Share, TouchableOpacity, Switch, Platform, Alert, Modal, KeyboardAvoidingView } from 'react-native';
import { Button, IconButton, Avatar, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
    const { user, logout, setUser, isBypass } = useAuthStore();
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [editUsername, setEditUsername] = useState(user?.username || '');
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

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

    const handleEditProfile = () => {
        setEditName(user?.name || '');
        setEditUsername(user?.username || '');
        setEditError('');
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim() || !editUsername.trim()) {
            setEditError('Name and username are required');
            return;
        }
        setSaving(true);
        setEditError('');

        try {
            // Check if username is taken by someone else
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', editUsername.trim().toLowerCase())
                .neq('id', user!.id)
                .single();

            if (existingUser) {
                setEditError('Username already taken');
                return;
            }

            const { data, error } = await supabase
                .from('users')
                .update({
                    name: editName.trim(),
                    username: editUsername.trim().toLowerCase(),
                })
                .eq('id', user!.id)
                .select()
                .single();

            if (error) throw error;
            if (data) setUser(data);
            setEditModalVisible(false);
            Alert.alert('Updated', 'Profile updated successfully.');
        } catch (err: any) {
            setEditError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to relinquish your session?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
            ]
        );
    };

    if (!user) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlow} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Account</Text>
                    <IconButton icon="pencil" iconColor={colors.primary} size={24} onPress={handleEditProfile} />
                </View>

                <View style={styles.profileGlass}>
                    <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
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
                    <TouchableOpacity style={styles.settingItem} activeOpacity={0.7} onPress={handleEditProfile}>
                        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                        <Text style={styles.settingText}>Edit Profile</Text>
                        <IconButton icon="chevron-right" iconColor={colors.textMuted} size={22} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
                        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                        <Text style={styles.settingText}>Identity Visibility</Text>
                        <Switch value={true} trackColor={{ false: '#eee', true: colors.primary }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={handleLogout} activeOpacity={0.7}>
                        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                        <Text style={styles.logoutText}>Relinquish Session</Text>
                        <IconButton icon="power" iconColor={colors.error} size={22} />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Identity</Text>
                            <IconButton icon="close" iconColor={colors.textMuted} size={24} onPress={() => setEditModalVisible(false)} />
                        </View>

                        <TextInput
                            mode="flat"
                            label="Name"
                            value={editName}
                            onChangeText={setEditName}
                            style={styles.modalInput}
                            textColor={colors.text}
                            activeUnderlineColor={colors.primary}
                        />
                        <TextInput
                            mode="flat"
                            label="Username"
                            value={editUsername}
                            onChangeText={setEditUsername}
                            style={styles.modalInput}
                            textColor={colors.text}
                            activeUnderlineColor={colors.primary}
                            autoCapitalize="none"
                        />

                        {editError ? <Text style={styles.editError}>{editError}</Text> : null}

                        <Button
                            mode="contained"
                            onPress={handleSaveProfile}
                            loading={saving}
                            style={styles.saveBtn}
                            labelStyle={styles.saveLabel}
                        >
                            Save Changes
                        </Button>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    // Edit Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContainer: {
        ...glassStyles.container,
        borderRadius: 28,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        padding: spacing.xl,
        paddingBottom: spacing.xxl,
        backgroundColor: 'rgba(255,255,255,0.95)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.text,
    },
    modalInput: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        marginBottom: spacing.md,
        borderRadius: 12,
        fontSize: 16,
    },
    editError: {
        color: colors.error,
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    saveBtn: {
        backgroundColor: colors.primary,
        borderRadius: 15,
        paddingVertical: 8,
        marginTop: spacing.md,
    },
    saveLabel: {
        fontWeight: '900',
        fontSize: 16,
    },
});
