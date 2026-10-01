# Bericht – Redesign der Übungen im Stil „Konfetti B2“

Grundlage: `ARBEITSANWEISUNG-UEBUNGEN-REDESIGN.md`. Branch
`claude/affectionate-archimedes-75nl5c` (siehe D-1), Basis `main` @ `dba2715`,
`SW_VERSION` v388 → v400. Screenshots: `docs/redesign-uebungen/` (375×667).

## Stand am Morgen

**Fertig (alle Bereiche, alle Selbsttests grün):** Basis (`ueben.css`, eigener
Zurück-Knopf), Rhythmus, Hören, Singen, Licks & Grooves, Einsingen, Werkzeuge
(Metronom/Piano nur Kopf, Fußleiste, Farben) und der Querschnitt (Gerätegrößen,
Fokus, Trefferflächen). **Übersprungen:** nichts.

**Bitte zuerst prüfen (nach Wichtigkeit):**

1. **Rhythmus, Nachklatschen ohne Silben und ohne laufende Marke** (D-5,
   `d132f89`). Das weicht bewusst vom Entwurf ab: Silben stehen erst nach der
   Runde, eingefärbt in der Karte „Letzte Runde“.
2. **Hören, „Töne in der Tonart“ als Leiter** mit do′/la′-Sprosse, Kadenz/Ton
   und dem Tonart-Namen erst nach der Antwort (D-9, `4bf90e1`). Die Serie
   „n von 10“ mit Bilanz gilt für alle Hören-Modi.
3. **Inhaltsänderungen Hören:** neue Namen „Akkordfarben“ und „Stimme
   heraushören“ (`312569b`), Gemischt-Kette in der Reihenfolge der Gruppen
   (`0dd8a2c`).
4. **Licks: Tempo 70–100 %** in den Lernschritten 1–5. Durchhalten,
   Wiederholung und Notenbild bleiben im Original (`a065d67`).
5. **Einsingen:**
   - Stimme und Belastung stehen als Pillen auf der Übersicht.
   - „Gleich: …“ erscheint nur in der letzten Runde und in der Pause.
   - „Zurück“ springt an den Anfang der Übung, in den ersten 3 s zur vorigen.
   - Das Tempo liegt im Zahnrad.
   - Keine Minuten auf den Kacheln, die Dauer steht im Prestart (D-2, D-11,
     `e67a585`).
6. **Singen:** Die Karte „Meine Stimme“ ersetzt die Tuner-Zeile. Beim
   Nachsingen gibt es Worte statt Cent, und die Chips erscheinen nur bei
   Fehlern (D-10, `5051629`).
7. Mikrofon-Variante der Klatschfläche: Pegel nur beim Test in Ruhe (D-3).

**Zurückrollen je Bereich** (jeweils `git revert <hash>`, neueste zuerst; jeder
Commit erhöht `SW_VERSION`, beim Revert eine neue `SW_VERSION` setzen):

| Bereich | Commits |
|---|---|
| Querschnitt | `e3c7866` |
| Singen | `5051629` |
| Hören | `0dd8a2c` (Kette), `312569b` (Namen), `4bf90e1` (Übung), `b1d8017` (Übersicht) |
| Werkzeuge | `37a767f` |
| Einsingen | `e67a585` |
| Licks & Grooves | `a065d67` |
| Rhythmus | `d132f89` |
| Kopf uebe-lab | `11310e4` |
| Basis | `0eb421f` (Voraussetzung für alle anderen, zuletzt zurückrollen) |

## Zugriff

- **Übungen-Artifact** (`https://claude.ai/artifact/GRVeSUXiFQ9amfBVcadEEQ`):
  **erreichbar ja**. Leinwand „BVG Chor-App – Übungen, Grunddesigns“, Version
  `1790802806-45b4`. Alle 11 Artboards und alle 7 Notizen gelesen.
- **Gefundene Artboard-Titel (11/11):**
  1. Rhythmus · Übersicht (`Main.dc.html`)
  2. Rhythmus · Nachklatschen (`Rhythmus_Aufgabe.dc.html`)
  3. Hören · Übersicht (`Hoeren_Hub.dc.html`)
  4. Hören · Töne in der Tonart (Silben) (`Hoeren_Aufgabe.dc.html`)
  5. Hören · Töne in der Tonart (Stufen) (`Hoeren_Aufgabe_Stufen.dc.html`)
  6. Singen · Übersicht (`Singen_Hub.dc.html`)
  7. Singen · Nachsingen (`Singen_Aufgabe.dc.html`)
  8. Licks und Grooves · Übersicht (`Licks_Hub.dc.html`)
  9. Licks und Grooves · Durchhalten (`Licks_Aufgabe.dc.html`)
  10. Einsingen · Übersicht (`Einsingen_Hub.dc.html`)
  11. Einsingen · Übung läuft (`Einsingen_Aufgabe.dc.html`)
