const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync('html/index.html', 'utf8');

// Extract common head
const headMatch = indexHtml.match(/<head>([\s\S]*?)<\/head>/);
const headContent = headMatch ? headMatch[1] : '';

// Extract sidebar
const sidebarMatch = indexHtml.match(/<!-- ========== SIDEBAR ========== -->([\s\S]*?)<!-- ========== MAIN CONTENT ========== -->/);
let rawSidebar = sidebarMatch ? sidebarMatch[1] : '';
rawSidebar = rawSidebar.replace(/class="nav-option active-nav"/g, 'class="nav-option"');
rawSidebar = rawSidebar.replace(/class="lib-option nav-option active-nav"/g, 'class="lib-option nav-option"');
rawSidebar = rawSidebar.replace('<a href="#">Home</a>', '<a href="index.html">Home</a>');
rawSidebar = rawSidebar.replace('<a href="#">Search</a>', '<a href="search.html">Search</a>');
rawSidebar = rawSidebar.replace('<a href="#">Your Library</a>', '<a href="library.html">Your Library</a>');

// Extract sticky nav
const navMatch = indexHtml.match(/<!-- Sticky Navigation Bar -->([\s\S]*?)<!-- ===== PAGE:/);
let rawNav = navMatch ? navMatch[1] : '';
rawNav = rawNav.replace('id="searchBar" style="display:flex;"', 'id="searchBar" style="display:none;"');

// Extract right sidebar (rail & panel)
const rightSidebarMatch = indexHtml.match(/(<!-- ========== RIGHT SIDEBAR \(SLIDING RAIL & EXPANDED PANEL\) ========== -->[\s\S]*?)<!-- ========== MUSIC PLAYER BAR ========== -->/);
const rawRightSidebar = rightSidebarMatch ? rightSidebarMatch[1].trim() : '';

// Extract bottom player bar
const playerMatch = indexHtml.match(/<!-- ========== MUSIC PLAYER BAR ========== -->([\s\S]*?)<!-- Edit Profile Modal -->/);
const rawPlayer = playerMatch ? playerMatch[1] : '';

// Extract modals & toast & script
const modalsMatch = indexHtml.match(/<!-- Edit Profile Modal -->([\s\S]*?)<\/body>/);
const rawModals = modalsMatch ? modalsMatch[1] : '';

// Extract updated footer
const footerMatch = indexHtml.match(/<!-- ===== SPOTIFY FOOTER ===== -->([\s\S]*?)<\/footer>/);
const footerHtml = footerMatch ? `<!-- ===== SPOTIFY FOOTER ===== -->\n${footerMatch[1].trim()}\n</footer>` : '';

