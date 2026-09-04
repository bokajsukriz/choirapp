# Arbeitsanweisung: HD-Signalweg reparieren (Gegencheck zu Codex)

## Kontext

Der Branch `claude/slowplay-wasm-stretch-live` ersetzt den selbst geschriebenen
Phasenvocoder durch `signalsmith-stretch` (WASM). Auf einem Pixel 9 klang nach
zwei Stunden im Hintergrund die Wiedergabe über Bluetooth-Kopfhörer schrecklich —
**und blieb es auch nach Schließen und Wiederöffnen der App**. Codex hat den Code
statisch geprüft und neun Baustellen gemeldet. Diese Anweisung bestätigt,
korrigiert und ergänzt sie und legt die Reihenfolge der Reparatur fest.

### Zwei Dinge vorweg, die Sonnet wissen muss

**1. Arbeitsstand.** Alle Zeilennummern und Aussagen hier beziehen sich auf
**`2185744` (v125)**, den Stand, auf dem dieses Dokument liegt. Beim Erstellen
dieser Anweisung stand die Arbeitskopie zunächst acht Commits zurück auf
`abfa4e9` (v120) — dort gibt es den 1,0×-Bypass noch nicht, und die
Voreinstellungen der Regler sind andere. Also vor dem ersten Handgriff prüfen:

```
git log --oneline -1        # muss 2185744 oder neuer sein
git status --short          # muss leer sein
```

**2. Eine Korrektur an Codex.** Codex nennt den „degradierten AudioContext"
(Befund 1) die beste Erklärung für das Fehlerbild. Das kann nicht stimmen: ein
`AudioContext` stirbt mit der Seite. Ein Fehler, der **einen App-Neustart
überlebt**, muss in etwas Persistentem sitzen. Persistent sind hier genau drei
Dinge: `settings.hdOptions` in IndexedDB, der Shell-Cache des Service Workers,
und der Bluetooth-/Audio-Zustand von Android außerhalb der App.

Der Nutzer hat bestätigt, **mit den Reglern „Blocklänge" und „Schrittweite"
experimentiert zu haben**. Damit ist die wahrscheinlichste Ursache der
persistierte, ungültige Reglerstand (Befund 1 unten) — nicht der Kontext.

---

## Befunde

### Bestätigt und neu priorisiert

| # | Befund | Codex | Bewertung |
|---|---|---|---|
| 1 | Ungültige Block-/Schrittweiten-Geometrie wird persistiert | #5 „mittel" | **hoch — vermutlich die Ursache** |
| 2 | WASM-Zustand wird nach Bypass/Seek/Spurwechsel wiederverwendet | #2 | bestätigt, mittel-hoch |
| 3 | HD wird vor bestätigter Konfiguration verbunden | #3 | bestätigt, mittel |
| 4 | Degradierter Kontext wird nie repariert | #1 „hoch" | bestätigt als **Lücke**, aber nicht als Ursache dieses Vorfalls |
| 5 | Hängende Init-Promise sperrt HD bis zum Reload | #6 | bestätigt, mittel |
| 6 | SW-Update kann die Offline-WASM-Datei verlieren | #7 | bestätigt, mittel |
| 7 | `resume()` und Playerzustand nicht atomar | #4 | bestätigt, niedrig-mittel |
| 8 | Worklet-Ressourcen und RPCs werden nicht bereinigt | #9 | bestätigt und verschärft |
| 9 | Freier `configure()`-Aufruf im Kanalzahl-Zweig | #8 | bestätigt, aber **nicht erreichbar** |

### Befund 1 — ungültige Geometrie, persistiert (die wahrscheinliche Ursache)

`sanitizeHdOptions()` (index.html:7745 ff.) klemmt beide Werte **unabhängig**:

```js
blockMs:    num(o.blockMs,    0, 250, d.blockMs),
intervalMs: num(o.intervalMs, 0, 120, d.intervalMs),
```

Die Regler im HTML (index.html:3500/3505) erlauben `blockMs` 0–250 (Schritt 10)
und `intervalMs` 0–120 (Schritt 5). **`blockMs: 10` mit `intervalMs: 120` ist
also durch bloßes Ziehen erreichbar.** In der Bibliothek
(signalsmith-stretch.js:202 ff.) landet das direkt in

