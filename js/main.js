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

     Both cards are always visible (top half / bottom half).
     Scroll progress 0→1 over the 250vh landing section:
       0.00 – 0.15  card 1 front (hold)
       0.15 – 0.50  card 1 flips → back
       0.50 – 0.65  card 2 front (hold)
       0.65 – 1.00  card 2 flips → back
  ------------------------------------------------------- */
  function initMobileScrollFlip() {
    if (!isMobile) return;

    var landing = document.querySelector('.landing');
    if (!landing) return;

    var cards = Array.from(landing.querySelectorAll('.card-container'));
    if (cards.length < 2) return;

    var inner1 = cards[0].querySelector('.card-inner');
    var inner2 = cards[1].querySelector('.card-inner');

    // Cache layout — only re-read on resize, never in scroll hot-path
    var sectionTop = 0, maxScroll = 0;
    function cacheLayout() {
      sectionTop = landing.offsetTop;
      maxScroll  = landing.offsetHeight - window.innerHeight;
    }
    cacheLayout();
    window.addEventListener('resize', cacheLayout, { passive: true });

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function map01(v, a, b)   { return clamp((v - a) / (b - a), 0, 1); }
    // Ease in-out cubic: slow start → fast middle → slow end
    function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

    var ticking = false;
    var prevRot1 = -1, prevRot2 = -1; // skip DOM write if unchanged

    function update() {
      var p    = clamp((window.scrollY - sectionTop) / maxScroll, 0, 1);
      var rot1 = ease(map01(p, 0.15, 0.50)) * 180;
      var rot2 = ease(map01(p, 0.65, 1.00)) * 180;

      if (Math.abs(rot1 - prevRot1) > 0.2) {
        if (inner1) inner1.style.transform = 'rotateY(' + rot1.toFixed(1) + 'deg)';
        prevRot1 = rot1;
      }
      if (Math.abs(rot2 - prevRot2) > 0.2) {
        if (inner2) inner2.style.transform = 'rotateY(' + rot2.toFixed(1) + 'deg)';
        prevRot2 = rot2;
      }

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    update();
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
