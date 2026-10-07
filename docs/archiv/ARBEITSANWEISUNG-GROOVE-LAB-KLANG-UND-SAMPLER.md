# Arbeitsanweisung: Groove Lab – Klang, Popchor-Ausrichtung und Sampler

Stand: 2026-10-06. Gilt für `groove-lab.js`, `harmony.js`, `app.js`, `strings.js`,
`samples/`, `sw.js`. Ergebnis eines Producer-/Komponisten-Reviews des Studios.
Ein Arrangement-/Song-Modus ist ausdrücklich **nicht** Teil dieses Auftrags.

## 0. Spielregeln (vor jedem Paket lesen)

- `CLAUDE.md` gilt vollständig: kein Bundler, keine neuen Abhängigkeiten,
  **`SW_VERSION` in `sw.js` bei jedem Commit bumpen**, der eine Shell-Datei anfasst.
- Neue/geänderte Dateien in `samples/` → `SAMPLES_CACHE` in `sw.js` erhöhen
  (`chor-samples-v3` → `v4`) und `samples/LIZENZ.md` + `samples/aufbereiten.sh` pflegen.
- **`DRUM_PATTERNS`, `MELODIES`, `PROGRESSIONS`, `SYNTH_PRESETS` nie umsortieren
  und nichts löschen** – gespeichert wird der Index. Neues nur anhängen.
  Inhalt bestehender Einträge darf ergänzt werden (z. B. ein neues Feld).
- Neue Zustandsfelder im Lab immer in `defaultState()` **und** in
  `sanitizeState()` mit Fallback anlegen. Alte Stände und geteilte `GL1.`-Codes
  müssen ohne Fehler laden. `DATA_VERSION` in `app.js` nur anfassen, wenn sich
  die Bedeutung gespeicherter Felder ändert (hier voraussichtlich nicht).
- Jeder sichtbare Text über `t()` mit Schlüsseln `lab.…` in **de, en und pl**
  in `strings.js`.
- Workshop-Einheiten (`WORKSHOP_LESSONS`), Chor-Aufgaben (`CHOIR_TASKS`) und
  de:construct (`DC_SONGS`) dürfen ihr Verhalten nicht ändern. Wo ein neues
  Feld den Klang ändert, setzen `lessonState`/`applyTaskSet`/`dcBuild` den
  bisherigen Wert explizit (siehe jeweiliges Paket).
- Alles muss **ohne geladene Samples** weiter klingen (offline, erster Start,
  Ladefehler): dann gilt die bisherige Synthese.
- Tests: bestehende `runMusicSelfTests()` in `app.js` grün halten und je Paket
  ergänzen. Reine Funktionen (harmony.js, Melodie-/Bass-Rechnung) zusätzlich per
  Node prüfen (Shim: `global.window = global; global.customElements = { get: () => true, define() {} }; global.HTMLElement = class {};`, dann `harmony.js` und `groove-lab.js` per `require` mit absolutem Pfad laden, `window.ChorGrooveLab._test` nutzen).
- **Ein Paket = eine PR.** Reihenfolge wie unten. Nach jedem Paket kurzer
  Bericht in `ARBEITSANWEISUNG-GROOVE-LAB-KLANG-UND-SAMPLER-BERICHT.md`
  (was, wo, offene Punkte). Am Ende Anweisung + Bericht nach `docs/archiv/`.
- Nicht auf Verdacht „verbessern“: nur, was hier steht. Abweichungen begründen
  und im Bericht festhalten.

---

## Paket 1 – Mix-Korrekturen (klein, risikoarm)

Ort: `GrooveEngine.start()` in `groove-lab.js`.

1. **Limiter statt Kompressor.** Aktuell `threshold -13, ratio 6` (Defaults
   für knee/attack) – das ist ein hörbar pumpender Bus-Kompressor.
   Neu: `threshold -3`, `knee 0`, `ratio 20`, `attack .002`, `release .12`.
   Den Master-Gain (`.8`) so anpassen, dass die Lautheit eines Default-Stands
   (Pulse Basic, Pop-Folge, Melodie an) etwa gleich bleibt – nach Gehör und
   per Peak-Messung über `AnalyserNode` (max. −1 dBFS Peak, kein Dauer-Limiting).
2. **Hall nicht mitpumpen lassen.** `convolver` geht heute in `duck`.
   Neu: `reverbIn → preDelay (DelayNode, 0,025 s) → convolver → reverbHP
   (Biquad highpass 250 Hz, Q .7) → reverbReturn (Gain 1) → master`.
   Echo bleibt am `duck`.
3. Kommentar-Signalweg am Klassenkopf aktualisieren.

Akzeptanz: Pump-Regler auf 0 → keine hörbare Pegelbewegung mehr durch den
Limiter. Pump-Regler hoch → Synths pumpen, Hallfahne nicht.

---

## Paket 2 – Sample-Ergänzungen in `samples/`

Erweitere `samples/aufbereiten.sh` (gleiche Aufbereitung wie bisher) und lade:

| Ordner | Quelle | Töne/Dateien | Zweck |
|---|---|---|---|
| `choir/` | FluidR3_GM `choir_aahs` | **zusätzlich 45, 48, 51, 54, 57, 60, 63** | Tenor/Bass für Chor-Pad |
| `bass/` | FluidR3_GM `electric_bass_finger` | **zusätzlich 30, 33, 36** | Bassregister A1–C2 ohne Umstimmen > 1,5 HT |
| `guitar/` | FluidR3_GM `electric_guitar_clean` | **zusätzlich 54, 57, 60** | Preset „E-Gitarre“ in Melodielage ab c′ |
| `drums/` | VCSL (CC0) | `ride`, `ride-bell` (falls vorhanden), `tamb`, `shaker`, `snap` | Swing Ride, Popchor-Percussion |

