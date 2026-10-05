ARBEITSANWEISUNG — Redesign der Übungen im Stil "Konfetti B2"
=============================================================
Rolle: Du bist Chefentwickler dieser App (Repo bokajsukriz/choirapp, statische PWA, kein
Build, kein Bundler). Du setzt die Designsprache aus den Entwürfen in der echten App um
und passt die bestehenden Übungen daran an. Wo es fachlich besser ist, darfst du (auf Rat
des Musikpädagogen, siehe 2A) Logik, Aufbau und Erklärungen der Übungen ändern sowie
Inhalte hinzufügen oder entfernen.

Dieser Auftrag läuft über Nacht OHNE Rückfragen (Abschnitt 12). Stelle keine Fragen,
warte auf keine Antwort. Alles Offene entscheidest du nach den Regeln unten und
dokumentierst es im Bericht.

------------------------------------------------------------------
0. ZUERST: ZUGRIFF PRÜFEN UND REPO-STAND FESTSTELLEN (vor jeder Änderung)
------------------------------------------------------------------
Quelle der Wahrheit für das Aussehen der Übungen ist ein Claude-Artifact (Design-
Leinwand, je Artboard eine .dc.html mit allen Werten als inline styles):

  ÜBUNGEN (Pflicht): https://claude.ai/artifact/GRVeSUXiFQ9amfBVcadEEQ
  Erwartete Artboard-Titel (11):
    Rhythmus · Übersicht | Rhythmus · Nachklatschen | Hören · Übersicht |
    Hören · Töne in der Tonart (Silben) | Hören · Töne in der Tonart (Stufen) |
    Singen · Übersicht | Singen · Nachsingen | Licks und Grooves · Übersicht |
    Licks und Grooves · Durchhalten | Einsingen · Übersicht | Einsingen · Übung läuft

  TOOLS-SEITE (nur Rückfall, siehe 0c): https://claude.ai/artifact/YM2FoZKdg72vWJAWaLMcuc
  Gewählt dort: Artboard "B2 · Einstellungen wie Kacheln (16 px)" (G.dc.html).

Schritt 0a: Öffne das Übungen-Artifact und lies ALLE Artboards samt Notizen der Leinwand.
Schritt 0b: Stelle den Repo-Stand der Tools-Seite fest. Sie ist bereits entworfen und als
  Patch umgesetzt (tools-seite-b2.patch, Basis main @ c465bde). Umgesetzt heißt:
  index.html enthält .tools-dock, .practice-ring und .warmup-card.
    - Schon umgesetzt: nichts tun.
    - Nicht umgesetzt und tools-seite-b2.patch liegt im Repo-Root: git apply --check,
      dann einspielen (SW_VERSION beachten, CLAUDE.md).
Schritt 0c: Weder umgesetzt noch Patch vorhanden: Öffne das Tools-Artifact (Artboard G)
  und baue die Tools-Seite daraus nach. Vermerke das im Bericht.
Schritt 0d: Schreibe den Nachweis in BERICHT-UEBUNGEN-REDESIGN.md (Kopfblock "Zugriff"):
  Übungen-Artifact erreichbar ja/nein, Liste der gefundenen Artboard-Titel (Beleg, dass du
  den Inhalt gesehen hast), Stand der Tools-Seite (umgesetzt / Patch eingespielt /
  nachgebaut).
Schritt 0e: Übungen-Artifact erreichbar -> sofort weiterarbeiten. NICHT erreichbar oder
  unvollständig -> KEINE Code-Änderungen, nichts aus Erinnerung oder Annahmen nachbauen.
  Committe nur den BERICHT mit Ursache und Fehlendem und beende den Lauf.

Zuerst außerdem lesen: CLAUDE.md, README.md (Dateiübersicht: uebe-lab.html, einsingen.html,
licks.html, metronom.html, piano.html), ARBEITSANWEISUNG-UMBAU-TOOLS.md und
BERICHT-UMBAU-TOOLS.md (Vorgeschichte der Tools-Seite).

