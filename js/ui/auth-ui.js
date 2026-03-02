/**
 * Auth0: Sign in (redirect) and Sign out. No email/password form — Auth0 Universal Login.
 */

const AuthUI = {
  overlay: null,
  authBtn: null,
  errorEl: null,

  init() {
    this.overlay = document.getElementById('auth-overlay');
    this.authBtn = document.getElementById('auth-btn');
    if (!this.overlay || !this.authBtn) return;
    if (!window.Auth?.isConfigured) {
      this.authBtn.style.display = 'none';
      return;
    }

    this.errorEl = document.getElementById('auth-error');

    document.getElementById('auth-close')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
    this.authBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.Auth?.isSignedIn?.()) {
        window.Auth.logout();
      } else {
        this.startLogin();
      }
    });

    const signinBtn = document.getElementById('auth-signin-btn');
    if (signinBtn) {
      signinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.startLogin();
      });
    }

    if (window.Auth) {
      window.Auth.onAuthChange(() => this.updateButton());
      this.updateButton();
    }
  },

  async startLogin() {
    this.showError('');
    if (!window.Auth) {
      this.showError('Auth not loaded. Check the console.');
      return;
    }
    try {
      await window.Auth.login();
    } catch (err) {
      console.error('Login failed', err);
      this.showError(err.message || 'Sign-in failed. Check the console.');
    }
  },

  showError(msg) {
    if (!this.errorEl) return;
    this.errorEl.textContent = msg;
    this.errorEl.classList.toggle('hidden', !msg);
  },

  open() {
    this.showError('');
    this.overlay?.classList.remove('hidden');
    this.authBtn?.setAttribute('aria-expanded', 'true');
  },

  close() {
    this.overlay?.classList.add('hidden');
    this.authBtn?.setAttribute('aria-expanded', 'false');
  },

  updateButton() {
    if (!this.authBtn) return;
    if (window.Auth?.isSignedIn?.()) {
      const email = window.Auth.user?.email ?? window.Auth.user?.name ?? 'Account';
      this.authBtn.textContent = email;
      this.authBtn.setAttribute('aria-label', 'Signed in as ' + email + '. Click to sign out.');
      this.authBtn.dataset.signedIn = 'true';
    } else {
      this.authBtn.textContent = 'Sign in';
      this.authBtn.setAttribute('aria-label', 'Sign in');
      this.authBtn.dataset.signedIn = '';
    }
  }
};
