# Arbeitsanweisung für Claude Code – Licks & Grooves (Synth-Licks nach Gehör, Klatsch-Grooves behalten, Durchhalten)

Du bist erfahrene Chorleiterin/erfahrener Chorleiter eines Popchors,
Rhythmus- und Keyboardpädagog:in und Entwickler:in. Du baust den neuen
Bereich „Licks & Grooves“ nach den Paketen unten. Musikalische und
didaktische Entscheidungen sind hier getroffen; die Lick-Daten stehen fertig
im Format der Anweisung (Taktsummen, Teile, Tonumfang und Textlängen sind
vorab per Skript geprüft).

Antworte und kommentiere auf Deutsch.

**Diese Anweisung läuft unbeaufsichtigt.** Keine Rückfragen. Wo etwas unklar
bleibt: die Variante wählen, die näher am bestehenden Verhalten liegt, im
Bericht unter „Zu entscheiden“ notieren, weitermachen.

**Hintergrund:** Der Chor ist ein Popchor und übt ausschließlich nach Gehör
(siehe `ARBEITSANWEISUNG-POP.md`, `ARBEITSANWEISUNG-POP-RHYTHMUSKURS.md`).
Der Rhythmus-Kurs *lehrt* Muster. „Licks & Grooves“ ist der Ort, an dem
Gelerntes **behalten, durchgehalten und angewendet** wird – und an dem man
kurze Synthesizer-Linien (Licks) nach Gehör lernt. Viele können ein Muster
einen Takt lang sauber nachmachen, verlieren es aber über mehrere Takte
(Tempo läuft weg, die Eins verrutscht, die Konzentration reißt ab). Deshalb
bekommt jeder Baustein eine eigene Stufe **„Durchhalten“**.

Ziele:

1. **Synth-Licks nach Gehör.** Neue Tool-Seite `licks.html`: hören,
   mitsingen, Startton finden, stückweise nachspielen, ganz spielen,
   durchhalten – Notenbild (Piano-Roll) zuletzt und abschaltbar.
2. **Durchhalten.** Für Licks und Klatsch-Grooves: ein Muster über 4, 8 und
   16 Takte halten, zuletzt mit stillen Takten ohne Schlagzeug („Lücken“).
   Auswertung erst nach dem Lauf, Takt für Takt, mit Tempo-Tendenz.
3. **Klatsch-Grooves behalten.** Geschaffte Kurs-Lektionen erscheinen in
   einer eigenen Ansicht in `uebe-lab.html` und werden mit Abstand
   wiederholt – als Auffrischen und Durchhalten, nicht als zweiter Kurs.
4. **Wiederholen mit Abstand.** Status Neu → Lerne → Sitzt, Selbst-
   einschätzung nach der Übung, fällige Bausteine in „Heute wiederholen“ auf
   der Tools-Seite.
5. **Hören statt Sehen.** Während des eigenen Spielens keine laufende Marke,
   kein Raster, keine leuchtenden Tasten, kein Taktzähler.

Ausdrücklich **nicht** Teil dieses Auftrags:
- das Groove Lab (`groove-lab.js`) – nur Code daraus *kopieren* (Paket A2),
  nichts darin ändern,
- der Rhythmus-Kurs selbst (`COURSE`, `courseSteps`, Kurs-Begleitung,
  `RHYTHM_LEVELS`, `makePattern`), „Zweistimmig“, Einsingen, Hören, Singen,
  Metronom, Piano,
- Vokal-Riffs, Body-Percussion-Schichten, Ensemble-Modus, „Zum Song legen“,
  Web MIDI, Transponieren, Pitch-Bend, polyphone Licks (alles spätere Schritte),
- jeder Bezug zum Repertoire (Tonart/Tempo/Anfangston der Songs).

Referenz für die Oberfläche (für Menschen, nicht zum Abrufen nötig): die
Entwürfe „Licks & Grooves“ aus der Konzeptphase. Maßgeblich ist diese Datei.

---

## 0. Vorbereitung

1. Branch `licks-grooves` von aktuellem `main` anlegen. Nie auf `main`
   committen, nie mergen, nie force-pushen.
2. Lesen: `CLAUDE.md`, `README.md`, `ARBEITSANWEISUNG-CLAUDE-CODE.md`
   (Abschnitte 1, 3 und 5), `ARBEITSANWEISUNG-POP.md`,
   `ARBEITSANWEISUNG-POP-RHYTHMUSKURS.md`. Im Code: `sw.js`
   (`SW_VERSION`, `SHELL_OPTIONAL`, `TOOL_PAGES`), in `app.js`
   `openToolFrame`, `QUICK_STARTS`, `initQuickStart`, `renderQuickStart`,
   `renderPracticeTiles`, `window.chorToolStorage`, `window.chorProgress`
   (`PROGRESS_AREAS`, `sanitizeProgress`); in `metronom.html` `drum()`,
   `tone()`, `noiseHit()`; in `groove-lab.js` `SOUND_DEFAULTS`,
   `SYNTH_PRESETS`, `WAVE_LEVEL`, `playTone()`, `_releaseVoice*`; in
   `piano.html` Tastatur-Aufbau und Touch-Logik (`build`, `keyAt`, `press`,
   `release`); in `uebe-lab.html` Ablage (`STORAGE_ID`, `snapshot`,
   `restore`), `toleranceFor`, `holdable`, `reviewPool`, Kurs-Rundenlogik.
3. **Weiche für Teil B:** Prüfen, ob der Pop-Rhythmuskurs auf `main` ist:
   `grep -n "COURSE_EXTRA_CH\|function accompFor\|function visibleAids" uebe-lab.html`.
   Sind **alle drei** vorhanden: Teil B umsetzen. Sonst Teil B **komplett
   auslassen** (auch keine Teilstücke) und im Bericht unter „Nicht umgesetzt“
   vermerken. Teil A hängt davon nicht ab.
4. Diese Datei im ersten Commit mit einchecken.

## 1. Feste Regeln

