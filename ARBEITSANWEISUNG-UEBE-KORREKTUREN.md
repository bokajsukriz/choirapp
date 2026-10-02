# Arbeitsanweisung für Claude Code – Korrekturen in den Übe-Tools

Du bist erfahrene Chorleiterin/erfahrener Chorleiter, Stimmbildner:in und
Entwickler:in. Ein musikpädagogisches Review der Übe-Sektion (Tools) hat
Fehler gefunden, die falsch bewerten, etwas Falsches beibringen oder die
Stimme unnötig belasten. Du behebst sie in kleinen, einzeln mergebaren
Paketen. Zwei Erweiterungen kommen dazu: Rhythmus mit dem Körper
(Paket 11) und Einsätze nach Pausen (Paket 12). Zielgruppe der App: ein
Laien-Popchor, der **nur nach Gehör** lernt, vier Stimmen (S, A, T, B).

Antworte und kommentiere auf Deutsch. **Die Anweisung läuft
unbeaufsichtigt:** keine Rückfragen; bei Unklarheit die Variante näher am
bestehenden Verhalten wählen und im Bericht unter „Zu entscheiden“ notieren.

**Grundlage ist das Übungen-Redesign** (Branch
`claude/affectionate-archimedes-75nl5c`, Stand `75078bc`, `SW_VERSION`
`v456`). Zeilenangaben beziehen sich auf diesen Stand und dienen nur zur
Orientierung. **Vor jedem Paket den Befund im aktuellen Code
selbst nachprüfen.** Ist er schon behoben oder trifft er nicht zu: Paket
überspringen und im Bericht begründen.

---

## 0. Vorbereitung

1. `git fetch origin`. Prüfen, ob `origin/main` den Commit `75078bc`
   enthält (`git merge-base --is-ancestor 75078bc origin/main`).
   - Ja (Redesign ist gemergt): Branch `uebe-korrekturen` von `origin/main`.
   - Nein: Branch `uebe-korrekturen` von
     `origin/claude/affectionate-archimedes-75nl5c`. Den PR später gegen
     diesen Branch öffnen, nicht gegen `main`, und das im Bericht vermerken.
   - Gibt die Umgebung einen anderen Branch vor: diesen nehmen und ihn auf
     dieselbe Basis setzen.
   - Nie auf `main` committen, nie mergen, nie force-pushen.
2. `CLAUDE.md` und `README.md` vollständig lesen, dazu
   `BERICHT-UEBUNGEN-REDESIGN.md` (vor allem „Zweite Runde“,
   „Inhaltsänderungen“ und „Entscheidungen“). Die dort festgelegten
   Grundsätze gelten weiter:
   - Hören vor Sehen; Noten nur auf Klick.
   - In der Phase „Du“ keine Tonhöhe, keine Cent und keine Treffer; die
     Auswertung erst im Ergebnis.
   - Singen meldet Worte statt Cent.
   - Gerüst je Übung: Stufen-Karte, Phasenleiste, Bühne und Dock bzw.
     Klatschfläche.
   - Gestaltung über `ueben.css`.
3. Je Paket die dort genannten Funktionen vollständig lesen, nicht nur die
   zitierten Zeilen.

## 1. Feste Regeln (gelten für jedes Paket)

- **Ein Paket = ein Commit**, danach sofort `git push -u origin <branch>`.
- **SW_VERSION** in `sw.js` bei jedem Commit um eins erhöhen, der eine Datei
  aus `SHELL_REQUIRED`/`SHELL_OPTIONAL` anfasst. Vor dem Commit
  `git diff --cached --stat` gegen die Liste in `CLAUDE.md` prüfen.
- **Keine bestehenden IDs ändern** (Übungs-IDs, Modus-IDs, Lektions-IDs,
  Lick-IDs, Einstellungs-Schlüssel, Fortschrittsbereiche). Ein umbenannter
  *Anzeigename* ist in Ordnung, die ID bleibt.
- **Gespeicherte Zustände:** neue Felder optional mit Standardwert; `restore`
  bzw. das Laden übernimmt nur gültige Werte. `DATA_VERSION` in `app.js` nicht
  anfassen.
- **Oberfläche:** Neue oder geänderte Elemente nutzen die Bausteine und
  Tokens aus `ueben.css` und das bestehende Übungs-Gerüst. Keine eigenen
  Farben und keine Sonderlayouts. Bestehende Playwright-/Gerüst-Tests (gleiche
  Positionen von Phasenleiste, Bühne und Dock) bleiben grün.
- **Texte:** Tool-Seiten (`uebe-lab.html`, `einsingen.html`, `licks.html`,
  `piano.html`) sind nur deutsch. Ermutigende Wortwahl wie im Bestand
  („Noch nicht — …“).
- **Keine neuen Abhängigkeiten, kein Build-Schritt.** Klang nur über die
  vorhandenen Engines.
- **Kopien synchron halten:** `judgeHold` existiert wortgleich in
  `uebe-lab.html` und `licks.html` – in diesen Paketen **nicht** ändern.
  Wird Code aus einer Datei in eine andere kopiert, Herkunft im Kommentar
  nennen („Kopie aus …, identisch halten“).
- **Selbsttests:** Jedes Paket ergänzt die Selbsttests der betroffenen Datei
  (`runSelfTests` in `uebe-lab.html`, die Selbsttests in `einsingen.html`,
  `licks.selfCheck()`). Bestehende Tests nur dort anpassen, wo sie genau das
  geänderte Verhalten prüfen – im Bericht auflisten. Reine Funktionen vorab
  per `node` an einem herausgelösten Ausschnitt prüfen; danach die App laut
  Skill `run-choirapp` im Browser starten und alle Selbsttests der
  betroffenen Seite grün sehen.
- **Nur umsetzen, was im Paket steht.** Was dir unterwegs auffällt, kommt in
  den Bericht unter „Beobachtungen“.

## 2. Entscheidungen (verbindlich)

