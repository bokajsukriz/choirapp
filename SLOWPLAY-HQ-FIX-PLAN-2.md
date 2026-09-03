# Arbeitsanweisung — HQ-Verlangsamung, Runde 3

**Worklet entlasten und `shift` zuverlässig zustellen.**

Adressat: Sonnet (Folge-Session). Vorgeschichte und Messwerte stehen im
Nachtrag von `SLOWPLAY-HQ-PLAN.md` und in `SLOWPLAY-HQ-FIX-PLAN.md`
(Abschnitte „Messergebnisse" und „Gerätetest — Android, PR #54"). **Lies
beide zuerst** — diese Anweisung baut darauf auf und korrigiert an einer
Stelle die dortige Deutung.

Gegengeprüft am Stand `00630ac` von `main`.
**Immer über Funktions- und ID-Namen ansteuern, nie über Zeilennummern.**

---

## Ausgangslage — und was am bisherigen Befund falsch gedeutet war

Neuer Befund des Nutzers: Der **neue Modus „Roh"** läuft auf demselben
Android-Gerät (Android 10, Chrome Mobile 152), auf dem HQ unbrauchbar ist,
bei 0,7× und 0,6× **flüssig**. Roh resampled genauso wie HQ, nur ohne
Tonhöhenkorrektur.

Daraus folgt zweierlei, und das eine ist wichtiger als das andere:

**1. Das Gerät ist nicht das Problem.** Resampeltes Zeitlupen-Abspielen
schafft es in Echtzeit. Der Engpass sitzt ausschließlich im HQ-Pfad.

**2. Der Worklet-Knoten als solcher ist auch nicht das Problem.** Das ist
der Teil, der beim Lesen leicht untergeht: `audioInit()` verdrahtet
`hqNode.connect(splitter)` **einmal** und löst diese Verbindung nie wieder.
Der Knoten hängt also auch in Standard und Roh dauerhaft am Graphen und
wird jedes Render-Quantum aufgerufen — mit `shift === 1`, also im reinen
Durchreich-Zweig von `HqPitchShifter.process()`. Dass Roh flüssig läuft,
belegt damit: Worklet-Callback, Message-Port und die Graph-Verdrahtung
kosten nichts. Übrig bleibt als Ursache **allein die Rechenarbeit im
Phasenvocoder** (FFT, Phasenkopplung, Overlap-Add).

### Die Korrektur an der bisherigen Deutung

`SLOWPLAY-HQ-FIX-PLAN.md` liest den Gerätetest so: die Last „hängt an einer
Decke, die schon bei 0,85× erreicht ist", weil `realtimePct` bei 0,7× und
0,6× nicht weiter fällt — vermutlich Thermal Throttling oder ein zu
schwacher Kern. **Diese Deutung ist mit hoher Wahrscheinlichkeit falsch,
und der Grund steht zwei Absätze weiter oben im selben Dokument:** von den
fünf gesendeten `shift`-Nachrichten kamen nur drei `shiftAck` zurück — die
für 0,7× und 0,6× fehlen.

Wenn die beiden letzten `shift`-Nachrichten nie angekommen sind, dann hat
das Worklet die ganze Zeit weiter mit `shift = 1/0,85` gerechnet. Es hat bei
0,7× und 0,6× also **exakt dieselbe Arbeit** gemacht wie bei 0,85×. Dass die
Last nicht steigt, ist dann kein Hinweis auf eine Sättigung, sondern die
schlichte Folge davon, dass sich an der Arbeit nichts geändert hat. Und
derselbe Umstand erklärt den Pitchabfall: das Element resampled sofort auf
0,7, die Korrektur im Worklet steht noch auf 0,85.

Gegenprobe, in dieser Vorbereitungssession gemessen (Skript im Anhang, zwei
Kanäle, 128er-Quanten, warmer JIT, x86): die mittlere Rechenzeit je Quantum
**steigt** mit sinkendem Tempo, wie erwartet —

| Tempo | Ha | Frames/s (2 Kanäle) | Mittel je Quantum |
|---|---|---|---|
| 0,85× | 435 | 220 | 0,131 ms |
| 0,7× | 358 | 268 | 0,150 ms |
| 0,6× | 307 | 312 | 0,176 ms |

Ein tatsächlich mit 1/0,6 rechnendes Worklet **muss** also mehr Last zeigen
als eines mit 1/0,85. Das Gerätelog zeigt das nicht. Also hat es nicht mit
1/0,6 gerechnet. Damit ist die „harte Decke" vom Tisch, und es bleibt ein
ganz gewöhnliches Zuviel an Rechenarbeit — dem man mit gewöhnlichen Mitteln
beikommt.

### Der zweite, bisher unbemerkte Befund: die Last kommt stoßweise

Dieselbe Messung, aber nicht als Mittelwert, sondern als Verteilung über die
einzelnen Render-Quanten:

| Tempo | Mittel | p95 | p99 | Maximum | Frist |
|---|---|---|---|---|---|
| 0,85× | 0,127 ms | 0,435 ms | 0,556 ms | 0,748 ms | 2,67 ms |
| 0,7× | 0,112 ms | 0,319 ms | 0,385 ms | 0,553 ms | 2,67 ms |
| 0,6× | 0,154 ms | 0,407 ms | 0,488 ms | 1,022 ms | 2,67 ms |

