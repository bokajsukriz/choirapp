# Bericht: Nachsingen und „Im Takt“

Grundlage: `ARBEITSANWEISUNG-NACHSINGEN.md` (im ersten Commit eingecheckt), dazu
die Regeln aus Abschnitt 1 von `ARBEITSANWEISUNG-DIDAKTIK.md` und
`ARBEITSANWEISUNG-CLAUDE-CODE.md`. Ausgangsstand `890bb49` (= `main` beim
Start; die Didaktik ist dort schon gemergt). Alle fünf Pakete sind umgesetzt,
keins wurde zurückgesetzt.

**Branch:** `claude/new-session-8bm20y` statt `nachsingen`. Die
Sitzungsumgebung erlaubt nur Pushes auf diesen vorgegebenen Branch. Er zweigt
von `890bb49` ab, kein Rebase, kein Merge, kein Force-Push.

**Fehlende Voraussetzung:** Didaktik Paket 7 („Heute üben“) gibt es im
Ausgangsstand nicht mehr — laut `BERICHT-DIDAKTIK.md` („Nachträge“) wurde es
durch vier Schnellstarts ersetzt. Der Teil „Heute üben“ in Paket 5 hängt
deshalb am Singen-Schnellstart („Gemischt üben“ bzw. `?from=quick&tab=voice`),
siehe Paket 5. Alle anderen Voraussetzungen (Stimmprofil/`practiceRange`,
`makePattern` mit Takten/Auftakt/Bögen, Reiter „Singen“ mit
`makePitchJudge`/`SIGHT_LEVELS`, Fortschritt mit Stufen-Element) waren da.

## Status

| Paket | Inhalt | Status | Commit | SW_VERSION | Tests (Zahlen) |
|---|---|---|---|---|---|
| 1 | Auswertung (`segmentNotes`, `globalOffset`, `align`, `scoreEcho`) | umgesetzt | `a186c3f` | v331 | Simulation Anhang B, Startwert 1, je Fall 100 Durchläufe: ♩ = 80 Viertel — sauber 95, ausgelassen 99, Halbton daneben 97, Oktave tiefer 99, verschoben 99 von 100; ♩ = 84 Achtel — 99 / 100 / 99 / 99 / 100; Einsatzfehler-Median 11–13 ms (Schwelle 25). Leere Rahmen → alle `missing`; Stille/Klicks → 0 Töne |
| 2 | Melodien mit Rhythmus | umgesetzt | `d461eeb` | v332 | 12 Stufen × 1000 Melodien (Stimmen reihum S/A/T/B): 0 Fehler bei Tonvorrat, Sprungregel, Schluss (Ton, Länge, Zählzeit), Triolen/5/4/7/8, Tickzahl, Umfang, Tonwiederholungen, Frage-Antwort; Moll-Anteil Nachsingen 6 in 40–60 %, Im Takt 6 immer Moll |
| 3 | Modus „Nachsingen“ | umgesetzt | `da22f65` | v333 | Ablauf mit eingespeisten Rahmen: 8 Befunde (sauber, Oktave tiefer/höher, +2 und −1 Halbton verschoben, Ton fehlt, Ton zu hoch, nichts erkannt) mit richtigem Satz, Rahmen danach verworfen; „zu tief“, Transposition „3 Halbtöne“; Grafik-Klassen; „Nochmal“ behält die Melodie; drei Hilfen setzen `help: true`, „Noch einmal hören“ höchstens 2×, erste Hälfte erst ab Stufe 4 |
| 4 | Modus „Im Takt“ | umgesetzt | `ef9a1d9` | v334 | Zeitplan 6 Stufen × 60 Melodien × 2 Varianten (Bögen, Pausen, Auftakt vorhanden): Sollzeiten, Einzähler, Taktraster, Klick-Lautstärke exakt; Versatz 200 ms bei `singLatencyMs` 200 → 100 % gut; +100 ms → überwiegend knapp, Satz „spät“ (−100 ms → „früh“); realistische Sänger:in ≥ 92 % gut (große Stichprobe s. u.); Kalibrierung 180 ± 20 ms → 170–190 (5×); Roundtrip Latenz, Tempo-Faktor, Variante, Rhythmussprache, `null` |
| 5 | Einbindung: Stufen, Fortschritt, Schnellstart | umgesetzt | `b2f5582` | v335 | App: Einträge `echo`/`inTime` landen unter „Singen“ (Minuten, Kachel-Stufe (4+2)/2 = 3, Hilfe-Markierung), nicht unter Rhythmus; Kette in der festgelegten Reihenfolge mit 6/8/6/8/4; Deep-Links richtig, 5 falsche Varianten ignoriert |
| — | Nachbesserung + Bericht | — | (dieser Commit) | v336 | Stufenwechsel während Kalibrierung/Durchgang: Kalibrierung verworfen, geplante Klicks ausgeblendet |

