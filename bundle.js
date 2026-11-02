// Spotify Clone - Universal Standalone Bundle (Works on file:/// and http://)

;(function() {

/**
 * Spotify Clone - Backend API Client
 * Provides seamless communication with Node.js/Express backend (/api/*)
 * with automatic fallback to offline local storage when running standalone.
 */

const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http'))
    ? window.location.origin
    : 'http://localhost:5000';

class SpotifyApiClient {
    constructor() {
        this.token = (typeof localStorage !== 'undefined') ? localStorage.getItem('spotify_token') || null : null;
        this.isOnline = false;
    }

    setToken(token) {
        this.token = token;
        if (typeof localStorage !== 'undefined') {
            if (token) localStorage.setItem('spotify_token', token);
            else localStorage.removeItem('spotify_token');
        }
    }

    getToken() {
        if (!this.token && typeof localStorage !== 'undefined') {
            this.token = localStorage.getItem('spotify_token');
        }
        return this.token;
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                return { error: data.error || `HTTP error ${res.status}`, status: res.status };
            }
            this.isOnline = true;
            return { data, status: res.status };
        } catch (err) {
            this.isOnline = false;
            return { error: err.message || 'Network unreachable', isOffline: true };
        }
    }

    // Health
    async checkHealth() {
        const res = await this.request('/api/health');
        return !res.error && res.data && (res.data.status === 'ok' || res.data.status === 'online');
    }

    // Auth
    async login(email, password) {
        const res = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (res.data && res.data.token) {
            this.setToken(res.data.token);
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('spotify_user', JSON.stringify(res.data.user));
            }
        }
        return res;
    }

    async register(name, email, password, birthYear) {
        const res = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, birthYear })
        });
        if (res.data && res.data.token) {
            this.setToken(res.data.token);
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('spotify_user', JSON.stringify(res.data.user));
            }
        }
        return res;
    }

    async getMe() {
        return await this.request('/api/auth/me');
    }

    async updateProfile(updates) {
        return await this.request('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    // Tracks
    async getTracks(query = '', genre = '') {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (genre && genre !== 'all') params.append('genre', genre);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return await this.request(`/api/tracks${qs}`);
    }

    async getTrackById(id) {
        return await this.request(`/api/tracks/${id}`);
    }

    // Playlists
    async getPlaylists() {
        return await this.request('/api/playlists');
    }

    async createPlaylist(name, description = '') {
        return await this.request('/api/playlists', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
    }

    async addTrackToPlaylist(playlistId, trackId) {
        return await this.request(`/api/playlists/${playlistId}/tracks`, {
            method: 'POST',
            body: JSON.stringify({ trackId })
        });
    }

    async removeTrackFromPlaylist(playlistId, trackId) {
        return await this.request(`/api/playlists/${playlistId}/tracks/${trackId}`, {
            method: 'DELETE'
        });
    }

    // Likes & User
    async getLikes() {
        return await this.request('/api/user/likes');
    }

    async toggleLike(trackId) {
        return await this.request('/api/user/likes', {
            method: 'POST',
            body: JSON.stringify({ trackId })
        });
    }

    // Search & Podcasts
    async search(query) {
        return await this.request(`/api/search?q=${encodeURIComponent(query || '')}`);
    }

    async getPodcasts(category = '', q = '') {
        const params = new URLSearchParams();
        if (category && category !== 'All') params.append('category', category);
        if (q) params.append('q', q);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return await this.request(`/api/podcasts${qs}`);
    }

    async getPodcastById(id) {
        return await this.request(`/api/podcasts/${id}`);
    }

    async updateSubscription(tier) {
        return await this.request('/api/user/subscription', {
            method: 'PUT',
            body: JSON.stringify({ tier })
        });
    }

    logout() {
        this.setToken(null);
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('spotify_user');
        }
    }
}

const spotifyApi = new SpotifyApiClient();



const playlist = [
    {
        id: 1,
        title: "Top 50 - Global",
        artist: "Spotify Charts",
        img: "./assesst/card1img.jpeg",
        duration: 213,
        rootFreq: 261.63,
        chords: [[261.63, 329.63, 392.00], [220.00, 261.63, 329.63], [174.61, 220.00, 261.63], [196.00, 246.94, 293.66]],
        tempo: 104,
        lyrics: [
            "♪ Welcome to the Top 50 - Global countdown ♪",
            "Trending all across the worldwide waves",
            "Number one vibes taking over the stage",
            "Turn the volume higher, let the rhythm ignite",
            "Global hits echoing throughout the night"
        ]
    },
    {
        id: 2,
        title: "Mahiya Jinna Sohna",
        artist: "Darshan Raval",
        img: "./assesst/card2img.jpeg",
        duration: 195,
        rootFreq: 293.66,
        chords: [[293.66, 369.99, 440.00], [246.94, 293.66, 369.99], [196.00, 246.94, 293.66], [220.00, 277.18, 329.63]],
        tempo: 92,
        lyrics: [
            "♪ Tu hi meri zindagani, tu hi chain mera ♪",
            "Mahiya jinna sohna koi hor na mileya",
            "Akhiyan ch teri bas khwab sajaake",
            "Rabb ton vi pehla tera naam leya"
        ]
    },
    {
        id: 3,
        title: "Mere Paas Tum Ho",
        artist: "Rahat Fateh Ali Khan",
        img: "./assesst/card3img.jpeg",
        duration: 248,
        rootFreq: 220.00,
        chords: [[220.00, 261.63, 329.63], [174.61, 220.00, 261.63], [196.00, 246.94, 293.66], [164.81, 207.65, 246.94]],
        tempo: 78,
        lyrics: [
            "♪ Bhool jaane ka hunar mujhko sikhate jaao ♪",
            "Ja rahe ho toh sabhi naqsh mitaate jaao",
            "Chalo maana ki yeh kismat ka faisla tha",
            "Mere paas tum ho, bas itna bataate jaao"
        ]
    },
    {
        id: 4,
        title: "Naa Ready - Leo",
        artist: "Anirudh Ravichander, Thalapathy Vijay",
        img: "./assesst/card4img.jpeg",
        duration: 188,
        rootFreq: 329.63,
        chords: [[164.81, 196.00, 246.94], [174.61, 220.00, 261.63], [196.00, 246.94, 293.66], [164.81, 196.00, 246.94]],
        tempo: 128,
        lyrics: [
            "♪ Aagasam idikithu, aalungallum aaduthu ♪",
            "Naa ready thaan varava, aiyya thaaru maara varava",
            "Thannanthani aalaaga vaaren da",
            "Thalapathy entry tharuvein da!"
        ]
    },
    {
        id: 5,
        title: "Starboy",
        artist: "The Weeknd, Daft Punk",
        img: "./assesst/card3img.jpeg",
        duration: 230,
        rootFreq: 246.94,
        chords: [[246.94, 293.66, 369.99], [220.00, 261.63, 329.63], [196.00, 246.94, 293.66], [246.94, 293.66, 369.99]],
        tempo: 112,
        lyrics: [
            "♪ I'm trying to put you in the worst mood, ah ♪",
            "P1 cleaner than your church shoes, ah",
            "Look what you've done",
            "I'm a motherf***ing starboy!"
        ]
    },
    {
        id: 6,
        title: "Blinding Lights",
        artist: "The Weeknd",
        img: "./assesst/card4img.jpeg",
        duration: 200,
        rootFreq: 349.23,
        chords: [[349.23, 440.00, 523.25], [293.66, 349.23, 440.00], [261.63, 329.63, 392.00], [196.00, 246.94, 293.66]],
        tempo: 130,
        lyrics: [
            "♪ I've been on my own for long enough ♪",
            "Maybe you can show me how to love, maybe",
            "I'm blinded by the lights",
            "No, I can't sleep until I feel your touch"
        ]
    },
    {
        id: 7,
        title: "Top Songs - Global",
        artist: "Weekly Music Charts",
        img: "./assesst/card5img.jpeg",
        duration: 222,
        rootFreq: 261.63,
        chords: [[261.63, 329.63, 392.00], [196.00, 246.94, 293.66], [220.00, 261.63, 329.63], [174.61, 220.00, 261.63]],
        tempo: 100,
        lyrics: [
            "♪ Global vibes spinning all week long ♪",
            "Catch the sound of the world in a single song",
            "Melodies in flight under the northern sky"
        ]
    },
    {
        id: 8,
        title: "Top Songs - India",
        artist: "Weekly Music Charts - India",
        img: "./assesst/card6img.jpeg",
        duration: 175,
        rootFreq: 293.66,
        chords: [[293.66, 369.99, 440.00], [220.00, 261.63, 329.63], [196.00, 246.94, 293.66], [220.00, 277.18, 329.63]],
        tempo: 108,
        lyrics: [
            "♪ Desi beats and rhythms that never cease ♪",
            "Bollywood magic and regional masterpiece",
            "Dance through the streets till the break of day"
        ]
    },
    {
        id: 9,
        title: "Trending Chill Hits",
        artist: "Spotify Curated",
        img: "./assesst/card1img.jpeg",
        duration: 205,
        rootFreq: 220.00,
        chords: [[220.00, 261.63, 329.63], [174.61, 220.00, 261.63], [261.63, 329.63, 392.00], [196.00, 246.94, 293.66]],
        tempo: 84,
        lyrics: [
            "♪ Gentle breeze softly drifting by ♪",
            "Lo-fi frequencies soothing your mind",
            "Take a deep breath and let the worries unwind"
        ]
    }
];


/**
 * Spotify Clone - Explore Premium Page Module
 * Plans, FAQ accordions, billing toggles, feature comparison & subscription modal
 */

const premiumPlans = [
    {
        id: "individual",
        name: "Individual",
        badge: "Free for 1 month",
        priceMonthly: 10.99,
        priceAnnual: 99.99,
        accounts: "1 Premium account",
        desc: "For one person who wants ad-free music, on-demand playback, and offline downloads anywhere.",
        perks: [
            "1 verified Premium account",
            "Listen ad-free without interruptions",
            "Download up to 10,000 songs for offline play",
            "Play songs in any order on any device",
            "High-fidelity audio streaming (320 kbps)",
            "Cancel online anytime with 1 click"
        ],
        buttonText: "Try 1 Month Free",
        popular: false
    },
    {
        id: "duo",
        name: "Duo",
        badge: "Most Popular",
        priceMonthly: 14.99,
        priceAnnual: 139.99,
        accounts: "2 Premium accounts",
        desc: "For couples or roommates living under the same roof. 2 separate accounts, 1 discounted bill.",
        perks: [
            "2 separate, independent Premium accounts",
            "Duo Mix: an auto-updated shared playlist",
            "Ad-free music listening on all devices",
            "Offline playback for both members",
            "High audio quality on phone, desktop & TV",
            "Separate saved songs, playlists & recommendations"
        ],
        buttonText: "Get Premium Duo",
        popular: true
    },
    {
        id: "family",
        name: "Family",
        badge: "Best Value",
        priceMonthly: 16.99,
        priceAnnual: 159.99,
        accounts: "Up to 6 accounts",
        desc: "For up to 6 family members living together. Includes Spotify Kids and explicit content controls.",
        perks: [
            "6 separate individual Premium accounts",
            "Family Mix: shared playlist updated with favorites",
            "Block explicit music for younger listeners",
            "Access to Spotify Kids dedicated mobile app",
            "Ad-free listening and unlimited offline downloads",
            "Only $2.83 per person / month"
        ],
        buttonText: "Get Premium Family",
        popular: false
    },
    {
        id: "student",
        name: "Student",
        badge: "Special Discount",
        priceMonthly: 5.99,
        priceAnnual: 59.99,
        accounts: "1 verified student",
        desc: "Huge 50% discount for eligible university or college students. Includes free Hulu subscription.",
        perks: [
            "50% discount off standard Individual plan",
            "Hulu (With Ads) subscription included free",
            "Ad-free music and podcast listening",
            "Download songs for offline studying",
            "Verified annually via SheerID",
            "Keep student rate for up to 4 years"
        ],
        buttonText: "Get Student Discount",
        popular: false
    }
];

const premiumFaqs = [
    {
        q: "How does the Spotify Premium 1-month free trial work?",
        a: "If you've never had Premium before, you can try it free for 30 days. You get complete access to all Premium features with zero ads and unlimited downloads. We'll remind you 7 days before your trial ends. If you don't cancel, your subscription continues automatically at the regular monthly price."
    },
    {
        q: "Can I cancel my subscription at any time?",
        a: "Yes! There are no contracts, no cancellation fees, and no commitments. You can cancel your subscription with a single click in your Account settings. You'll keep your Premium benefits until the end of your current billing period."
    },
    {
        q: "How do the Duo and Family plans work?",
        a: "Every member gets their own private Premium account with their own passwords, saved music, and personalized playlists. Members must simply reside at the same physical address. The plan manager pays one simple combined monthly bill."
    },
    {
        q: "How do I qualify for the Student discount?",
        a: "You must be currently enrolled at an accredited college or university. Verification is quick and automated through SheerID. Once approved, you get the $5.99/mo rate for up to 12 months at a time, renewable up to 4 years."
    },
    {
        q: "What audio quality does Premium provide?",
        a: "Spotify Premium streams audio at up to 320 kbps (Very High quality AAC/Ogg Vorbis), compared to 160 kbps on the Free plan. You get richer bass, clearer vocals, and pristine instrument separation."
    }
];

function initPremium({ onSubscribeSuccess, toast }) {
    let billingCycle = "monthly"; // 'monthly' | 'annual'
    let selectedPlan = premiumPlans[0];

    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Render plans grid
    function renderPlans() {
        const grid = $("premiumPlansGrid");
        if (!grid) return;

        grid.innerHTML = premiumPlans.map(plan => {
            const price = billingCycle === "monthly" 
                ? `$${plan.priceMonthly} <span class="price-cycle">/ month</span>`
                : `$${plan.priceAnnual} <span class="price-cycle">/ year (Save 20%)</span>`;

            return `
            <div class="premium-plan-card ${plan.popular ? 'popular-card' : ''}" data-plan-id="${plan.id}">
                ${plan.popular ? '<div class="popular-ribbon"><i class="fa-solid fa-fire"></i> Most Popular</div>' : ''}
                <div class="plan-card-header">
                    <span class="plan-badge ${plan.popular ? 'green-badge' : ''}">${plan.badge}</span>
                    <h3 class="plan-title">${plan.name}</h3>
                    <div class="plan-price">${price}</div>
                    <span class="plan-accounts"><i class="fa-solid fa-users"></i> ${plan.accounts}</span>
                </div>
                <p class="plan-desc">${plan.desc}</p>
                <div class="plan-divider"></div>
                <ul class="plan-perks-list">
                    ${plan.perks.map(p => `<li><i class="fa-solid fa-check"></i> <span>${p}</span></li>`).join("")}
                </ul>
                <button class="badge plan-action-btn ${plan.popular ? 'create-btn' : ''}" data-plan-id="${plan.id}">
                    ${plan.buttonText}
                </button>
            </div>`;
        }).join("");

        // Attach plan button click handlers
        $$(".plan-action-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const planId = btn.dataset.planId;
                const plan = premiumPlans.find(p => p.id === planId) || premiumPlans[0];
                openCheckoutModal(plan);
            });
        });
    }

    // Render FAQs
    function renderFaqs() {
        const container = $("premiumFaqContainer");
        if (!container) return;

        container.innerHTML = premiumFaqs.map((faq, idx) => `
            <div class="faq-accordion-item" data-idx="${idx}">
                <button class="faq-question-btn">
                    <span>${faq.q}</span>
                    <i class="fa-solid fa-chevron-down faq-chevron"></i>
                </button>
                <div class="faq-answer-panel">
                    <p>${faq.a}</p>
                </div>
            </div>
        `).join("");

        $$(".faq-question-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const item = btn.closest(".faq-accordion-item");
                const wasActive = item.classList.contains("open");
                $$(".faq-accordion-item").forEach(i => i.classList.remove("open"));
                if (!wasActive) item.classList.add("open");
            });
        });
    }

    // Billing toggle (Monthly vs Annual)
    const toggleMonthly = $("billingMonthlyBtn");
    const toggleAnnual = $("billingAnnualBtn");

    if (toggleMonthly && toggleAnnual) {
        toggleMonthly.addEventListener("click", () => {
            billingCycle = "monthly";
            toggleMonthly.classList.add("active-toggle");
            toggleAnnual.classList.remove("active-toggle");
            renderPlans();
        });

        toggleAnnual.addEventListener("click", () => {
            billingCycle = "annual";
            toggleAnnual.classList.add("active-toggle");
            toggleMonthly.classList.remove("active-toggle");
            renderPlans();
            toast("Switched to annual billing with 20% discount!", "fa-tag");
        });
    }

    // Checkout Modal
    const modal = $("subscribeModal");
    const closeBtn = $("closeCheckoutModalBtn");
    const cancelBtn = $("cancelCheckoutBtn");
    const confirmBtn = $("confirmSubscribeBtn");

    function openCheckoutModal(plan) {
        selectedPlan = plan;
        $("checkoutPlanTitle").textContent = `Get Spotify ${plan.name}`;
        $("checkoutPlanPrice").textContent = billingCycle === "monthly" 
            ? `$${plan.priceMonthly} / month` 
            : `$${plan.priceAnnual} / year`;
        $("checkoutPromoTag").textContent = plan.badge;
        $("checkoutPlanDesc").textContent = plan.desc;
        confirmBtn.textContent = plan.id === "individual" ? "Start 1 Month Free" : `Subscribe to ${plan.name}`;
        modal.style.display = "flex";
    }

    function closeCheckoutModal() {
        modal.style.display = "none";
    }

    if (closeBtn) closeBtn.addEventListener("click", closeCheckoutModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeCheckoutModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeCheckoutModal();
        });
    }

    // Payment radio click styling
    $$(".payment-radio").forEach(radio => {
        radio.addEventListener("click", () => {
            $$(".payment-radio").forEach(r => r.classList.remove("selected"));
            radio.classList.add("selected");
        });
    });

    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

            setTimeout(() => {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `Start 1 Month Free`;
                closeCheckoutModal();

                if (onSubscribeSuccess) {
                    onSubscribeSuccess(selectedPlan);
                }
                toast(`🎉 Welcome to Spotify Premium ${selectedPlan.name}!`, "fa-gem");
            }, 900);
        });
    }

    // Hero action buttons
    const heroTryBtn = $("heroTryPremiumBtn");
    const heroViewPlansBtn = $("heroViewPlansBtn");

    if (heroTryBtn) {
        heroTryBtn.addEventListener("click", () => {
            openCheckoutModal(premiumPlans[0]);
        });
    }

    if (heroViewPlansBtn) {
        heroViewPlansBtn.addEventListener("click", () => {
            const plansHeader = $("premiumPlansSection");
            if (plansHeader) {
                plansHeader.scrollIntoView({ behavior: "smooth" });
            }
        });
    }

    // Initial render
    renderPlans();
    renderFaqs();
}



