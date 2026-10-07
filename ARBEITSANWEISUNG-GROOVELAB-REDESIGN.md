ARBEITSANWEISUNG — Groove Lab Redesign: Chor (einfach) · Studio (Spuren) · Lernen
=================================================================================
Rolle: Du bist Chefentwickler dieser App (Repo bokajsukriz/choirapp, statische PWA, kein
Build, kein Bundler). Du baust die Oberfläche des Groove Lab (`groove-lab.js`) nach dem
unten beschriebenen Entwurf um: eine einfache Standard-Ansicht „Chor“, eine volle Ansicht
„Studio“ mit Spuren statt Reitern und einen Bereich „Lernen“.

Dieser Auftrag läuft AM STÜCK und OHNE Rückfragen (Abschnitt 12). Stelle keine Fragen,
warte auf keine Antwort. Alles Offene entscheidest du nach den Regeln unten und
dokumentierst es im Bericht. Am Ende steht ein Bericht (Abschnitt 9).

------------------------------------------------------------------
0. ZUERST: QUELLEN LESEN, REPO-STAND FESTSTELLEN (vor jeder Änderung)
------------------------------------------------------------------
Lies: CLAUDE.md, README.md (Abschnitte „Groove Lab: …“), den Kopfkommentar von
groove-lab.js und diese Anweisung ganz.

Entwurf (visuelle Referenz, Claude-Artifact, Design-Leinwand, je Artboard eine .dc.html
mit allen Werten als inline styles):
  https://claude.ai/artifact/QxExUGREEij6bdydJM2pKY
Maßgeblich sind NUR die Reihen „Finaler Vorschlag“ (D…) und „Sampler, Spielfläche &
Piano“ (E…) samt ihren Notizen. Die Reihen A, B, C sind verworfene Vorstufen (A ist
bereits umgesetzt, siehe 0b).
  D1-Chor.dc.html               Chor (Standard-Ansicht)
  D2-Studio.dc.html             Studio, Spurenliste
  D3-Spur-Akkorde.dc.html       Spur-Blatt „Akkorde“ (Muster · Klang · Mix)
  D4-Lernen.dc.html             Lernen (Aufgaben, Kurs, de:construct als Kacheln)
  D5-Chor-angepasst.dc.html     Chor nach Änderungen im Studio
  D6-Akkordfolge.dc.html        Akkordfolgen-Editor
  E1-Chor-Piano.dc.html         Chor-Spielfläche Piano, QUERFORMAT 844×390
  E5-Chor-Samples.dc.html       Chor-Spielfläche Samples, QUERFORMAT
  E2-Studio-Pads.dc.html        Studio-Spielfläche (Leiste von unten)
  E3-Sounds.dc.html             „Meine Sounds“ (Sampler-Bibliothek)
  E4-Aufnehmen.dc.html          Sound aufnehmen
  B2-Spur.dc.html               Muster eines Spur-Blatts (Drums), als Vorlage für
                                Drums/Bass/Melodie-Blätter (Kopf + Muster·Klang·Mix)

Schritt 0a: Öffne das Artifact (Artifact-Werkzeug, action "read", danach die genannten
  Dateien unter project/ einzeln lesen). Liste die gefundenen Artboard-Titel im Bericht
  (Beleg). Ist es NICHT erreichbar: trotzdem weiterarbeiten — diese Anweisung ist
  vollständig (Abschnitte 3–5 beschreiben jedes Element). Vermerke es im Bericht.
