# Arbeitsanweisung für Claude Code – Umbau Tools-Reiter, Einsingen, Ausbildung

Du bist erfahrener Frontend-Entwickler mit Gespür für einfache, ruhige
Oberflächen und kennst dich mit Chorarbeit aus. Du baust die Übe-Bereiche der
App so um, dass sie ohne Nachdenken bedienbar sind: weniger Doppelungen, keine
Pillen-Reihen übereinander, jede Übung mit Icon und einem Satz, der sagt, was
man tun soll.

Antworte und kommentiere auf Deutsch.

**Stelle keine Fragen und warte auf keine Freigabe.** Alle Entscheidungen sind
unten getroffen. Wo trotzdem etwas unklar ist: die konservativste Variante
wählen (weniger ändern, bestehendes Verhalten erhalten), im Bericht begründen,
weitermachen.

---

## 0. Vorbereitung

1. `git fetch origin`, dann Branch `umbau-tools` von
   `origin/claude/new-session-65ax3p` (Stand `3718b3f`) anlegen. Nie auf
   `main` committen, nie mergen, nie force-pushen.
2. `CLAUDE.md` und `README.md` vollständig lesen. Danach im Code lesen:
   Tools-Reiter in `index.html` (`#view-tools`), `QUICK_STARTS`,
   `renderQuickStart`, `renderWeek`, `openToolFrame`, `PROGRESS_GROUPS` in
   `app.js`; in `einsingen.html` `GROUPS`, `EXERCISES`, `PROGRAMS`,
   `parseQuickParams`/`applyQuickParams`, `fitted`, die Stage und
   `.contour`; in `uebe-lab.html` Tab-Leiste, `MODES`, `EAR_MODES`,
   `SING_MODES`, `levelControlHtml`, `QUICK_CHAINS`, `parseQuickParams`.
3. Diese Datei im ersten Commit unter `ARBEITSANWEISUNG-UMBAU-TOOLS.md`
   mit einchecken.

## 1. Feste Regeln (gelten für jedes Paket)

- **Ein Paket = ein Commit**, danach sofort `git push -u origin umbau-tools`.
- **SW_VERSION** in `sw.js` bei jedem Commit um eins erhöhen (Stand `v316`).
  Vor dem Commit `git diff --cached --stat` gegen die Liste in `CLAUDE.md`
  prüfen.
- **Keine IDs ändern** (`EXERCISES`, `PROGRAMS`, Modus-IDs in `MODES`,
  `EAR_MODES`, `SING_MODES`, Einstellungs-Schlüssel, Fortschritts-Bereiche).
  Keine Reihenfolge in gespeicherten Listen ändern.
- **Gespeicherte Zustände:** neue Felder optional mit Standardwert, die
  `sanitize…`-Funktionen reichen sie durch, unbekannte Werte fallen auf den
  Standard zurück. `DATA_VERSION` in `app.js` nicht anfassen – es ändert sich
  keine Bedeutung gespeicherter Daten.
- **Texte:** Alles, was in `index.html`/`app.js` sichtbar ist, über
  `strings.js` in DE, EN und PL gemeinsam. `einsingen.html` und
  `uebe-lab.html` sind nur deutsch. Nicht mehr benutzte Schlüssel in
  `strings.js` entfernen (in allen drei Sprachen).
- **Icons** sind Inline-SVG im Stil der bestehenden Kacheln: `viewBox="0 0 24 24"`,
  `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`, runde Enden
  und Ecken, höchstens etwa sechs Pfade, klar erkennbar bei 20 px. Keine
  Icon-Bibliothek, keine Bilddateien.
- **Keine neuen Abhängigkeiten, kein Build-Schritt.**
- **Barrierefreiheit:** Tippflächen mindestens 44 px hoch; Icons
  `aria-hidden="true"`, der Text trägt die Bedeutung; Listen mit echten
  `<button>`-Elementen; `prefers-reduced-motion` respektieren.
- **Selbsttests:** Jedes Paket ergänzt die jeweiligen `runSelfTests`
  (`app.js`, `einsingen.html`, `uebe-lab.html`). Bestehende Tests dürfen nur
  angepasst werden, wo sie genau das geänderte Verhalten prüfen – im Bericht
  auflisten.
- **Nur umsetzen, was im Paket steht.** Was dir unterwegs auffällt, kommt in
  den Bericht unter „Beobachtungen“.

## 2. Entscheidungen (verbindlich)

