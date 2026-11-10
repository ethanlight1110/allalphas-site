// Friend (/f/?c=) and team (/t/?c=) QR pages: shows the code and points "Open in All Alphas" at
// the app's own link. The code goes into the page with textContent only, never as HTML.
(function () {
  var card = document.getElementById('card');
  var kind = card.getAttribute('data-kind');
  var c = (new URLSearchParams(location.search).get('c') || '').toUpperCase().replace(/[\s-]/g, '');
  var ok = kind === 'f' ? /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(c) : /^[A-Z0-9]{8}$/.test(c);
  var codeEl = document.getElementById('code');
  var openEl = document.getElementById('open-app');
  if (!ok) {
    card.classList.add('drill-missing');
    document.getElementById('title').textContent = 'Code not found';
    codeEl.textContent = 'This link is missing its code.';
    openEl.hidden = true;
    return;
  }
  codeEl.textContent = c.slice(0, 4) + ' ' + c.slice(4);
  openEl.href = kind === 'f' ? 'allalphas://friends/add?q=' + c : 'allalphas://teams/join?code=' + c;
})();
