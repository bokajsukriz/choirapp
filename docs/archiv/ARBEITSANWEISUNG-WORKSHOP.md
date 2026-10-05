# Arbeitsanweisung für Claude Code – Groove Lab: Workshop

Du bist erfahrene Musikpädagogin/erfahrener Musikpädagoge und Entwickler:in.
Du baust ins Groove Lab eine dritte Ansicht **„Workshop“** ein: geführte
Lerneinheiten, die spielerisch durch Beat, Harmonie, Melodie, Klang und Mix
führen. Jede Einheit stellt einen Ausgangszustand ein, gibt eine konkrete
Handlung vor und erkennt selbst, wann das Ziel erreicht ist. Musikalische und
didaktische Entscheidungen sind hier getroffen; alle Einheiten stehen fertig
im Format der App.

Antworte und kommentiere auf Deutsch.

**Diese Anweisung läuft unbeaufsichtigt.** Keine Rückfragen. Wo etwas unklar
bleibt: die Variante wählen, die näher am bestehenden Verhalten liegt, im
Bericht unter „Zu entscheiden“ notieren, weitermachen.

Ausdrücklich **nicht** Teil dieses Auftrags: Änderungen an der Chor-Ansicht
(`CHOIR_TASKS`), an `DRUM_PATTERNS`, `MELODIES`, `PROGRESSIONS`,
`SYNTH_PRESETS` oder an `uebe-lab.html`/`einsingen.html`.

---

## 0. Vorbereitung

1. Branch `workshop` von aktuellem `main` anlegen (Stand beim Schreiben:
   `759702e`, `SW_VERSION` `v339`). Nie auf `main` committen, nie mergen,
   nie force-pushen.
2. `CLAUDE.md`, `README.md`, `ARBEITSANWEISUNG-CLAUDE-CODE.md` (Abschnitte 1
   und 3), `ARBEITSANWEISUNG-DIDAKTIK.md` (Paket 8) und `BERICHT-DIDAKTIK.md`
   (Abschnitt 8) lesen.
3. **Vor der ersten Codeänderung** einen Referenzabzug der Chor-Aufgaben
   erzeugen und unter `/tmp/choir-ref.json` ablegen (nicht committen): für
   jede Aufgabe aus `CHOIR_TASKS` × jede Stimme `S, A, T, B, null` das
   Ergebnis von `sanitizeState(choirTaskState(defaultState(), task, part))`.
   Paket 1 baut `choirTaskState` um; danach muss exakt dasselbe herauskommen.
4. Diese Datei im ersten Commit mit einchecken.

## 1. Feste Regeln

Es gelten **alle Regeln aus Abschnitt 1 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`**
(ein Paket = ein Commit + Push, `SW_VERSION` je Commit erhöhen, keine IDs
ändern, Reihenfolge von `DRUM_PATTERNS`/`MELODIES` nie ändern, neue Felder
optional mit Standardwert und durch `sanitizeState` gereicht,
Persistenz-Roundtrip Pflicht, Texte in `strings.js` DE/EN/PL gemeinsam,
keine Abhängigkeiten). Zusätzlich:

- **Einheiten-IDs sind stabil.** Einmal vergeben, nie umbenennen (der
  Fortschritt wird über die ID gespeichert). Neue Einheiten nur anhängen.
- **Wortwahl:** ermutigend, nie bewertend. Kein „falsch“, keine roten
  Markierungen, keine Punkte, keine Zeitlimits, kein Verlust von Fortschritt.
  Ein erreichtes Teilziel bleibt erreicht.
- **Nichts wird gesperrt.** Stufen werden *vorgeschlagen* (wie die Lern-Stufen
  in der Ausbildung), jede Einheit ist jederzeit wählbar.
- **Barrierefreiheit:** alle neuen Knöpfe ≥ 44 px, `aria-label`, erreichte
  Teilziele über `aria-live="polite"` ansagen, Markierungen im Raster nie nur
  über Farbe (zusätzlich Umrandung/Muster).
- **Speichern** nur über die vorhandene Ablage (`this._storage`, IndexedDB
  über `app.js`), nie `localStorage`.
- **Übersetzungen:** DE steht unten fertig. EN und PL schreibst du im selben
  Paket selbst, sinngemäß und natürlich, nicht wörtlich. Unsichere
  PL-Formulierungen im Bericht auflisten.

## 2. Entscheidungen (verbindlich)

| Thema | Festlegung |
|---|---|
| Name der Ansicht | „Workshop“ (EN „Workshop“, PL „Warsztat“); dritter Chip neben „Chor“ und „Studio“ |
| Stufen | `tour` „Rundgang“ (alles einmal, ~20 min), `deep` „Vertiefung“ (fünf Bereiche frei wählbar), `challenge` „Challenges“ |
| Bereiche | `rhythm` Rhythmus · `harmony` Harmonie · `melody` Melodie · `sound` Klang · `mix` Mix |
| Felder im Raster | In Texten immer **Feld 1–16** (1-basiert), im Code 0-basiert. Zählweise zusätzlich in Rhythmussprache der App: `1 e + e 2 e + e …` |
| Teilziele | Jede Einheit hat 1–4 Teilziele (`checks`). Sie werden **der Reihe nach** geprüft; ein Teilziel kann erst erreicht werden, wenn alle vorigen erreicht sind; erreicht bleibt erreicht (auch wenn der Regler danach zurückgeht). Einheit geschafft = alle Teilziele erreicht |
| Ausgangszustand | Immer reproduzierbar aus `defaultState()` (siehe `lessonState`), nicht aus dem aktuellen Stand. Wählen einer Einheit = ein Undo-Schritt |
| Start | Antippen einer Einheit startet die Wiedergabe (die Geste reicht für den AudioContext). Ausnahme: Challenges starten erst mit „Los“ |
| Nicht fokussierte Regler | im Workshop gedimmt (`opacity: .35`), aber bedienbar — niemand soll „eingesperrt“ werden |
| Nach dem Workshop | Wechselt man zu „Studio“, bleibt der Stand der Einheit erhalten („Dein Track wandert ins Studio“) |
| Vorher/Nachher | Nach geschaffter Einheit ein Knopf „Vorher/Nachher“: schaltet hörbar zwischen Ausgangszustand und eigenem Stand um |
| Fortschritt | nur lokal in `_saved.workshop`, keine Tagesstatistik |
| Tonnamen, Solmisation | wie im Rest der App (`spell`/`noteLabel`; relatives Do, Moll la-basiert) |

## 3. Tests

Wie in `ARBEITSANWEISUNG-CLAUDE-CODE.md` Abschnitt 3: reine Funktionen und
Daten über `ChorGrooveLab._test` exportieren, Musikprüfungen in
`runMusicSelfTests` (app.js) ergänzen, Headless-Prüfung mit Playwright
(Skill `run-choirapp`), Node-Prüfskripte unter `/tmp` (nicht committen). Die
je Paket geforderten Prüfungen stehen am Paketende. **Allgemein für jede
Einheit** (ab Paket 2 für alle vorhandenen Einheiten):

1. `sanitizeState(lessonState(defaultState(), lesson))` ändert nichts
   (ausgenommen `droneOn`, wie in Paket 8 der Didaktik).
2. Alle Namen in `groove`, `melody`, `preset` existieren; alle
   `focus`-Schlüssel sind bekannt (Abschnitt 4, Paket 1).
3. Im Ausgangszustand ist `checks[0]` **nicht** erfüllt.
4. `solution` hat genau so viele Einträge wie `checks`. Wendet man
   `solution[i](s, ctx)` der Reihe nach an, ist danach jeweils `checks[i]`
   erfüllt, und das Ergebnis besteht `sanitizeState` unverändert.
5. Für jeden Textschlüssel der Einheit gibt es DE, EN und PL.

---

## 4. Pakete

### Paket 1 – Grundgerüst: Datenmodell, Ansicht, Zielprüfung, Fortschritt

**Ziel:** Die Ansicht „Workshop“ existiert, kann Einheiten laden, prüft Ziele
und merkt sich den Fortschritt. Zum Ausprobieren gibt es in diesem Paket nur
die Einheit `synkope` (aus Paket 2 vorgezogen).

#### 1a Datenformat

In `groove-lab.js` nach `CHOIR_TASKS`:

```js
/* ------------------------------------------------------------------------
   WORKSHOP (siehe ARBEITSANWEISUNG-WORKSHOP.md). Eine Einheit setzt beim
   Wählen einen reproduzierbaren Ausgangszustand (lessonState) und prüft
   danach ihre Teilziele der Reihe nach. Texte: lab.lesson.<id>.*
   IDs nie ändern — gespeichert wird der Fortschritt je ID.
   ------------------------------------------------------------------------ */
const LESSON_TIERS = ['tour', 'deep', 'challenge'];
const LESSON_AREAS = ['rhythm', 'harmony', 'melody', 'sound', 'mix'];

// Kleine Helfer für die Zielprüfungen (rein, exportieren).
const stepsOn = (s, track) => Object.keys(s.beat[track] || {}).map(Number).sort((a, b) => a - b);
const sameSteps = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const hitAt = (s, track, step) => s.beat[track]?.[step] !== undefined;
const progOf = (s) => PROGRESSIONS.find((p) => p.id === s.progId) || PROGRESSIONS[0];
const progDegreesOf = (s) => s.progDegrees || progOf(s).degrees;
const progSeventhsOf = (s) => (s.progDegrees ? !!s.progSevenths : !!progOf(s).sevenths);
const melodyBarsOf = (s) => s.melodyBars || MELODIES[s.melodyIndex].bars;
const lastPlayed = (ctx, n) => ctx.played.slice(-n).map((p) => p.deg);
const hasRun = (list, run) => list.some((_, i) => run.every((d, k) => list[i + k] === d));

const WORKSHOP_LESSONS = [ /* Einheiten, siehe Pakete 2–8 */ ];
```

Felder einer Einheit:

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | stabil, camelCase |
| `tier`, `area` | ja | aus `LESSON_TIERS` / `LESSON_AREAS` (`area` auch bei `tour`) |
| `tab` | ja | welcher Studio-Reiter unter der Karte erscheint: `beat`, `harmony`, `melody`, `sound`, `mixer`, `keys` |
| `groove` | nein | Name aus `DRUM_PATTERNS`; `null` = Drums und Bass stumm; fehlt = `DRUM_PATTERNS[0]` |
| `melody` | nein | Name aus `MELODIES` |
| `preset` | nein | Name aus `SYNTH_PRESETS` (Klang wird `soundFromPreset`) |
| `set` | nein | Zustandsfelder, nach groove/melody/preset angewandt; `progId` wie in `choirTaskState` behandeln |
| `sound` | nein | wird in `s.sound` gemischt, setzt `custom: true` |
| `trackOn`, `mute`, `fx`, `kit` | nein | werden in die gleichnamigen Objekte gemischt |
| `beat` | nein | `{ spur: [Schritte] }` ersetzt diese Spuren komplett (Wert 1), setzt `beatEdited: true`. Nie für `bass` verwenden |
| `focus` | ja | Liste der Fokus-Schlüssel (1c) |
| `mark` | nein | `{ spur: { from: [..], to: [..] } }` — Markierung im Raster |
| `checks` | ja | Liste von `(s, ctx) => boolean` |
| `solution` | ja | Liste von `(s, ctx) => void`, gleiche Länge wie `checks`, **nur für Tests** |
| `kind` | nein | nur Challenges: `detective`, `rebuild`, `soundMatch` (Paket 8) |

`ctx` ist `{ played, start }`: `played` = die zuletzt auf Tasten/Pads
gespielten Töne (max. 32, `{ pc, deg, t }`, `deg` = Tonleiterstufe 0–6 in der
aktuellen Tonart oder `null`, siehe 1d), `start` = Kopie des
Ausgangszustands.

#### 1b `lessonState` (rein, exportieren)

```js
/** Ausgangszustand einer Einheit — immer aus defaultState(), damit jede
 *  Einheit gleich beginnt. Behält nur Ansicht, Tastenlayout, Oktave und
 *  Master-Pegel des aktuellen Stands. */
