# Arbeitsanweisung für Claude Code – Audio freigeben, wenn nichts klingt

Du bist erfahrener Web-Audio-Entwickler. Ziel: Die App soll andere Apps
(YouTube, Spotify, Bluetooth-Kopfhörer) nicht stören, solange sie selbst
nichts abspielt. Bestehendes Wiedergabeverhalten bleibt erhalten.

Antworte und kommentiere auf Deutsch.

**Diese Anweisung läuft unbeaufsichtigt.** Stelle keine Fragen und warte auf
keine Freigabe. Wo etwas unklar ist: die konservativste Variante wählen
(weniger ändern, bestehendes Verhalten erhalten), im Bericht begründen,
weitermachen.

---

## Hintergrund (Befund, Stand `af26dd6`)

1. **AudioContexts werden nie angehalten.** `Audio.ctx` (app.js,
   `ensure…`/Aufbau um Z. 4902, `latencyHint: 'playback'`) läuft nach
   `audioPause()` (Z. 6720) weiter. Ebenso die Engines in `metronom.html`
   (Z. 635), `einsingen.html` (Z. 1061), `piano.html` (Z. 219),
   `licks.html` (Z. 1149), `uebe-lab.html` (Z. 3060). Ein laufender Kontext
   hält – vor allem unter iOS – die Audio-Sitzung der Seite offen: andere
   Apps werden unterbrochen, Bluetooth-Kopfhörer bleiben „belegt“ oder
   handeln die Verbindung neu aus.
2. **Mediensteuerung bleibt bei der App.** `audioPause()` und der Play-Knopf
   setzen `mediaSession.playbackState = 'paused'`; freigegeben (`'none'`,
   `metadata = null`) wird erst beim Verlassen des Players (um Z. 10545).
   Solange der Player offen ist, können Kopfhörertasten/Sperrbildschirm an
   die App statt an YouTube gehen.
3. **Mikrofon:** `preferBuiltInMic` (licks.html Z. ~1525, uebe-lab.html
   Z. ~9760) fällt notfalls auf das Headset-Mikro zurück – das schaltet
   Bluetooth-Kopfhörer in den Telefonie-Modus (dumpfer Mono-Klang, auch in
   anderen Apps). Das ist gewollt, aber das Mikro muss garantiert wieder
   freigegeben werden, sobald es nicht mehr gebraucht wird.

## 0. Vorbereitung

1. `git fetch origin`, dann `git checkout -b audio-freigabe af26dd6`.
   Nie auf `main` committen, nie mergen, nie force-pushen. Ist `main`
   inzwischen weiter: `git diff --stat af26dd6 origin/main` im Bericht unter
   „Konflikte mit main“ auflisten, nicht selbst auflösen.
2. `CLAUDE.md` und `README.md` vollständig lesen.
3. Diese Datei im ersten Commit unter `docs/` mit einchecken.

## 1. Feste Regeln

- **Ein Paket = ein Commit**, danach sofort `git push -u origin audio-freigabe`.
- **SW_VERSION** in `sw.js` bei jedem Commit um eins erhöhen (Stand `v528`).
  Vor dem Commit `git diff --cached --stat` gegen die Liste in `CLAUDE.md`
  prüfen.
- Keine neuen Abhängigkeiten, kein Bundler. Keine gespeicherten Felder
  ändern, `DATA_VERSION` nicht anfassen.
- **Safari-Geste nicht brechen:** In `audioPlay()` bleibt `el.play()` der
  erste Aufruf ohne vorheriges `await`. `resume()` kommt wie bisher danach
  (`audioResumeContext()`). In den Engines bleibt `start()` der Ort, an dem
  `resume()` passiert.
- `suspend()`/`resume()` immer mit `.catch(() => {})` bzw. try/catch und
  `dlog(...)`, niemals eine Nutzerfehlermeldung für ein fehlgeschlagenes
  `suspend()`.
- `close()` nur dort, wo es heute schon passiert. Neu wird nur
  **suspendiert**, nicht geschlossen (Neuaufbau ist teuer und auf iOS
  heikel, siehe Kommentare um Z. 11120/11849).

## 2. Pakete

### Paket A – Haupt-Player: Kontext bei Pause anhalten

1. Neue Funktion `audioSuspendContextIfIdle(reason)` in app.js: suspendiert
   `Audio.ctx`, wenn `!Audio.playing`, keine REC-Aufnahme läuft, keine
   REC-Vorschau (`audioPreview`) läuft, kein Pegelmesser am Kontext hängt
   (`levelCtx === Audio.ctx` mit aktivem Stream) und kein Neuaufbau läuft
   (`audioRebuildInFlight`). Sonst nichts tun. Immer `dlog('audio:suspend',
   { reason, done })`.
2. Aufruf mit kurzer Verzögerung (Konstante `AUDIO_IDLE_SUSPEND_MS = 3000`,
   Timer bei jedem Play/Pause neu setzen) aus `audioPause()` und aus dem
   Song-Ende-Pfad (`playback:ended`). Vor dem Suspend erneut prüfen, ob
   inzwischen wieder gespielt wird.
3. Im `visibilitychange`-Handler (Z. 7232): beim Wechsel nach `hidden`
   sofort `audioSuspendContextIfIdle('hidden')`.
