# Arbeitsanweisung — Bessere Verlangsamung + drei UI-Korrekturen

Adressat: Sonnet (Folge-Session). Grundlage: Nutzerwunsch

> „Die slow playing Funktion klingt richtig schlecht, offensichtlich ist der
> native Mechanismus nicht gut genug. Bitte finde eine bessere Lösung. Es soll
> dann im Menü unter *Kompatibilität und Performance* einen Schalter geben,
> über den ausgewählt wird, ob diese neue Abspielmöglichkeit verwendet wird,
> die vermutlich rechenintensiver ist, oder der alte Weg beibehalten wird
> (v.a. für ältere Handys / bessere Performance).“
>
> Getrennt davon: Zeilenabstand bei der Gigliste kleiner; „Bearbeiten“ bei den
> RECs muss auch die Spurauswahl (Pills) umfassen, nicht nur den Namen;
> Abstand zwischen Songtitel und Tabauswahl verringern.

Gegengeprüft am Stand `84c2dba` von `index.html`, `sw.js`.
**Immer über Funktions- und ID-Namen ansteuern, nie über Zeilennummern.**

---

## 0. Rahmenbedingungen (gelten für jeden Schritt)

1. **Branch:** `claude/slow-play-ui-improvements-yp57cg`. Niemals auf `main`
   pushen. Der Branch ist zu Beginn identisch mit `origin/main` (`84c2dba`).
2. **Kein Build-Schritt, keine Abhängigkeiten.** Die App bleibt eine statische
   PWA von GitHub Pages. Keine `package.json`, kein Bundler, keine externen
   Ressourcen. **Keine neue Datei** außer dieser Doku — der Worklet-Code wird
   wie früher schon (siehe `git show b04fd5b^:index.html`, Konstante
   `WORKLET_SRC`) aus einem Template-String über eine Blob-URL geladen. Damit
   bleibt auch die `SHELL`-Liste in `sw.js` unverändert.
3. **Keine einzige Netzwerkanfrage.** Zusage im `README.md`.
4. **Keine Fremdbibliothek.** Ausdrücklich geprüft und verworfen: SoundTouchJS
   & Co. sind WSOLA-basiert — also genau das Verfahren, das Chrome/Safari für
   `preservesPitch` schon selbst benutzen. Eine WSOLA-Bibliothek würde den
   Klang deshalb *nicht* nennenswert verbessern. Der Gewinn kommt aus dem
   anderen Verfahren (Phasenvocoder, siehe Abschnitt 1), nicht aus einer
   fremden Implementierung.
5. **`SW_VERSION` in `sw.js` erhöhen**, genau **einmal am Ende**, nicht pro
   Commit. (Ursprünglich `'v110'` → `'v111'` geplant; nach dem Merge von
   `origin/main`, das selbst schon auf `'v111'` stand, wurde daraus `'v112'` —
   siehe Abschnitt 8.)
6. **Codestil beibehalten:** deutschsprachige Kommentare im Ton der Datei
   (erklären *warum*, nicht *was*), 2 Leerzeichen Einrückung, keine
   Umformatierung fremder Zeilen, keine Umbenennungen „bei der Gelegenheit“.
7. **Keine Modularisierung.** Alles Neue geht in `index.html` an die
   thematisch passende Stelle (Audio-Ebene bzw. Einstellungen).
8. **i18n:** Alles in der Einstellungsansicht ist übersetzt — neue Texte
   brauchen `data-i18n`-Schlüssel in **allen drei** `STRINGS`-Blöcken
   (`de`, `en`, `pl`). Die REC-Oberfläche im Loops-Reiter ist dagegen
   hartkodiert deutsch; Schritt 6 bleibt deshalb ohne i18n-Schlüssel.
9. **Selbsttests:** Jede neue *reine* Funktion bekommt Prüfungen in
   `runSelfTests()` (Zähler `checks` hochzählen, Fehler in `failed` sammeln).
10. **Commits:** klein und thematisch, wie bisher im Repo (ein Commit pro
    Abschnitt dieser Anweisung ist ein guter Schnitt).

---

## 1. Warum der native Weg schlecht klingt und was stattdessen passiert

Heute steht in `audioSetRate()` schlicht

```js
el.playbackRate = rate;
el.preservesPitch = true;
```

Die Tonhöhenkorrektur macht damit die *Browser-Engine*. Chrome und WebKit
benutzen dafür WSOLA (Overlap-Add mit Anschluss-Suche im Zeitbereich). Auf
polyphonem Chorgesang — viele gleichzeitige, lang gehaltene Töne — erzeugt
WSOLA das typische Flattern/Doppeln; bei 0,6× ist das massiv. Genau das ist
die Beschwerde.

**Das bessere Verfahren für dieses Material ist ein Phasenvocoder mit
Phasenkopplung** (identity phase locking, Laroche/Dolson). Er arbeitet im
Frequenzbereich, hält gehaltene Töne sauber und kostet dafür mehr Rechenzeit —
womit auch der gewünschte Schalter seine Berechtigung hat.

### 1.1 Der Trick, der die Architektur unangetastet lässt

Ein Zeitdehner darf **nicht** an die Stelle des `<audio>`-Elements treten. Der
Grund steht im Kopfkommentar der Audio-Ebene und gilt unverändert: Android
vergibt Audio-Fokus und Mediensitzung nur für hörbare *Medienelemente*; reine
Web-Audio-Ausgabe wurde beim Sperren des Bildschirms nach Sekunden beendet.
Der frühere Worklet-Player wurde deshalb abgeschafft — dorthin gehen wir nicht
zurück.

