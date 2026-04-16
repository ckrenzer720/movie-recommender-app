/**
 * App view helpers: carousel rendering + cards.
 * Split out from js/main.js to keep main small.
 */

(function () {
  window.App = window.App || {};
  const delegatedCarousels = new WeakSet();

  function getCarouselContainer(name) {
    return document.querySelector(`[data-carousel="${name}"]`);
  }

  function setCarouselLoading(name) {
    const container = getCarouselContainer(name);
    if (!container) return;
    container.classList.remove('carousel--empty');
    container.classList.add('carousel--loading');
    container.innerHTML = `
      <div class="carousel__message">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Loading…</p>
      </div>
    `;
  }

  function setCarouselsLoading(names) {
    (names || []).forEach((name) => setCarouselLoading(name));
  }

  /** Set carousel to a message state (empty or error). Pass container or name. extraClass optional. retryCallback optional — adds "Try again" button. */
  function setCarouselMessage(containerOrName, message, isError, extraClass, retryCallback) {
    const container = typeof containerOrName === 'string'
      ? getCarouselContainer(containerOrName)
      : containerOrName;
    if (!container) return;
    container.classList.remove('carousel--loading');
    container.classList.add('carousel--empty');
    let messageClass = 'carousel__message';
    if (isError) messageClass += ' carousel__message--error';
    if (extraClass) messageClass += ' ' + extraClass;
    let html = `<p class="${messageClass}">${Utils.escapeHtml(message)}</p>`;
    if (typeof retryCallback === 'function') {
      html += '<button type="button" class="btn btn--primary carousel__retry">Try again</button>';
    }
    container.innerHTML = html;
    const retryBtn = container.querySelector('.carousel__retry');
    if (retryBtn && typeof retryCallback === 'function') {
      retryBtn.addEventListener('click', retryCallback);
    }
  }

  function setCarouselsMessage(names, message, isError, retryCallback) {
    (names || []).forEach((name) => setCarouselMessage(name, message, isError, undefined, retryCallback));
  }

  function createCollectionCard(collection) {
    const card = document.createElement('article');
    card.className = 'movie-card collection-card';
    card.dataset.collectionId = collection.id;

    const posterUrl = Utils.posterUrl(collection.poster_path);
    const name = collection.name || 'Collection';
    const partsCount = Array.isArray(collection.parts) ? collection.parts.length : 0;
    const tmdbUrl = `https://www.themoviedb.org/collection/${encodeURIComponent(String(collection.id))}`;

    card.innerHTML = `
      <div class="movie-card__poster-wrap">
        <img class="movie-card__poster" src="${posterUrl}" alt="${Utils.escapeHtml(name)}" loading="lazy">
      </div>
      <div class="movie-card__body">
        <h3 class="movie-card__title">${Utils.escapeHtml(name)}</h3>
        <span class="movie-card__rating">${Utils.escapeHtml(String(partsCount))} movie${partsCount === 1 ? '' : 's'}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      window.open(tmdbUrl, '_blank', 'noopener,noreferrer');
    });

    return card;
  }

  function createMovieCard(movie) {
    const card = document.createElement('article');
    card.className = 'movie-card';
    card.dataset.movieId = movie.id;
    const posterUrl = Utils.posterUrl(movie.poster_path);
    const rating = Utils.formatRating(movie.vote_average);
    const genres = Api.genreIdsToNamesSync(movie.genre_ids || []);
    const reason = typeof movie.__reason === 'string' ? movie.__reason : '';
    const isFav = State.isFavorite(movie.id);
    const canFavorite = Boolean(window.AuthClient?.user);

    card.innerHTML = `
      <div class="movie-card__poster-wrap">
        <img class="movie-card__poster" src="${posterUrl}" alt="${Utils.escapeHtml(movie.title)}" loading="lazy">
        <button type="button" class="movie-card__favorite ${isFav ? 'is-favorite' : ''}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-movie-id="${movie.id}" ${canFavorite ? '' : 'disabled aria-disabled="true"'}>${isFav ? '♥' : '♡'}</button>
      </div>
      <div class="movie-card__body">
        <h3 class="movie-card__title">${Utils.escapeHtml(movie.title)}</h3>
        <span class="movie-card__rating">★ ${rating}</span>
        ${genres ? `<p class="movie-card__genres">${Utils.escapeHtml(genres)}</p>` : ''}
        ${reason ? `<p class="movie-card__reason">${Utils.escapeHtml(reason)}</p>` : ''}
      </div>
    `;

    return card;
  }

  function createAnyCard(item) {
    if (item && typeof item === 'object' && typeof item.name === 'string' && Array.isArray(item.parts)) {
      return createCollectionCard(item);
    }
    return createMovieCard(item);
  }

  function renderCarousel(name, items, options = {}) {
    const container = getCarouselContainer(name);
    if (!container) return;
    container.classList.remove('carousel--loading', 'carousel--empty');

    if (!delegatedCarousels.has(container)) {
      delegatedCarousels.add(container);
      container.addEventListener('click', (e) => {
        const favBtn = e.target.closest('.movie-card__favorite');
        if (favBtn && container.contains(favBtn)) {
          e.preventDefault();
          if (!window.AuthClient?.user) {
            window.AuthUI?.open?.('signin');
            window.AuthUI?.showError?.('Sign in to add favorites.');
            return;
          }
          const movieId = Number(favBtn.getAttribute('data-movie-id'));
          const card = favBtn.closest('.movie-card');
          const backing = card && card.__movie;

          if (backing) {
            const nowFav = State.toggleFavorite(backing);
            Utils.applyFavoriteButtonState(favBtn, nowFav);
          } else if (Number.isFinite(movieId)) {
            // Fallback: if we can't access the backing movie object, we can still remove.
            if (State.isFavorite(movieId)) {
              State.removeFavorite(movieId);
              Utils.applyFavoriteButtonState(favBtn, false);
            }
          }

          window.dispatchEvent(new CustomEvent('favoriteschanged'));
          return;
        }

        const card = e.target.closest('.movie-card');
        if (!card || !container.contains(card)) return;
        if (e.target.closest('.movie-card__favorite')) return;
        const movieId = Number(card.dataset.movieId);
        if (Number.isFinite(movieId) && movieId > 0) {
          Modal.open(movieId);
        }
      });
    }

    const { append = false } = options;
    if (!append) container.innerHTML = '';

    if (!items || items.length === 0) {
      if (!append) setCarouselMessage(container, 'No movies in this section.', false);
      return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const el = createAnyCard(item);
      if (el && item && typeof item === 'object') {
        // Attach backing data for delegated favorite toggles.
        el.__movie = item;
      }
      fragment.appendChild(el);
    });
    container.appendChild(fragment);

    if (!append && typeof window.App.updateLoadMoreButton === 'function') {
      window.App.updateLoadMoreButton(name);
    }
  }

  window.App.getCarouselContainer = getCarouselContainer;
  window.App.setCarouselLoading = setCarouselLoading;
  window.App.setCarouselsLoading = setCarouselsLoading;
  window.App.setCarouselMessage = setCarouselMessage;
  window.App.setCarouselsMessage = setCarouselsMessage;
  window.App.renderCarousel = renderCarousel;
  window.App.createMovieCard = createMovieCard;
})();

