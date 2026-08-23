// Firebase project config for Cashbook.
// This is safe to commit / expose client-side — it is not a secret.
// Real security is enforced by firestore.rules (see repo root), which
// only lets the two emails below read or write, and only ENTERER_EMAIL write.
export const firebaseConfig = {
  apiKey: "AIzaSyCRstAmAQBX9nqlBlK26RXjf2mcZaA-G8A",
  authDomain: "cashbook-957d0.firebaseapp.com",
  projectId: "cashbook-957d0",
  storageBucket: "cashbook-957d0.firebasestorage.app",
  messagingSenderId: "251646920433",
  appId: "1:251646920433:web:de315f0bda04e2c94f0b50"
};

// The only account allowed to add/edit/delete entries and accounts.
export const ENTERER_EMAIL = "anushansiv@gmail.com";

// Every email allowed to sign in and read the ledger at all
// (enterer + viewer). Anyone else is rejected by firestore.rules
// even if they somehow authenticate.
export const ALLOWED_EMAILS = ["anushansiv@gmail.com", "contactsivanathan@gmail.com"];