Der Median liegt bei 0,003 ms — in den allermeisten Quanten passiert
nämlich gar nichts außer `readOutput()`. Ein Analyseframe fällt nur alle
`Ha` Eingabesamples an, also alle 2,4 bis 3,4 Quanten. In genau diesen
Quanten wird dann die volle Arbeit fällig.

Und zwar **für beide Kanäle gleichzeitig**. Beide Shifter bekommen pro
Quantum exakt gleich viele Samples, ihre FIFOs füllen sich im Gleichschritt,
also wird ihr Frame immer im selben Aufruf reif. Gezählt, wie viele Frames
je Quantum anfallen (0 / 1 / 2), über vier Sekunden Material:

```
heute, 0,6×:   875 Quanten mit 0 Frames | 0 mit einem | 625 mit zwei
```

Nie ein einzelner Frame — immer null oder zwei. **Die Spitzenlast ist also
doppelt so hoch wie nötig**, und die Spitze ist es, die die Frist reißt,
nicht der Mittelwert. Auf x86 liegt die Spitze bei 0,49–0,64 ms von 2,67 ms
(rund 20 %); ein Faktor 5–10 zwischen dieser Maschine und einem
Android-10-Mittelklassekern reicht, um daraus 100–200 % zu machen — genau das
hörbare Knistern.

### Woraus sich die Reihenfolge dieser Runde ergibt

1. **`shift` muss ankommen.** Ohne das ist jede weitere Messung auf dem
   Gerät wertlos, weil man nicht weiß, mit welchem Faktor gerechnet wurde.
   Behebt zugleich den Pitchabfall.
2. **Es braucht ein Messgerät, das in allen drei Modi funktioniert.** Nur
   dann lässt sich Roh gegen HQ mit demselben Maßstab vergleichen. Das
   heutige `realtimePct` gibt es nur in HQ und hat außerdem einen
   systematischen Fehler (siehe 2.2).
3. **Spitzenlast halbieren** — höchstens ein Frame je Quantum. Kostet
   nichts, ändert die Ausgabe nachweislich um kein Bit.
4. **Rechenzeit halbieren** — reelle statt komplexer FFT. Der einzige
   riskante Umbau, deshalb zuletzt und mit den härtesten Selbsttests.

Schritt 3 und 4 zusammen senken die **Spitze** je Quantum um rund 75 %.

---

## 0. Rahmenbedingungen

1. **Branch:** `claude/bvg-slowplay-hq-debug-gu6fyz`. Niemals direkt auf
   `main` pushen. `main` steht auf `00630ac`, es gibt gerade keinen offenen
   PR.
2. **Kein Build-Schritt, keine Abhängigkeit, keine Netzwerkanfrage, keine
   neue Datei.** Der Worklet-Quelltext wird weiterhin in
   `hqBuildWorkletSource()` aus den `toString()`-Quellen der Bausteine
   zusammengesetzt und als Blob-URL geladen.
3. **`DEFAULT_SETTINGS.slowMode` bleibt `'standard'`.** Auch dann, wenn am
   Ende alles gut aussieht. Das entscheidet ein Gerätetest, nicht diese
   Session. Die einmalige Migration in `loadSettings()`
   (`slowModeMigrated`, gelesen aus dem veralteten `hqSlowdown`) bleibt
   unangetastet.
4. **Neue Bausteine für das Worklet** dürfen auf **nichts** außerhalb der
   Liste in `hqBuildWorkletSource()` zugreifen — keine Konstanten, keine
   Helfer von außen. Wer eine neue Klasse anlegt, muss sie in das Array
   `[hqPrincipalAngle, hqAnalysisHop, hqPitchRatio, HqFft, HqPitchShifter]`
   in `hqBuildWorkletSource()` **eintragen**. Das zu vergessen ist der
   wahrscheinlichste Weg, diese Runde zu verpfuschen: es fällt in keinem
   Selbsttest auf (die laufen ja auf der Hauptseite, wo alles sichtbar ist),
   sondern erst im Browser als stumm scheiterndes `addModule()`.
5. **Codestil:** deutschsprachige Kommentare im Ton der Datei (erklären
   *warum*, nicht *was*), 2 Leerzeichen Einrückung, keine Umformatierung
   fremder Zeilen.
6. **i18n:** neue Texte in der Einstellungsansicht brauchen Schlüssel in
   **allen drei** `STRINGS`-Blöcken (`de`, `en`, `pl`).
7. **`SW_VERSION`** in `sw.js` am Ende **einmal** von `v116` auf `v117`
   erhöhen.
8. **Nicht anfassen:** Kanal-Matrix, Hintergrundtrack, Recorder,
   Setlisten, Media Session. Diese Runde ändert das Innere des Worklets,
   den Weg der `shift`-Zustellung und die Anzeige in den Einstellungen.

---

## 1. Schritt 1 — `shift` als AudioParam statt als Nachricht

