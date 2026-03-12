/**
 * Top navigation: highlight active section, handle clicks.
 * On small screens: hamburger toggles overlay menu; bar shows Home + Favorites only.
 */

const Nav = {
  nav: null,
  links: [],
  toggle: null,
  menu: null,

  init() {
    this.nav = document.querySelector('.main-nav');
    if (!this.nav) return;
    this.links = this.nav.querySelectorAll('.nav-link');
    this.toggle = document.getElementById('nav-toggle');
    this.menu = document.getElementById('nav-menu');

    this.links.forEach((link) => {
      link.addEventListener('click', (e) => this.onClick(e, link));
    });
    this.setActive(State.currentSection);

    if (this.toggle && this.menu) {
      this.menu.setAttribute('aria-hidden', 'true');
      this.toggle.addEventListener('click', () => this.toggleMenu());
      this.menu.addEventListener('click', (e) => {
        if (e.target === this.menu) this.closeMenu();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen()) this.closeMenu();
      });
    }
  },

  isOpen() {
    return this.menu && this.menu.classList.contains('is-open');
  },

  openMenu() {
    if (!this.menu || !this.toggle) return;
    this.menu.classList.add('is-open');
    this.menu.setAttribute('aria-hidden', 'false');
    this.toggle.setAttribute('aria-expanded', 'true');
    this.toggle.setAttribute('aria-label', 'Close menu');
  },

  closeMenu() {
    if (!this.menu || !this.toggle) return;
    this.menu.classList.remove('is-open');
    this.menu.setAttribute('aria-hidden', 'true');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.setAttribute('aria-label', 'Open menu');
  },

  toggleMenu() {
    if (this.isOpen()) this.closeMenu();
    else this.openMenu();
  },

  onClick(e, link) {
    e.preventDefault();
    const section = link.getAttribute('data-section') || 'home';
    State.setSection(section);
    this.setActive(section);
    if (this.isOpen()) this.closeMenu();
    window.dispatchEvent(new CustomEvent('sectionchange', { detail: { section } }));
  },

  setActive(section) {
    this.links.forEach((link) => {
      const isActive = link.getAttribute('data-section') === section;
      link.classList.toggle('is-active', isActive);
    });
  }
};