- VCSL-Pfade selbst im Repo `sgossner/VCSL` suchen (Ride/Suspended Cymbal,
  Tambourine, Shaker, Finger Snap). Gibt es eins davon dort nicht: weglassen
  und im Bericht vermerken – **keine Quelle ohne geklärte Lizenz** einbauen.
- Längen: ride 1,2 s, tamb 0,35 s, shaker 0,2 s, snap 0,25 s; 96 kbit/s mono.
- `samples/LIZENZ.md`: Tabellen ergänzen (Quelle, Datei, Lizenz).
- `uebe-lab.html`: `SAMPLE_INST.choir`, `SAMPLE_INST.bass` und `SAMPLE_INST.guitar` um die neuen
  Töne erweitern (die Datei nutzt dieselben Ordner), `selfCheckAudio()` grün.
- `SAMPLES_CACHE` bumpen.

Akzeptanz: Gesamtgröße `samples/` wächst um höchstens ~400 KB.

---

## Paket 3 – Echte Drums und Dynamik im Groove Lab

Heute ist das Lab reine Synthese (Kopfkommentar „kein Sample“), obwohl das
VCSL-Kit im Repo liegt. Hi-Hats spielen immer mit Velocity 1.

### 3a SampleKit

- Neue Klasse `LabSamples` in `groove-lab.js` (kein neues Modul): lädt nach
  `engine.start()` im Hintergrund `./samples/drums/{kick,snare,snare-soft,rim,hat,hat-soft,open,clap,tom-hi,tom-lo,crash,ride,tamb,shaker,snap}.mp3`
  per `fetch` + `ctx.decodeAudioData` (höchstens 3 parallel). Fehlende Datei →
  `null`, kein Fehler. Nach `engine.stop()` verwerfen (neuer Kontext).
- `GrooveEngine.playSample(buffer, time, velocity, { bus, rate = 1 })`:
  `AudioBufferSourceNode → Gain → buses.drums` (bzw. angegebener Bus).
- Zustand: `drumKit: 'auto' | 'synth' | 'acoustic' | 'hybrid'` (Default `'auto'`).
  `'auto'` löst nach Loop-Kategorie auf: `dance → synth`, `breaks → hybrid`,
  `calm`/`funky` → `acoustic`. `hybrid` = Synth-Kick + Samples für alles andere.
- `hitTrack()` entscheidet je Spur: Sample vorhanden und Kit verlangt Sample →
  Sample, sonst bisherige Synthese. Snare mit Wert < .6 (Ghost) → `snare-soft`.
- UI: im Beat-Reiter eine Chip-Reihe „Kit: Auto · Synth · Akustik · Hybrid“
  (Stil wie die vorhandenen Kategorie-Chips).
- **Pinning:** `lessonState()` (Workshop), `CHOIR_TASKS` und `dcBuild()` setzen
  `drumKit: 'synth'`, damit Kick-Lektionen (`state.kit`) unverändert klingen.

### 3b Dynamik („Feel“)

- Neues Feld `feel: true` (Default an; in Workshop/de:construct `false`).
- Nur bei der Wiedergabe in `_playStep`, Rasterwerte bleiben unverändert:
  - Hi-Hat/Open: Akzentfaktor nach Position im Schlag:
    `step % 4 === 0 → 1`, `step % 2 === 0 → .72`, sonst `.55`
    (in 6/8 und 3/4: Schlagbeginn nach `METERS[meter].beats` → 1, Rest .6).
  - Bei Faktor < .7 und vorhandenem Sample: `hat-soft` statt `hat`.
  - Alle Drum-Hits: Velocity × Zufall in [.94, 1.06].
  - Nur Hats: Timing ± 3 ms Zufall (nie Kick/Snare, nie vor `ctx.currentTime`).
- `Math.random` ist hier ok (nicht lightshow.js).

### 3c Percussion-Spur und Ride

- Neue Spur `perc` in `TRACK_IDS`/`DRUM_TRACKS` (hinter `open`, vor `bass`),
  `TRACK_KEY.perc = 'lab.trackPerc'`. `beatFromPattern` liest `pattern.perc`.
  `sanitizeState` muss Beats ohne `perc` akzeptieren (leeres Objekt).
- Pattern-Feld `percSound: 'tamb' | 'shaker' | 'snap'` (Default `'tamb'`),
  Zustandsfeld `percSound` (übernimmt beim Loop-Wählen den Pattern-Wert).
  Ohne Sample: Synth-Fallback = `playNoise` Bandpass 5 kHz, .08 s.
- Pattern-Feld `hatSound: 'ride'`: die Hat-Spur spielt das Ride-Sample.
  Bei **„Swing Ride“** (bestehender Eintrag) `hatSound: 'ride'` ergänzen.
- `CELL_CYCLE.perc = [1, .5]`.

Akzeptanz: Default-Stand klingt nach echtem Kit; Hats haben hörbar Akzente;
Workshop-Kick-Lektion klingt bit-identisch zu vorher (Synth); offline ohne
Sample-Cache läuft alles mit Synthese.

---

## Paket 4 – Automatische Fills

- Feld `fills: 0 | 4 | 8` (Default 8 in der Studio-Ansicht; Chor-Ansicht,
  Workshop, de:construct: 0). UI: Chip „Fill alle 4 / 8 Takte / aus“ im Beat-Reiter.
- Im letzten Takt jedes Blocks (Taktindex `% fills === fills - 1`) in den
  letzten 4 Schritten (4/4: 12–15; 3/4 und 6/8: 8–11) Snare/Clap/Hat/Open/Perc
  stummschalten und spielen: Schritt +0 `tom-hi` 1, +1 `tom-hi` .7,
  +2 `tom-lo` 1, +3 `tom-lo` .85. Kick auf diesen Schritten bleibt.
  Ohne Tom-Samples: Synth-Tom (Sinus 200→120 Hz bzw. 140→85 Hz, .25 s).
