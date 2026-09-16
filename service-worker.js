const CACHE_NAME = "rtr-attendance-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./scrip.js",
  "./manifest.json",
  "./icon.svg"
];

// Install Event: Pre-cache core application shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up legacy caches and take immediate control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-first with background network revalidation & offline fallback
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Exclude external API requests or browser extensions
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version immediately if available
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and navigating to a page, serve cached index.html
          if (event.request.mode === "navigate") {
            return caches.match("./index.html") || caches.match("./");
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
