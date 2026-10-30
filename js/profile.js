/**
 * Spotify Clone - Profile Section Module
 * Profile header, public playlists, followed artists, settings & inline edit modal
 */

export const userProfileState = {
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

export function initProfile({ onOpenPlaylist, toast, navigate, onLogout, onOpenAuth }) {
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

