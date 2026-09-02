# Ingrado architecture

Ingrado is a consumer product-intelligence platform: today a packaged-food
scanner, structured so new product categories (supplements, cosmetics,
household, pet food…) and new providers (databases, OCR engines, AI models)
plug in without a rebuild.

## Design rules

1. **Deterministic core, AI at the edge.** Parsing, matching, reconciliation,
   calculation, and scoring are plain code. AI only explains retrieved data
   and must return schema-valid JSON (retry once, then ship without it).
2. **Provenance everywhere.** Every fact is tagged: package label, verified
   database, app calculation, AI interpretation, or unknown. Label beats
   database; conflicts are surfaced, never hidden.
3. **Data-driven judgment.** Thresholds, category norms, DV constants, match
   weights, and claim rules live in config-style modules — tunable without
   touching engines.
4. **Fail to "unknown".** Missing data stays null and is reported as
   unavailable. No invented values, products, or evidence.

## Service map (current implementation)

| Service (spec) | Module | Status |
|---|---|---|
| Barcode service | `js/barcode.js` | ✅ validation, UPC-E expansion, BarcodeDetector |
| Product-search service | `js/product-db.js` | ✅ cache → Open Food Facts; FDC/licensed stubs |
| Product-matching service | `js/matching.js` + `js/match-config.js` | ✅ weighted, configurable |
| Reconciliation | `js/reconcile.js` | ✅ field-level, label-priority |
| Ingredient parser | `js/ingredient-parser.js` | ✅ nested tree, advisories |
| Normalization service | `js/normalize.js` | ✅ E-numbers, aliases, distinctions kept |
| Ingredient-knowledge service | `js/ingredients-db.js` | ✅ curated KB + grades + citations |
| Nutrition-calculation service | `js/nutrition-calc.js` + `js/dv-constants.js` | ✅ deterministic, jurisdiction-aware |
| Category intelligence | `js/categories.js` | ✅ detection + per-category thresholds |
| Scoring service | `js/scoring.js` | ✅ transparent, category- & preference-aware |
| Assessment dimensions | `js/assessment.js` | ✅ 7 separate dimensions |
| Allergen detection | `js/analyzer.js` (+KB keywords/exclusions) | ✅ contains/advisory separation |
| Marketing-claim analyzer | `js/claims.js` | ✅ regulated/marketing/contradicted verdicts |
| Profiles & preferences | `js/store.js` | ✅ family profiles, per-profile report lens |
| Scan history / favorites | `js/store.js` + views | ✅ localStorage (Supabase schema ready) |
| AI-explanation service | `js/ai.js` + `api/analyze.js` | ✅ retrieval-grounded, validated, fallback |
| OCR service | `js/ocr.js` | ✅ Tesseract.js on-device |
| Encyclopedia | `js/views/library.js` | ✅ searchable, normalizer-backed search |
| Subscription service | pricing view + usage meter | ✅ placeholders, billing inert |
| Auth / sync | `supabase/schema.sql` | 🔜 schema ready, not wired |
| Pantry / cart / receipts / price | — | 🔜 future phase |
| Admin review dashboard | — | 🔜 needs server + auth |
| Notifications / product-change tracking | — | 🔜 needs server jobs |

## Provider abstraction points

Each external dependency has one module boundary where a vendor can be
swapped or added:

- **Product data**: `product-db.js#lookupProduct` walks a source list
  (cache → OFF → FDC stub → licensed stub). Add a provider = add a fetch
  step + a mapper like `mapOffProduct`. Every record carries `source`,
  `sourceProductId`, `retrievedAt`.
- **OCR**: `ocr.js#recognizeImage` is the only OCR entry point.
- **AI**: `api/analyze.js` holds the model choice server-side; the client
  contract is only "schema-valid analysis JSON".
- **Barcode decoding**: `barcode.js#detectBarcodeInImage` (platform API
  today; a WASM decoder can replace it behind the same signature).
- **Evidence**: KB entries carry `sources[]`/`evidenceGrade`; a live
  retrieval service would populate the same fields.

## Adding a product category (food → supplements → cosmetics…)

1. Add category definitions + thresholds (`categories.js`) or a sibling
   config for non-food verticals.
2. Add KB entries (or a vertical-specific KB file) with the same record
   shape — grades, citations, jurisdiction notes.
3. Add category-specific disclaimers where required.
4. Scoring, parsing, reconciliation, profiles, and the report UI are
   category-agnostic and need no changes.

## Data model

Local storage mirrors the future server schema (`supabase/schema.sql`):
profiles (family members with prefs), scans (analysis + scoreDetail +
pipeline provenance + product version data), products cache, usage.
Spec entities not yet persisted (pantry, receipts, prices, submissions,
audit logs) map onto the same pattern when their phases arrive.

## Phases

- **Phase 1 (done):** capture → OCR → review → verified lookup → match →
  reconcile → parse → analyze → transparent report; history; demo data; PWA.
- **Phase 2 (done except accounts):** preferences, allergy profiles, family
  profiles, per-profile report lens, comparisons, favorites.
- **Phase 3 (partial):** shopping criteria ✅; verified exact-alternative
  search via OFF category queries 🔜.
- **Phase 4–5 (future):** cart/pantry/receipts/prices/notifications;
  expanded categories.
