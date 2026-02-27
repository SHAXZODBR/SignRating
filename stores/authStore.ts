import { create } from 'zustand';
import { AuthState, User } from '@/types';
import { supabase } from '@/lib/supabase';

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isBypass: false,

    setUser: (user: User | null) => set({
        user,
        isAuthenticated: !!user
    }),

    setSession: (session: { access_token: string } | null) => set({ session }),
    setBypass: (isBypass: boolean) => set({ isBypass }),

    setLoading: (isLoading: boolean) => set({ isLoading }),

    logout: async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
        set({
            user: null,
            session: null,
            isAuthenticated: false,
            isBypass: false,
        });
    },
}));
