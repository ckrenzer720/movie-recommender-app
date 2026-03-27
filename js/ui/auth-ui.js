/**
 * Username/password auth UI (register + email verification + login).
 */

const AuthUI = {
  overlay: null,
  authBtn: null,
  closeBtn: null,
  errorEl: null,
  previousActiveElement: null,
  isPending: false,

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
    this.modeForgot = document.getElementById('auth-mode-forgot');
    this.modeReset = document.getElementById('auth-mode-reset');

    this.signinSubmit = document.getElementById('signin-submit');
    this.signupSubmit = document.getElementById('signup-submit');
    this.verifySubmit = document.getElementById('verify-submit');
    this.forgotSubmit = document.getElementById('forgot-submit');
    this.resetSubmit = document.getElementById('reset-submit');

    this.signinUsername = document.getElementById('signin-username');
    this.signinPassword = document.getElementById('signin-password');

    this.signupUsername = document.getElementById('signup-username');
    this.signupEmail = document.getElementById('signup-email');
    this.signupPassword = document.getElementById('signup-password');

    this.verifyCode = document.getElementById('verify-code');
    this.forgotEmail = document.getElementById('forgot-email');
    this.resetCode = document.getElementById('reset-code');
    this.resetPassword = document.getElementById('reset-password');
    this.forgotPasswordBtn = document.getElementById('forgot-password-btn');

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

    this.modeSignin?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.signin();
    });
    this.modeSignup?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.signup();
    });
    this.modeVerify?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.verifyEmail();
    });

    this.modeForgot?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.requestPasswordReset();
    });

    this.modeReset?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.resetPasswordSubmit();
    });

    this.forgotPasswordBtn?.addEventListener('click', () => {
      this.setMode('forgot');
      setTimeout(() => this.forgotEmail?.focus(), 0);
    });

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

  setPending(isPending) {
    this.isPending = Boolean(isPending);
    [this.signinSubmit, this.signupSubmit, this.verifySubmit, this.forgotSubmit, this.resetSubmit].forEach((btn) => {
      if (btn) btn.disabled = this.isPending;
    });
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
      else if (mode === 'forgot') this.forgotEmail?.focus();
      else if (mode === 'reset') this.resetCode?.focus();
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
        mode === 'verify' ? 'Verify email' :
        mode === 'forgot' ? 'Reset password' :
        'Set new password';
    }

    if (this.modeSignin) this.modeSignin.classList.toggle('hidden', mode !== 'signin');
    if (this.modeSignup) this.modeSignup.classList.toggle('hidden', mode !== 'signup');
    if (this.modeVerify) this.modeVerify.classList.toggle('hidden', mode !== 'verify');
    if (this.modeForgot) this.modeForgot.classList.toggle('hidden', mode !== 'forgot');
    if (this.modeReset) this.modeReset.classList.toggle('hidden', mode !== 'reset');

    // Hint handling
    const signupHint = document.getElementById('signup-hint');
    if (signupHint) signupHint.classList.toggle('hidden', mode !== 'signup');
  },

  async signin() {
    if (this.isPending) return;
    try {
      this.setPending(true);
      this.showError('');
      const username = this.signinUsername?.value?.trim();
      const password = this.signinPassword?.value;
      if (!username || !password) return this.showError('Enter username and password.');

      await window.AuthClient.login({ username, password });
      this.close();
    } catch (err) {
      this.showError(err.message || 'Sign in failed.');
    } finally {
      this.setPending(false);
    }
  },

  async signup() {
    if (this.isPending) return;
    try {
      this.setPending(true);
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
    } finally {
      this.setPending(false);
    }
  },

  async verifyEmail() {
    if (this.isPending) return;
    try {
      this.setPending(true);
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
    } finally {
      this.setPending(false);
    }
  }
  ,

  async requestPasswordReset() {
    if (this.isPending) return;
    try {
      this.setPending(true);
      this.showError('');
      const email = this.forgotEmail?.value?.trim();
      if (!email) return this.showError('Enter your email address.');

      const data = await window.AuthClient.requestPasswordReset({ email });
      if (data?.resetToken) {
        if (this.resetCode) this.resetCode.value = data.resetToken;
      } else {
        if (this.resetCode) this.resetCode.value = '';
      }
      this.setMode('reset');
    } catch (err) {
      this.showError(err.message || 'Could not request password reset.');
    } finally {
      this.setPending(false);
    }
  },

  async resetPasswordSubmit() {
    if (this.isPending) return;
    try {
      this.setPending(true);
      this.showError('');
      const token = this.resetCode?.value?.trim();
      const newPassword = this.resetPassword?.value;
      if (!token || !newPassword) return this.showError('Enter the reset code and a new password.');

      await window.AuthClient.resetPassword({ token, newPassword });
      this.setMode('signin');
      this.showError('Password updated. You can sign in now.');
      setTimeout(() => this.showError(''), 2500);
    } catch (err) {
      this.showError(err.message || 'Could not reset password.');
    } finally {
      this.setPending(false);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => AuthUI.init());