```js
this.wasmModule._configure(this.channels, blockSamples, intervalSamples, splitComputation);
```

Eine Schrittweite, die zwölfmal so groß ist wie der Analyseblock, hat keine
Überlappung mehr — das Overlap-Add fällt in sich zusammen. Genau das klingt
„schrecklich". `updateHdOption()` (7841) schreibt den Wert über `saveSettings()`
nach IndexedDB, und `sanitizeHdOptions()` beim Laden (5760) lässt ihn durch, weil
es die Invariante nicht kennt. **Der Zustand überlebt jeden Neustart** — exakt
das gemeldete Verhalten.

Zu beachten: der bestehende Selbsttest (index.html:16837 ff.) **schreibt die
unabhängige Klemmung fest** (`blockMs: 9999 → 250`, `intervalMs: -7 → 0`). Er muss
mitgeändert werden, sonst schlägt er nach der Reparatur fehl.

### Befund 2 — kein Reset des Zeitdehners

`applySlowMode()` (8696) klemmt den Knoten bei Standard und **seit `c431683`
auch bei 1,0×** nur ab (`hdEngaged()`, 8692). `audioSeek()` (8652) und der
Spurwechsel fassen den Knoten gar nicht an. Beim Wiedereinhängen liefert die
Bibliothek erst einmal den Überlappungspuffer von vorher aus — bei der
Voreinstellung rund 150 ms alter Ton, bei jedem Sprung und jedem Weg über 1,0×.

Wichtig für die Umsetzung: **die Bibliothek hat keine `reset`-Methode.** Die
Fernmethoden sind `configure, latency, setUpdateInterval, stop, start, schedule,
dropBuffers, addBuffers`. `dropBuffers` räumt nur die über `addBuffers`
eingeplanten Puffer ab, nicht den Zustand des Streckers. Ein `_reset()` läuft
heute ausschließlich als Nebenwirkung von `configure()` im Zweig mit gesetztem
`blockMs` (signalsmith-stretch.js:208) — teuer und hörbar. Es braucht also einen
kleinen Vendor-Patch (siehe Stufe 2).

### Befund 3 — Reihenfolge beim Tempowechsel

`audioSetRate()` (8802) ruft `applySlowMode()` (hängt den Knoten **hörbar** ein)
und erst danach `applyRateToElement()` (setzt `preservesPitch = false`
synchron, schickt `schedule({semitones})` asynchron ins Worklet). Zwischen
Einhängen und Ankommen der Nachricht läuft der Knoten mit den alten Halbtönen
— beim Weg 1,0× → 0,7× also kurz ungetransponiert und zu tief. Bestätigt.

### Befund 4 — keine Wiederherstellung eines kaputten Graphen

`Audio.ctx` wird genau einmal angelegt (8423) und **nie geschlossen oder neu
aufgebaut**; es gibt im ganzen Player keinen `close()`-Aufruf. Die
Aussetzer-Erkennung (`audio:stall`, 8372) und die Echtzeitmessung
(`tickHdRealtime`, 7861) **protokollieren nur**. Bleibt der Kontext auf
`running`, während der Renderpfad steht, passiert nichts. Das ist eine echte
Lücke — sie erklärt nur diesen Vorfall nicht, weil sie einen Neustart nicht
überleben kann.

### Befund 5 — hängende Initialisierung

`ensureHdNode()` (8281) setzt `hdNodePromise = null` ausschließlich **im
`.then()`**. Kommt die `ready`-Nachricht des Worklets nie
(signalsmith-stretch.js:425 — ein `new Promise(resolve => …)` ganz ohne
`reject` und ohne Timeout), bleibt die Promise für immer offen und der
Wächter `if (… || hdNodePromise || …) return` sperrt HD bis zum Neuladen.
Ein `processorerror`-Handler existiert nirgends.

### Befund 6 — Service Worker kann den Offline-Stand verlieren

