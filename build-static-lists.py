#!/usr/bin/env python3
"""
Injects static HTML restaurant lists into town pages for SEO.

The JS will overwrite these with interactive versions on load,
but crawlers will see the full restaurant data in the HTML source.
"""

import json
import re
import html

PAGES = [
    ("restaurants-in-branford.html", "branford-restaurants.json"),
    ("restaurants-in-guilford.html", "guilford-restaurants.json"),
    ("restaurants-in-east-haven.html", "easthaven-restaurants.json"),
    ("restaurants-in-madison.html", "madison-restaurants.json"),
    ("restaurants-in-clinton.html", "clinton-restaurants.json"),
    ("restaurants-in-westbrook.html", "westbrook-restaurants.json"),
    ("restaurants-in-old-saybrook.html", "old-saybrook-restaurants.json"),
]

PHONE_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#2EA3F2" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>'


def build_restaurant_html(restaurant):
    """Build HTML for a single restaurant item, matching the JS output."""
    name = html.escape(restaurant["name"])
    cat = restaurant.get("category", "")
    if isinstance(cat, list):
        cat_display = " &amp; ".join(html.escape(c) for c in cat)
    else:
        cat_display = html.escape(cat)

    phone = restaurant.get("phone", "")
    phone_digits = re.sub(r"[^0-9]", "", phone)

    is_enhanced = restaurant.get("enhanced", False)
    item_class = "restaurant-item"
    badge_html = ""
    website_html = ""

    if is_enhanced:
        badge_html = '<span class="list-badge enhanced">Premium</span>'
        item_class += " enhanced-highlight"
        website = restaurant.get("website", "")
        if website:
            website_html = f'<a href="{html.escape(website)}" target="_blank" rel="noopener noreferrer" class="website-link">Visit Website →</a>'

    return f"""        <div class="{item_class}">
            <div class="item-header">
                <h3>{name}</h3>
                {badge_html}
            </div>
            <span class="category">{cat_display}</span>
            <div class="item-actions">
                <a href="tel:{phone_digits}" class="phone">
                    {PHONE_SVG}
                    {html.escape(phone)}
                </a>
                {website_html}
            </div>
        </div>"""


def build_static_list(restaurants, featured_names):
    """Build the full static restaurant list HTML."""
    # Sort: enhanced first, then alphabetical (matching JS "All" category behavior)
    sorted_restaurants = sorted(
        restaurants,
        key=lambda r: (0 if r.get("enhanced") else 1, r["name"])
    )

    items = "\n".join(build_restaurant_html(r) for r in sorted_restaurants)
    return items


def inject_into_page(html_file, json_file):
    """Read JSON, build static HTML, inject into the page."""
    with open(json_file, "r") as f:
        data = json.load(f)

    restaurants = data.get("restaurants", [])
    featured = data.get("featured", [])
    featured_names = {f["name"] for f in featured}

    static_html = build_static_list(restaurants, featured_names)

    with open(html_file, "r") as f:
        page_html = f.read()

    # Replace the restaurantList div content
    # Match: <div class="restaurant-list" id="restaurantList">...content...</div>
    # followed by </section>
    pattern = r'(<div class="restaurant-list" id="restaurantList">)\s*(?:<!-- Restaurant list loaded via JS -->|<!-- Static restaurant list for SEO.*?-->.*?)(\s*</div>\s*</section>)'
    replacement = rf'\1\n        <!-- Static restaurant list for SEO (replaced by JS on load) -->\n{static_html}\n    \2'

    new_html, count = re.subn(pattern, replacement, page_html, flags=re.DOTALL)

    if count == 0:
        print(f"  WARNING: Could not find restaurantList div in {html_file}")
        return False

    with open(html_file, "w") as f:
        f.write(new_html)

    print(f"  {html_file}: injected {len(restaurants)} restaurants")
    return True


def main():
    print("Building static restaurant lists for SEO...")
    success = 0
    for html_file, json_file in PAGES:
        if inject_into_page(html_file, json_file):
            success += 1

    print(f"\nDone: {success}/{len(PAGES)} pages updated")


if __name__ == "__main__":
    main()
