# Bericht – Umbau Tools-Reiter, Einsingen, Ausbildung

Grundlage: `ARBEITSANWEISUNG-UMBAU-TOOLS.md`. Alle fünf Pakete sind umgesetzt,
je Paket ein Commit mit erhöhter `SW_VERSION` (v318 → v323).

## Pakete

| Paket | Stand | Commit | Geänderte Dateien |
|---|---|---|---|
| 1 – Einsingen: Icons, Kurzanleitungen, Gruppenfarben | erledigt | `c358275` | `einsingen.html`, `sw.js`, `ARBEITSANWEISUNG-UMBAU-TOOLS.md` (neu) |
| 2 – Einsingen: Spielmodus im Vollbild | erledigt | `3bc32b6` | `einsingen.html`, `sw.js` |
| 3 – Einsingen: Übersicht „Mehr“ statt zwei Tabs | erledigt | `2e39a56` | `einsingen.html`, `sw.js` |
| 4 – Ausbildung: Bereiche als Liste, Stufe als Stepper | erledigt | `bf7de34` | `uebe-lab.html`, `sw.js` |
| 5 – Tools-Reiter neu | erledigt | `b87cad0` | `index.html`, `app.js`, `strings.js`, `sw.js` |

### Neue Selbsttests

**`einsingen.html` (`einsingen.selfCheck()`)**
- P1: genau 28 Übungen; jede hat `how` (1–55 Zeichen, ohne Schlusspunkt)
  und ein Icon in `ICONS` (Schlüssel = ID); jede Gruppe hat `--g-<id>` und
  `--g-<id>-bg`; `iconSvg()` liefert gültiges SVG (`viewBox`, `aria-hidden`,
  Pfad); `moll5`/`mollDreiklang` = Icon der Dur-Schwester plus Mondsichel.
- P2: `parseQuickParams` für `program=kurz`, `program=lang`,
  `program=xyz` (→ `kurz`), `minutes=10` (alt), ohne Parameter (→ `null`);
  `autostart()` ruft `start` bei zwei Aufrufen genau einmal auf;
  Segmentbalken hat so viele Segmente wie das gefittete Programm „Kurz“;
  jede Übung einzeln: ein Segment, Gleitkurve genau bei `glide: true`.
- P3: jede Übung genau einmal in der Übersicht, jedes Programm (inkl.
  eines eigenen) genau einmal; Richtung überlebt Speichern/Laden, kaputter
  Wert fällt auf `updown`; Richtungs-Chips liegen im Einstellungsblatt.

**`uebe-lab.html` (`uebeLab.selfCheck()`)**
- P4: `parseAreaParam` (`?tab=ear` → `ear`, `?from=quick&tab=ear` → `null`,
  unbekannt → `null`); bei direktem Bereich ist die Tab-Leiste aus und die
  Überschrift gesetzt; `applyQuickParams({ tab: 'ear' })` startet die
  bestehende Kette in der Übungsansicht; jeder Modus aus
  `MODES`/`EAR_MODES`/`SING_MODES` genau einmal in seiner Liste, Tuner als
  letzte Zeile, „Gemischt üben“ nur bei Hören/Singen; Stepper: ‹ bei
  Stufe 1 und › bei Stufe 6 ausgeblendet (nicht deaktiviert), eigene Auswahl
  springt zu 1 bzw. 6, Hinweis + Punkt bei „up“; Klick auf › setzt über den
  alten Handler Stufe +1; Zweistimmig bei Stufe 1 sichtbar mit „ab Stufe 3“.

**`app.js` (`runSelfTests()`)**
- P5: `QUICK_STARTS` enthält `short`, `long`, `more` (und `rhythm`, `ear`,
  `sing`) mit den richtigen URLs; `warmupMinutes()` fällt ohne/mit kaputter
  Ablage auf 5/10 zurück und übernimmt gültige Werte; leerer Fortschritt →
  alle drei Üben-Kacheln „Neu“; Beispiel-Datensatz → erwartete Stufe
  (zuletzt geübter Modus), bei gleichem Datum die höchste Stufe im Bereich.

