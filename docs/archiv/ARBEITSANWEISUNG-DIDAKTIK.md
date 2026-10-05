# Arbeitsanweisung für Claude Code – Didaktik der Übe-Tools

Du bist erfahrene Chorleiterin/erfahrener Chorleiter, Stimmbildner:in und
Entwickler:in. Du erweiterst Einsingen, Ausbildung und Groove Lab nach den
Paketen unten. Musikalische und didaktische Entscheidungen sind hier
getroffen; alle Übungsdaten stehen fertig im Format der App.

Antworte und kommentiere auf Deutsch.

**Diese Anweisung läuft unbeaufsichtigt.** Keine Rückfragen. Wo etwas unklar
bleibt: die Variante wählen, die näher am bestehenden Verhalten liegt, im
Bericht unter „Zu entscheiden“ notieren, weitermachen.

Ausdrücklich **nicht** Teil dieses Auftrags: jeder Bezug zum Repertoire
(Tonart/Tempo/Anfangston der Songs, Analyse der Aufnahmen).

---

## 0. Vorbereitung

1. Branch `didaktik` von aktuellem `main` anlegen. Nie auf `main` committen,
   nie mergen, nie force-pushen.
2. `CLAUDE.md`, `README.md`, `ARBEITSANWEISUNG-CLAUDE-CODE.md` (Abschnitte 1
   und 3) und `BERICHT-UMSETZUNG.md` lesen.
3. Diese Datei im ersten Commit mit einchecken.

## 1. Feste Regeln

Es gelten **alle Regeln aus Abschnitt 1 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`**
(ein Paket = ein Commit + Push, `SW_VERSION` je Commit erhöhen, keine IDs
ändern, Reihenfolge von `DRUM_PATTERNS`/`MELODIES` nie ändern, neue Felder
optional mit Standardwert und durch `sanitize…` gereicht, Persistenz-Roundtrip
Pflicht, Texte in `strings.js` DE/EN/PL gemeinsam, keine Abhängigkeiten).
Zusätzlich:

- **Neue Einstellungen der Haupt-App** (`settings.voiceProfile`) brauchen
  keine `DATA_VERSION`-Erhöhung: optionales Feld, fehlend = Standard.
- **Mikrofon:** nie im Hintergrund, nie aufzeichnen, nie speichern. Jede neue
  Mikrofon-Übung nutzt `detectPitch()`/`micOn()`/`micOff()` aus
  `uebe-lab.html` und dieselben `RECORDING_CONSTRAINTS` (ohne
  Echo-Unterdrückung). Beim Verlassen des Reiters/der Übung `micOff()`.
- **Wortwahl:** ermutigend, nie bewertend („noch 20 Cent darunter“, nicht
  „falsch“). Keine Streak-Verluste anzeigen, keine roten Gesamtnoten.
- **Barrierefreiheit:** jede neue Antworttaste ≥ 44 px, `aria-label`,
  Tastaturbedienung (Ziffern 1–9 für Antworten), `aria-live` für Ergebnisse.

## 2. Entscheidungen (verbindlich)

| Thema | Festlegung |
|---|---|
| Stimmlagen fürs Üben | nur die vier Chorstimmen `S, A, T, B` – keine weiteren Stimmlagen einführen |
| Globale Stimmlage | eine Einstellung für alle Tools (`settings.voiceProfile`), Vorbelegung aus `settings.myVoices` |
| Persönlicher Umfang | aus dem Stimm-Tuner übernehmbar; wirkt nur, wenn Spanne ≥ 14 Halbtöne; Einsingen bleibt je 2 Halbtöne innerhalb |
| Belastung Einsingen | `leicht / normal / kräftig` – eigener Begriff, damit es nicht mit Lern-„Stufen“ verwechselt wird |
| Lern-Stufen | einheitliches Bedienelement: Chips 1–6 + „Eigene Auswahl“; jede Stufe enthält die vorigen |
| Solmisation | relativ („Tonika-Do“): `do re mi fa so la ti`; Moll la-basiert. Alternativ Stufenzahlen 1–7 (Einstellung) |
| Rhythmussprache | `ta`, `ti-ti`, `ta-a`, `ti-ri-ti-ri`, `tri-o-le`; Zählen: `1 + 2 +`, Sechzehntel `1 e + e`, 6/8 „in 6“ |
| Fortschritt | nur lokal, Tagesaggregate, 180 Tage; Stufen werden **vorgeschlagen**, nie automatisch gewechselt |
| Groove Lab | neue „Chor“-Ansicht als Standard beim Öffnen über Tools; bisherige Oberfläche heißt „Studio“ |

## 3. Tests

Wie in `ARBEITSANWEISUNG-CLAUDE-CODE.md` Abschnitt 3: je Tool `selfCheck()`
erweitern (Liste der Fehler, leer = bestanden), reine Funktionen exportieren
(`window.einsingen`, `window.uebeLab`, `ChorGrooveLab._test`), Headless-Prüfung
mit Playwright, Node-Prüfskripte unter `/tmp` (nicht committen). Die für jedes
Paket geforderten Prüfungen stehen am Paketende.

---

## 4. Pakete

### Paket 1 – Globales Stimmprofil

**Ziel:** Stimmlage, persönlicher Umfang und Belastung einmal festlegen, alle
Tools nutzen sie.

**app.js**

```js
// DEFAULT_SETTINGS
voiceProfile: null, // { part, low, high, measuredAt, load } — siehe sanitizeVoiceProfile
```

```js
const PROFILE_PARTS = ['S', 'A', 'T', 'B'];
const PROFILE_LOADS = ['leicht', 'normal', 'kraeftig'];
// BAR gibt es in VOICE_ORDER als Spurtyp; fürs Üben zählt er als Bass.
const MY_VOICE_TO_PART = { SOP: 'S', ALT: 'A', TEN: 'T', BAR: 'B', BASS: 'B' };

function sanitizeVoiceProfile(raw, myVoices = []) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const fromMine = VOICE_ORDER.map((v) => MY_VOICE_TO_PART[v]).find((p, i) => p && myVoices.includes(VOICE_ORDER[i])) || null;
  const midi = (v) => (Number.isInteger(v) && v >= 28 && v <= 96 ? v : null);
  let low = midi(o.low), high = midi(o.high);
  if (low == null || high == null || high - low < 7) { low = null; high = null; }
  return {
    part: PROFILE_PARTS.includes(o.part) ? o.part : fromMine,
    low, high,
    measuredAt: low != null && /^\d{4}-\d{2}-\d{2}$/.test(o.measuredAt) ? o.measuredAt : null,
    load: PROFILE_LOADS.includes(o.load) ? o.load : 'normal',
  };
}

// Für die Tool-iframes (gleiche Herkunft), neben window.chorToolStorage:
window.chorVoiceProfile = {
  get: () => sanitizeVoiceProfile(settings.voiceProfile, settings.myVoices),
  set: async (patch) => {
    const voiceProfile = sanitizeVoiceProfile({ ...window.chorVoiceProfile.get(), ...patch }, settings.myVoices);
    await saveSettings({ voiceProfile }); // Patch-Signatur wie überall in app.js
    return voiceProfile;
  },
};
```

**Einstellungen → Tools**: oberhalb der Tool-Knöpfe eine Zeile „Meine
Stimmlage fürs Üben“ (Chips S, A, T, B) und „Belastung beim
Einsingen“ (leicht / normal / kräftig), darunter ggf. „Eigener Umfang:
F – e′ (gemessen am 12.10.)“ mit Knopf „Auf Standard zurücksetzen“.

**harmony.js** – neue gemeinsame Tabelle (die SATB-Satz-Tabelle
`VOICE_RANGES` bleibt unverändert):

```js
// Bequeme Übe-Umfänge (klingend, MIDI). Bewusst ein, zwei Töne innerhalb
// der Literaturangaben — Üben soll aufwärmen, nicht an die Grenze gehen.
const PRACTICE_RANGES = {
  // Werte wie bisher VOICES in einsingen.html — nur hierher verschoben.
  S: { floor: 57, ceil: 79, name: 'Sopran' }, // a  – g″
  A: { floor: 53, ceil: 74, name: 'Alt' },    // f  – d″
  T: { floor: 47, ceil: 67, name: 'Tenor' },  // H  – g′
  B: { floor: 41, ceil: 62, name: 'Bass' },   // F  – d′
};

/** Wirksamer Übe-Umfang: Standard der Stimmlage, bei gemessenem Umfang
 *  dessen Innenbereich (je 2 Halbtöne Abstand), aber höchstens 4 Halbtöne
 *  vom Standard entfernt (schützt vor Oktavfehlern der Messung). */
