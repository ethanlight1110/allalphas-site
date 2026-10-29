// ?k=bill: a library drill (listed in drills.js). ?c=AB12CD34: someone's own drill, read from the
// All Alphas server with its public key (the same read the app does; 0034 drill_link).
// Everything from the URL or the server goes into the page with textContent only, never as HTML.
(function () {
  var SUPABASE_URL = 'https://angejsoovsozmifusyok.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_cPbH63FUT-T_7LQ0evo6zg_KDX5l-oz';
  var TIMEOUT_MS = 10000;
  var params = new URLSearchParams(location.search);
  var k = (params.get('k') || '').toLowerCase();
  var c = (params.get('c') || '').toUpperCase();
  var nameEl = document.getElementById('drill-name');
  var metaEl = document.getElementById('drill-meta');
  var descEl = document.getElementById('drill-desc');
  var openEl = document.getElementById('open-app');

  function show(name, meta, desc) {
    nameEl.textContent = name;
    metaEl.textContent = meta || '';
    if (desc) { descEl.textContent = desc; descEl.hidden = false; }
    document.title = name + ' — All Alphas';
  }
  function missing(why) {
    document.getElementById('drill').classList.add('drill-missing');
    show('Drill not found', why, '');
    openEl.hidden = true;
  }
  function unavailable() {
    show('Shared drill', 'Couldn’t load the drill right now. Open it in All Alphas, or try again.', '');
  }

  // The compact drill the app shares: [1, name, description, scoring, category, mode, diagram,
  // targets, steps[[name, shots, distance, distanceTo, metric, par, …]], …].
  function metaFromPayload(p) {
    var steps = (Array.isArray(p[8]) ? p[8] : []).filter(Array.isArray);
    var rounds = steps.reduce(function (a, s) { return a + (Number(s[1]) || 0); }, 0);
    var unit = steps[0] && steps[0][4] ? 'm' : 'yd';
    var all = [];
    steps.forEach(function (s) {
      if (typeof s[2] === 'number') all.push(s[2]);
      if (typeof s[3] === 'number') all.push(s[3]);
    });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var dist = all.length ? (lo === hi ? lo + ' ' + unit : lo + '–' + hi + ' ' + unit) : '';
    var dry = p[5] === 1;
    var bits = [];
    if (steps.length > 1) bits.push(steps.length + ' steps');
    if (!dry) bits.push(rounds + ' rds');
    if (dist) bits.push(dist);
    bits.push(dry ? 'dry fire' : (p[3] === 1 ? 'IDPA' : 'USPSA'));
    if (steps.length === 1) bits.push('par ' + (Number(steps[0][5]) || 0).toFixed(2));
    return bits.join(' · ');
  }

  if (/^[a-z0-9-]{1,40}$/.test(k)) {
    openEl.href = 'allalphas://d?k=' + k;
    var lib = window.LIBRARY_DRILLS || {};
    // Own keys only, so ?k=constructor doesn't pick up Object.prototype.constructor.
    var d = Object.prototype.hasOwnProperty.call(lib, k) ? lib[k] : null;
    if (d) show(d.name, d.meta, d.description);
    else missing('This drill isn’t in the library. Update All Alphas to get it.');
  } else if (/^[A-HJKMNP-Z2-9]{8}$/.test(c)) {
    openEl.href = 'allalphas://d?c=' + c;
    // Give up after a while if the server doesn't answer, rather than showing "Loading…" forever.
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); unavailable(); }, TIMEOUT_MS);
    fetch(SUPABASE_URL + '/rest/v1/rpc/drill_link', {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: c }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) {
        clearTimeout(timer);
        var row = Array.isArray(rows) ? rows[0] : null;
        if (!row) return missing('This drill link has been taken down or never existed.');
        if (typeof row.name !== 'string' || !row.name) return unavailable();
        var p = [];
        try { p = JSON.parse(row.payload); } catch (e) { /* show the name only */ }
        var meta = '';
        try { if (Array.isArray(p)) meta = metaFromPayload(p); } catch (e) { /* show the name only */ }
        show(row.name, meta, Array.isArray(p) && typeof p[2] === 'string' ? p[2] : '');
      })
      // Never shows the server's own error text: a fixed, friendly message only.
      .catch(function () { clearTimeout(timer); unavailable(); });
  } else {
    missing('This link doesn’t point at a drill.');
  }
})();
