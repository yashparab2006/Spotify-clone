const store = require('../data/store');

exports.getTracks = (req, res) => {
  try {
    const { q, genre } = req.query;
    const tracks = store.getTracks({ q, genre });
    return res.json({
      success: true,
      count: tracks.length,
      tracks
    });
  } catch (error) {
    console.error('getTracks error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tracks.' });
  }
};

exports.getTrackById = (req, res) => {
  try {
    const track = store.getTrackById(req.params.id);
    if (!track) {
      return res.status(404).json({ success: false, message: 'Track not found.' });
    }
    return res.json({
      success: true,
      track
    });
  } catch (error) {
    console.error('getTrackById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve track.' });
  }
};