`install` (sw.js:29) fängt jeden einzelnen `cache.add()`-Fehler ab und gilt
trotzdem als erfolgreich; `activate` (sw.js:49) löscht danach **alle** älteren
`chor-app-shell-*`. Fehlt im neuen Cache ausgerechnet `signalsmith-stretch.js`,
ist der vorher funktionierende Offline-Stand weg. Zusätzlich bedient der
`fetch`-Handler Navigationen **cache-first ohne Revalidierung** (sw.js:83) —
ein einmal eingefrorener Shell-Stand bleibt, bis der Nutzer den Banner drückt.
Das ist auch der Grund, warum die Frage „welcher Build lief eigentlich?"
überhaupt nötig war.

### Befund 8 — Ressourcen (verschärft gegenüber Codex)

In `signalsmith-stretch.js:390` steht

```js
let moduleUrl = createNode.moduleUrl;
if (!moduleUrl) { … moduleUrl = URL.createObjectURL(new Blob([moduleCode] …)); }
```

`createNode.moduleUrl` wird gelesen, aber **nirgends je zugewiesen**. Der Cache
greift also nie: jeder neue `AudioContext` erzeugt eine neue Blob-URL, und
`moduleCode` enthält den kompletten Emscripten-Module-Quelltext **samt WASM als
`data:`-URI**. Widerrufen wird sie nie. Heute fällt das nicht auf, weil es genau
einen Kontext gibt — sobald Stufe 3 den Kontext neu aufbauen kann, wird daraus
ein Leck von jeweils gut hundert Kilobyte. `requestMap` (401) hat weder Timeout
noch Abbruchpfad.

### Befund 9 — bestätigt, aber nicht erreichbar

`signalsmith-stretch.js:259` ruft im Kanalzahl-Zweig `configure()` statt
`this.configure()`. Das wäre ein `ReferenceError` mitten in `process()`. Der
Zweig ist aber toter Code: der Knoten wird mit `outputChannelCount: [2]` angelegt
(index.html:8260), `this.channels` daraus auf 2 gesetzt (Bibliothek:175), und
`outputList[0].length` ist damit fest 2. **Der Vergleich in Zeile 257 kann nicht
wahr werden.** Trotzdem im selben Zug mitkorrigieren, weil Stufe 2 die Datei
ohnehin anfasst — aber nicht als Fehlerursache verkaufen.

### Was ich nicht bestätigen kann

- **Der Zeitdehner als Ursache bei 1,0×.** Auf v125 ist er bei 1,0× vollständig
  ausgehängt (`hdEngaged()` verlangt `Audio.rate !== 1`) und `preservesPitch`
  steht auf `true`. Der Signalweg ist dann **Byte für Byte der von Standard**.
  Wenn es bei 1,0× schlecht klang, kann es nicht am HD-Code liegen.
- **Bluetooth-Profilwechsel (A2DP → HFP/SCO).** `startLevelMeter()` (12187)
  hängt den Mikrofon-Stream bewusst an den **Wiedergabe**-Kontext. Auf Android
  ist das der klassische Auslöser dafür, dass Bluetooth ins Telefonieprofil
  kippt. Die Mikrofonspuren werden aber in allen Pfaden sauber gestoppt
  (12059, 12075, 12350), und ein solcher Zustand überlebt einen App-Neustart
  auch nicht. Geringe Wahrscheinlichkeit — der Test in Stufe 0 klärt es
  nebenbei mit.

---

## Umsetzung

### Stufe 0 — die eine Messung, die noch fehlt (vor allem anderen)

Der Nutzer hat nicht geprüft, ob zum Fehlerzeitpunkt **auch andere Apps** auf
denselben Kopfhörern schlecht klangen. Das trennt App-Fehler von Android-/BT-
Zustand. Bitte im Player-Bildschirm nichts dafür bauen — es genügt, das in der
PR-Beschreibung als offene Frage zu notieren und die Reparaturen unabhängig
davon durchzuziehen. Sie sind alle für sich richtig.

### Stufe 1 — was den Ton kaputt macht

