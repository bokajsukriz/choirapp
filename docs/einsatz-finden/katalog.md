# „Einsatz finden“: Song-Katalog für den Popchor

In die App übernommen (`uebe-lab.html`, Block `DB_SONGS`); Songs nur in `gen/songs-src.mjs` ändern, dann `node docs/einsatz-finden/gen/build.mjs` (Auftrag: `docs/archiv/ARBEITSANWEISUNG-EINSATZ-FINDEN-SONGS.md`). Die Daten liegen maschinenlesbar in `docs/einsatz-finden/songs.js` (`DB_SONGS`, `SONG_LEVELS`, `SONG_PATTERNS` und die Referenzfunktionen `songEvents`, `songFairness`, `songPeriodFairness`). Die Steckbriefe unten sind aus genau diesen Daten erzeugt, Datei und Steckbriefe stimmen also überein.

**Urheberrecht.** Alle 48 Songs sind frei erfunden: Namen, Akkordfolgen, Melodien und Riffs. Sie übernehmen nur Stil, Besetzung und Groove-Typ, also gerade Rock-Achtel, Piano-Rock, Folk-Stomp, Disco-Indie, Halftime-Bridge, 6/8-Ballade, „Whoa-oh“-Chöre, Glam/Opern-Rock. Akkordfolgen wie I–V–vi–IV sind Allgemeingut. Die Melodien sind eigene, kurze Linien aus Stufen.

## Wie viele Songs? 48

- **Je Stufe 7 bis 21 Songs.** Etwa 6 eigene Songs pro Stufe. Weil viele Songs in zwei Stufen vorkommen (z. B. Stufe 2 und 7), wird der Vorrat pro Stufe größer. Die schmalsten Stufen sind 3 (Dreier) und 8 (Glam) mit je 7 Songs; die Muster dort wechseln stärker. Mit Tonart, Tempo, Einstiegsstelle und Muster jeweils zufällig klingt kaum eine Aufgabe wie die vorige. Bei 10 Aufgaben pro Sitzung und 3 bis 4 Sitzungen pro Woche hört man jeden Song einer Stufe etwa 3- bis 5-mal pro Woche. Das ist genug, um ihn wiederzuerkennen, aber nicht so oft, dass man auswendig klatscht. Für mehrere Übe-Wochen pro Stufe reicht das.
- **Pflege und Test.** 48 Steckbriefe lassen sich noch von Hand pflegen und anhören. Der Fairness-Test läuft für alle Songs in Millisekunden. Bei 100 Songs würde das Hörprüfen durch die Chorleitung (jeder Song einmal anhören, „Worauf hören?“ gegenprüfen) zur Hürde, und die Datei würde auf über 150 KB wachsen.
- **Erweiterung später:** in Stilpaketen zu je 6 Songs, z. B. „Weihnachten“, „Musical“, „Gospel“. Die Stufen bleiben gleich.

## Geänderte Stufenfolge (Popchor-Welt)

Gegenüber dem ersten Konzept:
- **Stufe 1:** nur gerade Rock- und Pop-Grooves mit allen Zeichen. Nur Typ A.
- **Stufe 2:** Backbeat, „1 und 4“ und Punk-Pop.
- **Stufe 4 (ohne Bass):** Piano-Rock und Akustik-Indie, wo Klavier und Gitarre die Harmonie tragen.
- **Stufe 5 (falsche Fährten):** Four-on-the-floor (Disco-Indie, Folk-Stomp), vorgezogener Bass, Auftakt-Melodie, Riff mit Anlauf.
- **Stufe 6:** Halftime-Bridges, Shuffle/Rockabilly, 12/8-Power-Ballade, Polka-Punk.
- **Stufe 7:** Stadion-Hymnen mit Fills, Becken, „Whoa-oh“ und „Hey!“. Typ C: Einsatz auf der Phrasen-Eins.
- **Stufe 8:** Glam/Opern-Rock mit 3+3+2-Klavier, 6/8 gegen 3/4, Stop-Time, Galopp, Akkordrückungen.

Neue Muster: `hemi68` (1·3·5 im 6/8), `one128` und `back128` (12/8). Den Rest gibt es schon.

## Abwechslung (Erweiterung von dbLog)

1. Kein Song zweimal innerhalb der letzten 3 Aufgaben.
2. Dieselbe Stil-Familie höchstens zweimal in Folge.
3. Dasselbe Muster nicht zweimal in Folge, wenn der Song ein anderes erlaubt.
4. Zufällig gezogen wird ohne Zurücklegen (Shuffle-Bag) über die Paare aus Song und Muster der Stufe.
5. Tonart zufällig: Dur in F bis A, Moll in d bis fis, damit Bass und Melodie in Chorlage bleiben. Tempo zufällig im Bereich des Songs, dazu die %-Verschiebung.
6. In Stufe 7 abwechselnd Typ C und Typ A.

## Klänge (nur vorhandene Engine-Bausteine)

| Spur | Engine | Einstellung (Vorschlag) |
|---|---|---|
| Drums | `engine.drum` kick/snare/rim/hat/open, `engine.clap` | wie heute |
| Toms | `engine.drumTone` (Sinus) | hi 220→160 Hz, mid 160→110 Hz, lo 110→70 Hz, Ausklang 0,25 s |
| Becken | `engine.drumNoise` | Hochpass ≈ 6 kHz, Ausklang 1,2 s, leise |
| Bass | `engine.drumTone` triangle, Tiefpass 900 Hz | wie heute (`DB_BASS_STEPS` entfällt) |
| Klavier | `engine.keys` | velocity 0,15 bis 0,2 |
| Fläche | `engine.saw` ×2 (±6 Cent), Tiefpass | leise, Einschwingen 80 ms |
| Stabs, Lead | `engine.saw`, kurz bzw. gefiltert | Lead eine Oktave über der Fläche |
| Chor-Chops | `engine.voice` | Silbe nur als Text; der Klang ist der Vokal der Singstimme |
| Block | `engine.block` | nicht benutzt, Reserve |

## Fairness-Regel (Selbsttest)

`songFairness(song)`: Jede Verschiebung um eine Zählzeit (4/4 und 3/4: Viertel; 6/8 und 12/8: Achtel) muss sich vom Original unterscheiden. Geprüft wird ohne Hi-Hat, Becken, Fill und Takt-Variationen, also nur mit dem Takt-Groove. Zusätzlich gilt:
- In Stufe 1 bis 3 müssen mindestens 2 Spuren die Eins jeweils allein eindeutig machen, sonst mindestens 1.
- Songs in Stufe 4 werden auch ohne Bass geprüft.
- Typ-C-Songs prüft `songPeriodFairness`: Eine Verschiebung um 1 bis Periode−1 Takte muss anders klingen.

Alle 48 Songs bestehen. Gegenprobe: Ein Pop-Groove ohne Bass mit gleichem Akkord in jedem Takt fällt durch (mehrdeutig bei Verschiebung um 2 Schläge).

Damit nicht nur die Daten stimmen, sondern auch das Ohr: Ein zweiter, harmonischer Check fand Melodietöne außerhalb des Akkords auf betonten Zeiten. Die sind korrigiert. Was übrig ist, sind Durchgangstöne auf leichten Zeiten.

## Offene Fragen an die Chorleitung

- Ist Punk-Pop mit ♩ 140–156 (Schwarzweißfilm) schon in Stufe 2 in Ordnung? Klatschen auf die 1 sind dann nur 35 bis 39 pro Minute, also gut machbar, aber die Anzeige „150“ hat schon einmal irritiert. Alternative: als ♩ 70–78 im Halftime-Gefühl anzeigen.
- Sollen Chor-Chops echte Silben singen? `engine.voice` singt nur einen Vokal.
- Darf Typ C (Stufe 7) mit Mikrofon „da“ singen? Oder nur klatschen, solange die Einsatzerkennung über das Mikrofon nicht im Chor getestet ist?
- Moll-Songs nach Dur-Stufen bezeichnen (i, bVI …) oder in der Anzeige als Moll-Stufen?

## Stufen und Song-Pools

