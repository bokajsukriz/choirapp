# AP-E — Audio-Lebenszyklus: Transitionstabelle und Entscheidung

Bearbeitet gemäß `ARCHITEKTUR-PLAN.md` AP-E. Der Plan verlangt zwei Schritte
in dieser Reihenfolge: erst die Invarianten aus AP-B als Transitionstabelle
aufschreiben, **danach** entscheiden, ob ein Statechart das Modell wirklich
vereinfacht oder nur die vorhandenen Flags umbenennt. Dieses Dokument ist
genau das — keine Codeänderung. Stand: `40dfe74` (nach AP-D-3), inklusive der
zwei Variablen (`audioGraphSuspect`, `hdWiredSrc`/`hdWiredTo`), die der
parallel gemergte HD-Knacken-Fix seit dem Schreiben von `ARCHITEKTUR-PLAN.md`
hinzugefügt hat.

## Transitionstabelle

### `hdTransitionGeneration` — Abbruch-/Versions-Token für überholte RPCs

- **Domäne:** monoton steigender Zähler, beginnt bei 0.
- **Auslöser der Erhöhung:** jeder Aufruf von `hdApplyTransition(reason, opts)`
  erhöht ihn als allererste Anweisung (`const generation = ++hdTransitionGeneration`).
- **Gelesen von:** `hdApplyTransition()` selbst (drei Stellen, nach jeder
  `await`-Grenze: nach `hdReset()`, nach `configure()`, nach `schedule()`) und
  von `hdReset()` intern.
- **Invariante:** ein Aufruf, dessen mitgeführte `generation` beim Fortsetzen
  nach einem `await` nicht mehr mit dem aktuellen `hdTransitionGeneration`
  übereinstimmt, bricht sofort ab und verbindet nichts mehr — ein späterer
  Aufruf hat den Zustand längst neu gesetzt. Durch AP-B Test 3 (schedule()-
  basiertes Rennen zweier Übergänge) mutationsgeprüft: der ältere Übergang
  überschreibt den neueren nicht.
- **Bewusst kein Reset:** wächst über die ganze Sitzung, auch über
  `rebuildAudioGraph()` hinweg — ein Reset auf 0 würde einer alten, aber
  numerisch wieder passenden Generation erlauben, sich als aktuell
  auszugeben.

### `hdNodePromise` — serialisiert Knotenerzeugung, an Kontext-Identität gebunden

- **Domäne:** `null` | eine laufende Promise (Erzeugung im Gang).
- **Auslöser `null → Promise`:** `ensureHdNode()`, nur wenn `Audio.hdNode`
  fehlt, kein Aufbau bereits läuft, `hdInitBlocked()` falsch ist und
  `Audio.ctx` existiert.
- **Auslöser `Promise → null`:** das `.finally()` der Erzeugungskette in
  `ensureHdNode()`, unabhängig von Erfolg oder Misserfolg.
- **Nebenwirkung beim Abschluss:** prüft, ob der ursprünglich angeforderte
  Kontext (`ctx`, als Closure-Variable festgehalten) noch `Audio.ctx`
  entspricht — falls nicht (zwischenzeitlicher `rebuildAudioGraph()`), wird
  ein fertig gewordener Knoten sofort über `hdTeardown()` wieder verworfen,
  nie `Audio.hdNode` zugewiesen. Durch AP-B Test 4 mutationsgeprüft.
- **Invariante:** nie zwei gleichzeitige Erzeugungsversuche für denselben
  Kontext — der Türsteher-Charakter des frühen `hdNodePromise`-Checks in
  `ensureHdNode()` verhindert das.

### `audioRebuildInFlight` — serialisiert den Graph-Neuaufbau

- **Domäne:** `null` | eine laufende Promise.
- **Auslöser `null → Promise`:** `rebuildAudioGraph(reason)`, sobald der
  REC-Riegel (`recStarting`/`recMediaRecorder`) passiert ist.
- **Auslöser `Promise → null`:** das `finally` in `rebuildAudioGraph()` selbst,
  nach Abschluss (Erfolg oder Fehler) des eigentlichen Neuaufbaus.
