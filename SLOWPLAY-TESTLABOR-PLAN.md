# Arbeitsanweisung — Testlabor für die Verlangsamung

Adressat: Sonnet. Vorgeschichte in `SLOWPLAY-HQ-HANDOFF.md` — **lies die
zuerst**, sie begründet, warum diese Runde nicht wieder eine Optimierung
ist, sondern ein Messplatz.

Ausgangsstand: `main` bei `2b10c33`, ausgeliefert `SW_VERSION` `v118`.
**Immer über Funktions- und ID-Namen ansteuern, nie über Zeilennummern.**

---

## Ziel

Drei Fragen sind seit fünf Runden offen, und jede einzelne entscheidet,
ob die nächste Runde überhaupt sinnvoll ist:

1. **Ist HQ hörbar besser als Standard?** Nie geprüft. Wenn nein, kann die
   ganze Funktion weg.
2. **Ist der Render-Thread der langsame Ort — oder das Gerät?** Das Worklet
   arbeitet ~5 ms und schläft ~13 ms, immer wieder. Ein Frequenzregler
   sieht darin einen fast untätigen Kern und taktet womöglich nie hoch;
   Android legt Audio-Callbacks außerdem gern auf die kleinen Kerne.
   Derselbe Code in einem gewöhnlichen Worker könnte auf derselben
   Hardware deutlich schneller sein. Vermutung, nie geprüft.
3. **Ist WASM deutlich schneller als unser JS?** Und klingt eine
   ausgereifte Bibliothek besser als unser handgeschriebener Vocoder?

Der Messplatz beantwortet alle drei **in einem einzigen Gerätetest** und
liefert das Ergebnis als kopierbaren Text zurück.

## Warum ein Artifact und nicht die App

Der eigentliche Engpass der letzten fünf Runden war nicht die Rechenzeit,
sondern die Rückkopplung: jede Erkenntnis über das Zielgerät kostete einen
App-Release, einen Service-Worker-Cache-Tanz und eine Handmessung des
Nutzers. Ein Artifact ist ein Link aufs Handy: kein Release, kein Cache,
kein Risiko für die laufende App, und eine neue Fassung ist in Minuten
draußen. Wenn es nichts taugt, wird es weggeworfen.

**Die App wird in dieser Runde nicht angefasst.** Kein Commit an
`index.html`, keine `SW_VERSION`-Erhöhung, keine Änderung an
`DEFAULT_SETTINGS`. Erst wenn der Messplatz einen Sieger zeigt, wird der
in die App gebaut — als eigene Runde.

---

## 0. Rahmenbedingungen des Artifact-Hosts

Drei Fallen, die den Entwurf bestimmen:

1. **Kein `fetch`/XHR zu irgendeinem Host.** Auch nicht zu den erlaubten
   CDNs. Alles, was die Seite braucht, muss im HTML stehen.
2. **Externe Skripte nur von den erlaubten CDNs** (cdnjs, jsdelivr/npm,
   cdn.tailwindcss.com, code.jquery.com) — und *nur* Skripte, keine
   Stylesheets, Bilder, Medien oder `.wasm`-Dateien.
3. **16 MB Gesamtgröße.**

Für unseren Fall ist das kein Problem, aber nur wegen eines glücklichen
Umstands, siehe Abschnitt 3.

**Vor allem anderen**: `artifact-design`-Skill laden, bevor die Seite
geschrieben wird.

---

## 1. Stufe 0 — Rauchtest (eigene Veröffentlichung, zuerst)

Bevor irgendetwas gebaut wird, muss geklärt sein, ob die Umgebung das
überhaupt trägt. Eine kleine Seite, die vier Dinge prüft und anzeigt:

1. Lädt ein `AudioWorklet` aus einer **Blob-URL**? (Genau das macht die App
   in `hqCreateNode()`. Verbietet die CSP `blob:` in `script-src`,
   scheitert der ganze Ansatz — und zwar für unseren Vocoder **und** für
   `signalsmith-stretch`, das ebenfalls ein Worklet ist.)
2. Läuft `WebAssembly.instantiate` aus eingebetteten Bytes?
3. Ist **WASM-SIMD** verfügbar? (`WebAssembly.validate` eines winzigen
   Moduls mit einer `v128`-Instruktion.)
