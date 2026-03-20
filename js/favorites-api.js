/**
 * Favorites API client (backend per-account storage).
 */

const FavoritesAPI = {
  get apiBaseUrl() {
    return (window.__API_URL__ || '').replace(/\/$/, '');
  },

  get token() {
    return window.AuthClient?.token || null;
  },

  _authHeaders() {
    if (!this.token) throw new Error('Not authenticated');
    return { Authorization: 'Bearer ' + this.token };
  },

  async getFavorites() {
    const res = await fetch(this.apiBaseUrl + '/api/favorites', {
      headers: this._authHeaders()
    });
    if (!res.ok) throw new Error('Could not load favorites');
    return await res.json();
  },

  async saveFavorites(favorites) {
    const res = await fetch(this.apiBaseUrl + '/api/favorites', {
      method: 'PUT',
      headers: {
        ...this._authHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ favorites: Array.isArray(favorites) ? favorites : [] })
    });
    if (!res.ok) throw new Error('Could not save favorites');
    return await res.json();
  }
};

window.FavoritesAPI = FavoritesAPI;

