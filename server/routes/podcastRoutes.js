const express = require('express');
const router = express.Router();
const podcastController = require('../controllers/podcastController');

router.get('/', podcastController.getPodcasts);
router.get('/:id', podcastController.getPodcastById);

module.exports = router;

