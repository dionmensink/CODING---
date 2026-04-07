/**
 * main.js — Mensinc
 */

(function () {
  'use strict';

  var isMobile  = window.matchMedia('(max-width: 768px)').matches;
  var isTouch   = window.matchMedia('(hover: none)').matches;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------------
     Mobile Navigation
  ------------------------------------------------------- */
  function initMobileNav() {
    var hamburger  = document.querySelector('.site-nav__hamburger');
    var mobileMenu = document.querySelector('.site-nav__mobile');
    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener('click', function () {
      var open = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', !open);
      hamburger.classList.toggle('open', !open);
      hamburger.setAttribute('aria-expanded', String(!open));
    });

    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
      });
    });
  }

  /* -------------------------------------------------------
     Scroll-driven card flip — mobile sticky layout

     Zones (as fraction of total scroll progress 0→1):
       0.00 – 0.10  card 1 front
       0.10 – 0.50  card 1 flips front → back
       0.50 – 0.60  card 2 front
       0.60 – 1.00  card 2 flips front → back
  ------------------------------------------------------- */
  function initMobileScrollFlip() {
    if (!isMobile) return;

    var landing = document.querySelector('.landing');
    if (!landing) return;

    var cards = Array.from(landing.querySelectorAll('.card-container'));
    if (cards.length < 2) return;

    var card1  = cards[0], card2  = cards[1];
    var inner1 = card1.querySelector('.card-inner');
    var inner2 = card2.querySelector('.card-inner');

    // Set initial state: card1 visible, card2 hidden
    card1.style.opacity = '1';  card1.style.zIndex = '2';
    card2.style.opacity = '0';  card2.style.zIndex = '1';

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // Map v from [inMin,inMax] → [0,1], clamped
    function mapRange(v, inMin, inMax) {
      return clamp((v - inMin) / (inMax - inMin), 0, 1);
    }

    // Ease in-out cubic — slow start, fast middle, slow end
    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    var ticking = false;

    function update() {
      var sectionTop    = landing.offsetTop;
      var sectionHeight = landing.offsetHeight;
      var maxScroll     = sectionHeight - window.innerHeight;
      var p             = clamp((window.scrollY - sectionTop) / maxScroll, 0, 1);

      // Rotation angles
      var rot1 = ease(mapRange(p, 0.10, 0.50)) * 180;
      var rot2 = ease(mapRange(p, 0.60, 1.00)) * 180;

      // Crossfade: card1 fades out, card2 fades in around p=0.50
      var fade2 = clamp((p - 0.46) / 0.08, 0, 1);
      var fade1 = 1 - fade2;

      card1.style.opacity = fade1;
      card1.style.zIndex  = fade1 >= 0.5 ? '2' : '1';
      card2.style.opacity = fade2;
      card2.style.zIndex  = fade2 >  0.5 ? '2' : '1';

      if (inner1) inner1.style.transform = 'rotateY(' + rot1.toFixed(1) + 'deg)';
      if (inner2) inner2.style.transform = 'rotateY(' + rot2.toFixed(1) + 'deg)';

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    requestAnimationFrame(update);
  }

  /* -------------------------------------------------------
     Tap-to-flip — non-mobile touch devices (tablets etc.)
  ------------------------------------------------------- */
  function initCardFlip() {
    if (!isTouch || isMobile) return; // mobile uses scroll-flip instead

    var cards = document.querySelectorAll('.card-container');
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (!card.classList.contains('flipped')) {
          card.classList.add('flipped');
          e.preventDefault();
        }
      });
    });
  }

  /* -------------------------------------------------------
     Parallax — hero images only, desktop only
     Skipped on mobile: causes layout thrash and jank.
  ------------------------------------------------------- */
  function initParallax() {
    if (isMobile || reducedMotion) return;

    var heroImages = document.querySelectorAll('.page-hero__image.parallax');
    if (!heroImages.length) return;

    var ticking = false;

    function update() {
      heroImages.forEach(function (img) {
        var section = img.closest('.page-hero');
        if (!section) return;
        var rect   = section.getBoundingClientRect();
        var offset = (rect.top + rect.height / 2) * 0.12;
        img.style.setProperty('--parallax-offset', offset + 'px');
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* -------------------------------------------------------
     Active nav link
  ------------------------------------------------------- */
  function initActiveNav() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav__links a, .site-nav__mobile a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && href.split('/').pop() === currentPage) {
        link.classList.add('active');
      }
    });
  }

  /* -------------------------------------------------------
     Count-up — proportional durations, ease-out quart
  ------------------------------------------------------- */
  function initCountUp() {
    var stats = document.querySelectorAll('.stat__number[data-target], .home-stat__num[data-target]');
    if (!stats.length || reducedMotion) return;

    var maxTarget = 0;
    stats.forEach(function (el) {
      var t = parseFloat(el.getAttribute('data-target'));
      if (t > maxTarget) maxTarget = t;
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);

        var el       = entry.target;
        var target   = parseFloat(el.getAttribute('data-target'));
        var suffix   = el.getAttribute('data-suffix') || '';
        var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
        var duration = 1200 + (target / maxTarget) * 3000;
        var start    = null;

        function step(ts) {
          if (!start) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased    = 1 - Math.pow(1 - progress, 4);
          el.textContent = (eased * target).toFixed(decimals) + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = target.toFixed(decimals) + suffix;
        }

        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });

    stats.forEach(function (el) { observer.observe(el); });
  }

  /* -------------------------------------------------------
     Reveal on scroll
  ------------------------------------------------------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (reducedMotion) {
      els.forEach(function (el) { el.classList.add('revealed'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -32px 0px' });

    els.forEach(function (el) { observer.observe(el); });
  }

  /* -------------------------------------------------------
     Card click navigation
  ------------------------------------------------------- */
  function initCardNav() {
    document.querySelectorAll('.card-container[data-href]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.card-back__cta')) return;

        // On mobile, only navigate when back is showing (rot > 90°)
        if (isMobile) {
          var inner = card.querySelector('.card-inner');
          var m = inner && inner.style.transform.match(/rotateY\(([0-9.]+)deg\)/);
          if (!m || parseFloat(m[1]) < 90) return;
        }

        var href = card.getAttribute('data-href');
        if (href) {
          document.body.classList.add('fade-out');
          setTimeout(function () { window.location.href = href; }, 220);
        }
      });
    });
  }

  /* -------------------------------------------------------
     Init
  ------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initMobileScrollFlip();
    initCardFlip();
    initParallax();
    initActiveNav();
    initCountUp();
    initReveal();
    initCardNav();
  });

})();
