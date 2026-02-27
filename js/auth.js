/**
 * Auth via Auth0. Sign in with redirect; favorites sync to backend (SQLite).
 * Requires window.__AUTH0_DOMAIN__, __AUTH0_CLIENT_ID__, __AUTH0_AUDIENCE__, __API_URL__ in config.
 */

import { createAuth0Client } from 'https://cdn.jsdelivr.net/npm/@auth0/auth0-spa-js@2.0.0/+esm';

let client = null;
let currentUser = null;
const listeners = [];

const Auth = {
  get isConfigured() {
    return !!(window.__AUTH0_DOMAIN__ && window.__AUTH0_CLIENT_ID__ && window.__API_URL__);
  },

  isSignedIn() {
    return !!currentUser;
  },

  get user() {
    return currentUser;
  },

  async getAccessToken() {
    if (!client || !currentUser) return null;
    try {
      return await client.getTokenSilently();
    } catch {
      return null;
    }
  },

  async init() {
    if (!this.isConfigured) {
      window.Auth = Auth;
      window.dispatchEvent(new Event('authready'));
      return null;
    }
    try {
      client = await createAuth0Client({
        domain: window.__AUTH0_DOMAIN__,
        client_id: window.__AUTH0_CLIENT_ID__,
        authorizationParams: {
          redirect_uri: window.location.origin + window.location.pathname.replace(/\/$/, '') || '/',
          audience: window.__AUTH0_AUDIENCE__ || undefined
        }
      });
      if (window.location.search.includes('code=') || window.location.search.includes('state=')) {
        await client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname || '/');
      }
      currentUser = await client.getUser();
    } catch (err) {
      console.warn('Auth init failed', err);
      currentUser = null;
    }
    window.Auth = Auth;
    window.dispatchEvent(new Event('authready'));
    Auth._notify();
    return currentUser;
  },

  onAuthChange(fn) {
    listeners.push(fn);
  },

  _notify() {
    listeners.forEach(f => f(currentUser));
  },

  async login() {
    if (!client) throw new Error('Auth not configured');
    await client.loginWithRedirect();
  },

  async logout() {
    if (client) {
      await client.logout({ logoutParams: { returnTo: window.location.origin } });
    }
    currentUser = null;
    client = null;
    this._notify();
  }
};

async function initAuth() {
  await Auth.init();
  if (Auth.isSignedIn()) {
    Auth._notify();
  }
}

initAuth();
