# Arbeitsanweisung — HQ-Verlangsamung echtzeittauglich machen

Adressat: Sonnet (Folge-Session). Vorgeschichte und **alle Messwerte** stehen im
Nachtrag von `SLOWPLAY-HQ-PLAN.md` — **lies den zuerst**, er begründet jede
Vorgabe hier.

Gegengeprüft am Stand `bdf1b31` des Branches
`claude/slow-play-ui-improvements-yp57cg`.
**Immer über Funktions- und ID-Namen ansteuern, nie über Zeilennummern.**

---

## Ausgangslage in drei Sätzen

Der Phasenvocoder für die Verlangsamung ist auf `main` und war eine Version
lang standardmäßig an. Auf einem Pixel 9 (GrapheneOS) ist er unbrauchbar:
Stottern und Knistern schon bei 0,85×, bei 0,7× nur noch alle paar
Millisekunden ein verzerrtes Schnipsel, dazu ein hörbarer Pitchabfall. Er ist
deshalb jetzt aus (`hqSlowdown: false`) und wird auf bestehenden
Installationen einmalig zurückgenommen (`hqSlowdownReset`).

Gemessen ist: die **Rekonstruktion selbst ist korrekt** (−140 dB bei Faktor 1),
der Fehler steckt im Shift-Pfad. Die **lineare Interpolation im Resampler**
kostet bei 6 kHz 11,5 dB. Das **Element** ist mit −49,9 dB nicht das Problem.
Das **Stottern kommt aus der Echtzeit**: im Mittel nur 7–10 % eines Kerns, aber
stoßweise ~0,64 ms von 2,67 ms Frist je Frame auf x86 — auf ARM Faktor 2–3 —,
dazu Speicherzuweisungen im Audio-Thread.

Diese Anweisung deckt **Schritt 1 bis 3** aus dem Nachtrag ab. Schritt 4
(Resampler) und Schritt 5 (Neubewertung) kommen später und sind hier **nicht**
enthalten.

---

## 0. Rahmenbedingungen

1. **Branch:** `claude/slow-play-ui-improvements-yp57cg`, offen als PR #51.
   Niemals auf `main` pushen. Sollte PR #51 zwischenzeitlich gemerged sein,
   siehe Abschnitt 8.
2. **Kein Build-Schritt, keine Abhängigkeiten, keine Netzwerkanfrage, keine
   neue Datei** außer dieser Doku. Der Worklet-Quelltext wird weiterhin über
   `hqBuildWorkletSource()` aus den `toString()`-Quellen der Bausteine
   zusammengesetzt und als Blob-URL geladen.
3. **Der Standard bleibt `false`.** `DEFAULT_SETTINGS.hqSlowdown` wird in
   dieser Runde **nicht** wieder auf `true` gesetzt — auch dann nicht, wenn
   alles gut aussieht. Das entscheidet ein Gerätetest, nicht diese Session.
   `hqSlowdownReset` und die einmalige Rücknahme in `loadSettings()` bleiben
   unangetastet.
4. **Codestil:** deutschsprachige Kommentare im Ton der Datei (erklären
   *warum*, nicht *was*), 2 Leerzeichen Einrückung, keine Umformatierung
   fremder Zeilen.
5. **i18n:** neue Texte in der Einstellungsansicht brauchen Schlüssel in
   **allen drei** `STRINGS`-Blöcken (`de`, `en`, `pl`).
6. **`SW_VERSION`** in `sw.js` am Ende **einmal** erhöhen (Branch steht auf
   `v114`, `main` auf `v113`).
7. **Nicht anfassen:** die drei UI-Korrekturen (Gigliste, Songtitel/Reiter,
   REC-Bearbeiten), die Kanal-Matrix, der Hintergrundtrack, `applyHqMode()`,
   `applyRateToElement()`, die Verdrahtung in `audioInit()`. Diese Runde
   ändert **nur** das Innere des Worklets plus die Anzeige in den
   Einstellungen.

---

## 1. Schritt 1 — Last auf dem Gerät messen

Ohne Zahlen vom Pixel bleibt alles Weitere Raten. Das ist deshalb der **erste**
Commit, noch vor jeder Optimierung — nur so lässt sich hinterher belegen, dass
die Optimierung etwas gebracht hat.

