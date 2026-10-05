# Arbeitsanweisung für Claude Code – Hören in der Tonart

Du bist erfahrene Chorleiterin/erfahrener Chorleiter und Entwickler:in. Du
baust im Reiter „Hören“ der Ausbildung (`uebe-lab.html`) zwei neue Modi, die
das Erkennen von Tönen und Akkorden innerhalb einer Tonart üben, und räumst
die Liste der Akkordfolgen auf:

- **Töne in der Tonart** – eine Kadenz legt die Tonart fest, danach erklingt
  ein einzelner Ton. Welche Silbe (do, re, mi …) bzw. Stufe ist das?
- **Akkorde in der Tonart** – eine Kadenz, danach ein einzelner Akkord.
  Welche Stufe (I, IV, V, vi …) ist das?
- **Akkordfolgen** – nur noch gängige Folgen (Pop-Standards und echte
  Chorwendungen), selten gebrauchte raus, fehlende Pop-Standards rein.

Das Herzstück beider neuen Modi ist die **Auflösung nach der richtigen
Antwort**: Der Ton bzw. Akkord läuft hörbar zur Tonika, und bei jedem
erklingenden Ton leuchtet der passende Antwortknopf mit auf. So hört man,
*warum* ein Ton „re“ ist – er will nach „do“.

Beide Modi stehen in der Liste **direkt vor „Akkordfolgen“**: Wer einzelne
Töne und Akkorde in der Tonart erkennt, kann danach Folgen heraushören.

Antworte und kommentiere auf Deutsch. **Die Anweisung läuft
unbeaufsichtigt:** keine Rückfragen; bei Unklarheit die Variante näher am
bestehenden Verhalten wählen und im Bericht unter „Zu entscheiden“ notieren.

---

## 0. Vorbereitung

1. `git fetch origin`, dann Branch `hoeren-tonart` von `origin/main` anlegen
   (geschrieben gegen Stand `ff41355`, `SW_VERSION` `v354`). Nie auf `main`
   committen, nie mergen, nie force-pushen.
2. `CLAUDE.md` und `README.md` vollständig lesen. Danach in `uebe-lab.html`
   lesen: den Abschnitt „HÖREN“ (`CHORD_SYMBOLS`, `SYMBOL_ORDER`,
   `symbolLabel`, `EAR_PROGRESSIONS`, `EAR_LEVELS`, `levelProgs`, `ear`,
   `voiceProgression`, `newTask`, `makeEarTask`, `playEar`, `playEarTask`,
   `playChordSymbol`, `answerEar`, `answerChord`, `finishEarAnswer`,
   `onEarResult`, `earLevelInfo`, `applyEarLevelFor`, `answerButton`,
   `renderEar`), außerdem `SOLFA`, `solfaOf`, `singRange`, `placeNear`,
   `pickInterval`, `FIND_LEVELS` (Stufe 5 spielt schon eine Kadenz vor,
   siehe `task.cue === 'cadence'`), `MODE_TEXT`, `MODE_ICONS`,
   `QUICK_CHAINS`, `QUICK_MINUTES`, das Speichern/Laden (`ear:` im
   gespeicherten Stand und `restore`) und die Selbsttests zu „Hören“ in
   `runSelfTests`. In `app.js`: `PROGRESS_AREAS`, `PROGRESS_GROUPS`.
3. Diese Datei im ersten Commit unter
   `ARBEITSANWEISUNG-HOEREN-IN-DER-TONART.md` mit einchecken.

## 1. Feste Regeln (gelten für jedes Paket)

- **Ein Paket = ein Commit**, danach sofort `git push -u origin hoeren-tonart`.
- **SW_VERSION** in `sw.js` bei jedem Commit um eins erhöhen. Vor dem Commit
  `git diff --cached --stat` gegen die Liste in `CLAUDE.md` prüfen.
- **Keine bestehenden IDs ändern** (Modus-IDs in `EAR_MODES`, IDs in
  `EAR_PROGRESSIONS`, Einstellungs-Schlüssel, Fortschritts-Bereiche). Neue
  Einträge bekommen neue IDs. Einträge dürfen entfernt werden, wenn das
  Laden alter Stände nachweislich verträgt (Test).
