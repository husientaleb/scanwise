# Ingrado 🥦

**Scan it. Understand it. Choose better.**

Ingrado is a mobile-first web app that helps consumers understand packaged food.
Photograph (or paste) a product's ingredient list and nutrition label, and get a
clear, balanced, evidence-based report: plain-language ingredient explanations,
nutrition context, allergen alerts, a transparent 1–10 score, and practical
guidance for choosing a healthier alternative.

Ingrado deliberately avoids fear-based language. Unfamiliar or synthetic
ingredients are explained, not demonized.

## Architecture

**No-build stack** (a deliberate deviation from the Next.js suggestion): this
machine has no local Node toolchain, so the app is plain ES modules + CSS served
statically, with Vercel serverless functions for the server-side AI path — the
same pattern as this account's other Vercel projects. Everything runs and is
testable in a browser with zero install; it deploys to Vercel as-is. The code is
organized so a later port to Next.js/React (or Capacitor for mobile) is a
mechanical translation: views are isolated render functions, logic modules are
framework-free, and the Supabase schema is ready.

```
index.html            App shell + bottom navigation
styles.css            Design system (mobile-first, green/blue, rounded cards)
manifest.webmanifest  PWA manifest (installable on phones)
sw.js                 Service worker: offline app shell, network-first updates
icon.svg              App icon
js/
  main.js             Hash router + session state
  schema.js           Canonical analysis JSON schema + validator (zod-style)
  ingredients-db.js   Balanced ingredient knowledge base + allergen keywords
  analyzer.js         Local pipeline: parse label text → schema-valid analysis
  scoring.js          Transparent scoring utility (isolated, swappable)
  store.js            localStorage persistence (mirrors the Supabase schema)
  ocr.js              Tesseract.js OCR (on-device) + label sectionizer
  ai.js               /api/analyze client with automatic local fallback
  demo-data.js        Three fictional demo products
  ui.js               Shared components (badges, score ring, ingredient cards)
  views/              One module per page
api/
  analyze.js          Vercel function: vision AI analysis (Anthropic, key server-side)
supabase/schema.sql   Users / scans / comparisons tables + RLS (future auth sync)
tests/tests.html      In-browser unit tests (scoring, schema, parsing, e2e)
```

## Running locally

Any static file server works (ES modules need HTTP, not `file://`):

```bash
python -m http.server 8080        # or: npx serve, or the PowerShell listener below
```

On Windows without Node/Python:

```powershell
powershell -File serve.ps1        # serves on http://localhost:8123
```

Then open `http://localhost:8080/` (app) and `http://localhost:8080/tests/tests.html` (tests).

## Deploying (Vercel)

1. Push this repo to GitHub and import it into Vercel — no build step needed.
2. Optional: set `ANTHROPIC_API_KEY` in Vercel env vars to enable `/api/analyze`
   (richer AI reading of label photos). Without it the app uses its built-in
   rule-based analyzer and on-device OCR — fully functional.
3. Optional, later: Supabase (run `supabase/schema.sql`, set the `SUPABASE_*`
   vars) for accounts + synced history; Stripe for Ingrado Plus billing.

See `.env.example`. **All keys are server-side only** — nothing secret ships to
the client.

## The research pipeline

Ingrado is a staged evidence-retrieval and analysis pipeline, not a single AI
call. Every report distinguishes: what the package says, what a verified
database says, what the app calculated, what the AI explained, and what is
unknown.

