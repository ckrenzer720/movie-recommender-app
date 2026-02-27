# Sign-in (Auth0) and favorites (SQLite backend)

Users sign in with Auth0 and their favorites are stored in SQLite on your backend.

## 1. Auth0 setup

1. Create a free account at [auth0.com](https://auth0.com) and a **Tenant**.
2. **Applications** → **Create Application** → **Single Page Application**.
3. Note your **Domain** and **Client ID**.
4. In the app settings:
   - **Allowed Callback URLs**: `http://localhost:5500`, `http://localhost:3000`, and your production URL (e.g. `https://your-app.com`).
   - **Allowed Logout URLs**: same as above.
   - **Allowed Web Origins**: same as above.
5. **APIs** → **Create API**:
   - Name: e.g. "Movie Recommender API"
   - Identifier: e.g. `https://movie-recommender-api` (this is your **Audience**).
   - Create. You don’t need to enable "Allow Offline Access" for this flow.

## 2. Backend (Node + SQLite)

1. In the project root:
   ```bash
   cd server
   npm install
   cp .env.example .env
   ```
2. Edit `server/.env`:
   ```
   PORT=3001
   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_AUDIENCE=https://movie-recommender-api
   DB_PATH=./data/favorites.db
   ```
3. Start the server:
   ```bash
   npm start
   ```
   The SQLite DB and `user_favorites` table are created automatically.

## 3. Frontend config

In `js/config.js` (copy from `js/config.example.js`):

```js
window.__AUTH0_DOMAIN__ = 'your-tenant.auth0.com';
window.__AUTH0_CLIENT_ID__ = 'your-client-id';
window.__AUTH0_AUDIENCE__ = 'https://movie-recommender-api';
window.__API_URL__ = 'http://localhost:3001';
```

Uncomment the config script in `index.html` if you use `config.js`.

## 4. Run the app

1. Start the backend: `cd server && npm start`
2. Serve the frontend: from the project root run `npm run dev` (or any static server). Use a URL that matches your Auth0 callback (e.g. `http://localhost:5500`).
3. Click **Sign in** → **Sign in with Auth0** → complete login. Favorites then sync to the backend (SQLite).

## Flow

- **Sign in**: Redirects to Auth0; after login, Auth0 redirects back and the app receives a token. Favorites are loaded from the backend.
- **Add/remove favorites** while signed in: Stored in SQLite via the backend API.
- **Sign out**: Uses Auth0 logout; the app falls back to local favorites (localStorage).
