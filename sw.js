/* ==========================================================================
   SERVICE WORKER — Chor-Übe-App
   Aufgabe: die App-Shell (HTML, Manifest, Icons) im Cache Storage halten,
   damit die App im Flugmodus und vom Home-Bildschirm startet.

   WICHTIG: Der Service Worker fasst IndexedDB niemals an. Beim Aktivieren
   werden ausschließlich alte *Cache-Storage*-Einträge gelöscht — die Songs,
   Loops und Playlisten des Nutzers bleiben bei jedem Update erhalten.
   ========================================================================== */

// Bei jeder Änderung an einer Datei aus SHELL_REQUIRED oder SHELL_OPTIONAL
// weiter unten erhöhen — nicht nur bei index.html/sw.js/manifest.json (siehe
// die ausführlichere Failsafe-Regel in CLAUDE.md). Daraus leitet sich der
// Cache-Name ab; ein neuer Name = frischer Shell-Cache.
const SW_VERSION = 'v218';
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
  './app.js',
  './lightshow.js',
  './strings.js',
  './zip-reader.js',
  './groove-lab.js',
  './signalsmith-stretch.js',
];
// Kürteil: fehlt eine davon, bleibt die App trotzdem offlinefähig — der
// MP3-Export bzw. eine Icon-Variante fehlt dann einmalig, bis das nächste
// Update sie nachträgt. boot-guard.js gehört hierher, nicht in den
// Pflichtteil: fehlt es, bleibt bei einem gescheiterten app.js-Fetch nur die
// Fehlermeldung aus (siehe AP-C in ARCHITEKTUR-PLAN.md) — nicht schön, aber
// kein Totalausfall wie bei einer der Dateien oben.
const SHELL_OPTIONAL = [
  './boot-guard.js',
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

/** Ob `name` alle SHELL_REQUIRED-Einträge enthält. */
async function isCacheComplete(name) {
  const cache = await caches.open(name);
  const hits = await Promise.all(SHELL_REQUIRED.map((path) => cache.match(path)));
  return hits.every(Boolean);
}

// Pro Worker-Instanz einmal ermittelt (siehe resolveActiveShellCacheName) —
// KEIN eigener Persistenzmechanismus nötig: Cache Storage überlebt einen
// Worker-Neustart, dieses Modul-Level-Memo nicht. Nach einem Neustart läuft
// das sw.js-Skript von vorn durch, `activeShellCachePromise` ist wieder
// `null`, und der nächste Aufruf wertet Cache Storage frisch aus — dieselbe
// Quelle, die auch vorher schon galt. Die Auswahl ist also allein durch
// Cache Storage bestimmt, nie durch etwas, das einen Neustart nicht überlebt.
let activeShellCachePromise = null;

/**
 * Liefert EINEN vollständig geprüften Shell-Cache-Namen, der für JEDE
 * Anfrage dieser Worker-Instanz gilt — nie eine pro Datei unabhängig
 * getroffene Wahl. Ein früherer Rückfall (matchAnyShellCache) prüfte jede
 * Datei einzeln gegen mehrere Caches und konnte so index.html aus einer
 * älteren, vollständigen Version mit app.js aus einer neueren, unvollständigen
 * Version mischen — genau der Versionsversatz, den die AP-C-Invariante
 * eigentlich verhindern soll (reproduziert: neuer Cache mit app.js, aber ohne
 * index.html; alter Cache vollständig → altes index.html + neues app.js).
 *
 * Ist CACHE_NAME vollständig, ist es die aktive Shell — der Normalfall.
 * Sonst wird unter den übrigen chor-app-shell-*-Caches (neueste zuerst,
 * absteigend sortiert — der Name trägt SW_VERSION) der erste vollständige
 * genommen; das ist praktisch immer genau der eine, den activate() für
 * diesen Fall bewusst stehen lässt. Existiert gar kein vollständiger Cache,
 * bleibt CACHE_NAME die einzig sinnvolle Wahl (auch unvollständig) — ohne
 * das gäbe es keinen Cache-Namen zum Lesen.
 */
function resolveActiveShellCacheName() {
  if (!activeShellCachePromise) {
    activeShellCachePromise = (async () => {
      if (await isCacheComplete(CACHE_NAME)) return CACHE_NAME;
      console.warn('[sw] Shell-Cache unvollständig, weiche auf älteren vollständigen Stand aus');
      const names = (await caches.keys())
        .filter((n) => n.startsWith('chor-app-shell-') && n !== CACHE_NAME)
        .sort()
        .reverse();
      for (const name of names) {
        if (await isCacheComplete(name)) return name;
      }
      return CACHE_NAME;
    })();
  }
  return activeShellCachePromise;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // die App lädt ohnehin nichts Fremdes

  // Seitenaufrufe immer aus der gecachten index.html bedienen — so startet die
  // App auch offline, egal über welchen Einstieg sie geöffnet wurde. Mit
  // cacheName statt eines globalen caches.match(): ohne das würde über ALLE
  // Caches gesucht, nicht nur die aktive Shell — bei einer einzigen Datei
  // folgenlos, aber seit app.js dazugehört (AP-C) müssen index.html und
  // app.js aus demselben Cache-Stand kommen, sonst droht Versionsversatz
  // zwischen beiden. resolveActiveShellCacheName() ist genau deshalb EIN
  // für die ganze Worker-Instanz fester Name, nicht pro Datei neu gewählt.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const activeCacheName = await resolveActiveShellCacheName();
        const cached = await caches.match('./index.html', { cacheName: activeCacheName, ignoreSearch: true });
        if (cached) return cached;
        // Eine ausgewählte ältere Shell niemals mit Bytes der aktuellen,
        // unversionierten Deployment-URL mischen. Erst ein vollständig
        // installierter neuer Cache darf die Release-Grenze wechseln.
        if (activeCacheName !== CACHE_NAME) {
          return new Response(
            '<!doctype html><meta charset="utf-8"><h1>App-Update erforderlich</h1>'
              + '<p>Die gespeicherte App-Version ist unvollständig. Bitte mit Internetverbindung neu laden.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          );
        }
        try {
          const res = await fetch(req);
          // Erfolgreiche Online-Erholung nach einem Cache-Miss nur „repariert"
          // die aktuelle Sitzung, nicht die Offlinefähigkeit — ohne diesen
          // Nachtrag unter dem kanonischen Schlüssel fehlt index.html beim
          // nächsten Offline-Start wieder (Befund F-07). Nachgetragen wird in
          // die gerade aktive Shell (nicht immer CACHE_NAME), damit eine
          // Reparatur nie eine andere Version als die gewählte anfasst. Der
          // Schreibfehler (z.B. Kontingent voll) darf die Antwort selbst
          // nicht verhindern.
          if (res && res.ok) {
            try {
              await (await caches.open(activeCacheName)).put('./index.html', res.clone());
            } catch (err) { console.warn('[sw] konnte index.html nicht nachtragen:', err); }
          }
          return res;
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
  // cacheName aus demselben Grund wie oben bei index.html.
  event.respondWith(
    (async () => {
      const activeCacheName = await resolveActiveShellCacheName();
      const cached = await caches.match(req, { cacheName: activeCacheName, ignoreSearch: true });
      if (cached) return cached;
      if (activeCacheName !== CACHE_NAME) {
        return new Response('', { status: 504, statusText: 'Shell version unavailable' });
      }
      try {
        const res = await fetch(req);
        if (res && res.ok && res.type === 'basic') {
          // Nachtragen erst abwarten (F-07): ohne await darf der Worker schon
          // vor dem Commit des Caches idle werden, der Nachtrag bliebe dann
          // unzuverlässig zwischen zwei Fetches hängen. Auch hier in die
          // aktive Shell, nicht fest in CACHE_NAME (siehe oben).
          try {
            await (await caches.open(activeCacheName)).put(req, res.clone());
          } catch (err) { console.warn('[sw] konnte Antwort nicht nachtragen:', req.url, err); }
        }
        return res;
      } catch (err) {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
