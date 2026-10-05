# Bericht: Rhythmus-Kurs pop-gerecht

Grundlage: `ARBEITSANWEISUNG-POP-RHYTHMUSKURS.md` (im ersten Commit eingecheckt), dazu die
Regeln aus Abschnitt 1 und 3 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`. Ausgangsstand
`a9213fc` (= `main` beim Start, `SW_VERSION` v369). Alle fünf Pakete sind umgesetzt,
keins wurde zurückgesetzt. Branch `pop-rhythmuskurs`, kein Rebase, kein Merge von `main`,
kein Force-Push.

## Status

| Paket | Inhalt | Status | Commit | SW_VERSION | Prüfungen |
|---|---|---|---|---|---|
| 1 | Wiedergabe-Marke stetig über den Taktstrich | umgesetzt | `98d8182` | v370 | `markCheck(500)`: alle 25 Kurs-Lektionen + je 500 Muster pro Stufe 1–6 + 500 Muster 12/8 (4 Takte, Auftakt) + 500 Zweistimmig-Paare, Abtastung in 0,05-Tick-Schritten: monoton, größter Schritt 1,85 × Nenngeschwindigkeit (Grenze 2 ×; `xOf` springt dagegen um das 122-Fache), an Notenanfängen = `xOf`, im Takt = `xOf`; Notenbild-SVG der 25 Lektionen (mit und ohne Silben) byte-gleich vorher/nachher |
| 2 | Hilfen nach Übungsart | umgesetzt | `7bb6ea8` | v371 | `visibleAids` jede Zeile der Tabelle; Platzhalter-SVG für vier verschiedene verborgene Phrasen (1 Takt / 4 Takte mit Auftakt und Sechzehnteln / 6/8 / freies Nachklatschen) identisch, ohne Taktstriche, Taktangabe, Zeitleiste; Ergebnis im Kurs (Schritt 1–3) ohne Notenköpfe, aber mit Zeitleiste, Soll-Punkten, Tippern; Roundtrip `markSelf` (neu / alt / kaputt) |
| 3 | Kapitel nach Funktion, 8 neue Lektionen, Zusatzkapitel | umgesetzt | `0f0f333` | v372 | alle 25 alten + 8 neuen IDs vorhanden; alter Stand mit allen 25 alten IDs lädt unverändert, `lesson: 'walzer'` bleibt; `duoOstinato` jeder haltbaren alten ID bleibt gültig; Zähler `['puls','walzer']` → 1/26 und 1/7; Notenbild-SVG der 25 alten Lektionen byte-gleich; Shuffle (Einsätze 0, 8, 12, 20, 24, 36; Zusammenhang nur mit Viertel-Takten), 12/8 (Einzähler 72 Ticks, Tempo-Bezug punktierte Viertel), Halten (Zweistimmig) für alle neuen Lektionen |
| 4 | Kursablauf: erst hören, zuletzt lesen | umgesetzt | `47d69a9` | v373 | `courseSteps` für kombinierbare und nicht kombinierbare Lektionen × `notes: 'last'/'off'` (4 bzw. 3 Schritte, nie `read`); 200 Wiederholungsrunden: nur `echo`; Roundtrip `course.notes`/`course.syl` (neu, gespeichert `'ta'`, alt ohne Feld → `'last'`/`'count'`, kaputt → Standard) |
| 5 | Groove-Begleitung | umgesetzt | `c6bec30` | v374 | Zuordnung Kapitel 1 / `backbeat` / 16tel-Lektion (Raster 3) / Shuffle (0 und 8) / Triole (4) / Kapitel 7 / `course.accomp = 'click'`; „Groove verrät nichts“ für alle 33 Lektionen × 4 Stufen; 12 Runden mit wechselndem Auftakt: pro Tick genau die erwarteten Schläge, keine Doppelschläge, im Einzähler nur Klick; Roundtrip `course.accomp`, `state.accomp`; **Vorher/Nachher**: freie Übungen (Stufe 1, 3, 4, 5 in 6/8, 6) mit Standard „Klick“ erzeugen mit festem Zufall exakt dieselben Klick-, Klatscher- und Musterfolgen wie `47d69a9` (39 233 Zeichen JSON identisch); Pegelprüfung in `selfCheckAudio` |

Jedes Paket wurde vor dem Commit so geprüft (Playwright mit dem vorinstallierten
Chromium, nichts nachinstalliert):
- Syntax der Inline-Skripte mit `node --check`.
- `uebeLab.selfCheck()` (`[]`), im Paket 5 zusätzlich `uebeLab.selfCheckAudio()` (`[]`, 6 Läufe
  wegen des Zufallsrauschens).
- `chorApp.selfTest()`, `chorApp.selfTestAsync()`, `chorApp.selfTestMusic()`: alle `[]`.
- Sichtprüfung per Screenshot (390 px): Marke im Kurs-Schritt „So sieht es aus“, Nachklatschen
  während der eigenen Runde (leer) und danach (Auswertung), Vom Blatt eigene Phase (Marke
  aus, Zeitleiste an), neue Lektionen (Shuffle, 12/8), Lektionsliste mit Zusatzkapitel,
  Einstellungsblatt des Kurses.
- Prüfskripte lagen im Scratchpad, nicht im Repo.

## Je Paket

### 1 – Wiedergabe-Marke
- **Dateien:** `uebe-lab.html`, `sw.js`
- **Geändert:** neue reine Funktion `markX(line, pattern)`; `phraseLines()` hängt `px` und
  `markX` an jede Zeile, `updateView()` benutzt `line.markX(t)`. Stützstellen: Anfänge aller
  Noten und Pausen der Zeile plus rechter Rand des letzten Segments; Ganztaktpausen am
  zeitlichen Anfang. Das Notenlayout ist unverändert. `markCheck()` in `selfCheck()`;
  `COURSE`, `lessonPattern`, `phraseLines`, `markX` u. a. über `window.uebeLab` exportiert.
- **Abweichungen:** keine. Der größte Tempo-Zuwachs der Marke liegt bei 1,85 × (letzter Sechzehntel
  vor dem Taktstrich), also unter der geforderten Grenze 2 ×.

### 2 – Hilfen nach Übungsart
- **Dateien:** `uebe-lab.html`
- **Geändert:** `visibleAids({ mode, phase, course, showNotes, markSelf })` mit der Tabelle aus
  der Anweisung; `roundAids()` (nach der Runde bleibt die Auswertung sichtbar, ohne Marke);
  neutraler Platzhalter „Rhythmus nach Gehör“ (eine Zeile, ohne Taktstriche, Taktangabe und
  Zeitleiste); Zählzeit-Punkte im Tippfeld nur im Einzähler, wo verborgen; Einstellung `markSelf`
  (Zahnrad der freien Übungen) mit dem Hilfetext aus der Anweisung; Satz im `#help-modes`
  ergänzt; `stageSvgHtml()` als testbare Fassung von `renderStage()`.