Schritt 0b: Repo-Stand. Variante A (schlanke Transportleiste oben, Tempo im Beat-Reiter,
  Menü mit Speichern & Öffnen/Modus/Einstellungen, Datei sichern/öffnen) ist auf Branch
  `claude/groovelab-redesign-sx7q7k` umgesetzt (PR bokajsukriz/choirapp#182).
    - Auf main gemergt: von main aus arbeiten.
    - Nicht gemergt: von diesem Branch aus arbeiten (sein Menü, `_saveFile/_openFile`,
      `_renderSettings` werden weiterverwendet).
  Vermerke die Basis (Branch + Hash) im Bericht.
Schritt 0c: Bestandsaufnahme (Sonnet-Agent, nur lesend), Tabelle im Bericht: jedes
  heutige Bedienelement des Groove Lab (Reiter Beat, Harmonie, Melodie, Sampler, Klang,
  Mixer, Keys; Chor-, Workshop-, de:construct-Ansicht; Transportleiste; Menü) → Zielort
  laut Abschnitt 5. Kein Element darf ohne Zielort bleiben.

------------------------------------------------------------------
1. ZIEL IN DREI SÄTZEN
------------------------------------------------------------------
- Standard ist „Chor“: Tonart, Tempo, ein Stil mit Energie und Raum, dann Akkorde,
  Rhythmus, Bass, Klang, Melodie zum Durchklicken — mehr nicht. Dazu eine Spielfläche
  (Piano/Tonleiter/Samples) im Querformat zum Mitspielen.
- „Studio“ ersetzt die sieben Reiter durch Spuren (Drums, Bass, Akkorde, Melodie; dazu
  Liegeton, Aufnahme, 2. Akkorde-Spur), jede mit Blatt „Muster · Klang · Mix“; Akkordfolge,
  Tonart, Takt, Tempo, Raum stehen in einer Song-Zeile darüber.
- „Lernen“ bündelt Aufgaben (das heutige „Chor“), Kurs (heute „Workshop/Kurs“) und
  de:construct als aufklappbare Kacheln.
Chor und Studio zeigen DENSELBEN Zustand in zwei Detailstufen. Ein Ansichtswechsel ändert
nie, was klingt.

------------------------------------------------------------------
2. ROLLEN UND ARBEITSTEILUNG
------------------------------------------------------------------
Du entscheidest Architektur, Reihenfolge, Zustandsmodell und prüfst jeden Diff.

2A) Opus-Subagent „Musikproduzent & -pädagoge“ (Berater, schreibt keinen Code)
Rolle: erfahrener Musikproduzent (Pop/Electronic, Arrangement) UND Musikpädagoge
(Chorleitung, Laienchöre, Jugendliche und Erwachsene). Er hat den Entwurf bereits beraten;
seine Ergebnisse stehen in Abschnitt 4 und gelten als gesetzt. Frage ihn für:
  - die Stil-Inhalte (welche vorhandenen Drumloops/Basslinien/Presets je Stil und je
    Energie-Stufe, Abschnitt 4.1/4.2),
  - jede Abweichung vom Entwurf, die du für nötig hältst,
  - die Schlussprüfung (Abschnitt 7, Phase 9): einmal durch alle Ansichten.
Bündle Anfragen, nicht je Bildschirm. Rangfolge der Quellen: (1) diese Anweisung,
(2) Urteil des Beraters, (3) Entwurf, (4) bestehende App.

2B) Sonnet-Subagenten (Ausführung)
Nur für klar abgegrenzte Aufträge mit Funktion/Selektor, Abnahmekriterium und Verbot
fremder Änderungen. groove-lab.js hat ~11 500 Zeilen: NIE zwei schreibende Agenten
gleichzeitig in groove-lab.js; strings.js ebenso nur einer. Gut geeignet: Bestandsaufnahme,
i18n-Schlüssel de/en/pl, CSS/Markup eines Blatts, Screenshots je Gerätegröße.

------------------------------------------------------------------
3. AUFBAU DER OBERFLÄCHE (Werte und Pixel stehen in den Artboards)
------------------------------------------------------------------
Designsprache: die des Groove Lab (Shadow-DOM, Variablen --accent, --accent-rgb, --bg,
--surface, --surface-2, --line, --muted, --text, --bad). Akzentfarbe ist einstellbar,
keine festen Pink-Werte im Code. Tippflächen ≥ 44 px, echte <button>/<input>, sichtbarer
Fokus, Kontrast ≥ 4,5:1, prefers-reduced-motion.

3.1 Kopfleiste (alle Ansichten, einzeilig)
  ▶/⏸ (44) · Taktpunkte + aktueller Akkord · [Ansicht ▾] (Dropdown: Chor, Studio,
  Lernen) · ↶ Rückgängig · ☰ Menü. In de:construct zusätzlich „Prüfen“ und A/B wie heute.
  Überlastungs-„!“ wie heute (öffnet Menü bei Einstellungen). Statuszeile darf entfallen,
  wenn der Platz fehlt; Statusmeldungen dann als kurzer Toast (role="status").