1. **Capture** — camera/upload with preview, rotate, drag-to-crop (or manual
   entry). Missing regions are stated explicitly ("Nutrition Facts panel not
   captured"), never papered over.
2. **Barcode** (`barcode.js`) — UPC-A/EAN-8/EAN-13/GTIN-14 normalization and
   GS1 check-digit validation, UPC-E expansion, platform `BarcodeDetector`
   auto-detection from the photo, manual entry always available.
3. **Verified product lookup** (`product-db.js`) — local cache (7-day TTL) →
   Open Food Facts → (USDA FDC / licensed DBs as future config). Web-search
   snippets are never product data. Per-100g values are converted to
   per-serving only when the record discloses a serving size — flagged as a
   calculation.
4. **Product matching** (`matching.js` + `match-config.js`) — the database hit
   is verified against label data across weighted signals (barcode 0.40,
   name/brand 0.20, ingredients 0.15, size 0.10, nutrition 0.10, image 0.05 —
   all configurable). Barcode-only hits are never auto-confirmed.
5. **OCR** — Tesseract.js on-device, sectioned, user-reviewed before analysis.
6. **Reconciliation** (`reconcile.js`) — field-level label-vs-database records:
   the package label always wins, the database fills only invisible fields,
   conflicts are surfaced ("the database record may be outdated"), and missing
   stays null — never zero.
7. **Ingredient parsing** (`ingredient-parser.js`) — hierarchical: compound
   ingredients yield sub-ingredient records with parent links, order, and
   depth; "contains 2% or less" is tracked; "Contains/May contain/facility"
   advisories are separated from ingredients.
8. **Normalization** (`normalize.js`) — E-numbers (E322 → lecithins) and
   synonyms (ascorbic acid → vitamin C, HFCS merge) WITHOUT erasing
   distinctions (nitrite ≠ nitrate; B12 forms stay identifiable). Uncertain
   normalizations are marked unconfirmed.
9. **Knowledge base** (`ingredients-db.js`) — curated entries with category,
   function, evidence summary, **evidence grade (A–E / Unknown)**, regulatory
   status by jurisdiction, and source citations (FDA/EFSA/WHO/USDA links).
   Hazard is separated from real-world risk; ingredient quantities are never
   estimated from the list alone.
10. **Deterministic calculation** (`nutrition-calc.js` + `dv-constants.js`) —
    %DV against configurable jurisdiction constants (value, unit, effective
    date, source), per-container math only when servings are known, with an
    audit trail of every calculation.
11. **Transparent scoring** (`scoring.js`) — start at 7, visible adjustments,
    clamp 1–10. Points are never subtracted for chemical-sounding names,
    synthetic origin, or unfamiliarity alone.
12. **Multi-dimension assessment** (`assessment.js`) — nutrition profile,
    ingredient transparency, degree of processing (descriptive), allergen
    suitability (never folded into a score), preference match, data
    completeness, match confidence.
13. **AI as explanation layer only** (`ai.js` + `api/analyze.js`) — the model
    receives reconciled data + retrieved records, must return schema-valid
    JSON, gets ONE retry with validation errors, then the deterministic
    report ships without an AI summary. The AI never chooses the score.

The AI endpoint (`api/analyze.js`) must return JSON matching `js/schema.js`;
invalid AI JSON is rejected, not displayed.

## Scoring thresholds

Based on FDA nutrient-content conventions (%DV): added sugar 6/12 g,
sodium 230/460 mg, saturated fat 2/4 g per serving mark moderate/high; fiber
3/5 g and protein 5/10 g mark good/excellent. All tunable in `js/scoring.js`.
The score is a general nutrition signal and never implies allergy safety.

## Privacy

- Scans, preferences, and photos stay on-device (localStorage) for guests.
- Per-scan "delete stored image only" and a full "delete all my data" control.
- Images are never used for model training (no opt-in exists yet, so: never).
- Privacy-policy and terms placeholders are included and marked as placeholders.

## PWA & freemium

The app is installable (Add to Home Screen) and opens offline via a
network-first service worker — bump `CACHE_VERSION` in `sw.js` on breaking
changes. The free plan tracks 20 scans/month (`store.js`); it's a soft limit
with a pricing nudge while billing is inert. Reports can be shared/exported as
plain text via the Web Share API (clipboard fallback).

## Tests

Open `tests/tests.html` — 30+ assertions covering the scoring rubric, schema
validation (including rejection of fabricated values and >5 findings), label
parsing, allergen detection, and end-to-end analysis of the demo products
(including a "no fear-based language" check).

## Disclaimer

Ingrado provides general educational information and is not medical advice.
Product formulations and labels can change. Always check the package and consult
a qualified professional regarding allergies, medical conditions, pregnancy, or
dietary treatment.