- Der Tools-Reiter hat künftig drei Zonen: breite Einsingen-Kachel, Zeile
  „Üben“ mit Rhythmus/Hören/Singen, Zeile „Werkzeuge“ mit Metronom, Piano,
  Groove Lab, Lichtshow. Darunter die bestehende Einstellungen-Kachel.
- Die Karte „Schnell üben“ und die Kacheln „Einsingen“ und „Ausbildung“
  entfallen.
- „Dein Stand“ bleibt, zeigt aber nur noch die Wochenpunkte und die
  Einsing-Minuten. Die Stufen-Strahlen je Bereich entfallen dort, weil die
  Stufe auf den Üben-Kacheln steht.
- Kurz/Lang starten das Programm direkt in einem Vollbild-Spielmodus.
  „Mehr“ öffnet die Übersicht aller Programme und Übungen.
- Rhythmus/Hören/Singen öffnen `uebe-lab.html` direkt im jeweiligen Bereich,
  ohne Tab-Leiste. Im Bereich gibt es statt Pillen eine Liste der
  Übungsarten; die Stufe wird im Übungsbildschirm mit einem Stepper gewählt.
- Alte Aufrufe bleiben lauffähig: `einsingen.html?from=quick&minutes=5|10`
  und `uebe-lab.html?from=quick&tab=ear|voice` verhalten sich wie bisher
  (Gesamtdauer bzw. gemischte Kette). Direkt geöffnete Seiten ohne Parameter
  zeigen die neue Übersicht.

---

## 3. Pakete

### Paket 1 – Einsingen: Icons, Kurzanleitungen, Gruppenfarben (Daten)

In `einsingen.html`:

1. Jede Übung in `EXERCISES` bekommt zwei neue Felder:
   - `how`: ein Satz im Imperativ, höchstens 55 Zeichen, Wortlaut exakt aus
     der Tabelle unten.
   - `icon`: Schlüssel in ein neues Objekt `ICONS` (Schlüssel = Übungs-ID),
     das den SVG-Inhalt (nur die Pfade, ohne `<svg>`-Hülle) enthält. Eine
     Hilfsfunktion `iconSvg(id, size)` baut daraus das vollständige SVG.
2. Jede Gruppe in `GROUPS` bekommt eine Farbe. Umsetzung als CSS-Variablen
   `--g-koerper`, `--g-lockern`, `--g-resonanz`, `--g-beweglich`,
   `--g-hoehe` (je Grund- und helle Flächenfarbe, z. B. `--g-lockern` und
   `--g-lockern-bg`). Farben ruhig und unterscheidbar, passend zur
   bestehenden Palette mit Akzent `#F868B0`: Körper grau-violett, Lockern
   türkis, Resonanz rosa (Akzent), Beweglichkeit orange, Höhe/Tiefe blau.
   Text auf Flächenfarbe mindestens Kontrast 4.5:1.
3. Moll-Varianten (`moll5`, `mollDreiklang`) nutzen das Icon ihrer
   Dur-Schwester plus eine kleine Mondsichel oben rechts. So bleibt die
   Verwandtschaft erkennbar.

