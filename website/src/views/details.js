/**
 * MAYA Web — Movie Details View (/movie/:id)
 * Cinematic movie presentation with high-res backdrop, poster, metadata badges,
 * synopsis, watchlist toggle, and conditional [ PLAY NOW ] button.
 */

import { CatalogueService } from '../services/catalogue.js';
import { PlaybackService } from '../services/playback.js';
import { WatchlistService } from '../services/storage.js';

export const DetailsView = {
  containerId: 'details-view',

  async render({ params = {}, router }) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const movieId = params.id;

    // Loading State
    container.innerHTML = `
      <div class="online-loading-container" aria-live="polite">
        <div class="online-loading-eye">
          <img src="/assets/maya/maya_eye.svg" alt="Loading MAYA" width="64" height="38" class="pulse-loader">
        </div>
        <p class="online-loading-text">LOADING CINEMA DETAILS...</p>
      </div>
    `;

    try {
      const movie = await CatalogueService.getMovieById(movieId);

      if (!movie) {
        container.innerHTML = `
          <div class="online-error-state">
            <div class="error-eye-frame">
              <img src="/assets/maya/maya_eye.svg" alt="Error" width="60" height="35" style="opacity:0.4;">
            </div>
            <h2 class="error-title">MOVIE NOT FOUND</h2>
            <p class="error-desc">We couldn't locate movie #${movieId} in the synchronized catalogue.</p>
            <a href="/browse" class="btn-retry-catalogue">&larr; BACK TO CATALOGUE</a>
          </div>
        `;
        return;
      }

      // Safe normalization & fallbacks
      const normMovie = CatalogueService.normalizeMovie(movie);
      if (!normMovie) {
        throw new Error('Failed to normalize movie details.');
      }

      const title = normMovie.title || 'Untitled Cinema';
      const backdropUrl = normMovie.backdropUrl || normMovie.posterUrl || '/assets/maya/placeholder_poster.jpg';
      const posterUrl = normMovie.posterUrl || normMovie.backdropUrl || '/assets/maya/placeholder_poster.jpg';
      const rating = normMovie.rating ? Number(normMovie.rating).toFixed(1) : null;
      const year = normMovie.releaseYear || normMovie.release_year || '';
      const runtime = normMovie.runtime ? `${normMovie.runtime} min` : '';
      const languages = (normMovie.languages && normMovie.languages.length > 0) ? normMovie.languages.join(', ') : '';
      const genres = Array.isArray(normMovie.genres) ? normMovie.genres : [];
      const description = normMovie.description || 'No description available for this title.';
      const inWatchlist = WatchlistService.isInWatchlist(movieId);
      const quality = normMovie.quality || normMovie.rip || 'HD';

      // Update document title for SEO
      router.updateTitle(`${title} ${year ? `(${year})` : ''}`);

      // Fetch playability status and related movies
      const status = await PlaybackService.getPlayabilityStatus(normMovie);
      const relatedMovies = await CatalogueService.getRelatedMovies(normMovie, 6);

      container.innerHTML = `
        <div class="movie-details-page">
          
          <!-- Atmospheric Backdrop Header -->
          <div class="details-backdrop-container">
            <img src="${backdropUrl}" alt="${title} backdrop" class="details-backdrop-img" onerror="this.onerror=null;this.src='/assets/maya/placeholder_poster.jpg';">
            <div class="details-backdrop-gradient"></div>
            <div class="details-top-bar">
              <a href="/browse" class="btn-back-nav" aria-label="Return to catalogue">
                <span>&larr; BACK TO EXPLORE</span>
              </a>
              <a href="/" class="btn-app-site" aria-label="Return to MAYA landing page">
                <span>MAYA APP</span>
              </a>
            </div>
          </div>

          <!-- Main Details Presentation -->
          <div class="details-stage-container">
            <div class="details-grid">
              
              <!-- Poster Column -->
              <div class="details-poster-col">
                <div class="details-poster-frame">
                  <img src="${posterUrl}" alt="MAYA official poster for ${title}" class="details-poster-img" onerror="this.onerror=null;this.src='/assets/maya/placeholder_poster.jpg';">
                  <div class="poster-rim-glow"></div>
                </div>
              </div>

              <!-- Content Column -->
              <div class="details-info-col">
                <div class="details-tag-row">
                  <span class="details-badge-identity">MAYA CINEMA</span>
                  ${quality ? `<span class="details-badge-quality">${quality}</span>` : ''}
                  ${status.isPlayable ? '<span class="details-badge-verified">AUTHORIZED STREAM ✓</span>' : '<span class="details-badge-catonly">CATALOGUE ONLY</span>'}
                </div>

                <h1 class="details-movie-title">${title}</h1>

                <!-- Metadata Row -->
                <div class="details-meta-pills">
                  ${rating ? `<span class="pill-rating">★ ${rating}</span>` : ''}
                  ${year ? `<span class="pill-year">${year}</span>` : ''}
                  ${runtime ? `<span class="pill-runtime">${runtime}</span>` : ''}
                  ${languages ? `<span class="pill-lang">${languages}</span>` : ''}
                </div>

                <!-- Genre Tags -->
                <div class="details-genres-wrap">
                  ${genres.map(g => `<span class="genre-bubble">${g}</span>`).join('')}
                </div>

                <!-- Synopsis -->
                <div class="details-synopsis-block">
                  <h2 class="synopsis-label">OVERVIEW</h2>
                  <p class="synopsis-text">${description}</p>
                </div>

                <!-- Playback & Source Availability Info -->
                <div class="playback-availability-card">
                  <div class="avail-header">
                    <span class="avail-indicator ${status.badgeClass}"></span>
                    <span class="avail-title">${status.statusText}</span>
                  </div>
                  <p class="avail-note">${status.note}</p>
                </div>

                <!-- Action Buttons Row -->
                <div class="details-actions-row">
                  ${status.isPlayable ? `
                    <a href="/watch/${movieId}" class="btn-details-play" aria-label="Play ${title} in MAYA player">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      <span>PLAY NOW</span>
                    </a>
                  ` : `
                    <button class="btn-details-unavailable" disabled aria-label="Web playback is not available for this title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                      </svg>
                      <span>PLAYBACK UNAVAILABLE</span>
                    </button>
                  `}

                  <button class="btn-details-watchlist js-details-watchlist-btn" data-movie-id="${movieId}" aria-label="Toggle Watchlist">
                    <span class="watchlist-status-icon">${inWatchlist ? '✓' : '+'}</span>
                    <span class="watchlist-status-text">${inWatchlist ? 'IN WATCHLIST' : 'ADD TO WATCHLIST'}</span>
                  </button>

                  <button class="btn-details-apk js-download-btn" aria-label="Download MAYA APK for Android">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>GET ANDROID APP</span>
                  </button>
                </div>

              </div>

            </div>

            <!-- More Like This (Related Movies Shelf) -->
            ${relatedMovies.length > 0 ? `
              <div class="related-shelf-wrap">
                <div class="shelf-header">
                  <span class="shelf-tag">[ SIMILAR TITLES ]</span>
                  <h2 class="shelf-title">MORE LIKE THIS</h2>
                </div>
                <div class="shelf-scroller">
                  <div class="shelf-track">
                    ${relatedMovies.map(rel => `
                      <article class="movie-card" data-movie-id="${rel.tmdb_id || rel.id}" tabindex="0">
                        <div class="card-poster-frame">
                          <img src="${rel.poster || rel.posterUrl || '/assets/maya/placeholder_poster.jpg'}" alt="${rel.title}" class="card-poster-img" loading="lazy" onerror="this.onerror=null;this.src='/assets/maya/placeholder_poster.jpg';">
                          <div class="card-hover-overlay">
                            <div class="overlay-bottom">
                              <a href="/movie/${rel.tmdb_id || rel.id}" class="card-quick-btn">DETAILS &rarr;</a>
                            </div>
                          </div>
                        </div>
                        <div class="card-caption">
                          <h3 class="card-title">${rel.title}</h3>
                          <div class="card-meta">
                            ${rel.release_year ? `<span>${rel.release_year}</span>` : ''}
                            ${rel.rating ? `<span>&bull; ★ ${typeof rel.rating === 'number' ? rel.rating.toFixed(1) : rel.rating}</span>` : ''}
                          </div>
                        </div>
                      </article>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

          </div>

        </div>
      `;

      // Attach watchlist toggle handler
      const watchlistBtn = container.querySelector('.js-details-watchlist-btn');
      if (watchlistBtn) {
        watchlistBtn.addEventListener('click', () => {
          const added = WatchlistService.toggleWatchlist(normMovie);
          const iconSpan = watchlistBtn.querySelector('.watchlist-status-icon');
          const textSpan = watchlistBtn.querySelector('.watchlist-status-text');
          if (iconSpan) iconSpan.textContent = added ? '✓' : '+';
          if (textSpan) textSpan.textContent = added ? 'IN WATCHLIST' : 'ADD TO WATCHLIST';
        });
      }

    } catch (e) {
      console.error('Error rendering details:', e);
      container.innerHTML = `
        <div class="online-error-state">
          <div class="error-eye-frame">
            <img src="/assets/maya/maya_eye.svg" alt="Error" width="60" height="35" style="opacity:0.4;">
          </div>
          <h2 class="error-title">COULD NOT LOAD MOVIE DETAILS</h2>
          <p class="error-desc">Unable to load this movie right now.</p>
          <a href="/browse" class="btn-retry-catalogue">&larr; BACK TO CATALOGUE</a>
        </div>
      `;
    }
  }
};
