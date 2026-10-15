ARBEITSANWEISUNG — Zweites App-Design „Serious Cartoonist“ (Songs & Player)
==========================================================================
Rolle: Du bist Frontend-Entwickler dieser App (Repo bokajsukriz/choirapp, statische PWA,
kein Build, kein Bundler). Du baust ein zweites, in den Einstellungen umschaltbares
Design „Serious Cartoonist“ ein. Das heutige Design („Konfetti“) bleibt Standard und
darf sich durch deine Arbeit um keinen Pixel verändern.

Dieser Auftrag läuft AM STÜCK und OHNE Rückfragen. Stelle keine Fragen, warte auf keine
Antwort. Alles Offene entscheidest du nach Abschnitt 11 und dokumentierst es im Bericht
(Abschnitt 10).

------------------------------------------------------------------
0. ZUERST: QUELLEN LESEN, REPO-STAND FESTSTELLEN (vor jeder Änderung)
------------------------------------------------------------------
Lies: CLAUDE.md (vor allem „SW_VERSION bumpen“ und die CSP-Regel), README.md
(Dateiübersicht, Daten und Speicherorte) und diese Anweisung ganz.

Entwurf (visuelle Referenz, Claude-Artifact, Design-Leinwand; je Artboard eine
`.dc.html` unter `project/` mit allen Werten als Inline-Styles):
  https://claude.ai/artifact/51fZ8FkWTEVEAoKsxAd5HT
Maßgeblich ist NUR die unterste Reihe „C · Serious Cartoonist“. Die Reihen A (Plakat)
und B (Nachtschicht) sind verworfen.
  Stimmfarben-Songs.dc.html      Songs-Reiter
  Stimmfarben-Player.dc.html     Player, Reiter Loops (GEWÄHLTE Variante: Stimme,
                                 Tempo, Shuffle ÜBER der Zeitleiste)
  Stimmfarben-Player-B.dc.html   VERWORFENE Variante (Steuerung unter den Tasten) —
                                 nicht umsetzen
  Stimmfarben-Rec.dc.html        Player, Reiter REC
  Stimmfarben-Text.dc.html       Player, Reiter Lyrics (mit eingeklappter Steuerung)
  Stimmfarben-Notiz.dc.html      Player, Reiter Notiz
  Serious-Akzente.dc.html        Die sechs Akzentfarben samt Kontrastwerten
Die Artboards haben Regler (Tweaks): `voice` (färbt den Player-Kopf), `akzent`,
`steuerung`. Die Werte dahinter stehen im `<script data-dc-script>` jeder Datei.

Schritt 0a: Öffne das Artifact (Artifact-Werkzeug, action "read", danach die genannten
  Dateien unter `project/` einzeln mit `path` lesen). Liste die gefundenen Artboard-Titel
  im Bericht. Ist es NICHT erreichbar: trotzdem weiterarbeiten. Diese Anweisung ist
  vollständig, die Abschnitte 3–7 beschreiben jedes Element mit allen Werten. Vermerke
  es im Bericht.
Schritt 0b: Repo-Stand. Arbeite vom aktuellen `main`. Vermerke Branch und Commit-Hash
  im Bericht.
Schritt 0c: Vorher-Screenshots. Starte die App (Skill `run-choirapp`) mit Demo-Daten und
  mache im Konfetti-Design bei 390×844 Screenshots von: Songs, Player/Loops, Player/REC,
  Player/Lyrics, Player/Notiz, Setlisten, Tools, Einstellungen. Lege sie im Scratchpad ab
  (NICHT committen). Sie sind der Maßstab für die Regressionsprüfung in Abschnitt 9.

------------------------------------------------------------------
1. ZIEL
------------------------------------------------------------------
- Unter Einstellungen → „Aussehen und Sprache“ gibt es eine neue Zeile „Design“ mit zwei
  Möglichkeiten: „Konfetti“ (Standard) und „Serious Cartoonist“.
- Mit „Serious Cartoonist“ sehen die Reiter Songs und Player aus wie im Entwurf. Alle
  heutigen Funktionen bleiben erhalten und funktionieren gleich. Es kommen nur zwei neue
  Dinge dazu: ein Mini-Player über der Navigation und eine einklappbare Steuerung im
  Lyrics-Reiter.
- Setlisten, Tools, Einstellungen, Dialoge und Sheets bekommen in Serious Cartoonist nur
  die Grundwerte (Hintergrund, Flächen, Schrift, Radien, Akzentfarbe). Ein Redesign
  dieser Bereiche ist NICHT Teil des Auftrags.
- Die Akzentfarbe ist in Serious Cartoonist aus sechs eigenen Tönen wählbar (Abschnitt 3.2).
  Die Konfetti-Akzentfarbe bleibt davon unberührt gespeichert.

