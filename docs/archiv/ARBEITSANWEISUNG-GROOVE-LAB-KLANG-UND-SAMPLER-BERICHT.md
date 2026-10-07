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

## Paket 4 – Automatische Fills (erledigt)

- Zustand `fills: 0 | 4 | 8` (Default 8; Chor-Aufgaben, Workshop und de:construct über `pinLegacySound` auf 0; alte Chor-/Workshop-/de:construct-Stände ohne Feld → 0).
- Reine Funktion `fillAt(g, barSteps, fills)` → `{ idx, crash, fillBar }`; `_playStep` schaltet in den letzten vier Schritten des Fill-Takts (4/4: 12–15, 3/4 und 6/8: 8–11) Snare/Clap/Hat/Open/Perc stumm und spielt `tom-hi` 1 / .7, `tom-lo` 1 / .85; Kick und Bass bleiben. Crash (Velocity .8) auf Schritt 0 des Folgetakts. Ohne Tom-Samples Synth-Tom (Sinus 200→120 bzw. 140→85 Hz, .25 s), ohne Crash-Sample ein kurzes Rauschen.
- UI: Chips „Fills: Aus · Alle 4 Takte · Alle 8 Takte“ im Panel „Schlagzeug-Klang“; Fill-Schritte werden beim Abspielen mit `is-fill` dezent markiert (Raster bleibt unverändert).
- Tests im Block `GROOVE-LAB-KLANG-TESTS`. `SW_VERSION` v520.

## Paket 5 – Bass: Notenlängen, Lage, echter Bass (erledigt)

- `playBass(time, midi, velocity, sound, duration)`: 5 ms Anstieg → Peak → in `decay` auf Peak × `sustain` → halten bis `duration` → 60 ms Release. `BASS_SOUNDS` mit `sustain` (pluck 0, sub .8, growl .6, round .7). Die Dauer kommt aus `bassNoteSteps()` (Schritte bis zum nächsten Bass-Ton im Takt, mind. 1) × Schrittlänge × .92. Vorhören/Pads/Roll spielen kurz (.3 s).
- `_bassRoots()` + reine Funktion `bassRootsFor()`: erster Grundton 36–47, weitere in der nächstgelegenen Oktavlage (Gleichstand → tiefer), gecacht pro Tonart/Modus/Folge; `_bassMidi` rechnet ab diesem Grundton.
- **Abweichung:** Der Bereich für die weiteren Grundtöne ist **28–47** statt 33–47. Mit 33–47 ist die geforderte Prüfung („kein Grundton-Sprung > 7 Halbtöne“) unerfüllbar (z. B. D → A → H → G: 35 → 43 = 8; C → G → A → F: 33 → 41 = 8). 28 = tiefes E der Bassgitarre. Die Töne bleiben ≤ 54 (Grundton + Quinte).
- Neuer Klang `finger` („Finger Bass“, `samples/bass/`, nächster Ton, `playbackRate`, Gate wie oben); ohne geladene Samples klingt `round`. Default `bassSoundId` für neue Stände `'finger'`, gespeicherte behalten ihren; Chor-Aufgaben, Workshop und de:construct (`pinLegacySound`) bleiben bei `'pluck'`. Pegel von `finger` per Messung auf Round Finger abgestimmt (Level .6).
- Tests (Block `GROOVE-LAB-KLANG-TESTS`): Sustain-Werte, Defaults/Pinning, `bassNoteSteps`, Grundtöne I–V–vi–IV in allen 12 Tonarten (richtige Tonhöhenklasse, Bereich, Sprung ≤ 7, ≤ 54). Grün. `SW_VERSION` v521.
- Offen: Hörprobe, vor allem „Bass halbe Noten“ in de:construct „Lighthouse Hands“ (klingt dort mit `pluck` weiter kurz — dort ist der Klang gepinnt).

## Paket 6 – Melodien: Ohrwurm statt Sequenz (erledigt, mit Abweichungen)