function practiceRange(profile) {
  const base = PRACTICE_RANGES[profile?.part] || PRACTICE_RANGES.A;
  if (profile?.low == null || profile?.high == null || profile.high - profile.low < 14) return { ...base, personal: false };
  const floor = clamp(profile.low + 2, base.floor - 4, base.floor + 4);
  const ceil = clamp(profile.high - 2, base.ceil - 4, base.ceil + 4);
  return ceil - floor >= 12 ? { ...base, floor, ceil, personal: true } : { ...base, personal: false };
}
```

Beides exportieren (`PRACTICE_RANGES`, `practiceRange`). harmony.js hat noch
kein `clamp` – lokal ergänzen: `const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));`

**Tools:** Einsingen, Ausbildung und Groove Lab lesen beim Start
`window.parent.chorVoiceProfile?.get()`; fehlt es (eigenständig geöffnet),
gilt der bisher im Tool gespeicherte Wert. Tippt man im Tool auf einen
Stimm-Chip, wird `set({ part })` aufgerufen – die Wahl gilt dann überall.

- **Einsingen:** `VOICES` durch `PRACTICE_RANGES` ersetzen (Chips bleiben
  S, A, T, B). Bisher gespeichertes `state.voice` bleibt gültig.
  `exerciseRange()` nutzt `practiceRange(profile)` statt `voiceById()`.
  Übung „Akkord“: `CHORD_HOME[part]`.
- **Stimm-Tuner, „Tonumfang heute“:** neuer Knopf „Als meinen Umfang
  speichern“, aktiv wenn tiefster und höchster Ton gemessen sind und die
  Spanne ≥ 14 Halbtöne beträgt. Schreibt `{ low, high, measuredAt }`. Hinweis
  darunter: „Das Einsingen bleibt zwei Halbtöne innerhalb dieser Grenzen.“
- **Groove Lab:** eigene Stimme für die Chor-Aufgaben (Paket 8) =
  `part`.

**Tests:** Roundtrip `voiceProfile` (neu/alt/kaputt); `practiceRange` für
alle vier Stimmen ohne Messung = Standard; Messung A 50–75 → floor 52, ceil 73;
Messung mit Oktavfehler (B 29–62) → floor auf 37 begrenzt; Spanne < 14 →
Standard; Einsingen `selfCheck()`: alle Übungen × 4 Stimmen × 3
Belastungen bleiben in `[floor, ceil]`.

---

### Paket 2 – Einsingen: neue Übungen, Belastung, Programme, eigene Programme

Alle Werte unten sind gegen die Rechenlogik von `einsingen.html`
(`exerciseRange`, `offsets`, `roundSteps`) für alle vier Stimmen und alle
drei Belastungen durchgerechnet: kein Ton außerhalb des Umfangs, jede
Programm-Übung erreicht die vorgesehene Zahl Rückungen.

#### 2a Neue Übungsart „Körper“ (`kind: 'body'`)

Tonlos wie „Atem“: je Bewegung eine Anweisung mit Dauer in Schlägen (Tempo
fest 60). Die Bühne zeigt den Text groß und einen Countdown-Ring; beim
Wechsel ein leiser Glockenton, sonst Stille (kein Klick). `buildPlan()`
legt je Bewegung eine Runde an (analog `addBreath`), `planNotes()`
überspringt `body`.

```js
// neue Gruppe, als erste in GROUPS:
['koerper', 'Körper & Haltung'],
// Gruppe 'hoehe' behält die ID, heißt jetzt:
['hoehe', 'Höhe, Tiefe & Register'],
```

```js
{ id: 'dehnen', group: 'koerper', name: 'Strecken & Lockern', hint: 'ohne Ton', bpm: 60, kind: 'body', lowStart: 0, top: 0,
  moves: [
    ['Arme über den Kopf strecken, Fingerspitzen zur Decke — ganz lang werden.', 8],
    ['Arme fallen lassen, Hände und Arme ausschütteln.', 8],
    ['Schultern langsam nach hinten kreisen.', 8],
    ['Kopf zur rechten Schulter neigen, ruhig weiteratmen.', 6],
    ['Kopf zur linken Schulter neigen.', 6],
    ['Wirbel für Wirbel nach vorn abrollen, Knie locker — und langsam wieder aufrichten, der Kopf kommt zuletzt.', 12],
  ],
  help: ['Ohne Ton: den Körper wecken, bevor die Stimme arbeitet. Jede Bewegung langsam und ohne Schmerz.',
    'Wer nicht stehen kann oder mag, macht die Arm- und Schulterbewegungen im Sitzen.'] },
{ id: 'haltung', group: 'koerper', name: 'Sängerhaltung', hint: 'ohne Ton', bpm: 60, kind: 'body', lowStart: 0, top: 0,
  moves: [
    ['Füße hüftbreit, Knie locker — nicht durchgedrückt.', 6],
    ['Gewicht gleichmäßig auf beiden Füßen, ganz leicht nach vorn.', 6],
    ['Das Brustbein bleibt leicht oben, die Schultern sinken.', 6],
    ['Der Kopf balanciert oben auf der Wirbelsäule, der Nacken ist lang.', 6],
    ['So stehen bleiben: drei ruhige Atemzüge in Bauch und Flanken.', 12],
  ],
  help: ['Eine Haltung, in der nichts festgehalten wird: aufrecht, aber nicht steif.',
    'Diese Haltung beim Singen immer wieder kurz prüfen — besonders die Knie und die Schultern.'] },
{ id: 'kiefer', group: 'koerper', name: 'Kiefer & Gesicht', hint: 'ohne Ton', bpm: 60, kind: 'body', lowStart: 0, top: 0,
  moves: [
    ['Mit geschlossenem Mund genüsslich kauen.', 8],
    ['Mit den Fingerspitzen die Kaumuskeln vor den Ohren kreisend massieren.', 10],
    ['Kiefer locker hängen lassen und tonlos „ja-ja-ja“ sagen — die Zunge arbeitet, der Kiefer nicht.', 8],
    ['Herzhaft gähnen und spüren, wie der Rachen weit wird.', 6],
    ['Zunge weit herausstrecken, dann mit der Zungenspitze innen an den Zähnen entlang kreisen.', 8],
  ],
  help: ['Ein fester Kiefer und eine feste Zunge sind die häufigsten Ursachen für einen engen Klang.',
    'Gut nach einem Arbeitstag am Bildschirm — und vor Stücken mit viel Text.'] },
```

#### 2b Neue gesungene Übungen

Neues optionales viertes Feld in `notes`: `[Stufe, Dauer, klingend, alt]` –
`alt` = Halbtöne Abweichung von der Tonleiterstufe (nur „Dur und Moll“).
`semisOf()` und `spanOf()` rechnen `alt` mit. Neues Feld `forceDrone: true`:
Liegeton klingt unabhängig vom Schalter.

```js
{ id: 'strohhalm', group: 'lockern', name: 'Strohhalm', hint: 'u durch den Halm', bpm: 72, lowStart: 2, top: 17, breath: 6, glide: true,
  notes: [[0, 4], [4, 8], [0, 8]], syllables: ['u', 'u', 'u'],
  help: ['Einen normalen Trinkhalm locker zwischen die Lippen nehmen (nicht zwischen die Zähne) und hindurch auf „u“ summen — eine Quinte hinauf und wieder zurück gleiten.',
    'Der Halm staut die Luft ein wenig zurück. Das entlastet die Stimmlippen, hoch und tief gehen ohne Druck ineinander über. Ohne Halm: die Lippen fast schließen und auf „w“ summen.'] },
{ id: 'strohhalm5', group: 'lockern', name: 'Strohhalm-Fünfton', hint: 'Tonleiter im Halm', bpm: 84, lowStart: 3, top: 17, breath: 6,
  notes: legato5, syllables: rep('u', 9),
  help: ['Mit dem Halm fünf Töne hinauf und wieder hinunter, alles gebunden.',
    'Die Luft strömt gleichmäßig, die Wangen blähen sich nicht auf. Danach einmal ohne Halm auf „u“ singen und hören, ob die Leichtigkeit bleibt.'] },
{ id: 'umlaute', group: 'resonanz', name: 'Umlaute', hint: 'i–ü · e–ö', bpm: 84, lowStart: 6, top: 15,
  notes: [[0, 4], [0, 4], [0, 4], [0, 4], [0, 4], [0, 8]], syllables: ['ni', 'nü', 'ne', 'nö', 'nä', 'na'],
  help: ['Auf einem Ton: „ni – nü – ne – nö – nä – na“, ohne abzusetzen.',
    'Von „i“ nach „ü“ und von „e“ nach „ö“ bleibt die Zunge, wo sie ist — nur die Lippen werden rund. So klingen ü und ö im Chor hell und einheitlich statt dumpf.'] },
{ id: 'durMoll', group: 'resonanz', name: 'Dur und Moll', hint: 'no · große/kleine Terz', bpm: 72, lowStart: 4, top: 14, forceDrone: true,
  notes: [[0, 4], [2, 4], [4, 4], [2, 4, null, -1], [0, 8]], syllables: rep('no', 5),
  help: ['Grundton, große Terz, Quinte — dann die kleine Terz und zurück zum Grundton. Der Liegeton klingt die ganze Zeit mit.',
    'Hören, wie viel kleiner der Schritt zur Mollterz ist. Die große Terz eher knapp, die kleine Terz eher weit genug singen — beide geraten im Chor gern zu tief.'] },
{ id: 'staccatoLegato', group: 'beweglich', name: 'Staccato – Legato', hint: 'ha · dann ja', bpm: 88, lowStart: 2, top: 19,
  notes: [[0, 2, .5], [2, 2, .5], [4, 2, .5], [7, 2, .5], [4, 2], [2, 2], [0, 4]], syllables: ['ha', 'ha', 'ha', 'ha', 'ja', 'a', 'a'],
  help: ['Den Dreiklang hinauf kurz und federnd auf „ha“, hinunter gebunden auf „ja-a-a“.',
    'Beim Staccato federt der Bauch, beim Legato strömt die Luft ohne Lücke weiter. Die Tonhöhe bleibt in beiden Hälften gleich sauber.'] },
{ id: 'eule', group: 'hoehe', name: 'Eulenruf', hint: 'hu-uh · von oben', bpm: 66, lowStart: 3, top: 20, glide: true,
  notes: [[7, 6], [0, 10]], syllables: ['hu', 'uh'],
  help: ['Mit einem leichten „hu“ hoch oben beginnen — so leicht wie ein Eulenruf — und auf „u“ eine Oktave hinuntergleiten.',
    'Männer beginnen in der Kopfstimme (Falsett) und lassen den Klang nach unten in die Bruststimme übergehen, ohne dass er lauter wird. Frauen nehmen die leichte Höhe mit in die Mittellage.'] },
{ id: 'kopfAbwaerts', group: 'hoehe', name: 'Von oben', hint: 'hu · Tonleiter abwärts', bpm: 84, lowStart: 3, top: 20,
  notes: [[7, 4], [6, 2], [5, 2], [4, 2], [3, 2], [2, 2], [1, 2], [0, 6]], syllables: ['hu', ...rep('u', 7)],
  help: ['Die Tonleiter von oben eine Oktave hinunter, der erste Ton leicht und fast gehaucht.',
    'Die Leichtigkeit des oberen Tons bleibt beim Hinuntergehen — nicht schwerer werden, nicht „umschalten“. Das gleicht die Register aus und bereitet den Oktavsprung vor.'] },
{ id: 'tiefe', group: 'hoehe', name: 'Tiefe Lage', hint: 'mo · entspannt', bpm: 76, lowStart: 1, top: 12,
  notes: [[4, 2], [3, 2], [2, 2], [1, 2], [0, 8]], syllables: ['mo', 'o', 'o', 'o', 'o'],
  help: ['Fünf Töne auf „mo“ hinunter — Runde für Runde etwas tiefer (im Programm läuft die Übung abwärts).',
    'In der Tiefe darf es leiser werden. Den Kehlkopf nicht hinunterdrücken und den Klang nicht künstlich dunkel machen. Ist ein Ton nur noch Knarren: Runde auslassen.'] },
{ id: 'tiefeGleiten', group: 'hoehe', name: 'Tief gleiten', hint: 'u · Quinte abwärts', bpm: 66, lowStart: 1, top: 12, glide: true,
  notes: [[4, 4], [0, 12]], syllables: ['u', 'u'],
  help: ['Auf „u“ eine Quinte hinuntergleiten und unten den Ton ruhig halten.',
    'Wie ein entspanntes Seufzen: Die Luft trägt den Ton nach unten, der Hals bleibt weit. Gut für Alt und Bass vor tiefen Stellen.'] },
