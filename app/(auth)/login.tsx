import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';

export default function LoginScreen() {
    const { setUser, setBypass } = useAuthStore();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email) { setError('Please enter your email'); return; }
        setLoading(true);
        setError('');
        try {
            const { error: signInError } = await supabase.auth.signInWithOtp({
                email: email.trim().toLowerCase(),
                options: { emailRedirectTo: 'rating://(auth)/verify' }
            });

            if (signInError) {
                if (signInError.message.includes('rate limit')) {
                    console.log('Rate limit hit');
                }
                throw signInError;
            }

            router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleTestLogin = async (id: string, name: string, username: string) => {
        setLoading(true);
        try {
            // Check if test user exists
            const { data: existing } = await supabase.from('users').select('*').eq('id', id).maybeSingle();

            let targetUser = existing;
            if (!existing) {
                // Create test user
                const { data: newUser, error } = await supabase.from('users').insert({
                    id,
                    name,
                    username,
                    is_test: true,
                    avatar_url: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random`
                }).select().single();
                if (error) throw error;
                targetUser = newUser;
            }

            setBypass(true);
            setUser(targetUser);
            router.replace('/(tabs)/home');
        } catch (err: any) {
            setError('Test login failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={[styles.bgGlow, { top: -100, right: -100, backgroundColor: colors.primaryLight }]} />
            <View style={[styles.bgGlow, { bottom: -100, left: -100, backgroundColor: colors.secondary }]} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.logoBox}>
                    <Text style={styles.logoStar}>✨</Text>
                    <Text style={styles.logoTitle}>Rating</Text>
                    <Text style={styles.logoSubtitle}>THE REPUTATION PROTOCOL</Text>
                </View>

                <View style={styles.glassCard}>
                    <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

                    <Text style={styles.cardTitle}>Collective Access</Text>
                    <Text style={styles.cardSubtitle}>Sync your status via encrypted entry code</Text>

                    <TextInput
                        mode="flat"
                        placeholder="entry@protocol.net"
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        textColor={colors.text}
                        placeholderTextColor={colors.textMuted}
                        underlineColor="transparent"
                        activeUnderlineColor={colors.primary}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Button mode="contained" onPress={handleLogin} loading={loading} style={styles.loginBtn} labelStyle={styles.loginLabel}>
                        Request Access Code
                    </Button>

                    <View style={styles.testSection}>
                        <View style={styles.testDivider}>
                            <View style={styles.line} />
                            <Text style={styles.testLabel}>DEVELOPER BYPASS</Text>
                            <View style={styles.line} />
                        </View>

                        <View style={styles.testBtnRow}>
                            <TouchableOpacity style={styles.testBtn} onPress={() => handleTestLogin('00000000-0000-0000-0000-000000000001', 'Test Admin', 'admin')}>
                                <Text style={styles.testEmoji}>📱</Text>
                                <Text style={styles.testBtnText}>Phone 1</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.testBtn} onPress={() => handleTestLogin('00000000-0000-0000-0000-000000000002', 'Test Runner', 'runner')}>
                                <Text style={styles.testEmoji}>📲</Text>
                                <Text style={styles.testBtnText}>Phone 2</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.testBtn} onPress={() => handleTestLogin('00000000-0000-0000-0000-000000000003', 'Guest Tester', 'guest')}>
                                <Text style={styles.testEmoji}>🧪</Text>
                                <Text style={styles.testBtnText}>Phone 3</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.footerText}>Secure authentication via end-to-end OTP.</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgGlow: { position: 'absolute', width: 450, height: 450, borderRadius: 225, opacity: 0.1 },
    scrollContent: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
    logoBox: { alignItems: 'center', marginBottom: 60 },
    logoStar: { fontSize: 64, marginBottom: spacing.md, textShadowColor: 'rgba(14, 165, 233, 0.2)', textShadowRadius: 20 },
    logoTitle: { fontSize: 52, fontWeight: '900', color: colors.text, letterSpacing: 8, textTransform: 'uppercase' },
    logoSubtitle: { fontSize: 12, color: colors.primary, fontWeight: '800', letterSpacing: 4, marginTop: 4 },
    glassCard: { ...glassStyles.container, padding: spacing.xl, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderColor: 'rgba(255, 255, 255, 0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 10 },
    cardTitle: { fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 6 },
    cardSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, fontWeight: '500' },
    input: { backgroundColor: 'rgba(0, 0, 0, 0.03)', marginBottom: spacing.md, borderRadius: 15, height: 60, fontSize: 16 },
    errorText: { color: colors.error, fontSize: 12, marginBottom: spacing.md, textAlign: 'center', fontWeight: '600' },
    loginBtn: { backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 15, marginTop: spacing.md },
    loginLabel: { fontSize: 16, fontWeight: '900', color: '#fff' },
    footerText: { fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, fontWeight: '700', letterSpacing: 1 },
    testSection: { marginTop: spacing.xl },
    testDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    line: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
    testLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, marginHorizontal: 10, letterSpacing: 2 },
    testBtnRow: { flexDirection: 'row', justifyContent: 'space-between' },
    testBtn: { flex: 1, alignItems: 'center', padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 15, marginHorizontal: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
    testEmoji: { fontSize: 24, marginBottom: 4 },
    testBtnText: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
});
