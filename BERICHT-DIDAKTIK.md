# Bericht: Didaktik der Übe-Tools

Grundlage: `ARBEITSANWEISUNG-DIDAKTIK.md` (im ersten Commit eingecheckt), dazu die
Regeln aus Abschnitt 1 und 3 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`. Ausgangsstand
`9084059` (= `main` beim Start). Alle acht Pakete sind umgesetzt, keins wurde
zurückgesetzt.

**Branch:** `claude/new-session-65ax3p` statt `didaktik`. Die Sitzungsumgebung
erlaubt nur Pushes auf diesen vorgegebenen Branch. Er zweigt von `9084059` ab,
kein Rebase, kein Merge von `main`, kein Force-Push.

**Zusätzlicher Commit:** `7d4fe8d` entfernt zwei Screenshots, die mit Paket 1
versehentlich eingecheckt wurden (keine Shell-Datei betroffen, daher ohne
`SW_VERSION`-Bump).

## Status

| Paket | Inhalt | Status | Commit | SW_VERSION | Tests (Zahlen) |
|---|---|---|---|---|---|
| 1 | Globales Stimmprofil | umgesetzt | `a22eff1` | v308 | Roundtrip neu/alt/kaputt (7 Fälle); `practiceRange` 4 Stimmen Standard, A 50–75 → 52–73, B 29–62 → 37–60, Spanne < 14 → Standard; alle Übungen × 4 Stimmen im Umfang (auch mit Messung) |
| 2 | Einsingen: Körper, Übungen, Belastung, Programme, eigene Programme | umgesetzt | `3e041a2` | v309 | 36 Übungen × 4 Stimmen × 3 Belastungen (+ Kadenz-Einstimmung): 0 Töne außerhalb; Rückungstabelle 9 Übungen × 4 Stimmen exakt; alle Programm-Rückungen erreicht; Dauer „normal“ 8 Programme × 4 Stimmen innerhalb ±15 %; Roundtrips `load`, `ownPrograms` (inkl. Grenzen 12/20/40) |
| 3 | Rhythmus: Stufen, Phrasen, Auftakt, Bindebögen, Taktarten, Sprache, Zweistimmig | umgesetzt | `1fa7464` | v310 | 6 × 500 Muster: Tickzahl, Bögen nur an Einheitsgrenzen, ≤ 1 Bogen je Takt, 7/8-Gruppen exakt, Schlusston bei 4 Takten, Silben vollständig; 100/100 Zweistimmig-Paare regelkonform; Raster über 12 Runden mit wechselndem Auftakt ohne Überlappung; Einsatzerkennung 7/7 Klatscher, Sperrzeit wirkt; Roundtrip 8 Felder |
| 4 | Hören: Klänge, Schlüsse, Stimmen, Intonation | umgesetzt | `acf53b3` | v311 | 6 Qualitäten × 13 Grundtöne × alle Umkehrungen korrekt; 16 Schlussformeln enden richtig, 0 Parallelen (16 × 12 × 2 Sätze); 500 Linien-Aufgaben: 3 verschiedene Linien, richtige = eigene Stimme; Treppe: ≥ 190/200 Läufe 8–18 Cent (Vorab-Simulation 2000 Läufe: 98,8 %, Median 12,6 Cent); 25 % ± 5 % Kontrollaufgaben |
| 5 | Singen mit Mikrofon | umgesetzt | `b2f485e` | v312 | Treffer-Logik: +20 → Treffer (20 Cent), +60 → kein Treffer (60), −1200 → Treffer mit Oktavhinweis, Vibrato ±50 → Treffer, Stille/unklar → kein Treffer, längster Versuch gemeldet; 5 Modi × 6 Stufen × 4 Stimmen × 40 Aufgaben im Umfang ± 2; a′-Namen/Abstände; Trend −5 Cent/s → −5 ± 0,5; 6 × 1000 Melodien regelkonform |
| 6 | Fortschritt über Tage, einheitliche Stufen | umgesetzt | `336f0f0` | v313 | Roundtrip neu/kaputt/ohne v; 200 Tage → 180; levelHint 17/20 an einem Tag → null, an zwei Tagen → up, 5/12 → down, Hilfe-Aufgaben zählen nicht; gleichzeitige Meldungen zweier „iframes“ vollständig |
| 7 | „Heute üben“ | umgesetzt | `93da70a` | v314 | Planfunktion mit festen Daten: leer, voll, kurz, vor/nach 10 Uhr, Einsingen > 6 Tage, Intonation > 25 Cent, Mikrofon verweigert, deterministisch; Parameter in beiden Tools, falsche Werte ignoriert; `chor-tool-done` aus fremder Quelle/Herkunft ignoriert; neuer Tag → neuer Plan |
| 8 | Groove Lab: Chor-Ansicht, Aufgaben, neue Grooves | umgesetzt | `cebd63f` | v315 | 23 Loops: Schritte im Takt, Bassnoten = Bass, Icons eindeutig; 10 Aufgaben × 5 Stimmwahlen: nur bestehende Felder, `sanitizeState` ändert nichts (außer `droneOn`, s. u.); Terzen pop in C = e, h, c, a; a-Moll cadence V → Gis; Echo: Takt 2 und 4 stumm; Roundtrip `view`, `melodyAltBars`, `choirTask` |

Jedes Paket wurde vor dem Commit so geprüft:
- `node --check` für alle geänderten `.js`-Dateien und die Inline-Skripte der HTML-Seiten.
- Headless-Chromium (Playwright war vorinstalliert, nichts nachinstalliert):
  `chorApp.selfTest()`, `chorApp.selfTestAsync()` (enthält jetzt
  `chorApp.selfTestProgress()`), `chorApp.selfTestMusic()`, dazu
  `einsingen.selfCheck()` und `uebeLab.selfCheck()` — jeweils eigenständig
  und eingebettet in der App. Alle liefern `[]`, keine Seitenfehler.
- Sichtprüfung per Screenshot (390 px Breite) für jede neue Oberfläche,
  Mikrofon-Pfade mit dem Fake-Mikrofon von Chromium.
- Prüfskripte lagen im Scratchpad, nicht im Repo.

## Je Paket

### 1 – Globales Stimmprofil
- **Dateien:** `app.js`, `harmony.js`, `einsingen.html`, `uebe-lab.html`, `index.html`, `strings.js`
- **Geändert:** `settings.voiceProfile` mit `sanitizeVoiceProfile`, `window.chorVoiceProfile` (get/set), Karte „Meine Stimmlage fürs Üben“ / „Belastung beim Einsingen“ / „Eigener Umfang … (gemessen am …)“ mit „Auf Standard zurücksetzen“; `PRACTICE_RANGES`/`practiceRange` in `harmony.js`; Einsingen nutzt beides, ein Stimm-Chip schreibt ins Profil; Stimm-Tuner: „Als meinen Umfang speichern“ ab 14 Halbtönen.
- **Abweichungen:** „Einstellungen → Tools“ ist seit `026cdd2` der eigene Tools-Reiter — die Karte steht dort über den Kacheln. Das Profil wandert auch in Sicherungen mit (`sanitizeSettingsPatch`). Ist ein gemessener Umfang eng (12–13 Halbtöne), rückt das Einsingen die Startlage nach unten; die Koloratur (14 Halbtöne Umfang) kann dann den Innenbereich um bis zu 2 Halbtöne überschreiten (siehe „Zu entscheiden“).

### 2 – Einsingen
- **Dateien:** `einsingen.html`
- **Geändert:** Übungsart „Körper“ (Anweisung groß, Countdown-Ring, leiser Glockenton je Wechsel, Tempo fest 60, Regler gesperrt), drei Körperübungen, neun gesungene Übungen, `alt`-Feld und `forceDrone`; Belastung (`LOADS`, leichte Fassungen von Koloratur und Oktavsprung als eigene Varianten mit gleicher ID und gleichem gemerkten Tempo); sechs neue Programme mit Untertitel; eigene Programme mit Editor (Name, Rückungen 1–7/alle, Richtung, ↑ ↓ ×, gruppierte Übungsliste, Dauer, Höhe-Hinweis, Löschen mit Rückfrage), Menü „⋯“ je Karte mit „Als Vorlage kopieren“ bzw. „Bearbeiten“.
- **Abweichungen:** Dauer „Intonation / leicht“ ergibt 6,8 statt 5,8 min (Prüfung laut Anweisung nur für „normal“; alle anderen Werte liegen auch bei leicht/kräftig in ±15 %). Ein eingeschalteter Liegeton klingt auch während Körperübungen weiter (bewusst gewählter Schalter).

### 3 – Rhythmus
- **Dateien:** `uebe-lab.html`
- **Geändert:** Taktarten 2/4, 2/2, 5/4, 7/8 (additive Bausteine je Gruppe); Phrasen aus 1/2/4 Takten mit Schlusston, Auftakt nach Volltakt-Regel mit Einzähler bis zum Auftakt, Bindebögen; Stufen 1–6 im neuen einheitlichen Stufen-Element; Rhythmussprache `ta`/`count`; Eingabe per Mikrofon mit Einsatzerkennung und eigener Latenz-Einmessung (`micLatencyMs`); Modus „Zweistimmig“ mit Holzblock hoch/tief und Umschalter obere/untere Stimme. Der Scheduler läuft jetzt auf einem absoluten Tick-Raster, damit das Metrum über Runden mit unterschiedlichem Auftakt erhalten bleibt (zwischen zwei Runden läuft ggf. eine Ausgleichspause mit Klick). Mehrzeiliges Notenbild mit Taktstrichen, Schlussstrich, Bögen und Silben.
- **Abweichungen:** Der Schalter „Auftakt“ in der eigenen Auswahl bedeutet wie in den Stufen „Auftakt möglich“ (40 %). Im 7/8 endet eine viertaktige Phrase mit zwei gebundenen Vierteln statt einer Halben, damit die Gruppen 2+2+3 exakt bleiben. Das gemeinsame `micOn(consumer)` ersetzt das bisherige `micOn()` (Tuner, Rhythmus, Singen teilen es); die Aufnahme-Einstellungen stehen als `RECORDING_CONSTRAINTS` auch in `uebe-lab.html`.

### 4 – Hören
- **Dateien:** `uebe-lab.html`
- **Geändert:** Modi Intervalle · Klänge · Schlüsse · Akkordfolgen · Stimmen · Intonation, je Modus Stufen und Zähler; Intervall-Stufe 6 „Alle Richtungen“ (`intervalLevel`, alte Stände werden abgeleitet); Klänge mit Dur/Moll-Vergleich; Schlüsse mit Begründungssatz; Stimmen (Kandidaten antippen, „Antworten“, Hilfe „meine Stimme lauter“ zählt als „mit Hilfe“); Intonation mit Sägezahn/Tiefpass ohne Hall, Treppe je Stufe (gespeichert), Schwelle nach sechs Umkehrpunkten. Antworttasten ≥ 44 px, Ziffern 1–9, `aria-live`.
- **Abweichungen:** „Zwei Töne zusammen“ und Oktave/Quinte: der zweite Ton setzt 0,5 s nach der Referenz ein, damit klar ist, welcher gemeint ist. Die weite Lage in „Stimmen“ Stufe 6 legt den Tenor eine Oktave tiefer, sofern er dann noch über dem Bass liegt. Fehlertexte „Leider nein“ → „Noch nicht“.

### 5 – Singen mit Mikrofon
- **Dateien:** `uebe-lab.html`
- **Geändert:** Reiter „Singen“ mit Modus-Chips; `makePitchJudge`, `holdStats`, Melodie-Generator mit Sprungregel; Intervalle singen (Gewichtung `singLog`, Hilfe „do → mi“), Ton finden (Akkord, Kadenz, nur a′ mit Namen wie „d′ – die Quinte unter a′“), Ton halten (Lage, Ruhe, Trend, Drift beim Lauterwerden), Blattsingen (Silben/Stufenzahlen, Notenzeile mit passendem Schlüssel und Vorzeichen, „Ton überspringen“), Diktat (Silbentasten, bis zu dreimal hören). Mikrofon aus bei Reiter-/Moduswechsel und verdeckter Seite.
- **Abweichungen:** Blattsingen/Diktat meiden Ges-Dur: `spell()` in `harmony.js` schreibt dort „H“ statt „Ces“, die Note stünde auf der Notenzeile falsch. „Zu wenig Ton erkannt“ beim Halten, wenn unter 15 % der erwarteten Messwerte vorliegen.

### 6 – Fortschritt
- **Dateien:** `app.js`, `uebe-lab.html`, `einsingen.html`, `index.html`, `strings.js`, `README.md`
- **Geändert:** `window.chorProgress` (add, summary, levelHint, memory; dazu today/setToday/flush für Paket 7), meta-Datensatz `progress`; Meldungen aus allen Bereichen (mit Sekunden seit der letzten Meldung, höchstens 2 min); Intervall-Gewichtung jetzt dauerhaft; Stufenvorschläge in allen Stufen-Elementen; Wochenansicht „Diese Woche“.
- **Abweichungen:** Für `levelHint` speichert der Fortschritt zusätzlich die letzten 40 Aufgaben je Bereich (Datum, Stufe, richtig, Hilfe) — aus Tagesaggregaten allein lässt sich „die letzten 20“ nicht bestimmen. `micDenied` liegt unter `memory`.

### 7 – Heute üben
- **Dateien:** `app.js`, `uebe-lab.html`, `einsingen.html`, `index.html`, `strings.js`
- **Geändert:** Karte mit Umschalter, Schritte mit Haken und „überspringen“; Planfunktion; Übergabe per URL-Parametern; Leiste „Heute üben: 3 von 10 Aufgaben“ und „Fertig ✓ – weiter mit Heute üben“ in den Tools; `chor-tool-done` mit Herkunfts- und Quellenprüfung.
- **Abweichungen:** Übersprungene Schritte stehen in `today.skipped`. Beim Rhythmus stoppt der Lauf nach der sechsten Runde. Die Parameter setzen Stufe und Modus wie eine normale Auswahl — sie werden also als zuletzt benutzt gemerkt.

### 8 – Groove Lab
- **Dateien:** `groove-lab.js`, `app.js`, `strings.js`
- **Geändert:** Umschalter Chor · Studio, Chor-Ansicht, zehn Aufgaben, Anzeige „Jetzt“, „Beat ausblenden/zurück“, `melodyAltBars` (auch als Studio-Schalter), drei neue Grooves, Test-Export.
- **Abweichungen:** Tempo liegt in beiden Ansichten in der Fußleiste (kein zweiter Regler). `groove: null` („Tonleiter zum Liegeton“) stellt Drums und Bass stumm. `droneOn` wird wie bisher nie aus einem gespeicherten Stand übernommen — die Prüfung „sanitize ändert nichts“ nimmt dieses Feld aus. Die in der Anweisung genannten „bestehenden Loop-Prüfungen“ gab es nicht; sie sind jetzt neu in `runMusicSelfTests`. Wer die Stimme im Profil nicht gesetzt hat, wählt sie in der Aufgabenkarte; sie wird dann ins Profil geschrieben.

## Zu entscheiden

- Soll „Heute üben“ auch auf der Startseite der App erscheinen?
- Soll das Blattsingen später einen festen Rhythmus prüfen (heute bewusst nicht)?
- Soll die Aufgabe „Singe die Terz“ per Mikrofon bewertet werden?
- Enger gemessener Umfang (12–13 Halbtöne): Koloratur weglassen oder den Umfang dafür ausnahmsweise überschreiten (heute: leicht überschritten)?
- `spell()` in `harmony.js` kennt kein Ces/Fes/Eis/His. Ausbauen (dann Ges-Dur im Blattsingen wieder zulassen)?
- Dauer „Intonation / leicht“ weicht von der Tabelle ab (6,8 statt 5,8 min) — Programm kürzen oder Tabelle anpassen?
- „𝅗𝅥 = …“ (2/2) nutzt ein Unicode-Zeichen, das nicht jede Schrift kennt; ggf. „Halbe = …“ schreiben.
- Soll die Chor-Ansicht einen eigenen Tempo-Regler bekommen oder die Fußleiste genügen?

## Manuell auf echten Geräten prüfen

- Mikrofon-Einsatzerkennung beim Klatschen auf iOS und Android (Schwelle +12/+6 dB, 90 ms Sperrzeit), auch beim Sprechen von „ta“.
- Latenz-Kalibrierung mit Bluetooth-Kopfhörern (Tippen und Mikrofon getrennt).
- Tonhöhenerkennung bei Männerstimmen unter 100 Hz (Ton halten, Ton finden im Bass).
- Lesbarkeit der Chor-Ansicht auf kleinen Bildschirmen (320 px), besonders das Mundschlagzeug-Raster.
- Darstellung von 𝄞, 𝄢 und 𝅗𝅥 in den System-Schriften (iOS, Android, Windows).
- Hörtest: Holzblöcke im Zweistimmig-Modus, Glockenton der Körperübungen, Sägezahn-Intonation (Schwebungen hörbar?), Gospel Shuffle / Swing Ride / Vocal Perc Basic.
- „Heute üben“ einmal komplett durchgehen: Haken nach Einsingen, Hören, Singen, Rhythmus; am nächsten Tag neuer Plan.
- Mikrofon verweigern → am Folgetag erscheint im Plan das Diktat.

## Nachträge nach Rückmeldung

| Änderung | Umsetzung |
|---|---|
| Nicht gendern | Alle sichtbaren Texte ohne Doppelformen: „tiefe/hohe Stimmen“ statt „Männer-/Frauenstimmen“, „Laiensänger“, „Sängern“, polnisch „samodzielnie“ statt „sam(a)“; README ebenso. |
| Tools per Wischgeste schließen | Beim Öffnen legt die App einen eigenen Verlaufseintrag an: die Zurück-Geste bzw. -Taste (Android) schließt nur das Tool. Zusätzlich Wischen vom linken Rand nach rechts in allen Tool-iframes und im Groove Lab (nicht auf Tastaturen, Reglern, Tipp-Flächen). X, Esc und Wischen hinterlassen keinen verwaisten Verlaufseintrag. |
| Piano im Querformat auf Android | Ursache: das Manifest hält die installierte App im Hochformat, Android dreht dann nicht mit. Das Piano öffnet jetzt im Vollbild mit Querformat-Sperre, beim Schließen wieder frei. |
| „Meine Stimme“/„Belastung“ aus dem Tools-Reiter entfernt | Die Karte ist weg; Stimme und Belastung stellt man im jeweiligen Tool ein, sie gelten weiter übergreifend (Stimmprofil). Den gemessenen Umfang setzt der Stimm-Tuner. |
| Einsingen: Einstellungen hinter Zahnrad | Stimme, Begleitung, Belastung, Einzähler, Einstimmung und die Programmlängen liegen in einem Blatt hinter dem Zahnrad in der Knopfleiste. |
| Einsingen: Pausen straffer | Zwischen zwei Übungen ein halber statt ein ganzer Takt; Runden enden auf halben Takten (Akkord auf 1 oder 3) statt auf ganzen. Programme dadurch rund 10–15 % kürzer (z. B. Morgens 5,7 → ca. 5 Min., Höhe 8,9 → ca. 8 Min.). |
| Länge von „Kurz“/„Ausführlich“ | Einstellbar 3/5/7 bzw. 10/15/20 Minuten (Standard 5 und 10); die Rückungen je Übung werden gemeinsam skaliert, notfalls fallen Übungen aus der Mitte weg. Geprüft: alle Längen × 4 Stimmen innerhalb ±20 %. |
| Rhythmus immer endlos, Leertakte im Einstellungsmenü | Rundenwahl entfällt (gespeicherte Werte werden ignoriert); Leertakte samt Erklärung im Zahnrad-Blatt, die Zusammenfassung nennt sie. |
| Statistik übersichtlicher | Karte „Dein Stand“: Punkte Mo–So, Einsing-Minuten der Woche, je geübtem Bereich ein Strahl aus sechs Feldern mit der aktuellen Stufe. |
| Vier Schnellstarts statt „Heute üben“ | Einsingen 5 Min („Kurz“ auf 5 Min gebracht) und 10 Min („Ausführlich“ auf 10 Min), jeweils mit der zuletzt geübten Stimme; Hören (10 Intervalle, 10 Klänge, 6 Akkordfolgen, 6 Schlüsse, 10 Intonation) und Singen (8 Intervalle singen, 8 Ton finden, 4 Ton halten, 4 Blattsingen; ohne Mikrofon-Erlaubnis Diktat) — jede Übung auf ihrer zuletzt benutzten Stufe, Weiterschalten automatisch, Leiste mit Fortschritt. „Heute üben“ (Planfunktion, Karte, `chor-tool-done`) ist entfernt. |
