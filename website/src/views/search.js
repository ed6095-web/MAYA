/**
 * MAYA Web — Search & Explore View (/search)
 * Instant debounced search by Title, Genre, Year, and Language with dynamic filters.
 */

import { CatalogueService } from '../services/catalogue.js';
import { WatchlistService } from '../services/storage.js';

export const SearchView = {
  containerId: 'search-view',
  debounceTimer: null,
  currentQuery: '',
  selectedGenre: '',
  selectedSort: 'rating:desc',

  async render({ router }) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    router.updateTitle('Search Cinema');

    container.innerHTML = `
      <div class="search-page-shell">
        
        <!-- Search Header -->
        <div class="search-header-panel">
          <div class="search-back-row">
            <a href="/browse" class="btn-back-nav">&larr; BACK TO BROWSE</a>
            <span class="search-brand-tag">[ GLOBAL SEARCH ]</span>
          </div>

          <h1 class="search-hero-title">SEARCH MAYA</h1>

          <!-- Debounced Search Input Bar -->
          <div class="search-input-frame">
            <svg class="search-input-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="search" 
              id="global-search-input" 
              class="global-search-input" 
              placeholder="Search by movie title, genre, year..." 
              autocomplete="off" 
              spellcheck="false"
              value="${this.currentQuery}"
              aria-label="Search movies">
            <button class="btn-clear-search" id="clear-search-btn" aria-label="Clear search input" hidden>&times;</button>
          </div>

          <!-- Genre Filter Pills -->
          <div class="search-filter-pills" id="genre-filter-pills">
            <button class="filter-pill ${this.selectedGenre === '' ? 'is-active' : ''}" data-genre="">ALL GENRES</button>
            <button class="filter-pill ${this.selectedGenre === 'Action' ? 'is-active' : ''}" data-genre="Action">ACTION</button>
            <button class="filter-pill ${this.selectedGenre === 'Thriller' ? 'is-active' : ''}" data-genre="Thriller">THRILLER</button>
            <button class="filter-pill ${this.selectedGenre === 'Drama' ? 'is-active' : ''}" data-genre="Drama">DRAMA</button>
            <button class="filter-pill ${this.selectedGenre === 'Animation' ? 'is-active' : ''}" data-genre="Animation">ANIME</button>
            <button class="filter-pill ${this.selectedGenre === 'Comedy' ? 'is-active' : ''}" data-genre="Comedy">COMEDY</button>
            <button class="filter-pill ${this.selectedGenre === 'Horror' ? 'is-active' : ''}" data-genre="Horror">HORROR</button>
          </div>

          <!-- Sort Select -->
          <div class="search-sort-bar">
            <span class="results-count-label" id="results-count-text">EXPLORING CATALOGUE</span>
            <div class="sort-selector-wrap">
              <span class="sort-label">SORT:</span>
              <select id="search-sort-select" class="search-sort-select" aria-label="Sort search results">
                <option value="rating:desc" ${this.selectedSort === 'rating:desc' ? 'selected' : ''}>Top Rated</option>
                <option value="updated_on:desc" ${this.selectedSort === 'updated_on:desc' ? 'selected' : ''}>Recently Updated</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Results Grid Container -->
        <div class="search-results-area" id="search-results-target">
          <div class="search-loading-spinner" aria-live="polite">
            <img src="/assets/maya/maya_eye.svg" alt="Loading" width="44" height="26" class="pulse-fast">
          </div>
        </div>

      </div>
    `;

    this._bindEvents(container, router);
    // Initial fetch
    this._executeSearch(container, router);
  },

  _bindEvents(container, router) {
    const input = container.querySelector('#global-search-input');
    const clearBtn = container.querySelector('#clear-search-btn');
    const genrePills = container.querySelectorAll('.filter-pill');
    const sortSelect = container.querySelector('#search-sort-select');

    if (input) {
      input.focus();
      input.addEventListener('input', () => {
        const val = input.value;
        this.currentQuery = val;
        clearBtn.hidden = !val;

        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this._executeSearch(container, router);
        }, 350);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        this.currentQuery = '';
        clearBtn.hidden = true;
        this._executeSearch(container, router);
      });
    }

    genrePills.forEach(pill => {
      pill.addEventListener('click', () => {
        genrePills.forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        this.selectedGenre = pill.getAttribute('data-genre') || '';
        this._executeSearch(container, router);
      });
    });

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.selectedSort = sortSelect.value;
        this._executeSearch(container, router);
      });
    }
  },

  async _executeSearch(container, router) {
    const target = container.querySelector('#search-results-target');
    const countText = container.querySelector('#results-count-text');
    if (!target) return;

    target.innerHTML = `
      <div class="search-loading-spinner">
        <img src="/assets/maya/maya_eye.svg" alt="Loading" width="44" height="26" class="pulse-fast">
      </div>
    `;

    try {
      const res = await CatalogueService.searchCatalogue(
        this.currentQuery,
        this.selectedGenre,
        this.selectedSort
      );

      const movies = res.movies || [];
      const totalCount = res.total_count || movies.length;

      if (countText) {
        if (this.currentQuery.trim()) {
          countText.textContent = `${totalCount} TITLES MATCHING "${this.currentQuery.toUpperCase()}"`;
        } else if (this.selectedGenre) {
          countText.textContent = `${totalCount} ${this.selectedGenre.toUpperCase()} TITLES`;
        } else {
          countText.textContent = `${totalCount} TOTAL TITLES AVAILABLE`;
        }
      }

      if (movies.length === 0) {
        target.innerHTML = `
          <div class="empty-shelf-view">
            <h2 class="empty-heading">NO MATCHES FOUND</h2>
            <p class="empty-sub">We couldn't find any cinema matching "${this.currentQuery}". Try another keyword or reset filters.</p>
          </div>
        `;
        return;
      }

      target.innerHTML = `
        <div class="catalogue-grid">
          ${movies.map(movie => this._renderResultCard(movie)).join('')}
        </div>
      `;

      // Attach click events to result cards
      const cards = target.querySelectorAll('.movie-card');
      cards.forEach(card => {
        card.addEventListener('click', () => {
          const movieId = card.getAttribute('data-movie-id');
          if (movieId) router.navigate(`/movie/${movieId}`);
        });
      });

    } catch (e) {
      console.warn('Search execution failed:', e);
      target.innerHTML = `
        <div class="online-error-state">
          <h2 class="error-title">SEARCH ERROR</h2>
          <p class="error-desc">Could not complete search query. Please try again.</p>
        </div>
      `;
    }
  },

  _renderResultCard(movie) {
    const movieId = movie.tmdb_id || movie.id;
    const posterUrl = movie.posterUrl || movie.poster || '/assets/maya/placeholder_poster.jpg';
    const rating = typeof movie.rating === 'number' ? movie.rating.toFixed(1) : (movie.rating || '');
    const year = movie.releaseYear || movie.release_year || '';

    return `
      <article class="movie-card" data-movie-id="${movieId}" tabindex="0">
        <div class="card-poster-frame">
          <img src="${posterUrl}" alt="MAYA poster for ${movie.title}" class="card-poster-img" loading="lazy" onerror="this.onerror=null;this.src='/assets/maya/placeholder_poster.jpg';">
          ${rating ? `<span class="card-rating-badge">★ ${rating}</span>` : ''}
          <div class="card-hover-overlay">
            <div class="overlay-bottom">
              <span class="card-quick-btn">VIEW &rarr;</span>
            </div>
          </div>
        </div>
        <div class="card-caption">
          <h3 class="card-title">${movie.title}</h3>
          <div class="card-meta">
            ${year ? `<span>${year}</span>` : ''}
            ${movie.rip ? `<span>&bull; ${movie.rip}</span>` : ''}
          </div>
        </div>
      </article>
    `;
  }
};
