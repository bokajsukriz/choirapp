# Arbeitsanweisung für Claude Code – Musiktheorie-Korrekturen

Du bist erfahrener Chorleiter, Musiktheoretiker und Entwickler. Du setzt die
Befunde aus `REVIEW-MUSIKTHEORIE.md` um. Dort stehen zu jeder Nummer das
Problem, die Datei/Zeile (Stand `2547af7`) und die empfohlene Lösung mit
konkreten Werten. Diese Anweisung legt Reihenfolge, Regeln und Tests fest.

Antworte und kommentiere auf Deutsch.

**Diese Anweisung läuft unbeaufsichtigt über Nacht.** Stelle keine Fragen
und warte auf keine Freigabe. Alle Entscheidungen sind unten getroffen. Wo
trotzdem etwas unklar ist: die konservativste Variante wählen (weniger
ändern, bestehendes Verhalten erhalten), im Bericht begründen, weitermachen.

---

## 0. Vorbereitung

1. `git fetch origin`, dann Branch `musiktheorie-review` von `2547af7`
   anlegen (siehe Punkt 3). Nie auf `main` committen, nie mergen, nie
   force-pushen.
2. `CLAUDE.md`, `README.md` und `REVIEW-MUSIKTHEORIE.md` vollständig lesen.
3. Zeilennummern im Review beziehen sich auf `2547af7`. Der Branch wird von
   genau diesem Stand abgezweigt (`git checkout -b musiktheorie-review 2547af7`),
   auch wenn `main` inzwischen weiter ist. **Nicht rebasen, nicht `main`
   hineinmergen.** Ist `main` bei Start oder während des Laufs von `2547af7`
   abgewichen: mit `git diff --stat 2547af7 origin/main` prüfen, welche
   Dateien betroffen sind, und das im Bericht unter „Konflikte mit main“
   auflisten (Datei, Paket). Die Auflösung passiert morgens, nicht nachts.
4. `REVIEW-MUSIKTHEORIE.md` und diese Datei im ersten Commit mit einchecken.

## 1. Feste Regeln (gelten für jedes Paket)

- **Ein Paket = ein Commit**, danach sofort `git push -u origin musiktheorie-review`
  (so geht bei einem Abbruch nichts verloren). Ohne Pause mit dem nächsten
  Paket weitermachen.
- **SW_VERSION** in `sw.js` bei jedem Commit um eins erhöhen (Stand v293).
  Vor dem Commit `git diff --cached --stat` gegen die Liste in `CLAUDE.md`
  prüfen.
- **Keine Reihenfolge ändern** in `DRUM_PATTERNS` und `MELODIES` (gespeichert
  per Index, groove-lab.js `patternIndex`/`melodyIndex`). Neue Einträge nur
  anhängen. Namen dürfen sich ändern.
- **Keine IDs ändern** (`PROGRESSIONS`, `EAR_PROGRESSIONS`, `EXERCISES`,
  `PROGRAMS`, `LOOPS`, Einstellungs-Schlüssel). Neues bekommt neue IDs.
- **Gespeicherte Zustände:** neue Felder optional mit Standardwert; die
  jeweiligen `sanitize…`-Funktionen müssen sie durchreichen. Alte Werte beim
  Laden umrechnen statt verwerfen. `DATA_VERSION` in app.js nicht anfassen
  (betrifft nur Daten der Haupt-App).
- **Persistenz-Roundtrip ist Pflicht** für jedes neue oder umgedeutete
  gespeicherte Feld: (a) neuer Wert → speichern → laden → `sanitize` → gleicher
  Wert und gleiches Verhalten; (b) alter Wert (Stand `2547af7`) → laden →
  richtig umgerechnet; (c) unbekannter/kaputter Wert → Standardwert. Betrifft
  mindestens `dominant`, `modes` (nur Daten, nicht gespeichert – dann entfällt
  es), `cue`, `breath`, `countIn`, `ref`, `inversion`, Tempo-Bezug, Kammerton,
  Latenz, Arp-Musterbezug.
