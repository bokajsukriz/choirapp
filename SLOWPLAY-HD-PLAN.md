# Verlangsamung „HD" — was ausgeliefert ist und was zu prüfen bleibt

Stand dieses Branches. Vorgeschichte in `SLOWPLAY-HQ-HANDOFF.md`; der
Rückbau, den `SLOWPLAY-RUECKBAU-PLAN.md` beschreibt, ist hier **mit
erledigt** — er ist Teil dieser Änderung, nicht mehr eine eigene Runde.

---

## Was sich geändert hat

Der selbst geschriebene Phasenvocoder ist raus. An seiner Stelle steht
`signalsmith-stretch` — ein Phasenvocoder in WebAssembly (MIT).

| | vorher (`v118`) | jetzt (`v125`) |
|---|---|---|
| Modi | Standard / HQ Mono / HQ / Roh | **Standard / HD** |
| Rechenkern | ~45 KB handgeschriebenes JS im Worklet | `signalsmith-stretch` 1.3.2, WASM |
| Echtzeit bei 0,6× auf dem Zielgerät | 65 % (gemessen) | 100 % (in der Vorprüfung gemessen) |
| Selbsttests dazu | ~20 zur FFT und zum Vocoder | 7 zur Halbtonrechnung |

`index.html` ist um rund 45 KB kleiner geworden. Die Bibliothek liegt als
eigene Datei daneben und wird **erst nachgeladen, wenn HD gewählt ist** —
wer bei Standard bleibt, lädt sie nie.

## Der Signalweg

Unverändert bleibt: das `<audio>`-Element ist in **beiden** Modi die
Tonquelle. Daran hängen die Sperrbildschirm-Bedienung und das Weiterspielen
im Hintergrund (Media Session), und daran wird nicht gerüttelt.

```
Standard   <audio> (playbackRate, preservesPitch = true)
             → MediaElementSource → Kanal-Matrix → Ausgabe

HD         <audio> (playbackRate, preservesPitch = false — langsamer UND tiefer)
             → MediaElementSource
             → signalsmith-stretch (schiebt die Tonhöhe um 12·log2(1/rate) zurück)
             → Kanal-Matrix → Ausgabe
```

## Die eine Entscheidung, die leicht falsch herum ginge

`formantCompensation` bleibt **aus**. Das Resampling im Element zieht
Tonhöhe *und* Formanten gemeinsam nach unten; das Hochschieben holt beide
gemeinsam zurück. Das Ergebnis ist von sich aus formanttreu. Eingeschaltet
würde die Formantkorrektur die Formanten unten festhalten und den Klang
dunkler machen — hier wäre sie ein Fehler, kein Gewinn. Der Kommentar an
`hdSemitonesForRate()` sagt das ebenfalls, damit es niemand „repariert".

## Die Werkbank unter „Erweitert"

Unter dem HD-Knopf sitzt ein aufklappbarer Bereich (nur sichtbar, solange HD
gewählt ist), der die Regler des Zeitdehners live verstellt — auch während
der Wiedergabe. Er ist zum Ausprobieren da, nicht für den Alltag; die
Voreinstellungen sind die der Bibliothek.

**Klang** — geht über `schedule()` und wirkt lückenlos:

| Regler | Voreinstellung | wozu |
|---|---|---|
| Formantkorrektur | aus | siehe oben — sollte hier aus bleiben |
| Formanten verschieben | 0 Halbtöne | Stimmfarbe getrennt von der Tonhöhe verschieben |
| Formant-Grundton | automatisch | 0 = Tonhöhenverfolgung, sonst grob 100 Hz (tief) … 400 Hz (hoch) |
| Grenze für Tonhaftigkeit | 8000 Hz | darüber behandelt der Vocoder das Signal als geräuschhaft |

**Rechenaufwand** — geht über `configure()` und setzt den Zeitdehner dabei
zurück (kurz hörbar), deshalb nur beim Loslassen des Reglers:

| Regler | Voreinstellung | wozu |
|---|---|---|
| Standard / Sparsam | Standard | die beiden Presets der Bibliothek |
| Blocklänge | 120 ms | eigene Blocklänge; sperrt die Presets |
| Schrittweite | automatisch (¼ Block) | größer = weniger Frames = billiger, gröber |
| Rechnung verteilen | **an** | verteilt einen Block über mehrere Render-Quanten: senkt die **Spitzen**last, nicht die Gesamtlast |

