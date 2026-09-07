/**
 * MAYA Web — Cinematic Video Player View (/watch/:id)
 * Features:
 * - Pure black cinema canvas (#000000)
 * - Custom translucent dark HUD with MAYA gold accents (#F59E0B -> #D97706)
 * - Centered 16:9 cinematic container (eliminating the 100vw x 100vh void)
 * - Timeline displaying --:-- / --:-- until metadata loads
 * - Play/Pause, Seek (-10s / +10s), Timeline Scrubber with buffer and thumb
 * - Volume / Mute, Quality switcher, Speed selector, Fit toggle, Fullscreen, PiP
 * - Double-tap seek ripples (-10s / +10s) for mobile
 * - Keyboard shortcuts (Space, Arrows, M, F)
 * - Playback position resume memory
 * - Movie metadata panel & 'MORE LIKE THIS' shelf below player
 * - Compliant authorized source handling & error states
 */

import { CatalogueService } from '../services/catalogue.js';
import { PlaybackService } from '../services/playback.js';
import { HistoryService } from '../services/storage.js';

export const PlayerView = {
  containerId: 'player-view',
  videoEl: null,
  movie: null,
  sources: [],
  currentSourceIndex: 0,
  progressSaveTimer: null,
  hudTimeout: null,
  lastTapTime: 0,
  lastTapZone: null,

  async render({ params = {}, router }) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const movieId = params.id;

    // Reset previous instance
    this._cleanup();

    container.innerHTML = `
      <div class="player-loading-stage">
        <div class="player-loading-brand">
          <img src="/assets/maya/maya_eye.svg" alt="MAYA" width="70" height="42" class="player-eye-pulse">
        </div>
        <p class="player-loading-sub">PREPARING CINEMA STREAM...</p>
      </div>
    `;

    try {
      this.movie = await CatalogueService.getMovieById(movieId);

      if (!this.movie) {
        this._renderError(container, 'MOVIE NOT FOUND', 'This title is not present in the MAYA catalogue.', router);
        return;
      }

      router.updateTitle(`Playing: ${this.movie.title}`);

      // Query authorized playback sources
      this.sources = await PlaybackService.getPlaybackSources(this.movie);

      if (this.sources.length === 0) {
        this._renderError(
          container,
          'UNABLE TO PLAY',
          'No authorized streaming source is currently available for this title in MAYA Web. Check back soon or access via the MAYA Android application.',
          router,
          movieId
        );
        return;
      }

      // Fetch related titles for 'MORE LIKE THIS' shelf
      const relatedMovies = await CatalogueService.getRelatedMovies(this.movie, 10);

      // Active source and progress
      const activeSource = this.sources[0];
      const previousProgress = HistoryService.getProgress(movieId);

      container.innerHTML = `
        <div class="watch-page-container">
          <!-- Top Navigation & Title Bar -->
          <div class="watch-top-bar">
            <a href="/movie/${movieId}" class="watch-nav-back" aria-label="Return to movie details">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>DETAILS</span>
            </a>

            <div class="watch-header-title">
              <span class="watch-movie-name">${this.movie.title}</span>
              ${this.movie.release_year ? `<span class="watch-movie-year">(${this.movie.release_year})</span>` : ''}
            </div>

            <div class="watch-brand-badge">
              <img src="/assets/maya/maya_eye.svg" alt="MAYA" width="22" height="13">
              <span>MAYA CINEMA</span>
            </div>
          </div>

          <!-- Centered 16:9 Cinema Shell -->
          <div class="cinema-player-shell">
            <div class="cinema-aspect-ratio-box" id="player-wrapper">
              
              <!-- Video Element -->
              <video 
                id="maya-video-element" 
                class="maya-video-element" 
                playsinline 
                preload="metadata"
                src="${activeSource.playbackUrl}">
              </video>

              <!-- Center Buffering Spinner -->
              <div class="player-center-spinner" id="player-spinner" hidden>
                <div class="spinner-eye">
                  <img src="/assets/maya/maya_eye.svg" alt="Loading" width="48" height="28" class="pulse-fast">
                </div>
              </div>

              <!-- Center Big Play / Pause Overlay -->
              <button class="player-center-play-btn" id="center-play-trigger" aria-label="Play or pause video">
                <svg class="icon-center-play" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>

              <!-- Mobile Double-Tap Seek Zones & Ripples -->
              <div class="double-tap-zone zone-left" id="zone-seek-back" aria-hidden="true"></div>
              <div class="double-tap-zone zone-right" id="zone-seek-fwd" aria-hidden="true"></div>
              <div class="seek-ripple-indicator left-ripple" id="ripple-back">-10s</div>
              <div class="seek-ripple-indicator right-ripple" id="ripple-fwd">+10s</div>

              <!-- Playback Resume Prompt (if history exists) -->
              ${previousProgress && previousProgress.currentTime > 15 ? `
                <div class="player-resume-banner" id="resume-banner">
                  <div class="resume-text-group">
                    <span class="resume-label">CONTINUE WATCHING</span>
                    <span class="resume-time">Resume from ${this._formatTime(previousProgress.currentTime)}?</span>
                  </div>
                  <div class="resume-btn-group">
                    <button class="btn-resume-action btn-resume-confirm" id="btn-resume-yes">RESUME</button>
                    <button class="btn-resume-action btn-resume-cancel" id="btn-resume-no">START OVER</button>
                  </div>
                </div>
              ` : ''}

              <!-- Custom MAYA HUD -->
              <div class="maya-custom-hud" id="player-hud">
                
                <!-- Scrubber / Timeline Bar -->
                <div class="maya-timeline-container" id="timeline-container">
                  <div class="maya-timeline-track">
                    <div class="maya-timeline-buffered" id="timeline-buffered"></div>
                    <div class="maya-timeline-progress" id="timeline-progress"></div>
                    <div class="maya-timeline-thumb" id="timeline-thumb"></div>
                  </div>
                  <input type="range" class="maya-timeline-input" id="timeline-range" min="0" max="100" step="0.1" value="0" aria-label="Seek timeline">
                </div>

                <!-- Controls Bar -->
                <div class="maya-controls-bar">
                  
                  <div class="maya-controls-left">
                    <!-- Play/Pause Button -->
                    <button class="hud-btn hud-btn-play" id="ctrl-play-pause" aria-label="Play/Pause (Space)">
                      <svg class="icon-play" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      <svg class="icon-pause" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    </button>

                    <!-- -10s Seek -->
                    <button class="hud-btn hud-seek-btn" id="ctrl-seek-back" aria-label="Rewind 10 seconds (Left Arrow)">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                      </svg>
                      <span class="hud-btn-tag">-10</span>
                    </button>

                    <!-- +10s Seek -->
                    <button class="hud-btn hud-seek-btn" id="ctrl-seek-forward" aria-label="Fast forward 10 seconds (Right Arrow)">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                      <span class="hud-btn-tag">+10</span>
                    </button>

                    <!-- Volume & Mute -->
                    <div class="hud-volume-group">
                      <button class="hud-btn" id="ctrl-mute" aria-label="Mute/Unmute (M)">
                        <svg class="icon-vol-high" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                        <svg class="icon-vol-mute" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" hidden>
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                      </button>
                      <input type="range" class="hud-volume-slider" id="ctrl-volume-slider" min="0" max="1" step="0.05" value="1" aria-label="Volume slider">
                    </div>

                    <!-- Timestamp Display (initially --:-- until loadedmetadata) -->
                    <div class="hud-time-display">
                      <span id="time-current">--:--</span>
                      <span class="time-sep">/</span>
                      <span id="time-duration">--:--</span>
                    </div>
                  </div>

                  <div class="maya-controls-right">
                    
                    <!-- Quality Selection Menu -->
                    <div class="hud-dropdown-wrap">
                      <button class="hud-btn hud-pill-btn" id="quality-btn" aria-label="Select stream quality">
                        <span id="quality-label">${activeSource.quality}</span>
                      </button>
                      <div class="hud-menu-popover" id="quality-menu" hidden>
                        ${this.sources.map((src, i) => `
                          <button class="hud-menu-item ${i === 0 ? 'is-active' : ''}" data-source-index="${i}">
                            ${src.quality} (${src.format.toUpperCase()})
                          </button>
                        `).join('')}
                      </div>
                    </div>

                    <!-- Speed Selection Menu -->
                    <div class="hud-dropdown-wrap">
                      <button class="hud-btn hud-pill-btn" id="speed-btn" aria-label="Playback speed">
                        <span id="speed-label">1.0x</span>
                      </button>
                      <div class="hud-menu-popover" id="speed-menu" hidden>
                        <button class="hud-menu-item" data-speed="0.5">0.5x</button>
                        <button class="hud-menu-item" data-speed="0.75">0.75x</button>
                        <button class="hud-menu-item is-active" data-speed="1.0">1.0x Normal</button>
                        <button class="hud-menu-item" data-speed="1.25">1.25x</button>
                        <button class="hud-menu-item" data-speed="1.5">1.5x</button>
                        <button class="hud-menu-item" data-speed="2.0">2.0x</button>
                      </div>
                    </div>

                    <!-- Aspect Fit Toggle -->
                    <button class="hud-btn" id="ctrl-fit" aria-label="Toggle aspect ratio fit">
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                    </button>

                    <!-- Picture in Picture -->
                    <button class="hud-btn" id="ctrl-pip" aria-label="Picture in Picture">
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                        <rect x="12" y="10" width="8" height="8" rx="1"></rect>
                      </svg>
                    </button>

                    <!-- Fullscreen -->
                    <button class="hud-btn" id="ctrl-fullscreen" aria-label="Toggle Fullscreen (F)">
                      <svg class="icon-fs-enter" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                      </svg>
                      <svg class="icon-fs-exit" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" hidden>
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                      </svg>
                    </button>

                  </div>

                </div>

              </div>

            </div>
          </div>

          <!-- Movie Info Panel (Under Player) -->
          <div class="watch-info-panel">
            <div class="watch-info-header">
              <div class="watch-info-titles">
                <h1 class="watch-info-title">${this.movie.title}</h1>
                <div class="watch-info-meta">
                  ${this.movie.release_year ? `<span class="watch-meta-pill">${this.movie.release_year}</span>` : ''}
                  ${this.movie.rating ? `<span class="watch-meta-pill rating-gold">&#9733; ${Number(this.movie.rating).toFixed(1)}</span>` : ''}
                  ${this.movie.duration_min ? `<span class="watch-meta-pill">${this.movie.duration_min} min</span>` : ''}
                  <span class="watch-meta-pill stream-badge">${activeSource.quality} &bull; ${activeSource.format.toUpperCase()}</span>
                </div>
              </div>
              <div class="watch-info-actions">
                <a href="/movie/${movieId}" class="btn-watch-action">&larr; Full Details</a>
                <a href="#download-apk" class="btn-watch-action-gold">&#8681; Get Android App</a>
              </div>
            </div>

            ${this.movie.synopsis ? `<p class="watch-synopsis">${this.movie.synopsis}</p>` : ''}

            <div class="watch-genres-row">
              ${(this.movie.genres || []).map(g => `<span class="genre-tag">${g}</span>`).join('')}
            </div>
          </div>

          <!-- Related Movies Shelf (MORE LIKE THIS) -->
          ${relatedMovies && relatedMovies.length > 0 ? `
            <div class="watch-related-section">
              <div class="watch-shelf-header">
                <h3 class="related-shelf-title">MORE LIKE THIS</h3>
                <span class="related-shelf-count">${relatedMovies.length} TITLES</span>
              </div>
              <div class="related-shelf-scroll">
                ${relatedMovies.map(rel => `
                  <a href="/movie/${rel.id}" class="related-card">
                    <div class="related-poster-frame">
                      <img src="${rel.poster_url || '/assets/maya/placeholder_poster.jpg'}" alt="${rel.title}" loading="lazy">
                      ${rel.rating ? `<span class="related-rating">&#9733; ${Number(rel.rating).toFixed(1)}</span>` : ''}
                    </div>
                    <span class="related-title">${rel.title}</span>
                    <span class="related-year">${rel.release_year || ''}</span>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      `;

      this._initPlayerLogic(container, movieId, previousProgress);

    } catch (e) {
      console.error('Error in PlayerView:', e);
      this._renderError(container, 'PLAYBACK INITIALIZATION FAILED', e.message || 'Error configuring player.', router);
    }
  },

  _renderError(container, title, message, router, movieId = null) {
    container.innerHTML = `
      <div class="player-error-backdrop">
        <div class="player-error-dialog">
          <div class="error-emblem-wrap">
            <img src="/assets/maya/maya_eye.svg" alt="MAYA" width="60" height="36" class="error-eye-dim">
          </div>
          <h2 class="player-error-title">${title}</h2>
          <p class="player-error-msg">${message}</p>
          <div class="player-error-actions">
            ${movieId ? `
              <a href="/movie/${movieId}" class="btn-error-primary">&larr; RETURN TO MOVIE DETAILS</a>
            ` : ''}
            <a href="/browse" class="btn-error-secondary">BROWSE CATALOGUE</a>
          </div>
        </div>
      </div>
    `;
  },

  _initPlayerLogic(container, movieId, previousProgress) {
    const video = container.querySelector('#maya-video-element');
    const wrapper = container.querySelector('#player-wrapper');
    const hud = container.querySelector('#player-hud');
    const playPauseBtn = container.querySelector('#ctrl-play-pause');
    const centerPlayBtn = container.querySelector('#center-play-trigger');
    const iconPlay = container.querySelector('.icon-play');
    const iconPause = container.querySelector('.icon-pause');
    const seekBackBtn = container.querySelector('#ctrl-seek-back');
    const seekFwdBtn = container.querySelector('#ctrl-seek-forward');
    const muteBtn = container.querySelector('#ctrl-mute');
    const iconVolHigh = container.querySelector('.icon-vol-high');
    const iconVolMute = container.querySelector('.icon-vol-mute');
    const volumeSlider = container.querySelector('#ctrl-volume-slider');
    const timeCurrent = container.querySelector('#time-current');
    const timeDuration = container.querySelector('#time-duration');
    const timelineRange = container.querySelector('#timeline-range');
    const timelineProgress = container.querySelector('#timeline-progress');
    const timelineThumb = container.querySelector('#timeline-thumb');
    const timelineBuffered = container.querySelector('#timeline-buffered');
    const fsBtn = container.querySelector('#ctrl-fullscreen');
    const pipBtn = container.querySelector('#ctrl-pip');
    const fitBtn = container.querySelector('#ctrl-fit');
    const spinner = container.querySelector('#player-spinner');
    const qualityBtn = container.querySelector('#quality-btn');
    const qualityMenu = container.querySelector('#quality-menu');
    const speedBtn = container.querySelector('#speed-btn');
    const speedMenu = container.querySelector('#speed-menu');
    const resumeBanner = container.querySelector('#resume-banner');

    this.videoEl = video;

    // 1. Play / Pause Logic
    const togglePlay = () => {
      if (video.paused || video.ended) {
        video.play().catch(e => console.warn('Play interrupted:', e));
      } else {
        video.pause();
      }
    };

    const updatePlayUI = (isPlaying) => {
      if (iconPlay && iconPause) {
        iconPlay.hidden = isPlaying;
        iconPause.hidden = !isPlaying;
      }
      if (centerPlayBtn) {
        centerPlayBtn.classList.toggle('is-hidden', isPlaying);
      }
    };

    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
      resetHudTimer();
    });

    centerPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
      resetHudTimer();
    });

    video.addEventListener('click', () => {
      // Toggle HUD visibility on tap / click
      if (wrapper.classList.contains('hud-hidden')) {
        wrapper.classList.remove('hud-hidden');
        resetHudTimer();
      } else {
        togglePlay();
        resetHudTimer();
      }
    });

    video.addEventListener('play', () => updatePlayUI(true));
    video.addEventListener('pause', () => updatePlayUI(false));

    // 2. Timeline & Duration Formatting
    video.addEventListener('loadedmetadata', () => {
      if (video.duration && !isNaN(video.duration)) {
        timeDuration.textContent = this._formatTime(video.duration);
      }
    });

    video.addEventListener('timeupdate', () => {
      if (!video.duration || isNaN(video.duration)) return;
      const current = video.currentTime;
      const total = video.duration;
      const pct = (current / total) * 100;

      timeCurrent.textContent = this._formatTime(current);
      if (timeDuration.textContent === '--:--') {
        timeDuration.textContent = this._formatTime(total);
      }

      timelineProgress.style.width = `${pct}%`;
      timelineThumb.style.left = `${pct}%`;
      timelineRange.value = pct;

      // Update buffer bar
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferPct = (bufferedEnd / total) * 100;
        timelineBuffered.style.width = `${bufferPct}%`;
      }
    });

    // Scrubber Scrubbing / Dragging
    timelineRange.addEventListener('input', () => {
      if (!video.duration) return;
      const seekPct = parseFloat(timelineRange.value);
      const targetTime = (seekPct / 100) * video.duration;
      video.currentTime = targetTime;
      timeCurrent.textContent = this._formatTime(targetTime);
      timelineProgress.style.width = `${seekPct}%`;
      timelineThumb.style.left = `${seekPct}%`;
    });

    // 3. -10s / +10s Seek Buttons
    seekBackBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.currentTime = Math.max(0, video.currentTime - 10);
      resetHudTimer();
    });

    seekFwdBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      resetHudTimer();
    });

    // 4. Double-Tap Seek Zones (Mobile & Desktop gesture)
    const zoneLeft = container.querySelector('#zone-seek-back');
    const zoneRight = container.querySelector('#zone-seek-fwd');
    const rippleLeft = container.querySelector('#ripple-back');
    const rippleRight = container.querySelector('#ripple-fwd');

    const handleZoneTap = (side) => {
      const now = Date.now();
      if (this.lastTapZone === side && (now - this.lastTapTime) < 320) {
        // Double tap confirmed
        if (side === 'left') {
          video.currentTime = Math.max(0, video.currentTime - 10);
          rippleLeft.classList.add('active');
          setTimeout(() => rippleLeft.classList.remove('active'), 650);
        } else {
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          rippleRight.classList.add('active');
          setTimeout(() => rippleRight.classList.remove('active'), 650);
        }
        this.lastTapZone = null;
        this.lastTapTime = 0;
      } else {
        this.lastTapZone = side;
        this.lastTapTime = now;
      }
    };

    if (zoneLeft && zoneRight) {
      zoneLeft.addEventListener('click', () => handleZoneTap('left'));
      zoneRight.addEventListener('click', () => handleZoneTap('right'));
      zoneLeft.addEventListener('touchend', () => handleZoneTap('left'), { passive: true });
      zoneRight.addEventListener('touchend', () => handleZoneTap('right'), { passive: true });
    }

    // 5. Volume & Mute
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      iconVolHigh.hidden = video.muted;
      iconVolMute.hidden = !video.muted;
      volumeSlider.value = video.muted ? 0 : (video.volume || 1);
    });

    volumeSlider.addEventListener('input', () => {
      const val = parseFloat(volumeSlider.value);
      video.volume = val;
      video.muted = val === 0;
      iconVolHigh.hidden = video.muted;
      iconVolMute.hidden = !video.muted;
    });

    // 6. Fullscreen
    fsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!document.fullscreenElement) {
        wrapper.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      wrapper.classList.toggle('is-fullscreen', isFs);
      const iconEnter = fsBtn.querySelector('.icon-fs-enter');
      const iconExit = fsBtn.querySelector('.icon-fs-exit');
      if (iconEnter && iconExit) {
        iconEnter.hidden = isFs;
        iconExit.hidden = !isFs;
      }
    });

    // 7. Picture-in-Picture
    if (document.pictureInPictureEnabled) {
      pipBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await video.requestPictureInPicture();
          }
        } catch (err) {
          console.warn('PiP error:', err);
        }
      });
    } else {
      pipBtn.style.display = 'none';
    }

    // 8. Aspect Fit Toggle
    let isCover = false;
    fitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isCover = !isCover;
      video.style.objectFit = isCover ? 'cover' : 'contain';
      fitBtn.classList.toggle('is-active', isCover);
    });

    // 9. Quality Selection Menu
    if (qualityBtn && qualityMenu) {
      qualityBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        qualityMenu.hidden = !qualityMenu.hidden;
        if (speedMenu) speedMenu.hidden = true;
      });

      const items = qualityMenu.querySelectorAll('.hud-menu-item');
      items.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(item.getAttribute('data-source-index'), 10);
          if (this.sources[idx]) {
            const currentTime = video.currentTime;
            const wasPlaying = !video.paused;
            this.currentSourceIndex = idx;
            video.src = this.sources[idx].playbackUrl;
            video.currentTime = currentTime;
            if (wasPlaying) video.play();

            const labelEl = container.querySelector('#quality-label');
            if (labelEl) labelEl.textContent = this.sources[idx].quality;

            items.forEach(it => it.classList.remove('is-active'));
            item.classList.add('is-active');
            qualityMenu.hidden = true;
          }
        });
      });
    }

    // 10. Speed Selection Menu
    if (speedBtn && speedMenu) {
      speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedMenu.hidden = !speedMenu.hidden;
        if (qualityMenu) qualityMenu.hidden = true;
      });

      const speedItems = speedMenu.querySelectorAll('.hud-menu-item');
      speedItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const spd = parseFloat(item.getAttribute('data-speed'));
          video.playbackRate = spd;
          const label = container.querySelector('#speed-label');
          if (label) label.textContent = `${spd}x`;

          speedItems.forEach(it => it.classList.remove('is-active'));
          item.classList.add('is-active');
          speedMenu.hidden = true;
        });
      });
    }

    // Close menus on click outside
    document.addEventListener('click', () => {
      if (qualityMenu) qualityMenu.hidden = true;
      if (speedMenu) speedMenu.hidden = true;
    });

    // 11. Buffering & Loading states
    video.addEventListener('waiting', () => {
      if (spinner) spinner.hidden = false;
    });
    video.addEventListener('canplay', () => {
      if (spinner) spinner.hidden = true;
    });

    // 12. Auto-hide HUD on inactivity
    const resetHudTimer = () => {
      wrapper.classList.remove('hud-hidden');
      clearTimeout(this.hudTimeout);
      if (!video.paused) {
        this.hudTimeout = setTimeout(() => {
          if (!video.paused) wrapper.classList.add('hud-hidden');
        }, 3200);
      }
    };

    wrapper.addEventListener('mousemove', resetHudTimer);
    wrapper.addEventListener('touchstart', resetHudTimer, { passive: true });

    // 13. Resume Banner Actions
    if (resumeBanner) {
      const btnYes = resumeBanner.querySelector('#btn-resume-yes');
      const btnNo = resumeBanner.querySelector('#btn-resume-no');

      if (btnYes) {
        btnYes.addEventListener('click', (e) => {
          e.stopPropagation();
          video.currentTime = previousProgress.currentTime;
          resumeBanner.style.display = 'none';
          video.play();
        });
      }

      if (btnNo) {
        btnNo.addEventListener('click', (e) => {
          e.stopPropagation();
          video.currentTime = 0;
          resumeBanner.style.display = 'none';
          video.play();
        });
      }
    }

    // 14. Progress Saving Loop
    this.progressSaveTimer = setInterval(() => {
      if (video && !video.paused && video.duration > 0) {
        HistoryService.saveProgress(movieId, video.currentTime, video.duration, this.movie);
      }
    }, 4000);

    // 15. Keyboard Shortcuts
    this._handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          resetHudTimer();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          resetHudTimer();
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          resetHudTimer();
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          volumeSlider.value = video.volume;
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          volumeSlider.value = video.volume;
          break;
        case 'KeyM':
          muteBtn.click();
          break;
        case 'KeyF':
          fsBtn.click();
          break;
      }
    };

    window.addEventListener('keydown', this._handleKeyDown);
  },

  _formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    const h = Math.floor(m / 60);
    const remMin = m % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) {
      return `${h}:${pad(remMin)}:${pad(remSec)}`;
    }
    return `${pad(remMin)}:${pad(remSec)}`;
  },

  _cleanup() {
    if (this.progressSaveTimer) {
      clearInterval(this.progressSaveTimer);
      this.progressSaveTimer = null;
    }
    if (this.hudTimeout) {
      clearTimeout(this.hudTimeout);
      this.hudTimeout = null;
    }
    if (this._handleKeyDown) {
      window.removeEventListener('keydown', this._handleKeyDown);
      this._handleKeyDown = null;
    }
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.src = '';
      this.videoEl = null;
    }
  }
};