- **Notizen der Leinwand:**
  - Titel „Übungen: Grunddesigns pro Kategorie“.
  - Farbcode: Cyan = Hören/Vorgabe, Pink = Du, Gelb = Wiederholen/still,
    Grün = richtig, immer mit Icon oder Text.
  - Je Reihe ein Leitgedanke:
    - Rhythmus: Klang vor Zeichen.
    - Hören: Tonleiter als Leiter, Auflösung zur Tonika sichtbar.
    - Singen: Ton → Melodie → Rhythmus, Tonspur Vorgabe vs. Stimme.
    - Licks: Lernkette sichtbar, Wiederholen vorne, stille Takte.
    - Einsingen: Programm als Verlauf, die Lage wandert in Halbtönen.
- **Tools-Seite: bereits umgesetzt.** `index.html` enthält `.tools-dock`,
  `.practice-ring` und `.warmup-card`, Commit `fbb8dd1` auf `main`.
  `tools-seite-b2.patch` liegt nicht im Repo und war nicht nötig. Das
  Tools-Artifact wurde nicht geöffnet.

## Vorgehen

- **Phase 0, Bestandsaufnahme:** Drei Sonnet-Agenten haben nur gelesen
  (Rhythmus; Hören und Singen; Licks und Einsingen). Die Kurzfassung steht in
  der Tabelle unten.
- **Musikpädagoge:** Opus-Agent. Er hat je Bereich ein Gutachten geschrieben
  (Urteile unten) und am Ende die Schlussprüfung gemacht.
- **Umsetzung:**
  - `uebe-lab.html` (Rhythmus, Hören, Singen; ca. 750 KB): selbst geschrieben,
    damit es nur einen schreibenden Agenten je Datei gibt.
  - `licks.html`, `einsingen.html`, `metronom.html`, `piano.html`: Sonnet-Agenten
    nach schriftlicher Spezifikation, jeder Diff geprüft und einzeln committet.

### Bestandsaufnahme (Kurzfassung)

| Bereich | Vorher | Fällt laut Entwurf weg | Einstellungen |
|---|---|---|---|
| Rhythmus | Liste mit Unterzeile; Lektionskarte mit Intro, Stepper als Kacheln, „Schritt n/m …“; Pillen-Streifen; Notenfläche; Tippfeld; Score-Zeilen mit ms | Unterzeilen, Intro, Schritt-Satz, ms | Zahnrad-Blatt (Taktart, Bausteine, Eingabe, Latenz), Hilfe als aufklappbarer Text |
| Hören | flache Liste mit Unterzeile, „Gemischt üben … ca. 13 Min.“; Stufen-Karte; Antworten als Raster/Reihe; Zählzeile „in Folge“ | Unterzeilen, Minuten, Zählzeile | Zahnrad-Blatt je Modus |
| Singen | flache Liste, Tuner als letzte Zeile; Optionen-Chips über der Bühne; Tonspur mit Cent-Zahlen | Unterzeilen, Cent im Bild | Zahnrad (Stimme, Blattsingen, a′) |
| Licks | Liste mit Preset/Stufe, „Heute fällig“-Karte; Pillen-Stepper; Klaviatur-Dock mit Klang/Glide/Oktave; kein Tempo | Unterzeile | Zahnrad (Notenbild, Verzögerung) |
| Einsingen | Programme mit Beschreibung und Minuten, Übungen mit Kurzanleitung; Spielmodus mit „Gleich“, „Überspringen“, BPM und Tap in der Fußleiste | Beschreibung, Minuten, Kurzanleitung in der Liste, BPM in der Fußleiste | Zahnrad (Stimme, Belastung, Begleitung, Längen) |

## Basis (Phase 1)

- **`ueben.css`** (neu, steht in `sw.js` unter `SHELL_OPTIONAL` und in der
  CLAUDE.md-Liste) enthält:
  - die Tokens wie `index.html` (`--line`, `--surface-2` usw. aus der
    Akzentfarbe abgeleitet; `--tint`, `--tint-line`, `--rule`), den Farbcode
    (`--hear-*`, `--rep-*`, `--ok-*`) und Baloo 2 eingebettet;
  - die Konfetti-Kreise;
  - die Bausteine `k-head`, `k-round`, `k-row`, `k-ring`, `k-pill`, `k-hero`,
    `k-stepper`, `k-foot`, `k-tempo`, `k-play`, `k-btn`, `k-card` und
    `k-stage`.

  Jede Tool-Seite bindet die Datei *nach* ihrem eigenen `<style>` ein. Keine
  CSP-Änderung war nötig, denn die Tool-Seiten haben keine eigene CSP und
  `style-src 'self'` erlaubt die Datei.
