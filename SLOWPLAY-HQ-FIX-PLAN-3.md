# Arbeitsanweisung — HQ-Verlangsamung, Runde 4

**Die Rechenlast halbieren — und das Springen abstellen.**

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

### Die Nulllinie — nachgetragen und eindeutig

**Standard und Roh bleiben bei jedem Tempo bei rund 100 %.** Das ist der
Vergleichswert, der der Vorrunde noch fehlte, und er ist so klar, wie man
es sich wünscht: Dekodieren, Resampeln im Element, Kanal-Matrix, Mischen
und Ausgabe passen zusammen bequem in die Frist, und zwar bei 0,6× genauso
wie bei 1×. Der **gesamte** Rückstand in HQ geht damit auf den
Phasenvocoder — es gibt keine versteckte Grundlast, gegen die
anzukämpfen wäre.

Das ist die bestmögliche Ausgangslage für diese Runde: jede eingesparte
Rechenzeit im Vocoder schlägt eins zu eins in Luft um. Was die Rechnung
daraus macht, steht in Abschnitt 5.

Offen bleibt eine Kleinigkeit: Der Nutzer zitiert „% der Echtzeit" — das
ist der Wortlaut der **Ersatzmessung**
(`settings.perf.hqLoadFallbackLabel`). `renderCapacity` hat also
offenbar nicht gegriffen, obwohl Chrome 152 sie mitbringen sollte.
`peakLoad` und `underrunRatio` sind die besseren Zahlen, und
`underrunRatio` beantwortet die Sprung-Frage direkt.

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

Die Nulllinie steht bereits (Standard und Roh bei ~100 %, siehe oben) und
muss nicht erneut erhoben werden. Für den nächsten Test genügt deshalb
**HQ bei 0,85× / 0,7× / 0,6×, je ~10 s, mit eingeschaltetem
Diagnose-Log** — plus einmal Roh bei 0,6× als Gegenprobe, falls sich am
Gerät etwas geändert hat.

Auszuwerten sind dann:

- `inCh` — mono oder stereo (entscheidet Schritt 2 vollständig)
- `underruns` — 0 oder nicht (entscheidet Abschnitt 4.2)
- ob `renderCapacity` diesmal greift (dann zusätzlich `peakLoad` und
  `underrunRatio`)

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

### 2.4 Wann das von selbst greift

Diese Abkürzung zieht nur bei einer Mono-Quelle. Ist das Material stereo
kodiert, bringt sie zunächst nichts — dann sorgt der neue Modus aus 2.5
dafür, dass sie trotzdem greift. `inCh` aus Schritt 1.1 sagt hinterher,
welcher der beiden Fälle vorlag; ein Blocker ist die Frage damit nicht
mehr.

### 2.5 Der vierte Modus — dieselbe Ersparnis auch bei Stereo-Quellen

Vom Nutzer vorgeschlagen, und es ist der bessere Weg als die adaptive
Erkennung, die hier vorher stand. Zwei Dinge, die sich ähneln, aber
verschieden sind:

- **2.2 ist geschenkt und bedingungslos:** eine Mono-*Quelle* braucht nur
  einen Shifter. Da ist nichts zu entscheiden, das ist einfach kein
  Verdoppeln von Arbeit mehr.
- **Dies hier ist eine Entscheidung:** eine Stereo-Quelle *vor* dem
  Vocoder zu Mono summieren. Halbiert die Kosten unabhängig davon, wie
  die Datei kodiert ist — zum Preis des Stereobildes.

Als Modus ist das ehrlich: der Nutzer sieht, was er eintauscht, und kann
es zurücknehmen. Als automatische Erkennung wäre es ein stiller
Qualitätseingriff mit Umschaltartefakten.

#### Der Clou: dafür ist kein einziges Stück DSP-Code nötig

Web Audio mischt selbst herunter. In `applyHqMode()` genügt es, den Knoten
umzustellen:

```js
// Mono-HQ
Audio.hqNode.channelCount = 1;
Audio.hqNode.channelCountMode = 'explicit';
Audio.hqNode.channelInterpretation = 'speakers';
// Stereo-HQ: zurück auf den Standardwert
Audio.hqNode.channelCountMode = 'max';
```

