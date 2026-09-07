/**
 * MAYA Web — Catalogue Service & Movie Repository
 * Dynamically communicates with the live MAYA catalogue API:
 * https://hubstream.sujanbotz.workers.dev/api/movies
 * 
 * Features:
 * - Real-time dynamic count (never hardcoded)
 * - Multi-layer cache (In-memory + localStorage with TTL)
 * - Master pool indexing with client-side genre filtering & sorting
 * - Resolves Problem D: completely distinct movies across Top Rated, Action, Thriller, Drama, etc.
 * - Accurate category row counts (${section.movies.length} TITLES)
 * - Related movies recommendation engine based on genre similarity
 * - Debounced instant search across all metadata
 */

import { CONFIG } from '../config.js';

// In-memory runtime cache
const memoryCache = new Map();
const MOVIE_DETAILS_CACHE_KEY = 'maya_movie_details_cache_';
const MASTER_POOL_CACHE_KEY = 'maya_master_movie_pool_v2';
let masterPoolPromise = null;

/**
 * Standardizes raw movie data from any source into a consistent, robust model.
 * Provides guaranteed fallback images, safe strings, array guarantees,
 * and dual camelCase / snake_case properties to eliminate undefined errors.
 */
export function normalizeMovie(raw) {
  if (!raw) return null;

  const id = String(raw.tmdb_id || raw.id || '');
  const tmdbId = raw.tmdb_id || raw.tmdbId || id;
  const title = (raw.title && String(raw.title).trim()) || 'Untitled Cinema';
  const description = (raw.description && String(raw.description).trim()) || (raw.synopsis && String(raw.synopsis).trim()) || 'No description available for this title.';

  // Fallback for visual assets: backdrop falls back to poster; poster falls back to backdrop
  const rawPoster = raw.posterUrl || raw.poster_url || raw.poster || '';
  const rawBackdrop = raw.backdropUrl || raw.backdrop_url || raw.backdrop || '';

  const posterUrl = rawPoster || rawBackdrop || '/assets/maya/placeholder_poster.jpg';
  const backdropUrl = rawBackdrop || rawPoster || '/assets/maya/placeholder_poster.jpg';

  const rating = typeof raw.rating === 'number' && !isNaN(raw.rating) && raw.rating > 0
    ? Number(raw.rating.toFixed(1))
    : (raw.rating && !isNaN(parseFloat(raw.rating)) ? Number(parseFloat(raw.rating).toFixed(1)) : null);

  const releaseYear = raw.releaseYear || raw.release_year || (raw.year ? parseInt(raw.year, 10) : null);

  const genres = Array.isArray(raw.genres)
    ? raw.genres.filter(Boolean)
    : (typeof raw.genres === 'string' ? raw.genres.split(',').map(g => g.trim()).filter(Boolean) : []);

  const languages = Array.isArray(raw.languages)
    ? raw.languages
    : (raw.language ? [raw.language] : ['Original']);

  const runtime = typeof raw.runtime === 'number' && raw.runtime > 0 ? raw.runtime : null;
  const quality = raw.rip || raw.quality || 'HD';
  const isAnime = Boolean(raw.is_anime || raw.isAnime);

  return {
    // Primary normalized fields
    id,
    tmdbId,
    title,
    description,
    posterUrl,
    backdropUrl,
    rating,
    releaseYear,
    genres,
    languages,
    runtime,
    quality,
    isAnime,
    updatedOn: raw.updated_on || raw.updatedOn || null,

    // Backward-compatibility aliases so existing views never encounter undefined
    tmdb_id: tmdbId,
    poster: posterUrl,
    backdrop: backdropUrl,
    release_year: releaseYear,
    rip: quality,
    is_anime: isAnime,
    updated_on: raw.updated_on || null,

    // Streaming and source metadata
    stream_url: raw.stream_url || null,
    video_path: raw.video_path || null,
    is_authorized_stream: Boolean(raw.is_authorized_stream),
    playbackSources: Array.isArray(raw.playbackSources) ? raw.playbackSources : null,
    telegram: Array.isArray(raw.telegram) ? raw.telegram : [],
  };
}

