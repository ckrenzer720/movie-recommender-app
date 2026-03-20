/**
 * Simple auth client for username/password + email verification.
 * Uses backend endpoints:
 * - POST /api/auth/register
 * - POST /api/auth/verify-email
 * - POST /api/auth/login
 * - GET  /api/auth/me
 *
 * Stores JWT in localStorage.
 */

const AuthClient = {
  STORAGE_KEY: 'movie-recommender-auth-token',
  token: null,
  user: null,

  listeners: [],

  get apiBaseUrl() {
    return (window.__API_URL__ || '').replace(/\/$/, '');
  },

  onAuthChange(fn) {
    this.listeners.push(fn);
  },

  _notify() {
    this.listeners.forEach((fn) => {
      try { fn(this.user); } catch (_) {}
    });
    window.dispatchEvent(new CustomEvent('authchanged', { detail: { user: this.user } }));
  },

  loadTokenFromStorage() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) this.token = raw;
    return this.token;
  },

  async init() {
    this.loadTokenFromStorage();
    if (!this.token) {
      this.user = null;
      return null;
    }

    try {
      const me = await this.getMe();
      this.user = me;
      return me;
    } catch {
      this.logout();
      return null;
    }
  },

  async request(path, options = {}) {
    if (!this.apiBaseUrl) throw new Error('Missing __API_URL__ in js/config.js');
    const res = await fetch(this.apiBaseUrl + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      let message = 'Request failed';
      try {
        const data = await res.json();
        message = data.error || message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
    return res;
  },

  async getMe() {
    if (!this.token) throw new Error('Not signed in');
    const res = await fetch(this.apiBaseUrl + '/api/auth/me', {
      headers: { Authorization: 'Bearer ' + this.token }
    });
    if (!res.ok) {
      throw new Error('Could not load profile');
    }
    const data = await res.json();
    return data.user;
  },

  async register({ username, email, password }) {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    return res.json();
  },

  async verifyEmail({ token }) {
    const res = await this.request('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return res.json();
  },

  async login({ username, password }) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    this.token = data.token;
    localStorage.setItem(this.STORAGE_KEY, this.token);
    this.user = data.user;
    this._notify();

    return this.user;
  },

  logout() {
    this.token = null;
    this.user = null;
    try { localStorage.removeItem(this.STORAGE_KEY); } catch (_) {}
    this._notify();
  }
};

window.AuthClient = AuthClient;

