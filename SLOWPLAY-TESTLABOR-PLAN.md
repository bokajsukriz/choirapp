# Arbeitsanweisung — Messplatz für die Verlangsamung

Adressat: Sonnet. Vorgeschichte in `SLOWPLAY-HQ-HANDOFF.md` — **lies die
zuerst**. Sie begründet, warum diese Runde keine Optimierung ist.

Ausgangsstand: `main` bei `2b10c33`, ausgeliefert `SW_VERSION` `v118`.
**Immer über Funktions- und ID-Namen ansteuern, nie über Zeilennummern.**

---

## 0. Die Vorprüfung ist gelaufen — und sie hat schon etwas entschieden

Auf dem Zielgerät (Android 10, Chrome 152, 8 Kerne, 48 kHz) gemessen:

| Prüfung | Ergebnis |
|---|---|
| AudioWorklet aus Blob-URL | **ja** — der Artifact-Weg trägt |
| WebAssembly aus eingebetteten Bytes | **ja** |
| WASM-SIMD | **ja** |
| `signalsmith-stretch` lädt | **ja**, WASM ohne Netzzugriff aus der `data:`-URI |
| Hörprobe 0,6× | **spielt**, und dabei **100 % der Echtzeit** |
| `performance.now()` im Worklet | nein (wie erwartet) |
| `AudioContext.renderCapacity` | **nein** — auf diesem Gerät gibt es sie nicht |

**Die vorletzte Zeile ist der Befund dieser Runde.** Unser handgeschriebener
Vocoder schafft bei 0,6× auf demselben Gerät 65 % der Echtzeit;
`signalsmith-stretch` schafft 100 %. Das Defizit von 35 %, an dem fünf
Runden Handoptimierung gescheitert sind, ist bei der WASM-Bibliothek nicht
vorhanden.

**Was daraus noch nicht folgt** — und was der Messplatz klären soll:

- 100 % ist ein **Deckenwert**. Ob dahinter 5 % Reserve stehen oder 300 %,
  sagt die Zahl nicht. Genau deshalb misst Abschnitt 2 den Durchsatz
  *jenseits* der Decke.
- Gemessen wurde in der **WebView der Claude-App**
  (`…; wv) … Chrome/152 … Claude/1.260828.0`), nicht in Chrome selbst und
  nicht in der installierten PWA. Dieselbe Engine, aber nicht dieselbe
  Umgebung.
- Gemessen wurde ein synthetischer Vierklang von 4 s im **Pufferbetrieb**,
  nicht echtes Chormaterial am Live-Eingang.
- **Über den Klang sagt sie nichts.** Ob HQ überhaupt hörbar besser ist als
  das native Standard, ist weiterhin ungeprüft — die Frage, die diesem
  ganzen Vorhaben zugrunde liegt.

`renderCapacity` fehlt endgültig. Die Ersatzmessung (`ctx.currentTime`
gegen `performance.now()`, beide im selben Tick gelesen) ist damit das
einzige Instrument, und sie deckelt bei 100 %. Abschnitt 2.2 sagt, wie man
trotzdem an eine Zahl darüber kommt.

---

## 1. Was gebaut wird, und wie schnell es laufen muss

Ein Artifact — ein Link aufs Telefon. Kein Release, kein
Service-Worker-Cache, kein Risiko für die laufende App.

**Zeitvorgabe: ein Antippen, unter 30 Sekunden bis zum fertigen
Ergebnisblock.** Das ist eine Anforderung, keine Anregung. Die vorige
Fassung dieser Anweisung sah eine Rampe vor, die K schrittweise hochfährt —
das hätte je Engine und Tempo eine halbe Minute gedauert, macht drei
Minuten Gesamtmessung und wird deshalb ausdrücklich **verworfen**. Der
Nutzer hat für diese Sache schon fünf Runden Handmessung aufgewendet.

Drei Sparsamkeitsregeln:

1. **Nur 0,6× messen.** Das ist der schlimmste Fall; was dort besteht,
   besteht überall. 0,85× und 0,7× nur hinter einem Schalter „auch die
   anderen Tempi".
2. **Nur zwei Engines im Pflichtlauf:** `js-mono` (der ausgelieferte Stand,
   `HQ Mono`) und `wasm` (`signalsmith-stretch`). Das ist die
   Entscheidungsfrage. `js-stereo` ist bekannt und gehört hinter denselben
   Schalter.