**1a. Gemeinsame Invariante für Blocklänge und Schrittweite.**
In `sanitizeHdOptions()` (7745) nach der Einzelklemmung ergänzen: eine von null
verschiedene `intervalMs` wird auf höchstens `blockMs / 2` begrenzt (die
Bibliothek selbst rechnet ohne eigenen Wert mit `blockMs * 0.25`; die Hälfte ist
die großzügigste noch sinnvolle Überlappung). Ist `blockMs === 0`
(Preset-Betriebsart), muss `intervalMs` auf 0 fallen — die Bibliothek ignoriert
es dort ohnehin, und ein stehengebliebener Wert wird beim nächsten Setzen von
`blockMs` schlagartig wirksam.

Weil `sanitizeHdOptions()` schon beim Laden über die gespeicherten Werte läuft
(5760), **heilt das den kaputten Zustand auf dem Gerät des Nutzers von selbst,
ohne Migrationscode.** Das ist das Wichtigste an dieser Stufe.

Der korrigierte Wert muss sofort am Regler sichtbar werden: der `input`-Handler
(7938) schreibt bereits `input.value = preview[key]` zurück, das trägt. Für den
Weg über `change` → `updateHdOption()` muss `renderHdOptions()` zusätzlich den
**Schrittweiten-Regler** nachziehen, wenn die Blocklänge ihn beschnitten hat.

**1b. Selbsttests.** Den bestehenden Klemm-Test (16837) an die neue Invariante
anpassen und ergänzen: `{blockMs: 10, intervalMs: 120}` → `intervalMs ≤ 5`;
`{blockMs: 0, intervalMs: 120}` → `intervalMs === 0`; die Voreinstellung bleibt
unverändert gültig.

### Stufe 2 — Zustand und Reihenfolge

**2a. Vendor-Patch an `signalsmith-stretch.js`** (beides in einem Commit, oben in
der Datei als lokale Abweichung kommentieren, damit ein Update es nicht
verschluckt — `THIRD-PARTY.md` entsprechend ergänzen):
- `remoteMethods` um `reset: () => { this.wasmModule._reset(); }` erweitern.
- Zeile 259: `configure()` → `this.configure()`.
- Zeile 390 ff.: `createNode.moduleUrl = moduleUrl;` nach dem Erzeugen setzen,
  damit der Cache greift.

**2b. Reset an den richtigen Stellen aufrufen.** Eine kleine Hilfsfunktion
`hdReset()` neben `applyHdConfigure()` (8763), die `Audio.hdNode.reset()` mit
`.catch(dlog)` aufruft, und sie einsetzen in: `audioSeek()` (8652), beim
Spurwechsel in `audioLoadTrackNow()`, in `audioReset()`, und in `applySlowMode()`
**unmittelbar bevor** der Knoten wieder eingehängt wird.

**2c. Reihenfolge in `audioSetRate()` (8802) umdrehen.** Erst `schedule()`
schicken und dessen Promise abwarten, dann `preservesPitch` setzen und den
Knoten einhängen. Dafür `applyRateToElement()` so aufteilen, dass die
Verdrahtung nach der Bestätigung des Worklets läuft. Eine monoton steigende
Generationszahl (Modulvariable, bei jedem Tempowechsel hochzählen) verwirft
verspätete Antworten schneller Umschaltungen — sonst hängt ein langsamer
Round-Trip den Knoten nach einem inzwischen erfolgten Wechsel doch noch ein.

**2d. Init absichern** (`ensureHdNode`, 8281): `hdNodePromise` in `finally`
löschen statt im `then`, und `hdCreateNode()` (8248) ein Timeout von etwa
10 Sekunden um das `await SignalsmithStretch(...)` legen. Läuft es ab, `null`
liefern (die App spielt dann nativ weiter, der Pfad existiert schon) und den
verspätet doch noch fertigen Knoten trennen. `hdUnavailable` sollte ein
**Zähler mit Obergrenze** werden statt eines endgültigen Riegels, damit ein
einmaliger Fehlschlag HD nicht bis zum Neuladen sperrt.

### Stufe 3 — Wiederherstellung nach langem Hintergrund

Ein `rebuildAudioGraph()` neben `audioInit()` (8410), das `Audio.ctx` schließt
und Kontext, Matrix, `MediaElementAudioSourceNode` und HD-Knoten neu aufbaut.
Quelle, Position, Tempo, Loop und Wiedergabeabsicht müssen erhalten bleiben.

