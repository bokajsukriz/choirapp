# Arbeitsanweisung für Claude Code – Nachsingen und „Im Takt“

Du bist erfahrene Chorleiterin/erfahrener Chorleiter und Entwickler:in. Du
baust im Reiter „Singen“ der Ausbildung (`uebe-lab.html`) zwei neue Modi:

- **Nachsingen** – eine Melodie hören und nachsingen; bewertet werden die
  Töne, das Tempo ist frei.
- **Im Takt** – Tonhöhe **und** Rhythmus zusammen, zum Klick; als Echo
  (hören, dann nachsingen) oder vom Blatt.

Für einen Chor, der ohne Noten nach Gehör lernt, ist das die zentrale
Fähigkeit. Beide Modi nutzen dieselbe Auswertung (Anhang A); sie ist gegen
simulierte Sänger:innen getestet (Anhang B, Ergebnisse in Paket 1).

Antworte und kommentiere auf Deutsch. **Die Anweisung läuft
unbeaufsichtigt:** keine Rückfragen; bei Unklarheit die Variante näher am
bestehenden Verhalten wählen und im Bericht unter „Zu entscheiden“ notieren.

---

## 0. Vorbereitung

1. Diese Anweisung baut auf `ARBEITSANWEISUNG-DIDAKTIK.md` auf und braucht
   daraus: Paket 1 (Stimmprofil, `practiceRange`), Paket 3 (Rhythmus-Stufen,
   Einsatzerkennung, `makePattern` mit Takten/Auftakt/Bindebögen), Paket 5
   (Reiter „Singen“, `makePitchJudge`, `SIGHT_LEVELS` und Melodie-Regeln),
   Paket 6 (Fortschritt, Stufen-Element), Paket 7 („Heute üben“).
2. Branch `nachsingen` vom Branch `didaktik` abzweigen (bzw. von `main`,
   falls `didaktik` dort schon gemergt ist). Nie auf `main` committen, nie
   mergen, nie force-pushen.
3. Fehlt eines der genannten Pakete im Ausgangsstand: das abhängige Paket
   hier überspringen, im Bericht vermerken, mit dem nächsten weitermachen.
4. Diese Datei im ersten Commit mit einchecken.

## 1. Feste Regeln

Es gelten die Regeln aus Abschnitt 1 von `ARBEITSANWEISUNG-DIDAKTIK.md`
(und damit aus `ARBEITSANWEISUNG-CLAUDE-CODE.md`): ein Paket = ein Commit +
Push, `SW_VERSION` je Commit erhöhen, keine IDs ändern, neue gespeicherte
Felder optional mit Standardwert und Roundtrip-Test, Mikrofon nie
aufzeichnen oder speichern, ermutigende Wortwahl, Barrierefreiheit, keine
Abhängigkeiten, kein Build-Schritt. Die Übe-Tools kennen nur die vier
Stimmen S, A, T, B.

## 2. Entscheidungen (verbindlich)

| Thema | Festlegung |
|---|---|
| Reihenfolge der Modus-Chips in „Singen“ | Tuner · Ton halten · Intervalle singen · Ton finden · **Nachsingen** · **Im Takt** · Blattsingen · Diktat |
| Nachsingen | Tempo frei, Reihenfolge und Tonhöhe zählen; Rhythmus wird gezeigt, nicht bewertet |
| Im Takt | Tonhöhe und Einsätze zählen, Tonlänge nur als Hinweis; zwei Varianten: Echo, Vom Blatt |
| Maß für den Einsatz | der **Vokal** (erster stabiler Ton), nicht der Konsonant – Chorregel „Konsonant vor dem Schlag, Vokal auf den Schlag“ |
| Silbe | Nachsingen frei (Vorschlag „no“); Im Takt „da“ – der Konsonant trennt Töne, auch Tonwiederholungen |
| Oktave | Singt jemand die ganze Melodie eine Oktave tiefer/höher, zählt das als richtig (Hinweis ohne Wertung) |
| Verschoben gesungen | Stimmen die Intervalle, aber nicht die Lage: Töne zählen als nicht getroffen, Rückmeldung nennt es ausdrücklich („Die Melodie stimmt, du bist einen Ganzton höher eingestiegen“) |
| Einsatzfenster | gut ±80 ms, knapp ±150 ms; in Stufe 1–2 von „Im Takt“ ±100/±180 ms |
| Latenz | eigene Kalibrierung durch Singen (`singLatencyMs`), getrennt von der Klatsch-Latenz |

---

## 3. Pakete

### Paket 1 – Auswertung (gemeinsam für beide Modi)

Die Auswertung aus **Anhang A** unverändert in `uebe-lab.html` übernehmen
(in den Abschnitt der Mikrofon-Übungen, als reine Funktionen
`segmentNotes`, `globalOffset`, `align`, `scoreEcho`) und über
`window.uebeLab` exportieren.

