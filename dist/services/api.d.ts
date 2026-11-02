/**
 * Type-Safe Spotify REST API Client
 */
import { ApiResponse, AuthResponse, Track, Playlist, UnifiedSearchResponse, PodcastShow, LikesResponse, User, UserProfileUpdates, SubscriptionTier } from '../types';
export declare class TypedSpotifyApiClient {
    private baseUrl;
    private token;
    isOnline: boolean;
    constructor(baseUrl?: string);
    setToken(token: string | null): void;
    getToken(): string | null;
    request<T = unknown>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;
    checkHealth(): Promise<boolean>;
    login(email: string, pass: string): Promise<ApiResponse<AuthResponse>>;
    register(name: string, email: string, pass: string, birthYear?: number | string): Promise<ApiResponse<AuthResponse>>;
    getMe(): Promise<ApiResponse<{
        user: User;
    }>>;
    updateProfile(updates: UserProfileUpdates): Promise<ApiResponse<{
        user: User;
    }>>;
    getTracks(query?: string, genre?: string): Promise<ApiResponse<{
        tracks: Track[];
        count: number;
    }>>;
    getTrackById(id: number | string): Promise<ApiResponse<{
        track: Track;
    }>>;
    search(query: string): Promise<ApiResponse<UnifiedSearchResponse>>;
    getPodcasts(category?: string, q?: string): Promise<ApiResponse<{
        podcasts: PodcastShow[];
        count: number;
    }>>;
    getPodcastById(id: number | string): Promise<ApiResponse<{
        podcast: PodcastShow;
    }>>;
    getPlaylists(): Promise<ApiResponse<{
        playlists: Playlist[];
        count: number;
    }>>;
    createPlaylist(name: string, desc?: string): Promise<ApiResponse<{
        playlist: Playlist;
    }>>;
    getLikes(): Promise<ApiResponse<LikesResponse>>;
    toggleLike(trackId: number): Promise<ApiResponse<LikesResponse>>;
    updateSubscription(tier: SubscriptionTier): Promise<ApiResponse<{
        user: User;
    }>>;
    logout(): void;
}
export declare const typedSpotifyApi: TypedSpotifyApiClient;
//# sourceMappingURL=api.d.ts.map