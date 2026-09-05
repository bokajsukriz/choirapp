# Architektur-Plan — Testnetz, Modularisierung, CSP

**Stand:** `main` @ `SW_VERSION v135`. Arbeitsanweisung zum Abarbeiten, Paket
für Paket. Jedes Paket ist ein eigener Commit mit eigenem SW-Bump.

Dieser Plan ist aus zwei unabhängigen Prüfungen entstanden (Claude Code +
Codex) und mehrfach gegen den echten Code nachgemessen. Die Reihenfolge ist
**nicht** nach Aufwand sortiert, sondern nach Risiko: was das Testnetz
aufspannt, kommt vor dem, was es braucht.

---

## Ausgangslage (bereits erledigt, nicht wiederholen)

| Sache | Zustand |
|---|---|
| AP-01 … AP-05 (Audit) | erledigt, auf `main` |
| AP-06 (Vendor-Compliance) | **teilweise** — Hashes dokumentiert, LGPL/GPL-Volltext fehlt (Netzblocker, siehe unten) |
| `recStarting`-Riegel in `rebuildAudioGraph()` | erledigt (v135), mit Selbsttest |
| `window.chorApp` Debug-Export | **existiert bereits** (~Z. 17953) — erweitern, nicht neu bauen |

---

## Vier Fallen, die diese Untersuchung teuer gelernt hat

Bitte vor dem ersten Commit lesen. Alle vier haben in dieser Sitzung
tatsächlich zu falschen Schlüssen geführt.

**1. Konsolidierende Refactorings dieses Audiopfads sind historisch belastet.**
Commit `657b162`: beim Zusammenlegen von `applySlowMode()` /
`applyRateToElement()` / `applyHdConfigure()` zu `hdApplyTransition()` ging
`el.playbackRate = Audio.rate` verloren — die einzige Zuweisung ans Element.
Gemerkt wurde das erst auf einem echten Pixel 9. Deshalb: **kein weiterer
Umbau dieses Pfads ohne Testnetz davor.**

**2. Ausgehende Funktionsaufrufe zählen misst Kopplung nicht.**
Der ZIP-Leser sieht mit 8 ausgehenden Aufrufen wie ein sauberes Blatt aus —
seine Grenzwerte (`ZIP_MAX_ENTRIES`, `ZIP_MAX_CD_BYTES`, `ZIP_MAX_RATIO`, …)
stehen aber bei **Z. 10223–10235**, rund 4.100 Zeilen vom Parser (Z. 6099 /
6310) entfernt. Konstanten sind keine Aufrufe. Vor jeder Extraktion also
**auch Konstanten, geteilte Mutables und Fehlertexte** suchen.

**3. Ein Test ohne geprüfte Kontrollbedingung beweist nichts.**
Ein Versuch, per `setUpdateInterval`-Herzschlag zu messen, ob der
Zeitdehner-Prozessor noch rechnet, lieferte dreimal „0 Ticks" — auch im
Kontrollfall mit laufendem Kontext und echtem Audio. Das Instrument war
kaputt, nicht die App. **Jeden neuen Test einmal gegen die kaputte Version
laufen lassen** (Mutation Check), sonst misst er womöglich nichts.

**4. Der Service Worker deckt Versionsversatz nicht vollständig ab.**
`sw.js` Z. 121 und 142 nutzen `caches.match(...)` **ohne** `cacheName` —
gesucht wird also über *alle* Caches, nicht nur `CACHE_NAME`. Solange alles in
einer Datei steckt, ist das folgenlos. Sobald `app.js` dazukommt, hängt die
Korrektheit daran, dass das Löschen alter Caches wirklich durch ist.

---

## AP-A — Test-Adapter (klein, zuerst)

**Ziel:** Interna testbar machen, ohne die IIFE anzufassen.

`window.chorApp` existiert schon und ist ausdrücklich als Konsolen-Zugang
dokumentiert. Es exponiert `audio`, `db`, `settings()`, beide Selbsttest-
Läufer und `lightshowFrame`.

Ergänzen als **eigener, benannter Unterbereich** — nicht die bestehenden
Felder aufblähen:

```js
window.chorApp.test = { … };
```

Regeln dafür:
- **Snapshots statt roher Mutables**, wo es geht. Rohe Lifecycle-Variablen
  direkt zu exportieren erlaubt Tests, unmögliche Zustände zu bauen, und
  macht spätere Extraktion schwerer.
- **Aufräumprotokoll**: ein abgebrochener Test darf keinen veränderten
  Singleton-Zustand hinterlassen. Der bestehende Async-Selbsttest stellt nur
  ausgewählte Felder wieder her — das reicht für mehr Tests nicht.
- Damit entfällt das bisherige Ritual (`cp index.html index_test.html`,
  Hook hineinpatchen, Playwright, Datei löschen). Das wurde in einer einzigen
  Sitzung fünfmal von Hand gemacht.

**Kein SW-Bump nötig?** Doch — `index.html` ändert sich.

