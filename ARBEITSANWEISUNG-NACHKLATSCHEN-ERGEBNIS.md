# Arbeitsanweisung: Übersichtliches Ergebnis bei „Nachklatschen“

Für eine neue Claude-Code-Sitzung. Erst diese Datei, dann `CLAUDE.md` lesen.
Umfang: klein (eine Sitzung). Bitte **vor** dem Einsatz-finden-Umbau
(`ARBEITSANWEISUNG-EINSATZ-FINDEN-SONGS.md`) erledigen.

## Ziel

Nach jeder Runde im Rhythmus-Bereich (zuerst „Nachklatschen“) soll man auf
einen Blick sehen, wie es war: ein großes Urteil statt Zahlen und Schieber.
Entwurf (von der Nutzerin gewünscht, noch nicht final abgenommen):
`docs/nachklatschen/entwurf.png`, Quelle `docs/nachklatschen/entwurf.html`.

## Stand im Code (`uebe-lab.html`)

- Wertung einer Runde: `evaluate(round)` (≈ Z. 3203). Ergebnis
  `round.result = { notes: [{ t, status: 'good'|'near'|'miss', off, tap }], perfect, meanOff, hits, count, extras, taps }`.
  `good` = höchstens `GOOD_SEC` (40 ms) daneben, `near` = im Fenster, `miss` = verpasst.
  `perfect` = alles getroffen und kein Klatscher zu viel (zählt für Serie,
  Tempo-Steigerung, Kurs – **nicht ändern**).
- Anzeige: `renderRoundCard()` (≈ Z. 3357) baut die Karte `[data-round-card]`
  „Letzte Runde“: Pille „n von m“, Timing-Streifen `.tstrip` (zu früh/genau/zu spät),
  Zeile „x verpasst · y zu viel“, ggf. Silbenzeile `.round-syl`, Tipp-Text aus
  `timingSummary()` (≈ Z. 3327), Hilfe-Text `#help-timing`.
- `renderScore()` (≈ Z. 3401) füllt zusätzlich `.score`/`.score-sub`.
- Dieselbe Karte nutzen „Vom Blatt“, „Zweistimmig“ und der Rhythmus-Kurs.

## Umsetzung

1. **Urteil berechnen** (reine Funktion, z. B. `roundVerdict(result)`), Fehler = verpasst + zu viel:
   - **Gut** – `perfect` und alle Noten `good`.
   - **Okay** – `perfect`, aber mindestens eine Note nur `near`.
   - **Fast** – 1 oder 2 Fehler.
   - **Nochmal** – mehr Fehler.
   Rückgabe: `{ key: 'gut'|'okay'|'fast'|'nochmal', word, line, tip }`.
2. **Karte neu** (wie Entwurf): Kreis-Symbol (✓ grün / – gelb / ··· orange / ↻ rot)
   + großes Wort (Baloo 2), darunter eine Zeile: „6 von 6 · genau im Takt“,
   „6 von 6 · eher spät“, „5 von 6 · 1 verpasst“, „4 von 6 · 2 verpasst · 2 zu viel“
   (Tendenz in Worten, keine ms – `timingWord`-Stil: genau / eher früh / eher spät).
3. **Punktreihe**: je Note ein Punkt in Reihenfolge (grün genau, gelb knapp, rot
   gestrichelt verpasst); zu viel geklatschte als schmaler oranger Strich an
   ihrer zeitlichen Stelle zwischen den Punkten. **Keine Noten/Silben verraten**
   – Nachklatschen bleibt „nach Gehör“; die bestehende Silbenzeile `.round-syl`
   erscheint wie bisher nur, wenn die Noten ohnehin gezeigt werden (`stageShown`).
4. **Tipp**: ein konkreter Satz. Bei genau einer verpassten Note deren Position
   nennen („Nur der 3. Schlag fehlte …“); sonst den vorhandenen Text aus
   `timingSummary()` weiterverwenden.
5. **Fußzeile klein**: „Runde n“ links, rechts Serie („3 in Folge ✓“) bzw.
   Trefferquote der Sitzung.
6. Der Timing-Schieber `.tstrip` entfällt in der Karte. Die Erklärung im
   `?`-Hilfetext anpassen (Gut/Okay/Fast/Nochmal erklären, ms-Angabe darf dort bleiben).
7. Farben über die vorhandenen Tokens (`--ok`, `--warn`, `--danger`, `--ok-fg`,
   `--warn-fg`, `--danger-fg`); Orange für „Fast“ neu als Token anlegen, Kontrast
   ≥ 4,5 : 1 für Text. Dunkelmodus mitprüfen. Wort + Symbol, nie nur Farbe.
8. `aria-label` der Karte: Urteil + Zeile + Tipp in einem Satz.

## Offene Fragen an die Nutzerin (vorab klären, sonst Standard nehmen)

- „Fas“ in ihrer Nachricht als **Fast** gelesen – oder **Falsch**? (Standard: Fast)
- Drei Stufen (Gut/Okay/Fast) oder vier mit „Nochmal“? (Standard: vier, wie Entwurf)
- Gilt das neue Ergebnis auch für Vom Blatt, Zweistimmig und den Kurs? (Standard: ja,
  ist dieselbe Karte; Zweistimmig behält seine Takt-für-Takt-Auflösung auf der Bühne.)

## Prüfen

- `uebeLab.selfCheck()` in der Konsole von `uebe-lab.html` grün; neuen Test für
  `roundVerdict` ergänzen (je Stufe ein Beispiel, Grenzfälle: 0/1/2/3 Fehler,
  alles `near`).
- Im Browser (siehe Skill `run-choirapp`, Playwright mit
  `executablePath: '/opt/pw-browsers/chromium'`, `?tab=rhythm`, Zeile
  `[data-open-mode="rhythm:echo"]`): eine Runde mit Leertaste klatschen,
  Screenshot 390 × 844 hell und dunkel, alle vier Urteile einmal erzeugen.
- `SW_VERSION` in `sw.js` erhöhen (Pflicht, siehe `CLAUDE.md`).