**Ziel:** der Tonhöhenfaktor kommt im Worklet an, auch wenn der
Render-Thread unter Last steht. Behebt den Pitchabfall bei 0,7×/0,6×.

### 1.1 Warum die Nachricht verlorengeht

`port.postMessage()` an einen `AudioWorkletProcessor` wird nicht direkt
zugestellt, sondern als Aufgabe in die Warteschlange des
`AudioWorkletGlobalScope` gelegt und zwischen zwei Render-Quanten
abgearbeitet. Ist der Render-Thread ausgelastet, laufen die Quanten
lückenlos hintereinander und diese Aufgaben kommen selten oder gar nicht
dran. Genau das Bild zeigt das Gerätelog: Nachrichten **aus** dem Worklet
(die Lastberichte) kommen weiter an, Nachrichten **in** das Worklet hinein
nicht mehr.

Ein `AudioParam` geht diesen Weg nicht. Der Wert liegt im Knoten selbst und
wird vom Render-Thread beim Rendern gelesen — es gibt keine Warteschlange,
die verhungern könnte. Das ist der einzige Zustellweg, der unter genau
dieser Last verlässlich ist.

### 1.2 Umbau im Worklet (in `hqBuildWorkletSource()`)

In `HqShiftProcessor`:

```js
static get parameterDescriptors() {
  return [{ name: 'shift', defaultValue: 1, minValue: 0.1, maxValue: 10, automationRate: 'k-rate' }];
}
```

`process(inputs, outputs, parameters)` — die Signatur bekommt den dritten
Parameter — liest den Wert ganz am Anfang und übernimmt ihn nur bei
Änderung:

```js
const wanted = parameters.shift[0];
if (wanted !== this.shift) {
  this.shift = wanted;
  for (const s of this.shifters) s.setShift(wanted);
  this.port.postMessage({ type: 'shiftAck', value: wanted });
}
```

Bei `automationRate: 'k-rate'` ist `parameters.shift` ein `Float32Array` der
Länge 1. Das `postMessage` hier ist unkritisch: es läuft nur beim
tatsächlichen Wechsel, nicht je Quantum.

Den `'shift'`-Zweig in `this.port.onmessage` **entfernen**. Zwei Quellen für
denselben Zustand wären ein Rückschritt: eine spät nachgereichte Nachricht
würde einen überflüssigen `reset()` auslösen. Der `'reset'`-Zweig bleibt.

`ensureChannels()` gibt neuen Shiftern schon heute `this.shift` mit — das
bleibt richtig, weil `this.shift` jetzt aus dem Parameter kommt.

### 1.3 Umbau auf der Hauptseite (`applyRateToElement()`)

Statt `port.postMessage({ type: 'shift', ... })`:

```js
const p = Audio.hqNode.parameters.get('shift');
if (p) p.value = shift;
else Audio.hqNode.port.postMessage({ type: 'shift', value: shift });  // sollte nie greifen
```

Den Fallback stehen lassen und im `dlog` unterscheidbar machen — wenn er je
greift, ist der Deskriptor nicht mitgeliefert worden (siehe 0.4).

`dlog('hq:mode', …)` um den **zurückgelesenen** Wert erweitern:
`param: p ? p.value : null`.

**Erwartete Überraschung im Log, kein Fehler:** `AudioParam` speichert
`float32`. Aus `1/0,7 = 1.4285714285714286` wird beim Zurücklesen
`1.4285715`. `hqAnalysisHop(512, 1.4285715)` ergibt weiterhin 358, also
exakt dasselbe `Ha` wie bisher. Nicht „reparieren".

### 1.4 Die Bestätigung dauerhaft sichtbar machen

Der Lastbericht (`'load'` bzw. `'loadFallback'`) bekommt zusätzlich das
Feld `shift: this.shift`. Damit steht in **jeder** Meldung, mit welchem
Faktor das Worklet gerade rechnet, und ein Auseinanderlaufen von
Element-Tempo und Worklet-Korrektur ist im Log sofort sichtbar, statt aus
fehlenden Bestätigungen erschlossen werden zu müssen. Das ist die eine
Zeile, die den letzten Gerätetest zwei Sessions gekostet hätte.

### 1.5 Kleine Hygiene: den Knoten in Standard/Roh wirklich abhängen

`applyHqMode()` löst heute nur `Audio.elSource`. `Audio.hqNode` bleibt über
die Verdrahtung aus `audioInit()` (`hqNode.connect(splitter)`) am Graphen
und läuft in Standard und Roh weiter mit — als Durchreichen von Stille,
also billig, aber nicht kostenlos, und es verfälscht jeden Vergleich
zwischen den Modi. `applyHqMode()` soll deshalb auch den Ausgang schalten:
im HQ-Fall `Audio.hqNode.connect(Audio.channelIn)`, sonst
`Audio.hqNode.disconnect()`. Idempotent halten (mehrfaches `connect` auf
dieselbe Senke ist erlaubt und wird zusammengefasst, mehrfaches
`disconnect` ohne Verbindung wirft nicht).

---

## 2. Schritt 2 — Ein Messgerät, das in allen drei Modi misst

