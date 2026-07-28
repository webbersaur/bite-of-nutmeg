# A Bite of Nutmeg - CT Shoreline Dining Guide

## Project Overview

A static website showcasing restaurants along Connecticut's shoreline from East Haven to Old Saybrook. The site features an interactive map, search functionality, featured restaurant cards with logos, and individual town pages.

**Live Site:** https://www.abiteofnutmeg.com

The old `bite-ivory.vercel.app` host 308-redirects here via the first rule in
`vercel.json` — leave that rule in place. Town pages also have short aliases
(`/branford`, `/guilford`, `/madison`, `/clinton`, `/westbrook`, `/old-saybrook`,
`/east-haven`) that redirect to their `restaurants-in-*` URLs.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Maps:** Leaflet.js with OpenStreetMap tiles
- **Fonts:** Google Fonts (Playfair Display, Montserrat)
- **Deployment:** Vercel with clean URLs (no .html extensions)

## Project Structure

```
bite/
├── index.html              # Homepage with hero, map, featured restaurants
├── app.js                  # Homepage JavaScript (search, map, featured cards)
├── styles.css              # Homepage styles
├── branford-styles.css     # Shared styles for all town pages
├── town-page-styled.js     # Generic JS for town pages (reads data-* attributes)
├── featured-restaurants.json   # Featured restaurants for homepage
├── vercel.json             # Vercel config (cleanUrls: true)
│
├── [town].html             # Town-specific pages
├── [town]-page.js          # Town-specific JS (some towns)
├── [town]-restaurants.json # Restaurant data per town
└── [town]-logos/           # Logo images per town
```

## Town Pages

| Town | HTML | JS Handler | Data File |
|------|------|------------|-----------|
| East Haven | east-haven.html | easthaven-page.js | easthaven-restaurants.json |
| Branford | branford.html | branford-page.js | branford-restaurants.json |
| Guilford | guilford.html | guilford-page.js | guilford-restaurants.json |
| Madison | madison.html | town-page-styled.js | madison-restaurants.json |
| Clinton | clinton.html | town-page-styled.js | clinton-restaurants.json |
| Westbrook | westbrook.html | town-page-styled.js | westbrook-restaurants.json |
| Old Saybrook | old-saybrook.html | town-page-styled.js | old-saybrook-restaurants.json |

## Key Patterns

### Adding a New Town

1. Create `[town]-restaurants.json` with this structure:
```json
{
  "featured": [...],
  "restaurants": [
    {"name": "...", "category": "...", "phone": "..."}
  ],
  "categories": ["All", "American", "Italian", ...]
}
```

2. Create `[town].html` using the town page template (copy from madison.html)
3. Update the script tag to point to the correct JSON:
```html
<script src="town-page-styled.js" data-town="Town Name" data-json="town-restaurants.json"></script>
```

4. Add the town to `townFiles` array in `app.js` for site-wide search:
```javascript
const townFiles = [
    { file: 'town-restaurants.json', town: 'Town Name' },
    ...
];
```

5. Add town badges to all existing town HTML files

### Featured Restaurants (Homepage)

Edit `featured-restaurants.json`. Each entry needs:
- `name`, `category`, `town`, `address`, `phone`
- `website` (optional)
- `image` (logo path)
- `pageLink` (town page link)
- `lat`, `lng` (for map markers)
- `darkBg: true` (if logo needs dark background)

### Restaurant Data Schema

```json
{
  "name": "Restaurant Name",
  "category": "Italian",
  "phone": "203-xxx-xxxx",
  "address": "123 Main St, Town",
  "website": "https://...",
  "image": "town-logos/logo.png",
  "darkBg": true
}
```

### Category vocabulary is site-wide — reuse an existing label

Categories are shared across all seven towns: homepage search matches on category
text, so two spellings of one concept silently split the results. `Café & Bakery`
vs `Cafe & Bakery` once hid 9 restaurants from a search for "cafe" — nobody types
the accent.

Before inventing a category, check the existing list. Use plain ASCII (`Cafe`, not
`Café`). A restaurant serving two cuisines takes an **array**, not a combined
string: `"category": ["Italian", "Mexican"]` — a combined string like
`"Italian & Mexican"` matches no tab and makes the restaurant reachable only under
"All".

Each town's `categories` array drives its filter tabs and must equal exactly the
set its restaurants use — no missing entries (unreachable restaurants), no extras
(dead tabs). Adding a genuinely new cuisine also means adding it to a segment's
`matches` in `spin-wheel-config.json` **and** the `DEFAULT_CATEGORIES` fallback in
`spin-wheel.js`; a category in neither is unreachable from Spin the Wheel.
`Fast Food` is deliberately excluded from the wheel.

