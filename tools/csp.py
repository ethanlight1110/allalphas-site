#!/usr/bin/env python3
"""Writes the Content-Security-Policy <meta> tag into every page of the site.

The policy only lets the browser run scripts and styles from allalphas.com itself and the few small inline <script>/<style> blocks the pages already have, allowed by their SHA-256
hash. If you change one of those inline blocks (or add one), the browser will refuse to run it
until you re-run this script:

    python3 tools/csp.py          # rewrite the tags
    python3 tools/csp.py --check  # exit 1 if any page's tag is out of date

A <meta> CSP can't set frame-ancestors, report-uri or sandbox; those need real HTTP headers
(see SECURITY-AUDIT.md, Cloudflare section).
"""
import base64
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUPABASE = 'https://angejsoovsozmifusyok.supabase.co'
META_RE = re.compile(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">\n')


def sha(text):
    return "'sha256-" + base64.b64encode(hashlib.sha256(text.encode()).digest()).decode() + "'"


def policy(html, connect_supabase):
    scripts = [sha(s) for s in re.findall(r'<script>(.*?)</script>', html, re.S)]
    styles = [sha(s) for s in re.findall(r'<style>(.*?)</style>', html, re.S)]
    return '; '.join([
        "default-src 'self'",
        ' '.join(["script-src 'self'"] + scripts),
        ' '.join(["style-src 'self'"] + styles),
        "font-src 'self'",
        "img-src 'self'",
        "connect-src 'self'" + (' ' + SUPABASE if connect_supabase else ''),
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        'upgrade-insecure-requests',
    ])


def main():
    check = '--check' in sys.argv
    stale = []
    for page in sorted(ROOT.glob('**/index.html')):
        rel = page.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/', '.claude/')):
            continue
        html = page.read_text()
        body = META_RE.sub('', html)
        tag = '<meta http-equiv="Content-Security-Policy" content="%s">\n' % policy(
            body, connect_supabase=SUPABASE in body or rel == 'd/index.html')
        new = body.replace('<meta charset="UTF-8">\n', '<meta charset="UTF-8">\n' + tag, 1)
        if new == body:
            sys.exit(rel + ': no <meta charset="UTF-8"> line to put the policy after')
        if new != html:
            stale.append(rel)
            if not check:
                page.write_text(new)
    if check and stale:
        sys.exit('CSP out of date in: ' + ', '.join(stale) + ' (run python3 tools/csp.py)')
    print(('stale: ' if check else 'updated: ') + (', '.join(stale) or 'nothing'))


if __name__ == '__main__':
    main()
