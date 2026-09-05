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
