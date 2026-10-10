# Fortschritt — Groove Lab Redesign (Chor · Studio · Lernen)

Auftrag: `ARBEITSANWEISUNG-GROOVELAB-REDESIGN.md`. Basis: `main` @ `2ea07a7`
(PR bokajsukriz/choirapp#182 gemergt), Branch `claude/groovelab-redesign-sx7q7k`
(neu von main aus gestartet, da die frühere PR dieses Branches gemergt ist).

| Phase | Inhalt | Status |
|---|---|---|
| 0 | Quellen, Basis, Bestandsaufnahme | fertig (Entwurf gelesen, Bestandsaufnahme im Bericht) |
| 1 | Zustandsmodell + reine Funktionen + Selbsttests | fertig |
| 2 | Kopfleiste mit Ansichts-Dropdown, Menü-Umbau | fertig (Lernen-Übersicht D4 schon mit drin) |
| 3 | Chor-Ansicht (D1, D5), Anfangstöne, Einzähler, Hören auf | fertig |
| 4 | Akkordfolgen-Editor (D6) | fertig (Mindestergebnis 1–4 erreicht) |
| 5 | Studio mit Spuren (D2, D3, B2) | fertig (Reiter bleiben nur als Baufläche für Workshop/de:construct) |
| 6 | Spielflächen (E1, E5, E2) mit vereinter Aufnahme | fertig |
| 7 | Meine Sounds + Aufnehmen (E3, E4) | offen |
| 8 | Lernen (D4), Workshop-/de:construct-Umverdrahtung | offen |
| 9 | Querschnitt, Schlussprüfung, README | offen |

## Nächster Schritt

Phase 7: Meine Sounds (E3) + Aufnehmen (E4). Heute öffnet „Meine Sounds“ den alten
Sampler (`_openSounds(view)` → `.panel-layer` mit `data-part="sampler"`).
Danach Phase 8 (Lernen: Kurs/de:construct öffnen das Studio mit Hervorhebung).

Phase 6 erledigt: `.surface` (is-choir: Vollbild/orientation.lock mit Rückfall
„Zum Spielen quer halten“; is-studio: Leiste von unten), Piano 11 weiße Tasten ab c′
(Lage ‹ ›), Tonleiter 7+1, Pads (Kit-Wahl, `_sfKit`), Akkordtöne-Punkte,
`sfRec` (dazu/ersetzen, Länge = Loop, quantizeTapStep) für Drums (Pads → Raster bzw.
Sample-Spur), Bass (`bassDegreeOf`), Akkorde (Anschläge), Melodie (über `this.rec`,
direkt in melodyBars ref 'key'). Werkzeug „Keys“ im Studio entfällt (Arp = Spur
„2. Akkorde“, Tasten/Aufnahme = Spielfläche).

Phase 5 erledigt: `.studio-view` (Song-Zeile, Akkordfolge, Spurkarten), STUDIO_TRACKS,
Spur-Blatt `.track-layer` (Muster · Klang · Mix) hängt Panels per `data-part` um
(`_placePart/_restoreParts`; beim Schließen/Ansichtswechsel zurück in die Reiter),
neue Bausteine in `.studio-parts` (bassPlay, chordPlay, chordSoundSel, swingExact,
roomSel, meterSel, addTrack, recNote, arpSoundNote), Solo (ui.solo, `_busLevel`),
„+ Spur“, Song-Blätter Tempo/Raum/Takt (`.panel-layer`), Zufällig ohne Tonart/Tempo,
Picker über den Blättern (z-index 12).

Phase 4 erledigt: `.prog-layer` (D6), `_openProgSheet/_renderProgSheet/_progEdit`
(Parallel-Arrays Stufe/geliehen/Bass/Länge/Wechsel), Aktionen `d6-*`, Vorlage ‹ ›
(= `chor-prog`), „16tel früher“ nur mit Sechzehntel-Raster, Einstieg auch im
Harmonie-Reiter („Länge und Wechsel je Akkord“).

Phase 3 erledigt: `.chor-view` (Markup statisch, `_renderChor`), Tonart ± /
Tonart-Blatt `.key-layer`, Anfangstöne (`_giveStartNotes`), Tempo ± / Tap / Swing-
Stufen, Stil ‹ › (`applyStyle`), Energie/Raum/Hören auf als Radiogruppen, Elemente
‹ › (`_chorStep`), D5: Hinweis, „angepasst“, weitere Spuren + Stumm, Zurücksetzen.
Einzähler-Schalter steht im Menü (D-Entscheidung). Test: `redesignViewTest()`.
Phase 2 erledigt: `.view-btn`/`.view-pop` (role menu, menuitemradio, Pfeiltasten,
Escape, Klick außerhalb), Leiste 44 px, Statuszeile ≤ 400 px ausgeblendet →
`_toast()`; Menü: Wiedergabe (Gesamtlautstärke, Einzählen), Meine Sounds (bis
Phase 7: Studio/Sampler-Bibliothek), Zufällig nur im Studio, Audio & Leistung
(+ Bluetooth-Hinweis im Panel); Ebenen-Stapel `_openLayer/_closeLayer` für alle
neuen Blätter; Lernen-Übersicht mit Kacheln.

Phase 1 erledigt: STYLES/ENERGY/ROOMS/HEAR_FOCUS/SWING_LEVELS, chordTimeline +
chordAtStep (Länge/Vorziehen, Loop-Grenze, erster Takt), bassVariant/thinBeat/
resolveEnergy/applyStyle/applyEnergy/styleDiff, Migration in sanitizeState
(viewOfRaw, layout 2, baseState vs. defaultState), Engine: setPreDelay, Pegel über
_applyLevels (busFactor), Akkorde rhythmisch/Arpeggio/Pad-Layer/Lage, Bass zieht
mit vor, Einzähler (1 Takt), Energie an der Zwei-Takt-Grenze. Tests:
`redesignSelfTest()` (läuft in selfTestMusic/selfTestAsync); schnell ohne Browser
über das vm-Skript im Scratchpad (`tools/pure.cjs`).

## Werkzeuge

- Server: `python3 -m http.server 8791 --bind 127.0.0.1` im Repo.
- Testlauf: Playwright-Skript (Scratchpad `tools/check.mjs tests`) ruft
  `chorApp.selfTest()`, `selfTestAsync()`, `selfTestMusic()` auf.
- Ausgangsstand vor jeder Änderung: alle drei Listen leer (grün).

## Entscheidungen (laufend)

(siehe Bericht, D-Nummern)