/**
 * Spotify Clone - Profile Section Module
 * Profile header, public playlists, followed artists, settings & inline edit modal
 */

const userProfileState = {
    name: "Alex Morgan",
    username: "@alexmorgan_beats",
    bio: "Music curator • Late night lo-fi, synthwave & indie acoustic enthusiast 🎧",
    avatar: "./assesst/logo.png",
    tier: "Spotify Free",
    isPremium: false,
    followers: 182,
    followingCount: 14,
    publicPlaylistCount: 3,
    topArtists: [
        { id: 1, name: "The Weeknd", genre: "Pop / R&B", img: "./assesst/card4img.jpeg", listeners: "108.4M monthly listeners", following: true },
        { id: 2, name: "Darshan Raval", genre: "Romantic / Pop", img: "./assesst/card2img.jpeg", listeners: "28.1M monthly listeners", following: true },
        { id: 3, name: "Anirudh Ravichander", genre: "Soundtracks / Mass", img: "./assesst/card4img.jpeg", listeners: "24.6M monthly listeners", following: false },
        { id: 4, name: "Rahat Fateh Ali Khan", genre: "Sufi / Soul", img: "./assesst/card3img.jpeg", listeners: "15.8M monthly listeners", following: true },
        { id: 5, name: "Arijit Singh", genre: "Bollywood / Melodies", img: "./assesst/card6img.jpeg", listeners: "39.2M monthly listeners", following: false },
        { id: 6, name: "Dua Lipa", genre: "Nu-Disco / Pop", img: "./assesst/card5img.jpeg", listeners: "77.5M monthly listeners", following: true }
    ],
    settings: {
        audioQuality: "very-high",
        crossfade: 4,
        autoplay: true,
        explicit: true,
        normalizeVolume: true,
        privateSession: false
    }
};

function initProfile({ onOpenPlaylist, toast, navigate, onLogout, onOpenAuth }) {
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Profile DOM Elements
    const heroAvatar = $("profileHeroAvatar");
    const heroName = $("profileHeroName");
    const heroBio = $("profileHeroBio");
    const heroTierBadge = $("profileTierBadge");
    const heroStats = $("profileHeroStats");
    const editBtn = $("editProfileBtn");
    const shareBtn = $("shareProfileBtn");
    const upgradeBadgeBtn = $("profileUpgradeBtn");
    const profileAuthBtn = $("profileAuthBtn");
    const profileLogoutBtn = $("profileLogoutBtn");
    const settingSwitchAccountBtn = $("settingSwitchAccountBtn");
    const settingLogoutBtn = $("settingLogoutBtn");

    // Modal elements
    const editModal = $("editProfileModal");
    const closeEditBtn = $("closeProfileModalBtn");
    const cancelEditBtn = $("cancelProfileBtn");
    const saveEditBtn = $("saveProfileBtn");
    const nameInput = $("profileNameInput");
    const bioInput = $("profileBioInput");
    const avatarPreview = $("avatarPreview");

    // Dropdown elements
    const dropdownName = $("dropdownUserName");
    const dropdownTier = $("dropdownUserTier");

    // Render Hero Info
    function renderHero() {
        if (heroName) heroName.textContent = userProfileState.name;
        if (heroBio) heroBio.textContent = userProfileState.bio;
        if (heroTierBadge) {
            heroTierBadge.textContent = userProfileState.tier.toUpperCase();
            heroTierBadge.className = userProfileState.isPremium 
                ? "profile-badge premium-badge" 
                : "profile-badge free-badge";
        }
        if (heroStats) {
            heroStats.innerHTML = `
                <span><strong>${userProfileState.publicPlaylistCount}</strong> Public Playlists</span>
                <span class="stat-bullet">•</span>
                <span><strong>${userProfileState.followers}</strong> Followers</span>
                <span class="stat-bullet">•</span>
                <span><strong>${userProfileState.followingCount}</strong> Following</span>
            `;
        }
        if (dropdownName) dropdownName.textContent = userProfileState.name;
        if (dropdownTier) dropdownTier.textContent = userProfileState.tier;

        if (upgradeBadgeBtn) {
            upgradeBadgeBtn.style.display = userProfileState.isPremium ? "none" : "inline-flex";
        }
    }

    // Render Profile Playlists Tab
    function renderPlaylists(playlists = []) {
        const container = $("profilePlaylistsGrid");
        if (!container) return;

        userProfileState.publicPlaylistCount = playlists.length;
        renderHero();

        if (playlists.length === 0) {
            container.innerHTML = `
                <div class="empty-profile-box">
                    <i class="fa-solid fa-music"></i>
                    <h4>No public playlists yet</h4>
                    <p>Create your first playlist and it will appear on your public profile.</p>
                    <button class="badge create-btn" id="profileCreatePlBtn">Create Playlist</button>
                </div>
            `;
            const btn = $("profileCreatePlBtn");
            if (btn) btn.addEventListener("click", () => navigate("createPlaylist"));
            return;
        }

        container.innerHTML = playlists.map(pl => {
            const cover = pl.songs && pl.songs.length > 0 ? "./assesst/card2img.jpeg" : "./assesst/card1img.jpeg";
            return `
            <div class="card profile-pl-card" data-playlist-id="${pl.id}">
                <div class="card-img-wrapper">
                    <img src="${cover}" class="card-img" alt="${pl.name}">
                    <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
                <p class="card-title">${pl.name}</p>
                <p class="card-info">By ${userProfileState.name} • ${pl.songs ? pl.songs.length : 0} songs</p>
            </div>`;
        }).join("");

        $$(".profile-pl-card").forEach(c => {
            c.addEventListener("click", () => {
                const id = parseInt(c.dataset.playlistId, 10);
                if (onOpenPlaylist) onOpenPlaylist(id);
            });
        });
    }

    // Render Top Artists Tab
    function renderArtists() {
        const grid = $("profileArtistsGrid");
        if (!grid) return;

        grid.innerHTML = userProfileState.topArtists.map(artist => `
            <div class="artist-card" data-artist-id="${artist.id}">
                <div class="artist-img-wrapper">
                    <img src="${artist.img}" class="artist-img" alt="${artist.name}">
                    <button class="artist-hover-play" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
                <div class="artist-meta">
                    <span class="artist-type">Artist</span>
                    <h4 class="artist-name">${artist.name}</h4>
                    <p class="artist-genre">${artist.genre}</p>
                    <p class="artist-listeners">${artist.listeners}</p>
                </div>
                <button class="badge follow-artist-btn ${artist.following ? 'following-btn' : 'dark-badge'}" data-artist-id="${artist.id}">
                    ${artist.following ? 'Following' : 'Follow'}
                </button>
            </div>
        `).join("");

        $$(".follow-artist-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.artistId, 10);
                const art = userProfileState.topArtists.find(a => a.id === id);
                if (art) {
                    art.following = !art.following;
                    userProfileState.followingCount += art.following ? 1 : -1;
                    renderHero();
                    renderArtists();
                    toast(art.following ? `Now following ${art.name}` : `Unfollowed ${art.name}`, art.following ? "fa-user-plus" : "fa-user-minus");
                }
            });
        });
    }

    // Profile Tabs Switching
    $$(".profile-nav-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            $$(".profile-nav-tab").forEach(t => t.classList.remove("active-tab"));
            $$(".profile-tab-pane").forEach(p => p.style.display = "none");

            tab.classList.add("active-tab");
            const targetPane = $(tab.dataset.target);
            if (targetPane) targetPane.style.display = "block";
        });
    });

    // Settings Inputs Logic
    function initSettings() {
        const qualitySelect = $("settingAudioQuality");
        const crossfadeRange = $("settingCrossfade");
        const crossfadeVal = $("crossfadeValue");
        const autoplayToggle = $("settingAutoplay");
        const explicitToggle = $("settingExplicit");
        const privateToggle = $("settingPrivateSession");

        if (qualitySelect) {
            qualitySelect.value = userProfileState.settings.audioQuality;
            qualitySelect.addEventListener("change", (e) => {
                userProfileState.settings.audioQuality = e.target.value;
                toast(`Streaming quality set to: ${e.target.options[e.target.selectedIndex].text}`, "fa-sliders");
            });
        }

        if (crossfadeRange && crossfadeVal) {
            crossfadeRange.value = userProfileState.settings.crossfade;
            crossfadeVal.textContent = `${userProfileState.settings.crossfade}s`;
            crossfadeRange.addEventListener("input", (e) => {
                userProfileState.settings.crossfade = e.target.value;
                crossfadeVal.textContent = `${e.target.value}s`;
            });
        }

        if (autoplayToggle) {
            autoplayToggle.checked = userProfileState.settings.autoplay;
            autoplayToggle.addEventListener("change", (e) => {
                userProfileState.settings.autoplay = e.target.checked;
                toast(e.target.checked ? "Autoplay turned ON" : "Autoplay turned OFF", "fa-play");
            });
        }

        if (explicitToggle) {
            explicitToggle.checked = userProfileState.settings.explicit;
            explicitToggle.addEventListener("change", (e) => {
                userProfileState.settings.explicit = e.target.checked;
                toast(e.target.checked ? "Explicit content allowed" : "Explicit content blocked", "fa-shield");
            });
        }

        if (privateToggle) {
            privateToggle.checked = userProfileState.settings.privateSession;
            privateToggle.addEventListener("change", (e) => {
                userProfileState.settings.privateSession = e.target.checked;
                toast(e.target.checked ? "Private session started" : "Private session ended", "fa-user-secret");
            });
        }
    }

    // Edit Profile Modal
    function openEditModal() {
        if (!editModal) return;
        nameInput.value = userProfileState.name;
        bioInput.value = userProfileState.bio;
        editModal.style.display = "flex";
        nameInput.focus();
    }

    function closeEditModal() {
        if (!editModal) return;
        editModal.style.display = "none";
    }

    if (editBtn) editBtn.addEventListener("click", openEditModal);
    if (closeEditBtn) closeEditBtn.addEventListener("click", closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);
    if (editModal) {
        editModal.addEventListener("click", (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }

    if (saveEditBtn) {
        saveEditBtn.addEventListener("click", () => {
            const newName = nameInput.value.trim() || userProfileState.name;
            const newBio = bioInput.value.trim();
            userProfileState.name = newName;
            userProfileState.bio = newBio;
            renderHero();
            closeEditModal();
            if (typeof spotifyApi !== "undefined") {
                spotifyApi.updateProfile({ name: newName, bio: newBio }).catch(() => {});
            }
            toast("Profile details updated successfully!", "fa-user-pen");
        });
    }

    // Share Profile button
    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            const dummyUrl = `https://open.spotify.com/user/${userProfileState.username.replace('@','')}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(dummyUrl).catch(() => {});
            }
            toast("Profile link copied to clipboard!", "fa-link");
        });
    }

    // Upgrade button on profile page
    if (upgradeBadgeBtn) {
        upgradeBadgeBtn.addEventListener("click", () => {
            navigate("premium");
        });
    }

    // Switch Account buttons
    if (profileAuthBtn) {
        profileAuthBtn.addEventListener("click", () => {
            if (onOpenAuth) onOpenAuth("login");
            else navigate("auth");
        });
    }
    if (settingSwitchAccountBtn) {
        settingSwitchAccountBtn.addEventListener("click", () => {
            if (onOpenAuth) onOpenAuth("login");
            else navigate("auth");
        });
    }

    // Logout buttons
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener("click", () => {
            if (onLogout) onLogout();
        });
    }
    if (settingLogoutBtn) {
        settingLogoutBtn.addEventListener("click", () => {
            if (onLogout) onLogout();
        });
    }

    // Initial setup
    renderHero();
    renderArtists();
    initSettings();

    return {
        updatePlaylists: renderPlaylists,
        setTier(tierName) {
            userProfileState.tier = tierName;
            userProfileState.isPremium = true;
            renderHero();
        },
        setUser(user) {
            if (!user) return;
            userProfileState.name = user.name || "Alex Morgan";
            if (user.tier) userProfileState.tier = user.tier;
            if (typeof user.isPremium === "boolean") userProfileState.isPremium = user.isPremium;
            if (user.bio) userProfileState.bio = user.bio;
            renderHero();
        },
        logoutUser() {
            userProfileState.name = "Guest Listener";
            userProfileState.tier = "Guest Mode";
            userProfileState.isPremium = false;
            userProfileState.bio = "Browsing Spotify as guest. Sign in or create an account to save playlists and follow artists.";
            renderHero();
        }
    };
}



/**
 * Spotify Clone - Authentication Module (Sign In & Registration)
 * Handles user login, new account registration, logout, form validations, & credential persistence
 */

const authState = {
    isLoggedIn: true, // starts logged in by default with Alex Morgan
    currentUser: {
        name: "Alex Morgan",
        email: "alex.morgan@example.com",
        avatar: "./assesst/logo.png",
        tier: "Spotify Free",
        isPremium: false
    }
};

function initAuthModule({ onLoginSuccess, onRegisterSuccess, onLogout, toast, navigate }) {
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    let activeTab = "login"; // 'login' | 'register'

    // Form elements
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");
    const loginTabBtn = $("authTabLogin");
    const registerTabBtn = $("authTabRegister");
    const switchPromptToReg = $("switchToRegisterPrompt");
    const switchPromptToLog = $("switchToLoginPrompt");

    // Inputs
    const loginEmail = $("loginEmailInput");
    const loginPass = $("loginPasswordInput");
    const regEmail = $("regEmailInput");
    const regPass = $("regPasswordInput");
    const regName = $("regNameInput");
    const regYear = $("regBirthYear");

    // Password visibility toggles
    const toggleLoginPassBtn = $("toggleLoginPass");
    const toggleRegPassBtn = $("toggleRegPass");

    function switchTab(tab) {
        activeTab = tab;
        if (tab === "login") {
            if (loginTabBtn) loginTabBtn.classList.add("active-auth-tab");
            if (registerTabBtn) registerTabBtn.classList.remove("active-auth-tab");
            if (loginForm) loginForm.style.display = "flex";
            if (registerForm) registerForm.style.display = "none";
        } else {
            if (registerTabBtn) registerTabBtn.classList.add("active-auth-tab");
            if (loginTabBtn) loginTabBtn.classList.remove("active-auth-tab");
            if (registerForm) registerForm.style.display = "flex";
            if (loginForm) loginForm.style.display = "none";
        }
    }

    if (loginTabBtn) loginTabBtn.addEventListener("click", () => switchTab("login"));
    if (registerTabBtn) registerTabBtn.addEventListener("click", () => switchTab("register"));
    if (switchPromptToReg) switchPromptToReg.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("register");
    });
    if (switchPromptToLog) switchPromptToLog.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("login");
    });

    // Password visibility toggle helpers
    if (toggleLoginPassBtn && loginPass) {
        toggleLoginPassBtn.addEventListener("click", () => {
            const isText = loginPass.type === "text";
            loginPass.type = isText ? "password" : "text";
            toggleLoginPassBtn.innerHTML = isText ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }

    if (toggleRegPassBtn && regPass) {
        toggleRegPassBtn.addEventListener("click", () => {
            const isText = regPass.type === "text";
            regPass.type = isText ? "password" : "text";
            toggleRegPassBtn.innerHTML = isText ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }

    // Social Auth click simulations
    $$(".social-auth-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const provider = btn.textContent.trim();
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting to ${provider}...`;

            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
                
                // Successful social login
                authState.isLoggedIn = true;
                authState.currentUser = {
                    name: "Alex Morgan",
                    email: "alex.morgan@gmail.com",
                    avatar: "./assesst/logo.png",
                    tier: "Spotify Free",
                    isPremium: false
                };

                if (onLoginSuccess) onLoginSuccess(authState.currentUser);
                toast(`Connected via ${provider}! Welcome back.`, "fa-circle-check");
                navigate("home");
            }, 800);
        });
    });

    // Save original innerHTML of social buttons
    $$(".social-auth-btn").forEach(btn => {
        btn.dataset.originalHtml = btn.innerHTML;
    });

    // Log In Form Submission
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = loginEmail.value.trim();
            const pass = loginPass.value.trim();

            if (!email) {
                toast("Please enter your email or username", "fa-circle-exclamation");
                loginEmail.focus();
                return;
            }
            if (!pass || pass.length < 4) {
                toast("Please enter your password (minimum 4 characters)", "fa-circle-exclamation");
                loginPass.focus();
                return;
            }

            const loginBtn = $("loginSubmitBtn");
            loginBtn.disabled = true;
            loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;

            (async () => {
                let userObj = null;
                if (typeof spotifyApi !== "undefined") {
                    try {
                        const res = await spotifyApi.login(email, pass);
                        if (res && res.data && res.data.user) {
                            userObj = res.data.user;
                        } else if (res && res.error && !res.isOffline) {
                            loginBtn.disabled = false;
                            loginBtn.innerHTML = "Log In";
                            toast(res.error, "fa-circle-exclamation");
                            return;
                        }
                    } catch (err) {
                        console.warn("Backend auth failed, using local fallback", err);
                    }
                }

                if (!userObj) {
                    const displayName = email.includes("@") ? email.split("@")[0] : email;
                    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                    userObj = {
                        name: formattedName,
                        email: email.includes("@") ? email : `${email}@spotify-user.com`,
                        avatar: "./assesst/logo.png",
                        tier: "Spotify Free",
                        isPremium: false
                    };
                }

                loginBtn.disabled = false;
                loginBtn.innerHTML = "Log In";

                authState.isLoggedIn = true;
                authState.currentUser = userObj;

                loginForm.reset();
                if (onLoginSuccess) onLoginSuccess(authState.currentUser);
                toast(`Welcome back, ${userObj.name}!`, "fa-circle-check");
                navigate("home");
            })();
        });
    }

    // Register Form Submission
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = regEmail.value.trim();
            const pass = regPass.value.trim();
            const name = regName.value.trim() || (email.includes("@") ? email.split("@")[0] : "New Listener");

            if (!email || !email.includes("@")) {
                toast("Please enter a valid email address", "fa-circle-exclamation");
                regEmail.focus();
                return;
            }
            if (!pass || pass.length < 6) {
                toast("Password must be at least 6 characters long", "fa-circle-exclamation");
                regPass.focus();
                return;
            }
            if (regYear && regYear.value && parseInt(regYear.value, 10) > 2018) {
                toast("Please enter a valid birth year", "fa-circle-exclamation");
                regYear.focus();
                return;
            }

            const regBtn = $("registerSubmitBtn");
            regBtn.disabled = true;
            regBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;

            (async () => {
                let userObj = null;
                if (typeof spotifyApi !== "undefined") {
                    try {
                        const res = await spotifyApi.register(name, email, pass, regYear ? regYear.value : null);
                        if (res && res.data && res.data.user) {
                            userObj = res.data.user;
                        } else if (res && res.error && !res.isOffline) {
                            regBtn.disabled = false;
                            regBtn.innerHTML = "Sign Up";
                            toast(res.error, "fa-circle-exclamation");
                            return;
                        }
                    } catch (err) {
                        console.warn("Backend register failed, using local fallback", err);
                    }
                }

                if (!userObj) {
                    userObj = {
                        name: name,
                        email: email,
                        avatar: "./assesst/logo.png",
                        tier: "Spotify Free",
                        isPremium: false
                    };
                }

                regBtn.disabled = false;
                regBtn.innerHTML = "Sign Up";

                authState.isLoggedIn = true;
                authState.currentUser = userObj;

                registerForm.reset();
                if (onRegisterSuccess) onRegisterSuccess(authState.currentUser);
                toast(`Welcome to Spotify, ${userObj.name}! Your account is ready.`, "fa-circle-check");
                navigate("profile");
            })();
        });
    }

    // Logout Action function
    function performLogout() {
        if (typeof spotifyApi !== "undefined") {
            spotifyApi.logout();
        }
        authState.isLoggedIn = false;
        authState.currentUser = {
            name: "Guest Listener",
            email: "",
            avatar: "./assesst/logo.png",
            tier: "Guest Mode",
            isPremium: false
        };

        if (onLogout) onLogout();
        toast("You have been logged out of Spotify", "fa-arrow-right-from-bracket");
        // Open Auth screen for easy sign in / register
        switchTab("login");
        navigate("auth");
    }

    return {
        switchTab,
        logout: performLogout,
        isLoggedIn: () => authState.isLoggedIn,
        getUser: () => authState.currentUser
    };
}



