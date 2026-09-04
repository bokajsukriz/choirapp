# Verlangsamung „HD" — was ausgeliefert ist und was zu prüfen bleibt

Stand dieses Branches. Vorgeschichte in `SLOWPLAY-HQ-HANDOFF.md`; der
Rückbau, den `SLOWPLAY-RUECKBAU-PLAN.md` beschreibt, ist hier **mit
erledigt** — er ist Teil dieser Änderung, nicht mehr eine eigene Runde.

---

## Was sich geändert hat

Der selbst geschriebene Phasenvocoder ist raus. An seiner Stelle steht
`signalsmith-stretch` — ein Phasenvocoder in WebAssembly (MIT).

| | vorher (`v118`) | jetzt (`v120`) |
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
| Blocklänge | nach Voreinstellung | eigene Blocklänge; sperrt die Presets |
| Schrittweite | automatisch (¼ Block) | größer = weniger Frames = billiger, gröber |
| Rechnung verteilen | aus | verteilt einen Block über mehrere Render-Quanten: senkt die **Spitzen**last, nicht die Gesamtlast |

„Rechnung verteilen" ist genau der Hebel, den Runde 3 von Hand nachgebaut
hat (höchstens ein Analyseframe je Quantum). Wenn es knackt, obwohl die
Echtzeitanzeige bei 100 % steht, ist das der erste Schalter zum Probieren.

### Latenz — gemessen, und der Regler dafür

Die Latenz des Zeitdehners steht unten im Bereich und entspricht **exakt der
Blocklänge**:

| Einstellung | Latenz |
|---|---|
| Preset „Standard" | 120 ms |
| Preset „Sparsam" | 140 ms |
| Blocklänge 60 ms | 60 ms |
| Blocklänge 30 ms | 30 ms |

**120 ms sind für Mitsingen viel.** Wem der Versatz auffällt, dreht die
Blocklänge herunter — 60 ms halbieren ihn. Der Preis ist gröbere
Frequenzauflösung, was tiefe Stimmen zuerst treffen dürfte (60 ms sind bei
48 kHz knapp 2900 Samples; ein Bass bei 80 Hz hat darin knapp fünf
Perioden). Genau das ist der Kompromiss, den es zu hören gilt.

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
