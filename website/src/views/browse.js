/**
 * MAYA Web — Online Discovery View (/browse, /genre/:genre, /watchlist, /history)
 * Renders the top minimal bar, dynamic featured hero, continue watching,
 * and curated catalogue rows.
 */

import { CatalogueService } from '../services/catalogue.js';
import { PlaybackService } from '../services/playback.js';
import { WatchlistService, HistoryService } from '../services/storage.js';

export const BrowseView = {
  containerId: 'browse-view',

  async render({ route = '/browse', params = {}, query = {}, router }) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Show initial loading state
    container.innerHTML = `
      <div class="online-loading-container" aria-live="polite">
        <div class="online-loading-eye">
          <img src="/assets/maya/maya_eye.svg" alt="Loading MAYA" width="64" height="38" class="pulse-loader">
        </div>
        <p class="online-loading-text">LOADING CINEMA CATALOGUE...</p>
      </div>
    `;

    try {
      // Determine what to display based on route
      const isWatchlistView = route === '/watchlist';
      const isHistoryView = route === '/history';
      const isGenreView = route.startsWith('/genre/');
      const targetGenre = params.genre ? decodeURIComponent(params.genre) : '';

      // Set document title
      if (isWatchlistView) {
        router.updateTitle('My Watchlist');
      } else if (isHistoryView) {
        router.updateTitle('Watch History');
      } else if (isGenreView) {
        router.updateTitle(`${targetGenre} Cinema`);
      } else {
        router.updateTitle('Explore Cinema');
      }

      // Fetch featured movie & feed
      const [featuredMovie, feedData] = await Promise.all([
        CatalogueService.getFeaturedMovie(),
        CatalogueService.getCuratedFeed(),
      ]);

      const continueWatching = HistoryService.getContinueWatching();
      const watchlist = WatchlistService.getWatchlist();

      // Check if featured movie has authorized stream
      const hasFeaturedPlayback = featuredMovie ? await PlaybackService.hasAuthorizedPlayback(featuredMovie) : false;

      // Render View Markup
      container.innerHTML = `
        <div class="online-platform-shell">
          
          <!-- Minimal Online Header Nav -->
          <header class="online-top-bar" role="banner">
            <div class="online-bar-inner">
              <div class="online-bar-left">
                <a href="/browse" class="online-brand-link" aria-label="MAYA Online Home">
                  <img src="/assets/maya/maya_eye.svg" alt="MAYA Eye" width="30" height="18" class="online-logo-eye">
                  <span class="online-logo-text">MAYA <span class="online-badge-pill">WEB</span></span>
                </a>

                <nav class="online-main-nav" aria-label="Online streaming navigation">
                  <a href="/browse" class="online-nav-link ${route === '/browse' ? 'is-active' : ''}">HOME</a>
                  <a href="/search" class="online-nav-link ${route === '/search' ? 'is-active' : ''}">EXPLORE</a>
                  <div class="online-nav-dropdown">
                    <button class="online-nav-link dropdown-toggle" aria-haspopup="true">GENRES ▾</button>
                    <div class="dropdown-menu">
                      <a href="/genre/Action" class="dropdown-item">Action</a>
                      <a href="/genre/Thriller" class="dropdown-item">Thriller</a>
                      <a href="/genre/Drama" class="dropdown-item">Drama</a>
                      <a href="/genre/Comedy" class="dropdown-item">Comedy</a>
                      <a href="/genre/Romance" class="dropdown-item">Romance</a>
                      <a href="/genre/Animation" class="dropdown-item">Anime / Animation</a>
                      <a href="/genre/Crime" class="dropdown-item">Crime</a>
                      <a href="/genre/Horror" class="dropdown-item">Horror</a>
                    </div>
                  </div>
                  <a href="/watchlist" class="online-nav-link ${isWatchlistView ? 'is-active' : ''}">
                    WATCHLIST ${watchlist.length > 0 ? `<span class="nav-count-badge">${watchlist.length}</span>` : ''}
                  </a>
                  <a href="/history" class="online-nav-link ${isHistoryView ? 'is-active' : ''}">HISTORY</a>
                </nav>
              </div>

              <div class="online-bar-right">
                <!-- Search Icon Button -->
                <a href="/search" class="online-search-btn" aria-label="Search movies">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span class="search-btn-label">SEARCH</span>
                </a>

                <!-- Download APK trigger -->
                <button class="btn-online-apk js-download-btn" aria-label="Download MAYA APK">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span class="apk-btn-text">GET APK</span>
                </button>

                <!-- Back to Landing Page -->
                <a href="/" class="online-back-home" title="Return to MAYA App Landing Page">
                  <span class="home-icon-label">&larr; APP SITE</span>
                </a>

                <!-- Mobile Hamburger Toggle -->
                <button class="online-mobile-toggle" id="online-menu-toggle" aria-label="Toggle navigation menu">
                  <span></span><span></span><span></span>
                </button>
              </div>
            </div>
          </header>

          <!-- Mobile Drawer for Online Mode (Full Viewport Modal) -->
          <div class="online-mobile-drawer" id="online-drawer" hidden>
            <div class="drawer-header">
              <div class="drawer-brand">
                <img src="/assets/maya/maya_eye.svg" alt="MAYA" width="26" height="16">
                <span>MAYA WEB</span>
              </div>
              <button class="drawer-close-btn" id="online-drawer-close" aria-label="Close menu">&times;</button>
            </div>
            <nav class="drawer-links">
              <a href="/browse" class="drawer-link">HOME</a>
              <a href="/search" class="drawer-link">SEARCH &amp; EXPLORE</a>
              <a href="/watchlist" class="drawer-link">WATCHLIST (${watchlist.length})</a>
              <a href="/history" class="drawer-link">CONTINUE WATCHING (${continueWatching.length})</a>

              <div class="drawer-genres-section">
                <span class="drawer-genres-label">GENRES</span>
                <div class="drawer-genre-chips">
                  <a href="/genre/Action" class="drawer-genre-chip">Action</a>
                  <a href="/genre/Thriller" class="drawer-genre-chip">Thriller</a>
                  <a href="/genre/Drama" class="drawer-genre-chip">Drama</a>
                  <a href="/genre/Comedy" class="drawer-genre-chip">Comedy</a>
                  <a href="/genre/Animation" class="drawer-genre-chip">Anime</a>
                </div>
              </div>

              <a href="/" class="drawer-link drawer-link-exit">&larr; BACK TO MAYA LANDING</a>
            </nav>
            <div class="drawer-footer">
              <button class="btn-download-primary js-download-btn" style="width:100%; max-width:340px; margin:0 auto;">DOWNLOAD MAYA APK</button>
            </div>
          </div>

          <main class="online-content-area" id="online-main">
            
            ${isWatchlistView ? this._renderWatchlistView(watchlist) :
              isHistoryView ? this._renderHistoryView(continueWatching) :
              isGenreView ? await this._renderGenreView(targetGenre) :
              this._renderHomeFeed(featuredMovie, hasFeaturedPlayback, continueWatching, feedData)}

          </main>

          <!-- Minimal Footer for MAYA Web -->
          <footer class="online-footer">
            <div class="online-footer-inner">
              <a href="#online-main" class="footer-eye-anchor" aria-label="Scroll to top of catalogue">
                <img src="/assets/maya/maya_eye.svg" alt="MAYA Eye" width="110" height="64" class="footer-ambient-eye">
              </a>
              <p class="online-footer-copy">MAYA Web &bull; Cinema Streaming Platform</p>
              <div class="online-footer-links">
                <a href="/">MAYA APP</a> &bull;
                <a href="/browse">BROWSE</a> &bull;
                <a href="/watchlist">WATCHLIST</a> &bull;
                <a href="/search">SEARCH</a>
              </div>
              <p class="online-footer-rights">&copy; ${new Date().getFullYear()} MAYA. All rights reserved.</p>
            </div>
          </footer>

        </div>
      `;

      this._attachEventListeners(container, router);

    } catch (error) {
      console.error('Error rendering BrowseView:', error);
      container.innerHTML = `
        <div class="online-error-state">
          <div class="error-eye-frame">
            <img src="/assets/maya/maya_eye.svg" alt="Error" width="60" height="35" style="opacity:0.4;">
          </div>
          <h2 class="error-title">CATALOGUE TEMPORARILY UNAVAILABLE</h2>
          <p class="error-desc">Could not synchronize with the movie catalogue. Please check your network connection.</p>
          <button class="btn-retry-catalogue" id="retry-catalogue-btn">TRY AGAIN</button>
          <a href="/" class="error-fallback-link">&larr; Return to MAYA Homepage</a>
        </div>
      `;

      const retryBtn = container.querySelector('#retry-catalogue-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.render({ route, params, query, router });
        });
      }
    }
  },

  /**
   * Home Feed with Featured Hero and Curated Rows
   */
  _renderHomeFeed(featuredMovie, hasPlayback, continueWatching, feedData) {
    return `
      <!-- Featured Movie Hero -->
      ${featuredMovie ? this._renderFeaturedHero(featuredMovie, hasPlayback) : ''}

      <div class="online-rows-container">
        
        <!-- Continue Watching Row (if user has active history) -->
        ${continueWatching.length > 0 ? `
          <section class="catalogue-shelf-section" aria-labelledby="shelf-continue">
            <div class="shelf-header">
              <span class="shelf-tag">[ RESUME PLAYBACK ]</span>
              <h2 class="shelf-title" id="shelf-continue">CONTINUE WATCHING</h2>
            </div>
            <div class="shelf-scroller">
              <div class="shelf-track">
                ${continueWatching.map(item => this._renderContinueWatchingCard(item)).join('')}
              </div>
            </div>
          </section>
        ` : ''}

        <!-- Dynamic Category Rows -->
        ${feedData.sections.map(section => `
          <section class="catalogue-shelf-section" aria-labelledby="shelf-${section.id}">
            <div class="shelf-header">
              <span class="shelf-tag">[ ${section.tag} ]</span>
              <div class="shelf-title-row">
                <h2 class="shelf-title" id="shelf-${section.id}">${section.title}</h2>
                <span class="shelf-count">${section.movies.length} TITLES</span>
              </div>
            </div>
            <div class="shelf-scroller">
              <div class="shelf-track">
                ${section.movies.map(movie => this._renderMovieCard(movie)).join('')}
              </div>
            </div>
          </section>
        `).join('')}

      </div>
    `;
  },

  /**
   * Featured Movie Hero Section
   */
  _renderFeaturedHero(movie, hasPlayback) {
    const backdropUrl = movie.backdrop || movie.poster;
    const movieId = movie.tmdb_id || movie.id;
    const rating = typeof movie.rating === 'number' ? movie.rating.toFixed(1) : (movie.rating || '8.5');
    const year = movie.release_year || '';
    const genres = Array.isArray(movie.genres) ? movie.genres.slice(0, 3) : [];
    const description = movie.description || 'Experience cinema uncompromised with MAYA.';
    const truncatedDesc = description.length > 240 ? description.substring(0, 240) + '...' : description;
    const inWatchlist = WatchlistService.isInWatchlist(movieId);

    return `
      <section class="featured-hero-banner" aria-label="Featured Movie">
        <div class="featured-backdrop-wrap">
          <img src="${backdropUrl}" alt="${movie.title} backdrop" class="featured-backdrop-img" loading="eager">
          <div class="featured-gradient-vignette"></div>
        </div>

        <div class="featured-content-wrap">
          <div class="featured-identity-badge">
            <span class="badge-accent-dot"></span>
            <span>FEATURED SELECTION</span>
          </div>

          <h1 class="featured-title">${movie.title}</h1>

          <div class="featured-meta-row">
            ${rating ? `<span class="meta-rating-pill">★ ${rating}</span>` : ''}
            ${year ? `<span class="meta-year">${year}</span>` : ''}
            ${movie.rip ? `<span class="meta-quality-pill">${movie.rip}</span>` : ''}
            ${genres.map(g => `<span class="meta-genre-tag">${g}</span>`).join('')}
          </div>

          <p class="featured-synopsis">${truncatedDesc}</p>

          <div class="featured-actions-row">
            ${hasPlayback ? `
              <a href="/watch/${movieId}" class="btn-hero-play" aria-label="Watch ${movie.title} now">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>PLAY NOW</span>
              </a>
            ` : ''}

            <a href="/movie/${movieId}" class="btn-hero-info" aria-label="View details for ${movie.title}">
              <span>MORE INFO</span>
            </a>

            <button class="btn-hero-watchlist js-watchlist-toggle" data-movie-id="${movieId}" aria-label="Toggle Watchlist">
              <span class="watchlist-icon">${inWatchlist ? '✓' : '+'}</span>
              <span class="watchlist-label">${inWatchlist ? 'IN LIST' : 'WATCHLIST'}</span>
            </button>
          </div>
        </div>
      </section>
    `;
  },

  /**
   * Standard Movie Card
   */
  _renderMovieCard(movie) {
    const movieId = movie.tmdb_id || movie.id;
    const posterUrl = movie.poster || '/assets/maya/app_home.png';
    const rating = typeof movie.rating === 'number' ? movie.rating.toFixed(1) : (movie.rating || '');
    const year = movie.release_year || '';
    const inWatchlist = WatchlistService.isInWatchlist(movieId);

    return `
      <article class="movie-card" data-movie-id="${movieId}" tabindex="0">
        <div class="card-poster-frame">
          <img src="${posterUrl}" alt="MAYA movie poster for ${movie.title}" class="card-poster-img" loading="lazy">
          
          <!-- Hover Overlay with Quick Actions -->
          <div class="card-hover-overlay">
            <div class="overlay-top">
              ${rating ? `<span class="card-rating-badge">★ ${rating}</span>` : ''}
              <button class="card-quick-watchlist js-watchlist-toggle" data-movie-id="${movieId}" title="Toggle watchlist" aria-label="Toggle watchlist">
                ${inWatchlist ? '✓' : '+'}
              </button>
            </div>
            <div class="overlay-bottom">
              <a href="/movie/${movieId}" class="card-quick-btn" aria-label="Inspect ${movie.title}">DETAILS &rarr;</a>
            </div>
          </div>
        </div>

        <div class="card-caption">
          <h3 class="card-title" title="${movie.title}">${movie.title}</h3>
          <div class="card-meta">
            ${year ? `<span>${year}</span>` : ''}
            ${movie.rip ? `<span>&bull; ${movie.rip}</span>` : ''}
          </div>
        </div>
      </article>
    `;
  },

  /**
   * Continue Watching Card
   */
  _renderContinueWatchingCard(item) {
    const movieId = item.tmdb_id || item.id;
    const posterUrl = item.poster || item.backdrop || '/assets/maya/app_home.png';
    const percent = item.percent || 0;
    const minutesLeft = Math.max(1, Math.round(((item.duration || 0) - (item.currentTime || 0)) / 60));

    return `
      <article class="movie-card continue-card" data-movie-id="${movieId}" tabindex="0">
        <div class="card-poster-frame">
          <img src="${posterUrl}" alt="Poster for ${item.title}" class="card-poster-img" loading="lazy">
          <div class="progress-bar-container" aria-label="${percent}% watched">
            <div class="progress-bar-fill" style="width: ${percent}%;"></div>
          </div>
          <div class="card-hover-overlay">
            <div class="overlay-center">
              <a href="/watch/${movieId}" class="btn-resume-play" aria-label="Resume playing ${item.title}">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </a>
            </div>
            <div class="overlay-bottom">
              <span class="resume-time-note">${minutesLeft}m left</span>
            </div>
          </div>
        </div>

        <div class="card-caption">
          <h3 class="card-title">${item.title}</h3>
          <div class="card-meta">
            <span>Resume &bull; ${percent}%</span>
          </div>
        </div>
      </article>
    `;
  },

  /**
   * Watchlist View (/watchlist)
   */
  _renderWatchlistView(watchlist) {
    if (!watchlist || watchlist.length === 0) {
      return `
        <div class="empty-shelf-view">
          <div class="empty-icon-frame">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h2 class="empty-heading">YOUR LIST IS EMPTY</h2>
          <p class="empty-sub">Explore the catalogue and bookmark movies to watch later.</p>
          <a href="/browse" class="btn-empty-action">BROWSE MOVIES</a>
        </div>
      `;
    }

    return `
      <div class="catalogue-page-container">
        <div class="catalogue-page-header">
          <span class="shelf-tag">[ SAVED CINEMA ]</span>
          <h1 class="page-title">MY WATCHLIST</h1>
          <p class="page-subtitle">${watchlist.length} titles saved to your private collection.</p>
        </div>

        <div class="catalogue-grid-view">
          ${watchlist.map(movie => this._renderMovieCard(movie)).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Watch History View (/history)
   */
  _renderHistoryView(historyItems) {
    if (!historyItems || historyItems.length === 0) {
      return `
        <div class="empty-shelf-view">
          <div class="empty-icon-frame">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <h2 class="empty-heading">NOTHING HERE YET</h2>
          <p class="empty-sub">When you start watching movies on MAYA, your playback history and timestamps will appear here.</p>
          <a href="/browse" class="btn-empty-action">EXPLORE CATALOGUE</a>
        </div>
      `;
    }

    return `
      <div class="catalogue-page-container">
        <div class="catalogue-page-header">
          <span class="shelf-tag">[ PLAYBACK MEMORY ]</span>
          <h1 class="page-title">CONTINUE WATCHING</h1>
          <p class="page-subtitle">Resume your cinema right where you left off.</p>
        </div>

        <div class="catalogue-grid-view">
          ${historyItems.map(item => this._renderContinueWatchingCard(item)).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Genre View (/genre/:genre)
   */
  async _renderGenreView(genre) {
    const data = await CatalogueService.searchCatalogue('', genre, 'rating:desc');
    const movies = data.movies;

    return `
      <div class="catalogue-page-container">
        <div class="catalogue-page-header">
          <a href="/browse" class="back-link">&larr; ALL GENRES</a>
          <span class="shelf-tag">[ GENRE CURATION ]</span>
          <h1 class="page-title">${genre.toUpperCase()} CINEMA</h1>
          <p class="page-subtitle">Discovering ${data.total_count} titles in ${genre}.</p>
        </div>

        ${movies.length > 0 ? `
          <div class="catalogue-grid-view">
            ${movies.map(movie => this._renderMovieCard(movie)).join('')}
          </div>
        ` : `
          <div class="empty-shelf-view">
            <h2 class="empty-heading">NO TITLES FOUND</h2>
            <p class="empty-sub">No movies currently match the ${genre} category.</p>
            <a href="/browse" class="btn-empty-action">BACK TO HOME</a>
          </div>
        `}
      </div>
    `;
  },

  /**
   * Attach Interactive Listeners
   */
  _attachEventListeners(container, router) {
    // Mobile Drawer Toggle
    const toggleBtn = container.querySelector('#online-menu-toggle');
    const drawer = container.querySelector('#online-drawer');
    const closeBtn = container.querySelector('#online-drawer-close');

    if (toggleBtn && drawer) {
      toggleBtn.addEventListener('click', () => {
        drawer.hidden = !drawer.hidden;
      });
    }

    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => {
        drawer.hidden = true;
      });
    }

    if (drawer) {
      drawer.querySelectorAll('a, button').forEach(el => {
        if (el !== closeBtn) {
          el.addEventListener('click', () => {
            drawer.hidden = true;
          });
        }
      });
    }

    // Clicking anywhere on movie card navigates to movie details
    const cards = container.querySelectorAll('.movie-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        // If clicking action button inside card, don't trigger card navigation
        if (e.target.closest('.js-watchlist-toggle') || e.target.closest('a')) {
          return;
        }
        const movieId = card.getAttribute('data-movie-id');
        if (movieId) {
          router.navigate(`/movie/${movieId}`);
        }
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const movieId = card.getAttribute('data-movie-id');
          if (movieId) router.navigate(`/movie/${movieId}`);
        }
      });
    });

    // Watchlist toggle buttons
    const watchlistBtns = container.querySelectorAll('.js-watchlist-toggle');
    watchlistBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const movieId = btn.getAttribute('data-movie-id');
        if (!movieId) return;

        const movie = await CatalogueService.getMovieById(movieId);
        if (movie) {
          const added = WatchlistService.toggleWatchlist(movie);
          // Update button appearance
          const iconSpan = btn.querySelector('.watchlist-icon') || btn;
          const labelSpan = btn.querySelector('.watchlist-label');
          if (iconSpan) iconSpan.textContent = added ? '✓' : '+';
          if (labelSpan) labelSpan.textContent = added ? 'IN LIST' : 'WATCHLIST';
        }
      });
    });
  }
};
