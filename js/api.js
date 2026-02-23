/**
 * TMDB API client for the Movie Recommender app.
 * API key: set in js/config.js (copy from config.example.js) or assign Api.apiKey.
 */

const Api = {
  baseUrl: 'https://api.themoviedb.org/3',
  placeholderKey: 'YOUR_API_KEY',

  /** Resolved key: config.js (window.__TMDB_API_KEY__) or Api.apiKey */
  get apiKey() {
    if (typeof window !== 'undefined' && window.__TMDB_API_KEY__) {
      return window.__TMDB_API_KEY__;
    }
    return this._apiKey ?? '';
  },
  set apiKey(value) {
    this._apiKey = value;
  },

  /** True if a real API key is set. */
  get hasKey() {
    const key = this.apiKey;
    return Boolean(key && key !== this.placeholderKey);
  },

  /** Genre list from TMDB (cached). */
  _genres: null,

  /**
   * Low-level request to TMDB.
   * @param {string} path - e.g. "/movie/popular"
   * @param {Record<string, string|number>} [params]
   * @returns {Promise<object>}
   */
  async request(path, params = {}) {
    const key = this.apiKey || this.placeholderKey;
    const url = new URL(this.baseUrl + path);
    url.searchParams.set('api_key', key);

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });

    let res;
    try {
      res = await fetch(url.toString());
    } catch (err) {
      throw new Error(`Network error: ${err.message}`);
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data.status_message || data.message || `HTTP ${res.status}`;
      const code = data.status_code || res.status;
      throw new Error(`TMDB error (${code}): ${message}`);
    }

    if (data.success === false) {
      throw new Error(data.status_message || 'API request failed');
    }

    return data;
  },

  /**
   * Popular movies (featured / recommendations).
   * @param {number} [page=1]
   * @param {string} [language]
   * @param {string} [region]
   */
  async getPopularMovies(page = 1, language = 'en-US', region = '') {
    const params = { page, language };
    if (region) params.region = region;
    return this.request('/movie/popular', params);
  },

  /**
   * Top rated movies (editor's choice).
   * @param {number} [page=1]
   * @param {string} [language]
   */
  async getTopRatedMovies(page = 1, language = 'en-US') {
    return this.request('/movie/top_rated', { page, language });
  },

  /**
   * Now playing in theatres.
   * @param {number} [page=1]
   * @param {string} [language]
   * @param {string} [region]
   */
  async getNowPlayingMovies(page = 1, language = 'en-US', region = '') {
    const params = { page, language };
    if (region) params.region = region;
    return this.request('/movie/now_playing', params);
  },

  /**
   * Upcoming movies.
   * @param {number} [page=1]
   * @param {string} [language]
   * @param {string} [region]
   */
  async getUpcomingMovies(page = 1, language = 'en-US', region = '') {
    const params = { page, language };
    if (region) params.region = region;
    return this.request('/movie/upcoming', params);
  },

  /**
   * Search movies by query.
   * @param {string} query
   * @param {number} [page=1]
   * @param {string} [language]
   */
  async searchMovies(query, page = 1, language = 'en-US') {
    if (!query || String(query).trim() === '') {
      return { results: [], page: 1, total_pages: 0, total_results: 0 };
    }
    return this.request('/search/movie', {
      query: String(query).trim(),
      page,
      language,
      include_adult: 'false'
    });
  },

  /**
   * Movie details by ID (with videos for trailer).
   * @param {number} movieId
   * @returns {Promise<object>}
   */
  async getMovieDetails(movieId) {
    const id = Number(movieId);
    if (!Number.isInteger(id) || id < 1) {
      throw new Error('Invalid movie ID');
    }
    return this.request(`/movie/${id}`, {
      append_to_response: 'videos'
    });
  },

  /**
   * Genre list for movies (cached).
   * @returns {Promise<{ id: number, name: string }[]>}
   */
  async getGenres() {
    if (this._genres) return this._genres;
    const data = await this.request('/genre/movie/list', { language: 'en-US' });
    this._genres = data.genres || [];
    return this._genres;
  },

  /**
   * Map genre IDs to names (e.g. [28, 12] -> "Action, Adventure").
   * @param {number[]} genreIds
   * @returns {Promise<string>}
   */
  async genreIdsToNames(genreIds) {
    if (!Array.isArray(genreIds) || genreIds.length === 0) return '';
    const genres = await this.getGenres();
    const map = Object.fromEntries(genres.map(g => [g.id, g.name]));
    return genreIds.map(id => map[id]).filter(Boolean).join(', ');
  },

  /**
   * Same as genreIdsToNames but uses cached genres (sync). Returns '' if genres not loaded yet.
   * @param {number[]} genreIds
   * @returns {string}
   */
  genreIdsToNamesSync(genreIds) {
    if (!Array.isArray(genreIds) || genreIds.length === 0 || !this._genres) return '';
    const map = Object.fromEntries(this._genres.map(g => [g.id, g.name]));
    return genreIds.map(id => map[id]).filter(Boolean).join(', ');
  },

  /**
   * Get YouTube trailer key from movie details (with videos appended).
   * @param {object} movie - object from getMovieDetails
   * @returns {string|null}
   */
  getTrailerKey(movie) {
    const videos = movie?.videos?.results || [];
    const trailer = videos.find(
      v => v.type === 'Trailer' && v.site === 'YouTube'
    );
    return trailer?.key || null;
  }
};
