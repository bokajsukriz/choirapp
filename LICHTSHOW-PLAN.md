# Arbeitsanweisung — Lichtshow (4 Shows, uhrzeitsynchron)

Adressat: Sonnet (Folge-Session). Grundlage: Nutzerwunsch „Unter Einstellungen
ein Bereich *Lichtshow* mit 4 Shows; im Vollbild eine synchronisierte Lichtshow,
abhängig von der eigenen Stimmgruppe, als kleine Bühnen-Einlage. Die Handys
können nicht miteinander reden, also läuft alles über die Systemzeit.“

Gegengeprüft am Stand `0682d79` von `index.html` (13 000+ Zeilen), `sw.js`,
`README.md`. **Immer über Funktions- und ID-Namen ansteuern, nie über
Zeilennummern.**

---

## 0. Rahmenbedingungen (gelten für jeden Schritt)

1. **Branch:** `claude/lichtshow-feature-q2ghr2`. Nicht auf `main` pushen.
2. **Kein Build-Schritt, keine Abhängigkeiten.** Die App bleibt eine statische
   PWA von GitHub Pages. Keine `package.json`, kein Bundler, keine externen
   Ressourcen zur Laufzeit, keine neuen Dateien außer dieser Doku.
3. **Keine einzige Netzwerkanfrage.** Das ist im `README.md` als Zusage an die
   Nutzer festgeschrieben („die App stellt keinerlei Netzwerkanfragen“). Ein
   NTP-/HTTP-`Date`-Header-Abgleich zur Uhrzeitkorrektur ist deshalb
   **ausgeschlossen**, auch wenn er technisch reizvoll wäre. Siehe Abschnitt 1.
4. **`SW_VERSION` in `sw.js` erhöhen** (`'v100'` → `'v101'`), genau **einmal am
   Ende**, nicht pro Commit.
5. **Codestil beibehalten:** deutschsprachige Kommentare im Ton der Datei
   (erklären *warum*, nicht *was*), 2 Leerzeichen Einrückung, keine
   Umformatierung fremder Zeilen, keine Umbenennungen „bei der Gelegenheit“.
6. **Keine Modularisierung.** Alles neue geht in `index.html` an die
   thematisch passende Stelle (eigener Abschnittskommentar-Block
   `/* ===== LICHTSHOW ... */` im Stil der bestehenden Blöcke).
7. **Syntaxprüfung nach jeder Änderung:**
   `node -e "const s=require('fs').readFileSync('index.html','utf8'); const m=s.match(/<script>([\s\S]*)<\/script>\s*<\/body>/); new (require('vm').Script)(m[1]);"`
   und `node --check sw.js`.
8. **Ein Commit je Arbeitspaket** (L1 … L9), englische Betreffzeile im Imperativ
   wie in der Historie.
9. Am Ende **einmal pushen** (`git push -u origin claude/lichtshow-feature-q2ghr2`).
   **Keinen Pull Request eröffnen**, solange der Nutzer nicht danach fragt.

---

## 1. Machbarkeit — die Entscheidungen sind gefallen, bitte nicht neu aufrollen

Diese Analyse ist Teil der Anweisung, damit du sie nicht wiederholst.

### 1.1 Ist Synchronität über die Systemzeit realistisch? — Ja, mit Auflagen

- Android und iOS stellen die Uhr automatisch (NTP bzw. Mobilfunk-Zeit), wenn
  „Datum & Uhrzeit automatisch“ an ist — das ist die Werkseinstellung. Typische
  Abweichung solcher Geräte gegen die echte Zeit: **einige zehn bis wenige
  hundert Millisekunden**.
- Der Quarzgang eines Handys driftet in der Größenordnung 1–2 ppm, also rund
  **0,1 s pro Tag** ohne neuen Abgleich. Für einen Konzertabend im Flugmodus
  irrelevant.
- `Date.now()` liefert Millisekunden ohne nennenswerte Verfälschung durch
  Browser-Schutzmaßnahmen (anders als `performance.now()`, das gerundet wird —
  für uns egal, wir brauchen es nur für Differenzen).
- **Der Ausreißer ist der Normalfall:** In einem Chor mit 40 Handys gibt es
  erfahrungsgemäß ein bis zwei Geräte mit manuell gestellter Uhr, die **Sekunden**
  danebenliegen. Genau dafür gibt es das Sync-Prüfbild und den Handversatz
  (Abschnitt 6).

**Konsequenz für den Entwurf — verbindlich:**

