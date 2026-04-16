/**
 * Hybrid recommendations for the Home "Recommendations" row.
 *
 * Strategy:
 * - Seed movies: user's favorites (up to N).
 * - Collaborative-ish: TMDB /movie/{id}/recommendations for each seed.
 * - Content-ish: TMDB discover seeded by top genres from favorites.
 * - Merge + dedupe, filter by user sliders, score, attach an explanation:
 *   { __reason: "Because you liked <title>" } or "Matches your taste: <genres>"
 */
(
  function () {
    window.App = window.App || {};
    const STORAGE_KEY = 'movie-recommender-reco-filters-v1';

    const DEFAULT_FILTERS = {
      genreId: '', // '' = any
      decade: '', // '' = any, else "1990" etc.
      runtimeMin: 60,
      runtimeMax: 180
    };

    function clamp(n, min, max) {
      const x = Number(n);
      if (!Number.isFinite(x)) return min;
      return Math.min(max, Math.max(min, x));
    }

    function loadFilters() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_FILTERS };
        const parsed = JSON.parse(raw);
        return normalizeFilters(parsed);
      } catch {
        return { ...DEFAULT_FILTERS };
      }
    }

    function saveFilters(filters) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (_) {}
    }

    function normalizeFilters(input) {
      const genreId = input?.genreId ? String(input.genreId) : '';
      const decade = input?.decade ? String(input.decade) : '';
      const runtimeMin = clamp(input?.runtimeMin ?? DEFAULT_FILTERS.runtimeMin, 0, 500);
      const runtimeMax = clamp(input?.runtimeMax ?? DEFAULT_FILTERS.runtimeMax, 0, 500);
      const fixedMin = Math.min(runtimeMin, runtimeMax);
      const fixedMax = Math.max(runtimeMin, runtimeMax);
      return { genreId, decade, runtimeMin: fixedMin, runtimeMax: fixedMax };
    }

    function getSeedMovies() {
      const favs = State.getFavorites?.() || [];
      // Prefer most recently added favorites (end of array).
      return favs.slice(-5).reverse();
    }

    function getDecadeRange(decadeStr) {
      const decade = Number(decadeStr);
      if (!Number.isFinite(decade) || decade < 1900 || decade > 2100) return null;
      const start = `${decade}-01-01`;
      const end = `${decade + 9}-12-31`;
      return { start, end };
    }

    function buildDiscoverParams({ filters, topGenreIds }) {
      const params = {
        sort_by: 'popularity.desc'
      };

      const genreTokens = [];
      if (filters.genreId) genreTokens.push(filters.genreId);
      (topGenreIds || []).forEach((id) => genreTokens.push(String(id)));
      const unique = Array.from(new Set(genreTokens.filter(Boolean)));
      if (unique.length) params.with_genres = unique.join(',');

      if (Number.isFinite(filters.runtimeMin)) params['with_runtime.gte'] = String(filters.runtimeMin);
      if (Number.isFinite(filters.runtimeMax)) params['with_runtime.lte'] = String(filters.runtimeMax);

      const decadeRange = filters.decade ? getDecadeRange(filters.decade) : null;
      if (decadeRange) {
        params['primary_release_date.gte'] = decadeRange.start;
        params['primary_release_date.lte'] = decadeRange.end;
      }
      return params;
    }

    function yearFromReleaseDate(releaseDate) {
      const y = Number(String(releaseDate || '').slice(0, 4));
      return Number.isFinite(y) ? y : null;
    }

    function passesFilters(movie, filters) {
      if (!movie || typeof movie !== 'object') return false;

      if (filters.genreId) {
        const g = Number(filters.genreId);
        if (Number.isFinite(g) && Array.isArray(movie.genre_ids)) {
          if (!movie.genre_ids.includes(g)) return false;
        }
      }

      if (filters.decade) {
        const decade = Number(filters.decade);
        const y = yearFromReleaseDate(movie.release_date);
        if (Number.isFinite(decade) && Number.isFinite(y)) {
          if (y < decade || y > decade + 9) return false;
        }
      }

      // Runtime filter is best-effort (TMDB lists here won't have runtime),
      // so we only strictly filter when runtime is present.
      if (typeof movie.runtime === 'number' && Number.isFinite(movie.runtime)) {
        if (movie.runtime < filters.runtimeMin || movie.runtime > filters.runtimeMax) return false;
      }

      return true;
    }

    function topGenresFromSeeds(seeds) {
      const counts = new Map();
      (seeds || []).forEach((m) => {
        (m.genre_ids || []).forEach((id) => {
          if (typeof id !== 'number') return;
          counts.set(id, (counts.get(id) || 0) + 1);
        });
      });
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([id]) => id);
    }

    function addCandidate(map, movie, contribution) {
      if (!movie || typeof movie !== 'object') return;
      const id = Number(movie.id);
      if (!Number.isFinite(id) || id < 1) return;
      const existing = map.get(id);
      if (!existing) {
        map.set(id, { movie, score: 0, sources: new Set(), seedTitle: null, reasons: [] });
      }
      const row = map.get(id);
      row.sources.add(contribution.source);
      row.score += contribution.score || 0;
      if (contribution.seedTitle) {
        row.seedTitle = row.seedTitle || contribution.seedTitle;
        row.reasons.push(contribution.seedTitle);
      }
      row.movie = { ...row.movie, ...movie };
    }

    function genreOverlapScore(movie, seeds) {
      if (!movie?.genre_ids?.length) return 0;
      const seedGenreSet = new Set();
      (seeds || []).forEach((s) => (s.genre_ids || []).forEach((g) => seedGenreSet.add(g)));
      let overlap = 0;
      movie.genre_ids.forEach((g) => {
        if (seedGenreSet.has(g)) overlap += 1;
      });
      return overlap * 0.6;
    }

    function decorateReason(row, seeds) {
      const movie = row.movie;
      if (!movie || typeof movie !== 'object') return movie;

      const seedTitle = row.seedTitle;
      if (seedTitle) {
        return { ...movie, __reason: `Because you liked ${seedTitle}` };
      }

      const topGenres = Api.genreIdsToNamesSync(movie.genre_ids || []);
      if (topGenres) {
        return { ...movie, __reason: `Matches your taste: ${topGenres}` };
      }

      if ((seeds || []).length) {
        return { ...movie, __reason: 'Based on your favorites' };
      }
      return movie;
    }

    async function loadHomeRecommendations(filters) {
      if (!Api.hasKey) return [];

      const seeds = getSeedMovies();
      const seedIds = new Set(seeds.map((m) => m.id));

      // If no favorites yet, keep behavior close to current: popular slice.
      if (!seeds.length) {
        const popular = await Api.getPopularMovies(1);
        return (popular.results || []).slice(0, 10).map((m) => ({ ...m, __reason: 'Popular right now' }));
      }

      const candidates = new Map();

      // Collaborative-ish: TMDB recommendations per seed.
      const seedCalls = seeds.slice(0, 3).map(async (seed) => {
        const data = await Api.getMovieRecommendations(seed.id, 1);
        const list = data.results || [];
        list.forEach((m, idx) => {
          addCandidate(candidates, m, {
            source: 'tmdb-recommendations',
            score: 8 - Math.min(7, idx / 4),
            seedTitle: seed.title
          });
        });
      });

      // Content-ish: discover from top genres + filters.
      const topGenreIds = topGenresFromSeeds(seeds);
      const discoverParams = buildDiscoverParams({ filters, topGenreIds });
      const discoverCall = Api.discoverMovies({ ...discoverParams, page: 1 }).then((data) => {
        (data.results || []).forEach((m, idx) => {
          addCandidate(candidates, m, { source: 'discover', score: 4.5 - Math.min(4, idx / 8) });
        });
      });

      await Promise.allSettled([...seedCalls, discoverCall]);

      // Final scoring tweaks + filtering.
      const favIds = new Set((State.getFavorites?.() || []).map((m) => m.id));
      const out = [];
      candidates.forEach((row) => {
        const id = Number(row.movie?.id);
        if (!Number.isFinite(id)) return;
        if (favIds.has(id)) return;
        if (seedIds.has(id)) return;
        row.score += row.sources.size * 1.2;
        row.score += genreOverlapScore(row.movie, seeds);
        if (!passesFilters(row.movie, filters)) return;
        out.push(row);
      });

      out.sort((a, b) => b.score - a.score);
      return out.slice(0, 12).map((row) => decorateReason(row, seeds));
    }

    function renderRecommendationsWithLoading(filters) {
      window.App.setCarouselLoading?.('recommendations');
      return loadHomeRecommendations(filters)
        .then((movies) => {
          window.App.renderCarousel?.('recommendations', movies);
          if (!movies.length) {
            window.App.setCarouselMessage?.('recommendations', 'No recommendations match your filters yet.', false);
          }
        })
        .catch((err) => {
          console.error('Failed to load recommendations', err);
          window.App.setCarouselMessage?.('recommendations', "Couldn't load recommendations. Try again.", true, undefined, () => {
            renderRecommendationsWithLoading(filters);
          });
        });
    }

    function initRecommendationControls() {
      const root = document.querySelector('[data-reco-controls]');
      if (!root) return;
      const filters = loadFilters();

      const genreSelect = root.querySelector('[data-reco-genre]');
      const decadeSelect = root.querySelector('[data-reco-decade]');
      const rtMin = root.querySelector('[data-reco-runtime-min]');
      const rtMax = root.querySelector('[data-reco-runtime-max]');
      const rtMinLabel = root.querySelector('[data-reco-runtime-min-label]');
      const rtMaxLabel = root.querySelector('[data-reco-runtime-max-label]');
      const applyBtn = root.querySelector('[data-reco-apply]');
      const resetBtn = root.querySelector('[data-reco-reset]');

      if (genreSelect) genreSelect.value = filters.genreId;
      if (decadeSelect) decadeSelect.value = filters.decade;
      if (rtMin) rtMin.value = String(filters.runtimeMin);
      if (rtMax) rtMax.value = String(filters.runtimeMax);

      function syncRuntimeLabels() {
        const minV = clamp(rtMin?.value ?? filters.runtimeMin, 0, 500);
        const maxV = clamp(rtMax?.value ?? filters.runtimeMax, 0, 500);
        if (rtMinLabel) rtMinLabel.textContent = String(Math.min(minV, maxV));
        if (rtMaxLabel) rtMaxLabel.textContent = String(Math.max(minV, maxV));
      }
      syncRuntimeLabels();
      rtMin?.addEventListener('input', syncRuntimeLabels);
      rtMax?.addEventListener('input', syncRuntimeLabels);

      async function apply() {
        const next = normalizeFilters({
          genreId: genreSelect ? genreSelect.value : '',
          decade: decadeSelect ? decadeSelect.value : '',
          runtimeMin: rtMin ? rtMin.value : DEFAULT_FILTERS.runtimeMin,
          runtimeMax: rtMax ? rtMax.value : DEFAULT_FILTERS.runtimeMax
        });
        saveFilters(next);
        await renderRecommendationsWithLoading(next);
      }

      function reset() {
        const next = { ...DEFAULT_FILTERS };
        saveFilters(next);
        if (genreSelect) genreSelect.value = next.genreId;
        if (decadeSelect) decadeSelect.value = next.decade;
        if (rtMin) rtMin.value = String(next.runtimeMin);
        if (rtMax) rtMax.value = String(next.runtimeMax);
        syncRuntimeLabels();
        renderRecommendationsWithLoading(next);
      }

      applyBtn?.addEventListener('click', (e) => { e.preventDefault(); apply(); });
      resetBtn?.addEventListener('click', (e) => { e.preventDefault(); reset(); });

      // Populate genre list (async) if empty.
      if (genreSelect && genreSelect.options.length <= 1 && Api.hasKey) {
        Api.getGenres().then((genres) => {
          (genres || []).forEach((g) => {
            const opt = document.createElement('option');
            opt.value = String(g.id);
            opt.textContent = g.name;
            genreSelect.appendChild(opt);
          });
          genreSelect.value = loadFilters().genreId;
        }).catch(() => {});
      }
    }

    window.App.initRecommendationControls = initRecommendationControls;
    window.App.loadHomeRecommendations = (opts = {}) => {
      const filters = normalizeFilters(opts.filters || loadFilters());
      return renderRecommendationsWithLoading(filters);
    };
  }
)();

