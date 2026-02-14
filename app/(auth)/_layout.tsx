import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="login" />
            <Stack.Screen name="verify" />
            <Stack.Screen name="onboarding" />
        </Stack>
    );
}
