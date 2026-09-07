/**
 * MAYA Web — Playback Source & Streaming Service
 * Strict compliance with Rule 3:
 * - Only uses authorized, verified streaming sources.
 * - Never exposes raw third-party file-locker/telegram download links as streams.
 * - Provides clean playback source abstraction (quality, format, playbackUrl, source).
 */

import { CONFIG } from '../config.js';

export const PlaybackService = {
  /**
   * Resolves authorized playback sources for a given movie.
   * Returns an array of authorized playable source descriptors.
   */
  async getPlaybackSources(movie) {
    if (!movie) return [];

    const sources = [];
    const tmdbId = String(movie.tmdb_id || movie.id);

    // 1. Check if movie has local/backend authorized video stream in MAYA Backend
    if (movie.video_path && CONFIG.BACKEND_API_URL) {
      sources.push({
        source: 'maya_backend',
        quality: movie.resolution || 'Original HD',
        format: movie.video_path.endsWith('.m3u8') ? 'hls' : 'mp4',
        playbackUrl: `${CONFIG.BACKEND_API_URL}/api/movies/${movie.id}/stream`,
      });
    }

    // 2. Check if movie matches configured authorized streams or demo verification streams
    // (e.g. for verified test titles or local backend seed titles)
    if (CONFIG.AUTHORIZED_SOURCES?.demo && CONFIG.AUTHORIZED_SOURCES.demo.length > 0) {
      // If movie has an authorized tag or is an authorized demonstration title
      if (movie.is_authorized_stream || movie.tmdb_id === 1561687 || movie.id === 1 || movie.id === 2) {
        CONFIG.AUTHORIZED_SOURCES.demo.forEach(demoSource => {
          sources.push({
            source: demoSource.source || 'authorized_stream',
            quality: demoSource.quality || '1080p HD',
            format: demoSource.format || 'mp4',
            playbackUrl: demoSource.playbackUrl,
          });
        });
      }
    }

    // Note on Rule 3: Third-party bot download IDs (movie.telegram) are intentionally NOT
    // transformed into playback streams because they are unauthorized third-party file links.
    // If no authorized source exists, this returns empty array, and the UI cleanly displays
    // [ MORE INFO ] instead of a broken [ PLAY NOW ] button.

    return sources;
  },

  /**
   * Checks whether an authorized playable source exists for this movie.
   */
  async hasAuthorizedPlayback(movie) {
    const sources = await this.getPlaybackSources(movie);
    return sources.length > 0;
  },

  /**
   * Detects the playback format of a given stream URL
   */
  detectFormat(url) {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8')) return 'hls';
    if (lower.includes('.mpd')) return 'dash';
    if (lower.includes('.mp4')) return 'mp4';
    if (lower.includes('.webm')) return 'webm';
    if (lower.includes('.mkv')) return 'mkv';
    return 'mp4';
  }
};
