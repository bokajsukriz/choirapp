# Arbeitsanweisung für Claude Code – Rhythmus-Kurs pop-gerecht (Hören vor Lesen, Groove statt Klick, Wiedergabe-Marke)

Du bist erfahrene Chorleiterin/erfahrener Chorleiter eines Popchors,
Rhythmuspädagog:in und Entwickler:in. Du baust den Rhythmus-Kurs in
`uebe-lab.html` nach den Paketen unten um. Musikalische und didaktische
Entscheidungen sind hier getroffen; die neuen Lektionen stehen fertig im
Format der App (Ticks und Textlängen sind vorab geprüft).

Antworte und kommentiere auf Deutsch.

**Diese Anweisung läuft unbeaufsichtigt.** Keine Rückfragen. Wo etwas unklar
bleibt: die Variante wählen, die näher am bestehenden Verhalten liegt, im
Bericht unter „Zu entscheiden“ notieren, weitermachen.

**Hintergrund:** Der Chor ist ein Popchor und übt ausschließlich nach Gehör
(siehe `ARBEITSANWEISUNG-POP.md`). Die freien Rhythmus-Übungen
(`RHYTHM_LEVELS`) sind bereits pop-gerecht gestuft, der Rhythmus-Kurs
(`COURSE`) nicht: Er ist nach Notenwerten gegliedert, jede Lektion beginnt
mit Notenlesen („Mitklatschen“, „Vom Blatt“), Kapitel 4 besteht nur aus
3/4 und 6/8, die Beispiele stammen überwiegend aus Klassik und Barock, und
geübt wird ausschließlich zum Klick. Ziel des Umbaus:

1. **Klang vor Symbol.** Jede Lektion beginnt mit Hören und Nachklatschen;
   das Notenbild kommt zuletzt als „So sieht es aus“.
2. **Muster statt Notenwerte.** Die Kapitel folgen der Funktion im Popsong
   (Backbeat, Offbeat, Vorziehen, Sechzehntel-Einsätze, Shuffle, 12/8).
   Klassische Lektionen bleiben als Zusatzkapitel erhalten.
3. **Groove statt Klick.** Ab Kapitel 2 läuft ein Schlagzeug-Groove mit,
   der innerhalb jeder Lektion schrittweise ausgedünnt wird, bis nur noch
   die Snare auf 2 und 4 übrig ist.
4. **Hören statt Sehen.** Die mitlaufende Wiedergabe-Marke springt an jedem
   Taktstrich (Fehler). Außerdem ist sie in den Hör-Übungen eine visuelle
   Krücke. Beides wird behoben.

Ausdrücklich **nicht** Teil dieses Auftrags:
- das Groove Lab (`groove-lab.js`, auch dessen „Kurs“),
- die Stufen der freien Übungen (`RHYTHM_LEVELS`) und der Generator
  `makePattern`,
- „Heute üben“ (Parameter-Aufruf von `uebe-lab.html`) und der
  Fortschrittsbereich `rhythm`,
- Einsingen, Hören, Singen, Metronom (außer dem Kopieren der
  Schlagzeugklänge aus `metronom.html`, Paket 5),
- jeder Bezug zum Repertoire.

---

## 0. Vorbereitung

1. Branch `pop-rhythmuskurs` von aktuellem `main` anlegen. Nie auf `main`
   committen, nie mergen, nie force-pushen.
2. `CLAUDE.md`, `README.md`, `ARBEITSANWEISUNG-CLAUDE-CODE.md` (Abschnitte 1,
   3 und 5), `ARBEITSANWEISUNG-POP.md` und `BERICHT-DIDAKTIK.md` lesen. In
   `uebe-lab.html` vollständig lesen: den Block „RHYTHMUS-KURS — INHALT“
   (`COURSE_CHAPTERS`, `COURSE`, `courseNotes`, `coursePattern`,
   `courseSteps`), den Scheduler (`courseSeq`, `courseRoundSpec`,
   `scheduleTick`, `scheduleAhead`, `draw`, `start`), die Anzeige
   (`pickDisplay`, `updateView`, `phraseLines`, `systemSvg`, `lineSvg`,
   `renderStage`, `renderPad`), `courseCheck()` und das Laden/Speichern
   der Einstellungen (Datensatz „playground“, `course: { lesson, done, syl }`).
3. Diese Datei im ersten Commit mit einchecken.

## 1. Feste Regeln

Es gelten **alle Regeln aus Abschnitt 1 von `ARBEITSANWEISUNG-CLAUDE-CODE.md`**
(ein Paket = ein Commit + Push, `SW_VERSION` je Commit erhöhen – Stand bei
Erstellung dieser Anweisung `v369`, maßgeblich ist der Stand auf `main` –,
keine IDs ändern, neue Felder optional mit Standardwert und durch das Laden
gereicht, Persistenz-Roundtrip Pflicht, keine Abhängigkeiten, kein
Build-Schritt). Zusätzlich:

