Pet101 — Wizard101 Pet Helper

Overview
- The unofficial Pet Analytics tool for Wizard101! Data aggregated by yours truly..

Features
  - Insights: Date-seeded “Pet of the Day” + dynamic school ranking chart with weight sliders for Cards, Talents, Derby, Pedigree, Attributes to help you visualize which type of pets are best!
  - Pet Lookup: Typeahead search for all 764 pets I was able to aggregate, and see how they rank against Pets of their own school!
- Pet Detail Layout
  - School badge, pet name, pet image, and spell cards (with icons when available).
  - Talents and Derby, with rarity-level for talents shown
  - Pedigree ranking: Gaussian bump to show you where your pet lies in comparison to the average rating!

Tech Stack
Webpage:
- Next.js 15, React 19, TypeScript
- Vega-Lite via `vega-embed`
- Tailwind v4

Data Scraping:
- Python 3
- Beautiful Soup library


Data Aggregated For Website:
- `data/pets.json` (array):
  - `ID: string`, `name: string`, `icon: string|null`, `school: string`, `abilities: { talents: string[]; derby: string[] }`, `pedigree: number|null`, `cards: string[]`, `attributes: Record<string,string|number>`
- `data/abilities.json` (array):
  - `name: string`, `icon: string|null`, `rarity: "Common|Uncommon|Rare|Ultra-Rare|Epic|null"`
- `data/spells.json` (array):
  - `name: string`, `icon: string|null`


Getting Started:
- Prereqs: Node.js 18+ and npm.
- Install & run:
  - `cd pet101`
  - `npm install`
  - `npm run dev`
- Build & serve:
  - `npm run build`
  - `npm start`




Credits & Sources
- Website content: Wizard101 Central Wiki (https://wiki.wizard101central.com/wiki/Wizard101_Wiki)
- Accessed via archived snapshots from Internet Archive’s Wayback Machine.
- Data collection: custom Python scrapers (included in this repo under pet101/data/web_scraper).

Roadmap / Ideas
- Side-by-side comparison of Pets in a 2-panel style!
- MORE DATA (a lot of pets unfortunately do not have their own archived page)
- Favorites and sharing for specific pets??