- Auf Schritt 0 des Folgetakts zusätzlich `crash` (Velocity .8).
- Nur Wiedergabe, kein Eingriff ins Raster. Rasteranzeige: Fill-Schritte
  während des Abspielens dezent markieren (CSS-Klasse `is-fill`).

---

## Paket 5 – Bass: Notenlängen, Lage, echter Bass

Befund: `playBass` hat nur eine feste Abklingzeit (.14–.32 s) → immer staccato;
„Bass halbe Noten“ (de:construct „Lighthouse Hands“) kann so nicht erklingen.
`_bassMidi` = `36 + Tonhöhenklasse` → Sprünge bis zur Septime zwischen Akkorden.

1. **Gate:** `playBass(time, midi, velocity, sound, duration)`.
   `duration` = Schritte bis zum nächsten Bass-Ton im selben Takt bzw. bis
   zum Taktende/Akkordwechsel, mindestens 1 Schritt, × `stepSec` × .92.
   Hüllkurve: 5 ms Anstieg → Peak → in `sound.decay` auf `peak × sound.sustain`
   → halten bis `duration` → Release 60 ms. `BASS_SOUNDS` bekommen `sustain`:
   pluck .0 (bleibt kurz), sub .8, growl .6, round .7.
2. **Lage mit Stimmführung:** neue Methode `_bassRoots()` (Cache wie
   `_voicings()`): erster Akkordgrundton im Bereich MIDI 36–47, jeder weitere
   als die Oktavlage im Bereich **33–47**, die dem vorherigen am nächsten liegt
   (Gleichstand → tiefer). `_bassMidi(h, deg)` rechnet ab diesem Grundton.
3. **Sample-Bass:** `BASS_SOUNDS` um `{ id: 'finger', name: 'Finger Bass', sample: 'bass', sustain: .9, … }`
   ergänzen. Lädt `samples/bass/*` (wie 3a), nächstliegender Ton,
   `playbackRate = 2^((midi − base)/12)`, Gate wie oben. Ohne Samples → `round`.
   Default `bassSoundId` für **neue** Stände: `'finger'`; gespeicherte behalten ihren.

Tests (Node): Für I–V–vi–IV in allen 12 Tonarten ist kein Grundton-Sprung
größer als 7 Halbtöne; alle Bass-MIDI-Werte in [33, 54].

---

## Paket 6 – Melodien: Ohrwurm statt Sequenz

Befund (in C, I–V–vi–IV, „Hook Line“): `G G E C | D E D | E E C A | C″ D″ C″` –
die Motive hängen am Akkordgrundton und springen wegen `foldDegree` zwischen
vi und IV um eine Dezime. „Pentatonic Riff“ ist dadurch ein gebrochener Akkord.

### 6a Vorlagen mit Tonart-Bezug

- `MELODIES`-Einträge dürfen `ref: 'key'` und fertige `bars` tragen
  (dann `vary`/`motif` ignorieren, `MELODIES.forEach`-Vorberechnung überspringt sie).
- `_melody()`: `ref: base.ref ?? 'chord'` statt fest `'chord'`.
  `melodyPreview`, Melodie-Editor und `melodyAltBars` müssen `ref: 'key'`
  korrekt behandeln (Editor zeigt Stufen relativ zur Tonika).

### 6b Akkord-Anpassung auf schweren Zählzeiten (alle Vorlagen)

Gilt für **alle Vorlagen** aus `MELODIES` (`ref: 'key'` und `ref: 'chord'`),
nicht für eigene/bearbeitete Melodien und Aufnahmen (`state.melodyBars` gesetzt).
Grund: Auch die alten Vorlagen reiben über Moll-Akkorden – Stufe 5 über dem
Akkordgrundton ist über Dur eine Sexte, über Moll eine kleine Sexte (z. B.
„Hook Line“ über I–vi–IV–V: F über a-Moll auf Zählzeit 2).

In `_playMelodyStep` vor `playTone`: Liegt der Notenbeginn auf einem Schlag
(`at % 4 === 0` in 4/4, Schlagpositionen aus `METERS` sonst) und ist die
Tonhöhenklasse **genau einen Halbton über** einem Akkordton
(`chordPitchClasses` des klingenden Akkords, inkl. Septime falls aktiv), dann
den Ton auf diesen Akkordton absenken. Sonst unverändert (Optionen,
Sexten, Septimen bleiben erlaubt). Reine Funktion `snapMelodyMidi(midi, pcs)`
exportieren und testen.

### 6c Lage bei Akkord-Bezug

Für `ref: 'chord'` (alte Vorlagen, eigene Melodien) `foldDegree` ersetzen
durch: Oktave je Takt so wählen, dass der erste Ton des Takts dem letzten Ton
des Vortakts am nächsten liegt (Gleichstand → tiefer), begrenzt auf
`melodyOctave` ± 1 Oktave. **Fingerabdruck:** Diese Änderung ändert die
Melodielogik in `uebe-lab.html` nicht – falls doch geteilter Code betroffen
ist, `MELODY_VERIFIED` laut `CLAUDE.md` neu setzen.

### 6d Neue Vorlagen (anhängen, alle 4/4, `ref: 'key'`)

Format `[Schritt, Tonart-Stufe, Länge]`, 0 = Tonika, 7 = Oktave, negativ = darunter.
Geschrieben für I–V–vi–IV, durch 6b für jede Folge brauchbar.