------------------------------------------------------------------
2. LEITPLANKEN (verbindlich)
------------------------------------------------------------------
2.1 Konfetti bleibt unverändert. Jede neue CSS-Regel gilt ausschließlich unter
    `:root[data-design="serious"]` (bzw. `[data-design="serious"] …`). Neues Markup, das
    nur Serious braucht, ist in Konfetti per CSS ausgeblendet (`display: none` unter
    `:root:not([data-design="serious"])`) oder ändert dort nachweislich nichts.
    Bestehende Konfetti-Regeln nicht umformulieren, nicht „aufräumen“.
2.2 Keine neuen Abhängigkeiten, kein Bundler, keine Build-Pipeline (CLAUDE.md).
    Hilfswerkzeuge zum Vorbereiten der Schriftdatei (z. B. fonttools) nur im
    Scratchpad, nie im Repo.
2.3 SW_VERSION: Jeder Commit, der eine Datei aus `SHELL_REQUIRED`/`SHELL_OPTIONAL`
    (sw.js) ändert, erhöht `SW_VERSION` in derselben Änderung. Neue Dateien (die Schrift)
    kommen in `SHELL_OPTIONAL`. Vor jedem `git commit`: `git diff --cached --stat` gegen
    die Liste prüfen.
2.4 CSP: index.html erlaubt `font-src 'self' data:`. Eine Schriftdatei aus dem eigenen
    Ordner ist damit erlaubt, die CSP muss nicht geändert werden. Keine externen URLs
    (kein Google-Fonts-Link).
2.5 Einstellungen liegen in IndexedDB über `saveSettings()`/`settings`, nicht in
    `localStorage`. Neue Felder bekommen Standardwerte in `DEFAULT_SETTINGS` und eine
    Prüfung in `sanitizeSettingsPatch()` (Muster: `presentTheme`, `app.js` ~Z. 17913).
    `DATA_VERSION` NICHT erhöhen: Es kommen nur neue Felder mit Standardwert dazu, die
    Bedeutung vorhandener Felder ändert sich nicht.
2.6 Texte in allen drei Sprachen in `strings.js` (de, en, pl), über `t()` bzw.
    `data-i18n`. Kein fest verdrahteter deutscher Text in neuem Markup.
2.7 Barrierefreiheit: echte `<button>`, `aria-label` an jedem Nur-Symbol-Knopf (bestehende
    Labels weiterverwenden), Touch-Ziele mindestens 44×44 px (Ausnahme: siehe 5.4),
    Textkontrast mindestens 4,5 : 1. Ausgeblendete Beschriftungen per `.visually-hidden`,
    nicht per `display: none`, wenn sie der Knopf als Namen braucht.
2.8 Tool-Seiten (uebe-lab.html, licks.html, einsingen.html, piano.html, metronom.html,
    ueben.css) und groove-lab.js bleiben unangetastet.
2.9 Kein Dark-Mode, keine weiteren Designs, keine Animationen über einfache Übergänge
    (≤ 200 ms) hinaus. `prefers-reduced-motion` respektieren, falls du Übergänge einbaust.

------------------------------------------------------------------
3. DESIGN-GRUNDWERTE (Tokens)
------------------------------------------------------------------
3.1 Flächen, Schrift, Formen — alles als CSS-Variablen unter
    `:root[data-design="serious"]`. Vorhandene Variablen umdefinieren, wo es passt
    (`--bg`, `--surface`, `--text`, `--muted`, `--radius`, `--font`, `--font-display`),
    neue nur, wo nötig (Präfix `--sc-`).

    Hintergrund App            #F6F4FB   (--bg)
    Fläche (Karten, Listen)    #FFFFFF   (--surface)
    Trennlinie in Listen       #EEEBF5
    Rand neutral (z. B. Chips) #D8D4E6
    Text                       #17151F   (--text)
    Text gedämpft              #4A4656   (--muted; 8,3 : 1 auf #F6F4FB)
    Platzhalter / Symbol leise #6A6676
    Zeitleiste Spur            #EEEBF5
    Schalter aus / Knopf hell  #F6F4FB
    Gefahr (Löschen)           #C8102E
    REC-Rot                    #E5484D, Hof #FFE3E4
    Schatten Karten            0 1px 0 rgba(23,21,31,0.05)
    Schatten schwebend         0 10px 24px rgba(23,21,31,0.22)
    Schatten Menü              0 12px 32px rgba(23,21,31,0.18), 0 0 0 1px rgba(23,21,31,0.06)
    Radien                     Karten 22–24 px · Listen 22 px · Pillen/Felder = halbe Höhe
                               (vollrund) · Player-Kopf unten 32 px · Footer-Karte 28 px ·
                               Navigation oben 26 px
    Schrift                    „Bricolage Grotesque“ (Abschnitt 4) für ALLES (Text und
                               Überschriften), Fallback: die heutige System-Schriftliste
    Gewichte                   400/600 Fließtext · 700 Knöpfe · 800 Titel
    Laufweite Titel            −0,03 em (40 px) bzw. −0,01 em (Listentitel 18 px)
    `<meta name="theme-color">` beim Umschalten auf #F6F4FB setzen, zurück auf #fff7ec.

