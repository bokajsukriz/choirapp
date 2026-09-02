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

## Mitsingen und aufnehmen zugleich

REC (im Player unter „Loops") und die Wiedergabe laufen unabhängig
nebeneinander: Der Song kann weiterlaufen, während man sich dazu aufnimmt.
Wie gut das klingt, entscheidet allerdings das Betriebssystem, nicht die App.
Drei Punkte dazu:

- **Nur mit Kopfhörern.** Über Lautsprecher landet der Song im Mikrofon;
  das einzige Mittel dagegen wäre die Echo-Unterdrückung des Systems, und
  die bleibt bewusst ausnahmslos aus (`RECORDING_CONSTRAINTS`) — sie ist für
  Telefonate gebaut, dünnt Gesang aus und schneidet leise Stellen weg. Eine
  Aufnahme, die immer roh und unbearbeitet ist, wiegt schwerer als das
  Mitsingen ohne Kopfhörer.
- **Bluetooth-Ausweichen.** Öffnet ein Browser das Mikrofon eines
  Bluetooth-Kopfhörers, schaltet der vom Musik- ins Freisprechprofil: ab da
  laufen *beide* Richtungen mono in Telefonbandbreite (8–16 kHz). Der Song
  klingt dumpf und die Aufnahme erst recht. Gibt es ein eingebautes
  Mikrofon, nimmt die App deshalb das und öffnet das Headset gar nicht erst
  (`preferWideBandMic()`); bleibt nur das Headset, erscheint ein Hinweis
  unter dem REC-Knopf. Zuverlässig gut ist nur eine Kabelverbindung.
- **Ein AudioContext statt zwei.** Die Pegelanzeige hängt am AudioContext
  der Wiedergabe. Ein zweiter, frisch erzeugter Kontext lässt iOS die
  Audio-Hardware neu aushandeln — die laufende Wiedergabe setzt dabei
  hörbar aus.

## Lichtshow

Unter Einstellungen → Lichtshow gibt es vier kleine Bühnen-Einlagen für den
Auftritt: Vollbild-Lichtfarben, die sich nach der eigenen Stimme richten. Die
Handys reden nicht miteinander — es gibt keinen Server, keine Bluetooth- oder
QR-Kopplung —, sondern laufen rein über die Systemuhr synchron: das Bild ist
eine reine Funktion der Zeit (`lightshowFrame()`), auf jedem Gerät identisch.
Damit das funktioniert, sollte „Datum & Uhrzeit automatisch“ im Betriebssystem
eingeschaltet bleiben; ein Sync-Prüfbild in der Ansicht zeigt, ob eine Uhr
grob danebenliegt, und erlaubt einen kleinen manuellen Ausgleich.

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