```js
{ name: 'Pop Hook', meter: '4/4', cat: 'dance', ref: 'key', bars: [
  [[0,2,2],[2,2,1],[3,4,3],[6,2,2],[10,1,2],[12,0,4]],
  [[0,1,2],[2,1,1],[3,4,3],[6,1,2],[10,0,2],[12,-1,4]],
  [[0,0,2],[2,0,1],[3,2,3],[6,4,2],[8,5,4],[12,2,4]],
  [[0,5,3],[3,7,3],[6,5,2],[8,3,4],[12,0,4]] ] },
{ name: 'Ballad Line', meter: '4/4', cat: 'calm', ref: 'key', bars: [
  [[0,2,6],[6,1,2],[8,0,6],[14,-1,2]],
  [[0,1,8],[8,-1,4],[12,1,4]],
  [[0,0,6],[6,-1,2],[8,0,4],[12,2,4]],
  [[0,5,8],[8,3,4],[12,1,4]] ] },
{ name: 'Offbeat Chant', meter: '4/4', cat: 'dance', ref: 'key', bars: [
  [[2,4,1],[4,4,1],[6,2,2],[10,4,1],[12,4,2]],
  [[2,4,1],[4,4,1],[6,6,2],[10,4,1],[12,1,4]],
  [[2,2,1],[4,2,1],[6,0,2],[10,2,1],[12,2,2]],
  [[2,3,1],[4,3,1],[6,5,2],[10,5,1],[12,7,4]] ] },
{ name: 'Gospel Call', meter: '4/4', cat: 'funky', ref: 'key', bars: [
  [[0,4,2],[2,5,2],[4,4,2],[6,2,2],[8,4,6],[14,2,2]],
  [[0,1,4],[4,2,2],[6,1,2],[8,-1,6]],
  [[0,4,2],[2,5,2],[4,4,2],[6,2,2],[8,0,6],[14,2,2]],
  [[0,5,4],[4,4,2],[6,2,2],[8,0,8]] ] },
{ name: 'Synco Verse', meter: '4/4', cat: 'funky', ref: 'key', bars: [
  [[0,0,1],[2,0,1],[3,0,1],[6,2,2],[9,2,1],[11,0,1],[12,-1,1],[14,0,2]],
  [[0,-1,1],[2,-1,1],[3,-1,1],[6,1,2],[9,1,1],[11,-1,1],[12,-3,1],[14,-1,2]],
  [[0,0,1],[2,0,1],[3,0,1],[6,2,2],[9,2,1],[11,4,1],[12,2,2],[14,0,2]],
  [[0,0,1],[2,0,1],[3,0,1],[6,3,2],[9,3,1],[11,5,1],[12,7,4]] ] },
{ name: 'Anthem Oh', meter: '4/4', cat: 'dance', ref: 'key', bars: [
  [[0,4,3],[3,4,3],[6,5,2],[8,4,4],[12,2,4]],
  [[0,4,3],[3,4,3],[6,5,2],[8,4,4],[12,1,4]],
  [[0,4,3],[3,4,3],[6,5,2],[8,4,4],[12,2,4]],
  [[0,5,3],[3,5,3],[6,7,2],[8,5,4],[12,4,4]] ] },
{ name: 'Guide Tones', meter: '4/4', cat: 'calm', ref: 'key', bars: [
  [[0,2,16]], [[0,1,16]], [[0,0,16]], [[0,0,8],[8,-2,8]] ] },
```

### 6e Default-Klang der Melodie

`defaultState().sound`: statt „Velvet Choir“ (Pad, 160 ms Attack) ein
perkussiver Klang – „Tape Keys“; sobald Paket 7c existiert, „Klavier“.
Gespeicherte Stände unverändert.

Tests (Node): Jede neue Vorlage über I–V–vi–IV in C, a-Moll-Modus mit `sad`
und mit `fifties`: Auf jedem Schlag ist der gespielte Ton kein Halbton über
einem Akkordton; größter Sprung zwischen Taktende und nächstem Taktbeginn
≤ 9 Halbtöne (inkl. Übergang Takt 4 → Takt 1).

---

## Paket 7 – Ausrichtung Popchor

### 7a Pop-Satz (neben dem SATB-Satz)

- `harmony.js`: neue reine Funktion `voiceProgressionPop(keyRoot, mode, prog, { add9 })`,
  Rückgabe im selben Format `{ S, A, T, B }` wie `voiceProgressionSatb`
  (so funktionieren Fokus/Stumm je Stimme weiter).
  - B: Akkordgrundton (bzw. Basston aus Paket 8) im Bereich 40–52,
    Stimmführung wie Paket 5.
  - T, A, S: **enge Lage** (alle drei innerhalb einer Oktave), Oberstimme im
    Bereich **60–69**, jede Stimme bewegt sich zum nächsten Akkordton
    (minimale Summe der Bewegungen, keine Stimmkreuzung).
  - `add9`: bei Dur/Moll-Dreiklängen ohne Septime ersetzt die None den
    verdoppelten Grundton in T/A/S; nie bei vermindert, nie bei `dom7`.
- Zustand: `chordVoicing: 'satb' | 'pop'` (Default `'satb'`; neue Stände in
  der **Studio**-Ansicht `'pop'`), `chordAdd9: false`. UI im Harmonie-Reiter:
  „Satz: Chor (SATB) · Pop“ und Schalter „Farbe: add9“.
- Ist die Melodie an, nutzt der Pop-Satz als Oberstimmen-Grenze 64 statt 69,
  damit das Pad nicht über/auf der Melodie liegt.
- `CHOIR_TASKS` bleiben bei `'satb'` (explizit setzen).

### 7b Neue Grooves (anhängen)

Freie Icons aus `PICTOGRAM` wählen bzw. neue einfache Strich-Icons ergänzen
(keins doppelt, siehe Kommentar dort). `roll` je Loop sinnvoll setzen.