**Rahmen aufzeichnen (nur Zahlen, kein Audio):** Während der Singphase je
Bildschirmbild einen Rahmen `{ t, midi, rms }` in ein Array schreiben:
- `midi` aus `detectPitch()`, nur wenn `clarity ≥ .85` (sonst `null`);
  **roh**, ohne `smoothPitch` – die Auswertung glättet selbst.
- `t = audioCtx.currentTime − (Fensterlänge / 2) / sampleRate`: YIN misst
  die Mitte des Analysefensters. Den Rest gleicht die Kalibrierung aus.
- `rms` aus `detectPitch()` (auch bei `null`-Tonhöhe mitschreiben; bei
  Stille `rms` des Puffers).
- Nach der Auswertung das Array verwerfen.

**Ergebnis der Simulation** (Anhang B; 400 Durchläufe je Fall, Melodien mit
Schritten, Sprüngen, Tonwiederholungen und Moll; Sänger:in mit
Anschleifen, Vibrato ±35 Cent, 60 % Legato, 40 % Konsonanten,
2 % Oktavfehler der Tonerkennung, 120 ms Latenz):

| Fall | ♩ = 80, Viertel | ♩ = 84, Achtel |
|---|---|---|
| sauber gesungen: alles richtig erkannt | 97,8 % | 97,8 % |
| ein Ton ausgelassen: genau dieser fehlt | 98,5 % | 99,0 % |
| ein Ton einen Halbton daneben: genau dieser falsch | 99,5 % | 98,0 % |
| ganze Melodie eine Oktave tiefer: als richtig mit Hinweis | 99,3 % | 99,3 % |
| ganze Melodie einen Ganzton höher: als verschoben erkannt | 100 % | 99,8 % |
| Urteil je Ton stimmt mit der Wahrheit überein | ≥ 99,9 % | ≥ 99,9 % |
| Fehler der Einsatzmessung (Median / 90 %) | 12 / 44 ms | 12 / 44 ms |

Gemischte Rhythmen (Halbe bis Achtel, Tonwiederholungen) bei ♩ = 72/84/96:
alle Töne richtig erkannt in 96,5–97 %, Einsätze als „gut“ in 95,6–96,5 %.

**Bekannte Grenze:** Ein zusätzlicher Durchgangston, der kürzer als etwa
140 ms ist und tonhöhenmäßig zwischen seinen Nachbarn liegt, wird als
Gleiten gewertet und nicht als eigener Ton gezählt. Das ist gewollt
(Anschleifen und Legato-Übergänge sollen nicht als Fehler zählen).

**Tests (`selfCheck`):** die Simulation aus Anhang B als Test übernehmen
(fester Zufallsstartwert, je Fall 100 Durchläufe) mit diesen Schwellen:
sauber ≥ 95 %, ausgelassen ≥ 95 %, Halbton daneben ≥ 95 %, Oktave ≥ 97 %,
verschoben ≥ 97 %, Einsatzfehler-Median ≤ 25 ms. Zusätzlich: leere Rahmen
→ alle Töne `missing`; nur Stille/Klicks (unstimmhaft) → keine Töne.

---

### Paket 2 – Melodien mit Rhythmus

Beide Modi brauchen Melodien, die Tonhöhe und Rhythmus haben. Aufbau:
**erst Rhythmus, dann Töne.**

1. Rhythmus mit `makePattern` (Rhythmus-Paket der Didaktik) für die in der
   Stufe genannte Taktart, Taktzahl und Bausteine; Bindebögen und Auftakt
   wie dort. **Nie** Triolen, 5/4 oder 7/8 (zum Singen hier zu schwer).
2. Die Einsätze der Reihe nach mit Tönen belegen, nach den Regeln von
   `SIGHT_LEVELS` (Tonvorrat, größter Sprung, Sprung durch Gegenschritt
   auflösen, Start- und Schlusston).
3. Zusätzliche Regeln:
   - Der letzte Ton ist der längste der letzten beiden Takte und steht auf
     Zählzeit 1 (bei Auftakt: im gekürzten Schlusstakt).
   - Tonwiederholungen erst ab Stufe 3, höchstens zwei gleiche Töne
     hintereinander.
   - Bei zwei Phrasen (Nachsingen Stufe 6): Phrase 1 endet auf so oder re
     (offen, Halbschluss), Phrase 2 auf do (bzw. la in Moll); Phrase 2
     beginnt wie Phrase 1 (die ersten 2–3 Töne gleich) – Frage und Antwort
     wie in echten Liedern.
