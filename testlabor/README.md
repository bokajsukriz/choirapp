# Testlabor

Messplatz für die Verlangsamung — **kein App-Code.** Wird als Artifact
veröffentlicht (ein Link aufs Telefon), nicht ausgeliefert, nicht vom
Service Worker zwischengespeichert, nicht in `index.html` eingebunden.

    python3 testlabor/bauen.py

baut `pruefstand.html` aus `pruefstand.kopf.html` (Markup und Stile),
der frisch geholten `signalsmith-stretch`-Bibliothek und
`pruefstand.fuss.html` (Messlogik). Das Ergebnis wird mit dem
`Artifact`-Werkzeug veröffentlicht.

Die Bibliothek liegt bewusst nicht im Repo: sie wird beim Bauen geholt,
und `bauen.py` gibt Version, Lizenz und SHA-256 aus — die gehören in die
Messnotiz, damit später nachvollziehbar ist, welche Fassung gemessen
wurde.

Arbeitsanweisung: `../SLOWPLAY-TESTLABOR-PLAN.md`.
