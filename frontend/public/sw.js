const CACHE_NAME = "taskflow-cache-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Runtime cache for the app shell/static assets so the app still loads
// offline (or on a flaky connection) - API calls always go to the network
// since cached task data would go stale and this app has no write-sync
// story for offline edits yet.
// App-shell files that must never serve a stale copy (they carry the
// theme-color/manifest and drive which JS bundle loads) - network-first,
// falling back to cache only when offline.
const SHELL_PATHS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  const isShellRequest = request.mode === "navigate" || SHELL_PATHS.includes(url.pathname);

  if (isShellRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match("/index.html"));
      return cached || networkFetch;
    })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Taskflow", body: "You have updates waiting." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads, fall back to the default text above
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon_io/favicon-32x32.png",
      badge: "/favicon_io/favicon-32x32.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/home");
    })
  );
});