- **6a:** `MELODIES`-Einträge mit `ref: 'key'` und fertigen `bars` (Vorberechnung überspringt Einträge ohne `vary`). `melodyRefOf(index)`; `_melody()`, `dcMelodyEvents`, Melodie-Editor (`_melBegin`, `_melCommit`, `_melSaveOwn`) und Echo (`melodyAltBars`) behandeln `ref: 'key'`. Echo gilt für Vorlagen mit Tonart-Bezug; Aufnahmen und gespeicherte Tonart-Melodien spielen weiter jeden Takt.
- **6b:** `snapMelodyMidi(midi, pcs)` (exportiert, getestet): in `_playMelodyStep` für alle Vorlagen (nicht für `state.melodyBars` und nicht für die Aufnahme-Schleife) auf Schlägen (`METERS[meter].beats`) eine kleine None über einem Akkordton (inkl. Septime) auf den Akkordton absenken.
- **6c:** `foldDegree` bleibt als Grundlage, dazu wählt `melodyBarShifts()` je Takt eine Verschiebung in {−12, 0, +12} (also `melodyOctave` ± 1 Oktave). **Abweichung:** statt Takt für Takt greedy wird die ganze Periode (Akkordfolge × Melodietakte, Ende → Anfang) auf einmal gelöst (kleinste Summe der Sprünge, dann nahe der alten Lage, dann tiefer). Das reine Takt-für-Takt-Verfahren bleibt an der ±12-Grenze „hängen“ (der Grundton wandert reihum) und verbesserte z. B. „Hook Line“ nicht. Ergebnis über alle alten 4/4-Vorlagen und sechs Tonart/Folgen-Kombinationen: größter Sprung zwischen Takten 22 → 12 Halbtöne, Summe nie schlechter als vorher. `melodyMidi` hat einen optionalen Parameter `shift`; de:construct-Vergleiche rechnen unverändert.
- **6d:** sieben neue Vorlagen angehängt. **Abweichung:** „Synco Verse“ endet in Takt 4 auf der Quinte `[12, 4, 4]` statt der Oktave `[12, 7, 4]`; mit der Oktave ist der Sprung Takt 4 → 1 genau 12 Halbtöne und verletzt die geforderte Prüfung (≤ 9).
- **6e:** Standard-Klang der Melodie in `defaultState()` jetzt „Tape Keys“ (Paket 7c stellt später auf „Klavier“ um). Workshop und de:construct beginnen weiter mit „Velvet Choir“ (`pinLegacyVoice`); gespeicherte Stände unverändert.
- Fingerabdruck: Melodielogik von `uebe-lab.html` nicht berührt, `MELODY_VERIFIED` unverändert.
- Tests (Block `GROOVE-LAB-KLANG-TESTS`): Vorlagenliste, `snapMelodyMidi`, jede neue Vorlage über C-Dur/a-Moll × pop/sad/fifties (Schlag-Prüfung, Sprung ≤ 9 inkl. Takt 4 → 1), Oktavlage über alle alten 4/4-Vorlagen, Klang-Defaults, Laden. Grün. `SW_VERSION` v522.
- Offen: Hörprobe; Choir-Aufgabe „Echo“ (Call & Response) und Workshop-Melodien nutzen jetzt die neue Oktavlage/Anpassung (laut 6b/6c für alle Vorlagen gewollt).

## Paket 7 – Ausrichtung Popchor (erledigt, mit Abweichungen)

- **7a Pop-Satz:** `voiceProgressionPop(keyRoot, mode, prog, { add9, topMax, bassIndexes })` in `harmony.js` (exportiert), Format wie `voiceProgressionSatb` (`{ S, A, T, B }` je Akkord, Fokus/Stumm je Stimme funktionieren weiter). Bass 40–52 (nächste Oktavlage, Gleichstand → tiefer), T/A/S in enger Lage (≤ 1 Oktave), keine Stimmkreuzung, kleinste Gesamtbewegung, offene Quint-/Oktavparallelen nur, wenn es nicht anders geht. `add9`: nur Dur/Moll-Dreiklang ohne Septime, nie vermindert, nie `dom7`, nie bei Umkehrungen. Zustand `chordVoicing` (`satb|pop`), `chordAdd9`; UI im Harmonie-Reiter („Satz: Chor (SATB) · Pop“, Schalter „Farbe: add9“); mit laufender Melodie liegt die Oberstimme höchstens auf 64 (statt 69). `CHOIR_TASKS`/Workshop/de:construct sind über `pinLegacySound` auf `satb` gepinnt.
  - **Abweichung:** Liegt unter der Grenze 64 kein Akkordton im Bereich 60–64 (z. B. add9 über Es-Dur), darf die Oberstimme ausnahmsweise bis 54 hinabgehen, sonst gäbe es keinen Satz.
  - Test über alle 21 Folgen × 4 Modi × 12 Tonarten × (add9 an/aus): Ambitus, enge Lage, Akkordtöne, Bass = Grundton.