Stattdessen bleibt das Element die Quelle und wird **umgekehrt** benutzt:

1. Das Element spielt mit `playbackRate = rate` und `preservesPitch = false` —
   also klassisches Bandmaschinen-Verhalten: langsamer *und* tiefer. Das ist
   reines Resampling, macht der Browser sauber und artefaktfrei.
2. Ein AudioWorklet hinter der `MediaElementSource` schiebt die Tonhöhe wieder
   um `k = 1 / rate` nach oben (0,7× → `k ≈ 1,4286`, also +6,2 Halbtöne).
   Ergebnis: langsam, aber in Originaltonhöhe.

Das ist mathematisch dasselbe wie Zeitdehnung, hat aber drei praktische
Vorteile: das Medienelement (und damit Sperrbildschirm, Audio-Fokus,
Mediensitzung, Suchleiste, Loop, Positionsanzeige) bleibt **vollständig
unverändert**; die Puffer im Worklet sind fest begrenzt (Ein- und Ausgabe
stehen exakt 1:1, siehe 1.3); und es gibt keine Wartezeit beim Umschalten der
Geschwindigkeit.

Dass das Element durch Web Audio läuft, ist bereits erprobt und im Einsatz:
Die Kanal-Matrix des Fahrradmodus (`Audio.channel`, Phase-0-Spike) hängt schon
dazwischen und hat Sperrbildschirm und Hintergrundwiedergabe nicht gekostet.
Der neue Knoten reiht sich in genau diese Kette ein:

```
<audio el>  (playbackRate = rate, preservesPitch = false)
   → MediaElementSource
   → PitchShift-Worklet (shift = 1/rate; bei 1,0× reines Durchreichen)
   → splitter (Audio.channelIn)  → 4 Gains → merger → destination
```

### 1.2 Vorher prüfen: lässt sich `preservesPitch` überhaupt abschalten?

Der ganze Ansatz hängt daran, dass der Browser `preservesPitch = false`
respektiert. Alle drei Engines können das, aber blind verlassen wir uns nicht
darauf. **Erster Arbeitsschritt, noch vor der Implementierung:** eine kleine
Wegwerf-Seite im Scratchpad (`spike-pitch.html`) bauen, die ein kurzes
Testsignal (z. B. ein erzeugter 440-Hz-Sinus als WAV-Blob) in ein
`<audio>`-Element mit `playbackRate = 0.7` legt, einmal mit
`preservesPitch = true` und einmal mit `false`, das Signal über einen
`AnalyserNode` misst und die Grundfrequenz ausgibt. Erwartet: 440 Hz bzw.
308 Hz. Ergebnis in dieser Datei unter „Spike-Ergebnis“ notieren.

Wenn `false` ignoriert würde (unerwartet), wäre der Ansatz aus 1.1 hinfällig —
dann **stopp und Rückfrage**, nicht auf eigene Faust ein anderes Verfahren
bauen. (Der Rückfallplan wäre ein Offline-Ansatz: Datei dekodieren, offline
dehnen, als neuer Blob ins Element — teuer in Speicher und Wartezeit, deshalb
nur, wenn 1.1 wirklich scheitert.)

Der Spike ist Wegwerfcode und wird **nicht** committet.

### 1.3 Der Phasenvocoder — genaue Vorgaben

Pro Kanal, Tonhöhenfaktor `k = 1/rate ≥ 1`:

- **Fenster** `N = 2048` (bei 44,1 kHz ≈ 46 ms — lang genug für tiefe
  Männerstimmen, die Begründung stand schon im alten Worklet). Hann-Fenster,
  bei Analyse *und* Synthese angewandt.
- **Synthese-Sprung** `Hs = N / 4 = 512` (75 % Überlappung). Die Summe der
  quadrierten Hann-Fenster ist bei diesem Sprung konstant `1,5`; damit wird
  normiert.
- **Analyse-Sprung** `Ha = Math.max(1, Math.round(Hs / k))`.
- **Tatsächliches Verhältnis** `r = Hs / Ha` — und mit **diesem** `r` wird
  resampled, nicht mit `k`. Dadurch verbraucht jeder Frame exakt `Ha`
  Eingabe- und liefert exakt `Ha` Ausgabesamples (`Hs / r = Ha`): kein Drift,
  keine wachsenden Puffer, kein Nachregeln. Der Preis ist ein
  Tonhöhenfehler von unter 2 Cent (bei 0,6×: `k = 1,6667`, `Ha = 307`,
  `r = 1,6678`) — unhörbar.
- **Ablauf je Frame:** Fenster ausschneiden → fensterten → FFT →
  Betrag/Phase → Phasenfortschritt `dφ = φ − φ_prev − Ha·ω_bin`, auf
  `(−π, π]` gefaltet → wahre Frequenz `ω = ω_bin + dφ/Ha` → Synthesephase
  `ψ += Hs·ω` → **Phasenkopplung:** Spitzen im Betragsspektrum suchen (lokales
  Maximum über ±2 Nachbarn); nur für Spitzen die Phase fortschreiben, alle
  Bins im Einzugsbereich einer Spitze starr daran koppeln
  (`ψ_bin = ψ_peak + (φ_bin − φ_peak)`). Das ist der eigentliche Qualitäts-
  gewinn gegenüber WSOLA — ohne diesen Schritt klingt ein Phasenvocoder
  „phasig“ und wäre die Mühe nicht wert. → IFFT → fenstern → Overlap-Add in
  den Syntheseringpuffer, geteilt durch `1,5`.
