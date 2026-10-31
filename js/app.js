/**
 * Spotify Clone - Single Page Application Controller
 * Handles routing, search, library, playlists, podcasts, premium, profile, music screen, and audio player
 */
import { playlist } from "./playlist.js";
import { initPremium } from "./premium.js";
import { initProfile } from "./profile.js";
import { initMusicModule } from "./music.js";
import { initAuthModule } from "./auth.js";

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

    // Async sync with Node.js/Express Backend if online
    if (typeof spotifyApi !== "undefined") {
        spotifyApi.checkHealth().then(isOnline => {
            if (isOnline) {
                spotifyApi.getLikes().then(res => {
                    if (res && res.data && Array.isArray(res.data.likes)) {
                        res.data.likes.forEach(id => likedSongs.add(id));
                        if (typeof updateLikeIcon === "function") updateLikeIcon();
                    }
                }).catch(() => {});
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
    // SEARCH PAGE
    // =========================================================================
    const genres = [
        { name: "Pop", color: "#8c67ab" },
        { name: "Hip-Hop", color: "#ba5d07" },
        { name: "Rock", color: "#e61e32" },
        { name: "Indie", color: "#608108" },
        { name: "Bollywood", color: "#d84000" },
        { name: "Chill", color: "#1e3264" },
        { name: "Dance", color: "#e13300" },
        { name: "Devotional", color: "#477d95" },
        { name: "Punjabi", color: "#509bf5" },
        { name: "Workout", color: "#777777" },
        { name: "Romance", color: "#dc148c" },
        { name: "Party", color: "#e8115b" },
    ];

    function renderSearchDefault() {
        const grid = $("browseGrid");
        grid.innerHTML = genres.map(g =>
            `<div class="genre-card" style="background:${g.color}" data-genre="${g.name}">
                ${g.name}
            </div>`
        ).join("");
        $$(".genre-card").forEach(gc => {
            gc.addEventListener("click", () => {
                searchInput.value = gc.dataset.genre;
                doSearch(gc.dataset.genre);
            });
        });
    }

    function doSearch(query) {
        const q = query.trim().toLowerCase();
        if (!q) {
            $("searchDefault").style.display = "block";
            $("searchResults").style.display = "none";
            $("noResults").style.display = "none";
            clearSearchBtn.style.display = "none";
            return;
        }
        clearSearchBtn.style.display = "block";
        const matches = playlist.filter(t =>
            t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
        );
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
        const pl = {
            id: playlistIdCounter++,
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
            profileModule.setTier(`Spotify Premium ${plan.name}`);
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