- Es gibt **keinen Startzeitpunkt und keine Nachricht zwischen Geräten**. Das
  Bild ist eine **reine Funktion der Zeit**: `Farbe = f(Zeit mod Zykluslänge,
  Stimmgruppe)`. Wer später einsteigt, ist sofort in Phase. Wer die App
  neu lädt, ebenso.
- Der Zyklus ist **auf die Unix-Epoche gerastert** (`t % cycleMs`), nicht auf
  den Moment des Antippens. Antippen entscheidet nur, *ob* das Handy mitmacht.
- **Weiche Kanten schlagen harte Schnitte.** Bei ±200 ms Uhrfehler wirkt jede
  Blende ab etwa 500 ms Dauer synchron; ein harter Schnitt wird als „Welle“
  durch den Chor sichtbar. Deshalb: Blenden ≥ 400 ms, harte Schnitte nur an
  wenigen, dramaturgisch gewollten Stellen (Show 4).
- Shows, die von vornherein keine Gleichzeitigkeit behaupten (Show 3,
  Sternenhimmel), sind die sichere Bank für den ersten Auftritt.

### 1.2 Kostet das Leistung? — Praktisch nein, wenn so gebaut

- Gemalt wird **eine einzige bildschirmfüllende Fläche**. Pro Bild wird
  höchstens eine `style.backgroundColor` gesetzt. Das ist ein Vollflächen-Fill,
  auf jedem Handy der letzten zehn Jahre unter 1 % CPU.
- **Verboten**, weil teuer und unnötig: `filter: blur()`, animierte
  `box-shadow`, Canvas mit Pixelschleifen, viele DOM-Knoten, `setInterval`
  parallel zu `requestAnimationFrame`, Neuberechnung von Layout im Frame.
- Der Wert wird nur geschrieben, **wenn er sich gegenüber dem letzten Frame
  tatsächlich geändert hat** (String-Vergleich). Bei langsamen Blenden spart das
  einen Großteil der Schreibzugriffe.
- Die Schleife ist **zustandslos**: jeder Frame rechnet aus der Uhr, nichts
  akkumuliert. Ausgelassene Frames (Thermal Throttling, Benachrichtigung)
  führen deshalb zu keinem Nachlaufen, das Bild ist beim nächsten Frame
  wieder exakt richtig.
- Der echte Verbrauch ist die **Bildschirmhelligkeit**, nicht die Rechenlast.
  Weißflächen auf OLED ziehen spürbar Strom. Deshalb: Shows dauern 30–60 s pro
  Zyklus, und im Hinweistext steht, dass die Helligkeit **von Hand** hochgezogen
  werden muss — eine Web-API dafür gibt es nicht.
- Wake Lock verhindert das Sperren; das Nachdunkeln mancher Android-Geräte
  lässt sich nicht verhindern und wird im Hinweistext erwähnt.

### 1.3 Bewusst nicht umgesetzt (nicht „verbessern“)

- **Kein NTP, kein `Date`-Header-Abgleich, kein Backend** → Zusage aus dem README.
- **Kein Web Bluetooth / Web Audio-Chirp / QR-Code-Sync.** Zu viel Fläche für
  eine Bühnen-Einlage von 60 Sekunden.
- **Kein Taschenlampen-Blitz** (`torch`-Constraint): nur Chrome/Android, verlangt
  Kamerarechte, und die App fragt sonst keine an.
- **Kein fünfter Reiter in der Hauptnavigation.** Die Leiste hat vier Einträge
  und passt bei 320 px Breite schon knapp (siehe CSS-Kommentar bei `.app-nav`).
  Die Lichtshow bekommt eine **Karte in den Einstellungen** plus eine **eigene
  Vollbild-Unteransicht**, genau wie „Songs importieren“ (`#import-view`).
  Der Nutzer hat „Reiter“ gesagt und meint diesen Einstieg; wenn er später
  einen echten Navigationsreiter will, sagt er es.

---

## 2. L1 — Datenmodell und reine Show-Funktionen

Neuer Abschnitt in `index.html`, direkt **nach** dem Block `VOICES — Stimmen,
Reihenfolge und Anzeigenamen` (die Shows bauen auf `VOICE_COLOR` auf).

### 2.1 Konstanten

```js
/* Reihenfolge bestimmt den Versatz in „Welle“ und „Finale“: von oben nach
   unten durch den Chor, wie man ihn auch aufstellt. */
const LIGHTSHOW_VOICES = ['SOP', 'ALT', 'TEN', 'BASS'];
```

