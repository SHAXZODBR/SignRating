import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Index() {
    const { isAuthenticated, isLoading, setUser, setSession, setLoading } = useAuthStore();

    useEffect(() => {
        // Check for existing session on mount with a timeout limit
        const checkSession = async () => {
            const timeout = setTimeout(() => {
                console.log('Auth timeout hit, defaulting to login');
                setLoading(false);
            }, 5000); // 5s max wait for auth

            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    const { data: user } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (user) {
                        setUser(user);
                        setSession({ access_token: session.access_token });
                    }
                }
            } catch (error) {
                console.error('Session check error:', error);
            } finally {
                clearTimeout(timeout);
                setLoading(false);
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setSession(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/home" />;
    }

    return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // Pure white for splash
    },
});
