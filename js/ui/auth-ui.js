/**
 * Username/password auth UI (register + email verification + login).
 */

const AuthUI = {
  overlay: null,
  authBtn: null,
  closeBtn: null,
  errorEl: null,
  previousActiveElement: null,

  mode: 'signin',

  init() {
    this.overlay = document.getElementById('auth-overlay');
    this.authBtn = document.getElementById('auth-btn');
    this.closeBtn = document.getElementById('auth-close');
    this.errorEl = document.getElementById('auth-error');
    if (!this.overlay || !this.authBtn || !this.closeBtn) return;

    this.tabSignin = document.getElementById('tab-signin');
    this.tabSignup = document.getElementById('tab-signup');

    this.modeSignin = document.getElementById('auth-mode-signin');
    this.modeSignup = document.getElementById('auth-mode-signup');
    this.modeVerify = document.getElementById('auth-mode-verify');

    this.signinSubmit = document.getElementById('signin-submit');
    this.signupSubmit = document.getElementById('signup-submit');
    this.verifySubmit = document.getElementById('verify-submit');

    this.signinUsername = document.getElementById('signin-username');
    this.signinPassword = document.getElementById('signin-password');

    this.signupUsername = document.getElementById('signup-username');
    this.signupEmail = document.getElementById('signup-email');
    this.signupPassword = document.getElementById('signup-password');

    this.verifyCode = document.getElementById('verify-code');

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.closeBtn.addEventListener('click', () => this.close());

    this.authBtn.addEventListener('click', () => {
      if (window.AuthClient?.user) {
        window.AuthClient.logout();
        return;
      }
      this.open('signin');
    });

    this.tabSignin?.addEventListener('click', () => this.setMode('signin'));
    this.tabSignup?.addEventListener('click', () => this.setMode('signup'));

    this.signinSubmit?.addEventListener('click', () => this.signin());
    this.signupSubmit?.addEventListener('click', () => this.signup());
    this.verifySubmit?.addEventListener('click', () => this.verifyEmail());

    if (window.AuthClient?.onAuthChange) {
      window.AuthClient.onAuthChange(() => this.updateButton());
    }
    this.updateButton();

    // Start focused on sign-in mode.
    this.setMode('signin');
  },

  updateButton() {
    if (!this.authBtn) return;
    if (window.AuthClient?.user) {
      const username = window.AuthClient.user.username || 'Account';
      this.authBtn.textContent = username;
      this.authBtn.setAttribute('aria-label', 'Sign out');
    } else {
      this.authBtn.textContent = 'Sign in';
      this.authBtn.setAttribute('aria-label', 'Sign in');
    }
  },

  showError(msg) {
    if (!this.errorEl) return;
    this.errorEl.textContent = msg;
    this.errorEl.classList.toggle('hidden', !msg);
  },

  open(mode = 'signin') {
    this.previousActiveElement = document.activeElement;
    this.overlay.classList.remove('hidden');
    this.authBtn.setAttribute('aria-expanded', 'true');
    this.showError('');
    this.setMode(mode);

    // Focus first input for accessibility.
    setTimeout(() => {
      if (mode === 'signin') this.signinUsername?.focus();
      else if (mode === 'signup') this.signupUsername?.focus();
      else if (mode === 'verify') this.verifyCode?.focus();
    }, 0);
  },

  close() {
    this.overlay.classList.add('hidden');
    this.authBtn.setAttribute('aria-expanded', 'false');
    this.showError('');

    const el = this.previousActiveElement;
    this.previousActiveElement = null;
    if (el && typeof el.focus === 'function') el.focus();
  },

  setMode(mode) {
    this.mode = mode;
    const title = document.getElementById('auth-title');
    if (title) {
      title.textContent =
        mode === 'signin' ? 'Sign in' :
        mode === 'signup' ? 'Create account' :
        'Verify email';
    }

    if (this.modeSignin) this.modeSignin.classList.toggle('hidden', mode !== 'signin');
    if (this.modeSignup) this.modeSignup.classList.toggle('hidden', mode !== 'signup');
    if (this.modeVerify) this.modeVerify.classList.toggle('hidden', mode !== 'verify');

    // Hint handling
    const signupHint = document.getElementById('signup-hint');
    if (signupHint) signupHint.classList.toggle('hidden', mode !== 'signup');
  },

  async signin() {
    try {
      this.showError('');
      const username = this.signinUsername?.value?.trim();
      const password = this.signinPassword?.value;
      if (!username || !password) return this.showError('Enter username and password.');

      await window.AuthClient.login({ username, password });
      this.close();
    } catch (err) {
      this.showError(err.message || 'Sign in failed.');
    }
  },

  async signup() {
    try {
      this.showError('');
      const username = this.signupUsername?.value?.trim();
      const email = this.signupEmail?.value?.trim();
      const password = this.signupPassword?.value;
      if (!username || !email || !password) return this.showError('Enter username, email, and password.');

      const data = await window.AuthClient.register({ username, email, password });

      // If SMTP is not configured in dev, the server can echo the token.
      if (data?.verificationToken) {
        if (this.verifyCode) this.verifyCode.value = data.verificationToken;
      } else {
        if (this.verifyCode) this.verifyCode.value = '';
      }

      this.setMode('verify');
    } catch (err) {
      this.showError(err.message || 'Could not create account.');
    }
  },

  async verifyEmail() {
    try {
      this.showError('');
      const token = this.verifyCode?.value?.trim();
      if (!token) return this.showError('Enter the verification code.');

      await window.AuthClient.verifyEmail({ token });
      this.setMode('signin');
      this.showError('Email verified. You can sign in now.');
      // Hide error after a moment so it's not styled like a failure.
      setTimeout(() => this.showError(''), 2500);
    } catch (err) {
      this.showError(err.message || 'Verification failed.');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => AuthUI.init());

