# Bericht: Groove Lab – Lastanzeige reparieren und immer zugänglich machen

Branch `groove-lab-lastanzeige` (Basis `f1cc685`), Anweisung:
`docs/ARBEITSANWEISUNG-GROOVE-LAB-LASTANZEIGE.md`. SW_VERSION `v531` → `v535`.
`chorApp.selfTestMusic()` und `chorApp.selfTest()` sind grün (headless Chromium 141).

## Änderungen je Paket

### Paket A – API-Fix (Commit 2)
* `groove-lab.js`: `_playoutUnderruns()` → `_playbackStats()` (`ctx.playbackStats ?? ctx.playoutStats ?? null`, in try/catch). Neu `_pollPlaybackStats()`: steigender `underrunEvents` ruft `_noteOverload('underrun')`, `underrunDuration` wird in `_ovl` gemerkt. `start()` und `_watchOverload()` nutzen es.
* `app.js` (`runMusicSelfTests`): Spion-Kontext ohne echten AudioContext – kein Kontext/keine API → kein Fehler und kein Aussetzer; steigender Zähler → genau ein `underrun`; gleicher Zähler → nichts; Altname `playoutStats` als Rückfall; werfender Getter bleibt still.

### Paket B – Knopf immer sichtbar (Commit 3)
* Markup: Knopf ohne `hidden`, enthält Tachosymbol (SVG) und „!“; CSS-Klasse `is-warn` schaltet zwischen neutral (gedämpft, Rand) und rot um.
* `_overloadWarn()`, `_renderOverloadBtn()` (Klasse, `aria-label`, `title`), `_renderOverload()` setzt `_ovl.warn = true`; `_setLatency()` setzt auf neutral zurück statt zu verstecken.
* `_renderOverloadPop()`: Titel/Text je Zustand (neutral „Audio & Leistung“, Warnung „Das Gerät kommt nicht hinterher“), ebenso das `aria-label` des Dialogs. Pufferwahl, gemessene Verzögerung und „Groß“-Hinweis unverändert.
* Escape schließt das Panel (`_handleKeydown`), Fokus geht wie bisher zum Knopf zurück.
* `strings.js`: `lab.ovl.ariaIdle/titleIdle/textIdle` (de, en, pl – ein vorhandener Test verlangt pl für jeden Schlüssel).
* Selbsttest: neutral → drei Aussetzer → Warnung (Klasse, aria-label, Panel-Titel) → `_setLatency` → wieder neutral; Escape.

### Paket C – Diagnosebereich (Commit 4)
* `GrooveEngine._buildGraph(ctx)`: der Graph-Aufbau aus `start()` wurde unverändert in eine Methode gezogen; `start()` ruft sie auf und macht danach wie bisher Samples laden und `resume()`. Das Verhalten des Live-Graphen ändert sich nicht.
* Panel-Abschnitt „Diagnose“ (`_diagLines()`, `_renderDiag()`), Aktualisierung per `setInterval` 1 s, nur bei offenem Panel (Start/Stopp in `_toggleOverloadPop`, auch in `close()`).
  * Rechenlast: `renderCapacity` (`_syncRenderCapacity()`: `start({ updateInterval: 1 })`, `update`-Event → `_onRenderCapacity()`), läuft nur solange Transport spielt oder Panel offen ist, sonst `stop()`; Quelle steht in Klammern. Ohne `renderCapacity`: Ergebnis des Lasttests, sonst „noch nicht gemessen“; ohne `OfflineAudioContext`: „in diesem Browser nicht messbar“.
  * Aussetzer (`underrunEvents`/`underrunDuration`, sonst „vom Browser nicht gemeldet“), Latenz (`baseLatency`, `outputLatency`, `averageLatency`/`maximumLatency`), Kontext (Puffer, `sampleRate`, `state`, Gerätename nur wenn `enumerateDevices` ohne Berechtigung Labels liefert – sonst weggelassen), Erkennungs-Zähler.
  * `_noteOverload(grund)` zählt jetzt je Grund (`gap`, `ratio`, `underrun`, `load`), auch entprellte Treffer.
  * „Werte kopieren“ (`_diagText()`/`_copyDiag()`): alle Werte, Lasttest, User-Agent, Zeitpunkt; Clipboard-API, Rückfall `execCommand('copy')`.