Jedes Paket wurde vor dem Commit so geprüft:
- Headless-Chromium (Playwright vorinstalliert, nichts nachinstalliert):
  `uebeLab.selfCheck()` eigenständig und eingebettet in der App, dazu
  `chorApp.selfTest()`, `chorApp.selfTestAsync()`, `chorApp.selfTestMusic()`
  — alle `[]`, keine Seitenfehler (die Zeilen „Testfehler“/„simulated read
  failure“ sind die erwarteten simulierten Fehler der App-Selbsttests).
- Die Referenz aus Anhang A/B vorab in Node nachgerechnet (Ergebnisse wie in
  der Tabelle der Anweisung, z. B. sauber 97,8 %, Einsatzfehler 12/44 ms).
- Sichtprüfung per Screenshot (390 px) für Liste, Nachsingen (Vorspiel,
  Singphase, Ergebnis), Im Takt (Einstellungen, Kalibrierung, Vom Blatt mit
  Marke, Ergebnis mit Zeichen je Note), Klicktest aller Knöpfe; Ergebnisbilder
  mit eingespeisten simulierten Rahmen über eine nicht eingecheckte Kopie der
  Seite (`_demo.html`), Mikrofon-Pfade mit dem Fake-Mikrofon von Chromium.
- Prüfskripte lagen im Scratchpad, nicht im Repo.

## Je Paket

### 1 – Auswertung
- **Datei:** `uebe-lab.html`
- **Geändert:** Anhang A unverändert (Parameter gleich), als reine Funktionen
  im Abschnitt der Mikrofon-Übungen, exportiert über `window.uebeLab`.
  Rahmen-Helfer `pitchFrameOf`: `midi` roh nur bei clarity ≥ .85, `t` um die
  halbe Fensterlänge (1024 Abtastwerte) zurück, `rms` auch ohne Tonhöhe
  (bei Stille aus dem Puffer). Simulation als `makeEchoSim(startwert)` /
  `echoSimCheck()`.
- **Abweichungen:** Der Median der Referenz heißt `echoMedian` (liefert `null`
  bei leerer Liste), weil `median` in der Datei schon anders belegt ist.
  `selfCheck()` dauert mit allen neuen Prüfungen ≈ 18 s statt ≈ 4 s
  (Hauptteil: 12 000 Melodien aus Paket 2).

### 2 – Melodien mit Rhythmus
- **Datei:** `uebe-lab.html`
- **Geändert:** `ECHO_LEVELS`, `IN_TIME_LEVELS` (wie festgelegt),
  `melodySpec`, `phraseRhythm` (makePattern, dann Schlusston), `phraseDegrees`
  (Töne nach `SIGHT_LEVELS`), `rhythmMelodyOk` (Prüfung für Generator und
  Test), `makeRhythmMelody`, `melodyTarget`. Lage: Grundton so, dass alle Töne
  im Innenbereich (`practiceRange` ± 2) liegen, Mitte möglichst mittig, ohne
  Ges-Dur (wie im Blattsingen, wegen `spell()`).
- **Abweichungen:**
  - Nachsingen Stufe 1–3 (alles Viertel, keine Takte): die Schlussregel
    „längster Ton auf der Eins“ entfällt.
  - Im Takt Stufe 1 (ein Takt): auf der Eins könnte nur ein einziger Ton
    stehen — der Schlusston steht dort als Halbe auf der Takthälfte (Zz. 3).
  - Frage und Antwort in Moll: Phrase 1 endet auf mi oder ti, (Halbschluss auf
    der Dominante von la) statt „so oder re“.
  - Im Takt Stufe 6 ist immer Moll (Tonvorrat der Blattsingen-Stufe 6),
    Nachsingen Stufe 6 zu 50 % wie festgelegt.
  - Die Tonzahl (`len`) wird je Phrase gesteuert (bei zwei Phrasen je die
    Hälfte), sonst lagen viele Melodien über 20 Tönen. Die Obergrenze „höchstens
    dreimal derselbe Ton“ aus dem Blattsingen gilt hier nicht (bei 20 Tönen und
    8 Stufen nicht einzuhalten).

