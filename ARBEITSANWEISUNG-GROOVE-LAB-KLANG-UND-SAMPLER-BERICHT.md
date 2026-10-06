# Bericht: Groove Lab – Klang, Popchor-Ausrichtung und Sampler

## Paket 1 – Mix-Korrekturen (erledigt)

**Was / wo** (`GrooveEngine.start()` in `groove-lab.js`):
- Limiter: `threshold -3`, `knee 0`, `ratio 20`, `attack .002`, `release .12`.
- Hall: `reverbIn → preDelay (25 ms) → convolver → reverbHP (Highpass 250 Hz, Q .7) → reverbReturn → master`.
  Der Hall läuft nicht mehr über `duck` und pumpt damit nicht mehr mit; Echo bleibt am `duck`.
- Signalweg-Kommentar am Klassenkopf aktualisiert.
- `GrooveEngine` und `buses.reverbReturn` für Tests bereitgestellt (`_test.GrooveEngine`).
- `SW_VERSION` v516 → v517.

**Abweichung (begründet):** Statt den Master-Gain `.8` zu ändern, sitzt ein fester
Vorpegel `limiterTrim = .78` zwischen `master` und Limiter. `.8` ist der Startwert des
Nutzer-Reglers `mix.master` und steht so in gespeicherten Ständen; ein anderer Startwert
würde bestehende Mischungen verschieben.

**Messung** (headless Chromium, echter `AudioContext`, `AnalyserNode` hinter dem Limiter;
4 Takte: Kick, Snare, Hats, Bass, Akkord, Melodie; alt = Stand vor Paket 1):

| Stand | Pumpen | Peak | RMS |
|---|---|---|---|
| alt | 0 | −0,5 dBFS | −21,2 dB |
| neu (Trim .78) | 0 | −1,12 dBFS | −21,9 dB |
| alt | .8 | −0,3 dBFS | −21,5 dB |
| neu (Trim .78) | .8 | −1,09 dBFS | −22,3 dB |

Peak bleibt unter −1 dBFS; Lautheit ~0,7 dB leiser als vorher (Trim .88 wäre gleich laut,
aber Peak −0,7 dBFS und damit über der Vorgabe).

**Offen:** Hörprobe der Akzeptanz (Pumpen 0 → keine Pegelbewegung; Pumpen hoch → Hallfahne
pumpt nicht) steht aus, da hier nicht hörbar prüfbar. Die Messung belegt nur Pegel.

## Paket 2 – Sample-Ergänzungen (erledigt, mit Lücke)

- `samples/aufbereiten.sh`: ride, ride-bell, tamb, shaker ergänzt (VCSL `c1ea7bc`, CC0); Instrumente bleiben über `inst`.
- Neu: `choir/` 45–63, `bass/` 30/33/36, `guitar/` 54/57/60, `drums/` ride, ride-bell, tamb, shaker.
- **`snap` fehlt:** VCSL enthält keinen Fingerschnipser; keine Ersatzquelle mit geklärter Lizenz eingebaut. „Halftime Pop“ (Paket 7b) klingt dort mit Synthese.
- Die Instrument-Ordner werden mit *einer* Verstärkung je Instrument normalisiert (lautester Ton → −1 dB). Die neuen tiefen Gitarrentöne sind lauter, deshalb sind die alten `guitar/*.mp3` leicht leiser neu kodiert (nur Pegel). `bass/` und `choir/` blieben unverändert.
- `uebe-lab.html`: `SAMPLE_INST` um die neuen Töne erweitert; `uebeLab.selfCheckAudio()` liefert keine Fehler (headless geprüft).
- `samples/LIZENZ.md` ergänzt; `SAMPLES_CACHE` v3 → v4; `SW_VERSION` v518.
- Größe `samples/`: 2,9 → 3,2 MB (≈ +300 KB, unter dem Limit von ~400 KB).

## Paket 3 – Echte Drums und Dynamik (erledigt)

- `LabSamples` (in `groove-lab.js`): lädt `samples/drums/*.mp3` nach `engine.start()` im Hintergrund (3 parallel, fehlende Datei → `null`), wird mit dem Kontext verworfen. `GrooveEngine.playSample`, `playTom`, erweitertes `hitTrack(track, time, velocity, kit, opts)`.
- Zustand `drumKit` (`auto|synth|acoustic|hybrid`), `feel`, `percSound` in `defaultState()` und `sanitizeState()`. `auto`: dance → synth, breaks → hybrid, calm/funky → acoustic.
- UI: Panel „Schlagzeug-Klang“ mit Kit-Chips im Beat-Reiter (im Workshop ausgeblendet, in de:construct per `dc-bass-panel`).
- Feel (`_playStep`): Hi-Hat-Akzente (`hatAccent`), `hat-soft` bei Faktor < .7, Velocity ± 6 %, Hats ± 3 ms; Raster bleibt unverändert.
- Percussion-Spur `perc` (hinter `open`), `CELL_CYCLE.perc = [1, .5]`, `percSound` folgt dem Loop-Wert; ohne Sample Rausch-Fallback. `hatSound: 'ride'` bei „Swing Ride“.
- **Pinning** über `pinLegacySound(s)`: `lessonState`, `choirTaskState`, `dcBuild` (Original und Meine Version) setzen `drumKit: 'synth'`, `feel: false`, `trackOn.perc: false`; Challenges schalten `perc` ab. Alte gespeicherte Stände aus Chor/Workshop/de:construct ohne die neuen Felder laden ebenfalls gepinnt. Die Perc-Spur ist im Workshop und in de:construct ausgeblendet.
- Pegel: Samples sind auf −1 dBFS normalisiert; Pegel je Sample (`LAB_DRUM_LEVEL`) per Messung (Headless, `AnalyserNode`) auf die Synthese abgestimmt: Kick/Snare ca. gleicher Peak, Hats/Perc/Clap liegen als echte Instrumente deutlich hörbarer als das Rauschen der Synthese.
- Tests (`runMusicSelfTests`, Block `GROOVE-LAB-KLANG-TESTS`): Kit-Auflösung, Akzente, Defaults/Alt-Stände/Müll, Pinning aller Aufgaben/Einheiten/Songs, Engine-Weiche je Spur mit Spionen. Lauf headless: grün.
- `SW_VERSION` v519.
- Offen: Hörprobe auf dem Gerät; `snap` fehlt (siehe Paket 2), „Halftime Pop“ nutzt dort Synthese.
