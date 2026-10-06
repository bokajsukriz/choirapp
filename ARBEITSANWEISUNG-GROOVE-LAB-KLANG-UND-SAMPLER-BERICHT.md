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