### 1.1 Vorabklärung: gibt es im Worklet eine Uhr?

`AudioWorkletGlobalScope` bietet laut Spezifikation `currentTime`,
`currentFrame` und `sampleRate` — `currentTime` springt aber nur je
Render-Quantum weiter und taugt **nicht** zum Messen der eigenen Laufzeit.
Ob `performance.now()` dort verfügbar ist, ist nicht garantiert.

**Erster Handgriff:** im Browser prüfen, ob `typeof performance !== 'undefined'
&& typeof performance.now === 'function'` im Worklet-Kontext gilt. Ergebnis
unten unter „Messergebnisse" notieren.

- **Verfügbar:** wie in 1.2 messen.
- **Nicht verfügbar:** ersatzweise `currentFrame`/`currentTime` gegen die
  Wanduhr der Hauptseite stellen — der Worklet meldet je Sekunde seinen
  `currentFrame`, die Hauptseite vergleicht mit `performance.now()`. Läuft die
  Wiedergabe langsamer als Echtzeit, ist genau das der Beweis für die
  Überlastung. Gröber, aber ausreichend, und es erklärt zusätzlich die
  Beobachtung „scheint langsamer als 0,85×".

### 1.2 Was gemessen wird

Im `process()` des Prozessors, um den eigentlichen Rechenteil herum:

- **Mittelwert** der `process()`-Dauer über das Meldeintervall,
- **Maximum** über das Meldeintervall (das ist die interessante Zahl — die
  Spitze reißt die Frist, nicht der Mittelwert),
- beides als **Anteil der Frist** `128 / sampleRate` (bei 48 kHz 2,667 ms),
- die schon vorhandenen **Unterlauf-Samples**.

Meldung wie bisher einmal pro Sekunde über den bestehenden `port` — die
Nachricht `{ type: 'load', avgPct, maxPct, underruns }` ergänzt die vorhandene
`underrun`-Meldung oder ersetzt sie. Die Messung selbst darf **nichts
allokieren** und muss bei `shift === 1` (Durchreichen) praktisch nichts kosten.

### 1.3 Anzeige

In der Karte „Kompatibilität & Performance" unter dem Schalter, in einem
eigenen `<p class="small muted">` mit fester ID:

- **Nur sichtbar, solange der Schalter an ist und eine Wiedergabe läuft.** Ist
  er aus, bleibt die Zeile weg — sie soll niemanden verunsichern, der die
  Funktion gar nicht benutzt.
- Text im Ton der App, etwa: „Rechenlast: 34 % im Mittel, 78 % in der Spitze —
  Aussetzer: 0". Über 100 % in der Spitze ist die Frist gerissen; das darf die
  Zeile deutlich sagen (z. B. eingefärbt über `var(--danger)`).
- i18n-Schlüssel in allen drei Sprachen, Zahlen per Platzhalter einsetzen (an
  bestehenden Mustern in `t()` orientieren; gibt es dort keine Platzhalter,
  Zahlen außerhalb des übersetzten Textes anhängen statt eine neue Mechanik zu
  erfinden).
- Zusätzlich weiterhin `dlog('hq:load', …)`, damit es im Diagnose-Log landet.

### 1.4 Der ungeklärte Pitchabfall

Bei 0,7× berichtet der Nutzer eine dauerhaft **zu tiefe** Tonhöhe. Starke
Aussetzer erklären Stottern und Rauschen, aber nicht das. Zwei Verdächtige,
beide mit der Messung aus 1.2 zu prüfen:

1. **Die `shift`-Nachricht kommt nicht an oder zu spät.** `port.postMessage()`
   ist asynchron; genau darauf bin ich beim Messen selbst hereingefallen (der
   erste Messlauf zeigte unverschobene 153,8 Hz statt 220 Hz). Kommt sie gar
   nicht an, steht der Shifter auf 1 und reicht das vom Element um 0,7
   heruntergestimmte Signal **unverändert** durch — das wäre exakt der
   beschriebene Pitchabfall. **Gegenmittel:** der Prozessor bestätigt jede
   `shift`-Nachricht über den Port zurück, die Hauptseite protokolliert die
   Bestätigung per `dlog`. Dann steht fest, ob die Nachricht ankommt.