4. Lage: Grundton so wählen, dass alle Töne in `practiceRange(profile)` ± 2
   liegen; bei mehreren Möglichkeiten die, deren Mitte der Mitte des
   Umfangs am nächsten liegt.
5. Wiederholungssperre: nie dieselbe Melodie zweimal in Folge.

Klang der Vorgabe: der Klavierklang der Ausbildung, Melodie allein,
davor Tonika-Akkord (1 Takt). Keine Begleitung während der Melodie.

**Tests:** 1000 Melodien je Stufe beider Modi: Tonvorrat, Sprungregel,
Schluss (Ton, Länge, Zählzeit), keine Triolen/5/4/7/8, Tickzahl passt zur
Taktart, alle Töne im Umfang aller vier Stimmen, Frage-Antwort-Regeln in
Nachsingen Stufe 6.

---

### Paket 3 – Modus „Nachsingen“

```js
const ECHO_LEVELS = [
  { n: 1, label: '3 Töne, Schritte',          sight: 1, len: [3, 3],   rhythm: null,                                  tol: 50 },
  { n: 2, label: '4 Töne, dazu so',           sight: 2, len: [4, 4],   rhythm: null,                                  tol: 50 },
  { n: 3, label: '5 Töne, Pentatonik',        sight: 3, len: [5, 5],   rhythm: null,                                  tol: 45 },
  { n: 4, label: 'Zwei Takte, dazu fa',       sight: 4, len: [6, 8],   rhythm: { meter: '4/4', bars: 2, elements: ['e'] },          tol: 40 },
  { n: 5, label: 'Vier Takte, ganze Tonleiter', sight: 5, len: [10, 14], rhythm: { meter: '4/4', bars: 4, elements: ['e', 'd'] },  tol: 40 },
  { n: 6, label: 'Zwei Phrasen, auch Moll',   sight: 6, len: [14, 20], rhythm: { meter: ['4/4', '3/4'], bars: 8, elements: ['e', 'd'], phrases: 2 }, tol: 35 },
];
```

- `sight`: Tonvorrat und Regeln der Blattsingen-Stufe; Stufe 6 zu 50 % in
  Moll, sonst Dur mit dem Tonvorrat von Stufe 5.
- `rhythm: null` = alles Viertel. Sonst Rhythmus nach Paket 2; `len`
  begrenzt die Zahl der Töne (Rhythmus neu ziehen, bis sie passt, höchstens
  200 Versuche, dann nächstliegende).
- Vorspiel-Tempo ♩ = 76 (Stufe 6: 84).

**Ablauf einer Aufgabe:**
1. Tonika-Akkord, dann die Melodie. Anzeige währenddessen: „Hör zu“ und
   eine Punktreihe (ein Punkt je Ton, wandert mit), keine Tonnamen.
2. Anzeige „Jetzt du“, Mikrofon an. Die Singphase endet 1,2 s nach dem
   letzten stimmhaften Rahmen oder nach (Melodiedauer × 2 + 3 s).
3. Auswertung mit `scoreEcho(target, frames, { tolCents: level.tol })`
   (ohne `timing`).
4. Rückmeldung:
   - Tonhöhenbild: waagrechte Balken für die Zieltöne, darüber deine
     gesungene Linie (die Rahmen, auf den Zeitraum der Zieltöne gestreckt).
     Getroffene Töne grün, nicht getroffene orange mit „+40“ bzw. „−60“
     Cent, fehlende grau gestrichelt.
   - Ein Satz: „6 von 7 Tönen“ + ggf. „Der fünfte Ton war etwas zu tief.“ /
     „Eine Oktave tiefer gesungen – die Melodie stimmt.“ / „Die Melodie
     stimmt, du bist einen Ganzton höher eingestiegen.“ (Transposition in
     Halbtönen gerundet benennen) / „Ein Ton fehlt.“
   - Knöpfe: „Melodie anhören“, „Nochmal“ (gleiche Melodie), „Weiter“.

**Hilfen** (zählen als „mit Hilfe“, nicht als Fehler):
- „Noch einmal hören“ vor dem Singen (bis zu zweimal),
- „Langsamer“ (Vorspiel ×0,75),
- „Nur die erste Hälfte“ (Stufen 4–6: Melodie bis zum Ende von Takt 1
  bzw. 2 bzw. 4 – die Aufgabe zählt dann für diese Stufe nicht).

**Richtig** für den Fortschritt: alle Töne `pitchOk` (Oktavlage
eingeschlossen) und `extra ≤ 1`. `value` = Anteil getroffener Töne.

**Tests:** Ablauf mit eingespeisten synthetischen Rahmen (Anhang B) statt
Mikrofon: Satzbausteine für jeden Befund (Oktave, verschoben, fehlend,
zu tief/zu hoch) erscheinen; „Nochmal“ behält die Melodie; Hilfen setzen
`help: true`.