### 3 – Nachsingen
- **Datei:** `uebe-lab.html`
- **Geändert:** Modus `singEcho` („Nachsingen“) mit Stufen-Karte, Vorspiel
  (Tonika-Akkord ein Takt, Melodie allein am Klavierklang, Punktreihe wandert
  mit), Singphase („Jetzt du“, Ende 1,2 s nach dem letzten stimmhaften Rahmen
  bzw. nach Melodiedauer × 2 + 3 s), Auswertung ohne `timing`,
  Tonhöhenbild (SVG) und Sätze; Knöpfe „Anhören“, „Nochmal“, „Weiter“; Hilfen
  „Noch einmal (2)“, „Langsamer“ (× 0,75), „1. Hälfte“ (Stufe 4/5/6: bis Ende
  Takt 1/2/4). Fortschritt: richtig = alle `pitchOk` und `extra ≤ 1`,
  `value` = Anteil getroffener Töne. Selbsttests laufen mit `selfTesting`:
  kein Ton, keine Meldung an den Fortschritt.
- **Abweichungen:**
  - Interne Modus-ID `singEcho`, weil `echo` in der Ausbildung schon
    „Nachklatschen“ heißt; der Fortschrittsbereich heißt wie festgelegt `echo`.
  - „Nur die erste Hälfte“ meldet die Aufgabe mit `help: true` (zählt also
    nicht für den Stufenvorschlag), statt sie gar nicht zu melden.
  - Die gesungene Linie im Tonhöhenbild ist über 7 Rahmen gleitend
    median-geglättet (nur Anzeige), sonst zeigen einzelne Oktavfehler der
    Tonerkennung lange Zacken.
  - Rückmeldung bei Teiltreffern neutral statt rot (ermutigende Wortwahl).
  - Die Hilfen sind auch in der Singphase da und starten das Vorspiel neu.

### 4 – Im Takt
- **Datei:** `uebe-lab.html`
- **Geändert:** Modus `inTime` mit Varianten Echo / Vom Blatt, Tempo-Regler
  80–120 % (gespeichert als Faktor), Schalter Rhythmussprache. Zeitplan
  `inTimePlan` auf der Audio-Uhr: Tonika-Akkord (ein Takt), Einzähler (ein
  Takt, der Auftakt beginnt davor), bei Echo die Melodie mit Klick und ohne
  Pause deine Hälfte mit Klick −6 dB; vom Blatt singst du nach dem Einzähler.
  Anzeige „Einzähler · 3“ / „Vorsänger · Takt 1 von 2 · 1“ / „Du · …“, vom
  Blatt mit mitlaufender Marke. Notenzeile `rhythmStaffSvg` (Schlüssel und
  Vorzeichen wie beim Blattsingen, Balken, Bögen, Punkte, Pausen, Silben,
  Rhythmussprache; unter jeder Note Ton- und Einsatz-Zeichen, „kurz“).
  Auswertung mit `level.win`, Latenz `singLatencyMs`; Zusammenfassung,
  Hinweise zu Lage/fehlenden Tönen, Tendenz ±50 ms. Kalibrierung durch Singen
  (8 Klicks bei ♩ = 80, die ersten zwei zählen nicht, mindestens 5 Töne,
  0–500 ms), vor der ersten Aufgabe und über „Neu kalibrieren“.
- **Abweichungen:**
  - Auch in der Echo-Variante erklingt vor dem Einzähler der Tonika-Akkord
    (Paket 2: „davor Tonika-Akkord“).
  - Ton- und Einsatz-Zeichen (●, ◐, ○) sind SVG-Formen statt Schriftzeichen —
    ◐ fehlt in manchen Schriften.
  - Tests „fester Versatz“ und Kalibrierung nutzen saubere synthetische
    Rahmen auf „da“ (Vokal ab Einsatz, davor 70 ms stimmloser Konsonant). Mit
    der Sänger:in aus Anhang B ergab „Versatz = Latenz“ 89 von 91 „gut“
    (Tonwiederholung und Legato-Gleiten verschieben den erkannten Einsatz) —
    die Anweisung nennt dafür selbst 95,6–96,5 %. Die Anhang-A-Parameter sind
    unverändert; die realistische Sänger:in läuft zusätzlich mit ≥ 92 % mit.
  - Große Stichprobe (100 Melodien je Stufe, realistische Sänger:in,
    Latenz 200 ms): „gut“ 99,3 / 99,1 / 96,7 / 94,1 / 94,7 / 95,1 % in den
    Stufen 1–6. In Stufe 6 (Sechzehntel bei ♩ = 84, 179 ms) wurden 177 von
    ≈ 1850 Tönen nicht erkannt (≈ 10 %) — siehe „Zu entscheiden“.
  - Kalibrierung: echter Median (bei gerader Zahl Mittel der beiden mittleren
    Werte). Die 60-Hz-Bildrate verschiebt jeden erkannten Einsatz um im Mittel
    ein halbes Bild (≈ 8 ms) — in Kalibrierung und Auswertung gleich, es hebt
    sich also auf. Der Test „180 ± 20 ms → 170–190“ läuft deshalb auf feinem
    Raster; auf 60 Bildern/s wird „wahrer Median + 8 ms ± 12“ geprüft. Mit der
    Anhang-B-Sänger:in misst die Kalibrierung 200–217 ms statt 180 (ihr
    Konsonant verzögert den Vokal um 30 ms — gewollt, „Vokal auf den
    Schlag“).

