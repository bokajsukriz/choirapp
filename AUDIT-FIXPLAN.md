# Arbeitsanweisung — Umsetzung der Audit-Befunde

Adressat: Sonnet (Folge-Session). Grundlage: externer Auditbericht (ChatGPT),
gegengeprüft am Stand `f440e8d` von `index.html` (13003 Zeilen), `sw.js`,
`lame.min.js`, `LICENSE-lamejs.txt`.

Alle Zeilennummern beziehen sich auf diesen Stand und verschieben sich beim
Arbeiten. **Immer über Funktionsnamen ansteuern, nicht über Zeilennummern.**

---

## 0. Rahmenbedingungen (gelten für jeden Schritt)

1. **Branch:** `claude/chatgpt-audit-review-41spe5`. Nicht auf `main` pushen.
2. **Kein Build-Schritt, keine Abhängigkeiten.** Die App bleibt eine statische
   PWA, die direkt von GitHub Pages läuft. Keine `package.json`, kein
   `node_modules`, kein Bundler, keine externen Ressourcen zur Laufzeit.
3. **`SW_VERSION` in `sw.js` erhöhen** (aktuell `'v99'` → `'v100'`), sobald
   `index.html`, `sw.js` oder `manifest.json` geändert sind. Ohne das bekommt
   niemand das Update, weil der Shell-Cache unter altem Namen bestehen bleibt.
   Genau **einmal** am Ende erhöhen, nicht pro Commit.
4. **Codestil beibehalten:** deutschsprachige Kommentare im Ton der Datei
   (erklären *warum*, nicht *was*), 2 Leerzeichen Einrückung, keine
   Umformatierung fremder Zeilen, keine Umbenennungen „bei der Gelegenheit“.
   Der Diff soll klein und einzeln nachvollziehbar bleiben.
5. **Keine Modularisierung, keine Extraktion in eigene Dateien.** Das ist
   bewusst ausgeklammert (siehe Abschnitt 12).
6. **Syntaxprüfung nach jeder Änderung:** das Skript aus `index.html` prüfen,
   z. B. via
   `node -e "const s=require('fs').readFileSync('index.html','utf8'); const m=s.match(/<script>([\s\S]*)<\/script>\s*<\/body>/); new (require('vm').Script)(m[1]);"`
   oder gleichwertig. `node --check sw.js` und `node --check groove-lab.js`.
7. **Ein Commit je Arbeitspaket** (A1 … A10), englische Betreffzeile im
   Imperativ wie in der bisherigen Historie (`Always open external links …`).
8. Am Ende **einmal pushen** (`git push -u origin claude/chatgpt-audit-review-41spe5`).
   **Keinen Pull Request eröffnen**, solange der Nutzer nicht danach fragt.

---

## 1. A1 — Speicherfehler bei Notizen und eigenen Liedtexten (Befund F-01, P0)

**Das ist der einzige Befund mit echtem Datenverlustrisiko. Zuerst erledigen.**

### Ist-Zustand

`noteWrite()` (≈ Z. 10302) und `lyricsNoteWrite()` (≈ Z. 9845):

```js
function noteWrite(run) {
  notePending = notePending.then(run, run).catch((err) => console.error('[notiz]', err));
  return notePending;                    // ← die bereits abgefangene Promise
}
```

Zurückgegeben wird die Promise **nach** dem `.catch()`. Sie erfüllt sich
immer. Damit ist der `catch`-Zweig in `saveNote()` (≈ Z. 10446) und
`saveLyricsNote()` (≈ Z. 10072) toter Code: bei `QuotaExceededError` oder
einem sonstigen IndexedDB-Fehler läuft `setNoteState('saved')` und —
bei `announce` — das Banner „Notiz gespeichert.“, obwohl nichts geschrieben
wurde. Nach einem Reload ist der Text weg.

### Zu tun

1. In **beiden** Funktionen die Operation und die Warteschlange trennen:

```js
function noteWrite(run) {
  const op = notePending.then(run, run);
  // Die Warteschlange selbst darf nie im Fehlerzustand hängen bleiben —
  // sonst stünde jede spätere Schreiboperation still. Der Aufrufer bekommt
  // dagegen die echte, ggf. abgelehnte Promise: nur so kann die Oberfläche
  // einen fehlgeschlagenen Speichervorgang auch als solchen zeigen.
  notePending = op.catch((err) => console.error('[notiz]', err));
  return op;
}
```

   Analog `lyricsNoteWrite()` mit `console.error('[liedtext]', …)`.
   Das `then(run, run)` bleibt: eine gescheiterte Operation darf die nächste
   nicht blockieren.

