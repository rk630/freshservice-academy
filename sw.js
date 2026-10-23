/* Offline support: keeps the course available without internet after the first visit.
   Bump VERSION whenever you upload a new index.html so phones fetch the update. */
const VERSION = "fsa-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isPage = req.mode === "navigate";
  const isOwn = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!isOwn && !isFont) return; // reference pages (Freshworks) always load live
  if (isPage) {
    // network first, so updates arrive; fall back to the saved copy offline
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("./index.html", copy)); return res; }).catch(() => caches.match("./index.html")));
    return;
  }
  // cache first for icons, manifest and fonts
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })));
});