3.2 Menü ☰ (aus Variante A übernehmen, erweitern)
  Speichern & Öffnen (Plätze, Datei sichern/öffnen, Code) · „Meine Sounds“ (3.8) ·
  „Zufällig“ (nur Studio, siehe 5) · Einstellungen: Audiopuffer, Gesamtlautstärke,
  Bluetooth-Hinweis (Text: Bluetooth-Kopfhörer/-Lautsprecher verzögern um >150 ms, für
  Mitsingen Kabel oder Gerätelautsprecher nutzen) · Schließen.
  Der „Modus“-Abschnitt aus Variante A entfällt (Ansicht steht jetzt im Dropdown).

3.3 Chor (D1)
  a) Tonart-Karte: − [G-Dur] + (Halbtonschritte; Dur/Moll über den Stil oder lange
     Drücken → Auswahl), Knopf „Anfangstöne geben“ (spielt Grundakkord, dann die
     Einsatztöne S/A/T/B nacheinander tief→hoch, Klang Klavier, Begleitung pausiert).
  b) Tempo-Karte: − [♩ 92] +, „Tap“, Swing-Umschalter gerade · leicht · Shuffle
     (ausgeblendet bei 3/4 und 6/8). Einzähler: an/aus im Play-Verhalten (Standard an,
     1 Takt), Schalter in der Tempo-Karte oder im Menü — deine Wahl, im Bericht nennen.
  c) Stil-Karte: Stil ‹ › (Name + Kurzbeschreibung), darunter Energie (Still · Ruhig ·
     Treibend · Voll) und Raum (Trocken · Probe · Saal · Kirche), je als Segmented Control.
  d) Elemente-Karte: AKKORDE (Chips der Folge in der Tonart, ← an vorgezogenen; Tipp →
     Akkordfolgen-Editor D6 bzw. Vorlagen ‹ ›), RHYTHMUS ‹ ›, BASS ‹ ›, KLANG ‹ ›,
     MELODIE ‹ › (Standard „aus“; Vorlagen erst nach Antippen).
  e) „Hören auf“: Rhythmus · ausgewogen · Harmonie (4.5) und Piano-Knopf (öffnet die
     Chor-Spielfläche 3.6).
  Durchklicken zeigt nur Passendes (gleiche Taktart; Rhythmus innerhalb der Stil-Familie
  zuerst). Was die Chor-Ansicht nicht abbilden kann, zeigt sie wie D5: „Eigene Einstellung
  (Studio)“ am Element, „angepasst“ am Stil/Energie, „+n weitere Spuren“ mit Stumm-Schalter,
  „Auf Vorlage zurücksetzen“. NIE still verwerfen.

3.4 Studio (D2, D3, B2)
  Song-Zeile: TONART · TAKT · TEMPO (mit Swing-Stufe darunter) · RAUM; darunter
  AKKORDFOLGE „G · ←D · ←Em · ←C  Bearbeiten ›“ → D6.
  Spurkarten: Farbbalken, Name, Unterzeile (Vorlage · Klang · Spielweise), M/S,
  Mini-Muster (16 Zellen), Lautstärke. Antippen → Blatt (Bottom-Sheet) mit Reitern
  Muster · Klang · Mix (Inhalt je Spur: Abschnitt 5). Die markierte Spur ist Ziel der
  Spielfläche.
  „+ Spur“: Liegeton · Aufnahme (Phrase-Sample) · 2. Akkorde-Spur.
  Knopf „Keyboard · spielt in <Spur>“ unten → Studio-Spielfläche (3.7).
  Schloss je Spur im Blatt-Kopf (für „Zufällig“).

3.5 Akkordfolgen-Editor (D6), Blatt, gilt für alle Spuren
  Vorlage ‹ ›; Takt-Leiste mit Akkord-Chips (Breite = Länge); gewählter Akkord: Stufen der
  Tonart als Chips, LÄNGE ½ · 1 · 2 Takte, WECHSEL auf der Eins · Achtel früher ·
  16tel früher (16tel nur, wenn das Raster des Rhythmus Sechzehntel hat), Septakkord,
  Bass (Umkehrung), Geliehen; + Akkord, − Entfernen, Verschieben; „Alle auf der Eins
  wechseln“. Bestehender Akkordfolgen-Editor (prog-*) liefert die Logik.

