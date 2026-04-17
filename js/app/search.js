/**
 * Search behavior (debounced) for the nav search box.
 */

(function () {
  window.App = window.App || {};

  const SEARCH_DEBOUNCE_MS = 350;
  let searchDebounceTimer = null;
  let activeSearchSeq = 0;

  // Search paging state (for "Load more")
  let searchState = {
    query: '',
    page: 1,
    totalPages: 0,
    loading: false
  };

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
      if (!query) {
        // If the user clears the box, show the default empty state.
        const container = document.getElementById('search-results');
        if (container) {
          window.App.setCarouselMessage?.(
            container,
            'Type in the search box above to find movies.',
            false,
            'search-empty'
          );
        }
        return;
      }
      searchDebounceTimer = setTimeout(
        () => runSearch(query, { switchView, setHashForSection }),
        SEARCH_DEBOUNCE_MS
      );
    });
  }

  async function runSearch(query, { switchView, setHashForSection }) {
    const container = document.getElementById('search-results');
    if (!container) return;

    const seq = ++activeSearchSeq;
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
      searchState = { query, page: 1, totalPages: 0, loading: false };
      const data = await Api.searchMovies(query, 1);
      if (seq !== activeSearchSeq) return; // stale response
      const movies = data.results || [];
      searchState.page = data?.page || 1;
      searchState.totalPages = data?.total_pages || 0;
      renderSearchResults(container, movies, query, { append: false });
    } catch (err) {
      if (seq !== activeSearchSeq) return;
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

  function renderSearchResults(container, movies, query, options = {}) {
    const { append = false } = options;
    container.classList.remove('carousel--empty', 'carousel--loading');
    if (!append) container.innerHTML = '';

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

    renderLoadMore(container);
  }

  function renderLoadMore(container) {
    // Remove existing footer, re-add if needed.
    container.querySelectorAll('[data-search-footer]').forEach((n) => n.remove());

    const hasMore = Number.isFinite(searchState.totalPages) && searchState.totalPages > 0
      ? searchState.page < searchState.totalPages
      : false;
    if (!hasMore) return;

    const footer = document.createElement('div');
    footer.dataset.searchFooter = 'true';
    footer.className = 'carousel__footer';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--ghost carousel__load-more';
    btn.textContent = searchState.loading ? 'Loading…' : 'Load more';
    btn.disabled = searchState.loading;
    btn.addEventListener('click', () => loadMore(container));
    footer.appendChild(btn);

    container.appendChild(footer);
  }

  async function loadMore(container) {
    if (searchState.loading) return;
    const { query } = searchState;
    if (!query) return;

    const nextPage = (searchState.page || 1) + 1;
    if (searchState.totalPages && nextPage > searchState.totalPages) return;

    const seq = activeSearchSeq;
    searchState.loading = true;
    renderLoadMore(container);
    try {
      const data = await Api.searchMovies(query, nextPage);
      if (seq !== activeSearchSeq) return;
      const movies = data.results || [];
      searchState.page = data?.page || nextPage;
      searchState.totalPages = data?.total_pages || searchState.totalPages || 0;
      renderSearchResults(container, movies, query, { append: true });
    } catch (err) {
      if (seq !== activeSearchSeq) return;
      console.error('Load more search failed', err);
    } finally {
      if (seq !== activeSearchSeq) return;
      searchState.loading = false;
      renderLoadMore(container);
    }
  }

  window.App.initSearch = initSearch;
})();