| Thema | Festlegung |
|---|---|
| Intonation im Akkord | Bezug ist die **reine Stimmung** zum Grundton des Akkords (gleichstufiger Grundton): große Terz −13,7 Cent, kleine Terz +15,6 Cent, Quinte +2,0 Cent, Oktave/Prime 0 |
| Ton halten | Abweichung **oktavneutral** wie im Tuner und in den anderen Sing-Modi |
| Glättung der Tonhöhe | **Median** statt Mittelwert über dasselbe Fenster (`SMOOTH_SECONDS`) |
| Ruf (leichter Belt) | Aus einem Pool nur, wenn **vorher im selben Programm Twang** lief. Ausdrückliche Wahl über ⇄ bleibt erlaubt |
| Männer am Übergang | Für T und B in Oktavsprung, Dreiklang, Moll-Dreiklang, Staccato–Legato und Koloratur die Obergrenze um **2 Halbtöne** senken, dazu ein Hinweissatz |
| Rhythmussilben | Silbe nach **Position im Sechzehntelraster**: auf dem Schlag und dem „und“ „ti“, auf „e“ und „a“ „ri“; längere Werte, die nicht auf Schlag oder „und“ beginnen, bekommen „-i“ angehängt (wie das bestehende „ti-i“) |
| Zählweise | Sechzehntel **„1 e + a“** (wie in den Lektionstexten und in `licks.html`) |
| Letzter Akkord eines Schlusses | immer **Grundstellung** |
| sus2/sus4 in „Klänge“ Stufe 6 | nur **Grundstellung** |
| „Pop in Moll-Farbe“ vs. „Epische Moll-Folge“ | gleiche Akkorde → **beide Antworten gelten als richtig**, die Rückmeldung erklärt den Zusammenhang |
| Moll in „Töne in der Tonart“ | Stufe 5 (natürliches Moll) kadenziert **i–VI–VII–i** (ohne Leitton); Stufe 6 (mit si) bleibt bei i–iv–V–i |
| Licks „Ganz“ | geschafft ab **85 % Treffern** (aufgerundet) und höchstens **einem** Ton zu viel |
| Licks „Stückweise“ | **ein** Ton zu viel wird toleriert, wenn ohne ihn alles stimmt |
| Licks-Lage | **Vorspiel und Liegeton** in die Lage der eigenen Stimme oktavieren; die Bewertung bleibt bei Tonklassen (Oktave egal) |

---

## 3. Pakete

### Paket 1 – Intonation im Akkord: reine Stimmung (`uebe-lab.html`)

**Befund.** In „Hören → Intonation“, Stufen 5 („Akkord: markierte Stimme“)
und 6 („Akkord: welche Stimme?“), klingt der Akkord gleichstufig
(`playEarTask`, Zweig Intonation, ca. Z. 5812–5815; `engine.saw`, Z. ~2378).
Der Klang ist seit dem Redesign stimmähnlich und wandert um ±2,5 Cent, der
Bezug ist aber weiter gleichstufig. Die große Terz liegt dann
13,7 Cent über der reinen. Folgen:
- Wer im Chor sauber, also die Terz tiefer intoniert, wird „zu tief“ gewertet.
- Die Fangaufgabe („sauber — keine Abweichung“) schwebt selbst hörbar.
- Stufe 4 (Quinte) vergleicht schon mit der reinen Quinte
  (`1.955 + task.cents`), die Stufen sind also uneinheitlich.

**Umsetzung.**
1. Reine Funktion `justOffsetCents(semisAboveRoot)` (Halbtöne mod 12 →
   Cent-Abweichung der reinen von der gleichstufigen Stufe). Mindestens
   0 → 0, 3 → +15,64, 4 → −13,69, 7 → +1,96. Andere Werte: 0, im Kommentar
   begründet (kommen in `satbOf(key, ['I'])` nicht vor).
2. Für `chordMarked` und `chordWhich` jede Stimme mit
   `justOffsetCents(midi − Grundton)` spielen, die verstimmte Stimme
   zusätzlich mit `task.cents`. Das gilt auch für das Vorspielen allein der
   markierten Stimme. Den Grundton aus der Aufgabe ableiten (`key` in der
   Aufgabe speichern, falls nicht vorhanden).
3. Für die Quinte (Stufe 4) `1.955` durch `justOffsetCents(7)` ersetzen
   (gleiches Verhalten, eine Quelle).
4. Die ±2,5-Cent-Wanderung bleibt; ihr Mittel ist künftig der reine statt
   der gleichstufige Sollton. Kommentar an `engine.saw` anpassen.
5. In die volle Erklärung im Blatt „Hilfen“ (bei Intonation) einen Satz
   ergänzen: „Im Akkord gilt die reine Stimmung: Die Dur-Terz klingt etwas
   tiefer als am Klavier – so singt ein Chor sauber.“ Nicht in die Bühne,
   die bleibt während der Aufgabe ohne Fachbegriffe (Redesign).

**Tests.**
- `justOffsetCents` für 0/3/4/7 auf ±0,05 Cent.
- In einer erzeugten `chordMarked`-Aufgabe mit `cents = 0` liegt das
  Frequenzverhältnis Terz/Grundton (oktavbereinigt) bei 5/4 ± 0,1 Cent.

### Paket 2 – Ton halten oktavneutral (`uebe-lab.html`)

**Befund.**
- `holdStep` (Z. ~9136) speichert `cents: (midi - task.target) * 100`
  (Z. ~9153), ohne die Oktave herauszurechnen. Alle anderen Sing-Modi tun
  das: der Tuner bzw. „Meine Stimme“ mit `mod(… + 6, 12) - 6`,
  `makePitchJudge` und `scoreEcho`.
- Ohne Stimmprofil gilt `ear.part = 'A'` (Z. ~4694). Ein Tenor, der den
  Alt-Zielton eine Oktave tiefer singt, bekommt dann „Lage −1200 Cent“ und
  einen Fehlversuch.
- Das widerspricht dem eigenen Hinweis „Tiefe Stimmen dürfen eine Oktave
  tiefer singen“ (Z. ~1086).

**Umsetzung.**
1. In `holdStep` die Abweichung auf ±6 Halbtöne falten, genau wie im Tuner.
   Die gefaltete Oktavlage (−1/0/+1) in der Aufgabe merken. Bei stabiler
   Oktavabweichung ergänzt `finishHold` (Z. ~9291) die Rückmeldung um
   „(eine Oktave tiefer – passt)“ bzw. „höher“.
2. Ist kein Stimmprofil gesetzt (`readProfile()?.part` fehlt), über „Ton
   halten“ einmal den Hinweis zeigen: „Wähle oben deine Stimme, dann liegt der
   Ton in deiner Lage.“ Dafür den vorhandenen Stimm-Wähler bzw. die
   vorhandene Hinweis-Mechanik nutzen, keine neue Oberfläche bauen. Gibt es
   im Singen-Bereich keinen Stimm-Wähler: nur den Hinweistext, und im Bericht
   vermerken.

**Tests.**
- Den Simulationstest bei Z. ~13642 (`holdStep` mit synthetischen Werten)
  erweitern: Ziel 64, gesungen 52 ± 5 Cent → Lage ≈ 0, Urteil „ruhig“.
- Ziel 64, gesungen 64,3 → +30 Cent wie bisher.

### Paket 3 – Tonhöhe per Median glätten (`uebe-lab.html`)

**Befund.**
- Der Abschnittskommentar verspricht „Ein Median über die letzten Werte
  glättet einzelne Oktavfehler“ (Z. ~6971).
- `smoothPitch` (Z. ~6982) bildet aber den **Mittelwert**.
- Ein einzelner Oktavsprung des Erkenners in einem Fenster von ~21 Werten
  verschiebt das Ergebnis um rund 57 Cent. Betroffen sind die Tuner-Nadel,
  die Halte-Statistik (`holdHit`, sd ≤ 12 Cent → falsches „noch unruhig“) und
  `makePitchJudge` (Z. ~7491).

