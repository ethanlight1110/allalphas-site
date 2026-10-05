// All Alphas marketing site — minimal interactivity, no frameworks, no tracking.

(function () {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close the mobile menu after tapping a link.
    nav.querySelectorAll('.nav-links a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // TODO: once the App Store listing is live, set this to the real
  // https://apps.apple.com/app/id<...> URL and remove this notice.
  var APP_STORE_URL = null;
  if (APP_STORE_URL) {
    document.querySelectorAll('#download-link, #store-badge-link').forEach(function (el) {
      el.setAttribute('href', APP_STORE_URL);
    });
  }
})();