4. Gibt es `AudioContext.renderCapacity`? Gibt es `performance.now()` im
   Worklet? (Beides wissen wir zu wissen — gegenprüfen kostet nichts.)

**Diese Seite ist bereits gebaut und veröffentlicht:**
https://claude.ai/code/artifact/bafa6d28-89ad-490f-8be8-effd7d50bbc6

Sie prüft die vier Punkte, zeigt die Gerätedaten (Kerne, Abtastrate,
Latenzen), lädt `signalsmith-stretch` und spielt einen Vierklang bei 1,0×
und 0,6× — und legt alles als kopierbaren Textblock ab. **Frag den Nutzer
nach diesem Block, bevor du auf irgendeiner Annahme weiterbaust.** Der
Quelltext liegt nicht im Repo (er gehört nicht in die App); die
Bibliothek ist dort wörtlich ins HTML eingebettet.

Was der Block entscheidet:

- `AudioWorklet aus Blob-URL: nein` → der Artifact-Weg trägt nicht, und
  zwar für beide Engines. Dann bleibt nur der Einbau in die App.
- `signalsmith-stretch lädt: nein` → Fehlermeldung lesen; womöglich
  scheitert es an derselben CSP-Frage.
- `WASM-SIMD: nein` → der erhoffte Faktor fällt kleiner aus; die Messung
  in Stufe 1 sagt dann, ob es trotzdem reicht.
- `Hörprobe spielt: ja` bei 0,6× ohne Stottern → die entscheidende
  Vorentscheidung ist schon gefallen, bevor der Messplatz überhaupt
  steht.

---

## 2. Stufe 1 — Durchsatz-Messplatz

Beantwortet Frage 2 und den Tempo-Teil von Frage 3. Braucht **keine**
Audiodateien und keine Abhängigkeiten — deshalb zuerst, sie ist auf jeden
Fall baubar.

### 2.1 Die Engines

Die Bausteine kommen **wortgleich** aus `index.html` (zwischen
`function hqPrincipalAngle` und `function hqBuildWorkletSource`), damit
gemessen wird, was ausgeliefert ist:

- `js-stereo` — zwei `HqPitchShifter`, wie `HQ` heute
- `js-mono` — ein `HqPitchShifter`, wie `HQ Mono` heute
- `wasm` — `signalsmith-stretch` (Abschnitt 3)

### 2.2 Die zwei Messungen

**Im Worker — roher Durchsatz, unbegrenzt.** Der Worker schiebt 20 s
Testsignal in 128er-Blöcken durch die Engine, so schnell er kann, und misst
mit `performance.now()`. Ergebnis: **Audiosekunden je Wanduhrsekunde**.
Das ist die Zahl, die die DVFS-Vermutung aus Frage 2 beantwortet.

**Im Worklet — wieviele Echtzeitströme trägt der Render-Thread?**
`performance.now()` gibt es dort nicht, also nicht die Zeit messen, sondern
die Last hochdrehen: die Engine verarbeitet **K parallele Ströme** je
Quantum, K beginnt bei 1 und steigt alle 3 s um 1. Auf der Hauptseite
läuft dabei die Echtzeitmessung (`ctx.currentTime` gegen
`performance.now()`, beide im selben Tick gelesen). Das größte K, bei dem
sie ≥ 99 % bleibt, ist **K_max** — die Zahl der Echtzeitströme, die dieser
Render-Thread für diese Engine schafft. Die App braucht K_max ≥ 1; ab 2
ist es bequem.

Für diese Messung das Frame-Budget aus Runde 3 **abschalten** (jeder
Shifter rechnet frei) — gemessen wird der rohe Durchsatz, nicht die
ausgelieferte Ablaufplanung.

Interessant ist der Vergleich: sagt der Worker 3,0× und das Worklet
K_max = 1, ist bewiesen, dass der Render-Thread der langsame Ort ist — und
dann ist die Antwort nicht weiter zu optimieren, sondern die Rechnung
umzuziehen (Handoff §8 F/G).

Je Engine × Tempo (0,85× / 0,7× / 0,6×) beide Zahlen erheben.

---

## 3. Stufe 2 — `signalsmith-stretch` einbauen

### 3.1 Was geprüft ist