Alle Selbsttests laufen grün (App auf `127.0.0.1`, beide Tool-Seiten direkt
und eingebettet, `uebe-lab.html` zusätzlich mit `?tab=ear`, `?tab=rhythm`,
`?from=quick&tab=voice`).

## Angepasste bestehende Tests

- `app.js`, `runProgressSelfTests()`: die Prüfung von `progressMeanLevel()`
  ist entfallen, weil die Funktion mit der eingeklappten Mittel-Stufe von
  „Dein Stand“ entfallen ist (Paket 5, Punkt 4).
- Sonst keine. Der alte Test `parseQuickParams('?…&minutes=10')` in
  `einsingen.html` läuft unverändert weiter.

## `strings.js`

**Neu (DE/EN/PL):** `tools.warmup.short`, `tools.warmup.long`,
`tools.warmup.more`, `tools.warmup.moreAria`, `tools.practice.title`,
`tools.practice.rhythm`, `tools.practice.ear`, `tools.practice.sing`,
`tools.tools.title`, `tools.area.new`, `tools.week.title`.

**Entfernt (DE/EN/PL):** `tools.quick.title`, `tools.quick.warmup`,
`tools.quick.min5`, `tools.quick.min10`, `tools.quick.ear`,
`tools.quick.earSub`, `tools.quick.sing`, `tools.quick.singSub`,
`tools.week.summary`, `tools.week.summaryNone`, `tools.area.rhythm`,
`tools.area.interval`, `tools.area.quality`, `tools.area.cadence`,
`tools.area.progression`, `tools.area.parts`, `tools.area.tuning`,
`tools.area.singInterval`, `tools.area.findTone`, `tools.area.hold`,
`tools.area.sight`, `tools.area.dictation` (nur von den entfallenen
Stufen-Strahlen in „Dein Stand“ benutzt).

Weiterverwendet: `tools.quick.voice`/`tools.quick.noVoice` (Stimm-Zeile),
`tools.area.partS…B`, `tools.week.level`, `tools.week.custom`.

## Abweichungen von der Anweisung

- **Branch:** statt `umbau-tools` auf `claude/new-session-o5hqsw` gearbeitet –
  die Sitzung schreibt diesen Branch verbindlich vor. Er entspricht dem
  aktuellen `main` (`07c2ba5`), der `3718b3f` enthält plus die zwei danach
  gemergten Commits (Fortschritt-Karte, gegenderte Personenbezeichnungen).
  `origin/claude/new-session-65ax3p` gab es nicht mehr. Deshalb begann
  `SW_VERSION` bei v318 statt v316.
- **Resonanz-Farbe:** abgedunkelt auf `#b02c72` statt des reinen Akzents
  `#F868B0` – der erreicht als Schrift auf heller Fläche nicht 4.5:1.
  Kontraste Grundfarbe auf Fläche: Körper 5.2, Lockern 4.8, Resonanz 5.2,
  Beweglichkeit 5.0, Höhe/Tiefe 5.6.
- **`program=`** akzeptiert alle eingebauten Programm-IDs (nicht nur
  `kurz`/`lang`); Unbekanntes fällt wie verlangt auf `kurz`. Eigene
  Programme sind beim Lesen der URL noch nicht geladen und laufen daher
  über die Übersicht.
- **Übersicht ohne Bühne:** Ohne Spielmodus sind Bühne und Knopfleiste
  ausgeblendet (sonst gäbe es eine zweite, verwaiste Play-Stelle); das
  Zahnrad sitzt dann im Kopf. Die Programm-Liste zum Springen entfällt – der
  Segmentbalken und „Überspringen“ ersetzen sie.
- **Alter Aufruf `?from=quick&minutes=5|10`:** Gesamtdauer wie bisher, das
  Programm liegt vorbereitet im Spielmodus und startet mit Play (wie bisher
  „vorbereitet, Start mit Play“ – nur ohne die entfallene Bühne der
  Übersicht).
- **„neu“ in der Ausbildungs-Liste:** Die Tool-Stände haben für Hören und
  Singen immer eine Stufe (Standard 1). „neu“ heißt deshalb: für diesen
  Bereich gibt es noch keinen Eintrag im Fortschritt der App. Direkt
  geöffnet (ohne App) steht immer die Stufe.
