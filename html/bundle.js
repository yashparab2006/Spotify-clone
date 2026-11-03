// Spotify Clone - Universal Standalone Bundle (Works on file:/// and http://)

;(function() {

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

    // Search & Podcasts
    async search(query) {
        return await this.request(`/api/search?q=${encodeURIComponent(query || '')}`);
    }

    async getPodcasts(category = '', q = '') {
        const params = new URLSearchParams();
        if (category && category !== 'All') params.append('category', category);
        if (q) params.append('q', q);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return await this.request(`/api/podcasts${qs}`);
    }

    async getPodcastById(id) {
        return await this.request(`/api/podcasts/${id}`);
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

const spotifyApi = new SpotifyApiClient();



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

    async getTrending(limit = 16, genre = '') {
        const cacheKey = `trending_${genre}_${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const genreParam = genre ? `&genre=${encodeURIComponent(genre)}` : '';

        // Try Express backend proxy first
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(`/api/music/trending?limit=${limit}${genreParam}`, { signal: controller.signal });
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
            const res = await fetch(`${AUDIUS_HOST}/tracks/trending?app_name=${AUDIUS_APP_NAME}&limit=${limit}${genreParam}`, { signal: controller.signal });
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

    async getFeed() {
        const cacheKey = 'home_feed';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Try Express backend proxy /api/music/feed
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch('/api/music/feed', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    const normList = (arr) => (Array.isArray(arr) ? arr.map(t => this.normalizeTrack(t)) : []);
                    const feed = {
                        trending: normList(json.trending),
                        pop: normList(json.pop),
                        electronic: normList(json.electronic),
                        hiphop: normList(json.hiphop),
                        chill: normList(json.chill),
                        bollywood: normList(json.bollywood),
                        romance: normList(json.romance),
                        punjabi: normList(json.punjabi)
                    };
                    this.cache.set(cacheKey, feed);
                    return feed;
                }
            }
        } catch (e) {}

        // Fallback using direct Audius trending
        const trending = await this.getTrending(24);
        return {
            trending: trending.slice(0, 10),
            pop: trending.slice(2, 9),
            electronic: trending.slice(4, 11),
            hiphop: trending.slice(6, 13),
            chill: trending.slice(8, 15),
            bollywood: trending.slice(0, 10),
            romance: trending.slice(2, 8),
            punjabi: trending.slice(3, 9)
        };
    }

    async getBollywood(limit = 24) {
        const cacheKey = `bollywood_${limit}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(`/api/music/bollywood?limit=${limit}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.tracks)) {
                    const tracks = json.tracks.map(t => this.normalizeTrack(t));
                    this.cache.set(cacheKey, tracks);
                    return tracks;
                }
            }
        } catch (e) {}

        return this.search('Bollywood', limit);
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

const musicApi = new MusicApiService();



const playlist = [
    {
        "id": 1,
        "title": "Top 50 - Global",
        "artist": "Spotify Charts",
        "img": "./assesst/card1img.jpeg",
        "duration": 213,
        "streamUrl": "https://api.audius.co/v1/tracks/W08NKdZ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Pop / Charts",
        "category": "Trending",
        "rootFreq": 261.63,
        "chords": [
            [
                261.63,
                329.63,
                392
            ],
            [
                220,
                261.63,
                329.63
            ],
            [
                174.61,
                220,
                261.63
            ],
            [
                196,
                246.94,
                293.66
            ]
        ],
        "tempo": 104,
        "lyrics": [
            "♪ Welcome to the Top 50 - Global countdown ♪",
            "Trending all across the worldwide waves",
            "Number one vibes taking over the stage",
            "Turn the volume higher, let the rhythm ignite",
            "Global hits echoing throughout the night"
        ]
    },
    {
        "id": 2,
        "title": "Mahiya Jinna Sohna",
        "artist": "Darshan Raval",
        "img": "./assesst/card2img.jpeg",
        "duration": 195,
        "streamUrl": "https://api.audius.co/v1/tracks/r70GlbZ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Romantic / Bollywood",
        "category": "Bollywood",
        "rootFreq": 293.66,
        "chords": [
            [
                293.66,
                369.99,
                440
            ],
            [
                246.94,
                293.66,
                369.99
            ],
            [
                196,
                246.94,
                293.66
            ],
            [
                220,
                277.18,
                329.63
            ]
        ],
        "tempo": 92,
        "lyrics": [
            "♪ Tu hi meri zindagani, tu hi chain mera ♪",
            "Mahiya jinna sohna koi hor na mileya",
            "Akhiyan ch teri bas khwab sajaake",
            "Rabb ton vi pehla tera naam leya"
        ]
    },
    {
        "id": 3,
        "title": "Mere Paas Tum Ho",
        "artist": "Rahat Fateh Ali Khan",
        "img": "./assesst/card3img.jpeg",
        "duration": 248,
        "streamUrl": "https://api.audius.co/v1/tracks/zz0MEGP/stream?app_name=SPOTIFY_CLONE",
        "genre": "Sufi / Soul",
        "category": "Bollywood",
        "rootFreq": 220,
        "chords": [
            [
                220,
                261.63,
                329.63
            ],
            [
                174.61,
                220,
                261.63
            ],
            [
                196,
                246.94,
                293.66
            ],
            [
                164.81,
                207.65,
                246.94
            ]
        ],
        "tempo": 78,
        "lyrics": [
            "♪ Bhool jaane ka hunar mujhko sikhate jaao ♪",
            "Ja rahe ho toh sabhi naqsh mitaate jaao",
            "Chalo maana ki yeh kismat ka faisla tha",
            "Mere paas tum ho, bas itna bataate jaao"
        ]
    },
    {
        "id": 4,
        "title": "Naa Ready - Leo",
        "artist": "Anirudh Ravichander, Thalapathy Vijay",
        "img": "./assesst/card4img.jpeg",
        "duration": 188,
        "streamUrl": "https://api.audius.co/v1/tracks/87GrbyW/stream?app_name=SPOTIFY_CLONE",
        "genre": "Soundtrack / Dance",
        "category": "Trending",
        "rootFreq": 329.63,
        "chords": [
            [
                164.81,
                196,
                246.94
            ],
            [
                174.61,
                220,
                261.63
            ],
            [
                196,
                246.94,
                293.66
            ],
            [
                164.81,
                196,
                246.94
            ]
        ],
        "tempo": 128,
        "lyrics": [
            "♪ Aagasam idikithu, aalungallum aaduthu ♪",
            "Naa ready thaan varava, aiyya thaaru maara varava",
            "Thannanthani aalaaga vaaren da",
            "Thalapathy entry tharuvein da!"
        ]
    },
    {
        "id": 5,
        "title": "Starboy",
        "artist": "The Weeknd, Daft Punk",
        "img": "./assesst/card3img.jpeg",
        "duration": 230,
        "streamUrl": "https://api.audius.co/v1/tracks/WYKbAE6/stream?app_name=SPOTIFY_CLONE",
        "genre": "Pop / R&B",
        "category": "Pop",
        "rootFreq": 246.94,
        "chords": [
            [
                246.94,
                293.66,
                369.99
            ],
            [
                220,
                261.63,
                329.63
            ],
            [
                196,
                246.94,
                293.66
            ],
            [
                246.94,
                293.66,
                369.99
            ]
        ],
        "tempo": 112,
        "lyrics": [
            "♪ I'm trying to put you in the worst mood, ah ♪",
            "P1 cleaner than your church shoes, ah",
            "Look what you've done",
            "I'm a motherf***ing starboy!"
        ]
    },
    {
        "id": 6,
        "title": "Blinding Lights",
        "artist": "The Weeknd",
        "img": "./assesst/card4img.jpeg",
        "duration": 200,
        "streamUrl": "https://api.audius.co/v1/tracks/y8rNVYP/stream?app_name=SPOTIFY_CLONE",
        "genre": "Synthwave / Pop",
        "category": "Pop",
        "rootFreq": 349.23,
        "chords": [
            [
                349.23,
                440,
                523.25
            ],
            [
                293.66,
                349.23,
                440
            ],
            [
                261.63,
                329.63,
                392
            ],
            [
                196,
                246.94,
                293.66
            ]
        ],
        "tempo": 130,
        "lyrics": [
            "♪ I've been on my own for long enough ♪",
            "Maybe you can show me how to love, maybe",
            "I'm blinded by the lights",
            "No, I can't sleep until I feel your touch"
        ]
    },
    {
        "id": 7,
        "title": "Top Songs - Global",
        "artist": "Weekly Music Charts",
        "img": "./assesst/card5img.jpeg",
        "duration": 222,
        "streamUrl": "https://api.audius.co/v1/tracks/Ma6qb3x/stream?app_name=SPOTIFY_CLONE",
        "genre": "Top Charts",
        "category": "Trending",
        "rootFreq": 261.63,
        "chords": [
            [
                261.63,
                329.63,
                392
            ],
            [
                196,
                246.94,
                293.66
            ],
            [
                220,
                261.63,
                329.63
            ],
            [
                174.61,
                220,
                261.63
            ]
        ],
        "tempo": 100,
        "lyrics": [
            "♪ Global vibes spinning all week long ♪",
            "Catch the sound of the world in a single song",
            "Melodies in flight under the northern sky"
        ]
    },
    {
        "id": 8,
        "title": "Top Songs - India",
        "artist": "Weekly Music Charts - India",
        "img": "./assesst/card6img.jpeg",
        "duration": 175,
        "streamUrl": "https://api.audius.co/v1/tracks/7MWpzKW/stream?app_name=SPOTIFY_CLONE",
        "genre": "Indian Hits",
        "category": "Bollywood",
        "rootFreq": 293.66,
        "chords": [
            [
                293.66,
                369.99,
                440
            ],
            [
                220,
                261.63,
                329.63
            ],
            [
                196,
                246.94,
                293.66
            ],
            [
                220,
                277.18,
                329.63
            ]
        ],
        "tempo": 108,
        "lyrics": [
            "♪ Desi beats and rhythms that never cease ♪",
            "Bollywood magic and regional masterpiece",
            "Dance through the streets till the break of day"
        ]
    },
    {
        "id": 9,
        "title": "Trending Chill Hits",
        "artist": "Spotify Curated",
        "img": "./assesst/card1img.jpeg",
        "duration": 205,
        "streamUrl": "https://api.audius.co/v1/tracks/XkZ4wW7/stream?app_name=SPOTIFY_CLONE",
        "genre": "Chillhop / Lo-Fi",
        "category": "Ambient",
        "rootFreq": 220,
        "chords": [
            [
                220,
                261.63,
                329.63
            ],
            [
                174.61,
                220,
                261.63
            ],
            [
                261.63,
                329.63,
                392
            ],
            [
                196,
                246.94,
                293.66
            ]
        ],
        "tempo": 84,
        "lyrics": [
            "♪ Gentle breeze softly drifting by ♪",
            "Lo-fi frequencies soothing your mind",
            "Take a deep breath and let the worries unwind"
        ]
    },
    {
        "id": "W08NKdZ",
        "title": "iLLPeTiLL - Post HospitiLL Slapperzzz Mix (Audius Exclusive)",
        "artist": "@iLLPeTiLL",
        "img": "https://audius-01.staked.cloud/content/baeaaaiqsedszpcmjuiem7b5qilvws4622vnsrht4ybnlqldmfzgxogcogawsa/480x480.jpg",
        "duration": 394,
        "streamUrl": "https://api.audius.co/v1/tracks/W08NKdZ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Electronic",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "r70GlbZ",
        "title": "LOUDWERX - Bass Go Boom ft. Magic & Bird",
        "artist": "LOUDWERX",
        "img": "https://audius-content-10.figment.io/content/baeaaaiqsedv77iyejev2g7fmngtxea47joo45fnvx3h2mmcg46fhrl4fw6c2e/480x480.jpg",
        "duration": 156,
        "streamUrl": "https://api.audius.co/v1/tracks/r70GlbZ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Electronic",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "zz0MEGP",
        "title": "3BallMTY, La Goony, Miss Bashful, dj g2g - Chicas Tribaleras",
        "artist": "3BallMTY",
        "img": "https://audius-content-13.figment.io/content/baeaaaiqsebv2y3vywliftwqnrwss35yw6pc5rr2pxopojuh4ap5jqbontmvog/480x480.jpg",
        "duration": 171,
        "streamUrl": "https://api.audius.co/v1/tracks/zz0MEGP/stream?app_name=SPOTIFY_CLONE",
        "genre": "Latin",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "87GrbyW",
        "title": "Elastic Illusions",
        "artist": "ShrivL",
        "img": "https://audius-02.staked.cloud/content/baeaaaiqsedfcwrasripxf5oypr7xaj72neg5lv64e4pqqcvsiw4nb2mmmu4iq/480x480.jpg",
        "duration": 231,
        "streamUrl": "https://api.audius.co/v1/tracks/87GrbyW/stream?app_name=SPOTIFY_CLONE",
        "genre": "Electronic",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "WYKbAE6",
        "title": "I GOT DAT",
        "artist": "Remy Heart 🖤",
        "img": "https://audius-content-14.figment.io/content/baeaaaiqseauevfl2vwzii5msnrybpatr6b7ivj2fdi57jt4nedsf5btxh5b6a/480x480.jpg",
        "duration": 181,
        "streamUrl": "https://api.audius.co/v1/tracks/WYKbAE6/stream?app_name=SPOTIFY_CLONE",
        "genre": "Trap",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "Ma6qb3x",
        "title": "Deadly Combo [DISKADE AND OHNOITSDOUG BOOTLEG] ",
        "artist": "DISKADE",
        "img": "https://audius-content-3.figment.io/content/baeaaaiqsea7qfsfrvfql7yfawextntwzkalfepab7uj3smz6hrn7lu7jvq7vc/480x480.jpg",
        "duration": 304,
        "streamUrl": "https://api.audius.co/v1/tracks/Ma6qb3x/stream?app_name=SPOTIFY_CLONE",
        "genre": "Dubstep",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "y8rNVYP",
        "title": "Trianglory - herewithme (False Dawn Remix)",
        "artist": "False Dawn",
        "img": "https://v.monophonic.digital/content/baeaaaiqsebp6m62ecizabqrfrjqae4afsyrfa655pie2nd3l2anpdpyhqtkri/480x480.jpg",
        "duration": 237,
        "streamUrl": "https://api.audius.co/v1/tracks/y8rNVYP/stream?app_name=SPOTIFY_CLONE",
        "genre": "Dubstep",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "7MWpzKW",
        "title": "Tahoe",
        "artist": "Andrew Lux",
        "img": "https://v.audius.rickyrombo.com/content/baeaaaiqsed3iug5hq6bs3u6mbthes27yjsfm2jwzsipqjzydu7wh7qn4fjyas/480x480.jpg",
        "duration": 226,
        "streamUrl": "https://api.audius.co/v1/tracks/7MWpzKW/stream?app_name=SPOTIFY_CLONE",
        "genre": "Deep House",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "3J4gk28",
        "title": "Big Boy Shoes (Original Mix)",
        "artist": "GORDO DJ (BR)",
        "img": "https://v.monophonic.digital/content/baeaaaiqsecroc4g47rgw2tfc3h5wwfyflg4ta2bmae3hv7n5nhselhkjpnx74/480x480.jpg",
        "duration": 289,
        "streamUrl": "https://api.audius.co/v1/tracks/3J4gk28/stream?app_name=SPOTIFY_CLONE",
        "genre": "House",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "J5K5O40",
        "title": "ellipse - are you lonely",
        "artist": "ellipse (ill-esha)",
        "img": "https://v.monophonic.digital/content/baeaaaiqsecudfk3p2pagkoixu4ifcp53hfuvfvfi66lkiasngh2mdbss6vyvm/480x480.jpg",
        "duration": 272,
        "streamUrl": "https://api.audius.co/v1/tracks/J5K5O40/stream?app_name=SPOTIFY_CLONE",
        "genre": "Trip-hop, Downtempo",
        "category": "Trending",
        "source": "audius"
    },
    {
        "id": "4gBM54a",
        "title": "Time Will Tell ",
        "artist": "J Miguel",
        "img": "https://v.monophonic.digital/content/baeaaaiqsednr6gpbedx7opkksmfghorpqi7ldecjoz6hb5adsqjucqcb6kf4i/480x480.jpg",
        "duration": 178,
        "streamUrl": "https://api.audius.co/v1/tracks/4gBM54a/stream?app_name=SPOTIFY_CLONE",
        "genre": "Pop",
        "category": "Pop",
        "source": "audius"
    },
    {
        "id": "yyR1OZE",
        "title": "Housewife (Chris Bessy Remix)",
        "artist": "Chris Bessy",
        "img": "https://audius-discovery-3.altego.net/content/baeaaaiqseawsv6elpg22da4bq6lnoxn27xnf5tyxkunmcfszg6k7xqmhmymwy/480x480.jpg",
        "duration": 232,
        "streamUrl": "https://api.audius.co/v1/tracks/yyR1OZE/stream?app_name=SPOTIFY_CLONE",
        "genre": "Pop",
        "category": "Pop",
        "source": "audius"
    },
    {
        "id": "73wZ5KW",
        "title": "EVIL",
        "artist": "SYNN BEATS",
        "img": "https://audius-content-6.figment.io/content/baeaaaiqsecmtvs2f2k55fxfoy2xrqnsykjcu3hz2nramfertm5lfakrz5o7lg/480x480.jpg",
        "duration": 192,
        "streamUrl": "https://api.audius.co/v1/tracks/73wZ5KW/stream?app_name=SPOTIFY_CLONE",
        "genre": "Pop",
        "category": "Pop",
        "source": "audius"
    },
    {
        "id": "pRVKwlX",
        "title": "If You Were Religious Your A Heathen",
        "artist": "Oscaribarraflorez",
        "img": "https://audius-content-4.figment.io/content/baeaaaiqsedt2cddd7nosaeonys4y3mun52fxqbnwsv33y7y3mpyzcpiudamfc/480x480.jpg",
        "duration": 114,
        "streamUrl": "https://api.audius.co/v1/tracks/pRVKwlX/stream?app_name=SPOTIFY_CLONE",
        "genre": "Pop",
        "category": "Pop",
        "source": "audius"
    },
    {
        "id": "AVNAo60",
        "title": "FADED  ",
        "artist": "IAMIK",
        "img": "https://val003.open-audio-validator.com/content/baeaaaiqsecjg7n5ifiv3cybylx7alfa2j3ltb3nb6z72s5pkpxtwc6ziaeeea/480x480.jpg",
        "duration": 189,
        "streamUrl": "https://api.audius.co/v1/tracks/AVNAo60/stream?app_name=SPOTIFY_CLONE",
        "genre": "Pop",
        "category": "Pop",
        "source": "audius"
    },
    {
        "id": "5O26R6M",
        "title": "chewing gum",
        "artist": "Larry Styles",
        "img": "https://validator.soundmaxx.xyz/content/baeaaaiqseawyt4hqa3xgxcuuwie3qz4ycagbg5vjpcmam3spb7wzkzawwkjdw/480x480.jpg",
        "duration": 158,
        "streamUrl": "https://api.audius.co/v1/tracks/5O26R6M/stream?app_name=SPOTIFY_CLONE",
        "genre": "Pop",
        "category": "Pop",
        "source": "audius"
    },
    {
        "id": "PbrG2vN",
        "title": "Vesper",
        "artist": "MARMA",
        "img": "https://val017.open-audio-validator.com/content/baeaaaiqseclnoursjo4cpffoftxcad766wys6hidscvvasfqu52bkfys6lhts/480x480.jpg",
        "duration": 126,
        "streamUrl": "https://api.audius.co/v1/tracks/PbrG2vN/stream?app_name=SPOTIFY_CLONE",
        "genre": "Electronic",
        "category": "Electronic",
        "source": "audius"
    },
    {
        "id": "Q08Wgov",
        "title": "BINAP - FOLD ",
        "artist": "Destinuna",
        "img": "https://audius-figment-1-validator-18.figment.io/content/baeaaaiqsebf5sggovvlno5jixe2hquup5b6hmeh5rxy6cuy2v6fu3zgeec2sy/480x480.jpg",
        "duration": 166,
        "streamUrl": "https://api.audius.co/v1/tracks/Q08Wgov/stream?app_name=SPOTIFY_CLONE",
        "genre": "Electronic",
        "category": "Electronic",
        "source": "audius"
    },
    {
        "id": "Nkp2Z6x",
        "title": "Beyonce - Yonce (MVMA Trap REMIX)",
        "artist": "MVMA",
        "img": "https://v.monophonic.digital/content/baeaaaiqseczkfbte3y76rxkfykandthxb64y5wnvejs4yocpvluove6i467eo/480x480.jpg",
        "duration": 163,
        "streamUrl": "https://api.audius.co/v1/tracks/Nkp2Z6x/stream?app_name=SPOTIFY_CLONE",
        "genre": "Electronic",
        "category": "Electronic",
        "source": "audius"
    },
    {
        "id": "g479rv",
        "title": "n0zero, Mpaca, Long Paper - Hai Mai",
        "artist": "n0zero",
        "img": "https://val020.open-audio-validator.com/content/baeaaaiqseart5au3zktbrup7q5fuzu2q4vh74fmxwhic3e2gfkyfyajyqhelg/480x480.jpg",
        "duration": 178,
        "streamUrl": "https://api.audius.co/v1/tracks/g479rv/stream?app_name=SPOTIFY_CLONE",
        "genre": "Hip-Hop/Rap",
        "category": "Hip-Hop",
        "source": "audius"
    },
    {
        "id": "GNVplzb",
        "title": "LOVE NO MORE | Emotional Rap Instrumental 2026",
        "artist": "I.R.T Beats",
        "img": "https://val013.open-audio-validator.com/content/baeaaaiqsebvirqlibichtgm3ugxxawn3yfy6xacf2u5vv6ebjpcfrnwkuzxx2/480x480.jpg",
        "duration": 165,
        "streamUrl": "https://api.audius.co/v1/tracks/GNVplzb/stream?app_name=SPOTIFY_CLONE",
        "genre": "Hip-Hop/Rap",
        "category": "Hip-Hop",
        "source": "audius"
    },
    {
        "id": "9d09Kjk",
        "title": "On The Outside (Mastered)",
        "artist": "Audio Krak",
        "img": "https://audius-content-6.figment.io/content/baeaaaiqsec5lzssb3jogg2la5chgkt52lhuc7puva4fmbwgoqjflaeipfe4aw/480x480.jpg",
        "duration": 222,
        "streamUrl": "https://api.audius.co/v1/tracks/9d09Kjk/stream?app_name=SPOTIFY_CLONE",
        "genre": "Hip-Hop/Rap",
        "category": "Hip-Hop",
        "source": "audius"
    },
    {
        "id": "z8wyzpj",
        "title": "Any Questions?",
        "artist": "Aarr Kellz",
        "img": "https://audius-content-6.figment.io/content/baeaaaiqsedej6chqfjkr7dkmdizvotz5iafq2kmcuz5k4xk3bxygi6bt4445y/480x480.jpg",
        "duration": 192,
        "streamUrl": "https://api.audius.co/v1/tracks/z8wyzpj/stream?app_name=SPOTIFY_CLONE",
        "genre": "Hip-Hop/Rap",
        "category": "Hip-Hop",
        "source": "audius"
    },
    {
        "id": "WNq6QP0",
        "title": "Egotistical Non Binary Neuter",
        "artist": "Scan-N-Kutt",
        "img": "https://val012.open-audio-validator.com/content/baeaaaiqsebbw27yn3bammdr3qe263pdxrm2cxutm43v74n4j2s7pwbhfl4nhw/480x480.jpg",
        "duration": 220,
        "streamUrl": "https://api.audius.co/v1/tracks/WNq6QP0/stream?app_name=SPOTIFY_CLONE",
        "genre": "Hip-Hop/Rap",
        "category": "Hip-Hop",
        "source": "audius"
    },
    {
        "id": "OxaqVG1",
        "title": "Baby Scarface (Feat. Joey Badass & Freddie Gibbs)",
        "artist": "Aarr Kellz",
        "img": "https://audius.zeogrid.com/content/baeaaaiqsecuoq3cwexlx3ngwlceihxposwezbrbs4ht7veaii5czld6cfwqau/480x480.jpg",
        "duration": 181,
        "streamUrl": "https://api.audius.co/v1/tracks/OxaqVG1/stream?app_name=SPOTIFY_CLONE",
        "genre": "Hip-Hop/Rap",
        "category": "Hip-Hop",
        "source": "audius"
    },
    {
        "id": "Oow989l",
        "title": "Lesson Five II: Breathe ft. Party Boy",
        "artist": "ChiefDijon",
        "img": "https://cn1.mainnet.audiusindex.org/content/baeaaaiqsedilwwm42xc4uegqdui2egoq633jun3lzxaqzoncnor7bvdqm525g/480x480.jpg",
        "duration": 406,
        "streamUrl": "https://api.audius.co/v1/tracks/Oow989l/stream?app_name=SPOTIFY_CLONE",
        "genre": "Ambient",
        "category": "Ambient",
        "source": "audius"
    },
    {
        "id": "y7gEGJX",
        "title": "A Journey without A Destination",
        "artist": "Jijikita",
        "img": "https://val005.open-audio-validator.com/content/baeaaaiqseddz5j44pshozj2i4plttmvfqddmkaxeb4ykl7n4dtxjgmk7r5pss/480x480.jpg",
        "duration": 300,
        "streamUrl": "https://api.audius.co/v1/tracks/y7gEGJX/stream?app_name=SPOTIFY_CLONE",
        "genre": "Ambient",
        "category": "Ambient",
        "source": "audius"
    },
    {
        "id": "PG4xP2X",
        "title": "Gurdjieff / Hartmann - Reading a Sacred Book",
        "artist": "Violin Soundscapes",
        "img": "https://audius-creator-10.theblueprint.xyz/content/baeaaaiqsedk7fey73nfrbhrtja2llmeudvpukbbybw6qv52ooxr6qay2xm2hs/480x480.jpg",
        "duration": 492,
        "streamUrl": "https://api.audius.co/v1/tracks/PG4xP2X/stream?app_name=SPOTIFY_CLONE",
        "genre": "Ambient",
        "category": "Ambient",
        "source": "audius"
    },
    {
        "id": "5zAd0Ax",
        "title": "Rain Desk Tokyo",
        "artist": "ta2",
        "img": "https://val008.open-audio-validator.com/content/baeaaaiqsed5k6f7i7v23lnybmndj4uqv6sfxh2xbn5heq4p65lmfh6em22drs/480x480.jpg",
        "duration": 188,
        "streamUrl": "https://api.audius.co/v1/tracks/5zAd0Ax/stream?app_name=SPOTIFY_CLONE",
        "genre": "Ambient",
        "category": "Ambient",
        "source": "audius"
    },
    {
        "id": "b9BBvkM",
        "title": "S O S",
        "artist": "SIENMOGUAPO",
        "img": "https://val001.open-audio-validator.com/content/baeaaaiqsecap6g6kzqmvarbt753uzhq4v3nf5ynkyg7jkge7zley63645phpu/480x480.jpg",
        "duration": 95,
        "streamUrl": "https://api.audius.co/v1/tracks/b9BBvkM/stream?app_name=SPOTIFY_CLONE",
        "genre": "Ambient",
        "category": "Ambient",
        "source": "audius"
    },
    {
        "id": "1dMz5X3",
        "title": "hypothermia",
        "artist": "dughtyyyy",
        "img": "https://audius-creator-13.theblueprint.xyz/content/baeaaaiqsecjalkn66qvpmdqslar5b5ppzsgq42c5hswn6h5lrypet3fckqnma/480x480.jpg",
        "duration": 127,
        "streamUrl": "https://api.audius.co/v1/tracks/1dMz5X3/stream?app_name=SPOTIFY_CLONE",
        "genre": "Ambient",
        "category": "Ambient",
        "source": "audius"
    },
    {
        "id": "ANM13",
        "title": "Bombay Tu Hi Re x ATTLAS (Bollywood Mashup)",
        "artist": "PARTYPREET",
        "img": "https://val006.open-audio-validator.com/content/QmR3ztcYSe6n28tMZwwxugawVLcpWHyMmqzzvBr7dTirMm/480x480.jpg",
        "duration": 150,
        "streamUrl": "https://api.audius.co/v1/tracks/ANM13/stream?app_name=SPOTIFY_CLONE",
        "genre": "Electronic",
        "category": "Bollywood",
        "source": "audius"
    },
    {
        "id": "laPYZ",
        "title": "Bollywood Action India",
        "artist": "Composer Squad",
        "img": "https://audius-creator-1.theblueprint.xyz/content/QmbfyyJmbaK6BFwBpnocPiW2kqmNj65qEYAmBjm4gEce5E/480x480.jpg",
        "duration": 120,
        "streamUrl": "https://api.audius.co/v1/tracks/laPYZ/stream?app_name=SPOTIFY_CLONE",
        "genre": "World",
        "category": "Bollywood",
        "source": "audius"
    },
    {
        "id": "ngEwp",
        "title": "10 Bollywood",
        "artist": "HasenChat Music",
        "img": "https://v.monophonic.digital/content/QmY4gHwXvCmk78V5R7co4VbkUGqso4cto4QQkoNmgaoSJj/480x480.jpg",
        "duration": 276,
        "streamUrl": "https://api.audius.co/v1/tracks/ngEwp/stream?app_name=SPOTIFY_CLONE",
        "genre": "Hip-Hop/Rap",
        "category": "Bollywood",
        "source": "audius"
    },
    {
        "id": "OvoBQ",
        "title": "Hona tha Pyaar | Atif Aslam Cover Song | Bollywood |Indian Music",
        "artist": "Daksh Kalra",
        "img": "https://audius-creator-1.theblueprint.xyz/content/QmQDX9mfK7ZREY7V94VHJmLiYYfBJmTNxTNpA2dcuiJt1K/480x480.jpg",
        "duration": 60,
        "streamUrl": "https://api.audius.co/v1/tracks/OvoBQ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Ambient",
        "category": "Bollywood",
        "source": "audius"
    },
    {
        "id": "Bql4x",
        "title": "Deewani Mastani Trap Remix (Bollywood Beat)",
        "artist": "gh0st",
        "img": "https://audius-creator-8.theblueprint.xyz/content/QmY3AKrk41fTJ4AoBuMm2o8MA6cHDBXUgEXbpMzXmqri5Q/480x480.jpg",
        "duration": 104,
        "streamUrl": "https://api.audius.co/v1/tracks/Bql4x/stream?app_name=SPOTIFY_CLONE",
        "genre": "Ambient",
        "category": "Bollywood",
        "source": "audius"
    },
    {
        "id": "0Er74",
        "title": "Bollywood Bop",
        "artist": "LionFish",
        "img": "https://audius-creator-1.theblueprint.xyz/content/Qmd5BfMmsdHaxRxwPibW77CdGbqXtXKQEfDGsntpY9rydh/480x480.jpg",
        "duration": 182,
        "streamUrl": "https://api.audius.co/v1/tracks/0Er74/stream?app_name=SPOTIFY_CLONE",
        "genre": "Soundtrack",
        "category": "Bollywood",
        "source": "audius"
    },
    {
        "id": "bdK4W",
        "title": "Mashup Punjabi Vs Hindi",
        "artist": "YKK",
        "img": "https://v.monophonic.digital/content/QmUSkUYvDrZHKgmWBW4bGotNf37EuGkT95oJbZY5k5AF1E/480x480.jpg",
        "duration": 230,
        "streamUrl": "https://api.audius.co/v1/tracks/bdK4W/stream?app_name=SPOTIFY_CLONE",
        "genre": "Soundtrack",
        "category": "Punjabi",
        "source": "audius"
    },
    {
        "id": "RNYgX",
        "title": "Bring ya Booty vs The Real Punjabi (Paul Lee VIP MIX)",
        "artist": "Paul Lee",
        "img": "https://v.monophonic.digital/content/QmVYprFow1UBKsCY6GgyLdbs8otkiPaxqF3PwFT48zvLZz/480x480.jpg",
        "duration": 177,
        "streamUrl": "https://api.audius.co/v1/tracks/RNYgX/stream?app_name=SPOTIFY_CLONE",
        "genre": "Moombahton",
        "category": "Punjabi",
        "source": "audius"
    },
    {
        "id": "3KRM8",
        "title": "Yasir Hussain Parmish Verma Latest Punjabi Songs New Punjabi Songs (mp3cut.net)",
        "artist": "YKK",
        "img": "https://audius-content-1.figment.io/content/QmUESMfW9i2NVmXm5dsVNtw2F5X2ejM4Bp8VCthyMU7Hse/480x480.jpg",
        "duration": 195,
        "streamUrl": "https://api.audius.co/v1/tracks/3KRM8/stream?app_name=SPOTIFY_CLONE",
        "genre": "Hip-Hop/Rap",
        "category": "Punjabi",
        "source": "audius"
    },
    {
        "id": "NkE5KjQ",
        "title": "Anparh Banda - Pal Punjabi, Amandeep",
        "artist": "Mita Gillan Wala",
        "img": "https://audius-figment-1-validator-18.figment.io/content/baeaaaiqsebdae5f7k6lweqlqgwlnxxkfebs5vskv2atlvlvaxdw6f3muyszbo/480x480.jpg",
        "duration": 290,
        "streamUrl": "https://api.audius.co/v1/tracks/NkE5KjQ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Pop",
        "category": "Punjabi",
        "source": "audius"
    },
    {
        "id": "ngBQk",
        "title": "Punjabi MC - Beware Of The Boys [BERGE Remix]",
        "artist": "BERGE",
        "img": "https://audius-creator-14.theblueprint.xyz/content/QmXYZrbaU6JLFKspDZtKLg3CVL7pmH6QqSRjGd2BZRVAQu/480x480.jpg",
        "duration": 125,
        "streamUrl": "https://api.audius.co/v1/tracks/ngBQk/stream?app_name=SPOTIFY_CLONE",
        "genre": "Jersey Club",
        "category": "Punjabi",
        "source": "audius"
    },
    {
        "id": "qPdGo",
        "title": "Srivalli -Punjabi Version- Pushpa Allu ",
        "artist": "YKK",
        "img": "https://val006.open-audio-validator.com/content/QmUESMfW9i2NVmXm5dsVNtw2F5X2ejM4Bp8VCthyMU7Hse/480x480.jpg",
        "duration": 111,
        "streamUrl": "https://api.audius.co/v1/tracks/qPdGo/stream?app_name=SPOTIFY_CLONE",
        "genre": "Experimental",
        "category": "Punjabi",
        "source": "audius"
    },
    {
        "id": "blQ8b",
        "title": "Arijit Singh - Tum Hi Ho",
        "artist": "Yulio",
        "img": "https://v.monophonic.digital/content/Qme468sKVmV5p5mTTgQQQZpNhkDV2jkuJyx1D61rpW3AQd/480x480.jpg",
        "duration": 241,
        "streamUrl": "https://api.audius.co/v1/tracks/blQ8b/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Arijit Singh",
        "source": "audius"
    },
    {
        "id": "3OVWk",
        "title": "Shayad | Arijit Singh song Cover | Daksh Kalra | Bollywood Music",
        "artist": "Daksh Kalra",
        "img": "https://v.monophonic.digital/content/QmTuUkWsM59R8wnnRGeJhkiRXHRH6kCUacTQa4bwCX3v8V/480x480.jpg",
        "duration": 176,
        "streamUrl": "https://api.audius.co/v1/tracks/3OVWk/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Arijit Singh",
        "source": "audius"
    },
    {
        "id": "aBB7a",
        "title": "Nashe Si Chadh Gayi - Arijit Singh -",
        "artist": "DaggyBuoy",
        "img": "https://audius-content-10.figment.io/content/QmdCnPVkNifbVL6c7zSBLxz7bKti8oyQJug4F6zidNqVPa/480x480.jpg",
        "duration": 238,
        "streamUrl": "https://api.audius.co/v1/tracks/aBB7a/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Arijit Singh",
        "source": "audius"
    },
    {
        "id": "blr1k",
        "title": "Arijit Singh - Tum Hi Ho - AlipBaTa",
        "artist": "hadiid surya sanjaya",
        "img": "https://validator.soundmaxx.xyz/content/QmW3UKmRP2sfnBNJyVUDbRevohLJv7fsFWfjnKkvugbJv3/480x480.jpg",
        "duration": 241,
        "streamUrl": "https://api.audius.co/v1/tracks/blr1k/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Arijit Singh",
        "source": "audius"
    },
    {
        "id": "my89Xyr",
        "title": "Arijit Singh Special | New Romantic Bollywood Mashup music",
        "artist": "NFThunk",
        "img": "https://v.monophonic.digital/content/01JRJ0WKMQ251499CD10J29TF0/480x480.jpg",
        "duration": 345,
        "streamUrl": "https://api.audius.co/v1/tracks/my89Xyr/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Arijit Singh",
        "source": "audius"
    },
    {
        "id": "gzJ05Rp",
        "title": "Love Vibes Atif Aslam, Arijit Singh, Jubin NautiyaHindi Mashup",
        "artist": "NFThunk",
        "img": "https://v.monophonic.digital/content/01JRWJZBAE0N4H643P85CCW309/480x480.jpg",
        "duration": 1307,
        "streamUrl": "https://api.audius.co/v1/tracks/gzJ05Rp/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Arijit Singh",
        "source": "audius"
    },
    {
        "id": "LWVVZ",
        "title": "Sajda Karu",
        "artist": "The Saab",
        "img": "https://val001.open-audio-validator.com/content/QmUVua1BU72j7dmgcpihLaWefX7jY8H7ikQEnVKR2Ra1J2/480x480.jpg",
        "duration": 310,
        "streamUrl": "https://api.audius.co/v1/tracks/LWVVZ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Atif Aslam",
        "source": "audius"
    },
    {
        "id": "r96NV",
        "title": "ATIF ASLAM - RONA CHADITA - MEL KARAADE RABBA HINDI MOVIE SONG AND DAI 128k",
        "artist": "Kuurram",
        "img": "https://audius-creator-17.theblueprint.xyz/content/QmYedg4eL5ZtYa5ubTJ7USNz8TGsoEbKX2qzR7e8pcTyxA/480x480.jpg",
        "duration": 353,
        "streamUrl": "https://api.audius.co/v1/tracks/r96NV/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Atif Aslam",
        "source": "audius"
    },
    {
        "id": "2j3JkJ0",
        "title": "Tajdar e Haram - Atif Aslam",
        "artist": "KamiAli",
        "img": "https://val007.open-audio-validator.com/content/01J64ZEABV6TZF2J91TJM0G8SM/480x480.jpg",
        "duration": 616,
        "streamUrl": "https://api.audius.co/v1/tracks/2j3JkJ0/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Atif Aslam",
        "source": "audius"
    },
    {
        "id": "X99pa",
        "title": "Atif Aslam-Dil Diya Gallan",
        "artist": "SILLY INDIVIDUAL",
        "img": "https://cn1.mainnet.audiusindex.org/content/QmZHbv3x5pSDCh5QMo2PHEYYCDMvpid5mGDZV1Cu8hVHQJ/480x480.jpg",
        "duration": 134,
        "streamUrl": "https://api.audius.co/v1/tracks/X99pa/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Atif Aslam",
        "source": "audius"
    },
    {
        "id": "r9QXg",
        "title": "Rabba Mehar Kari Darshan Raval Youngveer Aditya D Tru Makers Indie Music",
        "artist": "Albert20",
        "img": "https://audius-creator-9.theblueprint.xyz/content/QmVC5iR1RnSaQUtzUZHt9cXFJienLnmXveAZtaMwLEm6sx/480x480.jpg",
        "duration": 315,
        "streamUrl": "https://api.audius.co/v1/tracks/r9QXg/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Darshan Raval",
        "source": "audius"
    },
    {
        "id": "WggZv",
        "title": "Darshan Raval-Asal Mein",
        "artist": "SILLY INDIVIDUAL",
        "img": "https://audius-creator-6.theblueprint.xyz/content/QmRixfQa3XwANq8o5gi4D6M1C5J9VMQz3AVhufywQ72XzL/480x480.jpg",
        "duration": 178,
        "streamUrl": "https://api.audius.co/v1/tracks/WggZv/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Darshan Raval",
        "source": "audius"
    },
    {
        "id": "BxY9P",
        "title": "Ishq Chadha Hai Darshan Raval artist440",
        "artist": "Saifkahan",
        "img": "https://audius-creator-1.theblueprint.xyz/content/QmfETAzWZUjT6cQjwHYuR76cNEfoarmJcrX5XtU1FdZMCj/480x480.jpg",
        "duration": 179,
        "streamUrl": "https://api.audius.co/v1/tracks/BxY9P/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Darshan Raval",
        "source": "audius"
    },
    {
        "id": "RRjoQ",
        "title": "Is Qadar Tumse Humein Pyar Ho Gaya | College Life Love Story | Darshan Raval | New Song | is qadar",
        "artist": "Sohidul",
        "img": "https://audius-creator-8.theblueprint.xyz/content/QmNNXNxGxkLW758Pi4xv8fkdSFLeWj1TS6DG9QVnUaL4T3/480x480.jpg",
        "duration": 188,
        "streamUrl": "https://api.audius.co/v1/tracks/RRjoQ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Darshan Raval",
        "source": "audius"
    },
    {
        "id": "NP86mYp",
        "title": "Aa Jaana - Darshan Raval",
        "artist": "No Matters",
        "img": "https://audius-creator-6.theblueprint.xyz/content/QmcfRmqL6yHz2quH13VigzQBBbXQAv8RfnF55ggao8uLvw/480x480.jpg",
        "duration": 205,
        "streamUrl": "https://api.audius.co/v1/tracks/NP86mYp/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Darshan Raval",
        "source": "audius"
    },
    {
        "id": "WV51B",
        "title": "Love Is Pain Mashup | Emotion Chillout Mix | Arijit Singh ,Darshan Raval | BICKYOFFICIAL",
        "artist": "Sasinx",
        "img": "https://v.monophonic.digital/content/QmU5qNGZSiq7zhZUcgZKmviYhi3TUA7fodixx19eqCzMPN/480x480.jpg",
        "duration": 282,
        "streamUrl": "https://api.audius.co/v1/tracks/WV51B/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Darshan Raval",
        "source": "audius"
    },
    {
        "id": "G0GPj",
        "title": "Diljit Dosanjh - CLASH Music Video G.O.A.T.",
        "artist": "The high Ground",
        "img": "https://audius-02.staked.cloud/content/QmTGxyYHYCsfpTBuVVnguyDKGawVcT1orCLTtgAKWgpCXv/480x480.jpg",
        "duration": 175,
        "streamUrl": "https://api.audius.co/v1/tracks/G0GPj/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Diljit Dosanjh",
        "source": "audius"
    },
    {
        "id": "r7bqV",
        "title": "Diljit Dosanjh ft. Honey Singh - Panga",
        "artist": "EVO",
        "img": "https://v.monophonic.digital/content/QmVYENGW44ZhpRsBrb7Xz6gCsk9fbs6XqCQFQWHxpXquia/480x480.jpg",
        "duration": 210,
        "streamUrl": "https://api.audius.co/v1/tracks/r7bqV/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Diljit Dosanjh",
        "source": "audius"
    },
    {
        "id": "vl7KK",
        "title": "Born To Shine - Diljit Dosanjh",
        "artist": "❤️DILLSEDESI❤️",
        "img": "https://v.monophonic.digital/content/QmTERQk81JLQyeVfUM3h6j6MpYAtC4c1EMwBVusxzf2s9h/480x480.jpg",
        "duration": 213,
        "streamUrl": "https://api.audius.co/v1/tracks/vl7KK/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Diljit Dosanjh",
        "source": "audius"
    },
    {
        "id": "WQoVk",
        "title": "Happy Birthday - Diljit Dosanjh",
        "artist": "Bal mukund",
        "img": "https://audius-content-3.figment.io/content/QmcWjwkJpPYJndUyvQvox2idhybvsSCA9zwUQ9nkFne6aL/480x480.jpg",
        "duration": 162,
        "streamUrl": "https://api.audius.co/v1/tracks/WQoVk/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Diljit Dosanjh",
        "source": "audius"
    },
    {
        "id": "zN8Wx",
        "title": "Peed - Diljit Dosanjh",
        "artist": "❤️DILLSEDESI❤️",
        "img": "https://audius-creator-9.theblueprint.xyz/content/QmTERQk81JLQyeVfUM3h6j6MpYAtC4c1EMwBVusxzf2s9h/480x480.jpg",
        "duration": 264,
        "streamUrl": "https://api.audius.co/v1/tracks/zN8Wx/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Diljit Dosanjh",
        "source": "audius"
    },
    {
        "id": "lJJzz1b",
        "title": "Do You Know Diljit Dosanjh",
        "artist": "Naughty Demon😂",
        "img": "https://v.monophonic.digital/content/QmVskQCXgEW3ySdHELAQ9cUQBgRcgPYKumSLPcfSGbUigF/480x480.jpg",
        "duration": 244,
        "streamUrl": "https://api.audius.co/v1/tracks/lJJzz1b/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Diljit Dosanjh",
        "source": "audius"
    },
    {
        "id": "Kd9wy",
        "title": "Excuses - Ap Dhillon",
        "artist": "Sahil",
        "img": "https://audius-content-3.figment.io/content/QmSuJ1RFuLGgNjsfvHDJ7o1v3FquHWqbb6nbbwrisJmjtY/480x480.jpg",
        "duration": 176,
        "streamUrl": "https://api.audius.co/v1/tracks/Kd9wy/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "AP Dhillon",
        "source": "audius"
    },
    {
        "id": "QK7B1",
        "title": "AP DHILLON - MA BELLE",
        "artist": "DJ VK",
        "img": "https://audius-discovery-3.altego.net/content/QmfN8N86fozfsuRVJ4yDt7KK6q2xh4CVLdU2cWrC9GW5je/480x480.jpg",
        "duration": 156,
        "streamUrl": "https://api.audius.co/v1/tracks/QK7B1/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "AP Dhillon",
        "source": "audius"
    },
    {
        "id": "7XBmzg",
        "title": "Uddu Uddu Chit Karda - Razia Dhillon",
        "artist": "Mita Gillan Wala",
        "img": "https://validator.soundmaxx.xyz/content/baeaaaiqsebppzbm47idj4odt2dbmiavyjkk6u65h6lttxirpq5xfi7rlamwey/480x480.jpg",
        "duration": 187,
        "streamUrl": "https://api.audius.co/v1/tracks/7XBmzg/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "AP Dhillon",
        "source": "audius"
    },
    {
        "id": "QRlq9",
        "title": "insaneringtonebyapdhillon1610888921-56372",
        "artist": "cobalt2424",
        "img": "https://val005.open-audio-validator.com/content/QmV9XX6CVrmFrzkoVgPCsuwvvEdCxYpzvGJPHfF8WpnZS3/480x480.jpg",
        "duration": 39,
        "streamUrl": "https://api.audius.co/v1/tracks/QRlq9/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "AP Dhillon",
        "source": "audius"
    },
    {
        "id": "Gg3wj",
        "title": "Dilpreet Dhillon Gaddi Vich",
        "artist": "YKK",
        "img": "https://val006.open-audio-validator.com/content/QmUESMfW9i2NVmXm5dsVNtw2F5X2ejM4Bp8VCthyMU7Hse/480x480.jpg",
        "duration": 172,
        "streamUrl": "https://api.audius.co/v1/tracks/Gg3wj/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "AP Dhillon",
        "source": "audius"
    },
    {
        "id": "PGdmgzJ",
        "title": "Dilon Day",
        "artist": "Chill EX Music",
        "img": "https://cn0.mainnet.audiusindex.org/content/01JXNVMASF1ZN4GFNYWEPF8CEM/480x480.jpg",
        "duration": 169,
        "streamUrl": "https://api.audius.co/v1/tracks/PGdmgzJ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "AP Dhillon",
        "source": "audius"
    },
    {
        "id": "WQ1rZ",
        "title": "Marshmello x Pritam - BIBA feat. Shirley Setia & Shah Rukh Khan",
        "artist": "marshmello",
        "img": "https://val011.open-audio-validator.com/content/QmSwbpyyGabprHf6mm42nfXHwvQe4MnPTPtTGX2FEUCLHq/480x480.jpg",
        "duration": 218,
        "streamUrl": "https://api.audius.co/v1/tracks/WQ1rZ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Pritam",
        "source": "audius"
    },
    {
        "id": "kl8ZgWw",
        "title": "Tere Hawaale | Laal Singh Chaddha Aamir,Kareena Arijit,Shilpa Pritam,Amitabh,Advait",
        "artist": "Mxz.06z",
        "img": "https://val019.open-audio-validator.com/content/Qmc45nDLknqXtmbwmdKXbx4PvPjd7TqtDKDS8HdwXePYUZ/480x480.jpg",
        "duration": 331,
        "streamUrl": "https://api.audius.co/v1/tracks/kl8ZgWw/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Pritam",
        "source": "audius"
    },
    {
        "id": "ByPWA",
        "title": "Kabira Full Song Yeh Jawaani Hai Deewani Pritam Ranbir Kapoor Deepika Padukone",
        "artist": "Shantosh chakma",
        "img": "https://v.monophonic.digital/content/Qma6RARcYy78RwDhJxwFCWTekfQdoz5NLhexyB6YEWBaRQ/480x480.jpg",
        "duration": 251,
        "streamUrl": "https://api.audius.co/v1/tracks/ByPWA/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Pritam",
        "source": "audius"
    },
    {
        "id": "xPPm2",
        "title": "Subhanallah Full Video Song Yeh Jawaani Hai Deewani Pritam Ranbir Kapoor Deepika Padukone",
        "artist": "Paritosh Chakma 🎏",
        "img": "https://v.monophonic.digital/content/QmZ61CcePBz9eu2qv9K713pLV2scLLTeKbseSnuQ7WT34L/480x480.jpg",
        "duration": 206,
        "streamUrl": "https://api.audius.co/v1/tracks/xPPm2/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Pritam",
        "source": "audius"
    },
    {
        "id": "wVNo5",
        "title": "Crazy Kiya Re Full Song Dhoom 2 Aishwarya Rai Hrithik Roshan Sunidhi Chauhan Pritam Sameer",
        "artist": "louis anderson",
        "img": "https://audius-content-10.figment.io/content/QmRGafsE1nvNnGNL18LLD7cny47XJxMpQdLkuVZQdbBKE3/480x480.jpg",
        "duration": 304,
        "streamUrl": "https://api.audius.co/v1/tracks/wVNo5/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Pritam",
        "source": "audius"
    },
    {
        "id": "VPVj6",
        "title": "Organizam - Algoritam",
        "artist": "Glitch Records",
        "img": "https://audius-05.staked.cloud/content/QmXUQETkogUQ3heE27D5X7WuwCwGAA2K2VyjCY8LRdpCYZ/480x480.jpg",
        "duration": 89,
        "streamUrl": "https://api.audius.co/v1/tracks/VPVj6/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Pritam",
        "source": "audius"
    },
    {
        "id": "3vJW9EE",
        "title": "Mere Haath Mein-Sonu Nigam",
        "artist": "Abdhak",
        "img": "https://v.monophonic.digital/content/QmZnz4N3GUZKqwUgosLRAuC7KGAErvNa5d5jC7fjwZmYXx/480x480.jpg",
        "duration": 288,
        "streamUrl": "https://api.audius.co/v1/tracks/3vJW9EE/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sonu Nigam",
        "source": "audius"
    },
    {
        "id": "NYRK1Ox",
        "title": "Tera Dilbar Tera Saathi Yeh Dil Tusshar Kapoor, Anita Alka Yagnik, Sonu Nigam Hindi Love Song",
        "artist": "So lucky",
        "img": "https://val018.open-audio-validator.com/content/01K6JGQEFHJZFYE609K9WH9WVP/480x480.jpg",
        "duration": 318,
        "streamUrl": "https://api.audius.co/v1/tracks/NYRK1Ox/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sonu Nigam",
        "source": "audius"
    },
    {
        "id": "V086o5W",
        "title": "Christmas 1999",
        "artist": "kuzukigami",
        "img": "https://audius-creator-2.theblueprint.xyz/content/01HA2MJ6QMJTBVTXBHPMB68WQX/480x480.jpg",
        "duration": 92,
        "streamUrl": "https://api.audius.co/v1/tracks/V086o5W/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sonu Nigam",
        "source": "audius"
    },
    {
        "id": "EWw1R",
        "title": "Shukhran Allah by Sonu Nigam Cover",
        "artist": "Nikhil",
        "img": "https://audius-creator-3.theblueprint.xyz/content/QmWcrhEBgEhqXvd81TX1exF2ReP7tkiYoehJahkmN1GnR3/480x480.jpg",
        "duration": 159,
        "streamUrl": "https://api.audius.co/v1/tracks/EWw1R/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sonu Nigam",
        "source": "audius"
    },
    {
        "id": "0vOzj",
        "title": "Diljaniya LO-FI Sonu Nigam Rohan Rohan",
        "artist": "Rohan Rohan",
        "img": "https://val019.open-audio-validator.com/content/QmQ7EGBkrcvCE8hhVdr5HYwwnRuQCTwL1iqMQ7tizLeb6Q/480x480.jpg",
        "duration": 243,
        "streamUrl": "https://api.audius.co/v1/tracks/0vOzj/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sonu Nigam",
        "source": "audius"
    },
    {
        "id": "qbqOM",
        "title": "LYRICAL Main Agar Kahoon Om Shanti Om Shahrukh Khan%2CDeepika Padukone Sonu Nigam%2CShreya Ghosal",
        "artist": ".Mohsin Raza",
        "img": "https://audius-creator-4.theblueprint.xyz/content/QmcwCUCW96MfTSiNseRGT5SccPgaLx7zkzCsJeBzHd4m17/480x480.jpg",
        "duration": 328,
        "streamUrl": "https://api.audius.co/v1/tracks/qbqOM/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sonu Nigam",
        "source": "audius"
    },
    {
        "id": "8MBPp",
        "title": "Tu Thodi Der Aur Thehar Ja Female Version Ringtone by Shreya Ghoshal - AndroidMobilesZone",
        "artist": "Neer",
        "img": "https://audius-creator-7.theblueprint.xyz/content/QmNjjtuD98m8L3nNVjRJ72gfSdzub2FSXqHGeKJFBzMFi6/480x480.jpg",
        "duration": 30,
        "streamUrl": "https://api.audius.co/v1/tracks/8MBPp/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Shreya Ghoshal",
        "source": "audius"
    },
    {
        "id": "zzQ2w",
        "title": "Tu Thodi Der Aur Thehar Ja Female Version Ringtone by Shreya Ghoshal - AndroidMobilesZone",
        "artist": "Neer",
        "img": "https://audius-creator-2.theblueprint.xyz/content/QmSSdgkXG45LfErKDbEThrHTwKBGLCbCyKPaBEN4ZoPvgn/480x480.jpg",
        "duration": 30,
        "streamUrl": "https://api.audius.co/v1/tracks/zzQ2w/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Shreya Ghoshal",
        "source": "audius"
    },
    {
        "id": "lwk5N",
        "title": "03. Panga - Mika Singh & Shreya Ghoshal-",
        "artist": "Tomi123",
        "img": "https://v.monophonic.digital/content/Qmcjd8i1J7vYxZpnDcsGbRNUdDqqVQK5fjUWfgKdqAiqur/480x480.jpg",
        "duration": 197,
        "streamUrl": "https://api.audius.co/v1/tracks/lwk5N/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Shreya Ghoshal",
        "source": "audius"
    },
    {
        "id": "q4Q7o",
        "title": "Pal %5BSlowed And Reverb%5D - Arijit Singh Shreya Ghoshal Lofi Audio Song 10 PM LOFi",
        "artist": "Usman1",
        "img": "https://val002.open-audio-validator.com/content/QmSKYJYdSMcWnED2MvsypJkpnjcs7NT3tNXWDcTpWwCVPi/480x480.jpg",
        "duration": 274,
        "streamUrl": "https://api.audius.co/v1/tracks/q4Q7o/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Shreya Ghoshal",
        "source": "audius"
    },
    {
        "id": "220GG",
        "title": "Pal %5BSlowed And Reverb%5D - Arijit Singh Shreya Ghoshal Lofi Audio Song 10 PM LOFi",
        "artist": "Muhammad usman",
        "img": "https://val002.open-audio-validator.com/content/QmSKYJYdSMcWnED2MvsypJkpnjcs7NT3tNXWDcTpWwCVPi/480x480.jpg",
        "duration": 274,
        "streamUrl": "https://api.audius.co/v1/tracks/220GG/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Shreya Ghoshal",
        "source": "audius"
    },
    {
        "id": "j97lV",
        "title": "Pal %5BSlowed And Reverb%5D - Arijit Singh Shreya Ghoshal Lofi Audio Song 10 PM LOFi",
        "artist": "Muhammadusman1616",
        "img": "https://val020.open-audio-validator.com/content/QmYWfnhiAGnZk4FN2PkiTeFFAUH4uJPkiDiRb112oEPmqn/480x480.jpg",
        "duration": 274,
        "streamUrl": "https://api.audius.co/v1/tracks/j97lV/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Shreya Ghoshal",
        "source": "audius"
    },
    {
        "id": "ryy1Y",
        "title": "Paani Paani - Badshah",
        "artist": "DaggyBuoy",
        "img": "https://v.monophonic.digital/content/QmZJdHid9HUMcWczieMKAWQF8awrKyUWJumLni3NwUAQ9T/480x480.jpg",
        "duration": 174,
        "streamUrl": "https://api.audius.co/v1/tracks/ryy1Y/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Badshah",
        "source": "audius"
    },
    {
        "id": "420BE",
        "title": "Lalamusa | YASIR ft Hassan Badshah",
        "artist": "YASIR",
        "img": "https://audius-figment-1-validator-19.figment.io/content/QmPKyW52A9xtbBnLHBE1mZwXWBL2p7GtED7uRqmz99Cuuy/480x480.jpg",
        "duration": 214,
        "streamUrl": "https://api.audius.co/v1/tracks/420BE/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Badshah",
        "source": "audius"
    },
    {
        "id": "xPzlx",
        "title": "BOLO HAR HAR HAR Video Song SHIVAAY Title Song Ajay Devgn Mithoon Badshah T-Series",
        "artist": "rohit",
        "img": "https://val017.open-audio-validator.com/content/QmQgYJEzVbow5aexkMXYovqWxwPQxTAbsZyEWVaoUYPv6Y/480x480.jpg",
        "duration": 209,
        "streamUrl": "https://api.audius.co/v1/tracks/xPzlx/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Badshah",
        "source": "audius"
    },
    {
        "id": "gmWv0Ok",
        "title": "Tamma Tamma Again - Bappi Lahiri, Anuradha Paudwal, Badshah",
        "artist": "Sp Shiva",
        "img": "https://audius-content-10.figment.io/content/01H4Q8Q3DKC07Q7W375JFF8390/480x480.jpg",
        "duration": 199,
        "streamUrl": "https://api.audius.co/v1/tracks/gmWv0Ok/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Badshah",
        "source": "audius"
    },
    {
        "id": "3oZE8",
        "title": "Slow Slow - Badshah",
        "artist": "Kalpesh07",
        "img": "https://audius-discovery-1.altego.net/content/QmQYtFFZf31cgxePmiY6DFBAYBs2cGG8icpo2aN8V2cAMp/480x480.jpg",
        "duration": 220,
        "streamUrl": "https://api.audius.co/v1/tracks/3oZE8/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Badshah",
        "source": "audius"
    },
    {
        "id": "1VjEE",
        "title": "Abhi Toh Party Shuru Hui Hai FULL VIDEO Song Khoobsurat Badshah Aast",
        "artist": "Sitaram",
        "img": "https://audius-content-14.figment.io/content/QmZ2vbdgokXAU6fFUVh7UMJcSovKDd3iVi3r7XKwQdwe88/480x480.jpg",
        "duration": 189,
        "streamUrl": "https://api.audius.co/v1/tracks/1VjEE/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Badshah",
        "source": "audius"
    },
    {
        "id": "OPmEV6g",
        "title": "Tibbeyan Da Putt - Sidhu Moose Wala",
        "artist": "Tribute to Sidhu ",
        "img": "https://v.monophonic.digital/content/01K2X1P40AXKW4225TR77K4GFE/480x480.jpg",
        "duration": 283,
        "streamUrl": "https://api.audius.co/v1/tracks/OPmEV6g/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sidhu Moose Wala",
        "source": "audius"
    },
    {
        "id": "jZdk4",
        "title": "295 - Sidhu Moose Wala",
        "artist": "Punjabi Songs",
        "img": "https://val016.open-audio-validator.com/content/QmNwnX6RmziQTDTKGNXWGfWe31nNawHuaY6iKzpbFsAgwW/480x480.jpg",
        "duration": 273,
        "streamUrl": "https://api.audius.co/v1/tracks/jZdk4/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sidhu Moose Wala",
        "source": "audius"
    },
    {
        "id": "yyJj7",
        "title": "Malwa Block - Sidhu Moose Wala",
        "artist": "Punjabi Songs",
        "img": "https://validator.soundmaxx.xyz/content/QmNnjaouh2obLTvaba4jeuW6Vqoh94N69s9ZjoooZbUToa/480x480.jpg",
        "duration": 239,
        "streamUrl": "https://api.audius.co/v1/tracks/yyJj7/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sidhu Moose Wala",
        "source": "audius"
    },
    {
        "id": "XbxY9qp",
        "title": "LOCK",
        "artist": "Tribute to Sidhu ",
        "img": "https://v.monophonic.digital/content/01JYGM3H50Z955YDD6F3Q15VWV/480x480.jpg",
        "duration": 181,
        "streamUrl": "https://api.audius.co/v1/tracks/XbxY9qp/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sidhu Moose Wala",
        "source": "audius"
    },
    {
        "id": "B2xMp",
        "title": "Vaar-Sidhu Moose Wala",
        "artist": "Tribute to Sidhu ",
        "img": "https://audius-content-1.figment.io/content/QmQrSDbgBcXpiJRie16okmwmadKUDVvXSQGh6Usz1PW7Nj/480x480.jpg",
        "duration": 137,
        "streamUrl": "https://api.audius.co/v1/tracks/B2xMp/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sidhu Moose Wala",
        "source": "audius"
    },
    {
        "id": "R66MQ",
        "title": "SYL -SIDHU MOOSE WALA",
        "artist": "Tribute to Sidhu ",
        "img": "https://audius-creator-16.theblueprint.xyz/content/QmS3k8zjeCJ6qDQrwMCdZ8pSVaWYhnpKKPBgM6eyLARomv/480x480.jpg",
        "duration": 249,
        "streamUrl": "https://api.audius.co/v1/tracks/R66MQ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Sidhu Moose Wala",
        "source": "audius"
    },
    {
        "id": "O795R",
        "title": "Anish Kumar & Barry Can’t Swim - Blackpool Boulevard",
        "artist": "Anish Kumar",
        "img": "https://v.monophonic.digital/content/QmNaq93WQzt7vN2eZhBVguP4kGMf35C6KzRBS8iV82jJwW/480x480.jpg",
        "duration": 355,
        "streamUrl": "https://api.audius.co/v1/tracks/O795R/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Tum Hi Ho",
        "source": "audius"
    },
    {
        "id": "LjKGo",
        "title": "Tum Hi Ho",
        "artist": "Arv",
        "img": "https://v.monophonic.digital/content/QmT15BH9P5WTDmdAhjkpoUK5mQH2bFQumXYaX7BsSXxkoz/480x480.jpg",
        "duration": 262,
        "streamUrl": "https://api.audius.co/v1/tracks/LjKGo/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Tum Hi Ho",
        "source": "audius"
    },
    {
        "id": "jarWj",
        "title": "Tum Hi Ho Aashiqui 2 Instrumental Sandeep Thakur, Studio Unplugg",
        "artist": "sofikul",
        "img": "https://val020.open-audio-validator.com/content/QmS72fnXbQVJQTPnh9VmiUJiS2VkUQRGRXrdLSUSNUog9J/480x480.jpg",
        "duration": 284,
        "streamUrl": "https://api.audius.co/v1/tracks/jarWj/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Tum Hi Ho",
        "source": "audius"
    },
    {
        "id": "z6yox",
        "title": "Tum Hi Ho Aashiqui 2 Instrumental Sandeep Thakur, Studio Unplugg",
        "artist": "Sofikulk091",
        "img": "https://audius-creator-1.theblueprint.xyz/content/QmS8sAkPPXiwkT8sUS6Qhuq1GxA4TpVuKmpkMrM1KHZpLH/480x480.jpg",
        "duration": 284,
        "streamUrl": "https://api.audius.co/v1/tracks/z6yox/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Tum Hi Ho",
        "source": "audius"
    },
    {
        "id": "NvXwOB4",
        "title": "Kesariya",
        "artist": "Navaneeth",
        "img": "https://val019.open-audio-validator.com/content/QmRX2X7zKeUDcpcoiv9kNT5c93tHciT94J3ZgYte9xoFqt/480x480.jpg",
        "duration": 283,
        "streamUrl": "https://api.audius.co/v1/tracks/NvXwOB4/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Kesariya",
        "source": "audius"
    },
    {
        "id": "YVxgJ",
        "title": "Godiya Me Sutala Ae Jaan 6 Mahina Ke Laika Niyan",
        "artist": "Naina99",
        "img": "https://audius-creator-11.theblueprint.xyz/content/QmZtyviy6VXRbwyjuXuY5zpV1fruo5wdxfrMzEp6CZATXm/480x480.jpg",
        "duration": 226,
        "streamUrl": "https://api.audius.co/v1/tracks/YVxgJ/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Kesariya",
        "source": "audius"
    },
    {
        "id": "ZRVm7",
        "title": "Godiya Me Sutala Ae Jaan 6 Mahina Ke Laika Niyan",
        "artist": "Khushi14",
        "img": "https://audius-creator-11.theblueprint.xyz/content/QmZtyviy6VXRbwyjuXuY5zpV1fruo5wdxfrMzEp6CZATXm/480x480.jpg",
        "duration": 226,
        "streamUrl": "https://api.audius.co/v1/tracks/ZRVm7/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Kesariya",
        "source": "audius"
    },
    {
        "id": "ZO0yNA6",
        "title": "Kesariya X Saibo Mashup LinaLofi SlowReverb Special Mashup",
        "artist": "Irshad vayad",
        "img": "https://audius-discovery-2.altego.net/content/QmQSyd224EcbHrE4vGM1S78Xm4CbUPJSBXfrRpkNLFYYjQ/480x480.jpg",
        "duration": 437,
        "streamUrl": "https://api.audius.co/v1/tracks/ZO0yNA6/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Kesariya",
        "source": "audius"
    },
    {
        "id": "2MJazr6",
        "title": "kesariya kabira mastered",
        "artist": "Ithihas",
        "img": "https://audius-content-10.figment.io/content/QmRFopydmSR8ruG96bQJLjoRPSiVbLsArpWKe6EFv2sV3X/480x480.jpg",
        "duration": 63,
        "streamUrl": "https://api.audius.co/v1/tracks/2MJazr6/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Kesariya",
        "source": "audius"
    },
    {
        "id": "NRWmY",
        "title": "Godiya Me Sutala Ae Jaan 6 Mahina Ke Laika Niyan",
        "artist": "Shubham",
        "img": "https://v.audius.rickyrombo.com/content/QmZtyviy6VXRbwyjuXuY5zpV1fruo5wdxfrMzEp6CZATXm/480x480.jpg",
        "duration": 226,
        "streamUrl": "https://api.audius.co/v1/tracks/NRWmY/stream?app_name=SPOTIFY_CLONE",
        "genre": "Bollywood / Indian Pop",
        "category": "Bollywood",
        "searchTag": "Kesariya",
        "source": "audius"
    }
];


/**
 * Spotify Clone - Explore Premium Page Module
 * Plans, FAQ accordions, billing toggles, feature comparison & subscription modal
 */

const premiumPlans = [
    {
        id: "individual",
        name: "Individual",
        badge: "Free for 1 month",
        priceMonthly: 10.99,
        priceAnnual: 99.99,
        accounts: "1 Premium account",
        desc: "For one person who wants ad-free music, on-demand playback, and offline downloads anywhere.",
        perks: [
            "1 verified Premium account",
            "Listen ad-free without interruptions",
            "Download up to 10,000 songs for offline play",
            "Play songs in any order on any device",
            "High-fidelity audio streaming (320 kbps)",
            "Cancel online anytime with 1 click"
        ],
        buttonText: "Try 1 Month Free",
        popular: false
    },
    {
        id: "duo",
        name: "Duo",
        badge: "Most Popular",
        priceMonthly: 14.99,
        priceAnnual: 139.99,
        accounts: "2 Premium accounts",
        desc: "For couples or roommates living under the same roof. 2 separate accounts, 1 discounted bill.",
        perks: [
            "2 separate, independent Premium accounts",
            "Duo Mix: an auto-updated shared playlist",
            "Ad-free music listening on all devices",
            "Offline playback for both members",
            "High audio quality on phone, desktop & TV",
            "Separate saved songs, playlists & recommendations"
        ],
        buttonText: "Get Premium Duo",
        popular: true
    },
    {
        id: "family",
        name: "Family",
        badge: "Best Value",
        priceMonthly: 16.99,
        priceAnnual: 159.99,
        accounts: "Up to 6 accounts",
        desc: "For up to 6 family members living together. Includes Spotify Kids and explicit content controls.",
        perks: [
            "6 separate individual Premium accounts",
            "Family Mix: shared playlist updated with favorites",
            "Block explicit music for younger listeners",
            "Access to Spotify Kids dedicated mobile app",
            "Ad-free listening and unlimited offline downloads",
            "Only $2.83 per person / month"
        ],
        buttonText: "Get Premium Family",
        popular: false
    },
    {
        id: "student",
        name: "Student",
        badge: "Special Discount",
        priceMonthly: 5.99,
        priceAnnual: 59.99,
        accounts: "1 verified student",
        desc: "Huge 50% discount for eligible university or college students. Includes free Hulu subscription.",
        perks: [
            "50% discount off standard Individual plan",
            "Hulu (With Ads) subscription included free",
            "Ad-free music and podcast listening",
            "Download songs for offline studying",
            "Verified annually via SheerID",
            "Keep student rate for up to 4 years"
        ],
        buttonText: "Get Student Discount",
        popular: false
    }
];

const premiumFaqs = [
    {
        q: "How does the Spotify Premium 1-month free trial work?",
        a: "If you've never had Premium before, you can try it free for 30 days. You get complete access to all Premium features with zero ads and unlimited downloads. We'll remind you 7 days before your trial ends. If you don't cancel, your subscription continues automatically at the regular monthly price."
    },
    {
        q: "Can I cancel my subscription at any time?",
        a: "Yes! There are no contracts, no cancellation fees, and no commitments. You can cancel your subscription with a single click in your Account settings. You'll keep your Premium benefits until the end of your current billing period."
    },
    {
        q: "How do the Duo and Family plans work?",
        a: "Every member gets their own private Premium account with their own passwords, saved music, and personalized playlists. Members must simply reside at the same physical address. The plan manager pays one simple combined monthly bill."
    },
    {
        q: "How do I qualify for the Student discount?",
        a: "You must be currently enrolled at an accredited college or university. Verification is quick and automated through SheerID. Once approved, you get the $5.99/mo rate for up to 12 months at a time, renewable up to 4 years."
    },
    {
        q: "What audio quality does Premium provide?",
        a: "Spotify Premium streams audio at up to 320 kbps (Very High quality AAC/Ogg Vorbis), compared to 160 kbps on the Free plan. You get richer bass, clearer vocals, and pristine instrument separation."
    }
];

function initPremium({ onSubscribeSuccess, toast }) {
    let billingCycle = "monthly"; // 'monthly' | 'annual'
    let selectedPlan = premiumPlans[0];

    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Render plans grid
    function renderPlans() {
        const grid = $("premiumPlansGrid");
        if (!grid) return;

        grid.innerHTML = premiumPlans.map(plan => {
            const price = billingCycle === "monthly" 
                ? `$${plan.priceMonthly} <span class="price-cycle">/ month</span>`
                : `$${plan.priceAnnual} <span class="price-cycle">/ year (Save 20%)</span>`;

            return `
            <div class="premium-plan-card ${plan.popular ? 'popular-card' : ''}" data-plan-id="${plan.id}">
                ${plan.popular ? '<div class="popular-ribbon"><i class="fa-solid fa-fire"></i> Most Popular</div>' : ''}
                <div class="plan-card-header">
                    <span class="plan-badge ${plan.popular ? 'green-badge' : ''}">${plan.badge}</span>
                    <h3 class="plan-title">${plan.name}</h3>
                    <div class="plan-price">${price}</div>
                    <span class="plan-accounts"><i class="fa-solid fa-users"></i> ${plan.accounts}</span>
                </div>
                <p class="plan-desc">${plan.desc}</p>
                <div class="plan-divider"></div>
                <ul class="plan-perks-list">
                    ${plan.perks.map(p => `<li><i class="fa-solid fa-check"></i> <span>${p}</span></li>`).join("")}
                </ul>
                <button class="badge plan-action-btn ${plan.popular ? 'create-btn' : ''}" data-plan-id="${plan.id}">
                    ${plan.buttonText}
                </button>
            </div>`;
        }).join("");

        // Attach plan button click handlers
        $$(".plan-action-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const planId = btn.dataset.planId;
                const plan = premiumPlans.find(p => p.id === planId) || premiumPlans[0];
                openCheckoutModal(plan);
            });
        });
    }

    // Render FAQs
    function renderFaqs() {
        const container = $("premiumFaqContainer");
        if (!container) return;

        container.innerHTML = premiumFaqs.map((faq, idx) => `
            <div class="faq-accordion-item" data-idx="${idx}">
                <button class="faq-question-btn">
                    <span>${faq.q}</span>
                    <i class="fa-solid fa-chevron-down faq-chevron"></i>
                </button>
                <div class="faq-answer-panel">
                    <p>${faq.a}</p>
                </div>
            </div>
        `).join("");

        $$(".faq-question-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const item = btn.closest(".faq-accordion-item");
                const wasActive = item.classList.contains("open");
                $$(".faq-accordion-item").forEach(i => i.classList.remove("open"));
                if (!wasActive) item.classList.add("open");
            });
        });
    }

    // Billing toggle (Monthly vs Annual)
    const toggleMonthly = $("billingMonthlyBtn");
    const toggleAnnual = $("billingAnnualBtn");

    if (toggleMonthly && toggleAnnual) {
        toggleMonthly.addEventListener("click", () => {
            billingCycle = "monthly";
            toggleMonthly.classList.add("active-toggle");
            toggleAnnual.classList.remove("active-toggle");
            renderPlans();
        });

        toggleAnnual.addEventListener("click", () => {
            billingCycle = "annual";
            toggleAnnual.classList.add("active-toggle");
            toggleMonthly.classList.remove("active-toggle");
            renderPlans();
            toast("Switched to annual billing with 20% discount!", "fa-tag");
        });
    }

    // Checkout Modal
    const modal = $("subscribeModal");
    const closeBtn = $("closeCheckoutModalBtn");
    const cancelBtn = $("cancelCheckoutBtn");
    const confirmBtn = $("confirmSubscribeBtn");

    function openCheckoutModal(plan) {
        selectedPlan = plan;
        $("checkoutPlanTitle").textContent = `Get Spotify ${plan.name}`;
        $("checkoutPlanPrice").textContent = billingCycle === "monthly" 
            ? `$${plan.priceMonthly} / month` 
            : `$${plan.priceAnnual} / year`;
        $("checkoutPromoTag").textContent = plan.badge;
        $("checkoutPlanDesc").textContent = plan.desc;
        confirmBtn.textContent = plan.id === "individual" ? "Start 1 Month Free" : `Subscribe to ${plan.name}`;
        modal.style.display = "flex";
    }

    function closeCheckoutModal() {
        modal.style.display = "none";
    }

    if (closeBtn) closeBtn.addEventListener("click", closeCheckoutModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeCheckoutModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeCheckoutModal();
        });
    }

    // Payment radio click styling
    $$(".payment-radio").forEach(radio => {
        radio.addEventListener("click", () => {
            $$(".payment-radio").forEach(r => r.classList.remove("selected"));
            radio.classList.add("selected");
        });
    });

    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

            setTimeout(() => {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `Start 1 Month Free`;
                closeCheckoutModal();

                if (onSubscribeSuccess) {
                    onSubscribeSuccess(selectedPlan);
                }
                toast(`🎉 Welcome to Spotify Premium ${selectedPlan.name}!`, "fa-gem");
            }, 900);
        });
    }

    // Hero action buttons
    const heroTryBtn = $("heroTryPremiumBtn");
    const heroViewPlansBtn = $("heroViewPlansBtn");

    if (heroTryBtn) {
        heroTryBtn.addEventListener("click", () => {
            openCheckoutModal(premiumPlans[0]);
        });
    }

    if (heroViewPlansBtn) {
        heroViewPlansBtn.addEventListener("click", () => {
            const plansHeader = $("premiumPlansSection");
            if (plansHeader) {
                plansHeader.scrollIntoView({ behavior: "smooth" });
            }
        });
    }

    // Initial render
    renderPlans();
    renderFaqs();
}



/**
 * Spotify Clone - Profile Section Module
 * Profile header, public playlists, followed artists, settings & inline edit modal
 */

const userProfileState = {
    name: "Alex Morgan",
    username: "@alexmorgan_beats",
    bio: "Music curator • Late night lo-fi, synthwave & indie acoustic enthusiast 🎧",
    avatar: "./assesst/logo.png",
    tier: "Spotify Free",
    isPremium: false,
    followers: 182,
    followingCount: 14,
    publicPlaylistCount: 3,
    topArtists: [
        { id: 1, name: "The Weeknd", genre: "Pop / R&B", img: "./assesst/card4img.jpeg", listeners: "108.4M monthly listeners", following: true },
        { id: 2, name: "Darshan Raval", genre: "Romantic / Pop", img: "./assesst/card2img.jpeg", listeners: "28.1M monthly listeners", following: true },
        { id: 3, name: "Anirudh Ravichander", genre: "Soundtracks / Mass", img: "./assesst/card4img.jpeg", listeners: "24.6M monthly listeners", following: false },
        { id: 4, name: "Rahat Fateh Ali Khan", genre: "Sufi / Soul", img: "./assesst/card3img.jpeg", listeners: "15.8M monthly listeners", following: true },
        { id: 5, name: "Arijit Singh", genre: "Bollywood / Melodies", img: "./assesst/card6img.jpeg", listeners: "39.2M monthly listeners", following: false },
        { id: 6, name: "Dua Lipa", genre: "Nu-Disco / Pop", img: "./assesst/card5img.jpeg", listeners: "77.5M monthly listeners", following: true }
    ],
    settings: {
        audioQuality: "very-high",
        crossfade: 4,
        autoplay: true,
        explicit: true,
        normalizeVolume: true,
        privateSession: false
    }
};

function initProfile({ onOpenPlaylist, toast, navigate, onLogout, onOpenAuth }) {
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Profile DOM Elements
    const heroAvatar = $("profileHeroAvatar");
    const heroName = $("profileHeroName");
    const heroBio = $("profileHeroBio");
    const heroTierBadge = $("profileTierBadge");
    const heroStats = $("profileHeroStats");
    const editBtn = $("editProfileBtn");
    const shareBtn = $("shareProfileBtn");
    const upgradeBadgeBtn = $("profileUpgradeBtn");
    const profileAuthBtn = $("profileAuthBtn");
    const profileLogoutBtn = $("profileLogoutBtn");
    const settingSwitchAccountBtn = $("settingSwitchAccountBtn");
    const settingLogoutBtn = $("settingLogoutBtn");

    // Modal elements
    const editModal = $("editProfileModal");
    const closeEditBtn = $("closeProfileModalBtn");
    const cancelEditBtn = $("cancelProfileBtn");
    const saveEditBtn = $("saveProfileBtn");
    const nameInput = $("profileNameInput");
    const bioInput = $("profileBioInput");
    const avatarPreview = $("avatarPreview");

    // Dropdown elements
    const dropdownName = $("dropdownUserName");
    const dropdownTier = $("dropdownUserTier");

    // Render Hero Info
    function renderHero() {
        if (heroName) heroName.textContent = userProfileState.name;
        if (heroBio) heroBio.textContent = userProfileState.bio;
        if (heroTierBadge) {
            heroTierBadge.textContent = userProfileState.tier.toUpperCase();
            heroTierBadge.className = userProfileState.isPremium 
                ? "profile-badge premium-badge" 
                : "profile-badge free-badge";
        }
        if (heroStats) {
            heroStats.innerHTML = `
                <span><strong>${userProfileState.publicPlaylistCount}</strong> Public Playlists</span>
                <span class="stat-bullet">•</span>
                <span><strong>${userProfileState.followers}</strong> Followers</span>
                <span class="stat-bullet">•</span>
                <span><strong>${userProfileState.followingCount}</strong> Following</span>
            `;
        }
        if (dropdownName) dropdownName.textContent = userProfileState.name;
        if (dropdownTier) dropdownTier.textContent = userProfileState.tier;

        if (upgradeBadgeBtn) {
            upgradeBadgeBtn.style.display = userProfileState.isPremium ? "none" : "inline-flex";
        }
    }

    // Render Profile Playlists Tab
    function renderPlaylists(playlists = []) {
        const container = $("profilePlaylistsGrid");
        if (!container) return;

        userProfileState.publicPlaylistCount = playlists.length;
        renderHero();

        if (playlists.length === 0) {
            container.innerHTML = `
                <div class="empty-profile-box">
                    <i class="fa-solid fa-music"></i>
                    <h4>No public playlists yet</h4>
                    <p>Create your first playlist and it will appear on your public profile.</p>
                    <button class="badge create-btn" id="profileCreatePlBtn">Create Playlist</button>
                </div>
            `;
            const btn = $("profileCreatePlBtn");
            if (btn) btn.addEventListener("click", () => navigate("createPlaylist"));
            return;
        }

        container.innerHTML = playlists.map(pl => {
            const cover = pl.songs && pl.songs.length > 0 ? "./assesst/card2img.jpeg" : "./assesst/card1img.jpeg";
            return `
            <div class="card profile-pl-card" data-playlist-id="${pl.id}">
                <div class="card-img-wrapper">
                    <img src="${cover}" class="card-img" alt="${pl.name}">
                    <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
                <p class="card-title">${pl.name}</p>
                <p class="card-info">By ${userProfileState.name} • ${pl.songs ? pl.songs.length : 0} songs</p>
            </div>`;
        }).join("");

        $$(".profile-pl-card").forEach(c => {
            c.addEventListener("click", () => {
                const id = parseInt(c.dataset.playlistId, 10);
                if (onOpenPlaylist) onOpenPlaylist(id);
            });
        });
    }

    // Render Top Artists Tab
    function renderArtists() {
        const grid = $("profileArtistsGrid");
        if (!grid) return;

        grid.innerHTML = userProfileState.topArtists.map(artist => `
            <div class="artist-card" data-artist-id="${artist.id}">
                <div class="artist-img-wrapper">
                    <img src="${artist.img}" class="artist-img" alt="${artist.name}">
                    <button class="artist-hover-play" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
                <div class="artist-meta">
                    <span class="artist-type">Artist</span>
                    <h4 class="artist-name">${artist.name}</h4>
                    <p class="artist-genre">${artist.genre}</p>
                    <p class="artist-listeners">${artist.listeners}</p>
                </div>
                <button class="badge follow-artist-btn ${artist.following ? 'following-btn' : 'dark-badge'}" data-artist-id="${artist.id}">
                    ${artist.following ? 'Following' : 'Follow'}
                </button>
            </div>
        `).join("");

        $$(".follow-artist-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.artistId, 10);
                const art = userProfileState.topArtists.find(a => a.id === id);
                if (art) {
                    art.following = !art.following;
                    userProfileState.followingCount += art.following ? 1 : -1;
                    renderHero();
                    renderArtists();
                    toast(art.following ? `Now following ${art.name}` : `Unfollowed ${art.name}`, art.following ? "fa-user-plus" : "fa-user-minus");
                }
            });
        });
    }

    // Profile Tabs Switching
    $$(".profile-nav-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            $$(".profile-nav-tab").forEach(t => t.classList.remove("active-tab"));
            $$(".profile-tab-pane").forEach(p => p.style.display = "none");

            tab.classList.add("active-tab");
            const targetPane = $(tab.dataset.target);
            if (targetPane) targetPane.style.display = "block";
        });
    });

    // Settings Inputs Logic
    function initSettings() {
        const qualitySelect = $("settingAudioQuality");
        const crossfadeRange = $("settingCrossfade");
        const crossfadeVal = $("crossfadeValue");
        const autoplayToggle = $("settingAutoplay");
        const explicitToggle = $("settingExplicit");
        const privateToggle = $("settingPrivateSession");

        if (qualitySelect) {
            qualitySelect.value = userProfileState.settings.audioQuality;
            qualitySelect.addEventListener("change", (e) => {
                userProfileState.settings.audioQuality = e.target.value;
                toast(`Streaming quality set to: ${e.target.options[e.target.selectedIndex].text}`, "fa-sliders");
            });
        }

        if (crossfadeRange && crossfadeVal) {
            crossfadeRange.value = userProfileState.settings.crossfade;
            crossfadeVal.textContent = `${userProfileState.settings.crossfade}s`;
            crossfadeRange.addEventListener("input", (e) => {
                userProfileState.settings.crossfade = e.target.value;
                crossfadeVal.textContent = `${e.target.value}s`;
            });
        }

        if (autoplayToggle) {
            autoplayToggle.checked = userProfileState.settings.autoplay;
            autoplayToggle.addEventListener("change", (e) => {
                userProfileState.settings.autoplay = e.target.checked;
                toast(e.target.checked ? "Autoplay turned ON" : "Autoplay turned OFF", "fa-play");
            });
        }

        if (explicitToggle) {
            explicitToggle.checked = userProfileState.settings.explicit;
            explicitToggle.addEventListener("change", (e) => {
                userProfileState.settings.explicit = e.target.checked;
                toast(e.target.checked ? "Explicit content allowed" : "Explicit content blocked", "fa-shield");
            });
        }

        if (privateToggle) {
            privateToggle.checked = userProfileState.settings.privateSession;
            privateToggle.addEventListener("change", (e) => {
                userProfileState.settings.privateSession = e.target.checked;
                toast(e.target.checked ? "Private session started" : "Private session ended", "fa-user-secret");
            });
        }
    }

    // Edit Profile Modal
    function openEditModal() {
        if (!editModal) return;
        nameInput.value = userProfileState.name;
        bioInput.value = userProfileState.bio;
        editModal.style.display = "flex";
        nameInput.focus();
    }

    function closeEditModal() {
        if (!editModal) return;
        editModal.style.display = "none";
    }

    if (editBtn) editBtn.addEventListener("click", openEditModal);
    if (closeEditBtn) closeEditBtn.addEventListener("click", closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);
    if (editModal) {
        editModal.addEventListener("click", (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }

    if (saveEditBtn) {
        saveEditBtn.addEventListener("click", () => {
            const newName = nameInput.value.trim() || userProfileState.name;
            const newBio = bioInput.value.trim();
            userProfileState.name = newName;
            userProfileState.bio = newBio;
            renderHero();
            closeEditModal();
            if (typeof spotifyApi !== "undefined") {
                spotifyApi.updateProfile({ name: newName, bio: newBio }).catch(() => {});
            }
            toast("Profile details updated successfully!", "fa-user-pen");
        });
    }

    // Share Profile button
    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            const dummyUrl = `https://open.spotify.com/user/${userProfileState.username.replace('@','')}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(dummyUrl).catch(() => {});
            }
            toast("Profile link copied to clipboard!", "fa-link");
        });
    }

    // Upgrade button on profile page
    if (upgradeBadgeBtn) {
        upgradeBadgeBtn.addEventListener("click", () => {
            navigate("premium");
        });
    }

    // Switch Account buttons
    if (profileAuthBtn) {
        profileAuthBtn.addEventListener("click", () => {
            if (onOpenAuth) onOpenAuth("login");
            else navigate("auth");
        });
    }
    if (settingSwitchAccountBtn) {
        settingSwitchAccountBtn.addEventListener("click", () => {
            if (onOpenAuth) onOpenAuth("login");
            else navigate("auth");
        });
    }

    // Logout buttons
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener("click", () => {
            if (onLogout) onLogout();
        });
    }
    if (settingLogoutBtn) {
        settingLogoutBtn.addEventListener("click", () => {
            if (onLogout) onLogout();
        });
    }

    // Initial setup
    renderHero();
    renderArtists();
    initSettings();

    return {
        updatePlaylists: renderPlaylists,
        setTier(tierName) {
            userProfileState.tier = tierName;
            userProfileState.isPremium = true;
            renderHero();
        },
        setUser(user) {
            if (!user) return;
            userProfileState.name = user.name || "Alex Morgan";
            if (user.tier) userProfileState.tier = user.tier;
            if (typeof user.isPremium === "boolean") userProfileState.isPremium = user.isPremium;
            if (user.bio) userProfileState.bio = user.bio;
            renderHero();
        },
        logoutUser() {
            userProfileState.name = "Guest Listener";
            userProfileState.tier = "Guest Mode";
            userProfileState.isPremium = false;
            userProfileState.bio = "Browsing Spotify as guest. Sign in or create an account to save playlists and follow artists.";
            renderHero();
        }
    };
}



