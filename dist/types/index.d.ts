/**
 * Spotify Full-Stack Application - Domain Types & Interfaces
 */
export type SubscriptionTier = 'Spotify Free' | 'Spotify Premium Standard' | 'Spotify Premium Platinum' | 'Spotify Premium Student' | 'Guest Mode';
export interface User {
    id: number;
    uuid?: string;
    name: string;
    email: string;
    passwordHash?: string;
    avatar: string;
    bio?: string;
    tier: SubscriptionTier;
    createdAt: string;
}
export interface UserProfileUpdates {
    name?: string;
    bio?: string;
    avatar?: string;
    tier?: SubscriptionTier;
}
export interface Track {
    id: number;
    title: string;
    artist: string;
    genre: string;
    img: string;
    duration: number;
    rootFreq?: number;
    tempo?: number;
    chords?: number[][];
    lyrics?: string[];
}
export interface Playlist {
    id: string | number;
    userId: number;
    name: string;
    desc?: string;
    cover?: string;
    songs: number[];
    createdAt: string;
}
export interface PodcastShow {
    id: number;
    name: string;
    category: string;
    host: string;
    episodes?: number;
    description?: string;
    cover: string;
}
export interface SearchCategory {
    name: string;
    color: string;
    img: string;
}
export interface SearchResults {
    tracks: Track[];
    playlists: Playlist[];
}
export interface UnifiedSearchResponse {
    success: boolean;
    query: string;
    results: SearchResults;
    total: number;
}
export interface ApiResponse<T = unknown> {
    success?: boolean;
    status?: number;
    data?: T;
    error?: string;
    isOffline?: boolean;
    message?: string;
}
export interface AuthResponse {
    message: string;
    token: string;
    user: User;
}
export interface LikesResponse {
    success: boolean;
    likes: number[];
    liked?: boolean;
}
export interface AudioPlaybackState {
    isPlaying: boolean;
    currentTrackIndex: number;
    currentTime: number;
    volume: number;
    isShuffle: boolean;
    repeatMode: 'off' | 'all' | 'one';
}
//# sourceMappingURL=index.d.ts.map