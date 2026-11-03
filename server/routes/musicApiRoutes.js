const express = require('express');
const router = express.Router();
const musicApiController = require('../controllers/musicApiController');

router.get('/trending', musicApiController.getTrending);
router.get('/feed', musicApiController.getFeed);
router.get('/bollywood', musicApiController.getBollywood);
router.get('/search', musicApiController.search);
router.get('/artist/:id', musicApiController.getArtist);

module.exports = router;