Bei `'explicit'` und `channelCount = 1` mischt Web Audio den Eingang nach
der Lautsprecher-Regel auf einen Kanal herunter, und das ist exakt
`0,5·(L+R)` — genau die gewünschte Summe. `process()` bekommt danach
`inputs[0].length === 1`, also greift **die Mono-Abkürzung aus 2.2 von
selbst**. `outputChannelCount: [2]` steht beim Anlegen fest, die Ausgabe
bleibt stereo, die Kanal-Matrix dahinter bleibt unangetastet.

Weil sich mit dem Modus die Zahl der Shifter ändert, beim Umschalten
`{ type: 'reset' }` senden — was Abschnitt 4.1 ohnehin verlangt.

#### Einstellungswert und Beschriftung

**`'hq'` behält seine heutige Bedeutung (stereo)**, der neue Modus bekommt
einen eigenen Wert, z. B. `'hqmono'`. So ändert sich für niemanden
stillschweigend das Verhalten, und die einmalige Migration in
`loadSettings()` bleibt unberührt.

`.preset-row` ist ein fest verdrahtetes `repeat(3, 1fr)` und wird mit den
Fahrradfahren-Presets geteilt — der vierte Knopf braucht deshalb eine
eigene Regel `#slow-mode { grid-template-columns: repeat(4, 1fr); }`, kein
Ändern der gemeinsamen Klasse. Bei 0,82 rem in einem Viertel der Breite
müssen die Beschriftungen kurz sein.

Vorschlag, aufsteigend nach Rechenaufwand:
`Standard | HQ Mono | HQ | Roh`. Die Namen sind Geschmackssache — „Super
HD" und „HD" tun es genauso, sie sind nur länger und brechen eher um.

#### Die Stelle, an der das schiefgeht

`settings.slowMode === 'hq'` steht an **fünf** Stellen:
`renderSlowMode()`, der Unterlauf-Zweig in `hqCreateNode()`,
`applyHqMode()`, `applyRateToElement()` (zweimal, `useHq` und `preserve`).
Jede davon muss beide HQ-Werte erkennen. Statt fünf Vergleiche zu
verdoppeln: **ein Helfer `isHqMode()`**, und jede dieser Stellen ruft ihn
auf. `preserve` bleibt an `=== 'standard'` gebunden, das ist richtig so.

Auch `updateHqLoadVisibility()` und der `#hq-unsupported-hint` gelten für
beide HQ-Knöpfe.

#### Hinweistext

Neuer Schlüssel in allen drei `STRINGS`-Blöcken. Inhaltlich: HQ Mono
rechnet die Tonhöhe nur einmal statt zweimal und ist deshalb etwa doppelt
so sparsam; dafür sind beide Kanäle danach gleich — Aufnahmen, die eine
Stimme hart auf links oder rechts legen, verlieren diese Trennung, und die
Fahrradfahren-Umschaltung (links/rechts tauschen, Mono) hat in diesem
Modus keine hörbare Wirkung mehr.

## 3. Schritt 3 — 50 % Überlappung mit Sinusfenster

**Der zweite Faktor 2 — dieser kostet Qualität, aber gemessen weniger als
befürchtet.**

> **Bedingt.** Dieser Schritt wird erst umgesetzt, wenn der Gerätetest
> nach Schritt 2 zeigt, dass `HQ Mono` allein nicht reicht (siehe
> Abschnitt 5). Er steht hier ausgearbeitet, damit die Entscheidung dann
> schnell geht — nicht, damit er vorsorglich mitgenommen wird.

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

Weil Standard und Roh bei ~100 % liegen, ist die Grundlast klein und der
Vocoder trägt praktisch den ganzen Rückstand. Damit lässt sich der Rest
ausrechnen statt schätzen.

Bei 0,6× braucht das Gerät heute 2,67 ms / 0,65 = **4,11 ms** je Quantum,
davon fast alles Vocoder. Auf der Messmaschine dieser Vorbereitung kostet
derselbe Vocoder 0,126 ms — dieses Gerät ist für diese Art Arbeit also
grob **26- bis 33-mal langsamer**. Mit diesem Faktor lassen sich die
x86-Zahlen aus 2.3 und 3.3 auf das Gerät umrechnen (Frist 2,67 ms):

| Stand | x86, 0,6× | geschätzt auf dem Gerät | Auslastung |
|---|---|---|---|
| HQ stereo, heute | 0,126 ms | 3,3–4,2 ms | 125–155 % |
| HQ stereo + 50 % Überlappung | 0,053 ms | 1,4–1,7 ms | 52–65 % |
| **HQ Mono** | 0,064 ms | 1,7–2,1 ms | **62–79 %** |
| HQ Mono + 50 % Überlappung | 0,028 ms | 0,7–0,9 ms | 27–35 % |