- **Gespeicherte Zustände:** neue Felder optional mit Standardwert; `restore`
  übernimmt nur gültige Werte, sonst Standard. `DATA_VERSION` in `app.js`
  nicht anfassen.
- **Texte:** `uebe-lab.html` ist nur deutsch. Was in `app.js`/`index.html`
  sichtbar wird, über `strings.js` in DE, EN und PL.
- **Keine neuen Abhängigkeiten, kein Build-Schritt.** Klang nur über die
  vorhandene `engine` (`engine.keys`, `engine.newBus`, `engine.fadeBus`).
- **Barrierefreiheit:** Tippflächen mindestens 44 px; die Hervorhebung
  während der Auflösung zusätzlich zur Farbe über `aria-live` ansagen (nur
  einmal den Satz, nicht jeden Ton); `prefers-reduced-motion` respektieren
  (keine Puls-Animation, nur Farbwechsel).
- **Ermutigende Wortwahl** wie in den anderen Modi („Noch nicht — …“).
- **Selbsttests:** Jedes Paket ergänzt `runSelfTests` in `uebe-lab.html`
  (Paket 5 auch in `app.js`). Bestehende Tests nur dort anpassen, wo sie
  genau das geänderte Verhalten prüfen – im Bericht auflisten.
- **Nur umsetzen, was im Paket steht.** Was dir unterwegs auffällt, kommt in
  den Bericht unter „Beobachtungen“.

## 2. Entscheidungen (verbindlich)

| Thema | Festlegung |
|---|---|
| Modus-IDs | `noteInKey` („Töne in der Tonart“), `chordInKey` („Akkorde in der Tonart“); zugleich die Namen der Fortschrittsbereiche |
| Name | Nicht „Tonstufen“/„Stufen“: „Stufe“ heißt in der App schon der Schwierigkeitsgrad |
| Reihenfolge in `EAR_MODES` | Intervalle · Klänge · Schlüsse · **Töne in der Tonart** · **Akkorde in der Tonart** · Akkordfolgen · Stimmen · Intonation |
| Kurztexte (`MODE_TEXT`) | `noteInKey`: „Nach der Kadenz ein Ton – welche Silbe?“; `chordInKey`: „Nach der Kadenz ein Akkord – welche Stufe?“ |
| Tonart festlegen | Kadenz I–IV–V–I (Dur) bzw. i–iv–V–i (Moll), gesetzt mit `voiceProgression`, Tempo aus `ear.settings.tempo` (`CHORD_TEMPI`), danach 0,6 s Pause |
| Tonart | Standard: jede Aufgabe neu (wie im Rest von „Hören“). Einstellung „gleiche Tonart für 5 Aufgaben“ |
| Kadenz | Standard: vor jeder Aufgabe. Einstellung „nur bei neuer Tonart“ (greift nur, wenn die Tonart gehalten wird) |
| Beschriftung Töne | Relative Solmisation wie in „Singen“, **Moll la-basiert** (la ti do re mi fa so, Leitton „si“). Umschaltbar auf Zahlen (Dur 1–7; Moll ab la = 1, Leitton „♯7“). Ein gemeinsamer Wert mit „Singen“: `sing.solfa` |
| Beschriftung Akkorde | römische Ziffern über `symbolLabel` (wie „Akkordfolgen“) |
| Antworten | Falscher Tipp → Knopf rot, man darf weiter tippen. **Gewertet wird nur der erste Tipp** (eine Meldung je Aufgabe). Nach dem zweiten Fehlversuch wird die Lösung grün gezeigt und die Auflösung trotzdem gespielt |
| Auflösung | Nach der richtigen Antwort automatisch (Einstellung, Standard an); Töne/Akkorde laut Anhang A; jeder Antwortknopf leuchtet genau dann, wenn sein Ton/Akkord klingt |
| Rhythmus der Auflösung | Töne: erster 0,6 s, mittlere 0,3 s, letzter 1,2 s. Akkorde: je 0,7 s, letzter 1,4 s |
| Nach dem Auflösen | Knöpfe antippen spielt den Ton/Akkord zum Vergleichen (wie bei Intervallen/Klängen); Knopf „Auflösung nochmal“ |
| Automatisch weiter | erst 1 s **nach dem Ende** der Auflösung, nie mitten hinein |
| Ziehen der Aufgabe | gewichtet wie `pickInterval` (1 + Fehler der letzten 10 Antworten je Ton/Akkord, nur für die Sitzung); nie dreimal hintereinander dieselbe Antwort |
| Tonlage (Töne) | Ton in der Lage der eigenen Stimme: `singRange(ear.part)` und `placeNear`; ab Stufe 4 zufällige Oktave innerhalb des Bereichs |
| Akkordfolgen | Katalog laut Anhang B: 2 Folgen raus, 8 gängige rein |

