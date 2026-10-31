const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'spotify_clone_secret_key_jwt_2026_super_secure',
  JWT_EXPIRES_IN: '7d',
  DATA_PATH: path.join(__dirname, '..', 'data', 'database.json')
};

