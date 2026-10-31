const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/likes', userController.getLikes);
router.post('/likes', userController.toggleLike);
router.post('/subscription', userController.updateSubscription);

module.exports = router;