- **7b Grooves:** „Pop Ballad“, „Pop Stomp“, „Motown Stomp“, „Halftime Pop“ angehängt (neue Strich-Icons `heart`, `boot`, `tambourine`, `hourglass`); „Gospel Shuffle“ mit `perc: [4, 12]`. „Halftime Pop“ nutzt `snap` (kein Sample, siehe Paket 2) → Synthese.
- **7c Sample-Klänge:** Presets „Klavier“, „E-Gitarre“, „Chor Ooh“, „Streicher“, „Brass Stab“ (Icons `piano`, `guitar`, `mic`, `harp`, `trumpet`). `GrooveEngine.ensureInstrument()` lädt je Instrument im Hintergrund (Klavier über `ChorPiano` aus `piano-samples.js` inkl. `TUNE`; `loadGrooveLab()` in `app.js` lädt diese Datei jetzt mit, ein Fehler dort ist unkritisch), `_playSampleTone()` spielt sie als Stimme (Attack/Release aus dem Preset, Filter und Drive der Ebene bleiben wirksam; Chor und Streicher mit überblendetem Loop wie `sampleNote` in `uebe-lab.html`, Klavier/Gitarre/Brass klingen aus). Ohne Samples übernimmt `playTone` den Ersatzklang (Tape Keys / Airy Choir / Moon Pad / Soft Brass), der Name bleibt, im Klang-Reiter steht „Ersatzklang, Samples werden geladen“. `sanitizeSound` übernimmt `sample` nur aus der Liste. Bei Sample-Klängen zeigt der Klang-Reiter nur Attack, Release, Cutoff, Resonanz, Drive, Hall, Echo (Rest ausgeblendet, auch das Makro „Breite“). `chordSound: 'synth' | 'choir'` (Default für neue Stände `'choir'`, Chor-Aufgaben/Workshop/de:construct `'synth'`, alte Stände `'synth'`).
  - **Abweichung / Zusatz:** Für den Überblend-Loop des Chors wurden die Dateien `samples/choir/*.mp3` neu aufbereitet (3,1 s mit kurzem Ausblenden statt 2,5 s mit 1 s Ausblenden, wie `strings/`); `samples/aufbereiten.sh` angepasst, `SAMPLES_CACHE` → v5. In `uebe-lab.html` ändert sich dadurch nur das Ende der Chor-Töne (die Chops dort sind kürzer).
  - Pegel je Instrument (`LAB_INST[…].level`) per Messung auf die Synth-Entsprechungen abgestimmt (±1 dB RMS); Haltetöne von Chor und Streichern bleiben über 5 s innerhalb ±1,5 dB (Loop ohne Einbruch).
- **7d Studio-Standard:** `defaultState()` = Pop Stomp, Pop-Folge, „Pop Hook“, „Klavier“, Pop-Satz, Chor-Pad an (Mix `chords` .45). Alte gespeicherte Stände werden nicht angefasst (fehlende Felder fallen auf das frühere Verhalten); Workshop und de:construct beginnen weiter mit dem alten Stand (`pinLegacyStudio`).
- **7e Kuratierte Auswahl:** `MELODY_ORDER`, `BEAT_ORDER`, `PRESET_ORDER` (Namen, mit `…IndexByName` aufgelöst); Picker zeigt zuerst diese Einträge in der Reihenfolge, darunter eingeklappt „Weitere (n)“ (Indexreihenfolge); ist eine ausgeblendete Vorlage gewählt, steht sie zusätzlich oben („gewählt“). Würfel wählt nur aus den Listen (Klänge ohne Sample-Presets, solange deren Samples nicht geladen sind); der Taktartwechsel nimmt den ersten sichtbaren Loop der Taktart. Nichts wurde gelöscht/umsortiert. Selbsttests: alle Namen vorhanden, keine doppelt, je Taktart ≥ 2 sichtbare Einträge, „Soft Brass“/„Warm Sub“ bleiben für den Workshop.
  - Begründung der ausgeblendeten Vorlagen: wie in der Anweisung (ersetzt durch neue Vorlagen, gleiche gebrochene Akkordfigur, Oktavsprünge/Umfang, nicht singbar, Nische).
