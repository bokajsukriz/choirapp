#!/usr/bin/env python3
"""Baut die Messplatz-Seite: Kopf + Bibliothek + generierte Bausteine + Fuss.

Die signalsmith-stretch-Bibliothek wird bewusst NICHT im Repo abgelegt — sie
wird beim Bauen geholt und woertlich eingebettet. Das Artifact darf zur
Laufzeit nichts nachladen (kein fetch zu irgendeinem Host), und das WASM
steckt in der Bibliothek ohnehin schon als data:-URI.

Der js-mono-Motor (die sechs Bausteine hqPrincipalAngle, hqAnalysisHop,
hqPitchRatio, HqFft, HqRealFft, HqPitchShifter) wird NICHT von Hand
abgeschrieben, sondern aus index.html herausgeschnitten (index.html wird nur
GELESEN, nie verändert) — so misst der Messplatz garantiert den
ausgelieferten Stand, nicht eine Kopie, die auseinanderlaufen kann.

    python3 testlabor/bauen.py            # holt die Bibliothek, baut pruefstand.html
    python3 testlabor/bauen.py --lib X.js # nimmt eine schon geholte Datei
"""
import argparse, hashlib, io, json, pathlib, sys, tarfile, urllib.request

HIER = pathlib.Path(__file__).parent
REPO = HIER.parent
PAKET = "signalsmith-stretch"

# Gemeinsames Testsignal (Vierklang mit leichtem Vibrato, wie in der
# Vorprüfung) — als Quelltext einmal hier definiert und in Hauptseite,
# Worker und Overload-Worklet gleichermaßen eingebettet, statt es an drei
# Stellen von Hand zu wiederholen.
TEST_SIGNAL_JS = """
function testSignal(sr, seconds) {
  const n = Math.round(sr * seconds);
  const out = new Float32Array(n);
  const partials = [220, 277.18, 329.63, 440];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t / 0.05) * Math.min(1, (seconds - t) / 0.2);
    let v = 0;
    for (let p = 0; p < partials.length; p++) {
      const vib = 1 + 0.003 * Math.sin(2 * Math.PI * (4.5 + p * 0.3) * t);
      v += Math.sin(2 * Math.PI * partials[p] * vib * t) / partials.length;
    }
    out[i] = v * env * 0.7;
  }
  return out;
}
""".strip()