function lessonState(current, lesson) {
  const s = defaultState();
  s.view = current.view; s.keysLayout = current.keysLayout; s.octave = current.octave;
  s.mix.master = current.mix.master;
  s.chordsOn = false; s.melodyOn = false; s.arpOn = false;
  if (lesson.groove === null) { s.mute.drums = true; s.mute.bass = true; }
  else if (lesson.groove) {
    s.patternIndex = patternIndexByName(lesson.groove);
    const pattern = DRUM_PATTERNS[s.patternIndex];
    s.beat = beatFromPattern(pattern);
    s.swing = typeof pattern.swing === 'number' ? pattern.swing : 0;
  }
  if (lesson.melody) { s.melodyIndex = melodyIndexByName(lesson.melody); s.melodyOn = true; }
  if (lesson.preset) s.sound = soundFromPreset(presetIndexByName(lesson.preset));
  applyTaskSet(s, lesson.set || {});            // gemeinsamer Helfer, siehe unten
  if (lesson.sound) Object.assign(s.sound, lesson.sound, { custom: true });
  for (const key of ['trackOn', 'mute', 'fx', 'kit']) if (lesson[key]) Object.assign(s[key], lesson[key]);
  if (lesson.beat) {
    for (const [track, list] of Object.entries(lesson.beat)) s.beat[track] = Object.fromEntries(list.map((x) => [x, 1]));
    s.beatEdited = true;
  }
  s.eighths = s.bpm * eighthsPerBeat(DRUM_PATTERNS[s.patternIndex].meter);
  s.choirTask = null;
  s.lessonId = lesson.id;
  return s;
}
```

`applyTaskSet(s, set)` aus der `for`-Schleife in `choirTaskState`
herauslösen (inklusive der `progId`-Sonderbehandlung) und dort
wiederverwenden. **Prüfen:** Ergebnis aller Chor-Aufgaben identisch mit
`/tmp/choir-ref.json`.

Achtung bei `set.droneOn`: Der Liegeton startet wie bei den Chor-Aufgaben
erst in der View (`_setDrone(true)` nach dem Anwenden).

#### 1c Ansicht

- `defaultState()`: neues Feld `lessonId: null`. `sanitizeState`:
  `s.view = oneOf(raw.view, ['choir', 'studio', 'workshop'], null)`,
  `s.lessonId = oneOf(raw.lessonId, WORKSHOP_LESSONS.map((l) => l.id), null)`.
- Dritter Chip `data-action="view" data-value="workshop"`. `_applyView`
  kennt `workshop`: Reiterleiste aus, Chor-Ansicht aus, neue
  `.workshop-view` an, darunter genau das Panel `lesson.tab` (Studio-Panels
  wiederverwenden, nicht duplizieren).
- `.workshop-view` enthält von oben nach unten:
  1. **Stufenwahl** (Chips): Rundgang · Vertiefung · Challenges, dazu
     „Rundgang 3/9“.
  2. **Bereichswahl** (nur bei Vertiefung): Rhythmus · Harmonie · Melodie ·
     Klang · Mix.
  3. **Einheiten** als Chips mit Häkchen (✓ + `aria-label` „geschafft“) für
     erledigte.
  4. **Karte:** Titel · Anleitung (`do`) · Teilziele als Liste mit
     Kästchen (erreicht = ✓ und durchgestrichen) · `<details>` „Warum?“ mit
     `why` · nach Erfolg der Aha-Satz (`aha`) hervorgehoben · Knöpfe
     „Neu starten“, „Vorher/Nachher“ (nur wenn geschafft), „Weiter →“
     (nächste Einheit derselben Stufe/desselben Bereichs).
- **Fokus:** `_wsFocusEls(key)` liefert die Elemente zu einem
  Fokus-Schlüssel. Alles andere innerhalb des gezeigten Panels bekommt
  `.ws-dim`. Bekannte Schlüssel:

  | Schlüssel | Element |
  |---|---|
  | `bpm`, `swing`, `pump` | Tempo-Eingabe der Fußleiste bzw. Regler `data-field` |
  | `track:<id>` | Zeile der Spur in `.track-list` (`kick`…`bass`) |
  | `picker:beat`, `picker:prog`, `picker:melody`, `picker:preset` | Auswahlknopf des jeweiligen Pickers |
  | `mode`, `key`, `chordsOn`, `chordBars`, `satb`, `drone` | entsprechende Harmonie-Steuerelemente |
  | `progEditor`, `progSevenths` | Akkordfolgen-Editor bzw. dessen Septimen-Schalter |
  | `melEditor`, `melodyAltBars` | Melodie-Editor bzw. Schalter |
  | `pads` | Tonleiter-Pads (`.scale-pads`) |
  | `arp` | Arp-Schalter und -Auswahlen |
  | `wave`, `filterType` | `.wave-row` bzw. `.filter-type-chips` |
  | `sound:<key>` | Knob bzw. ADSR-Regler zu `SOUND_RANGES`-Schlüssel |
  | `mute:<bus>`, `mix:<bus>` | Stumm-Knopf bzw. Pegel im Mixer |
  | `fx:echo`, `automation` | Echo-Einstellungen bzw. Automations-Aufnahme |
  | `kit` | Kick-Regler (Paket 6) |

  Unbekannter Schlüssel oder nicht gefundenes Element → Eintrag in
  `selfCheck()`/Test, kein Absturz.
- **Markierungen:** Zellen aus `mark.*.from` bekommen `.ws-from` (gestrichelte
  Umrandung), aus `mark.*.to` `.ws-to` (pulsierender Ring, bei
  `prefers-reduced-motion` statisch). Nach Erfolg verschwinden sie.

#### 1d Zielprüfung

- `this.ui.ws = { lesson, reached: [], played: [], start, ab: null }`.
- `_wsSchedule()`: höchstens einmal pro Frame `_wsCheck()` auslösen.
  Aufrufen am Ende der `click`-, `input`-, `change`-, `pointerup`- und
  `keyup`-Listener im Shadow-Root, in `_afterStateChange`, `_onSoundEdit`,
  `_toggleCell`, `_progCommit`, `_melCommit`, `_autoFinish` und nach jeder
  Tasten-/Pad-Eingabe.
- `_wsCheck()`: nur in Ansicht `workshop`, nur wenn `ab` nicht gerade das
  Vorher zeigt. Für das erste noch nicht erreichte Teilziel `checks[i]`
  prüfen; ist es erfüllt, merken, per `aria-live` ansagen und sofort das
  nächste prüfen (mehrere können in einem Durchgang fallen). Ist das letzte
  erreicht: Einheit als geschafft speichern, Aha-Satz zeigen, Markierungen
  entfernen.
- **Gespielte Töne:** In `_enterKey` (auch im Latch-Zweig) `_wsNote(midi)`
  aufrufen: `pc = mod(midi - keyRoot, 12)`, `deg` = Index `d` in `0…6` mit
  `mod(degreeSemis(mode.steps, d), 12) === pc`, sonst `null`. In
  `ui.ws.played` anhängen (max. 32).

#### 1e Vorher/Nachher

`ui.ws.ab = { mine, showing }`. „Vorher“ ersetzt den Zustand durch
`ui.ws.start` (ohne Undo-Eintrag, ohne Zielprüfung, Steuerelemente der Karte
außer dem Umschalter `inert`), „Nachher“ stellt `mine` wieder her. Der Knopf
zeigt deutlich, was gerade klingt. Beim Verlassen der Einheit oder der
Ansicht immer auf „Nachher“ zurück. Die Wiedergabe läuft beim Umschalten
taktgenau weiter (wie beim Wechsel der Chor-Aufgabe).

#### 1f Fortschritt

`this._saved.workshop = { done: { [id]: 'YYYY-MM-DD' }, last: id | null }`,
eingelesen in `_loadStorage` über `sanitizeWorkshopProgress(raw)` (unbekannte
IDs verwerfen, Datum per Regex prüfen), gespeichert über `_persist()` bei
jeder geschafften Einheit. Öffnet man den Workshop, wird `last` gewählt,
sonst die erste nicht geschaffte Einheit des Rundgangs.

#### 1g Texte (UI)

```js
'lab.viewWorkshop': 'Workshop',
'lab.ws.tierTour': 'Rundgang',
'lab.ws.tierDeep': 'Vertiefung',
'lab.ws.tierChallenge': 'Challenges',
'lab.ws.areaRhythm': 'Rhythmus',
'lab.ws.areaHarmony': 'Harmonie',
'lab.ws.areaMelody': 'Melodie',
'lab.ws.areaSound': 'Klang',
'lab.ws.areaMix': 'Mix',
'lab.ws.progress': 'Rundgang {done}/{total}',
'lab.ws.why': 'Warum?',
'lab.ws.restart': 'Neu starten',
'lab.ws.before': 'Vorher',
'lab.ws.after': 'Nachher',
'lab.ws.abHint': 'Jetzt klingt: {which}',
'lab.ws.next': 'Weiter',
'lab.ws.done': 'Geschafft!',
'lab.ws.doneAria': 'geschafft',
'lab.ws.reached': 'Erreicht: {check}',
'lab.ws.tourDone': 'Rundgang geschafft! Such dir jetzt einen Bereich zum Vertiefen aus — oder probier eine Challenge.',
'lab.ws.toStudio': 'Dein Stand bleibt erhalten, wenn du ins Studio wechselst.',
```

**Prüfungen Paket 1:** Chor-Referenz identisch; Roundtrip `view: 'workshop'`,
`lessonId`, `_saved.workshop` (neu → gleich; alt ohne Felder → Standard;
Müll → Standard); `synkope` besteht die allgemeinen Prüfungen aus Abschnitt 3;
Headless: Workshop öffnen, `synkope` wählen, Feld 9 aus- und Feld 11
anklicken → „Geschafft!“ erscheint, Fortschritt nach Schließen und
Wiederöffnen noch da; Vorher/Nachher schaltet das Kick-Muster hörbar
(Zustand) um.

---

### Paket 2 – Rundgang (Stufe `tour`)

Neun Einheiten in dieser Reihenfolge. Jede soll in 2–3 Minuten zu schaffen
sein.

```js
{ id: 'puls', tier: 'tour', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
  set: { bpm: 90 }, trackOn: { snare: false, clap: false, hat: false, open: false, bass: false },
  focus: ['bpm'],
  checks: [(s) => s.bpm >= 58 && s.bpm <= 62, (s) => s.bpm >= 118 && s.bpm <= 122],
  solution: [(s) => { s.bpm = 60; s.eighths = 120; }, (s) => { s.bpm = 120; s.eighths = 240; }] },

{ id: 'backbeat', tier: 'tour', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
  set: { bpm: 100 }, beat: { snare: [] }, trackOn: { hat: false, open: false, clap: false, bass: false },
  focus: ['track:snare'], mark: { snare: { to: [4, 12] } },
  checks: [(s) => sameSteps(stepsOn(s, 'snare'), [4, 12]) && s.beat.snare[4] === 1 && s.beat.snare[12] === 1],
  solution: [(s) => { s.beat.snare = { 4: 1, 12: 1 }; }] },