- **Verhalten bei gleichzeitigem Aufruf:** ein zweiter Aufruf, während einer
  bereits läuft, hängt sich an dieselbe Promise und liefert `true`, ohne
  selbst etwas anzustoßen. Durch AP-B Test 6 mutationsgeprüft.
- **Invariante:** immer höchstens ein tatsächlicher Neuaufbau gleichzeitig,
  unabhängig davon, wie viele Aufrufer (manueller Knopf, Stufe-4b-Automatik,
  Stufe-4c-Hebel, `repairSuspectAudioGraph()`) gleichzeitig eintreffen.

### `recStarting` / `recMediaRecorder` — Recorder-Domäne

- **`recStarting`-Domäne:** `bool`, beginnt `false`.
- **Auslöser `false → true`:** Anfang von `startRecording()`, direkt nach dem
  frühen Rückkehrpfad (offener Song im Player-Kontext nötig, keine bereits
  laufende Anfrage).
- **Auslöser `true → false`:** jeder Rückkehrpfad von `startRecording()` danach
  — `getUserMedia()` schlägt fehl, `new MediaRecorder()` wirft, oder der
  Recorder steht tatsächlich bereit. Deckt genau das Fenster ab, in dem die
  Aufnahme angefordert, aber `recMediaRecorder` noch nicht zugewiesen ist
  (zwei `await`-Punkte: `getUserMedia`, `preferWideBandMic`).
- **`recMediaRecorder`-Domäne:** `null` | ein `MediaRecorder` mit eigenem
  nativen Zustand (`'inactive'` | `'recording'` | `'paused'`).
- **Auslöser `null → MediaRecorder`:** erfolgreicher Abschluss von
  `startRecording()`.
- **Auslöser `MediaRecorder → null`:** `teardownRecording()`, am Ende jeder
  Aufnahme (gespeichert oder verworfen).
- **Invariante (gemeinsam):** `rebuildAudioGraph()` lehnt ab, solange
  `recStarting` wahr ist ODER `recMediaRecorder` existiert und dessen
  `state !== 'inactive'` ist — ein Neuaufbau darf weder mitten in der
  Berechtigungsanfrage noch während einer laufenden Aufnahme den Graphen
  unter dem Recorder wegziehen. Durch den bereits vor AP-B bestehenden
  Selbsttest UND durch AP-A/AP-B (`withRecLock`) mutationsgeprüft.

### `levelCtx` / `levelCtxOwned` — Besitz des Messkontexts

- **`levelCtx`-Domäne:** `null` | ein `AudioContext` — entweder der der
  Wiedergabe (`Audio.ctx`, mitgenutzt) oder ein eigens für die Pegelanzeige
  erzeugter.
- **`levelCtxOwned`-Domäne:** `bool`, gilt nur zusammen mit `levelCtx`.
- **Auslöser der Zuweisung:** `startLevelMeter(stream)` — `levelCtxOwned` wird
  auf `!Audio.ctx` gesetzt, **bevor** `levelCtx` selbst zugewiesen wird (die
  Reihenfolge ist wichtig, siehe Kommentar dort): mitnutzen, wenn die
  Wiedergabe schon einen Kontext hat, sonst einen eigenen anlegen.
- **Auslöser des Rücksetzens:** `stopLevelMeter()` — schließt `levelCtx` **nur**,
  wenn `levelCtxOwned` wahr ist, setzt in jedem Fall beide auf
  `null`/`false` zurück.
- **Invariante:** der Wiedergabe-Kontext wird durch die Pegelanzeige nie
  geschlossen — sonst bricht der Ton für den Rest der Sitzung ab, sobald
  eine Aufnahme endet, während noch etwas spielt. Durch AP-B Test 8
  (beide Fälle, `owned`/nicht `owned`) mutationsgeprüft.

### `audioReturnedFromBackgroundAt` — zeitliches Fenster nach Rückkehr

