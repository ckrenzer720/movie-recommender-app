/**
 * Trailer / movie detail modal: open, close, embed YouTube.
 */

const Modal = {
  overlay: null,
  closeBtn: null,
  content: null,

  init() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = `
      <div class="modal">
        <button type="button" class="modal__close" aria-label="Close">&times;</button>
        <div class="modal__content">
          <div class="modal__body"></div>
        </div>
      </div>
    `;
    this.content = this.overlay.querySelector('.modal__body');
    this.closeBtn = this.overlay.querySelector('.modal__close');

    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    document.body.appendChild(this.overlay);
  },

  /**
   * Open modal with movie details and trailer (when API key set)
   * @param {number} movieId
   */
  async open(movieId) {
    this.overlay.classList.add('is-open');
    this.content.innerHTML = '<p class="placeholder">Loading…</p>';

    if (!Api.apiKey || Api.apiKey === 'YOUR_API_KEY') {
      this.content.innerHTML = `
        <p class="placeholder">Movie detail and trailer will load here. Set Api.apiKey to use TMDB.</p>
        <p class="placeholder">Movie ID: ${movieId}</p>
      `;
      return;
    }

    try {
      const movie = await Api.getMovieDetails(movieId);
      const trailerKey = Api.getTrailerKey(movie);
      const posterUrl = Utils.posterUrl(movie.poster_path, 'w500');
      const rating = Utils.formatRating(movie.vote_average);
      const date = Utils.formatDate(movie.release_date);
      const overview = Utils.truncate(movie.overview, 300);

      let html = `
        <h2>${escapeHtml(movie.title)}</h2>
        <p><strong>Rating:</strong> ★ ${rating} &nbsp; <strong>Release:</strong> ${date}</p>
        <p>${escapeHtml(overview)}</p>
      `;
      if (trailerKey) {
        html += `
          <div class="modal__video" style="margin-top:1rem; position:relative; padding-bottom:56.25%; height:0; overflow:hidden;">
            <iframe src="https://www.youtube.com/embed/${trailerKey}?autoplay=1" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;"></iframe>
          </div>
        `;
      }
      this.content.innerHTML = html;
    } catch (err) {
      console.error(err);
      this.content.innerHTML = '<p class="placeholder">Could not load movie details.</p>';
    }
  },

  close() {
    this.overlay.classList.remove('is-open');
    this.content.innerHTML = '';
  }
};

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
