# Arbeitsanweisung: UI-Korrekturen, „Einsatz finden“ Etappe 3, echte Instrumente

Für eine neue Claude-Code-Sitzung (Opus). Erst diese Datei lesen, dann
`CLAUDE.md`, dann `BERICHT-EINSATZ-FINDEN-SONGS.md` (Stand bis v487) und
`ARBEITSANWEISUNG-EINSATZ-FINDEN-SONGS.md` (Gesamtkonzept, Etappen 1–5).
Branch: `claude/affectionate-archimedes-75nl5c` (PR #168), weiter darauf
arbeiten.

Umfang: mittel bis groß. In **drei Teilen** arbeiten, Reihenfolge A → B → C.
Nach jedem Teil (bei A ruhig nach jedem Punkt) testen, committen, pushen,
`SW_VERSION` erhöhen.

---

## Teil A – kleine UI-Korrekturen (Wünsche der Nutzerin)

Alles in `uebe-lab.html`.

### A1 „Akkorde in der Tonart“: Tonart-Zeile und Unterzeile weg, zwei Knöpfe

Heute (Modus `chordInKey`, vor der Antwort):
- `renderKeyRow(task)` (Suche: „Zeile über der Aufgabe (Töne/Akkorde in der
  Tonart)“) zeigt den hellblauen Balken `.key-row` mit „Dur“/„Moll“ (nach der
  Antwort „C-Dur · I = C“) und rechts den Knopf „Kadenz“ (`data-ear="inkey-cadence"`).
- Darüber steht in `.ear-sub` „Dur · nach der Kadenz“ (Suche:
  `task.cadence ? 'nach der Kadenz' : 'Tonart wie eben'`, der Zweig mit
  „Welcher Akkord war das?“).

Gewünscht – **nur für „Akkorde in der Tonart“**:
- Der blaue Balken mit „Dur/Moll“ entfällt, ebenso die Unterzeile
  „Dur · nach der Kadenz“.
- Stattdessen nur eine **Anzeige, wenn etwas spielt** (z. B. dieselbe
  Wellen-Animation wie bei „Einsatz finden“ bzw. die Phase „Hören“ der
  Phasenleiste – solange `earPhaseIndex() === 0`), sonst ruhig.
- Darunter **zwei Knöpfe**: „**Akkord nochmal**“ (nur der Zielakkord, ohne
  Kadenz – vorhandene Aktion `inkey-target`, heute in den Hilfen als „Nur den
  Akkord“) und „**Alles nochmal**“ (Kadenz + Akkord wie beim ersten Hören;
  vorhandene Wiedergabe der Aufgabe, vgl. `inkey-cadence` und `playEar`).
  Beides zählt wie bisher (prüfen, ob „Nur den Akkord“ heute „mit Hilfe“
  zählt – dann so lassen).
- Nach der Antwort darf die Tonart (z. B. „C-Dur“) weiter in der Auflösung
  stehen, wenn sie dort heute sinnvoll ist – aber nicht als blauer Balken über
  der Aufgabe. Im Zweifel: nach der Antwort eine schlichte Textzeile.
- „Töne in der Tonart“ (`noteInKey`) **nicht** ändern (teilt sich Code mit
  chordInKey – sauber nach `task.kind` trennen).
- Selbsttests anpassen: `chordInKeyCheck()` prüft heute
  `/^Dur · nach der Kadenz/` in `.ear-sub` und die Tonart-Zeile (Suche
  „Tonart-Zeile vor der Antwort“). Für chordInKey auf das neue Verhalten
  umstellen, für noteInKey unverändert lassen.

### A2 „Einsatz finden“: Überschrift nur „Hör zu …“ / „Jetzt du!“

Heute (Suche: „Überschrift nach der Aufgabe: „Wo ist die Eins?“ nur“ in
`renderEar`, Zweig `ear.mode === 'downbeat'`): `.ear-prompt` wechselt je nach
Phase und Muster („Hör zu – dann klatsch: 1 und 4“, „Jetzt klatschen: …“,
„Wo ist die Eins?“ …), `.ear-sub` zeigt „Songname · Stil · 4/4 · kein
Einzähler“.

Gewünscht: Überschrift **und** Unterüberschrift ersetzen durch
- Phase `listen` (und `idle`/`wait`): „**Hör zu …**“
- Phase `you`: „**Jetzt du!**“
- Phase `done`: Standard: „Geschafft!“ bzw. „Noch nicht“ (passend zu
  `task.answer.ok`), darunter klein Songname · Stil · Taktart (das
  Wiedererkennen der Songs ist gewollt). Unterüberschrift während des Laufs
  leer bzw. ausgeblendet – ohne dass das Gerüst springt (der Selbsttest
  „Gerüst vor dem Start verschoben“ in `downbeatCheck` misst die Positionen).
- Die Phasenleiste (Hören · Du · Lösung) bleibt.

### A3 „Einsatz finden“: Zeile „Klatsch: 1 und 2+ (Charleston)“ weg

In `downbeatPatternHtml(task)` die Zeile `<p class="db-cap">Klatsch: <b>…</b></p>`
entfernen (überflüssig, die Zählzeiten-Reihe darunter zeigt das Muster schon).
CSS `.db-cap` aufräumen. Das `aria-label` der Reihe (`Muster: …`) behalten.

### A4 „Einsatz finden“: Knopf „Weiter“ (Beat überspringen) neben „Nochmal“

In der Fußleiste (`.db-round`, Knöpfe `db-again` ↻ und `db-helps` ?) einen
Knopf zum **Überspringen** ergänzen: neuer Song, ohne Wertung.
- Immer verfügbar, sobald es eine Aufgabe gibt und sie noch nicht aufgelöst
  ist (danach gibt es schon `.db-next` „Weiter“).
- Läuft gerade ein Lauf: stoppen (`clearEarTimers()`, `engine.fadeBus(ear.bus)`),
  dann `nextEar()` bzw. dieselbe Logik wie „Weiter“, aber **ohne**
  `finishEarAnswer`, ohne Eintrag in die Serie/Stufen-Statistik, ohne
  `report(...)`.
- Das Abwechslungs-Gedächtnis (`ear.dbLog`) bekommt den übersprungenen Song
  trotzdem (sonst kommt er gleich wieder).
- Symbol: Pfeil nach rechts / „⏭“, `aria-label="Überspringen"`, Titel
  „Weiter (überspringen)“. Platz: `.db-round` ist `justify-content:
  space-between` mit zwei Knöpfen – Layout so anpassen, dass ↻ und ⏭
  nebeneinander links stehen, ? rechts (oder wie es bei 390 px sauber passt).
- Selbsttest: Überspringen ändert `ear.stats.downbeat` nicht, erzeugt eine
  neue Aufgabe mit anderem Song, `dbRun` ist danach `null`.

### A5 „Körper“ → „Body Percussion“, Körper und „Wieder einsetzen“ ausgrauen

- Sichtbarer Name `Körper` → „**Body Percussion**“: `EAR_MODES`
  (`['body', 'Körper']`), Überschriften, Hilfetexte, `MODE_TEXT`, alles was die
  Nutzerin sieht. Interne IDs (`body`, `BODY_*`, `bodyShift`, Ablage) bleiben.
  Selbsttests, die den Namen prüfen, anpassen.
- In der Rhythmus-Übersicht (`rhythmHubHtml`, Zeilen über `kRowHtml(...
  'data-downbeat-open' ...)`) die Zeilen **Body Percussion** und **Wieder
  einsetzen** ausgrauen und mit einem kleinen Hinweis „noch in Arbeit“
  versehen – **weiter anklickbar und ausprobierbar**. Also nur Optik (z. B.
  gedämpfte Farbe, Badge „in Arbeit“), kein `disabled`, `aria-label` um
  „(noch in Arbeit)“ ergänzen. Kontrast des Hinweistexts ≥ 4,5 : 1.
- Die Üben-Kachel der App zählt „Körper“ in den Rhythmus-Fortschritt mit
  (`app.js`, Suche „Körper (Übe-Korrekturen 11)“). Standard: **unverändert
  lassen** (keine Änderung an `app.js` nötig).

---

## Teil B – Etappe 3: Stufen 3, 5, 6 auf Songs

Hintergrund: Die Nutzerin findet die Song-Tracks „richtig gut und raffiniert“,
die alten Grooves der Stufen 3, 5, 6 („Pop-Groove“ usw.: nur Schlagzeug und
ein Basston je Takt) „maximal unterkomplex“. Ziel: alle Stufen aus dem
Song-Katalog.

### Stand im Code (v487)

- `DOWNBEAT_LEVELS`: Stufen 1, 2, 4 tragen `songs: true` (Muster/Bass/Einstieg
  wie `SONG_LEVELS`), 3, 5, 6 noch `grooves: [...]` (alte `DB_GROOVES`).
- Songs: `makeSongTask`, `songCombos`, `songPool`, `songPatterns`, `songBass`,
  `dbFeel(task)` (Swing aus `song.drums.swing`), `songVoices`, `songPlan`
  (über `downbeatPlan` aufgerufen), `songFinaleEvents`, `playDownbeatEvent`
  (alle Song-Klänge), `scheduleSoon` (Klänge portionsweise ≈ 1,5 s im Voraus).
- Daten: `DB_SONGS` (48), `SONG_LEVELS` (8), Referenzfunktionen inline,
  Quelle `docs/einsatz-finden/` (Songs nur in `gen/songs-src.mjs` ändern,
  `node docs/einsatz-finden/gen/build.mjs`, dann den Block in `uebe-lab.html`
  neu einsetzen – im Bericht steht, wie umbenannt wurde).
- Muster `hemi68`, `one128`, `back128` stehen schon in `DB_PATTERNS`.
  `METERS['12/8']` gibt es (72 Ticks, `beat: 6`, `ref: 18`).
- Selbsttest `songDownbeatCheck()` (alle Songs fair, Planer je Song der
  Song-Stufen, Abwechslung, Wertung, Ablage) und `downbeatCheck()` (alte
  Grooves, filtert `grooveLevels = DOWNBEAT_LEVELS.filter((x) => !x.songs)`).

### Umsetzen

1. Stufen 3, 5, 6 auf `songs: true` umstellen, Label/Muster/Bass/Einstieg aus
   `SONG_LEVELS` (3 „Dreier: Walzer und 6/8“, 5 „Falsche Fährten“, 6
   „Halftime, Shuffle, 12/8“). Song-Pools (aus den Daten):
   - Stufe 3: leiserwalzer, kerzenschein, seemannsgarn, dachboden, zuckerwatte,
     abschlussball, anlauf (3/4 und 6/8).
   - Stufe 5: schwarzweiss, tanzverbot, discokugel, holzfaeller, vorstadtfunk,
     auftakthymne, neonlicht, bahnsteig, mitsingrefrain (falsche Fährten:
     Four-on-the-floor, vorgezogener Bass, Auftakt, Riff mit Anlauf).
   - Stufe 6: vorstadtfunk, neonlicht, bruecke, rueckspiegel (Shuffle),
     wolkenkratzer (12/8), gegenwind, katerstimmung (Shuffle), doppeltezeit.
2. **Stufe 3 Taktart reihum:** Die alte Stufe 3 hatte `rotateMeters` (3/4 und
   6/8 abwechselnd). Für Songs übernehmen: in `makeSongTask` nach der Taktart
   des letzten Songs die andere bevorzugen (über `narrow`).
3. **Einstieg auf „und“ (Stufen 5, 6, `starts: 'eighths'`):** `makeSongTask`
   kann das schon (`step = 6` bei geraden Songs, im Shuffle `m.beat`). Prüfen.
4. **12/8 vollständig:** `downbeatCells` (Zählzeiten-Anzeige; 6/8 heißt heute
   1–6) für 12/8 = 1–12 bzw. vier Gruppen; `downbeatBarsHtml` (Auflösung,
   `beats`); `judgeDownbeat` (Verschiebungs-Suche: in 6/8/12/8 in Achteln);
   `downbeatMessage` (6/8-Zweig auch für 12/8); `tempoSymbol` (♩. bei `ref 18`)
   und die Tempo-Beschriftung am BPM-Knopf.
5. **Achtel-Verschiebung in der Wertung:** `judgeDownbeat` prüft eine
   Verschiebung um eine Achtel heute nur bei `task.level === 6`. Für Songs:
   bei allen Stufen mit `starts: 'eighths'` (5, 6) und geraden 4/4-Songs.
6. **Halbe-Anzeige** (`DB_HALF_FROM = 140`, `task.half`): gilt sinnvoll nur
   im 4/4. **seemannsgarn** (3/4, ♩ 144–160) darf nicht in Halben angezeigt
   werden – Regel auf `meter === '4/4'` einschränken (Test ergänzen).
7. „Bass dazu“, „Eins betonen“, „Vormachen“, „Lösung“ funktionieren schon
   über `songPlan`. Prüfen, dass `noBassLevels` richtig greift.
8. Wenn danach **keine Stufe mehr `grooves` nutzt**: `DB_GROOVES`,
   `dbLevelBpm`, Groove-Zweig in `downbeatPlan`, `DB_BASS_STEPS`, `dbCombos`-
   Groove-Teil, Groove-Tests in `downbeatCheck` entfernen bzw. auf Songs
   umschreiben. Achtung: `downbeatCheck` nutzt `base = { groove: 'pop' … }`
   für viele allgemeine Tests (Zeitplan, Wertung, Ablauf, Gerüst) – die auf
   eine Song-Aufgabe umstellen, nicht einfach löschen. `restore` muss alte
   `dbLog`-Einträge mit `groove` weiter vertragen (verwerfen ist ok).
9. Gespeicherte Stufen: alte Stufe 5 „Synkopen klatschen“ und 6 „Synkopen,
   Start auch auf und“ bedeuten jetzt etwas anderes. Die Umrechnung alt 6 →
   neu 8 ist Etappe 5 – **hier nichts umrechnen**, nur im Bericht vermerken.

### Klang

Die neuen Songs nutzen `stab` (Bläser-Hits: tanzverbot, discokugel,
rueckspiegel), `chop`, `pad`, `toms`, `push`, `var`. Alles läuft schon über
`playDownbeatEvent`; nur anhören lässt es sich hier nicht → Probehör-Liste.

---

## Teil C – echte Instrumente für alle Songs

Der Klang-Versuch (v483, drei Probesongs) kam sehr gut an („viel besser“).
Jetzt für **alle 48 Songs**.

Stand: `samples/` (54 MP3, 1,1 MB; Herkunft `samples/LIZENZ.md`,
`THIRD-PARTY.md`; Aufbereitung `samples/aufbereiten.sh`), Code-Block „Klang-
Versuch“ in `uebe-lab.html` (`SAMPLE_SONGS`, `SAMPLE_INST`, `loadSamples`,
`trimOnset`, `prepareSamples`, `playSample`, `sampleNote`, `playSampledEvent`,
`playSoundPreview`, `soundTrialHtml`), Einstellung `ear.dbSound`
(`'synth' | 'samples'`).

1. **Tonumfang:** Für alle Songs und alle Tonarten (Dur F–A = 65–69, Moll
   d–fis = 62–66) die benötigten Töne je Instrument berechnen (der Selbsttest
   „Klang-Versuch: Samples decken alle Töne …“ macht das schon für die
   Probesongs – auf alle Songs ausweiten) und fehlende Samples ergänzen
   (alle drei Halbtöne ein Ton, ±1,5 Halbtöne umstimmen).
2. **Fehlende Instrumente:** `stab` → `brass_section` (FluidR3_GM); prüfen,
   ob `keys` mit `arp` als Klavier passt. Optional `block` (VCSL Woodblock).
3. **Streicher länger:** Die FluidR3-Streicher sind nur ≈ 3,2 s lang; lange
   Flächen (langsame Songs) klingen vor dem Akkordwechsel aus. Lösung: im
   ruhigen Mittelteil eine Schleife (`loop`, `loopStart`/`loopEnd`) mit
   eigener Hüllkurve, oder Ton nach Ende neu anschlagen mit Überblendung.
4. **Standard umstellen:** „Echte Instrumente“ wird Standard für alle Songs.
   `SAMPLE_SONGS`-Beschränkung und die Einschränkung der Aufgaben auf die
   Probesongs (`only` in `makeSongTask`) entfernen. Der Abschnitt
   „Klang (Versuch)“ in den Einstellungen wird zu einem schlichten Schalter
   „Klang: Echte Instrumente / Einfach (lädt nichts)“ – Standard „Echt“.
   Bestehende Ablage `dbSound: 'synth'` stammt aus dem Versuch → beim Laden
   auf `'samples'` heben (einmalig, z. B. mit Merker `dbSoundV: 2`).
5. **Offline:** Samples in einem **eigenen** Cache (`chor-samples-v1`) im
   Service Worker cache-first ausliefern (Pfad `/samples/`), nicht in
   `SHELL_*` – sonst lädt jedes App-Update die Samples neu. `SW_VERSION`
   erhöhen. Ohne Netz und ohne Cache: Klang wie bisher (Synthese).
6. Größe: Ziel ≤ 3 MB gesamt. Lizenzen/Herkunft ergänzen (`samples/LIZENZ.md`,
   `THIRD-PARTY.md`, Namensnennung FluidR3 in der App bleibt).
7. Bassdrum: VCSL hat kein Rock-Drumset (Konzert-Bassdrum + synthetische
   darunter). Wenn eine CC0-Quelle für eine Rock-Bassdrum erreichbar ist, gern
   austauschen; sonst so lassen.

---

## Regeln und Fallstricke (aus den letzten Sitzungen)

- **`SW_VERSION` bei jedem Commit**, der `uebe-lab.html`, `ueben.css`, `sw.js`
  usw. ändert (Liste in `CLAUDE.md`).
- **Keine doppelten Funktionsnamen:** Das Inline-Skript ist eine große IIFE;
  eine zweite `function x()` überschreibt still die erste. v484 hat so den
  ganzen Rhythmus-Bereich lahmgelegt (`scheduleAhead`). `selfCheck()` meldet
  das inzwischen – trotzdem vorher `grep -n "function name("`.
- **Läufe wirklich starten**, nicht nur den Selbsttest: Der Selbsttest startet
  keine Läufe. Nach jedem Teil im Browser: eine Rhythmus-Übung (Nachklatschen),
  Einsatz finden je umgestellter Stufe, Klatsch-Grooves.
- **Zurück-Geste der App:** Neue Ansichten, die per `innerHTML` statt
  `hidden`/`class` wechseln, sieht die App nicht (siehe `markToolDepth` bei den
  Klatsch-Grooves, Kommentar dort). Der Verlaufseintrag muss beim Öffnen
  (während der Tipp-Geste) entstehen, sonst verlässt das zweite „Zurück“ die
  App.
- `judgeHold`/`HOLD_*` nicht ändern (wortgleich mit `licks.html`).
- Hilfen zählen „mit Hilfe“; Lösung erst nach dem Lauf; Wertung ab dem ersten
  Klatscher; Einstieg nie auf der Eins; keine laufende Marke, die die Eins
  verrät. Texte deutsch, ohne ms.
- Keine neuen Abhängigkeiten, kein Bundler.

## Prüfen

- `uebeLab.selfCheck()` grün (Konsole von `uebe-lab.html`).
- Browser: Playwright mit `executablePath: '/opt/pw-browsers/chromium'`,
  Server `python3 -m http.server 8791` (mit `setsid nohup … &` starten, sonst
  stirbt er zwischen zwei Befehlen). Hilfreich:
  - `uebeLab.restoreForTest({ tab: 'rhythm', ear: { mode: 'downbeat', levels: { downbeat: n } } })` setzt die Stufe.
  - `uebeLab.downbeatRun()` (Plan, `t0`, Aufgabe), `uebeLab.audioNow()`;
    Klatscher als `KeyboardEvent('keydown', { code: 'Space' })` per
    `setTimeout` zu berechneten Zeiten.
  - Nachklatschen: Klatscher direkt in `uebeLab.game.taps` legen (Zeiten aus
    `round.youStart + onset * round.tickSec`).
  - App-Ebene (Zurück-Geste): `index.html` → `#tools`, `history.state.toolLevel`
    protokollieren.
- Screenshots 390 × 844 von A1, A2/A3/A4, A5 und je einer Song-Stufe 3, 5, 6.
- Am Ende: Probehör-Liste für die Nutzerin (Songs mit neuen Klängen, 12/8,
  Shuffle, Halftime, Bläser) und kurze Aufnahmen (Klangprobe im Browser per
  `MediaRecorder` mitschneiden, als MP3 schicken – hat sich bewährt).

## Offene Fragen (vorab klären, sonst Standard)

1. A2, Phase „fertig“: Songname weiter anzeigen? (Standard: ja, klein unter
   „Geschafft!“/„Noch nicht“.)
2. A4: Zählt Überspringen als Fehlversuch für den Stufenvorschlag? (Standard:
   nein, gar nicht gezählt.)
3. A5: Body Percussion / Wieder einsetzen aus dem Rhythmus-Fortschritt der
   App herausnehmen? (Standard: nein, unverändert.)
4. Teil C: „Echte Instrumente“ als Standard für alle? (Standard: ja.)

## Bericht

`BERICHT-EINSATZ-FINDEN-SONGS.md` fortschreiben (Status-Tabelle, je Teil ein
Abschnitt, Abweichungen, Probehör-Liste, offene Punkte).