- **Resampling** des Synthesestroms mit Verhältnis `r` (lineare Interpolation
  reicht; kubische Hermite-Interpolation ist besser, wenn sie ohne
  Verrenkungen passt).
- **FFT:** eigene Radix-2-Implementierung (komplex, in-place, vorberechnete
  Twiddle-Tabelle). ~80 Zeilen, keine Bibliothek.
- **Unterlauf** (zu wenig Ausgabe im Puffer, z. B. direkt nach `play()` oder
  einem Sprung) → Stille ausgeben, **nie** alte Samples wiederholen, und über
  `port.postMessage` einmal pro Sekunde höchstens einen Zähler melden, den die
  Hauptseite per `dlog('hq:underrun', …)` protokolliert.
- **Rücksetzen:** Bei `shift`-Wechsel und beim Springen (`audioSeek`) die
  Puffer und Phasen zurücksetzen (`port.postMessage({ type: 'reset' })`),
  sonst klingt für eine Fensterlänge das Alte nach.
- **`shift = 1` ⇒ reines Durchreichen** (Eingabe direkt kopieren, kein FFT).
  Das ist der Normalfall bei 1,0× und muss messbar nichts kosten.

**Latenz:** rund `N` Samples (≈ 46 ms). Das ist für eine Übe-App unkritisch
(keine Live-Monitoring-Anwendung), verschiebt aber die REC-Vorschau minimal
gegenüber dem mitlaufenden Original — siehe 1.5.

**Wenn es auf dem Testgerät nicht flüssig läuft:** *nicht* die Qualität durch
kleinere Fenster kaputtsparen, sondern zuerst `Hs = N/2` mit
`sqrt(Hann)`-Fenstern bei Analyse und Synthese probieren (halbe Rechenlast,
perfekte Rekonstruktion, etwas weniger Vocoder-Qualität) und das Ergebnis hier
dokumentieren.

### 1.4 Testbarkeit — DSP einmal schreiben, zweimal benutzen

Der Worklet-Code liegt in einem String und wäre damit nicht testbar. Deshalb:

- Die **reinen** Bausteine (`hqPrincipalAngle`, `hqAnalysisHop`,
  `hqPitchRatio`, `HqFft`, `HqPitchShifter`) werden als ganz normale
  Funktionen/Klassen auf oberster Ebene in `index.html` geschrieben — direkt
  aufrufbar, direkt testbar.
- Der Worklet-Quelltext wird daraus zur Laufzeit zusammengesetzt:
  `[hqPrincipalAngle, hqAnalysisHop, hqPitchRatio, HqFft, HqPitchShifter].map(f => f.toString()).join('\n\n')` plus die
  `registerProcessor`-Klammer als Template-String. Das Repo minifiziert nicht
  (handgeschriebene `index.html`), `Function.prototype.toString()` ist hier
  also verlässlich. **Bedingung:** Diese Bausteine dürfen auf nichts außerhalb
  ihrer selbst zugreifen — keine Konstanten, keine Helfer von außen. Diese
  Bedingung als Kommentar über den Block schreiben.
- Der zusammengesetzte String geht wie früher über
  `URL.createObjectURL(new Blob([...], { type: 'application/javascript' }))`
  an `ctx.audioWorklet.addModule(url)`, die URL danach im `finally` wieder
  freigeben.

**Selbsttests** in `runSelfTests()` (rein synchron, alles unten läuft im
Hauptthread):

1. `hqPrincipalAngle` faltet korrekt: `0 → 0`, `3π → π` (bzw. `−π`, je nach
   gewählter Konvention — festlegen und prüfen), `−3π`, `2π → 0`.
2. `hqAnalysisHop(512, k)` für `k ∈ {1/0.85, 1/0.7, 1/0.6}`: Ergebnis ganzzahlig,
   `≥ 1`, `≤ 512`; `hqPitchRatio(512, Ha)` weicht um weniger als 0,5 % von `k` ab.
3. `hqAnalysisHop` verkraftet Randfälle: `k = 1` → `512`; sehr großes `k` → `1`.
4. **Durchreichen:** `HqPitchShifter` mit `shift = 1` auf 4096 Samples Rauschen
   gibt (nach der Latenz) exakt dieselben Samples zurück.
5. **Tonhöhe:** ein 440-Hz-Sinus (44 100 Hz, 1 s) durch den Shifter mit
   `shift = 1/0.7`; die Grundfrequenz des Ausgangs (Nulldurchgangszählung oder
   Autokorrelation, im eingeschwungenen Teil ab Sample 4096 gemessen) liegt
   innerhalb von 2 % bei `440 · 1,4286 ≈ 629 Hz`.
6. **Längentreue:** derselbe Lauf liefert genauso viele Ausgabe- wie
   Eingabesamples.

Test 5 ist der wichtige — er beweist, dass das Verfahren überhaupt tut, was es
soll. Er darf nicht durch großzügige Toleranzen weichgespült werden.

### 1.5 Anschlüsse an bestehende Funktionen

- **`Audio.elSource` merken.** Heute wird `ctx.createMediaElementSource(el)`
  in `audioInit()` sofort weggeworfen (`.connect(splitter)`). Das Ergebnis
  muss in `Audio` abgelegt werden, sonst lässt sich der Knoten später nicht
  umhängen. `createMediaElementSource` darf pro Element **nur einmal**
  aufgerufen werden — beim Umschalten des Schalters also nur um-, nie
  neuverdrahten.
