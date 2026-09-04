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
(Befund 1) die beste Erklärung für das Fehlerbild. Als *vollständige* Erklärung
kann das nicht stimmen: ein `AudioContext` stirbt mit der Seite. Ein Fehler, der
**einen App-Neustart überlebt**, muss in etwas Persistentem sitzen. Persistent
sind hier genau drei Dinge: `settings.hdOptions` in IndexedDB, der Shell-Cache
des Service Workers, und der Bluetooth-/Audio-Zustand von Android außerhalb der
App.

Codex hat im Gegencheck zu Recht eingewandt, dass „App geschlossen und wieder
geöffnet" auf Android **kein bewiesener Prozessneustart** ist: eine PWA aus den
zuletzt verwendeten Apps zu wischen beendet den Renderer meist, aber nicht
garantiert. Der Einwand steht; deshalb bleibt die fehlende Wiederherstellung
(Stufe 3) im Plan. Er verschiebt die Reihenfolge aber nicht, weil die Reparatur
der Geometrie billig, selbstheilend und ohnehin richtig ist.

Der Nutzer hat bestätigt, **mit den Reglern „Blocklänge" und „Schrittweite"
experimentiert zu haben**. Damit ist der persistierte, ungültige Reglerstand
(Befund 1 unten) die wahrscheinlichste **app-persistente Ursache für schlechten
HD-Ton** — nicht der Kontext. Ausdrücklich nicht behauptet ist, dass er den
ganzen Vorfall erklärt; siehe „Was ich nicht bestätigen kann".

**3. Eine unbelegte Prämisse.** Codex' Übergabe führt als Tatsache, die
Wiedergabe habe „auch bei `1,0×` stark abgehackt" geklungen. Der Nutzer hat das
in der Sitzung, aus der dieser Plan stammt, **nicht gesagt** — dort war nur von
„alles klang schrecklich" die Rede. Auf `v125` hängt daran aber viel: bei genau
`1,0×` ist der Zeitdehner ausgehängt und der Signalweg identisch mit Standard,
also kann dort kein HD-Code schuld sein. Bevor jemand daraus Schlüsse zieht,
muss diese eine Angabe bestätigt werden.

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
anpassen und um diese Grenzfälle ergänzen:

```text
{blockMs: 10,  intervalMs: 120} -> intervalMs === 5
{blockMs: 0,   intervalMs: 120} -> intervalMs === 0
{blockMs: 120, intervalMs: 60}  -> intervalMs === 60
{blockMs: 120, intervalMs: 61}  -> intervalMs === 60
{blockMs: 120, intervalMs: 0}   -> intervalMs === 0
```

Die Voreinstellung bleibt unverändert gültig. Zusätzlich in der Oberfläche
prüfen: wird die Blocklänge verkleinert, zeigt der Schrittweiten-Regler sofort
den mitreduzierten Wert; beim Wechsel in die Preset-Betriebsart fällt er
sichtbar auf „automatisch" zurück.

### Stufe 2 — Zustand und Reihenfolge

**2a. Vendor-Patch an `signalsmith-stretch.js`** (beides in einem Commit, oben in
der Datei als lokale Abweichung kommentieren, damit ein Update es nicht
verschluckt — `THIRD-PARTY.md` entsprechend ergänzen):
- `remoteMethods` um ein `reset` erweitern, das `this.wasmModule._reset()`
  aufruft. **Achtung:** `_reset()` ist eine WASM-Funktion und fasst den
  JS-Zustand des Prozessors nicht an — insbesondere nicht `this.timeMap`
  (Zeile 37 ff.), die eingeplanten Segmente. Für den Live-Input-Pfad sollte
  `_reset()` plus ein unmittelbar folgendes, aktuelles `schedule()` genügen,
  weil überholte Segmente über die Ausgabezeit ohnehin herausfallen. Das ist
  eine Annahme — sie muss durch den Regressionstest „`0,7×` → `1,0×` → `0,7×`
  ohne alten Ton" belegt werden, sonst muss `reset` die `timeMap` zusätzlich
  auf das aktuelle Segment eindampfen.
