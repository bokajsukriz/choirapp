# Bericht: Umsetzung Musiktheorie-Review

Grundlage: `REVIEW-MUSIKTHEORIE.md` und `ARBEITSANWEISUNG-CLAUDE-CODE.md` (beide im
ersten Commit eingecheckt). Ausgangsstand `2547af7` (= `main` beim Start und
beim Abschluss). Alle 13 Pakete sind umgesetzt, keins wurde zurückgesetzt.

**Branch:** `claude/new-session-yeuolj` statt `musiktheorie-review`. Die
Sitzungsumgebung erlaubt nur Pushes auf diesen vorgegebenen Branch. Er zweigt
genau von `2547af7` ab, es gab keinen Rebase und keinen Merge von `main`.

**Konflikte mit main:** keine. `git diff --stat 2547af7 origin/main` ist leer,
`main` hat sich während des Laufs nicht bewegt.

## Status

| Paket | Inhalt | Status | Commit | SW_VERSION | Tests (Zahlen) |
|---|---|---|---|---|---|
| 1 | Texte und Namen | umgesetzt | `6bd7b8b` | v294 | STRINGS-Parität: 0 Abweichungen |
| 2 | Einsingen: Auftakt, Einstimmung, Atem, Einzähler, Tonnamen | umgesetzt | `fbcf8ac` | v295 | `einsingen.selfCheck()` = [] |
| 3 | Dur-Dominante in Moll + Test-Export | umgesetzt | `5ccfdb1` | v296 | Satz alt/neu: 900 gleich, 108 geändert (= 9 Folgen × 12 Tonarten in Moll), 0 unerwartet |
| 4 | Modus-Bindung und Zufall | umgesetzt | `dceaecd` | v297 | 1000× `randomize()`: 0 Folgen außerhalb von `modes` |
| 5 | Groove-Inhalte und Arp | umgesetzt | `3f936d9` | v298 | C7/F7/G7, Blue Note, Arp 3+1 / 6+2, keine Note außerhalb der Tonart (mit Ausnahmen) |
| 6 | Tonnamen und Stimmumfänge | umgesetzt | `320682a` | v299 | 30 SPELL_CASES grün; 500 Aufgaben: Bass immer 40–51 |
| 7 | Stimmführung voiceChord | umgesetzt | `df88eb2` | v300 | Wechsel mit Parallelen 651 → **0** (von 4 320), Leittonverdopplung 53 → **0**, Rückfälle 0 |
| 8 | Ausbildung: Akkorde, Stufen, Intervalle | umgesetzt | `0327244` | v301 | Parallelen 97/768 → **0**; kein Quartsextakkord außer Kadenz, kein vii° in Grundstellung |
| 9 | Aufnahme tonartrelativ | umgesetzt | `03d732e` | v302 | 2-Takt-Aufnahme über `pop`: Takt 3/4 = Takt 1/2 (gleiche MIDI-Töne) |
| 10 | Einsingen: Moll und neue Übungen | umgesetzt | `69149a6` | v303 | alle Übungen × Stimmen im Umfang; Akkord-Satz ohne Parallelen |
| 11 | Stimm-Tuner | umgesetzt | `a1aafad` | v304 | synthetisch: 440 Hz ≤ 2 Cent, +20 Cent → 18…22, Vibrato ±50 Cent → ≤ 10 Cent, 110 / 82,4 Hz ≤ 3 Cent, Kammerton 443 ✓ |
| 12 | Tempo-Bezug, Rhythmus, Metronom, Piano | umgesetzt | `e08b9d5` | v305 | 6/8 ♩. = 60 → Achtel 0,333 s in allen drei Tools; Umrechnungen hin und zurück ohne Drift; Fenster bei 200 BPM überlappen nicht |
| 13 | Gemeinsame Harmonik-Quelle | umgesetzt | `8ab892d` | v306 | Vorher/Nachher über alle Tools **byte-identisch** |

