# Feature Pages Planning - Jan 25, 2026

## Summary

Planning session for adding premium "experience" feature pages: Breakfast, Happy Hour, Live Music.

---

## Pricing Structure (Current)

- **Premium listing:** $29/month or $290/year
- **Additional categories:** $10/month each

## Proposed Feature Page Pricing

| Tier | Price | Gets |
|------|-------|------|
| Basic | $10/mo | Name, town, phone, hours |
| Premium | $15/mo | + Logo, website, description, map pin, "Premium" badge |

---

## Data Structure

### Option 1: Add features to existing restaurant entries

```json
{
  "name": "Longley's",
  "category": "American",
  "phone": "203-488-5553",
  "features": {
    "breakfast": {
      "active": true,
      "hours": "7am-11am",
      "description": "Full breakfast menu daily"
    },
    "happyHour": {
      "active": true,
      "hours": "4pm-6pm",
      "days": "Mon-Fri",
      "description": "$5 drafts, half-price apps"
    },
    "liveMusic": {
      "active": true,
      "schedule": "Fri-Sat 8pm",
      "description": "Local acoustic acts"
    }
  }
}
```

### Option 2: Separate features JSON file (cleaner) - RECOMMENDED

```
features/
├── breakfast.json
├── happy-hour.json
└── live-music.json
```

**breakfast.json example:**
```json
{
  "feature": "Breakfast",
  "description": "Start your morning right on the CT shoreline",
  "restaurants": [
    {
      "name": "Longley's",
      "town": "Branford",
      "hours": "7am-11am daily",
      "description": "Full breakfast menu with local favorites",
      "phone": "203-488-5553",
      "website": "https://longleysct.com/",
      "image": "branford-logos/longleysblack.png",
      "lat": 41.2771201,
      "lng": -72.8538095
    }
  ]
}
```

---

## Page Structure

### Single page per feature
- `breakfast.html`
- `happy-hour.html`
- `live-music.html`

### Layout
```
┌─────────────────────────────────────────────────┐
│  🍳 Breakfast on the Shoreline                  │
│  Start your morning right from East Haven       │
│  to Old Saybrook                                │
├─────────────────────────────────────────────────┤
│  [All] [East Haven] [Branford] [Guilford] ...   │  ← Town filter
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐               │
│  │ Longley's   │  │ Parthenon   │               │
│  │ Branford    │  │ Branford    │               │
│  │ 7am-11am    │  │ 6am-2pm     │               │
│  │ ⭐ PREMIUM  │  │             │               │
│  └─────────────┘  └─────────────┘               │
├─────────────────────────────────────────────────┤
│  [Map showing breakfast spots]                  │
├─────────────────────────────────────────────────┤
│  Want your restaurant listed?                   │
│  [Add Breakfast Listing - $15/mo]               │
└─────────────────────────────────────────────────┘
```

---

## File Structure

```
bite/
├── breakfast.html
├── happy-hour.html
├── live-music.html
├── feature-page.js          # Shared JS for all feature pages
├── feature-styles.css       # Shared styles
└── features/
    ├── breakfast.json
    ├── happy-hour.json
    └── live-music.json
```

---

## Navigation Updates

Add to main nav or footer:
```
Experiences: Breakfast | Happy Hour | Live Music
```

---

## Key Decisions to Make

1. **Page approach:** Single feature page with town filter (recommended) vs. separate page per town
2. **Pricing:** $10 basic vs $15 premium per feature, or flat rate?
3. **Launch order:** Start with Breakfast? Or all three at once?

---

## Code Review Fixes Applied (Same Session)

1. Fixed `formatCategory()` in `near-me.js` to handle array categories
2. Added `rel="noopener noreferrer"` to all external links with `target="_blank"`
3. Added missing website URLs to featured restaurants in town JSONs:
   - La Luna Ristorante (Branford)
   - Longley's (Branford)
   - Parthenon Diner Restaurant (Branford)
   - Mexitale (Guilford)
   - Parthenon Diner Restaurant (Old Saybrook)

---

## Next Steps

- [ ] Decide on final pricing for feature listings
- [ ] Build breakfast.html prototype
- [ ] Create feature-page.js shared handler
- [ ] Add navigation links to feature pages