`lightshowVoiceIndex(voice)` → Position in `LIGHTSHOW_VOICES`, unbekannte oder
fehlende Stimme (`LEAD`, `null`) → `0`.
`lightshowVoiceColor(voice)` → `VOICE_COLOR[voice] ?? VOICE_COLOR.FULL`.
So bekommt eine Solistin ohne SATB-Stimme das Marken-Pink und läuft im Takt der
Soprane mit, statt gar nicht zu leuchten.

### 2.2 Show-Register

```js
const LIGHTSHOWS = [
  { id: 'sterne', cycleMs: 40000, sync: 'unkritisch' },
  { id: 'puls',   cycleMs: 24000, sync: 'hoch' },
  { id: 'welle',  cycleMs: 32000, sync: 'mittel' },
  { id: 'finale', cycleMs: 32000, sync: 'empfindlich' },
];
```

`sync` ist reine Anzeige-Information für die Auswahlliste (siehe L3), damit
klar ist, welche Show einen schiefen Uhrenpark verzeiht. Reihenfolge in der
Liste = aufsteigende Empfindlichkeit; die sichere Bank steht oben.

### 2.3 Farbhelfer (rein, ohne DOM)

- `lightshowScale(hex, b)` — jeder Kanal `* b`, `b` in `[0,1]`, Ergebnis
  `'#rrggbb'`. Kein Gamma-Gerechne, die schlichte Multiplikation sieht auf der
  Bühne richtig aus und ist billig.
- `lightshowMix(hexA, hexB, f)` — lineare Mischung, `f` in `[0,1]`.
- Beide runden auf ganze Bytes und geben immer sechs Hexstellen zurück, damit
  der String-Vergleich im Frame greift.

### 2.4 Die Show-Funktion

**Eine einzige reine Funktion, die alles entscheidet:**

```js
/**
 * Bildinhalt einer Show zu einem Zeitpunkt — rein, ohne DOM, ohne Date,
 * ohne Math.random. Genau das macht sie testbar (siehe runSelfTests) und
 * sorgt zugleich dafür, dass zwei Handys mit derselben Uhr zwangsläufig
 * dasselbe zeigen.
 *
 * @param {string} showId  aus LIGHTSHOWS
 * @param {number} tMs     Millisekunden seit Zyklusbeginn, 0 <= tMs < cycleMs
 * @param {string} voice   'SOP' | 'ALT' | 'TEN' | 'BASS' | …
 * @param {number} seed    geräteeigener Zufallskeim (nur Show „sterne“)
 * @returns {string}       Hintergrundfarbe '#rrggbb'
 */
function lightshowFrame(showId, tMs, voice, seed) { … }
```

Verbindliche Rezepte — bitte genau so, nicht „schöner“ erfinden:

**a) `sterne` — Sternenhimmel (Zyklus 40 000 ms).**
Braucht *keine* Synchronität und ist deshalb die erste Show in der Liste.
Zeitschlitze von 800 ms: `n = Math.floor(tMs / 800)`. Ein deterministischer
32-Bit-Mix aus `seed` und `n` (z. B. Wang/xorshift-Mix, keine `Math.random`)
entscheidet, ob dieses Gerät in diesem Schlitz funkelt (etwa jeder vierte
Schlitz) und wie hell (0,45 … 1,0). Innerhalb des Schlitzes 250 ms Aufblende,
250 ms Abblende, dazwischen Halten. Grundton: Stimmfarbe bei 6 % Helligkeit,
damit auch die dunklen Momente ein Farbfeld ergeben und nicht schwarz wirken.
Effekt: ein flirrender Sternenhimmel, in dem jede Stimmgruppe ihre eigene Farbe
hat — schön, auch wenn eine Uhr zwei Sekunden falsch geht.

**b) `puls` — Herzschlag (Zyklus 24 000 ms).**
Grundschlag 2000 ms. Jede Gruppe läuft um `index * 500 ms` versetzt, so rollt der
Schlag sichtbar von Sopran zu Bass durch den Chor. Pro Schlag ein
Herzschlag-Doppel: Hauptschlag bei Phase 0, kleinerer Nachschlag (Faktor 0,55)
bei Phase 0,22. Jeder Schlag ist eine weiche Glocke (`sin`-Kuppe, aufsteigende
Flanke ≥ 400 ms), niemals ein Rechteck. Über den Zyklus wächst die Amplitude
linear von 0,35 auf 1,0 und fällt in den letzten 3000 ms wieder auf 0,2 —
so hat die Show einen Bogen statt nur zu blinken. Farbe: Stimmfarbe, in der
Spitze zu 30 % Richtung Weiß gemischt.

