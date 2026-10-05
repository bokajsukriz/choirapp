# Bericht – „Zwei Hände“ und „Singen und klopfen“

Grundlage: Arbeitsanweisung „Zwei Hände“ (Paket 1 und 2). Basis
`claude/affectionate-archimedes-75nl5c` @ `e1caa2b` (`SW_VERSION` v497 –
geprüft), gearbeitet auf `ccr-aa859929-oql068`. `SW_VERSION` v497 → v499.

| Paket | Commit | Inhalt |
|---|---|---|
| 1 Zwei Hände | `3bb5ec3` | neue Rhythmus-Übung, Notation 8/16, iframe `allow fullscreen` |
| 2 Singen und klopfen | `accf5b7` | neue Sing-Übung, fester Streifen oben in beiden Ansichten |
| Abschluss | (dieser Commit) | Bericht |

Zurückrollen: `git revert` je Commit, neueste zuerst; danach eine neue
`SW_VERSION` setzen.

## Paket 1: Zwei Hände

Rhythmus → „Zwei Hände“ (Zeile mit Stufen-Ring wie Zweistimmig,
`modeLevelText` „Stufe n/6“). Eigene Ansicht wie Klatsch-Grooves
(`views.rhythm = 'hands'`, `renderHands`), damit der bestehende
Rhythmus-Lauf mit seiner einen Fläche unberührt bleibt.

- **Aufgabe** `{ level, meter, bars, R, L, support, kind, key }`, beide Stimmen
  im Pattern-Format, ohne Auftakt, `key = R.key|L.key`, die letzten 10 keys
  werden nicht wiederholt (auch Pool-Aufgaben; Figuren siehe unten).
- **Stufe 1–4** (`nextHandsTask`): erst die Einstiegsaufgaben in Reihenfolge,
  dann der Generator. Taktart und Variante werden je Aufgabe einmal
  gewürfelt, dann bis zu 200 Versuche, danach die nächste nicht zuletzt
  benutzte Einstiegsaufgabe. Stütze aus festen Vorlagen
  (`handsPattern`, `HANDS_OSTINATO`, `level3SupportText`), nur die
  Rhythmus-Stimme aus `makePattern`. Regeln (`handsRuleErrors`) über
  Anschläge: 75 %/50 % gemeinsam, gemeinsame Eins (1–2), keine in beiden
  Händen leere Einheit, kein Parallel-Klopfen, Stütze ≤ 1 Anschlag je
  Einheit, „und“-Anschläge und leere Einheit (1–2), „und gegen eine stille
  Hand“ (3); über das Notenbild: Synkopen (4).
- **Pool** (Stufe 3/4, jede 4. Aufgabe nach den Einstiegsaufgaben): Rhythmen
  aus `COURSE` per ID (`backbeat`, `walzer`, `habanera`, `tresillo`,
  `clave`), Satz „Kennst du aus dem Kurs – jetzt mit zwei Händen.“ plus
  Lektionsname und ein eigener Satz je Figur; jede Figur einmal, bevor sich
  eine wiederholt; Kurs-Hand zufällig.
- **Stufe 5/6**: Figuren F23a–F34c (`HANDS_FIGURES`) mit „Zusammen“-Zeilen,
  Unterstufen a–g (`nextFigTask`, `figTask`), Fortschritt und Tempo rein in
  `handsFigAdvance` (Tempo in Figuren/min je Figur, angezeigt im Tempo-Bezug
  der Taktart; +4 nur in g nach 3× Gut in Folge, −4 überall nach 2× Nochmal
  in Folge, Unterstufenwechsel ohne Tempo-Sprung; „Raster einblenden?“
  einmal je Figur). Bei F23c der Verweis auf die Lektion „Die Hemiole“.
- **Notation**: geprüft und ergänzt. Triolen-Viertel (8) und Halbe-Triolen
  (16) hatten Balken bzw. gefüllte Köpfe wie Achtel/Viertel – jetzt Kopf wie
  Viertel bzw. Halbe, ohne Balken, Klammer „3“ (auch über Pausen). Die
  Vierer gegen drei Viertel (F34a) werden über den Schlag gebunden notiert
  (`9 3~6 6~3 9`), die Hemiole in 6/8 ohne Bindung (wie die Lektion).
