require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { auth } = require('express-oauth2-jwt-bearer');
const { getFavorites, setFavorites } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
  console.warn('Missing AUTH0_DOMAIN or AUTH0_AUDIENCE. Favorites API will reject requests.');
}

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/favorites', checkJwt, (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const list = getFavorites(userId);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

app.put('/api/favorites', checkJwt, (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const favorites = req.body.favorites;
    if (!Array.isArray(favorites)) {
      return res.status(400).json({ error: 'favorites must be an array' });
    }
    setFavorites(userId, favorites);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save favorites' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Favorites API running at http://localhost:${PORT}`);
});