**Achtung, das ist die heikelste Stelle:** `createMediaElementSource()` darf pro
Element nur einmal laufen (siehe den Kommentar an `Audio.elSource`, 8296). Ein
neuer Kontext braucht deshalb zwingend **auch ein neues `<audio>`-Element** —
mitsamt allen Listenern aus `audioInit()` und der Media Session. Das ist der
Grund, diese Stufe zuletzt und in einem eigenen Commit zu machen.

Auslösen mit Hysterese, nicht beim ersten Messwert: die Hintergrunddauer über
`visibilitychange` mitschreiben, und nach der Rückkehr nur dann neu aufbauen,
wenn `tickHdRealtime()` (7861) **drei aufeinanderfolgende** Sekunden unter etwa
80 % meldet oder `audio:stall` erneut anschlägt. Höchstens zwei automatische
Versuche pro Sitzung, jeder mit `dlog('audio:rebuild', …)`.

### Stufe 4 — Service Worker und Aufräumen

- `sw.js`: `SHELL` in Pflicht- und Kürteil trennen. `install` scheitert, wenn ein
  Pflichtteil fehlt (`index.html`, `./`, `signalsmith-stretch.js`,
  `groove-lab.js`); `activate` löscht alte Caches **erst nach** einer Prüfung,
  dass der neue Cache alle Pflichtdateien enthält. `SW_VERSION` erhöhen.
- `requestMap` in der Bibliothek: bei `processorerror` und bei Nachrichtenfehlern
  alle offenen Promises ablehnen und den Eintrag entfernen.
- Ein `hdTeardown()`, das `port.close()` aufruft, den Knoten trennt und
  `Audio.hdNode` nullt — von Stufe 3 aus benutzt.
- `audioPlay()` (8605): nach `el.play()` das `ctx.resume()` **abwarten** und den
  `running`-Zustand prüfen, bevor `Audio.playing = true` und die Media Session
  gesetzt werden; schlägt es fehl, das Element wieder pausieren. Das schließt
  die Lücke, in der ein frühes `statechange` wegen `Audio.playing === false`
  verworfen wird (`onAudioContextStateChange`, 8455).

---

## Prüfung

Nach jeder Stufe mit dem vorinstallierten Chromium über Playwright
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, kein `playwright install`), so wie
es die bisherigen Runden gemacht haben:

1. **Alle Selbsttests grün**, Konsole ohne Fehler außer dem gewollten
   `[notiz] Error: Testfehler` aus `runAsyncSelfTests()`.
2. **Stufe 1 gezielt:** `hdOptions` mit `{blockMs: 10, intervalMs: 120}` in
   IndexedDB ablegen, neu laden, prüfen dass `settings.hdOptions.intervalMs`
   geheilt ist und der Regler den korrigierten Wert zeigt.
3. **Stufe 2:** HD an, 0,7×, dann 1,0×, dann zurück auf 0,7× — im Log muss
   zwischen Aushängen und Wiedereinhängen ein `hd:reset` stehen. Seek vorwärts
   und rückwärts während der Wiedergabe, Spurwechsel bei aktivem HD, und
   zwanzig schnelle Tempowechsel hintereinander ohne verspätete Umschaltung.
4. **Stufe 3:** Kontext künstlich degradieren (`Audio.ctx.suspend()` aus der
   Konsole, Sichtbarkeit umschalten) und prüfen, dass höchstens zwei
   Neuaufbauten laufen, die Position erhalten bleibt und der Ton zurückkommt.
5. **Stufe 4:** einen `cache.add()`-Fehlschlag simulieren und prüfen, dass der
   alte Shell-Cache stehen bleibt.
6. **Auf dem Pixel 9**, mit eingeschaltetem Diagnose-Log: der
   Reproduktionslauf aus Codex' Übergabe (HD bei 0,7×, mehrere Stunden
   Hintergrund, Rückkehr, 1,0×, Standard, Seek, Spurwechsel, App-Neustart),
   und dabei die Frage aus Stufe 0 mitbeantworten.

Stufen 1 und 2 gehören in je einen eigenen Commit, Stufe 3 ebenfalls — sie ist
die einzige, die im Zweifel wieder herausfallen kann, ohne die anderen
mitzureißen.