- **Akzentfarbe:** Die Seiten übernehmen zusätzlich `--accent-foreground` aus
  der App.
- **Eigener Zurück-Knopf:** Eingebettete Seiten setzen `data-own-back`. Die App
  blendet dann ihr ✕ aus (`syncToolFrameBack`, `.tool-frame.has-own-back`) und
  fokussiert den ersten sichtbaren `[data-own-back-btn]`. „Zurück“ schickt
  `chor-tool-close`; Esc und die Wischgeste funktionieren weiter. Geprüft in
  der echten App für Rhythmus, Hören, Singen, Einsingen, Licks, Piano und
  Metronom: ✕ ausgeblendet, Fokus auf „Zurück“, „Zurück“ schließt.

## Bereiche

### 1 Rhythmus (`11310e4`, `d132f89`, Querschnitt `e3c7866`)

**Urteil des Musikpädagogen (kurz):**
- Übersicht und Übung: ändern.
- Beim Nachklatschen keine Silben und keine laufende Beat-Marke (Lesen statt
  Hören). Kreise laufen nur im Einzähler. Silben gibt es erst nach der Runde,
  eingefärbt.
- Phasen-Pillen um „Einzähler“ und „Still“ ergänzen.
- Timing-Streifen ja, aber ohne ms-Zahl. Eine Tendenz erst ab ≥ 3 Treffern,
  ≥ 75 % auf einer Seite und ≥ 30 ms spät bzw. ≥ 40 ms früh.
- Pille an `perfect` koppeln („Geschafft“ statt „Fast perfekt“).
- „Tap“ nicht im Kurs.
- „Heute wiederholen“ direkt unter die Kurs-Karte.

**Umgesetzt:**
- **Übersicht:**
  - Kurs-Karte mit Lektion: ein Tipp auf den Namen öffnet „Alle Lektionen“,
    die Wahl ändert nur die Lektion.
  - Stepper und Play: Play öffnet die Lektion und startet sofort.
  - „Heute wiederholen (n)“ (fällige Klatsch-Grooves) erscheint nur bei n > 0.
  - Zeilen mit Ring (Zweistimmig: Stufe/5) bzw. Pille „neu“/„eigene“.
- **Übung:**
  - Die Lektion steht als Titel; ein Tipp darauf öffnet die Liste.
  - Vorstellung, Hintergrund und Schritt-Erklärung liegen hinter „?“.
  - Stepper.
  - Pillen mit Icons: Einzähler, Hören (cyan), Still (gelb), Du (pink).
  - Ziel „Fehlerfreie Runde ○/✓“.
  - Notenfläche nur, wo gelesen wird (Vom Blatt, Mitlesen, Zweistimmig,
    freies Nachklatschen nach der Runde).
  - Klatschfläche mit Zählkreisen je Schlag: Sie laufen nur, wo die bestehende
    Hilfen-Logik (`visibleAids`) es erlaubt, sonst ruhen sie gedimmt.
- **Karte „Letzte Runde“ (`timingSummary`, `renderRoundCard`):**
  - Pille „Genau“/„Geschafft“/„n von m“ und Punkte je Treffer auf der Achse
    „zu früh – genau – zu spät“.
  - Zeile „verpasst · zu viel“ und Silben eingefärbt (genau/knapp/verpasst,
    Silbenart nach Einstellung).
  - Satz zur Tendenz ohne ms; die ms-Zahl steht hinter „?“.
- **Fußleiste:**
  - Play 48 | Tempo-Pille „− 80 BPM +“ | Tap (nicht im Kurs).
  - Der Regler bleibt als `visually-hidden` im DOM, weil Handler und Tests ihn
    nutzen.
- **Mikrofon:** In Ruhe startet ein Tipp auf die Fläche den Mikrofontest mit
  Pegelbalken. Die Fläche blinkt bei erkannten Einsätzen. Im Lauf gibt es nur
  das Aufblinken.

