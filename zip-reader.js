'use strict';

/* ==========================================================================
   ZIP — eigener Leser, häppchenweise über File.slice()

   Die Datei wird NIE komplett in den Speicher geladen: bei 500 MB würde das
   Handy abstürzen. Gelesen wird zuerst nur das Inhaltsverzeichnis am Dateiende
   (wenige Kilobyte), und erst nach der Auswahl die tatsächlich gewünschten
   Einträge.

   AP-D (ARCHITEKTUR-PLAN.md), zuletzt und mit ausdrücklicher
   Konfigurationsgrenze (Falle 2 dort: die Grenzwerte ZIP_MAX_* standen in
   app.js rund 4.100 Zeilen vom Parser entfernt — Konstanten sind keine
   Aufrufe, ein naiver Blick auf „ausgehende Aufrufe" hätte diese Kopplung
   übersehen). Deshalb hier zwei bewusste Entscheidungen:

   - Die Grenzwerte kommen nicht als Modul-Konstanten, sondern werden über
     createZipReader(limits, onDiagnostic) hereingereicht und eingefroren.
     Nur zipReadDirectory()/zipExtract() brauchen sie wirklich (die einzigen
     Stellen, die tatsächlich gegen ein Limit prüfen) — der Rest bleibt
     limit-unabhängig und direkt exportiert.
   - dlog() wird nicht importiert, sondern als onDiagnostic(event, data)
     hereingereicht — das Modul kennt damit keinen Namen aus app.js, nur eine
     Funktionsform. app.js kann dlog selbst als Callback übergeben.

   Geteilte Mutables, bewusst nicht wegabstrahiert (siehe ARCHITEKTUR-PLAN.md):
   zipDataStart() merkt sich entry.dataStart direkt am übergebenen Eintrag
   (Memoisierung, ein Eintrag kann mehrfach anfragt werden); zipExtract()
   erhöht ein von der Aufruferseite mitgegebenes budget.used über mehrere
   Aufrufe hinweg (Summenbudget über ein ganzes Archiv). Beides funktioniert
   nur, weil dieselben Objekte über den Modul-Rand hinweg per Referenz
   weitergereicht werden, nicht kopiert — wer sie serialisiert oder klont,
   bricht die Kopplung.
   ========================================================================== */

const SIG_EOCD    = 0x06054b50;  // End of Central Directory
const SIG_ZIP64_L = 0x07064b50;  // ZIP64 End of Central Directory Locator
const SIG_ZIP64_E = 0x06064b50;  // ZIP64 End of Central Directory Record
const SIG_CEN     = 0x02014b50;  // Central Directory Header
const SIG_LOC     = 0x04034b50;  // Local File Header

/** Zeichentabelle CP437, obere Hälfte — Fallback für Dateinamen ohne UTF-8-Flag. */
const CP437_HIGH =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒ' +
  'áíóúñÑªº¿⌐¬½¼¡«»' +
  '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐' +
  '└┴┬├─┼╞╟╚╔╩╦╠═╬╧' +
  '╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
  'αßΓπΣσµτΦΘΩδ∞φε∩' +
  '≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

function decodeCP437(bytes) {
  let out = '';
  for (const b of bytes) out += b < 0x80 ? String.fromCharCode(b) : CP437_HIGH[b - 0x80];
  return out;
}

const utf8Strict = new TextDecoder('utf-8', { fatal: true });
const utf8Loose  = new TextDecoder('utf-8');

function decodeEntryName(bytes, flags) {
  // Bit 11 des Flag-Feldes bedeutet: Name ist UTF-8.
  if (flags & 0x800) return utf8Loose.decode(bytes);
  try {
    return utf8Strict.decode(bytes);   // viele Packer setzen das Flag nicht, sind aber UTF-8
  } catch {
    return decodeCP437(bytes);
  }
}

/** Bytes menschenlesbar, deutsche Schreibweise mit Komma. Eigene Kopie statt
 *  eines Imports zurück nach app.js (dort dieselbe Funktion, allgemein für
 *  Speicherplatz-Anzeigen) — dieses Modul bleibt ein Blatt. */
function fmtBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '–';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  const digits = v < 10 && i > 0 ? 1 : 0;
  return `${v.toFixed(digits).replace('.', ',')} ${units[i]}`;
}

/**
 * Liest einen Blob als ArrayBuffer, mit ein bis zwei Wiederholungen bei
 * kurzen Ausfällen.
 *
 * Der Zugriff auf eine über die Storage Access Framework ausgewählte Datei
 * läuft über einen Content-Provider — bei einem mehrere GB großen Archiv
 * dauert das Lesen entsprechend lange, und genau dabei bricht die Verbindung
 * auf manchen Android-Browsern (beobachtet mit Firefox) gelegentlich kurz ab,
 * etwa wenn der Bildschirm zwischendurch ausgeht. Ein erneuter Versuch nach
 * kurzer Pause überbrückt das meist, ohne den ganzen Import abzubrechen.
 *
 * Eigene Kopie statt eines Imports zurück nach app.js (dort dieselbe
 * Funktion, allgemein für importierte Dateien) — dieses Modul bleibt ein
 * Blatt.
 */
async function readArrayBuffer(blob, attempts = 3) {
  for (let i = 0; ; i++) {
    try {
      return await blob.arrayBuffer();
    } catch (err) {
      if (i >= attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
}

async function sliceView(file, start, end) {
  const buf = await readArrayBuffer(file.slice(Math.max(0, start), Math.min(end, file.size)));
  return new DataView(buf);
}

/** Sucht eine 4-Byte-Signatur von hinten nach vorn. */
function findSigBackwards(view, sig) {
  for (let i = view.byteLength - 4; i >= 0; i--) {
    if (view.getUint32(i, true) === sig) return i;
  }
  return -1;
}

/** `len` Bytes ab `offset` als Hex-String — reine Struktur, kein Inhalt. */
function hexBytes(view, offset, len) {
  const start = Math.max(0, offset);
  const end = Math.min(view.byteLength, start + len);
  let out = '';
  for (let i = start; i < end; i++) out += view.getUint8(i).toString(16).padStart(2, '0');
  return out;
}

/**
 * Zählt, wie oft die Bytes „P" „K" (der Anfang jeder ZIP-Signatur) irgendwo
 * im Bereich vorkommen, plus die erste/letzte Fundstelle. Taucht „PK" gar
 * nicht auf, liegen an dieser Stelle mit hoher Sicherheit keine ZIP-Reste
 * (egal welcher Art) — das unterscheidet „komplett falsche Stelle gelesen"
 * von „an ungefähr der richtigen Stelle, nur der genaue Datensatz fehlt".
 */
function countPkMarkers(view) {
  let count = 0, first = -1, last = -1;
  for (let i = 0; i < view.byteLength - 1; i++) {
    if (view.getUint8(i) === 0x50 && view.getUint8(i + 1) === 0x4b) {
      if (first < 0) first = i;
      last = i;
      count++;
    }
  }
  return { count, first, last };
}

function u64(view, offset) {
  const value = view.getBigUint64(offset, true);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ZipError('Diese ZIP-Datei ist zu groß.');
  }
  return Number(value);
}

class ZipError extends Error {}

/**
 * Nachricht für einen gescheiterten ZIP-Lesevorgang.
 *
 * Ein NotReadableError/SecurityError deutet auf einen abgebrochenen
 * Content-Provider-Zugriff hin, nicht auf eine beschädigte Datei — das
 * betrifft vor allem sehr große Archive, wenn der Bildschirm währenddessen
 * ausgeht. „Erneut aus Dropbox herunterladen" wäre dort der falsche Rat.
 */
export function zipReadFailureMessage(err) {
  if (err instanceof ZipError) return err.message;
  if (err?.name === 'NotReadableError' || err?.name === 'SecurityError') {
    return 'Die Datei ließ sich nicht zu Ende lesen. Bei sehr großen Archiven kann '
      + 'das passieren, wenn der Bildschirm währenddessen ausgeht — Bildschirm '
      + 'eingeschaltet lassen und noch einmal versuchen.';
  }
  return 'Diese Datei konnte nicht gelesen werden. Bitte den Ordner erneut aus Dropbox herunterladen.';
}

/** macOS legt Metadaten neben die Nutzdaten — die will niemand importieren. */
export function isJunkPath(path) {
  if (path.startsWith('__MACOSX/')) return true;
  const base = path.slice(path.lastIndexOf('/') + 1);
  return base.startsWith('._') || base.startsWith('.');
}

export const canInflate = typeof DecompressionStream === 'function';

/**
 * Wo beginnen die Nutzdaten eines Eintrags?
 *
 * Der lokale Header hat eigene Längenangaben — die aus dem Inhaltsverzeichnis
 * dürfen hier nicht verwendet werden, sie unterscheiden sich häufig. Das
 * Ergebnis wird am Eintrag gemerkt: jeder dieser 30-Byte-Lesevorgänge ist auf
 * dem Handy eine eigene Anfrage an das Dateisystem und kostet mehr Zeit als
 * die Bytes vermuten lassen.
 */
async function zipDataStart(file, entry) {
  if (entry.dataStart !== undefined) return entry.dataStart;
  const head = await sliceView(file, entry.headerOffset, entry.headerOffset + 30);
  // sliceView() kappt am Dateiende — bei einem beschädigten headerOffset nahe
  // EOF kämen hier weniger als 30 Bytes zurück, und getUint32() würde mit
  // einem rohen RangeError abbrechen statt der gewohnten ZipError-Meldung.
  if (head.byteLength < 30 || head.getUint32(0, true) !== SIG_LOC) {
    throw new ZipError(`„${entry.path}" konnte im Archiv nicht gefunden werden.`);
  }
  entry.dataStart = entry.headerOffset + 30
    + head.getUint16(26, true) + head.getUint16(28, true);
  return entry.dataStart;
}

/**
 * Ermittelt die Datenanfänge vieler Einträge auf einmal.
 *
 * Nacheinander wäre jeder Lesevorgang eine eigene Wartezeit; nebeneinander
 * laufen sie zusammen. Fehler werden hier bewusst verschluckt — sie treten
 * beim eigentlichen Auspacken erneut auf und werden dort gemeldet.
 */
export async function zipPrefetchStarts(file, entries) {
  await Promise.all(entries.map((e) => zipDataStart(file, e).catch(() => {})));
}

/**
 * Baut die beiden limit-/diagnoseabhängigen Funktionen — die einzigen
 * beiden, die tatsächlich gegen ein Grenzwert prüfen oder etwas protokollieren.
 *
 * @param {object} limits eingefroren übernommen: maxFileBytes, maxCdBytes,
 *   maxPathLen, maxRatio, minRatioCheckSize, maxTotalBytes, maxEntries,
 *   maxEntryBytes
 * @param {(event: string, data: object) => void} [onDiagnostic] optionaler
 *   Diagnose-Callback (z.B. dlog aus app.js) — dieses Modul kennt dlog nicht.
 */
export function createZipReader(limits, onDiagnostic) {
  const L = Object.freeze({ ...limits });
  const diag = onDiagnostic || (() => {});

  /**
   * Liest das Inhaltsverzeichnis einer ZIP-Datei.
   * @returns {Promise<Array>} Einträge { path, method, compressedSize, size, headerOffset }
   */
  async function zipReadDirectory(file) {
    if (file.size < 22) throw new ZipError('Die Datei ist zu klein für ein ZIP-Archiv.');
    if (file.size > L.maxFileBytes) {
      throw new ZipError(`Diese ZIP-Datei ist zu groß (${fmtBytes(file.size)}, erlaubt sind ${fmtBytes(L.maxFileBytes)}).`);
    }

    // Der EOCD-Record steht am Dateiende, kann aber bis zu 64 KB Kommentar
    // hinter sich haben. 66 KB abdecken genügt für jedes gültige Archiv.
    const tailLen = Math.min(file.size, 66 * 1024);
    const tailStart = file.size - tailLen;
    const tail = await sliceView(file, tailStart, file.size);

    // Mit Nutzer-Rückmeldungen abgeglichen: Firefox für Android liest so weit
    // hinten in einer sehr großen Datei (beobachtet oberhalb von 2 GB)
    // zuverlässig falsch — mal zu wenig Bytes, mal die volle Länge, aber ohne
    // gültiges ZIP-Ende darin. Derselbe (dort sogar größere) Ordner ließ sich
    // in Chrome auf demselben Gerät anschließend problemlos importieren. Ab
    // dieser Größe ist die konkrete Browser-Empfehlung darum gerechtfertigt,
    // statt die Datei fälschlich als beschädigt hinzustellen.
    const tooBigMessage = () =>
      `Diese Datei ist mit ${fmtBytes(file.size)} zu groß für diesen Browser (beobachtet oberhalb von etwa 2 GB). `
      + 'Bitte in einem anderen Browser importieren (z. B. Chrome) oder den Ordner in kleinere Teile aufteilen.';

    if (tail.byteLength !== tailLen) {
      diag('import:zip:tailShort', { requested: tailLen, got: tail.byteLength, fileSize: file.size });
      throw new ZipError(file.size > 2 ** 31
        ? tooBigMessage()
        : 'Diese Datei konnte nicht zu Ende gelesen werden. Bitte den Ordner erneut aus Dropbox herunterladen.');
    }

    const eocdRel = findSigBackwards(tail, SIG_EOCD);
    if (eocdRel < 0) {
      // Weder zu kurz gelesen noch (per Definition der ZIP-Kommentarlänge,
      // maximal 64 KB) zu wenig abgedeckt — trotzdem kein gültiges Dateiende
      // gefunden. Die letzten/ersten Bytes des gelesenen Bereichs als Hex
      // zeigen, ob dort verlässlich Nullen (nicht zugewiesener Bereich),
      // erkennbare, aber falsch positionierte ZIP-Bytes oder echter
      // Zufallsschrott stehen — das grenzt eine falsch berechnete Leseposition
      // von einer tatsächlich unvollständigen Datei ein.
      const pk = countPkMarkers(tail);
      diag('import:zip:eocdMissing', {
        tailLen, fileSize: file.size,
        headHex: hexBytes(tail, 0, 16),
        tailHex: hexBytes(tail, tail.byteLength - 16, 16),
        pkCount: pk.count, pkFirst: pk.first, pkLast: pk.last,
      });
      throw new ZipError(file.size > 2 ** 31
        ? tooBigMessage()
        : 'Diese Datei konnte nicht gelesen werden. Bitte den Ordner erneut aus Dropbox herunterladen.');
    }

    let total  = tail.getUint16(eocdRel + 10, true);
    let cdSize = tail.getUint32(eocdRel + 12, true);
    let cdOff  = tail.getUint32(eocdRel + 16, true);

    // Platzhalterwerte ⇒ die echten Zahlen stehen im ZIP64-Record.
    if (total === 0xFFFF || cdSize === 0xFFFFFFFF || cdOff === 0xFFFFFFFF) {
      const locRel = findSigBackwards(tail, SIG_ZIP64_L);
      if (locRel < 0) throw new ZipError('Diese ZIP-Datei verwendet ein Format, das die App nicht lesen kann.');
      const z64Off = u64(tail, locRel + 8);
      const z64 = await sliceView(file, z64Off, z64Off + 56);
      if (z64.getUint32(0, true) !== SIG_ZIP64_E) {
        throw new ZipError('Diese ZIP-Datei verwendet ein Format, das die App nicht lesen kann.');
      }
      total  = u64(z64, 32);
      cdSize = u64(z64, 40);
      cdOff  = u64(z64, 48);
    }

    if (cdOff + cdSize > file.size) {
      throw new ZipError('Diese Datei ist unvollständig. Bitte den Ordner erneut aus Dropbox herunterladen.');
    }

    // Größe VOR dem Lesen prüfen (nicht erst danach) — ein präpariertes/
    // beschädigtes cdSize-Feld soll nicht erst einen Lesevorgang über
    // beliebig viele Megabyte auslösen, bevor überhaupt geprüft wird, ob das
    // plausibel ist.
    if (cdSize > L.maxCdBytes) {
      throw new ZipError('Diese Datei ist beschädigt oder kein gültiges ZIP-Archiv (Inhaltsverzeichnis unplausibel groß).');
    }

    // Das gesamte Inhaltsverzeichnis am Stück lesen — bei 2000 Einträgen sind
    // das rund 100 KB, und es geht in Sekundenbruchteilen.
    const cd = await sliceView(file, cdOff, cdOff + cdSize);
    const entries = [];
    let p = 0;
    // Über alle Einträge mitgeführt, gegen maxTotalBytes geprüft — die
    // einzelnen Einträge könnten alle für sich unter maxEntryBytes
    // bleiben und trotzdem zusammen beliebig viel Speicher/Quota verbrauchen.
    let totalDeclaredSize = 0;

    for (let i = 0; i < total; i++) {
      if (p + 46 > cd.byteLength || cd.getUint32(p, true) !== SIG_CEN) break;

      const flags    = cd.getUint16(p + 8, true);
      const method   = cd.getUint16(p + 10, true);
      let   compSize = cd.getUint32(p + 20, true);
      let   size     = cd.getUint32(p + 24, true);
      const nameLen  = cd.getUint16(p + 28, true);
      const extraLen = cd.getUint16(p + 30, true);
      const cmtLen   = cd.getUint16(p + 32, true);
      let   headerOffset = cd.getUint32(p + 42, true);

      // Ohne diese Prüfung könnte ein beschädigtes/abgeschnittenes Verzeichnis
      // (falsche Längenangabe) den Namen oder das ZIP64-Zusatzfeld gleich unten
      // über das Ende von `cd` hinaus lesen wollen — das wäre ein roher
      // RangeError statt der gewohnten, verständlichen ZipError-Meldung.
      if (p + 46 + nameLen + extraLen + cmtLen > cd.byteLength) {
        throw new ZipError('Diese Datei ist unvollständig. Bitte den Ordner erneut aus Dropbox herunterladen.');
      }

      const nameBytes = new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen);
      const path = decodeEntryName(nameBytes, flags);

      // ZIP64-Zusatzfeld (0x0001) trägt die echten Werte für alles, was mit
      // Platzhaltern markiert ist — in genau dieser Reihenfolge.
      if (size === 0xFFFFFFFF || compSize === 0xFFFFFFFF || headerOffset === 0xFFFFFFFF) {
        let e = p + 46 + nameLen;
        const extraEnd = e + extraLen;
        while (e + 4 <= extraEnd) {
          const id  = cd.getUint16(e, true);
          const len = cd.getUint16(e + 2, true);
          if (id === 0x0001 && e + 4 + len <= cd.byteLength) {
            let q = e + 4;
            if (size === 0xFFFFFFFF)         { size = u64(cd, q); q += 8; }
            if (compSize === 0xFFFFFFFF)     { compSize = u64(cd, q); q += 8; }
            if (headerOffset === 0xFFFFFFFF) { headerOffset = u64(cd, q); q += 8; }
            break;
          }
          e += 4 + len;
        }
      }

      p += 46 + nameLen + extraLen + cmtLen;

      if (path.endsWith('/')) continue;      // reiner Verzeichniseintrag
      if (isJunkPath(path)) continue;
      if (path.length > L.maxPathLen) continue;

      // Deklarierte Größen (aus dem Inhaltsverzeichnis, noch nichts gelesen)
      // gegen eine verdächtige Kompressionsrate prüfen — ein klassisches
      // Zip-Bomb-Muster ist eine winzige komprimierte Größe für eine riesige
      // deklarierte Ausgabe. Nur oberhalb einer Mindestgröße geprüft, sonst
      // schlagen auch harmlose winzige Dateien (leere Textdateien u.ä.) an.
      if (!Number.isSafeInteger(size) || !Number.isSafeInteger(compSize) || size < 0 || compSize < 0) {
        throw new ZipError(`„${path}" hat eine unplausible Größenangabe im Archiv.`);
      }
      if (size > L.minRatioCheckSize && size > compSize * L.maxRatio) {
        throw new ZipError(`„${path}" hat ein verdächtig hohes Kompressionsverhältnis und wird abgelehnt.`);
      }

      totalDeclaredSize += size;
      if (!Number.isSafeInteger(totalDeclaredSize) || totalDeclaredSize > L.maxTotalBytes) {
        throw new ZipError(`Dieses Archiv ist ausgepackt zusammen zu groß (über ${fmtBytes(L.maxTotalBytes)}).`);
      }

      entries.push({ path, method, compressedSize: compSize, size, headerOffset });
    }

    if (!entries.length) {
      throw new ZipError('In dieser ZIP-Datei sind keine Dateien enthalten.');
    }
    if (entries.length > L.maxEntries) {
      throw new ZipError('Dieses Archiv enthält ungewöhnlich viele Dateien — das sieht nicht nach einem Chorarchiv aus.');
    }
    return entries;
  }

  /**
   * Holt die Nutzdaten eines einzelnen Eintrags als Blob.
   * @param {object} [budget] geteilter Zähler `{ used }` über den ganzen Import
   *   hinweg — das bestehende `seen > maxEntryBytes` unten prüft nur je
   *   Eintrag; viele Einträge knapp unter dem Einzellimit könnten sonst
   *   zusammen beliebig viel tatsächlich ausgepackten Speicher verbrauchen.
   */
  async function zipExtract(file, entry, budget) {
    // Die Größenangabe stammt aus dem Inhaltsverzeichnis und kostet nichts —
    // billige erste Bremse gegen ein grob präpariertes Archiv (F-06).
    if (entry.size > L.maxEntryBytes) {
      throw new ZipError(`„${entry.path}" ist ausgepackt größer als erwartet und wird übersprungen.`);
    }

    const start = await zipDataStart(file, entry);
    const raw = file.slice(start, start + entry.compressedSize);

    // Methode 0 (stored) ist bei MP3s der Normalfall — Dropbox komprimiert sie
    // nicht noch einmal. Dann kostet das Extrahieren praktisch nichts.
    if (entry.method === 0) {
      if (budget) {
        budget.used += raw.size;
        if (budget.used > L.maxTotalBytes) {
          throw new ZipError(`Dieses Archiv ist beim Auspacken insgesamt zu groß geworden (über ${fmtBytes(L.maxTotalBytes)}).`);
        }
      }
      return raw;
    }

    if (entry.method === 8) {
      if (!canInflate) {
        throw new ZipError(`„${entry.path}" ist komprimiert; dieser Browser kann das nicht entpacken.`);
      }
      // Die Größenangabe im Inhaltsverzeichnis lässt sich fälschen — deshalb
      // zusätzlich während des Entpackens mitzählen, statt ihr blind zu
      // vertrauen (siehe Prüfung oben).
      let seen = 0;
      const guard = new TransformStream({
        transform(chunk, controller) {
          seen += chunk.byteLength;
          if (seen > L.maxEntryBytes) {
            throw new ZipError(`„${entry.path}" ist beim Auspacken unerwartet groß geworden.`);
          }
          if (budget && budget.used + seen > L.maxTotalBytes) {
            throw new ZipError(`Dieses Archiv ist beim Auspacken insgesamt zu groß geworden (über ${fmtBytes(L.maxTotalBytes)}).`);
          }
          controller.enqueue(chunk);
        },
      });
      const stream = raw.stream()
        .pipeThrough(new DecompressionStream('deflate-raw'))
        .pipeThrough(guard);
      const blob = await new Response(stream).blob();
      if (budget) budget.used += seen;
      return blob;
    }

    throw new ZipError(`„${entry.path}" verwendet ein unbekanntes Komprimierungsverfahren.`);
  }

  return { zipReadDirectory, zipExtract };
}
