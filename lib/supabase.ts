import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Supabase credentials
const SUPABASE_URL = 'https://bvwrhebnoovbxjagibsr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2d3JoZWJub292YnhqYWdpYnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDU4MzUsImV4cCI6MjA4NjIyMTgzNX0.Y_cTaobKtUNfNLomY4N91wwcOOW4rYYcOZiwPYbRbtE';

// Custom storage adapter for Expo
const ExpoSecureStoreAdapter = {
    getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        try {
            return await SecureStore.getItemAsync(key);
        } catch (error) {
            console.error('SecureStore getItem error:', error);
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        try {
            await SecureStore.setItemAsync(key, value);
        } catch (error) {
            console.error('SecureStore setItem error:', error);
        }
    },
    removeItem: async (key: string): Promise<void> => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error('SecureStore deleteItem error:', error);
        }
    },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