### 5 – Einbindung
- **Dateien:** `app.js`, `uebe-lab.html`, `README.md`
- **Geändert:** `echo` und `inTime` in `PROGRESS_AREAS` und in der Gruppe
  `sing` (Wochenansicht, Üben-Kachel, `levelHint`); `levelHint` und
  Stufen-Karte wie in allen Bereichen. Modus-Reihenfolge Ton halten ·
  Intervalle singen · Ton finden · Nachsingen · Im Takt · Blattsingen ·
  Diktat. Singen-Schnellstart: Nachsingen 6, Intervalle singen 8, Im Takt 6,
  Ton finden 8, Blattsingen 4; ohne Kalibrierung beginnt Im Takt mit ihr (zählt
  nicht als Aufgabe). Deep-Links `?tab=voice&mode=echo|inTime`
  (`&variant=echo|sheet`).
- **Abweichungen:**
  - „Heute üben“ fehlt (s. o.) — die festgelegte Reihenfolge gilt für den
    Singen-Schnellstart. „Ton halten“ ist dadurch nicht mehr in der Kette.
  - Der Tuner bleibt in der Liste die letzte Zeile („Tuner und Tonumfang“,
    Entscheidung aus dem Umbau der Tools); intern steht er wie festgelegt vorn.
  - Deep-Links als `mode`/`variant` neben `tab=voice` (ohne `from=quick`
    öffnet das die Übung direkt; während eines Schnellstarts hat die Kette
    Vorrang).

## Manuell auf echten Geräten prüfen

- Tiefe Männerstimmen (Bass unter 100 Hz): werden Töne in Nachsingen und Im
  Takt stabil erkannt (auch „da“ auf tiefen Tönen)?
- Kalibrierung mit kabelgebundenen und mit Bluetooth-Kopfhörern (Bluetooth:
  150–300 ms erwartet); danach ein Durchgang: stimmen die Einsätze?
- Tonwiederholungen auf „da“ bei ♩ = 84: werden sie getrennt erkannt?
- Singen ohne Kopfhörer: stört der Klick (Im Takt) bzw. das Klavier-Vorspiel
  (Nachsingen, wird 0,35 s nach dem letzten Ton abgewartet)?
- Sechzehntel in Im Takt Stufe 6: wie viele werden erkannt?
- Vorsänger-Chor-Übergang in der Echo-Variante: ist „ohne Pause“ auf dem
  Handy gut zu schaffen (Anzeige „Du · Takt 1“)?
- Lesbarkeit der Notenzeile mit Zeichen je Note auf 320 px, besonders bei
  vielen Achteln (Details werden abwechselnd versetzt).
- Anzeige der Schlüssel 𝄞/𝄢 in den System-Schriften.

## Zu entscheiden

- Soll „Im Takt“ die Tonlänge (zu kurz) später mitbewerten? (Heute nur
  Hinweis „kurz“ an der Note und ein Satz ohne Wertung.)
- Sollen Nachsingen-Melodien später wahlweise gesungen statt vom Klavier
  vorgespielt werden (Vokal-Klang)?
- „Ton halten“ ist aus dem Singen-Schnellstart gefallen; die Kette dauert mit
  Nachsingen und Im Takt deutlich länger als die angezeigten „ca. 10 Min.“ —
  Ton halten wieder aufnehmen, Mengen kürzen oder den Text ändern?
- Im Takt Stufe 6: Sechzehntel bei ♩ = 84 werden zu ≈ 10 % nicht erkannt —
  Tempo der Stufe senken oder Sechzehntel dort seltener machen?
- Im Takt Stufe 1 (ein Takt): Schlusston auf Zz. 3 wie jetzt, oder die Stufe
  auf zwei Takte erweitern?
- Im Takt Stufe 6 immer Moll (wie Blattsingen 6) oder wie Nachsingen 6 nur zu
  50 %?
- Soll „Nur die erste Hälfte“ ganz ungezählt bleiben statt „mit Hilfe“?
