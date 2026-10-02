# de:construct – Bericht

Wunsch des Chorleiters: „Im Groovelab soll es eine Funktion ‚de:construct‘
geben, in der ein fertiger Song läuft, den man versucht nachzubauen. Dazu gibt
es dann A/B-Schalter (Original, meine Version) und man kann dann Stück für
Stück versuchen, Elemente rauszuhören, Bassline, Beats usw. Das bleibt dann
erhalten, bis man später wieder weitermacht oder einen neuen Song erstellt.“

## Konzept

- **Original**: Die App erzeugt aus dem vorhandenen Groove-Lab-Inhalt
  (Drumloops, Basslinien, Akkordfolgen, Melodien, Klang-Presets, Tonart,
  Tempo, Taktart) einen verborgenen Song – deterministisch aus einem Seed
  (`dcGenerate(seed, stufe)`, Zufall über `dcRng`, kein `Math.random`).
  Das Original ist nur hörbar, nie in einem Editor sichtbar.
- **Meine Version**: ist ganz normal `this.state` des Labs. Gebaut wird mit
  den vorhandenen Reitern (Beat, Harmonie, Melodie, Klang …) – nichts
  doppelt. Start: leeres Raster, Tempo 100, ein einziger Akkord, Melodie
  aus, ein anderer Klang.
- **Vorgegeben**: Der Grundton ist immer vorgegeben – absolutes Hören ist
  keine Chor-Fähigkeit, gesucht wird relativ (Stufen, Funktionen, Groove).
  Was die Stufe nicht abfragt, steht in „Meine Version“ schon richtig.
- **Stufen** (Gehörbildung vom Groben ins Feine):
  - *Leicht*: Tempo & Takt, Beat, Bass. Nur 4/4, der Bass ist der des
    Loops – wer den richtigen Loop findet und das Tempo trifft, ist fertig.
    Tonart und Akkordfolge sind vorgegeben (die Basslinie folgt ihnen).
  - *Mittel*: dazu eine eigene Basslinie (Rhythmus aus einem anderen Loop,
    Töne nur 1/5/8 – genau das, was das Raster per Antippen kann) und die
    Akkordfolge samt Dur/Moll.
  - *Schwer*: alle Taktarten (3/4, 6/8), eine Zelle im Loop abgewandelt
    (Loop wählen ergibt „fast“), Akkordwechsel ggf. alle zwei Takte, dazu
    Melodie und Klang.

## Bedienung

- Einstieg: Kachel **„de:construct“** im Tools-Reiter (neben „Groove Lab“),
  im Lab selbst über die Ansichtswahl (Chor · Studio · Kurs · de:construct;
  auf dem Handy die Auswahlliste oben). Ohne Song erscheint eine kurze
  Erklärung („Ein fertiger Song läuft – bau ihn nach …“), die Stufenwahl
  und „Song starten“ – das Antippen startet zugleich das Original.
- **A/B**: großer Zweierschalter „A Original / B Meine Version“
  (`aria-pressed`) und zusätzlich ein A/B-Knopf in der Transportleiste,
  damit er auch tief im Editor erreichbar ist. Während A klingt, trägt die
  Transportleiste oben einen Akzentrand und die Akkordanzeige zeigt
  „Original“ statt eines Akkordnamens.
- **Hinhören**: „Alles · Nur Beat · Nur Bass · Nur Akkorde · Nur Melodie“
  (nur Spuren, die es im Song gibt) – gilt für A und B, so lässt sich eine
  einzelne Spur direkt vergleichen.
- **Stück für Stück**: je Element eine Zeile mit Status (offen / fast /
  noch nicht / geschafft), einem Hinweis, „Bauen“ (springt in den
  passenden Reiter) und „Prüfen“. „Stimmt“ markiert das Element dauerhaft
  als geschafft; der Zähler oben zählt mit.
- **Auflösen**: zweistufig (Rückfrage durch zweites Tippen). Danach steht
  bei jedem Element die Lösung; „Original als meine Version übernehmen“
  lädt es in die Editoren (ein Undo-Schritt).