{ id: 'offbeat', tier: 'tour', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
  set: { bpm: 120 }, trackOn: { bass: false },
  focus: ['track:hat'], mark: { hat: { from: [0, 4, 8, 12] } },
  checks: [(s) => sameSteps(stepsOn(s, 'hat'), [2, 6, 10, 14])],
  solution: [(s) => { s.beat.hat = { 2: 1, 6: 1, 10: 1, 14: 1 }; }] },

{ id: 'synkope', tier: 'tour', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
  set: { bpm: 100 }, trackOn: { bass: false },
  focus: ['track:kick'], mark: { kick: { from: [8], to: [10] } },
  checks: [(s) => sameSteps(stepsOn(s, 'kick'), [0, 4, 10, 12])],
  solution: [(s) => { delete s.beat.kick[8]; s.beat.kick[10] = 1; }] },

{ id: 'bass', tier: 'tour', area: 'harmony', tab: 'beat', groove: 'Backbeat Open',
  set: { bpm: 96, progId: 'pop', chordsOn: false },
  focus: ['chordsOn', 'track:bass'],
  checks: [(s) => s.chordsOn, (s) => !s.trackOn.bass, (s) => s.trackOn.bass],
  solution: [(s) => { s.chordsOn = true; }, (s) => { s.trackOn.bass = false; }, (s) => { s.trackOn.bass = true; }] },

{ id: 'durMoll', tier: 'tour', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
  set: { bpm: 84, progId: 'drone', modeId: 'major', chordsOn: true }, trackOn: { bass: false },
  focus: ['mode'],
  checks: [(s) => s.modeId === 'minor'],
  solution: [(s) => { s.modeId = 'minor'; }] },

{ id: 'melodie', tier: 'tour', area: 'melody', tab: 'keys', groove: 'Backbeat Open',
  set: { bpm: 88, progId: 'drone', modeId: 'major', chordsOn: true, keysLayout: 'scale' },
  focus: ['pads'],
  checks: [(s, ctx) => [0, 2, 4].every((d) => lastPlayed(ctx, 6).includes(d)),
           (s, ctx) => lastPlayed(ctx, 1).some((d) => d === 1 || d === 3 || d === 5)],
  solution: [(s, ctx) => { ctx.played.push({ deg: 0 }, { deg: 2 }, { deg: 4 }); },
             (s, ctx) => { ctx.played.push({ deg: 3 }); }] },

{ id: 'klang', tier: 'tour', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
  preset: 'Tape Keys', sound: { wave: 'sine', cutoff: 12000, filterEnvAmount: 0 },
  set: { bpm: 90 },
  focus: ['wave', 'sound:cutoff'],
  checks: [(s) => s.sound.wave === 'sawtooth', (s) => s.sound.cutoff <= 800],
  solution: [(s) => { s.sound.wave = 'sawtooth'; }, (s) => { s.sound.cutoff = 700; }] },

{ id: 'ersterTrack', tier: 'tour', area: 'mix', tab: 'beat', groove: 'House Bounce', melody: 'Hook Line',
  set: { bpm: 122, progId: 'pop', chordsOn: true },
  focus: ['track:kick', 'track:hat', 'picker:prog', 'picker:preset'],
  checks: [(s) => s.beatEdited,
           (s, ctx) => s.progId !== ctx.start.progId || !!s.progDegrees || s.modeId !== ctx.start.modeId || s.keyRoot !== ctx.start.keyRoot,
           (s) => s.sound.custom || s.sound.presetIndex !== presetIndexByName('Velvet Choir')],
  solution: [(s) => { s.beat.hat[0] = 1; s.beatEdited = true; },
             (s) => { s.progId = 'sad'; },
             (s) => { s.sound = soundFromPreset(presetIndexByName('Neon Pluck')); }] },
```

Hinweis zu `melodie`: `keysLayout` ist in `lessonState` eigentlich
„behalten“ — `set` überschreibt es hier bewusst. Nach Verlassen der Einheit
nicht zurücksetzen.

Hinweis zu `durMoll`: bewusst `progId: 'drone'` (nur der Tonika-Akkord).
Bei einer ganzen Folge ändern sich beim Moduswechsel mehr Töne als die Terz
(C–G–a–F wird c–g–As–f); die Aussage „nur die Terz“ stimmt nur für den
einzelnen Akkord.

**Texte (DE)**

```js
'lab.lesson.puls.title': 'Der Puls',
'lab.lesson.puls.do': 'Die Bassdrum schlägt auf jede Zählzeit, vier pro Takt. Stell das Tempo erst auf 60, dann auf 120.',
'lab.lesson.puls.check1': 'Tempo 60',
'lab.lesson.puls.check2': 'Tempo 120',
'lab.lesson.puls.aha': '60 BPM ist ein Schlag pro Sekunde, wie ein Sekundenzeiger. 120 ist doppelt so schnell und ein typisches Tanztempo.',
'lab.lesson.puls.why': 'BPM heißt „beats per minute“, Schläge pro Minute. Der Puls ist das gleichmäßige Raster, an dem sich alles ausrichtet, auch wenn nicht auf jedem Schlag etwas passiert. Spielt die Bassdrum jeden Schlag, nennt man das „Four on the floor“.',

'lab.lesson.backbeat.title': 'Der Backbeat',
'lab.lesson.backbeat.do': 'Setz die Snare auf Feld 5 und 13, das sind die Zählzeiten 2 und 4.',
'lab.lesson.backbeat.check1': 'Snare auf 2 und 4',
'lab.lesson.backbeat.aha': 'Tief auf 1 und 3, hell auf 2 und 4: Das ist der Backbeat. Fast jeder Pop-, Rock- und Gospelsong steht darauf, deshalb klatscht man auf 2 und 4.',
'lab.lesson.backbeat.why': 'Die 1 ist die natürliche Betonung eines Takts. Der Backbeat setzt einen Gegenakzent auf die „schwachen“ Zählzeiten und bringt so Schwung hinein. Probier „Vorher/Nachher“ und leg die Snare zum Vergleich einmal auf 1 und 3: Das klingt nach Marschkapelle.',

'lab.lesson.offbeat.title': 'Der Offbeat',
'lab.lesson.offbeat.do': 'Die Hi-Hat spielt jede Achtel. Lösch die Hats auf den Zählzeiten (Feld 1, 5, 9, 13), sodass nur die „und“-Felder 3, 7, 11 und 15 bleiben.',
'lab.lesson.offbeat.check1': 'Hi-Hat nur auf „und“',
'lab.lesson.offbeat.aha': 'Jetzt hüpft der Beat: Die Kick sagt „eins“, die Hat antwortet „und“. Dieses Pendeln ist der Motor von Disco und House.',
'lab.lesson.offbeat.why': 'Offbeat heißt „neben dem Schlag“: die Achtel genau zwischen zwei Zählzeiten. Wir zählen sie als „und“: 1 + 2 + 3 + 4 +. Weil Kick und Hat sich nie überlagern, entsteht ein Hin und Her, das zum Mitwippen einlädt.',

'lab.lesson.synkope.title': 'Die Synkope',
'lab.lesson.synkope.do': 'Verschieb die dritte Kick (Feld 9, Zählzeit 3) eine Achtel nach hinten auf Feld 11, das „und“ nach der 3.',
'lab.lesson.synkope.check1': 'Kick von der 3 aufs „3 +“',
'lab.lesson.synkope.aha': 'Dein Ohr erwartet die 3, und der Schlag kommt zu spät. Diese kleine Überraschung erzeugt Spannung und Schwung: eine Synkope.',
'lab.lesson.synkope.why': 'Eine Synkope betont eine eigentlich unbetonte Zeit. Der Puls läuft im Kopf weiter, der Schlag weicht ab, daraus entsteht Reibung. Funk, Latin und fast jede Pop-Hook leben davon.',

'lab.lesson.bass.title': 'Bass und Grundton',
'lab.lesson.bass.do': 'Der Bass spielt schon. Schalte die Akkorde dazu, dann den Bass einmal aus und wieder ein.',
'lab.lesson.bass.check1': 'Akkorde an',
'lab.lesson.bass.check2': 'Bass aus',
'lab.lesson.bass.check3': 'Bass wieder an',
'lab.lesson.bass.aha': 'Ohne Bass schweben die Akkorde in der Luft. Der Bass spielt meistens den Grundton des Akkords und verbindet Rhythmus und Harmonie.',
'lab.lesson.bass.why': 'Der tiefste Ton bestimmt, wie wir einen Akkord hören. Deshalb spielt der Bass meist den Grundton, dazu Quinte oder Terz als Übergang. Er gehört zugleich zum Groove (wann er spielt) und zur Harmonie (was er spielt).',

'lab.lesson.durMoll.title': 'Dur und Moll',
'lab.lesson.durMoll.do': 'Ein Dur-Akkord klingt. Stell den Modus auf Moll und hör genau hin.',
'lab.lesson.durMoll.check1': 'Modus Moll',
'lab.lesson.durMoll.aha': 'Nur ein einziger Ton hat sich bewegt, die Terz, einen Halbton nach unten. Trotzdem kippt die ganze Stimmung.',
'lab.lesson.durMoll.why': 'Ein Dreiklang besteht aus Grundton, Terz und Quinte. Liegt die Terz vier Halbtöne über dem Grundton, klingt der Akkord nach Dur, bei drei Halbtönen nach Moll. Grundton und Quinte bleiben gleich.',

'lab.lesson.melodie.title': 'Melodie aus Akkordtönen',
'lab.lesson.melodie.do': 'Spiel auf den Pads zur Musik, erst nur die Töne 1, 3 und 5 (do, mi, so). Probier danach einen Ton dazwischen.',
'lab.lesson.melodie.check1': '1, 3 und 5 gespielt',
'lab.lesson.melodie.check2': 'Einen Ton dazwischen gespielt',
'lab.lesson.melodie.aha': '1, 3 und 5 gehören zum Akkord und klingen immer „passend“. Die Töne dazwischen reiben und wollen weiter: Daraus entsteht Bewegung in der Melodie.',
'lab.lesson.melodie.why': 'Eine Melodie wechselt zwischen Ruhe (Akkordtöne) und Spannung (Nicht-Akkordtöne). Auf betonten Zeiten fallen Reibungen stärker auf als auf unbetonten.',

'lab.lesson.klang.title': 'Wie ein Klang entsteht',
'lab.lesson.klang.do': 'Ein Sinuston spielt. Stell die Wellenform auf Sägezahn und dreh dann den Filter (Cutoff) nach unten, bis es dumpf klingt.',
'lab.lesson.klang.check1': 'Sägezahn',
'lab.lesson.klang.check2': 'Filter zu',
'lab.lesson.klang.aha': 'Der Sinus hat keine Obertöne, der Sägezahn alle. Der Filter schneidet die hohen wieder weg. So arbeiten klassische Synthesizer: erst viel Klang erzeugen, dann formen.',
'lab.lesson.klang.why': 'Jeder natürliche Ton besteht aus einem Grundton und vielen leiseren Obertönen. Ihre Mischung macht die Klangfarbe. Diese Art der Klangformung heißt subtraktive Synthese, weil etwas weggenommen wird.',

