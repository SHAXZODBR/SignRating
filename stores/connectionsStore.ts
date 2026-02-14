import { create } from 'zustand';
import { ConnectionsState, Connection, User } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
    connections: [],
    pendingRequests: [],
    loading: false,

    setLoading: (loading: boolean) => set({ loading }),

    fetchConnections: async (userId: string) => {
        const isBypass = useAuthStore.getState().isBypass;
        if (isBypass) {
            console.log('Bypass: Fetching mock connections');
            // Simulate having one mock connection
            const mockUser: User = {
                id: '00000000-0000-0000-0000-000000000001',
                email: 'test01@reputation.protocol',
                name: 'Test Identity 01',
                username: 'test01',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test01',
                big_score: 4.8,
                total_ratings: 12,
                created_at: new Date().toISOString()
            };
            const mockConn: Connection = {
                id: 'mock-conn-01',
                user_a: userId,
                user_b: mockUser.id,
                user_a_data: undefined, // Will be me
                user_b_data: mockUser,
                status: 'accepted',
                created_at: new Date().toISOString()
            };
            set({ connections: [mockConn], loading: false });
            return;
        }

        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('connections')
                .select(`
          *,
          user_a_data:users!connections_user_a_fkey(*),
          user_b_data:users!connections_user_b_fkey(*)
        `)
                .or(`user_a.eq.${userId},user_b.eq.${userId}`)
                .eq('status', 'accepted');

            if (error) throw error;
            set({ connections: data || [] });
        } catch (error) {
            console.error('Fetch connections error:', error);
        } finally {
            set({ loading: false });
        }
    },

    fetchPendingRequests: async (userId: string) => {
        const isBypass = useAuthStore.getState().isBypass;
        if (isBypass) {
            set({ pendingRequests: [], loading: false });
            return;
        }

        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('connections')
                .select(`
          *,
          user_a_data:users!connections_user_a_fkey(*),
          user_b_data:users!connections_user_b_fkey(*)
        `)
                .eq('user_b', userId)
                .eq('status', 'pending');

            if (error) throw error;
            set({ pendingRequests: data || [] });
        } catch (error) {
            console.error('Fetch pending error:', error);
        } finally {
            set({ loading: false });
        }
    },

    acceptRequest: async (connectionId: string) => {
        const isBypass = useAuthStore.getState().isBypass;
        if (isBypass) {
            console.log('Bypass: Simulating connection acceptance');
            const currentPending = get().pendingRequests;
            const accepted = currentPending.find(p => p.id === connectionId);
            if (accepted) {
                set({
                    connections: [...get().connections, { ...accepted, status: 'accepted' }],
                    pendingRequests: currentPending.filter(p => p.id !== connectionId)
                });
            }
            return;
        }

        try {
            const { error } = await supabase
                .from('connections')
                .update({ status: 'accepted' })
                .eq('id', connectionId);

            if (error) throw error;

            // Refresh both lists
            const userId = (await supabase.auth.getUser()).data.user?.id;
            if (userId) {
                get().fetchConnections(userId);
                get().fetchPendingRequests(userId);
            }
        } catch (error) {
            console.error('Accept request error:', error);
        }
    },
}));
