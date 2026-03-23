/**
 * App state: favorites (as movie objects), current section.
 * Persists favorites to localStorage (design: "localStorage is sufficient for v1").
 */

const State = {
  favorites: [],
  currentSection: 'home',
  STORAGE_KEY: 'movie-recommender-favorites',
  _saveToBackendTimer: null,
  _saveToBackendDelay: 400,
  /** In-memory cache for section data (per section + params, not persisted). */
  _sectionCache: {},

  /** Minimal fields we store per movie for rendering cards (poster, title, rating, genres). */
  favoriteMovieFields: ['id', 'title', 'poster_path', 'vote_average', 'genre_ids', 'release_date'],

  init() {
    this.loadFavorites();
  },

  /**
   * Normalize a movie object (from any endpoint) into the minimal shape we persist.
   * Ensures: { id, title, poster_path, vote_average, genre_ids, release_date }
   */
  normalizeMovie(movie) {
    if (!movie || typeof movie !== 'object') return null;
    const id = Number(movie.id);
    if (!Number.isFinite(id)) return null;

    let genreIds = [];
    if (Array.isArray(movie.genre_ids)) {
      genreIds = movie.genre_ids.filter((n) => typeof n === 'number' && Number.isFinite(n));
    } else if (Array.isArray(movie.genres)) {
      genreIds = movie.genres
        .map((g) => g && typeof g.id === 'number' ? g.id : null)
        .filter((n) => typeof n === 'number' && Number.isFinite(n));
    }

    return {
      id,
      title: typeof movie.title === 'string' ? movie.title : '',
      poster_path: movie.poster_path ?? null,
      vote_average: typeof movie.vote_average === 'number' ? movie.vote_average : null,
      genre_ids: genreIds,
      release_date: typeof movie.release_date === 'string' ? movie.release_date : ''
    };
  },

  /** Get cached data for a section key (e.g. "home-sections", "library"). */
  getSectionCache(key) {
    return this._sectionCache[key] || null;
  },

  /** Set cached data for a section key (in-memory only). */
  setSectionCache(key, value) {
    this._sectionCache[key] = value;
  },

  /**
   * Load favorites from localStorage. Only accepts array of objects with numeric id
   * (legacy data that was just IDs is ignored and effectively cleared).
   */
  loadFavorites() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        this.favorites = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.favorites = [];
        return;
      }
      this.favorites = parsed
        .map((item) => this.normalizeMovie(item))
        .filter(Boolean);
    } catch (e) {
      this.favorites = [];
    }
  },

  isFavorite(movieId) {
    return this.favorites.some(m => m.id === movieId);
  },

  addFavorite(movie) {
    const minimal = this.normalizeMovie(movie);
    if (!minimal) return;
    if (this.isFavorite(minimal.id)) return;
    this.favorites.push(minimal);
    this.saveFavorites();
  },

  removeFavorite(movieId) {
    this.favorites = this.favorites.filter(m => m.id !== movieId);
    this.saveFavorites();
  },

  toggleFavorite(movie) {
    if (!movie || typeof movie.id !== 'number') return false;
    if (this.isFavorite(movie.id)) {
      this.removeFavorite(movie.id);
      return false;
    }
    this.addFavorite(movie);
    return true;
  },

  getFavorites() {
    return this.favorites.slice();
  },

  /**
   * Replace favorites (e.g. after loading from server).
   * options.syncBackend=false prevents writing the same server data back to backend.
   */
  setFavorites(favorites, options = {}) {
    const { syncBackend = true } = options;
    const list = Array.isArray(favorites)
      ? favorites.map((m) => this.normalizeMovie(m)).filter(Boolean)
      : [];
    this.favorites = list;
    this.saveFavorites({ syncBackend });
  },

  saveFavorites(options = {}) {
    const { syncBackend = true } = options;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Could not save favorites', e);
    }

    // Persist favorites to backend when authenticated.
    if (syncBackend && window.AuthClient?.token && window.FavoritesAPI?.saveFavorites) {
      if (this._saveToBackendTimer) clearTimeout(this._saveToBackendTimer);
      this._saveToBackendTimer = setTimeout(() => {
        this._saveToBackendTimer = null;
        window.FavoritesAPI.saveFavorites(this.favorites).catch(() => {
          // Swallow errors to keep UI responsive; next interaction will retry.
        });
      }, this._saveToBackendDelay);
    }
  },

  setSection(section) {
    this.currentSection = section;
  }
};