- **Ablauf** (`handsTimeline`): Einzähler → Vorspielen (R Tom hoch rechts,
  L Tom tief links im Stereobild, Samples der Song-Engine, Synthese als
  Ersatz; die Fläche leuchtet) → Mitklopfen (halbe Lautstärke; Option
  „Eine Hand“) → allein (nur Puls-Klick, abschaltbar) → Auswertung. „Vom
  Blatt“ im Zahnrad.
- **Auswertung** (`judgeHands`): je Hand Zuordnung wie `evaluate` (Fenster
  wandert bis ±60 ms mit), Urteil je Hand über `roundVerdict`, gesamt die
  schlechtere Hand; Mitziehen, Vertauscht (Runde zählt nicht), Verschliffen
  wie beschrieben. Auflösung `handsBarsSvg` (wie `duoBarsSvg`, je Takt eine
  Zeile R und L in der Farbe der Fläche, Rauten an mitgezogenen Stellen),
  „Noten zeigen“ als Knopf.
- **Hilfen** (Blatt „Hilfen“, standardmäßig aus, gespeichert): Noten (zwei
  Zeilen, Takt für Takt übereinander, proportional, Wiedergabe-Marke),
  Raster (`handsGridStep`, leuchtet beim Vorspielen), Silben; in Stufe 5/6
  dazu die Zeile „Zusammen“. Regeln an einer Stelle: `visibleAids` mit
  `mode: 'hands'`.
- **Eingabe/Layout**: zwei Flächen fest unten (hoch: untere Hälfte, quer:
  volle Breite unter einem Streifen), `pointerdown` je Fläche (Multitouch),
  F/J, `touch-action: none`, Safe-Area, Wake Lock während des Laufs,
  Vollbild-Knopf (nicht auf dem iPhone; unter Android Querformat-Sperre
  versucht). Das iframe der App erlaubt dafür jetzt `fullscreen` (`app.js`).
  Latenz-Ausgleich und Verzögerungs-Vorschlag wie in den anderen Tap-Übungen.

## Paket 2: Singen und klopfen

Singen → „Mit Rhythmus“ → „Singen und klopfen“ (eigene Ansicht
`views.voice = 'singtap'`), eine große Fläche plus Mikrofon.

- **Stufen**: 1 Puls + Ton halten (zwei Takte), 2 Puls + Phrase,
  3 Halbe + Phrase, 4 Gegenrhythmus + Phrase (`counterForMelody`: Kandidaten
  aus `makePattern` mit Achteln und Pausen, Regeln von Zwei Hände Stufe 1 für
  eine Stimme, ≤ 50 % gemeinsame Anschläge mit der Melodie, gewählt der mit
  den meisten Anschlägen auf langen Tönen und Pausen der Melodie).
- **Material**: Phrasen des Nachsing-Generators (`makeRhythmMelody`), nur
  ohne Auftakt und höchstens zwei Takte; Stufe 2 aus Nachsing-Stufe 1–2,
  Stufe 3 aus 2–3, Stufe 4 aus 3–4. Lage über `singRange()` (Stimmprofil).
- **Ablauf** wie Paket 1. Klick im Allein-Teil standardmäßig nach Kopfhörer
  (Zahnrad: Kabel / Bluetooth / ohne): ohne Kopfhörer pulsiert die Fläche;
  wird der Klick dann eingeschaltet, verwirft `dropClickFrames` die
  Tonhöhen-Frames ±40 ms um jeden Klick.
- **Auswertung** (`judgeSingTap`): Klopfen wie Paket 1, Singen wie Ton halten
  (`holdStats`/`holdHit`) bzw. Im Takt (`scoreEcho` mit Einsätzen,
  `inTimeVerdict`, Text `inTimeFeedback`); beide Teilurteile und gesamt der
  schlechtere Teil.
