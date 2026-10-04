# Arbeitsanweisung: „Einsatz finden“ mit fertigen Mini-Songs

Für eine neue Claude-Code-Sitzung. Erst diese Datei, dann `CLAUDE.md` lesen.
Umfang: groß – in **Etappen** arbeiten, nach jeder Etappe testen, committen,
pushen. Vorher `ARBEITSANWEISUNG-NACHKLATSCHEN-ERGEBNIS.md` erledigen (klein).

## Ausgangslage

„Einsatz finden“ (Rhythmus-Bereich, `uebe-lab.html`): Ein Groove blendet ohne
Einzähler an zufälliger Stelle ein, man findet hörend die Eins und klatscht ein
Muster. Seit Commit „Einsatz finden: inhaltlich überarbeitet“ gibt es 6 Stufen
aus reinen Drum-/Bass-Grooves, Abwechslung über `ear.dbLog`, Tempo-Verschiebung
in Prozent (`ear.dbPct`, ±25 %), Wertung über `judgeHold` und die Hilfe „Bass dazu“.

Ein Musikpädagoge (Opus-Subagent) hat die Übung danach **neu konzipiert** und mit
Komponisten-Subagenten **48 frei erfundene Mini-Songs** für einen Popchor
geschrieben (Stilwelt: Queen/Glam, Die Ärzte/Punk-Pop, Deutsch-Indie,
Indie-Folk, Stadion-Hymnen, Disco-Indie, 6/8-Balladen …). Keine echten
Melodien/Riffs – nur Stil und Groove-Typ.

### Material im Repo (alles lesen, bevor du anfängst)

| Datei | Inhalt |
|---|---|
| `docs/einsatz-finden/katalog.md` | Konzept (Lernziele, Aufgabentypen A/B/C, 8 Stufen mit Song-Pools, Abwechslung, Klänge, Fairness), 48 Steckbriefe |
| `docs/einsatz-finden/songs.js` | **Daten zum Übernehmen**: `SONG_PATTERNS`, `SONG_LEVELS` (8 Stufen), `DB_SONGS` (48), Referenzfunktionen `parseChord`, `chordPcs`, `songEvents` (Song → Ereignisliste mit Tick/Klang/Tonhöhe), `songFairness`, `songPeriodFairness`. Format im Kopfkommentar. |
| `docs/einsatz-finden/gen/` | Quelle (`songs-src.mjs`, `lib.mjs`, `konzept.md`) und Generator: `node docs/einsatz-finden/gen/build.mjs` erzeugt `songs.js` und `katalog.md` neu. **Songs nur in `songs-src.mjs` ändern**, dann neu bauen. |

`docs/` gehört nicht zur App-Shell (kein `SW_VERSION`-Bump nötig für Änderungen dort).

### Kernpunkte des Konzepts (Details im Katalog)

- **Lernziele:** Eins im Takt hören (Akkordwechsel, tiefster Basston, Bassdrum,
  Zielton der Melodie) → Takt 1 der Phrase hören (Fill, Crash, Kadenz,
  Melodiebeginn) = der eigentliche Choreinsatz. Muster klatschen ist Anwendung.
- **Aufgabentypen:** A „Klatsch die Eins“, B „Muster“, C „Dein Einsatz“
  (Stufe 7: Einsatz auf Takt 1 der nächsten Phrase, danach kurzes Motiv; nur der
  Einsatzzeitpunkt zählt).
- **8 Stufen:** 1 klare Eins · 2 Backbeat und Muster · 3 Dreier (3/4, 6/8) ·
  4 ohne Bass (Klavier/Gitarre tragen die Harmonie) · 5 falsche Fährten
  (Four-on-the-floor, vorgezogener Bass, Auftakt-Melodie) · 6 Halftime, Shuffle,
  12/8 · 7 Phrase finden (Typ C) · 8 Glam und Taktgefühl (3+3+2, 6/8 gegen 3/4,
  Stop-Time).
- **Einstieg** zufällig im Takt **und** in der Periode.
- **Fairness:** Jede Verschiebung um eine Zählzeit muss anders klingen (ohne
  Hi-Hat/Becken/Fill); Stufe 4 zusätzlich ohne Bass; Typ-C-Songs auch auf
  Phrasenebene. Alle 48 Songs bestehen `songFairness`.

### Wichtige Stellen in `uebe-lab.html` (Zeilen ungefähr, bitte suchen)

