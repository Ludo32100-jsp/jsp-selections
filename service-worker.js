// ------------------------------
// SERVICE WORKER JSP - VERSION AUTO UPDATE
// ------------------------------

const VERSION = "v1.0.0"; 
const CACHE_NAME = `jsp-cache-${VERSION}`;

// Liste des fichiers à mettre en cache
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./candidats.html",
  "./resultats.html",
  "./classement.html",
  "./style.css",
  "./app.js",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.json"
];

// INSTALLATION : mise à jour immédiate
self.addEventListener("install", (event) => {
  self.skipWaiting(); // ⚡ active la nouvelle version immédiatement

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// ACTIVATION : remplace l'ancien SW sans attendre
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // ⚡ supprime les anciens caches
          }
        })
      )
    )
  );

  clients.claim(); // ⚡ force les pages ouvertes à utiliser le nouveau SW
});

// FETCH : sert les fichiers depuis le cache + fallback réseau
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() => {
          // Optionnel : fallback si hors ligne
          return caches.match("./index.html");
        })
      );
    })
  );
});
