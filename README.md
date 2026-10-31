# Spotify Full-Stack Web Application

A full-featured Spotify Clone built with **HTML5, CSS3, JavaScript (Web Audio API)** on the frontend, and **Node.js + Express.js + EJS Templates** on the backend.

---

## 🚀 Quick Start

### 1. Start the Express + EJS Server

```bash
npm start
```

Or run directly with Node:

```bash
node server/server.js
```

The server will start listening on:
👉 **`http://localhost:5000`**

Open `http://localhost:5000` in your web browser. The server renders dynamic **EJS views** with real server data, while serving all static assets (`css/`, `js/`, `assesst/`, and `bundle.js`).

---

## 🗂️ Project Structure

```text
05_Spotify_Clone/
├── views/                        # EJS Server-Side Rendered Templates
│   ├── partials/
│   │   ├── head.ejs              # Meta tags, fonts, styles, favicon
│   │   ├── sidebar.ejs           # Spotify left sidebar & legal links
│   │   ├── topbar.ejs            # Sticky navigation, search, profile menu
│   │   ├── right-rail.ejs        # Collapsible rail & sliding window
│   │   ├── player.ejs            # Bottom music player & playback controls
│   │   ├── modals.ejs            # Profile edit, language, subscription modals
│   │   └── scripts.ejs           # Universal client bundle loader
│   ├── index.ejs                 # Home page (dynamic track cards & greeting)
│   ├── search.ejs                # Search & browse genres
│   ├── library.ejs               # User library, playlists, & liked songs
│   ├── podcasts.ejs              # Podcast categories & featured shows
│   ├── premium.ejs               # Premium subscription plans
│   ├── profile.ejs               # User account overview & stats
│   └── footer-detail.ejs         # Universal layout for all 25+ footer pages
├── css/
│   └── style.css                 # Master Spotify desktop & mobile stylesheet
├── html/                         # Static fallback HTML pages
├── js/
│   ├── api.js                    # Universal API client communicating with /api/*
│   ├── app.js                    # Core player, DOM handlers, state sync
│   ├── music.js                  # Web Audio API polyphonic chord synthesizer
│   ├── auth.js                   # Sign-in, sign-up, JWT token management
│   ├── playlist.js               # Seed track definitions & lyric sheets
│   └── footerData.js             # Rich content data for all sub-screens
├── server/
│   ├── config/config.js          # Port (5000), JWT secret, and database configuration
│   ├── data/
│   │   ├── database.json         # JSON persistence storage
│   │   └── store.js              # Thread-safe read/write datastore
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT Bearer token authentication
│   ├── controllers/              # Auth, Track, Playlist, User, Search, Podcast controllers
│   ├── routes/                   # REST API routes (/api/*)
│   └── server.js                 # Express server with EJS view engine configuration
├── package.json
└── README.md
```
```

---

## 🔑 Pre-Seeded Test Credentials

| Role | Email | Password | Tier |
| :--- | :--- | :--- | :--- |
| **Demo User** | `alex@spotify.com` | `password123` | Spotify Free / Premium |

*You can also register any new account on the Auth screen or via `POST /api/auth/register`.*

---

## 📡 REST API Documentation

### Health Check
- `GET /api/health` — Returns `{ status: "ok", timestamp: ... }`

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Create a new user (`name`, `email`, `password`, `birthYear`)
- `POST /api/auth/login` — Login with credentials, returns JWT token
- `GET /api/auth/me` — Retrieve current authenticated user profile *(requires `Bearer <token>`)*
- `PUT /api/auth/profile` — Update display name, avatar, bio, or country *(requires `Bearer <token>`)*

### Tracks (`/api/tracks`)
- `GET /api/tracks` — Fetch all tracks. Supports `?q=<term>` and `?genre=<genre>`
- `GET /api/tracks/:id` — Fetch track by ID

### Search & Podcasts (`/api/search`, `/api/podcasts`)
- `GET /api/search?q=<term>` — Unified search across tracks, artists, and playlists
- `GET /api/podcasts` — Browse podcast shows and categories (`?category=<category>&q=<term>`)
- `GET /api/podcasts/:id` — Retrieve podcast show details by ID

### Playlists (`/api/playlists`)
- `GET /api/playlists` — List current user's playlists *(requires `Bearer <token>`)*
- `POST /api/playlists` — Create new playlist (`name`, `description`) *(requires `Bearer <token>`)*
- `GET /api/playlists/:id` — Get playlist details *(requires `Bearer <token>`)*
- `PUT /api/playlists/:id` — Update playlist title or description *(requires `Bearer <token>`)*
- `DELETE /api/playlists/:id` — Delete playlist *(requires `Bearer <token>`)*
- `POST /api/playlists/:id/tracks` — Add track to playlist (`trackId`) *(requires `Bearer <token>`)*
- `DELETE /api/playlists/:id/tracks/:trackId` — Remove track from playlist *(requires `Bearer <token>`)*

### User Preferences & Subscriptions (`/api/user`)
- `GET /api/user/likes` — Fetch IDs of liked songs *(requires `Bearer <token>`)*
- `POST /api/user/likes` — Toggle liked status of track (`trackId`) *(requires `Bearer <token>`)*
- `PUT /api/user/subscription` — Upgrade or change subscription tier (`tier`) *(requires `Bearer <token>`)*

---

## ⚡ Features

1. **Full-Stack Synergy**: Real-time HTTP REST communication with Express while seamlessly falling back to `localStorage` when offline.
2. **Audio Engine**: Polyphonic Web Audio API synthesis with real musical chords, tempo, frequency roots, and dynamic lyrics display.
3. **Collapsible Right Rail & Sliding Window**:
   - Collapsed rail (48px) with centered `<` chevron and "Now playing view" tooltip.
   - Mouse & touch drag-to-slide mechanics to pull the window open.
   - Expanded state with "Find something to play", green "Search" button, and active track details.
4. **Clean Folder Architecture**: All CSS in `css/`, all 34 HTML screens in `html/`, all frontend logic in `js/`, and server in `server/`.

