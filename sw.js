/* ==========================================================================
   SERVICE WORKER — Chor-Übe-App
   Aufgabe: die App-Shell (HTML, Manifest, Icons) im Cache Storage halten,
   damit die App im Flugmodus und vom Home-Bildschirm startet.

   WICHTIG: Der Service Worker fasst IndexedDB niemals an. Beim Aktivieren
   werden ausschließlich alte *Cache-Storage*-Einträge gelöscht — die Songs,
   Loops und Playlisten des Nutzers bleiben bei jedem Update erhalten.
   ========================================================================== */

// Bei jeder Änderung an index.html/sw.js/manifest.json erhöhen.
// Daraus leitet sich der Cache-Name ab; ein neuer Name = frischer Shell-Cache.
const SW_VERSION = 'v133';
const CACHE_NAME = `chor-app-shell-${SW_VERSION}`;

// Alle Pfade relativ, weil die App unter einem Unterpfad liegt
// (https://<name>.github.io/<repo>/). Absolute Pfade würden dort ins Leere zeigen.
//
// Pflichtteil: ohne eine dieser Dateien startet die App offline gar nicht
// oder verliert den HD-Modus (Befund 6 in SLOWPLAY-HD-FIX-PLAN.md — ein
// einzelner fehlgeschlagener cache.add() galt bislang trotzdem als
// erfolgreiche Installation, und activate() löschte danach den alten,
// vollständigen Cache). Fehlt eine davon, darf dieser Cache weder als fertig
// gelten noch einen älteren, funktionierenden Stand ersetzen.
const SHELL_REQUIRED = [
  './',
  './index.html',
  './groove-lab.js',
  './signalsmith-stretch.js',
];
// Kürteil: fehlt eine davon, bleibt die App trotzdem offlinefähig — der
// MP3-Export bzw. eine Icon-Variante fehlt dann einmalig, bis das nächste
// Update sie nachträgt.
const SHELL_OPTIONAL = [
  './lame.min.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];
const SHELL = [...SHELL_REQUIRED, ...SHELL_OPTIONAL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Einzeln statt addAll: schlägt eine Kür-Datei fehl, soll das die
      // Installation nicht scheitern lassen.
      const results = await Promise.all(
        SHELL.map(async (path) => {
          try {
            await cache.add(new Request(path, { cache: 'reload' }));
            return { path, ok: true };
          } catch (err) {
            console.warn('[sw] konnte nicht cachen:', path, err);
            return { path, ok: false };
          }
        })
      );
      const missing = results.filter((r) => !r.ok && SHELL_REQUIRED.includes(r.path));
      if (missing.length) {
        // Diesen unvollständigen Cache verwerfen: eine fehlgeschlagene
        // install() lässt den Browser die neue Service-Worker-Version ganz
        // verwerfen, der bisherige aktive Worker (und sein vollständiger
        // Cache) bleibt unangetastet in Kontrolle.
        await caches.delete(CACHE_NAME);
        throw new Error(`Pflichtdateien fehlen im Shell-Cache: ${missing.map((r) => r.path).join(', ')}`);
      }
      // Kein automatisches skipWaiting: Der Nutzer entscheidet über den
      // Banner „Neue Version verfügbar", damit kein Neuladen mitten im
      // Abspielen oder Importieren passiert.
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Zweite, unabhängige Prüfung vor dem Löschen: install() sollte einen
      // unvollständigen Cache nie bis hierher haben durchkommen lassen, aber
      // erst danach ausgelagerte Cache-Einträge (Speicherdruck) wären sonst
      // unbemerkt und der letzte vollständige Shell-Stand wäre weg.
      const cache = await caches.open(CACHE_NAME);
      const complete = (await Promise.all(SHELL_REQUIRED.map((path) => cache.match(path)))).every(Boolean);
      if (!complete) {
        console.warn('[sw] Shell-Cache unvollständig, alte Caches bleiben stehen');
        await self.clients.claim();
        return;
      }
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('chor-app-shell-') && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: SW_VERSION });
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // die App lädt ohnehin nichts Fremdes

  // Seitenaufrufe immer aus der gecachten index.html bedienen — so startet die
  // App auch offline, egal über welchen Einstieg sie geöffnet wurde.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = await caches.match('./index.html', { ignoreSearch: true });
        if (cached) return cached;
        try {
          return await fetch(req);
        } catch {
          return new Response(
            '<!doctype html><meta charset="utf-8">' +
              '<body style="background:#0f1114;color:#f2f4f7;font-family:sans-serif;padding:24px">' +
              '<h1>Offline</h1><p>Die App ist noch nicht vollständig gespeichert. ' +
              'Bitte einmal mit Internetverbindung öffnen.</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // Übrige Shell-Dateien: erst Cache, dann Netz (und Antwort nachtragen).
  event.respondWith(
    (async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok && res.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
