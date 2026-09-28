# Arbeitsanweisung für Claude Code – Pop-Didaktik (Einsingen und Ausbildung)

Du bist erfahrene Chorleiterin/erfahrener Chorleiter eines Popchors,
Stimmbildner:in und Entwickler:in. Du überarbeitest Einsingen und Ausbildung
nach den Paketen unten. Musikalische und didaktische Entscheidungen sind hier
getroffen; die Übungsdaten stehen fertig im Format der App.

Antworte und kommentiere auf Deutsch.

**Diese Anweisung läuft unbeaufsichtigt.** Keine Rückfragen. Wo etwas unklar
bleibt: die Variante wählen, die näher am bestehenden Verhalten liegt, im
Bericht unter „Zu entscheiden“ notieren, weitermachen.

**Hintergrund:** Der Chor ist ein Popchor und übt ausschließlich nach Gehör.
Deshalb: sprechnaher, gerader Klang; Synkopen, Sechzehntel und Vorziehen statt
ungerader Taktarten; Pentatonik, Moll und Blue Notes; Stufenzahlen statt
Tonika-Do; Notation und Blattsingen treten in den Hintergrund.

Ausdrücklich **nicht** Teil dieses Auftrags:
- das Groove Lab (alle Ansichten, auch „Kurs“),
- neue Einsing-Programme (nur die acht bestehenden werden überarbeitet),
- ein Modul Notenlesen/Theorie,
- jeder Bezug zum Repertoire (Tonart/Tempo/Anfangston der Songs).

---

## 0. Vorbereitung

1. Branch `pop-didaktik` von aktuellem `main` anlegen. Nie auf `main`
   committen, nie mergen, nie force-pushen.
2. `CLAUDE.md`, `README.md`, `ARBEITSANWEISUNG-CLAUDE-CODE.md` (Abschnitte 1,
   3 und 5), `ARBEITSANWEISUNG-DIDAKTIK.md` und `BERICHT-DIDAKTIK.md` lesen.
3. Diese Datei im ersten Commit mit einchecken.

## 1. Feste Regeln

