/**
 * Movie API client (TMDB).
 * Set API_KEY in env or replace placeholder before using.
 */

const Api = {
  baseUrl: 'https://api.themoviedb.org/3',
  apiKey: '', // Set via env or config; e.g. process.env.TMDB_API_KEY or window.__TMDB_API_KEY__

  /**
   * Fetch JSON from TMDB endpoint
   * @param {string} path - e.g. "/movie/popular"
   * @param {Record<string, string>} params
   * @returns {Promise<object>}
   */
  async request(path, params = {}) {
    const url = new URL(this.baseUrl + path);
    url.searchParams.set('api_key', this.apiKey || 'YOUR_API_KEY');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  /**
   * Get popular movies (for featured / recommendations)
   * @param {number} page
   * @returns {Promise<{ results: object[] }>}
   */
  async getPopularMovies(page = 1) {
    return this.request('/movie/popular', { page });
  },

  /**
   * Get top rated movies (for editor's choice)
   * @param {number} page
   * @returns {Promise<{ results: object[] }>}
   */
  async getTopRatedMovies(page = 1) {
    return this.request('/movie/top_rated', { page });
  },

  /**
   * Get movie details by ID (includes videos for trailer)
   * @param {number} movieId
   * @returns {Promise<object>}
   */
  async getMovieDetails(movieId) {
    return this.request(`/movie/${movieId}`, {
      append_to_response: 'videos'
    });
  },

  /**
   * Get trailer key (YouTube) from movie details
   * @param {object} movie - movie with videos
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