- **Texte** in `strings.js` immer DE, EN und PL gemeinsam ändern.
  `uebe-lab.html`, `einsingen.html`, `metronom.html`, `piano.html` sind nur
  deutsch.
- **Keine neuen Abhängigkeiten, kein Build-Schritt.**
- **Nur umsetzen, was im Paket steht.** Fällt dir unterwegs etwas Neues auf,
  im Bericht notieren, nicht nebenbei ändern.
- Bei musikalischen Zweifeln (Stimmführung, Stil, Didaktik) nicht fragen:
  die Variante wählen, die näher am bestehenden Verhalten liegt, und im
  Bericht unter „Zu entscheiden“ notieren.

## 2. Entscheidungen (verbindlich, sofern nicht anders mitgeteilt)

| Thema | Festlegung |
|---|---|
| Dur-Dominante in Moll | für `cadence, cadence3, circle, jazz, twoFiveOne, turnaround, chain, andalusian, blues`; natürliches v bleibt bei `pop, sad, fifties, pachelbel, epic` |
| Tempo-Bezug | 6/8 und 12/8: punktierte Viertel; 7/8: Achtel; sonst Viertel; Anzeige mit Notenzeichen |
| Deutsche Tonnamen | `C, Cis, D, Es, E, F, Fis, G, As, A, B, H`, tonartabhängig geschrieben; Oktaven im Deutschen Helmholtz (c′), im Englischen wissenschaftlich (C4) |
| Solmisation Piano | feste Silben mit Vorzeichen: `Do, Do♯, Re, Mi♭, Mi, Fa, Fa♯, Sol, La♭, La, Si♭, Si` |
| „Kadenz in drei“ | Anzeigename „Halbschluss-Runde“, ID `cadence3` bleibt |
| Geschmacks-Befunde | nur die, die in einem Paket genannt sind |
| Leitton | nur in Akkorden mit Dominantfunktion (V, V7, vii°). Dur: 7. Stufe. Moll mit `dominant: true`: erhöhte 7. Stufe (in a: gis). Moll ohne `dominant`, Dorisch, Mixolydisch: **kein** Leitton – keine Leitton-Regeln anwenden |
| Hörbare Änderung gespeicherter Stände | Paket 3 (Dur-Dominante), 5 (Blues, Beats), 7 (Satz) ändern bewusst, wie gespeicherte Folgen/Loops klingen. Das ist gewollt und wird **nicht** aus Kompatibilitätsgründen zurückgenommen oder migriert. „Konservativ“ bezieht sich auf Daten und IDs, nicht auf diese musikalischen Korrekturen |

## 3. Tests – wie und wo

- **Groove Lab:** In `groove-lab.js` am Ende
  `global.ChorGrooveLab._test = { MODES, PROGRESSIONS, MELODIES, DRUM_PATTERNS, METERS, voiceChord, chordPitchClasses, degreeSemis, … }`
  exportieren (Paket 3), neue Hilfsfunktionen jeweils ergänzen. Musik-Tests
  in `runAsyncSelfTests()` (app.js) als eigener Block: `await loadGrooveLab()`,
  dann prüfen. Zusätzlich `chorApp.selfTestMusic()` zum manuellen Aufruf.
- **Ausbildung/Einsingen/Metronom** (iframes, für app.js nicht erreichbar):
  analog zu `window.einsingen` ein `window.uebeLab = { … }` bzw.
  `window.metronom = { … }` mit Daten und reinen Funktionen exportieren; die
  Prüfungen als Funktion `selfCheck()` im jeweiligen Tool, aufrufbar in der
  Konsole des iframes. Ergebnis: Liste der Fehler, leer = bestanden.
- **Schnellprüfung ohne Browser** (nicht committen): Daten per Node
  auslesen, wie im Anhang von `REVIEW-MUSIKTHEORIE.md` beschrieben
  (`eval` der Konstanten, Funktionen 1:1 übernehmen).