**Ziel:** der nächste Gerätetest soll entscheidbar sein, statt wieder eine
Deutungsfrage zu hinterlassen. Dafür muss dieselbe Zahl in Standard, HQ und
Roh ablesbar sein.

### 2.1 `AudioContext.renderCapacity` benutzen, wo es sie gibt

Chrome liefert seit Version 111 eine eigene Messung des Render-Threads:
`ctx.renderCapacity` mit `start({ updateInterval })`, `stop()` und einem
`update`-Ereignis, das `averageLoad`, `peakLoad` und `underrunRatio` trägt.
Das ist die Messung, die diese Runde braucht: sie kommt vom Browser selbst,
braucht kein `performance.now()` im Worklet, und **`peakLoad` misst genau
die Spitze**, um die es in Schritt 3 geht.

Vorgehen:

- Merkmalsprüfung, nicht Versionsprüfung:
  `ctx.renderCapacity && typeof ctx.renderCapacity.start === 'function'`.
- Beim Start der Wiedergabe `start({ updateInterval: 1 })`, beim Anhalten
  `stop()`.
- **Die Feldnamen einmal gegen die Wirklichkeit prüfen**, nicht gegen diese
  Anweisung: beim ersten `update` einmalig `Object.keys(event)` bzw. die
  drei Werte per `dlog` protokollieren. Sind sie anders als hier
  beschrieben, gilt die Wirklichkeit — dann diese Datei korrigieren.
- Anzeige in `#hq-load`: Mittel, Spitze, Aussetzer. Rot, sobald `peakLoad`
  über 1 liegt.

### 2.2 Ersatzmessung ohne Umweg über den Port

Wo `renderCapacity` fehlt, tritt die heutige Ersatzmessung an. Die hat
allerdings einen systematischen Fehler, der im Gerätetest zu ihren Lasten
gegangen sein dürfte: gemessen wird `performance.now()` **im Moment des
Empfangs** der Worklet-Nachricht auf der Hauptseite. Ist die Hauptseite
beschäftigt (Wellenform, `timeupdate`, Rendern der Einstellungen), kommt
der Handler zu spät, das Wanduhr-Intervall wird zu groß, `realtimePct` zu
klein. Die Zahl **unterschätzt** die Echtzeitfähigkeit also um die
Verzögerung der Hauptseite.

Der Umweg ist unnötig: `ctx.currentTime` ist die Uhr des AudioContext und
auf der Hauptseite direkt lesbar. Die Ersatzmessung wird deshalb zu einem
reinen Hauptseiten-Zähler, ohne Beteiligung des Worklets:

```js
// alle ~1 s, solange abgespielt wird
const ratio = (ctx.currentTime - prev.audio) / ((performance.now() - prev.wall) / 1000);
```

Beide Werte werden im selben Tick gelesen, eine Verzögerung der Hauptseite
verschiebt beide gleichermaßen und kürzt sich weg.

**Das ist der eigentliche Gewinn:** diese Messung braucht das Worklet
überhaupt nicht mehr und funktioniert damit in **Standard, HQ und Roh**
gleichermaßen.

### 2.3 Anzeige in allen drei Modi

`updateHqLoadVisibility()` blendet `#hq-load` heute nur ein, wenn
`settings.slowMode === 'hq'`. Bedingung ändern auf: es wird abgespielt und
`Audio.ctx` steht. `renderCapacity`-Werte (2.1) gibt es dann in allen
Modi, `underruns` aus dem Worklet nur in HQ — in den anderen Modi entfällt
dieser Teil des Textes.

Neue i18n-Schlüssel (alle drei Blöcke), im Ton der bestehenden
`settings.perf.*`-Schlüssel, z. B. `hqLoadPeakLoad`, `hqLoadUnderrunRatio`.
Bestehende Schlüssel weiterverwenden, wo sie passen.

Der Hinweistext zu Roh (`settings.perf.rawHint`) soll ergänzt werden: Roh
ist jetzt auch die Vergleichsmessung — dieselbe Anzeige, ohne
Tonhöhenkorrektur.

---

## 3. Schritt 3 — Höchstens ein Analyseframe je Render-Quantum

**Ziel:** die Spitzenlast halbieren, ohne die Ausgabe zu verändern.

### 3.1 Was geändert wird

`HqPitchShifter.process()` bekommt einen dritten Parameter:

```js
process(input, output, maxFrames)   // undefined => unbegrenzt
```

In der inneren Schleife:

```js
while (this.inFifoLen >= Ha && (budget > 0 || this.inFifoLen >= 2 * Ha)) {
  budget--;
  …
}
```

Der zweite Teil der Bedingung ist das Sicherheitsventil: staut sich mehr
als ein voller Frame an, wird trotz erschöpftem Budget gerechnet, damit
kein dauerhafter Rückstand entstehen kann. `undefined` muss weiter
unbegrenzt bedeuten — die Selbsttests 5 bis 7 schicken eine ganze Sekunde
Material in **einem** Aufruf durch und würden sonst hoffnungslos
unterlaufen.

In `HqShiftProcessor.process()` ein **globales** Budget von 1 Frame je
Quantum über alle Kanäle, mit rotierendem Startkanal (sonst bekäme immer
derselbe Kanal den Vortritt):