**Abweichungen vom Entwurf:**
| Entwurf | Änderung | Begründung |
|---|---|---|
| Silben „ta ti-ti“ unter den Kreisen, laufende Marke im Du-Takt | keine Silben/Marke im Hören- und Du-Takt; Silben eingefärbt nach der Runde (Screenshot `rhythmus-kurs-letzte-runde.png`) | Musikpädagoge: Lesen statt Audiation, widerspricht `visibleAids` und „Klang vor Zeichen“ |
| Pillen Hören/Du | Pillen je Takt der Runde inkl. Einzähler und Still | Stille ist im Schritt „Behalten“ Kern der Übung |
| „Fast perfekt“ | „Genau“/„Geschafft“/„n von m“ | `perfect` zählt knappe Treffer als geschafft |
| „Tendenz: etwas zu spät (+35 ms)“ | Satz ohne ms; ms hinter „?“ | Laien können 35 ms nicht umsetzen |
| „Takt 1 von 2“ | entfallen (D-4) | kein laufender Taktzähler beim Hören; Takte zeigt die Pillenreihe |
| Tap in der Fußleiste | im Kurs ausgeblendet | Verwechslung mit der Klatschfläche |

### 2 Hören (`b1d8017`, `4bf90e1`, `312569b`, `0dd8a2c`)

**Urteil des Musikpädagogen (kurz):**
- Übersicht: ändern.
  - Gruppen nach Fähigkeit: Melodie (Töne in der Tonart vor Intervallen),
    Harmonie (Akkordfarben, Schlüsse, Akkorde in der Tonart, Akkordfolgen),
    Im Chor (Intonation vor Stimme heraushören).
  - Gemischt-Kette an die Gruppen angleichen.
- Töne in der Tonart: Richtung freigegeben.
  - Leiter mit sichtbaren Halbtönen, do′/la′ als tippbare Ziel-Sprosse, Moll
    als la-Leiter, si als Nebensprosse.
  - Nicht geprüfte Sprossen leise statt Opazität .4.
  - Tonart-Name erst nach der Antwort; Kadenz und Ton als Knöpfe.
- Serie „n von 10“: freigegeben. Gelb für „mit Hilfe“, nie rot; Bilanz mit dem
  schwierigsten Ton und Hilfe-Angebot vor „Stufe zurück“.

**Umgesetzt:**
- **Übersicht:** Hero „Gemischt üben“ ohne Minuten, die drei Gruppen,
  einzeilige Zeilen mit Ring.
- **Übung, alle Modi:**
  - Serienleiste mit Ring (Tipp öffnet das Stufenblatt). Die Stufen-Karte
    erscheint nur vor dem Start.
  - Bilanz-Karte nach 10: „Noch 10“, Stufenvorschlag (wenn `levelHint`) und
    „Fertig“. Kein automatisches „Weiter“ nach der zehnten Aufgabe.
  - Die Zählzeile „in Folge“ entfällt.
  - Aktionen unten: „Nochmal hören“ cyan; „Weiter“ vor der Antwort
    zurückhaltend, danach Hauptaktion.
  - Erster falscher Tipp gelb.
- **Töne in der Tonart:**
  - Leiter mit Vermerken „deine Antwort“, „das war es“, „löst sich auf“ und
    „Grundton · Ziel“.
  - Die obere Tonika leuchtet bei Auflösung aufwärts.
  - DOM und Tab-Reihenfolge aufsteigend, nur optisch umgekehrt.
- **Töne und Akkorde in der Tonart:** Tonart-Zeile (vorher „Dur“/„Moll“,
  danach „C-Dur · do = C“) mit „Kadenz“; „Ton“ bzw. „Akkord“ statt
  „Nochmal hören“ und „Nur den Ton“.

**Abweichungen vom Entwurf:**
| Entwurf | Änderung | Begründung |
|---|---|---|
| Gruppen „Töne & Abstände / Klänge & Harmonie / Im Chor hören“, Schlüsse zuletzt | „Melodie / Harmonie / Im Chor“, Schlüsse vor Akkorden in der Tonart, Akkordfolgen zuletzt | vom ganzheitlichen zum analytischen Hören |
| „Tonart: C-Dur“ vor der Antwort | nur Dur/Moll, Name danach | relative Solmisation; Name ist für Laien Ballast |
| „sol“ | „so“ (wie bisher in der App) | einheitlich mit Singen |
| Leiter mit 8 gleichen Abständen | Halbtöne enger, Moll mit la unten, si als Nebensprosse | der eigentliche Lerngewinn der Leiter |
| Serie mit grün/pink | grün/gelb, nie rot | Fehler nicht bestrafen |

### 3 Singen (`5051629`)

