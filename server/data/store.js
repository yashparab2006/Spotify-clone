const fs = require('fs');
const path = require('path');
const { randomUUID: uuidv4 } = require('crypto');
const config = require('../config/config');

const dataDir = path.dirname(config.DATA_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const seedTracks = [
  {
    id: 1,
    title: "Top 50 - Global",
    artist: "Spotify Charts",
    genre: "Pop / Charts",
    img: "/assesst/card1img.jpeg",
    duration: 213,
    rootFreq: 261.63,
    tempo: 104,
    lyrics: [
      "♪ Welcome to the Top 50 - Global countdown ♪",
      "Trending all across the worldwide waves",
      "Number one vibes taking over the stage",
      "Turn the volume higher, let the rhythm ignite",
      "Global hits echoing throughout the night"
    ]
  },
  {
    id: 2,
    title: "Mahiya Jinna Sohna",
    artist: "Darshan Raval",
    genre: "Romantic / Bollywood",
    img: "/assesst/card2img.jpeg",
    duration: 195,
    rootFreq: 293.66,
    tempo: 92,
    lyrics: [
      "♪ Tu hi meri zindagani, tu hi chain mera ♪",
      "Mahiya jinna sohna koi hor na mileya",
      "Akhiyan ch teri bas khwab sajaake",
      "Rabb ton vi pehla tera naam leya"
    ]
  },
  {
    id: 3,
    title: "Mere Paas Tum Ho",
    artist: "Rahat Fateh Ali Khan",
    genre: "Sufi / Soul",
    img: "/assesst/card3img.jpeg",
    duration: 248,
    rootFreq: 220.00,
    tempo: 78,
    lyrics: [
      "♪ Bhool jaane ka hunar mujhko sikhate jaao ♪",
      "Ja rahe ho toh sabhi naqsh mitaate jaao",
      "Chalo maana ki yeh kismat ka faisla tha",
      "Mere paas tum ho, bas itna bataate jaao"
    ]
  },
  {
    id: 4,
    title: "Naa Ready - Leo",
    artist: "Anirudh Ravichander, Thalapathy Vijay",
    genre: "Soundtracks / Mass",
    img: "/assesst/card4img.jpeg",
    duration: 188,
    rootFreq: 329.63,
    tempo: 128,
    lyrics: [
      "♪ Aagasam idikithu, aalungallum aaduthu ♪",
      "Naa ready thaan varava, aiyya thaaru maara varava",
      "Thannanthani aalaaga vaaren da",
      "Thalapathy entry tharuvein da!"
    ]
  },
  {
    id: 5,
    title: "Starboy",
    artist: "The Weeknd, Daft Punk",
    genre: "R&B / Synthpop",
    img: "/assesst/card3img.jpeg",
    duration: 230,
    rootFreq: 246.94,
    tempo: 112,
    lyrics: [
      "♪ I'm trying to put you in the worst mood, ah ♪",
      "P1 cleaner than your church shoes, ah",
      "Look what you've done",
      "I'm a starboy!"
    ]
  },
  {
    id: 6,
    title: "Blinding Lights",
    artist: "The Weeknd",
    genre: "Synthwave / Pop",
    img: "/assesst/card4img.jpeg",
    duration: 200,
    rootFreq: 349.23,
    tempo: 130,
    lyrics: [
      "♪ I've been on my own for long enough ♪",
      "Maybe you can show me how to love, maybe",
      "I'm blinded by the lights",
      "No, I can't sleep until I feel your touch"
    ]
  },
  {
    id: 7,
    title: "Top Songs - Global",
    artist: "Weekly Music Charts",
    genre: "Hits / International",
    img: "/assesst/card5img.jpeg",
    duration: 222,
    rootFreq: 261.63,
    tempo: 100,
    lyrics: [
      "♪ Global vibes spinning all week long ♪",
      "Catch the sound of the world in a single song",
      "Melodies in flight under the northern sky"
    ]
  },
  {
    id: 8,
    title: "Top Songs - India",
    artist: "Weekly Music Charts - India",
    genre: "Desi / Regional",
    img: "/assesst/card6img.jpeg",
    duration: 175,
    rootFreq: 293.66,
    tempo: 108,
    lyrics: [
      "♪ Desi beats and rhythms that never cease ♪",
      "Bollywood magic and regional masterpiece",
      "Dance through the streets till the break of day"
    ]
  },
  {
    id: 9,
    title: "Trending Chill Hits",
    artist: "Spotify Curated",
    genre: "Lo-Fi / Ambient",
    img: "/assesst/card1img.jpeg",
    duration: 205,
    rootFreq: 220.00,
    tempo: 84,
    lyrics: [
      "♪ Gentle breeze softly drifting by ♪",
      "Lo-fi frequencies soothing your mind",
      "Take a deep breath and let the worries unwind"
    ]
  }
];

function initDatabase() {
  if (!fs.existsSync(config.DATA_PATH)) {
    const initialData = {
      users: [
        {
          id: 1,
          name: "Alex Morgan",
          email: "alex@spotify.com",
          // password: "password123" hashed with bcryptjs
          passwordHash: "$2a$10$JwAyTu3n7NjTWhRiRdI4ZeSfaedTymher67AOIBT24toqOCX/HetG",
          avatar: "/assesst/logo.png",
          bio: "Music lover & curator. Exploring audio frequencies on Spotify.",
          tier: "Spotify Free",
          createdAt: new Date().toISOString()
        }
      ],
      tracks: seedTracks,
      playlists: [
        {
          id: 1,
          userId: 1,
          name: "My Daily Favorites",
          desc: "Fresh morning hits and top recommendations",
          cover: "/assesst/card1img.jpeg",
          songs: [1, 2, 5, 6],
          createdAt: new Date().toISOString()
        }
      ],
      likes: {
        "1": [1, 2, 5]
      }
    };
    fs.writeFileSync(config.DATA_PATH, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

initDatabase();

function readData() {
  try {
    const raw = fs.readFileSync(config.DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    initDatabase();
    return JSON.parse(fs.readFileSync(config.DATA_PATH, 'utf8'));
  }
}

function writeData(data) {
  fs.writeFileSync(config.DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  readData,
  writeData,
  // Users
  findUserByEmail(email) {
    const data = readData();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById(id) {
    const data = readData();
    return data.users.find(u => u.id === Number(id));
  },
  createUser(userData) {
    const data = readData();
    const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    const userUuid = uuidv4();
    const user = {
      id: newId,
      uuid: userUuid,
      name: userData.name || userData.email.split('@')[0],
      email: userData.email,
      passwordHash: userData.passwordHash,
      avatar: userData.avatar || "/assesst/logo.png",
      bio: userData.bio || "Listening on Spotify",
      tier: "Spotify Free",
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    if (!data.likes[newId]) data.likes[newId] = [];
    writeData(data);
    return user;
  },
  updateUser(id, updates) {
    const data = readData();
    const user = data.users.find(u => u.id === Number(id));
    if (!user) return null;
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.avatar !== undefined) user.avatar = updates.avatar;
    if (updates.tier !== undefined) user.tier = updates.tier;
    writeData(data);
    return user;
  },

  // Tracks
  getTracks(query = {}) {
    const data = readData();
    let result = [...data.tracks];
    if (query.q) {
      const q = query.q.toLowerCase().trim();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    if (query.genre) {
      result = result.filter(t => t.genre.toLowerCase().includes(query.genre.toLowerCase()));
    }
    return result;
  },
  getTrackById(id) {
    const data = readData();
    return data.tracks.find(t => t.id === Number(id)) || null;
  },

  // Playlists
  getPlaylists(userId) {
    const data = readData();
    return data.playlists.filter(p => p.userId === Number(userId));
  },
  getPlaylistById(id) {
    const data = readData();
    return data.playlists.find(p => String(p.id) === String(id)) || null;
  },
  createPlaylist(userId, playlistData) {
    const data = readData();
    const playlistId = uuidv4();
    const playlist = {
      id: playlistId,
      userId: Number(userId),
      name: playlistData.name || `My Playlist #${playlistId.slice(0, 8)}`,
      desc: playlistData.desc || "Curated playlist",
      cover: playlistData.cover || "/assesst/card1img.jpeg",
      songs: Array.isArray(playlistData.songs) ? playlistData.songs : [],
      createdAt: new Date().toISOString()
    };
    data.playlists.push(playlist);
    writeData(data);
    return playlist;
  },
  updatePlaylist(userId, playlistId, updates) {
    const data = readData();
    const playlist = data.playlists.find(p => String(p.id) === String(playlistId) && p.userId === Number(userId));
    if (!playlist) return null;
    if (updates.name !== undefined) playlist.name = updates.name;
    if (updates.desc !== undefined) playlist.desc = updates.desc;
    if (updates.cover !== undefined) playlist.cover = updates.cover;
    writeData(data);
    return playlist;
  },
  deletePlaylist(userId, playlistId) {
    const data = readData();
    const index = data.playlists.findIndex(p => String(p.id) === String(playlistId) && p.userId === Number(userId));
    if (index === -1) return false;
    data.playlists.splice(index, 1);
    writeData(data);
    return true;
  },
  addTrackToPlaylist(userId, playlistId, trackId) {
    const data = readData();
    const playlist = data.playlists.find(p => String(p.id) === String(playlistId) && p.userId === Number(userId));
    if (!playlist) return null;
    const tId = Number(trackId);
    if (!playlist.songs.includes(tId)) {
      playlist.songs.push(tId);
      writeData(data);
    }
    return playlist;
  },
  removeTrackFromPlaylist(userId, playlistId, trackId) {
    const data = readData();
    const playlist = data.playlists.find(p => String(p.id) === String(playlistId) && p.userId === Number(userId));
    if (!playlist) return null;
    playlist.songs = playlist.songs.filter(id => id !== Number(trackId));
    writeData(data);
    return playlist;
  },

  // Likes
  getLikes(userId) {
    const data = readData();
    return data.likes[String(userId)] || [];
  },
  toggleLike(userId, trackId) {
    const data = readData();
    const key = String(userId);
    if (!data.likes[key]) data.likes[key] = [];
    const tId = Number(trackId);
    const idx = data.likes[key].indexOf(tId);
    let liked = false;
    if (idx === -1) {
      data.likes[key].push(tId);
      liked = true;
    } else {
      data.likes[key].splice(idx, 1);
      liked = false;
    }
    writeData(data);
    return { liked, likes: data.likes[key] };
  }
};

