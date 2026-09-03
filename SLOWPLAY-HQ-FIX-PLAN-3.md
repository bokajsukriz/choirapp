# Arbeitsanweisung — HQ-Verlangsamung, Runde 4

**Die Rechenlast halbieren bis vierteln — und das Springen abstellen.**

Adressat: Sonnet (Folge-Session). Vorgeschichte in `SLOWPLAY-HQ-PLAN.md`,
`SLOWPLAY-HQ-FIX-PLAN.md` und vor allem **`SLOWPLAY-HQ-FIX-PLAN-2.md`**
(Runde 3, die diese Runde direkt fortsetzt).

Gegengeprüft am Stand `39b67d7` von `main` (`SW_VERSION` `v117`).
**Immer über Funktions- und ID-Namen ansteuern, nie über Zeilennummern.**

---

## Ausgangslage — Runde 3 hat gewirkt, reicht aber nicht

Gerätetest nach Runde 3 (Android 10, Chrome Mobile 152), HQ:

| Tempo | Echtzeit | hörbar |
|---|---|---|
| 0,85× | 96–97 % | knackt und knistert |
| 0,7× | 75–78 % | — |
| 0,6× | 65 % | — |

Dazu neu: **„die Songs springen manchmal"**.

### Was daran gut ist

**Die Last steigt jetzt mit sinkendem Tempo.** Genau das war die Vorhersage
aus `SLOWPLAY-HQ-FIX-PLAN-2.md` und genau das war vorher **nicht** der Fall
(damals 57 % bei allen drei Tempi). Das ist der Beleg, dass der `shift`
ankommt: das Worklet rechnet endlich mit dem eingestellten Faktor. Der
Pitchabfall bei 0,7×/0,6× ist damit erledigt, und die Deutung „harte
Sättigung des Geräts" ist endgültig widerlegt — es ist ganz gewöhnliche,
mit dem Tempo wachsende Rechenlast.

Bei 0,85× ist außerdem aus 57 % ein 96–97 % geworden, obwohl sich die
Arbeitsmenge bei diesem Tempo nicht geändert hat. Ein Teil davon sind
Schritt 3 und 4, ein Teil ist die korrigierte Messung (die alte nahm erst
beim Empfang der Worklet-Nachricht Zeit und unterschätzte deshalb
systematisch, siehe Abschnitt 2.2 der Vorrunde).

### Was fehlt

Rund ein Drittel der Echtzeit bei 0,6×. Aus den drei Messpunkten lässt sich
die Rechenzeit je Quantum als `T ≈ 1,02·k − 0,1` (in Vielfachen der Frist,
`k = 1/Tempo`) anpassen — die drei Punkte liegen auf 1,2 % genau auf dieser
Geraden. Praktisch heißt das: **der mit `k` wachsende Anteil kostet fast
eine ganze Frist pro Quantum.** Um bei 0,6× auf ~85 % Auslastung zu kommen,
muss dieser Anteil auf **etwa die Hälfte bis ein Drittel**.

Das ist mit den Mitteln dieser Runde erreichbar. Es sind zwei Hebel, und
sie multiplizieren sich.

### Die Messlücke, die zuerst zu schließen ist

Abschnitt 6 der Vorrunde verlangte den Vergleich HQ **gegen Roh** auf
demselben Maßstab — Roh ist die Nulllinie des Geräts. Diese Zahlen liegen
nicht vor, nur die HQ-Werte. Ohne sie lässt sich nicht sagen, wie viel von
der Frist überhaupt für den Phasenvocoder übrig ist: liegt Roh bei 0,6×
schon bei 90 %, ist das Budget winzig; liegt es bei 100 %, ist es groß.

Außerdem: Der Nutzer zitiert „% der Echtzeit" — das ist der Wortlaut der
**Ersatzmessung** (`settings.perf.hqLoadFallbackLabel`). `renderCapacity`
hat also offenbar nicht gegriffen, obwohl Chrome 152 sie mitbringen
sollte. Das ist zu klären: `peakLoad` und `underrunRatio` sind die
besseren Zahlen, und `underrunRatio` beantwortet die Sprung-Frage direkt.