- **Lektions-IDs bleiben.** `course.done` und `course.lesson` werden beim
  Laden gegen die IDs in `COURSE` gefiltert; jede bestehende ID muss
  deshalb weiter in `COURSE` stehen (auch im Zusatzkapitel). Neue Lektionen
  bekommen die unten festgelegten neuen IDs. Die Reihenfolge in `COURSE`
  darf sich ändern (`done` wird nur als Menge gespeichert).
- **`duoOstinato`** (Zweistimmig, gespeichert als Lektions-ID) muss nach dem
  Umbau für jede bisher gültige ID gültig bleiben.
- **Texte:** `uebe-lab.html` ist nur deutsch. `app.js`/`strings.js` werden
  nicht angefasst.
- **Klänge:** keine Samples, nur Web Audio wie bisher. Schlagzeugklänge
  werden aus `metronom.html` (`drum()`) 1:1 in die Engine von
  `uebe-lab.html` kopiert, nicht über einen gemeinsamen Import (die Tools
  sind bewusst eigenständig).
- **Mikrofon:** unverändert – nie im Hintergrund, nie aufzeichnen, nie
  speichern; `micOn()`/`micOff()` und `RECORDING_CONSTRAINTS` wie bisher.
- **Wortwahl:** ermutigend, nie bewertend. Liedbeispiele in `more`-Texten
  nur, wenn sie allgemein bekannt und sicher belegt sind; im Zweifel
  allgemein formulieren. Keine erfundenen Anekdoten.

## 2. Entscheidungen (verbindlich)

| Thema | Festlegung |
|---|---|
| Schritte einer Lektion | 1 Nachklatschen → 2 Behalten → 3 Im Zusammenhang (nach Gehör) bzw. Nur mit Snare → 4 So sieht es aus (Mitklatschen mit Noten). Schritt 4 entfällt bei Einstellung „Notenbild im Kurs: aus“ |
| Notenbild in Schritt 1–3 | nie Notenköpfe, auch nicht nach der Runde; nach der Runde nur die Zeitleiste mit Soll-Punkten und Tippern (Ergebnis) |
| Kapitel | 1 Puls und Backbeat · 2 Achtel und Offbeat · 3 Synkopen und Vorziehen · 4 Sechzehntel-Grooves · 5 Shuffle und Zwölfachtel · 6 Rhythmen aus Afrika und Lateinamerika · 7 Zusatz: Walzer, Barock und Klassik |
| Zusatzkapitel | freiwillig; zählt nicht zum Kursfortschritt („x/y geschafft“ nur über Kapitel 1–6); nach der letzten Lektion von Kapitel 6 ist der Kurs abgeschlossen, Kapitel 7 ist über „Alle Lektionen“ erreichbar |
| Begleitung im Kurs | Kapitel 1: Klick (Ausnahme Lektion `backbeat`: nur Bassdrum auf 1 und 3). Ab Kapitel 2 Groove, je Schritt ausgedünnt: Schritt 1 voll, 2 Bassdrum + Snare, 3 nur Snare auf 2 und 4, 4 voll. Kapitel 7: Klick |
| Groove-Inhalt | „neutral“: Bassdrum und Snare/Rim **nur auf Hauptschlägen**, Hi-Hat als gleichmäßiges Raster ohne Akzente. Der Groove spielt nie den Zielrhythmus vor |
| Einzähler | bleibt Klick, auch mit Groove |
| Wiederholung („Gemischt wiederholen“) | nur Nachklatschen (kein „Vom Blatt“ mehr), Begleitung Bassdrum + Snare |
| Silben im Kurs | Standard neu `count` („1 + 2 +“); gilt nur, wenn noch nichts gespeichert ist |
| Wiedergabe-Marke | Sprung am Taktstrich beheben (Paket 1); sichtbar nur, wo gelesen wird (Paket 2, Tabelle) |
| Freie Übungen | bekommen die Begleitungswahl als Einstellung, Standard „Klick“ (Verhalten unverändert) |
| Zweistimmig | nur der Marken-Fix aus Paket 1; Sichtbarkeit und Begleitung unverändert |

**Begründung für die Marke** (zum Verständnis, nicht für die App-Texte):
Menschen synchronisieren sich mit Klängen deutlich genauer als mit
Lichtreizen (Repp 2005, Übersichtsarbeit zur Tapping-Forschung). Bewegte
visuelle Reize – ein springender Ball, eine laufende Linie – verringern
diesen Abstand aber erheblich (Hove, Iversen, Zhang & Repp 2013). Eine
laufende Marke ist also eine wirksame visuelle Taktgeberin. Genau deshalb
gehört sie nicht in Übungen, die den inneren Puls und das Hören trainieren
sollen: Wer der Linie folgt, klatscht, wenn sie die Stelle erreicht, statt
den Einsatz aus dem Puls vorwegzunehmen. Beim Mitlesen dagegen verknüpft
sie Klang und Notenbild (Karaoke-Prinzip) und ist dort sinnvoll.

