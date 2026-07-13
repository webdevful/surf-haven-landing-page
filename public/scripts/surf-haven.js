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

  /* Navbar link underline — the source IX2 hover pair "Navbar link underline
   * [show]/[hide]" (WEBFLOW-IX2.json a-84/a-50) is DIRECTIONAL: the 1px line
   * enters from the LEFT (-110% -> 0, 600ms outQuint) and exits to the RIGHT
   * (0 -> 110%) before returning to display:none, so plain CSS :hover (which
   * would reverse back out the left) cannot reproduce it. Desktop-only by
   * construction: the source hides .nav-underline-wrap at <=991px. */
  function initNavUnderline() {
    var EASE_OUT_QUINT = 'cubic-bezier(.23, 1, .32, 1)';
    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    qsa('.navbar-link, .navbar-dropdown-toggle').forEach(function (item) {
      var line = qs('.nav-underline', item);
      if (!line) return;
      item.addEventListener('mouseenter', function () {
        line.style.transition = 'none';
        line.style.transform = 'translateX(-110%)';
        line.style.display = 'flex';
        void line.offsetWidth; // commit the parked position before animating
        line.style.transition = reduced ? 'none' : 'transform 600ms ' + EASE_OUT_QUINT;
        line.style.transform = 'translateX(0%)';
      });
      item.addEventListener('mouseleave', function () {
        line.style.transform = 'translateX(110%)';
      });
      line.addEventListener('transitionend', function () {
        if (line.style.transform === 'translateX(110%)') line.style.display = 'none';
      });
    });
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
    // Data-driven trigger mapping. The aria-label (preserved by the crawler)
    // encodes intent: "open about popup" -> about; apply/join/reserve/form ->
    // application form. Verified against the source. This covers EVERY CTA
    // arrow button, not a hardcoded few.
    var aboutPop = document.getElementById('popup-about');
    var formPop = qs('.popup-form');
    var ABOUT = /about popup|read our story/i;
    var FORM = /application form|apply now|join the camp|reserve your spot|apply\b/i;
    qsa('a[href="#"][aria-label], a.secondary-button[href="#"], a.primary-button[href="#"]').forEach(function (b) {
      var aria = (b.getAttribute('aria-label') || b.textContent || '').trim();
      var target = ABOUT.test(aria) ? aboutPop : FORM.test(aria) ? formPop : null;
      if (!target) return;
      b.addEventListener('click', function (e) { e.preventDefault(); openOverlay(target); });
      b.setAttribute('data-popup-wired', target === aboutPop ? 'about' : 'form');
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

    // Team-card popups are handled by initTeamCards (class-driven expand).
  }

  /* TEAM CARDS (Meet the team) — click the + button, a name/role badge, or the
   * card to expand the frosted bio popup. The source's `.slide-popup` ships as a
   * 2.5rem frosted circle pinned to the + corner (position:absolute; inset:0 0
   * auto auto; overflow:hidden) and the Webflow IX grows it to fill the whole
   * card while fading the bio in and turning the + into a ×. We drive that with
   * an `.is-open` class on the slide (CSS does the expand/fade/rotate in
   * shared.css). Single-open; click the card again, another card, or outside to
   * close. The old initPopups handler just flipped display on the 2.5rem box, so
   * the bio overflowed the tiny circle (owner-reported leak) and never expanded. */
  function initTeamCards() {
    var slides = qsa('.slide.is-team');
    if (!slides.length) return;
    function closeAll() { slides.forEach(function (s) { s.classList.remove('is-open'); }); }
    slides.forEach(function (slide) {
      slide.addEventListener('click', function () {
        var willOpen = !slide.classList.contains('is-open');
        closeAll();
        slide.classList.toggle('is-open', willOpen);
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.slide.is-team')) closeAll();
    });
  }

  /* BUTTON TEXT-ROLL — on hover the label slides up and an identical copy rolls
   * in from below (the source IX3 button micro-interaction). Only buttons the
   * SOURCE authored with `.button-text-wrap > .button-text` get the roll — i.e.
   * primary and tertiary buttons. Secondary buttons ship a plain label div and a
   * `.arrow-tail-button`; the source gives THEM only the arrow-tail hover
   * (arrow lifts + circle turns accent), NOT a text-roll. So we must not
   * fabricate a wrap for secondary buttons (that wrongly rolled e.g. the FAQ
   * "Contact Us" label). The duplicate copy is drawn by CSS ::after
   * content: attr(data-label). */
  function initButtonRoll() {
    // Source-authored roll buttons only: label already wrapped in
    // .button-text-wrap (primary + tertiary). Just set the duplicate text.
    qsa('.button-text').forEach(function (el) {
      var label = el.textContent.trim();
      if (!el.getAttribute('data-label')) el.setAttribute('data-label', label);
      var wrap = el.closest('.button-text-wrap');
      if (wrap && !wrap.getAttribute('data-label')) wrap.setAttribute('data-label', label);
    });
  }

  /* ARROW-TAIL ROLL — the arrow's version of the button text-roll (source
   * arrow-tail-button hover family). On hover the arrow slides out toward the
   * top-right and a duplicate arrow rolls in from the bottom-left. The source
   * ships a second `.arrow-tail-icon.is-absolute` for the incoming copy; our
   * authored markup carries only one icon, so we clone it here. The motion is
   * driven by CSS (see shared.css). Runs on EVERY arrow-tail-button so the
   * behaviour is consistent across all sections. */
  function initArrowRoll() {
    qsa('.arrow-tail-button').forEach(function (btn) {
      var icon = qs('.arrow-tail-icon', btn);
      if (!icon) return;
      if (qs('.arrow-tail-icon.is-absolute', btn)) return; // duplicate already present
      var clone = icon.cloneNode(true);
      clone.classList.add('is-absolute');
      clone.setAttribute('aria-hidden', 'true');
      btn.appendChild(clone);
    });
  }

  /* FAQ accordion (Section 13) — same height-animated open/close as the day
   * accordion, single-open. The authored bodies ship height:0; clicking a
   * question expands it and collapses the others. */
  function initFaqAccordion() {
    const accordions = qsa('.faq-accordion');
    if (!accordions.length) return;

    accordions.forEach(closeFaqAccordion);

    accordions.forEach(function (acc) {
      const header = qs('.faq-accordion-header', acc);
      if (!header) return;
      header.addEventListener('click', function () {
        const isOpen = acc.classList.contains('is-active');
        accordions.forEach(function (a) { closeFaqAccordion(a); });
        if (!isOpen) openFaqAccordion(acc);
      });
    });
  }

  function closeFaqAccordion(acc) {
    const body = qs('.faq-accordion-body', acc);
    const chevron = qs('.chevron-button', acc);
    if (!body) return;
    body.style.height = body.offsetHeight + 'px';
    requestAnimationFrame(function () { body.style.height = '0px'; });
    acc.classList.remove('is-active');
    if (chevron) chevron.classList.remove('is-active');
  }

  function openFaqAccordion(acc) {
    const body = qs('.faq-accordion-body', acc);
    const chevron = qs('.chevron-button', acc);
    if (!body) return;
    acc.classList.add('is-active');
    if (chevron) chevron.classList.add('is-active');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { body.style.height = body.scrollHeight + 'px'; });
    });
    body.addEventListener('transitionend', function onEnd() {
      if (acc.classList.contains('is-active')) body.style.height = 'auto';
      body.removeEventListener('transitionend', onEnd);
    });
  }

  /* PROGRAM DAY FOLLOW-CURSOR — faithful to the source's Webflow "mouse move
   * over element" interaction. Source structure (from the captured markup):
   * the `.follow-cursor-wrap` ITSELF is the animated element — it ships
   *   transform: translate3d(0%,0%,0) ...; display:flex; opacity:0
   * and Webflow nudges it by a SMALL PERCENT of its own box as the cursor moves
   * inside that day row. It is NOT a 1:1 cursor tracker: the image stays parked
   * at its CSS home (flex-centred + margin-left:20% → right-of-centre of the
   * row) and only drifts a little, so it never leaves its lane, never overlaps
   * neighbouring rows, and (with pointer-events:none) never blocks the chevron.
   * The inner `.follow-cursor` only carries the static rotate(-10deg) tilt.
   * Desktop-only — skipped on coarse/no-hover pointers (CSS also hides the wrap
   * there) and on prefers-reduced-motion. GSAP quickTo smooths the drift; a
   * plain translate3d fallback keeps it working if GSAP failed to load. */
  function initFollowCursor() {
    var canHover = !window.matchMedia ||
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover || reduced) return;

    var hasGsap = typeof gsap !== 'undefined';
    // Drift range as a percent of the wrap's own box (Webflow moves in %).
    // Small on purpose: subtle parallax, image stays parked near its home.
    var RANGE_X = 6, RANGE_Y = 10;

    qsa('.day-accordion-header').forEach(function (header) {
      var wrap = qs('.follow-cursor-wrap', header);
      if (!wrap || !qs('.follow-cursor', wrap)) return;

      var setX, setY;
      if (hasGsap) {
        setX = gsap.quickTo(wrap, 'xPercent', { duration: 0.6, ease: 'power3.out' });
        setY = gsap.quickTo(wrap, 'yPercent', { duration: 0.6, ease: 'power3.out' });
      }

      function move(e) {
        var r = header.getBoundingClientRect();
        // Normalised cursor position within the row, clamped to [-1, 1].
        var nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
        var ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
        var x = nx * RANGE_X, y = ny * RANGE_Y;
        if (hasGsap) { setX(x); setY(y); }
        else wrap.style.transform = 'translate3d(' + x + '%,' + y + '%,0)';
      }

      header.addEventListener('mouseenter', function (e) {
        move(e);
        if (hasGsap) gsap.to(wrap, { opacity: 1, duration: 0.3, ease: 'power2.out' });
        else { wrap.style.transition = 'opacity .3s ease'; wrap.style.opacity = '1'; }
      });
      header.addEventListener('mousemove', move);
      header.addEventListener('mouseleave', function () {
        if (hasGsap) {
          gsap.to(wrap, { opacity: 0, duration: 0.3, ease: 'power2.out' });
          setX(0); setY(0);
        } else {
          wrap.style.opacity = '0';
          wrap.style.transform = 'translate3d(0%,0%,0)';
        }
      });
    });
  }

  // Levels cards: desktop reveal is pure CSS (:hover/:focus-within). On mobile
  // the chevron toggles .is-open (matches the source Webflow accordion behavior).
  function initLevelsCards() {
    const cards = qsa('.levels-card');
    if (!cards.length) return;
    cards.forEach(function (card) {
      const chevron = qs('.chevron-button', card);
      if (!chevron) return;
      chevron.addEventListener('click', function () {
        const open = card.classList.toggle('is-open');
        chevron.classList.toggle('is-active', open);
      });
    });
  }

  function boot() {
    // Fault isolation: one broken module must never take the others down.
    [initNavbar, initNavUnderline, initReveal, initDayAccordion, initDayTabs,
     initRoomAccordion, initOverlay, initWebflowSliders, initDropdowns,
     initVideoLightbox, initSmoothScroll, initRoomGallery, initPopups,
     initButtonRoll, initLevelsCards, initFollowCursor, initFaqAccordion,
     initArrowRoll, initTeamCards].forEach(function (mod) {
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
