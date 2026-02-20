/**
 * Helpers: format rating, date, image URLs, etc.
 */

const Utils = {
  /**
   * Format vote average (e.g. 7.456 -> "7.5")
   * @param {number} value
   * @param {number} decimals
   * @returns {string}
   */
  formatRating(value, decimals = 1) {
    if (value == null || isNaN(value)) return '—';
    return Number(value).toFixed(decimals);
  },

  /**
   * Format date string for display (e.g. "2024-03-15" -> "Mar 15, 2024")
   * @param {string} dateStr
   * @returns {string}
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Build TMDB poster URL (w342 default)
   * @param {string} path - e.g. "/abc123.jpg"
   * @param {string} size - e.g. "w342", "w500"
   * @returns {string}
   */
  posterUrl(path, size = 'w342') {
    if (!path) {
      return 'https://via.placeholder.com/342x513/1a1a1a/666?text=No+Poster';
    }
    const base = 'https://image.tmdb.org/t/p';
    return `${base}/${size}${path}`;
  },

  /**
   * Truncate text to max length with ellipsis
   * @param {string} text
   * @param {number} maxLength
   * @returns {string}
   */
  truncate(text, maxLength = 120) {
    if (!text || text.length <= maxLength) return text || '';
    return text.slice(0, maxLength).trim() + '…';
  }
};
