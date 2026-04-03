require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { createRateLimiter } = require('./rate-limit');
const {
  getFavorites,
  setFavorites,
  createUser,
  getUserByUsername,
  getUserByEmail,
  getUserById,
  setUserVerified,
  createEmailVerificationToken,
  deleteEmailVerificationTokensForUser,
  getEmailVerificationToken,
  deleteEmailVerificationToken,
  deleteExpiredEmailVerificationTokens,
  createPasswordResetToken,
  deletePasswordResetTokensForUser,
  getPasswordResetToken,
  deletePasswordResetToken,
  deleteExpiredPasswordResetTokens,
  setUserPasswordHash
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://127.0.0.1:8080,http://localhost:8080')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: false
}));
app.use(express.json());

// Rate limiter (Redis-backed when REDIS_URL is set; otherwise in-memory).
let rateLimit = null;
createRateLimiter().then((limiter) => {
  rateLimit = limiter.rateLimit;
}).catch(() => {
  rateLimit = null;
});

function rateLimitOrBypass(options) {
  // Avoid recreating middleware per request; build once when ready.
  let built = null;
  return (req, res, next) => {
    if (!rateLimit) return next();
    if (!built) built = rateLimit(options);
    return built(req, res, next);
  };
}

function cleanupAuthTokenTables() {
  try {
    deleteExpiredEmailVerificationTokens();
    deleteExpiredPasswordResetTokens();
  } catch (_) {
    // best-effort cleanup
  }
}
setInterval(cleanupAuthTokenTables, 10 * 60 * 1000).unref?.();

function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET missing.' });

  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Missing authorization token.' });

  try {
    const payload = jwt.verify(match[1], secret);
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

let smtpTransporter = null;
function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) return null;

  smtpTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });
  return smtpTransporter;
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function isDevEchoMode() {
  return process.env.EMAIL_VERIFICATION_DEV_ECHO === 'true' || process.env.NODE_ENV === 'development';
}

async function sendTextEmail({ toEmail, subject, text }) {
  const emailFrom = process.env.EMAIL_FROM;
  const transporter = getSmtpTransporter();
  if (!transporter || !emailFrom) {
    if (!isDevEchoMode()) {
      throw new Error('SMTP is not configured.');
    }
    // Dev-mode: do not send, caller will echo token.
    return { sent: false };
  }

  await transporter.sendMail({
    from: emailFrom,
    to: toEmail,
    subject,
    text
  });

  return { sent: true };
}

async function sendVerificationEmail({ toEmail, username, verificationToken }) {
  const safeToken = String(verificationToken);
  return sendTextEmail({
    toEmail,
    subject: 'Verify your email for Movie Recommender',
    text: `Hi ${username},\n\nYour verification code is: ${safeToken}\n\nEnter this code in the app to verify your email.`
  });
}

async function sendPasswordResetEmail({ toEmail, username, resetToken }) {
  const safeToken = String(resetToken);
  return sendTextEmail({
    toEmail,
    subject: 'Reset your password for Movie Recommender',
    text: `Hi ${username},\n\nYour password reset code is: ${safeToken}\n\nEnter this code in the app to set a new password.\n\nIf you didn’t request this, you can ignore this email.`
  });
}

