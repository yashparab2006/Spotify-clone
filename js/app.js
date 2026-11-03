/**
 * Spotify Clone - Single Page Application Controller
 * Handles routing, search, library, playlists, podcasts, premium, profile, music screen, and audio player
 */
import { playlist } from "./playlist.js";
import { initPremium } from "./premium.js";
import { initProfile } from "./profile.js";
import { initMusicModule } from "./music.js";
import { initAuthModule } from "./auth.js";
import { musicApi } from "./musicApi.js";

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
                            const local = playlist.find(t => String(t.id) === String(serverTrack.id));
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
    // AUDIO ENGINE (HTML5 Audio + Web Audio Spectrum Analyser)
    // =========================================================================
    let audioCtx = null;
    let masterGain = null;
    let analyserNode = null;
    let audioElement = null;
    let audioSourceNode = null;
    let synthTimer = null;
    let chordIdx = 0;
    let isBuffering = false;

    function initAudio() {
        if (!audioCtx) {
            try {
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
            } catch (e) {
                console.warn("AudioContext init warning:", e);
            }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }

        if (!audioElement) {
            audioElement = new Audio();
            audioElement.preload = "auto";
            audioElement.volume = isMuted ? 0 : volume;

            // Audio Element Events
            audioElement.addEventListener("play", () => {
                isPlaying = true;
                isBuffering = false;
                playPauseIcon.className = "fa-solid fa-pause";
                playPauseBtn.classList.add("playing");
                if (musicModule) musicModule.updatePlayState(true);
            });

            audioElement.addEventListener("pause", () => {
                if (!isBuffering) {
                    isPlaying = false;
                    playPauseIcon.className = "fa-solid fa-play";
                    playPauseBtn.classList.remove("playing");
                    if (musicModule) musicModule.updatePlayState(false);
                }
            });

            audioElement.addEventListener("waiting", () => {
                isBuffering = true;
                playPauseIcon.className = "fa-solid fa-circle-notch fa-spin";
            });

            audioElement.addEventListener("playing", () => {
                isBuffering = false;
                isPlaying = true;
                playPauseIcon.className = "fa-solid fa-pause";
                playPauseBtn.classList.add("playing");
                if (musicModule) musicModule.updatePlayState(true);
            });

            audioElement.addEventListener("timeupdate", () => {
                if (!audioElement) return;
                const cur = audioElement.currentTime || 0;
                const dur = (audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration))
                    ? audioElement.duration
                    : (playlist[currentTrackIndex]?.duration || 180);

                currentTime = cur;
                currTimeEl.textContent = fmt(cur);
                const pct = (cur / dur) * 100;
                progressBar.value = isFinite(pct) ? pct : 0;
                updateSliderBg(progressBar, progressBar.value);

                const t = playlist[currentTrackIndex];
                if (musicModule && t) {
                    musicModule.syncLyricsWithTime(cur, dur, t.lyrics ? t.lyrics.length : 0);
                }
            });

            audioElement.addEventListener("durationchange", () => {
                if (audioElement && audioElement.duration && !isNaN(audioElement.duration) && isFinite(audioElement.duration)) {
                    totTimeEl.textContent = fmt(audioElement.duration);
                    if (playlist[currentTrackIndex]) {
                        playlist[currentTrackIndex].duration = Math.round(audioElement.duration);
                    }
                }
            });

            audioElement.addEventListener("ended", () => {
                if (repeatMode === "one") {
                    audioElement.currentTime = 0;
                    audioElement.play().catch(() => {});
                } else if (repeatMode === "all" || isShuffle || currentTrackIndex < playlist.length - 1) {
                    nextTrack();
                } else {
                    pauseTrack();
                    audioElement.currentTime = 0;
                    progressBar.value = 0;
                    currTimeEl.textContent = "0:00";
                    updateSliderBg(progressBar, 0);
                }
            });

            audioElement.addEventListener("error", (e) => {
                console.warn("Audio element stream notice, falling back to local audio synthesis:", e);
                isBuffering = false;
                startSynth();
                startProgress();
            });
        }
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
        if (!el) return;
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
                const target = pageFileMap[page];
                if (window.location.protocol.startsWith("http")) {
                    if (window.location.pathname.startsWith("/html/")) {
                        window.location.href = "/html/" + target;
                    } else {
                        const routeTarget = page === "home" ? "/" : (page === "createPlaylist" ? "/library" : "/" + page);
                        window.location.href = routeTarget;
                    }
                } else {
                    if (window.location.pathname.includes("/html/")) {
                        window.location.href = target;
                    } else {
                        window.location.href = "html/" + target;
                    }
                }
            }
        }
    }

    function updateNavButtons() {
        if (navBackBtn) {
            navBackBtn.disabled = historyIndex <= 0;
            navBackBtn.style.opacity = historyIndex <= 0 ? "0.4" : "1";
        }
        if (navForwardBtn) {
            navForwardBtn.disabled = historyIndex >= pageHistory.length - 1;
            navForwardBtn.style.opacity = historyIndex >= pageHistory.length - 1 ? "0.4" : "1";
        }
    }

    if (navBackBtn) {
        navBackBtn.addEventListener("click", () => {
            if (historyIndex > 0) { historyIndex--; navigate(pageHistory[historyIndex], false); }
        });
    }
    if (navForwardBtn) {
        navForwardBtn.addEventListener("click", () => {
            if (historyIndex < pageHistory.length - 1) { historyIndex++; navigate(pageHistory[historyIndex], false); }
        });
    }

    // =========================================================================
    // TOP NAV ACTIONS & DROPDOWN MENU
    // =========================================================================
    if ($("navHome")) $("navHome").addEventListener("click", () => navigate("home"));
    if ($("navSearch")) $("navSearch").addEventListener("click", () => {
        navigate("search");
        if (searchInput) setTimeout(() => searchInput.focus(), 50);
    });
    if ($("navLibrary")) $("navLibrary").addEventListener("click", () => {
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

    // Global delegated listener for right sidebar toggle actions
    document.addEventListener("click", (e) => {
        if (e.target.closest("#railExpandBtn") || e.target.closest(".rail-expand-btn")) {
            e.stopPropagation();
            setRightSidebarState(true);
        } else if (e.target.closest("#closeRightSidebarBtn") || e.target.closest(".right-sidebar-icon-btn") || e.target.closest("#rightSidebarCollapseBtn")) {
            e.stopPropagation();
            setRightSidebarState(false);
        } else if (e.target.closest("#rightSidebarRail") && !e.target.closest(".right-sidebar-expanded-content")) {
            const sb = $("rightSidebar");
            if (sb && sb.classList.contains("collapsed")) {
                setRightSidebarState(true);
            }
        }
    });

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
        const emptyEl = $("rightSidebarEmpty") || $("rightSidebarEmptyState");
        const contentEl = $("rightSidebarContent") || $("rightSidebarPlayingContent");

        if (!track) {
            if (emptyEl) emptyEl.style.display = "flex";
            if (contentEl) contentEl.style.display = "none";
            return;
        }

        // Show active content if a track is playing
        if (emptyEl) emptyEl.style.display = "none";
        if (contentEl) contentEl.style.display = "flex";

        const defaultCover = "/assesst/card1img.jpeg";
        const defaultNext = "/assesst/card2img.jpeg";
        const coverEl = $("rightSidebarCover") || $("rightSidebarArt");
        const titleEl = $("rightSidebarTrackTitle") || $("rightSidebarTrackName");
        const artistEl = $("rightSidebarTrackArtist");
        const artistImgEl = $("rightSidebarArtistImg");
        const artistNameEl = $("rightSidebarArtistName");
        const likeBtnEl = $("rightSidebarLikeBtn");

        if (coverEl) coverEl.src = track.img || defaultCover;
        if (titleEl) titleEl.textContent = track.title || "Unknown Track";
        if (artistEl) artistEl.textContent = track.artist || "Unknown Artist";
        if (artistImgEl) artistImgEl.src = track.img || defaultCover;
        if (artistNameEl) artistNameEl.textContent = track.artist || "Artist";

        if (likeBtnEl) {
            const isLiked = likedSongs.has(track.id);
            likeBtnEl.className = isLiked ? "fa-solid fa-heart now-playing-like-btn liked" : "fa-regular fa-heart now-playing-like-btn";
        }

        if (nextTrack) {
            const nextImgEl = $("rightSidebarNextImg");
            const nextNameEl = $("rightSidebarNextName");
            const nextArtistEl = $("rightSidebarNextArtist");
            if (nextImgEl) nextImgEl.src = nextTrack.img || defaultNext;
            if (nextNameEl) nextNameEl.textContent = nextTrack.title || "";
            if (nextArtistEl) nextArtistEl.textContent = nextTrack.artist || "";
        }
    }

    setRightSidebarState(isRightSidebarOpen);

    // Top Navigation Auth Buttons (Sign up / Log in)
    const navSignUpBtn = $("navSignUpBtn");
    const navLoginBtn = $("navLoginBtn");
    if (navSignUpBtn) {
        navSignUpBtn.addEventListener("click", (e) => {
            if ($("pageAuth")) {
                e.preventDefault();
                if (authModule) authModule.switchTab("register");
                navigate("auth");
            }
        });
    }
    if (navLoginBtn) {
        navLoginBtn.addEventListener("click", (e) => {
            if ($("pageAuth")) {
                e.preventDefault();
                if (authModule) authModule.switchTab("login");
                navigate("auth");
            }
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

        const dropdownProfile = $("dropdownProfileItem") || $("dropdownProfileBtn");
        if (dropdownProfile) {
            dropdownProfile.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                navigate("profile");
            });
        }

        const dropdownAuthItem = $("dropdownAuthItem");
        if (dropdownAuthItem) {
            dropdownAuthItem.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                if (authModule) authModule.switchTab("login");
                navigate("auth");
            });
        }

        const dropdownPremium = $("dropdownPremiumItem") || $("dropdownUpgradeBtn");
        if (dropdownPremium) {
            dropdownPremium.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                navigate("premium");
            });
        }

        const dropdownSettings = $("dropdownSettingsItem") || $("dropdownSettingsBtn");
        if (dropdownSettings) {
            dropdownSettings.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                navigate("profile");
                const settingsTab = document.querySelector('.profile-nav-tab[data-target="profileTabSettings"]');
                if (settingsTab) settingsTab.click();
            });
        }

        const dropdownLogout = $("dropdownLogoutItem") || $("dropdownLogoutBtn");
        if (dropdownLogout) {
            dropdownLogout.addEventListener("click", () => {
                profileDropdown.style.display = "none";
                if (authModule) {
                    authModule.logout();
                } else {
                    toast("Logged out of Spotify session", "fa-arrow-right-from-bracket");
                }
            });
        }

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
        getAnalyser: () => analyserNode,
        getAudioTime: () => (audioElement ? audioElement.currentTime : currentTime),
        getAudioVolume: () => (isMuted ? 0 : volume),
        getCurrentTrack: () => (playlist && playlist[currentTrackIndex] ? playlist[currentTrackIndex] : null),
        getIsPlaying: () => isPlaying
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
            const artistName = $("aboutArtistName") ? $("aboutArtistName").textContent : "Artist";
            toast(isFollowingArtist ? `Now following ${artistName}` : `Unfollowed ${artistName}`, isFollowingArtist ? "fa-user-plus" : "fa-user-minus");
        });
    }

    // =========================================================================
    // HOME PAGE - Render cards
    // =========================================================================
    function createCardHTML(track) {
        const art = track.img || "./assesst/card1img.jpeg";
        return `
        <div class="card" data-song-id="${track.id}">
            <div class="card-img-wrapper">
                <img src="${art}" class="card-img" alt="${track.title}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
            </div>
            <p class="card-title">${track.title}</p>
            <p class="card-info">${track.artist}</p>
        </div>`;
    }

    let homeFeedData = null;

    function renderHome() {
        const recent = $("recentlyPlayedCards");
        const trending = $("trendingCards");
        const featured = $("featuredCards");
        const bollywood = $("bollywoodCards");
        const bollywoodRomance = $("bollywoodRomanceCards");
        const punjabi = $("punjabiCards");
        const electronic = $("electronicCards");
        const chill = $("chillCards");
        const hipHop = $("hipHopCards");

        const getBolly = () => playlist.filter(t => t.category === 'Bollywood' || (t.genre && t.genre.toLowerCase().includes('bollywood')));
        const getRomance = () => playlist.filter(t => t.searchTag && ['Arijit', 'Atif', 'Darshan', 'Tum Hi Ho', 'Kesariya', 'Shreya'].some(s => t.searchTag.includes(s)));
        const getPunjabi = () => playlist.filter(t => t.category === 'Punjabi' || (t.searchTag && ['Diljit', 'AP Dhillon', 'Sidhu', 'Badshah', 'Punjabi'].some(s => t.searchTag.includes(s))));

        if (homeFeedData) {
            if (recent) recent.innerHTML = (homeFeedData.trending || playlist).slice(0, 5).map(createCardHTML).join("");
            if (trending) trending.innerHTML = (homeFeedData.trending || playlist).slice(5, 12).map(createCardHTML).join("");
            if (featured) featured.innerHTML = (homeFeedData.pop || playlist).slice(0, 6).map(createCardHTML).join("");
            if (bollywood) bollywood.innerHTML = (homeFeedData.bollywood && homeFeedData.bollywood.length > 0 ? homeFeedData.bollywood : getBolly()).slice(0, 8).map(createCardHTML).join("");
            if (bollywoodRomance) bollywoodRomance.innerHTML = (homeFeedData.romance && homeFeedData.romance.length > 0 ? homeFeedData.romance : getRomance()).slice(0, 8).map(createCardHTML).join("");
            if (punjabi) punjabi.innerHTML = (homeFeedData.punjabi && homeFeedData.punjabi.length > 0 ? homeFeedData.punjabi : getPunjabi()).slice(0, 8).map(createCardHTML).join("");
            if (electronic) electronic.innerHTML = (homeFeedData.electronic || playlist.filter(t => t.category === 'Electronic')).slice(0, 6).map(createCardHTML).join("");
            if (chill) chill.innerHTML = (homeFeedData.chill || playlist.filter(t => t.category === 'Ambient')).slice(0, 6).map(createCardHTML).join("");
            if (hipHop) hipHop.innerHTML = (homeFeedData.hiphop || playlist.filter(t => t.category === 'Hip-Hop')).slice(0, 6).map(createCardHTML).join("");
        } else {
            if (recent) recent.innerHTML = playlist.slice(0, 5).map(createCardHTML).join("");
            if (trending) trending.innerHTML = playlist.slice(5, 12).map(createCardHTML).join("");
            if (featured) featured.innerHTML = playlist.slice(12, 18).map(createCardHTML).join("");
            if (bollywood) bollywood.innerHTML = getBolly().slice(0, 8).map(createCardHTML).join("");
            if (bollywoodRomance) bollywoodRomance.innerHTML = getRomance().slice(0, 8).map(createCardHTML).join("");
            if (punjabi) punjabi.innerHTML = getPunjabi().slice(0, 8).map(createCardHTML).join("");
            if (electronic) electronic.innerHTML = playlist.filter(t => t.category === 'Electronic' || (t.genre && t.genre.includes('Electronic'))).slice(0, 6).map(createCardHTML).join("");
            if (chill) chill.innerHTML = playlist.filter(t => t.category === 'Ambient' || (t.genre && t.genre.includes('Lo-Fi'))).slice(0, 6).map(createCardHTML).join("");
            if (hipHop) hipHop.innerHTML = playlist.filter(t => t.category === 'Hip-Hop' || (t.genre && t.genre.includes('Trap'))).slice(0, 6).map(createCardHTML).join("");
        }
        bindCardClicks();
    }

    // Clicking ANY song card loads the track, plays it, AND opens the Music page
    function bindCardClicks() {
        $$(".card:not(.playlist-card):not(.podcast-show-card)").forEach(card => {
            card.style.cursor = "pointer";
        });
    }

    // Global delegated click handler for song cards (works on both static SSR & dynamic DOM)
    document.addEventListener("click", (e) => {
        const card = e.target.closest(".card:not(.playlist-card):not(.podcast-show-card)");
        if (!card) return;
        const songId = card.dataset.songId;
        let idx = -1;
        if (songId) {
            idx = playlist.findIndex(t => String(t.id) === String(songId));
        }
        if (idx === -1) {
            const titleEl = card.querySelector(".card-title");
            if (titleEl) {
                const titleText = titleEl.textContent.trim().toLowerCase();
                idx = playlist.findIndex(t => t.title && t.title.trim().toLowerCase() === titleText);
            }
        }
        if (idx !== -1) {
            loadTrack(idx, true);
            navigate("music");
        }
    });

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
        const q = (query || "").trim();
        if (!q) {
            if ($("searchDefault")) $("searchDefault").style.display = "block";
            if ($("searchResults")) $("searchResults").style.display = "none";
            if ($("noResults")) $("noResults").style.display = "none";
            if (clearSearchBtn) clearSearchBtn.style.display = "none";
            return;
        }
        if (clearSearchBtn) clearSearchBtn.style.display = "block";

        // Show loading indicator
        if ($("searchDefault")) $("searchDefault").style.display = "none";
        if ($("searchResults")) $("searchResults").style.display = "block";
        if ($("noResults")) $("noResults").style.display = "none";
        if ($("searchResultCards")) {
            $("searchResultCards").innerHTML = `
                <div style="grid-column: 1 / -1; display:flex; align-items:center; justify-content:center; padding: 3rem; color: #1ed760; font-size: 1.1rem; gap: 0.8rem;">
                    <i class="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Searching Audius music catalog for "${q}"...</span>
                </div>
            `;
        }

        let matches = [];
        try {
            matches = await musicApi.search(q, 16);
        } catch (e) {
            console.warn("Audius search error:", e);
        }

        // Query REST API /api/search?q=... as secondary fallback
        if ((!matches || matches.length === 0) && typeof spotifyApi !== "undefined") {
            try {
                const res = await spotifyApi.search(q);
                if (res && res.data && res.data.results && Array.isArray(res.data.results.tracks) && res.data.results.tracks.length > 0) {
                    matches = res.data.results.tracks;
                }
            } catch (e) {}
        }

        // Add any found tracks into playlist queue
        if (matches && matches.length > 0) {
            matches.forEach(t => {
                if (!playlist.some(p => String(p.id) === String(t.id))) {
                    playlist.push(t);
                }
            });
            if ($("searchResults")) $("searchResults").style.display = "block";
            if ($("noResults")) $("noResults").style.display = "none";
            if ($("searchResultCards")) $("searchResultCards").innerHTML = matches.map(createCardHTML).join("");
            bindCardClicks();
        } else {
            // Fallback to local playlist filter if offline
            const lower = q.toLowerCase();
            const localMatches = playlist.filter(t =>
                (t.title && t.title.toLowerCase().includes(lower)) ||
                (t.artist && t.artist.toLowerCase().includes(lower)) ||
                (t.genre && t.genre.toLowerCase().includes(lower)) ||
                (t.category && t.category.toLowerCase().includes(lower)) ||
                (t.searchTag && t.searchTag.toLowerCase().includes(lower))
            );
            if (localMatches.length > 0) {
                if ($("searchResults")) $("searchResults").style.display = "block";
                if ($("noResults")) $("noResults").style.display = "none";
                if ($("searchResultCards")) $("searchResultCards").innerHTML = localMatches.map(createCardHTML).join("");
                bindCardClicks();
            } else {
                if ($("searchResults")) $("searchResults").style.display = "none";
                if ($("noResults")) $("noResults").style.display = "block";
            }
        }
    }

    // Global delegated listener for Browse All genre cards and back button
    document.addEventListener("click", (e) => {
        const gc = e.target.closest(".genre-card");
        if (gc && gc.dataset && gc.dataset.genre) {
            const genre = gc.dataset.genre;
            if (searchInput) searchInput.value = genre;
            doSearch(genre);
        }
        if (e.target.closest("#backToBrowseBtn")) {
            if (searchInput) searchInput.value = "";
            doSearch("");
        }
    });

    if (searchInput) searchInput.addEventListener("input", () => doSearch(searchInput.value));
    if (clearSearchBtn) clearSearchBtn.addEventListener("click", () => {
        if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
        }
        doSearch("");
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
        if ($("likedSongsCount")) $("likedSongsCount").textContent = `${likedSongs.size} song${likedSongs.size !== 1 ? "s" : ""}`;

        if (filter === "liked") {
            if (likedBanner) likedBanner.style.display = "none";
            if (libPlaylists) libPlaylists.style.display = "none";
            if (likedList) likedList.style.display = "flex";
            renderLikedSongsList();
        } else if (filter === "playlists") {
            if (likedBanner) likedBanner.style.display = "none";
            if (libPlaylists) libPlaylists.style.display = "grid";
            if (likedList) likedList.style.display = "none";
            renderLibraryPlaylists();
        } else {
            if (likedBanner) likedBanner.style.display = "flex";
            if (libPlaylists) libPlaylists.style.display = "grid";
            if (likedList) likedList.style.display = "none";
            renderLibraryPlaylists();
        }
    }

    function renderLikedSongsList() {
        const list = $("likedSongsList");
        if (!list) return;
        if (likedSongs.size === 0) {
            list.innerHTML = `<p style="color:#a7a7a7;text-align:center;padding:2rem;">No liked songs yet. Click the ♡ icon on any song to add it here.</p>`;
            return;
        }
        list.innerHTML = [...likedSongs].map(id => {
            const t = playlist.find(s => String(s.id) === String(id));
            if (!t) return "";
            return `<div class="liked-song-row" data-song-id="${t.id}">
                <img src="${t.img}" alt="${t.title}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                <div class="song-info">
                    <span class="song-name">${t.title}</span>
                    <span class="song-artist">${t.artist}</span>
                </div>
                <span class="song-duration">${fmt(t.duration)}</span>
            </div>`;
        }).join("");
        $$(".liked-song-row").forEach(r => {
            r.addEventListener("click", () => {
                const idx = playlist.findIndex(t => String(t.id) === String(r.dataset.songId));
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
                ? playlist.find(t => String(t.id) === String(pl.songs[0]))?.img || "./assesst/card1img.jpeg"
                : "./assesst/card1img.jpeg";
            return `<div class="card playlist-card" data-playlist-id="${pl.id}">
                <div class="card-img-wrapper">
                    <img src="${coverImg}" class="card-img" alt="${pl.name}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                    <button class="card-play-btn" title="Play"><i class="fa-solid fa-play"></i></button>
                </div>
                <p class="card-title">${pl.name}</p>
                <p class="card-info">${pl.songs.length} song${pl.songs.length !== 1 ? "s" : ""}</p>
            </div>`;
        }).join("");
        $$(".playlist-card").forEach(card => {
            card.addEventListener("click", () => {
                const plId = card.dataset.playlistId;
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
    if ($("likedSongsBanner")) {
        $("likedSongsBanner").addEventListener("click", () => renderLibrary("liked"));
    }

    // =========================================================================
    // CREATE PLAYLIST PAGE
    // =========================================================================
    if ($("createPlaylistBtn")) {
        $("createPlaylistBtn").addEventListener("click", () => {
            if ($("playlistNameInput")) $("playlistNameInput").value = "";
            if ($("playlistDescInput")) $("playlistDescInput").value = "";
            if ($("newPlaylistTitle")) $("newPlaylistTitle").textContent = `My Playlist #${playlistIdCounter}`;
            if ($("playlistSongSearch")) $("playlistSongSearch").value = "";
            if ($("playlistSongResults")) $("playlistSongResults").innerHTML = "";
            renderPlaylistSongSearch("");
            navigate("createPlaylist");
        });
    }

    if ($("addPlaylistIcon")) {
        $("addPlaylistIcon").addEventListener("click", () => {
            if ($("createPlaylistBtn")) $("createPlaylistBtn").click();
        });
    }

    // Live preview title
    if ($("playlistNameInput")) {
        $("playlistNameInput").addEventListener("input", (e) => {
            if ($("newPlaylistTitle")) $("newPlaylistTitle").textContent = e.target.value || `My Playlist #${playlistIdCounter}`;
        });
    }

    // Song search for adding to playlist
    if ($("playlistSongSearch")) {
        $("playlistSongSearch").addEventListener("input", (e) => {
            renderPlaylistSongSearch(e.target.value);
        });
    }

    function renderPlaylistSongSearch(query) {
        const q = query.trim().toLowerCase();
        const results = q ? playlist.filter(t =>
            t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
        ) : playlist;

        if ($("playlistSongResults")) {
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
    if ($("savePlaylistBtn")) {
        $("savePlaylistBtn").addEventListener("click", () => {
            const name = ($("playlistNameInput") ? $("playlistNameInput").value.trim() : "") || `My Playlist #${playlistIdCounter}`;
            const desc = $("playlistDescInput") ? $("playlistDescInput").value.trim() : "";
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
    }

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
        if ($("podcastCategories")) {
            $("podcastCategories").innerHTML = podcastCategories.map(c =>
                `<div class="podcast-category-card">
                    <i class="fa-solid ${c.icon}"></i>
                    <span>${c.name}</span>
                </div>`
            ).join("");
        }

        if ($("podcastCards")) {
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
        }

        // Fetch dynamic podcast shows from REST API /api/podcasts
        if (typeof spotifyApi !== "undefined") {
            spotifyApi.getPodcasts().then(res => {
                if (res && res.data && Array.isArray(res.data.podcasts) && res.data.podcasts.length > 0 && $("podcastCards")) {
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

    if ($("browsePodcastsBtn")) {
        $("browsePodcastsBtn").addEventListener("click", () => {
            renderPodcasts();
            navigate("podcasts");
        });
    }

    // =========================================================================
    // PLAYLIST DETAIL PAGE
    // =========================================================================
    function openPlaylistDetail(plId) {
        viewingPlaylistId = plId;
        const pl = userPlaylists.find(p => String(p.id) === String(plId));
        if (!pl) return;

        const coverImg = pl.songs.length > 0
            ? playlist.find(t => String(t.id) === String(pl.songs[0]))?.img || "./assesst/card1img.jpeg"
            : "./assesst/card1img.jpeg";

        if ($("playlistDetailHeader")) {
            $("playlistDetailHeader").innerHTML = `
                <img src="${coverImg}" alt="${pl.name}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                <div class="detail-info">
                    <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#a7a7a7;margin:0 0 0.3rem">Playlist</p>
                    <h1>${pl.name}</h1>
                    ${pl.desc ? `<p style="margin:0.3rem 0 0.5rem">${pl.desc}</p>` : ""}
                    <p style="margin:0;">${pl.songs.length} song${pl.songs.length !== 1 ? "s" : ""} • ${fmt(pl.songs.reduce((sum, id) => sum + (playlist.find(t => String(t.id) === String(id))?.duration || 0), 0))}</p>
                </div>`;
        }

        if ($("playlistTrackList")) {
            $("playlistTrackList").innerHTML = pl.songs.map((songId, i) => {
                const t = playlist.find(s => String(s.id) === String(songId));
                if (!t) return "";
                return `<div class="track-row" data-song-id="${t.id}">
                    <span class="track-number">${i + 1}</span>
                    <i class="fa-solid fa-play track-play-icon"></i>
                    <img src="${t.img}" alt="${t.title}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                    <div class="track-info">
                        <span class="track-name">${t.title}</span>
                        <span class="track-artist">${t.artist}</span>
                    </div>
                    <span class="track-duration">${fmt(t.duration)}</span>
                </div>`;
            }).join("");
        }

        $$(".track-row").forEach(r => {
            r.addEventListener("click", () => {
                const idx = playlist.findIndex(t => String(t.id) === String(r.dataset.songId));
                if (idx !== -1) {
                    loadTrack(idx, true);
                    navigate("music");
                }
            });
        });

        // Play All
        if ($("playAllBtn")) {
            $("playAllBtn").onclick = () => {
                if (pl.songs.length > 0) {
                    const idx = playlist.findIndex(t => String(t.id) === String(pl.songs[0]));
                    if (idx !== -1) {
                        loadTrack(idx, true);
                        navigate("music");
                    }
                }
            };
        }

        // Shuffle Playlist
        if ($("shufflePlaylistBtn")) {
            $("shufflePlaylistBtn").onclick = () => {
                if (pl.songs.length > 0) {
                    const randomId = pl.songs[Math.floor(Math.random() * pl.songs.length)];
                    const idx = playlist.findIndex(t => String(t.id) === String(randomId));
                    if (idx !== -1) {
                        isShuffle = true;
                        if (shuffleBtn) shuffleBtn.classList.add("active");
                        loadTrack(idx, true);
                        navigate("music");
                    }
                }
            };
        }

        navigate("playlistDetail");
    }

    // =========================================================================
    // SIDEBAR PLAYLISTS
    // =========================================================================
    function renderSidebarPlaylists() {
        const container = $("sidebarPlaylists");
        container.innerHTML = userPlaylists.map(pl => {
            const coverImg = pl.songs.length > 0
                ? playlist.find(t => String(t.id) === String(pl.songs[0]))?.img || "./assesst/card1img.jpeg"
                : "./assesst/card1img.jpeg";
            return `<div class="sidebar-playlist-item" data-playlist-id="${pl.id}">
                <img src="${coverImg}" alt="${pl.name}" onerror="this.onerror=null;this.src='./assesst/card1img.jpeg';">
                <span>${pl.name}</span>
            </div>`;
        }).join("");
        $$(".sidebar-playlist-item").forEach(item => {
            item.addEventListener("click", () => {
                openPlaylistDetail(item.dataset.playlistId);
            });
        });
    }

    // =========================================================================
    // MUSIC PLAYER
    // =========================================================================
    function loadTrack(idx, autoPlay = true) {
        if (!playlist || playlist.length === 0) return;
        currentTrackIndex = (idx + playlist.length) % playlist.length;
        try { localStorage.setItem("spotify_currentTrack", currentTrackIndex); } catch (e) {}
        const t = playlist[currentTrackIndex];
        albumArt.src = t.img || "./assesst/card1img.jpeg";
        albumArt.onerror = () => { albumArt.src = "./assesst/card1img.jpeg"; };
        trackTitle.textContent = t.title || "Untitled Track";
        trackArtist.textContent = t.artist || "Unknown Artist";
        totTimeEl.textContent = fmt(t.duration || 180);
        currentTime = 0;
        currTimeEl.textContent = "0:00";
        progressBar.value = 0;
        updateSliderBg(progressBar, 0);
        chordIdx = 0;
        updateLikeIcon();
        highlightActiveCard();
        updateRightSidebar(t, playlist[(currentTrackIndex + 1) % playlist.length]);

        initAudio();

        if (audioElement && t && t.streamUrl) {
            stopSynth();
            stopProgress();
            if (audioElement.src !== t.streamUrl) {
                audioElement.src = t.streamUrl;
            }
        }

        // Render Music Page with current track details
        if (musicModule) {
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
                    if (audioElement && audioElement.duration && isFinite(audioElement.duration)) {
                        audioElement.currentTime = sec;
                    }
                    const dur = (audioElement && audioElement.duration && isFinite(audioElement.duration)) ? audioElement.duration : (t.duration || 180);
                    progressBar.value = (sec / dur) * 100;
                    currTimeEl.textContent = fmt(sec);
                    updateSliderBg(progressBar, progressBar.value);
                },
                toast
            );
        }

        if (autoPlay) playTrack(); else pauseTrack();
    }

    function playTrack() {
        initAudio();
        const t = playlist[currentTrackIndex];
        isPlaying = true;
        playPauseIcon.className = "fa-solid fa-pause";
        playPauseBtn.classList.add("playing");
        if (musicModule) musicModule.updatePlayState(true);

        if (audioElement && t && t.streamUrl) {
            if (audioElement.src !== t.streamUrl) {
                audioElement.src = t.streamUrl;
            }
            audioElement.volume = isMuted ? 0 : volume;
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    stopSynth();
                    stopProgress();
                }).catch(err => {
                    console.warn("Audio element play warning:", err);
                    startSynth();
                    startProgress();
                });
            }
        } else {
            startSynth();
            startProgress();
        }
    }

    function pauseTrack() {
        isPlaying = false;
        playPauseIcon.className = "fa-solid fa-play";
        playPauseBtn.classList.remove("playing");
        if (musicModule) musicModule.updatePlayState(false);
        if (audioElement) {
            audioElement.pause();
        }
        stopSynth();
        stopProgress();
    }

    function togglePlay() {
        isPlaying ? pauseTrack() : playTrack();
    }

    function nextTrack() {
        if (repeatMode === "one") {
            if (audioElement) {
                audioElement.currentTime = 0;
                audioElement.play().catch(() => {});
            } else {
                loadTrack(currentTrackIndex, true);
            }
            return;
        }
        if (isShuffle) {
            let n = currentTrackIndex;
            if (playlist.length > 1) {
                while (n === currentTrackIndex) n = Math.floor(Math.random() * playlist.length);
            }
            loadTrack(n, true);
        } else {
            if (currentTrackIndex >= playlist.length - 1 && repeatMode !== "all") {
                pauseTrack();
                if (audioElement) audioElement.currentTime = 0;
                return;
            }
            loadTrack(currentTrackIndex + 1, true);
        }
    }

    function prevTrack() {
        const cur = audioElement ? (audioElement.currentTime || currentTime) : currentTime;
        if (cur > 3) {
            if (audioElement) {
                audioElement.currentTime = 0;
            }
            currentTime = 0;
            currTimeEl.textContent = "0:00";
            progressBar.value = 0;
            updateSliderBg(progressBar, 0);
            toast("Restarted song", "fa-rotate-left");
            return;
        }
        loadTrack(currentTrackIndex - 1, true);
    }

    function startProgress() {
        stopProgress();
        tickerInterval = setInterval(() => {
            const t = playlist[currentTrackIndex];
            if (!t) return;
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
            if (musicModule) {
                musicModule.syncLyricsWithTime(currentTime, t.duration, t.lyrics ? t.lyrics.length : 0);
            }
        }, 500);
    }

    function stopProgress() {
        if (tickerInterval) { clearInterval(tickerInterval); tickerInterval = null; }
    }

    function updateLikeIcon() {
        const t = playlist[currentTrackIndex];
        if (!t) return;
        const isLiked = likedSongs.has(t.id);
        if (likeBtn) likeBtn.className = isLiked ? "fa-solid fa-heart like-icon liked" : "fa-regular fa-heart like-icon";
        if ($("rightSidebarLikeBtn")) {
            $("rightSidebarLikeBtn").className = isLiked ? "fa-solid fa-heart now-playing-like-btn liked" : "fa-regular fa-heart now-playing-like-btn";
        }
        if (musicModule) musicModule.updateLikeState(isLiked);
    }

    function highlightActiveCard() {
        const t = playlist[currentTrackIndex];
        if (!t) return;
        $$(".card").forEach(c => {
            c.classList.toggle("active-card", String(c.dataset.songId) === String(t.id));
        });
    }

    // Player button listeners
    if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlay);
    if (nextBtn) nextBtn.addEventListener("click", nextTrack);
    if (prevBtn) prevBtn.addEventListener("click", prevTrack);

    if (shuffleBtn) {
        shuffleBtn.addEventListener("click", () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle("active", isShuffle);
            toast(isShuffle ? "Shuffle ON" : "Shuffle OFF", "fa-shuffle");
        });
    }

    if (repeatBtn) {
        repeatBtn.addEventListener("click", () => {
            if (repeatMode === "off") { repeatMode = "all"; repeatBtn.classList.add("active"); toast("Repeat all", "fa-repeat"); }
            else if (repeatMode === "all") { repeatMode = "one"; toast("Repeat one", "fa-repeat"); }
            else { repeatMode = "off"; repeatBtn.classList.remove("active"); toast("Repeat off", "fa-repeat"); }
        });
    }

    if (likeBtn) {
        likeBtn.addEventListener("click", () => {
            const t = playlist[currentTrackIndex];
            if (!t) return;
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
    }

    // Progress bar
    if (progressBar) {
        progressBar.addEventListener("input", () => {
            const t = playlist[currentTrackIndex];
            if (!t) return;
            const pct = parseFloat(progressBar.value);
            const dur = (audioElement && audioElement.duration && isFinite(audioElement.duration))
                ? audioElement.duration
                : t.duration;
            currentTime = (pct / 100) * dur;
            if (audioElement && isFinite(currentTime)) {
                audioElement.currentTime = currentTime;
            }
            if (currTimeEl) currTimeEl.textContent = fmt(currentTime);
            updateSliderBg(progressBar, pct);
        });
    }

    // Volume
    if (volumeBar) {
        volumeBar.addEventListener("input", () => {
            volume = parseFloat(volumeBar.value) / 100;
            isMuted = volume === 0;
            try { localStorage.setItem("spotify_volume", volume); } catch (e) {}
            if (audioElement) audioElement.volume = isMuted ? 0 : volume;
            if (audioCtx && masterGain) masterGain.gain.setValueAtTime(volume * 0.3, audioCtx.currentTime);
            updateVolumeUI();
        });
    }

    if (volumeIcon) {
        volumeIcon.addEventListener("click", () => {
            if (isMuted) { isMuted = false; volume = prevVolume || 0.75; }
            else { prevVolume = volume; isMuted = true; volume = 0; }
            if (audioElement) audioElement.volume = isMuted ? 0 : volume;
            if (audioCtx && masterGain) masterGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.3, audioCtx.currentTime);
            updateVolumeUI();
        });
    }

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

    // Fetch and load rich multi-genre Audius songs feed into Home page
    musicApi.getFeed().then(feed => {
        if (feed) {
            homeFeedData = feed;
            const allFeedTracks = [
                ...(feed.trending || []),
                ...(feed.pop || []),
                ...(feed.electronic || []),
                ...(feed.hiphop || []),
                ...(feed.chill || []),
                ...(feed.bollywood || []),
                ...(feed.romance || []),
                ...(feed.punjabi || [])
            ];
            allFeedTracks.forEach(tt => {
                const exIdx = playlist.findIndex(p => String(p.id) === String(tt.id));
                if (exIdx !== -1) {
                    Object.assign(playlist[exIdx], tt);
                } else {
                    playlist.push(tt);
                }
            });
            renderHome();
            if (currentTrackIndex === 0 && !isPlaying && playlist.length > 0) {
                loadTrack(0, false);
            }
        }
    }).catch(err => {
        console.warn("Audius feed fetch notice:", err);
    });

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
        "auth.html": "auth",
        "search": "search",
        "library": "library",
        "podcasts": "podcasts",
        "premium": "premium",
        "profile": "profile",
        "music": "music",
        "auth": "auth",
        "login": "auth",
        "signup": "auth",
        "register": "auth"
    };
    const currentPathClean = window.location.pathname.replace(/^\/|\/$/g, "").toLowerCase();
    const currentFileName = (currentPathClean.split("/").pop() || "index.html").toLowerCase();
    const dataPage = (document.body && document.body.dataset && document.body.dataset.page ? document.body.dataset.page : "").toLowerCase();

    // Highlight active link if on a standalone footer or sidebar page
    if (currentFileName && currentFileName !== "index.html" && currentFileName !== "") {
        $$(".footer-link, .sidebar-legal-link").forEach(l => {
            const lHref = (l.getAttribute("href") || "").split("/").pop().toLowerCase();
            l.classList.toggle("active-footer-link", lHref === currentFileName);
        });
    }

    const initialPage = dataPage || pageUrlMap[currentFileName] || pageUrlMap[currentPathClean] || "home";
    const targetElement = $(`page${initialPage.charAt(0).toUpperCase() + initialPage.slice(1)}`);
    if (targetElement) {
        navigate(initialPage, false);
    } else {
        // Standalone footer page (about, jobs, etc.)
        currentPage = initialPage;
        $$(".nav-option").forEach(n => n.classList.remove("active-nav"));
        if (initialPage === "home" && $("navHome")) $("navHome").classList.add("active-nav");
        else if (initialPage === "search" && $("navSearch")) $("navSearch").classList.add("active-nav");
        else if (initialPage === "library" && $("navLibrary")) $("navLibrary").classList.add("active-nav");
    }

    // Auto-switch auth tab if ?tab=register or ?tab=login is in the query params
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam && authModule) {
        authModule.switchTab(tabParam);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runApp);
} else {
    runApp();
}
