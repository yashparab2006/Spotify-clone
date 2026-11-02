/**
 * Type-Safe Spotify REST API Client
 */

import {
  ApiResponse,
  AuthResponse,
  Track,
  Playlist,
  UnifiedSearchResponse,
  PodcastShow,
  LikesResponse,
  User,
  UserProfileUpdates,
  SubscriptionTier
} from '../types';

export class TypedSpotifyApiClient {
  private baseUrl: string;
  private token: string | null = null;
  public isOnline: boolean = false;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (typeof window !== 'undefined' && window.location && window.location.origin.startsWith('http')) {
      this.baseUrl = window.location.origin;
    } else {
      this.baseUrl = 'http://localhost:5000';
    }

    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('spotify_token');
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem('spotify_token', token);
      else localStorage.removeItem('spotify_token');
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('spotify_token');
    }
    return this.token;
  }

  public async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = (await res.json().catch(() => ({}))) as T;

      if (!res.ok) {
        return {
          status: res.status,
          error: (data as { error?: string })?.error || `HTTP error ${res.status}`
        };
      }

      this.isOnline = true;
      return { status: res.status, data, success: true };
    } catch (err: unknown) {
      this.isOnline = false;
      const message = err instanceof Error ? err.message : 'Network unreachable';
      return { error: message, isOffline: true };
    }
  }

  // Health
  public async checkHealth(): Promise<boolean> {
    const res = await this.request<{ status: string }>('/api/health');
    return !res.error && !!res.data && (res.data.status === 'ok' || res.data.status === 'online');
  }

  // Auth
  public async login(email: string, pass: string): Promise<ApiResponse<AuthResponse>> {
    const res = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('spotify_user', JSON.stringify(res.data.user));
      }
    }
    return res;
  }

  public async register(
    name: string,
    email: string,
    pass: string,
    birthYear?: number | string
  ): Promise<ApiResponse<AuthResponse>> {
    const res = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: pass, birthYear })
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('spotify_user', JSON.stringify(res.data.user));
      }
    }
    return res;
  }

  public async getMe(): Promise<ApiResponse<{ user: User }>> {
    return await this.request<{ user: User }>('/api/auth/me');
  }

  public async updateProfile(updates: UserProfileUpdates): Promise<ApiResponse<{ user: User }>> {
    return await this.request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Tracks
  public async getTracks(query = '', genre = ''): Promise<ApiResponse<{ tracks: Track[]; count: number }>> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (genre && genre !== 'all') params.append('genre', genre);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await this.request<{ tracks: Track[]; count: number }>(`/api/tracks${qs}`);
  }

  public async getTrackById(id: number | string): Promise<ApiResponse<{ track: Track }>> {
    return await this.request<{ track: Track }>(`/api/tracks/${id}`);
  }

  // Search
  public async search(query: string): Promise<ApiResponse<UnifiedSearchResponse>> {
    return await this.request<UnifiedSearchResponse>(`/api/search?q=${encodeURIComponent(query || '')}`);
  }

  // Podcasts
  public async getPodcasts(category = '', q = ''): Promise<ApiResponse<{ podcasts: PodcastShow[]; count: number }>> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (q) params.append('q', q);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await this.request<{ podcasts: PodcastShow[]; count: number }>(`/api/podcasts${qs}`);
  }

  public async getPodcastById(id: number | string): Promise<ApiResponse<{ podcast: PodcastShow }>> {
    return await this.request<{ podcast: PodcastShow }>(`/api/podcasts/${id}`);
  }

  // Playlists
  public async getPlaylists(): Promise<ApiResponse<{ playlists: Playlist[]; count: number }>> {
    return await this.request<{ playlists: Playlist[]; count: number }>('/api/playlists');
  }

  public async createPlaylist(name: string, desc = ''): Promise<ApiResponse<{ playlist: Playlist }>> {
    return await this.request<{ playlist: Playlist }>('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, description: desc })
    });
  }

  // Likes & Subscriptions
  public async getLikes(): Promise<ApiResponse<LikesResponse>> {
    return await this.request<LikesResponse>('/api/user/likes');
  }

  public async toggleLike(trackId: number): Promise<ApiResponse<LikesResponse>> {
    return await this.request<LikesResponse>('/api/user/likes', {
      method: 'POST',
      body: JSON.stringify({ trackId })
    });
  }

  public async updateSubscription(tier: SubscriptionTier): Promise<ApiResponse<{ user: User }>> {
    return await this.request<{ user: User }>('/api/user/subscription', {
      method: 'PUT',
      body: JSON.stringify({ tier })
    });
  }

  public logout(): void {
    this.setToken(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('spotify_user');
    }
  }
}

export const typedSpotifyApi = new TypedSpotifyApiClient();

