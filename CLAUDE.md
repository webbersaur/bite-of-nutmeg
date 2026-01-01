# A Bite of Nutmeg - CT Shoreline Dining Guide

## Project Overview

A static website showcasing restaurants along Connecticut's shoreline from East Haven to Old Saybrook. The site features an interactive map, search functionality, featured restaurant cards with logos, and individual town pages.

**Live Site:** https://bite-ivory.vercel.app

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

## Development

### Local Server

```bash
python3 -m http.server 8000
```

Then visit: http://localhost:8000

### Deployment

```bash
vercel --prod --yes
```

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

### Update town page content
Edit the `<section class="about-dining">` in the town's HTML file
