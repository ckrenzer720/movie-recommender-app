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
    this.signedInPanel = document.getElementById('auth-signed-in');
    this.signedInLabel = document.getElementById('auth-signed-in-label');
    this.signOutBtn = document.getElementById('auth-signout-btn');

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
    this.signupPasswordConfirm = document.getElementById('signup-password-confirm');
    this.signupStrengthHint = document.getElementById('signup-strength-hint');

    this.verifyCode = document.getElementById('verify-code');
    this.verifyResendBtn = document.getElementById('verify-resend-btn');
    this.forgotEmail = document.getElementById('forgot-email');
    this.resetCode = document.getElementById('reset-code');
    this.resetPassword = document.getElementById('reset-password');
    this.resetPasswordConfirm = document.getElementById('reset-password-confirm');
    this.resetStrengthHint = document.getElementById('reset-strength-hint');
    this.forgotPasswordBtn = document.getElementById('forgot-password-btn');

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.closeBtn.addEventListener('click', () => this.close());

    this.authBtn.addEventListener('click', () => {
      if (window.AuthClient?.user) {
        // Open modal so user can sign out explicitly.
        this.open('signin');
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

    this.verifyResendBtn?.addEventListener('click', () => {
      this.resendVerification();
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

    this.signOutBtn?.addEventListener('click', () => {
      window.AuthClient?.logout?.();
      this.close();
    });

    this.resetPassword?.addEventListener('input', () => this.updatePasswordStrengthHint());
    this.signupPassword?.addEventListener('input', () => this.updateSignupPasswordStrengthHint());

    if (window.AuthClient?.onAuthChange) {
      window.AuthClient.onAuthChange(() => {
        this.updateButton();
        this.updateSignedInPanel();
      });
    }
    this.updateButton();
    this.updateSignedInPanel();

    // Start focused on sign-in mode.
    this.setMode('signin');
  },

  updateButton() {
    if (!this.authBtn) return;
    if (window.AuthClient?.user) {
      const username = window.AuthClient.user.username || 'Account';
      this.authBtn.textContent = username;
      this.authBtn.setAttribute('aria-label', 'Account');
    } else {
      this.authBtn.textContent = 'Sign in';
      this.authBtn.setAttribute('aria-label', 'Sign in');
    }
  },

  updateSignedInPanel() {
    if (!this.signedInPanel) return;
    const user = window.AuthClient?.user;
    const isSignedIn = Boolean(user);
    this.signedInPanel.classList.toggle('hidden', !isSignedIn);
    this.tabSignin?.classList.toggle('hidden', isSignedIn);
    this.tabSignup?.classList.toggle('hidden', isSignedIn);

    if (isSignedIn && this.signedInLabel) {
      const username = user?.username || 'Account';
      this.signedInLabel.textContent = `Signed in as ${username}`;
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

    // If signed in, don't show auth forms.
    if (window.AuthClient?.user) {
      if (this.modeSignin) this.modeSignin.classList.add('hidden');
      if (this.modeSignup) this.modeSignup.classList.add('hidden');
      if (this.modeVerify) this.modeVerify.classList.add('hidden');
      if (this.modeForgot) this.modeForgot.classList.add('hidden');
      if (this.modeReset) this.modeReset.classList.add('hidden');
      return;
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
      const confirm = this.signupPasswordConfirm?.value;
      if (!username || !email || !password || !confirm) return this.showError('Enter username, email, and confirm your password.');
      if (String(password).length < 8) return this.showError('Password must be at least 8 characters.');
      if (password !== confirm) return this.showError('Passwords do not match.');

      const data = await window.AuthClient.register({ username, email, password });

      // If SMTP is not configured in dev, the server can echo the token.
      if (data?.verificationToken) {
        if (this.verifyCode) this.verifyCode.value = data.verificationToken;
      } else {
        if (this.verifyCode) this.verifyCode.value = '';
      }

      this.setMode('verify');
    } catch (err) {
      const msg = err.message || 'Could not create account.';
      if (msg.toLowerCase().includes('already exists')) {
        this.showError('That username/email already exists. Try signing in, or use “Forgot password?”.');
        this.setMode('signin');
        return;
      }
      this.showError(msg);
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
  },

  async resendVerification() {
    if (this.isPending) return;
    try {
      this.setPending(true);
      this.showError('');

      // We don't have the email in verify mode, so reuse whatever is in signup email field
      // (or ask user to go back to signup if empty).
      const email = this.signupEmail?.value?.trim();
      if (!email) return this.showError('Enter your email in Create account, then click Resend code.');

      const data = await window.AuthClient.resendVerification({ email });
      if (data?.verificationToken) {
        if (this.verifyCode) this.verifyCode.value = data.verificationToken;
      }

      this.showError('Verification code sent. Check your email.');
      setTimeout(() => this.showError(''), 2500);
    } catch (err) {
      this.showError(err.message || 'Could not resend code.');
    } finally {
      this.setPending(false);
    }
  },

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
      const confirm = this.resetPasswordConfirm?.value;
      if (!token || !newPassword || !confirm) return this.showError('Enter the reset code and confirm your new password.');
      if (newPassword.length < 8) return this.showError('Password must be at least 8 characters.');
      if (newPassword !== confirm) return this.showError('Passwords do not match.');

      await window.AuthClient.resetPassword({ token, newPassword });
      this.setMode('signin');
      this.showError('Password updated. You can sign in now.');
      setTimeout(() => this.showError(''), 2500);
    } catch (err) {
      this.showError(err.message || 'Could not reset password.');
    } finally {
      this.setPending(false);
    }
  },

  updatePasswordStrengthHint() {
    if (!this.resetStrengthHint || !this.resetPassword) return;
    const pwd = String(this.resetPassword.value || '');
    this.resetStrengthHint.textContent = this.getPasswordStrengthText(pwd);
  },

  updateSignupPasswordStrengthHint() {
    if (!this.signupStrengthHint || !this.signupPassword) return;
    const pwd = String(this.signupPassword.value || '');
    this.signupStrengthHint.textContent = this.getPasswordStrengthText(pwd);
  },

  getPasswordStrengthText(pwd) {
    if (!pwd) return 'Use 8+ characters. Tip: add numbers + symbols.';
    const hasLen = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNum = /[0-9]/.test(pwd);
    const hasSym = /[^A-Za-z0-9]/.test(pwd);

    const parts = ['8+ chars', 'uppercase', 'lowercase', 'number', 'symbol'];
    const score = [hasLen, hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length;
    const label = score >= 4 ? 'Strong' : score >= 3 ? 'Good' : 'Weak';
    return `Password strength: ${label} (${parts.join(', ')})`;
  }
};

// Expose for other UI modules (e.g., gating favorites behind auth).
window.AuthUI = AuthUI;

document.addEventListener('DOMContentLoaded', () => AuthUI.init());

