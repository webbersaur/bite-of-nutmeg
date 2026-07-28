#!/usr/bin/env python3
"""
Generates sitemap.xml with lastmod derived from git history.

Hand-maintaining lastmod meant it went stale — pages kept shipping while the
sitemap still claimed 2026-03-17, which weakens crawl scheduling. Here each
entry's date comes from the last commit that touched its file.

PAGES is an explicit allowlist, not a directory scan: admin-*, thank-you,
buy-this-app and other utility pages must never be published to search engines
just because they exist.
"""

import subprocess
import os
from datetime import date

BASE = "https://www.abiteofnutmeg.com"

# slug (no .html) -> priority.  "" is the homepage.
PAGES = [
    ("", 1.0),
    ("restaurants-in-east-haven", 0.8),
    ("restaurants-in-branford", 0.8),
    ("restaurants-in-guilford", 0.8),
    ("restaurants-in-madison", 0.8),
    ("restaurants-in-clinton", 0.8),
    ("restaurants-in-westbrook", 0.8),
    ("restaurants-in-old-saybrook", 0.8),
    ("best-of", 0.8),
    ("best-lobster-rolls-ct-shoreline", 0.8),
    ("best-brunch-spots-ct-shoreline", 0.8),
    ("east-haven-restaurant-guide", 0.7),
    ("spin-the-wheel", 0.7),
    ("upgrade", 0.7),
    ("case-study", 0.7),
    ("why", 0.6),
    ("partners", 0.6),
    ("find-phone-number", 0.6),
    ("memory-jogger", 0.6),
]


def last_modified(filename):
    """Commit date of the file's most recent change; falls back to mtime."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", filename],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        if out:
            return out
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    if os.path.exists(filename):
        return date.fromtimestamp(os.path.getmtime(filename)).isoformat()
    return date.today().isoformat()


def main():
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    missing = []
    for slug, priority in PAGES:
        filename = "index.html" if slug == "" else f"{slug}.html"
        if not os.path.exists(filename):
            missing.append(filename)
            continue
        loc = f"{BASE}/" if slug == "" else f"{BASE}/{slug}"
        lines += [
            "  <url>",
            f"    <loc>{loc}</loc>",
            f"    <lastmod>{last_modified(filename)}</lastmod>",
            f"    <priority>{priority}</priority>",
            "  </url>",
        ]
    lines.append("</urlset>")

    with open("sitemap.xml", "w") as f:
        f.write("\n".join(lines) + "\n")

    print(f"sitemap.xml: {len(PAGES) - len(missing)} urls")
    if missing:
        print(f"  WARNING: listed but not found: {missing}")

    # Anything indexable that PAGES forgot? Utility pages are expected here.
    import glob
    known = {"index.html" if s == "" else f"{s}.html" for s, _ in PAGES}
    ignore = {"404.html", "thank-you.html", "buy-this-app.html",
              "admin-categories.html", "admin-wheel.html", "backlink-snippets.html"}
    extra = sorted(set(glob.glob("*.html")) - known - ignore)
    if extra:
        print(f"  NOTE: not in sitemap (add above if they should be indexed): {extra}")


if __name__ == "__main__":
    main()
