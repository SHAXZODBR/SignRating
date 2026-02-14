import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Alert } from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useState, useRef, useEffect } from 'react';
import { colors, spacing, fontSize, borderRadius, glassStyles } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';

export default function RatingScreen() {
    const { passId } = useLocalSearchParams<{ passId: string }>();
    const { user } = useAuthStore();

    const [rating, setRating] = useState(0);
    const [loading, setLoading] = useState(false);
    const [passData, setPassData] = useState<any>(null);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [submitted, setSubmitted] = useState(false);

    const scaleAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

    useEffect(() => {
        fetchPassData();
    }, [passId]);

    const fetchPassData = async () => {
        if (!passId) return;
        try {
            const { data, error } = await supabase
                .from('interaction_passes')
                .select(`
          *,
          user_a_data:users!interaction_passes_user_a_fkey(*),
          user_b_data:users!interaction_passes_user_b_fkey(*)
        `)
                .eq('id', passId)
                .single();

            if (error) throw error;
            setPassData(data);
            const other = data.user_a === user?.id ? data.user_b_data : data.user_a_data;
            setOtherUser(other);
        } catch (error) {
            console.error('Fetch pass error:', error);
        }
    };

    const handleSelectRating = (value: number) => {
        setRating(value);
        Animated.sequence([
            Animated.timing(scaleAnims[value - 1], { toValue: 1.5, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnims[value - 1], { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
    };

    const handleSubmit = async () => {
        if (rating === 0 || !user || !passData) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('ratings').insert({ pass_id: passId, rater_id: user.id, ratee_id: otherUser.id, score: rating });
            if (error) throw error;
            setSubmitted(true);
            setTimeout(() => router.replace('/(tabs)/home'), 2000);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit rating');
        } finally {
            setLoading(false);
        }
    };

    if (!passData || !otherUser) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgGlow} />
            <View style={styles.content}>
                <View style={styles.glassHeader}>
                    <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                    <Text style={styles.title}>Interaction Review</Text>
                    <Text style={styles.subtitle}>Calibrate your trust with {otherUser.name}</Text>
                </View>

                {!submitted ? (
                    <View style={styles.ratingBox}>
                        <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star, index) => (
                                <TouchableOpacity key={star} onPress={() => handleSelectRating(star)} activeOpacity={0.7}>
                                    <Animated.Text style={[styles.star, { transform: [{ scale: scaleAnims[index] }], color: star <= rating ? colors.accent : 'rgba(0,0,0,0.05)' }]}>
                                        ⭐
                                    </Animated.Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.ratingLabel}>{rating === 0 ? 'Selection required' : ['Poor', 'Fair', 'Good', 'Great', 'Perfect'][rating - 1]}</Text>

                        <View style={styles.infoGlass}>
                            <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
                            <Text style={styles.infoText}>🛡️ Double-blind encrypted rating. Scores are only revealed after mutual submission.</Text>
                        </View>

                        <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={rating === 0 || loading} style={[styles.submitBtn, rating > 0 && styles.submitBtnActive]} labelStyle={styles.submitLabel}>
                            Confirm Reputation
                        </Button>
                    </View>
                ) : (
                    <View style={styles.successBox}>
                        <View style={styles.successGlass}>
                            <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
                            <Text style={styles.successEmoji}>💎</Text>
                            <Text style={styles.successTitle}>Handshake Encrypted</Text>
                            <Text style={styles.successSubtitle}>Your reputation contributes to the collective trust index.</Text>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    bgGlow: { position: 'absolute', top: '20%', width: 500, height: 500, borderRadius: 250, backgroundColor: colors.primaryLight, opacity: 0.05, alignSelf: 'center', filter: Platform.OS === 'web' ? 'blur(100px)' : undefined },
    content: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
    glassHeader: { ...glassStyles.container, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xxl, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderColor: 'rgba(255, 255, 255, 0.8)' },
    title: { fontSize: 26, fontWeight: '900', color: colors.text },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 8, textAlign: 'center', fontWeight: '500' },
    ratingBox: { alignItems: 'center' },
    starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md },
    star: { fontSize: 52, marginHorizontal: 6 },
    ratingLabel: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: spacing.xxl, letterSpacing: 2, textTransform: 'uppercase' },
    infoGlass: { ...glassStyles.container, padding: spacing.md, marginBottom: spacing.xxl, backgroundColor: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.05)' },
    infoText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 20, fontWeight: '600' },
    submitBtn: { width: '100%', paddingVertical: 10, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.05)' },
    submitBtnActive: { backgroundColor: colors.primary },
    submitLabel: { fontSize: 18, fontWeight: '900', color: '#fff' },
    successBox: { alignItems: 'center' },
    successGlass: { ...glassStyles.container, padding: spacing.xxl, alignItems: 'center', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.6)' },
    successEmoji: { fontSize: 72, marginBottom: spacing.lg },
    successTitle: { fontSize: 24, fontWeight: '900', color: colors.primary, marginBottom: spacing.sm },
    successSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' },
});
