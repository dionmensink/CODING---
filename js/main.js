/**
 * main.js
 * - Mobile nav hamburger toggle
 * - Touch-device card flip support
 * - Subtle parallax on hero images
 * - Active nav link highlighting
 */

(function () {
  'use strict';

  /* -------------------------------------------------------
     Mobile Navigation
  ------------------------------------------------------- */
  function initMobileNav() {
    var hamburger = document.querySelector('.site-nav__hamburger');
    var mobileMenu = document.querySelector('.site-nav__mobile');
    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.contains('open');
      if (isOpen) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      } else {
        mobileMenu.classList.add('open');
        hamburger.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
      }
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
      });
    });
  }

  /* -------------------------------------------------------
     Touch / mobile card flip
     On touch devices hover doesn't fire — tap toggles flip.
  ------------------------------------------------------- */
  function initCardFlip() {
    var isTouchDevice = window.matchMedia('(hover: none)').matches;
    if (!isTouchDevice) return;

    var cards = document.querySelectorAll('.card-container');
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        var isFlipped = card.classList.contains('flipped');
        if (!isFlipped) {
          // First tap: flip to show back
          card.classList.add('flipped');
          e.preventDefault(); // prevent navigation on first tap
        }
        // Second tap (already flipped): let the link inside navigate naturally
      });
    });
  }

  /* -------------------------------------------------------
     Parallax — hero images scroll at reduced speed
     Uses requestAnimationFrame + CSS custom property for
     zero-layout-thrash performance.
  ------------------------------------------------------- */
  function initParallax() {
    var heroImages = document.querySelectorAll('.page-hero__image.parallax');
    if (!heroImages.length) return;

    // Respect reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var ticking = false;

    function updateParallax() {
      var scrollY = window.scrollY;
      heroImages.forEach(function (img) {
        var section = img.closest('.page-hero');
        if (!section) return;
        var rect = section.getBoundingClientRect();
        var offset = (rect.top + rect.height / 2) * 0.12;
        img.style.setProperty('--parallax-offset', offset + 'px');
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    updateParallax();
  }

  /* -------------------------------------------------------
     Active nav link highlighting
     Matches current page filename to nav hrefs.
  ------------------------------------------------------- */
  function initActiveNav() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.site-nav__links a, .site-nav__mobile a');

    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var linkPage = href.split('/').pop();
      if (linkPage === currentPage) {
        link.classList.add('active');
      }
    });
  }

  /* -------------------------------------------------------
     Smooth count-up animation for stat numbers.
     Duration scales proportionally to target value so
     large numbers (300) take longer than small ones (8).
     Supports decimals via data-decimals attribute.
  ------------------------------------------------------- */
  function initCountUp() {
    var stats = document.querySelectorAll(
      '.stat__number[data-target], .home-stat__num[data-target]'
    );
    if (!stats.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Find the largest target to scale durations relative to it
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
        var prefix   = el.getAttribute('data-prefix') || '';
        var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);

        // 1200ms minimum, scales up to 4200ms for the largest number
        var duration = 1200 + (target / maxTarget) * 3000;

        var start = null;

        function step(timestamp) {
          if (!start) start = timestamp;
          var progress = Math.min((timestamp - start) / duration, 1);
          // Ease out quart — starts fast, decelerates smoothly at the end
          var eased   = 1 - Math.pow(1 - progress, 4);
          var current = eased * target;
          el.textContent = prefix + current.toFixed(decimals) + suffix;
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = prefix + target.toFixed(decimals) + suffix;
          }
        }

        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });

    stats.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* -------------------------------------------------------
     Fade-in on scroll — lightweight reveal animations
  ------------------------------------------------------- */
  function initReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Show all immediately
      document.querySelectorAll('.reveal').forEach(function (el) {
        el.classList.add('revealed');
      });
      return;
    }

    var revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* -------------------------------------------------------
     Card navigation — clicking anywhere on a card navigates
     to the page defined in data-href.
  ------------------------------------------------------- */
  function initCardNav() {
    var cards = document.querySelectorAll('.card-container[data-href]');
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        // Don't intercept clicks on the explicit CTA link itself
        if (e.target.closest('.card-back__cta')) return;
        var href = card.getAttribute('data-href');
        if (href) {
          document.body.classList.add('fade-out');
          setTimeout(function () {
            window.location.href = href;
          }, 220);
        }
      });
    });
  }

  /* -------------------------------------------------------
     Init all
  ------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    initCardFlip();
    initParallax();
    initActiveNav();
    initCountUp();
    initReveal();
    initCardNav();
  });

})();
