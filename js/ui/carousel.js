/**
 * Carousel behavior: optional Embla wiring or native scroll.
 * For now, uses native horizontal scroll (CSS scroll-snap).
 */

const Carousel = {
  nodes: [],

  init() {
    const carousels = document.querySelectorAll('[data-carousel]');
    carousels.forEach(el => this.nodes.push(el));
    // Optional: integrate Embla here for arrows/dots
    // import EmblaCarousel from 'embla-carousel';
    // this.nodes.forEach(node => EmblaCarousel(node, { align: 'start', loop: false }));
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