---

## 3. Pakete

### Paket 1 – Akkordfolgen: nur gängige Folgen

Ausgangslage (Befund, zur Einordnung): Die Folgen sind **nicht zufällig
zusammengewürfelt**. `EAR_PROGRESSIONS` ist eine feste Liste; zufällig ist
nur, *welche* der eingeschalteten Folgen drankommt (`pick(enabledProgs())`),
die Tonart und ab Stufe 6 die stilgerechte Umkehrung (regelgebunden über
`bassIndex`). Die meisten Folgen sind gängig. Zwei sind selten und
wirken konstruiert, mehrere der häufigsten Pop-Folgen fehlen. Details:
Anhang B.

1. Aus `EAR_PROGRESSIONS` **entfernen**: `rising` (I–iii–IV–V) und
   `mnatural` (i–VI–iv–v); ebenso aus `EAR_LEVELS[…].add`.
2. **Neu** (IDs, Namen, Stufe):

   | ID | Folge | Name | Stufe |
   |---|---|---|---|
   | `rock` | I–IV–V–IV | Drei-Akkord-Runde | 1 |
   | `rockback` | I–V–IV–I | Rock-Schluss | 1 |
   | `pop4` | I–IV–vi–V | Pop mit vi vor V | 2 |
   | `axis4` | IV–I–V–vi | Pop ab der IV | 2 |
   | `hopscotch` | IV–V–vi–I | Pop aufwärts | 2 |
   | `pachelbel` | I–V–vi–iii–IV–I–IV–V | Pachelbel-Folge | 3 |
   | `aeolian` | i–VII–VI–VII | Moll-Pendel | 4 |
   | `mvamp` | i–VI–VII–i | Moll-Aufstieg | 4 |

   Alle nutzen nur vorhandene Symbole aus `CHORD_SYMBOLS`. Vorab geprüft:
   mit `voiceProgression` in allen 12 Tonarten (eng/weit, Grundstellung und
   stilgerecht) ohne Quint-/Oktavparallelen.
3. Stufen-Beschriftungen anpassen: Stufe 2 → „dazu vi – die vier
   Pop-Akkorde“; Stufe 3 → „dazu ii und iii, V⁷“ (Pachelbel bringt iii
   jetzt statt `rising`); Stufe 5 → „Quintfallsequenz, phrygischer
   Halbschluss, weite Lage“.
4. `makeLineTask` („Stimmen“) zieht aus `levelProgs(3)` – prüfen, dass
   `slice(0, n)` mit der achtteiligen Pachelbel-Folge richtig läuft.
5. **Tests:** Die bestehenden Tests (alle Folgen in Stufe 6, Symbole
   vorhanden, keine Parallelen, Quartsext nur als Kadenzquartsext) laufen
   unverändert grün. Neu: `restore` mit gespeichertem
   `progs: ['rising', 'pop']` ergibt `['pop']`; mit `progs: ['mnatural']`
   bleibt die Standard-Auswahl erhalten (keine leere Liste).

### Paket 2 – Gemeinsame Bausteine: Kadenz, Antwortlogik, Auflösung

Reine Funktionen und Wiedergabe, die beide neuen Modi benutzen.

- `inKeyCadence(key, kmode)` → `voiceProgression(key, kmode === 'minor' ?
  ['i','iv','V','i'] : ['I','IV','V','I'], { spread: 'close' })`.