- **Domäne:** `0` (kein aktives Fenster) | ein `performance.now()`-Zeitstempel.
- **Auslöser `0 → Zeitstempel`:** `visibilitychange` zu sichtbar, wenn die
  vorige Hintergrundzeit zwischen `AUDIO_BACKGROUND_WATCH_MIN_MS` (3 s) und
  `AUDIO_LONG_BACKGROUND_MS` (30 min) lag — kürzere Wechsel sind normal
  (Bildschirm kurz aus), längere lösen stattdessen sofort einen Neuaufbau aus
  (siehe unten) und brauchen kein Beobachtungsfenster mehr.
- **Auslöser `Zeitstempel → 0`:** entweder `hdMaybeAutoRebuild()` beim
  tatsächlichen Auslösen (das Fenster ist verbraucht, derselbe Vorfall soll
  nicht doppelt zählen) oder implizit durch Zeitablauf — `hdAutoRebuildWatchActive()`
  behandelt ein Fenster älter als `AUDIO_REBUILD_WATCH_MS` (60 s) als
  inaktiv, ohne den Wert selbst zurückzusetzen.
- **Invariante:** der automatische Neuaufbau (Stufe 4b) darf nur innerhalb
  dieses Fensters auslösen — ein Health-Monitor-Befund weit nach einer
  Rückkehr aus dem Hintergrund gilt als gewöhnliche Last, nicht als Folge
  des Hintergrundwechsels.

### `audioGraphSuspect` — Verdacht auf einen beschädigten Element-Pfad (neu, HD-Knacken-Fix)

- **Domäne:** `null` (kein Verdacht) | ein Freitext-Grund (z. B.
  `'hd-bypass-rate'`).
- **Auslöser `null → Grund`:** `markAudioGraphSuspect(reason)`, aufgerufen aus
  `hdApplyTransition()`, wenn `hdSuspectOnBypass(wasEngaged, visibility)`
  wahr ist — also wenn der Zeitdehner beim Verlassen von HD tatsächlich
  hörbar im Weg hing UND das im Hintergrund geschah. `markAudioGraphSuspect`
  ist idempotent (`if (audioGraphSuspect) return;`) — der zuerst notierte
  Grund bleibt stehen.
- **Auslöser `Grund → null`:** ausschließlich `rebuildAudioGraph()`, als Teil
  des Zurücksetzens auf einen frischen Zustand (zusammen mit `hdWiredSrc`/
  `hdWiredTo`) — ein neuer Element-Pfad kann den alten Verdacht nicht mehr
  betreffen.
- **Konsument:** `repairSuspectAudioGraph(reason)` — baut nur dann neu auf,
  wenn ein Verdacht vorliegt UND die Seite sichtbar ist UND `Audio.ready`
  gilt. Verbraucht den Verdacht nicht selbst (das erledigt erst der
  tatsächliche `rebuildAudioGraph()`-Aufruf, den es anstößt).
- **Invariante:** nie ein Neuaufbau im Hintergrund allein wegen dieses
  Flags — ein frisches `<audio>`-Element und ein frischer `AudioContext`
  dürfen ohne Nutzergeste nicht selbstständig anlaufen.

### `hdWiredSrc` / `hdWiredTo` — zuletzt hergestellte Verdrahtung (neu, HD-Knacken-Fix)

- **Domäne:** je `null` | eine Knoten-Referenz (`Audio.elSource` als
  `hdWiredSrc`; `Audio.hdNode` oder `Audio.channelIn` als `hdWiredTo`).
- **Auslöser der Zuweisung:** `hdWireSource(src, dest)`, aus beiden Aufrufstellen
  in `hdApplyTransition()` (Schritt 2 „übergangsweise sicher“ und Schritt 7
  „hörbar verbinden“) — setzt beide zusammen, immer im selben Aufruf.