```

Einfügen: jeweils ans Ende ihrer Gruppe (Reihenfolge in `EXERCISES` ist nicht
gespeichert, nur IDs).

**Rückungsspielraum bei Belastung „normal“** (zur Kontrolle, Halbtöne):

| Übung | S | A | T | B |
|---|---|---|---|---|
| strohhalm / strohhalm5 / umlaute | 7 | 7 | 7 | 7 |
| eule / kopfAbwaerts | 5 | 5 | 5 | 5 |
| tiefe / tiefeGleiten | 4 | 4 | 4 | 4 |
| durMoll | 3 | 3 | 3 | 3 |
| staccatoLegato | 5 | 5 | 5 | 5 |

#### 2c Belastung

```js
const LOADS = {
  leicht:   { name: 'leicht',   topShift: -3, maxSteps: 5, tempo: .9 },
  normal:   { name: 'normal',   topShift: 0,  maxSteps: 7, tempo: 1 },
  kraeftig: { name: 'kräftig',  topShift: 2,  maxSteps: 9, tempo: 1.1 },
};
```

- `exerciseRange()`: `v.floor + ex.top + L.topShift` (Obergrenze
  `practiceRange().ceil` gilt weiter), `MAX_STEPS` → `L.maxSteps`.
- Tempo: `bpmOf(ex) * L.tempo`, gerundet; das pro Übung gemerkte Tempo
  bleibt der Grundwert.
- `easyNotes` bei „leicht“ statt `notes`:
  - `koloratur`: `[...[0, 1, 2, 3, 4, 3, 2, 1].map((d) => [d, 1]), [0, 4]]`,
    Hinweis „5 Töne auf ‚a‘“
  - `oktave`: `[[0, 4], [4, 4], [3, 2], [2, 2], [1, 2], [0, 6]]`, Hinweis
    „Quintsprung“
- Chips „Belastung“ im Begleitungs-Panel; Hilfe: „Leicht: tiefer, langsamer,
  weniger Rückungen — für müde Stimmen, morgens, nach Krankheit.
  Kräftig: etwas höher und mehr Rückungen — für geübte Stimmen. Die Grenzen
  deiner Stimmlage gelten immer.“

#### 2d Neue Programme

`PROGRAMS` ergänzen (bestehende `kurz`, `lang` unverändert). Neues Feld
`about` für die Karte.

```js
{ id: 'schnell', name: 'Schnell', about: 'Wenn wenig Zeit ist',
  items: [['lippen', 2], ['sirene', 2], ['mimemamomu', 3], ['nja', 2], ['dreiklang', 3], ['summen', 2, 'down']] },
{ id: 'morgens', name: 'Morgens', about: 'Sanft: erst Körper, dann von oben',
  items: [['dehnen'], ['kiefer'], ['strohhalm', 3], ['summen', 3, 'down'], ['eule', 3], ['mimemamomu', 3], ['dreiklang', 3]] },
{ id: 'intonation', name: 'Intonation', about: 'Vokale, Terzen und Akkord',
  items: [['haltung'], ['strohhalm5', 3], ['summen', 2, 'down'], ['vokale', 2], ['umlaute', 2], ['moll5', 2], ['durMoll', 3], ['akkord', 1], ['messa', 2]] },
{ id: 'hoehe', name: 'Höhe', about: 'Von oben nach unten, dann Sprünge',
  items: [['dehnen'], ['strohhalm', 4], ['sirene', 4], ['eule', 4], ['kopfAbwaerts', 4], ['dreiklang', 5], ['oktave', 4], ['summen', 3, 'down']] },
{ id: 'tiefe', name: 'Tiefe', about: 'Für tiefe Stimmen und tiefe Stellen',
  items: [['haltung'], ['lippen', 3, 'down'], ['summen', 3, 'down'], ['tiefeGleiten', 3, 'down'], ['tiefe', 4, 'down'], ['vokale', 2], ['moll5', 2, 'down']] },
{ id: 'auftritt', name: 'Vor dem Auftritt', about: 'Schonend und wach, nichts ausreizen',
  items: [['haltung'], ['atem'], ['lippen', 3], ['summen', 2, 'down'], ['mimemamomu', 3], ['katze', 2], ['staccatoLegato', 2], ['vokale', 2]] },
