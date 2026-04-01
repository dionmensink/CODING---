/**
 * transitions.js
 * Smooth page fade-out/fade-in on internal navigation.
 * Uses only CSS opacity transitions — GPU-composited, no layout thrash.
 */

(function () {
  'use strict';

  const FADE_DURATION = 220; // ms — must match CSS transition duration

  /**
   * Fade body out, then navigate to the given URL.
   * @param {string} url
   */
  function navigateTo(url) {
    document.body.classList.add('fade-out');
    setTimeout(function () {
      window.location.href = url;
    }, FADE_DURATION);
  }

  /**
   * Intercept clicks on internal links and apply fade transition.
   */
  function interceptLinks() {
    document.addEventListener('click', function (e) {
      // Walk up from target to find closest anchor
      var target = e.target.closest('a');
      if (!target) return;

      var href = target.getAttribute('href');
      if (!href) return;

      // Skip: external links, hash-only, mailto:, tel:, javascript:
      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) return;

      // Skip: modifier keys held (open in new tab etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Skip: target="_blank"
      if (target.getAttribute('target') === '_blank') return;

      e.preventDefault();
      navigateTo(href);
    });
  }

  /**
   * On page load, remove the fade-out class so the page fades in.
   */
  function initFadeIn() {
    // Body starts at opacity 0 via inline style set in <head>
    // Remove fade-out (if set) and let CSS transition do the rest
    document.body.classList.remove('fade-out');
  }

  // Init
  document.addEventListener('DOMContentLoaded', function () {
    initFadeIn();
    interceptLinks();
  });

  // Handle browser back/forward
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.body.classList.remove('fade-out');
    }
  });

})();
