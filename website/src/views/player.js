/**
 * MAYA Web — Cinematic Video Player View (/watch/:id)
 * Features:
 * - Pure black cinema canvas (#000000)
 * - Custom translucent dark HUD with MAYA gold accents
 * - Play/Pause, Seek (-10s / +10s), Timeline Scrubber with timestamp
 * - Volume / Mute, Quality switcher, Speed selector, Fit toggle, Fullscreen, PiP
 * - Keyboard shortcuts (Space, Arrows, M, F)
 * - Playback position resume memory
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
          'No authorized streaming source is currently available for this title. Only verified playback sources are permitted.',
          router,
          movieId
        );
        return;
      }

      // Render Player Interface
      const activeSource = this.sources[0];
      const previousProgress = HistoryService.getProgress(movieId);

      container.innerHTML = `
        <div class="maya-player-wrapper" id="player-wrapper">
          
          <!-- Video Element -->
          <video 
            id="maya-video-element" 
            class="maya-video-element" 
            playsinline 
            preload="metadata"
            src="${activeSource.playbackUrl}">
          </video>

          <!-- Top Back Bar Overlay -->
          <div class="player-top-overlay" id="player-top-hud">
            <a href="/movie/${movieId}" class="player-nav-back" aria-label="Return to movie details">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>DETAILS</span>
            </a>

            <div class="player-header-title">
              <span class="player-movie-name">${this.movie.title}</span>
              ${this.movie.release_year ? `<span class="player-movie-year">${this.movie.release_year}</span>` : ''}
            </div>

            <div class="player-brand-badge">
              <img src="/assets/maya/maya_eye.svg" alt="MAYA" width="22" height="13">
              <span>MAYA HUD</span>
            </div>
          </div>

          <!-- Center Loading / Buffering Spinner -->
          <div class="player-center-spinner" id="player-spinner" hidden>
            <div class="spinner-eye">
              <img src="/assets/maya/maya_eye.svg" alt="Loading" width="48" height="28" class="pulse-fast">
            </div>
          </div>

          <!-- Big Center Play / Pause Flash Overlay -->
          <button class="player-center-play-btn" id="center-play-trigger" aria-label="Play or pause video">
            <svg class="icon-center-play" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>

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

          <!-- Bottom Playback Controls HUD -->
          <div class="player-bottom-hud" id="player-bottom-hud">
            
            <!-- Scrubber / Timeline Bar -->
            <div class="scrubber-wrapper" id="scrubber-container">
              <div class="scrubber-buffered" id="scrubber-buffered"></div>
              <div class="scrubber-progress" id="scrubber-progress"></div>
              <div class="scrubber-thumb" id="scrubber-thumb"></div>
              <input type="range" class="scrubber-input" id="scrubber-range" min="0" max="100" step="0.1" value="0" aria-label="Timeline scrubber">
            </div>

            <!-- Control Actions Row -->
            <div class="controls-actions-row">
              
              <div class="controls-left">
                <!-- Play/Pause Button -->
                <button class="ctrl-btn" id="ctrl-play-pause" aria-label="Play/Pause (Space)">
                  <svg class="icon-play" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <svg class="icon-pause" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" hidden><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                </button>

                <!-- -10s Seek -->
                <button class="ctrl-btn ctrl-seek" id="ctrl-seek-back" aria-label="Rewind 10 seconds (Left Arrow)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                  </svg>
                  <span class="seek-tag">-10</span>
                </button>

                <!-- +10s Seek -->
                <button class="ctrl-btn ctrl-seek" id="ctrl-seek-forward" aria-label="Fast forward 10 seconds (Right Arrow)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  <span class="seek-tag">+10</span>
                </button>

                <!-- Volume & Mute -->
                <div class="volume-control-group">
                  <button class="ctrl-btn" id="ctrl-mute" aria-label="Mute/Unmute (M)">
                    <svg class="icon-vol-high" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    <svg class="icon-vol-mute" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" hidden>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>
                    </svg>
                  </button>
                  <input type="range" class="volume-slider" id="ctrl-volume-slider" min="0" max="1" step="0.05" value="1" aria-label="Volume slider">
                </div>

                <!-- Timestamp Display -->
                <div class="timestamp-display">
                  <span id="time-current">00:00</span>
                  <span class="time-sep">/</span>
                  <span id="time-duration">00:00</span>
                </div>
              </div>

              <div class="controls-right">
                
                <!-- Quality Selection Menu -->
                <div class="ctrl-dropdown-wrap">
                  <button class="ctrl-btn ctrl-btn-labeled" id="quality-btn" aria-label="Select stream quality">
                    <span id="quality-label">${activeSource.quality}</span>
                  </button>
                  <div class="ctrl-menu-popover" id="quality-menu" hidden>
                    ${this.sources.map((src, i) => `
                      <button class="ctrl-menu-item ${i === 0 ? 'is-active' : ''}" data-source-index="${i}">
                        ${src.quality} (${src.format.toUpperCase()})
                      </button>
                    `).join('')}
                  </div>
                </div>

                <!-- Speed Selection Menu -->
                <div class="ctrl-dropdown-wrap">
                  <button class="ctrl-btn ctrl-btn-labeled" id="speed-btn" aria-label="Playback speed">
                    <span id="speed-label">1.0x</span>
                  </button>
                  <div class="ctrl-menu-popover" id="speed-menu" hidden>
                    <button class="ctrl-menu-item" data-speed="0.5">0.5x</button>
                    <button class="ctrl-menu-item" data-speed="0.75">0.75x</button>
                    <button class="ctrl-menu-item is-active" data-speed="1.0">1.0x Normal</button>
                    <button class="ctrl-menu-item" data-speed="1.25">1.25x</button>
                    <button class="ctrl-menu-item" data-speed="1.5">1.5x</button>
                    <button class="ctrl-menu-item" data-speed="2.0">2.0x</button>
                  </div>
                </div>

                <!-- Aspect Fit Toggle -->
                <button class="ctrl-btn" id="ctrl-fit" aria-label="Toggle aspect ratio fit">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                </button>

                <!-- Picture in Picture -->
                <button class="ctrl-btn" id="ctrl-pip" aria-label="Picture in Picture">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <rect x="12" y="10" width="8" height="8" rx="1"></rect>
                  </svg>
                </button>

                <!-- Fullscreen -->
                <button class="ctrl-btn" id="ctrl-fullscreen" aria-label="Toggle Fullscreen (F)">
                  <svg class="icon-fs-enter" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                  </svg>
                  <svg class="icon-fs-exit" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" hidden>
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                  </svg>
                </button>

              </div>

            </div>

          </div>

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
    const scrubberRange = container.querySelector('#scrubber-range');
    const scrubberProgress = container.querySelector('#scrubber-progress');
    const scrubberThumb = container.querySelector('#scrubber-thumb');
    const scrubberBuffered = container.querySelector('#scrubber-buffered');
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

    playPauseBtn.addEventListener('click', togglePlay);
    centerPlayBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);

    video.addEventListener('play', () => updatePlayUI(true));
    video.addEventListener('pause', () => updatePlayUI(false));

    // 2. Timeline & Duration
    video.addEventListener('loadedmetadata', () => {
      timeDuration.textContent = this._formatTime(video.duration);
    });

    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      const current = video.currentTime;
      const total = video.duration;
      const pct = (current / total) * 100;

      timeCurrent.textContent = this._formatTime(current);
      scrubberProgress.style.width = `${pct}%`;
      scrubberThumb.style.left = `${pct}%`;
      scrubberRange.value = pct;

      // Update buffer
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferPct = (bufferedEnd / total) * 100;
        scrubberBuffered.style.width = `${bufferPct}%`;
      }
    });

    // Scrubber Dragging / Scrubbing
    scrubberRange.addEventListener('input', () => {
      if (!video.duration) return;
      const seekPct = parseFloat(scrubberRange.value);
      const targetTime = (seekPct / 100) * video.duration;
      video.currentTime = targetTime;
    });

    // 3. -10s / +10s Seek Controls
    seekBackBtn.addEventListener('click', () => {
      video.currentTime = Math.max(0, video.currentTime - 10);
    });

    seekFwdBtn.addEventListener('click', () => {
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
    });

    // 4. Volume & Mute
    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      iconVolHigh.hidden = video.muted;
      iconVolMute.hidden = !video.muted;
      volumeSlider.value = video.muted ? 0 : video.volume;
    });

    volumeSlider.addEventListener('input', () => {
      const val = parseFloat(volumeSlider.value);
      video.volume = val;
      video.muted = val === 0;
      iconVolHigh.hidden = video.muted;
      iconVolMute.hidden = !video.muted;
    });

    // 5. Fullscreen Toggle
    fsBtn.addEventListener('click', () => {
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

    // 6. Picture-in-Picture
    if (document.pictureInPictureEnabled) {
      pipBtn.addEventListener('click', async () => {
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await video.requestPictureInPicture();
          }
        } catch (e) {
          console.warn('PiP error:', e);
        }
      });
    } else {
      pipBtn.style.display = 'none';
    }

    // 7. Aspect Fit Toggle
    let isCover = false;
    fitBtn.addEventListener('click', () => {
      isCover = !isCover;
      video.style.objectFit = isCover ? 'cover' : 'contain';
      fitBtn.classList.toggle('is-active', isCover);
    });

    // 8. Quality Menu
    if (qualityBtn && qualityMenu) {
      qualityBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        qualityMenu.hidden = !qualityMenu.hidden;
        if (speedMenu) speedMenu.hidden = true;
      });

      const items = qualityMenu.querySelectorAll('.ctrl-menu-item');
      items.forEach(item => {
        item.addEventListener('click', () => {
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

    // 9. Speed Menu
    if (speedBtn && speedMenu) {
      speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedMenu.hidden = !speedMenu.hidden;
        if (qualityMenu) qualityMenu.hidden = true;
      });

      const speedItems = speedMenu.querySelectorAll('.ctrl-menu-item');
      speedItems.forEach(item => {
        item.addEventListener('click', () => {
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

    // 10. Buffering & Loading states
    video.addEventListener('waiting', () => {
      if (spinner) spinner.hidden = false;
    });
    video.addEventListener('canplay', () => {
      if (spinner) spinner.hidden = true;
    });

    // 11. Auto-hide HUD on inactivity
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

    // 12. Resume Banner Actions
    if (resumeBanner) {
      const btnYes = resumeBanner.querySelector('#btn-resume-yes');
      const btnNo = resumeBanner.querySelector('#btn-resume-no');

      if (btnYes) {
        btnYes.addEventListener('click', () => {
          video.currentTime = previousProgress.currentTime;
          resumeBanner.style.display = 'none';
          video.play();
        });
      }

      if (btnNo) {
        btnNo.addEventListener('click', () => {
          video.currentTime = 0;
          resumeBanner.style.display = 'none';
          video.play();
        });
      }
    }

    // 13. Progress Saving Loop
    this.progressSaveTimer = setInterval(() => {
      if (video && !video.paused && video.duration > 0) {
        HistoryService.saveProgress(movieId, video.currentTime, video.duration, this.movie);
      }
    }, 4000);

    // 14. Keyboard Shortcuts
    this._handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
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
    if (!seconds || isNaN(seconds)) return '00:00';
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
