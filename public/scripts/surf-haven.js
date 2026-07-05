/*!
 * Surf Haven – Interactive JS
 * Handles: Day program accordion + tabs, Room accordion + gallery, Apply overlay, Navbar scroll, Swiper sliders
 */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────
   * UTILITY
   * ──────────────────────────────────────────────────────────────── */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ─────────────────────────────────────────────────────────────────
   * 1. DAY ACCORDION (Program section – 7 days)
   * Each .day-accordion has:
   *   .day-accordion-header  – click trigger
   *   .day-accordion-body    – collapsible pane  (display:block/overflow:hidden)
   *   .chevron-button        – rotates 180° when open
   *   .day-tabs-parent       – tab host inside the body
   * ──────────────────────────────────────────────────────────────── */
  function initDayAccordion() {
    const accordions = qsa('.day-accordion');
    if (!accordions.length) return;

    // Source fidelity: all days start collapsed (First Article return, class 5).

    accordions.forEach(function (acc) {
      const header = qs('.day-accordion-header', acc);
      if (!header) return;
      header.addEventListener('click', function () {
        const isOpen = acc.classList.contains('is-active');
        // Close all
        accordions.forEach(function (a) { closeDayAccordion(a); });
        // Toggle current
        if (!isOpen) openDayAccordion(acc);
      });
    });
  }

  function openDayAccordion(acc) {
    const body = qs('.day-accordion-body', acc);
    const chevron = qs('.chevron-button', acc);
    if (!body) return;
    acc.classList.add('is-active');
    if (chevron) chevron.classList.add('is-active');
    body.style.height = body.scrollHeight + 'px';
    // After transition, set to auto so inner content (tabs switching) works
    body.addEventListener('transitionend', function onEnd() {
      if (acc.classList.contains('is-active')) body.style.height = 'auto';
      body.removeEventListener('transitionend', onEnd);
    });
  }

  function closeDayAccordion(acc) {
    const body = qs('.day-accordion-body', acc);
    const chevron = qs('.chevron-button', acc);
    if (!body) return;
    // Fix height before animating to 0
    body.style.height = body.offsetHeight + 'px';
    requestAnimationFrame(function () {
      body.style.height = '0px';
    });
    acc.classList.remove('is-active');
    if (chevron) chevron.classList.remove('is-active');
  }

  /* ─────────────────────────────────────────────────────────────────
   * 2. DAY TABS (Description / Timetable)
   * ──────────────────────────────────────────────────────────────── */
  function initDayTabs() {
    const tabParents = qsa('.day-tabs-parent');
    tabParents.forEach(function (parent) {
      const links = qsa('.day-tabs-link', parent);
      const panes = qsa('.day-tab-pane', parent);

      links.forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          const target = link.getAttribute('data-w-tab');
          // Activate link
          links.forEach(function (l) {
            l.classList.remove('w--current');
            l.setAttribute('aria-selected', 'false');
          });
          link.classList.add('w--current');
          link.setAttribute('aria-selected', 'true');
          // Show pane
          panes.forEach(function (pane) {
            if (pane.getAttribute('data-w-tab') === target) {
              pane.classList.add('w--tab-active');
              pane.removeAttribute('aria-hidden');
            } else {
              pane.classList.remove('w--tab-active');
              pane.setAttribute('aria-hidden', 'true');
            }
          });
        });
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * 3. ROOM ACCORDION (Stay section)
   * ──────────────────────────────────────────────────────────────── */
  function initRoomAccordion() {
    const rooms = qsa('.room-accordion');
    if (!rooms.length) return;

    // Source fidelity: 'Common Areas' (last item) opens by default.
    openRoomAccordion(rooms[rooms.length - 1]);

    rooms.forEach(function (room) {
      const header = qs('.room-accordion-header', room);
      if (!header) return;
      header.addEventListener('click', function () {
        const isOpen = room.classList.contains('is-active');
        rooms.forEach(function (r) { closeRoomAccordion(r); });
        if (!isOpen) openRoomAccordion(room);
      });
    });
  }

  function openRoomAccordion(room) {
    const body = qs('.room-accordion-body', room);
    const chevron = qs('.chevron-button', room);
    if (!body) return;
    room.classList.add('is-active');
    body.classList.add('is-active');
    if (chevron) chevron.classList.add('is-active');
    // Grid row height animation (0fr → 1fr handled by CSS; also need opacity)
    body.style.opacity = '1';
    body.style.gridTemplateRows = '1fr';
  }

  function closeRoomAccordion(room) {
    const body = qs('.room-accordion-body', room);
    const chevron = qs('.chevron-button', room);
    if (!body) return;
    room.classList.remove('is-active');
    body.classList.remove('is-active');
    if (chevron) chevron.classList.remove('is-active');
    body.style.opacity = '0';
    body.style.gridTemplateRows = '0fr';
  }

  /* ─────────────────────────────────────────────────────────────────
   * 4. ROOM GALLERY (Swiper within room accordion)
   * ──────────────────────────────────────────────────────────────── */
  function initRoomGallery() {
    // Room gallery swipers are initialized after Swiper lib loads
    if (typeof Swiper === 'undefined') return;
    qsa('.room-swiper').forEach(function (el) {
      new Swiper(el, {
        slidesPerView: 'auto',
        spaceBetween: 16,
        loop: false,
        navigation: {
          nextEl: el.closest('.room-accordion')?.querySelector('.swiper-button-next') || null,
          prevEl: el.closest('.room-accordion')?.querySelector('.swiper-button-prev') || null,
        },
        pagination: {
          el: el.closest('.room-accordion')?.querySelector('.swiper-pagination') || null,
          clickable: true,
        },
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * 5. APPLY / CTA OVERLAY
   * ──────────────────────────────────────────────────────────────── */
  function initOverlay() {
    const overlays = qsa('[data-overlay]');
    const openers = qsa('[data-open-overlay]');
    const closers = qsa('[data-close-overlay]');

    openers.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = btn.getAttribute('data-open-overlay');
        const overlay = targetId
          ? document.getElementById(targetId)
          : overlays[0];
        if (overlay) {
          overlay.classList.add('is-open');
          document.body.style.overflow = 'hidden';
        }
      });
    });

    closers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const overlay = btn.closest('[data-overlay]') || overlays[0];
        if (overlay) {
          overlay.classList.remove('is-open');
          document.body.style.overflow = '';
        }
      });
    });

    // Close on backdrop click
    overlays.forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.classList.remove('is-open');
          document.body.style.overflow = '';
        }
      });
    });

    // ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        overlays.forEach(function (o) { o.classList.remove('is-open'); });
        document.body.style.overflow = '';
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * 6. NAVBAR SCROLL BEHAVIOR
   * ──────────────────────────────────────────────────────────────── */
  function initNavbar() {
    const navbar = qs('.navbar');
    if (!navbar) return;
    let lastScroll = 0;
    window.addEventListener('scroll', function () {
      const current = window.scrollY;
      if (current > 60) {
        navbar.classList.add('is-scrolled');
      } else {
        navbar.classList.remove('is-scrolled');
      }
      lastScroll = current;
    }, { passive: true });

    // Mobile menu toggle
    const burger = qs('.w-nav-button');
    const menu = qs('.w-nav-menu');
    if (burger && menu) {
      burger.addEventListener('click', function () {
        const isOpen = burger.classList.toggle('w--open');
        menu.classList.toggle('w--open', isOpen);
        burger.setAttribute('aria-expanded', isOpen);
      });
    }
  }

  /* ─────────────────────────────────────────────────────────────────
   * 7. HERO SWIPER
   * ──────────────────────────────────────────────────────────────── */
  function initHeroSwiper() {
    if (typeof Swiper === 'undefined') return;
    const heroEl = qs('.hero-slider, .w-slider');
    if (!heroEl) return;
    // Only init if we have multiple slides
    const slides = qsa('.w-slide, .hero-slide', heroEl);
    if (slides.length < 2) return;
    new Swiper(heroEl, {
      loop: true,
      autoplay: { delay: 4500, disableOnInteraction: false },
      speed: 800,
      effect: 'fade',
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * 8. INTERSECTION OBSERVER – fade-in content visibility
   * ──────────────────────────────────────────────────────────────── */
  function initReveal() {
    // The captured source markup froze GSAP mid-animation: inline opacity<1
    // and translate()/translate3d offsets with no runtime to complete them
    // (First Article return, defect class 2). Find every frozen element and
    // finish the animation with a lightweight fade/slide-in.
    const frozen = qsa('[style*="opacity"]').filter(function (el) {
      const o = parseFloat(el.style.opacity);
      return !isNaN(o) && o < 1;
    });
    const shifted = qsa('[style*="transform"]').filter(function (el) {
      return /translate\(\s*-?\d/.test(el.style.transform || '');
    });
    const items = Array.from(new Set(frozen.concat(shifted)));
    if (!items.length) return;
    items.forEach(function (el) { el.classList.add('wdf-frozen'); });

    function reveal(el) { el.classList.add('wdf-revealed'); }

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(reveal);
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    items.forEach(function (el) { io.observe(el); });
    // Safety net: nothing stays invisible even if the observer misfires.
    window.setTimeout(function () { items.forEach(reveal); }, 3000);
  }

  /* ─────────────────────────────────────────────────────────────────
   * 9. SMOOTH ANCHOR SCROLL
   * ──────────────────────────────────────────────────────────────── */
  function initSmoothScroll() {
    qsa('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const id = a.getAttribute('href');
        if (id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * BOOT
   * ──────────────────────────────────────────────────────────────── */
  function boot() {
    initNavbar();
    initDayAccordion();
    initDayTabs();
    initRoomAccordion();
    initOverlay();
    initReveal();
    initSmoothScroll();
    // Swiper – waits for the CDN script
    if (typeof Swiper !== 'undefined') {
      initRoomGallery();
      initHeroSwiper();
    } else {
      document.addEventListener('swiper-ready', function () {
        initRoomGallery();
        initHeroSwiper();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
