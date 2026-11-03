const http = require('http');
const app = require('./server/server');

console.log('Testing Express app in-process (Sandboxed Mode)...');

// Helper to make mock requests using http.request against an in-process listener
// or running directly via app(req, res) with EventEmitter mocks
const { EventEmitter } = require('events');

function createMockReqRes({ method = 'GET', url = '/', headers = {}, body = null }) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.originalUrl = url;
  req.headers = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  req.rawHeaders = [];
  req.connection = {};
  req.socket = {};

  const res = new EventEmitter();
  res.statusCode = 200;
  res._headers = {};
  res._body = '';

  res.setHeader = (key, value) => { res._headers[key.toLowerCase()] = value; };
  res.getHeader = (key) => res._headers[key.toLowerCase()];
  res.removeHeader = (key) => { delete res._headers[key.toLowerCase()]; };

  res.render = (view, options, fn) => {
    app.render(view, options, (err, str) => {
      if (err) {
        if (fn) return fn(err);
        return res.status(500).send(err.message);
      }
      if (fn) return fn(null, str);
      res.setHeader('content-type', 'text/html');
      res.send(str);
    });
  };

  res.sendFile = (filePath) => {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('content-type', 'application/javascript');
      res.send(content);
    } catch (e) {
      res.status(404).send('Not Found');
    }
  };

  return { req, res };
}

async function executeMockRequest(method, url, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const { req, res } = createMockReqRes({
      method,
      url,
      headers: {
        'content-type': 'application/json',
        ...(token ? { 'authorization': `Bearer ${token}` } : {})
      }
    });

    let finished = false;
    function finish(data) {
      if (finished) return;
      finished = true;
      let parsed = data;
      try { parsed = JSON.parse(data); } catch (e) {}
      resolve({ statusCode: res.statusCode, headers: res._headers, body: parsed });
    }

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };

    res.json = (json) => {
      res.setHeader('content-type', 'application/json');
      finish(json);
      return res;
    };

    res.send = (text) => {
      finish(text);
      return res;
    };

    res.end = (chunk) => {
      finish(chunk || '');
      return res;
    };

    if (body) {
      req.body = body; // Pre-populate if stream is synchronous
    }

    app(req, res, (err) => {
      if (err) reject(err);
      else finish('Not Found');
    });

    process.nextTick(() => {
      if (body) {
        req.emit('data', Buffer.from(JSON.stringify(body)));
      }
      req.emit('end');
    });
  });
}

