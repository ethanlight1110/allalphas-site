# allalphas.com security audit

Date: 2026-10-28. Scope: this repo (every file and all 36 commits in its history), the live site's
public response headers, and the domain's public DNS records. The server side of the old beta form
(`0028_beta_signups.sql`, `0029_beta_signup_names.sql`) and the shared-drill lookup
(`0034_drill_links.sql`) in the app repo were read, not changed. Nothing aggressive was run against
the live site: only plain `curl -I` of public pages and `dig` lookups.

**Bottom line:** no Critical problems. No secret keys exist anywhere in the site or its history. The
pages can't be used to inject code (XSS). The biggest risk is **email spoofing**: nothing tells mail
providers to reject fake email "from" allalphas.com. That takes one DNS record to fix. Next is the
retired beta sign-up function, which anyone can still call.

| # | Severity | Finding | Status |
|---|---|---|---|
| H1 | High | No DMARC record: anyone can send email pretending to be @allalphas.com | **Owner: DNS** |
| M1 | Medium | `join_beta()` is still open to the public though the form was removed; its flood limit is shared by everyone | **Owner / database session** |
| M2 | Medium | No security headers (HSTS, anti-framing, etc.); the site isn't behind Cloudflare's proxy | Partly fixed (meta CSP); **Owner: Cloudflare** |
| M3 | Medium | The custom domain isn't verified with GitHub Pages (domain-takeover safeguard) | **Owner: GitHub** |
| L1 | Low | DNSSEC is off | **Owner: Cloudflare** |
| L2 | Low | No CAA records | **Owner: DNS** |
| L3 | Low | Google Fonts: third-party code that can't be pinned with SRI, and not listed in the Privacy Policy | Recommendation |
| L4 | Low | Drill page: no time limit on the server lookup, a lookup quirk, fragile parsing | **Fixed** |
| L5 | Low | Inline `onerror=` handlers on the home page | **Fixed** |
| L6 | Low | `README.md` (and every other repo file) is publicly readable on the site | Informational |
| L7 | Low | Drill link codes come from Postgres `random()` | Note for database session |

---

## High

### H1. No DMARC: allalphas.com email can be faked

**What it means.** Sign-in codes go out from allalphas.com through Resend. Today a scammer can send
an email that says "From: support@allalphas.com" from any server. Nothing published for
allalphas.com tells Gmail or iCloud to reject it. A fake "your All Alphas sign-in code" or "verify
your account" email is a classic phishing trick, and it would look like it came from you.

**What's already right.** Resend's DKIM key (`resend._domainkey`) and its sending subdomain's SPF
(`send.allalphas.com`) are set up. Cloudflare Email Routing's SPF and DKIM are on the root domain.
So your real mail already passes the checks. The missing piece is the rule that says "reject mail
that fails them": DMARC.

**Fix (Cloudflare → DNS, about 5 minutes, then a few weeks of watching).**
1. Easiest: Cloudflare dashboard → allalphas.com → **Email → DMARC Management** → enable. It
   creates the `_dmarc` record with a reporting address and shows who sends mail as you.
   By hand instead: add `TXT _dmarc` = `v=DMARC1; p=none; rua=mailto:<a mailbox you read>`.
2. After 2–4 weeks of reports showing only Resend and Cloudflare sending as you, change `p=none`
   to `p=quarantine` (fakes go to spam). A few weeks later, change it to `p=reject` (fakes are refused).
3. Send yourself a sign-in code after each step to confirm real mail still arrives.

## Medium

### M1. The retired beta sign-up function can still be called, and one person can block it for everyone

**What it means.** The sign-up form was taken off the site on Oct 23 (the TestFlight link replaced
it), but `join_beta()` still exists in Supabase and anyone may call it. The publishable key is
public by design, so a script can call it directly without ever loading the site. The site's
honeypot field was in the page's JavaScript, so it never stopped a script calling Supabase directly.
Also, that code is gone now.

