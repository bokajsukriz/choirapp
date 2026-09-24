'use strict';

/* ==========================================================================
   BOOT-GUARD — AP-C (ARCHITEKTUR-PLAN.md)

   Läuft als klassisches Script vor <script type="module" src="./app.js">
   und blendet #boot-error ein, falls das Modul nicht lädt (Netzwerkfehler,
   404, korrupter Cache). Ohne das bliebe nach einem gescheiterten
   app.js-Fetch nur die leere, aber vollständige Oberfläche stehen — es lief
   ja nie ein Skript, das etwas anderes anzeigen könnte.

   Absichtlich ein eigenes, winziges Script statt eines Inline-Handlers: die
   neue CSP (siehe <meta http-equiv> in <head>) lässt kein 'unsafe-inline' in
   script-src zu, ein onerror="…"-Attribut am <script>-Tag wäre also blockiert.

   Der Ladefehler eines <script>-Elements ist ein "error"-Ereignis, das NICHT
   nach oben blubbert — nur mit einem Listener in der Einfangphase (dritter
   Parameter true) auf window erreichbar.
   ========================================================================== */
window.addEventListener('error', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLScriptElement)) return;
  if (!/\bapp\.js(?:[?#]|$)/.test(target.src || '')) return;
  const el = document.getElementById('boot-error');
  if (el) el.hidden = false;
}, true);

function showBootError() {
  const el = document.getElementById('boot-error');
  if (el) el.hidden = false;
}

/* Lädt app.js zwar, scheitert aber beim Verknüpfen der Module (z.B. neue
   app.js mit alter strings.js: „does not provide an export named …") oder
   wirft beim ersten Auswerten, gibt es kein Lade-"error" am <script> — nur
   ein ErrorEvent auf window. Solange boot() nicht durch ist
   (window.__chorBooted), zählt jeder solche Fehler aus einem eigenen Skript. */
window.addEventListener('error', (e) => {
  if (window.__chorBooted || !(e instanceof ErrorEvent)) return;
  const file = e.filename || '';
  if (!file.startsWith(location.origin) || !/\.js(?:[?#]|$)/.test(file)) return;
  showBootError();
});

/* Fallnetz, falls gar kein Ereignis kommt: hat das Modul nach 20 s nicht
   einmal angefangen (window.__chorStarted), steht sonst nur die leere
   Oberfläche da. */
setTimeout(() => { if (!window.__chorStarted) showBootError(); }, 20000);

/* „Offline-Kopie neu laden": entfernt Service Worker und App-Shell-Cache und
   lädt frisch aus dem Netz. Songs, Aufnahmen und Einstellungen (IndexedDB)
   bleiben unangetastet. Hier und nicht in app.js — genau dann, wenn app.js
   kaputt ist, muss dieser Weg noch funktionieren. */
async function resetOfflineCopy() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch (err) { console.warn('[boot-guard] unregister', err); }
  try {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('chor-app-shell-')).map((n) => caches.delete(n)));
  } catch (err) { console.warn('[boot-guard] caches', err); }
  location.reload();
}
window.chorResetOfflineCopy = resetOfflineCopy;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('boot-error-reset')?.addEventListener('click', resetOfflineCopy);
});
