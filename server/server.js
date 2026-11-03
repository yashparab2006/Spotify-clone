const express = require('express');
const cors = require('cors');
const path = require('path');
const { randomUUID: uuidv4 } = require('crypto');
const config = require('./config/config');
const store = require('./data/store');

// Initialize Express App
const app = express();
const rootDir = path.join(__dirname, '..');

// Configure EJS Template Engine
app.set('view engine', 'ejs');
app.set('views', path.join(rootDir, 'views'));

// Middlewares
app.use(cors());

// UUID Request Correlation ID Middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.originalUrl} [${req.id}] -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Serve Static Frontend Assets
app.use('/html', express.static(path.join(rootDir, 'html')));
app.use('/css', express.static(path.join(rootDir, 'css')));
app.use('/js', express.static(path.join(rootDir, 'js')));
app.use('/assesst', express.static(path.join(rootDir, 'assesst')));
app.get('/bundle.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(rootDir, 'bundle.js'));
});
app.get('/html/bundle.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(rootDir, 'bundle.js'));
});

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    requestId: req.id,
    timestamp: new Date().toISOString(),
    service: 'Spotify Clone Express Backend with EJS & UUID',
    version: '1.0.0',
    templateEngine: 'EJS',
    uptime: process.uptime()
  });
});

// REST API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tracks', require('./routes/trackRoutes'));
app.use('/api/playlists', require('./routes/playlistRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/podcasts', require('./routes/podcastRoutes'));
app.use('/api/music', require('./routes/musicApiRoutes'));

// =========================================================================
// EJS DYNAMIC SERVER-SIDE RENDERED (SSR) ROUTES
// =========================================================================

// Home View (Dynamic Tracks, Greeting, and Playlists)
app.get(['/', '/home'], (req, res) => {
  const tracks = store.getTracks();
  const data = store.readData();
  const user = data.users && data.users[0] ? data.users[0] : null;
  const playlists = store.getPlaylists(user ? user.id : 1);
  res.render('index', { tracks, user, playlists });
});

// Music / Now Playing View
app.get('/music', (req, res) => {
  const tracks = store.getTracks();
  const data = store.readData();
  const user = data.users && data.users[0] ? data.users[0] : null;
  const playlists = store.getPlaylists(user ? user.id : 1);
  res.render('index', { tracks, user, playlists, activePage: 'music' });
});

app.get('/music.html', (req, res) => {
  res.redirect('/html/music.html');
});

// Search & Browse View
app.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  const tracks = store.getTracks();
  const results = q ? store.getTracks({ q }) : [];
  const data = store.readData();
  const user = data.users && data.users[0] ? data.users[0] : null;
  const playlists = store.getPlaylists(user ? user.id : 1);
  res.render('search', { tracks, results, searchQuery: q, user, playlists });
});

// Library View (Custom Playlists & Liked Songs)
app.get('/library', (req, res) => {
  const data = store.readData();
  const user = data.users && data.users[0] ? data.users[0] : null;
  const playlists = store.getPlaylists(user ? user.id : 1);
  const likes = store.getLikes(user ? user.id : 1);
  res.render('library', { user, playlists, likes });
});

// Podcasts & Shows View
app.get('/podcasts', (req, res) => {
  const data = store.readData();
  const user = data.users && data.users[0] ? data.users[0] : null;
  const playlists = store.getPlaylists(user ? user.id : 1);
  const podcasts = [
    { id: 1, name: "The Daily Tech Brief", category: "Technology", host: "Spotify Studios", cover: "/assesst/card1img.jpeg" },
    { id: 2, name: "Crime Solvers Society", category: "True Crime", host: "Elena Vance", cover: "/assesst/card2img.jpeg" },
    { id: 3, name: "Standup & Giggle", category: "Comedy", host: "Marcus & Friends", cover: "/assesst/card3img.jpeg" },
    { id: 4, name: "Morning Global Dispatch", category: "News", host: "Global Editorial Board", cover: "/assesst/card4img.jpeg" },
    { id: 5, name: "Mind & Body Mastery", category: "Health & Fitness", host: "Dr. Maya Patel", cover: "/assesst/card5img.jpeg" }
  ];
  res.render('podcasts', { podcasts, user, playlists });
});

