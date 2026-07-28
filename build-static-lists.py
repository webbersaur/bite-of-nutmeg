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
    ("restaurants-in-branford.html", "branford-restaurants.json", "Branford"),
    ("restaurants-in-guilford.html", "guilford-restaurants.json", "Guilford"),
    ("restaurants-in-east-haven.html", "easthaven-restaurants.json", "East Haven"),
    ("restaurants-in-madison.html", "madison-restaurants.json", "Madison"),
    ("restaurants-in-clinton.html", "clinton-restaurants.json", "Clinton"),
    ("restaurants-in-westbrook.html", "westbrook-restaurants.json", "Westbrook"),
    ("restaurants-in-old-saybrook.html", "old-saybrook-restaurants.json", "Old Saybrook"),
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
    status = restaurant.get("status", "open")
    is_operating = status == "open"
    item_class = "restaurant-item"
    badge_html = ""
    website_html = ""

    if not is_operating:
        # Mirrors STATUS_BADGES in the town page scripts
        label = "Coming Soon" if status == "coming-soon" else "Closed"
        badge_html = f'<span class="list-badge {status}">{label}</span>'
        item_class += f" status-{status}"
    elif is_enhanced:
        badge_html = '<span class="list-badge enhanced">Premium</span>'
        item_class += " enhanced-highlight"
        website = restaurant.get("website", "")
        if website:
            website_html = f'<a href="{html.escape(website)}" target="_blank" rel="noopener noreferrer" class="website-link">Visit Website →</a>'

    # No live tel: link for a restaurant that can't answer the phone
    if is_operating and phone:
        phone_html = f"""<a href="tel:{phone_digits}" class="phone">
                    {PHONE_SVG}
                    {html.escape(phone)}
                </a>"""
    else:
        phone_html = ""

    description = restaurant.get("description", "")
    note_html = ""
    if not is_operating and description:
        note_html = f'\n            <p class="restaurant-description">{html.escape(description)}</p>'

    return f"""        <div class="{item_class}">
            <div class="item-header">
                <h3>{name}</h3>
                {badge_html}
            </div>
            <span class="category">{cat_display}</span>{note_html}
            <div class="item-actions">
                {phone_html}
                {website_html}
            </div>
        </div>"""


def build_static_list(restaurants, featured_names):
    """Build the full static restaurant list HTML."""
    # Sort: operating first, then enhanced, then alphabetical
    # (matching JS "All" category behavior)
    sorted_restaurants = sorted(
        restaurants,
        key=lambda r: (
            0 if r.get("status", "open") == "open" else 1,
            0 if r.get("enhanced") else 1,
            r["name"],
        )
    )

    items = "\n".join(build_restaurant_html(r) for r in sorted_restaurants)
    return items


# The ItemList node inside the page's single ld+json block. Anchored on
# "@type": "ItemList" so the BreadcrumbList — which also has positions and its
# own itemListElement — is never touched. Group 4 is the entry block, which
# terminates at the first line that is nothing but whitespace and "]".
ITEMLIST_RE = re.compile(
    r'("@type":\s*"ItemList".*?"numberOfItems":\s*)\d+'
    r'(.*?"itemListElement":\s*\[\n).*?(\n([ \t]*)\])',
    re.DOTALL,
)


def build_postal_address(restaurant, town):
    """PostalAddress node. Most entries only know their town."""
    address = {"@type": "PostalAddress"}

    # A few entries carry a full street address, e.g. "688 Foxon Rd, East Haven, CT 06513"
    raw = restaurant.get("address", "")
    if raw:
        parts = [p.strip() for p in raw.split(",")]
        if len(parts) >= 2:
            address["streetAddress"] = parts[0]
        postal = re.search(r"\b(\d{5})\b", raw)
        address["addressLocality"] = town
        address["addressRegion"] = "CT"
        if postal:
            address["postalCode"] = postal.group(1)
        return address

    address["addressLocality"] = town
    address["addressRegion"] = "CT"
    return address


def build_listitem(restaurant, position, town):
    """One ListItem line, matching the compact one-per-line style already in the pages."""
    cat = restaurant.get("category", "")
    if isinstance(cat, list):
        cat = " & ".join(cat)

    item = {"@type": "Restaurant", "name": restaurant["name"]}
    if cat:
        item["servesCuisine"] = cat
    if restaurant.get("phone"):
        item["telephone"] = restaurant["phone"]
    # url tracks the data's website field — no separate tier rule to drift out of sync
    if restaurant.get("website"):
        item["url"] = restaurant["website"]
    item["address"] = build_postal_address(restaurant, town)

    entry = {"@type": "ListItem", "position": position, "item": item}
    return json.dumps(entry, ensure_ascii=False)


def inject_jsonld(page_html, restaurants, town, html_file):
    """Regenerate the ItemList from the same data that drives the visible list.

    Closed / coming-soon entries are omitted: structured data should not assert a
    restaurant is operating when the site says it isn't.
    """
    operating = sorted(
        (r for r in restaurants if r.get("status", "open") == "open"),
        key=lambda r: r["name"],
    )

    match = ITEMLIST_RE.search(page_html)
    if not match:
        print(f"  WARNING: Could not find JSON-LD ItemList in {html_file}")
        return page_html, False

    entry_indent = match.group(4) + "  "
    entries = "\n".join(
        entry_indent + build_listitem(r, i, town) + ("," if i < len(operating) else "")
        for i, r in enumerate(operating, start=1)
    )

    def replace(m):
        return f"{m.group(1)}{len(operating)}{m.group(2)}{entries}{m.group(3)}"

    return ITEMLIST_RE.sub(replace, page_html, count=1), True


def inject_into_page(html_file, json_file, town):
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
    # The trailing \s* sits OUTSIDE the capture group so re-running the script
    # replaces the existing whitespace instead of stacking a blank line onto it
    pattern = r'(<div class="restaurant-list" id="restaurantList">)\s*(?:<!-- Restaurant list loaded via JS -->|<!-- Static restaurant list for SEO.*?-->.*?)\s*(</div>\s*</section>)'
    replacement = rf'\1\n        <!-- Static restaurant list for SEO (replaced by JS on load) -->\n{static_html}\n    \2'

    new_html, count = re.subn(pattern, replacement, page_html, flags=re.DOTALL)

    if count == 0:
        print(f"  WARNING: Could not find restaurantList div in {html_file}")
        return False

    new_html, ld_ok = inject_jsonld(new_html, restaurants, town, html_file)

    with open(html_file, "w") as f:
        f.write(new_html)

    closed = sum(1 for r in restaurants if r.get("status", "open") != "open")
    note = f" ({closed} closed, omitted from JSON-LD)" if closed else ""
    ld_note = "" if ld_ok else " [JSON-LD SKIPPED]"
    print(f"  {html_file}: injected {len(restaurants)} restaurants{note}{ld_note}")
    return True


def main():
    print("Building static restaurant lists for SEO...")
    success = 0
    for html_file, json_file, town in PAGES:
        if inject_into_page(html_file, json_file, town):
            success += 1

    print(f"\nDone: {success}/{len(PAGES)} pages updated")


if __name__ == "__main__":
    main()