---

## AP-B — Charakterisierungstests für den Audiopfad

**Ziel:** Festschreiben, was der Code *heute* tut, bevor irgendetwas umgebaut
wird. Nicht, was er tun *sollte*.

Deterministisch mit Fakes (bauen auf dem bestehenden Fehler-A/B-Selbsttest auf):

- native Rückfallebene ist verbunden, **bevor** auf RPCs gewartet wird
- `playbackRate` wird vor **jedem** frühen Rückkehrpfad gesetzt
- überholte Generationen verbinden nie wieder
- Knotenerzeugung für einen veralteten Kontext wird abgebaut
- `hdTeardown()` beendet nur den übergebenen Knoten und nullt keinen Nachfolger
- gleichzeitige Rebuild-Aufrufe teilen sich einen Lauf
- REC-Start **und** laufende Aufnahme sperren den Rebuild *(bereits abgedeckt)*
- Pegelmesser schließt nie den Wiedergabe-Kontext

**Grenze ehrlich ziehen:** Fakes prüfen Orchestrierung und Nachbedingungen.
Sie prüfen **nicht** Worklet-Start, echte Web-Audio-Beschränkungen,
CPU-Verhalten, Unterbrechungen durch das System oder hörbare Korrektheit.
Dafür braucht es AP-F.

---

## AP-C — `app.js` + CSP (rein mechanisch, eigener Release)

Erst wenn AP-A und AP-B stehen.

**In diesem Commit ausschließlich verschieben** — keine Audio-Aufräumarbeit,
keine Extraktion, keine Umbenennung.

1. `<script>`-Block nach `app.js`, als `<script type="module" src="app.js">`.
   Modul-Konversion ist **risikoarm, aber nicht neutral**: Auswertungszeitpunkt,
   Modul-Ladefehler und CSP-Durchsetzung ändern sich. Geprüft und sauber:
   kein `DOMContentLoaded`, kein `document.readyState`, kein
   `document.currentScript`, kein `import.meta`, kein Top-Level-`this`.
2. `'./app.js'` in **`SHELL_REQUIRED`** (nicht `SHELL_OPTIONAL`).
3. **Sichtbare Fehlermeldung, wenn das Modul nicht lädt.** Ohne die zeigt die
   App nach einem gescheiterten `app.js`-Fetch eine vollständige, aber tote
   Oberfläche.
4. CSP als `<meta http-equiv>` — GitHub Pages kann keine Header setzen,
   `frame-ancestors` ist damit nicht durchsetzbar. Das Meta-Tag muss **vor**
   dem stehen, was es regeln soll.

Startpunkt für die Policy:

```
script-src 'self' blob: 'wasm-unsafe-eval';
style-src  'self' 'unsafe-inline';
object-src 'none'; base-uri 'none';
```

`blob:` wegen des AudioWorklet-Moduls (`signalsmith-stretch.js` erzeugt eine
Blob-URL und übergibt sie `audioWorklet.addModule()`), `'wasm-unsafe-eval'`
wegen der WASM-Instanziierung.

> **Offen, nicht aus dem Gedächtnis entscheiden:** ob Worklets zusätzlich
> `worker-src blob:` brauchen. Nach Spezifikation greift `script-src`; Codex
> hält `worker-src` für sicherer. **Der Test unten klärt das** — nicht
> vorab festlegen.

Gut für uns: **0** Inline-Handler (`onclick=` etc.), **0** `eval`/
`new Function`/`javascript:`-URLs. Die 113 `style="…"`-Attribute stören nur,
sobald `style-src` restriktiv wird.

**Zu testen (Boot allein genügt nicht — die faulen Pfade laden sonst nie):**
`securitypolicyviolation` mitschneiden, dann je einzeln: normaler Boot,
HD-Modus (echtes Worklet), MP3-Export (`lame.min.js`), Groove Lab
(`window.ChorGrooveLab`). Dazu Chromium **und** WebKit, weil WASM- und
Worklet-CSP sich unterscheiden.

**Service-Worker-Tests:** frische Installation → offline starten; Upgrade von
v135 mit altem Worker in Kontrolle; `app.js` im Cache fehlschlagen lassen
(alter Cache muss stehen bleiben); nur `app.js` aus dem aktiven Cache löschen;
unkontrollierter Erstbesuch, während eine Datei 404 liefert.

---

## AP-D — Blatt-Module, in dieser Reihenfolge

1. **Lichtshow** (~Z. 3910–4116) — sauberster Kandidat. Rein, deterministisch,
   **null** Referenzen auf `dlog`/`banner`/`el`/`$`/`DB`/`settings`/`Audio`.
   25 Zeilen referenzieren `lightshowFrame`, die Grenze bleibt trotzdem schmal.
2. **`STRINGS`** (~Z. 5066–5924) — mechanisch trivial, aber semantisch an
   `data-i18n`-Markup gekoppelt. **Vorher Schlüsselparitäts-Test** (DE/EN/PL
   gleiche Schlüssel, keine verwaisten) — Zeilenzahl sagt hier nichts.