Es gelten **alle Regeln aus Abschnitt 1 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`**
(ein Paket = ein Commit + Push, `SW_VERSION` je Commit erhöhen – Stand bei
Erstellung dieser Anweisung `v350`, maßgeblich ist der Stand auf `main` –,
keine IDs ändern, neue Felder optional mit Standardwert und durch
`sanitize…` gereicht, Persistenz-Roundtrip Pflicht, keine Abhängigkeiten).
Zusätzlich:

- **IDs:** `EXERCISES`- und `PROGRAMS`-IDs bleiben. Neue Übungen bekommen
  neue IDs (unten festgelegt). `EAR_PROGRESSIONS`-IDs bleiben; neue anhängen.
- **Texte:** `einsingen.html` und `uebe-lab.html` sind nur deutsch. Nur wo
  `app.js`/`strings.js` betroffen sind (Schnellstart, Fortschritt), DE/EN/PL
  gemeinsam ändern.
- **Mikrofon:** wie bisher – nie im Hintergrund, nie aufzeichnen, nie
  speichern; `micOn()`/`micOff()`, dieselben `RECORDING_CONSTRAINTS`.
- **Wortwahl:** ermutigend, nie bewertend. Stimmgesundheit vor Klangideal:
  Jede Pop-Klang-Übung nennt, was bei Kratzen/Druck zu tun ist.
- **Stufen** bleiben 1–6 mit „Eigene Auswahl“; jede Stufe enthält die
  vorigen, wo nicht anders angegeben. Gespeicherte Stufennummern bleiben
  gültig (Bedeutung ändert sich, keine Umrechnung nötig), gespeicherte eigene
  Auswahlen bleiben unverändert.

## 2. Entscheidungen (verbindlich)

| Thema | Festlegung |
|---|---|
| Einsing-Programme | keine neuen; die acht bestehenden werden „popifiziert“ und dynamisch (Paket 3) |
| Dynamik der Programme | Programm-Plätze sind Funktionen (Pools aus 2–5 ähnlichen Übungen); je Start wird die am längsten nicht gesungene Übung eines Pools gewählt |
| Eigene Programme | bleiben fest (keine Pools); „Als Vorlage kopieren“ übernimmt die aktuell aufgelösten Übungen |
| Pop-Klang | sprechnah, hell (Twang), gerade; Belt nur leicht („Ruf“), nie bei Belastung „leicht“ in voller Fassung |
| Solmisation | Standard neu: Stufenzahlen (1–7); Tonika-Do bleibt wählbar. Gilt nur, wenn noch nichts gespeichert ist |
| Chromatik | Blue Notes (♭3, ♭7), ♯4 als Leitton zur 5, in Moll ♯6/♯7 – nur ab Stufe 6 und nur in festen Wendungen |
| Blattsingen | bleibt im Code, ist standardmäßig ausgeblendet (Einstellung „Blattsingen anzeigen“) |
| Ungerade und klassische Inhalte | 2/4, 2/2, 3/4, 5/4, 7/8, phrygischer Halbschluss, Quartsextvorhalt, sixte ajoutée: nur noch über „Eigene Auswahl“ |

## 3. Tests

Wie in `ARBEITSANWEISUNG-CLAUDE-CODE.md` Abschnitt 3: `einsingen.selfCheck()`
und `uebeLab.selfCheck()` erweitern (Liste der Fehler, leer = bestanden),
reine Funktionen über `window.einsingen` bzw. `window.uebeLab` exportieren,
Headless-Prüfung mit Playwright, Node-Prüfskripte unter `/tmp` (nicht
committen). Dazu `chorApp.selfTest()`, `chorApp.selfTestAsync()`,
`chorApp.selfTestMusic()` – alle müssen `[]` liefern. Sichtprüfung per
Screenshot (390 px) für jede neue oder geänderte Oberfläche. Die für jedes
Paket geforderten Prüfungen stehen am Paketende.

---

## 4. Pakete

### Paket 1 – Einsingen: Engine-Erweiterungen

**Ziel:** Die Übungen aus Paket 2 brauchen sechs kleine, optionale
Erweiterungen des Übungsformats in `einsingen.html`. Fehlt ein Feld, verhält
sich alles wie bisher.

#### 1a `kind: 'breathRhythm'` – tonlose Rhythmus-Atemübung

```js
pattern: [['f', 2], ['f', 2], ['fff', 8], ['', 4], …] // [Silbe, Länge in 16teln]; '' = Pause
```

- Keine Töne, keine Rückungen, Tempo = `bpmOf(ex)` ohne Belastungsfaktor
  (wie `kind: 'breath'`).
- Wiederholungen je Belastung: leicht 2, normal 3, kräftig 4
  (`BREATH_RHYTHM_REPEATS`). Je Wiederholung eine Runde im Plan
  (`addBreathRhythm` analog `addBreath`), Rundenlänge = Summe des Musters,
  auf `ROUND_GRID` aufgerundet.
- Klick auf jeder Zählzeit (wie Einzähler), Anzeige: aktuelle Silbe groß wie
  bei Körperübungen, darunter die Zeile des Takts mit Markierung.
- `toneless()` erkennt die neue Art mit; Umfangs- und Rückungsprüfungen
  überspringen sie.

#### 1b `chain: true` – Runden ohne Einstimmung aneinander

- Nur die erste Runde bekommt `cue` (Akkord bzw. Kadenz); ab Runde 2 ist
  `cue = 0`. Der Tonika-Akkord der neuen Runde klingt leise unter dem ersten
  Ton mit, damit die neue Tonart hörbar ist.
- `roundSteps` für Runden mit `cue = 0` ohne CUE rechnen; das Raster bleibt.

#### 1c `spoken: n` und `spokenText` – gesprochener Takt vor den Tönen

- Wirkt wie `delay: n` (16tel), aber die Anzeige zeigt in dieser Zeit
  „Sprich: {spokenText}“ statt einer Silbe; es klingt kein Melodieton.
- Einsatz der Töne danach wie gewohnt.

#### 1d `scoop: [i…]` und `falloff: [i…]` – Stilmittel je Ton

- Indizes in `notes`. `scoop`: Die Vorgabe (Melodie) gleitet in den ersten
  zwei 16teln des Tons von einem Halbton darunter in den Zielton.
  `falloff`: Im letzten Achtel des Tons fällt die Vorgabe um drei Halbtöne ab
  und blendet dabei aus.
- Die bestehende Gleit-Mechanik (`glide`) wiederverwenden; `glide` gilt
  weiter für ganze Übungen.
- Umfangsprüfungen zählen den Zielton, nicht den Schleifer/Abfall.

#### 1e `cutoffAt: [pos…]` – Abschluss-Klick

- Positionen in 16teln ab Übungsbeginn (inklusive `delay`/`spoken`). An jeder
  Position ein kurzer, hellerer Klick als der Einzähler; die Anzeige zeigt
  dort das Zeichen „t“ bzw. den im Hilfetext genannten Konsonanten
  (`cutoffLabel`, Standard „t“).

#### 1f `vibratoFrom: pos` (nur Anzeige) und `avoidLight: true`

- `vibratoFrom`: Bis zu dieser Position (16tel ab Übungsbeginn) zeigt die
  Anzeige „gerade“, danach „Vibrato erlaubt“.
- `avoidLight`: Die Übung wird bei Belastung „leicht“ in Programm-Pools
  (Paket 3) nicht gewählt. Als Einzelübung oder fester Programmplatz klingt
  bei „leicht“ ihre `easy`-Fassung.

**Prüfungen Paket 1:**
- Alle bestehenden Übungen × 4 Stimmen × 3 Belastungen: Plan identisch zu
  vorher (Segmente, Längen, Wurzeln) – die Erweiterungen verändern nichts,
  solange die Felder fehlen.
- Testübung `breathRhythm` mit Muster der Länge 48: 2/3/4 Runden je
  Belastung, jede Runde 48 Schritte, keine Wurzel (`root: null`).
- Testübung `chain`: Runde 1 hat `cue = CUE`, alle weiteren `cue = 0`,
  Runden liegen lückenlos hintereinander.
- `spoken: 16`: erster Ton beginnt bei Position 16, Anzeige-Text im
  Zeitraum 0–15 vorhanden.
- `cutoffAt: [12]`: genau ein Abschluss-Klick je Runde an Position
  `cue + 12`.
- Roundtrip: keine neuen gespeicherten Felder (nur Übungsdaten).

---

### Paket 2 – Einsingen: neue Übungen, Gruppen, Textanpassungen

#### 2a Gruppen

`GROUPS` neu (Reihenfolge = Anzeige), neue Farben `--g-atem`, `--g-pop`,
`--g-aussprache` (je mit `-bg`) im Stil der bestehenden:

```js
const GROUPS = [
  ['koerper', 'Körper & Haltung'],
  ['atem', 'Atem & Stütze'],
  ['lockern', 'Lockern'],
  ['resonanz', 'Resonanz & Vokale'],
  ['pop', 'Pop-Klang'],
  ['beweglich', 'Beweglichkeit'],
  ['aussprache', 'Aussprache & Groove'],
  ['hoehe', 'Höhe, Tiefe & Register'],
];
```

Umzug bestehender Übungen: `atem` → Gruppe `atem`; `katze` → Gruppe
`aussprache`. Alle anderen bleiben.

Kurzer Gruppenhinweis für `pop` (erscheint über der Gruppe in der
Übungsliste, Stil wie andere Hilfetexte): „Pop-Klang ist sprechnah, hell und
gerade – nichts davon heißt laut. Kratzt oder drückt es: leiser werden oder
die Runde auslassen.“

#### 2b Neue Übungen

Icons: für jede neue ID ein Icon im Stil der bestehenden (`icon` = ID).
Einfügen in `EXERCISES` bei der jeweiligen Gruppe; Reihenfolge innerhalb der
Gruppe wie unten.

**Gruppe `atem`** (nach `atem`):

```js
{ id: 'atemImpulse', group: 'atem', name: 'Atem-Impulse', how: 'f · s · sch im Groove, der Impuls kommt aus der Mitte', icon: 'atemImpulse', hint: 'f f fff', bpm: 96, kind: 'breathRhythm', lowStart: 0, top: 0,
  pattern: [['f', 2], ['f', 2], ['fff', 8], ['', 4],
            ['s', 2], ['s', 2], ['sss', 8], ['', 4],
            ['sch', 2], ['sch', 2], ['sch', 2], ['sch', 2], ['schhh', 8]],
  help: ['Jeder Konsonant bekommt einen kleinen Impuls aus der Körpermitte – eine Hand auf dem Bauch spürt ihn. Schultern und Brustkorb bleiben still.',
    'Nach jedem Impuls lässt der Bauch los, die Luft kommt von selbst zurück. Nicht nachatmen, nicht pressen. So entsteht die Luft für kurze, rhythmische Stellen im Song.'] },
{ id: 'abspannen', group: 'atem', name: 'Abspannen', how: 'Phrase auf „fu“, danach loslassen – die Luft kommt von selbst', icon: 'abspannen', hint: 'fu · loslassen', bpm: 84, lowStart: 3, top: 14,
  notes: [[4, 2], [3, 2], [2, 2], [1, 2], [0, 4]], syllables: rep('fu', 5),
  help: ['Fünf Töne auf „fu“ hinunter. Am Ende der Phrase den Bauch einfach loslassen: In der kurzen Pause strömt die Luft von allein ein, du musst nicht aktiv einatmen.',
    'So atmet man im Song zwischen zwei Zeilen – schnell, lautlos, ohne Schnappen und ohne die Schultern hochzuziehen.'] },
{ id: 'zwischenatmung', group: 'atem', name: 'Atmen im Groove', how: 'Eine Takt-Phrase, auf „4-und“ kurz atmen, weiter', icon: 'zwischenatmung', hint: 'no · atmen auf 4-und', bpm: 92, lowStart: 3, top: 16, breath: 2, chain: true,
  notes: [[0, 2], [2, 2], [4, 2], [2, 2], [0, 6]], syllables: rep('no', 5),
  help: ['Eine kurze Phrase, dann nur eine Achtel Zeit zum Atmen – auf „4-und“, direkt vor dem nächsten Einsatz. Jede Runde liegt einen Halbton höher und schließt ohne Pause an.',
    'Klein und leise atmen, nicht hochziehen: Die Luft fällt in den Bauch, weil er am Phrasenende loslässt. Genau diese Stelle geht im Popsong oft verloren.'] },