- **Pflicht nach jedem Paket** (ohne Browser möglich):
  1. Syntax: `node --check` für jede geänderte .js-Datei; bei HTML-Dateien
     die Inline-Skripte in eine temporäre .js-Datei ziehen und mit
     `node --check` prüfen.
  2. Die im Paket genannten Prüfungen als Node-Skript unter `/tmp`
     ausführen (Daten per `eval` aus den Dateien lesen, reine Funktionen 1:1
     übernehmen). Nicht committen.
  3. Vorher/Nachher-Vergleich: Für alles, was laut Paket **nicht** anders
     klingen soll (z. B. Dur-Akkorde in Paket 3), die erzeugten Töne vor und
     nach der Änderung vergleichen – müssen identisch sein.
- **Browser-Tests** (`chorApp.selfTest()`, `chorApp.selfTestAsync()`,
  `chorApp.selfTestMusic()`, `selfCheck()` der Tools): trotzdem schreiben.
  Nur ausführen, wenn ohne neue Installation ein Headless-Browser vorhanden
  ist; sonst im Bericht als „morgens im Browser ausführen“ aufführen.
- **Hörtest:** Kann nachts niemand machen. Jedes Paket nennt, was man hören
  soll – im Bericht als Checkliste sammeln.

## 4. Pakete

### Paket 1 – Texte und Namen (Befunde 5, 6, 7, 40)
- strings.js: Pachelbel-Text (DE/EN/PL wie im Review, Abschnitt „5“).
- strings.js: `lab.progNameCadence3` / `lab.progInfoCadence3` (Abschnitt „6 + 6b“, nur der Teil zu `cadence3`).
- uebe-lab.html `EAR_PROGRESSIONS`: Name `cadence` → „Grundkadenz“, `tsd` → „Halbschluss-Runde“. IDs bleiben.
- einsingen.html: „Fünftonleiter“ → „Fünftonraum“ (hint und Hilfetext).
- **Test:** STRINGS-Paritätstest grün. **Hörtest:** keiner.
- Commit: `Texte: Pachelbel, Halbschluss-Runde, Fünftonraum`

### Paket 2 – Einsingen: Auftakt, Einstimmung, Atem, Einzähler, Tonnamen (18, 20, 41, 44, 45)
- `katze`: Feld `delay: 2`; in `EXERCISES.forEach` `let at = CUE + (ex.delay || 0)`.
- Einstimmung: Option `cue: 'chord' | 'cadence'` (Standard `chord`), Kadenz I–V7–I über einen Takt (CUE = 16) nur in der ersten Runde einer Übung.
- `breath` je Übung (Standard 4; `lippen`, `koloratur`, `oktave`: 8).
- `countIn`: `'off' | 'start' | 'round'`; beim Laden `true` → `'start'`, `false` → `'off'`. „round“ klickt Zz. 3 und 4 im Akkord.
- `noteLabel(midi, root)` tonartabhängig (♭-Tonarten F, B, Es, As, Des, Ges).
- **selfCheck:** Katze: Silben 2, 4, 6, 8 (Kat, tritt, Trep, krumm) liegen auf Zählzeiten (Schritt % 4 === 0). Alle Übungen × Stimmen: Töne im Umfang (bestehende Logik). Des-Dur-Runde zeigt „des′“, nicht „cis′“.
- **Hörtest:** Katze-Betonung, Kadenz-Einstimmung, Atempause beim Lippenflattern.
- Commit: `Einsingen: Auftakt Katze, Kadenz-Einstimmung, Atempause, Einzähler je Runde`