```

**Durchgerechnete Dauer** (inkl. Pausentakte; Werte gleich für alle
Stimmen ±0,5 min):

| Programm | leicht | normal | kräftig |
|---|---|---|---|
| Schnell | 3,6 | 3,6 | 3,3 |
| Kurz (bestehend) | 4,7 | 4,9 | 4,5 |
| Tiefe | 3,4 | 4,1 | 3,7 |
| Morgens | 5,2 | 5,7 | 5,2 |
| Vor dem Auftritt | 5,6 | 5,8 | 5,3 |
| Intonation | 5,8 | 6,5 | 6,0 |
| Höhe | 7,5 | 8,9 | 8,0 |
| Ausführlich (bestehend) | 11,7 | 12,7 | 11,6 |

Die Karten zeigen die Dauer schon heute über `secondsLeft()`; sie folgt
automatisch Stimmlage und Belastung.

Hilfetext „Programm“ ergänzen: „Morgens und Vor dem Auftritt sind bewusst
kurz und bleiben in der Mittellage. Höhe und Tiefe ersetzen kein
Einsingen — erst Schnell oder Kurz, dann eines davon.“

#### 2e Eigene Programme

```js
// state (gespeichert unter 'einsingen'):
ownPrograms: [], // [{ id: 'own-<base36>', name, items: [[exId, limit|null, dir]] }]
```

- Grenzen: höchstens 12 Programme, je 1–20 Übungen, Name 1–40 Zeichen.
- `sanitizeOwnPrograms`: unbekannte Übungs-IDs entfernen; `limit` ganzzahlig
  1–9 oder `null` (= so viele, wie der Umfang erlaubt); `dir` ∈ `updown, up,
  down`, sonst `updown`; bei `body`/`breath` `limit`/`dir` verwerfen; leere
  Programme verwerfen.
- UI: nach den Programm-Karten eine Karte „+ Eigenes Programm“. Editor als
  Sheet: Name, Liste der Schritte (je Zeile: Übungsname, Chips „Rückungen
  1–7 / alle“, Chips Richtung, Knöpfe ↑ ↓ ×), „Übung hinzufügen“ öffnet die
  gruppierte Übungsliste. Oben die berechnete Dauer. Knöpfe „Speichern“,
  „Löschen“.
- Jede eingebaute Programmkarte bekommt im Menü „Als Vorlage kopieren“.
- Warnhinweis im Editor (nicht blockierend), wenn eine Übung der Gruppe
  `hoehe` (außer `tiefe`, `tiefeGleiten`) vor der ersten Übung der Gruppen
  `lockern`/`resonanz` steht: „Tipp: Höhe erst nach dem Lockern.“

**Tests (`selfCheck`):**
- alle Übungen × 4 Stimmen × 3 Belastungen: jeder Ton in
  `[floor, ceil]`; `body`/`breath` ohne Töne;
- jedes eingebaute Programm erreicht bei „normal“ die angegebene Zahl
  Rückungen für alle Stimmen (Grenze unterschritten = Fehler);
- Programmdauer bei „normal“ liegt ±15 % an der Tabelle oben;
- `durMoll`: vierter Ton = Grundton + 3 Halbtöne;
- Roundtrip `ownPrograms`, `load` (neu/alt/kaputt);
- Übung „Katze“: betonte Silben weiterhin auf Zählzeiten (bestehender Test).

---

### Paket 3 – Rhythmus: Stufen, Phrasen, Auftakt, Bindebögen, Taktarten, Sprache, Zweistimmigkeit

Datei: `uebe-lab.html`.

#### 3a Neue Taktarten

```js
const METERS = {
  '4/4': { ticks: 48, beat: 12, ref: 12, unit: 12, top: '4', bottom: '4' },
  '3/4': { ticks: 36, beat: 12, ref: 12, unit: 12, top: '3', bottom: '4' },
  '6/8': { ticks: 36, beat: 6,  ref: 18, unit: 18, top: '6', bottom: '8' },
  // neu
  '2/4': { ticks: 24, beat: 12, ref: 12, unit: 12, top: '2', bottom: '4' },
  '2/2': { ticks: 48, beat: 24, ref: 24, unit: 12, top: '2', bottom: '2' },          // Klick auf Halben
  '5/4': { ticks: 60, beat: 12, ref: 12, unit: 12, top: '5', bottom: '4', groups: [3, 2] },
  '7/8': { ticks: 42, beat: 6,  ref: 6,  unit: 0,  top: '7', bottom: '8', groups: [2, 2, 3] },
};
```

- `groups`: Betonung (starker Klick) auf dem ersten Schlag jeder Gruppe, wie
  im Metronom.
- `unit: 0` = additive Taktart: Bausteine werden je Gruppe aus einer eigenen
  Bibliothek gezogen:

```js
CELLS.additive = {
  2: [{ v: [12] }, { v: [6, 6] }, { v: [-6, 6], tags: ['r'] }, { v: [3, 3, 6], tags: ['s'] }],
  3: [{ v: [18] }, { v: [12, 6] }, { v: [6, 6, 6] }, { v: [6, 12], tags: ['sy'] }, { v: [-6, 6, 6], tags: ['r'] }],
};
```

- Tempoanzeige für 2/2 `𝅗𝅥 = …`, für 7/8 `♪ = …` (wie `tempoSymbol`).

#### 3b Mehrtaktige Muster, Auftakt, Bindebögen

- Neue Einstellung `bars` ∈ `1, 2, 4` (Standard 1). `makePattern` erzeugt
  `bars` Takte; die Wiederholungssperre gilt für die ganze Phrase. Bei 4
  Takten endet Takt 4 auf Zählzeit 1 mit einem langen Wert (Halbe oder
  länger, 6/8: punktierte Viertel) – Phrasenschluss.
- Neuer Baustein-Schalter `tie` („Bindebögen“): Nach dem Erzeugen werden mit
  Wahrscheinlichkeit 0,35 je Grenze zwei benachbarte Noten gebunden, wenn
  die erste Note die letzte einer Einheit ist und die zweite die erste der
  nächsten Einheit (auch über den Taktstrich). Die gebundene Note ist kein
  Einsatz (`onsets` ohne sie), wird mit Bogen gezeichnet und nicht
  geklatscht. Nie mehr als ein Bogen je Takt.
- Neuer Schalter `pickup` („Auftakt“): Die Phrase beginnt mit einem Auftakt
  von einer Achtel, zwei Achteln oder einer Viertel (6/8: eine Achtel) vor
  Takt 1; der letzte Takt ist um genau diese Dauer kürzer
  (Volltakt-Regel), damit Wiederholungen im Metrum bleiben. Der Einzähler
  zählt bis zum Auftakt („1 – 2 – 3 – und“). Anzeige: Auftakt links vom
  ersten Taktstrich.

#### 3c Stufen

```js
const RHYTHM_LEVELS = [
  { n: 1, label: 'Viertel und Halbe',             meters: ['4/4'],                                     elements: [],                                    bars: 1, pickup: false, bpm: 80 },
  { n: 2, label: 'Achtel · 2/4 und 3/4',          meters: ['4/4', '2/4', '3/4'],                       elements: ['e'],                                 bars: 1, pickup: false, bpm: 80 },
  { n: 3, label: 'Pausen · zwei Takte',           meters: ['4/4', '2/4', '3/4'],                       elements: ['e', 'r'],                            bars: 2, pickup: false, bpm: 84 },
  { n: 4, label: 'Punktiert · Auftakt · alla breve', meters: ['4/4', '2/4', '3/4', '2/2'],             elements: ['e', 'r', 'd'],                       bars: 2, pickup: true,  bpm: 88 },
  { n: 5, label: 'Synkopen · Bindebögen · 6/8',   meters: ['4/4', '3/4', '2/2', '6/8'],                elements: ['e', 'r', 'd', 'sy', 'tie'],          bars: 2, pickup: true,  bpm: 88 },
  { n: 6, label: 'Sechzehntel · Triolen · 5/4 und 7/8 · vier Takte', meters: ['4/4', '3/4', '6/8', '5/4', '7/8'], elements: ['e', 'r', 'd', 'sy', 'tie', 's', 't'], bars: 4, pickup: true, bpm: 92 },
];
```

- Bei mehreren Taktarten in einer Stufe: je Durchgang (Rundenblock) eine
  zufällige, innerhalb eines Durchgangs fest.
- `pickup: true` heißt „Auftakt möglich“ (in 40 % der Phrasen).
- Bedienung wie in „Hören“: Chips 1–6 + „Eigene Auswahl“; jede Änderung von
  Taktart/Bausteinen/Takten macht daraus „Eigene Auswahl“.

#### 3d Rhythmussprache

Neue Einstellung `syllables` ∈ `off | ta | count` (Standard `off`). Unter
jeder Note die Silbe; in „Nachklatschen“ erst nach der Runde.

| Wert (Ticks, 12 = Viertel) | `ta` | `count` (4/4) |
|---|---|---|
| Viertel | ta | Zählzeit („1“) |
| Halbe / punktierte Halbe / Ganze | ta-a / ta-a-a / ta-a-a-a | „1 (2)“ usw. |
| zwei Achtel | ti-ti | „1 +“ |
| einzelne Achtel | ti | „+“ bzw. Zählzeit |
| punktierte Viertel + Achtel | ta-i ti | „1 (2) +“ |
| vier Sechzehntel | ti-ri-ti-ri | „1 e + e“ |
| Achteltriole | tri-o-le | tri-o-le |
| Pause | (leer, grau „sch“) | Zählzeit in Klammern |

In 6/8 zählt `count` „in 6“ (1 2 3 4 5 6), wie der Klick. Hilfetext:
„Sprich die Silben laut mit — wer den Rhythmus sprechen kann, kann ihn
singen.“

#### 3e Eingabe per Mikrofon (Klatschen oder Sprechen)

Neue Einstellung `input` ∈ `tap | mic` (Standard `tap`).

- Einsatzerkennung auf dem Mikrofonsignal: Rahmen 10 ms, Pegel in dB;
  Einsatz, wenn der Pegel ≥ 12 dB über dem gleitenden Grundrauschen (Median
  der letzten 500 ms) liegt **und** ≥ 6 dB über dem vorigen Rahmen;
  Sperrzeit 90 ms.
- Latenz: einmalige Kalibrierung „8× zum Klick klatschen“, Median der
  Abweichung wird gespeichert (`micLatencyMs`, 0–400) und von jedem Einsatz
  abgezogen.
- Bewertung wie bei Tippern (Fenster und Farben unverändert).
- Hinweis: „Mit Kopfhörern — sonst hört das Mikrofon den Klick.“

#### 3f Zweistimmig

Neuer Modus neben Nachklatschen/Mitklatschen/Vom Blatt: **„Zweistimmig“**
(ab Stufe 3 wählbar).

- Zwei Zeilen: oben Stimme 1 (spielt die App mit hohem Holzblock), unten
  Stimme 2 (klatschst du). Beide aus `makePattern` mit derselben Taktart;
  Bedingung: höchstens 60 % der Einsätze von Stimme 2 fallen mit Stimme 1
  zusammen, und mindestens ein Einsatz von Stimme 2 liegt, wo Stimme 1 eine
  Pause oder einen langen Wert hat (sonst neu ziehen, höchstens 200
  Versuche).
- Ablauf: 1 Takt beide Stimmen vorgespielt → du klatschst Stimme 2 zur
  klingenden Stimme 1. Umschalter „Ich klatsche: obere / untere Stimme“.
- Bewertet wird nur die eigene Zeile.

**Tests (`selfCheck`):** 500 Muster je Stufe: Tickzahl = Takte × `ticks`
(mit Auftakt: gleich, weil der letzte Takt gekürzt ist); keine Bindung
innerhalb einer Einheit; 7/8-Muster füllen die Gruppen 2+2+3 exakt;
Silbentabelle deckt alle vorkommenden Werte ab; Zweistimmig: Bedingungen
oben in 100 % der erzeugten Paare; Roundtrip `bars`, `pickup`, `syllables`,
`input`, `micLatencyMs`, `rhythmLevel`.

---

### Paket 4 – Hören: Klänge, Schlussarten, Stimme heraushören, Intonationsgehör

Datei: `uebe-lab.html`. `ear.mode` bekommt vier neue Werte; die
Modus-Chips werden zu: **Intervalle · Klänge · Schlüsse · Akkordfolgen ·
Stimmen · Intonation**. Jeder Modus hat eigene Stufen im gemeinsamen
Bedienelement (Paket 6) und eigene Zähler in `ear.stats`.

#### 4a Intervalle – sechste Stufe

`INTERVAL_PRESETS` (Stufen) um `['Alle Richtungen', alle 12, 'level',
{ dirs: ['up', 'down', 'harmonic'] }]` ergänzen. Stufen 1–5 setzen `dirs`
auf `['up']`, Stufe 6 auf alle drei.

#### 4b „Klänge“ (Akkordqualität)

```js
const CHORD_QUALITIES = {
  maj:  { name: 'Dur',        semis: [0, 4, 7] },
  min:  { name: 'Moll',       semis: [0, 3, 7] },
  dim:  { name: 'vermindert', semis: [0, 3, 6] },
  aug:  { name: 'übermäßig',  semis: [0, 4, 8] },
  sus4: { name: 'Quartvorhalt (sus4)', semis: [0, 5, 7] },
  dom7: { name: 'Dominantsept', semis: [0, 4, 7, 10] },
};
const QUALITY_LEVELS = [
  { n: 1, label: 'Dur oder Moll, gebrochen',        set: ['maj', 'min'],                       play: 'broken',   inversion: 'root' },
  { n: 2, label: 'Dur oder Moll, zusammen',         set: ['maj', 'min'],                       play: 'block',    inversion: 'root' },
  { n: 3, label: 'dazu vermindert',                 set: ['maj', 'min', 'dim'],                play: 'block',    inversion: 'root' },
  { n: 4, label: 'dazu Quartvorhalt',               set: ['maj', 'min', 'dim', 'sus4'],        play: 'block',    inversion: 'root' },
  { n: 5, label: 'dazu übermäßig und Dominantsept', set: ['maj', 'min', 'dim', 'aug', 'sus4', 'dom7'], play: 'block', inversion: 'root' },
  { n: 6, label: 'alle, in Umkehrungen',            set: ['maj', 'min', 'dim', 'aug', 'sus4', 'dom7'], play: 'block', inversion: 'any' },
];
```

- Lage: Grundton zufällig 48–60, Töne in enger Lage; `broken` = aufwärts
  gebrochen, dann zusammen.
- Antwort: Tasten mit den Namen der Stufe. Nach dem Auflösen: Dur- und
  Mollfassung desselben Grundtons zum Vergleich antippbar.

#### 4c „Schlüsse“ (Schlussarten)

Antworten: **Ganzschluss · Halbschluss · Trugschluss · Plagalschluss**.
Symbole aus `CHORD_SYMBOLS`, gesetzt mit `voiceProgression` (wie
Akkordfolgen, stilgerechte Umkehrungen ab Stufe 5).

```js
const CADENCE_PHRASES = {
  full:      { major: [['I','IV','V','I'], ['I','ii','V','I'], ['I','vi','V7','I'], ['I','IV','I64','V','I']],
               minor: [['i','iv','V','i'], ['i','VI','V','i']] },
  half:      { major: [['I','IV','V'], ['I','vi','ii','V'], ['I','ii','V']],
               minor: [['i','iv','V'], ['i','VI','iv','V'], ['i','iv6','V']] },
  deceptive: { major: [['I','IV','V','vi'], ['I','ii','V7','vi']],
               minor: [['i','iv','V','VI']] },
  plagal:    { major: [['I','IV','I'], ['I','vi','IV','I'], ['I','V','IV','I']],
               minor: [['i','iv','i']] },
};
const CADENCE_LEVELS = [
  { n: 1, label: 'Ganz- oder Halbschluss',     types: ['full', 'half'],                         modes: ['major'], spread: 'close' },
  { n: 2, label: 'dazu Trugschluss',           types: ['full', 'half', 'deceptive'],            modes: ['major'], spread: 'close' },
  { n: 3, label: 'dazu Plagalschluss',         types: ['full', 'half', 'deceptive', 'plagal'],  modes: ['major'], spread: 'close' },
  { n: 4, label: 'auch in Moll',               types: ['full', 'half', 'deceptive', 'plagal'],  modes: ['major', 'minor'], spread: 'close' },
  { n: 5, label: 'weite Lage, Umkehrungen',    types: ['full', 'half', 'deceptive', 'plagal'],  modes: ['major', 'minor'], spread: 'open' },
  { n: 6, label: 'dazu phrygischer Halbschluss', types: ['full', 'half', 'deceptive', 'plagal'], modes: ['major', 'minor'], spread: 'open', phrygian: true },
];
```

- `['i','iv6','V']` (phrygischer Halbschluss) nur, wenn `phrygian: true`;
  zählt als Halbschluss.
- Nach dem Auflösen ein Satz, woran man es hört:
  Ganzschluss „endet auf dem Grundakkord, nach der Dominante: fertig.“;
  Halbschluss „bleibt auf der Dominante stehen — offen wie ein Komma.“;
  Trugschluss „die Dominante führt nicht nach Hause, sondern zur Mollfarbe
  der vi. Stufe.“; Plagalschluss „IV–I, der ‚Amen‘-Schluss: weich, ohne
  Leitton.“

#### 4d „Stimmen“ (Stimme im Satz heraushören)

```js
const PART_LEVELS = [
  { n: 1, label: 'Zweiklang: oberer Ton',      task: 'dyad',  ask: 'upper' },
  { n: 2, label: 'Zweiklang: unterer Ton',     task: 'dyad',  ask: 'lower' },
  { n: 3, label: 'Dreiklang: mittlerer Ton',   task: 'triad', ask: 'middle' },
  { n: 4, label: 'Akkord: meine Stimme',       task: 'satb',  ask: 'mine' },
  { n: 5, label: 'Drei Akkorde: meine Linie',  task: 'line',  chords: 3, spread: 'close' },
  { n: 6, label: 'Vier Akkorde, weite Lage',   task: 'line',  chords: 4, spread: 'open' },
];
```

- `dyad`: Intervall zufällig aus {kl./gr. Terz, Quarte, Quinte, kl./gr.
  Sexte}, Grundton 55–64, 2 s zusammen. Danach drei Einzeltöne (einer davon
  der gesuchte, zwei Nachbarn im Abstand von 1–2 Halbtönen) – „Welcher war
  der obere Ton?“ Antippen spielt ab, „Antworten“ wählt.
- `triad`: enger Dur- oder Molldreiklang; Antwortkandidaten wie oben.
- `satb`: vierstimmiger Tonika-Akkord aus `voiceChord`; gesucht ist der Ton
  der eigenen Stimme (`part`; ohne Profil wählbar);
  Kandidaten: die vier Akkordtöne in der Lage der eigenen Stimme
  (oktaviert), einer davon richtig.
- `line`: kurze Folge aus `EAR_PROGRESSIONS` (Stufe-3-Folgen, gekürzt auf
  `chords`), SATB gesetzt. Danach drei Linien einzeln in der Lage der
  eigenen Stimme: (1) die richtige, (2) die Linie einer anderen Stimme,
  oktaviert, (3) die richtige Linie mit einem Ton durch einen anderen
  Akkordton ersetzt. Alle drei müssen sich unterscheiden (sonst neu).
  „Welche Linie singst du?“
- Bei `satb`/`line` gibt es einen Knopf „Satz noch einmal – meine Stimme
  lauter“ (+6 dB auf der eigenen Stimme) als Hilfe; benutzte Hilfe zählt die
  Aufgabe als „mit Hilfe“ (nicht als Fehler, aber nicht für den
  Stufenvorschlag).

#### 4e „Intonation“ (zu hoch / zu tief)

```js
const TUNING_LEVELS = [
  { n: 1, label: 'Zwei Töne nacheinander',      kind: 'seq',    answers: ['tiefer', 'gleich', 'höher'] },
  { n: 2, label: 'Zwei Töne zusammen',          kind: 'unison', answers: ['tiefer', 'gleich', 'höher'] },
  { n: 3, label: 'Oktave',                      kind: 'octave', answers: ['zu eng', 'rein', 'zu weit'] },
  { n: 4, label: 'Quinte',                      kind: 'fifth',  answers: ['zu eng', 'rein', 'zu weit'] },
  { n: 5, label: 'Akkord: markierte Stimme',    kind: 'chordMarked', answers: ['zu tief', 'sauber', 'zu hoch'] },
  { n: 6, label: 'Akkord: welche Stimme?',      kind: 'chordWhich',  answers: ['S', 'A', 'T', 'B'] },
];
```

- Klang: Sägezahn durch Tiefpass 2,5 kHz (Obertöne machen Schwebungen
  hörbar), 1,4 s je Ton, Referenz zuerst bzw. unten.
- Bezug: Stufe 3 reine Oktave (1200 Cent), Stufe 4 reine Quinte (702 Cent),
  Stufe 5/6 gleichstufiger Akkord als „sauber“.
- Abweichung Δ adaptiv (2-runter-1-hoch-Treppe, konvergiert gegen ≈ 71 %
  richtig): Start 40 Cent; nach zwei richtigen in Folge Δ × 0,8; nach einem
  Fehler Δ × 1,25; Grenzen 3–60 Cent. In Stufe 1–5 ist in 25 % der Aufgaben
  Δ = 0 (Antwort „gleich/rein/sauber“), diese gehen nicht in die Treppe ein.
- Stufe 6: eine der vier Stimmen um ±Δ verstimmt; Δ startet bei 30 Cent.
- Anzeige: „Deine Schwelle heute: etwa 14 Cent“ = geometrisches Mittel der
  letzten 6 Umkehrpunkte der Treppe (erst ab 6 Umkehrpunkten anzeigen).
  Einordnung im Hilfetext: „Unter 10 Cent hören sehr geübte Ohren; 15–25
  Cent sind für Laiensänger:innen gut; ein Chor klingt ab etwa 20 Cent
  Abweichung hörbar unsauber.“
- In Stufe 5 wird die markierte Stimme vor dem Akkord einmal allein
  gespielt.

**Tests (`selfCheck`):** Klänge – jede Qualität erzeugt genau ihre
Halbtonmenge (mod 12), Umkehrungen in Stufe 6 enthalten alle Töne;
Schlüsse – jede Phrase endet auf dem richtigen Symbol (full: I/i nach V/V7;
half: V; deceptive: vi/VI nach V/V7; plagal: I/i nach IV/iv), Satz ohne
Parallelen (bestehende Prüfung); Stimmen – 500 `line`-Aufgaben: drei
paarweise verschiedene Linien, richtige Linie = Linie der eigenen Stimme;
Treppe – simulierte Hörer:in mit Schwelle 12 Cent,
`p(richtig) = 1/3 + 2/3 / (1 + exp(−(Δ − 12) / 3))` → Schätzung nach 60
Aufgaben zwischen 8 und 18 Cent in ≥ 95 % von 200 Läufen (vorab per
Simulation geprüft: 98 %, Median 12,6 Cent).

---

### Paket 5 – Singen mit Mikrofon: Intervalle treffen, Ton finden, Ton halten, Blattsingen und Diktat

Datei: `uebe-lab.html`. Der Reiter „Stimme“ heißt künftig **„Singen“** und
bekommt oben Modus-Chips: **Tuner · Intervalle singen · Ton finden · Ton
halten · Blattsingen · Diktat**. Diktat braucht kein Mikrofon, steht aber
hier, weil es dieselben Melodien nutzt.

#### 5a Gemeinsame Treffer-Logik

```js
/** Zustandsautomat für „Ton getroffen?“. Füttert sich mit geglätteten
 *  Tonhöhen (smoothPitch, 0,35 s) und nur mit Rahmen, deren clarity ≥ .85.
 *  hit: Median der letzten holdSec liegt innerhalb ±tolerance Cent um das
 *  Ziel (exakte Oktave). miss: nach timeoutSec ohne Treffer; gemeldet wird
 *  die Abweichung des am längsten gehaltenen Versuchs. */
