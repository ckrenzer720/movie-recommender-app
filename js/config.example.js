/**
 * Copy this file to config.js and set your keys. config.js is gitignored.
 * If config.js is missing, the app still runs with empty defaults (no TMDB data, no sign-in).
 *
 * 1. TMDB: https://www.themoviedb.org/settings/api
 * 2. Auth0: create an application and API at https://auth0.com
 * 3. API_URL: your backend (e.g. http://localhost:3001 when running server)
 */

window.__TMDB_API_KEY__ = 'YOUR_TMDB_API_KEY';

// Auth0 (for sign-in and favorites sync)
window.__AUTH0_DOMAIN__ = 'your-tenant.auth0.com';
window.__AUTH0_CLIENT_ID__ = 'your-client-id';
window.__AUTH0_AUDIENCE__ = 'https://movie-recommender-api';  // Auth0 API identifier

// Backend (Node + SQLite) for favorites
window.__API_URL__ = 'http://localhost:3001';
