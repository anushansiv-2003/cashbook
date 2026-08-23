# Cashbook

A mobile-first personal cash ledger — track cash in/out across multiple accounts (Cash, Bank, …), see statements for any date range, export to PDF/CSV, and stay synced live across every device. Built on Firebase (Auth + Firestore) and deployed as a static site on Firebase Hosting.

- **Editor** (`ENTERER_EMAIL` in `js/firebase-config.js`) can add/delete entries and manage accounts.
- **Viewer** (any other email in `ALLOWED_EMAILS`) can sign in and see everything, read-only.
- Enforcement is server-side via `firestore.rules` — not just hidden UI — so a viewer genuinely cannot write, even by tampering with the page.

## Project structure

```
index.html            App shell + login screen (all views)
css/styles.css         All styling, incl. light/dark theme + print stylesheet
js/firebase-config.js  Firebase web config + the two allowed emails (not a secret — see note below)
js/app.js               All app logic (Firebase Auth + Firestore, UI, reports, PDF/CSV export)
firebase.json           Hosting + Firestore deploy config
firestore.rules         Security rules — the real access control
firestore.indexes.json  (empty — no composite indexes needed yet)
.firebaserc              Points the Firebase CLI at your project
```

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
