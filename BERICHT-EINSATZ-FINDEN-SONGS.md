# Bericht: „Einsatz finden“ mit Songs

Grundlage: `ARBEITSANWEISUNG-EINSATZ-FINDEN-SONGS.md`, davor
`ARBEITSANWEISUNG-NACHKLATSCHEN-ERGEBNIS.md`. Branch
`claude/affectionate-archimedes-75nl5c` (PR #168).

Antworten der Nutzerin auf die offenen Fragen: Nachklatschen – „Fast“, vier
Stufen, gilt auch für Vom Blatt und den Kurs. Einsatz finden – überall der
Standard aus der Arbeitsanweisung.

## Status

| Teil | Inhalt | Status | SW_VERSION |
|---|---|---|---|
| Vorab | Nachklatschen: Urteil Gut/Okay/Fast/Nochmal | umgesetzt | v481 |
| Etappe 1 | Song-Engine, Stufen 1, 2, 4 | umgesetzt | v482 |
| Versuch | Echte Instrumente (Samples) für 3 Probesongs | zum Probehören | v483 |
| Etappe 2 | Einstieg in der Periode, „Worauf hören?“, „Nur das Zeichen“ | offen | – |
| Etappe 3 | Stufen 3, 5, 6 auf Songs, 12/8 | offen | – |
| Etappe 4 | Typ C (Stufe 7) | offen | – |
| Etappe 5 | Stufe 8, alte 6 → neue 8, Aufräumen | offen | – |

## Vorab: Nachklatschen-Ergebnis

- `roundVerdict(result, { tol, mic, mode })` (rein): Gut = `perfect` und alles
  `good`; Okay = `perfect` mit mindestens einem `near`; Fast = 1–2 Fehler
  (verpasst + zu viel); sonst Nochmal. `perfect` selbst ist unverändert.
- Karte „Letzte Runde“ wie im Entwurf: Kreis-Symbol + großes Wort, Zeile in
  Worten („5 von 6 · 1 verpasst“, „6 von 6 · eher spät“, ohne ms), Punktreihe
  (`roundDots`: Noten in Reihenfolge, zu viel Geklatschtes als oranger Strich an
  seiner zeitlichen Stelle, gleich große Punkte – verrät keine Notenwerte),
  Tipp, Fußzeile „Runde n“ / „n in Folge ✓“ bzw. Trefferquote. Silbenzeile
  `.round-syl` wie bisher nur ohne Noten. `.tstrip` entfernt, `?`-Hilfe erklärt
  die vier Urteile (ms dort weiter).
- Tipp: bei „Fast“ mit genau einer verpassten Note deren Position („Nur der 3.
  Klatscher fehlte …“ – *Klatscher* statt *Schlag*, weil die Muster Achtel und
  Pausen enthalten); nur zu viel → „klatsch nur, was du gehört hast“ (Vom
  Blatt: „was dasteht“); sonst der Satz aus `timingSummary()`. **Abweichung:**
  „Nochmal“ zeigt immer den Grundrat des Entwurfs („Erst ganz zuhören …“, Vom
  Blatt/Zweistimmig mit eigenem Wortlaut) statt der Timing-Tendenz – bei drei
  und mehr Fehlern hilft „eher spät“ nicht weiter.
- Neue Tokens in `ueben.css`: `--warn`, `--warn-fg`, `--fast` (#f08a24),
  `--fast-fg` (#a5520a, 5,5 : 1 auf Weiß), `--danger`, `--danger-fg`,
  `--danger-bg`. Auf Orange und Gelb steht das Symbol in `--text` (6,4 : 1).
- **Dunkelmodus:** Die Übungsseiten haben (noch) keinen – die Screenshots mit
  `colorScheme: 'dark'` sehen aus wie hell. Nichts zu prüfen, nichts kaputt.
- Karte ist `role="group"` mit `aria-label` „Letzte Runde: Fast, 5 von 6,
  1 verpasst. Nur der 3. Klatscher fehlte …“.
- Tests: `redesignRhythmCheck` – je Urteil ein Beispiel, 0/1/2/3 Fehler, alles
  knapp (früh, gemischt), 1 verpasst + 2 zu viel = Nochmal, Punktreihe mit
  Extra zwischen den Noten. Im Browser alle vier Urteile in echten Runden
  (eingespeiste Klatscher) erzeugt, 390 × 844.

## Etappe 1: Song-Engine, Stufen 1, 2, 4

- **Daten:** `SONG_LEVELS`, `DB_SONGS` und die Referenzfunktionen aus
  `docs/einsatz-finden/songs.js` inline übernommen. Umbenannt: `parseChord`,
  `chordPcs`, `relPitch`, `scalePitch`, `chordLine`, `chordAt` → `song…`;
  `ROMAN`/`SCALE`/`REL`/`DRUM_KINDS`/`GROUPS` → `SONG_…`; `key` →
  `songShiftKey`. Einzige inhaltliche Ergänzung: `songEvents` trägt bei
  Klavier/Stabs die Dauer `len` (geht nicht in die Fairness ein).
  Gegenprobe im Browser: für alle 48 Songs liefern `songEvents` (mit/ohne Bass,
  mit/ohne Phrase) und `songFairness` exakt dasselbe wie die Datei in `docs/`.
  `SONG_PATTERNS` steckt in `DB_PATTERNS` (neu: `hemi68`, `one128`, `back128`).
- **Stufen:** 1 „Klare Eins: klatsch auf die 1“, 2 „Backbeat und Muster“,
  4 „Ohne Bass: Akkorde und Melodie“ ziehen aus den Songs (`songs: true` in
  `DOWNBEAT_LEVELS`); 3, 5, 6 laufen unverändert mit den alten Grooves.
- **Aufgabe** (`makeSongTask`): Song + Muster, Tempo zufällig im Bereich des
  Songs plus `ear.dbPct`, Tonart zufällig (Dur F–A, Moll d–fis), Einstieg nie
  auf der Eins und nicht an derselben Stelle wie zuletzt. Abwechslung: kein Song
  in den letzten 3 Aufgaben, Stil-Familie höchstens zweimal in Folge, Muster
  wechselt (wenn der Song ein anderes erlaubt), Paare aus dem Gedächtnis
  zuletzt. „Ohne Zurücklegen“ ist angenähert: `DB_MEMORY` von 4 auf 8 erhöht,
  kein eigener Beutel in der Ablage. `ear.dbLog` speichert jetzt `song` und
  `family`; alte Groove-Einträge bleiben gültig.
- **Planer** `songPlan` (über `downbeatPlan` aufgerufen, gleiche Ausgabe):
  Schleife aus `songEvents`, Einblenden, Eins betonen, Vormachen, Bass dazu,
  Lösung ab der Eins. Schlusspunkt (Lösung und Lauf): Bassdrum + offene Hi-Hat
  wie bisher, dazu Becken, Grundton im Bass und Tonika-Akkord.
- **Klänge** in `playDownbeatEvent`: Klavier `engine.keys`, Fläche
  `engine.saw` ×2 (±6 Cent, eigene leisere Schiene), Stabs als kurzer
  gefilterter Sägezahn (`engine.drumTone`), Lead `engine.saw` (kurze Töne als
  Sägezahn-Hit), Chor-Einwürfe `engine.voice` (Vokal a/o nach Silbe), Toms
  `engine.drumTone` mit fallender Tonhöhe (neu: Option `to`), Becken
  `engine.drumNoise` (Hochpass 6 kHz, 1,2 s), Band-Klatscher `bandclap`
  (leiser, getrennt vom Vorklatschen `clap`).
- **Wertung** unverändert `judgeDownbeat`/`judgeHold`; Swing kommt über
  `dbFeel(task)` aus dem Song.
- **Anzeige:** Songname · Stil · Taktart (keine Stufen/Akkorde, Standard zu
  Frage 4); Hilfe „Dieser Song“ zeigt den `cue`. Schnelle Songs (Grundtempo
  ab ♩ 140, derzeit nur „Schwarzweißfilm“) zeigen das Tempo in Halben
  („75 𝅗𝅥 BPM“ statt „150“, Standard zu Frage 1). **Abweichung:** angezeigt
  als Halbe = 75 statt „♩ 75 Halftime“ – bei Snare auf 2 und 4 wäre ♩ 75 eine
  falsche Zählung; die Zahl ist dieselbe.
- **Selbsttest** `songDownbeatCheck`: alle 48 Songs vollständig und fair
  (Stufe 1–3 mindestens 2 Zeichen, sonst 1; ohne Bass für `noBassLevels`;
  Perioden-Fairness für Typ-C-Songs; Gegenprobe fällt durch). Für jeden Song der
  Stufen 1, 2, 4: Ereignisse ab dem Einstieg, kein Klick/Vorklatschen ohne
  Hilfe, Bass nur wo erlaubt, „Bass dazu“ wirkt, Tonhöhen/Dauern gültig, auf
  jeder gewerteten Eins mindestens ein Zeichen aus `songFairness`, Lösung mit
  Muster und Schlusspunkt. Je Stufe 60 Aufgaben: Abwechslungsregeln, Einstieg,
  Tempo, Tonart. Wertung genau/verschoben. Song-Gedächtnis übersteht
  Speichern/Laden. Die alten Groove-Tests laufen für die Stufen 3, 5, 6 weiter.
- **Browser:** Stufen 1, 2, 4 je ein Lauf mit Klatschern zu berechneten Zeiten
  → „Die Eins sitzt“; Stufe 2 um einen Schlag verschoben → „du hast die 2 für
  die Eins gehalten“. `uebeLab.selfCheck({ full: true })` grün.

### Bitte auf dem Handy probehören

Klang ließ sich hier nicht anhören. Am meisten Neues steckt in:

- **Stadtrand** (Stufe 1/2): Fläche, Tom-Fill, Becken – Lautstärke der Fläche?
- **Leuchtturm** (1/2): Fläche + Tom-Fill in Sechzehnteln.
- **Lagerfeuer** (1/2) und **Papierflieger** (4): Klavier-Arpeggio.
- **Schwarzweißfilm** (2): Chor-„hey“, Tempo-Anzeige in Halben.
- **Gummistiefel** (2): Chor-Einwürfe und Band-Klatscher – nicht mit dem
  eigenen Klatschen verwechselbar?
- **Tanzverbot** (2): Stabs.
- **Whoa-oh** (2): Fläche + Chor.
- **Morgengrauen**, **Glasdach**, **Zuckerwatte** (4, ohne Bass): reicht die
  Harmonie ohne Bass für die Eins?
- Allgemein: Lead (Melodie) zu laut/leise gegenüber Klavier und Drums? Schluss-
  akkord nach den vier Takten angenehm?

## Klang-Versuch: echte Instrumente (v483)

Frage der Nutzerin: fertige, realistische Audio-Loops statt Synthese?
Geschätzt ≈ 270 KB je Song als fertiger Mix (100 Songs ≈ 27 MB), mit
Einzelspuren ≈ 550 KB (≈ 55 MB) – dabei gingen Tonart, freies Tempo,
„ohne Bass“ und das Ändern per Text verloren. Stattdessen als Versuch: die App
spielt die Songs weiter selbst, aber mit **aufgenommenen Instrumenten**.

- **Samples** in `samples/` (54 MP3, mono, **1,1 MB**): Schlagzeug aus VCSL
  (CC0), Bass, Klavier, Streicher, Gitarre (Melodie) und Chor („aah“) aus
  FluidR3_GM (CC BY 3.0). Je Instrument ein Ton alle drei Halbtöne, dazwischen
  umgestimmt. Herkunft je Datei in `samples/LIZENZ.md`, Aufbereitung
  `samples/aufbereiten.sh`, Eintrag in `THIRD-PARTY.md`, Namensnennung auch in
  der App.
- **Wo:** Einstellungen (Zahnrad) von „Einsatz finden“ → „Klang (Versuch)“:
  Umschalter „Bisher / Echte Instrumente“ und je Probesong „▶ Bisher“ /
  „▶ Echt“ zum direkten Vergleich (eine Schleife ab der Eins plus Schluss).
  Mit „Echte Instrumente“ kommen in Stufe 1 und 2 nur die Probesongs dran
  (Stufe 1: Fahrradkette, Stadtrand; Stufe 2 dazu Gummistiefel), nie zweimal
  direkt hintereinander.
- **Laden:** erst beim ersten Gebrauch, nicht im Shell-Cache. Offline oder bei
  einem Ladefehler (8 s) klingt es wie bisher. Die Stille am Anfang jeder Datei
  (MP3-Vorlauf) schneidet die App beim Laden ab, damit die Schläge nicht
  verspätet kommen.
- **Was bleibt synthetisch:** Klick (Eins betonen), Vorklatschen der Hilfen,
  Stabs. Die Bassdrum ist eine Konzert-Bassdrum aus VCSL, darüber liegt die
  bisherige synthetische Bassdrum für den Punch (VCSL hat kein Rock-Drumset).
- **Pegel geschätzt**, gemessen im Browser ähnlich laut wie bisher
  (RMS 0,10–0,13 gegenüber 0,10). Streicher-Samples sind 3,2 s lang; längere
  Flächen (Stadtrand, ♩ 68–78) klingen am Taktende aus statt durchzuhalten.
- Tests: Samples decken alle Töne der Probesongs in jeder Tonart ab (±1,5
  Halbtöne), Aufgaben nur aus Probesongs, Einstellung wird gespeichert. Im
  Browser: alle 54 Dateien geladen, keine Fehler.

Offen nach dem Probehören: weiter so (dann alle Songs, Stabs/Bläser, längere
Streicher, Samples offline cachen) oder verwerfen (Ordner `samples/` und den
Abschnitt in `uebe-lab.html` entfernen).

## Offene Punkte

- Etappen 2–5.
- Echter Shuffle-Beutel (ohne Zurücklegen über Sitzungen) bräuchte ein eigenes
  Feld in der Ablage; vorerst Gedächtnis von 8 Aufgaben.
- Pegel der neuen Spuren sind geschätzt (siehe Probehör-Liste).
