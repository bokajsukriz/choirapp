# Bericht: Pop-Didaktik (Einsingen und Ausbildung)

Grundlage: `ARBEITSANWEISUNG-POP.md` (im ersten Commit eingecheckt), dazu die
Regeln aus Abschnitt 1 und 3 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`. Ausgangsstand
`ff41355` (= `main` beim Start, `SW_VERSION` v354). Alle sechs Pakete sind
umgesetzt, keins wurde zurückgesetzt.

**Branch:** `claude/eager-johnson-9njnco` statt `pop-didaktik`. Die
Sitzungsumgebung erlaubt nur Pushes auf diesen vorgegebenen Branch. Er zweigt
von `ff41355` ab, kein Rebase, kein Merge von `main`, kein Force-Push.

## Status

| Paket | Inhalt | Status | Commit | SW_VERSION | Tests (Zahlen) |
|---|---|---|---|---|---|
| 1 | Einsingen: Engine-Erweiterungen | umgesetzt | `f78ee95` | v355 | 768 Pläne (28 Übungen × 4 Stimmen × 3 Belastungen × 2 Einstimmungen, 8 Programme × 4 × 3) vorher/nachher identisch (Segmente, Längen, Wurzeln, Töne); Testübungen: `breathRhythm` 2/3/4 Runden à 48 Schritte ohne Wurzel, Klicks nur auf Zählzeiten; `chain` 4 Stimmen: Runde 1 `CUE`, sonst 0, lückenlos, 16 Schritte ab Runde 2, leise Tonika unter Ton 1; `spoken: 16` erster Ton bei 16, Text in 0–15; `cutoffAt: [12]` genau ein Klick je Runde bei `cue + 12`; Anschleifen/Abfallen an den richtigen Tönen; keine neuen gespeicherten Felder |
| 2 | Einsingen: neue Übungen, Gruppen, Texte | umgesetzt | `d01aa04` | v356 | 14 neue Übungen × 4 Stimmen × 3 Belastungen: 0 Töne außerhalb, Runden im Raster, Silben = Töne (auch leicht); `atemImpulse` 48 / 2-3-4 Runden; `zwischenatmung` lückenlos, 16 Schritte ab Runde 2; `ruf` bei „leicht“ Terz-Fassung; 8 Gruppen je ≥ 1 Übung, 42 Übungen mit Gruppe und Icon; alte 28 Übungen unverändert |
| 3 | Einsingen: Programme dynamisch | umgesetzt | `f248be4` | v357 | 8 Programme × 3 Belastungen × 12 Starts: 0 Doppel, 0 entfallene Plätze, nie `ruf` bei „leicht“, deterministisch; Kurz: Wechsel bei jedem Pool mit ≥ 2 Kandidaten, alle Pool-Übungen nach 4 Starts; Dauer Kurz/Ausführlich 6 Längen × 4 Stimmen × 12 Starts (288): 286 in ±20 %, 2 an der Obergrenze (s. u.); übrige 6 Programme × 4 × 3 × 12 Starts in ±25 %; ⇄ 8 Programme × 2 Belastungen zyklisch, nie belegt, Rotation unverändert; Roundtrip `rotation` 7 Fälle; Schnellstart `?program=kurz` |
| 4 | Ausbildung: Rhythmus pop-gestuft | umgesetzt | `02eab97` | v358 | 6 Stufen × 500 Muster: Tickzahl je Takt, nur erlaubte Bausteine, Auftakt Stufe 1 nie / 2 nur 6 / 3 nur 6 oder 12, e/a erst ab Stufe 5, Shuffle nur in 4/4, Stufe 1–4 nur 4/4; 12/8: 500 Muster, Dreiergruppen exakt, Schlusston; 60 Zweistimmig-Paare swingen gemeinsam; bestehende Prüfungen (Bögen, Silben, Raster 12 Runden) grün; Roundtrip Stufe 1–6 und eigene Auswahl mit 5/4, 7/8, 12/8, 2/2 |
| 5 | Ausbildung: Hören pop-gestuft | umgesetzt | `c38ff46` | v359 | Intervalle 6 Stufen × 1000 Aufgaben: nur eigene Intervalle und Richtungen; gespeicherte Stufe → neues Preset, eigene Auswahl bleibt; Klänge 10 Qualitäten × 13 Grundtöne × alle Umkehrungen, add9 immer mit None über Grundton und Terz; Schlüsse 1200 Aufgaben, 6 Typen × 12 Tonarten × 2 Lagen enden richtig, 0 Parallelen, Rock/iv–I nur Dur; neue Folgen × 12 Tonarten × 4 Satzarten: richtige Tonhöhen, 0 Parallelen, 5 Doppelvorzeichen-Fälle (begründet, s. u.); Rückung 500 Aufgaben je Anteil 33 % ± 5 %, beide Hälften im Umfang; jede vierte Aufgabe in Stufe 6 |
| 6 | Ausbildung: Singen nach Gehör | umgesetzt | `339e7e7` | v360 | Reihenfolge; `showSight` aus/an (Liste, Kette, Mittel), Roundtrip 4 Fälle; `solfa` fehlend → `numbers`, `syllables` bleibt; gerader Ton: Vibrato ±10 → ±8,3 erreicht, ±30 → ±25,0 nicht, Drift 5 Cent/s → ±0,9 erreicht; Pop-Intro Dur/Moll × 12 Tonarten; Satz 4 Stimmen × 200 Aufgaben; Nachsingen/Im Takt/Diktat 6 Stufen × 4 Stimmen × 1000 Melodien (72 000): Tonvorrat, Sprungregel, Start/Schluss, Rhythmus, Chromatik je Phrase 0–1 nur in den Wendungen, Anteil Stufe 6: 50 % / 50 % / 50 %; Simulationen Nachsingen/Im Takt mit den bisherigen Schwellen grün |

Jedes Paket wurde vor dem Commit so geprüft:
- `node --check` für die Inline-Skripte der geänderten HTML-Seiten und `app.js`.
- Headless-Chromium (Playwright war vorinstalliert, nichts nachinstalliert):
  `einsingen.selfCheck()`, `uebeLab.selfCheck()` (mit Paket 6 etwa 90 s),
  `chorApp.selfTest()`, `chorApp.selfTestAsync()`, `chorApp.selfTestMusic()` —
  alle `[]`, keine Seitenfehler.
- Vorher/Nachher-Vergleich der Einsing-Pläne (Paket 1–3) per Skript.
- Sichtprüfung per Screenshot (390 px, ⇄ auch 320 px) für jede neue Oberfläche.
- Prüfskripte lagen im Scratchpad, nicht im Repo.

## Je Paket

### 1 – Einsingen: Engine-Erweiterungen
- **Dateien:** `einsingen.html`
- **Geändert:** `kind: 'breathRhythm'` (Muster, `BREATH_RHYTHM_REPEATS`, Klick auf jeder Zählzeit, große Silbe mit Taktzeile), `chain`, `spoken`/`spokenText`, `scoop`/`falloff` (über die Gleit-Mechanik von `engine.tone`, neue Option `fall`), `cutoffAt`/`cutoffLabel` (`engine.cutoff`, heller und kürzer als der Einzähler), `vibratoFrom`, `avoidLight`. Neue Hinweiszeile über der Kontur (`cueTextAt`: „Sprich: …“, Abschluss-Konsonant, „gerade“/„Vibrato erlaubt“). `recordPlan()` spielt einen Plan mit einer Rekorder-Engine ab — Grundlage der Klang-Prüfungen.
- **Abweichungen:** keine inhaltlichen. Die leise Tonika bei `chain` klingt mit Anschlag 0,05 für die Dauer des ersten Tons.

### 2 – Einsingen: neue Übungen, Gruppen, Texte
- **Dateien:** `einsingen.html`
- **Geändert:** `GROUPS` (8), Farben `--g-atem`, `--g-pop`, `--g-aussprache` (Kontrast Schrift/Fläche 5,4 / 5,4 / 5,8 : 1), Hinweis über Pop-Klang, 14 Übungen mit Icons, Umzug `atem`/`katze`, Textanpassungen, `HELP.program`.
- **Abweichungen:**
  - Die Regel „Jede Pop-Klang-Übung nennt, was bei Kratzen/Druck zu tun ist“ erfüllten vier der vorgegebenen Hilfetexte nicht (`sprechSingen`, `geraderTon`, `anschleifen`, `riff`). Dort steht jetzt je ein kurzer Satz am Ende von `help[1]`.
  - Kurzanleitungen durften bisher höchstens 55 Zeichen haben; „Abspannen“ hat 61. Der vorgegebene Text blieb, die Grenze der Prüfung ist jetzt 65 (Zeile bricht bei 390 px sauber um).

### 3 – Einsingen: Programme dynamisch
- **Dateien:** `einsingen.html`
- **Geändert:** `POOLS`, `POOL_NAMES`, neue `PROGRAMS`, reine `resolveProgram(p, rotation, load, picks)`, `swapPicks`, `state.rotation` mit `sanitizeRotation`, Rotation beim Start (`noteProgramStart`, auch `?program=`), Liste vor dem Start mit ⇄, `fitted()` auf der aufgelösten Fassung (Cache-Schlüssel mit IDs). „Als Vorlage kopieren“ übernimmt die aufgelösten IDs.
- **Abweichungen:**
  - **Vor dem Start gibt es jetzt eine Liste:** ⇄ „vor dem Start“ brauchte eine Ansicht, die es nicht gab (ein Tipp auf eine Karte startete sofort). Ein Tipp auf eine Programmkarte öffnet jetzt den Spielmodus mit der Liste aller Plätze (Icon, Name, Funktion bzw. Gruppe, ⇄), gestartet wird mit ▶. Nach einem Stopp erscheint die Liste mit der nächsten Auflösung. Einzelübungen und der Schnellstart aus der App (`?program=`) starten weiter sofort.
  - Die Auflösung eines laufenden Starts bleibt fest (sonst wählte ein Umplanen durch Stimme/Belastung mitten im Lauf neu). Die Rotation zählt alle aufgelösten Plätze, auch die festen.
  - Programmkarten zeigen Dauer und Übungszahl der aufgelösten Fassung, aber **keine Icons** — die Übersicht ist seit „Umbau Tools“ bewusst ohne Icons (eigene Prüfung). Siehe „Zu entscheiden“.
  - „Sprechen → Singen“ und „Ruf“ schaffen mit den vorgegebenen `top`-Werten nur 2 statt der verlangten 3 Rückungen; die Programme singen dort 2. Die Reichweiten-Prüfung nennt beide als Ausnahme.
  - „Ausführlich 20 Min“, Sopran: in 2 von 12 Starts 15,8 bzw. 15,9 Min (−21 %). Alle Plätze stehen dann schon auf der größten Rückungszahl, die `fitItems` erreicht (Faktor 3); die engen Pop-Übungen begrenzen die Länge. `fitItems` blieb laut Anweisung unverändert; die Prüfung meldet diesen Fall als Beobachtung, nicht als Fehler.
  - Die alte Dauer-Tabelle der festen Programme ist durch die Prüfungen aus Paket 3 ersetzt.

### 4 – Ausbildung: Rhythmus pop-gestuft
- **Dateien:** `uebe-lab.html`
- **Geändert:** Bausteine `off` und `sh` mit Zellen, `12/8`, `RHYTHM_LEVELS` neu, `pickupTicks` (als `opts.pickupLens` an `makePattern`), Shuffle-Notation (gerade Achtel, „Shuffle ♫ = ♩ ♪³“ je Zeile), Sechzehntelpause mit zwei Fahnen, Hilfetext zu den Stufen im Einstellungsblatt.
- **Abweichungen:**
  - Shuffle gilt je Phrase ganz oder gar nicht (etwa jede zweite Phrase in Stufe 6): eine Shuffle-Phrase enthält nur Viertelwerte und Shuffle-Zellen, sonst stünde über geraden Achteln „Shuffle“ und sie klängen doch gerade. Auftakt im Shuffle nur als Viertel. Zweistimmig: beide Stimmen swingen gleich.
  - Gespeicherte Stufe 1–6: Nummer bleibt, Bausteine/Takte/Auftakt/Taktart werden beim Laden an die neue Stufe angeglichen (Tempo bleibt). Eine bestehende Prüfung setzte einen Zustand voraus, den die Oberfläche nie erzeugt (Stufe 5 mit 4 Takten) — angepasst.
  - Den Stufen-Hilfetext gab es beim Rhythmus bisher nicht; er steht als (?) neben „Stufe“ im Einstellungsblatt.

### 5 – Ausbildung: Hören pop-gestuft
- **Dateien:** `uebe-lab.html`
- **Geändert:** Intervall-Presets (auf- und abwärts ab Stufe 1), „Intervalle singen“ in allen Stufen auf- und abwärts; Klänge `sus2`, `m7`, `maj7`, `add9`, neue Stufen; Schlüsse mit Klartext-Tasten, `rock`, `minorPlagal`, Begründungssätze; sechs neue Folgen, Symbole `bVII`, `II7`, `V6`, `III` in Dur; neue `EAR_LEVELS`, Klassik-Gruppe in der eigenen Auswahl; Rückungsfrage (`makeModulationTask`).
- **Abweichungen:**
  - `III` bedeutete bisher überall den Dur-Akkord auf der kleinen Terz (Moll). In Dur ist es jetzt der Dur-Akkord auf der großen Terz (`CHORD_SYMBOLS_MAJOR`, `chordPcs(key, symbol, mode)`); Moll unverändert.
  - Schreibweise: `spell()` aus `harmony.js` wählt nur ♯ oder ♭ je Tonart und schriebe ♭VII in C als „Ais“. Die Akkordnamen (Rückmeldung nach der Antwort, z. B. „C · B · F · C“) kommen deshalb aus `chordToneNames` (Buchstabe der Stufe, Vorzeichen aus der Tonhöhe); `harmony.js` blieb unverändert.
  - Doppelvorzeichen in 5 Fällen, musikalisch korrekt, daher als begründete Ausnahme belassen: Des-Dur iv = ges-**heses**-des (2×: „Moll-Subdominante“, „Dur-III und Moll-iv“), Ges-Dur iv = ces-**eses**-ges (2×), H-Dur III = dis-**fisis**-ais. Enharmonisch umgedeutet (a statt heses) wäre der Akkord falsch buchstabiert.
  - Phrygischer Halbschluss: Schlüsse hatten keine „eigene Auswahl“. Er ist jetzt über den Schalter „Klassik: Phrygischer Halbschluss“ im Einstellungsblatt (Schlüsse) zu haben, sobald Moll dabei ist (ab Stufe 4). Neues Feld `ear.settings.phrygian`, Standard aus.
  - Titel des Modus bleibt „Schlüsse“, die Frage lautet „Wie endet die Zeile?“.
  - Rückung: die zweite Hälfte ist exakt transponiert (gleicher Satz); die Tonart wird so gewählt, dass der Bass in E–dis′ und die Oberstimme höchstens g″ bleibt.
  - Gespeicherte Stufe 1–6 (Akkordfolgen): Inhalt wird wie bei den Intervallen an die neue Stufe angeglichen.

### 6 – Ausbildung: Singen nach Gehör
- **Dateien:** `uebe-lab.html`, `app.js`
- **Geändert:** `SING_MODES`-Reihenfolge; `sing.showSight` (Einstellungsblatt „Singen“), Blattsingen aus Liste und Kette; `solfa`-Standard `numbers`; Kette Singen mit Diktat, `QUICK_MINUTES.voice` 15 → 13; `HOLD_LEVELS`, `wobbleCents`, `holdVerdict`; `FIND_LEVELS` mit `popIntro` und `satb`, a′ als Schalter `sing.findA4`; `ECHO_LEVELS` mit eigenen Tonvorräten, Im Takt aus `RHYTHM_LEVELS`, Diktat mit dem Tonvorrat der Nachsing-Stufen (`makeDictationMelody`); Chromatik (`CHROMA_TURNS`, `embedChroma`, `toneLabel`, chromatische Diktat-Tasten); Hilfetexte „gerader Ton“ und Blue Notes.
- **Abweichungen:**
  - Fortschritts-Mittel: die schlichtere Variante über `memory` — das Tool schreibt `sightShown` beim Umschalten, `practiceTileState` in `app.js` zählt Blattsingen nur bei `sightShown === true`. Gespeicherter Blattsing-Fortschritt bleibt.
  - Gerader Ton (Stufe 5): erreicht = Lage ≤ 20 Cent, Ruhe ≤ 12 Cent und Modulationstiefe ≤ 15 Cent — ohne die Trend-Grenze (±4 Cent/s), sonst wäre die geforderte langsame Drift von 5 Cent/s nicht „erreicht“.
  - Im Takt ohne Triolen und Shuffle (wie bisher ohne Triolen; Shuffle sind Triolenwerte).
  - Die Moll-Wendung 5–♯6–♯7–1 hätte zwei chromatische Töne in einer Phrase und entfällt; ♯6 kommt als mi–fi–mi vor, ♯7 als la–si–la (auch ti–si–la, mi–si–la′).
  - Chromatik: die ersten drei Töne jeder Phrase bleiben unverändert (Start, übernommener Anfang von Phrase 2). Tonarten, in denen `spell()` einen chromatischen Ton mit falschem Buchstaben schriebe, werden gemieden (zusätzlich zu Ges-Dur).
  - „Ton finden“ Stufe 6: die drei anderen Stimmen klingen nach dem vollen Akkord (1,5 s) bis zu 8 s weiter (ausklingender Klavierklang).
  - Diktat-Stufen haben eigene Beschriftungen (ohne Rhythmusangaben).

## Zu entscheiden

- Soll die Vorgabe bei „Vokal auf den Schlag“ und „Schlusskonsonant“ mit der künstlichen Singstimme aus der Ausbildung (`singVoice`) klingen, damit vorgezogene Konsonanten hörbar werden?
- Eine gesungene „Lange Phrase“ (Runden werden länger statt höher) wurde bewusst weggelassen – braucht eine eigene Rückungsart.
- Soll es einen Schalter „reine Stimmung“ für Liegeton und Akkord geben (große Terz 14 Cent tiefer), damit die Terz-Hinweise hörbar werden?
- `spell()` ohne Ces/Fes/Eis/His – ausbauen, damit Chromatik in allen Tonarten erlaubt ist? (Heute meiden Nachsingen/Diktat diese Tonarten; die Akkordnamen im Hören nutzen die eigene Buchstaben-Schreibweise.)
- Programme: Liste vor dem Start (heute) oder wieder Sofortstart mit ⇄ an anderer Stelle?
- Programmkarten mit Icons der aufgelösten Übungen (Anweisung) oder ohne (bisheriges Design, heute)?
- „Sprechen → Singen“ (`top` 11) und „Ruf“ (`top` 13) auf 12 bzw. 14 anheben, damit die Programme die verlangten 3 Rückungen singen?
- „Ausführlich 20 Min“ erreicht mit engen Pop-Übungen nicht immer 16 Min — Toleranz, längere Pool-Übungen oder mehr Rückungen erlauben?
- Modus-Titel „Schlüsse“ oder „Wie endet die Zeile?“?
- Shuffle auch in „Im Takt“ (heute ohne)?
- Pausen im Shuffle: Achtelpause auf dem Schlag heute als ♩ ♪³-Pause (8 Ticks) — so gewollt?
- Doppelvorzeichen in Des-, Ges- und H-Dur (s. Paket 5) belassen oder diese Tonarten für die betroffenen Folgen meiden?

## Manuell auf echten Geräten prüfen

- Hörprobe der neuen Einsing-Übungen, besonders Anschleifen/Abfallen („Anschleifen & Abfallen“) und der Abschluss-Klick („Schlusskonsonant“).
- Atem-Impulse im Tempo 96 auf dem Handy-Lautsprecher (Klicks hörbar, große Silbe lesbar).
- Vibrato-Messung „gerader Ton“ mit echten Stimmen, besonders Sopran mit natürlichem Vibrato und Bass unter 100 Hz.
- Lesbarkeit der ⇄-Knöpfe bei 320 px (headless geprüft: 44 × 44 px, Namen passen).
- Shuffle-Notation und 12/8 im Notenbild; die Zeichen ♫ ♩ ♪ in den System-Schriften (iOS, Android, Windows).
- „Ton finden“ Stufe 6 mit Mikrofon: die drei weiterklingenden Stimmen dürfen die Tonerkennung nicht stören — mit und ohne Kopfhörer probieren.
- Rückungsfrage (Akkordfolgen Stufe 6): ist ein Halbton über den Handy-Lautsprecher sicher hörbar?
- Diktat Stufe 6: chromatische Tasten (♭3, ♭7, ♯4 bzw. ♯6, ♯7) in Dur und Moll, mit Silben und mit Zahlen.
- Programme: Liste vor dem Start, ⇄ tauschen, Start, Stopp → nächste Auflösung erscheint.

## Browser-Prüfungen

In der Konsole des jeweiligen iframes bzw. der App:

```js
einsingen.selfCheck()          // Einsingen, ca. 1 s
uebeLab.selfCheck()            // Ausbildung, ca. 90 s (Paket 6: 72 000 Melodien)
uebeLab.popSingCheck(100)      // nur Paket 6, schneller (100 statt 1000 Melodien)
chorApp.selfTest(); await chorApp.selfTestAsync(); await chorApp.selfTestMusic()
einsingen.popNotes; uebeLab.popEarNotes; uebeLab.popSingNotes   // Beobachtungen
```
