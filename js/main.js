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
     Tap-to-flip — touch devices
     Distinguishes a tap (no/tiny movement) from a scroll.
     Tap flips the card. Second tap unflips.
  ------------------------------------------------------- */
  function initCardFlip() {
    if (!isTouch) return;

    document.querySelectorAll('.card-container').forEach(function (card) {
      var inner = card.querySelector('.card-inner');
      if (!inner) return;

      var startX = 0, startY = 0, moved = false;

      card.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        moved  = false;
      }, { passive: true });

      card.addEventListener('touchmove', function () {
        moved = true; // user is scrolling — ignore on touchend
      }, { passive: true });

      card.addEventListener('touchend', function (e) {
        // Ignore if finger moved (scroll gesture)
        var dx = Math.abs(e.changedTouches[0].clientX - startX);
        var dy = Math.abs(e.changedTouches[0].clientY - startY);
        if (moved || dx > 10 || dy > 10) return;

        // Ignore taps on the CTA link
        if (e.target.closest('.card-back__cta')) return;

        e.preventDefault(); // prevent ghost click

        var flipped = card.classList.contains('flipped');
        card.classList.toggle('flipped', !flipped);
      }, { passive: false });
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
        // On touch: only navigate when back is visible
        if (isTouch && !card.classList.contains('flipped')) return;
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
    initCardFlip();
    initParallax();
    initActiveNav();
    initCountUp();
    initReveal();
    initCardNav();
    initScrollProgress();
  });

})();