Jedes Paket wurde vor dem Commit so geprüft:
- `node --check` für alle geänderten `.js`-Dateien und für die Inline-Skripte der HTML-Seiten.
- Node-Prüfskripte unter `/tmp`, nicht committet.
- Headless-Chromium (Playwright war vorinstalliert, nichts nachinstalliert): `chorApp.selfTest()`, `chorApp.selfTestAsync()`, `chorApp.selfTestMusic()` und die `selfCheck()`-Funktionen der Tools. Alle liefern `[]`.

## Je Paket

### 1 – Texte und Namen
- **Dateien:** `strings.js`, `uebe-lab.html`, `einsingen.html`
- **Geändert:** Pachelbel-Text (DE/EN/PL), „Halbschluss-Runde“ (Name und Info), Ausbildung „Grundkadenz“ und „Halbschluss-Runde“, „Fünftonraum“.
- **Beobachtung, nicht umgesetzt:** Die Ausbildungsfolge `m3` („Moll-Kadenz in drei“, i–iv–V) ist ebenfalls eine Halbschluss-Runde. Der Name blieb, weil er nicht im Paket stand.

### 2 – Einsingen
- **Datei:** `einsingen.html`
- **Katze:** `delay: 2`. „Kat“, „tritt“, „Trep“ und „krumm“ liegen jetzt auf den Zählzeiten, bei beiden Einstimmungen.
- **Einstimmung:** Wahl zwischen Akkord und Kadenz. Die Kadenz ist I–V7–I über einen Takt und kommt nur in der ersten Runde.
- **Atempause:** `breath` je Übung; Lippenflattern, Koloratur und Oktavsprung haben 8 Sechzehntel.
- **Einzähler:** aus, zu Beginn oder jede Runde. Ein gespeicherter Boolean wird umgerechnet (`true` → Beginn, `false` → aus).
- **Tonnamen:** tonartabhängig.
- **Abweichung:** „Einzähler je Runde“ klickt auf den beiden Schlägen direkt vor dem Einsatz. Bei der Akkord-Einstimmung (CUE = 8) sind das Zz. 1 und 2 des Akkords. Das Review nannte „Zz. 3 und 4“, gemeint relativ zu einem gedachten Einzähler.

### 3 – Dur-Dominante in Moll
- **Dateien:** `groove-lab.js`, `strings.js`, `app.js`
- **Neu:** `dominant` für die festgelegten 9 Folgen und `chordSteps()`. Satz, Bass, Arp, Melodie und Anzeige folgen dem Dur-Akkord (a-Moll: V = E–Gis–H).
- **Editor:** Schalter „Moll: Dur-Dominante“ (`progDominant`).
- **Tests:** Export `ChorGrooveLab._test`, Testblock `runMusicSelfTests()` in `app.js`, aufrufbar als `chorApp.selfTestMusic()`. Er läuft auch in `runAsyncSelfTests()` mit.

### 4 – Modus-Bindung
- **Dateien:** `groove-lab.js`, `strings.js`
- **Neu:** Feld `modes`. Wer eine Folge in einem unpassenden Modus wählt, bekommt den Modus automatisch umgestellt, mit Statuszeile.
- **Moduswechsel:** unpassende Folgen werden in der Auswahl und in der Anzeige markiert („passt nicht zum Modus“).
- **Zufall:** wählt nur noch passende Folgen. Die Infotexte sagen „nur in …“.

### 5 – Groove-Inhalte und Arp
- **Dateien:** `groove-lab.js`, `strings.js`, `app.js`
- **Blues:** `dom7` ergibt I7, IV7 und V7. Arp und Melodie spielen über die Mixolydisch-Leiter des Akkords.
- **Blue Third:** mit ♭3→3. Die Bedeutung von `alt` ist als Kommentar festgeschrieben, samt Ausnahme: über einer schon kleinen Terz bleibt der Ton die kleine Terz.
- **Beats:**
  - „Shuffle Roll“ (Index unverändert).
  - Swing Soul: Achtel-Hat und Achtel-Swing (`swingUnit: 8`).
  - Deep House: Hats auf Achteln, Open-Hat auf den Offbeats.
  - Waltz Step: Bass nur auf der Eins.
