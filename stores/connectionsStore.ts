import { create } from 'zustand';
import { ConnectionsState, Connection, User } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';
import { Alert } from 'react-native';

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
    connections: [],
    pendingRequests: [],
    loading: false,

    setLoading: (loading: boolean) => set({ loading }),

    fetchConnections: async (userId: string) => {
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
        } catch (error: any) {
            console.error('Fetch connections error:', error);
            if (error.message && !error.message.includes('fetch')) {
                Alert.alert('Network Error', 'Could not sync connections. Please check your internet connection.');
            }
        } finally {
            set({ loading: false });
        }
    },

    fetchPendingRequests: async (userId: string) => {
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
        } catch (error: any) {
            console.error('Fetch pending error:', error);
            if (error.message && !error.message.includes('fetch')) {
                Alert.alert('Sync Warning', 'Could not refresh pending handshakes. Background tasks might be delayed.');
            }
        } finally {
            set({ loading: false });
        }
    },

    acceptRequest: async (connectionId: string) => {
        try {
            const { error } = await supabase
                .from('connections')
                .update({ status: 'accepted' })
                .eq('id', connectionId);

            if (error) throw error;

            const userId = (await supabase.auth.getUser()).data.user?.id;
            if (userId) {
                get().fetchConnections(userId);
                get().fetchPendingRequests(userId);
            }
        } catch (error: any) {
            console.error('Accept request error:', error);
            Alert.alert('Action Failed', 'Could not accept the request. Please try again.');
        }
    },

    declineRequest: async (connectionId: string) => {
        try {
            const { error } = await supabase
                .from('connections')
                .delete()
                .eq('id', connectionId);

            if (error) throw error;

            const userId = (await supabase.auth.getUser()).data.user?.id;
            if (userId) {
                get().fetchPendingRequests(userId);
            }
        } catch (error: any) {
            console.error('Decline request error:', error);
            Alert.alert('Action Failed', 'Could not decline the request. Please try again.');
        }
    },

    blockUser: async (blockerId: string, blockedId: string) => {
        try {
            // Insert block record
            const { error: blockError } = await supabase
                .from('blocks')
                .insert({ blocker_id: blockerId, blocked_id: blockedId });

            if (blockError) throw blockError;

            // Update any existing connection to 'blocked'
            await supabase
                .from('connections')
                .update({ status: 'blocked' })
                .or(`and(user_a.eq.${blockerId},user_b.eq.${blockedId}),and(user_a.eq.${blockedId},user_b.eq.${blockerId})`);

            // Refresh lists
            get().fetchConnections(blockerId);
            get().fetchPendingRequests(blockerId);
        } catch (error: any) {
            console.error('Block user error:', error);
            Alert.alert('Action Failed', 'Could not block this user. Check your connection.');
        }
    },
}));
