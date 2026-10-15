// THIS IS WHERE WE WANT OT MAKE SOME PART OF THE APP OFFLINE
const CACHE_NAME = "h2049ja-v1"
const APP_FILES = [
    "./index.html",
    "./pages/history.html",
  "./pages/settings.html",
    "./pages/index.html",
    "./css/style.css",
    "./js/app.js",
    "./js/history.js",
    "./js/onboarding.js",
    "./js/settings.js",
    "./manifest.json",
    "./asset/icon/icon-192.png",
    "./asset/icon/icon-512.png"
]

// Install: cache the essential app files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();
});

// Activate: remove outdated app caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("h2o49ja-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  self.clients.claim();
});

// Fetch: use cached files when offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestURL = new URL(event.request.url);

  // Only handle requests from this app's origin
  if (requestURL.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Fall back to the cached dashboard for page navigation
        if (event.request.mode === "navigate") {
          return caches.match("./pages/index.html");
        }

        return new Response("", {
          status: 503,
          statusText: "Offline"
        });
      });
    })
  );
});
