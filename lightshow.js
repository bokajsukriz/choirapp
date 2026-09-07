'use strict';

/* ==========================================================================
   LICHTSHOW — reine Zeit-zu-Farbe-Funktionen für die Bühnen-Einlage unter
   Einstellungen → Lichtshow (siehe LICHTSHOW-PLAN.md). Es gibt keinen
   Startzeitpunkt und keine Nachricht zwischen Geräten: das Bild ist eine
   reine Funktion der Systemzeit, `Farbe = f(Zeit mod Zykluslänge, Stimme)`.
   Wer später einsteigt oder neu lädt, ist damit sofort in Phase.

   AP-D (ARCHITEKTUR-PLAN.md): als eigenes Modul ausgelagert, weil dieser
   Code null Referenzen auf dlog/banner/el/$/DB/settings/Audio hat — der
   sauberste Blatt-Kandidat im Baum. Bleibt bewusst ein echtes Blatt: keine
   Importe zurück nach app.js. Die Ansicht (#lightshow-view, #lightshow-stage
   und alles, was DOM/Wake-Lock/Einstellungen anfasst) bleibt in app.js, das
   diese Funktionen importiert.
   ========================================================================== */

// Nur die Einträge aus VOICE_COLOR (app.js), die lightshowVoiceColor()
// tatsächlich braucht (FULL als Rückfall, SOP/ALT/TEN/BASS für die vier
// Chorstimmen) — als eigene Kopie statt eines Imports zurück nach app.js,
// damit dieses Modul ein echtes Blatt bleibt. Ändert sich eine dieser Farben
// in app.js, hier mitziehen.
const LIGHTSHOW_VOICE_COLOR = {
  FULL: '#F868B0',
  SOP:  '#4ECDC4',
  ALT:  '#6BCB77',
  TEN:  '#FFD93D',
  BASS: '#A78BFA',
};

// Reihenfolge bestimmt den Versatz in „Welle" und „Finale": von oben nach
// unten durch den Chor, wie man ihn auch aufstellt.
export const LIGHTSHOW_VOICES = ['SOP', 'ALT', 'TEN', 'BASS'];

/** Position in LIGHTSHOW_VOICES; unbekannte oder fehlende Stimme (LEAD, null) -> 0. */
export function lightshowVoiceIndex(voice) {
  const i = LIGHTSHOW_VOICES.indexOf(voice);
  return i < 0 ? 0 : i;
}

/**
 * Stimmfarbe für die Lichtshow. Eine Solistin ohne SATB-Stimme (LEAD) oder
 * ganz ohne Auswahl bekommt das Marken-Pink und läuft im Takt der Soprane mit,
 * statt gar nicht zu leuchten.
 */
export function lightshowVoiceColor(voice) {
  return LIGHTSHOW_VOICES.includes(voice) ? LIGHTSHOW_VOICE_COLOR[voice] : LIGHTSHOW_VOICE_COLOR.FULL;
}

// `sync` ist reine Anzeige-Information für die Show-Auswahl. Der vorherige
// Serverabgleich macht auch die Shows mit harten Schnitten zuverlässig.
export const LIGHTSHOWS = [
  { id: 'sterne', cycleMs: 60000, sync: 'unkritisch' },
  { id: 'puls',   cycleMs: 60000, sync: 'hoch' },
  { id: 'welle',  cycleMs: 64000, sync: 'mittel' },
  { id: 'finale', cycleMs: 60000, sync: 'empfindlich' },
  { id: 'prisma', cycleMs: 60000, sync: 'empfindlich' },
  { id: 'domino', cycleMs: 60000, sync: 'empfindlich' },
  { id: 'dialog', cycleMs: 60000, sync: 'empfindlich' },
  { id: 'kaleidoskop', cycleMs: 64000, sync: 'empfindlich' },
];

