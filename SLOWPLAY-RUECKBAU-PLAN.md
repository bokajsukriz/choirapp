# Arbeitsanweisung — Rückbau der HQ-Verlangsamung

> **Überholt.** Der Rückbau ist erledigt — aber nicht als eigene Runde: er
> steckt in derselben Änderung, die den Vocoder durch `signalsmith-stretch`
> ersetzt hat. Was tatsächlich ausgeliefert wird, steht in
> `SLOWPLAY-HD-PLAN.md`. Die Liste unten bleibt als Beleg, was alles
> entfernt wurde, und als Vorlage, falls HD am Ende doch nicht überzeugt.

**Alles entfernen, was in vier Runden für die „bessere" Verlangsamung
eingebaut wurde, und zum nativen `preservesPitch = true` zurückkehren.**

Adressat: Sonnet (Folge-Session). Vorgeschichte in `SLOWPLAY-HQ-PLAN.md`,
`SLOWPLAY-HQ-FIX-PLAN.md`, `SLOWPLAY-HQ-FIX-PLAN-2.md` und
`SLOWPLAY-HQ-FIX-PLAN-3.md` — allesamt Dokumente, die am Ende dieser
Runde verschwinden (Abschnitt 7).

Gegengeprüft am Stand `2b10c33` von `main` (`SW_VERSION` `v118`).
**Immer über Funktions-, Klassen- und ID-Namen ansteuern, nie über
Zeilennummern.**

---

## Ausgangslage — die Richtung war falsch

Vier Runden lang wurde ein Phasenvocoder (identity phase locking,
Laroche/Dolson) in einem `AudioWorklet` aufgebaut, verfeinert und
optimiert: reelle FFT statt komplexer, Winkelfunktionen nur an den
Spektralspitzen, keine Allokationen im Audio-Thread, höchstens ein
Analyseframe je Render-Quantum, `shift` als `AudioParam` statt per
`postMessage`, zuletzt ein vierter Modus „HQ Mono", der die Rechnung
halbiert. Dazu kamen eine Lastanzeige in den Einstellungen, eine
Ersatzmessung für Geräte ohne `renderCapacity`, ein Diagnose-Modus „Roh"
und rund zwanzig Selbsttests.

Was auf echter Hardware dabei herauskam:

| Gerät | Befund |
|---|---|
| Pixel 9 (GrapheneOS) | stottert schon bei 0,85×, bricht bei 0,7× fast ganz ab |
| Android 10, Chrome Mobile 152 (nach Runde 3) | 0,85× 96–97 % Echtzeit, hörbares Knacken; 0,7× 75–78 %; 0,6× 65 %; dazu „die Songs springen manchmal" |
| Rechnung nach Runde 4 (HQ Mono) | geschätzt **90–112 %** Auslastung bei 0,6× auf dem Android-Gerät |

Die Nulllinie derselben Messung: **Standard und Roh liegen bei jedem
Tempo bei rund 100 % Echtzeit.** Der gesamte Rückstand geht also
ausschließlich auf den Vocoder — es gibt keine versteckte Grundlast, die
sich noch wegoptimieren ließe. Nach der Halbierung durch HQ Mono liegt
die Schätzung immer noch an oder über der Echtzeitgrenze; der nächste
Hebel wäre eine 50-%-Überlappung mit Sinusfenster gewesen, also erneut
eine Klangänderung zugunsten der Rechenzeit.

**Entscheidung des Nutzers: der Weg wird nicht weiterverfolgt.** Die
Verlangsamung läuft wieder über das, was der Browser mitbringt.

### Was das kostet — bewusst in Kauf genommen

Der ursprüngliche Anlass war real: Chrome und Safari korrigieren die
Tonhöhe per WSOLA, und auf polyphonem, lang gehaltenem Chorgesang
flattert und doppelt das hörbar, besonders bei 0,6×. Dieser Zustand
kehrt mit dem Rückbau zurück. Das ist **kein Versehen und keine
Regression, die es später zu beheben gälte**, sondern die bewusste
Rückkehr zum Stand, der auf jedem Gerät zuverlässig in Echtzeit läuft.
Wer den Nachteil später erneut angehen will, findet den kompletten
Vocoder samt Messgerüst in der Git-Historie (siehe Abschnitt 7).

---

## Zielbild

