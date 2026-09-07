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

      // Update document title for SEO
      router.updateTitle(`${movie.title} (${movie.release_year || ''})`);

      // Check for authorized playback source
      const hasPlayback = await PlaybackService.hasAuthorizedPlayback(movie);
      const sources = await PlaybackService.getPlaybackSources(movie);
      const inWatchlist = WatchlistService.isInWatchlist(movieId);

      const backdropUrl = movie.backdrop || movie.poster;
      const posterUrl = movie.poster || movie.backdrop;
      const rating = typeof movie.rating === 'number' ? movie.rating.toFixed(1) : (movie.rating || '');
      const year = movie.release_year || '';
      const genres = Array.isArray(movie.genres) ? movie.genres : [];
      const languages = Array.isArray(movie.languages) ? movie.languages.join(', ').toUpperCase() : (movie.languages || '');
      const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '';

      container.innerHTML = `
        <div class="movie-details-page">
          
          <!-- Atmospheric Backdrop Header -->
          <div class="details-backdrop-container">
            <img src="${backdropUrl}" alt="${movie.title} backdrop" class="details-backdrop-img">
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
                  <img src="${posterUrl}" alt="MAYA official poster for ${movie.title}" class="details-poster-img">
                  <div class="poster-rim-glow"></div>
                </div>
              </div>

              <!-- Content Column -->
              <div class="details-info-col">
                <div class="details-tag-row">
                  <span class="details-badge-identity">MAYA CINEMA</span>
                  ${movie.rip ? `<span class="details-badge-quality">${movie.rip}</span>` : ''}
                </div>

                <h1 class="details-movie-title">${movie.title}</h1>

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
                  <p class="synopsis-text">${movie.description || 'No detailed synopsis available for this title.'}</p>
                </div>

                <!-- Playback & Source Availability Info -->
                <div class="playback-availability-card">
                  <div class="avail-header">
                    <span class="avail-indicator ${hasPlayback ? 'avail-live' : 'avail-pending'}"></span>
                    <span class="avail-title">
                      ${hasPlayback ? 'AUTHORIZED STREAM READY' : 'CATALOGUE METADATA ONLY'}
                    </span>
                  </div>
                  <p class="avail-note">
                    ${hasPlayback ? 
                      `Verified high-definition playback source available (${sources.map(s => s.quality).join(', ')}).` :
                      'Streaming source is pending licensing authorization. You can save this title to your watchlist to track updates.'
                    }
                  </p>
                </div>

                <!-- Action Buttons -->
                <div class="details-actions-row">
                  ${hasPlayback ? `
                    <a href="/watch/${movieId}" class="btn-details-play" aria-label="Play ${movie.title} in MAYA player">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      <span>PLAY NOW</span>
                    </a>
                  ` : ''}

                  <button class="btn-details-watchlist js-details-watchlist-btn" data-movie-id="${movieId}" aria-label="Toggle Watchlist">
                    <span class="watchlist-status-icon">${inWatchlist ? '✓' : '+'}</span>
                    <span class="watchlist-status-text">${inWatchlist ? 'IN WATCHLIST' : 'ADD TO WATCHLIST'}</span>
                  </button>

                  <a href="/browse" class="btn-details-browse" aria-label="Browse more titles">
                    <span>EXPLORE MORE</span>
                  </a>
                </div>

              </div>

            </div>
          </div>

        </div>
      `;

      // Attach watchlist toggle handler
      const watchlistBtn = container.querySelector('.js-details-watchlist-btn');
      if (watchlistBtn) {
        watchlistBtn.addEventListener('click', () => {
          const added = WatchlistService.toggleWatchlist(movie);
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
          <h2 class="error-title">COULD NOT LOAD MOVIE DETAILS</h2>
          <p class="error-desc">${e.message || 'An unexpected error occurred.'}</p>
          <a href="/browse" class="btn-retry-catalogue">&larr; BACK TO CATALOGUE</a>
        </div>
      `;
    }
  }
};
