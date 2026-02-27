/**
 * Load/save user favorites via the backend API (Auth0 JWT + SQLite).
 * Used when user is signed in. Requires window.__API_URL__ and Auth with getAccessToken().
 */

const FavoritesAPI = {
  get baseUrl() {
    return (window.__API_URL__ || '').replace(/\/$/, '');
  },

  async getFavorites() {
    if (!this.baseUrl || !window.Auth?.isSignedIn?.()) return [];
    const token = await window.Auth.getAccessToken();
    if (!token) return [];
    try {
      const res = await fetch(this.baseUrl + '/api/favorites', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch (err) {
      console.warn('Failed to load favorites from server', err);
      return [];
    }
  },

  async saveFavorites(favorites) {
    if (!this.baseUrl || !window.Auth?.isSignedIn?.()) return;
    const token = await window.Auth.getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(this.baseUrl + '/api/favorites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ favorites: Array.isArray(favorites) ? favorites : [] })
      });
      if (!res.ok) throw new Error(res.statusText);
    } catch (err) {
      console.warn('Failed to save favorites', err);
    }
  }
};
