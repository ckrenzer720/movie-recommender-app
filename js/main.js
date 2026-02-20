/**
 * App entry: init state, API, UI, and load initial data.
 */

(function () {
  function init() {
    State.init();
    Nav.init();
    Modal.init();
    Carousel.init();

    // Load and render movie rows when API key is set
    if (Api.apiKey && Api.apiKey !== 'YOUR_API_KEY') {
      loadSections();
    } else {
      console.info('Set Api.apiKey (e.g. from .env) to load real data.');
      renderPlaceholderCards();
    }
  }

  async function loadSections() {
    try {
      const [popular, topRated] = await Promise.all([
        Api.getPopularMovies(1),
        Api.getTopRatedMovies(1)
      ]);
      renderCarousel('featured', popular.results || []);
      renderCarousel('editors-choice', topRated.results || []);
      renderCarousel('recommendations', popular.results?.slice(0, 10) || []);
    } catch (err) {
      console.error('Failed to load movies', err);
      renderPlaceholderCards();
    }
  }

  function renderCarousel(name, movies) {
    const container = document.querySelector(`[data-carousel="${name}"]`);
    if (!container) return;
    container.innerHTML = '';
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
    const genres = (movie.genre_ids || []).join(', '); // TODO: map IDs to names
    card.innerHTML = `
      <img class="movie-card__poster" src="${posterUrl}" alt="${escapeHtml(movie.title)}" loading="lazy">
      <div class="movie-card__body">
        <h3 class="movie-card__title">${escapeHtml(movie.title)}</h3>
        <span class="movie-card__rating">★ ${rating}</span>
        ${genres ? `<p class="movie-card__genres">${escapeHtml(genres)}</p>` : ''}
      </div>
    `;
    card.addEventListener('click', () => Modal.open(movie.id));
    return card;
  }

  function renderPlaceholderCards() {
    const placeholders = [
      { id: 0, title: 'Movie 1', vote_average: 7.5, poster_path: null },
      { id: 1, title: 'Movie 2', vote_average: 8.0, poster_path: null },
      { id: 2, title: 'Movie 3', vote_average: 6.5, poster_path: null }
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
