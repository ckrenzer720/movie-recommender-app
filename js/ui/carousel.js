/**
 * Carousel: native horizontal scroll (CSS scroll-snap).
 * Arrows/dots can be added later via Carousel.scroll(name, delta).
 */

const Carousel = {
  nodes: [],

  init() {
    const carousels = document.querySelectorAll('[data-carousel]');
    carousels.forEach(el => this.nodes.push(el));
  },

  /**
   * Scroll carousel by offset (for future prev/next buttons)
   * @param {string} name - data-carousel value
   * @param {number} delta
   */
  scroll(name, delta) {
    const el = document.querySelector(`[data-carousel="${name}"]`);
    if (el) el.scrollBy({ left: delta, behavior: 'smooth' });
  }
};