- Tests im Block `GROOVE-LAB-KLANG-TESTS`, UI-Rauchtest (Headless): Beat-/Harmonie-/Klang-Reiter und Klang-Auswahl rendern fehlerfrei. `SW_VERSION` v523.
- Offen: Hörprobe aller Sample-Klänge auf dem Gerät.

## Paket 8 – Harmonik: geliehene Akkorde, Zwischendominanten, Umkehrungen (erledigt)

- **Datenmodell** (abwärtskompatibel, `degrees` bleiben Zahlen 0–6): optionale Parallel-Arrays `alter[i]` (`null | 'borrow' | 'secdom'`) und `bass[i]` (`0 | 1 | 2` = Grundton/Terz/Quinte im Bass) an Vorlagen (`PROGRESSIONS`), eigenen Folgen (`sanitizeProgLibrary`) und im Zustand (`progAlter`, `progBass`). `sanitizeState` normalisiert Länge/Werte; alte gespeicherte Stände ohne die Felder laden unverändert (eine bearbeitete Vorlage erbt die Werte ihrer Vorlage).
- `harmony.js`: `chordSteps(steps, modeId, prog, deg, alter)` — `borrow` baut den Akkord aus der Tonleiter der Gegen-Tonart (Dur ← Moll: iv, ♭VI, ♭VII, ♭III; Moll ← Dur: IV, V), `secdom` aus der Mixolydisch-Leiter über dem Grundton (wie `dom7`: Durdreiklang, mit Septime Dominantseptakkord). `leadingToneOf(…, alter)` liefert bei geliehenen Akkorden/Zwischendominanten `null`. `voiceProgressionSatb` und `voiceProgressionPop` lesen `prog.alter`/`prog.bass` (B-Stimme auf Terz/Quinte; ohne Angabe bleibt der verminderte Akkord auf der Terz). Neue `SPELL_CASES` für B♭/A♭/As/H/E/D.
- Lab: `harmonyOfState`/`_harmonyAt` liefern `alter` und `bass`; `romanNumeral` (V/vi, V/V, iv, ♭VII, V⁶, I⁶₄, V7/vi) und `chordName` (E, Fm, B♭, As, G/H; geliehene Akkorde mit Vorzeichen der Gegen-Tonart) angepasst; Akkordleiste, Akkordtafeln in de:construct, Auswahl und `progPreview` (geliehene Balken blasser) zeigen sie. Bass: `bassNoteMidi()` legt Stufe 0 auf den Basston der Umkehrung, die übrigen Stufen bleiben Stufen über dem Grundton; `_bassRoots()` führt den Basston (Stimmführung wie Paket 5).
- Akkord-Editor: pro Akkord Chips „Akkord: Normal · Geliehen · Zwischendominante“ und „Bass: Grundton · Terz · Quinte“ (Hinzufügen/Entfernen/Verschieben/Undo/Eigene Folgen führen die Arrays mit; der Akkord klingt zur Kontrolle an).
- Neue Vorlagen (Kategorie `pop`, Namen/Infos de/en/pl): `descend` (C – G/H – Am – F), `gospelIv` (C – F – Fm – C), `mixFlat7` (C – B♭ – F – C), `secDom` (C – E – Am – F).
- Tests: Akkordtöne aller sieben Fälle (C-Dur) und der beiden Moll-Fälle, Stufenzahlen und Namen, Zustand/Bibliothek laden (auch alte), `bassNoteMidi` und Bass-Umfang der neuen Vorlagen in allen 12 Tonarten, `spellCheck`. Der SATB-Test über alle Folgen × 12 Tonarten × 4 Modi (jetzt 5088 Akkordwechsel) bleibt ohne Parallelen, ohne verdoppelten Leitton, im Umfang, ohne Stimmkreuzung; die Basstöne (Umkehrung/verminderter Sextakkord) werden mitgeprüft. `SW_VERSION` v524.
- Offen: Hörprobe der Umkehrungen/Zwischendominanten; im Pop-Satz zählt `VOICING_STATS` nicht mit (dort sind Parallelen weich vermieden).