What the server does well: it checks the email format and limits names to 40 characters, keeps
nothing but those fields, ignores repeats silently (so nobody can test who signed up), and nobody
can read the list with the public key. It sends no email, so it can't be used to spam people.

What's weak:
- **The 30-per-minute limit is global, not per sender.** One script making 30 calls a minute uses
  the whole allowance, and real people then get "Busy right now". (Two calls arriving at the same
  instant can also slip past it, but that barely matters.)
- **Anyone's email can be added.** Up to 30 a minute, about 43,000 a day, made-up or real people's
  addresses. If that list were later imported into TestFlight, Apple would email invites to
  strangers on your behalf.

**Fix.** The form is retired, so turn the function off. This is a new migration in the app repo
(the database session's area):
`revoke execute on function public.join_beta(text, text, text, boolean) from anon, authenticated;`
Before inviting anyone from `beta_signups`, look over the list for junk. If a sign-up form ever
returns, put **Cloudflare Turnstile** on it *and* have an Edge Function check the Turnstile token
before it inserts. A Turnstile widget alone does nothing while the database function is directly
callable. Also make the limit per sender (by IP address in the Edge Function), not global.
**Turnstile isn't needed today**, since there is no form.

Related note: putting the website behind Cloudflare (M2) does **not** protect Supabase. Attackers
call `angejsoovsozmifusyok.supabase.co` directly, not allalphas.com. Rate limits for the API belong
in the database and Edge Functions (the rate-limits session's area).

### M2. No security headers; the site isn't behind Cloudflare's proxy

**What it means.** Today the live site sends no security headers. `curl -I https://allalphas.com/`
shows `server: GitHub.com`, no `cf-ray`. DNS is on Cloudflare, but the proxy (orange cloud) is off,
so traffic goes straight to GitHub. GitHub Pages can't add custom headers. Missing:
- **HSTS**: tells browsers "always use HTTPS here". GitHub does redirect http → https (checked), but
  without HSTS, someone on a hostile Wi-Fi network can intercept that first plain-http request.
- **Anti-framing** (`frame-ancestors` / `X-Frame-Options`): another site could show allalphas.com
  inside a frame and trick clicks. The impact is small, since the site has no forms or logged-in
  actions, but it's free to block.
- `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`: hardening. Browsers already
  default to a safe referrer policy.

**Fixed in this branch: a Content-Security-Policy `<meta>` tag on every page.** It tells the
browser to run only scripts from allalphas.com itself, plus the few small inline snippets the pages
already have, each allowed by an exact fingerprint (hash). It loads styles only from the site and
Google Fonts, fonts only from Google Fonts, and lets the drill page talk only to your Supabase
project. If someone ever found a way to inject HTML, the injected script wouldn't run. To make that
possible, the two inline `onerror=` handlers moved into `app.js`, and the drill page's script moved
into `d/drill.js`. `tools/csp.py` writes the tags. **If you edit any inline `<script>` or `<style>`
in a page, run `python3 tools/csp.py` afterwards**, or the browser will block it. Run
`python3 tools/csp.py --check` to test. A `<meta>` policy **can't** do anti-framing (it ignores
`frame-ancestors`), HSTS, or the other headers; those need Cloudflare.

**Fix (Cloudflare).** See "Cloudflare checklist" below. The trade-off: GitHub renews the site's
HTTPS certificate itself, and that usually keeps working behind Cloudflare's proxy with SSL mode
**Full (strict)**. Still, check GitHub → repo → Settings → Pages about 3 months after you switch
the proxy on. If GitHub reports a certificate problem, set SSL mode to **Full** (not strict).

### M3. The domain isn't verified with GitHub Pages

**What it means.** `allalphas.com` points at GitHub Pages, but there's no
`_github-pages-challenge-ethanlight1110` record. If this repo's Pages site were ever switched off,
renamed or made private while DNS still pointed at GitHub, another GitHub user could claim
allalphas.com and serve their own pages on it: phishing on your real domain. Verifying the domain
locks it to your account.

**Fix.** GitHub → your profile **Settings → Pages → Add a domain** → `allalphas.com`. Add the TXT
record it shows in Cloudflare DNS, then click Verify. Leave the record in place afterwards.

## Low

### L1. DNSSEC is off
No DS record, so DNS answers for allalphas.com aren't signed and could in theory be forged on the
way to a visitor. **Fix:** Cloudflare → DNS → Settings → **Enable DNSSEC**. If the domain is
registered at Cloudflare Registrar, that's all. Otherwise copy the DS record it shows into your
registrar.

### L2. No CAA records
CAA records say which certificate authorities may issue HTTPS certificates for your domain, so a
mis-issued certificate from some other CA is refused. **Fix:** add CAA records (Cloudflare → DNS →
Add record → CAA): `0 issue "letsencrypt.org"` (GitHub Pages), plus `0 issue "pki.goog"` and
`0 issue "ssl.com"` if you turn on Cloudflare's proxy. Cloudflare also adds its own CAs
automatically when Universal SSL is on. Don't add an `issuewild ";"` record: Cloudflare's edge
certificate covers `*.allalphas.com`.

### L3. Google Fonts
Every page loads its fonts from `fonts.googleapis.com`. That stylesheet differs by browser, so it
can't be pinned with Subresource Integrity (SRI), and each visit tells Google the visitor's IP
address. The Privacy Policy lists processors but not Google. The CSP now limits this to fonts and
font styles only. The site loads no other third-party scripts. **Recommendation:** self-host the
three fonts (Barlow Condensed, Geist, Geist Mono are open-licensed). Put the `.woff2` files in
`assets/fonts/`, replace the Google `<link>`s with `@font-face` rules in `styles.css`, then remove
the Google entries from `tools/csp.py` and re-run it. That removes the last third party and the
privacy gap in one go.

### L4. Drill page hardening (fixed)
`d/index.html` / `d/drill.js` already wrote everything from the URL and the server with
`textContent`, never as HTML, and `?k=` / `?c=` are checked against strict patterns before use.
Tested in the browser with `?k=<img src=x onerror=alert(1)>` and with server data containing
`<b>`/`<script>`: shown as plain text, nothing ran. Fixed:
- If Supabase hung, the page said "Loading…" forever. It now gives up after 10 seconds and shows the
  friendly "Couldn't load the drill right now" message. It also does that when Supabase is down,
  which was tested by simulating both.
- `?k=constructor` showed a drill named "Object" (a JavaScript built-in). Now it says "Drill not found".
- A badly-shaped drill from the server now still shows its name rather than a load error.
The page never shows raw server errors.

### L5. Inline event handlers (fixed)
The home page's two screenshots had `onerror="…"` attributes. They're harmless, but they force a CSP
to allow inline code. That logic now lives in `app.js`.

### L6. Everything in the repo is public
GitHub Pages serves every committed file, so `https://allalphas.com/README.md` is readable, roadmap
notes and all. Nothing secret is in it, and the repo itself is public anyway, so this is only a
reminder: **never commit anything private to this repo**, since it's published the moment it lands
on `main`.

### L7. Drill link codes use Postgres `random()` (database session)
`new_drill_link_code()` in `0034` builds codes with `random()`, which isn't a cryptographic
generator. With 31⁸ ≈ 850 billion possible codes, guessing a live link isn't realistic, and shared
drills are meant to be shareable anyway. Using `gen_random_bytes()` would be the textbook choice.

---

## Checked and fine

- **Keys.** The only key in the site and its entire git history is the Supabase **publishable** key
  (`sb_publishable_…`), which is meant to be public. Searched every commit for `sb_secret_`,
  `service_role`, `sk_live`/`sk_test`, `re_…` (Resend), `-----BEGIN`, JWTs (`eyJhbGci`), AWS/GitHub/
  Slack token prefixes, "password", "secret" and "token": nothing. The publishable key is only safe
  because of the database's row-level security, which the database session is reviewing.
- **`.git` isn't exposed** (`/.git/HEAD` → 404). No source maps, no test pages, no build leftovers.
  A stray screenshot committed once was removed (`f1025da`) and was only an image.
- **HTTPS.** http → https and www → apex redirects work. GitHub's certificate is valid.
- **XSS.** No `innerHTML`, `insertAdjacentHTML`, `document.write` or `eval` anywhere. `app.js`
  only toggles classes and sets numeric styles. The redirect pages use fixed URLs.
- **Links.** Every `target="_blank"` link has `rel="noopener"`.
- **Apple app links.** `.well-known/apple-app-site-association` lists only `/d` and `/d/*` for the
  single app `3U74PSALQK.com.allalphas.app`: as narrow as it should be. The live file matches the
  repo. GitHub serves it as `application/octet-stream`, which Apple accepts.
- **Drill lookup server side.** `drill_link()` returns only a drill's name and contents, hides
  removed drills and suspended users, and only the owner's signed-in app can create links (50 a day).

---

## Owner checklist

### DNS (Cloudflare → allalphas.com → DNS)
- [ ] **DMARC (H1):** Email → DMARC Management → enable (or add `TXT _dmarc`
      `v=DMARC1; p=none; rua=mailto:<you>`). After 2–4 clean weeks, change to `p=quarantine`, then `p=reject`.
- [ ] **GitHub domain verification (M3):** add the `_github-pages-challenge-ethanlight1110` TXT
      record GitHub shows you, then verify.
- [ ] **DNSSEC (L1):** DNS → Settings → Enable DNSSEC (add the DS record at the registrar if it isn't Cloudflare).
- [ ] **CAA (L2):** `0 issue "letsencrypt.org"`. If you enable the proxy, also `0 issue "pki.goog"`
      and `0 issue "ssl.com"`.

### Cloudflare proxy and headers (M2)
1. [ ] SSL/TLS → Overview → mode **Full (strict)**.
2. [ ] DNS → turn the proxy **on** (orange cloud) for the `allalphas.com` A/AAAA records and `www`.
3. [ ] SSL/TLS → Edge Certificates → **Always Use HTTPS** on. Turn on **HSTS** with max-age 6 months
       and include subdomains. Hold off on "preload" until you're sure every subdomain works over
       HTTPS for good, because it's hard to undo.
4. [ ] Rules → **Transform Rules → Modify Response Header** → Create rule "Security headers".
       When: *Custom filter expression* `(http.host eq "allalphas.com")`. Then **Set static**:

       | Header | Value |
       |---|---|
       | `X-Frame-Options` | `DENY` |
       | `Content-Security-Policy` | `frame-ancestors 'none'` |
       | `X-Content-Type-Options` | `nosniff` |
       | `Referrer-Policy` | `strict-origin-when-cross-origin` |
       | `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` |
       | `Cross-Origin-Opener-Policy` | `same-origin` |

       (The header CSP only adds anti-framing. The page's own `<meta>` CSP still does the rest, and
       browsers apply both.)
5. [ ] Check: `curl -sI https://allalphas.com/ | grep -iE 'cf-ray|strict|x-frame|content-security'`.
       Then open a `/d/?c=…` link from a real run image to confirm it still loads, and confirm the
       iPhone still opens `/d` links in the app.
6. [ ] About 3 months later: GitHub → repo → Settings → Pages shows no certificate warning.

### Supabase (M1, with the database session)
- [ ] New migration: `revoke execute on function public.join_beta(text, text, text, boolean) from anon, authenticated;`
- [ ] Look over `beta_signups` for junk before inviting anyone from it.

### Later
- [ ] Self-host the fonts (L3), or else list Google Fonts in the Privacy Policy.
- [ ] Once `support@` / `security@` mailboxes are confirmed, add `/.well-known/security.txt` so
      researchers know where to report problems.
