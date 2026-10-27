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

  // Instant press feedback on iOS Safari: :active only fires there when some touch listener exists.
  document.addEventListener('touchstart', function () {}, { passive: true });

  // The nav divider appears once the page has scrolled. It isn't a motion effect, so it runs
  // for everyone, including visitors who ask for reduced motion.
  if (nav) {
    var navTick = false;
    var setNav = function () {
      navTick = false;
      nav.classList.toggle('scrolled', (window.pageYOffset || 0) > 8);
    };
    window.addEventListener('scroll', function () {
      if (!navTick) { navTick = true; requestAnimationFrame(setNav); }
    }, { passive: true });
    setNav();
  }

  // ---- Scroll motion ---------------------------------------------------
  // Reveal-on-scroll, hero phone drift and a progress bar. The head script only adds
  // html.js when the visitor hasn't asked for reduced motion; without it none of this runs
  // and the page stays fully visible.
  var root = document.documentElement;
  if (root.classList.contains('js')) {
    if (!('IntersectionObserver' in window)) {
      root.classList.remove('js');
    } else {
      // [selector, stagger in ms between siblings in the same group]
      var groups = [
        ['.hero-copy > *', 90],
        ['.feat-hero-copy > *', 90],
        ['.feat-shots .phone', 160],
        ['.feat-card', 70],
        ['.feat-cta > *', 90],
        ['.faith > :not(.faith-body)', 110],
        ['.faith-body > *', 110],
        ['.hero-art .phone', 160],
        ['.feature', 90],
        ['.support-body > *', 80],
        ['.help-card', 90],
        ['.section > .section-label', 0]
      ];

      var targets = [];
      groups.forEach(function (g) {
        document.querySelectorAll(g[0]).forEach(function (el, i) {
          if (el.classList.contains('reveal')) return;
          el.classList.add('reveal');
          // Short, capped stagger so lists never feel slow.
          el.style.setProperty('--d', Math.round(Math.min(i, 4) * g[1] * 0.7) + 'ms');
          targets.push(el);
        });
      });

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var r = entry.boundingClientRect;
          // Reveal when it enters, and also anything we've already scrolled past
          // (e.g. after jumping straight to #terms), so nothing stays hidden.
          if (entry.isIntersecting || r.top < 0) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

      targets.forEach(function (el) { io.observe(el); });

      // Scroll work is kept off the layout path: every measurement is taken once up front (and
      // again on resize / font load), and the scroll handler only writes transforms. Reading
      // layout inside a scroll frame forces a style + layout pass each time, which is what makes
      // iOS Safari stutter.
      var heroArt = document.querySelector('.hero-art');
      var heroEl = heroArt && heroArt.closest('.hero');
      var phones = heroArt ? [
        { el: heroArt.querySelector('.front'),  x: 0, y: -60, r: 0 },
        { el: heroArt.querySelector('.behind'), x: 0, y: -110, r: 0 }
      ].filter(function (ph) { return ph.el; }) : [];
      // Phones drift up via a CSS scroll-driven animation where the browser supports it (see
      // styles.css). This JS version is only the fallback for desktop browsers without that
      // support; on touch devices without it the phones simply stay put rather than stutter.
      var cssSwipe = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()'));
      var finePointer = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
      var canSwipe = !cssSwipe && finePointer &&
        !!(window.CSS && CSS.supports && CSS.supports('translate', '1px 1px') && CSS.supports('rotate', '1deg'));
      var bar = document.getElementById('scroll-progress');

      var ticking = false;
      var maxScroll = 1, span = 700, vw = window.innerWidth;
      var lastP = -1, lastBar = -1;
      var pending = [];   // [element, document-y below which it counts as scrolled past]

      function measure() {
        var y = window.pageYOffset || 0;
        vw = window.innerWidth;
        maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        span = Math.max(1, (heroEl ? heroEl.offsetHeight : 700) * 0.9);
        pending = [];
        targets.forEach(function (el) {
          if (el.classList.contains('in')) return;
          // +80 covers the not-yet-applied rise offset; being a little late here is harmless
          pending.push([el, el.getBoundingClientRect().bottom + y + 80]);
        });
        lastP = -1;
      }

      function frame() {
        ticking = false;
        var y = window.pageYOffset || 0;

        var b = Math.min(1, Math.max(0, y / maxScroll));
        if (bar && Math.abs(b - lastBar) > 0.002) {
          lastBar = b;
          bar.style.transform = 'scaleX(' + b.toFixed(3) + ')';
        }

        // Hero phones: 0 at the top, 1 once the hero is mostly scrolled past; stop writing once done.
        if (canSwipe && phones.length) {
          var p = Math.min(1, Math.max(0, y / span));
          if (p !== lastP) {
            lastP = p;
            phones.forEach(function (ph) {
              ph.el.style.translate = (p * ph.x * vw).toFixed(1) + 'px ' + (p * ph.y).toFixed(1) + 'px';
              ph.el.style.rotate = (p * ph.r).toFixed(2) + 'deg';
            });
          }
        }

        // Fast scrolls/jumps can skip an element without it ever intersecting, so reveal anything
        // already above the viewport. Uses the positions cached in measure(): no layout reads.
        if (pending.length) {
          pending = pending.filter(function (item) {
            if (y > item[1]) { item[0].classList.add('in'); io.unobserve(item[0]); return false; }
            return true;
          });
        }
      }

      function requestFrame() {
        if (!ticking) { ticking = true; requestAnimationFrame(frame); }
      }

      var resizeTimer;
      function remeasure() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { measure(); requestFrame(); }, 150);
      }

      window.addEventListener('scroll', requestFrame, { passive: true });
      // Debounced: on phones the collapsing address bar fires resize constantly while scrolling.
      window.addEventListener('resize', remeasure);
      window.addEventListener('orientationchange', remeasure);
      window.addEventListener('load', remeasure);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
      if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);

      measure();
      frame();
    }
  }
})();
