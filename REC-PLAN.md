# Arbeitsanweisung — Shuffle-Stopp, Kopfhörer-Qualität, REC-Umbau

Adressat: Sonnet (Folge-Session). Grundlage sind vier Nutzerwünsche:

1. „Shuffle stoppt, wenn ein Lied ohne Stems dran ist (evtl. auch bei
   Giglisten?)"
2. „Bei Kopfhörern führt der Aufnahmeknopf zu einem Abfall der Qualität?"
3. REC-Workflow: nach dem Stopp **eine** Ebene mit editierbarem Namen,
   Stimmenauswahl, Anhören, Speichern, Verwerfen.
4. Allgemeine Aufnahmefunktion: roter REC-Knopf links neben dem Würfel auf
   dem Songs-Bildschirm, Zuordnung erst beim Speichern.

Gegengeprüft am Stand `b3da3cc` von `index.html` (rund 14 400 Zeilen),
`sw.js`, `README.md`. **Immer über Funktions- und ID-Namen ansteuern, nie über
Zeilennummern** — die verschieben sich mit jedem Arbeitspaket.

Auf demselben Branch liegt bereits die fertige Lichtshow (Pakete L1–L9 aus
`LICHTSHOW-PLAN.md`). Sie berührt weder den REC-Block noch das
Weiterschalten — geprüft; hier ist nichts abzustimmen. Nur `SW_VERSION` teilt
ihr euch: sie steht deshalb schon auf `'v101'`.