4. Prüfen, dass `onAudioContextStateChange()` einen absichtlich
   suspendierten Kontext **nicht** wieder anwirft (es tut nur etwas bei
   `Audio.playing` – bestätigen, nicht ändern). Prüfen, dass
   `repairSuspectAudioGraph`/`rebuildAudioGraph` mit einem suspendierten
   Kontext korrekt umgehen; der Health-Monitor (`hdHealthTick`,
   `audio:stall`) darf einen absichtlich angehaltenen Kontext nicht als
   Degradation werten. Falls doch: Flag `Audio.ctxSuspendedByUs` setzen und
   dort berücksichtigen.
5. HD-/Slow-Modus (Zeitdehner-Worklet) mittesten: Pause → 5 s warten →
   Play muss nahtlos an derselben Position weiterlaufen.

### Paket B – Haupt-Player: Mediensteuerung nach längerer Pause freigeben

1. Kurze Pausen behalten `playbackState = 'paused'` (Sperrbildschirm-
   Steuerung zum Weiterhören bleibt erhalten).
2. Neue Konstante `MEDIA_SESSION_RELEASE_MS = 5 * 60 * 1000`. Ist so lange
   pausiert worden (oder Seite seit 60 s `hidden` und pausiert):
   `playbackState = 'none'`, `metadata = null`, alle Action-Handler auf
   `null` setzen. Position und geladener Song bleiben unangetastet.
3. Beim nächsten Play über den bestehenden Pfad (`updateMediaSession()`)
   alles wieder registrieren. Prüfen, dass Kopfhörer-Play nach der Freigabe
   die App **nicht** mehr startet und dass Play in der App alles
   wiederherstellt.
4. Im Bericht festhalten: Auf iOS behält ein pausiertes `<audio>`-Element
   mit `src` den Eintrag „Jetzt läuft“ ggf. trotzdem; `src` wird bewusst
   **nicht** entfernt (das wäre `audioReset()`-Verhalten).

### Paket C – Unterseiten: Engines im Leerlauf anhalten

Für `metronom.html`, `einsingen.html`, `piano.html`, `licks.html`,
`uebe-lab.html` je:

1. `engine.idle()` (bzw. passend benannt) ergänzen: suspendiert `ctx`, wenn
   nichts läuft – kein Lauf/Takt, kein Drone (`ui.drone`), kein aktives
   Mikrofon, keine klingenden Stimmen. Die Bedingungen je Seite aus dem
   vorhandenen Zustand ableiten; im Zweifel nicht suspendieren.
2. Aufruf nach jedem Stop mit `ENGINE_IDLE_SUSPEND_MS = 20000` (Klavier und
   Licks sollen bei schnellem Weiterspielen keine Anlaufverzögerung haben)
   und sofort bei `visibilitychange` → `hidden`, wenn nichts läuft.
3. `start()` resumiert bereits – bestätigen. In `piano.html` wird `resume()`
   nicht abgewartet: prüfen, dass der erste Ton nach einem Suspend nicht
   verschluckt wird; falls doch, Noten erst nach `resume()` planen.

### Paket D – Mikrofon garantiert freigeben

1. In `licks.html` und `uebe-lab.html` sicherstellen, dass `micStop()` bzw.
   das Gegenstück bei `visibilitychange` → `hidden`, bei `pagehide` und beim
   Bereichswechsel aufgerufen wird. Vorhandene Handler (licks Z. 2689/2693,
   uebe-lab Z. 5197, 13571, 14218, 14622) prüfen und lückenlos machen.
2. In app.js dasselbe für `recStream` und den Pegelmesser prüfen
   (Z. ~12037/12050): beim Verlassen der Aufnahme-Oberfläche und bei
   `pagehide` alle Tracks stoppen.
3. Fallback aufs Headset-Mikro bleibt. Nur wenn das Headset tatsächlich
   genutzt wird, einmalig einen dezenten Hinweis zeigen (vorhandenes
   `banner()`/Textmuster nutzen, Text in `strings.js`): „Das Mikro des
   Kopfhörers wird benutzt – andere Apps klingen solange dumpfer.“

## 3. Tests

- `runSelfTests()` in app.js und `uebeLab.selfCheck()` müssen grün sein.
- Neue Selbsttests (ohne echten AudioContext, mit Spionen wie bei den
  bestehenden `testWithGlobal`-Tests): `audioSuspendContextIfIdle` suspendiert
  nur im Leerlauf; Play nach Suspend ruft `resume()`; Timer wird bei erneutem
  Play verworfen; Media-Session-Freigabe nach Ablauf und Wiederherstellung
  bei Play.
- Manuelle Prüfliste in den Bericht schreiben (für morgens auf echten
  Geräten, iOS und Android, mit Bluetooth-Kopfhörern):
  1. Song abspielen, pausieren, 10 s warten, zu YouTube wechseln → YouTube
     spielt ungestört, Kopfhörertasten steuern YouTube (nach 5 min sicher).
  2. Zurück in die App, Play → Song läuft an derselben Position weiter,
     auch im HD-/Slow-Modus.
  3. Metronom/Klavier/Licks/Übe-Lab: stoppen, App wechseln → YouTube
     ungestört. Zurück, Start → erster Ton kommt.
  4. Mikro-Übung mit Bluetooth-Kopfhörer starten und beenden → YouTube
     klingt danach wieder normal (Stereo, voller Klang).

## 4. Bericht

`docs/BERICHT-AUDIO-FREIGABE.md`: je Paket was geändert wurde (Datei,
Funktion), was bewusst nicht geändert wurde und warum, offene Risiken,
„Konflikte mit main“, die manuelle Prüfliste. Bericht im letzten Commit
mitpushen.