---

## 0. Rahmenbedingungen

1. **Branch:** `claude/bvg-slowplay-hq-debug-gu6fyz`, von `39b67d7`
   ausgehend. Niemals direkt auf `main` pushen.
2. **Kein Build-Schritt, keine Abhängigkeit, keine neue Datei.** Neue
   Worklet-Bausteine müssen in die Liste in `hqBuildWorkletSource()`
   eingetragen werden (die Falle aus 0.4 der Vorrunde — sie ist letzte
   Runde tatsächlich zugeschnappt, in Gestalt eines nicht maskierten
   Backticks in einem Kommentar innerhalb des Template-Strings).
3. **`DEFAULT_SETTINGS.slowMode` bleibt `'standard'`.** Unverändert.
4. **`SW_VERSION`** in `sw.js` am Ende einmal auf `v118`.
5. **i18n:** neue Texte in allen drei `STRINGS`-Blöcken (`de`, `en`, `pl`).
6. **Codestil:** deutschsprachige Kommentare im Ton der Datei (erklären
   *warum*), 2 Leerzeichen Einrückung, keine Umformatierung fremder Zeilen.

---

## 1. Schritt 1 — Die Messlücke schließen (klein, zuerst)

Ohne diese Zahlen ist der Rest wieder Raten.

### 1.1 Kanalzahl des Eingangs melden

Im Worklet in `HqShiftProcessor.process()` die Zahl der **Eingangskanäle**
mit in den Lastbericht geben:

```js
inCh: input ? input.length : 0
```

Das ist eine Zeile und entscheidet Schritt 2 vollständig (siehe dort).
`dlog('hq:load', …)` gibt sie mit aus.

### 1.2 Klären, warum `renderCapacity` nicht greift

`startHqLoadMeasurement()` prüft `ctx.renderCapacity && !hqRenderCapacityStarted`.
Ergänzen: einmalig protokollieren, ob `ctx.renderCapacity` überhaupt
existiert und ob `start()` ohne Ausnahme durchläuft —

```js
dlog('hq:capacityAvail', { has: !!ctx.renderCapacity, started: hqRenderCapacityStarted });
```

und den `start()`-Aufruf in `try/catch` legen, damit ein Fehlschlag
sichtbar wird statt die Messung stillschweigend zu verschlucken. Greift
`renderCapacity`, gehört `peakLoad` und `underrunRatio` in die Anzeige und
ins Log — `underrunRatio` beantwortet Abschnitt 4 direkt.

### 1.3 Was der Nutzer messen soll

Diagnose-Log an, dann je ~10 s:

1. **Standard** bei 1×, 0,85×, 0,7×, 0,6×
2. **Roh** bei 0,85×, 0,7×, 0,6×
3. **HQ** bei 0,85×, 0,7×, 0,6×

Roh ist die Nulllinie. Die Differenz HQ − Roh ist das, was der
Phasenvocoder wirklich kostet — und nur diese Differenz lässt sich durch
die Schritte 2 und 3 verkleinern.

---

## 2. Schritt 2 — Mono-Quellen nur einmal rechnen

**Das ist der größte Hebel, und er kostet nichts an Qualität.**

### 2.1 Der Befund

`HqShiftProcessor.process()` legt für jeden **Ausgabekanal** einen Shifter
an und füttert ihn mit

```js
const src = (input && (input[ch] || input[0])) || this.silence(...);
```

Bei einer **Mono-Quelle** gibt es nur `input[0]`. Der Ausdruck fällt für
Kanal 1 auf `input[0]` zurück — beide Shifter bekommen also **exakt
dieselben Samples** und rechnen **exakt dasselbe Ergebnis** zweimal aus.
Die Hälfte der gesamten HQ-Rechenzeit ist bei Mono-Material schlicht
verdoppelte Arbeit.

