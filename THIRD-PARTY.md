# Third-Party-Komponenten

| Feld | Wert |
|---|---|
| Komponente | lamejs |
| Version | 1.2.1 |
| Datei | `lame.min.js` |
| SHA-256 | `194ee71034bb400f05648d2f7cd552f53edb43b5a106a8c9d809bee3d6275ea5` |
| Quelle | https://github.com/zhuker/lamejs — npm `lamejs@1.2.1` |
| Lizenz | LGPL-3.0 (Volltext siehe `LICENSE-lamejs.txt`) |
| Verändert | nein |
| Verwendung | MP3-Export der eigenen Aufnahmen, per `<script>` nachgeladen |

Der SHA-256-Wert wurde mit `sha256sum lame.min.js` gegen die Datei in diesem
Repository nachgerechnet, nicht übernommen.

| Feld | Wert |
|---|---|
| Komponente | signalsmith-stretch |
| Version | 1.3.2 |
| Datei | `signalsmith-stretch.js` |
| SHA-256 | `fe0e23b6bb5dbffb231a91e7dc39f9d2a7d10c7f793fb0237d819ca748f7f778` (Originaldatei aus dem npm-Tarball, vor der lokalen Änderung) |
| Quelle | https://signalsmith-audio.co.uk/code/stretch/ — npm `signalsmith-stretch@1.3.2` |
| Lizenz | MIT (Volltext siehe `LICENSE-signalsmith-stretch.txt`) |
| Verändert | **ja** — fünf lokale Patches, siehe Kommentarblock am Kopf von `signalsmith-stretch.js`: ein `reset`-Fernmethode für den AudioWorklet-Prozessor (setzt nur den WASM-Zustand zurück, nicht die Zeitabbildung), `this.configure()` statt `configure()` im Kanalzahl-Zweig von `process()` (Upstream-Bug), Zwischenspeichern der Blob-URL des Worklet-Moduls (`createNode.moduleUrl`) statt bei jedem `AudioContext` neu zu erzeugen, Timeout/Reject sowie `processorerror`/`messageerror`-Behandlung für die Promise-RPCs, und eine `terminate`-Fernmethode, die `process()` `false` liefern lässt (disconnect() allein hält den Prozessor auf manchen Geräten nicht zuverlässig davon ab, weiterzurechnen). Bei einem Update der Datei müssen diese fünf Stellen erneut angewandt werden. |
| Verwendung | Verlangsamung im Modus „HD": Zeitdehnung/Tonhöhenkorrektur als WASM in einem AudioWorklet, per `<script>` nachgeladen |

Die Datei enthält das WebAssembly-Modul (~64 KB) als
`data:application/octet-stream;base64,`-URI in sich selbst — sie lädt zur
Laufzeit **nichts** nach und funktioniert deshalb auch offline aus dem
Shell-Cache. Der SHA-256-Wert stammt aus dem npm-Tarball und wurde gegen
die Datei in diesem Repository nachgerechnet.


Der vollständige Text der LGPL-3.0 (und der GPL-3.0, auf der sie aufbaut)
konnte in dieser Umgebung nicht von gnu.org abgerufen werden (Netzzugriff
durch die Ausführungsumgebung gesperrt). `LICENSE-lamejs.txt` enthält bislang
nur einen Auszug aus der LAME-FAQ, nicht den vollständigen Lizenztext. Wer
diese Datei pflegt, sollte `LICENSE-lamejs-LGPL-3.0.txt` und
`LICENSE-lamejs-GPL-3.0.txt` mit den Originaltexten von
https://www.gnu.org/licenses/lgpl-3.0.txt bzw. `.../gpl-3.0.txt` ergänzen.