```js
let budget = 1;
for (let i = 0; i < output.length; i++) {
  const ch = (this.rotate + i) % output.length;
  const before = this.shifters[ch].framesProcessed;
  this.shifters[ch].process(src(ch), output[ch], budget);
  budget = Math.max(0, budget - (this.shifters[ch].framesProcessed - before));
}
this.rotate = (this.rotate + 1) % output.length;
```

### 3.2 Warum das reicht und nichts kaputtmacht

Der Bedarf liegt bei 0,6× (dem teuersten Tempo) bei 2 × 156 = 312 Frames
pro Sekunde, das Angebot bei 375 Quanten pro Sekunde. Ein Frame je Quantum
genügt also an allen drei Tempi mit Reserve.

Und der Rückstau kostet nichts: der Lesezeiger startet `N` Samples hinter
dem Schreibzeiger (rund 43 ms). Einen Frame um ein Quantum (2,7 ms) zu
verschieben ändert an den Frames selbst gar nichts — nur daran, *wann* sie
berechnet werden. Solange der Vorlauf reicht, kommt hinten dasselbe heraus.

In dieser Vorbereitungssession nachgemessen, 4 s Stereomaterial, alle drei
Tempi: **`maxDiff === 0`** gegenüber dem unbegrenzten Lauf und
**`underruns === 0`**. Bitgleich, nicht nur ähnlich. Die Verteilung der
Frames je Quantum bei 0,6×:

```
heute:      875 × keiner  |    0 × einer  |  625 × zwei
mit Budget: 251 × keiner  | 1249 × einer  |    0 × zwei
```

Gemessene Wirkung auf die Zeit je Quantum (x86, zwei Kanäle):

| Tempo | p99 heute | p99 mit Budget |
|---|---|---|
| 0,85× | 0,556 ms | 0,274 ms |
| 0,7× | 0,385 ms | 0,299 ms |
| 0,6× | 0,488 ms | 0,277 ms |

Der Mittelwert bleibt unverändert — das ist der Punkt: es wird nicht
weniger gerechnet, sondern gleichmäßiger.

### 3.3 Selbsttest dazu

Neuer Selbsttest in `runSelfTests()`, im Stil der bestehenden HQ-Tests:
zwei Shifter mit `shift = 1/0,6`, derselbe Eingang in 128er-Blöcken, einmal
ohne und einmal mit `maxFrames = 1`. Erwartung: **jedes Ausgabesample
identisch** und `underrunSamples === 0`. Das ist eine harte Zusage, kein
Toleranzvergleich — wenn sie bricht, stimmt etwas mit der Puffer-Buchhaltung
nicht.

---

## 4. Schritt 4 — Reelle FFT statt komplexer

**Ziel:** die eigentliche Rechenzeit halbieren. Das ist der riskante Umbau
dieser Runde, deshalb der letzte.

### 4.1 Warum genau hier

In dieser Vorbereitungssession gemessen: `processFrame()` kostet 0,2225 ms,
davon entfallen **70 %** auf die beiden `HqFft.transform()`-Aufrufe (0,0736
ms vorwärts, 0,0821 ms rückwärts). Der Rest — Fensterung, Betragsquadrate,
Spitzensuche, Drehung, Overlap-Add — macht zusammen 0,067 ms.

Und diese 70 % sind zur Hälfte Verschwendung: Das Eingangssignal ist
**reell**. `processFrame()` füllt `im[]` mit Nullen, transformiert komplex
über die volle Länge 2048, stellt danach die konjugierte Symmetrie von Hand
wieder her (`re[N-b] = re[b]; im[N-b] = -im[b]`) und transformiert wieder
komplex zurück. Eine reelle FFT der Länge N kommt mit einer komplexen FFT
der Länge N/2 plus einem linearen Nachlauf aus.

Prototyp in dieser Session gebaut und gemessen:

| | vorwärts + rückwärts |
|---|---|
| heute, komplex 2048 | 0,1554 ms |
| reell über komplex 1024 | 0,0602 ms |

**−61 % auf den FFT-Anteil**, das sind rund **−43 % auf `processFrame()`
insgesamt**. Hin- und Rücktransformation stimmten im Prototyp mit dem
bisherigen Weg überein (`maxDiff` 1,9·10⁻¹³ gegen die komplexe FFT bei
Float64-Zwischenspeicher, Rundlauf 1,0·10⁻¹⁵; mit `Float32Array` als
Zwischenspeicher 4,2·10⁻⁷ Rundlauf — das ist Float32-Auflösung und für
Audio folgenlos).

**Float32Array benutzen, nicht Float64Array.** Gegen die Erwartung ist die
bestehende komplexe FFT mit `Float32Array` deutlich schneller als mit
`Float64Array` (0,155 ms gegen 0,276 ms) — halb so viel Speicherverkehr
schlägt hier die breitere Arithmetik. Also die bestehende Wahl beibehalten
und auch die neuen Zwischenspeicher als `Float32Array` anlegen.

### 4.2 Der Baustein