- **Arp:** Die Rhythmus-Zellen skalieren mit dem Tempo. Neue Option „Muster nach: Tonart / Akkord“ (`arpRef`).
- **Nebenbei nötig:** Eigene Folgen erben die Modus-Bindung der zuletzt gewählten Vorlage nicht mehr. Sonst würden sie nach Paket 4 fälschlich als „passt nicht“ markiert.

### 6 – Tonnamen und Stimmumfänge
- **Dateien:** alle vier Tools, `strings.js`, `app.js`
- **Tonnamen:** `spell`/`noteLabel` samt `SPELL_CASES`, zunächst als geprüft wortgleiche Kopie in jedem Tool. Paket 13 hat sie nach `harmony.js` herausgezogen.
- **Groove Lab:** Akkordnamen, Tonartwahl (Moll: Cis, Dis, Fis, Gis), Tonart-Tasten und SATB-Anzeige tonartabhängig.
- **Ausbildung:** „gis-Moll“, „Des-Dur“; Tuner in Helmholtz-Schreibweise.
- **Piano:** Helmholtz-Beschriftung; feste Solmisation mit Vorzeichen, Knopf „Do Re Mi (fest)“.
- **Umfänge:** S 60–79, A 55–74, T 48–67, B 40–62. Bass der Ausbildung immer 40–51.
- **Klang:** 176 von 1 008 Groove-Satz-Kombinationen klingen anders, weil die Bass-Obergrenze von 60 auf 62 steigt. Das ist gewollt.
- **Neu:** `window.uebeLab.selfCheck()` und `window.piano.selfCheck()`.

### 7 – Stimmführung
- **Dateien:** `groove-lab.js`, `app.js`
- **Harte Regeln:** Quint- und Oktavparallelen sowie Leittonverdopplung sind ausgeschlossen. Der Leitton gilt nur in Akkorden mit Dominantfunktion.
- **Weiche Regeln:** verdeckte Parallelen, nicht aufgelöster Leitton im Sopran, fehlende Töne. Verminderte Akkorde stehen als Sextakkord.
- **Rückfall:** Findet sich keine regelkonforme Lage, gilt die bisherige beste Lage; die Fälle werden gezählt. Die Existenzprüfung ergab **0 Wechsel ohne regelkonforme Lösung**.
- **Abweichung:** Das Zwei-Durchlauf-Schema reichte nicht. Der Satz wandert von Durchlauf zu Durchlauf, sodass am Übergang Ende → Anfang 74 bzw. 42 Parallelen blieben. Jetzt wird bis zum Fixpunkt iteriert (höchstens 6 Durchläufe) und danach der letzte Akkord mit Blick auf den ersten gesetzt. Ergebnis: 0.

### 8 – Ausbildung
- **Datei:** `uebe-lab.html`
- **Umkehrungen:** „stilgerecht“ statt „zufällig“; ein gespeichertes `random` wird zu `style`.
- **Neue Symbole:** V7, I64, iv6, IV65, angezeigt als V⁷, I⁶₄, iv⁶, IV⁶₅.
- **Neue Folgen:** `v7`, `k64`, `phryg`, `ajoutee`.
- **Stufen:** kumulativ über `add`.
- **Intervalle:** Stufen plus eine Reihe „Vergleichen“; Gewichtung nach den Fehlern der letzten 10 Antworten.
- **Satz:** ohne Parallelen, auch in weiter Lage.

### 9 – Aufnahme tonartrelativ
- **Datei:** `groove-lab.js`
- **Neu:** `ref: 'key'` in der Bibliothek und im Zustand (`melodyRef`). Die Aufnahme wird nur als Ganzes in Oktaven verschoben; dafür gibt es einen erweiterten Bereich.
- **Rückwärtskompatibel:** Alte Melodien ohne `ref` klingen wie vorher.
- **Test:** reine Funktionen `recNotesToBars` und `melodyMidi`.
- **Nebenbei behoben:** Ein Ton genau auf der Taktgrenze fiel durch Fließkomma (15,999…) aus dem Raster. Das war auch vorher schon so.

### 10 – Einsingen: Moll und neue Übungen
- **Datei:** `einsingen.html`
- **Neu:**
  - Moll-Modus für Übungen („a-Moll“).
  - Moll-Fünfton und Moll-Dreiklang.
  - Atem: ohne Ton, ausatmen 8/10/12/14 Schläge.
  - An- und Abschwellen.
  - Akkord-Intonation mit dem vierstimmigen Satz aus Paket 7.