3.6 Chor-Spielfläche (E1, E5), Vollbild QUERFORMAT
  Beim Öffnen: Element.requestFullscreen() + screen.orientation.lock('landscape') wo
  möglich; sonst Hochkant-Hinweis „Zum Spielen quer halten“ (zentriert, Dreh-Symbol).
  Kopf (einzeilig): ▶/⏸ · Akkord groß + Töne + nächster · Piano | Tonleiter | Samples ·
  (Piano:) Akkordtöne-Schalter, Klang ▾, Lage ‹ › · ✕.
  Piano: 11 weiße Tasten (c′–f″, verschiebbar), Akkordtöne als Punkte. Tonleiter: nur
  Töne der Tonart als große Tasten. Samples: 4×2 Pads, Kit-Wahl (mitgelieferte Kits +
  „Mein Kit“), 8. Pad „Eigenen Sound aufnehmen“ → 3.8. Hier KEINE Aufnahme ins Muster.

3.7 Studio-Spielfläche (E2), Leiste von unten
  Piano | Tonleiter | Pads; „Spielt in: <Spur> ▾“; (Pads:) Kit ▾. EIN Knopf
  „● Aufnehmen“ mit dazu (Standard) · ersetzen; Länge = Loop; Anschläge rasten auf die
  nächste Sechzehntel (quantizeTapStep, minus Ausgabe-Latenz). Ersetzt heute
  „Live einspielen/Ins Raster schreiben“ (Beat) UND „Aufnahme“ (Keys). Zurücknehmen über ↶.

3.8 Meine Sounds (E3) und Aufnehmen (E4)
  Bibliothek: Filter Alle · Schläge · Töne · Phrasen; je Sound Anhören, Name, Art/Länge,
  Mini-Wellenform, „verwendet als …“, ⋯ (umbenennen, löschen, Tonhöhe, Schnitt). „7 von 64 ·
  nur auf diesem Gerät“. Aufnehmen: Art Schlag/Ton/Phrase, Pegel, Auto-Schnitt mit
  ziehbaren Griffen, erkannte Tonhöhe, Einzählen/Klick, „Danach verwenden als …“,
  Nochmal/Speichern. Die vorhandene Sampler-Logik (README „Samples und Sampler“,
  sanitizeSampleMeta, autoTrimBounds, detectPitch, wavePeaks, Grenzen) bleibt; nur die
  Oberfläche zieht um.

3.9 Lernen (D4)
  Drei aufklappbare Kacheln: Aufgaben (Gruppen Singen · Hören · Rhythmus, heutige
  CHOIR_TASKS), Kurs (Fortschritt „Einheit n von m“, Weiterlernen), de:construct
  (Fortschritt, „Im Studio öffnen“). Eine Aufgabe läuft über der Chor-Ansicht (gleiche
  Begleitung, Aufgabenkarte darüber, gesetzte Werte sichtbar markiert). Kurs-Einheiten
  und de:construct öffnen das Studio mit hervorgehobenen Spuren/Blättern.

------------------------------------------------------------------
4. FACHLICHE FESTLEGUNGEN (Berater, gesetzt)
------------------------------------------------------------------
4.1 Energie — 4 Stufen, wechselt nur an der nächsten Taktgrenze (besser 2/4 Takte),
    ändert NIE Tempo, Tonart, Akkorde oder Pad-Lage; „Voll“ = dichter, nicht lauter
    (Gesamtpegel ausgleichen); Melodie unberührt.
      Still:    keine Drums; Bass Grundton ganze Noten (oder aus); Pad gehalten; kein Fill
      Ruhig:    Rim/Shaker, Kick auf 1; Bass Halbe; Pad gehalten; kein Fill
      Treibend: Kit mit Backbeat; Bass Viertel/Achtel mit Durchgängen; Pad rhythmisch;
                Fill alle 8 Takte; Pump leicht
      Voll:     volles Kit, offene Hi-Hat; Bass Achtel/Oktaven; Pad rhythmisch, etwas
                heller; Fill alle 4 Takte; Pump deutlich
    Je Stil eine kuratierte Leiter aus verwandten Loops gleicher Taktart/Kick-Logik
    (nicht quer durch alle Loops springen). Bass-Varianten als reine Funktion aus der
    Linie des Loops ableiten (Selbsttest).
