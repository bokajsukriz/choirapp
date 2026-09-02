# Arbeitsanweisung — Originaltrack leise unter den REC legen

Adressat: Sonnet (Folge-Session). Grundlage: Nutzerwunsch „Mit Kopfhörern
aufnehmen und beim Abspielen auswählen können, ob die richtige Stelle des
Originaltracks leise im Hintergrund mitläuft.“

Gegengeprüft am Stand `d09c560` von `index.html`, `sw.js`, `README.md`.
**Immer über Funktions- und ID-Namen ansteuern, nie über Zeilennummern.**

---

## 0. Rahmenbedingungen (gelten für jeden Schritt)

1. **Branch:** `claude/dual-track-playback-lfg3t9`. Nicht auf `main` pushen.
2. **Kein Build-Schritt, keine Abhängigkeiten.** Die App bleibt eine statische
   PWA von GitHub Pages. Keine `package.json`, kein Bundler, keine externen
   Ressourcen, keine neuen Dateien außer dieser Doku.
3. **Keine einzige Netzwerkanfrage.** Zusage im `README.md`.
4. **`SW_VERSION` in `sw.js` erhöhen** (`'v109'` → `'v110'`), genau **einmal am
   Ende**, nicht pro Commit.
5. **Codestil beibehalten:** deutschsprachige Kommentare im Ton der Datei
   (erklären *warum*, nicht *was*), 2 Leerzeichen Einrückung, keine
   Umformatierung fremder Zeilen, keine Umbenennungen „bei der Gelegenheit“.
6. **Keine Modularisierung.** Alles Neue geht in `index.html` an die
   thematisch passende Stelle — in den bestehenden Block
   `/* ===== REC — eigene Aufnahme … */` bzw. in die Audio-Ebene.
7. **Kein i18n-Durchgang.** Die gesamte REC-Oberfläche im Loops-Reiter ist
   hartkodiert deutsch (kein einziges `data-i18n` zwischen `#rec-controls`
   und `#recording-list`). Bleib dabei — konsistent mit den Nachbarn.
   Erfinde keine STRINGS-Schlüssel für diese Funktion.
8. **Syntaxprüfung nach jeder Änderung:**
   `node -e "const s=require('fs').readFileSync('index.html','utf8'); const m=s.match(/<script>([\s\S]*)<\/script>\s*<\/body>/); new (require('vm').Script)(m[1]);"`
   und `node --check sw.js`.
9. **Ein Commit je Arbeitspaket** (M1 … M8), englische Betreffzeile im Imperativ
   wie in der Historie.
10. Am Ende **einmal pushen** (`git push -u origin claude/dual-track-playback-lfg3t9`).
    **Keinen Pull Request eröffnen**, solange der Nutzer nicht danach fragt.

---

## 1. Machbarkeit — die Entscheidungen sind gefallen, bitte nicht neu aufrollen

Diese Analyse ist Teil der Anweisung, damit du sie nicht wiederholst.

### 1.1 Die Aufnahmeseite ist bereits fertig

Der Zweig `claude/simultane-aufnahme-wiedergabe-t8pleh` ist gemergt. Mitsingen
zum laufenden Song funktioniert schon: REC und Wiedergabe laufen unabhängig
nebeneinander, `preferWideBandMic()` verhindert den Bluetooth-Absturz ins
Freisprechprofil, `startLevelMeter()` hängt am bestehenden AudioContext statt
einen zweiten aufzumachen. **An der Aufnahme selbst ist nichts zu tun** außer
dem Merken des Ankers (M2). Fass `RECORDING_CONSTRAINTS`,
`preferWideBandMic()` oder die Pegelanzeige nicht an.

### 1.2 Zwei Elemente gleichzeitig — ja, aber nur über einen GainNode

Heute gibt es genau ein `<audio>` (`Audio.el`), das durch die Kanal-Matrix
läuft (`createMediaElementSource` → Splitter → vier Gains → Merger →
`ctx.destination`). Der REC kapert dieses eine Element
(`previewRecordingBlob()`).

Für den Hintergrundtrack kommt ein **zweites Element** dazu. Zwei
gleichzeitige Media-Elemente sind auf iOS-Safari seit Langem erlaubt; das ist
nicht der Stolperstein. Der Stolperstein ist:

> **`HTMLMediaElement.volume` ist auf iOS schreibgeschützt.** `bg.volume = 0.2`
> tut dort schlicht nichts — der Originaltrack liefe in voller Lautstärke über
> den eigenen Gesang. Die Lautstärkeregelung **muss** deshalb über einen
> `GainNode` im bestehenden `Audio.ctx` laufen.