---

### Paket 4 – Modus „Im Takt“ (Tonhöhe und Rhythmus)

```js
const IN_TIME_LEVELS = [
  { n: 1, label: '1 Takt, Viertel und Halbe',   sight: 1, meters: ['4/4'],               bars: 1, elements: [],                        pickup: false, bpm: 72, tol: 50, win: [.10, .18] },
  { n: 2, label: '2 Takte, Achtel, dazu so',    sight: 2, meters: ['4/4', '2/4', '3/4'], bars: 2, elements: ['e'],                     pickup: false, bpm: 72, tol: 50, win: [.10, .18] },
  { n: 3, label: 'Pausen, Pentatonik',          sight: 3, meters: ['4/4', '3/4'],        bars: 2, elements: ['e', 'r'],                pickup: false, bpm: 76, tol: 45, win: [.08, .15] },
  { n: 4, label: 'Punktiert, Auftakt, dazu fa', sight: 4, meters: ['4/4', '3/4'],        bars: 2, elements: ['e', 'r', 'd'],           pickup: true,  bpm: 76, tol: 40, win: [.08, .15] },
  { n: 5, label: 'Vier Takte, Synkopen, 6/8',   sight: 5, meters: ['4/4', '3/4', '6/8'], bars: 4, elements: ['e', 'r', 'd', 'sy', 'tie'], pickup: true, bpm: 80, tol: 40, win: [.08, .15] },
  { n: 6, label: 'Moll, Sechzehntel',           sight: 6, meters: ['4/4', '3/4', '6/8'], bars: 4, elements: ['e', 'r', 'd', 'sy', 'tie', 's'], pickup: true, bpm: 84, tol: 35, win: [.08, .15] },
];
```

`win` = [gut, knapp] in Sekunden, wird als `good`/`ok` an `scoreEcho`
übergeben. Tempo mit Schieberegler ±20 % änderbar (gespeichert als Faktor).

**Variante „Echo“:**
1. Ein Takt Einzähler (Klick, bei Auftakt wie im Rhythmus-Paket), dann
   spielt die App die Melodie mit Klick.
2. **Ohne Pause** geht der Klick weiter (leiser, −6 dB), und du singst die
   Melodie in den folgenden Takten nach – wie Vorsänger und Chor. Anzeige:
   „Jetzt du“ mit mitlaufender Taktposition.
3. `target[i].start` = Soll-Einsatz in deiner Hälfte (Sekunden ab
   Beginn deiner Hälfte, im Zeitsystem von `audioCtx`), `dur` = Soll-Länge
   (gebundene Noten zusammengezählt; Pausen sind keine Zieltöne).

**Variante „Vom Blatt“:**
1. Notenzeile mit Rhythmus (Schlüssel wie beim Blattsingen), darunter
   Silben (Solmisation oder Zahlen, Einstellung aus Paket 5 der Didaktik)
   und auf Wunsch Rhythmussprache.
2. Tonika-Akkord, dann ein Takt Einzähler, dann singst du zum Klick.

**Auswertung:** `scoreEcho(target, frames, { tolCents: level.tol, timing:
true, latency: singLatencyMs / 1000, good: level.win[0], ok: level.win[1]
})`.

**Rückmeldung:**
- Notenzeile der Melodie; unter jeder Note zwei Zeichen:
  **Ton** (grün getroffen / orange daneben mit Cent / grau fehlt) und
  **Einsatz** (● gut, ◐ knapp mit „früh“/„spät“, ○ daneben mit ms).
  „Zu kurz“ (`longEnough === false`) als kleiner Hinweis an der Note.
- Zusammenfassung in einem Satz: „7 von 8 Tönen · Einsätze: 6 gut, 2
  knapp“.
- **Tendenz:** Ist der Mittelwert der Einsatzabweichungen über alle
  getroffenen Töne > +50 ms: „Du kommst im Schnitt etwas spät –
  den Konsonanten vor den Schlag, den Vokal genau auf den Schlag.“ Bei
  < −50 ms: „Du bist im Schnitt etwas früh – ruhig auf den Schlag warten.“
- Knöpfe: „Anhören“ (Melodie mit Klick), „Nochmal“, „Weiter“.

**Richtig** für den Fortschritt: alle Töne `pitchOk`, kein Einsatz
„daneben“, `extra ≤ 1`. `value` = Anteil der Töne mit Ton getroffen **und**
Einsatz gut oder knapp.

**Kalibrierung (`singLatencyMs`):**
- Vor der ersten Aufgabe „Im Takt“ (und über einen Knopf „Neu
  kalibrieren“ im Modus): „Sing 8-mal ‚da‘ auf einem bequemen Ton, genau
  auf den Klick.“ 8 Klicks bei ♩ = 80, die ersten 2 zählen nicht.