```

**Gruppe `pop`:**

```js
{ id: 'sprechSingen', group: 'pop', name: 'Sprechen → Singen', how: 'Erst sprechen, dann genauso singen', icon: 'sprechSingen', hint: 'Hey, na, wie geht’s?', bpm: 88, lowStart: 2, top: 11,
  spoken: 16, spokenText: '„Hey, na, wie geht’s?“',
  notes: [[4, 4], [2, 2], [1, 2], [0, 8]], syllables: ['Hey', 'na', 'wie', 'geht’s'],
  help: ['Im ersten Takt die Frage ganz normal sprechen, im zweiten mit genau demselben Gefühl singen – gleiche Stelle, gleiche Leichtigkeit, nur mit Tonhöhe.',
    'Nicht abdunkeln, kein „Opernmund“: Der Klang bleibt so nah an deiner Sprechstimme wie möglich. Das ist die Grundlage für fast jeden Popsong.'] },
{ id: 'twang', group: 'pop', name: 'Twang', how: 'Hell und schmal auf „nä“, dann denselben Klang auf „ja“', icon: 'twang', hint: 'nä · hell & schmal', bpm: 100, lowStart: 3, top: 16,
  notes: [[0, 2, .6], [2, 2, .6], [4, 2, .6], [2, 2, .6], [0, 8], [0, 2], [2, 2], [4, 2], [2, 2], [0, 8]],
  syllables: ['nä', 'nä', 'nä', 'nä', 'nä', 'ja', 'a', 'a', 'a', 'a'],
  help: ['Schmal, hell und ein bisschen frech – wie eine quäkende Ente oder ein nörgelndes Kind. Der Klang wird dadurch tragfähig, ohne dass du lauter wirst.',
    'Im zweiten Takt dieselbe Helligkeit auf „ja“ mitnehmen. Nur der Klang ist schmal – Hals und Kiefer bleiben locker. Drückt es: kleiner und leiser werden.'] },
{ id: 'ruf', group: 'pop', name: 'Ruf', how: '„Hey!“ rufen wie über die Straße – nicht schreien', icon: 'ruf', hint: 'Hey · leichter Belt', bpm: 84, lowStart: 4, top: 13, avoidLight: true,
  notes: [[4, 6], [2, 2], [0, 8]], syllables: ['Hey', 'ja', 'ja'],
  easyNotes: [[2, 6], [1, 2], [0, 8]], easySyllables: ['Hey', 'ja', 'ja'], easyHint: 'Terz statt Quinte',
  help: ['Rufen wie über die Straße zu jemandem, den du magst: sprechnah, hell, mit dem Twang von vorher – nicht schreien und nicht drücken.',
    'Nur nach dem Einsingen, nie mit kalter Stimme. Wird es eng oder kratzt es: sofort leiser, oder die Runde auslassen.'] },
{ id: 'geraderTon', group: 'pop', name: 'Gerader Ton', how: 'Backing-„uuh“: gerade halten, Vibrato erst am Ende', icon: 'geraderTon', hint: 'uuh · gerade', bpm: 72, lowStart: 5, top: 12, vibratoFrom: 12,
  notes: [[0, 16]], syllables: ['uuh'],
  help: ['Ein Ton auf „uuh“, vier Schläge: drei Schläge ganz gerade, ohne Vibrato – erst auf dem vierten darf es schwingen.',
    'Im Popchor klingen Backings gerade, sonst verschwimmen die Akkorde. Vibrato ist ein Stilmittel am Phrasenende, kein Dauerzustand.'] },
{ id: 'anschleifen', group: 'pop', name: 'Anschleifen & Abfallen', how: 'Von unten in den Ton, am Ende abfallen lassen', icon: 'anschleifen', hint: 'yeah · Slide', bpm: 76, lowStart: 3, top: 14,
  notes: [[4, 8], [2, 4], [0, 8]], syllables: ['yeah', 'oh', 'oh'], scoop: [0], falloff: [2],
  help: ['„yeah“ von knapp darunter in den Ton schleifen, halten, über „oh“ zum Grundton – und dort am Ende locker abfallen lassen.',
    'Schleifer und Fall-off funktionieren nur, wenn der Zielton sitzt: erst die Runde ohne Stilmittel singen, dann mit. Nicht bei jedem Ton – sonst wird es Kaugummi.'] },
{ id: 'riff', group: 'pop', name: 'Riff', how: 'Pentatonik-Lauf abwärts auf „yeah“', icon: 'riff', hint: 'ye-e-e-e-eah', bpm: 72, lowStart: 1, top: 19, breath: 8,
  notes: [[7, 2], [5, 1], [4, 1], [2, 1], [1, 1], [0, 6]], syllables: ['ye', 'e', 'e', 'e', 'e', 'ah'],
  easyNotes: [[4, 2], [2, 1], [1, 1], [0, 6]], easySyllables: ['ye', 'e', 'e', 'ah'], easyHint: 'vier Töne',
  help: ['Ein kurzer Lauf abwärts nur aus den Tönen der Pentatonik – wie ein kleines Soul-Riff. Leicht, fast gesprochen, nicht jeden Ton einzeln anstoßen.',
    'Erst langsam und sauber, dann mit dem Tempo-Regler schneller. Die Töne bleiben klar zu hören, auch wenn es schnell wird.'] },
```

**Gruppe `aussprache`** (`katze` zuerst, dann):

```js
{ id: 'pataka', group: 'aussprache', name: 'pa-ta-ka', how: 'Sechzehntel auf einem Ton: Lippen, Zunge, Gaumen', icon: 'pataka', hint: 'pa-ta-ka-ta', bpm: 84, lowStart: 5, top: 12,
  notes: [...Array(12).fill([0, 1]), [0, 4]],
  syllables: ['pa', 'ta', 'ka', 'ta', 'pa', 'ta', 'ka', 'ta', 'pa', 'ta', 'ka', 'ta', 'pa'],
  help: ['Sechzehntel auf einem Ton: „p“ mit den Lippen, „t“ mit der Zungenspitze, „k“ hinten am Gaumen. Der Kiefer macht nicht mit, er hängt locker.',
    'Wenn es sitzt: mit dem Regler schneller. Die Konsonanten werden kürzer, nicht lauter.'] },
{ id: 'vokalAufSchlag', group: 'aussprache', name: 'Vokal auf den Schlag', how: 'Konsonant vor dem Schlag, Vokal genau drauf', icon: 'vokalAufSchlag', hint: 'Sprung · Schrank …', bpm: 88, lowStart: 4, top: 12,
  notes: [[0, 4], [0, 4], [0, 4], [0, 4]], syllables: ['Sprung', 'Schrank', 'Strand', 'Pflicht'],
  help: ['Die Konsonanten kommen kurz vor dem Schlag, der Vokal liegt genau darauf: „Schp-RUNG“, nicht „Schprung“ mit dem „u“ zu spät.',
    'Wer auf den Konsonanten wartet, ist im Chor immer zu spät. Das ist das Geheimnis, warum ein Chor „zusammen“ klingt.'] },
{ id: 'schlussKons', group: 'aussprache', name: 'Schlusskonsonant', how: '„to-night“ – das t genau auf Schlag 4', icon: 'schlussKons', hint: 't auf 4', bpm: 80, lowStart: 4, top: 13, cutoffAt: [12], cutoffLabel: 't',
  notes: [[2, 4], [0, 8]], syllables: ['to', 'night'],
  help: ['„night“ ruhig halten und das „t“ genau auf Schlag 4 setzen – dort klickt es. Bis dahin bleibt der Vokal voll, kein Abschwellen vorher.',
    'Alle setzen den Schlusskonsonanten gemeinsam: zu früh klingt abgehackt, zu spät wie ein Nachzügler. Das „t“ ist kurz und klar, kein Spucken.'] },
{ id: 'diphthonge', group: 'aussprache', name: 'Englische Diphthonge', how: 'my · way · go · night: erster Vokal lang, zweiter spät', icon: 'diphthonge', hint: 'maa…i · wee…i', bpm: 76, lowStart: 4, top: 12,
  notes: [[0, 8], [0, 8], [0, 8], [0, 8]], syllables: ['my', 'way', 'go', 'night'],
  help: ['Den ersten Vokal lang halten, den zweiten erst ganz am Ende: „maa…i“, „wee…i“, „goo…u“, „naa…it“.',
    'Kommt der zweite Vokal zu früh, singt ihn jede:r an einer anderen Stelle – und der Akkord klingt unsauber. Gemeinsam spät, gemeinsam kurz.'] },
{ id: 'backingSilben', group: 'aussprache', name: 'Backing-Silben', how: 'bap · ba · dn-dn · daa · mm – kurz ist kurz', icon: 'backingSilben', hint: 'bap ba dn-dn daa', bpm: 92, lowStart: 3, top: 14,
  notes: [[0, 2, .5], [0, 2], [2, 1], [2, 1], [4, 6], [2, 4]], syllables: ['bap', 'ba', 'dn', 'dn', 'daa', 'mm'],
  help: ['Die typischen Silben aus Pop-Arrangements: „bap“ wirklich kurz, „dn-dn“ leicht und schnell, „daa“ voll bis zum Ende, „mm“ ohne Luftloch summen.',
    'Die Konsonanten machen den Groove – sie kommen knapp und präzise, der Klang dazwischen bleibt weich.'] },
