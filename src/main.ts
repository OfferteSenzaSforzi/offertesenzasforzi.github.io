import { gsap } from 'gsap';
import MotionPathPlugin from 'gsap/MotionPathPlugin';

gsap.registerPlugin(MotionPathPlugin);

const ROUTES = ['home', 'offerte', 'tracking', 'wishlist-ai', 'smart-care', 'prezzi', 'forum'] as const;
type Route = (typeof ROUTES)[number];

const ROUTE_PATHS: Record<Route, string> = {
  home: '/',
  offerte: '/offerte/',
  tracking: '/tracking/',
  'wishlist-ai': '/wishlist-ai/',
  'smart-care': '/smart-care/',
  prezzi: '/prezzi/',
  forum: '/forum/',
};

const PAGE_TITLES: Record<Route, string> = {
  home: 'Offerte senza sforzi con Germano | OfferteSenzaSforzi',
  offerte: 'Offerte Amazon scelte da Germano | OfferteSenzaSforzi',
  tracking: 'Tracking prezzi Amazon con Germano | OfferteSenzaSforzi',
  'wishlist-ai': 'Wishlist AI per trovare prodotti | OfferteSenzaSforzi',
  'smart-care': 'Smart Care: promemoria intelligenti | OfferteSenzaSforzi',
  prezzi: 'Piani e prezzi | OfferteSenzaSforzi',
  forum: 'Forum in arrivo | OfferteSenzaSforzi',
};

let activeRoute: Route | null = null;
let pageMotion: gsap.Context | null = null;
let menuMotion: gsap.Context | null = null;
let sceneObserver: IntersectionObserver | null = null;
let focusNextPage = false;

document.addEventListener('DOMContentLoaded', initSite);

function initSite(): void {
  setCurrentYear();
  initNavigation();
  initOfferDemo();
  if (redirectLegacyHash()) return;
  renderRoute();
  window.addEventListener('hashchange', redirectLegacyHash);
}

function setCurrentYear(): void {
  const year = String(new Date().getFullYear());
  document.querySelectorAll<HTMLElement>('[data-current-year]').forEach((element) => {
    element.textContent = year;
  });
}

function readRoute(): Route {
  const declaredRoute = document.body.dataset.route;
  if (ROUTES.includes(declaredRoute as Route)) return declaredRoute as Route;

  const path = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  return ROUTES.find((route) => ROUTE_PATHS[route].replace(/\/$/, '') === path) ?? 'home';
}

function redirectLegacyHash(): boolean {
  const hashRoute = window.location.hash.slice(1) as Route;
  if (!ROUTES.includes(hashRoute)) return false;
  window.location.replace(ROUTE_PATHS[hashRoute]);
  return true;
}

function renderRoute(): void {
  const route = readRoute();
  const page = document.querySelector<HTMLElement>(`[data-page="${route}"]`);
  if (!page) return;

  const routeChanged = activeRoute !== null && activeRoute !== route;
  sceneObserver?.disconnect();
  sceneObserver = null;
  pageMotion?.revert();
  pageMotion = null;

  document.querySelectorAll<HTMLElement>('[data-page]').forEach((candidate) => {
    candidate.hidden = candidate !== page;
  });

  activeRoute = route;
  document.title = PAGE_TITLES[route];
  updateCurrentLinks(route);
  closeMenu(false);
  if (routeChanged && window.matchMedia('(max-width: 900px)').matches) window.scrollTo(0, 0);
  animatePage(page, route);

  if (focusNextPage) {
    focusNextPage = false;
    const heading = page.querySelector<HTMLElement>('h1');
    heading?.setAttribute('tabindex', '-1');
    window.requestAnimationFrame(() => heading?.focus({ preventScroll: true }));
  }
}

