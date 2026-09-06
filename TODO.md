# TODO

Stand: 2026-09-06. Ersetzt `MARKDOWN-HANDOVER.md` und die früheren
Planungsdokumente (siehe Git-Historie für deren Inhalt).

## Offen

- [ ] **Stottern nach einem Titelwechsel im gedrosselten Hintergrund
  diagnostizieren.** Auf einem echten Android-Gerät HD bei etwa `0,6×` laufen
  lassen, den Bildschirm ausschalten und einen Titelwechsel abwarten. Danach
  das Diagnose-Log auf `audio:waiting`, `audio:stalled`, `audio:suspend`,
  `aheadS` und `audio:health` prüfen. Erst anhand dieses Logs entscheiden, ob
  das Vorladen des nächsten Titels nötig ist. Nicht auf Verdacht am
  Audiographen weiterbauen: Der bislang beobachtete Einbruch im Hintergrund
  und das anschließende Stottern bei `1,0×` sind zwei verschiedene Effekte.
  Erfordert Tests auf echter Hardware und kann nicht aus einer
  Remote-Ausführungsumgebung heraus erledigt werden.

## Optionaler Backlog

Ausdrücklich außerhalb des obigen Auftrags — keine belegten Fehler, nur Ideen:

- Headless-Browser-CI und verbindliche CI-Gates.
- Weitere Modularisierung von `app.js` über die bereits ausgelagerten
  Blattmodule (`lightshow.js`, `strings.js`, `zip-reader.js`) hinaus; ein
  Komplettumbau und ein Bundler sind nicht automatisch das Ziel.
- Weitergehende CSP-/Hosting-Header, SBOM-/Paket-Werkzeuge, natives
  `<dialog>` und ein IndexedDB-Migrations-/Rollbackkonzept jeweils separat
  bewerten.