## Paket 9 – Sampler (erledigt, mit Abweichung bei Loops)

Design-Vorlage (vier Screens) gelesen; Farben/Abstände aus den Lab-Variablen (`--accent`, `--bg`, `--line`, `--text`, `--muted`, `.panel`, Chips), die Pad-Farben je Art aus den vorhandenen Stimmfarben.

- **9a Datenmodell:** `sanitizeSampleMeta` (Name ≤ 12, Art, Schnitt `trim`, `gainDb`, `pitch`, `reverse`, `decay`, `reverb`, `track`, `layerOriginal`, `toneRole`, `detectedMidi/Cents`, `loopBars`, `bpmAtRec`, `meterAtRec`, `by`, `createdAt`; Längen je Art begrenzt), `sanitizeSampler` (≤ 8 Kits à 8 Pads, Werks-Kits „Akustik“/„Elektro“ aus `samples/drums`), `sanitizeSampleLanes` (≤ 4 Spuren). Zustand `sampler`, `sampleLanes` (Undo, Speicherplätze und `GL1.`-Code schließen sie ein; unbekannte Sample-Ids bleiben stehen und schweigen mit „Sample fehlt auf diesem Gerät“). `app.js`: `options.storage.samples` (`list/get/put/remove` über `DB.metaByType('labSample')`, `fileGet`, `putFileAndMeta`, `deleteMetaAndFiles`) und `options.mic` (`open` mit `recordingAudioConstraints()` + `preferWideBandMic()`, `close`, `quality`). „Alle Daten löschen“ (`DB.wipe`) leert beide Stores und nimmt die Samples mit (geprüft: es ist eine Store-Leerung). Backups enthalten sie nicht (wie bisher den Lab-Stand nicht).
- **9b Reiter „Sampler“** (nach „Melodie“; in Workshop/de:construct ausgeblendet): Kit-Chips (eigene + Werks-Kits, „+ Neues Kit“, Kit löschen), 4×2 Pads als echte `<button>` mit `aria-label` (Name, Art), Mini-Wellenform (14 Balken, gecacht), Tippen = abspielen (sofort beim Aufsetzen, auch ohne Loop), Halten (500 ms) = Editor, Info-Zeile mit „Bearbeiten“ und „Ins Raster legen“, Tasten 1–8 spielen die Pads, freies Pad → Aufnehmen, „Aufnehmen“ und „Bibliothek“ (Werks-Samples + eigene; ein Pad verweist nur).
- **9c Aufnehmen:** Art Schlag/Ton/Phrase, Live-Wellenform und Pegelanzeige über einen `AnalyserNode` („Pegel gut“ −18…−3 dBFS), Einzählen (1 Takt Klicks; bei Phrase Pflicht), Klick, Auto-Schnitt (−45 dB rel. Spitze, 2 ms Vorlauf, 10 ms Ausblenden), Kopfhörer-Hinweis immer, Bluetooth-/Schmalband-Hinweis über `mic.quality`; Phrase ab Takt-Eins mit Versatz `outputLatency + baseLatency`; Ton: YIN auf den mittleren 50 % des Schnitts, ohne Tonhöhe als Schlag gespeichert (mit Hinweis).
- **9d Editor:** Wellenform mit zwei ziehbaren Schnittmarken (Zeiger; Tastatur: Pfeile ±10 ms, Umschalt ±1 ms; Mindestabstand 20 ms), Anhören, Auto-Schnitt, Rückwärts, „Spielt als“ (Schlag: Spur + „Originalklang leise darunter“; Ton: erkannter Ton/Cent + Akkordton; Loop: 1/2 Takte), Regler Tonhöhe ±12, Ausklingen, Hall, Lautstärke −24…+6 dB, Name, „aufgenommen von“, Löschen mit Rückfrage. Änderungen gelten erst mit „Fertig“ (Zurück/„Abbrechen“ verwirft sie); ein frisch aufgenommenes Sample ist schon gespeichert und bleibt es.
- **9e Wiedergabe:** `GrooveEngine.playPad` (Bereich, Pegel, Umstimmung, Rückwärts über gecachten Puffer, Ausklingen, Hall-Send). Schlag/Loop über den Drum-Bus (Kick-Spur löst `duckAt` aus), Ton über die Ebene `keys` mit Zielton je Akkord (`sampleToneTarget`/`sampleToneRate`: `auto` = nächster Akkordton, Umstimmung auf ±7 Halbtöne begrenzt, Dauer bis zum nächsten Treffer bzw. Akkordwechsel, 80 ms Release, überblendeter Loop bei kurzem Bereich). Loop nur auf einer Takt-Eins, taktweise. **Abweichung (laut Anweisung erlaubt, hier Variante „v1“):** Loops laufen nur im Aufnahmetempo ±3 % (per `playbackRate`); sonst schweigt der Loop und die Oberfläche zeigt „Tempo wie bei der Aufnahme (♩ x)“ — die Tonhöhe wird nie verschoben. Strecken mit `signalsmith-stretch.js` steht in `TODO.md`.
- **9f Im Beat:** „Ins Raster legen“ (Zielspur stumm bzw. mit 35 %), Sample-Spuren unter der Zielspur im Raster (Zellen 1 → .6 → aus, bei Tönen der klingende Tonname, Vorhören, An/Aus), „Live einspielen“ mit vier Pads unter dem Raster und „Ins Raster schreiben“ (Quantisierung auf die nächste Sechzehntel: Tipp-Zeit − Ausgabe-Latenz gegen den zuletzt eingeplanten Schritt), alles über die Undo-Historie rücknehmbar; Feel gilt auch für Sample-Spuren (Velocity-Streuung, Hi-Hat-Akzent und ±3 ms bei Hat-Spuren).
- **9g Tests:** `runMusicSelfTests` prüft Grenzen, `sanitizeSampleMeta/Sampler/SampleLanes`, Laden mit fehlenden/ungültigen Ids und alte Stände, Tonziel (auto/Rolle, ±7), Rate, Quantisierung, Loop-Tempo, Auto-Schnitt, Tonhöhe (YIN auf künstlichen Signalen, Geräusch ohne Tonhöhe) und Mini-Wellenform; headless mit der Browser-Fake-Mikrofonquelle durchgespielt (Aufnehmen → Editor → Fertig → Ins Raster → Live-Pad → Loop-Wiedergabe → Bibliothek → Kits → Halten/Löschen → ohne Fehler). `uebeLab.selfCheck()` und `selfCheckAudio()` grün. Manuelle Geräteprüfung (iPhone Safari, Android Chrome: Kabel-Kopfhörer, Bluetooth-Hinweis, Wiedergabe nach Neustart, „Alle Daten löschen“, Offline-Start) steht aus — **nicht abgehakt**, siehe `TODO.md`.
- **CSP:** unverändert (`media-src blob:` und `connect-src 'self'` genügen; kein Worker/Worklet).
- Noch offen: ein Sample-Pad „aufnehmen“ ohne `options.mic` (reine Test-/Embed-Umgebung) zeigt „Dieses Gerät kann hier nicht aufnehmen“. `README.md` (Abschnitt „Groove Lab: Samples und Sampler“) und `TODO.md` sind ergänzt, Anweisung und Bericht liegen jetzt in `docs/archiv/`. `SW_VERSION` v526.