/**
 * Spotify Clone - Music / Now Playing Screen Module
 * Immersive track showcase, synchronized interactive lyrics, artist profile,
 * dynamic album color theming, and real-time Web Audio spectrum visualizer
 */

const trackDetailsMeta = {
    1: {
        album: "Global Top Charts 2024",
        year: "2024",
        plays: "2,841,920,381",
        key: "C Major (261.6 Hz)",
        bpm: "104 BPM",
        writers: "Global Chart Curators & Songwriters",
        producers: "Spotify Chart Editorial Team",
        avatar: "./assesst/card1img.jpeg",
        listeners: "148,290,118 monthly listeners",
        bio: "Your daily countdown of the most played music across every country and continent on Spotify worldwide."
    },
    2: {
        album: "Darasal Acoustic Sessions",
        year: "2023",
        plays: "492,810,490",
        key: "D Major (293.7 Hz)",
        bpm: "92 BPM",
        writers: "Darshan Raval, Gurpreet Saini",
        producers: "Darshan Raval, Lijo George",
        avatar: "./assesst/card2img.jpeg",
        listeners: "28,140,295 monthly listeners",
        bio: "Indian playback singer, songwriter, and composer known for his heartfelt romantic ballads and soulful voice."
    },
    3: {
        album: "Mere Paas Tum Ho (Original Soundtrack)",
        year: "2020",
        plays: "612,490,120",
        key: "A Minor (220.0 Hz)",
        bpm: "78 BPM",
        writers: "Khalil-ur-Rehman Qamar",
        producers: "Naveed Nashad",
        avatar: "./assesst/card3img.jpeg",
        listeners: "15,820,400 monthly listeners",
        bio: "Legendary Pakistani Sufi and classical singer, nephew of Ustad Nusrat Fateh Ali Khan, celebrated worldwide."
    },
    4: {
        album: "Leo (Original Motion Picture Soundtrack)",
        year: "2023",
        plays: "389,120,845",
        key: "E Minor (329.6 Hz)",
        bpm: "128 BPM",
        writers: "Vishnu Edavan, Asal Kolaar",
        producers: "Anirudh Ravichander",
        avatar: "./assesst/card4img.jpeg",
        listeners: "24,650,110 monthly listeners",
        bio: "Renowned Indian music composer and singer revolutionizing Tamil and Indian cinema music with viral high-energy hits."
    },
    5: {
        album: "Starboy",
        year: "2016",
        plays: "3,480,910,240",
        key: "B Minor (246.9 Hz)",
        bpm: "112 BPM",
        writers: "Abel Tesfaye, Guy-Manuel de Homem-Christo, Thomas Bangalter",
        producers: "Daft Punk, The Weeknd, Doc McKinney",
        avatar: "./assesst/card3img.jpeg",
        listeners: "108,450,910 monthly listeners",
        bio: "Canadian singer, songwriter, and record producer. Known for sonic versatility and dark lyrical aesthetics."
    },
    6: {
        album: "After Hours",
        year: "2020",
        plays: "4,195,490,128",
        key: "F Minor (349.2 Hz)",
        bpm: "130 BPM",
        writers: "Abel Tesfaye, Max Martin, Oscar Holter, Belly, Jason Quenneville",
        producers: "Max Martin, Oscar Holter, The Weeknd",
        avatar: "./assesst/card4img.jpeg",
        listeners: "108,450,910 monthly listeners",
        bio: "Global music icon whose retro synth-pop masterpiece Blinding Lights became the #1 Billboard Hot 100 song of all time."
    },
    7: {
        album: "Weekly Worldwide Chartbusters",
        year: "2024",
        plays: "1,940,290,110",
        key: "C Major (261.6 Hz)",
        bpm: "100 BPM",
        writers: "International Editorial Syndicate",
        producers: "Spotify Global Editorial",
        avatar: "./assesst/card5img.jpeg",
        listeners: "95,410,200 monthly listeners",
        bio: "The comprehensive weekly index measuring global streaming velocity and breakthrough hits."
    },
    8: {
        album: "Top India Bollywood & Regional",
        year: "2024",
        plays: "1,450,190,830",
        key: "D Major (293.7 Hz)",
        bpm: "108 BPM",
        writers: "Bollywood Composers Union",
        producers: "Mumbai Recording Studios",
        avatar: "./assesst/card6img.jpeg",
        listeners: "88,290,400 monthly listeners",
        bio: "The biggest, most streamed tracks across Hindi, Punjabi, Tamil, and Telugu playlists in India."
    },
    9: {
        album: "Lo-Fi Beats to Relax / Study to",
        year: "2024",
        plays: "892,109,240",
        key: "A Minor (220.0 Hz)",
        bpm: "84 BPM",
        writers: "Chillhop Sound Collective",
        producers: "Spotify Curators & Sound Labs",
        avatar: "./assesst/card1img.jpeg",
        listeners: "42,109,000 monthly listeners",
        bio: "Warm analog textures, soft keys, and lazy rhythms carefully crafted for peaceful focus and restful late nights."
    }
};

// High-fidelity Spotify-style vibrant album palettes
const trackColorPalettes = {
    1: { primary: "#1ed760", rgb: "30, 215, 96", secondary: "#129e43" },  // Emerald Green
    2: { primary: "#e84393", rgb: "232, 67, 147", secondary: "#fd79a8" }, // Romantic Rose
    3: { primary: "#f39c12", rgb: "243, 156, 18", secondary: "#e67e22" },  // Mystic Amber
    4: { primary: "#9b59b6", rgb: "155, 89, 182", secondary: "#8e44ad" }, // Royal Violet
    5: { primary: "#3498db", rgb: "52, 152, 219", secondary: "#2980b9" }, // Neon Blue
    6: { primary: "#ff2a7a", rgb: "255, 42, 122", secondary: "#7928ca" }, // 80s Synthwave Magenta
    7: { primary: "#e67e22", rgb: "230, 126, 34", secondary: "#d35400" }, // Sunset Orange
    8: { primary: "#ff4757", rgb: "255, 71, 87", secondary: "#c0392b" },  // Ruby Red
    9: { primary: "#10ac84", rgb: "16, 172, 132", secondary: "#1dd1a1" }  // Lo-Fi Teal
};