Der Kommentar an dieser Stelle begründet zu Recht, dass man **nicht**
einfach denselben Shifter zweimal füttern darf (seine interne Position
liefe doppelt so schnell). Die Lösung ist eine andere: **einmal rechnen,
das Ergebnis kopieren.**

### 2.2 Was zu tun ist

Vor der Kanalschleife bestimmen, wie viele Shifter wirklich gebraucht
werden:

```js
const inCh = input ? input.length : 0;
const need = inCh <= 1 ? 1 : output.length;
```

`ensureChannels(need)`, die Schleife über `need` statt `output.length`
laufen lassen, und danach bei `need < output.length` das Ergebnis von
Kanal 0 in die übrigen Ausgabekanäle kopieren (`output[c].set(output[0])`).

Das rotierende Frame-Budget aus Runde 3 bleibt unverändert — bei einem
Shifter ist es ohnehin nie bindend.

**Achtung beim Wechsel der Kanalzahl** (Stimmwechsel auf eine anders
kodierte Spur): wenn `need` sich ändert, müssen die betroffenen Shifter
zurückgesetzt werden, sonst spielt ein bisher unbenutzter Shifter alten
Inhalt an. Am einfachsten: `need` merken und bei Änderung `reset()` auf
alle Shifter.

### 2.3 Gemessene Wirkung

x86, zwei Kanäle, 128er-Quanten, warmer JIT, Mittel je Quantum:

| Tempo | heute (2 Shifter) | ein Shifter |
|---|---|---|
| 0,85× | 0,094 ms | 0,044 ms |
| 0,7× | 0,112 ms | 0,055 ms |
| 0,6× | 0,126 ms | 0,064 ms |

Also glatt die Hälfte. Die Spitze je Quantum ändert sich kaum (ein Frame
kostet, was er kostet) — aber das Gerät scheitert am **Mittelwert**
(dauerhaft 65 % der Echtzeit ist ein anhaltendes Defizit, kein
Einzelaussetzer), und genau den halbiert dieser Schritt.

### 2.4 Die Voraussetzung, die noch offen ist

**All das greift nur, wenn das Material tatsächlich mono ist.** Deshalb
Schritt 1.1 zuerst. Ist `inCh === 2`, bringt dieser Schritt null — dann
gilt stattdessen 2.5.

### 2.5 Falls das Material stereo ist

Zwei Möglichkeiten, in dieser Reihenfolge zu erwägen:

**(a) Bei `settings.channelMode === 'mono'` vor dem Vocoder summieren.**
Der Nutzer hat dann ohnehin Mono angefordert (die Kanal-Matrix summiert
danach L+R). Statt zwei Kanäle zu verschieben und danach zu summieren,
summieren und **einen** verschieben. Nicht bitgleich zum bisherigen Weg
(Summe zweier unabhängig phasenkorrigierter Kanäle ≠ Phasenkorrektur der
Summe), aber für den Zweck gleichwertig und eher sauberer, weil zwischen
den Kanälen keine Phaseninkonsistenz mehr entstehen kann. Der
Einspeisepunkt ist die Kanalschleife im Worklet; die Matrix dahinter bleibt
unangetastet.

**(b) Doppel-Mono erkennen.** Eine als Stereo kodierte Mono-Aufnahme hat
zwei praktisch gleiche Kanäle. Ein Vergleich je Quantum ist billig (128
Subtraktionen). Das lohnt aber nur mit Hysterese (erst nach ~1 s
Gleichheit umschalten, bei Abweichung sofort zurück, dabei beide Shifter
zurücksetzen) — mehr Zustand, mehr Umschaltartefakte. **Nur angehen, wenn
Schritt 1.1 zeigt, dass die Quellen stereo sind und Schritt 3 allein nicht
reicht.**

---

## 3. Schritt 3 — 50 % Überlappung mit Sinusfenster

**Der zweite Faktor 2 — dieser kostet Qualität, aber gemessen weniger als
befürchtet.**

### 3.1 Warum das der einzig verbleibende große Hebel ist