2. **Die Abtastrate.** Der `AudioContext` läuft mit der Rate des Geräts, die
   Datei hat ihre eigene. Der Shifter rechnet in Kontext-Samples und ist davon
   eigentlich unabhängig — trotzdem `sampleRate` einmal mitprotokollieren, um
   die Möglichkeit auszuschließen.

Das ist Diagnose, keine Reparatur. Was die Messung zeigt, gehört unter
„Messergebnisse".

---

## 2. Schritt 2 — Keine Speicherzuweisung mehr im Audio-Thread

Jede Allokation im Render-Callback riskiert eine GC-Pause und damit einen
hörbaren Aussetzer. Aktuell gibt es vier Stellen, alle in `HqPitchShifter`
bzw. im Prozessor:

| Stelle | heute | soll |
|---|---|---|
| `process()` | `new Float32Array(n)` je Kanal und Quantum (~750/s) | in den vom Aufrufer gelieferten Puffer schreiben |
| `inFifo` | JS-Array, `push()` je Sample, `splice(0, Ha)` je Frame | vorbelegtes `Float32Array` mit Zähler, Rest per `copyWithin` nachrücken |
| `findPeaks()` | neues Array je Frame und Kanal | vorbelegtes `Int32Array` + `peakCount` |
| Prozessor | `new Float32Array(output[ch].length)` wenn kein Eingang | einmal vorbelegter Stille-Block |

**Wichtig für die Selbsttests:** `runSelfTests()` ruft heute
`shifter.process(noise)` auf und erwartet einen Rückgabewert. Die neue
Signatur `process(input, output)` muss deshalb einen fehlenden `output`
weiterhin verkraften und dann selbst einen anlegen — mit einem Kommentar, dass
dieser Zweig **nur** für die Selbsttests da ist und im Audio-Thread nie
genommen wird.

**Was Schritt 2 ausdrücklich nicht leistet:** Die Spitze wird dadurch *nicht*
kleiner. Ein Frame entsteht nur alle `Ha` Samples, und `Ha` ist bei allen
angebotenen Tempi größer als 128 (bei 0,6× sind es 307) — es fällt also
ohnehin schon höchstens ein Frame je Quantum an. Eine Begrenzung auf „ein
Frame je Quantum" wäre wirkungslos; **baue sie nicht ein**. Die Spitze senkt
erst Schritt 3.

---

## 3. Schritt 3 — Winkelfunktionen aus dem heißen Pfad

Das ist der eigentliche Hebel gegen die Spitze. Gemessen (5 Mio. Aufrufe):
`Math.hypot` 18,5 ns, `atan2` 14,7 ns, `cos`+`sin` 16,8 ns, `sqrt` dagegen
2,8 ns. Der Code ruft heute **pro Frame und Kanal** je 1025-mal `hypot`,
`atan2`, `cos` und `sin` auf — also rund 4100 teure Aufrufe je Frame.

Der folgende Umbau senkt das auf **rund vier Aufrufe je Spitze** (typisch
50–200 Spitzen statt 1025 Bins), ohne das Verfahren zu ändern. Die Rechnung
dahinter, damit du sie nachvollziehen und prüfen kannst:

Heute wird rekonstruiert als
`framePhase[b] = synthPhase[p] + (phase[b] − phase[p])` und daraus
`re[b] = mag[b]·cos(framePhase[b])`, `im[b] = mag[b]·sin(framePhase[b])`.

Mit `X[b] = mag[b]·e^{i·phase[b]}` ist das **identisch** zu einer Drehung

```
Y[b] = X[b] · e^{i·θ_p}   mit   θ_p = synthPhase[p] − phase[p]
```

denn `mag[b]·e^{i(phase[b] + synthPhase[p] − phase[p])} = mag[b]·e^{i·framePhase[b]}`.
Die Drehung ist eine komplexe Multiplikation — vier Multiplikationen und zwei
Additionen je Bin, **keine** Winkelfunktion. `cos θ_p` und `sin θ_p` fallen nur
noch einmal **je Spitze** an.

Daraus folgt der Umbau:

1. **Kein `hypot` mehr.** Der Betrag wird nur noch für die Spitzensuche
   gebraucht, und dafür genügt das **Betragsquadrat**
   (`re*re + im*im`). Die Drehung erhält den Betrag von selbst — er muss
   nirgends mehr explizit berechnet oder wieder aufmultipliziert werden.
