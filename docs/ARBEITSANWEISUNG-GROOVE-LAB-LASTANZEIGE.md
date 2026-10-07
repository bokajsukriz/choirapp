# Arbeitsanweisung für Claude Code – Groove Lab: Lastanzeige reparieren und immer zugänglich machen

Du bist erfahrener Web-Audio-Entwickler. Die Überlastungsanzeige im Groove Lab (Commit `67a5edc`) springt in der Praxis nie an, obwohl es mit Bluetooth-Kopfhörern bei vielen gleichzeitigen Instrumenten hörbar knackt. Weil der Knopf erst nach erkannter Überlastung erscheint, ist auch die Pufferwahl nicht erreichbar. Ziel: Anzeige reparieren, immer zugänglich machen, Rechenlast sichtbar machen.

Antworte und kommentiere auf Deutsch.

Diese Anweisung läuft unbeaufsichtigt. Stelle keine Fragen und warte auf keine Freigabe. Wo etwas unklar ist: die konservativste Variante wählen, im Bericht begründen, weitermachen.

## Befund (Stand `f1cc685`, groove-lab.js)

1. **Falscher API-Name.** `_playoutUnderruns()` (Z. ~5678) liest `ctx.playoutStats.underrunEvents`. Das war der Name im Spec-Entwurf. Ausgeliefert ist die Schnittstelle als `AudioContext.playbackStats` (`AudioPlaybackStats`, Chrome ab 146; Firefox und Safari: nicht vorhanden). Felder: `underrunEvents`, `underrunDuration`, `averageLatency`, `minimumLatency`, `maximumLatency`; das Objekt ist live und wird etwa einmal pro Sekunde aktualisiert. Ergebnis heute: immer 0.
2. **Die beiden anderen Signale sind für Knacken unempfindlich.** Scheduler-Lücke > 150 ms misst nur Hänger im Hauptthread, die bei 100 ms Vorlauf nicht hörbar sind. Die Quote Audiozeit/Wanduhr < 0,9 fällt bei einzelnen Aussetzern praktisch nie, weil `currentTime` weiterläuft.
3. **Knopf nur bei Überlastung sichtbar** (`hidden` im Markup Z. ~10870, `_setLatency` versteckt ihn wieder). Ohne Erkennung gibt es keinen Weg zur Pufferwahl.

## 0. Vorbereitung

1. `git fetch origin`, dann `git checkout -b groove-lab-lastanzeige origin/main`. Nie auf `main` committen, nie mergen, nie force-pushen.
2. `CLAUDE.md` und `README.md` lesen. Diese Datei im ersten Commit unter `docs/` einchecken.

## 1. Feste Regeln

* Ein Paket = ein Commit, danach sofort `git push -u origin groove-lab-lastanzeige`.
* SW_VERSION in `sw.js` bei jedem Commit um eins erhöhen (Stand `v531`, vorher aktuellen Wert prüfen). `git diff --cached --stat` gegen die Liste in `CLAUDE.md` prüfen.
* Keine neuen Abhängigkeiten. Gespeicherte Groove-Lab-Zustände: neue Felder optional mit Standardwert, `sanitize…` reicht sie durch, alte Daten laden weiter. `DATA_VERSION` in app.js nicht anfassen.
* Alle neuen Texte in `strings.js`, Deutsch und Englisch.
* Jede neue Browser-API per Feature-Detection, in try/catch, nie ein Fehler für Nutzer:innen, wenn sie fehlt.
* Die Messung darf selbst keine spürbare Last erzeugen: höchstens einmal pro Sekunde DOM aktualisieren, nur solange das Panel offen ist oder der Transport läuft.

## 2. Pakete

### Paket A – API-Fix

1. `_playoutUnderruns()` → `_playbackStats()`: liefert `ctx.playbackStats ?? ctx.playoutStats ?? null` (Altname als Rückfall). Zähler aus `underrunEvents`, zusätzlich `underrunDuration` merken.
2. Einen Selbsttest ergänzen (Spion-Kontext mit `playbackStats`, ohne echten AudioContext): steigender `underrunEvents` löst `_noteOverload('underrun')` aus; fehlende API ergibt keinen Fehler.

### Paket B – Knopf immer sichtbar, Panel immer erreichbar

1. Den Knopf am Titel immer anzeigen (kein `hidden` mehr). Zwei Zustände:
   * neutral (gedämpfte Farbe, Symbol z. B. Pegel-/Tachosymbol, kein „!“), Beschriftung „Audio & Leistung“;
   * Warnung (rot, „!“) wie bisher nach erkannter Überlastung. Nach einem Pufferwechsel zurück auf neutral statt verstecken.
2. Das Panel öffnet in beiden Zuständen. Titel und Text je nach Zustand: neutral „Audio & Leistung“ mit kurzer Erklärung; bei Warnung der bisherige Text „Das Gerät kommt nicht hinterher“.
3. Pufferwahl, gemessene Verzögerung und Hinweis für „Groß“ bleiben wie gehabt.
4. Zugänglichkeit: `aria-label` passt sich dem Zustand an, Fokusführung wie bisher, Panel mit Escape schließbar (falls noch nicht).