- **Neuer Song**: öffnet wieder die Stufenwahl mit Warnung („ersetzt deinen
  bisherigen Nachbau“) und „Weiter am alten Song“.

## Rückmeldungen (`dcCompare`)

Die Hinweise sagen, *was* passt und in welche Richtung es geht – nie die
Lösung (keine Schrittnummern, keine Akkord- oder Loopnamen).

| Element | stimmt | fast | Hinweise |
|---|---|---|---|
| Tempo & Takt | gleiche Taktart, ±3 BPM, Swing ±0,15 | ±10 BPM oder Swing anders | „ein bisschen/deutlich schneller/langsamer“, „Taktart passt nicht“, „Swing?“ |
| Beat | alle Drum-Spuren gleiche Schläge, gleiche Ghost-Notes | nur Lautstärke anders oder genau eine Spur falsch | „Passt: Kick, Hi-Hat. Noch nicht: Snare.“ |
| Bass | Rhythmus und Stufen gleich | Rhythmus oder Töne passen | „Rhythmus passt, Töne noch nicht“ u. ä. |
| Akkorde | jeder Takt dieselben Töne | Grundtöne richtig, nur Dur/Moll/Septimen falsch; richtige Folge, falsches Wechseltempo; ≥ 60 % der Takte | „Grundtöne passen – Dur/Moll noch nicht“, „wechseln schneller“ |
| Melodie | Einsätze und Tonhöhen gleich (gegen die Harmonie des Originals gerechnet, also unabhängig von den eigenen Akkorden) | Oktave falsch; Rhythmus richtig; ≥ 75 % der Töne | „andere Oktave“, „Rhythmus passt, Töne noch nicht“ |
| Klang | Wellenform, Cutoff, Attack, Release passen (`soundMatch` der Klang-Challenge) | mindestens 2 von 4 | „Passt: Wellenform, Cutoff. Noch nicht: …“ |

Beat, Bass, Akkorde und Melodie lassen sich nur in derselben Taktart
vergleichen („Erst die Taktart finden …“).

## Technische Entscheidungen

- **A/B ohne Anhalten**: Der Scheduler bleibt unverändert; `_dcHeard(fn)`
  setzt für die Dauer eines Schritts `this.state` auf das Original (alle
  abgeleiteten Werte – Takt, Tempo, Harmonie, Klang, Mix – lesen
  `this.state`). Umschalten greift ab dem nächsten Schritt, die Position
  (`globalStep`) läuft weiter. Bei anderer Taktart springt sie an den
  Anfang des nächsten Takts mit derselben Taktnummer (`dcSwitchStep`), damit
  Akkord und Melodietakt an ihrer Stelle im Song bleiben. Gesamtlautstärke
  bleibt die eigene. Während einer Aufnahme klingt immer „Meine Version“.
- **Nichts verraten**: Akkordanzeige, Akkordleiste und SATB-Noten zeigen
  während A nichts vom Original. Tempoanzeige und Editoren zeigen immer die
  eigene Version. Würfeln ist in de:construct ausgeblendet (es würde den
  vorgegebenen Grundton verstellen).
- **Zustand und Undo**: Beim Betreten wird der Studio-Stand samt Undo-Stapel
  beiseitegelegt (`_dcStash`) und „Meine Version“ geladen; beim Verlassen
  umgekehrt. Undo wirkt nur innerhalb von de:construct.
- **Speichern**: im vorhandenen Groove-Lab-Datensatz (IndexedDB,
  meta-Schlüssel `grooveLab`, über die Ablage aus `app.js`) als neues Feld
  `deconstruct = { v, seed, level, created, original, mine, checks, done,
  revealed }`. `_persist` aktualisiert `mine`, zusätzlich gebündelt 1,5 s
  nach Eingaben (übersteht ein Beenden der App). Schließen in de:construct
  merkt die Ansicht, das nächste Öffnen macht dort weiter. Alte Ablagen ohne
  Feld → `null` (Auswahl erscheint); fehlen nur die Stände, entstehen sie
  aus Seed + Stufe neu; unbekannte Status/Daten fallen weg. Nur ein neues
  Feld, keine Bedeutungsänderung → **kein** `DATA_VERSION`-Sprung.
  `sanitizeState` kennt `view: 'deconstruct'` (Liste `VIEWS`).
