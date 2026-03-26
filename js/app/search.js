/**
 * Search behavior (debounced) for the nav search box.
 */

(function () {
  window.App = window.App || {};

  const SEARCH_DEBOUNCE_MS = 350;
  let searchDebounceTimer = null;

  function initSearch({ switchView, setHashForSection }) {
    const input = document.getElementById('search-input');
    const form = document.querySelector('.nav-search');
    if (!input || !form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      runSearch(input.value.trim(), { switchView, setHashForSection });
    });

    input.addEventListener('input', () => {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      const query = input.value.trim();
      if (!query) return;
      searchDebounceTimer = setTimeout(
        () => runSearch(query, { switchView, setHashForSection }),
        SEARCH_DEBOUNCE_MS
      );
    });
  }

  async function runSearch(query, { switchView, setHashForSection }) {
    const container = document.getElementById('search-results');
    if (!container) return;

    if (!query) {
      window.App.setCarouselMessage?.(
        container,
        'Type in the search box above to find movies.',
        false,
        'search-empty'
      );
      return;
    }

    State.setSection('search');
    if (typeof switchView === 'function') switchView('search');
    if (typeof setHashForSection === 'function') setHashForSection('search');

    container.classList.add('carousel--loading');
    container.classList.remove('carousel--empty');
    container.innerHTML = '<div class="carousel__message"><div class="loading-spinner" aria-hidden="true"></div><p>Searching…</p></div>';

    if (!Api.hasKey) {
      window.App.setCarouselMessage?.(
        container,
        'Add your TMDB API key in js/config.js to search movies.',
        false,
        'search-empty'
      );
      return;
    }

    try {
      const data = await Api.searchMovies(query);
      const movies = data.results || [];
      renderSearchResults(container, movies, query);
    } catch (err) {
      console.error('Search failed', err);
      window.App.setCarouselMessage?.(
        container,
        'Search failed.',
        true,
        'search-error',
        () => runSearch(query, { switchView, setHashForSection })
      );
    }
  }

  function renderSearchResults(container, movies, query) {
    container.classList.remove('carousel--empty', 'carousel--loading');
    container.innerHTML = '';

    if (movies.length === 0) {
      window.App.setCarouselMessage?.(
        container,
        `No movies found for "${query}".`,
        false,
        'search-empty'
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    movies.forEach((movie) => fragment.appendChild(window.App.createMovieCard(movie)));
    container.appendChild(fragment);
  }

  window.App.initSearch = initSearch;
})();

