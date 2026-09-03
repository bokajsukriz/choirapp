#!/usr/bin/env python3
"""Baut die Messplatz-Seite: Kopf + signalsmith-stretch + Fuss.

Die Bibliothek wird bewusst NICHT im Repo abgelegt — sie wird beim Bauen
geholt und woertlich ins HTML eingebettet. Das Artifact darf zur Laufzeit
nichts nachladen (kein fetch zu irgendeinem Host), und das WASM steckt in
der Bibliothek ohnehin schon als data:-URI.

    python3 testlabor/bauen.py            # holt die Bibliothek, baut pruefstand.html
    python3 testlabor/bauen.py --lib X.js # nimmt eine schon geholte Datei
"""
import argparse, hashlib, io, json, pathlib, sys, tarfile, urllib.request

HIER = pathlib.Path(__file__).parent
PAKET = "signalsmith-stretch"


def hole_bibliothek() -> tuple[str, str, str]:
    with urllib.request.urlopen(f"https://registry.npmjs.org/{PAKET}") as r:
        meta = json.load(r)
    version = meta["dist-tags"]["latest"]
    eintrag = meta["versions"][version]
    with urllib.request.urlopen(eintrag["dist"]["tarball"]) as r:
        roh = r.read()
    with tarfile.open(fileobj=io.BytesIO(roh)) as tar:
        quelle = tar.extractfile("package/SignalsmithStretch.js").read().decode()
    return quelle, version, eintrag.get("license", "?")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--lib")
    p.add_argument("--out", default=str(HIER / "pruefstand.html"))
    args = p.parse_args()

    if args.lib:
        quelle, version, lizenz = pathlib.Path(args.lib).read_text(), "lokal", "?"
    else:
        quelle, version, lizenz = hole_bibliothek()

    # Ein </script> in der Bibliothek wuerde das umschliessende <script> im
    # HTML vorzeitig schliessen. Geprueft bei 1.3.2: kommt nicht vor.
    if "</script>" in quelle:
        print("FEHLER: Bibliothek enthaelt </script> — muss maskiert werden.", file=sys.stderr)
        return 1

    kopf = (HIER / "pruefstand.kopf.html").read_text()
    fuss = (HIER / "pruefstand.fuss.html").read_text()
    seite = kopf + "\n<script>\n" + quelle + "\n</script>\n" + fuss
    pathlib.Path(args.out).write_text(seite)

    print(f"{PAKET} {version} ({lizenz})")
    print(f"  sha256 {hashlib.sha256(quelle.encode()).hexdigest()}")
    print(f"  -> {args.out}  ({len(seite)} Bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