3. **Alles läuft automatisch nach einem Antippen.** Kein Knopf je Messung.

---

## 2. Die Messungen

### 2.1 Durchsatz im Worker — roh und ungedeckelt

Ein gewöhnlicher `Worker` schiebt Testsignal in 128er-Blöcken durch die
Engine, so schnell er kann, und misst mit `performance.now()`. Ergebnis:
**Audiosekunden je Wanduhrsekunde**.

- **Erst warmlaufen lassen** (rund 2000 Quanten), sonst misst man beim
  JS-Vocoder den kalten JIT und benachteiligt ihn gegenüber WASM.
- Danach **feste 2 s Wanduhrzeit** rechnen und zählen, wieviel Audio in
  dieser Zeit fertig wurde. So ist die Dauer der Messung bekannt,
  unabhängig davon, wie schnell die Engine ist.

Diese Zahl beantwortet die DVFS-Vermutung aus dem Handoff: das Worklet
arbeitet stoßweise (~5 ms rechnen, ~13 ms schlafen) und taktet den Kern
womöglich nie hoch, ein Worker unter Dauerlast schon.

### 2.2 Durchsatz im Worklet — mit Absicht überlasten

Im Worklet gibt es keine Uhr, und die Echtzeitmessung deckelt bei 100 %.
Der Ausweg ist, nicht die Zeit zu messen, sondern **die Last so weit
hochzudrehen, dass die Decke bricht**:

> Das Worklet verarbeitet **K unabhängige Ströme** je Quantum. Läuft der
> AudioContext dabei nur noch mit dem Anteil `p` der Echtzeit, dann trägt
> dieser Render-Thread **K · p Echtzeitströme**.

Eine einzige Messung genügt also, wenn K hoch genug gewählt ist:

- K = 6 setzen, 2 s messen.
- Kommt `p ≥ 95 %` heraus, war es nicht überlastet — **einmal** mit K = 16
  wiederholen.
- Mehr als zwei Durchgänge nicht. Ergebnis: `Durchsatz = K · p`, in
  Echtzeitströmen.

Für diese Messung das Frame-Budget aus Runde 3 **abschalten** (jeder
Shifter rechnet frei) — gemessen wird roher Durchsatz, nicht die
ausgelieferte Ablaufplanung.

Damit kostet der Pflichtlauf: 2 Engines × (2 s Worker + höchstens 4 s
Worklet + Warmlauf) — **gut unter 20 Sekunden**.

### 2.3 Was danach feststeht

- `wasm`-Durchsatz im Worklet **≥ 2 Ströme** → die Sache ist entschieden,
  WASM einbauen.
- `wasm` deutlich besser als `js-mono`, aber beide unter 1,5 → auch WASM
  ist knapp; dann zählt der Worker-Wert, und die Rechnung gehört vom
  Audio-Thread herunter (Handoff §8 F).
- Worker-Durchsatz **weit über** dem Worklet-Durchsatz derselben Engine →
  der Render-Thread ist der langsame Ort, nicht das Gerät. Das ändert die
  Architekturfrage grundlegend und ist unabhängig von WASM wertvoll.

---

## 3. Der Hörvergleich

Beantwortet die Frage, die diesem Vorhaben zugrunde liegt und nie geprüft
wurde. Selbstbestimmtes Tempo, keine Zeitvorgabe — aber **das Umschalten
muss augenblicklich sein**, sonst vergleicht man Erinnerungen.

- **Quelle:** `<input type="file" accept="audio/*">`. Die Songs liegen in
  der IndexedDB der App, auf einem anderen Ursprung — der Messplatz kommt
  nicht heran. Der Nutzer wählt eine seiner MP3-Dateien vom Telefon. Als
  Rückfall ein eingebauter Vierklang, der aber für diese Frage wenig taugt:
  Chorstimmen sind der Prüfstein.
- **Ausschnitt:** ~15 s, ab einer wählbaren Stelle.
- **Beide Kandidaten laufen gleichzeitig**, an derselben Stelle, und
  umgeschaltet wird nur die Verstärkung. Kein Neuaufsetzen, kein Sprung,
  keine Pause — sonst ist der Vergleich wertlos. Zwei Engines gleichzeitig
  kosten Rechenzeit; das ist hier egal, gemessen wird in Abschnitt 2.
- **Blind.** Knöpfe „A" und „B", Zuordnung ausgewürfelt, Auflösung erst
  nach dem Urteil. Bei dieser Frage hängt zu viel davon ab.
