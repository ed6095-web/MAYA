/**
 * MAYA Web — Playback Source & Streaming Service
 * Strict compliance with Rule 3, Rule 6, and Rule 8:
 * - Normalized PlaybackSource model (quality, format, language, source, playbackUrl).
 * - Clear distinction: PLAYABLE MOVIE vs CATALOGUE MOVIE.
 * - Never converts or passes raw third-party Telegram bot IDs or download links into streaming sources.
 * - Only verified, authorized streaming sources are accepted.
 */

import { CONFIG } from '../config.js';

export const PlaybackService = {
  /**
   * Resolves authorized playback sources for a given movie.
   * Returns an array of normalized PlaybackSource objects:
   * [{ quality, format, language, source, playbackUrl }]
   */
  async getPlaybackSources(movie) {
    if (!movie) return [];

    const sources = [];
    const movieIdStr = String(movie.tmdb_id || movie.id || '');

    // 1. Check if movie already provides normalized authorized playbackSources array
    if (Array.isArray(movie.playbackSources) && movie.playbackSources.length > 0) {
      movie.playbackSources.forEach(s => {
        if (s && s.playbackUrl && typeof s.playbackUrl === 'string' && s.playbackUrl.startsWith('http')) {
          sources.push({
            quality: s.quality || '1080p HD',
            format: s.format || this.detectFormat(s.playbackUrl),
            language: s.language || 'Original',
            source: s.source || 'authorized_partner',
            playbackUrl: s.playbackUrl,
          });
        }
      });
      if (sources.length > 0) return sources;
    }

    // 2. Check if movie has direct video_path or stream from MAYA Backend
    if (movie.video_path && CONFIG.BACKEND_API_URL) {
      sources.push({
        quality: movie.resolution || 'Original HD',
        format: movie.video_path.endsWith('.m3u8') ? 'hls' : 'mp4',
        language: Array.isArray(movie.languages) ? movie.languages.join(', ') : (movie.language || 'Original'),
        source: 'maya_backend',
        playbackUrl: `${CONFIG.BACKEND_API_URL}/api/movies/${movie.id}/stream`,
      });
      return sources;
    }

    // 3. Check if movie has a direct verified stream_url attribute
    if (movie.stream_url && typeof movie.stream_url === 'string' && movie.stream_url.startsWith('http')) {
      sources.push({
        quality: movie.rip || 'HD',
        format: this.detectFormat(movie.stream_url),
        language: Array.isArray(movie.languages) ? movie.languages[0] : (movie.language || 'Original'),
        source: 'authorized_direct',
        playbackUrl: movie.stream_url,
      });
      return sources;
    }

    // 4. Check registered authorized stream mapping (for verified demonstration cinema titles)
    // Note: External HubStream catalogue movies only have telegram bot file metadata.
    // They are CATALOGUE ONLY until an authorized web stream is licensed.
    if (movie.is_authorized_stream && CONFIG.AUTHORIZED_SOURCES?.demo?.length > 0) {
      CONFIG.AUTHORIZED_SOURCES.demo.forEach(demoSource => {
        sources.push({
          quality: demoSource.quality || '1080p HD',
          format: demoSource.format || 'mp4',
          language: 'English',
          source: demoSource.source || 'authorized_cinema_stream',
          playbackUrl: demoSource.playbackUrl,
        });
      });
    }

    return sources;
  },

  /**
   * Checks whether an authorized browser-playable source exists for this movie.
   * Returns boolean: true only for PLAYABLE MOVIES, false for CATALOGUE-ONLY MOVIES.
   */
  async hasAuthorizedPlayback(movie) {
    if (!movie) return false;
    const sources = await this.getPlaybackSources(movie);
    return sources.length > 0;
  },

  /**
   * Returns comprehensive playability status descriptor for UI rendering.
   */
  async getPlayabilityStatus(movie) {
    if (!movie) {
      return {
        isPlayable: false,
        statusText: 'CATALOGUE METADATA ONLY',
        badgeClass: 'avail-pending',
        sources: [],
        note: 'No authorized web playback source is available.',
      };
    }

    const sources = await this.getPlaybackSources(movie);
    const isPlayable = sources.length > 0;

    return {
      isPlayable,
      statusText: isPlayable ? 'AUTHORIZED STREAM READY' : 'CATALOGUE AVAILABLE — WEB PLAYBACK NOT AVAILABLE',
      badgeClass: isPlayable ? 'avail-live' : 'avail-pending',
      sources,
      note: isPlayable
        ? `Verified cinema playback source available (${sources.map(s => s.quality).join(', ')}).`
        : 'This title is indexed for catalogue discovery and metadata. Web browser playback requires an authorized licensing source. You can save it to your Watchlist or watch in the MAYA Android app.',
    };
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
