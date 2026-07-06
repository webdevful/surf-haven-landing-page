/* Surf Haven page runtime — v4 (root rebuild on the clean authored DOM)
 * Explicit, testable implementation of the source's observed behaviors with
 * the registered tech stack (Swiper 11 + GSAP 3 + vanilla JS):
 *  - full-page scroll reveals (clean DOM: initial states are OURS, so every
 *    section animates — nothing can ship frozen)
 *  - navbar scroll-invert with the exact color values measured on the source
 *  - 4 authored sliders on Swiper; dropdowns; day tabs/accordions; room
 *    gallery; apply overlay; video lightbox; WLFS logo invert on scroll
 */
(function () {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function initDayAccordion() {
    const accordions = qsa('.day-accordion');
    if (!accordions.length) return;

    // Clean DOM ships bodies expanded; source fidelity = all days collapsed.
    accordions.forEach(closeDayAccordion);

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

  function initRoomAccordion() {
    const rooms = qsa('.room-accordion');
    if (!rooms.length) return;

    // Source fidelity: only 'Common Areas' (last item) starts open.
    rooms.forEach(closeRoomAccordion);
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

  function openDayAccordion(acc) {
    const body = qs('.day-accordion-body', acc);
    const chevron = qs('.chevron-button', acc);
    if (!body) return;
    acc.classList.add('is-active');
    if (chevron) chevron.classList.add('is-active');
    // Queue after any pending close-all rAF so open always wins the frame.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { body.style.height = body.scrollHeight + 'px'; });
    });
    // After transition, set to auto so inner content (tabs switching) works
    body.addEventListener('transitionend', function onEnd() {
      if (acc.classList.contains('is-active')) body.style.height = 'auto';
      body.removeEventListener('transitionend', onEnd);
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

  /* Navbar scroll-invert — exact values measured on the live source. */
  function initNavbar() {
    var nav = qs('.navbar');
    if (!nav) return;
    var brandImg = qs('.brand-link img');
    function apply(scrolled) {
      nav.classList.toggle('is-scrolled', scrolled);
      if (brandImg) brandImg.style.filter = scrolled ? 'invert(0.997)' : '';
    }
    window.addEventListener('scroll', function () { apply(window.scrollY > 60); }, { passive: true });
    apply(window.scrollY > 60);

    var burger = qs('.w-nav-button');
    var menu = qs('.w-nav-menu');
    if (burger && menu) {
      burger.addEventListener('click', function () {
        var isOpen = burger.classList.toggle('w--open');
        menu.classList.toggle('w--open', isOpen);
        burger.setAttribute('aria-expanded', isOpen);
      });
    }
  }

  /* Full-page scroll reveals on the clean DOM (GSAP + ScrollTrigger). */
  function initReveal() {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Split-line headings rise out of their authored masks.
    var seen = new Set();
    qsa('.gsap_split_line-mask').forEach(function (mask) {
      var heading = mask.closest('h1,h2,h3,.heading-h1,.heading-h2') || mask.parentElement;
      if (seen.has(heading)) return;
      seen.add(heading);
      var lines = qsa('.gsap_split_line', heading);
      if (!lines.length) return;
      gsap.set(lines, { yPercent: 105 });
      gsap.to(lines, {
        yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.12,
        scrollTrigger: { trigger: heading, start: 'top 88%', once: true }
      });
    });

    // Section content fades/rises in — every section, uniformly.
    qsa('section').forEach(function (section) {
      var items = qsa(
        '.card, .w-slide, .day-accordion, .room-accordion, .pricing-card, ' +
        '.eyebrow-group, .icon-eyebrow-group, p, .primary-button, .secondary-button',
        section
      ).filter(function (el) { return !el.closest('.gsap_split_line'); }).slice(0, 24);
      if (!items.length) return;
      gsap.set(items, { autoAlpha: 0, y: 28 });
      gsap.to(items, {
        autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06,
        scrollTrigger: { trigger: section, start: 'top 82%', once: true }
      });
    });

    // Nothing may stay invisible under any failure mode.
    window.setTimeout(function () {
      qsa('section *').forEach(function (el) {
        var cs = getComputedStyle(el);
        if (parseFloat(cs.opacity) < 0.05 && el.getClientRects().length) {
          el.style.setProperty('opacity', '1', 'important');
          el.style.setProperty('transform', 'none', 'important');
        }
      });
    }, 6000);
  }

  function boot() {
    // Fault isolation: one broken module must never take the others down.
    [initNavbar, initReveal, initDayAccordion, initDayTabs, initRoomAccordion,
     initOverlay, initWebflowSliders, initDropdowns, initVideoLightbox,
     initSmoothScroll, initRoomGallery].forEach(function (mod) {
      try { mod(); } catch (err) {
        console.error('[surf-haven] ' + (mod.name || 'module') + ' failed:', err && err.message);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
