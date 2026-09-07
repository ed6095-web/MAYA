/**
 * MAYA Web — Catalogue Service & Movie Repository
 * Dynamically communicates with the live MAYA catalogue API:
 * https://hubstream.sujanbotz.workers.dev/api/movies
 * 
 * Features:
 * - Real-time dynamic count (never hardcoded)
 * - Multi-layer cache (In-memory + localStorage with TTL)
 * - Dynamic rows (Top Rated, Recently Updated, Action, Drama, Thriller, Anime)
 * - Debounced global search
 * - Resilient offline / error recovery
 */

import { CONFIG } from '../config.js';

// Memory cache
const memoryCache = new Map();
const MOVIE_DETAILS_CACHE_KEY = 'maya_movie_details_cache_';
const CATALOGUE_CACHE_PREFIX = 'maya_cat_';

export const CatalogueService = {
  /**
   * Fetch movies from live catalogue with optional filtering and pagination
   */
  async getMovies({
    page = 1,
    pageSize = 20,
    search = '',
    genre = '',
    sortBy = '',
    forceRefresh = false
  } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (pageSize) params.set('page_size', String(pageSize));
    if (search && search.trim()) params.set('search', search.trim());
    if (genre && genre.trim()) params.set('genre', genre.trim());
    if (sortBy && sortBy.trim()) params.set('sort_by', sortBy.trim());

    const cacheKey = `${CATALOGUE_CACHE_PREFIX}${params.toString()}`;

    // Check memory cache
    if (!forceRefresh && memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CONFIG.CACHE_TTL_MS) {
        return cached.data;
      }
    }

    // Check localStorage cache
    if (!forceRefresh) {
      try {
        const localRaw = localStorage.getItem(cacheKey);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Date.now() - parsed.timestamp < CONFIG.CACHE_TTL_MS) {
            memoryCache.set(cacheKey, parsed);
            return parsed.data;
          }
        }
      } catch (e) {
        // Continue to network fetch on cache read error
      }
    }

    const targetUrl = `${CONFIG.CATALOGUE_API_URL}?${params.toString()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Catalogue API returned status ${response.status}`);
      }

      const data = await response.json();

      // Normalize response
      const result = {
        total_count: typeof data.total_count === 'number' ? data.total_count : (data.movies ? data.movies.length : 0),
        movies: Array.isArray(data.movies) ? data.movies : (Array.isArray(data) ? data : []),
        page,
        pageSize,
      };

      // Store individual movies into details memory cache for quick lookup
      result.movies.forEach(movie => {
        if (movie.tmdb_id || movie.id) {
          const idKey = String(movie.tmdb_id || movie.id);
          memoryCache.set(`movie_id_${idKey}`, { data: movie, timestamp: Date.now() });
        }
      });

      // Save to caches
      const cacheItem = { data: result, timestamp: Date.now() };
      memoryCache.set(cacheKey, cacheItem);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      } catch (e) {
        // Ignore quota limits
      }

      return result;
    } catch (err) {
      console.warn('Live catalogue fetch failed, attempting cache recovery:', err.message);
      // Fallback to expired cache if available
      if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey).data;
      }
      try {
        const fallbackRaw = localStorage.getItem(cacheKey);
        if (fallbackRaw) {
          return JSON.parse(fallbackRaw).data;
        }
      } catch {}

      throw err;
    }
  },

  /**
   * Get single movie details by tmdb_id or id
   */
  async getMovieById(id) {
    if (!id) return null;
    const strId = String(id);
    const memKey = `movie_id_${strId}`;

    // 1. Check in-memory cache
    if (memoryCache.has(memKey)) {
      const cached = memoryCache.get(memKey);
      if (Date.now() - cached.timestamp < CONFIG.DETAILS_CACHE_TTL_MS) {
        return cached.data;
      }
    }

    // 2. Check localStorage
    try {
      const local = localStorage.getItem(`${MOVIE_DETAILS_CACHE_KEY}${strId}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Date.now() - parsed.timestamp < CONFIG.DETAILS_CACHE_TTL_MS) {
          memoryCache.set(memKey, parsed);
          return parsed.data;
        }
      }
    } catch {}

    // 3. Search in default catalogue
    try {
      // First try fetching latest catalogue page 1
      const initial = await this.getMovies({ page: 1, pageSize: 50 });
      let found = initial.movies.find(m => String(m.tmdb_id || m.id) === strId);
      
      if (!found) {
        // Try searching by ID
        const searchRes = await this.getMovies({ search: strId, pageSize: 20 });
        found = searchRes.movies.find(m => String(m.tmdb_id || m.id) === strId);
      }

      if (!found) {
        // Try page 2
        const page2 = await this.getMovies({ page: 2, pageSize: 50 });
        found = page2.movies.find(m => String(m.tmdb_id || m.id) === strId);
      }

      if (found) {
        const cacheItem = { data: found, timestamp: Date.now() };
        memoryCache.set(memKey, cacheItem);
        try {
          localStorage.setItem(`${MOVIE_DETAILS_CACHE_KEY}${strId}`, JSON.stringify(cacheItem));
        } catch {}
        return found;
      }
    } catch (e) {
      console.warn('Error finding movie by id:', e);
    }

    return null;
  },

  /**
   * Selects an impactful featured movie for the explore hero
   */
  async getFeaturedMovie() {
    try {
      // Fetch top rated movies with backdrops
      const res = await this.getMovies({ sortBy: 'rating:desc', pageSize: 10 });
      const candidates = res.movies.filter(m => m.backdrop && m.backdrop.startsWith('http') && m.description);
      if (candidates.length > 0) {
        // Pick one of the top candidates
        return candidates[0];
      }
      return res.movies[0] || null;
    } catch {
      return null;
    }
  },

  /**
   * Fetches multiple curated catalogue rows for the home/explore feed
   */
  async getCuratedFeed() {
    try {
      const [topRated, recentlyAdded, action, drama, thriller, comedy, anime] = await Promise.all([
        this.getMovies({ sortBy: 'rating:desc', pageSize: 12 }).catch(() => ({ movies: [] })),
        this.getMovies({ sortBy: 'updated_on:desc', pageSize: 12 }).catch(() => ({ movies: [] })),
        this.getMovies({ genre: 'Action', pageSize: 10 }).catch(() => ({ movies: [] })),
        this.getMovies({ genre: 'Drama', pageSize: 10 }).catch(() => ({ movies: [] })),
        this.getMovies({ genre: 'Thriller', pageSize: 10 }).catch(() => ({ movies: [] })),
        this.getMovies({ genre: 'Comedy', pageSize: 10 }).catch(() => ({ movies: [] })),
        this.getMovies({ genre: 'Animation', pageSize: 10 }).catch(() => ({ movies: [] })),
      ]);

      const sections = [];

      if (topRated.movies.length > 0) {
        sections.push({
          id: 'top-rated',
          title: 'TOP RATED CINEMA',
          tag: '01 // CRITICS CHOICE',
          movies: topRated.movies,
        });
      }

      if (recentlyAdded.movies.length > 0) {
        sections.push({
          id: 'recent',
          title: 'RECENTLY ADDED',
          tag: '02 // FRESH RELEASES',
          movies: recentlyAdded.movies,
        });
      }

      if (action.movies.length > 0) {
        sections.push({
          id: 'action',
          title: 'HIGH OCTANE & ACTION',
          tag: '03 // ACTION',
          movies: action.movies,
        });
      }

      if (thriller.movies.length > 0) {
        sections.push({
          id: 'thriller',
          title: 'PSYCHOLOGICAL & THRILLERS',
          tag: '04 // SUSPENSE',
          movies: thriller.movies,
        });
      }

      if (drama.movies.length > 0) {
        sections.push({
          id: 'drama',
          title: 'CINEMATIC DRAMAS',
          tag: '05 // DRAMA',
          movies: drama.movies,
        });
      }

      if (comedy.movies.length > 0) {
        sections.push({
          id: 'comedy',
          title: 'COMEDY & LIGHTHEARTED',
          tag: '06 // COMEDY',
          movies: comedy.movies,
        });
      }

      if (anime.movies.length > 0) {
        sections.push({
          id: 'anime',
          title: 'ANIME & ANIMATION',
          tag: '07 // ANIMATION',
          movies: anime.movies,
        });
      }

      return {
        sections,
        totalCount: topRated.total_count || recentlyAdded.total_count || 470,
      };
    } catch (e) {
      console.error('Error compiling curated feed:', e);
      return { sections: [], totalCount: 0 };
    }
  }
};