Daraus folgt die Verdrahtung (M3): das zweite Element bekommt eine eigene
`createMediaElementSource`, geht durch einen `bgGain` und wird **in denselben
Splitter** eingespeist wie das Hauptelement. Vorteile gegenüber einer eigenen
Verbindung nach `ctx.destination`: der Fahrradmodus (mono/swap) gilt
automatisch auch für den Hintergrundtrack, und es entsteht kein zweiter
Signalweg, der beim Umschalten auseinanderlaufen könnte. Web Audio summiert an
einem Eingang, das ist zulässig und braucht keinen Mischknoten.

**Kein zweiter AudioContext.** Der bestehende wird wiederverwendet — ein frisch
erzeugter lässt iOS die Audio-Hardware neu aushandeln und stört die laufende
Wiedergabe hörbar (steht so im Kommentarblock über `startLevelMeter()`).

### 1.3 Warum nicht über Web Audio dekodieren und mischen?

Wurde erwogen und verworfen: `decodeAudioData()` auf den Song legt die
komplette Spur unkomprimiert in den Speicher (mehrere Minuten Stereo bei 44,1
kHz sind schnell 50–100 MB), und der Song müsste bei jedem Anhören neu
dekodiert werden. Für ein leises Hintergrund-Playback ist das grob
unverhältnismäßig. Zwei Media-Elemente kosten nichts.

### 1.4 Synchronität — Regelung statt Hoffnung

Zwei unabhängige Media-Elemente driften. Für Musik ist das hörbar, sobald es
über ~50 ms geht. Die Lösung ist die übliche Nachregelung, und sie ist billig,
weil es schon einen Takt gibt: `Audio.el` feuert `timeupdate` etwa viermal pro
Sekunde und ruft darüber `Audio.onPosition` auf. **Kein eigener Timer, kein
`requestAnimationFrame`.**

Die Zeitrechnung (wichtig, das ist die einzige Stelle mit echter Denkarbeit):

- Während der Aufnahme lief der Song mit der Rate `r` (`Audio.rate`). In `t`
  Sekunden Echtzeit rückte der Song also um `r · t` vor. Die REC-Datei
  zeichnet Echtzeit auf, ihre Länge ist `t`.
- Beim Anhören läuft der REC mit der Rate `p` (`Audio.el.playbackRate` —
  `#rate-select` gilt auch für die Vorschau, das Element behält seine Rate über
  einen `src`-Wechsel hinweg).
- Daraus folgt für jeden Zeitpunkt:
  - **Sollposition:** `bg.currentTime = anchor.pos + anchor.rate * el.currentTime`
  - **Sollrate:** `bg.playbackRate = anchor.rate * el.playbackRate`

Bei `anchor.rate === 1` und normalem Tempo ist das die triviale Verschiebung —
die Formel kostet nichts und ist trotzdem für den Übe-Fall „Song auf 0,75×
mitgesungen, REC auf 1,0× angehört“ richtig.

Regelung: Drift = `bg.currentTime − Soll`.
- `|Drift| > 0,25 s` → harter Sprung (`bg.currentTime = Soll`). Passiert nach
  einem Suchleisten-Sprung, nach dem Zurückkehren aus dem Hintergrund oder wenn
  das System eines der Elemente kurz angehalten hat.
- `0,04 s < |Drift| ≤ 0,25 s` → weiches Aufholen über `playbackRate` (Faktor
  `1 ∓ 0,03`), kein hörbarer Sprung.
- sonst → Sollrate.

### 1.5 Was gespeichert werden muss — und warum nicht der `fileKey`

Der REC braucht einen **Anker**: an welcher Stelle welchen Tracks er entstand.
Heute speichert der `recording`-Datensatz das nicht (Felder: `songId`,
`songTitle`, `name`, `voice`, `fileKey`, `mimeType`, `duration`, `size`,
`createdAt`).

Der Anker darf **nicht** über den Track-`fileKey` zeigen. RECs überleben
absichtlich das Löschen und Neu-Importieren eines Songs (wie Loops), und beim
Reimport werden alle `fileKey` neu vergeben — der Anker zeigte danach ins
Leere. Ebenso überlebt ein `fileKey` keinen Backup-Durchlauf. Gespeichert wird
deshalb die **Stimme** (`'FULL'`, `'ALT'`, … — stabile Schlüssel aus
`VOICE_ORDER`), und die Spur wird beim Anhören über
`playerSong.tracks.find(t => t.voice === anchor.voice)` aufgelöst.