function initMusicModule(options = {}) {
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    let activeAnalyser = options.getAnalyser ? options.getAnalyser() : null;
    let currentPalette = trackColorPalettes[1];
    let isCurrentlyPlaying = false;

    // Visualizer state
    let visualizerMode = "bars"; // 'bars' | 'wave' | 'radial'
    let animFrameId = null;
    const peakHoldBars = new Float32Array(64);
    let idlePhase = 0;

    const canvas = $("audioVisualizerCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    const canvasWrapper = $("visualizerCanvasWrapper");
    const toggleBtn = $("visualizerToggleBtn");
    const toggleIcon = $("visualizerToggleIcon");

    // Initialize visualizer controls
    if (toggleBtn && canvasWrapper) {
        toggleBtn.addEventListener("click", () => {
            const isExpanded = canvasWrapper.classList.toggle("expanded");
            if (toggleIcon) {
                toggleIcon.className = isExpanded ? "fa-solid fa-compress" : "fa-solid fa-expand";
            }
            resizeCanvas();
        });
    }

    $$(".visualizer-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            $$(".visualizer-mode-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            visualizerMode = btn.dataset.mode;
        });
    });

    function resizeCanvas() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        if (ctx) ctx.scale(dpr, dpr);
    }

    window.addEventListener("resize", resizeCanvas);
    setTimeout(resizeCanvas, 100);

    // Dynamic Album Color Theme application
    function applyDynamicTheme(track) {
        const palette = trackColorPalettes[track.id] || { primary: "#1ed760", rgb: "30, 215, 96", secondary: "#129e43" };
        currentPalette = palette;

        // Set global CSS custom properties for ambient background
        document.documentElement.style.setProperty("--theme-accent", palette.primary);
        document.documentElement.style.setProperty("--theme-rgb", palette.rgb);
        document.documentElement.style.setProperty("--theme-secondary", palette.secondary);

        const pageMusic = $("pageMusic");
        if (pageMusic) {
            pageMusic.style.background = `radial-gradient(ellipse at 50% -12%, rgba(${palette.rgb}, 0.28) 0%, rgba(18, 18, 18, 0.98) 68%)`;
        }
    }

    function formatTime(sec) {
        sec = Math.floor(sec || 0);
        return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
    }

    // =========================================================================
    // VISUALIZER RENDER LOOP
    // =========================================================================
    function startVisualizerLoop() {
        if (animFrameId) {
            if (typeof window !== "undefined" && window.cancelAnimationFrame) {
                window.cancelAnimationFrame(animFrameId);
            }
        }

        const freqBuffer = new Uint8Array(64);
        const timeBuffer = new Uint8Array(128);

        function renderFrame() {
            if (typeof window !== "undefined" && window.requestAnimationFrame) {
                animFrameId = window.requestAnimationFrame(renderFrame);
            }
            if (!canvas || !ctx) return;

            const pageMusic = $("pageMusic");
            if (!pageMusic || pageMusic.style.display === "none") return; // Don't compute when page is hidden

            const dpr = window.devicePixelRatio || 1;
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;

            ctx.clearRect(0, 0, w, h);

            let hasAudio = false;
            if (activeAnalyser && isCurrentlyPlaying) {
                activeAnalyser.getByteFrequencyData(freqBuffer);
                activeAnalyser.getByteTimeDomainData(timeBuffer);
                for (let i = 0; i < 32; i++) {
                    if (freqBuffer[i] > 10) { hasAudio = true; break; }
                }
            }

            idlePhase += 0.04;

            if (visualizerMode === "bars") {
                drawBars(w, h, freqBuffer, hasAudio);
            } else if (visualizerMode === "wave") {
                drawWave(w, h, timeBuffer, hasAudio);
            } else if (visualizerMode === "radial") {
                drawRadial(w, h, freqBuffer, hasAudio);
            }
        }

        renderFrame();
    }

    // MODE 1: Frequency Bars
    function drawBars(w, h, freqBuffer, hasAudio) {
        const barCount = 42;
        const totalGap = (barCount - 1) * 3;
        const barWidth = Math.max(3, (w - totalGap) / barCount);
        const themeColor = currentPalette.primary;
        const rgb = currentPalette.rgb;

        for (let i = 0; i < barCount; i++) {
            let val = 0;
            if (hasAudio) {
                const binIdx = Math.floor((i / barCount) * 28);
                val = freqBuffer[binIdx] / 255;
            } else {
                // Ambient idle gentle wave
                val = (Math.sin(idlePhase + i * 0.22) * 0.15 + 0.2) * (isCurrentlyPlaying ? 0.4 : 0.2);
            }

            // Smooth minimum height
            const barH = Math.max(4, val * (h - 20));
            const x = i * (barWidth + 3);
            const y = h - barH - 4;

            // Peak hold calculation
            if (val > peakHoldBars[i]) {
                peakHoldBars[i] = val;
            } else {
                peakHoldBars[i] = Math.max(0, peakHoldBars[i] - 0.015);
            }

            // Dynamic Gradient per bar
            const grad = ctx.createLinearGradient(0, h, 0, y);
            grad.addColorStop(0, `rgba(${rgb}, 0.15)`);
            grad.addColorStop(0.5, themeColor);
            grad.addColorStop(1, "#ffffff");

            ctx.fillStyle = grad;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
            } else {
                ctx.rect(x, y, barWidth, barH);
            }
            ctx.fill();

            // Peak indicator dot
            if (peakHoldBars[i] > 0.08) {
                const peakY = Math.max(2, h - (peakHoldBars[i] * (h - 20)) - 8);
                ctx.fillStyle = `rgba(${rgb}, 0.9)`;
                ctx.fillRect(x, peakY, barWidth, 2);
            }
        }
    }

    // MODE 2: Oscilloscope Wave
    function drawWave(w, h, timeBuffer, hasAudio) {
        const themeColor = currentPalette.primary;
        const rgb = currentPalette.rgb;
        const centerY = h / 2;

        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = themeColor;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        const sliceWidth = w / (timeBuffer.length - 1);

        for (let i = 0; i < timeBuffer.length; i++) {
            let v = 0.5;
            if (hasAudio) {
                v = timeBuffer[i] / 255.0;
            } else {
                v = 0.5 + Math.sin(idlePhase * 1.5 + (i * 0.12)) * 0.1;
            }
            const y = v * (h - 16) + 8;
            const x = i * sliceWidth;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Secondary subtle mirror glow wave
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${rgb}, 0.35)`;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        for (let i = 0; i < timeBuffer.length; i++) {
            let v = 0.5;
            if (hasAudio) {
                v = 1.0 - (timeBuffer[i] / 255.0);
            } else {
                v = 0.5 - Math.sin(idlePhase * 1.5 + (i * 0.12)) * 0.08;
            }
            const y = v * (h - 16) + 8;
            const x = i * sliceWidth;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();
    }

    // MODE 3: Radial Pulse
    function drawRadial(w, h, freqBuffer, hasAudio) {
        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(w, h) * 0.22;
        const spokeCount = 36;
        const themeColor = currentPalette.primary;
        const rgb = currentPalette.rgb;

        ctx.save();

        // Center pulsating core
        let coreBoost = 0;
        if (hasAudio) {
            coreBoost = (freqBuffer[0] + freqBuffer[1] + freqBuffer[2]) / (3 * 255);
        } else {
            coreBoost = (Math.sin(idlePhase * 2) + 1) * 0.08;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius + coreBoost * 14, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.12 + coreBoost * 0.25})`;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 18;
        ctx.fill();

        // Radiating frequency spokes
        for (let i = 0; i < spokeCount; i++) {
            const angle = (i / spokeCount) * Math.PI * 2 + (idlePhase * 0.1);
            let val = 0;
            if (hasAudio) {
                const binIdx = Math.floor((i / spokeCount) * 24);
                val = (freqBuffer[binIdx] / 255);
            } else {
                val = (Math.sin(idlePhase + i * 0.3) * 0.2 + 0.3) * 0.4;
            }

            const spokeLength = 6 + val * (Math.min(w, h) * 0.32);
            const rStart = baseRadius + coreBoost * 10;
            const rEnd = rStart + spokeLength;

            const x1 = cx + Math.cos(angle) * rStart;
            const y1 = cy + Math.sin(angle) * rStart;
            const x2 = cx + Math.cos(angle) * rEnd;
            const y2 = cy + Math.sin(angle) * rEnd;

            ctx.lineWidth = 3;
            ctx.strokeStyle = val > 0.6 ? "#ffffff" : themeColor;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // =========================================================================
    // TRACK RENDER & UI SYNC
    // =========================================================================
    function render(track, playlist, isPlaying, likedSongs, onPlayTrack, onTogglePlay, onSeek, toast) {
        if (!track) return;
        const meta = trackDetailsMeta[track.id] || trackDetailsMeta[1];

        // 1. Dynamic Album Theming
        applyDynamicTheme(track);

        // 2. Visualizer state sync
        isCurrentlyPlaying = isPlaying;
        resizeCanvas();

        // Artwork and title
        const artEl = $("musicPageArt");
        if (artEl) {
            artEl.src = track.img;
            artEl.alt = track.title;
        }

        const titleEl = $("musicPageTitle");
        if (titleEl) titleEl.textContent = track.title;

        const artistEl = $("musicPageArtist");
        if (artistEl) artistEl.textContent = track.artist;

        const avatarEl = $("musicPageArtistAvatar");
        if (avatarEl) avatarEl.src = meta.avatar || track.img;

        const albumEl = $("musicPageAlbum");
        if (albumEl) albumEl.textContent = meta.album;

        const yearEl = $("musicPageYear");
        if (yearEl) yearEl.textContent = meta.year;

        const durEl = $("musicPageDuration");
        if (durEl) durEl.textContent = formatTime(track.duration);

        // Audio meta pills
        const bpmEl = $("musicPageBpm");
        if (bpmEl) bpmEl.textContent = meta.bpm;

        const keyEl = $("musicPageKey");
        if (keyEl) keyEl.textContent = `Key: ${meta.key}`;

        // Play/Pause button icon & style
        updatePlayState(isPlaying);

        // Like button
        updateLikeState(likedSongs.has(track.id));

        // Render Lyrics
        const lyricsContainer = $("musicPageLyrics");
        if (lyricsContainer) {
            if (track.lyrics && track.lyrics.length > 0) {
                const step = track.duration / track.lyrics.length;
                lyricsContainer.innerHTML = track.lyrics.map((line, idx) => {
                    const targetSec = Math.floor(idx * step);
                    return `<p class="lyric-sync-line ${idx === 0 ? 'active-lyric' : ''}" data-target-sec="${targetSec}" data-line-idx="${idx}">
                        ${line}
                    </p>`;
                }).join("");

                $$(".lyric-sync-line").forEach(line => {
                    line.addEventListener("click", () => {
                        const sec = parseInt(line.dataset.targetSec, 10);
                        if (onSeek) onSeek(sec);
                        highlightLyricLine(parseInt(line.dataset.lineIdx, 10));
                    });
                });
            } else {
                lyricsContainer.innerHTML = `<p class="lyric-sync-line active-lyric">♪ Instrumental & Melodic Ambience ♪</p>`;
            }
        }

        // About Artist Card
        const artistNameEl = $("aboutArtistName");
        if (artistNameEl) artistNameEl.textContent = track.artist.split(",")[0].trim();

        const artistImgEl = $("aboutArtistImg");
        if (artistImgEl) artistImgEl.src = meta.avatar || track.img;

        const artistListenersEl = $("aboutArtistListeners");
        if (artistListenersEl) artistListenersEl.textContent = meta.listeners;

        const artistBioEl = $("aboutArtistBio");
        if (artistBioEl) artistBioEl.textContent = meta.bio;

        // Credits Box
        const credArtist = $("creditArtist");
        if (credArtist) credArtist.textContent = track.artist;

        const credWriters = $("creditWriters");
        if (credWriters) credWriters.textContent = meta.writers;

        const credProducers = $("creditProducers");
        if (credProducers) credProducers.textContent = meta.producers;

        // Up Next / Recommended List
        const upNextContainer = $("musicUpNextList");
        if (upNextContainer) {
            const others = playlist.filter(t => t.id !== track.id);
            upNextContainer.innerHTML = others.map((t, i) => `
                <div class="up-next-row" data-song-id="${t.id}">
                    <span class="up-next-num">${i + 1}</span>
                    <img src="${t.img}" class="up-next-thumb" alt="${t.title}">
                    <div class="up-next-meta">
                        <span class="up-next-title">${t.title}</span>
                        <span class="up-next-artist">${t.artist}</span>
                    </div>
                    <span class="up-next-time">${formatTime(t.duration)}</span>
                    <button class="up-next-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
            `).join("");

            $$(".up-next-row").forEach(row => {
                row.addEventListener("click", () => {
                    const songId = parseInt(row.dataset.songId, 10);
                    const idx = playlist.findIndex(p => p.id === songId);
                    if (idx !== -1 && onPlayTrack) {
                        onPlayTrack(idx);
                    }
                });
            });
        }
    }

    function updatePlayState(isPlaying) {
        isCurrentlyPlaying = isPlaying;
        const playBtn = $("musicPagePlayBtn");
        const playIcon = $("musicPagePlayIcon");
        if (!playBtn || !playIcon) return;

        if (isPlaying) {
            playIcon.className = "fa-solid fa-pause";
            playBtn.classList.add("playing");
            playBtn.title = "Pause";
        } else {
            playIcon.className = "fa-solid fa-play";
            playBtn.classList.remove("playing");
            playBtn.title = "Play";
        }
    }

    function updateLikeState(isLiked) {
        const btn = $("musicPageLikeBtn");
        if (!btn) return;
        const icon = btn.querySelector("i");
        if (isLiked) {
            btn.className = "music-icon-action-btn liked";
            if (icon) icon.className = "fa-solid fa-heart";
        } else {
            btn.className = "music-icon-action-btn";
            if (icon) icon.className = "fa-regular fa-heart";
        }
    }

    function highlightLyricLine(idx) {
        const lines = $$(".lyric-sync-line");
        lines.forEach((l, i) => {
            if (i === idx) {
                l.classList.add("active-lyric");
                l.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                l.classList.remove("active-lyric");
            }
        });
    }

    // Called every tick to sync lyric highlight
    function syncLyricsWithTime(currentTime, duration, lyricsLength) {
        if (!lyricsLength) return;
        const step = duration / lyricsLength;
        const currentIdx = Math.min(lyricsLength - 1, Math.floor(currentTime / step));
        const activeLine = document.querySelector(".lyric-sync-line.active-lyric");
        const newTargetLine = document.querySelector(`.lyric-sync-line[data-line-idx="${currentIdx}"]`);

        if (newTargetLine && activeLine !== newTargetLine) {
            if (activeLine) activeLine.classList.remove("active-lyric");
            newTargetLine.classList.add("active-lyric");
        }
    }

    // Start visualizer animation loop
    startVisualizerLoop();

    return {
        render,
        updatePlayState,
        updateLikeState,
        syncLyricsWithTime,
        setAnalyser(node) {
            activeAnalyser = node;
        },
        resizeVisualizer: resizeCanvas
    };
}


const FOOTER_PAGES_DATA = [
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


/**
 * Spotify Clone - Single Page Application Controller
 * Handles routing, search, library, playlists, podcasts, premium, profile, music screen, and audio player
 */






function runApp() {
    // =========================================================================
    // STATE
    // =========================================================================
    let currentPage = "home";
    const pageHistory = ["home"];
    let historyIndex = 0;
    let authModule = null;
    let musicModule = null;

    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let repeatMode = "off";
    let currentTime = 0;
    let volume = 0.75;
    let isMuted = false;
    let prevVolume = 0.75;
    let likedSongs = new Set();
    let tickerInterval = null;

    let userPlaylists = []; // { id, name, desc, songs:[] }
    let playlistIdCounter = 1;
    let viewingPlaylistId = null;

    // Load persisted state from localStorage for multi-page continuity
    try {
        const savedTrack = localStorage.getItem("spotify_currentTrack");
        if (savedTrack !== null) currentTrackIndex = parseInt(savedTrack, 10) || 0;
        const savedLikes = localStorage.getItem("spotify_likedSongs");
        if (savedLikes) likedSongs = new Set(JSON.parse(savedLikes));
        const savedPlaylists = localStorage.getItem("spotify_userPlaylists");
        if (savedPlaylists) {
            userPlaylists = JSON.parse(savedPlaylists);
            if (userPlaylists.length > 0) {
                playlistIdCounter = Math.max(...userPlaylists.map(p => p.id)) + 1;
            }
        }
        const savedVol = localStorage.getItem("spotify_volume");
        if (savedVol !== null) volume = parseFloat(savedVol) || 0.75;
    } catch (e) {}

    // Async sync with Node.js/Express REST API if online
    if (typeof spotifyApi !== "undefined") {
        spotifyApi.checkHealth().then(isOnline => {
            if (isOnline) {
                // Sync tracks catalog from REST API
                spotifyApi.getTracks().then(res => {
                    if (res && res.data && Array.isArray(res.data.tracks) && res.data.tracks.length > 0) {
                        res.data.tracks.forEach(serverTrack => {
                            const local = playlist.find(t => t.id === serverTrack.id);
                            if (local) {
                                Object.assign(local, serverTrack);
                            } else {
                                playlist.push(serverTrack);
                            }
                        });
                    }
                }).catch(() => {});

                // Sync user likes from REST API
                spotifyApi.getLikes().then(res => {
                    if (res && res.data && Array.isArray(res.data.likes)) {
                        res.data.likes.forEach(id => likedSongs.add(id));
                        if (typeof updateLikeIcon === "function") updateLikeIcon();
                    }
                }).catch(() => {});

                // Sync user playlists from REST API
                spotifyApi.getPlaylists().then(res => {
                    if (res && res.data && Array.isArray(res.data.playlists) && res.data.playlists.length > 0) {
                        const existingNames = new Set(userPlaylists.map(p => p.name));
                        res.data.playlists.forEach(pl => {
                            if (!existingNames.has(pl.name)) {
                                userPlaylists.push({
                                    id: pl.id,
                                    name: pl.name,
                                    desc: pl.description || "",
                                    songs: pl.tracks || []
                                });
                            }
                        });
                        if (typeof renderSidebarPlaylists === "function") renderSidebarPlaylists();
                        if (profileModule && typeof profileModule.updatePlaylists === "function") profileModule.updatePlaylists(userPlaylists);
                    }
                }).catch(() => {});
            }
        }).catch(() => {});
    }

    // =========================================================================
    // AUDIO ENGINE (Web Audio API)
    // =========================================================================
    let audioCtx = null;
    let masterGain = null;
    let analyserNode = null;
    let synthTimer = null;
    let chordIdx = 0;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioCtx.createGain();
            masterGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.3, audioCtx.currentTime);

            // Audio Spectrum Analyser Node
            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 128;
            analyserNode.smoothingTimeConstant = 0.82;

            masterGain.connect(analyserNode);
            analyserNode.connect(audioCtx.destination);

            if (musicModule && musicModule.setAnalyser) {
                musicModule.setAnalyser(analyserNode);
            }
        }
        if (audioCtx.state === "suspended") audioCtx.resume();
    }

    function playChord(notes, dur = 1.5) {
        if (!audioCtx || !isPlaying) return;
        const now = audioCtx.currentTime;
        notes.forEach((f, i) => {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            const flt = audioCtx.createBiquadFilter();
            osc.type = i === 0 ? "triangle" : "sine";
            osc.frequency.setValueAtTime(f, now);
            flt.type = "lowpass";
            flt.frequency.setValueAtTime(800 + i * 250, now);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(0.1 / notes.length, now + 0.12);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            osc.connect(flt);
            flt.connect(g);
            g.connect(masterGain);
            osc.start(now);
            osc.stop(now + dur + 0.05);
        });
        // Kick
        const kick = audioCtx.createOscillator();
        const kg = audioCtx.createGain();
        kick.frequency.setValueAtTime(120, now);
        kick.frequency.exponentialRampToValueAtTime(35, now + 0.12);
        kg.gain.setValueAtTime(0.06, now);
        kg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        kick.connect(kg);
        kg.connect(masterGain);
        kick.start(now);
        kick.stop(now + 0.15);
    }

    function startSynth() {
        stopSynth();
        initAudio();
        const t = playlist[currentTrackIndex];
        const step = (60 / t.tempo) * 2 * 1000;
        const loop = () => {
            if (!isPlaying) return;
            const chords = t.chords || [[t.rootFreq, t.rootFreq * 1.25, t.rootFreq * 1.5]];
            playChord(chords[chordIdx % chords.length], (step / 1000) * 0.9);
            chordIdx++;
            synthTimer = setTimeout(loop, step);
        };
        loop();
    }

    function stopSynth() {
        if (synthTimer) { clearTimeout(synthTimer); synthTimer = null; }
    }

    // =========================================================================
    // DOM REFS
    // =========================================================================
    const $ = (s) => document.getElementById(s);
    const $$ = (s) => document.querySelectorAll(s);

    const mainContent = $("mainContent");
    const searchBar = $("searchBar");
    const searchInput = $("searchInput");
    const clearSearchBtn = $("clearSearchBtn");
    const navBackBtn = $("navBackBtn");
    const navForwardBtn = $("navForwardBtn");

    const albumArt = $("albumArt");
    const trackTitle = $("trackTitle");
    const trackArtist = $("trackArtist");
    const likeBtn = $("likeBtn");
    const playPauseBtn = $("playPauseBtn");
    const playPauseIcon = $("playPauseIcon");
    const prevBtn = $("prevBtn");
    const nextBtn = $("nextBtn");
    const shuffleBtn = $("shuffleBtn");
    const repeatBtn = $("repeatBtn");
    const currTimeEl = $("currTime");
    const totTimeEl = $("totTime");
    const progressBar = $("progressBar");
    const volumeIcon = $("volumeIcon");
    const volumeBar = $("volumeBar");
    const toastContainer = $("toastContainer");
    const playerAlbumSection = $("playerAlbumSection");

    // =========================================================================
    // UTILITIES
    // =========================================================================
    function fmt(s) {
        s = Math.floor(s || 0);
        return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
    }

    function toast(msg, icon = "fa-circle-check") {
        const t = document.createElement("div");
        t.className = "toast";
        t.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
        toastContainer.appendChild(t);
        setTimeout(() => { if (t.parentNode) t.remove(); }, 2800);
    }

    function updateSliderBg(el, pct) {
        el.style.background = `linear-gradient(to right,#1ed760 0%,#1ed760 ${pct}%,#4d4d4d ${pct}%,#4d4d4d 100%)`;
    }

    // =========================================================================
    // ROUTER - Show/hide pages or navigate between separate files
    // =========================================================================
    function navigate(page, pushHistory = true) {
        if (page && page.startsWith("info:")) {
            const cleanName = page.split(":")[1];
            openFooterPage(cleanName, pushHistory);
            return;
        }

        const targetId = "page" + page.charAt(0).toUpperCase() + page.slice(1);
        const el = $(targetId);

        if (el) {
            $$(".page").forEach(p => p.style.display = "none");
            el.style.display = "block";

            // Clear any active footer links when navigating to core pages
            $$(".footer-link").forEach(l => l.classList.remove("active-footer-link"));

            // Search bar visibility
            if (searchBar) searchBar.style.display = page === "search" ? "flex" : "none";

            // Update sidebar active state
            $$(".nav-option").forEach(n => n.classList.remove("active-nav"));
            if (page === "home" && $("navHome")) $("navHome").classList.add("active-nav");
            else if (page === "search" && $("navSearch")) $("navSearch").classList.add("active-nav");
            else if (page === "library" && $("navLibrary")) $("navLibrary").classList.add("active-nav");

            currentPage = page;
            if (pushHistory) {
                pageHistory.splice(historyIndex + 1);
                pageHistory.push(page);
                historyIndex = pageHistory.length - 1;
            }
            updateNavButtons();
            mainContent.scrollTop = 0;

            if (page === "music" && musicModule && musicModule.resizeVisualizer) {
                setTimeout(() => musicModule.resizeVisualizer(), 40);
            }
        } else {
            // Multi-page navigation fallback to separated screen HTML files
            const pageFileMap = {
                home: "index.html",
                search: "search.html",
                library: "library.html",
                createPlaylist: "create-playlist.html",
                podcasts: "podcasts.html",
                premium: "premium.html",
                profile: "profile.html",
                music: "music.html",
                auth: "auth.html",
                about: "about.html",
                jobs: "jobs.html",
                forTheRecord: "for-the-record.html",
                forArtists: "for-artists.html",
                forCreators: "for-creators.html",
                forAuthors: "for-authors.html",
                developers: "developers.html",
                advertising: "advertising.html",
                investors: "investors.html",
                vendors: "vendors.html",
                support: "support.html",
                freeMobileApp: "free-mobile-app.html",
                popularByCountry: "popular-by-country.html",
                topSongLyrics: "top-song-lyrics.html",
                importYourMusic: "import-your-music.html",
                premiumStandard: "premium-standard.html",
                premiumPlatinum: "premium-platinum.html",
                premiumStudent: "premium-student.html",
                spotifyFree: "spotify-free.html",
                legal: "legal.html",
                "safety-privacy-center": "safety-privacy-center.html",
                safetyPrivacyCenter: "safety-privacy-center.html",
                "privacy-policy": "privacy-policy.html",
                privacyPolicy: "privacy-policy.html",
                cookies: "cookies.html",
                "about-ads": "about-ads.html",
                aboutAds: "about-ads.html",
                accessibility: "accessibility.html"
            };
            if (pageFileMap[page]) {
                window.location.href = pageFileMap[page];
            }
        }
    }

    function updateNavButtons() {
        navBackBtn.disabled = historyIndex <= 0;
        navBackBtn.style.opacity = historyIndex <= 0 ? "0.4" : "1";
        navForwardBtn.disabled = historyIndex >= pageHistory.length - 1;
        navForwardBtn.style.opacity = historyIndex >= pageHistory.length - 1 ? "0.4" : "1";
    }

    navBackBtn.addEventListener("click", () => {
        if (historyIndex > 0) { historyIndex--; navigate(pageHistory[historyIndex], false); }
    });
    navForwardBtn.addEventListener("click", () => {
        if (historyIndex < pageHistory.length - 1) { historyIndex++; navigate(pageHistory[historyIndex], false); }
    });

    // =========================================================================
    // TOP NAV ACTIONS & DROPDOWN MENU
    // =========================================================================
    $("navHome").addEventListener("click", () => navigate("home"));
    $("navSearch").addEventListener("click", () => {
        navigate("search");
        setTimeout(() => searchInput.focus(), 50);
    });
    $("navLibrary").addEventListener("click", () => {
        navigate("library");
        renderLibrary();
    });

    const navPremiumBtn = $("navPremiumBtn");
    if (navPremiumBtn) {
        navPremiumBtn.addEventListener("click", () => navigate("premium"));
    }

    const navInstallBtn = $("navInstallBtn");
    if (navInstallBtn) {
        navInstallBtn.addEventListener("click", () => {
            toast("Downloading Spotify for Desktop...", "fa-circle-down");
        });
    }

    // =========================================================================
    // FOOTER PAGES NAVIGATION (JS & CSS DYNAMIC LOADER + STANDALONE COMPATIBILITY)
    // =========================================================================
    function openFooterPage(filename, pushHistory = true) {
        if (!filename) return;
        const cleanName = filename.split("/").pop().toLowerCase();

        // Persist audio state before page navigation
        try {
            localStorage.setItem("spotify_currentTrack", currentTrackIndex);
            localStorage.setItem("spotify_currentTime", currentTime);
            localStorage.setItem("spotify_volume", volume);
            localStorage.setItem("spotify_isPlaying", isPlaying ? "true" : "false");
        } catch (e) {}

        const pageInfoContainer = $("pageInfo");
        // If in-page container exists (e.g. index.html) and data is loaded, render dynamically without audio interruption
        if (pageInfoContainer && typeof FOOTER_PAGES_DATA !== "undefined") {
            const pageData = FOOTER_PAGES_DATA.find(p => p.filename.toLowerCase() === cleanName);
            if (pageData) {
                pageInfoContainer.innerHTML = `
                    <div class="info-page-container">
                        <div class="info-hero ${pageData.heroClass}">
                            <button class="info-back-link" id="inPageBackBtn" type="button"><i class="fa-solid fa-arrow-left"></i> Back to Home</button>
                            <span class="info-badge">${pageData.badge}</span>
                            <h1 class="info-title">${pageData.heroTitle}</h1>
                            <p class="info-sub">${pageData.heroSub}</p>
                            <div class="info-actions">
                                ${pageData.actions}
                            </div>
                        </div>
                        ${pageData.content}
                    </div>
                `;

                // Wire up back button to return to home
                const inPageBackBtn = $("inPageBackBtn");
                if (inPageBackBtn) {
                    inPageBackBtn.addEventListener("click", () => navigate("home"));
                }

                // Show pageInfo, hide other pages
                $$(".page").forEach(p => p.style.display = "none");
                pageInfoContainer.style.display = "block";
                if (searchBar) searchBar.style.display = "none";
                $$(".nav-option").forEach(n => n.classList.remove("active-nav"));

                // Highlight active link in the footer and sidebar
                $$(".footer-link, .sidebar-legal-link").forEach(l => {
                    const lHref = (l.getAttribute("href") || "").split("/").pop().toLowerCase();
                    l.classList.toggle("active-footer-link", lHref === cleanName);
                });

                currentPage = "info";
                if (pushHistory) {
                    pageHistory.splice(historyIndex + 1);
                    pageHistory.push("info:" + cleanName);
                    historyIndex = pageHistory.length - 1;
                }
                updateNavButtons();
                mainContent.scrollTop = 0;
                return;
            }
        }

        // Standalone navigation fallback: open dedicated HTML file
        window.location.href = cleanName;
    }

    // Expose globally for button clicks
    window.openFooterPage = openFooterPage;

    // Attach click listeners to all footer and sidebar legal links across the document
    $$(".footer-link, .sidebar-legal-link").forEach(link => {
        link.addEventListener("click", (e) => {
            const href = link.getAttribute("href");
            if (href && href !== "#" && !href.startsWith("javascript:")) {
                e.preventDefault();
                openFooterPage(href);
            }
        });
    });

    // =========================================================================
    // SIDEBAR LANGUAGE SELECTOR MODAL
    // =========================================================================
    const sidebarLangBtn = $("sidebarLangBtn");
    const langModalOverlay = $("langModalOverlay");
    const closeLangModalBtn = $("closeLangModalBtn");
    const sidebarLangLabel = $("sidebarLangLabel");

    // Load saved language preference
    try {
        const savedLang = localStorage.getItem("spotify_language");
        if (savedLang && sidebarLangLabel) {
            sidebarLangLabel.textContent = savedLang;
            $$(".lang-item").forEach(item => {
                item.classList.toggle("active-lang", item.dataset.lang === savedLang);
            });
        }
    } catch (e) {}

    if (sidebarLangBtn && langModalOverlay) {
        sidebarLangBtn.addEventListener("click", () => {
            langModalOverlay.style.display = "flex";
        });
    }

    if (closeLangModalBtn && langModalOverlay) {
        closeLangModalBtn.addEventListener("click", () => {
            langModalOverlay.style.display = "none";
        });
    }

    if (langModalOverlay) {
        langModalOverlay.addEventListener("click", (e) => {
            if (e.target === langModalOverlay) {
                langModalOverlay.style.display = "none";
            }
        });
    }

    $$(".lang-item").forEach(item => {
        item.addEventListener("click", () => {
            const selectedLang = item.dataset.lang;
            if (selectedLang) {
                if (sidebarLangLabel) sidebarLangLabel.textContent = selectedLang;
                $$(".lang-item").forEach(btn => btn.classList.remove("active-lang"));
                item.classList.add("active-lang");
                try {
                    localStorage.setItem("spotify_language", selectedLang);
                } catch (e) {}
                if (langModalOverlay) langModalOverlay.style.display = "none";
                toast(`Language updated to ${selectedLang}`, "fa-globe");
            }
        });
    });

    // =========================================================================
    // RIGHT SLIDING SIDEBAR (COLLAPSED RAIL & EXPANDED PANEL - MATCHING SCREENSHOTS)
    // =========================================================================
    const rightSidebar = $("rightSidebar");
    const rightSidebarRail = $("rightSidebarRail");
    const railExpandBtn = $("railExpandBtn");
    const rightSidebarSlideSash = $("rightSidebarSlideSash");
    const closeRightSidebarBtn = $("closeRightSidebarBtn");
    const rightSidebarSearchBtn = $("rightSidebarSearchBtn");
    const rightSidebarEmpty = $("rightSidebarEmpty");
    const rightSidebarContent = $("rightSidebarContent");
    const rightSidebarCover = $("rightSidebarCover");
    const rightSidebarTrackTitle = $("rightSidebarTrackTitle");
    const rightSidebarTrackArtist = $("rightSidebarTrackArtist");
    const rightSidebarArtistImg = $("rightSidebarArtistImg");
    const rightSidebarArtistName = $("rightSidebarArtistName");
    const rightSidebarNextImg = $("rightSidebarNextImg");
    const rightSidebarNextName = $("rightSidebarNextName");
    const rightSidebarNextArtist = $("rightSidebarNextArtist");
    const rightSidebarLikeBtn = $("rightSidebarLikeBtn");
    const rightSidebarFollowBtn = $("rightSidebarFollowBtn");
    const rightSidebarOpenQueueBtn = $("rightSidebarOpenQueueBtn");

    let isRightSidebarOpen = false; // Default to sleek collapsed rail matching screenshot
    try {
        const savedSidebar = localStorage.getItem("spotify_rightSidebarOpen");
        if (savedSidebar !== null) isRightSidebarOpen = savedSidebar === "true";
    } catch (e) {}

    function setRightSidebarState(open) {
        isRightSidebarOpen = open;
        if (rightSidebar) {
            rightSidebar.classList.toggle("collapsed", !open);
            rightSidebar.style.width = ""; // clear inline dragging width
        }
        try {
            localStorage.setItem("spotify_rightSidebarOpen", open ? "true" : "false");
        } catch (e) {}
    }

    // Expand when clicking the collapsed rail or chevron button (Screenshot 2 -> Screenshot 1)
    if (railExpandBtn) {
        railExpandBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            setRightSidebarState(true);
        });
    }
    if (rightSidebarRail) {
        rightSidebarRail.addEventListener("click", () => setRightSidebarState(true));
    }

    // Collapse back to sleek rail (Screenshot 1 -> Screenshot 2)
    if (closeRightSidebarBtn) {
        closeRightSidebarBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            setRightSidebarState(false);
        });
    }

    // Drag-to-Slide interactive gesture mechanics
    let isDraggingSlide = false;

    function startSlideDrag(e) {
        isDraggingSlide = true;
        if (rightSidebar) {
            rightSidebar.classList.remove("collapsed");
            rightSidebar.classList.add("no-transition", "dragging");
        }
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        window.addEventListener("mousemove", onSlideDragMove);
        window.addEventListener("mouseup", endSlideDrag);
        window.addEventListener("touchmove", onSlideDragMove);
        window.addEventListener("touchend", endSlideDrag);
    }

    function onSlideDragMove(e) {
        if (!isDraggingSlide || !rightSidebar) return;
        const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const windowWidth = window.innerWidth;
        const newWidth = Math.max(48, Math.min(520, windowWidth - currentX - 8));
        rightSidebar.style.width = newWidth + "px";
    }

    function endSlideDrag(e) {
        if (!isDraggingSlide) return;
        isDraggingSlide = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        window.removeEventListener("mousemove", onSlideDragMove);
        window.removeEventListener("mouseup", endSlideDrag);
        window.removeEventListener("touchmove", onSlideDragMove);
        window.removeEventListener("touchend", endSlideDrag);

        if (rightSidebar) {
            rightSidebar.classList.remove("no-transition", "dragging");
            const finalWidth = rightSidebar.offsetWidth;
            if (finalWidth >= 140) {
                setRightSidebarState(true);
            } else {
                setRightSidebarState(false);
            }
        }
    }

    // Drag from collapsed rail or from left sash
    if (rightSidebarRail) {
        rightSidebarRail.addEventListener("mousedown", startSlideDrag);
        rightSidebarRail.addEventListener("touchstart", startSlideDrag, { passive: true });
    }

    if (rightSidebarSlideSash) {
        rightSidebarSlideSash.addEventListener("mousedown", startSlideDrag);
        rightSidebarSlideSash.addEventListener("touchstart", startSlideDrag, { passive: true });
    }

    if (rightSidebarSearchBtn) {
        rightSidebarSearchBtn.addEventListener("click", () => {
            navigate("search");
            setTimeout(() => {
                const sInput = $("searchInput");
                if (sInput) sInput.focus();
            }, 60);
        });
    }

    if (rightSidebarOpenQueueBtn) {
        rightSidebarOpenQueueBtn.addEventListener("click", () => {
            navigate("music");
            toast("Now viewing full music & queue", "fa-bars-staggered");
        });
    }

    if (rightSidebarLikeBtn) {
        rightSidebarLikeBtn.addEventListener("click", () => toggleLike());
    }

    if (rightSidebarFollowBtn) {
        rightSidebarFollowBtn.addEventListener("click", () => {
            const isFollowing = rightSidebarFollowBtn.classList.contains("following");
            rightSidebarFollowBtn.classList.toggle("following", !isFollowing);
            rightSidebarFollowBtn.textContent = !isFollowing ? "Following" : "Follow";
            toast(!isFollowing ? "Added artist to your Library" : "Removed artist from Library", "fa-user-check");
        });
    }

    function updateRightSidebar(track, nextTrack) {
        if (!track) {
            if (rightSidebarEmpty) rightSidebarEmpty.style.display = "flex";
            if (rightSidebarContent) rightSidebarContent.style.display = "none";
            return;
        }

        // Show active content if a track is playing
        if (rightSidebarEmpty) rightSidebarEmpty.style.display = "none";
        if (rightSidebarContent) rightSidebarContent.style.display = "flex";

        if (rightSidebarCover) rightSidebarCover.src = track.img || "../assesst/card1img.jpeg";
        if (rightSidebarTrackTitle) rightSidebarTrackTitle.textContent = track.title || "Unknown Track";
        if (rightSidebarTrackArtist) rightSidebarTrackArtist.textContent = track.artist || "Unknown Artist";
        if (rightSidebarArtistImg) rightSidebarArtistImg.src = track.img || "../assesst/card1img.jpeg";
        if (rightSidebarArtistName) rightSidebarArtistName.textContent = track.artist || "Artist";

        if (rightSidebarLikeBtn) {
            const isLiked = likedSongs.has(track.id);
            rightSidebarLikeBtn.className = isLiked ? "fa-solid fa-heart now-playing-like-btn liked" : "fa-regular fa-heart now-playing-like-btn";
        }

        if (nextTrack) {
            if (rightSidebarNextImg) rightSidebarNextImg.src = nextTrack.img || "../assesst/card2img.jpeg";
            if (rightSidebarNextName) rightSidebarNextName.textContent = nextTrack.title || "";
            if (rightSidebarNextArtist) rightSidebarNextArtist.textContent = nextTrack.artist || "";
        }
    }

    setRightSidebarState(isRightSidebarOpen);

    // Top Navigation Auth Buttons (Sign up / Log in)
    const navSignUpBtn = $("navSignUpBtn");
    const navLoginBtn = $("navLoginBtn");
    if (navSignUpBtn) {
        navSignUpBtn.addEventListener("click", () => {
            if (authModule) authModule.switchTab("register");
            navigate("auth");
        });
    }
    if (navLoginBtn) {
        navLoginBtn.addEventListener("click", () => {
            if (authModule) authModule.switchTab("login");
            navigate("auth");
        });
    }

    const userBtn = $("navUserBtn");
    const profileDropdown = $("profileDropdown");

    if (userBtn && profileDropdown) {
        userBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = profileDropdown.style.display === "block";
            profileDropdown.style.display = isOpen ? "none" : "block";
        });

        $("dropdownProfileItem").addEventListener("click", () => {
            profileDropdown.style.display = "none";
            navigate("profile");
        });

        const dropdownAuthItem = $("dropdownAuthItem");
        if (dropdownAuthItem) {
            dropdownAuthItem.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                if (authModule) authModule.switchTab("login");
                navigate("auth");
            });
        }

        $("dropdownPremiumItem").addEventListener("click", () => {
            profileDropdown.style.display = "none";
            navigate("premium");
        });

        $("dropdownSettingsItem").addEventListener("click", () => {
            profileDropdown.style.display = "none";
            navigate("profile");
            const settingsTab = document.querySelector('.profile-nav-tab[data-target="profileTabSettings"]');
            if (settingsTab) settingsTab.click();
        });

        $("dropdownLogoutItem").addEventListener("click", () => {
            profileDropdown.style.display = "none";
            if (authModule) {
                authModule.logout();
            } else {
                toast("Logged out of Spotify session", "fa-arrow-right-from-bracket");
            }
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".profile-nav-wrapper")) {
                profileDropdown.style.display = "none";
            }
        });
    }

    // =========================================================================
    // MUSIC SCREEN & PLAYER ALBUM CLICK
    // =========================================================================
    musicModule = initMusicModule({
        getAnalyser: () => analyserNode
    });

    // Clicking the bottom player album section opens the Music screen
    if (playerAlbumSection) {
        playerAlbumSection.addEventListener("click", (e) => {
            if (e.target.closest("#likeBtn")) return; // Don't trigger if user just clicked like
            navigate("music");
        });
    }

    // Music Screen Back button
    const musicBackBtn = $("musicBackBtn");
    if (musicBackBtn) {
        musicBackBtn.addEventListener("click", () => {
            if (historyIndex > 0) {
                historyIndex--;
                navigate(pageHistory[historyIndex], false);
            } else {
                navigate("home");
            }
        });
    }

    // Music Screen Play button
    const musicPagePlayBtn = $("musicPagePlayBtn");
    if (musicPagePlayBtn) {
        musicPagePlayBtn.addEventListener("click", () => {
            togglePlay();
        });
    }

    // Music Screen Like button
    const musicPageLikeBtn = $("musicPageLikeBtn");
    if (musicPageLikeBtn) {
        musicPageLikeBtn.addEventListener("click", () => {
            likeBtn.click();
            musicModule.updateLikeState(likedSongs.has(playlist[currentTrackIndex].id));
        });
    }

    // Music Screen Share button
    const musicPageShareBtn = $("musicPageShareBtn");
    if (musicPageShareBtn) {
        musicPageShareBtn.addEventListener("click", () => {
            const t = playlist[currentTrackIndex];
            const dummyLink = `https://open.spotify.com/track/${t.id}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(dummyLink).catch(() => {});
            }
            toast(`Link for "${t.title}" copied to clipboard!`, "fa-share-nodes");
        });
    }

    // Music Screen Add to Playlist button
    const musicPageAddToPlaylistBtn = $("musicPageAddToPlaylistBtn");
    if (musicPageAddToPlaylistBtn) {
        musicPageAddToPlaylistBtn.addEventListener("click", () => {
            const t = playlist[currentTrackIndex];
            if (userPlaylists.length === 0) {
                toast("Create a playlist first to add songs!", "fa-circle-plus");
                navigate("createPlaylist");
            } else {
                const targetPl = userPlaylists[userPlaylists.length - 1];
                if (!targetPl.songs.includes(t.id)) {
                    targetPl.songs.push(t.id);
                    renderSidebarPlaylists();
                    if (profileModule) profileModule.updatePlaylists(userPlaylists);
                    toast(`Added "${t.title}" to ${targetPl.name}!`, "fa-circle-check");
                } else {
                    toast(`"${t.title}" is already in ${targetPl.name}`, "fa-info");
                }
            }
        });
    }

    // About Artist Follow button
    const aboutArtistFollowBtn = $("aboutArtistFollowBtn");
    if (aboutArtistFollowBtn) {
        let isFollowingArtist = false;
        aboutArtistFollowBtn.addEventListener("click", () => {
            isFollowingArtist = !isFollowingArtist;
            aboutArtistFollowBtn.textContent = isFollowingArtist ? "Following" : "Follow";
            aboutArtistFollowBtn.className = isFollowingArtist ? "badge follow-artist-btn following-btn" : "badge dark-badge";
            const artistName = $("aboutArtistName").textContent;
            toast(isFollowingArtist ? `Now following ${artistName}` : `Unfollowed ${artistName}`, isFollowingArtist ? "fa-user-plus" : "fa-user-minus");
        });
    }

    // =========================================================================
    // HOME PAGE - Render cards
    // =========================================================================
    function createCardHTML(track) {
        return `
        <div class="card" data-song-id="${track.id}">
            <div class="card-img-wrapper">
                <img src="${track.img}" class="card-img" alt="${track.title}">
                <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
            </div>
            <p class="card-title">${track.title}</p>
            <p class="card-info">${track.artist}</p>
        </div>`;
    }

    function renderHome() {
        const recent = $("recentlyPlayedCards");
        const trending = $("trendingCards");
        const featured = $("featuredCards");
        recent.innerHTML = playlist.slice(0, 3).map(createCardHTML).join("");
        trending.innerHTML = playlist.slice(2, 7).map(createCardHTML).join("");
        featured.innerHTML = playlist.slice(6, 9).concat(playlist.slice(0, 2)).map(createCardHTML).join("");
        bindCardClicks();
    }

    // Clicking ANY song card loads the track, plays it, AND opens the Music page
    function bindCardClicks() {
        $$(".card:not(.playlist-card):not(.podcast-show-card)").forEach(card => {
            card.addEventListener("click", () => {
                const id = parseInt(card.dataset.songId, 10);
                const idx = playlist.findIndex(t => t.id === id);
                if (idx !== -1) {
                    if (idx === currentTrackIndex && isPlaying) {
                        navigate("music");
                    } else {
                        loadTrack(idx, true);
                        navigate("music");
                    }
                }
            });
        });
    }

    // =========================================================================
    // SEARCH PAGE (SPOTIFY EXACT BROWSE ALL UI/UX)
    // =========================================================================
    const getSearchImgPath = (filename) => {
        if (typeof window !== "undefined" && window.location) {
            if (window.location.protocol === "file:" && window.location.pathname.includes("/html/")) {
                return `../assesst/${filename}`;
            }
            if (window.location.protocol.startsWith("http")) {
                return `/assesst/${filename}`;
            }
        }
        return `../assesst/${filename}`;
    };

    const genres = [
        { name: "Pop", color: "#e8115b", img: "search1.jpg" },
        { name: "Hip-Hop", color: "#ba5d07", img: "search2.jpg" },
        { name: "Rock", color: "#e91429", img: "search3.jpg" },
        { name: "Indie", color: "#608108", img: "search4.jpg" },
        { name: "Bollywood", color: "#d84000", img: "search5.jpg" },
        { name: "Chill", color: "#1e3264", img: "search6.jpg" },
        { name: "Dance", color: "#8400e7", img: "search7.jpg" },
        { name: "Devotional", color: "#006450", img: "search8.jpg" },
        { name: "Punjabi", color: "#b02897", img: "search9.jpg" },
        { name: "Workout", color: "#777777", img: "search10.jpg" },
        { name: "Romance", color: "#e1118c", img: "search11.jpg" },
        { name: "Party", color: "#509bf5", img: "search12.jpg" },
    ];

    function renderSearchDefault() {
        const grid = $("browseGrid");
        if (!grid) return;
        grid.innerHTML = genres.map(g =>
            `<div class="genre-card" style="background:${g.color};" data-genre="${g.name}">
                <h3 class="genre-title">${g.name}</h3>
                <img src="${getSearchImgPath(g.img)}" class="genre-img" alt="${g.name}" loading="lazy">
            </div>`
        ).join("");
        $$(".genre-card").forEach(gc => {
            gc.addEventListener("click", () => {
                searchInput.value = gc.dataset.genre;
                doSearch(gc.dataset.genre);
            });
        });
    }

    async function doSearch(query) {
        const q = query.trim().toLowerCase();
        if (!q) {
            $("searchDefault").style.display = "block";
            $("searchResults").style.display = "none";
            $("noResults").style.display = "none";
            clearSearchBtn.style.display = "none";
            return;
        }
        clearSearchBtn.style.display = "block";

        let matches = [];
        // Query REST API /api/search?q=...
        if (typeof spotifyApi !== "undefined") {
            try {
                const res = await spotifyApi.search(q);
                if (res && res.data && res.data.results && Array.isArray(res.data.results.tracks) && res.data.results.tracks.length > 0) {
                    matches = res.data.results.tracks;
                }
            } catch (e) {}
        }

        // Fallback to in-memory filter if REST API returned no items or offline
        if (matches.length === 0) {
            matches = playlist.filter(t =>
                t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || (t.genre && t.genre.toLowerCase().includes(q))
            );
        }

        $("searchDefault").style.display = "none";
        if (matches.length > 0) {
            $("searchResults").style.display = "block";
            $("noResults").style.display = "none";
            $("searchResultCards").innerHTML = matches.map(createCardHTML).join("");
            bindCardClicks();
        } else {
            $("searchResults").style.display = "none";
            $("noResults").style.display = "block";
        }
    }

    searchInput.addEventListener("input", () => doSearch(searchInput.value));
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        doSearch("");
        searchInput.focus();
    });

    // =========================================================================
    // LIBRARY PAGE
    // =========================================================================
    function renderLibrary(filter = "all") {
        // Update filter chips
        $$(".filter-chip").forEach(c => {
            c.classList.toggle("active-chip", c.dataset.filter === filter);
        });

        const likedBanner = $("likedSongsBanner");
        const libPlaylists = $("libraryPlaylists");
        const likedList = $("likedSongsList");

        // Liked songs count
        $("likedSongsCount").textContent = `${likedSongs.size} song${likedSongs.size !== 1 ? "s" : ""}`;

        if (filter === "liked") {
            likedBanner.style.display = "none";
            libPlaylists.style.display = "none";
            likedList.style.display = "flex";
            renderLikedSongsList();
        } else if (filter === "playlists") {
            likedBanner.style.display = "none";
            libPlaylists.style.display = "grid";
            likedList.style.display = "none";
            renderLibraryPlaylists();
        } else {
            likedBanner.style.display = "flex";
            libPlaylists.style.display = "grid";
            likedList.style.display = "none";
            renderLibraryPlaylists();
        }
    }

    function renderLikedSongsList() {
        const list = $("likedSongsList");
        if (likedSongs.size === 0) {
            list.innerHTML = `<p style="color:#a7a7a7;text-align:center;padding:2rem;">No liked songs yet. Click the ♡ icon on any song to add it here.</p>`;
            return;
        }
        list.innerHTML = [...likedSongs].map(id => {
            const t = playlist.find(s => s.id === id);
            if (!t) return "";
            return `<div class="liked-song-row" data-song-id="${t.id}">
                <img src="${t.img}" alt="${t.title}">
                <div class="song-info">
                    <span class="song-name">${t.title}</span>
                    <span class="song-artist">${t.artist}</span>
                </div>
                <span class="song-duration">${fmt(t.duration)}</span>
            </div>`;
        }).join("");
        $$(".liked-song-row").forEach(r => {
            r.addEventListener("click", () => {
                const idx = playlist.findIndex(t => t.id === parseInt(r.dataset.songId, 10));
                if (idx !== -1) {
                    loadTrack(idx, true);
                    navigate("music");
                }
            });
        });
    }

    function renderLibraryPlaylists() {
        const container = $("libraryPlaylists");
        if (userPlaylists.length === 0) {
            container.innerHTML = `<p style="color:#a7a7a7;padding:1rem;">No playlists yet. Create one to get started!</p>`;
            return;
        }
        container.innerHTML = userPlaylists.map(pl => {
            const coverImg = pl.songs.length > 0
                ? playlist.find(t => t.id === pl.songs[0])?.img || "./assesst/card1img.jpeg"
                : "./assesst/card1img.jpeg";
            return `<div class="card playlist-card" data-playlist-id="${pl.id}">
                <div class="card-img-wrapper">
                    <img src="${coverImg}" class="card-img" alt="${pl.name}">
                    <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
                <p class="card-title">${pl.name}</p>
                <p class="card-info">${pl.songs.length} song${pl.songs.length !== 1 ? "s" : ""}</p>
            </div>`;
        }).join("");
        $$(".playlist-card").forEach(card => {
            card.addEventListener("click", () => {
                const plId = parseInt(card.dataset.playlistId, 10);
                openPlaylistDetail(plId);
            });
        });
    }

    // Filter chips
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("filter-chip")) {
            renderLibrary(e.target.dataset.filter);
        }
    });

    // Liked songs banner click
    $("likedSongsBanner").addEventListener("click", () => renderLibrary("liked"));

    // =========================================================================
    // CREATE PLAYLIST PAGE
    // =========================================================================
    $("createPlaylistBtn").addEventListener("click", () => {
        $("playlistNameInput").value = "";
        $("playlistDescInput").value = "";
        $("newPlaylistTitle").textContent = `My Playlist #${playlistIdCounter}`;
        $("playlistSongSearch").value = "";
        $("playlistSongResults").innerHTML = "";
        renderPlaylistSongSearch("");
        navigate("createPlaylist");
    });

    $("addPlaylistIcon").addEventListener("click", () => {
        $("createPlaylistBtn").click();
    });

    // Live preview title
    $("playlistNameInput").addEventListener("input", (e) => {
        $("newPlaylistTitle").textContent = e.target.value || `My Playlist #${playlistIdCounter}`;
    });

    // Song search for adding to playlist
    $("playlistSongSearch").addEventListener("input", (e) => {
        renderPlaylistSongSearch(e.target.value);
    });

    function renderPlaylistSongSearch(query) {
        const q = query.trim().toLowerCase();
        const results = q ? playlist.filter(t =>
            t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
        ) : playlist;

        $("playlistSongResults").innerHTML = results.map(t =>
            `<div class="liked-song-row add-song-row" data-song-id="${t.id}">
                <img src="${t.img}" alt="${t.title}">
                <div class="song-info">
                    <span class="song-name">${t.title}</span>
                    <span class="song-artist">${t.artist}</span>
                </div>
                <button class="badge add-song-btn" data-song-id="${t.id}" style="height:28px;font-size:0.75rem;">Add</button>
            </div>`
        ).join("");
    }

    // Temporary songs list for the playlist being created
    let pendingPlaylistSongs = [];

    document.addEventListener("click", (e) => {
        if (e.target.closest(".add-song-btn")) {
            const id = parseInt(e.target.closest(".add-song-btn").dataset.songId, 10);
            if (!pendingPlaylistSongs.includes(id)) {
                pendingPlaylistSongs.push(id);
                e.target.closest(".add-song-btn").textContent = "Added ✓";
                e.target.closest(".add-song-btn").disabled = true;
                e.target.closest(".add-song-btn").style.opacity = "0.5";
                toast(`Song added to playlist`, "fa-plus");
            }
        }
    });

    // Save playlist
    $("savePlaylistBtn").addEventListener("click", () => {
        const name = $("playlistNameInput").value.trim() || `My Playlist #${playlistIdCounter}`;
        const desc = $("playlistDescInput").value.trim();
        const playlistUuid = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
            ? crypto.randomUUID()
            : `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const pl = {
            id: playlistUuid,
            name,
            desc,
            songs: [...pendingPlaylistSongs]
        };
        userPlaylists.push(pl);
        try { localStorage.setItem("spotify_userPlaylists", JSON.stringify(userPlaylists)); } catch (e) {}
        if (typeof spotifyApi !== "undefined") {
            spotifyApi.createPlaylist(name, desc).catch(() => {});
        }
        pendingPlaylistSongs = [];
        renderSidebarPlaylists();
        if (profileModule) profileModule.updatePlaylists(userPlaylists);
        toast(`Playlist "${name}" created!`, "fa-circle-check");
        navigate("library");
        renderLibrary();
    });

    // =========================================================================
    // BROWSE PODCASTS PAGE
    // =========================================================================
    const podcastCategories = [
        { name: "Comedy", icon: "fa-face-laugh-squint" },
        { name: "True Crime", icon: "fa-user-secret" },
        { name: "News", icon: "fa-newspaper" },
        { name: "Technology", icon: "fa-microchip" },
        { name: "Business", icon: "fa-briefcase" },
        { name: "Health & Fitness", icon: "fa-heart-pulse" },
        { name: "Education", icon: "fa-graduation-cap" },
        { name: "Science", icon: "fa-flask" },
        { name: "Sports", icon: "fa-futbol" },
    ];

    const podcastShows = [
        { title: "The Joe Rogan Experience", host: "Joe Rogan", img: "./assesst/card1img.jpeg" },
        { title: "Crime Junkie", host: "Ashley Flowers", img: "./assesst/card2img.jpeg" },
        { title: "The Daily", host: "The New York Times", img: "./assesst/card3img.jpeg" },
        { title: "Huberman Lab", host: "Andrew Huberman", img: "./assesst/card4img.jpeg" },
        { title: "Lex Fridman Podcast", host: "Lex Fridman", img: "./assesst/card5img.jpeg" },
        { title: "TED Talks Daily", host: "TED", img: "./assesst/card6img.jpeg" },
    ];

    function renderPodcasts() {
        $("podcastCategories").innerHTML = podcastCategories.map(c =>
            `<div class="podcast-category-card">
                <i class="fa-solid ${c.icon}"></i>
                <span>${c.name}</span>
            </div>`
        ).join("");

        $("podcastCards").innerHTML = podcastShows.map(p =>
            `<div class="card podcast-show-card">
                <div class="card-img-wrapper">
                    <img src="${p.img}" class="card-img" alt="${p.title}">
                    <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
                <p class="card-title">${p.title}</p>
                <p class="card-info">${p.host}</p>
            </div>`
        ).join("");

        // Fetch dynamic podcast shows from REST API /api/podcasts
        if (typeof spotifyApi !== "undefined") {
            spotifyApi.getPodcasts().then(res => {
                if (res && res.data && Array.isArray(res.data.podcasts) && res.data.podcasts.length > 0) {
                    $("podcastCards").innerHTML = res.data.podcasts.map(p =>
                        `<div class="card podcast-show-card" data-podcast-id="${p.id}">
                            <div class="card-img-wrapper">
                                <img src="${p.cover || './assesst/card1img.jpeg'}" class="card-img" alt="${p.name}">
                                <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                            </div>
                            <p class="card-title">${p.name}</p>
                            <p class="card-info">${p.host} • ${p.category}</p>
                        </div>`
                    ).join("");
                    $$(".podcast-show-card").forEach(c => {
                        c.addEventListener("click", () => toast(`Playing "${c.querySelector(".card-title").textContent}"`, "fa-podcast"));
                    });
                }
            }).catch(() => {});
        }

        $$(".podcast-show-card").forEach(c => {
            c.addEventListener("click", () => toast(`Playing "${c.querySelector(".card-title").textContent}"`, "fa-podcast"));
        });
        $$(".podcast-category-card").forEach(c => {
            c.addEventListener("click", () => toast(`Browsing ${c.querySelector("span").textContent} podcasts`, "fa-podcast"));
        });
    }

    $("browsePodcastsBtn").addEventListener("click", () => {
        renderPodcasts();
        navigate("podcasts");
    });

    // =========================================================================
    // PLAYLIST DETAIL PAGE
    // =========================================================================
    function openPlaylistDetail(plId) {
        viewingPlaylistId = plId;
        const pl = userPlaylists.find(p => p.id === plId);
        if (!pl) return;

        const coverImg = pl.songs.length > 0
            ? playlist.find(t => t.id === pl.songs[0])?.img || "./assesst/card1img.jpeg"
            : "./assesst/card1img.jpeg";

        $("playlistDetailHeader").innerHTML = `
            <img src="${coverImg}" alt="${pl.name}">
            <div class="detail-info">
                <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#a7a7a7;margin:0 0 0.3rem">Playlist</p>
                <h1>${pl.name}</h1>
                ${pl.desc ? `<p style="margin:0.3rem 0 0.5rem">${pl.desc}</p>` : ""}
                <p style="margin:0;">${pl.songs.length} song${pl.songs.length !== 1 ? "s" : ""} • ${fmt(pl.songs.reduce((sum, id) => sum + (playlist.find(t => t.id === id)?.duration || 0), 0))}</p>
            </div>`;

        $("playlistTrackList").innerHTML = pl.songs.map((songId, i) => {
            const t = playlist.find(s => s.id === songId);
            if (!t) return "";
            return `<div class="track-row" data-song-id="${t.id}">
                <span class="track-number">${i + 1}</span>
                <i class="fa-solid fa-play track-play-icon"></i>
                <img src="${t.img}" alt="${t.title}">
                <div class="track-info">
                    <span class="track-name">${t.title}</span>
                    <span class="track-artist">${t.artist}</span>
                </div>
                <span class="track-duration">${fmt(t.duration)}</span>
            </div>`;
        }).join("");

        $$(".track-row").forEach(r => {
            r.addEventListener("click", () => {
                const idx = playlist.findIndex(t => t.id === parseInt(r.dataset.songId, 10));
                if (idx !== -1) {
                    loadTrack(idx, true);
                    navigate("music");
                }
            });
        });

        // Play All
        $("playAllBtn").onclick = () => {
            if (pl.songs.length > 0) {
                const idx = playlist.findIndex(t => t.id === pl.songs[0]);
                if (idx !== -1) {
                    loadTrack(idx, true);
                    navigate("music");
                }
            }
        };

        // Shuffle Playlist
        $("shufflePlaylistBtn").onclick = () => {
            if (pl.songs.length > 0) {
                const randomId = pl.songs[Math.floor(Math.random() * pl.songs.length)];
                const idx = playlist.findIndex(t => t.id === randomId);
                if (idx !== -1) {
                    isShuffle = true;
                    shuffleBtn.classList.add("active");
                    loadTrack(idx, true);
                    navigate("music");
                }
            }
        };

        navigate("playlistDetail");
    }

    // =========================================================================
    // SIDEBAR PLAYLISTS
    // =========================================================================
    function renderSidebarPlaylists() {
        const container = $("sidebarPlaylists");
        container.innerHTML = userPlaylists.map(pl => {
            const coverImg = pl.songs.length > 0
                ? playlist.find(t => t.id === pl.songs[0])?.img || "./assesst/card1img.jpeg"
                : "./assesst/card1img.jpeg";
            return `<div class="sidebar-playlist-item" data-playlist-id="${pl.id}">
                <img src="${coverImg}" alt="${pl.name}">
                <span>${pl.name}</span>
            </div>`;
        }).join("");
        $$(".sidebar-playlist-item").forEach(item => {
            item.addEventListener("click", () => {
                openPlaylistDetail(parseInt(item.dataset.playlistId, 10));
            });
        });
    }

    // =========================================================================
    // MUSIC PLAYER
    // =========================================================================
    function loadTrack(idx, autoPlay = true) {
        currentTrackIndex = (idx + playlist.length) % playlist.length;
        try { localStorage.setItem("spotify_currentTrack", currentTrackIndex); } catch (e) {}
        const t = playlist[currentTrackIndex];
        albumArt.src = t.img;
        trackTitle.textContent = t.title;
        trackArtist.textContent = t.artist;
        totTimeEl.textContent = fmt(t.duration);
        currentTime = 0;
        currTimeEl.textContent = "0:00";
        progressBar.value = 0;
        updateSliderBg(progressBar, 0);
        chordIdx = 0;
        updateLikeIcon();
        highlightActiveCard();
        updateRightSidebar(t, playlist[(currentTrackIndex + 1) % playlist.length]);

        // Render Music Page with current track details
        musicModule.render(
            t,
            playlist,
            isPlaying,
            likedSongs,
            (newIdx) => {
                loadTrack(newIdx, true);
            },
            () => togglePlay(),
            (sec) => {
                currentTime = sec;
                progressBar.value = (sec / t.duration) * 100;
                currTimeEl.textContent = fmt(sec);
                updateSliderBg(progressBar, progressBar.value);
            },
            toast
        );

        if (autoPlay) playTrack(); else pauseTrack();
    }

    function playTrack() {
        initAudio();
        isPlaying = true;
        playPauseIcon.className = "fa-solid fa-pause";
        playPauseBtn.classList.add("playing");
        musicModule.updatePlayState(true);
        startSynth();
        startProgress();
    }

    function pauseTrack() {
        isPlaying = false;
        playPauseIcon.className = "fa-solid fa-play";
        playPauseBtn.classList.remove("playing");
        musicModule.updatePlayState(false);
        stopSynth();
        stopProgress();
    }

    function togglePlay() {
        isPlaying ? pauseTrack() : playTrack();
    }

    function nextTrack() {
        if (repeatMode === "one") { loadTrack(currentTrackIndex, true); return; }
        if (isShuffle) {
            let n = currentTrackIndex;
            while (n === currentTrackIndex && playlist.length > 1) n = Math.floor(Math.random() * playlist.length);
            loadTrack(n, true);
        } else {
            loadTrack(currentTrackIndex + 1, true);
        }
    }

    function prevTrack() {
        if (currentTime > 3) {
            currentTime = 0;
            currTimeEl.textContent = "0:00";
            progressBar.value = 0;
            updateSliderBg(progressBar, 0);
            return;
        }
        loadTrack(currentTrackIndex - 1, true);
    }

    function startProgress() {
        stopProgress();
        tickerInterval = setInterval(() => {
            const t = playlist[currentTrackIndex];
            currentTime += 0.5;
            if (currentTime >= t.duration) {
                if (repeatMode === "one") currentTime = 0;
                else if (repeatMode === "all" || currentTrackIndex < playlist.length - 1) { nextTrack(); return; }
                else { currentTime = 0; pauseTrack(); return; }
            }
            const pct = (currentTime / t.duration) * 100;
            progressBar.value = pct;
            currTimeEl.textContent = fmt(currentTime);
            updateSliderBg(progressBar, pct);

            // Sync live karaoke lyrics
            musicModule.syncLyricsWithTime(currentTime, t.duration, t.lyrics ? t.lyrics.length : 0);
        }, 500);
    }

    function stopProgress() {
        if (tickerInterval) { clearInterval(tickerInterval); tickerInterval = null; }
    }

    function updateLikeIcon() {
        const t = playlist[currentTrackIndex];
        const isLiked = likedSongs.has(t.id);
        likeBtn.className = isLiked ? "fa-solid fa-heart like-icon liked" : "fa-regular fa-heart like-icon";
        if ($("rightSidebarLikeBtn")) {
            $("rightSidebarLikeBtn").className = isLiked ? "fa-solid fa-heart now-playing-like-btn liked" : "fa-regular fa-heart now-playing-like-btn";
        }
        musicModule.updateLikeState(isLiked);
    }

    function highlightActiveCard() {
        const t = playlist[currentTrackIndex];
        $$(".card").forEach(c => {
            c.classList.toggle("active-card", parseInt(c.dataset.songId, 10) === t.id);
        });
    }

    // Player button listeners
    playPauseBtn.addEventListener("click", togglePlay);
    nextBtn.addEventListener("click", nextTrack);
    prevBtn.addEventListener("click", prevTrack);

    shuffleBtn.addEventListener("click", () => {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle("active", isShuffle);
        toast(isShuffle ? "Shuffle ON" : "Shuffle OFF", "fa-shuffle");
    });

    repeatBtn.addEventListener("click", () => {
        if (repeatMode === "off") { repeatMode = "all"; repeatBtn.classList.add("active"); toast("Repeat all", "fa-repeat"); }
        else if (repeatMode === "all") { repeatMode = "one"; toast("Repeat one", "fa-repeat"); }
        else { repeatMode = "off"; repeatBtn.classList.remove("active"); toast("Repeat off", "fa-repeat"); }
    });

    likeBtn.addEventListener("click", () => {
        const t = playlist[currentTrackIndex];
        if (likedSongs.has(t.id)) {
            likedSongs.delete(t.id);
            toast("Removed from Liked Songs", "fa-heart-crack");
        } else {
            likedSongs.add(t.id);
            toast("Added to Liked Songs", "fa-heart");
        }
        try { localStorage.setItem("spotify_likedSongs", JSON.stringify([...likedSongs])); } catch (e) {}
        updateLikeIcon();
        if (typeof spotifyApi !== "undefined") {
            spotifyApi.toggleLike(t.id).catch(() => {});
        }
    });

    // Progress bar
    progressBar.addEventListener("input", () => {
        const t = playlist[currentTrackIndex];
        const pct = parseFloat(progressBar.value);
        currentTime = (pct / 100) * t.duration;
        currTimeEl.textContent = fmt(currentTime);
        updateSliderBg(progressBar, pct);
    });

    // Volume
    volumeBar.addEventListener("input", () => {
        volume = parseFloat(volumeBar.value) / 100;
        isMuted = volume === 0;
        try { localStorage.setItem("spotify_volume", volume); } catch (e) {}
        if (audioCtx && masterGain) masterGain.gain.setValueAtTime(volume * 0.3, audioCtx.currentTime);
        updateVolumeUI();
    });

    volumeIcon.addEventListener("click", () => {
        if (isMuted) { isMuted = false; volume = prevVolume || 0.75; }
        else { prevVolume = volume; isMuted = true; volume = 0; }
        if (audioCtx && masterGain) masterGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.3, audioCtx.currentTime);
        updateVolumeUI();
    });

    function updateVolumeUI() {
        const v = isMuted ? 0 : Math.round(volume * 100);
        volumeBar.value = v;
        updateSliderBg(volumeBar, v);
        volumeIcon.className = v === 0 ? "fa-solid fa-volume-xmark volume-icon"
            : v < 40 ? "fa-solid fa-volume-low volume-icon"
            : "fa-solid fa-volume-high volume-icon";
    }

    // Sticky nav shadow
    mainContent.addEventListener("scroll", () => {
        document.querySelector(".sticky-nav").classList.toggle("scrolled", mainContent.scrollTop > 10);
    });

    // =========================================================================
    // KEYBOARD SHORTCUTS
    // =========================================================================
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        switch (e.code) {
            case "Space": e.preventDefault(); togglePlay(); break;
            case "ArrowRight":
                e.preventDefault();
                if (e.shiftKey) nextTrack();
                else { currentTime = Math.min(playlist[currentTrackIndex].duration, currentTime + 5); progressBar.value = (currentTime / playlist[currentTrackIndex].duration) * 100; currTimeEl.textContent = fmt(currentTime); updateSliderBg(progressBar, progressBar.value); }
                break;
            case "ArrowLeft":
                e.preventDefault();
                if (e.shiftKey) prevTrack();
                else { currentTime = Math.max(0, currentTime - 5); progressBar.value = (currentTime / playlist[currentTrackIndex].duration) * 100; currTimeEl.textContent = fmt(currentTime); updateSliderBg(progressBar, progressBar.value); }
                break;
            case "ArrowUp": e.preventDefault(); volume = Math.min(1, volume + 0.05); isMuted = false; if (audioCtx && masterGain) masterGain.gain.setValueAtTime(volume * 0.3, audioCtx.currentTime); updateVolumeUI(); break;
            case "ArrowDown": e.preventDefault(); volume = Math.max(0, volume - 0.05); isMuted = volume === 0; if (audioCtx && masterGain) masterGain.gain.setValueAtTime(volume * 0.3, audioCtx.currentTime); updateVolumeUI(); break;
            case "KeyM": volumeIcon.click(); break;
            case "KeyL": likeBtn.click(); break;
            case "Escape": navigate("home"); break;
        }
    });

    // =========================================================================
    // INITIALIZE MODULES & SECTIONS
    // =========================================================================
    renderHome();
    renderSearchDefault();
    updateSliderBg(progressBar, 0);
    updateSliderBg(volumeBar, 75);
    loadTrack(0, false);

    // Initialize Profile Module
    const profileModule = initProfile({
        onOpenPlaylist: (plId) => openPlaylistDetail(plId),
        toast,
        navigate,
        onLogout: () => {
            if (authModule) authModule.logout();
        },
        onOpenAuth: (tab = "login") => {
            if (authModule) authModule.switchTab(tab);
            navigate("auth");
        }
    });
    profileModule.updatePlaylists(userPlaylists);

    // Initialize Authentication Module
    authModule = initAuthModule({
        onLoginSuccess: (user) => {
            const navAuthButtons = $("navAuthButtons");
            const navProfileWrapper = $("navProfileWrapper");
            if (navAuthButtons) navAuthButtons.style.display = "none";
            if (navProfileWrapper) navProfileWrapper.style.display = "flex";
            profileModule.setUser(user);
        },
        onRegisterSuccess: (user) => {
            const navAuthButtons = $("navAuthButtons");
            const navProfileWrapper = $("navProfileWrapper");
            if (navAuthButtons) navAuthButtons.style.display = "none";
            if (navProfileWrapper) navProfileWrapper.style.display = "flex";
            profileModule.setUser(user);
        },
        onLogout: () => {
            const navAuthButtons = $("navAuthButtons");
            const navProfileWrapper = $("navProfileWrapper");
            if (navAuthButtons) navAuthButtons.style.display = "flex";
            if (navProfileWrapper) navProfileWrapper.style.display = "none";
            profileModule.logoutUser();
        },
        toast,
        navigate
    });

    // Initialize Premium Module
    initPremium({
        onSubscribeSuccess: (plan) => {
            const newTier = `Spotify Premium ${plan.name}`;
            profileModule.setTier(newTier);
            if (typeof spotifyApi !== "undefined") {
                spotifyApi.updateSubscription(newTier).catch(() => {});
            }
            if (navPremiumBtn) {
                navPremiumBtn.textContent = "Premium Active";
                navPremiumBtn.style.background = "#1ed760";
                navPremiumBtn.style.color = "#000";
            }
        },
        toast
    });

    // Start on appropriate page based on file name or data-page attribute
    const pageUrlMap = {
        "index.html": "home",
        "search.html": "search",
        "library.html": "library",
        "create-playlist.html": "createPlaylist",
        "podcasts.html": "podcasts",
        "premium.html": "premium",
        "profile.html": "profile",
        "music.html": "music",
        "auth.html": "auth"
    };
    const currentFileName = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    const dataPage = (document.body.dataset.page || "").toLowerCase();

    // Highlight active link if on a standalone footer or sidebar page
    if (currentFileName && currentFileName !== "index.html") {
        $$(".footer-link, .sidebar-legal-link").forEach(l => {
            const lHref = (l.getAttribute("href") || "").split("/").pop().toLowerCase();
            l.classList.toggle("active-footer-link", lHref === currentFileName);
        });
    }

    const initialPage = dataPage || pageUrlMap[currentFileName] || "home";
    const targetElement = $(`page${initialPage.charAt(0).toUpperCase() + initialPage.slice(1)}`);
    if (pageUrlMap[currentFileName] || targetElement) {
        navigate(initialPage, false);
    } else {
        // Standalone footer page (about, jobs, etc.)
        currentPage = initialPage;
        $$(".nav-option").forEach(n => n.classList.remove("active-nav"));
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runApp);
} else {
    runApp();
}


})();