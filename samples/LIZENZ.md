# Samples für „Einsatz finden“ (echte Instrumente)

Aufbereitet für `uebe-lab.html` (alle Songs von „Einsatz finden“): Stille am Anfang
entfernt, gekürzt, ausgeblendet, mono, Pegel angeglichen, als MP3 neu kodiert
(Schlagzeug 96 kbit/s, Instrumente 64 kbit/s). Dateiname der Instrumente =
MIDI-Tonhöhe (60 = c′). Skript: `aufbereiten.sh` in diesem Ordner.

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

## Instrumente (`bass/`, `piano/`, `strings/`, `guitar/`, `choir/`, `brass/`) – FluidR3_GM, CC BY 3.0

FluidR3_GM-Soundfont von Frank Wen, als Einzeltöne gerendert von Benjamin
Gleitzman: https://github.com/gleitz/midi-js-soundfonts (Ordner `FluidR3_GM`,
Lizenzangabe dort: Creative Commons Attribution 3.0,
https://creativecommons.org/licenses/by/3.0/). Hier verändert (siehe oben).

| Ordner | Instrument (GM-Name) |
|---|---|
| bass | electric_bass_finger |
| piano | acoustic_grand_piano |
| strings | string_ensemble_1 |
| guitar | electric_guitar_clean |
| choir | choir_aahs |
| brass | brass_section (Bläser-Hits der Stabs) |

Töne je Ordner: alle drei Halbtöne über den Umfang aller Songs in allen
Tonarten (Liste `SAMPLE_INST` in `uebe-lab.html`). Streicher: 3,1 s, nur
kurz ausgeblendet – längere Flächen setzt die App aus überblendeten Stücken
zusammen.
