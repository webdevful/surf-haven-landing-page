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

  /* ─────────────────────────────────────────────────────────────────
   * 8. INTERSECTION OBSERVER – fade-in content visibility
   * ──────────────────────────────────────────────────────────────── */
  function initReveal() {
    // Owner return pass 2: reproduce the SOURCE runtime (GSAP 3.15 +
    // ScrollTrigger + SplitText are vendored locally, same versions the
    // Webflow source loads). The captured markup already carries the
    // .gsap_split_line masks — animate them the way the source does.
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var frozen = qsa('[style*="opacity"]').filter(function (el) {
      var o = parseFloat(el.style.opacity);
      return !isNaN(o) && o < 1;
    });
    var shifted = qsa('[style*="transform"]').filter(function (el) {
      return /translate\(\s*-?\d/.test(el.style.transform || '');
    });

    if (reduced || typeof gsap === 'undefined') {
      frozen.concat(shifted).forEach(function (el) { el.classList.add('wdf-frozen', 'wdf-revealed'); });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // 1. Split-line headings: lines rise out of their overflow masks.
    var seen = new Set();
    qsa('.gsap_split_line-mask').forEach(function (mask) {
      var heading = mask.closest('h1,h2,h3,.heading-h1,.heading-h2') || mask.parentElement;
      if (seen.has(heading)) return;
      seen.add(heading);
      var lines = Array.prototype.slice.call(heading.querySelectorAll('.gsap_split_line'));
      if (!lines.length) return;
      gsap.set(lines, { yPercent: 105, opacity: 1 });
      gsap.to(lines, {
        yPercent: 0,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.12,
        scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
        onComplete: function () { lines.forEach(function (l) { l.classList.add('wdf-revealed'); }); }
      });
    });

    // 2. Everything else frozen mid-animation: fade/slide to rest.
    var rest = frozen.concat(shifted).filter(function (el) {
      return !el.closest('.gsap_split_line') && !el.classList.contains('gsap_split_line') &&
             !el.classList.contains('w-dropdown-list');
    });
    Array.from(new Set(rest)).forEach(function (el) {
      gsap.to(el, {
        autoAlpha: 1, x: 0, y: 0,
        duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onComplete: function () { el.classList.add('wdf-revealed'); }
      });
    });

    // Safety net: nothing stays invisible even if a trigger misfires.
    window.setTimeout(function () {
      frozen.concat(shifted).forEach(function (el) { el.classList.add('wdf-frozen', 'wdf-revealed'); });
      qsa('.gsap_split_line').forEach(function (l) { l.classList.add('wdf-frozen', 'wdf-revealed'); });
    }, 4000);
  }

  /* ─────────────────────────────────────────────────────────────────
   * WEBFLOW SLIDERS – arrows, autoplay, infinite (source behavior)
   * ──────────────────────────────────────────────────────────────── */
  function initWebflowSliders() {
    // Port the source's Webflow sliders onto the registered tech stack
    // (Swiper 11, vendored locally): remap w-slider markup to Swiper DOM at
    // runtime and drive arrows/autoplay through real Swiper instances.
    if (typeof Swiper === 'undefined') return;
    qsa('.w-slider').forEach(function (slider) {
      var mask = qs('.w-slider-mask', slider);
      if (!mask) return;
      var slides = Array.prototype.slice.call(mask.children).filter(function (c) {
        return c.classList.contains('w-slide');
      });
      if (slides.length < 2) return;
      slider.classList.add('swiper');
      mask.classList.add('swiper-wrapper');
      slides.forEach(function (s) { s.classList.add('swiper-slide'); });
      var autoplay = slider.getAttribute('data-autoplay') === 'true';
      var delay = Math.max(parseInt(slider.getAttribute('data-delay') || '4000', 10), 2500);
      var duration = Math.min(parseInt(slider.getAttribute('data-duration') || '300', 10), 300);
      new Swiper(slider, {
        loop: true,
        speed: 150,
        slidesPerView: 'auto',
        loopPreventsSliding: false,
        autoplay: autoplay ? { delay: delay, pauseOnMouseEnter: true } : false,
        navigation: {
          prevEl: qs('.w-slider-arrow-left', slider),
          nextEl: qs('.w-slider-arrow-right', slider)
        }
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * DROPDOWNS – nav menus (hover+click) and collapsibles (source behavior)
   * ──────────────────────────────────────────────────────────────── */
  function initDropdowns() {
    qsa('.w-dropdown').forEach(function (dd) {
      var toggle = qs('.w-dropdown-toggle', dd);
      var list = qs('.w-dropdown-list', dd);
      if (!toggle || !list) return;
      var inNav = !!dd.closest('.navbar, .w-nav');
      function setOpen(open) {
        dd.classList.toggle('w--open', open);
        toggle.classList.toggle('w--open', open);
        list.classList.toggle('w--open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (list.style.height === '0px' && open) list.style.height = 'auto';
        if (!open && list.getAttribute('data-collapsible') === 'true') list.style.height = '0px';
      }
      if (list.style.height === '0px') list.setAttribute('data-collapsible', 'true');
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        setOpen(!dd.classList.contains('w--open'));
      });
      if (inNav) {
        dd.addEventListener('mouseenter', function () { setOpen(true); });
        dd.addEventListener('mouseleave', function () { setOpen(false); });
      }
      document.addEventListener('click', function (e) {
        if (!dd.contains(e.target)) setOpen(false);
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * VIDEO LIGHTBOX – "Watch our video diaries!" plays a real local video
   * ──────────────────────────────────────────────────────────────── */
  function initVideoLightbox() {
    var link = qs('[data-video]');
    if (!link) return;
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var overlay = document.createElement('div');
      overlay.className = 'wdf-lightbox';
      overlay.innerHTML =
        '<div class="wdf-lightbox-inner">' +
        '<button class="wdf-lightbox-close" aria-label="Close video">&times;</button>' +
        '<video src="' + link.getAttribute('data-video') + '" controls autoplay playsinline></video>' +
        '</div>';
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      function close() {
        overlay.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
      }
      function onKey(ev) { if (ev.key === 'Escape') close(); }
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay || ev.target.classList.contains('wdf-lightbox-close')) close();
      });
      document.addEventListener('keydown', onKey);
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * WLFS LOGO SWAP – white lockup on dark hero, dark lockup on scrolled bar
   * ──────────────────────────────────────────────────────────────── */
  function initLogoSwap() {
    var img = qs('.brand-link img');
    if (!img) return;
    var white = '/assets/img/logo/surf-haven/logo_white.png';
    var dark = '/assets/img/logo/surf-haven/logo.png';
    window.addEventListener('scroll', function () {
      img.src = window.scrollY > 60 ? dark : white;
    }, { passive: true });
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
    initWebflowSliders();
    initDropdowns();
    initVideoLightbox();
    initLogoSwap();
    initSmoothScroll();
    // Swiper – waits for the CDN script
    if (typeof Swiper !== 'undefined') {
      initRoomGallery();
    } else {
      document.addEventListener('swiper-ready', function () {
        initRoomGallery();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