- **Abweichungen:** Im Kurs-Schritt 1–3 zeigt auch die Vorschau vor dem Start den Platzhalter
  statt des Notenbilds der Lektion (sonst wäre der Rhythmus vorab lesbar). „Vom Blatt“ zeigt in der
  eigenen Phase keine live gezeichneten Tipper mehr (Tabelle: aus); das Ergebnis erscheint danach.
  Beim freien Nachklatschen ohne Noten steht während des Vorspielens der nächsten Runde weiter
  das Ergebnis der vorigen Runde (unverändertes Verhalten, „Rückmeldung nach dem Tun“).

### 3 – Kursinhalt
- **Dateien:** `uebe-lab.html`
- **Geändert:** `COURSE_CHAPTERS` (7), `COURSE_EXTRA_CH`; `COURSE` in der Reihenfolge aus 3b (33
  Lektionen, 26 im Kurs + 7 Zusatz), acht neue Lektionen wörtlich aus 3c, `offbeat.more` und
  `16achtel.more` nach 3d; `shuffle: true` (Lektions-Feld) und `accomp` (optional);
  `coursePattern(..., shuffle)` markiert 8/4-Ticks als `sh`; Zähler „x/26“ (Kachel, Blatt, Leiste)
  nur für Kapitel 1–6, eigener Zähler und Überschrift „Zusatz (freiwillig)“ im Blatt;
  `nextLesson()` führt nach `clave` nicht ins Zusatzkapitel, dort steht „Kurs geschafft! …“.
  `courseCheck()` erweitert (Shuffle-Darstellbarkeit, alte IDs, Zähler, Roundtrips, Shuffle/12-8-Ablauf).
