/**
 * App entry: init state, API, UI, load data, section views, favorites.
 */

(function () {
  const HOME_CAROUSELS = ['featured', 'editors-choice', 'recommendations'];

  async function doInit() {
    State.init();
    Nav.init();
    Modal.init();
    Carousel.init();

    if (window.Auth?.isConfigured) {
      window.Auth.onAuthChange(onAuthChange);
      if (window.Auth.isSignedIn()) {
        await loadUserFavorites();
      }
    }
    if (window.AuthUI) window.AuthUI.init();

    window.addEventListener('sectionchange', (e) => {
      switchView(e.detail?.section ?? State.currentSection);
    });

    if (Api.hasKey) {
      loadSections();
    } else {
      console.info('Add your TMDB API key in js/config.js (copy from config.example.js) to load real data.');
      renderPlaceholderCards();
    }

    switchView(State.currentSection);
  }

  async function onAuthChange(user) {
    if (user) {
      await loadUserFavorites();
    } else {
      State.loadFavorites();
    }
    if (State.currentSection === 'favorites') {
      renderFavorites();
    }
  }

  async function loadUserFavorites() {
    if (!window.Auth?.isSignedIn?.() || !window.FavoritesAPI) return;
    try {
      const list = await window.FavoritesAPI.getFavorites();
      State.setFavorites(list);
    } catch (e) {
      console.warn('Could not load favorites from account', e);
    }
  }

  function init() {
    function run() {
      if (window.Auth) {
        doInit();
      } else {
        window.addEventListener('authready', doInit, { once: true });
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  function getCarouselContainer(name) {
    return document.querySelector(`[data-carousel="${name}"]`);
  }

  let cachedViews = null;
  function getViews() {
    if (!cachedViews) cachedViews = document.querySelectorAll('.view[data-view]');
    return cachedViews;
  }

  function switchView(section) {
    const views = getViews();
    if (!views.length) return;

    views.forEach((view) => {
      const viewId = view.getAttribute('data-view');
      if (viewId === section) {
        view.classList.remove('hidden');
        if (section === 'favorites') renderFavorites();
      } else {
        view.classList.add('hidden');
      }
    });
  }

  function renderFavorites() {
    const container = getCarouselContainer('favorites');
    if (!container) return;

    const list = State.getFavorites();
    container.innerHTML = '';

    if (list.length === 0) {
      setCarouselMessage(container, 'No favorites yet. Click the ♡ on any movie to add it here.', false, 'favorites-empty');
      return;
    }

    container.classList.remove('carousel--loading', 'carousel--empty');
    const fragment = document.createDocumentFragment();
    list.forEach(movie => fragment.appendChild(createMovieCard(movie)));
    container.appendChild(fragment);
  }

  async function loadSections() {
    setCarouselsLoading(HOME_CAROUSELS);
    try {
      const [popular, topRated, _] = await Promise.all([
        Api.getPopularMovies(1),
        Api.getTopRatedMovies(1),
        Api.getGenres()
      ]);
      const results = popular.results || [];
      const topResults = topRated.results || [];
      renderCarousel('featured', results);
      renderCarousel('editors-choice', topResults);
      renderCarousel('recommendations', results.slice(0, 10));
    } catch (err) {
      console.error('Failed to load movies', err);
      setCarouselsMessage(HOME_CAROUSELS, 'Couldn’t load movies. Check your connection and API key.', true);
    }
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
    names.forEach(name => setCarouselLoading(name));
  }

  /** Set carousel to a message state (empty or error). Pass container or name. extraClass is optional (e.g. 'favorites-empty'). */
  function setCarouselMessage(containerOrName, message, isError, extraClass) {
    const container = typeof containerOrName === 'string'
      ? getCarouselContainer(containerOrName)
      : containerOrName;
    if (!container) return;
    container.classList.remove('carousel--loading');
    container.classList.add('carousel--empty');
    let messageClass = 'carousel__message';
    if (isError) messageClass += ' carousel__message--error';
    if (extraClass) messageClass += ' ' + extraClass;
    container.innerHTML = `<p class="${messageClass}">${Utils.escapeHtml(message)}</p>`;
  }

  function setCarouselsMessage(names, message, isError) {
    names.forEach(name => setCarouselMessage(name, message, isError));
  }

  function renderCarousel(name, movies) {
    const container = getCarouselContainer(name);
    if (!container) return;
    container.classList.remove('carousel--loading', 'carousel--empty');
    container.innerHTML = '';
    if (!movies || movies.length === 0) {
      setCarouselMessage(container, 'No movies in this section.', false);
      return;
    }
    const fragment = document.createDocumentFragment();
    movies.forEach(movie => fragment.appendChild(createMovieCard(movie)));
    container.appendChild(fragment);
  }

  function createMovieCard(movie) {
    const card = document.createElement('article');
    card.className = 'movie-card';
    card.dataset.movieId = movie.id;
    const posterUrl = Utils.posterUrl(movie.poster_path);
    const rating = Utils.formatRating(movie.vote_average);
    const genres = Api.genreIdsToNamesSync(movie.genre_ids || []);
    const isFav = State.isFavorite(movie.id);

    card.innerHTML = `
      <div class="movie-card__poster-wrap">
        <img class="movie-card__poster" src="${posterUrl}" alt="${Utils.escapeHtml(movie.title)}" loading="lazy">
        <button type="button" class="movie-card__favorite ${isFav ? 'is-favorite' : ''}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-movie-id="${movie.id}">${isFav ? '♥' : '♡'}</button>
      </div>
      <div class="movie-card__body">
        <h3 class="movie-card__title">${Utils.escapeHtml(movie.title)}</h3>
        <span class="movie-card__rating">★ ${rating}</span>
        ${genres ? `<p class="movie-card__genres">${Utils.escapeHtml(genres)}</p>` : ''}
      </div>
    `;

    const btn = card.querySelector('.movie-card__favorite');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowFav = State.toggleFavorite(movie);
      btn.classList.toggle('is-favorite', nowFav);
      btn.setAttribute('aria-label', nowFav ? 'Remove from favorites' : 'Add to favorites');
      btn.textContent = nowFav ? '♥' : '♡';
      if (State.currentSection === 'favorites') {
        renderFavorites();
      }
    });

    card.addEventListener('click', (e) => {
      if (e.target.closest('.movie-card__favorite')) return;
      Modal.open(movie.id);
    });

    return card;
  }

  function renderPlaceholderCards() {
    const placeholders = [
      { id: 0, title: 'Movie 1', vote_average: 7.5, poster_path: null, genre_ids: [] },
      { id: 1, title: 'Movie 2', vote_average: 8.0, poster_path: null, genre_ids: [] },
      { id: 2, title: 'Movie 3', vote_average: 6.5, poster_path: null, genre_ids: [] }
    ];
    HOME_CAROUSELS.forEach(name => renderCarousel(name, placeholders));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