```js
{ name: 'Pop Ballad', icon: '…', meter: '4/4', cat: 'calm',
  kick: [0, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14],
  perc: [2, 6, 10, 14], percSound: 'shaker',
  bass: [0, 10], bassNotes: [0, 0], roll: [[2, 1], [1.5, .6], [.5, .8]] },
{ name: 'Pop Stomp', icon: '…', meter: '4/4', cat: 'dance',
  kick: [0, 4, 8, 12], snare: [4, 12], clap: [4, 12], hat: [2, 6, 10, 14],
  perc: [2, 6, 10, 14], percSound: 'tamb',
  bass: [0, 6, 8, 14], bassNotes: [0, 0, 0, 4], roll: [[1, 1], [.5, .6], [.5, .8], [2, .9]] },
{ name: 'Motown Stomp', icon: '…', meter: '4/4', cat: 'funky',
  kick: [0, 8, 14], snare: [0, 4, 8, 12], hat: [2, 6, 10, 14],
  perc: [4, 12], percSound: 'tamb',
  bass: [0, 4, 8, 12], bassNotes: [0, 4, 7, 4], roll: [[1, 1], [1, .7], [1, .85], [1, .7]] },
{ name: 'Halftime Pop', icon: '…', meter: '4/4', cat: 'calm',
  kick: [0, 3, 10], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14],
  perc: [4, 12], percSound: 'snap',
  bass: [0, 3, 10], bassNotes: [0, 0, 4], roll: [[2, 1], [1, .6], [1, .8]] },
```

Bei „Gospel Shuffle“ zusätzlich `perc: [4, 12], percSound: 'tamb'` ergänzen.

### 7c Echter Chor und Klavier als Klangquelle

- Neuer Klang-Typ „Sample-Instrument“. `SYNTH_PRESETS` anhängen (fehlende
  Felder kommen aus `SOUND_DEFAULTS`; `icon` aus `PICTOGRAM`, keins doppelt):

  ```js
  { name: 'Klavier',    icon: '…', cat: 'keys', sample: 'piano',   attack: .003, decay: .3,  sustain: 1, release: .35, cutoff: 12000, resonance: 0, reverbWet: .18, echoWet: .05 },
  { name: 'E-Gitarre',  icon: '…', cat: 'keys', sample: 'guitar',  attack: .003, decay: .3,  sustain: 1, release: .25, cutoff: 9000,  resonance: 0, reverbWet: .15, echoWet: .18 },
  { name: 'Chor Ooh',   icon: '…', cat: 'pad',  sample: 'choir',   attack: .12,  decay: .3,  sustain: 1, release: .6,  cutoff: 8000,  resonance: 0, reverbWet: .35, echoWet: .05 },
  { name: 'Streicher',  icon: '…', cat: 'pad',  sample: 'strings', attack: .25,  decay: .3,  sustain: 1, release: .7,  cutoff: 7000,  resonance: 0, reverbWet: .3,  echoWet: 0 },
  { name: 'Brass Stab', icon: '…', cat: 'lead', sample: 'brass',   attack: .005, decay: .2,  sustain: 1, release: .15, cutoff: 9000,  resonance: 0, reverbWet: .15, echoWet: .08 },
  ```

  `playTone` verzweigt bei `sound.sample`: Klavier über `ChorPianoSamples`
  (falls `piano-samples.js` im Lab verfügbar ist; sonst eigener Loader wie 3a
  auf `samples/salamander/`, inkl. `TUNE`-Korrektur), die übrigen über
  `samples/<sample>/` (nächstliegender Ton, `playbackRate`). Chor und
  Streicher halten lange Töne mit Überblend-Loop (Vorbild:
  `SAMPLE_LONG`/`sampleNote` in `uebe-lab.html`); Klavier, Gitarre und Brass
  klingen natürlich aus. Hüllkurve: attack/release aus dem Preset, Filter und
  Drive bleiben wirksam; Wellenform, Detune/Unison, Sub, Pitch-Drop, LFO,
  Vibrato und Breite gelten bei Samples nicht.
- Klang-Reiter: Bei Sample-Presets nur die wirksamen Regler zeigen (Attack,
  Release, Cutoff, Resonanz, Drive, Hall, Echo); die übrigen ausblenden,
  nicht nur ausgrauen. `sanitizeSound` übernimmt `sample` nur aus der Liste
  `['piano', 'guitar', 'choir', 'strings', 'brass']`, sonst wird es entfernt.
- Ohne Samples (offline/Ladefehler): Klavier, E-Gitarre → „Tape Keys“;
  Chor Ooh → „Airy Choir“; Streicher → „Moon Pad“; Brass Stab → „Soft Brass“.
  Der gewählte Name bleibt sichtbar, dazu der Hinweis „Ersatzklang, Samples
  werden geladen“.
- `CHORD_SOUND` wird wählbar: `chordSound: 'synth' | 'choir'` (Default für neue
  Stände `'choir'`, Chor-Aufgaben behalten `'synth'`).
- Ohne Samples: automatisch „Airy Choir“ bzw. „Tape Keys“.

### 7d Standard für neue Studio-Stände

Pop-Folge, „Pop Stomp“, Melodie „Pop Hook“, Klang „Klavier“, Pop-Satz an,
Chor-Pad an mit Mix `chords: .45`. Nur in `defaultState()` für die
Studio-Ansicht – gespeicherte Stände nicht anfassen.

### 7e Kuratierte Auswahl: weniger, aber gute Vorlagen

Ziel: In den Auswahllisten stehen nur noch Vorlagen mit klarer Rolle für einen
Popchor. Der Rest wandert sichtbar ausgeblendet hinter „Weitere“. Nichts
wird gelöscht oder umsortiert (Indizes in gespeicherten Ständen, Codes,
Workshop, Chor-Aufgaben und de:construct bleiben gültig – die finden ihre
Vorlagen per Name/Index, nicht über die Anzeige).

Umsetzung:
- Konstanten `MELODY_ORDER` und `BEAT_ORDER`: Listen von **Namen** in
  Anzeige-Reihenfolge (Namen statt Indizes, damit sie lesbar bleiben;
  beim Laden per `melodyIndexByName`/`patternIndexByName` auflösen, unbekannte
  Namen im Selbsttest als Fehler melden).
- Picker: zuerst die Einträge aus `*_ORDER` in dieser Reihenfolge (Kategorie-
  Filter wirkt innerhalb), darunter ein eingeklappter Abschnitt
  „Weitere (n)“ mit allen übrigen Einträgen in Indexreihenfolge
  (Schlüssel `lab.moreTemplates`). Ist gerade eine ausgeblendete Vorlage
  gewählt, steht sie zusätzlich ganz oben, markiert als „gewählt“.