- Einsatz je Ton = `start` aus `segmentNotes`; `singLatencyMs` = Median der
  Abweichung zum Klick, gerundet; gültig 0–500 ms, sonst „Das hat nicht
  geklappt – bitte noch einmal, mit Kopfhörern.“ Mindestens 5 erkannte
  Töne.
- Der Wert enthält Ausgabe- und Eingabelatenz **und** die Verzögerung der
  Tonhöhenerkennung. Deshalb ist er getrennt von der Klatsch-Latenz.
- Gespeichert im Zustand der Ausbildung (Roundtrip-Test).
- Hinweis im Modus: „Mit Kopfhörern – sonst hört das Mikrofon den Klick.
  Hast du das Gerät oder die Kopfhörer gewechselt: neu kalibrieren.“

**Tests:** Tickzahl/Sollzeiten aus dem Rhythmus stimmen mit `target`
überein (gebundene Noten, Pausen, Auftakt); synthetische Rahmen mit
festem Versatz +200 ms und `singLatencyMs` 200 → alle Einsätze „gut“;
+100 ms Zusatzversatz → überwiegend „knapp“, Tendenzsatz „spät“;
Kalibrierung mit synthetischen Rahmen (Versatz 180 ms ± 20 ms) → 170–190;
Roundtrip `singLatencyMs`, Tempofaktor, zuletzt gewählte Variante.

---

### Paket 5 – Einbindung: Stufen, Fortschritt, „Heute üben“

- Beide Modi nutzen das einheitliche Stufen-Element (Didaktik Paket 6b).
- Neue Fortschritts-Bereiche: `echo` (Nachsingen) und `inTime` (Im Takt);
  `levelHint` wie bei den anderen Bereichen.
- Wochenansicht: beide Bereiche unter „Singen“.
- „Heute üben“ (Didaktik Paket 7), Schritt 3 „Singen“: die Reihenfolge wird
  **Nachsingen, Intervalle singen, Im Takt, Ton finden, Blattsingen**.
  Nachsingen und Im Takt mit 6 Aufgaben statt 8 (sie dauern länger).
  Deep-Link-Werte `mode=echo` und `mode=inTime`, bei Im Takt zusätzlich
  `variant=echo|sheet`.
- Ohne Kalibrierung startet „Im Takt“ aus „Heute üben“ mit der
  Kalibrierung; sie zählt nicht als Aufgabe.

**Tests:** Plan-Funktion nennt die neuen Modi in der festgelegten
Reihenfolge; Deep-Links mit falschen Werten werden ignoriert; Einträge
landen in den richtigen Bereichen.

---

## 4. Wenn ein Paket nicht sauber klappt

Paket zurücksetzen, im Bericht mit Grund vermerken, mit dem nächsten
unabhängigen Paket weitermachen. Abhängigkeiten: 3 und 4 brauchen 1 und 2;
5 braucht 3 oder 4 (fehlt eines, die Einbindung nur für das vorhandene).

## 5. Abschluss

`BERICHT-NACHSINGEN.md` anlegen, Aufbau wie `BERICHT-UMSETZUNG.md`
(Paket / Status / Commit / SW_VERSION / Tests mit Zahlen, Abweichungen).
Unter „Manuell auf echten Geräten prüfen“ mindestens:
- Tiefe Männerstimmen (Bass unter 100 Hz): werden Töne stabil erkannt?
- Kalibrierung mit kabelgebundenen und mit Bluetooth-Kopfhörern
  (Bluetooth: 150–300 ms erwartet).
- Tonwiederholungen auf „da“ bei ♩ = 84: getrennt erkannt?
- Singen ohne Kopfhörer: stört der Klick?

Unter „Zu entscheiden“ mindestens:
- Soll „Im Takt“ die Tonlänge (zu kurz) später mitbewerten?
- Sollen Nachsingen-Melodien später wahlweise gesungen statt vom Klavier
  vorgespielt werden (Vokal-Klang)?

---

## Anhang A – Auswertung (Referenz, getestet)

In `uebe-lab.html` ohne `module.exports` übernehmen. Die Parameter nicht
ändern, ohne die Simulation aus Anhang B erneut laufen zu lassen.