**c) `welle` — Welle (Zyklus 32 000 ms).**
0 … 28 000 ms: sieben Wellendurchläufe à 4000 ms. Position
`p = (tMs % 4000) / 4000`, Gruppenphase `φ = index / 4`. Abstand `d` als
kürzeste Distanz auf dem Kreis (`0 … 0,5`), Helligkeit
`b = max(0, 1 - d / 0.28) ** 1.6`. Ergebnis: ein Lichtband, das immer wieder von
Sopran nach Bass durch die Reihen läuft.
28 000 … 32 000 ms: alle gemeinsam, eine einzige weiche Atmung nach Weiß
(2000 ms auf, 2000 ms ab) als Abbinder.

**d) `finale` — Finale (Zyklus 32 000 ms).**
Die einzige Show mit harten Schnitten, deshalb als empfindlich markiert.
- 0 … 12 000 ms: Gruppen-Jagd im 500-ms-Raster, immer genau eine Gruppe hell
  (Stimmfarbe voll, sonst Stimmfarbe bei 5 %). Pro Gerät ist das 0,5 Hz — die
  Blitzgrenze aus Abschnitt 9 ist eingehalten.
- 12 000 … 24 000 ms: alle gemeinsam im 1000-ms-Puls, Amplitude linear steigend,
  Farbe zunehmend Richtung Weiß.
- 24 000 … 28 500 ms: alle voll Weiß, stehend. Das ist der Höhepunkt und der
  einzige echte Gleichzeitigkeits-Moment der ganzen Funktion.
- 28 500 … 32 000 ms: Blende nach Schwarz.

Alle vier Funktionen müssen bei `tMs = 0` und bei `tMs = cycleMs - 1` sauber
aneinanderpassen (kein sichtbarer Sprung beim Zyklusübergang) — das prüft L7.

---

## 3. L2 — Einstellungen: neue Schlüssel und die Karte

### 3.1 `DEFAULT_SETTINGS` ergänzen

```js
  lightshowOffsetMs: 0,       // Handversatz der Geräteuhr in ms (siehe Sync-Prüfbild)
  lightshowVoice: null,       // null = automatisch aus myVoices
  lightshowShow: 'sterne',    // zuletzt gewählte Show
  lightshowSeed: 0,           // geräteeigener Keim für „Sternenhimmel“, 0 = noch keiner
```

`lightshowSeed` wird beim ersten Öffnen der Ansicht einmalig gezogen
(`crypto.getRandomValues`) und gespeichert — er darf sich nie wieder ändern,
sonst funkelt dasselbe Handy bei jedem Start anders. `lightshowOffsetMs` wird
beim Laden auf `[-5000, 5000]` geklemmt, damit eine kaputte Sicherung keine
absurden Werte einschleppt.

Die Schlüssel gehören auch in die Sicherung: prüfe `createBackup()` /
`restoreBackup()` bzw. die Stelle, an der `myVoices`/`lyricsFontSize` in den
Sicherungssatz geschrieben werden, und nimm die vier Schlüssel dort mit auf.

### 3.2 Karte in `#view-settings`

Neue `<div class="card">` **direkt nach der Karte „Meine Stimmen“** — sie hängt
inhaltlich an der Stimmwahl. Aufbau wie die Nachbarkarten (das Akkordeon aus
`initSettingsAccordion()` greift automatisch, weil es alle
`#view-settings > .card` einsammelt; nichts daran ändern):

- `<h2>` mit `class="card-icon"`-SVG (Vorschlag: Glühbirne oder Funken, im
  vorhandenen Strichstil, `stroke-width="1.8"`) und
  `<span data-i18n="settings.lightshow.title">Lichtshow</span>`.
- `<p class="small muted" data-i18n="settings.lightshow.hint">` mit zwei Sätzen:
  wofür das gut ist, und dass die Show nach der eigenen Stimme leuchtet.
- `<button class="btn btn--primary btn--block" id="btn-open-lightshow">` →
  `navigate('#lightshow')`.

---

## 4. L3 — Vollbild-Unteransicht `#lightshow`

Vorbild ist **`#import-view`**: eigenes `<section class="player" id="lightshow-view" hidden>`
als direktes Kind von `<body>`, mit Kopfzeile und echtem Zurück-Knopf.

