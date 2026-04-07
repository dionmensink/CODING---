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
     Draw-a-smiley card flip (mobile)
     Draw a circle with your finger → card flips.
     Tap the back face → unflips.
     No ML, no libraries — pure canvas + geometry.
  ------------------------------------------------------- */
  function initCardFlip() {
    var isTouchDevice = window.matchMedia('(hover: none)').matches;
    if (!isTouchDevice) return;

    var tealColor = (getComputedStyle(document.documentElement)
      .getPropertyValue('--orange') || '#0d7d8c').trim();

    var alreadyFlipped = sessionStorage.getItem('smiley-flipped');

    document.querySelectorAll('.card-container').forEach(function (card) {

      // Inject hint text at top of card-front (hidden after first flip)
      if (!alreadyFlipped) {
        var cardFront = card.querySelector('.card-front');
        if (cardFront) {
          var hint = document.createElement('div');
          hint.className = 'smiley-hint';
          hint.textContent = 'teken een smiley \u263a';
          hint.setAttribute('aria-hidden', 'true');
          cardFront.appendChild(hint);
        }
      }

      // Canvas overlay — direct child of card-container (outside 3D transform)
      var canvas = document.createElement('canvas');
      canvas.className = 'card-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      card.appendChild(canvas);
      var ctx = canvas.getContext('2d');

      function sizeCanvas() {
        if (canvas.width  !== card.offsetWidth)  canvas.width  = card.offsetWidth;
        if (canvas.height !== card.offsetHeight) canvas.height = card.offsetHeight;
      }
      sizeCanvas();
      if (window.ResizeObserver) new ResizeObserver(sizeCanvas).observe(card);

      // Drawing state
      var path = [], segTotal = 0;
      var ox, oy;
      var live = false, isTap = false, decided = false, scrolling = false;

      function wipe() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

      function pt(t) {
        var r = card.getBoundingClientRect();
        return { x: t.clientX - r.left, y: t.clientY - r.top };
      }

      /* Circle detection — 3 geometric checks */
      function isCircle() {
        if (path.length < 8 || segTotal < 80) return false;
        // 1. Closed loop
        var f = path[0], l = path[path.length - 1];
        if (Math.hypot(l.x - f.x, l.y - f.y) / segTotal >= 0.35) return false;
        // 2. Roundness (bounding-box aspect ratio)
        var xs = path.map(function (p) { return p.x; });
        var ys = path.map(function (p) { return p.y; });
        var bw = Math.max.apply(null, xs) - Math.min.apply(null, xs);
        var bh = Math.max.apply(null, ys) - Math.min.apply(null, ys);
        if (bw < 30 || bh < 30) return false;
        return Math.min(bw, bh) / Math.max(bw, bh) >= 0.45;
      }

      card.addEventListener('touchstart', function (e) {
        var p = pt(e.touches[0]);
        ox = p.x; oy = p.y;
        path = [p]; segTotal = 0;
        live = true; isTap = true; decided = false; scrolling = false;
        canvas.classList.remove('fading');
        wipe();
        ctx.strokeStyle = tealColor;
        ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
      }, { passive: true });

      card.addEventListener('touchmove', function (e) {
        if (!live) return;
        var p = pt(e.touches[0]);
        var dx = p.x - ox, dy = p.y - oy, dist = Math.hypot(dx, dy);

        // On first significant movement, decide: drawing or scrolling?
        if (!decided && dist > 12) {
          decided = true;
          scrolling = Math.abs(dy) > Math.abs(dx) * 2;
        }
        if (scrolling)  { live = false; wipe(); return; } // let browser scroll
        if (!decided)   return;

        e.preventDefault(); // committed to drawing — block scroll
        if (dist > 10)  isTap = false;

        var prev = path[path.length - 1];
        var seg  = Math.hypot(p.x - prev.x, p.y - prev.y);
        if (seg < 2) return;
        segTotal += seg; path.push(p);
        ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
      }, { passive: false });

      card.addEventListener('touchend', function () {
        if (!live) return;
        live = false;

        if (isTap) {
          wipe();
          if (card.classList.contains('flipped')) card.classList.remove('flipped');
          // Absorb the synthetic click so initCardNav won't navigate
          var eat = function (ev) {
            if (!ev.target.closest('.card-back__cta')) ev.preventDefault();
            card.removeEventListener('click', eat, true);
          };
          card.addEventListener('click', eat, true);
          return;
        }

        if (isCircle()) {
          card.classList.add('flipped');
          setTimeout(function () {
            canvas.classList.add('fading');
            setTimeout(function () { canvas.classList.remove('fading'); wipe(); }, 650);
          }, 80);
          // Hide hints after first successful smiley
          if (!sessionStorage.getItem('smiley-flipped')) {
            sessionStorage.setItem('smiley-flipped', '1');
            document.querySelectorAll('.smiley-hint').forEach(function (h) {
              h.style.transition = 'opacity 0.5s ease';
              h.style.opacity = '0';
              setTimeout(function () { h.style.display = 'none'; }, 500);
            });
          }
        } else {
          // Failed detection — fade trail out
          canvas.classList.add('fading');
          setTimeout(function () { canvas.classList.remove('fading'); wipe(); }, 650);
        }
        path = []; segTotal = 0;
      }, { passive: true });

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
