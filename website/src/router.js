/**
 * MAYA Web — Client SPA Router (HTML5 History API)
 * Routes:
 * /               -> Landing Page
 * /browse         -> Online Catalogue & Explore
 * /movie/:id      -> Movie Details
 * /watch/:id      -> Cinematic Web Player
 * /search         -> Global Search & Filters
 * /genre/:genre   -> Genre-Filtered Catalogue
 * /watchlist      -> Saved Watchlist
 * /history        -> Continue Watching & History
 */

export class Router {
  constructor(routes = {}, onRouteChange = null) {
    this.routes = routes;
    this.onRouteChange = onRouteChange;
    this.currentRoute = null;
    this.currentParams = {};
    this.currentQuery = {};

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('popstate', () => {
      this.resolve();
    });

    // Intercept clicks on links that have internal route targets
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      // Don't intercept hash links like #about, #hero, external links, or downloads
      if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.startsWith('/downloads/')) {
        return;
      }

      // Check if it's an internal SPA route
      if (href.startsWith('/') || link.hasAttribute('data-route')) {
        e.preventDefault();
        this.navigate(href);
      }
    });
  }

  navigate(path, { replace = false } = {}) {
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    this.resolve();
  }

  resolve() {
    const rawPath = window.location.pathname;
    const searchStr = window.location.search;
    const query = Object.fromEntries(new URLSearchParams(searchStr).entries());

    // Match route patterns
    let matchedRoute = null;
    let params = {};

    for (const [pattern, handler] of Object.entries(this.routes)) {
      const paramNames = [];
      const regexPath = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });

      const regex = new RegExp(`^${regexPath}$`);
      const match = rawPath.match(regex);

      if (match) {
        matchedRoute = pattern;
        paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        break;
      }
    }

    // Default fallback
    if (!matchedRoute) {
      if (rawPath === '' || rawPath === '/') {
        matchedRoute = '/';
      } else {
        matchedRoute = '/browse';
      }
    }

    this.currentRoute = matchedRoute;
    this.currentParams = params;
    this.currentQuery = query;

    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (typeof this.onRouteChange === 'function') {
      this.onRouteChange({
        path: rawPath,
        route: matchedRoute,
        params,
        query,
      });
    }

    // Execute route handler if defined
    if (this.routes[matchedRoute]) {
      this.routes[matchedRoute]({ params, query, path: rawPath });
    }
  }

  updateTitle(title) {
    document.title = title ? `${title} — MAYA` : 'MAYA — Personal Movie Streaming & Universal Player';
  }
}