2. **Alle Aufrufstellen prüfen** — `noteWrite()`/`lyricsNoteWrite()` kann jetzt
   ablehnen, und `boot()` hängt einen `unhandledrejection`-Handler, der sonst
   bei jedem stillen Aufräum-Delete ein „Unerwarteter Fehler.“-Banner wirft:

   | Stelle | Aufruf | Behandlung |
   |---|---|---|
   | `loadSongLyricsNote` ≈ 9877, 9881 | fire-and-forget | `.catch((err) => console.error('[liedtext]', err))` anhängen |
   | `loadSongNote` ≈ 10343, 10351 | fire-and-forget | `.catch((err) => console.error('[notiz]', err))` anhängen |
   | `flushLyricsNote` ≈ 10100, 10109 | fire-and-forget bei `pagehide` | nur `.catch(console.error)` — ein Banner ist beim Wegwischen der Seite ohnehin nicht mehr sichtbar |
   | `flushNote` ≈ 10475, 10484 | dito | dito |
   | `saveLyricsNote` ≈ 10072 / `saveNote` ≈ 10446 | `await` in `try` | unverändert lassen — der bestehende `catch` wird jetzt endlich erreicht |
   | `deleteLyricsNote` ≈ 10089 / `deleteNote` ≈ 10461 | `await` ohne `try` | siehe Punkt 3 |

3. `deleteNote()` und `deleteLyricsNote()` setzen die Oberfläche **vor** dem
   Schreiben zurück (`playerNote = null; renderNoteBlock();`). Schlägt das
   Löschen fehl, sieht es nach Erfolg aus, und nach dem Reload ist die Notiz
   wieder da. Deshalb dort umbauen:

```js
async function deleteNote() {
  clearTimeout(noteSaveTimer);
  noteSaveTimer = null;
  const note = playerNote;
  playerNote = null;
  renderNoteBlock();
  if (!note) return;
  try {
    await noteWrite(() => DB.metaDelete(note.key));
  } catch (err) {
    // Der Datensatz steht noch in der Datenbank — das darf nicht als
    // „gelöscht" durchgehen, sonst ist die Notiz nach dem nächsten Start
    // unerwartet wieder da.
    playerNote = note;
    renderNoteBlock();
    bannerError('Die Notiz konnte nicht gelöscht werden.', 'NOTE-DELETE', err);
  }
}
```

   Analog `deleteLyricsNote()` mit Code `LYRICS-NOTE-DELETE` und
   Wiederherstellen von `playerLyricsNote`/`lyricsSource`.
   Achtung: die beiden Aufrufer in `saveNote`/`saveLyricsNote`
   (`announce && !text.trim()`) melden danach „Leere Notiz entfernt.“ —
   diese Bestätigung darf nach einem Fehlschlag **nicht** erscheinen.
   Rückgabewert `true`/`false` aus `deleteNote()` zurückgeben und die
   Bestätigung daran hängen.

4. **Kein automatischer Wiederholungs-Loop.** Nach einem Fehler bleibt der
   Zustand `dirty`, der Text steht weiter im Feld, und der nächste Tastendruck
   bzw. `blur` löst ohnehin einen neuen Versuch aus. Das genügt.

### Abnahme

- In der Konsole `chorApp.db.metaPut` einmalig durch eine ablehnende Attrappe
  ersetzen, Notiz tippen, `blur` → Zustand muss `dirty` bleiben, ein
  Fehlerbanner mit Code `NOTE-SAVE` erscheinen, **kein** „gespeichert“.
- Attrappe zurücknehmen, erneut speichern → muss funktionieren.
- Dasselbe für den eigenen Liedtext (`LYRICS-NOTE-SAVE`).
- Regressionsprobe: Song wechseln, während eine Notiz noch geschrieben wird —
  die Reihenfolge der Schreibvorgänge muss erhalten bleiben (dafür ist
  `notePending` da).

---

## 2. A2 — Kein leerer Song nach fehlgeschlagenem Import (Befund F-02, P1)

### Ist-Zustand

In `runImport()` (≈ Z. 7300–7430) werden Trackfehler pro Datei gefangen
(`report.failed.push(...)`), aber am Ende der Songschleife stehen
**bedingungslos**:

```js
song.tracks.sort(...);
batch.songs.add(song);          // ← auch wenn kein einziger Track ankam
...
report.songsImported++;         // ← und wird trotzdem gezählt
```

Bei einer einzigen, nicht lesbaren Datei entsteht so ein Songdatensatz ohne
Track — in der Bibliothek sichtbar, nicht abspielbar — plus die Meldung
„1 Song importiert“.

Ebenso wird `attachRequests.push(...)` (≈ Z. 7318) schon **vor** der
Trackschleife gefüllt; für einen Song, der nie entsteht, wird danach
`attachSimilarSongData()` mit einer toten Ziel-ID aufgerufen.

### Zu tun

1. Je Song ein lokales Flag führen, z. B. `let songGotContent = false;`,
   direkt nach dem Anlegen von `song`.
2. Auf `true` setzen an genau den Stellen, an denen tatsächlich Inhalt
   übernommen wurde: nach erfolgreichem `batch.files.push(await fileRecord(...))`
   in der Trackschleife, nach erfolgreichem Liedtext (`song.lyrics = text`)
   und nach erfolgreichem PDF (`song.scores.push(...)` bzw. Ersetzen).
