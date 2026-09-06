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

// Temporary diagnostic beacon - reports each stage of handling a push event
// back to the server, since a delivery/display failure on the device is
// otherwise completely invisible from outside. Safe to remove once push is
// confirmed working end to end (see api/routes/pushDebug.js).
const reportPushDebug = (stage, note) =>
  fetch("/api/push-debug", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage, note }),
  }).catch(() => {});

self.addEventListener("push", (event) => {
  let data = { title: "Taskflow", body: "You have updates waiting." };
  let parseError = null;
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (err) {
    parseError = err?.message || String(err);
  }

  const handlePush = (async () => {
    await reportPushDebug("received", parseError ? `payload parse failed: ${parseError}` : `title="${data.title}"`);
    try {
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/favicon_io/favicon-32x32.png",
        badge: "/favicon_io/favicon-32x32.png",
      });
      await reportPushDebug("shown", `title="${data.title}"`);
    } catch (err) {
      await reportPushDebug("show-failed", err?.message || String(err));
    }
  })();

  event.waitUntil(handlePush);
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
