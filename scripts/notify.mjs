// Free, serverless push notifier for Cashbook.
//
// Runs on a schedule (see .github/workflows/notify.yml), checks Firestore for
// any `entries` created since the last run, and sends a push via FCM to
// every device in `pushTokens` — the free alternative to a Cloud Function.
//
// No npm dependencies on purpose: only Node's built-in `crypto` (to sign a
// service-account JWT) and global `fetch` (Node 18+) are used, talking
// directly to the Firestore and FCM REST APIs. That keeps each CI run to a
// couple of seconds, which matters because GitHub bills scheduled runs in
// whole-minute increments.
//
// Required env vars (see README for how to set these as GitHub secrets):
//   FIREBASE_SERVICE_ACCOUNT_KEY  — full JSON contents of a service account key
//   FIREBASE_PROJECT_ID           — defaults to "cashbook-957d0" (see js/firebase-config.js)

import crypto from "node:crypto";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "cashbook-957d0";
const KEY_JSON = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FCM_SEND_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

/* ---------------- auth: sign our own short-lived access token ---------------- */

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken() {
  if (!KEY_JSON.client_email || !KEY_JSON.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing or malformed — see README for setup.");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: KEY_JSON.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const unsigned = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claim));
  const signature = base64url(crypto.createSign("RSA-SHA256").update(unsigned).sign(KEY_JSON.private_key));
  const jwt = unsigned + "." + signature;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!res.ok) throw new Error("Auth failed: " + (await res.text()));
  return (await res.json()).access_token;
}

/* ---------------- tiny Firestore REST helpers ---------------- */

function unwrapValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue !== undefined) return unwrapFields(v.mapValue.fields || {});
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(unwrapValue);
  return null;
}
function unwrapFields(fields) {
  const out = {};
  for (const k in fields) out[k] = unwrapValue(fields[k]);
  return out;
}
function idFromName(name) {
  return name.split("/").pop();
}

async function firestoreFetch(path, token, init) {
  const res = await fetch(`${FIRESTORE_BASE}${path}`, {
    ...init,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(init && init.headers) }
  });
  return res;
}

async function listCollection(token, collectionId) {
  const out = [];
  let pageToken;
  do {
    const qs = new URLSearchParams({ pageSize: "300" });
    if (pageToken) qs.set("pageToken", pageToken);
    const res = await firestoreFetch(`/${collectionId}?${qs}`, token);
    if (!res.ok) throw new Error(`List ${collectionId} failed: ` + (await res.text()));
    const data = await res.json();
    (data.documents || []).forEach((d) => out.push({ id: idFromName(d.name), ...unwrapFields(d.fields || {}) }));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

async function runQuery(token, structuredQuery) {
  const res = await firestoreFetch(":runQuery", token, { method: "POST", body: JSON.stringify({ structuredQuery }) });
  if (!res.ok) throw new Error("Query failed: " + (await res.text()));
  const rows = await res.json();
  return rows.filter((r) => r.document).map((r) => ({ id: idFromName(r.document.name), ...unwrapFields(r.document.fields || {}) }));
}

async function getCursor(token) {
  const res = await firestoreFetch("/_meta/notifyCursor", token);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Cursor fetch failed: " + (await res.text()));
  return unwrapFields((await res.json()).fields || {});
}

async function setCursor(token, isoTimestamp) {
  const res = await firestoreFetch("/_meta/notifyCursor?updateMask.fieldPaths=lastCreatedAt", token, {
    method: "PATCH",
    body: JSON.stringify({ fields: { lastCreatedAt: { timestampValue: isoTimestamp } } })
  });
  if (!res.ok) throw new Error("Cursor update failed: " + (await res.text()));
}

async function deletePushToken(token, deviceToken) {
  await firestoreFetch(`/pushTokens/${encodeURIComponent(deviceToken)}`, token, { method: "DELETE" }).catch(() => {});
}

/* ---------------- FCM ---------------- */

async function sendPush(token, deviceToken, title, body, data) {
  const res = await fetch(FCM_SEND_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token: deviceToken, notification: { title, body }, data } })
  });
  if (res.ok) return { ok: true };
  const errBody = await res.json().catch(() => ({}));
  return { ok: false, status: errBody && errBody.error && errBody.error.status };
}

/* ---------------- formatting ---------------- */

function formatMoney(n) {
  const v = Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const parts = Math.abs(v).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "Rs " + parts[0] + "." + parts[1];
}

/* ---------------- main ---------------- */


async function main() {
  const token = await getAccessToken();
  const cursor = await getCursor(token);

  const structuredQuery = {
    from: [{ collectionId: "entries" }],
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "ASCENDING" }],
    limit: 200
  };
  if (cursor && cursor.lastCreatedAt) {
    structuredQuery.where = {
      fieldFilter: { field: { fieldPath: "createdAt" }, op: "GREATER_THAN", value: { timestampValue: cursor.lastCreatedAt } }
    };
  }
  const entries = await runQuery(token, structuredQuery);

  if (!cursor) {
    // First run ever: just establish a baseline so we don't blast a
    // notification for every entry that already existed in the ledger.
    const latest = entries[entries.length - 1];
    await setCursor(token, latest ? latest.createdAt : new Date().toISOString());
    console.log("Baseline set — no notifications sent on first run.");
    return;
  }
  if (!entries.length) {
    console.log("No new entries.");
    return;
  }

  const tokens = await listCollection(token, "pushTokens");
  if (tokens.length) {
    const accounts = await listCollection(token, "accounts");
    for (const en of entries) {
      const acct = accounts.find((a) => a.id === en.accountId);
      const title = (en.type === "in" ? "Cash in" : "Cash out") + " · " + (acct ? acct.name : "Cashbook");
      const sign = en.type === "in" ? "+" : "-";
      const body = sign + formatMoney(en.amount) + (en.description ? " — " + en.description : "");
      for (const t of tokens) {
        const result = await sendPush(token, t.id, title, body, { entryId: en.id, accountId: en.accountId || "" });
        if (!result.ok && (result.status === "UNREGISTERED" || result.status === "NOT_FOUND")) {
          await deletePushToken(token, t.id);
        }
      }
    }
  }

  await setCursor(token, entries[entries.length - 1].createdAt);
  console.log(`Sent notifications for ${entries.length} new entr${entries.length === 1 ? "y" : "ies"}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
