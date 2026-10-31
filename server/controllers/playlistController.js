const store = require('../data/store');

exports.getUserPlaylists = (req, res) => {
  try {
    const playlists = store.getPlaylists(req.user.id);
    return res.json({
      success: true,
      count: playlists.length,
      playlists
    });
  } catch (error) {
    console.error('getUserPlaylists error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve playlists.' });
  }
};

exports.createPlaylist = (req, res) => {
  try {
    const { name, desc, cover, songs } = req.body;
    const newPlaylist = store.createPlaylist(req.user.id, {
      name: name || 'My Playlist',
      desc: desc || '',
      cover: cover || '/assesst/card1img.jpeg',
      songs: Array.isArray(songs) ? songs : []
    });

    return res.status(201).json({
      success: true,
      message: 'Playlist created successfully.',
      playlist: newPlaylist
    });
  } catch (error) {
    console.error('createPlaylist error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create playlist.' });
  }
};

exports.getPlaylistById = (req, res) => {
  try {
    const playlist = store.getPlaylistById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found.' });
    }
    // Populate songs details
    const tracks = store.getTracks().filter(t => playlist.songs.includes(t.id));
    return res.json({
      success: true,
      playlist: {
        ...playlist,
        trackDetails: tracks
      }
    });
  } catch (error) {
    console.error('getPlaylistById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve playlist.' });
  }
};

exports.updatePlaylist = (req, res) => {
  try {
    const { name, desc, cover } = req.body;
    const updated = store.updatePlaylist(req.user.id, req.params.id, { name, desc, cover });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Playlist not found or unauthorized.' });
    }
    return res.json({
      success: true,
      message: 'Playlist updated successfully.',
      playlist: updated
    });
  } catch (error) {
    console.error('updatePlaylist error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update playlist.' });
  }
};

exports.deletePlaylist = (req, res) => {
  try {
    const deleted = store.deletePlaylist(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Playlist not found or unauthorized.' });
    }
    return res.json({
      success: true,
      message: 'Playlist deleted successfully.'
    });
  } catch (error) {
    console.error('deletePlaylist error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete playlist.' });
  }
};

exports.addTrack = (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) {
      return res.status(400).json({ success: false, message: 'trackId is required.' });
    }
    const updated = store.addTrackToPlaylist(req.user.id, req.params.id, trackId);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Playlist not found or unauthorized.' });
    }
    return res.json({
      success: true,
      message: 'Track added to playlist.',
      playlist: updated
    });
  } catch (error) {
    console.error('addTrack error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add track to playlist.' });
  }
};

exports.removeTrack = (req, res) => {
  try {
    const { trackId } = req.params;
    const updated = store.removeTrackFromPlaylist(req.user.id, req.params.id, trackId);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Playlist not found or unauthorized.' });
    }
    return res.json({
      success: true,
      message: 'Track removed from playlist.',
      playlist: updated
    });
  } catch (error) {
    console.error('removeTrack error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove track from playlist.' });
  }
};