**Umsetzung.**
1. `smoothPitch` liefert den Median der Werte im Fenster. Bei gerader Anzahl
   das Mittel der beiden mittleren Werte, damit Vibrato symmetrisch bleibt.
   Es gibt schon zwei lokale `median`-Helfer (Z. ~3004, ~7039), die bei gerader
   Länge das obere Element nehmen. Eine gemeinsame, korrekte Fassung in der
   Nähe von `smoothPitch` anlegen; die bestehenden Aufrufer nicht verändern.
2. Kommentar „Mittelwert der Rohwerte“ und den Anzeige-Kommentar direkt
   über `SMOOTH_SECONDS` anpassen: Der Median zeigt bei Vibrato ebenfalls die Mitte.

**Tests.**
- Reihe aus 20 Werten 60,00 und einem Wert 72,00 → Ergebnis 60,00.
- Sinus-Vibrato ±0,3 Halbtöne um 60 → Ergebnis 60 ± 0,05.
- Alle bestehenden Sing-Selbsttests (`scoreEcho`-Simulationen, Ton finden,
  Halten) bleiben grün. Wenn nicht: Ursache im Bericht, nicht die Schwelle
  aufweichen.

### Paket 4 – Einsingen: Ruf nie mit kalter Stimme (`einsingen.html`)

**Befund.**
- Pool `popklang` = `['sprechSingen', 'geraderTon', 'ruf']` (Z. ~922). Die
  Programme „Kurz“ und „Schnell“ greifen schon an 3. bzw. 4. Stelle darauf
  zu.
- Durch die Rotation (`resolveProgram`) kommt der „Ruf“ (leichter Belt)
  regelmäßig nach nur zwei kurzen Übungen.
- Das widerspricht seinem eigenen Hilfetext „Nur nach dem Einsingen, nie mit
  kalter Stimme“ (Z. ~749).
- Die Editor-Warnung `draftWarning` (Z. ~2503) prüft nur die Gruppe `hoehe`.
- Der neue Prestart-Hinweis „Erst Kurz einsingen, dann dieses Programm“
  (Redesign) gilt nur für „Höhe“/„Tiefe“, nicht für den Ruf in „Kurz“
  selbst.

**Umsetzung.**
1. Übung `ruf` bekommt ein neues Feld `needsWarm: 'twang'`. Pool-Kandidaten
   mit `needsWarm` sind nur zulässig, wenn die genannte Übung im selben
   aufgelösten Programm **vorher** steht. Das kann ein fester Platz sein oder
   ein früherer Pool-Platz; dafür die Pool-Plätze der Reihe nach auflösen.
   Ohne zulässigen Kandidaten nimmt der Platz den nächsten nach Rotation, wie
   bisher.
2. ⇄-Wahlen (`picks`) bleiben erlaubt.
3. `draftWarning` erweitern: steht `ruf` nicht hinter `twang` oder vor jeder
   Übung der Gruppen `lockern`/`resonanz`, lautet der Tipp: „Tipp: Den Ruf
   erst nach Lockern und Twang.“ Die bestehende Höhe-Warnung hat Vorrang,
   wenn beide zutreffen.
4. „Höhe“ (fester `ruf` nach `twang`) bleibt unverändert. `resolveProgram`
   steht bei Z. ~969, die Programme bei Z. ~939.

**Tests.**
- Für jedes feste Programm × jede Belastung × 30 aufeinanderfolgende
  Rotationen: `ruf` steht nie vor `twang`.
- `resolveProgram` bleibt deterministisch.
- `draftWarning` meldet bei `[ruf, lippen]` den neuen Tipp.

### Paket 5 – Einsingen: Männerstimmen am Registerübergang (`einsingen.html`)

**Befund.** Bei normaler Belastung erreichen Tenöre auf offenen Vokalen:

| Übung | Tenor bis |
|---|---|
| Oktavsprung „ja-a“ | g′ |
| Dreiklang „ja“ | fis′ |
| Staccato „ha“ | fis′ |
| Koloratur „a“ | g′ |

Bässe erreichen im Oktavsprung d′ und im Dreiklang c′. Für Laien liegt das im
oder über dem Übergang. Die Texte sagen nur „nicht hochdrücken“.

**Umsetzung.**
1. Neues optionales Übungsfeld `topLow` (Halbtöne, negativ). In
   `exerciseRange` (Z. ~1433) wird es bei den Stimmen T und B auf die Obergrenze addiert:
   `v.floor + ex.top + L.topShift + (tief ? ex.topLow : 0)`. Die Grenze der
   Stimmlage (`v.ceil`) gilt weiter.
2. `topLow: -2` für `oktave`, `dreiklang`, `mollDreiklang`, `staccatoLegato`,
   `koloratur`. Weitere Übungen nur, wenn die Nachrechnung (Schritt 4) dort
   für T über e′ bzw. für B über c′ landet; im Bericht nennen.
3. Im Hilfetext dieser Übungen (zweiter Absatz) einen Satz ergänzen: „Tiefe
   Stimmen: oben leicht und schlank bleiben, ruhig mit mehr Kopfstimme – der
   Vokal darf sich Richtung „o“ abrunden.“
4. Nachrechnen und in den Bericht als Tabelle: höchster Ton je Übung × T/B ×
   Belastung, vorher/nachher.

**Tests.**
- Der bestehende Test „kein Ton verlässt den Umfang“ bleibt grün.
- Neu: Für T bei „normal“ liegt der höchste Ton von `oktave` ≤ f′ (MIDI 65);
  für B der von `dreiklang` ≤ b (MIDI 58).
- S und A sind unverändert, als Vergleich vorher/nachher im Test.

### Paket 6 – Rhythmussilben und Zählweise unterscheidbar (`uebe-lab.html`)

**Befund.** `syllablesFor` (Z. ~1582). Die Silben stehen seit dem Redesign
nach der Runde eingefärbt in der Karte „Letzte Runde“ und bei „Noten
zeigen“; sie kommen weiter aus dieser Funktion:
- **Silben:** Die Silbe hängt nur von der Notenlänge ab. Dadurch klingen
  `achtel16` (`6 3 3`) und `synkope16` (`3 6 3`) beide „ti ti ri“, zwei
  verschiedene Rhythmen mit derselben Rhythmussprache. Das widerspricht dem
  Grundsatz „wer es sprechen kann, kann es singen“ und der Warnung in der
  Lektion selbst.
- **Zählweise:** Jedes Sechzehntel neben dem Schlag heißt „e“
  (Kopfkommentar: „1 e + e“). Die Lektionen `aufA` und `synkope16` sprechen
  aber vom „a“ (Z. ~1715, ~1718). `aufA` zeigt dadurch „1 (2) e 3 4“ statt
  „1 (2 e +) a 3 4“, und „Einsatz auf e“ und „Einsatz auf a“ sehen gleich
  aus.

