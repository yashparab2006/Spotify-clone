/**
 * Spotify Clone - Music / Now Playing Screen Module
 * Immersive track showcase, synchronized interactive lyrics, artist profile,
 * dynamic album color theming, and real-time Web Audio spectrum visualizer
 */

export const trackDetailsMeta = {
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
export const trackColorPalettes = {
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

export function initMusicModule(options = {}) {
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    let activeAnalyser = options.getAnalyser ? options.getAnalyser() : null;
    let currentPalette = trackColorPalettes[1];
    let isCurrentlyPlaying = typeof options.getIsPlaying === "function" ? options.getIsPlaying() : false;
    let currentTrackMeta = options.getCurrentTrack ? options.getCurrentTrack() : null;
    let audioCurrentTime = 0;

    // Visualizer state
    let visualizerMode = "bars"; // 'bars' | 'wave' | 'radial'
    let animFrameId = null;
    const barCount = 48;
    const currentBarValues = new Float32Array(barCount);
    const peakHoldBars = new Float32Array(barCount);
    const peakHoldTimers = new Float32Array(barCount);
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
            setTimeout(resizeCanvas, 40);
            setTimeout(resizeCanvas, 360);
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
        const parent = canvasWrapper || canvas.parentElement;
        const w = (parent ? parent.clientWidth : 0) || canvas.clientWidth || 800;
        const h = (parent ? parent.clientHeight : 0) || (canvasWrapper && canvasWrapper.classList.contains("expanded") ? 240 : 130);
        if (w <= 0 || h <= 0) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        }
    }

    window.addEventListener("resize", resizeCanvas);
    setTimeout(resizeCanvas, 100);
    setTimeout(resizeCanvas, 400);

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
            let w = canvas.width / dpr;
            let h = canvas.height / dpr;

            if (w <= 0 || h <= 0) {
                resizeCanvas();
                w = canvas.width / dpr;
                h = canvas.height / dpr;
                if (w <= 0 || h <= 0) return;
            }

            ctx.clearRect(0, 0, w, h);

            let hasRealAudio = false;
            if (activeAnalyser && isCurrentlyPlaying) {
                try {
                    activeAnalyser.getByteFrequencyData(freqBuffer);
                    activeAnalyser.getByteTimeDomainData(timeBuffer);
                    for (let i = 0; i < 32; i++) {
                        if (freqBuffer[i] > 10) { hasRealAudio = true; break; }
                    }
                } catch (e) {
                    hasRealAudio = false;
                }
            }

            // Sync playback state & current audio time
            if (typeof options.getIsPlaying === "function") {
                isCurrentlyPlaying = options.getIsPlaying();
            }
            const curTime = (typeof options.getAudioTime === "function" ? options.getAudioTime() : 0) || audioCurrentTime || (idlePhase * 0.4);
            const volume = (typeof options.getAudioVolume === "function" ? options.getAudioVolume() : 1);
            const track = (options.getCurrentTrack ? options.getCurrentTrack() : null) || currentTrackMeta;

            let effectiveBpm = 118;
            if (track) {
                if (track.bpm) {
                    const parsed = parseInt(track.bpm, 10);
                    if (!isNaN(parsed) && parsed > 50 && parsed < 220) effectiveBpm = parsed;
                } else if (track.tempo && !isNaN(track.tempo)) {
                    effectiveBpm = track.tempo;
                }
            }

            // High-fidelity dynamic spectrum synthesis when streaming external CORS-restricted songs
            if (!hasRealAudio && isCurrentlyPlaying && volume > 0) {
                const beatSec = 60 / effectiveBpm;
                const beatProgress = (curTime / beatSec) % 1.0;
                const kickPunch = Math.pow(Math.max(0, 1.0 - beatProgress * 2.2), 2.8);
                const snarePhase = ((curTime / beatSec) + 1.0) % 2.0;
                const snareCrack = Math.pow(Math.max(0, 1.0 - (snarePhase % 1.0) * 2.6), 3.0);
                const hatTick = Math.pow(Math.max(0, Math.sin(curTime * (effectiveBpm / 60) * Math.PI * 2)), 4.0);
                const sixteenth = Math.sin(curTime * (effectiveBpm / 60) * Math.PI * 4);

                for (let i = 0; i < 64; i++) {
                    let binEnergy = 0;
                    const normIdx = i / 64;

                    if (i < 8) {
                        const bassSweep = Math.sin(curTime * 8 + i * 0.3) * 0.15;
                        binEnergy = (kickPunch * 0.85 + bassSweep + 0.18) * (1.0 - normIdx * 0.35);
                    } else if (i < 24) {
                        const midHarmonic = Math.sin(curTime * 14 + i * 0.45) * 0.22;
                        const chordWalk = Math.sin(curTime * 3.5 + i * 0.2) * 0.18;
                        binEnergy = snareCrack * 0.55 + midHarmonic + chordWalk + 0.25;
                    } else if (i < 46) {
                        const hiTransient = hatTick * 0.45 + (sixteenth > 0 ? sixteenth * 0.22 : 0);
                        const shimmer = Math.sin(curTime * 24 + i * 0.7) * 0.16;
                        binEnergy = hiTransient + shimmer + 0.20;
                    } else {
                        const sparkle = (Math.sin(curTime * 32 + i * 1.1) * 0.15 + 0.15);
                        const noise = ((Math.sin(curTime * 100 + i * 13) + 1) * 0.5) * 0.28;
                        binEnergy = (sparkle + noise) * (hatTick * 0.3 + 0.7);
                    }

                    const flutter = (Math.sin(curTime * 50 + i * 7.7) * 0.04);
                    binEnergy = Math.max(0.04, Math.min(1.0, (binEnergy + flutter) * volume));
                    freqBuffer[i] = Math.floor(binEnergy * 255);
                }

                for (let i = 0; i < 128; i++) {
                    const angle = (i / 128) * Math.PI * 4;
                    const waveSample = Math.sin(angle * 2 + curTime * 18) * 0.45 * (kickPunch * 0.4 + 0.6)
                        + Math.sin(angle * 5 + curTime * 35) * 0.25 * hatTick
                        + Math.sin(angle * 1 + curTime * 8) * 0.3;
                    timeBuffer[i] = Math.floor(Math.max(0, Math.min(255, (128 + waveSample * 110 * volume))));
                }
                hasRealAudio = true;
            } else if (!hasRealAudio) {
                // Gentle ambient harmonic breathing wave when paused
                idlePhase += 0.035;
                for (let i = 0; i < 64; i++) {
                    const ambient = (Math.sin(idlePhase + i * 0.18) * 0.08 + Math.cos(idlePhase * 0.7 + i * 0.09) * 0.05 + 0.12);
                    freqBuffer[i] = Math.floor(ambient * 255);
                }
                for (let i = 0; i < 128; i++) {
                    const wSample = Math.sin(idlePhase * 1.2 + (i / 128) * Math.PI * 2) * 0.15;
                    timeBuffer[i] = Math.floor(128 + wSample * 128);
                }
            }

            idlePhase += 0.035;

            if (visualizerMode === "bars") {
                drawBars(w, h, freqBuffer, hasRealAudio);
            } else if (visualizerMode === "wave") {
                drawWave(w, h, timeBuffer, hasRealAudio);
            } else if (visualizerMode === "radial") {
                drawRadial(w, h, freqBuffer, hasRealAudio);
            }
        }

        renderFrame();
    }

    // MODE 1: Frequency Bars
    function drawBars(w, h, freqBuffer, isLive) {
        const count = 48;
        const gap = 3;
        const totalGap = (count - 1) * gap;
        const barWidth = Math.max(3, (w - totalGap) / count);
        const themeColor = currentPalette.primary;
        const rgb = currentPalette.rgb;
        const maxBarH = h - 20;

        for (let i = 0; i < count; i++) {
            const binIdx = Math.min(63, Math.floor(Math.pow(i / count, 1.25) * 58));
            const rawVal = freqBuffer[binIdx] / 255;

            if (rawVal > currentBarValues[i]) {
                currentBarValues[i] = rawVal;
            } else {
                currentBarValues[i] = Math.max(0, currentBarValues[i] - 0.035);
            }

            const val = currentBarValues[i];
            const barH = Math.max(4, val * maxBarH);
            const x = i * (barWidth + gap);
            const y = h - barH - 4;

            if (val >= peakHoldBars[i]) {
                peakHoldBars[i] = val;
                peakHoldTimers[i] = 12;
            } else {
                if (peakHoldTimers[i] > 0) {
                    peakHoldTimers[i]--;
                } else {
                    peakHoldBars[i] = Math.max(0, peakHoldBars[i] - 0.018);
                }
            }

            const grad = ctx.createLinearGradient(0, h, 0, y);
            grad.addColorStop(0, `rgba(${rgb}, 0.15)`);
            grad.addColorStop(0.5, themeColor);
            grad.addColorStop(0.9, "#ffffff");
            grad.addColorStop(1, "#ffffff");

            ctx.fillStyle = grad;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]);
            } else {
                ctx.rect(x, y, barWidth, barH);
            }
            ctx.fill();

            if (peakHoldBars[i] > 0.06) {
                const peakY = Math.max(2, h - (peakHoldBars[i] * maxBarH) - 7);
                ctx.fillStyle = `rgba(${rgb}, 0.95)`;
                ctx.fillRect(x, peakY, barWidth, 2.5);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 1, peakY, Math.max(1, barWidth - 2), 1.5);
            }
        }
    }

    // MODE 2: Oscilloscope Wave
    function drawWave(w, h, timeBuffer, isLive) {
        const themeColor = currentPalette.primary;
        const rgb = currentPalette.rgb;
        const centerY = h / 2;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = themeColor;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 14;

        ctx.beginPath();
        const sliceWidth = w / (timeBuffer.length - 1);

        for (let i = 0; i < timeBuffer.length; i++) {
            const v = timeBuffer[i] / 255.0;
            const y = v * (h - 24) + 12;
            const x = i * sliceWidth;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(${rgb}, 0.4)`;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let i = 0; i < timeBuffer.length; i++) {
            const v = 1.0 - (timeBuffer[i] / 255.0);
            const y = v * (h - 24) + 12;
            const x = i * sliceWidth;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();
    }

    // MODE 3: Radial Pulse
    function drawRadial(w, h, freqBuffer, isLive) {
        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(w, h) * 0.22;
        const spokeCount = 40;
        const themeColor = currentPalette.primary;
        const rgb = currentPalette.rgb;

        ctx.save();

        const bassEnergy = (freqBuffer[0] + freqBuffer[1] + freqBuffer[2] + freqBuffer[3]) / (4 * 255);
        const coreRadius = baseRadius + bassEnergy * 16;

        const radialGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
        radialGrad.addColorStop(0, `rgba(${rgb}, ${0.45 + bassEnergy * 0.3})`);
        radialGrad.addColorStop(0.7, `rgba(${rgb}, ${0.15 + bassEnergy * 0.2})`);
        radialGrad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = radialGrad;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 20;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.45, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        for (let i = 0; i < spokeCount; i++) {
            const angle = (i / spokeCount) * Math.PI * 2 - (Math.PI / 2);
            const binIdx = Math.min(63, Math.floor((i / spokeCount) * 48));
            const val = freqBuffer[binIdx] / 255;
            const spokeLen = 6 + val * (Math.min(w, h) * 0.34);

            const rStart = baseRadius + bassEnergy * 6;
            const rEnd = rStart + spokeLen;

            const x1 = cx + Math.cos(angle) * rStart;
            const y1 = cy + Math.sin(angle) * rStart;
            const x2 = cx + Math.cos(angle) * rEnd;
            const y2 = cy + Math.sin(angle) * rEnd;

            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.strokeStyle = val > 0.65 ? "#ffffff" : themeColor;
            ctx.shadowColor = themeColor;
            ctx.shadowBlur = val > 0.65 ? 12 : 4;

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
        currentTrackMeta = track;
        isCurrentlyPlaying = !!isPlaying;
        setTimeout(resizeCanvas, 40);
        setTimeout(resizeCanvas, 200);
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
        audioCurrentTime = currentTime;
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
        setCurrentTrack(t) { currentTrackMeta = t; },
        setAudioTime(t) { audioCurrentTime = t; },
        setAnalyser(node) {
            activeAnalyser = node;
        },
        resizeVisualizer: resizeCanvas
    };
}