**Urteil des Musikpädagogen (kurz):**
- Gruppen passen: Ton treffen (Halten, Finden, Intervalle), Melodie
  (Nachsingen, Diktat, Blattsingen), Mit Rhythmus (Im Takt).
- Tuner gehört in die Stimm-Karte, als ein Tippziel, mit Leerzuständen.
- Nachsingen: Worte statt Cent, Chips nur bei Fehlern, Haken nur bei allem
  getroffen, versetzt positiv.
- Stepper bei allen Modi außer Ton halten und Tuner.

**Umgesetzt:**
- Karte „Meine Stimme“ mit Stimme und gemessenem Umfang. Ohne Messung steht
  „Umfang messen“, ohne Stimme „noch nicht gewählt“ mit einem dezenten Punkt.
  Ein Tipp öffnet Tuner, Zielton und Tonumfang.
- Gruppen, Hero „Gemischt üben“.
- Übung: Stepper (Hören/Grundton/Einzählen/Lesen → Singen/Aufschreiben →
  Ergebnis/Auflösung). Stufen-Karte und Optionen nur vor der ersten Aufgabe.
  Runde Bedienknöpfe.
- Nachsingen: Pille, Tonspur mit Pfeil statt Cent, Chips „etwas zu hoch“,
  „einen Halbton zu hoch“, „fehlt“, Legende Vorgabe/Stimme.

**Abweichungen vom Entwurf:**
| Entwurf | Änderung | Begründung |
|---|---|---|
| Chip „zu hoch +45 ct“ | „etwas zu hoch“ | Cent ist Tuner-Sprache; +45 ct läge auf Stufe 1–2 sogar in der Toleranz |
| „✓ 3 von 4“ | Haken nur bei 4 von 4; versetzt: „✓ Melodie stimmt“ | kein gemischtes Signal |
| Karte mit zwei Tippzielen | eine Karte = ein Ziel | auf 375 px fehleranfällig |
| Tuner als eigene Zeile | entfällt, steckt in der Karte | sonst doppelt |

### 4 Licks & Grooves (`a065d67`)

**Urteil des Musikpädagogen (kurz):**
- 7 Schritte behalten; Mitsingen und Startton sind eigene Fähigkeiten.
- Beim Durchhalten kein Raster und kein Taktzähler während des Laufs; der Plan
  der stillen Takte nur vorher, das Ergebnis danach.
- Klaviatur statt 5 Silbentasten.
- Tempo nur langsamer (70–100 %), im Durchhalten und in der Wiederholung
  Original.
- Mitte = Start/Stopp, keine Pause.
- Stufe in der Liste sichtbar halten.

**Umgesetzt:** wie oben.
- Liste mit cyan Anhören-Knopf, Name, Stufen-Ring 1–3 und Status-Pille
  (Sitzt/Lerne/Neu); „Heute wiederholen (n)“ startet direkt.
- Lick-Ansicht: Überzeile „Licks & Grooves“, Titel = Lick-Name.
- Klang und Glide im Zahnrad, Oktave an der Klaviatur.
- Fußleiste: Tempo | Start/Stopp | Schritt zurück/vor.
- `runBpm` ist die einzige Stelle, an der das Tempo wirkt.

**Abweichungen vom Entwurf:**
| Entwurf | Änderung | Begründung |
|---|---|---|
| 5 Schritte | 7 Schritte | Mitsingen/Startton nicht verstecken |
| „Takt 9 von 16“ + Raster im Lauf | Plan nur vorher, Ergebnis nachher, im Lauf „Nach Gehör“ | innerer Puls statt optischem Metronom; selfCheck erzwingt das |
| 5 Tasten do re mi sol la | Klaviatur | Licks nicht pentatonisch; Silbentasten verraten den Startton |
| Überzeile Lick-Name, Titel „Durchhalten“ | Titel Lick-Name, Schritt unter dem Stepper | kein Doppeltitel |
| Pause mittig | Start/Stopp | ein pausierter Durchhalte-Lauf ist wertlos |

### 5 Einsingen (`e67a585`)

**Urteil des Musikpädagogen (kurz):**
- Stimme/Belastung oben: sehr sinnvoll (Belastung ist eine
  Tagesentscheidung).
- Tonblasen: sehr gut.
- „Gleich: …“ nur am Übergang.
- „Zurück“ = Anfang der Übung, Start immer in Anfangslage.
- Tempo im Zahnrad: einverstanden.
- Stepper-Phasen und Belastungskurve: zu Recht verworfen.
- Wollte Minuten auf den Kacheln (siehe D-2).

