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
     Swipe-to-flip — mobile touch
     Drag left to reveal back, drag right to go back.
     1:1 with finger during drag, snaps at 50% threshold.
     Feels like physically handling a real card.
  ------------------------------------------------------- */
  function initCardFlip() {
    if (!isTouch) return;

    var SNAP    = 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)';
    var NOSNAP  = 'none';
    var THRESHOLD = 0.28; // fraction of card width to trigger flip

    document.querySelectorAll('.card-container').forEach(function (card) {
      var inner   = card.querySelector('.card-inner');
      if (!inner) return;

      var baseRot  = 0;   // 0 = front, 180 = back
      var startX   = 0;
      var startY   = 0;
      var dragging = false;
      var isHoriz  = false;

      card.addEventListener('touchstart', function (e) {
        if (e.target.closest('.card-back__cta')) return;
        startX   = e.touches[0].clientX;
        startY   = e.touches[0].clientY;
        dragging = true;
        isHoriz  = false;
        inner.style.transition = NOSNAP;
      }, { passive: true });

      card.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;

        // Decide axis on first meaningful movement
        if (!isHoriz && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (!isHoriz) {
          isHoriz = Math.abs(dx) > Math.abs(dy);
          if (!isHoriz) { dragging = false; return; } // vertical — hand back to browser
        }

        e.preventDefault(); // now own the gesture
        var delta  = -(dx / card.offsetWidth) * 180;
        var newRot = Math.max(0, Math.min(180, baseRot + delta));
        inner.style.transform = 'rotateY(' + newRot.toFixed(1) + 'deg)';
      }, { passive: false });

      card.addEventListener('touchend', function (e) {
        if (!dragging) return;
        dragging = false;

        var dx = e.changedTouches[0].clientX - startX;

        inner.style.transition = SNAP;

        if (baseRot === 0) {
          // Front showing: flip if swiped left enough
          if (dx < -(card.offsetWidth * THRESHOLD)) {
            baseRot = 180;
            card.classList.add('flipped');
          } else {
            baseRot = 0;
          }
        } else {
          // Back showing: unflip if swiped right enough
          if (dx > (card.offsetWidth * THRESHOLD)) {
            baseRot = 0;
            card.classList.remove('flipped');
          } else {
            baseRot = 180;
          }
        }

        inner.style.transform = 'rotateY(' + baseRot + 'deg)';
      }, { passive: true });
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