------------------------------------------------------------------
1. ZIEL IN DREI SÄTZEN
------------------------------------------------------------------
- Alle Übungsbereiche (Rhythmus, Hören, Singen, Licks & Grooves, Einsingen) bekommen
  dieselbe ruhige, kompakte Bedienlogik: Übersicht = einzeilige Zeilen mit Stufen-Ring,
  Übung = Kopf, Fortschritt (Stepper), Bühne, schlanke Fußleiste.
- Texte so knapp wie möglich: keine Unterzeilen, keine Minutenangaben, keine Erklärsätze
  auf den Übersichten; Erklärungen liegen hinter "?" oder im aria-label.
- Die Entwürfe sind der Ausgangspunkt, nicht das Gesetz: Wenn der Musikpädagoge einen
  anderen Ablauf, Aufbau, andere Erklärungen oder andere Inhalte für besser hält, gilt
  sein Urteil (2A).

------------------------------------------------------------------
2. ROLLEN UND ARBEITSTEILUNG
------------------------------------------------------------------
Du entscheidest Architektur, Reihenfolge, gemeinsame Bausteine und Merge. Massencode
schreiben Sonnet-Subagenten, du prüfst jeden Diff.

2A) Opus-Subagent "Musikpädagoge" (Berater, schreibt keinen Code)
Rolle: erfahrener Chorleiter und Musikpädagoge (Gehörbildung nach Kodály/Gordon,
Audiation, Rhythmussprache, Stimmbildung für Pop-/Rockchöre, erwachsene Laien).
Gib ihm je Bereich die README-Abschnitte, die relevanten Code-Stellen und die Artboards.
Er beantwortet je Übung:
  1. Was muss Lernende:r in jeder Phase hören, sehen, tun? Was darf noch NICHT sichtbar
     sein ("Klang vor Zeichen": Hilfen erst nach dem Hören)?
  2. Passt das Muster aus dem Entwurf (Stepper, Bühne, Feedback, Fußleiste)? Was fehlt,
     was ist zu viel?
  3. Wäre ein anderer Ablauf, Aufbau oder eine andere Erklärung didaktisch besser?
  4. Fehlen Inhalte, die eine sinnvolle Lernfolge bräuchte, oder sind Inhalte überflüssig,
     doppelt oder schädlich?
  5. Risiken: Überforderung, zu frühe Hilfen, entmutigendes Feedback, Anfänger vs.
     Fortgeschrittene.
  6. Urteil: freigeben / ändern / ablehnen, höchstens drei konkrete Änderungen.
Bündle Anfragen je Bereich, nicht je Bildschirm.

VORRANG DES MUSIKPÄDAGOGEN (Abweichung vom Entwurf ist ausdrücklich erlaubt)
Rangfolge der Quellen: (1) diese Anweisung, (2) Urteil des Musikpädagogen, (3) Entwürfe,
(4) bestehende App. Empfiehlt der Musikpädagoge einen anderen Ablauf, eine andere
Reihenfolge der Phasen, eine andere Form des Feedbacks, andere oder zusätzliche Erklärungen
oder andere Bedienelemente, dann setze DAS um, auch wenn es vom Entwurf abweicht, und zwar
  - im Stil der Designsprache (Abschnitt 3), damit es optisch dazugehört;
  - mit Begründung im Bericht (Abschnitt 9): Entwurf -> Änderung -> Begründung;
  - mit kurzem Screenshot der neuen Variante im Bericht.
Grenzen, damit nichts still kaputtgeht:
  - Ändert sich die Bedeutung gespeicherter Felder: DATA_VERSION erhöhen und idempotente
    Migration unter DATA_MIGRATIONS eintragen (CLAUDE.md).
  - Auswertungs- und Audio-Kern (scoreEcho, judgeHold, Latenz/estimateRunDelay, Onset-
    Erkennung, AudioContext-Handling) nur anfassen, wenn der Musikpädagoge es ausdrücklich
    für nötig hält; dann in eigenem Commit, Selbsttests anpassen, im Bericht deutlich
    markieren.
  - Keine Funktion ersatzlos streichen (siehe Regel in Abschnitt 6).
Bei Zweifel, ob eine Abweichung zu groß ist (neue Bildschirme, geänderter Lernpfad):
Setze die sicherere, rückgängig zu machende Variante um und schreibe den Vorschlag als
"Entscheidung D-<Nr>" in den Bericht. Nie warten, nie fragen.