- `playInKeyTask(task, t0, bus, { cadence = true, onlyTarget = false })`:
  Kadenz (falls `cadence`), 0,6 s Pause, dann das Ziel (Ton über
  `engine.keys` mit `velocity .22`, 1,2 s; Akkord wie in `playChordSymbol`,
  1,2 s). Aufgerufen aus `playEar`, analog zum Zweig für `playEarTask`.
- `playResolution(task)`: spielt `task.resolution` (Anhang A) im Rhythmus
  aus Abschnitt 2 und setzt für jeden Schritt per `ear.timers` die Klasse
  `is-playing` auf den Antwortknopf mit `data-ans` = Wert des Schritts
  (alle anderen ohne). Am Ende alle `is-playing` entfernen. Gibt die Dauer
  in ms zurück.
- `answerInKey(value)`: Logik aus Abschnitt 2 („Antworten“). Merkt sich
  in `task.tries` die falschen Tipps; beim ersten Tipp einmalig
  `task.firstOk` setzen und `onEarResult(task, task.firstOk)` aufrufen
  (Statistik: `ear.stats.noteInKey`/`chordInKey` `{ right, total }`,
  Streak wie bisher). Bei richtig oder nach dem zweiten Fehlversuch:
  `ear.revealed = true`, Rückmeldung, Auflösung, dann – nur wenn der erste
  Tipp richtig war und `autoNext` an ist – `nextEar` nach
  Auflösungsdauer + 1000 ms. Nach dem Auflösen spielt ein Tipp nur noch den
  Vergleichston/-akkord.
- `finishEarAnswer` dafür nicht umbiegen; wenn du es wiederverwenden willst,
  nur um einen optionalen Parameter `delayMs` für `autoNext` erweitern
  (Standard wie bisher).
- CSS: `.answer.is-playing` (deutliche Hervorhebung, z. B. Rahmen in
  `--good` und leichte Aufhellung); unter `prefers-reduced-motion` ohne
  Übergang. `.answer.is-bad` bleibt nach einem Fehlversuch sichtbar, bis
  die nächste Aufgabe kommt.
- **Tests:** Ablauf mit `selfTesting = true` (nichts melden, nichts
  spielen): falsch → richtig ergibt genau eine Meldung mit `ok = false`,
  `total + 1`, `right + 0`; zweimal falsch deckt auf; richtig beim ersten
  Tipp ergibt `ok = true`; nach dem Aufdecken ändert ein Tipp die
  Statistik nicht mehr; die Zahl der gesetzten Hervorhebungs-Timer ist
  gleich der Länge von `task.resolution`.

### Paket 3 – Modus „Töne in der Tonart“ (`noteInKey`)

**Stufen** (`NOTE_IN_KEY_LEVELS`, jede enthält die vorige, wie überall 1–6):

| Stufe | Beschriftung | Tongeschlecht | Antworten (Stufen ab Tonika) | Lage |
|---|---|---|---|---|
| 1 | do re mi | Dur | 1 2 3 | nah an der Mitte |
| 2 | do bis so | Dur | 1–5 | nah an der Mitte |
| 3 | ganze Dur-Tonleiter | Dur | 1–7 | nah an der Mitte |
| 4 | ganze Tonleiter, weite Lage | Dur | 1–7 | zufällige Oktave im Umfang |
| 5 | Moll: la bis so | Moll | 1–7 (natürlich) | zufällige Oktave |
| 6 | Dur oder Moll, dazu si | beide | Dur 1–7; Moll 1–7 und ♯7 | zufällige Oktave |

Halbtöne über der Tonika: Dur `[0,2,4,5,7,9,11]`, Moll `[0,2,3,5,7,8,10]`,
Leitton ♯7 = 11. Moll heißt in der Anzeige ab la (siehe `solfaOf` und
`FIND_LEVELS` Stufe 5, dort `SOLFA[mod(deg + 5, 7)]`); „si“ bzw. „♯7“
ergänzen.

**Aufgabe** (`makeEarTask('noteInKey', n, rnd)`): `{ kind: 'noteInKey',
level, kmode, key, deg, semis, note, resolution, answer: null, tries: [] }`.
`note` = `placeNear(key + semis, Mitte, lo, hi)` bzw. ab Stufe 4 eine
zufällige Oktave im Bereich `singRange(ear.part)`. `resolution` = Liste von
`{ value, midi }` laut Anhang A, erster Eintrag ist der gefragte Ton selbst.

