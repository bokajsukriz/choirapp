# Bericht: Hören in der Tonart

Grundlage: `ARBEITSANWEISUNG-HOEREN-IN-DER-TONART.md` (im ersten Commit
eingecheckt). Ausgangsstand `c60a7ac` (= `origin/main` beim Start,
`SW_VERSION` `v360`). Alle fünf Pakete sind umgesetzt, keins wurde
zurückgesetzt. Enthalten sind:

- **Töne in der Tonart** (`noteInKey`) und **Akkorde in der Tonart**
  (`chordInKey`) mit Kadenz, Einzelton bzw. Einzelakkord, Antwort und
  Auflösung, bei der der passende Antwortknopf mit dem Klang aufleuchtet,
- ein aufgeräumter Katalog der **Akkordfolgen** (2 raus, 8 gängige rein).

**Branch:** `claude/nifty-edison-3nx1ex` statt `hoeren-tonart`. Die
Sitzungsumgebung schreibt diesen Branch vor (Pushes woandershin sind nicht
erlaubt). Er zweigt genau von `c60a7ac` ab, kein Rebase, kein Merge, kein
Force-Push. Nichts auf `main`.

**Stand von `main`:** Die Anweisung wurde gegen `ff41355` (`v354`) geschrieben.
Seither ist „Ausbildung Paket 5: Hören pop-gerecht gestuft“ gelandet, das die
Stufen der Akkordfolgen neu gefasst hat. Deshalb weicht Paket 1 bei der
Stufenzuordnung ab (siehe „Abweichungen“).

## Status

| Paket | Inhalt | Status | Commit | SW_VERSION | Tests (Zahlen) |
|---|---|---|---|---|---|
| 1 | Akkordfolgen: nur gängige Folgen | umgesetzt | `fae8a2d` | v361 | 8 neue Folgen × 12 Tonarten × 4 Sätze (eng/weit, Grundstellung/stilgerecht): **0** Parallelen; 200 „Stimmen“-Linien mit 3 bzw. 4 Akkorden (auch Pachelbel-Folge) ohne Ausfall; `restore` `['rising','pop']` → `['pop']`, `['mnatural']` → Standard erhalten |
| 2 | Kadenz, Antwortlogik, Auflösung | umgesetzt | `fdf35d2` | v362 | Kadenz in 24 Fällen (12 Tonarten × Dur/Moll): Bässe I–IV–V–I, **0** Parallelen; Ablauf falsch → richtig: 1 Meldung `ok = false`, `total + 1`, `right + 0`; zweimal falsch deckt auf; richtig zuerst `ok = true`; Tipp nach dem Aufdecken ändert nichts; Leucht-Timer = Länge der Auflösung + 1 |
| 3 | Töne in der Tonart | umgesetzt | `3173a30` | v363 | 6 Stufen × 500 = **3000** Aufgaben (alle vier Stimmen S/A/T/B): Antwort in der Stufe, Moll erst ab 5, ♯7 erst in 6, Ton im Bereich, Auflösung beginnt beim Ton, endet auf der Tonika, alle Schritte ≤ 2 Halbtöne, ≤ 5 Schritte, **jeder Wert hat einen Knopf**, Auflösung = Anhang A (Silben); Gewichtung: „fa“ nach 5 Fehlern in 2000 Ziehungen am häufigsten; nie 3× in Folge (2000 Ziehungen, stark bevorzugter Ton); Tonart halten: 12 Aufgaben, Kadenz nur bei 1, 6, 11 |
| 4 | Akkorde in der Tonart | umgesetzt | `6269c3d` | v364 | 6 Stufen × 500 = **3000** Aufgaben: Symbol in der Stufe, Moll erst ab 5, Umkehrung/weite Lage nur in Stufe 6 (dort auch beobachtet), Auflösung = Anhang A, endet auf I/i, jedes Symbol hat einen Knopf, Bass 40–51, keine Parallelen in den Aufgaben; **3456** Auflösungen (16 Akkorde × 12 Tonarten × 18 Sätze): **0** Parallelen |
| 5 | Liste, Symbole, Speichern, Fortschritt, Schnellstart | umgesetzt | `d603c5d` | v365 | Reihenfolge der Liste, Kurztexte, Symbole (≤ 6 Formen); Roundtrip der Stufen, des Modus und der drei Einstellungen; Unsinn → Standard; alter Stand ohne die Felder → Standard; `app.js`: `sanitizeProgress` behält Einträge, letzte Aufgaben und Stufen der neuen Bereiche, Gruppe „Hören“ mit den neuen Bereichen vor `progression`; Schnellstart-Kette und Umschalten erst nach der Auflösung |