* **Lasttest** (`_measureLoad()`/`_renderLoadTest()`): zweite `GrooveEngine` auf einem `OfflineAudioContext` (Abtastrate des Live-Kontexts, 4 s), Graph über `_buildGraph`, Pegel/Klang/Effekte wie `_syncEngine`, dann die ersten 4 s ab Beginn des laufenden Akkords über die echten `_playStep`-Funktionen eingeplant (alle aktiven Spuren, Bass, Akkorde, Melodie, Arp, Sample-Spuren, Liegeton, Hall, Echo, Chorus, Waveshaper). Gemessen wird nur `startRendering()` (Wanduhr ÷ 4 s). Einstufung `loadLevel()`: ab 40 % gelb, ab 70 % rot mit Hinweis. Der Knopf ist während der Messung gesperrt („Messe …“), die Wiedergabe läuft weiter.
  * Ich habe den **vollständigen** Nachbau gewählt (nicht die konservative Variante): `_playStep` wird kurz auf die Offline-Engine umgeleitet (synchron, ohne `await`, mit `try/finally`), `_playAutomation` und `_flashKey` ignorieren das per `_offline`-Flag (sonst würden Automation Klang/Regler verstellen und Tasten falsch aufleuchten). Dekodierte Samples (`labSamples`, `bassSamples`, `inst`) werden vom Live-Kontext mitbenutzt.
  * `maxVoices` ist offline unbegrenzt (alles ist vorab eingeplant; das Live-Limit von 32 würde sonst früh Töne abschneiden).
  * Ist noch kein Live-Kontext da, startet der Knopf ihn (`_ensureAudio()`, lautlos), um die Abtastrate zu bekommen.
* Strings in de/en/pl (`lab.ovl.*`), CSS für `dl`, Ergebnis, `--warn`.
* Selbsttests: `loadLevel`-Schwellen, Zähler je Grund, Diagnosezeilen ohne APIs, Spion-`renderCapacity` (`start({ updateInterval: 1 })`, Werte, `stop()` beim Schließen, werfender Getter).

### Paket D – Erkennung schärfen (Commit 5)
* `_onRenderCapacity()` meldet `_noteOverload('load')`, wenn `peakLoad ≥ 0.95` oder `underrunRatio > 0` (`_rcOverload()`, Konstante `RC_PEAK_LOAD`) – nur bei sichtbarer Seite und laufendem Kontext, wie die anderen Signale.
* Ratio-Schwelle (`OVERLOAD_RATIO = .9`) bewusst **nicht** verschärft (Fehlalarme beim Hintergrund-Wechsel). Sie ist für kurzes Knacken ungeeignet: `currentTime` läuft bei einzelnen Aussetzern weiter, die Quote über eine Sekunde fällt dadurch praktisch nie – sie erkennt nur anhaltende Langsamkeit. Dasselbe gilt für die Scheduler-Lücke (> 150 ms): bei 100 ms Vorlauf sind Hauptthread-Hänger kürzer als die Lücke nicht hörbar.
* README-Abschnitt „Groove Lab: Audio & Leistung“ neu geschrieben.
* Selbsttest für die Schwelle (0,94 nein, 0,95 ja, `underrunRatio` > 0 ja).

## Messquellen je Browser

| Quelle | Chrome ≥ 146 | ältere Chromium | Firefox | Safari / iPhone |
|---|---|---|---|---|
| `playbackStats` (Aussetzer, Latenz) | ja | nein (evtl. `playoutStats`) | nein | nein |
| `renderCapacity` (Rechenlast) | laut Spec ja, **nicht verifiziert** | nein | nein | nein |
| Lasttest (`OfflineAudioContext`) | ja | ja | ja | ja |
| `gap`, `ratio` | ja | ja | ja | ja |

Die Tabelle beruht auf der Anweisung und dem Spec-Stand; ich konnte nur Chromium 141 headless prüfen, dort fehlen `playbackStats` und `renderCapacity`. Diese beiden Pfade sind deshalb nur mit Spion-Kontexten getestet, nicht gegen einen echten Browser.

## Zahlen des Lasttests (Desktop-Chrome, headless 141, 44,1 kHz, je 3 Läufe)