function makePitchJudge({ target, tolerance = 50, holdSec = .5, timeoutSec = 8 }) { … }
// Ergebnis: { hit: bool, cents: number, octaveOff: -1|0|1 }
```

- Liegt der gehaltene Versuch genau eine Oktave daneben, zählt er als
  **Treffer mit Hinweis** („eine Oktave tiefer gesungen – der Ton stimmt“),
  weil Männer bei Frauen-Referenzen oft oktavieren. Für den Fortschritt
  zählt er als richtig.
- Nach jeder Aufgabe erklingt der Zielton zum Vergleich; die Nadel zeigt die
  eigene Abweichung.
- Alle Ziele liegen in `practiceRange(profile)`, jeweils 2 Halbtöne
  innerhalb.

#### 5b Intervalle singen

- Stufen = die sechs Intervall-Stufen aus „Hören“ (dieselben Presets).
  Toleranz je Stufe: 50, 50, 40, 35, 35, 30 Cent.
- Aufgabe: Anzeige „große Terz aufwärts“ (Solmisations-Hilfe umschaltbar:
  „do → mi“), Grundton 1,5 s, dann singen. Stufe 6 enthält „abwärts“.
- Grundton zufällig so, dass Grund- und Zielton im Umfang liegen.
- Gewichtung wie beim Hören: Fehler machen ein Intervall wahrscheinlicher
  (dieselbe Logik, eigener Speicher `singLog`).

#### 5c Ton finden

Übt, was in jeder Probe passiert: Die Chorleitung gibt einen Akkord oder
das a′, und jede:r muss den eigenen Einsatzton finden.

```js
const FIND_LEVELS = [
  { n: 1, label: 'Grundton aus dem Akkord',      cue: 'tonic',   ask: ['root'],                  modes: ['major'] },
  { n: 2, label: 'Grundton oder Quinte',         cue: 'tonic',   ask: ['root', 'fifth'],         modes: ['major'] },
  { n: 3, label: 'Grundton, Terz oder Quinte',   cue: 'tonic',   ask: ['root', 'third', 'fifth'], modes: ['major'] },
  { n: 4, label: 'auch in Moll',                 cue: 'tonic',   ask: ['root', 'third', 'fifth'], modes: ['major', 'minor'] },
  { n: 5, label: 'nach der Kadenz: Stufe 1–7',   cue: 'cadence', ask: ['degree'],                 modes: ['major', 'minor'] },
  { n: 6, label: 'Nur das a′ (Stimmgabel)',      cue: 'a4',      ask: ['fromA'] },
];
```

- `tonic`: Tonika-Akkord SATB, 2 s. `cadence`: I–IV–V–I (Moll i–iv–V–i).
  Anzeige z. B. „Singe die Terz“ bzw. „Singe die 6 (la)“.
- `fromA`: nur a′ (Kammerton aus den Tuner-Einstellungen), 2 s. Ziel ist ein
  Ton im eigenen Umfang mit Namen und Beziehung zu a, aus
  {Einklang/Oktaven, Quarte, Quinte, große/kleine Terz, große/kleine Sexte}
  auf- oder abwärts, z. B. „d′ – die Quinte unter a′“, „fis – große Sexte
  unter a“. Toleranz 40 Cent.
- Toleranz Stufen 1–5: 50, 50, 40, 40, 35 Cent.
- Zielton in der Oktave, die der Mitte des eigenen Umfangs am nächsten
  liegt.

#### 5d Ton halten

```js
const HOLD_LEVELS = [
  { n: 1, label: '3 Sekunden',                  sec: 3, dyn: 'mf' },
  { n: 2, label: '5 Sekunden',                  sec: 5, dyn: 'mf' },
  { n: 3, label: '8 Sekunden',                  sec: 8, dyn: 'mf' },
  { n: 4, label: '5 Sekunden, lauter werden',   sec: 5, dyn: 'cresc' },
  { n: 5, label: '8 Sekunden, leise',           sec: 8, dyn: 'pp' },
  { n: 6, label: 'An- und Abschwellen, 8 s',    sec: 8, dyn: 'messa' },
];
```

- Zielton: Mitte des Umfangs ± 0–4 Halbtöne (zufällig), 1,5 s vorgespielt,
  dann Balken mit Countdown.
- Messung ab 0,4 s nach dem Einsatz auf den geglätteten Werten (Vibrato ist
  damit herausgemittelt): **Lage** (Mittelwert in Cent), **Ruhe**
  (Standardabweichung), **Trend** (Steigung der Ausgleichsgeraden in
  Cent/s).
- Rückmeldung in Worten, z. B. „Lage +6 Cent · ruhig (±5 Cent) · sinkt am
  Ende leicht (−3 Cent/s)“. Bei `cresc`/`messa` zusätzlich: „Beim
  Lauterwerden 12 Cent gestiegen – die Tonhöhe beim Lauterwerden bewusst
  halten.“ (Pegel aus dem RMS von `detectPitch`.)
- „Treffer“ im Fortschritt: |Lage| ≤ 20 Cent und Ruhe ≤ 12 Cent und |Trend|
  ≤ 4 Cent/s.

#### 5e Blattsingen und Diktat

Kurze Melodien in relativer Solmisation. Der Grundton wird so gewählt, dass
die Melodie im eigenen Umfang liegt.

```js
// Stufen als Tonleiterstufen relativ zu do (0 = do, 4 = so, −3 = tiefes so).
const SIGHT_LEVELS = [
  { n: 1, label: 'do re mi',                 pool: [0, 1, 2],                        len: [3, 4], maxLeap: 1, start: [0, 2],    end: [0] },
  { n: 2, label: 'dazu so',                  pool: [0, 1, 2, 4],                     len: [4, 4], maxLeap: 2, start: [0, 2, 4], end: [0] },
  { n: 3, label: 'Pentatonik (dazu la)',     pool: [0, 1, 2, 4, 5],                  len: [5, 5], maxLeap: 4, start: [0, 2, 4], end: [0] },
  { n: 4, label: 'dazu fa und tiefes so',    pool: [-3, 0, 1, 2, 3, 4, 5],           len: [5, 6], maxLeap: 4, start: [0, 2, 4], end: [0] },
  { n: 5, label: 'ganze Tonleiter',          pool: [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7], len: [6, 6], maxLeap: 4, start: [0, 2, 4], end: [0], rhythm: true },
  { n: 6, label: 'Moll (la) und Oktave',     pool: [-2, -1, 0, 1, 2, 3, 4, 5],       len: [6, 8], maxLeap: 7, start: [-2, 0, 2], end: [-2], rhythm: true },
];
```

Regeln für den Generator (verbindlich):
- Ein Sprung (> 1 Stufe) wird durch einen Schritt in Gegenrichtung
  aufgelöst – außer der nächste Ton setzt einen Dreiklang fort (do–mi–so,
  la–do–mi).
- Nie zwei gleiche Töne hintereinander in Stufe 1–3; nie derselbe Ton mehr
  als dreimal.
- Ab Stufe 5 (`rhythm`): Viertel und Halbe, letzter Ton Halbe; sonst alles
  Viertel.
- Stufe 6: Stufe −2 ist la (Moll-Grundton); klingt in natürlichem Moll;
  Oktavsprung la–la′ höchstens einmal.
- Wiederholungssperre: nie dieselbe Melodie zweimal in Folge.

**Blattsingen:** Anzeige der Silben (oder Zahlen) groß, darunter einfache
Notenzeile (Violinschlüssel für S/A, oktavierter Violinschlüssel für
T, Bassschlüssel für B). Vorab Tonika-Akkord und Grundton. Das Mikrofon
folgt Ton für Ton (Treffer-Logik, `holdSec` .3, Toleranz 50/50/45/40/40/35
Cent); der aktuelle Ton ist hervorgehoben, getroffene werden grün. Kein
Tempo, keine Zeitgrenze pro Ton. Danach erklingt die Melodie.

**Diktat:** Tonika-Akkord, dann Melodie zweimal (Tempo ♩ = 72). Der erste
Ton ist vorgegeben. Antwort über Silbentasten (nur die Silben der Stufe),
„Noch einmal hören“ bis zu dreimal. Richtig = alle Töne richtig; im
Fortschritt zählt außerdem der Anteil richtiger Töne.

**Tests (`selfCheck`):** Treffer-Logik mit synthetischen Tonhöhen
(Zielton ±20 Cent → Treffer; +60 → kein Treffer; exakt −1200 → Treffer mit
Oktavhinweis; Vibrato ±50 Cent um das Ziel → Treffer); alle Ziele aller
Modi × 4 Stimmen in `practiceRange` ± 2; Ton finden Stufe 6 – Name und
MIDI stimmen überein (`spell`); Ton halten – synthetische Linie mit
Trend −5 Cent/s → Trend −5 ± .5; 1000 Melodien je Blatt-Stufe: nur Töne
aus `pool`, Länge in `len`, Start/Ende korrekt, Sprungregel eingehalten.

---

### Paket 6 – Fortschritt über Tage und einheitliche Stufen

#### 6a Fortschrittsspeicher (app.js)

Die Tools schreiben **nicht selbst**, sondern melden an die App, damit es
nur eine schreibende Stelle gibt:

```js
window.chorProgress = {
  /** entry: { area, level, right: bool, help?: bool, value?: number } —
   *  bzw. für das Einsingen { area: 'warmup', minutes, program }. */
  add(entry) { … },          // sammelt, schreibt gebündelt (1 s)
  summary(days = 7) { … },   // Promise: Tage, Minuten, je Bereich Stufe und Quote
  levelHint(area) { … },     // Promise: { level, hint: 'up' | 'down' | null }
  memory(key, value) { … },  // dauerhafte Gewichtungen (intervalLog, singLog)
};
```

Speicher: `DB.metaPut({ key: 'progress', type: 'progress', data })`.

```js
data = {
  v: 1,
  days: {
    '2026-10-12': {
      warmup: { minutes: 5.7, programs: { morgens: 1 } },
      interval: { 3: { n: 12, right: 10, help: 0 } },
      tuning:   { 2: { n: 20, right: 14, help: 0, thresholdCents: 14.2 } },
      // … je Bereich je Stufe
    },
  },
  memory: { intervalLog: { 4: [1, 0, 1, …] }, singLog: { … } },
  levels: { interval: 3, tuning: 2, … },   // zuletzt benutzte Stufe je Bereich
  today: { date: '2026-10-12', plan: 'full', done: ['warmup', 'ear'] }, // Paket 7
};
```

- Bereiche (`area`): `warmup, rhythm, interval, quality, cadence,
  progression, parts, tuning, singInterval, findTone, hold, sight,
  dictation`.
- Aufbewahrung 180 Tage, ältere Tage beim Schreiben löschen.
- „Alle Daten löschen“ löscht auch `progress` (Liste im README ergänzen).
- `levelHint`: betrachtet die letzten 20 Aufgaben ohne Hilfe auf der
  aktuellen Stufe. **„up“**, wenn ≥ 85 % richtig und die Aufgaben von
  mindestens zwei verschiedenen Tagen stammen; **„down“**, wenn von den
  letzten 12 weniger als 50 % richtig sind; sonst `null`.
- Die bisher nur für die Sitzung geführte Intervall-Gewichtung
  (`ear.stats.intervalLog`) wird über `memory()` dauerhaft.

#### 6b Einheitliches Stufen-Element

Ein Bauteil für alle Stufen in `uebe-lab.html` (Intervalle, Klänge,
Schlüsse, Akkordfolgen, Stimmen, Intonation, Rhythmus, Intervalle singen,
Ton finden, Ton halten, Blattsingen/Diktat):

- Chips `1 … 6`, dahinter Text „Stufe 3: dazu ii, iii und V⁷“ bzw. „Eigene
  Auswahl“, ?-Knopf mit der Liste aller Stufen.
- Bei `levelHint = 'up'`: kleiner Punkt am nächsten Chip und Satz „Stufe 3
  sitzt – Stufe 4 ausprobieren?“; bei `down`: „Eine Stufe zurück kann
  helfen.“ Nie automatisch wechseln.
- Die gewählte Stufe je Bereich wird in `levels` gemerkt.

#### 6c Wochenansicht

In Einstellungen → Tools unter „Heute üben“ ein aufklappbarer Bereich
„Diese Woche“:

- sieben Punkte Mo–So (gefüllt = geübt), Satz „An 4 von 7 Tagen geübt“ –
  keine Serien, kein „Serie verloren“;
- Minuten je Gruppe: Einsingen · Hören · Singen · Rhythmus;
- je benutzter Bereich: aktuelle Stufe und Quote der letzten 20 Aufgaben;
- Intonation: Schwelle der letzten 30 Tage als kleine Linie.

**Tests:** Roundtrip `progress` (neu, kaputt, v fehlt → leer); 200 Tage
Einträge → nur 180 bleiben; `levelHint` an konstruierten Folgen (17/20 an
einem Tag → null; 17/20 an zwei Tagen → up; 5/12 → down); Hilfe-Aufgaben
zählen nicht; gleichzeitige `add()` aus zwei iframes gehen nicht verloren.

---

### Paket 7 – „Heute üben“

Eine geführte Einheit von etwa 12 Minuten (kurz: etwa 6), zusammengestellt
aus Stimmprofil und Fortschritt.

**Ort:** erste Karte in Einstellungen → Tools: „Heute üben · ca. 12 Min.“
mit Umschalter „ca. 6 Min.“. Darunter die Schritte als Liste mit Haken.

**Plan (deterministisch aus Datum, Profil und Fortschritt):**

| Schritt | voll | kurz | Regel |
|---|---|---|---|
| 1 Einsingen | Programm nach Regel | `schnell` | letztes Einsingen > 6 Tage her → `kurz`; vor 10 Uhr → `morgens`; sonst reihum nach Tagesnummer: `schnell, intonation, morgens, hoehe, tiefe, kurz`. Belastung aus dem Profil |
| 2 Hören | 10 Aufgaben | 6 Aufgaben | schwächster Bereich aus `interval, quality, cadence, parts, tuning` (niedrigste Quote der letzten 14 Tage bei ≥ 10 Aufgaben; Intonation gilt als schwach bei Schwelle > 25 Cent); ohne Daten reihum. Stufe = zuletzt benutzte |
| 3 Singen | 8 Aufgaben | – | reihum: Intervalle singen, Ton finden, Blattsingen. Wurde das Mikrofon verweigert (`micDenied` im Fortschritt) → Diktat |
| 4 Rhythmus | 6 Runden | – | Modus reihum: Nachklatschen, Vom Blatt, Mitklatschen; Stufe = zuletzt benutzte |

**Übergabe an die Tools:** Die Karte öffnet die Tool-Seite mit Parametern
und die Seite startet vorbereitet (nicht automatisch spielend):

```
einsingen.html?embedded&from=today&program=<id>
uebe-lab.html?embedded&from=today&tab=ear&mode=<mode>&level=<n>&tasks=10
uebe-lab.html?embedded&from=today&tab=voice&mode=<mode>&level=<n>&tasks=8
uebe-lab.html?embedded&from=today&tab=rhythm&mode=<mode>&level=<n>&rounds=6
```

- Unbekannte oder fehlende Parameter → normales Verhalten.
- Ist die Menge erreicht (Programm zu Ende, Aufgaben/Runden gezählt),
  meldet das Tool `parent.postMessage({ type: 'chor-tool-done', step,
  stats }, location.origin)` und zeigt „Fertig ✓ – weiter mit Heute üben“;
  dieser Knopf sendet `{ type: 'chor-tool-close' }`, die App schließt den
  Rahmen und hakt den Schritt ab (`progress.today`).
- Schritte sind in beliebiger Reihenfolge und einzeln überspringbar. Am
  nächsten Tag beginnt ein neuer Plan.
- Die App prüft bei jeder Nachricht `event.origin === location.origin` und
  `event.source` gegen das Tool-iframe.

**Tests:** Planfunktion mit festen Daten (Datum, leerer/voller Fortschritt,
Mikrofon verweigert, vor/nach 10 Uhr) → erwartete Pläne; Parameter werden
in jedem Tool gelesen und falsche Werte ignoriert; `chor-tool-done` aus
fremder Quelle wird ignoriert.

---

### Paket 8 – Groove Lab: Chor-Ansicht, Aufgaben, neue Grooves

Datei: `groove-lab.js` (+ `strings.js` DE/EN/PL).

#### 8a Zwei Ansichten

- Kopfzeile: Umschalter **Chor · Studio**. „Studio“ = heutige Oberfläche mit
  allen sechs Reitern, unverändert. „Chor“ ist Standard beim Öffnen über
  Einstellungen → Tools; das Easter Egg öffnet weiter „Studio“. Gewählte
  Ansicht wird gemerkt (`view` im gespeicherten Zustand, Standard `choir`
  bzw. `studio` je nach Einstieg, solange nichts gespeichert ist).
- Chor-Ansicht, eine Seite ohne Reiter, von oben nach unten: Aufgabe
  (Karte mit Titel, zwei Sätzen Anleitung, ?-Knopf) · Groove (nur `cat`
  `calm` und die neuen Chor-Grooves, plus „Kein Beat“) · Tonart und
  Akkordfolge (bestehende Auswahl) · Stimmen (bestehende SATB-Zeilen
  an/Fokus/stumm, eigene Stimme markiert) · Liegeton · Tempo. Klang,
  Mixer, Keys, Arp, Automation, LFO sind hier ausgeblendet; die
  Zustandsdaten bleiben unverändert.
- Anzeige „Jetzt“: großer Akkordname (z. B. „F“) und – je Aufgabe – der
  Zielton („Terz: a“), mit `spell`-Schreibweise.

#### 8b Aufgaben

Eine Aufgabe setzt beim Wählen einen Teil des Zustands (über die
bestehenden Setter, ein Undo-Schritt) und bestimmt die Anzeige.

```js
const CHOIR_TASKS = [
  { id: 'meineStimme', title: 'Singe deine Stimme mit',
    help: ['Der vierstimmige Satz klingt, deine Stimme ist hervorgehoben. Sing sie mit — erst mit, dann versuch, sie allein zu halten.',
      'Tipp: Tempo langsam, dann steigern.'],
    set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'cadence', bpm: 72 }, own: 'focus', display: 'ownNote', groove: 'Minimal Click' },
  { id: 'minusEins', title: 'Deine Stimme fehlt',
    help: ['Die anderen drei Stimmen klingen, deine ist stumm. Füll die Lücke.',
      'Wenn du unsicher wirst: kurz auf „Singe deine Stimme mit“ wechseln und zurück.'],
    set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'cadence', bpm: 72 }, own: 'mute', display: 'ownNote', groove: 'Minimal Click' },
  { id: 'bass', title: 'Singe die Grundtöne',
    help: ['Sing zu jedem Akkord seinen Grundton — das ist das Fundament, auf dem der Chor stimmt.',
      'Tiefe Stimmen in ihrer Lage, hohe eine Oktave höher.'],
    set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'pop', bpm: 80 }, satb: { B: 'focus' }, display: 'root', groove: 'Backbeat Open' },
  { id: 'terzen', title: 'Singe die Terz',
    help: ['Sing zu jedem Akkord seine Terz. Die Anzeige nennt sie dir.',
      'Die Terz entscheidet über Dur und Moll — und wird im Chor am leichtesten zu tief.'],
    set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'pop', bpm: 76 }, display: 'third', groove: 'Backbeat Open' },
  { id: 'liegeton', title: 'Tonleiter zum Liegeton',
    help: ['Nur der Grundton mit Quinte klingt. Sing langsam die Tonleiter hinauf und hinunter und hör, wie jeder Ton zum Liegeton steht.',
      'Bei 3 und 7 genau hinhören: Die große Terz eher knapp, der Leitton hoch genug.'],
    set: { chordsOn: false, droneOn: true, droneFifth: true, melodyOn: false, arpOn: false, progId: 'drone', bpm: 60 }, display: 'scale', groove: null },
  { id: 'pentatonik', title: 'Improvisieren mit fünf Tönen',
    help: ['Erfinde kurze Melodien nur aus den fünf angezeigten Tönen — mit ihnen kann nichts schief klingen.',
      'Erst ein Ton, dann zwei, dann kleine Motive. Pausen sind erlaubt und gut.'],
    set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'pop', modeId: 'major', bpm: 88 }, display: 'pentatonic', groove: 'Backbeat Open' },
  { id: 'echo', title: 'Echo',
    help: ['Die App singt einen Takt vor, im nächsten Takt singst du ihn nach.',
      'Erst genau nachsingen, später leicht verändern — so entsteht Frage und Antwort.'],
    set: { chordsOn: true, melodyOn: true, arpOn: false, progId: 'cadence', bpm: 84 }, melody: 'Call & Response', melodyAltBars: true, display: 'echo', groove: 'Minimal Click' },
  { id: 'zweiVier', title: 'Klatschen auf 2 und 4',
    help: ['Wie im Gospel: auf 2 und 4 klatschen, auf 1 und 3 mit dem Fuß.',
      'Die Anzeige blinkt auf 2 und 4. Erst im Sitzen, dann im Stehen mit Schritt zur Seite.'],
    set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'blues', bpm: 92 }, display: 'beats24', groove: 'Gospel Shuffle' },
  { id: 'swing', title: 'Swing-Achtel',
    help: ['Sprich zum Beat „du-ba du-ba“: das „du“ lang, das „ba“ kurz und spät — wie „lang-kurz“.',
      'Dann dieselbe Achtelbewegung auf einem Ton singen.'],
    set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'twoFiveOne', bpm: 120 }, display: 'swingSyllables', groove: 'Swing Ride' },
  { id: 'beatbox', title: 'Mundschlagzeug',
    help: ['Mach den Beat mit dem Mund mit: „bm“ für die Bassdrum, „ka“ für die Snare, „ts“ für die Hi-Hat.',
      'Wenn es sitzt: „Beat ausblenden“ — dann trägst du den Groove allein.'],
    set: { chordsOn: false, melodyOn: false, arpOn: false, bpm: 84 }, display: 'vocalPerc', groove: 'Vocal Perc Basic', fadeDrums: true },
];
```

- `own`: eigene Stimme (`part`) auf `focus`/`mute`,
  alle übrigen `on`. Ohne Profil fragt die Karte einmal „Welche Stimme
  singst du?“.
- `groove`: Name aus `DRUM_PATTERNS` (Index über den Namen suchen);
  `null` = Drums stumm.
- `melodyAltBars`: Melodie nur in ungeraden Takten, in geraden stumm (neues
  optionales Feld im Zustand, Standard `false`; im Studio als Schalter
  „Melodie jeden 2. Takt (Echo)“ sichtbar).
- `display`:
  - `ownNote` – Tonname der eigenen Stimme im aktuellen Akkord,
  - `root`/`third` – Grundton/Terz des klingenden Akkords
    (`chordPitchClasses`, bei `dominant` mit Leitton),
  - `scale` – Tonleiter der Tonart mit Silben, aktueller Übe-Ton groß,
  - `pentatonic` – die fünf Töne 1 2 3 5 6 der Tonart (in Moll 1 ♭3 4 5 ♭7),
  - `echo` – „Hören“ / „Du“ im Wechsel je Takt,
  - `beats24` – vier Felder, 2 und 4 leuchten,
  - `swingSyllables` – „du-ba“ je Schlag,
  - `vocalPerc` – eine Zeile je Spur mit den Silben aus `vocal` (8b unten),
    aktuelle Sechzehntel hervorgehoben.
- `fadeDrums`: Knopf „Beat ausblenden“ – Drums in 4 Takten auf 0, Knopf
  „Beat zurück“.

#### 8c Neue Grooves (nur anhängen, nie umsortieren)

```js
{ name: 'Gospel Shuffle', icon: 'users', meter: '4/4', cat: 'calm', kick: [0, 6, 8], clap: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], ghost: [14],
  swingUnit: 8, swing: .67,
  bass: [0, 6, 8, 14], bassNotes: [0, 2, 4, 5],
  roll: [[1.33, 1], [1.33, .6], [1.34, .85]] },
{ name: 'Swing Ride', icon: 'horn', meter: '4/4', cat: 'calm', kick: [0, 8], ghost: [4, 12], hat: [0, 4, 6, 8, 12, 14],
  swingUnit: 8, swing: .67,
  bass: [0, 4, 8, 12], bassNotes: [0, 2, 4, 5],
  roll: [[1.33, 1], [1.33, .6], [1.34, .85]] },
{ name: 'Vocal Perc Basic', icon: 'wind', meter: '4/4', cat: 'calm', kick: [0, 6, 8], snare: [4, 12], hat: [2, 6, 10], open: [14],
  vocal: { kick: 'bm', snare: 'ka', hat: 'ts', open: 'tsch' },
  bass: [0, 8], bassNotes: [0, 0],
  roll: [[1, 1], [1, .6], [2, .85]] },