**Anzeige** (`renderEar`): Frage „Welcher Ton war das?“, darunter
„Dur · nach der Kadenz“ bzw. „Moll (la) · …“; nach dem Auflösen
„Antippen zum Vergleichen“. Knöpfe in Tonleiter-Reihenfolge ab Tonika,
`answerButton(value, label)` mit `aria-label` „3: mi“. Zusatzknöpfe:
vor dem Auflösen „Nur den Ton“, danach „Auflösung nochmal“.

**Rückmeldung:** richtig „Richtig: mi – die 3. Stufe in D-Dur.“;
nach zwei Fehlversuchen „Das war mi (3. Stufe) – hör, wie es nach do
läuft.“ Tonart mit `keyName`.

**Einstellungen** (Zahnrad, nur in diesem Modus sichtbar): Silben/Zahlen
(schreibt `sing.solfa`), Tonart jede Aufgabe / für 5 Aufgaben, Kadenz
immer / nur bei neuer Tonart, Auflösung an/aus, automatisch weiter. Neue
Schlüssel in `ear.settings`: `inKeyHold` (Standard `false`),
`inKeyCadence` (`'always'`), `inKeyResolve` (`true`).

**Tests:** 500 Aufgaben je Stufe: Antwort in der Stufen-Menge; Moll erst ab
Stufe 5, ♯7 erst in Stufe 6; `note` im Bereich `singRange` (für alle vier
Stimmen S/A/T/B); `resolution[0]` ist der gefragte Ton, der letzte hat die
Tonhöhenklasse der Tonika, alle Schritte ≤ 2 Halbtöne, Länge ≤ 5; **jeder
Wert der Auflösung hat einen Knopf in dieser Stufe** (sonst könnte nichts
aufleuchten). Gewichtung: nach 5 Fehlern bei „fa“ wird „fa“ in 2000
Ziehungen häufiger gezogen als jeder andere Ton; keine Antwort dreimal in
Folge.

### Paket 4 – Modus „Akkorde in der Tonart“ (`chordInKey`)

**Stufen** (`CHORD_IN_KEY_LEVELS`):

| Stufe | Beschriftung | Antworten | Klang |
|---|---|---|---|
| 1 | I, IV und V | Dur: I IV V | Grundstellung, eng |
| 2 | dazu vi | + vi | Grundstellung, eng |
| 3 | dazu ii und iii | + ii iii | Grundstellung, eng |
| 4 | dazu V⁷ und vii° | + V7 vii° | Grundstellung, eng |
| 5 | Moll | Moll: i iv V VI III VII | Grundstellung, eng |
| 6 | Dur oder Moll, Umkehrungen | Dur wie 4; Moll wie 5 + ii° v | stilgerecht, weit |

**Aufgabe:** `{ kind: 'chordInKey', level, kmode, key, symbol, voicings,
resolution, answer: null, tries: [] }`. Die Auflösung laut Anhang A wird
**zusammen mit dem Aufgabenakkord** gesetzt:
`voicings = voiceProgression(key, [symbol, ...auflösung], { inversion,
spread, rnd })`; `voicings[0]` ist der Aufgabenakkord, der Rest die
Auflösung. So passen Frage und Auflösung klanglich zusammen, und
„Nochmal hören“ klingt gleich.

**Anzeige:** Frage „Welcher Akkord war das?“; Knöpfe in `SYMBOL_ORDER`,
nur die der Stufe und des Tongeschlechts dieser Aufgabe. Zusatzknöpfe wie
Paket 3 („Nur den Akkord“, „Auflösung nochmal“). Vergleichen nach dem
Auflösen über `playChordSymbol`.

**Rückmeldung:** richtig „Richtig: IV in A-Dur.“; nach zwei
Fehlversuchen „Das war vi – hör, wie er über V nach I zurückfindet.“

**Einstellungen:** dieselben Schlüssel wie Paket 3 (ohne Silben/Zahlen).

