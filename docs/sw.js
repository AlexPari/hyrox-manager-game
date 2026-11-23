// Hyrox Manager economy simulator: offline cache. Bump the version when you upload a new build.
const CACHE = "hyrox-sim-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Offline first: answer from the cache, refresh it in the background when online.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(r => {
      if (r && r.ok && new URL(e.request.url).origin === location.origin) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => hit || caches.match("./index.html"));
    return hit || net;
  }));
});