„Rechnung verteilen" ist genau der Hebel, den Runde 3 von Hand nachgebaut
hat (höchstens ein Analyseframe je Quantum). Wenn es knackt, obwohl die
Echtzeitanzeige bei 100 % steht, ist das der erste Schalter zum Probieren.

### Rechenaufwand — was wirklich hilft, gemessen

Mit `OfflineAudioContext` gerendert (20 s, zwei Kanäle, Rechenzeit je Sekunde
Ton — kleiner ist besser):

| Einstellung | Latenz | Rechenzeit/s | relativ |
|---|---|---|---|
| Preset „Standard" | 120 ms | 24,2 ms | 94 % |
| Preset „Sparsam" | 140 ms | 18,2 ms | **71 %** |
| Block 60, Schritt auto | 60 ms | 24,8 ms | 96 % |
| Block 120, Schritt auto | 120 ms | 25,7 ms | 100 % |
| Block 250, Schritt auto | 250 ms | 24,6 ms | 96 % |
| Block 120, Schritt auto, verteilt | 150 ms | 25,6 ms | 100 % |
| Block 250, Schritt auto, verteilt | 313 ms | 25,2 ms | 98 % |
| Block 120, **Schritt 60** | 120 ms | 15,2 ms | **59 %** |
| Block 250, **Schritt 120** | 250 ms | 15,8 ms | **61 %** |

Drei Dinge stehen damit fest:

1. **Die Blocklänge ändert am Rechenaufwand fast nichts** (60 ms: 96 %,
   250 ms: 96 %). Sie bestimmt Frequenzauflösung und Latenz, nicht die Last.
   „Mehr Latenz für mehr Stabilität" geht also **nicht** auf — größere Blöcke
   machen die einzelnen Schübe sogar größer.
2. **„Rechnung verteilen" kostet keine Rechenzeit** (100 % gegen 100 %). Es
   schiebt die Arbeit nur zeitlich auseinander, bezahlt mit einem Viertel
   mehr Latenz. Genau die Schübe waren es, an denen der alte Vocoder
   gescheitert ist — deshalb steht es jetzt **ab Werk an**.
3. **Der einzige echte Sparhebel ist die Schrittweite** (−41 %) bzw. das
   Preset „Sparsam" (−29 %), das nichts anderes tut. Weniger Analyseblöcke je
   Sekunde. Der Preis ist gröbere Überlappung, also mehr „Phasigkeit" auf
   gehaltenen Tönen — bei einem Chor die falsche Stelle zum Sparen, solange
   es nicht nötig ist.

### Die Voreinstellung setzt eine eigene Blocklänge

`blockMs: 120` statt „Preset", und das ist kein Schönheitsfehler: `configure()`
der Bibliothek reicht `splitComputation` **nur** im Zweig mit gesetztem
`blockMs` weiter. In der Preset-Betriebsart wäre der Schalter wirkungslos —
er ist dort deshalb gesperrt und sagt, warum. 120 ms sind gemessen genau die
Latenz des Presets „Standard", der Klang ändert sich also praktisch nicht.

Ein Druck auf ein Preset schaltet zurück in die Preset-Betriebsart
(`blockMs: 0`), ein Zug am Blocklängen-Regler wieder heraus. Ein Selbsttest
wacht darüber, dass die Voreinstellung nicht versehentlich auf `blockMs: 0`
bei eingeschaltetem `splitComputation` landet.

### Was „ab Werk" heißt, steht jetzt dran

Jeder Regler, der noch auf der Voreinstellung steht, trägt hinter seinem Wert
ein „· ab Werk". In der Preset-Betriebsart zeigt die Blocklänge zusätzlich die
gemessene Latenz — den einzigen Wert, den die Bibliothek über ihre Presets
herausgibt.

### Latenz — was sie wirklich betrifft

**Fürs reine Hören ist sie egal.** Eine konstante Verzögerung des ganzen
Signals hört niemand; man singt zu dem, was man hört. Entscheidend ist nicht
die Latenz, sondern der *Durchsatz*: dass pro Sekunde eine Sekunde Ton fertig
wird. Das zeigt die Echtzeitanzeige, und sie steht bei 100 %.

Drei Stellen, an denen sie doch zählt:

1. **Die Positionsanzeige eilt dem Ton voraus** — um die Blocklänge.
2. **Der A-B-Loop springt hörbar spät**: das Element springt sofort, der Ton
   kommt eine Blocklänge später nach. Die Länge der Schleife stimmt, nur der
   Übergang schmiert.