async function run() {
  try {
    console.log('1. GET /api/health');
    const health = await executeMockRequest('GET', '/api/health');
    console.log('   Response:', health.statusCode, health.body);

    console.log('2. GET /api/tracks');
    const tracks = await executeMockRequest('GET', '/api/tracks');
    console.log('   Tracks Count:', tracks.body.count, '| First track:', tracks.body.tracks[0].title);

    console.log('3. GET /api/tracks?q=Starboy');
    const filtered = await executeMockRequest('GET', '/api/tracks?q=Starboy');
    console.log('   Filtered count:', filtered.body.count, '| Found:', filtered.body.tracks[0].title);

    console.log('4. POST /api/auth/login (alex@spotify.com)');
    const login = await executeMockRequest('POST', '/api/auth/login', {
      email: 'alex@spotify.com',
      password: 'password123'
    });
    console.log('   Login status:', login.statusCode, '| Token received:', !!login.body.token);

    const token = login.body.token;

    console.log('5. GET /api/auth/me (Authenticated with JWT)');
    const me = await executeMockRequest('GET', '/api/auth/me', null, token);
    console.log('   Current User:', me.body.user.name, '| Tier:', me.body.user.tier);

    console.log('6. GET /api/playlists (Authenticated)');
    const pl = await executeMockRequest('GET', '/api/playlists', null, token);
    console.log('   Playlists:', pl.body.count);

    console.log('6b. POST /api/playlists (Create playlist with UUID)');
    const newPl = await executeMockRequest('POST', '/api/playlists', { name: 'Late Night Chill' }, token);
    console.log('   Created Playlist ID (UUID):', newPl.body.playlist?.id, '| Valid UUID format:', /^[0-9a-f-]{36}$/i.test(newPl.body.playlist?.id));

    console.log('7. POST /api/user/likes (Toggle like on track 6)');
    const likeRes = await executeMockRequest('POST', '/api/user/likes', { trackId: 6 }, token);
    console.log('   Liked status:', likeRes.body.liked, '| Total liked songs:', likeRes.body.likes.length);

    console.log('8. GET /api/search?q=Rahat');
    const searchRes = await executeMockRequest('GET', '/api/search?q=Rahat');
    console.log('   Search Results count:', searchRes.body.total, '| First track:', searchRes.body.results.tracks[0]?.title);

    console.log('9. GET /api/podcasts');
    const podcastRes = await executeMockRequest('GET', '/api/podcasts');
    console.log('   Podcasts count:', podcastRes.body.count, '| First show:', podcastRes.body.podcasts[0]?.name);

    console.log('\n--- Testing EJS Server-Side Rendered Views ---');
    console.log('10. GET / (Render Home index.ejs)');
    const homeView = await executeMockRequest('GET', '/');
    console.log('    Status:', homeView.statusCode, '| Rendered length:', typeof homeView.body === 'string' ? homeView.body.length : 'JSON', '| Contains Spotify:', typeof homeView.body === 'string' && homeView.body.includes('Spotify'));

    console.log('11. GET /search (Render search.ejs)');
    const searchView = await executeMockRequest('GET', '/search?q=Starboy');
    console.log('    Status:', searchView.statusCode, '| Rendered length:', typeof searchView.body === 'string' ? searchView.body.length : 'JSON');

    console.log('12. GET /library (Render library.ejs)');
    const libView = await executeMockRequest('GET', '/library');
    console.log('    Status:', libView.statusCode, '| Rendered length:', typeof libView.body === 'string' ? libView.body.length : 'JSON');

    console.log('13. GET /podcasts (Render podcasts.ejs)');
    const podView = await executeMockRequest('GET', '/podcasts');
    console.log('    Status:', podView.statusCode, '| Rendered length:', typeof podView.body === 'string' ? podView.body.length : 'JSON');

    console.log('14. GET /about (Render footer-detail.ejs for About Us)');
    const aboutView = await executeMockRequest('GET', '/about');
    console.log('    Status:', aboutView.statusCode, '| Contains About Us:', typeof aboutView.body === 'string' && aboutView.body.includes('About Us'));

    console.log('\n--- Testing Audius Music API Proxy Endpoints ---');
    console.log('15. GET /api/music/trending');
    const musicTrending = await executeMockRequest('GET', '/api/music/trending?limit=6');
    console.log('    Status:', musicTrending.statusCode, '| Success:', musicTrending.body.success, '| Source:', musicTrending.body.source, '| Track Count:', musicTrending.body.count, '| First Track:', musicTrending.body.tracks?.[0]?.title);

    console.log('16. GET /api/music/search?q=pop');
    const musicSearch = await executeMockRequest('GET', '/api/music/search?q=pop&limit=5');
    console.log('    Status:', musicSearch.statusCode, '| Success:', musicSearch.body.success, '| Source:', musicSearch.body.source, '| Query:', musicSearch.body.query, '| Results Count:', musicSearch.body.count);

    console.log('17. GET /api/music/feed (Multi-genre home feed)');
    const musicFeed = await executeMockRequest('GET', '/api/music/feed');
    console.log('    Status:', musicFeed.statusCode, '| Success:', musicFeed.body.success, '| Source:', musicFeed.body.source, '| Trending tracks:', musicFeed.body.trending?.length, '| EDM tracks:', musicFeed.body.electronic?.length, '| Bollywood tracks:', musicFeed.body.bollywood?.length);

    console.log('18. GET /api/music/bollywood (Dedicated Bollywood endpoint)');
    const musicBolly = await executeMockRequest('GET', '/api/music/bollywood?limit=8');
    console.log('    Status:', musicBolly.statusCode, '| Success:', musicBolly.body.success, '| Source:', musicBolly.body.source, '| Track Count:', musicBolly.body.count, '| Sample Track:', musicBolly.body.tracks?.[0]?.title, 'by', musicBolly.body.tracks?.[0]?.artist);

    console.log('19. GET /bundle.js (Standalone universal bundle)');
    const bundleRes = await executeMockRequest('GET', '/bundle.js');
    console.log('    Status:', bundleRes.statusCode, '| Content-Type:', bundleRes.headers['content-type'], '| Length:', typeof bundleRes.body === 'string' ? bundleRes.body.length : 'N/A', '| Contains runApp:', typeof bundleRes.body === 'string' && bundleRes.body.includes('runApp'));

    console.log('20. GET /auth?tab=login & GET /signup');
    const authRes = await executeMockRequest('GET', '/auth?tab=login');
    const signupRes = await executeMockRequest('GET', '/signup');
    console.log('    /auth Status:', authRes.statusCode, '| /signup Status:', signupRes.statusCode, '| Has loginForm:', typeof authRes.body === 'string' && authRes.body.includes('id="loginForm"'));

    console.log('21. Verify Search Page Elements');
    const searchCheck = await executeMockRequest('GET', '/search');
    const hasBrowseGrid = typeof searchCheck.body === 'string' && searchCheck.body.includes('id="browseGrid"');
    const hasSearchDefault = typeof searchCheck.body === 'string' && searchCheck.body.includes('id="searchDefault"');
    const hasSearchResults = typeof searchCheck.body === 'string' && searchCheck.body.includes('id="searchResults"');
    const hasSearchResultCards = typeof searchCheck.body === 'string' && searchCheck.body.includes('id="searchResultCards"');
    console.log('    Status:', searchCheck.statusCode, '| browseGrid:', hasBrowseGrid, '| searchDefault:', hasSearchDefault, '| searchResults:', hasSearchResults, '| searchResultCards:', hasSearchResultCards);

    console.log('22. Verify Live Audio Spectrum Visualizer Elements');
    const musicCheck = await executeMockRequest('GET', '/music');
    const hasVisualizerContainer = typeof musicCheck.body === 'string' && musicCheck.body.includes('id="musicVisualizerContainer"');
    const hasVisualizerCanvas = typeof musicCheck.body === 'string' && musicCheck.body.includes('id="audioVisualizerCanvas"');
    const hasCanvasClass = typeof musicCheck.body === 'string' && musicCheck.body.includes('class="audio-visualizer-canvas"');
    const hasBarsMode = typeof musicCheck.body === 'string' && musicCheck.body.includes('data-mode="bars"');
    const hasWaveMode = typeof musicCheck.body === 'string' && musicCheck.body.includes('data-mode="wave"');
    const hasRadialMode = typeof musicCheck.body === 'string' && musicCheck.body.includes('data-mode="radial"');
    const hasToggleBtn = typeof musicCheck.body === 'string' && musicCheck.body.includes('id="visualizerToggleBtn"');
    console.log('    Status:', musicCheck.statusCode, '| Visualizer Container:', hasVisualizerContainer, '| Canvas:', hasVisualizerCanvas, '| Canvas Class:', hasCanvasClass, '| Modes (Bars, Wave, Radial):', hasBarsMode && hasWaveMode && hasRadialMode, '| Toggle:', hasToggleBtn);

    console.log('\nAll Express.js routes, EJS Templates, and Music API Endpoints executed cleanly in-process!');
  } catch (err) {
    console.error('Test error:', err);
  }
}

run();
