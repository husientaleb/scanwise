# ScanWise 🥦

**Scan it. Understand it. Choose better.**

ScanWise is a mobile-first web app that helps consumers understand packaged food.
Photograph (or paste) a product's ingredient list and nutrition label, and get a
clear, balanced, evidence-based report: plain-language ingredient explanations,
nutrition context, allergen alerts, a transparent 1–10 score, and practical
guidance for choosing a healthier alternative.

ScanWise deliberately avoids fear-based language. Unfamiliar or synthetic
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
js/
  main.js             Hash router + session state
  schema.js           Canonical analysis JSON schema + validator (zod-style)
  ingredients-db.js   Balanced ingredient knowledge base + allergen keywords
  analyzer.js         Local pipeline: parse label text → schema-valid analysis
  scoring.js          Transparent scoring utility (isolated, swappable)
  store.js            localStorage persistence (mirrors the Supabase schema)
  ocr.js              Tesseract.js OCR (on-device) + label sectionizer
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
   vars) for accounts + synced history; Stripe for ScanWise Plus billing.

See `.env.example`. **All keys are server-side only** — nothing secret ships to
the client.

## How analysis works

1. **Capture** — camera/upload with preview, rotate, and drag-to-crop (or manual
   text entry). Max 10 MB; unsupported files are rejected with clear messages.
2. **OCR** — Tesseract.js runs on-device; text is sectioned into product name /
   ingredients / nutrition heuristically.
3. **Review** — the user corrects the extracted text before anything is analyzed.
   Unreadable fields stay blank; ScanWise never invents label data.
4. **Analyze** — `analyzer.js` parses ingredients (knowledge-base lookup),
   nutrition numbers, and the nine major allergens, then `scoring.js` produces a
   transparent score: start at 7, apply visible adjustments (e.g. "High added
   sugar (14 g): −1.5", "Good fiber: +0.5"), clamp to 1–10. Missing data lowers
   *confidence*, never the score itself.
5. **Report** — score ring + label, "why this score" breakdown, key findings
   (max 5), allergen alerts (independent of the score), nutrition cards with
   low/moderate/high context, expandable ingredient cards, alternative-shopping
   guidance, and explicit limitations.

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

## Tests

Open `tests/tests.html` — 20+ assertions covering the scoring rubric, schema
validation (including rejection of fabricated values and >5 findings), label
parsing, allergen detection, and end-to-end analysis of the demo products
(including a "no fear-based language" check).

## Disclaimer

ScanWise provides general educational information and is not medical advice.
Product formulations and labels can change. Always check the package and consult
a qualified professional regarding allergies, medical conditions, pregnancy, or
dietary treatment.
