import { create } from 'zustand';
import { AuthState, User } from '@/types';

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

    logout: () => set({
        user: null,
        session: null,
        isAuthenticated: false
    }),
}));