4.2 Stile (setzen Rhythmus-Familie, Bass-Spielweise, Klang, Raum-Vorschlag,
    Standard-Energie, Swing, Vorziehen; lassen Tonart UND Tempo stehen — liegt das Tempo
    weit außerhalb, Vorschlag-Chip „Stil-Tempo 96 übernehmen“):
      Choral 4/4   Hymne, nur Akkorde, Chor-SATB, Kirche, Still, Wechsel auf der Eins
      Ballade 4/4  Klavier + Pad, Rim, Halbe, Saal, Ruhig
      Pop 4/4      Backbeat, Achtel, Klavier + Pad eng, Probe, Treibend, Achtel früher
      Gospel 4/4   Backbeat + Ghosts, Durchgänge, Orgel/E-Piano, Saal, Treibend, leicht
                   geswingt, Achtel früher
      Walzer 3/4   Bass auf 1, Akkorde auf 2+3, Klavier, Saal, Ruhig, auf der Eins
      Lied 6/8     wiegend, punktierte Viertel, Gitarre/Arpeggio, Probe, Ruhig, Eins
      Funk 4/4     Sechzehntel, Synthbass, E-Piano, Trocken, Treibend, 16tel früher
      Elektro 4/4  Four-on-the-floor, Achtel/Oktaven, Synth-Pad + Pump, Saal, Voll,
                   Achtel früher
    Lieber 8 gute Stile als viele mittelmäßige. Zuordnung zu vorhandenen DRUM_PATTERNS,
    Basslinien und Presets mit dem Berater festlegen.
4.3 Raum — Trocken · Probe (Standard) · Saal · Kirche: Makro aus Hallanteil, Nachhall,
    Pre-Delay (wächst mit, ~20–40 ms) und etwas Breite. Bass und Kick bleiben fast trocken
    und mono, Pad bekommt am meisten. Echo gehört NICHT in Raum (Studio, Mix der Spur).
4.4 Swing — gerade · leicht (~57 %) · Shuffle (~64–67 %). Achtel- vs. Sechzehntel-Swing
    ergibt sich aus dem Raster des Rhythmus (vorhandenes swingUnit). Bei 3/4 und 6/8
    ausgeblendet. Exakte Prozente nur im Studio (Tempo-Feld der Song-Zeile, aufklappbar).
4.5 „Hören auf“ (ersetzt einen reinen Lautstärkeregler) — Rhythmus: Drums+Bass vorn, Pad
    zurück · ausgewogen · Harmonie: Pad+Liegeton vorn, Drums leise. Wirkt als Faktor auf
    den Mix, überschreibt state.mix NICHT.
4.6 Akkordwechsel — pro Akkord: auf der Eins · Achtel früher · 16tel früher; Bass zieht
    mit vor (Option „Bass bleibt auf der Eins“ nur im Muster der Bass-Spur im Studio).
    Kein „Nachziehen“ als Verschiebung: das ist eine Länge (½ Takt). Auch der Wechsel
    über die Loop-Grenze wird vorgezogen, der allererste Takt nach dem Einzähler nicht.
    Vorgezogener Akkord sichtbar (←) und mit einem Tipp zurücksetzbar.
4.7 Melodie in Chor standardmäßig aus (konkurriert mit dem Sopran).
4.8 „Meine Stimme hervorheben“ NICHT in der Chor-Ansicht (generierter Satz ≠ echte
    Partie). Gehört in Aufgaben (wie heute).
4.9 Die Spur heißt „Akkorde“ (Funktion), „Pad“ ist ihr Standardklang. Arpeggio ist eine
    Spielweise der Akkorde-Spur.

------------------------------------------------------------------
5. WO IST WAS (heute → neu). Kein Element ohne Ziel (Abschnitt 6, Regel).
------------------------------------------------------------------
Beat:      Drumloop, Raster, Lupe, Spur an/aus, reset → Drums/Muster. Fills → Drums/
           Muster. Kit, Percussion-Klang, Kick-Klang → Drums/Klang. Swing → Tempo.
           Pump → Drums/Mix („Pumpen: andere Spuren ducken zur Kick“, ein globaler Wert).
           Live einspielen → Spielfläche (3.7). Bass-Klang → Bass/Klang.
Harmonie:  Tonart/Modus → Song-Zeile + Chor-Tonart. Akkordfolge, Editor, 7er, Dominante,
           geliehen, Umkehrung, chordBars → Akkordfolgen-Editor (chordBars wird zur
           Länge je Akkord, alte Stände migrieren). SATB/Pop-Satz, add9, Chor/Synth-Klang,
           Stimmen an/stumm/fokus → Akkorde/Muster bzw. Klang. Liegeton → Spur Liegeton.
