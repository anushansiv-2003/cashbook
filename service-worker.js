// Cashbook service worker
//
// Strategy: stale-while-revalidate for everything cacheable — answer instantly
// from cache if we have it, and refresh the cache from the network in the
// background for next time. That applies to:
//   - the app shell (HTML/CSS/JS/icons)
//   - the Firebase SDK + Google Fonts files pulled from CDNs (their URLs are
//     version-pinned, so caching them aggressively is safe — "download once",
//     not "download every time you open the app")
//
// Firebase Auth / Firestore network calls are NEVER intercepted — your live
// ledger data always comes straight from the network (or Firestore's own
// offline cache), never from this service worker.
//
// This file also owns push notifications: showing a system notification when
// a push arrives (even if Cashbook isn't open), and focusing/opening the app
// when one is tapped.

const CACHE_NAME = "cashbook-shell-v2";
const RUNTIME_CACHE = "cashbook-runtime-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/firebase-config.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

// Cross-origin hosts we're allowed to cache. Both serve long-lived,
// version/hash-pinned URLs, so caching them doesn't risk staleness.
const CACHEABLE_CROSS_ORIGIN = [
  "https://www.gstatic.com/firebasejs/",
  "https://fonts.googleapis.com/",
  "https://fonts.gstatic.com/"
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
      Promise.all(names.filter((n) => n !== CACHE_NAME && n !== RUNTIME_CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      // Cached response wins immediately when we have one; the network
      // fetch still runs (above) to keep the cache fresh for next time.
      return cached || networkFetch;
    })
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    const isShellRequest = APP_SHELL.some((p) => url.pathname.endsWith(p.replace("./", "/"))) || url.pathname === "/";
    if (isShellRequest) event.respondWith(staleWhileRevalidate(req, CACHE_NAME));
    return;
  }

  if (CACHEABLE_CROSS_ORIGIN.some((prefix) => req.url.startsWith(prefix))) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
  }
  // Everything else (Firebase Auth, Firestore, etc.) passes straight through.
});

/* ---------------- push notifications ---------------- */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch (e) { return; }
  const notif = payload.notification || {};
  const title = notif.title || "Cashbook";
  const options = {
    body: notif.body || "",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: payload.data || {},
    tag: (payload.data && payload.data.entryId) || undefined
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