### Paket C – Diagnosebereich mit Rechenlast

Im Panel einen Abschnitt „Diagnose“ ergänzen, der sich bei offenem Panel einmal pro Sekunde aktualisiert:

1. Rechenlast des Audio-Threads, je nach Browser die beste verfügbare Quelle, mit Angabe der Quelle in Klammern:
   * `ctx.renderCapacity` (`AudioRenderCapacity`), falls vorhanden: `start({ updateInterval: 1 })`, aus dem `update`-Event `averageLoad`, `peakLoad` und `underrunRatio` anzeigen (in %). Beim Schließen des Panels bzw. beim Stoppen des Transports `stop()`. Die Schnittstelle ist spezifiziert, aber in den gängigen Browsern womöglich nicht ausgeliefert – nur per Feature-Detection nutzen.
   * Rückfall „Lasttest“ (überall, auch iPhone): Schaltfläche „Rechenlast messen“. Sie rendert die aktuelle Groove-Einstellung (alle aktiven Spuren, Hall, Echo, Chorus, Waveshaper wie im Live-Graphen) für 4 Sekunden in einem `OfflineAudioContext` mit der Abtastrate des Live-Kontexts und misst die Wanduhrzeit. Anzeige: „Rechenaufwand ≈ X % Echtzeit“ (Renderdauer ÷ 4 s). Ab 40 % gelb, ab 70 % rot, mit Hinweis, dass die Echtzeit-Reserve auf dem Gerät knapp ist. Den Graph-Aufbau dafür aus `engine.start()` in eine wiederverwendbare Funktion ziehen, die beide Kontexte bauen kann, ohne das Verhalten des Live-Graphen zu ändern. Ist das zu invasiv: konservativ nur Schlagzeug + Synth-Ebenen + Hall nachbauen und das im Bericht begründen. Während der Messung läuft die Wiedergabe weiter; der Knopf ist bis zum Ende gesperrt.
   * Ist keine Quelle möglich: „Rechenlast: in diesem Browser nicht messbar“.
2. Aussetzer: `underrunEvents` und `underrunDuration` seit Start, oder „vom Browser nicht gemeldet“, wenn `playbackStats` fehlt.
3. Latenz: `baseLatency`, `outputLatency` (wie bisher), zusätzlich `averageLatency`/`maximumLatency` aus `playbackStats`, falls vorhanden.
4. Kontext: gewählter Puffer, `sampleRate`, `state`, Name des Ausgabegeräts nur wenn ohne Berechtigungsabfrage verfügbar (sonst weglassen).
5. Erkennungs-Zähler: wie oft `gap`, `ratio`, `underrun` in dieser Sitzung angeschlagen haben. Dazu `_noteOverload(reason)` den Grund tatsächlich auswerten lassen (heute wird er ignoriert).
6. Schaltfläche „Werte kopieren“: alle obigen Werte plus User-Agent als Text in die Zwischenablage (für Fehlerberichte).

### Paket D – Erkennung schärfen

1. `averageLoad`/`peakLoad` aus `renderCapacity` (falls vorhanden) als viertes Signal: `peakLoad ≥ 0.95` oder `underrunRatio > 0` zählt als Aussetzer.
2. Ratio-Schwelle nicht verschärfen (Fehlalarme im Hintergrund-Wechsel), aber im Bericht festhalten, dass sie für kurzes Knacken ungeeignet ist.
3. Im Bericht klar festhalten: Knacken, das erst in der Bluetooth-Strecke entsteht (Funk, Codec, Kopfhörer-Puffer), kann der Browser grundsätzlich nicht sehen. Dann bleibt die Anzeige neutral, obwohl es knackt – das ist kein Fehler der Anzeige.

## 3. Tests

* `runSelfTests()` grün; neue Selbsttests für Paket A und für die Zustandslogik des Knopfs (neutral → Warnung → nach Pufferwechsel neutral).
* Lasttest einmal mit wenigen und einmal mit allen Spuren plus Hall laufen lassen; der zweite Wert muss deutlich höher sein (Plausibilität), im Bericht beide Zahlen nennen (Desktop-Chrome).
* Manuelle Prüfliste in den Bericht (für morgens, Handy mit Bluetooth-Kopfhörern):
  1. Groove Lab öffnen → Knopf am Titel ist sichtbar, Panel öffnet, Pufferwahl funktioniert.
  2. Dichten Groove spielen, Panel offen lassen → Diagnosewerte laufen, „Werte kopieren“ funktioniert.
  3. „Rechenlast messen“ mit wenigen und mit allen Spuren.
  4. Puffer Klein / Mittel / Groß nacheinander mit demselben Groove über Bluetooth hören und notieren, ob das Knacken sich ändert.

## 4. Bericht

`docs/BERICHT-GROOVE-LAB-LASTANZEIGE.md`: je Paket die Änderungen (Datei, Funktion), welche Messquellen in welchem Browser verfügbar sind, Zahlen des Lasttests, offene Risiken, manuelle Prüfliste. Im letzten Commit mitpushen.
