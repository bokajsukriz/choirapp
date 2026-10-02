# Arbeitsanweisung für Claude Code – Player-Feinschliff

Du bist Frontend-Entwickler mit Gespür für ruhige, selbsterklärende
Oberflächen und kennst Chorarbeit: Der Chor (Popchor) lernt nach Gehör, nicht
vom Blatt, und die App soll vor allem Spaß machen. Antworte und kommentiere auf
Deutsch.

**Stelle keine Fragen.** Die Entscheidungen stehen unten. Wo trotzdem etwas
offen ist: die konservativere Variante wählen und im PR begründen.

## 0. Vorbereitung und Regeln

- `CLAUDE.md` und `README.md` lesen. Danach im Code: `#tab-panel-lyrics`,
  `#tab-panel-notes`, `#queue-block`, `#btn-loop-routine` in `index.html`;
  `renderLyricsBlock`, `flushLyricsNote`, der Klick-Handler von
  `#btn-lyrics-note-edit`, `renderNoteBlock`, `saveNote`, `deleteNote`,
  `renderQueue`, `openRoutineDialogForLoops` in `app.js`.
- Ein Paket = ein Commit. **`SW_VERSION` in `sw.js` bei jedem Commit
  erhöhen** (siehe `CLAUDE.md`).
- Alle sichtbaren Texte über `strings.js`, in **allen drei Sprachen**
  (DE/EN/PL). Bestehende Schlüssel, IDs und gespeicherte Felder nicht
  umbenennen: Das Datenformat bleibt gleich, also `DATA_VERSION` nicht anfassen.
- Nach jedem Paket die App mit dem Skill `run-choirapp` im Handyformat
  (390 × 844) starten, die geänderte Stelle abfotografieren und die Konsole
  auf Fehler prüfen (`runSelfTests` bleibt grün).

## Paket 1 – Notizen: nur noch ein Textfeld

- Die Notiz speichert ausschließlich automatisch. Das tut sie heute schon
  (`NOTE_SAVE_DELAY` plus `blur`). Die **ganze Fußleiste `.note-foot`
  entfällt**: Speichern-Knopf, Löschen-Knopf und die Statuszeile `#note-state`.
- Löschen läuft wie beim eigenen Liedtext: Wer den Text leert und den Reiter,
  den Song oder die App verlässt, dessen Notiz verschwindet still (analog zu
  `flushLyricsNote`). Kein Bestätigungsdialog, keine Erfolgsmeldung.
- Beim Song- oder Reiterwechsel, bei `visibilitychange`/`pagehide` noch nicht
  gespeicherte Eingaben sofort sichern, damit nichts verloren geht.
- Ein Fehler beim Speichern meldet sich weiter über `bannerError`. Es gibt
  keine stille Datenlücke.
- Nicht mehr benutzte Strings und Handler entfernen (`notes.saveAria`,
  `notes.deleteAria`, `notes.saved`, `notes.state*` …), aber nur, wenn sie
  wirklich nirgends sonst verwendet werden.

## Paket 2 – Lyrics: automatisch speichern, Lesen ↔ Bearbeiten

- Der eigene Liedtext speichert weiterhin automatisch. Die Statuszeile
  `#lyrics-note-state` entfällt wie bei den Notizen.
- Das Umschalten zwischen **Lesen** und **Bearbeiten** bleibt, wird aber
  eindeutig: Statt des Stift-/Haken-Symbols kommt ein beschrifteter Knopf
  „Bearbeiten“ ↔ „Fertig“ (Pille, Icon plus Text). „Fertig“ speichert sofort
  und zeigt den Text wieder in der Leseansicht.
- Beim offiziellen Chor-Text bleibt der Knopf ausgeblendet, sein Platz bleibt
  aber reserviert (`.slot-hidden`, wie bisher).

## Paket 3 – Lyrics-Werkzeugleiste: Schriftgröße neu gestalten

Heute stehen zwei einzelne, große Pillen „A−“ und „A+“ lose neben dem
Quellen-Schalter. Das wirkt klobig. Neu ist **eine Zeile mit drei Gruppen**,
alle gleich hoch (36 px), im Stil des vorhandenen `.preset-row`:

```
[ Chor | Eigener ]            [ ᴀ  A ]   [ ✎ Bearbeiten ]
  links                         rechts     ganz rechts
```

- Schriftgröße als **ein** zusammenhängender Segment-Knopf mit einem kleinen
  und einem großen „A“ statt „A−/A+“ (Typo-Konvention, ohne Minus/Plus). Ist
  die Grenze erreicht, wird die jeweilige Hälfte deaktiviert (`disabled`).
