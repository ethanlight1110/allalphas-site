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

      var heroArt = document.querySelector('.hero-art');
      var bar = document.getElementById('scroll-progress');
      var ticking = false;

      function frame() {
        ticking = false;
        var y = window.pageYOffset || 0;
        var max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
        if (bar) bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, y / max)) + ')';
        if (heroArt && y < 1400) heroArt.style.setProperty('--py', y);
        // Fast scrolls/jumps can skip an element without it ever intersecting; reveal anything
        // that is already above the viewport.
        targets.forEach(function (el) {
          if (!el.classList.contains('in') && el.getBoundingClientRect().bottom < 0) {
            el.classList.add('in');
            io.unobserve(el);
          }
        });
      }

      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(frame); }
      }, { passive: true });
      window.addEventListener('resize', frame);
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
