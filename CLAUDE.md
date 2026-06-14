# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

HerbalPlantsMar — a **Dutch-language** static website about wild & herbal (foraging) plants: where to find them, what's edible, how to harvest, toxic lookalikes, and seasonal recipes. Hosted on GitHub Pages. **No build step, no framework, no dependencies, no package manager.** All UI text and content are in Dutch.

## Running locally

There is no build/test/lint tooling. The pages use `fetch()` to load JSON, which is **blocked over `file://`** — you must serve over HTTP:

```bash
python -m http.server 8000   # run from the repo root, then open http://localhost:8000
```

To verify changes, open a page and check the browser console (the app logs load errors). There is no automated test suite; verification is manual / via a headless browser.

## Architecture

**Data-driven, single-engine.** Three layers:

1. **`app.js`** — the entire client. One IIFE that, on load, reads `document.body.dataset.page` and renders that page into `#app`. It also injects the shared nav (`#site-header`) and footer (`#site-footer`) into every page, so those are NOT in the HTML. Page renderers: `renderIndex` (gallery + search + left filter sidebar), `renderPlant` (`plant.html?plant=<id>`), `renderRecepten`, `renderSeizoen`, `renderAdmin`. Static pages (`over`, `signup`, `diner`) get only nav+footer.
2. **HTML files** — thin shells. Each sets `<body data-page="...">`, includes empty `#site-header`/`#app`/`#site-footer` and `<script src="app.js">`. Adding a page = new shell + a `data-page` branch in `boot()`/renderers + a nav entry in `buildHeader()`.
3. **`data/plants.json` + `data/recipes.json`** — the only content source. Edit these (or use `admin.html`) to change the site; never hardcode content in JS/HTML.

Key cross-cutting behaviors in `app.js`:
- **Missing images self-heal**: `img()` swaps any broken/empty `src` for an inline SVG placeholder (`placeholder()`). Missing photo files are expected, not bugs.
- **"Dit seizoen"** (`renderSeizoen`) and the season filter compute the current month via `new Date()` and match against each plant's `seizoenskalender[].maanden` (month numbers 1–12).
- **Recipe ↔ plant linking**: `recipes[].planten` holds plant `id`s; these become links, and `renderPlant` shows "Recepten met <plant>" by reverse-lookup.
- **Search** (`renderIndex`) matches `naam`/`latijn`/`familie`; matched text is wrapped in `<mark>`, and a family-only match shows a "↳ Familie: …" reason line so the match is explained.

## Data model (`data/plants.json` — array of objects)

Important / non-obvious fields:
- `id` — slug, used in URLs and recipe links; must be unique and stable.
- `seizoenskalender` — array of `{ deel, maanden: [1..12], toepassing }`; drives the season filter and "Dit seizoen".
- `locaties` and `eetbareDelen` — these power the filter sidebar, so keep them to a **small controlled vocabulary** (coarse tags). Put nuanced habitat detail in the prose `ecosysteem` field, not in `locaties`. After bulk content changes, re-check the distinct tag set doesn't fragment the filters.
- `giftigeVerwisseling` — a **structured array** of `{ naam, latijn, giftig: bool, onderscheid }` (rendered as a per-lookalike card list, red when `giftig`). `verwisselingIntro` is an optional leading note. `app.js` still falls back to rendering a plain string if an entry is old-format.
- `status` — `"draft"` shows a safety disclaimer banner + "concept" badge; `"verified"` means the human owner has reviewed it. `verificatie` holds the automated check result.
- `bronnen` — source URLs shown on the detail page.

`data/recipes.json` — array of `{ id, titel, seizoenen, planten, andereIngredienten, bereiding, bron, status }`.

`admin.html` (rendered by `renderAdmin`) is a form that **generates a JSON object to copy/paste** into `data/plants.json` — there is no backend/database. Its field parsing must stay in sync with the data model (e.g. `giftigeVerwisseling` lines are `naam | latijn | ja/nee | onderscheid`; `seizoenskalender` lines are `deel | maanden | toepassing`).

## Content is safety-critical

This site tells real people which wild plants to eat, and toxic lookalikes exist. When generating or editing plant content: keep new/uncertain content `status: "draft"`, cite real `bronnen`, and never overstate edibility or downplay `giftigeVerwisseling`/`waarschuwing`. The owner verifies content before flipping `status` to `"verified"`; do not mark content verified yourself. Preserve the owner's own recipe/voice text in `recept` and `data/recipes.json` verbatim.

## Repo automation (`.claude/`)

See `.claude/SETUP.md`. A PostToolUse hook (`.claude/hooks/validate_data.py`) validates `data/*.json` (JSON validity, unique ids, required fields, recipe→plant links) after every edit — heed its stderr feedback. Subagents: `foraging-fact-checker` (run before marking content `verified`), `content-integrity-reviewer`. User skills: `/nieuwe-plant`, `/verify-en-publiceer`. `.mcp.json` provides Playwright (verification) and GitHub (needs `GITHUB_PAT`).

## Deployment

GitHub Pages from the repo root; `.nojekyll` is present. Updating content = committing changed `data/*.json`. No CI.