- **Abweichungen (mit Grund):**
  - „Im Zusammenhang“ mit Shuffle: Partner nur aus reinen Viertel-Takten, gerade Lektionen nie mit
    einem Shuffle-Takt — sonst stimmte die Angabe „Shuffle ♫ = ♩ ♪³“ für die ganze Phrase nicht.
  - 12/8 hat als erste kombinierbare 12/8-Lektion keinen bekannten Partner; der bisherige
    Ersatz-Takt `24 24` passte nur zu 4/4. Neu `fallbackBar(m)` (12/8: `36 36`).
  - `holdRound` (Zweistimmig) kennt Shuffle und 12/8: Gegenstimmen swingen mit bzw. füllen 72 Ticks;
    Ganztaktpause in 12/8 (72) und Shuffle-Achtel (8) zählen in `holdCheck` als darstellbar.
  - Die Spielanweisung „Shuffle ♫ = ♩ ♪³“ steht jetzt etwas höher (`y + 7,5` statt `+ 12`), weil sie
    in der neuen Shuffle-Lektion mit dem Hals der letzten Note kollidierte. Das gilt auch für die
    freien Shuffle-Übungen.
  - Textlänge: Die neuen Texte erfüllen intro ≤ 160 / more ≤ 185; die bestehenden Grenzen
    (260/320) für alle Lektionen bleiben.

### 4 – Kursablauf
- **Dateien:** `uebe-lab.html`
- **Geändert:** `courseSteps` wörtlich nach 4a; `course.notes` (`'last'`/`'off'`) mit Zeile im
  Kurs-Zahnrad, Änderung setzt die Lektion auf Schritt 1; Wiederholung nur `echo`; `course.syl`
  Standard `count`; Statuszeile „— Play startet mit dem Nachklatschen.“, Kommentar zum
  Mitklatschen, Hilfetext der Wiederholung und Fußnoten im Kurs-Zahnrad angepasst.
- **Abweichungen:** Der Modus `read` bleibt im Code (freie Übung „Vom Blatt“), nur der Kurs benutzt ihn
  nicht mehr. `courseRoundSpec` liefert zusätzlich `accomp` (Stufe der Begleitung, Paket 5).

### 5 – Begleitung
- **Dateien:** `uebe-lab.html`, `README.md`
- **Geändert:** `engine.drum('kick'|'snare'|'rim'|'hat', …, dest)` (Kopie aus `metronom.html`, Stand
  `e08b9d5`); `ACCOMP`, `ACCOMP_LEVELS`, `accompFor`, `freeAccomp`, `accompHits`, `hatGridFor`;
  Begleitung pro Runde (`round.accomp`), im `scheduleTick` statt des Zählzeit-Klicks (Einzähler bleibt
  Klick); Einstellungen `course.accomp` (Kurs-Zahnrad) und `state.accomp` (freie Übungen, bei
  Zweistimmig ausgeblendet); Mikrofon-Hinweis „… hört das Mikrofon den Klick bzw. das Schlagzeug“;
  `accompCheck()` in `selfCheck()`; Pegelprüfung in `selfCheckAudio()`; README-Absatz zu `uebe-lab.html`.
