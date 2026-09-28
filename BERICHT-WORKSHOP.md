# Bericht: Groove Lab – Workshop

Grundlage: `ARBEITSANWEISUNG-WORKSHOP.md` (im ersten Commit eingecheckt), dazu die
Regeln aus Abschnitt 1 und 3 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`. Ausgangsstand
`759702e` (= `main` beim Start, `SW_VERSION` v339). Alle acht Pakete sind umgesetzt,
keins wurde zurückgesetzt. Nach je zwei Paketen wurde auf Wunsch kurz pausiert.

**Branch:** `claude/instructions-with-pauses-9lk146` statt `workshop`. Die
Sitzungsumgebung erlaubt nur Pushes auf diesen vorgegebenen Branch. Er zweigt von
`759702e` ab, kein Rebase, kein Merge von `main`, kein Force-Push. PR:
bokajsukriz/choirapp#150.

## Status

| Paket | Inhalt | Status | Commit | SW_VERSION | Prüfungen |
|---|---|---|---|---|---|
| 1 | Grundgerüst: Datenmodell, Ansicht, Zielprüfung, Fortschritt | umgesetzt | `6cc2a59` | v340 | Chor-Referenz (10 Aufgaben × 5 Stimmwahlen) byte-identisch; Roundtrip `view`/`lessonId`/`_saved.workshop` (neu, alt, 6 × Müll); `synkope` besteht die allgemeinen Prüfungen; headless: Feld 9 aus, Feld 11 an → „Geschafft!“, Fortschritt nach Neuladen da, Vorher/Nachher schaltet das Kick-Muster |
| 2 | Rundgang (9 Einheiten) | umgesetzt | `8d8728f` | v341 | 9/9 allgemeine Prüfungen; headless per Test-Export → „Rundgang 9/9“ und `lab.ws.tourDone`; alle Fokus-Elemente gefunden |
| 3 | Vertiefung Rhythmus (7) | umgesetzt | `f0e582e` | v342 | 7/7; Tresillo-Ziel = Kick von „Latin Skip“; `dreiSechs` per Picker = Lösung (♩. = 40, 120 Achtel, Melodie „Lullaby“); Ghost Notes per Doppeltipp |
| 4 | Vertiefung Harmonie (8) | umgesetzt | `5a18f8c` | v343 | 8/8; `durMoll` C-Dur {0,4,7} → c-Moll {0,3,7}, `dreiklang` {0,4,7}; `modal` passt zu Dorisch und Mixolydisch; `halbschluss` per Editor und `bluesSept` per Septimen-Schalter = Lösungen; `leitton` per Pads |
| 5 | Vertiefung Melodie (6) | umgesetzt | `d0dd54b` | v344 | 6/6; „Long Tones“ Takt 1 = `[[0,4,8],[8,2,8]]` (auch als Selbsttest); `antizipation` per Maus (Tippen + Ziehen) = Lösung; `reibung` per Tippen; Arp per Auswahl |
| 6 | Vertiefung Klang mit Kick-Parametern (9) | umgesetzt | `b361ac1` | v345 | 9/9; Standard-Kick bitgenau unverändert (Mock-AudioContext, 15 Fälle mit/ohne `kit`); `kit`-Roundtrip neu/fehlend/Müll; Stand von `main` ohne `kit` lädt mit Standard-Kick; Scheduler reicht `kit` an `playKick` durch; Kick-Regler im Browser bedient |
| 7 | Vertiefung Mix (4) | umgesetzt | `da1cead` | v346 | 4/4; `buildup`-Lösung besteht `sanitizeAutomation` unverändert; echte Automations-Aufnahme im Browser (1 Takt, 16 Werte, 3704–7283 Hz) erfüllt das Ziel; Echo und Stummschalter per Bedienung |
| 8 | Challenges (4) | umgesetzt | `875ace6` | v347 | 47/47 Einheiten gesamt; mit fester Zufallsfunktion: 200 Detektiv-Varianten je genau eine Zelle anders, nie Kick Feld 1; Nachbauen-Zählung (4 Fälle, nie negativ); Klang-Rätsel an den Grenzen (Faktor 1,35 in beide Richtungen, ±40 %, ±0,05 s = Treffer; knapp darüber nicht); headless: Detektiv 5 Runden (A/B im Zwei-Takt-Wechsel, Tipp nach 3 Versuchen, „4 von 5“), Nachbauen 3 Runden, Klang-Rätsel 3 Runden |

Jedes Paket wurde vor dem Commit so geprüft:
- `node --check` für `groove-lab.js`, `app.js`, `strings.js` (als Modul geladen).
- Node-Prüfskript (Scratchpad, nicht im Repo): `harmony.js` und `groove-lab.js` in
  einem `vm`-Kontext geladen, die allgemeinen Prüfungen aus Abschnitt 3 für alle
  vorhandenen Einheiten plus die Paket-Prüfungen.
- Headless-Chromium (Playwright vorinstalliert, nichts nachinstalliert):
  `chorApp.selfTestMusic()` → `[]`, dazu je Paket ein Durchlauf mit echten
  Klicks/Gesten und Screenshots bei 390 px Breite. Zum Schluss
  `chorApp.selfTest()`, `chorApp.selfTestAsync()`, `chorApp.selfTestMusic()` → je `[]`,
  keine Seitenfehler.
- Die allgemeinen Prüfungen und alle Paket-Zusatzprüfungen stehen auch in
  `runMusicSelfTests` (`app.js`).

## Je Paket

### 1 – Grundgerüst
- **Dateien:** `groove-lab.js`, `strings.js`, `app.js`, `sw.js`, `ARBEITSANWEISUNG-WORKSHOP.md`
- **Geändert:** `applyTaskSet` aus `choirTaskState` herausgelöst; `LESSON_TIERS`,
  `LESSON_AREAS`, Prüf-Helfer, `WORKSHOP_LESSONS`, `focusKeyKnown`, `lessonState`,
  `sanitizeWorkshopProgress` (alle im Test-Export). Zustand: `lessonId`,
  `view: 'workshop'`. Dritter Chip „Workshop“; `.workshop-view` mit Stufen, Bereichen,
  Einheiten-Chips (✓ + `aria-label` „geschafft“), Karte (Anleitung, Teilziele als
  Kästchen, „Warum?“, Aha-Satz, „Neu starten“, „Vorher/Nachher“, „Weiter →“),
  `aria-live`-Ansagen. Fokus/Dimmen (`_wsFocusEls`, `_wsDecorate`), Markierungen
  `.ws-from` (gestrichelt) und `.ws-to` (Ring, bei reduzierter Bewegung statisch).
  Zielprüfung höchstens einmal pro Frame nach Klick/Eingabe/Änderung/Pointerup/Keyup
  sowie aus `_afterStateChange`, `_onSoundEdit`, `_toggleCell`, `_progCommit`,
  `_melCommit`, `_autoFinish`; gespielte Töne aus `_enterKey` (auch Latch).
  Fortschritt in `_saved.workshop` über die vorhandene Ablage.
- **Abweichungen:**
  - Liegt ein Fokus-Element in einem anderen Reiter als `lesson.tab`, wird dessen
    Abschnitt zusätzlich eingeblendet (übrige Abschnitte dieses Reiters bleiben
    ausgeblendet). Ohne das wären z. B. „Dein erster Track“, „Bass und Grundton“ und
    „Echo im Rhythmus“ nicht lösbar.
  - Während „Vorher“ sind neben den Karten-Knöpfen auch die gezeigten Panels `inert`,
    sonst gingen Änderungen am Ausgangszustand beim Zurückschalten verloren. „Undo“
    und „Zufall“ schalten vorher auf „Nachher“ zurück.
  - Die Ansichts-Knöpfe im Kopf sind jetzt ≥ 44 px und stehen auf schmalen
    Bildschirmen (≤ 560 px) in einer eigenen Zeile — bei 390 px überlappten sie sonst
    den Titel.
  - Einheiten mit Fokus `progEditor`/`progSevenths`/`melEditor` öffnen den jeweiligen
    Editor beim Wählen; aufgeklappte Experten-Bereiche („Mehr Einstellungen“,
    „Kick-Klang“) öffnen sich, wenn ein Fokus-Element darin liegt.
  - `ui.ws.reached` ist eine Anzahl statt einer Liste (die Teilziele fallen ohnehin
    nur der Reihe nach).
  - Beim Chor-Referenzvergleich wird das neue Feld `lessonId` (Standard `null`)
    herausgenommen; sonst byte-identisch.

### 2 – Rundgang
- **Dateien:** `groove-lab.js`, `strings.js`, `sw.js`
- **Geändert:** neun Einheiten in der vorgegebenen Reihenfolge, Texte DE/EN/PL.
- **Abweichungen:** keine.

### 3 – Vertiefung Rhythmus
- **Dateien:** `groove-lab.js`, `strings.js`, `app.js`, `sw.js`
- **Geändert:** sieben Einheiten. `lessonState` wählt wie `_ensureMelodyMeter` eine
  Melodie in der Taktart des Loops (sonst änderte `sanitizeState` den Walzer-Stand).
  Lösung von `dreiSechs` wie der Loop-Wechsel im Picker.
- **Abweichungen:** keine.

### 4 – Vertiefung Harmonie
- **Dateien:** `groove-lab.js`, `strings.js`, `app.js`, `sw.js`
- **Geändert:** acht Einheiten. Lösungen nach dem echten Editorverhalten:
  `halbschluss` = `[0,3,4,4]` mit `progDominant: true` (von der Kadenz geerbt);
  `bluesSept` Schritt 2 räumt die bearbeitete Kopie wieder weg (`_progCommit` erkennt
  die unveränderte Vorlage) statt nur `progSevenths = true` zu setzen.
- **Abweichungen:** DE-Text `harmRhythmus.do` nennt die echte Beschriftung
  („Akkordwechsel“ auf „alle 2 Takte“ statt „Takte pro Akkord“ auf 2).

### 5 – Vertiefung Melodie
- **Dateien:** `groove-lab.js`, `strings.js`, `app.js`, `sw.js`
- **Geändert:** sechs Einheiten; Selbsttest sichert Takt 1 von „Long Tones“.
- **Abweichungen:**
  - `antizipation`: Die Skizze (`[0][1][0] = 6`) hätte überlappende Töne ergeben, die
    `sanitizeMelodyBars` kürzt. Lösung wie der Editor: neuer Ton auf Feld 7 lang
    gezogen verdrängt den Ton auf Feld 9 und kürzt den ersten → `[[0,4,6],[6,2,8]]`.
  - DE-Text `echo.do` nennt den echten Schalter „Melodie jeden 2. Takt (Echo)“.

### 6 – Vertiefung Klang
- **Dateien:** `groove-lab.js`, `strings.js`, `app.js`, `sw.js`
- **Geändert:** `KIT_DEFAULTS`/`KIT_RANGES`, `state.kit`, `sanitizeState` je Feld mit
  Bereich; `playKick(time, velocity, kit)`, `hitTrack(…, kit)`; Scheduler, Halten-Roll
  und Vorhören reichen `this.state.kit` durch. Studio → Beat: einklappbare Zeile
  „Kick-Klang“ (drei Regler, Zurücksetzen, „· bearbeitet“ im Kopf). Neun Einheiten.
- **Abweichungen:** DE-Text `lfo.do` nennt die echte Auswahl „Im Takt“ statt „Sync“.
  Auch der Halten-Roll (Druck auf den Kreis vor der Spur) nutzt das `kit`.

### 7 – Vertiefung Mix
- **Dateien:** `groove-lab.js`, `strings.js`, `sw.js`
- **Geändert:** vier Einheiten; `buildup`-Lösung in der Form von
  `_autoFinish`/`sanitizeAutomation`.
- **Abweichungen:** keine.

### 8 – Challenges
- **Dateien:** `groove-lab.js`, `strings.js`, `app.js`, `sw.js`
- **Geändert:** reine Funktionen `pickChallengePattern`, `detectiveVariant`,
  `rebuildScore`, `soundMatch`, `soundMatchTarget` (Zufall über injizierbares `rng`,
  in der Ansicht `this._wsRng`); Ablauf in `_wsCh…`; Scheduler-Weichen `_beatAt(g)` und
  `_heardSound()` (außerhalb laufender Challenges unverändert Stand-Beat und
  Stand-Klang). Karte mit Runde, großem „A“/„B“ (B gefüllt, nicht nur Farbe),
  Vorbild/Deins, Trefferzahl bzw. Parameterliste „passt/noch nicht“, „Los“ und „Noch
  eine Runde“. Eingaben schalten automatisch auf „Deins“.
- **Abweichungen:**
  - `gospelRemix` bleibt auf `Pulse Basic`: Auch `Backbeat Open` hat kein
    `swingUnit: 8`, ein Wechsel brächte ohne Eingriff in `_swingOffset` keinen
    Achtel-Swing. Der Text verweist wie vorgesehen auf „Gospel Shuffle“.
  - `gospelRemix` hat keinen eigenen Ablauf und kein „Los“ — es startet deshalb wie
    die anderen Einheiten beim Antippen.
  - `klangRaetsel` bekommt `groove: 'Minimal Click'`, `melody: 'Hook Line'` und
    `set: { bpm: 96, progId: 'pop' }` — ohne Melodie klänge der Synth gar nicht.
  - Vorbild/Deins beim Nachbauen tauscht nur, was klingt; das Raster zeigt immer den
    eigenen Stand (ein echter Zustandstausch würde die Lösung zeigen).
  - Der Startklang (`SOUND_DEFAULTS`) trifft „Tape Keys“ schon in allen vier Größen
    (Dreieck, 3000 vs. 3100 Hz, Attack gleich, Release 0,4 vs. 0,32 s). Solche Ziele
    werden nicht gezogen; es bleiben Neon Pluck, Soft Brass, Moon Pad, Bright Saw,
    Warm Sub. Einzelne Größen passen bei manchen Zielen schon zu Beginn (z. B. Attack
    bei Neon Pluck).
  - „x von y“ zählt beim Detektiv die Runden, die im ersten Versuch sitzen; beim
    Nachbauen und Klang-Rätsel ist jede Runde erst bei voller Übereinstimmung
    geschafft, dort steht deshalb immer „3 von 3“.

## Zu entscheiden

- Hinweis „Rundgang geschafft!“ erscheint auf jeder Rundgang-Karte, sobald alle neun
  geschafft sind — nur auf der letzten zeigen?
- Zählweise: DE „1 e + e“ (wie in der Übe-App), EN „1 e & a“, PL „1 e i e“. Die
  polnische Zählung ist ungebräuchlich — besser „1 e + e“ übernehmen?
- Das Ergebnis „x von y“ bei Nachbauen/Klang-Rätsel ist immer voll (siehe oben).
  Soll es dort ein „Überspringen“ geben, damit die Zahl etwas aussagt?
- In `reibung` legt bloßes Antippen fa mit der eingestellten Länge (1/8) an, danach
  eine Lücke bis Feld 9. Das Ziel ist trotzdem erreicht — Text um „lang ziehen“
  ergänzen?
- Fokus-Elemente aus fremden Reitern werden eingeblendet (siehe Paket 1). Alternative
  wäre, `lesson.tab` für diese Einheiten auf einen Reiter zu legen, der alles enthält
  (gibt es für „Dein erster Track“ nicht).
- **Unsichere PL-Formulierungen:**
  - „Wycieczka“ für „Rundgang“ (Alternativen: „Zwiedzanie“, „Przegląd“).
  - „Z house’u hip-hop“ (Titel `houseHipHop`).
  - „Ghost notes“, „Build-up“, „Break i drop“, „Glide“ unübersetzt belassen.
  - „Pompowanie“ für „Pump“, „Słuchowy detektyw“, „Odtwórz“, „Zagadka brzmieniowa“.
  - Gegenderte Formen „muzycy i muzyczki“, „kompozytorzy i kompozytorki“, „śpiewaków
    i śpiewaczek“ — „muzyczki“ ist ungewöhnlich.
  - „Jak powstaje stopa?“ („Stopa“ wie `lab.trackKick`).

## Nachträge nach Rückmeldung

| Änderung | Umsetzung |
|---|---|
| „Modus“ statt „Tongeschlecht“ | Die Auswahl im Groove Lab (Studio → Harmonie, Chor-Ansicht) und der Hilfetext zur Tonart heißen jetzt „Modus“, passend zu den Workshop-Texten (EN „Mode“, PL „Tryb“ unverändert). |

## Nicht umgesetzt

Nichts aus der Anweisung ausgelassen. Außerhalb des Auftrags blieben wie gefordert
`CHOIR_TASKS`, `DRUM_PATTERNS`, `MELODIES`, `PROGRESSIONS`, `SYNTH_PRESETS`,
`uebe-lab.html` und `einsingen.html` unverändert.

## Manuell auf echten Geräten prüfen

- Hörtest Kick-Klang: Endtonhöhe hoch (Piepen), tief und lang (808), Zurücksetzen
  klingt wie vorher.
- Hör-Detektiv: A/B-Wechsel im Zwei-Takt-Rhythmus hörbar und mit der Anzeige
  synchron (auch mit Bluetooth-Latenz).
- Klang-Rätsel und Nachbauen: Umschalten Vorbild/Deins ohne Knacken, taktgenau.
- Echo 1/8 punktiert, Pumpen, Build-up-Automation auf schwächeren Handys.
- Lesbarkeit der Karte und der gedimmten Regler bei 320 px und im Querformat.
- Screenreader (VoiceOver/TalkBack): Ansage „Erreicht: …“, „geschafft“ an Chips und
  Teilzielen.