- **Hinweise** in der Ansicht und im Zahnrad: nur auf dem Bildschirm klopfen,
  Kopfhörer, Bluetooth-Verzögerung (Kalibrieren wie in den anderen Übungen).
  Noten (Rhythmuszeile und Melodie) als Hilfe, standardmäßig aus.

**Zu wenige passende Phrasen:** Die Nachsing-Stufen 1–4 erzeugen nur
4/4-Phrasen (1 bzw. 2 Takte), Stufe 5–6 haben vier Takte und Auftakt. Damit
gibt es in „Singen und klopfen“ derzeit kein 3/4 und kein 6/8; die Regel
„in 3/4 nur die 1“ ist eingebaut, kommt aber nicht vor.

## Zu entscheiden

Jeweils die Variante gewählt, die näher am bestehenden Verhalten liegt.

1. **Walzer im Pool**: Die Lektion `walzer` ist „Halbe + Viertel | drei
   Viertel“, die Anweisung nennt als Kurs-Hand das „pa-pa“ (`-12 12 12`,
   später `-12 6 6 12`). Gegen den Bass auf 1 wäre die Lektion fast parallel.
   Umgesetzt: Name und Verweis aus der Lektion, Kurs-Hand wie in der
   Anweisung, „später“ als zweiter Takt.
2. **Einstiegsaufgaben immer zwei Takte**, auch bei „4 Takte“ – wiederholt
   verletzte z. B. Stufe 1 / 4/4 am Übergang Takt 2 → 3 die Regel
   „Parallel-Klopfen“.
3. **Vier Takte im Generator** aus zwei Zwei-Takt-Phrasen: `makePattern`
   schließt vier Takte mit einem langen Schlusston, der „keine leere Einheit“
   verletzt. Stütze in Halben in 2/4 gibt es mit vier Takten nicht (dort
   müssten alle leeren Rhythmus-Einheiten auf der Eins liegen).
4. **6/8 in Stufe 2**: Die compound-Zellen kennen keine Pause über eine ganze
   punktierte Viertel; je zwei Takte wird eine Einheit (nicht die erste)
   nachträglich zur Pause, sonst gäbe es nie eine leere Einheit.
5. **Stütze-Hand Stufe 4** immer links (wie in allen Einstiegsaufgaben);
   Stufe 3 würfelt die Hände wie verlangt.
6. **Wiederholungsschutz in Stufe 5/6** nur in f und g. In a–e ist dieselbe
   Figur die Übung („3× Gut in Folge“).
7. **Unterstufe b** wechselt die Hand von Runde zu Runde; die zwei „Gut“ in
   Folge zählen über beide Richtungen.
8. **„Eine Hand“** gilt nur beim Mitklopfen; welche Hand die App spielt, wählt
   man im Blatt „Hilfen“ (aus / links / rechts).
9. **Tempo Stufe 1–4**: eigene Einstellung im Zahnrad (♩ = 76, 40–120),
   die Anweisung nennt keins.
10. **Puls-Klick in 6/8** auf den Achteln, wie in den übrigen
    Rhythmus-Übungen.
11. **Fortschritt**: Zwei Hände meldet unter „rhythm“, Singen und klopfen unter
    „inTime“, jeweils als Stufe 0 (eigene Auswahl), damit die
    Stufenvorschläge der bestehenden Übungen nicht verfälscht werden. Eigene
    Bereiche in `PROGRESS_AREAS` wären möglich, ändern aber die Kacheln der
    App.
12. **Texte in `strings.js`**: nicht ergänzt. `strings.js` bedient nur die
    App-Oberfläche (`index.html`/`app.js`, DE/EN/PL); `uebe-lab.html` ist
    durchgehend deutsch ohne Übersetzungsschicht, wie alle anderen Übungen.
13. **Verschliffen**: Als „zugehöriger Tap“ gilt der nächste Anschlag der
    taktfremden Hand innerhalb des halben kleinsten Abstands ihrer Stimme;
    mindestens drei solche Paare.
14. **Singen und klopfen, Urteil Singen** (Ton halten): Gut = `holdHit` und
    Lage ≤ 10 Cent, Okay = `holdHit`, Fast = Lage ≤ 40 Cent und ±25 Cent
    Streuung, sonst Nochmal; Phrase: Gut = wie Im Takt richtig und alle
    Einsätze „gut“, Fast ab 60 % richtiger Töne.