## 3. Tests

Wie in `ARBEITSANWEISUNG-CLAUDE-CODE.md` Abschnitt 3: `uebeLab.selfCheck()`
und `courseCheck()` erweitern (Liste der Fehler, leer = bestanden), neue
reine Funktionen über `window.uebeLab` exportieren, Node-Prüfskripte unter
`/tmp` (nicht committen), Headless-Prüfung mit Playwright, sofern ohne neue
Installation vorhanden. Dazu `chorApp.selfTest()`, `chorApp.selfTestAsync()`,
`chorApp.selfTestMusic()` – alle müssen `[]` liefern. Sichtprüfung per
Screenshot (390 px) für jede geänderte Oberfläche. Hörtests kann niemand
nachts machen: je Paket als Checkliste in den Bericht.

---

## 4. Pakete

### Paket 1 – Wiedergabe-Marke: kein Sprung am Taktstrich

**Befund:** `phraseLines()` setzt jeden Takt als eigenes Segment mit
`sg.x1 = sg.x0 + ST.PAD + Dauer × px`, und `xOf(t)` rechnet innerhalb des
Segments `sg.x0 + ST.PAD × 0,8 + (t − sg.t0) × px`. Am Ende eines Takts
steht die Marke also bei `x0 + 0,8·PAD + Dauer·px`, am Anfang des nächsten
bei `x0 + PAD + Dauer·px + 0,8·PAD` – sie springt in null Zeit um genau
`ST.PAD` (14 Einheiten, bei zwei Takten je Zeile fast eine Sechzehntel
Weg). Gleiches gilt an der Grenze Auftakt → Takt 1. `updateView()` benutzt
`line.xOf(t)` direkt für die Marke.

**Lösung:** Das Notenlayout bleibt unverändert (der Platz hinter dem
Taktstrich ist nötig, sonst stoßen Köpfe, Fähnchen und Pausen an den
Strich). Nur die Marke bekommt eine eigene, stetige Abbildung:

- Neue reine Funktion `markX(line, pattern)` → liefert `(t) => x`.
- Stützstellen sind die Anfänge **aller** Noten und Pausen der Zeile
  (`n.t`, x = `line.xOf(n.t)`), dazu Zeilenanfang und Zeilenende
  (x = rechter Rand des letzten Segments). Weil Noten die Zeit lückenlos
  füllen und Takte immer an einer Notengrenze enden, liegt auf jedem
  Taktstrich eine Stützstelle.
- Zwischen zwei Stützstellen linear interpolieren. Innerhalb eines Takts ist
  das identisch mit `xOf`; über den Taktstrich wird der Zusatzweg über die
  Dauer der letzten Note davor verteilt.
- Ganztaktpausen: Stützstelle am zeitlichen Anfang (`xOf(n.t)`), nicht an
  der gezeichneten Mitte.
- Zweistimmig: je System eigene Abbildung, die Marke folgt dem eigenen
  System wie bisher.
- Der Zeilenwechsel (Marke verschwindet am Ende der Zeile und erscheint am
  Anfang der nächsten) bleibt – er ist kein Sprung im Sinne des Befunds.

**Prüfungen Paket 1** (Node, alle `COURSE`-Lektionen, 500 Muster je Stufe
aus `RHYTHM_LEVELS`, 500 Zweistimmig-Paare, 12/8 mit 4 Takten und Auftakt):
- Abtastung jeder Zeile in Schritten von 0,05 Ticks: `markX` monoton
  steigend, kein Schritt größer als `2 × px × 0,05 + 0,01`
  (höchstens doppelte Nenngeschwindigkeit, keine Unstetigkeit).
- An jedem Notenanfang `|markX(n.t) − xOf(n.t)| < 0,01`.
- Innerhalb eines Takts (ohne dessen letzte Note) `markX ≡ xOf`.
- Vorher/Nachher: Notenbild-SVG aller Kurs-Lektionen byte-gleich
  (das Layout ändert sich nicht).
- **Sichtprüfung:** Bildschirmaufnahmen einer Lektion mit zwei Takten je
  Zeile kurz vor und kurz nach dem Taktstrich.
- **Hörtest/Sehtest:** Mitklatschen „Das Achtelpaar“ und „Die vorgezogene
  Eins“ bei 60 BPM – die Marke läuft ohne Ruck über den Taktstrich.
- Commit: `Rhythmus: Wiedergabe-Marke läuft stetig über den Taktstrich`

### Paket 2 – Sichtbare Hilfen: Hören statt Sehen

