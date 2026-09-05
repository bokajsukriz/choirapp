# Knacken nach dem Rücksprung auf 1,0× — Befund und Reparatur

Stand: `e158c6b`. Anschluss an `SLOWPLAY-HD-FIX-PLAN.md` und
`SLOWPLAY-HD-FIX-PLAN-2.md` — beide bleiben gültig, hier wird nichts
zurückgebaut.

## Meldung

> HD bei 0,6×, Wiedergabe im Hintergrund. Das Tempo springt beim nächsten Lied
> auf 1,0× zurück, und ab da knackt es gelegentlich — auch dann noch, wenn ich
> auf Standard umschalte. Müsste HD nicht umgangen sein?

## Antwort auf die Frage: ja, HD ist umgangen

Der Zeitdehner wird bei 1,0× nicht nur abgeklemmt, sondern **abgebaut**. In
`hdApplyTransition()` liefert `hdEngaged()` bei `Audio.rate === 1` falsch, und
der Zweig darunter ruft `hdTeardown(node)` — Verbindung lösen, `terminate()`
schicken, Port schließen, `Audio.hdNode = null`. Das ist Fehler B aus
`SLOWPLAY-HD-FIX-PLAN-2.md`, seit dem dortigen Commit repariert und durch einen
Selbsttest abgesichert. `openPlayer()` setzt das Tempo beim Liedwechsel über
`audioSetRate(1)` zurück, und genau dieser Aufruf baut den Knoten ab. Ein
Wechsel auf Standard tut dasselbe.

Das Knacken kommt also **nicht** vom weiterrechnenden Zeitdehner.

## Befund: der beschädigte Teil überlebt beides

Was weder der Bypass bei 1,0× noch der Moduswechsel anfassen, ist der Rest des
Signalwegs:

```
<audio> ──► MediaElementAudioSourceNode ──► Kanal-Matrix ──► destination
```

`createMediaElementSource()` darf pro Element **nur einmal** laufen. Element,
Quellknoten und `AudioContext` lassen sich im Betrieb deshalb gar nicht
ersetzen — nur `rebuildAudioGraph()` (oder ein Neuladen der Seite) tauscht sie
aus. Was diesen Pfad einmal aus dem Tritt gebracht hat, bleibt hörbar, egal
welchen Modus und welches Tempo man danach wählt. Genau das beschreibt die
Meldung: „geht auch in Standard nicht weg".

Zwei Dinge kommen zusammen:

1. **Der Health-Monitor sieht davon nichts.** `hdHealthTick()` misst
   `ctx.currentTime` gegen `performance.now()`, also den Renderthread. Der
   läuft weiter rund, während der Element-Pfad Aussetzer liefert. Die
   Automatik aus Stufe 4b (drei Sekunden unter 80 %) schlägt deshalb nie an,
   und das Fenster dafür ist ohnehin auf 60 Sekunden nach der Rückkehr aus dem
   Hintergrund begrenzt.
2. **Der Notausgang ist da, aber unerreichbar für den, der ihn nicht kennt.**
   Der Knopf „Audio neu aufbauen" steht in den Einstellungen. Wer knackende
   Wiedergabe hat, greift zuerst zum Qualitätsschalter — und der half bisher
   nicht.

Dazu ein zweiter, kleinerer Punkt, der jeden Sprung unnötig verteuert hat:
`hdApplyTransition()` hat bei **jedem** Übergang den Quellknoten aufgetrennt
und neu verbunden und `preservesPitch` zweimal umgeschaltet (Schritt 2 an,
Schritt 7 aus) — auch im Standard-Modus, wo weder umzuschalten noch
umzuverdrahten war. `disconnect()` an einer laufenden Quelle ist als Knacken
hörbar, und `preservesPitch` umzulegen heißt, den eingebauten Zeitdehner des
Elements mitten in der Wiedergabe an- und abzuschalten.

## Reparatur

### 1. Nur anfassen, was sich wirklich ändert