### Paket 3 – Dur-Dominante in Moll + Test-Export (1, 6b, 22, 38, 26 Teil)
- groove-lab.js: Feld `dominant: true` (Liste siehe Entscheidungen), Funktion `chordSteps()`, Einbau in `_harmonyAt` und `_voicings` (Review „1 + 22“). Editor: Schalter „Moll: Dur-Dominante“ für eigene Folgen, in `sanitizeProgLibrary` durchreichen.
- strings.js `lab.progInfoCadence`: Text aus Review „6 + 6b“.
- `ChorGrooveLab._test` exportieren; Musik-Testblock in `runAsyncSelfTests()` anlegen.
- **Tests:** a-Moll, `cadence`: Stufe 4 = {e, gis, h}; `jazz` in Moll: V7 = {e, gis, h, d}; Arp-Dreiklang und Melodie über V verwenden gis, nicht g; `romanNumeral` zeigt „V“. Dur unverändert (Vergleich aller Akkordtöne vorher/nachher für Modus 'major').
- Paket 3 ist eine bewusst **nicht klang-rückwärtskompatible** Änderung: gespeicherte Stände werden nicht migriert, beim nächsten Abspielen gelten die neuen Regeln.
- **Hörtest:** Grundkadenz und Andalusische Kadenz in a-Moll.
- Commit: `Groove Lab: Dur-Dominante in Moll, Test-Export`

### Paket 4 – Modus-Bindung und Zufall (2, 21)
- Feld `modes` in `PROGRESSIONS`, Auto-Umschaltung mit Statuszeile, Markierung unpassender Folgen, `randomize()` filtert, Texte „Am typischsten …“ anpassen (Review „2 + 21“).
- **Tests:** 1000× Zufall → nie Folge außerhalb `modes`; Auswahl `andalusian` in Dur → Modus wird Moll. Gespeicherte Kombination wird beim Laden **nicht** umgestellt.
- Commit: `Groove Lab: Akkordfolgen an passende Modi binden`

### Paket 5 – Groove-Inhalte und Arp (3, 12, 13, 14, 15, 36, 37)
- Blues `dom7` (Review „3“), Blue Third mit ♭3→3 (Review „12“; 4. Element in `MELODIES.forEach` erhalten),
  Bedeutung von `alt` (unverändert, festschreiben als Kommentar): Verschiebung in Halbtönen **nach** der Umrechnung der Stufe über dem aktuellen Akkordgrundton (`midi = base + degreeSemis(steps, deg + shift) + alt`), nur −1/+1. Weil die Terz über Moll-Akkorden schon klein ist, ergäbe `alt −1` dort eine Sekunde: in `_playMelodyStep` gilt deshalb für Stufe 2 mit `alt −1` – ist die Akkordterz bereits klein, `alt` ignorieren (dann erklingt nur die kleine Terz). Test: über C-Dur e♭→e, über a-Moll c→c, nie h. Triplet Roll umbenennen (Name), Deep House/Swing Soul (Review „14“, inkl. Achtel-Swing-Option), Waltz Step Bass nur auf 1 (Review „15“).
- Arp: Rhythmus-Zellen skalieren mit `arpDivision` (Review „36“); Option „Muster: Tonart / Akkord“ (Review „37“).
- Bestehende PR-Prüfung „keine Note außerhalb der Tonart“: Ausnahme für `dom7`, `dominant` und Melodietöne mit `alt`.
- **Tests:** C7 = {0, 4, 7, 10}, F7 = {5, 9, 0, 3}; Blue Third enthält Alteration; Arp 1/16 + „punktiert“ = Längen 3+1, 1/8 + „punktiert“ = 6+2.
- **Hörtest:** Blues, Swing Soul, Deep House, Waltz Step, Arp punktiert.
- Commit: `Groove Lab: Blues mit Septakkorden, Blue Note, Beats, Arp-Rhythmus`