Melodie:   Vorlagen, Piano-Roll, jeden 2. Takt, Oktave → Melodie/Muster.
Sampler:   Bibliothek/Aufnahme → Meine Sounds; Kits/Pads → Spielfläche Pads + Drums/
           Klang (Sample statt Drum-Zeile); Sample-Spuren im Raster → Drum-Zeilen mit
           Sample; Ton-Samples → als Klang jeder Spur wählbar; Phrasen → Spur Aufnahme.
Klang:     Presets, Makro-Knöpfe, Bewegung aufnehmen → Klang-Reiter der Spur; Oszillator,
           Hüllkurve, Filter, LFO, Charakter, Vibrato, Glide, Mono → dort „Alle Regler“.
           Hall/Chorus/Echo → Raum (global) + Mix der Spur (Echo, Chorus, Hallanteil).
Mixer:     Lautstärke/Stumm je Spur → Spurkarte; Gesamt → Menü/Einstellungen.
Keys:      Klaviatur/Tonleiter-Pads, Oktave → Spielfläche; Aufnahme → „● Aufnehmen“;
           Arpeggiator (Muster, Richtung, Tempo, Rhythmus, Bezug, Oktaven, Latch, Auto)
           → 2. Akkorde-Spur mit Spielweise Arpeggio (= heutige arp-Ebene).
Transport: Würfeln + Schlösser → Menü „Zufällig“ (nur Studio) + Schloss je Spur; in Chor
           ersetzt Stil ‹ › den Würfel. Tap → Tempo-Karte. Undo, Überlastung, Menü wie A.
Ansichten: Chor (Aufgaben) → Lernen/Aufgaben. Workshop/Kurs → Lernen/Kurs (Fokus-
           Hervorhebung _wsFocusEls auf die neuen Orte umverdrahten, Abschnitt 6).
           de:construct → Lernen/de:construct, baut im Studio (DC_TAB → Spur-Blätter:
           tempo→Song-Zeile, beat/bass→Drums/Bass, chords→Akkordfolge, melody/sound→
           Melodie).

------------------------------------------------------------------
6. VOR DER UMSETZUNG GEGEN DIE APP PRÜFEN (Fallstricke)
------------------------------------------------------------------
- Zustand: Neue Felder (styleId, energy, room, hearFocus, swingLevel, chordLen[],
  chordPush[], countIn, playSurface…) bekommen Standardwerte in defaultState() UND in
  sanitizeState(); alte Stände (meta „grooveLab“: last, slots), alte GL1.-Codes und
  .groove-Dateien müssen weiter laden. state.view: Werte 'choir'/'studio'/'workshop'/
  'deconstruct' → neue Ansichten 'choir'/'studio'/'learn' mit Unterbereich; alten Wert
  'choir' (Aufgaben) auf 'learn'+Aufgaben abbilden, wenn eine choirTask gesetzt war,
  sonst auf neues 'choir'. Reihenfolge von DRUM_PATTERNS, MELODIES, PRESETS NIE ändern
  (Index wird gespeichert). Der Lab-Zustand liegt nicht im DATA_VERSION-Schema der App;
  Umstellungen gehören in sanitizeState (idempotent).
- Energie/Stil dürfen beatEdited/eigene Muster nicht still überschreiben: dann
  „angepasst“ zeigen; Bewegen überschreibt mit Undo-Hinweis.
- Workshop: _wsFocusEls/_wsDecorate hängen an .tab-panel-DOM. Jede Fokus-Taste
  (bpm, swing, pump, track:*, picker:*, mode, key, chordsOn, chordBars, satb, drone, …)
  braucht ein neues Ziel; Workshop-Lektionen dürfen nicht kaputtgehen
  (WORKSHOP_LESSONS, lessonState, Challenges).
- de:construct: DC_TAB, is-dc-Klassen, A/B, Prüfen-Blatt; app.js-Selbsttests prüfen
  dc-Elemente (dc-sheet, dc-tap-box, dc-meter, zoom-btn, track-list .step-row …).
  Klassen behalten oder Tests in derselben Änderung anpassen.
- Chor-Aufgaben (CHOIR_TASKS, choirTaskState, pinLegacySound) setzen Zustand; sie laufen
  künftig unter Lernen über der Chor-Ansicht.
- Sampler: Loops nur im Aufnahmetempo ±3 % (README); bleibt so, an der Spur „Aufnahme“
  sichtbar machen. Samples reisen nicht in Codes/Dateien.
- Vollbild/Orientierung: lock() wirft außerhalb von Vollbild/auf iOS — immer abfangen,
  Hochkant-Hinweis als Rückfall.
