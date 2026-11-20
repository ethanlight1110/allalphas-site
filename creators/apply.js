// Creator Program pop-up form. Posts to the Supabase Edge Function `creator-apply`
// (supabase/functions/creator-apply in ethanlight1110/all-alphas), which emails the application
// to support@allalphas.com through Resend. Nothing is stored in the database.
// The checks here are for quick feedback; the function checks everything again.

(function () {
  var ENDPOINT = 'https://angejsoovsozmifusyok.supabase.co/functions/v1/creator-apply';

  var dialog = document.getElementById('apply-dialog');
  var form = document.getElementById('apply-form');
  if (!dialog || !form || typeof dialog.showModal !== 'function') return; // links fall back to #apply

  var email = document.getElementById('apply-email');
  var insta = document.getElementById('apply-instagram');
  var followers = document.getElementById('apply-followers');
  var trap = document.getElementById('apply-website');
  var status = document.getElementById('apply-status');
  var submit = document.getElementById('apply-submit');
  var done = document.getElementById('apply-done');
  var opener = null;
  var sending = false;

  function open(e) {
    e.preventDefault();
    opener = e.currentTarget;
    dialog.showModal();
    (done.hidden ? email : document.getElementById('apply-done-close')).focus();
  }

  function close() { dialog.close(); }

  document.querySelectorAll('[data-apply]').forEach(function (a) { a.addEventListener('click', open); });
  document.getElementById('apply-close').addEventListener('click', close);
  document.getElementById('apply-done-close').addEventListener('click', close);
  // Tapping the dimmed area outside the card closes it.
  dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
  dialog.addEventListener('close', function () { if (opener) opener.focus(); });

  function say(msg, bad) {
    status.textContent = msg;
    status.classList.toggle('bad', !!bad);
  }

  function mark(input, bad) {
    if (bad) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  // "@name", "name" or a profile link → "name"
  function cleanHandle(v) {
    return v.trim().toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, '')
      .replace(/[\/?].*$/, '')
      .replace(/^@/, '');
  }

  // "1,200" or "1 200" → 1200; anything else → NaN
  function cleanCount(v) {
    var digits = v.replace(/[\s,.]/g, '');
    return /^\d{1,10}$/.test(digits) ? parseInt(digits, 10) : NaN;
  }

  [email, insta, followers].forEach(function (i) {
    i.addEventListener('input', function () { mark(i, false); if (status.classList.contains('bad')) say(''); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    var em = email.value.trim();
    var ig = cleanHandle(insta.value);
    var n = cleanCount(followers.value);

    var problem = null, field = null;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) || em.length > 254) { problem = 'Enter a valid email address.'; field = email; }
    else if (!/^[a-z0-9._]{1,30}$/.test(ig)) { problem = 'Enter your Instagram username (letters, numbers, periods and underscores).'; field = insta; }
    else if (isNaN(n)) { problem = 'Enter your follower count as a number.'; field = followers; }
    else if (n < 500) { problem = 'The Creator Program needs at least 500 followers.'; field = followers; }
    if (problem) {
      mark(field, true);
      say(problem, true);
      field.focus();
      return;
    }

    // Bots fill the hidden field: thank them and send nothing (the function checks it too).
    if (trap.value) { finish(); return; }

    sending = true;
    submit.disabled = true;
    say('Sending…');

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, instagram: ig, followers: n, website: trap.value })
    }).then(function (res) {
      if (res.ok) { finish(); return; }
      return res.json().catch(function () { return {}; }).then(function (body) {
        // The function's own messages are written for people; anything else gets the generic one.
        var err = new Error('server');
        if (body && typeof body.error === 'string' && body.error.length < 200) err.human = body.error;
        throw err;
      });
    }).catch(function (err) {
      var msg = err && err.human
        ? err.human
        : 'Something went wrong. Check your connection and try again, or email support@allalphas.com.';
      say(msg, true);
    }).then(function () {
      sending = false;
      submit.disabled = false;
    });
  });

  function finish() {
    form.hidden = true;
    done.hidden = false;
    say('');
    document.getElementById('apply-done-close').focus();
  }
})();