- **`audioSetRate()` und `audioLoadTrackNow()`** setzen beide `playbackRate`
  und `preservesPitch`. Diese Doppelung durch **eine** Funktion
  `applyRateToElement()` ersetzen, die je nach aktivem Modus entweder
  (`preservesPitch = true`, Shift 1) oder (`preservesPitch = false`,
  Shift `1/rate`) setzt. Alle Aufrufer auf sie umstellen. Der Kommentar in
  `audioLoadTrackNow()` (WebKit setzt beim Laden zurück) gilt weiter — die
  Werte müssen nach jedem Laden erneut gesetzt werden.
- **`audioSeek()`** stößt zusätzlich das `reset` im Worklet an.
- **Fahrradmodus** bleibt unberührt: der neue Knoten hängt *vor*
  `Audio.channelIn`, die Matrix dahinter bleibt, wie sie ist.
- **Hintergrundtrack (`Audio.bg`, REC-Mitsingen)** wird bewusst **nicht**
  durch den Shifter geführt. Er speist direkt in `Audio.channelIn` und behält
  seinen nativen `preservesPitch = true`-Weg. Begründung (als Kommentar an
  `ensureBackingAudio()` schreiben): Er läuft leise im Hintergrund als
  Orientierung, beide Wege liefern die *richtige* Tonhöhe, und ein zweiter
  Vocoder wäre die doppelte Rechenlast für den unwichtigeren Ton. Die ~46 ms
  Latenz des Shifters wirken nur auf den REC — falls das in der Praxis stört,
  ist die Stellschraube die bestehende Drift-Korrektur (`backingCorrection`),
  nicht ein zweiter Vocoder. Erst prüfen, dann ggf. hier notieren.
- **`onAudioContextStateChange()`**, der `pause`-Listener, die Aussetzer-
  Erkennung (`audio:stall`) und die `mediaSession` bleiben unverändert — sie
  hängen alle am Element, nicht am Graphen.

---

## 2. Der Schalter: neue Karte „Kompatibilität & Performance“

Eine Karte dieses Namens gibt es in den Einstellungen **noch nicht** (geprüft:
vorhandene Karten sind Persönliches, Meine Stimmen, Lichtshow,
Fahrradfahren-Modus, Bildschirm & Hintergrund, Hilfe, Daten & Sicherung, Über
die App, Speicher). Sie wird also neu angelegt — **es sei denn**, ein
zwischenzeitlicher Merge in `main` hat sie schon gebracht (siehe Abschnitt 8);
dann dort einhängen.

- **Platzierung:** in `#view-settings` als neue `.card` direkt **nach**
  „Bildschirm & Hintergrund“ und vor „Hilfe“. Thematisch benachbart, und der
  Nutzer, der wegen Rucklern in „Bildschirm & Hintergrund“ liest, stolpert
  direkt darüber.
- **Aufbau** exakt wie die Karte „Bildschirm & Hintergrund“: `<h2>` mit
  `card-icon`-SVG (ein passendes schlichtes Strichsymbol, z. B. Tacho/Regler —
  im Stil der übrigen, `stroke-width="1.8"`, keine Füllung) plus
  `<span data-i18n="settings.perf.title">`, darunter eine `.row` mit Text und
  `button.switch[role="switch"]` (`id="btn-hq-slow-toggle"`), darunter ein
  `<p class="small muted">` als Erklärung.
- **Zustand zeichnen** in `renderSettings()` neben
  `$('#btn-screen-toggle').setAttribute('aria-checked', …)`.
- **Handler** neben dem `#btn-screen-toggle`-Handler: `saveSettings(...)`,
  `aria-checked` setzen, dann die Kette umbauen (`applyHqMode()`) und
  `applyRateToElement()` neu anwenden. **Das muss im laufenden Betrieb
  funktionieren** — umschalten während der Wiedergabe darf höchstens ein
  kurzes Knacken kosten, nicht den Ton verlieren.
- **Nicht verfügbar?** Fehlt `AudioContext`/`audioWorklet` oder scheitert
  `addModule`, wird der Schalter `disabled` gesetzt und ein kurzer Hinweistext
  darunter eingeblendet („Dieses Gerät unterstützt die bessere Verlangsamung
  nicht.“, eigener i18n-Schlüssel, per `hidden` gesteuert). Kein Banner, kein
  Fehler — die App spielt dann einfach wie bisher.

**Einstellung:** in `DEFAULT_SETTINGS`

```js
hqSlowdown: true,   // bessere (rechenintensivere) Verlangsamung: Phasenvocoder statt nativem preservesPitch
```

**Standard: an.** Begründung: Die Beschwerde ist der schlechte Klang; wer ein
schwaches Gerät hat, findet den Schalter dort, wo er ihn sucht, und der
Hinweistext sagt es ausdrücklich. Sicherung/Wiederherstellung braucht nichts
Zusätzliches — `loadSettings()` mischt über `{ ...DEFAULT_SETTINGS, ...stored }`.

**Texte** (de; `en`/`pl` sinngemäß in allen drei `STRINGS`-Blöcken anlegen):

| Schlüssel | Deutsch |
|---|---|
| `settings.perf.title` | `Kompatibilität & Performance` |
| `settings.perf.hqSwitch` | `Bessere Tonqualität beim langsamen Abspielen` |
| `settings.perf.hqAria` | `Bessere Tonqualität beim langsamen Abspielen` |
| `settings.perf.hqHint` | `Rechnet den Klang bei 0,85×, 0,7× und 0,6× selbst um, statt es dem Browser zu überlassen — deutlich sauberer bei gehaltenen Tönen. Kostet dafür mehr Rechenleistung. Stockt die Wiedergabe auf einem älteren Handy oder wird es warm, schalte hier aus.` |
| `settings.perf.hqUnsupported` | `Dieses Gerät unterstützt die bessere Verlangsamung nicht — es bleibt beim bisherigen Weg.` |

