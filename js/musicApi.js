/**
 * Music API Service - Audius API Integration
 * Decoupled API service for fetching real songs, trending music, search, and audio stream URLs.
 */

const AUDIUS_APP_NAME = 'SPOTIFY_CLONE';
const AUDIUS_HOST = 'https://api.audius.co/v1';
const DEFAULT_ARTWORK = './assesst/card1img.jpeg';

class MusicApiService {
    constructor() {
        this.cache = new Map();
    }

    normalizeTrack(item) {
        if (!item) return null;
        const artwork = item.artwork || {};
        const artworkUrl = artwork['480x480'] || artwork['150x150'] || artwork['1000x1000'] || item.img || DEFAULT_ARTWORK;
        const streamUrl = item.streamUrl || `${AUDIUS_HOST}/tracks/${item.id}/stream?app_name=${AUDIUS_APP_NAME}`;

        return {
            id: String(item.id),
            title: item.title || 'Untitled Track',
            artist: (item.user && (item.user.name || item.user.handle)) || item.artist || 'Unknown Artist',
            artistId: item.user ? item.user.id : (item.artistId || null),
            img: artworkUrl,
            duration: item.duration || 180,
            streamUrl: streamUrl,
            genre: item.genre || 'Trending',
            source: item.source || 'audius'
        };
    }

    async getTrending(limit = 12) {
        const cacheKey = `trending_${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Try Express backend proxy first
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(`/api/music/trending?limit=${limit}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.tracks) && json.tracks.length > 0) {
                    const tracks = json.tracks.map(t => this.normalizeTrack(t));
                    this.cache.set(cacheKey, tracks);
                    return tracks;
                }
            }
        } catch (e) {
            // Backend unreachable, fallback to direct Audius
        }

        // Direct Audius Gateway
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(`${AUDIUS_HOST}/tracks/trending?app_name=${AUDIUS_APP_NAME}&limit=${limit}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const json = await res.json();
                if (json.data && Array.isArray(json.data)) {
                    const tracks = json.data.map(t => this.normalizeTrack(t));
                    this.cache.set(cacheKey, tracks);
                    return tracks;
                }
            }
        } catch (e) {
            console.warn('Direct Audius trending fetch failed, using fallback tracks:', e);
        }

        // Fallback to local playlist
        return typeof playlist !== 'undefined' ? playlist : [];
    }

    async search(query, limit = 15) {
        const q = (query || '').trim();
        if (!q) return [];

        const cacheKey = `search_${q.toLowerCase()}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Try Express backend proxy first
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}&limit=${limit}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.tracks)) {
                    const tracks = json.tracks.map(t => this.normalizeTrack(t));
                    this.cache.set(cacheKey, tracks);
                    return tracks;
                }
            }
        } catch (e) {
            // Backend unreachable, fallback to direct Audius
        }

        // Direct Audius Gateway
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(`${AUDIUS_HOST}/tracks/search?query=${encodeURIComponent(q)}&app_name=${AUDIUS_APP_NAME}&limit=${limit}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const json = await res.json();
                if (json.data && Array.isArray(json.data)) {
                    const tracks = json.data.map(t => this.normalizeTrack(t));
                    this.cache.set(cacheKey, tracks);
                    return tracks;
                }
            }
        } catch (e) {
            console.warn('Direct Audius search failed, falling back:', e);
        }

        // Fallback to in-memory filter
        if (typeof playlist !== 'undefined') {
            const lower = q.toLowerCase();
            return playlist.filter(t =>
                t.title.toLowerCase().includes(lower) ||
                t.artist.toLowerCase().includes(lower) ||
                (t.genre && t.genre.toLowerCase().includes(lower))
            );
        }

        return [];
    }

    async getArtist(artistId) {
        if (!artistId) return null;
        try {
            const res = await fetch(`${AUDIUS_HOST}/users/${artistId}?app_name=${AUDIUS_APP_NAME}`);
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    const u = json.data;
                    return {
                        id: u.id,
                        name: u.name,
                        handle: u.handle,
                        bio: u.bio,
                        profilePicture: u.profile_picture ? u.profile_picture['480x480'] : null,
                        followers: u.follower_count || 0
                    };
                }
            }
        } catch (e) {
            console.warn('Artist details fetch failed:', e);
        }
        return null;
    }
}

export const musicApi = new MusicApiService();