# Treibt beide Engines im Worker: js-mono direkt (dieselben sechs Bausteine,
# die auch im Worklet der App laufen), wasm über die rohe Emscripten-Fabrik
# statt über die AudioWorkletNode-Fassade — die gibt es in einem gewöhnlichen
# Worker nicht, ihre Kernfunktionen (_process/_seek/...) sind aber
# Environment-unabhängig (siehe bau_worker_quelle: der Fang-Zeile unten).
WORKER_DRIVER_JS = """
'use strict';

function warmup(eng, blockSize, maxQuanta, maxMs) {
  const t0 = performance.now();
  let i = 0;
  // Zeitgedeckelt statt reiner Quantenzahl: eine feste Quantenzahl könnte auf
  // einem langsamen Gerät das 30-Sekunden-Ziel sprengen. 2000 Quanten sind
  // die Vorgabe als Obergrenze, 800 ms die harte Deckung.
  while (i < maxQuanta && (performance.now() - t0) < maxMs) {
    eng.processBlock(128);
    i++;
  }
  return i;
}

function makeJsEngine(rate, channels) {
  const src = testSignal(48000, 4);
  const shifters = [];
  for (let c = 0; c < channels; c++) {
    const s = new HqPitchShifter();
    s.setShift(1 / rate);
    shifters.push(s);
  }
  const inBlocks = shifters.map(() => new Float32Array(128));
  const outBlocks = shifters.map(() => new Float32Array(128));
  let pos = 0;
  return {
    processBlock() {
      for (let i = 0; i < 128; i++) {
        const v = src[(pos + i) % src.length];
        for (let c = 0; c < channels; c++) inBlocks[c][i] = v;
      }
      pos = (pos + 128) % src.length;
      // Kein Frame-Budget (maxFrames=undefined): roher Durchsatz, siehe Plan
      // Abschnitt 2.2 — dieselbe Regel gilt sinngemäß auch für den
      // Worker-Test, der keine Quantengrenze zu respektieren hat.
      for (let c = 0; c < channels; c++) shifters[c].process(inBlocks[c], outBlocks[c], undefined);
    },
  };
}

async function makeWasmEngine(rate, sampleRate) {
  if (typeof self.__stretchRawModule !== 'function') {
    throw new Error('Rohmodul nicht eingebettet — __stretchRawModule fehlt');
  }
  const wasmModule = await self.__stretchRawModule();
  wasmModule._main();
  const channels = 1;
  wasmModule._presetDefault(channels, sampleRate);
  const inputLatency = wasmModule._inputLatency();
  const outputLatency = wasmModule._outputLatency();
  const bufferLength = inputLatency + outputLatency;
  if (!(bufferLength > 0)) throw new Error('unplausible bufferLength: ' + bufferLength);
  const lengthBytes = bufferLength * 4;
  const bufferPointer = wasmModule._setBuffers(channels, bufferLength);
  const bufIn = bufferPointer;
  // Reine Zeitdehnung, keine Tonhöhenkorrektur nötig: ein Phasenvocoder
  // ändert die Tonhöhe bei reiner Zeitdehnung nicht (anders als Resampling)
  // — semitones=0 ist hier richtig, siehe Plan Abschnitt 4 (Pufferbetrieb),
  // genau das Muster, das die Vorprüfung schon hörbar geprüft hat.
  wasmModule._setTransposeSemitones(0, 0);
  wasmModule._setFormantSemitones(0, false);
  wasmModule._setFormantBase(0);
  const src = testSignal(sampleRate, 4);
  let readPos = 0;
  function mem() {
    return wasmModule.exports ? wasmModule.exports.memory.buffer : wasmModule.HEAP8.buffer;
  }
  return {
    processBlock(blockSize) {
      readPos += blockSize * rate;
      const startIdx = Math.round(readPos) - bufferLength;
      const view = new Float32Array(mem(), bufIn, bufferLength);
      for (let i = 0; i < bufferLength; i++) {
        const idx = startIdx + i;
        const m = ((idx % src.length) + src.length) % src.length;
        view[i] = src[m];
      }
      wasmModule._seek(bufferLength, rate);
      wasmModule._process(0, blockSize);
    },
  };
}

self.onmessage = async (e) => {
  const m = e.data;
  if (!m || m.cmd !== 'bench') return;
  const { id, family, rate, channels, sampleRate, warmupMaxQuanta, warmupMaxMs, durationMs } = m;
  try {
    const eng = family === 'wasm' ? await makeWasmEngine(rate, sampleRate) : makeJsEngine(rate, channels || 1);
    const warmed = warmup(eng, 128, warmupMaxQuanta, warmupMaxMs);
    const t0 = performance.now();
    let blocks = 0;
    let elapsed = 0;
    while (elapsed < durationMs) {
      for (let i = 0; i < 16; i++) { eng.processBlock(128); blocks++; }
      elapsed = performance.now() - t0;
    }
    const audioSeconds = (blocks * 128) / sampleRate;
    self.postMessage({ id, ok: true, throughput: audioSeconds / (elapsed / 1000), blocks, elapsedMs: elapsed, warmed });
  } catch (err) {
    self.postMessage({ id, ok: false, error: (err && err.name || 'Error') + ': ' + (err && err.message || String(err)) });
  }
};
""".strip()

# Eigener AudioWorkletProcessor für Abschnitt 2.2: K unabhängige js-mono-
# Ströme je Quantum, Frame-Budget abgeschaltet — absichtlich überlastet,
# damit die Deckung bei 100% Echtzeit durchbricht (die reguläre
# Echtzeitmessung kann das nicht, siehe Plan Abschnitt 2.2).
OVERLOAD_PROCESSOR_JS = """
'use strict';

class HqOverloadProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const po = (options && options.processorOptions) || {};
    this.channels = Math.max(1, po.channels || 1);
    const k = Math.max(1, po.k || 1);
    this.src = testSignal(sampleRate, 4);
    this.pos = 0;
    this.shifters = [];
    for (let i = 0; i < k * this.channels; i++) {
      const s = new HqPitchShifter();
      s.setShift(po.shift || 1);
      this.shifters.push(s);
    }
    this.inBlock = new Float32Array(128);
    this.scratch = new Float32Array(128);
    this.active = true;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'stop') this.active = false;
    };
  }

  process(inputs, outputs) {
    if (!this.active) return true;
    for (let i = 0; i < 128; i++) this.inBlock[i] = this.src[(this.pos + i) % this.src.length];
    this.pos = (this.pos + 128) % this.src.length;
    for (let s = 0; s < this.shifters.length; s++) {
      this.shifters[s].process(this.inBlock, this.scratch, undefined);
    }
    // Stille Ausgabe: der Zweck ist Last erzeugen, kein hörbares Signal —
    // der Knoten muss aber verbunden bleiben, sonst zieht ihn der Graph
    // nicht mit (siehe Hauptseite: an einen stummgeschalteten Gain-Knoten
    // gehängt).
    const out = outputs[0];
    if (out) for (const ch of out) ch.fill(0);
    return true;
  }
}
registerProcessor('hq-overload', HqOverloadProcessor);
""".strip()


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


