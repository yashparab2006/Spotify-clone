const store = require('../data/store');

exports.unifiedSearch = (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();

  if (!query) {
    return res.json({
      success: true,
      query: '',
      tracks: [],
      playlists: [],
      total: 0
    });
  }

  const allTracks = store.getTracks();
  const matchedTracks = allTracks.filter(t =>
    t.title.toLowerCase().includes(query) ||
    t.artist.toLowerCase().includes(query) ||
    (t.genre && t.genre.toLowerCase().includes(query))
  );

  const data = store.readData();
  const matchedPlaylists = (data.playlists || []).filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.desc && p.desc.toLowerCase().includes(query))
  );

  res.json({
    success: true,
    query,
    results: {
      tracks: matchedTracks,
      playlists: matchedPlaylists
    },
    total: matchedTracks.length + matchedPlaylists.length
  });
};