function updateCurrentLinks(route: Route): void {
  document.querySelectorAll<HTMLElement>('.site-header [data-route-link]').forEach((link) => {
    if (link.dataset.routeLink === route) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function initNavigation(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const panel = document.querySelector<HTMLElement>('.nav-panel');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const shouldOpen = toggle.getAttribute('aria-expanded') !== 'true';
    setMenu(shouldOpen);
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const routeLink = target?.closest<HTMLAnchorElement>('a[data-route-link]');

    if (routeLink) {
      focusNextPage = true;
      if (routeLink.dataset.routeLink === activeRoute) {
        event.preventDefault();
        focusNextPage = false;
        closeMenu(false);
        const heading = document.querySelector<HTMLElement>(`[data-page="${activeRoute}"] h1`);
        heading?.setAttribute('tabindex', '-1');
        heading?.focus({ preventScroll: true });
      }
      return;
    }

    if (panel.classList.contains('is-open') && !target?.closest('.site-header')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (!panel.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      closeMenu();
      return;
    }

    if (event.key !== 'Tab') return;
    const controls = [toggle, ...panel.querySelectorAll<HTMLElement>('a[href]')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.matchMedia('(min-width: 1061px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu(false);
  });
}

function initOfferDemo(): void {
  const stage = document.querySelector<HTMLElement>('.offers-stage');
  const card = stage?.querySelector<HTMLElement>('.deal-card-main');
  const stacks = stage?.querySelectorAll<HTMLElement>('.deal-stack');
  const notice = stage?.querySelector<HTMLElement>('[data-offer-notice]');
  const noticeTitle = notice?.querySelector<HTMLElement>('[data-offer-notice-title]');
  const noticeDetail = notice?.querySelector<HTMLElement>('[data-offer-notice-detail]');
  const noticeIcon = notice?.querySelector<HTMLElement>('[data-offer-notice-icon]');
  const status = stage?.querySelector<HTMLElement>('[data-offer-status]');
  const discard = stage?.querySelector<HTMLButtonElement>('[data-offer-action="discard"]');
  const refresh = stage?.querySelector<HTMLButtonElement>('[data-offer-action="refresh"]');
  const save = stage?.querySelector<HTMLButtonElement>('[data-offer-action="save"]');
  const recover = stage?.querySelector<HTMLButtonElement>('[data-offer-action="recover"]');
  if (!stage || !card || !stacks?.length || !notice || !noticeTitle || !noticeDetail || !noticeIcon || !status || !discard || !refresh || !save || !recover) return;

  let motion: gsap.core.Timeline | null = null;
  let discarded = false;
  const reducedMotion = prefersReducedMotion();

  const announce = (message: string): void => {
    status.textContent = message;
  };

  const setAvailableActions = (available: boolean): void => {
    discard.disabled = !available;
    save.disabled = !available;
  };

  const showNotice = (title: string, detail: string, canRecover: boolean): void => {
    noticeTitle.textContent = title;
    noticeDetail.textContent = detail;
    recover.hidden = !canRecover;
    notice.setAttribute('aria-hidden', 'false');
    gsap.killTweensOf(notice);
    if (reducedMotion) {
      gsap.set(notice, { autoAlpha: 1, x: 0, y: 0 });
      return;
    }
    gsap.fromTo(notice, { autoAlpha: 0, x: 34, y: 10 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.42, ease: 'power3.out' });
  };

  const reset = (withMotion = true): void => {
    motion?.kill();
    gsap.killTweensOf([card, stacks, notice, noticeIcon, discard, refresh, save]);
    discarded = false;
    setAvailableActions(true);
    save.setAttribute('aria-pressed', 'false');
    notice.setAttribute('aria-hidden', 'true');
    recover.hidden = true;
    gsap.set(notice, { autoAlpha: 0, x: 0, y: 0 });
    gsap.set(card, { clearProps: 'opacity,visibility,transform' });
    gsap.set(stacks, { clearProps: 'transform' });
    if (withMotion && !reducedMotion) {
      gsap.fromTo(card, { scale: 0.97 }, { scale: 1, duration: 0.38, ease: 'back.out(1.6)', clearProps: 'scale' });
      gsap.fromTo(refresh.querySelector('span'), { rotate: -160 }, { rotate: 0, duration: 0.42, ease: 'power2.out' });
    }
    if (withMotion) announce('Offerta aggiornata e pronta per una nuova scelta.');
  };

  discard.addEventListener('click', () => {
    if (discarded) return;
    motion?.kill();
    discarded = true;
    setAvailableActions(false);
    save.setAttribute('aria-pressed', 'false');
    notice.setAttribute('aria-hidden', 'true');
    gsap.set(notice, { autoAlpha: 0 });
    if (reducedMotion) {
      gsap.set(card, { autoAlpha: 0 });
      showNotice('Offerta negli scarti', 'Premi il cuore per recuperarla.', true);
      announce('Offerta spostata negli scarti. Puoi recuperarla con il cuore.');
      recover.focus({ preventScroll: true });
      return;
    }
    motion = gsap.timeline({ defaults: { ease: 'power3.inOut' } })
      .to(discard.querySelector('span'), { scale: 0.72, rotate: 90, duration: 0.16 })
      .to(discard.querySelector('span'), { scale: 1, rotate: 0, duration: 0.22, ease: 'back.out(2)' })
      .to(card, { xPercent: -135, y: 18, rotate: -14, autoAlpha: 0, duration: 0.58 }, 0.08)
      .to('.deal-shadow-one', { x: -10, rotate: -2, duration: 0.42 }, 0.16)
      .call(() => {
        showNotice('Offerta negli scarti', 'Premi il cuore per recuperarla.', true);
        announce('Offerta spostata negli scarti. Puoi recuperarla con il cuore.');
        recover.focus({ preventScroll: true });
      }, [], 0.54);
  });

  save.addEventListener('click', () => {
    if (discarded) return;
    motion?.kill();
    save.setAttribute('aria-pressed', 'true');
    if (reducedMotion) {
      showNotice('Salvata nei preferiti', 'La ritroverai quando vuoi.', false);
      announce('Offerta salvata nei preferiti.');
      return;
    }
    motion = gsap.timeline()
      .to(save.querySelector('span'), { scale: 1.32, rotate: -10, duration: 0.18, ease: 'power2.out' })
      .to(save.querySelector('span'), { scale: 1, rotate: 0, duration: 0.34, ease: 'elastic.out(1, 0.45)' })
      .to(card, { x: 8, y: -5, rotate: -1, duration: 0.2, ease: 'power2.out' }, 0)
      .to(card, { x: 0, y: 0, rotate: -3, duration: 0.38, ease: 'back.out(1.5)', clearProps: 'x,y,rotation' }, 0.2)
      .call(() => {
        showNotice('Salvata nei preferiti', 'La ritroverai quando vuoi.', false);
        announce('Offerta salvata nei preferiti.');
      }, [], 0.32);
  });

  recover.addEventListener('click', () => {
    if (!discarded) return;
    motion?.kill();
    discarded = false;
    setAvailableActions(true);
    save.setAttribute('aria-pressed', 'true');
    recover.hidden = true;
    noticeTitle.textContent = 'Offerta recuperata';
    noticeDetail.textContent = 'Di nuovo tra i preferiti.';
    if (reducedMotion) {
      gsap.set(card, { autoAlpha: 1, clearProps: 'transform' });
      announce('Offerta recuperata e aggiunta ai preferiti.');
      save.focus({ preventScroll: true });
      return;
    }
    motion = gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(card, { xPercent: -135, y: 18, rotate: -14, autoAlpha: 0 }, { xPercent: 0, y: 0, rotate: -3, autoAlpha: 1, duration: 0.68 })
      .fromTo(noticeIcon, { scale: 0.5, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.42, ease: 'back.out(2)' }, 0.28)
      .fromTo(save.querySelector('span'), { scale: 0.7 }, { scale: 1, duration: 0.42, ease: 'back.out(2)' }, 0.34)
      .call(() => {
        announce('Offerta recuperata e aggiunta ai preferiti.');
        save.focus({ preventScroll: true });
      });
  });

  refresh.addEventListener('click', () => reset());
  reset(false);
}

function setMenu(open: boolean, moveFocus = true): void {
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const panel = document.querySelector<HTMLElement>('.nav-panel');
  if (!toggle || !panel) return;

  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
  panel.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
  document.querySelector<HTMLElement>('main')?.toggleAttribute('inert', open);
  document.querySelector<HTMLElement>('footer')?.toggleAttribute('inert', open);

  menuMotion?.revert();
  menuMotion = null;
  if (open && !prefersReducedMotion()) {
    menuMotion = gsap.context(() => {
      gsap.fromTo(
        panel.querySelectorAll('.nav-links a, .nav-support > *'),
        { opacity: 0.35, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.035, ease: 'power2.out' },
      );
    }, panel);
  }

  if (open && moveFocus) {
    window.requestAnimationFrame(() => panel.querySelector<HTMLElement>('a[href]')?.focus());
  } else if (!open && moveFocus && panel.contains(document.activeElement)) {
    toggle.focus();
  }
}

function closeMenu(moveFocus = true): void {
  setMenu(false, moveFocus);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animatePage(page: HTMLElement, route: Route): void {
  if (prefersReducedMotion()) return;

  const compact = window.matchMedia('(max-width: 900px)').matches;
  pageMotion = gsap.context(() => {
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const journeyItems = page.querySelectorAll('.journey li, .micro-journey li, .forum-promise span');
    const supportingItems = page.querySelectorAll('.fine-note, .hero-actions, .primary-link');

    timeline
      .from(page, { opacity: 0, duration: 0.28 })
      .from('.eyebrow', { opacity: 0, x: compact ? 0 : -22, y: compact ? 10 : 0, duration: 0.42 }, 0.05)
      .from('h1', { opacity: 0, y: 28, clipPath: 'inset(0 0 100% 0)', duration: 0.72 }, 0.1)
      .from('.lead', { opacity: 0, y: 18, duration: 0.5 }, 0.32);

    if (journeyItems.length) {
      timeline.from(journeyItems, { opacity: 0, y: 14, stagger: 0.07, duration: 0.38 }, 0.44);
    }
    if (supportingItems.length) {
      timeline.from(supportingItems, { opacity: 0, y: 12, duration: 0.38 }, 0.56);
    }

    if (!compact) {
      animateScene(timeline, route, false);
      return;
    }

    const scene = page.querySelector<HTMLElement>('[data-scene], .pricing-grid');
    if (!scene) return;

    const sceneTimeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    animateScene(sceneTimeline, route, true);

    if (!('IntersectionObserver' in window)) {
      sceneTimeline.play();
      return;
    }

    sceneObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        sceneTimeline.play();
        sceneObserver?.disconnect();
        sceneObserver = null;
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    sceneObserver.observe(scene);
  }, page);
}

function animateScene(timeline: gsap.core.Timeline, route: Route, compact: boolean): void {
  switch (route) {
    case 'home':
      timeline
        .from('.hero-stage', { opacity: 0, scale: 0.96, duration: 0.75 }, 0.08)
        .from('.hero-orbit', { opacity: 0, scale: 0.55, rotate: -30, duration: 0.9 }, 0.18)
        .from('.hero-mascot', {
          opacity: 0,
          x: compact ? 0 : 70,
          y: compact ? 0 : 20,
          scale: compact ? 0.86 : 1,
          rotate: 5,
          transformOrigin: 'right bottom',
          duration: 0.9,
        }, 0.26)
        .from('.app-preview', { opacity: 0, x: compact ? -28 : -70, y: 28, rotate: -10, duration: 0.76 }, 0.42)
        .from('.signal-card', { opacity: 0, y: 22, scale: 0.86, stagger: 0.13, duration: 0.5 }, 0.72)
        .to('.hero-mascot', { y: '-=7', duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 1.2)
        .to('.signal-price', { y: '-=5', duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 1.35);
      break;

    case 'offerte':
      timeline
        .from('.offers-stage', { opacity: 0, scale: 0.96, duration: 0.7 }, 0.12)
        .from('.deal-stack', { opacity: 0, x: compact ? 12 : 50, rotate: 0, stagger: 0.08, duration: 0.55 }, 0.28)
        .from('.deal-card-main', { opacity: 0, y: 45, rotate: -8, duration: 0.68 }, 0.36)
        .from('.decision-actions button', { opacity: 0, y: 14, scale: 0.78, stagger: 0.07, duration: 0.4 }, 0.63);
      break;

    case 'tracking': {
      const trackerLine = document.querySelector<SVGPathElement>('.tracker-line');
      if (!trackerLine) break;
      const trackerLineLength = trackerLine.getTotalLength();

      timeline
        .set('.tracker-point', { opacity: 0 }, 0)
        .from('.tracking-stage', { opacity: 0, scale: 0.96, duration: 0.68 }, 0.12)
        .from('.tracker-panel', { opacity: 0, y: 34, duration: 0.62 }, 0.28)
        .from('.range-values p', { opacity: 0, y: 12, stagger: 0.1, duration: 0.38 }, 0.48)
        .from('.range-band', { scaleY: 0, duration: 0.48 }, 0.58)
        .fromTo(
          trackerLine,
          { strokeDasharray: trackerLineLength, strokeDashoffset: trackerLineLength },
          { strokeDasharray: trackerLineLength, strokeDashoffset: 0, duration: 2.2, ease: 'sine.inOut' },
          0.62,
        )
        .set('.tracker-point', {
          opacity: 0,
          scale: 0.76,
          transformOrigin: 'center',
          motionPath: {
            path: trackerLine,
            align: trackerLine,
            alignOrigin: [0.5, 0.5],
            end: 0,
          },
        }, 0.62)
        .to('.tracker-point', { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }, 0.62)
        .to('.tracker-point', {
          motionPath: {
            path: trackerLine,
            align: trackerLine,
            alignOrigin: [0.5, 0.5],
            end: 1,
          },
          duration: 2.2,
          ease: 'sine.inOut',
        }, 0.62)
        .from('.tracking-push', { opacity: 0, y: 18, duration: 0.62, ease: 'power2.out' }, 2.78);
      break;
    }

    case 'wishlist-ai':
      timeline
        .from('.ai-stage', { opacity: 0, scale: 0.96, duration: 0.68 }, 0.12)
        .from('.wishlist-phone', { opacity: 0, x: compact ? -24 : -62, rotate: -9, duration: 0.72 }, 0.3)
        .from('.wish-query', { opacity: 0, x: compact ? 18 : 58, duration: 0.58 }, 0.48)
        .from('.wish-token', { opacity: 0, y: -14, scale: 0.7, stagger: 0.1, duration: 0.36 }, 0.76)
        .from('.wish-result', { opacity: 0, y: 34, scale: 0.9, duration: 0.56, ease: 'back.out(1.35)' }, 1.02)
        .from('.wish-result i', { scale: 0, stagger: 0.09, duration: 0.3, ease: 'back.out(2)' }, 1.31);
      break;

    case 'smart-care':
      timeline
        .from('.care-stage', { opacity: 0, scale: 0.96, duration: 0.68 }, 0.12)
        .from('.care-phone', { opacity: 0, x: compact ? 24 : 64, rotate: 9, duration: 0.72 }, 0.3)
        .from('.care-cycle', { opacity: 0, x: compact ? -18 : -58, duration: 0.58 }, 0.5)
        .from('.cycle-ring', { rotate: -130, scale: 0.7, opacity: 0, duration: 0.72, ease: 'back.out(1.3)' }, 0.68)
        .from('.care-push', { opacity: 0, y: 30, scale: 0.9, duration: 0.56, ease: 'back.out(1.4)' }, 1.12);
      break;

    case 'prezzi':
      timeline
        .from('.plan-card', { opacity: 0, y: compact ? 24 : 46, scale: 0.97, stagger: 0.1, duration: 0.58 }, 0.34)
        .from('.annual', { opacity: 0, scale: 0.92, stagger: 0.1, duration: 0.36 }, 0.72)
        .from('.popular', { opacity: 0, scale: 0.5, rotate: -8, duration: 0.4, ease: 'back.out(2)' }, 0.96);
      break;

    case 'forum':
      timeline
        .from('.forum-stage', { opacity: 0, scale: 0.96, duration: 0.68 }, 0.12)
        .from('.wip-label', { opacity: 0, y: -12, duration: 0.4 }, 0.42)
        .from('.build-line i', { scaleX: 0, duration: 1.1, ease: 'power2.inOut' }, 0.5)
        .from('.chat-bubble', { opacity: 0, y: 22, scale: 0.9, stagger: 0.16, duration: 0.46, ease: 'back.out(1.3)' }, 0.7)
        .from('.forum-mascot', {
          opacity: 0,
          x: compact ? 0 : 76,
          y: compact ? 0 : 24,
          scale: compact ? 0.86 : 1,
          rotate: 5,
          transformOrigin: 'right bottom',
          duration: 0.72,
        }, 1.04);
      break;
  }
}