Die Oberfläche aus den Paketen R6–R8 ist mit dem Nutzer bereits an
Bildschirmentwürfen abgestimmt (Variante „C1"). Abschnitt 4 und 5 beschreiben
sie deshalb verbindlich bis auf die Knopfgröße. **Nicht neu erfinden**, auch
nicht „schöner" machen.

---

## 0. Rahmenbedingungen (gelten für jeden Schritt)

1. **Branch:** `claude/lichtshow-feature-q2ghr2`. Nicht auf `main` pushen.
2. **Kein Build-Schritt, keine Abhängigkeiten.** Die App bleibt eine statische
   PWA. Keine `package.json`, kein Bundler, keine externen Ressourcen zur
   Laufzeit, keine neuen Dateien außer dieser Doku.
3. **Keine einzige Netzwerkanfrage.** Zusage im `README.md`. Das betrifft auch
   die Diagnose aus Abschnitt 3: alles läuft über das lokale Diagnose-Log.
4. **`SW_VERSION` in `sw.js` erhöhen** (`'v101'` → `'v102'`), genau **einmal am
   Ende**, nicht pro Commit.
5. **Codestil beibehalten:** deutschsprachige Kommentare im Ton der Datei
   (erklären *warum*, nicht *was*), 2 Leerzeichen Einrückung, keine
   Umformatierung fremder Zeilen, keine Umbenennungen „bei der Gelegenheit".
6. **Keine Modularisierung.** Alles Neue geht in `index.html` an die
   thematisch passende Stelle — die REC-Sachen in den bestehenden Block
   `/* ===== REC — eigene Aufnahme übers Mikrofon … */`, der allgemeine
   Recorder als eigener Abschnittskommentar direkt dahinter.
7. **Sprachen:** Der REC-Block ist bewusst **nicht** übersetzt (alle Texte
   stehen dort deutsch im Code). Das bleibt so. Nur was in bereits
   übersetzte Bereiche eingreift — der neue Knopf in der Suchleiste des
   Songs-Bildschirms — bekommt Schlüssel in **allen drei** Tabellen
   (`de`, `en`, `pl`), wie es der Nachbar `songs.feelingLuckyAria` vormacht.
8. **Syntaxprüfung nach jeder Änderung:**
   `node -e "const s=require('fs').readFileSync('index.html','utf8'); const m=s.match(/<script>([\s\S]*)<\/script>\s*<\/body>/); new (require('vm').Script)(m[1]);"`
   und `node --check sw.js`.
9. **Ein Commit je Arbeitspaket** (R1 … R9), englische Betreffzeile im
   Imperativ wie in der Historie.
10. Am Ende **einmal pushen** (`git push -u origin claude/lichtshow-feature-q2ghr2`).

---

## 1. Arbeitspakete im Überblick

| Paket | Inhalt | Abschnitt |
|-------|--------|-----------|
| R1 | Lieder ohne Stimmen beim Weiterschalten überspringen (Bibliothek) | 2.2 |
| R2 | Dasselbe in Setlisten | 2.3 |
| R3 | Diagnose: was genau passiert beim Aufnehmen mit Kopfhörern | 3.2 |
| R4 | Audioweg nach dem Aufnehmen reparieren | 3.3 |
| R5 | Mikrofonwahl und einmaliger Hinweis | 3.4 |
| R6 | Take-Karte im Player (eine Ebene) | 4 |
| R7 | Aufnahme-Ansicht (Gerüst, Route, Knopf in der Suchleiste) | 5.2 |
| R8 | Zuordnung beim Speichern (Songliste, Platzhalter) | 5.3 |
| R9 | Selbsttests, `SW_VERSION`, Abnahme | 6 |

R1/R2 sind unabhängig von allem Übrigen — **damit anfangen**, das sind die
Fehler, die der Chor täglich merkt. R6 muss vor R7/R8 fertig sein: der
allgemeine Recorder verwendet dieselbe Karte.

---

## 2. A — Shuffle bleibt an Liedern ohne Stimmen hängen

### 2.1 Befund (bitte nicht neu untersuchen)

Ein Song kann in der Bibliothek stehen, ohne eine einzige Audiodatei zu haben:
`createPlaceholderSong()` legt genau solche Einträge an (`tracks: []`), damit
man Liedtext und Notizen schon vor dem Import erfassen kann. In der Liste
tragen sie das Verbotssymbol (`songs.placeholderBadge`).

`openPlayer()` steigt für diese Songs vorzeitig aus:

```js
const first = preferredTrack(song);
if (!first) {
  if (!song.tracks.length) { … setPlayerFootUnavailable(true); }
  else banner('Für diesen Song ist keine Aufnahme gespeichert.', …);
  return;                       // ← hier endet alles
}
```

Da `preferredTrack()` nur dann `null` liefert, wenn `song.tracks` leer ist,
gilt: **abspielbar ⟺ `song.tracks.length > 0`.**

Daraus folgen drei Fehler:

1. **`randomOtherSong()`** würfelt aus *allen* Songs, Platzhalter
   eingeschlossen. Trifft der Würfel einen, bleibt die Wiedergabe stehen —
   das ist der gemeldete Shuffle-Stopp. Dasselbe gilt für
   `goToNextLibrarySong()`/`goToPreviousLibrarySong()` in der geordneten
   Reihenfolge und für „Feeling Lucky" (`#btn-feeling-lucky`).
2. **`pendingAutoPlay` bleibt hängen.** Es wird vor dem `navigate()` gesetzt
   und erst *nach* obigem `return` wieder gelöscht. Nach einem Platzhalter
   startet deshalb der **nächste** von Hand geöffnete Song ungefragt von
   selbst. Das ist der zweite, subtilere Teil desselben Fehlers.
3. **Setlisten sind ebenso betroffen — ja, die Vermutung stimmt.**
   `startPlaylist()` merkt sich pro Eintrag nur `{ title, id }` und setzt
   `id`, sobald *irgendein* Song diesen Titel trägt — ein Platzhalter zählt
   als vorhanden. `playlistStep()`, `playlistAdvance()` und
   `randomQueueIndex()` prüfen danach nur noch `item.id`. Ein importierter,
   aber tonloser Titel bleibt also mitten in der Setliste stehen.

### 2.2 R1 — Bibliothek

Neue Hilfsfunktion direkt neben `preferredTrack()`:

```js
/** Abspielbar ist ein Song erst mit mindestens einer Stimme — Platzhalter
 *  (siehe createPlaceholderSong) sind Karteikarten für Text und Notizen,
 *  kein Ziel fürs Weiterschalten. */
function isPlayableSong(song) {
  return !!song && Array.isArray(song.tracks) && song.tracks.length > 0;
}
```

Anzupassen:

- `randomOtherSong(songs, excludeId)`: Kandidaten zusätzlich auf
  `isPlayableSong` filtern. Gibt es danach keinen Kandidaten mehr, `null`
  zurückgeben (statt wie bisher auf den ganzen Pool zurückzufallen).
- `goToNextLibrarySong(autoplay)` / `goToPreviousLibrarySong(autoplay)`:
  Die sortierte Liste **vor** der Auswahl auf abspielbare Songs eindampfen.
  Der Rundlauf (`% songs.length`) rechnet dann auf der gefilterten Liste;
  der Index des aktuellen Songs wird darin gesucht (`findIndex`), und ist er
  nicht enthalten — man steht gerade auf einem Platzhalter —, beginnt
  „Weiter" beim ersten und „Zurück" beim letzten Eintrag der gefilterten
  Liste.
  Bleibt nichts übrig: `banner('Kein Lied mit Aufnahme in der Bibliothek.', { kind: 'error' })`
  und zurückkehren, ohne zu navigieren.
- `#btn-feeling-lucky`: `pool` auf `isPlayableSong` filtern (der Würfel
  arbeitet auf `lastVisibleSongs`, respektiert also weiter die Suche). Leerer
  Pool → `banner('Kein Lied mit Aufnahme in dieser Auswahl.', { kind: 'error' })`,
  **nicht** stillschweigend nichts tun wie bisher.
- `openPlayer()`: im `if (!first)`-Zweig `pendingAutoPlay = false;` setzen,
  bevor `return` kommt. Kommentar dazu: die Absicht „gleich losspielen" gilt
  dem übersprungenen Song, nicht dem übernächsten Handgriff.

Platzhalter bleiben über die **Liste** erreichbar — sie verschwinden nur aus
dem automatischen Weiterschalten. Das ist die Absicht; nicht zusätzlich die
Liste filtern.

### 2.3 R2 — Setlisten

- `startPlaylist(pl)`: Einträge um das Wissen erweitern, ob der Titel Ton hat:

  ```js
  const song = findSongByTitle(songs, t);
  return { title: t, id: song ? song.id : null, playable: isPlayableSong(song) };
  ```

  `firstIndex` sucht künftig den ersten **abspielbaren** Eintrag. Zwei
  unterschiedliche Meldungen, die den Unterschied benennen:
  - kein einziger Titel gefunden → wie bisher
    `Von „…" ist noch kein Lied importiert.`
  - Titel vorhanden, aber keiner mit Ton → `Von „…" ist noch keine Aufnahme importiert.`
- `randomQueueIndex(queue)`, `playlistStep(delta, autoplay)`,
  `playlistAdvance()`: überall `items[i].id` als Abspielbarkeitsprüfung durch
  `items[i].playable` ersetzen. In `playlistAdvance()` gilt das auch für die
  Meldung am Ende (`… enthält keine abspielbaren Titel.`) — die stimmt dann
  endlich.
- `renderQueue()`: Einträge mit `id`, aber ohne Ton bekommen ein eigenes
  Merkmal `data-unplayable="true"` (bestehendes `data-missing` bleibt den
  gar nicht importierten Titeln vorbehalten) und dieselbe gedämpfte
  Darstellung wie `[data-missing="true"]` (`opacity:.6`), dazu als Hinweis
  denselben Text wie in der Bibliothek (`t('songs.placeholderBadge')`) als
  `title`/`aria-label`. **Antippbar bleiben sie** — wer bewusst auf einen
  Platzhalter tippt, will dorthin (Liedtext, Notizen).
- Nicht anfassen: dass die Warteschlange beim Start einmal berechnet und
  durch einen späteren Import nicht aktualisiert wird. Bestehendes Verhalten,
  hier nicht im Auftrag.

### 2.4 Prüfen

Ohne echte Bibliothek reproduzierbar: in der Konsole
`await createPlaceholderSong('ZZZ Testlied')`, dann Shuffle einschalten und
20-mal „Weiter" tippen — der Platzhalter darf nie erscheinen, die Wiedergabe
nie stehen bleiben. Danach denselben Titel in eine Setliste aufnehmen und
die Setliste durchlaufen lassen. Testdaten hinterher wieder löschen.

---

## 3. B — Kopfhörer: Qualitätsabfall durch den Aufnahmeknopf

### 3.1 Was mit hoher Wahrscheinlichkeit passiert

Die Frage ist berechtigt, und die Ursache liegt nicht in unserem Code,
sondern in der Audio-Sitzung des Systems:

- Sobald `getUserMedia({ audio: … })` einen Mikrofonstrom öffnet, wechselt das
  Betriebssystem die Audio-Sitzung in einen Aufnahmemodus (iOS:
  `AVAudioSessionCategoryPlayAndRecord`, Android: Kommunikationsmodus).
- Bei **Bluetooth-Kopfhörern** wird dabei vom Wiedergabeprofil A2DP auf das
  Freisprechprofil **HFP/SCO** umgeschaltet, weil dieselbe Verbindung nun
  auch das Mikrofon tragen muss. HFP ist mono mit 8 bzw. 16 kHz — der
  gesamte Klang fällt hörbar ab, Wiedergabe **und** Aufnahme. Das ist
  physikalisch bedingt und aus einer Web-App nicht abschaltbar.
- Bei **kabelgebundenen Kopfhörern mit Mikrofon** (Headset-Klinke) passiert
  das Gleiche in schwächerer Form: das System schaltet auf das
  Headset-Mikrofon und kann die Sitzung auf eine niedrigere Abtastrate legen.
- Zusätzlich erbt unser **`AudioContext` der Kanal-Matrix** (`Audio.ctx`,
  einmalig in `audioInit()` erzeugt) seine Abtastrate beim Anlegen und behält
  sie. Ändert das System die Hardware-Rate für die Aufnahme-Sitzung, wird
  fortan umgerechnet — und auf iOS kann die Sitzung nach dem Ende der
  Aufnahme im Aufnahmemodus verharren, bis der Kontext geschlossen und neu
  aufgebaut wird. **Das ist der Teil, der uns gehört**, und der einzige, bei
  dem ein Qualitätsabfall auch nach dem Stoppen bestehen bleibt.

Was wir **nicht** tun: `echoCancellation`/`noiseSuppression`/`autoGainControl`
wieder einschalten. Die stehen aus gutem Grund auf `false` (siehe Kommentar in
`startRecording()`), und sie sind nicht die Ursache.

### 3.2 R3 — Erst messen, dann bauen

Nichts davon wird auf Verdacht repariert. Erweitere das Diagnose-Log
(`dlog()`, schaltbar in den Einstellungen) an diesen Stellen:

- in `startRecording()` direkt nach `getUserMedia`:
  `dlog('rec:stream', { label: track.label, settings: track.getSettings() })`
  — `getSettings()` liefert `sampleRate`, `channelCount`, `deviceId`,
  `echoCancellation` usw.
- direkt davor und direkt danach jeweils
  `dlog('rec:ctx', { when: 'before'|'after', rate: Audio.ctx?.sampleRate, state: Audio.ctx?.state })`.
- in `teardownRecording()` am Ende noch einmal dasselbe mit `when: 'teardown'`.
- einmalig nach erteilter Mikrofonerlaubnis:
  `navigator.mediaDevices.enumerateDevices()` und die `audioinput`-Einträge
  (nur `deviceId`-Kürzel, `label`, `groupId`) loggen. Das Log bleibt lokal;
  es verlässt das Gerät nur, wenn der Nutzer es selbst teilt.

**Testprotokoll** (der Nutzer führt es aus, du wertest das geteilte Log aus):
je einmal ohne Kopfhörer, mit Bluetooth-Kopfhörern und mit Kabel-Kopfhörern —
Song starten, REC starten, 10 s, stoppen, Song weiterlaufen lassen, dann
beurteilen, ob die Wiedergabe **während** und **nach** der Aufnahme
schlechter klingt. Ergebnis in dieser Datei unter „3.6 Messergebnis"
festhalten.

### 3.3 R4 — Audioweg nach dem Aufnehmen reparieren

Nur bauen, wenn die Messung zeigt, dass die Rate wechselt oder der Klang nach
dem Stoppen schlecht bleibt (bei Bluetooth auf iOS ist beides zu erwarten).

Der Neuaufbau ist unvermeidlich aufwendig, weil
`ctx.createMediaElementSource(el)` pro Element und Kontext nur **einmal**
möglich ist: ein neuer Kontext braucht auch ein neues `<audio>`-Element.
Deshalb eine Funktion `rebuildAudioGraph()` in unmittelbarer Nachbarschaft
von `audioInit()`, die

1. den aktuellen Zustand sichert (`currentKey`, `blobUrl`, `Audio.position`,
   `Audio.playing`, `Audio.rate`, `Audio.loop`, `settings.channelMode`),
2. das alte Element pausiert, den alten Kontext schließt (`await ctx.close()`),
3. `Audio.ready = false` setzt und `audioInit()` erneut laufen lässt,
4. die Spur wieder lädt, an dieselbe Stelle springt und **nur dann** wieder
   startet, wenn vorher gespielt wurde,
5. `updateMediaSession()` und die Anzeige nachzieht.

Aufgerufen wird sie am Ende von `teardownRecording()` — aber **nur**, wenn
sich etwas geändert hat: eine frisch angelegte Sonde
(`new AudioContext()` → `sampleRate` lesen → sofort `close()`) mit
`Audio.ctx.sampleRate` vergleichen und nur bei Abweichung neu aufbauen. Ein
Neuaufbau bei jedem REC wäre eine hörbare Unterbrechung ohne Not.

Randbedingungen, die dabei nicht kaputtgehen dürfen:

- Läuft gerade eine REC-Vorschau (`audioPreview`), **nicht** neu aufbauen —
  erst nach `endRecordingPreview()`.
- Schlägt der Neuaufbau fehl, gilt dieselbe Regel wie in `audioInit()`:
  lieber ohne Kanal-Matrix weiterspielen als gar nicht. Fehler ins
  Diagnose-Log, kein Fehlerbanner für den Nutzer.
- `onAudioContextStateChange()` hängt am alten Kontext; der neue braucht den
  Listener wieder — er wird in `audioInit()` gesetzt, also automatisch, wenn
  Schritt 3 wirklich über `audioInit()` läuft.

### 3.4 R5 — Mikrofonwahl und Hinweis

- **Mikrofon:** Sind nach erteilter Erlaubnis `label`-Angaben verfügbar
  (Android/Chrome, Desktop), das eingebaute Mikrofon bevorzugen, statt das
  Headset-Mikrofon zu nehmen: passenden `audioinput`-Eintrag suchen und als
  `audio: { deviceId: { ideal: id }, echoCancellation: false, … }` anfordern.
  Damit bleibt die Bluetooth-Verbindung im Wiedergabeprofil und der Klang
  oben. `ideal` statt `exact`, damit ein verschwundenes Gerät die Aufnahme
  nicht verhindert. Auf iOS/Safari sind die Labels leer — dort ändert sich
  nichts, und das ist in Ordnung.
- **Hinweis:** Erkennt man beim Start einer Aufnahme ein Bluetooth-Gerät
  (Label enthält „Bluetooth"/„AirPods"/„BT" o. ä. — großzügig prüfen, nie
  darauf verlassen), einmalig ein Banner:
  „Bluetooth-Kopfhörer schalten beim Aufnehmen in den Telefonmodus — Ton und
  Aufnahme klingen dann dumpfer. Für gute Aufnahmen die Kopfhörer trennen."
  Einmal gezeigt, merkt sich das eine neue Einstellung
  (`btRecHintDismissed`), analog zu `placeholderHintDismissed`.
- **Bitrate:** `new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })`.
  Beseitigt die Kopfhörer-Frage nicht, hebt aber die Aufnahmequalität dort,
  wo der Browser sparsam voreingestellt ist. Fällt der Konstruktor damit auf
  die Nase, ohne Option erneut versuchen.

### 3.5 Ehrlich bleiben

Wenn die Messung zeigt, dass bei Bluetooth während der Aufnahme nichts zu
retten ist (sehr wahrscheinlich), dann steht das genau so im Hinweistext und
in dieser Datei — nicht kaschieren und nicht durch Filter „verbessern".

### 3.6 Messergebnis

*(Von dir auszufüllen, bevor R4/R5 committet werden.)*

---

## 4. R6 — Take-Karte im Player: eine Ebene statt drei

### 4.1 Was heute passiert (und weg soll)

Nach `stopRecording()` zeigt `renderPendingTake()` die Karte `#rec-pending`
mit „▶ Anhören / Speichern / Verwerfen". „Speichern" öffnet **erst**
`pickRecordingVoice()` (Auswahldialog), **danach** `promptDialog()` für den
Namen. Drei Ebenen für einen Handgriff, und der Name kommt zuletzt, obwohl
man ihn beim Aufnehmen schon im Kopf hat.

### 4.2 Zielbild (mit dem Nutzer abgestimmt, Variante „C1")

Der REC-Knopf bleibt, wo er ist, und wird nach dem Stopp zum **grünen
Play-Knopf**. Links davon die Stimme, rechts davon Verwerfen und Speichern
als runde Icon-Knöpfe. Darunter der Name, darunter die eingefrorene
Wellenform des Takes. **Kein Fortschrittsbalken.**

```
┌──────────────────────────────────────────────┐
│  ┌──────────────┐    ( ▶ )     ( 🗑 ) ( ✓ )  │   ← eine Zeile, Knopf mittig
│  │ ♪ Stimme   ▾ │    grün      rot   Akzent  │
│  └──────────────┘                            │
│  ┌────────────────────────────────────────┐  │
│  │ REC 3                                  │  │   ← editierbar, direkt
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ ▁▃▅▂▇▄▁▃▆▂▁▅▃▁▂▄▆▃▁▂                   │  │   ← eingefroren
│  └────────────────────────────────────────┘  │
│  1:12                       gerade aufgenommen│
└──────────────────────────────────────────────┘
```

### 4.3 Markup

`#rec-pending` samt Innerem ersetzen (die drei alten Knöpfe entfallen,
`#btn-rec-save`/`#btn-rec-discard` behalten ihre IDs, damit die Handler
erkennbar bleiben):

```html
<div class="rec-take" id="rec-take" hidden>
  <div class="take-row">
    <button class="voice-mini" id="btn-rec-take-voice" type="button" aria-label="Stimme zuordnen">
      <svg …Noten-Icon wie in .select-field…></svg>
      <span class="grow" id="rec-take-voice-label">Stimme</span>
      <span aria-hidden="true">▾</span>
    </button>
    <button class="rec-play" id="btn-rec-preview" type="button" aria-label="REC anhören">
      <svg id="icon-rec-play" …Dreieck…></svg>
      <svg id="icon-rec-pause" hidden …zwei Balken…></svg>
    </button>
    <div class="take-actions">
      <button class="take-icon take-icon--discard" id="btn-rec-discard" type="button" aria-label="REC verwerfen">…Papierkorb…</button>
      <button class="take-icon take-icon--save" id="btn-rec-save" type="button" aria-label="REC speichern">…Haken…</button>
    </div>
  </div>
  <label class="visually-hidden" for="rec-take-name">Name des RECs</label>
  <input class="take-name" id="rec-take-name" type="text" maxlength="60"
         autocomplete="off" autocorrect="off" spellcheck="false">
  <canvas class="take-wave" id="rec-take-wave"></canvas>
  <div class="rec-take-meta">
    <span id="rec-take-duration"></span>
    <span id="rec-take-hint">gerade aufgenommen</span>
  </div>
</div>
```

### 4.4 CSS

Direkt hinter den bestehenden `/* REC */`-Regeln, unverändert übernehmen:

```css
.rec-take {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 12px;
  margin: 6px 0;
}
.take-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
.take-actions { display: flex; gap: 6px; justify-content: flex-end; }

/* Der grüne Zwilling des REC-Knopfs — gleiche Größe, gleiche Position. */
.rec-play {
  width: 56px; height: 56px; flex: 0 0 auto; border-radius: 50%;
  border: 3px solid var(--ok); background: var(--surface);
  display: flex; align-items: center; justify-content: center;
}
.rec-play svg { width: 24px; height: 24px; color: var(--ok); }
.rec-play svg#icon-rec-play { margin-left: 3px; }  /* Dreieck optisch mitten */

.take-icon {
  width: var(--tap); height: var(--tap); border-radius: 50%; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); background: var(--surface); color: var(--text);
}
.take-icon svg { width: 22px; height: 22px; }
.take-icon--save { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.take-icon--discard { color: var(--danger); border-color: rgba(255,77,109,.45); }
/* Gesperrt, aber antippbar: der Tipp erklärt, was noch fehlt (siehe 5.3). */
.take-icon[aria-disabled="true"] { background: var(--surface-2); border-color: var(--line); color: var(--muted); }

.voice-mini {
  display: flex; align-items: center; gap: 6px; width: 100%; min-height: 40px;
  padding: 8px 10px; border-radius: 14px;
  border: 1px solid var(--line); background: var(--surface-2); color: var(--text);
  font-weight: 620; font-size: .86rem;
}
.voice-mini svg { width: 17px; height: 17px; color: var(--muted); flex: 0 0 auto; }
.voice-mini .grow { flex: 1; text-align: left; }
.voice-mini[data-empty="true"] .grow { color: var(--muted); }

.take-name {
  width: 100%; min-height: var(--tap); padding: 10px 14px; margin-top: 12px;
  border-radius: 14px; border: 1px solid rgba(var(--accent-rgb),.35);
  background: rgba(var(--accent-rgb),.07); color: var(--text);
  font-weight: 620; font-size: 15px;
}
.take-wave {
  display: block; width: 100%; height: 56px; border-radius: 12px; margin-top: 10px;
  background: var(--surface-2); border: 1px solid var(--pill-line);
}
.rec-take-meta { display: flex; justify-content: space-between; align-items: baseline; margin: 8px 2px 0; }
.rec-take-meta span { color: var(--muted); font-size: .82rem; font-variant-numeric: tabular-nums; }
```

Die alten `.rec-pending*`-Regeln ersatzlos entfernen — sie haben danach
keinen Nutzer mehr.

### 4.5 Verhalten

- `renderPendingTake()` heißt weiter so (der Name passt) und schaltet jetzt
  zwischen `#rec-controls` und `#rec-take` um. Beim Sichtbarwerden:
  Namensfeld mit `REC ${songRecordings.length + 1}` vorbelegen, Dauer
  schreiben, Stimme auf „keine" zurücksetzen, Wellenform zeichnen.
- **Der Name wird nicht überschrieben, solange die Karte offen ist.** Wer
  tippt, soll nicht durch ein Neuzeichnen (z. B. weil die Vorschau startet)
  seinen Text verlieren: `renderPendingTake()` setzt den Wert nur, wenn die
  Karte gerade erst aufgeht — Zustand in einer Variable `takeDraft`
  (`{ name, voice }`) halten, Eingabe- und Auswahl-Handler schreiben dort
  hinein.
- **Anhören:** `#btn-rec-preview` behält seine Rolle
  (`previewRecordingBlob(pendingTake.blob, { pending: true })`), zeigt aber
  statt Text die beiden SVGs; `updateRecPreviewButton()` schaltet nur noch
  `hidden` zwischen `#icon-rec-play` und `#icon-rec-pause` um und pflegt
  `aria-label` („REC anhören"/„REC pausieren"). Alle bestehenden Aufrufer
  dieser Funktion (`#btn-play`-Handler, `onPlaybackEnded`) bleiben gültig.
- **Stimme:** `#btn-rec-take-voice` ruft das vorhandene
  `pickRecordingVoice(takeDraft.voice)` auf — der Dialog bleibt, er ist nur
  nicht mehr Teil des Speicherwegs. Ergebnis in `takeDraft.voice`, Beschriftung
  `VOICE_LABEL[v]` bzw. „Stimme" mit `data-empty="true"`.
- **Speichern:** `#btn-rec-save` schreibt **ohne jeden Dialog** — genau der
  bisherige Code ab `const { blob, mimeType, duration } = pendingTake;`, nur
  mit `name` aus dem Feld (leer → Vorschlag) und `voice` aus `takeDraft`.
- **Verwerfen:** `#btn-rec-discard` behält den `confirmDialog`. Das ist die
  einzige Stelle, an der ein Fehltipp Daten kostet.
- **Tastatur/Bedienhilfen:** Nach dem Stopp den Fokus auf das Namensfeld
  setzen — dann kann man sofort tippen, ohne zu zielen. Alle Icon-Knöpfe
  behalten `aria-label`, alle Trefferflächen ≥ 44 px (`--tap`).

### 4.6 Eingefrorene Wellenform

`levelHistory` enthält heute nur so viele Spalten, wie auf den Bildschirm
passen (`pushLevelColumn` wirft vorne heraus). Für die Karte soll die
**ganze** Aufnahme zu sehen sein, also:

- zweites Feld `levelTakeHistory` mitschreiben, das nichts wegwirft (Deckel
  bei 20 000 Spalten ≈ 27 Minuten; ist er erreicht, jede zweite Spalte
  verwerfen und ab da nur noch jede zweite anhängen — die Form bleibt, der
  Speicher bleibt begrenzt).
- `setupLevelCanvas()` und `drawLevelHistory()` so umbauen, dass sie Canvas
  und Spaltenliste als Argument bekommen, statt `#rec-meter-canvas` und
  `levelHistory` fest zu verdrahten. Der Live-Pegel ruft sie wie bisher, die
  Karte einmalig mit `#rec-take-wave` und den auf die Canvasbreite
  zusammengefassten Spalten (je Bucket das Maximum von `amp`, `clipping`
  wenn eine Spalte im Bucket übersteuert war).
- `stopLevelMeter()` darf `levelTakeHistory` **nicht** löschen — es wird erst
  beim nächsten `startLevelMeter()` bzw. beim Verwerfen/Speichern des Takes
  zurückgesetzt.
- Kein Abspielkopf, kein Fortschrittsbalken (ausdrücklicher Wunsch).

---

## 5. R7/R8 — Allgemeine Aufnahmefunktion

### 5.1 Zielbild (mit dem Nutzer abgestimmt)

Links neben dem Würfel auf dem Songs-Bildschirm ein roter REC-Knopf. Er
öffnet eine eigene Vollbild-Ansicht (wie der Import) mit großem
Aufnahmeknopf, Uhr und Pegelanzeige. Nach dem Stopp erscheint **dieselbe
Take-Karte wie im Player**, darunter „Song wählen" mit Suchfeld und Songliste.
**Kein Song ist vorausgewählt**, der Speichern-Knopf ist gesperrt; ein Tipp
darauf erklärt, was fehlt. Findet die Suche nichts, lässt sich der Titel wie
auf dem Songs-Bildschirm als neues Lied anlegen.

### 5.2 R7 — Gerüst

**Knopf** in `.searchbar`, unmittelbar **vor** `#btn-feeling-lucky`:

```html
<button class="rec-global-btn" id="btn-rec-global" type="button"
        aria-label="Aufnehmen" data-i18n-aria="songs.recordAria">
  <span class="rec-global-dot" aria-hidden="true"></span>
</button>
```

```css
.rec-global-btn {
  min-width: var(--tap); min-height: var(--tap); border-radius: 50%; flex: 0 0 auto;
  border: 2px solid var(--danger); background: var(--surface);
  display: flex; align-items: center; justify-content: center;
}
.rec-global-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--danger); }
```

Schlüssel `songs.recordAria` in `de`/`en`/`pl` ergänzen („Aufnehmen" /
„Record" / „Nagraj").

**Ansicht** nach dem Vorbild von `#import-view` (gleiche Klasse `player`,
gleicher Kopf mit Zurück-Pfeil), am Ende der Vollbild-Ansichten im Markup:
`<section class="player" id="recorder-view" hidden aria-labelledby="recorder-title">`
mit `#recorder-back`, `#recorder-title` und einem Rumpf, der zwei Zustände
kennt:

- `#recorder-idle`: großer REC-Knopf (`.rec-btn`, 84 px), darunter ein Satz
  Erklärung, darunter Uhr und `.rec-meter`, sobald es läuft — dieselben
  Bausteine wie im Player, nur größer.
- `#recorder-take`: die Take-Karte aus R6 plus den Abschnitt „Song wählen".

**Route:** `#recorder`, exakt nach dem Muster von `#import` in
`applyRoute()`: eigener `recorderOpen`-Zustand, `openRecorderView()`,
`closeRecorderView()`, Zurück-Knopf ruft `history.back()`. Vor dem Öffnen
der Ansicht die anderen Vollbild-Ansichten schließen, wie es der
`import`-Zweig vormacht.

**Eine Aufnahme zur Zeit.** Die Aufnahme-Zustände (`recStream`,
`recMediaRecorder`, `pendingTake`, …) bleiben Einzelstücke; sie bekommen nur
ein Ziel: eine Variable `recHost` (`'player'` oder `'recorder'`), die
`setRecUI()`, `renderPendingTake()` und die Pegelanzeige auf die richtigen
Knoten zeigen lässt. Daraus folgen zwei Sperren:

- `startRecording()` aus dem einen Ort, während der andere aufnimmt oder
  einen ungespeicherten Take hält → `banner('Es läuft schon eine Aufnahme.', { kind: 'error' })`
  und abbrechen.
- Verlässt man die Aufnahme-Ansicht, während aufgenommen wird oder ein Take
  offen ist, gilt dieselbe Regel wie beim Songwechsel im Player
  (`openPlayer()`): abbrechen bzw. verwerfen **mit Banner**, das sagt warum.
  Beim bewussten Tipp auf den Zurück-Pfeil vorher `confirmDialog` — dort ist
  Zeit zu fragen, bei einem Routenwechsel von außen nicht.
- Der Wachhalte-Mechanismus (`updateWakeLock()`) soll auch hier greifen,
  solange aufgenommen wird — sonst schaltet sich der Bildschirm mitten in
  der Probe ab und iOS beendet die Aufnahme.

### 5.3 R8 — Zuordnung beim Speichern

**Songliste.** Der Auswahlteil ist die Songliste, nicht ein Dialog:

```html
<p class="section-title">Song wählen</p>
<input class="search-input" id="rec-song-search" type="search" placeholder="Song suchen …">
<div id="rec-song-list"></div>
```

Gezeichnet wird sie von einer neuen Funktion `renderRecSongPicker()`, die
sich die Auswahl- und Platzhalter-Logik mit `renderSongs()` **teilt**, statt
sie zu kopieren: Ziehe die beiden Teile aus `renderSongs()` heraus, die
gebraucht werden —

1. das Filtern nach Suchbegriff (inklusive `normalizeTitle`-Vergleich) als
   `filterSongsByQuery(songs, query)`,
2. die Bedingung „kein Song trägt exakt diesen Titel" als
   `canCreatePlaceholderFor(songs, rawQuery)`

— und rufe sie an beiden Stellen auf. Verhält sich `renderSongs()` danach
anders als vorher, ist die Extraktion falsch.

Jede Zeile ist ein `.list-item`-Knopf; die gewählte trägt
`aria-pressed="true"` (Akzentrand über
`.song-pick-list .list-item[aria-pressed="true"] { border-color: var(--accent); background: rgba(var(--accent-rgb),.09); }`)
und rechts einen Haken. Gibt es keinen Treffer, steht oben die Zeile
„»…« als neues Lied anlegen" mit dem Hinweis „verbindet sich beim nächsten
Import automatisch" — sie ruft `createPlaceholderSong(rawQuery)` und wählt
den entstandenen Song direkt aus.

**Gesperrtes Speichern.** Solange `takeDraft.songId` leer ist, trägt
`#btn-rec-save` `aria-disabled="true"` — **nicht** das `disabled`-Attribut:
ein gesperrter Knopf löst überhaupt kein `click` aus, der erklärende Hinweis
käme also nie. Der Handler prüft als Erstes:

```js
if (!takeDraft.songId) {
  banner('Bitte zuerst einen Song wählen — dann lässt sich der REC speichern.');
  $('#rec-song-search').scrollIntoView({ block: 'center', behavior: 'smooth' });
  return;
}
```

**Speichern** schreibt denselben Datensatz wie im Player
(`type: 'recording'`, `songId`, `songTitle`, `name`, `voice`, `fileKey`,
`mimeType`, `duration`, `size`, `createdAt`) — die Felder sind schon dafür
gebaut, dass ein REC seinen Song über den Titel wiederfindet
(`reconnectPendingRecordings()`). Danach: Banner „REC gespeichert.",
`history.back()`, und falls der Player gerade denselben Song zeigt,
`loadSongRecordings()` — sonst fehlt der neue Eintrag im Loops-Reiter, bis
man den Song erneut öffnet.

**Namensvorschlag** hier ohne Songbezug: `REC` plus Datum, z. B.
`REC 2.9.` — die laufende Nummer aus dem Player (`songRecordings.length + 1`)
gibt es an dieser Stelle noch nicht, weil der Song erst später feststeht.

---

## 6. R9 — Selbsttests und Abnahme

In `runSelfTests()` (synchron, reine Funktionen — im Stil der vorhandenen
Prüfungen) ergänzen:

1. `isPlayableSong`: `{ tracks: [] }` → falsch, `{ tracks: [{}] }` → wahr,
   `null` → falsch.
2. Die Auswahl des nächsten Eintrags in einer Setliste. Dazu die Schleife aus
   `playlistAdvance()` als reine Funktion herausziehen
   (`nextPlayableIndex(items, from)` → Index oder −1) und mit einer Liste aus
   drei Einträgen prüfen, in der nur der mittlere `playable` ist: aus jedem
   Startpunkt muss der mittlere herauskommen, und bei keinem einzigen
   abspielbaren Eintrag `-1`.
3. `filterSongsByQuery` findet den Song mit abweichender Groß-/Kleinschreibung
   und liefert bei leerer Suche alles zurück.
4. Die Bucket-Bildung der eingefrorenen Wellenform: 100 Spalten auf 10 Buckets
   → 10 Werte, und das Maximum je Bucket bleibt erhalten.

Danach `SW_VERSION` in `sw.js` von `'v101'` auf `'v102'` heben — einmal, im
selben Commit wie die Selbsttests.

**Abnahme von Hand** (jeder Punkt einmal auf dem Handy, nicht nur am
Schreibtisch):

- [ ] Shuffle läuft 20 Titel durch, ohne stehen zu bleiben; Platzhalter
      kommen nie dran.
- [ ] Eine Setliste mit einem Platzhalter mittendrin läuft durch.
- [ ] Nach einem übersprungenen Platzhalter startet **kein** von Hand
      geöffneter Song ungefragt (`pendingAutoPlay`).
- [ ] REC im Player: Stopp → Name tippen → Stimme wählen → anhören →
      speichern, ohne dass ein Dialog aufgeht; der Eintrag steht danach in
      der Liste.
- [ ] Verwerfen fragt nach; Songwechsel während einer laufenden Aufnahme
      bricht sie mit Banner ab (bestehendes Verhalten, darf nicht kaputtgehen).
- [ ] Allgemeiner Recorder: aufnehmen, Speichern ist gesperrt, Tipp darauf
      erklärt es, Song wählen, speichern — der REC taucht im Player dieses
      Songs auf.
- [ ] „… als neues Lied anlegen" erzeugt den Platzhalter und ordnet zu.
- [ ] Aufnahme läuft, Bildschirm bleibt an; Zurück fragt nach.
- [ ] Diagnose-Log enthält die Werte aus 3.2; Ergebnis steht in 3.6.
- [ ] Selbsttests melden in der Konsole „alle bestanden".

---

## 7. Was ausdrücklich **nicht** Teil des Auftrags ist

- Keine Übersicht „alle RECs" in den Einstellungen. Die Zuordnung ist
  Pflicht, notfalls an einen Platzhalter — damit ist jeder REC über seinen
  Song auffindbar, und es braucht keinen zweiten Ort dafür.
- Kein Schneiden, kein Trimmen, keine Effekte, keine Aufnahme im Hintergrund
  bei geschlossener App.
- Keine Änderung an Backup-Format oder Export (`exportRecording`,
  `importRecordingFile` bleiben, wie sie sind — der Datensatz ändert sich
  nicht).
- Kein Umbau der Kanal-Matrix über das in 3.3 Beschriebene hinaus.