Es gelten **alle Regeln aus Abschnitt 1 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`**
(ein Paket = ein Commit + Push, `SW_VERSION` je Commit erhöhen – Stand bei
Erstellung dieser Anweisung `v369`, maßgeblich ist der Stand auf `main` –,
keine IDs ändern, neue Felder optional mit Standardwert und durch das Laden
gereicht, Persistenz-Roundtrip Pflicht, keine Abhängigkeiten, kein
Build-Schritt). Zusätzlich:

- **Neue Datei `licks.html`** wird in derselben Änderung eingetragen in
  `SHELL_OPTIONAL` **und** `TOOL_PAGES` (`sw.js`) sowie in die Dateiliste in
  `CLAUDE.md` und die Dateiübersicht in `README.md`. Ohne `TOOL_PAGES`
  ersetzt der Service Worker die iframe-Navigation durch `index.html`.
- **Tools bleiben eigenständig.** Klänge werden 1:1 **kopiert**, nicht
  importiert: `drum()` (samt `tone()`/`noiseHit()`) aus `metronom.html`,
  `playTone()` mit `SOUND_DEFAULTS`, `WAVE_LEVEL` und den fünf Presets aus
  Paket A2 aus `groove-lab.js`. Kopierte Blöcke bekommen einen Kommentar
  „Kopie aus <Datei>, Stand <Commit>“.
- **Texte:** `licks.html` und `uebe-lab.html` sind nur deutsch. Alles in
  `app.js`/`strings.js` immer **DE, EN und PL** gemeinsam (Paritätstest).
- **Lick-IDs** (Paket A3) sind ab dem ersten Commit fest. Neue Licks nur
  anhängen.
- **Mikrofon:** unverändert – nie im Hintergrund, nie aufzeichnen, nie
  speichern; `micOn()`/`micOff()` und `RECORDING_CONSTRAINTS` wie in
  `uebe-lab.html`. `licks.html` braucht **kein** Mikrofon (Eingabe über
  Bildschirmtasten).
- **Wortwahl:** ermutigend, nie bewertend. Keine Punkte, keine Prozente,
  keine Noten. Rückmeldungen nennen, was gut war, und genau eine Sache für
  den nächsten Versuch. Texte aus Abschnitt 2d wörtlich übernehmen.
- **Sichtbarkeit** nach Abschnitt 2b ist verbindlich.

## 2. Entscheidungen (verbindlich)

### 2a. Überblick

| Thema | Festlegung |
|---|---|
| Name | DE/EN „Licks & Grooves“, PL „Licki i groove'y“ |
| Ort auf der Tools-Seite | neuer Abschnitt zwischen „Üben“ und „Werkzeuge“ |
| Synth-Licks | eigene Seite `licks.html` als Tool-iframe (`openToolFrame`), Hochformat, keine Querformat-Sperre |
| Klatsch-Grooves | neue Ansicht in `uebe-lab.html` (Teil B), weil dort Kurs-Engine, Eingabe und Auswertung liegen |
| Schritte Synth-Lick | 1 Hören → 2 Mitsingen → 3 Startton → 4 Stückweise → 5 Ganz → 6 Durchhalten → 7 Notenbild (entfällt bei `notes: 'off'`) |
| Schritte Klatsch-Groove | 1 Hören → 2 Auffrischen (eine Nachklatsch-Runde) → 3 Durchhalten → Selbsteinschätzung. Die Kurs-Schritte werden **nicht** wiederholt |
| Eingabe Licks | Bildschirmtasten (Pointer Events, Mehrfach-Touch wie `piano.html`). Tonklasse zählt, Oktave egal (abweichende Oktave nur als Hinweis) |
| Tastatur | Lage des Licks: von der weißen Taste auf/unter dem tiefsten bis zur weißen Taste auf/über dem höchsten Ton, mindestens 8 weiße Tasten (gleichmäßig nach beiden Seiten ergänzt); „Okt −/+“ verschiebt um 12, Grenzen MIDI 24–96 |
| Klang | fünf Presets (A2); Standard = `preset` des Licks; gewählter Klang wird je Lick gespeichert. Schalter „Glide“ (Standard an) wirkt nur auf das eigene Spiel |
| Vorbild-Glide | nur auf Noten mit `{ glide: true }`, Dauer = `glide` des Presets, sonst 0,08 s; alle anderen Vorbild-Noten ohne Glide |
| Begleitung | 4/4-Groove, neutral: Kick 0 und 24, Snare 12 und 36 (Ticks, 12 = Viertel), Hi-Hat alle 6 Ticks, alle 3 Ticks, wenn irgendein Lick-Ton auf `t % 6 !== 0` beginnt. Stufen `full` (alles), `backbeat` (Kick + Snare), `snare` (nur Snare). Der Groove spielt nie den Lick vor. Einzähler: ein Takt Klick |
| Durchhalten | Leiter und Auswertung nach Abschnitt 2c, gleich für Licks und Klatsch-Grooves |
| Status | `Neu` (nie eingeschätzt), `Lerne` (zuletzt „noch wackelig“ oder „geht schon“), `Sitzt` (zuletzt „sitzt“) |
| „Sitzt“ | nur wählbar, wenn Durchhalten-Stufe 2 (8 Takte mit Snare) geschafft ist; sonst ist der Knopf sichtbar, aber deaktiviert, mit Hinweis „Erst 8 Takte durchhalten“ |
| Fälligkeit | „noch wackelig“ → morgen; „geht schon“ → in 3 Tagen; „sitzt“ → in 7, beim nächsten Mal 21, danach 60 Tagen (`streak` 0/1/2+); jede andere Einschätzung setzt `streak` auf 0 |
| Wiederholung | fällige Bausteine: Hören (Lick/Groove einmal) → Durchhalten auf der höchsten geschafften Stufe (mindestens Stufe 1) → Selbsteinschätzung |
| Heute wiederholen | Karte im neuen Abschnitt. Zählt fällige Licks und Grooves getrennt. Ein Knopf je Art mit fälligen Einträgen; nichts fällig → Text „Heute ist nichts fällig“ |
| Fortschritt | neuer Bereich `licks` in `PROGRESS_AREAS` (app.js), in keiner bestehenden Gruppe; beide Tools melden dorthin über `window.chorProgress` |

### 2b. Sichtbarkeit während des Übens

| Situation | Laufende Marke | Raster / Piano-Roll | Tasten leuchten beim Vorbild | Eigene Eingaben live | Taktzähler |
|---|---|---|---|---|---|
| Hören, Mitsingen | aus | aus | aus | – | aus |
| Startton | aus | aus | aus | Taste klingt, sonst nichts | – |
| Stückweise, Ganz, Auffrischen | aus | aus | aus | aus (nur Tastendruck-Zustand der Taste selbst) | aus |
| Durchhalten | aus | aus | aus | aus | **aus** |
| Nach jeder Runde | – | Ergebnis (Zeitleiste bzw. Taktstreifen) | – | als Ergebnis | – |
| Notenbild (zuletzt) | an | an | an | an | an |

- Während eines Laufs steht an der Stelle des Rasters ein **neutraler
  Platzhalter** mit dem Text „Nach Gehör“ – unabhängig von Länge, Taktzahl
  oder Tönen des Bausteins (Test in A4).
- Ein Taktzähler („Takt 5 von 8“) wäre ein optischer Taktgeber auf jeder
  Eins und entfällt deshalb. Wie lange ein Lauf dauert, steht **vor** dem
  Start („8 Takte“), das Ende ist **hörbar** (Schlussschlag, 2c).
- Die gefundene Starttaste (Schritt 3) bleibt als kleine Stufenmarke auf der
  Taste stehen – sie verrät keinen Zeitpunkt, nur den Ausgangston.

### 2c. Durchhalten

**Didaktik:** Einen Takt nachzumachen trainiert das Kurzzeitgedächtnis.
Über viele Takte kommt anderes dazu: gleichmäßiges Tempo ohne Eilen,
die Eins nicht verlieren, nach einer Unsicherheit wieder einsteigen. Das
Schlagzeug wird dabei zuerst ausgedünnt und dann zeitweise ganz
weggenommen („Lücken“): In der Stille muss der innere Puls tragen, beim
Wiedereinsetzen hört man sofort, ob man noch im Takt ist.

**Leiter** (je Baustein, gespeichert als `hold` = Zahl der geschafften Stufen, 0–4):

```js
const HOLD_STAGES = [
  { bars: 4,  on: 0, off: 0, name: '4 Takte' },                // Snare durchgehend
  { bars: 8,  on: 0, off: 0, name: '8 Takte' },                // Snare durchgehend
  { bars: 8,  on: 2, off: 2, name: '8 Takte mit Lücken' },     // 2 Takte Snare, 2 Takte still, …
  { bars: 16, on: 2, off: 4, name: '16 Takte mit Lücken' },    // 2 Takte Snare, 4 Takte still, …
];
```

- `on: 0` heißt: Begleitung `snare` in allen Takten. Sonst beginnt der Lauf
  mit `on` Takten `snare`, dann `off` stille Takte (kein Schlagzeug, kein
  Klick), im Wechsel bis `bars`. Reine Funktion
  `holdPlan(stage)` → Array der Länge `bars` mit `true` (Snare) / `false`
  (still). Erwartet: Stufe 3 → `[t,t,f,f,t,t,f,f]`, Stufe 4 →
  `[t,t,f,f,f,f,t,t,f,f,f,f,t,t,f,f]`.
- Vorher: ein Takt Einzähler (Klick, wie überall). Nachher: **Schlussschlag**
  auf der Eins nach dem letzten Takt (`drum('kick')` + `drum('open')`),
  danach nichts mehr erwartet.
- Die Zahl der Takte muss ein Vielfaches der Baustein-Länge sein. Licks mit
  `bars: 2` wiederholen sich also 2-, 4- oder 8-mal. Klatsch-Grooves: nur
  Lektionen mit `holdable(l)`; das Muster wird wie bei `barsOf4` zyklisch
  über die Takte gelegt. Nicht haltbare Lektionen (Auftakt) haben kein
  Durchhalten – ihre Wiederholung besteht aus Hören und Auffrischen, und
  „Sitzt“ ist für sie ohne Durchhalten wählbar.
- Beim Lick-Durchhalten fließt der Lick ohne Pause in sich selbst weiter.
  Vorbild-Glide gilt nicht; das eigene Spiel hat den Glide-Schalter.

**Auswertung** (reine Funktion, in `licks.html` und `uebe-lab.html`
**identisch** kopiert, mit denselben Testvektoren):

```
judgeHold({ expected, taps, barStart, barSec, tol, plan }) → {
  bars: [{ expected, hit, meanOffset, extra, silent }],   // je Takt
  held,          // true/false
  tendency,      // 'steady' | 'faster' | 'slower'
  lostAt,        // Taktnummer (1-basiert) oder null
  reentry,       // 'good' | 'late' | null  (nur bei Lücken)
}
```

- `expected`: alle Soll-Zeitpunkte im **absoluten** Zeitraster ab Einzähler
  (Sekunden); nie am ersten eigenen Anschlag neu ausgerichtet – sonst wäre
  Abdriften unsichtbar. Bei Licks zusätzlich die Tonklasse je Soll-Punkt.
- Zuordnung: jeder Anschlag höchstens einem Soll-Punkt, nächster innerhalb
  `tol`; `tol = toleranceFor(kleinster Abstand × tickSec)` mit der Formel
  aus `uebe-lab.html` (`Math.min(.13, Math.max(.035, gapSec * .45))`).
  Bei Licks zählt ein Treffer nur mit richtiger Tonklasse.
- `hit` = getroffene Soll-Punkte des Takts; `meanOffset` in Sekunden
  (negativ = zu früh); `extra` = nicht zugeordnete Anschläge.
- `tendency`: lineare Regression der Abweichungen aller Treffer über der
  Zeit; Unterschied Anfang → Ende des Laufs `< −tol/2` → `'faster'`,
  `> +tol/2` → `'slower'`, sonst `'steady'`. Unter 6 Treffern: `'steady'`.
- `lostAt`: erster Takt, ab dem **zwei aufeinanderfolgende** Takte weniger
  als die Hälfte ihrer Soll-Punkte treffen; sonst `null`.
- `reentry` (nur Stufen mit Lücken): mittlere Trefferquote der jeweils
  ersten Snare-Takte nach einer Lücke ≥ 0,75 → `'good'`, sonst `'late'`.
- `held`: jeder Takt trifft ≥ 75 % seiner Soll-Punkte **und** in den letzten
  zwei Takten ist `|meanOffset| ≤ tol`. `held` → Stufe geschafft, `hold`
  steigt (höchstens um 1 pro Lauf, nie über 4).

**Anzeige nach dem Lauf:** ein **Taktstreifen** – je Takt ein Feld,
gefärbt „sicher“ (≥ 75 %), „wackelig“ (≥ 50 %), „verloren“ (< 50 %);
stille Takte schraffiert. Farben unterscheiden sich auch in der Helligkeit,
dazu eine kleine Legende. Darunter genau ein Satz aus 2d.

### 2d. Rückmeldetexte (wörtlich)

Durchhalten (`holdMessage(result, stage)`, erste passende Zeile gewinnt):

| Bedingung | Text |
|---|---|
| `held` und `tendency === 'steady'` | „Durchgehalten – {bars} Takte, ruhig und gleichmäßig.“ |
| `held` und `'faster'` | „Durchgehalten! Zum Ende hin bist du etwas schneller geworden – lass die Pausen ruhig lang.“ |
| `held` und `'slower'` | „Durchgehalten! Zum Ende hin bist du etwas langsamer geworden – denk an den Backbeat.“ |
| `lostAt` und Lücken und `reentry === 'late'` | „Bis Takt {lostAt − 1} lief es stabil. In der Stille zählst du beim nächsten Mal leise mit.“ |
| `lostAt` | „Bis Takt {lostAt − 1} lief es stabil. Danach ist der Faden gerissen – das ist beim Durchhalten ganz normal.“ |
| `tendency === 'faster'` | „Fast! Du bist nach und nach schneller geworden. Nochmal – diesmal bewusst gemütlich.“ |
| `tendency === 'slower'` | „Fast! Du bist nach und nach langsamer geworden. Nochmal – die Snare zieht dich.“ |
| sonst | „Fast! Ein paar Takte waren wackelig. Nochmal – ruhig und gleichmäßig.“ |

Lick „Stückweise“ (`partMessage`):

| Bedingung | Text |
|---|---|
| Tonfolge richtig, Rhythmus in `tol` | „Genau so!“ |
| Tonfolge richtig, Rhythmus daneben | „Die Töne stimmen! Der {k}. kam etwas {früh/spät}.“ (zählt als geschafft) |
| andere Tonzahl | „Das waren {m} Töne, im Teil sind es {n}. Hör ihn nochmal.“ |
| erster falscher Ton `k` | „Fast! Die Richtung stimmt bis Ton {k − 1}. Ton {k} liegt {einen halben Schritt / einen ganzen Schritt / weiter} {höher/tiefer}.“ (bei `k = 1`: „Der erste Ton liegt …“) |
| nur Oktave abweichend | wie „Genau so!“, dazu „(eine Oktave {höher/tiefer} – geht auch)“ |

Startton: gefunden → „Gefunden – das ist die {Stufe}.“; nach 3 Fehlversuchen
Knopf „Lick nochmal hören“; nach 6 zusätzlich „Zeig ihn mir“ (markiert die
Taste, Schritt gilt als geschafft).

Stufenbezeichnung (`degreeLabel(semis)`, relativ zu `root`, mod 12):
`0 '1', 1 '♭2', 2 '2', 3 '♭3', 4 '3', 5 '4', 6 '♭5', 7 '5', 8 '♭6', 9 '6', 10 '♭7', 11 '7'`.

## 3. Tests

Wie in `ARBEITSANWEISUNG-CLAUDE-CODE.md` Abschnitt 3.

- `licks.html` exportiert `window.licks = { LICKS, HOLD_STAGES, holdPlan, judgeHold, holdMessage, partMessage, degreeLabel, nextDue, statusOf, grooveFor, keyboardRange, sanitizeLicksState, selfCheck }`; `selfCheck()` liefert die Fehlerliste (leer = bestanden).
- `uebe-lab.html`: `window.uebeLab` um `holdPlan`, `judgeHold`, `holdMessage`, `nextDue` ergänzen; `selfCheck()` bzw. `courseCheck()` erweitern.
- `app.js`: `runSelfTests()` um die Tools-Karte (`licksDue`) und `PROGRESS_AREAS` erweitern.
- Node-Prüfskripte unter `/tmp` (nicht committen), Headless-Prüfung mit
  Playwright nur, falls ohne Installation vorhanden. `chorApp.selfTest()`,
  `chorApp.selfTestAsync()`, `chorApp.selfTestMusic()` müssen `[]` liefern.
- **Gemeinsame Testvektoren für `judgeHold`** (in beiden Dateien identisch,
  4/4, 90 BPM, Muster Backbeat = Soll auf 2 und 4 je Takt, `tol` = 0,1 s):
  1. alle Anschläge exakt → `held`, `'steady'`, `lostAt` null.
  2. jeder Anschlag 8 ms früher als der vorige (16 Takte) → `'faster'`.
  3. Anschläge nur bis einschließlich Takt 9 (16 Takte) → `lostAt` 10, nicht `held`.
  4. Stufe 3, in den stillen Takten 3–4 um 0,12 s verschoben, danach
     wieder exakt → `reentry` `'late'` … bzw. `'good'`, wenn Takt 5 wieder
     trifft (beide Fälle prüfen: Takt 5 exakt → `'good'`; Takt 5 und 6 um
     0,12 s daneben → `'late'`).
  5. doppelt so viele Anschläge wie Soll → `extra` > 0, Treffer unverändert.
- Sichtprüfung per Screenshot (390 px) für jede neue Oberfläche, jeweils
  während eines Laufs (Platzhalter) und danach (Ergebnis).
- Hörtests kann niemand nachts machen: je Paket als Checkliste in den Bericht.

---

## 4. Pakete – Teil A (immer)

### Paket A1 – Gerüst: `licks.html`, Einbindung, Ablage

- Neue Seite `licks.html` nach dem Muster von `piano.html`/`metronom.html`
  (eigene Styles, `?embedded=1`, Ablage über
  `window.parent.chorToolStorage`, Datensatz-ID `'licks'`). Direkt geöffnet
  ohne Ablage: Voreinstellungen, kein Fehler.
- Gespeicherter Zustand (alle Felder optional):

```js
{
  v: 1,
  lick: 'hookPenta',          // zuletzt gewählter Lick
  notes: 'last',              // 'last' | 'off'  (Notenbild als letzter Schritt / aus)
  glide: true,                // Glide beim eigenen Spiel
  octave: {},                 // { [lickId]: -1 | 0 | 1 }
  sound: {},                  // { [lickId]: Presetname }
  items: {                    // { [lickId]: Lernstand }
    // hookPenta: { step: 0..7, parts: 0..n, whole: 0..3, hold: 0..4,
    //              rating: null|'shaky'|'ok'|'solid', streak: 0, due: 'JJJJ-MM-TT'|null }
  },
}
```

  `sanitizeLicksState(raw)`: unbekannte Lick-IDs verwerfen, Zahlen begrenzen,
  unbekannte Werte → Standard, fehlendes `v` → leerer Zustand.
- `sw.js`: `./licks.html` in `SHELL_OPTIONAL` und `TOOL_PAGES`.
- `index.html`: neuer Abschnitt „Licks & Grooves“ zwischen „Üben“ und
  „Werkzeuge“ im Stil von `.tools-section-title` / `.tool-tile`:
  Karte „Heute wiederholen“ (in A1 noch mit „Heute ist nichts fällig“),
  darunter zwei Kacheln „Klatsch-Grooves“ und „Synth-Licks“ mit Unterzeile.
  Klatsch-Grooves ist in A1 deaktiviert mit Unterzeile „bald“ (Teil B
  schaltet sie frei).
- `app.js`: `QUICK_STARTS` um
  `licks: ['licks.html', 'tools.licks.synth', '']` und
  `licksReview: ['licks.html', 'tools.licks.title', 'review=1']` ergänzen;
  Kacheln per `data-quick`.
- `strings.js` (DE / EN / PL):

| Schlüssel | DE | EN | PL |
|---|---|---|---|
| `tools.licks.title` | Licks & Grooves | Licks & Grooves | Licki i groove'y |
| `tools.licks.review` | Heute wiederholen | Review today | Powtórka na dziś |
| `tools.licks.reviewNone` | Heute ist nichts fällig | Nothing due today | Na dziś nic do powtórki |
| `tools.licks.reviewLicks` | {n} Licks | {n} licks | Licki: {n} |
| `tools.licks.reviewGrooves` | {n} Grooves | {n} grooves | Groove'y: {n} |
| `tools.licks.synth` | Synth-Licks | Synth licks | Licki syntezatorowe |
| `tools.licks.grooves` | Klatsch-Grooves | Clap grooves | Groove'y klaskane |
| `tools.licks.sub` | {n} Bausteine · {solid} sitzen | {n} items · {solid} solid | Elementy: {n} · opanowane: {solid} |
| `tools.licks.soon` | bald | soon | wkrótce |
| `tools.licks.groovesEmpty` | Erst eine Kurs-Lektion schaffen | Finish a course lesson first | Najpierw ukończ lekcję kursu |

- Erste Ansicht in `licks.html`: Titel, leere Liste mit Platzhalter.
- **Prüfungen A1:** STRINGS-Parität grün; Roundtrip `sanitizeLicksState`
  (neu / leer / kaputt / unbekannte ID); Tool öffnet und schließt über den
  Tools-Reiter, Wischgeste schließt; Offline-Start mit gefülltem Cache lädt
  `licks.html`.
- Commit: `Licks & Grooves: neue Tool-Seite licks.html und Abschnitt auf der Tools-Seite`

### Paket A2 – Klang und Begleitung

- **Synth:** `playTone()` aus `groove-lab.js` mit `SOUND_DEFAULTS`,
  `WAVE_LEVEL`, Stimmen-Freigabe und Mono-/Glide-Logik kopieren. Hall und
  Echo entfallen (`reverbWet`/`echoWet` werden ignoriert; im Bericht
  vermerken). Presets (unverändert kopiert): **Analog Lead, Bright Saw,
  Neon Pluck, Growl Bass, Soft Brass**. Ausgang über einen eigenen Bus, der
  beim Stoppen ausblendet.
- **Schlagzeug:** `drum()` mit `kick`, `snare`, `rim`, `hat`, `open` samt
  `tone()`/`noiseHit()` aus `metronom.html` kopieren. Pegel der Begleitung
  so, dass der Lick deutlich darüber liegt (Richtwert −8 dB gegenüber
  dem Metronom-Tool).
- **Scheduler** nach dem Muster von `metronom.html` (Vorausplanung auf der
  Audio-Uhr, kein `setTimeout` für Töne). Reine Funktion
  `grooveFor(lick, level)` → `{ kick, snare, hat }` in Ticks je Takt nach 2a;
  `level` ∈ `full | backbeat | snare | off`.
- Einzähler: vier Klicks (Klang wie `metronom.html` „click“).
- **Prüfungen A2:** `grooveFor`: Kick/Snare nur auf `t % 12 === 0`; Hi-Hat
  gleichmäßig; Raster 3 genau für Licks mit einem Ton auf `t % 6 !== 0`
  (laut Daten: `arpMoll`, `hookAufA`, `bassFunk16`, `fillGlideBlue`,
  `hookBlueThird`); geplante Ereignisse über 8 Takte lückenlos, keine
  Doppelschläge an Taktgrenzen; Stoppen ohne Nachklingen.
  **Hörtest:** Presets klingen wie im Groove Lab (ohne Hall); Glide hörbar.
- Commit: `Licks: Synth-Klänge und Groove-Begleitung (kopiert aus Groove Lab und Metronom)`

### Paket A3 – Inhalt und Liste

**Datenformat:** `notes` = `[Tick, Dauer, Halbtöne über root, Optionen?]`,
12 Ticks = Viertel, ein 4/4-Takt = 48 Ticks. Pausen sind Lücken zwischen
Tönen. `parts` = Notenbereiche `[von, bis)` für „Stückweise“. `root` als
MIDI-Nummer; der Startton-Schritt bezieht Stufen auf `root`.

```js
const LICKS = [
  { id: 'hookPenta', cat: 'hook', level: 1, name: 'Pentatonik-Hook', preset: 'Analog Lead', bpm: 96, bars: 2, root: 57,
    notes: [[0, 12, 0], [12, 6, 3], [18, 6, 5], [24, 18, 7], [42, 6, 10], [48, 12, 7], [60, 6, 5], [66, 6, 3], [72, 24, 0]],
    parts: [[0, 3], [3, 5], [5, 9]],
    intro: 'Fünf Töne, zwei Takte: hinauf bis zur kleinen Septime, dann zurück nach Hause. Sing ihn zuerst auf „du“ – die Finger folgen der Stimme.',
    more: 'Die Moll-Pentatonik ist die Tonleiter unzähliger Pop-, Soul- und Rock-Hooks. Auf ihr klingt fast jede Tonfolge richtig, deshalb ist sie der beste Einstieg.' },
  { id: 'bassOktav', cat: 'bass', level: 1, name: 'Oktav-Disco-Bass', preset: 'Growl Bass', bpm: 100, bars: 2, root: 40,
    notes: [[0, 6, 0], [6, 6, 12], [12, 6, 0], [18, 6, 12], [24, 6, 0], [30, 6, 12], [36, 6, 0], [42, 6, 12],
      [48, 6, 5], [54, 6, 17], [60, 6, 5], [66, 6, 17], [72, 6, 7], [78, 6, 19], [84, 6, 7], [90, 6, 19]],
    parts: [[0, 4], [4, 8], [8, 12], [12, 16]],
    intro: 'Achtel, immer im Wechsel tief und eine Oktave höher. Erst auf der 1, dann auf der 4, dann auf der 5. Der tiefe Ton trägt, der hohe federt.',
    more: 'Der Oktavbass treibt viele Disco- und Dance-Titel. Er ist rhythmisch einfach und schult trotzdem das Wichtigste: gleichmäßige Achtel über lange Strecken.' },
  { id: 'fillGlideBlue', cat: 'fill', level: 2, name: 'Glide-Fill mit Blue Note', preset: 'Analog Lead', bpm: 92, bars: 1, root: 57,
    notes: [[0, 6, 0], [6, 6, 3], [12, 6, 5], [18, 3, 6], [21, 9, 7, { glide: true }], [30, 6, 5], [36, 6, 3], [42, 6, 0]],
    parts: [[0, 3], [3, 5], [5, 8]],
    intro: 'Hinauf zur ♭5 und von dort in die 5 gleiten, dann zurück. Die ♭5 ist nur ein Sechzehntel lang – ein Durchgang, kein Ziel.',
    more: 'Die ♭5 ist die typischste Blue Note. Mit Glide in die 5 gezogen klingt sie wie ein Schleifer in der Stimme – ein Klang, den man im Chor gut nachsingen kann.' },
  { id: 'arpMoll', cat: 'arp', level: 2, name: 'Moll-Arp in Sechzehnteln', preset: 'Neon Pluck', bpm: 88, bars: 1, root: 57,
    notes: [[0, 3, 0], [3, 3, 3], [6, 3, 7], [9, 3, 12], [12, 3, 7], [15, 3, 3], [18, 3, 0], [21, 3, 3],
      [24, 3, -2], [27, 3, 2], [30, 3, 5], [33, 3, 10], [36, 3, 5], [39, 3, 2], [42, 3, -2], [45, 3, 2]],
    parts: [[0, 4], [4, 8], [8, 12], [12, 16]],
    intro: 'Vier Sechzehntel je Schlag: erst den Moll-Dreiklang hinauf und zurück, dann den Dur-Dreiklang einen Ganzton tiefer. Gleichmäßig, ohne Betonung.',
    more: 'Ein Arpeggiator spielt Akkorde als Tonfolge. Von Hand gespielt merkt man, wie wenig sich die Finger bewegen müssen, wenn der Akkord wechselt.' },
  { id: 'riffPush', cat: 'hook', level: 2, name: 'Synthpop-Riff mit Vorziehen', preset: 'Bright Saw', bpm: 108, bars: 1, root: 62,
    notes: [[0, 6, 0], [6, 6, 0], [12, 6, 3], [18, 12, 5], [30, 6, 3], [36, 12, 0]],
    parts: [[0, 3], [3, 6]],
    intro: 'Der lange Ton kommt auf „2 und“ und liegt über die Drei. Auf der Drei selbst drückst du nichts – du hältst.',
    more: 'Das ist dieselbe vorgezogene Drei wie im Rhythmus-Kurs, nur mit Tönen. Synthpop-Riffs leben von solchen Pushes: Die Betonung kommt ein Achtel zu früh.' },
  { id: 'hookBlueThird', cat: 'fill', level: 2, name: 'Blue-Third-Schleifer', preset: 'Soft Brass', bpm: 84, bars: 1, root: 60,
    notes: [[0, 6, 0], [6, 3, 3], [9, 9, 4, { glide: true }], [18, 6, 0], [24, 12, 7], [36, 6, 9], [42, 6, 7]],
    parts: [[0, 3], [3, 7]],
    intro: 'Aus der kleinen Terz in die große gleiten, dann über die 5 zur 6 und zurück. Der Schleifer ist kurz, das Ziel ist die große Terz.',
    more: 'Die Blue Third liegt zwischen Moll und Dur. Sänger:innen treffen sie, indem sie von unten hineinziehen – genau das macht hier der Glide.' },
  { id: 'hookAufA', cat: 'hook', level: 3, name: 'Einsatz auf dem „a“', preset: 'Analog Lead', bpm: 92, bars: 1, root: 64,
    notes: [[9, 3, 7], [12, 6, 10], [18, 6, 12], [24, 3, 10], [27, 3, 7], [30, 6, 5], [36, 12, 3]],
    parts: [[0, 3], [3, 7]],
    intro: 'Die Eins bleibt leer. Der erste Ton kommt ein Sechzehntel vor der Zwei, auf dem „a“. Zähl „1 e + a“ und spiel auf „a“.',
    more: 'Viele Hooks beginnen knapp vor einem Schlag. Wer auf der Zwei einsetzt, kommt zu spät. Dieselbe Figur gibt es im Rhythmus-Kurs als Klatsch-Lektion.' },
  { id: 'bassFunk16', cat: 'bass', level: 3, name: 'Funk-Bass mit Sechzehnteln', preset: 'Growl Bass', bpm: 96, bars: 1, root: 43,
    notes: [[0, 3, 0], [9, 3, 12], [12, 6, 10], [21, 3, 7], [27, 6, 0], [36, 3, -3], [42, 3, -2], [45, 3, -1]],
    parts: [[0, 4], [4, 8]],
    intro: 'Kurze Töne, viel Luft dazwischen. Die Eins sitzt, alles andere fällt auf „e“ und „a“. Die letzten drei Töne laufen chromatisch in die nächste Eins.',
    more: 'Im Funk zählt die Pause so viel wie der Ton. Spiel die Töne kurz und trocken – die Lücken sind der Groove.' },
];
```

- **Liste:** Kategorien-Chips „Alle · Hooks · Bass · Arps · Fills“ (`cat`),
  je Lick eine Zeile: runder Knopf „Anhören“ (spielt den Lick einmal mit
  Groove `full`), Name, Unterzeile „{Preset} · Stufe {level}“, rechts der
  Status (Neu / Lerne / Sitzt). **Keine** Muster- oder Notenvorschau.
- `statusOf(item)` nach 2a.
- **Prüfungen A3** (in `selfCheck`): IDs eindeutig; Töne aufsteigend, ohne
  Überlappung, innerhalb `bars × 48`; Dauern Vielfache von 3; `glide` nie auf
  dem ersten Ton und nur bei Abstand ≤ 2 Halbtöne; MIDI 28–88; `parts`
  lückenlos von 0 bis `notes.length`, je 2–8 Töne und höchstens ein Takt
  lang; `intro` ≤ 160, `more` ≤ 185 Zeichen; `preset` existiert.
  **Hörtest:** alle acht Licks anhören – klingen sie musikalisch, sitzt der
  Glide im Blue-Note-Fill und im Blue-Third-Schleifer?
- Commit: `Licks: acht Synth-Licks und Liste mit Anhören`

### Paket A4 – Übe-Ablauf: hören, singen, finden, stückweise, ganz, Notenbild

- **Schrittleiste** oben (Chips, wie im Kurs): Hören · Mitsingen · Startton
  · Stückweise · Ganz · Durchhalten · Notenbild. Durchhalten ist in A4 noch
  ohne Funktion (Chip deaktiviert), Notenbild gestrichelt als „optional“
  und fehlt bei `notes: 'off'`. Geschaffte Schritte mit Häkchen; man darf
  jederzeit zu einem früheren Schritt zurück.
- **1 Hören:** Lick zweimal über Groove `full`, dazwischen ein leerer Takt.
  Knopf „Weiter“.
- **2 Mitsingen:** Lick zweimal über Groove `full`; Text „Sing mit auf
  ‚du‘. Die Stimme lernt den Verlauf, die Finger folgen.“ Keine Auswertung,
  kein Mikrofon. Knopf „Weiter“.
- **3 Startton:** Lick einmal, danach liegt leise Grundton + Quinte von
  `root` (Sinus, keine Terz – verrät nicht Dur/Moll). Tippen auf Tasten
  klingt; richtig ist die Tonklasse des ersten Lick-Tons. Texte nach 2d.
  Die gefundene Taste bekommt eine kleine Marke mit der Stufe (bleibt bis
  zum Verlassen des Licks).
- **4 Stückweise:** je Teil aus `parts`: Einzähler, Vorbild (nur dieser
  Teil, Groove `full`), ein Takt Groove weiter, dann „Du“: ein Takt (bei
  Teilen, die über die Taktmitte hinausreichen, zwei Takte) Groove
  `backbeat`, eigenes Spiel. Auswertung: Tonfolge (Tonklassen) muss stimmen;
  Rhythmus relativ zum eigenen ersten Ton, nur als Hinweis (2d). Teil
  geschafft → nächster Teil; alle Teile → Schritt geschafft.
- **5 Ganz:** der ganze Lick nach Einzähler, Vorbild einmal, dann eigenes
  Spiel im absoluten Raster. Drei Runden mit sinkender Stütze
  `full` → `backbeat` → `snare`; eine Runde gilt, wenn alle Töne mit
  richtiger Tonklasse innerhalb `tol` getroffen sind. Rückmeldung nach jeder
  Runde als Zeitleiste (Soll-Punkte ○, eigene Töne ●, früh/spät farbig) und
  ein Satz („Genau so!“ bzw. wie 2d „Stückweise“).
- **7 Notenbild:** Piano-Roll (Zeilen = vorkommende Töne, beschriftet
  „Tonname · Stufe“, deutsche Tonnamen wie in der App), Glide als schräge
  Verbindung, Zählzeilen „1 e + a“, laufende Marke, Tasten leuchten beim
  Vorbild und beim Mitspielen. Knopf „Mitspielen und mitlesen“.
  Einstellung im Zahnrad: „Notenbild bei Licks: als letzter Schritt / aus“.
- **Tastatur:** `keyboardRange(lick, octaveShift)` → `[tiefste, höchste]`
  MIDI-Nummer nach 2a; weiße und schwarze Tasten wie `piano.html`, über die
  volle Breite verteilt, nicht waagrecht wischbar (Lagenwechsel nur über
  „Okt −/+“). Bei den acht Licks sind das 8 bis 12 weiße Tasten – bei 390 px
  Breite also mindestens 30 px je weiße Taste, Tastenhöhe mindestens 180 px.
  Keine Beschriftung außer der Startton-Marke.
- **Klang und Glide:** Klang-Auswahl (Liste der fünf Presets) und Schalter
  „Glide“ oben über der Tastatur, je Lick gespeichert.
- **Sichtbarkeit** strikt nach 2b; Platzhalter „Nach Gehör“ während der
  Läufe.
- **Prüfungen A4:** `partMessage` für alle Zeilen aus 2d (inkl. `k = 1`,
  Oktave, Halbton/Ganzton/weiter); `keyboardRange` für alle Licks (tiefster
  und höchster Ton innerhalb, 8–12 weiße Tasten, Grenzen 24–96, beide
  Oktav-Verschiebungen); Platzhalter-SVG/HTML für
  `bassOktav` und `arpMoll` identisch; Schrittleiste mit `notes: 'off'` ohne
  Notenbild; Roundtrip `items[*].step/parts/whole`. Sichtprüfung: Startton,
  Stückweise während „Du“, nach einer Runde, Notenbild.
  **Hörtest:** Grundton + Quinte leise genug; Vorbild und eigener Ton
  unterscheidbar (gleiches Preset ist gewollt).
- Commit: `Licks: Übe-Ablauf nach Gehör – Mitsingen, Startton, stückweise, ganz, Notenbild zuletzt`

### Paket A5 – Durchhalten

- Schritt 6 „Durchhalten“ aktivieren. Oben die Leiter als vier Felder
  („4 Takte · 8 Takte · 8 mit Lücken · 16 mit Lücken“), geschaffte mit
  Häkchen, die nächste hervorgehoben; frühere Stufen jederzeit wählbar.
  Unter der Leiter ein Satz, der **vor** dem Start sagt, was kommt, z. B.
  „8 Takte. Das Schlagzeug setzt zweimal für zwei Takte aus – spiel weiter.“
- Ablauf nach 2c: Einzähler, eigenes Spiel über `bars` Takte (der Lick
  läuft **nicht** mit – nur die Begleitung nach `holdPlan`), Schlussschlag.
  Vorher einmal das Vorbild wie in „Ganz“, wenn der letzte Lauf dieses Licks
  länger als 10 Minuten her ist (sonst direkt).
- `HOLD_STAGES`, `holdPlan`, `judgeHold`, `holdMessage` nach 2c/2d.
- Nach dem Lauf: Taktstreifen + Satz; bei `held` wird `hold` erhöht und der
  Knopf heißt „Weiter: {nächste Stufe}“, sonst „Nochmal“. Nach Stufe 4:
  „Alle Stufen geschafft.“
- Der Schritt „Durchhalten“ gilt als geschafft ab `hold ≥ 2`.
- Fortschritt: je Lauf `progress.add({ area: 'licks', level: lick.level, right: held, seconds })`
  (dazu `'licks'` in `PROGRESS_AREAS` in `app.js`, sonst verwirft
  `sanitizeProgress` den Eintrag).
- **Prüfungen A5:** `holdPlan` für alle Stufen (Erwartungswerte aus 2c);
  die fünf gemeinsamen `judgeHold`-Testvektoren (Abschnitt 3); `holdMessage`
  für jede Tabellenzeile; Licks mit `bars: 2`: Wiederholungszahl = `bars /
  2`; geplante Begleitung in stillen Takten leer (auch kein Klick); Roundtrip
  `hold`; `PROGRESS_AREAS` enthält `licks`, alter Fortschritt lädt
  unverändert. Sichtprüfung: Leiter vor dem Start, Platzhalter während des
  Laufs (**kein** Zähler), Taktstreifen danach mit schraffierten stillen
  Takten.
  **Hörtest:** Lücken klar als Stille erkennbar; Schlussschlag eindeutig;
  16 Takte mit Lücken bei 100 BPM spielbar (etwa 40 Sekunden).
- Commit: `Licks: Durchhalten über 4 bis 16 Takte, mit Lücken, Auswertung je Takt`

### Paket A6 – Status, Wiederholen, „Heute wiederholen“

- Nach Durchhalten (oder beim Verlassen nach mindestens Schritt 5) fragt
  „Wie fühlt es sich an?“ mit drei Knöpfen „Noch wackelig“ (`shaky`),
  „Geht schon“ (`ok`), „Sitzt“ (`solid`, Regel aus 2a). Darunter:
  „Bestimmt, wann der Lick wieder in ‚Heute wiederholen‘ auftaucht.“
- `nextDue(rating, streak, today)` → `{ due, streak }` nach 2a (reine
  Funktion, Datum als `JJJJ-MM-TT` in lokaler Zeit wie `progressDate`).
- `?review=1`: alle fälligen Licks nacheinander (Hören → Durchhalten auf
  Stufe `max(1, hold)` → Einschätzung). Nichts fällig → Liste mit Hinweis.
- `app.js`: reine Funktion `licksDue(licksState, today)` → Zahl der Items
  mit gültigem `due` ≤ `today`. `app.js` kennt die Lick-IDs nicht (die Tools
  sind eigenständig); ungültige IDs verwirft bereits `sanitizeLicksState`
  beim nächsten Öffnen von `licks.html`. Die Karte „Heute wiederholen“ lädt `chorToolStorage.load('licks')` beim
  Anzeigen der Tools-Seite (wie `warmupMinutes`) und zeigt „{n} Licks“ mit
  Knopf → `QUICK_STARTS.licksReview`. Kachel „Synth-Licks“: Unterzeile
  `tools.licks.sub` mit Anzahl und „sitzen“.
- **Prüfungen A6:** `nextDue` alle Fälle inkl. Streak-Folge 7 → 21 → 60 und
  Rücksetzen; Monats-/Jahreswechsel; `licksDue` mit kaputtem Zustand → 0;
  „Sitzt“ deaktiviert bei `hold < 2`; Roundtrip `rating/streak/due`;
  Tools-Seite: Karte zeigt „Heute ist nichts fällig“ ohne Ablage.
- Commit: `Licks: Status, Wiederholen mit Abstand, Karte „Heute wiederholen“`

## 5. Pakete – Teil B (nur wenn die Weiche in 0.3 erfüllt ist)

### Paket B1 – Klatsch-Grooves in `uebe-lab.html`, mit Durchhalten

- Aufruf `uebe-lab.html?tab=rhythm&grooves=1` (Liste) bzw. `&grooves=review`.
  `QUICK_STARTS` um `grooves` und `groovesReview` ergänzen; die Kachel
  „Klatsch-Grooves“ auf der Tools-Seite wird aktiv (ohne geschaffte
  Lektionen: deaktiviert mit `tools.licks.groovesEmpty`).
- **Liste:** alle Lektionen aus `course.done` in Kursreihenfolge, je Zeile
  Knopf „Anhören“ (Vorbild einmal, Begleitung `full` bzw. Klick nach den
  Kurs-Regeln über `accompFor`), Name, Unterzeile „Kurs · Kapitel {ch}“,
  Status. Keine Muster-Vorschau.
- **Ablauf je Groove:** Hören (Vorbild zweimal) → Auffrischen (eine
  Nachklatsch-Runde wie Kurs-Wiederholung: `mode: 'echo'`, Begleitung
  `backbeat`) → Durchhalten (nur `holdable(l)`, 2c; Muster zyklisch wie
  `barsOf4`, Begleitung `snare` bzw. still nach `holdPlan`; Taktarten ohne
  `ACCOMP`-Eintrag: Klick statt Snare, Lücken = Klick aus) → Einschätzung.
  Eingabe: Tippfeld oder Mikrofon wie bisher.
- `holdPlan`, `judgeHold`, `holdMessage`, `nextDue` identisch zu
  `licks.html` (kopiert, gleiche Testvektoren).
- **Ablage:** neues optionales Feld im Datensatz `playground`:
  `rhythm.grooves = { [lessonId]: { hold, rating, streak, due } }`, durch
  `snapshot`/`restore` gereicht; beim Laden gegen `COURSE`-IDs gefiltert.
  `course` bleibt unverändert.
- Sichtbarkeit nach 2b (Platzhalter, keine Marke, kein Zähler).
- Fortschritt: Bereich `licks` (nicht `rhythm`, damit die Kurs-Stufe
  unberührt bleibt).
- **Prüfungen B1:** gemeinsame `judgeHold`-Vektoren; Lektion mit `pickup`
  → kein Durchhalten, „Sitzt“ wählbar; Roundtrip `rhythm.grooves` (neu /
  alt ohne Feld / unbekannte ID / kaputt); `course.done`, `course.lesson`,
  `duoOstinato` unverändert nach Laden eines Stands mit `grooves`;
  bestehende `courseCheck()`-Fehlerliste weiter leer. Sichtprüfung: Liste,
  Durchhalten während und nach dem Lauf.
  **Hörtest:** Tresillo und Son-Clave über 16 Takte mit Lücken; Wiedereinsatz
  der Snare nach der Stille klar hörbar.
- Commit: `Klatsch-Grooves: geschaffte Kurs-Lektionen behalten und durchhalten`

### Paket B2 – „Heute wiederholen“ mit Grooves

- `app.js`: `groovesDue(playgroundState, today)` analog `licksDue`, liest
  `rhythm.grooves`. Karte zeigt beide Zahlen; je Art ein Knopf
  („{n} Grooves“, „{n} Licks“); nur eine Art fällig → ein Knopf.
- Kachel „Klatsch-Grooves“: Unterzeile `tools.licks.sub`.
- **Prüfungen B2:** Kombinationen 0/0, n/0, 0/n, n/m; kaputte Stände → 0.
- Commit: `Licks & Grooves: Heute wiederholen mit Grooves und Licks`

---

## 6. Bericht

Datei `BERICHT-LICKS-GROOVES.md`, im letzten Commit, Aufbau wie
`BERICHT-DIDAKTIK.md`:
- Tabelle: Paket, Status, Commit, `SW_VERSION`, Prüfungen.
- Ergebnis der Weiche (Teil B umgesetzt oder nicht, mit grep-Ausgabe).
- Je Paket: Geändert, Abweichungen (mit Grund).
- Kopierte Blöcke mit Herkunft (Datei, Commit) und was weggelassen wurde
  (Hall/Echo).
- Gewählte Pegel der Begleitung und des Grundton-Liegeklangs.
- Hörtest- und Sehtest-Checkliste für morgens.
- „Morgens im Browser ausführen“, falls kein Headless-Browser vorhanden war.
- **Zu entscheiden** – mindestens:
  - Soll „Licks & Grooves“ in „Dein Stand“ angezeigt werden (neue Gruppe)?
  - Sind die Durchhalten-Schwellen (75 % je Takt, zwei verlorene Takte)
    für den Chor zu streng oder zu locker?
  - Soll es eine fünfte Durchhalten-Stufe geben (32 Takte, oder Lücken mit
    Mitsingen einer Melodie darüber)?
  - Transponieren der Licks in andere Tonarten, Pitch-Bend-Streifen,
    Web MIDI (nicht auf iOS-Safari).
  - Passen die Starttempi der Licks (84–108 BPM)?
  - Alles, was unterwegs auffiel, aber nicht zum Auftrag gehörte.
