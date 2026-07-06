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
    // Faithful Webflow w-slider engine. Architecture (from the source CSS):
    // the MASK's width defines ONE slide (team 33%, testimonials 49%) and can
    // have overflow:visible so neighbors show beside it; slides are 100% of
    // the mask with a %-margin gutter; data-animation="slide" advances one
    // mask-width (+gutter) per step. We translate slides by the measured
    // step, honoring data-duration/easing/autoplay/infinite.
    qsa('.w-slider').forEach(function (slider) {
      var mask = qs('.w-slider-mask', slider);
      if (!mask) return;
      var slides = Array.prototype.slice.call(mask.children).filter(function (c) {
        return c.classList.contains('w-slide');
      });
      if (slides.length < 2) return;

      // Force every slide image to load/decode NOW so no slide is ever blank
      // until the user interacts (the "image appears on hover" symptom).
      qsa('img', mask).forEach(function (im) {
        im.loading = 'eager';
        if (im.decode) { try { im.decode().catch(function(){}); } catch (e) {} }
      });

      var duration = parseInt(slider.getAttribute('data-duration') || '500', 10);
      var easing = slider.getAttribute('data-easing') || 'ease';
      var autoplay = slider.getAttribute('data-autoplay') === 'true';
      var delay = Math.max(parseInt(slider.getAttribute('data-delay') || '4000', 10), 2000);
      var index = 0;
      var timer = null;

      function stepPct() {
        var w = slides[0].getBoundingClientRect().width;
        var mr = parseFloat(getComputedStyle(slides[0]).marginRight) || 0;
        return w > 0 ? ((w + mr) / w) * 100 : 100;
      }
      function render(animated) {
        var offset = -index * stepPct();
        slides.forEach(function (s) {
          s.style.transition = animated ? ('transform ' + duration + 'ms ' + easing) : 'none';
          s.style.transform = 'translateX(' + offset + '%)';
        });
        slides.forEach(function (s, k) {
          s.setAttribute('aria-hidden', k === index ? 'false' : 'true');
        });
      }
      function goTo(i, animated) {
        index = ((i % slides.length) + slides.length) % slides.length;
        render(animated !== false);
      }
      function restart() {
        if (!autoplay) return;
        if (timer) clearInterval(timer);
        timer = setInterval(function () { goTo(index + 1); }, delay);
      }
      // Arrows may live OUTSIDE the slider (team section header) and point
      // at the mask via aria-controls — bind by the ARIA link, not containment.
      function arrow(side) {
        var inSlider = qs('.w-slider-arrow-' + side, slider);
        if (inSlider) return inSlider;
        if (mask.id) return qs('.w-slider-arrow-' + side + '[aria-controls="' + mask.id + '"]');
        return null;
      }
      var prev = arrow('left');
      var next = arrow('right');
      if (prev) prev.addEventListener('click', function () { goTo(index - 1); restart(); });
      if (next) next.addEventListener('click', function () { goTo(index + 1); restart(); });
      slider.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
      slider.addEventListener('mouseleave', restart);
      window.addEventListener('resize', function () { render(false); });
      goTo(0, false);
      restart();
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
    // ADDITIVE reveal: content is visible by default (CSS never hides it).
    // The animation only nudges elements up from a small offset — it never
    // sets opacity 0. So if GSAP/ScrollTrigger never loads or a trigger
    // misfires, EVERYTHING is still visible. No "blank until hover/scroll".
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // Split-line headings: the authored masks clip the lines; slide them up.
    // opacity stays 1 throughout (the mask does the reveal, not opacity).
    var seen = new Set();
    qsa('.gsap_split_line-mask').forEach(function (mask) {
      var heading = mask.closest('h1,h2,h3,.heading-h1,.heading-h2') || mask.parentElement;
      if (seen.has(heading)) return;
      seen.add(heading);
      var lines = qsa('.gsap_split_line', heading);
      if (!lines.length) return;
      gsap.fromTo(lines, { yPercent: 110 }, {
        yPercent: 0, duration: 1.25, ease: 'power4.out', stagger: 0.12,
        scrollTrigger: { trigger: heading, start: 'top 90%', once: true }
      });
    });

    // Section content: subtle upward drift only. NEVER opacity 0 — start at a
    // small y offset and full opacity is untouched, so nothing can go missing.
    qsa('section').forEach(function (section) {
      var items = qsa(
        '.icon-eyebrow-group, .eyebrow-group, p, .primary-button, ' +
        '.secondary-button, .pricing-card, .badge, .video-cta, .contact-row',
        section
      ).filter(function (el) {
        return !el.closest('.w-slider, .day-accordion, .room-accordion, ' +
                           '.w-dropdown, .gsap_split_line, footer, .image-wrap');
      }).slice(0, 20);
      if (!items.length) return;
      gsap.fromTo(items, { y: 34 }, {
        y: 0, duration: 1.0, ease: 'power3.out', stagger: 0.07,
        scrollTrigger: { trigger: section, start: 'top 85%', once: true }
      });
    });
  }

  /* POPUPS — Read Our Story (about), Apply Now (form), slider "+" (slide
   * detail). Markup ships hidden (display:none); IX3 opened them on the
   * source. Reimplemented natively with fade/scale + backdrop + Esc close. */
  function initPopups() {
    function openOverlay(pop) {
      if (!pop) return;
      pop.style.display = 'flex';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { pop.classList.add('is-open'); });
      });
      document.body.style.overflow = 'hidden';
    }
    function closeOverlay(pop) {
      if (!pop) return;
      pop.classList.remove('is-open');
      document.body.style.overflow = '';
      window.setTimeout(function () { pop.style.display = 'none'; }, 350);
    }
    // Read Our Story -> #popup-about
    qsa('a[aria-label*="about popup" i], a[aria-label*="Read our story" i]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); openOverlay(document.getElementById('popup-about')); });
    });
    // Apply Now -> the form popup
    var formPop = qs('.popup-form');
    qsa('a[aria-label*="application form" i], a[aria-label*="Apply now" i]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); openOverlay(formPop); });
    });
    // close buttons + backdrop + Esc
    qsa('.close-button').forEach(function (c) {
      c.addEventListener('click', function () { closeOverlay(c.closest('.popup-about, .popup-form')); });
    });
    qsa('.popup-about, .popup-form').forEach(function (pop) {
      pop.addEventListener('click', function (e) { if (e.target === pop) closeOverlay(pop); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') qsa('.popup-about.is-open, .popup-form.is-open').forEach(closeOverlay);
    });

    // Slider "+" -> the in-card .slide-popup (overlay within the slide)
    qsa('.plus-button').forEach(function (plus) {
      var slide = plus.closest('.w-slide') || plus.closest('.slide-content') || plus.parentElement;
      var pop = slide && slide.querySelector('.slide-popup');
      if (!pop) return;
      var content = pop.querySelector('.slide-popup-content');
      var open = false;
      plus.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        open = !open;
        pop.style.display = open ? 'flex' : 'none';
        if (content) { content.style.display = open ? 'flex' : 'none'; content.style.opacity = open ? '1' : '0'; }
        plus.classList.toggle('is-active', open);
      });
      var close = pop.querySelector('.close-button, .slide-popup-close');
      if (close) close.addEventListener('click', function (e) {
        e.stopPropagation(); open = false; pop.style.display = 'none';
        if (content) { content.style.display = 'none'; content.style.opacity = '0'; }
        plus.classList.remove('is-active');
      });
    });
  }

  function boot() {
    // Fault isolation: one broken module must never take the others down.
    [initNavbar, initReveal, initDayAccordion, initDayTabs, initRoomAccordion,
     initOverlay, initWebflowSliders, initDropdowns, initVideoLightbox,
     initSmoothScroll, initRoomGallery, initPopups].forEach(function (mod) {
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
