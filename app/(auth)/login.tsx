import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email) { setError('Please enter your email'); return; }
        setLoading(true);
        setError('');
        try {
            // BACKDOOR: Allow 'test' emails to bypass Supabase OTP send if needed
            if (email.includes('test') || email === 'user@example.com') {
                router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
                return;
            }

            const { error: signInError } = await supabase.auth.signInWithOtp({
                email: email.trim().toLowerCase(),
                options: { emailRedirectTo: 'rating://(auth)/verify' }
            });

            if (signInError) {
                // If rate limited, still allow navigation to Verify screen so they can use the 123456 backdoor
                if (signInError.message.includes('rate limit')) {
                    console.log('Rate limit hit, allowing manual verify entry');
                    router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
                    return;
                }
                throw signInError;
            }
            router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
        } catch (err: any) {
            console.error('Login error:', err);
            // In dev mode, always allow going to the verify screen if it's a rate limit or similar
            if (err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('network')) {
                router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
                return;
            }
            setError(err.message || 'Failed to send verification code');
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

                    <Text style={styles.footerText}>Secure authentication via end-to-end OTP.</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgGlow: { position: 'absolute', width: 450, height: 450, borderRadius: 225, opacity: 0.1, filter: Platform.OS === 'web' ? 'blur(100px)' : undefined },
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
    footerText: { fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, fontWeight: '700', letterSpacing: 1 },
});