Die Kosten je Sekunde sind `(Frames/s) · (Kosten je Frame)`, also
`(f_s·k / H_s) · c·N·log₂N`. Der Anteil `N` kürzt sich gegen `H_s = N/4`
heraus: die Kosten hängen von `N` **nur über `log₂N`** ab. `N` von 2048 auf
1024 zu halbieren bringt deshalb rund 10 % — nicht der Rede wert (siehe
Abschnitt 6). Der Sprung `H_s` dagegen geht **direkt** in die Kosten ein:
`H_s` verdoppeln heißt halb so viele Frames, halbe Kosten.

### 3.2 Was zu ändern ist

Drei Zeilen in `HqPitchShifter`:

```js
this.Hs = this.N / 2;                          // statt N/4
this.win[i] = Math.sin(Math.PI * i / this.N);  // statt Hann
… += time[i] * win[i];                         // Normierung /1.5 entfällt
```

**Warum das Fenster mitgetauscht werden muss:** Analyse und Synthese
fenstern beide, wirksam ist also `win²`. Für sauberes Overlap-Add muss
sich `win²` über das Sprungraster zu einer Konstanten summieren. Für Hann
gilt das bei Sprung `N/4` (Summe 1,5 — daher die heutige Division). Bei
Sprung `N/2` ist Hann² **nicht** konstant (es welligt zwischen 0,5 und 1,
hörbar als Amplitudenbrummen). Das Sinusfenster `sin(πn/N)` erfüllt es
dagegen exakt: `sin²(x) + sin²(x+π/2) = 1`. Deshalb entfällt auch der
Faktor 1,5.

`Ha = round(Hs/k)` bleibt an allen drei Tempi deutlich über 128
(870 / 717 / 614), es fällt also weiterhin höchstens ein Frame je
Render-Quantum an — das Budget aus Runde 3 bleibt gültig.

### 3.3 Gemessen — Tempo

Mittel je Quantum, x86, zwei Kanäle:

| Tempo | heute | 50 % Überlappung | + Mono zusammen |
|---|---|---|---|
| 0,85× | 0,094 ms | 0,040 ms | 0,020 ms |
| 0,7× | 0,112 ms | 0,048 ms | 0,023 ms |
| 0,6× | 0,126 ms | 0,053 ms | 0,028 ms |

Also **2,4× allein** und **4,5× zusammen mit Schritt 2**.

### 3.4 Gemessen — Qualität

Alles bei `shift = 1/Tempo`, gegen den heutigen Stand:

| Größe | heute (75 %/Hann) | 50 %/Sinus |
|---|---|---|
| Tonhöhentreue 440 Hz | +0,3 … +1,6 % | +0,2 … +0,4 % |
| Verstärkung (RMS) | −0,49 dB | −0,34 dB |
| Störanteil 220 Hz, 0,6× | −16,6 dB | −15,0 dB |
| Störanteil 1 kHz, 0,6× | −15,7 dB | −15,0 dB |
| Störanteil 6 kHz, 0,6× | −13,5 dB | −14,9 dB |
| Anstiegszeit bei hartem Einsatz | < 10 ms | < 10 ms, kein messbarer Unterschied |

Also: Tonhöhe und Pegel eher besser, Störanteil unten rum 0,7–1,6 dB
schlechter, oben rum 1,3–1,4 dB besser, Einschwingen ohne messbaren
Nachteil. Die absoluten dB-Werte sind pessimistisch (das Messverfahren
zählt die durch Overlap-Add unvermeidliche Amplitudenmodulation als
Störung mit) — der **Vergleich** ist trotzdem aussagekräftig, beide Seiten
sind gleich gemessen.

**Was diese Messungen nicht abdecken:** die typische Schwäche geringerer
Überlappung ist „Phasigkeit" bzw. ein leichtes Schwirren auf gehaltenen
Tönen. Das entscheidet ein Hörtest, keine Zahl. Deshalb steht dieser
Schritt **nach** Schritt 2 und bekommt einen eigenen Commit: lässt sich der
Nutzer davon stören, ist genau dieser eine Commit zurückzunehmen, ohne den
Rest zu verlieren.