```js
/* Referenz-Auswertung für „Nachsingen“ und „Im Takt“.
   frames: [{ t (s), midi (float|null), rms }] — ca. 60 pro Sekunde, midi nur bei clarity ≥ .85. */

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const dbOf = (rms) => 20 * Math.log10(Math.max(rms, 1e-6));

/** 1) Gesungene Töne finden. */
function segmentNotes(frames, o = {}) {
  const { gapSec = .06, jumpSemis = .6, lookSec = .08, minSec = .08, dipDb = 6, transitionSec = .14 } = o;
  const segs = [];
  let cur = null, lastVoiced = -1, peakDb = -120;
  const close = () => { if (cur && cur.frames.length) segs.push(cur); cur = null; };
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.midi == null) { if (cur && f.t - lastVoiced > gapSec) close(); continue; }
    lastVoiced = f.t;
    const db = dbOf(f.rms);
    if (!cur) { cur = { frames: [f], start: f.t }; peakDb = db; continue; }
    // Neuansatz auf gleicher Tonhöhe: Pegel-Einbruch ≥ dipDb gegenüber dem Segment-Maximum, dann Wiederanstieg
    const prevDb = dbOf(cur.frames[cur.frames.length - 1].rms);
    if (prevDb < peakDb - dipDb && db > prevDb + 3) { close(); cur = { frames: [f], start: f.t }; peakDb = db; continue; }
    peakDb = Math.max(peakDb, db);
    // Tonwechsel im Legato: Median der nächsten lookSec weicht vom Segment-Median ab
    const ahead = [];
    for (let j = i; j < frames.length && frames[j].t - f.t <= lookSec; j++) if (frames[j].midi != null) ahead.push(frames[j].midi);
    const segMed = median(cur.frames.slice(-Math.max(3, Math.floor(cur.frames.length * .6))).map((x) => x.midi));
    if (ahead.length >= 3 && Math.abs(median(ahead) - segMed) >= jumpSemis && cur.frames.length >= 4) {
      close(); cur = { frames: [f], start: f.t }; peakDb = db; continue;
    }
    cur.frames.push(f);
  }
  close();
  return segs
    .map((s) => {
      const n = s.frames.length, a = Math.floor(n * .2), b = Math.max(a + 1, Math.ceil(n * .8));
      return { midi: median(s.frames.slice(a, b).map((x) => x.midi)), start: s.start, end: s.frames[n - 1].t };
    })
    .filter((s) => s.end - s.start >= minSec)
    // Übergänge (Gleiten im Legato + Anschleifen des nächsten Tons) sind kurz und liegen tonhöhenmäßig
    // zwischen den Nachbarn: weg damit. Kurze Töne außerhalb dieses Bereichs bleiben echte Töne.
    .filter((s, i, all) => {
      if (s.end - s.start >= transitionSec) return true;
      const prev = all[i - 1], next = all[i + 1];
      if (!prev || !next || s.start - prev.end > gapSec || next.start - s.end > gapSec) return true;
      const lo = Math.min(prev.midi, next.midi) - .3, hi = Math.max(prev.midi, next.midi) + .3;
      return !(s.midi >= lo && s.midi <= hi);
    });
}

/** 2) Globale Lage: um wie viel ist die ganze Melodie verschoben (Oktave und/oder Transposition)?
 *  Sucht den Versatz (Halbtonschritte −14…+14), bei dem die Zuordnung am billigsten ist, und verfeinert
 *  ihn als Median der Paarabstände. */
function globalOffset(target, sung) {
  let best = { cost: Infinity, off: 0 };
  for (let o = -14; o <= 14; o++) {
    const r = align(target, sung, -o);
    if (r.cost < best.cost - 1e-9 || (Math.abs(r.cost - best.cost) < 1e-9 && Math.abs(o) < Math.abs(best.off))) best = { cost: r.cost, off: o, r };
  }
  const diffs = best.r.byTarget.map((j, i) => (j == null ? null : sung[j].midi - target[i].midi)).filter((d) => d != null);
  return diffs.length ? median(diffs) : 0;
}

/** 3) Zuordnung Ziel ↔ gesungen (Needleman-Wunsch). Lücke kostet 1, Paar min(|Δ|/1 Halbton, 2). */
function align(target, sung, shift = 0) {
  const n = target.length, m = sung.length, GAP = 1;
  const pairCost = (i, j) => Math.min(Math.abs(sung[j].midi + shift - target[i].midi), 2);
  const D = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j * GAP : j === 0 ? i * GAP : 0)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    D[i][j] = Math.min(D[i - 1][j - 1] + pairCost(i - 1, j - 1), D[i - 1][j] + GAP, D[i][j - 1] + GAP);
  const pairs = []; let i = n, j = m;
  while (i > 0 && j > 0) {
    if (D[i][j] === D[i - 1][j - 1] + pairCost(i - 1, j - 1)) { pairs.unshift([i - 1, j - 1]); i--; j--; }
    else if (D[i][j] === D[i - 1][j] + GAP) i--; else j--;
  }
  const byTarget = Array(n).fill(null);
  pairs.forEach(([a, b]) => { byTarget[a] = b; });
  return { byTarget, extra: m - pairs.length, cost: D[n][m] };
}

/** 4) Gesamtbewertung. target: [{ midi, start?, dur? }] (start/dur in s, nur „Im Takt“). */
function scoreEcho(target, frames, { tolCents = 50, timing = false, latency = 0, good = .08, ok = .15 } = {}) {
  const shortest = Math.min(...target.map((t) => t.dur || .5));
  const sung = segmentNotes(frames, { transitionSec: Math.min(.14, .4 * shortest) });
  if (!sung.length) return { notes: target.map(() => ({ missing: true })), hits: 0, total: target.length, extra: 0, octave: 0, transposed: null };
  const off = globalOffset(target, sung);
  const oct = Math.round(off / 12) * 12;                 // Oktavlage wird nie als Fehler gezählt
  const { byTarget, extra } = align(target, sung, -off); // Paare nach tatsächlicher Lage bilden
  const shift = -oct;
  const notes = target.map((t, i) => {
    const j = byTarget[i];
    if (j == null) return { missing: true };
    const s = sung[j];
    const cents = Math.round((s.midi + shift - t.midi) * 100);
    const r = { cents, pitchOk: Math.abs(cents) <= tolCents };
    if (timing) {
      const dt = s.start - latency - t.start;
      r.dtMs = Math.round(dt * 1000);
      r.timing = Math.abs(dt) <= good ? 'gut' : Math.abs(dt) <= ok ? 'knapp' : 'daneben';
      if (i < target.length - 1) r.longEnough = (s.end - s.start) >= .6 * t.dur - .05;
    }
    return r;
  });
  // Verschoben gesungen? (Intervalle stimmen, Lage nicht)
  const matched = notes.filter((x) => !x.missing);
  const med = median(matched.map((x) => x.cents));
  let transposed = null;
  if (matched.length >= 3 && Math.abs(med) > tolCents) {
    const rel = matched.filter((x) => Math.abs(x.cents - med) <= tolCents).length / target.length;
    if (rel >= .8) transposed = Math.round(med);
  }
  const hits = notes.filter((x) => x.pitchOk).length;
  return { notes, hits, total: target.length, extra, octave: oct / 12, transposed };
}

```