app.post(
  '/api/auth/register',
  rateLimitOrBypass({
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyFn: (req) => `register:${req.ip}`,
    message: 'Too many registration attempts. Please try again later.',
    prefix: 'auth'
  }),
  async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email, and password are required.' });
    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = normalizeEmail(email);
    const plainPassword = String(password || '');

    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3-30 chars (letters, numbers, underscore).' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (plainPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const passwordHash = await bcrypt.hash(plainPassword, 12);
    const user = createUser({ username: normalizedUsername, email: normalizedEmail, passwordHash });

    // Create email verification token (valid for 15 minutes)
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = sha256Hex(verificationToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Only one active token per user at a time.
    deleteEmailVerificationTokensForUser(user.id);
    createEmailVerificationToken({ userId: user.id, tokenHash, expiresAt });

    const sendResult = await sendVerificationEmail({
      toEmail: normalizedEmail,
      username: user.username,
      verificationToken
    });

    if (!sendResult.sent && isDevEchoMode()) {
      return res.json({ ok: true, verificationToken });
    }

    return res.json({ ok: true });
  } catch (err) {
    // SQLite unique constraint violations show up as constraint errors.
    if (String(err.message || '').toLowerCase().includes('unique')) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post(
  '/api/auth/request-password-reset',
  rateLimitOrBypass({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyFn: (req) => `pwreset_req:${req.ip}`,
    message: 'Too many password reset requests. Please try again later.',
    prefix: 'auth'
  }),
  async (req, res) => {
    try {
      const { email } = req.body || {};
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) return res.status(400).json({ error: 'email is required.' });
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }

      const user = getUserByEmail(normalizedEmail);

      // Always return ok to avoid email enumeration.
      if (!user) return res.json({ ok: true });

      // Create reset token (valid for 15 minutes)
      const resetToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = sha256Hex(resetToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      // Only one active reset token per user at a time.
      deletePasswordResetTokensForUser(user.id);
      createPasswordResetToken({ userId: user.id, tokenHash, expiresAt });

      const sendResult = await sendPasswordResetEmail({
        toEmail: normalizedEmail,
        username: user.username,
        resetToken
      });

      if (!sendResult.sent && isDevEchoMode()) {
        return res.json({ ok: true, resetToken });
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Could not request password reset.' });
    }
  }
);

app.post(
  '/api/auth/reset-password',
  rateLimitOrBypass({
    windowMs: 15 * 60 * 1000,
    max: 8,
    keyFn: (req) => `pwreset_do:${req.ip}`,
    message: 'Too many reset attempts. Please try again later.',
    prefix: 'auth'
  }),
  async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword are required.' });
    const plainPassword = String(newPassword || '');
    if (plainPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const tokenHash = sha256Hex(token);
    const row = getPasswordResetToken(tokenHash);
    if (!row) return res.status(400).json({ error: 'Invalid reset code.' });

    const expires = new Date(row.expires_at);
    if (!expires || Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
      deletePasswordResetToken(tokenHash);
      return res.status(400).json({ error: 'Reset code expired.' });
    }

    const passwordHash = await bcrypt.hash(plainPassword, 12);
    setUserPasswordHash(row.user_id, passwordHash);
    deletePasswordResetToken(tokenHash);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not reset password.' });
  }
});

app.post(
  '/api/auth/verify-email',
  rateLimitOrBypass({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyFn: (req) => `verify:${req.ip}`,
    message: 'Too many verification attempts. Please try again later.',
    prefix: 'auth'
  }),
  async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token is required.' });

    const tokenHash = sha256Hex(token);
    const row = getEmailVerificationToken(tokenHash);
    if (!row) return res.status(400).json({ error: 'Invalid verification code.' });

    const expires = new Date(row.expires_at);
    if (!expires || Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
      deleteEmailVerificationToken(tokenHash);
      return res.status(400).json({ error: 'Verification code expired.' });
    }

    setUserVerified(row.user_id);
    deleteEmailVerificationToken(tokenHash);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not verify email.' });
  }
});

app.post(
  '/api/auth/login',
  rateLimitOrBypass({
    windowMs: 60 * 1000,
    max: 12,
    keyFn: (req) => {
      const u = normalizeUsername(req.body?.username);
      return `login:${req.ip}:${u || 'unknown'}`;
    },
    message: 'Too many login attempts. Please wait a moment and try again.',
    prefix: 'auth'
  }),
  async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password are required.' });

    const user = getUserByUsername(normalizeUsername(username));
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

    if (!user.is_verified) return res.status(403).json({ error: 'Email not verified.' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET missing.' });
    const token = jwt.sign(
      { sub: user.id, username: user.username },
      secret,
      { expiresIn: '7d' }
    );

    return res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const user = getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: { id: user.id, username: user.username, email: user.email, is_verified: Boolean(user.is_verified) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load user.' });
  }
});

// Favorites: stored per-account on the backend
app.get('/api/favorites', requireAuth, (req, res) => {
  try {
    const list = getFavorites(String(req.user.id));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

app.put('/api/favorites', requireAuth, (req, res) => {
  try {
    const favorites = req.body?.favorites;
    if (!Array.isArray(favorites)) {
      return res.status(400).json({ error: 'favorites must be an array' });
    }
    setFavorites(String(req.user.id), favorites);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save favorites' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Favorites API running at http://localhost:${PORT}`);
});
