/**
 * Section loaders (Home/Library/New Series/News/Collections).
 */

(function () {
  window.App = window.App || {};

  function renderPagedRow(name, data, fetchPage) {
    window.App.renderCarousel(name, (data && data.results) || []);
    window.App.setPagination(name, {
      page: data?.page || 1,
      totalPages: data?.total_pages || 0,
      fetchPage
    });
  }

  async function loadHome() {
    const { HOME_CAROUSELS } = window.App.const || {};

    const cached = State.getSectionCache && State.getSectionCache('home-sections');
    if (cached) {
      const { popularResults, topRatedResults } = cached;
      window.App.renderCarousel('featured', popularResults);
      window.App.setPagination('featured', {
        page: cached.popularPage || 1,
        totalPages: cached.popularTotalPages || 0,
        fetchPage: (p) => Api.getPopularMovies(p)
      });

      window.App.renderCarousel('editors-choice', topRatedResults);
      window.App.setPagination('editors-choice', {
        page: cached.topRatedPage || 1,
        totalPages: cached.topRatedTotalPages || 0,
        fetchPage: (p) => Api.getTopRatedMovies(p)
      });

      window.App.renderCarousel('recommendations', popularResults.slice(0, 10));
      return;
    }

    window.App.setCarouselsLoading(HOME_CAROUSELS);
    try {
      const [popular, topRated, _] = await Promise.all([
        Api.getPopularMovies(1),
        Api.getTopRatedMovies(1),
        Api.getGenres()
      ]);
      const popularResults = popular.results || [];
      const topRatedResults = topRated.results || [];

      if (State.setSectionCache) {
        State.setSectionCache('home-sections', {
          popularResults,
          topRatedResults,
          popularPage: popular.page || 1,
          popularTotalPages: popular.total_pages || 0,
          topRatedPage: topRated.page || 1,
          topRatedTotalPages: topRated.total_pages || 0
        });
      }

      renderPagedRow('featured', popular, (p) => Api.getPopularMovies(p));
      renderPagedRow('editors-choice', topRated, (p) => Api.getTopRatedMovies(p));

      window.App.renderCarousel('recommendations', popularResults.slice(0, 10));
    } catch (err) {
      console.error('Failed to load movies', err);
      window.App.setCarouselsMessage(HOME_CAROUSELS, 'Couldn’t load movies. Check your connection and API key.', true, loadHome);
    }
  }

  let libraryLoaded = false;
  async function loadLibrary() {
    if (!Api.hasKey) return;
    const { LIBRARY_GENRE_IDS } = window.App.const || {};
    const carouselNames = (LIBRARY_GENRE_IDS || []).map((id) => 'library-' + id);

    const cached = State.getSectionCache && State.getSectionCache('library');
    if (cached && Array.isArray(cached.byGenre) && cached.byGenre.length === (LIBRARY_GENRE_IDS || []).length) {
      cached.byGenre.forEach((data, i) => {
        const genreId = LIBRARY_GENRE_IDS[i];
        const name = 'library-' + genreId;
        renderPagedRow(name, data, (p) => Api.getMoviesByGenre(genreId, p));
      });
      libraryLoaded = true;
      return;
    }

    if (libraryLoaded) return;
    libraryLoaded = true;

    window.App.setCarouselsLoading(carouselNames);
    try {
      await Api.getGenres();
      const results = await Promise.all(
        LIBRARY_GENRE_IDS.map((genreId) => Api.getMoviesByGenre(genreId, 1))
      );

      if (State.setSectionCache) {
        State.setSectionCache('library', {
          byGenre: results.slice()
        });
      }

      results.forEach((data, i) => {
        const genreId = LIBRARY_GENRE_IDS[i];
        const name = 'library-' + genreId;
        renderPagedRow(name, data, (p) => Api.getMoviesByGenre(genreId, p));
      });
    } catch (err) {
      console.error('Failed to load library', err);
      window.App.setCarouselsMessage(carouselNames, "Couldn't load genre rows. Try again later.", true, () => {
        libraryLoaded = false;
        loadLibrary();
      });
    }
  }

  let newSeriesLoaded = false;
  async function loadNewSeries() {
    if (!Api.hasKey) return;
    const { NEW_SERIES_CAROUSELS } = window.App.const || {};

    const cached = State.getSectionCache && State.getSectionCache('new-series');
    if (cached && cached.nowPlaying && cached.upcoming) {
      renderPagedRow('new-series-now-playing', cached.nowPlaying, (p) => Api.getNowPlayingMovies(p));
      renderPagedRow('new-series-upcoming', cached.upcoming, (p) => Api.getUpcomingMovies(p));

      newSeriesLoaded = true;
      return;
    }

    if (newSeriesLoaded) return;
    newSeriesLoaded = true;

    window.App.setCarouselsLoading(NEW_SERIES_CAROUSELS);
    try {
      const [nowPlaying, upcoming] = await Promise.all([
        Api.getNowPlayingMovies(1),
        Api.getUpcomingMovies(1)
      ]);

      if (State.setSectionCache) {
        State.setSectionCache('new-series', { nowPlaying, upcoming });
      }

      renderPagedRow('new-series-now-playing', nowPlaying, (p) => Api.getNowPlayingMovies(p));
      renderPagedRow('new-series-upcoming', upcoming, (p) => Api.getUpcomingMovies(p));
    } catch (err) {
      console.error('Failed to load new series', err);
      window.App.setCarouselsMessage(NEW_SERIES_CAROUSELS, "Couldn't load new releases. Try again.", true, () => {
        newSeriesLoaded = false;
        loadNewSeries();
      });
    }
  }

  let newsLoaded = false;
  async function loadNews() {
    if (!Api.hasKey) return;
    const { NEWS_CAROUSELS } = window.App.const || {};

    const cached = State.getSectionCache && State.getSectionCache('news');
    if (cached && cached.upcoming) {
      renderPagedRow('news-upcoming', cached.upcoming, (p) => Api.getUpcomingMovies(p));
      newsLoaded = true;
      return;
    }

    if (newsLoaded) return;
    newsLoaded = true;

    window.App.setCarouselsLoading(NEWS_CAROUSELS);
    try {
      const upcoming = await Api.getUpcomingMovies(1);
      if (State.setSectionCache) State.setSectionCache('news', { upcoming });
      renderPagedRow('news-upcoming', upcoming, (p) => Api.getUpcomingMovies(p));
    } catch (err) {
      console.error('Failed to load news', err);
      window.App.setCarouselsMessage(NEWS_CAROUSELS, "Couldn't load updates. Try again.", true, () => {
        newsLoaded = false;
        loadNews();
      });
    }
  }

  async function loadFranchises() {
    const curatedQueries = [
      'Star Wars',
      'Harry Potter',
      'James Bond',
      'Marvel',
      'The Lord of the Rings'
    ];

    const results = await Promise.allSettled(
      curatedQueries.map(async (q) => {
        const data = await Api.searchCollections(q, 1);
        const first = (data.results || [])[0];
        if (!first?.id) return null;
        const details = await Api.getCollectionDetails(first.id);
        return details || null;
      })
    );

    return results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter(Boolean);
  }

  let collectionsLoaded = false;
  async function loadCollections() {
    if (!Api.hasKey) return;
    const { COLLECTIONS_CAROUSELS } = window.App.const || {};

    const cached = State.getSectionCache && State.getSectionCache('collections');
    if (cached && cached.topRated && cached.popular) {
      if (cached.franchises && Array.isArray(cached.franchises)) {
        window.App.renderCarousel('collections-franchises', cached.franchises);
      }
      renderPagedRow('collections-top-rated', cached.topRated, (p) => Api.getTopRatedMovies(p));
      renderPagedRow('collections-popular', cached.popular, (p) => Api.getPopularMovies(p));
      collectionsLoaded = true;
      return;
    }

    if (collectionsLoaded) return;
    collectionsLoaded = true;

    window.App.setCarouselsLoading(COLLECTIONS_CAROUSELS);
    try {
      const franchises = await loadFranchises();
      const [topRated, popular] = await Promise.all([
        Api.getTopRatedMovies(1),
        Api.getPopularMovies(1)
      ]);

      if (State.setSectionCache) State.setSectionCache('collections', { franchises, topRated, popular });

      window.App.renderCarousel('collections-franchises', franchises);
      renderPagedRow('collections-top-rated', topRated, (p) => Api.getTopRatedMovies(p));
      renderPagedRow('collections-popular', popular, (p) => Api.getPopularMovies(p));
    } catch (err) {
      console.error('Failed to load collections', err);
      window.App.setCarouselsMessage(COLLECTIONS_CAROUSELS, "Couldn't load collections. Try again.", true, () => {
        collectionsLoaded = false;
        loadCollections();
      });
    }
  }

  window.App.loadHome = loadHome;
  window.App.loadLibrary = loadLibrary;
  window.App.loadNewSeries = loadNewSeries;
  window.App.loadNews = loadNews;
  window.App.loadCollections = loadCollections;
})();