| ID | Name | Icon-Motiv | `how` |
|---|---|---|---|
| dehnen | Strecken & Lockern | Strichfigur, beide Arme über dem Kopf | Strecken, ausschütteln, Schultern kreisen |
| haltung | Sängerhaltung | Strichfigur aufrecht, senkrechte Lotlinie daneben | Locker aufrecht stehen, ruhig atmen |
| kiefer | Kiefer & Gesicht | Gesicht im Profil, Kinn mit Pfeil nach unten | Kauen, massieren, gähnen – Kiefer lösen |
| atem | Atem | drei waagerechte, geschwungene Windlinien | Einatmen, dann lang auf „sss“ ausatmen |
| lippen | Lippenflattern | Lippenpaar mit zwei kurzen Zitterlinien davor | Lippen flattern lassen und dabei summen |
| summen | Summen | geschlossener Mund, zwei Schallbögen daneben | Mund zu, leise summen, bis es kribbelt |
| sirene | Sirene | glatter Bogen hinauf und wieder hinunter | Auf „ng“ hinauf und hinunter gleiten |
| zwerchfell | Zwerchfell-Staccato | Kreis (Bauch) mit drei kurzen Impulsstrichen | Kurze „ha“ – der Impuls kommt aus dem Bauch |
| strohhalm | Strohhalm | schräger Trinkhalm, kleine Welle an der Öffnung | Durch den Halm auf „u“ auf und ab gleiten |
| strohhalm5 | Strohhalm-Fünfton | schräger Trinkhalm, daneben drei Treppenstufen | Mit dem Halm fünf Töne hinauf und zurück |
| mimemamomu | Mi-me-ma-mo-mu | fünf Punkte als Dach (hinauf, hinunter) | Fünf Töne hinauf und zurück, Klang bleibt vorn |
| nja | Nja-nja-nja | breit grinsender Mund | Frech und hell, der Kiefer fällt locker |
| vokale | Vokalreihe | drei Mundformen nebeneinander: schmal, offen, rund | Alle Vokale auf einem Ton, Klang bleibt gleich |
| moll5 | Moll-Fünfton | Dach aus fünf Punkten + Mondsichel | Fünf Töne auf „no“, die Terz etwas tiefer |
| messa | An- und Abschwellen | Crescendo-Decrescendo-Gabel (‹›) | Ein Ton: leise, lauter, wieder leise |
| akkord | Akkord | drei gestapelte Notenköpfe | Deinen Akkordton zum Klavier halten |
| umlaute | Umlaute | Mund mit zwei Punkten darüber (wie Ü) | Auf einem Ton: ni – nü – ne – nö – nä – na |
| durMoll | Dur und Moll | Kreis halb Sonne, halb Mondsichel | Große Terz, dann kleine – zum Liegeton |
| dreiklang | Dreiklang | drei Punkte in weiten Stufen, oben ein vierter | Dreiklang hinauf und hinab, federnd |
| mollDreiklang | Moll-Dreiklang | Dreiklang-Icon + Mondsichel | Dreiklang in Moll, kleine Terz hoch genug |
| katze | Die Katze tritt … | Katzenkopf mit Ohren und Schnurrhaaren | Konsonanten knackig, Vokale singen |
| koloratur | Koloratur | schnelle, enge Zickzacklinie | Neun Töne schnell und leicht auf „a“ |
| staccatoLegato | Staccato – Legato | Punkte aufwärts, Bogen abwärts | Hinauf kurz auf „ha“, hinunter gebunden |
| oktave | Oktavsprung | Sprungbogen mit Pfeilspitze nach oben | Mit „ja“ hinaufspringen, Tonleiter herab |
| eule | Eulenruf | Eulenkopf mit zwei großen runden Augen | Leichtes „hu“ oben, dann hinuntergleiten |
| kopfAbwaerts | Von oben | Treppe abwärts mit Pfeil | Tonleiter von oben, erster Ton ganz leicht |
| tiefe | Tiefe Lage | Pfeil nach unten auf eine Bodenlinie | Fünf Töne auf „mo“ abwärts, entspannt |
| tiefeGleiten | Tief gleiten | Kurve abwärts, endet waagerecht auf Bodenlinie | Auf „u“ eine Quinte hinab, unten halten |

Tests: Jede Übung hat `how` (1–55 Zeichen, endet ohne Punkt) und ein Icon in
`ICONS`; jede Gruppe hat eine Farbe; `iconSvg` liefert gültiges SVG mit
`aria-hidden`; die Zahl der Übungen ist unverändert 28.

### Paket 2 – Einsingen: Spielmodus im Vollbild

1. Neuer URL-Parameter `program=<id>` zusammen mit `from=quick`
   (`einsingen.html?from=quick&program=kurz`). Er wählt das Programm, nimmt
   dessen Länge aus `state.lengths` (also aus den Einstellungen „Länge
   Kurz/Ausführlich“) und öffnet den Spielmodus. Unbekannte IDs fallen auf
   `kurz` zurück. `minutes=` bleibt wie bisher unterstützt.
2. Spielmodus = Klasse `is-player` auf `<body>`. Dann ausgeblendet: Header,
   Tab-Leiste, Programm- und Übungs-Panel, Fußnote. Die Stage füllt die Höhe
   (`height: 100%`, Flex-Spalte, kein `100vh`). Oben links X (schließt den
   Spielmodus und zeigt die Übersicht), oben rechts das bestehende Zahnrad,
   dazwischen der Segmentbalken.