// Premium Plans View
app.get('/premium', (req, res) => {
  const data = store.readData();
  const user = data.users && data.users[0] ? data.users[0] : null;
  const playlists = store.getPlaylists(user ? user.id : 1);
  res.render('premium', { user, playlists });
});

// User Profile View
app.get('/profile', (req, res) => {
  const data = store.readData();
  const user = data.users && data.users[0] ? data.users[0] : null;
  const playlists = store.getPlaylists(user ? user.id : 1);
  const likes = store.getLikes(user ? user.id : 1);
  res.render('profile', { user, playlists, likes });
});

// Auth / Login / Sign Up View
app.get(['/auth', '/login', '/signup', '/register'], (req, res) => {
  const data = store.readData();
  const user = data.users && data.users[0] ? data.users[0] : null;
  const playlists = store.getPlaylists(user ? user.id : 1);
  const tab = req.query.tab || (req.path.includes('signup') || req.path.includes('register') ? 'register' : 'login');
  res.render('auth', { user, playlists, tab });
});

// Create Playlist View (Directs to Library)
app.get(['/create-playlist', '/create-playlist.html'], (req, res) => {
  res.redirect('/library');
});

// Handle .html extensions cleanly
app.get('/:page.html', (req, res, next) => {
  const p = req.params.page;
  if (['index', 'home'].includes(p)) return res.redirect('/');
  if (['search', 'library', 'podcasts', 'premium', 'profile', 'auth', 'login', 'signup'].includes(p)) return res.redirect('/' + p);
  next();
});

// Footer Pages Dictionary (Universal SSR Detail Rendering)
const footerPageMap = {
  about: { title: "About Us", category: "Company", tagline: "Band together for the future of audio.", highlights: [{ heading: "626M+ Listeners", text: "Active music fans around the world." }, { heading: "100M+ Songs", text: "Unrivaled global audio catalog." }], paragraphs: ["Spotify transformed music listening forever when it launched in 2008. Today, more than 626 million people in 184 markets use Spotify to discover, manage, and share audio.", "Our mission is to unlock the potential of human creativity by giving artists the opportunity to live off their art and billions of fans the opportunity to enjoy it."] },
  jobs: { title: "Careers & Jobs", category: "Company", tagline: "Work that hits the right notes with world-class engineers.", highlights: [{ heading: "Global Teams", text: "Remote & hybrid opportunities in 25+ cities." }, { heading: "Inclusive Culture", text: "Empowering every creator and builder." }], paragraphs: ["Join our band. At Spotify, you’ll help shape how millions of people connect with culture and music.", "Explore engineering, design, data science, product management, and content roles across our global hubs."] },
  'for-the-record': { title: "For the Record", category: "Company", tagline: "Official Spotify news, audio stories, and culture dispatches.", highlights: [{ heading: "Press Dispatches", text: "Verified announcements and releases." }, { heading: "Audio Trends", text: "Data insights from global music listening." }], paragraphs: ["For the Record is the official source for news, culture, product announcements, and behind-the-scenes stories from Spotify."] },
  'for-artists': { title: "Spotify for Artists", category: "Communities", tagline: "Get the data, tools, and community to grow your fanbase.", highlights: [{ heading: "Real-Time Stats", text: "Track audience streams and listener demographics." }, { heading: "Artist Profile", text: "Manage your discography, header images, and bio." }], paragraphs: ["Spotify for Artists provides artists and their teams with the tools and insights to release music, pitch to playlists, and build a lasting career."] },
  developers: { title: "Spotify for Developers", category: "Communities", tagline: "Build apps with the Spotify Web API, SDKs, and audio player engine.", highlights: [{ heading: "REST Web API", text: "Query tracks, albums, artists, and playlists." }, { heading: "Web Playback SDK", text: "Embed full playback in your own applications." }], paragraphs: ["Connect your app with millions of songs, playlists, and user libraries using our documented APIs, Webhooks, and client SDKs."] },
  legal: { title: "Legal Terms & Agreements", category: "Legal & Privacy", tagline: "Important contractual terms, usage terms, and guidelines.", highlights: [{ heading: "User Agreement", text: "Clear policies governing service usage." }, { heading: "Intellectual Property", text: "Protecting copyright and original works." }], paragraphs: ["Review Spotify Terms and Conditions of Use, End User Agreement, and community rules ensuring a fair, lawful experience for all users."] },
  'privacy-policy': { title: "Privacy Policy", category: "Legal & Privacy", tagline: "How Spotify collects, protects, and respects your personal data.", highlights: [{ heading: "Data Transparency", text: "Control your listening privacy and data sharing." }, { heading: "Security First", text: "End-to-end encryption and compliance standards." }], paragraphs: ["This Privacy Policy explains what personal information we collect, why we collect it, and how you can manage and delete your information."] },
  cookies: { title: "Cookies Policy", category: "Legal & Privacy", tagline: "Learn how cookies and similar web technologies are used on Spotify.", highlights: [{ heading: "Essential Cookies", text: "Strictly necessary for login and player functionality." }, { heading: "Custom Preferences", text: "Adjust cookie settings anytime." }], paragraphs: ["We use cookies and related tracking technologies to remember your preferences, keep you signed in, and tailor your music recommendations."] },
  'safety-privacy-center': { title: "Safety & Privacy Center", category: "Legal & Privacy", tagline: "Tools, guides, and policies to protect your privacy and account security.", highlights: [{ heading: "Account Protection", text: "Two-factor authentication and login alerts." }, { heading: "Content Safety", text: "Proactive reporting tools for abusive media." }], paragraphs: ["Our Safety & Privacy Center gives you control over who sees your activity, your playlists, and your personal profile."] }
};