```

- Icons `users`, `horn`, `wind` sind in `DRUM_PATTERNS` noch unbenutzt.
- `vocal` ist ein neues optionales Feld (nur Anzeige).
- `cat: 'calm'`, damit sie in der Chor-Ansicht erscheinen; im Studio stehen
  sie unter „calm“.

**Tests:** jede Aufgabe setzt nur existierende Zustandsfelder und gültige
Werte (`sanitize` ändert nichts); `groove`-Namen existieren; `display:
'third'` liefert für `pop` in C die Töne e, h, c, a und in a-Moll mit
`cadence` für V ein gis; `melodyAltBars` spielt in Takt 2 und 4 keine
Melodienote; neue Loops erfüllen die bestehenden Loop-Prüfungen (Schritte
im Takt, Bassnoten-Länge = Bass-Länge, Icons eindeutig); Roundtrip `view`,
`melodyAltBars`, gewählte Aufgabe.

---

## 5. Wenn ein Paket nicht sauber klappt

Wie in `ARBEITSANWEISUNG-CLAUDE-CODE.md` Abschnitt 5: Paket zurücksetzen,
im Bericht mit Grund vermerken, mit dem nächsten unabhängigen Paket
weitermachen. Abhängigkeiten: 2, 5 und 8 brauchen 1; 7 braucht 6; 5 und 6
sollten vor 7 fertig sein, sonst lässt 7 die fehlenden Schritte weg.

## 6. Abschluss

`BERICHT-DIDAKTIK.md` anlegen, Aufbau wie `BERICHT-UMSETZUNG.md`: Tabelle
Paket / Status / Commit / SW_VERSION / Tests (Zahlen), je Paket Dateien,
Änderungen, Abweichungen, dazu die Abschnitte „Zu entscheiden“ und
„Manuell auf echten Geräten prüfen“ (mindestens: Mikrofon-Einsatzerkennung
beim Klatschen auf iOS und Android, Latenz-Kalibrierung mit Bluetooth,
Tonhöhenerkennung bei Männerstimmen unter 100 Hz, Lesbarkeit der
Chor-Ansicht auf kleinen Bildschirmen).

Bekannte offene Punkte für „Zu entscheiden“:
- Soll „Heute üben“ auch auf der Startseite der App erscheinen?
- Soll das Blattsingen später einen festen Rhythmus prüfen (heute bewusst
  nicht)?
- Soll die Aufgabe „Singe die Terz“ per Mikrofon bewertet werden?