## Anhang B – Simulation (Grundlage der Tests in Paket 1)

Simulierte Sänger:in mit Anschleifen, Vibrato, Legato/Konsonanten, Oktavfehlern der Tonerkennung und Latenz. Für `selfCheck()` die Funktionen `sing` und `melody` übernehmen und den Zufall über einen festen Startwert steuern (wie hier `rnd`).

```js
let seed = 1; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/** Simulierte Sänger:in. notes: [{ midi, start, dur }] (Soll); opts verändern, wie gesungen wird. */
function sing(notes, o = {}) {
  const { pitchSd = 15, timeSd = .03, latency = .12, legato = .6, shift = 0, drop = -1, insert = -1, wrong = -1, late = 0, glitch = .02 } = o;
  const fr = []; const hop = 1 / 60;
  const sungNotes = []; const truth = notes.map(() => ({ missing: true }));
  notes.forEach((n, i) => {
    if (i === drop) return;
    const off = gauss() * pitchSd / 100 + shift + (i === wrong ? 1 : 0);
    const sn = { midi: n.midi + off, start: n.start + late + gauss() * timeSd, dur: n.dur, leg: rnd() < legato, cons: rnd() < .4, i };
    sungNotes.push(sn); truth[i] = { cents: (off - Math.round(shift / 12) * 12) * 100, start: sn.start, cons: sn.cons };
    if (i === insert) sungNotes.push({ midi: n.midi + 1 + off, start: n.start + n.dur * .5 + late, dur: n.dur * .5, passing: true, leg: false });
  });
  sungNotes.forEach((s, k) => { if (s.passing) sungNotes[k - 1].dur = s.start - sungNotes[k - 1].start; });
  const endAll = sungNotes[sungNotes.length - 1].start + sungNotes[sungNotes.length - 1].dur + .3;
  for (let t = 0; t < endAll + latency; t += hop) {
    const tt = t - latency; // Mikro hört verzögert
    let midi = null, rms = .002;
    const k = sungNotes.findIndex((s, i) => tt >= s.start && (i === sungNotes.length - 1 ? tt < s.start + s.dur : tt < sungNotes[i + 1].start));
    if (k >= 0) {
      const s = sungNotes[k], next = sungNotes[k + 1], age = tt - s.start;
      const detached = !next || s.detach;
      const sameNext = next && Math.abs(next.midi - s.midi) < .5;
      const endGap = next ? next.start - tt : s.start + s.dur - tt;
      const consonant = age < .03 && s.cons;
      const gap = next && (!s.leg || sameNext) && endGap < .06 && !sameNext; // kurze Lücke bei non legato
      const dip = sameNext && endGap < .05; // Neuansatz gleicher Ton: Pegel-Einbruch
      if (consonant || gap) { midi = null; rms = .004; }
      else {
        let m = s.midi;
        if (age < .07) m -= .8 * (1 - age / .07);                               // Scoop
        if (age > .25) m += .35 * Math.sin(2 * Math.PI * 5.5 * age);             // Vibrato
        if (next && s.leg && !sameNext && endGap < .05) m += (next.midi - s.midi) * (1 - endGap / .05); // Legato-Gleiten
        m += gauss() * .06;
        if (rnd() < glitch) m += rnd() < .5 ? 12 : -12;                          // YIN-Oktavfehler
        midi = m; rms = dip ? .02 : .1 * (1 + gauss() * .1);
      }
    }
    fr.push({ t, midi, rms });
  }
  return { frames: fr, truth };
}

function melody(midis, beatSec, durs) {
  let t = 0; return midis.map((m, i) => { const d = (durs ? durs[i] : 1) * beatSec; const n = { midi: m, start: t, dur: d }; t += d; return n; });
}

const MEL = {
  schritte: [60, 62, 64, 62, 60],
  pent: [60, 64, 67, 69, 67, 64, 62, 60],
  wdh: [64, 64, 62, 62, 60, 60, 64, 67],        // Tonwiederholungen
  moll: [57, 60, 64, 69, 67, 64, 60, 57],
};
// ---- Testfälle ----
const cases = [
  ['sauber', {}, (r, n) => r.hits === n && r.extra === 0],
  ['Ton ausgelassen', { drop: 2 }, (r, n) => r.notes[2].missing && r.hits === n - 1],
  ['Durchgangston extra', { insert: 1 }, (r, n) => r.extra === 1 && r.hits === n],
  ['Oktave tiefer', { shift: -12 }, (r, n) => r.octave === -1 && r.hits === n],
  ['ganz verschoben +2', { shift: 2 }, (r) => r.transposed != null && Math.abs(r.transposed - 200) <= 30 && r.hits === 0],
  ['Oktave tiefer + 1', { shift: -11 }, (r) => r.octave === -1 && Math.abs(r.transposed - 100) <= 30],
  ['ein Ton +1 Halbton', { wrong: 3 }, (r, n) => !r.notes[3].pitchOk && r.hits === n - 1],
  ['unsauber (σ 30 c)', { pitchSd: 30 }, null],
  ['100 ms zu spät', { late: .1 }, null],
];
const TRIALS = 400;
for (const [tempoName, beat] of [['♩=80 Viertel', .75], ['♩=84 Achtel', .357]]) {
  console.log(`\n== ${tempoName} ==`);
  for (const [name, o, ok] of cases) {
    let good = 0, agree = 0, notesN = 0; const errs = []; const fails = []; const cls = {};
    for (let k = 0; k < TRIALS; k++) {
      const key = Object.keys(MEL)[k % 4];
      const target = melody(MEL[key], beat);
      const { frames, truth } = sing(target, o);
      const r = scoreEcho(target, frames, { tolCents: 50, timing: true, latency: .12 });
      if (ok) { if (ok(r, target.length)) good++; else if (fails.length < 2) fails.push(`${key}: hits ${r.hits}/${r.total} extra ${r.extra} oct ${r.octave} tr ${r.transposed}`); }
      r.notes.forEach((x, i) => {
        const tr = truth[i];
        if (tr.missing || x.missing) return;
        if (Math.abs(Math.abs(tr.cents) - 50) > 10) { notesN++; if (x.pitchOk === (Math.abs(tr.cents) <= 50)) agree++; }
        errs.push((x.dtMs / 1000) - (tr.start - target[i].start));
        cls[x.timing] = (cls[x.timing] || 0) + 1;
      });
    }
    const a = errs.map(Math.abs).sort((p, q) => p - q);
    const tot = Object.values(cls).reduce((p, q) => p + q, 0);
    console.log(`${name.padEnd(20)} ${ok ? ('Fall ' + (good / TRIALS * 100).toFixed(1) + ' %').padEnd(12) : ''.padEnd(12)} Ton-Urteil ${(agree / notesN * 100).toFixed(1)} %  Einsatzfehler Median ${(a[a.length >> 1] * 1000).toFixed(0)} ms, P90 ${(a[Math.floor(a.length * .9)] * 1000).toFixed(0)} ms  Timing ${['gut','knapp','daneben'].map(c => c + ' ' + ((cls[c]||0)/tot*100).toFixed(0) + '%').join(' ')}` + (fails.length ? '\n    z.B. ' + fails[0] : ''));
  }
}
```
