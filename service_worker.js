const cacheName = "notedownPWA-v0.0.1";
const appShellFiles = [
  "/NoteDown/",
  "/NoteDown/index.html",
  "/NoteDown/icons/icon144x144.png",
  "/NoteDown/icons/icon72x72.png",
  "/NoteDown/icons/icon192x192.png",
  "/NoteDown/icons/icon128x128.png",
  "/NoteDown/icons/icon96x96.png",
  "/NoteDown/icons/icon152x152.png",
  "/NoteDown/icons/icon512x512.png",
  "/NoteDown/icons/icon384x384.png",
  "/NoteDown/note-down.js",
  "/NoteDown/notedown.webmanifest",
  "/NoteDown/style.css",
  "/NoteDown/note-down.umd.cjs"
];

self.addEventListener("install", (e) => {
  console.log("[Service Worker] Install");
  e.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      console.log("[Service Worker] Caching all: app shell and content");
      await cache.addAll(appShellFiles);
    })(),
  )
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    (async () => {
      const r = await caches.match(e.request, { ignoreSearch: true });
      console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (r) {
        return r;
      }
      const response = await fetch(e.request);
      const cache = await caches.open(cacheName);
      console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
      cache.put(e.request, response.clone());
      return response;
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key === cacheName) {
            return;
          }
          return caches.delete(key);
        }),
      );
    }),
  );
});