/**
 * Spotify Clone - Authentication Module (Sign In & Registration)
 * Handles user login, new account registration, logout, form validations, & credential persistence
 */

const authState = {
    isLoggedIn: true, // starts logged in by default with Alex Morgan
    currentUser: {
        name: "Alex Morgan",
        email: "alex.morgan@example.com",
        avatar: "./assesst/logo.png",
        tier: "Spotify Free",
        isPremium: false
    }
};

function initAuthModule({ onLoginSuccess, onRegisterSuccess, onLogout, toast, navigate }) {
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    let activeTab = "login"; // 'login' | 'register'

    // Form elements
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");
    const loginTabBtn = $("authTabLogin");
    const registerTabBtn = $("authTabRegister");
    const switchPromptToReg = $("switchToRegisterPrompt");
    const switchPromptToLog = $("switchToLoginPrompt");

    // Inputs
    const loginEmail = $("loginEmailInput");
    const loginPass = $("loginPasswordInput");
    const regEmail = $("regEmailInput");
    const regPass = $("regPasswordInput");
    const regName = $("regNameInput");
    const regYear = $("regBirthYear");

    // Password visibility toggles
    const toggleLoginPassBtn = $("toggleLoginPass");
    const toggleRegPassBtn = $("toggleRegPass");

    function switchTab(tab) {
        activeTab = tab;
        if (tab === "login") {
            if (loginTabBtn) loginTabBtn.classList.add("active-auth-tab");
            if (registerTabBtn) registerTabBtn.classList.remove("active-auth-tab");
            if (loginForm) loginForm.style.display = "flex";
            if (registerForm) registerForm.style.display = "none";
        } else {
            if (registerTabBtn) registerTabBtn.classList.add("active-auth-tab");
            if (loginTabBtn) loginTabBtn.classList.remove("active-auth-tab");
            if (registerForm) registerForm.style.display = "flex";
            if (loginForm) loginForm.style.display = "none";
        }
    }

    if (loginTabBtn) loginTabBtn.addEventListener("click", () => switchTab("login"));
    if (registerTabBtn) registerTabBtn.addEventListener("click", () => switchTab("register"));
    if (switchPromptToReg) switchPromptToReg.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("register");
    });
    if (switchPromptToLog) switchPromptToLog.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("login");
    });

    // Password visibility toggle helpers
    if (toggleLoginPassBtn && loginPass) {
        toggleLoginPassBtn.addEventListener("click", () => {
            const isText = loginPass.type === "text";
            loginPass.type = isText ? "password" : "text";
            toggleLoginPassBtn.innerHTML = isText ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }

    if (toggleRegPassBtn && regPass) {
        toggleRegPassBtn.addEventListener("click", () => {
            const isText = regPass.type === "text";
            regPass.type = isText ? "password" : "text";
            toggleRegPassBtn.innerHTML = isText ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }

    // Social Auth click simulations
    $$(".social-auth-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const provider = btn.textContent.trim();
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting to ${provider}...`;

            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
                
                // Successful social login
                authState.isLoggedIn = true;
                authState.currentUser = {
                    name: "Alex Morgan",
                    email: "alex.morgan@gmail.com",
                    avatar: "./assesst/logo.png",
                    tier: "Spotify Free",
                    isPremium: false
                };

                if (onLoginSuccess) onLoginSuccess(authState.currentUser);
                toast(`Connected via ${provider}! Welcome back.`, "fa-circle-check");
                navigate("home");
            }, 800);
        });
    });

    // Save original innerHTML of social buttons
    $$(".social-auth-btn").forEach(btn => {
        btn.dataset.originalHtml = btn.innerHTML;
    });

    // Log In Form Submission
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = loginEmail.value.trim();
            const pass = loginPass.value.trim();

            if (!email) {
                toast("Please enter your email or username", "fa-circle-exclamation");
                loginEmail.focus();
                return;
            }
            if (!pass || pass.length < 4) {
                toast("Please enter your password (minimum 4 characters)", "fa-circle-exclamation");
                loginPass.focus();
                return;
            }

            const loginBtn = $("loginSubmitBtn");
            loginBtn.disabled = true;
            loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;

            (async () => {
                let userObj = null;
                if (typeof spotifyApi !== "undefined") {
                    try {
                        const res = await spotifyApi.login(email, pass);
                        if (res && res.data && res.data.user) {
                            userObj = res.data.user;
                        } else if (res && res.error && !res.isOffline) {
                            loginBtn.disabled = false;
                            loginBtn.innerHTML = "Log In";
                            toast(res.error, "fa-circle-exclamation");
                            return;
                        }
                    } catch (err) {
                        console.warn("Backend auth failed, using local fallback", err);
                    }
                }

                if (!userObj) {
                    const displayName = email.includes("@") ? email.split("@")[0] : email;
                    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                    userObj = {
                        name: formattedName,
                        email: email.includes("@") ? email : `${email}@spotify-user.com`,
                        avatar: "./assesst/logo.png",
                        tier: "Spotify Free",
                        isPremium: false
                    };
                }

                loginBtn.disabled = false;
                loginBtn.innerHTML = "Log In";

                authState.isLoggedIn = true;
                authState.currentUser = userObj;

                loginForm.reset();
                if (onLoginSuccess) onLoginSuccess(authState.currentUser);
                toast(`Welcome back, ${userObj.name}!`, "fa-circle-check");
                navigate("home");
            })();
        });
    }

    // Register Form Submission
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = regEmail.value.trim();
            const pass = regPass.value.trim();
            const name = regName.value.trim() || (email.includes("@") ? email.split("@")[0] : "New Listener");

            if (!email || !email.includes("@")) {
                toast("Please enter a valid email address", "fa-circle-exclamation");
                regEmail.focus();
                return;
            }
            if (!pass || pass.length < 6) {
                toast("Password must be at least 6 characters long", "fa-circle-exclamation");
                regPass.focus();
                return;
            }
            if (regYear && regYear.value && parseInt(regYear.value, 10) > 2018) {
                toast("Please enter a valid birth year", "fa-circle-exclamation");
                regYear.focus();
                return;
            }

            const regBtn = $("registerSubmitBtn");
            regBtn.disabled = true;
            regBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;

            (async () => {
                let userObj = null;
                if (typeof spotifyApi !== "undefined") {
                    try {
                        const res = await spotifyApi.register(name, email, pass, regYear ? regYear.value : null);
                        if (res && res.data && res.data.user) {
                            userObj = res.data.user;
                        } else if (res && res.error && !res.isOffline) {
                            regBtn.disabled = false;
                            regBtn.innerHTML = "Sign Up";
                            toast(res.error, "fa-circle-exclamation");
                            return;
                        }
                    } catch (err) {
                        console.warn("Backend register failed, using local fallback", err);
                    }
                }

                if (!userObj) {
                    userObj = {
                        name: name,
                        email: email,
                        avatar: "./assesst/logo.png",
                        tier: "Spotify Free",
                        isPremium: false
                    };
                }

                regBtn.disabled = false;
                regBtn.innerHTML = "Sign Up";

                authState.isLoggedIn = true;
                authState.currentUser = userObj;

                registerForm.reset();
                if (onRegisterSuccess) onRegisterSuccess(authState.currentUser);
                toast(`Welcome to Spotify, ${userObj.name}! Your account is ready.`, "fa-circle-check");
                navigate("profile");
            })();
        });
    }

    // Logout Action function
    function performLogout() {
        if (typeof spotifyApi !== "undefined") {
            spotifyApi.logout();
        }
        authState.isLoggedIn = false;
        authState.currentUser = {
            name: "Guest Listener",
            email: "",
            avatar: "./assesst/logo.png",
            tier: "Guest Mode",
            isPremium: false
        };

        if (onLogout) onLogout();
        toast("You have been logged out of Spotify", "fa-arrow-right-from-bracket");
        // Open Auth screen for easy sign in / register
        switchTab("login");
        navigate("auth");
    }

    return {
        switchTab,
        logout: performLogout,
        isLoggedIn: () => authState.isLoggedIn,
        getUser: () => authState.currentUser
    };
}



/**
 * Spotify Clone - Music / Now Playing Screen Module
 * Immersive track showcase, synchronized interactive lyrics, artist profile,
 * dynamic album color theming, and real-time Web Audio spectrum visualizer
 */

const trackDetailsMeta = {
    1: {
        album: "Global Top Charts 2024",
        year: "2024",
        plays: "2,841,920,381",
        key: "C Major (261.6 Hz)",
        bpm: "104 BPM",
        writers: "Global Chart Curators & Songwriters",
        producers: "Spotify Chart Editorial Team",
        avatar: "./assesst/card1img.jpeg",
        listeners: "148,290,118 monthly listeners",
        bio: "Your daily countdown of the most played music across every country and continent on Spotify worldwide."
    },
    2: {
        album: "Darasal Acoustic Sessions",
        year: "2023",
        plays: "492,810,490",
        key: "D Major (293.7 Hz)",
        bpm: "92 BPM",
        writers: "Darshan Raval, Gurpreet Saini",
        producers: "Darshan Raval, Lijo George",
        avatar: "./assesst/card2img.jpeg",
        listeners: "28,140,295 monthly listeners",
        bio: "Indian playback singer, songwriter, and composer known for his heartfelt romantic ballads and soulful voice."
    },
    3: {
        album: "Mere Paas Tum Ho (Original Soundtrack)",
        year: "2020",
        plays: "612,490,120",
        key: "A Minor (220.0 Hz)",
        bpm: "78 BPM",
        writers: "Khalil-ur-Rehman Qamar",
        producers: "Naveed Nashad",
        avatar: "./assesst/card3img.jpeg",
        listeners: "15,820,400 monthly listeners",
        bio: "Legendary Pakistani Sufi and classical singer, nephew of Ustad Nusrat Fateh Ali Khan, celebrated worldwide."
    },
    4: {
        album: "Leo (Original Motion Picture Soundtrack)",
        year: "2023",
        plays: "389,120,845",
        key: "E Minor (329.6 Hz)",
        bpm: "128 BPM",
        writers: "Vishnu Edavan, Asal Kolaar",
        producers: "Anirudh Ravichander",
        avatar: "./assesst/card4img.jpeg",
        listeners: "24,650,110 monthly listeners",
        bio: "Renowned Indian music composer and singer revolutionizing Tamil and Indian cinema music with viral high-energy hits."
    },
    5: {
        album: "Starboy",
        year: "2016",
        plays: "3,480,910,240",
        key: "B Minor (246.9 Hz)",
        bpm: "112 BPM",
        writers: "Abel Tesfaye, Guy-Manuel de Homem-Christo, Thomas Bangalter",
        producers: "Daft Punk, The Weeknd, Doc McKinney",
        avatar: "./assesst/card3img.jpeg",
        listeners: "108,450,910 monthly listeners",
        bio: "Canadian singer, songwriter, and record producer. Known for sonic versatility and dark lyrical aesthetics."
    },
    6: {
        album: "After Hours",
        year: "2020",
        plays: "4,195,490,128",
        key: "F Minor (349.2 Hz)",
        bpm: "130 BPM",
        writers: "Abel Tesfaye, Max Martin, Oscar Holter, Belly, Jason Quenneville",
        producers: "Max Martin, Oscar Holter, The Weeknd",
        avatar: "./assesst/card4img.jpeg",
        listeners: "108,450,910 monthly listeners",
        bio: "Global music icon whose retro synth-pop masterpiece Blinding Lights became the #1 Billboard Hot 100 song of all time."
    },
    7: {
        album: "Weekly Worldwide Chartbusters",
        year: "2024",
        plays: "1,940,290,110",
        key: "C Major (261.6 Hz)",
        bpm: "100 BPM",
        writers: "International Editorial Syndicate",
        producers: "Spotify Global Editorial",
        avatar: "./assesst/card5img.jpeg",
        listeners: "95,410,200 monthly listeners",
        bio: "The comprehensive weekly index measuring global streaming velocity and breakthrough hits."
    },
    8: {
        album: "Top India Bollywood & Regional",
        year: "2024",
        plays: "1,450,190,830",
        key: "D Major (293.7 Hz)",
        bpm: "108 BPM",
        writers: "Bollywood Composers Union",
        producers: "Mumbai Recording Studios",
        avatar: "./assesst/card6img.jpeg",
        listeners: "88,290,400 monthly listeners",
        bio: "The biggest, most streamed tracks across Hindi, Punjabi, Tamil, and Telugu playlists in India."
    },
    9: {
        album: "Lo-Fi Beats to Relax / Study to",
        year: "2024",
        plays: "892,109,240",
        key: "A Minor (220.0 Hz)",
        bpm: "84 BPM",
        writers: "Chillhop Sound Collective",
        producers: "Spotify Curators & Sound Labs",
        avatar: "./assesst/card1img.jpeg",
        listeners: "42,109,000 monthly listeners",
        bio: "Warm analog textures, soft keys, and lazy rhythms carefully crafted for peaceful focus and restful late nights."
    }
};

// High-fidelity Spotify-style vibrant album palettes
const trackColorPalettes = {
    1: { primary: "#1ed760", rgb: "30, 215, 96", secondary: "#129e43" },  // Emerald Green
    2: { primary: "#e84393", rgb: "232, 67, 147", secondary: "#fd79a8" }, // Romantic Rose
    3: { primary: "#f39c12", rgb: "243, 156, 18", secondary: "#e67e22" },  // Mystic Amber
    4: { primary: "#9b59b6", rgb: "155, 89, 182", secondary: "#8e44ad" }, // Royal Violet
    5: { primary: "#3498db", rgb: "52, 152, 219", secondary: "#2980b9" }, // Neon Blue
    6: { primary: "#ff2a7a", rgb: "255, 42, 122", secondary: "#7928ca" }, // 80s Synthwave Magenta
    7: { primary: "#e67e22", rgb: "230, 126, 34", secondary: "#d35400" }, // Sunset Orange
    8: { primary: "#ff4757", rgb: "255, 71, 87", secondary: "#c0392b" },  // Ruby Red
    9: { primary: "#10ac84", rgb: "16, 172, 132", secondary: "#1dd1a1" }  // Lo-Fi Teal
};

function initMusicModule(options = {}) {
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    let activeAnalyser = options.getAnalyser ? options.getAnalyser() : null;
    let currentPalette = trackColorPalettes[1];
    let isCurrentlyPlaying = typeof options.getIsPlaying === "function" ? options.getIsPlaying() : false;
    let currentTrackMeta = options.getCurrentTrack ? options.getCurrentTrack() : null;
    let audioCurrentTime = 0;

    // Visualizer state
    let visualizerMode = "bars"; // 'bars' | 'wave' | 'radial'
    let animFrameId = null;
    const barCount = 48;
    const currentBarValues = new Float32Array(barCount);
    const peakHoldBars = new Float32Array(barCount);
    const peakHoldTimers = new Float32Array(barCount);
    let idlePhase = 0;

    const canvas = $("audioVisualizerCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    const canvasWrapper = $("visualizerCanvasWrapper");
    const toggleBtn = $("visualizerToggleBtn");
    const toggleIcon = $("visualizerToggleIcon");

    // Initialize visualizer controls
    if (toggleBtn && canvasWrapper) {
        toggleBtn.addEventListener("click", () => {
            const isExpanded = canvasWrapper.classList.toggle("expanded");
            if (toggleIcon) {
                toggleIcon.className = isExpanded ? "fa-solid fa-compress" : "fa-solid fa-expand";
            }
            setTimeout(resizeCanvas, 40);
            setTimeout(resizeCanvas, 360);
        });
    }

    $$(".visualizer-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            $$(".visualizer-mode-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            visualizerMode = btn.dataset.mode;
        });
    });

    function resizeCanvas() {
        if (!canvas) return;
        const parent = canvasWrapper || canvas.parentElement;
        const w = (parent ? parent.clientWidth : 0) || canvas.clientWidth || 800;
        const h = (parent ? parent.clientHeight : 0) || (canvasWrapper && canvasWrapper.classList.contains("expanded") ? 240 : 130);
        if (w <= 0 || h <= 0) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        }
    }

    window.addEventListener("resize", resizeCanvas);
    setTimeout(resizeCanvas, 100);
    setTimeout(resizeCanvas, 400);

    // Dynamic Album Color Theme application
    function applyDynamicTheme(track) {
        const palette = trackColorPalettes[track.id] || { primary: "#1ed760", rgb: "30, 215, 96", secondary: "#129e43" };
        currentPalette = palette;

        // Set global CSS custom properties for ambient background
        document.documentElement.style.setProperty("--theme-accent", palette.primary);
        document.documentElement.style.setProperty("--theme-rgb", palette.rgb);
        document.documentElement.style.setProperty("--theme-secondary", palette.secondary);

        const pageMusic = $("pageMusic");
        if (pageMusic) {
            pageMusic.style.background = `radial-gradient(ellipse at 50% -12%, rgba(${palette.rgb}, 0.28) 0%, rgba(18, 18, 18, 0.98) 68%)`;
        }
    }

    function formatTime(sec) {
        sec = Math.floor(sec || 0);
        return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
    }

    // =========================================================================
    // VISUALIZER RENDER LOOP
    // =========================================================================
    function startVisualizerLoop() {
        if (animFrameId) {
            if (typeof window !== "undefined" && window.cancelAnimationFrame) {
                window.cancelAnimationFrame(animFrameId);
            }
        }

        const freqBuffer = new Uint8Array(64);
        const timeBuffer = new Uint8Array(128);

        function renderFrame() {
            if (typeof window !== "undefined" && window.requestAnimationFrame) {
                animFrameId = window.requestAnimationFrame(renderFrame);
            }
            if (!canvas || !ctx) return;

            const pageMusic = $("pageMusic");
            if (!pageMusic || pageMusic.style.display === "none") return; // Don't compute when page is hidden

            const dpr = window.devicePixelRatio || 1;
            let w = canvas.width / dpr;
            let h = canvas.height / dpr;

            if (w <= 0 || h <= 0) {
                resizeCanvas();
                w = canvas.width / dpr;
                h = canvas.height / dpr;
                if (w <= 0 || h <= 0) return;
            }

            ctx.clearRect(0, 0, w, h);

            let hasRealAudio = false;
            if (activeAnalyser && isCurrentlyPlaying) {
                try {
                    activeAnalyser.getByteFrequencyData(freqBuffer);
                    activeAnalyser.getByteTimeDomainData(timeBuffer);
                    for (let i = 0; i < 32; i++) {
                        if (freqBuffer[i] > 10) { hasRealAudio = true; break; }
                    }
                } catch (e) {
                    hasRealAudio = false;
                }
            }

            // Sync playback state & current audio time
            if (typeof options.getIsPlaying === "function") {
                isCurrentlyPlaying = options.getIsPlaying();
            }
            const curTime = (typeof options.getAudioTime === "function" ? options.getAudioTime() : 0) || audioCurrentTime || (idlePhase * 0.4);
            const volume = (typeof options.getAudioVolume === "function" ? options.getAudioVolume() : 1);
            const track = (options.getCurrentTrack ? options.getCurrentTrack() : null) || currentTrackMeta;

            let effectiveBpm = 118;
            if (track) {
                if (track.bpm) {
                    const parsed = parseInt(track.bpm, 10);
                    if (!isNaN(parsed) && parsed > 50 && parsed < 220) effectiveBpm = parsed;
                } else if (track.tempo && !isNaN(track.tempo)) {
                    effectiveBpm = track.tempo;
                }
            }

            // High-fidelity dynamic spectrum synthesis when streaming external CORS-restricted songs
            if (!hasRealAudio && isCurrentlyPlaying && volume > 0) {
                const beatSec = 60 / effectiveBpm;
                const beatProgress = (curTime / beatSec) % 1.0;
                const kickPunch = Math.pow(Math.max(0, 1.0 - beatProgress * 2.2), 2.8);
                const snarePhase = ((curTime / beatSec) + 1.0) % 2.0;
                const snareCrack = Math.pow(Math.max(0, 1.0 - (snarePhase % 1.0) * 2.6), 3.0);
                const hatTick = Math.pow(Math.max(0, Math.sin(curTime * (effectiveBpm / 60) * Math.PI * 2)), 4.0);
                const sixteenth = Math.sin(curTime * (effectiveBpm / 60) * Math.PI * 4);

                for (let i = 0; i < 64; i++) {
                    let binEnergy = 0;
                    const normIdx = i / 64;

                    if (i < 8) {
                        const bassSweep = Math.sin(curTime * 8 + i * 0.3) * 0.15;
                        binEnergy = (kickPunch * 0.85 + bassSweep + 0.18) * (1.0 - normIdx * 0.35);
                    } else if (i < 24) {
                        const midHarmonic = Math.sin(curTime * 14 + i * 0.45) * 0.22;
                        const chordWalk = Math.sin(curTime * 3.5 + i * 0.2) * 0.18;
                        binEnergy = snareCrack * 0.55 + midHarmonic + chordWalk + 0.25;
                    } else if (i < 46) {
                        const hiTransient = hatTick * 0.45 + (sixteenth > 0 ? sixteenth * 0.22 : 0);
                        const shimmer = Math.sin(curTime * 24 + i * 0.7) * 0.16;
                        binEnergy = hiTransient + shimmer + 0.20;
                    } else {
                        const sparkle = (Math.sin(curTime * 32 + i * 1.1) * 0.15 + 0.15);
                        const noise = ((Math.sin(curTime * 100 + i * 13) + 1) * 0.5) * 0.28;
                        binEnergy = (sparkle + noise) * (hatTick * 0.3 + 0.7);
                    }

                    const flutter = (Math.sin(curTime * 50 + i * 7.7) * 0.04);
                    binEnergy = Math.max(0.04, Math.min(1.0, (binEnergy + flutter) * volume));
                    freqBuffer[i] = Math.floor(binEnergy * 255);
                }

                for (let i = 0; i < 128; i++) {
                    const angle = (i / 128) * Math.PI * 4;
                    const waveSample = Math.sin(angle * 2 + curTime * 18) * 0.45 * (kickPunch * 0.4 + 0.6)
                        + Math.sin(angle * 5 + curTime * 35) * 0.25 * hatTick
                        + Math.sin(angle * 1 + curTime * 8) * 0.3;
                    timeBuffer[i] = Math.floor(Math.max(0, Math.min(255, (128 + waveSample * 110 * volume))));
                }
                hasRealAudio = true;
            } else if (!hasRealAudio) {
                // Gentle ambient harmonic breathing wave when paused
                idlePhase += 0.035;
                for (let i = 0; i < 64; i++) {
                    const ambient = (Math.sin(idlePhase + i * 0.18) * 0.08 + Math.cos(idlePhase * 0.7 + i * 0.09) * 0.05 + 0.12);
                    freqBuffer[i] = Math.floor(ambient * 255);
                }
                for (let i = 0; i < 128; i++) {
                    const wSample = Math.sin(idlePhase * 1.2 + (i / 128) * Math.PI * 2) * 0.15;
                    timeBuffer[i] = Math.floor(128 + wSample * 128);
                }
            }

            idlePhase += 0.035;

            if (visualizerMode === "bars") {
                drawBars(w, h, freqBuffer, hasRealAudio);
            } else if (visualizerMode === "wave") {
                drawWave(w, h, timeBuffer, hasRealAudio);
            } else if (visualizerMode === "radial") {
                drawRadial(w, h, freqBuffer, hasRealAudio);
            }
        }

        renderFrame();
    }

    // MODE 1: Frequency Bars
    function drawBars(w, h, freqBuffer, isLive) {
        const count = 48;
        const gap = 3;
        const totalGap = (count - 1) * gap;
        const barWidth = Math.max(3, (w - totalGap) / count);
        const themeColor = currentPalette.primary;
        const rgb = currentPalette.rgb;
        const maxBarH = h - 20;

        for (let i = 0; i < count; i++) {
            const binIdx = Math.min(63, Math.floor(Math.pow(i / count, 1.25) * 58));
            const rawVal = freqBuffer[binIdx] / 255;

            if (rawVal > currentBarValues[i]) {
                currentBarValues[i] = rawVal;
            } else {
                currentBarValues[i] = Math.max(0, currentBarValues[i] - 0.035);
            }

            const val = currentBarValues[i];
            const barH = Math.max(4, val * maxBarH);
            const x = i * (barWidth + gap);
            const y = h - barH - 4;

            if (val >= peakHoldBars[i]) {
                peakHoldBars[i] = val;
                peakHoldTimers[i] = 12;
            } else {
                if (peakHoldTimers[i] > 0) {
                    peakHoldTimers[i]--;
                } else {
                    peakHoldBars[i] = Math.max(0, peakHoldBars[i] - 0.018);
                }
            }

            const grad = ctx.createLinearGradient(0, h, 0, y);
            grad.addColorStop(0, `rgba(${rgb}, 0.15)`);
            grad.addColorStop(0.5, themeColor);
            grad.addColorStop(0.9, "#ffffff");
            grad.addColorStop(1, "#ffffff");

            ctx.fillStyle = grad;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]);
            } else {
                ctx.rect(x, y, barWidth, barH);
            }
            ctx.fill();

            if (peakHoldBars[i] > 0.06) {
                const peakY = Math.max(2, h - (peakHoldBars[i] * maxBarH) - 7);
                ctx.fillStyle = `rgba(${rgb}, 0.95)`;
                ctx.fillRect(x, peakY, barWidth, 2.5);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 1, peakY, Math.max(1, barWidth - 2), 1.5);
            }
        }
    }

    // MODE 2: Oscilloscope Wave
    function drawWave(w, h, timeBuffer, isLive) {
        const themeColor = currentPalette.primary;
        const rgb = currentPalette.rgb;
        const centerY = h / 2;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = themeColor;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 14;

        ctx.beginPath();
        const sliceWidth = w / (timeBuffer.length - 1);

        for (let i = 0; i < timeBuffer.length; i++) {
            const v = timeBuffer[i] / 255.0;
            const y = v * (h - 24) + 12;
            const x = i * sliceWidth;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(${rgb}, 0.4)`;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let i = 0; i < timeBuffer.length; i++) {
            const v = 1.0 - (timeBuffer[i] / 255.0);
            const y = v * (h - 24) + 12;
            const x = i * sliceWidth;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();
    }

    // MODE 3: Radial Pulse
    function drawRadial(w, h, freqBuffer, isLive) {
        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(w, h) * 0.22;
        const spokeCount = 40;
        const themeColor = currentPalette.primary;
        const rgb = currentPalette.rgb;

        ctx.save();

        const bassEnergy = (freqBuffer[0] + freqBuffer[1] + freqBuffer[2] + freqBuffer[3]) / (4 * 255);
        const coreRadius = baseRadius + bassEnergy * 16;

        const radialGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
        radialGrad.addColorStop(0, `rgba(${rgb}, ${0.45 + bassEnergy * 0.3})`);
        radialGrad.addColorStop(0.7, `rgba(${rgb}, ${0.15 + bassEnergy * 0.2})`);
        radialGrad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = radialGrad;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 20;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.45, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        for (let i = 0; i < spokeCount; i++) {
            const angle = (i / spokeCount) * Math.PI * 2 - (Math.PI / 2);
            const binIdx = Math.min(63, Math.floor((i / spokeCount) * 48));
            const val = freqBuffer[binIdx] / 255;
            const spokeLen = 6 + val * (Math.min(w, h) * 0.34);

            const rStart = baseRadius + bassEnergy * 6;
            const rEnd = rStart + spokeLen;

            const x1 = cx + Math.cos(angle) * rStart;
            const y1 = cy + Math.sin(angle) * rStart;
            const x2 = cx + Math.cos(angle) * rEnd;
            const y2 = cy + Math.sin(angle) * rEnd;

            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.strokeStyle = val > 0.65 ? "#ffffff" : themeColor;
            ctx.shadowColor = themeColor;
            ctx.shadowBlur = val > 0.65 ? 12 : 4;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // =========================================================================
    // TRACK RENDER & UI SYNC
    // =========================================================================
    function render(track, playlist, isPlaying, likedSongs, onPlayTrack, onTogglePlay, onSeek, toast) {
        if (!track) return;
        currentTrackMeta = track;
        isCurrentlyPlaying = !!isPlaying;
        setTimeout(resizeCanvas, 40);
        setTimeout(resizeCanvas, 200);
        const meta = trackDetailsMeta[track.id] || trackDetailsMeta[1];

        // 1. Dynamic Album Theming
        applyDynamicTheme(track);

        // 2. Visualizer state sync
        isCurrentlyPlaying = isPlaying;
        resizeCanvas();

        // Artwork and title
        const artEl = $("musicPageArt");
        if (artEl) {
            artEl.src = track.img;
            artEl.alt = track.title;
        }

        const titleEl = $("musicPageTitle");
        if (titleEl) titleEl.textContent = track.title;

        const artistEl = $("musicPageArtist");
        if (artistEl) artistEl.textContent = track.artist;

        const avatarEl = $("musicPageArtistAvatar");
        if (avatarEl) avatarEl.src = meta.avatar || track.img;

        const albumEl = $("musicPageAlbum");
        if (albumEl) albumEl.textContent = meta.album;

        const yearEl = $("musicPageYear");
        if (yearEl) yearEl.textContent = meta.year;

        const durEl = $("musicPageDuration");
        if (durEl) durEl.textContent = formatTime(track.duration);

        // Audio meta pills
        const bpmEl = $("musicPageBpm");
        if (bpmEl) bpmEl.textContent = meta.bpm;

        const keyEl = $("musicPageKey");
        if (keyEl) keyEl.textContent = `Key: ${meta.key}`;

        // Play/Pause button icon & style
        updatePlayState(isPlaying);

        // Like button
        updateLikeState(likedSongs.has(track.id));

        // Render Lyrics
        const lyricsContainer = $("musicPageLyrics");
        if (lyricsContainer) {
            if (track.lyrics && track.lyrics.length > 0) {
                const step = track.duration / track.lyrics.length;
                lyricsContainer.innerHTML = track.lyrics.map((line, idx) => {
                    const targetSec = Math.floor(idx * step);
                    return `<p class="lyric-sync-line ${idx === 0 ? 'active-lyric' : ''}" data-target-sec="${targetSec}" data-line-idx="${idx}">
                        ${line}
                    </p>`;
                }).join("");

                $$(".lyric-sync-line").forEach(line => {
                    line.addEventListener("click", () => {
                        const sec = parseInt(line.dataset.targetSec, 10);
                        if (onSeek) onSeek(sec);
                        highlightLyricLine(parseInt(line.dataset.lineIdx, 10));
                    });
                });
            } else {
                lyricsContainer.innerHTML = `<p class="lyric-sync-line active-lyric">♪ Instrumental & Melodic Ambience ♪</p>`;
            }
        }

        // About Artist Card
        const artistNameEl = $("aboutArtistName");
        if (artistNameEl) artistNameEl.textContent = track.artist.split(",")[0].trim();

        const artistImgEl = $("aboutArtistImg");
        if (artistImgEl) artistImgEl.src = meta.avatar || track.img;

        const artistListenersEl = $("aboutArtistListeners");
        if (artistListenersEl) artistListenersEl.textContent = meta.listeners;

        const artistBioEl = $("aboutArtistBio");
        if (artistBioEl) artistBioEl.textContent = meta.bio;

        // Credits Box
        const credArtist = $("creditArtist");
        if (credArtist) credArtist.textContent = track.artist;

        const credWriters = $("creditWriters");
        if (credWriters) credWriters.textContent = meta.writers;

        const credProducers = $("creditProducers");
        if (credProducers) credProducers.textContent = meta.producers;

        // Up Next / Recommended List
        const upNextContainer = $("musicUpNextList");
        if (upNextContainer) {
            const others = playlist.filter(t => t.id !== track.id);
            upNextContainer.innerHTML = others.map((t, i) => `
                <div class="up-next-row" data-song-id="${t.id}">
                    <span class="up-next-num">${i + 1}</span>
                    <img src="${t.img}" class="up-next-thumb" alt="${t.title}">
                    <div class="up-next-meta">
                        <span class="up-next-title">${t.title}</span>
                        <span class="up-next-artist">${t.artist}</span>
                    </div>
                    <span class="up-next-time">${formatTime(t.duration)}</span>
                    <button class="up-next-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
            `).join("");

            $$(".up-next-row").forEach(row => {
                row.addEventListener("click", () => {
                    const songId = parseInt(row.dataset.songId, 10);
                    const idx = playlist.findIndex(p => p.id === songId);
                    if (idx !== -1 && onPlayTrack) {
                        onPlayTrack(idx);
                    }
                });
            });
        }
    }

    function updatePlayState(isPlaying) {
        isCurrentlyPlaying = isPlaying;
        const playBtn = $("musicPagePlayBtn");
        const playIcon = $("musicPagePlayIcon");
        if (!playBtn || !playIcon) return;

        if (isPlaying) {
            playIcon.className = "fa-solid fa-pause";
            playBtn.classList.add("playing");
            playBtn.title = "Pause";
        } else {
            playIcon.className = "fa-solid fa-play";
            playBtn.classList.remove("playing");
            playBtn.title = "Play";
        }
    }

    function updateLikeState(isLiked) {
        const btn = $("musicPageLikeBtn");
        if (!btn) return;
        const icon = btn.querySelector("i");
        if (isLiked) {
            btn.className = "music-icon-action-btn liked";
            if (icon) icon.className = "fa-solid fa-heart";
        } else {
            btn.className = "music-icon-action-btn";
            if (icon) icon.className = "fa-regular fa-heart";
        }
    }

    function highlightLyricLine(idx) {
        const lines = $$(".lyric-sync-line");
        lines.forEach((l, i) => {
            if (i === idx) {
                l.classList.add("active-lyric");
                l.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                l.classList.remove("active-lyric");
            }
        });
    }

    // Called every tick to sync lyric highlight
    function syncLyricsWithTime(currentTime, duration, lyricsLength) {
        audioCurrentTime = currentTime;
        if (!lyricsLength) return;
        const step = duration / lyricsLength;
        const currentIdx = Math.min(lyricsLength - 1, Math.floor(currentTime / step));
        const activeLine = document.querySelector(".lyric-sync-line.active-lyric");
        const newTargetLine = document.querySelector(`.lyric-sync-line[data-line-idx="${currentIdx}"]`);

        if (newTargetLine && activeLine !== newTargetLine) {
            if (activeLine) activeLine.classList.remove("active-lyric");
            newTargetLine.classList.add("active-lyric");
        }
    }

    // Start visualizer animation loop
    startVisualizerLoop();

    return {
        render,
        updatePlayState,
        updateLikeState,
        syncLyricsWithTime,
        setCurrentTrack(t) { currentTrackMeta = t; },
        setAudioTime(t) { audioCurrentTime = t; },
        setAnalyser(node) {
            activeAnalyser = node;
        },
        resizeVisualizer: resizeCanvas
    };
}


const FOOTER_PAGES_DATA = [
    // 1. Company
    {
        filename: 'about.html',
        title: 'Spotify - About Us',
        badge: 'COMPANY & CULTURE',
        heroClass: 'hero-teal',
        heroTitle: 'Band together for the future of audio.',
        heroSub: 'Our mission is to unlock the potential of human creativity—by giving a million creative artists the opportunity to live off their art and billions of fans the opportunity to enjoy and be inspired by it.',
        actions: '<button class="badge" onclick="window.location.href=\'jobs.html\'">View Open Roles</button><button class="badge dark-badge" onclick="window.location.href=\'for-the-record.html\'">Press Releases</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-users"></i></div>
                    <h4>626 Million+ Listeners</h4>
                    <p>Over 626 million monthly active listeners across 184 countries and territories enjoy music on Spotify daily.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-music"></i></div>
                    <h4>100 Million+ Tracks</h4>
                    <p>Access the world's most comprehensive catalog of songs, live performances, and exclusive audio experiences.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-podcast"></i></div>
                    <h4>6 Million+ Podcasts</h4>
                    <p>Empowering creators and storytellers globally to reach passionate listeners wherever they are.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-earth-americas"></i></div>
                    <h4>Global Diversity</h4>
                    <p>Offices across Stockholm, New York, London, Tokyo, Mumbai, and Sydney fostering inclusive audio innovation.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'jobs.html',
        title: 'Spotify - Careers & Jobs',
        badge: 'JOIN THE BAND',
        heroClass: 'hero-purple',
        heroTitle: 'Work that hits the right notes.',
        heroSub: 'Join a world-class team of engineers, designers, researchers, and audio pioneers transforming how the world connects through music.',
        actions: '<button class="badge" onclick="alert(\'Application portal: Submissions open for Q4 2026 roles.\')">Apply for Roles</button><button class="badge dark-badge" onclick="window.location.href=\'about.html\'">Life at Spotify</button>',
        content: `
            <h3 class="info-section-title">Featured Opportunities</h3>
            <div class="info-list-group">
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Senior Frontend Engineer — Web Audio & Player Systems</span>
                        <span class="info-list-desc">Stockholm, Sweden / Remote • Engineering • Full-time</span>
                    </div>
                    <button class="badge dark-badge" onclick="alert('Position details: Senior Frontend Engineer (Web Audio)')">View Role</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Staff Product Designer — Design Systems & UI Core</span>
                        <span class="info-list-desc">New York, NY / Remote • Design • Full-time</span>
                    </div>
                    <button class="badge dark-badge" onclick="alert('Position details: Staff Product Designer')">View Role</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Machine Learning Scientist — Audio Recommendation Algorithms</span>
                        <span class="info-list-desc">London, UK • Machine Learning • Full-time</span>
                    </div>
                    <button class="badge dark-badge" onclick="alert('Position details: Machine Learning Scientist')">View Role</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Global Artist Partnerships Lead</span>
                        <span class="info-list-desc">Mumbai, India • Music Editorial • Full-time</span>
                    </div>
                    <button class="badge dark-badge" onclick="alert('Position details: Artist Partnerships Lead')">View Role</button>
                </div>
            </div>
        `
    },
    {
        filename: 'for-the-record.html',
        title: 'Spotify - For the Record (Newsroom)',
        badge: 'OFFICIAL NEWSROOM',
        heroClass: 'hero-blue',
        heroTitle: 'Stories behind the sound.',
        heroSub: 'Discover the latest company announcements, product launches, global streaming data, and behind-the-scenes interviews with creators.',
        actions: '<button class="badge" onclick="alert(\'Subscribed to Spotify Press Releases!\')">Subscribe to Updates</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <span class="info-badge">PRODUCT NEWS</span>
                    <h4>How Real-Time Audio Visualizers & Lossless HiFi Transform Listening</h4>
                    <p>An inside look at our engineering team\'s implementation of hardware-accelerated spectrum visualizers and adaptive acoustics.</p>
                </div>
                <div class="info-card">
                    <span class="info-badge">CULTURE & ARTISTS</span>
                    <h4>Loud & Clear: Record Payouts to Independent Songwriters and Labels</h4>
                    <p>In 2025, Spotify paid more than $9 billion to the music industry, setting a new historical milestone for digital streaming.</p>
                </div>
                <div class="info-card">
                    <span class="info-badge">INNOVATION</span>
                    <h4>AI DJ Expansion: Voice Intelligence Meets Sonic Curation</h4>
                    <p>Rolling out localized AI voice DJ experiences across Europe, Latin America, and Asia in over 30 languages.</p>
                </div>
            </div>
        `
    },

    // 2. Communities
    {
        filename: 'for-artists.html',
        title: 'Spotify for Artists',
        badge: 'CREATIVE COMMUNITY',
        heroClass: 'hero-pink',
        heroTitle: 'Claim your profile. Grow your audience.',
        heroSub: 'Get the data, tools, and direct fan connections you need to build a lifelong career in music on the world\'s largest streaming stage.',
        actions: '<button class="badge" onclick="alert(\'Redirecting to Spotify for Artists login...\')">Claim Artist Profile</button><button class="badge dark-badge" onclick="window.location.href=\'music.html\'">View Live Showcase</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-chart-line"></i></div>
                    <h4>Real-Time Audience Data</h4>
                    <p>Track live listener spikes when your track drops, discover which playlists feature you, and map your worldwide fans.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-bullhorn"></i></div>
                    <h4>Pitch to Playlist Editors</h4>
                    <p>Submit unreleased tracks directly to our global editorial teams for placement on New Music Friday and Discover Weekly.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-clapperboard"></i></div>
                    <h4>Canvas Visuals & Merch</h4>
                    <p>Add 8-second looping visual videos to every song and link your official merchandise directly on your artist page.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'for-creators.html',
        title: 'Spotify for Creators',
        badge: 'PODCASTS & SHOWS',
        heroClass: 'hero-purple',
        heroTitle: 'Where audio storytelling finds its home.',
        heroSub: 'From recorded room talks to video podcasts, discover distribution, monetization, and interactive Q&A tools made for creators.',
        actions: '<button class="badge" onclick="window.location.href=\'podcasts.html\'">Explore Podcasts</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-video"></i></div>
                    <h4>Video Podcasting</h4>
                    <p>Engage viewers with full-fidelity video streaming on desktop and mobile, with seamless audio background playback.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-comments"></i></div>
                    <h4>Interactive Polls & Q&As</h4>
                    <p>Chat directly with your community by embedding audience questions and real-time live episode polls.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-money-bill-wave"></i></div>
                    <h4>Spotify Open Access & Ads</h4>
                    <p>Monetize your listenership through subscriber-only bonus episodes and automated dynamic ad insertion.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'for-authors.html',
        title: 'Spotify for Authors',
        badge: 'AUDIOBOOKS & LITERATURE',
        heroClass: 'hero-orange',
        heroTitle: 'Give voice to your stories.',
        heroSub: 'Distribute your audiobooks to Spotify Premium subscribers and listeners worldwide with industry-leading narration tools and transparent royalty tracking.',
        actions: '<button class="badge" onclick="alert(\'Spotify Audiobook publishing program details requested.\')">Publish with Spotify</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-book-open"></i></div>
                    <h4>375,000+ Titles Available</h4>
                    <p>Join world-renowned publishing houses and indie writers reaching avid audiobook listeners globally.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-clock"></i></div>
                    <h4>15 Hours Monthly Included</h4>
                    <p>Eligible Spotify Premium subscribers receive 15 hours of audiobook listening time every single month.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-microphone"></i></div>
                    <h4>High-Fidelity Narration</h4>
                    <p>Chapter bookmarking, variable playback speeds (0.5x to 3.5x), and sleep timers tailored for spoken word.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'developers.html',
        title: 'Spotify for Developers',
        badge: 'WEB API & SDKS',
        heroClass: 'hero-blue',
        heroTitle: 'Build music into your apps.',
        heroSub: 'Explore our modern Web API, Web Playback SDK, and open endpoints to create next-generation music and audio experiences.',
        actions: '<button class="badge" onclick="alert(\'API Documentation: docs.spotify.com/web-api\')">Read API Docs</button><button class="badge dark-badge" onclick="alert(\'Dashboard: Create your Client ID\')">Create an App</button>',
        content: `
            <div class="code-box">
// Sample Web API Request: Get Currently Playing Track
curl -X GET "https://api.spotify.com/v1/me/player/currently-playing" \\
  -H "Authorization: Bearer BQD...YOUR_OAUTH_TOKEN"
            </div>
            <div class="info-grid" style="margin-top:2rem;">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-code"></i></div>
                    <h4>Web API</h4>
                    <p>Retrieve rich metadata for artists, albums, playlists, tracks, audio features, and personalized recommendations.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-laptop-code"></i></div>
                    <h4>Web Playback SDK</h4>
                    <p>Stream Spotify audio directly inside web browsers using HTML5 Web Audio and encrypted DRM media streams.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-puzzle-piece"></i></div>
                    <h4>Embed Widgets</h4>
                    <p>Easily embed responsive Spotify player widgets into blogs, portfolios, and websites with simple iframe tags.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'advertising.html',
        title: 'Spotify Advertising',
        badge: 'SPOTIFY AD STUDIO',
        heroClass: 'hero-teal',
        heroTitle: 'Connect with listeners at the speed of culture.',
        heroSub: 'Reach people when screens can\'t: working out, cooking, commuting, or relaxing with sound that commands attention.',
        actions: '<button class="badge" onclick="alert(\'Welcome to Spotify Ad Studio. Sign up to launch audio campaigns starting from $250.\')">Start an Ad Campaign</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-volume-high"></i></div>
                    <h4>Audio Ads</h4>
                    <p>Engage listeners with 30-second audio spots with a clickable companion display banner and direct call to action.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-display"></i></div>
                    <h4>Video Takeover</h4>
                    <p>Reach users when they actively browse Spotify on mobile or desktop with sound-on, high-impact video experiences.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-bullseye"></i></div>
                    <h4>Contextual Streaming Intelligence</h4>
                    <p>Target based on music moods, workout activities, study playlists, device types, and geographical zones.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'investors.html',
        title: 'Spotify - Investor Relations',
        badge: 'NYSE: SPOT',
        heroClass: 'hero-purple',
        heroTitle: 'Spotify Technology S.A.',
        heroSub: 'Explore our latest quarterly earnings reports, shareholder letters, SEC filings, and governance materials.',
        actions: '<button class="badge" onclick="alert(\'Downloading latest Q3/Q4 2026 Shareholder Deck...\')">Download Earnings Report (PDF)</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-arrow-trend-up"></i></div>
                    <h4>Quarterly Results</h4>
                    <p>Access our webcasts, financial press releases, operating income metrics, and global subscriber trends.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
                    <h4>SEC Filings</h4>
                    <p>Complete regulatory disclosures, including Forms 20-F, 6-K, proxy statements, and annual reports.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-scale-balanced"></i></div>
                    <h4>Corporate Governance</h4>
                    <p>Information on our board of directors, management committee, audit practices, and sustainability policies.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'vendors.html',
        title: 'Spotify - Vendors & Partners',
        badge: 'SUPPLIER PORTAL',
        heroClass: 'hero-blue',
        heroTitle: 'Collaborate with Spotify.',
        heroSub: 'Resources, compliance guidelines, and procurement tools for Spotify vendors, service partners, and suppliers worldwide.',
        actions: '<button class="badge" onclick="alert(\'Opening Spotify Supplier Portal login...\')">Vendor Portal Login</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-handshake"></i></div>
                    <h4>Supplier Code of Conduct</h4>
                    <p>Our standards for human rights, labor welfare, anti-corruption, environmental stewardship, and safety.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-receipt"></i></div>
                    <h4>Billing & Invoicing Rules</h4>
                    <p>Electronic invoicing instructions, purchase order verification, and regional payment terms.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-shield-halved"></i></div>
                    <h4>Data Security & Privacy</h4>
                    <p>Information security requirements and privacy benchmarks expected of all third-party systems.</p>
                </div>
            </div>
        `
    },

    // 3. Useful Links
    {
        filename: 'support.html',
        title: 'Spotify - Support & Help Center',
        badge: 'CUSTOMER HELP',
        heroClass: 'hero-teal',
        heroTitle: 'How can we help you today?',
        heroSub: 'Find answers, manage your subscription, fix audio playback issues, and learn tips to get the most out of Spotify.',
        actions: '<button class="badge" onclick="alert(\'Live Chat: Our support assistant is ready to help.\')">Start Live Chat</button><button class="badge dark-badge" onclick="window.location.href=\'premium.html\'">Manage Subscription</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-key"></i></div>
                    <h4>Can\'t Log In?</h4>
                    <p>Reset your password, recover linked email addresses, or troubleshoot social login connections.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-credit-card"></i></div>
                    <h4>Payment & Billing</h4>
                    <p>Update credit cards, view past invoices, check trial expiration dates, or switch billing frequency.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-headphones"></i></div>
                    <h4>Audio Troubleshooting</h4>
                    <p>Fix crackling or stuttering sound, enable high-fidelity 320 kbps streaming, and configure offline cache.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'free-mobile-app.html',
        title: 'Spotify - Free Mobile App',
        badge: 'DOWNLOAD APP',
        heroClass: 'hero-pink',
        heroTitle: 'Take the sound anywhere.',
        heroSub: 'Download Spotify for your iPhone, iPad, Android phone, smart watch, and tablet. Millions of songs right in your pocket.',
        actions: '<button class="badge" onclick="alert(\'Downloading Spotify for iOS (App Store)...\')"><i class=\"fa-brands fa-apple\"></i> Download on App Store</button><button class="badge dark-badge" onclick="alert(\'Downloading Spotify for Android (Google Play)...\')"><i class=\"fa-brands fa-google-play\"></i> Get it on Google Play</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-car"></i></div>
                    <h4>CarPlay & Android Auto</h4>
                    <p>Control playlists effortlessly with oversized buttons and voice commands while keeping eyes on the road.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-wifi"></i></div>
                    <h4>Data Saver Mode</h4>
                    <p>Stream longer while consuming less mobile bandwidth with smart audio compression and offline playlists.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-sliders"></i></div>
                    <h4>Lock Screen Player</h4>
                    <p>Seamlessly control tracks, seek through live lyrics, and view high-res album covers on your lock screen.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'popular-by-country.html',
        title: 'Spotify - Popular by Country',
        badge: 'WORLDWIDE CHARTS',
        heroClass: 'hero-orange',
        heroTitle: 'Listen to what the world is playing.',
        heroSub: 'Explore daily and weekly streaming velocities across 70+ nations. From Bollywood blockbusters to Tokyo J-Pop and London indie.',
        actions: '<button class="badge" onclick="window.location.href=\'index.html\'">Listen to Global Top 50</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <h4>🇺🇸 United States — Top Hits</h4>
                    <p>Hip-Hop, pop chartbusters, country crossovers, and trending viral billboard records.</p>
                </div>
                <div class="info-card">
                    <h4>🇮🇳 India — Hot 50 Hits</h4>
                    <p>Bollywood romantic soundtracks, Punjabi high-energy anthems, and viral indie tracks.</p>
                </div>
                <div class="info-card">
                    <h4>🇬🇧 United Kingdom — Official Charts</h4>
                    <p>Electronic dance music, UK drill, brit-pop, and breakthrough acoustic singer-songwriters.</p>
                </div>
                <div class="info-card">
                    <h4>🇯🇵 Japan — Weekly Viral</h4>
                    <p>City pop classics, anime soundtracks, modern J-Rock, and Shibuya lo-fi beats.</p>
                </div>
                <div class="info-card">
                    <h4>🇧🇷 Brazil — Top Brasil</h4>
                    <p>Sertanejo universitário, Rio funk rhythms, and melodic MPB favorites.</p>
                </div>
                <div class="info-card">
                    <h4>🌍 Top 50 — Global</h4>
                    <p>The daily definitive index of the most played music across every country on earth.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'top-song-lyrics.html',
        title: 'Spotify - Top Song Lyrics',
        badge: 'SING ALONG',
        heroClass: 'hero-teal',
        heroTitle: 'Live synchronized lyrics for the songs you love.',
        heroSub: 'Sing along in real time, discover songwriting credits, and seek through audio by tapping any lyric line.',
        actions: '<button class="badge" onclick="window.location.href=\'music.html\'">Open Live Lyrics Player</button>',
        content: `
            <div class="info-list-group">
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Blinding Lights — The Weeknd</span>
                        <span class="info-list-desc">"I've been on my own for long enough, maybe you can show me how to love..."</span>
                    </div>
                    <button class="badge" onclick="window.location.href=\'music.html\'">Play & Sing</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Mahiya Jinna Sohna — Darshan Raval</span>
                        <span class="info-list-desc">"Tu hi meri zindagani, tu hi chain mera, mahiya jinna sohna koi hor na mileya..."</span>
                    </div>
                    <button class="badge" onclick="window.location.href=\'music.html\'">Play & Sing</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Starboy — The Weeknd ft. Daft Punk</span>
                        <span class="info-list-desc">"P1 cleaner than your church shoes, ah... Look what you've done, I'm a motherf***ing starboy!"</span>
                    </div>
                    <button class="badge" onclick="window.location.href=\'music.html\'">Play & Sing</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Naa Ready — Leo (Anirudh Ravichander)</span>
                        <span class="info-list-desc">"Aagasam idikithu, aalungallum aaduthu, Naa ready thaan varava..."</span>
                    </div>
                    <button class="badge" onclick="window.location.href=\'music.html\'">Play & Sing</button>
                </div>
            </div>
        `
    },
    {
        filename: 'import-your-music.html',
        title: 'Spotify - Import Your Music',
        badge: 'LOCAL AUDIO FILES',
        heroClass: 'hero-purple',
        heroTitle: 'Play your own audio files alongside Spotify.',
        heroSub: 'Import local MP3, WAV, FLAC, and M4A audio files from your computer and listen with our Web Audio player and real-time spectrum visualizer.',
        actions: '<button class="badge" onclick="document.getElementById(\'localAudioInput\').click()"><i class=\"fa-solid fa-folder-open\"></i> Select Local Files</button>',
        content: `
            <div class="dropzone-box" onclick="document.getElementById('localAudioInput').click()">
                <i class="fa-solid fa-cloud-arrow-up" style="font-size:3rem;color:#1ed760;margin-bottom:1rem;display:block;"></i>
                <h3 style="font-size:1.4rem;color:#fff;margin-bottom:0.5rem;">Drag & drop your audio tracks here</h3>
                <p style="color:#888;font-size:0.9rem;">Supports MP3, WAV, FLAC, AAC, OGG. Plays right in your browser with zero upload wait.</p>
                <input type="file" id="localAudioInput" accept="audio/*" multiple style="display:none;" onchange="alert('Selected ' + this.files.length + ' audio files! Ready for playback.')">
            </div>
            <div class="info-grid">
                <div class="info-card">
                    <h4>Private & Client-Side</h4>
                    <p>Your local audio files stay completely private on your machine and are rendered locally using the Web Audio API.</p>
                </div>
                <div class="info-card">
                    <h4>Visualizer Compatible</h4>
                    <p>All imported songs connect directly into our real-time frequency spectrum visualizer and oscilloscope.</p>
                </div>
            </div>
        `
    },

    // 4. Spotify Plans
    {
        filename: 'premium-standard.html',
        title: 'Spotify - Premium Standard Plan',
        badge: 'PREMIUM INDIVIDUAL',
        heroClass: 'hero-teal',
        heroTitle: 'Ad-free listening. Unlimited downloads.',
        heroSub: 'Enjoy $10.99 / month after 1 month free trial. Cancel anytime with a single click in your settings.',
        actions: '<button class="badge" onclick="window.location.href=\'premium.html\'">Start 1 Month Free</button><button class="badge dark-badge" onclick="window.location.href=\'premium.html\'">Compare All Plans</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-ban"></i></div>
                    <h4>Zero Interruptions</h4>
                    <p>Never hear another commercial or sponsored interruption between your songs.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-arrow-down"></i></div>
                    <h4>Download up to 10,000 Songs</h4>
                    <p>Store your favorite albums on up to 5 devices for full offline plane rides and road trips.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-sliders"></i></div>
                    <h4>Full On-Demand Control</h4>
                    <p>Play any track, repeat, rewind, and skip as many times as you desire without restriction.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'premium-platinum.html',
        title: 'Spotify - Premium Platinum Plan',
        badge: 'LOSSLESS AUDIO',
        heroClass: 'hero-purple',
        heroTitle: 'Pure Lossless 24-bit HiFi Audio.',
        heroSub: 'Experience music exactly as the artists and producers recorded it in studio master clarity with adaptive spatial acoustics.',
        actions: '<button class="badge" onclick="window.location.href=\'premium.html\'">Upgrade to Platinum</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-wave-square"></i></div>
                    <h4>24-bit / 192kHz Lossless FLAC</h4>
                    <p>Bit-perfect sound transmission delivering dynamic range and nuanced analog depth.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                    <h4>AI Studio Remastering</h4>
                    <p>Intelligent frequency separation that boosts vocals and tightens bass response in real time.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-headphones"></i></div>
                    <h4>Headphone Tuning Profiles</h4>
                    <p>Custom calibration curves for over 150 top audiophile headphones and studio monitors.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'premium-student.html',
        title: 'Spotify - Premium Student Plan',
        badge: 'SPECIAL 50% DISCOUNT',
        heroClass: 'hero-orange',
        heroTitle: 'Study hard. Stream harder. Just $5.99 / mo.',
        heroSub: 'Verified college and university students get a huge 50% discount plus free access to Hulu (With Ads).',
        actions: '<button class="badge" onclick="window.location.href=\'premium.html\'">Verify with SheerID</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-graduation-cap"></i></div>
                    <h4>50% Student Discount</h4>
                    <p>Save over $60 each year compared to standard individual pricing, valid for up to 4 study years.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-tv"></i></div>
                    <h4>Hulu Included Free</h4>
                    <p>Watch hit television shows, movies, and Hulu originals anytime on your laptop or phone.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-book"></i></div>
                    <h4>Focus & Study Soundtracks</h4>
                    <p>Unlimited access to curated deep-focus lo-fi, binaural beats, and ambient study acoustics.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'spotify-free.html',
        title: 'Spotify - Free Plan',
        badge: 'FREE FOREVER',
        heroClass: 'hero-blue',
        heroTitle: 'Music for everyone. Zero cost.',
        heroSub: 'Access over 100 million songs, millions of podcasts, and create unlimited custom playlists completely free.',
        actions: '<button class="badge" onclick="window.location.href=\'auth.html\'">Sign Up Free</button><button class="badge dark-badge" onclick="window.location.href=\'premium.html\'">Compare with Premium</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-music"></i></div>
                    <h4>100M+ Songs on Shuffle</h4>
                    <p>Enjoy our entire global music catalog across desktop, tablet, web, and smart speakers.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-list"></i></div>
                    <h4>Create Unlimited Playlists</h4>
                    <p>Curate custom playlists, share them with your friends, and collaborate on shared music collections.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-podcast"></i></div>
                    <h4>Full Podcast Library</h4>
                    <p>Stream every podcast, follow your favorite hosts, and get notified about brand-new episodes.</p>
                </div>
            </div>
        `
    },

    // 5. Sidebar Bottom Legal & Privacy
    {
        filename: 'legal.html',
        title: 'Spotify - Legal Information',
        badge: 'LEGAL & COMPLIANCE',
        heroClass: 'hero-teal',
        heroTitle: 'Spotify Legal Terms and Notices.',
        heroSub: 'Read our terms of use, intellectual property policies, copyright guidelines, and commercial licensing agreements.',
        actions: '<button class="badge" onclick="alert(\'Downloading Spotify Terms of Service (PDF)...\')">Download Terms (PDF)</button><button class="badge dark-badge" onclick="openFooterPage(\'safety-privacy-center.html\')">Safety Center</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-scale-balanced"></i></div>
                    <h4>Terms of Service</h4>
                    <p>The definitive user agreement governing the use of Spotify applications, streaming services, and subscription features.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-copyright"></i></div>
                    <h4>Copyright & Intellectual Property</h4>
                    <p>Information on DMCA takedown procedures, reporting copyright infringement, and licensing partner guidelines.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-handshake"></i></div>
                    <h4>Fair Play Guidelines</h4>
                    <p>Rules regarding community behavior, preventing stream manipulation, and acceptable audio usage.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-file-contract"></i></div>
                    <h4>Trademark & Brand Licensing</h4>
                    <p>Guidelines for partners, developers, and media outlets referencing Spotify logos, wordmarks, and visual assets.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'safety-privacy-center.html',
        title: 'Spotify - Safety & Privacy Center',
        badge: 'SAFETY & TRUST',
        heroClass: 'hero-purple',
        heroTitle: 'Your safety, security, and privacy come first.',
        heroSub: 'Learn how Spotify protects your account, safeguards your data, and provides parental controls for a safe listening environment.',
        actions: '<button class="badge" onclick="openFooterPage(\'privacy-policy.html\')">Read Privacy Policy</button><button class="badge dark-badge" onclick="alert(\'Security Report: All systems nominal.\')">Security Status</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-shield-halved"></i></div>
                    <h4>Account Protection & 2FA</h4>
                    <p>Multi-factor authentication, suspicious login detection, and prompt security alerts keep your profile locked down.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-child-reaching"></i></div>
                    <h4>Youth & Parental Controls</h4>
                    <p>Toggle explicit content filters on and off with pin protection, ensuring age-appropriate listening for families.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-user-secret"></i></div>
                    <h4>Private Listening Sessions</h4>
                    <p>Turn on Private Session at any time to temporarily hide your real-time listening activity from your friend feed.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-bug"></i></div>
                    <h4>Vulnerability Disclosure</h4>
                    <p>Our global Bug Bounty Program partners with white-hat security researchers to proactively uncover and fix threats.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'privacy-policy.html',
        title: 'Spotify - Privacy Policy',
        badge: 'DATA & TRANSPARENCY',
        heroClass: 'hero-blue',
        heroTitle: 'Transparency in how your data is used.',
        heroSub: 'We believe in total transparency. Explore what data we collect, why we collect it, and how you have full control over your personal information.',
        actions: '<button class="badge" onclick="alert(\'Preparing your personal data archive for download...\')">Download Your Data</button><button class="badge dark-badge" onclick="openFooterPage(\'cookies.html\')">Manage Cookies</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-database"></i></div>
                    <h4>What Data We Collect</h4>
                    <p>Information you provide when signing up, songs you stream, playlists you curate, and technical device diagnostics.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                    <h4>How We Use Your Data</h4>
                    <p>Powering personalized audio recommendations like Discover Weekly, Daily Mix, and connecting you with beloved artists.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-fingerprint"></i></div>
                    <h4>Your Global Privacy Rights</h4>
                    <p>Full compliance with GDPR, CCPA, and global data privacy standards, granting you the right to access, edit, or delete your data.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-lock"></i></div>
                    <h4>Third-Party Sharing Controls</h4>
                    <p>Strict boundaries preventing unauthorized sale of personal data, with optional toggles for ad personalization.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'cookies.html',
        title: 'Spotify - Cookies & Local Storage',
        badge: 'TRACKING & STORAGE',
        heroClass: 'hero-orange',
        heroTitle: 'Cookies and Local Storage on Spotify.',
        heroSub: 'Understand how we use cookies, local caching, and tracking technologies to optimize performance, remember your preferences, and keep you logged in.',
        actions: '<button class="badge" onclick="alert(\'All essential and performance cookies active.\')">Accept All Cookies</button><button class="badge dark-badge" onclick="alert(\'Cookie preferences saved.\')">Save Preferences</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-cookie-bite"></i></div>
                    <h4>Strictly Necessary Cookies</h4>
                    <p>Essential for basic platform functionality: maintaining active user sessions, secure authentication, and Web Audio streaming.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-chart-pie"></i></div>
                    <h4>Performance & Analytics</h4>
                    <p>Anonymous metrics on loading speeds, crash diagnostics, and audio buffer latency to ensure smooth uninterrupted playback.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-sliders"></i></div>
                    <h4>Functional Storage</h4>
                    <p>Locally caches your volume sliders, repeat/shuffle toggles, created playlists, and UI theme preferences.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-bullhorn"></i></div>
                    <h4>Targeting & Advertising</h4>
                    <p>Helps deliver relevant advertisements to Free tier listeners. Can be customized or disabled via Ad Settings.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'about-ads.html',
        title: 'Spotify - About Our Ads',
        badge: 'ADVERTISING CHOICES',
        heroClass: 'hero-pink',
        heroTitle: 'Your choices regarding Spotify ads.',
        heroSub: 'Advertising keeps Spotify free for millions of listeners around the world. Discover how audio and display ads work, and how to manage your ad preferences.',
        actions: '<button class="badge" onclick="openFooterPage(\'premium-standard.html\')">Go Ad-Free with Premium</button><button class="badge dark-badge" onclick="alert(\'Personalized ad preferences updated.\')">Opt Out of Tailored Ads</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-rectangle-ad"></i></div>
                    <h4>Why Free Spotify Has Ads</h4>
                    <p>Sponsored advertisements fund music royalties paid directly to songwriters, artists, and independent rights holders.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-user-gear"></i></div>
                    <h4>Tailored Advertising Controls</h4>
                    <p>Choose whether advertisements are personalized based on your general listening genres, interests, or location.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-volume-high"></i></div>
                    <h4>Audio Ad Frequency Caps</h4>
                    <p>Strict caps guarantee that commercial breaks never exceed standard duration limits between your favorite songs.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-gem"></i></div>
                    <h4>100% Ad-Free with Premium</h4>
                    <p>Upgrade to Spotify Premium to instantly eliminate all audio, banner, and sponsored interruptions permanently.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'accessibility.html',
        title: 'Spotify - Accessibility',
        badge: 'INCLUSION & ACCESS',
        heroClass: 'hero-teal',
        heroTitle: 'Music and audio for every listener.',
        heroSub: 'We are committed to making Spotify accessible for people with diverse auditory, visual, motor, and cognitive abilities.',
        actions: '<button class="badge" onclick="alert(\'High Contrast mode toggled for current session!\')">Toggle High Contrast</button><button class="badge dark-badge" onclick="openFooterPage(\'support.html\')">Contact Accessibility Support</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-universal-access"></i></div>
                    <h4>Screen Readers & ARIA</h4>
                    <p>Full support for NVDA, JAWS, VoiceOver, and TalkBack with comprehensive ARIA labels and logical focus order.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-keyboard"></i></div>
                    <h4>Keyboard Navigation</h4>
                    <p>Navigate playlists, trigger playback, adjust volume, and search using standard keyboard shortcuts (Space, Tab, Arrows).</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-closed-captioning"></i></div>
                    <h4>Synchronized Live Lyrics</h4>
                    <p>Time-aligned scrolling lyrics and podcast transcription provide visual accessibility for deaf and hard-of-hearing fans.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-circle-half-stroke"></i></div>
                    <h4>High Contrast & Reduced Motion</h4>
                    <p>Complies with WCAG 2.1 AA contrast ratios, text resizing up to 200%, and respects prefers-reduced-motion settings.</p>
                </div>
            </div>
        `
    }
];


/**
 * Spotify Clone - Single Page Application Controller
 * Handles routing, search, library, playlists, podcasts, premium, profile, music screen, and audio player
 */







function runApp() {
    // =========================================================================
    // STATE
    // =========================================================================
    let currentPage = "home";
    const pageHistory = ["home"];
    let historyIndex = 0;
    let authModule = null;
    let musicModule = null;

    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let repeatMode = "off";
    let currentTime = 0;
    let volume = 0.75;
    let isMuted = false;
    let prevVolume = 0.75;
    let likedSongs = new Set();
    let tickerInterval = null;

    let userPlaylists = []; // { id, name, desc, songs:[] }
    let playlistIdCounter = 1;
    let viewingPlaylistId = null;

    // Load persisted state from localStorage for multi-page continuity
    try {
        const savedTrack = localStorage.getItem("spotify_currentTrack");
        if (savedTrack !== null) currentTrackIndex = parseInt(savedTrack, 10) || 0;
        const savedLikes = localStorage.getItem("spotify_likedSongs");
        if (savedLikes) likedSongs = new Set(JSON.parse(savedLikes));
        const savedPlaylists = localStorage.getItem("spotify_userPlaylists");
        if (savedPlaylists) {
            userPlaylists = JSON.parse(savedPlaylists);
            if (userPlaylists.length > 0) {
                playlistIdCounter = Math.max(...userPlaylists.map(p => p.id)) + 1;
            }
        }
        const savedVol = localStorage.getItem("spotify_volume");
        if (savedVol !== null) volume = parseFloat(savedVol) || 0.75;
    } catch (e) {}

    // Async sync with Node.js/Express REST API if online
    if (typeof spotifyApi !== "undefined") {
        spotifyApi.checkHealth().then(isOnline => {
            if (isOnline) {
                // Sync tracks catalog from REST API
                spotifyApi.getTracks().then(res => {
                    if (res && res.data && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
                        res.data.tracks.forEach(serverTrack => {
                            const local = playlist.find(t => String(t.id) === String(serverTrack.id));
                            if (local) {
                                Object.assign(local, serverTrack);
                            } else {
                                playlist.push(serverTrack);
                            }
                        });
                    }
                }).catch(() => {});

                // Sync user likes from REST API
                spotifyApi.getLikes().then(res => {
                    if (res && res.data && Array.isArray(res.data.likes)) {
                        res.data.likes.forEach(id => likedSongs.add(id));
                        if (typeof updateLikeIcon === "function") updateLikeIcon();
                    }
                }).catch(() => {});

                // Sync user playlists from REST API
                spotifyApi.getPlaylists().then(res => {
                    if (res && res.data && Array.isArray(res.data.playlists) && res.data.playlists.length > 0) {
                        const existingNames = new Set(userPlaylists.map(p => p.name));
                        res.data.playlists.forEach(pl => {
                            if (!existingNames.has(pl.name)) {
                                userPlaylists.push({
                                    id: pl.id,
                                    name: pl.name,
                                    desc: pl.description || "",
                                    songs: pl.tracks || []
                                });
                            }
                        });
                        if (typeof renderSidebarPlaylists === "function") renderSidebarPlaylists();
                        if (profileModule && typeof profileModule.updatePlaylists === "function") profileModule.updatePlaylists(userPlaylists);
                    }
                }).catch(() => {});
            }
        }).catch(() => {});
    }

    // =========================================================================
    // AUDIO ENGINE (HTML5 Audio + Web Audio Spectrum Analyser)
    // =========================================================================
    let audioCtx = null;
    let masterGain = null;
    let analyserNode = null;
    let audioElement = null;
    let audioSourceNode = null;
    let synthTimer = null;
    let chordIdx = 0;
    let isBuffering = false;

    function initAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                masterGain = audioCtx.createGain();
                masterGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.3, audioCtx.currentTime);

                // Audio Spectrum Analyser Node
                analyserNode = audioCtx.createAnalyser();
                analyserNode.fftSize = 128;
                analyserNode.smoothingTimeConstant = 0.82;

                masterGain.connect(analyserNode);
                analyserNode.connect(audioCtx.destination);

                if (musicModule && musicModule.setAnalyser) {
                    musicModule.setAnalyser(analyserNode);
                }
            } catch (e) {
                console.warn("AudioContext init warning:", e);
            }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }

        if (!audioElement) {
            audioElement = new Audio();
            audioElement.preload = "auto";
            audioElement.volume = isMuted ? 0 : volume;

            // Audio Element Events
            audioElement.addEventListener("play", () => {
                isPlaying = true;
                isBuffering = false;
                playPauseIcon.className = "fa-solid fa-pause";
                playPauseBtn.classList.add("playing");
                if (musicModule) musicModule.updatePlayState(true);
            });

            audioElement.addEventListener("pause", () => {
                if (!isBuffering) {
                    isPlaying = false;
                    playPauseIcon.className = "fa-solid fa-play";
                    playPauseBtn.classList.remove("playing");
                    if (musicModule) musicModule.updatePlayState(false);
                }
            });

            audioElement.addEventListener("waiting", () => {
                isBuffering = true;
                playPauseIcon.className = "fa-solid fa-circle-notch fa-spin";
            });

            audioElement.addEventListener("playing", () => {
                isBuffering = false;
                isPlaying = true;
                playPauseIcon.className = "fa-solid fa-pause";
                playPauseBtn.classList.add("playing");
                if (musicModule) musicModule.updatePlayState(true);
            });

            audioElement.addEventListener("timeupdate", () => {
                if (!audioElement) return;
                const cur = audioElement.currentTime || 0;
                const dur = (audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration))
                    ? audioElement.duration
                    : (playlist[currentTrackIndex]?.duration || 180);

                currentTime = cur;
                currTimeEl.textContent = fmt(cur);
                const pct = (cur / dur) * 100;
                progressBar.value = isFinite(pct) ? pct : 0;
                updateSliderBg(progressBar, progressBar.value);

                const t = playlist[currentTrackIndex];
                if (musicModule && t) {
                    musicModule.syncLyricsWithTime(cur, dur, t.lyrics ? t.lyrics.length : 0);
                }
            });

            audioElement.addEventListener("durationchange", () => {
                if (audioElement && audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration)) {
                    totTimeEl.textContent = fmt(audioElement.duration);
                    if (playlist[currentTrackIndex]) {
                        playlist[currentTrackIndex].duration = Math.round(audioElement.duration);
                    }
                }
            });

            audioElement.addEventListener("ended", () => {
                if (repeatMode === "one") {
                    audioElement.currentTime = 0;
                    audioElement.play().catch(() => {});
                } else if (repeatMode === "all" || isShuffle || currentTrackIndex < playlist.length - 1) {
                    nextTrack();
                } else {
                    pauseTrack();
                    audioElement.currentTime = 0;
                    progressBar.value = 0;
                    currTimeEl.textContent = "0:00";
                    updateSliderBg(progressBar, 0);
                }
            });

            audioElement.addEventListener("error", (e) => {
                console.warn("Audio element stream notice, falling back to local audio synthesis:", e);
                isBuffering = false;
                startSynth();
                startProgress();
            });
        }
    }

    function playChord(notes, dur = 1.5) {
        if (!audioCtx || !isPlaying) return;
        const now = audioCtx.currentTime;
        notes.forEach((f, i) => {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            const flt = audioCtx.createBiquadFilter();
            osc.type = i === 0 ? "triangle" : "sine";
            osc.frequency.setValueAtTime(f, now);
            flt.type = "lowpass";
            flt.frequency.setValueAtTime(800 + i * 250, now);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(0.1 / notes.length, now + 0.12);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            osc.connect(flt);
            flt.connect(g);
            g.connect(masterGain);
            osc.start(now);
            osc.stop(now + dur + 0.05);
        });
        // Kick
        const kick = audioCtx.createOscillator();
        const kg = audioCtx.createGain();
        kick.frequency.setValueAtTime(120, now);
        kick.frequency.exponentialRampToValueAtTime(35, now + 0.12);
        kg.gain.setValueAtTime(0.06, now);
        kg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        kick.connect(kg);
        kg.connect(masterGain);
        kick.start(now);
        kick.stop(now + 0.15);
    }

    function startSynth() {
        stopSynth();
        initAudio();
        const t = playlist[currentTrackIndex];
        const step = (60 / t.tempo) * 2 * 1000;
        const loop = () => {
            if (!isPlaying) return;
            const chords = t.chords || [[t.rootFreq, t.rootFreq * 1.25, t.rootFreq * 1.5]];
            playChord(chords[chordIdx % chords.length], (step / 1000) * 0.9);
            chordIdx++;
            synthTimer = setTimeout(loop, step);
        };
        loop();
    }

    function stopSynth() {
        if (synthTimer) { clearTimeout(synthTimer); synthTimer = null; }
    }

    // =========================================================================
    // DOM REFS
    // =========================================================================
    const $ = (s) => document.getElementById(s);
    const $$ = (s) => document.querySelectorAll(s);

    const mainContent = $("mainContent");
    const searchBar = $("searchBar");
    const searchInput = $("searchInput");
    const clearSearchBtn = $("clearSearchBtn");
    const navBackBtn = $("navBackBtn");
    const navForwardBtn = $("navForwardBtn");

    const albumArt = $("albumArt");
    const trackTitle = $("trackTitle");
    const trackArtist = $("trackArtist");
    const likeBtn = $("likeBtn");
    const playPauseBtn = $("playPauseBtn");
    const playPauseIcon = $("playPauseIcon");
    const prevBtn = $("prevBtn");
    const nextBtn = $("nextBtn");
    const shuffleBtn = $("shuffleBtn");
    const repeatBtn = $("repeatBtn");
    const currTimeEl = $("currTime");
    const totTimeEl = $("totTime");
    const progressBar = $("progressBar");
    const volumeIcon = $("volumeIcon");
    const volumeBar = $("volumeBar");
    const toastContainer = $("toastContainer");
    const playerAlbumSection = $("playerAlbumSection");

    // =========================================================================
    // UTILITIES
    // =========================================================================
    function fmt(s) {
        s = Math.floor(s || 0);
        return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
    }

    function toast(msg, icon = "fa-circle-check") {
        const t = document.createElement("div");
        t.className = "toast";
        t.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
        toastContainer.appendChild(t);
        setTimeout(() => { if (t.parentNode) t.remove(); }, 2800);
    }

    function updateSliderBg(el, pct) {
        if (!el) return;
        el.style.background = `linear-gradient(to right,#1ed760 0%,#1ed760 ${pct}%,#4d4d4d ${pct}%,#4d4d4d 100%)`;
    }

    // =========================================================================
    // ROUTER - Show/hide pages or navigate between separate files
    // =========================================================================
    function navigate(page, pushHistory = true) {
        if (page && page.startsWith("info:")) {
            const cleanName = page.split(":")[1];
            openFooterPage(cleanName, pushHistory);
            return;
        }

        const targetId = "page" + page.charAt(0).toUpperCase() + page.slice(1);
        const el = $(targetId);

        if (el) {
            $$(".page").forEach(p => p.style.display = "none");
            el.style.display = "block";

            // Clear any active footer links when navigating to core pages
            $$(".footer-link").forEach(l => l.classList.remove("active-footer-link"));

            // Search bar visibility
            if (searchBar) searchBar.style.display = page === "search" ? "flex" : "none";

            // Update sidebar active state
            $$(".nav-option").forEach(n => n.classList.remove("active-nav"));
            if (page === "home" && $("navHome")) $("navHome").classList.add("active-nav");
            else if (page === "search" && $("navSearch")) $("navSearch").classList.add("active-nav");
            else if (page === "library" && $("navLibrary")) $("navLibrary").classList.add("active-nav");

            currentPage = page;
            if (pushHistory) {
                pageHistory.splice(historyIndex + 1);
                pageHistory.push(page);
                historyIndex = pageHistory.length - 1;
            }
            updateNavButtons();
            mainContent.scrollTop = 0;

            if (page === "music" && musicModule && musicModule.resizeVisualizer) {
                setTimeout(() => musicModule.resizeVisualizer(), 40);
            }
        } else {
            // Multi-page navigation fallback to separated screen HTML files
            const pageFileMap = {
                home: "index.html",
                search: "search.html",
                library: "library.html",
                createPlaylist: "create-playlist.html",
                podcasts: "podcasts.html",
                premium: "premium.html",
                profile: "profile.html",
                music: "music.html",
                auth: "auth.html",
                about: "about.html",
                jobs: "jobs.html",
                forTheRecord: "for-the-record.html",
                forArtists: "for-artists.html",
                forCreators: "for-creators.html",
                forAuthors: "for-authors.html",
                developers: "developers.html",
                advertising: "advertising.html",
                investors: "investors.html",
                vendors: "vendors.html",
                support: "support.html",
                freeMobileApp: "free-mobile-app.html",
                popularByCountry: "popular-by-country.html",
                topSongLyrics: "top-song-lyrics.html",
                importYourMusic: "import-your-music.html",
                premiumStandard: "premium-standard.html",
                premiumPlatinum: "premium-platinum.html",
                premiumStudent: "premium-student.html",
                spotifyFree: "spotify-free.html",
                legal: "legal.html",
                "safety-privacy-center": "safety-privacy-center.html",
                safetyPrivacyCenter: "safety-privacy-center.html",
                "privacy-policy": "privacy-policy.html",
                privacyPolicy: "privacy-policy.html",
                cookies: "cookies.html",
                "about-ads": "about-ads.html",
                aboutAds: "about-ads.html",
                accessibility: "accessibility.html"
            };
            if (pageFileMap[page]) {
                const target = pageFileMap[page];
                if (window.location.protocol.startsWith("http")) {
                    if (window.location.pathname.startsWith("/html/")) {
                        window.location.href = "/html/" + target;
                    } else {
                        const routeTarget = page === "home" ? "/" : (page === "createPlaylist" ? "/library" : "/" + page);
                        window.location.href = routeTarget;
                    }
                } else {
                    if (window.location.pathname.includes("/html/")) {
                        window.location.href = target;
                    } else {
                        window.location.href = "html/" + target;
                    }
                }
            }
        }
    }

    function updateNavButtons() {
        if (navBackBtn) {
            navBackBtn.disabled = historyIndex <= 0;
            navBackBtn.style.opacity = historyIndex <= 0 ? "0.4" : "1";
        }
        if (navForwardBtn) {
            navForwardBtn.disabled = historyIndex >= pageHistory.length - 1;
            navForwardBtn.style.opacity = historyIndex >= pageHistory.length - 1 ? "0.4" : "1";
        }
    }

    if (navBackBtn) {
        navBackBtn.addEventListener("click", () => {
            if (historyIndex > 0) { historyIndex--; navigate(pageHistory[historyIndex], false); }
        });
    }
    if (navForwardBtn) {
        navForwardBtn.addEventListener("click", () => {
            if (historyIndex < pageHistory.length - 1) { historyIndex++; navigate(pageHistory[historyIndex], false); }
        });
    }

    // =========================================================================
    // TOP NAV ACTIONS & DROPDOWN MENU
    // =========================================================================
    if ($("navHome")) $("navHome").addEventListener("click", () => navigate("home"));
    if ($("navSearch")) $("navSearch").addEventListener("click", () => {
        navigate("search");
        if (searchInput) setTimeout(() => searchInput.focus(), 50);
    });
    if ($("navLibrary")) $("navLibrary").addEventListener("click", () => {
        navigate("library");
        renderLibrary();
    });

    const navPremiumBtn = $("navPremiumBtn");
    if (navPremiumBtn) {
        navPremiumBtn.addEventListener("click", () => navigate("premium"));
    }

    const navInstallBtn = $("navInstallBtn");
    if (navInstallBtn) {
        navInstallBtn.addEventListener("click", () => {
            toast("Downloading Spotify for Desktop...", "fa-circle-down");
        });
    }

    // =========================================================================
    // FOOTER PAGES NAVIGATION (JS & CSS DYNAMIC LOADER + STANDALONE COMPATIBILITY)
    // =========================================================================
    function openFooterPage(filename, pushHistory = true) {
        if (!filename) return;
        const cleanName = filename.split("/").pop().toLowerCase();

        // Persist audio state before page navigation
        try {
            localStorage.setItem("spotify_currentTrack", currentTrackIndex);
            localStorage.setItem("spotify_currentTime", currentTime);
            localStorage.setItem("spotify_volume", volume);
            localStorage.setItem("spotify_isPlaying", isPlaying ? "true" : "false");
        } catch (e) {}

        const pageInfoContainer = $("pageInfo");
        // If in-page container exists (e.g. index.html) and data is loaded, render dynamically without audio interruption
        if (pageInfoContainer && typeof FOOTER_PAGES_DATA !== "undefined") {
            const pageData = FOOTER_PAGES_DATA.find(p => p.filename.toLowerCase() === cleanName);
            if (pageData) {
                pageInfoContainer.innerHTML = `
                    <div class="info-page-container">
                        <div class="info-hero ${pageData.heroClass}">
                            <button class="info-back-link" id="inPageBackBtn" type="button"><i class="fa-solid fa-arrow-left"></i> Back to Home</button>
                            <span class="info-badge">${pageData.badge}</span>
                            <h1 class="info-title">${pageData.heroTitle}</h1>
                            <p class="info-sub">${pageData.heroSub}</p>
                            <div class="info-actions">
                                ${pageData.actions}
                            </div>
                        </div>
                        ${pageData.content}
                    </div>
                `;

                // Wire up back button to return to home
                const inPageBackBtn = $("inPageBackBtn");
                if (inPageBackBtn) {
                    inPageBackBtn.addEventListener("click", () => navigate("home"));
                }

                // Show pageInfo, hide other pages
                $$(".page").forEach(p => p.style.display = "none");
                pageInfoContainer.style.display = "block";
                if (searchBar) searchBar.style.display = "none";
                $$(".nav-option").forEach(n => n.classList.remove("active-nav"));

                // Highlight active link in the footer and sidebar
                $$(".footer-link, .sidebar-legal-link").forEach(l => {
                    const lHref = (l.getAttribute("href") || "").split("/").pop().toLowerCase();
                    l.classList.toggle("active-footer-link", lHref === cleanName);
                });

                currentPage = "info";
                if (pushHistory) {
                    pageHistory.splice(historyIndex + 1);
                    pageHistory.push("info:" + cleanName);
                    historyIndex = pageHistory.length - 1;
                }
                updateNavButtons();
                mainContent.scrollTop = 0;
                return;
            }
        }

        // Standalone navigation fallback: open dedicated HTML file
        window.location.href = cleanName;
    }

    // Expose globally for button clicks
    window.openFooterPage = openFooterPage;

    // Attach click listeners to all footer and sidebar legal links across the document
    $$(".footer-link, .sidebar-legal-link").forEach(link => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (href && href !== "#" && !href.startsWith("javascript:")) {
                e.preventDefault();
                openFooterPage(href);
            }
        });
    });

    // =========================================================================
    // SIDEBAR LANGUAGE SELECTOR MODAL
    // =========================================================================
    const sidebarLangBtn = $("sidebarLangBtn");
    const langModalOverlay = $("langModalOverlay");
    const closeLangModalBtn = $("closeLangModalBtn");
    const sidebarLangLabel = $("sidebarLangLabel");

    // Load saved language preference
    try {
        const savedLang = localStorage.getItem("spotify_language");
        if (savedLang && sidebarLangLabel) {
            sidebarLangLabel.textContent = savedLang;
            $$(".lang-item").forEach(item => {
                item.classList.toggle("active-lang", item.dataset.lang === savedLang);
            });
        }
    } catch (e) {}

    if (sidebarLangBtn && langModalOverlay) {
        sidebarLangBtn.addEventListener("click", () => {
            langModalOverlay.style.display = "flex";
        });
    }

    if (closeLangModalBtn && langModalOverlay) {
        closeLangModalBtn.addEventListener("click", () => {
            langModalOverlay.style.display = "none";
        });
    }

    if (langModalOverlay) {
        langModalOverlay.addEventListener("click", (e) => {
            if (e.target === langModalOverlay) {
                langModalOverlay.style.display = "none";
            }
        });
    }

    $$(".lang-item").forEach(item => {
        item.addEventListener("click", () => {
            const selectedLang = item.dataset.lang;
            if (selectedLang) {
                if (sidebarLangLabel) sidebarLangLabel.textContent = selectedLang;
                $$(".lang-item").forEach(btn => btn.classList.remove("active-lang"));
                item.classList.add("active-lang");
                try {
                    localStorage.setItem("spotify_language", selectedLang);
                } catch (e) {}
                if (langModalOverlay) langModalOverlay.style.display = "none";
                toast(`Language updated to ${selectedLang}`, "fa-globe");
            }
        });
    });

    // =========================================================================
    // RIGHT SLIDING SIDEBAR (COLLAPSED RAIL & EXPANDED PANEL - MATCHING SCREENSHOTS)
    // =========================================================================
    const rightSidebar = $("rightSidebar");
    const rightSidebarRail = $("rightSidebarRail");
    const railExpandBtn = $("railExpandBtn");
    const rightSidebarSlideSash = $("rightSidebarSlideSash");
    const closeRightSidebarBtn = $("closeRightSidebarBtn");
    const rightSidebarSearchBtn = $("rightSidebarSearchBtn");
    const rightSidebarEmpty = $("rightSidebarEmpty");
    const rightSidebarContent = $("rightSidebarContent");
    const rightSidebarCover = $("rightSidebarCover");
    const rightSidebarTrackTitle = $("rightSidebarTrackTitle");
    const rightSidebarTrackArtist = $("rightSidebarTrackArtist");
    const rightSidebarArtistImg = $("rightSidebarArtistImg");
    const rightSidebarArtistName = $("rightSidebarArtistName");
    const rightSidebarNextImg = $("rightSidebarNextImg");
    const rightSidebarNextName = $("rightSidebarNextName");
    const rightSidebarNextArtist = $("rightSidebarNextArtist");
    const rightSidebarLikeBtn = $("rightSidebarLikeBtn");
    const rightSidebarFollowBtn = $("rightSidebarFollowBtn");
    const rightSidebarOpenQueueBtn = $("rightSidebarOpenQueueBtn");

    let isRightSidebarOpen = false; // Default to sleek collapsed rail matching screenshot
    try {
        const savedSidebar = localStorage.getItem("spotify_rightSidebarOpen");
        if (savedSidebar !== null) isRightSidebarOpen = savedSidebar === "true";
    } catch (e) {}

    function setRightSidebarState(open) {
        isRightSidebarOpen = open;
        if (rightSidebar) {
            rightSidebar.classList.toggle("collapsed", !open);
            rightSidebar.style.width = ""; // clear inline dragging width
        }
        try {
            localStorage.setItem("spotify_rightSidebarOpen", open ? "true" : "false");
        } catch (e) {}
    }

    // Expand when clicking the collapsed rail or chevron button (Screenshot 2 -> Screenshot 1)
    if (railExpandBtn) {
        railExpandBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            setRightSidebarState(true);
        });
    }
    if (rightSidebarRail) {
        rightSidebarRail.addEventListener("click", () => setRightSidebarState(true));
    }

    // Collapse back to sleek rail (Screenshot 1 -> Screenshot 2)
    if (closeRightSidebarBtn) {
        closeRightSidebarBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            setRightSidebarState(false);
        });
    }

    // Global delegated listener for right sidebar toggle actions
    document.addEventListener("click", (e) => {
        if (e.target.closest("#railExpandBtn") || e.target.closest(".rail-expand-btn")) {
            e.stopPropagation();
            setRightSidebarState(true);
        } else if (e.target.closest("#closeRightSidebarBtn") || e.target.closest(".right-sidebar-icon-btn") || e.target.closest("#rightSidebarCollapseBtn")) {
            e.stopPropagation();
            setRightSidebarState(false);
        } else if (e.target.closest("#rightSidebarRail") && !e.target.closest(".right-sidebar-expanded-content")) {
            const sb = $("rightSidebar");
            if (sb && sb.classList.contains("collapsed")) {
                setRightSidebarState(true);
            }
        }
    });

    // Drag-to-Slide interactive gesture mechanics
    let isDraggingSlide = false;

    function startSlideDrag(e) {
        isDraggingSlide = true;
        if (rightSidebar) {
            rightSidebar.classList.remove("collapsed");
            rightSidebar.classList.add("no-transition", "dragging");
        }
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        window.addEventListener("mousemove", onSlideDragMove);
        window.addEventListener("mouseup", endSlideDrag);
        window.addEventListener("touchmove", onSlideDragMove);
        window.addEventListener("touchend", endSlideDrag);
    }

    function onSlideDragMove(e) {
        if (!isDraggingSlide || !rightSidebar) return;
        const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const windowWidth = window.innerWidth;
        const newWidth = Math.max(48, Math.min(520, windowWidth - currentX - 8));
        rightSidebar.style.width = newWidth + "px";
    }

    function endSlideDrag(e) {
        if (!isDraggingSlide) return;
        isDraggingSlide = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        window.removeEventListener("mousemove", onSlideDragMove);
        window.removeEventListener("mouseup", endSlideDrag);
        window.removeEventListener("touchmove", onSlideDragMove);
        window.removeEventListener("touchend", endSlideDrag);

        if (rightSidebar) {
            rightSidebar.classList.remove("no-transition", "dragging");
            const finalWidth = rightSidebar.offsetWidth;
            if (finalWidth >= 140) {
                setRightSidebarState(true);
            } else {
                setRightSidebarState(false);
            }
        }
    }

    // Drag from collapsed rail or from left sash
    if (rightSidebarRail) {
        rightSidebarRail.addEventListener("mousedown", startSlideDrag);
        rightSidebarRail.addEventListener("touchstart", startSlideDrag, { passive: true });
    }

    if (rightSidebarSlideSash) {
        rightSidebarSlideSash.addEventListener("mousedown", startSlideDrag);
        rightSidebarSlideSash.addEventListener("touchstart", startSlideDrag, { passive: true });
    }

    if (rightSidebarSearchBtn) {
        rightSidebarSearchBtn.addEventListener("click", () => {
            navigate("search");
            setTimeout(() => {
                const sInput = $("searchInput");
                if (sInput) sInput.focus();
            }, 60);
        });
    }

    if (rightSidebarOpenQueueBtn) {
        rightSidebarOpenQueueBtn.addEventListener("click", () => {
            navigate("music");
            toast("Now viewing full music & queue", "fa-bars-staggered");
        });
    }

    if (rightSidebarLikeBtn) {
        rightSidebarLikeBtn.addEventListener("click", () => toggleLike());
    }

    if (rightSidebarFollowBtn) {
        rightSidebarFollowBtn.addEventListener("click", () => {
            const isFollowing = rightSidebarFollowBtn.classList.contains("following");
            rightSidebarFollowBtn.classList.toggle("following", !isFollowing);
            rightSidebarFollowBtn.textContent = !isFollowing ? "Following" : "Follow";
            toast(!isFollowing ? "Added artist to your Library" : "Removed artist from Library", "fa-user-check");
        });
    }

    function updateRightSidebar(track, nextTrack) {
        const emptyEl = $("rightSidebarEmpty") || $("rightSidebarEmptyState");
        const contentEl = $("rightSidebarContent") || $("rightSidebarPlayingContent");

        if (!track) {
            if (emptyEl) emptyEl.style.display = "flex";
            if (contentEl) contentEl.style.display = "none";
            return;
        }

        // Show active content if a track is playing
        if (emptyEl) emptyEl.style.display = "none";
        if (contentEl) contentEl.style.display = "flex";

        const defaultCover = "/assesst/card1img.jpeg";
        const defaultNext = "/assesst/card2img.jpeg";
        const coverEl = $("rightSidebarCover") || $("rightSidebarArt");
        const titleEl = $("rightSidebarTrackTitle") || $("rightSidebarTrackName");
        const artistEl = $("rightSidebarTrackArtist");
        const artistImgEl = $("rightSidebarArtistImg");
        const artistNameEl = $("rightSidebarArtistName");
        const likeBtnEl = $("rightSidebarLikeBtn");

        if (coverEl) coverEl.src = track.img || defaultCover;
        if (titleEl) titleEl.textContent = track.title || "Unknown Track";
        if (artistEl) artistEl.textContent = track.artist || "Unknown Artist";
        if (artistImgEl) artistImgEl.src = track.img || defaultCover;
        if (artistNameEl) artistNameEl.textContent = track.artist || "Artist";

        if (likeBtnEl) {
            const isLiked = likedSongs.has(track.id);
            likeBtnEl.className = isLiked ? "fa-solid fa-heart now-playing-like-btn liked" : "fa-regular fa-heart now-playing-like-btn";
        }

        if (nextTrack) {
            const nextImgEl = $("rightSidebarNextImg");
            const nextNameEl = $("rightSidebarNextName");
            const nextArtistEl = $("rightSidebarNextArtist");
            if (nextImgEl) nextImgEl.src = nextTrack.img || defaultNext;
            if (nextNameEl) nextNameEl.textContent = nextTrack.title || "";
            if (nextArtistEl) nextArtistEl.textContent = nextTrack.artist || "";
        }
    }

    setRightSidebarState(isRightSidebarOpen);

    // Top Navigation Auth Buttons (Sign up / Log in)
    const navSignUpBtn = $("navSignUpBtn");
    const navLoginBtn = $("navLoginBtn");
    if (navSignUpBtn) {
        navSignUpBtn.addEventListener("click", (e) => {
            if ($("pageAuth")) {
                e.preventDefault();
                if (authModule) authModule.switchTab("register");
                navigate("auth");
            }
        });
    }
    if (navLoginBtn) {
        navLoginBtn.addEventListener("click", (e) => {
            if ($("pageAuth")) {
                e.preventDefault();
                if (authModule) authModule.switchTab("login");
                navigate("auth");
            }
        });
    }

    const userBtn = $("navUserBtn");
    const profileDropdown = $("profileDropdown");

    if (userBtn && profileDropdown) {
        userBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = profileDropdown.style.display === "block";
            profileDropdown.style.display = isOpen ? "none" : "block";
        });

        const dropdownProfile = $("dropdownProfileItem") || $("dropdownProfileBtn");
        if (dropdownProfile) {
            dropdownProfile.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                navigate("profile");
            });
        }

        const dropdownAuthItem = $("dropdownAuthItem");
        if (dropdownAuthItem) {
            dropdownAuthItem.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                if (authModule) authModule.switchTab("login");
                navigate("auth");
            });
        }

        const dropdownPremium = $("dropdownPremiumItem") || $("dropdownUpgradeBtn");
        if (dropdownPremium) {
            dropdownPremium.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                navigate("premium");
            });
        }

        const dropdownSettings = $("dropdownSettingsItem") || $("dropdownSettingsBtn");
        if (dropdownSettings) {
            dropdownSettings.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                navigate("profile");
                const settingsTab = document.querySelector('.profile-nav-tab[data-target="profileTabSettings"]');
                if (settingsTab) settingsTab.click();
            });
        }

        const dropdownLogout = $("dropdownLogoutItem") || $("dropdownLogoutBtn");
        if (dropdownLogout) {
            dropdownLogout.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                if (authModule) {
                    authModule.logout();
                } else {
                    toast("Logged out of Spotify session", "fa-arrow-right-from-bracket");
                }
            });
        }

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".profile-nav-wrapper")) {
                profileDropdown.style.display = "none";
            }
        });
    }

    // =========================================================================
    // MUSIC SCREEN & PLAYER ALBUM CLICK
    // =========================================================================
    musicModule = initMusicModule({
        getAnalyser: () => analyserNode,
        getAudioTime: () => (audioElement ? audioElement.currentTime : currentTime),
        getAudioVolume: () => (isMuted ? 0 : volume),
        getCurrentTrack: () => (playlist && playlist[currentTrackIndex] ? playlist[currentTrackIndex] : null),
        getIsPlaying: () => isPlaying
    });

    // Clicking the bottom player album section opens the Music screen
    if (playerAlbumSection) {
        playerAlbumSection.addEventListener("click", (e) => {
            if (e.target.closest("#likeBtn")) return; // Don't trigger if user just clicked like
            navigate("music");
        });
    }

    // Music Screen Back button
    const musicBackBtn = $("musicBackBtn");
    if (musicBackBtn) {
        musicBackBtn.addEventListener("click", () => {
            if (historyIndex > 0) {
                historyIndex--;
                navigate(pageHistory[historyIndex], false);
            } else {
                navigate("home");
            }
        });
    }

    // Music Screen Play button
    const musicPagePlayBtn = $("musicPagePlayBtn");
    if (musicPagePlayBtn) {
        musicPagePlayBtn.addEventListener("click", () => {
            togglePlay();
        });
    }

    // Music Screen Like button
    const musicPageLikeBtn = $("musicPageLikeBtn");
    if (musicPageLikeBtn) {
        musicPageLikeBtn.addEventListener("click", () => {
            likeBtn.click();
            musicModule.updateLikeState(likedSongs.has(playlist[currentTrackIndex].id));
        });
    }

    // Music Screen Share button
    const musicPageShareBtn = $("musicPageShareBtn");
    if (musicPageShareBtn) {
        musicPageShareBtn.addEventListener("click", () => {
            const t = playlist[currentTrackIndex];
            const dummyLink = `https://open.spotify.com/track/${t.id}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(dummyLink).catch(() => {});
            }
            toast(`Link for "${t.title}" copied to clipboard!`, "fa-share-nodes");
        });
    }

    // Music Screen Add to Playlist button
    const musicPageAddToPlaylistBtn = $("musicPageAddToPlaylistBtn");
    if (musicPageAddToPlaylistBtn) {
        musicPageAddToPlaylistBtn.addEventListener("click", () => {
            const t = playlist[currentTrackIndex];
            if (userPlaylists.length === 0) {
                toast("Create a playlist first to add songs!", "fa-circle-plus");
                navigate("createPlaylist");
            } else {
                const targetPl = userPlaylists[userPlaylists.length - 1];
                if (!targetPl.songs.includes(t.id)) {
                    targetPl.songs.push(t.id);
                    renderSidebarPlaylists();
                    if (profileModule) profileModule.updatePlaylists(userPlaylists);
                    toast(`Added "${t.title}" to ${targetPl.name}!`, "fa-circle-check");
                } else {
                    toast(`"${t.title}" is already in ${targetPl.name}`, "fa-info");
                }
            }
        });
    }

    // About Artist Follow button
    const aboutArtistFollowBtn = $("aboutArtistFollowBtn");
    if (aboutArtistFollowBtn) {
        let isFollowingArtist = false;
        aboutArtistFollowBtn.addEventListener("click", () => {
            isFollowingArtist = !isFollowingArtist;
            aboutArtistFollowBtn.textContent = isFollowingArtist ? "Following" : "Follow";
            aboutArtistFollowBtn.className = isFollowingArtist ? "badge follow-artist-btn following-btn" : "badge dark-badge";
            const artistName = $("aboutArtistName") ? $("aboutArtistName").textContent : "Artist";
            toast(isFollowingArtist ? `Now following ${artistName}` : `Unfollowed ${artistName}`, isFollowingArtist ? "fa-user-plus" : "fa-user-minus");
        });
    }

    // =========================================================================
    // HOME PAGE - Render cards
    // =========================================================================
    function createCardHTML(track) {
        const art = track.img || "./assesst/card1img.jpeg";
        return `
        <div class="card" data-song-id="${track.id}">
            <div class="card-img-wrapper">
                <img src="${art}" class="card-img" alt="${track.title}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
            </div>
            <p class="card-title">${track.title}</p>
            <p class="card-info">${track.artist}</p>
        </div>`;
    }

    let homeFeedData = null;

    function renderHome() {
        const recent = $("recentlyPlayedCards");
        const trending = $("trendingCards");
        const featured = $("featuredCards");
        const bollywood = $("bollywoodCards");
        const bollywoodRomance = $("bollywoodRomanceCards");
        const punjabi = $("punjabiCards");
        const electronic = $("electronicCards");
        const chill = $("chillCards");
        const hipHop = $("hipHopCards");

        const getBolly = () => playlist.filter(t => t.category === 'Bollywood' || (t.genre && t.genre.toLowerCase().includes('bollywood')));
        const getRomance = () => playlist.filter(t => t.searchTag && ['Arijit', 'Atif', 'Darshan', 'Tum Hi Ho', 'Kesariya', 'Shreya'].some(s => t.searchTag.includes(s)));
        const getPunjabi = () => playlist.filter(t => t.category === 'Punjabi' || (t.searchTag && ['Diljit', 'AP Dhillon', 'Sidhu', 'Badshah', 'Punjabi'].some(s => t.searchTag.includes(s))));

        if (homeFeedData) {
            if (recent) recent.innerHTML = (homeFeedData.trending || playlist).slice(0, 5).map(createCardHTML).join("");
            if (trending) trending.innerHTML = (homeFeedData.trending || playlist).slice(5, 12).map(createCardHTML).join("");
            if (featured) featured.innerHTML = (homeFeedData.pop || playlist).slice(0, 6).map(createCardHTML).join("");
            if (bollywood) bollywood.innerHTML = (homeFeedData.bollywood && homeFeedData.bollywood.length > 0 ? homeFeedData.bollywood : getBolly()).slice(0, 8).map(createCardHTML).join("");
            if (bollywoodRomance) bollywoodRomance.innerHTML = (homeFeedData.romance && homeFeedData.romance.length > 0 ? homeFeedData.romance : getRomance()).slice(0, 8).map(createCardHTML).join("");
            if (punjabi) punjabi.innerHTML = (homeFeedData.punjabi && homeFeedData.punjabi.length > 0 ? homeFeedData.punjabi : getPunjabi()).slice(0, 8).map(createCardHTML).join("");
            if (electronic) electronic.innerHTML = (homeFeedData.electronic || playlist.filter(t => t.category === 'Electronic')).slice(0, 6).map(createCardHTML).join("");
            if (chill) chill.innerHTML = (homeFeedData.chill || playlist.filter(t => t.category === 'Ambient')).slice(0, 6).map(createCardHTML).join("");
            if (hipHop) hipHop.innerHTML = (homeFeedData.hiphop || playlist.filter(t => t.category === 'Hip-Hop')).slice(0, 6).map(createCardHTML).join("");
        } else {
            if (recent) recent.innerHTML = playlist.slice(0, 5).map(createCardHTML).join("");
            if (trending) trending.innerHTML = playlist.slice(5, 12).map(createCardHTML).join("");
            if (featured) featured.innerHTML = playlist.slice(12, 18).map(createCardHTML).join("");
            if (bollywood) bollywood.innerHTML = getBolly().slice(0, 8).map(createCardHTML).join("");
            if (bollywoodRomance) bollywoodRomance.innerHTML = getRomance().slice(0, 8).map(createCardHTML).join("");
            if (punjabi) punjabi.innerHTML = getPunjabi().slice(0, 8).map(createCardHTML).join("");
            if (electronic) electronic.innerHTML = playlist.filter(t => t.category === 'Electronic' || (t.genre && t.genre.includes('Electronic'))).slice(0, 6).map(createCardHTML).join("");
            if (chill) chill.innerHTML = playlist.filter(t => t.category === 'Ambient' || (t.genre && t.genre.includes('Lo-Fi'))).slice(0, 6).map(createCardHTML).join("");
            if (hipHop) hipHop.innerHTML = playlist.filter(t => t.category === 'Hip-Hop' || (t.genre && t.genre.includes('Trap'))).slice(0, 6).map(createCardHTML).join("");
        }
        bindCardClicks();
    }

    // Clicking ANY song card loads the track, plays it, AND opens the Music page
    function bindCardClicks() {
        $$(".card:not(.playlist-card):not(.podcast-show-card)").forEach(card => {
            card.style.cursor = "pointer";
        });
    }

    // Global delegated click handler for song cards (works on both static SSR & dynamic DOM)
    document.addEventListener("click", (e) => {
        const card = e.target.closest(".card:not(.playlist-card):not(.podcast-show-card)");
        if (!card) return;
        const songId = card.dataset.songId;
        let idx = -1;
        if (songId) {
            idx = playlist.findIndex(t => String(t.id) === String(songId));
        }
        if (idx === -1) {
            const titleEl = card.querySelector(".card-title");
            if (titleEl) {
                const titleText = titleEl.textContent.trim().toLowerCase();
                idx = playlist.findIndex(t => t.title && t.title.trim().toLowerCase() === titleText);
            }
        }
        if (idx !== -1) {
            loadTrack(idx, true);
            navigate("music");
        }
    });

    // =========================================================================
    // SEARCH PAGE (SPOTIFY EXACT BROWSE ALL UI/UX)
    // =========================================================================
    const getSearchImgPath = (filename) => {
        if (typeof window !== "undefined" && window.location) {
            if (window.location.protocol === "file:" && window.location.pathname.includes("/html/")) {
                return `../assesst/${filename}`;
            }
            if (window.location.protocol.startsWith("http")) {
                return `/assesst/${filename}`;
            }
        }
        return `../assesst/${filename}`;
    };

    const genres = [
        { name: "Pop", color: "#e8115b", img: "search1.jpg" },
        { name: "Hip-Hop", color: "#ba5d07", img: "search2.jpg" },
        { name: "Rock", color: "#e91429", img: "search3.jpg" },
        { name: "Indie", color: "#608108", img: "search4.jpg" },
        { name: "Bollywood", color: "#d84000", img: "search5.jpg" },
        { name: "Chill", color: "#1e3264", img: "search6.jpg" },
        { name: "Dance", color: "#8400e7", img: "search7.jpg" },
        { name: "Devotional", color: "#006450", img: "search8.jpg" },
        { name: "Punjabi", color: "#b02897", img: "search9.jpg" },
        { name: "Workout", color: "#777777", img: "search10.jpg" },
        { name: "Romance", color: "#e1118c", img: "search11.jpg" },
        { name: "Party", color: "#509bf5", img: "search12.jpg" },
    ];

    function renderSearchDefault() {
        const grid = $("browseGrid");
        if (!grid) return;
        grid.innerHTML = genres.map(g =>
            `<div class="genre-card" style="background:${g.color};" data-genre="${g.name}">
                <h3 class="genre-title">${g.name}</h3>
                <img src="${getSearchImgPath(g.img)}" class="genre-img" alt="${g.name}" loading="lazy">
            </div>`
        ).join("");
        $$(".genre-card").forEach(gc => {
            gc.addEventListener("click", () => {
                searchInput.value = gc.dataset.genre;
                doSearch(gc.dataset.genre);
            });
        });
    }

    async function doSearch(query) {
        const q = (query || "").trim();
        if (!q) {
            if ($("searchDefault")) $("searchDefault").style.display = "block";
            if ($("searchResults")) $("searchResults").style.display = "none";
            if ($("noResults")) $("noResults").style.display = "none";
            if (clearSearchBtn) clearSearchBtn.style.display = "none";
            return;
        }
        if (clearSearchBtn) clearSearchBtn.style.display = "block";

        // Show loading indicator
        if ($("searchDefault")) $("searchDefault").style.display = "none";
        if ($("searchResults")) $("searchResults").style.display = "block";
        if ($("noResults")) $("noResults").style.display = "none";
        if ($("searchResultCards")) {
            $("searchResultCards").innerHTML = `
                <div style="grid-column: 1 / -1; display:flex; align-items:center; justify-content:center; padding: 3rem; color: #1ed760; font-size: 1.1rem; gap: 0.8rem;">
                    <i class="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Searching Audius music catalog for "${q}"...</span>
                </div>
            `;
        }

        let matches = [];
        try {
            matches = await musicApi.search(q, 16);
        } catch (e) {
            console.warn("Audius search error:", e);
        }

        // Query REST API /api/search?q=... as secondary fallback
        if ((!matches || matches.length === 0) && typeof spotifyApi !== "undefined") {
            try {
                const res = await spotifyApi.search(q);
                if (res && res.data && res.data.results && Array.isArray(res.data.results.tracks) && res.data.results.tracks.length > 0) {
                    matches = res.data.results.tracks;
                }
            } catch (e) {}
        }

        // Add any found tracks into playlist queue
        if (matches && matches.length > 0) {
            matches.forEach(t => {
                if (!playlist.some(p => String(p.id) === String(t.id))) {
                    playlist.push(t);
                }
            });
            if ($("searchResults")) $("searchResults").style.display = "block";
            if ($("noResults")) $("noResults").style.display = "none";
            if ($("searchResultCards")) $("searchResultCards").innerHTML = matches.map(createCardHTML).join("");
            bindCardClicks();
        } else {
            // Fallback to local playlist filter if offline
            const lower = q.toLowerCase();
            const localMatches = playlist.filter(t =>
                (t.title && t.title.toLowerCase().includes(lower)) ||
                (t.artist && t.artist.toLowerCase().includes(lower)) ||
                (t.genre && t.genre.toLowerCase().includes(lower)) ||
                (t.category && t.category.toLowerCase().includes(lower)) ||
                (t.searchTag && t.searchTag.toLowerCase().includes(lower))
            );
            if (localMatches.length > 0) {
                if ($("searchResults")) $("searchResults").style.display = "block";
                if ($("noResults")) $("noResults").style.display = "none";
                if ($("searchResultCards")) $("searchResultCards").innerHTML = localMatches.map(createCardHTML).join("");
                bindCardClicks();
            } else {
                if ($("searchResults")) $("searchResults").style.display = "none";
                if ($("noResults")) $("noResults").style.display = "block";
            }
        }
    }

    // Global delegated listener for Browse All genre cards and back button
    document.addEventListener("click", (e) => {
        const gc = e.target.closest(".genre-card");
        if (gc && gc.dataset && gc.dataset.genre) {
            const genre = gc.dataset.genre;
            if (searchInput) searchInput.value = genre;
            doSearch(genre);
        }
        if (e.target.closest("#backToBrowseBtn")) {
            if (searchInput) searchInput.value = "";
            doSearch("");
        }
    });

    if (searchInput) searchInput.addEventListener("input", () => doSearch(searchInput.value));
    if (clearSearchBtn) clearSearchBtn.addEventListener("click", () => {
        if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
        }
        doSearch("");
    });

    // =========================================================================
    // LIBRARY PAGE
    // =========================================================================
    function renderLibrary(filter = "all") {
        // Update filter chips
        $$(".filter-chip").forEach(c => {
            c.classList.toggle("active-chip", c.dataset.filter === filter);
        });

        const likedBanner = $("likedSongsBanner");
        const libPlaylists = $("libraryPlaylists");
        const likedList = $("likedSongsList");

        // Liked songs count
        if ($("likedSongsCount")) $("likedSongsCount").textContent = `${likedSongs.size} song${likedSongs.size !== 1 ? "s" : ""}`;

        if (filter === "liked") {
            if (likedBanner) likedBanner.style.display = "none";
            if (libPlaylists) libPlaylists.style.display = "none";
            if (likedList) likedList.style.display = "flex";
            renderLikedSongsList();
        } else if (filter === "playlists") {
            if (likedBanner) likedBanner.style.display = "none";
            if (libPlaylists) libPlaylists.style.display = "grid";
            if (likedList) likedList.style.display = "none";
            renderLibraryPlaylists();
        } else {
            if (likedBanner) likedBanner.style.display = "flex";
            if (libPlaylists) libPlaylists.style.display = "grid";
            if (likedList) likedList.style.display = "none";
            renderLibraryPlaylists();
        }
    }

    function renderLikedSongsList() {
        const list = $("likedSongsList");
        if (!list) return;
        if (likedSongs.size === 0) {
            list.innerHTML = `<p style="color:#a7a7a7;text-align:center;padding:2rem;">No liked songs yet. Click the ♡ icon on any song to add it here.</p>`;
            return;
        }
        list.innerHTML = [...likedSongs].map(id => {
            const t = playlist.find(s => String(s.id) === String(id));
            if (!t) return "";
            return `<div class="liked-song-row" data-song-id="${t.id}">
                <img src="${t.img}" alt="${t.title}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                <div class="song-info">
                    <span class="song-name">${t.title}</span>
                    <span class="song-artist">${t.artist}</span>
                </div>
                <span class="song-duration">${fmt(t.duration)}</span>
            </div>`;
        }).join("");
        $$(".liked-song-row").forEach(r => {
            r.addEventListener("click", () => {
                const idx = playlist.findIndex(t => String(t.id) === String(r.dataset.songId));
                if (idx !== -1) {
                    loadTrack(idx, true);
                    navigate("music");
                }
            });
        });
    }

    function renderLibraryPlaylists() {
        const container = $("libraryPlaylists");
        if (userPlaylists.length === 0) {
            container.innerHTML = `<p style="color:#a7a7a7;padding:1rem;">No playlists yet. Create one to get started!</p>`;
            return;
        }
        container.innerHTML = userPlaylists.map(pl => {
            const coverImg = pl.songs.length > 0
                ? playlist.find(t => String(t.id) === String(pl.songs[0]))?.img || "./assesst/card1img.jpeg"
                : "./assesst/card1img.jpeg";
            return `<div class="card playlist-card" data-playlist-id="${pl.id}">
                <div class="card-img-wrapper">
                    <img src="${coverImg}" class="card-img" alt="${pl.name}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                    <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
                <p class="card-title">${pl.name}</p>
                <p class="card-info">${pl.songs.length} song${pl.songs.length !== 1 ? "s" : ""}</p>
            </div>`;
        }).join("");
        $$(".playlist-card").forEach(card => {
            card.addEventListener("click", () => {
                const plId = card.dataset.playlistId;
                openPlaylistDetail(plId);
            });
        });
    }

    // Filter chips
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("filter-chip")) {
            renderLibrary(e.target.dataset.filter);
        }
    });

    // Liked songs banner click
    if ($("likedSongsBanner")) {
        $("likedSongsBanner").addEventListener("click", () => renderLibrary("liked"));
    }

    // =========================================================================
    // CREATE PLAYLIST PAGE
    // =========================================================================
    if ($("createPlaylistBtn")) {
        $("createPlaylistBtn").addEventListener("click", () => {
            if ($("playlistNameInput")) $("playlistNameInput").value = "";
            if ($("playlistDescInput")) $("playlistDescInput").value = "";
            if ($("newPlaylistTitle")) $("newPlaylistTitle").textContent = `My Playlist #${playlistIdCounter}`;
            if ($("playlistSongSearch")) $("playlistSongSearch").value = "";
            if ($("playlistSongResults")) $("playlistSongResults").innerHTML = "";
            renderPlaylistSongSearch("");
            navigate("createPlaylist");
        });
    }

    if ($("addPlaylistIcon")) {
        $("addPlaylistIcon").addEventListener("click", () => {
            if ($("createPlaylistBtn")) $("createPlaylistBtn").click();
        });
    }

    // Live preview title
    if ($("playlistNameInput")) {
        $("playlistNameInput").addEventListener("input", (e) => {
            if ($("newPlaylistTitle")) $("newPlaylistTitle").textContent = e.target.value || `My Playlist #${playlistIdCounter}`;
        });
    }

    // Song search for adding to playlist
    if ($("playlistSongSearch")) {
        $("playlistSongSearch").addEventListener("input", (e) => {
            renderPlaylistSongSearch(e.target.value);
        });
    }

    function renderPlaylistSongSearch(query) {
        const q = query.trim().toLowerCase();
        const results = q ? playlist.filter(t =>
            t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
        ) : playlist;

        if ($("playlistSongResults")) {
            $("playlistSongResults").innerHTML = results.map(t =>
                `<div class="liked-song-row add-song-row" data-song-id="${t.id}">
                    <img src="${t.img}" alt="${t.title}">
                    <div class="song-info">
                        <span class="song-name">${t.title}</span>
                        <span class="song-artist">${t.artist}</span>
                    </div>
                    <button class="badge add-song-btn" data-song-id="${t.id}" style="height:28px;font-size:0.75rem;">Add</button>
                </div>`
            ).join("");
        }
    }

    // Temporary songs list for the playlist being created
    let pendingPlaylistSongs = [];

    document.addEventListener("click", (e) => {
        if (e.target.closest(".add-song-btn")) {
            const id = parseInt(e.target.closest(".add-song-btn").dataset.songId, 10);
            if (!pendingPlaylistSongs.includes(id)) {
                pendingPlaylistSongs.push(id);
                e.target.closest(".add-song-btn").textContent = "Added ✓";
                e.target.closest(".add-song-btn").disabled = true;
                e.target.closest(".add-song-btn").style.opacity = "0.5";
                toast(`Song added to playlist`, "fa-plus");
            }
        }
    });

    // Save playlist
    if ($("savePlaylistBtn")) {
        $("savePlaylistBtn").addEventListener("click", () => {
            const name = ($("playlistNameInput") ? $("playlistNameInput").value.trim() : "") || `My Playlist #${playlistIdCounter}`;
            const desc = $("playlistDescInput") ? $("playlistDescInput").value.trim() : "";
            const playlistUuid = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
                ? crypto.randomUUID()
                : `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const pl = {
                id: playlistUuid,
                name,
                desc,
                songs: [...pendingPlaylistSongs]
            };
            userPlaylists.push(pl);
            try { localStorage.setItem("spotify_userPlaylists", JSON.stringify(userPlaylists)); } catch (e) {}
            if (typeof spotifyApi !== "undefined") {
                spotifyApi.createPlaylist(name, desc).catch(() => {});
            }
        pendingPlaylistSongs = [];
        renderSidebarPlaylists();
        if (profileModule) profileModule.updatePlaylists(userPlaylists);
        toast(`Playlist "${name}" created!`, "fa-circle-check");
        navigate("library");
        renderLibrary();
    });
    }

    // =========================================================================
    // BROWSE PODCASTS PAGE
    // =========================================================================
    const podcastCategories = [
        { name: "Comedy", icon: "fa-face-laugh-squint" },
        { name: "True Crime", icon: "fa-user-secret" },
        { name: "News", icon: "fa-newspaper" },
        { name: "Technology", icon: "fa-microchip" },
        { name: "Business", icon: "fa-briefcase" },
        { name: "Health & Fitness", icon: "fa-heart-pulse" },
        { name: "Education", icon: "fa-graduation-cap" },
        { name: "Science", icon: "fa-flask" },
        { name: "Sports", icon: "fa-futbol" },
    ];

    const podcastShows = [
        { title: "The Joe Rogan Experience", host: "Joe Rogan", img: "./assesst/card1img.jpeg" },
        { title: "Crime Junkie", host: "Ashley Flowers", img: "./assesst/card2img.jpeg" },
        { title: "The Daily", host: "The New York Times", img: "./assesst/card3img.jpeg" },
        { title: "Huberman Lab", host: "Andrew Huberman", img: "./assesst/card4img.jpeg" },
        { title: "Lex Fridman Podcast", host: "Lex Fridman", img: "./assesst/card5img.jpeg" },
        { title: "TED Talks Daily", host: "TED", img: "./assesst/card6img.jpeg" },
    ];

    function renderPodcasts() {
        if ($("podcastCategories")) {
            $("podcastCategories").innerHTML = podcastCategories.map(c =>
                `<div class="podcast-category-card">
                    <i class="fa-solid ${c.icon}"></i>
                    <span>${c.name}</span>
                </div>`
            ).join("");
        }

        if ($("podcastCards")) {
            $("podcastCards").innerHTML = podcastShows.map(p =>
                `<div class="card podcast-show-card">
                    <div class="card-img-wrapper">
                        <img src="${p.img}" class="card-img" alt="${p.title}">
                        <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                    </div>
                    <p class="card-title">${p.title}</p>
                    <p class="card-info">${p.host}</p>
                </div>`
            ).join("");
        }

        // Fetch dynamic podcast shows from REST API /api/podcasts
        if (typeof spotifyApi !== "undefined") {
            spotifyApi.getPodcasts().then(res => {
                if (res && res.data && Array.isArray(res.data.podcasts) && res.data.podcasts.length > 0 && $("podcastCards")) {
                    $("podcastCards").innerHTML = res.data.podcasts.map(p =>
                        `<div class="card podcast-show-card" data-podcast-id="${p.id}">
                            <div class="card-img-wrapper">
                                <img src="${p.cover || './assesst/card1img.jpeg'}" class="card-img" alt="${p.name}">
                                <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                            </div>
                            <p class="card-title">${p.name}</p>
                            <p class="card-info">${p.host} • ${p.category}</p>
                        </div>`
                    ).join("");
                    $$(".podcast-show-card").forEach(c => {
                        c.addEventListener("click", () => toast(`Playing "${c.querySelector(".card-title").textContent}"`, "fa-podcast"));
                    });
                }
            }).catch(() => {});
        }

        $$(".podcast-show-card").forEach(c => {
            c.addEventListener("click", () => toast(`Playing "${c.querySelector(".card-title").textContent}"`, "fa-podcast"));
        });
        $$(".podcast-category-card").forEach(c => {
            c.addEventListener("click", () => toast(`Browsing ${c.querySelector("span").textContent} podcasts`, "fa-podcast"));
        });
    }

    if ($("browsePodcastsBtn")) {
        $("browsePodcastsBtn").addEventListener("click", () => {
            renderPodcasts();
            navigate("podcasts");
        });
    }

    // =========================================================================
    // PLAYLIST DETAIL PAGE
    // =========================================================================
    function openPlaylistDetail(plId) {
        viewingPlaylistId = plId;
        const pl = userPlaylists.find(p => String(p.id) === String(plId));
        if (!pl) return;

        const coverImg = pl.songs.length > 0
            ? playlist.find(t => String(t.id) === String(pl.songs[0]))?.img || "./assesst/card1img.jpeg"
            : "./assesst/card1img.jpeg";

        if ($("playlistDetailHeader")) {
            $("playlistDetailHeader").innerHTML = `
                <img src="${coverImg}" alt="${pl.name}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                <div class="detail-info">
                    <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#a7a7a7;margin:0 0 0.3rem">Playlist</p>
                    <h1>${pl.name}</h1>
                    ${pl.desc ? `<p style="margin:0.3rem 0 0.5rem">${pl.desc}</p>` : ""}
                    <p style="margin:0;">${pl.songs.length} song${pl.songs.length !== 1 ? "s" : ""} • ${fmt(pl.songs.reduce((sum, id) => sum + (playlist.find(t => String(t.id) === String(id))?.duration || 0), 0))}</p>
                </div>`;
        }

        if ($("playlistTrackList")) {
            $("playlistTrackList").innerHTML = pl.songs.map((songId, i) => {
                const t = playlist.find(s => String(s.id) === String(songId));
                if (!t) return "";
                return `<div class="track-row" data-song-id="${t.id}">
                    <span class="track-number">${i + 1}</span>
                    <i class="fa-solid fa-play track-play-icon"></i>
                    <img src="${t.img}" alt="${t.title}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                    <div class="track-info">
                        <span class="track-name">${t.title}</span>
                        <span class="track-artist">${t.artist}</span>
                    </div>
                    <span class="track-duration">${fmt(t.duration)}</span>
                </div>`;
            }).join("");
        }

        $$(".track-row").forEach(r => {
            r.addEventListener("click", () => {
                const idx = playlist.findIndex(t => String(t.id) === String(r.dataset.songId));
                if (idx !== -1) {
                    loadTrack(idx, true);
                    navigate("music");
                }
            });
        });

        // Play All
        if ($("playAllBtn")) {
            $("playAllBtn").onclick = () => {
                if (pl.songs.length > 0) {
                    const idx = playlist.findIndex(t => String(t.id) === String(pl.songs[0]));
                    if (idx !== -1) {
                        loadTrack(idx, true);
                        navigate("music");
                    }
                }
            };
        }

        // Shuffle Playlist
        if ($("shufflePlaylistBtn")) {
            $("shufflePlaylistBtn").onclick = () => {
                if (pl.songs.length > 0) {
                    const randomId = pl.songs[Math.floor(Math.random() * pl.songs.length)];
                    const idx = playlist.findIndex(t => String(t.id) === String(randomId));
                    if (idx !== -1) {
                        isShuffle = true;
                        if (shuffleBtn) shuffleBtn.classList.add("active");
                        loadTrack(idx, true);
                        navigate("music");
                    }
                }
            };
        }

        navigate("playlistDetail");
    }

    // =========================================================================
    // SIDEBAR PLAYLISTS
    // =========================================================================
    function renderSidebarPlaylists() {
        const container = $("sidebarPlaylists");
        container.innerHTML = userPlaylists.map(pl => {
            const coverImg = pl.songs.length > 0
                ? playlist.find(t => String(t.id) === String(pl.songs[0]))?.img || "./assesst/card1img.jpeg"
                : "./assesst/card1img.jpeg";
            return `<div class="sidebar-playlist-item" data-playlist-id="${pl.id}">
                <img src="${coverImg}" alt="${pl.name}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                <span>${pl.name}</span>
            </div>`;
        }).join("");
        $$(".sidebar-playlist-item").forEach(item => {
            item.addEventListener("click", () => {
                openPlaylistDetail(item.dataset.playlistId);
            });
        });
    }

    // =========================================================================
    // MUSIC PLAYER
    // =========================================================================
    function loadTrack(idx, autoPlay = true) {
        if (!playlist || playlist.length === 0) return;
        currentTrackIndex = (idx + playlist.length) % playlist.length;
        try { localStorage.setItem("spotify_currentTrack", currentTrackIndex); } catch (e) {}
        const t = playlist[currentTrackIndex];
        albumArt.src = t.img || "./assesst/card1img.jpeg";
        albumArt.onerror = () => { albumArt.src = "./assesst/card1img.jpeg"; };
        trackTitle.textContent = t.title || "Untitled Track";
        trackArtist.textContent = t.artist || "Unknown Artist";
        totTimeEl.textContent = fmt(t.duration || 180);
        currentTime = 0;
        currTimeEl.textContent = "0:00";
        progressBar.value = 0;
        updateSliderBg(progressBar, 0);
        chordIdx = 0;
        updateLikeIcon();
        highlightActiveCard();
        updateRightSidebar(t, playlist[(currentTrackIndex + 1) % playlist.length]);

        initAudio();

        if (audioElement && t && t.streamUrl) {
            stopSynth();
            stopProgress();
            if (audioElement.src !== t.streamUrl) {
                audioElement.src = t.streamUrl;
            }
        }

        // Render Music Page with current track details
        if (musicModule) {
            musicModule.render(
                t,
                playlist,
                isPlaying,
                likedSongs,
                (newIdx) => {
                    loadTrack(newIdx, true);
                },
                () => togglePlay(),
                (sec) => {
                    currentTime = sec;
                    if (audioElement && audioElement.duration && isFinite(audioElement.duration)) {
                        audioElement.currentTime = sec;
                    }
                    const dur = (audioElement && audioElement.duration && isFinite(audioElement.duration)) ? audioElement.duration : (t.duration || 180);
                    progressBar.value = (sec / dur) * 100;
                    currTimeEl.textContent = fmt(sec);
                    updateSliderBg(progressBar, progressBar.value);
                },
                toast
            );
        }

        if (autoPlay) playTrack(); else pauseTrack();
    }

    function playTrack() {
        initAudio();
        const t = playlist[currentTrackIndex];
        isPlaying = true;
        playPauseIcon.className = "fa-solid fa-pause";
        playPauseBtn.classList.add("playing");
        if (musicModule) musicModule.updatePlayState(true);

        if (audioElement && t && t.streamUrl) {
            if (audioElement.src !== t.streamUrl) {
                audioElement.src = t.streamUrl;
            }
            audioElement.volume = isMuted ? 0 : volume;
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    stopSynth();
                    stopProgress();
                }).catch(err => {
                    console.warn("Audio element play warning:", err);
                    startSynth();
                    startProgress();
                });
            }
        } else {
            startSynth();
            startProgress();
        }
    }

    function pauseTrack() {
        isPlaying = false;
        playPauseIcon.className = "fa-solid fa-play";
        playPauseBtn.classList.remove("playing");
        if (musicModule) musicModule.updatePlayState(false);
        if (audioElement) {
            audioElement.pause();
        }
        stopSynth();
        stopProgress();
    }

    function togglePlay() {
        isPlaying ? pauseTrack() : playTrack();
    }

    function nextTrack() {
        if (repeatMode === "one") {
            if (audioElement) {
                audioElement.currentTime = 0;
                audioElement.play().catch(() => {});
            } else {
                loadTrack(currentTrackIndex, true);
            }
            return;
        }
        if (isShuffle) {
            let n = currentTrackIndex;
            if (playlist.length > 1) {
                while (n === currentTrackIndex) n = Math.floor(Math.random() * playlist.length);
            }
            loadTrack(n, true);
        } else {
            if (currentTrackIndex >= playlist.length - 1 && repeatMode !== "all") {
                pauseTrack();
                if (audioElement) audioElement.currentTime = 0;
                return;
            }
            loadTrack(currentTrackIndex + 1, true);
        }
    }

    function prevTrack() {
        const cur = audioElement ? (audioElement.currentTime || currentTime) : currentTime;
        if (cur > 3) {
            if (audioElement) {
                audioElement.currentTime = 0;
            }
            currentTime = 0;
            currTimeEl.textContent = "0:00";
            progressBar.value = 0;
            updateSliderBg(progressBar, 0);
            toast("Restarted song", "fa-rotate-left");
            return;
        }
        loadTrack(currentTrackIndex - 1, true);
    }

    function startProgress() {
        stopProgress();
        tickerInterval = setInterval(() => {
            const t = playlist[currentTrackIndex];
            if (!t) return;
            currentTime += 0.5;
            if (currentTime >= t.duration) {
                if (repeatMode === "one") currentTime = 0;
                else if (repeatMode === "all" || currentTrackIndex < playlist.length - 1) { nextTrack(); return; }
                else { currentTime = 0; pauseTrack(); return; }
            }
            const pct = (currentTime / t.duration) * 100;
            progressBar.value = pct;
            currTimeEl.textContent = fmt(currentTime);
            updateSliderBg(progressBar, pct);

            // Sync live karaoke lyrics
            if (musicModule) {
                musicModule.syncLyricsWithTime(currentTime, t.duration, t.lyrics ? t.lyrics.length : 0);
            }
        }, 500);
    }

    function stopProgress() {
        if (tickerInterval) { clearInterval(tickerInterval); tickerInterval = null; }
    }

    function updateLikeIcon() {
        const t = playlist[currentTrackIndex];
        if (!t) return;
        const isLiked = likedSongs.has(t.id);
        if (likeBtn) likeBtn.className = isLiked ? "fa-solid fa-heart like-icon liked" : "fa-regular fa-heart like-icon";
        if ($("rightSidebarLikeBtn")) {
            $("rightSidebarLikeBtn").className = isLiked ? "fa-solid fa-heart now-playing-like-btn liked" : "fa-regular fa-heart now-playing-like-btn";
        }
        if (musicModule) musicModule.updateLikeState(isLiked);
    }

    function highlightActiveCard() {
        const t = playlist[currentTrackIndex];
        if (!t) return;
        $$(".card").forEach(c => {
            c.classList.toggle("active-card", String(c.dataset.songId) === String(t.id));
        });
    }

    // Player button listeners
    if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlay);
    if (nextBtn) nextBtn.addEventListener("click", nextTrack);
    if (prevBtn) prevBtn.addEventListener("click", prevTrack);

    if (shuffleBtn) {
        shuffleBtn.addEventListener("click", () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle("active", isShuffle);
            toast(isShuffle ? "Shuffle ON" : "Shuffle OFF", "fa-shuffle");
        });
    }

    if (repeatBtn) {
        repeatBtn.addEventListener("click", () => {
            if (repeatMode === "off") { repeatMode = "all"; repeatBtn.classList.add("active"); toast("Repeat all", "fa-repeat"); }
            else if (repeatMode === "all") { repeatMode = "one"; toast("Repeat one", "fa-repeat"); }
            else { repeatMode = "off"; repeatBtn.classList.remove("active"); toast("Repeat off", "fa-repeat"); }
        });
    }

    if (likeBtn) {
        likeBtn.addEventListener("click", () => {
            const t = playlist[currentTrackIndex];
            if (!t) return;
            if (likedSongs.has(t.id)) {
                likedSongs.delete(t.id);
                toast("Removed from Liked Songs", "fa-heart-crack");
            } else {
                likedSongs.add(t.id);
                toast("Added to Liked Songs", "fa-heart");
            }
            try { localStorage.setItem("spotify_likedSongs", JSON.stringify([...likedSongs])); } catch (e) {}
            updateLikeIcon();
            if (typeof spotifyApi !== "undefined") {
                spotifyApi.toggleLike(t.id).catch(() => {});
            }
        });
    }

    // Progress bar
    if (progressBar) {
        progressBar.addEventListener("input", () => {
            const t = playlist[currentTrackIndex];
            if (!t) return;
            const pct = parseFloat(progressBar.value);
            const dur = (audioElement && audioElement.duration && isFinite(audioElement.duration))
                ? audioElement.duration
                : t.duration;
            currentTime = (pct / 100) * dur;
            if (audioElement && isFinite(currentTime)) {
                audioElement.currentTime = currentTime;
            }
            if (currTimeEl) currTimeEl.textContent = fmt(currentTime);
            updateSliderBg(progressBar, pct);
        });
    }

    // Volume
    if (volumeBar) {
        volumeBar.addEventListener("input", () => {
            volume = parseFloat(volumeBar.value) / 100;
            isMuted = volume === 0;
            try { localStorage.setItem("spotify_volume", volume); } catch (e) {}
            if (audioElement) audioElement.volume = isMuted ? 0 : volume;
            if (audioCtx && masterGain) masterGain.gain.setValueAtTime(volume * 0.3, audioCtx.currentTime);
            updateVolumeUI();
        });
    }

    if (volumeIcon) {
        volumeIcon.addEventListener("click", () => {
            if (isMuted) { isMuted = false; volume = prevVolume || 0.75; }
            else { prevVolume = volume; isMuted = true; volume = 0; }
            if (audioElement) audioElement.volume = isMuted ? 0 : volume;
            if (audioCtx && masterGain) masterGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.3, audioCtx.currentTime);
            updateVolumeUI();
        });
    }

    function updateVolumeUI() {
        const v = isMuted ? 0 : Math.round(volume * 100);
        volumeBar.value = v;
        updateSliderBg(volumeBar, v);
        volumeIcon.className = v === 0 ? "fa-solid fa-volume-xmark volume-icon"
            : v < 40 ? "fa-solid fa-volume-low volume-icon"
            : "fa-solid fa-volume-high volume-icon";
    }

    // Sticky nav shadow
    mainContent.addEventListener("scroll", () => {
        document.querySelector(".sticky-nav").classList.toggle("scrolled", mainContent.scrollTop > 10);
    });

    // =========================================================================
    // KEYBOARD SHORTCUTS
    // =========================================================================
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        switch (e.code) {
            case "Space": e.preventDefault(); togglePlay(); break;
            case "ArrowRight":
                e.preventDefault();
                if (e.shiftKey) nextTrack();
                else { currentTime = Math.min(playlist[currentTrackIndex].duration, currentTime + 5); progressBar.value = (currentTime / playlist[currentTrackIndex].duration) * 100; currTimeEl.textContent = fmt(currentTime); updateSliderBg(progressBar, progressBar.value); }
                break;
            case "ArrowLeft":
                e.preventDefault();
                if (e.shiftKey) prevTrack();
                else { currentTime = Math.max(0, currentTime - 5); progressBar.value = (currentTime / playlist[currentTrackIndex].duration) * 100; currTimeEl.textContent = fmt(currentTime); updateSliderBg(progressBar, progressBar.value); }
                break;
            case "ArrowUp": e.preventDefault(); volume = Math.min(1, volume + 0.05); isMuted = false; if (audioCtx && masterGain) masterGain.gain.setValueAtTime(volume * 0.3, audioCtx.currentTime); updateVolumeUI(); break;
            case "ArrowDown": e.preventDefault(); volume = Math.max(0, volume - 0.05); isMuted = volume === 0; if (audioCtx && masterGain) masterGain.gain.setValueAtTime(volume * 0.3, audioCtx.currentTime); updateVolumeUI(); break;
            case "KeyM": volumeIcon.click(); break;
            case "KeyL": likeBtn.click(); break;
            case "Escape": navigate("home"); break;
        }
    });

    // =========================================================================
    // INITIALIZE MODULES & SECTIONS
    // =========================================================================
    renderHome();
    renderSearchDefault();
    updateSliderBg(progressBar, 0);
    updateSliderBg(volumeBar, 75);
    loadTrack(0, false);

    // Fetch and load rich multi-genre Audius songs feed into Home page
    musicApi.getFeed().then(feed => {
        if (feed) {
            homeFeedData = feed;
            const allFeedTracks = [
                ...(feed.trending || []),
                ...(feed.pop || []),
                ...(feed.electronic || []),
                ...(feed.hiphop || []),
                ...(feed.chill || []),
                ...(feed.bollywood || []),
                ...(feed.romance || []),
                ...(feed.punjabi || [])
            ];
            allFeedTracks.forEach(tt => {
                const exIdx = playlist.findIndex(p => String(p.id) === String(tt.id));
                if (exIdx !== -1) {
                    Object.assign(playlist[exIdx], tt);
                } else {
                    playlist.push(tt);
                }
            });
            renderHome();
            if (currentTrackIndex === 0 && !isPlaying && playlist.length > 0) {
                loadTrack(0, false);
            }
        }
    }).catch(err => {
        console.warn("Audius feed fetch notice:", err);
    });

    // Initialize Profile Module
    const profileModule = initProfile({
        onOpenPlaylist: (plId) => openPlaylistDetail(plId),
        toast,
        navigate,
        onLogout: () => {
            if (authModule) authModule.logout();
        },
        onOpenAuth: (tab = "login") => {
            if (authModule) authModule.switchTab(tab);
            navigate("auth");
        }
    });
    profileModule.updatePlaylists(userPlaylists);

    // Initialize Authentication Module
    authModule = initAuthModule({
        onLoginSuccess: (user) => {
            const navAuthButtons = $("navAuthButtons");
            const navProfileWrapper = $("navProfileWrapper");
            if (navAuthButtons) navAuthButtons.style.display = "none";
            if (navProfileWrapper) navProfileWrapper.style.display = "flex";
            profileModule.setUser(user);
        },
        onRegisterSuccess: (user) => {
            const navAuthButtons = $("navAuthButtons");
            const navProfileWrapper = $("navProfileWrapper");
            if (navAuthButtons) navAuthButtons.style.display = "none";
            if (navProfileWrapper) navProfileWrapper.style.display = "flex";
            profileModule.setUser(user);
        },
        onLogout: () => {
            const navAuthButtons = $("navAuthButtons");
            const navProfileWrapper = $("navProfileWrapper");
            if (navAuthButtons) navAuthButtons.style.display = "flex";
            if (navProfileWrapper) navProfileWrapper.style.display = "none";
            profileModule.logoutUser();
        },
        toast,
        navigate
    });

    // Initialize Premium Module
    initPremium({
        onSubscribeSuccess: (plan) => {
            const newTier = `Spotify Premium ${plan.name}`;
            profileModule.setTier(newTier);
            if (typeof spotifyApi !== "undefined") {
                spotifyApi.updateSubscription(newTier).catch(() => {});
            }
            if (navPremiumBtn) {
                navPremiumBtn.textContent = "Premium Active";
                navPremiumBtn.style.background = "#1ed760";
                navPremiumBtn.style.color = "#000";
            }
        },
        toast
    });

    // Start on appropriate page based on file name or data-page attribute
    const pageUrlMap = {
        "index.html": "home",
        "search.html": "search",
        "library.html": "library",
        "create-playlist.html": "createPlaylist",
        "podcasts.html": "podcasts",
        "premium.html": "premium",
        "profile.html": "profile",
        "music.html": "music",
        "auth.html": "auth",
        "search": "search",
        "library": "library",
        "podcasts": "podcasts",
        "premium": "premium",
        "profile": "profile",
        "music": "music",
        "auth": "auth",
        "login": "auth",
        "signup": "auth",
        "register": "auth"
    };
    const currentPathClean = window.location.pathname.replace(/^\/|\/$/g, "").toLowerCase();
    const currentFileName = (currentPathClean.split("/").pop() || "index.html").toLowerCase();
    const dataPage = (document.body && document.body.dataset && document.body.dataset.page ? document.body.dataset.page : "").toLowerCase();

    // Highlight active link if on a standalone footer or sidebar page
    if (currentFileName && currentFileName !== "index.html" && currentFileName !== "") {
        $$(".footer-link, .sidebar-legal-link").forEach(l => {
            const lHref = (l.getAttribute("href") || "").split("/").pop().toLowerCase();
            l.classList.toggle("active-footer-link", lHref === currentFileName);
        });
    }

    const initialPage = dataPage || pageUrlMap[currentFileName] || pageUrlMap[currentPathClean] || "home";
    const targetElement = $(`page${initialPage.charAt(0).toUpperCase() + initialPage.slice(1)}`);
    if (targetElement) {
        navigate(initialPage, false);
    } else {
        // Standalone footer page (about, jobs, etc.)
        currentPage = initialPage;
        $$(".nav-option").forEach(n => n.classList.remove("active-nav"));
        if (initialPage === "home" && $("navHome")) $("navHome").classList.add("active-nav");
        else if (initialPage === "search" && $("navSearch")) $("navSearch").classList.add("active-nav");
        else if (initialPage === "library" && $("navLibrary")) $("navLibrary").classList.add("active-nav");
    }

    // Auto-switch auth tab if ?tab=register or ?tab=login is in the query params
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam && authModule) {
        authModule.switchTab(tabParam);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runApp);
} else {
    runApp();
}


})();