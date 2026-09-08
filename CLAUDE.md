# Chor-Übe-App — Hinweise für Claude Code

Static PWA, kein Build-Schritt, kein Bundler, kein `package.json`. Details,
Architektur und Datenflüsse: siehe `README.md`. Kurzüberblick der Dateien
dort unter „Dateiübersicht".

## Failsafe: SW_VERSION bumpen

**Vor jedem Commit prüfen:** wurde eine der folgenden Dateien geändert?

`index.html`, `app.js`, `lightshow.js`, `strings.js`, `zip-reader.js`,
`groove-lab.js`, `signalsmith-stretch.js`, `boot-guard.js`, `lame.min.js`,
`manifest.json`, `icon-192.png`, `icon-512.png`, `sw.js` selbst

(maßgeblich ist immer `SHELL_REQUIRED`/`SHELL_OPTIONAL` in `sw.js` — dort
nachsehen, falls diese Liste veraltet wirkt.)

Falls ja: `SW_VERSION` in `sw.js` in derselben Änderung erhöhen (z.B. `v182`
→ `v183`). Ohne das bekommt niemand das Update, weil der Service Worker den
Shell-Cache unter dem alten Namen weiterverwendet — die Änderung geht
für Nutzer:innen bis zum nächsten zufälligen Cache-Miss verloren.

Das gilt für jeden Commit, der eine dieser Dateien anfasst — nicht nur für
den ersten in einer PR. Vor `git commit` also: `git diff --cached --stat`
gegen diese Liste prüfen.

## Sonst

- Keine neuen Abhängigkeiten, kein Bundler, keine Build-Pipeline einführen —
  bewusste Design-Entscheidung (siehe README).
- Selbsttests laufen im Browser über `runSelfTests()` in `app.js` (kein
  separater Testrunner, kein CI). Reine Funktionen wie `lightshowFrame()`
  lassen sich aber per `node --input-type=module -e "import ... from
  './lightshow.js'"` isoliert und schnell prüfen, ohne den Browser zu
  starten — bei `lightshow.js`-Änderungen zuerst so gegenprüfen (Determinismus,
  gültiges `#rrggbb`, WCAG-2.3.1-Blitzgrenze: max. 3 steigende
  Helligkeits-Übergänge über 0,5 je 1000-ms-Fenster — siehe Test 5 in
  `runSelfTests()`), bevor die App im Browser läuft.
- `lightshow.js` ist bewusst ein reines Blatt (kein DOM, kein `Date.now()`,
  kein `Math.random`, keine Imports zurück nach `app.js`) — jede Show ist
  `Farbe = f(Zeit, Stimme, Seed)`. Neuer Zufall gehört als deterministischer
  Hash rein (`lightshowHash`), nicht als `Math.random`.
- Ändert sich `lightshowFrame()`s Verhalten, auch die Vorschau-Kacheln in
  `app.js` (`LIGHTSHOW_PREVIEW_POINTS`/`paintLightshowPreviews`) mitziehen —
  die rufen dieselbe Funktion separat auf und laufen sonst auseinander.
- Einstellungen (`settings`) liegen in IndexedDB (`DB.metaGet`/`metaPut`),
  nicht `localStorage` — der ist nur für Fehler-/Diagnose-Log reserviert.
- Auf `*-PLAN.md` verweisende Kommentare (z. B. „siehe LICHTSHOW-PLAN.md")
  sind oft Verweise auf längst gelöschte Planungsdokumente — nicht danach
  suchen, sie existieren im Repo nicht mehr.