```

#### 2c Textanpassungen bestehender Übungen

| ID | Feld | neu |
|---|---|---|
| `moll5` | `how` | „Fünf Töne auf „no“, in Moll“ |
| `mimemamomu` | `help[1]` anhängen | „Sprechnah bleiben, nicht künstlich abdunkeln – so klingt es auch im Popsong.“ |
| `vokale` | `help[1]` | „Ziel ist ein ausgeglichener Chorklang: Das „i“ nicht spitz, das „a“ nicht breit werden lassen. Im Pop bleiben die Vokale sprechnah – so, wie man das Wort sagen würde, nur länger.“ |
| `koloratur` | `help[0]` | „(Anfänger: „da“ oder „la“)“ ersetzen durch „(Anfänger: „da“; im Pop-Stil auch „yeah“)“ |
| `katze` | `help[1]` anhängen | „Für englische Texte gilt dasselbe: Der Groove hängt an kurzen, präzisen Konsonanten.“ |
| `nja` | `help[0]` anhängen | „Die Vorstufe zum Twang.“ |
| `summen` | – | unverändert |

`HELP.program` neu (ersetzt den ganzen Eintrag):

1. „Das Programm spielt mehrere Übungen automatisch nacheinander – wie der
   Anfang einer Probe: lockern, Klang nach vorn, Pop-Klang und Aussprache,
   dann Beweglichkeit und Höhe, zum Schluss ein ruhiger Ausklang.“
2. „Jeder Platz im Programm hat eine Aufgabe, für die es mehrere ähnliche
   Übungen gibt. Bei jedem Start kommt die an die Reihe, die du am längsten
   nicht gesungen hast – so wird es nicht langweilig, und trotzdem ist alles
   drin. Mit ⇄ tauschst du eine Übung vor dem Start gegen eine andere
   derselben Aufgabe.“
3. „Jede Übung beginnt mit einem Akkord und steigt dann Runde für Runde einen
   Halbton, bevor sie wieder zurückgeht. Zwischen zwei Übungen ist ein halber
   Takt Pause.“
4. „Höhe und Tiefe ersetzen kein Einsingen – erst Kurz, dann eines davon.“
5. „Eigene Programme: „+ Eigenes Programm“ oder im Menü (⋯) einer Karte „Als
   Vorlage kopieren“. Eigene Programme bleiben immer gleich.“

**Prüfungen Paket 2:**
- Neue Übungen × 4 Stimmen × 3 Belastungen: 0 Töne außerhalb des Übe-Umfangs
  (Zielton zählt, siehe 1d); `syllables.length === notes.length` (auch
  `easy…`); Rundenlänge ein Vielfaches von `ROUND_GRID`.
- `atemImpulse`: Musterlänge 48, Runden 2/3/4.
- `zwischenatmung`: Runden lückenlos (Paket 1b), jede Runde 16 Schritte ab
  Runde 2.
- `ruf` bei „leicht“: klingt die Terz-Fassung.
- Jede Gruppe in `GROUPS` hat mindestens eine Übung; jede Übung hat eine
  Gruppe aus `GROUPS` und ein Icon.

---

### Paket 3 – Einsingen: bestehende Programme dynamisch und pop

**Ziel:** Die acht Programme (IDs unverändert) bestehen aus Plätzen mit einer
Funktion. Ein Platz ist entweder eine feste Übung (`'summen'`) oder ein Pool
(`'@vorn'`). Beim Start wird jeder Pool zu einer konkreten Übung aufgelöst –
jedes Mal eine andere.

#### 3a Pools

```js
// Funktion → ähnliche Übungen. Reihenfolge = Vorrang bei Gleichstand.
const POOLS = {
  koerper:    ['dehnen', 'kiefer', 'haltung'],
  atem:       ['atem', 'atemImpulse', 'abspannen', 'zwischenatmung'],
  lockern:    ['lippen', 'strohhalm5', 'strohhalm'],
  gleiten:    ['sirene', 'strohhalm', 'eule'],
  vorn:       ['twang', 'nja', 'mimemamomu'],
  popklang:   ['sprechSingen', 'geraderTon', 'ruf'],
  vokale:     ['vokale', 'umlaute', 'diphthonge'],
  aussprache: ['vokalAufSchlag', 'schlussKons', 'backingSilben', 'katze', 'pataka'],
  beweglich:  ['dreiklang', 'riff', 'staccatoLegato', 'koloratur'],
  stil:       ['anschleifen', 'riff'],
  vonOben:    ['eule', 'kopfAbwaerts'],
  hoehe:      ['oktave', 'kopfAbwaerts', 'eule'],
  tiefe:      ['tiefe', 'tiefeGleiten'],
  intonation: ['durMoll', 'moll5', 'mollDreiklang', 'akkord'],
  ausklang:   ['summen', 'strohhalm'],
};
```

#### 3b Programme (ersetzen die Einträge in `PROGRAMS`, IDs und Namen bleiben)

```js
const PROGRAMS = [
  { id: 'kurz', name: 'Kurz', about: 'Vor der Probe – jedes Mal etwas anders',
    items: [['@lockern', 3], ['@vorn', 3], ['@popklang', 2], ['@beweglich', 3], ['@hoehe', 3], ['@ausklang', 3, 'down']] },
  { id: 'lang', name: 'Ausführlich', about: 'Alles einmal, in Ruhe',
    items: [['@atem'], ['@lockern', 4], ['@gleiten', 3], ['zwerchfell', 3], ['@vorn', 3], ['@vorn', 3], ['@popklang', 3],
      ['@vokale', 2], ['@aussprache', 2], ['@aussprache', 2], ['@beweglich', 4], ['@stil', 3], ['@hoehe', 4], ['@ausklang', 4, 'down']] },
  { id: 'schnell', name: 'Schnell', about: 'Wenn wenig Zeit ist',
    items: [['@lockern', 2], ['@gleiten', 2], ['@vorn', 3], ['@popklang', 2], ['@beweglich', 3], ['@ausklang', 2, 'down']] },
  { id: 'morgens', name: 'Morgens', about: 'Sanft: erst Körper, dann von oben',
    items: [['dehnen'], ['kiefer'], ['@lockern', 3], ['summen', 3, 'down'], ['@vonOben', 3], ['sprechSingen', 3], ['@vorn', 3], ['dreiklang', 3]] },
  { id: 'intonation', name: 'Intonation', about: 'Gerade Töne, Vokale, Terzen und Akkord',
    items: [['haltung'], ['@lockern', 3], ['summen', 2, 'down'], ['@vokale', 2], ['geraderTon', 2], ['@vokale', 2], ['@intonation', 3], ['akkord', 1], ['messa', 2]] },
  { id: 'hoehe', name: 'Höhe', about: 'Von oben, mit Twang, dann Sprünge',
    items: [['dehnen'], ['@lockern', 4], ['sirene', 4], ['@vonOben', 4], ['twang', 3], ['dreiklang', 5], ['ruf', 3], ['oktave', 4], ['summen', 3, 'down']] },
  { id: 'tiefe', name: 'Tiefe', about: 'Für tiefe Stimmen und tiefe Stellen',
    items: [['haltung'], ['lippen', 3, 'down'], ['sprechSingen', 3, 'down'], ['summen', 3, 'down'], ['@tiefe', 3, 'down'], ['@tiefe', 4, 'down'], ['@vokale', 2], ['moll5', 2, 'down']] },
  { id: 'auftritt', name: 'Vor dem Auftritt', about: 'Schonend und wach, nichts ausreizen',
    items: [['haltung'], ['@atem'], ['@lockern', 3], ['summen', 2, 'down'], ['@vorn', 3], ['@aussprache', 2], ['geraderTon', 2], ['@vokale', 2]] },
];
```

#### 3c Auflösung (reine Funktion)

```js
/** resolveProgram(p, rotation, load) → { ...p, items: [[id, limit, dir, pool|null], …] } */
```

1. Feste Plätze zuerst reservieren (ihre IDs gelten als „schon im Programm“).
2. Pool-Plätze in Programmreihenfolge auflösen. Kandidaten: Pool-Übungen, die
   (a) noch nicht im Programm sind, (b) bei `load === 'leicht'` nicht
   `avoidLight` haben. Gewählt wird die mit dem kleinsten
   `rotation.used[id]` (fehlend = −1 = „noch nie“); bei Gleichstand die
   frühere im Pool.
3. Bleibt kein Kandidat (darf bei den eingebauten Programmen nicht
   vorkommen, siehe Prüfungen): Platz entfällt.
4. Das Ergebnis trägt je Platz den Pool-Namen mit (für ⇄ und Anzeige).

Die Stimme spielt für die Auswahl keine Rolle; Umfang und Rückungen regelt
wie bisher `exerciseRange`.

#### 3d Rotation speichern

- Neues Feld im Tool-Stand: `rotation: { n: 0, used: {} }`.
  `sanitize`: `n` ganze Zahl 0…1e9 (sonst 0); `used` nur bekannte Übungs-IDs
  mit ganzen Zahlen 0…n (sonst weglassen).
- Beim **Start eines Programms** (Play im Programmmodus, auch Autostart per
  `?program=`) für jeden aufgelösten Platz in Programmreihenfolge
  `used[id] = ++n`, dann speichern. Durchblättern, Karten ansehen oder ⇄
  zählen nicht.
- Einzelübungen und eigene Programme verändern `rotation` nicht.

#### 3e Oberfläche

- Programmkarten zeigen die aktuell aufgelöste Fassung (Icons, Dauer). Der
  Untertitel bleibt `about`.
- In der Programmansicht (Balken mit allen Übungen) erhält jeder Pool-Platz
  vor dem Start ein kleines „⇄“ (≥ 44 px Tippfläche, `aria-label` „Andere
  Übung für {Funktion}“). Ein Tipp wählt den nächsten zulässigen Kandidaten
  in der Reihenfolge von 3c (zyklisch). Die getauschte Auswahl gilt für
  diesen Start; nach dem Start verschwinden die ⇄.
- Anzeigenamen der Funktionen (für `aria-label` und eine kleine Zeile unter
  der Übung): koerper „Körper“, atem „Atem“, lockern „Lockern“, gleiten
  „Gleiten“, vorn „Klang nach vorn“, popklang „Pop-Klang“, vokale „Vokale“,
  aussprache „Aussprache“, beweglich „Beweglichkeit“, stil „Stilmittel“,
  vonOben „Von oben“, hoehe „Höhe“, tiefe „Tiefe“, intonation „Intonation“,
  ausklang „Ausklang“.
- „Als Vorlage kopieren“ übernimmt die aufgelösten IDs (inklusive ⇄-Wahl).
  Der Editor eigener Programme bleibt ohne Pools.

#### 3f Länge von Kurz/Ausführlich

`fitted()` arbeitet auf dem aufgelösten Programm; der `fitCache`-Schlüssel
enthält zusätzlich die aufgelösten IDs. `fitItems` bleibt wie es ist.

**Prüfungen Paket 3:**
- Für alle 8 Programme × 4 Stimmen × 3 Belastungen × 12 aufeinanderfolgende
  simulierte Starts (Rotation fortgeschrieben): keine doppelte Übung in einem
  Programm, kein Platz entfällt, bei „leicht“ nie `ruf` aus einem Pool.
- Wechsel: In `kurz` hat jeder Pool mit ≥ 2 zulässigen Kandidaten bei zwei
  aufeinanderfolgenden Starts unterschiedliche Übungen; nach so vielen
  Starts, wie der größte Pool Kandidaten hat, kam jede Pool-Übung mindestens
  einmal vor.
- Dauer: `kurz` und `lang` bei allen Längen (3/5/7 bzw. 10/15/20 Min) × 4
  Stimmen × 12 Starts innerhalb ±20 %; übrige Programme: Dauer je Start
  höchstens ±25 % vom Mittel ihrer 12 Starts.
- Determinismus: gleiche `rotation` + gleiche Belastung → gleiche Auflösung.
- ⇄: zyklisch über alle zulässigen Kandidaten, nie eine schon belegte ID;
  verändert `rotation` nicht.
- Roundtrip `rotation`: neu → speichern → laden → gleich; kaputt
  (`{ n: 'x', used: { gibtsnicht: 3, lippen: -1 } }`) → `{ n: 0, used: {} }`
  bzw. nur gültige Einträge; fehlend → Standard.
- Schnellstart aus der App (`?program=kurz`) startet die aufgelöste Fassung
  und schreibt die Rotation fort.

---

### Paket 4 – Ausbildung: Rhythmus pop-gerecht gestuft

**Ziel:** Achtel ab Stufe 1, Vorziehen und Sechzehntel früh, ungerade
Taktarten raus aus dem Stufenweg. Standard-Übungsart bleibt „Nachklatschen“.

#### 4a Neue Bausteine (`ELEMENTS`, `CELLS.simple`)

```js
['off', 'Einsatz auf e/a', 'Sechzehntel nach dem Schlag'],
['sh', 'Shuffle', '♫ gespielt als ♩ ♪ (Triole)'],
```

Zellen (Ticks, Viertel = 12):

```js
{ v: [-3, 3, 6], tags: ['s', 'off'] },       // Einsatz auf „e“
{ v: [-9, 3], tags: ['s', 'off', 'r'] },     // Einsatz auf „a“
{ v: [-3, 6, 3], tags: ['s', 'off', 'sy'] }, // „e“ synkopiert
{ v: [8, 4], tags: ['sh'] },                 // Shuffle-Achtelpaar
{ v: [-8, 4], tags: ['sh', 'r'] },
{ v: [8, 4, 8, 4], span: 2, tags: ['sh'] },
```

Shuffle-Zellen werden im Notenbild als gerade Achtel notiert, darüber einmal
je Zeile „Shuffle ♫ = ♩ ♪³“; gespielt und ausgewertet werden die
Triolenwerte. `ELEMENT_SHORT` ergänzen. Rhythmussprache: „off“ wie
Sechzehntel, Shuffle wie Achtel („ti-ti“ bzw. „1 +“).

#### 4b `pickupTicks` (optional je Stufe)

Liste erlaubter Auftaktlängen in Ticks. Fehlt sie, gilt die bisherige
Volltakt-Regel.

#### 4c Stufen

```js
const RHYTHM_LEVELS = [
  { n: 1, label: 'Viertel, Achtel und Halbe',                   meters: ['4/4'],                 elements: ['e'],                                            bars: 1, pickup: false,                     bpm: 84 },
  { n: 2, label: 'Pausen · Auftakt auf „4-und“',                meters: ['4/4'],                 elements: ['e', 'r'],                                       bars: 2, pickup: true,  pickupTicks: [6],     bpm: 88 },
  { n: 3, label: 'Synkopen · vorgezogen über den Taktstrich',   meters: ['4/4'],                 elements: ['e', 'r', 'sy', 'tie'],                          bars: 2, pickup: true,  pickupTicks: [6, 12], bpm: 88 },
  { n: 4, label: 'Sechzehntel · punktiert',                     meters: ['4/4'],                 elements: ['e', 'r', 'sy', 'tie', 'd', 's'],                bars: 2, pickup: true,                      bpm: 80 },
  { n: 5, label: 'Einsätze auf e/a · 6/8',                      meters: ['4/4', '6/8'],          elements: ['e', 'r', 'sy', 'tie', 'd', 's', 'off'],         bars: 2, pickup: true,                      bpm: 80 },
  { n: 6, label: 'Shuffle · Triolen · 12/8 · vier Takte',       meters: ['4/4', '6/8', '12/8'],  elements: ['e', 'r', 'sy', 'tie', 'd', 's', 'off', 'sh', 't'], bars: 4, pickup: true,                  bpm: 84 },
];
```

- `12/8` in `METERS` ergänzen (`ticks: 72, beat: 6, ref: 18, unit: 18`,
  compound-Zellen wie 6/8). Shuffle (`sh`) nur in einfachen Taktarten, wie
  Triolen nicht in 6/8/12/8.
- 2/4, 3/4, 2/2, 5/4, 7/8 bleiben in „Eigene Auswahl“ wählbar.
- Hilfetext Stufen: „Die Stufen folgen der Popmusik: Achtel von Anfang an,
  früh Synkopen und Vorziehen über den Taktstrich, dann Sechzehntel und
  Shuffle. Andere Taktarten gibt es unter „Eigene Auswahl“.“
- `DUO_MIN_LEVEL` bleibt 3.

**Prüfungen Paket 4:**
- 6 Stufen × 500 Muster: Tickzahl je Takt richtig, nur erlaubte Bausteine,
  Stufe 2 Auftakt immer 6 Ticks, Stufe 3 Auftakt 6 oder 12, `off`-Zellen nur
  ab Stufe 5, `sh` nur in 4/4, in Stufe 1–4 nur 4/4.
- 12/8: 500 Muster, Gruppen 3×Achtel exakt, Schlusston bei 4 Takten.
- Bestehende Prüfungen (Bögen, Silben, Raster über 12 Runden) laufen weiter.
- Roundtrip: gespeicherte `rhythmLevel` 1–6 bleiben; eigene Auswahl mit `5/4`
  und `7/8` bleibt erhalten.

---

### Paket 5 – Ausbildung: Hören pop-gerecht gestuft

#### 5a Intervalle (`INTERVAL_PRESETS`, Einträge mit `'level'`)

Richtung auf- **und** abwärts ab Stufe 1; zusammenklingend erst in Stufe 6.

```js
['Einstieg',                        [2, 4, 7, 12],                        'level', { dirs: ['up', 'down'] }],
['Halbton, kleine Terz, Quarte',    [1, 2, 3, 4, 5, 7, 12],               'level', { dirs: ['up', 'down'] }],
['Sexten',                          [1, 2, 3, 4, 5, 7, 8, 9, 12],         'level', { dirs: ['up', 'down'] }],
['Kleine Septime',                  [1, 2, 3, 4, 5, 7, 8, 9, 10, 12],     'level', { dirs: ['up', 'down'] }],
['Alle',                            INTERVALS.map(([n]) => n),            'level', { dirs: ['up', 'down'] }],
['Alle, auch zusammen',             INTERVALS.map(([n]) => n),            'level', { dirs: ['up', 'down', 'harmonic'] }],
```

Die beiden `'compare'`-Einträge bleiben. Gespeicherte Stände: Ist
`intervalLevel` 1–6 gespeichert, gilt das neue Preset dieser Stufe (Intervalle
und Richtungen); eigene Auswahl bleibt. „Intervalle singen“ nutzt dieselben
Stufen mit `['up', 'down']` in allen Stufen (statt bisher nur in Stufe 6).

#### 5b Klänge

```js
// CHORD_QUALITIES ergänzen:
sus2: { name: 'sus2',          semis: [0, 2, 7] },
m7:   { name: 'Moll 7 (m7)',   semis: [0, 3, 7, 10] },
maj7: { name: 'Major 7 (maj7)', semis: [0, 4, 7, 11] },
add9: { name: 'add9',          semis: [0, 4, 7, 14] },
// sus4 heißt künftig 'sus4', dom7 heißt '7 (Dominantsept)'.