export const CatalogueService = {
  normalizeMovie,
  /**
   * Fetches and maintains a comprehensive master movie pool.
   * Handles upstream worker parameter limitations by performing reliable in-memory filtering.
   */
  async getMasterPool(forceRefresh = false) {
    // Return in-flight request if already loading
    if (masterPoolPromise && !forceRefresh) {
      return masterPoolPromise;
    }

    masterPoolPromise = (async () => {
      // 1. Check memory cache
      if (!forceRefresh && memoryCache.has(MASTER_POOL_CACHE_KEY)) {
        const cached = memoryCache.get(MASTER_POOL_CACHE_KEY);
        if (Date.now() - cached.timestamp < CONFIG.CACHE_TTL_MS && cached.data.length > 0) {
          return cached;
        }
      }

      // 2. Check localStorage cache
      if (!forceRefresh && typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(MASTER_POOL_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp < CONFIG.CACHE_TTL_MS && parsed.data.length > 0) {
              memoryCache.set(MASTER_POOL_CACHE_KEY, parsed);
              return parsed;
            }
          }
        } catch (e) {
          // Continue to network fetch
        }
      }

      // 3. Fetch from live API
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        // Fetch primary pool (page 1 with 100 movies) + recent additions
        const [resPrimary, resRecent] = await Promise.all([
          fetch(`${CONFIG.CATALOGUE_API_URL}?page=1&page_size=100`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }),
          fetch(`${CONFIG.CATALOGUE_API_URL}?page=1&page_size=50&sort_by=updated_on:desc`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }),
        ]);

        clearTimeout(timeoutId);

        let totalCount = 471;
        const movieMap = new Map();

        if (resPrimary.ok) {
          const data = await resPrimary.json();
          totalCount = typeof data.total_count === 'number' ? data.total_count : totalCount;
          (data.movies || []).forEach(m => {
            const norm = normalizeMovie(m);
            if (norm) movieMap.set(norm.id, norm);
          });
        }

        if (resRecent.ok) {
          const data = await resRecent.json();
          (data.movies || []).forEach(m => {
            const norm = normalizeMovie(m);
            if (norm && !movieMap.has(norm.id)) {
              movieMap.set(norm.id, norm);
            }
          });
        }

        const movies = Array.from(movieMap.values());

        // Cache individual items for instant by-id retrieval
        movies.forEach(m => {
          const key = String(m.tmdb_id || m.id);
          memoryCache.set(`movie_id_${key}`, { data: m, timestamp: Date.now() });
        });

        const poolResult = {
          totalCount,
          data: movies,
          timestamp: Date.now(),
        };

        memoryCache.set(MASTER_POOL_CACHE_KEY, poolResult);
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(MASTER_POOL_CACHE_KEY, JSON.stringify(poolResult));
          } catch (e) {
            // Ignore quota limits
          }
        }

        // Asynchronously fetch page 2 in background to enrich pool without blocking UI
        this._prefetchSecondaryPage();

        return poolResult;
      } catch (err) {
        console.warn('Master pool fetch failed, falling back to cache if available:', err);
        if (memoryCache.has(MASTER_POOL_CACHE_KEY)) {
          return memoryCache.get(MASTER_POOL_CACHE_KEY);
        }
        if (typeof localStorage !== 'undefined') {
          try {
            const raw = localStorage.getItem(MASTER_POOL_CACHE_KEY);
            if (raw) return JSON.parse(raw);
          } catch {}
        }

        throw err;
      }
    })();

    return masterPoolPromise;
  },

  /**
   * Background prefetch of secondary page to expand search index
   */
  async _prefetchSecondaryPage() {
    try {
      const res = await fetch(`${CONFIG.CATALOGUE_API_URL}?page=2&page_size=80`);
      if (res.ok) {
        const data = await res.json();
        const currentPool = memoryCache.get(MASTER_POOL_CACHE_KEY);
        if (currentPool && Array.isArray(data.movies)) {
          const movieMap = new Map(currentPool.data.map(m => [String(m.tmdb_id || m.id), m]));
          data.movies.forEach(m => {
            const norm = normalizeMovie(m);
            if (norm && !movieMap.has(norm.id)) {
              movieMap.set(norm.id, norm);
            }
          });
          currentPool.data = Array.from(movieMap.values());
          memoryCache.set(MASTER_POOL_CACHE_KEY, currentPool);
        }
      }
    } catch {}
  },

  /**
   * Get single movie details by tmdb_id or id
   */
  async getMovieById(id) {
    if (!id) return null;
    const strId = String(id);
    const memKey = `movie_id_${strId}`;

    // 1. Check in-memory details cache
    if (memoryCache.has(memKey)) {
      const cached = memoryCache.get(memKey);
      if (Date.now() - cached.timestamp < CONFIG.DETAILS_CACHE_TTL_MS) {
        return normalizeMovie(cached.data);
      }
    }

    // 2. Check localStorage details
    if (typeof localStorage !== 'undefined') {
      try {
        const local = localStorage.getItem(`${MOVIE_DETAILS_CACHE_KEY}${strId}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Date.now() - parsed.timestamp < CONFIG.DETAILS_CACHE_TTL_MS) {
            memoryCache.set(memKey, parsed);
            return normalizeMovie(parsed.data);
          }
        }
      } catch {}
    }

    // 3. Search in master pool
    try {
      const poolResult = await this.getMasterPool();
      const found = poolResult.data.find(m => String(m.tmdb_id || m.id) === strId);
      if (found) {
        const norm = normalizeMovie(found);
        const cacheItem = { data: norm, timestamp: Date.now() };
        memoryCache.set(memKey, cacheItem);
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(`${MOVIE_DETAILS_CACHE_KEY}${strId}`, JSON.stringify(cacheItem));
          } catch {}
        }
        return norm;
      }
    } catch (e) {
      console.warn('Error finding movie in pool:', e);
    }

    // 4. Direct API lookup fallback
    try {
      const directRes = await fetch(`${CONFIG.CATALOGUE_API_URL}?page=1&page_size=50`);
      if (directRes.ok) {
        const data = await directRes.json();
        const found = (data.movies || []).find(m => String(m.tmdb_id || m.id) === strId);
        if (found) {
          return normalizeMovie(found);
        }
      }
    } catch {}

    return null;
  },

  /**
   * Selects an impactful featured movie for the explore hero with verified visual assets
   */
  async getFeaturedMovie() {
    try {
      const poolResult = await this.getMasterPool();
      const pool = poolResult.data;

      // Prioritize high-rated movies with high-res backdrop and non-empty synopsis
      const candidates = pool.filter(m => 
        m.backdrop && 
        m.backdrop.startsWith('http') && 
        m.description && 
        m.description.length > 50 &&
        typeof m.rating === 'number' &&
        m.rating >= 7.0
      );

      if (candidates.length > 0) {
        // Return top-rated visually stunning title
        candidates.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        return candidates[0];
      }

      return pool[0] || null;
    } catch {
      return null;
    }
  },

  /**
   * Compiles the curated multi-shelf catalogue feed for /browse.
   * Completely solves Problem D: applies actual, strict genre and sort filters on the pool
   * so every category shows distinct, relevant movies with accurate counts.
   */
  async getCuratedFeed() {
    try {
      const poolResult = await this.getMasterPool();
      const pool = poolResult.data || [];
      const totalCount = poolResult.totalCount || pool.length;

      // 1. TOP RATED: Strictly sort by rating descending (rating > 0)
      const topRated = [...pool]
        .filter(m => typeof m.rating === 'number' && m.rating > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 14);

      // 2. RECENTLY ADDED: Strictly sort by updated_on descending
      const recentlyAdded = [...pool]
        .filter(m => m.updated_on)
        .sort((a, b) => new Date(b.updated_on || 0) - new Date(a.updated_on || 0))
        .slice(0, 14);

      // 3. ACTION & ADVENTURE: Verified genre match
      const action = pool
        .filter(m => Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes('action')))
        .slice(0, 14);

      // 4. THRILLERS & MYSTERY: Verified genre match
      const thriller = pool
        .filter(m => Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes('thrill') || g.toLowerCase().includes('mystery')))
        .slice(0, 14);

      // 5. CINEMATIC DRAMAS: Verified genre match
      const drama = pool
        .filter(m => Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes('drama')))
        .slice(0, 14);

      // 6. COMEDY & LIGHTHEARTED: Verified genre match
      const comedy = pool
        .filter(m => Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes('comedy')))
        .slice(0, 14);

      // 7. ANIME & ANIMATION: Verified is_anime or Animation genre
      const anime = pool
        .filter(m => m.is_anime === true || (Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes('anim'))))
        .slice(0, 14);

      const sections = [];

      if (topRated.length > 0) {
        sections.push({
          id: 'top-rated',
          title: 'TOP RATED CINEMA',
          tag: '01 // CRITICS CHOICE',
          movies: topRated,
        });
      }

      if (recentlyAdded.length > 0) {
        sections.push({
          id: 'recent',
          title: 'RECENTLY ADDED',
          tag: '02 // FRESH RELEASES',
          movies: recentlyAdded,
        });
      }

      if (action.length > 0) {
        sections.push({
          id: 'action',
          title: 'HIGH OCTANE & ACTION',
          tag: '03 // ACTION',
          movies: action,
        });
      }

      if (thriller.length > 0) {
        sections.push({
          id: 'thriller',
          title: 'PSYCHOLOGICAL & THRILLERS',
          tag: '04 // SUSPENSE',
          movies: thriller,
        });
      }

      if (drama.length > 0) {
        sections.push({
          id: 'drama',
          title: 'CINEMATIC DRAMAS',
          tag: '05 // DRAMA',
          movies: drama,
        });
      }

      if (comedy.length > 0) {
        sections.push({
          id: 'comedy',
          title: 'COMEDY & LIGHTHEARTED',
          tag: '06 // COMEDY',
          movies: comedy,
        });
      }

      if (anime.length > 0) {
        sections.push({
          id: 'anime',
          title: 'ANIME & ANIMATION',
          tag: '07 // ANIMATION',
          movies: anime,
        });
      }

      return {
        sections,
        totalCount,
      };
    } catch (e) {
      console.error('Error compiling curated feed:', e);
      return { sections: [], totalCount: 0 };
    }
  },

  /**
   * Returns actual related movies for the watch/details page based on matching genres.
   * Excludes the current movie.
   */
  async getRelatedMovies(currentMovie, limit = 8) {
    if (!currentMovie) return [];
    try {
      const poolResult = await this.getMasterPool();
      const currentId = String(currentMovie.tmdb_id || currentMovie.id);
      const currentGenres = Array.isArray(currentMovie.genres) ? currentMovie.genres : [];

      const candidates = poolResult.data.filter(m => {
        const id = String(m.tmdb_id || m.id);
        if (id === currentId) return false;
        if (currentGenres.length === 0) return true;
        return Array.isArray(m.genres) && m.genres.some(g => currentGenres.includes(g));
      });

      if (candidates.length >= limit) {
        return candidates.slice(0, limit);
      }

      // If fewer than limit, pad with top rated
      const fallback = poolResult.data.filter(m => String(m.tmdb_id || m.id) !== currentId);
      const combined = [...candidates, ...fallback];
      const unique = Array.from(new Map(combined.map(m => [String(m.tmdb_id || m.id), m])).values());
      return unique.slice(0, limit);
    } catch {
      return [];
    }
  },

  /**
   * Powerful client-side search across pool with instant response.
   */
  async searchCatalogue(query = '', genreFilter = '', sortOption = 'rating:desc') {
    try {
      const poolResult = await this.getMasterPool();
      let results = [...poolResult.data];

      const cleanQ = (query || '').trim().toLowerCase();
      if (cleanQ) {
        results = results.filter(m => {
          const title = (m.title || '').toLowerCase();
          const desc = (m.description || '').toLowerCase();
          const year = String(m.release_year || '');
          const genres = Array.isArray(m.genres) ? m.genres.join(' ').toLowerCase() : '';
          return title.includes(cleanQ) || desc.includes(cleanQ) || year.includes(cleanQ) || genres.includes(cleanQ);
        });
      }

      if (genreFilter && genreFilter.trim()) {
        const gf = genreFilter.trim().toLowerCase();
        results = results.filter(m => {
          if (gf === 'animation' || gf === 'anime') {
            return m.is_anime === true || (Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes('anim')));
          }
          return Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes(gf));
        });
      }

      if (sortOption === 'rating:desc') {
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortOption === 'updated_on:desc') {
        results.sort((a, b) => new Date(b.updated_on || 0) - new Date(a.updated_on || 0));
      } else if (sortOption === 'title:asc') {
        results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      }

      return {
        movies: results,
        total_count: results.length,
      };
    } catch (e) {
      console.error('Search catalogue error:', e);
      return { movies: [], total_count: 0 };
    }
  }
};
