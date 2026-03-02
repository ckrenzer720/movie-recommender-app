/**
 * Top navigation: highlight active section, handle clicks.
 */

const Nav = {
  nav: null,
  links: [],

  init() {
    this.nav = document.querySelector('.main-nav');
    if (!this.nav) return;
    this.links = this.nav.querySelectorAll('.nav-link');
    this.links.forEach((link) => {
      link.addEventListener('click', (e) => this.onClick(e, link));
    });
    this.setActive(State.currentSection);
  },

  onClick(e, link) {
    e.preventDefault();
    const section = link.getAttribute('data-section') || 'home';
    State.setSection(section);
    this.setActive(section);
    window.dispatchEvent(new CustomEvent('sectionchange', { detail: { section } }));
  },

  setActive(section) {
    this.links.forEach((link) => {
      const isActive = link.getAttribute('data-section') === section;
      link.classList.toggle('is-active', isActive);
    });
  }
};