**Befund:** Auch beim Nachklatschen ohne Noten zeichnet `systemSvg()` das
System mit dem echten Layout der verborgenen Phrase (Zahl der Zeilen,
Auftaktsegment, ein Takt je Zeile bei Sechzehnteln), die Zeitleiste mit
Zählzeit-Strichen, die laufende Marke und live die eigenen Tipper relativ
zu den Zählzeit-Strichen. Das Tippfeld leuchtet dazu je Zählzeit auf. So
kann man während der eigenen Runde optisch nachsteuern, und das Layout
verrät vorab Taktzahl, Auftakt und Sechzehntel.

**Festlegung, was während des Laufs sichtbar ist:**

| Situation | Marke | Zeitleiste mit Zählzeiten | Tipper live | Tippfeld-Zählzeiten | Layout der Phrase |
|---|---|---|---|---|---|
| Kurs Schritt 1–3, Wiederholung | aus | aus | aus | nur im Einzähler | neutraler Platzhalter |
| Übung „Nachklatschen“ ohne „Noten zeigen“ | aus | aus | aus | nur im Einzähler | neutraler Platzhalter |
| Übung „Nachklatschen“ mit „Noten zeigen“ | wie „Vom Blatt“ | | | | |
| „Vom Blatt“, Lesephase | an | an | – | an | echt |
| „Vom Blatt“, eigene Phase | Einstellung, Standard aus | an | aus | nur im Einzähler | echt |
| Kurs Schritt 4 „So sieht es aus“ (Mitklatschen) | an | an | an | an | echt |
| Zweistimmig | unverändert | unverändert | unverändert | unverändert | unverändert |

- **Neutraler Platzhalter:** eine einzelne leere Zeile mit gleicher Höhe,
  ohne Taktstriche, ohne Taktangabe, mit dem Hinweis „Rhythmus nach Gehör“
  (Text existiert). Er darf nicht von Taktzahl, Auftakt oder Notenwerten
  der verborgenen Phrase abhängen.
- **Nach der Runde** bleibt die Auswertung sichtbar wie bisher (Soll-Punkte,
  farbige Tipper, Statuszeile) – Rückmeldung nach dem Tun ist erwünscht. In
  Kurs-Schritt 1–3 aber ohne Notenköpfe (siehe Entscheidungen).
- **Neue Einstellung** `markSelf` (boolean, Standard `false`): „Mitlaufende
  Marke beim eigenen Klatschen“ im Zahnrad-Blatt der Übungen, Hilfetext:
  „Die Marke hilft beim Mitlesen. Beim eigenen Klatschen verführt sie dazu,
  der Linie zu folgen statt dem Puls – deshalb ist sie dort aus.“
- Das Etikett im Tippfeld („Hören“, „Du“ …) bleibt: Es sagt, wer dran ist,
  nicht wann.
- Hilfetext der Übungsarten (`#help-modes`) um einen Satz ergänzen:
  „Beim Nachklatschen gibt es bewusst nichts zu sehen – dein Ohr und dein
  innerer Puls sind das Werkzeug.“

**Prüfungen Paket 2:**
- Reine Funktion `visibleAids({ mode, phase, course, showNotes, markSelf })`
  → `{ mark, timeline, liveTaps, padBeats, realLayout }`, exportiert;
  `selfCheck` prüft jede Zeile der Tabelle.
- Platzhalter: SVG für zwei verschiedene verborgene Phrasen (1 Takt ohne
  Auftakt vs. 4 Takte mit Auftakt und Sechzehnteln) ist identisch.
- Roundtrip `markSelf` (neu/alt ohne Feld → `false`/kaputt → `false`).
- Sichtprüfung: Nachklatschen während der eigenen Runde (leer), danach
  (Auswertung); Vom Blatt eigene Phase ohne Marke.
- Commit: `Rhythmus: Hilfen nach Übungsart – Nachklatschen ohne Marke und Raster`

### Paket 3 – Kursinhalt: Kapitel nach Funktion, neue Lektionen, Zusatzkapitel

**3a Kapitel**

```js
const COURSE_CHAPTERS = {
  1: 'Puls und Backbeat', 2: 'Achtel und Offbeat', 3: 'Synkopen und Vorziehen',
  4: 'Sechzehntel-Grooves', 5: 'Shuffle und Zwölfachtel',
  6: 'Rhythmen aus Afrika und Lateinamerika', 7: 'Zusatz: Walzer, Barock und Klassik',
};
const COURSE_EXTRA_CH = 7; // freiwillig, zählt nicht zum Kursfortschritt
```

**3b Reihenfolge in `COURSE`** (bestehende Einträge unverändert übernehmen,
nur `ch` anpassen; Ausnahmen in 3d):

| Kapitel | Lektionen (IDs) |
|---|---|
| 1 | `puls`, **`backbeat`**, `halbe`, `pause` |
| 2 | `achtel`, `stomp`, `offbeat`, `auftakt`, **`auftaktUnd`** |
| 3 | `synkope`, `punktiert`, `charleston`, `antizipation`, **`vorDrei`** |
| 4 | `sechzehntel`, `achtel16`, `16achtel`, **`aufE`**, **`aufA`**, **`synkope16`** |
| 5 | `triole`, **`shuffle`**, `sechsachtel`, **`zwoelfachtel`** |
| 6 | `tresillo`, `clave` |
| 7 | `walzer`, `sarabande`, `wiegen`, `hemiole`, `punktachtel`, `geburtstag`, `habanera` |