3. Ein bereits vorhandener Song (`scan.existing`) zählt als „hat Inhalt“
   **nicht** automatisch — er darf aber auch nicht verschwinden. Deshalb:

```js
const keep = songGotContent || !!scan.existing;
if (keep) {
  song.tracks.sort(...);
  batch.songs.add(song);
  if (scan.attachSimilar && scan.similar) {
    attachRequests.push({ fromId: scan.similar.id, toId: song.id, toTitle: song.title });
  }
}
if (songGotContent) report.songsImported++;
```

   `attachRequests.push(...)` also aus der Kopfschleife hierher verschieben.
   Bei einem vorhandenen Song ohne neuen Inhalt wird der unveränderte
   Datensatz zwar erneut geschrieben (harmlos, idempotent), aber nicht als
   Import gezählt.
4. Trifft ein Song gar keinen Inhalt und existierte er vorher nicht, gehört
   das in den Bericht — der Dateifehler steht bereits in `report.failed`, das
   genügt; **kein** zusätzlicher Eintrag, sonst wird die Liste doppelt.
5. `batch.songs.add(song)` **innerhalb** der Trackschleife (nach erfolgreichem
   `fileRecord`) bleibt unverändert — dort ist der Inhalt ja belegt.

### Abnahme

- `entryBlob` für genau eine Datei ablehnen lassen: bei einem neuen Song mit
  nur dieser Datei darf **kein** Songdatensatz entstehen und
  `report.songsImported` 0 bleiben.
- Gemischt (eine Datei gut, eine kaputt): Song entsteht, spielt, Zähler 1,
  ein Eintrag in `report.failed`.
- Vorhandener Song, alle neuen Dateien kaputt: Song bleibt unverändert
  erhalten, Zähler 0.

---

## 3. A3 — Sicherung einspielen: keine verwaisten Dateien (Befund F-03, P1)

### Ist-Zustand

`restoreBackup()` (≈ Z. 12091) schreibt Datei-Bytes und den referenzierenden
Metadatensatz in **getrennten** Transaktionen:

```js
await DB.filePut(await fileRecord(fileKey, blob, fileName));   // Bytes
song.tracks.push({ ..., fileKey, ... });                       // nur im Speicher
...
await DB.metaPut(song);                                        // Referenz
```

Bricht irgendetwas dazwischen ab (Quota, `AbortError`), bleiben die Bytes ohne
Referenz im `files`-Store: unsichtbar, nie wieder löschbar, verbrauchen Quota.
Dasselbe Muster bei den RECs weiter unten.

Zusätzlich ist der Aufruf in `$('#backup-input')`-`change` (≈ Z. 12053)
**nicht** in `try/catch` gefasst. Ein Fehler landet nur im globalen
`unhandledrejection`-Handler und erscheint als generisches
„Unerwarteter Fehler.“ ohne Bezug zur Sicherung.

### Zu tun

1. **Song-Audio im Batch-Muster schreiben**, wie es der ZIP-Import schon macht.
   `flushImportBatch(batch)` (≈ Z. 7202) ist dafür genau richtig und
   wiederverwendbar: es schreibt Dateien und Songdatensätze in **einer**
   Transaktion (`tx(['files','meta'], 'readwrite', …)`), und weil der
   Songdatensatz bei jedem Flush mitgeschrieben wird, referenziert er immer
   nur bereits festgeschriebene Dateien.

   Konkret in der `songAudioIn`-Schleife:
   - Batch anlegen: `const batch = { files: [], songs: new Set(), obsolete: [], bytes: 0 };`
   - statt `await DB.filePut(...)`: `batch.files.push(await fileRecord(...)); batch.bytes += blob.size; batch.songs.add(song);`
   - nach jedem Track/PDF: `if (batch.bytes >= IMPORT_BATCH_BYTES || batch.files.length >= IMPORT_BATCH_FILES) await flushImportBatch(batch);`
   - statt `await DB.metaPut(song)` am Songende: `batch.songs.add(song);`
     und nach der Songschleife einmal `await flushImportBatch(batch);`
   - `createPlaceholderSong()` schreibt den (leeren) Song sofort in die
     Datenbank. Für den Restore stattdessen den Datensatz nur **im Speicher**
     bauen (gleiche Feldstruktur, `hashId(normalizeTitle(title))` als ID) und
     das Schreiben dem Batch überlassen — sonst bleibt bei einem Abbruch
     wieder ein leerer Song stehen (dasselbe Problem wie F-02).
     Die Prüfung auf einen bereits vorhandenen Song bleibt wie sie ist
     (`findSongByTitle(songs, s.title)` → `songsSkipped++`).

2. **RECs je Datensatz in einer Transaktion.** Eine Aufnahme ist genau eine
   Datei plus ein Metadatensatz — dafür genügt ein direkter `tx`-Aufruf statt
   `DB.filePut` + `DB.metaPut`:

```js
await tx(['files', 'meta'], 'readwrite', (fileStore, metaStore) => {
  fileStore.put(fileRec);
  metaStore.put(recording);
});
```

   (`dropSongCache()` wird hier nicht gebraucht; Aufnahmen liegen nicht im
   Song-Cache. `loadSongRecordings()` am Ende bleibt.)

