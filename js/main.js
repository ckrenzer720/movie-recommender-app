/**
 * App entry: init state, API, UI, load data, section views, favorites.
 */

(function () {
  window.App = window.App || {};
  window.App.const = {
    HOME_CAROUSELS: ['featured', 'editors-choice', 'recommendations'],
    /** Genre IDs for Library rows (TMDB: 28 Action, 35 Comedy, 18 Drama, 27 Horror, 878 Sci-Fi). */
    LIBRARY_GENRE_IDS: [28, 35, 18, 27, 878],
    NEW_SERIES_CAROUSELS: ['new-series-now-playing', 'new-series-upcoming'],
    NEWS_CAROUSELS: ['news-upcoming'],
    COLLECTIONS_CAROUSELS: ['collections-franchises', 'collections-top-rated', 'collections-popular'],
  };

  /** Section IDs used in URL hash (#home, #favorites, etc.). */
  const VALID_SECTIONS = new Set(['home', 'new-series', 'library', 'news', 'collections', 'favorites', 'search']);

  function getSectionFromHash() {
    const hash = (location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
    return hash && VALID_SECTIONS.has(hash) ? hash : 'home';
  }

  function setHashForSection(section) {
    const want = section || 'home';
    const current = (location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
    if (current !== want) location.hash = want;
  }

  async function doInit() {
    if (window.AuthClient?.init) {
      await window.AuthClient.init();
    }
    State.init();
    Nav.init();
    Modal.init();
    Carousel.init();
    window.App.initRecommendationControls?.();
    if (window.App.initSearch) {
      window.App.initSearch({ switchView, setHashForSection });
    }

    window.addEventListener('sectionchange', (e) => {
      const section = e.detail?.section ?? State.currentSection;
      switchView(section);
      setHashForSection(section);
    });

    window.addEventListener('hashchange', () => {
      const section = getSectionFromHash();
      if (section === State.currentSection) return;
      State.setSection(section);
      if (Nav.setActive) Nav.setActive(section);
      switchView(section);
    });

    window.addEventListener('favoriteschanged', () => {
      if (State.currentSection === 'favorites') renderFavorites();
      // Keep home recommendations responsive to taste changes.
      if (State.currentSection === 'home') window.App.loadHomeRecommendations?.();
    });

    window.addEventListener('authchanged', () => {
      // Lock/unlock favorite buttons without requiring a rerender.
      const canFavorite = Boolean(window.AuthClient?.user);
      document.querySelectorAll('.movie-card__favorite').forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return;
        btn.disabled = !canFavorite;
        if (!canFavorite) btn.setAttribute('aria-disabled', 'true');
        else btn.removeAttribute('aria-disabled');
      });

      if (window.AuthClient?.user) {
        loadUserFavorites().then(() => {
          if (State.currentSection === 'favorites') renderFavorites();
        }).catch(() => {});
      } else {
        // Avoid showing a previous account's favorites after logout.
        try { localStorage.removeItem(State.STORAGE_KEY); } catch (_) {}
        State.favorites = [];
        if (State.currentSection === 'favorites') renderFavorites();
      }
    });

    if (Api.hasKey) {
      window.App.loadHome?.();
    } else {
      console.info('Add your TMDB API key in js/config.js (copy from config.example.js) to load real data.');
      renderPlaceholderCards();
    }

    // If already signed in, replace localStorage favorites with backend favorites.
    if (window.AuthClient?.user && window.FavoritesAPI?.getFavorites) {
      try {
        await loadUserFavorites();
      } catch (_) {
        // keep local favorites
      }
    }

    const section = getSectionFromHash();
    State.setSection(section);
    if (Nav.setActive) Nav.setActive(section);
    switchView(section);
    setHashForSection(section);
  }

  async function loadUserFavorites() {
    if (!window.FavoritesAPI?.getFavorites) return;
    const list = await window.FavoritesAPI.getFavorites();
    State.setFavorites(list, { syncBackend: false });
  }

  function init() {
    function run() {
      doInit();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
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
        if (section === 'library') window.App.loadLibrary?.();
        if (section === 'new-series') window.App.loadNewSeries?.();
        if (section === 'news') window.App.loadNews?.();
        if (section === 'collections') window.App.loadCollections?.();
      } else {
        view.classList.add('hidden');
      }
    });
  }

  function renderFavorites() {
    const container = window.App.getCarouselContainer?.('favorites');
    if (!container) return;

    if (!window.AuthClient?.user) {
      window.App.setCarouselMessage?.(
        container,
        'Sign in to use favorites.',
        false,
        'favorites-locked',
        () => window.AuthUI?.open?.('signin')
      );
      return;
    }

    const list = State.getFavorites();
    container.innerHTML = '';

    if (list.length === 0) {
      window.App.setCarouselMessage?.(container, 'No favorites yet. Click the ♡ on any movie to add it here.', false, 'favorites-empty');
      return;
    }

    container.classList.remove('carousel--loading', 'carousel--empty');
    const fragment = document.createDocumentFragment();
    list.forEach(movie => fragment.appendChild(window.App.createMovieCard(movie)));
    container.appendChild(fragment);
  }

  function renderPlaceholderCards() {
    const placeholders = [
      { id: 0, title: 'Movie 1', vote_average: 7.5, poster_path: null, genre_ids: [] },
      { id: 1, title: 'Movie 2', vote_average: 8.0, poster_path: null, genre_ids: [] },
      { id: 2, title: 'Movie 3', vote_average: 6.5, poster_path: null, genre_ids: [] }
    ];
    window.App.const.HOME_CAROUSELS.forEach(name => window.App.renderCarousel(name, placeholders));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
