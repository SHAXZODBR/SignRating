import * as Location from 'expo-location';
import { supabase } from './supabase';
import { NearbyUser, User } from '@/types';
import { useAuthStore } from '@/stores/authStore';

// Proximity threshold in meters
const PROXIMITY_THRESHOLD = 200;

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
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
    }
}

// Check location permissions
export async function checkLocationPermission(): Promise<boolean> {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error checking location permission:', error);
        return false;
    }
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

// Update current user's location in the database
export async function updateMyLocation(userId: string): Promise<void> {
    try {
        const location = await getCurrentLocation();
        if (!location) return;

        const { latitude, longitude } = location.coords;
        await supabase
            .from('users')
            .update({
                latitude,
                longitude,
                location_updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
    } catch (error) {
        console.error('Error updating location:', error);
    }
}

export async function checkNearbyConnections(
    currentUserId: string
): Promise<NearbyUser[]> {
    try {
        const hasPermission = await checkLocationPermission();
        if (!hasPermission) return [];

        // Get current location
        const location = await getCurrentLocation();
        if (!location) return [];

        const { latitude, longitude } = location.coords;

        // Update my own location
        await supabase
            .from('users')
            .update({
                latitude,
                longitude,
                location_updated_at: new Date().toISOString(),
            })
            .eq('id', currentUserId);

        // Fetch all active test users + accepted connections
        const { data: testUsers } = await supabase
            .from('users')
            .select('*')
            .eq('is_test', true)
            .neq('id', currentUserId);

        const { data: connections, error } = await supabase
            .from('connections')
            .select(`
                *,
                user_a_data:users!connections_user_a_fkey(*),
                user_b_data:users!connections_user_b_fkey(*)
            `)
            .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`)
            .eq('status', 'accepted');

        if (error) return [];

        const nearbyUsers: NearbyUser[] = [];
        const processedUserIds = new Set<string>();

        // 1. Process Test Users (Instant visibility for dev)
        if (testUsers) {
            for (const otherUser of testUsers) {
                const otherLat = otherUser.latitude;
                const otherLon = otherUser.longitude;
                if (otherLat == null || otherLon == null) continue;

                const distance = calculateDistance(latitude, longitude, otherLat, otherLon);
                if (distance <= PROXIMITY_THRESHOLD * 5) { // 5x range for test users
                    nearbyUsers.push({ user: otherUser, distance });
                    processedUserIds.add(otherUser.id);
                }
            }
        }

        // 2. Process Accepted Connections
        if (connections) {
            for (const conn of connections) {
                const otherUser: User = conn.user_a === currentUserId
                    ? conn.user_b_data
                    : conn.user_a_data;

                if (!otherUser || processedUserIds.has(otherUser.id)) continue;

                const otherLat = (otherUser as any).latitude;
                const otherLon = (otherUser as any).longitude;
                const locUpdated = (otherUser as any).location_updated_at;

                if (otherLat == null || otherLon == null) continue;

                // Skip stale locations for real users
                if (locUpdated) {
                    const updatedAt = new Date(locUpdated).getTime();
                    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
                    if (updatedAt < thirtyMinAgo) continue;
                }

                const distance = calculateDistance(latitude, longitude, otherLat, otherLon);
                if (distance <= PROXIMITY_THRESHOLD) {
                    nearbyUsers.push({ user: otherUser, distance });
                }
            }
        }

        return nearbyUsers;
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

    try {
        // Check cooldown first (100 passes per 1h for testing)
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

        const { count } = await supabase
            .from('interaction_passes')
            .select('*', { count: 'exact', head: true })
            .or(`and(user_a.eq.${currentUserId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${currentUserId})`)
            .gte('created_at', oneHourAgo);

        if (count && count >= 100) {
            throw new Error('Rate limit hit: Max interaction limit reached for this pair (100/hr).');
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