Neue Klasse `HqRealFft` neben `HqFft` — als ganz normale, direkt testbare
Klasse, wie die anderen Bausteine, und **in die Liste in
`hqBuildWorkletSource()` eintragen** (siehe 0.4). `HqFft` bleibt: sie ist
die innere komplexe FFT der Länge N/2 und zugleich die Referenz für den
Selbsttest.

Konstruktion: `this.c = new HqFft(size / 2)`, dazu Tabellen
`tc[k] = cos(−2πk/size)`, `ts[k] = sin(−2πk/size)` für `k = 0 … size/2`.

**Vorwärts** (`x` reell, Länge N → `outRe`/`outIm`, Länge N/2+1):
gerade Samples in den Realteil, ungerade in den Imaginärteil eines
komplexen Signals halber Länge packen, komplex transformieren, dann für
`k = 0 … h`:

```
k1 = k % h;  k2 = (h - k) % h
a = Z[k1];  b = conj(Z[k2])
Fe = (a + b) / 2
Fo = (a - b) / (2i)
X[k] = Fe + W · Fo,   W = tc[k] + i·ts[k]
```

**Rückwärts** (`inRe`/`inIm`, Länge N/2+1 → `x`, Länge N): derselbe Weg
zurück, für `k = 0 … h-1`:

```
a = X[k];  b = conj(X[(h-k) % h])
Fe = (a + b) / 2
W·Fo = (a - b) / 2      →   Fo = conj(W) · (a - b) / 2
Z[k] = Fe + i·Fo
```

danach komplexe Rücktransformation (die teilt bereits durch `h`) und
auspacken: `x[2i] = zr[i]`, `x[2i+1] = zi[i]`.

**Die eine Falle, in die diese Session zuerst getappt ist:** Für `k = 0`
ist der Partner in der Rücktransformation **nicht** `X[0]` selbst, sondern
der Nyquist-Bin `X[h]` — beide reell, und es gilt
`X[0] = Fe[0] + Fo[0]`, `X[h] = Fe[0] − Fo[0]`. Ohne diesen Sonderfall
stimmt die Hintransformation exakt, der Rundlauf aber um mehrere Prozent —
ein Fehler, der sich als leises Grundrauschen tarnt statt als offensichtlicher
Bruch. Also: `b = (k === 0) ? X[h] (reell) : conj(X[(h-k) % h])`. In der
**Hin**transformation braucht es diesen Sonderfall nicht, dort trägt
`k1 = k % h` das schon richtig.

### 4.3 Umbau in `processFrame()`

- `this._re` / `this._im` (je Länge N) werden ersetzt durch `this._time`
  (Länge N, reell) und `this._specRe` / `this._specIm` (je Länge
  `half + 1`).
- Fensterung schreibt nur noch nach `_time`, kein Nullen von `im` mehr.
- `fft.transform(re, im, false)` → `rfft.forward(_time, _specRe, _specIm)`.
- Betragsquadrate, Spitzensuche, Phasenkopplung und Drehung arbeiten
  unverändert auf `0 … half` — sie tun das schon heute.
- **Die Symmetrieschleife entfällt ersatzlos:**
  `for (let b = 1; b < half; b++) { re[N-b] = re[b]; im[N-b] = -im[b]; }`
  ist in der reellen Rücktransformation implizit. Die Zuweisungen
  `im[0] = 0; im[half] = 0;` bleiben — DC und Nyquist müssen reell sein,
  und die Drehung kann sie aus der Reelligkeit herausdrehen.
- `fft.transform(re, im, true)` → `rfft.inverse(_specRe, _specIm, _time)`,
  Overlap-Add liest danach aus `_time`.

`prevRe` / `prevIm` / `prevTheta` haben bereits Länge `half + 1` und
bleiben unverändert.

### 4.4 Selbsttests dazu

Zwei neue Prüfungen in `runSelfTests()`:

1. **`HqRealFft.forward` gegen `HqFft`**: dasselbe deterministische
   Testsignal (Länge 2048) einmal durch die reelle, einmal durch die
   komplexe FFT. Vergleich über `b = 0 … half`, Schranke **relativ** zum
   größten Betrag im Spektrum (`maxDiff / maxAbs < 1e-5`) — eine absolute
   Schranke wäre bei Spektralwerten in der Größenordnung 1000 sinnlos.
2. **Rundlauf**: `forward` gefolgt von `inverse` muss das Eingangssignal
   zurückgeben, `maxDiff < 1e-5`. Genau dieser Test fängt den
   Nyquist-Sonderfall aus 4.2 — und nur dieser.

Die bestehenden Prüfungen 4 bis 9 (Durchreichen bei `shift = 1`, Tonhöhe,
Längentreue, Verstärkung, Drehungs-Algebra, Reset) müssen unverändert
bestehen. Prüfung 8 ist reine Algebra und vom Umbau nicht berührt; Prüfung 7
(±1,5 dB) ist der eigentliche Wächter gegen einen Skalierungsfehler in der
Rücktransformation.

---

## 5. Prüfung vor dem Push

Es gibt keine Testsuite und keinen Linter. Also:

1. `runSelfTests()` in der Konsole — alle Prüfungen bestanden, Konsole
   sonst sauber (der `[notiz] Error: Testfehler` aus `runAsyncSelfTests()`
   ist gewollt und kein Regress).
2. **Vorher/nachher messen und beide Zahlen in dieser Datei festhalten.**
   Das Messgerüst steht im Anhang und ist reproduzierbar — es muss nicht
   neu erfunden werden. Zu erheben, je 0,85× / 0,7× / 0,6×, zwei Kanäle:
   Mittel, p95, p99 und Maximum je Quantum. Zielmarke aus dieser
   Vorbereitungssession: Mittel −40 % (Schritt 4), p99 etwa −75 %
   gegenüber den Ausgangswerten in der Tabelle oben (Schritt 3 und 4
   zusammen).
3. **Klangqualität darf sich nicht verschlechtern.** Prüfung 5 und 7 aus
   `runSelfTests()` sind die Untergrenze. Zusätzlich: reiner Sinus bei
   220 Hz und 6 kHz, `shift = 1/0,6`, das Ergebnis mit dem Stand **vor**
   Schritt 4 vergleichen — es geht um „nicht schlechter als vorher", nicht
   um absolute dB-Werte (die Vorsessions-Zahlen −47,6 / −32,1 dB sind ohne
   das damalige Messskript nicht reproduzierbar, siehe
   `SLOWPLAY-HQ-FIX-PLAN.md`).
4. **Die App wirklich starten** und in allen drei Modi abspielen: 0,85× /
   0,7× / 0,6×, Umschalten während der Wiedergabe, Moduswechsel während
   der Wiedergabe, A-B-Loop, Stimmwechsel. Die Anzeige muss in allen drei
   Modi plausible Werte zeigen.
5. **Das Diagnose-Log gegenlesen**, bevor es an den Nutzer geht: zu jedem
   Tempowechsel muss ein `hq:shiftAck` mit dem passenden Wert stehen, und
   jeder Lastbericht muss das `shift` tragen, mit dem gerade gerechnet wird
   (1.4).

---

## 6. Was der nächste Gerätetest liefern muss

Damit die Folge-Session nicht wieder deuten muss, was gemessen wurde, den
Nutzer um genau diesen Ablauf bitten — Diagnose-Log an, dann:

1. 1× abspielen, ~10 s, in **Standard**.
2. Dasselbe in **Roh** bei 0,85× / 0,7× / 0,6×, je ~10 s.
3. Dasselbe in **HQ** bei 0,85× / 0,7× / 0,6×, je ~10 s.

Auswertung, in dieser Reihenfolge:

- **Steht in jedem HQ-Lastbericht das erwartete `shift`?** Wenn nein, ist
  Schritt 1 nicht angekommen und alles Weitere ist wieder Deutung.
- **Steigt die Last in HQ von 0,85× zu 0,6× an?** Sie *muss* — um rund ein
  Drittel. Tut sie es nicht, rechnet das Worklet erneut nicht mit dem
  eingestellten Faktor.
- **`peakLoad` in HQ gegen `peakLoad` in Roh.** Das ist die eigentliche
  Zahl. Roh ist die Nulllinie dieses Geräts.
- Bleibt `peakLoad` in HQ auch nach allen vier Schritten über 1, ist die
  Rechenlast auf dieser Geräteklasse tatsächlich nicht einzuholen — dann,
  und erst dann, ist der Architekturumbau (Abschnitt 7, letzter Punkt)
  dran.

---

## 7. Was diese Runde **nicht** tut

- **Den Standard nicht umstellen.** `DEFAULT_SETTINGS.slowMode` bleibt
  `'standard'` (siehe 0.3).
- **Den Resampler nicht anfassen.** Die lineare Interpolation in
  `readOutput()` bleibt, obwohl sie bei 6 kHz messbar 11,5 dB kostet. Ein
  Polyphasen-Sinc-Resampler würde die Rechenlast *erhöhen* — das ist in
  einer Runde, die Last senken soll, der falsche Schritt.
- **Die Fensterlänge nicht antasten.** `N` von 2048 auf 1024 zu halbieren
  klingt naheliegend, bringt aber fast nichts: die Kosten je Sekunde gehen
  mit `4·log₂(N)`, weil bei halbem Fenster doppelt so viele Frames
  anfallen — von 44 auf 40, also rund 10 %, und das gegen spürbar
  schlechtere Frequenzauflösung. Der wirksame Hebel wäre die
  Überlappung (75 % → 50 % halbiert die Kosten), erfordert aber ein
  anderes Fenster (Sinusfenster statt Hann, sonst ist die
  Overlap-Add-Summe nicht mehr konstant) und kostet hörbar Qualität. Beides
  ist Reserve für den Fall, dass Schritt 3 und 4 nicht reichen —
  **nicht** Teil dieser Runde.
- **Die Architektur nicht umbauen.** Kein Offline-Dehnen, kein Verzicht auf
  das Medienelement. Das bleibt die Rückfalloption, falls Abschnitt 6 zeigt,
  dass auch die halbierte Last nicht reicht.
- **Keine Fremdbibliothek.**

---

## 8. Commits