**Umsetzung.**
1. **Silben** (`style 'ta'`), Sechzehntel- und Achtelwerte nach Position im
   Schlag:
   - Beginn auf Schlag oder „und“ → „ti“, auf „e“/„a“ → „ri“.
   - Ein Wert ab Achtellänge, der auf „e“/„a“ beginnt, bekommt „-i“
     („ri-i“).
   - Ergebnis: `synkope16` = „ti ri-i ri“, `achtel16` = „ti ti ri“
     (unverändert), punktiert (`9 3`) = „ti-i ri“ (unverändert).
   - Triolen, Viertel und längere Werte, Shuffle, Pausen und Bindungen
     bleiben wie sie sind.
2. **Zählweise** (`style 'count'`): Bei Schlageinheit 12 Ticks gilt Offset 3 →
   „e“, 6 → „+“, 9 → „a“. Andere Raster unverändert. Den Kopfkommentar und
   den Lektionstext mit „1 e + e“ (Z. ~1706) auf „1 e + a“ ändern.
3. Lektionstexte prüfen, die Silben wörtlich zitieren (`intro`/`more` im
   `COURSE` und die neuen Lektions-Vorstellungen aus dem Redesign). Wo sie nach der Änderung nicht mehr zur Anzeige passen,
   anpassen und im Bericht auflisten.

**Tests.**
- Den bestehenden Test (Z. ~12454, erwartet `'1 e + e 2 o le 3 (4) +'`) auf
  „1 e + a …“ anpassen.
- Neu:
  - `synkope16` und `achtel16` ergeben verschiedene Silbenfolgen.
  - `aufA` zählt „1 (2) a 3 4“ (die Pause ab der Zwei steht wie bisher als
    „(2)“).
  - `aufE` und `aufA` ergeben verschiedene Zählfolgen.
- Neu, allgemein: Über alle Kurs-Takte ohne Pausen/Bindungen gleicher
  Taktart prüfen, dass verschiedene Rhythmen verschiedene Silbenfolgen
  ergeben. Verbleibende Kollisionen außerhalb der genannten Paare nicht
  erzwingen, sondern im Bericht auflisten.

### Paket 7 – Hören: mehrdeutige und falsche Aufgaben (`uebe-lab.html`)

Vier unabhängige Teilkorrekturen in einem Commit. Kann eine davon nicht
sauber umgesetzt werden, nur sie weglassen und im Bericht begründen.

**7a – Schlüsse enden in Grundstellung.**
- *Befund:* `bassIndex` (Z. ~4760) wählt bei `inversion: 'style'` für einen
  Nicht-Kadenz-I-Akkord zufällig zwischen [0, 1]. Das gilt auch für den
  **letzten** Akkord. In „Schlüsse“ Stufe 6 endet ein „fertig (Ganzschluss)“
  so oft auf I⁶, und das ist kein vollkommener Schluss.
- *Umsetzung:* Der letzte Akkord einer Phrase (`nextSymbol === undefined`)
  steht immer in Grundstellung. Der Aufruf (Z. ~4784) übergibt
  `symbols[i + 1]`, beim letzten Akkord also `undefined`.

**7b – „Amen“-Erklärung.**
- *Befund:* Die Phrase `['I', 'V', 'IV', 'I']` in `CADENCE_PHRASES.plagal`
  enthält mit der V den Leitton. `CADENCE_WHY.plagal` (Z. ~4893) behauptet
  aber „weich, ohne Leitton“.
- *Umsetzung:* Phrase behalten (V–IV ist im Pop gängig), Text ändern zu
  „IV–I am Schluss, der „Amen“-Schluss: Der letzte Schritt kommt ohne Leitton
  aus und klingt weich.“

**7c – sus-Klänge eindeutig.**
- *Befund:* In „Klänge“ Stufe 6 (`inversion: 'any'`) erlaubt
  `qualityInversions` für sus2/sus4 alle drei Lagen. Csus2 in der
  2. Umkehrung (G–C–D) ist aber Gsus4 in Grundstellung, Csus4 in der
  1. Umkehrung (F–G–C) ist Fsus2. Wer richtig hört, wird als falsch gewertet.
- *Umsetzung:* `qualityInversions('sus2'|'sus4')` = 1 (Z. ~4851). Den
  Kommentar mit dieser Begründung ergänzen. Der Name des Modus ist seit dem
  Redesign „Akkordfarben“.

**7d – „Pop in Moll-Farbe“ = „Epische Moll-Folge“.**
- *Befund:* `sad` (vi–IV–I–V in Dur, Z. ~4598) und `epic` (i–VI–III–VII in
  Moll, Z. ~4603) ergeben dieselben Akkorde, z. B. Am–F–C–G. Liegen beide in einer Auswahl,
  entscheidet nicht das Gehör.
- *Umsetzung:* Liegen beide in der Auswahl der aktuellen Stufe, gilt jede der
  beiden Antworten als richtig. Die Rückmeldung ergänzt: „Gleiche Akkorde wie
  „…“ – einmal von Dur aus gehört, einmal von Moll aus.“ Die Statistik je
  Folge (Gewichtung) bucht auf die gezogene Folge.

**7e – Moll ohne Querstand.**
- *Befund:* „Töne in der Tonart“ Stufe 5 („Moll: la bis so“, natürliches
  Moll, Z. ~5560) kadenziert mit i–iv–**V**–i (`inKeyCadence`, Z. ~5330,
  Leitton si). Abgefragt
  und aufgelöst wird dann aber mit so (♭7, Auflösung fa→so→la bzw. so→la).
  Nach dem gerade gehörten gis erklingt also g.
- *Umsetzung:* `inKeyCadence` bekommt die Stufe bzw. ein Flag `leading`:
  - Moll **ohne** si: i–VI–VII–i (äolisch, typisch Pop).
  - Moll **mit** si (Stufe 6): i–iv–V–i wie bisher.
  - In Stufe 6 lösen in Moll mi, fa und so stufenweise **abwärts** zur Tonika
    auf, si weiter aufwärts (`noteInKeyResolution`, Z. ~5609). So erklingen
    ♭7 und ♯7 nie in derselben Auflösung.
  - Das gilt genauso für die neuen Tonmuster (Einstellung „Muster“, 2–3 Töne):
    Prüfen, wie deren Auflösung gebaut wird, und dieselbe Regel anwenden.
  - Den Selbsttest, der `inKeyCadence` direkt aufruft (Z. ~12854), anpassen.
  - „Akkorde in der Tonart“ prüfen: Nutzt es dieselbe Kadenz? Nur ändern, wenn
    dort natürliches Moll ohne V abgefragt wird; sonst unverändert lassen und
    im Bericht vermerken.

**Tests.**
- 7a: 200 zufällige Ganzschluss-Phrasen in Stufe 6 enden alle mit Bass =
  Grundton.
- 7c: In Stufe 6 kommt kein sus-Klang mit Umkehrung > 0 vor.
- 7d: `answer('epic')` auf eine `sad`-Aufgabe zählt als richtig, wenn beide in
  der Stufe sind.
- 7e: Stufe-5-Kadenz enthält in Moll keinen Ton 11 Halbtöne über der Tonika.
  Keine Stufe-6-Auflösung in Moll enthält sowohl 10 als auch 11.