---

## 3. Diagnose

Im bestehenden `dlog`-Stil (keine Titel, keine Dateinamen, nur Zahlen und
Zustände) ergänzen: `hq:init` (`{ ok, name }` bei Fehlschlag von
`addModule`), `hq:mode` (`{ on, rate, shift }` bei jedem Umschalten),
`hq:underrun` (`{ count }`, höchstens einmal pro Sekunde). Mehr nicht.

---

## 4. Zeilenabstand in der Gigliste

Betrifft die Liste unter „Nächster Gig“ auf der Setlisten-Ansicht, erzeugt in
`renderCurrentSetlist()`:

```js
const list = el('ol', { class: 'stack small', style: 'margin:8px 0 0; padding-left:20px' });
```

`.stack > * + *` gibt jedem Eintrag `margin-top: 10px` — zwischen einzeiligen
Titeln viel zu luftig. Statt den Inline-`style` weiter aufzublähen: eine
kleine CSS-Klasse `.gig-list` bei den übrigen Setlisten-Stilen anlegen
(`margin: 8px 0 0; padding-left: 20px;` plus `> li + li { margin-top: 3px }`
und eine engere `line-height`, z. B. `1.35`), die `stack`-Klasse dort
entfernen und `class: 'gig-list small'` setzen. Inline-`style` im JS entfällt
damit. Kurzer Kommentar an der Regel, warum sie enger ist als `.stack`.

Andere Listen (`.list-item`, Warteschlange im Player, Setlisten-Detail) bleiben
unangetastet.

---

## 5. Abstand Songtitel ↔ Tabauswahl

Zwischen `#player-title` (in `.player-head`) und `#player-tabs` stehen heute
drei Beiträge: `.player-head` `padding-bottom: 10px`, `.player-body`
`padding-top: 14px`, `.player-tabs` `margin: 8px 0`. Zusammen ~32 px.

Ziel: spürbar enger, ohne dass es gedrängt wirkt und ohne andere Ansichten zu
beschädigen. Vorgabe:

- `.player-tabs { margin: 2px 0 8px; }` (der untere Abstand bleibt).
- `.player-head` `padding-bottom` von `10px` auf `6px`.

`.player-body`s `padding-top` **nicht** anfassen — daran hängen auch der
Leerzustand, der Hinweiskasten und der Warteschlangen-Block.

Achtung: `.player-tabs--mini` (Standard-Reiter-Auswahl in den Einstellungen)
überschreibt `margin` bereits selbst (`margin: 8px 0 0`) und bleibt damit
unberührt — nach der Änderung nachprüfen, dass die Regel weiterhin *nach*
`.player-tabs` steht.

Danach optisch prüfen: Player mit und ohne Warteschlangen-Block, mit langem
(zweizeiligem) Songtitel.

---

## 6. REC bearbeiten: Name **und** Spur in einem Dialog

Heute in `renderRecordingList()` am `rename`-Knopf: erst `promptDialog` für den
Namen, danach `pickRecordingVoice()` — zwei hintereinander aufpoppende
Dialoge, der zweite eine senkrechte Knopfliste. Gewünscht ist **ein** Dialog
mit Namensfeld und der Stimmwahl als Pills.

- Neue Funktion `editRecordingDialog({ name, voice })` neben `promptDialog()`
  im Dialog-Block, gebaut aus denselben Bausteinen (`el`, `.dialog`,
  `.dialog-actions`, `openModal`/`closeModal`, Klick auf den Backdrop und
  `onEscape` → `null`, Enter im Textfeld → speichern).
  Rückgabe: `{ name, voice }` oder `null` bei Abbruch.
- Die Stimmwahl als `.preset-row` mit `.preset`-Knöpfen und
  `aria-pressed` — dieselbe Mechanik wie beim Fahrradfahren-Modus
  (`#channel-mode`), damit es sich anfühlt wie der Rest der App. Sechs
  Optionen: „Keine“, dann `SOP`, `ALT`, `TEN`, `BASS`, `LEAD` mit
  `VOICE_LABEL`. `.preset-row` ist auf drei Spalten festgelegt — für diese
  Reihe eine Variante mit `grid-template-columns: repeat(3, 1fr)` und zwei
  Zeilen (passt) oder eine eigene Klasse mit `flex-wrap`. Auswahl ist
  **exklusiv**, genau ein Knopf ist immer aktiv.
- `role="group"` mit `aria-label="Stimme"` auf die Reihe, Namensfeld behält
  ein `aria-label`.
- Aufrufstelle: der `rename`-Handler ruft nur noch diesen einen Dialog,
  übernimmt `name` (leer ⇒ alter Name bleibt) und `voice`, schreibt per
  `DB.metaPut` und ruft `renderRecordingList()` — wie bisher.
- Der Dialogtitel wird von „REC umbenennen“ zu **„REC bearbeiten“**; das
  `aria-label` des Knopfs sagt bereits „bearbeiten“.
- **`pickRecordingVoice()` bleibt bestehen** — es wird beim *Speichern* eines
  frischen Takes (`#btn-rec-save`) weiterhin gebraucht. Nicht löschen, nicht
  umbauen.
- Hartkodiert deutsch, kein `data-i18n` (Abschnitt 0.8).

---

