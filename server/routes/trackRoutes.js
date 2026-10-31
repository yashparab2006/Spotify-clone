const express = require('express');
const router = express.Router();
const trackController = require('../controllers/trackController');

router.get('/', trackController.getTracks);
router.get('/:id', trackController.getTrackById);

module.exports = router;