### Paket 6 – Tonnamen und Stimmumfänge (8, 23, 24, 25, 50, 59, 60)
- Eine Funktion `spell(pc, keyRoot, mode, lang)` plus `noteLabel(midi, keyRoot, mode, lang)` (Helmholtz DE / wissenschaftlich EN), vorerst in jedem Tool als **wortgleiche** Kopie mit Kommentar „bis harmony.js – nicht toolspezifisch ändern“. Signaturen und Rückgabeformat sind die spätere `harmony.js`-API; keine toolspezifischen Parameter oder Sonderfälle. Dieselbe Testfall-Liste (Konstante `SPELL_CASES`) in jedem Tool; Paket 13 zieht Code und Testfälle nur noch heraus.
- Anwenden in: Groove Lab (`noteNames`, `chordName`, Tonartwahl), Ausbildung (`NOTE_NAMES`, `keyName`, Tuner), Piano (`NAMES`), Einsingen (bereits Paket 2 – angleichen).
- Tonartwahl in Moll: cis, dis, fis, gis statt des, es, ges, as.
- Piano-Solmisation (Entscheidungen), Button „Do Re Mi (fest)“.
- Stimmumfänge vereinheitlichen und Gehörbildungs-Bass auf 40–51 (Review „8 + 25“).
- **Tests:** As-Dur IV = „Des“; E-Dur iii = „Gism“ (DE) / „G♯m“ (EN); H-Dur vii° = „Ais°“; 60 → „c′“ / „C4“; 500 Zufallsaufgaben Bass 40–51.
- Commit: `Tonnamen tonartabhängig, einheitliche Stimmumfänge`

### Paket 7 – Stimmführung voiceChord (4)
- **Harte Regeln** (Kandidat wird verworfen, nicht nur bestraft): offene Quint-/Oktavparallelen zwischen beliebigen Stimmpaaren; Verdopplung des Leittons (Leitton-Definition siehe Entscheidungen). **Weiche Regeln** (Strafpunkte wie im Review „4“): verdeckte Parallelen der Außenstimmen, nicht aufgelöster Leitton im Sopran, fehlende Quinte usw. vii° als Sextakkord.
- Bleibt nach den harten Regeln kein Kandidat übrig: bisheriges Verhalten (bester Kandidat nach Strafpunkten) als Rückfall, und der Fall wird gezählt. Vorab geprüft: mit den heutigen Folgen, Umfängen und Grundstellungs-Bass gibt es in allen 8 640 Wechseln (2 Durchläufe) eine parallelenfreie Lösung – nach Paket 3/5 (Dur-Dominante, `dom7`) erneut prüfen.
- **Test:** alle `PROGRESSIONS` × 12 Tonarten × 4 Modi (inkl. Übergang Ende → Anfang): (1) Zahl der Wechsel ohne regelkonforme Lösung (Existenzprüfung über alle Kandidaten) – im Bericht nennen, jeden Fall auflisten; (2) in allen lösbaren Wechseln 0 Parallelen und 0 Leittonverdopplungen; (3) Stimmen im Umfang, keine Kreuzung. Heute 651 Parallelen – Zahl vorher/nachher im Bericht nennen. Ein Rückfall ist kein Fehlschlag des Pakets, nur ein Parallel in einem lösbaren Wechsel.
- **Hörtest:** Pop und Pachelbel mit Chor-Stimmen.
- Commit: `Groove Lab: SATB-Satz ohne Parallelen, Leitton nicht verdoppelt`

### Paket 8 – Ausbildung: Akkorde, Stufen, Intervalle (9, 10, 27, 32, 33, 34, 35)
- Stilgerechte Umkehrungen (`random` → `style`, beim Laden abbilden), neue Symbole und Folgen `v7, k64, phryg, ajoutee`, Stufen kumulativ mit `add`, Intervall-Stufen und Gewichtung (Review „9“, „10 + 27“, „32 + 33“, „34 + 35“). Parallelenstrafe wie Paket 7.
- **selfCheck:** jede Stufe ⊇ vorige; kein 6/4 außer Kadenzquartsext; kein vii° in Grundstellung; 0 Parallelen in allen Folgen × 12 Tonarten.
- **Hörtest:** Stufe 1–6 je eine Aufgabe; phrygischer Halbschluss.
- Commit: `Ausbildung: Stufen aufbauend, Chorwendungen, stilgerechte Umkehrungen`