'lab.lesson.ersterTrack.title': 'Dein erster Track',
'lab.lesson.ersterTrack.do': 'Alle Bausteine laufen. Mach den Track zu deinem: Ändere den Beat, die Akkordfolge und den Klang.',
'lab.lesson.ersterTrack.check1': 'Beat verändert',
'lab.lesson.ersterTrack.check2': 'Harmonie verändert',
'lab.lesson.ersterTrack.check3': 'Klang verändert',
'lab.lesson.ersterTrack.aha': 'Beat, Bass, Harmonie, Melodie, Klang: Du hast alle Bausteine eines Tracks in der Hand. Speichere ihn auf einem Speicherplatz.',
'lab.lesson.ersterTrack.why': 'Musik entsteht aus wenigen Bausteinen, die aufeinander hören: Der Beat gibt die Zeit vor, der Bass verbindet Rhythmus und Harmonie, Akkorde geben die Stimmung, die Melodie erzählt, der Klang färbt alles ein.',
```

**Prüfungen Paket 2:** allgemeine Prüfungen für alle neun Einheiten;
Headless: Rundgang komplett per Test-Export (`solution`) durchlaufen →
„Rundgang 9/9“ und Hinweis `lab.ws.tourDone`.

---

### Paket 3 – Vertiefung Rhythmus

```js
{ id: 'raster', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
  set: { bpm: 90 }, beat: { clap: [] }, trackOn: { snare: false, bass: false },
  focus: ['track:clap'], mark: { clap: { to: [14, 5] } },
  checks: [(s) => hitAt(s, 'clap', 14), (s) => hitAt(s, 'clap', 5)],
  solution: [(s) => { s.beat.clap[14] = 1; }, (s) => { s.beat.clap[5] = 1; }] },

{ id: 'halftime', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
  set: { bpm: 140 }, trackOn: { bass: false },
  focus: ['track:kick', 'track:snare'], mark: { snare: { from: [4, 12], to: [8] }, kick: { from: [8] } },
  checks: [(s) => sameSteps(stepsOn(s, 'snare'), [8]) && !hitAt(s, 'kick', 8)],
  solution: [(s) => { s.beat.snare = { 8: 1 }; delete s.beat.kick[8]; }] },

{ id: 'swing', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Swing Soul',
  set: { bpm: 96, swing: 0 },
  focus: ['swing'],
  checks: [(s) => s.swing >= .6],
  solution: [(s) => { s.swing = .67; }] },

{ id: 'houseHipHop', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'House Bounce',
  set: { bpm: 124 }, trackOn: { bass: false },
  focus: ['bpm', 'track:kick', 'track:hat', 'track:open'],
  checks: [(s) => s.bpm >= 85 && s.bpm <= 95,
           (s) => sameSteps(stepsOn(s, 'kick'), [0, 10]),
           (s) => sameSteps(stepsOn(s, 'hat'), [0, 2, 4, 6, 8, 10, 12, 14]),
           (s) => stepsOn(s, 'open').length === 0],
  solution: [(s) => { s.bpm = 90; s.eighths = 180; },
             (s) => { s.beat.kick = { 0: 1, 10: 1 }; },
             (s) => { s.beat.hat = { 0: 1, 2: 1, 4: 1, 6: 1, 8: 1, 10: 1, 12: 1, 14: 1 }; },
             (s) => { s.beat.open = {}; }] },

{ id: 'tresillo', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
  set: { bpm: 100 }, beat: { kick: [], snare: [] }, trackOn: { bass: false },
  focus: ['track:kick'], mark: { kick: { to: [0, 3, 6, 8, 11, 14] } },
  checks: [(s) => sameSteps(stepsOn(s, 'kick').filter((x) => x < 8), [0, 3, 6]),
           (s) => sameSteps(stepsOn(s, 'kick'), [0, 3, 6, 8, 11, 14])],
  solution: [(s) => { s.beat.kick = { 0: 1, 3: 1, 6: 1 }; },
             (s) => { Object.assign(s.beat.kick, { 8: 1, 11: 1, 14: 1 }); }] },

{ id: 'ghost', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Backbeat Open',
  set: { bpm: 92 }, trackOn: { bass: false },
  focus: ['track:snare'], mark: { snare: { to: [7, 14] } },
  checks: [(s) => s.beat.snare[7] !== undefined && s.beat.snare[7] < .6,
           (s) => s.beat.snare[14] !== undefined && s.beat.snare[14] < .6],
  solution: [(s) => { s.beat.snare[7] = .45; }, (s) => { s.beat.snare[14] = .45; }] },

{ id: 'dreiSechs', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Waltz Step',
  set: { bpm: 60 },
  focus: ['picker:beat'],
  checks: [(s) => DRUM_PATTERNS[s.patternIndex].meter === '6/8'],
  solution: [(s) => { s.patternIndex = patternIndexByName('6/8 Ballad'); s.beat = beatFromPattern(DRUM_PATTERNS[s.patternIndex]); }] },
```

Achtung `swing`: Nur Loops mit `swingUnit: 8` swingen die Achteln; bei den
übrigen verschiebt der Regler nur Sechzehntel. Deshalb `Swing Soul`. Die
Solution der Einheit `dreiSechs` muss `eighths` so setzen, wie es der Picker
beim Loopwechsel tut (`_convertTempo`); das Tempo muss danach
`sanitizeState` unverändert bestehen.

**Texte (DE)**

```js
'lab.lesson.raster.title': 'Das Raster: 1 e + e',
'lab.lesson.raster.do': 'Jeder Schlag hat vier Felder, gezählt „1 e + e, 2 e + e …“. Setz einen Clap auf „4 +“ (Feld 15), dann einen auf „2 e“ (Feld 6).',
'lab.lesson.raster.check1': 'Clap auf „4 +“',
'lab.lesson.raster.check2': 'Clap auf „2 e“',
'lab.lesson.raster.aha': 'Wer die Sechzehntel zählen kann, findet jede Stelle im Takt, beim Bauen wie beim Singen.',
'lab.lesson.raster.why': 'Ein 4/4-Takt hat vier Viertel, jedes Viertel zwei Achtel („1 +“) oder vier Sechzehntel („1 e + e“). Das Raster im Groove Lab zeigt genau diese 16 Sechzehntel.',

'lab.lesson.halftime.title': 'Halftime',
'lab.lesson.halftime.do': 'Leg die Snare von 2 und 4 auf die 3 (Feld 9) und nimm die Kick von der 3 weg.',
'lab.lesson.halftime.check1': 'Snare nur auf der 3',
'lab.lesson.halftime.aha': 'Das Tempo hat sich nicht verändert, aber der Groove fühlt sich halb so schnell an. So klingen Trap, Dubstep und viele Balladen-Refrains.',
'lab.lesson.halftime.why': 'Wie schnell wir Musik empfinden, hängt vor allem am Backbeat. Kommt die Snare nur einmal pro Takt, zählt das Ohr in halben Noten.',

'lab.lesson.swing.title': 'Swing',
'lab.lesson.swing.do': 'Zieh den Swing-Regler langsam auf etwa 67 %. Sprich dabei „du-ba du-ba“ mit.',
'lab.lesson.swing.check1': 'Swing auf etwa 67 %',
'lab.lesson.swing.aha': 'Die zweite Achtel jedes Schlags kommt später: Aus „ta-ta“ wird „ta—ta“, lang und kurz. Bei 67 % liegt sie genau auf der dritten Triolen-Achtel.',
'lab.lesson.swing.why': 'Im Swing teilt man den Schlag gefühlt in drei statt zwei: Die erste Achtel dauert zwei Drittel, die zweite ein Drittel. Jazz, Blues, Gospel und Shuffle leben davon. Wie viel Swing „richtig“ ist, hängt vom Stil und vom Tempo ab.',

'lab.lesson.houseHipHop.title': 'Aus House wird Hip-Hop',
'lab.lesson.houseHipHop.do': 'Mach in vier Schritten aus einem House-Beat einen Boom-Bap-Beat.',
'lab.lesson.houseHipHop.check1': 'Tempo auf etwa 90',
'lab.lesson.houseHipHop.check2': 'Kick nur auf Feld 1 und 11',
'lab.lesson.houseHipHop.check3': 'Hi-Hat auf alle Achtel',
'lab.lesson.houseHipHop.check4': 'Offene Hi-Hat weg',
'lab.lesson.houseHipHop.aha': 'House lebt von der gleichmäßigen Kick auf jedem Schlag und dem Offbeat, gebaut zum Tanzen. Boom Bap ist langsamer und lässt Lücken in der Kick, die Platz für Rap lassen.',
'lab.lesson.houseHipHop.why': 'Genres unterscheiden sich weniger durch einzelne Klänge als durch Tempo und die Verteilung der Schläge. Snare bzw. Clap auf 2 und 4 haben beide, der Unterschied steckt in der Kick und in der Hi-Hat.',

'lab.lesson.tresillo.title': 'Tresillo: 3 + 3 + 2',
'lab.lesson.tresillo.do': 'Teil acht Sechzehntel in 3 + 3 + 2: Kick auf Feld 1, 4 und 7. Dann dasselbe noch einmal ab Feld 9 (9, 12, 15).',
'lab.lesson.tresillo.check1': 'Erste Hälfte: 1, 4, 7',
'lab.lesson.tresillo.check2': 'Zweite Hälfte: 9, 12, 15',
'lab.lesson.tresillo.aha': 'Der Tresillo stammt aus afrikanischen und kubanischen Rhythmen und steckt heute in Reggaeton, Afrobeats und unzähligen Pop-Hits.',
'lab.lesson.tresillo.why': 'Statt 2 + 2 + 2 + 2 entsteht mit 3 + 3 + 2 ein ungleichmäßiges, vorwärtsdrängendes Muster über gleichmäßigem Puls. Vergleiche mit dem Loop „Latin Skip“: Seine Kick spielt genau dieses Muster.',

'lab.lesson.ghost.title': 'Ghost Notes',
'lab.lesson.ghost.do': 'Tipp zweimal auf ein Snare-Feld: Beim zweiten Mal wird der Schlag leise. Setz solche Ghost Notes auf Feld 8 und 15.',
'lab.lesson.ghost.check1': 'Ghost Note auf Feld 8',
'lab.lesson.ghost.check2': 'Ghost Note auf Feld 15',
'lab.lesson.ghost.aha': 'Ghost Notes hört man kaum bewusst, aber sie füllen den Groove. Funk und Soul sind voll davon.',
'lab.lesson.ghost.why': 'Rhythmus besteht nicht nur aus „wann“, sondern auch aus „wie laut“. Leise Zwischenschläge verbinden die lauten und machen einen Beat lebendig.',

'lab.lesson.dreiSechs.title': '3/4 oder 6/8?',
'lab.lesson.dreiSechs.do': 'Ein Walzer läuft. Wähl einen Loop im 6/8-Takt und vergleiche.',
'lab.lesson.dreiSechs.check1': '6/8-Loop gewählt',
'lab.lesson.dreiSechs.aha': 'Beide Takte haben sechs Achtel. Im 3/4 zählst du drei Viertel, im 6/8 zwei Gruppen zu je drei Achteln.',
'lab.lesson.dreiSechs.why': 'Wechselt Musik zwischen beiden Gruppierungen, heißt das Hemiole. Man hört sie oft an Barock-Schlüssen und im Song „America“ aus der West Side Story.',
```

**Prüfungen Paket 3:** allgemeine Prüfungen; zusätzlich: `tresillo`-Ziel
entspricht genau der Kick von `Latin Skip` (verhindert, dass der Text lügt).

---

### Paket 4 – Vertiefung Harmonie

```js
{ id: 'leitton', tier: 'deep', area: 'harmony', tab: 'keys', groove: null,
  set: { bpm: 60, progId: 'drone', modeId: 'major', droneOn: true, droneFifth: true, keysLayout: 'scale' },
  focus: ['pads'],
  checks: [(s, ctx) => hasRun(lastPlayed(ctx, 8), [6, 0])],
  solution: [(s, ctx) => { ctx.played.push({ deg: 6 }, { deg: 0 }); }] },

