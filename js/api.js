/**
 * Spotify Clone - Backend API Client
 * Provides seamless communication with Node.js/Express backend (/api/*)
 * with automatic fallback to offline local storage when running standalone.
 */

const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http'))
    ? window.location.origin
    : 'http://localhost:5000';

class SpotifyApiClient {
    constructor() {
        this.token = (typeof localStorage !== 'undefined') ? localStorage.getItem('spotify_token') || null : null;
        this.isOnline = false;
    }

    setToken(token) {
        this.token = token;
        if (typeof localStorage !== 'undefined') {
            if (token) localStorage.setItem('spotify_token', token);
            else localStorage.removeItem('spotify_token');
        }
    }

    getToken() {
        if (!this.token && typeof localStorage !== 'undefined') {
            this.token = localStorage.getItem('spotify_token');
        }
        return this.token;
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
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
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                return { error: data.error || `HTTP error ${res.status}`, status: res.status };
            }
            this.isOnline = true;
            return { data, status: res.status };
        } catch (err) {
            this.isOnline = false;
            return { error: err.message || 'Network unreachable', isOffline: true };
        }
    }

    // Health
    async checkHealth() {
        const res = await this.request('/api/health');
        return !res.error && res.data && (res.data.status === 'ok' || res.data.status === 'online');
    }

    // Auth
    async login(email, password) {
        const res = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (res.data && res.data.token) {
            this.setToken(res.data.token);
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('spotify_user', JSON.stringify(res.data.user));
            }
        }
        return res;
    }

    async register(name, email, password, birthYear) {
        const res = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, birthYear })
        });
        if (res.data && res.data.token) {
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
        if (query) params.append('q', query);
        if (genre && genre !== 'all') params.append('genre', genre);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return await this.request(`/api/tracks${qs}`);
    }

    async getTrackById(id) {
        return await this.request(`/api/tracks/${id}`);
    }

    // Playlists
    async getPlaylists() {
        return await this.request('/api/playlists');
    }

    async createPlaylist(name, description = '') {
        return await this.request('/api/playlists', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
    }

    async addTrackToPlaylist(playlistId, trackId) {
        return await this.request(`/api/playlists/${playlistId}/tracks`, {
            method: 'POST',
            body: JSON.stringify({ trackId })
        });
    }

    async removeTrackFromPlaylist(playlistId, trackId) {
        return await this.request(`/api/playlists/${playlistId}/tracks/${trackId}`, {
            method: 'DELETE'
        });
    }

    // Likes & User
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

export const spotifyApi = new SpotifyApiClient();