**Tests:** 500 Aufgaben je Stufe: Symbol in der Stufen-Menge; Moll erst ab
Stufe 5; Umkehrungen/weite Lage erst in Stufe 6; letzter Akkord der
Auflösung ist I bzw. i; jedes Symbol der Auflösung hat in dieser Stufe
einen Knopf; alle Auflösungen in allen 12 Tonarten ohne Quint-/
Oktavparallelen (`parallelCount`, wie der bestehende Test für „Schlüsse“).

### Paket 5 – Einbindung: Liste, Stufen, Fortschritt, Schnellstart

1. `EAR_MODES` in der Reihenfolge aus Abschnitt 2; `MODE_TEXT` und
   `MODE_ICONS` (Inline-SVG im Stil der vorhandenen: `viewBox="0 0 24 24"`,
   Strich, höchstens sechs Pfade; z. B. Notenkopf mit Pfeil nach unten zu
   einer Linie bzw. drei gestapelte Balken mit Pfeil).
2. `ear.levels` um `noteInKey: 1, chordInKey: 1` erweitern (das Laden in
   `restore` nimmt sie über `Object.keys(ear.levels)` automatisch mit);
   `earLevelInfo` um beide Tabellen; `ear.stats` um beide Zähler.
3. Neue `ear.settings`-Schlüssel in `restore` prüfen und übernehmen;
   Roundtrip-Test (speichern → laden → gleich; Unsinn → Standard).
4. `app.js`: `PROGRESS_AREAS` und `PROGRESS_GROUPS.ear` um `noteInKey` und
   `chordInKey` ergänzen, in `PROGRESS_GROUPS.ear` **vor**
   `progression`. `PROGRESS_AREA` in `uebe-lab.html` braucht keinen
   Eintrag (Modus-ID = Bereich). Test in `app.js`: `sanitizeProgress`
   behält Einträge der neuen Bereiche.
5. `QUICK_CHAINS.ear`: `['noteInKey', 8]` und `['chordInKey', 6]` direkt
   vor `['chords', 6]`; `QUICK_MINUTES.ear` auf 13.
6. README: Abschnitt zur Ausbildung/Hören um die zwei Modi ergänzen
   (Ablauf: Kadenz, Einzelton bzw. Einzelakkord, Antwort, Auflösung).

---

## 4. Wenn ein Paket nicht sauber klappt

Paket zurücksetzen, im Bericht mit Grund vermerken, mit dem nächsten
unabhängigen Paket weitermachen. Abhängigkeiten: 3 und 4 brauchen 2;
5 braucht 3 oder 4 (fehlt eines, die Einbindung nur für das vorhandene).
Paket 1 ist unabhängig. Findet der Parallelen-Test bei einer neuen
Akkordfolge doch Parallelen: nur diese Folge weglassen und im Bericht
nennen.

## 5. Abschluss

`BERICHT-HOEREN-IN-DER-TONART.md` anlegen, Aufbau wie
`BERICHT-UMSETZUNG.md` (Paket / Status / Commit / SW_VERSION / Tests mit
Zahlen, Abweichungen).

Unter „Manuell auf echten Geräten prüfen“ mindestens:
- Läuft die Hervorhebung auf dem Handy synchron zum Klang (Bluetooth-
  Kopfhörer: sichtbar zu früh?)
- Ist der Einzelton nach der Kadenz in Bass-Lage (tiefe Männerstimmen)
  noch gut zu hören?
- Fühlt sich „weiter tippen bis richtig“ gut an, oder frustriert es auf
  Stufe 3 mit sieben Knöpfen?

Unter „Zu entscheiden“ mindestens:
- Sollen die Akkordknöpfe zusätzlich Funktionsbuchstaben zeigen (T, S, D,
  Tp, Sp, Dp)? In Moll sind die Bezeichnungen nicht einheitlich, daher
  bewusst weggelassen.
- Soll es später Aufgaben mit zwei bis drei Tönen/Akkorden nacheinander
  geben (mehrere „Segmente“)? Dann ohne Auflösung.
- Soll der Einzelton wahlweise gesungen statt vom Klavier kommen (wie
  `sing.demo`)?

---

## Anhang A – Auflösungen

Grundsatz: Töne laufen stufenweise zur nächsten Tonika – die untere Hälfte
(1–4) abwärts, die obere (5–7) aufwärts in die Oktave. Akkorde laufen über
die Dominante nach Hause. Jeder Wert der Auflösung ist zugleich ein
Antwortknopf, der beim Erklingen aufleuchtet.