const QUALITY_LEVELS = [
  { n: 1, label: 'Dur oder Moll, gebrochen',   set: ['maj', 'min'],                                        play: 'broken', inversion: 'root' },
  { n: 2, label: 'Dur oder Moll, zusammen',    set: ['maj', 'min'],                                        play: 'block',  inversion: 'root' },
  { n: 3, label: 'dazu sus4 und sus2',         set: ['maj', 'min', 'sus4', 'sus2'],                        play: 'block',  inversion: 'root' },
  { n: 4, label: 'dazu 7 und m7',              set: ['maj', 'min', 'sus4', 'sus2', 'dom7', 'm7'],          play: 'block',  inversion: 'root' },
  { n: 5, label: 'dazu maj7 und add9',         set: ['maj', 'min', 'sus4', 'sus2', 'dom7', 'm7', 'maj7', 'add9'], play: 'block', inversion: 'root' },
  { n: 6, label: 'alle, in Umkehrungen',       set: ['maj', 'min', 'sus4', 'sus2', 'dom7', 'm7', 'maj7', 'add9', 'dim', 'aug'], play: 'block', inversion: 'any' },
];
```

Umkehrungen von `add9`: die None bleibt oberhalb des Grundtons (nie als
Sekunde unter der Terz). Der Dur/Moll-Vergleich bleibt.

#### 5c Schlüsse

Übungstitel und Frage werden pop-verständlich: „Wie endet die Zeile?“.
Antworttasten mit Klartext und Fachbegriff in Klammern:

| Typ | Taste |
|---|---|
| `full` | „fertig (Ganzschluss)“ |
| `half` | „offen (Halbschluss)“ |
| `deceptive` | „Überraschung (Trugschluss)“ |
| `plagal` | „Amen (IV–I)“ |
| `rock` (neu) | „Rock (♭VII–I)“ |
| `minorPlagal` (neu) | „sehnsüchtig (iv–I)“ |

Neue Formeln (vierstimmig über `harmony.js`, ohne Quint-/Oktavparallelen):
`rock` = I–IV–♭VII–I in Dur, `minorPlagal` = I–IV–iv–I in Dur.

```js
const CADENCE_LEVELS = [
  { n: 1, label: 'fertig oder offen',        types: ['full', 'half'],                                                 modes: ['major'],          spread: 'close' },
  { n: 2, label: 'dazu Überraschung',        types: ['full', 'half', 'deceptive'],                                    modes: ['major'],          spread: 'close' },
  { n: 3, label: 'dazu Amen',                types: ['full', 'half', 'deceptive', 'plagal'],                          modes: ['major'],          spread: 'close' },
  { n: 4, label: 'auch in Moll',             types: ['full', 'half', 'deceptive', 'plagal'],                          modes: ['major', 'minor'], spread: 'close' },
  { n: 5, label: 'dazu Rock-Schluss',        types: ['full', 'half', 'deceptive', 'plagal', 'rock'],                  modes: ['major', 'minor'], spread: 'close' },
  { n: 6, label: 'dazu iv–I, weite Lage',    types: ['full', 'half', 'deceptive', 'plagal', 'rock', 'minorPlagal'],   modes: ['major', 'minor'], spread: 'open' },
];
```

`rock` und `minorPlagal` nur in Dur-Aufgaben. Der phrygische Halbschluss
bleibt als Option in „Eigene Auswahl“. Begründungssätze für die neuen Typen:
- rock: „Der Akkord einen Ganzton unter dem Grundton führt ohne Leitton nach
  Hause – klingt kraftvoll und offen zugleich, typisch für Rock und Pop.“
- minorPlagal: „Die Subdominante wird kurz Moll – dadurch der wehmütige,
  sehnsüchtige Beigeschmack vor dem Schluss.“

#### 5d Akkordfolgen

Neue Folgen (anhängen):

```js
{ id: 'mixo',      mode: 'major', chords: ['I', 'bVII', 'IV', 'I'],  name: 'Rock-Pendel (♭VII)' },
{ id: 'mixo2',     mode: 'major', chords: ['I', 'V', 'bVII', 'IV'],  name: 'Pop mit ♭VII' },
{ id: 'minorIV',   mode: 'major', chords: ['I', 'IV', 'iv', 'I'],    name: 'Moll-Subdominante' },
{ id: 'majorIII',  mode: 'major', chords: ['I', 'III', 'IV', 'iv'],  name: 'Dur-III und Moll-iv' },
{ id: 'secdom',    mode: 'major', chords: ['I', 'II7', 'V', 'I'],    name: 'Zwischendominante' },
{ id: 'bassDown',  mode: 'major', chords: ['I', 'V6', 'vi', 'IV'],   name: 'Absteigende Basslinie' },
```

Der Akkord-Parser muss `bVII`, `III` (Dur-Akkord auf der 3. Stufe in Dur),
`iv` in Dur und `II7` (Dur-Septakkord auf der 2. Stufe) kennen; die
Antworttasten einer Stufe zeigen genau die Symbole, die in ihren Folgen
vorkommen. Schreibweise der Töne über `spell()` im Kontext der Tonart
(♭VII in C = B, nicht Ais).

```js
const EAR_LEVELS = [
  { n: 1, label: 'Die vier Pop-Akkorde',          add: ['cadence', 'tsd', 'amen', 'pop', 'fifties', 'sad'],        inversion: 'root',  spread: 'close' },
  { n: 2, label: 'dazu ii und iii',               add: ['plagal', 'deceptive', 'jazz', 'quintfall', 'turnaround', 'rising'], inversion: 'root', spread: 'close' },
  { n: 3, label: 'Moll-Tonarten',                 add: ['epic', 'mpop', 'mnatural', 'mcadence', 'm3', 'mdeceptive'], inversion: 'root', spread: 'close' },
  { n: 4, label: 'Leihakkorde: ♭VII und iv',      add: ['mixo', 'mixo2', 'minorIV', 'andalusian'],                 inversion: 'root',  spread: 'close' },
  { n: 5, label: 'V7, Zwischendominanten, Bass',  add: ['v7', 'secdom', 'majorIII', 'bassDown', 'circle'],         inversion: 'style', spread: 'close' },
  { n: 6, label: 'weite Lage und Rückung',        add: [],                                                         inversion: 'style', spread: 'open', modulation: true },
];
```

`hymn`, `k64`, `phryg`, `ajoutee` gehören zu keiner Stufe mehr; in „Eigene
Auswahl“ stehen sie unter der Überschrift „Klassik“.

**Rückung (`modulation: true`):** Jede vierte Aufgabe in Stufe 6 ist statt
einer Folgen-Bestimmung eine Rückungsfrage: Eine Pop-Folge aus Stufe 1
erklingt zweimal, beim zweiten Mal um 0, 1 oder 2 Halbtöne höher. Antworten:
„gleich“ · „Halbton höher“ · „Ganzton höher“. Begründung nach der Antwort:
„Im letzten Refrain rückt ein Popsong oft höher – wer das nicht hört, singt
auf dem alten Ton weiter.“

#### 5e Stimmen und Intonation

Unverändert.

**Prüfungen Paket 5:**
- Intervalle: jedes Preset liefert nur seine Intervalle und Richtungen
  (1000 Aufgaben je Stufe); gespeicherte Stufe 1–6 → neues Preset;
  gespeicherte eigene Auswahl unverändert.
- Klänge: 10 Qualitäten × 13 Grundtöne × alle Umkehrungen korrekt; `add9`
  immer mit None über dem Grundton.
- Schlüsse: 6 Typen × 12 Tonarten × 2 Lagen enden richtig, 0 Parallelen;
  `rock`/`minorPlagal` nur in Dur.
- Akkordfolgen: jede neue Folge × 12 Tonarten: richtige Tonhöhenklassen
  (z. B. in C: `bVII` = B-D-F, `iv` = F-As-C, `III` = E-Gis-H, `II7` =
  D-Fis-A-C), Schreibweise ohne Doppelvorzeichen in allen 12 Dur-Tonarten
  oder begründete Ausnahme im Bericht; 0 Parallelen.
- Rückung: 500 Aufgaben, Verteilung 0/1/2 Halbtöne je 33 % ± 5 %, beide
  Hälften im Übe-Umfang.

---

### Paket 6 – Ausbildung: Singen nach Gehör

#### 6a Reihenfolge, Stufenzahlen, Blattsingen ausblenden

- `SING_MODES` Reihenfolge: Tuner, Ton halten, Ton finden, Nachsingen, Im
  Takt, Intervalle singen, Diktat, Blattsingen.
- Neue Einstellung `showSight` (Standard `false`, im Zahnrad-Blatt „Singen“:
  „Blattsingen anzeigen (mit Noten)“). Ist sie aus, fehlt Blattsingen in der
  Liste, in der Schnellstart-Kette und im Fortschritts-Mittel („Stufe n/6“);
  gespeicherte Blattsing-Fortschritte bleiben erhalten.
- `solfa`-Standard `'numbers'`, nur wenn nichts gespeichert ist.
- `QUICK_CHAINS.voice`: `['sight', 4]` → `['dictation', 4]`. Dauer-Kommentar
  und `QUICK_MINUTES` prüfen (Diktat ≈ 30 s je Aufgabe).
- In `app.js` (Fortschritt, Kachel „Singen“) `sight` nur zählen, wenn es im
  Tool eingeblendet ist; die Ausbildung meldet das über den bestehenden
  Fortschrittsweg mit (Feld `sightHidden` in der Meldung oder eigene
  `memory`-Angabe – die schlichtere Variante wählen, im Bericht nennen).

#### 6b Ton halten

```js
const HOLD_LEVELS = [
  { n: 1, label: '3 Sekunden',               sec: 3, dyn: 'mf' },
  { n: 2, label: '6 Sekunden',               sec: 6, dyn: 'mf' },
  { n: 3, label: '6 Sekunden, leise',        sec: 6, dyn: 'pp' },
  { n: 4, label: '6 Sekunden, lauter werden', sec: 6, dyn: 'cresc' },
  { n: 5, label: '8 Sekunden, gerader Ton',  sec: 8, dyn: 'mf', straight: true, maxWobble: 15 },
  { n: 6, label: 'An- und Abschwellen, 8 s', sec: 8, dyn: 'messa' },
];
```

`straight`: Aus den Tonhöhen-Messwerten die Modulationstiefe bestimmen
(halbe Spannweite nach Glättung über 80 ms, in Cent, über gleitende
Fenster von 400 ms, Median der Fenster). Liegt sie über `maxWobble`, gilt der
Versuch als nicht erreicht. Rückmeldung ermutigend: „Noch etwas Vibrato
(± 28 Cent) – versuch, den Ton ganz ruhig zu halten.“ Tipp im Hilfetext:
„Gerade Töne sind im Popchor die Regel – Vibrato kommt, wenn überhaupt, erst
am Ende.“

#### 6c Ton finden

```js
const FIND_LEVELS = [
  { n: 1, label: 'Grundton aus dem Akkord',        cue: 'tonic',    ask: ['root'],                   modes: ['major'] },
  { n: 2, label: 'Grundton oder Quinte',           cue: 'tonic',    ask: ['root', 'fifth'],          modes: ['major'] },
  { n: 3, label: 'Grundton, Terz oder Quinte',     cue: 'tonic',    ask: ['root', 'third', 'fifth'], modes: ['major'] },
  { n: 4, label: 'auch in Moll',                   cue: 'tonic',    ask: ['root', 'third', 'fifth'], modes: ['major', 'minor'] },
  { n: 5, label: 'nach einem Intro: Stufe 1–7',    cue: 'popIntro', ask: ['degree'],                 modes: ['major', 'minor'] },
  { n: 6, label: 'Dein Ton im vierstimmigen Akkord', cue: 'satb',   ask: ['mine'],                   modes: ['major', 'minor'] },
];
```

- `popIntro`: statt der Kadenz eine Pop-Folge (Dur: I–V–vi–IV; Moll:
  i–VI–III–VII), je Akkord zwei Schläge, danach Stille und die Aufgabe.
- `satb`: Ein zufälliger Akkord aus einer Stufe-1-Folge wird vierstimmig über
  `harmony.js` gesetzt und einmal voll gespielt (1,5 s), danach klingen nur
  die drei anderen Stimmen weiter; du singst deine Stimme (aus dem
  Stimmprofil) in die Lücke. Ziel = der Ton deiner Stimme im Satz, Toleranz
  40 Cent.
- „Nur das a′“ ist keine Stufe mehr, bleibt aber in „Eigene Auswahl“.
- `FIND_TOLERANCE = [50, 50, 40, 40, 35, 40]` bleibt.

#### 6d Nachsingen, Im Takt, Diktat: eigene Tonvorräte, Rhythmus von Anfang an

Nachsingen bekommt eigene Stufen (nicht mehr über `sight` an die
Blattsing-Stufen gekoppelt):

```js
const ECHO_LEVELS = [
  { n: 1, label: '3–4 Töne, Schritte',              pool: [0, 1, 2],           len: [3, 4],   maxLeap: 1, start: [0, 2],     end: [0],  rhythm: { meter: '4/4', bars: 1, elements: ['e'] }, tol: 50 },
  { n: 2, label: 'Dur-Pentatonik',                  pool: [0, 1, 2, 4, 5],     len: [4, 5],   maxLeap: 4, start: [0, 2, 4],  end: [0],  rhythm: { meter: '4/4', bars: 1, elements: ['e'] }, tol: 50 },
  { n: 3, label: 'Moll-Pentatonik, zwei Takte',     pool: [-2, 0, 1, 2, 4],    len: [5, 6],   maxLeap: 4, start: [-2, 0, 2], end: [-2], minor: true, rhythm: { meter: '4/4', bars: 2, elements: ['e', 'r'] }, tol: 45 },
  { n: 4, label: 'Ganze Tonleiter, Synkopen',       pool: 'scale',             len: [6, 8],   maxLeap: 4, modes: ['major', 'minor'], rhythm: { meter: '4/4', bars: 2, elements: ['e', 'r', 'sy'] }, tol: 40 },
  { n: 5, label: 'Vier Takte, Auftakt, vorgezogen', pool: 'scale',             len: [10, 14], maxLeap: 5, modes: ['major', 'minor'], rhythm: { meter: '4/4', bars: 4, elements: ['e', 'r', 'sy', 'tie', 'd'], pickup: true }, tol: 40 },
  { n: 6, label: 'Zwei Phrasen mit Blue Notes',     pool: 'scale',             len: [14, 20], maxLeap: 7, modes: ['major', 'minor'], chroma: true, rhythm: { meter: ['4/4', '6/8'], bars: 8, elements: ['e', 'r', 'sy', 'tie', 'd'], phrases: 2, pickup: true }, tol: 35 },
];
```

- `pool: 'scale'` = ganze Tonleiter wie Blattsingen Stufe 5 (Dur) bzw. 6
  (Moll, la-basiert); Start- und Schlusstöne wie dort.
- Kann der Melodie-Rhythmusgenerator (Nachsingen Paket 2) noch keine Pausen,
  Synkopen, Bögen oder Auftakte, diese nach denselben Regeln wie im
  Rhythmus-Training ergänzen. Ein gebundener Ton ist für die Auswertung ein
  Ton; Pausen werden nicht bewertet.
- **Im Takt:** Tonvorrat je Stufe wie `ECHO_LEVELS[n]`, Rhythmusbausteine wie
  `RHYTHM_LEVELS[n]` (Paket 4), aber nur 4/4 und 6/8, höchstens 4 Takte;
  `bpm`, `tol`, `win` wie bisher je Stufe.
- **Diktat:** Tonvorrat je Stufe wie `ECHO_LEVELS[n]` (ohne Rhythmus), Länge
  wie bisher. Ab Stufe 6 erscheinen zusätzliche Silbentasten für die
  chromatischen Töne (6e).

#### 6e Chromatik (nur wo `chroma: true`)

Höchstens ein chromatischer Ton je Phrase, nur in diesen Wendungen:

| Tongeschlecht | Ton | erlaubte Wendung | Silbe | Zahl |
|---|---|---|---|---|
| Dur | ♭3 (Blue Note) | 4 – ♭3 – 1 oder 2 – ♭3 – 1 | me | ♭3 |
| Dur | ♭7 (Blue Note) | 5 – ♭7 – 5 oder 1′ – ♭7 – 5 | te | ♭7 |
| Dur | ♯4 | ♯4 – 5 (als Leitton, schrittweise von 4 oder 5 kommend) | fi | ♯4 |
| Moll | ♯7 (Leitton) | ♯7 – 1 | si | ♯7 |
| Moll | ♯6 (dorisch) | 5 – ♯6 – 5 oder 5 – ♯6 – ♯7 – 1 | fi | ♯6 |

(Moll-Silben la-basiert, Zahlen ab la = 1 wie bisher.) Tonarten meiden, in
denen `spell()` einen der Töne falsch schreiben würde (siehe „Zu
entscheiden“ in `BERICHT-DIDAKTIK.md`); die Anzeige arbeitet ohnehin mit
Silben/Zahlen.

Hilfetext Nachsingen Stufe 6: „Hier kommen Töne dazu, die nicht zur
Tonleiter gehören – wie die ‚Blue Notes‘ im Soul oder der Leitton in Moll.
Das Ohr will sie gern zurück in die Tonleiter ziehen: genau hinhören und sie
so singen, wie sie klingen.“

**Prüfungen Paket 6:**
- Reihenfolge `SING_MODES`; `showSight` aus → Blattsingen nicht in Liste,
  Kette, Mittelwert; an → wie bisher. Roundtrip `showSight` (neu, fehlend,
  kaputt).
- `solfa`: fehlend → `'numbers'`; gespeichert `'syllables'` bleibt.
- Ton halten Stufe 5: simulierte Töne mit Vibrato ±10 Cent → erreicht,
  ±30 Cent → nicht erreicht, gerader Ton mit langsamer Drift 5 Cent/s →
  erreicht.
- Ton finden: `popIntro` spielt die Folge in Dur/Moll richtig; `satb`: 4
  Stimmen × 200 Aufgaben – Zielton = Ton der eigenen Stimme im Satz, im
  Übe-Umfang, die drei klingenden Stimmen enthalten ihn nicht (Ausnahme
  Oktavverdopplung: dann in anderer Oktave erlaubt).
- Nachsingen/Im Takt/Diktat: 6 Stufen × 1000 Melodien je Stimme: nur Töne des
  Pools, Sprungregel eingehalten, Start/Schluss richtig, Rhythmus nur mit
  erlaubten Bausteinen; Stufe 6: 0–1 chromatischer Ton je Phrase, nur in den
  Wendungen aus 6e, Anteil Aufgaben mit Chromatik 30–70 %.
- Die bestehenden Auswertungs-Simulationen von Nachsingen und Im Takt (gegen
  simulierte Sänger:innen) laufen mit den neuen Stufen weiter und liefern
  mindestens die bisherigen Trefferquoten.
- Schnellstart „Singen“: Kette ohne `sight`, mit `dictation`.

---

## 5. Wenn ein Paket nicht sauber klappt

Wie in `ARBEITSANWEISUNG-CLAUDE-CODE.md` Abschnitt 5: Paket zurücksetzen, im
Bericht mit Grund vermerken, mit dem nächsten unabhängigen Paket
weitermachen. Abhängigkeiten: 2 braucht 1; 3 braucht 2. Pakete 4, 5 und 6
sind voneinander und von 1–3 unabhängig; 6d nutzt die Rhythmus-Stufen aus 4 –
fehlt Paket 4, nimmt „Im Takt“ die bisherigen `IN_TIME_LEVELS`-Bausteine.

## 6. Abschluss

`BERICHT-POP.md` anlegen, Aufbau wie `BERICHT-DIDAKTIK.md`: Tabelle
Paket / Status / Commit / SW_VERSION / Tests (Zahlen), je Paket Dateien,
Änderungen, Abweichungen, dazu „Zu entscheiden“ und „Manuell auf echten
Geräten prüfen“ (mindestens: Hörprobe der neuen Einsing-Übungen mit
Anschleifen/Abfallen und Abschluss-Klick; Atem-Impulse im Tempo 96 auf dem
Handy-Lautsprecher; Vibrato-Messung „gerader Ton“ mit echten Stimmen,
besonders Sopran mit natürlichem Vibrato und Bass unter 100 Hz; Lesbarkeit
der ⇄-Knöpfe bei 320 px; Shuffle-Notation und 12/8 im Notenbild).

Bekannte offene Punkte für „Zu entscheiden“:
- Soll die Vorgabe bei „Vokal auf den Schlag“ und „Schlusskonsonant“ mit der
  künstlichen Singstimme aus der Ausbildung (`singVoice`) klingen, damit
  vorgezogene Konsonanten hörbar werden?
- Eine gesungene „Lange Phrase“ (Runden werden länger statt höher) wurde
  bewusst weggelassen – braucht eine eigene Rückungsart.
- Soll es einen Schalter „reine Stimmung“ für Liegeton und Akkord geben
  (große Terz 14 Cent tiefer), damit die Terz-Hinweise hörbar werden?
- `spell()` ohne Ces/Fes/Eis/His – ausbauen, damit Chromatik in allen
  Tonarten erlaubt ist?