INHALTE: HINZUFÜGEN UND ENTFERNEN IST ERLAUBT
Hält der Musikpädagoge neue Inhalte für sinnvoll (Übungen, Modi, Schritte, Erklärungen,
Hinweise, Gruppen) oder bestehende für überflüssig, doppelt oder didaktisch schädlich,
darfst du sie hinzufügen, zusammenlegen oder aus der Oberfläche nehmen. Leitplanken:
  1. Begründung schriftlich: Der Musikpädagoge liefert je Änderung eine Begründung
     (didaktisches Prinzip, Zielgruppe). Sie steht im Bericht, Tabelle
     "Inhaltsänderungen": Änderung | Begründung | Commit | Rückgängig per git revert <hash>.
  2. Ein Commit je inhaltlicher Änderung, damit sie einzeln rückgängig zu machen ist.
  3. Entfernen heißt: aus Übersichten und Abläufen nehmen, aber keine Nutzerdaten löschen.
     IDs, Speicherschlüssel und Fortschrittsbereiche (PROGRESS_GROUPS, chorProgress,
     chorToolStorage) bleiben lesbar. Hängen gespeicherte Daten an einer Übung, bleibt der
     Code, nur der Einstieg entfällt. Ändert sich eine Bedeutung: DATA_VERSION und
     Migration.
  4. Hinzufügen: vorhandene Bausteine und Engines nutzen (harmony.js, groove-lab.js,
     bestehende Sheets und Stepper), keine neuen Abhängigkeiten. Neue Musikinhalte
     (Melodien, Rhythmen, Texte) sind Eigenschöpfungen oder gängige, nicht geschützte
     Muster (Kadenzen, Skalen, Standard-Grooves), keine geschützten Songs oder Riffs.
  5. Neue Texte in de, en und pl mit Schlüsselparität. Neue reine Funktionen bekommen
     Selbsttests (wie selfCheck in licks.html).
  6. Schlussprüfung: Am Ende lässt du den Musikpädagogen alle inhaltlichen Änderungen
     eines Bereichs einmal gegenlesen (Fachlichkeit, Reihenfolge, Verständlichkeit).
  7. Umfang je Bereich: lieber wenige, gut begründete Änderungen als viele. Mehr als drei
     neue und drei entfernte Inhalte je Bereich nur mit ausdrücklich starker Begründung.

2B) Sonnet-Subagenten (Ausführung)
Nur für klar abgegrenzte Aufträge mit Dateiangabe, Selektoren/Funktionen, Abnahme-
kriterien und Verbot fremder Änderungen.
  - Pro Datei höchstens EIN schreibender Agent gleichzeitig (uebe-lab.html ca. 750 KB,
    app.js ca. 1 MB: nie parallel in derselben Datei).
  - Jeder Agent meldet geänderte Stellen, Syntaxcheck, offene Punkte.
  - Gut geeignet: Bestandsaufnahme, CSS/Markup einer Ansicht, i18n-Schlüssel de/en/pl,
    Screenshots und Messungen je Gerätegröße.

------------------------------------------------------------------
3. DESIGNSPRACHE (Werte; Details und Pixel stehen in den Artboards)
------------------------------------------------------------------
Basis ist der Stil "Konfetti" (index.html :root). Die Akzentfarbe ist einstellbar, darum
IMMER die Variablen nutzen, keine festen Pink-Hex-Werte:
  --accent, --accent-rgb, --accent-foreground, --line, --surface, --surface-2, --muted,
  --text, --font-display (Baloo 2, nur Überschriften und Namen), --accent-2 (Cyan),
  --accent-3 (Gelb), --ok, --ok-fg.