app.get(['/footer/:slug', '/:slug(about|jobs|for-the-record|for-artists|for-creator|for-creators|for-author|for-authors|developers|adversting|advertising|investor|investors|vendor|vendors|support|free-mobile-app|popluar-for-country|popular-by-country|top-song-lryics|top-song-lyrics|import-your-music|premium-standard|premium-plaitium|premium-platinum|premium-student|spotify-free|legal|privacy-policy|cookies|safety-privacy-center|about-ads|accessibility)'], (req, res) => {
  const slug = req.params.slug;
  const page = footerPageMap[slug] || {
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    category: "Information",
    tagline: `Official Spotify resource page for ${slug.replace(/-/g, ' ')}.`,
    highlights: [{ heading: "Official Resource", text: "Spotify platform reference guide." }],
    paragraphs: [`Welcome to Spotify's official resource page for ${slug.replace(/-/g, ' ')}. We are continuously updating our documentation and services.`]
  };
  const data = store.readData();
  const user = data.users && data.users[0] ? data.users[0] : null;
  const playlists = store.getPlaylists(user ? user.id : 1);
  res.render('footer-detail', { pageTitle: `Spotify - ${page.title}`, page, user, playlists });
});

// 404 handler for unhandled API calls
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

// Start Server
if (require.main === module) {
  const PORT = config.PORT;
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🎵 Spotify Clone (Express + EJS) running at: http://localhost:${PORT}`);
    console.log(`📡 Health Check endpoint:                   http://localhost:${PORT}/api/health`);
    console.log(`🎶 Tracks API endpoint:                     http://localhost:${PORT}/api/tracks`);
    console.log(`🔐 Auth API endpoint:                       http://localhost:${PORT}/api/auth`);
    console.log(`📄 Dynamic EJS Pages:                       http://localhost:${PORT}/ (Home, Search, Library, Podcasts, Premium, Profile)`);
    console.log(`=======================================================`);
  });
}

module.exports = app;