- Der Parallelen-Test für Kadenzen (falls vorhanden) bleibt grün, auch für
  i–VI–VII–i.

### Paket 8 – Licks: faire Bewertung, eigene Lage (`licks.html`)

**Schon erledigt (Redesign, `a065d67`):** Tempo 70–100 % in den
Lernschritten (`runPct`/`runBpm`, Z. ~1364), Durchhalten im Original,
„Sitzt“ nur im Original. Daran nichts ändern.

**Befund.**
- „Ganz“ zählt nur bei `abs.hits === exp.length` (Z. ~2093), also alle Töne
  ohne Ausnahme; bei `arpMoll` 16 Sechzehntel in Folge.
- „Stückweise“ scheitert schon an einem einzigen versehentlichen Zusatz-Tipp
  (`partMessage`, Z. ~840).
- Basslicks liegen auf E bzw. G (MIDI 40/43, Z. ~343, ~375), auch für
  Soprane. `licks.html` liest das Stimmprofil nicht.
- Für Sänger:innen ohne Klavierpraxis ist das die größte Frustquelle.

**Umsetzung.**
1. **„Ganz“:** geschafft bei `hits ≥ ceil(0,85 · n)` und höchstens einem
   Ton zu viel. Bei weniger als allen Treffern lautet der Text „Fast alles –
   X von Y Tönen. Das zählt; ganz sauber wird's mit der Zeit.“
2. **„Stückweise“:** Bei `got.length === want.length + 1` jeden einzelnen
   Tipp probeweise weglassen. Passt ohne ihn alles (Tonklassen und
   Rhythmus), gilt der Teil als geschafft, mit dem Zusatz „(ein Ton zu viel –
   zählt trotzdem)“.
3. **Lage:**
   - Eigene Stimme über `window.parent.chorVoiceProfile?.get()?.part` holen
     (im try/catch wie `prefsApi`).
   - Übe-Umfang über `ChorHarmony.practiceRange` (harmony.js ist schon
     eingebunden).
   - Für Vorspiel und Liegeton die Oktavverschiebung k·12 wählen, deren
     Lick-Mitte (Mittel aus tiefstem und höchstem Ton) der Mitte des
     Übe-Umfangs am nächsten liegt.
   - Die Tastatur folgt der verschobenen Lage (bestehende Lage-Logik der
     Tastatur, MIDI 24–96).
   - Die Bewertung bleibt bei Tonklassen.
   - Ohne Stimmprofil: keine Verschiebung.

**Tests (`licks.selfCheck()`).**
- „Ganz“ mit 14/16 Treffern geschafft, mit 13/16 nicht.
- „Stückweise“ mit genau einem Zusatz-Tipp geschafft, mit zwei nicht.
- `bassOktav` für Sopran um +24 bzw. +12 (je nach Umfang) verschoben, für Bass
  um 0.
- Bestehende Testvektoren für `judgeHold` unverändert grün.

### Paket 9 – Licks singen statt tippen (optional, zuletzt; `licks.html`)

Nur angehen, wenn die Pakete 1–8 sauber durch sind. Gelingt es nicht in
vertretbarem Umfang, zurücksetzen und im Bericht einen Entwurf beschreiben.

**Befund.** `licks.html` bewertet ausschließlich Bildschirmtasten (Kopfzeile
Z. ~23: „kein Mikrofon“). Für Sänger:innen misst das vor allem
Fingergeschick. Die Tonhöhenerkennung gibt es schon in `uebe-lab.html`
(`detectPitch`, YIN; Mikrofon-Constraints und Bluetooth-Behandlung im
Abschnitt davor). Für das Mikrofon-Symbol und den Pegel das Muster der
Sing-Bühne aus dem Redesign übernehmen (durchgestrichen = aus, grün nach
Pegel, rot = zu laut).

**Umsetzung.**
1. Eingabe-Wahl „Tippen · Singen“ (Standard Tippen, gespeichert im
   Tool-Stand).
2. Bei „Singen“: `detectPitch` samt benötigter Helfer als Kopie aus
   `uebe-lab.html` übernehmen (Kommentar „Kopie aus uebe-lab.html, identisch
   halten“). Dazu kommt eine Einsatzerkennung: ein stimmhafter Abschnitt
   ≥ 80 ms ergibt einen Anschlag `{ t, pc }`, und `t` ist der Beginn
   abzüglich der gespeicherten `calibration.micMs`.
3. Die Anschläge gehen in dieselben Bewertungsfunktionen wie das Tippen.
   Tonklasse aus dem Median des Abschnitts.
4. Das Mikrofon läuft nur während der eigenen Runde, nie im Hintergrund.
   Nichts wird aufgenommen; Hinweistext wie in `uebe-lab.html`.
   Die Kopfzeile von `licks.html` und `README.md` anpassen.
5. Die CSP der Seite prüfen (Mikrofon braucht keine CSP-Änderung, aber
   `Permissions-Policy`/iframe-`allow` in `app.js` beim Öffnen des Tools
   prüfen, wie bei `uebe-lab.html`).

**Tests.**
- Synthetische Tonhöhen-Rahmen (wie die `scoreEcho`-Simulationen) für einen
  Lick ergeben die erwarteten `{ t, pc }`.
- Vibrato ±30 Cent ergibt keine Zusatzanschläge.
- Ein Oktavsprung des Erkenners innerhalb eines Tons ergibt keinen neuen
  Anschlag.

### Paket 10 – Kleinkram (niedrige Befunde)

Ein Commit je Datei ist erlaubt (10a–10d), jeweils mit SW_VERSION-Erhöhung.

**10a – `uebe-lab.html`**
1. **Kunststimme** (`singVoice`, Z. ~2153):
   - *Befund:* Sie schleift jeden Ton von −60 Cent an und hat ±28 Cent
     Vibrato ab 0,25 s. Die App lehrt selbst „Gerade Töne sind im Popchor die
     Regel“ und macht hier das Gegenteil vor.
   - *Umsetzung:* Anschleifen −20 Cent in 50 ms. Vibrato nur bei Tönen
     ≥ 1 s, erst im letzten Drittel des Tons, ±12 Cent.
2. **Tuner-Zone:**
   - *Befund:* `.gauge-zone` ist 10 % breit (Z. ~317). Das entspricht ±5 Cent
     bei ±50 bzw. ±10 Cent bei ±100; „Sauber“ kommt aber bei ±10 Cent
     (Z. ~7272). Betrifft die Karte „Meine Stimme“ (früher Tuner).
   - *Umsetzung:* Breite und Lage der Zone aus `range` setzen, sodass sie
     immer genau ±10 Cent zeigt.