### Paket 9 – Aufnahme tonartrelativ (16)
- `ref: 'key'` für neue Aufnahmen, Oktavverschiebung als Ganzes (Review „16“). Alte Aufnahmen unverändert abspielen.
- **Test:** 2-Takt-Aufnahme über `pop` (simuliert über `rec.notes`) → zweiter Durchlauf gleiche MIDI-Töne; gespeicherte Melodie ohne `ref` klingt wie vorher.
- **Hörtest:** kurze Phrase einspielen, über 4-Akkord-Folge loopen.
- Commit: `Groove Lab: Aufnahmen tonartbezogen speichern`

### Paket 10 – Einsingen: Moll und neue Übungen (19, 42, 43)
- Moll-Modus für Übungen, `moll5`, `mollDreiklang`, `atem`, `messa`, `akkord` (Review „19“, „42“, „43“). `akkord` nutzt `voiceChord` aus Paket 7 – falls nicht erreichbar, die Funktion kopieren und im Bericht vermerken.
- Programme: nur „Ausführlich“ ergänzen (`atem` an den Anfang, `moll5` nach `vokale`).
- **selfCheck:** alle neuen Übungen × Stimmen im Umfang; Moll-Tonart „a-Moll“ korrekt benannt.
- **Hörtest:** jede neue Übung einmal.
- Commit: `Einsingen: Moll-Übungen, Atem, An- und Abschwellen, Akkord-Intonation`

### Paket 11 – Stimm-Tuner (47, 48, 49)
- Anzeige über ~300 ms mitteln, Tonumfang-Toleranz 2, Kammerton 438–445 Hz (auch für `playTarget` und die Klänge der Ausbildung).
- **selfCheck** (synthetische Signale durch `detectPitch` und die neue Glättung): 440 Hz konstant → |Anzeige| ≤ 2 Cent; 440 Hz +20 Cent konstant → +18…+22 Cent; 440 Hz ±50 Cent Vibrato bei 5,5 Hz → Anzeige schwankt über 2 s höchstens ±10 Cent um 0; 110 Hz (A) und 82,4 Hz (E) konstant → richtiger Ton, |Abweichung| ≤ 3 Cent; Kammerton 443 → 443 Hz = „a′ ±0“.
- **Hörtest:** mit Stimme (gerader Ton und mit Vibrato).
- Commit: `Tuner: ruhigere Anzeige, Kammerton einstellbar`

### Paket 12 – Tempo-Bezug, Rhythmus, Metronom, Piano (28, 51, 52, 53, 55, 56, 57, 58, 63)
- Einheitlicher Tempo-Bezug (Entscheidungen) in Metronom, Rhythmus-Training und Groove Lab; gespeicherte Werte beim Laden umrechnen; Tempobezeichnung aus dem Bezugsschlag.
- Rhythmus: Latenz-Kalibrierung, Trefferfenster-Untergrenze (Review „52“).
- Metronom: 7/8- und 5/4-Vorwahl, Klang „Elektro“/„Kuhglocke“, Trainer nicht in Stummtakten.
- Piano: Pedal beim Öffnen aus.
- **Tests:** 6/8 bei „♩. = 60“: Achtel-Abstand 0,333 s in allen drei Tools; Roundtrip je Tool: 4/4 ♩ = 120 → 6/8 zeigt ♩. = 80 → zurück 4/4 zeigt ♩ = 120; 6/8 ♩. = 80 → 4/4 ♩ = 120; Wechsel 4/4 → 7/8 → 4/4 ohne Drift; speichern/laden in jedem Taktschritt ändert den Wert nicht (keine doppelte Umrechnung); Trefferfenster überlappen bei 200 BPM Sechzehnteln nicht; gespeicherter Metronom-Zustand 6/8 mit 120 (Viertel) wird zu „♩. = 80“.
- **Hörtest:** 6/8 in allen drei Tools nebeneinander.
- Commit: `Tempo einheitlich in 6/8, Rhythmus-Latenz, Metronom-Feinschliff`

