// Minimal service worker — exists only so the browser considers Cashbook
// an installable PWA. It caches the static app shell (HTML/CSS/JS/icons)
// so the app can at least open when offline; it deliberately does NOT
// intercept Firebase/Firestore requests, so your live data always comes
// straight from the network.

const CACHE_NAME = "cashbook-shell-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/firebase-config.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle same-origin GET requests for files in our app shell.
  // Everything else (Firebase Auth, Firestore, Google Fonts, etc.)
  // passes straight through untouched.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const path = "." + url.pathname.replace(/^\/[^/]*\.github\.io\//, "/").replace(/\/$/, "/index.html");
  const isShellRequest = APP_SHELL.some((p) => url.pathname.endsWith(p.replace("./", "/")) || url.pathname === "/" );
  if (!isShellRequest) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
