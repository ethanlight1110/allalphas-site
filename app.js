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

  // ---- Beta sign-up ----------------------------------------------------
  // Both values are public by design (the app ships the same ones). The table behind the form
  // can't be read or written with this key; the only way in is the join_beta() function
  // (supabase/migrations/0028_beta_signups.sql in ethanlight1110/all-alphas).
  var SUPABASE_URL = 'https://angejsoovsozmifusyok.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_cPbH63FUT-T_7LQ0evo6zg_KDX5l-oz';

  // TODO: once Apple approves the external TestFlight build, paste the public link here
  // (https://testflight.apple.com/join/...). The page then shows a TestFlight button above
  // the sign-up form, which stays as the waitlist.
  var TESTFLIGHT_URL = null;
  // (When the App Store listing is live, replace the beta block in index.html with the App Store
  // badge and its https://apps.apple.com/app/id<...> link.)

  var tf = document.getElementById('testflight-link');
  if (tf && TESTFLIGHT_URL) {
    tf.setAttribute('href', TESTFLIGHT_URL);
    tf.hidden = false;
  }

  var form = document.getElementById('beta-form');
  var status = document.getElementById('beta-status');
  var done = document.getElementById('beta-done');
  var submit = document.getElementById('beta-submit');

  function say(text, isError) {
    status.textContent = text || '';
    status.classList.toggle('error', !!isError);
  }

  function showDone() {
    form.hidden = true;
    done.hidden = false;
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = form.elements.email.value.trim();
      var first = form.elements.first.value.trim();
      var last = form.elements.last.value.trim();
      var confirmed = form.elements.confirm.checked;

      // Honeypot: real people never see this field. Pretend it worked and send nothing.
      if (form.elements.website.value) { showDone(); return; }

      if (!first) {
        say('Enter your first name.', true);
        form.elements.first.focus();
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        say('Enter a valid email address.', true);
        form.elements.email.focus();
        return;
      }
      if (!confirmed) {
        say('Please confirm you are 18 or older and have an iPhone.', true);
        return;
      }

      say('');
      submit.disabled = true;
      submit.textContent = 'Sending…';

      fetch(SUPABASE_URL + '/rest/v1/rpc/join_beta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          p_email: email,
          p_first_name: first,
          p_last_name: last,
          p_confirmed: confirmed
        })
      }).then(function (res) {
        if (res.ok) { showDone(); return; }
        return res.json().catch(function () { return {}; }).then(function (body) {
          // The function's own messages (code P0001) are written for people; anything else is generic.
          var friendly = body && body.code === 'P0001' && body.message;
          say(friendly || 'Something went wrong. Please try again, or email support@allalphas.com.', true);
        });
      }).catch(function () {
        say('Could not reach the server. Check your connection and try again.', true);
      }).then(function () {
        submit.disabled = false;
        submit.textContent = 'Join the beta';
      });
    });
  }

  // ---- Scroll motion ---------------------------------------------------
  // Reveal-on-scroll, hero phone parallax and a progress bar. The head script only adds
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
        ['.section-label', 0],
        ['.safety-body > *', 70],
        ['.rule', 80],
        ['.legal-item', 40],
        ['.clause', 40],
        ['footer', 0]
      ];

      var targets = [];
      groups.forEach(function (g) {
        document.querySelectorAll(g[0]).forEach(function (el, i) {
          if (el.classList.contains('reveal')) return;
          el.classList.add('reveal');
          // Cap the stagger so long lists (legal text) never feel slow.
          el.style.setProperty('--d', Math.min(i, 5) * g[1] + 'ms');
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
        { el: heroArt.querySelector('.front'),  x: 0.85, y: -30, r: 9 },
        { el: heroArt.querySelector('.behind'), x: 1.15, y: -50, r: 12 }
      ].filter(function (ph) { return ph.el; }) : [];
      var canSwipe = !!(window.CSS && CSS.supports && CSS.supports('translate', '1px 1px') && CSS.supports('rotate', '1deg'));
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

  // The nav button jumps to the form; put the cursor in the email field once it gets there.
  var join = document.getElementById('join-link');
  if (join && form) {
    join.addEventListener('click', function () {
      setTimeout(function () {
        if (!form.hidden) form.elements.first.focus({ preventScroll: true });
      }, 400);
    });
  }
})();