### Paket 13 – Gemeinsame Harmonik-Quelle (17, 26)
- Erst beginnen, wenn Paket 3, 6 und 7 erfolgreich waren; sonst überspringen und im Bericht begründen.
- `harmony.js` wie im Review „17 + 26“ (klassisches Skript, `window.ChorHarmony`): Modi, Akkordbau (inkl. `dominant`, `dom7`), `spell`/`noteLabel`, Stimmumfänge, `voiceChord`. Die Kopien aus Paket 6 und 7 in allen Tools durch Aufrufe ersetzen; die iframe-Seiten laden `./harmony.js` per `<script>`.
- `harmony.js` in `SHELL_OPTIONAL` (sw.js) eintragen; Musik-Tests in app.js nutzen `harmony.js` direkt.
- `EAR_PROGRESSIONS` bleiben vorerst in uebe-lab.html (eigene IDs), nutzen aber Akkordbau und Satz aus `harmony.js`. Keine Zusammenlegung der Folgenlisten in diesem Paket.
- **Test:** Vorher/Nachher-Vergleich über alle Tools: jede Folge × 12 Tonarten × Modi, jede Einsing-Übung × Stimme, Tonnamen 0–127 – Ausgaben identisch zum Stand nach Paket 12. Jede Abweichung ist ein Fehler.
- Commit: `Gemeinsame Harmonik-Quelle harmony.js`

## 5. Wenn ein Paket nicht sauber klappt

- Ein Paket gilt als gescheitert, wenn eine Pflichtprüfung aus Abschnitt 3
  fehlschlägt und sich nicht innerhalb vertretbarer Zeit (etwa drei
  Korrekturversuche) beheben lässt.
- Dann: alle Änderungen dieses Pakets verwerfen (`git checkout -- .` bzw.
  `git reset --hard` auf den letzten Paket-Commit), **kein Commit**, im
  Bericht festhalten (was versucht, welcher Test, Fehlermeldung), mit dem
  nächsten Paket weitermachen.
- **Abhängigkeiten:** Paket 7 nutzt `dominant` aus Paket 3; Paket 10
  (`akkord`) nutzt `voiceChord` aus Paket 7; Paket 13 braucht 3, 6 und 7.
  Fehlt eine Voraussetzung, den davon unabhängigen Teil umsetzen und den
  Rest im Bericht als „ausgelassen wegen Paket X“ vermerken.
- SW_VERSION nur in tatsächlich committeten Paketen erhöhen.

## 6. Abschluss

1. `BERICHT-UMSETZUNG.md` im Repo anlegen und als letzten Commit pushen:
   - Tabelle: Paket | Status (umgesetzt / teilweise / zurückgesetzt /
     übersprungen) | Commit | SW_VERSION | Tests (Zahlen).
   - Je Paket: geänderte Dateien, Abweichungen vom Review mit Begründung,
     neue Beobachtungen (nicht umgesetzt).
   - „Morgens im Browser ausführen“: genaue Befehle.
   - „Hörtest-Checkliste“: alle Hörtests aus den Paketen, abhakbar.
   - „Zu entscheiden“: alle Stellen, an denen du ohne Rückfrage gewählt hast.
2. Pull Request von `musiktheorie-review` nach `main` öffnen (`gh pr create`;
   falls `gh` fehlt, die Compare-URL im Bericht nennen). Titel:
   „Musiktheorie-Review: Korrekturen (Pakete 1–13)“. Beschreibung: Inhalt
   der Status-Tabelle und Link auf `BERICHT-UMSETZUNG.md`. **Nicht mergen.**
