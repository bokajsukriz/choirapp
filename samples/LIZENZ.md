# Samples: echte Instrumente („Einsatz finden“), Klavier (`engine.keys`, `piano.html`, `einsingen.html`) und Schlagzeug (Vorklatschen und Begleit-Groove in `uebe-lab.html`, Drumloops in `metronom.html`)

Aufbereitet für `uebe-lab.html` (alle Songs von „Einsatz finden“; das Klavier
zusätzlich für alle Vorgabetöne und Akkorde in Hören und Singen über
`engine.keys`): Stille am Anfang
entfernt, gekürzt, ausgeblendet, mono, Pegel angeglichen, als MP3 neu kodiert
(Schlagzeug 96 kbit/s, Instrumente 64 kbit/s). Dateiname der Instrumente =
MIDI-Tonhöhe (60 = c′). Skript: `aufbereiten.sh` in diesem Ordner. Ausnahme:
das Klavier (`salamander/`) liegt unverändert hier, siehe unten.

## Schlagzeug (`drums/`) – VCSL, CC0 1.0

Versilian Community Sample Library, Versilian Studios LLC,
https://github.com/sgossner/VCSL (Stand `c1ea7bc`). Gemeinfrei (CC0 1.0,
Volltext `LICENSE-VCSL-CC0.txt`), keine Namensnennung nötig.

| Datei | Quelle in VCSL |
|---|---|
| kick | Membranophones/Struck Membranophones/Bass Drum 2/bassdrum_hit_f.wav (zusätzlich Hochpass 35 Hz) |
| snare | …/Snare Drum, Modern 1/Snare2_HitSN_v7_rr1_Mid.wav |
| snare-soft | …/Snare Drum, Modern 1/Snare2_HitSN_v5_rr1_Mid.wav |
| rim | …/Snare Drum, Modern 1/Snare2_stick_v1_rr1_Mid.wav |
| hat | Idiophones/Struck Idiophones/Hi-Hat Cymbal/HiHat_HitC_v3_rr1_Mid.wav |
| hat-soft | …/Hi-Hat Cymbal/HiHat_HitC_v2_rr2_Mid.wav |
| open | …/Hi-Hat Cymbal/HiHat_HitO_rr1_Mid.wav |
| tom-hi | Membranophones/Struck Membranophones/Tom 1/Stick/TomH_HitS_v4_rr1_Mid.wav |
| tom-lo | …/Tom 2/Stick/TomL_HitS_v4_rr1_Mid.wav |
| crash | Idiophones/Struck Idiophones/Suspended Cymbal 2/susCymb2_hit_stick_mf1.wav |
| clap | Idiophones/Struck Idiophones/Claps/Clap_rr1.wav |

## Instrumente (`bass/`, `strings/`, `guitar/`, `choir/`, `brass/`) – FluidR3_GM, CC BY 3.0

FluidR3_GM-Soundfont von Frank Wen, als Einzeltöne gerendert von Benjamin
Gleitzman: https://github.com/gleitz/midi-js-soundfonts (Ordner `FluidR3_GM`,
Lizenzangabe dort: Creative Commons Attribution 3.0,
https://creativecommons.org/licenses/by/3.0/). Hier verändert (siehe oben).

| Ordner | Instrument (GM-Name) |
|---|---|
| bass | electric_bass_finger |
| strings | string_ensemble_1 |
| guitar | electric_guitar_clean |
| choir | choir_aahs |
| brass | brass_section (Bläser-Hits der Stabs) |

Töne je Ordner: alle drei Halbtöne über den Umfang aller Songs in allen
Tonarten (Liste `SAMPLE_INST` in `uebe-lab.html`). Streicher: 3,1 s, nur
kurz ausgeblendet – längere Flächen setzt die App aus überblendeten Stücken
zusammen.

## Klavier (`salamander/`) – Salamander Grand Piano, CC BY 3.0

Salamander Grand Piano V3 (Yamaha C5) von Alexander Holm, in der Fassung von
Tone.js: https://github.com/Tonejs/audio, Ordner `salamander/` (Lizenzangabe:
Creative Commons Attribution 3.0, https://creativecommons.org/licenses/by/3.0/).
Die 25 Dateien (C1–C7, ein Ton alle drei Halbtöne, 44,1 kHz stereo) liegen hier
**unverändert**, nur umbenannt auf die MIDI-Tonhöhe (`C4.mp3` → `60.mp3`,
`Ds4` → `63`, `Fs4` → `66`, `A4` → `69`). Verändert wird erst beim Laden in
der App (`piano-samples.js`): Stille am Anfang entfernt, je nach Seite auf 3–10 s
gekürzt, ausgeblendet, zu Mono gemischt, Pegel angeglichen und umgestimmt.
Verwendet von `engine.keys` und den Song-Klavieren in `uebe-lab.html`, von
`piano.html` und `einsingen.html`.

## Stimmung des Klaviers

Salamander ist konzertmäßig „gespreizt“ gestimmt. Gemessen wurde je Datei der
Grundton (fein gerasterte DFT um den Sollton, Hann-Fenster, 0,12–1,12 s nach
dem Anschlag; bis 36 am 2. Teilton, weil der Grundton dort zu schwach ist; 39
Mittel aus Grundton −11 und 2. Teilton −6). Ergebnis in Cent gegenüber
gleichstufig (a′ = 440 Hz):

| Datei | 24 | 27 | 30 | 33 | 36 | 39 | 42 | 45 | 48 | 51 | 54 | 57 | 60 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cent | −24 | −17,2 | −10,5 | −7,3 | −9,5 | −8,5 | −5,4 | −5,6 | −6,1 | −1,9 | −5,9 | +0,8 | −1,4 |

| Datei | 63 | 66 | 69 | 72 | 75 | 78 | 81 | 84 | 87 | 90 | 93 | 96 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cent | +1,2 | −2,9 | +0,7 | +4,9 | +3,3 | +4,4 | +7,1 | +8,6 | +6,8 | +12,1 | +14,7 | +23,6 |

Die App rechnet diese Abweichung beim Abspielen heraus (`TUNE` in
`piano-samples.js`); `selfCheckAudio()` in `uebe-lab.html` misst die Tonhöhe
der Wiedergabe nach. Eine Autokorrelation (YIN) über den ganzen Klang misst
wegen der gestreckten Obertöne zu hoch – deshalb die Messung im Spektrum.