3. **Die Aufnahme (REC).** Der Anker rechnete mit `outputLatency` plus
   Mikrofonlatenz und kannte die des Zeitdehners nicht — eine Aufnahme in HD
   hätte um rund 120 ms versetzt gelegen. **Behoben:**
   `measureBackingLatency()` zählt `Audio.hdLatency` mit, sobald der
   Zeitdehner wirklich im Weg hängt.

### Bei 1,0× ist der Zeitdehner nicht im Weg

Bei normalem Tempo gäbe es nichts zu korrigieren — er kostete dort nur
Rechenzeit und seine Latenz. `hdEngaged()` verlangt deshalb `slowMode === 'hd'`
**und** `rate !== 1`, und `audioSetRate()` verdrahtet bei jedem Tempowechsel
neu. Geladen bleibt er trotzdem, sobald HD gewählt ist — sonst müsste der
erste Tempowechsel erst 113 KB nachziehen.

## Voreinstellung

`DEFAULT_SETTINGS.slowMode` bleibt **`'standard'`**. HD ist einen Tipp weit
weg (Einstellungen → Kompatibilität & Performance), aber niemand bekommt es
ungefragt. Wer vorher bewusst HQ oder HQ Mono eingeschaltet hatte, landet
beim ersten Start auf HD; „Roh" und alles Unbekannte fällt auf Standard
zurück.

## Was geprüft ist

Mit dem vorinstallierten Chromium durchgefahren (`playwright`), nicht nur
gelesen:

- Alle **10 456** Selbsttests bestehen, Konsole ohne Fehler (der eine
  `[notiz] Error: Testfehler` aus `runAsyncSelfTests()` ist gewollt).
- Der Zeitdehner kommt hoch: `Audio.hdNode` ist ein `AudioWorkletNode`, das
  WASM lädt aus der eingebetteten `data:`-URI, **ohne Netzzugriff**.
- Standard bei 0,6× → `preservesPitch = true`; HD bei 0,6× →
  `preservesPitch = false` und Knoten in der Kette.
- Umschalten **während der Wiedergabe** in beide Richtungen: keine
  Ausnahme, die Wiedergabe läuft weiter.
- Echtzeitmessung bei HD und 0,6×: 100 %, Anzeige zeigt
  „Wiedergabetempo: 100% der Echtzeit".

## Was der Gerätetest klären muss

1. **Klingt HD auf echtem Chormaterial besser als Standard?** Das ist die
   Frage, die dem ganzen Vorhaben zugrunde liegt und die in fünf Runden nie
   geprüft wurde. Beide Modi sind einen Tipp voneinander entfernt — bei
   0,6× auf einem lang gehaltenen Akkord vergleichen.
2. **Bleibt die Echtzeitanzeige bei 100 %?** Sie steht unter dem
   Modusschalter, sobald etwas läuft, und misst in beiden Modi dasselbe.
   Fällt sie in HD unter 97 %, färbt sie sich rot.
3. **Latenz.** Voreingestellt 120 ms — der Ton kommt also spürbar später
   als die Positionsanzeige. Zu prüfen: fällt das beim Mitsingen auf, wie
   genau trifft der A-B-Loop, und reicht eine kürzere Blocklänge (60 ms,
   30 ms) klanglich noch? Die Regler dafür sind unter „Erweitert".
4. **Der Originaltrack unter dem REC** läuft absichtlich an HD vorbei
   (`bgSource` speist direkt in die Matrix). In HD kann er deshalb um die
   Latenz des Zeitdehners gegen die Hauptspur versetzt sein. War beim alten
   Vocoder genauso — neu ist es nicht, aufgefallen ist es bisher aber auch
   nicht, weil HD nie lief.
5. **Erster Start ohne Netz.** Die Bibliothek liegt im Shell-Cache
   (`sw.js`), sollte also im Flugmodus laden. Einmal ausprobieren.

## Wenn HD nicht überzeugt

Dann ist der Rückbau schon fast fertig: Der Schalter, `hdSemitonesForRate`,
`ensureStretchLib`, `hdCreateNode`, `ensureHdNode` und der HD-Zweig in
`applySlowMode`/`applyRateToElement` fliegen raus, `slowMode` verschwindet
aus den Einstellungen, und `preservesPitch` steht wieder fest auf `true` —
also genau das Zielbild aus `SLOWPLAY-RUECKBAU-PLAN.md`, nur ohne den
Vocoder, der dort noch zu entfernen war.