### 1.6 Umfang

Rund 200 Zeilen in einer 656-KB-Datei, verteilt auf acht kleine Pakete, davon
zwei reine Testpakete. Keine Änderung an der Aufnahme, an der Kanal-Matrix, an
der Mediensitzung oder am Datenmodell der Songs. Die App wird davon nicht
aufgebläht.

---

## 2. Arbeitspakete

### M1 — Anker-Mathematik als reine Funktionen

Neu im REC-Block, vor den Zustandsvariablen. Reine Funktionen, keine Zugriffe
auf `Audio` oder das DOM — sie sind in M8 einzeln prüfbar:

```js
/** Sollposition des Originaltracks zu einer REC-Position (siehe Zeitrechnung). */
function backingTargetTime(anchor, recTime) { … }   // anchor.pos + anchor.rate * recTime

/** Sollrate des Originaltracks bei gegebener REC-Rate. */
function backingTargetRate(anchor, recRate) { … }   // anchor.rate * recRate

/**
 * Wie auf eine Abweichung reagiert wird: 'seek' (harter Sprung), 'nudge'
 * (weiches Aufholen über die Rate) oder 'hold'.
 */
function backingCorrection(driftS) { … }            // → { action, rateFactor }
```

Schwellen als benannte Konstanten (`BACKING_SEEK_S = 0.25`,
`BACKING_NUDGE_S = 0.04`, `BACKING_NUDGE_FACTOR = 0.03`), nicht als Literale im
Code.

### M2 — Anker beim Aufnehmen merken

1. Neue Modulvariable `recAnchor = null` neben `recStartedAt`.
2. In `startRecording()` **nicht** vor `recMediaRecorder.start()` schnappen,
   sondern einen `'start'`-Listener registrieren — zwischen `getUserMedia()`
   und dem ersten aufgezeichneten Sample liegt sonst eine unbekannte Latenz:

   ```js
   recMediaRecorder.addEventListener('start', () => { recAnchor = captureRecAnchor(); }, { once: true });
   ```

3. `captureRecAnchor()` liefert `null`, außer es lief wirklich der Song:
   - `audioPreview` ist gesetzt → `null` (es lief ein anderer REC, kein Song).
   - `!Audio.playing` oder `!Audio.currentKey` → `null` (nichts lief).
   - sonst `{ voice, pos: Audio.position, rate: Audio.rate }`, wobei `voice` aus
     `trackByVoiceKey(Audio.currentKey)?.voice` kommt. Fehlt die Stimme, `null`.
4. `onRecordingStopped()` legt den Anker in `pendingTake` ab
   (`{ blob, mimeType, duration, anchor: recAnchor }`), `recAnchor = null`.
5. `teardownRecording()` und der `error`-Handler setzen `recAnchor = null`.
6. Der Speichern-Handler (`#btn-rec-save`) schreibt `anchor` in den
   `recording`-Datensatz — **nur wenn vorhanden**, kein `anchor: null` in jedem
   Datensatz.

Noch keine Wiedergabeänderung. Nach M2 ist die Funktion unsichtbar, aber neue
RECs tragen ihren Anker.

### M3 — Zweites Element und sein Gain

In `audioInit()`:
1. Beim Aufbau der Matrix den Splitter merken: `Audio.channelIn = splitter`
   (im `catch`-Zweig bleibt er `null`).
2. Neue Felder auf `Audio`: `bg`, `bgGain`, `bgSource`, `bgVoice`, `bgUrl`.

Neue Funktion `ensureBackingAudio()` — **lazy, aber genau einmal**; erst beim
ersten Einschalten der Funktion, danach lebenslang bestehen lassen. Ein
Element mitten in laufender Wiedergabe erstmalig zu verdrahten kann auf iOS
einen Aussetzer kosten; zweimal wäre zweimal zu viel.

```
- <audio> anlegen: playsinline, preload='auto', style.display='none',
  preservesPitch (+ webkit/moz), an document.body hängen.
- Wenn Audio.ctx und Audio.channelIn stehen:
    bgSource = ctx.createMediaElementSource(bg)
    bgGain   = ctx.createGain()
    bgSource.connect(bgGain); bgGain.connect(Audio.channelIn)
- Sonst (Matrix nicht verfügbar, direkte Ausgabe):
    kein Gain — bg.volume dient als Notlösung. Auf iOS wirkungslos, aber in
    diesem Zweig läuft ohnehin schon der Fahrradmodus nicht.
```