### 4.1 Router

In `applyRoute()` analog zum bestehenden `import`-Zweig:

```js
  if (name === 'lightshow') {
    if (openPlaylist) closePlaylistView();
    openLightshowView();
    return;
  }
  if (lightshowViewOpen) closeLightshowView();
```

Reihenfolge beachten: der Zweig steht neben dem `import`-Zweig, das Schließen
neben `if (importOpen) closeImportView();`. Zurück-Knopf ruft `history.back()`,
genau wie `#import-back`.

`closeLightshowView()` muss eine laufende Bühne mit beenden (siehe L4) — auch
wenn der Nutzer die Browser-Zurück-Geste benutzt.

### 4.2 Inhalt der Ansicht

1. **Stimmzeile.** „Du leuchtest als **Bass**“ mit einem Farbpunkt in
   `VOICE_COLOR.BASS`. Quelle: `settings.lightshowVoice ?? settings.myVoices[0]`.
   Darunter eine `preset-row`/`chip-grid` mit `SOP ALT TEN BASS`, mit der man die
   Stimme **für die Show** überschreiben kann (schreibt `lightshowVoice`) —
   wer zwei Stimmen singt, muss auf der Bühne eine festlegen, und wer die Reihe
   wechselt, soll dafür nicht die Import-Einstellung anfassen müssen.
   Ist `myVoices` leer und nichts gewählt: Hinweisbanner-Text in der Ansicht,
   Startknöpfe bleiben nutzbar (Fallback Sopran-Timing, Pink), aber der
   Hinweis nennt „Einstellungen → Meine Stimmen“.
2. **Vier Show-Kacheln** (eine Liste von `<button>`, kein `<select>`): Name,
   ein Satz Beschreibung, Dauer, und ein kleiner Vorschau-Farbverlauf in der
   eigenen Stimmfarbe. Dazu ein `small muted`-Zusatz mit der
   Uhr-Empfindlichkeit aus `LIGHTSHOWS[].sync` („verzeiht schiefe Uhren“ …
   „braucht gut gestellte Uhren“).
3. **Startknopf** je Kachel bzw. ein gemeinsamer `btn--primary` unter der
   Auswahl: „Show starten“.
4. **Schalter „Probelauf“** (`role="switch"`, wie `#btn-screen-toggle`).
   Aus = die Show wartet auf den nächsten Rasterpunkt und läuft synchron.
   An = sie startet sofort, ohne Raster, zum Ausprobieren zu Hause. Der
   Schalter wird **nicht** gespeichert und steht bei jedem Öffnen auf „aus“ —
   sonst steht jemand auf der Bühne im Probelauf.
5. **Knopf „Uhr prüfen“** → Sync-Prüfbild (L5).
6. **Hinweisblock** (`small muted`), kurz und ohne Technik-Kauderwelsch:
   Helligkeit von Hand hochdrehen; „Datum & Uhrzeit automatisch“ im
   Betriebssystem eingeschaltet lassen; Handy nicht sperren; vor dem Auftritt
   einmal zu zweit „Uhr prüfen“ machen.

---

## 5. L4 — Die Bühne (Vollbild-Overlay)

### 5.1 Markup

Neues `<div class="lightshow-stage" id="lightshow-stage" hidden role="dialog"
aria-modal="true" aria-label="Lichtshow">` als **direktes Kind von `<body>`**
(zusammen mit `#lyrics-present` und `#sheet` — es gibt im CSS bereits einen
Kommentarblock zu dieser Stapelordnung, halte dich daran).

Inhalt:
- Die Fläche selbst ist der Hintergrund; kein Innencontainer, der die Farbe
  überdeckt.
- **Countdown** `#lightshow-countdown`: große Ziffer, mittig, halbtransparent
  weiß, sichtbar nur bis zum Rasterstart.
- **Schließknopf** `#lightshow-close`, oben links, im Stil von
  `.lyrics-present-close`, aber **stark gedimmt** (`opacity: .25`), damit er
  auf der Bühne nicht als heller Fleck auffällt, mit mindestens 44 × 44 px
  Trefferfläche. Zusätzlich `Escape` über `openModal(..., { onEscape })`.
  **Kein Schließen durch Tippen auf die Fläche** — versehentliches Beenden
  mitten in der Einlage wäre der schlimmste Fehler dieser Funktion.