**10b – `licks.html`**
1. **`bassFunk16`-Text** (Z. ~378):
   - *Befund:* „alles andere fällt auf ‚e‘ und ‚a‘“ stimmt nicht. Die Töne
     liegen auf 1, 1-a, 2, 2-a, 3-e, 4, 4-und, 4-a.
   - *Umsetzung:* neu: „Kurze Töne, viel Luft dazwischen. Die Eins sitzt,
     danach landen die Töne oft knapp neben dem Schlag – auf „a“ und „e“. Die
     letzten drei – auf 4, „und“, „a“ – laufen chromatisch in die nächste
     Eins.“ Gegen `notes` nachzählen.
2. **Disco-Bass:**
   - *Befund:* `bassOktav` („Oktav-Disco-Bass“) läuft über die neutrale
     Begleitung mit Bassdrum auf 1 und 3 (`GROOVE_KICK`, Z. ~901). Disco hat
     Four-on-the-floor.
   - *Umsetzung:* optionales Lick-Feld `kick: 'four'` → Bassdrum auf allen
     vier Vierteln in `grooveFor`, gesetzt nur bei `bassOktav`. Test in
     `selfCheck`.

**10c – `einsingen.html` (Texte, IDs bleiben)**
- `zwerchfell` (Z. ~687):
  - Anzeigename „Zwerchfell-Staccato“ → „Atem-Staccato“.
  - `how` „der Impuls kommt aus dem Bauch“ → „der Impuls kommt aus der
    Körpermitte“.
  - Begründung im Kommentar: Das Zwerchfell ist ein Einatemmuskel, den
    Impuls geben die Bauchmuskeln. Der vorhandene Hilfetext („Bauch federt
    nach innen“) stimmt und bleibt.
- `zwischenatmung` (Z. ~674): „Die Luft fällt in den Bauch, weil er am Phrasenende
  loslässt“ → „Der Bauch lässt am Phrasenende los, und die Luft strömt von
  selbst ein.“
- `haltung` (Z. ~642): „drei ruhige Atemzüge in Bauch und Flanken“ → „drei ruhige
  Atemzüge – Bauch und Flanken weiten sich dabei“.
- Weitere Stellen mit derselben Vorstellung („Luft in den Bauch“) per grep
  suchen und gleich behandeln; im Bericht auflisten.

**10d – `piano.html`**
- *Befund:* Das Klavier beschriftet mit festem Do (Do = C, Si = H), alle
  anderen Tools mit beweglichem do (do = Grundton). Für Laien ist das
  verwirrend.
- *Umsetzung:* Den Knopf „Do Re Mi (fest)“ (Z. ~103) mit einem `title` versehen und
  beim ersten Einschalten einmal einen kurzen Hinweis zeigen: „Hier ist Do
  immer C. In den Übungen ist „do“ der Grundton der Tonart.“ Keine neue
  Beschriftungsart.

### Paket 11 – Rhythmus mit dem Körper (`uebe-lab.html`, neuer Modus)

**Warum.** Bisher ist Rhythmus reines Klatschen oder Tippen gegen einen
Groove. Auf der Bühne muss der Puls aber im Körper laufen, während Stimme
oder Hände etwas anderes tun. Laien verlieren den Puls fast immer genau dann,
wenn der Rhythmus vom Schlag weggeht. Body-Percussion in Schichten ist
außerdem ein klassisches Warm-up für Popchöre und lässt sich direkt in die
Probe übertragen.

**Einbindung.**
- **Vorbild ist „Einsatz finden“** (`downbeat`, im Redesign in den
  Rhythmus-Bereich umgehängt):
  - eigene Zeile in der Rhythmus-Übersicht (`rhythmHubHtml`) und eigene
    Ansicht (`views.rhythm`, Z. ~4309),
  - Gerüst aus Stufen-Karte, Phasenleiste (Hören · Du · Ergebnis), Bühne und
    Klatschfläche in der Fußleiste,
  - Auflösung Takt für Takt nach dem Lauf,
  - Hilfen im Blatt „Hilfen“, Eingabe (Tippen/Mikrofon) und Latenz wie dort.

  Den Code von `downbeat` (`DOWNBEAT_LEVELS` Z. ~5074, `makeDownbeatTask`,
  `judgeDownbeat`, `renderDownbeatDock` Z. ~6404) vorher vollständig lesen
  und Bausteine wiederverwenden statt neu bauen.
- Modus-ID `body`, Anzeigename „Körper“, Kurztext in `MODE_TEXT`: „Puls im
  Fuß, Rhythmus in den Händen“, Icon in `MODE_ICONS`.
- Stufen über die bestehende Stufen-Mechanik (Vorschlag, nie automatischer
  Wechsel), sechs Stufen.
- Fortschritt: neuer Fortschrittsbereich `body` in `app.js`
  (`PROGRESS_AREAS`), in der Gruppe `rhythm` wie `downbeat`
  (`PROGRESS_GROUPS`, app.js Z. ~23102–23109). Prüfen, wie der Ring der
  Rhythmus-Kachel die Gruppe mittelt: Ein neuer Bereich, der noch nie
  gespielt wurde, darf den Ring nicht senken. Er zählt erst mit, wenn er
  einmal gespielt wurde. Fügt `downbeat` sich schon so ein, genauso machen;
  sonst die Regel ergänzen und im Bericht nennen. Die Selbsttests in `app.js`
  zu `PROGRESS_AREAS`/`PROGRESS_GROUPS` erweitern. Texte, die in `app.js`
  sichtbar werden, über `strings.js` in DE, EN und PL.
- Material nur aus geschafften Kurs-Lektionen ohne Shuffle und Auftakt
  (wie `holdPool`, der Grundschlag ist immer dabei).

**11a – Steppen und klatschen (Stufen 1–3).**
- Ablauf: Man steppt die Viertel auf der Stelle (von einem Fuß auf den
  anderen) und klatscht dazu einen gelernten Rhythmus, 4 bzw. 8 Takte am
  Stück.
- Bewertet wird nur das Klatschen (Tippen oder Mikrofon), und zwar im
  absoluten Raster, also ohne Neuausrichtung, mit `judgeHold`. `judgeHold`
  selbst nicht ändern. Die Rückmeldung nennt das Timing als Tendenz in Worten
  (früh / genau / spät), ohne ms, wie im Redesign.
- Der Step bleibt bewusst unbewertet. Hinweistext: „Der Fuß ist dein
  Metronom – er wird nicht bewertet, aber er darf nie stehen bleiben.“

| Stufe | Begleitung | Länge |
|---|---|---|
| 1 | voller Groove, dazu eine leise Bassdrum auf allen Vierteln als „Fuß-Vorbild“ | 4 Takte |
| 2 | nur noch die Fuß-Bassdrum | 8 Takte |
| 3 | 2 Takte Fuß-Bassdrum, danach still: nur der eigene Step hält den Puls | 8 Takte |

- Vorher einmal hören (Phase „Hören“): Die App spielt den Rhythmus mit
  Fuß-Bassdrum vor. Die Klänge kommen aus `engine.drum('kick' | 'snare' | 'hat' | 'rim')` und
  `engine.clap`.