**Das zweite Element ist ein stummer Sklave.** Es fasst `Audio.playing`,
`navigator.mediaSession`, `setPlayIcon()`, `updateWakeLock()` und die
Suchleiste nicht an, und es bekommt **keinen** der Diagnose- oder
Unterbrechungs-Listener aus `audioInit()` — der `pause`-Listener dort würde
sonst bei jedem regulären Stopp fälschlich „vom System unterbrochen“ melden.

### M4 — Wiedergabe und Nachregelung

Neue Funktionen im REC-Block:

- `async function startBacking(anchor)` — löst die Spur über `anchor.voice`
  aus `playerSong.tracks` auf (fällt die Stimme weg: **nicht** stillschweigend
  eine andere nehmen, sondern abbrechen und den Schalter deaktiviert lassen),
  lädt den Blob aus `DB.fileGet`, setzt `bg.src`, wartet auf
  `loadedmetadata`, setzt Position und Rate nach M1, ruft `bg.play()`.
  Ein bestehender `Audio.bgUrl` wird vorher freigegeben.
- `function stopBacking()` — `bg.pause()`, `src` entfernen, `load()`,
  Blob-URL freigeben, `bgVoice = null`.
- `function syncBacking()` — die Regelung aus 1.4. Wird aus dem bestehenden
  `Audio.onPosition`-Handler aufgerufen, **nicht** aus einem eigenen Timer.
- `function setBackingVolume(v)` — über `bgGain.gain.setTargetAtTime()`
  (knackfrei), Fallback `bg.volume`.

Verdrahtung in die vorhandene Vorschau-Logik:
- `previewRecordingBlob(blob, tag)` bekommt den Anker über `tag`
  (`{ pending: true, anchor }` bzw. `{ savedId, anchor }`). Läuft die Funktion
  eingeschaltet und ist ein Anker da, wird nach `audioPlay()` `startBacking()`
  angestoßen — **ohne `await` vor `audioPlay()`**: Safari bindet die
  Abspielerlaubnis an die Nutzergeste, und die verfällt, wenn davor auf
  irgendetwas gewartet wird (steht so als Kommentar in `audioPlay()`).
- `endRecordingPreview()` ruft als Erstes `stopBacking()`.
- `audioPause()`/`audioPlay()` während einer Vorschau: der Hintergrundtrack
  folgt. Setz das **nicht** in `audioPlay`/`audioPause` selbst — die gehören
  der normalen Songwiedergabe. Häng es an die Stellen, die während einer
  Vorschau schalten (`toggleSavedRecordingPreview()`, `#btn-rec-preview`, der
  Play/Pause-Knopf-Handler, wenn `audioPreview` gesetzt ist).
- Suchleisten-Sprung während der Vorschau → `syncBacking()` erzwingt ohnehin
  beim nächsten `timeupdate` den harten Sprung. Nichts extra nötig.
- Endet der Song vor dem REC (`anchor.pos + Dauer` läuft über), endet `bg`
  einfach. Kein Fehler, keine Meldung.

### M5 — Bedienelement

Neuer Block im Markup **direkt nach `#recording-list`**:

```html
<div class="rec-backing" id="rec-backing" hidden>
  <button class="loop-switch" id="btn-rec-backing" type="button" role="switch" aria-checked="false" …>
    <span class="loop-switch-knob"></span>
  </button>
  <span>Original leise mitlaufen</span>
  <input type="range" id="rec-backing-volume" min="0" max="60" step="5" …>
</div>
```

Regeln:
- Sichtbar **nur**, solange eine Vorschau mit auflösbarem Anker läuft
  (`audioPreview?.tag?.anchor` und die Stimme existiert im Song noch). Sonst
  `hidden`. Für alte RECs ohne Anker taucht nichts auf — kein Hinweis, kein
  ausgegrautes Element, keine Erklärung. Die Funktion erklärt sich, wenn sie da
  ist.
- Umschalten wirkt **sofort auf die laufende Vorschau**, nicht erst beim
  nächsten Anhören.
- Der Schieberegler ist Prozent (0–60 %, Standard 20 %). `0` schaltet die
  Funktion nicht ab, es macht sie nur unhörbar — das ist gewollt und
  unterscheidbar vom Schalter.
- Styling im Stil der Nachbarn im Loops-Reiter (`.loop-item`, `.rec-pending`),
  CSS in den vorhandenen `/* REC */`-Block. Keine neue Designsprache.

### M6 — Einstellungen

Zwei Schlüssel in `DEFAULT_SETTINGS`, im Stil der Nachbarn kommentiert:

