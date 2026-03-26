/**
 * Pagination + "Load more" footer per carousel.
 */

(function () {
  window.App = window.App || {};

  /**
   * Pagination state per carousel name.
   * { page, totalPages, loading, fetchPage(page)->Promise<{results,page,total_pages}> }
   */
  const pagination = Object.create(null);

  function getCarouselFooter(name) {
    return document.querySelector(`[data-carousel-footer="${name}"]`);
  }

  function ensureCarouselFooter(name) {
    const container = window.App.getCarouselContainer?.(name);
    if (!container) return null;

    const existing = getCarouselFooter(name);
    if (existing) return existing;

    const footer = document.createElement('div');
    footer.className = 'carousel__footer';
    footer.dataset.carouselFooter = name;
    container.insertAdjacentElement('afterend', footer);
    return footer;
  }

  function updateLoadMoreButton(name) {
    const state = pagination[name];
    if (!state) return;

    const footer = ensureCarouselFooter(name);
    if (!footer) return;

    const { page, totalPages, loading } = state;
    const hasMore = Number.isFinite(totalPages) && totalPages > 0 ? page < totalPages : false;

    footer.innerHTML = '';
    if (!hasMore) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--ghost carousel__load-more';
    btn.textContent = loading ? 'Loading…' : 'Load more';
    btn.disabled = loading;
    btn.addEventListener('click', () => loadMore(name));
    footer.appendChild(btn);
  }

  async function loadMore(name) {
    const state = pagination[name];
    if (!state || state.loading) return;

    const container = window.App.getCarouselContainer?.(name);
    if (!container) return;

    const nextPage = (state.page || 1) + 1;
    if (state.totalPages && nextPage > state.totalPages) return;

    state.loading = true;
    updateLoadMoreButton(name);
    try {
      const data = await state.fetchPage(nextPage);
      const items = data?.results || [];
      window.App.renderCarousel?.(name, items, { append: true });
      state.page = data?.page || nextPage;
      state.totalPages = data?.total_pages || state.totalPages || 0;
    } catch (err) {
      console.error('Load more failed for', name, err);
    } finally {
      state.loading = false;
      updateLoadMoreButton(name);
    }
  }

  function setPagination(name, { page, totalPages, fetchPage }) {
    if (typeof fetchPage !== 'function') return;
    pagination[name] = {
      page: Number(page) || 1,
      totalPages: Number(totalPages) || 0,
      loading: false,
      fetchPage
    };
    updateLoadMoreButton(name);
  }

  window.App.setPagination = setPagination;
  window.App.updateLoadMoreButton = updateLoadMoreButton;
})();