Die erste Zeile ist die Gegenprobe: 125–155 % Auslastung entspricht 65–80 %
Echtzeit, gemessen wurden 65 %. Die Umrechnung trägt also.

**Was das für die Reihenfolge heißt.** `HQ Mono` allein landet bei
62–79 % Auslastung — unter der Grenze, mit 20–38 % Luft. Das ist
wahrscheinlich genug: dieses Gerät knistert bei 96–97 % der Echtzeit, also
bei rund 104 % Auslastung, und davon wäre man dann deutlich entfernt. Die
Spanne ist allerdings breit, weil der Gerätefaktor aus drei ungefähren
Messpunkten stammt.

Deshalb **erst den Modus, dann messen, dann über die Überlappung
entscheiden** — und nicht beides auf einmal. Schritt 3 kostet als
einziger Schritt dieser Runde Klangqualität; ihn auszugeben, bevor
feststeht, dass er gebraucht wird, wäre verschenkt. Reicht `HQ Mono`, ist
die Runde vorbei. Reicht es nicht, liegt Schritt 3 fertig beschrieben da
und bringt den Rest.

**Zur Spitze, nicht nur zum Mittel:** Schritt 2 und 3 senken die *Zahl*
der Frames, nicht die Kosten eines einzelnen. Auf x86 bleibt p99 bei
0,17–0,25 ms je Quantum, auf dem Gerät also bei geschätzt 5–7 ms gegen
2,67 ms Frist — ein Quantum, in dem ein Frame anfällt, reißt die Frist
weiterhin um das Zwei- bis Dreifache. Nach beiden Schritten fällt bei 0,6×
aber nur noch alle ~4,8 Quanten einer an; dazwischen ist so viel Luft,
dass der Ausgabepuffer des Browsers das auffängt. Bleibt es nach beiden
Schritten bei niedrigem Mittelwert trotzdem beim Knistern, ist genau das
der Beleg, dass die Spitze selbst zerlegt werden muss — siehe 7(c).

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

**(c) Einen Frame über mehrere Quanten verteilen.** Wenn nach Schritt 2 und
3 der Mittelwert niedrig ist und es trotzdem knistert, liegt es an der
Spitze (siehe Abschnitt 5): Hin-FFT im einen Quantum rechnen,
Spektrumsarbeit und Rück-FFT im nächsten. Der Vorlauf von `N` Samples
(16 Quanten) reicht dafür bequem, die Ausgabe ändert sich dadurch nicht —
es verschiebt sich nur, wann gerechnet wird, genau wie beim Frame-Budget
aus Runde 3. Halbiert die Spitze.

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
5. **Die App wirklich starten**: alle vier Modi, alle drei Tempi,
   Moduswechsel *während* der Wiedergabe (das ist der Test für 4.1),
   Tempowechsel während der Wiedergabe, A-B-Loop, Stimmwechsel (das ist
   der Test für den Kanalzahlwechsel aus 2.2). Beim Wechsel zwischen
   `HQ` und `HQ Mono` während der Wiedergabe darf es nicht springen, und
   in `HQ Mono` müssen beide Ausgabekanäle gleich klingen — die
   Fahrradfahren-Umschaltung wird dort hörbar wirkungslos, das ist
   gewollt und im Hinweistext erklärt.
6. **Das Diagnose-Log gegenlesen**, bevor es an den Nutzer geht: `inCh` in
   jedem Lastbericht, `shift` passend zum Tempo, `underruns` bei 0.

---

## 9. Commits

1. Kanalzahl und `renderCapacity`-Verfügbarkeit ins Log, `start()`
   abgesichert (Abschnitt 1)
2. Zurücksetzen beim Wiedereinhängen des Worklet-Knotens (Abschnitt 4.1)
3. Mono-Quellen nur einmal rechnen (Abschnitt 2.1–2.4, mit Selbsttest)
4. Vierter Modus `HQ Mono` samt `isHqMode()`, viertem Knopf und
   Hinweistext in allen drei Sprachen (Abschnitt 2.5)
5. `SW_VERSION` auf `v118`, Messergebnisse in dieser Datei

**Hier endet die Runde — der Gerätetest entscheidet über den Rest.**
Reicht `HQ Mono` nicht, folgt als eigener, einzeln zurücknehmbarer Commit:

6. 50 % Überlappung mit Sinusfenster (Abschnitt 3, mit Selbsttest)

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
