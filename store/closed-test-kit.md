# Ingrado — closed testing kit

Everything needed to run the Google Play closed test that unlocks
production access: 12 testers, opted in continuously for 14 days.

**Upload file:** `C:\Users\husie\Downloads\Ingrado - Google Play package\Ingrado.aab`
**Package ID:** `app.ingrado.www.twa` (permanent — already verified by Google's asset links)

---

## 1. Play Console setup

1. **Testing → Closed testing → Create new release**
2. If asked about app signing, accept **Google Play App Signing**.
3. Upload `Ingrado.aab`.
4. Release name: `1.0.0 (1)` — leave whatever Play suggests.
5. Release notes: paste the block below.
6. **Save → Review release → Start rollout to Closed testing**.

Then create the tester list:

7. On the closed-test track open the **Testers** tab.
8. **Create email list** → name it `Ingrado testers` → add the Gmail addresses.
9. Save, then **copy the opt-in link** shown on that tab. It looks like:
   `https://play.google.com/apps/testing/app.ingrado.www.twa`

### Release notes

```
First closed test of Ingrado.

Scan a food label to get plain-language ingredient explanations, nutrition in context, allergen alerts, a fully transparent score, and verified better options.

Please report anything confusing, wrong, or broken — especially misread labels.
```

---

## 2. Recruiting message (WhatsApp / SMS)

```
Hey! I built an app called Ingrado — you point your phone at a food label and it
explains every ingredient in plain language, flags allergens, and shows you
better options.

To get it onto the Play Store, Google needs 12 people to test it for 14 days.
Would you help? It's about 3 minutes of setup, then you just leave it installed.

If you're in, send me the Gmail address you use on your Android phone and I'll
send you the link.
```

## 3. Recruiting message (email)

```
Subject: Can you help me launch my app? (3 minutes)

Hi <name>,

I've been building an app called Ingrado. You point your phone at a food
label and it explains what every ingredient actually is, puts the nutrition
numbers in context, flags allergens, and suggests better options — without the
scare-mongering most food apps go in for.

It's live on the web at https://ingrado.app if you want a look first.

To publish it on the Google Play Store, Google requires 12 testers to have the
app installed for 14 days. I'm short of that, and I'd really appreciate your
help. It's a few minutes of setup and then you can forget about it.

If you're willing, reply with the Gmail address you use on your Android phone
and I'll send you the install link.

Thanks!
Husien
```

## 4. Instructions to send each tester (after adding their email)

```
Thanks for helping! Here's the link:

<PASTE OPT-IN LINK>

On your Android phone:
1. Open the link
2. Check you're signed in with the Gmail address you gave me (this matters —
   a different account won't count)
3. Tap "Become a tester"
4. Tap "Download it on Google Play" and install it
5. That's it. Please just leave it installed for the next two weeks.

If anything looks wrong or confusing in the app, tell me — that's genuinely
the useful part.
```

---

## 5. Tester tracker

Aim for **15 people** so you have margin if a few drop out.

| # | Name | Gmail | Opted in (date) | Installed | Still opted in |
|---|------|-------|-----------------|-----------|----------------|
| 1 |  |  |  |  |  |
| 2 |  |  |  |  |  |
| 3 |  |  |  |  |  |
| 4 |  |  |  |  |  |
| 5 |  |  |  |  |  |
| 6 |  |  |  |  |  |
| 7 |  |  |  |  |  |
| 8 |  |  |  |  |  |
| 9 |  |  |  |  |  |
| 10 |  |  |  |  |  |
| 11 |  |  |  |  |  |
| 12 |  |  |  |  |  |
| 13 |  |  |  |  |  |
| 14 |  |  |  |  |  |
| 15 |  |  |  |  |  |

**Clock starts** when you have 12 people simultaneously opted in — not when
the first person joins. Note that date here:

> 14-day window started: ____________  → eligible to apply: ____________

---

## 6. Things that silently break the 14 days

- A tester signs in with a **different Google account** than the one on your list.
- A tester **opts out** (or removes themselves) — their days don't carry over if
  they rejoin; the 14 days must be continuous.
- You **remove and re-add** an email — treat the list as append-only once running.
- Someone only clicks "Become a tester" but **never installs**.
- Counting fewer than 12: if one drops on day 10, you may restart the clock, so
  keep spares opted in.

## 7. After 14 days

1. Play Console **Dashboard** shows **"Apply for production access"**.
2. Answer the short questionnaire (what you tested, what you learned, how you
   handled feedback). Be specific and honest — vague answers get rejected.
3. Google reviews; this can take several days.
4. Once granted: **Production → Create new release** → upload the same AAB →
   select countries → **Send for review** → publish.