`signalsmith-stretch@1.3.2`, **MIT**. Eine einzige selbstgenügsame
JS-Datei (113 KB, UMD `.js` und ESM `.mjs`), und — das ist der glückliche
Umstand aus Abschnitt 0 — **das WASM (~64 KB) steckt als
`data:application/octet-stream;base64,`-URI in dieser Datei.**
`findWasmBinary()` liefert die Daten-URI direkt zurück; das `fetch` in der
Datei ist der Emscripten-Standardpfad für den Fall, dass die Binärdatei
*keine* Daten-URI ist, und wird hier nicht betreten.

Folge: **kein Netzzugriff nötig.** Die Datei lässt sich wörtlich ins
Artifact-HTML einbetten und würde später auch in der PWA offline
funktionieren. Trotzdem zur Laufzeit gegenprüfen (Emscripten-Bauarten
unterscheiden sich) — im Rauchtest sichtbar machen, ob das Modul ohne Netz
hochkommt.

Bezugsquelle: `https://registry.npmjs.org/signalsmith-stretch` →
`dist.tarball`, darin `package/SignalsmithStretch.js`. Version und
SHA-256 notieren.

### 3.2 Die Schnittstelle

```js
const stretch = await SignalsmithStretch(ctx);   // ein AudioNode
stretch.schedule({ rate: 0.6, semitones: 0, formantCompensation: true });
stretch.start();
```

Zwei Betriebsarten, und **beide gehören in den Messplatz**, weil sie für
die App etwas ganz Verschiedenes bedeuten:

**(a) Live-Eingang.** Der Knoten hängt wie unser `hqNode` hinter der
`MediaElementSource`. Das Element resampled weiter
(`preservesPitch = false`), der Knoten schiebt die Tonhöhe zurück:
`semitones = 12·log2(1/rate)`. `rate` wird in dieser Betriebsart ignoriert.
Das ist der minimale Eingriff in die App — ein Knoten gegen einen anderen.

**(b) Pufferbetrieb.** `stretch.addBuffers([...])` mit den dekodierten
Kanälen, dann `schedule({ rate: 0.6 })`. Der Knoten dehnt selbst, das
Element wird als Tonquelle gar nicht mehr gebraucht. Das ist der größere
Umbau, aber er ist **in zwei Punkten besser**: kein doppeltes Resampling
mehr (heute resampled erst das Element, dann interpoliert unser
`readOutput()` ein zweites Mal), und `loopStart`/`loopEnd` gibt es
eingebaut — der A-B-Loop wäre sample-genau statt „bestenfalls auf ein paar
hundert Millisekunden", wie der Kommentar am `timeupdate`-Handler heute
einräumt.

Beide Betriebsarten messen, beide hörbar machen.

### 3.3 `formantCompensation` nicht vergessen

Unser Vocoder hat keine Formantkorrektur. Beim Hochschieben von Gesang
klingt das leicht nach Micky Maus; `signalsmith-stretch` kann es
ausgleichen (`formantCompensation: true`, dazu `formantBaseHz` — grob 100
für tiefe, 400 für hohe Stimmen, `0` für Tonhöhenverfolgung). Für einen
Chor ist das womöglich der hörbar größte Unterschied überhaupt. **Als
eigene Schaltfläche im Hörvergleich**, sonst weiß hinterher niemand, woher
der Unterschied kam.

### 3.4 Rubber Band nur als Maßstab

`rubberband-web@0.2.1` ist **GPL-2.0-or-later**. Auf einer öffentlich
gehosteten Seite ist das nicht tragbar, die App kann es nicht ausliefern.
Als *Referenz* im privaten Messplatz ist es aber wertvoll: es gilt als das
beste, was es gibt. Wenn `signalsmith` daneben gleich gut klingt, ist die
Sache entschieden. **Deutlich als „nur Vergleich, nicht auslieferbar"
beschriften.**

---

## 4. Stufe 3 — Hörvergleich

Beantwortet Frage 1, die wichtigste.

- **Quelle:** `<input type="file" accept="audio/*">`. Die Songs liegen in
  der IndexedDB der App, auf einem anderen Ursprung — der Messplatz kommt
  nicht heran. Der Nutzer wählt eine seiner MP3-Dateien vom Telefon.
  Fällt das aus, hilfsweise ein eingebauter synthetischer Akkord; für die
  eigentliche Frage taugt der aber wenig, Chorstimmen sind der Prüfstein.
