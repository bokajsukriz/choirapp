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
  separater Testrunner). Reine Funktionen wie `lightshowFrame()` lassen sich
  aber auch per `node --input-type=module -e "import ... from './lightshow.js'"`
  isoliert prüfen.