function lightshowByte(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function lightshowHexByte(v) { return lightshowByte(v).toString(16).padStart(2, '0'); }
const LIGHTSHOW_HEX_RE = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

/** Jeder Kanal * b (b in [0,1]) — schlichte Multiplikation statt Gamma-Korrektur, sieht auf der Bühne richtig aus und ist billig. */
export function lightshowScale(hex, b) {
  const m = LIGHTSHOW_HEX_RE.exec(hex);
  if (!m) return '#000000';
  const [r, g, bl] = [1, 2, 3].map((i) => parseInt(m[i], 16) * b);
  return `#${lightshowHexByte(r)}${lightshowHexByte(g)}${lightshowHexByte(bl)}`;
}

/** Lineare Mischung zweier Farben, f in [0,1]. */
export function lightshowMix(hexA, hexB, f) {
  const a = LIGHTSHOW_HEX_RE.exec(hexA), b = LIGHTSHOW_HEX_RE.exec(hexB);
  if (!a || !b) return '#000000';
  const parts = [1, 2, 3].map((i) => {
    const va = parseInt(a[i], 16), vb = parseInt(b[i], 16);
    return lightshowHexByte(va + (vb - va) * f);
  });
  return `#${parts.join('')}`;
}

/**
 * Deterministischer 32-Bit-Mix (Wang/xorshift, kein Math.random) — derselbe
 * (seed, n) ergibt auf jedem Gerät und in jedem Selbsttest denselben Wert.
 * Trägt „Sternenmeer" (siehe unten): entscheidet reproduzierbar, welches
 * Sternbild in einem Stimmenblock erscheint.
 */
function lightshowHash(seed, n) {
  let h = (seed ^ (n * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// Alle Choreografien dauern ungefähr eine Minute. Die Stimme bezeichnet
// ausschließlich den gemeinsamen Bühnenblock; der Geräte-Seed beeinflusst die
// Farbe nicht, damit wirklich alle Handys einer Stimme dasselbe Bild zeigen.
const LIGHTSHOW_PALETTES = {
  neon: ['#ff1744', '#ffb300', '#00e5ff', '#7c4dff'],
  ocean: ['#00b8d4', '#00e676', '#2979ff', '#651fff'],
  sunset: ['#ff3d8d', '#ff6d00', '#ffea00', '#d500f9'],
};
const stageColor = (palette, idx, shift = 0) => LIGHTSHOW_PALETTES[palette][(idx + shift) % 4];
const dark = (color, level = 0.055) => lightshowScale(color, level);

function lightshowBeatBell(distMs, halfWidthMs) {
  if (Math.abs(distMs) >= halfWidthMs) return 0;
  return Math.cos((Math.PI / 2) * (distMs / halfWidthMs)) ** 2;
}

function showBoundary(tMs, cycleMs, color) {
  if (tMs < 600) return lightshowMix('#000000', color, tMs / 600);
  if (tMs >= cycleMs - 3000) return lightshowMix(color, '#000000', (tMs - cycleMs + 3000) / 3000);
  return null;
}

/** Sternenmeer — ruhige gemeinsame Nacht, durch die farbige Sternbilder wandern. */
function lightshowFrameSterne(tMs, voice) {
  const idx = lightshowVoiceIndex(voice), cycleMs = 60000;
  const slot = Math.floor(tMs / 1200);
  const constellation = lightshowHash(0x51a7 + idx * 101, slot);
  const shared = lightshowHash(0xa11ce, slot) % 5 === 0;
  const sparkle = shared || constellation % 4 === 0;
  const hue = stageColor('ocean', idx, Math.floor(slot / 8));
  const base = lightshowMix('#02040d', '#102050', 0.35 + 0.2 * Math.sin(tMs / 7000));
  const color = sparkle ? lightshowMix(hue, '#ffffff', 0.35) : base;
  return showBoundary(tMs, cycleMs, color) ?? color;
}

/** Herzschlag — viel gemeinsames Rot, dazwischen wandernde farbige Echos. */
function lightshowFramePuls(tMs, voice) {
  const idx = lightshowVoiceIndex(voice), cycleMs = 60000;
  const beat = tMs % 2000;
  const bell = Math.max(lightshowBeatBell(beat - 500, 360), 0.6 * lightshowBeatBell(beat - 950, 280));
  let color;
  if (tMs < 20000) color = lightshowMix('#170006', '#ff1744', bell);
  else if (tMs < 40000) color = lightshowMix(dark(stageColor('sunset', idx)), stageColor('sunset', idx), bell * 0.9);
  else color = lightshowMix('#210011', tMs < 52000 ? '#ff3d8d' : '#ffffff', bell);
  return showBoundary(tMs, cycleMs, color) ?? color;
}

/** Aurora — alle Blöcke bleiben sichtbar, ein heller Saum zieht durch ihre Farbflächen. */
function lightshowFrameWelle(tMs, voice) {
  const idx = lightshowVoiceIndex(voice), cycleMs = 64000;
  const phase = (tMs % 8000) / 8000;
  const center = phase * 5 - 0.5;
  const glow = Math.max(0, 1 - Math.abs(idx - center) / 1.5);
  const reverse = Math.floor(tMs / 16000) % 2;
  const spatialIdx = reverse ? 3 - idx : idx;
  const base = stageColor('ocean', spatialIdx, Math.floor(tMs / 16000));
  let color = lightshowMix(dark(base, 0.22), base, 0.35 + 0.65 * glow);
  if (tMs >= 48000) color = lightshowMix(color, '#ffffff', 0.35 * Math.sin(Math.PI * ((tMs - 48000) % 4000) / 4000) ** 2);
  return showBoundary(tMs, cycleMs, color) ?? color;
}

/** Finale — große Tutti-Flächen werden von kurzen symmetrischen Schnitten unterbrochen. */
function lightshowFrameFinale(tMs, voice) {
  const idx = lightshowVoiceIndex(voice), cycleMs = 60000;
  const slot = Math.floor(tMs / 1000);
  let color;
  if (tMs < 18000) color = slot % 4 < 3 ? '#ff1744' : (idx < 2 ? '#ffea00' : '#7c4dff');
  else if (tMs < 36000) {
    const motif = slot % 4;
    const accent = motif === 0 ? idx === 0 || idx === 3 : motif === 2 ? idx === 1 || idx === 2 : true;
    color = accent ? stageColor('neon', idx, Math.floor(slot / 4)) : '#120018';
  } else if (tMs < 52000) color = slot % 2 ? '#ffffff' : stageColor('sunset', idx, Math.floor(slot / 2));
  else color = '#ffffff';
  return showBoundary(tMs, cycleMs, color) ?? color;
}

/** Prisma — vollflächige Farbakkorde drehen, spiegeln und vereinigen sich. */
function lightshowFramePrisma(tMs, voice) {
  const idx = lightshowVoiceIndex(voice), cycleMs = 60000;
  const slot = Math.floor(tMs / 1500);
  let color;
  if (tMs < 18000) color = stageColor('neon', idx, Math.floor(slot / 3));
  else if (tMs < 36000) color = stageColor('sunset', slot % 2 ? 3 - idx : idx, Math.floor(slot / 4));
  else if (tMs < 51000) color = slot % 3 === 0 ? '#00e5ff' : slot % 3 === 1 ? '#ff1744' : '#ffea00';
  else color = lightshowMix(stageColor('neon', idx, slot), '#ffffff', 0.45);
  return showBoundary(tMs, cycleMs, color) ?? color;
}

/** Domino — ganze Farbteppiche mit wandernden dunklen und hellen Akzenten. */
function lightshowFrameDomino(tMs, voice) {
  const idx = lightshowVoiceIndex(voice), cycleMs = 60000;
  const slot = Math.floor(tMs / 1000);
  const runner = slot % 8 < 4 ? slot % 4 : 3 - (slot % 4);
  let color = stageColor('sunset', idx, Math.floor(slot / 8));
  if (tMs < 24000) color = idx === runner ? lightshowMix(color, '#ffffff', 0.55) : lightshowScale(color, 0.55);
  else if (tMs < 42000) color = slot % 3 === 0 ? '#ff6d00' : lightshowMix(color, '#ffea00', 0.3);
  else color = idx === runner ? '#ffffff' : lightshowMix('#651fff', '#00e5ff', idx / 3);
  return showBoundary(tMs, cycleMs, color) ?? color;
}

/** Dialog — gemeinsame Aussagen wechseln mit Antworten der Bühnenhälften und Paare. */
function lightshowFrameDialog(tMs, voice) {
  const idx = lightshowVoiceIndex(voice), cycleMs = 60000;
  const slot = Math.floor(tMs / 1500);
  let color;
  if (tMs < 18000) color = slot % 2 === 0 ? '#ff3d8d' : (idx < 2 ? '#ff6d00' : '#00e5ff');
  else if (tMs < 36000) {
    const outside = idx === 0 || idx === 3;
    color = slot % 3 === 0 ? '#7c4dff' : outside === (slot % 2 === 0) ? '#ffea00' : '#006064';
  } else if (tMs < 51000) color = slot % 2 ? '#00e676' : stageColor('ocean', idx, slot);
  else color = '#18ffff';
  return showBoundary(tMs, cycleMs, color) ?? color;
}

/** Kaleidoskop — schnelle, symmetrische Farbflächen; selten wird ein Block nur gedimmt. */
function lightshowFrameKaleidoskop(tMs, voice) {
  const idx = lightshowVoiceIndex(voice), cycleMs = 64000;
  const slot = Math.floor(tMs / 1000);
  const motif = slot % 8;
  const mirror = motif % 2 ? 3 - idx : idx;
  let color = stageColor(motif < 4 ? 'neon' : 'sunset', mirror, Math.floor(slot / 4));
  if (motif === 2 || motif === 6) color = idx % 2 ? '#00e5ff' : '#ff1744';
  if (motif === 3 || motif === 7) color = motif === 3 ? '#ffea00' : '#7c4dff';
  if (tMs > 48000 && slot % 4 === 0) color = lightshowMix(color, '#ffffff', 0.6);
  return showBoundary(tMs, cycleMs, color) ?? color;
}

/**
 * Bildinhalt einer Show zu einem Zeitpunkt — rein, ohne DOM, ohne Date, ohne
 * Math.random. Genau das macht sie testbar (siehe runSelfTests) und sorgt
 * zugleich dafür, dass zwei Geräte mit derselben Uhr zwangsläufig dasselbe
 * zeigen.
 * @param {string} showId  aus LIGHTSHOWS
 * @param {number} tMs     Millisekunden seit Zyklusbeginn, 0 <= tMs < cycleMs
 * @param {string} voice   'SOP' | 'ALT' | 'TEN' | 'BASS' | …
 * @param {number} seed    aus Kompatibilitätsgründen; aktuelle Shows ignorieren ihn
 * @returns {string}       Hintergrundfarbe '#rrggbb'
 */
export function lightshowFrame(showId, tMs, voice, seed) {
  switch (showId) {
    case 'sterne': return lightshowFrameSterne(tMs, voice, seed);
    case 'puls':   return lightshowFramePuls(tMs, voice);
    case 'welle':  return lightshowFrameWelle(tMs, voice);
    case 'finale': return lightshowFrameFinale(tMs, voice);
    case 'prisma': return lightshowFramePrisma(tMs, voice);
    case 'domino': return lightshowFrameDomino(tMs, voice);
    case 'dialog': return lightshowFrameDialog(tMs, voice);
    case 'kaleidoskop': return lightshowFrameKaleidoskop(tMs, voice);
    default:       return '#000000';
  }
}
