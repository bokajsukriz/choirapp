# Bericht: Korrekturen in den Übe-Tools

Grundlage: `ARBEITSANWEISUNG-UEBE-KORREKTUREN.md` (aktualisierte Fassung, Basis
Übungen-Redesign `75078bc`, `SW_VERSION` v456). Alle Befunde wurden vor jedem
Paket im aktuellen Code nachgeprüft; keiner war schon behoben. Umgesetzt sind
die Pakete 1–12, aus Paket 11 fehlt nur der optionale Teil 11c.

**Branch und PR:** `origin/main` enthält `75078bc` nicht. Die Sitzung schreibt
`claude/affectionate-archimedes-75nl5c` vor, und das ist der Redesign-Branch
selbst. Die Korrekturen liegen deshalb als eigene Commits direkt auf ihm, oberhalb
von `75078bc`. Ein PR „gegen den Redesign-Branch“ ist so nicht möglich (Quelle =
Ziel); die Commits laufen im schon offenen PR
[bokajsukriz/choirapp#168](https://github.com/bokajsukriz/choirapp/pull/168) mit.
Kein Merge, kein Force-Push, nichts auf `main`.

**Ablauf:** Ein erster Durchlauf nach der älteren Anweisung (Basis `main`) hatte
die Pakete 1, 2 und 4 schon auf diesem Branch umgesetzt. Nach der neuen Anweisung
wurden sie geprüft: Sie passen; Paket 1 bekam einen kleinen Nachtrag (Satz in das
Blatt „Hilfen“ statt ins Zahnrad).

## Status

| Paket | Inhalt | Status | Commit | SW_VERSION | Tests (Zahlen) |
|---|---|---|---|---|---|
| 1 | Intonation im Akkord: reine Stimmung | umgesetzt | `d469661`, Nachtrag `e19b3c0` | v457, v460 | `justOffsetCents` 0/3/4/7/12/16 auf ±0,05 Cent; 60 Akkord-Aufgaben (Stufe 5/6): Terz/Grundton = 5/4 ± 0,1 Cent, Quinte = 3/2; Verstimmung genau zusätzlich |
| 2 | Ton halten oktavneutral | umgesetzt | `adb675f` | v458 | Ziel 64, gesungen 52 ± 5 Cent → Lage ≈ 0, ruhig, Oktave −1; 64,3 → +30 Cent; 70/30 gemischte Oktave → keine Oktav-Meldung |
| 3 | Tonhöhe per Median | umgesetzt | `e1321cb` | v464 | 20 × 60 + 1 × 72 → 60,00 (Mittelwert war 60,57); Vibrato ±0,3 HT, 4,5–6,5 Hz: Mitte im Verlauf ≤ 0,0084, Ausschlag ≤ 0,115; alle Sing-Tests grün |
| 4 | Einsingen: Ruf nie mit kalter Stimme | umgesetzt | `312caa4` | v459 | 8 Programme × 3 Belastungen × 30 Rotationen: Ruf nie vor Twang (Gegenprobe ohne Filter: 60 Fehler); deterministisch; `[ruf, lippen]` → neuer Tipp |
| 5 | Einsingen: Männerstimmen am Übergang | umgesetzt (mit Abweichung) | `53eeceb` | v461 | T normal Oktavsprung ≤ f′, B Dreiklang ≤ b; S/A und alle anderen Übungen unverändert; „kein Ton verlässt den Umfang“ grün |
| 6 | Rhythmussilben und Zählweise | umgesetzt | `3392d3d` | v467 | `synkope16` „ti ri-i ri ta“ ≠ `achtel16` „ti ti ri …“; `aufA` „1 (2) a 3 4“ ≠ `aufE`; alle Kurs-Takte: 0 Kollisionen |
| 7 | Hören: mehrdeutige/falsche Aufgaben | umgesetzt, 7d eingeschränkt | `4851c9a` | v468 | 200 Ganzschlüsse Stufe 6 enden in Grundstellung; 2000 Akkordfarben-Aufgaben Stufe 6 ohne sus-Umkehrung; Moll-Kadenz Stufe 5 in 12 Tonarten ohne Ton 11, ohne Parallelen |
| 8 | Licks: faire Bewertung, eigene Lage | umgesetzt | `b260195` | v466 | „Ganz“ 14/16 geschafft, 13/16 nicht; „Stückweise“ mit 1 Zusatz-Tipp geschafft, mit 2 nicht; `bassOktav`: Sopran +2 (bzw. +1 mit tieferem Umfang), Bass 0; eingebettet mit S/A/T/B grün |
| 9 | Licks singen statt tippen | umgesetzt | `5f8c4ab` | v473 | synthetischer Lick: alle Anschläge ±20 ms, richtige Tonklasse; Vibrato ±30 Cent → 1 Anschlag; Oktavsprung des Erkenners → 1; gebundener Wechsel → 2; Knackser < 80 ms → 0 |
| 10a | Kunststimme, Tuner-Zone | umgesetzt | `c82bc9e` | v469 | Anschleifen −20 Cent/50 ms; Vibrato erst ab 1 s, letztes Drittel, ±12 Cent; Zone bei ±50 und ±100 genau ±10 Cent; `selfCheckAudio` grün |
| 10b | Licks: Funk-Bass-Text, Disco-Bassdrum | umgesetzt | `c274bff` | v465 | `bassFunk16` auf 1, 1-a, 2, 2-a, 3-e, 4, 4-und, 4-a nachgezählt; Bassdrum `bassOktav` 0/12/24/36, alle anderen 0/24 |
| 10c | Einsingen: Atem-Bilder | umgesetzt | `388bc96` | v462 | kein „in den Bauch“ / „Zwerchfell-Staccato“ mehr im Text |
| 10d | Klavier: festes Do | umgesetzt | `7bbb599` | v463 | Hinweis genau beim ersten Einschalten, danach nie wieder; `title` gesetzt |
| 11 | Rhythmus mit dem Körper | umgesetzt (11a, 11b); 11c nicht | `53a360c` | v470 | Fuß-Raster in jedem Takt 0/12/24/36; Stufe 3 still ab Takt 3; Schichten, Wechsel nach 4/8 Takten, Ansage genau einen Takt vorher (je 20 Aufgaben je Stufe); Mikrofon wertet Stampfen/Patschen nicht; Ring unverändert ohne gespielten `body` |
| 12a | Einsätze in den Klatsch-Grooves | umgesetzt | `a40ea2f` | v471 | 3 Auftakt-Lektionen × 3 Längen: je Wiederholung genau ein Einsatz im Phrasenabstand; +60 ms → „spät“ mit Atem-Tipp |
| 12b | Neue Übung „Wieder einsetzen“ | umgesetzt | `6756492` | v472 | `a4` = Tick 45, `drei8` = 30/36/42 im Takt davor; 6 Stufen × 100 Aufgaben: Pausen im Bereich, Begleitung, Stufe 6 still vor dem Einsatz, Atem einen Schlag vor dem Einsatz; +60 ms → „zu spät“ |

Vor jedem Commit lief headless Chromium (Playwright, vorinstalliert) mit dem
Selbsttest der betroffenen Seite; alle liefern `[]`:
`uebeLab.selfCheck()` (eigenständig je ca. 5 Min.), `einsingen.selfCheck()`,
`licks.selfCheck()` (eigenständig und eingebettet mit Sopran/Alt/Tenor/Bass),
`piano.selfCheck()`, `chorApp.selfTest()`, `selfTestAsync()`, `selfTestMusic()`.
Reine Funktionen wurden vorher in Node geprüft (Median, Silben).

## Je Paket

### 1 – Intonation im Akkord
- `justOffsetCents(semisAboveRoot)`: Terz 5/4, kleine Terz 6/5, Quinte 3/2; andere Stufen 0, weil `satbOf(key, ['I'])` nur Grundton, Terz und Quinte liefert.
- `tuningChordCents(task, x)`: reine Stimmung zum (gleichstufigen) Grundton plus `task.cents` für die markierte Stimme, auch beim Vorspielen allein. `key` steht jetzt in der Aufgabe.
- Die ±2,5-Cent-Wanderung von `engine.saw` bleibt; ihr Mittel ist jetzt der reine Sollton.
- Der Satz „Im Akkord gilt die reine Stimmung …“ steht in der vollen Erklärung im Blatt „Hilfen“ (`earHelpInfo`), nicht in der Bühne.

### 2 – Ton halten oktavneutral
- `holdStep` faltet wie der Tuner auf ±6 Halbtöne und merkt die Oktavlage je Wert; `finishHold` meldet bei ≥ 80 % gleicher Oktave „(eine Oktave tiefer – passt)“.
- Ohne Stimmprofil steht über „Ton halten“: „Wähle im Zahnrad deine Stimme, dann liegt der Ton in deiner Lage.“ **Abweichung:** „im Zahnrad“ statt „oben“ – die Stimmwahl liegt seit dem Redesign im Zahnrad (D-10), oben gibt es keinen Stimm-Wähler.

### 3 – Median
- `medianOf` (gerade Anzahl: Mittel der beiden mittleren Werte) und `smoothPitch` als Median; die alten lokalen `median`-Helfer bleiben.
- **Abweichung beim Test:** Für ein einzelnes Fenster weicht der Median bei Vibrato ±0,3 Halbtöne je nach Phase um bis zu 0,115 Halbtöne ab (der Mittelwert um bis zu 0,06). Geprüft wird deshalb die Mitte im Verlauf (≤ 0,05, gemessen ≤ 0,0084) und der Ausschlag (≤ 0,15). Keine bestehende Schwelle wurde verändert; der Tuner-Test „Vibrato ±50 Cent ≤ 10 Cent“ bleibt grün.

### 4 – Ruf nie mit kalter Stimme
- `ruf` hat `needsWarm: 'twang'`; `resolveProgram` lässt Pool-Kandidaten mit `needsWarm` nur zu, wenn die genannte Übung vorher im aufgelösten Programm steht. ⇄-Wahlen bleiben frei.
- `draftWarning`: „Tipp: Den Ruf erst nach Lockern und Twang.“; der Höhe-Hinweis hat Vorrang.

### 5 – Männerstimmen am Übergang
- `topLow: −2` für Oktavsprung, Dreiklang, Moll-Dreiklang, Staccato–Legato, Koloratur und – nach der Nachrechnung (Tenor über e′) – **Nja-nja-nja** und **Riff** (offene Vokale). Hinweissatz für tiefe Stimmen im zweiten Hilfe-Absatz dieser Übungen.
- **Abweichung von der Formel:** `v.floor + ex.top + L.topShift + topLow` wirkt nicht, wo danach `v.ceil` greift (Tenor-Oktavsprung bliebe bei g′). `topLow` wird deshalb von der *wirksamen* Obergrenze abgezogen: `min(…, v.ceil) + topLow`. Nur so gilt „2 Halbtöne tiefer“ und der geforderte Test (≤ f′).
- **Abweichung:** Damit die Programme ihre Rückungen behalten (sonst z. B. „Kurz“/T Koloratur 2 statt 3, „Ausführlich 20 Min“/T nur 15,7 Min.), rückt der Start bei T/B um höchstens denselben Betrag mit nach unten, nie unter den Umfang. Die bestehenden Prüfungen blieben unverändert.
- Höchster Ton vorher → nachher:

| Übung | T leicht | T normal | T kräftig | B leicht | B normal | B kräftig |
|---|---|---|---|---|---|---|
| `oktave` | d′ → c′ | g′ → f′ | g′ → f′ | gis → fis | d′ → c′ | d′ → c′ |
| `dreiklang` | es′ → cis′ | fis′ → e′ | g′ → f′ | a → g | c′ → b | d′ → c′ |
| `mollDreiklang` | es′ → cis′ | fis′ → e′ | g′ → f′ | a → g | c′ → b | d′ → c′ |
| `staccatoLegato` | es′ → cis′ | fis′ → e′ | g′ → f′ | a → g | c′ → b | d′ → c′ |
| `koloratur` | cis′ → h | g′ → f′ | g′ → f′ | g → f | cis′ → h | d′ → c′ |
| `nja` | d′ → c′ | f′ → es′ | g′ → f′ | gis → fis | h → a | cis′ → h |
| `riff` | c′ → h | fis′ → e′ | g′ → f′ | fis → f | c′ → b | d′ → c′ |

Sopran und Alt: unverändert. Über e′ (T) bzw. c′ (B) liegen außerdem `sirene` (T g′), `eule` und `kopfAbwaerts` (T g′, B cis′); sie bleiben unverändert, siehe „Zu entscheiden“.

### 6 – Rhythmussilben und Zählweise
- Silben nach Lage im Schlag: Schlag/„und“ → „ti“, „e“/„a“ → „ri“, ab Achtellänge auf „e“/„a“ „ri-i“. Zählweise „1 e + a“ bei Schlageinheit 12.
- Lektionstext „1 e + e“ → „1 e + a“ (`sechzehntel`). Alle übrigen Silben-Zitate in `intro`/`more` und in den Vorstellungen (`COURSE_INTRO`) passen schon. Der Text von `aufA` („1 (2 e +) a 3 4“, inneres Mitzählen) bleibt; die Anzeige ist „1 (2) a 3 4“.
- Angepasste bestehende Tests: „Silben 16tel/Triole“ (erwartet jetzt `1 e + a …`) und „Silben e/a“ (Sechzehntel auf 2-a zählt „a“).

### 7 – Hören
- 7a: letzter Akkord einer Phrase bei `'style'` immer in Grundstellung.
- 7b: Amen-Text nach Anweisung.
- 7c: sus2/sus4 nur in Grundstellung (Begründung im Kommentar).
- 7d: **eingeschränkt.** „Akkordfolgen“ fragt keine Folgennamen ab, sondern Stufen relativ zum angezeigten Tongeschlecht (Unterzeile „Dur“/„Moll“, Antworttasten nur aus Folgen dieses Tongeschlechts). Eine Antwort „epic“ auf eine `sad`-Aufgabe gibt es nicht, also auch keine falsche Wertung. Umgesetzt ist der erklärende Satz („Gleiche Akkorde wie „Epische Moll-Folge“ – einmal von Dur aus gehört, einmal von Moll aus.“), allgemein für klanggleiche Folgen der Auswahl (`sameChordProgs`); gebucht wird weiter auf die gezogene Folge.
- 7e: Stufe 5 kadenziert i–VI–VII–i; in Stufe 6 lösen mi, fa, so in Moll stufenweise abwärts auf, si aufwärts (gilt auch für die Tonmuster, die dieselbe Auflösung nutzen). „Akkorde in der Tonart“ fragt in Moll die V ab und bleibt bei i–iv–V–i. Angepasster Test: Auflösungsprüfung für Stufe 6 in Moll (Weg abwärts, bis 7 Töne).

### 8 – Licks
- `wholeVerdict`: ab ⌈85 %⌉ Treffern und ≤ 1 Ton zu viel; Text „Fast alles – X von Y Tönen …“.
- `partMessage`: genau ein Zusatz-Tipp wird probeweise weggelassen; passt dann alles, „(ein Ton zu viel – zählt trotzdem)“.
- `voiceOctave` nach `ChorHarmony.practiceRange`; eigene Okt-Wahl geht vor; Oktavgrenzen ±2 (MIDI 24–96), Ablage akzeptiert −2 … 2. Vorspiel (jetzt auch ohne eigene Wahl), Liegeton (mit Profil) und Tastatur folgen.
- Angepasste Tests: `partMessage`-Fall „vier statt drei Töne“ (jetzt geschafft) und die Startton-Prüfung in `flowCheck` (Taste in der verschobenen Lage).

### 9 – Licks singen
- Eingabe „Tippen · Singen“ (Feld `input`); Mikro-Symbol im Dock nach dem Muster der Sing-Bühne.
- Das Mikrofon öffnet zu Beginn eines Laufs mit eigener Runde (die Freigabe braucht den Tipp auf Start) und schließt am Ende bzw. bei Stopp, Seitenwechsel, Verdecken. Im Lauf „Ganz“ liegt das Vorbild davor im selben Lauf; Anschläge vor dem eigenen Fenster fallen über die Bewertungsfenster heraus.
- „Startton finden“ bleibt bei der Tastatur.
- Angepasster Test: Ablage-Roundtrip erwartet `input: 'tap'`.

### 10 – Kleinkram
- 10a: `VOICE_SCOOP`, `voiceVibrato`, `gaugeZone`.
- 10b: Der neue Funk-Bass-Text hat 197 Zeichen, die Vorstellung darf 160 haben (Layout-Prüfung). Der Satz zu den letzten drei Tönen steht deshalb am Anfang von „Mehr dazu“ (185 von 185). Angepasst: die zwei Groove-Tests, die genau zwei Bassdrums je Takt erwarteten.
- 10c: keine weiteren Stellen mit „Luft in den Bauch“ in den Tool-Seiten.
- 10d: Hinweis über den vorhandenen `.hint`-Baustein (auch im Querformat sichtbar), 8 s, gemerkt in `solfHint`.

### 11 – Körper
- Eingebunden als Übung `body` im Gerüst von „Einsatz finden“: gleiche Ansicht (`views.rhythm = 'downbeat'`, `ear.mode` unterscheidet), eigene Zeile in der Rhythmus-Übersicht, Stufen, Hilfen, Tempo, Eingabe und Latenz wie dort. Gerüst-Positionen (Phasenleiste, Bühne, Klatschfläche, Knöpfe) mit Playwright gleich wie „Einsatz finden“; Läufe Stufe 1 und 5 mit simulierten Tipps bis zur Auflösung.
- Stufe 6: Die Schnipsen-Schicht trägt in der Hälfte der Aufgaben einen gelernten 4/4-Rhythmus, wenn es einen gibt.
- Probenmodus im Zahnrad: alle vier Schichten in Schleife, je Stimme groß ihre Schicht (2 × 2, antippen wechselt).
- **Ring:** wie `downbeat` – ein Bereich zählt mit, sobald er eine Stufe hat. Das ist nach einem Lauf so, aber auch, wenn man nur die Stufe bewusst wählt (Stufen werden nur bei Änderung gemeldet, bloßes Öffnen meldet nichts). Keine neue Regel nötig.
- Angepasste Tests: Reihenfolge der Hör-Modi und die zwei Listen-Tests, die nur `downbeat` aus der Hören-Liste ausnahmen.
- **11c nicht umgesetzt** (optional): Für „Sprechen und steppen“ hätte zuerst die Einsatzerkennung für Sprache simuliert werden müssen; der Umfang stand gegen die übrigen Pakete.

### 12 – Einsätze
- 12a: `holdEntries`/`entryLine` (bewusst außerhalb des wortgleichen Blocks HOLD_STAGES … nextDue). „Pünktlich“ = im Fenster.
- 12b: Übung `entries` im selben Gerüst. „Pünktlich“ = höchstens 40 ms daneben, darüber „zu früh“/„zu spät“; für „geschafft“ (≥ 80 %) zählt jeder Einsatz im Fenster. „Atmen“ ist nur Text (deshalb ohne Animation, auch bei `prefers-reduced-motion`). Fehler je Einsatz in `entryLog` (je 6), Ziehen gewichtet wie `pickInterval`.

## Beobachtungen

- Rhythmus-Kurs, Lektion `synkope` (6 12 6 12 12): Die Zählweise zeigt „1 + + 3 4“ – die Viertel auf „und“ hält über die 2, die aber nicht als „(2)“ erscheint. Unverändert.
- Einsingen: Die Testseite für eingebettete Prüfungen (`_harness.html`) wurde nur lokal benutzt, nicht committet.
- `uebeLab.selfCheck()` braucht eigenständig etwa 5 Minuten (wie schon im Redesign-Bericht vermerkt).
- „Ablauf: Nach richtiger Antwort automatisch weiter“ steht im Zahnrad auch bei den Rhythmus-Übungen im Hör-Gerüst, wirkt dort aber nicht (wie schon bei „Einsatz finden“).

## Manuell auf echten Geräten prüfen

- Intonation Stufe 5/6: Klingt der Fangakkord jetzt schwebungsfrei? Ist die Verstimmung der markierten Stimme bei 10–15 Cent noch hörbar?
- Ton halten: Tenor/Bass ohne Stimmprofil, eine Oktave tiefer gesungen – wird es jetzt gewertet?
- „Meine Stimme“ mit Median: Reagiert die Nadel noch schnell genug bei Tonwechseln?
- Einsingen „Kurz“ mehrmals starten: Kommt der Ruf jetzt nur nach Twang – und kommt er noch oft genug vor? (Er kann nur in Starts kommen, in denen Twang im Pool „Klang nach vorn“ gezogen wurde.)
- Einsingen Tenor/Bass: Sind Oktavsprung und Dreiklang jetzt angenehm, und stört der zwei Halbtöne tiefere Start unten nicht?
- Licks in Sopran-Lage: Klingt ein hochoktavierter Bass-Preset noch gut?
- Licks „Singen“: Werden gesungene Töne zuverlässig erkannt, auch mit Begleitung über Kopfhörer? Passt der Mikrofon-Latenzausgleich (`micMs`) aus dem Rhythmus-Bereich auch fürs Singen?
- Körper (11b) mit Mikrofon: Werden Klatschen und Schnipsen zuverlässig erkannt, während das Handy die anderen Schichten über den Lautsprecher spielt?
- Körper im Probenmodus auf einem Beamer: groß genug?
- Wieder einsetzen (12b): Ist das hörbare Atmen im Vorspiel als Atmen erkennbar oder klingt es wie Rauschen?
- Klavier im Querformat: Stört der kurze Hinweis „Do = C“ über der Klaviatur?

## Zu entscheiden

- Soll die Intonations-Erklärung (reine Terz) auch in „Singen → Tuner“ auftauchen (Hinweis „im Akkord Terz etwas tiefer“)?
- Sollen beim Hochoktavieren von Basslicks automatisch ein Lead-Klang statt „Growl Bass“ gespielt werden?
- Soll der Probenmodus der Body-Percussion (11b) auch direkt von der Tools-Seite erreichbar sein (eigene Kachel unter „Werkzeuge“)?
- Sollen später echte Einsätze aus den Chorsongs (mit Textsilbe) in „Wieder einsetzen“ kommen? Dafür bräuchte es Rhythmusdaten je Song.
- Soll „1 e + a“ auch im Groove Lab gelten (dort derzeit „1 e + e“, in `strings.js` dreisprachig)?
- Einsingen: Sollen auch Sirene, Eulenruf und „Von oben“ für Tenor/Bass gesenkt werden? Sie liegen für T bei g′, sind aber Kopfstimmen-Übungen auf „ng“/„hu“, bei denen die Höhe der Zweck ist – deshalb unverändert.
- Ring der Rhythmus-Kachel: Soll ein Bereich wirklich erst nach einem *Lauf* mitzählen (strenger als heute bei `downbeat`, wo schon eine gewählte Stufe zählt)?
- Licks „Singen“: Soll auch „Startton finden“ übers Mikrofon gehen?
- 11c „Sprechen und steppen“: später nachholen?
