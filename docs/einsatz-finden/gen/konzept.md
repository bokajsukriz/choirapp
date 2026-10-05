# „Einsatz finden“: Song-Katalog für den Popchor

Entwurf, noch nicht in die App übernommen (siehe ARBEITSANWEISUNG-EINSATZ-FINDEN-SONGS.md). Die Daten liegen maschinenlesbar in `docs/einsatz-finden/songs.js` (`DB_SONGS`, `SONG_LEVELS`, `SONG_PATTERNS` und die Referenzfunktionen `songEvents`, `songFairness`, `songPeriodFairness`). Die Steckbriefe unten sind aus genau diesen Daten erzeugt, Datei und Steckbriefe stimmen also überein.

**Urheberrecht.** Alle {{COUNT}} Songs sind frei erfunden: Namen, Akkordfolgen, Melodien und Riffs. Sie übernehmen nur Stil, Besetzung und Groove-Typ, also gerade Rock-Achtel, Piano-Rock, Folk-Stomp, Disco-Indie, Halftime-Bridge, 6/8-Ballade, „Whoa-oh“-Chöre, Glam/Opern-Rock. Akkordfolgen wie I–V–vi–IV sind Allgemeingut. Die Melodien sind eigene, kurze Linien aus Stufen.

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