- **Abweichungen (mit Grund):** Pegel siehe unten — die Vorbild-Klatscher mussten in Runden mit Groove
  angehoben werden, ein bloßes Absenken des Schlagzeugs um 8 dB genügte nicht. Der Ausgleichs-Takt
  (Pause zwischen zwei Runden zum Ausrichten auf den Taktstrich) gehört zur nächsten Runde und spielt
  deren Groove; ohne Auftakt kommt er nicht vor.

## Gewählte Pegel und Klangparameter der Begleitung (Paket 5)

Vorlage `metronom.html` `drum()`; Ausgang über `run.bus` (Ausblenden beim Stoppen greift).

| Größe | Wert | Anmerkung |
|---|---|---|
| `ACCOMP_GAIN` (alle Schläge) | 0,3 = −10,5 dB | Richtwert der Anweisung: −8 dB gegenüber dem Metronom-Tool (0,4) |
| Bassdrum | Anfangspegel 0,45 statt 0,8, Sweep 150 → 45 Hz in 0,11 s | trägt die meiste Energie, deshalb zusätzlich abgesenkt |
| Snare | Körper 165 Hz Dreieck (Vorlage 185), Rauschen Bandpass 1,2 kHz, Q 0,9 (Vorlage 1,8 kHz, Q 1,1), Abklingzeit 0,11 s (Vorlage 0,16) | dunkler und kürzer als der Klatscher (1,5 kHz) |
| Rim (6/8) | wie Vorlage: Rechteck 1,7 kHz, Bandpass 2 kHz, 25 ms | |
| Hi-Hat | wie Vorlage: Rauschen Hochpass 7 kHz, 45 ms | flaches Raster ohne Akzente |
| Vorbild-Klatscher in Runden mit Groove | `CLAP_WITH_ACCOMP` = 3 (+9,5 dB) | ohne Groove unverändert (bewiesen durch den Vorher/Nachher-Vergleich) |

Messung (Effektivwert nach Hochpass 300 Hz, in 10⁻³; `selfCheckAudio`): Klatscher mit Anhebung 7–8 (schwankt
mit dem Zufallsrauschen), Bassdrum 5,2, Snare 2,4, Rim 0,8, Hi-Hat 0,7 (Bassdrum mit dem Pegel der Vorlage wäre 6,9 gewesen).
Prüfung: Klatscher > 1,5 × Snare/Rim/Hi-Hat und > 1 × Bassdrum. Ob das im Kopfhörer und über den Handylautsprecher
gut klingt, muss ein Mensch hören (Checkliste).

## Hörtest- und Sehtest-Checkliste für morgens

Paket 1
- [ ] „Das Achtelpaar“ und „Die vorgezogene Eins“ bei 60 BPM im Schritt „So sieht es aus“ mitklatschen:
      die Marke läuft ohne Ruck über den Taktstrich.
- [ ] Eine Lektion mit zwei Takten je Zeile (z. B. „Der Auftakt“) beobachten: kurz vor und nach dem
      Taktstrich sitzt die Marke an der richtigen Stelle.

Paket 2
- [ ] Nachklatschen (frei und im Kurs): während der eigenen Runde steht nur „Rhythmus nach Gehör“,
      keine Marke, keine Zählzeit-Striche; die Punkte im Tippfeld gibt es nur im Einzähler.
- [ ] Danach erscheint die Auswertung (im Kurs Schritt 1–3 ohne Notenköpfe).
- [ ] Vom Blatt: Lesephase mit Marke; eigene Phase ohne Marke (mit Schalter „Mitlaufende Marke …“ mit Marke).
- [ ] Zweistimmig sieht aus und funktioniert wie vorher.

Paket 3
- [ ] Shuffle: Das Vorbild klingt triolisch (lang-kurz), nicht gerade.
- [ ] 12/8-Ballade: Einzähler auf den großen Schlägen (Achtel-Klick, die Betonung sitzt auf 1, 4, 7, 10).
- [ ] „Einsatz auf dem ‚a‘“ und „Einsatz auf dem ‚e‘“: Der Klatscher kommt hörbar knapp vor bzw. nach dem Schlag.
- [ ] Kurs-Abschluss: Nach „Die Son-Clave“ steht die Zeile „Kurs geschafft! Im Zusatzkapitel warten …“.