{ id: 'dreiklang', tier: 'deep', area: 'harmony', tab: 'harmony', groove: null,
  set: { bpm: 60, progId: 'drone', modeId: 'major', chordsOn: true },
  focus: ['satb'],
  checks: [(s) => CHOIR_PARTS.filter((v) => s.satb[v] === 'mute').length === 2],
  solution: [(s) => { s.satb.A = 'mute'; s.satb.T = 'mute'; }] },

{ id: 'halbschluss', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
  set: { bpm: 84, progId: 'cadence', modeId: 'major', chordsOn: true },
  focus: ['progEditor'],
  checks: [(s) => progDegreesOf(s).at(-1) === 4],
  solution: [(s) => { s.progDegrees = [0, 3, 4, 4]; s.progDominant = true; }] },

{ id: 'popSad', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
  set: { bpm: 90, progId: 'pop', modeId: 'major', chordsOn: true },
  focus: ['picker:prog'],
  checks: [(s) => s.progId === 'sad' && !s.progDegrees],
  solution: [(s) => { s.progId = 'sad'; }] },

{ id: 'harmRhythmus', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
  set: { bpm: 100, progId: 'pop', chordsOn: true },
  focus: ['chordBars'],
  checks: [(s) => s.chordBars === 2],
  solution: [(s) => { s.chordBars = 2; }] },

{ id: 'bluesSept', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Gospel Shuffle',
  set: { bpm: 92, progId: 'blues', chordsOn: true },
  focus: ['progSevenths'],
  checks: [(s) => !progSeventhsOf(s), (s) => progSeventhsOf(s)],
  solution: [(s) => { s.progDegrees = [...progOf(s).degrees]; s.progSevenths = false; s.progDominant = true; s.progDom7 = true; },
             (s) => { s.progSevenths = true; }] },

{ id: 'modi', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
  set: { bpm: 96, progId: 'modal', modeId: 'minor', chordsOn: true },
  focus: ['mode'],
  checks: [(s) => s.modeId === 'dorian', (s) => s.modeId === 'mixolydian'],
  solution: [(s) => { s.modeId = 'dorian'; }, (s) => { s.modeId = 'mixolydian'; }] },

{ id: 'stimmfuehrung', tier: 'deep', area: 'harmony', tab: 'harmony', groove: null,
  set: { bpm: 66, progId: 'cadence', modeId: 'major', chordsOn: true, chordBars: 2 },
  focus: ['satb'],
  checks: [(s) => CHOIR_PARTS.some((v) => s.satb[v] === 'focus')],
  solution: [(s) => { s.satb.A = 'focus'; }] },
```

Die `solution` von `halbschluss` und `bluesSept` so anpassen, dass sie
exakt dem entspricht, was `_progBegin`/`_progCommit` beim Bearbeiten im
Editor erzeugen (insbesondere `progDominant`, `progDom7`). Maßgeblich ist
das Verhalten der App, nicht diese Skizze.

**Texte (DE)**

```js
'lab.lesson.leitton.title': 'Der Zug nach Hause',
'lab.lesson.leitton.do': 'Ein Liegeton klingt, der Grundton. Spiel die Tonleiter auf den Pads und bleib am Ende auf ti stehen. Spür, wohin es zieht, und spiel dann do.',
'lab.lesson.leitton.check1': 'ti → do gespielt',
'lab.lesson.leitton.aha': 'Ti liegt nur einen Halbton unter dem Grundton und will unbedingt dorthin: der Leitton.',
'lab.lesson.leitton.why': 'Jeder Ton der Tonleiter hat eine eigene Spannung zum Grundton. Manche ruhen (do, mi, so), andere ziehen (ti nach oben, fa nach unten zu mi). Diese Kräfte sind die Grundlage aller Harmonik.',

'lab.lesson.dreiklang.title': 'Einen Akkord auseinandernehmen',
'lab.lesson.dreiklang.do': 'Ein vierstimmiger Akkord klingt. Schalte zwei Stimmen stumm und hör, was übrig bleibt. Probier verschiedene Paare.',
'lab.lesson.dreiklang.check1': 'Zwei Stimmen stumm',
'lab.lesson.dreiklang.aha': 'Grundton und Quinte allein klingen leer, erst die Terz entscheidet über Dur oder Moll.',
'lab.lesson.dreiklang.why': 'Ein Dreiklang hat drei Töne, ein Chor vier Stimmen. Deshalb wird meist ein Ton verdoppelt, am liebsten der Grundton. Die Terz verdoppelt man selten, denn sie ist der „farbigste“ Ton.',

'lab.lesson.halbschluss.title': 'Frage und Antwort',
'lab.lesson.halbschluss.do': 'Die Folge I–IV–V–I endet zu Hause. Ändere im Editor den letzten Akkord in V.',
'lab.lesson.halbschluss.check1': 'Letzter Akkord: V',
'lab.lesson.halbschluss.aha': 'Jetzt endet die Folge auf der Dominante, wie eine Frage ohne Antwort. Das nennt man Halbschluss.',
'lab.lesson.halbschluss.why': 'Die Dominante (V) enthält den Leitton und drängt zurück zur Tonika (I). Der Schritt V → I heißt Ganzschluss und wirkt wie ein Punkt, das Ende auf V wie ein Komma oder Fragezeichen.',

'lab.lesson.popSad.title': 'Vier Akkorde, zwei Gefühle',
'lab.lesson.popSad.do': 'Die Pop-Folge I–V–vi–IV läuft. Wähl die Folge „vi–IV–I–V“.',
'lab.lesson.popSad.check1': 'Folge ab vi gewählt',
'lab.lesson.popSad.aha': 'Es sind dieselben vier Akkorde, nur beginnt die Folge auf dem Moll-Akkord. Schon klingt alles melancholischer.',
'lab.lesson.popSad.why': 'C-Dur und a-Moll haben dieselben Töne, man nennt sie Paralleltonarten. Womit eine Folge beginnt und endet, entscheidet, welcher Akkord sich wie „zu Hause“ anfühlt.',

'lab.lesson.harmRhythmus.title': 'Wie oft wechseln die Akkorde?',
'lab.lesson.harmRhythmus.do': 'Stell „Takte pro Akkord“ auf 2.',
'lab.lesson.harmRhythmus.check1': 'Zwei Takte pro Akkord',
'lab.lesson.harmRhythmus.aha': 'Das Tempo ist gleich geblieben, aber alles wirkt ruhiger und weiter.',
'lab.lesson.harmRhythmus.why': 'Wie oft die Harmonie wechselt, nennt man harmonischen Rhythmus. Hymnen und Balladen wechseln oft langsam, Jazz und Gospel oft schnell, manchmal zweimal pro Takt.',

'lab.lesson.bluesSept.title': 'Blues und die Septime',
'lab.lesson.bluesSept.do': 'Ein 12-taktiger Blues läuft mit Septakkorden. Schalte die Septimen aus und wieder ein.',
'lab.lesson.bluesSept.check1': 'Septimen aus',
'lab.lesson.bluesSept.check2': 'Septimen wieder an',
'lab.lesson.bluesSept.aha': 'Mit der kleinen Septime klingt jeder Akkord nach Aufbruch, sogar der Grundakkord. Deshalb wirkt Blues nie ganz „fertig“.',
'lab.lesson.bluesSept.why': 'Ein Dur-Dreiklang mit kleiner Septime ist ein Dominantseptakkord. Klassisch steht er nur auf der V, im Blues auf I, IV und V. Das Schema: vier Takte I, zwei Takte IV, zwei Takte I, dann V, IV, I, I.',

'lab.lesson.modi.title': 'Kirchentonarten',
'lab.lesson.modi.do': 'Die Folge läuft in Moll. Stell den Modus auf Dorisch und danach auf Mixolydisch.',
'lab.lesson.modi.check1': 'Dorisch',
'lab.lesson.modi.check2': 'Mixolydisch',
'lab.lesson.modi.aha': 'Dorisch ist Moll mit großer Sexte, hell-melancholisch wie „Scarborough Fair“. Mixolydisch ist Dur mit kleiner Septime, typisch für Rock und Folk.',
'lab.lesson.modi.why': 'Modi sind Tonleitern mit derselben Tonfolge wie Dur, aber einem anderen Grundton. Jeder hat einen charakteristischen Ton, der ihn von Dur oder Moll unterscheidet.',

'lab.lesson.stimmfuehrung.title': 'Stimmführung',
'lab.lesson.stimmfuehrung.do': 'Eine Kadenz klingt vierstimmig. Heb eine Stimme hervor und verfolge sie durch alle Akkorde, am besten deine eigene.',
'lab.lesson.stimmfuehrung.check1': 'Eine Stimme hervorgehoben',
'lab.lesson.stimmfuehrung.aha': 'Die Stimme bewegt sich kaum. Gute Stimmführung nimmt den kürzesten Weg, gemeinsame Töne bleiben liegen.',
'lab.lesson.stimmfuehrung.why': 'Im Chorsatz soll jede Stimme für sich singbar sein: kleine Schritte, gemeinsame Töne halten, keine parallelen Quinten und Oktaven zwischen zwei Stimmen. In der Chor-Ansicht kannst du deine Stimme direkt mitsingen.',
```

**Prüfungen Paket 4:** allgemeine Prüfungen; zusätzlich: in `durMoll`
(Paket 2) und `dreiklang` besteht der Akkord wirklich aus Grundton, Terz,
Quinte (`chordPitchClasses`); in `modi` ist die Folge in beiden Zielmodi
erlaubt (`progFitsMode`).

---

### Paket 5 – Vertiefung Melodie

```js
{ id: 'stufen', tier: 'deep', area: 'melody', tab: 'keys', groove: 'Minimal Click',
  set: { bpm: 80, progId: 'drone', modeId: 'major', chordsOn: true, keysLayout: 'scale' },
  focus: ['pads'],
  checks: [(s, ctx) => hasRun(lastPlayed(ctx, 10), [0, 1, 2, 3, 4])],
  solution: [(s, ctx) => { [0, 1, 2, 3, 4].forEach((deg) => ctx.played.push({ deg })); }] },

{ id: 'reibung', tier: 'deep', area: 'melody', tab: 'melody', groove: 'Minimal Click', melody: 'Long Tones',
  set: { bpm: 76, progId: 'drone', modeId: 'major', chordsOn: true },
  focus: ['melEditor'],
  checks: [(s) => melodyBarsOf(s)[0].some(([at, deg]) => at === 0 && deg === 3)],
  solution: [(s) => { s.melodyBars = melodyBarsOf(s).map((bar) => bar.map((n) => [...n]));
                      s.melodyBars[0][0][1] = 3; s.melodyMeter = '4/4'; }] },

{ id: 'pentatonik', tier: 'deep', area: 'melody', tab: 'keys', groove: 'Backbeat Open',
  set: { bpm: 92, progId: 'pop', modeId: 'major', chordsOn: true, keysLayout: 'scale' },
  focus: ['pads'],
  checks: [(s, ctx) => ctx.played.length >= 8 && lastPlayed(ctx, 8).every((d) => [0, 1, 2, 4, 5].includes(d))],
  solution: [(s, ctx) => { [0, 2, 4, 5, 4, 2, 1, 0].forEach((deg) => ctx.played.push({ deg })); }] },

{ id: 'antizipation', tier: 'deep', area: 'melody', tab: 'melody', groove: 'Backbeat Open', melody: 'Long Tones',
  set: { bpm: 88, progId: 'drone', modeId: 'major', chordsOn: true },
  focus: ['melEditor'],
  checks: [(s) => { const bar = melodyBarsOf(s)[0]; return bar.some(([at, deg]) => at === 6 && deg === 2) && !bar.some(([at]) => at === 8); }],
  solution: [(s) => { s.melodyBars = melodyBarsOf(s).map((bar) => bar.map((n) => [...n]));
                      s.melodyBars[0][1][0] = 6; s.melodyMeter = '4/4'; }] },

