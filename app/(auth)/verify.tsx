import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { colors, spacing, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';

export default function VerifyScreen() {
    const { email } = useLocalSearchParams<{ email: string }>();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setUser, setSession, setBypass } = useAuthStore();

    const handleVerify = async () => {
        if (!otp || otp.length < 6) { setError('6-digit code required'); return; }
        setLoading(true); setError('');
        try {
            // BACKDOOR: 123456 bypass for testing
            if (otp === '123456') {
                console.log('Backdoor activated: 123456');
                setBypass(true); // Flag this as a bypass session
                // We attempt a normal verify first, but if it's the backdoor, we might need a fallback.
                // For now, let's see if we can just proceed to onboarding/home.
                // IMPORTANT: Real Supabase session is required for DB calls.
                // If this is a known test email, we could sign in with a fixed password if configured.

                // For the user's request, we'll try to find an existing user or go to onboarding.
                const { data: userData } = await supabase.from('users').select('*').eq('email', email!).single();
                if (userData) {
                    setUser(userData);
                    router.replace('/(tabs)/home');
                } else {
                    router.replace('/(auth)/onboarding');
                }
                return;
            }

            const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: email!, token: otp, type: 'email' });
            if (verifyError) throw verifyError;
            if (data.session) {
                setBypass(false); // Reset bypass on real session
                setSession({ access_token: data.session.access_token });
                const { data: existingUser } = await supabase.from('users').select('*').eq('id', data.session.user.id).single();
                if (existingUser) { setUser(existingUser); router.replace('/(tabs)/home'); }
                else { router.replace('/(auth)/onboarding'); }
            }
        } catch (err: any) {
            setError(err.message || 'Invalid authorization code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={[styles.bgGlow, { top: -100, left: -100, backgroundColor: colors.secondary }]} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Decrypt</Text>
                    <Text style={styles.subtitle}>Enter the authorization token sent to your email.</Text>
                </View>

                <View style={styles.glassCard}>
                    <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />

                    <TextInput
                        mode="flat"
                        placeholder="000 000"
                        value={otp}
                        onChangeText={setOtp}
                        style={styles.input}
                        textColor={colors.text}
                        placeholderTextColor={colors.textMuted}
                        underlineColor="transparent"
                        activeUnderlineColor={colors.primary}
                        keyboardType="number-pad"
                        maxLength={6}
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Button mode="contained" onPress={handleVerify} loading={loading} style={styles.verifyBtn} labelStyle={styles.verifyLabel}>
                        Finalize Access
                    </Button>

                    <Button mode="text" onPress={() => router.back()} textColor={colors.textMuted} style={styles.backBtn}>
                        Incorrect coordinates? Return back.
                    </Button>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgGlow: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.1, filter: Platform.OS === 'web' ? 'blur(100px)' : undefined },
    scrollContent: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
    header: { marginBottom: 40 },
    title: { fontSize: 40, fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: 4 },
    subtitle: { fontSize: 16, color: colors.primary, marginTop: 4, fontWeight: '700' },
    glassCard: { ...glassStyles.container, padding: spacing.xl, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderColor: 'rgba(255, 255, 255, 0.8)' },
    input: { backgroundColor: 'rgba(0, 0, 0, 0.03)', marginBottom: spacing.md, borderRadius: 15, height: 80, fontSize: 32, textAlign: 'center', fontWeight: '900', letterSpacing: 10 },
    errorText: { color: colors.error, fontSize: 12, marginBottom: spacing.md, textAlign: 'center', fontWeight: '700' },
    verifyBtn: { backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 15, marginTop: spacing.md },
    verifyLabel: { fontSize: 16, fontWeight: '900', color: '#fff' },
    backBtn: { marginTop: spacing.md },
});