def hq_engine_quelle() -> str:
    """Schneidet die sechs testbaren Bausteine unverändert aus index.html.

    index.html wird dabei nur GELESEN. Die Grenzen sind zwei eindeutige
    Funktionssignaturen; schlägt eine der beiden Suchen fehl, hat sich die
    App-Struktur geändert und der Messplatz misst sonst etwas anderes als
    den ausgelieferten Stand — dann lieber laut abbrechen.
    """
    text = (REPO / "index.html").read_text()
    start_marker = "function hqPrincipalAngle(x) {"
    end_marker = "function hqBuildWorkletSource() {"
    i0 = text.find(start_marker)
    if i0 < 0:
        raise RuntimeError(f"Anfang der HQ-Bausteine nicht gefunden ({start_marker!r}) — index.html geändert?")
    i1 = text.find(end_marker, i0)
    if i1 < 0:
        raise RuntimeError(f"Ende der HQ-Bausteine nicht gefunden ({end_marker!r}) — index.html geändert?")
    quelle = text[i0:i1].rstrip()
    for name in ("hqAnalysisHop", "hqPitchRatio", "class HqFft", "class HqRealFft", "class HqPitchShifter"):
        if name not in quelle:
            raise RuntimeError(f"Baustein {name!r} fehlt im ausgeschnittenen Bereich — index.html geändert?")
    return quelle


def bau_worker_quelle(engine_quelle: str, stretch_quelle: str) -> str:
    """Fügt vor der Fassaden-Umschaltung der Bibliothek eine Abzweigung ein,
    die die rohe Emscripten-Fabrik in `self.__stretchRawModule` sichert.

    Die Bibliothek überschreibt ihre eigene globale `SignalsmithStretch`-
    Variable am Dateiende mit einer Fassade (Knoten-Erzeugung auf der
    Hauptseite, `registerProcessor` im Worklet) — in einem gewöhnlichen
    Worker bliebe dann kein Zugriff mehr auf die Fabrik selbst. Der Anker
    ist Text, keine Zeilennummer, und wird geprüft, statt stumm zu
    verschwinden, falls die Bibliothek ihre Struktur ändert.
    """
    anchor = "SignalsmithStretch = ((Module, audioNodeKey) => {"
    if anchor not in stretch_quelle:
        raise RuntimeError("Anker für die Rohmodul-Abzweigung nicht gefunden — Bibliotheksversion geändert?")
    patched = stretch_quelle.replace(
        anchor,
        "self.__stretchRawModule = SignalsmithStretch;\n" + anchor,
        1,
    )
    return "\n\n".join(["'use strict';", TEST_SIGNAL_JS, engine_quelle, patched, WORKER_DRIVER_JS])


def bau_overload_worklet_quelle(engine_quelle: str) -> str:
    return "\n\n".join(["'use strict';", TEST_SIGNAL_JS, engine_quelle, OVERLOAD_PROCESSOR_JS])


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

    engine_quelle = hq_engine_quelle()
    # Backtick-Falle (siehe Handoff §9 „Trap"): diese Kommentare zitieren
    # Variablennamen in Backticks. Deshalb NIE in ein Template-Literal
    # einbetten — json.dumps() unten maskiert das bedingungslos richtig,
    # unabhängig vom Inhalt.
    worker_quelle = bau_worker_quelle(engine_quelle, quelle)
    worklet_quelle = bau_overload_worklet_quelle(engine_quelle)

    daten = {
        "libVersion": version,
        "libLicense": lizenz,
        "libSha256": hashlib.sha256(quelle.encode()).hexdigest(),
        "engineSha256": hashlib.sha256(engine_quelle.encode()).hexdigest(),
        "workerSrc": worker_quelle,
        "overloadWorkletSrc": worklet_quelle,
    }

    kopf = (HIER / "pruefstand.kopf.html").read_text()
    fuss = (HIER / "pruefstand.fuss.html").read_text()
    seite = (
        kopf
        + "\n<script>\n" + quelle + "\n</script>\n"
        + "\n<script>\n" + TEST_SIGNAL_JS + "\n</script>\n"
        + "\n<script>\nconst MESSPLATZ = " + json.dumps(daten) + ";\n</script>\n"
        + fuss
    )
    pathlib.Path(args.out).write_text(seite)

    print(f"{PAKET} {version} ({lizenz})")
    print(f"  sha256 (Bibliothek)  {daten['libSha256']}")
    print(f"  sha256 (js-Motor)    {daten['engineSha256']}")
    print(f"  -> {args.out}  ({len(seite)} Bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