Geprüft wurde jeweils vor dem Commit in Headless-Chromium (Playwright
vorinstalliert, nichts nachinstalliert):

- `uebeLab.selfCheck()` in `uebe-lab.html`: vollständig, ~92 s, nach jedem Paket
  `[]` (auch alle bestehenden Tests unverändert bis auf die eine Anpassung unten).
- `chorApp.selfTest()` und `chorApp.selfTestProgress()` in `app.js`: `[]`.
- Sichtprüfung auf 390 × 844: Liste, Aufgabe, Auflösung (Knopf leuchtet),
  Einstellungsblatt.
- Klang gegen Leuchten mit echtem `AudioContext`: Oszillator-Starts gegen
  Klassenwechsel gemessen. Töne: 8,152 s / 8,752 s → leuchtet bei 8,191 s /
  8,792 s (Δ ≈ 40 ms), Akkorde: Abstand 0,700 s, Δ 41–44 ms. Die App rechnet
  die vom Browser gemeldete Ausgabelatenz ein.

Neue Testfunktionen in `uebe-lab.html`: `inKeyCheck` (Paket 1) mit
`inKeyBuildingBlocksCheck` (2), `noteInKeyCheck` (3), `chordInKeyCheck` (4),
`inKeyIntegrationCheck` (5); alle laufen in `selfCheck()`. `inKeyCheck` ist
auch einzeln über `uebeLab.inKeyCheck()` aufrufbar (~0,2 s).

## Je Paket

### 1 – Akkordfolgen
- **Datei:** `uebe-lab.html`.
- **Entfernt:** `rising`, `mnatural` (auch aus den Stufen).
- **Neu:** `rock`, `rockback`, `pop4`, `axis4`, `hopscotch`, `pachelbel`,
  `aeolian`, `mvamp` mit den Namen der Anweisung.
- **Stufen (heutiger Stand):**
  - Stufe 1 „Die vier Pop-Akkorde“ + `rock`, `rockback`, `pop4`, `axis4`,
    `hopscotch` (11 Folgen)
  - Stufe 2 „dazu ii und iii“: `pachelbel` statt `rising`
  - Stufe 3 „Moll-Tonarten“: `aeolian`, `mvamp` statt `mnatural`
- **Beschriftungen:** unverändert (siehe Abweichungen).
- **`makeLineTask`:** `slice(0, n)` mit der achtteiligen Pachelbel-Folge liefert
  bei 3 und 4 Akkorden die ersten Akkorde (I–V–vi bzw. I–V–vi–iii), getestet.

### 2 – Gemeinsame Bausteine
- **Dateien:** `uebe-lab.html`.
- **Neu:** `inKeyCadence`, `playInKeyTask` (Kadenz, 0,6 s Pause, Ziel; Ton
  `velocity .22`, Akkord `.13`, je 1,2 s), `resolutionSteps`, `playResolution`
  (ein Timer je Schritt + einer fürs Ende, gibt die Dauer in ms zurück),
  `setPlayingAnswer`, `playInKeyCompare`, `answerInKey`, `revealInKey`,
  `inKeyMessage`, `noteInKeyLabel`.
- **Zustand:** `ear.settings.inKeyHold` (`false`), `inKeyCadence` (`'always'`),
  `inKeyResolve` (`true`); `ear.stats.noteInKey/chordInKey`; `ear.resolving`,
  `ear.playing`.
- **`finishEarAnswer`** blieb unverändert, die Logik steht in `answerInKey`.
- **CSS:** `.answer.is-playing` (Rahmen in `--good`, hellgrüner Grund, dunkle
  Schrift; funktioniert auch auf grünem `is-ok`); keine Animation, nur ein
  kurzer Übergang, der unter `prefers-reduced-motion` entfällt.
- **Barrierefreiheit:** Der Satz mit der Auflösung („… Auflösung: mi – re –
  do.“) steht einmal im vorhandenen `aria-live`-Bereich der Rückmeldung, nicht
  je Ton.
- **Schnellstart:** `onToolStep` schaltet nicht mitten in weiteres Raten oder
  in die Auflösung hinein (siehe Abweichungen).

### 3 – Töne in der Tonart
- **Datei:** `uebe-lab.html`.
- **Stufen:** `NOTE_IN_KEY_LEVELS` laut Anweisung.
- **Aufgabe:** `makeNoteInKeyTask` (über `makeEarTask('noteInKey', …)`); Ton in
  `singRange(ear.part)`, Stufen 1–3 nah an der Mitte, ab Stufe 4 zufällige
  Oktave.
