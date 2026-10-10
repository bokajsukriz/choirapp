# Fortschritt — Groove Lab Redesign (Chor · Studio · Lernen)

Auftrag: `ARBEITSANWEISUNG-GROOVELAB-REDESIGN.md`. Basis: `main` @ `2ea07a7`
(PR bokajsukriz/choirapp#182 gemergt), Branch `claude/groovelab-redesign-sx7q7k`
(neu von main aus gestartet, da die frühere PR dieses Branches gemergt ist).

| Phase | Inhalt | Status |
|---|---|---|
| 0 | Quellen, Basis, Bestandsaufnahme | fertig (Entwurf gelesen, Bestandsaufnahme im Bericht) |
| 1 | Zustandsmodell + reine Funktionen + Selbsttests | fertig |
| 2 | Kopfleiste mit Ansichts-Dropdown, Menü-Umbau | offen |
| 3 | Chor-Ansicht (D1, D5), Anfangstöne, Einzähler, Hören auf | offen |
| 4 | Akkordfolgen-Editor (D6) | offen |
| 5 | Studio mit Spuren (D2, D3, B2) | offen |
| 6 | Spielflächen (E1, E5, E2) mit vereinter Aufnahme | offen |
| 7 | Meine Sounds + Aufnehmen (E3, E4) | offen |
| 8 | Lernen (D4), Workshop-/de:construct-Umverdrahtung | offen |
| 9 | Querschnitt, Schlussprüfung, README | offen |

## Nächster Schritt

Phase 2: Kopfleiste mit Ansichts-Dropdown (Chor · Studio · Lernen), Menü-Umbau.
Stubs `_renderViewMenu/_renderChor/_renderLearn` und leere `.chor-view`/`.learn-view`
sind schon im Markup (Phase 1), werden in Phase 2/3/8 gefüllt.

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