- **Zweistimmig gesperrt:** Beim Öffnen vor Stufe 3 wird `state.mode` nicht
  auf `duo` gesetzt (die bestehende Regel „duo nur mit duoAllowed()“ bleibt
  unverletzt); der Hinweis mit „Zu Stufe 3“ ersetzt die Übung, bis man
  freischaltet.
- **„Dein Stand“** ist eine normale Karte statt eines ausklappbaren
  Blocks – ohne Stufen gab es nichts mehr zum Aufklappen.
- **Stufe 0 (eigene Auswahl)** zeigt auf der Üben-Kachel „eigene Auswahl“
  mit leerem Strahl, in der Ausbildungs-Liste „eigene“.
- **`from=quick&tab=…`** zeigt wie bisher die Tab-Leiste (unverändertes
  Verhalten); nur `?tab=…` ohne `from` blendet sie aus.

## Beobachtungen (nicht umgesetzt)

- `einsingen.html`: `.stage-top`, `.stage-meta` und `.stage-program`
  (Fortschrittsbalken, „Nächste Übung ›“) sind seit Paket 3 nie mehr
  sichtbar, `renderStage()` beschreibt sie aber weiter. Kann in einem
  Aufräum-Schritt raus.
- `uebe-lab.html`: In der Übungsansicht steht das Zahnrad (bzw. ?) in einer
  eigenen Zeile über dem Stepper – ließe sich in die Titelzeile ziehen.
- Die Stufe in der Ausbildungs-Liste (Tool-Stand) und auf der Üben-Kachel
  (Fortschritt der App) können auseinanderlaufen, wenn jemand die Stufe im
  Tool wechselt, ohne danach zu üben – die Kachel zeigt die zuletzt
  *geübte* Stufe.
- Der Spielmodus zeigt nach „Fertig“ wieder die erste Übung als Bild an;
  eine eigene Abschluss-Grafik wäre ruhiger.
- Der Text in der Mitte des Steppers wird bei jedem Wechsel neu gebaut und
  ist keine Live-Region – ob VoiceOver/TalkBack die neue Stufe ansagen,
  hängt davon ab, dass der Fokus auf dem Pfeil bleibt (siehe unten).
- Chrome ohne Silbentrennung trennt lange Kachelnamen hart; für schmale
  Geräte stehen in den Werkzeug-Kacheln unter 380 px Breite Icon und Name
  übereinander, die Üben-Kacheln verkleinern die Schrift.
- Die Einsingen-Kurzanleitungen stehen nur deutsch im Tool (wie das ganze
  Tool); die Ausbildungs-Sätze ebenso.

## Bitte von Hand prüfen

- **Autostart** auf iOS Safari und Android Chrome: Kurz/Lang aus dem
  Tools-Reiter öffnen. Erwartet: startet sofort; falls der Browser keinen
  Ton ohne Geste erlaubt, erscheint „Tippen zum Starten“ und ein Tipp
  startet genau einmal. (Headless-Chromium ohne Autoplay-Freigabe zeigte den
  Knopf wie gewünscht; mit Freigabe startete es direkt.)
- **Lesbarkeit der Icons** bei 20 px (Übersicht, „Gleich:“-Zeile) und 16 px
  (Programmkarten), besonders Kiefer, Strohhalm, Akkord, Dur/Moll,
  Koloratur und die Ausbildungs-Icons Mitklatschen/Vom Blatt.
- **Kontraste der Gruppenfarben** im echten Rendering (Gruppenname auf
  Fläche, Silben-Kacheln im Spielmodus, weiße Silbe auf Gruppenfarbe).
- **Screenreader** (VoiceOver/TalkBack): Liste der Übungsarten (Name, Satz,
  Stufe, „zuletzt geöffnet“), Stepper (‹/› mit Zielstufe, Ansage der neuen
  Stufe), Üben-Kacheln („Hören, Stufe 2“), Segmentbalken („Übung 2 von 6“).
- Schließen-Knopf der App neben dem Zahnrad im Spielmodus auf Geräten mit
  Notch (Abstand oben rechts).
