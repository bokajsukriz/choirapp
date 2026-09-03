# Verlangsamung „HD" — was ausgeliefert ist und was zu prüfen bleibt

Stand dieses Branches. Vorgeschichte in `SLOWPLAY-HQ-HANDOFF.md`; der
Rückbau, den `SLOWPLAY-RUECKBAU-PLAN.md` beschreibt, ist hier **mit
erledigt** — er ist Teil dieser Änderung, nicht mehr eine eigene Runde.

---

## Was sich geändert hat

Der selbst geschriebene Phasenvocoder ist raus. An seiner Stelle steht
`signalsmith-stretch` — ein Phasenvocoder in WebAssembly (MIT).

| | vorher (`v118`) | jetzt (`v119`) |
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
3. **Latenz.** Der Zeitdehner braucht ein Analysefenster, der Ton kommt
   also etwas später als die Positionsanzeige. Zu prüfen: fällt das beim
   Mitsingen auf, und wie genau trifft der A-B-Loop?
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