- `DB_GROOVES`, `DB_PATTERNS`, `DOWNBEAT_LEVELS`, `dbLevelBpm`, `dbCombos`,
  `DB_MEMORY` (Kommentar „Einsatz finden: Ein Groove blendet …“, ≈ Z. 5134)
- `makeDownbeatTask(n, rnd, pct, log)`, `downbeatPlan(task, aids)`,
  `judgeDownbeat(task, taps, mic)`, `downbeatMessage`, `downbeatCells`
- Lauf: `playDownbeat`, `playDownbeatEvent`, `downbeatTap`,
  `startDownbeatWindow`, `finishDownbeat`, `downbeatPatternHtml`,
  `downbeatBarsHtml`, Hilfen in der Liste mit `db-accent`/`db-demo`/`db-bass`/
  `db-solution` und im Klick-Handler (`action === 'db-…'`), Hilfe-Infos
  `earHelpInfo()` („So findest du die Eins“, „Dieser Groove“ = `cue`)
- Ablage: `persist`/`restore` (`dbPct`, `dbLog`, `ear.levels.downbeat`)
- Selbsttest: `downbeatCheck()` (≈ Z. 15790), läuft in `uebeLab.selfCheck()`
- Klänge der Engine: `engine.keys` (Klavier), `engine.saw` (Lead/Fläche),
  `engine.voice` (Singstimme, ein Vokal), `engine.drumTone` (Bass, Toms),
  `engine.drumNoise` (Becken), `engine.drum` (kick/snare/rim/hat/open),
  `engine.clap`, `engine.click`, `engine.block`
- Verwandt, nicht verändern ohne Grund: „Körper“ (`BODY_LEVELS`, `judgeBody`),
  „Wieder einsetzen“ (`ENTRY_LEVELS`, `makeEntriesTask`, `judgeEntries`),
  `judgeHold` (muss wortgleich mit `licks.html` bleiben).

## Vorab mit der Nutzerin klären (sonst Standard)

1. Punk-Pop „Schwarzweißfilm“ ♩ 140–156 in Stufe 2 – oder als Halftime ♩ 70–78
   anzeigen? (Standard: Halftime-Anzeige, die „150“ hat schon einmal irritiert)
2. Chor-Einwürfe singen nur einen Vokal (`engine.voice`) – reicht das? (Standard: ja)
3. Typ C: „da“ ins Mikrofon singen erlauben oder vorerst nur klatschen?
   (Standard: Klatschen und Tippen; Mikrofon wie bei den Klatschern, Tonhöhe egal)
4. Moll-Songs in der Anzeige als Dur-Stufen (i, bVI …) oder als Moll-Stufen?
   (Standard: die Stufen gar nicht anzeigen – nur Songname, Stil, Taktart)

## Etappen (größter Nutzen zuerst; je Etappe ein Commit)

### Etappe 1 – Song-Engine, Stufen 1, 2, 4
- `DB_SONGS`, `SONG_PATTERNS`, `SONG_LEVELS` und die Referenzfunktionen aus
  `docs/einsatz-finden/songs.js` in `uebe-lab.html` übernehmen (als Daten, keine
  neue Abhängigkeit, kein Modul-Import – die Seite ist ein Inline-Skript).
  Namenskonflikte mit vorhandenen Funktionen prüfen (z. B. gibt es schon
  `chordPcs` in `uebe-lab.html` → umbenennen, etwa `songChordPcs`).
- Neuer Planer `songPlan(task, aids)` nach dem Vorbild von `downbeatPlan`:
  `songEvents` liefert Ticks; Zeitplan, Einblenden, Hilfen (Eins betonen,
  Vormachen, Bass dazu, Lösung) und Schlusspunkt wie heute. Ausgabe-Klänge über
  einen erweiterten `playDownbeatEvent` (keys, saw-Lead/-Fläche, Stab, Chop,
  Toms, Becken). Tonart zufällig (Dur F–A, Moll d–fis), Tempo zufällig im
  Bereich des Songs plus `ear.dbPct`.
- Aufgabe aus Song + Muster statt Groove + Muster. Abwechslung laut Katalog
  (kein Song in den letzten 3 Aufgaben, Stil-Familie höchstens 2× in Folge,
  Muster wechselt, Einstieg wechselt) – `ear.dbLog` entsprechend erweitern.