**Umgesetzt:**
- Übersicht: Pillen, 2-Spalten-Kacheln mit „n Übungen“ und „…“, Einzelübungen
  in Gruppenfarben, Gesundheits-Fußnote.
- Prestart mit „ca. m Min“ und bei Höhe/Tiefe „Erst Kurz einsingen, dann
  dieses Programm.“
- Spielmodus:
  - Segmentleiste, Karte mit Icon, Name, „?“ und Kurzanleitung.
  - Tonblasen (vergangen/aktuell/kommend), „Runde n von m“, Tonart.
  - Fußleiste Zurück | Play/Pause | Weiter.
  - Tempo und Tap im Zahnrad.
- Sichtbarkeit der Programme wie in der App: 5 eingebaute plus eigene; Schnell,
  Morgens und Vor dem Auftritt bleiben nur per URL erreichbar wie bisher.

### 6 Werkzeuge (`37a767f`)

- **Metronom und Piano:** `ueben.css`, Kopf mit Zurück-Knopf, Titel Baloo,
  Akzent-Tokens. Beim Metronom eine Fußleiste `k-foot` mit rundem Play.
- **Keine Funktionsänderung.** Das Metronom-Tempo bleibt in der großen Karte
  (D-13).
- **Querschnitt:** Die Chips des Metronoms haben eine Trefferfläche von 44 px.

## Inhaltsänderungen

| Änderung | Begründung (Musikpädagoge) | Commit | Rückgängig |
|---|---|---|---|
| Rhythmus: Silben nach der Runde eingefärbt (neu) | Klang → Silbe (Kodály); Rückmeldung statt Vorsagen | `d132f89` | `git revert d132f89` (ganzer Rhythmus-Umbau, siehe D-14) |
| Rhythmus: Timing als Tendenz ohne ms (neu) | Timing als Lage zum Groove, für Laien umsetzbar | `d132f89` | wie oben |
| Rhythmus: Mikrofontest mit Pegel in Ruhe (neu) | Anweisung (Standard) + „Klatsch einmal zum Test“ | `d132f89` | wie oben |
| Rhythmus: „Tap“ im Kurs ausgeblendet | Verwechslung mit der Klatschfläche; Lektion gibt Tempo vor | `d132f89` | wie oben |
| Rhythmus: Lektions-Intro hinter „?“, „‹ vorige Lektion“ nur über „Alle Lektionen“, „Gelerntes gemischt wiederholen“ zusätzlich in der Lektionsliste | Übungsseite ruhig, Funktionen erreichbar | `d132f89` | wie oben |
| Hören: Serie „n von 10“ mit Bilanz (neu), Zählzeile „in Folge“ entfernt | geschlossene Einheit, kein Serien-Druck | `4bf90e1` | `git revert 4bf90e1` |
| Hören: „Kadenz“ + „Ton“ statt „Nochmal hören“ + „Nur den Ton“; Tonart-Name erst nach der Antwort | Audiation: erst Bezugsrahmen, dann Ton; relative Solmisation | `4bf90e1` | wie oben |
| Hören: „Akkordfarben“, „Stimme heraushören“ | Namen sagen, was man tut | `312569b` | `git revert 312569b` |
| Hören: Gemischt-Kette in Gruppenreihenfolge | Übersicht und Programm sagen dasselbe | `0dd8a2c` | `git revert 0dd8a2c` |
| Singen: Worte statt Cent, Chips nur bei Fehlern | Cent ist Tuner-Sprache | `5051629` | `git revert 5051629` |
| Singen: Tuner-Zeile → Karte „Meine Stimme“ | Werkzeug statt Übung, nicht doppelt | `5051629` | wie oben |
| Licks: Tempo 70–100 % in den Lernschritten (neu) | erst richtig, dann schnell; „Sitzt“ nur im Original | `a065d67` | `git revert a065d67` |
| Licks: Plan der stillen Takte vor dem Durchhalten (neu) | man weiß vorher, was kommt | `a065d67` | wie oben |
| Einsingen: Prestart mit Dauer und „Erst Kurz einsingen …“ bei Höhe/Tiefe (neu) | Stimmgesundheit, Zeit als Entscheidungskriterium | `e67a585` | `git revert e67a585` |
| Einsingen: „Gleich: …“ nur in der letzten Runde/Pause | Vorbereitung am Übergang, sonst Ablenkung | `e67a585` | wie oben |

Keine Nutzerdaten gelöscht, keine IDs oder Speicherschlüssel geändert, kein
`DATA_VERSION`-Wechsel nötig.

## Entscheidungen