## 7. Prüfen vor dem Push

Es gibt keine Testsuite und keinen Linter im Repo. Also:

1. `runSelfTests()` in der Browserkonsole — alle Prüfungen bestanden, inklusive
   der neuen aus 1.4.
2. Die App tatsächlich starten (der lokale Chromium ist da; ein statischer
   Server auf dem Repo-Ordner genügt) und **wirklich anhören**, nicht nur
   Code lesen:
   - 1,0× / 0,85× / 0,7× / 0,6× mit Schalter **an**: Tonhöhe unverändert,
     kein Flattern, kein Knacken beim Wechsel, kein Aussetzer.
   - Dieselbe Runde mit Schalter **aus**: verhält sich exakt wie vorher.
   - Umschalten des Schalters **während** der Wiedergabe, in beide
     Richtungen — Ton bleibt.
   - A-B-Loop bei 0,6×: Rücksprung sauber, kein aufgelaufener Puffer.
   - Stimmwechsel bei 0,6×: nach dem Laden stimmt die Geschwindigkeit noch
     (das ist genau die Falle, vor der der Kommentar in
     `audioLoadTrackNow()` warnt).
   - Fahrradmodus Mono/Tauschen bei 0,7×: wirkt weiterhin.
   - REC-Vorschau mit mitlaufendem Original bei 0,7×: beide in derselben
     Tonhöhe, Drift-Korrektur greift.
   - Screenshots (Player, Setlisten-Ansicht, REC-Bearbeiten-Dialog,
     Einstellungskarte) ansehen — die drei UI-Änderungen aus 4/5/6 wirklich
     angucken, nicht nur diffen.
3. `dlog`-Ausgabe auf `hq:underrun` prüfen — kommt das im Ruhezustand vor, ist
   die Puffer-Logik falsch.
4. **Konsole muss sauber sein** — keine Warnungen, keine Fehler.

Ergebnisse (auch das Spike-Ergebnis aus 1.2 und eine grobe CPU-Beobachtung)
unten in dieser Datei unter „Ergebnisse“ festhalten.

---

## 8. Merge-Stand von `main` — zum Schluss prüfen