- **Kurzschluss bei unveränderter Verdrahtung:** `hdWireSource()` prüft zuerst
  `hdWiredSrc === src && hdWiredTo === dest` und kehrt dann zurück, **ohne**
  `disconnect()`/`connect()` erneut aufzurufen — das ist der eigentliche
  Zweck dieser beiden Variablen: ein `disconnect()` auf einer laufenden
  Quelle ist als Knacken hörbar, und war vor dem HD-Knacken-Fix bei jedem
  `audioSeek()`/Loop-Rücksprung im Standard-Modus unnötig.
  Durch den bestehenden Selbsttest „Verdrahtung“ (`selftest-wire-first`/
  `selftest-wire-again`) mutationsgeprüft.
- **Auslöser des Rücksetzens:** `rebuildAudioGraph()`, zusammen mit
  `audioGraphSuspect` — ein neues `Audio.elSource` kann nie mit der alten
  Verdrahtung identisch sein, das Zurücksetzen ist also nur zur Klarheit
  da, nicht zur Korrektheit (Objekt-Identität würde ohnehin nie zufällig
  übereinstimmen).
- **Invariante:** `hdWiredTo` zeigt nach jedem abgeschlossenen
  `hdApplyTransition()`-Lauf exakt auf das Ziel, das Schritt 7 zuletzt
  gesetzt hat — nie auf ein Zwischenergebnis aus Schritt 2.

## Entscheidung: kein einzelnes Zustands-Enum

Die acht Variablen oben sind keine Ausprägungen *eines* Zustands, sondern
fünf strukturell verschiedene Muster:

1. **Monotoner Versions-Zähler** (`hdTransitionGeneration`) — dient dem
   Erkennen von „überholt“, hat selbst keine sinnvolle Aufzählung von Werten.
2. **Serialisierungs-Sperren, `null`/Promise** (`hdNodePromise`,
   `audioRebuildInFlight`) — ihr einziger relevanter Zustand ist „läuft
   gerade“ oder nicht; das Ergebnis der Promise ist irrelevant für die
   Sperre selbst.
3. **Besitz-/Eigentümer-Flags neben einer Ressourcen-Referenz**
   (`levelCtx`/`levelCtxOwned`) — die Frage ist nicht „welcher Zustand“,
   sondern „wessen Ressource ist das gerade“.
4. **Zeitfenster** (`audioReturnedFromBackgroundAt`) — ein Zeitstempel plus
   eine Vergleichsfunktion, kein diskreter Zustand.
5. **Memoisierte letzte Konfiguration** (`hdWiredSrc`/`hdWiredTo`) und
   **ein Freitext-Verdacht mit Herkunft** (`audioGraphSuspect`) — beide sind
   Caches/Anmerkungen, keine Zustände, die Übergänge auslösen.

Dazu kommt `recMediaRecorder`, das bereits **seinen eigenen** nativen
Drei-Zustands-Automaten mitbringt (`MediaRecorder.state`), begleitet von
einem eigenen Vor-Zustand-Flag (`recStarting`) für das Fenster davor.

Ein einzelnes Enum müsste entweder (a) das Kreuzprodukt all dieser
Achsen abbilden — mit `recMediaRecorder` allein schon 3 Zustände, dazu
zwei binäre Sperren, ein Besitz-Flag, macht mindestens 3 × 2 × 2 × 2 = 24
„Zustände“, von denen die meisten Kombinationen niemals vorkommen und
keine eigene Bedeutung hätten — oder (b) nur eine der Achsen abbilden und
die übrigen weiterhin als separate Flags danebenführen, was schlicht eine
Umbenennung wäre, kein Vereinfachen.

**Entscheidung: kein Statechart.** Die Invarianten und Besitz-Token bleiben,
wie sie sind — das ist hier tatsächlich der kleinere Eingriff, nicht nur die
bequemere Wahl. Die sieben AP-B-Charakterisierungstests (`runAudioPathCharacterizationTests()`
in `app.js`) sowie die zwei zusätzlichen Selbsttests aus dem HD-Knacken-Fix
(Verdrahtungs-Idempotenz, Verdachtsbedingung) decken die oben dokumentierten
Invarianten bereits vollständig ab und bleiben die Regressionssicherung für
dieses Verhalten — nicht ein neu zu bauendes Statechart.