3. **ZIP-Leser** — **zuletzt**, und nur mit expliziter Konfigurationsgrenze:
   Limits ins Modul (eingefroren übergeben), Diagnose-Callback injizieren.
   Siehe Falle 2. `zipDataStart()` merkt sich außerdem `entry.dataStart` am
   geteilten Objekt, `zipExtract()` verändert ein geteiltes Budget.

---

## AP-E — Audio-Lebenszyklus (zuletzt, nur falls die Tests es rechtfertigen)

**Nicht mit einem einzelnen Zustands-Enum anfangen.** Der Lebenszyklus hat
mehrere *orthogonale* Achsen, die ein Enum plattdrücken würde:

- `hdTransitionGeneration` — Abbruch-/Versions-Token für überholte RPCs
- `hdNodePromise` — serialisiert Knotenerzeugung, an Kontext-Identität gebunden
- `audioRebuildInFlight` — serialisiert den Graph-Neuaufbau
- `recStarting` / `recMediaRecorder` — Recorder-Domäne
- `levelCtx` / `levelCtxOwned` — Besitz des Messkontexts
- `audioReturnedFromBackgroundAt` — zeitliches Fenster nach Rückkehr

Erst die Invarianten aus AP-B als Transitionstabelle aufschreiben. **Danach**
entscheiden, ob ein Statechart das Modell wirklich vereinfacht oder nur die
vorhandenen Flags umbenennt. Wenn Zweifel bleiben: Invarianten plus
Besitz-Token behalten, das ist der kleinere Eingriff.

---

## Offene Punkte außerhalb der Reihenfolge

**`playlistAdvance()` ist in sich uneinheitlich.** Zwei frühe Rückkehrpfade
(Zufallsmodus trifft denselben Song ~Z. 15971; nur ein abspielbarer Titel
~Z. 15992) rufen `audioSeek(0)` + `audioPlay()` und kehren zurück — **ohne**
`audioSetRate(1)`, also ohne `hdApplyTransition`. Dort bleibt 0,6× und HD
aktiv. Ob das Tempo beim „nächsten Lied" zurückspringt, hängt damit davon ab,
ob der nächste Titel ein *anderer* ist. Beides ist vertretbar — aber es sollte
bewusst entschieden statt dem Zufall überlassen werden. **Rückfrage an den
Betreiber, kein stiller Fix.**

**AP-06 Restarbeit — blockiert.** `LICENSE-lamejs.txt` ist ein FAQ-Auszug, kein
LGPL-3.0/GPL-3.0-Volltext. gnu.org ist über den Sitzungs-Proxy gesperrt
(CONNECT → 403, sitzungsweite Policy). Braucht Netzzugriff aus einer anderen
Umgebung oder die beiden Textdateien vom Betreiber.

**AP-07 (CI) / AP-08 (CSP-Ausbau)** aus `AUDIT-FIXPLAN.md` bleiben offen.
AP-C nimmt den CSP-Kern vorweg; AP-08 ist danach nur noch Verschärfung.

---

## AP-F — Gerätecheckliste (Freigabe-Nachweis, nicht optional)

Fakes können das hier grundsätzlich nicht abdecken. Ergebnisse als
Release-Nachweis aufheben.

- Standard 1,0× und 0,6×; HD 0,6× → 1,0× → HD, mehrfach
- Suchen, A-B-Loop, Titelwechsel, HD-Regler während der Wiedergabe
- Hintergrund kurz und lang, dann zurück
- Sperrbildschirm, Anruf, andere Audio-App, Bluetooth-Wechsel
- REC bei laufender Wiedergabe (Pegel, Originaltrack-Vorschau)
- **Echtzeitanzeige ablesen** — das ist das Instrument, das den 70-%-Fehler
  gefunden hat. 100 % = sauber; 82–85 % oder ~70 % = ein Prozessor lebt weiter.
- mindestens ein Durchgang auf iOS Safari (AudioContext-Besitz und
  Unterbrechungsverhalten sind dort eine eigene Randbedingung)

---

## Prüf-Rezept (funktioniert, bitte so verwenden)

```bash
# Server (Hintergrund, überlebt zwischen Tool-Aufrufen)
npx --yes http-server -p 8899 -c-1 . &

# Syntaxcheck des Inline-Skripts
node -e "const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync('index.html','utf8');
[...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
 .forEach((m,i)=>{try{new vm.Script(m[1])}catch(e){console.error('SYNTAX',i,e.message);process.exitCode=1}});
console.log('syntax ok')"

# Selbsttests im echten Browser (Playwright liegt global)
NODE_PATH=/opt/node22/lib/node_modules node run_selftests.js
```

Playwright-Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
Start mit `--no-sandbox`.

**Bei jedem Paket:** `SW_VERSION` erhöhen, Selbsttests grün, und jeden neuen
Test einmal gegen die kaputte Version gegenprüfen (Falle 3).