3. **Aufräumen bei Abbruch.** Trotz 1. und 2. kann ein Fehler zwischen zwei
   Transaktionen auftreten (z. B. `base64ToBlob` scheitert nach einem Flush).
   Deshalb im ganzen `restoreBackup()`:
   - eine Liste `const writtenFileKeys = [];` führen und **jeden** im Lauf
     vergebenen `fileKey` eintragen;
   - den schreibenden Teil in `try/catch` fassen; im `catch` alle `fileKeys`
     löschen, die **kein** festgeschriebener Datensatz referenziert
     (`DB.metaByType('song')` + `DB.metaByType('recording')` frisch lesen,
     referenzierte Keys sammeln, Differenz per `DB.fileDelete(keys)`
     entfernen), danach den Fehler mit einer Teilbilanz melden und
     `dropSongCache()` aufrufen;
   - anschließend erneut werfen **oder** ein Ergebnisobjekt zurückgeben — aber
     in jedem Fall darf der Abschlussbanner „Sicherung eingespielt“ nach einem
     Abbruch nicht erscheinen.

4. **Aufrufstelle absichern:**

```js
try {
  await restoreBackup(data, resolveAudioBase64);
} catch (err) {
  bannerError('Die Sicherung konnte nicht vollständig eingespielt werden.', 'BACKUP-RESTORE', err);
}
```

5. **Vorabprüfung (leichtgewichtig, AP-04).** Vor dem ersten Schreibvorgang
   die Struktur einmal durchgehen und offensichtlich unbrauchbare Einträge
   verwerfen, statt sie mitten im Schreiben scheitern zu lassen: `songAudio`-
   Einträge ohne `title` (String) oder ohne verwertbare `tracks`/`scores`,
   `recordings` ohne `audioBase64`. Verworfene zählen und in der
   Abschlussmeldung nennen. **Nicht** den kompletten Base64-Inhalt vorab
   auflösen — genau das vermeidet `readBackupFile()` bewusst (Speicher).

### Abnahme

- Fehler injizieren beim zweiten Track eines Songs → danach dürfen weder
  verwaiste Einträge im `files`-Store noch ein Song mit toten `fileKey`-
  Referenzen existieren.
- Fehler beim `metaPut` der RECs → dieselbe Prüfung.
- Dieselbe Sicherung zweimal einspielen → keine Duplikate (die vorhandene
  Duplikatsprüfung muss erhalten bleiben).
- Vergleichsprüfung: Zahl der Einträge im `files`-Store vor und nach einem
  abgebrochenen Restore muss gleich sein.

---

## 4. A4 — „Alle Daten löschen“ löscht wirklich alles (Befund F-05, P2)

### Ist-Zustand

`DB.wipe()` (≈ Z. 3413) leert `files` und `meta`. Nicht geleert werden:

- `localStorage['bvg-error-log']` (`ERROR_LOG_KEY`, bis zu 20 Einträge mit
  Fehlercode, Zeitstempel, Browsermeldung),
- `localStorage['bvg-debug-log']` (`DEBUG_LOG_KEY`, bis zu 3000 Einträge),
- die In-Memory-Kopien `errorLog` / `debugLog`,
- `sessionStorage[COMPAT_UPDATE_FLAG]`.

Die Oberfläche meldet trotzdem „Alle Daten wurden gelöscht.“

### Zu tun

1. Im Klickhandler `$('#btn-wipe')` (≈ Z. 5992) nach `await DB.wipe()`
   ergänzen:
   - `clearDebugLog()` (existiert bereits, ≈ Z. 3114),
   - `errorLog = [];` plus `localStorage.removeItem(ERROR_LOG_KEY)` in
     `try/catch` — dafür eine kleine Funktion `clearErrorLog()` neben
     `clearDebugLog()` anlegen und die identische Logik im bestehenden
     Handler `$('#btn-errorlog-clear')` (≈ Z. 5595) durch den Aufruf
     ersetzen (keine Duplizierung),
   - `try { sessionStorage.removeItem(COMPAT_UPDATE_FLAG); } catch {}`,
   - `renderErrorLog()` / die Diagnoseanzeige neu zeichnen, falls die
     Einstellungen gerade offen sind (macht `renderSettings()` bereits — prüfen).
2. Ausgeschriebenen Dialogtext in `confirmDialog` erweitern, damit die Zusage
   der Wirklichkeit entspricht, z. B. „Alle Songs, Aufnahmen, Loops, Setlisten
   **sowie Fehler- und Diagnoseprotokolle** werden von diesem Gerät entfernt.“
   Falls der Text über `data-i18n` läuft: alle Sprachvarianten mitziehen
   (`grep -n "settings.data.wipe" index.html`).

### Abnahme

Fehlerprotokoll und Diagnoseprotokoll füllen (Diagnose einschalten, ein paar
Aktionen), löschen, Seite neu laden → beide Listen leer, IndexedDB leer,
`localStorage` ohne `bvg-*`-Schlüssel.