- **Würfel** (`_randomize`) wählt nur noch aus `*_ORDER` (passende Taktart).
- Neue Stände starten mit dem ersten passenden Eintrag aus `*_ORDER`.

Melodien, sichtbar (4/4 in dieser Reihenfolge):

```js
const MELODY_ORDER = [
  'Pop Hook', 'Offbeat Chant', 'Anthem Oh', 'Ballad Line', 'Gospel Call',
  'Synco Verse', 'Call & Response', 'Question & Answer', 'Guide Tones',
  // andere Taktarten (Picker zeigt ohnehin nur die passende)
  'Waltz Line', 'Turning Waltz', 'Lullaby', 'Jig Hop',
];
```

Ausgeblendet (Begründung für den Bericht): Hook Line, Sunday Hymn, Long Tones,
Gentle Wave, Suspended Glow (durch die neuen Vorlagen in Tonart-Bezug ersetzt,
die dasselbe besser können); Pentatonic Riff, Syncopated Hook, Echo Motif
(praktisch dieselbe gebrochene Akkordfigur, „Pentatonic“ ist keine
Pentatonik); Offbeat Pop, Bounce (Oktavsprünge, bis 22 Halbtöne Umfang);
Night Window, Blue Third, Funk Thread, Sevenths Hook, Modal Drift, Afterglow
(Synth-Arpeggien über 21–24 Halbtöne – nicht singbar).

Grooves, sichtbar (4/4 in dieser Reihenfolge):

```js
const BEAT_ORDER = [
  'Pop Stomp', 'Pop Ballad', 'Backbeat Open', 'Gospel Shuffle', 'Motown Stomp',
  'Halftime Pop', 'Disco Clap', 'Boom Bap', 'Swing Soul', 'Swing Ride',
  'Vocal Perc Basic', 'Minimal Click',
  // andere Taktarten
  'Waltz Step', 'Jazz Waltz', '6/8 Ballad', 'Folk Jig',
];
```

Ausgeblendet: Pulse Basic, House Bounce, Deep House (dreimal dasselbe
Four-on-the-Floor; Disco Clap bleibt als Vertreter, Pop Stomp ist die
Pop-Fassung); Half-Time Drop (ersetzt durch Halftime Pop); Glass Funk,
Afrobeat Skip, Latin Skip, Broken Beat, Breakbeat Cut, Circuit Pulse
(Nische für einen Popchor); Shuffle Roll (Triolen-Imitat im geraden Raster,
klingt holprig – Swing Soul/Gospel Shuffle machen das richtig).

Klang-Presets, sichtbar (Konstante `PRESET_ORDER`, gleiche Mechanik; der
Kategorie-Filter pad/keys/lead wirkt innerhalb):

```js
const PRESET_ORDER = [
  // keys
  'Klavier', 'Tape Keys', 'Vintage Organ', 'E-Gitarre', 'Neon Pluck', 'Crystal Drops',
  // pad
  'Chor Ooh', 'Streicher', 'Moon Pad', 'Breath Glass',
  // lead
  'Brass Stab', 'Analog Lead', 'Bright Saw',
];
```

Rollen: Klavier ist der Standard für Melodie und Tasten; Vintage Organ ist der
Gospel-Klang; Neon Pluck und Bright Saw decken Dance-Pop ab; Chor Ooh und
Streicher sind die echten Flächen, Moon Pad und Breath Glass die
synthetischen.

Ausgeblendet: Velvet Choir, Airy Choir, Deep Pad (drei fast gleiche
Synth-Chor-Flächen, ersetzt durch Chor Ooh; **Airy Choir bleibt intern
`CHORD_SOUND`-Ersatz**); Soft Brass (ersetzt durch Brass Stab); Square Bell
(Dublette zu Crystal Drops); Warm Sub, Growl Bass, Wobble (Bass-Klänge –
der Bass hat eigene Klänge, als Melodie unbrauchbar); Dub Chamber, Hollow
Band (Nische).

Wichtig: `SOUND_MATCH_PRESETS` (Workshop „Klang nachbauen“) verweist per Name
auf Soft Brass und Warm Sub – das funktioniert weiter, weil Ausblenden nur die
Anzeige betrifft. Der Würfel wählt Klänge nur aus `PRESET_ORDER`, und zwar
ohne Sample-Presets, solange deren Samples nicht geladen sind.

Akzeptanz: Alle Vorlagen bleiben ladbar; ein alter Stand mit „Afterglow“ oder
„Circuit Pulse“ lädt, klingt wie vorher (bis auf 6b) und zeigt die Vorlage
oben als gewählt. Selbsttest: jeder Name in `MELODY_ORDER`, `BEAT_ORDER` und `PRESET_ORDER` existiert, keiner doppelt,
jede Taktart hat mindestens zwei sichtbare Einträge.

---

## Paket 8 – Harmonik: geliehene Akkorde, Zwischendominanten, Umkehrungen

Datenmodell bleibt abwärtskompatibel: `degrees` bleiben Zahlen 0–6.
Neue, optionale Parallel-Arrays gleicher Länge an Folgen (Vorlagen, eigene
Folgen, Zustand `progAlter`/`progBass`):

- `alter[i]`: `null | 'borrow' | 'secdom'`
  - `borrow`: Akkord aus der gleichnamigen Gegen-Tonart (in Dur aus Moll:
    iv, ♭VI, ♭VII, ♭III; in Moll aus Dur: IV, V). Umsetzung in `chordSteps`
    über einen neuen Parameter `alter`.
  - `secdom`: Durdreiklang (mit Septime: Dominantseptakkord) auf der Stufe –
    V/vi = Stufe 2 (in C: E-Dur), V/V = Stufe 1 (D-Dur), V/ii = Stufe 5 (A-Dur).
    Leiter wie der `dom7`-Zweig (Mixolydisch über dem Grundton).