**3c Neue Lektionen** (vor Ort in die Reihenfolge oben einsetzen):

```js
{ id: 'backbeat', ch: 1, meter: '4/4', bpm: 88, name: 'Der Backbeat', bars: ['-12 12 -12 12'], accomp: 'kick',
  intro: 'Klatsch nur auf 2 und 4. Die Eins und die Drei zählst du still mit – dort spielt die Bassdrum, du bist die Snare.',
  more: 'Der Backbeat ist das Fundament von Pop, Rock, Soul und Gospel. Wer im Konzert auf 1 und 3 klatscht, klatscht gegen die Band. Übe ihn überall: beim Gehen, zu jedem Song im Radio.' },

{ id: 'auftaktUnd', ch: 2, meter: '4/4', bpm: 84, name: 'Einsatz auf 4-und', pickup: '6', bars: ['12 6 6 12 12', '36 -6'],
  intro: 'Die Phrase beginnt ein Achtel vor der Eins, auf dem „und“ der Vier. Zähl innerlich „3 4 und“ – auf „und“ klatschst du, die Eins danach bleibt schwer.',
  more: 'So beginnen unzählige Popmelodien: Die erste Silbe ist unbetont und rutscht vor die Eins. Wer erst auf der Eins einsetzt, ist sofort ein Achtel zu spät.' },

{ id: 'vorDrei', ch: 3, meter: '4/4', bpm: 80, name: 'Die vorgezogene Drei', bars: ['12 6 6 ~12 12'],
  intro: 'Das Achtel auf „2 und“ wird über die Drei gebunden: Du klatschst es, auf der Drei selbst nicht. Die Drei zählst du trotzdem mit.',
  more: 'Betonte Silben kommen im Pop ständig ein Achtel zu früh – auf die Eins wie auf die Drei. Man nennt das auch „Push“. Im Chor sitzt er nur, wenn alle den Schlag danach innerlich spüren.' },

{ id: 'aufE', ch: 4, meter: '4/4', bpm: 66, name: 'Einsatz auf dem „e“', bars: ['12 -3 3 6 12 12'],
  intro: 'Auf der Zwei eine Sechzehntelpause, dann setzt du auf dem „e“ ein: „1 (2) e + 3 4“. Der Einsatz kommt knapp nach dem Schlag, nicht auf ihm.' },

{ id: 'aufA', ch: 4, meter: '4/4', bpm: 66, name: 'Einsatz auf dem „a“', bars: ['12 -9 3 12 12'],
  intro: 'Auf der Zwei eine punktierte Achtelpause, dann ein Sechzehntel auf dem „a“, direkt vor der Drei: „1 (2 e +) a 3 4“. Kurz und leicht in die Drei hinein.',
  more: 'Viele Popphrasen beginnen so: eine kurze Silbe ein Sechzehntel vor dem Schlag. Zu früh klingt gehetzt, zu spät wird daraus eine Silbe auf dem Schlag.' },

{ id: 'synkope16', ch: 4, meter: '4/4', bpm: 66, name: 'Die Sechzehntel-Synkope', bars: ['3 6 3 12 3 6 3 12'],
  intro: 'Sechzehntel, Achtel, Sechzehntel – Klatscher auf 1, „e“ und „a“: die Synkope im Kleinen. Das Achtel beginnt auf dem „e“ und überbrückt das „und“.',
  more: 'Diese Figur ist typisch für R&B, Funk und viele Rap-Phrasierungen. Nicht mit der Triole verwechseln: Die Abstände sind kurz – lang – kurz, nicht gleich.' },

{ id: 'shuffle', ch: 5, meter: '4/4', bpm: 88, name: 'Der Shuffle', shuffle: true, bars: ['8 4 8 4 12 12'],
  intro: 'Zwei Achtel, aber ungleich: das erste lang, das zweite kurz, wie Anfang und Ende einer Triole. Geschrieben wird gerade, darüber steht „Shuffle“.',
  more: 'Shuffle und Swing sind die Grundlage von Blues, Boogie, Swing und vielen Soulsongs. Wie stark geswingt wird, ist Stilfrage – hier genau triolisch.' },

{ id: 'zwoelfachtel', ch: 5, meter: '12/8', bpm: 56, name: 'Die Soul-Ballade (12/8)', bars: ['12 6 12 6 18 18'],
  intro: 'Zwölf Achtel, gefühlt vier große Schläge zu je drei Achteln. Die ersten beiden schaukeln lang-kurz, auf die letzten zwei klatschst du einmal pro großem Schlag.',
  more: 'Der 12/8-Takt trägt viele Soul- und Gospelballaden und den langsamen Blues. Die Snare liegt auf dem zweiten und vierten großen Schlag – ein Backbeat in Dreiergruppen.' },
```

