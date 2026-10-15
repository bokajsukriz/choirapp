# Bericht — Zweites Design „Serious Cartoonist“

## Basis
- Branch `ch/gifted-volta-fryzk8`, gestartet von `main` @ `b3c7f0b`.
- Die Arbeitsanweisung lag nicht auf `main`, sondern auf `origin/ch/loving-hypatia-buo4ob` (Commit `f0af818`); sie wird hier mit nach `docs/archiv/` übernommen.

## Entwurf (Schritt 0a)
Artifact war erreichbar. Gefundene Artboards der Reihe „C · Serious Cartoonist“: Songs, Loops (gewählt: Steuerung über der Zeitleiste), Loops (verworfen: Steuerung unter den Tasten), REC, Lyrics, Notiz, Akzentfarben. Gelesen und umgesetzt wurden Songs, Player (Loops), Lyrics, Notiz, Akzente; REC nach Anweisung 6.7.

## Umgesetzt
- **5 Einstellungen:** `design`/`seriousAccent` in `DEFAULT_SETTINGS`, `SERIOUS_ACCENTS`, `DESIGNS`, `applyDesign()` (setzt `data-design`, Akzent-Variablen, `theme-color`; beim Zurückschalten werden `--accent-ink` und `--sc-*` entfernt), Zeile „Design“ (Segment) und je Design passende Akzentpalette, `sanitizeSettingsPatch()`, Sicherung exportiert beide Felder. Strings in de/en/pl. `DATA_VERSION` unverändert.
- **3/4 Tokens und Schrift:** alle Serious-Regeln stehen gesammelt am Ende des `<style>`-Blocks unter `:root[data-design="serious"]`. Schrift `fonts/bricolage-grotesque-latin.woff2` (variabel, Gewicht 400–800, opsz 14–48, Breite fest 100, Latein + Latein-Erweiterung A) = **73 328 Byte**, in `SHELL_OPTIONAL`, `THIRD-PARTY.md` und `LICENSE-bricolage-grotesque-OFL.txt` ergänzt. Konfetti lädt die Schrift nie (geprüft: keine woff2-Anfrage), Serious lädt sie auch offline aus dem Cache (geprüft mit aktivem Service Worker und Netz aus: `document.fonts.check` = true).
- **6 Etappe 1:** Navigation, Songs-Kopf/Liste/Import-Knopf, Player-Kopf in Stimmfarbe, Reiter, Fuß (Steuerzeile oben), Loops, REC, Lyrics, Notiz.
- **7 Etappe 2:** Mini-Player über der Navigation (Titel, Play/Pause ruft den Klick von `#btn-play` auf, Tipp öffnet den Player); einklappbarer Fuß im Lyrics-Reiter (`.player-foot--compact`, Chevron).
- **8 Selbsttests:** Kontraste der sechs Akzente, `sanitizeSettingsPatch`, `applyDesign` im Konfetti-Fall. `runSelfTests()` und die Async-/Audio-/Worker-Tests laufen grün.

## Entscheidungen (Abschnitt 11)
- **Setlisten-Zeile im Kopf:** `applyDesign()` hängt `#queue-block` bei Serious per DOM in `.player-head` um und beim Zurückschalten wieder an den alten Platz (Ids und Verhalten gleich). Aufgeklappt hat die Liste eine Höchsthöhe (45 vh) mit eigenem Scrollen.
- **Titel ohne Interpret:** `displayTitle()` — Serious zeigt in Songliste, leerem Player, Kopf und Mini-Player nur den Titel; ein Designwechsel zeichnet die Liste neu. `songFilter` wird in Serious auf `null` gehalten.
- **Start/Ende-Knöpfe:** Zeiten in zwei neuen, in Konfetti ausgeblendeten Spans (`.loop-time`); `#loop-info` bleibt als visuell verstecktes Hilfetext-Element erhalten.
- **Reiterbeschriftungen:** vorhandene Strings (Loops, REC, Lyrics, Notes), keine eigenen je Design.
- **REC:** Erklärtext und Beschriftung unter dem REC-Knopf sind im Ruhezustand visuell versteckt (bleiben für Screenreader). Der Wiederholen-Knopf je Aufnahme bleibt (Funktion schlägt Optik); die Metazeile zeigt wie bisher „Dauer · Stimme“, nicht das Datum. Menüeintrag „Exportieren“ lautet bereits ohne „(MP3)“.
- **Notiz:** Hinweis „Wird automatisch gespeichert.“ steht dort, weil das Speichern tatsächlich automatisch läuft.
- **Noten-Hinweis:** Anzahl der PDFs (neue Strings `scores.hintCountOne/Many`); Symbol in `fg` statt `main` (Regel „Akzentschrift auf hellem Grund immer fg“).
- **Chevron im Lyrics-Fuß:** im ausgeklappten Zustand sitzt der Chevron als kleiner Griff an der oberen Kante der Fußkarte, damit sich wieder einklappen lässt.
- **Liedtext** links ausgerichtet (Entwurf) statt zentriert.
- **Seitenrand:** Serious setzt `--pad` nicht um (Tools/Einstellungen behalten ihre Breite, sonst brachen Kachelnamen um); 20 px Rand nur in Songs und Player.
- **Schrift:** zusätzlich Latein-Erweiterung A (Polnisch), sonst fiele ą/ę/ł auf die System-Schrift zurück; opsz auf 14–48 begrenzt, damit die Datei unter 80 KB bleibt.
- **Flackern beim Start:** Einstellungen liegen in IndexedDB (asynchron), ein Serious-Nutzer sieht deshalb vor dem Laden der Einstellungen kurz das Konfetti-Bild. Ein `localStorage`-Spiegel wäre nach CLAUDE.md nicht erlaubt.

## Offene Punkte
- Der Aufnahme-Zustand (läuft/Take zuschneiden) hat nur die Grundwerte; ein Screenshot mit echtem Mikrofon war in der Umgebung nicht möglich.
- Setlisten, Tools, Einstellungen, Dialoge: nur Grundwerte (wie beauftragt).

## Prüfung
- Konfetti-Regression: 13 Vorher/Nachher-Screenshots (390×844) pixelgleich bis auf die neue Zeile „Design“ in „Aussehen und Sprache“ (`settings-appearance`).
- Durchgeklickt in Serious (Playwright): Song öffnen, Stimmwechsel färbt den Kopf, Tempo, Shuffle, Loop A/B/Schalter/Speichern, REC-Liste, Lyrics-Quelle/Schrift/Bearbeiten/Vollbild, Notiz, Fuß ein-/ausklappen (zurückgesetzt beim Reiterwechsel), Mini-Player (Titel, Sprung zum Player, im Player versteckt), Zurückschalten auf Konfetti und wieder Serious ohne Neuladen, Akzent Grün.