---

## 5. A5 — Textkontrast (Befund F-07, P3)

### Ist-Zustand

`--muted: #8c81a6` (Z. 32). Nachgerechnet:

| Kombination | Kontrast | WCAG AA (4,5:1) |
|---|---|---|
| `--muted` auf `--surface` `#ffffff` | 3,62:1 | nicht bestanden |
| `--muted` auf `--bg` `#fff7ec` | 3,40:1 | nicht bestanden |
| `#ffffff` auf `--muted` (Badge, Z. 424) | 3,62:1 | nicht bestanden |

`--muted` wird an über 30 Stellen für Fließtext, Platzhalter, Hinweise und
einmal als Badge-Hintergrund verwendet.

### Zu tun

1. `--muted` auf einen dunkleren Wert derselben Farbfamilie setzen.
   Vorschlag: **`#766a91`** — nachgerechnet 4,66:1 auf `#fff7ec`, 4,95:1 auf
   `#ffffff`, und Weiß darauf 4,95:1, damit ist auch der Badge in Ordnung.
2. Den Wert **nicht raten, sondern nachrechnen** (WCAG-Formel: sRGB →
   linearisieren → relative Luminanz → `(L1+0.05)/(L2+0.05)`) und das Ergebnis
   im Commit nennen. Ein kurzes Wegwerf-Node-Skript im Scratchpad genügt;
   es gehört **nicht** ins Repository.
3. Prüfen, ob `--muted` irgendwo auf einem dunkleren Grund als `#fff7ec`
   steht (`grep -n -- "--muted" index.html` und die Regeln daneben ansehen,
   insbesondere `--surface-2` und `.lyrics-present`). Falls ja: dort separat
   bewerten, statt eine Farbe für alles zu erzwingen.
4. Kommentar an der Variablen ergänzen, warum genau dieser Wert
   (Kontrastgrenze), damit ihn niemand versehentlich wieder aufhellt.

---

## 6. A6 — Fokusverwaltung in modalen Ebenen (Befund F-04, P3)

### Ist-Zustand

Modale Oberflächen sind: `#overlay` (Bestätigungsdialog), die dynamisch
erzeugte Ebene in `promptDialog()`, `#onboarding`, `#lyrics-present` und
`#sheet` (Importauswahl). Keine davon hält den Fokus fest, keine gibt ihn beim
Schließen an das auslösende Element zurück. `promptDialog()`s Ebene hat
außerdem weder `role="dialog"` noch `aria-modal`, und ihr Escape-Handler hängt
nur am Eingabefeld — wer den Fokus verliert, kommt mit der Tastatur nicht mehr
heraus.

### Zu tun

1. **Eine** zentrale Hilfsfunktion neben `confirmDialog()` anlegen, kein
   Umbau auf natives `<dialog>` (zu großer Eingriff, iOS-Verhalten müsste neu
   erprobt werden):

```js
const modalStack = [];

/**
 * Hält den Tastaturfokus in einer modalen Ebene fest und gibt ihn beim
 * Schließen an das auslösende Element zurück. Ohne das tabbt man hinter das
 * Overlay in die Bibliothek darunter und findet nach dem Schließen nicht mehr
 * an die Stelle zurück, von der man kam.
 */
function openModal(layer, { initialFocus } = {}) { /* … */ }
function closeModal(layer) { /* … */ }
```

   Anforderungen an die Umsetzung:
   - `document.activeElement` beim Öffnen merken, beim Schließen
     `restore.focus?.()` — aber nur, wenn das Element noch im Dokument hängt.
   - Alle direkten Kinder von `<body>` außer der modalen Ebene auf `inert`
     setzen (und beim Schließen zurücknehmen). Die vorhandene Struktur macht
     das einfach: die modalen Ebenen sind selbst `body`-Kinder.
     Kennt der Browser `inert` nicht (`!('inert' in HTMLElement.prototype)`),
     genügt der Tab-Zyklus aus dem nächsten Punkt — kein Polyfill laden.
   - Ein `keydown`-Handler auf der Ebene: `Tab` / `Shift+Tab` zyklisch
     innerhalb der fokussierbaren Elemente der Ebene halten
     (Selektor: `a[href], button:not([disabled]), input:not([disabled]),
     select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])`,
     unsichtbare via `offsetParent === null` aussortieren).
   - Anfangsfokus: `initialFocus` oder das erste fokussierbare Element.
   - Stapelfähig (`modalStack`), weil `confirmDialog()` aus einem offenen
     `#sheet` heraus aufgerufen wird.
2. Anwenden in: `confirmDialog()`/`closeDialog()`, `promptDialog()`,
   `openOnboarding()`/`closeOnboarding()`, `openLyricsPresent()`/
   `closeLyricsPresent()`, `openPicker()`/`closeSheet()`.
3. `promptDialog()`s Ebene bekommt `role="dialog"`, `aria-modal="true"` und
   ein `aria-label` (der Titel). `#sheet` bekommt `role="dialog"`
   `aria-modal="true"` (`aria-labelledby="sheet-title"` steht schon).
