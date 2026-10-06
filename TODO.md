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

- [ ] **Groove Lab: Hörprobe und Geräte-Test des Samplers und der neuen Klänge.**
  Nicht aus der Remote-Umgebung möglich: iPhone Safari und Android Chrome —
  Aufnahme mit Kabel-Kopfhörern, Bluetooth-Hinweis, Wiedergabe nach App-Neustart,
  „Alle Daten löschen“ entfernt die Samples, Offline-Start; außerdem Hörprobe von
  Limiter (Pumpen 0/hoch), Sample-Kit, Hi-Hat-Akzenten, Fills, Finger-Bass,
  Pop-Satz, Chor/Klavier und den Umkehrungen/Zwischendominanten
  (`ARBEITSANWEISUNG-GROOVE-LAB-KLANG-UND-SAMPLER`, im Bericht unter `docs/archiv/`).
- [ ] **Sampler: Loops im Tempo strecken.** v1 spielt Loops nur im Aufnahmetempo
  ±3 %. Mit `signalsmith-stretch.js` einmal je Tempo offline auf die neue Länge
  rendern und cachen (Tonhöhe bleibt) — größerer Umbau, nicht auf Verdacht.
- [ ] **Fingerschnipser-Sample (`snap`).** VCSL enthält keinen; „Halftime Pop“
  klingt dort mit Synthese. Nur mit einer Quelle mit geklärter Lizenz ergänzen
  (`samples/aufbereiten.sh`, `samples/LIZENZ.md`, `LAB_DRUM_FILES`).

## Optionaler Backlog

Ausdrücklich außerhalb des obigen Auftrags — keine belegten Fehler, nur Ideen:

- Headless-Browser-CI und verbindliche CI-Gates.
- Weitere Modularisierung von `app.js` über die bereits ausgelagerten
  Blattmodule (`lightshow.js`, `strings.js`, `zip-reader.js`) hinaus; ein
  Komplettumbau und ein Bundler sind nicht automatisch das Ziel.
- Weitergehende CSP-/Hosting-Header (die Tool-Seiten haben seit v500 eine
  eigene CSP, noch mit `'unsafe-inline'` für Skripte), SBOM-/Paket-Werkzeuge, natives
  `<dialog>` und ein IndexedDB-Migrations-/Rollbackkonzept jeweils separat
  bewerten.