3. Inhalt der Stage im Spielmodus, von oben nach unten:
   - **Segmentbalken:** ein Segment je Übung im Programm; erledigt = volle
     Gruppenfarbe, aktuell = halbe Deckkraft plus Füllstand der Runden,
     kommend = Linienfarbe. Ersetzt im Spielmodus `.progress`.
   - **Icon** groß (64 px) auf Gruppen-Flächenfarbe, darunter Gruppenname
     klein in Gruppenfarbe, **Übungsname** groß, **`how`-Satz** gut lesbar
     (mindestens 17 px). Das ?-Symbol daneben öffnet wie bisher die lange
     Hilfe.
   - **Darstellung:** die bestehende `.contour`, deutlich größer. Für
     Übungen mit `glide: true` stattdessen eine SVG-Kurve durch die Zieltöne
     (Sirene, Strohhalm, Eulenruf, Tief gleiten), die aktuelle Position als
     Punkt, der mit der Audio-Uhr mitläuft. Körperübungen behalten
     `.body-stage` mit Ring.
   - **Meta-Zeile:** „Runde 2 von 3 · Es-Dur“.
   - **Vorschau:** „Gleich: [kleines Icon] Name“ und rechts „Überspringen ›“
     (nutzt die bestehende Skip-Aktion). Bei der letzten Übung: „Danach:
     fertig“.
   - Großer Play/Pause-Knopf wie bisher.
4. **Autostart:** Beim Öffnen per `program=` sofort `start(0)` versuchen.
   Bleibt der AudioContext `suspended` (fehlende Nutzergeste im iframe),
   statt Fehlermeldung einen großen Knopf „Tippen zum Starten“ über der
   Stage zeigen, der beim Antippen startet. Nie zweimal starten.
5. Am Ende: bestehende Fertig-Meldung, dazu zwei Knöpfe „Noch einmal“ und
   „Schließen“ (Schließen beendet das Tool über den bestehenden Weg zurück
   in die App).
6. Wake Lock wie bisher; beim Verlassen des Spielmodus freigeben.

Tests: `parseQuickParams` für `program=kurz`, `program=lang`,
`program=xyz` (→ kurz), `minutes=10` (alt), ohne Parameter (→ null);
Segmentzahl = Übungszahl des gefitteten Programms; Kurve nur bei `glide`;
Autostart ruft `start` höchstens einmal auf.

### Paket 3 – Einsingen: Übersicht „Mehr“ statt zwei Tabs

1. Die Tab-Leiste „Programm / Einzelne Übung“ entfällt. Ohne Spielmodus
   zeigt die Seite eine durchgehende Übersicht:
   - **Programme** als Karten: Name, `about`, Dauer, darunter eine Reihe
     kleiner Icons der enthaltenen Übungen (höchstens 8, sonst „+n“).
     Antippen startet das Programm im Spielmodus. Eigene Programme folgen
     danach, der bestehende Editor bleibt über den bisherigen Einstieg
     erreichbar.
   - **Einzelne Übungen** nach `GROUPS`, je Gruppe eine Überschrift in
     Gruppenfarbe, darunter Zeilen mit Icon, Name und `how`-Satz. Antippen
     startet die Übung im Spielmodus (Segmentbalken dann mit einem
     Segment).
2. Die Richtungs-Chips (`direction`) wandern ins Einstellungsblatt unter
   „Einzelne Übung: Richtung“. Wert und Speicherung unverändert.
3. `state.mode` bleibt als gespeichertes Feld erhalten und wird weiter
   gesetzt (program/single), damit alte Stände und der Fortschritt
   (`progressApi.add`) unverändert funktionieren.

Tests: Jede Übung erscheint genau einmal in der Übersicht; jedes Programm
(inkl. eigener) genau einmal; Richtungswert überlebt Speichern/Laden.

### Paket 4 – Ausbildung: Bereiche als Liste, Stufe als Stepper

In `uebe-lab.html`:

1. Neuer Parameter `tab=rhythm|ear|voice` **ohne** `from=quick`: öffnet den
   Bereich, blendet die Tab-Leiste aus und zeigt die Überschrift des
   Bereichs („Rhythmus“, „Hören“, „Singen“). Ohne Parameter bleibt die
   Tab-Leiste (direkter Aufruf). `from=quick&tab=…` startet wie bisher die
   gemischte Kette.
2. Jeder Bereich hat zwei Ansichten: **Liste** und **Übung**. Start ist
   immer die Liste.
   - Oben eine hervorgehobene Zeile **„Gemischt üben“** („Alle Übungsarten,
     ca. 10 Min.“), die die bestehende `QUICK_CHAINS`-Kette des Bereichs
     startet. Für Rhythmus entfällt sie (nur eine Kette pro Modus sinnvoll).
   - Darunter je Übungsart eine Zeile: Icon, Name, Satz aus der Tabelle,
     rechts „Stufe n/6“ bzw. „neu“ (aus dem gespeicherten Level des Modus).
   - Antippen öffnet die Übungsansicht dieses Modus. Oben ein Zurück-Pfeil
     „‹ Hören“ zur Liste.