- **Ziehen:** `pickInterval` mit Schlüssel `Tongeschlecht:Ton`, nie 3× in Folge.
- **Anzeige, Einstellungen, Rückmeldung:** wie in der Anweisung. Zahlen-Beschriftung
  mit `aria-label` „Stufe ♯7“ statt „7: 7“.

### 4 – Akkorde in der Tonart
- **Datei:** `uebe-lab.html`.
- **Stufen:** `CHORD_IN_KEY_LEVELS`; Aufgabenakkord und Auflösung als ein
  `voiceProgression`-Satz.
- **Vergleichen nach dem Auflösen:** über `playInKeyCompare` (nimmt den Satz aus
  der Auflösung, wenn der Akkord darin vorkommt).

### 5 – Einbindung
- **Dateien:** `uebe-lab.html`, `app.js`, `README.md`.
- **Neu:** Symbole (`MODE_ICONS`), `restore` der drei Einstellungen,
  `PROGRESS_AREAS`/`PROGRESS_GROUPS` in `app.js`, `QUICK_CHAINS.ear`,
  `QUICK_MINUTES.ear = 13`, README-Abschnitt.
- **Bereits in Paket 3/4 erledigt** (damit sie testbar waren): `EAR_MODES`,
  `MODE_TEXT`, `ear.levels`, `earLevelInfo`.

## Abweichungen von der Anweisung

1. **Branch:** `claude/nifty-edison-3nx1ex` statt `hoeren-tonart` (Vorgabe der Umgebung).
2. **Paket 1, Stufenzuordnung.** Die Tabelle der Anweisung meint die alte
   Stufenstruktur (`ff41355`: „I–IV–V in Dur“, „dazu die vi. Stufe“ …). Auf
   dem heutigen `main` heißen die Stufen 1 „Die vier Pop-Akkorde“, 2 „dazu ii
   und iii“, 3 „Moll-Tonarten“. Nach dem *Inhalt* eingeordnet, also nach dem
   Grundsatz „näher am bestehenden Verhalten“: `rock`, `rockback`, `pop4`,
   `axis4`, `hopscotch` (nur I, IV, V, vi) → 1; `pachelbel` (bringt iii) → 2;
   `aeolian`, `mvamp` (Moll) → 3. Die Stufen-Beschriftungen der Anweisung
   (Punkt 3) passen nicht mehr auf die heutigen Stufen und wurden deshalb nicht
   übernommen; sie stimmen auch so (iii kommt in Stufe 2 jetzt aus `pachelbel`).
3. **Paket 3, Stufe 2 („do bis so“): „so“ löst abwärts auf** (so – fa – mi –
   re – do, 5 Schritte). Anhang A lässt „so“ über la – ti – do′ aufsteigen; in
   Stufe 2 gibt es aber keine Knöpfe für la und ti, es könnte also nichts
   aufleuchten. Die Anweisung verlangt beides („jeder Wert der Auflösung hat
   einen Knopf“ und „Länge ≤ 5“, was zu 5 Schritten passt). Der Test fand das
   sofort. Ab Stufe 3 gilt Anhang A unverändert.
4. **Paket 3/4 verdrahten ihren Modus selbst** (`EAR_MODES`-Eintrag,
   `MODE_TEXT`, `ear.levels`, `earLevelInfo`), Paket 5 macht den Rest. Ohne das
   wären Anzeige und Tests der Pakete nicht ausführbar gewesen; die Endstände
   sind die der Anweisung.
5. **`onToolStep`** (Schnellstart) wurde ergänzt: Die neuen Modi zählen schon
   beim ersten Tipp, das Umschalten zum nächsten Modus kam aber 1,5 s später —
   mitten im Raten oder in der Auflösung. Es wartet jetzt, bis die Aufgabe
   aufgedeckt und die Auflösung vorbei ist (Test dafür in Paket 5).
6. **`restore`:** Die drei neuen Einstellungen setzen bei fehlendem oder
   ungültigem Wert ausdrücklich den Standard (die älteren Einstellungen
   behalten dagegen den aktuellen Wert). Bei einem frischen Start ist das
   dasselbe.
7. **Angepasster bestehender Test:** „Hören: Speichern/Laden verliert
   Stufen/Stimme/Modus“ (`earPackageCheck`) verglich `ear.levels` als
   Ganzes mit vier Schlüsseln; `ear.levels` hat jetzt zwei mehr. Der Test prüft
   jetzt genau diese vier Schlüssel. Sonst wurde kein bestehender Test
   verändert.