Ein Commit je Abschnitt, in dieser Reihenfolge — sicher vor riskant, damit
sich ein Regress eindeutig zuordnen lässt:

1. `shift` als AudioParam zustellen, Bestätigung in jedem Lastbericht
   (Abschnitt 1)
2. Lastanzeige über `renderCapacity`, Echtzeitmessung ohne Port, Anzeige in
   allen drei Modi (Abschnitt 2)
3. Höchstens ein Analyseframe je Render-Quantum (Abschnitt 3, mit
   Selbsttest)
4. Reelle FFT statt komplexer (Abschnitt 4, mit beiden Selbsttests)
5. `SW_VERSION` auf `v117`, Messergebnisse in dieser Datei

---

## 9. Merge-Stand prüfen

Vor dem letzten Push `git fetch origin main`. Ist `main` weitergezogen,
`git merge origin/main` (kein Rebase), Konflikte so auflösen, dass **beide**
Seiten erhalten bleiben, `SW_VERSION` über beide Seiten hinweg auf den
höheren Wert setzen, danach Abschnitt 5 erneut durchlaufen.

**Prüfe in jedem Fall, dass `DEFAULT_SETTINGS.slowMode` nach dem Merge noch
`'standard'` ist** und die einmalige Migration in `loadSettings()`
(`slowModeMigrated`) unversehrt dasteht. Das ist die eine Stelle, die auf
keinen Fall verlorengehen darf.

---

## Anhang — Messgerüst

Die Vorsession hat ihr Messgerüst im Scratchpad verloren und konnte ihre
eigenen Zahlen nicht mehr reproduzieren (siehe „Zur Methodik der
Zeitmessungen" in `SLOWPLAY-HQ-FIX-PLAN.md`). Damit das nicht noch einmal
passiert, steht es hier im Repo. Alle Zahlen dieser Anweisung stammen
daraus.

**Bausteine aus `index.html` herauslösen** — sie stehen zusammenhängend
zwischen `function hqPrincipalAngle` und `function hqBuildWorkletSource`:

```python
src = open('index.html').read()
core = src[src.index('function hqPrincipalAngle(x) {'):src.index('function hqBuildWorkletSource()')]
open('hqcore.js','w').write(core + "\nmodule.exports={hqPrincipalAngle,hqAnalysisHop,hqPitchRatio,HqFft,HqPitchShifter};\n")
```

**Zeit je Quantum, zwei Kanäle** (`node bench.js`):

```js
const { HqPitchShifter } = require('./hqcore.js');
const SR = 48000, Q = 128;
function sig(n, ph) {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) { let v = 0;
    for (const f of [110,220,330,440,660,880,1320,2200,3300,5000]) v += Math.sin(2*Math.PI*f*i/SR + ph)/10;
    a[i] = v; }
  return a;
}
const L = sig(SR*6, 0), R = sig(SR*6, 1.1);
for (const rate of [0.85, 0.7, 0.6]) {
  const ch = [new HqPitchShifter(), new HqPitchShifter()];
  ch.forEach((s) => s.setShift(1/rate));
  const o = [new Float32Array(Q), new Float32Array(Q)], per = [];
  const nq = Math.floor(L.length/Q);
  for (let q = 0; q < 3000; q++) {            // JIT warmlaufen lassen
    ch[0].process(L.subarray(q*Q, q*Q+Q), o[0]);
    ch[1].process(R.subarray(q*Q, q*Q+Q), o[1]);
  }
  ch.forEach((s) => s.reset());
  for (let q = 0; q < nq; q++) {
    const t0 = process.hrtime.bigint();
    ch[0].process(L.subarray(q*Q, q*Q+Q), o[0]);
    ch[1].process(R.subarray(q*Q, q*Q+Q), o[1]);
    per.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  const s = per.slice().sort((a, b) => a - b);
  const pc = (x) => s[Math.floor(s.length * x)];
  console.log(rate, 'Mittel', (per.reduce((a,b)=>a+b,0)/per.length).toFixed(3),
              'p95', pc(0.95).toFixed(3), 'p99', pc(0.99).toFixed(3),
              'max', s[s.length-1].toFixed(3), '— Frist', (Q/SR*1000).toFixed(2), 'ms');
}
```

**Anteil der FFT an `processFrame()`**: `HqFft.transform` einzeln in einer
Schleife messen (vorwärts und rückwärts getrennt) und gegen
`shifter.processFrame()` bei gefülltem `analysisWin` halten. Ergebnis
dieser Session: 0,0736 / 0,0821 / 0,2225 ms — die FFT macht 70 % aus.

**Bitgleichheit des Frame-Budgets (Abschnitt 3)**: zwei Läufe desselben
Materials in 128er-Blöcken, einer mit `maxFrames = 1`, einer ohne, jedes
Sample vergleichen. Erwartung `maxDiff === 0` und `underrunSamples === 0`.

**Verteilung der Frames je Quantum**: `framesProcessed` vor und nach jedem
`process()`-Aufruf über beide Kanäle differenzieren und histogrammieren.
Das ist die Messung, die den eigentlichen Befund dieser Vorbereitung
geliefert hat (immer null oder zwei, nie einer).
