/**
 * Music API Controller - Integrates Audius (Primary) and Jamendo APIs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Simple in-memory cache for trending tracks and feeds (5 min TTL)
let trendingCache = {};
let feedCache = {
  timestamp: 0,
  data: null
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
  const img = artwork['480x480'] || artwork['150x150'] || artwork['1000x1000'] || track.img || '/assesst/card5img.jpeg';
  return {
    id: String(track.id),
    title: track.title || 'Untitled Track',
    artist: track.user ? (track.user.name || track.user.handle) : (track.artist || 'Unknown Artist'),
    artistId: track.user ? track.user.id : (track.artistId || null),
    genre: track.genre || 'Bollywood / Indian Music',
    category: track.category || 'Bollywood',
    img: img,
    duration: track.duration || 180,
    streamUrl: track.streamUrl || `https://api.audius.co/v1/tracks/${track.id}/stream?app_name=SPOTIFY_CLONE`,
    source: 'audius',
    playCount: track.play_count || 0
  };
}

function getStoredAudiusTracks() {
  const all = [];
  const seen = new Set();
  const files = [
    path.join(__dirname, '..', 'data', 'bollywood_tracks.json'),
    path.join(__dirname, '..', 'data', 'audius_tracks.json')
  ];
  for (const f of files) {
    try {
      if (fs.existsSync(f)) {
        const list = JSON.parse(fs.readFileSync(f, 'utf8'));
        list.forEach(t => {
          if (!seen.has(String(t.id))) {
            seen.add(String(t.id));
            all.push(t);
          }
        });
      }
    } catch (e) {}
  }
  if (all.length > 0) return all;
  const store = require('../data/store');
  return store.getTracks();
}

// GET /api/music/trending
exports.getTrending = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 12;
  const genre = req.query.genre ? req.query.genre.trim() : '';
  const cacheKey = `trending_${genre}_${limit}`;

  if (trendingCache[cacheKey] && Date.now() - trendingCache[cacheKey].timestamp < CACHE_TTL) {
    return res.json({
      success: true,
      source: 'cache',
      count: trendingCache[cacheKey].data.length,
      tracks: trendingCache[cacheKey].data
    });
  }

  try {
    const genreParam = genre ? `&genre=${encodeURIComponent(genre)}` : '';
    const audiusRes = await fetchJson(`https://api.audius.co/v1/tracks/trending?app_name=SPOTIFY_CLONE&limit=${limit}${genreParam}`);
    if (audiusRes.data && Array.isArray(audiusRes.data.data) && audiusRes.data.data.length > 0) {
      const tracks = audiusRes.data.data.map(normalizeAudiusTrack);
      trendingCache[cacheKey] = {
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
  const localTracks = getStoredAudiusTracks();
  const filtered = genre
    ? localTracks.filter(t => (t.genre && t.genre.toLowerCase().includes(genre.toLowerCase())) || (t.category && t.category.toLowerCase().includes(genre.toLowerCase())))
    : localTracks;
  const result = (filtered.length > 0 ? filtered : localTracks).slice(0, limit);

  res.json({
    success: true,
    source: 'local_fallback',
    count: result.length,
    tracks: result
  });
};

// GET /api/music/bollywood (Dedicated Bollywood & Indian Hits endpoint)
exports.getBollywood = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 24;
  const query = req.query.q || 'Bollywood';
  const cacheKey = `bollywood_${query}_${limit}`;

  if (trendingCache[cacheKey] && Date.now() - trendingCache[cacheKey].timestamp < CACHE_TTL) {
    return res.json({
      success: true,
      source: 'cache',
      count: trendingCache[cacheKey].data.length,
      tracks: trendingCache[cacheKey].data
    });
  }

  try {
    const audiusRes = await fetchJson(
      `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=SPOTIFY_CLONE&limit=${limit}`
    );
    if (audiusRes.data && Array.isArray(audiusRes.data.data) && audiusRes.data.data.length > 0) {
      const tracks = audiusRes.data.data.map(normalizeAudiusTrack);
      trendingCache[cacheKey] = {
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
    console.warn('Audius Bollywood fetch failed:', err.message);
  }

  // Fallback to local bollywood tracks
  const localTracks = getStoredAudiusTracks();
  const bolly = localTracks.filter(t =>
    t.category === 'Bollywood' ||
    (t.genre && t.genre.toLowerCase().includes('bollywood')) ||
    (t.genre && t.genre.toLowerCase().includes('indian')) ||
    (t.searchTag && ['Arijit', 'Atif', 'Darshan', 'Bollywood', 'Pritam'].some(tag => t.searchTag.includes(tag)))
  );

  const result = bolly.length > 0 ? bolly.slice(0, limit) : localTracks.slice(0, limit);
  res.json({
    success: true,
    source: 'local_fallback',
    count: result.length,
    tracks: result
  });
};

// GET /api/music/feed (Multi-genre home feed with 50+ songs)
exports.getFeed = async (req, res) => {
  if (feedCache.data && Date.now() - feedCache.timestamp < CACHE_TTL) {
    return res.json({
      success: true,
      source: 'cache',
      ...feedCache.data
    });
  }

  const localTracks = getStoredAudiusTracks();

  try {
    const [trendingRes, popRes, edmRes, hiphopRes, chillRes, bollywoodRes, romanceRes, punjabiRes] = await Promise.allSettled([
      fetchJson('https://api.audius.co/v1/tracks/trending?app_name=SPOTIFY_CLONE&limit=10'),
      fetchJson('https://api.audius.co/v1/tracks/trending?genre=Pop&app_name=SPOTIFY_CLONE&limit=8'),
      fetchJson('https://api.audius.co/v1/tracks/trending?genre=Electronic&app_name=SPOTIFY_CLONE&limit=8'),
      fetchJson('https://api.audius.co/v1/tracks/trending?genre=Hip-Hop%2FRap&app_name=SPOTIFY_CLONE&limit=8'),
      fetchJson('https://api.audius.co/v1/tracks/trending?genre=Ambient&app_name=SPOTIFY_CLONE&limit=8'),
      fetchJson('https://api.audius.co/v1/tracks/search?query=Bollywood&app_name=SPOTIFY_CLONE&limit=12'),
      fetchJson('https://api.audius.co/v1/tracks/search?query=Arijit+Singh&app_name=SPOTIFY_CLONE&limit=8'),
      fetchJson('https://api.audius.co/v1/tracks/search?query=Punjabi&app_name=SPOTIFY_CLONE&limit=8')
    ]);

    const extract = (res, category) => {
      if (res.status === 'fulfilled' && res.value && res.value.data && Array.isArray(res.value.data.data)) {
        return res.value.data.data.map(normalizeAudiusTrack);
      }
      return localTracks.filter(t => (t.category === category || (t.genre && t.genre.toLowerCase().includes(category.toLowerCase()))));
    };

    const feedData = {
      trending: extract(trendingRes, 'Trending'),
      pop: extract(popRes, 'Pop'),
      electronic: extract(edmRes, 'Electronic'),
      hiphop: extract(hiphopRes, 'Hip-Hop'),
      chill: extract(chillRes, 'Ambient'),
      bollywood: extract(bollywoodRes, 'Bollywood'),
      romance: extract(romanceRes, 'Bollywood'),
      punjabi: extract(punjabiRes, 'Punjabi')
    };

    feedCache = {
      timestamp: Date.now(),
      data: feedData
    };

    return res.json({
      success: true,
      source: 'audius',
      ...feedData
    });
  } catch (err) {
    console.warn('Feed fetch failed, using local tracks:', err.message);
  }

  // Fallback categorized feed
  const fallbackFeed = {
    trending: localTracks.slice(0, 10),
    pop: localTracks.filter(t => t.category === 'Pop' || t.genre?.includes('Pop')).slice(0, 8),
    electronic: localTracks.filter(t => t.category === 'Electronic' || t.genre?.includes('Electronic')).slice(0, 8),
    hiphop: localTracks.filter(t => t.category === 'Hip-Hop' || t.genre?.includes('Trap') || t.genre?.includes('Hip-Hop')).slice(0, 8),
    chill: localTracks.filter(t => t.category === 'Ambient' || t.genre?.includes('Ambient') || t.title?.includes('chill')).slice(0, 8),
    bollywood: localTracks.filter(t => t.category === 'Bollywood' || t.genre?.includes('Bollywood') || t.searchTag === 'Bollywood').slice(0, 12),
    romance: localTracks.filter(t => t.searchTag === 'Arijit Singh' || t.searchTag === 'Atif Aslam' || t.searchTag === 'Tum Hi Ho').slice(0, 8),
    punjabi: localTracks.filter(t => t.category === 'Punjabi' || t.searchTag === 'Diljit Dosanjh' || t.searchTag === 'AP Dhillon').slice(0, 8)
  };

  res.json({
    success: true,
    source: 'local_fallback',
    ...fallbackFeed
  });
};

// GET /api/music/search
exports.search = async (req, res) => {
  const query = (req.query.q || '').trim();
  const limit = parseInt(req.query.limit, 10) || 16;

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
  const localTracks = getStoredAudiusTracks();
  const lower = query.toLowerCase();
  const localMatches = localTracks.filter(t =>
    (t.title && t.title.toLowerCase().includes(lower)) ||
    (t.artist && t.artist.toLowerCase().includes(lower)) ||
    (t.genre && t.genre.toLowerCase().includes(lower)) ||
    (t.category && t.category.toLowerCase().includes(lower)) ||
    (t.searchTag && t.searchTag.toLowerCase().includes(lower))
  );

  res.json({
    success: true,
    source: 'local_fallback',
    query,
    count: localMatches.slice(0, limit).length,
    tracks: localMatches.slice(0, limit)
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