---

# Gesamtbericht

**Stand:** alle neun Pakete der Arbeitsanweisung sind umgesetzt und per Selbsttests (`chorApp.selfTest`, `selfTestAsync`, `selfTestMusic`, `selfTestProgress`, `uebeLab.selfCheck`/`selfCheckAudio`) im Headless-Chromium grün. Gehört auf *eine* Branch/PR (Auflage dieser Umgebung: nur ein Branch); die Pakete liegen als getrennte Commits vor.

| Paket | Kern | `SW_VERSION` |
|---|---|---|
| 1 | Limiter statt Kompressor, Hall am Pumpen vorbei (Peak −1,1 dBFS gemessen) | v517 |
| 2 | Samples: Chor/Bass/Gitarre tiefer, Ride/Ride-Bell/Tamb/Shaker (≈ +300 KB) | v518 |
| 3 | Sample-Kit (Auto/Synth/Akustik/Hybrid), Feel, Percussion-Spur, Ride | v519 |
| 4 | Automatische Fills (Toms, Crash) | v520 |
| 5 | Bass: Notenlängen (Gate), Stimmführung, Finger-Bass-Samples | v521 |
| 6 | Melodien: 7 Vorlagen mit Tonart-Bezug, Akkord-Anpassung, Oktavlage | v522 |
| 7 | Popchor: Pop-Satz (+add9), 4 Grooves, Sample-Klänge, Studio-Standard, kuratierte Auswahl | v523 |
| 8 | Geliehene Akkorde, Zwischendominanten, Umkehrungen (4 Vorlagen) | v524 |
| 9 | Sampler (Aufnehmen, Editor, Wiedergabe, Raster, Live) | v525/v526 |