- REGEL: Jedes heutige Element mit Funktion bleibt erreichbar (Abschnitt 5). Ausnahme
  nur mit Begründung des Beraters (Bericht, Tabelle „Inhaltsänderungen“).

------------------------------------------------------------------
7. VORGEHEN (Reihenfolge nach Wert; jede Phase eigene Commit-Serie)
------------------------------------------------------------------
Phase 0  Quellen, Basis, Bestandsaufnahme (Abschnitt 0).
Phase 1  Zustandsmodell + reine Funktionen mit Selbsttests (TEST_EXPORT erweitern,
         Tests in runMusicSelfTests): Stil-Tabelle, Energie-Auflösung (Stufe → Loop,
         Bass-Variante, Fill, Pump), Raum-Makro, Hören-auf-Faktoren, Swing-Stufen,
         Akkord-Länge/Vorziehen in _harmonyAt (Loop-Grenze, Einzähler), Migration alter
         Stände. Noch keine sichtbare Oberfläche nötig.
Phase 2  Kopfleiste mit Ansichts-Dropdown, Menü-Umbau (3.1, 3.2). Bis Phase 5 fertig ist,
         zeigt „Studio“ die heutigen Reiter (Übergang, nichts geht verloren).
Phase 3  Chor-Ansicht (3.3, D1, D5) inkl. Anfangstöne, Einzähler, Hören auf.
Phase 4  Akkordfolgen-Editor (3.5, D6) — in Chor und (Übergang) Harmonie-Reiter nutzbar.
Phase 5  Studio mit Spuren (3.4, D2, D3) und allen Blättern; alte Reiter entfernen,
         sobald jedes Element aus Abschnitt 5 seinen Platz hat.
Phase 6  Spielflächen (3.6 Chor quer, 3.7 Studio) mit vereinter Aufnahme.
Phase 7  Meine Sounds + Aufnehmen (3.8).
Phase 8  Lernen (3.9), Workshop- und de:construct-Umverdrahtung.
Phase 9  Querschnitt: Schlussprüfung durch den Berater, Screenreader-Durchgang, kleine
         Geräte, de/en/pl, README (Abschnitt „Groove Lab: Aufbau der Oberfläche“ neu
         schreiben, Kopfkommentar groove-lab.js).
Mindestergebnis, falls die Zeit nicht reicht: Phasen 1–4 sauber getestet.

------------------------------------------------------------------
8. QUALITÄTSTORE (vor JEDEM Commit)
------------------------------------------------------------------
- SW_VERSION in sw.js erhöhen, sobald eine Datei aus SHELL_REQUIRED/SHELL_OPTIONAL
  geändert wurde (CLAUDE.md) — bei jedem Commit, nicht nur beim ersten.
- node --check groove-lab.js; strings.js per Import laden.
- Selbsttests im Browser: chorApp.selfTest(), selfTestAsync(), selfTestMusic() → leere
  Fehlerlisten. (Konsolenzeile „[notiz] Error: Testfehler“ ist ein absichtlicher Test.)
- Gerendert prüfen (headless Chromium unter /opt/pw-browsers, Playwright global; Server
  python3 -m http.server; Lab öffnen per
  document.querySelector('#btn-open-groove-lab').click(); Onboarding wegklicken, siehe
  .claude/skills/run-choirapp): 390×844, 375×667, 320×568 und für Spielflächen 844×390,
  667×375. Kein horizontaler Überlauf, nichts abgeschnitten. Screenshots in den Bericht
  (docs/groovelab-redesign/).
- Kurz anspielen (Audio-Pfad ohne Fehler): Start/Stopp, Energiewechsel am Taktende,
  Vorziehen hörbar über die Loop-Grenze, Anfangstöne, Spielfläche, Aufnahme dazu/ersetzen.
- i18n: de/en/pl mit gleichen Schlüsseln; nicht mehr genutzte lab.*-Schlüssel entfernen.
- Barrierefreiheit: Segmented Controls als radiogroup, Dropdown mit aria-haspopup,
  Blätter role="dialog" + aria-modal + Fokusfalle (_trapFocus), Escape schließt.

