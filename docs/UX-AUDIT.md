# ScanWise UX audit & redesign summary

## Problems found in the previous interface

| # | Problem | Severity |
|---|---|---|
| 1 | Green/blue palette leaned "generic health app"; green did double duty as brand color AND goodness signal | Medium |
| 2 | Home screen led with buttons, not a value proposition; no greeting, no profile context | Medium |
| 3 | Raw technical strings leaked into reports ("AI path: HTTP 404", "OCR confidence") | High |
| 4 | Analysis showed a single spinner-in-button — no sense of progress or what was happening | Medium |
| 5 | The report was one long page: ~12 cards with no layering; shoppers had to scroll past the scoring rubric to reach allergens | High |
| 6 | The numeric score was the only focal point; no plain-language takeaway | High |
| 7 | Ingredient list on long products (15+ entries) had no search or filtering | Medium |
| 8 | Arbitrary spacing/colors in views instead of tokens | Medium |
| 9 | No stated design tokens → dark mode and theming impossible later | Low |
| 10 | Error toast on analysis failure was vague ("Analysis failed unexpectedly") | Low |

## What changed

**Design tokens (`styles.css`)** — every color, space, radius, shadow, duration,
and type size is now a named token. New palette: deep teal primary (trust),
fresh green reserved for positive *actions*, soft blue for information, warm
amber/muted red for attention/warnings, warm off-white background, charcoal
text. Color is never the only signal — every colored element keeps a text
label. Back-compat aliases keep older class references working; dark mode can
be added by re-mapping tokens.

**Home screen** — greeting + active-profile chip (tap to switch), a hero scan
card ("What are you shopping for?" → Open Scanner / Upload a photo / Type it
in), exactly three quick actions (Compare, Ingredients, Saved), compact
recent-scan cards that lead with the main finding, and demo products framed
as "Try a demo".

**Progressive analysis** — replacing the bare spinner: a five-stage list
(Reading your label → Checking each ingredient → Reviewing the nutrition
numbers → Personalizing → Putting it together) with educational microcopy.
Stages describe genuinely-occurring work and never delay the report.

**Layered report** — a plain-language headline card gives the five-second
takeaway ("Excellent source of fiber, but high added sugar") before any
number. A Quick view / Full analysis toggle (remembered per user) trims the
report for in-store use to: What stands out, Allergy alerts, Nutrition, and
Find better options. Full analysis keeps every card: transparent scoring,
product identification, dimensions, claims check, diet check, ingredients,
limitations, and management.

**Ingredient list** — search box (on longer lists) plus filter chips (All /
Allergens / Sweeteners / Additives / Not in database).

**Consumer language** — engine notes are now human ("Analyzed on your device
with ScanWise's built-in engine"); technical detail moved to the console.
Error copy tells users their text is preserved and what to do next.

## Still open (future rounds)

- Live camera scanner UI with framing guides and haptics (current: photo
  capture + crop; the BarcodeDetector groundwork exists)
- Onboarding carousel distinct from the landing page
- Saved-product lists/collections beyond favorites
- Share-card images (current: text share via the native sheet)
- Dark mode (tokens are ready)
- Analytics event map (requires a privacy-reviewed collection endpoint)