- `accomp` (optional je Lektion) überschreibt die Begleitung aller Schritte
  (Paket 5). Nur `backbeat` nutzt es.
- **`shuffle: true`** (neu, optional): `coursePattern` markiert Noten mit
  8 und 4 Ticks als `sh` und setzt `pattern.shuffle = true`, genau wie
  `makePattern` es für Shuffle-Muster tut. Notenbild (gerade Achtel mit
  „Shuffle ♫ = ♩ ♪³“), Wiedergabe, Auswertung und Silben laufen dann über
  den bestehenden Shuffle-Weg. In einer Lektion ohne `shuffle` sind 8 und 4
  als Paar weiterhin Fehler.
- `12/8` ist in `METERS` vorhanden; der Kurs nutzt es erstmals. Einzähler,
  Tempo-Bezug (punktierte Viertel) und Silben „in 12“ bzw. wie 6/8 prüfen.

**3d Geänderte Texte bestehender Lektionen** (nur `more` bzw. Statuszeile):

```js
// offbeat.more
'Das ist das Markenzeichen von Ska und Reggae: Dort spielt die Gitarre fast nur auf dem „und“. Im Popsong liegt der Offbeat oft in Hi-Hat oder Keyboard – er treibt, der Backbeat trägt.'
// 16achtel.more (ersetzt den Rossini-Text)
'Kurz-kurz-lang treibt nach vorn. Das Achtel am Ende nicht verkürzen – sonst rutschen die nächsten Sechzehntel zu früh.'
```

Alle übrigen Texte bleiben. Die Lektionen in Kapitel 7 bleiben inhaltlich
unverändert.

**3e Fortschritt und Navigation**
- Zähler „x/y geschafft“ (Kachel, Blatt „Alle Lektionen“, Kursleiste) zählt
  nur Lektionen mit `ch < COURSE_EXTRA_CH`. Kapitel 7 bekommt im Blatt eine
  eigene Überschrift „Zusatz (freiwillig)“ und einen eigenen Zähler.
- „Nächste Lektion“ nach der letzten Lektion von Kapitel 6: keine
  automatische Weiterleitung nach Kapitel 7, sondern Statuszeile „Kurs
  geschafft! Im Zusatzkapitel warten Walzer, Barock und Klassik – oder übe
  gemischt weiter.“
- Wer bereits Lektionen aus Kapitel 7 geschafft hat, behält sie (`done`).
  Steht `course.lesson` auf einer Zusatzlektion, bleibt sie gewählt.
- `reviewPool()` und `holdPool()` dürfen weiter alle geschafften Lektionen
  enthalten.

**Prüfungen Paket 3:**
- `courseCheck()` erweitern: Kapitelnummern aufsteigend (wie bisher);
  `DRAWABLE` um 8 erweitern **nur** für Lektionen mit `shuffle: true`, dort
  jede 8 direkt gefolgt von einer 4 innerhalb derselben Viertel; die
  Triolen-Prüfung (`n.d === 4`) überspringt `sh`-Noten; Taktsummen,
  Auftakt-Regel, Textlängen wie bisher (die neuen Texte sind vorab
  geprüft: `intro` ≤ 160, `more` ≤ 185 Zeichen).
- Jede bis zu diesem Paket gültige Lektions-ID steht weiter in `COURSE`
  (Liste der alten IDs im Test fest eintragen).
- Roundtrip `course`: alter Datensatz mit `done` aus allen alten IDs →
  laden → gleiche Menge; `lesson: 'walzer'` bleibt gewählt; `duoOstinato`
  jeder alten haltbaren ID bleibt gültig.
- Zähler: `done = ['puls', 'walzer']` → Kurs 1/26, Zusatz 1/7.
- **Hörtest:** Shuffle (Vorbild klingt triolisch), 12/8-Ballade (Einzähler
  auf den großen Schlägen), Einsatz auf dem „a“.
- Commit: `Rhythmus-Kurs: Kapitel nach Funktion, acht neue Pop-Lektionen, Zusatzkapitel`

### Paket 4 – Kursablauf: erst hören, zuletzt lesen

**4a Neue Schritte** (`courseSteps`):

```js
function courseSteps(l) {
  const steps = [
    { mode: 'echo', name: 'Nachklatschen', how: 'Hören, dann ohne Noten nachklatschen.', accomp: 'full' },
    { mode: 'echo', gap: 1, name: 'Behalten', how: 'Hören, einen Takt still weiterzählen, dann nachklatschen.', accomp: 'backbeat' },
    combinable(l)
      ? { mode: 'echo', combo: true, name: 'Im Zusammenhang', how: 'Zwei Takte nach Gehör: der neue Rhythmus und ein bekannter.', accomp: 'snare' }
      : { mode: 'echo', name: 'Nur mit Snare', how: 'Nachklatschen, nur die Snare auf 2 und 4 hält dich.', accomp: 'snare' },
  ];
  if (course.notes !== 'off') steps.push({ mode: 'along', name: 'So sieht es aus', how: 'Mitklatschen und dabei die Noten lesen – der Rhythmus, den du schon kannst, als Notenbild.', accomp: 'full' });
  return steps;
}
```

