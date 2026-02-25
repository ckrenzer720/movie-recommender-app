/**
 * App entry: init state, API, UI, load data, section views, favorites.
 */

(function () {
  function init() {
    State.init();
    Nav.init();
    Modal.init();
    Carousel.init();

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

  function switchView(section) {
    const home = document.querySelector('.view-home');
    const favorites = document.querySelector('.view-favorites');
    if (!home || !favorites) return;

    if (section === 'favorites') {
      home.classList.add('hidden');
      favorites.classList.remove('hidden');
      renderFavorites();
    } else {
      favorites.classList.add('hidden');
      home.classList.remove('hidden');
    }
  }

  function renderFavorites() {
    const container = document.querySelector('[data-carousel="favorites"]');
    if (!container) return;

    const list = State.getFavorites();
    container.innerHTML = '';

    if (list.length === 0) {
      container.classList.add('carousel--empty');
      const empty = document.createElement('p');
      empty.className = 'carousel__message favorites-empty';
      empty.textContent = 'No favorites yet. Click the ♡ on any movie to add it here.';
      container.appendChild(empty);
      return;
    }

    container.classList.remove('carousel--empty');
    list.forEach(movie => {
      container.appendChild(createMovieCard(movie));
    });
  }

  async function loadSections() {
    setCarouselsLoading(['featured', 'editors-choice', 'recommendations']);
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
      setCarouselsError(['featured', 'editors-choice', 'recommendations'], 'Couldn’t load movies. Check your connection and API key.');
    }
  }

  function setCarouselLoading(name) {
    const container = document.querySelector(`[data-carousel="${name}"]`);
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

  function setCarouselError(name, message) {
    const container = document.querySelector(`[data-carousel="${name}"]`);
    if (!container) return;
    container.classList.remove('carousel--loading');
    container.classList.add('carousel--empty');
    container.innerHTML = `
      <p class="carousel__message carousel__message--error">${escapeHtml(message)}</p>
    `;
  }

  function setCarouselsError(names, message) {
    names.forEach(name => setCarouselError(name, message));
  }

  function setCarouselEmpty(name, message) {
    const container = document.querySelector(`[data-carousel="${name}"]`);
    if (!container) return;
    container.classList.remove('carousel--loading');
    container.classList.add('carousel--empty');
    container.innerHTML = `<p class="carousel__message">${escapeHtml(message)}</p>`;
  }

  function renderCarousel(name, movies) {
    const container = document.querySelector(`[data-carousel="${name}"]`);
    if (!container) return;
    container.classList.remove('carousel--loading', 'carousel--empty');
    container.innerHTML = '';
    if (!movies || movies.length === 0) {
      setCarouselEmpty(name, 'No movies in this section.');
      return;
    }
    movies.forEach(movie => {
      container.appendChild(createMovieCard(movie));
    });
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
        <img class="movie-card__poster" src="${posterUrl}" alt="${escapeHtml(movie.title)}" loading="lazy">
        <button type="button" class="movie-card__favorite ${isFav ? 'is-favorite' : ''}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-movie-id="${movie.id}">${isFav ? '♥' : '♡'}</button>
      </div>
      <div class="movie-card__body">
        <h3 class="movie-card__title">${escapeHtml(movie.title)}</h3>
        <span class="movie-card__rating">★ ${rating}</span>
        ${genres ? `<p class="movie-card__genres">${escapeHtml(genres)}</p>` : ''}
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
    ['featured', 'editors-choice', 'recommendations'].forEach(name => {
      renderCarousel(name, placeholders);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
