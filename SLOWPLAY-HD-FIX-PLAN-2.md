# Arbeitsanweisung: zwei Fehler aus Runde 1 nachziehen

Stand: `5571fe1`. Anschluss an `SLOWPLAY-HD-FIX-PLAN.md` — der ist abgearbeitet
und bleibt gültig. **Nichts daraus zurückbauen.** Hier stehen nur zwei Fehler,
die dabei entstanden beziehungsweise übersehen wurden.

## Kontext

Der Gerätetest auf dem Pixel 9 hat beide Fehler bestätigt, nicht nur die
Codelesung:

| Beobachtung | Erklärt durch |
|---|---|
| Wechsel auf 0,6× ändert **nichts** am Tempo | Fehler A |
| „Irgendwann war der Pitch plötzlich hoch" | Fehler A |
| HD gewählt, 1,0×, Echtzeit **82–85 %**, Ton hakt | Fehler B |
| Standard + Neuladen hilft, HD danach sofort wieder kaputt | Fehler B |

Beide zusammen erklären auch den ursprünglichen Vorfall („nach zwei Stunden
alles abgehackt, auch bei 1,0×") **ohne** die Annahme eines degradierten
`AudioContext`. Die Wiederherstellung aus Stufe 4 bleibt trotzdem drin — sie ist
für sich richtig, war aber offenbar nicht die Ursache.

---

## Fehler A — das Tempo wird nicht mehr ans Element durchgereicht

**Regression.** Auf `2185744` stand in `applyRateToElement()`:

```js
el.playbackRate = Audio.rate;
```

Beim Zusammenlegen zu `hdApplyTransition()` ist diese Zeile verlorengegangen.
Im ganzen `index.html` gibt es keine Zuweisung an `Audio.el.playbackRate` mehr —
`grep -n "playbackRate" index.html` trifft nur noch `bg.playbackRate` (der
Originaltrack unter dem REC) und ein `dlog`-Feld.

Folge: `audioSetRate()` setzt `Audio.rate`, aber das Element spielt weiter mit
1,0. Zusätzlich wird `hdEngaged()` wahr (es prüft `Audio.rate`, nicht das
Element), der Zeitdehner hängt sich ein und schiebt um `12·log2(1/0.6)` ≈ **+8,8
Halbtöne nach oben** — normal schnell, aber zu hoch. Genau das war der „plötzlich
hohe Pitch".

### Reparatur

`el.playbackRate = Audio.rate;` in **Schritt 2** von `hdApplyTransition()`
(index.html:9066, im `if (el)`-Block neben `preservesPitch`), **nicht** erst in
Schritt 7.

Der Grund für Schritt 2: die Funktion hat sechs frühe `return`-Pfade (kein
Knoten, zwei Generationsprüfungen, zwei RPC-`catch`, Konfigurationsabbruch).
Stünde die Zeile in Schritt 7, bliebe das Tempo bei jedem dieser Abbrüche falsch
stehen. In Schritt 2 zusammen mit `preservesPitch = true` ergibt sie den
korrekten sicheren Zwischenzustand: richtiges Tempo, Tonhöhe nativ gehalten —
also genau Standard-Verhalten, bis HD übernimmt.

### Selbsttest

```text
audioSetRate(0.6) → Audio.el.playbackRate === 0.6
audioSetRate(1)   → Audio.el.playbackRate === 1
```

Dazu einer, der die Regression strukturell abfängt: nach `hdApplyTransition()`
mit beliebigem Ausgang muss `Audio.el.playbackRate === Audio.rate` gelten.

---

## Fehler B — der Zeitdehner rechnet weiter, obwohl er umgangen ist

Sobald HD gewählt ist, kostet der Zeitdehner volle Rechenzeit im Renderthread —
**auch bei 1,0×, wo er aus dem Signalweg genommen ist.** Auf dem Pixel 9 fällt
die Echtzeitmessung dadurch auf 82–85 %, und darunter setzt der Ton aus.

Das Abklemmen reicht nachweislich nicht. Zwei Gründe, beide im Code belegt:

1. `hdApplyTransition()` schickt `schedule({ active: true, … })` **unbedingt**,
   auch wenn `useHd` falsch ist.
2. Selbst `active: false` würde nichts sparen: der inaktive Zweig im Prozessor
   (signalsmith-stretch.js:294–301) füllt die Eingabe mit Nullen und ruft
   trotzdem jede Runde `wasmModule._process(…)` auf. Der Kommentar dort sagt es
   selbst — *„Should detect silent input and skip processing"* —, tut es aber
   nicht.

Der Knoten ist bei 1,0× vollständig isoliert (kein Eingang, kein Ausgang), und
er kostet trotzdem. Ein `disconnect()` ist also wirkungslos; der Knoten muss
**weg**.

### Reparatur

**B1. Knoten abbauen, wenn er nicht gebraucht wird.** In `hdApplyTransition()`
nach der Ermittlung von `useHd`: ist `useHd` falsch und existiert ein Knoten,
`hdTeardown(Audio.hdNode)` aufrufen und `Audio.hdNode = null` setzen. Die
Funktion gibt es schon (Stufe 4), sie löst die Verbindung und schließt den Port.

**B2. Die Falle dabei — sonst legt sich der Knoten sofort neu an.** Schritt 3
ruft heute (index.html:9080):

```js
if (settings.slowMode === 'hd') ensureHdNode();
```

Das erzeugt den Knoten auch bei 1,0×, also genau dann, wenn er gerade abgebaut
wurde — es entstünde eine Endlosschleife aus Abbauen und Neuanlegen. Die
Bedingung muss darauf zeigen, ob der Knoten wirklich **benutzt** wird:

```js
if (settings.slowMode === 'hd' && Audio.rate !== 1) ensureHdNode();
else if (settings.slowMode === 'hd') ensureStretchLib().catch(() => {});
```

Die ursprüngliche Absicht („wer HD wählt, soll das Nachladen sofort anstoßen")
bleibt damit erhalten — sie gilt der **Bibliothek**, nicht dem Knoten.
`ensureStretchLib()` (index.html:8305) lädt die 113 KB vor, ohne ein Worklet zu
erzeugen. Der erste Wechsel auf 0,6× muss dann nur noch den Knoten anlegen.

**B3. Der Preis, bewusst akzeptiert.** Jeder Wechsel von 1,0× auf ein
langsameres Tempo legt den Knoten neu an. Das dauert, weil das WASM je
Prozessorinstanz neu instanziiert wird — `addModule()` ist pro Kontext
zwischengespeichert, die Instanz nicht. In dieser Zeit spielt die App nativ
weiter; den Pfad dafür gibt es schon (Schritt 2 plus der `if (!node) return`
in Schritt 3). Hörbar ist das als kurzes Standard-Verhalten vor dem Umschalten,
und das ist allemal besser als dauerhaft 85 % Echtzeit.

Falls die Verzögerung im Test stört: **nicht** den Knoten wieder dauerhaft
stehenlassen, sondern erst messen, wie lange das Anlegen wirklich braucht
(`dlog('hd:init', { ms })`), und das Ergebnis berichten.

### Prüfung

Auf dem Gerät, mit eingeschaltetem Diagnose-Log:

1. HD gewählt, 1,0×, abspielen → Echtzeit muss bei **~100 %** stehen, und
   `Audio.hdNode` muss `null` sein.
2. Auf 0,6× wechseln → es wird hörbar langsamer, die Tonhöhe bleibt gleich,
   `Audio.hdNode` ist gesetzt.
3. Zurück auf 1,0× → Echtzeit wieder ~100 %, `Audio.hdNode` wieder `null`.
4. Zwanzigmal schnell zwischen 1,0× und 0,6× springen → kein Knoten bleibt
   übrig (die Generationsprüfung aus Stufe 2c muss das tragen), kein Aufbau
   ohne zugehörigen Abbau im Log.
5. Zwischen allen vier Tempi und beiden Modi springen → die Tonhöhe bleibt in
   HD **immer** die des Originals; kein „plötzlich hoch", kein „plötzlich tief".

Punkt 5 ist der, an dem beide Fehler zusammen aufgefallen sind — er muss am
Ende sauber durchlaufen.

---

## Nicht anfassen

Alles aus `SLOWPLAY-HD-FIX-PLAN.md` bleibt: die gemeinsame Klemmung von
Blocklänge und Schrittweite, der Vendor-Patch, die geordnete Transition mit
Generationszählung, der Health-Monitor, der Neuaufbau und der Notausgang-Knopf.
Insbesondere die Reihenfolge in `hdApplyTransition()` (erst konfigurieren und
abwarten, dann hörbar verbinden) darf nicht wieder aufgeweicht werden — Fehler B
wird **innerhalb** dieser Reihenfolge repariert, nicht daneben.

`SW_VERSION` in `sw.js` erhöhen, sonst kommt die Änderung nicht aufs Gerät.