2. **`atan2` nur noch an Spitzen.** Für die Phasenableitung braucht es die
   Phase der Spitze im aktuellen **und** im vorigen Frame. Speichere deshalb
   statt `prevPhase[]` das **vorige komplexe Spektrum** `prevRe[]`/`prevIm[]`
   (reines Kopieren, keine Winkelfunktion) und berechne `atan2` erst dann,
   wenn ein Bin tatsächlich Spitze ist.
3. **Die Synthesephase einer neu hinzugekommenen Spitze.** Heute wird
   `synthPhase[b]` für *jeden* Bin fortgeschrieben; das ginge ohne
   `phase[b]` nicht mehr. Lösung: merke je Bin das **θ**, mit dem er im
   vorigen Frame gedreht wurde (`prevTheta[]`, ein reiner Zahlenwert je Bin).
   Die vorige Synthesephase einer Spitze ist dann
   `prevPhase[p] + prevTheta[p]` — und `prevPhase[p]` ist genau das eine
   `atan2` aus Punkt 2. Reihenfolge beachten: **erst** die Spitzenschleife
   (liest das alte `prevTheta`), **dann** die Bin-Schleife (schreibt das
   neue).
4. **`prevRe`/`prevIm` sind das ungedrehte Analysespektrum** — also **vor**
   der Drehung sichern, nicht danach.
5. **Erster Frame nach `reset()`:** es gibt kein voriges Spektrum. Dann
   `θ = 0` setzen (Identität) statt mit Nullphasen zu rechnen. Ein Merker
   `hasPrev` genügt; er gehört in `reset()` zurückgesetzt.
6. `im[0]` und `im[half]` bleiben nach der Drehung auf 0, und die Spiegelung
   an der Nyquist-Achse bleibt wie bisher — reelles Signal.

Wenn danach noch Luft fehlt, ist der nächste Schritt, **beide Kanäle in einer
FFT** zu verarbeiten (links im Real-, rechts im Imaginärteil, Spektren danach
über die Symmetrie trennen). Das halbiert Hin- und Rücktransformation. Mach das
**nur**, wenn die Messung aus Schritt 1 zeigt, dass es nötig ist — es ist
deutlich fehleranfälliger als alles davor.

---

## 4. Selbsttests

Die sechs vorhandenen HQ-Prüfungen in `runSelfTests()` sind dein Sicherheitsnetz
und müssen **unverändert** weiterlaufen — besonders diese beiden:

- Durchreichen bei `shift = 1` liefert die Eingabe bitgleich zurück.
- 440 Hz mit `shift = 1/0,7` landet innerhalb von 2 % bei ~629 Hz.

Neu dazu:

1. **Verstärkung.** Ein Sinus durch den Shifter bei `shift = 1/0,7` behält
   seinen Effektivwert auf ±0,5 dB. Diese Prüfung fehlte bisher und hätte
   einen Skalierungsfehler in der Rücktransformation nicht bemerkt.
2. **Drehung ist identisch zur alten Rekonstruktion.** Für einen konstruierten
   Fall (Betrag und Phase von Hand gesetzt) liefern
   `mag·cos(synthPhase + phase − phasePeak)` und die komplexe Drehung
   denselben Wert auf 1e-9. Das sichert Abschnitt 3 gegen Vorzeichendreher —
   die wahrscheinlichste Art, diesen Umbau zu verpfuschen.
3. **Kein Zustandsleck über `reset()`.** Zweimal denselben Block durch
   denselben Shifter schicken, dazwischen `reset()`: beide Ausgaben identisch.

---

## 5. Prüfung vor dem Push

Es gibt keine Testsuite und keinen Linter. Also:

1. `runSelfTests()` in der Konsole — alle Prüfungen bestanden, Konsole sonst
   sauber (der `[notiz] Error: Testfehler` aus `runAsyncSelfTests()` ist
   gewollt und kein Regress).