- **D-1 Branch:** Die Anweisung nennt `redesign/uebungen`. Die Sitzung
  schreibt verbindlich `claude/affectionate-archimedes-75nl5c` vor, und nur
  dieser Branch ist pushbar. Er ist ein eigener Branch von `main`; es gibt
  keinen Commit und keinen Merge auf `main` und keinen Force-Push.
- **D-2 Minuten bei Einsingen:** Der Musikpädagoge wollte „ca. m Min“ auf den
  Kacheln. Die Anweisung (Rang 1, Abschnitt 10) verbietet Minutenangaben auf
  Übersichten, und eine Zahl ist keine „didaktisch zwingende Erklärung“. Die
  Dauer steht deshalb im Prestart. Die Kachel-Dauer bitte entscheiden.
- **D-3 Mikrofon-Pegel:**
  - Der Standard der Anweisung („Pegelanzeige und Mikrofon-Symbol“) ist
    umgesetzt: ein Pegelbalken in Ruhe nach einem Tipp auf die Fläche, und das
    Mikrofon-Symbol im Text der Fläche.
  - Der Musikpädagoge wollte während des Laufs keinen Pegel. Deshalb gibt es
    im Lauf nur das Aufblinken.
  - Das Mikrofon öffnet erst nach dem Tipp, nie von selbst.
- **D-4 „Takt n von m“** (Rhythmus): weggelassen. Die Pillenreihe zeigt die
  Takte der Runde, und ein laufender Zähler wäre ein optischer Puls.
- **D-5 Nachklatschen ohne Silben/Marke:** siehe Rhythmus; die sicherere
  Variante (bestehende Hilfen-Logik) bleibt.
- **D-6 Licks:** 7 Schritte, Klaviatur, Raster nur vorher und nachher, Titel =
  Lick-Name (siehe oben).
- **D-7 Hören, Gruppen und Reihenfolge:** nach dem Musikpädagogen statt nach
  dem Entwurf; `EAR_MODES` bleibt unverändert, betroffen ist nur die Anzeige.
- **D-8 Serie im Gemischt-Programm:** nicht angezeigt; dort zählt die
  vorhandene Programmleiste („Hören-Programm 2/7: …“). Zwei Zählsysteme wären
  verwirrend; eine Vereinheitlichung ist ein Vorschlag für später.
- **D-9 Kadenz/Ton:**
  - Bei Töne/Akkorde in der Tonart ersetzen „Kadenz“ und „Ton“ den Knopf
    „Nochmal hören“ (Kadenz + Ton). Kadenz und Ton lassen sich weiterhin
    nacheinander abspielen; als einzelner Knopf entfällt die Kombination.
  - Alle anderen Modi behalten „Nochmal hören“.
- **D-10 „Meine Stimme“:**
  - Die Karte öffnet die vorhandene Tuner-Ansicht (Tuner, Zielton, Tonumfang
    mit Speichern).
  - Die Stimmwahl bleibt im Zahnrad.
  - Ein eigenes Blatt „Meine Stimme“ (Stimme, Umfang messen, Tuner) ist ein
    Vorschlag für später.
- **D-11 Zurück bei Einsingen:** an den Anfang der Übung; nur in den ersten
  3 s zur vorigen (`backTarget`). Eine erste Fassung sprang in der ganzen
  ersten Runde zurück; das ist korrigiert.
- **D-12 Einsing-Programme:** Die Sichtbarkeitslogik der App bleibt maßgeblich
  (Standard der Anweisung).
- **D-13 Metronom-Tempo:** Es bleibt in der großen Karte. Die Fußleiste hat
  Play, Status und Tap; eine Funktionsänderung war nicht erlaubt.
- **D-14 Commit-Granularität:**
  - Hören hat für die beiden reinen Inhaltsänderungen eigene Commits.
  - Bei Rhythmus, Licks, Einsingen und Singen sind Inhaltsänderungen und
    Optik eng verflochten (gleiche Render-Funktionen). Sie stehen je Bereich
    in einem Commit; ein Revert nimmt dann den ganzen Bereich zurück.
- **D-15 i18n:** Die Tool-Seiten sind wie bisher nur deutsch. `strings.js` ist
  unverändert, denn es kam kein sichtbarer App-Text hinzu. Die
  Schlüsselparität de/en/pl bleibt unverändert.
- **D-16 Screenshots:** Sie liegen in `docs/redesign-uebungen/` (1×, ca.
  600 KB). Dieser Ordner wird nicht vom Service Worker ausgeliefert.