- Zeile 259: `configure()` → `this.configure()`.
- Zeile 390 ff.: `createNode.moduleUrl = moduleUrl;` nach dem Erzeugen setzen,
  damit der Cache greift. Die URL **nicht** nach `addModule()` widerrufen —
  genau dann könnte ein späterer Kontext sie nicht mehr benutzen. Sie lebt
  bewusst so lang wie die Seite; das ist eine Blob-URL für die gesamte
  Sitzung statt einer je Kontext.

**2b. Reset an den richtigen Stellen aufrufen — abgewartet, nicht abgefeuert.**
Eine Hilfsfunktion `hdReset(grund, generation)` neben `applyHdConfigure()`
(8763). Sie muss `await node.reset()` abwarten und danach prüfen, dass Knoten
und Generation noch die aktuellen sind — ein bloß *gestarteter* RPC vor dem
Wiedereinhängen beseitigt das Race nicht, sondern verschiebt es nur:

```js
async function hdReset(reason, generation) {
  const node = Audio.hdNode;
  if (!node?.reset) return false;
  await node.reset();
  if (node !== Audio.hdNode || generation !== hdTransitionGeneration) return false;
  dlog('hd:reset', { reason, generation });
  return true;
}
```

Aufrufstellen sind die echten **Diskontinuitäten**: `audioSeek()` (8652), der
Spurwechsel in `audioLoadTrackNow()`, `audioReset()`, und in `applySlowMode()`
**nur beim Übergang von „nicht eingehängt" zu „eingehängt"**. Nicht bei jedem
Aufruf: `applySlowMode()` läuft auch beim ersten Aufbau und nach der
Knotenerzeugung, ein pauschaler Reset erzeugte dort nur unnötige Aussetzer.

**Der A-B-Loop gehört ausdrücklich dazu.** Der Rücksprung setzt
`el.currentTime` direkt (index.html:8356 im `timeupdate`-Handler) und läuft
**nicht** über `audioSeek()` — ein Reset nur dort würde ihn verfehlen, und
gerade beim Loop fällt alter Ton am meisten auf. Entweder den Loop auf
`audioSeek()` umstellen (sauberer, betrifft aber auch `Audio.position` und
`onPosition`) oder denselben Diskontinuitätspfad explizit aufrufen.

**2c. Eine gemeinsame, geordnete Transition.** Die heutige Reihenfolge
verbindet zuerst und schickt die neuen Halbtöne erst danach ins Worklet. Statt
das nur in `audioSetRate()` (8802) umzudrehen, gehört der ganze Ablauf in **eine**
Funktion, durch die auch der Modusschalter (7898), die Knoteninitialisierung
(8287) und `applyHdConfigure()` laufen:

1. Zielzustand bestimmen, `hdTransitionGeneration` hochzählen.
2. Übergangsweise sicher nativ spielen (`preservesPitch = true`, Knoten aus).
3. Knoten sicherstellen.
4. Bei Diskontinuität `hdReset()` abwarten.
5. Zielkonfiguration per `schedule()` senden und **Bestätigung abwarten**.
6. Prüfen, ob Generation, Knoten und Kontext noch aktuell sind — sonst abbrechen.
7. Erst jetzt `preservesPitch` setzen und den Knoten hörbar verbinden.

**2d. Init absichern** (`ensureHdNode`, 8281): `hdNodePromise` in `finally`
löschen statt im `then`, und `hdCreateNode()` (8248) ein Timeout von etwa
10 Sekunden um das `await SignalsmithStretch(...)` legen.

Ein `Promise.race()` **bricht die Erzeugung nicht ab**. Die ursprüngliche
Promise muss weiter beobachtet werden: liefert sie nach dem Timeout doch noch
einen Knoten, muss der getrennt und sein `port` geschlossen werden (dafür das
`hdTeardown()` aus Stufe 4 vorziehen), sonst läuft ein verwaistes Worklet
weiter. Bis dahin spielt die App nativ — der Pfad existiert schon.

