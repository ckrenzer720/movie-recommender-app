/**
 * App state: favorites (as movie objects), current section.
 * Persists favorites to localStorage.
 */

const State = {
  favorites: [],
  currentSection: 'home',
  STORAGE_KEY: 'movie-recommender-favorites',

  /** Minimal fields we store per movie for rendering cards. */
  favoriteMovieFields: ['id', 'title', 'poster_path', 'vote_average', 'genre_ids'],

  init() {
    this.loadFavorites();
  },

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

  saveFavorites() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Could not save favorites', e);
    }
  },

  isFavorite(movieId) {
    return this.favorites.some(m => m.id === movieId);
  },

  addFavorite(movie) {
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

  setSection(section) {
    this.currentSection = section;
  }
};