{ id: 'echo', tier: 'deep', area: 'melody', tab: 'melody', groove: 'Minimal Click', melody: 'Call & Response',
  set: { bpm: 84, progId: 'cadence', chordsOn: true },
  focus: ['melodyAltBars'],
  checks: [(s) => s.melodyAltBars],
  solution: [(s) => { s.melodyAltBars = true; }] },

{ id: 'arpeggio', tier: 'deep', area: 'melody', tab: 'keys', groove: 'Pulse Basic',
  set: { bpm: 110, progId: 'pop', chordsOn: false },
  focus: ['arp'],
  checks: [(s) => s.arpOn && s.arpAuto, (s) => s.arpDivision === 1, (s) => s.arpMode === 'down'],
  solution: [(s) => { s.arpOn = true; s.arpAuto = true; }, (s) => { s.arpDivision = 1; }, (s) => { s.arpMode = 'down'; }] },
```

Vor dem Schreiben der Texte zu `reibung` und `antizipation` prüfen, dass
`MELODIES['Long Tones'].bars[0]` weiterhin `[[0, 4, 8], [8, 2, 8]]` ist.
`solution` wieder an das anpassen, was `_melPlace`/`_melCommit` im Editor
erzeugen (`melodyMeter`, `melodyRef`, Sortierung).

**Texte (DE)**

```js
'lab.lesson.stufen.title': 'Do, re, mi',
'lab.lesson.stufen.do': 'Spiel auf den Pads do–re–mi–fa–so aufwärts. Sing mit, wenn du magst.',
'lab.lesson.stufen.check1': 'do bis so gespielt',
'lab.lesson.stufen.aha': 'Do ist immer der Grundton, egal in welcher Tonart. Wer in Stufen denkt, kann jede Melodie in jede Tonart mitnehmen.',
'lab.lesson.stufen.why': 'Die Silben benennen nicht feste Töne, sondern Positionen in der Tonleiter (relatives Do). Deshalb klingt „do–mi–so“ in jeder Tonart gleich.',

'lab.lesson.reibung.title': 'Reibung und Auflösung',
'lab.lesson.reibung.do': 'Die Melodie beginnt auf so. Verschieb im Editor den ersten Ton (Feld 1) eine Stufe nach unten auf fa.',
'lab.lesson.reibung.check1': 'Erster Ton: fa',
'lab.lesson.reibung.aha': 'Fa reibt am Akkord, denn die Terz mi liegt nur einen Halbton darunter. Der Ton will zurück auf mi: ein Vorhalt.',
'lab.lesson.reibung.why': 'Auf einer betonten Zeit wirkt Reibung als Ausdruck, auf einer unbetonten fällt sie kaum auf und klingt wie ein Durchgang. Komponist:innen setzen Vorhalte gezielt ein, um Spannung aufzubauen.',

'lab.lesson.pentatonik.title': 'Pentatonik',
'lab.lesson.pentatonik.do': 'Improvisier zur Musik, aber lass fa und ti weg. Nur do, re, mi, so, la. Spiel mindestens acht Töne.',
'lab.lesson.pentatonik.check1': 'Acht Töne ohne fa und ti',
'lab.lesson.pentatonik.aha': 'Ohne fa und ti gibt es keine Halbtonschritte, nichts reibt scharf. Deshalb passt Pentatonik fast immer.',
'lab.lesson.pentatonik.why': 'Die Pentatonik (fünf Töne) ist weltweit verbreitet: in Volksliedern, im Blues, im Gospel, in ostasiatischer Musik. Sie ist der schnellste Weg zur eigenen Improvisation.',

'lab.lesson.antizipation.title': 'Vorwegnehmen',
'lab.lesson.antizipation.do': 'Der zweite Ton kommt auf der 3 (Feld 9). Zieh ihn eine Achtel nach vorn auf „2 +“ (Feld 7).',
'lab.lesson.antizipation.check1': 'Ton auf „2 +“',
'lab.lesson.antizipation.aha': 'Die Melodie nimmt den Schlag vorweg und drängt nach vorn. Pop-Melodien machen das ständig.',
'lab.lesson.antizipation.why': 'Eine Antizipation ist eine Synkope in der Melodie: Der Ton kommt vor seiner Zeit. Singt man solche Stellen „gerade“, verliert der Song seinen Schwung.',

'lab.lesson.echo.title': 'Ruf und Antwort',
'lab.lesson.echo.do': 'Schalte „Melodie nur jeden zweiten Takt“ ein und sing in der Lücke nach, was du gehört hast.',
'lab.lesson.echo.check1': 'Lücken eingeschaltet',
'lab.lesson.echo.aha': 'Vorsingen und Antworten, Call and Response, ist eine der ältesten Formen gemeinsamen Musizierens.',
'lab.lesson.echo.why': 'Call and Response kommt aus afrikanischen Traditionen und prägt Gospel, Blues, Soul und Arbeitslieder. Ein Motiv wird wiederholt oder beantwortet, so entsteht Form aus wenig Material.',

'lab.lesson.arpeggio.title': 'Der Arpeggiator',
'lab.lesson.arpeggio.do': 'Schalte den Arp mit „automatisch“ ein. Stell danach den Notenwert auf 1/16 und die Richtung auf abwärts.',
'lab.lesson.arpeggio.check1': 'Arp automatisch an',
'lab.lesson.arpeggio.check2': 'Sechzehntel',
'lab.lesson.arpeggio.check3': 'Abwärts',
'lab.lesson.arpeggio.aha': 'Die Akkordtöne erklingen nacheinander statt gleichzeitig. Aus der Harmonie wird eine Melodie.',
'lab.lesson.arpeggio.why': 'Arpeggio kommt von „arpa“, Harfe. Gebrochene Akkorde gibt es von Bachs Präludien bis zu Synth-Pop. Ein Arpeggiator macht das automatisch im Tempo.',
```

---

### Paket 6 – Vertiefung Klang (mit Kick-Parametern)

#### 6a Engine-Erweiterung `kit`

- `defaultState()`: `kit: { kickStart: 150, kickEnd: 42, kickDecay: .19 }`.
- `sanitizeState`: je Feld `num(…)` mit Bereichen `kickStart [60, 300]`,
  `kickEnd [25, 200]`, `kickDecay [.08, 1.2]`; fehlend = Standard.
- `playKick(time, velocity = 1, kit = KIT_DEFAULTS)`:
  Frequenz `kickStart → kickEnd` exponentiell über
  `min(.11, kickDecay * .6)`, Lautstärke über `kickDecay` auf `.0001`,
  `osc.stop(time + kickDecay + .01)`. **Mit Standardwerten muss exakt der
  bisherige Klang herauskommen** (Test: aufgerufene AudioParam-Zeitpunkte
  und -Werte vergleichen, z. B. mit Mock-Kontext).
- `hitTrack` und `_preview` reichen `this.state.kit` durch.
- Studio → Beat: unter der Spurliste eine einklappbare Zeile „Kick-Klang“
  mit drei Reglern und „Zurücksetzen“ (damit eine im Workshop geänderte
  Kick im Studio nie unsichtbar anders klingt). Fokus-Schlüssel `kit`
  zeigt auf diese Zeile.

#### 6b Einheiten

```js
{ id: 'wellen', tier: 'deep', area: 'sound', tab: 'sound', groove: null, melody: 'Long Tones',
  preset: 'Tape Keys', sound: { wave: 'sine', cutoff: 12000, filterEnvAmount: 0 },
  set: { bpm: 80, progId: 'drone' },
  focus: ['wave'],
  checks: [(s) => s.sound.wave === 'triangle', (s) => s.sound.wave === 'square', (s) => s.sound.wave === 'sawtooth'],
  solution: [(s) => { s.sound.wave = 'triangle'; }, (s) => { s.sound.wave = 'square'; }, (s) => { s.sound.wave = 'sawtooth'; }] },

{ id: 'filter', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
  preset: 'Bright Saw', sound: { cutoff: 12000, filterEnvAmount: 0 },
  set: { bpm: 84, progId: 'pop' },
  focus: ['sound:cutoff'],
  checks: [(s) => s.sound.cutoff <= 600],
  solution: [(s) => { s.sound.cutoff = 500; }] },

{ id: 'resonanz', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
  preset: 'Bright Saw', sound: { cutoff: 800, resonance: 1, filterEnvAmount: 0 },
  set: { bpm: 84, progId: 'drone' },
  focus: ['sound:resonance', 'sound:cutoff'],
  checks: [(s) => s.sound.resonance >= 12, (s) => s.sound.cutoff >= 3000],
  solution: [(s) => { s.sound.resonance = 14; }, (s) => { s.sound.cutoff = 3500; }] },

{ id: 'huellkurve', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
  preset: 'Neon Pluck', set: { bpm: 80, progId: 'pop' },
  focus: ['sound:attack', 'sound:sustain', 'sound:release'],
  checks: [(s) => s.sound.attack >= .3, (s) => s.sound.sustain >= .6, (s) => s.sound.release >= 1],
  solution: [(s) => { s.sound.attack = .4; }, (s) => { s.sound.sustain = .7; }, (s) => { s.sound.release = 1.2; }] },

{ id: 'detune', tier: 'deep', area: 'sound', tab: 'sound', groove: null, melody: 'Long Tones',
  preset: 'Tape Keys', sound: { detune: 0, width: 0 },
  set: { bpm: 72, progId: 'drone' },
  focus: ['sound:detune', 'sound:width'],
  checks: [(s) => s.sound.detune >= 8 && s.sound.detune <= 14,
           (s) => s.sound.detune >= 25,
           (s) => s.sound.detune >= 6 && s.sound.detune <= 15 && s.sound.width >= .5],
  solution: [(s) => { s.sound.detune = 10; }, (s) => { s.sound.detune = 28; }, (s) => { s.sound.detune = 10; s.sound.width = .6; }] },

{ id: 'lfo', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Half-Time Drop', melody: 'Long Tones',
  preset: 'Wobble', sound: { lfoDepth: 0, lfoSync: 0, lfoRate: 0 },
  set: { bpm: 140, progId: 'drone', modeId: 'minor' },
  focus: ['sound:lfoDepth', 'sound:lfoSync'],
  checks: [(s) => s.sound.lfoDepth >= 1000, (s) => s.sound.lfoSync === 2, (s) => s.sound.lfoSync === 1],
  solution: [(s) => { s.sound.lfoDepth = 1500; }, (s) => { s.sound.lfoSync = 2; }, (s) => { s.sound.lfoSync = 1; }] },

{ id: 'vibrato', tier: 'deep', area: 'sound', tab: 'sound', groove: null, melody: 'Long Tones',
  preset: 'Soft Brass', sound: { vibratoDepth: 0, vibratoDelay: 0 },
  set: { bpm: 66, progId: 'drone' },
  focus: ['sound:vibratoDepth', 'sound:vibratoDelay'],
  checks: [(s) => s.sound.vibratoDepth >= 10, (s) => s.sound.vibratoDelay >= .4],
  solution: [(s) => { s.sound.vibratoDepth = 12; }, (s) => { s.sound.vibratoDelay = .5; }] },