Der Verlangsamungs-Pfad soll wieder genau so aussehen wie vor dem Beginn
der HQ-Arbeit, also wie im Stand **`84c2dba`** („Bump SW_VERSION to v110
for the backing-track feature"):

- `el.playbackRate = Audio.rate` setzt das Tempo,
- `el.preservesPitch = true` (plus `webkitPreservesPitch`,
  `mozPreservesPitch`) hält die Tonhöhe, nativ,
- kein `AudioWorklet`, kein Modus-Umschalter, keine Lastanzeige.

Alles **andere**, was seit `84c2dba` dazugekommen ist, bleibt
unangetastet: Originaltrack unter dem REC (Backing-Track), REC-Umbau,
Lichtshow, Recorder-Ansicht, die UI-Korrekturen an Gigliste und
Player-Kopf, die Kanal-Matrix („Fahrradfahren-Modus").

### Kein `git revert`

Die HQ-Commits liegen verschränkt mit den oben genannten, unabhängigen
Arbeiten in derselben Historie (mehrere Merges von `main` in beide
Richtungen). Ein `git revert` der Merges würde Fremdarbeit mitreißen.
**Der Rückbau ist eine chirurgische Entfernung von Hand**, anhand der
Liste in Abschnitt 3. `84c2dba` dient dabei nur als *Vorlage* für den
Wortlaut der wenigen wiederherzustellenden Stellen — nicht als
Merge-Basis.

---

## 0. Rahmenbedingungen

1. **Branch:** `claude/revert-slow-playback-audio-5wbnwo`, von `2b10c33`
   ausgehend. Niemals direkt auf `main` pushen.
2. **Kein Build-Schritt, keine Abhängigkeit, keine neue Datei** (außer
   dem, was Abschnitt 7 an Dokumenten löscht).
3. **`SW_VERSION`** in `sw.js` am Ende einmal auf `v119` — sonst
   bekommt niemand das Update (Regel im README).
4. **i18n:** die entfallenden `settings.perf.*`-Schlüssel in **allen
   drei** `STRINGS`-Blöcken (`de`, `en`, `pl`) entfernen, keinen
   vergessen.
5. **Codestil:** deutschsprachige Kommentare im Ton der Datei (erklären
   *warum*), 2 Leerzeichen Einrückung, keine Umformatierung fremder
   Zeilen. Beim Entfernen keine verwaisten Kommentarblöcke stehen
   lassen.
6. **Netto nur Löschungen.** Die einzigen echten *Änderungen* stehen in
   Abschnitt 4; alles in Abschnitt 3 ist reines Streichen.

---

## 1. Was verschwindet — der Überblick

Der Rückbau betrifft **nur `index.html` und `sw.js`** (Code) sowie vier
Markdown-Dokumente. `groove-lab.js`, `manifest.json` und `README.md`
enthalten keinen einzigen Bezug auf die HQ-Verlangsamung — geprüft, dort
ist nichts zu tun.

Grob nach Schichten:

| Schicht | Was |
|---|---|
| CSS | die Regel `#slow-mode` |
| Markup | die ganze Einstellungskarte „Kompatibilität & Performance" |
| Einstellungen | vier Schlüssel und zwei Migrationsblöcke |
| i18n | 17 `settings.perf.*`-Schlüssel × 3 Sprachen |
| UI-Logik | `renderSlowMode()` und der komplette Lastmess-Apparat |
| DSP | sechs Bausteine, der Worklet-Quelltext und seine Verdrahtung |
| Audio-Pfad | `applyHqMode()`, `applyRateToElement()`, ihre Aufrufer |
| Selbsttests | der Block „HQ-Verlangsamung: Phasenvocoder" |

---

## 2. Was ausdrücklich bleibt

Damit beim Entfernen nichts Benachbartes mitgeht — diese Dinge sehen
verwandt aus, gehören aber **nicht** zum Rückbau:

- **Die Kanal-Matrix** in `audioInit()` (Splitter, vier Gains, Merger,
  `audioApplyChannelMode`) — das ist der Fahrradfahren-Modus, älter als
  die HQ-Arbeit und unabhängig davon.
- **`Audio.channelIn`, `Audio.bg`, `Audio.bgGain`, `Audio.bgSource`,
  `ensureBackingAudio()`, `backingLagSeconds()`,
  `backingTargetRate()`** und alles Weitere am Originaltrack unter dem
  REC. Nur ein *Kommentar* dort nennt den Vocoder (Abschnitt 4.5).
- **`onAudioContextStateChange()`** und der `statechange`-Listener —
  behandeln vom System angehaltene Kontexte, nichts mit HQ zu tun.
- **`lastPosLog` und `dlog('audio:stall', …)`** in `timeupdate` — die
  Aussetzer-Erkennung des Elements, unabhängig vom Worklet.
- **`DEFAULT_SETTINGS.firstUseAt` und `COMPAT_UPDATE_FLAG`** — der
  Kompatibilitäts*hinweis* nach Updates, trotz ähnlichen Namens ohne
  Bezug zur Karte „Kompatibilität & Performance".
- **Die Selbsttests zu `sanitizeRecAnchor`, `isPlayableSong`,
  `nextPlayableIndex`, `filterSongsByQuery`, `bucketizeColumns`** — sie
  umschließen den HQ-Testblock, bleiben aber vollständig erhalten.

---

## 3. Schritt für Schritt entfernen

### 3.1 CSS

Die Regel **`#slow-mode`** mitsamt ihrem Kommentar („Vierter
Verlangsamungsmodus „HQ Mono" …") streichen. Sie setzt
`grid-template-columns: repeat(4, 1fr)` und existiert nur, weil
`.preset-row` sonst fest dreispaltig ist. Die geteilte Klasse
`.preset-row` selbst **bleibt** — die Fahrradfahren-Presets brauchen
sie.

### 3.2 Markup

Die vollständige `<div class="card">` mit
`<span data-i18n="settings.perf.title">` entfernen — von der öffnenden
`<div>` bis zur schließenden. Darin liegen: die Überschrift samt Icon,
`settings.perf.modeHint`, die `<div class="preset-row" id="slow-mode">`
mit ihren vier Knöpfen, die drei Hinweistexte (`hqHint`, `hqMonoHint`,
`rawHint`), `#hq-unsupported-hint` und `#hq-load`. Die Karte enthält
nichts anderes; es bleibt kein Rest übrig.

### 3.3 Einstellungen

In `DEFAULT_SETTINGS` diese vier Schlüssel samt der davor stehenden
Erklärkommentare löschen:

```
hqSlowdown, hqSlowdownReset, slowMode, slowModeMigrated
```

In `loadSettings()` beide Migrationsblöcke löschen: die „Einmalige
Rücknahme" (`if (!settings.hqSlowdownReset) { … }`) und die „Migration
von der alten hqSlowdown-Einstellung" (`if (!settings.slowModeMigrated)
{ … }`).

**Keine neue Migration nötig.** `loadSettings()` mischt mit
`{ ...DEFAULT_SETTINGS, ...(stored || {}) }`; ein gespeichertes
`slowMode: 'hq'` bleibt zwar im Objekt stehen, wird aber von niemandem
mehr gelesen. Die Tonhöhenkorrektur richtet sich danach nicht mehr:
`audioSetRate()` setzt `preservesPitch = true` bedingungslos, also
bekommen auch Installationen, die zuletzt auf `raw` oder `hqmono`
standen, ohne Zutun wieder den nativen Klang. Kein Aufräum-Schreibvorgang,
kein Merker.

### 3.4 i18n

In allen drei `STRINGS`-Blöcken die 17 Schlüssel entfernen:

```
settings.perf.title, .modeHint, .modeStandard, .modeHqMono, .modeHq,
.modeRaw, .hqHint, .hqMonoHint, .rawHint, .hqUnsupported,
.hqLoadLabel, .hqLoadAvg, .hqLoadPeak, .hqLoadDropoutRate,
.hqLoadUnderruns, .hqLoadFallbackLabel, .hqLoadFallbackSuffix
```

(Kontrolle: nach dem Löschen darf `grep -n "settings.perf" index.html`
nichts mehr finden.)

### 3.5 UI-Logik und Lastmessung

Ersatzlos streichen:

- `renderSlowMode()` samt Doc-Kommentar
- die Modul-Variablen `hqLoadFallbackPrev`, `hqLoadFallbackTimer`,
  `hqRenderCapacityStarted`, `hqRenderCapacityFieldsLogged`,
  `hqCapacityAvailLogged`, `hqLastWorkletUnderruns`
- `renderHqLoadText()`, `tickHqLoadFallback()`,
  `startHqLoadMeasurement()`, `stopHqLoadMeasurement()`,
  `updateHqLoadVisibility()`
- den `$$('#slow-mode .preset').forEach(…)`-Klick-Handler

Und alle Aufrufstellen:

- `renderSlowMode()` in `renderSettings()`
- `renderSlowMode()` in der Player-Öffnungsroutine (der Block „Erst
  jetzt steht fest, ob addModule() für die HQ-Verlangsamung wirklich
  geklappt hat …" — Kommentar mit entfernen)
- `updateHqLoadVisibility()` in den `ended`- und `pause`-Listenern von
  `Audio.el`, in `audioPlay()` und in `audioPause()`

### 3.6 DSP und Worklet

Den gesamten Abschnitt zwischen dem Kommentarbanner
`HQ-VERLANGSAMUNG — Phasenvocoder mit Phasenkopplung …` und der
Definition von `const Audio = { … }` entfernen. Das sind:

- `hqPrincipalAngle()`, `hqAnalysisHop()`, `hqPitchRatio()`
- `class HqFft`, `class HqRealFft`, `class HqPitchShifter`
- `hqBuildWorkletSource()`
- `class HqShiftProcessor extends AudioWorkletProcessor` samt
  `registerProcessor('hq-pitch-shift', …)`
- `hqCreateNode()`, `hqStaticallySupported()`, `isHqMode()`
- das Kommentarbanner selbst

In `const Audio = { … }` das Feld **`hqNode`** streichen — und
**`elSource`** ebenfalls (siehe 4.2, es wird nach dem Rückbau nirgends
mehr gelesen).

### 3.7 Audio-Pfad

- `applyHqMode()` vollständig entfernen.
- `applyRateToElement()` vollständig entfernen — die beiden
  Aufrufstellen werden in Abschnitt 4 durch den ursprünglichen Wortlaut
  ersetzt.
- In `audioSeek()` das `Audio.hqNode?.port.postMessage({ type: 'reset' });`
  samt Kommentar („Der Phasenvocoder springt nicht mit …") entfernen.
  `lastPosLog` in derselben Funktion bleibt.

### 3.8 Selbsttests

In `runSelfTests()` den Block ab dem Trenner
`/* ---------- HQ-Verlangsamung: Phasenvocoder (SLOWPLAY-HQ-PLAN.md 1.4) ---------- */`
bis unmittelbar vor den Kommentar
`// Shuffle-Stopp, Setlisten-Weiterschalten, …` entfernen. Das umfasst
die Prüfungen zu `hqPrincipalAngle`, `hqAnalysisHop`/`hqPitchRatio`,
`HqRealFft` gegen `HqFft`, den Rundlauf, Durchreichen bei `shift=1`,
Tonhöhe, Längentreue, Verstärkung, Drehung, `reset()`, das
Frame-Budget und die Mono-Abkürzung.

`checks` wird laufend hochgezählt und nirgends gegen eine feste Zahl
geprüft — es genügt, die zugehörigen `checks++` mit zu entfernen. Der
Block davor (`sanitizeRecAnchor`) und der danach bleiben unverändert.

---

## 4. Was zurückgebaut, nicht gelöscht wird

Fünf Stellen brauchen einen Ersatztext. Der Wortlaut steht jeweils in
`84c2dba`, kann also mit `git show 84c2dba:index.html` nachgeschlagen
werden.

### 4.1 Der Kopfkommentar des Audio-Abschnitts

Im Banner `AUDIO — Wiedergabe über ein natives <audio>-Element` den
letzten Absatz („Das Tempo (1,0×, 0,85×, 0,7×, 0,6×) übernimmt
`playbackRate`. Die Tonhöhenkorrektur dabei ist wählbar: …") durch den
ursprünglichen ersetzen:

```
   Das Tempo (1,0×, 0,85×, 0,7×, 0,6×) übernimmt `playbackRate` mit
   `preservesPitch = true` nativ — der bisherige WSOLA-Code im Worklet wird
   dafür nicht mehr gebraucht.
```

### 4.2 Die Verdrahtung in `audioInit()`

Aktuell wird die Quelle gemerkt und die Verdrahtung `applyHqMode()`
überlassen. Zurück auf die eine Zeile von damals — an der Stelle, an der
jetzt `const elSource = ctx.createMediaElementSource(el);` steht:

```js
    // Erst als letzter Schritt: schlägt nur noch dieser Aufruf fehl, bleiben
    // Splitter/Gains/Merger folgenlos unverbunden, statt das Element mitten
    // im Aufbau von seiner normalen Ausgabe abzuschneiden.
    ctx.createMediaElementSource(el).connect(splitter);
```

Danach entfallen `Audio.elSource = elSource;`, `Audio.hqNode = hqNode;`,
`const hqNode = await hqCreateNode(ctx);` samt dem langen Kommentar
davor, und der `applyHqMode();`-Aufruf. `Audio.channelIn = splitter;`
und `audioApplyChannelMode(settings.channelMode);` **bleiben** — der
Backing-Track speist über `channelIn` ein.

Ebenfalls in `audioInit()`: der komplette Block
`if (ctx.renderCapacity && typeof ctx.renderCapacity.start === 'function') { … }`
mit dem `update`-Listener und seinem Kommentar („Lastmessung
(SLOWPLAY-HQ-FIX-PLAN-2.md Abschnitt 2.1) …") entfällt. Der
`ctx.addEventListener('statechange', …)` direkt darunter bleibt.

### 4.3 `audioSetRate()`

Zurück auf den ursprünglichen Wortlaut:

```js
function audioSetRate(rate) {
  Audio.rate = rate;
  if (!Audio.el) return;
  Audio.el.playbackRate = rate;
  Audio.el.preservesPitch = true;
  Audio.el.webkitPreservesPitch = true;
  Audio.el.mozPreservesPitch = true;
}
```

### 4.4 `audioLoadTrackNow()`

Dort steht heute ein `applyRateToElement();`. Zurück auf:

```js
    // Tempo und Tonhöhenerhalt gelten dem Element, nicht der Quelle — nach
    // Spec bleiben sie über einen Ladevorgang hinweg erhalten. Sicherheits-
    // halber trotzdem erneut gesetzt: manche WebKit-Stände haben das in der
    // Vergangenheit beim Laden zurückgesetzt, und ein leise auf 1× gefallenes
    // Tempo wäre in der Auswahlbox nicht zu erkennen.
    el.playbackRate = Audio.rate;
    el.preservesPitch = true;
    el.webkitPreservesPitch = true;
    el.mozPreservesPitch = true;
```

(Der heutige Kommentar nennt zusätzlich „eine leise wieder aktivierte
native Tonhöhenkorrektur bei laufender HQ-Verlangsamung" — dieser
Halbsatz fällt mit weg.)

### 4.5 Der Kommentar in `ensureBackingAudio()`

Der Doc-Kommentar erklärt, warum der Backing-Track **nicht** durch den
Vocoder läuft („Läuft bewusst NICHT durch den HQ-Phasenvocoder
(bgSource speist direkt in Audio.channelIn ein, an Audio.hqNode
vorbei …) … Die ~46 ms Latenz des Shifters …"). Diese Begründung wird
gegenstandslos: den Absatz streichen. Der Rest des Kommentars und der
gesamte Code von `ensureBackingAudio()` bleiben unverändert — `bgSource`
speist weiterhin in `Audio.channelIn` ein, jetzt eben wie die
Hauptquelle auch.

---

## 5. Selbstkontrolle

Nach dem Rückbau dürfen diese Suchen **nichts** mehr finden. Der
`grep -v base64` in der ersten Zeile blendet die eingebettete
Schriftart aus — deren Base64-Block enthält zufällig die Folge `HQ`
und wäre sonst ein Dauertreffer:

```sh
grep -nE "(hq|Hq|HQ)" index.html sw.js | grep -v base64
grep -n "settings.perf" index.html
grep -n "slowMode\|preset-row\" id=\"slow-mode\|Phasenvocoder" index.html
grep -n "renderCapacity\|audioWorklet\|AudioWorkletNode\|registerProcessor" index.html
grep -n "applyHqMode\|applyRateToElement\|elSource" index.html
```

Die letzte Suche darf noch `levelSource` treffen (Pegelanzeige des
Recorders) — sonst nichts.

Gegenprobe, dass nichts Falsches mitgegangen ist:

```sh
grep -c "channelIn\|audioApplyChannelMode\|ensureBackingAudio\|backingLagSeconds" index.html
```

muss weiterhin Treffer liefern.

---

## 6. Abnahme

1. **`runSelfTests()` und `runAsyncSelfTests()`** laufen ohne Fehler
   durch — die verbleibenden Prüfungen sind alle bestanden, in der
   Konsole steht kein `failed`-Eintrag.
2. **Konsole beim Start sauber** — keine `ReferenceError` durch eine
   übersehene Aufrufstelle. Besonders zu prüfen: Einstellungen öffnen
   (`renderSettings`), einen Song öffnen, abspielen, pausieren, ans
   Ende laufen lassen.
3. **Verlangsamung im Browser:** je einmal 1,0× / 0,85× / 0,7× / 0,6×
   anspielen. Erwartung: die Tonhöhe bleibt bei allen vier Tempi
   gleich (nativ korrigiert), die Wiedergabe läuft ohne Aussetzer und
   ohne Knacken. WSOLA-Flattern auf gehaltenen Tönen ist das erwartete,
   akzeptierte Verhalten — kein Fehler.
4. **Einstellungen:** die Karte „Kompatibilität & Performance" ist weg,
   die Karten davor und danach (Bildschirm/Benachrichtigungen, Hilfe)
   stehen unverändert und ohne Lücke.
5. **Fahrradfahren-Modus** (mono / tauschen / normal) wirkt weiterhin
   hörbar — Beleg, dass die Kanal-Matrix beim Umbau der Verdrahtung in
   4.2 intakt geblieben ist.
6. **Originaltrack unter dem REC** spielt weiterhin leise mit und liegt
   an derselben Stelle wie vorher — Beleg für `channelIn`.
7. **Sprachen:** einmal auf `en` und `pl` umschalten, Einstellungen
   ansehen. Kein roher Schlüsselname im Text (das wäre ein vergessener
   `data-i18n`-Verweis).
8. **`SW_VERSION`** steht auf `v119`.

---

## 7. Dokumente

Die vier Arbeitsanweisungen der HQ-Runden beschreiben einen Weg, der
nicht weiterverfolgt wird. Sie stehen künftig nur noch in der Historie:

```sh
git rm SLOWPLAY-HQ-PLAN.md SLOWPLAY-HQ-FIX-PLAN.md \
       SLOWPLAY-HQ-FIX-PLAN-2.md SLOWPLAY-HQ-FIX-PLAN-3.md
```

**Diese Datei (`SLOWPLAY-RUECKBAU-PLAN.md`) bleibt im Repo.** Sie ist
danach der einzige Ort, an dem steht, dass es den Versuch gab, was er
gekostet hat und wo er liegt. Am Ende dieser Datei einen Abschnitt
„Erledigt" anfügen mit:

- dem Commit-Bereich der HQ-Arbeit: `fc5b621` (erste Arbeitsanweisung)
  bis `2b10c33` (letzter Stand vor dem Rückbau); der letzte Stand *mit*
  vollständigem Vocoder ist `2b10c33`, der letzte Stand *ohne* ist
  `84c2dba`
- welche Selbsttests entfallen sind
- dem Ergebnis der Abnahme aus Abschnitt 6

Keine Änderung an `README.md` nötig — es erwähnt die HQ-Verlangsamung
nirgends (geprüft).

---

## 8. Commit-Zuschnitt

Vier Commits, jeder für sich lauffähig und einzeln zurücknehmbar:

1. **`Vierten Verlangsamungsmodus und die Lastanzeige entfernen`** —
   Abschnitte 3.1, 3.2, 3.4, 3.5 (Oberfläche und Messung; der DSP-Code
   liegt danach noch ungenutzt herum, die App läuft aber schon auf
   Standard).
2. **`Phasenvocoder und Worklet-Verdrahtung entfernen`** — Abschnitte
   3.6, 3.7, 3.8 und der ganze Abschnitt 4.
3. **`Einstellungsschlüssel der HQ-Verlangsamung entfernen`** —
   Abschnitt 3.3.
4. **`Arbeitsanweisungen der HQ-Runden ablegen, SW_VERSION auf v119`** —
   Abschnitt 7 plus `sw.js`.

Die Reihenfolge ist so gewählt, dass nach jedem Commit weder ein
gelöschter Aufrufer noch eine gelöschte Definition offen steht.

---

## 9. Merge-Stand prüfen

Vor dem letzten Push `git fetch origin main`. Ist `main` weitergezogen,
`git merge origin/main` (kein Rebase), Konflikte so auflösen, dass
Fremdarbeit vollständig erhalten bleibt und der Rückbau vollständig
greift, `SW_VERSION` auf den höheren Wert setzen, danach Abschnitt 5 und
6 erneut durchlaufen.

Danach pushen und den Pull Request nach `main` als „ready for review"
eröffnen.