`hdUnavailable` wird ein **Zähler mit Obergrenze** statt eines endgültigen
Riegels: er gilt je Graph-Generation, mit kleiner Wartezeit zwischen den
Versuchen, und wird nach einer erfolgreichen Initialisierung zurückgesetzt.

### Stufe 3 — Service Worker, Ressourcen und Start

Vorgezogen vor den Graph-Neuaufbau: alles hier behebt für sich reale Fehler und
ist risikoarm.

- `sw.js`: `SHELL` in Pflicht- und Kürteil trennen. `install` scheitert, wenn ein
  Pflichtteil fehlt (`index.html`, `./`, `signalsmith-stretch.js`,
  `groove-lab.js`); `activate` löscht alte Caches **erst nach** einer Prüfung,
  dass der neue Cache alle Pflichtdateien enthält. `SW_VERSION` erhöhen.
- `requestMap` in der Bibliothek: je Eintrag `resolve`, `reject` und einen
  Timeout führen. Bei Antwort, Timeout, `processorerror`, `messageerror` oder
  Teardown den Eintrag zuverlässig entfernen; ein endgültig ausgefallener Knoten
  lehnt weitere Aufrufe sofort ab, statt sie hängen zu lassen.
- Ein `hdTeardown()`, das `port.close()` aufruft, den Knoten trennt und
  `Audio.hdNode` nullt — von Stufe 2d und Stufe 4 aus benutzt.
- `audioPlay()` (8605): nach `el.play()` das `ctx.resume()` **abwarten** und den
  `running`-Zustand prüfen, bevor `Audio.playing = true` und die Media Session
  gesetzt werden; schlägt es fehl, das Element wieder pausieren. Parallele
  Start-/Resume-Aufrufe deduplizieren. Das schließt die Lücke, in der ein frühes
  `statechange` wegen `Audio.playing === false` verworfen wird
  (`onAudioContextStateChange`, 8455).

### Stufe 4 — Wiederherstellung nach langem Hintergrund (bedingt)

**Diese Stufe erst endgültig freigeben, wenn nach den Stufen 1–3 entweder der
Pixel-Fehler erneut auftritt oder ein kontrollierter Test einen formal
laufenden, praktisch aber degradierten Graphen nachweist.** Sie ist die einzige,
die im Zweifel wieder herausfallen kann, ohne die anderen mitzureißen.

Zweigeteilt umsetzen, damit der billige Teil sofort Nutzen bringt:

**4a — Health-Monitor (immer bauen).** Die Echtzeitmessung `tickHdRealtime()`
(7861) misst nur Kontextzeit gegen Wanduhr. Das reicht nicht: sie muss mit dem
Fortschritt des Medienelements, den `audio:stall`-Ereignissen (8372) und
fehlgeschlagenen Worklet-RPCs zu **einem** Zustand zusammengeführt und
protokolliert werden. Dazu die Hintergrunddauer über `visibilitychange`
mitschreiben. Allein das liefert die Daten, die über 4b entscheiden.

**4b — `rebuildAudioGraph()`** neben `audioInit()` (8410): schließt `Audio.ctx`
und baut Kontext, Matrix, `MediaElementAudioSourceNode` und HD-Knoten neu auf.
Quelle, Position, Tempo, Loop und Wiedergabeabsicht müssen erhalten bleiben.

**Achtung, das ist die heikelste Stelle:** `createMediaElementSource()` darf pro
Element nur einmal laufen (siehe den Kommentar an `Audio.elSource`, 8296). Ein
neuer Kontext braucht deshalb zwingend **auch ein neues `<audio>`-Element** —
mitsamt allen Listenern aus `audioInit()` und der Media Session.