Während dieser Arbeit kann in `main` weiteres gemerged werden (aktuell offen:
PR #50, Lichtshow). **Vor dem letzten Push:**

1. `git fetch origin main`
2. Ist `origin/main` weitergezogen: `git merge origin/main` in den Branch
   (kein Rebase — der Branch ist bereits gepusht).
3. Konflikte in `index.html` sind wahrscheinlich, weil alles in einer Datei
   liegt. Auflösen heißt hier: **beide** Änderungen behalten, nicht die eine
   über die andere legen. Besonders hinsehen bei
   - `DEFAULT_SETTINGS` (neue Schlüssel von beiden Seiten),
   - den drei `STRINGS`-Blöcken,
   - `#view-settings` (neue Karten könnten kollidieren — falls `main`
     zwischenzeitlich selbst eine Karte „Kompatibilität & Performance“
     gebracht hat, den Schalter dort einhängen statt eine zweite anzulegen),
   - `runSelfTests()`,
   - `SW_VERSION` in `sw.js` — nach dem Merge auf einen Wert **über** beiden
     Seiten setzen.
4. Danach Punkt 7 **erneut** durchlaufen (mindestens Selbsttests + Anhören bei
   0,7×), dann pushen.

---

## Spike-Ergebnis

Die tragende Annahme aus Abschnitt 1.2 ist bestätigt. Ein 440-Hz-Sinus als
WAV-Blob in einem `<audio>`-Element mit `playbackRate = 0.7`, Grundfrequenz
per Autokorrelation über einen `AnalyserNode` gemessen (Chromium 1194,
headless):

| `preservesPitch` | gemessen | erwartet |
|---|---|---|
| `true` | 441 Hz | 440 Hz (Tonhöhe gehalten) |
| `false` | 308,4 Hz | 308 Hz (= 440 × 0,7) |

`false` wird also respektiert — das Element resampled sauber, und der
Phasenvocoder bekommt genau das Signal, das er erwartet. Der Weg aus 1.1
trägt, der Rückfallplan (Offline-Dehnung) wird nicht gebraucht.

## Ergebnisse

**Selbsttests.** `runSelfTests()` im echten Seitenkontext: *Alle 10456
Prüfungen bestanden*, `failed.length === 0`, keine Fehler oder Warnungen in
der Konsole außer dem absichtlich provozierten `[notiz] Error: Testfehler`
aus `runAsyncSelfTests()` (unverändert aus `main`, kein Regress). Die sechs
neuen HQ-Prüfungen aus 1.4 sind darin enthalten.

**Der Vocoder im echten Worklet.** Die Selbsttests messen den DSP-Kern im
Hauptthread; zusätzlich wurde der *ausgelieferte* Worklet-Quelltext
(`hqBuildWorkletSource()`) in einem `OfflineAudioContext` registriert und ein
440-Hz-Oszillator bei `shift = 1/0,7` hindurchgeschickt:

- gemessen **629,0 Hz**, erwartet 628,6 Hz — Abweichung 0,07 %.

Damit ist nicht nur die Mathematik geprüft, sondern die Kette aus
`toString()`-Zusammenbau, Blob-URL, `addModule()`, `registerProcessor` und
`process()` als Ganzes.

**Verdrahtung im App-Pfad.** Nach `audioInit()` stehen `Audio.hqNode`,
`Audio.elSource` und `Audio.channelIn`. Umschalten von `settings.hqSlowdown`
im laufenden Zustand, dreimal hin und her:

| Zustand | `el.preservesPitch` | `el.playbackRate` |
|---|---|---|
| HQ an | `false` | 0,7 |
| HQ aus | `true` | 0,7 |
| HQ wieder an | `false` | 0,7 |

`createMediaElementSource()` läuft dabei nur einmal; umgehängt werden
ausschließlich die Verbindungen (siehe `applyHqMode()`).

**Offen geblieben.** Die Messungen oben stammen aus Chromium in dieser
Umgebung. Ein Härtetest auf echter Hardware — hörbare Qualität bei 0,6× auf
Chorgesang, CPU-Last und Wärmeentwicklung auf einem älteren Android-Gerät,
Verhalten von `preservesPitch = false` in Safari/iOS — steht aus und lässt
sich hier nicht nachstellen. Genau dafür ist der Schalter da; sollte sich auf
iOS zeigen, dass `preservesPitch = false` dort ignoriert wird, ist die Stelle
zum Nachbessern `applyRateToElement()`.

---

# NACHTRAG — Befund vom Gerätetest und weiteres Vorgehen

Der erste Gerätetest (Pixel 9, GrapheneOS/Vanadium) fiel negativ aus. Meldung:

> „Schon bei 0,85 deutliches Stottern und Knistern, hohe Störgeräusche.
> Außerdem scheint es langsamer als 0,85 zu sein, und bei 0,7 hört man einen
> Pitchabfall, dann auch nur noch alle paar ms ein verzerrtes Audioschnipsel,
> also sehr stotternd.“

Das ist keine Feinabstimmung mehr, sondern grobes Fehlverhalten. **Der Schalter
steht deshalb ab sofort auf `false`** (`DEFAULT_SETTINGS.hqSlowdown`), der
Hinweistext in den Einstellungen nennt ihn in allen drei Sprachen als Versuch.
Niemand bekommt die Verschlechterung ungefragt.

## Befund

Alle Zahlen unten sind gemessen (Chromium, `OfflineAudioContext` bzw. echter
`AudioContext`), nicht geschätzt. Die Skripte liegen im Scratchpad.

### 1. Die Rekonstruktion ist korrekt — der Fehler steckt im Shift-Pfad

Läuft der Vocoder mit Faktor ≈ 1 (volle FFT-Kette, aber weder Dehnung noch
Resampling), ist die Ausgabe bei 3 kHz und 6 kHz **−140 dB** sauber. FFT,
Fensterung, Overlap-Add und die Normierung durch 1,5 sind also in Ordnung; der
Verstärkungsfaktor stimmt auf 0,01 dB genau. Mit echtem Shift 1/0,6 auf einem
**reinen Sinus** wächst der Fehler dagegen mit der Frequenz:

| Testton | Störanteil |
|---|---|
| 220 Hz | −47,6 dB (Messgrenze) |
| 1 kHz | −47,5 dB |
| 3 kHz | −42,9 dB |
| 6 kHz | −32,1 dB |
| 9 kHz | −24,3 dB |

### 2. Ursache dafür: die lineare Interpolation in `readOutput()`

Derselbe Test mit kubischer Hermite-Interpolation statt linearer, sonst
bitgleich:

| Testton | linear | kubisch | Gewinn |
|---|---|---|---|
| 3 kHz | −42,9 dB | −47,7 dB | 4,8 dB |
| 6 kHz | −32,1 dB | −43,6 dB | **11,5 dB** |
| 9 kHz | −24,3 dB | −32,0 dB | 7,7 dB |

Bei 9 kHz liegen selbst kubisch noch −32 dB an — für Zischlaute und
Beckenanteile hörbar. Ein Polyphasen-Resampler mit fensterbegrenztem Sinc
(16–32 Koeffizienten, vorberechnete Tabelle) kommt auf −80 dB und kostet
kaum etwas.

### 3. Das Resampling des `<audio>`-Elements ist nicht das Problem

Gemessen an einem echten Element mit `MediaElementSource`, zwei stehenden
Tönen: 1,0× ergibt −89,6 dB, `playbackRate = 0,7` mit `preservesPitch = false`
ergibt **−49,9 dB**. Nicht transparent, aber deutlich besser als der Vocoder.
Der Architekturansatz aus Abschnitt 1.1 ist damit nicht widerlegt.

(Nebenbei bestätigt: `playbackRate` und `preservesPitch` müssen **nach**
`loadedmetadata` gesetzt werden — davor werden sie verworfen. Der Kommentar in
`audioLoadTrackNow()` hat recht.)

### 4. Die eigentliche Ursache des Stotterns: Echtzeit

Offline gerendert meldet der Worklet **null** Unterläufe — offline gibt es
aber auch keine Frist. Gemessene Rechenlast (x86, warmer JIT, zwei Kanäle):

| Tempo | Mittel je Quantum | Budget | Anteil eines Kerns |
|---|---|---|---|
| 0,85× | 0,19 ms | 2,67 ms | 7,1 % |
| 0,7× | 0,24 ms | 2,67 ms | 9,1 % |
| 0,6× | 0,26 ms | 2,67 ms | 9,8 % |

Der Mittelwert täuscht. Die Arbeit fällt **stoßweise** an: ein Frame entsteht
nur alle `Ha` Samples (bei 0,85× alle 435, also alle 3,4 Quanten), kostet dann
aber für beide Kanäle rund 0,64 ms — ein Viertel der Frist in *einem* Quantum,
auf dieser x86-Maschine. Auf einem ARM-Kern mit JS ist der Faktor 2–3, also
1,3–1,9 ms von 2,67 ms, und zwar zusätzlich zu Mediendekodierung, Resampler
und Kanal-Matrix im selben Callback. Genau das erklärt „stottert schon bei
0,85×“ und „bei 0,7 nur noch Schnipsel“.

Dazu kommt Speicherzuweisung auf dem Audio-Thread — jede davon riskiert eine
GC-Pause und damit einen hörbaren Aussetzer:

- `process()` legt pro Kanal und Quantum ein neues `Float32Array` an (~750/s).
- `inFifo` ist ein gewöhnliches JS-Array mit `push()` je Sample und
  `splice(0, Ha)` je Frame.
- `findPeaks()` baut pro Frame und Kanal ein neues Array mit bis zu ~200
  Einträgen.

### 5. Unnötig teure Mathematik im heißen Pfad

Gemessen über 5 Mio. Aufrufe:

| Operation | Zeit | je Aufruf |
|---|---|---|
| `Math.hypot(a,b)` | 92,4 ms | 18,5 ns |
| `Math.sqrt(a*a+b*b)` | 14,2 ms | 2,8 ns |
| `Math.atan2` | 73,6 ms | 14,7 ns |
| `Math.cos + Math.sin` | 83,8 ms | 16,8 ns |

`Math.hypot` ist **6,5× langsamer** als `sqrt` — bei bitgleichem Ergebnis
(beide Summen stimmten auf die dritte Nachkommastelle überein). Der Code ruft
pro Frame und Kanal 1025-mal `hypot` **und** 1025-mal `atan2` **und**
1025-mal `cos`/`sin` auf.

## Vorgehen — in dieser Reihenfolge

**Schritt 0 — erledigt.** Schalter auf Standard aus, Hinweistext als Versuch
markiert, `SW_VERSION` hochgezählt.

Dazu eine **einmalige Rücknahme** in `loadSettings()`: Der geänderte Standard
allein reicht nicht, weil `saveSettings()` immer das gesamte Objekt schreibt —
auf jeder Installation, die während der kaputten Version irgendeine Einstellung
angefasst hat, steht `hqSlowdown: true` bereits gespeichert. Der Merker
`hqSlowdownReset` sorgt dafür, dass genau einmal zurückgenommen wird; wer die
Funktion danach bewusst wieder einschaltet, behält sie. Alle drei Fälle im
Browser geprüft (frische Installation, Altbestand, bewusstes Wiedereinschalten).

**Schritt 1 — auf dem Gerät messen statt raten.** Ohne Zahlen vom Pixel 9
bleibt jede Optimierung Stochern. Der Worklet misst seine eigene `process()`-
Dauer, meldet Mittel- und Maximalwert als Anteil der Frist über den bestehenden
`port`, und die Einstellungskarte zeigt das an (nur solange der Schalter an
ist). Zusammen mit dem schon vorhandenen `hq:underrun`-Zähler steht damit
fest, ob es die Frist ist, die GC oder etwas Drittes. Das ist wenig Arbeit und
entscheidet alles Weitere.

**Schritt 2 — Echtzeitsicherheit.** Keine einzige Speicherzuweisung mehr im
Audio-Thread: `inFifo` durch einen vorbelegten Ringpuffer ersetzen, Ausgabe in
den vom Aufrufer gelieferten Puffer schreiben statt ein neues Array anzulegen,
Spitzenliste als vorbelegtes `Int32Array` mit Zähler. Zusätzlich die Last
glätten: höchstens **ein** Frame je Quantum verarbeiten und dafür das Polster
im Ring vergrößern, damit die Spitze nicht mehr in ein einzelnes Quantum
fällt.

**Schritt 3 — Rechenlast senken.** `hypot` → `sqrt`. `atan2`/`cos`/`sin` nur
noch für die Spitzen statt für alle 1025 Bins: die Phasenkopplung
`ψ_bin = ψ_peak + (φ_bin − φ_peak)` lässt sich als komplexe Drehung des
Spektrums um `ψ_peak − φ_peak` schreiben, also als zwei Multiplikationen je
Bin statt vier Winkelfunktionen. Danach die beiden Kanäle in **einer** FFT
verarbeiten (reelles Signal links im Real-, rechts im Imaginärteil) — halbiert
Hin- und Rücktransformation.

**Schritt 4 — Resampler.** Lineare Interpolation durch einen
Polyphasen-Sinc ersetzen (Schritt 2 des Befunds). Erst nach Schritt 2 und 3
sinnvoll: solange es stottert, hört niemand den Unterschied zwischen −32 und
−80 dB.

**Schritt 5 — neu bewerten.** Läuft es dann auf dem Pixel sauber und klingt
besser als der native Weg, Standard wieder auf an. Bleibt es marginal, ist der
Ansatz aus Abschnitt 1.1 auf Mobilgeräten am Ende, und der ursprünglich
verworfene Weg wird zur ernsthaften Alternative: **offline dehnen statt in
Echtzeit** — den Abschnitt einmal vorab durchrechnen, das Ergebnis
zwischenspeichern und dem Element als Blob geben. Das kostet Wartezeit und
Speicher, hat aber überhaupt kein Echtzeitrisiko und erlaubt ein beliebig
gutes Verfahren. Für den Kernfall dieser App — einen kurzen Abschnitt in der
Schleife langsam üben — wäre eine Vorabberechnung von zehn Sekunden Audio
sogar sehr günstig.

**Nicht** angefasst wird der Rest: die drei UI-Korrekturen sind unabhängig,
funktionieren und bleiben.
