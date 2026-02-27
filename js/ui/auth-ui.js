/**
 * Auth0: Sign in (redirect) and Sign out. No email/password form — Auth0 Universal Login.
 */

const AuthUI = {
  overlay: null,
  authBtn: null,

  init() {
    this.overlay = document.getElementById('auth-overlay');
    this.authBtn = document.getElementById('auth-btn');
    if (!this.overlay || !this.authBtn) return;
    if (!window.Auth?.isConfigured) {
      this.authBtn.style.display = 'none';
      return;
    }

    document.getElementById('auth-close')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
    this.authBtn.addEventListener('click', () => {
      if (window.Auth?.isSignedIn?.()) {
        window.Auth.logout();
      } else {
        this.open();
      }
    });

    document.getElementById('auth-signin-btn')?.addEventListener('click', () => {
      window.Auth?.login();
    });

    if (window.Auth) {
      window.Auth.onAuthChange(() => this.updateButton());
      this.updateButton();
    }
  },

  open() {
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
