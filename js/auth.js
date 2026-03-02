/**
 * Auth via Auth0. Sign in with redirect; favorites sync to backend (SQLite).
 * Requires window.__AUTH0_DOMAIN__, __AUTH0_CLIENT_ID__, __AUTH0_AUDIENCE__, __API_URL__ in config.
 */

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
    window.Auth = Auth;
    if (!this.isConfigured) {
      window.dispatchEvent(new Event('authready'));
      return null;
    }
    try {
      const { createAuth0Client } = await import('https://cdn.jsdelivr.net/npm/@auth0/auth0-spa-js@2.0.0/+esm');
      client = await createAuth0Client({
        domain: window.__AUTH0_DOMAIN__,
        client_id: window.__AUTH0_CLIENT_ID__,
        authorizationParams: {
          redirect_uri: window.location.origin + (window.location.pathname || '/').replace(/\/$/, '') || '/',
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
      client = null;
    }
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
    if (!this.isConfigured) throw new Error('Auth0 is not configured. Add AUTH0_DOMAIN, AUTH0_CLIENT_ID, and API_URL to config.js.');
    if (!client) throw new Error('Auth0 client not ready. Refresh the page or check the console for errors.');
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
  try {
    await Auth.init();
    if (Auth.isSignedIn()) {
      Auth._notify();
    }
  } catch (err) {
    console.error('Auth bootstrap failed', err);
    window.dispatchEvent(new Event('authready'));
  }
}

initAuth();
