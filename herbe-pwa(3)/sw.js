// Service worker v3 – volontairement minimal.
// La page est toujours chargée depuis le réseau ; le cache ne sert que hors connexion.
// Aucune réponse redirigée n'est jamais stockée ni renvoyée (cause de page blanche sur Netlify).
const VERSION = "herbe-v4";
const COQUILLE = ["./", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"];

// Recrée une réponse "propre" si le navigateur a suivi une redirection
async function propre(r) {
  if (!r || !r.redirected) return r;
  const corps = await r.blob();
  return new Response(corps, { status: r.status, statusText: r.statusText, headers: r.headers });
}

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    for (const url of COQUILLE) {
      try { const r = await fetch(url, { cache: "reload" }); if (r.ok) await c.put(url, await propre(r)); }
      catch (err) { /* un fichier manquant ne doit pas bloquer l'installation */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const n of await caches.keys()) if (n !== VERSION) await caches.delete(n); // purge v1/v2
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // Réseau uniquement ; page en cache seulement si le réseau échoue
    e.respondWith(fetch(req).catch(async () =>
      (await caches.match("./")) || new Response("Hors connexion", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })));
    return;
  }

  e.respondWith((async () => {
    const enCache = await caches.match(req);
    if (enCache) return enCache;
    return fetch(req);
  })());
});
