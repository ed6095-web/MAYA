# MAYA — Official Website & Direct Download Portal

The official landing page and direct APK download portal for **MAYA**, designed around its underground cinema aesthetic: pitch-black background, warm MAYA yellow branding, high-contrast white typography, blocky geometric display headings, subtle lavender accents, and high-visibility red direct download CTA.

---

## Quick Start

### 1. Run Locally in Development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Build for Production
```bash
npm run build
```
The optimized, zero-dependency static production build will be generated in `dist/`.

### 3. Preview Production Build
```bash
npm run preview
```

---

## Configuration (`src/config.js`)

All configurable values are located in a single file: `src/config.js`.

### Replacing the Direct Download Link:
To host your APK on GitHub Releases, Cloudflare R2, AWS S3, or any custom CDN:
```javascript
export const CONFIG = {
  // Update this to your external CDN or GitHub release asset link:
  APP_DOWNLOAD_URL: 'https://github.com/your-username/maya/releases/download/v1.0.0/maya.apk',
  
  DOWNLOAD_FILENAME: 'maya-v1.0.0.apk',
  APP_VERSION: 'v1.0.0',
  APP_FILE_SIZE: '25.0 MB',
  ...
};
```

---

## Project Structure

```
website/
├── index.html               # Main landing page markup
├── package.json             # Vite build dependencies & scripts
├── vite.config.js           # Vite configuration
├── README.md                # Documentation & deployment guide
├── public/
│   ├── favicon.svg          # MAYA Eye vector favicon
│   ├── downloads/
│   │   └── maya-release.apk # Bundled production APK (~25MB)
│   └── assets/maya/
│       ├── hero_splash.png          # Splash screen
│       ├── app_home.png             # Home & continue watching
│       ├── app_link_player.png      # Universal stream player
│       ├── app_watchlist.png        # My List watchlist
│       ├── app_player_landscape.png # 720p HD cinema player
│       ├── maya_eye.svg             # Sharp vector eye logo
│       └── maya_logo.jpg            # Original brand identity asset
└── src/
    ├── config.js            # Central configuration (download URLs, version)
    ├── main.js              # Micro-interactions, reveals, download wiring
    └── style.css            # Dark cinema design system & responsive layout
```

---

## Design System & Palette

- **Background**: `#000000`, `#050505`, `#0A0A0A`
- **Brand Primary**: MAYA Yellow `#F5C400` / `#FFD21A` (warm cinema gold)
- **Primary Text**: Pure White `#FFFFFF` / `#F5F5F5`
- **Secondary Text**: Muted Silver `#A1A1A1` / `#666666`
- **Lavender Accent**: `#B9A0FF` / `#A98BFF` (selective subtle gradient)
- **Direct Download CTA**: Strictly Red `#E50914` (hover `#F40612`)
- **Display Typography**: `Chakra Petch` & `Silkscreen` (geometric / blocky)
- **Body Typography**: `Inter`

---

## Deployment

Deploying the website takes seconds on any static host:

- **Vercel**: Set root directory to `website`, build command to `npm run build`, and output directory to `dist`.
- **Cloudflare Pages / Netlify**: Build command `npm run build`, output directory `dist`.
- **GitHub Pages**: Deploy contents of `dist/` branch.
