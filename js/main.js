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
     Scroll-driven card flip — mobile

     Each .card-container is 220vh tall with .card-inner
     as position:sticky inside it. This gives each card
     its own independent scroll zone.

     Per card scroll progress 0→1:
       0.00–0.20  front visible, nothing happens (user settles)
       0.20–0.80  card flips smoothly front → back
       0.80–1.00  back visible, user moves to next card
  ------------------------------------------------------- */
  function initMobileScrollFlip() {
    if (!isMobile) return;

    var cards  = Array.from(document.querySelectorAll('.card-container'));
    if (!cards.length) return;
    var inners = cards.map(function (c) { return c.querySelector('.card-inner'); });

    // Cache layout — read once, refresh on resize only
    var layouts = [];
    function cacheLayout() {
      var vh = window.innerHeight;
      layouts = cards.map(function (card) {
        var top       = card.getBoundingClientRect().top + window.scrollY;
        var scrollZone = card.offsetHeight - vh;
        return { top: top, scrollZone: scrollZone };
      });
    }
    cacheLayout();
    window.addEventListener('resize', function () {
      cacheLayout();
      update();
    }, { passive: true });

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function map01(v, a, b)   { return clamp((v - a) / (b - a), 0, 1); }
    // Ease in-out cubic — naturally decelrates at full flip
    function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

    var prevRots = cards.map(function () { return -1; });
    var ticking  = false;

    function update() {
      var sy = window.scrollY;
      cards.forEach(function (card, i) {
        var inner = inners[i];
        if (!inner) return;
        var lay = layouts[i];
        if (!lay || lay.scrollZone <= 0) return;

        var p   = clamp((sy - lay.top) / lay.scrollZone, 0, 1);
        var rot = ease(map01(p, 0.20, 0.80)) * 180;

        if (Math.abs(rot - prevRots[i]) > 0.3) {
          inner.style.transform = 'rotateY(' + rot.toFixed(1) + 'deg)';
          prevRots[i] = rot;
        }
      });
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
     Scroll progress bar
  ------------------------------------------------------- */
  function initScrollProgress() {
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);

    var ticking = false;
    var maxScroll = 0;

    function cacheMax() {
      maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    }
    cacheMax();
    window.addEventListener('resize', cacheMax, { passive: true });

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var pct = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
          bar.style.width = pct.toFixed(2) + '%';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
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
    initScrollProgress();
  });

})();
