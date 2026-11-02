const express = require('express');
const router = express.Router();
const musicApiController = require('../controllers/musicApiController');

router.get('/trending', musicApiController.getTrending);
router.get('/search', musicApiController.search);
router.get('/artist/:id', musicApiController.getArtist);

module.exports = router;

