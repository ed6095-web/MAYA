/**
 * ============================================================================
 * MAYA OFFICIAL WEBSITE CONFIGURATION
 * ============================================================================
 * 
 * Central configuration for download URLs, file metadata, SHA-256 verification,
 * and image assets.
 */

export const CONFIG = {
  // ==========================================================================
  // 1. APPLICATION DOWNLOAD & INTEGRITY
  // ==========================================================================
  // Direct download URL for the MAYA APK.
  // Can be a local path like '/downloads/maya-release.apk' or an external CDN URL
  // like 'https://github.com/your-username/maya/releases/download/v1.0.0/maya.apk'
  APP_DOWNLOAD_URL: '/downloads/maya-release.apk',

  // Suggested download filename when saved on device
  DOWNLOAD_FILENAME: 'maya-v1.0.0.apk',

  // Actual calculated SHA-256 hash of the bundled maya-release.apk.
  // When you build a new release APK, compute its sha256 and update this value.
  // If no APK is ready yet, set this to null or empty string to display release pending.
  APK_SHA256: '6f83c948fe355b52eb0442ea704c695785026d2fda499de24380297fe320c114',

  // Application metadata
  APP_VERSION: 'v1.0.0',
  APP_BUILD_TYPE: 'Release APK',
  APP_FILE_SIZE: '25.0 MB',
  APP_REQUIREMENTS: 'Android 8.0 or higher',

  // ==========================================================================
  // 2. BRAND & HERO COPY
  // ==========================================================================
  BRAND_NAME: 'MAYA',
  HERO_TAGLINE: 'THE WAY YOU WATCH.',
  HERO_SUBTITLE: 'BIG. BOLD. CINEMATIC.',
  HERO_MICRO_COPY: 'Fast. Simple. Made for your screen.',

  // ==========================================================================
  // 3. IMAGE ASSETS
  // ==========================================================================
  IMAGE_ASSETS: {
    logoEye: '/assets/maya/maya_eye.svg',
    logoSplash: '/assets/maya/hero_splash.png',
    homeFeed: '/assets/maya/app_home.png',
    linkPlayer: '/assets/maya/app_link_player.png',
    watchlist: '/assets/maya/app_watchlist.png',
    cinemaPlayer: '/assets/maya/app_player_landscape.png',
  },

  // Optional preview video if an official screen-recording becomes available
  PREVIEW_VIDEO_URL: '',

  // ==========================================================================
  // 4. SOCIAL & COMMUNITY LINKS (Optional)
  // ==========================================================================
  OPTIONAL_SOCIAL_LINKS: {
    github: '',
    telegram: '',
    discord: '',
  },

  COPYRIGHT_YEAR: new Date().getFullYear(),
};
