/**
 * Music API Controller - Integrates Audius (Primary) and Jamendo APIs
 */

const https = require('https');

// Simple in-memory cache for trending tracks (5 min TTL)
let trendingCache = {
  timestamp: 0,
  data: []
};
const CACHE_TTL = 5 * 60 * 1000;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'SpotifyClone/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Music API request timeout'));
    });
  });
}

function normalizeAudiusTrack(track) {
  const artwork = track.artwork || {};
  const img = artwork['480x480'] || artwork['150x150'] || artwork['1000x1000'] || '/assesst/card1img.jpeg';
  return {
    id: track.id,
    title: track.title || 'Untitled Track',
    artist: track.user ? (track.user.name || track.user.handle) : 'Unknown Artist',
    artistId: track.user ? track.user.id : null,
    genre: track.genre || 'Music',
    img: img,
    duration: track.duration || 180,
    streamUrl: `https://api.audius.co/v1/tracks/${track.id}/stream?app_name=SPOTIFY_CLONE`,
    source: 'audius',
    playCount: track.play_count || 0
  };
}

// GET /api/music/trending
exports.getTrending = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 12;

  // Serve from cache if fresh
  if (Date.now() - trendingCache.timestamp < CACHE_TTL && trendingCache.data.length > 0) {
    return res.json({
      success: true,
      source: 'cache',
      count: trendingCache.data.slice(0, limit).length,
      tracks: trendingCache.data.slice(0, limit)
    });
  }

  try {
    const audiusRes = await fetchJson(`https://api.audius.co/v1/tracks/trending?app_name=SPOTIFY_CLONE&limit=${limit}`);
    if (audiusRes.data && Array.isArray(audiusRes.data.data)) {
      const tracks = audiusRes.data.data.map(normalizeAudiusTrack);
      trendingCache = {
        timestamp: Date.now(),
        data: tracks
      };
      return res.json({
        success: true,
        source: 'audius',
        count: tracks.length,
        tracks
      });
    }
  } catch (err) {
    console.warn('Audius trending fetch failed:', err.message);
  }

  // Fallback to local store tracks if external API is unreachable
  const store = require('../data/store');
  const localTracks = store.getTracks();
  res.json({
    success: true,
    source: 'local_fallback',
    count: localTracks.length,
    tracks: localTracks
  });
};

// GET /api/music/search
exports.search = async (req, res) => {
  const query = (req.query.q || '').trim();
  const limit = parseInt(req.query.limit, 10) || 15;

  if (!query) {
    return res.json({ success: true, count: 0, tracks: [] });
  }

  try {
    const audiusRes = await fetchJson(
      `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=SPOTIFY_CLONE&limit=${limit}`
    );
    if (audiusRes.data && Array.isArray(audiusRes.data.data) && audiusRes.data.data.length > 0) {
      const tracks = audiusRes.data.data.map(normalizeAudiusTrack);
      return res.json({
        success: true,
        source: 'audius',
        query,
        count: tracks.length,
        tracks
      });
    }
  } catch (err) {
    console.warn('Audius search failed:', err.message);
  }

  // Fallback to local store search
  const store = require('../data/store');
  const localMatches = store.getTracks({ q: query });
  res.json({
    success: true,
    source: 'local_fallback',
    query,
    count: localMatches.length,
    tracks: localMatches
  });
};

// GET /api/music/artist/:id
exports.getArtist = async (req, res) => {
  const artistId = req.params.id;

  try {
    const audiusRes = await fetchJson(`https://api.audius.co/v1/users/${artistId}?app_name=SPOTIFY_CLONE`);
    if (audiusRes.data && audiusRes.data.data) {
      const user = audiusRes.data.data;
      return res.json({
        success: true,
        artist: {
          id: user.id,
          name: user.name,
          handle: user.handle,
          bio: user.bio,
          profilePicture: user.profile_picture ? user.profile_picture['480x480'] : null,
          followerCount: user.follower_count,
          trackCount: user.track_count
        }
      });
    }
  } catch (err) {
    console.warn('Audius artist fetch failed:', err.message);
  }

  res.status(404).json({ success: false, error: 'Artist details unavailable' });
};