CSS: `position: fixed; inset: 0;` , `background: #000;`,
`z-index` in derselben Staffel wie `#lyrics-present`, `touch-action: none`,
`user-select: none`, keine Übergänge (`transition: none`) — die Blenden rechnen
wir selbst, eine CSS-Transition würde dagegenarbeiten.

### 5.2 Ablauf

```js
async function openLightshowStage(showId, { rehearsal = false } = {}) { … }
```

1. Zustand setzen, `hidden = false`, `openModal(...)` mit `initialFocus` auf dem
   Schließknopf und `onEscape` → `closeLightshowStage()`.
2. `requestFullscreen?.()` in `try/catch` — auf iOS-Safari gibt es kein
   Element-Vollbild, das Overlay deckt trotzdem den Viewport ab. Exakt so wie in
   `openLyricsPresent()`. **Keine** `orientation.lock()`: die Show ist
   lageunabhängig, und eine erzwungene Drehung würde nur Geräte ärgern.
3. **Wake Lock** anfordern (`navigator.wakeLock.request('screen')` in
   `try/catch`, Ergebnis merken, beim Schließen freigeben und beim
   `visibilitychange` auf `visible` erneut anfordern). Die vorhandene
   `updateWakeLock()` gehört zum Player und darf **nicht** umgebaut werden —
   die Bühne hält ihren eigenen Lock in einer eigenen Variablen.
4. **Zeitanker:**
   ```js
   const now = Date.now() + settings.lightshowOffsetMs;
   startWall = rehearsal ? now : Math.ceil(now / cycleMs) * cycleMs;
   anchorWall = now;
   anchorPerf = performance.now();
   ```
   Im Frame gilt `wall = anchorWall + (performance.now() - anchorPerf)`.
   **Warum nicht direkt `Date.now()` pro Frame:** stellt das Betriebssystem
   mitten in der Show die Uhr nach (NTP-Korrektur), springt das Bild sichtbar.
   Der monotone Zähler verhindert das. Neu verankert wird nur beim Start und
   beim Zurückkommen aus dem Hintergrund.
5. **rAF-Schleife:**
   ```js
   const wall = anchorWall + (performance.now() - anchorPerf);
   if (wall < startWall) { /* Countdown zeichnen, Fläche schwarz */ }
   else {
     const tMs = (wall - startWall) % cycleMs;   // rehearsal: identisch
     const bg = lightshowFrame(showId, tMs, voice, seed);
     if (bg !== lastBg) { stage.style.backgroundColor = bg; lastBg = bg; }
   }
   ```
   Im synchronen Betrieb ist `(wall - startWall) % cycleMs` gleichbedeutend mit
   `wall % cycleMs`, weil `startWall` auf dem Raster liegt — das ist der Punkt
   der ganzen Konstruktion und gehört als Kommentar hin.
   Der Countdown zeigt aufgerundete Sekunden und wird nur bei Sekundenwechsel
   ins DOM geschrieben.
6. **Schleife anhalten**, wenn `document.visibilityState !== 'visible'`
   (`cancelAnimationFrame`), beim Zurückkommen neu verankern und weiterlaufen.
   Der Browser drosselt `rAF` im Hintergrund ohnehin; ohne das Anhalten hättest
   du beim Zurückkommen genau den Uhrensprung, den Punkt 4 vermeidet.
7. **Die Show läuft in Schleife**, bis jemand schließt. Kein automatisches
   Ende — auf der Bühne weiß niemand, wie lange die Ansage dauert.
8. `closeLightshowStage()`: rAF abbestellen, Wake Lock freigeben,
   `document.exitFullscreen?.()` in `try/catch` (nur wenn `document.fullscreenElement`
   die Bühne ist — siehe `closeLyricsPresent()`), `hidden = true`,
   `closeModal(...)`, Hintergrundfarbe zurück auf Schwarz.

---

## 6. L5 — Sync-Prüfbild und Handversatz

Zweck: ohne Netz feststellen, ob eine Uhr grob danebenliegt, und das korrigieren.

Eigenes Overlay `#lightshow-sync` (gleiche Bauart wie die Bühne, aber mit
Bedienelementen):

- **Sekundenläufer:** ein weißer Balken, der einmal pro Sekunde von links nach
  rechts läuft — Position `= (wall % 1000) / 1000`, gezeichnet als
  `transform: translateX(...)` auf einem Balken mit `will-change: transform`
  (das ist die eine Stelle, an der ein Composite-Transform billiger ist als
  Neumalen). Zusätzlich ein kurzer Vollflächen-Blitz von 80 ms zum
  Sekundenwechsel.