- „Im Zusammenhang“ ist jetzt Nachklatschen statt Vom Blatt; die
  Partnerwahl (`comboPartners`) bleibt.
- Neue Einstellung `course.notes` ∈ `'last' | 'off'` (Standard `'last'`),
  im Kurs-Zahnrad: „Notenbild im Kurs: als letzter Schritt / aus“. Wird sie
  mitten in einer Lektion geändert, beginnt die Lektion beim nächsten Play
  bei Schritt 1.
- Wiederholung (`courseRoundSpec`, `course.review`): nur noch
  `mode: 'echo'`, Begleitung `backbeat`.
- `course.syl`: Standard `'count'`, nur wenn noch nichts gespeichert ist.
- Texte anpassen: Statuszeile beim Laden einer Lektion („— Play startet mit
  dem Nachklatschen.“), der Kommentar „Mitklatschen gibt es nur noch als
  ersten Schritt …“ (jetzt letzter Schritt), der Kurs-Hilfetext. Alle
  Stellen mit `grep -n "Mitklatschen\|Vom Blatt" uebe-lab.html` prüfen.
- Kurs-Schritt 1–3 zeigen keine Notenköpfe (Paket 2); die Silbenzeile
  entfällt dort ebenfalls, weil sie an den Notenköpfen hängt.

**Prüfungen Paket 4:**
- `courseSteps` für eine kombinierbare und eine nicht kombinierbare Lektion,
  je mit `notes: 'last'` (4 Schritte, letzter `along`) und `'off'`
  (3 Schritte, kein `along`, kein `read`).
- 200 Wiederholungsrunden aus `courseRoundSpec` mit fester Zufallsquelle:
  nur `echo`.
- Roundtrip `course.notes` und `course.syl` (neu / alt ohne Feld →
  `'last'` bzw. gespeichertes `'ta'` bleibt `'ta'` / kaputt → Standard).
- Sichtprüfung: Kursleiste mit vier Schritten, Schritt 4 mit Noten und
  Marke.
- Commit: `Rhythmus-Kurs: Hören vor Lesen, Notenbild als letzter Schritt`

### Paket 5 – Begleitung: Groove statt Klick, schrittweise ausgedünnt

**Didaktik:** Im Pop entsteht Rhythmus gegen den Groove, nicht gegen einen
gleichförmigen Klick. Synkopen und Vorziehen ergeben erst Sinn, wenn Eins
und Backbeat hörbar sind. Das volle Schlagzeug ist aber auch eine Stütze
(die Hi-Hat spielt die Unterteilung vor). Deshalb wird es innerhalb jeder
Lektion abgebaut – vom vollen Groove über Bassdrum + Snare bis zur Snare
allein auf 2 und 4 (das „Backbeat-Metronom“, mit dem viele Popmusiker:innen
üben). In Kapitel 1 bleibt der Klick, weil dort der Puls selbst gelernt
wird; die Lektion „Der Backbeat“ lässt die Lernenden die Snare selbst
spielen.

**5a Klänge:** `drum(kind, time, vel)` mit `kick`, `snare`, `rim`, `hat` aus
`metronom.html` in die Engine von `uebe-lab.html` kopieren, Ausgang über
`run.bus` (damit das Ausblenden beim Stoppen greift). Gesamtpegel der
Begleitung so wählen, dass Vorbild-Klatscher (`engine.clap`) deutlich
darüber liegen (Richtwert: Begleitung −8 dB gegenüber dem Metronom-Tool);
die Snare der Begleitung eher dunkel/kurz, damit sie sich vom Klatscher
unterscheidet. Im Bericht notieren, welche Werte gewählt wurden.

**5b Neutrale Grooves** (Ticks je Takt, 12 = Viertel):

```js
const ACCOMP = {
  '4/4':  { kick: [0, 24], snare: [12, 36] },
  '6/8':  { kick: [0], rim: [18] },
  '12/8': { kick: [0, 36], snare: [18, 54] },
};
// Hi-Hat-Raster je Lektion (nur Stufe 'full'):
//   Shuffle-Lektion: je Viertel 0 und 8
//   Muster mit Sechzehnteln (irgendein n.d % 6 !== 0, ohne Shuffle/Triolen): alle 3 Ticks
//   sonst: alle 6 Ticks (auch 6/8, 12/8)
//   Triolen-Lektion: alle 4 Ticks
const ACCOMP_LEVELS = {
  full: ['kick', 'snare', 'rim', 'hat'],
  backbeat: ['kick', 'snare', 'rim'],
  snare: ['snare', 'rim'],
  kick: ['kick'],
};
```