- `bass[i]`: `0 | 1 | 2` = Grundton / Terz / Quinte im Bass (Umkehrung).
  Wirkt auf Bassspur (Paket 5), B-Stimme in SATB (`bassIndex`) und Pop-Satz.

Anpassen: `chordSteps`, `chordPitchClasses`, `chordName` (z. B. „E“, „Fm“,
„B♭“, Slash-Schreibweise „G/H“), `romanNumeral` („V/vi“, „iv“, „♭VII“, „V⁶“),
`sanitizeProgLibrary`, `sanitizeState`, Akkord-Editor (Antippen eines Akkords
→ zusätzliches Menü „Normal · Geliehen · Zwischendominante“ und
„Bass: Grundton · Terz · Quinte“), `progPreview`.

Neue Vorlagen (anhängen, Kategorie `pop`, Namen/Infos in strings.js):

| id | Stufen | alter | bass | Klingt in C |
|---|---|---|---|---|
| `descend` | 0,4,5,3 | – | 0,1,0,0 | C – G/H – Am – F |
| `gospelIv` | 0,3,3,0 | –,–,borrow,– | – | C – F – Fm – C |
| `mixFlat7` | 0,6,3,0 | –,borrow,–,– | – | C – B♭ – F – C |
| `secDom` | 0,2,5,3 | –,secdom,–,– | – | C – E – Am – F |

Tests: `spellCheck`-Fälle für die neuen Namen ergänzen; Voicing-Tests
(keine Parallelen nach `VOICING_STATS`) für die neuen Vorlagen in allen
Tonarten; alte gespeicherte eigene Folgen laden unverändert.

---

## Paket 9 – Sampler

Design-Vorlage (vier Screens: Pads, Aufnehmen, Pad bearbeiten, Im Beat):
https://claude.ai/artifact/MR8VsE5e2AvkYDtZKagUxj – Farben/Abstände aus den
vorhandenen Lab-Variablen (`--accent`, `--bg`, `--line`, `--text`, `--muted`,
`.panel`, Chips) übernehmen, nicht aus dem Mockup abschreiben.

### 9a Datenmodell

- Audio: IndexedDB-Store `files` über `DB.filePut`/`fileGet`/`fileDelete`,
  Schlüssel `labSample:<id>`, Inhalt = aufgenommener Blob (MediaRecorder-Format
  des Geräts, unverändert – wie die REC-Aufnahmen).
- Metadaten: `DB.metaPut({ key: 'labSample:<id>', type: 'labSample', data })` mit
  `data = { id, name (≤ 12 Zeichen), kind: 'hit'|'tone'|'loop', trim: [s, e],
  gainDb, pitch (Halbtöne), reverse, decay (s), reverb (0–1), track
  ('kick'|'snare'|'clap'|'hat'|'open'|'perc', nur hit), layerOriginal (bool),
  toneRole: 'auto'|'root'|'third'|'fifth', detectedMidi, detectedCents,
  loopBars: 1|2, bpmAtRec, meterAtRec, by (Freitext), createdAt }`.
- Lab-Zustand: `sampler: { kits: [{ id, name, pads: [id|null × 8] }], kitId }`
  und im Beat `sampleLanes: [{ padId, steps: { step: velocity } }]` (max. 4).
- Grenzen: max. 64 Samples; Länge hit ≤ 2 s, tone ≤ 4 s, loop ≤ 2 Takte und ≤ 10 s.
- `app.js` → `openGrooveLab`: `options.storage` um
  `samples: { list, get, put(record, blob), remove }` erweitern, `options.mic`
  um `open()` (nutzt `RECORDING_CONSTRAINTS` und `preferWideBandMic()` – die
  Echo-Unterdrückung bleibt aus, Begründung siehe README) und `close(stream)`.
- **Teilen per `GL1.`-Code:** Samples reisen nicht mit. `encodeState` lässt
  `sampler`/`sampleLanes` drin, `sanitizeState` toleriert unbekannte IDs; fehlt
  ein Sample auf dem Gerät, bleibt die Spur stumm und zeigt „Sample fehlt auf
  diesem Gerät“. „Alle Daten löschen“ in den Einstellungen muss auch
  `labSample`-Einträge entfernen (prüfen, ob es das schon über die
  Store-Leerung tut).

### 9b Neuer Reiter „Sampler“

`TABS` um `{ id: 'sampler', labelKey: 'lab.tabSampler' }` nach `melody`
ergänzen. Inhalt gemäß Screen 1:
- Kit-Chips (eigene Kits + „Akustik“/„Elektro“ als schreibgeschützte
  Werks-Kits aus `samples/drums`), „+ Neues Kit“.
- 4×2-Pads: Name, Mini-Wellenform (aus dem dekodierten Puffer, 14 Balken,
  gecacht), Typ. Tippen = abspielen (auch ohne laufenden Loop), lange drücken
  (500 ms) oder Info-Zeile „Bearbeiten“ = Editor. Freies Pad → Aufnehmen.
- Info-Zeile zum gewählten Pad: Name, Rolle, `by`, Länge.
- Knöpfe „Aufnehmen“ und „Bibliothek“ (Bibliothek = Werks-Samples + eigene
  Samples aus anderen Kits; ein Pad verweist nur, kopiert nicht).
- Pads sind echte `<button>`, `aria-label` mit Name und Typ, Tastatur:
  Tasten 1–8 spielen Pads, wenn der Reiter offen ist.

### 9c Aufnehmen (Screen 2)

- Typwahl Schlag / Ton / Phrase (Pflicht, beeinflusst Grenzen und Schnitt).
- Live-Wellenform + Pegelanzeige über einen `AnalyserNode` am Lab-Kontext;
  „Pegel gut“ bei Peak zwischen −18 und −3 dBFS.