4. Escape-Behandlung vereinheitlichen: der bestehende globale Handler
   (≈ Z. 3197) darf nur die **oberste** Ebene schließen. `promptDialog()`s
   Escape-Handler vom Eingabefeld auf die Ebene hochziehen.
5. `document.body.style.overflow = 'hidden'` macht bisher nur
   `openLyricsPresent()`. Das gehört in `openModal()`/`closeModal()` — und
   zwar erst beim ersten bzw. letzten Eintrag im Stapel.

### Abnahme

Für jede der fünf Ebenen: mit Tab und Shift+Tab durchlaufen — der Fokus darf
die Ebene nicht verlassen; Escape schließt; danach liegt der Fokus wieder auf
dem Knopf, der die Ebene geöffnet hat.

---

## 7. A7 — Tastaturmodell der Reiter (Befund F-08, P3)

### Ist-Zustand

Zwei Stellen mit `role="tablist"`:

1. **Player-Reiter** `#player-tabs` (Z. 2142–2165): `role="tab"`,
   `aria-selected` und `aria-controls` sind vorhanden (der Auditbericht nennt
   `aria-controls` fälschlich als fehlend). Es fehlen: roving `tabindex`,
   Pfeiltasten, Home/End, und die Panels tragen kein `tabindex="-1"`.
2. **Onboarding-Punkte** `#onb-dots` (Z. 2036, `renderOnbDots()`): Knöpfe mit
   `role="tab"` in einer `role="tablist"`, aber ohne zugehörige `tabpanel`s
   und mit `aria-current` statt `aria-selected` — das ist schlicht die falsche
   Rolle.

### Zu tun

1. **`#player-tabs` vollständig nach ARIA-Muster:**
   - `tabindex="0"` nur am ausgewählten Reiter, `tabindex="-1"` an den
     übrigen — in `setPlayerTab()` mitpflegen, wo bereits `aria-selected`
     gesetzt wird.
   - Ein `keydown`-Handler auf `#player-tabs`: `ArrowLeft`/`ArrowRight`
     wechseln zyklisch, `Home`/`End` springen an den Rand, jeweils
     `setPlayerTab(name)` **und** `focus()` auf den neuen Reiter.
     `preventDefault()` nicht vergessen.
   - Die vier Panels `#tab-panel-*` bekommen `tabindex="0"`, damit der Inhalt
     nach dem Reiter erreichbar ist (sie enthalten teils nur Text).
2. **`#onb-dots` entrollen:** `role="tablist"` am Container entfernen,
   `role="tab"` an den Punkten entfernen. Stattdessen
   `<div class="onb-dots" role="group" aria-label="Schritte">` und pro Knopf
   `aria-current="true"`/entfernt sowie das vorhandene
   `aria-label="Schritt n von m"`. Das ist ehrlicher als ein halbes
   Tab-Muster und ändert nichts an der Bedienung.

---

## 8. A8 — Harte Grenzen beim Auspacken (Befund F-06, P2)

**Reduzierter Umfang gegenüber dem Auditbericht.** Die Dateien stammen aus dem
Dropbox-Export des eigenen Chores und werden vom Nutzer selbst ausgewählt; der
Angriffsweg ist entsprechend schmal. Umgesetzt wird nur, was billig und
risikoarm ist — kein Umbau auf durchgängiges Streaming, keine globale
„Import-Limit-Policy“.

### Zu tun

1. Konstanten neben `LARGE_IMPORT_BYTES` (≈ Z. 7085) definieren, mit
   Begründung im Kommentar:

```js
const ZIP_MAX_ENTRIES      = 20000;              // ein Chorarchiv liegt bei einigen hundert
const ZIP_MAX_ENTRY_BYTES  = 512 * 1024 * 1024;  // ausgepackt, je Eintrag
```

2. In `zipReadDirectory()` (≈ Z. 4310) nach dem Aufbau von `entries` prüfen:
   mehr als `ZIP_MAX_ENTRIES` → `ZipError` mit verständlichem Text
   („Dieses Archiv enthält ungewöhnlich viele Dateien …“).
3. In `zipExtract()` (≈ Z. 4404):
   - vor dem Auspacken `entry.size > ZIP_MAX_ENTRY_BYTES` → `ZipError`
     (die Größenangabe stammt aus dem Inhaltsverzeichnis und kostet nichts);
   - beim `method === 8`-Zweig zusätzlich **während** des Entpackens zählen,
     damit eine gefälschte Größenangabe nicht durchrutscht:

```js
let seen = 0;
const guard = new TransformStream({
  transform(chunk, controller) {
    seen += chunk.byteLength;
    if (seen > ZIP_MAX_ENTRY_BYTES) {
      throw new ZipError(`„${entry.path}" ist beim Auspacken unerwartet groß geworden.`);
    }
    controller.enqueue(chunk);
  },
});
const stream = raw.stream()
  .pipeThrough(new DecompressionStream('deflate-raw'))
  .pipeThrough(guard);