3. Die Chip-Reihen `rmode`, `earMode`, `singMode` entfallen in der
   Übungsansicht; der gewählte Modus steht als Überschrift.
4. **Stufen-Stepper** statt sechs Stufen-Pillen: `levelControlHtml` erzeugt
   eine Zeile „‹  Stufe 3 · Dur oder Moll, zusammen  ›“. Die Knöpfe ‹ und ›
   behalten `data-level-area` und `data-level-n` (Zielstufe), damit der
   bestehende Klick-Handler unverändert greift. Bei Stufe 1 bzw. 6 ist der
   jeweilige Knopf ausgeblendet (nicht deaktiviert). Bei eigener Auswahl
   steht „Eigene Auswahl“ in der Mitte und ‹ › springen zu Stufe 1 bzw. 6.
   Der Hinweis „Stufe 3 sitzt – Stufe 4 ausprobieren?“ bleibt als Zeile
   darunter; der ›-Knopf bekommt dann den bestehenden Punkt (`has-dot`). Das
   ?-Symbol mit allen Stufen bleibt.
5. **Zweistimmig** (Rhythmus) steht immer in der Liste. Solange
   `duoAllowed()` falsch ist, rechts „ab Stufe 3“ statt Stufenangabe;
   Antippen öffnet den Modus trotzdem und zeigt dort den Hinweis, dass er ab
   Stufe 3 freigeschaltet ist, mit Knopf „Zu Stufe 3“.
6. **Singen:** Der Tuner-Block (Stimm-Tuner, Zielton, Tonumfang) ist die
   letzte Zeile der Liste („Tuner und Tonumfang“) und öffnet die bisherigen
   drei Panels als eigene Ansicht.
7. Zuletzt geöffneter Modus je Bereich wird wie bisher gespeichert, öffnet
   aber nicht automatisch – er ist in der Liste nur leicht hervorgehoben.

| Bereich | Modus-ID | Name | Icon-Motiv | Satz |
|---|---|---|---|---|
| Rhythmus | echo | Nachklatschen | Ohr, daneben eine Hand | Hören, dann nachklatschen – ohne Noten |
| Rhythmus | along | Mitklatschen | Note und Hand gleichzeitig | Noten lesen und gleichzeitig mitklatschen |
| Rhythmus | read | Vom Blatt | Notenblatt mit Klick-Strich | Nur Klick hören, Rhythmus selbst klatschen |
| Rhythmus | duo | Zweistimmig | zwei Notenzeilen übereinander | Die App klatscht eine Stimme, du die andere |
| Hören | interval | Intervalle | zwei Punkte mit senkrechtem Doppelpfeil | Zwei Töne – wie weit liegen sie auseinander? |
| Hören | quality | Klänge | drei gestapelte Balken | Ein Akkord – Dur, Moll oder etwas anderes? |
| Hören | cadence | Schlüsse | Fahne am Linienende | Wie endet die Phrase? |
| Hören | chords | Akkordfolgen | vier Balken nebeneinander, unterschiedlich hoch | Welche Akkordfolge hörst du? |
| Hören | parts | Stimmen | vier Linien, eine davon dicker | Welchen Ton singt deine Stimme im Klang? |
| Hören | tuning | Intonation | Zeiger über einer Skala | Sauber, zu hoch oder zu tief? |
| Singen | singInterval | Intervalle singen | Punkt, Pfeil nach oben zu zweitem Punkt | Ein Grundton – du singst das Intervall |
| Singen | findTone | Ton finden | Fadenkreuz | Akkord oder a′ – du findest deinen Ton |
| Singen | hold | Ton halten | lange waagerechte Linie mit Endpunkt | Einen Ton ruhig halten |
| Singen | sight | Blattsingen | Notenzeile mit Auge | Kurze Melodie vom Blatt singen |
| Singen | dictation | Diktat | Notenzeile mit Stift | Kurze Melodie hören und aufschreiben |
| Singen | tuner | Tuner und Tonumfang | Stimmgabel | Tonhöhe live sehen, Zielton, Tonumfang |

Tests: `tab=ear` ohne `from` blendet die Tab-Leiste aus und zeigt die Liste;
`from=quick&tab=ear` startet die Kette wie bisher; jeder Modus aus
`MODES`/`EAR_MODES`/`SING_MODES` erscheint genau einmal in seiner Liste;
Stepper: ‹ bei Stufe 1 und › bei Stufe 6 ausgeblendet, Klick auf › setzt
Stufe +1 über den alten Handler; Zweistimmig vor Stufe 3 sichtbar mit
„ab Stufe 3“.