// 19 Pages Configuration
const footerPages = [
    // 1. Company
    {
        filename: 'about.html',
        title: 'Spotify - About Us',
        badge: 'COMPANY & CULTURE',
        heroClass: 'hero-teal',
        heroTitle: 'Band together for the future of audio.',
        heroSub: 'Our mission is to unlock the potential of human creativity—by giving a million creative artists the opportunity to live off their art and billions of fans the opportunity to enjoy and be inspired by it.',
        actions: '<button class="badge" onclick="window.location.href=\'jobs.html\'">View Open Roles</button><button class="badge dark-badge" onclick="window.location.href=\'for-the-record.html\'">Press Releases</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-users"></i></div>
                    <h4>626 Million+ Listeners</h4>
                    <p>Over 626 million monthly active listeners across 184 countries and territories enjoy music on Spotify daily.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-music"></i></div>
                    <h4>100 Million+ Tracks</h4>
                    <p>Access the world's most comprehensive catalog of songs, live performances, and exclusive audio experiences.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-podcast"></i></div>
                    <h4>6 Million+ Podcasts</h4>
                    <p>Empowering creators and storytellers globally to reach passionate listeners wherever they are.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-earth-americas"></i></div>
                    <h4>Global Diversity</h4>
                    <p>Offices across Stockholm, New York, London, Tokyo, Mumbai, and Sydney fostering inclusive audio innovation.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'jobs.html',
        title: 'Spotify - Careers & Jobs',
        badge: 'JOIN THE BAND',
        heroClass: 'hero-purple',
        heroTitle: 'Work that hits the right notes.',
        heroSub: 'Join a world-class team of engineers, designers, researchers, and audio pioneers transforming how the world connects through music.',
        actions: '<button class="badge" onclick="alert(\'Application portal: Submissions open for Q4 2026 roles.\')">Apply for Roles</button><button class="badge dark-badge" onclick="window.location.href=\'about.html\'">Life at Spotify</button>',
        content: `
            <h3 class="info-section-title">Featured Opportunities</h3>
            <div class="info-list-group">
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Senior Frontend Engineer — Web Audio & Player Systems</span>
                        <span class="info-list-desc">Stockholm, Sweden / Remote • Engineering • Full-time</span>
                    </div>
                    <button class="badge dark-badge" onclick="alert('Position details: Senior Frontend Engineer (Web Audio)')">View Role</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Staff Product Designer — Design Systems & UI Core</span>
                        <span class="info-list-desc">New York, NY / Remote • Design • Full-time</span>
                    </div>
                    <button class="badge dark-badge" onclick="alert('Position details: Staff Product Designer')">View Role</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Machine Learning Scientist — Audio Recommendation Algorithms</span>
                        <span class="info-list-desc">London, UK • Machine Learning • Full-time</span>
                    </div>
                    <button class="badge dark-badge" onclick="alert('Position details: Machine Learning Scientist')">View Role</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Global Artist Partnerships Lead</span>
                        <span class="info-list-desc">Mumbai, India • Music Editorial • Full-time</span>
                    </div>
                    <button class="badge dark-badge" onclick="alert('Position details: Artist Partnerships Lead')">View Role</button>
                </div>
            </div>
        `
    },
    {
        filename: 'for-the-record.html',
        title: 'Spotify - For the Record (Newsroom)',
        badge: 'OFFICIAL NEWSROOM',
        heroClass: 'hero-blue',
        heroTitle: 'Stories behind the sound.',
        heroSub: 'Discover the latest company announcements, product launches, global streaming data, and behind-the-scenes interviews with creators.',
        actions: '<button class="badge" onclick="alert(\'Subscribed to Spotify Press Releases!\')">Subscribe to Updates</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <span class="info-badge">PRODUCT NEWS</span>
                    <h4>How Real-Time Audio Visualizers & Lossless HiFi Transform Listening</h4>
                    <p>An inside look at our engineering team\'s implementation of hardware-accelerated spectrum visualizers and adaptive acoustics.</p>
                </div>
                <div class="info-card">
                    <span class="info-badge">CULTURE & ARTISTS</span>
                    <h4>Loud & Clear: Record Payouts to Independent Songwriters and Labels</h4>
                    <p>In 2025, Spotify paid more than $9 billion to the music industry, setting a new historical milestone for digital streaming.</p>
                </div>
                <div class="info-card">
                    <span class="info-badge">INNOVATION</span>
                    <h4>AI DJ Expansion: Voice Intelligence Meets Sonic Curation</h4>
                    <p>Rolling out localized AI voice DJ experiences across Europe, Latin America, and Asia in over 30 languages.</p>
                </div>
            </div>
        `
    },

    // 2. Communities
    {
        filename: 'for-artists.html',
        title: 'Spotify for Artists',
        badge: 'CREATIVE COMMUNITY',
        heroClass: 'hero-pink',
        heroTitle: 'Claim your profile. Grow your audience.',
        heroSub: 'Get the data, tools, and direct fan connections you need to build a lifelong career in music on the world\'s largest streaming stage.',
        actions: '<button class="badge" onclick="alert(\'Redirecting to Spotify for Artists login...\')">Claim Artist Profile</button><button class="badge dark-badge" onclick="window.location.href=\'music.html\'">View Live Showcase</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-chart-line"></i></div>
                    <h4>Real-Time Audience Data</h4>
                    <p>Track live listener spikes when your track drops, discover which playlists feature you, and map your worldwide fans.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-bullhorn"></i></div>
                    <h4>Pitch to Playlist Editors</h4>
                    <p>Submit unreleased tracks directly to our global editorial teams for placement on New Music Friday and Discover Weekly.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-clapperboard"></i></div>
                    <h4>Canvas Visuals & Merch</h4>
                    <p>Add 8-second looping visual videos to every song and link your official merchandise directly on your artist page.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'for-creators.html',
        title: 'Spotify for Creators',
        badge: 'PODCASTS & SHOWS',
        heroClass: 'hero-purple',
        heroTitle: 'Where audio storytelling finds its home.',
        heroSub: 'From recorded room talks to video podcasts, discover distribution, monetization, and interactive Q&A tools made for creators.',
        actions: '<button class="badge" onclick="window.location.href=\'podcasts.html\'">Explore Podcasts</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-video"></i></div>
                    <h4>Video Podcasting</h4>
                    <p>Engage viewers with full-fidelity video streaming on desktop and mobile, with seamless audio background playback.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-comments"></i></div>
                    <h4>Interactive Polls & Q&As</h4>
                    <p>Chat directly with your community by embedding audience questions and real-time live episode polls.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-money-bill-wave"></i></div>
                    <h4>Spotify Open Access & Ads</h4>
                    <p>Monetize your listenership through subscriber-only bonus episodes and automated dynamic ad insertion.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'for-authors.html',
        title: 'Spotify for Authors',
        badge: 'AUDIOBOOKS & LITERATURE',
        heroClass: 'hero-orange',
        heroTitle: 'Give voice to your stories.',
        heroSub: 'Distribute your audiobooks to Spotify Premium subscribers and listeners worldwide with industry-leading narration tools and transparent royalty tracking.',
        actions: '<button class="badge" onclick="alert(\'Spotify Audiobook publishing program details requested.\')">Publish with Spotify</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-book-open"></i></div>
                    <h4>375,000+ Titles Available</h4>
                    <p>Join world-renowned publishing houses and indie writers reaching avid audiobook listeners globally.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-clock"></i></div>
                    <h4>15 Hours Monthly Included</h4>
                    <p>Eligible Spotify Premium subscribers receive 15 hours of audiobook listening time every single month.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-microphone"></i></div>
                    <h4>High-Fidelity Narration</h4>
                    <p>Chapter bookmarking, variable playback speeds (0.5x to 3.5x), and sleep timers tailored for spoken word.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'developers.html',
        title: 'Spotify for Developers',
        badge: 'WEB API & SDKS',
        heroClass: 'hero-blue',
        heroTitle: 'Build music into your apps.',
        heroSub: 'Explore our modern Web API, Web Playback SDK, and open endpoints to create next-generation music and audio experiences.',
        actions: '<button class="badge" onclick="alert(\'API Documentation: docs.spotify.com/web-api\')">Read API Docs</button><button class="badge dark-badge" onclick="alert(\'Dashboard: Create your Client ID\')">Create an App</button>',
        content: `
            <div class="code-box">
// Sample Web API Request: Get Currently Playing Track
curl -X GET "https://api.spotify.com/v1/me/player/currently-playing" \\
  -H "Authorization: Bearer BQD...YOUR_OAUTH_TOKEN"
            </div>
            <div class="info-grid" style="margin-top:2rem;">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-code"></i></div>
                    <h4>Web API</h4>
                    <p>Retrieve rich metadata for artists, albums, playlists, tracks, audio features, and personalized recommendations.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-laptop-code"></i></div>
                    <h4>Web Playback SDK</h4>
                    <p>Stream Spotify audio directly inside web browsers using HTML5 Web Audio and encrypted DRM media streams.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-puzzle-piece"></i></div>
                    <h4>Embed Widgets</h4>
                    <p>Easily embed responsive Spotify player widgets into blogs, portfolios, and websites with simple iframe tags.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'advertising.html',
        title: 'Spotify Advertising',
        badge: 'SPOTIFY AD STUDIO',
        heroClass: 'hero-teal',
        heroTitle: 'Connect with listeners at the speed of culture.',
        heroSub: 'Reach people when screens can\'t: working out, cooking, commuting, or relaxing with sound that commands attention.',
        actions: '<button class="badge" onclick="alert(\'Welcome to Spotify Ad Studio. Sign up to launch audio campaigns starting from $250.\')">Start an Ad Campaign</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-volume-high"></i></div>
                    <h4>Audio Ads</h4>
                    <p>Engage listeners with 30-second audio spots with a clickable companion display banner and direct call to action.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-display"></i></div>
                    <h4>Video Takeover</h4>
                    <p>Reach users when they actively browse Spotify on mobile or desktop with sound-on, high-impact video experiences.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-bullseye"></i></div>
                    <h4>Contextual Streaming Intelligence</h4>
                    <p>Target based on music moods, workout activities, study playlists, device types, and geographical zones.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'investors.html',
        title: 'Spotify - Investor Relations',
        badge: 'NYSE: SPOT',
        heroClass: 'hero-purple',
        heroTitle: 'Spotify Technology S.A.',
        heroSub: 'Explore our latest quarterly earnings reports, shareholder letters, SEC filings, and governance materials.',
        actions: '<button class="badge" onclick="alert(\'Downloading latest Q3/Q4 2026 Shareholder Deck...\')">Download Earnings Report (PDF)</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-arrow-trend-up"></i></div>
                    <h4>Quarterly Results</h4>
                    <p>Access our webcasts, financial press releases, operating income metrics, and global subscriber trends.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
                    <h4>SEC Filings</h4>
                    <p>Complete regulatory disclosures, including Forms 20-F, 6-K, proxy statements, and annual reports.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-scale-balanced"></i></div>
                    <h4>Corporate Governance</h4>
                    <p>Information on our board of directors, management committee, audit practices, and sustainability policies.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'vendors.html',
        title: 'Spotify - Vendors & Partners',
        badge: 'SUPPLIER PORTAL',
        heroClass: 'hero-blue',
        heroTitle: 'Collaborate with Spotify.',
        heroSub: 'Resources, compliance guidelines, and procurement tools for Spotify vendors, service partners, and suppliers worldwide.',
        actions: '<button class="badge" onclick="alert(\'Opening Spotify Supplier Portal login...\')">Vendor Portal Login</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-handshake"></i></div>
                    <h4>Supplier Code of Conduct</h4>
                    <p>Our standards for human rights, labor welfare, anti-corruption, environmental stewardship, and safety.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-receipt"></i></div>
                    <h4>Billing & Invoicing Rules</h4>
                    <p>Electronic invoicing instructions, purchase order verification, and regional payment terms.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-shield-halved"></i></div>
                    <h4>Data Security & Privacy</h4>
                    <p>Information security requirements and privacy benchmarks expected of all third-party systems.</p>
                </div>
            </div>
        `
    },

    // 3. Useful Links
    {
        filename: 'support.html',
        title: 'Spotify - Support & Help Center',
        badge: 'CUSTOMER HELP',
        heroClass: 'hero-teal',
        heroTitle: 'How can we help you today?',
        heroSub: 'Find answers, manage your subscription, fix audio playback issues, and learn tips to get the most out of Spotify.',
        actions: '<button class="badge" onclick="alert(\'Live Chat: Our support assistant is ready to help.\')">Start Live Chat</button><button class="badge dark-badge" onclick="window.location.href=\'premium.html\'">Manage Subscription</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-key"></i></div>
                    <h4>Can\'t Log In?</h4>
                    <p>Reset your password, recover linked email addresses, or troubleshoot social login connections.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-credit-card"></i></div>
                    <h4>Payment & Billing</h4>
                    <p>Update credit cards, view past invoices, check trial expiration dates, or switch billing frequency.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-headphones"></i></div>
                    <h4>Audio Troubleshooting</h4>
                    <p>Fix crackling or stuttering sound, enable high-fidelity 320 kbps streaming, and configure offline cache.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'free-mobile-app.html',
        title: 'Spotify - Free Mobile App',
        badge: 'DOWNLOAD APP',
        heroClass: 'hero-pink',
        heroTitle: 'Take the sound anywhere.',
        heroSub: 'Download Spotify for your iPhone, iPad, Android phone, smart watch, and tablet. Millions of songs right in your pocket.',
        actions: '<button class="badge" onclick="alert(\'Downloading Spotify for iOS (App Store)...\')"><i class=\"fa-brands fa-apple\"></i> Download on App Store</button><button class="badge dark-badge" onclick="alert(\'Downloading Spotify for Android (Google Play)...\')"><i class=\"fa-brands fa-google-play\"></i> Get it on Google Play</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-car"></i></div>
                    <h4>CarPlay & Android Auto</h4>
                    <p>Control playlists effortlessly with oversized buttons and voice commands while keeping eyes on the road.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-wifi"></i></div>
                    <h4>Data Saver Mode</h4>
                    <p>Stream longer while consuming less mobile bandwidth with smart audio compression and offline playlists.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-sliders"></i></div>
                    <h4>Lock Screen Player</h4>
                    <p>Seamlessly control tracks, seek through live lyrics, and view high-res album covers on your lock screen.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'popular-by-country.html',
        title: 'Spotify - Popular by Country',
        badge: 'WORLDWIDE CHARTS',
        heroClass: 'hero-orange',
        heroTitle: 'Listen to what the world is playing.',
        heroSub: 'Explore daily and weekly streaming velocities across 70+ nations. From Bollywood blockbusters to Tokyo J-Pop and London indie.',
        actions: '<button class="badge" onclick="window.location.href=\'index.html\'">Listen to Global Top 50</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <h4>🇺🇸 United States — Top Hits</h4>
                    <p>Hip-Hop, pop chartbusters, country crossovers, and trending viral billboard records.</p>
                </div>
                <div class="info-card">
                    <h4>🇮🇳 India — Hot 50 Hits</h4>
                    <p>Bollywood romantic soundtracks, Punjabi high-energy anthems, and viral indie tracks.</p>
                </div>
                <div class="info-card">
                    <h4>🇬🇧 United Kingdom — Official Charts</h4>
                    <p>Electronic dance music, UK drill, brit-pop, and breakthrough acoustic singer-songwriters.</p>
                </div>
                <div class="info-card">
                    <h4>🇯🇵 Japan — Weekly Viral</h4>
                    <p>City pop classics, anime soundtracks, modern J-Rock, and Shibuya lo-fi beats.</p>
                </div>
                <div class="info-card">
                    <h4>🇧🇷 Brazil — Top Brasil</h4>
                    <p>Sertanejo universitário, Rio funk rhythms, and melodic MPB favorites.</p>
                </div>
                <div class="info-card">
                    <h4>🌍 Top 50 — Global</h4>
                    <p>The daily definitive index of the most played music across every country on earth.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'top-song-lyrics.html',
        title: 'Spotify - Top Song Lyrics',
        badge: 'SING ALONG',
        heroClass: 'hero-teal',
        heroTitle: 'Live synchronized lyrics for the songs you love.',
        heroSub: 'Sing along in real time, discover songwriting credits, and seek through audio by tapping any lyric line.',
        actions: '<button class="badge" onclick="window.location.href=\'music.html\'">Open Live Lyrics Player</button>',
        content: `
            <div class="info-list-group">
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Blinding Lights — The Weeknd</span>
                        <span class="info-list-desc">"I've been on my own for long enough, maybe you can show me how to love..."</span>
                    </div>
                    <button class="badge" onclick="window.location.href=\'music.html\'">Play & Sing</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Mahiya Jinna Sohna — Darshan Raval</span>
                        <span class="info-list-desc">"Tu hi meri zindagani, tu hi chain mera, mahiya jinna sohna koi hor na mileya..."</span>
                    </div>
                    <button class="badge" onclick="window.location.href=\'music.html\'">Play & Sing</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Starboy — The Weeknd ft. Daft Punk</span>
                        <span class="info-list-desc">"P1 cleaner than your church shoes, ah... Look what you've done, I'm a motherf***ing starboy!"</span>
                    </div>
                    <button class="badge" onclick="window.location.href=\'music.html\'">Play & Sing</button>
                </div>
                <div class="info-list-row">
                    <div class="info-list-meta">
                        <span class="info-list-title">Naa Ready — Leo (Anirudh Ravichander)</span>
                        <span class="info-list-desc">"Aagasam idikithu, aalungallum aaduthu, Naa ready thaan varava..."</span>
                    </div>
                    <button class="badge" onclick="window.location.href=\'music.html\'">Play & Sing</button>
                </div>
            </div>
        `
    },
    {
        filename: 'import-your-music.html',
        title: 'Spotify - Import Your Music',
        badge: 'LOCAL AUDIO FILES',
        heroClass: 'hero-purple',
        heroTitle: 'Play your own audio files alongside Spotify.',
        heroSub: 'Import local MP3, WAV, FLAC, and M4A audio files from your computer and listen with our Web Audio player and real-time spectrum visualizer.',
        actions: '<button class="badge" onclick="document.getElementById(\'localAudioInput\').click()"><i class=\"fa-solid fa-folder-open\"></i> Select Local Files</button>',
        content: `
            <div class="dropzone-box" onclick="document.getElementById('localAudioInput').click()">
                <i class="fa-solid fa-cloud-arrow-up" style="font-size:3rem;color:#1ed760;margin-bottom:1rem;display:block;"></i>
                <h3 style="font-size:1.4rem;color:#fff;margin-bottom:0.5rem;">Drag & drop your audio tracks here</h3>
                <p style="color:#888;font-size:0.9rem;">Supports MP3, WAV, FLAC, AAC, OGG. Plays right in your browser with zero upload wait.</p>
                <input type="file" id="localAudioInput" accept="audio/*" multiple style="display:none;" onchange="alert('Selected ' + this.files.length + ' audio files! Ready for playback.')">
            </div>
            <div class="info-grid">
                <div class="info-card">
                    <h4>Private & Client-Side</h4>
                    <p>Your local audio files stay completely private on your machine and are rendered locally using the Web Audio API.</p>
                </div>
                <div class="info-card">
                    <h4>Visualizer Compatible</h4>
                    <p>All imported songs connect directly into our real-time frequency spectrum visualizer and oscilloscope.</p>
                </div>
            </div>
        `
    },

    // 4. Spotify Plans
    {
        filename: 'premium-standard.html',
        title: 'Spotify - Premium Standard Plan',
        badge: 'PREMIUM INDIVIDUAL',
        heroClass: 'hero-teal',
        heroTitle: 'Ad-free listening. Unlimited downloads.',
        heroSub: 'Enjoy $10.99 / month after 1 month free trial. Cancel anytime with a single click in your settings.',
        actions: '<button class="badge" onclick="window.location.href=\'premium.html\'">Start 1 Month Free</button><button class="badge dark-badge" onclick="window.location.href=\'premium.html\'">Compare All Plans</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-ban"></i></div>
                    <h4>Zero Interruptions</h4>
                    <p>Never hear another commercial or sponsored interruption between your songs.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-arrow-down"></i></div>
                    <h4>Download up to 10,000 Songs</h4>
                    <p>Store your favorite albums on up to 5 devices for full offline plane rides and road trips.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-sliders"></i></div>
                    <h4>Full On-Demand Control</h4>
                    <p>Play any track, repeat, rewind, and skip as many times as you desire without restriction.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'premium-platinum.html',
        title: 'Spotify - Premium Platinum Plan',
        badge: 'LOSSLESS AUDIO',
        heroClass: 'hero-purple',
        heroTitle: 'Pure Lossless 24-bit HiFi Audio.',
        heroSub: 'Experience music exactly as the artists and producers recorded it in studio master clarity with adaptive spatial acoustics.',
        actions: '<button class="badge" onclick="window.location.href=\'premium.html\'">Upgrade to Platinum</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-wave-square"></i></div>
                    <h4>24-bit / 192kHz Lossless FLAC</h4>
                    <p>Bit-perfect sound transmission delivering dynamic range and nuanced analog depth.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                    <h4>AI Studio Remastering</h4>
                    <p>Intelligent frequency separation that boosts vocals and tightens bass response in real time.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-headphones"></i></div>
                    <h4>Headphone Tuning Profiles</h4>
                    <p>Custom calibration curves for over 150 top audiophile headphones and studio monitors.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'premium-student.html',
        title: 'Spotify - Premium Student Plan',
        badge: 'SPECIAL 50% DISCOUNT',
        heroClass: 'hero-orange',
        heroTitle: 'Study hard. Stream harder. Just $5.99 / mo.',
        heroSub: 'Verified college and university students get a huge 50% discount plus free access to Hulu (With Ads).',
        actions: '<button class="badge" onclick="window.location.href=\'premium.html\'">Verify with SheerID</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-graduation-cap"></i></div>
                    <h4>50% Student Discount</h4>
                    <p>Save over $60 each year compared to standard individual pricing, valid for up to 4 study years.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-tv"></i></div>
                    <h4>Hulu Included Free</h4>
                    <p>Watch hit television shows, movies, and Hulu originals anytime on your laptop or phone.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-book"></i></div>
                    <h4>Focus & Study Soundtracks</h4>
                    <p>Unlimited access to curated deep-focus lo-fi, binaural beats, and ambient study acoustics.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'spotify-free.html',
        title: 'Spotify - Free Plan',
        badge: 'FREE FOREVER',
        heroClass: 'hero-blue',
        heroTitle: 'Music for everyone. Zero cost.',
        heroSub: 'Access over 100 million songs, millions of podcasts, and create unlimited custom playlists completely free.',
        actions: '<button class="badge" onclick="window.location.href=\'auth.html\'">Sign Up Free</button><button class="badge dark-badge" onclick="window.location.href=\'premium.html\'">Compare with Premium</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-music"></i></div>
                    <h4>100M+ Songs on Shuffle</h4>
                    <p>Enjoy our entire global music catalog across desktop, tablet, web, and smart speakers.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-list"></i></div>
                    <h4>Create Unlimited Playlists</h4>
                    <p>Curate custom playlists, share them with your friends, and collaborate on shared music collections.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-podcast"></i></div>
                    <h4>Full Podcast Library</h4>
                    <p>Stream every podcast, follow your favorite hosts, and get notified about brand-new episodes.</p>
                </div>
            </div>
        `
    },

    // 5. Sidebar Bottom Legal & Privacy
    {
        filename: 'legal.html',
        title: 'Spotify - Legal Information',
        badge: 'LEGAL & COMPLIANCE',
        heroClass: 'hero-teal',
        heroTitle: 'Spotify Legal Terms and Notices.',
        heroSub: 'Read our terms of use, intellectual property policies, copyright guidelines, and commercial licensing agreements.',
        actions: '<button class="badge" onclick="alert(\'Downloading Spotify Terms of Service (PDF)...\')">Download Terms (PDF)</button><button class="badge dark-badge" onclick="openFooterPage(\'safety-privacy-center.html\')">Safety Center</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-scale-balanced"></i></div>
                    <h4>Terms of Service</h4>
                    <p>The definitive user agreement governing the use of Spotify applications, streaming services, and subscription features.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-copyright"></i></div>
                    <h4>Copyright & Intellectual Property</h4>
                    <p>Information on DMCA takedown procedures, reporting copyright infringement, and licensing partner guidelines.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-handshake"></i></div>
                    <h4>Fair Play Guidelines</h4>
                    <p>Rules regarding community behavior, preventing stream manipulation, and acceptable audio usage.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-file-contract"></i></div>
                    <h4>Trademark & Brand Licensing</h4>
                    <p>Guidelines for partners, developers, and media outlets referencing Spotify logos, wordmarks, and visual assets.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'safety-privacy-center.html',
        title: 'Spotify - Safety & Privacy Center',
        badge: 'SAFETY & TRUST',
        heroClass: 'hero-purple',
        heroTitle: 'Your safety, security, and privacy come first.',
        heroSub: 'Learn how Spotify protects your account, safeguards your data, and provides parental controls for a safe listening environment.',
        actions: '<button class="badge" onclick="openFooterPage(\'privacy-policy.html\')">Read Privacy Policy</button><button class="badge dark-badge" onclick="alert(\'Security Report: All systems nominal.\')">Security Status</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-shield-halved"></i></div>
                    <h4>Account Protection & 2FA</h4>
                    <p>Multi-factor authentication, suspicious login detection, and prompt security alerts keep your profile locked down.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-child-reaching"></i></div>
                    <h4>Youth & Parental Controls</h4>
                    <p>Toggle explicit content filters on and off with pin protection, ensuring age-appropriate listening for families.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-user-secret"></i></div>
                    <h4>Private Listening Sessions</h4>
                    <p>Turn on Private Session at any time to temporarily hide your real-time listening activity from your friend feed.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-bug"></i></div>
                    <h4>Vulnerability Disclosure</h4>
                    <p>Our global Bug Bounty Program partners with white-hat security researchers to proactively uncover and fix threats.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'privacy-policy.html',
        title: 'Spotify - Privacy Policy',
        badge: 'DATA & TRANSPARENCY',
        heroClass: 'hero-blue',
        heroTitle: 'Transparency in how your data is used.',
        heroSub: 'We believe in total transparency. Explore what data we collect, why we collect it, and how you have full control over your personal information.',
        actions: '<button class="badge" onclick="alert(\'Preparing your personal data archive for download...\')">Download Your Data</button><button class="badge dark-badge" onclick="openFooterPage(\'cookies.html\')">Manage Cookies</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-database"></i></div>
                    <h4>What Data We Collect</h4>
                    <p>Information you provide when signing up, songs you stream, playlists you curate, and technical device diagnostics.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                    <h4>How We Use Your Data</h4>
                    <p>Powering personalized audio recommendations like Discover Weekly, Daily Mix, and connecting you with beloved artists.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-fingerprint"></i></div>
                    <h4>Your Global Privacy Rights</h4>
                    <p>Full compliance with GDPR, CCPA, and global data privacy standards, granting you the right to access, edit, or delete your data.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-lock"></i></div>
                    <h4>Third-Party Sharing Controls</h4>
                    <p>Strict boundaries preventing unauthorized sale of personal data, with optional toggles for ad personalization.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'cookies.html',
        title: 'Spotify - Cookies & Local Storage',
        badge: 'TRACKING & STORAGE',
        heroClass: 'hero-orange',
        heroTitle: 'Cookies and Local Storage on Spotify.',
        heroSub: 'Understand how we use cookies, local caching, and tracking technologies to optimize performance, remember your preferences, and keep you logged in.',
        actions: '<button class="badge" onclick="alert(\'All essential and performance cookies active.\')">Accept All Cookies</button><button class="badge dark-badge" onclick="alert(\'Cookie preferences saved.\')">Save Preferences</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-cookie-bite"></i></div>
                    <h4>Strictly Necessary Cookies</h4>
                    <p>Essential for basic platform functionality: maintaining active user sessions, secure authentication, and Web Audio streaming.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-chart-pie"></i></div>
                    <h4>Performance & Analytics</h4>
                    <p>Anonymous metrics on loading speeds, crash diagnostics, and audio buffer latency to ensure smooth uninterrupted playback.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-sliders"></i></div>
                    <h4>Functional Storage</h4>
                    <p>Locally caches your volume sliders, repeat/shuffle toggles, created playlists, and UI theme preferences.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-bullhorn"></i></div>
                    <h4>Targeting & Advertising</h4>
                    <p>Helps deliver relevant advertisements to Free tier listeners. Can be customized or disabled via Ad Settings.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'about-ads.html',
        title: 'Spotify - About Our Ads',
        badge: 'ADVERTISING CHOICES',
        heroClass: 'hero-pink',
        heroTitle: 'Your choices regarding Spotify ads.',
        heroSub: 'Advertising keeps Spotify free for millions of listeners around the world. Discover how audio and display ads work, and how to manage your ad preferences.',
        actions: '<button class="badge" onclick="openFooterPage(\'premium-standard.html\')">Go Ad-Free with Premium</button><button class="badge dark-badge" onclick="alert(\'Personalized ad preferences updated.\')">Opt Out of Tailored Ads</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-rectangle-ad"></i></div>
                    <h4>Why Free Spotify Has Ads</h4>
                    <p>Sponsored advertisements fund music royalties paid directly to songwriters, artists, and independent rights holders.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-user-gear"></i></div>
                    <h4>Tailored Advertising Controls</h4>
                    <p>Choose whether advertisements are personalized based on your general listening genres, interests, or location.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-volume-high"></i></div>
                    <h4>Audio Ad Frequency Caps</h4>
                    <p>Strict caps guarantee that commercial breaks never exceed standard duration limits between your favorite songs.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-gem"></i></div>
                    <h4>100% Ad-Free with Premium</h4>
                    <p>Upgrade to Spotify Premium to instantly eliminate all audio, banner, and sponsored interruptions permanently.</p>
                </div>
            </div>
        `
    },
    {
        filename: 'accessibility.html',
        title: 'Spotify - Accessibility',
        badge: 'INCLUSION & ACCESS',
        heroClass: 'hero-teal',
        heroTitle: 'Music and audio for every listener.',
        heroSub: 'We are committed to making Spotify accessible for people with diverse auditory, visual, motor, and cognitive abilities.',
        actions: '<button class="badge" onclick="alert(\'High Contrast mode toggled for current session!\')">Toggle High Contrast</button><button class="badge dark-badge" onclick="openFooterPage(\'support.html\')">Contact Accessibility Support</button>',
        content: `
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-universal-access"></i></div>
                    <h4>Screen Readers & ARIA</h4>
                    <p>Full support for NVDA, JAWS, VoiceOver, and TalkBack with comprehensive ARIA labels and logical focus order.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-keyboard"></i></div>
                    <h4>Keyboard Navigation</h4>
                    <p>Navigate playlists, trigger playback, adjust volume, and search using standard keyboard shortcuts (Space, Tab, Arrows).</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-closed-captioning"></i></div>
                    <h4>Synchronized Live Lyrics</h4>
                    <p>Time-aligned scrolling lyrics and podcast transcription provide visual accessibility for deaf and hard-of-hearing fans.</p>
                </div>
                <div class="info-card">
                    <div class="info-card-icon"><i class="fa-solid fa-circle-half-stroke"></i></div>
                    <h4>High Contrast & Reduced Motion</h4>
                    <p>Complies with WCAG 2.1 AA contrast ratios, text resizing up to 200%, and respects prefers-reduced-motion settings.</p>
                </div>
            </div>
        `
    }
];

footerPages.forEach(p => {
    const mainContent = `
        <div class="info-page-container">
            <div class="info-hero ${p.heroClass}">
                <a href="index.html" class="info-back-link"><i class="fa-solid fa-arrow-left"></i> Back to Home</a>
                <span class="info-badge">${p.badge}</span>
                <h1 class="info-title">${p.heroTitle}</h1>
                <p class="info-sub">${p.heroSub}</p>
                <div class="info-actions">
                    ${p.actions}
                </div>
            </div>
            ${p.content}
            ${footerHtml}
        </div>
    `;

    const pageDoc = `<!DOCTYPE html>
<html lang="en">
<head>
${headContent.replace(/<title>.*?<\/title>/, `<title>${p.title}</title>`)}
</head>
<body data-page="${p.filename.replace('.html', '')}">
    <div class="main">
        <!-- ========== SIDEBAR ========== -->
        ${rawSidebar.trim()}

        <!-- ========== MAIN CONTENT ========== -->
        <div class="main-content" id="mainContent">
            <!-- Sticky Navigation Bar -->
            ${rawNav.trim()}

            ${mainContent}
        </div>

        ${rawRightSidebar}

        <!-- ========== MUSIC PLAYER BAR ========== -->
        ${rawPlayer.trim()}
    </div>

    ${rawModals.trim()}
</body>
</html>`;

    fs.writeFileSync(path.join('html', p.filename), pageDoc, 'utf8');
    console.log(`Generated ${p.filename} (${pageDoc.length} bytes)`);
});

// Also re-run build_multipage.js to make sure the core 8 pages have updated footer links
require('./build_multipage.js');
console.log('All 19 footer pages generated and linked successfully!');