- **Paare, die etwas entscheiden** (je einzeln aufrufbar):
  1. `standard` (natives `preservesPitch`) gegen `wasm` — **das ist die
     Kernfrage.** Ist da kein Unterschied, kann HQ ersatzlos weg.
  2. `js-mono` gegen `wasm` — lohnt der Wechsel klanglich?
  3. `wasm` ohne gegen `wasm` mit **`formantCompensation`** — unser Vocoder
     hat keine; bei hochgeschobenem Gesang ist das womöglich der größte
     hörbare Unterschied überhaupt, und ohne eigenen Vergleich weiß
     hinterher niemand, woher er kam.

---

## 4. `signalsmith-stretch` — was geprüft ist

`signalsmith-stretch@1.3.2`, **MIT**, eine einzige 113-KB-JS-Datei; das
~64-KB-WASM steckt darin als `data:application/octet-stream;base64,`-URI.
`findWasmBinary()` liefert sie direkt zurück; das `fetch` in der Datei ist
Emscriptens Pfad für den Fall, dass die Binärdatei *keine* Daten-URI ist,
und wird nicht betreten. Deshalb braucht die Bibliothek keinen Netzzugriff
— sie läuft unter der CSP des Artifacts und würde später auch offline in
der PWA laufen.

```js
const stretch = await SignalsmithStretch(ctx);   // ein AudioNode
stretch.schedule({ rate: 0.6, semitones: 0, formantCompensation: true });
stretch.start();
```

**Zwei Betriebsarten, beide gehören in den Messplatz**, weil sie für die
App Verschiedenes bedeuten:

**(a) Live-Eingang.** Der Knoten hängt wie unser `hqNode` hinter der
`MediaElementSource`. Das Element resampled weiter
(`preservesPitch = false`), der Knoten schiebt die Tonhöhe zurück:
`semitones = 12·log2(1/rate)`. `rate` wird dabei ignoriert. Minimaler
Eingriff in die App — ein Knoten gegen einen anderen.

**(b) Pufferbetrieb.** `addBuffers([...])` mit den dekodierten Kanälen,
dann `schedule({ rate })`. Der Knoten dehnt selbst, das Element wird als
Tonquelle nicht mehr gebraucht. Größerer Umbau, aber in zwei Punkten
besser: kein doppeltes Resampling mehr (heute resampled erst das Element,
dann interpoliert `readOutput()` ein zweites Mal), und `loopStart`/
`loopEnd` gibt es eingebaut — der A-B-Loop wäre sample-genau statt
„bestenfalls auf ein paar hundert Millisekunden", wie der Kommentar am
`timeupdate`-Handler heute einräumt.

Die Vorprüfung hat (b) benutzt. **(a) ist noch völlig ungemessen** und ist
zugleich der Weg, der die App am wenigsten umbaut — also unbedingt mit
messen.

`rubberband-web@0.2.1` ist **GPL-2.0-or-later**: als Klangmaßstab im
privaten Messplatz wertvoll, auf einer öffentlich gehosteten Seite nicht
auslieferbar. Nur einbauen, wenn Zeit bleibt, und **deutlich als „nur
Vergleich, nicht auslieferbar" beschriften.**

---

## 5. Ausgangspunkt im Repo

`testlabor/` enthält das Gerüst der Vorprüfung, das weiterverwendet wird:

- `pruefstand.kopf.html` — Markup und Stile (Telefon-Layout, hell/dunkel,
  Prüfzeilen, Ergebnisblock)
- `pruefstand.fuss.html` — die Messlogik der Vorprüfung
- `bauen.py` — holt `signalsmith-stretch`, bettet es ein, schreibt
  `pruefstand.html`; gibt Version, Lizenz und SHA-256 aus

```
python3 testlabor/bauen.py
```

Die Bibliothek liegt bewusst **nicht** im Repo — sie wird beim Bauen
geholt. Version, Lizenz und SHA-256 gehören in die Messnotiz.

Vor dem Schreiben der Seite den **`artifact-design`-Skill laden**.

---

## 6. Bauen **und prüfen** — das ist neu und nicht verhandelbar

Bisher ging jede Fassung ungetestet aufs Telefon des Nutzers. Das hört
hier auf: in dieser Umgebung ist **Chromium samt Playwright vorinstalliert**
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, kein
`playwright install` nötig).