## Development

### Local Server

```bash
python3 -m http.server 8000
```

Then visit: http://localhost:8000

### Deployment

Regenerate before deploying, whenever restaurant data or pages changed:

```bash
python3 build-static-lists.py   # static lists + JSON-LD ItemList, all 7 town pages
python3 build-sitemap.py        # sitemap.xml with git-derived lastmod
vercel --prod --yes
```

Both scripts are idempotent — running them with nothing changed produces no diff.

## Styling Notes

- **Color scheme:** Navy (#1e3a6e) and Gold (#f0b323)
- **Card logos:** Fixed 140px height containers with `object-fit: contain`
- **Map popups:** Larger fonts (1.1rem/1rem) for readability
- **Town nav badges:** Horizontal scrolling row at top of town pages
- **Hero:** Logo left, text right layout with wave divider

## Important Files

- **app.js:17-25** - Town files array for site-wide search
- **app.js:134-181** - Restaurant card rendering with logos
- **branford-styles.css** - Town navigation badge styles
- **town-page-styled.js** - Generic handler using data attributes

## Common Tasks

### Add restaurant logo to card
1. Add `image` path in the restaurant JSON
2. Optionally add `darkBg: true` if logo needs dark background

### Change featured restaurants
Edit `featured-restaurants.json` - homepage automatically loads these

### Demote a former client (they stopped paying)

**Demote, don't delete.** A former client is still a real restaurant and belongs in
the guide as an ordinary listing — the same as any other place in that town. Removing
the row deletes a restaurant from the directory, which is a different decision.

1. Remove from `featured[]` in `[town]-restaurants.json`
2. Remove from `featured-restaurants.json` and from the featured markup in `index.html`
3. On the `restaurants[]` entry, drop `enhanced`, `website`, and `image` — **keep the entry**
4. Run `python3 build-static-lists.py` and commit

Dropping `website` matters functionally, not just cosmetically: `app.js` gates card
clickability and the "Visit Website" footer on the presence of `website`, **not** on
tier. Leaving it grants a paid-tier perk to a non-client.

Delete a row only when the place never existed (duplicate, bad import). If it closed,
use `"status": "closed"` instead — see below.

### Mark a restaurant closed

Set `"status": "closed"` on its `restaurants[]` entry (absent or `"open"` = operating;
`"coming-soon"` is also supported). The listing stays searchable with a muted badge and
sorts last, so a search for it returns a real answer — but it is excluded from Spin the
Wheel, Near Me, map markers, and the JSON-LD, and its phone/website links are
suppressed. Never route someone to a door that won't open.

### Sitemap is generated — don't hand-edit it

`python3 build-sitemap.py` writes `sitemap.xml`, taking each `<lastmod>` from the
last commit that touched that page. Hand-maintained dates went stale (pages kept
shipping while the sitemap claimed March), which weakens crawl scheduling. Run it
after `build-static-lists.py` and before deploying.

`PAGES` in that script is an explicit allowlist, not a directory scan — utility and
admin pages must not be published to search engines just because the file exists.
Adding a new public page means adding it there; the script prints a NOTE listing
any `.html` it doesn't recognize so nothing is silently omitted.

### Structured data (JSON-LD) is generated — don't hand-edit it

`build-static-lists.py` owns **both** the static restaurant list and the JSON-LD
`ItemList` on every town page, from the same `[town]-restaurants.json`. Editing the
`ItemList` by hand will be overwritten, and hand-maintaining it is what let all seven
pages drift out of sync with their data. The script leaves `WebPage`, `BreadcrumbList`,
and `FAQPage` untouched. It is idempotent — a second run produces no diff.

### Update town page content
Edit the `<section class="about-dining">` in the town's HTML file

### Cross-reference restaurants from official source

When updating restaurant lists from an official source (e.g., RTF file export):

1. Add the source file to the project root (e.g., `newbranford.rtf`)
2. Compare with existing `[town]-restaurants.json` to identify:
   - **New restaurants** to add (in source but not in JSON)
   - **Restaurants to remove** (in JSON but not in source)
3. For new restaurants, search for phone numbers before adding
4. Add new entries in alphabetical order within the `restaurants` array
5. Update the `categories` array if new cuisine types are needed
6. Commit and push changes regularly throughout the process
7. Deploy with `vercel --prod --yes`
8. Delete the source file after processing