### Paket 5 – Tools-Reiter neu

In `index.html`, `app.js`, `strings.js`:

1. **Einsingen-Kachel** (volle Breite) ersetzt Karte „Schnell üben“ und
   Kachel „Einsingen“: Icon links, „Einsingen“, darunter die Stimm-Zeile
   (bisher `#quick-voice`, Texte weiterverwenden). Darunter drei Knöpfe:
   **Kurz · n Min.**, **Lang · n Min.**, **Mehr ›**. Die Minuten liest
   `app.js` aus der Tool-Ablage von `einsingen` (`lengths.kurz/lang`),
   Standard 5/10. Kurz/Lang öffnen
   `einsingen.html?from=quick&program=kurz|lang`, Mehr öffnet
   `einsingen.html` ohne Parameter. `QUICK_STARTS` entsprechend umbauen.
2. **Zeile „Üben“:** drei gleich breite Kacheln Rhythmus, Hören, Singen
   (Icons: Hand/Finger, Ohr, Mikrofon), öffnen `uebe-lab.html?tab=rhythm|ear|voice`.
   Unter dem Namen der Stand: Stufe des zuletzt geübten Modus des Bereichs
   laut `chorProgress` (Bereiche nach `PROGRESS_GROUPS`) plus
   Sechs-Segment-Strahl im Stil von `.level-bar`. Ist der zuletzt geübte
   Modus nicht ermittelbar: höchste Stufe im Bereich. Nie geübt: „Neu“.
3. **Zeile „Werkzeuge“:** Metronom, Piano, Groove Lab, Lichtshow als
   kleinere Kacheln (2×2), IDs und Handler unverändert.
4. **„Dein Stand“** zeigt nur noch Wochenpunkte und die Zeile mit Tagen und
   Einsing-Minuten; `level-bars` entfallen. Karte steht unter „Werkzeuge“.
5. Kachel „Ausbildung“ (`#btn-open-playground`) entfällt samt Handler;
   bestehende Deep-Links, die `uebe-lab.html` ohne Parameter öffnen,
   bleiben funktionsfähig.
6. Neue und entfallene Texte in `strings.js` für DE, EN, PL
   (z. B. `tools.warmup.short`, `tools.warmup.long`, `tools.warmup.more`,
   `tools.practice.title`, `tools.tools.title`, `tools.area.new`).
7. Stände aktualisieren sich, wenn ein Tool geschlossen wird (dort wird
   `renderWeek` heute schon aufgerufen – die neue Render-Funktion der
   Kacheln daneben aufrufen).

Tests (`app.js`): `QUICK_STARTS` enthält `short`, `long`, `more` mit
richtigen URLs; Minutenanzeige fällt ohne Tool-Ablage auf 5/10 zurück; für
leere Fortschrittsdaten zeigen alle drei Üben-Kacheln „Neu“; für einen
Beispiel-Datensatz die erwartete Stufe.

---

## 4. Wenn ein Paket nicht sauber klappt

- Selbsttest rot und nach zwei ernsthaften Versuchen nicht grün: Paket
  zurücknehmen (`git restore`), im Bericht mit Ursache vermerken, mit dem
  nächsten Paket weitermachen. Paket 3 setzt Paket 2 voraus, Paket 5 setzt
  2 und 4 voraus – fällt eines davon aus, die abhängigen ebenfalls
  auslassen und das begründen.
- Ist ein Icon-Motiv bei 20 px nicht erkennbar: vereinfachen, nicht
  ersetzen; im Bericht erwähnen.

## 5. Abschluss

Lege `BERICHT-UMBAU-TOOLS.md` an und committe sie als letzten Commit:

- je Paket: erledigt / teilweise / ausgelassen, Commit-Hash, geänderte
  Dateien, neue Selbsttests;
- angepasste bestehende Tests mit Begründung;
- Liste der neuen und entfernten `strings.js`-Schlüssel;
- Abweichungen von dieser Anweisung mit Begründung;
- „Beobachtungen“: was dir aufgefallen ist, aber nicht umgesetzt wurde;
- „Bitte von Hand prüfen“: Autostart auf iOS Safari und Android Chrome,
  Lesbarkeit der Icons, Kontraste der Gruppenfarben, Bedienung mit
  Screenreader (VoiceOver/TalkBack) in Liste und Stepper.
