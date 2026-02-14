import * as Location from 'expo-location';
import { supabase } from './supabase';
import { NearbyUser, User } from '@/types';
import { useAuthStore } from '@/stores/authStore';

// Proximity threshold in meters
const PROXIMITY_THRESHOLD = 50;

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Request location permissions
export async function requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
}

// Get current location
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) return null;

        return await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
    } catch (error) {
        console.error('Error getting location:', error);
        return null;
    }
}

// Check for nearby connected users
export async function checkNearbyConnections(
    currentUserId: string
): Promise<NearbyUser[]> {
    const isBypass = useAuthStore.getState().isBypass;

    try {
        if (isBypass) {
            console.log('Bypass: Simulating nearby detection');
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
            return [{ user: mockUser, distance: 5 }];
        }

        const location = await getCurrentLocation();
        if (!location) return [];

        const { latitude, longitude } = location.coords;

        const { data: connections, error } = await supabase
            .from('connections')
            .select(`
        *,
        user_a_data:users!connections_user_a_fkey(*),
        user_b_data:users!connections_user_b_fkey(*)
      `)
            .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`)
            .eq('status', 'accepted');

        if (error || !connections) return [];

        return [];
    } catch (error) {
        console.error('Error checking nearby connections:', error);
        return [];
    }
}

// Create GPS proximity pass when users are nearby
export async function createGPSProximityPass(
    currentUserId: string,
    otherUserId: string
): Promise<string | null> {
    const isBypass = useAuthStore.getState().isBypass;
    if (isBypass) {
        console.log('Bypass: Simulating GPS pass creation');
        return 'mock-gps-pass-' + Math.random().toString(36).substring(7);
    }

    try {
        // Check cooldown first (3-5 passes per 12h)
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

        const { count } = await supabase
            .from('interaction_passes')
            .select('*', { count: 'exact', head: true })
            .or(`and(user_a.eq.${currentUserId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${currentUserId})`)
            .gte('created_at', twelveHoursAgo);

        if (count && count >= 5) {
            throw new Error('Cooldown active: Max interaction limit reached for this pair.');
        }

        // Create the pass
        const { data, error } = await supabase
            .from('interaction_passes')
            .insert({
                type: 'gps_proximity',
                user_a: currentUserId,
                user_b: otherUserId,
                status: 'confirmed', // GPS is auto-confirmed
            })
            .select()
            .single();

        if (error) throw error;

        return data?.id || null;
    } catch (error) {
        console.error('Error creating GPS pass:', error);
        throw error;
    }
}