### 3.5 Selbsttests

Die bestehenden Prüfungen 5 bis 7 (Tonhöhe, Längentreue, Verstärkung)
müssen weiter bestehen — die Verstärkungsprüfung (±1,5 dB) ist genau der
Wächter für die entfallene Normierung. Ergänzen: eine Prüfung, dass sich
`win²` über das Sprungraster zu 1 summiert (Abweichung < 1e-6 über alle
Positionen). Das ist der Test, der einen falsch gepaarten
Fenster/Sprung-Wechsel sofort auffliegen lässt.

---

## 4. Schritt 4 — Das Springen

Drei Kandidaten, absteigend nach Wahrscheinlichkeit, jeder mit einem
eindeutigen Test.

### 4.1 Stehengebliebener Ringinhalt beim Wiedereinhängen (neu aus Runde 3)

Runde 3 hat `applyHqMode()` beigebracht, den Worklet-Knoten außerhalb von
HQ **abzuhängen** (`Audio.hqNode.disconnect()`). Solange er abgehängt ist,
läuft `process()` gar nicht — der Shifter behält seinen kompletten
Zustand. Beim Zurückschalten auf HQ nimmt er ihn wieder auf und gibt
zunächst bis zu `N` Samples (~43 ms) **Audio von vor dem Abhängen** aus.
Das ist ein hörbarer Versatz genau beim Moduswechsel, und es ist neu.

**Fix, unabhängig von jeder Messung:** in `applyHqMode()` beim Verbinden
einmal `Audio.hqNode.port.postMessage({ type: 'reset' })` senden. Der
Handler dafür existiert bereits im Worklet. Zwei Zeilen.

### 4.2 Unterläufe im Ringpuffer des Worklets

`underruns` steht bereits in jedem Lastbericht. **Test: steht dort etwas
anderes als 0?** Dann läuft der eigene Ringpuffer leer und die Ausgabe
enthält Stillelücken. Erwartung nach Runde 3: 0 — der Vorlauf beträgt `N`
Samples und das Frame-Budget verschiebt einen Frame um höchstens ein
Quantum. Steht dort doch etwas, ist das ein echter Fehler in der
Puffer-Buchhaltung und hat Vorrang vor allem anderen in dieser Runde.

### 4.3 Der Render-Thread hinkt hinterher

Läuft der Graph dauerhaft mit 65 % der Echtzeit, kommt die Ausgabe nicht
in dem Tempo zustande, in dem die Soundkarte sie abruft. Die Lücken füllt
der Browser, und der Medienpfad synchronisiert sich gelegentlich neu —
hörbar als Sprung. Das ist dann **kein eigener Fehler**, sondern dasselbe
Problem wie das Knistern, und es verschwindet mit der Last.

**Test:** wenn 4.2 „0" sagt und das Springen mit sinkendem Tempo häufiger
wird (0,6× öfter als 0,85×), ist es dieser Fall. `underrunRatio` aus
`renderCapacity` (Schritt 1.2) misst ihn direkt.

---

## 5. Wieviel muss es werden — die Rechnung

Bei 0,6× braucht das Gerät heute 2,67 ms / 0,65 = **4,11 ms** je Quantum.
Wieviel davon der Phasenvocoder ist, hängt an der Nulllinie, die noch
fehlt (Schritt 1.3): liegt Roh bei 100 %, entfallen auf HQ mindestens
4,11 − 2,67 = 1,44 ms; ist die Grundlast kleiner, entsprechend mehr. Das
Verhältnis zur Messmaschine dieser Vorbereitung (0,126 ms) liegt damit
zwischen **11× und 25×**.

Zielmarke: HQ soll die Gesamtauslastung unter ~85 % der Frist drücken.

- **Schritt 2 allein** (0,064 ms): reicht bei einem Faktor von 11×
  bequem, bei 25× nicht.
- **Schritt 3 allein** (0,053 ms): dasselbe Bild.
- **Beide zusammen** (0,028 ms): reicht über die ganze Spanne.

