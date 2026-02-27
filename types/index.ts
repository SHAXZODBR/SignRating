// Database types for the Rating app

export interface User {
    id: string;
    email: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
    big_score: number;
    total_ratings: number;
    latitude?: number;
    longitude?: number;
    location_updated_at?: string;
    created_at: string;
}

export interface Connection {
    id: string;
    user_a: string;
    user_b: string;
    status: 'pending' | 'accepted' | 'blocked';
    created_at: string;
    // Joined user data
    user_a_data?: User;
    user_b_data?: User;
}

export interface InteractionPass {
    id: string;
    type: 'meet' | 'call' | 'chat' | 'gps_proximity';
    user_a: string;
    user_b: string;
    status: 'pending' | 'confirmed' | 'expired';
    created_at: string;
    // Joined data
    user_a_data?: User;
    user_b_data?: User;
}

export interface Rating {
    id: string;
    pass_id: string;
    rater_id: string;
    ratee_id: string;
    score: 1 | 2 | 3 | 4 | 5;
    revealed: boolean;
    created_at: string;
}

export interface Block {
    blocker_id: string;
    blocked_id: string;
    created_at: string;
}

// App state types
export interface AuthState {
    user: User | null;
    session: { access_token: string } | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isBypass: boolean;
    setUser: (user: User | null) => void;
    setSession: (session: { access_token: string } | null) => void;
    setLoading: (loading: boolean) => void;
    setBypass: (isBypass: boolean) => void;
    logout: () => Promise<void>;
}

export interface ConnectionsState {
    connections: Connection[];
    pendingRequests: Connection[];
    loading: boolean;
    fetchConnections: (userId: string) => Promise<void>;
    fetchPendingRequests: (userId: string) => Promise<void>;
    acceptRequest: (connectionId: string) => Promise<void>;
    declineRequest: (connectionId: string) => Promise<void>;
    blockUser: (blockerId: string, blockedId: string) => Promise<void>;
    setLoading: (loading: boolean) => void;
}

export interface NearbyUser {
    user: User;
    distance: number; // in meters
}

// Leaderboard entry
export interface LeaderboardEntry {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    big_score: number;
    total_ratings: number;
}