3.2 Akzentfarben (wählbar, Standard „Indigo“). Je Ton sechs Werte:
      main  = Flächen (Schalter an, Hauptknopf, Import-Knopf)
      on    = Schrift/Symbol AUF main
      fg    = Akzent als Schrift/Symbol auf hellem Grund (aktive Navigation, Stift)
      tint  = zarte Fläche (Start/Ende-Felder, Üben-Knopf, aktive Nav-Pille, Lyrics-Quelle)
      tint2 = noch zarter (aktiver gespeicherter Loop)
      dark  = Schrift/Symbol auf tint

    id         Name       main     on       fg       tint     tint2    dark
    indigo     Indigo     #3B2BB8  #FFFFFF  #3B2BB8  #E4E1F5  #EFEEF9  #2C208A
    green      Grün       #6BCB77  #17151F  #1B6E2F  #E3F5E6  #EFF9F1  #1B6E2F
    blackberry Brombeere  #8E2463  #FFFFFF  #8E2463  #EFE0E9  #F6EDF3  #6A1B4A
    cobalt     Kobalt     #1F5BB5  #FFFFFF  #1F5BB5  #E0E8F5  #EDF2F9  #174488
    ochre      Ocker      #8A5A00  #FFFFFF  #8A5A00  #EFE8DB  #F6F2EB  #684400
    carmine    Karmin     #B4233C  #FFFFFF  #B4233C  #F4E0E4  #F9EDEF  #871A2D

    „Grün“ ist bewusst hell (= Alt-Stimmfarbe, „comic“-Wirkung). Deshalb hat es
    `on = #17151F` (Schwarz, 9,0 : 1) statt Weiß (nur 2,0 : 1) und ein dunkles `fg`.
    Verwende darum NIE fest „weiß auf Akzent“, sondern immer `on`, und für Akzentschrift
    auf hellem Grund immer `fg`, nie `main`.

    Abbildung auf die vorhandenen Variablen (siehe `applyAccentColor`, app.js ~Z. 1486):
      --accent            = main
      --accent-rgb        = main als "r,g,b"
      --accent-foreground = fg
      --accent-ink        = on      (heute: dunkle Schrift auf Akzentfläche)
      neu: --sc-accent-tint, --sc-accent-tint-2, --sc-accent-dark
    Achtung: `--surface-2` und `--line` werden heute per `color-mix` aus `--accent`
    abgeleitet. In Serious feste Werte setzen (--surface-2: #F6F4FB, --line: #EEEBF5),
    sonst färbt der Akzent alle Flächen ein.

3.3 Stimmfarben bleiben exakt wie heute (`VOICE_COLOR` in app.js): Full #F868B0,
    Sopran #4ECDC4, Alt #6BCB77, Tenor #FFD93D, Bass #A78BFA, sonstige wie dort.
    Schrift auf Stimmfarben ist immer #17151F.

------------------------------------------------------------------
4. SCHRIFT „BRICOLAGE GROTESQUE“
------------------------------------------------------------------
- Lizenz: SIL Open Font License 1.1 (Google Fonts, Repo github.com/google/fonts, Ordner
  `ofl/bricolagegrotesque`; Original: github.com/ateliertriay/bricolage).
- Datei: `fonts/bricolage-grotesque-latin.woff2` — die variable Schrift (Gewichtsachse
  400–800; die opsz-Achse darf bleiben oder auf 12–96 begrenzt werden), auf Latein
  beschnitten (gleiche `unicode-range` wie die vorhandene Baloo-2-Einbettung in
  index.html, inkl. ä/ö/ü/ß, €, „“ und Gedankenstrich), als woff2. Ziel: unter 80 KB.
  Vorgehen im Scratchpad, z. B. `pip install fonttools brotli` und
  `pyftsubset … --flavor=woff2 --unicodes=…`. Werkzeuge NICHT ins Repo.
- Einbinden NICHT als base64 in index.html (anders als Baloo 2): Die Datei soll nur
  geladen werden, wenn Serious aktiv ist. Ein `@font-face` mit `src:
  url('./fonts/bricolage-grotesque-latin.woff2') format('woff2')`,
  `font-weight: 400 800`, `font-display: swap`. Browser laden eine Schrift erst, wenn
  ein Element sie benutzt. Da nur Serious-Regeln sie nennen, lädt Konfetti sie nie.
- `./fonts/bricolage-grotesque-latin.woff2` in `SHELL_OPTIONAL` (sw.js) aufnehmen, damit
  sie offline verfügbar ist, und `SW_VERSION` erhöhen.
- THIRD-PARTY.md: Eintrag mit Name, Urheber (Mathieu Triay / Atelier Triay), Lizenz OFL
  1.1, Quelle, Hinweis „auf Latein beschnitten, als WOFF2“. Lizenztext als
  `LICENSE-bricolage-grotesque-OFL.txt` ins Hauptverzeichnis (CLAUDE.md erlaubt
  Lizenztexte dort).
- Ist die Schrift aus dieser Umgebung nicht herunterladbar (Netzwerk-Sperre): Serious
  trotzdem fertig bauen mit der System-Schriftliste als Fallback, die `@font-face`-Regel
  und den sw.js-Eintrag weglassen und das im Bericht deutlich als offenen Punkt nennen.

------------------------------------------------------------------
5. EINSTELLUNGEN UND UMSCHALTEN
------------------------------------------------------------------
5.1 Neue Felder in `DEFAULT_SETTINGS`:
      design: 'konfetti'          // 'konfetti' | 'serious'
      seriousAccent: 'indigo'     // id aus SERIOUS_ACCENTS
    `accentColor` (Konfetti) bleibt wie es ist und wird von Serious nicht angefasst.
5.2 `const SERIOUS_ACCENTS = [...]` neben `ACCENT_PRESETS` mit den sechs Einträgen aus
    3.2 (id, Name-Schlüssel, main, on, fg, tint, tint2, dark).
5.3 Eine Funktion `applyDesign()`:
    - setzt `document.documentElement.dataset.design = settings.design`,
    - setzt im Serious-Fall die Akzent-Variablen aus 3.2 (statt `applyAccentColor`),
      im Konfetti-Fall ruft sie `applyAccentColor(settings.accentColor)` wie bisher,
    - setzt `theme-color` (3.1).
    Aufrufen: beim Laden der Einstellungen (dort, wo heute `applyAccentColor` läuft,
    ~Z. 1573/1691) und in `applySettingsSideEffects()` bei `design`, `seriousAccent` oder
    `accentColor`. Möglichst früh, damit beim Start kein Konfetti-Bild aufblitzt.
5.4 UI in Einstellungen → „Aussehen und Sprache“, vor der Zeile „Akzentfarbe“:
    - Zeile „Design“ mit Segment-Umschalter [Konfetti | Serious Cartoonist] (zwei
      `<button aria-pressed>` in einer `role="group"`, wie `present-theme-picker`).
    - Die Zeile „Akzentfarbe“ zeigt je nach Design die passende Palette:
      Konfetti → wie heute `renderAccentPicker()`; Serious → sechs Farbtupfer aus
      `SERIOUS_ACCENTS` mit `aria-label` = übersetzter Name. Ein gewählter Tupfer hat
      denselben Auswahlring wie heute.
    - Neue Strings: `settings.personal.design`, `settings.designName.konfetti`,
      `settings.designName.serious`, `settings.seriousAccentName.<id>` (de/en/pl;
      „Serious Cartoonist“ bleibt in allen Sprachen englisch).
5.5 Sicherung/Wiederherstellung: Die neuen Felder laufen über den normalen
    Settings-Weg mit. Prüfe, dass `sanitizeSettingsPatch()` sie durchlässt und ungültige
    Werte verwirft (design nur aus der Liste, seriousAccent nur bekannte id).

------------------------------------------------------------------
6. ETAPPE 1 — SERIOUS-OPTIK FÜR SONGS UND PLAYER (überwiegend CSS)
------------------------------------------------------------------
Maße gelten für 390 px Breite. Seitenränder 20 px, Abstände zwischen Blöcken 12–14 px.
Ein Commit pro abgeschlossenem Teil (6.1 … 6.8) ist erwünscht.

6.1 Navigation unten (`.app-nav`): weiße Fläche, oben 26 px gerundet, kein Rand.
    Inaktiv: Symbol + Beschriftung 12 px/600 in #4A4656. Aktiv: Symbol in einer Pille
    56×30 px, Farbe tint, Symbol und Beschriftung in `fg`, Beschriftung 800.

6.2 Songs-Reiter (`#view-songs`)
    - Kopfzeile: sichtbarer Titel „Songs“ (40 px/800, −0,03 em) links; rechts zwei
      runde 48-px-Knöpfe: Feeling Lucky (`#btn-feeling-lucky`, Fläche #FFD93D,
      Würfelsymbol #17151F) und Aufnehmen (`#btn-rec-global`, Fläche #17151F, roter
      Punkt 16 px #FF5A5F). Darunter das Suchfeld: 52 px hoch, vollrund, weiß, Schatten
      wie Karten, Lupe #4A4656 links, Platzhalter „Welchen Song suchst du?“ (neuer
      String `songs.searchPlaceholderSerious` — oder den vorhandenen behalten, siehe 11).
      Umsetzung: ein neues Titel-Element als erstes Kind von `.searchbar` (in Konfetti
      ausgeblendet) und in Serious `.searchbar` als CSS-Grid mit den Bereichen
      "title lucky rec" / "search search search". Kein Verschieben der vorhandenen
      Knöpfe im DOM.
    - KEINE Begrüßungszeile, KEINE Songanzahl im Kopf.
    - Filterleiste der Sammelordner (`#filterbar`) in Serious ausblenden. `songFilter`
      dabei auf `null` halten (sonst bliebe ein unsichtbarer Filter aktiv).
    - Liste: Buchstaben-Gruppen (`.song-az-head`) als 15 px/800 #4A4656, 8 px eingerückt,
      kein Balken, nicht klebend nötig (darf klebend bleiben). Jede Gruppe ist EINE weiße
      Karte, Radius 22 px, Zeilen durch 1 px #EEEBF5 getrennt.
    - Zeile (`.list-item`): min. 58 px hoch, Innenabstand 8 px 14 px 8 px 18 px. Titel
      18 px/700, einzeilig mit Ellipse. NUR der Titel, kein Interpret.
    - Stimm-Pills (`.voice-pills`) RECHTSBÜNDIG am Zeilenende, überlappend wie heute
      (−15 px, die rechte liegt oben). Pille 22 px hoch, Innenabstand 0 8 px, vollrund,
      11 px/800, Schrift #17151F, Hintergrund Stimmfarbe, Ring
      `box-shadow: 0 0 0 2px #FFFFFF` (Kartenfarbe). Platzhalter-Song: das vorhandene
      durchgestrichene Notensymbol rechts in einer gestrichelten Kapsel 30×22 px
      (1,5 px dashed #8A8696).
    - Die Markierungen Lyrics/Notiz/Noten (`.marks`) in Serious AUSBLENDEN.
    - Import-Knopf (`.fab-add`): Kapsel 56 px hoch mit Plus + Beschriftung „Import“
      (neuer String), Fläche `main`, Schrift `on`, Schatten schwebend, unten rechts über
      dem Mini-Player. `aria-label` bleibt.
    - Leerzustand, Hinweispfeil, Sicherungs-Erinnerung: nur Grundwerte (Schrift, Farben).

6.3 Player-Kopf (`.player-head` + Setlisten-Zeile)
    - Ein farbiger Block über die volle Breite, unten 32 px gerundet, Innenabstand
      16 px 20 px 20 px. Hintergrundfarbe = Farbe der GERADE GEWÄHLTEN Stimme
      (`VOICE_COLOR[...]` der Auswahl in `#voice-select`; bei „Full“ #F868B0). Setze
      dafür in JS bei jedem Stimm- und Songwechsel `--sc-voice` am Player, CSS benutzt
      `background: var(--sc-voice)`. Ohne geladenen Song: #EEEBF5.
    - Zeile 1: Setlisten-Zeile (`#queue-toggle`, nur wenn eine Setliste läuft) als Chip:
      36 px hoch, vollrund, Fläche rgba(255,255,255,0.55), 13 px/600, Setlisten-Symbol,
      Text „Sommerfest · 3/12 · gleich: Africa“-artig (vorhandener Inhalt), Chevron.
      Aufgeklappt bleibt die heutige Liste (Hintergrund weiß, Radius 22 px).
      Rechts daneben die Lupe (`#btn-song-search`) als runder 40-px-Knopf, gleiche Fläche.
      Ohne Setliste steht die Lupe allein rechts.
    - Zeile 2: Songtitel (`#player-title`) 40 px/800, −0,035 em, Zeilenhöhe 0,98, bis zu
      zwei Zeilen. KEIN Interpret, KEINE Stimm-Pills im Kopf.
    - Der Setlisten-Block steht heute in `.player-body` unter dem Kopf. Er darf im DOM
      bleiben; erreiche die Optik mit CSS (gemeinsame Farbfläche, Kopf unten nicht
      gerundet, Setlisten-Block übernimmt die Rundung) oder verschiebe ihn per Markup in
      den Kopf, wenn das einfacher ist. Verhalten (Auf-/Zuklappen, Bearbeiten,
      ×-Knöpfe) muss gleich bleiben.

6.4 Player-Reiter (`.player-tabs`)
    - Segment-Leiste: weiße Kapsel, 4 px Innenabstand, Radius 22 px, vier gleich breite
      Felder 40 px hoch, Radius 18 px, 14 px. Aktiv: Fläche #17151F, Schrift weiß 700.
      Inaktiv: transparent, #17151F 600.
    - Beschriftungen: die VORHANDENEN Strings (`tabs.loops`, `tabs.rec`, `tabs.lyrics`,
      `tabs.notes` — heute „Loops“, „REC“, „Lyrics“, „Notes“). Der Entwurf zeigt „Rec“
      und „Notiz“; das ist nur Platzhaltertext, KEINE eigenen Strings je Design anlegen.
      Die Reiter-Symbole in Serious ausblenden. KEIN roter Punkt vor „REC“.

6.5 Player-Fuß (`.player-foot`) — gewählte Variante A
    - Weiße Karte, 12 px seitlicher Abstand, Radius 28 px, Innenabstand 14 px 16 px 12 px,
      10 px Abstand nach oben und zur Navigation.
    - Reihenfolge von oben: (1) Steuerzeile, (2) Zeitleiste, (3) Zeiten, (4) Tasten.
      Heute steht `.player-select-row` UNTER `.transport`. In Serious per Flex-`order`
      nach oben holen (kein DOM-Umbau nötig).
    - (1) Steuerzeile: `#voice-select` und `#rate-select` BLEIBEN `<select>`-Dropdowns.
      Je ein vollrundes Feld 44 px hoch, Fläche #F6F4FB, 15 px/700, eigener Chevron
      rechts (`appearance: none`). Stimme: Breite flex 1,4, links ein 14-px-Punkt in der
      Stimmfarbe mit 2-px-Ring #17151F. Tempo: flex 1, links Stoppuhr-Symbol 18 px.
      Rechts Shuffle (`#btn-shuffle`) rund 44 px, Fläche #F6F4FB; gedrückt: Fläche `main`,
      Symbol `on`.
    - (2) Zeitleiste (`#seek`): Spur 6 px #EEEBF5 vollrund; gespielter Teil #17151F;
      Loop-Bereich (`#seek-range`) 14 px hoch, tint, Ring innen 2 px `main`; A/B-Marken
      unverändert funktional, in `main`. Knopf 22 px rund, Fläche = Stimmfarbe
      (`--sc-voice`), Ring 3 px #17151F.
    - (3) Zeiten 13 px/600 #4A4656, tabellarische Ziffern.
    - (4) Tasten (`.transport`): Anfang, −10, Play, Am-Ende-Verhalten, Weiter.
      Play/Pause 72 px rund, #17151F, Symbol weiß. „−10“ als Kapsel 54×44, #F6F4FB,
      14 px/700. Übrige Symbole in 46-px-Kreisen ohne Fläche, Strich 2 px.

6.6 Reiter Loops (`#tab-panel-loops`)
    - Steuerkarte weiß, Radius 24 px, Innenabstand 12 px. EINE Zeile mit 6 px Abstand:
      Start (`#btn-loop-a`) und Ende (`#btn-loop-b`) als vollrunde Felder 46 px, flex 1,
      Fläche tint, zweizeilig: oben „Start“/„Ende“ 11 px/600 #4A4656, darunter die Zeit
      14 px/700 (falls die Zeit heute nicht im Knopf steht: `#loop-info` liefert sie;
      sonst nur die Beschriftung, siehe 11). Dann der Loop-Schalter (`#btn-loop-toggle`)
      56×34, an: `main`, Knopf weiß. Dann Speichern (`#btn-loop-save`) rund 46 px,
      #F6F4FB, Symbol DISKETTE (wie heute, kein Lesezeichen). Dann Üben
      (`#btn-loop-routine`) als KLEINER RUNDER Knopf 46 px, Fläche tint, Symbol
      (Kreispfeil) in `dark`. Die Beschriftung „Üben“ wird visuell ausgeblendet
      (`.visually-hidden`), bleibt aber Name des Knopfs.
    - Überschrift „Gespeicherte Abschnitte“ (neuer String) 14 px/800 #4A4656 über der
      Liste, nur wenn es gespeicherte Loops gibt.
    - Liste (`#loop-list`) als eine weiße Karte, Radius 22 px. Zeile 54 px: Punkt 10 px
      (aktiv `main` gefüllt, sonst 2-px-Ring #8A8696), Name 16 px (aktiv 700), Zeitraum
      13 px/600 #4A4656 rechts. Aktive Zeile Fläche tint2. Ganz rechts das VORHANDENE
      Menü (Hamburger-Symbol, `floatingMenu` mit Bearbeiten/Löschen) als runder
      44-px-Knopf. KEIN zusätzlicher „Bearbeiten“-Knopf über der Liste.
    - Aufklappmenü (`floatingMenu`, gilt überall in Serious): weiße Karte 180 px breit,
      Radius 18 px, 6 px Innenabstand, Schatten Menü; Einträge 44 px, Radius 12 px,
      15 px/600, Symbol 18 px links; „Löschen“ in #C8102E.

6.7 Reiter REC (`#tab-panel-rec`)
    - Ruhezustand: weiße Karte, Radius 24 px, Innenabstand 14 px 16 px, drei gleich
      breite Spalten: links leer, Mitte REC-Knopf (`#btn-rec-toggle`) 76 px rund, Hof
      #FFE3E4, roter Kern 46 px #E5484D; rechts Üben (`#btn-rec-routine`) als derselbe
      kleine runde 46-px-Knopf wie bei Loops.
    - In Serious AUSBLENDEN: den Erklärtext `#rec-status` im Ruhezustand („Nimm dich
      selbst auf …“) und die Beschriftung unter dem REC-Knopf (`#rec-toggle-label`,
      „Aufnehmen“). Während der Aufnahme bleiben Status-Pille, Zeit und Pegel sichtbar.
    - Überschrift „Deine Aufnahmen“ (neuer String) 14 px/800 #4A4656, nur wenn es
      Aufnahmen gibt. Liste (`#recording-list`) als weiße Karte, Radius 22 px, Zeilen
      52 px: runder Abspielknopf 36 px (Fläche = Farbe der Stimme der Aufnahme, ohne
      Stimme tint), Name 15 px/700, darunter Dauer · Datum 12 px #4A4656, rechts das
      VORHANDENE Menü (Bearbeiten, Exportieren, Löschen) als runder 40-px-Knopf. Im Menü
      steht „Exportieren“ ohne „(MP3)“ — prüfe den heutigen Text (`common.export`).
    - „Original leise mitlaufen“ (`#rec-backing`): weiße Karte, Radius 22 px; Schalter
      46×28 in `main`; Regler mit `accent-color: var(--accent)`; Versatz-Zeile darunter
      13 px #4A4656, Wert rechts 700 #17151F.
    - Nach dem Stopp (Take zuschneiden, „Speichern unter“): nur Grundwerte, kein
      Redesign.

6.8 Reiter Lyrics (`#tab-panel-lyrics`) und Notiz (`#tab-panel-notes`)
    - Lyrics-Werkzeugleiste: links Quelle Chor/Eigener als Segment (weiße Kapsel,
      aktiv: Fläche tint, Schrift `dark` 700), daneben A−/A+ als Segment gleicher Art,
      rechts Bearbeiten (`#btn-lyrics-note-edit`) als KLEINER RUNDER 40-px-Knopf, weiß,
      nur Stift-Symbol in `fg`; Beschriftung visuell ausgeblendet, `aria-label` bleibt.
      Seine heutige Sichtbarkeitslogik (nur beim eigenen Text) bleibt.
    - Liedtext 17 px, Zeilenhöhe 1,5, #17151F. Vollbild-Knopf (`#btn-lyrics-present`)
      rund 54 px, #17151F, Symbol weiß, Schatten schwebend, unten rechts über dem Fuß.
    - Notiz: „Noten verfügbar“ (`#btn-scores-hint`) als weiße Karte 60 px, Radius 22 px:
      links Symbolkachel 40 px (Radius 14 px, tint, Notensymbol in `main`), Titel
      16 px/700, darunter Anzahl der PDFs 13 px #4A4656, rechts Chevron. Notizfeld
      (`#note-text`) weiß, Radius 22 px, Innenabstand 16 px 18 px, 16 px/1,5, innerer
      Ring 2 px tint, ohne Rahmen. Darunter Hinweis „Wird automatisch gespeichert.“
      (neuer String, 12 px #4A4656) — nur wenn das Speichern heute wirklich automatisch
      läuft (prüfen; sonst weglassen und im Bericht nennen).

------------------------------------------------------------------
7. ETAPPE 2 — ZWEI NEUE BAUSTEINE (Markup + JS, nur in Serious sichtbar)
------------------------------------------------------------------
7.1 Mini-Player über der Navigation (Songs-Reiter; darf auch in Setlisten/Tools
    erscheinen, NICHT im Player-Reiter selbst):
    - Sichtbar, sobald ein Song geladen ist. 64 px hoch, 12 px seitlich, Radius 22 px,
      Fläche = aktuelle Stimmfarbe (`--sc-voice`), Schrift #17151F.
    - Inhalt: NUR der Songtitel (18 px/800, Ellipse) — keine Stimme, kein Tempo, kein
      Status-Text. Rechts ein runder 48-px-Knopf #17151F mit Play/Pause in Weiß.
    - Tipp auf die Fläche öffnet den Player-Reiter (derselbe Weg wie der Nav-Knopf
      „Player“). Tipp auf Play/Pause steuert dieselbe Wiedergabe wie `#btn-play`
      (dieselbe Funktion aufrufen, keinen zweiten Wiedergabeweg bauen). Symbol und
      `aria-label` folgen dem Wiedergabezustand.
    - Als echtes `<a>`/`<button>` mit `aria-label` „Player öffnen: <Titel>“ (neuer
      String). Der Import-Knopf und andere schwebende Elemente rücken darüber.
7.2 Einklappbare Steuerung im Lyrics-Reiter:
    - Wenn in Serious der Reiter Lyrics aktiv ist, zeigt der Fuß nur eine Zeile: Play
      54 px rund (#17151F), daneben Zeitleiste (Spur 6 px, Knopf 18 px) mit Zeiten
      12 px darunter, rechts ein runder 40-px-Knopf mit Chevron nach oben
      (`aria-expanded`, `aria-label` „Alle Steuerelemente zeigen“, neuer String).
    - Tipp auf den Chevron klappt den vollen Fuß (6.5) aus, erneuter Tipp wieder ein.
      Beim Reiterwechsel gilt wieder der volle Fuß. Der Zustand muss nicht gespeichert
      werden.
    - Umsetzung bevorzugt per Klasse am Fuß (`.player-foot--compact`) und CSS, mit
      möglichst wenig neuem Markup (der Chevron-Knopf ist neu).

------------------------------------------------------------------
8. SELBSTTESTS
------------------------------------------------------------------
In `runSelfTests()` (app.js) ergänzen, nach dem Muster von „AP-05“:
- Für jeden Eintrag in `SERIOUS_ACCENTS`: Kontrast `on` auf `main` ≥ 4,5 : 1,
  `fg` auf #FFFFFF und auf #F6F4FB ≥ 4,5 : 1, `dark` auf `tint` ≥ 4,5 : 1.
- `sanitizeSettingsPatch({ design: 'xyz' })` liefert kein `design`;
  `{ design: 'serious', seriousAccent: 'green' }` geht durch; unbekannte
  `seriousAccent` wird verworfen.
- Nach `applyDesign()` mit design 'konfetti' trägt `<html>` `data-design="konfetti"`,
  und `--accent` entspricht `settings.accentColor` (Konfetti unverändert).
Alle bisherigen Selbsttests müssen weiter grün sein.

------------------------------------------------------------------
9. PRÜFEN (vor jedem Push)
------------------------------------------------------------------
- App mit Skill `run-choirapp` starten, Demo-Daten importieren, Playwright bei 390×844.
- Konfetti-Regression: dieselben Screenshots wie in 0c erneut aufnehmen und
  pixelgenau vergleichen (z. B. per Bildvergleich im Scratchpad). Jede Abweichung ist ein
  Fehler, außer der neuen Einstellungszeile „Design“.
- Serious: Screenshots von Songs, Player/Loops (mit gespeicherten Loops, ein Menü
  geöffnet), Player/REC (mit zwei Aufnahmen), Player/Lyrics (eingeklappt und
  ausgeklappt), Player/Notiz, Mini-Player, Einstellungen. Jeweils mit Akzent Indigo und
  Grün, Stimme Alt und Bass. Neben die Artboards legen und Abweichungen beheben.
- Funktionen in Serious durchklicken: Song öffnen, Stimme und Tempo per Dropdown
  wechseln (Kopf färbt sich um), Shuffle, Loop A/B setzen, an/aus, speichern, umbenennen,
  löschen, Üben starten/beenden, REC aufnehmen/abbrechen/speichern/exportieren/löschen,
  Lyrics-Quelle wechseln, Schriftgröße, eigenen Text bearbeiten, Vollbild-Anzeige,
  Notiz tippen, Noten öffnen, Setliste mit Warteschlange, Mini-Player Play/Pause und
  Sprung zum Player, Umschalten zurück auf Konfetti ohne Neuladen.
- `runSelfTests()` in der Konsole: alles grün.
- Offline-Test: Service Worker aktiv, Netzwerk aus, Serious neu laden — Schrift
  vorhanden (Network-Tab bzw. `document.fonts.check('16px "Bricolage Grotesque"')`).
- `git diff --cached --stat` gegen SHELL-Listen, SW_VERSION erhöht?

------------------------------------------------------------------
10. ABGABE, BERICHT, ARCHIV
------------------------------------------------------------------
- Ein Branch, mehrere sinnvolle Commits (Grundlagen+Einstellungen, Schrift, 6.x, 7.x,
  Tests). PR gegen `main`, nicht als Entwurf.
- Bericht `BERICHT-SERIOUS-CARTOONIST.md` mit: Basis (Branch/Hash), Artboard-Liste
  (0a), was umgesetzt ist (je Abschnitt 5–8 ein Satz), alle Entscheidungen nach
  Abschnitt 11, offene Punkte, Schriftgröße der woff2-Datei, Ergebnis der
  Konfetti-Regression und der Selbsttests. Screenshots NICHT committen; im PR-Text
  beschreiben, was zu sehen ist.
- Ist alles erledigt: diese Anweisung und den Bericht in derselben PR nach
  `docs/archiv/` verschieben (CLAUDE.md).
- README.md: kurzer Absatz „Designs“ (Konfetti/Serious Cartoonist, Einstellungsfelder
  `design`/`seriousAccent`, Schriftdatei) an passender Stelle.

------------------------------------------------------------------
11. ENTSCHEIDUNGSREGELN BEI UNKLARHEIT
------------------------------------------------------------------
- Funktion schlägt Optik: Lässt sich ein Entwurfsdetail nur umsetzen, indem eine
  Funktion wegfällt oder anders reagiert, behalte die Funktion und weiche optisch so
  wenig wie möglich ab. Im Bericht nennen.
- Konfetti schlägt alles: Würde eine Änderung Konfetti verändern, findest du einen
  anderen Weg (Selektor einschränken, Element nur in Serious einblenden).
- Texte: Vorhandene Strings weiterverwenden, wenn sie passen. Neue Strings nur für
  wirklich neue Texte, immer in de/en/pl.
- Fehlt im Entwurf ein Zustand (Fehler, leer, lädt, Aufnahme läuft): Grundwerte aus 3.1
  auf die heutige Darstellung anwenden, nichts erfinden.
- Werte im Entwurf und in dieser Anweisung widersprechen sich: diese Anweisung gilt.
- Zeitdruck: Etappe 1 vollständig vor Etappe 2. Lieber 7.2 als offenen Punkt melden als
  halb umsetzen.

------------------------------------------------------------------
12. NICHT-ZIELE
------------------------------------------------------------------
- Kein Redesign von Setlisten, Tools, Einstellungen, Import, Onboarding, Dialogen,
  Lichtshow, Vollbild-Textanzeige (nur Grundwerte, wo sie automatisch greifen).
- Keine Änderung an Tool-Seiten, groove-lab.js, lightshow.js.
- Keine neue Datenmigration, kein `DATA_VERSION`.
- Keine Umbenennung oder Neuordnung bestehender Funktionen, IDs oder Klassen.
