BERICHT — Groove Lab Redesign: Chor · Studio · Lernen
=====================================================

Auftrag: `docs/archiv/ARBEITSANWEISUNG-GROOVELAB-REDESIGN.md`.
Basis: `main` @ `2ea07a7` (PR #182 gemergt). Branch `claude/groovelab-redesign-sx7q7k`.
Entwurf: https://claude.ai/artifact/QxExUGREEij6bdydJM2pKY (Reihen D und E).

> Hinweis zur Entstehung dieses Berichts: Der Lauf wurde nach Phase 9 (Teil 1) durch
> einen Neustart der Sitzung unterbrochen. Ein Berichtsentwurf aus dem Lauf war danach
> nicht mehr vorhanden. Dieser Bericht ist aus den Commits, der Fortschrittsdatei, dem
> Code (Kommentare, Selbsttests) und einer erneuten Prüfung zusammengestellt. Wo etwas
> nicht mehr belegbar ist, steht das ausdrücklich dabei.

## Stand am Ende

**Fertig: alle Phasen 0–9.** Mindestergebnis (Phasen 1–4) ist deutlich übertroffen.

| Phase | Inhalt | Commit |
|---|---|---|
| 1 | Zustandsmodell, Stile, Energie, Raum, Hören auf, Swing-Stufen, Vorziehen/Länge, Migration, Selbsttests | `66b8afd` |
| 2 | Kopfleiste mit Ansichts-Dropdown, Menü neu, Lernen-Übersicht | `e71ddf3` |
| 3 | Chor-Ansicht (D1, D5) inkl. Anfangstöne, Einzähler, Hören auf | `d288170` |
| 4 | Akkordfolgen-Editor (D6) | `28f2d08` |
| 5 | Studio mit Spuren statt Reitern (D2, D3, B2) | `b70af25` |
| 6 | Spielflächen: Chor im Querformat, Studio mit vereinter Aufnahme (E1, E5, E2) | `919446d` |
| 7 | Meine Sounds + Sound aufnehmen (E3, E4) | `9deb169` |
| 8 | Lernen: Aufgaben über der Chor-Ansicht, Kurs → Studio | `71b22b8` |
| 9 | README, Kopfkommentar, Texte, Screenshots; Feinschliff | `6383179`, `984f67f` |

**Übersprungen:** nichts ganz. Teilweise offen siehe „Offene Punkte“.

**Zum Prüfen, nach Wichtigkeit:**

1. **D-1 Kurs und de:construct bauen weiter auf den alten Reiter-Panels.** Ihr Fokus
   (`_wsFocusEls`) und die de:construct-Markierungen (`is-dc*`) hängen an `.tab-panel`.
   Statt beides umzuverdrahten, hängen die Studio-Spurblätter die vorhandenen Panels
   nur um (`_placePart/_restoreParts`) und legen sie beim Schließen zurück. Kurs-Einheiten
   bekommen „Im Studio weiterbauen“ (Spur hervorgehoben, Blatt offen). Folge: In Kurs und
   de:construct sieht man noch die Reiter. Rückgängig: nicht nötig; eine vollständige
   Umverdrahtung wäre ein eigener Auftrag.
2. **D-2 Einzähler-Schalter steht im Menü** („Wiedergabe: Einzählen“), nicht in der
   Tempo-Karte — die Karte wäre auf 320 px zu voll. Standard an, 1 Takt, nur aus dem
   Stillstand; eine Aufnahme aus dem Stillstand zählt immer ein (`984f67f`).
3. **D-3 Stil-Inhalte weichen bewusst vom Energie-Raster in 4.1 ab** (Berater, im Code
   bei `STYLES` dokumentiert): Walzer und Lied spielen schon bei „Ruhig“ rhythmisch bzw.
   als Arpeggio; Choral, Walzer, Lied ohne Pumpen; Elektro bei „Treibend“ ohne Fill und
   mit gehaltenem Pad + Pumpen statt Anschlägen; Choral bei „Still“ ohne Bass.
4. **D-4 Statuszeile** fällt unter 400 px Breite weg; Meldungen erscheinen dann als
   kurzer Toast (`_toast`, role="status").
5. **D-5 Studio-Werkzeug „Keys“ entfällt:** Arpeggiator = Spur „2. Akkorde“, Tasten und
   Aufnahme = Spielfläche. „Live einspielen“ ist in der Spielfläche aufgegangen.
6. **D-6 „Meine Stimme“ bleibt in den Aufgaben** (nicht in Chor), wie in 4.8 festgelegt.
7. **D-7 Kontrast:** `--muted` des Groove Lab auf 4,5:1 abgedunkelt (`d288170`).

**Zurückrollen:** jede Phase ist ein eigener Commit; `git revert <hash>` in umgekehrter
Reihenfolge (spätere Phasen bauen auf früheren auf). Alte Lab-Stände, Speicherplätze,
`GL1.`-Codes und `.groove`-Dateien laden weiter (Migration in `sanitizeState`, idempotent,
`view` → `choir`/`studio`/`learn` + `learnArea`).

## Fachliche Festlegungen (Abschnitt 4) — umgesetzt

| Punkt | Umsetzung |
|---|---|
| Energie 4 Stufen | `ENERGY_IDS`, `resolveEnergy/applyEnergy`; Wechsel an der Zwei-Takt-Grenze; je Stil eine Leiter verwandter Loops (`STYLES[].drums`), Bass-Variante als reine Funktion (`bassVariant`), Ausdünnung (`thinBeat`), Pegelausgleich (`ENERGY_TRIM`) |
| 8 Stile | Choral, Ballade, Pop, Gospel, Walzer, Lied 6/8, Funk, Elektro (`STYLES`); setzen Rhythmus, Bass, Klang, Raum, Energie, Swing, Vorziehen; Tonart und Tempo bleiben |
| Raum | Trocken · Probe · Saal · Kirche (`ROOMS`); Hall-Vorverzögerung neu in der Engine (`setPreDelay`) |
| Swing | gerade · leicht · Shuffle (`SWING_LEVELS`), nur 4/4; exakte Prozente im Studio-Tempoblatt |
| Hören auf | Rhythmus · ausgewogen · Harmonie (`HEAR_FOCUS`), Faktor auf die Busse (`busFactor`), `state.mix` bleibt |
| Akkordwechsel | je Akkord auf der Eins · Achtel früher · 16tel früher (16tel nur mit Sechzehntel-Raster), Länge ½ · 1 · 2 Takte (`chordTimeline`, `chordAtStep`, auch über die Loop-Grenze, nicht im ersten Takt nach dem Einzähler); Bass zieht mit, Option „bleibt auf der Eins“ im Bass-Blatt |
| Melodie in Chor | standardmäßig aus |
| Spur „Akkorde“ | Standardklang Pad, Arpeggio als Spielweise |

## Wo ist was (Abschnitt 5) — Zielorte

Nachträglich anhand des Codes geprüft; die ursprüngliche Bestandstabelle aus Phase 0
ist mit dem Berichtsentwurf verloren gegangen.

| Heute | Neu |
|---|---|
| Beat: Loop, Raster, Lupe, Fills, Kit, Kick-Klang | Spur Drums (Muster/Klang) |
| Swing / Pump | Tempo (Stufen) / Mix der Drums |
| Live einspielen | Spielfläche Pads + „● Aufnehmen“ |
| Harmonie: Tonart, Akkordfolge, 7er, geliehen, Umkehrung | Song-Zeile + Akkordfolgen-Editor |
| SATB/Pop-Satz, add9, Chor-Klang | Spur Akkorde (Muster/Klang) |
| Liegeton | Spur Liegeton |
| Melodie: Vorlagen, Piano-Roll, Oktave | Spur Melodie |
| Sampler | Meine Sounds, Pads, Sample-Zeilen, Spur Aufnahme |
| Klang: Presets, Makros, alle Regler, Effekte | Klang-/Mix-Reiter der Spuren, Raum global |
| Mixer | Lautstärke/M/S je Spurkarte, Gesamt im Menü |
| Keys: Tasten, Aufnahme, Arpeggiator | Spielfläche; Spur „2. Akkorde“ |
| Würfeln + Schlösser | Menü „Zufällig“ (nur Studio), ändert nie Tonart/Tempo |
| Chor-Aufgaben | Lernen → Aufgaben, laufen über der Chor-Ansicht |
| Workshop/Kurs, de:construct | Lernen → Kurs / de:construct (siehe D-1) |

## Tests

- `chorApp.selfTest()`, `selfTestAsync()`, `selfTestMusic()`: leere Fehlerlisten
  (zuletzt geprüft auf `984f67f`). Neu: `redesignSelfTest()` (reine Funktionen: Stile,
  Energie, Raum, Swing, Akkord-Zeitleiste, Migration) und `redesignViewTest()`
  (Ansichten, Blätter) — beide laufen in den Selbsttests der App mit.
- `node --check groove-lab.js`; Texte de/en/pl mit gleichen Schlüsseln (0 fehlend,
  0 überzählig).
- Screenshots: `docs/groovelab-redesign/` — Chor, Studio, Akkordfolge, Lernen je 390×844,
  375×667, 320×568; Spielflächen 844×390 und 667×375 (Piano, Samples) plus Hochkant-
  Hinweis; Spurblätter Drums/Akkorde; Meine Sounds; Menü; Aufgabe; Chor nach Studio.
  Die Screenshots stammen aus Teil 1 von Phase 9, also vor dem Feinschliff in
  `984f67f` (z. B. zeigt `studio-390x844.png` bei stummer Melodie noch einen
  Lautstärkeregler).

## Offene Punkte für den Auftraggeber

1. **Kurs und de:construct auf das Spuren-Studio umstellen** (D-1) — eigener Auftrag;
   betrifft `_wsFocusEls`, `WORKSHOP_LESSONS[].focus`, `DC_TAB` und die de:construct-
   Selbsttests in `app.js`.
2. **Screenreader-Durchgang** ist im Code angelegt (Radiogruppen, `aria-haspopup`,
   Dialoge mit Fokusfalle, Escape), ein vollständiger manueller Durchgang ist nach
   dem Neustart nicht mehr belegbar — einmal mit VoiceOver/TalkBack prüfen.
3. **Auf echten Geräten anhören:** Energiewechsel am Taktende, Vorziehen über die
   Loop-Grenze, Anfangstöne, Querformat-Sperre (iOS kennt `orientation.lock` nicht →
   Hinweis „Zum Spielen quer halten“).
4. Die Studio-Spielfläche bleibt hochkant als Leiste (wie im Entwurf); ob sie im
   Querformat wie die Chor-Spielfläche aussehen soll, ist offen.