**Töne, Dur** (Silben; Zahlen entsprechend):

| gefragt | Auflösung |
|---|---|
| do | do (lang) |
| re | re – do |
| mi | mi – re – do |
| fa | fa – mi – re – do |
| so | so – la – ti – do′ |
| la | la – ti – do′ |
| ti | ti – do′ |

**Töne, Moll** (la-basiert). Obere Hälfte bewusst im natürlichen Moll
(mi – fa – so – la): Das harmonische Moll ergäbe den übermäßigen
Sekundschritt fa–si, den Chöre meiden.

| gefragt | Auflösung |
|---|---|
| la | la (lang) |
| ti | ti – la |
| do | do – ti – la |
| re | re – do – ti – la |
| mi | mi – fa – so – la′ |
| fa | fa – so – la′ |
| so | so – la′ |
| si (♯7) | si – la′ |

**Akkorde, Dur:**

| gefragt | Auflösung |
|---|---|
| I | I (lang) |
| ii | ii – V – I |
| iii | iii – IV – V – I |
| IV | IV – V – I |
| V, V⁷ | V – I bzw. V⁷ – I |
| vi | vi – V – I |
| vii° | vii° – I |

**Akkorde, Moll:**

| gefragt | Auflösung |
|---|---|
| i | i (lang) |
| ii° | ii° – V – i |
| III | III – V – i |
| iv | iv – V – i |
| v | v – VI – VII – i |
| V | V – i |
| VI | VI – VII – i |
| VII | VII – i |

Alle Akkord-Auflösungen sind vorab mit `voiceProgression` in allen 12
Tonarten (eng/weit, Grundstellung und stilgerecht) ohne Quint-/
Oktavparallelen geprüft; der Test in Paket 4 sichert das ab.

## Anhang B – Befund Akkordfolgen

Zufall steckt nur in der Auswahl aus der festen Liste, der Tonart und (ab
Stufe 6) der regelgebundenen Umkehrung. Im Groove Lab ist es genauso: Der
Zufallsknopf zieht aus der festen Liste `PROGRESSIONS`
(`progsForRandom`), nur passend zum Modus.

| ID | Folge | Urteil |
|---|---|---|
| `pop` | I–V–vi–IV | behalten – die häufigste Pop-Folge |
| `fifties` | I–vi–IV–V | behalten – Doo-Wop/50er |
| `sad` | vi–IV–I–V | behalten – Drehung der Pop-Folge |
| `cadence` | I–IV–V–I | behalten |
| `plagal` | I–IV–I–V | behalten – Volkslied/Kinderlied |
| `jazz` | ii–V–I–I | behalten |
| `rising` | I–iii–IV–V | **entfernen** – selten |
| `hymn` | I–ii–V–I | behalten |
| `epic` | i–VI–III–VII | behalten – Moll-Fassung der Pop-Folge |
| `mcadence` | i–iv–V–i | behalten |
| `andalusian` | i–VII–VI–V | behalten |
| `mpop` | i–iv–VII–III | behalten |
| `mnatural` | i–VI–iv–v | **entfernen** – selten, konstruiert |
| `tsd` | I–IV–V | behalten |
| `amen` | I–IV–I | behalten |
| `deceptive` | I–IV–V–vi | behalten |
| `quintfall` | vi–ii–V–I | behalten |
| `turnaround` | I–vi–ii–V | behalten |
| `circle` | I–IV–vii°–iii–vi–ii–V–I | behalten – Chorliteratur (Stufe 5) |
| `m3` | i–iv–V | behalten |
| `mdeceptive` | i–iv–V–VI | behalten |
| `v7` | I–IV–V⁷–I | behalten |
| `k64` | I–IV–I⁶₄–V–I | behalten – Chorwendung |
| `phryg` | i–iv⁶–V | behalten – Chorwendung |
| `ajoutee` | I–IV⁶₅–V–I | behalten – Chorwendung |

Neu (Paket 1): `rock`, `rockback`, `pop4`, `axis4`, `hopscotch`,
`pachelbel`, `aeolian`, `mvamp`.