- **Programm „Ausführlich“:** Atem am Anfang, Moll-Fünfton nach der Vokalreihe.
- **Abweichung:** Die Atemübung heißt im Code `kind: 'breath'`, weil `breath` seit Paket 2 schon die Länge der Atempause ist.
- **Zwischenstand:** Bis Paket 13 lag der Satz hier als Kopie vor. Jetzt kommt er aus `harmony.js`.

### 11 – Stimm-Tuner
- **Datei:** `uebe-lab.html`
- **Anzeige:** Mittelwert über 0,35 s; die Verlaufslinie zeigt weiter die Rohwerte.
- **Tonumfang:** Toleranz 2 Halbtöne.
- **Kammerton:** 438–445 Hz, gespeichert. Gilt für die Tonerkennung und alle Klänge des Tools.
- **Test:** `tunerCheck()` mit synthetischen Signalen durch `detectPitch`.

### 12 – Tempo-Bezug, Rhythmus, Metronom, Piano
- **Dateien:** `metronom.html`, `uebe-lab.html`, `groove-lab.js`, `piano.html`, `app.js`
- **Tempo-Bezug:** in allen drei Tools gleich, mit Notenzeichen angezeigt.
  - Beim Taktwechsel bleibt die Achtel gleich schnell.
  - Das genaue Tempo wird mitgespeichert, sodass nichts durch Runden wandert.
  - Alte Stände werden beim Laden einmal umgerechnet (`tempoRef`).
- **Rhythmus:** Latenz einmessen, Mittelwert der letzten Runde übernehmbar; Trefferfenster-Untergrenze 35 ms.
- **Metronom:** Gruppierungen für 7/8 und 5/4, Klangstufen bei „Elektro“ und „Kuhglocke“, Tempo-Trainer nicht in Stummtakten; `window.metronom.selfCheck()`.
- **Piano:** Das Pedal ist beim Öffnen immer aus und wird nicht mehr gespeichert.
- **Altes Rhythmus-Training:** 6/8 zählte dort in Achteln, nicht in Vierteln. Die Umrechnung beim Laden berücksichtigt das: Achtel 92 → ♩. = 31.

### 13 – harmony.js
- **Dateien:** `harmony.js` (neu), `groove-lab.js`, `uebe-lab.html`, `einsingen.html`, `piano.html`, `app.js`, `sw.js`, `README.md`, `CLAUDE.md`
- **Inhalt von `harmony.js`:** Modi, Akkordbau, Tonnamen, Umfänge und Satz. Keine Kopien mehr in den Tools; `app.js` prüft das.
- **Laden:** `harmony.js` steht in `SHELL_OPTIONAL`. `app.js` lädt es vor dem Groove Lab, die Tool-Seiten per `<script src>`.
- **Abweichung:** Die Ausbildung behält ihren eigenen Satz-Algorithmus (enge Lage über festem Bass). Er liegt jetzt als `voiceUpperClose` in `harmony.js`. Hätte sie `voiceChord` aus dem Groove Lab übernommen, hätten sich die Ausgaben geändert, und die Anweisung verlangt identische Ausgaben.
- **Nicht verschoben:** `romanNumeral` und `chordName` bleiben im Groove Lab (Anzeige, i18n). `EAR_PROGRESSIONS` bleiben in der Ausbildung, wie vorgegeben.

## Morgens im Browser ausführen

Die Prüfungen liefen bereits headless in Chromium und lieferten `[]`. Zum Gegenprüfen auf einem echten Gerät:

1. App lokal starten (siehe README, z. B. `python3 -m http.server` im Repo), `http://localhost:8000/` öffnen.
2. In der Konsole der App:
   ```js
   chorApp.selfTest()          // → []
   await chorApp.selfTestAsync() // → [] (enthält die Musik-Tests)
   await chorApp.selfTestMusic() // → []
   ```