- `aria-label` bleiben („Schrift kleiner“/„Schrift größer“).
- Bricht die Zeile auf 360 px um, wandert „Bearbeiten“ in die zweite Zeile,
  rechtsbündig. Nichts darf horizontal scrollen.

## Paket 4 – „Gesamt“ heißt „Full“

- Die deutsche Bezeichnung für `FULL` wird überall **„Full“**: `voice.FULL`
  in `strings.js` (DE) und `VOICE_LABEL.FULL` in `app.js`. Damit sagen
  Songliste (Chip „FULL“), Import („Full“) und Player-Stimmwahl dasselbe.
- EN bleibt „Full“, PL „Całość“ bleibt.
- `lab.master` („Gesamt“ im Groove Lab) ist etwas anderes und bleibt.
- Danach nach weiteren sichtbaren Vorkommen von „Gesamt“ für die Gesamtspur
  suchen (z. B. im Choirgym-Dialog) und angleichen.

## Paket 5 – Setlisten-Vorschau im Player: standardmäßig eingeklappt

Heute schiebt die Warteschlange (aktueller Titel, nächster Titel, „… 1 Titel
danach“) die Reiter weit nach unten. Das × zum Entfernen steht direkt neben
dem Titel und lädt zu Fehlgriffen ein.

**Variante A (umsetzen): eine Zeile, aufklappbar**

```
┌──────────────────────────────────────────────┐
│ ≡♪  Sommerkonzert · 1/3   Als Nächstes: Africa  ⌄ │
└──────────────────────────────────────────────┘
```

- Höhe ca. 44 px, gleiche Kartenoptik wie die Listeneinträge. Links das
  Setlisten-Icon der Navigation, dann Name und Position, rechts „Als Nächstes:
  …“ (bei Platz knapp gekürzt mit …) und ein Chevron.
- Antippen klappt die bisherige Liste auf (Chevron dreht sich, kurze
  Höhenanimation, `prefers-reduced-motion` beachten). **Die ×-Knöpfe und der
  Bearbeiten-Stift erscheinen nur im aufgeklappten Zustand.**
- Beim letzten Titel heißt es „Letzter Titel“ statt „Als Nächstes“.
- Zustand nicht speichern: Jeder neue Song beginnt eingeklappt.
- `aria-expanded`/`aria-controls` am Kopf setzen.

**Variante B (nur im PR als Alternative skizzieren, nicht bauen):** keine
Zeile über den Reitern, sondern ein Abzeichen „1/3“ neben dem Songtitel im
Player-Kopf. Antippen öffnet die Liste als Bottom-Sheet. Das spart noch mehr
Platz, die Setliste ist dann aber weniger präsent.

## Paket 6 – Choirgym: „Üben“ statt Hantel

Das Hantel-Symbol `#btn-loop-routine` versteht niemand, dabei ist der
Choirgym (N-mal auf Tempo X als Stimme Y) das didaktisch wertvollste Werkzeug
im Player.

**Variante A (umsetzen):** In der Loop-Leiste ersetzt ein **beschrifteter
Knopf „Üben“** (Pille, Icon ▶︎ mit kreisförmigem Pfeil plus Text, Akzentfarbe
als Umriss) das Hantel-Icon. Der Dialog bleibt, Überschrift „Üben“, darunter
klein „Choirgym“, damit der vertraute Name nicht verloren geht.

**Variante B (zusätzlich umsetzen, wenn Paket A sauber steht):** Im Dialog
oben drei **Vorlagen-Chips**, die die Schrittliste vorbelegen, statt bei null
zu beginnen. Die eigene Stimme ist die aus dem Stimmprofil, sonst die gerade
gewählte:

| Chip | Schritte |
|---|---|
| Kennenlernen | 2× eigene Stimme 70 % → 2× eigene Stimme 100 % |
| Festigen | 2× eigene Stimme 85 % → 2× Full 100 % |
| Durchsingen | 3× Full 100 % |

Die Chips belegen nur vor. Danach ist alles wie bisher editierbar.

**Variante C (nur im PR erwähnen):** Der „Üben“-Knopf sitzt unten in der
Fußleiste anstelle des Shuffle-Knopfs (Shuffle braucht man beim Üben kaum).
So ist er auf jedem Reiter erreichbar, nicht nur bei Loops.

## Abschluss

- Push auf den vorgegebenen Branch, PR mit Vorher-/Nachher-Screenshots je
  Paket (Handyformat), dazu die Varianten B/C als kurze Skizze im PR-Text.
- Im PR ausdrücklich nennen: welche Strings entfernt wurden und dass das
  Datenformat unverändert ist.
