# allalphas.com

The public marketing site for **All Alphas** (VanLi Labs LLC). Plain HTML/CSS/JS,
no build step, no framework, no tracking. Hosted free on GitHub Pages at
`allalphas.com`.

Built from the design handoff (`design_handoff_allalphas_website/`, option 3a):
dark theme matching the app (`src/theme/tokens.ts` in
`ethanlight1110/all-alphas`). Multi-page: a home page plus a page each for
Support, Safety, Privacy, Terms, Community and Faith (top nav: Home, Faith, Safety, Support; the rest are in the footer). There is no build step,
so the nav and footer are repeated in each page's HTML; change them in all 7.

## App Store Connect values

- Privacy Policy URL: `https://allalphas.com/privacy/`
- Support URL: `https://allalphas.com/support/`
- Old one-page links (`/#privacy`, `/#support`, etc.) still work: the home page redirects them to the matching page.

## Structure

```
index.html      home: hero, beta sign-up, feature strip
support/        Support page
safety/         Safety Disclaimer page
privacy/        Privacy Policy page
terms/          Terms of Service page
community/      Community Guidelines page
faith/          Statement of Faith page
styles.css
app.js          mobile nav, beta form, scroll motion (reveals, hero phones swiping off right, progress bar; off for reduced-motion visitors); no analytics, no trackers
assets/         logo.svg, app icon, favicon, screenshots
CNAME           tells GitHub Pages this repo serves allalphas.com
```

## Open items before this goes live (see project roadmap)

- [x] Beta sign-up form (hero), live 2026-10-15: `0028_beta_signups.sql` and `0029_beta_signup_names.sql` run in Supabase; the list is in Table Editor → `beta_signups`
- [x] Privacy Policy: cover the beta sign-up list (first name, optional last name, email) (2026-10-15)
- [ ] After the beta, before App Store go-live: delete the `beta_signups` data (see all-alphas `docs/LAUNCH.md`)
- [x] TestFlight public link live 2026-10-23: the hero "Download now" button and the nav pill link to https://testflight.apple.com/join/QeFHPPyd (the beta sign-up form was removed from the page; `join_beta()` and `beta_signups` still exist in Supabase)
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
