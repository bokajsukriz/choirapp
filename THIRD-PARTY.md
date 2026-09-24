# Third-Party-Komponenten

| Feld | Wert |
|---|---|
| Komponente | lamejs |
| Version | 1.2.1 |
| Datei | `lame.min.js` |
| SHA-256 (ausgeliefert) | `121adb027f464dea02200e180ca9a3476c8aea2434286edc84e9bbd8015b61fc` — die Datei in diesem Repository (Upstream-Datei plus vorangestellter Kopfkommentar) |
| SHA-256 (Upstream) | `15d285e2587b3bdbfd18a68de6ce07cc074f7480a82c3815da2dc1c348ec6df4` — `lame.min.js` aus dem npm-Tarball `lamejs@1.2.1`; ohne den Kopfkommentar byte-identisch |
| Quelltext (LGPL) | `third-party/lamejs-1.2.1/lame.all.js` — unminifizierte Fassung aus demselben npm-Tarball (SHA-256 `026bd88846040f357a937cd85821a48492a362eff0812cda734f23fca55fea3b`), liegt im Repository, damit der Quelltext unabhängig vom Upstream-Repository verfügbar bleibt |
| Quelle | https://github.com/zhuker/lamejs — npm `lamejs@1.2.1` |
| Lizenz | LGPL-3.0 (Volltext siehe `LICENSE-lamejs-LGPL-3.0.txt`; die zugrundeliegende GPL-3.0 siehe `LICENSE-lamejs-GPL-3.0.txt`; `LICENSE-lamejs.txt` enthält weiterhin nur den LAME-FAQ-Auszug zur Einordnung) |
| Verändert | nein (nur ein vorangestellter Kopfkommentar mit Herkunft und Lizenz) |
| Verwendung | MP3-Export der eigenen Aufnahmen, per `<script>` nachgeladen |

Die SHA-256-Werte wurden mit `sha256sum` nachgerechnet, nicht übernommen —
der ausgelieferte gegen die Datei in diesem Repository, der Upstream-Wert
und der Quelltext-Wert gegen den frisch gezogenen npm-Tarball.

| Feld | Wert |
|---|---|
| Komponente | signalsmith-stretch |
| Version | 1.3.2 |
| Datei | `signalsmith-stretch.js` |
| SHA-256 (Original) | `fe0e23b6bb5dbffb231a91e7dc39f9d2a7d10c7f793fb0237d819ca748f7f778` — Originaldatei aus dem npm-Tarball, **vor** der lokalen Änderung |
| SHA-256 (ausgeliefert) | `252cd583024331f7df0a6275961d499a1dceffc5b47d780759d78888f7453579` — die Datei in diesem Repository, **mit** den sechs Patches unten und dem vorangestellten MIT-Lizenzhinweis |
| Quelle | https://signalsmith-audio.co.uk/code/stretch/ — npm `signalsmith-stretch@1.3.2` |
| Lizenz | MIT (Volltext siehe `LICENSE-signalsmith-stretch.txt`) |
| Verändert | **ja** — sechs lokale Patches, siehe Kommentarblock am Kopf von `signalsmith-stretch.js`: ein `reset`-Fernmethode für den AudioWorklet-Prozessor (setzt nur den WASM-Zustand zurück, nicht die Zeitabbildung), `this.configure()` statt `configure()` im Kanalzahl-Zweig von `process()` (Upstream-Bug), Zwischenspeichern der Blob-URL des Worklet-Moduls (`createNode.moduleUrl`) statt bei jedem `AudioContext` neu zu erzeugen, Timeout/Reject sowie `processorerror`/`messageerror`-Behandlung für die Promise-RPCs, eine `terminate`-Fernmethode, die `process()` `false` liefern lässt (disconnect() allein hält den Prozessor auf manchen Geräten nicht zuverlässig davon ab, weiterzurechnen), und `requestMap['ready']` als reguläres `{resolve, reject}`-Objekt statt einer nackten Funktion, damit ein Fehler vor der ready-Nachricht (processorerror/messageerror) die Erzeugung sauber ablehnt und den bis dahin unerreichbaren Knoten selbst mit abklemmt, statt die Promise für immer offen zu lassen. Bei einem Update der Datei müssen diese sechs Stellen erneut angewandt werden. |
| Verwendung | Verlangsamung im Modus „HD": Zeitdehnung/Tonhöhenkorrektur als WASM in einem AudioWorklet, per `<script>` nachgeladen |

Die Datei enthält das WebAssembly-Modul (~64 KB) als
`data:application/octet-stream;base64,`-URI in sich selbst — sie lädt zur
Laufzeit **nichts** nach und funktioniert deshalb auch offline aus dem
Shell-Cache. Beide SHA-256-Werte wurden unabhängig mit `sha256sum` nachgerechnet,
nicht aus einem früheren Bericht übernommen — der Original-Hash gegen den
npm-Tarball, der ausgelieferte Hash gegen die Datei in diesem Repository.

**Reproduzierbares Rezept:** gepinnte Upstream-Version 1.3.2 (Original-Hash
oben) plus die sechs im Kopfkommentar von `signalsmith-stretch.js`
beschriebenen Patches ergeben deterministisch die eingecheckte Datei
(ausgelieferter Hash oben). Der Kommentarblock selbst ist damit das Rezept —
er beschreibt jede Stelle konkret genug, um sie nach einem `npm update`
erneut anzuwenden; diese Tabelle verdoppelt die Patchliste bewusst nicht noch
ein drittes Mal.

Der vollständige, unveränderte Text der LGPL-3.0 und der GPL-3.0 (auf der sie
aufbaut) liegt inzwischen als `LICENSE-lamejs-LGPL-3.0.txt` bzw.
`LICENSE-lamejs-GPL-3.0.txt` bei, direkt von `https://www.gnu.org/licenses/lgpl-3.0.txt`
bzw. `.../gpl-3.0.txt` bezogen. `LICENSE-lamejs.txt` bleibt unverändert als
kurzer Auszug aus der LAME-FAQ zur Einordnung erhalten und ersetzt die
Volltexte nicht. `lame.min.js` selbst wurde dabei nicht angefasst.
