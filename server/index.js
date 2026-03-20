require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const {
  getFavorites,
  setFavorites,
  createUser,
  getUserByUsername,
  getUserById,
  setUserVerified,
  createEmailVerificationToken,
  getEmailVerificationToken,
  deleteEmailVerificationToken
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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

async function sendVerificationEmail({ toEmail, username, verificationToken }) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM;

  const devEcho = process.env.EMAIL_VERIFICATION_DEV_ECHO === 'true' || process.env.NODE_ENV === 'development';
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !emailFrom) {
    if (!devEcho) {
      throw new Error('Email verification SMTP is not configured.');
    }
    // Dev-mode: do not send, caller will echo token.
    return { sent: false };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const safeToken = String(verificationToken);
  const subject = 'Verify your email for Movie Recommender';
  const text = `Hi ${username},\n\nYour verification code is: ${safeToken}\n\nEnter this code in the app to verify your email.`;

  await transporter.sendMail({
    from: emailFrom,
    to: toEmail,
    subject,
    text
  });

  return { sent: true };
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email, and password are required.' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const passwordHash = await bcrypt.hash(String(password), 12);
    const user = createUser({ username: String(username), email: String(email).toLowerCase(), passwordHash });

    // Create email verification token (valid for 15 minutes)
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = sha256Hex(verificationToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    createEmailVerificationToken({ userId: user.id, tokenHash, expiresAt });

    const sendResult = await sendVerificationEmail({
      toEmail: user.email || String(email).toLowerCase(),
      username: user.username,
      verificationToken
    });

    const devEcho = process.env.EMAIL_VERIFICATION_DEV_ECHO === 'true' || process.env.NODE_ENV === 'development';
    if (!sendResult.sent && devEcho) {
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

app.post('/api/auth/verify-email', async (req, res) => {
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password are required.' });

    const user = getUserByUsername(String(username));
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