Deshalb sind beide Schritte eingeplant und nicht als Alternativen
gedacht — aber in dieser Reihenfolge, und Schritt 3 mit einem eigenen,
einzeln zurücknehmbaren Commit, weil nur er Qualität kostet.

---

## 6. Gemessene Sackgassen — hier keine Zeit investieren

- **`% ringSize` durch `& (ringSize−1)` ersetzen.** Nachgemessen: 0,1607 ms
  gegen 0,1618 ms je Frame — **kein Gewinn**. V8 optimiert die Modulo-
  Operation auf eine Zweierpotenz bereits selbst. (Das Ergebnis ist dabei
  bitgleich, `maxDiff === 0` — die Umformung ist korrekt, sie bringt nur
  nichts.)
- **`N` von 2048 auf 1024.** Kosten je Sekunde gehen mit `log₂N`, das sind
  ~10 % — gegen deutlich schlechtere Frequenzauflösung. Siehe 3.1.
- **Polyphasen-Sinc-Resampler statt linearer Interpolation.** Erhöht die
  Rechenlast. In einer Runde, die Last senken soll, der falsche Schritt —
  unverändert die Einschätzung aus Runde 3.

---

## 7. Reserve, falls Schritt 2 und 3 nicht reichen

Nicht Teil dieser Runde, hier nur als Notiz für die übernächste:

**(a) Erst resampeln, dann dehnen.** Heute wird bei 48 kHz analysiert und
mit `Ha = Hs/k` gesprungen; Frames je Sekunde `= f_s·k / H_s`. Resampelt
man das Signal **vor** dem Vocoder um `k` und dehnt danach mit
`H_s = k·H_a` zurück, arbeitet der Vocoder auf dem kürzeren Signal:
Frames je Sekunde `= (f_s/k) / H_a`. Bei gleicher Syntheseüberlappung
spart das nochmals den Faktor `k` — also 18 % bei 0,85× und 67 % bei 0,6×,
also am meisten dort, wo es am meisten fehlt. Preis: das Analysefenster
deckt zeitlich `k`-mal mehr Original ab (bei 0,6× rund 71 ms statt 43 ms),
mit entsprechend mehr Verschmieren von Einsätzen.

**(b) Offline dehnen.** Den gerade geloopten Abschnitt einmal vorab
berechnen, zwischenspeichern, dem Element als Blob geben. Kein
Echtzeitrisiko mehr, dafür Wartezeit beim Loopstart und mehr Speicher.

---

## 8. Prüfung vor dem Push

1. `runSelfTests()` in der Konsole — alle Prüfungen bestanden.
2. **Die Bausteine wie in Runde 3 nach Node herauslösen und die HQ-Tests
   dort ebenfalls laufen lassen.** Das hat letzte Runde den nicht
   maskierten Backtick gefunden, der das Worklet nur im Browser und nur
   stillschweigend kaputtgemacht hätte. Der Anhang beschreibt, wie.
3. **Vorher/nachher messen**, je 0,85× / 0,7× / 0,6×, Mittel und p99 je
   Quantum, und in dieser Datei festhalten. Zielwerte in 2.3 und 3.3.
4. **Klang gegen den heutigen Stand vergleichen**, nicht gegen absolute
   Zahlen: Tonhöhentreue, RMS, Störanteil bei 220 Hz / 1 kHz / 6 kHz —
   dieselbe Messung für beide Stände, wie in 3.4.
5. **Die App wirklich starten**: alle drei Modi, alle drei Tempi,
   Moduswechsel *während* der Wiedergabe (das ist der Test für 4.1),
   Tempowechsel während der Wiedergabe, A-B-Loop, Stimmwechsel (das ist
   der Test für den Kanalzahlwechsel aus 2.2).
6. **Das Diagnose-Log gegenlesen**, bevor es an den Nutzer geht: `inCh` in
   jedem Lastbericht, `shift` passend zum Tempo, `underruns` bei 0.

---

## 9. Commits

