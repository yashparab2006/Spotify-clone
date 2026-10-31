const fs = require('fs');

function cleanModule(code) {
  return code
    .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?/g, '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+let\s+/g, 'let ')
    .replace(/export\s+function\s+/g, 'function ');
}

const apiCode = fs.existsSync('js/api.js') ? cleanModule(fs.readFileSync('js/api.js', 'utf8')) : '';
const playlistCode = cleanModule(fs.readFileSync('js/playlist.js', 'utf8'));
const premiumCode = cleanModule(fs.readFileSync('js/premium.js', 'utf8'));
const profileCode = cleanModule(fs.readFileSync('js/profile.js', 'utf8'));
const authCode = cleanModule(fs.readFileSync('js/auth.js', 'utf8'));
const musicCode = cleanModule(fs.readFileSync('js/music.js', 'utf8'));
const footerDataCode = cleanModule(fs.readFileSync('js/footerData.js', 'utf8'));
const appCode = cleanModule(fs.readFileSync('js/app.js', 'utf8'));

const bundle = [
  '// Spotify Clone - Universal Standalone Bundle (Works on file:/// and http://)',
  ';(function() {',
  apiCode,
  playlistCode,
  premiumCode,
  profileCode,
  authCode,
  musicCode,
  footerDataCode,
  appCode,
  '})();'
].join('\n\n');

fs.writeFileSync('bundle.js', bundle, 'utf8');
if (fs.existsSync('html')) {
  fs.writeFileSync('html/bundle.js', bundle, 'utf8');
}
console.log('Bundle created successfully! Size:', bundle.length);