```js
recBacking: false,        // Originaltrack beim Anhören eines RECs leise mitlaufen lassen
recBackingVolume: 0.20,   // Lautstärke des mitlaufenden Originaltracks (0…0,6)
```

Gespeichert über das vorhandene `saveSettings()`. **Nicht** in die
Backup-Whitelist in `buildBackupParts()` aufnehmen — die enthält bewusst nur
Einstellungen, deren Verlust wehtut (`repeatMode` und `channelMode` stehen dort
zum Beispiel auch nicht drin). Keine eigene Einstellungsseite: die Funktion
wird dort bedient, wo sie wirkt.

### M7 — Backup-Rundlauf

`buildBackupParts()` schreibt RECs über eine **Whitelist** (`songTitle`,
`name`, `voice`, `duration`, `mimeType`, `createdAt`) — ein neues Feld am
Datensatz reist **nicht** automatisch mit. Ohne diesen Schritt verlöre jeder
REC beim Sichern und Zurückspielen seinen Anker.

1. `anchor` in die Whitelist aufnehmen, aber nur wenn vorhanden.
2. Auf der Rückspielseite (`restoreBackup`, dort wo `recordings` verarbeitet
   werden) den Anker wieder übernehmen — **mit Prüfung**: `pos` und `rate`
   müssen endliche Zahlen sein, `voice` muss in `VOICE_ORDER` stehen. Sonst
   Anker verwerfen und den REC ohne ihn anlegen. Eine Sicherungsdatei ist eine
   Datei von außen; sie darf keine kaputten Werte in die Wiedergabe tragen.
3. `importRecordingFile()` (MP3-Import) bleibt unverändert — importierte MP3s
   haben keinen Anker, und das ist richtig so.

### M8 — Selbsttests

In `runSelfTests()` einreihen, im Stil der vorhandenen Prüfungen:

- `backingTargetTime` bei `rate === 1` (reine Verschiebung) und bei
  `rate === 0.75` (gestauchte Zeitachse).
- `backingTargetRate` als Produkt beider Raten.
- `backingCorrection` an den Schwellen: knapp darunter, knapp darüber,
  beidseitig im Vorzeichen, exakt `0`.
- Anker-Prüfung aus M7: gültiger Anker durch, `NaN`-Position raus, unbekannte
  Stimme raus.

`captureRecAnchor()` ist über `Audio`/`audioPreview` an globalen Zustand
gebunden und wird **nicht** getestet — schreib dafür keinen Mock-Aufbau.

---

## 3. Handprüfung vor dem Push

Ohne echtes Gerät ist das nicht abschließend prüfbar; benenne im
Abschlussbericht ehrlich, was du nur gelesen und nicht ausgeführt hast.
Mindestens am Rechner durchspielen:

1. Song abspielen → REC starten → mitsingen → stoppen → **Anhören**: Schalter
   erscheint, Original läuft leise und an der richtigen Stelle mit.
2. Denselben REC speichern, Song verlassen, zurückkehren, aus der Liste
   anhören: Anker hält.
3. REC ohne laufenden Song aufgenommen → kein Schalter, keine Fehlermeldung.
4. Während der Vorschau pausieren, spulen, Tempo umstellen: Original folgt.
5. Vorschau beenden → der Song läuft wieder da weiter, wo er vor dem Anhören
   stand (das ist die Zusage von `endRecordingPreview()`, sie darf nicht
   brechen).
6. Fahrradmodus (mono/swap) während der Vorschau umschalten: gilt für beide
   Spuren.
7. Backup mit RECs erstellen, alles löschen, zurückspielen: Anker überlebt.
8. Song löschen und neu importieren: der REC findet seine Stimme wieder
   (deshalb `voice` statt `fileKey`).

---

## 4. Was ausdrücklich **nicht** zu dieser Aufgabe gehört

- Keine Echo-Unterdrückung, keine Änderung an `RECORDING_CONSTRAINTS`. Über
  Lautsprecher aufgenommen ist der Song ohnehin schon im Mikrofon; die Funktion
  richtet sich an Kopfhörer-Nutzer und braucht keine Warnung dafür.
- Kein Abmischen des Hintergrundtracks in die exportierte MP3. Der Export
  bleibt die reine Aufnahme.
- Keine Wellenform-Darstellung beider Spuren, kein Mehrspur-Editor.
- Kein manueller Versatz-Regler. Wenn sich in der Praxis zeigt, dass der Anker
  systematisch danebenliegt, ist das ein eigener, späterer Schritt — bau ihn
  nicht auf Verdacht ein.