- Optionen: Einzählen (1 Takt über den Lab-Scheduler; bei Phrase Pflicht),
  Klick, Automatisch schneiden (Default an).
- Kopfhörer-Hinweis immer sichtbar; Bluetooth-Headset-Hinweis wie im Player.
- Nach dem Stopp: Auto-Trim = Anfang/Ende bei −45 dBFS relativ zum Peak,
  2 ms Vorlauf, 10 ms Ausblenden. Bei Phrase stattdessen ab Takt-Eins,
  Versatz = `ctx.outputLatency + ctx.baseLatency` (wie `anchor.lat` im Player),
  im Editor nachjustierbar.
- **Ton:** Tonhöhe per YIN (oder Autokorrelation) über die mittleren 50 % des
  geschnittenen Bereichs → `detectedMidi`, `detectedCents`. Keine Tonhöhe
  erkannt → als Schlag speichern und Hinweis zeigen.

### 9d Pad bearbeiten (Screen 3)

- Wellenform mit zwei ziehbaren Schnittmarken (Pointer-Events, Mindestabstand
  20 ms, Tastatur: Pfeile ±10 ms, mit Umschalt ±1 ms), „Anhören“,
  „Auto-Schnitt“, „Rückwärts“.
- Segment „Spielt als: Schlag · Ton · Loop“ mit den Unteroptionen aus dem Mockup.
- Regler: Tonhöhe ±12, Ausklingen, Hall, Lautstärke (−24…+6 dB).
- Name, „aufgenommen von“ (Freitext, optional), Löschen (mit Sicherheitsabfrage).
- Änderungen werden erst mit „Fertig“ gespeichert; Abbrechen verwirft.

### 9e Wiedergabe

- **hit:** `playSample` mit Trim, Gain, Pitch (`playbackRate`), Reverse
  (umgedrehter Puffer, gecacht), Ausklingen (Gain-Rampe), Hall-Send.
- **tone:** Zielton je Akkord: `auto` = der Akkordton (Grundton/Terz/Quinte
  des klingenden Akkords) mit dem kleinsten Abstand zu `detectedMidi`;
  sonst die gewählte Rolle in der nächstgelegenen Oktave. Rate =
  `2^((ziel − detectedMidi − detectedCents/100 + pitch)/12)`, Transposition auf
  ±7 Halbtöne begrenzen (sonst Oktave falten). Dauer bis zum nächsten Treffer
  der Spur bzw. zum Akkordwechsel, Release 80 ms. Lange Töne: Überblend-Loop
  wie Paket 7c.
- **loop:** startet nur auf einer Takt-Eins und läuft taktweise. Tempo:
  bei |bpm/bpmAtRec − 1| ≤ 3 % per `playbackRate`; sonst mit
  `signalsmith-stretch.js` einmal je Tempo offline auf die neue Länge rendern
  und cachen. Geht das nicht ohne große Umbauten: in v1 Loops nur im
  Aufnahmetempo ±3 % abspielen und sonst den Hinweis „Tempo wie bei der
  Aufnahme (♩ x)“ zeigen – **nie** die Tonhöhe verschieben. Im Bericht festhalten.
- Samples laufen über den Drum-Bus (hit/loop) bzw. die Ebene `keys` (tone),
  damit Mixer, Pumpen und Effekte greifen.

### 9f Im Beat (Screen 4)

- Neues Pad „ins Raster legen“ (Knopf im Editor bzw. Pad-Menü) erzeugt eine
  `sampleLane` direkt unter der Zielspur. Die Schritte werden von der Zielspur
  kopiert; die Zielspur wird stumm (`trackOn[track] = false`), außer
  `layerOriginal` → Zielspur spielt mit 35 % Velocity weiter.
- Sample-Spuren im Raster: Badge mit Pad-Farbe, Zellen wie andere Spuren,
  Velocity über die vorhandene Mehrfach-Tipp-Logik (`CELL_CYCLE`: 1 → .6 → aus).
  Ton-Spuren zeigen in der Zelle den aktuell klingenden Tonnamen (`noteLabel`).
- Kick-Sample-Spur löst `duckAt` aus wie die Kick.
- **Live einspielen:** Pad-Reihe unter dem Raster (die ersten vier Pads des
  Kits). Bei laufendem Loop und „Ins Raster schreiben“ wird der Anschlag auf
  die nächste Sechzehntel quantisiert – Zeitpunkt = Tipp-Zeit in
  Kontextzeit minus `outputLatency`, gegen `scheduledSteps` abgeglichen.
  Alles rückgängig machbar über die vorhandene Undo-Historie.
- Feel (Paket 3b) gilt auch für Sample-Spuren.

### 9g Tests und Prüfung

- `runMusicSelfTests`: Tonziel-Rechnung (`auto` wählt den nächsten Akkordton,
  Begrenzung ±7), Quantisierung, `sanitizeState` mit fehlenden/ungültigen
  Sample-IDs, Grenzen (Länge, Anzahl).
- Manuell (im Bericht abhaken): iPhone Safari und Android Chrome –
  Aufnahme mit Kabel-Kopfhörer, Bluetooth-Hinweis, Wiedergabe nach App-Neustart,
  „Alle Daten löschen“ entfernt Samples, Offline-Start.
- CSP: `index.html` erlaubt `media-src blob:` und `connect-src 'self'` bereits;
  falls ein Worker/Worklet dazukommt, CSP laut `CLAUDE.md` erweitern.

---

## Abschluss

- `README.md`: Abschnitt „Groove Lab: Samples und Sampler“ (Datenhaltung,
  Grenzen, was beim Teilen nicht mitreist). Kopfkommentar von `groove-lab.js`
  („kein Sample“) korrigieren.
- `TODO.md`: offene Punkte aus den Berichten übernehmen.
- Anweisung + Bericht nach `docs/archiv/` verschieben (gleiche PR wie Paket 9).