```

4. **Nicht** anfassen: `readBackupFile()`. Der Skeleton-/Span-Ansatz dort löst
   das Speicherproblem bereits bewusst und gut; jeder Eingriff bringt mehr
   Risiko als Nutzen.

### Abnahme

Kleines ZIP mit einem stark komprimierten Eintrag knapp über und knapp unter
der Grenze bauen (mit `python3 -c` erzeugbar) → über der Grenze bricht der
Import mit verständlicher Meldung ab und lässt keinen halben Song zurück,
darunter läuft er durch.

---

## 9. A9 — Lizenz und Herkunft von `lamejs` (Befunde F-09/F-11, P4)

### Ist-Zustand

Der Kopf von `lame.min.js` dokumentiert bereits Version (`v1.2.1`),
Upstream (`github.com/zhuker/lamejs`, npm), Lizenz (LGPL-3.0) und
„vendored unmodified“ — mehr, als der Auditbericht unterstellt.
Es fehlt aber tatsächlich der **Lizenztext selbst**: `LICENSE-lamejs.txt`
enthält nur einen Auszug aus der LAME-FAQ, nicht die LGPL.
In der App wird LAME nirgends sichtbar genannt.

### Zu tun

1. `LICENSE-lamejs-LGPL-3.0.txt` mit dem **vollständigen** Text der
   GNU LGPL v3 anlegen und `LICENSE-lamejs-GPL-3.0.txt` mit dem der GPL v3
   (die LGPLv3 ist als Zusatzerlaubnis auf die GPLv3 formuliert und ohne
   diese unvollständig). Beide von `https://www.gnu.org/licenses/lgpl-3.0.txt`
   bzw. `.../gpl-3.0.txt` beziehen. Ist der Abruf gesperrt: **nicht aus dem
   Gedächtnis schreiben**, sondern den Schritt offen lassen und im Bericht
   nennen.
2. `LICENSE-lamejs.txt` behalten (der FAQ-Auszug bleibt gültig), aber am Kopf
   auf die beiden neuen Dateien verweisen.
3. `THIRD-PARTY.md` anlegen:

   | Feld | Wert |
   |---|---|
   | Komponente | lamejs |
   | Version | 1.2.1 |
   | Datei | `lame.min.js` |
   | SHA-256 | `194ee71034bb400f05648d2f7cd552f53edb43b5a106a8c9d809bee3d6275ea5` |
   | Quelle | https://github.com/zhuker/lamejs — npm `lamejs@1.2.1` |
   | Lizenz | LGPL-3.0 (siehe `LICENSE-lamejs-LGPL-3.0.txt`) |
   | Verändert | nein |
   | Verwendung | MP3-Export der eigenen Aufnahmen, per `<script>` nachgeladen |

   Den Hashwert vor dem Eintragen selbst nachrechnen (`sha256sum lame.min.js`),
   nicht aus dieser Anweisung übernehmen.
4. Sichtbare Nennung in der App ergänzen — die LAME-FAQ verlangt sie
   ausdrücklich („Fully acknowledge that you are using LAME, and give a link
   to our web site“). Ein kurzer Absatz am Ende der Einstellungen genügt:
   „MP3-Export mit **lamejs** (LGPL-3.0), basierend auf **LAME** —
   lame.sourceforge.net“, Link mit `target="_blank" rel="noopener noreferrer"`
   wie die übrigen externen Links der App. Bestehendes Übersetzungsschema
   (`data-i18n`) beachten.

---

## 10. A10 — README (Befund F-12, teilweise, P5)

Das Repository hat keine README. Eine anlegen, knapp und wahr:

- Was die App ist (installierbare, rein lokale Chor-Übe-PWA, kein Backend,
  kein Konto, keine Telemetrie).
- Wo die Daten liegen (IndexedDB `chor-app`, Protokolle in `localStorage`,
  App-Shell im Cache Storage) und was „Alle Daten löschen“ nach A4 entfernt.
- Dateiübersicht (`index.html` enthält UI, Logik, Styles und die
  Selbsttests; `sw.js`; `groove-lab.js`; `lame.min.js`).
- Lokal starten: `python3 -m http.server` im Repo-Wurzelverzeichnis, dann
  `http://localhost:8000` (`file://` scheidet wegen Service Worker und
  Modulpfaden aus).
- Selbsttests: in der Browserkonsole `chorApp.selfTest()`; laufen außerdem
  bei jedem Start und melden sich in der Konsole.
- **Regel prominent:** bei jeder Änderung an `index.html`, `sw.js` oder
  `manifest.json` `SW_VERSION` in `sw.js` erhöhen.
- Bewusst offene Punkte mit Begründung: keine CSP (Befund F-10 — die App lädt
  keinerlei Fremdressourcen und hat kein Backend; ohne Auslagerung des
  vollständig inline liegenden Codes bräuchte jede CSP weiterhin
  `'unsafe-inline'` und brächte kaum Schutz), keine Modularisierung, keine CI.
- Verweis auf `THIRD-PARTY.md`.

---

## 11. Tests

