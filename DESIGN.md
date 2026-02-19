# Movie Recommender App — Design Document

## 1. Overview

A web application that provides **personalized movie recommendations** with a focus on trailers, ratings, genres, descriptions, and favorites. Users browse categories (new series, library, news, collections, favorites), watch trailers, and manage a favorites list within a clean, dark-themed UI.

---

## 2. Goals

- Let users **discover** movies via recommendations and categories.
- Surface **trailers**, **ratings**, **genres**, and **descriptions** for each title.
- Support **favorites** and easy re-access to saved titles.
- Offer an **intuitive, modern UI** with carousels and clear navigation.
- Keep the experience **focused** (dark theme, minimal clutter).

---

## 3. Core Features

| Feature | Description |
|--------|-------------|
| **Trailers** | Play movie trailers (embed or link) from detail view or cards. |
| **Ratings** | Show ratings (e.g. TMDB/IMDb-style) prominently on cards and detail. |
| **Genres & description** | Display genres and a short synopsis per movie. |
| **Favorites** | Mark movies as favorites; persist and list in a Favorites section. |
| **Categories** | Navigate: New series, Library, News, Collections, Favorites. |
| **Editor's choice** | Curated section for expert picks. |
| **Carousel browsing** | Horizontal carousels for recommendations and categories. |
| **Watch options** | Links/placeholders to “watch film” (streaming or external). |

---

## 4. Tech Stack (Recommended)

- **Frontend:** HTML5, CSS3, JavaScript (or a framework: e.g. React/Vue for components and state).
- **Styling:** CSS (custom) or a utility framework (e.g. Tailwind) for dark theme and layout.
- **Data:** Public movie API (e.g. TMDB) for metadata, posters, and trailer keys.
- **Optional:** Light backend (Node/Express) or serverless for favorites/auth if needed later.

*Exact choices (e.g. React vs vanilla JS) can be decided in the next phase.*

---

## 5. Project Layout & File Scaffold

```
movie-recommender-app/
├── index.html              # Entry point / home
├── README.md
├── DESIGN.md               # This document
│
├── css/
│   ├── reset.css           # Normalize / reset
│   ├── variables.css       # Colors, spacing, breakpoints (dark theme)
│   ├── layout.css          # Grid, sections, containers
│   ├── components.css      # Cards, buttons, carousel, nav
│   └── pages.css           # Page-specific styles
│
├── js/
│   ├── main.js             # App init, routing (if SPA-lite)
│   ├── api.js              # Movie API client (fetch)
│   ├── state.js             # Favorites, UI state (or use module)
│   ├── ui/
│   │   ├── carousel.js     # Carousel logic
│   │   ├── nav.js          # Top navigation
│   │   └── modal.js        # Trailer / detail modal
│   └── utils.js            # Helpers (format rating, date, etc.)
│
├── assets/
│   ├── images/             # Logos, placeholders, icons
│   └── fonts/              # Optional custom fonts
│
└── pages/                  # Optional: separate HTML pages per section
    ├── index.html          # Or keep single index + JS views
    ├── library.html
    ├── favorites.html
    └── ...
```

**Note:** If you later choose React/Vue, replace `js/` with `src/` and component folders (e.g. `src/components/`, `src/pages/`, `src/services/`) and a single `index.html` that mounts the app.

---

## 6. Dependencies (Proposed)

### 6.1 No-build (vanilla) option

- **None required** — vanilla HTML/CSS/JS.
- Optional: **YouTube IFrame API** or simple iframe embeds for trailers.

### 6.2 If using a package manager (e.g. npm) later

| Purpose | Suggestion |
|--------|------------|
| Movie data | Use **TMDB API** (no npm package required; `fetch` to `api.themoviedb.org`). |
| Icons | **Lucide** or **Heroicons** (or icon font). |
| Carousel | **Swiper** or **Embla Carousel** (or custom). |
| Fonts | **Google Fonts** (link in HTML) or self-hosted in `assets/fonts/`. |

### 6.3 If using React (future)

- `react`, `react-dom`
- `vite` or `create-react-app` (or Next.js) for tooling
- Optional: `react-router-dom`, state (Context or Zustand)

### 6.4 If using a backend for favorites/user data

- Node: `express`, optional DB driver (e.g. SQLite, PostgreSQL).
- Or: Firebase / Supabase for auth + persistence.

---

## 7. UI/UX Guidelines (from README)

- **Theme:** Dark background, high-contrast text for readability.
- **Navigation:** Top bar with: New series, Library, News, Collections, Favorites.
- **Content:** Large movie thumbnails; ratings and genres visible on cards.
- **Carousel:** Horizontal scroll/slider for recommendation rows.
- **Editor's choice:** Dedicated section with curated titles.
- **Minimal:** Clean layout, strategic whitespace, focus on content.

---

## 8. Data & APIs

- **Primary:** [The Movie Database (TMDB) API](https://www.themoviedb.org/documentation/api) — movies, posters, ratings, genres, and **trailer keys** (for YouTube).
- **Trailers:** YouTube embed using TMDB’s `videos` endpoint (e.g. `key` for `https://www.youtube.com/watch?v={key}`).
- **Fallback:** Consider OMDb as secondary if needed (different terms).

*You will need a free TMDB API key and store it securely (e.g. env variable, not in front-end if possible; for learning, front-end is acceptable with key restriction).*

---

## 9. Phases (High Level)

1. **Phase 1 — Setup & layout**  
   - Create repo structure, `index.html`, base CSS (variables, layout).  
   - Static nav and one sample carousel row.

2. **Phase 2 — Data & listing**  
   - Integrate TMDB (or mock data), render movie cards with poster, title, rating, genres.

3. **Phase 3 — Detail & trailers**  
   - Movie detail view/modal; embed trailer (YouTube).

4. **Phase 4 — Favorites & categories**  
   - Favorites (e.g. localStorage); wire nav to Library, Favorites, Editor’s choice.

5. **Phase 5 — Polish**  
   - Responsive design, accessibility, performance (lazy load, image sizes).

---

## 10. Out of Scope (for now)

- User accounts / authentication (can be added later).
- Actual streaming (only links to trailers and optionally external watch links).
- Backend persistence of favorites (localStorage is sufficient for v1).

---

*Document version: 1.0 — Next step: implement Phase 1 (scaffold and index.html).*
