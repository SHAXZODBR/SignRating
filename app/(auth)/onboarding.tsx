import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, TextInput, Avatar } from 'react-native-paper';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';

export default function OnboardingScreen() {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setUser, isBypass } = useAuthStore();

    const handleComplete = async () => {
        if (!name || !username) { setError('All protocols must be initialized'); return; }
        setLoading(true); setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();

            // Bypass logic for testing
            if (!session && isBypass) {
                console.log('Onboarding in bypass mode');
                const mockUser = {
                    id: '00000000-0000-0000-0000-000000000001', // Valid UUID for bypass
                    email: 'bypass@test.com',
                    name: name.trim(),
                    username: username.toLowerCase().trim(),
                    avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                    big_score: 0,
                    total_ratings: 0,
                    created_at: new Date().toISOString()
                };
                setUser(mockUser as any);
                router.replace('/(tabs)/home');
                return;
            }

            if (!session) throw new Error('No active synchronization');
            const { data: existingUser } = await supabase.from('users').select('id').eq('username', username.toLowerCase().trim()).single();
            if (existingUser) throw new Error('Identity already occupied');
            const { data: newUser, error: insertError } = await supabase.from('users').insert({
                id: session.user.id, name: name.trim(), username: username.toLowerCase().trim(),
                avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                big_score: 0, total_ratings: 0,
            }).select().single();
            if (insertError) throw insertError;
            if (newUser) { setUser(newUser); router.replace('/(tabs)/home'); }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={[styles.bgGlow, { top: -150, left: -150, backgroundColor: colors.secondary }]} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Initialize</Text>
                    <Text style={styles.subtitle}>Manifest your digital reputation identity</Text>
                </View>

                <View style={styles.glassCard}>
                    <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

                    <View style={styles.avatarSection}>
                        <Avatar.Image size={110} source={{ uri: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'protocol'}` }} style={styles.avatar} />
                        <Text style={styles.avatarHint}>GENERATIVE IDENTITY ACTIVE</Text>
                    </View>

                    <TextInput mode="flat" placeholder="Citizen Name" value={name} onChangeText={setName} style={styles.input} textColor={colors.text} activeUnderlineColor={colors.primary} />
                    <TextInput mode="flat" placeholder="Universal Handle" value={username} onChangeText={setUsername} style={styles.input} textColor={colors.text} activeUnderlineColor={colors.primary} autoCapitalize="none" />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Button mode="contained" onPress={handleComplete} loading={loading} style={styles.completeBtn} labelStyle={styles.completeLabel}>
                        Authorize Identity
                    </Button>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgGlow: { position: 'absolute', width: 500, height: 500, borderRadius: 250, opacity: 0.1 },
    scrollContent: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
    header: { marginBottom: 40 },
    title: { fontSize: 48, fontWeight: '900', color: colors.text, letterSpacing: 2 },
    subtitle: { fontSize: 16, color: colors.primary, marginTop: 4, fontWeight: '700' },
    glassCard: { ...glassStyles.container, padding: spacing.xl, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderColor: 'rgba(255, 255, 255, 0.8)' },
    avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
    avatar: { backgroundColor: '#fff', borderWidth: 3, borderColor: colors.primary },
    avatarHint: { fontSize: 10, color: colors.textMuted, marginTop: 10, fontWeight: '900', letterSpacing: 1 },
    input: { backgroundColor: 'transparent', marginBottom: spacing.lg, fontSize: 18 },
    errorText: { color: colors.error, fontSize: 12, marginBottom: spacing.md, textAlign: 'center', fontWeight: '700' },
    completeBtn: { backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 15, marginTop: spacing.md },
    completeLabel: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