`hdSetElementPlayback(el, rate, preservesPitch)` und `hdWireSource(src, dest)`
schreiben nur, wenn der Zielzustand vom aktuellen abweicht; die Verdrahtung
merkt sich Quelle **und** Ziel (`hdWiredSrc`/`hdWiredTo`, beide beim Neuaufbau
zurückgesetzt, weil die Quelle danach eine andere ist). Die Reihenfolge aus
Stufe 2c bleibt unangetastet — erst konfigurieren und abwarten, dann hörbar
verbinden; der sichere Zwischenzustand aus Schritt 2 gilt weiterhin, er wird
nur nicht mehr neu hergestellt, wenn er schon steht.

Damit ist ein `audioSeek()` im Standard-Modus ein reiner Sprung ohne Eingriff
in den Graphen, und ein Loop-Rücksprung ebenso.

### 2. Verdacht markieren, im Vordergrund reparieren

`audioGraphSuspect` merkt sich, dass der Graph in dem Zustand war, in dem der
Fehler gemeldet wurde: `hdSuspectOnBypass()` — der Zeitdehner hing hörbar im
Weg **und** die Seite war dabei im Hintergrund. Gesetzt wird das dort, wo HD
den Signalweg verlässt (`hdApplyTransition()`, Teardown-Zweig).

`repairSuspectAudioGraph(reason)` löst den Verdacht ein, indem es
`rebuildAudioGraph()` aufruft — **nur im Vordergrund**. Im Hintergrund wäre der
Neuaufbau gefährlich statt hilfreich: ein frisches `<audio>`-Element und ein
frischer `AudioContext` dürfen ohne Nutzergeste nicht überall von selbst
anlaufen, und ausgerechnet die Hintergrundwiedergabe bliebe dann am
Liedwechsel stehen. Der Verdacht kostet nichts, solange ihn niemand einlöst.

Eingelöst wird er an drei Stellen:

| Stelle | Wann | Hörbar? |
|---|---|---|
| `visibilitychange` → sichtbar | nichts läuft | nein |
| `openPlayer()` | Liedwechsel bei stehender Wiedergabe | nein |
| Moduswechsel HD/Standard | sofort | kurze Unterbrechung |

Der Moduswechsel ist bewusst dabei: das ist der Griff, mit dem man ein Knacken
loszuwerden versucht, und er soll wirken. Der Notausgang-Knopf bleibt
zusätzlich, was er war.

## Selbsttests

In `runAsyncSelfTests()`:

* Zwei aufeinanderfolgende `hdApplyTransition()`-Aufrufe ohne Änderung dürfen
  die Quelle genau einmal verbinden und danach nicht wieder auftrennen; der
  sichere native Zustand (Tempo, Tonhöhenerhalt) muss trotzdem stehen.
* Wahrheitstabelle für `hdSuspectOnBypass()`, und `repairSuspectAudioGraph()`
  darf ohne Verdacht nichts tun.

Die bestehenden Prüfungen zu Fehler A und Fehler B laufen unverändert mit.

## Auf dem Gerät zu prüfen

Mit eingeschaltetem Diagnose-Log:

1. HD, 0,6×, Bildschirm aus, ein Lied auslaufen lassen. Im Log muss beim
   Wechsel `hd:teardown` und direkt danach `audio:suspect` stehen.
2. App wieder öffnen, Wiedergabe pausieren oder das nächste Lied wählen →
   `audio:repair` und `audio:rebuild … done`. Danach darf nichts mehr knacken.
3. Alternativ im laufenden Betrieb auf Standard schalten → ebenfalls
   `audio:repair`. Eine kurze Unterbrechung ist erwartet.
4. Standard-Modus, mehrfach springen → im Log keine Häufung von `hd:mode`, und
   hörbar kein Knacken am Sprung.
5. Bleibt es trotz Neuaufbau bei knackendem Ton, liegt es nicht am
   Element-Pfad; dann ist der Echtzeitwert aus `audio:health` die nächste Spur.

`SW_VERSION` in `sw.js` ist auf `v136` erhöht, sonst kommt die Änderung nicht
aufs Gerät.