8. **Ausgabelatenz** wird in die Leuchtzeit eingerechnet (`outputLatency` +
   `baseLatency`, höchstens 0,5 s), damit die Hervorhebung dem hörbaren Klang
   folgt und nicht dem Zeitpunkt der Planung. Nicht gefordert, aber die
   Sorge unter „Manuell prüfen“ betrifft genau das.
9. **Sehr enger gemessener Umfang:** `singRange` kann bei einem persönlichen
   Umfang unter einer Oktave nicht jede Tonhöhenklasse enthalten. Der Ton wird
   dann bis zur Oktave über der Untergrenze geweitet (`Math.max(hi, lo + 11)`).
   Mit den Standardumfängen (16–18 Halbtöne) tritt das nie ein.

## Beobachtungen (nicht umgesetzt)

- **`sing.solfa` steht standardmäßig auf Zahlen** (`SOLFA_DEFAULT`). Der Kurztext
  „Nach der Kadenz ein Ton – welche Silbe?“ passt dann zunächst nicht zu den
  Knöpfen 1 2 3. Der Text in der Anweisung ist verbindlich, die Aufgabenansicht
  sagt je nach Einstellung „Stufe“ oder „Silbe“.
- Die Hilfe im Einstellungsblatt der Akkordfolgen („Jede Stufe enthält …“)
  ist unverändert und stimmt weiter.
- `extra.style.flexDirection` wird in „Stimmen“ gesetzt und in keinem anderen
  Modus zurückgesetzt; bei den neuen Modi ohne sichtbare Wirkung (ein Knopf).
- In der eigenständig geöffneten `uebe-lab.html` meldet die Konsole ein 404 für
  eine Ressource; das war schon vor den Änderungen so.
- `README.md`: In „Wichtige Regel für Änderungen“ fehlen `uebe-lab.html` und die
  anderen Tool-Seiten in der Aufzählung (steht so in `CLAUDE.md`, dort vollständig).

## Manuell auf echten Geräten prüfen

- **Läuft die Hervorhebung auf dem Handy synchron zum Klang?** Im Headless-Test
  liegt sie ~40 ms nach dem Klang-Einsatz. Mit Bluetooth-Kopfhörern hängt es
  davon ab, ob der Browser `outputLatency` verrät (Safari tut das nicht). Wenn
  sie sichtbar zu früh kommt: Latenz-Regler wie beim Rhythmus erwägen.
- **Ist der Einzelton nach der Kadenz in Bass-Lage (tiefe Männerstimmen) noch
  gut zu hören?** Kadenz und Ton kommen aus derselben Klavier-Engine; der Ton
  hat `velocity .22`, die Kadenz-Akkorde `.13` je Ton.
- **Fühlt sich „weiter tippen bis richtig“ gut an, oder frustriert es auf
  Stufe 3 mit sieben Knöpfen?** Nach dem zweiten Fehlversuch wird aufgedeckt;
  danach gibt es keinen dritten Versuch.
- Dazu: Kadenz-Tempo (`ear.settings.tempo`) in „mittel“: Ist die Pause von 0,6 s
  nach der Kadenz lang genug, um den Ton als Neubeginn zu hören?
- Auf dem Handy: Screenreader — kommt der Satz mit der Auflösung einmal an, und
  wird der Wechsel der Knöpfe nicht zusätzlich angesagt?
- Die Auflösung „so – fa – mi – re – do“ in Stufe 2 (siehe Abweichung 3): fühlt
  sich der abwärts laufende Weg vertraut an?

## Zu entscheiden

- **Funktionsbuchstaben** (T, S, D, Tp, Sp, Dp) auf den Akkordknöpfen? In Moll
  sind die Bezeichnungen nicht einheitlich, daher bewusst weggelassen.
- **Mehrere „Segmente“:** Aufgaben mit zwei bis drei Tönen/Akkorden nacheinander
  (dann ohne Auflösung)?
- **Gesungener Einzelton** statt Klavier, wahlweise wie `sing.demo`?
- **Stufe 2 der Töne:** „so“ abwärts auflösen (wie jetzt) oder la und ti als
  Knöpfe schon in Stufe 2 anbieten, damit Anhang A wörtlich gilt?
- **Stufen-Beschriftungen der Akkordfolgen:** Sollen die Stufen an die neuen
  Folgen angepasst werden (etwa Stufe 1 „die vier Pop-Akkorde, auch ab der IV“)?
- **Beschriftung der Töne:** Soll der Standard von „Singen“ (`numbers`) für die
  Töne in der Tonart auf Silben umgestellt werden, damit Kurztext und Knöpfe
  zusammenpassen? Der Wert ist mit „Singen“ geteilt.
- **Branch:** Soll der Stand nach `hoeren-tonart` übertragen werden, wenn der
  Branchname wichtig ist?