- **Länge:** die ersten ~20 s reichen und halten die Seite schnell.
- **Kandidaten:** `standard` (natives `preservesPitch`), `raw`
  (`preservesPitch = false`, ohne Korrektur), `js-mono` (unser Vocoder),
  `wasm` (live), `wasm` (Puffer), `wasm` + Formantkorrektur, und falls
  eingebaut `rubberband`.
- **Blind.** Zwei Knöpfe „A" und „B", die Zuordnung wird ausgewürfelt, der
  Nutzer entscheidet, danach wird aufgelöst. Bei dieser Frage hängt zu
  viel davon ab, als dass eine beschriftete Umschaltung genügt — wir haben
  fünf Runden auf einer ungeprüften Annahme gebaut, jetzt soll sie richtig
  geprüft werden.
- **Umschalten ohne Lücke**, an derselben Stelle im Stück, sonst
  vergleicht man Zufälligkeiten.

---

## 5. Die Ergebnisausgabe — der eigentliche Zweck

Am Ende **eine Schaltfläche „Ergebnisse kopieren"**, die alles als einen
Textblock in die Zwischenablage legt, den der Nutzer in den Chat einfügt:

- `navigator.userAgent`, `hardwareConcurrency`, `deviceMemory`
- `ctx.sampleRate`, `baseLatency`, `outputLatency`
- WASM-SIMD ja/nein, `renderCapacity` ja/nein, Blob-Worklet ja/nein
- je Engine × Tempo: Worker-Durchsatz, K_max, Echtzeit-% bei K=1
- die Blindurteile aus dem Hörvergleich
- Zeitstempel

**Das ist der Punkt der ganzen Übung.** Fünf Runden lang war die
Rückmeldung „96–97 %" — eine einzelne Zahl ohne Bezug, von der niemand
wusste, welche Engine sie erzeugt hat. Ein Textblock, den man einfügen
kann, beendet das.

---

## 6. Bedienung auf dem Telefon

Es wird auf einem Handy bedient, nicht am Schreibtisch:

- Große Schaltflächen, kein Hover, keine Tastaturbedienung vorausgesetzt.
- Alles hinter einem „Start"-Knopf — ohne Nutzergeste kein Audio.
- Hell/dunkel nach dem Gerät.
- Messungen laufen mehrere Sekunden: Fortschritt anzeigen, sonst wirkt es
  hängengeblieben.
- Der Bildschirm darf während der Messung nicht ausgehen, sonst
  drosselt das Gerät (`navigator.wakeLock`, wenn vorhanden; sonst dem
  Nutzer sagen, er soll das Display anlassen).
- **Deutsch**, wie die App.

---

## 7. Reihenfolge

1. Rauchtest ansehen bzw. anfordern (Abschnitt 1) — nicht auf Annahmen
   bauen.
2. Durchsatz-Messplatz mit den JS-Engines (Abschnitt 2). Auf jeden Fall
   baubar, beantwortet Frage 2 allein.
3. `signalsmith-stretch` dazu (Abschnitt 3), beide Betriebsarten.
4. Hörvergleich (Abschnitt 4).
5. Ergebnisausgabe (Abschnitt 5) — nicht ans Ende schieben, sie ist der
   Zweck.
6. Rubber Band als Maßstab, falls Zeit bleibt.

Nach jeder Stufe veröffentlichen und den Link nennen. Der Nutzer soll
nicht auf ein fertiges Gesamtwerk warten müssen — eine Stufe, die schon
misst, ist mehr wert als drei, die noch nicht fertig sind.

## 8. Was diese Runde nicht tut

- **Die App nicht anfassen.** Kein `index.html`, kein `SW_VERSION`, kein
  `DEFAULT_SETTINGS`.
- **Nichts optimieren.** Kein 50 %-Overlap, keine weitere FFT-Arbeit. Wenn
  der Messplatz sagt, dass WASM die Sache erledigt, war jede weitere
  Handoptimierung verschwendet.
- **Nichts entscheiden.** Der Messplatz liefert Zahlen und Höreindrücke.
  Was daraus folgt — WASM einbauen, HQ löschen, HQ nur bei 0,85×
  anbieten —, entscheidet der Nutzer danach.
