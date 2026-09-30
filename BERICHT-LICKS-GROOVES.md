# Bericht: Licks & Grooves

Grundlage: `ARBEITSANWEISUNG-LICKS-GROOVES.md` (im ersten Commit von `pop-rhythmuskurs` mit
eingecheckt), dazu die Regeln aus Abschnitt 1 und 3 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`.
Ausgangsstand: Ende von `pop-rhythmuskurs` (`57b1453`, `SW_VERSION` v374). Kein Rebase, kein
Merge von `main`, kein Force-Push.

## Ergebnis der Weiche (Teil B)

`main` (`a9213fc`) enthält den Pop-Rhythmuskurs noch nicht — er liegt auf dem Branch
`pop-rhythmuskurs` (Pull Request 159, nicht gemergt). Damit Teil B nicht ausfallen musste, zweigt
`licks-grooves` **nicht von `main`, sondern von `pop-rhythmuskurs` ab**. Der Pull Request für diesen
Branch hat deshalb `pop-rhythmuskurs` als Basis; nach dem Merge von PR 159 auf `main` kann die Basis
auf `main` umgestellt werden. Auf dem Branch gilt:

```
$ grep -n "const COURSE_EXTRA_CH\|function accompFor\|function visibleAids" uebe-lab.html
1030:  const COURSE_EXTRA_CH = 7; // freiwillig, zählt nicht zum Kursfortschritt
1321:  function accompFor(lesson, step, settings = {}) {
2360:  function visibleAids({ mode, phase, course = false, showNotes = false, markSelf = false }) {
```

Alle drei sind vorhanden: Teil B ist umgesetzt.

## Status

| Paket | Inhalt | Status | Commit | SW_VERSION | Prüfungen |
|---|---|---|---|---|---|
| A1–A6 | `licks.html` (Gerüst, Klang und Begleitung, acht Licks, Übe-Ablauf, Durchhalten, Status und Wiederholen), Einbindung (Tools-Seite, `sw.js`, `strings.js`, `app.js`, Dokumentation), Fortschrittsbereich `licks` | umgesetzt (ein Commit, siehe Abweichungen) | `930c8fc` | v375 | `licks.selfCheck()` `[]`; `licks.selfCheckAudio()` `[]`; `chorApp.selfTest()`, `selfTestAsync()`, `selfTestMusic()` `[]`; Durchlauf mit simuliertem Spiel: Schritte 1–7, alle vier Durchhalten-Stufen (auch 16 Takte mit Lücken), Wiederholen; Offline-Start (Cache enthält `licks.html`, Seite lädt ohne Netz); Sichtprüfung 390 px |
| B1 | Klatsch-Grooves in `uebe-lab.html` (Liste, Hören, Auffrischen, Durchhalten, Einschätzung, Wiederholen), Ablage `rhythm.grooves` | umgesetzt | `6fa19c1` | v376 | `uebeLab.selfCheck()` `[]` inkl. neuer `groovesCheck()`; gemeinsame `judgeHold`-Vektoren; `courseCheck()` weiter `[]`; Durchlauf mit simulierten Anschlägen; Sichtprüfung 390 px |
| B2 | „Heute wiederholen“ mit Grooves und Licks, Kachel „Klatsch-Grooves“ aktiv, Schnellstarts | umgesetzt | `99b73c5` | v377 | `chorApp.selfTest()` `[]` (neu: `groovesDue`/`groovesOf`, Kombinationen 0/0, n/0, 0/n, n/m, kaputte Stände → 0); Tools-Seite im echten iframe: Karte, Knöpfe, deaktivierte Kachel ohne Lektionen |

Jedes Paket wurde vor dem Commit so geprüft (Playwright mit dem vorinstallierten Chromium, nichts
nachinstalliert): `node --check` für alle Inline-Skripte und `.js`-Dateien, die genannten
`selfCheck()`-Funktionen, `chorApp.selfTest()`, `selfTestAsync()`, `selfTestMusic()`, dazu
Sichtprüfung per Screenshot bei 390 px. Die Prüfskripte lagen im Scratchpad, nicht im Repo.

Der Vergleich der Blöcke `HOLD_STAGES`, `holdPlan`, `judgeHold`, `holdMessage`, `nextDue`, `addDays`,
`localDate`, `holdVectors` zwischen `licks.html` und `uebe-lab.html` ist Zeichen für Zeichen
identisch (mit einem Skript geprüft, nicht committet).

## Je Paket

### A1–A6 — `licks.html` und Einbindung
- **Dateien:** `licks.html` (neu), `sw.js` (`SHELL_OPTIONAL` und `TOOL_PAGES`), `index.html`,
  `app.js`, `strings.js` (DE, EN, PL), `CLAUDE.md`, `README.md`.
- **Geändert:**
  - Neue Tool-Seite: Liste mit Kategorien-Chips, „Anhören“ (Lick einmal über Groove `full`), Status
    Neu/Lerne/Sitzt; sieben Schritte (Hören, Mitsingen, Startton, Stückweise, Ganz, Durchhalten,
    Notenbild); Bildschirmtasten mit Mehrfach-Touch (kein Wischen, Lage über „Okt −/+“); fünf Klänge und
    Schalter „Glide“ je Lick gespeichert; `sanitizeLicksState`; Ablage `licks`.
  - Reine Funktionen wie in der Anweisung: `holdPlan`, `judgeHold`, `holdMessage`, `partMessage`,
    `degreeLabel`, `nextDue`, `statusOf`, `grooveFor`, `keyboardRange`; exportiert als `window.licks`.
  - Hören statt Sehen nach Tabelle 2b: Während eines Laufs steht nur der Platzhalter „Nach Gehör“
    (für alle Bausteine und Schritte byte-gleich, geprüft); kein Taktzähler, keine Marke, keine
    leuchtenden Tasten. Ergebnisse erscheinen nach dem Lauf (Zeitleiste, Taktstreifen mit schraffierten
    stillen Takten). Das Notenbild (Piano-Roll mit Zählzeilen, Glide-Verbindung, Marke, leuchtende
    Tasten) gibt es nur im letzten Schritt und lässt sich im Zahnrad abschalten.
  - Tools-Seite: neuer Abschnitt „Licks & Grooves“ mit Karte „Heute wiederholen“ und zwei Kacheln;
    `QUICK_STARTS.licks` und `.licksReview`; `licksDue` in `app.js`; `PROGRESS_AREAS` um `licks`
    ergänzt (in keiner Gruppe von `PROGRESS_GROUPS`). Jeder Durchhalten-Lauf meldet
    `{ area: 'licks', level, right, seconds }`.
  - Wiederholen (`?review=1`): fällige Licks nacheinander — Hören → Durchhalten auf der höchsten
    geschafften Stufe (mindestens 1) → Einschätzung.
- **Abweichungen (mit Grund):**
  - **Commit-Zuschnitt:** Die Pakete A1 bis A6 hängen in einer einzigen Datei eng zusammen
    (Schrittleiste, Läufe und Ergebnisse teilen Zeitleisten-, Klang- und Anzeigecode). Ich habe sie in
    einem Zug gebaut und geprüft und **als ein Commit** eingecheckt (`930c8fc`), statt sechs
    künstlich abgespeckte Zwischenstände zu erzeugen. Alle Prüfungen aus allen sechs Paketen liefen
    gegen diesen Stand. Die App-Anteile von A5/A6 (Fortschrittsbereich, `licksDue`, Karte) stehen
    ebenfalls in diesem Commit.
  - **Richtung im Text „Fast! …“:** „Ton {k} liegt einen halben Schritt höher“ nenne ich vom gespielten
    Ton aus gesehen: Der *richtige* Ton liegt höher bzw. tiefer als der gespielte. Die Anweisung ließ
    das offen.
  - **Grundton-Liegeklang** in mittlerer Lage (MIDI 55–66), nicht in der Lage des Basslicks, damit
    er auf dem Handy hörbar ist.
  - **Notenbild-Schritt** zählt als geschafft, sobald man „Mitspielen und mitlesen“ durchlaufen oder
    „Fertig“ gedrückt hat.
  - **Unterzeile der Kachel „Synth-Licks“:** `{n}` sind die angefangenen Licks (Einträge in der
    Ablage) — `app.js` kennt die Lick-IDs nicht, wie in der Anweisung festgelegt.
  - **Zurück nach ≥ Schritt 5:** Verlässt man den Lick mit dem Zurück-Pfeil, ohne dass in dieser
    Sitzung eine Einschätzung gewählt wurde, führt der erste Druck zur Einschätzung
    („Wie fühlt es sich an?“), der zweite zurück zur Liste.

### B1 — Klatsch-Grooves
- **Dateien:** `uebe-lab.html`, `sw.js`.
- **Geändert:** Eigene Ansicht `[data-grooves]` im Rhythmus-Bereich (`views.rhythm = 'grooves'`),
  erreichbar über `?tab=rhythm&grooves=1` (Liste) bzw. `&grooves=review`. Liste aller
  geschafften Lektionen in Kursreihenfolge mit „Anhören“ (Vorbild einmal, Begleitung nach
  `accompFor`), Name, „Kurs · Kapitel n“ und Status. Ablauf je Groove: Hören (zweimal) →
  Auffrischen (eine Nachklatsch-Runde mit Bassdrum + Snare, wie die Kurs-Wiederholung) →
  Durchhalten (nur `holdable`; Muster zyklisch über die Takte, Snare bzw. Klick, stille Takte
  ohne alles; Schlussschlag) → Einschätzung. Ablage `rhythm.grooves = { [Lektions-ID]: { hold, rating, streak, due } }`,
  durch `snapshot`/`restore` gereicht und gegen `COURSE`-IDs gefiltert; `course`, `duoOstinato`
  bleiben unberührt. Eingabe: Tippfeld oder Mikrofon (`state.input`, `micOn('rhythm')`); ein eigenes
  Tippfeld `grooves-pad`. Fortschritt in Bereich `licks` (Stufe = Kapitel, höchstens 6).
- **Abweichungen (mit Grund):**
  - Eigener kleiner Scheduler (`groovesStart`) statt neuer Modi im bestehenden Rundenscheduler:
    der Kurs-Scheduler hängt an `state.mode`, `game.rounds` und der Auswertung je Runde; ein
    zweiter Weg hätte alle Kurs- und Übungsabläufe berührt. Er teilt Klang (`engine.click`, `clap`,
    `drum`), Begleitung (`accompFor`, `accompHits`), Mikrofon und Latenz-Einstellungen.
  - `engine.drum` in `uebe-lab.html` kennt jetzt zusätzlich `open` (offener Hi-Hat, Schlussschlag),
    wie in `metronom.html`.
  - Im Durchhalten läuft mit der Einstellung „Begleitung im Kurs: Klick“ (`course.accomp`) statt der
    Snare der Klick auf den Zählzeiten (wie bei Taktarten ohne Groove).
  - Für die Wiederholung (`grooves=review`): Hören → Durchhalten auf der höchsten geschafften Stufe
    (mindestens 1); bei Lektionen mit Auftakt (kein Durchhalten): Hören → Auffrischen.
  - „Sitzt“ ist bei Lektionen ohne Durchhalten (Auftakt: `auftakt`, `auftaktUnd`, `geburtstag`) ohne
    Durchhalten wählbar (wie in 2c beschrieben).

### B2 — Heute wiederholen mit Grooves
- **Dateien:** `app.js`, `index.html`, `README.md`, `sw.js`.
- **Geändert:** `groovesDue(playgroundState, today)` und `groovesOf` (lesen nur `rhythm.course.done`
  und `rhythm.grooves`); die Karte zeigt beide Zahlen mit je einem Knopf (nur eine Art fällig → ein
  Knopf, nichts fällig → „Heute ist nichts fällig“); Kachel „Klatsch-Grooves“ aktiv (ohne geschaffte
  Lektion deaktiviert mit „Erst eine Kurs-Lektion schaffen“, sonst Unterzeile `tools.licks.sub` mit
  Zahl der geschafften Lektionen und der „sitzenden“); `QUICK_STARTS.grooves` und `.groovesReview`.
- **Abweichungen:** Die Kachel-Aktivierung (B1) und die Karte (B2) stehen beide im Commit `99b73c5`,
  weil sie am selben Code in `app.js` hängen.

## Kopierte Blöcke (Herkunft, Auslassungen)

| Block | Herkunft | Ziel | Auslassung / Änderung |
|---|---|---|---|
| `SOUND_DEFAULTS`, `WAVE_LEVEL`, fünf Presets (Analog Lead, Bright Saw, Neon Pluck, Growl Bass, Soft Brass) unverändert | `groove-lab.js`, Stand `e63013a` | `licks.html` | **Hall und Echo weggelassen** (`reverbWet`/`echoWet` werden ignoriert), keine Ebenen und Effekt-Busse, kein Chorus |
| `playTone()` mit Stimmen-Freigabe, Mono- und Glide-Logik | `groove-lab.js`, Stand `e63013a` | `licks.html` (`engine.playTone`) | Ausgang `dest` statt Ebene; Filter-LFO (`lfoSync`) weggelassen (kein Preset nutzt ihn); Mono nur beim Vorbild, das eigene Spiel ist mehrstimmig |
| `drum()`, `tone()`, `noiseHit()` (`kick`, `snare`, `rim`, `hat`, `open`) | `metronom.html`, Stand `e08b9d5` | `licks.html` | Pegel × 0,4 (−8 dB, `DRUM_GAIN`); `ghost`, `ride` weggelassen |
| `drum()` (`kick`, `snare`, `rim`, `hat`, `open`), `tone()`, `noiseHit()` | `metronom.html`, Stand `e08b9d5` | `uebe-lab.html` (Paket 5 des Rhythmuskurses, hier um `open` ergänzt) | siehe `BERICHT-POP-RHYTHMUSKURS.md` |
| `holdPlan`, `judgeHold`, `holdMessage`, `nextDue` (+ `HOLD_STAGES`, `addDays`, `localDate`) | `licks.html` | `uebe-lab.html` | wortgleich; `toleranceFor` steht dort schon |

## Gewählte Pegel

| Größe | Wert | Anmerkung |
|---|---|---|
| Schlagzeug der Begleitung (`DRUM_GAIN`) | 0,4 = −8 dB gegenüber dem Metronom-Tool | Richtwert der Anweisung; Bassdrum unverändert 0,8 × 0,4 |
| Synth-Vorbild (`LEAD_VELOCITY`) | 0,3 | gemessen (Effektivwert nach Hochpass 300 Hz): über der Snare und mehr als doppelt so laut wie Rim und Hi-Hat, für alle acht Licks (`licks.selfCheckAudio()`) |
| Eigenes Spiel (`OWN_VELOCITY`) | 0,3 | gleiches Preset, gleicher Pegel wie das Vorbild (gewollt) |
| Grundton + Quinte im Startton-Schritt (`DRONE_GAIN`) | 0,05 je Sinus | ohne Terz; klingt weiter, bis man die Taste gefunden hat oder den Schritt verlässt |
| Klatsch-Grooves: Klatscher mit Groove | wie im Rhythmuskurs (`CLAP_WITH_ACCOMP` = 3), Schlagzeug × 0,3 | siehe `BERICHT-POP-RHYTHMUSKURS.md` |

## Hörtest- und Sehtest-Checkliste für morgens

Synth-Licks (`licks.html`)
- [ ] Alle acht Licks in der Liste anhören: Sie klingen musikalisch, das Preset passt (z. B. Growl Bass
      beim Oktavbass, Neon Pluck beim Arp).
- [ ] Glide hörbar: „Glide-Fill mit Blue Note“ (in die 5 gleiten) und „Blue-Third-Schleifer“.
- [ ] Klänge wie im Groove Lab (ohne Hall), auch bei „Klang“ = anderes Preset im Auswahlfeld.
- [ ] Schalter „Glide“: eigenes Spiel gleitet (an) bzw. nicht (aus); das Vorbild gleitet nur auf den
      Noten mit Glide.
- [ ] Startton: Grundton + Quinte leise genug, verraten nicht Dur/Moll; Vorbild und eigener Ton
      unterscheidbar.
- [ ] Stückweise: Einzähler → Teil → ein Takt Groove → „du“; nach dem Lauf steht die Rückmeldung.
- [ ] Durchhalten: Lücken sind klar als Stille erkennbar; der Schlussschlag (Bassdrum + offener Hi-Hat)
      ist eindeutig; 16 Takte mit Lücken bei 100 BPM sind spielbar (etwa 40 Sekunden).
- [ ] Notenbild: Marke läuft mit, Tasten leuchten beim Vorbild und beim Mitspielen; „Notenbild aus“
      im Zahnrad blendet Schritt 7 aus.
- [ ] Während der Läufe: keine Marke, kein Raster, kein Zähler, keine leuchtenden Tasten — nur „Nach Gehör“.
- [ ] Stoppen: nichts klingt nach (Schlagzeug, Vorbild, Grundton).
- [ ] Bildschirmtasten auf echtem Gerät: Mehrfach-Touch, Tastenbreite ≥ 30 px bei 390 px, Tastenhöhe
      190 px, „Okt −/+“; das Gerät dreht sich nicht in eine Sperre.

Klatsch-Grooves (`uebe-lab.html?tab=rhythm&grooves=1`)
- [ ] Tresillo und Son-Clave über 16 Takte mit Lücken: Wiedereinsatz der Snare nach der Stille klar hörbar.
- [ ] Hören zweimal, Auffrischen (Klatscher über Bassdrum + Snare gut hörbar), Schlussschlag.
- [ ] Tippen und Mikrofon (Kopfhörer!) im Durchhalten; Latenz-Einstellungen aus dem Rhythmus-Bereich gelten.
- [ ] Lektionen mit Auftakt (Der Auftakt, Einsatz auf 4-und, Der punktierte Auftakt): kein Durchhalten,
      „Sitzt“ wählbar.

Tools-Seite
- [ ] Abschnitt „Licks & Grooves“ zwischen „Üben“ und „Werkzeuge“ (auch bei 320 px).
- [ ] „Heute wiederholen“: Zahlen für Licks und Grooves, je ein Knopf; nichts fällig → Text.
- [ ] Kachel „Klatsch-Grooves“ ist ohne geschaffte Lektion deaktiviert.
- [ ] Wischgeste/Zurück-Taste schließt beide Tools; die App bleibt auf der Tools-Seite.
- [ ] Offline (Flugmodus): Tool öffnet aus dem Cache.

## Morgens im Browser ausführen

Ein Headless-Chromium war vorhanden, alles Genannte ist nachts gelaufen. Zum Wiederholen:

```js
// Konsole von licks.html (eigenständig oder im iframe):
licks.selfCheck()               // → []
await licks.selfCheckAudio()    // → []   (Pegel Lick gegen Schlagzeug, mehrfach ausführen: Zufallsrauschen)
// Konsole von uebe-lab.html:
uebeLab.selfCheck()             // → []   (enthält groovesCheck())
uebeLab.groovesCheck()          // → []
// Konsole der App:
chorApp.selfTest(); await chorApp.selfTestAsync(); await chorApp.selfTestMusic() // je []
```

## Nicht umgesetzt

Nichts aus dem Auftrag. (Teil B wurde umgesetzt, siehe Weiche.)

## Zu entscheiden

- Soll „Licks & Grooves“ in „Dein Stand“ angezeigt werden (neue Gruppe)? Heute in keiner Gruppe, der
  Bereich `licks` sammelt nur Tagesaggregate.
- Sind die Durchhalten-Schwellen (75 % je Takt, zwei verlorene Takte hintereinander) für den Chor zu streng
  oder zu locker? Sie stehen an einer Stelle (`judgeHold`) und sind in beiden Dateien gleich.
- Soll es eine fünfte Durchhalten-Stufe geben (32 Takte, oder Lücken mit einer darüber gesungenen Melodie)?
- Transponieren der Licks in andere Tonarten, Pitch-Bend-Streifen, Web MIDI (nicht auf iOS-Safari).
- Passen die Starttempi der Licks (84–108 BPM)?
- Die Tonhöhen-Rückmeldung „Ton k liegt … höher/tiefer“ nennt, wo der richtige Ton vom gespielten aus liegt —
  gemeint war das vermutlich so, ist aber nicht eindeutig festgelegt.
- Das Durchhalten ist bei Licks mit `bars: 2` (Pentatonik-Hook, Oktav-Bass) mit vier Takten schon zwei
  Wiederholungen — ist das für Einsteiger zu kurz für „Durchhalten“?
- Die Zeit seit dem letzten Lauf (10 Minuten, dann wieder mit Vorbild) wird nur im Speicher der Seite gehalten
  und beim Verlassen zurückgesetzt.
- Lange Läufe (16 Takte) lassen sich nicht pausieren, nur abbrechen — nach einem Abbruch wird nichts gewertet.
- Beim Mikrofon-Eingang für Klatsch-Grooves gilt dieselbe Einschränkung wie im Rhythmus-Bereich: mit Kopfhörern,
  sonst hört das Mikrofon das Schlagzeug; die Snare im Durchhalten ist bewusst dunkel und kurz.
- Aufgefallen, nicht Teil des Auftrags: Der Modus „Im Takt“ (Singen) benutzt weiter `line.xOf(t)` für die
  laufende Marke und springt an Taktstrichen (siehe `BERICHT-POP-RHYTHMUSKURS.md`); `markX` ließe sich dort
  übernehmen.

## Nachtrag: Startton (Fehlerbehebung)

- **Fehler:** Beim Fund der richtigen Taste wurde die Tastatur neu gebaut, während der Finger noch drauf lag.
  Auf dem Touchscreen ging das `pointerup` der ausgetauschten Taste verloren — der Ton hing und die Taste blieb gedrückt.
  Jetzt baut sich die Tastatur nur noch bei geänderter Lage (anderer Lick, andere Oktave) neu, die Finger sind per
  Pointer-Capture an die Tastatur gebunden, und `lostpointercapture` gibt den Ton frei.
- **Ablauf:** Tippen auf eine Taste spielt sie und wählt sie nur aus (neutrale Markierung „?“). Erst „✓ Ton einloggen“
  prüft; „Lick nochmal hören“ (nach 3) und „Zeig ihn mir“ (nach 6) zählen jetzt Einlog-Versuche, nicht mehr jeden Tipp.
- **Stufenmarke:** Die gefundene Taste behält ihre Stufenmarke nur, solange man im Schritt „Startton“ ist; beim
  Verlassen des Schritts oder des Licks verschwindet sie (vorher blieb sie bis zum Verlassen des Licks).