- Taktarten ohne Eintrag in `ACCOMP` (2/4, 3/4, 2/2, 5/4, 7/8) und Kapitel 1
  (außer `backbeat`) und Kapitel 7: Klick wie bisher.
- Die Begleitung läuft durch alle Abschnitte einer Runde (Vorbild,
  Leertakte, eigene Phase, Pause-Takt), nicht im Einzähler (dort Klick).
- Solange die Begleitung läuft, entfällt der Zählzeit-Klick
  (`state.click` gilt dann nicht); der Einzähler-Klick bleibt.
- Stufe je Runde: `lesson.accomp` ?? `step.accomp` (Paket 4); Wiederholung
  `backbeat`.
- Mikrofon-Eingabe: Begleitung bleibt; der bestehende Hinweis „Mit
  Kopfhörern“ wird um „— sonst hört das Mikrofon das Schlagzeug“ ergänzt.

**5c Einstellungen**
- Kurs: `course.accomp` ∈ `'groove' | 'click'` (Standard `'groove'`):
  „Begleitung im Kurs: Groove (wird je Schritt leiser) / Klick“.
- Freie Übungen (Nachklatschen, Vom Blatt): `state.accomp` ∈
  `'click' | 'full' | 'backbeat' | 'snare'` (Standard `'click'`, also
  unverändert), im Zahnrad-Blatt „Begleitung: Klick / Groove / Bassdrum und
  Snare / nur Snare auf 2 und 4“. Hi-Hat-Raster aus den Bausteinen der
  Stufe (Sechzehntel, wenn `s` oder `off` gewählt ist; Shuffle-Raster, wenn
  das Muster `shuffle` ist). Taktarten ohne `ACCOMP`-Eintrag: Klick, im
  Blatt ein Satz dazu.
- Zweistimmig: immer Klick, Einstellung dort ausgeblendet.

**Prüfungen Paket 5:**
- **Groove verrät nichts:** Für jede Lektion und jede Stufe: alle Kick-,
  Snare- und Rim-Positionen liegen auf Hauptschlägen (4/4: `% 12 === 0`;
  6/8, 12/8: `% 18 === 0`); das Hi-Hat-Raster ist gleichmäßig. Kein
  Instrument außer der Hi-Hat hat einen Einsatz auf einer Offbeat-Position
  des Zielmusters.
- Reine Funktion `accompFor(lesson, step, settings)` → `{ level, hatGrid }`
  bzw. `null` (Klick), exportiert; `selfCheck` prüft Kapitel 1 (Klick),
  `backbeat` (`kick`), eine 16tel-Lektion Schritt 1 (Raster 3), Shuffle
  (0/8), Kapitel 7 (Klick), `course.accomp = 'click'` (überall Klick).
- Geplante Ereignisse über 12 Runden mit wechselndem Auftakt: Begleitung im
  absoluten Tick-Raster lückenlos, kein doppelter Schlag an Rundengrenzen,
  im Einzähler kein Schlagzeug.
- Roundtrip `course.accomp`, `state.accomp`.
- Vorher/Nachher: Freie Übungen mit Standardeinstellung erzeugen dieselben
  Klick-Ereignisse wie vor dem Paket.
- **Hörtest:** Vorbild-Klatscher über vollem Groove gut hörbar; Snare und
  Klatscher unterscheidbar; Ausdünnen von Schritt 1 zu 3 hörbar; Stoppen
  ohne Nachklingen.
- Commit: `Rhythmus: Groove-Begleitung im Kurs und als Wahl in den Übungen`

---

## 5. Bericht

Datei `BERICHT-POP-RHYTHMUSKURS.md`, im letzten Commit, Aufbau wie
`BERICHT-DIDAKTIK.md`:
- Tabelle: Paket, Status, Commit, `SW_VERSION`, Prüfungen.
- Je Paket: Geändert, Abweichungen (mit Grund).
- Gewählte Pegel und Klangparameter der Begleitung (Paket 5).
- Hörtest- und Sehtest-Checkliste für morgens.
- „Morgens im Browser ausführen“, falls kein Headless-Browser vorhanden war.
- **Zu entscheiden** – mindestens:
  - Soll Zweistimmig dieselben Sichtbarkeitsregeln bekommen (Marke nur in
    Lesephasen)?
  - Soll die Begleitung in freien Übungen künftig standardmäßig „Groove“
    sein?
  - Soll „Im Zusammenhang“ auch Partner aus späteren Kapiteln mischen?
  - Passen die Starttempi der neuen Lektionen zum Chor (Sechzehntel-Kapitel
    bei 66 BPM)?
  - Alles, was unterwegs auffiel, aber nicht zum Auftrag gehörte.