- Custom-Element-Regel: Der Konstruktor darf keine Attribute am Host setzen
  – die Markierung „A klingt“ sitzt deshalb als Klasse an der
  Transportleiste.
- Neue Texte in DE/EN/PL (`lab.dc.*`, `lab.viewDeconstruct`,
  `settings.tools.deconstruct`), du-Form, „…“ und –.

## Tests

In `runMusicSelfTests` (app.js), läuft mit `runSelfTests()`/Selbsttest-Tor:

1. Erzeugung: je Stufe 60 Seeds – deterministisch, `sanitizeState`-fest,
   Grundton vorgegeben, Original gegen sich selbst „stimmt“, Start nie schon
   gelöst, Leicht: Akkorde vorgegeben, erzeugte Basstöne baubar (1/5/8),
   Leicht/Mittel nur 4/4; ein Nachbau wie eine Nutzerin (Loop + Tempo ±2)
   ergibt auf Leicht überall „stimmt“.
2. Vergleich je Element mit gebauten Fällen (Tempo ±2/−6/+20, Swing,
   Taktart, Bass Töne/Rhythmus/leer/aus, Beat ohne Hi-Hat verrät keine
   Schritte, Ghost-Notes, Akkorde aus/halbes Wechseltempo/anderes
   Tongeschlecht, Melodie Oktave/aus/gegen andere Akkorde/andere Stufen,
   Klang); alle Hinweis-Schlüssel existieren in DE/EN/PL.
3. A/B: `dcSwitchStep` (gleiche Taktart → gleicher Schritt, sonst gleiche
   Taktnummer) und in einer echten, nicht eingehängten Lab-Instanz für 4/4
   und 3/4: Laden von „Meine Version“, A spielt das Original (Tempo hörbar),
   A→B behält die Position, Prüfen markiert „geschafft“ dauerhaft,
   Verlassen/Wiederkommen tauscht Studio-Stand und eigene Version korrekt.
4. Speichern/Laden: Roundtrip, alte Ablage ohne Feld, Müll, nur Seed+Stufe,
   kaputte Fortschrittsfelder, `view` bleibt erhalten.

Zusätzlich per Playwright (390×844) durchgeklickt: Tools-Kachel → Einstieg →
Song starten (Original läuft, Anzeige „Original“) → A/B → „Nur Bass“ → Loop
wählen, Tempo knapp daneben → Prüfen (fast/stimmt/noch nicht) → Bauen
(Sprung in den Beat-Reiter) → Auflösen (Rückfrage, Lösungen) → Neu laden:
Stand, Fortschritt und Ansicht kommen zurück → Neuer Song (Warnung) →
Schwer → zurück ins Studio (Studio-Stand unverändert). Keine Konsolenfehler.

## Offene Punkte

- Die Hinweistexte des letzten Prüfens werden nicht gespeichert – nach dem
  Neuladen steht der Status, darunter wieder die Bau-Anleitung.
- Die Taktpunkte in der Transportleiste folgen der eigenen Taktart, auch
  während ein Original in anderer Taktart klingt.
- Bei einem A/B-Wechsel zwischen verschiedenen Taktarten springt die
  Wiedergabe an den nächsten Taktanfang (bewusst; kein Crossfade).
- Die Lösung der Basslinie wird als Zeichenkette angezeigt (`1··5 ··8·` =
  Stufe je Sechzehntel); eine Mini-Grafik wäre anschaulicher.
- Ohne Song in de:construct spielt der Play-Knopf den (unsichtbaren)
  Studio-Stand.
- Echte Pop-Songs (Strophe/Refrain, Formteile) gibt es nicht – das
  „Original“ ist ein Loop aus den vorhandenen Bausteinen.