| Stufe | Lernschritt | Typen | Muster | Einstieg | Songs (Pool) |
|---|---|---|---|---|---|
| 1 | Klare Eins: klatsch auf die 1 | A | auf die 1, auf die 1 (3/4), auf die 1 (6/8) | Schläge | 8: Fahrradkette, Stadtrand, Kneipenklavier, Garagentor, Lagerfeuer, Leuchtturm, Rotlicht, Glasdach |
| 2 | Backbeat und Muster | A/B | auf die 1, 2 und 4 (Backbeat), 1 und 4 | Schläge | 14: Fahrradkette, Stadtrand, Kneipenklavier, Garagentor, Lagerfeuer, Leuchtturm, Schwarzweißfilm, Gummistiefel, Nachtbus, Hafenkneipe, Tanzverbot, Sommerregen, Kopfsteinpflaster, Whoa-oh |
| 3 | Dreier: Walzer und 6/8 | A/B | auf die 1 (3/4), 2 und 3 (um-pa-pa) (3/4), auf die 1 (6/8), auf die 4 (6/8) | Schläge | 7: Leiser Walzer, Kerzenschein, Seemannsgarn, Dachboden, Zuckerwatte, Abschlussball, Anlauf |
| 4 | Ohne Bass: Akkorde und Melodie (Bass stumm) | A/B | auf die 1, 2 und 4 (Backbeat), 1 und 4, auf die 1 (3/4), 2 und 3 (um-pa-pa) (3/4) | Schläge | 8: Rotlicht, Sommerregen, Zuckerwatte, Glasdach, Papierflieger, Kopfsteinpflaster, Morgengrauen, Altbau |
| 5 | Falsche Fährten | A/B | auf die 1, 1 und 4, 1 und 4+ (vorgezogen), 2 und 4 (Backbeat) | auch „und“ | 9: Schwarzweißfilm, Tanzverbot, Discokugel, Holzfällerhemd, Vorstadtfunk, Auftakt-Hymne, Neonlicht, Bahnsteig, Mitsingrefrain |
| 6 | Halftime, Shuffle, 12/8 | A/B | auf die 1, 2 und 4 (Backbeat), 1 und 2+ (Charleston), 1 und 4, 1 und 4+ (vorgezogen), auf die 1 (12/8), 2 und 4 (große Schläge) (12/8) | auch „und“ | 8: Vorstadtfunk, Neonlicht, Brücke, Rückspiegel, Wolkenkratzer, Gegenwind, Katerstimmung, Doppelte Zeit |
| 7 | Die Phrase finden: dein Einsatz | C/A | auf die 1, auf die 1 (3/4), auf die 1 (6/8) | beliebig in der Periode | 21: Fahrradkette, Stadtrand, Leuchtturm, Gummistiefel, Nachtbus, Hafenkneipe, Kerzenschein, Seemannsgarn, Dachboden, Abschlussball, Morgengrauen, Discokugel, Holzfällerhemd, Brücke, Gegenwind, Whoa-oh, Feuerwerk, Klavierintro, Mitsingrefrain, Festivalwiese, Anlauf |
| 8 | Glam und Taktgefühl | A/B | auf die 1, 1 · 2+ · 4 (3-3-2), 1 und 2+ (Charleston), 1 und 4, auf die 1 (6/8), 1 · 3 · 5 (wie 3/4) (6/8), auf die 4 (6/8) | auch „und“ | 7: Doppelte Zeit, Operettenhaus, Maskenball, Kronleuchter, Galopp, Drei gegen Vier, Opernteil |

## Übersicht nach Stil

| Stil-Familie | Songs | Taktarten | Tempo-Spanne |
|---|---|---|---|
| Indie-Rock | 7: Fahrradkette, Garagentor, Rotlicht, Nachtbus, Morgengrauen, Bahnsteig, Drei gegen Vier | 4/4 | 84–132 |
| Power-Ballade | 2: Stadtrand, Hafenkneipe | 4/4 | 68–96 |
| Piano-Rock/Deutsch-Indie | 7: Kneipenklavier, Leuchtturm, Sommerregen, Glasdach, Kopfsteinpflaster, Altbau, Klavierintro | 4/4 | 72–132 |
| Punk-Pop | 3: Schwarzweißfilm, Tanzverbot, Doppelte Zeit | 4/4 | 100–156 |
| Stadion-Hymne | 7: Gummistiefel, Auftakt-Hymne, Brücke, Gegenwind, Whoa-oh, Feuerwerk, Festivalwiese | 4/4 | 84–140 |
| Indie-Folk/Stomp | 5: Lagerfeuer, Seemannsgarn, Papierflieger, Holzfällerhemd, Mitsingrefrain | 4/4, 3/4 | 92–160 |
| Walzer 3/4 | 2: Leiser Walzer, Zuckerwatte | 3/4 | 84–138 |
| 6/8-Ballade | 4: Kerzenschein, Dachboden, Abschlussball, Anlauf | 6/8 | 52–68 |
| Disco-/Synth-Indie | 3: Discokugel, Vorstadtfunk, Neonlicht | 4/4 | 96–136 |
| Shuffle | 2: Rückspiegel, Katerstimmung | 4/4 | 96–136 |
| 12/8 | 1: Wolkenkratzer | 12/8 | 56–64 |
| Glam/Opern-Rock | 5: Operettenhaus, Maskenball, Kronleuchter, Galopp, Opernteil | 4/4, 6/8 | 56–144 |

## Steckbriefe

Notation: Zählzeiten 1 e + a (4/4, 3/4), in 6/8 und 12/8 Achtel 1–6 bzw. 1–12; „(sw)“ = geswingt. Bass/Arpeggio: Ton relativ zum Akkord. Melodie/Chor: T = Takt, Zählzeit→Stufe (Länge). Akkorde in Stufen relativ zur Dur-Leiter (Moll: i, bIII …). Tonart in der App zufällig (F–A bzw. d–fis). Die Zeichen-Spalte ist vom Fairness-Test berechnet (Spuren, die die Eins allein eindeutig machen).

### Stufe 1: Klare Eins: klatsch auf die 1

#### Fahrradkette `fahrradkette`
- **Stil:** Indie-Pop-Rock, gerade Achtel · 4/4 · ♩ 112–124 · 4 Takte · Dur
- **Akkorde:** I – V – vi – IV
- **Drums:** Bassdrum 1 3 3+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1
- **Klavier:** power auf 1 3 (je 1.8333333333333333♩)
- **Melodie:** T1: 1→3 (1.5♩), 2+→2 (0.5♩), 3→1 (2♩) · T2: 1→2 (2.5♩), 3+→7 (0.5♩), 4→5 (1♩) · T3: 1→6 (2♩), 3→5 (1♩), 4→3 (1♩) · T4: 1→4 (2♩), 3→3 (1♩), 4→2 (1♩)
- **Phrase:** Fill snare16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie · Periode: Becken, Snare/Clap/Rim, Melodie, Akkorde, Bass
- **Worauf hören?** „Der Bass wechselt auf der Eins den Ton, die Bassdrum spielt mit, und die Melodie setzt dort neu an.“
- **Stufen:** 1, 2, 7 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4 · Typ C

#### Stadtrand `stadtrand`
- **Stil:** Power-Ballade · 4/4 · ♩ 68–78 · 4 Takte · Dur
- **Akkorde:** I – vi – IV – V
- **Drums:** Bassdrum 1 3+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 3+:1 4:5
- **Klavier:** triad auf 1 2 3 4 (je 0.8333333333333334♩)
- **Fläche:** open, hält jeden Akkord
- **Melodie:** T1: 1→5 (2♩), 3→3 (1♩), 4→4 (1♩) · T2: 1→3 (3♩), 4→1 (1♩) · T3: 1→4 (2♩), 3→6 (2♩) · T4: 1→5 (3♩), 4→2 (1♩)
- **Phrase:** Fill toms8 ab 3 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie · Periode: Becken, Snare/Clap/Rim, Toms, Melodie, Akkorde, Bass
- **Worauf hören?** „Tiefer, langer Basston und ein neuer Klavierakkord – das ist die Eins. Die Melodie beginnt jeden Takt dort mit einem langen Ton.“
- **Stufen:** 1, 2, 7 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4 · Typ C

#### Kneipenklavier `kneipenklavier`
- **Stil:** Piano-Rock · 4/4 · ♩ 120–132 · 4 Takte · Dur
- **Akkorde:** I – IV – I – V
- **Drums:** Bassdrum 1 3; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 2:5 3:8 4:5
- **Klavier:** triad auf 1 1+ 2 2+ 3 3+ 4 4+ (je 0.4166666666666667♩)
- **Melodie:** T1: 1→1 (1♩), 2→3 (1♩), 3→5 (2♩) · T2: 1→6 (2♩), 3→4 (2♩) · T3: 1→5 (1♩), 2→3 (1♩), 3→1 (2♩) · T4: 1→2 (3♩), 4→7 (1♩)
- **Phrase:** Fill snare8 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie
- **Worauf hören?** „Der Bass spielt auf der Eins seinen tiefsten Ton und läuft dann hoch (Grundton – Quinte – Oktave – Quinte).“
- **Stufen:** 1, 2 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4