Abgeleitet (stehen schon im Tools-Patch, in #view-tools):
  --tint      = color-mix(in srgb, var(--accent) 16%, white)
  --tint-line = color-mix(in srgb, var(--accent) 28%, white)
Farbcode (immer zusätzlich Icon ODER Text, nie nur Farbe):
  Cyan = Hören / Vorgabe (#33c9dc; Fläche #DDF5F8, Linie #A9E4EC, Text #0a6f7d)
  Pink = Du / aktiv / Aktion
  Gelb = Wiederholen / still / ohne Begleitung (Fläche #FFF3C4, Linie #F4DE8C, Text #6b4b00)
  Grün = richtig / erledigt (#21b17f; Fläche #DDF5EA; Text #157a55)
  Einsingen-Gruppen: Farben aus einsingen.html (--g-<id>, --g-<id>-bg), unverändert.
Formen: Karten 22-24 px, Zeilen und Kacheln 16 px, Pillen und runde Knöpfe 999 px.
Tippflächen mindestens 44 px, echte <button>, sichtbarer Fokus, Kontrast >= 4,5:1,
prefers-reduced-motion beachten. Die zwei Konfetti-Kreise im Hintergrund bleiben;
angedockte Leisten bekommen KEINEN eigenen Hintergrundstreifen, der sie abschneidet.

Bausteine:
  Kopf        Runder Zurück-Knopf 44 px; optional Überzeile (11 px, Versalien, muted);
              Titel Baloo 22 px; rechts "?" (40 px) und Zahnrad (44 px), beide rund.
  Übersichts- Weiße Zeile, 52 px einzeilig: runde Icon-Marke 36 px, Name Baloo 15 px,
  zeile       rechts Stufen-Ring (34 px, Zahl in der Mitte, Füllung = Stufe/6,
              Zweistimmig /5) oder Pille ("eigene"). KEINE Unterzeile. "Heute wiederholen
              (n)" mit der Zahl in Klammern im Namen.
  Gruppen-    11 px Versalien muted + 1-px-Linie bis zum Rand (auf der Tools-Seite nur
  überschrift .visually-hidden).
  Hero-Karte  Getönte Karte (--tint), rundes weißes Icon, Titel Baloo 18 px, runder
              Play-Knopf 48 px (z. B. "Gemischt üben"), ohne Unterzeile.
  Stepper     Punkte 22 px mit Verbindungslinien: erledigt = grüner Haken, aktuell = pink
              mit Halo, offen = weiß mit Rand. NUR der aktuelle Schritt ist beschriftet,
              mittig unter der ganzen Zeile (Baloo 16 px); die anderen Namen bleiben
              sr-only. Ausnahme Einsingen: Segmentleiste, ein Segment je Übung des
              Programms, Farbe je Segment = Gruppe der Übung, das aktuelle füllt sich mit
              den Runden.
  Fußleiste   Schlank (ca. 66-78 px), halbtransparentes Weiß + obere Linie:
              Rhythmus:  Play 48 | Tempo-Pille "- 80 BPM +" | Tap
              Einsingen: Zurück 48 | Pause/Play 60 mittig | Weiter 48; KEIN BPM (Tempo
                         ins Zahnrad)
              Licks:     Raster 1fr auto 1fr: Tempo-Pille | Pause 60 mittig | Schritt
                         zurück/vor je 44
  Pille/Tag   12 px bold, getönte Fläche, z. B. "6 Übungen", "3 von 4", "A-Dur".
  Einsingen   Programme als 2-Spalten-Kacheln (60 px, weiß, Name + Pille "n Übungen",
              ganze Kachel startet direkt, "..." bearbeiten als eigener Knopf in der Ecke);
              darunter alle Einzelübungen als weiße Zeilen, Icon-Quadrat in Gruppenfarbe,
              ohne Pfeil, gruppiert mit farbiger Gruppenüberschrift.
  Übungsseite Kopf "Einsingen · Kurz"; Karte: großes Icon (Gruppenfarbe), Name + "?"-Knopf
  Einsingen   (weitere Tipps), kurze Erklärung, Tonfolge als Blasen nach Tonhöhe gestaffelt
              (aktuelle hervorgehoben), darunter "Runde n von m" und Tonart.

------------------------------------------------------------------
4. ZUORDNUNG: ARTBOARD -> BILDSCHIRM IN DER APP
------------------------------------------------------------------
Main.dc.html                  Rhythmus · Übersicht       uebe-lab.html ?tab=rhythm
Rhythmus_Aufgabe.dc.html      Nachklatschen / Kurs       .tap-pad, renderPad, PAD_LABELS,
                                                         Phasen HÖREN / DU; die Klatschfläche
                                                         ist eine einzige große Tippfläche
Hoeren_Hub.dc.html            Hören · Übersicht          uebe-lab.html ?tab=ear
Hoeren_Aufgabe(_Stufen)       Töne in der Tonart         zeigt NUR die gewählte Schreibweise
                                                         (Silben ODER Stufen)
Singen_Hub.dc.html            Singen · Übersicht         uebe-lab.html ?tab=voice
Singen_Aufgabe.dc.html        Nachsingen-Ergebnis        scoreEcho: Tonspur Vorgabe vs.
                                                         Stimme, Chips je Ton
Licks_Hub / Licks_Aufgabe     licks.html Liste / Durchhalten (holdPlan, judgeHold, 16-Takt-Raster)
Einsingen_Hub / _Aufgabe      einsingen.html Übersicht / laufende Übung (GROUPS, EXERCISES,
                                                         PROGRAMS)

------------------------------------------------------------------
5. NICHT GEZEICHNET: MUSTER ÜBERTRAGEN, MIT DEM MUSIKPÄDAGOGEN ABSTIMMEN
------------------------------------------------------------------
Rhythmus: Vom Blatt, Zweistimmig, Klatsch-Grooves, "Alle Lektionen", Mikrofon-Variante der
  Klatschfläche (Pegelanzeige statt Antippen).
Hören: Intervalle, Klänge, Schlüsse, Akkorde in der Tonart, Akkordfolgen, Stimmen,
  Intonation (Antwort-Knöpfe vor der Antwort; nur gewählte Notation zeigen).
Singen: Ton halten, Ton finden, Intervalle singen, Im Takt, Diktat, Tuner und Tonumfang.
Alle Zahnrad-Einstellungen, Hilfe-Dialoge hinter "?", "Gemischt üben"-Abläufe.
Werkzeuge (Metronom, Piano, Groove Lab, Lichtshow): zuletzt, nur Kopf, Fußleiste und
  Farben angleichen, keine Funktionsänderung.

------------------------------------------------------------------
6. ANNAHMEN IN DEN ENTWÜRFEN: VOR DER UMSETZUNG GEGEN DIE APP PRÜFEN
------------------------------------------------------------------
Mockups enthalten Vorschläge, nicht Bestand. Prüfe jeweils Technik UND Didaktik:
- Timing-Streifen "zu früh / genau / zu spät" mit Tendenz (+35 ms) im Rhythmus: NEU.
  Liegen die Daten schon vor (game.taps, Offsets, lastMeanOff)? Musikpädagoge fragen, ob
  die Darstellung für Laien trägt.
- Gruppennamen in Hören und Singen ("Töne & Abstände", "Klänge & Harmonie", "Im Chor
  hören", "Ton treffen", "Melodie", "Mit Rhythmus") sind Vorschläge.
- Einsingen: Tempo nur noch im Zahnrad; "Gleich: <nächste Übung>" und "Überspringen" sind
  im Entwurf durch Zurück/Weiter ersetzt; Stepper-Phasen (Lockern, Klang ...) bewusst
  verworfen. Die Belastungskurve der alten Übersicht ist entfallen.
- Licks: Seitenknöpfe der Fußleiste als "Schritt zurück/vor" sind ein Vorschlag. Einen
  "Schlagzeug"-Schalter gibt es in der App NICHT (die Begleitung läuft je Takt automatisch)
  und er kommt im Entwurf nicht vor.
- Stufen-Ringe setzen Stufe 1-6 voraus (Zweistimmig 1-5).
- Einsing-Programme: Entwurf zeigt fünf (Kurz, Ausführlich, Intonation, Höhe, Tiefe), die
  App kennt acht (auch Schnell, Morgens, Vor dem Auftritt). Sichtbarkeitslogik prüfen,
  nichts verschwinden lassen.
REGEL: Jedes Element, das der Entwurf weglässt, aber in der App eine Funktion hat (Tempo,
Tap, Hilfe, Bearbeiten "...", Überspringen, Einstellungen), muss erreichbar bleiben
(Zahnrad, "?", Sheet). Kein stilles Entfernen von Funktionen. Ausnahme: Der Musikpädagoge
hält die Funktion für didaktisch schädlich oder überflüssig (dann gilt 2A, Inhalte).

------------------------------------------------------------------
7. VORGEHEN
------------------------------------------------------------------
Phase 0  Bestandsaufnahme (Sonnet, nur lesend): je Bereich alle Modi und Zustände, CSS-
         Klassen, Text, der laut Design wegfällt, Ort der Einstellungen. Kurze Tabelle im
         Bericht.
Phase 1  Gemeinsame Basis: Wie kommen die Tokens und Bausteine aus Abschnitt 3 in die
         Tool-Seiten? Jede Tool-Seite ist eigenständig (iframe). Erlaubt: eine kleine
         gemeinsame CSS-Datei, wenn sie in sw.js (SHELL_OPTIONAL/TOOL_PAGES) steht und die
         meta-CSP jeder Seite sie zulässt (index.html hat default-src 'none'). Alternative:
         Tokens je Seite wiederholen. Keine neuen Abhängigkeiten, kein Bundler.
Phase 2  Bereichsweise, je Bereich eigene Commit-Serie, in dieser Reihenfolge:
           1 Rhythmus  2 Hören  3 Singen  4 Licks & Grooves  5 Einsingen  6 Werkzeuge
         Je Bereich: Musikpädagoge befragen (2A) -> Entscheidung festhalten -> Sonnet-
         Aufträge (Übersicht, Übungsansicht, Fußleiste, i18n) -> Diff prüfen -> Tests
         (Abschnitt 8) -> Commit -> Schlussprüfung durch den Musikpädagogen (2A, Punkt 6).
Phase 3  Querschnitt: Konsistenz (Abstände, Ringe, Stepper, Fußleisten), Screenreader-
         Durchgang, kleine Geräte, de/en/pl.

------------------------------------------------------------------
8. QUALITÄTSTORE (vor jedem Commit)
------------------------------------------------------------------
- SW_VERSION in sw.js erhöhen, sobald eine Datei aus SHELL_REQUIRED/SHELL_OPTIONAL
  geändert wurde (CLAUDE.md), bei JEDEM Commit.
- Syntax: node --check auf Kopien als .mjs; bei Tool-Seiten die <script>-Blöcke prüfen.
- Selbsttests: chorApp.selfTest(), selfTestAsync(), selfTestAudioPath(), selfTestMusic();
  in den Tool-iframes selfCheck() bzw. licks.selfCheck().
- Gerendert prüfen (headless Chromium, z. B. @sparticuz/chromium + puppeteer-core über npm,
  lokal per python3 -m http.server): 375x667, 375x568, 320x568, 390x844. Kein horizontaler
  Überlauf, nichts abgeschnitten, Fußleiste sichtbar; Onboarding-Dialoge im Testskript
  wegklicken. Screenshots in den Bericht.
- i18n: de/en/pl mit gleichen Schlüsseln (Paritätsskript aus dem Tools-Patch nutzen).
- Barrierefreiheit: wo Text entfällt, aria-label setzen (Stufe, Schritt, Ergebnis);
  ausgeblendete Schrittnamen sr-only; Fokusreihenfolge prüfen.
- Keine stille Regression bei Timing, Latenz und Auswertung (siehe Grenzen in 2A).

------------------------------------------------------------------
9. DOKUMENTATION
------------------------------------------------------------------
Lege BERICHT-UEBUNGEN-REDESIGN.md an (Konvention des Repos). Ganz oben der Block
"Stand am Morgen" (siehe 12), darunter je Bereich
  - Urteil des Musikpädagogen (Kurzfassung),
  - Abweichungen vom Entwurf: Entwurf -> Änderung -> Begründung (+ Screenshot),
  - Tabelle "Inhaltsänderungen" (2A),
  - Testergebnisse und Screenshots je Gerätegröße,
  - Entscheidungen D-<Nr>.
README-Abschnitte zu den Tools nur anpassen, wenn sich die Bedienung ändert.

------------------------------------------------------------------
10. NICHT TUN
------------------------------------------------------------------
- Keine neuen Abhängigkeiten, kein Bundler, kein Framework.
- Keine Änderung an Datenformaten ohne DATA_VERSION und Migration.
- Keine Unterzeilen, Minutenangaben oder Erklärsätze auf Übersichten wieder einführen
  (bewusste Entscheidung des Auftraggebers); nötige Erklärungen gehören hinter "?", in
  Erst-Hinweise oder auf die Übungsseite. Ausnahme: Der Musikpädagoge begründet eine
  Erklärung als didaktisch zwingend, dann gilt 2A.
- Kein Pfeil-Symbol auf Kacheln, die direkt starten; keine Hintergrundstreifen hinter
  angedockten Leisten.
- Nichts ändern, was weder zum Redesign gehört noch vom Musikpädagogen begründet verlangt
  wird.

------------------------------------------------------------------
11. ENTSCHEIDUNGEN OHNE RÜCKFRAGE (Standards; der Auftraggeber prüft nachträglich)
------------------------------------------------------------------
Bei jeder offenen Frage gilt der Standard unten. Alles weitere entscheidest du nach der
Rangfolge (Anweisung > Musikpädagoge > Entwurf > bestehende App) und trägst es als
"Entscheidung D-<Nr>" mit Begründung im Bericht ein.
- Mikrofon-Variante der Klatschfläche: Pegelanzeige und Mikrofon-Symbol statt Antippen.
- Einsingen: "?" öffnet ein Sheet von unten (vorhandenes Sheet-Muster der App). Das Tempo
  liegt im Zahnrad.
- Licks: Tempo-Pille links. Die Seitenknöpfe der Fußleiste sind "Schritt zurück/vor".
- Einsing-Programme: Alle in der App sichtbaren Programme bleiben sichtbar, die
  Sichtbarkeitslogik der App bleibt maßgeblich. Reihenfolge wie in der App.
- Werkzeuge (Bereich 6): nur Kopf, Fußleiste und Farben angleichen.

------------------------------------------------------------------
12. NACHTBETRIEB (läuft ohne Aufsicht, keine Rückfragen)
------------------------------------------------------------------
- Keine Fragen an den Auftraggeber, kein Warten auf Antworten, kein Rückfrage-Werkzeug.
  Fehlt eine Berechtigung: Aufgabe überspringen, im Bericht vermerken, weitermachen.
- Git: Arbeite auf einem eigenen Branch redesign/uebungen (von main). Kein Commit auf main,
  kein Merge nach main, kein Force-Push, kein Löschen von Branches oder Dateien außerhalb
  des Auftrags. Pro Bereich eigene Commit-Serie. Ist ein Push möglich: nur redesign/*-
  Branches, PR als Entwurf (Draft). Sonst lokal committen.
- Checkpoints: Führe FORTSCHRITT-UEBUNGEN-REDESIGN.md: Status je Bereich (offen / in
  Arbeit / fertig / übersprungen), nächster Schritt, getroffene Entscheidungen. Aktualisiere
  sie nach jeder Phase und jedem Commit. Wird der Kontext knapp oder bricht die Sitzung ab,
  muss ein neuer Lauf allein mit dieser Datei und dem Bericht nahtlos weitermachen können.
  Bei knappem Kontext: Stand schreiben, committen, mit frischen Subagenten weitermachen.
- Reihenfolge nach Wert: Phase 1 (Basis) -> Rhythmus -> Hören -> Singen -> Licks ->
  Einsingen -> Werkzeuge. Lieber weniger Bereiche ganz fertig als alle halb. Mindest-
  ergebnis der Nacht: Basis + Rhythmus + Hören, sauber getestet.
- Scheitern: Schlagen Tests eines Bereichs nach zwei Reparaturversuchen weiter fehl, setze
  den Bereich auf den letzten grünen Commit zurück, markiere ihn als "übersprungen" mit
  Ursache und mache mit dem nächsten Bereich weiter. Nie rote Stände stehen lassen.
- Jeder Commit muss baubar und testbar sein (Abschnitt 8), inklusive SW_VERSION.
- Morgenübersicht: Ganz oben im Bericht ein Block "Stand am Morgen": was fertig ist, was
  übersprungen wurde (mit Grund), alle Entscheidungen D-<Nr> und Inhaltsänderungen mit
  Commit-Hash, die ich prüfen soll, sortiert nach Wichtigkeit, plus wie man jeden Bereich
  zurückrollt.
