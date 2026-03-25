# Movie Recommender App — Design Document

## 1. Overview

A dark-themed, carousel-based movie discovery app. It pulls movie data from **TMDB** (posters, ratings, genres, details, trailers) and lets users **favorite** titles. Favorites work offline via **localStorage**, and (when signed in) sync to a **Node/Express + SQLite** backend using **JWT auth** with **email verification**.

---

## 2. Goals

- **Discovery-first UI**: fast browsing via carousels and simple sections.
- **Useful detail view**: overview + trailer embed when available (and clear fallbacks when not).
- **Favorites that persist**: local-first UX, optional account-based sync across devices.
- **Simple stack**: vanilla HTML/CSS/JS on the frontend; lightweight backend for auth + persistence.

---

## 3. Current Feature Set (Implemented)

| Area | What exists today |
|------|-------------------|
| **Sections / navigation** | SPA-lite views switched by hash + nav (`home`, `new-series`, `library`, `news`, `collections`, `favorites`, `search`). Responsive hamburger menu. |
| **Home** | Featured (popular), Editor’s choice (top rated), Recommendations (slice of popular). |
| **Library** | Genre rows (Action/Comedy/Drama/Horror/Sci‑Fi) via TMDB Discover. In-session caching to avoid refetching. |
| **Search** | Search input in nav with debounce; results render as cards. |
| **Cards** | Poster, title, rating, genre names (when genres cached). Favorite toggle (♡/♥). Lazy-loaded images. |
| **Details modal** | Loads TMDB detail (`append_to_response=videos`). Embeds YouTube trailer when TMDB provides a key; shows “no trailer” message + YouTube search fallback; includes “Open trailer on YouTube” link when available. |
| **Auth (backend)** | Register (username/email/password), email verification code, login returns JWT, `me` endpoint. |
| **Favorites sync (backend)** | Authenticated `GET/PUT /api/favorites` stored per-user in SQLite; frontend sync is debounced and non-blocking. |

---

## 4. Tech Stack (Actual)

### 4.1 Frontend

- **HTML/CSS/Vanilla JS** (no framework)
- Dev server: `live-server` (see root `package.json` scripts)

### 4.2 Movie data

- **TMDB v3 API** via `fetch` (`js/api.js`)
- Trailer handling: TMDB `videos` → **YouTube embed** / links

### 4.3 Backend (auth + favorites)

- **Node.js + Express** (`server/index.js`)
- **SQLite** via `better-sqlite3` (`server/db.js`)
- **JWT** (`jsonwebtoken`)
- Password hashing: **bcrypt**
- Email: **nodemailer** (SMTP) with a dev “echo token” mode when SMTP isn’t configured

---

## 5. Project Layout (Current)

```
movie-recommender-app/
├── index.html
├── README.md
├── DESIGN.md
├── css/
│   ├── reset.css
│   ├── variables.css
│   ├── layout.css
│   ├── components.css
│   └── pages.css
├── js/
│   ├── api.js
│   ├── auth-client.js
│   ├── config.js
│   ├── favorites-api.js
│   ├── main.js
│   ├── state.js
│   ├── utils.js
│   └── ui/
│       ├── auth-ui.js
│       ├── carousel.js
│       ├── modal.js
│       └── nav.js
└── server/
    ├── index.js
    ├── db.js
    ├── .env
    └── data/               # SQLite db files
```

---

## 6. Configuration Notes

### 6.1 TMDB API key (frontend)

- Set `window.__TMDB_API_KEY__` via `js/config.js`.

### 6.2 Backend environment (`server/.env`)

Key settings used by the backend include:

- `PORT` (default `3001`)
- `CORS_ORIGIN` (comma-separated allowed origins; e.g. `http://127.0.0.1:8080`)
- `JWT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- `EMAIL_VERIFICATION_DEV_ECHO` (dev convenience)

---

## 7. Phases & Status (Updated)

1. **Phase 1 — Setup & layout** (**done**)  
   Repo scaffold, dark theme, base layout, sections/views.

2. **Phase 2 — Data & listing** (**done**)  
   TMDB integration, movie cards, genres mapping, loading/error empty states.

3. **Phase 3 — Detail & trailers** (**done**)  
   Details modal with trailer embed + “no trailer” and YouTube fallback links.

4. **Phase 4 — Sections, favorites sync, and accounts** (**in progress / now active**)  
   - **Done**: Favorites (localStorage + backend sync when signed in)  
   - **Done**: Auth (register / verify-email / login / me)  
   - **Done**: New Series / News / Collections sections render real TMDB carousels  
   - **Next**: “Load more” pagination per carousel, richer “Collections” (e.g. TMDB collections endpoint), and better section copy/labels

5. **Phase 5 — Polish** (**next**)  
   Accessibility (focus management, ARIA audits), performance, better skeleton loading, and UI consistency.

---

## 8. APIs

### 8.1 TMDB (frontend)

- Popular: `/movie/popular`
- Top rated: `/movie/top_rated`
- Now playing: `/movie/now_playing`
- Upcoming: `/movie/upcoming`
- Search: `/search/movie`
- Details + videos: `/movie/{id}?append_to_response=videos`

### 8.2 App backend (server)

- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/favorites`
- `PUT /api/favorites`
- `GET /api/health`

---

## 9. Out of Scope (for now)

- Real streaming availability / providers (beyond trailers + external links)
- Social features (sharing, follows)
- Advanced personalization (ML-based recommendations)

---

*Document version: 2.0 — Updated to match the current implementation (frontend + backend).*