**Abweichungen von der Anweisung (alle oben begründet):**
1. Eine PR statt einer je Paket (nur ein Branch erlaubt).
2. Paket 1: fester Vorpegel `.78` vor dem Limiter statt Änderung von `mix.master` (Nutzerwert in gespeicherten Ständen); Lautheit ≈ −0,7 dB gegenüber vorher, Peak < −1 dBFS.
3. Paket 2: kein `snap`-Sample (VCSL hat keinen Fingerschnipser, keine Quelle ohne geklärte Lizenz); Gitarren-Dateien wegen neuer lauterer Töne mit etwas anderem Pegel neu kodiert; Chor-Dateien in Paket 7 mit 3,1 s neu aufbereitet.
4. Paket 5: Bass-Grundtöne im Bereich 28–47 statt 33–47 — mit 33–47 ist die geforderte Prüfung („kein Sprung > 7 Halbtöne“) nicht erfüllbar.
5. Paket 6: Oktavlage wird für die ganze Periode gelöst (nicht Takt für Takt „hängend“); „Synco Verse“ endet auf der Quinte statt der Oktave (sonst Sprung 12 > 9 Halbtöne).
6. Paket 7: Pop-Satz darf bei Obergrenze 64 und fehlendem Akkordton bis 54 hinabgehen; `samples/choir` neu aufbereitet (Loop).
7. Paket 9: Loops nur im Aufnahmetempo ±3 % (v1-Variante der Anweisung).

**Nicht geprüft (kann diese Umgebung nicht):** alles Hörbare (Limiter-Pumpen, Klangbalance, Sample-Klänge, Fills, Umkehrungen) und die Geräteprüfungen von Paket 9 (iPhone/Android, Mikrofon mit Kabel/Bluetooth, Neustart, Offline). Die Pegel der Samples/Instrumente sind per Messung (RMS/Peak im Headless-Chromium) auf die Synthese abgestimmt, nicht nach Gehör.

**Offene Punkte** stehen in `TODO.md`: Geräte-/Hörprobe, Loop-Strecken, `snap`-Sample.

## Nachträge zu PR 177

1. `hatAccent`: 6/8 mit der punktierten Viertel als Zählzeit (`step % 6 === 0` → 1, `% 2` → .72, sonst .55); `METERS['6/8'].beats` unverändert; Test ergänzt.
2. de:construct (`dcBuild`, Original und „Meine Version“) nutzt `bassSoundId: 'round'`, Workshop und Chor-Aufgaben bleiben bei `'pluck'`; alte de:construct-Stände ohne Feld laden mit `'round'`. Test: „Lighthouse Hands“ (Bass auf 0 und 8) hält als halbe Noten (`bassNoteSteps` = 8, Round Finger mit Sustain).
3. `percSound: 'snap'` ohne Snap-Sample: Clap-Sample mit Hochpass 1,5 kHz, Pegel .5; Rauschen nur, wenn auch `clap` fehlt oder das Kit auf Synth steht.
4. `ride-bell` entfernt (Datei, `LIZENZ.md`, `aufbereiten.sh`); `SAMPLES_CACHE` v6.
5. Ride-Choke: der vorige Ride-Treffer blendet beim nächsten Ride-Schlag in 80 ms auf 30 % ab (Test mit Spionen).
`SW_VERSION` v528.