Auslösen mit Hysterese, nicht beim ersten Messwert: nach der Rückkehr nur dann
neu aufbauen, wenn der Monitor aus 4a **drei aufeinanderfolgende** Sekunden
unter etwa 80 % meldet oder `audio:stall` erneut anschlägt. Höchstens zwei
automatische Versuche pro Sitzung, jeder mit `dlog('audio:rebuild', …)`.

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
3. **Stufe 2:** HD an, 0,7×, dann 1,0×, dann zurück auf 0,7× — im Log muss vor
   jedem tatsächlichen Wiedereinhängen ein **bestätigtes** `hd:reset` stehen,
   und es darf kein alter Ton und keine falsche Transposition zu hören sein.
   Dazu: Seek vorwärts und rückwärts, **A-B-Loop-Rücksprung**, Spurwechsel bei
   aktivem HD, und zwanzig schnelle Tempowechsel hintereinander ohne verspätete
   Umschaltung. Fehlerpfade: Init-Timeout führt zu nativem Fallback mit
   begrenztem Retry, ein verspätet fertiger Knoten wird vollständig entsorgt,
   und `processorerror`/`messageerror`/RPC-Timeout lassen keine offene Promise
   zurück.
4. **Stufe 3:** einen `cache.add()`-Fehlschlag für eine Pflichtdatei simulieren
   und prüfen, dass der unvollständige Stand **nicht** aktiviert wird und der
   letzte vollständige Shell-Cache stehen bleibt. Danach Offline-Start mit
   nachgeladenem HD.
5. **Stufe 4:** `Audio.ctx.suspend()` simuliert nur einen *angehaltenen*
   Kontext, **nicht** den vermuteten Zustand „`running`, aber degradiert" — die
   fünf Fälle deshalb getrennt herstellen: (a) suspendiert, `resume()` klappt;
   (b) suspendiert, `resume()` schlägt fehl; (c) `running`, aber `currentTime`
   läuft zu langsam; (d) Kontext läuft, Medienelement steht; (e) Kontext läuft,
   Worklet antwortet nicht mehr. Prüfen, dass höchstens zwei Neuaufbauten
   laufen, Position, Tempo und Loop erhalten bleiben und der Ton zurückkommt.
6. **Auf dem Pixel 9**, mit eingeschaltetem Diagnose-Log: der
   Reproduktionslauf aus Codex' Übergabe (HD bei 0,7×, mehrere Stunden
   Hintergrund, Rückkehr, 1,0×, Standard, Seek, Spurwechsel, App-Neustart),
   und dabei die Frage aus Stufe 0 mitbeantworten.

## Commit-Schnitt

1. **Geometrie heilen** — Invariante, Reglerabgleich, Selbsttests (Stufe 1).
2. **Vendor- und RPC-Grundlagen** — `reset()`, `this.configure()`, Blob-URL,
   Reject/Timeout, `processorerror`/`messageerror`, `hdTeardown()` (Stufe 2a,
   plus die RPC-Punkte aus Stufe 3, weil sie dieselbe Datei anfassen).
3. **Geordnete HD-Transition** — abgewartete Resets, A-B-Loop,
   Transitionsgeneration, `schedule()` vor dem hörbaren Verbinden (Stufe 2b–2d).
4. **Start und Service Worker** — atomares `audioPlay()`, Pflichtassets,
   `SW_VERSION` erhöhen (Rest von Stufe 3).
5. **Health-Monitor** — 4a allein, ohne Neuaufbau.
6. **Graph-Neuaufbau** — 4b, nur wenn die Daten aus Commit 5 ihn rechtfertigen.

Commits 1 bis 5 beheben unabhängig voneinander reale Fehler und können ohne
weitere Gerätedaten laufen. Commit 6 bleibt bewusst separat und rücknehmbar.

## Offen

- Klang zum Fehlerzeitpunkt auch anderer Ton auf denselben Kopfhörern schlecht?
  (Stufe 0 — trennt App-Fehler von Android-/Bluetooth-Zustand.)
- Klang es wirklich auch bei **exakt `1,0×`** schlecht? Auf `v125` wäre der
  Signalweg dort identisch mit Standard; die Angabe stammt aus Codex' Übergabe
  und ist vom Nutzer bisher nicht bestätigt.
- Wurde die App beim „Schließen" wirklich zwangsbeendet? Beim nächsten Auftreten
  in dieser Reihenfolge testen, um zu sehen, welcher Eingriff zuerst hilft:
  andere Audio-App → Standard und `1,0×` → HD-Regler auf Werk zurücksetzen →
  Bluetooth trennen und neu verbinden → App zwangsbeenden → Gerät neu starten.