{ id: 'kick', tier: 'deep', area: 'sound', tab: 'beat', groove: 'Pulse Basic',
  set: { bpm: 90 }, trackOn: { snare: false, clap: false, hat: false, open: false, bass: false },
  focus: ['kit'],
  checks: [(s) => s.kit.kickEnd >= 140, (s) => s.kit.kickEnd <= 50 && s.kit.kickDecay >= .6],
  solution: [(s) => { s.kit.kickEnd = 150; }, (s) => { s.kit.kickEnd = 40; s.kit.kickDecay = .8; }] },

{ id: 'glide', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
  preset: 'Analog Lead', sound: { glide: 0 },
  set: { bpm: 80, progId: 'pop' },
  focus: ['sound:glide'],
  checks: [(s) => s.sound.glide >= .25],
  solution: [(s) => { s.sound.glide = .3; }] },
```

**Texte (DE)**

```js
'lab.lesson.wellen.title': 'Vier Wellenformen',
'lab.lesson.wellen.do': 'Hör dir alle vier Wellenformen nacheinander an: Dreieck, Rechteck, Sägezahn.',
'lab.lesson.wellen.check1': 'Dreieck',
'lab.lesson.wellen.check2': 'Rechteck',
'lab.lesson.wellen.check3': 'Sägezahn',
'lab.lesson.wellen.aha': 'Sinus: rein, ohne Obertöne. Dreieck: sanft. Rechteck: hohl, fast wie eine Klarinette. Sägezahn: hell und scharf wie Streicher oder Blech.',
'lab.lesson.wellen.why': 'Die Form der Schwingung bestimmt, welche Obertöne mitklingen. Rechteck und Dreieck enthalten nur ungerade Obertöne (3., 5., 7. …), der Sägezahn alle. Mehr Obertöne heißt hellerer Klang.',

'lab.lesson.filter.title': 'Der Filter',
'lab.lesson.filter.do': 'Ein heller Sägezahn spielt. Dreh den Cutoff langsam herunter, bis der Klang weich und dumpf wird.',
'lab.lesson.filter.check1': 'Cutoff unter 600 Hz',
'lab.lesson.filter.aha': 'Der Sägezahn ist der Marmorblock, der Filter der Meißel. Alles über der Filterkante wird leiser.',
'lab.lesson.filter.why': 'Ein Tiefpass lässt tiefe Frequenzen durch und dämpft hohe. Der Cutoff ist die Grenze. Beim Singen formst du Vokale ähnlich: Mund und Rachen verstärken manche Obertöne und dämpfen andere.',

'lab.lesson.resonanz.title': 'Resonanz',
'lab.lesson.resonanz.do': 'Dreh die Resonanz hoch und fahr dann mit dem Cutoff langsam nach oben.',
'lab.lesson.resonanz.check1': 'Resonanz hoch',
'lab.lesson.resonanz.check2': 'Cutoff nach oben gefahren',
'lab.lesson.resonanz.aha': 'Du hörst einzelne Obertöne „singen“, während die Kante durch sie hindurchwandert: der typische Wah- und Acid-Klang.',
'lab.lesson.resonanz.why': 'Resonanz hebt die Frequenzen direkt an der Filterkante an. Je höher sie ist, desto schmaler und lauter wird diese Spitze, bis der Filter fast selbst pfeift.',

'lab.lesson.huellkurve.title': 'Hüllkurve: Zupfen oder Streichen',
'lab.lesson.huellkurve.do': 'Ein kurzer Zupfklang spielt. Mach daraus eine weiche Fläche: Attack länger, Sustain höher, Release länger.',
'lab.lesson.huellkurve.check1': 'Attack länger',
'lab.lesson.huellkurve.check2': 'Sustain höher',
'lab.lesson.huellkurve.check3': 'Release länger',
'lab.lesson.huellkurve.aha': 'Gleiche Wellenform, gleicher Filter, und trotzdem ein ganz anderes Instrument. Die Hüllkurve bestimmt, wie ein Ton über die Zeit verläuft.',
'lab.lesson.huellkurve.why': 'ADSR steht für Attack (Einschwingen), Decay (Abfallen), Sustain (Halten), Release (Ausklingen nach dem Loslassen). Klavier und Gitarre sind sofort da und klingen ab, Streicher, Chor und Orgel schwellen an und halten.',

'lab.lesson.detune.title': 'Detune: warum ein Chor breiter klingt',
'lab.lesson.detune.do': 'Dreh Detune auf etwa 10 Cent und hör das Schweben. Dann übertreib auf über 25 Cent. Geh zurück auf etwa 10 und dreh Width auf.',
'lab.lesson.detune.check1': 'Etwa 10 Cent',
'lab.lesson.detune.check2': 'Über 25 Cent',
'lab.lesson.detune.check3': 'Zurück auf etwa 10, Width auf',
'lab.lesson.detune.aha': 'Genau das passiert, wenn ein Chor unisono singt: Keine zwei Stimmen sind exakt gleich hoch. Kleine Abweichungen machen den Klang breit und lebendig, große klingen unsauber.',
'lab.lesson.detune.why': 'Detune fügt zwei Kopien des Tons hinzu, eine etwas höher, eine etwas tiefer (100 Cent = ein Halbton). Zwei fast gleiche Töne überlagern sich zu einer Schwebung: Bei a′ (440 Hz) ergeben 10 Cent etwa 2,5 Schwebungen pro Sekunde. Width verteilt die Kopien nach links und rechts.',

'lab.lesson.lfo.title': 'Der LFO',
'lab.lesson.lfo.do': 'Dreh die LFO-Tiefe auf, stell Sync auf 1/8 und danach auf 1/16.',
'lab.lesson.lfo.check1': 'Tiefe auf',
'lab.lesson.lfo.check2': 'Sync 1/8',
'lab.lesson.lfo.check3': 'Sync 1/16',
'lab.lesson.lfo.aha': 'Der Filter öffnet und schließt sich im Takt der Musik: der „Wobble“ aus dem Dubstep.',
'lab.lesson.lfo.why': 'LFO heißt „Low Frequency Oscillator“: eine unhörbar langsame Schwingung, die einen Regler automatisch hin- und herbewegt, hier den Filter. Im Tempo synchronisiert wird die Bewegung zum Rhythmus.',

'lab.lesson.vibrato.title': 'Vibrato',
'lab.lesson.vibrato.do': 'Dreh die Vibrato-Tiefe auf. Stell dann „Einsatz“ auf etwa eine halbe Sekunde.',
'lab.lesson.vibrato.check1': 'Vibrato an',
'lab.lesson.vibrato.check2': 'Vibrato setzt später ein',
'lab.lesson.vibrato.aha': 'Jetzt beginnt der Ton gerade und fängt erst dann an zu schwingen, so wie viele Sänger:innen es machen.',
'lab.lesson.vibrato.why': 'Vibrato ist ein leichtes, regelmäßiges Schwanken der Tonhöhe, bei Stimmen meist fünf- bis siebenmal pro Sekunde. Setzt es zu früh oder zu stark ein, wirkt es unruhig.',

'lab.lesson.kick.title': 'Wie entsteht eine Kick?',
'lab.lesson.kick.do': 'Die Kick ist ein Sinuston, der schnell nach unten rutscht. Stell die Endtonhöhe so hoch wie die Starttonhöhe. Dann zurück ganz nach unten und die Länge auf.',
'lab.lesson.kick.check1': 'Ohne Tonhöhenfall',
'lab.lesson.kick.check2': 'Tief und lang',
'lab.lesson.kick.aha': 'Ohne den Fall klingt die Kick wie ein Piepen. Der schnelle Fall macht den Schlag, der tiefe Rest den Bauch. Lang ausklingend wird daraus der 808-Bass des Hip-Hop.',
'lab.lesson.kick.why': 'Die Kick der App fällt in etwa einer Zehntelsekunde von 150 auf 42 Hz. Snare und Hi-Hat sind gefiltertes Rauschen, die Snare mit einem kurzen Ton darunter. So entstehen ganze Drumkits ohne ein einziges Sample.',

'lab.lesson.glide.title': 'Glide',
'lab.lesson.glide.do': 'Dreh Glide auf und hör, wie die Töne ineinander rutschen.',
'lab.lesson.glide.check1': 'Glide an',
'lab.lesson.glide.aha': 'Der Ton gleitet zum nächsten wie ein Glissando beim Singen.',
'lab.lesson.glide.why': 'Glide (Portamento) funktioniert nur, wenn der Synth einstimmig (mono) spielt, sonst weiß er nicht, von welchem Ton er gleiten soll. Viele Bass- und Lead-Sounds leben davon.',
```

**Prüfungen Paket 6:** allgemeine Prüfungen; `kit`-Roundtrip (neu, fehlend,
Müll); Standard-Kick unverändert (Mock-Vergleich); ein gespeicherter Stand
von `main` (ohne `kit`) lädt und klingt wie vorher.

---

### Paket 7 – Vertiefung Mix

```js
{ id: 'pump', tier: 'deep', area: 'mix', tab: 'beat', groove: 'Deep House', melody: 'Long Tones',
  set: { bpm: 122, progId: 'pop', chordsOn: true, pump: 0 },
  focus: ['pump'],
  checks: [(s) => s.pump >= .5],
  solution: [(s) => { s.pump = .6; }] },

{ id: 'raum', tier: 'deep', area: 'mix', tab: 'mixer', groove: 'Minimal Click', melody: 'Hook Line',
  preset: 'Neon Pluck', sound: { echoWet: 0 }, fx: { echoOn: false, echoDiv: 2 },
  set: { bpm: 100, progId: 'pop' },
  focus: ['fx:echo', 'sound:echoWet'],
  checks: [(s) => s.fx.echoOn && s.fx.echoDiv === 3, (s) => s.sound.echoWet >= .3],
  solution: [(s) => { s.fx.echoOn = true; s.fx.echoDiv = 3; }, (s) => { s.sound.echoWet = .35; }] },

{ id: 'buildup', tier: 'deep', area: 'mix', tab: 'sound', groove: 'House Bounce', melody: 'Hook Line',
  preset: 'Bright Saw', set: { bpm: 124, progId: 'pop', chordsOn: true },
  focus: ['sound:cutoff', 'automation'],
  checks: [(s) => { const lane = s.automation?.lanes?.cutoff; return Array.isArray(lane) && Math.max(...lane) - Math.min(...lane) >= 3000; }],
  solution: [(s) => { s.automation = { on: true, bars: 4, steps: 64, offset: 0,
                      lanes: { cutoff: Array.from({ length: 64 }, (_, i) => 300 + i * 100) } }; }] },

{ id: 'arrangement', tier: 'deep', area: 'mix', tab: 'mixer', groove: 'House Bounce', melody: 'Hook Line',
  set: { bpm: 124, progId: 'pop', chordsOn: true },
  focus: ['mute:drums', 'mute:bass'],
  checks: [(s) => s.mute.drums && s.mute.bass, (s) => !s.mute.drums && !s.mute.bass],
  solution: [(s) => { s.mute.drums = true; s.mute.bass = true; }, (s) => { s.mute.drums = false; s.mute.bass = false; }] },
```

`buildup`: Form von `s.automation` gegen `sanitizeAutomation` prüfen und die
`solution` daran anpassen.

**Texte (DE)**

```js
'lab.lesson.pump.title': 'Pumpen',
'lab.lesson.pump.do': 'Zieh den Pump-Regler auf über 50 % und achte auf die Akkorde.',
'lab.lesson.pump.check1': 'Pump über 50 %',
'lab.lesson.pump.aha': 'Bei jeder Kick ducken sich die Akkorde kurz weg und kommen wieder: Der Track „atmet“ im Tempo. So klingt House.',
'lab.lesson.pump.why': 'Das Prinzip heißt Sidechain-Kompression: Die Kick steuert die Lautstärke der anderen Spuren. Ursprünglich sollte es nur Platz für die Kick schaffen, heute ist es ein Stilmittel.',