- Wertung bleibt `judgeDownbeat` (über `judgeHold`) – nur `task` braucht
  `meter`, `bpm`, `pattern`, Swing-Info wie bisher.
- Stufen 1, 2, 4 auf Songs umstellen; übrige Stufen laufen vorerst mit den alten
  Grooves weiter (Rückfall). „Dieser Groove“-Hilfe zeigt den `cue` des Songs.
- Selbsttest: `songFairness` für alle Songs (Stufe 4 ohne Bass), Planer liefert
  für jeden Song Ereignisse ab dem Einstieg, Eins mit dem im Steckbrief
  genannten Zeichen, Abwechslung über 60 Aufgaben je Stufe.

### Etappe 2 – Einstieg in der Periode, neue Hilfen
- Einstieg zufällig auch im Takt der Periode (nicht nur im Takt).
- Hilfe **„Worauf hören?“** (zeigt vor dem Lauf den `cue`, zählt „mit Hilfe“)
  und **„Nur das Zeichen“** (2 Takte nur die Spur(en), die die Eins tragen –
  aus `songFairness(...).signs`).
- Auflösung: ein Satz, welches Zeichen die Eins verraten hat.

### Etappe 3 – Stufen 3, 5, 6 auf Songs
- Neue Muster `hemi68`, `one128`, `back128`; Taktart 12/8 in `METERS` prüfen/
  ergänzen (72 Ticks, `ref` passend, `tempoSymbol`).
- Danach die alten `DB_GROOVES` nur noch als Rückfall/Altlast; wenn ungenutzt,
  entfernen (Tests anpassen).

### Etappe 4 – Typ C (Stufe 7)
- Ablauf: Song läuft, Einsatz auf Takt 1 der **nächsten** Periode, danach das
  Motiv aus `entry`. Wertung im Stil von `judgeEntries`: Soll = erster Ton, Fenster
  `toleranceFor(Schlag)`, früh/pünktlich/spät; neu „Periode verschoben“
  („Takt richtig, aber die Phrase beginnt erst nach dem Fill“). Motivtöne nur
  „mitgemacht“. Weich gemessen: Takte bis zum ersten Klatscher („nach 2 Takten
  gefunden“), ohne Einfluss auf bestanden.
- In Stufe 7 abwechselnd Typ C und A.

### Etappe 5 – Stufe 8, Aufräumen
- Stufe 8 (Glam/Taktgefühl). Gespeicherte Stufen umrechnen: alte Stufen 1–5
  bleiben, **alte 6 → neue 8** (in `restore`, mit Test).
- Optional (nur nach Rückfrage): gemeinsamer Song-Katalog auch für „Körper“ und
  „Wieder einsetzen“.

## Regeln (gelten in jeder Etappe)

- `CLAUDE.md` beachten: kein Bundler, keine Abhängigkeiten; **`SW_VERSION` in
  `sw.js` bei jedem Commit erhöhen, der `uebe-lab.html` ändert.**
- `judgeHold` und `HOLD_*` nicht ändern (wortgleich mit `licks.html`).
- Hilfen zählen „mit Hilfe“; Lösung erst nach dem Lauf; „Weiter“ nur per
  eigenem Knopf; Wertung ab dem ersten Klatscher; Einstieg nie auf der Eins;
  keine laufende Marke, die die Eins verrät.
- Texte deutsch, ohne ms, in Worten (genau / eher früh / eher spät).
- Nach jeder Etappe: `uebeLab.selfCheck()` grün (Konsole von `uebe-lab.html`),
  Durchlauf im Browser (Skill `run-choirapp`; Playwright mit
  `executablePath: '/opt/pw-browsers/chromium'`, `uebe-lab.html?tab=rhythm`,
  Zeile `[data-downbeat-open]`, Klatschen per Leertaste zu berechneten Zeiten –
  siehe `uebeLab.downbeatRun()` und `uebeLab.audioNow()`), Screenshot 390 × 844.
- Klang lässt sich hier nicht anhören: am Ende jeder Etappe der Nutzerin eine
  kurze Liste geben, welche Songs sie auf dem Handy probehören soll.
- Am Ende einen kurzen Bericht `BERICHT-EINSATZ-FINDEN-SONGS.md` (Etappen,
  Commits, Abweichungen, offene Punkte) wie die übrigen `BERICHT-*.md`.
