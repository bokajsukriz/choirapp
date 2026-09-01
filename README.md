# BVG — Chor-Übe-App

Installierbare, rein lokale Progressive-Web-App zum Üben mit den
Übe-Aufnahmen des Chores BVG. Kein Backend, kein Konto, keine Telemetrie —
die App stellt keinerlei Netzwerkanfragen und sendet keine Daten.

## Daten und Speicherorte

Alles bleibt auf dem Gerät:

- **IndexedDB (`chor-app`)** — Songs, Aufnahmen, Loops, Notizen, eigene
  Liedtexte, Setlisten und Einstellungen, jeweils in den Stores `files`
  (Audio-/PDF-Bytes) und `meta` (alles Übrige).
- **`localStorage`** — Fehlerprotokoll (`bvg-error-log`) und Diagnose-Log
  (`bvg-debug-log`), je bis zu einer festen Anzahl Einträge.
- **Cache Storage** — die App-Shell (`index.html`, `sw.js`, `manifest.json`,
  Icons), verwaltet vom Service Worker.

„Alle Daten löschen“ in den Einstellungen entfernt IndexedDB vollständig
sowie Fehler- und Diagnoseprotokoll. Dateien in einer verbundenen Dropbox
bleiben davon unberührt — die App greift nie direkt auf Dropbox zu, sondern
nur auf lokal heruntergeladene ZIP-Archive.

## Dateiübersicht

- `index.html` — die gesamte App: Oberfläche, Logik, Styles und die
  Selbsttests, bewusst in einer Datei ohne Build-Schritt.
- `sw.js` — Service Worker (App-Shell-Cache, Offline-Betrieb).
- `groove-lab.js` — nachgeladenes Easter Egg, kein Teil der eigentlichen App.
- `lame.min.js` — vendorierter MP3-Encoder (siehe [Third-Party](#third-party)).
- `manifest.json`, `icon-192.png`, `icon-512.png` — PWA-Manifest und Icons.

## Lokal starten

Kein Build-Schritt, keine Abhängigkeiten. Ein einfacher HTTP-Server genügt —
`file://` funktioniert wegen Service Worker und Modulpfaden nicht:

```sh
python3 -m http.server
```

Danach `http://localhost:8000` im Browser öffnen.

## Selbsttests

`runSelfTests()` (synchron) und `runAsyncSelfTests()` (asynchron, prüft die
Speicher-Warteschlange von Notizen/Liedtexten) laufen bei jedem Start
automatisch und melden sich in der Browser-Konsole. Manuell auslösen:

```js
chorApp.selfTest()
chorApp.selfTestAsync()
```

Geprüft wird alles, was ohne Browser-Automatisierung möglich ist (Datei- und
Titelerkennung, Speicher-Warteschlangen, Aufräumlogik). Fokusreihenfolge,
Kontrast im echten Rendering, Quota-Verhalten und Service-Worker-Updates
lassen sich nur manuell im Browser prüfen.

## Wichtige Regel für Änderungen

Bei jeder Änderung an `index.html`, `sw.js` oder `manifest.json` muss
`SW_VERSION` in `sw.js` erhöht werden. Ohne das bekommt niemand das Update,
weil der Shell-Cache unter dem alten Namen bestehen bleibt.

## Bewusst offene Punkte

- **Keine Content-Security-Policy.** Die App lädt keinerlei Fremdressourcen
  und hat kein Backend; ohne eine Auslagerung des vollständig inline
  liegenden Codes bräuchte jede CSP weiterhin `'unsafe-inline'` und brächte
  kaum Schutz.
- **Keine Modularisierung.** `index.html` bleibt bewusst eine einzelne Datei
  ohne Bundler, ES-Module oder `package.json`.
- **Keine CI.** Kein automatisierter Headless-Browser-Testlauf.

## Third-Party

Siehe [`THIRD-PARTY.md`](./THIRD-PARTY.md) für Herkunft, Version und Lizenz
der vendorierten Komponente `lame.min.js` (lamejs/LAME, LGPL-3.0).
