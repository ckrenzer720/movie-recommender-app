const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'favorites.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

// Pragmas: small app, but these improve concurrency + safety/perf defaults.
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_favorites (
    user_id TEXT NOT NULL PRIMARY KEY,
    favorites TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    verified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at
  ON email_verification_tokens (expires_at);
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens (expires_at);
`);

function getFavorites(userId) {
  const row = db.prepare('SELECT favorites FROM user_favorites WHERE user_id = ?').get(userId);
  if (!row) return [];
  try {
    return JSON.parse(row.favorites);
  } catch {
    return [];
  }
}

function setFavorites(userId, favorites) {
  const json = JSON.stringify(Array.isArray(favorites) ? favorites : []);
  db.prepare(`
    INSERT INTO user_favorites (user_id, favorites, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET favorites = excluded.favorites, updated_at = excluded.updated_at
  `).run(userId, json);
}

function createUser({ username, email, passwordHash }) {
  const info = db.prepare(`
    INSERT INTO users (username, email, password_hash, is_verified)
    VALUES (?, ?, ?, 0)
  `).run(username, email, passwordHash);

  return { id: info.lastInsertRowid, username };
}

function getUserByUsername(username) {
  return db.prepare('SELECT id, username, email, password_hash, is_verified, verified_at FROM users WHERE username = ?').get(username) || null;
}

function getUserByEmail(email) {
  return db.prepare('SELECT id, username, email, password_hash, is_verified, verified_at FROM users WHERE email = ?').get(email) || null;
}

function getUserById(userId) {
  return db.prepare('SELECT id, username, email, is_verified, verified_at FROM users WHERE id = ?').get(userId) || null;
}

function setUserVerified(userId) {
  db.prepare(`
    UPDATE users
    SET is_verified = 1, verified_at = datetime('now')
    WHERE id = ?
  `).run(userId);
}

function createEmailVerificationToken({ userId, tokenHash, expiresAt }) {
  db.prepare(`
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, tokenHash, expiresAt);
}

function deleteEmailVerificationTokensForUser(userId) {
  db.prepare(`DELETE FROM email_verification_tokens WHERE user_id = ?`).run(userId);
}

function getEmailVerificationToken(tokenHash) {
  const row = db.prepare(`
    SELECT user_id, expires_at
    FROM email_verification_tokens
    WHERE token_hash = ?
  `).get(tokenHash);
  return row || null;
}

function deleteEmailVerificationToken(tokenHash) {
  db.prepare(`DELETE FROM email_verification_tokens WHERE token_hash = ?`).run(tokenHash);
}

function deleteExpiredEmailVerificationTokens() {
  // expires_at stored as ISO string; lexical compare works (YYYY-MM-DDTHH:mm:ss.sssZ)
  const nowIso = new Date().toISOString();
  return db.prepare(`DELETE FROM email_verification_tokens WHERE expires_at < ?`).run(nowIso).changes;
}

function createPasswordResetToken({ userId, tokenHash, expiresAt }) {
  db.prepare(`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, tokenHash, expiresAt);
}

function deletePasswordResetTokensForUser(userId) {
  db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).run(userId);
}

function getPasswordResetToken(tokenHash) {
  const row = db.prepare(`
    SELECT user_id, expires_at
    FROM password_reset_tokens
    WHERE token_hash = ?
  `).get(tokenHash);
  return row || null;
}

function deletePasswordResetToken(tokenHash) {
  db.prepare(`DELETE FROM password_reset_tokens WHERE token_hash = ?`).run(tokenHash);
}

function deleteExpiredPasswordResetTokens() {
  const nowIso = new Date().toISOString();
  return db.prepare(`DELETE FROM password_reset_tokens WHERE expires_at < ?`).run(nowIso).changes;
}

function setUserPasswordHash(userId, passwordHash) {
  db.prepare(`
    UPDATE users
    SET password_hash = ?
    WHERE id = ?
  `).run(passwordHash, userId);
}

module.exports = {
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
};
