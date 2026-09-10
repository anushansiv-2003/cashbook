# Cashbook

A mobile-first personal cash ledger — track cash in/out across multiple accounts (Cash, Bank, …), see statements for any date range, export to PDF/CSV, and stay synced live across every device. Built on Firebase (Auth + Firestore) and deployed as a static site on Firebase Hosting.

- **Editor** (`ENTERER_EMAIL` in `js/firebase-config.js`) can add/delete entries and manage accounts.
- **Viewer** (any other email in `ALLOWED_EMAILS`) can sign in and see everything, read-only.
- Enforcement is server-side via `firestore.rules` — not just hidden UI — so a viewer genuinely cannot write, even by tampering with the page.

## Project structure

```
index.html                        App shell + login screen (all views)
css/styles.css                     All styling, incl. light/dark theme + print stylesheet
js/firebase-config.js             Firebase web config + allowed emails + VAPID key (not secrets — see note below)
js/app.js                          All app logic (Firebase Auth + Firestore, UI, reports, PDF/CSV export, push registration)
service-worker.js                  Caches the app shell + Firebase SDK/fonts for instant loads; also handles push notifications
scripts/notify.mjs                 Free poller: checks for new entries and sends pushes via FCM (no Cloud Functions)
.github/workflows/notify.yml       Runs notify.mjs on a schedule via GitHub Actions
firebase.json                      Hosting + Firestore deploy config
firestore.rules                    Security rules — the real access control
firestore.indexes.json            (empty — no composite indexes needed yet)
.firebaserc                        Points the Firebase CLI at your project
```

## Fast load, every time

The service worker now answers app-shell requests (HTML/CSS/JS/icons) straight
from cache and refreshes them in the background ("stale-while-revalidate"),
instead of waiting on the network first. It also caches the Firebase SDK
files and Google Fonts pulled from CDNs, since their URLs are version-pinned
and safe to cache indefinitely. Net effect: after the first visit, opening
Cashbook doesn't wait on any network round-trip to show the UI — Firestore's
own offline cache (already configured in `js/app.js`) then fills in your data,
instantly if it was synced before.

If you ever bump the Firebase SDK version in the `<script>`/`import` URLs,
update the matching `<link rel="modulepreload">` tags in `index.html` and the
`CACHEABLE_CROSS_ORIGIN` list in `service-worker.js` stays valid automatically
(it matches by URL prefix, not exact version).

## Push notifications (new entry → alert, app closed or not) — free, no billing plan

Every signed-in device can register itself to get a real system notification
the moment *anyone* adds an entry — the "everyone gets pinged like it's
WhatsApp" behavior — without needing Firebase's paid Blaze plan or Cloud
Functions. Instead, a free scheduled GitHub Actions job
(`.github/workflows/notify.yml`) wakes up periodically, checks Firestore for
anything new, and sends the push itself via a small zero-dependency script
(`scripts/notify.mjs`) that talks directly to the Firestore and FCM REST
APIs using nothing but Node's built-in `crypto` and `fetch`.

**Tradeoff to know:** this checks periodically rather than watching Firestore
live, so there's a small delay between an entry being added and the
notification arriving — up to ~5 minutes with the default schedule (your
repo is public, so GitHub Actions minutes are unlimited/free at that
interval; see the cron comment in the workflow file if that ever changes).
If you ever want truly instant pushes and are fine adding a card, the Cloud
Functions approach is the alternative (ask if you want that swapped back in).

Setup (one-time):

1. **Cloud Messaging → Web configuration → "Generate key pair"** in
   Firebase console → Project settings. Copy the key into `VAPID_KEY` in
   `js/firebase-config.js`.
2. **Generate a service account key**: Firebase console → Project settings →
   Service accounts → "Generate new private key". This downloads a JSON file
   — treat it like a password, never commit it to the repo.
3. In your GitHub repo: **Settings → Secrets and variables → Actions → New
   repository secret**, name it `FIREBASE_SERVICE_ACCOUNT_KEY`, and paste the
   *entire contents* of that JSON file as the value.
4. Deploy the app as usual (`firebase deploy --only hosting,firestore:rules`)
   and push these changes to GitHub — the workflow starts running on its own
   schedule from there. You can also trigger it manually any time from the
   repo's **Actions** tab (workflow_dispatch).
5. Open the app on each device you want notified and tap **Enable** on the
   banner that appears — this asks for notification permission and registers
   that device.

How it works: each device stores its push token in the `pushTokens`
collection (one doc per device, keyed by its own token — Firestore rules
only let a device touch its own doc; the scheduled job authenticates as a
service account, which bypasses those client-facing rules entirely, the same
way a Cloud Function would). Each run reads a `_meta/notifyCursor` doc to
know what it already processed, pushes for anything newer, and prunes any
push token FCM reports as no longer valid.

## One-time setup (already done for this project)

This repo is wired to the Firebase project `cashbook-957d0`, with:
- Firestore Database created (Native mode)
- Authentication → Email/Password provider enabled
- Two users created under Authentication → Users: the editor and viewer emails

If you ever need to add a third viewer, add their email to `Authentication → Users` in the Firebase console **and** to `ALLOWED_EMAILS` in `js/firebase-config.js` **and** to the two `isAllowedReader()`/rules lists in `firestore.rules`, then redeploy (see below).

## Deploying

You need the Firebase CLI once:

```bash
npm install -g firebase-tools
firebase login
```

Then, from this folder:

```bash
firebase deploy --only hosting,firestore:rules
```

That pushes both the site (to `https://cashbook-957d0.web.app`) and the security rules. Just the rules, or just the site, can be deployed separately with `--only firestore:rules` or `--only hosting`.

## Local preview

Any static file server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Open the printed URL — no build step, it's plain HTML/CSS/JS.

## Notes on the Firebase web config

`js/firebase-config.js` contains your Firebase project's `apiKey`, `projectId`, etc. This is **not a secret** — it's meant to be public in client-side web apps (this is standard Firebase practice). The actual security boundary is `firestore.rules`, which only lets the two configured emails read data, and only the editor email write it. Don't rely on hiding this file; rely on the rules.

## Data model

Two Firestore collections, both at the root:

- `accounts/{id}` — `{ name, order, createdAt }`
- `entries/{id}` — `{ accountId, date, time, type: "in"|"out", amount, description, createdAt, createdBy }`

The app subscribes to both with `onSnapshot`, so every open device updates live — no manual refresh needed.

## Changing who can sign in

Firebase Authentication's Email/Password provider technically allows anyone with the project's public API key to attempt an account via the REST API — but `firestore.rules` checks the signed-in user's exact email against an allowlist, so a stranger's account (if one were ever created) still can't read or write any ledger data. For tighter control later, consider Firebase App Check or disabling public sign-up via Identity Platform.