**11b – Body-Percussion in Schichten (Stufen 4–6).**
- Vier feste Schichten im 4/4:

  | Schicht | Bewegung | Klang | Rhythmus |
  |---|---|---|---|
  | **Stampfen** | Fuß auf den Boden | `kick` | 1 und 3 |
  | **Patschen** | Hände auf die Oberschenkel | `hat`, dunkler, eigener Pegel | alle Achtel |
  | **Klatschen** | Hände zusammen | `clap` | 2 und 4 |
  | **Schnipsen** | mit den Fingern | `rim` | die „und“ von 2 und 4 |

  Ab Stufe 6 ist statt Schnipsen ein gelernter Kurs-Rhythmus möglich.
- Ablauf: Die App spielt drei Schichten, du übernimmst die vierte. Nach
  4 bzw. 8 Takten wechselt die Rolle; die App sagt die neue Schicht einen
  Takt vorher an (Text plus kurzer Ansage-Klang, kein Countdown).
- Bewertet werden nur die Schichten **Klatschen** und **Schnipsen** (hell,
  übers Mikrofon zuverlässig erkennbar) bzw. jede Schicht beim Tippen. Beim
  Mikrofon gelten Stampfen und Patschen als „Mitmachen“ ohne Wertung, mit
  ehrlicher Begründung im Text: „Stampfen hört das Handy nicht zuverlässig.“

| Stufe | Deine Schicht | Länge |
|---|---|---|
| 4 | immer Klatschen | 4 Takte |
| 5 | Wechsel Klatschen ↔ Schnipsen | 8 Takte |
| 6 | Wechsel durch alle vier | 8 Takte je Schicht |

- **Probenmodus** als Schalter: Alle vier Schichten laufen in Schleife, jede
  Schicht ist einer Chorstimme zugeordnet (Bass stampft, Tenor patscht, Alt
  klatscht, Sopran schnipst; per Antippen änderbar). Tempo ist über die
  vorhandene Tempo-Bedienung einstellbar (wie bei `downbeat`), es gibt keine
  Bewertung und kein Mikrofon. Die Anzeige in der Bühne zeigt je Stimme groß
  ihre Schicht, lesbar auf einem Beamer. Gedacht für den Chorleiter in der
  Probe.

**11c – Sprechen und steppen (optional, nur wenn 11a/11b sauber sind).**
- Ablauf: Kurze **selbst ausgedachte** Textzeilen werden auf einen Rhythmus
  gesprochen, dazu läuft der Step. Keine Liedtexte aus dem Repertoire
  übernehmen (Urheberrecht).
- Material: 6–8 Zeilen, die die Rhythmen aus Kapitel 2–4 abdecken (Achtel,
  Offbeat, Synkope, Sechzehntel), etwa „Heu-te ge-hen wir noch weg“ mit den
  Silben auf den Kurs-Rhythmus gelegt. Silben werden angezeigt, Noten nicht.
- Bewertung über die Mikrofon-Einsatzerkennung (`makeOnsetDetector`). Zuerst
  mit einer Simulation prüfen, ob gesprochene Silben verlässlich als Einsätze
  erkannt werden. Wenn nicht: 11c ohne Bewertung als „Mitsprechen“ anbieten
  und im Bericht begründen. Den Detektor dafür nicht verändern.

**Tests.**
- Fuß-Bassdrum: Das Kick-Raster liegt in jedem Takt auf allen Vierteln; die
  Stille in Stufe 3 beginnt genau nach Takt 2.
- Schichten: Die vier Raster stimmen (Ticks), Rollenwechsel genau nach
  4 bzw. 8 Takten, die Ansage einen Takt vorher.
- Bewertung: Die eigene Schicht ergibt die erwarteten Soll-Zeitpunkte für
  `judgeHold`. Mit Mikrofon werden Stampfen/Patschen nicht gewertet.
- Ring: Ein frischer Stand ohne gespielten `body` ändert den Ring der
  Rhythmus-Kachel nicht.
- Einbindung: Zeile in der Rhythmus-Übersicht vorhanden, Modusname, Icon und
  Kurztext gesetzt (analog zum Test „Einsatz: nicht im Rhythmus-Bereich
  eingebunden“, Z. ~14498). Gerüst-Positionen wie bei `downbeat`.

### Paket 12 – Einsätze nach Pausen (`uebe-lab.html`)

**Warum.** Im Chor wackelt es fast nie mitten in der Phrase, sondern am
Einsatz nach einer Pause: Die Band spielt weiter, der Chor muss pünktlich
wieder rein, oft mit einem Auftakt vor der Eins.

**Schon erledigt (Redesign, `3413ae5`):** Auftakt-Lektionen lassen sich in
den Klatsch-Grooves durchhalten; jede Wiederholung beginnt wieder mit dem
Auftakt. Daran nichts ändern. **Abgrenzung zu „Einsatz finden“**
(`downbeat`): Dort sucht man die Eins in einem eingeblendeten Groove. Hier
weiß man, wo die Eins ist, und übt den pünktlichen Wiedereinstieg nach
einer Pause.

**12a – Einsätze in den Klatsch-Grooves sichtbar machen (klein).**
- Für Auftakt-Lektionen nach dem Durchhalten-Lauf eine zusätzliche Zeile im
  Ergebnis: „Einsätze: 3 von 4 pünktlich“, dazu die Tendenz in Worten
  (früh / genau / spät).
- Ist die Tendenz „spät“, folgt der Tipp: „Atme in der Pause schon vor dem
  Auftakt ein.“
- Gemessen wird die erste Note jeder Wiederholung. `judgeHold` liefert je
  Takt nur Mittelwerte (`bars: [{ expected, hit, meanOffset, … }]`). Die
  Einsätze daher in einer kleinen eigenen Funktion aus den Soll-Zeitpunkten
  und den Tipps zuordnen, mit demselben Fenster und derselben Latenz.
  `judgeHold` selbst nicht ändern; es steht wortgleich in `licks.html`.

**12b – Neuer Modus „Wieder einsetzen“.**
- **Einbindung wie in Paket 11** (Vorbild `downbeat`): eigene Zeile in der
  Rhythmus-Übersicht und eigene Ansicht, dazu Gerüst, Klatschfläche, Hilfen
  und Auflösung Takt für Takt.
  - Modus-ID `entries`, Anzeigename „Wieder einsetzen“ (nicht „Einsätze“,
    um die Verwechslung mit „Einsatz finden“ zu vermeiden).
  - Kurztext: „Nach der Pause pünktlich wieder rein“.
  - Fortschrittsbereich `entries` in der Gruppe `rhythm`, Ring-Regel wie in
    Paket 11.
- Ablauf einer Runde:
  - Die App spielt einen Groove über 8–16 Takte, darin wiederholt sich eine
    kurze Phrase mit Pausen dazwischen.
  - Erst einmal vorhören (Phase „Hören“), dann selbst (Phase „Du“).
  - Eingabe wie im Rhythmus-Bereich: Tippen, Klatschen übers Mikrofon oder
    ein gesungenes/gesprochenes „da“ (dieselbe Einsatzerkennung).
