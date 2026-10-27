# allalphas.com

The public marketing site for **All Alphas** (VanLi Labs LLC). Plain HTML/CSS/JS,
no build step, no framework, no tracking. Hosted free on GitHub Pages at
`allalphas.com`.

Built from the design handoff (`design_handoff_allalphas_website/`, option 3a):
dark theme matching the app (`src/theme/tokens.ts` in
`ethanlight1110/all-alphas`). The home page is one long page: landing (hero, Join on TestFlight button, features), then
Faith, Safety and Support as scroll sections (`/#faith`, `/#safety`, `/#support`).
Privacy, Terms and Community are their own pages. There is no build step,
so the nav and footer are repeated in each page's HTML; change them in all 5 (the nav is Features, Privacy, Terms, Community + the beta pill; Faith, Safety and Support are home-page sections linked from the footer)
(`index.html`, `features/`, `privacy/`, `terms/`, `community/`).

## App Store Connect values

- Privacy Policy URL: `https://allalphas.com/privacy/`
- Support URL: `https://allalphas.com/support/` (redirects to `/#support`)
- Old one-page links `/#privacy`, `/#terms`, `/#community` redirect from the home page to those pages.

## Structure

```
index.html      home: hero + Download now, features, Faith, Safety, Support
features/       Features page (cards + the two app screenshots)
support/        redirects to /#support (nicer URL for App Store Connect)
safety/         redirects to /#safety
faith/          redirects to /#faith
privacy/        Privacy Policy page
terms/          Terms of Service page
community/      Community Guidelines page
styles.css
app.js          mobile nav, nav divider on scroll, press feedback, scroll motion (reveals, hero phones drifting up, progress bar; off for reduced-motion visitors); no analytics, no trackers
assets/         logo.svg, app icon, favicon, screenshots
CNAME           tells GitHub Pages this repo serves allalphas.com
```

## Open items before this goes live (see project roadmap)

- [x] Beta sign-up form (hero), live 2026-10-15: `0028_beta_signups.sql` and `0029_beta_signup_names.sql` run in Supabase; the list is in Table Editor → `beta_signups`
- [x] Privacy Policy: cover the beta sign-up list (first name, optional last name, email) (2026-10-15)
- [ ] After the beta, before App Store go-live: delete the `beta_signups` data (see all-alphas `docs/LAUNCH.md`)
- [x] TestFlight public link live 2026-10-23: the hero "Join on TestFlight" button and the nav "Join the beta" pill link to https://testflight.apple.com/join/QeFHPPyd (the beta sign-up form was removed from the page; `join_beta()` and `beta_signups` still exist in Supabase)
- [ ] Real App Store badge (Apple's official asset) and URL once the app is listed — replace the beta block in `index.html`
- [x] Real app screenshots: `assets/screenshot-home.png` and `screenshot-analytics.png` (from `design/app-store/` in the app repo; retake there, resize to 640 px wide, bump `styles.css?v=`)
- [ ] Legal review of the Privacy Policy, Terms and Safety Disclaimer copy
- [ ] Confirm `support@allalphas.com` and `privacy@allalphas.com` mailboxes exist and are monitored
- [ ] Confirm in-app path for account deletion exists (Settings → Account → Delete account)
- [ ] Don't claim SG Timer support publicly until it ships (V0.2)

## Deploying

1. Push to `main` on GitHub (repo must be **public** for free GitHub Pages).
2. In the repo's Settings → Pages, set source to the `main` branch, root folder.
3. In Cloudflare DNS for `allalphas.com`, add a CNAME record pointing to
   `<github-username>.github.io` (or the A records GitHub's docs specify for
   an apex domain), and turn off the Cloudflare proxy (grey cloud) until
   GitHub's SSL certificate is issued, per GitHub's custom-domain docs.
4. Wait for GitHub to issue the HTTPS certificate, then confirm
   `https://allalphas.com` loads.

## Design notes (2026-10-27, apple-design review)

- Sizes and spacing are in `rem` (and media queries in `em`) so they follow the visitor's text-size setting. Decorative geometry (phone mockups, logos, borders) stays in px.
- The nav is sticky and translucent (`backdrop-filter`), with solid fallbacks for `prefers-reduced-transparency`, `prefers-contrast: more` and browsers without backdrop-filter. The divider appears after scrolling (`.scrolled`, set in `app.js`).
- Press feedback is instant (`:active`); hover styles only apply where hover exists. Controls have 44px hit areas.
- Large Barlow Condensed headings use `-0.01em` tracking. Eyeball them after font changes.
- Reveal animations are short (0.45s) and skip the Safety rules and legal text. Reduced-motion visitors get the static page.
- Bump `styles.css?v=` and `app.js?v=` in all 5 pages when either file changes.