#### Garagentor `garagentor`
- **Stil:** Garagen-Indie-Rock (Moll) · 4/4 · ♩ 116–128 · 4 Takte · Moll
- **Akkorde:** i – bVI – bIII – bVII
- **Drums:** Bassdrum 1 3 3+; Snare 2 4; Hi-Hat 1 1e 1+ 1a 2 2e 2+ 2a 3 3e 3+ 3a 4 4e 4+ 4a
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1
- **Klavier:** power auf 1 (je 3.8333333333333335♩)
- **Melodie:** T1: 1→1 (0.5♩), 1+→1 (0.5♩), 2→3 (0.5♩), 2+→1 (0.5♩), 3→4 (1♩), 4→3 (1♩) · T2: 1→6 (2♩), 3→3 (2♩) · T3: 1→3 (1♩), 2→5 (1♩), 3→3 (2♩) · T4: 1→7 (2♩), 3→4 (1♩), 4→2 (1♩)
- **Phrase:** Fill snare16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Die Gitarre schlägt auf der Eins einen neuen Akkord an und lässt ihn klingen; der Bass wechselt dort den Ton.“
- **Stufen:** 1, 2 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4

#### Lagerfeuer `lagerfeuer`
- **Stil:** Indie-Folk (Akustik) · 4/4 · ♩ 92–104 · 4 Takte · Dur
- **Akkorde:** I – IV – vi – V
- **Drums:** Bassdrum 1 3; Rim 2 4
- **Bass:** 1:1 3:5
- **Klavier:** Arpeggio 1:1 1+:5 2:8 2+:10 3:12 3+:10 4:8 4+:5
- **Melodie:** T1: 1→3 (2♩), 3→2 (1♩), 4→1 (1♩) · T2: 1→4 (2♩), 3→6 (2♩) · T3: 1→6 (1♩), 2→5 (1♩), 3→3 (2♩) · T4: 1→2 (3♩), 4→5 (1♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie
- **Worauf hören?** „Die Gitarre zupft auf der Eins den tiefsten Ton des Akkords; Bass und Bassdrum kommen dazu.“
- **Stufen:** 1, 2 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4

#### Leuchtturm `leuchtturm`
- **Stil:** Piano-Hymne · 4/4 · ♩ 76–88 · 4 Takte · Dur
- **Akkorde:** vi – IV – I – V
- **Drums:** Bassdrum 1 3; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1
- **Klavier:** triad auf 1 1+ 2 2+ 3 3+ 4 4+ (je 0.4166666666666667♩)
- **Fläche:** open, hält jeden Akkord
- **Melodie:** T1: 1→3 (2♩), 3→1 (1♩), 4→3 (1♩) · T2: 1→4 (3♩), 4→3 (1♩) · T3: 1→5 (2♩), 3→3 (2♩) · T4: 1→2 (4♩)
- **Phrase:** Fill toms16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie · Periode: Becken, Snare/Clap/Rim, Toms, Melodie, Akkorde, Bass
- **Worauf hören?** „Das Klavier hämmert gleichmäßig – hör auf den Akkordwechsel und den langen Basston: beide kommen nur auf der Eins.“
- **Stufen:** 1, 2, 7 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4 · Typ C

#### Rotlicht `rotlicht`
- **Stil:** Indie-Rock-Riff (Moll) · 4/4 · ♩ 104–116 · 4 Takte · Moll
- **Akkorde:** i – bVI – iv – v
- **Drums:** Bassdrum 1 3 3+; Snare 2 4; Hi-Hat 1 1e 1+ 1a 2 2e 2+ 2a 3 3e 3+ 3a 4 4e 4+ 4a
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1 (stumm in Stufe 4)
- **Klavier:** power auf 1 (je 3.8333333333333335♩)
- **Melodie:** T1: 1→1 (1♩), 2→1 (0.5♩), 2+→3 (1♩), 3+→1 (0.5♩), 4→5 (1♩) · T2: 1→6 (1♩), 2→6 (0.5♩), 2+→8 (1♩), 3+→6 (0.5♩), 4→10 (1♩) · T3: 1→4 (1♩), 2→4 (0.5♩), 2+→6 (1♩), 3+→4 (0.5♩), 4→8 (1♩) · T4: 1→5 (1♩), 2→5 (0.5♩), 2+→7 (1♩), 3+→5 (0.5♩), 4→9 (1♩)
- **Phrase:** Fill snare16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie · ohne Bass: Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Das Riff beginnt auf der Eins immer auf dem Grundton des Akkords und klettert dann nach oben.“
- **Stufen:** 1, 4 · **Muster:** auf die 1, 2 und 4 (Backbeat)

#### Glasdach `glasdach`
- **Stil:** Piano-Indie (Stadionballade) · 4/4 · ♩ 72–84 · 4 Takte · Dur
- **Akkorde:** I – iii – vi – IV
- **Drums:** Bassdrum 1 3; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 (stumm in Stufe 4)
- **Klavier:** triad auf 1 1+ 2 2+ 3 3+ 4 4+ (je 0.4166666666666667♩)
- **Fläche:** open, hält jeden Akkord
- **Melodie:** T1: 1→3 (3♩), 4→2 (1♩) · T2: 1→3 (2♩), 3→5 (2♩) · T3: 1→6 (2♩), 3→5 (1♩), 4→3 (1♩) · T4: 1→4 (4♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie · ohne Bass: Harmonie, Melodie
- **Worauf hören?** „Ohne Bass: Hör auf das Klavier – es spielt gleichmäßige Achtel, aber der Akkord wechselt nur auf der Eins. Die Melodie beginnt dort.“
- **Stufen:** 1, 4 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4

### Stufe 2: Backbeat und Muster

#### Schwarzweißfilm `schwarzweiss` – tückisch: schnell
- **Stil:** Punk-Pop · 4/4 · ♩ 140–156 · 4 Takte · Dur
- **Akkorde:** I – IV – V – IV
- **Drums:** Bassdrum 1 1+ 3; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1
- **Klavier:** power auf 1 3 (je 1.8333333333333333♩)
- **Melodie:** T1: 1→5 (1♩), 2→5 (1♩), 3→6 (1♩), 4→5 (1♩) · T2: 1→4 (2♩), 3→6 (2♩) · T3: 1→2 (2♩), 3→7 (2♩) · T4: 1→1 (3♩)
- **Chor-Chops:** T4: 4→5„hey“ (0.5♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie, Chor
- **Worauf hören?** „Schnell, aber klar: die Bassdrum spielt „1 – und“ (Bumm-bumm), die Snare antwortet auf 2 und 4.“
- **Stufen:** 2, 5 · **Muster:** 2 und 4 (Backbeat), auf die 1, 1 und 4

#### Gummistiefel `gummistiefel`
- **Stil:** Stadion-Pop · 4/4 · ♩ 100–112 · 4 Takte · Dur
- **Akkorde:** I – iii – IV – V
- **Drums:** Bassdrum 1 3 3+; Snare 2 4; Clap 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 2+:1 3:5
- **Klavier:** triad auf 1 3 (je 1.8333333333333333♩)
- **Chor-Chops:** T1: 1→3„oh“ (2♩), 3→1„oh“ (2♩) · T3: 1→4„oh“ (2♩), 3→6„oh“ (2♩)
- **Phrase:** Fill toms8 ab 3 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Chor · Periode: Becken, Snare/Clap/Rim, Toms, Chor, Akkorde, Bass
- **Worauf hören?** „Die Snare und das Klatschen liegen auf 2 und 4 – die Eins ist der tiefe Schlag davor, mit Basston und „Oh“.“
- **Stufen:** 2, 7 · **Muster:** 2 und 4 (Backbeat), 1 und 4, auf die 1 · Typ C

#### Nachtbus `nachtbus`
- **Stil:** Synth-Indie-Rock · 4/4 · ♩ 116–128 · 4 Takte · Dur
- **Akkorde:** I – iii – IV – iv
- **Drums:** Bassdrum 1 3 3+; Snare 2 4; Hi-Hat 1 1e 1+ 1a 2 2e 2+ 2a 3 3e 3+ 3a 4 4e 4+ 4a
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1
- **Fläche:** open, hält jeden Akkord
- **Melodie:** T1: 1→5 (1.5♩), 2+→5 (0.5♩), 3→3 (2♩) · T2: 1→5 (1.5♩), 2+→7 (0.5♩), 3→5 (2♩) · T3: 1→6 (2♩), 3→4 (2♩) · T4: 1→4 (2♩), 3→1 (2♩)
- **Phrase:** Fill snare16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie · Periode: Becken, Snare/Clap/Rim, Melodie, Bass
- **Worauf hören?** „Die Synth-Fläche wechselt auf der Eins die Farbe (zuletzt nach Moll), der Bass springt mit.“
- **Stufen:** 2, 7 · **Muster:** 2 und 4 (Backbeat), 1 und 4, auf die 1 · Typ C

#### Hafenkneipe `hafenkneipe`
- **Stil:** Piano-Ballade (Deutschrock) · 4/4 · ♩ 84–96 · 8 Takte (Periode 4) · Dur
- **Akkorde:** I – V – vi – iii – IV – I – IV – V
- **Drums:** Bassdrum 1 3+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1
- **Klavier:** triad auf 1 2 3 4 (je 0.8333333333333334♩)
- **Melodie:** T1: 1→3 (2♩), 3→2 (1♩), 4→1 (1♩) · T2: 1→2 (3♩), 4→7 (1♩) · T3: 1→1 (2♩), 3→6 (2♩) · T4: 1→5 (3♩), 4→5 (1♩) · T5: 1→6 (2♩), 3→4 (2♩) · T6: 1→5 (2♩), 3→3 (2♩) · T7: 1→4 (2♩), 3→6 (2♩) · T8: 1→5 (4♩)
- **Phrase:** Fill toms8 ab 3 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie · Periode: Becken, Snare/Clap/Rim, Toms, Melodie, Akkorde, Bass
- **Worauf hören?** „Jeder Takt ein neuer Akkord, der Bass hält ihn ab der Eins. Nach dem Tom-Wirbel beginnt eine neue Zeile.“
- **Stufen:** 2, 7 · **Muster:** 2 und 4 (Backbeat), 1 und 4, auf die 1 · Typ C

#### Tanzverbot `tanzverbot`
- **Stil:** Pop-Punk (Moll) · 4/4 · ♩ 132–144 · 4 Takte · Moll
- **Akkorde:** i – bVII – bVI – bVII
- **Drums:** Bassdrum 1 2+ 3; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1
- **Stabs:** power auf 1 4 (je 0.3333333333333333♩)
- **Melodie:** T1: 1→1 (2♩), 3→3 (1♩), 4→4 (1♩) · T2: 1→2 (3♩), 4→1 (1♩) · T3: 1→1 (2♩), 3→6 (2♩) · T4: 1→7 (2♩), 3→4 (2♩)
- **Phrase:** Fill snare16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Die Gitarren-Hits kommen auf 1 und 4 – der erste davon mit neuem Akkord und tiefem Bass ist die Eins.“
- **Stufen:** 2, 5 · **Muster:** 1 und 4, 2 und 4 (Backbeat), auf die 1

#### Sommerregen `sommerregen`
- **Stil:** Deutsch-Indie-Pop (Klavier & Stimme) · 4/4 · ♩ 88–100 · 4 Takte · Dur
- **Akkorde:** I – vi – ii – V
- **Drums:** Bassdrum 1 3; Snare 2 4; Hi-Hat 1 2 3 4
- **Bass:** 1:1 3:5 (stumm in Stufe 4)
- **Klavier:** triad auf 1 2 3 4 (je 0.8333333333333334♩)
- **Melodie:** T1: 1→5 (1♩), 2→3 (1♩), 3→3 (2♩) · T2: 1→1 (2♩), 3→3 (2♩) · T3: 1→2 (2♩), 3→4 (2♩) · T4: 1→2 (2♩), 3→7 (2♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie · ohne Bass: Harmonie, Melodie
- **Worauf hören?** „Die Melodie fängt jeden Takt neu auf der Eins an; das Klavier wechselt dort den Akkord.“
- **Stufen:** 2, 4 · **Muster:** 2 und 4 (Backbeat), auf die 1, 1 und 4

#### Kopfsteinpflaster `kopfstein`
- **Stil:** Piano-Rock (Deutschrock) · 4/4 · ♩ 112–124 · 4 Takte · Dur
- **Akkorde:** vi – IV – I – V
- **Drums:** Bassdrum 1 3; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 2:5 3:8 4:5 (stumm in Stufe 4)
- **Klavier:** triad auf 1 2 3 4 (je 0.8333333333333334♩)
- **Melodie:** T1: 1→6 (1♩), 2→6 (1♩), 3→5 (1♩), 4→3 (1♩) · T2: 1→4 (2♩), 3→6 (2♩) · T3: 1→5 (1♩), 2→5 (1♩), 3→3 (2♩) · T4: 1→2 (2♩), 3→5 (2♩)
- **Phrase:** Fill snare8 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie · ohne Bass: Harmonie, Melodie
- **Worauf hören?** „Das Klavier spielt Viertel, die Melodie startet jeden Takt auf der Eins mit einer neuen Zeile.“
- **Stufen:** 2, 4 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4

### Stufe 3: Dreier: Walzer und 6/8

#### Leiser Walzer `leiserwalzer`
- **Stil:** Indie-Walzer · 3/4 · ♩ 120–138 · 4 Takte · Dur
- **Akkorde:** I – IV – V – I
- **Drums:** Bassdrum 1; Rim 2 3; Hi-Hat 1 1+ 2 2+ 3 3+
- **Bass:** 1:1
- **Klavier:** triad auf 2 3 (je 0.8333333333333334♩)
- **Melodie:** T1: 1→3 (2♩), 3→4 (1♩) · T2: 1→6 (3♩) · T3: 1→5 (2♩), 3→2 (1♩) · T4: 1→1 (3♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Melodie
- **Worauf hören?** „Um-pa-pa: Bass und Bassdrum nur auf der Eins, das Klavier tupft 2 und 3.“
- **Stufen:** 3 · **Muster:** auf die 1, 2 und 3 (um-pa-pa)

#### Kerzenschein `kerzenschein`
- **Stil:** 6/8-Power-Ballade · 6/8 · ♩. 52–60 · 4 Takte · Dur
- **Akkorde:** I – vi – IV – V
- **Drums:** Bassdrum 1; Snare 4; Hi-Hat 1 2 3 4 5 6
- **Bass:** 1:1 4:5
- **Klavier:** Arpeggio 1:1 2:5 3:8 4:10 5:8 6:5
- **Melodie:** T1: 1→3 (3♪), 4→5 (3♪) · T2: 1→1 (6♪) · T3: 1→4 (3♪), 4→6 (3♪) · T4: 1→5 (4♪), 5→2 (2♪)
- **Phrase:** Fill toms8 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Melodie · Periode: Becken, Snare/Clap/Rim, Toms, Melodie, Akkorde, Bass
- **Worauf hören?** „Zähl in Sechsen: Bassdrum und tiefster Gitarrenton auf 1, Snare auf 4.“
- **Stufen:** 3, 7 · **Muster:** auf die 1, auf die 4 · Typ C

#### Seemannsgarn `seemannsgarn`
- **Stil:** Folk-Walzer (Banjo, Stampfen) · 3/4 · ♩ 144–160 · 8 Takte (Periode 4) · Dur
- **Akkorde:** I – I – IV – I – V – V – I – I
- **Drums:** Bassdrum 1; Clap 2 3
- **Bass:** 1:1
- **Klavier:** Arpeggio 1:1 1+:5 2:8 2+:5 3:10 3+:5
- **Melodie:** T1: 1→1 (1♩), 2→3 (1♩), 3→5 (1♩) · T2: 1→5 (2♩), 3→3 (1♩) · T3: 1→4 (1♩), 2→6 (1♩), 3→8 (1♩) · T4: 1→5 (3♩) · T5: 1→2 (1♩), 2→4 (1♩), 3→7 (1♩) · T6: 1→5 (2♩), 3→7 (1♩) · T7: 1→8 (2♩), 3→5 (1♩) · T8: 1→8 (3♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Melodie · Periode: Becken, Melodie, Akkorde, Bass
- **Worauf hören?** „Stampfen und Bass auf der Eins, zweimal Klatschen danach; das Banjo beginnt jeden Takt unten.“
- **Stufen:** 3, 7 · **Muster:** auf die 1, 2 und 3 (um-pa-pa) · Typ C

#### Dachboden `dachboden`
- **Stil:** 6/8-Indie-Folk mit Toms (Moll) · 6/8 · ♩. 60–68 · 4 Takte · Moll
- **Akkorde:** i – bVI – bIII – bVII
- **Drums:** Bassdrum 1; Snare 4; Toms 1:lo 2:lo 3:mid 5:mid 6:lo
- **Bass:** 1:1
- **Fläche:** open, hält jeden Akkord
- **Melodie:** T1: 1→5 (3♪), 4→3 (3♪) · T2: 1→3 (6♪) · T3: 1→5 (3♪), 4→7 (3♪) · T4: 1→4 (6♪)
- **Chor-Chops:** T1: 1→8„ah“ (2♪) · T3: 1→5„ah“ (2♪)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Toms, Melodie, Chor · Periode: Becken, Melodie, Chor, Bass
- **Worauf hören?** „Die Trommeln rollen, aber der tiefe Bass und die Fläche wechseln nur auf der Eins.“
- **Stufen:** 3, 7 · **Muster:** auf die 1, auf die 4 · Typ C

#### Zuckerwatte `zuckerwatte`
- **Stil:** Indie-Ballade im Dreier · 3/4 · ♩ 84–96 · 4 Takte · Dur
- **Akkorde:** I – iii – IV – V
- **Drums:** Bassdrum 1; Rim 3; Hi-Hat 1 2 3
- **Bass:** 1:1 3:5 (stumm in Stufe 4)
- **Klavier:** triad auf 1 2 3 (je 0.8333333333333334♩)
- **Melodie:** T1: 1→5 (2♩), 3→3 (1♩) · T2: 1→5 (3♩) · T3: 1→6 (2♩), 3→4 (1♩) · T4: 1→2 (3♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Melodie · ohne Bass: Harmonie, Bassdrum, Snare/Clap/Rim, Melodie
- **Worauf hören?** „Der Akkord wechselt auf der Eins, die Melodie hält dort ihren längsten Ton.“
- **Stufen:** 3, 4 · **Muster:** auf die 1, 2 und 3 (um-pa-pa)

#### Abschlussball `abschlussball`
- **Stil:** 6/8-Doo-Wop-Ballade · 6/8 · ♩. 54–62 · 4 Takte · Dur
- **Akkorde:** I – vi – IV – V
- **Drums:** Bassdrum 1; Snare 4; Hi-Hat 1 2 3 4 5 6
- **Bass:** 1:1 4:5
- **Klavier:** triad auf 1 2 3 4 5 6 (je 0.8333333333333334♪)
- **Melodie:** T1: 1→5 (3♪), 4→6 (1♪), 5→5 (2♪) · T2: 1→3 (6♪) · T3: 1→6 (3♪), 4→4 (3♪) · T4: 1→2 (4♪), 5→7 (2♪)
- **Chor-Chops:** T1: 1→3„uh“ (5.666666666666667♪) · T2: 1→3„uh“ (5.666666666666667♪) · T3: 1→4„uh“ (5.666666666666667♪) · T4: 1→2„uh“ (5.666666666666667♪)
- **Phrase:** Fill snare8 ab 5 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Melodie, Chor · Periode: Becken, Snare/Clap/Rim, Melodie, Chor, Akkorde, Bass
- **Worauf hören?** „Der Hintergrundchor („Uuh“) setzt auf jeder Eins neu ein, der Bass geht Grundton – Quinte.“
- **Stufen:** 3, 7 · **Muster:** auf die 1, auf die 4 · Typ C

### Stufe 4: Ohne Bass: Akkorde und Melodie

#### Papierflieger `papierflieger`
- **Stil:** Akustik-Indie (Picking) · 4/4 · ♩ 96–108 · 4 Takte · Dur
- **Akkorde:** I – IV – ii – V
- **Drums:** Bassdrum 1 3; Rim 2 4
- **Bass:** 1:1 3:5 (stumm in Stufe 4)
- **Klavier:** Arpeggio 1:1 1+:5 2:10 2+:5 3:8 3+:5 4:10 4+:5
- **Melodie:** T1: 1→5 (1♩), 2→3 (1♩), 3→1 (2♩) · T2: 1→4 (1♩), 2→6 (1♩), 3→4 (2♩) · T3: 1→2 (2♩), 3→4 (1♩), 4→6 (1♩) · T4: 1→5 (3♩), 4→7 (1♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie · ohne Bass: Harmonie, Melodie
- **Worauf hören?** „Die Gitarre zupft auf der Eins den tiefsten Ton (Grundton), auf der 3 nur die Oktave darüber.“
- **Stufen:** 4 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4

#### Morgengrauen `morgengrauen`
- **Stil:** Ambient-Indie · 4/4 · ♩ 84–96 · 4 Takte · Dur
- **Akkorde:** IV – I – V – vi
- **Drums:** Bassdrum 1 3; Snare 2 4; Hi-Hat 1 1e 1+ 1a 2 2e 2+ 2a 3 3e 3+ 3a 4 4e 4+ 4a
- **Bass:** 1:1 (stumm in Stufe 4)
- **Klavier:** Arpeggio 1:1 2:5 3:8 4:10
- **Fläche:** open, hält jeden Akkord
- **Melodie:** T1: 1→6 (3♩), 4→5 (1♩) · T2: 1→5 (2♩), 3→3 (2♩) · T3: 1→2 (2♩), 3→7 (2♩) · T4: 1→1 (4♩)
- **Phrase:** Fill toms16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie · ohne Bass: Harmonie, Melodie · Periode: Becken, Snare/Clap/Rim, Toms, Melodie, Akkorde, Bass
- **Worauf hören?** „Das Klavier steigt jeden Takt von unten nach oben – der tiefste Ton ist die Eins. Die Fläche wechselt dort.“
- **Stufen:** 4, 7 · **Muster:** auf die 1, 2 und 4 (Backbeat) · Typ C

#### Altbau `altbau`
- **Stil:** Deutsch-Indie (Klavier, raue Stimme) · 4/4 · ♩ 80–92 · 4 Takte · Dur
- **Akkorde:** I – V – ii – IV
- **Drums:** Bassdrum 1 3; Snare 2 4; Hi-Hat 1 2 3 4
- **Bass:** 1:1 3:5 (stumm in Stufe 4)
- **Klavier:** triad auf 1 3 3+ (je 0.5♩)
- **Melodie:** T1: 1→3 (2♩), 3→5 (2♩) · T2: 1→5 (2♩), 3→2 (2♩) · T3: 1→4 (2♩), 3→2 (2♩) · T4: 1→6 (2♩), 3→4 (2♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie · ohne Bass: Harmonie, Melodie
- **Worauf hören?** „Das Klavier spielt „1 – 3 und“: der einzelne Anschlag ist die Eins, das Doppel ist die 3.“
- **Stufen:** 4 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 4

### Stufe 5: Falsche Fährten

#### Discokugel `discokugel` – tückisch: Bassdrum auf jedem Schlag
- **Stil:** Disco-Indie (Four-on-the-floor) · 4/4 · ♩ 116–126 · 4 Takte · Dur
- **Akkorde:** vi – IV – I – V
- **Drums:** Bassdrum 1 2 3 4; Snare 2 4; Clap 2 4; offene HH 1+ 2+ 3+ 4+
- **Bass:** 1:1 1+:8 2:1 2+:8 3:1 3+:8 4:1 4+:8
- **Stabs:** triad auf 1+ 2+ 3+ 4+ (je 0.25♩)
- **Melodie:** T1: 1→6 (2♩), 3→5 (1♩), 4→3 (1♩) · T2: 1→4 (3♩), 4→6 (1♩) · T3: 1→5 (2♩), 3→3 (2♩) · T4: 1→2 (3♩), 4→7 (1♩)
- **Phrase:** Fill snare16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie · Periode: Becken, Snare/Clap/Rim, Melodie, Bass
- **Worauf hören?** „Die Bassdrum spielt jeden Schlag – sie hilft nicht. Hör auf den Bass: er springt in Oktaven und wechselt auf der Eins den Ton.“
- **Stufen:** 5, 7 · **Muster:** auf die 1, 1 und 4, 2 und 4 (Backbeat) · Typ C

#### Holzfällerhemd `holzfaeller` – tückisch: Stampfen auf jedem Schlag
- **Stil:** Indie-Folk-Stomp · 4/4 · ♩ 120–132 · 4 Takte · Dur
- **Akkorde:** I – IV – I – V
- **Drums:** Bassdrum 1 2 3 4; Clap 2 4
- **Bass:** 1:1 2:1 3:1 4:1
- **Klavier:** Arpeggio 1:8 1+:5 2:10 2+:5 3:8 3+:5 4:10 4+:5
- **Melodie:** T1: 1→3 (2♩), 3→5 (2♩) · T2: 1→6 (2♩), 3→4 (1♩) · T3: 1→5 (1♩), 2→3 (1♩), 3→1 (2♩) · T4: 1→2 (3♩)
- **Chor-Chops:** T2: 4→5„hey“ (0.5♩) · T4: 4→5„hey“ (0.5♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie, Chor · Periode: Becken, Melodie, Akkorde, Bass
- **Worauf hören?** „Stampfen auf jedem Schlag. Das „Hey!“ kommt auf der 4 – die Eins ist gleich danach, mit neuem Akkord.“
- **Stufen:** 5, 7 · **Muster:** auf die 1, 1 und 4, 2 und 4 (Backbeat) · Typ C

#### Vorstadtfunk `vorstadtfunk` – tückisch: Bass vorgezogen
- **Stil:** Indie-Funk, vorgezogen · 4/4 · ♩ 96–108 · 4 Takte · Dur
- **Akkorde:** I – IV – vi – V · **vorgezogen** um 6 Ticks (Achtel)
- **Drums:** Bassdrum 2+ 4+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 4+ (Vortakt):1 3+:5
- **Klavier:** triad auf 2+ 4+ (je 0.5♩)
- **Melodie:** T1: 1→3 (3♩) · T2: 1→6 (3♩) · T3: 1→8 (3♩) · T4: 1→7 (2♩), 3→5 (1♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie
- **Worauf hören?** „Bass und Akkorde kommen eine Achtel zu früh (auf 4+). Die Eins verrät die Melodie: Sie setzt genau dort mit einem langen Ton ein.“
- **Stufen:** 5, 6 · **Muster:** auf die 1, 1 und 4+ (vorgezogen), 2 und 4 (Backbeat)

#### Auftakt-Hymne `auftakthymne` – tückisch: Melodie mit Auftakt
- **Stil:** Pop-Rock mit Auftakt-Melodie · 4/4 · ♩ 84–96 · 4 Takte · Dur
- **Akkorde:** I – IV – V – I
- **Drums:** Bassdrum 1 3 3+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 3:5
- **Klavier:** triad auf 1 3 (je 1.8333333333333333♩)
- **Melodie:** T1: 1→8 (3♩) · T2: 1→6 (2♩), 3→3 (0.5♩), 3+→4 (0.5♩), 4→5 (1♩) · T3: 1→7 (3♩) · T4: 1→1 (2♩), 3→5 (0.5♩), 3+→6 (0.5♩), 4→7 (1♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Die Melodie holt mit drei Tönen Anlauf (3 – und – 4). Die Eins ist der lange Ton danach, mit neuem Akkord und Bass.“
- **Stufen:** 5 · **Muster:** auf die 1, 1 und 4

#### Neonlicht `neonlicht` – tückisch: Bassdrum auf jedem Schlag
- **Stil:** Synth-Indie, Four-on-the-floor (Moll) · 4/4 · ♩ 128–136 · 4 Takte · Moll
- **Akkorde:** i – bVII – bVI – bVII
- **Drums:** Bassdrum 1 2 3 4; Clap 2 4; offene HH 1+ 2+ 3+ 4+
- **Bass:** 1:1 1+:8 2:1 2+:8 3:1 3+:8 4:1 4+:8
- **Fläche:** open, hält jeden Akkord
- **Melodie:** T1: 1→1 (0.5♩), 1+→3 (0.5♩), 2→5 (0.5♩), 2+→8 (0.5♩), 3→5 (0.5♩), 3+→3 (0.5♩), 4→1 (1♩) · T2: 1→7 (0.5♩), 1+→9 (0.5♩), 2→11 (0.5♩), 2+→14 (0.5♩), 3→11 (0.5♩), 3+→9 (0.5♩), 4→7 (1♩) · T3: 1→6 (0.5♩), 1+→8 (0.5♩), 2→10 (0.5♩), 2+→13 (0.5♩), 3→10 (0.5♩), 3+→8 (0.5♩), 4→6 (1♩) · T4: 1→7 (0.5♩), 1+→9 (0.5♩), 2→11 (0.5♩), 2+→14 (0.5♩), 3→11 (0.5♩), 3+→9 (0.5♩), 4→7 (1♩)
- **Phrase:** Fill snare16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie
- **Worauf hören?** „Bassdrum auf jedem Schlag. Das Synth-Arpeggio startet auf der Eins unten, klettert hoch und kommt wieder herunter.“
- **Stufen:** 5, 6 · **Muster:** auf die 1, 1 und 4, 2 und 4 (Backbeat)

#### Bahnsteig `bahnsteig` – tückisch: Riff mit Anlauf
- **Stil:** Indie-Rock, Riff mit Anlauf · 4/4 · ♩ 120–132 · 4 Takte · Dur
- **Akkorde:** I – V – IV – I
- **Drums:** Bassdrum 1 3 3+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1
- **Klavier:** power auf 1 3 (je 1.8333333333333333♩)
- **Melodie:** T1: 1→8 (1♩), 2+→8 (0.5♩), 3→10 (1♩), 4+→4 (0.5♩) · T2: 1→5 (1♩), 2+→5 (0.5♩), 3→7 (1♩), 4+→3 (0.5♩) · T3: 1→4 (1♩), 2+→4 (0.5♩), 3→6 (1♩), 4+→7 (0.5♩) · T4: 4+→7 (0.5♩), 1→8 (1♩), 2+→8 (0.5♩), 3→10 (1♩)
- **Phrase:** Fill snare8 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Das Gitarrenriff beginnt eine Achtel vor der Eins. Die Eins ist der Ton, auf dem es landet – zusammen mit Bassdrum und neuem Basston.“
- **Stufen:** 5 · **Muster:** auf die 1, 1 und 4+ (vorgezogen), 2 und 4 (Backbeat)

### Stufe 6: Halftime, Shuffle, 12/8

#### Brücke `bruecke` – tückisch: Halftime
- **Stil:** Halftime-Bridge (Stadion) · 4/4 · ♩ 128–140 · 4 Takte · Dur
- **Akkorde:** vi – IV – I – V
- **Drums:** Bassdrum 1 3+; Snare 3; Hi-Hat 1 2 3 4
- **Bass:** 1:1
- **Fläche:** open, hält jeden Akkord
- **Chor-Chops:** T1: 1→6„whoa“ (2♩), 3→3„oh“ (2♩) · T3: 1→5„whoa“ (2♩), 3→3„oh“ (2♩)
- **Phrase:** Fill toms8 ab 3 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Chor · Periode: Becken, Snare/Clap/Rim, Toms, Chor, Bass
- **Worauf hören?** „Die Snare kommt nur einmal im Takt, auf der 3. Die Eins ist zwei Schläge davor: tiefer Bass, neue Fläche, „Whoa“.“
- **Stufen:** 6, 7 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 2+ (Charleston) · Typ C

#### Rückspiegel `rueckspiegel`
- **Stil:** Rockabilly-Shuffle (Deutschrock) · 4/4 · ♩ 120–136 · 8 Takte (Periode 4) · Dur
- **Akkorde:** I – I – IV – I – V – IV – I – V
- **Drums:** Bassdrum 1 3; Snare 2 4; Hi-Hat 1 1+ (sw) 2 2+ (sw) 3 3+ (sw) 4 4+ (sw) (Shuffle)
- **Bass:** 1:1 2:3 3:5 4:6
- **Stabs:** triad auf 2+ (sw) 4+ (sw) (je 0.25♩)
- **Melodie:** T1: 1→3 (2♩), 3→5 (2♩) · T3: 1→6 (2♩), 3→4 (2♩) · T5: 1→5 (2♩), 3→2 (2♩) · T7: 1→3 (2♩), 3→1 (2♩)
- **Phrase:** Fill snare8 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie
- **Worauf hören?** „Der Bass läuft in Vierteln Stufe für Stufe hoch – er beginnt auf der Eins immer mit dem Grundton.“
- **Stufen:** 6 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 2+ (Charleston)

#### Wolkenkratzer `wolkenkratzer`
- **Stil:** 12/8-Power-Ballade (bluesig) · 12/8 · ♩. 56–64 · 4 Takte · Dur
- **Akkorde:** I – IV – I – V
- **Drums:** Bassdrum 1 8; Snare 4 10; Hi-Hat 1 2 3 4 5 6 7 8 9 10 11 12
- **Bass:** 1:1 7:5
- **Klavier:** triad auf 1 2 3 4 5 6 7 8 9 10 11 12 (je 0.8333333333333334♪)
- **Melodie:** T1: 1→3 (6♪), 7→5 (6♪) · T2: 1→6 (6♪), 7→4 (6♪) · T3: 1→5 (6♪), 7→3 (6♪) · T4: 1→2 (9♪), 10→7 (3♪)
- **Phrase:** Fill toms8 ab 10 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Vier große Schläge zu je drei Achteln. Die Snare liegt auf 2 und 4 – die Eins ist der tiefe Schlag davor, mit neuem Akkord.“
- **Stufen:** 6 · **Muster:** auf die 1, 2 und 4 (große Schläge)

#### Gegenwind `gegenwind` – tückisch: Halftime
- **Stil:** Halftime-Stadion mit Toms (Moll) · 4/4 · ♩ 120–132 · 4 Takte · Moll
- **Akkorde:** i – bVI – bIII – bVII
- **Drums:** Bassdrum 1 3+; Snare 3; Toms 1:lo 1+:lo 2+:mid 4:lo 4+:mid
- **Bass:** 1:1
- **Fläche:** open, hält jeden Akkord
- **Melodie:** T1: 1→1 (2♩), 3→3 (2♩) · T2: 1→1 (4♩) · T3: 1→5 (2♩), 3→3 (2♩) · T4: 1→4 (2♩), 3→2 (2♩)
- **Chor-Chops:** T4: 4→5„hey“ (0.5♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Toms, Melodie, Chor · Periode: Becken, Melodie, Chor, Bass
- **Worauf hören?** „Die Trommeln donnern, die Snare kommt nur auf der 3. Die Eins: tiefer Basston, Doppelschlag der Standtom.“
- **Stufen:** 6, 7 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 2+ (Charleston) · Typ C

#### Katerstimmung `katerstimmung`
- **Stil:** Shuffle-Indie (Moll) · 4/4 · ♩ 96–108 · 4 Takte · Moll
- **Akkorde:** i – bVII – bVI – V7
- **Drums:** Bassdrum 1 3 3+ (sw); Snare 2 4; Hi-Hat 1 1+ (sw) 2 2+ (sw) 3 3+ (sw) 4 4+ (sw) (Shuffle)
- **Bass:** 1:1 2:5 3:8 4:5
- **Klavier:** triad auf 2+ (sw) 4+ (sw) (je 0.25♩)
- **Melodie:** T1: 1→5 (2♩), 3→3 (2♩) · T2: 1→4 (2♩), 3→2 (2♩) · T3: 1→3 (2♩), 3→1 (2♩) · T4: 1→2 (3♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Die Achtel hinken (lang–kurz). Der Bass springt auf der Eins nach unten auf den Grundton, die Bassdrum stolpert nur in die 3 hinein.“
- **Stufen:** 6 · **Muster:** auf die 1, 2 und 4 (Backbeat), 1 und 2+ (Charleston)

#### Doppelte Zeit `doppeltezeit` – tückisch: Doppelzeit-Gefühl
- **Stil:** Polka-Punk (Humppa) · 4/4 · ♩ 100–112 · 4 Takte · Dur
- **Akkorde:** I – V – IV – I
- **Drums:** Bassdrum 1 2 3 4; Snare 1+ 2+ 3+ 4+
- **Bass:** 1:1 2:5 3:1 4:5
- **Klavier:** triad auf 1+ 2+ 3+ 4+ (je 0.3333333333333333♩)
- **Melodie:** T1: 1→1 (1♩), 2→3 (1♩), 3→5 (2♩) · T2: 1→7 (2♩), 3→5 (2♩) · T3: 1→6 (2♩), 3→4 (2♩) · T4: 1→3 (2♩), 3→1 (2♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie
- **Worauf hören?** „Snare auf jedem „und“ – das fühlt sich doppelt so schnell an. Zähl langsam: die Eins ist dort, wo die Melodie neu anfängt und der Akkord wechselt.“
- **Stufen:** 6, 8 · **Muster:** auf die 1, 1 und 4, 1 und 2+ (Charleston)

### Stufe 7: Die Phrase finden: dein Einsatz

#### Whoa-oh `whoaoh`
- **Stil:** Stadion-Hymne · 4/4 · ♩ 104–116 · 8 Takte (Periode 4) · Dur
- **Akkorde:** I – V – vi – IV – I – V – vi – IV
- **Drums:** Bassdrum 1 3 3+; Snare 2 4; Clap 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1
- **Fläche:** open, hält jeden Akkord
- **Chor-Chops:** T1: 1→5„whoa“ (1.5♩), 2+→5„o“ (0.5♩), 3→6„oh“ (1♩), 4→5„oh“ (1♩) · T3: 1→3„whoa“ (2♩), 3→1„oh“ (2♩) · T5: 1→5„whoa“ (1.5♩), 2+→5„o“ (0.5♩), 3→6„oh“ (1♩), 4→5„oh“ (1♩) · T7: 1→3„whoa“ (2♩), 3→1„oh“ (2♩)
- **Phrase:** Fill toms8 ab 3 im letzten Takt; Becken auf Takt 1 der Periode; Einsatz-Motiv (Typ C): 1 (1♩), 2 (1♩), 3 (2♩)
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Chor · Periode: Becken, Snare/Clap/Rim, Toms, Chor, Bass
- **Worauf hören?** „Nach dem Tom-Wirbel kommt ein Becken – dort beginnt die neue Zeile, das „Whoa-oh“ geht wieder los.“
- **Stufen:** 7, 2 · **Muster:** 2 und 4 (Backbeat), auf die 1 · Typ C

#### Feuerwerk `feuerwerk`
- **Stil:** Pop-Rock-Aufbau · 4/4 · ♩ 112–124 · 4 Takte · Dur
- **Akkorde:** I – iii – IV – V
- **Drums:** Bassdrum 1 2 3 4
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1
- **Klavier:** power auf 1 3 (je 1.8333333333333333♩)
- **Melodie:** T1: 1→5 (4♩) · T2: 1→7 (4♩) · T3: 1→6 (4♩) · T4: 1→5 (2♩), 3→2 (2♩)
- **Phrase:** Fill snare16 ab 3 im letzten Takt; Becken auf Takt 1 der Periode; Einsatz-Motiv (Typ C): 1 (2♩), 3 (2♩)
- **Eins hörbar an:** Bass, Harmonie, Melodie · Periode: Becken, Snare/Clap/Rim, Melodie, Akkorde, Bass
- **Worauf hören?** „Drei Takte nur Bassdrum, dann ein Snare-Wirbel – die neue Zeile beginnt mit dem Becken danach.“
- **Stufen:** 7 · **Muster:** auf die 1 · Typ C

#### Klavierintro `klavierintro`
- **Stil:** Piano-Rock-Intro · 4/4 · ♩ 96–108 · 4 Takte · Dur
- **Akkorde:** I – vi – IV – V
- **Drums:** Bassdrum 1 3; Snare 2 4; Hi-Hat 1 2 3 4
- **Bass:** 1:1 2:5 3:8 4:5
- **Klavier:** triad auf 1 1+ 2 2+ 3 3+ 4 4+ (je 0.4166666666666667♩)
- **Melodie:** T1: 1→8 (2♩) · T4: 3→5 (0.5♩), 3+→6 (0.5♩), 4→7 (1♩)
- **Phrase:** Fill stop ab 4 im letzten Takt; Becken auf Takt 1 der Periode; Einsatz-Motiv (Typ C): 1 (1♩), 2 (1♩), 3 (2♩)
- **Eins hörbar an:** Bass, Harmonie, Melodie · Periode: Becken, Snare/Clap/Rim, Melodie, Akkorde, Bass
- **Worauf hören?** „Auf der 4 des letzten Takts hört die Band auf, nur das Klavier läuft hoch – die nächste Eins ist dein Einsatz.“
- **Stufen:** 7 · **Muster:** auf die 1, 2 und 4 (Backbeat) · Typ C

#### Mitsingrefrain `mitsingrefrain` – tückisch: Stampfen auf jedem Schlag
- **Stil:** Indie-Folk-Stomp · 4/4 · ♩ 116–128 · 8 Takte (Periode 4) · Dur
- **Akkorde:** I – IV – vi – V – I – IV – V – I
- **Drums:** Bassdrum 1 2 3 4; Clap 2 4
- **Bass:** 1:1 2:1 3:1 4:1
- **Klavier:** Arpeggio 1:8 1+:5 2:10 2+:5 3:8 3+:5 4:10 4+:5
- **Melodie:** T1: 1→3 (2♩), 3→5 (2♩) · T2: 1→6 (2♩), 3→4 (2♩) · T3: 1→3 (2♩), 3→1 (2♩) · T4: 1→2 (3♩) · T5: 1→3 (2♩), 3→5 (2♩) · T6: 1→6 (2♩), 3→8 (2♩) · T7: 1→7 (2♩), 3→5 (2♩) · T8: 1→8 (3♩)
- **Chor-Chops:** T4: 4→5„hey“ (0.5♩) · T8: 4→5„hey“ (0.5♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode; Einsatz-Motiv (Typ C): 1 (1♩), 2 (1♩), 3 (2♩)
- **Eins hörbar an:** Bass, Harmonie, Melodie, Chor · Periode: Becken, Melodie, Chor, Akkorde, Bass
- **Worauf hören?** „Jede Zeile endet mit „Hey!“ auf der 4 – danach beginnt die nächste Zeile, mit Becken.“
- **Stufen:** 7, 5 · **Muster:** auf die 1, 1 und 4 · Typ C

#### Festivalwiese `festivalwiese`
- **Stil:** Stadion-Indie mit „Oh-oh“ · 4/4 · ♩ 120–132 · 4 Takte · Dur
- **Akkorde:** IV – I – V – vi
- **Drums:** Bassdrum 1 3 3+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1
- **Fläche:** open, hält jeden Akkord
- **Chor-Chops:** T1: 1→6„oh“ (1♩), 2→8„oh“ (1♩), 3→6„oh“ (2♩) · T3: 1→7„oh“ (1♩), 2→5„oh“ (1♩), 3→2„oh“ (2♩)
- **Phrase:** Fill toms16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode; Einsatz-Motiv (Typ C): 1 (1♩), 2 (1♩), 3 (2♩)
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Chor · Periode: Becken, Snare/Clap/Rim, Toms, Chor, Bass
- **Worauf hören?** „Der Chor singt „Oh-oh-oh“ am Anfang jeder Zeile; davor rollen die Toms.“
- **Stufen:** 7 · **Muster:** auf die 1, 2 und 4 (Backbeat) · Typ C

#### Anlauf `anlauf`
- **Stil:** 6/8-Ballade · 6/8 · ♩. 56–64 · 4 Takte · Dur
- **Akkorde:** I – iii – IV – V
- **Drums:** Bassdrum 1; Snare 4; Hi-Hat 1 2 3 4 5 6
- **Bass:** 1:1
- **Klavier:** Arpeggio 1:1 2:5 3:8 4:10 5:8 6:5
- **Melodie:** T1: 1→5 (6♪) · T2: 1→5 (3♪), 4→3 (3♪) · T3: 1→4 (3♪), 4→6 (3♪) · T4: 1→5 (6♪)
- **Phrase:** Fill toms8 ab 4 im letzten Takt; Becken auf Takt 1 der Periode; Einsatz-Motiv (Typ C): 1 (3♪), 4 (3♪)
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Melodie · Periode: Becken, Snare/Clap/Rim, Toms, Melodie, Akkorde, Bass
- **Worauf hören?** „Am Ende jeder Zeile rollen die Toms über 4–5–6; dein Einsatz kommt mit dem Becken danach.“
- **Stufen:** 7, 3 · **Muster:** auf die 1, auf die 4 · Typ C

### Stufe 8: Glam und Taktgefühl

#### Operettenhaus `operettenhaus` – tückisch: 3+3+2-Klavier
- **Stil:** Glam-Rock-Klavierballade · 4/4 · ♩ 76–88 · 4 Takte · Dur
- **Akkorde:** I – iii – IV – iv
- **Drums:** Bassdrum 1 3+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 2+:1 4:5
- **Klavier:** triad auf 1 2+ 4 (je 1.1666666666666667♩)
- **Melodie:** T1: 1→5 (3♩), 4→6 (1♩) · T2: 1→5 (2♩), 3→7 (2♩) · T3: 1→6 (3♩), 4→4 (1♩) · T4: 1→4 (2♩), 3→8 (2♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Das Klavier spielt 3+3+2 (1 – 2+ – 4). Die Eins ist der erste Anschlag der Gruppe, mit tiefem Bass; am Ende wird es Moll.“
- **Stufen:** 8 · **Muster:** 1 · 2+ · 4 (3-3-2), auf die 1, 1 und 2+ (Charleston)

#### Maskenball `maskenball` – tückisch: 6/8 gegen 3/4
- **Stil:** Glam-Walzer: 6/8 gegen 3/4 · 6/8 · ♩. 56–64 · 4 Takte · Dur
- **Akkorde:** I – V – vi – IV
- **Drums:** Bassdrum 1; Snare 4; Hi-Hat 1 2 3 4 5 6
- **Bass:** 1:1
- **Klavier:** triad auf 1 3 5 (je 1.6666666666666667♪)
- **Melodie:** T1: 1→3 (2♪), 3→4 (2♪), 5→5 (2♪) · T2: 1→5 (4♪), 5→2 (2♪) · T3: 1→1 (2♪), 3→3 (2♪), 5→6 (2♪) · T4: 1→4 (6♪)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Snare/Clap/Rim, Melodie
- **Worauf hören?** „Das Schlagzeug zählt 6 (1 und 4), das Klavier zählt 3 (1, 2, 3). Beide beginnen auf derselben Eins – dort, wo der Bass einsetzt.“
- **Stufen:** 8 · **Muster:** auf die 1, 1 · 3 · 5 (wie 3/4), auf die 4

#### Kronleuchter `kronleuchter` – tückisch: Stop-Time (Stille zwischen den Schlägen)
- **Stil:** Glam-Rock mit Stop-Time · 4/4 · ♩ 92–104 · 4 Takte · Dur
- **Akkorde:** I – I – IV – V
- **Drums:** Bassdrum 1; Hi-Hat 1 2 3 4
- **Bass:** 1:1
- **Stabs:** power auf 1 (je 0.5♩)
- **Melodie:** T1: 2→5 (0.5♩), 2+→5 (0.5♩), 3→6 (1♩), 4→5 (1♩) · T2: 2→3 (1♩), 3→2 (1♩), 4→1 (1♩) · T3: 2→4 (1♩), 3→6 (1♩), 4→4 (1♩) · T4: 1→5 (2♩), 3→7 (2♩)
- **Variation:** Takt 4: Bassdrum 1 3 3+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+; Bass 1:1 1+:1 2:1 2+:1 3:1 3+:1 4:1 4+:1; Stabs power auf 1 2 3 4 (je 0.5♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Stop-Time: Die Band schlägt nur auf der Eins zu, dazwischen singt die Melodie allein. Erst im vierten Takt rockt alles durch.“
- **Stufen:** 8 · **Muster:** auf die 1, 1 und 2+ (Charleston), 1 und 4

#### Galopp `galopp` – tückisch: Doppelzeit-Gefühl
- **Stil:** Operetten-Galopp (Glam) · 4/4 · ♩ 132–144 · 4 Takte · Dur
- **Akkorde:** I – V7 – I – V7
- **Drums:** Bassdrum 1 2 3 4; Snare 1+ 2+ 3+ 4+
- **Bass:** 1:1 2:5 3:8 4:5
- **Stabs:** triad auf 1+ 2+ 3+ 4+ (je 0.25♩)
- **Melodie:** T1: 1→8 (0.5♩), 1+→7 (0.5♩), 2→6 (0.5♩), 2+→5 (0.5♩), 3→4 (0.5♩), 3+→3 (0.5♩), 4→2 (1♩) · T2: 1→5 (1♩), 2→7 (1♩), 3→2 (1♩), 4→4 (1♩) · T3: 1→3 (0.5♩), 1+→4 (0.5♩), 2→5 (0.5♩), 2+→6 (0.5♩), 3→7 (0.5♩), 3+→8 (0.5♩), 4→8 (1♩) · T4: 1→7 (2♩), 3→2 (2♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Melodie
- **Worauf hören?** „Galopp: „Bum-tschak“ auf jedem Schlag. Die Melodie stürzt auf der Eins von ganz oben herunter bzw. landet dort.“
- **Stufen:** 8 · **Muster:** auf die 1, 1 und 2+ (Charleston), 1 und 4

#### Drei gegen Vier `dreigegenvier` – tückisch: 3+3+2
- **Stil:** Indie-Rock 3-3-2 · 4/4 · ♩ 108–120 · 4 Takte · Dur
- **Akkorde:** vi – V – IV – V
- **Drums:** Bassdrum 1 2+ 4; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 2+:1 4:5
- **Klavier:** power auf 1 2+ 4 (je 1.3333333333333333♩)
- **Melodie:** T1: 1→6 (1.5♩), 2+→3 (1.5♩), 4→1 (1♩) · T2: 1→5 (1.5♩), 2+→7 (1.5♩), 4→5 (1♩) · T3: 1→4 (1.5♩), 2+→6 (1.5♩), 4→8 (1♩) · T4: 1→7 (3♩), 4→5 (1♩)
- **Phrase:** Fill snare16 ab 4 im letzten Takt; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie
- **Worauf hören?** „Gitarre, Bass und Bassdrum spielen 3+3+2 – die Gruppe beginnt auf der Eins; die Snare bleibt auf 2 und 4.“
- **Stufen:** 8 · **Muster:** 1 · 2+ · 4 (3-3-2), 1 und 2+ (Charleston), auf die 1

#### Opernteil `opernteil` – tückisch: Akkordrückungen
- **Stil:** Opern-Rock (Chor-„Ah“, Akkordrückungen) · 4/4 · ♩ 70–80 · 4 Takte · Dur
- **Akkorde:** I – bVI – bVII – V
- **Drums:** Bassdrum 1 3+; Snare 2 4; Hi-Hat 1 1+ 2 2+ 3 3+ 4 4+
- **Bass:** 1:1 2+:1
- **Klavier:** triad auf 1 3 (je 1.8333333333333333♩)
- **Stabs:** triad auf 1 2+ (je 0.3333333333333333♩)
- **Melodie:** T1: 1→5 (2♩), 3→3 (2♩) · T2: 1→8 (4♩) · T3: 1→4 (2♩), 3→2 (2♩) · T4: 1→2 (2♩), 3→7 (2♩)
- **Chor-Chops:** T1: 1→3„ah“ (3♩) · T2: 1→1„ah“ (3♩) · T3: 1→2„ah“ (3♩) · T4: 1→7„ah“ (3♩)
- **Phrase:** kein Fill; Becken auf Takt 1 der Periode
- **Eins hörbar an:** Bass, Harmonie, Bassdrum, Melodie, Chor
- **Worauf hören?** „Der Chor setzt mit „Ah“ auf jeder Eins neu ein, die Orchester-Schläge kommen auf 1 und 2+.“
- **Stufen:** 8 · **Muster:** 1 und 2+ (Charleston), auf die 1
