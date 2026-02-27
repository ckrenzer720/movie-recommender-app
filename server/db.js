const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'favorites.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_favorites (
    user_id TEXT NOT NULL PRIMARY KEY,
    favorites TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now'))
  )
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

module.exports = { getFavorites, setFavorites };
