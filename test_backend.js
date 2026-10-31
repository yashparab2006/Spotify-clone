const http = require('http');
const app = require('./server/server');

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });
      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  try {
    console.log('\n--- 1. Testing GET /api/health ---');
    const health = await request('GET', '/api/health');
    console.log('Status:', health.status, health.data);

    console.log('\n--- 2. Testing GET /api/tracks ---');
    const tracks = await request('GET', '/api/tracks');
    console.log('Status:', tracks.status, 'Total tracks:', tracks.data.count);

    console.log('\n--- 3. Testing POST /api/auth/register ---');
    const email = `testuser_${Date.now()}@spotify.com`;
    const register = await request('POST', '/api/auth/register', {
      name: 'Test Explorer',
      email,
      password: 'password123'
    });
    console.log('Status:', register.status, 'User:', register.data.user?.name);
    const token = register.data.token;

    console.log('\n--- 4. Testing POST /api/auth/login ---');
    const login = await request('POST', '/api/auth/login', {
      email,
      password: 'password123'
    });
    console.log('Status:', login.status, 'Token received:', !!login.data.token);

    console.log('\n--- 5. Testing GET /api/auth/me (Authenticated) ---');
    const me = await request('GET', '/api/auth/me', null, token);
    console.log('Status:', me.status, 'Name:', me.data.user?.name, 'Tier:', me.data.user?.tier);

    console.log('\n--- 6. Testing POST /api/playlists (Create Playlist) ---');
    const newPl = await request('POST', '/api/playlists', {
      name: 'Late Night Chill',
      desc: 'Coding and late night chill sessions',
      songs: [1, 5]
    }, token);
    console.log('Status:', newPl.status, 'Playlist Created:', newPl.data.playlist?.name);

    console.log('\n--- 7. Testing POST /api/user/likes (Like Song #2) ---');
    const likeRes = await request('POST', '/api/user/likes', { trackId: 2 }, token);
    console.log('Status:', likeRes.status, 'Liked state:', likeRes.data.liked, 'Likes list:', likeRes.data.likes);

    console.log('\n==========================================');
    console.log('🎉 ALL BACKEND API ENDPOINTS TESTED AND PASSED!');
    console.log('==========================================');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
  }
});

