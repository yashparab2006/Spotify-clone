const store = require('../data/store');

exports.getLikes = (req, res) => {
  try {
    const likes = store.getLikes(req.user.id);
    return res.json({
      success: true,
      count: likes.length,
      likes
    });
  } catch (error) {
    console.error('getLikes error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve likes.' });
  }
};

exports.toggleLike = (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) {
      return res.status(400).json({ success: false, message: 'trackId is required.' });
    }
    const result = store.toggleLike(req.user.id, trackId);
    return res.json({
      success: true,
      liked: result.liked,
      message: result.liked ? 'Saved to Your Library.' : 'Removed from Your Library.',
      likes: result.likes
    });
  } catch (error) {
    console.error('toggleLike error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update like status.' });
  }
};

exports.updateSubscription = (req, res) => {
  try {
    const { planName } = req.body;
    const tier = planName ? `Spotify Premium ${planName}` : 'Spotify Premium Individual';
    const updated = store.updateUser(req.user.id, { tier });
    return res.json({
      success: true,
      message: `Congratulations! You are now subscribed to ${tier}.`,
      tier: updated.tier
    });
  } catch (error) {
    console.error('updateSubscription error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update subscription.' });
  }
};

