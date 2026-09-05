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

// `sync` ist reine Anzeige-Information für die Show-Auswahl (siehe
// renderLightshowPicker): aufsteigende Empfindlichkeit gegenüber einer schief
// gehenden Handy-Uhr. Die sichere Bank steht oben.
export const LIGHTSHOWS = [
  { id: 'sterne', cycleMs: 40000, sync: 'unkritisch' },
  { id: 'puls',   cycleMs: 24000, sync: 'hoch' },
  { id: 'welle',  cycleMs: 32000, sync: 'mittel' },
  { id: 'finale', cycleMs: 32000, sync: 'empfindlich' },
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
 * Trägt „Sternenhimmel" (siehe unten): entscheidet je 800-ms-Zeitschlitz,
 * ob und wie hell dieses Gerät funkelt.
 */
function lightshowHash(seed, n) {
  let h = (seed ^ (n * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Sternenhimmel — braucht keine Synchronität, deshalb die erste Show. */
function lightshowFrameSterne(tMs, voice, seed) {
  const color = lightshowVoiceColor(voice);
  const base = lightshowScale(color, 0.06); // Grundton, damit auch dunkle Momente ein Farbfeld ergeben
  const slot = Math.floor(tMs / 800);
  const local = tMs - slot * 800;
  const hash = lightshowHash(seed >>> 0, slot);
  const sparkles = (hash % 4) === 0; // etwa jeder vierte Schlitz
  if (!sparkles) return base;
  const peak = 0.45 + ((hash >>> 8) % 1000) / 1000 * 0.55; // 0,45 … 1,0
  let envelope;
  if (local < 250) envelope = local / 250;                 // 250 ms Aufblende
  else if (local < 550) envelope = 1;                       // Halten
  else envelope = Math.max(0, 1 - (local - 550) / 250);     // 250 ms Abblende
  return lightshowMix(base, lightshowScale(color, peak), envelope);
}

/** Weiche Glocke (erhabener Kosinus) um distMs=0, 0 außerhalb ±halfWidthMs — nie ein Rechteck. */
function lightshowBeatBell(distMs, halfWidthMs) {
  if (Math.abs(distMs) >= halfWidthMs) return 0;
  return Math.cos((Math.PI / 2) * (distMs / halfWidthMs)) ** 2;
}

/** Herzschlag — Grundschlag 2000 ms, Gruppen um je 500 ms versetzt. */
function lightshowFramePuls(tMs, voice) {
  const color = lightshowVoiceColor(voice);
  const idx = lightshowVoiceIndex(voice);
  const cycleMs = 24000;
  const beatMs = 2000;
  const halfWidth = 420; // Aufstiegsflanke ≥ 400 ms
  // Phasenversatz, damit bei tMs=0 (Zyklusstart) keine Gruppe exakt auf dem
  // Schlag steht — sonst gäbe es dort einen Sprung zwischen der wachsenden
  // und der am Zyklusende wieder fallenden Amplitude (siehe Selbsttest L7.4).
  const phaseShiftMs = 250;
  const offset = idx * 500 + phaseShiftMs;
  let tGroup = (tMs - offset) % beatMs;
  if (tGroup < 0) tGroup += beatMs;
  const dMain = tGroup <= beatMs / 2 ? tGroup : tGroup - beatMs;   // Hauptschlag bei Phase 0
  const dSec = tGroup - beatMs * 0.22;                              // Nachschlag bei Phase 0,22
  const envelope = Math.max(lightshowBeatBell(dMain, halfWidth), 0.55 * lightshowBeatBell(dSec, halfWidth));
  // Amplitude wächst über den Zyklus, fällt in den letzten 3000 ms wieder ab
  // — ein Bogen statt nur zu blinken.
  let amp;
  if (tMs < cycleMs - 3000) amp = 0.35 + (1 - 0.35) * (tMs / (cycleMs - 3000));
  else amp = 1 - (1 - 0.2) * ((tMs - (cycleMs - 3000)) / 3000);
  const b = envelope * amp;
  return lightshowMix(lightshowScale(color, 0.05), lightshowMix(color, '#ffffff', 0.3), b); // in der Spitze 30% Richtung Weiß
}

/** Helligkeit der Welle für eine Stimme an einer Stelle innerhalb der 4000-ms-Periode. */
function lightshowWaveBrightness(idx, localMs) {
  // Versatz, damit bei localMs=0 keine Gruppe exakt in der Wellenmitte steht
  // — siehe lightshowFrameWelle für den Grund.
  const waveOffset = 0.125;
  const p = ((localMs % 4000) / 4000 + waveOffset) % 1;
  const phi = idx / LIGHTSHOW_VOICES.length;
  let d = Math.abs(p - phi);
  if (d > 0.5) d = 1 - d; // kürzeste Distanz auf dem Kreis
  return Math.max(0, 1 - d / 0.28) ** 1.6;
}

/** Welle — sieben Durchläufe von Sopran nach Bass, dann eine gemeinsame Atmung. */
function lightshowFrameWelle(tMs, voice) {
  const color = lightshowVoiceColor(voice);
  const idx = lightshowVoiceIndex(voice);
  if (tMs < 28000) {
    const b = lightshowWaveBrightness(idx, tMs);
    return lightshowScale(color, 0.04 + 0.96 * b);
  }
  // 28 000 … 32 000 ms: alle gemeinsam eine Atmung nach Weiß und zurück.
  // Sie endet exakt auf dem Helligkeitswert, mit dem die Welle bei tMs=0
  // wieder einsteigt (lightshowWaveBrightness ist 4000-ms-periodisch) —
  // damit springt das Bild beim Loop nicht (Selbsttest L7.4).
  const boundary = lightshowWaveBrightness(idx, 0);
  const boundaryColor = lightshowScale(color, 0.04 + 0.96 * boundary);
  const r = (tMs - 28000) / 4000;
  const breathe = Math.sin(Math.PI * r);
  return lightshowMix(boundaryColor, '#ffffff', breathe);
}

/** Finale — die einzige Show mit harten Schnitten, deshalb „empfindlich". */
function lightshowFrameFinale(tMs, voice) {
  const color = lightshowVoiceColor(voice);
  const idx = lightshowVoiceIndex(voice);
  if (tMs < 12000) {
    // Gruppen-Jagd im 500-ms-Raster: genau eine Gruppe hell, sonst 5 %.
    const slot = Math.floor(tMs / 500);
    const activeIdx = slot % LIGHTSHOW_VOICES.length;
    const isActive = idx === activeIdx;
    // Der allererste Schlitz blendet aus dem Schwarz auf, statt hart
    // einzuschalten — die vorige Runde endet in Schwarz (siehe unten), ohne
    // diesen weichen Einstieg gäbe es am Loop-Punkt einen Sprung.
    let attack = 1;
    if (slot === 0) attack = tMs / 500;
    const level = (isActive ? 1 : 0.05) * attack;
    return lightshowScale(color, level);
  }
  if (tMs < 24000) {
    // Alle gemeinsam im 1000-ms-Puls, Amplitude linear steigend, Richtung Weiß.
    const t2 = tMs - 12000;
    const amp = t2 / 12000;
    const phase = (t2 % 1000) / 1000;
    const pulse = lightshowBeatBell((phase - 0.5) * 1000, 500);
    return lightshowMix(lightshowScale(color, 0.05), '#ffffff', amp * pulse);
  }
  if (tMs < 28500) return '#ffffff'; // Höhepunkt: alle voll Weiß, stehend
  const f = Math.min(1, (tMs - 28500) / (32000 - 28500));
  return lightshowMix('#ffffff', '#000000', f); // Blende nach Schwarz
}

/**
 * Bildinhalt einer Show zu einem Zeitpunkt — rein, ohne DOM, ohne Date, ohne
 * Math.random. Genau das macht sie testbar (siehe runSelfTests) und sorgt
 * zugleich dafür, dass zwei Geräte mit derselben Uhr zwangsläufig dasselbe
 * zeigen.
 * @param {string} showId  aus LIGHTSHOWS
 * @param {number} tMs     Millisekunden seit Zyklusbeginn, 0 <= tMs < cycleMs
 * @param {string} voice   'SOP' | 'ALT' | 'TEN' | 'BASS' | …
 * @param {number} seed    geräteeigener Zufallskeim (nur Show „sterne")
 * @returns {string}       Hintergrundfarbe '#rrggbb'
 */
export function lightshowFrame(showId, tMs, voice, seed) {
  switch (showId) {
    case 'sterne': return lightshowFrameSterne(tMs, voice, seed);
    case 'puls':   return lightshowFramePuls(tMs, voice);
    case 'welle':  return lightshowFrameWelle(tMs, voice);
    case 'finale': return lightshowFrameFinale(tMs, voice);
    default:       return '#000000';
  }
}