Vor dem Veröffentlichen die fertige Seite lokal aufrufen und durchfahren:

1. Seite laden, **Konsole muss sauber sein** — jede Ausnahme ist ein Fehler.
2. Den Startknopf betätigen (headless braucht
   `--autoplay-policy=no-user-gesture-required`).
3. Prüfen, dass **jede Prüfzeile einen Zustand ungleich „offen"** bekommt
   und **jede Messung eine Zahl** liefert — nicht `–`, nicht `NaN`,
   nicht `Infinity`.
4. Den Ergebnisblock auslesen und prüfen, dass er **vollständig** ist:
   Gerätedaten, jede Engine, jede Messung.
5. Die Datei-Auswahl mit einer erzeugten WAV-Datei bedienen
   (`setInputFiles`) und prüfen, dass der Hörvergleich aufsetzt und das
   Umschalten keine Ausnahme wirft.

**Die Zahlen aus dem Headless-Lauf sind bedeutungslos** — dort hängt kein
Audiogerät, die Echtzeitmessung misst Unsinn. Geprüft wird, dass die
Mechanik trägt: dass gemessen *wird*, nicht was herauskommt. Genau der
Fehler, der letzte Runde nur im Browser auftrat (ein nicht maskierter
Backtick im Worklet-Quelltext), wäre so aufgefallen.

Erst danach veröffentlichen und den Link nennen.

---

## 7. Der Ergebnisblock

Am Ende eine Schaltfläche **„Ergebnis kopieren"**, die alles als einen
Textblock in die Zwischenablage legt:

- `navigator.userAgent`, `hardwareConcurrency`, `deviceMemory`
- `ctx.sampleRate`, `baseLatency`, `outputLatency`, Frist je Quantum
- WASM-SIMD, `renderCapacity`, Blob-Worklet — je ja/nein
- `signalsmith-stretch`-Version und SHA-256 des eingebetteten Standes
- je Engine: Worker-Durchsatz, Worklet-Durchsatz (K und p mit ausgeben,
  nicht nur das Produkt), Betriebsart
- die Blindurteile aus dem Hörvergleich
- Zeitstempel

**Das ist der Zweck der ganzen Übung.** Fünf Runden lang war die
Rückmeldung „96–97 %" — eine Zahl ohne Bezug, von der niemand wusste,
welche Engine sie erzeugt hat.

---

## 8. Bedienung auf dem Telefon

- Große Schaltflächen, kein Hover, keine Tastatur vorausgesetzt.
- Alles hinter einem Startknopf — ohne Nutzergeste kein Audio.
- Hell/dunkel nach dem Gerät.
- Fortschritt anzeigen, solange gemessen wird.
- Bildschirm anlassen (`navigator.wakeLock`, wenn vorhanden; sonst
  hinschreiben) — ein dunkler Bildschirm drosselt das Gerät und verfälscht
  jede Messung.
- **Deutsch**, wie die App.

---

## 9. Reihenfolge

1. Durchsatzmessung mit `js-mono` und `wasm` bei 0,6× (Abschnitt 2), lokal
   geprüft (Abschnitt 6), veröffentlicht, Link genannt.
2. Hörvergleich, Paar 1 zuerst — `standard` gegen `wasm` (Abschnitt 3).
3. Der Rest: weitere Tempi, `js-stereo`, Betriebsart (a) gegen (b),
   Formantkorrektur.
4. Rubber Band als Maßstab, falls Zeit bleibt.

Nach jeder Stufe veröffentlichen und den Link nennen. Eine Stufe, die
schon misst, ist mehr wert als drei, die noch nicht fertig sind.

## 10. Was diese Runde nicht tut

- **Die App nicht anfassen.** Kein `index.html`, kein `SW_VERSION`, kein
  `DEFAULT_SETTINGS`. `testlabor/` ist kein App-Code und wird vom Service
  Worker nicht zwischengespeichert.
- **Nichts optimieren.** Kein 50-%-Overlap, keine weitere FFT-Arbeit. Wenn
  der Messplatz sagt, dass WASM die Sache erledigt, wäre jede weitere
  Handoptimierung verschwendet gewesen.
- **Nichts entscheiden.** Der Messplatz liefert Zahlen und Höreindrücke.
  Was daraus folgt — WASM einbauen, HQ löschen, HQ nur bei 0,85×
  anbieten —, entscheidet der Nutzer danach.
