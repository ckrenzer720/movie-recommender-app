/**
 * App state: favorites, current section, UI flags.
 * Persists favorites to localStorage.
 */

const State = {
  favorites: [],
  currentSection: 'home',
  STORAGE_KEY: 'movie-recommender-favorites',

  init() {
    this.loadFavorites();
  },

  loadFavorites() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this.favorites = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.favorites = [];
    }
  },

  saveFavorites() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Could not save favorites', e);
    }
  },

  isFavorite(movieId) {
    return this.favorites.includes(movieId);
  },

  addFavorite(movieId) {
    if (this.favorites.includes(movieId)) return;
    this.favorites.push(movieId);
    this.saveFavorites();
  },

  removeFavorite(movieId) {
    this.favorites = this.favorites.filter(id => id !== movieId);
    this.saveFavorites();
  },

  toggleFavorite(movieId) {
    if (this.isFavorite(movieId)) {
      this.removeFavorite(movieId);
      return false;
    }
    this.addFavorite(movieId);
    return true;
  },

  setSection(section) {
    this.currentSection = section;
  }
};
