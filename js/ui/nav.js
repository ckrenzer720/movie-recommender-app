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
    this.links.forEach((link, i) => {
      link.addEventListener('click', (e) => this.onClick(e, link, i));
    });
    this.setActive(State.currentSection);
  },

  onClick(e, link, index) {
    e.preventDefault();
    const sections = ['new-series', 'library', 'news', 'collections', 'favorites'];
    const section = sections[index] || 'home';
    State.setSection(section);
    this.setActive(section);
    // TODO: filter content or navigate when we have multiple views
  },

  setActive(section) {
    this.links.forEach((link, i) => {
      const sections = ['new-series', 'library', 'news', 'collections', 'favorites'];
      const isActive = sections[i] === section;
      link.classList.toggle('is-active', isActive);
    });
  }
};