15. **Querformat**: Der Streifen oben ist knapp (48 % der Höhe); die Steuerung
    steht dort direkt unter der Kopfzeile und bleibt beim Scrollen sichtbar.

## Tests

`uebeLab.selfCheck()` grün (≈ 17 s), neu `handsCheck()` und
`singTapCheck()`:

- Einstiegsaufgaben erfüllen ihre Regeln; jede Regel mit gebauten Aufgaben
  an der Grenze und knapp darüber (75 %, 50 %, gemeinsame Eins, leere
  Einheit, Parallel-Klopfen, Stütze, „und“, Synkopen im Notenbild).
- Generator über viele Saaten, 2 und 4 Takte, Stufe 1–4: keine
  Regelverletzung, Notfall-Aufgabe selten, Pool genau jede 4. Aufgabe.
- Starter-Reihenfolge, kein key doppelt innerhalb von 10, Pool-Rotation,
  Pool-IDs in `COURSE`, Kurs-Rhythmus aus der Lektion.
- Stütze-Vorlagen, Einstiegsaufgaben und Figuren summieren auf Takt bzw.
  Figur; „Zusammen“ = Vereinigung der Anschläge; kgV-Raster (F23 6,
  F34 12, gerade 6/3, Unterstufe e je Takt).
- Tempo Figuren/min ↔ BPM je Taktart, Grenzen; Tempo-Logik (kein Sprung beim
  Unterstufenwechsel, „in Folge“, −4/+4, Raster-Angebot einmal); g lässt
  höchstens einen Schlag je Figur und nie den ersten aus.
- Ablauf (Phasen, Lautstärken, „Eine Hand“, Vom Blatt, Klick aus).
- Gleichzeitige Anschläge beider Hände; Mitziehen, Vertauscht, Verschliffen
  (F23b, F34c, F34a; nicht bei F23c) mit konstruierten Folgen samt
  Mindestzahlen; Gesamturteil.
- Hören zuerst: ohne Hilfen in keiner Phase Noten, Raster oder Silben
  (`visibleAids` und gerendertes DOM, beide Übungen).
- Layout: zwei Flächen links L / rechts R, `touch-action: none`, unten,
  Querformat-Regel vorhanden; Singen und klopfen: eine Fläche über die Breite.
- Paket 2: Material (metrisch, ≤ 2 Takte, im Umfang), Fläche je Stufe,
  Gegenrhythmus-Regeln und „passend zur Melodie“, gleichzeitige Auswertung
  mit künstlichen Tonhöhen-Frames und Anschlägen, Ausblenden der
  Klick-Frames (ohne Ausblenden schlechter, mit Ausblenden „Gut“).
- Speichern/Laden beider Übungen inkl. Bereinigung kaputter Stände.

Zusätzlich mit Playwright (Chromium, 390×800 und 800×390): Runden mit exakten,
vertauschten und mitgezogenen Anschlägen, Zeiger-Tipps auf beiden Flächen,
F/J, Stopp, Zurück; Singen und klopfen mit simuliertem Mikrofon. Der
App-Start (`index.html`) zeigt nur den erwarteten Testfehler `[notiz]`.

## Bitte von Hand prüfen

- Android quer und hoch mit Vollbild (greift die Querformat-Sperre?)
- iPhone im Browser und als installierte App (kein Vollbild-Knopf; reicht
  die Fläche bei Safe-Area?)
- Ohne Hilfen: Ist Stufe 5/6 nur nach Gehör und mit den leuchtenden Flächen
  machbar, oder kommt das Raster-Angebot (nach 2× Nochmal) zu spät?
- Desktop mit F/J
- Paket 2 mit Kabel-Kopfhörer, mit Bluetooth-Kopfhörer und ohne Kopfhörer
  (stört der Klick trotz Ausblenden? reicht der optische Puls?)
- Klang: Toms aus den Samples – sind hoch/tief und links/rechts gut zu
  unterscheiden?