Es gibt eine funktionierende Testeinstiegsstelle: `runSelfTests()`
(≈ Z. 12502), erreichbar über `window.chorApp.selfTest()`, ausgeführt bei
jedem Start. Dort **ergänzen**, was ohne Browser-Automatisierung prüfbar ist:

1. `noteWrite()`/`lyricsNoteWrite()`: eine ablehnende Operation einreihen und
   prüfen, dass (a) die zurückgegebene Promise ablehnt und (b) die **nächste**
   eingereihte Operation trotzdem läuft. Das ist der Kern von A1 und rein in
   JavaScript prüfbar, ohne IndexedDB.
2. Die Aufräumlogik aus A3 (welche `fileKeys` sind verwaist?) als reine
   Funktion herausziehen — `orphanFileKeys(writtenKeys, songs, recordings)` —
   und mit Beispieldaten prüfen. Dadurch wird der schwierigste Teil testbar,
   ohne eine Datenbank zu brauchen.
3. Die Entscheidungslogik aus A2 (`keep`/`songGotContent`) ebenfalls als
   kleine reine Funktion formulieren, falls sich das ohne Verrenkung ergibt.
   Wenn nicht: weglassen, keine Testattrappen um den Import bauen.

**Achtung:** `runSelfTests()` endet mit
`const total = voiceCases.length + titleCases.length + 11;` — die `11` ist
handgezählt und muss mit jeder neuen Prüfung mitwachsen. Besser: einen Zähler
`let checks = 0;` einführen, den jede Prüfung erhöht, und `total` daraus
bilden. Das ist eine erlaubte kleine Umstrukturierung.

Alles Übrige (Fokusreihenfolge, Kontrast im echten Rendering, Quota-Verhalten,
Service-Worker-Update) **manuell im Browser** prüfen und im Abschlussbericht
festhalten, was geprüft wurde und was nicht. Nichts behaupten, was nicht
tatsächlich ausgeführt wurde.

---

## 12. Ausdrücklich nicht Teil dieses Auftrags

Diese Punkte des Auditberichts bleiben bewusst offen — nicht anfangen:

- **F-10 (CSP)** und Hosting-Header — Entscheidung des Nutzers, Begründung
  steht in der README (A10).
- **AP-18 Modularisierung** in ES-Module, **AP-19 Headless-Browser-CI**,
  **AP-16 CI-Gates**, SBOM-Werkzeuge, `package.json`, GitHub-Actions-Workflows.
  Das Repository bleibt abhängigkeitsfrei.
- Umbau auf natives `<dialog>`.
- Migrations-/Rollbackkonzept für IndexedDB.
- Änderungen an `groove-lab.js` und `lame.min.js` (Letzteres ist
  unverändert vendort und muss es bleiben — sonst greift die
  Änderungsoffenlegungspflicht der LGPL).

---

## 13. Reihenfolge und Abschluss

1. A1 (F-01) — Datenverlust, zuerst.
2. A2 (F-02), A3 (F-03) — Import und Restore.
3. A4 (F-05), A8 (F-06) — Datenschutz und Grenzen.
4. A6 (F-04), A7 (F-08), A5 (F-07) — Barrierefreiheit.
5. A9 (F-09/F-11), A10 (F-12) — Lizenz, Herkunft, README.
6. `SW_VERSION` erhöhen, Syntaxprüfung, Selbsttests laufen lassen.
7. Push auf `claude/chatgpt-audit-review-41spe5`. **Kein Pull Request.**

Im Abschlussbericht je Arbeitspaket angeben: umgesetzt / abweichend umgesetzt
(mit Begründung) / nicht umgesetzt (mit Grund), und getrennt davon, was
tatsächlich geprüft wurde und wie.

---

## Anhang — Abweichungen zwischen Auditbericht und Code

Beim Gegenlesen bestätigt, mit drei Korrekturen:

1. **F-08:** `aria-controls` ist an den Player-Reitern vorhanden; es fehlen
   roving `tabindex`, Pfeiltasten und Home/End. Der zweite Fundort
   (`#onb-dots`) ist das größere Problem, weil dort `role="tab"` ohne
   zugehörige Panels steht.
2. **F-09/F-11:** Version, Upstream, npm-Paket, Lizenzbezeichnung und
   „unmodified“ stehen bereits im Kopf von `lame.min.js`. Es fehlt der
   Lizenztext und ein Manifest mit Prüfsumme, nicht die Herkunftsangabe.
3. **F-03:** Ein Fehler beim Einspielen bleibt nicht völlig stumm — der
   `unhandledrejection`-Handler aus `boot()` zeigt ein generisches Banner
   „Unerwarteter Fehler.“. Die Kritik bleibt richtig (kein Bezug zur
   Sicherung, keine Teilbilanz, keine Bereinigung), die Wirkung ist nur
   etwas weniger dramatisch als beschrieben.

Nicht bestätigt werden konnte nichts — alle übrigen Fundstellen und
Zahlenangaben, einschließlich der beiden Kontrastwerte 3,62:1 und 3,40:1,
stimmen mit dem Code überein.