- **D-17 Pull Request:** als Entwurf (Draft), wie in der Anweisung verlangt.
- **D-18 Karte „Letzte Runde“:** Sie erscheint nach jeder ausgewerteten Runde,
  auch während der Lauf weitergeht (die Runden laufen endlos). Während einer
  Runde zeigt die Bühne nur Pillen und Fläche.

## Nicht umgesetzt (bewusst, als Vorschlag)

- Hören:
  - Intervalle und Intonation senkrecht bzw. nach Größe.
  - Tonmuster (2–3 Töne) als Ausbau.
  - „Mitsingen“ während der Auflösung.
- Singen:
  - „Nochmal hören“ springt beim Nachsingen nicht direkt ins Singen.
  - Audiationspause.
  - Gegen eine zweite Stimme halten.
  - Tendenz über die Sitzung.
  - „Im Takt: Vom Blatt“ nur bei eingeschaltetem Blattsingen.
  - Eine einheitliche Tonnamen-Schreibweise für die ganze App (die App nutzt
    durchgehend `noteLabel` aus harmony.js).
- Einsingen: Lagepfeil statt Tonart als Hauptinfo (die Tonart steht klein mit
  ↑/↓-Richtung in der Pille).

## Tests

- **Qualitätstor:**
  - App: `selfTest`, `selfTestAsync`, `selfTestAudioPath` und `selfTestMusic`.
  - Tool-Seiten: `selfCheck` aller Seiten eingebettet (iframe in `index.html`)
    und eigenständig, dazu `selfCheckAudio` von uebe-lab und licks.
  - Vor jedem Commit grün.
  - Syntax: `node --check` auf `app.js` (als .mjs) und auf die extrahierten
    `<script>`-Blöcke.
- **Neue Selbsttests:**
  - uebe-lab: `redesignRhythmCheck`, `redesignEarCheck`, `redesignSingCheck`
    (timingSummary, Stepper, Ring, Übersichten, Serie, Bilanz, Leiter
    Dur/Moll, obere Tonika, Tonart-Zeile, Worte statt Cent, Ergebnis-Pille).
  - licks: `uiCheck` (runBpm, Fußleiste, Plan-Streifen, Liste).
  - einsingen: `checkRedesign` (backTarget, Pillen, Kacheln, Fußleiste,
    „Gleich“).
  - metronom/piano: `data-own-back`.
- **Angepasste Tests (nur dort, wo genau das geänderte Verhalten geprüft wird):**
  - Reihenfolge/Kurztexte der Hören-Liste → Gruppen, keine Unterzeile.
  - „ca. 13 Min.“ → keine Minuten.
  - „Tuner letzte Zeile“ → Tuner in der Stimm-Karte.
  - Antworten „in einer Reihe“ → Leiter.
  - „Nur den Ton/Akkord“ → „Ton“/„Akkord“ und Kadenz-Knopf.
  - Kette Hören → neue Reihenfolge.
  - Tonhöhenbild „+40“ → Pfeil, keine Cent-Zahl.
- **Gerätegrößen:** 375×667, 375×568, 320×568 und 390×844, je 13 Ansichten.
  - Kein horizontaler Überlauf, und die Fußleiste ist überall im Bild.
  - Die Filterleiste von Licks scrollt gewollt seitlich.
  - Zu kleine Trefferflächen („ändern“, Metronom-Chips) sind behoben.
  - Die Stepper-Punkte (22 px) haben eine 44-px-Trefferfläche.
- **Echte App:** Tools-Reiter → Übung für alle sieben Seiten geöffnet: ✕ der App
  ausgeblendet, Fokus auf „Zurück“, „Zurück“ schließt.
- **Bekannt und unverändert:** Der eigenständige `uebeLab.selfCheck()` braucht
  einige Minuten, eingebettet ca. 100 s. Das war vorher schon so.

## Bitte von Hand prüfen

- Echte Geräte (iOS Safari, Android Chrome):
  - Mikrofontest der Klatschfläche.
  - Leuchten der Leiter während der Auflösung.
  - Licks-Tempo 70 % (Klang der Begleitung).
  - Einsingen „Zurück“/„Weiter“ während des Laufs.
- Screenreader:
  - Stepper (nur der aktuelle Schritt sichtbar beschriftet, alle als
    `visually-hidden`).
  - Leiter (DOM aufsteigend, optisch umgekehrt).
  - Ring („Stufe n von m“).
- Andere Akzentfarben: Die Tokens leiten sich von `--accent` ab, und die
  Seiten übernehmen `--accent-foreground` aus der App.

## Schlussprüfung des Musikpädagogen

_(siehe unten, wird nach Abschluss eingetragen)_
