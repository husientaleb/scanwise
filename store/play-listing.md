# Google Play listing — Ingrado

Copy-paste source for the Play Console "Main store listing" page, plus
prepared answers for the Data safety and Content rating questionnaires.

---

## App name (30 char max)

```
Ingrado
```

## Short description (80 char max — currently 69)

```
Scan food labels. Understand every ingredient. Choose with confidence.
```

## Full description (4000 char max)

```
Ingrado turns a packaged food label into a clear, honest explanation.

Point your phone at an ingredient list or nutrition panel. Ingrado reads it, explains what each ingredient actually is, puts the nutrition numbers in context, flags allergens, and helps you find a better option — without fear-based claims or simplistic "good food / bad food" verdicts.

WHAT YOU GET FROM EVERY SCAN

• Every ingredient explained — what it is, why manufacturers use it, and what current evidence actually says. Sub-ingredients hidden inside compound ingredients (like everything inside "chocolate chips") get their own explanation too.

• Evidence you can check — explanations carry an evidence grade from A to E and link to sources such as the FDA, EFSA, WHO and USDA. Where regulators disagree, Ingrado says so plainly.

• Nutrition in context — added sugar, sodium, saturated fat, fiber and protein with % Daily Value, judged against the norms for that kind of product. A soup is not held to a breakfast cereal's sodium standard.

• Allergen alerts kept separate — the nine major allergens, plus "may contain" and shared-facility statements. Allergy information is never buried inside a score.

• A transparent score — you see the whole calculation: where it started, every adjustment, and why. No black box.

• Better options — verified alternatives from an open product database, filtered by what you actually care about: less sugar, less sodium, more fiber, more protein.

BUILT AROUND HONESTY

Ingrado never invents nutrition numbers. If something cannot be read from the label, it is shown as unavailable — not guessed. If a database record disagrees with the package in your hand, the package wins and the conflict is shown to you. Ingredients are never penalized just for having long chemical names.

MADE FOR YOUR HOUSEHOLD

Create profiles for different people — allergies, dietary preferences, nutrition goals — then re-read any report through anyone's eyes with a single tap.

PRIVACY BY DEFAULT

No account required. Your scans, photos and profiles stay on your device. No ads, no tracking, no analytics.

Product data from Open Food Facts, used under the Open Database License (ODbL).

Ingrado provides general educational information and is not medical advice. Product formulations and labels can change. Always check the package and consult a qualified professional regarding allergies, medical conditions, pregnancy, or dietary treatment.
```

---

## Store settings

| Field | Value |
|---|---|
| App or game | App |
| Free or paid | Free |
| Category | Food & Drink (alternative: Health & Fitness) |
| Tags | food, nutrition, health, shopping |
| Email address | husien.taleb1990@gmail.com |
| Website | https://www.ingrado.app |
| Privacy policy URL | https://www.ingrado.app/#/privacy |

## Graphics

| Asset | File | Size |
|---|---|---|
| App icon | `icon-512.png` (repo root) | 512×512 |
| Feature graphic | `store/feature-graphic.png` | 1024×500 |
| Phone screenshots | take 2–8 on your phone | min 320px, 9:16-ish |

Suggested screenshots (in this order): Home screen · a product report
showing the headline + score · the ingredient list expanded · the allergy
alert card · Find better options.

---

## Data safety form answers

These match the published privacy policy exactly.

- **Does your app collect or share any of the required user data types?** → **No**
- **Is all of the user data collected by your app encrypted in transit?** → N/A (no collection)
- **Do you provide a way for users to request that their data is deleted?** → **Yes** — in-app: Profile → "Delete all my data" (data is local to the device)

Rationale if asked: scans, images, profiles and preferences are stored only
in the device's local browser storage. The app sends barcode numbers and
category queries to Open Food Facts to look up products; that is a product
query containing no personal or device identifiers. There are no accounts,
ads, analytics, or trackers.

## Content rating questionnaire

- Category: **Utility / Productivity / Communication / Other**
- Violence, sexuality, profanity, drugs, gambling → **No** to all
- User-generated content / social features / user interaction → **No**
- Shares user location → **No**
- Allows purchases → **No** (billing is not enabled)
- Expected outcome: **Everyone / PEGI 3**

## Other declarations

- **Ads** → No, the app contains no ads
- **Target audience** → 18+ (or 13+); the app is not designed for children
- **Government app** → No
- **Financial features** → None
- **Health apps declaration** → Ingrado is an educational label-reading tool;
  it does not diagnose, treat, or give medical advice, and makes no health
  claims about specific products.

---

## Release notes (first release)

```
First release of Ingrado.

Scan a food label to get plain-language ingredient explanations, nutrition in context, allergen alerts, a fully transparent score, and verified better options.
```