- Einsatz-Katalog, jeweils als kurze Phrase von 1–2 Takten:

  | ID | Einsatz | Typisch für |
  |---|---|---|
  | `und4` | auf „4 und“ vor der 1 | der klassische Pop-Auftakt |
  | `a4` | auf „4 a“ (Sechzehntel vor der 1) | Hooks knapp vor dem Schlag |
  | `zwei` | auf der 2 nach leerer 1 | Phrasen nach einem Atemschlag |
  | `drei8` | drei Achtel vor der 1 („3-und, 4, 4-und“) | längere Auftakte |
  | `eins` | genau auf der 1 nach Pause | Kontrolle: nicht zu früh |

- Stufen:

  | Stufe | Einsätze | Pause zwischen den Phrasen | Begleitung |
  |---|---|---|---|
  | 1 | `und4` | 1 Takt | voller Groove |
  | 2 | `und4`, `eins` | 1–2 Takte | voller Groove |
  | 3 | dazu `zwei`, `a4` | 1–2 Takte | voller Groove |
  | 4 | dazu `drei8` | 2–4 Takte | Groove, im Takt vor dem Einsatz nur Snare |
  | 5 | alle, zufällig | 2–4 Takte | nur Snare auf 2 und 4 |
  | 6 | alle, zufällig | 4–8 Takte | Groove, der Takt vor dem Einsatz still |

  Die Pausen sind nie ganz still über mehrere Takte, denn im Song spielt die
  Band weiter. Geübt wird der Einsatz, nicht das Zählen im Leeren; das tun
  schon die Klatsch-Grooves.
- **Atem-Marke**:
  - Im Vorspiel atmet die App hörbar: ein leises, kurzes Rauschen über
    `engine.burst` (Tiefpass, ca. 250 ms), einen Schlag vor dem Auftakt.
  - In Stufe 1 und 2 zeigt die Bühne beim eigenen Durchgang zusätzlich einen
    Schlag vor dem Einsatz das Wort „Atmen“, ohne Laufmarke und ohne Noten.
    Ab Stufe 3 nicht mehr.
  - Bei `prefers-reduced-motion` nur Text, keine Animation.
- **Bewertung**:
  - Je Einsatz die Abweichung der ersten Note.
  - Trefferfenster `toleranceFor` wie im Rhythmus-Bereich (Z. ~2738), mit der
    gespeicherten Latenzkalibrierung.
  - Die übrigen Noten der Phrase zählen nur als „mitgeklatscht ja/nein“.
  - Runde geschafft, wenn mindestens 80 % der Einsätze im Fenster liegen.
- **Rückmeldung** (im Ergebnis, nicht während „Du“):
  - getrennt nach „zu früh / pünktlich / zu spät“, als Tendenz in Worten
    ohne ms (Redesign),
  - dazu ein Satz Tipp: zu spät → früher einatmen; zu früh → „Die Pause
    ganz aussitzen, innerlich weiterzählen“,
  - Auflösung Takt für Takt wie bei `downbeat`, mit Einsatz grün bzw.
    gestrichelt rot.
- **Gespeicherter Stand**: Stufe und eine kleine Fehlerstatistik je
  Einsatz-ID (für gewichtetes Ziehen wie `pickInterval`). Neue Felder
  optional, `restore` übernimmt nur gültige Werte.

**Tests.**
- 12a:
  - Für jede Auftakt-Lektion wird je Wiederholung genau ein Einsatz gezählt.
  - Simulierte Tipper mit +60 ms ergeben die Tendenz „spät“ und den Atem-Tipp.
- 12b:
  - Jede Einsatz-ID ergibt die richtigen Ticks, z. B. `a4` = Tick 45 im
    vorigen Takt, `drei8` = Ticks 30/36/42 im vorigen Takt.
  - Die Pausenlänge liegt im Bereich der Stufe.
  - Stufe 6: Der Takt vor dem Einsatz ist still.
  - Simulierte Tipper mit +60 ms ergeben „zu spät“.
  - Einbindung und Gerüst wie in Paket 11 geprüft.
- `README.md`: die neuen Übungen „Körper“ und „Wieder einsetzen“ in der
  Dateiübersicht von `uebe-lab.html` ergänzen.

---

## 4. Wenn ein Paket nicht sauber klappt

Paket zurücksetzen (`git restore`/`git reset` nur auf eigene, ungepushte
Änderungen), im Bericht mit Grund vermerken, mit dem nächsten Paket
weitermachen. Alle Pakete sind unabhängig voneinander. Einzige Ausnahme:
Paket 9 setzt Paket 8 voraus (gemeinsamer Tool-Stand). 12a und 12b sind
unabhängig voneinander. Die Pakete 11 und 12 sind Erweiterungen: erst nach
den Korrekturen 1–8 und 10 angehen.

## 5. Abschluss

`BERICHT-UEBE-KORREKTUREN.md` anlegen, Aufbau wie `BERICHT-UMSETZUNG.md`
(Paket / Status / Commit / SW_VERSION / Tests mit Zahlen, Abweichungen,
Beobachtungen). PR gegen die Basis aus Abschnitt 0 öffnen (`main` oder den
Redesign-Branch).

Unter „Manuell auf echten Geräten prüfen“ mindestens:
- Intonation Stufe 5/6: Klingt der Fangakkord jetzt schwebungsfrei? Ist
  die Verstimmung der markierten Stimme bei 10–15 Cent noch hörbar?
- Ton halten: Tenor/Bass ohne Stimmprofil, eine Oktave tiefer gesungen –
  wird es jetzt gewertet?
- „Meine Stimme“ mit Median: reagiert die Nadel noch schnell genug bei
  Tonwechseln?
- Einsingen „Kurz“ mehrmals starten: kommt der Ruf jetzt nur nach Twang?
- Licks in Sopran-Lage: klingt ein hochoktavierter Bass-Preset noch gut?
- Körper (11b) mit Mikrofon: werden Klatschen und Schnipsen zuverlässig
  erkannt, während das Handy die anderen Schichten über den Lautsprecher
  spielt?
- Wieder einsetzen (12b): ist das hörbare Atmen im Vorspiel als Atmen erkennbar
  oder klingt es wie Rauschen?

Unter „Zu entscheiden“ mindestens:
- Soll die Intonations-Erklärung (reine Terz) auch in „Singen → Tuner“
  auftauchen (Hinweis „im Akkord Terz etwas tiefer“)?
- Sollen beim Hochoktavieren von Basslicks automatisch ein Lead-Klang statt
  „Growl Bass“ gespielt werden?
- Soll der Probenmodus der Body-Percussion (11b) auch direkt von der
  Tools-Seite erreichbar sein (eigene Kachel unter „Werkzeuge“)?
- Sollen später echte Einsätze aus den Chorsongs (mit Textsilbe) in den
  Modus „Einsätze“ kommen? Dafür bräuchte es Rhythmusdaten je Song.
- Soll „1 e + a“ auch im Groove Lab gelten (dort derzeit „1 e + e“, in
  `strings.js` dreisprachig)?
