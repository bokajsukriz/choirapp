# Review Musiktheorie – Groove Lab, Ausbildung, Einsingen, Metronom, Piano

Stand: `main` @ `2547af7` (Merge PR #140), `SW_VERSION = 'v293'`.
Geprüft am Code; Harmonik und Stimmführung zusätzlich per Node-Skript über
alle Folgen × 12 Tonarten × 4 Modi durchgerechnet (Skripte siehe Anhang).
Noch nichts umgesetzt.

Tonnamen im Bericht: MIDI 60 = c′, 48 = c, 36 = C (Helmholtz).

---

## 1. Zusammenfassung

Die Harmonik des Groove Labs ist rein tonleitereigen: Moll ist äolisch, deshalb
erklingt jede „Kadenz“ in Moll mit Moll-Dominante ohne Leitton, und die
Andalusische Kadenz endet auf e-Moll statt E-Dur – die Ausbildung (uebe-lab)
macht es richtig, die Tools widersprechen sich. Modusgebundene Folgen lassen
sich in jedem Modus wählen, und der Zufalls-Knopf kombiniert Modus und Folge
blind. Der SATB-Satz im Groove Lab erzeugt bei 651 von 4 320 Akkordwechseln
(15 %) Quint- oder Oktavparallelen, verdoppelt teils den Leitton; in der
Ausbildung sind es 114 von 768 Wechseln (15 %). Der Pachelbel-Text ist falsch,
„Kadenz in drei“ ist eine Halbschluss-Schleife, der Blues hat keine
Dominantseptakkorde und „Blue Third“ keine Blue Note. Eine Aufnahme, die
kürzer ist als die Akkordfolge (1–4 Takte gegen bis zu 12 Akkorde), wird beim
Loopen über fremde Akkorde transponiert. Im Einsingen liegen bei „Die Katze …“
alle betonten Silben auf Offbeats, und es gibt nur Dur. Der Befund „Avoid
Notes auf schweren Zählzeiten“ ist weitgehend widerlegt (nur 3 Stellen). Neu
dazu: Tonnamen mischen deutsche und englische Schreibweise, die
Solmisation im Piano hat „Si“ = Gis, drei verschiedene Stimmumfang-Tabellen,
und die Harmonik-Daten des Groove Labs sind für `runSelfTests()` nicht
erreichbar.

---

## 2. Befunde

Schweregrad: **F** = Fehler, **V** = Verbesserung, **G** = Geschmack.

| Nr. | Tool | Datei:Zeile | Problem | Grad | Aufw. | Status |
|---|---|---|---|---|---|---|
| 1 | Groove Lab | groove-lab.js:348, 366–368, 378 | Moll äolisch → v statt V; Grundkadenz a-Moll = a–d–e–a; Andalusisch a–G–F–e | F | M | bestätigt |
| 2 | Groove Lab | groove-lab.js:376–379 | modal/rock3/andalusian/epic in jedem Modus wählbar → I–vii°–IV–I, I–vii°–vi–V, I–vi–iii–vii° | F | S | bestätigt |
| 3 | Groove Lab | groove-lab.js:365 | Blues ohne Septakkorde; globaler `sevenths`-Schalter ergäbe Cmaj7/Fmaj7 statt C7/F7 | V | M | bestätigt, präzisiert |
| 4 | Groove Lab | groove-lab.js:475–503 | voiceChord: 651/4 320 Wechsel mit Parallelen; Leitton verdoppelt; vii° immer Grundstellung | F | M | bestätigt |
| 5 | Texte | strings.js:549, 1888, 3227 | Pachelbel: „Bass schrittweise absteigend“ falsch (D–A–H–Fis–G–D–G–A) | F | S | bestätigt |
| 6 | Texte | strings.js:525/546 (+EN/PL) | „Kadenz in drei“ = Halbschluss-Schleife; in Moll „führt“ v nicht zurück | V | S | präzisiert |
| 6b | Texte | strings.js:545 (+EN/PL) | Grundkadenz „schließt ganz eindeutig“ – falsch in Moll, Dorisch, Mixolydisch | F | S | neu |
| 7 | Beide | uebe-lab.html:1080, 1090; groove-lab.js:367, 369 | Gleiche ID `plagal`, anderer Inhalt; gleicher Inhalt, andere ID (`tsd`/`cadence3`); „Kadenz“ vs. „Grundkadenz“ | V | S | bestätigt |
| 8 | Ausbildung | uebe-lab.html:1189 | Bass Grundstellung = 36 + pc → C bis H (MIDI 36–47); 4 Tonarten unter E | V | S | bestätigt |
| 9 | Ausbildung | uebe-lab.html:1164–1168 | „Umkehrungen zufällig“: freie Quartsextakkorde, vii° in Grundstellung; Parallelen 114/768 | V | M | bestätigt |
| 10 | Ausbildung | uebe-lab.html:1070–1108 | Fehlen: V7, Kadenzquartsext, phrygischer Halbschluss, sixte ajoutée | V | M | bestätigt |
| 11 | Groove Lab | groove-lab.js:2111–2123, 183, 191, 219 | Sequenzmechanik bestätigt; Avoid Notes auf Zz. 1/3 nur 3× | G | S | größtenteils widerlegt |
| 12 | Groove Lab | groove-lab.js:197 | „Blue Third“ = Arpeggio 1-3-3-5-7-5, keine Blue Note (obwohl `alt` existiert) | F | S | bestätigt |
| 13 | Groove Lab | groove-lab.js:110–112 | Drums im 16tel-Raster; nur die Pad-Rolle spielt Achteltriolen (1,33) | V | S | präzisiert |
| 14 | Groove Lab | groove-lab.js:80, 113, 1939 | Swing nur auf 16teln, Swing Soul ohne Achtel-Hat; Deep House Open-Hat auf 7/15 statt Achtel-Offbeats | G | S | bestätigt |
| 15 | Groove Lab | groove-lab.js:120–122 | Waltz Step: Bass auf 1 (Grundton) und 3 (Quinte); Metronom-Walzer richtig um-pa-pa | G | S | bestätigt |
| 16 | Groove Lab | groove-lab.js:3987–4045, 4076 | Aufnahme akkordrelativ; 1–4 Takte gegen bis 12 Akkorde → transponiert; Oktavfaltung ändert Kontur | F | M | bestätigt, erweitert |
| 17 | Architektur | groove-lab.js:359 / uebe-lab.html:1075 | Zwei Folgenlisten, zwei Moll-Logiken, zwei Satz-Algorithmen | V | L | bestätigt |
| 18 | Einsingen | einsingen.html:259–261, 325–327 | Übung beginnt auf Zz. 3 (CUE = 8); Kat/tritt/Trep/krumm auf Achtel-Offbeats | F | S | bestätigt |
| 19 | Einsingen | einsingen.html:250, 283 ff. | Nur Dur (`keyLabel` fest „-Dur“, keine Moll-Stufen) | V | M | bestätigt |
| 20 | Einsingen | einsingen.html:644, 660–664 | Einstimmung nur Tonika-Akkord | V | S | bestätigt |
| 21 | Groove Lab | groove-lab.js:1864–1867 | Zufall wählt Modus und Folge unabhängig → erzeugt Befund 2 selbst | F | S | neu |
| 22 | Groove Lab | groove-lab.js:372–375 | Jazz-Folgen in Moll: ii°7–v7–i7 (Em7 statt E7) – keine Dominante | F | S | neu (Teil von 1) |
| 23 | Alle | strings.js:597; uebe-lab.html:360; piano.html:126; einsingen.html:242–243 | Tonnamen: „E♭/A♭“ neben deutschem „B/H“; Einsingen „Es/As“; Oktaven C4 vs. c′ | V | S | neu |
| 24 | Piano | piano.html:127, 359 | Solmisation fest, nur Kreuz-Silben; „Si“ = Gis (in der romanischen Tradition ist Si = H); widerspricht „E♭“-Beschriftung | V | S | neu |
| 25 | Alle | groove-lab.js:463; einsingen.html:268–273; uebe-lab.html:1164, 1189 | Drei Umfangstabellen: B 40–60 / 41–62 / 36–47 | V | S | neu (erweitert 8) |
| 26 | Tests | groove-lab.js:5361; app.js:17651 | Groove-Lab-Daten nicht exportiert; `runSelfTests()` prüft keine Musik-Tools | V | M | neu |
| 27 | Ausbildung | uebe-lab.html:1083 | „Choral-Schluss“ I–ii–V–I mit ii in Grundstellung; üblich ii6 bzw. IV mit sixte ajoutée | G | S | neu |
| 28 | Metronom | metronom.html:304–312, 352 | 7/8 nur 2+2+3 vorgegeben (Betonungen pro Schlag aber editierbar) | G | S | neu |
| 29 | Metronom | metronom.html:334–353, 354 | Loops, Betonungen, Tempobezeichnungen geprüft – stimmig | – | – | geprüft, ok |
| 30 | Einsingen | einsingen.html:561–566 | Rückung bleibt im Stimmumfang (`exerciseRange` begrenzt auf `ceil`) | – | – | geprüft, ok |
| 31 | Ausbildung | uebe-lab.html:391–405 | Rhythmus-Bausteine: Takt-, Punktierungs-, Synkopenlogik korrekt | – | – | geprüft, ok |

### Durchgerechnete Belege

**Folgen je Modus** (Groove Lab, Stufen wie im Code, `♭` relativ zu Dur):

| id | Dur | Moll | Dorisch | Mixolydisch |
|---|---|---|---|---|
| cadence | I–IV–V–I | i–iv–**v**–i | i–IV–**v**–i | I–IV–**v**–I |
| andalusian | **I–vii°–vi–V** | i–♭VII–♭VI–**v** | i–♭VII–**vi°**–v | I–♭VII–vi–v |
| modal | **I–vii°–IV–I** | i–♭VII–iv–i | i–♭VII–IV–i | I–♭VII–IV–I |
| rock3 | **I–vii°–IV** | i–♭VII–iv | i–♭VII–IV | I–♭VII–IV |
| epic | **I–vi–iii–vii°** | i–♭VI–♭III–♭VII | i–**vi°**–♭III–♭VII | I–vi–**iii°**–♭VII |
| jazz | ii7–V7–I7 | **ii°7–v7**–i7 | ii7–v7–i7 | ii7–v7–Imaj7 |

**Parallelen im Groove-Lab-Satz**, Beispiel Pop in C-Dur, Wechsel V→vi:
G/d′/g′/h′ → A/e′/a′/c″ – Bass–Tenor Quinten G–d / A–e, Bass–Alt Oktaven.
Quintfallsequenz: vii° = H/d′/h′/f″ – Leitton h in Bass und Alt verdoppelt.

**Avoid Notes** (Motivstufe über dem Akkordgrundton auf Zz. 1–4):
Long Tones T. 2 Zz. 1 Stufe 1 (None → ♭9 über iii und vii°), Sunday Hymn
T. 2 Zz. 3 Stufe 5 (Sexte → ♭13 über iii und vi), Jig Hop Zz. 4 (6/8)
Stufe 5. Auf Zz. 2/4 zusätzlich Hook Line, Offbeat Pop, Syncopated Hook,
Afterglow, Modal Drift. Eine Quarte über Dur auf schwerer Zeit kommt nicht vor.

**Katze** (CUE = 8 → Übungsbeginn auf Zz. 3, Achtel):
Die = Zz. 3, **Kat** = 3+, ze = 4, **tritt** = 4+, die = 1, **Trep** = 1+,
pe = 2, **krumm** = 2+.

---

## 3. Umsetzungsanweisungen

Für alle Pakete: jede der betroffenen Dateien steht in `SHELL_REQUIRED`/
`SHELL_OPTIONAL` → `SW_VERSION` pro Commit erhöhen (v293 → v294 …). IDs
bleiben überall erhalten. `DATA_VERSION` muss nur bei Befund 16 bedacht
werden (siehe dort) – alle anderen Änderungen sind neue optionale Felder oder
reine Daten-/Klangänderungen.

### 1 + 22 – Dur-Dominante in Moll (F)
- **groove-lab.js**, `PROGRESSIONS`: neues Feld `dominant: true` für
  `cadence, cadence3, circle, jazz, twoFiveOne, turnaround, chain, andalusian, blues`.
  Bewusst **nicht** für `pop, sad, fifties, pachelbel, epic` (dort ist v in
  Moll idiomatisch) – optional später einzeln entscheiden.
- Neue Funktion `chordSteps(steps, modeId, prog, deg)`: liefert `steps` mit
  `[6] = 11`, wenn `prog.dominant && modeId !== 'major' && mod(deg,7) === 4`,
  sonst unverändert. Damit wird V = E–Gis–H, V7 = E–Gis–H–D (in a).
- Aufrufen in `_harmonyAt` (Z. 1759; `steps: chordSteps(...)`) und
  `_voicings` (Z. 1774–1780) – dann folgen Satz, Bass, Arp, Melodie und die
  Anzeige (`romanNumeral`/`chordName`) automatisch dem Dur-Akkord.
  Ohne das spielt die Melodie über E-Dur weiter g (Querstand).
- **Eigene Folgen**: Flag `dominant` im Editor als Schalter „Moll: Dur-Dominante“
  anbieten, in `sanitizeProgLibrary` durchreichen (fehlend = false).
- **Speicherstände**: keine Migration. Wer eine Preset-ID in Moll gespeichert
  hat, hört ab jetzt V statt v – gewollt.
- **Test**: Selbsttest (Paket 3): `cadence` in a-Moll → Akkordtöne Stufe 4 =
  {4, 8, 11}. Hörtest: Grundkadenz a-Moll schließt.

### 2 + 21 – Modus-Bindung (F)
- `PROGRESSIONS`: Feld `modes`:
  `modal, rock3: ['mixolydian','dorian','minor']`, `andalusian: ['minor']`,
  `epic: ['minor']`, `blues: ['major','mixolydian']`; alle anderen ohne Feld = alle.
- Auswahl einer Folge in unpassendem Modus → Modus automatisch auf
  `modes[0]` setzen, Statuszeile „Andalusische Kadenz → Moll“.
  Moduswechsel bei unpassender Folge → Folge in der Liste als „passt nicht
  zum Modus“ markieren (nicht still ändern).
- `randomize()` Z. 1867: `pick(PROGRESSIONS.filter((p) => p.id !== 'drone' && (!p.modes || p.modes.includes(s.modeId))))`.
- Texte strings.js 555–558 (+EN/PL): „Am typischsten mit …“ → „Nur in …“ bzw. streichen, wenn die App selbst umschaltet.
- **Speicherstände**: beim Laden nichts umschalten.
- **Test**: 1000× `randomize()` → keine Kombination außerhalb `modes`.

### 3 – Blues mit Dominantseptakkorden (V)
- `PROGRESSIONS` Z. 365: `{ id: 'blues', ..., dom7: true }`.
- `chordPitchClasses`: bei `dom7` Grundton aus dem Modus, Töne `[0, 4, 7, 10]`
  über dem Grundton → C7 = C–E–G–B, F7 = F–A–C–Es, G7 = G–H–D–F.
  `chordName` → „C7“, `romanNumeral` → „I7“.
- Nicht über den globalen `sevenths`-Schalter lösen (ergäbe Cmaj7/Fmaj7).
- Melodie/Arp über diesen Akkorden: `h.steps` für den Akkord mit kleiner
  Septime liefern (wie `chordSteps` in 1), sonst läuft das Arp auf h statt b.
- **Test**: Akkordtöne wie oben; die PR-Prüfung „keine Note außerhalb der
  Tonart“ um die Ausnahme `dom7`/`dominant` erweitern.

### 4 – Stimmführung in voiceChord (F)
- `voiceChord(pcs, prev)` → `voiceChord(pcs, prev, { leading })` mit `leading`
  = Tonart-Leitton-pc (Dur bzw. Moll mit `dominant`).
- Im Suchlauf pro Kandidat zusätzlich:
  - +40 je Stimmpaar mit paralleler reiner Quinte oder Oktave
    (gleiches Intervall mod 12 ∈ {0, 7}, beide Stimmen bewegen sich gleichgerichtet),
  - +15 wenn `leading` mehr als einmal vorkommt,
  - +10 wenn S und B in Oktave/Quinte landen und S springt (verdeckte Parallele),
  - +8 wenn der Leitton im Sopran nicht zum Grundton hinaufgeht (V→I).
- vii°: Bass auf die Terz (vii°6), d. h. für `chordQuality === 'dim'` den Bass
  nach `pcs[1]` statt `pcs[0]` suchen.
- **Test**: Selbsttest wie `/tmp/par.js` (Anhang): alle Folgen × 12 × 4 Modi
  → 0 Parallelen, 0 Leittonverdopplungen. Heute: 651.

### 5 – Pachelbel-Text (F)
strings.js 549 / 1888 / 3227:
- DE: „Die Folge aus Pachelbels Kanon: acht Akkorde, deren Grundtöne abwechselnd eine Quarte fallen und eine Sekunde steigen – darüber sinkt die Oberstimme Ton für Ton. Auch in vielen Popsongs.“
- EN: „The progression from Pachelbel’s Canon: eight chords whose roots alternately fall a fourth and rise a step – above them the top voice descends step by step. Also in many pop songs.“
- PL: „Progresja z Kanonu Pachelbela: osiem akordów, których podstawy na przemian opadają o kwartę i wznoszą się o sekundę – nad nimi głos najwyższy schodzi krok po kroku. Także w wielu piosenkach pop.“

### 6 + 6b – Kadenz-Texte (F/V)
- `lab.progNameCadence3`: „Kadenz in drei“ → „Halbschluss-Runde“ (EN „Half-cadence loop“, PL „Pętla z półkadencją“).
- `lab.progInfoCadence3`: „I–IV–V: endet auf der Dominante, einem Halbschluss – erst der nächste Durchlauf löst zur Tonika auf.“
- `lab.progInfoCadence`: „… schließt eindeutig – in Moll mit Dur-Dominante (Leitton).“ (zusammen mit der Dur-Dominante in Paket 3 ändern).

### 7 – Benennung vereinheitlichen (V)
- Keine ID umbenennen (beide Tools speichern getrennt; kein Konflikt heute).
- Bei der Zusammenführung (Paket 13) Abbildungstabelle:
  `uebe.plagal → 'plagalHalf'`, `uebe.tsd → 'cadence3'`, `uebe.cadence` Name „Grundkadenz“.
- Sofort: uebe-lab.html 1078 Name „Kadenz“ → „Grundkadenz“, 1090 „Kadenz in drei“ → „Halbschluss-Runde“.

### 8 + 25 – Stimmumfänge (V)
- Eine Tabelle für alle Tools (bis Paket 13 per Kopie):
  `S 60–79 (c′–g″), A 55–74 (g–d″), T 48–67 (c–g′), B 40–62 (E–d′)`.
  Einsingen darf die Startlage weiterhin tiefer ansetzen (floor 57/53/47/41),
  aber die Obergrenzen sollten identisch sein.
- uebe-lab.html 1189: `bass: 40 + mod(key + CHORD_SYMBOLS[symbol][0] - 4, 12)` (E–dis).
- uebe-lab.html 1165–1166 gleich: `bass = 40 + mod(pc - 4, 12)`.
- **Test**: 500 Zufallsaufgaben, alle Basstöne 40–51.

### 9 – Umkehrungen stilgerecht (V)
- `EAR_INVERSIONS` Z. 1106: `['random', 'Umkehrungen zufällig']` → `['style', 'Umkehrungen (stilgerecht)']`, alten Wert `random` beim Laden auf `style` abbilden.
- Regel in `voiceProgression`: Sextakkord für alle Stufen erlaubt; `vii°` immer als Sextakkord; Quartsextakkord nur als Kadenzquartsext (I vor V auf neuem Takt).
- Parallelen wie in Paket 7 bestrafen (voiceClose teilt dann die Logik).
- **Test**: kein 6/4 außer I vor V, kein vii° in Grundstellung, 0 Parallelen.

### 10 + 27 – Chorwendungen (V)
- `CHORD_SYMBOLS` ergänzen: `V7: [7, 'dom7']`, `'I64': [0, 'maj', 'fifthBass']`, `'iv6': [5, 'min', 'thirdBass']`, `'IV65': [5, 'add6']` (sixte ajoutée, F–A–C–D).
- `chordPcs`: `dom7 → [0,4,7,10]`, `add6 → [0,4,7,9]`; Bass-Hinweis in `voiceClose` auswerten.
- Neue Folgen:
  - `{ id: 'v7', mode: 'major', chords: ['I','IV','V7','I'], name: 'Grundkadenz mit V7' }`
  - `{ id: 'k64', mode: 'major', chords: ['I','IV','I64','V','I'], name: 'Kadenz mit Quartsextvorhalt' }`
  - `{ id: 'phryg', mode: 'minor', chords: ['i','iv6','V'], name: 'Phrygischer Halbschluss' }`
  - `{ id: 'ajoutee', mode: 'major', chords: ['I','IV65','V','I'], name: 'Choralschluss (sixte ajoutée)' }`
- `EAR_LEVELS`: Stufe 3 + `v7`; Stufe 4 + `k64`, `ajoutee`; Stufe 5 + `phryg`.
- Antwort-Chips: nur Symbole der gewählten Folgen (bestehendes Verhalten).

### 11 – Melodie über Akkordwechseln (G)
- Optional: auf Zz. 1 und 3 eine Motivstufe, die eine kleine Sekunde über einem
  Akkordton liegt (♭9/♭13), um eine Stufe nach unten auf den Akkordton
  schieben (`_playMelodyStep`, Z. 2122). Nur 3 Motive betroffen – alternativ
  die Motive selbst ändern: Long Tones T. 2 `[0, 1, 4]` → `[0, 2, 4]`;
  Sunday Hymn T. 2 `[8, 5, 8]` → `[8, 4, 8]`.

### 12 – Blue Third (F)
- groove-lab.js 197: Motiv `[[0,0,2],[3,2,1,-1],[4,2,1],[6,4,1],[9,6,1],[12,4,2]]`
  (Stufe 3 erst als ♭3, dann ♮3 – der typische „Blue-Third“-Vorschlag).
  `alt` wird in `_playMelodyStep` (Z. 2122) bereits unterstützt; im
  `MELODIES.forEach` (Z. 226) das 4. Element beim Umrechnen erhalten.

### 13 – Triplet Roll (V)
- Name → „Shuffle Roll“ (ID = Name, daher: `name` ändern, gespeicherte
  Stände über `patternIndex` bleiben gültig – prüfen, ob irgendwo über den
  Namen gesucht wird; `presetIndexByName` gilt nur für Klänge).
- Echte Triolen im Raster erst mit 12er-Takt-Raster wie im Metronom – nicht in diesem Paket.

### 14 – Swing Soul / Deep House (G)
- Deep House Z. 113: `hat: [0,2,4,6,8,10,12,14]`, `open: [2,6,10,14]`.
- Swing Soul Z. 80: `hat: [0,2,4,6,8,10,12,14]` und als Vorgabe `swing` so,
  dass Achtel swingen – dafür braucht `_scheduleStep` (Z. 1939) einen
  Achtel-Swing-Modus (`swingUnit: 8` verzögert Schritte 2, 6, 10, 14).

### 15 – Waltz Step (G)
- Z. 121: `bass: [0], bassNotes: [0]` (oder Wechselbass: Quinte erst im
  nächsten Takt). Snare/Ghost bleibt auf 2 und 3.

### 16 – Aufnahme tonartrelativ (F)
- `_recToBars` (Z. 3987): Stufe relativ zur Tonika statt zum Akkord suchen
  (`shift = 0`), Melodie mit `ref: 'key'` speichern (`_recSave`, Z. 4059,
  Library-Eintrag und `s.melodyRef`).
- `_playMelodyStep`: bei `ref === 'key'` `shift = 0`.
- Oktavfaltung Z. 4016–4021: statt einzelne Töne zu falten nur als Ganzes
  verschieben; passt es nicht, `MEL_LOW/HIGH` für Aufnahmen erweitern.
- Alternativ Aufnahmelänge auf Folgenlänge anbieten (Chips 1–4 um „ganze Folge“ ergänzen).
- **Speicherstände**: alte Aufnahmen ohne `ref` bleiben akkordrelativ.
  `sanitizeMelodyBars`/Library-Sanitizer müssen `ref` durchreichen. Kein
  `DATA_VERSION`-Bump nötig (neues optionales Feld).
- **Test**: 2-Takt-Aufnahme über `pop` → im 2. Loop dieselben MIDI-Töne.

### 17 + 26 – Gemeinsame Harmonik-Quelle (V)
- Neue Datei `harmony.js` (klassisches Skript, `window.ChorHarmony`): MODES,
  Akkordbau (inkl. `dominant`, `dom7`), Folgen mit `modes`, Umfänge,
  `noteName`, Satz (voiceChord mit Paket 7).
- groove-lab.js, uebe-lab.html, einsingen.html laden sie; in `SHELL_OPTIONAL` eintragen.
- `runSelfTests()` lädt `harmony.js` und prüft: Akkordtöne, Parallelen = 0,
  Umfänge, Modus-Bindung, Aufnahme-Wiedergabe.
- Bis dahin: `ChorGrooveLab._test = { MODES, PROGRESSIONS, MELODIES, voiceChord, chordPitchClasses }` exportieren.

### 18 – Katze (F)
- einsingen.html Z. 325: neues Feld `delay: 2`.
- Z. 341: `let at = CUE + (ex.delay || 0);` → Die = 3+, **Kat** = 4,
  **tritt** = 1, **Trep** = 2, **krumm** = 3. `ex.steps` rechnet sich mit.

### 19 – Moll-Übungen (V)
- `degreeSemis` um Modus erweitern (`mode: 'minor'` → [0,2,3,5,7,8,10]);
  `keyLabel` → „a-Moll“ (Tonart klein bei Moll).
- `cueChord` in Moll: Terz `r + 15`.
- Neue Übungen:
  - `{ id: 'moll5', group: 'resonanz', name: 'Moll-Fünfton', mode: 'minor', notes: legato5, syllables: ['no','no','no','no','no','no','no','no','no'] ... }`
  - `{ id: 'mollDreiklang', group: 'beweglich', mode: 'minor', notes: [[0,2],[2,2],[4,2],[7,4],[4,2],[2,2],[0,4]], syllables: rep('ma', 7) ... }`
- Programm „Ausführlich“: `['moll5', 3]` nach `vokale` einfügen. Programm „Kurz“ unverändert.

### 20 – Kadenz als Einstimmung (V)
- Option `state.cue: 'chord' | 'cadence'` (Standard `chord`).
- Bei `cadence`: CUE = 16 (ein Takt) statt 8; I (Zz. 1–2), V7 (Zz. 3), I (Zz. 4).
  Gilt nur für die erste Runde einer Übung, danach Akkord.

### 23 + 24 – Tonnamen und Solmisation (V)
- DE-Liste überall: `C, Cis, D, Es, E, F, Fis, G, As, A, B, H` (strings.js 597,
  uebe-lab.html 360, piano.html 126). EN bleibt `C, C♯, D, E♭ … B♭, B`.
- piano.html 127: `['Do','Do♯','Re','Mi♭','Mi','Fa','Fa♯','Sol','La♭','La','Si♭','Si']`,
  Button „Do Re Mi“ → „Do Re Mi (fest)“.

---

## 4. Reihenfolge (einzeln mergebar)

Maßgeblich ist diese Tabelle (ersetzt frühere Zusatz-Tabellen in den Nachträgen). Details je Paket: ARBEITSANWEISUNG-CLAUDE-CODE.md.

| Paket | Inhalt | Befunde | Dateien | Aufwand |
|---|---|---|---|---|
| 1 | Texte und Namen | 5, 6, 7, 40 | strings.js, uebe-lab.html, einsingen.html | S |
| 2 | Einsingen: Auftakt, Einstimmung, Atem, Einzähler, Tonnamen | 18, 20, 41, 44, 45 | einsingen.html | S |
| 3 | Dur-Dominante in Moll + Test-Export Groove Lab | 1, 6b, 22, 38, 26 (Teil) | groove-lab.js, app.js | M |
| 4 | Modus-Bindung und Zufall | 2, 21 | groove-lab.js, strings.js | S |
| 5 | Groove-Inhalte und Arp | 3, 12, 13, 14, 15, 36, 37 | groove-lab.js, strings.js | M |
| 6 | Tonnamen und Stimmumfänge | 8, 23, 24, 25, 50, 59, 60 | alle Tools, strings.js | M |
| 7 | Stimmführung voiceChord | 4 | groove-lab.js, app.js | M |
| 8 | Ausbildung: Akkorde, Stufen, Intervalle | 9, 10, 27, 32, 33, 34, 35 | uebe-lab.html | M |
| 9 | Aufnahme tonartrelativ | 16 | groove-lab.js | M |
| 10 | Einsingen: Moll- und neue Übungen | 19, 42, 43 | einsingen.html | M |
| 11 | Stimm-Tuner | 47, 48, 49 | uebe-lab.html | S |
| 12 | Tempo-Bezug, Rhythmus, Metronom, Piano | 28, 51, 52, 53, 55, 56, 57, 58, 63 | uebe-lab.html, metronom.html, groove-lab.js, piano.html | M |
| 13 | Gemeinsame Harmonik-Quelle | 17, 26 | harmony.js, alle Tools, sw.js, app.js | L |

Jedes Paket: ein Commit, `SW_VERSION` +1, `runSelfTests()` im Browser, Hörtest.

---

## Anhang – Prüfskripte

- **Folgen je Modus und Avoid Notes**: liest `MELODIES`, `MODES`, `PROGRESSIONS` per `eval` aus groove-lab.js und rechnet Stufen und Zählzeiten nach.
- **Parallelen**: übernimmt `voiceChord` und `chordPitchClasses` 1:1 aus groove-lab.js sowie `voiceClose` und `chordPcs` aus uebe-lab.html; prüft jedes Stimmpaar auf gleichgerichtete reine Quinten/Oktaven.
  Ergebnis: Groove Lab 651 / 4 320 Wechsel (u. a. andalusian 136, pachelbel 95, blues 52); Ausbildung 114 / 768.

Diese Skripte können nach Paket 13 in `runSelfTests()` wandern.

---

## Nachtrag – Einstellungen und Auswahlmöglichkeiten

| Nr. | Tool | Datei:Zeile | Problem | Grad | Aufw. | Status |
|---|---|---|---|---|---|---|
| 32 | Ausbildung | uebe-lab.html:1100–1109 | Stufen laut Kommentar kumulativ, sind es nicht: Stufe 4 verliert `tsd, amen, plagal, m3`, Stufe 5 verliert `fifties, sad, hymn, rising` | F | S | neu |
| 33 | Ausbildung | uebe-lab.html:1104–1105 | Stufe 4 und 5 ändern je zwei Dinge gleichzeitig (neue Akkorde + weite Lage; neue Moll-Folgen inkl. v/V-Unterscheidung + Umkehrungen) | V | S | neu |
| 34 | Ausbildung | uebe-lab.html:1059–1064 | Intervall-Presets sind Themen, keine Lernstufen; „Einstieg“ ohne große Sekunde (häufigstes Melodie-Intervall), Tritonus nur in „Alle“ | V | S | neu |
| 35 | Ausbildung | uebe-lab.html:1216–1217 | Intervalle rein zufällig, keine Gewichtung falsch beantworteter Intervalle | V | M | neu |
| 36 | Groove Lab | groove-lab.js:1976–1978 | Arp: Bei punktiert/Galopp wird „Tempo“ ignoriert – 1/16, 1/8, 1/8· klingen gleich (Einheit Achtel), 1/4 und 1/4· auch | F | S | neu |
| 37 | Groove Lab | groove-lab.js:2016–2021 | Arp manuell: Muster diatonisch zur Tonart, nicht zum Akkord – E + „Dreiklang“ über F-Dur ergibt e–g–h | G | S | neu |
| 38 | Groove Lab | groove-lab.js:2037–2044 | Arp automatisch nutzt `h.steps` – übernimmt den Moll-Fehler (v) aus Befund 1 | F | – | neu (löst sich mit Paket 3) |
| 39 | Groove Lab | groove-lab.js:519–522 | Arp ohne Triolen-Tempo (1/8T), obwohl Pad-Rolle Triolen kann | G | S | neu |

### 32 + 33 – Stufen neu ordnen (eine neue Schwierigkeit je Stufe, kumulativ)
- `EAR_LEVELS` als Zuwachs definieren und kumulativ berechnen:
  1. **I–IV–V** (Dur, Grundstellung, eng): `cadence, tsd, amen, plagal`
  2. **+ vi**: `pop, fifties, sad, deceptive`
  3. **+ ii und iii**: `jazz, hymn, quintfall, turnaround, rising`
  4. **Moll**: `mcadence, m3, mdeceptive, epic, mpop, andalusian`
  5. **Alles, weite Lage**: `+ circle, mnatural` (v vs. V erst hier)
  6. **Umkehrungen** (stilgerecht, siehe Befund 9), weite Lage
- Code: `add: [...]` statt `progs`, `progs = levels.slice(0, n).flatMap((l) => l.add)`.
- Speicherstände: `settings.level` bleibt Zahl 1–6; gespeicherte `progs` bleiben, bis eine Stufe gewählt wird. Keine Migration.

### 34 + 35 – Intervalle
- `INTERVAL_PRESETS` als Stufen:
  1. „Einstieg“ `[2, 4, 7, 12]`
  2. „Terzen“ `[2, 3, 4, 5, 7, 12]`
  3. „Sexten“ `+ [8, 9]`
  4. „Septimen“ `+ [1, 10, 11]`
  5. „Alle“ `+ [6]`
  Die Themen-Presets („Terzen und Sexten“, „Sekunden und Septimen“) als zweite Reihe „Vergleichen“ behalten.
- Gewichtung: je Intervall Fehlerzähler in `ear.stats`, Ziehung mit Gewicht `1 + Fehler der letzten 10`.

### 36 – Arp-Rhythmus
- `_arpTrigger`: `const unit = s.arpDivision;` (Rhythmus-Zellen skalieren mit dem gewählten Tempo), oder bei nicht-geradem Rhythmus das Tempo-Feld auf 1/8 und 1/4 beschränken und die anderen ausgrauen.
- Test: 1/16 + „punktiert“ = 3+1 Sechzehntel je Zelle; 1/8 + „punktiert“ = 6+2.

### 37 – Arp manuell
- Option „Muster: Tonart / Akkord“ (Standard Tonart wie bisher). Bei „Akkord“: Taste auf den nächsten Akkordton des aktuellen Akkords runden, dann Terzen im Akkord.

### Geprüft, in Ordnung
- Richtung „auf/ab/auf-ab/Reihenfolge/zufällig“, Oktavanzahl 1–3, Entfernen von Doppeltönen außer bei „Reihenfolge“ – logisch.
- Intervall-Lage 52–79 (e–g″) passt für alle Stimmen; Antwort-Knöpfe sortiert.
- Stufen-Wahl setzt Folgen, Umkehrung und Lage; manuelle Änderung schaltet korrekt auf „Eigene Auswahl“.

---

## Nachtrag 2 – Einsingen im Detail

Durchgerechnet: jede Übung × Stimme (Start- und Endtonart, Tonraum,
Rückungen), Atemzeit zwischen den Runden, Programmdauer.

### Tonräume (Auszug; alle Übungen bleiben im Stimmumfang)

| Übung | S | A | T | B |
|---|---|---|---|---|
| Lippenflattern | c′–g′ → fis′–cis″ | as–es′ → d′–a′ | d–a → as–es′ | As–es → d–a |
| Dreiklang | h–h′ → e′–e″ | g–g′ → c′–c″ | cis–cis′ → fis–fis′ | G–g → c–c′ |
| Koloratur | h–cis″ → es′–f″ | g–a′ → h–cis″ | cis–es′ → f–g′ | G–a → H–cis′ |
| Oktavsprung | c′–c″ → g′–g″ | as–as′ → d′–d″ | d–d′ → g–g′ | As–as → d–d′ |

Programmdauer: „Kurz“ 43 Runden ≈ 4,6 min, „Ausführlich“ 88 Runden ≈ 9,9 min
(alle Stimmen gleich) – passend für Probe bzw. Einzelübung.

### Befunde

| Nr. | Datei:Zeile | Problem | Grad | Aufw. | Status |
|---|---|---|---|---|---|
| 40 | einsingen.html:308, 310 | „Fünftonleiter“ heißt im Deutschen Pentatonik; gemeint ist der Fünftonraum 1–2–3–4–5 | F | S | neu |
| 41 | einsingen.html:242–250, 837–844 | Tonart „Des-Dur“, Tonraum aber „cis′–as′“ (Einzeltöne immer mit Kreuz) | V | S | neu |
| 42 | einsingen.html:277, 290–302 | Gruppe „Lockern & Atmen“ enthält keine Atemübung | V | M | neu |
| 43 | einsingen.html:290–351 | Es fehlen Chor-Standards: Intonation im Akkord, Crescendo/Decrescendo auf einem Ton | V | M | neu |
| 44 | einsingen.html:259–261 | Atem zwischen zwei Runden nur ≈ 1,9–2,1 s (Pause + Akkord) bei Lippenflattern, Mi-me-ma, Katze, Koloratur; Lippenflattern ist besonders luftintensiv | V | S | neu |
| 45 | einsingen.html:705 | Einzähler nur vor der ersten Runde; danach Einsatz nur über den 2-Schläge-Akkord | V | S | neu |
| 46 | einsingen.html:354–357 | Nur zwei feste Programme, keine Starttonart wählbar (z. B. Tonart des ersten Stücks) | G | M | neu |
| – | einsingen.html:561–566 | Rückung begrenzt auf Stimmumfang | – | – | geprüft, ok |
| – | einsingen.html:290–351 | Hilfetexte stimmtechnisch korrekt (Zwerchfell-Impuls, Sirene „oben leichter“, Summen abwärts) | – | – | geprüft, ok |
| – | einsingen.html:925–986 | Tempo je Übung gespeichert, in Programm und Einzelübung gleich, Anzeige nennt die Übung | – | – | geprüft, ok |
| – | einsingen.html:354–357 | Programmaufbau lockern → Resonanz → Beweglichkeit → Höhe → Summen abwärts – schlüssig | – | – | geprüft, ok |

### Umsetzung

**40** – `hint: 'Fünftonleiter'` → `'Fünftonraum'`; Hilfetext „Die Fünftonleiter hinauf und hinunter“ → „Vom Grundton fünf Töne hinauf und wieder hinunter“.

**41** – `noteLabel(midi, root)`: bei Tonarten mit ♭ (F, B, Es, As, Des) die Namen `c, des, d, es, e, f, ges, g, as, a, b, h` verwenden. Aufrufe Z. 837 mit `cur.root` bzw. `rounds[0].root`.

**42** – Neuer Übungstyp ohne Tonhöhe: `{ id: 'atem', group: 'lockern', name: 'Atem', hint: 'sss', bpm: 60, breath: true, pattern: [[4, 'ein'], [8, 'sss']] }`.
Umsetzung: Zählzeiten klicken, Anzeige „ein 1-2-3-4 · aus auf sss 1-…-8“, 4 Runden, jede Runde die Ausatemzeit +2 (8, 10, 12, 14). Kein Akkord, kein Liegeton.
Programm „Ausführlich“: an den Anfang. „Kurz“ unverändert.

**43** – Zwei neue Übungen:
- `messa`: `{ id: 'messa', group: 'resonanz', name: 'An- und Abschwellen', hint: 'mo', bpm: 60, lowStart: 5, top: 12, notes: [[0, 16]], syllables: ['mo'], dynamic: 'crescDecresc' }`. Die Vorgabe schwillt über 4 Schläge an und ab (Lautstärkekurve in `engine.tone`).
- `akkord`: Intonation im Dreiklang – die Übung spielt Grundton und Quinte, die eigene Stimme singt ihren Akkordton: S Terz (Stufe 2 + 7), A Quinte (Stufe 4), T Terz (Stufe 2), B Grundton (Stufe 0), je 8 Schläge auf „no“, dann I–IV–V–I je 4 Schläge mit dem Ton, der in dieser Stimme im Satz liegt. Datenquelle: die SATB-Stimmführung aus Paket 7, damit es kein zweiter Satz-Algorithmus wird.

**44** – Feld `breath` je Übung (Standard 4): `lippen: 8, koloratur: 8, oktave: 8`. Da `ex.steps` auf ganze Takte aufrundet, wird die Runde dadurch einen Takt länger; alternativ global „Atempause: kurz / lang“ (+1 Takt).

**45** – Einzähler-Option erweitern: „Einzähler: aus / nur zu Beginn / jede Runde“. „Jede Runde“ klickt während des Akkords auf Zz. 3 und 4 (bzw. vor dem Auftakt aus Befund 18).

**46** – Optional „Starttonart“ (Auswahl C–H, Standard „automatisch“): der erste Grundton liegt auf der gewählten Tonart, soweit der Umfang es zulässt.

Speicherstände: neue Felder (`atem`, `messa`, `akkord`, `breath`, `countIn` als Zeichenkette) – `sanitize` nimmt unbekannte Werte bereits nicht an; `countIn: true` beim Laden auf `'start'` abbilden. Keine Migration in app.js nötig.

---

## Nachtrag 3 – Stimm-Tuner, Rhythmus-Training, Metronom, Groove Lab (Rest), Piano

| Nr. | Tool | Datei:Zeile | Problem | Grad | Aufw. | Status |
|---|---|---|---|---|---|---|
| 47 | Tuner | uebe-lab.html:1664–1666, 1721–1723 | Nadel und „Sauber/zu hoch“ folgen jedem Einzelwert (Median nur ~80 ms); bei Vibrato (5–6 Hz, ±30–100 Cent) springt die Anzeige ständig zwischen ok/near/off | V | S | neu (Hörtest empfohlen) |
| 48 | Tuner | uebe-lab.html:1684–1686 | Tonumfang zählt nur Töne, die 0,5 s innerhalb von 1 Halbton bleiben – mit Vibrato ab ±50 Cent werden Töne gar nicht erfasst | V | S | neu |
| 49 | Tuner | uebe-lab.html:1661 | Kammerton fest 440 Hz; keine Einstellung (viele Chöre/Orchester 442–443) | V | S | neu |
| 50 | Tuner | uebe-lab.html:1563 | Anzeige „A3/C♯4“ (wissenschaftlich, englische Vorzeichen) statt „a/cis′“ wie im Einsingen | V | S | neu (Teil von 23) |
| 51 | Rhythmus | uebe-lab.html:645–650 | Nur Ausgabelatenz abgezogen, keine Kalibrierung für Touch-/Bluetooth-Latenz → systematisch „zu spät“ möglich | V | M | neu |
| 52 | Rhythmus | uebe-lab.html:617–622 | Trefferfenster mindestens 60 ms; bei Sechzehnteln ab ca. 150 BPM überlappen die Fenster benachbarter Noten (Kommentar sagt „nie“) | F | S | neu |
| 53 | Rhythmus | uebe-lab.html:1016 | 6/8: BPM bezieht sich auf Achtel (angezeigt), wird beim Taktwechsel aber nicht umgerechnet – 92 im 4/4 wird zu halbem Achteltempo im 6/8 | V | S | neu |
| 54 | Rhythmus | uebe-lab.html:420–432 | Halbe auf Zz. 2 und ♪♩♪ über die Taktmitte im 4/4 erlaubt (Kommentar: gewollt) – klassische Notation würde binden | G | – | geprüft |
| 55 | Metronom | metronom.html:567, 718–721 | BPM immer = Viertel, auch in 6/8, 7/8, 12/8, wo die Schläge Achtel sind; Tempobezeichnung ebenfalls vom Viertel | F | S | neu |
| 56 | Alle | groove-lab.js:1719; metronom.html:567; uebe-lab.html:1016 | Tempo-Bezug in 6/8 in drei Tools unterschiedlich (Viertel / Viertel / Achtel) | V | S | neu |
| 57 | Metronom | metronom.html:486 | Klang „Elektro“: Betonung „mittel“ und „normal“ gleiche Tonhöhe (880 Hz), nur leiser – kaum unterscheidbar; „Kuhglocke“ unterscheidet nur „betont“ | V | S | neu |
| 58 | Metronom | metronom.html:583–589 | Tempo-Trainer erhöht auch in Stummtakten – der Tempowechsel fällt in die Stille | G | S | neu |
| 59 | Groove Lab | groove-lab.js:448–453 | Akkordnamen mit fester Namensliste statt tonartabhängig: As-Dur IV = „C♯“, E-Dur iii = „A♭m“, H-Dur vii° = „B°“ (im Deutschen B = b, gemeint ist Ais) | F | S | neu |
| 60 | Ausbildung | uebe-lab.html:1137, 1317–1318 | Tonartnamen ebenso: „A♭-Moll“ (7 ♭) statt gis-Moll, „C♯-Dur“ (7 ♯) statt Des-Dur | V | S | neu |
| 61 | Groove Lab | groove-lab.js:2202–2204 | Liegeton = Tonika (+ Quinte) über die ganze Folge – als Orgelpunkt korrekt, keine Änderung | – | – | geprüft, ok |
| 62 | Piano | piano.html:212, 249 | Gleichstufig A = 440; die zwei „Saiten“ liegen im Mittel +0,5 Cent über dem Soll – unhörbar | – | – | geprüft, ok |
| 63 | Piano | piano.html:150 | Pedal-Zustand wird gespeichert – beim nächsten Öffnen klingt alles nach, ohne dass man es gewählt hat | G | S | neu |
| – | Tuner | uebe-lab.html:1573–1603 | YIN-Parameter (Schwelle 0,15, Klarheit > 0,8, 65–1100 Hz, Fenster ≥ 1 Periode auch für C) fachgerecht | – | – | geprüft, ok |
| – | Rhythmus | uebe-lab.html:876–941 | Notenbild: Balken je Zählzeit, Sechzehntel-Stummel, Punktierung, Triole, 6/8 in 3er-Gruppen – korrekt | – | – | geprüft, ok |
| – | Rhythmus | uebe-lab.html:628–632 | 6/8 zählt „in 6“ mit Betonung auf 1 und 4 – korrekt | – | – | geprüft, ok |
| – | Metronom | metronom.html:579–608 | Stummtakte, Unterteilung, Betonung je Schlag, Timer – logisch | – | – | geprüft, ok |

### Umsetzung

**47** – Anzeige glätten, Rohwert nur für die Verlaufslinie: für Nadel und Text den Mittelwert der letzten ~300 ms verwenden (`voice.recent` zeitbasiert statt 5 Werte). Das zeigt die Mitte des Vibratos, wie ein Chorleiter sie hört.

**48** – Toleranz im Tonumfang: `Math.max(...values) - Math.min(...values) > 1` → `> 2`, gerundet wird weiter über den Median.

**49** – Einstellung „Kammerton a′ = 438 … 445 Hz“ (Standard 440), gespeichert in `STORAGE_ID 'playground'`; in Z. 1661 statt `440` verwenden. Anspielen (`playTarget`) und Ausbildung-Klänge ebenfalls, damit Referenz und Messung übereinstimmen.

**51** – „Latenz ausgleichen“: 8 Klicks mittippen, Median der Abweichung speichern, in `tap()` abziehen. Die mittlere Abweichung wird schon berechnet (`meanOff`) und kann als Vorschlag dienen.

**52** – In `tolerance()`: `Math.min(.13, Math.max(.035, minGap * tickSec * .45))` – die Untergrenze darf nie über der halben Lücke liegen.

**53 + 55 + 56** – Einheitlich: in 6/8 und 12/8 bezieht sich das Tempo auf die punktierte Viertel, in 7/8 auf die Achtel; Anzeige mit Notenzeichen („♩. = 60“, „♪ = 180“, „♩ = 92“). Beim Taktwechsel so umrechnen, dass die Achtel gleich schnell bleiben. Gespeicherte Werte gelten weiter als Viertel und werden beim Laden einmal umgerechnet (Tool-Zustand, kein `DATA_VERSION`).

**57** – Frequenzen „Elektro“ `[660, 880, 990, 1320]`; „Kuhglocke“ `k` für Stufe 2 = 1,06.

**58** – Tempo-Trainer nur an Takten ändern, die hörbar sind (`!isSilentBar(bar)`).

**59 + 60** – Tonartabhängige Schreibung: Tonarten mit ♭-Vorzeichen (F, B, Es, As, Des, Ges, sowie d, g, c, f, b, es in Moll) benutzen die ♭-Namen, alle anderen die ♯-Namen. Tonart-Auswahl in Moll: `cis, dis, fis, gis` statt `des, es, ges, as` bzw. EN `C♯, D♯, F♯, G♯`. Eine gemeinsame Funktion `spell(pc, keyRoot, mode, lang)` – gehört in Paket 6 (Tonnamen) bzw. `harmony.js`.

**63** – Pedal beim Öffnen immer aus; nur Lage, Beschriftung und Lautstärke speichern.


---

## Nachtrag 4 – Ergänzte Lösungen und feste Regeln

### Noch fehlende Lösungen (Geschmack, optional)

**28 – Metronom 7/8 / 5/4** – Neben den Betonungs-Schaltern pro Schlag drei Vorwahl-Chips anbieten: 7/8 „2+2+3 / 2+3+2 / 3+2+2“ → Betonungen `[3,1,2,1,2,1,1]`, `[3,1,2,1,1,2,1]`, `[3,1,1,2,1,2,1]`; 5/4 „3+2 / 2+3“ → `[3,1,1,2,1]`, `[3,1,2,1,1]`. Speichert nur `state.accents[meter]` (Format unverändert).

**38 – Arp automatisch in Moll** – keine eigene Änderung; der Arp liest `h.steps` und folgt nach Paket 3 automatisch der Dur-Dominante. Im Test zu Paket 3 mitprüfen: Arp-Dreiklang über V in a-Moll = e–gis–h.

**39 – Arp-Triolen** – `ARP_DIVISIONS` um `[4/3, '1/8 T']` ergänzen; `_arpTrigger` braucht dafür gebrochene Schrittpositionen wie die Pad-Rolle (`_startRoll`). Nur umsetzen, wenn Paket 5 ohnehin am Arp arbeitet.

**54 – Notation Rhythmus** – keine Änderung (moderne Schreibweise, bewusst so kommentiert).

### Feste Regeln für alle Pakete

1. **Reihenfolge der Listen nicht ändern.** `DRUM_PATTERNS` und `MELODIES` werden über den Array-Index gespeichert (`patternIndex`, `melodyIndex`, groove-lab.js:700, 719). Neue Loops/Melodien nur **anhängen**, nie einfügen oder löschen; Namen dürfen sich ändern.
2. **IDs nicht ändern** (`PROGRESSIONS`, `EAR_PROGRESSIONS`, `EXERCISES`, `PROGRAMS`, `LOOPS`). Neue Einträge mit neuer ID.
3. **Gespeicherte Zustände**: neue Felder immer optional mit Standardwert; `sanitize…`-Funktionen müssen sie durchreichen. Alte Werte beim Laden umrechnen statt verwerfen (Tempo-Bezug 6/8, `countIn`-Boolean, Ausbildung `inversion: 'random'`). `DATA_VERSION` in app.js nur anfassen, wenn Daten der Haupt-App betroffen sind – hier nicht der Fall.
4. **SW_VERSION** in sw.js bei jedem Commit erhöhen (aktuell v293).
5. **Texte** in strings.js immer in DE, EN und PL gleichzeitig ändern (STRINGS-Paritätstest). uebe-lab.html und einsingen.html sind nur deutsch.

### Entscheidungen (Standard, falls nicht anders vorgegeben)

| Frage | Standard |
|---|---|
| Dur-Dominante in Moll für welche Folgen? | `cadence, cadence3, circle, jazz, twoFiveOne, turnaround, chain, andalusian, blues`; natürliches v bleibt bei `pop, sad, fifties, pachelbel, epic` |
| Tempo-Bezug in 6/8 und 12/8 | punktierte Viertel; 7/8 Achtel; alles andere Viertel |
| Deutsche Tonnamen | `C, Cis, D, Es, E, F, Fis, G, As, A, B, H`, tonartabhängig (♭-Tonarten: Des, Es, Ges, As, B); Oktaven in Helmholtz (c′) im Deutschen, wissenschaftlich (C4) im Englischen |
| Solmisation im Piano | feste Silben mit Vorzeichen (`Do, Do♯, Re, Mi♭ …, Si`) |
| „Kadenz in drei“ | Name → „Halbschluss-Runde“, ID bleibt `cadence3` |
| Geschmackspunkte (G) | nur umsetzen, wenn im Paket genannt (14, 15, 27, 28, 58, 63 ja; 11, 39, 46, 54 nein) |