3. In der Konsole des jeweiligen Tool-iframes (Einstellungen → Tools öffnen, in den DevTools den Frame wählen) oder direkt die Seite öffnen:
   ```js
   einsingen.selfCheck()   // einsingen.html → []
   uebeLab.selfCheck()     // uebe-lab.html  → [] (inkl. Tuner- und Rhythmus-Prüfungen, ~1 s)
   metronom.selfCheck()    // metronom.html  → []
   piano.selfCheck()       // piano.html     → []
   ```
4. Nach dem Update prüfen, dass der Service Worker `v306` meldet und das Groove Lab offline öffnet (lädt `harmony.js` aus dem Cache).

## Hörtest-Checkliste

- [ ] Groove Lab: Grundkadenz und Andalusische Kadenz in a-Moll. Sie müssen mit E-Dur (gis) schließen.
- [ ] Groove Lab: Andalusische Kadenz in Dur wählen. Der Modus springt auf Moll, die Statuszeile meldet es.
- [ ] Groove Lab: Blues (C7/F7/G7), Blue Third (es→e), Swing Soul (Achtel-Swing), Deep House, Waltz Step (Bass nur auf 1).
- [ ] Groove Lab: Arp mit „punktiert“ bei 1/16 und bei 1/8 (klingen jetzt verschieden); Arp manuell „Muster nach: Akkord“ über F-Dur mit Taste E.
- [ ] Groove Lab: Pop und Pachelbel mit Chor-Stimmen (keine Parallelen, auch beim Loop-Übergang).
- [ ] Groove Lab: kurze Phrase einspielen (2 Takte), über eine 4-Akkord-Folge loopen. Beide Durchläufe klingen gleich.
- [ ] Einsingen: Katze (betonte Silben auf den Schlägen), Einstimmung „Kadenz“, Atempause beim Lippenflattern, Einzähler „jede Runde“.
- [ ] Einsingen: Atem, Moll-Fünfton, Moll-Dreiklang, An- und Abschwellen, Akkord (je Stimme einmal).
- [ ] Ausbildung: Stufe 1–6 je eine Aufgabe; phrygischer Halbschluss; Kadenz mit Quartsextvorhalt.
- [ ] Tuner: gerader Ton und Ton mit Vibrato (Nadel ruhig); Kammerton 442/443 einstellen und „Anspielen“.
- [ ] Rhythmus: Latenz einmessen (mit Bluetooth-Kopfhörer), danach eine Runde klatschen.
- [ ] 6/8 in Metronom, Rhythmus-Training und Groove Lab nebeneinander bei ♩. = 60 (Achtel gleich schnell).
- [ ] Metronom: 7/8 mit 2+3+2 und 3+2+2; Klang „Elektro“ und „Kuhglocke“ mit mittlerer Betonung; Tempo-Trainer mit Stummtakten.
- [ ] Piano: nach erneutem Öffnen ist das Pedal aus; Beschriftung C D E (Helmholtz) und Do Re Mi (fest).

## Zu entscheiden

Stellen, an denen ich ohne Rückfrage gewählt habe. Standard war jeweils die Variante, die näher am bestehenden Verhalten liegt.

**Paket 3**
- Die Dur-Dominante gilt nur in **Moll**. Die Vorgabe in `chordSteps` lautete „modeId !== 'major'“, die Entscheidungstabelle sagt aber: Dorisch und Mixolydisch haben keinen Leitton. Dort bleibt deshalb v.
- Alte bearbeitete Vorlagen ohne `progDominant` erben die Einstellung der Vorlage. Eigene und neue Folgen bekommen `false`.

**Paket 5**
- Swing Soul setzt beim Wählen den Swing-Regler auf 60 %. Beim Achtel-Swing werden die Sechzehntel dazwischen anteilig mitverschoben.
- Deep House: geschlossene Hat auf allen Achteln plus Open-Hat auf den Offbeats, wörtlich aus dem Review. Auf 2/6/10/14 klingen dadurch beide gleichzeitig. Alternative: geschlossene Hat nur auf den Zählzeiten.
- Arp im Akkord: Bei Gleichstand wird auf den tieferen Akkordton gerundet. Die Muster-Stufen 2/4/6 bedeuten „nächster Akkordton“, 7 die Oktave.
- Blues ist `sevenths: true` plus `dom7: true`. Ein bearbeiteter Blues mit ausgeschaltetem Septakkorde-Schalter spielt Dreiklänge. `dom7` hat keinen eigenen Schalter im Editor, wird aber für eigene Folgen mitgespeichert.

