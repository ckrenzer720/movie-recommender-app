/**
 * Trailer / movie detail modal: open, close, embed YouTube.
 */

const Modal = {
  overlay: null,
  closeBtn: null,
  content: null,
  _previousActiveElement: null,

  init() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');
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
    this._previousActiveElement = document.activeElement;
    this.overlay.classList.add('is-open');
    this.overlay.setAttribute('aria-hidden', 'false');
    this.content.innerHTML = '<p class="placeholder">Loading…</p>';
    this.closeBtn.focus();

    if (!Api.hasKey) {
      this.content.innerHTML = `
        <p class="placeholder">Movie detail and trailer will load here. Add your TMDB API key in js/config.js (see config.example.js).</p>
        <p class="placeholder">Movie ID: ${Utils.escapeHtml(String(movieId))}</p>
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
      const isFav = State.isFavorite(movie.id);

      let html = `
        <div class="modal__header">
          <h2>${Utils.escapeHtml(movie.title)}</h2>
          <button type="button" class="movie-card__favorite modal__favorite ${isFav ? 'is-favorite' : ''}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-movie-id="${movie.id}">${isFav ? '♥' : '♡'}</button>
        </div>
        <p><strong>Rating:</strong> ★ ${rating} &nbsp; <strong>Release:</strong> ${date}</p>
        <p>${Utils.escapeHtml(overview)}</p>
      `;
      if (trailerKey) {
        const safeKey = Utils.escapeHtml(trailerKey);
        html += `
          <div class="modal__video" style="margin-top:1rem; position:relative; padding-bottom:56.25%; height:0; overflow:hidden;">
            <iframe src="https://www.youtube.com/embed/${safeKey}?autoplay=1" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;"></iframe>
          </div>
        `;
      }
      this.content.innerHTML = html;
      const favBtn = this.content.querySelector('.modal__favorite');
      if (favBtn) {
        favBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const nowFav = State.toggleFavorite(movie);
          favBtn.classList.toggle('is-favorite', nowFav);
          favBtn.setAttribute('aria-label', nowFav ? 'Remove from favorites' : 'Add to favorites');
          favBtn.textContent = nowFav ? '♥' : '♡';
          window.dispatchEvent(new CustomEvent('favoriteschanged'));
        });
      }
    } catch (err) {
      console.error(err);
      this.content.innerHTML = '<p class="placeholder">Could not load movie details.</p>';
    }
  },

  close() {
    this.overlay.classList.remove('is-open');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.content.innerHTML = '';
    if (this._previousActiveElement && typeof this._previousActiveElement.focus === 'function') {
      this._previousActiveElement.focus();
    }
  }
};