------------------------------------------------------------------
9. DOKUMENTATION UND BERICHT
------------------------------------------------------------------
Führe FORTSCHRITT-GROOVELAB-REDESIGN.md (Status je Phase: offen / in Arbeit / fertig /
übersprungen, nächster Schritt, Entscheidungen) — nach jeder Phase und jedem Commit
aktualisieren, so dass ein neuer Lauf allein damit weitermachen kann.
Am Ende BERICHT-GROOVELAB-REDESIGN.md, ganz oben „Stand am Ende“:
  - was fertig ist, was übersprungen wurde (mit Grund),
  - Entscheidungen D-<Nr> (Frage → Entscheidung → Begründung → Commit), nach Wichtigkeit,
  - Tabelle „Inhaltsänderungen“ (Änderung | Begründung des Beraters | Commit |
    Rückgängig per git revert <hash>),
  - Bestandsaufnahme-Tabelle aus 0c mit erledigtem Zielort,
  - Testergebnisse + Screenshots je Gerätegröße,
  - offene Punkte für den Auftraggeber.
Zum Abschluss (CLAUDE.md): Anweisung, Bericht und Fortschritt in derselben PR nach
docs/archiv/ verschieben.

------------------------------------------------------------------
10. NICHT TUN
------------------------------------------------------------------
- Keine neuen Abhängigkeiten, kein Bundler, kein Framework, keine Build-Pipeline.
- Keine Funktion still streichen (Abschnitt 6, Regel).
- Audio-Kern (GrooveEngine, Scheduler-Timing, Überlastungserkennung, Sampler-Aufnahme/
  Latenz) nur so weit ändern, wie Phase 1 es braucht; solche Änderungen in eigenen
  Commits, im Bericht markiert.
- Nichts außerhalb des Groove Lab ändern, außer wo es nötig ist (Einstieg in app.js,
  Selbsttests, strings.js, sw.js, README).
- Keine Modell-Bezeichnungen in Commits, PR-Texten oder Code.

------------------------------------------------------------------
11. ENTSCHEIDUNGEN OHNE RÜCKFRAGE (Standards)
------------------------------------------------------------------
- Einzähler: Standard an, 1 Takt; nur beim Start aus dem Stillstand.
- Tonart-Moll/Dur in Chor: über Stil-Vorgabe + langes Drücken auf die Tonart (Auswahl).
- „Zufällig“: nur Studio, respektiert Schlösser je Spur; verändert nie Tonart/Tempo.
- Spurenzahl: feste Spurtypen über dem bestehenden Zustand (keine beliebig vielen
  Spuren). „2. Akkorde-Spur“ = heutige arp-Ebene. Liegeton = droneOn. Aufnahme =
  Phrase-Sample-Lane.
- Pump: ein globaler Wert, im Mix der Drums-Spur.
- Gesamtlautstärke (mix.master): Menü/Einstellungen.
- Tonleiter-Fläche: 7 Stufen + Oktave der aktuellen Tonart, Grundton markiert.
- Bei Zweifel die sicherere, rückgängig zu machende Variante umsetzen und als D-<Nr>
  eintragen. Nie warten, nie fragen.

------------------------------------------------------------------
12. BETRIEB AM STÜCK (ohne Aufsicht, keine Rückfragen)
------------------------------------------------------------------
- Keine Fragen an den Auftraggeber, kein Warten, kein Rückfrage-Werkzeug. Fehlt eine
  Berechtigung: Teilaufgabe überspringen, im Bericht vermerken, weitermachen.
- Git: auf dem Branch arbeiten, den die Sitzung vorgibt (sonst redesign/groovelab, von der
  Basis aus 0b). Kein Commit auf main, kein Merge nach main, kein Force-Push. Push nur
  auf diesen Branch; PR anlegen (bereit zur Prüfung), Beschreibung = Kurzfassung des
  Berichts.
- Jeder Commit baubar und getestet (Abschnitt 8) inkl. SW_VERSION.
- Scheitern: Schlagen Tests einer Phase nach zwei Reparaturversuchen weiter fehl, auf den
  letzten grünen Commit der Phase zurück (git revert, kein Reset veröffentlichter Commits),
  Phase als „übersprungen“ mit Ursache markieren, mit der nächsten weitermachen, soweit
  sie nicht davon abhängt. Nie rote Stände stehen lassen.
- Kontext knapp: Fortschritt schreiben, committen, mit frischen Subagenten weiter.
- Ende: Bericht fertigstellen, Dateien nach docs/archiv/ verschieben, committen, pushen,
  PR-Link im Bericht und in der Schlussmeldung nennen.
