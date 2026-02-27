/**
 * App state: favorites (as movie objects), current section.
 * Persists favorites to localStorage (design: "localStorage is sufficient for v1").
 */

const State = {
  favorites: [],
  currentSection: 'home',
  STORAGE_KEY: 'movie-recommender-favorites',

  /** Minimal fields we store per movie for rendering cards (poster, title, rating, genres). */
  favoriteMovieFields: ['id', 'title', 'poster_path', 'vote_average', 'genre_ids'],

  init() {
    this.loadFavorites();
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
      this.favorites = parsed.filter(
        item => item && typeof item === 'object' && typeof item.id === 'number'
      );
    } catch (e) {
      this.favorites = [];
    }
  },

  isFavorite(movieId) {
    return this.favorites.some(m => m.id === movieId);
  },

  addFavorite(movie) {
    if (!movie || typeof movie.id !== 'number') return;
    if (this.isFavorite(movie.id)) return;
    const minimal = {};
    this.favoriteMovieFields.forEach(key => {
      if (movie[key] !== undefined) minimal[key] = movie[key];
    });
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

  /** Replace favorites (e.g. after loading from server). Saves to localStorage and, if signed in, syncs to Supabase. */
  setFavorites(favorites) {
    const list = Array.isArray(favorites) ? favorites.filter(m => m && typeof m.id === 'number') : [];
    this.favorites = list;
    this.saveFavorites();
  },

  saveFavorites() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Could not save favorites', e);
    }
    if (window.Auth?.isSignedIn?.() && window.FavoritesAPI?.saveFavorites) {
      window.FavoritesAPI.saveFavorites(this.favorites);
    }
  },

  setSection(section) {
    this.currentSection = section;
  }
};