2. **Vorher/nachher messen und beide Zahlen festhalten.** Zwei Kanäle, je
   0,85× / 0,7× / 0,6×, viele 128er-Blöcke, Mittel- und Maximalkosten je
   Quantum gegen das Budget `128/sampleRate`. Der bisherige Stand liegt bei
   0,19 / 0,24 / 0,26 ms im Mittel (x86, warmer JIT, beide Kanäle) — ohne
   diesen Vergleich ist nicht belegt, dass der Umbau etwas gebracht hat.
   Ein brauchbares Messgerüst liegt im Scratchpad der Vorsession
   (`cpu.js`, `quality3.js`, `resamp.js`); der Trick, an die internen
   Bausteine zu kommen, ist eine Kopie von `index.html`, bei der die
   umschließende IIFE (`(() => {` nach `<script>` und das `})();` davor)
   durch Kommentare ersetzt ist.
3. **Klangqualität darf sich nicht verschlechtern.** Die Störanteile aus dem
   Nachtrag nachmessen: reiner Sinus, `shift = 1/0,6`, erwartet rund −47,6 dB
   bei 220 Hz und −32,1 dB bei 6 kHz. Schlechter als das heißt: beim Umbau ist
   etwas kaputtgegangen. Besser ist möglich, aber nicht das Ziel dieser Runde.
4. Die App im Browser wirklich starten und bei eingeschaltetem Schalter
   abspielen: 0,85× / 0,7× / 0,6×, Umschalten während der Wiedergabe,
   A-B-Loop, Stimmwechsel. Die neue Lastanzeige ansehen.

---

## 6. Was diese Runde **nicht** tut

- **Den Standard nicht wieder anschalten** (siehe 0.3).
- **Den Resampler nicht anfassen.** Die lineare Interpolation in
  `readOutput()` bleibt vorerst, obwohl sie messbar 11,5 dB kostet. Solange es
  stottert, hört den Unterschied ohnehin niemand — und zwei Baustellen
  gleichzeitig machen unauffindbar, welche Änderung was bewirkt hat.
- **Die Architektur nicht umbauen.** Kein Offline-Dehnen, kein Verzicht auf
  das Medienelement. Das ist Schritt 5 und hängt am Ergebnis dieser Runde.
- **Keine Fremdbibliothek.**

---

## 7. Commits

Ein Commit je Abschnitt, in dieser Reihenfolge — die Messung zuerst, damit
die folgenden Commits ihre Wirkung belegen können:

1. Lastmessung im Worklet und Anzeige in den Einstellungen (Abschnitt 1)
2. Bestätigung der `shift`-Nachricht und Diagnose zum Pitchabfall (1.4)
3. Speicherzuweisungen aus dem Audio-Thread entfernen (Abschnitt 2)
4. Winkelfunktionen nur noch an Spitzen, `hypot` raus (Abschnitt 3)
5. Selbsttests (Abschnitt 4), `SW_VERSION`, Messergebnisse in dieser Datei

---

## 8. Merge-Stand prüfen

Vor dem letzten Push `git fetch origin main`. Ist `main` weitergezogen,
`git merge origin/main` (kein Rebase), Konflikte so auflösen, dass **beide**
Seiten erhalten bleiben, `SW_VERSION` über beide Seiten setzen, danach
Abschnitt 5 erneut durchlaufen.

War PR #51 zwischenzeitlich gemerged, gilt das Gleiche — der Branch bleibt
derselbe, und ein neuer PR wird für die Folgearbeit geöffnet, falls der alte
geschlossen ist. **Prüfe in jedem Fall, dass `DEFAULT_SETTINGS.hqSlowdown`
nach dem Merge noch `false` ist** und die Rücknahme in `loadSettings()` samt
`hqSlowdownReset` unversehrt dasteht. Das ist die eine Zeile, die auf keinen
Fall verloren gehen darf.

---

## Messergebnisse

_(von der ausführenden Session auszufüllen — Abschnitte 1.1, 1.4 und 5)_

| Größe | vorher | nachher |
|---|---|---|
| `performance.now()` im Worklet verfügbar? | — | |
| Mittel je Quantum, 0,85× (2 Kanäle) | 0,19 ms | |
| Mittel je Quantum, 0,7× | 0,24 ms | |
| Mittel je Quantum, 0,6× | 0,26 ms | |
| Spitze je Quantum, 0,6× | (nicht erhoben) | |
| Störanteil Sinus 220 Hz, 1/0,6 | −47,6 dB | |
| Störanteil Sinus 6 kHz, 1/0,6 | −32,1 dB | |
| Kommt die `shift`-Nachricht an? | — | |