Paket 4
- [ ] Kursleiste mit vier Schritten; Schritt 4 zeigt Noten, Silben („1 + 2 +“) und Marke.
- [ ] Einstellung „Notenbild im Kurs: aus“: drei Schritte, nie Noten.

Paket 5
- [ ] Vorbild-Klatscher über vollem Groove gut hörbar; Snare und Klatscher unterscheidbar (Kopfhörer und Handylautsprecher).
- [ ] Ausdünnen von Schritt 1 (voll) über Schritt 2 (Bassdrum + Snare) zu Schritt 3 (nur Snare) ist hörbar.
- [ ] „Der Backbeat“: nur Bassdrum auf 1 und 3, man selbst ist die Snare.
- [ ] Stoppen ohne Nachklingen.
- [ ] Freie Übungen: Begleitung „Groove“ in 4/4 mit Shuffle-Muster (Hi-Hat auf 0 und 8) und mit Sechzehnteln.
- [ ] 6/8 und 12/8 (Kick + Rim bzw. Snare) klingen stimmig; 3/4, 2/4 bleiben bei Klick.

## Morgens im Browser ausführen

Ein Headless-Chromium war vorhanden, alles Genannte ist nachts gelaufen. Zum Wiederholen:

```js
// Konsole von uebe-lab.html (eigenständig geöffnet oder im iframe):
uebeLab.selfCheck()          // → []
await uebeLab.selfCheckAudio() // → []   (Pegel der Begleitung, mehrfach ausführen: Zufallsrauschen)
uebeLab.markCheck(500)       // → []   (etwa 20 s)
// Konsole der App:
chorApp.selfTest(); await chorApp.selfTestAsync(); await chorApp.selfTestMusic() // je []
```

## Zu entscheiden

- Soll Zweistimmig dieselben Sichtbarkeitsregeln bekommen (Marke nur in Lesephasen)? Heute unverändert
  (alles sichtbar), weil die Anweisung es so festlegt.
- Soll die Begleitung in freien Übungen künftig standardmäßig „Groove“ sein? Heute „Klick“.
- Soll „Im Zusammenhang“ auch Partner aus späteren Kapiteln mischen? Heute nur frühere Lektionen
  derselben Taktart (mit Shuffle nur Viertel-Takte).
- Passen die Starttempi der neuen Lektionen zum Chor (Sechzehntel-Kapitel bei 66 BPM, Shuffle 88, 12/8 56)?
- Beim freien Nachklatschen ohne Noten bleibt während des Vorspielens der nächsten Runde das Ergebnis der
  vorigen (mit Notenköpfen) stehen. Im Kurs gibt es das nicht. Soll das auch dort verschwinden?
- Die Marke im Singen-Modus „Im Takt“ (`uebe-lab.html`, Anzeige beim Mitlesen der Melodie) benutzt weiter
  `line.xOf(t)` und springt an den Taktstrichen ebenso — nicht Teil dieses Auftrags, dieselbe Lösung
  (`markX`) ließe sich übernehmen.
- Bei Klick statt Groove ist der Vorbild-Klatscher unverändert leise (Spitze etwa 0,05–0,09). Die Anhebung
  nur in Groove-Runden vermeidet Änderungen am bisherigen Klang; ein allgemein lauteres Vorbild wäre möglich.
- Das Hi-Hat-Raster der freien Übungen kennt keine Triolen (nur Sechzehntel/Shuffle/Achtel, wie in der
  Anweisung); Stufe 6 mischt Triolen und Achtel — dort läuft das Achtel-Raster.
- Das Zusatzkapitel „Walzer, Barock und Klassik“ läuft mit Klick (keine Begleitung), auch in 4/4-Lektionen
  („Die punktierte Achtel“).