- **Anleitung in einem Satz:** zwei Handys nebeneinander legen, beide dieses
  Bild zeigen. Laufen die Balken sichtbar versetzt, geht eine Uhr falsch.
- **Versatz stellen:** `−50 ms` / `+50 ms` / `−250 ms` / `+250 ms` und
  „Zurücksetzen“, dazu die aktuelle Zahl groß. Schreibt `lightshowOffsetMs`
  über `saveSettings()`, geklemmt auf `±5000`.
- **Wichtigster Hinweis zuerst:** Wenn ein Gerät um mehr als etwa eine halbe
  Sekunde danebenliegt, ist der richtige Weg **nicht** der Handversatz, sondern
  „Datum & Uhrzeit → automatisch“ im Betriebssystem einzuschalten. Der
  Handversatz ist die Krücke für den Fall, dass das nicht geht.

Der Versatz wirkt **überall gleich**: er geht ausschließlich in `anchorWall`
bzw. `wall` ein, nie in die Show-Funktionen.

---

## 7. L6 — Übersetzungen

Alle neuen sichtbaren Kurztexte (Kartentitel, Show-Namen, Knöpfe, Chips,
`aria-label`) kommen als Schlüssel `lightshow.*` bzw. `settings.lightshow.*` in
**alle drei** Sprachblöcke `de` / `en` / `pl` von `STRINGS` und werden im Markup
über `data-i18n` / `data-i18n-aria` gesetzt. Dynamisch erzeugte Knöpfe
bekommen ihren Text über `t('…')` **und** ein `data-i18n`-Attribut, damit ein
Sprachwechsel bei offener Ansicht greift — schau dir an, wie
`renderPresentThemePicker()` das macht, und mach es genauso.

Die langen Erklärtexte (Hinweisblock, Sync-Anleitung) dürfen dem bestehenden
Muster folgend zunächst deutsch bleiben; der Kommentarblock über `STRINGS`
beschreibt genau diese Abstufung. Übersetze sie trotzdem, wenn es ohne Aufwand
geht.

---

## 8. L7 — Selbsttests

In `runSelfTests()` einen eigenen Abschnitt ergänzen (Zähler `checks` wie
gehabt hochzählen, Fehlschläge in `failed` sammeln). Geprüft wird nur, was ohne
Browser geht — genau dafür ist `lightshowFrame()` rein:

1. **Determinismus:** gleicher `(showId, tMs, voice, seed)` → identischer String,
   zweimal aufgerufen.
2. **Gültige Ausgabe:** für alle vier Shows, alle vier Stimmen, `tMs` in
   50-ms-Schritten über den ganzen Zyklus: Ergebnis matcht `/^#[0-9a-f]{6}$/`.
3. **Stimmabhängigkeit:** in `welle` und `finale` gibt es mindestens einen
   Zeitpunkt, an dem sich SOP und BASS unterscheiden (sonst wäre die
   Stimmgruppe wirkungslos).
4. **Zyklusschluss:** `|Helligkeit(cycleMs - 20) - Helligkeit(0)| < 0.12` je
   Show — kein Sprung beim Übergang. (Helligkeit = Mittel der drei Kanäle.)
5. **Blitzgrenze (Abschnitt 9):** über den ganzen Zyklus in 20-ms-Schritten die
   Übergänge der Helligkeit über die Schwelle 0,5 zählen; in **keinem
   1000-ms-Fenster** dürfen es mehr als 3 Anstiege sein. Dieser Test ist die
   Absicherung gegen ein späteres „mach's mal schneller“.
6. **Farbhelfer:** `lightshowScale('#ffffff', 0) === '#000000'`,
   `lightshowScale('#ffffff', 1) === '#ffffff'`,
   `lightshowMix('#000000', '#ffffff', 0.5) === '#808080'` (oder `#7f7f7f`,
   je nach Rundung — leg die Rundung fest und teste dagegen).
7. **Stimmzuordnung:** `lightshowVoiceIndex('LEAD') === 0`,
   `lightshowVoiceColor('LEAD') === VOICE_COLOR.FULL`.

`window.chorApp` um `lightshowFrame` erweitern, damit man in der Konsole ohne
Bühne prüfen kann.

---

## 9. L8 — Sicherheit und Barrierefreiheit (nicht verhandelbar)