1. Kanalzahl und `renderCapacity`-Verfügbarkeit ins Log, `start()`
   abgesichert (Abschnitt 1)
2. Zurücksetzen beim Wiedereinhängen des Worklet-Knotens (Abschnitt 4.1)
3. Mono-Quellen nur einmal rechnen (Abschnitt 2, mit Selbsttest)
4. 50 % Überlappung mit Sinusfenster (Abschnitt 3, mit Selbsttest) —
   bewusst der letzte und einzeln zurücknehmbare Commit
5. `SW_VERSION` auf `v118`, Messergebnisse in dieser Datei

---

## 10. Merge-Stand prüfen

Vor dem letzten Push `git fetch origin main`. Ist `main` weitergezogen,
`git merge origin/main` (kein Rebase), Konflikte so auflösen, dass beide
Seiten erhalten bleiben, `SW_VERSION` auf den höheren Wert setzen, danach
Abschnitt 8 erneut durchlaufen. **Prüfen, dass
`DEFAULT_SETTINGS.slowMode` nach dem Merge noch `'standard'` ist.**

---

## Anhang — Messgerüst

Wie in Runde 3, auf `v117` nachgeführt. Die Bausteine stehen
zusammenhängend zwischen `function hqPrincipalAngle` und
`function hqBuildWorkletSource`; seit Runde 3 gehört `HqRealFft` dazu:

```python
src = open('index.html').read()
core = src[src.index('function hqPrincipalAngle(x) {'):src.index('function hqBuildWorkletSource()')]
open('hqcore.js','w').write(core +
  "\nmodule.exports={hqPrincipalAngle,hqAnalysisHop,hqPitchRatio,HqFft,HqRealFft,HqPitchShifter};\n")
```

**Zeit je Quantum, echtes Aufrufmuster** (rotierendes Budget wie im
Worklet):

```js
const V = require('./hqcore.js');
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
  const ch = [new V.HqPitchShifter(), new V.HqPitchShifter()];
  ch.forEach((s) => s.setShift(1/rate));
  const o = [new Float32Array(Q), new Float32Array(Q)];
  const nq = Math.floor(L.length/Q), per = []; let rot = 0;
  const step = (q) => {
    const b = [L.subarray(q*Q, q*Q+Q), R.subarray(q*Q, q*Q+Q)];
    let bg = 1;
    for (let i = 0; i < ch.length; i++) {
      const c = (rot + i) % ch.length, bef = ch[c].framesProcessed;
      ch[c].process(b[c], o[c], bg);
      bg = Math.max(0, bg - (ch[c].framesProcessed - bef));
    }
    rot = (rot + 1) % ch.length;
  };
  for (let q = 0; q < 3000; q++) step(q);        // JIT warmlaufen lassen
  ch.forEach((s) => s.reset());
  for (let q = 0; q < nq; q++) {
    const t0 = process.hrtime.bigint(); step(q);
    per.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  const s = per.slice().sort((a, b) => a - b);
  console.log(rate, 'Mittel', (per.reduce((a,b)=>a+b,0)/per.length).toFixed(3),
              'p99', s[Math.floor(s.length*0.99)].toFixed(3),
              '— Frist', (Q/SR*1000).toFixed(2), 'ms');
}
```

Für den Mono-Fall dasselbe mit **einem** Shifter und `o[1].set(o[0])`.

**Störanteil**: 2 s Sinus durch den Shifter, aus dem eingeschwungenen Teil
16384 Samples herausschneiden, Hann-gefenstert per `HqFft` transformieren,
Energie außerhalb von ±8 Bins um die verschobene Grundfrequenz gegen die
Energie innerhalb. Absolut pessimistisch (die Amplitudenmodulation des
Overlap-Add zählt mit), für den Vorher/Nachher-Vergleich aber tauglich,
solange beide Stände gleich gemessen werden.

**Verstärkung und Tonhöhe**: wie die bestehenden Selbsttests 5 und 7 —
Nulldurchgänge zählen bzw. RMS vergleichen, jeweils ab Sample 8192.
