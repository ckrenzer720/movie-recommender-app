/**
 * Load/save user favorites via the backend API (Auth0 JWT + SQLite).
 * Used when user is signed in. Requires window.__API_URL__ and Auth with getAccessToken().
 */

const FavoritesAPI = {
  get baseUrl() {
    return (window.__API_URL__ || '').replace(/\/$/, '');
  },

  async request(path, options = {}) {
    if (!this.baseUrl || !window.Auth?.isSignedIn?.()) return null;
    const token = await window.Auth.getAccessToken();
    if (!token) return null;

    const headers = {
      ...(options.headers || {}),
      Authorization: 'Bearer ' + token
    };

    const res = await fetch(this.baseUrl + path, {
      ...options,
      headers
    });

    if (!res.ok) {
      throw new Error(res.statusText || `HTTP ${res.status}`);
    }
    return res;
  },

  async getFavorites() {
    try {
      const res = await this.request('/api/favorites');
      if (!res) return [];
      return await res.json().catch(() => []);
    } catch (err) {
      console.warn('Failed to load favorites from server', err);
      return [];
    }
  },

  async saveFavorites(favorites) {
    try {
      await this.request('/api/favorites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ favorites: Array.isArray(favorites) ? favorites : [] })
      });
    } catch (err) {
      console.warn('Failed to save favorites', err);
    }
  }
};
