/**
 * MAYA Web — Local Storage & Persistence Service
 * Handles Watchlist and Continue Watching history with local storage and event bus.
 */

const WATCHLIST_KEY = 'maya_watchlist_v1';
const HISTORY_KEY = 'maya_playback_history_v1';

// Watchlist Service
export const WatchlistService = {
  getWatchlist() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(WATCHLIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  isInWatchlist(movieId) {
    const list = this.getWatchlist();
    const targetId = String(movieId);
    return list.some(m => String(m.tmdb_id || m.id) === targetId);
  },

  addToWatchlist(movie) {
    if (!movie) return;
    const list = this.getWatchlist();
    const id = String(movie.tmdb_id || movie.id);
    if (!list.some(m => String(m.tmdb_id || m.id) === id)) {
      list.unshift({
        id: movie.id || movie.tmdb_id,
        tmdb_id: movie.tmdb_id || movie.id,
        title: movie.title,
        poster: movie.poster,
        backdrop: movie.backdrop,
        rating: movie.rating,
        release_year: movie.release_year,
        genres: movie.genres || [],
        description: movie.description || '',
        added_at: Date.now(),
      });
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
        } catch (e) {
          console.warn('Storage quota exceeded', e);
        }
      }
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('maya:watchlist_updated', { detail: { movie, action: 'add' } }));
      }
    }
  },

  removeFromWatchlist(movieId) {
    let list = this.getWatchlist();
    const targetId = String(movieId);
    list = list.filter(m => String(m.tmdb_id || m.id) !== targetId);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
      } catch (e) {
        console.warn('Storage error', e);
      }
    }
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('maya:watchlist_updated', { detail: { movieId, action: 'remove' } }));
    }
  },

  toggleWatchlist(movie) {
    const id = movie.tmdb_id || movie.id;
    if (this.isInWatchlist(id)) {
      this.removeFromWatchlist(id);
      return false;
    } else {
      this.addToWatchlist(movie);
      return true;
    }
  }
};

// Playback & Watch History Service
export const HistoryService = {
  getHistoryMap() {
    try {
      if (typeof localStorage === 'undefined') return {};
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getProgress(movieId) {
    const map = this.getHistoryMap();
    return map[String(movieId)] || null;
  },

  saveProgress(movieId, currentTime, duration, movieData = null) {
    if (!movieId || !duration || duration <= 0) return;
    const map = this.getHistoryMap();
    const id = String(movieId);
    const percent = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));

    map[id] = {
      id: movieId,
      tmdb_id: movieData?.tmdb_id || movieId,
      title: movieData?.title || map[id]?.title || 'Movie',
      poster: movieData?.poster || map[id]?.poster || '',
      backdrop: movieData?.backdrop || map[id]?.backdrop || '',
      release_year: movieData?.release_year || map[id]?.release_year || '',
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      percent,
      lastWatched: Date.now(),
    };

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(map));
      } catch (e) {
        console.warn('Storage quota exceeded', e);
      }
    }
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('maya:history_updated', { detail: { movieId, progress: map[id] } }));
    }
  },

  getContinueWatching() {
    const map = this.getHistoryMap();
    return Object.values(map)
      .filter(item => item.percent >= 2 && item.percent <= 95)
      .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
  },

  clearProgress(movieId) {
    const map = this.getHistoryMap();
    delete map[String(movieId)];
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(map));
      } catch (e) {
        console.warn('Storage error', e);
      }
    }
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('maya:history_updated', { detail: { movieId, cleared: true } }));
    }
  }
};