1. **Photosensible Epilepsie.** Kein Gerät darf öfter als **dreimal pro
   Sekunde** hell/dunkel wechseln (Schwelle der WCAG-Regel 2.3.1). Die Rezepte
   in L1 halten das ein, der Selbsttest aus L7 sichert es ab. Keine schnellen
   Wechsel zwischen gesättigtem Rot und Weiß.
2. **Warnhinweis** in der Lichtshow-Ansicht, ein Satz, sachlich: Die Shows
   arbeiten mit hellen, wechselnden Flächen; wer lichtempfindlich ist oder zu
   Anfällen neigt, macht besser nicht mit oder wählt „Sternenhimmel“.
3. **`prefers-reduced-motion`.** Ist die Einstellung aktiv, steht in der
   Ansicht ein entsprechender Hinweis, und „Sternenhimmel“ ist vorausgewählt.
   Die anderen Shows bleiben startbar — es ist eine bewusste Bühnenhandlung,
   keine unerwartete Animation.
4. **Fokus.** `openModal()`/`closeModal()` bringen Fokusfalle und
   Fokusrückgabe schon mit; benutze sie, bau nichts Eigenes.
5. **Bedienbarkeit im Dunkeln.** Der Schließknopf sitzt immer an derselben
   Stelle und bleibt auch bei weißer Fläche erkennbar (dunkler Rand).

---

## 10. L9 — Dokumentation und Auslieferung

1. `README.md`: einen kurzen Absatz unter der Dateiübersicht bzw. bei den
   Funktionen — was die Lichtshow ist, dass sie ohne Netz und ohne
   Gerätekopplung allein über die Systemuhr läuft, und dass dafür „Datum &
   Uhrzeit automatisch“ eingeschaltet sein sollte.
2. `sw.js`: `SW_VERSION` `'v100'` → `'v101'` (einmalig, am Ende).
3. Syntaxprüfung, dann `git push -u origin claude/lichtshow-feature-q2ghr2`.
   Bei Netzfehlern bis zu viermal mit 2 s / 4 s / 8 s / 16 s Pause wiederholen.
4. **Keinen Pull Request** eröffnen, solange der Nutzer nicht danach fragt.

---

## 11. Manuelle Abnahme (im Browser, vor dem Push)

Weil es keine CI und keinen Headless-Test gibt, ist diese Liste Pflicht:

- [ ] `python3 -m http.server`, App öffnen, Konsole ohne Fehler, Selbsttests grün.
- [ ] Einstellungen → Karte „Lichtshow“ klappt auf, Knopf öffnet die Ansicht.
- [ ] Browser-Zurück schließt die Ansicht; eine laufende Bühne wird dabei beendet.
- [ ] Alle vier Shows starten, laufen, und schließen sauber (Fläche wieder
      schwarz, Fokus zurück auf dem Startknopf, Vollbild verlassen).
- [ ] Stimmwechsel in der Ansicht ändert sichtbar Farbe und Timing.
- [ ] Zwei Browserfenster nebeneinander (gleiche Uhr): dasselbe Bild zur
      gleichen Zeit — das ist der eigentliche Beweis der Konstruktion.
- [ ] Zweites Fenster **mitten in der Show** starten: es steigt in Phase ein,
      nicht am Anfang.
- [ ] Probelauf-Schalter: startet ohne Wartezeit, steht nach erneutem Öffnen
      der Ansicht wieder auf „aus“.
- [ ] Sync-Prüfbild: Balken läuft rund, ±-Knöpfe verschieben ihn sichtbar,
      Zurücksetzen stellt 0 her, Wert überlebt einen Reload.
- [ ] Sprache auf English/Polski umstellen: keine deutschen Kurztexte mehr in
      Karte und Auswahl.
- [ ] Handy oder Geräte-Emulation bei 320 px Breite: nichts läuft über.
- [ ] Während der Show ein paar Minuten laufen lassen — kein spürbares
      Warmwerden, kein Ruckeln, Bildschirm bleibt an.

---

## 12. Was diese Anweisung bewusst offen lässt

- Feinschliff der Farbverläufe ist Geschmackssache; die Rezepte in L1 sind der
  verbindliche Rahmen, innerhalb dessen du die Zahlen um ±20 % anpassen darfst,
  wenn es auf dem Gerät besser aussieht. **Nicht** anpassen: Zykluslängen,
  Rasterbindung an die Epoche, Blitzgrenze.
- Eine fünfte Show, eine eigene Show pro Lied oder ein Ablauf über mehrere
  Songs hinweg ist ausdrücklich **nicht** Teil dieser Aufgabe.