**Paket 6**
- C-Dur und a-Moll gelten als ♯-Tonarten (chromatisch Ais statt B), wörtlich nach „alle anderen ♯“.
- In Moll steht der Leitton immer mit ♯. Das ist eine Ergänzung: sonst hieße die Dominante in d-Moll A–Des–E.
- Dorisch und Mixolydisch werden nach ihrer Dur-Paralleltonart geschrieben.
- Die Paralleltabelle würde es-Moll nennen, die Entscheidung verlangt dis-Moll. Umgesetzt ist dis-Moll.
- Polnisch schreibt wie Deutsch (H, B, Cis, Es).
- Das Groove Lab zeigt weiter „C Moll“ im bisherigen Format, nicht „c-Moll“.
- Piano: Tasten außer C in der Groß-/Kleinschreibung ihrer Oktave (H, c, d …).

**Paket 7**
- Die Bassbewegung zählt mit Gewicht 0,5 in die Bewertung. Der Bass ist nicht mehr fest „der nächste Grundton“.
- Alle verminderten Akkorde stehen als Sextakkord, auch ii° in Moll.

**Paket 8**
- `k64` und `ajoutee` liegen wie im Review in Stufe 4, zusammen mit Moll. Das widerspricht „eine neue Schwierigkeit je Stufe“; Alternative wäre Stufe 3 bzw. 6.
- vii° und ii° stehen auch bei „Grundstellung“ als Sextakkord.
- Die Intervall-Fehlerstatistik gilt nur für die Sitzung und wird nicht gespeichert.
- Neue Standard-Intervalle sind [2, 4, 7, 12]; gespeicherte Auswahlen bleiben.
- Die weite Lage wird jetzt direkt bei der Suche berücksichtigt statt nachträglich umgeformt. Das klingt etwas anders.

**Paket 10**
- Akkord-Übung: Die Begleitung spielt beim gehaltenen Ton Grundton und Quinte, bei der Kadenz den ganzen Satz, auch ohne „Melodie“.
- Die Runden der Atemübung werden nicht auf ganze Takte aufgerundet.

**Paket 11**
- Glättungsfenster 0,35 s statt „~300 ms“. Mit 300 ms bliebe ein 5-Hz-Vibrato von ±50 Cent als ±10,6 Cent Schwankung stehen.

**Paket 12**
- Die Tempobezeichnung kommt wörtlich vom Bezugsschlag. In 7/8 heißt ♪ = 240 dann „Prestissimo“; musikalisch wäre dort die Viertel sinnvoller.
- BPM-Untergrenze im Rhythmus-Training und im Groove Lab ist jetzt 30 statt 40. Sonst würden alte langsame 6/8-Stände schneller.
- Das Trainer-Ziel im Metronom wird beim Taktwechsel mit umgerechnet.
- Der Metronom-Knopf in der App zeigt die Zahl im Bezugsschlag.

## Neue Beobachtungen (nicht umgesetzt)

- Der große Melodie-Editor im Groove Lab zeigt nur die Stufen −7…13. Tonartbezogene Aufnahmen mit Tönen im erweiterten Bereich (bis −14 bzw. 20) sind dort nicht vollständig sichtbar und bearbeitbar.
- „Ganze Folge“ als Aufnahmelänge (Alternative aus Befund 16) ist nicht umgesetzt.
- `hymn` (Choral-Schluss I–ii–V–I) behält ii in Grundstellung. Die stilgerechte Variante bietet jetzt `ajoutee`.
- Ausbildung `m3` („Moll-Kadenz in drei“) ist eine Halbschluss-Runde, siehe Paket 1.
- Offene Geschmackspunkte laut Entscheidungstabelle bewusst nicht umgesetzt: 11 (Avoid Notes), 39 (Arp-Triolen), 46 (Starttonart Einsingen), 54 (Notation).