| Einstellung | Ergebnis (% Echtzeit) |
|---|---|
| wenige Spuren: nur Kick + Snare, kein Bass/Akkorde/Melodie/Arp, Hall/Echo/Chorus aus | 3, 4, 3 |
| alle Spuren: alle Drum-Spuren, Bass, Akkorde, Melodie, Arp, Hall 4 s (Wet .6), Echo, Chorus, Drive .5, Detune 20 | 17, 9, 9 |

Plausibel: deutlich höher mit allen Spuren. Der erste Lauf ist teurer (Warm-up, 17 statt 9), daher lohnt auf schwachen Geräten ein zweiter Druck. Ein Desktop ist weit von 40 % entfernt; aussagekräftig wird der Test erst auf dem Handy.

## Offene Risiken

* **Der Lasttest belastet das Gerät selbst**, während live gespielt wird: Auf einem schwachen Handy kann die Messung kurz knacken lassen. Das Ergebnis enthält diese Konkurrenz mit – es ist eher eine obere Schätzung.
* Der Offline-Render läuft nicht auf dem Echtzeit-Audiothread; die Zahl ist ein Anhaltspunkt für die Reserve, keine exakte Auslastung. Er schätzt außerdem nur die ersten 4 s ab Akkordanfang; gehaltene Tasten, Aufnahme und Live-Fills außerhalb dieses Fensters fehlen. Der automatische Arp klingt nur, solange der Transport läuft (wie live).
* Einheiten von `averageLatency`/`maximumLatency` sind mir nicht verbürgt: ich nehme Sekunden an und behandle Werte > 10 als schon in Millisekunden. `underrunDuration` wird als Sekunden angezeigt.
* `renderCapacity` ist nur per Feature-Detection angebunden und nie an einem echten Browser geprüft; die Schwelle `peakLoad ≥ 0.95` ist ein Vorschlag aus der Anweisung und noch nicht an Geräten kalibriert (Fehlalarme möglich, solange der Transport im Hintergrund-Tab läuft – deshalb nur bei sichtbarer Seite).
* Das Bluetooth-Knacken, das erst in der Funkstrecke (Funk, Codec, Kopfhörer-Puffer) entsteht, kann der Browser grundsätzlich nicht sehen: Dann bleibt die Anzeige neutral, obwohl es knackt – das ist kein Fehler der Anzeige. Dort hilft nur das Ausprobieren der Puffergrößen (Prüfpunkt 4) und der Vergleich der Diagnosewerte.
* Der Gerätename erscheint praktisch nur, wenn die Mikrofon-Berechtigung schon erteilt wurde (sonst sind Labels leer und die Zeile fehlt) – gewollt.
* Commit 1 (nur `docs/`) hat `SW_VERSION` nicht erhöht, weil keine Shell-Datei betroffen war (laut `CLAUDE.md` nur dann nötig); alle Commits mit Shell-Änderungen haben sie erhöht (v532–v535).
* Die Anweisung nannte nur Deutsch und Englisch; `strings.js` hat zusätzlich Polnisch (ein vorhandener Selbsttest verlangt alle Schlüssel in allen drei Sprachen), die polnischen Texte sind von mir und nicht von Muttersprachler:innen geprüft.

## Manuelle Prüfliste (Handy mit Bluetooth-Kopfhörern)

1. Groove Lab öffnen → der Knopf am Titel ist sichtbar (neutral), das Panel öffnet, die Pufferwahl funktioniert (Status „Puffer: … – Audio neu gestartet.“).
2. Dichten Groove spielen, Panel offen lassen → Diagnosewerte laufen im Sekundentakt; „Werte kopieren“ funktioniert (in eine Notiz einfügen: Werte und User-Agent da?).
3. „Rechenlast messen“ mit wenigen und mit allen Spuren (inkl. Hall) – zweiter Wert deutlich höher? Ab 40 % gelb, ab 70 % rot? Knackt es währenddessen?
4. Puffer Klein / Mittel / Groß nacheinander mit demselben Groove über Bluetooth hören und notieren, ob das Knacken sich ändert. Bleibt der Knopf dabei neutral, entsteht das Knacken wahrscheinlich in der Bluetooth-Strecke.
