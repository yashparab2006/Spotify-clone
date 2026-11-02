"use strict";
/**
 * Type-Safe Spotify REST API Client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.typedSpotifyApi = exports.TypedSpotifyApiClient = void 0;
class TypedSpotifyApiClient {
    baseUrl;
    token = null;
    isOnline = false;
    constructor(baseUrl) {
        if (baseUrl) {
            this.baseUrl = baseUrl;
        }
        else if (typeof window !== 'undefined' && window.location && window.location.origin.startsWith('http')) {
            this.baseUrl = window.location.origin;
        }
        else {
            this.baseUrl = 'http://localhost:5000';
        }
        if (typeof localStorage !== 'undefined') {
            this.token = localStorage.getItem('spotify_token');
        }
    }
    setToken(token) {
        this.token = token;
        if (typeof localStorage !== 'undefined') {
            if (token)
                localStorage.setItem('spotify_token', token);
            else
                localStorage.removeItem('spotify_token');
        }
    }
    getToken() {
        if (!this.token && typeof localStorage !== 'undefined') {
            this.token = localStorage.getItem('spotify_token');
        }
        return this.token;
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
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
            const data = (await res.json().catch(() => ({})));
            if (!res.ok) {
                return {
                    status: res.status,
                    error: data?.error || `HTTP error ${res.status}`
                };
            }
            this.isOnline = true;
            return { status: res.status, data, success: true };
        }
        catch (err) {
            this.isOnline = false;
            const message = err instanceof Error ? err.message : 'Network unreachable';
            return { error: message, isOffline: true };
        }
    }
    // Health
    async checkHealth() {
        const res = await this.request('/api/health');
        return !res.error && !!res.data && (res.data.status === 'ok' || res.data.status === 'online');
    }
    // Auth
    async login(email, pass) {
        const res = await this.request('/api/auth/login', {
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
    async register(name, email, pass, birthYear) {
        const res = await this.request('/api/auth/register', {
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
    async getMe() {
        return await this.request('/api/auth/me');
    }
    async updateProfile(updates) {
        return await this.request('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    // Tracks
    async getTracks(query = '', genre = '') {
        const params = new URLSearchParams();
        if (query)
            params.append('q', query);
        if (genre && genre !== 'all')
            params.append('genre', genre);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return await this.request(`/api/tracks${qs}`);
    }
    async getTrackById(id) {
        return await this.request(`/api/tracks/${id}`);
    }
    // Search
    async search(query) {
        return await this.request(`/api/search?q=${encodeURIComponent(query || '')}`);
    }
    // Podcasts
    async getPodcasts(category = '', q = '') {
        const params = new URLSearchParams();
        if (category && category !== 'All')
            params.append('category', category);
        if (q)
            params.append('q', q);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return await this.request(`/api/podcasts${qs}`);
    }
    async getPodcastById(id) {
        return await this.request(`/api/podcasts/${id}`);
    }
    // Playlists
    async getPlaylists() {
        return await this.request('/api/playlists');
    }
    async createPlaylist(name, desc = '') {
        return await this.request('/api/playlists', {
            method: 'POST',
            body: JSON.stringify({ name, description: desc })
        });
    }
    // Likes & Subscriptions
    async getLikes() {
        return await this.request('/api/user/likes');
    }
    async toggleLike(trackId) {
        return await this.request('/api/user/likes', {
            method: 'POST',
            body: JSON.stringify({ trackId })
        });
    }
    async updateSubscription(tier) {
        return await this.request('/api/user/subscription', {
            method: 'PUT',
            body: JSON.stringify({ tier })
        });
    }
    logout() {
        this.setToken(null);
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('spotify_user');
        }
    }
}
exports.TypedSpotifyApiClient = TypedSpotifyApiClient;
exports.typedSpotifyApi = new TypedSpotifyApiClient();
//# sourceMappingURL=api.js.map