'lab.lesson.raum.title': 'Echo im Rhythmus',
'lab.lesson.raum.do': 'Schalte das Echo ein, stell es auf 1/8 punktiert und dreh den Echo-Anteil des Klangs auf.',
'lab.lesson.raum.check1': 'Echo 1/8 punktiert',
'lab.lesson.raum.check2': 'Echo-Anteil auf',
'lab.lesson.raum.aha': 'Das Echo füllt die Lücken zwischen den Achteln. Aus einzelnen Tönen wird ein eigenes rhythmisches Muster.',
'lab.lesson.raum.why': 'Eine punktierte Achtel dauert drei Sechzehntel. Das Echo fällt deshalb immer zwischen die Schläge. Der Gitarrist The Edge (U2) hat seinen Sound auf diesem Trick aufgebaut. Hall dagegen macht Raum, aber keinen Rhythmus.',

'lab.lesson.buildup.title': 'Build-up',
'lab.lesson.buildup.do': 'Starte die Automations-Aufnahme und dreh währenddessen den Cutoff langsam von ganz unten nach oben.',
'lab.lesson.buildup.check1': 'Filterfahrt aufgenommen',
'lab.lesson.buildup.aha': 'Der Filter öffnet sich jetzt jedes Mal von selbst. So bauen elektronische Tracks Spannung vor dem „Drop“ auf.',
'lab.lesson.buildup.why': 'Automation zeichnet Reglerbewegungen auf und spielt sie im Loop ab. Die meisten Übergänge in elektronischer Musik entstehen so: Filter öffnen, Hall aufziehen, Lautstärken verschieben.',

'lab.lesson.arrangement.title': 'Break und Drop',
'lab.lesson.arrangement.do': 'Schalte Drums und Bass im Mixer stumm, warte zwei Takte und schalte beide wieder ein.',
'lab.lesson.arrangement.check1': 'Break: Drums und Bass aus',
'lab.lesson.arrangement.check2': 'Drop: beide wieder an',
'lab.lesson.arrangement.aha': 'Nichts Neues kam dazu, und trotzdem wirkt der Einsatz wie ein Höhepunkt. Weglassen ist das stärkste Werkzeug im Arrangement.',
'lab.lesson.arrangement.why': 'Arrangement heißt: bestimmen, wann was spielt. Im Chor ist es genauso. Ein Tutti wirkt erst nach einer leisen, dünnen Stelle richtig groß.',
```

---

### Paket 8 – Challenges (Stufe `challenge`)

Drei Spielformen mit eigenem Ablauf (`kind`). Gemeinsam: Start mit „Los“,
eine Runde besteht aus mehreren Aufgaben, Ergebnis „4 von 5“ ohne Wertung,
Knopf „Noch eine Runde“. Kein Zeitlimit. Zufall über `Math.random` ist hier
erlaubt (Groove Lab ist nicht `lightshow.js`), für Tests aber eine
injizierbare Zufallsfunktion vorsehen.

**Vorbild/Deins-Umschalter:** gleiche Mechanik wie Vorher/Nachher aus
Paket 1 (Zustand tauschen ohne Undo, taktgenau).

```js
{ id: 'hoerDetektiv', tier: 'challenge', area: 'rhythm', tab: 'beat', kind: 'detective', rounds: 5,
  focus: ['track:kick', 'track:snare', 'track:hat'], checks: [(s, ctx) => ctx.round >= 5], solution: [(s, ctx) => { ctx.round = 5; }] },
{ id: 'nachbauen', tier: 'challenge', area: 'rhythm', tab: 'beat', kind: 'rebuild', rounds: 3,
  focus: ['track:kick', 'track:snare', 'track:hat'], checks: [(s, ctx) => ctx.round >= 3], solution: [(s, ctx) => { ctx.round = 3; }] },
{ id: 'klangRaetsel', tier: 'challenge', area: 'sound', tab: 'sound', kind: 'soundMatch', rounds: 3,
  focus: ['wave', 'sound:cutoff', 'sound:attack', 'sound:release'], checks: [(s, ctx) => ctx.round >= 3], solution: [(s, ctx) => { ctx.round = 3; }] },
{ id: 'gospelRemix', tier: 'challenge', area: 'mix', tab: 'beat', groove: 'Pulse Basic',
  set: { bpm: 120 }, focus: ['bpm', 'swing', 'track:clap', 'picker:prog'],
  checks: [(s) => s.bpm >= 80 && s.bpm <= 100,
           (s) => sameSteps(stepsOn(s, 'clap'), [4, 12]),
           (s) => s.swing >= .5,
           (s) => s.chordsOn && s.progId === 'blues'],
  solution: [(s) => { s.bpm = 90; s.eighths = 180; }, (s) => { s.beat.clap = { 4: 1, 12: 1 }; },
             (s) => { s.swing = .6; }, (s) => { s.chordsOn = true; s.progId = 'blues'; s.modeId = 'major'; }] },
```

Achtung `gospelRemix`: `Pulse Basic` hat keinen Achtel-Swing (siehe Paket
3). Die Einheit prüft nur den Regler; im Text darauf hinweisen, dass man für
echten Shuffle den Loop „Gospel Shuffle“ vergleichen kann. **Oder**, falls
es sich ohne Eingriff in `_swingOffset` lösen lässt: Einheit auf
`Backbeat Open` umstellen — Entscheidung im Bericht begründen.

**Ablauf `detective` (Hör-Detektiv):** Zufälliger 4/4-Loop aus `DRUM_PATTERNS`
(ohne `vocal`), nur Kick, Snare, Hat hörbar. Variante = eine Zelle einer
dieser Spuren umgeschaltet (hinzufügen oder entfernen, nie Feld 1 der
Kick). Es laufen abwechselnd zwei Takte Original, zwei Takte Variante; die
Anzeige zeigt deutlich „A“ / „B“. Das Raster zeigt das Original; man tippt
die Zelle, die sich in B unterscheidet. Richtig → ✓, nächste Runde; daneben
→ „Noch nicht, hör noch mal auf B“ (beliebig viele Versuche); nach drei
Versuchen „Tipp“: die Spur blinkt.

**Ablauf `rebuild` (Nachbauen):** Zufälliger 4/4-Loop, Raster für Kick,
Snare, Hat leer. Umschalter Vorbild/Deins. Anzeige „x von y Schlägen
stimmen“ (Treffer minus zusätzliche Schläge, nie negativ angezeigt). Runde
geschafft bei vollständiger Übereinstimmung.

**Ablauf `soundMatch` (Klang-Rätsel):** Zielklang zufällig aus
`Tape Keys`, `Neon Pluck`, `Soft Brass`, `Moon Pad`, `Bright Saw`,
`Warm Sub`, reduziert auf `wave`, `cutoff`, `attack`, `release` (alles
andere auf `SOUND_DEFAULTS`). Eigener Klang startet auf `SOUND_DEFAULTS`.
Treffer, wenn `wave` gleich, `cutoff` innerhalb Faktor 1,35 (logarithmisch),
`attack` und `release` je innerhalb ±40 % oder ±0,05 s. Anzeige je
Parameter nur „passt“ / „noch nicht“, nie die Zielwerte.

**Texte (DE)**

```js
'lab.lesson.hoerDetektiv.title': 'Hör-Detektiv',
'lab.lesson.hoerDetektiv.do': 'A ist das Original, in B hat sich ein Schlag verändert. Tipp im Raster auf die Stelle, die in B anders ist.',
'lab.lesson.hoerDetektiv.check1': 'Fünf Runden',
'lab.lesson.hoerDetektiv.aha': 'Du hörst jetzt nicht nur „Beat“, sondern einzelne Schläge. Genau das braucht man zum Nachsingen und Nachspielen.',
'lab.lesson.hoerDetektiv.why': 'Gezieltes Hören lässt sich trainieren. Erst die Spur finden (tief, mittel, hoch), dann den Zeitpunkt (auf dem Schlag oder dazwischen).',
'lab.lesson.nachbauen.title': 'Nachbauen',
'lab.lesson.nachbauen.do': 'Hör dir das Vorbild an und bau es im leeren Raster nach. Mit dem Umschalter vergleichst du.',
'lab.lesson.nachbauen.check1': 'Drei Beats nachgebaut',
'lab.lesson.nachbauen.aha': 'Hören, zählen, setzen: So transkribieren Musiker:innen.',
'lab.lesson.nachbauen.why': 'Tipp: Fang mit der Kick an, dann die Snare, zuletzt die Hi-Hat. Zähl dabei „1 e + e“ mit.',
'lab.lesson.klangRaetsel.title': 'Klang-Rätsel',
'lab.lesson.klangRaetsel.do': 'Hör dir den Zielklang an und bau ihn nach: Wellenform, Filter, Attack und Release.',
'lab.lesson.klangRaetsel.check1': 'Drei Klänge getroffen',
'lab.lesson.klangRaetsel.aha': 'Du kannst Klänge jetzt nicht nur hören, sondern zerlegen.',
'lab.lesson.klangRaetsel.why': 'Reihenfolge, die fast immer hilft: erst Wellenform (Charakter), dann Filter (hell/dunkel), dann Hüllkurve (kurz/lang).',
'lab.lesson.gospelRemix.title': 'Gospel-Remix',
'lab.lesson.gospelRemix.do': 'Mach aus dem Dance-Beat einen Gospel-Groove: langsamer, Clap auf 2 und 4, Swing, und ein Blues darunter.',
'lab.lesson.gospelRemix.check1': 'Tempo 80–100',
'lab.lesson.gospelRemix.check2': 'Clap auf 2 und 4',
'lab.lesson.gospelRemix.check3': 'Swing',
'lab.lesson.gospelRemix.check4': 'Blues-Akkorde',
'lab.lesson.gospelRemix.aha': 'Tempo, Backbeat, Swing und Harmonie: Mit vier Handgriffen hast du das Genre gewechselt.',
'lab.lesson.gospelRemix.why': 'Den echten Shuffle hörst du im Loop „Gospel Shuffle“: Dort swingen die Achtel. Vergleiche ihn mit deinem Ergebnis.',
'lab.ws.goChallenge': 'Los',
'lab.ws.again': 'Noch eine Runde',
'lab.ws.roundOf': 'Runde {n} von {total}',
'lab.ws.result': '{hits} von {total}',
'lab.ws.model': 'Vorbild',
'lab.ws.mine': 'Deins',
'lab.ws.notYet': 'Noch nicht, hör noch mal auf B.',
'lab.ws.hint': 'Tipp: Hör auf diese Spur.',
'lab.ws.fits': 'passt',
'lab.ws.fitsNot': 'noch nicht',
'lab.ws.beatsMatch': '{hits} von {total} Schlägen stimmen',
```

**Prüfungen Paket 8:** mit fester Zufallsfunktion: Detektiv-Variante
unterscheidet sich in genau einer Zelle und nie auf Kick Feld 1;
`rebuild`-Zählung (Treffer, Extras); `soundMatch`-Toleranzen an Grenzwerten
(genau auf der Grenze = Treffer); Headless: eine Detektiv-Runde über den
Test-Export lösen.

---

## 5. Bericht

`BERICHT-WORKSHOP.md` im Format von `BERICHT-DIDAKTIK.md`: Tabelle je Paket
(Status, Commit, `SW_VERSION`, Prüfungen), danach je Paket Dateien,
Änderungen, Abweichungen. Abschnitte „Zu entscheiden“ (inkl. unsicherer
PL-Texte) und „Nicht umgesetzt“. Keine Selbstbewertung der Didaktik — die
passiert beim Ausprobieren.
