# BVG — Chor-Übe-App

Installierbare, rein lokale Progressive-Web-App zum Üben mit den
Übe-Aufnahmen des Chores BVG. Kein Backend, kein Konto, keine Telemetrie —
die App selbst stellt keine automatischen Netzwerkanfragen und sendet keine
Daten. Nutzt man die optionale Liedsuche (Lupe im Player), gehen Songtitel
und ggf. Interpret an den gewählten externen Dienst — siehe
[Externe Liedsuche](#externe-liedsuche).

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

## Externe Liedsuche

Die Lupe im Player öffnet eine Suche nach dem aktuellen Song bei einem
selbst gewählten externen Dienst (Tidal, Spotify, Deezer, YouTube oder
Google, einstellbar in den Einstellungen). Dabei gehen Songtitel und, falls
hinterlegt, der Interpret als Suchanfrage an den gewählten Dienst — sonst
nichts. Das passiert ausschließlich bei aktivem Antippen der Lupe, nie
automatisch im Hintergrund. Vor der allerersten Nutzung weist die App
einmalig aktiv darauf hin (kein sich selbst wegklickender Hinweis, sondern
ein Dialog mit echter Wahl).

## Dateiübersicht

- `index.html` — Oberfläche und Styles.
- `app.js` — die gesamte Logik und die Selbsttests, als ES-Modul geladen;
  bewusst weiterhin eine einzige Datei ohne Bundler.
- `boot-guard.js` — zeigt eine Fehlermeldung, falls `app.js` nicht lädt
  (Netzwerkfehler, korrupter Cache) — sonst bliebe nur die leere, aber
  vollständige Oberfläche stehen.
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
Speicher-Warteschlange von Notizen/Liedtexten) laufen automatisch beim Start
und melden sich in der Browser-Konsole — allerdings nur unter `localhost`,
`127.0.0.1`/`[::1]` (lokale Entwicklung) oder mit `?selftest=1` in der URL.
Auf jeder echten Domain, auch der installierten PWA, würden sie sonst
~150 ms auf dem kritischen Pfad vor der ersten Ansicht kosten, ohne dass
dort je jemand die Konsole liest. Manuell überall auslösbar:

```js
chorApp.selfTest()
chorApp.selfTestAsync()
chorApp.selfTestAudioPath()
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
- **Das Original leise darunter.** Beim Anhören eines REC kann der
  Originaltrack an genau der Stelle leise mitlaufen, an der aufgenommen
  wurde (Schalter unter der REC-Liste). Dass beides zusammenpasst, ist
  Rechnerei: Gesungen wurde immer zu einer *früheren* Stelle des Songs, als
  die Aufnahmezeit vermuten lässt — dazwischen liegen die Ausgabelatenz zum
  Kopfhörer (bei Bluetooth 150–300 ms) und der Weg vom Mikrofon zum
  Recorder. Was der Browser davon verrät, misst die App beim Start der
  Aufnahme und legt es zum Anker (`anchor.lat`); den Rest stellt der
  Versatz-Regler nach Gehör ein. Er gilt geräteweit, weil die Latenz am
  Gerät und am Kopfhörer hängt, nicht am Lied.

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

Bei jeder Änderung an `index.html`, `app.js`, `boot-guard.js`, `sw.js` oder
`manifest.json` muss `SW_VERSION` in `sw.js` erhöht werden. Ohne das bekommt
niemand das Update, weil der Shell-Cache unter dem alten Namen bestehen
bleibt.

## Content-Security-Policy

Ein `<meta http-equiv="Content-Security-Policy">` in `index.html` erlaubt nur
noch Skripte von der eigenen Herkunft, `blob:` (für das AudioWorklet-Modul
des Zeitdehners) und `'wasm-unsafe-eval'` (für dessen WASM-Instanziierung);
Styles bleiben inline erlaubt (`'unsafe-inline'`, wegen der `style="…"`-
Attribute im Markup), `<object>`/`<embed>` und `<base>` sind ganz gesperrt.
`frame-ancestors` ist absichtlich nicht Teil davon — über ein Meta-Tag
ohnehin nicht durchsetzbar, GitHub Pages kann keine Header setzen. Ob
Zeitdehner-Worklets zusätzlich `worker-src blob:` brauchen, ist auf echtem
Safari/WebKit noch nicht geprüft (in dieser Umgebung stand kein WebKit zur
Verfügung) — offen, bis das nachgeholt ist.

## Bewusst offene Punkte

- **Keine vollständige Modularisierung.** `app.js` ist weiterhin eine
  einzelne Datei ohne Bundler oder `package.json` — nur aus `index.html`
  ausgelagert, damit die CSP oben überhaupt möglich wurde.
- **Keine CI.** Kein automatisierter Headless-Browser-Testlauf.

## Third-Party

Siehe [`THIRD-PARTY.md`](./THIRD-PARTY.md) für Herkunft, Version und Lizenz
der vendorierten Komponente `lame.min.js` (lamejs/LAME, LGPL-3.0).
