/* ==========================================================================
   CHOR GROOVE LAB — verstecktes Easter Egg der BVG-App.
   Sieben Tipps auf den Songtitel im Player öffnen einen kleinen, komplett
   lokalen Beat-/Synth-Spielplatz (Web Audio API, kein Sample, kein Netz).
   Vollbild wie die übrigen Vollbild-Ansichten der App — kein Dialog-Karten-
   Look. Diese Datei wird erst nach dem Auslöser nachgeladen.

   Aufbau:
   - GrooveEngine:  reine Klangerzeugung (AudioContext, Bus-Struktur, Voices).
                    Kennt weder Muster noch UI-Zustand.
   - Knob:          eigenständiger Dreh-Regler (Pointer-Events, Tastatur),
                    genutzt für Cutoff/Resonanz und Reverb/Echo.
   - GrooveLabView: die UI (Shadow-DOM-Web-Component) — Zustand, Scheduler,
                    Rendering.
   ========================================================================== */
(function (global) {
  'use strict';

  const STEP_COUNT = 16;

  /* ------------------------------------------------------------------------
     INHALT — 16 Drumloops, 16 Melodien, 16 Synth-Voreinstellungen. Jeder
     Eintrag ist eigenständig; die Icons werden weiter unten aus genau diesen
     Daten gezeichnet statt aus Emoji ausgewählt.
     ------------------------------------------------------------------------ */

  // `bass`/`bassNotes` sind bewusst eigenständig: eine Basslinie, die nur die
  // Kick-Schläge dopplet, hat kein eigenes musikalisches Profil. Beide Arrays
  // sind gleich lang — bassNotes[i] ist der Halbtonabstand zur Grundtonart
  // für den Schlag bei bass[i] (siehe GrooveLabView._playStep()).
  const DRUM_PATTERNS = [
    { name: 'Pulse Basic',    icon: 'pulse',       kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      bass: [0, 4, 8, 10, 12], bassNotes: [0, 0, 0, 7, 0] },
    { name: 'Backbeat Open',  icon: 'unlock',       kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], open: [14],
      bass: [0, 4, 7, 8, 12], bassNotes: [0, 0, 7, 0, 0] },
    { name: 'Disco Clap',     icon: 'star',         kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], open: [6, 14],
      bass: [0, 3, 4, 8, 11, 12], bassNotes: [0, 7, 0, 0, 7, 0] },
    { name: 'Swing Soul',     icon: 'note',         kick: [0, 3, 7, 10, 13], snare: [4, 12], ghost: [6, 9, 15], hat: [1, 3, 5, 7, 9, 11, 13, 15],
      bass: [0, 3, 6, 10, 13], bassNotes: [0, 3, 7, 3, 0] },
    { name: 'Glass Funk',     icon: 'diamond',      kick: [0, 3, 6, 10, 13], snare: [4, 12], ghost: [2, 9, 14], hat: [0, 2, 4, 6, 8, 9, 11, 13, 15],
      bass: [0, 3, 8, 10, 13], bassNotes: [0, 5, 7, 5, 0] },
    { name: 'Afrobeat Skip',  icon: 'footprints',   kick: [0, 3, 6, 10, 12], clap: [4, 12], ghost: [7, 9], hat: [1, 3, 5, 8, 10, 13, 15],
      bass: [0, 3, 6, 9, 12, 14], bassNotes: [0, 0, 7, 7, 0, 3] },
    { name: 'Half-Time Drop', icon: 'clock',        kick: [0, 6, 10], snare: [8], ghost: [3, 13, 15], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [12],
      bass: [0, 6, 8, 10], bassNotes: [0, 0, 7, 0] },
    { name: 'House Bounce',   icon: 'house',        kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], open: [10, 14],
      bass: [0, 4, 7, 8, 12, 15], bassNotes: [0, 0, 7, 0, 0, 7] },
    { name: 'Circuit Pulse',  icon: 'bolt',         kick: [0, 5, 9, 13], snare: [4, 11], clap: [7, 14], hat: [1, 3, 6, 8, 10, 13], open: [15],
      bass: [0, 5, 8, 11, 13], bassNotes: [0, 3, 0, 7, 0] },
    { name: 'Boom Bap',       icon: 'speaker',      kick: [0, 10], snare: [4, 12], ghost: [7], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      bass: [0, 3, 7, 10, 14], bassNotes: [0, 0, 7, 0, 0] },
    { name: 'Latin Skip',     icon: 'sun',          kick: [0, 3, 6, 8, 11, 14], clap: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      bass: [0, 3, 6, 8, 11, 14], bassNotes: [0, 7, 0, 3, 7, 0] },
    { name: 'Breakbeat Cut',  icon: 'scissors',     kick: [0, 10, 12], snare: [4, 11], ghost: [2, 9], hat: [0, 2, 4, 6, 7, 9, 11, 13, 15],
      bass: [0, 4, 7, 10, 12, 15], bassNotes: [0, 0, 5, 0, 7, 0] },
    { name: 'Minimal Click',  icon: 'target',       kick: [0, 8], snare: [12], ghost: [4], hat: [2, 6, 10, 14],
      bass: [0, 8], bassNotes: [0, 7] },
    { name: 'Triplet Roll',   icon: 'repeat',       kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 3, 5, 6, 8, 10, 11, 13, 14],
      bass: [0, 5, 8, 11], bassNotes: [0, 7, 0, 7] },
    { name: 'Deep House',     icon: 'moon',         kick: [0, 4, 8, 12], clap: [4, 12], hat: [1, 3, 5, 7, 9, 11, 13, 15], open: [7, 15],
      bass: [0, 4, 8, 11, 12], bassNotes: [0, 0, 0, 7, 0] },
    { name: 'Broken Beat',    icon: 'puzzle',       kick: [0, 5, 8, 11], snare: [3, 10, 14], ghost: [6, 13], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      bass: [0, 3, 5, 8, 11, 13], bassNotes: [0, 5, 0, 7, 0, 3] },
  ];

  // [Schritt, Halbtonabstand zur Grundtonart, Länge in 16teln]
  const MELODIES = [
    { name: 'Rising Third',    icon: 'trendUp',   notes: [[0, 0, 2], [4, 4, 2], [8, 7, 2], [12, 9, 2]] },
    { name: 'Falling Fourth',  icon: 'trendDown', notes: [[0, 12, 2], [4, 7, 2], [8, 4, 2], [12, 0, 2]] },
    { name: 'Skip Step',       icon: 'stairs',    notes: [[0, 0, 1], [2, 2, 1], [4, 4, 1], [6, 5, 1], [8, 7, 1], [10, 9, 1], [12, 11, 1], [14, 12, 1]] },
    { name: 'Call & Response', icon: 'chat',      notes: [[0, 0, 2], [4, 3, 1], [6, 5, 1], [8, 0, 2], [12, 3, 1], [14, 5, 1]] },
    { name: 'Arch Line',       icon: 'arch',      notes: [[0, 0, 1], [2, 4, 1], [4, 7, 1], [6, 9, 1], [8, 7, 1], [10, 4, 1], [12, 0, 2]] },
    { name: 'Syncopated Hook', icon: 'magnet',    notes: [[0, 0, 1], [3, 4, 1], [6, 7, 1], [9, 4, 1], [11, 9, 1], [14, 7, 1]] },
    { name: 'Night Window',    icon: 'window',    notes: [[0, 0, 3], [4, 7, 1], [7, 10, 2], [10, 3, 1], [13, 2, 1], [15, 0, 2]] },
    { name: 'Blue Third',      icon: 'droplet',   notes: [[0, 0, 2], [3, 3, 1], [6, 3, 1], [9, 7, 1], [12, 10, 1], [14, 7, 1]] },
    { name: 'Wide Leap',       icon: 'expand',    notes: [[0, 0, 2], [4, 12, 2], [8, 7, 2], [12, -5, 2]] },
    { name: 'Gentle Wave',     icon: 'wave',      notes: [[0, 4, 1], [2, 7, 1], [4, 9, 1], [7, 11, 1], [9, 7, 1], [11, 4, 1], [14, 2, 1]] },
    { name: 'Two-Note Pulse',  icon: 'heart',     notes: [[0, 0, 1], [2, 7, 1], [4, 0, 1], [6, 7, 1], [8, 0, 1], [10, 7, 1], [12, 0, 1], [14, 7, 1]] },
    { name: 'Descending Run',  icon: 'chevrons',  notes: [[0, 12, 1], [1, 11, 1], [3, 9, 1], [4, 7, 1], [6, 5, 1], [7, 4, 1], [9, 2, 1], [10, 0, 2]] },
    { name: 'Suspended Glow',  icon: 'bulb',      notes: [[0, 0, 3], [5, 5, 2], [9, 7, 2], [13, 0, 3]] },
    { name: 'Funk Thread',     icon: 'thread',    notes: [[0, 0, 1], [2, 3, 1], [4, 5, 1], [6, 7, 1], [9, 10, 1], [11, 7, 1], [13, 3, 1]] },
    { name: 'Glass Runner',    icon: 'runner',    notes: [[0, 0, 1], [1, 2, 1], [3, 4, 1], [6, 7, 1], [9, 11, 1], [11, 9, 1], [13, 7, 1], [15, 2, 1]] },
    { name: 'Afterglow',       icon: 'sunset',    notes: [[0, -5, 2], [4, 0, 2], [8, 4, 1], [10, 7, 2], [12, 9, 1], [14, 7, 1]] },
  ];

  // reverbLength in Sekunden (Nachhall-Dauer), echoRate in Millisekunden
  // (Verzögerungszeit), filterEnvAmount in Hz: wie stark die Lautstärke-
  // Hüllkurve den Filter mit aufzieht (0 = Filter bleibt starr auf cutoff).
  const SYNTH_PRESETS = [
    { name: 'Velvet Choir',   icon: 'users',    wave: 'triangle', attack: .16,  decay: .22, sustain: .68, release: .8,  cutoff: 2900, resonance: 2,  filterEnvAmount: 600,  reverbWet: .38, reverbLength: 1.6, echoWet: .10, echoRate: 220 },
    { name: 'Breath Glass',   icon: 'wind',     wave: 'sine',     attack: .32,  decay: .38, sustain: .72, release: 1.1, cutoff: 6400, resonance: 1,  filterEnvAmount: 300,  reverbWet: .5,  reverbLength: 2.2, echoWet: .16, echoRate: 260 },
    { name: 'Tape Keys',      icon: 'cassette', wave: 'triangle', attack: .01,  decay: .16, sustain: .5,  release: .32, cutoff: 3100, resonance: 3,  filterEnvAmount: 900,  reverbWet: .12, reverbLength: .8,  echoWet: .06, echoRate: 160 },
    { name: 'Neon Pluck',     icon: 'zap',      wave: 'sawtooth', attack: .004, decay: .1,  sustain: .3,  release: .16, cutoff: 5200, resonance: 6,  filterEnvAmount: 2400, reverbWet: .1,  reverbLength: .6,  echoWet: .22, echoRate: 180 },
    { name: 'Moon Pad',       icon: 'moon',     wave: 'sine',     attack: .58,  decay: .55, sustain: .82, release: 1.6, cutoff: 2100, resonance: 2,  filterEnvAmount: 400,  reverbWet: .58, reverbLength: 2.6, echoWet: .24, echoRate: 300 },
    { name: 'Soft Brass',     icon: 'horn',     wave: 'sawtooth', attack: .06,  decay: .26, sustain: .58, release: .3,  cutoff: 2600, resonance: 4,  filterEnvAmount: 1400, reverbWet: .16, reverbLength: 1.0, echoWet: .08, echoRate: 200 },
    { name: 'Crystal Drops',  icon: 'droplet',  wave: 'sine',     attack: .005, decay: .18, sustain: .4,  release: 1.3, cutoff: 9000, resonance: 7,  filterEnvAmount: 1800, reverbWet: .55, reverbLength: 2.0, echoWet: .3,  echoRate: 240 },
    { name: 'Dub Chamber',    icon: 'door',     wave: 'square',   attack: .02,  decay: .32, sustain: .55, release: .44, cutoff: 1400, resonance: 8,  filterEnvAmount: 700,  reverbWet: .26, reverbLength: 1.4, echoWet: .34, echoRate: 340 },
    { name: 'Warm Sub',       icon: 'flame',    wave: 'sine',     attack: .03,  decay: .2,  sustain: .7,  release: .5,  cutoff: 900,  resonance: 3,  filterEnvAmount: 200,  reverbWet: .15, reverbLength: .7,  echoWet: .05, echoRate: 140 },
    { name: 'Square Bell',    icon: 'bell',     wave: 'square',   attack: .005, decay: .4,  sustain: .25, release: 1.8, cutoff: 4200, resonance: 5,  filterEnvAmount: 2000, reverbWet: .45, reverbLength: 1.9, echoWet: .2,  echoRate: 260 },
    { name: 'Analog Lead',    icon: 'compass',  wave: 'sawtooth', attack: .008, decay: .15, sustain: .6,  release: .25, cutoff: 3800, resonance: 9,  filterEnvAmount: 2600, reverbWet: .08, reverbLength: .5,  echoWet: .14, echoRate: 170 },
    { name: 'Airy Choir',     icon: 'cloud',    wave: 'triangle', attack: .4,   decay: .4,  sustain: .75, release: 1.4, cutoff: 3400, resonance: 1,  filterEnvAmount: 350,  reverbWet: .5,  reverbLength: 2.4, echoWet: .12, echoRate: 280 },
    { name: 'Metallic Pluck', icon: 'gear',     wave: 'square',   attack: .003, decay: .08, sustain: .2,  release: .12, cutoff: 6800, resonance: 10, filterEnvAmount: 3000, reverbWet: .06, reverbLength: .4,  echoWet: .28, echoRate: 150 },
    { name: 'Deep Pad',       icon: 'anchor',   wave: 'sine',     attack: .7,   decay: .6,  sustain: .85, release: 2.0, cutoff: 1700, resonance: 2,  filterEnvAmount: 250,  reverbWet: .6,  reverbLength: 2.8, echoWet: .2,  echoRate: 320 },
    { name: 'Bright Saw',     icon: 'sun',      wave: 'sawtooth', attack: .01,  decay: .2,  sustain: .45, release: .4,  cutoff: 7200, resonance: 5,  filterEnvAmount: 1600, reverbWet: .2,  reverbLength: 1.1, echoWet: .16, echoRate: 210 },
    { name: 'Vintage Organ',  icon: 'key',      wave: 'triangle', attack: .01,  decay: .05, sustain: .9,  release: .2,  cutoff: 4600, resonance: 3,  filterEnvAmount: 100,  reverbWet: .3,  reverbLength: 1.3, echoWet: .1,  echoRate: 190 },
  ];

  // Für den Arpeggiator: feste Akkorde (Halbtonabstände zur Grundtonart) —
  // "Gehaltene Töne" nutzt stattdessen die per Latch gehaltene Auswahl der
  // Mini-Tastatur (siehe GrooveLabView._arpPool()).
  const ARP_SOURCES = [
    { id: 'latch', name: 'Gehaltene Töne' },
    { id: 'fifths', name: 'Quinten', intervals: [0, 7] },
    { id: 'major', name: 'Dur', intervals: [0, 4, 7] },
    { id: 'minor', name: 'Moll', intervals: [0, 3, 7] },
    { id: 'maj7', name: 'Maj7', intervals: [0, 4, 7, 11] },
    { id: 'min7', name: 'Moll7', intervals: [0, 3, 7, 10] },
    { id: 'sus2', name: 'Sus2', intervals: [0, 2, 7] },
    { id: 'sus4', name: 'Sus4', intervals: [0, 5, 7] },
    { id: 'add9', name: 'Add9', intervals: [0, 4, 7, 14] },
  ];

  const TRACK_IDS = ['kick', 'snare', 'clap', 'hat', 'bass'];
  const TRACK_LABEL = { kick: 'Kick', snare: 'Snare', clap: 'Clap', hat: 'Hi-Hat', bass: 'Basslauf' };

  const WAVE_SHAPES = ['sine', 'triangle', 'square', 'sawtooth'];
  const WAVE_LABEL = { sine: 'Sinus', triangle: 'Dreieck', square: 'Rechteck', sawtooth: 'Sägezahn' };

  const noteHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function stepsForTrack(pattern, track) {
    if (track === 'kick') return pattern.kick || [];
    if (track === 'bass') return pattern.bass || [];
    if (track === 'snare') return [...(pattern.snare || []), ...(pattern.ghost || [])];
    if (track === 'clap') return pattern.clap || [];
    return [...(pattern.hat || []), ...(pattern.open || [])]; // hat
  }

  /** Halbtonabstand der Basslinie an einem Schritt — eigene Notenfolge statt
   *  eines starren Musters, siehe DRUM_PATTERNS. */
  function bassOffsetForStep(pattern, step) {
    const steps = pattern.bass || [];
    const i = steps.indexOf(step);
    return i === -1 ? 0 : (pattern.bassNotes?.[i] ?? 0);
  }

  /* ------------------------------------------------------------------------
     ICONS — bekannte, einfarbige Piktogramme (Haus, Uhr, Stern, Note …),
     keine erfundenen Formen und keine Farbe pro Symbol. Strichstärke und
     -stil wie die übrigen Icons in der App.
     ------------------------------------------------------------------------ */

  function svg(children, viewBox = '0 0 24 24') {
    return `<svg viewBox="${viewBox}" aria-hidden="true">${children}</svg>`;
  }

  const UI_ICON = {
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    play: svg('<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>'),
    pause: svg('<path d="M8 5v14M16 5v14"/>'),
    dice: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.1" fill="currentColor" stroke="none"/>'),
    latch: svg('<rect x="5" y="10" width="14" height="9" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0"/>'),
  };

  // Ein Piktogramm je Eintrag in DRUM_PATTERNS/MELODIES/SYNTH_PRESETS (siehe
  // deren `icon`-Feld) — jedes ist ein Symbol, das es so oder sehr ähnlich in
  // jeder gängigen Icon-Bibliothek gibt.
  const PICTOGRAM = {
    // --- Drumloops ---
    pulse: '<path d="M22 12h-4l-3 8L9 3l-3 9H2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2" fill="none"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7" fill="none" stroke-linecap="round"/>',
    star: '<path d="M12 3l2.5 5.6 6.1.6-4.6 4.1 1.3 6-5.3-3.2-5.3 3.2 1.3-6-4.6-4.1 6.1-.6Z" fill="none" stroke-linejoin="round"/>',
    note: '<path d="M15 17V4l4-1v13" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13" cy="17" r="2.6" fill="none"/>',
    diamond: '<path d="M6 9h12M9 9l3 11 3-11M6 9l3-6h6l3 6-6 11Z" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    footprints: '<ellipse cx="8" cy="15.5" rx="2.4" ry="3.6" transform="rotate(-12 8 15.5)" fill="none"/><circle cx="6" cy="10.7" r=".7" fill="currentColor" stroke="none"/><circle cx="8" cy="10" r=".7" fill="currentColor" stroke="none"/><ellipse cx="16" cy="9.5" rx="2.1" ry="3.2" transform="rotate(10 16 9.5)" fill="none"/><circle cx="14.4" cy="5.4" r=".6" fill="currentColor" stroke="none"/><circle cx="16.2" cy="4.9" r=".6" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="none"/><path d="M12 7v5l3.5 2" fill="none" stroke-linecap="round"/>',
    house: '<path d="M4 11 12 4 20 11" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11v9h12v-9" fill="none" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke-linejoin="round"/>',
    bolt: '<path d="M13 2 5 14h5l-1 8 8-12h-5l1-8Z" fill="none" stroke-linejoin="round"/>',
    speaker: '<path d="M4 9h3l5-4v14l-5-4H4Z" fill="none" stroke-linejoin="round"/><path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke-linecap="round"/><path d="M18.5 6.5a8 8 0 0 1 0 11" fill="none" stroke-linecap="round"/>',
    sun: '<circle cx="12" cy="12" r="4.2" fill="none"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke-linecap="round"/>',
    scissors: '<circle cx="6" cy="6" r="2.2" fill="none"/><circle cx="6" cy="18" r="2.2" fill="none"/><path d="M7.8 7.6 20 19M7.8 16.4 20 5" stroke-linecap="round"/>',
    target: '<circle cx="12" cy="12" r="8" fill="none"/><circle cx="12" cy="12" r="4.2" fill="none"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/>',
    repeat: '<path d="M4 7h11a3 3 0 0 1 3 3v2" fill="none" stroke-linecap="round"/><path d="M15 9l3-3 3 3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 17H9a3 3 0 0 1-3-3v-2" fill="none" stroke-linecap="round"/><path d="M9 15l-3 3-3-3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" fill="none" stroke-linejoin="round"/>',
    puzzle: '<path d="M4 4h6a2 2 0 1 1 4 0h6v6a2 2 0 1 0 0 4v6h-6a2 2 0 1 1-4 0H4v-6a2 2 0 1 0 0-4Z" fill="none" stroke-linejoin="round"/>',

    // --- Melodien ---
    trendUp: '<path d="M3 17l6-6 4 4 8-9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 5h6v6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    trendDown: '<path d="M3 7l6 6 4-4 8 9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 19h6v-6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    stairs: '<path d="M3 20v-4h4v-4h4v-4h4V4h4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    chat: '<path d="M3 5h11v6H9l-3 3v-3H3Z" fill="none" stroke-linejoin="round"/><path d="M21 9v6h-3v3l-3-3h-4V9Z" fill="none" stroke-linejoin="round"/>',
    arch: '<path d="M3 18a9 9 0 0 1 18 0" fill="none" stroke-linecap="round"/><path d="M7 18a5 5 0 0 1 10 0" fill="none" stroke-linecap="round"/>',
    magnet: '<path d="M6 4v9a6 6 0 0 0 12 0V4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 4h4v5H6ZM14 4h4v5h-4Z" fill="none" stroke-linejoin="round"/>',
    window: '<rect x="4" y="4" width="16" height="16" rx="1.5" fill="none"/><path d="M12 4v16M4 12h16" fill="none"/>',
    droplet: '<path d="M12 3c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12Z" fill="none" stroke-linejoin="round"/>',
    expand: '<path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    wave: '<path d="M2 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0M2 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0" fill="none" stroke-linecap="round"/>',
    heart: '<path d="M12 20s-7-4.4-9.3-8.8C1.2 8 3 5 6.2 5 8.6 5 10.6 6.4 12 8.6 13.4 6.4 15.4 5 17.8 5 21 5 22.8 8 21.3 11.2 19 15.6 12 20 12 20Z" fill="none" stroke-linejoin="round"/>',
    chevrons: '<path d="M6 6l6 6 6-6M6 13l6 6 6-6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    bulb: '<path d="M9 18h6M10 21h4" stroke-linecap="round"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V17h5v-1.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" fill="none" stroke-linejoin="round"/>',
    thread: '<circle cx="17" cy="6" r="2.6" fill="none"/><path d="M15.2 7.8 5 18" fill="none" stroke-linecap="round"/><path d="M5 18c1.6.6 3-.4 2.6-2" fill="none" stroke-linecap="round"/>',
    runner: '<circle cx="14" cy="4.5" r="1.8" fill="currentColor" stroke="none"/><path d="M8 20l3-5-2-3 1-4 4 1 3 4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 12l4-1 2 3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    sunset: '<path d="M3 18h18" stroke-linecap="round"/><path d="M6 18a6 6 0 0 1 12 0" fill="none" stroke-linecap="round"/><path d="M12 4v3M5 9l2 2M19 9l-2 2" stroke-linecap="round"/>',

    // --- Synth-Presets ---
    users: '<circle cx="9" cy="8" r="3" fill="none"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke-linecap="round"/><path d="M16 8.5a2.5 2.5 0 1 1 0-5" fill="none" stroke-linecap="round"/><path d="M15 14.2c2.9.6 5 2.9 5 5.8" fill="none" stroke-linecap="round"/>',
    wind: '<path d="M2 8h11a2.5 2.5 0 1 0-2.5-2.5" fill="none" stroke-linecap="round"/><path d="M2 13h15a2.5 2.5 0 1 1-2.5 2.5" fill="none" stroke-linecap="round"/><path d="M2 18h9a2 2 0 1 0-2-2" fill="none" stroke-linecap="round"/>',
    cassette: '<rect x="3" y="6" width="18" height="13" rx="2" fill="none"/><circle cx="8.5" cy="12.5" r="2.2" fill="none"/><circle cx="15.5" cy="12.5" r="2.2" fill="none"/><path d="M8.5 12.5h7M6 17h12" stroke-linecap="round"/>',
    zap: '<path d="M13 2 5 14h5l-1 8 8-12h-5l1-8Z" fill="currentColor" stroke="none"/>',
    horn: '<path d="M3 10v4h3l6 4V6L6 10H3Z" fill="none" stroke-linejoin="round"/><path d="M15 9a4 4 0 0 1 0 6" fill="none" stroke-linecap="round"/>',
    door: '<rect x="6" y="3" width="12" height="18" rx="1" fill="none"/><circle cx="14.5" cy="12" r=".9" fill="currentColor" stroke="none"/>',
    flame: '<path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1.5-1-2-1-3.5 1.5 1 2.5 3 2.5 5a5.5 5.5 0 1 1-11 0C5.5 8 9 6.5 12 3Z" fill="none" stroke-linejoin="round"/>',
    bell: '<path d="M12 3a5 5 0 0 0-5 5v3c0 1.5-.5 3-2 4.5h14c-1.5-1.5-2-3-2-4.5V8a5 5 0 0 0-5-5Z" fill="none" stroke-linejoin="round"/><path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke-linecap="round"/>',
    compass: '<circle cx="12" cy="12" r="9" fill="none"/><path d="M15 9l-2 6-6 2 2-6Z" fill="none" stroke-linejoin="round"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9 5.5 5.5 0 0 1 10.6-1.6A4 4 0 0 1 17 18H7Z" fill="none" stroke-linejoin="round"/>',
    gear: '<circle cx="12" cy="12" r="3" fill="none"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" stroke-linecap="round"/>',
    anchor: '<circle cx="12" cy="5" r="2" fill="none"/><path d="M12 7v14M7 13H2a10 10 0 0 0 10 8 10 10 0 0 0 10-8h-5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 9h8" stroke-linecap="round"/>',
    key: '<circle cx="7" cy="7" r="4" fill="none"/><path d="M10 10l10 10M17 15l3-3M14 18l2-2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  function pictogramIcon(name) {
    return svg(PICTOGRAM[name] || '');
  }

  /** Eine Periode der Oszillator-Wellenform — für die Wellenform-Auswahl. */
  function waveIcon(wave) {
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let y;
      if (wave === 'sine') y = Math.sin(t * Math.PI * 2);
      else if (wave === 'square') y = t < .5 ? 1 : -1;
      else if (wave === 'sawtooth') y = t * 2 - 1;
      else y = t < .5 ? t * 4 - 1 : 3 - t * 4; // triangle
      pts.push(`${(2 + t * 20).toFixed(1)},${(12 - y * 8).toFixed(1)}`);
    }
    return svg(`<polyline points="${pts.join(' ')}" fill="none"/>`);
  }

  /* ------------------------------------------------------------------------
     GrooveEngine — reine Klangerzeugung.
     ------------------------------------------------------------------------ */

  class GrooveEngine {
    constructor() {
      this.ctx = null;
      this.buses = null;
      this.noiseBuffer = null;
      this.voices = new Set();
    }

    get ready() { return !!this.ctx; }

    async start() {
      if (this.ctx) {
        if (this.ctx.state !== 'running') await this.ctx.resume();
        return;
      }
      const AudioContextClass = global.AudioContext || global.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio API nicht verfügbar');
      const ctx = new AudioContextClass({ latencyHint: 'interactive' });
      this.ctx = ctx;

      const master = ctx.createGain(); master.gain.value = .7;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -13; limiter.ratio.value = 6;
      master.connect(limiter).connect(ctx.destination);

      const drums = ctx.createGain(); drums.gain.value = .72; drums.connect(master);
      const synth = ctx.createGain(); synth.gain.value = .55; synth.connect(master);

      const reverbSend = ctx.createGain(); reverbSend.gain.value = 0;
      const convolver = ctx.createConvolver();
      convolver.buffer = this._impulseResponse(1.4);
      synth.connect(convolver).connect(reverbSend).connect(master);

      const echoSend = ctx.createGain(); echoSend.gain.value = 0;
      const delay = ctx.createDelay(1.2); delay.delayTime.value = .22;
      const feedback = ctx.createGain(); feedback.gain.value = .3;
      synth.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(echoSend).connect(master);

      this.buses = { master, drums, synth, reverbSend, echoSend, convolver, delay };
      this.noiseBuffer = this._whiteNoise(.4);
      await ctx.resume();
    }

    async stop() {
      this.voices.forEach((v) => this._releaseVoice(v, true));
      this.voices.clear();
      const ctx = this.ctx;
      this.ctx = null;
      this.buses = null;
      try { await ctx?.close(); } catch { /* bereits geschlossen */ }
    }

    /** Live-Effektparameter eines Presets übernehmen — auch ohne gerade
     *  gespielte Note, damit ein Preset-Wechsel sofort hörbar/eingestellt ist. */
    applyPreset(preset) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.buses.reverbSend.gain.setTargetAtTime(preset.reverbWet, now, .03);
      this.buses.echoSend.gain.setTargetAtTime(preset.echoWet, now, .03);
      this.setReverbLength(preset.reverbLength);
      this.setEchoRate(preset.echoRate);
    }

    setReverbLength(seconds) {
      if (!this.ctx) return;
      this.buses.convolver.buffer = this._impulseResponse(clamp(seconds, .1, 4));
    }

    setEchoRate(ms) {
      if (!this.ctx) return;
      this.buses.delay.delayTime.setTargetAtTime(clamp(ms, 20, 900) / 1000, this.ctx.currentTime, .01);
    }

    setReverbWet(amount) {
      if (!this.ctx) return;
      this.buses.reverbSend.gain.setTargetAtTime(clamp(amount, 0, 1), this.ctx.currentTime, .02);
    }

    setEchoWet(amount) {
      if (!this.ctx) return;
      this.buses.echoSend.gain.setTargetAtTime(clamp(amount, 0, 1), this.ctx.currentTime, .02);
    }

    _whiteNoise(seconds) {
      const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * seconds), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    _impulseResponse(seconds) {
      const length = Math.max(1, Math.ceil(this.ctx.sampleRate * seconds));
      const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.3;
      }
      return buffer;
    }

    playKick(time) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + .11);
      gain.gain.setValueAtTime(.7, time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .19);
      osc.connect(gain).connect(this.buses.drums);
      osc.start(time); osc.stop(time + .2);
    }

    playNoise(time, { cutoff, length, volume }) {
      const ctx = this.ctx;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = this.noiseBuffer;
      filter.type = 'highpass'; filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + length);
      source.connect(filter).connect(gain).connect(this.buses.drums);
      source.start(time); source.stop(time + length + .02);
    }

    playBass(time, midi) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.value = noteHz(midi);
      filter.type = 'lowpass'; filter.frequency.value = 480; filter.Q.value = 8;
      gain.gain.setValueAtTime(.2, time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .14);
      osc.connect(filter).connect(gain).connect(this.buses.drums);
      osc.start(time); osc.stop(time + .15);
    }

    /** Trägt genau einen Trommel-Treffer ein — genutzt vom Sequencer UND vom
     *  "Halten"-Roll (siehe GrooveLabView._startRoll). Bass läuft separat
     *  über playBass(), weil er eine Tonhöhe statt nur ein Timing braucht. */
    hitTrack(track, time) {
      if (track === 'kick') this.playKick(time);
      else if (track === 'snare') this.playNoise(time, { cutoff: 900, length: .12, volume: .2 });
      else if (track === 'clap') { this.playNoise(time, { cutoff: 1300, length: .09, volume: .15 }); this.playNoise(time + .018, { cutoff: 1800, length: .065, volume: .09 }); }
      else this.playNoise(time, { cutoff: 6500, length: .045, volume: .055 }); // hat
    }

    playTone(preset, midi, time, velocity, duration) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = preset.wave;
      osc.frequency.value = noteHz(midi);
      filter.type = 'lowpass';
      const nyquist = ctx.sampleRate * .45;
      const baseCutoff = Math.min(preset.cutoff, nyquist);
      filter.Q.value = preset.resonance;

      // Filter-Hüllkurve: dieselbe Attack/Decay-Form wie die Lautstärke,
      // aber auf den Cutoff gelegt — ein klassischer Analog-Synth-Zug, den
      // ein starrer Filter nicht hinbekommt (siehe preset.filterEnvAmount).
      const envAmount = preset.filterEnvAmount || 0;
      const peakCutoff = Math.min(baseCutoff + envAmount, nyquist);
      filter.frequency.setValueAtTime(baseCutoff, time);
      filter.frequency.linearRampToValueAtTime(peakCutoff, time + preset.attack);
      filter.frequency.linearRampToValueAtTime(baseCutoff, time + preset.attack + preset.decay);

      gain.gain.setValueAtTime(.0001, time);
      gain.gain.linearRampToValueAtTime(velocity, time + preset.attack);
      gain.gain.linearRampToValueAtTime(velocity * preset.sustain, time + preset.attack + preset.decay);

      osc.connect(filter).connect(gain).connect(this.buses.synth);
      osc.start(time);

      const voice = { osc, gain, release: preset.release, done: false };
      this.voices.add(voice);
      osc.addEventListener('ended', () => { voice.done = true; this.voices.delete(voice); }, { once: true });
      if (duration) global.setTimeout(() => this._releaseVoice(voice), Math.max(0, (time + duration - ctx.currentTime) * 1000));
      return voice;
    }

    _releaseVoice(voice, fast = false) {
      if (!voice || voice.done || !this.ctx) return;
      const now = this.ctx.currentTime;
      const release = fast ? .03 : voice.release;
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(Math.max(.0001, voice.gain.gain.value), now);
        voice.gain.gain.exponentialRampToValueAtTime(.0001, now + release);
        voice.osc.stop(now + release + .02);
      } catch { /* Oszillator kann schon beendet sein */ }
      voice.done = true;
      this.voices.delete(voice);
    }

    releaseVoice(voice) { this._releaseVoice(voice, false); }
    releaseVoiceFast(voice) { this._releaseVoice(voice, true); }
  }

  /* ------------------------------------------------------------------------
     Knob — Dreh-Regler für Cutoff/Resonanz/Reverb/Echo. 270°-Sweep,
     Pointer-Drag (vertikal) plus Pfeiltasten für Tastaturbedienung.
     Kapselt sich selbst vollständig (kein globaler Zustand), damit mehrere
     Regler nebeneinander unabhängig funktionieren.
     ------------------------------------------------------------------------ */

  class Knob {
    constructor({ label, min, max, value, format, onInput }) {
      this.min = min; this.max = max; this.value = value;
      this.format = format || ((v) => v.toFixed(2));
      this.onInput = onInput;

      this.el = document.createElement('div');
      this.el.className = 'knob-field';
      this.el.innerHTML = `
        <button type="button" class="knob" role="slider" tabindex="0"
                aria-label="${label}" aria-valuemin="${min}" aria-valuemax="${max}">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle class="knob-track" cx="20" cy="20" r="16"/>
            <circle class="knob-dot" cx="20" cy="6" r="2.4"/>
          </svg>
        </button>
        <span class="knob-label">${label}</span>
        <output class="knob-value"></output>`;

      this.button = this.el.querySelector('.knob');
      this.dot = this.el.querySelector('.knob-dot');
      this.output = this.el.querySelector('.knob-value');

      this._dragStartY = 0;
      this._dragStartValue = 0;
      this.button.addEventListener('pointerdown', (e) => this._startDrag(e));
      this.button.addEventListener('keydown', (e) => this._handleKey(e));
      this._render();
    }

    setValue(value, { silent = true } = {}) {
      this.value = clamp(value, this.min, this.max);
      this._render();
      if (!silent) this.onInput?.(this.value);
    }

    _startDrag(event) {
      event.preventDefault();
      // Capture kann in seltenen Fällen fehlschlagen (z. B. ein bereits
      // beendeter Pointer) — das Ziehen selbst funktioniert dann trotzdem,
      // nur ohne Garantie, dass Loslassen außerhalb des Reglers ankommt.
      try { this.button.setPointerCapture(event.pointerId); } catch { /* siehe oben */ }
      this._dragStartY = event.clientY;
      this._dragStartValue = this.value;
      const move = (e) => {
        const deltaPx = this._dragStartY - e.clientY; // hoch ziehen = mehr
        const deltaValue = (deltaPx / 140) * (this.max - this.min);
        this.setValue(this._dragStartValue + deltaValue, { silent: false });
      };
      const end = () => {
        this.button.removeEventListener('pointermove', move);
        this.button.removeEventListener('pointerup', end);
        this.button.removeEventListener('pointercancel', end);
      };
      this.button.addEventListener('pointermove', move);
      this.button.addEventListener('pointerup', end);
      this.button.addEventListener('pointercancel', end);
    }

    _handleKey(event) {
      const step = (this.max - this.min) / 40;
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); this.setValue(this.value + step, { silent: false }); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); this.setValue(this.value - step, { silent: false }); }
    }

    _render() {
      const fraction = (this.value - this.min) / (this.max - this.min || 1);
      const angle = -135 + fraction * 270;
      this.dot.setAttribute('transform', `rotate(${angle.toFixed(1)} 20 20)`);
      this.button.setAttribute('aria-valuenow', String(this.value));
      this.output.textContent = this.format(this.value);
    }
  }

  /* ------------------------------------------------------------------------
     GrooveLabView — die Web Component.
     ------------------------------------------------------------------------ */

  class GrooveLabView extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = GrooveLabView.markup();

      this.engine = new GrooveEngine();
      this.state = {
        bpm: 106,
        patternIndex: 0,
        melodyIndex: 0,
        melodyOn: true,
        presetIndex: 0,
        octave: 4,
        trackOn: { kick: true, snare: true, clap: true, hat: true, bass: true },
        arpOn: false,
        arpSourceId: 'latch',
        arpMode: 'up',
        arpDivision: 1,
        arpOctaves: 1,
        latchOn: false,
      };

      this.playing = false;
      this.step = 0;
      this.nextStepTime = 0;
      this.schedulerTimer = 0;
      this.visualFrame = 0;
      this.scheduledSteps = [];

      this.keyVoices = new Map();   // pointerId -> { keyEl, voice, midi }
      this.latchedNotes = new Set(); // MIDI-Noten, per Latch gehalten
      this.rollTimers = {};          // track -> Timer-Handle des Halten-Rolls

      this._restoreFocusTo = null;
      this._bodyOverflow = '';
      this._onKeydown = (event) => this._handleKeydown(event);

      this._wireControls();
      this._wireKeyboard();
      this._renderAll();
    }

    $(selector) { return this.shadowRoot.querySelector(selector); }
    $all(selector) { return Array.from(this.shadowRoot.querySelectorAll(selector)); }

    /* ---- Öffentliche API ---- */

    open({ accent } = {}) {
      this._restoreFocusTo = document.activeElement;
      this.style.setProperty('--accent', accent || '#f868b0');
      const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(accent || '');
      this.style.setProperty('--accent-rgb', match
        ? `${parseInt(match[1], 16)},${parseInt(match[2], 16)},${parseInt(match[3], 16)}`
        : '248,104,176');

      this._bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      this.hidden = false;
      document.addEventListener('keydown', this._onKeydown);
      requestAnimationFrame(() => this.$('.close-btn')?.focus());
    }

    async close() {
      this.stop();
      this._releaseAllKeys();
      this.hidden = true;
      document.removeEventListener('keydown', this._onKeydown);
      document.body.style.overflow = this._bodyOverflow;
      await this.engine.stop();
      this._restoreFocusTo?.focus?.();
    }

    /* ---- Transport ---- */

    async start() {
      try {
        await this.engine.start();
        this.engine.applyPreset(SYNTH_PRESETS[this.state.presetIndex]);
      } catch {
        this._setStatus('Web Audio ist auf diesem Gerät nicht verfügbar.');
        return;
      }
      this.playing = true;
      this.step = 0;
      this.scheduledSteps.length = 0;
      this.nextStepTime = this.engine.ctx.currentTime + .05;

      const btn = this.$('.transport-play');
      btn.innerHTML = UI_ICON.pause;
      btn.setAttribute('aria-label', 'Groove pausieren');
      this._setStatus('Groove läuft …');

      this._scheduleAhead();
      this._drawSteps();
    }

    stop() {
      this.playing = false;
      clearTimeout(this.schedulerTimer);
      cancelAnimationFrame(this.visualFrame);
      this.schedulerTimer = 0;
      this.visualFrame = 0;
      this.scheduledSteps.length = 0;

      this.engine.voices.forEach((voice) => this.engine.releaseVoiceFast(voice));

      this.$all('.step-cell').forEach((cell) => cell.classList.remove('is-now'));
      const btn = this.$('.transport-play');
      btn.innerHTML = UI_ICON.play;
      btn.setAttribute('aria-label', 'Groove starten');
      this._setStatus('Bereit — am besten mit Kopfhörern.');
    }

    randomize() {
      const s = this.state;
      s.patternIndex = Math.floor(Math.random() * DRUM_PATTERNS.length);
      s.melodyIndex = Math.floor(Math.random() * MELODIES.length);
      s.presetIndex = Math.floor(Math.random() * SYNTH_PRESETS.length);
      s.bpm = [86, 94, 102, 108, 116, 124, 132][Math.floor(Math.random() * 7)];
      this._renderAll();
      if (this.engine.ready) this.engine.applyPreset(SYNTH_PRESETS[s.presetIndex]);
    }

    /* ---- Lookahead-Scheduler ---- */

    _scheduleAhead() {
      if (!this.playing) return;
      const ctx = this.engine.ctx;
      const stepSeconds = 60 / this.state.bpm / 4;

      while (this.nextStepTime < ctx.currentTime + .1) {
        this._playStep(this.step, this.nextStepTime);
        this.scheduledSteps.push({ step: this.step, time: this.nextStepTime });
        this.nextStepTime += stepSeconds;
        this.step = (this.step + 1) % STEP_COUNT;
      }
      this.schedulerTimer = global.setTimeout(() => this._scheduleAhead(), 25);
    }

    _playStep(step, time) {
      const pattern = DRUM_PATTERNS[this.state.patternIndex];
      const stepSeconds = 60 / this.state.bpm / 4;
      for (const track of TRACK_IDS) {
        if (!this.state.trackOn[track]) continue;
        if (!stepsForTrack(pattern, track).includes(step)) continue;
        // Die Basslinie hat eine eigene Notenfolge (siehe DRUM_PATTERNS) —
        // sie soll nicht einfach die Kick-Tonhöhe wiederholen.
        if (track === 'bass') this.engine.playBass(time, 36 + bassOffsetForStep(pattern, step));
        else this.engine.hitTrack(track, time, step);
      }

      if (this.state.melodyOn) {
        for (const [at, offset, lengthSteps] of MELODIES[this.state.melodyIndex].notes) {
          if (at === step) {
            const midi = 60 + offset + (this.state.octave - 4) * 12;
            this.engine.playTone(SYNTH_PRESETS[this.state.presetIndex], midi, time, .17, lengthSteps * stepSeconds);
          }
        }
      }

      if (this.state.arpOn && step % this.state.arpDivision === 0) {
        const pool = this._arpPool();
        if (pool.length) {
          const phase = Math.floor(step / this.state.arpDivision);
          const midi = pool[this._arpIndex(phase, pool.length)];
          this.engine.playTone(SYNTH_PRESETS[this.state.presetIndex], midi, time, .13, stepSeconds);
        }
      }
    }

    /** Notenvorrat des Arps: entweder die per Latch gehaltenen Tastatur-Noten
     *  oder ein gewählter Akkord, über die eingestellte Oktavzahl gestreut. */
    _arpPool() {
      const root = 12 * (this.state.octave + 1);
      let base;
      if (this.state.arpSourceId === 'latch') {
        base = Array.from(this.latchedNotes).sort((a, b) => a - b);
      } else {
        const source = ARP_SOURCES.find((s) => s.id === this.state.arpSourceId) || ARP_SOURCES[1];
        base = source.intervals.map((iv) => root + iv);
      }
      if (!base.length) return [];
      const pool = [];
      for (let oct = 0; oct < this.state.arpOctaves; oct++) {
        for (const midi of base) pool.push(midi + oct * 12);
      }
      return pool;
    }

    _arpIndex(phase, n) {
      if (this.state.arpMode === 'down') return n - 1 - (phase % n);
      if (this.state.arpMode === 'updown') {
        const cycle = 2 * (n - 1) || 1;
        const p = phase % cycle;
        return p < n ? p : cycle - p;
      }
      if (this.state.arpMode === 'random') return Math.floor(Math.random() * n);
      return phase % n; // 'up'
    }

    _drawSteps() {
      if (!this.playing) return;
      const ctx = this.engine.ctx;
      let latestStep;
      while (this.scheduledSteps.length && this.scheduledSteps[0].time <= ctx.currentTime + .01) {
        latestStep = this.scheduledSteps.shift().step;
      }
      if (latestStep !== undefined) {
        this.$all('.step-cell').forEach((cell) => cell.classList.toggle('is-now', Number(cell.dataset.step) === latestStep));
      }
      this.visualFrame = global.requestAnimationFrame(() => this._drawSteps());
    }

    _setStatus(text) { this.$('.status-line').textContent = text; }

    /* ---- Halten-Roll: Zusatznoten nur solange der Pad-Knopf gedrückt ist. ---- */

    async _startRoll(track) {
      if (this.rollTimers[track]) return;
      try { await this.engine.start(); this.engine.applyPreset(SYNTH_PRESETS[this.state.presetIndex]); }
      catch { this._setStatus('Web Audio ist hier nicht verfügbar.'); return; }

      const stepSeconds = () => 60 / this.state.bpm / 4;
      let rollStep = 0;
      const tick = () => {
        if (track === 'bass') {
          // Zyklisch durch die Notenfolge der aktuellen Basslinie statt
          // starr eine Tonhöhe zu wiederholen (siehe DRUM_PATTERNS.bassNotes).
          const pattern = DRUM_PATTERNS[this.state.patternIndex];
          const notes = pattern.bassNotes?.length ? pattern.bassNotes : [0];
          this.engine.playBass(this.engine.ctx.currentTime, 36 + notes[rollStep % notes.length]);
          rollStep++;
        } else {
          this.engine.hitTrack(track, this.engine.ctx.currentTime);
        }
        this.rollTimers[track] = global.setTimeout(tick, stepSeconds() * 1000);
      };
      tick();
    }

    _stopRoll(track) {
      global.clearTimeout(this.rollTimers[track]);
      delete this.rollTimers[track];
    }

    /* ---- Rendering ---- */

    _renderAll() {
      this._renderGrid('.pattern-grid', DRUM_PATTERNS, this.state.patternIndex, (i) => { this.state.patternIndex = i; this._renderAll(); }, (p) => pictogramIcon(p.icon));
      this._renderGrid('.melody-grid', MELODIES, this.state.melodyIndex, (i) => { this.state.melodyIndex = i; this._renderAll(); }, (m) => pictogramIcon(m.icon));
      this._renderGrid('.preset-grid', SYNTH_PRESETS, this.state.presetIndex, (i) => this._selectPreset(i), (p) => pictogramIcon(p.icon));

      this.$('.pattern-name').textContent = DRUM_PATTERNS[this.state.patternIndex].name;
      this.$('.melody-name').textContent = MELODIES[this.state.melodyIndex].name;
      this.$('.preset-name').textContent = SYNTH_PRESETS[this.state.presetIndex].name;

      this._renderTracks();
      this._renderSynthControls();
      this._renderOctaves();
      this._renderArpSources();

      const melodyBtn = this.$('.melody-toggle');
      melodyBtn.setAttribute('aria-pressed', String(this.state.melodyOn));
      melodyBtn.textContent = this.state.melodyOn ? 'Melodie an' : 'Melodie aus';

      const arpBtn = this.$('.arp-toggle');
      arpBtn.setAttribute('aria-pressed', String(this.state.arpOn));
      arpBtn.textContent = this.state.arpOn ? 'Arp an' : 'Arp aus';

      const latchBtn = this.$('.latch-toggle');
      latchBtn.setAttribute('aria-pressed', String(this.state.latchOn));

      this.$('.bpm-input').value = this.state.bpm;
      this.$('.bpm-out').textContent = `${this.state.bpm} BPM`;
      this.$('[data-field="arpMode"]').value = this.state.arpMode;
      this.$('[data-field="arpDivision"]').value = String(this.state.arpDivision);
      this.$('[data-field="arpOctaves"]').value = String(this.state.arpOctaves);
    }

    _renderGrid(hostSelector, items, activeIndex, onPick, iconFor) {
      const host = this.$(hostSelector);
      host.replaceChildren(...items.map((item, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pick-cell';
        btn.title = item.name;
        btn.setAttribute('aria-label', item.name);
        btn.setAttribute('aria-pressed', String(index === activeIndex));
        btn.innerHTML = iconFor(item);
        btn.addEventListener('click', () => onPick(index));
        return btn;
      }));
    }

    _selectPreset(index) {
      this.state.presetIndex = index;
      this._renderAll();
      if (this.engine.ready) this.engine.applyPreset(SYNTH_PRESETS[index]);
    }

    _renderTracks() {
      const pattern = DRUM_PATTERNS[this.state.patternIndex];
      const host = this.$('.track-list');
      host.replaceChildren(...TRACK_IDS.map((track) => {
        const on = this.state.trackOn[track];
        const hits = stepsForTrack(pattern, track);

        const row = document.createElement('div');
        row.className = `track-row${on ? '' : ' is-off'}`;

        const roll = document.createElement('button');
        roll.type = 'button';
        roll.className = 'track-roll';
        roll.setAttribute('aria-label', `${TRACK_LABEL[track]} halten für Extra-Noten`);
        roll.title = 'Halten für Extra-Noten';
        roll.innerHTML = svg('<circle cx="12" cy="12" r="7"/>');
        roll.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          try { roll.setPointerCapture(e.pointerId); } catch { /* siehe Knob._startDrag */ }
          roll.classList.add('is-active');
          this._startRoll(track);
        });
        const releaseRoll = (e) => {
          roll.classList.remove('is-active');
          this._stopRoll(track);
          try { roll.releasePointerCapture(e.pointerId); } catch { /* schon gelöst */ }
        };
        roll.addEventListener('pointerup', releaseRoll);
        roll.addEventListener('pointercancel', releaseRoll);

        const label = document.createElement('span');
        label.className = 'track-name';
        label.textContent = TRACK_LABEL[track];

        const cells = document.createElement('div');
        cells.className = 'step-row';
        for (let i = 0; i < STEP_COUNT; i++) {
          const cell = document.createElement('i');
          cell.className = `step-cell${hits.includes(i) ? ' is-hit' : ''}`;
          cell.dataset.step = String(i);
          cells.append(cell);
        }

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'track-toggle';
        toggle.setAttribute('aria-pressed', String(on));
        toggle.textContent = on ? 'an' : 'aus';
        toggle.addEventListener('click', () => {
          this.state.trackOn[track] = !this.state.trackOn[track];
          this._renderTracks();
        });

        row.append(roll, label, cells, toggle);
        return row;
      }));
    }

    _renderSynthControls() {
      const preset = SYNTH_PRESETS[this.state.presetIndex];

      // --- Oszillator: die vier Wellenformen nebeneinander statt in einem
      //     Dropdown versteckt — jede zeigt ihre eigene Kurve. ---
      const waveHost = this.$('.wave-row');
      waveHost.replaceChildren(...WAVE_SHAPES.map((wave) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wave-btn';
        btn.title = WAVE_LABEL[wave];
        btn.setAttribute('aria-label', WAVE_LABEL[wave]);
        btn.setAttribute('aria-pressed', String(wave === preset.wave));
        btn.innerHTML = waveIcon(wave);
        btn.addEventListener('click', () => {
          preset.wave = wave;
          this._markCustom();
          this._renderSynthControls();
        });
        return btn;
      }));

      // --- ADSR: vier Schieberegler plus Hüllkurven-Grafik ---
      const adsrHost = this.$('.adsr-sliders');
      adsrHost.replaceChildren(...[
        ['attack', 'Attack', .005, 1, .005],
        ['decay', 'Decay', .05, 1.5, .01],
        ['sustain', 'Sustain', .05, 1, .01],
        ['release', 'Release', .05, 2, .01],
      ].map(([key, label, min, max, step]) => {
        const wrap = document.createElement('label');
        wrap.className = 'slider-field';
        wrap.append(label);
        const input = document.createElement('input');
        input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step);
        input.value = String(preset[key]);
        input.setAttribute('aria-label', label);
        input.addEventListener('input', (e) => {
          preset[key] = Number(e.target.value);
          this._markCustom();
          this._renderEnvelope(preset);
        });
        wrap.append(input);
        return wrap;
      }));
      this._renderEnvelope(preset);

      // --- Cutoff/Resonanz/Hüllkurventiefe als Drehregler ---
      const knobHost = this.$('.filter-knobs');
      knobHost.replaceChildren();
      const cutoffKnob = new Knob({
        label: 'Cutoff', min: 200, max: 10000, value: preset.cutoff,
        format: (v) => `${Math.round(v)} Hz`,
        onInput: (v) => { preset.cutoff = v; this._markCustom(); },
      });
      const resonanceKnob = new Knob({
        label: 'Resonanz', min: 0, max: 15, value: preset.resonance,
        format: (v) => v.toFixed(1),
        onInput: (v) => { preset.resonance = v; this._markCustom(); },
      });
      // Klassischer Analog-Synth-Regler: die Lautstärke-Hüllkurve zieht beim
      // Anschlag den Filter mit auf, statt dass er starr auf Cutoff bleibt.
      const envAmountKnob = new Knob({
        label: 'Env→Filter', min: 0, max: 4000, value: preset.filterEnvAmount,
        format: (v) => `${Math.round(v)} Hz`,
        onInput: (v) => { preset.filterEnvAmount = v; this._markCustom(); },
      });
      knobHost.append(cutoffKnob.el, resonanceKnob.el, envAmountKnob.el);

      // --- Reverb: Dry/Wet + Länge ---
      const reverbHost = this.$('.reverb-knobs');
      reverbHost.replaceChildren();
      const reverbWetKnob = new Knob({
        label: 'Dry/Wet', min: 0, max: 1, value: preset.reverbWet,
        format: (v) => `${Math.round(v * 100)}%`,
        onInput: (v) => { preset.reverbWet = v; this._markCustom(); this.engine.setReverbWet(v); },
      });
      const reverbLengthKnob = new Knob({
        label: 'Länge', min: .1, max: 4, value: preset.reverbLength,
        format: (v) => `${v.toFixed(1)} s`,
        onInput: (v) => { preset.reverbLength = v; this._markCustom(); this.engine.setReverbLength(v); },
      });
      reverbHost.append(reverbWetKnob.el, reverbLengthKnob.el);

      // --- Echo: Dry/Wet + Rate ---
      const echoHost = this.$('.echo-knobs');
      echoHost.replaceChildren();
      const echoWetKnob = new Knob({
        label: 'Dry/Wet', min: 0, max: 1, value: preset.echoWet,
        format: (v) => `${Math.round(v * 100)}%`,
        onInput: (v) => { preset.echoWet = v; this._markCustom(); this.engine.setEchoWet(v); },
      });
      const echoRateKnob = new Knob({
        label: 'Rate', min: 40, max: 700, value: preset.echoRate,
        format: (v) => `${Math.round(v)} ms`,
        onInput: (v) => { preset.echoRate = v; this._markCustom(); this.engine.setEchoRate(v); },
      });
      echoHost.append(echoWetKnob.el, echoRateKnob.el);
    }

    _markCustom() {
      this.$('.preset-name').textContent = 'Eigene Einstellung';
      this.$all('.preset-grid .pick-cell').forEach((cell) => cell.setAttribute('aria-pressed', 'false'));
    }

    /** Zeichnet die ADSR-Hüllkurve als kleine Linie — Phasenbreiten sind
     *  proportional zu den Werten, nicht linear in Sekunden (sonst wäre ein
     *  kurzer Attack kaum sichtbar). */
    _renderEnvelope(preset) {
      const scale = (t, max) => 6 + Math.min(t, max) / max * 22;
      const raw = [scale(preset.attack, 1), scale(preset.decay, 1.5), 16, scale(preset.release, 2)];
      const sum = raw.reduce((a, b) => a + b, 0);
      const widths = raw.map((v) => v / sum * 84);
      const [aw, dw, hold, rw] = widths;
      const top = 4, bottom = 34;
      const sustainY = bottom - preset.sustain * (bottom - top);
      const x0 = 4;
      const points = [
        [x0, bottom],
        [x0 + aw, top],
        [x0 + aw + dw, sustainY],
        [x0 + aw + dw + hold, sustainY],
        [x0 + aw + dw + hold + rw, bottom],
      ];
      const d = 'M' + points.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' L');
      this.$('.envelope-path').setAttribute('d', d);
    }

    _renderOctaves() {
      const host = this.$('.octave-list');
      host.replaceChildren(...[2, 3, 4, 5, 6].map((octave) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'octave-btn';
        btn.textContent = String(octave);
        btn.setAttribute('aria-label', `Oktave ${octave}`);
        btn.setAttribute('aria-pressed', String(octave === this.state.octave));
        btn.addEventListener('click', () => { this.state.octave = octave; this._renderOctaves(); });
        return btn;
      }));
    }

    _renderArpSources() {
      const host = this.$('[data-field="arpSource"]');
      host.replaceChildren(...ARP_SOURCES.map((source) => {
        const opt = document.createElement('option');
        opt.value = source.id; opt.textContent = source.name;
        return opt;
      }));
      host.value = this.state.arpSourceId;
    }

    /* ---- Mini-Tastatur: robuste Pointer-Behandlung -------------------------
       Das Capture liegt auf dem Tastatur-Container (nicht auf der einzelnen
       Taste) — nur so bleiben Move/Up/Cancel für einen Finger zuverlässig
       adressierbar, auch wenn er über mehrere Tasten gleitet oder außerhalb
       losgelassen wird. Ohne das blieben beim Überstreichen mehrerer Tasten
       Noten hängen, weil das Capture einer einzelnen Taste alle weiteren
       Pointer-Ereignisse an genau diese Taste bindet und Nachbartasten dann
       gar keine eigenen Ereignisse mehr bekommen. */

    _wireKeyboard() {
      const host = this.$('.keyboard');
      const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'H'];
      const BLACK = new Set([1, 3, 6, 8, 10]);

      this._keyElements = NAMES.map((name, offset) => {
        const key = document.createElement('button');
        key.type = 'button';
        key.className = `key${BLACK.has(offset) ? ' is-black' : ''}`;
        key.dataset.offset = String(offset);
        key.tabIndex = -1;
        const label = document.createElement('span');
        label.className = 'key-name';
        label.textContent = name;
        key.append(label);
        host.append(key);
        return key;
      });

      const keyFromPoint = (x, y) => {
        const el = (this.shadowRoot.elementFromPoint ? this.shadowRoot.elementFromPoint(x, y) : document.elementFromPoint(x, y));
        const key = el?.closest?.('.key');
        return key && host.contains(key) ? key : null;
      };

      const midiFor = (key) => 12 * (this.state.octave + 1) + Number(key.dataset.offset);

      /**
       * Wechselt die für diesen Finger klingende Taste. Der sichtbare
       * Zustand (welche Taste "hot" ist, this.keyVoices) wird SOFORT und
       * synchron gesetzt — nur das eigentliche Auslösen des Tons wartet auf
       * engine.start(). Ohne diese Trennung entstand beim schnellen
       * Überstreichen mehrerer Tasten ein Wettlauf: bis der vorherige
       * asynchrone Aufruf fertig war, sah der nächste pointermove noch keinen
       * Eintrag in keyVoices, wurde deshalb verworfen, und die Taste blieb an
       * der falschen (oder gar keiner) Stelle "hängen".
       */
      const enterKey = (pointerId, key) => {
        const prev = this.keyVoices.get(pointerId);
        if (prev?.keyEl === key) return;
        if (prev) {
          this.keyVoices.delete(pointerId);
          this.engine.releaseVoice(prev.voice);
          if (!this.latchedNotes.has(prev.midi)) prev.keyEl.classList.remove('is-hot');
        }
        const midi = midiFor(key);
        key.classList.add('is-hot');
        const entry = { keyEl: key, voice: null, midi };
        this.keyVoices.set(pointerId, entry);

        (async () => {
          try { await this.engine.start(); this.engine.applyPreset(SYNTH_PRESETS[this.state.presetIndex]); }
          catch { this._setStatus('Web Audio ist hier nicht verfügbar.'); return; }
          // Der Finger kann während des Wartens schon weitergezogen sein —
          // dann gehört dieser (veraltete) Aufruf nicht mehr zur aktuellen Taste.
          if (this.keyVoices.get(pointerId) !== entry) return;
          entry.voice = this.engine.playTone(SYNTH_PRESETS[this.state.presetIndex], midi, this.engine.ctx.currentTime, .3);
        })();
      };

      const releaseKey = (pointerId) => {
        const held = this.keyVoices.get(pointerId);
        if (!held) return;
        this.keyVoices.delete(pointerId);
        if (held.voice) this.engine.releaseVoice(held.voice);
        if (!this.latchedNotes.has(held.midi)) held.keyEl.classList.remove('is-hot');
      };

      const toggleLatch = (key) => {
        const midi = midiFor(key);
        if (this.latchedNotes.has(midi)) { this.latchedNotes.delete(midi); key.classList.remove('is-hot', 'is-latched'); }
        else { this.latchedNotes.add(midi); key.classList.add('is-hot', 'is-latched'); }
      };

      // Ob ein Finger gerade innerhalb der Tastatur unten ist — unabhängig
      // davon, ob er GERADE eine Taste trifft. Die winzige Lücke zwischen
      // zwei Tasten (CSS-Grid-Gap) reicht bei einem schnellen Glissando
      // aus, um kurz zwischen zwei Tasten hindurchzurutschen; ohne diese
      // eigene Verfolgung hätte das fälschlich das ganze Gleiten beendet,
      // weil pointermove sich bis dahin an keyVoices orientierte — und das
      // war während so einer Lücke leer. Genau das ließ die Tastatur
      // "hängen".
      const pressedPointers = new Set();
      this._pressedPointers = pressedPointers; // damit close()/_releaseAllKeys() sie leeren kann

      host.addEventListener('pointerdown', (e) => {
        const key = e.target.closest('.key');
        if (!key) return;
        e.preventDefault();
        // Capture aufs Container-Element, nicht auf die einzelne Taste — nur
        // so bleiben Move/Up für diesen Finger adressierbar, auch wenn er
        // über mehrere Tasten gleitet (siehe Kommentar über _wireKeyboard).
        try { host.setPointerCapture(e.pointerId); } catch { /* siehe Knob._startDrag */ }
        pressedPointers.add(e.pointerId);
        if (this.state.latchOn) { toggleLatch(key); return; }
        enterKey(e.pointerId, key);
      });

      host.addEventListener('pointermove', (e) => {
        if (this.state.latchOn) return; // Latch reagiert nur auf Tap, kein Glissando nötig
        if (!pressedPointers.has(e.pointerId)) return;
        const key = keyFromPoint(e.clientX, e.clientY);
        if (key) enterKey(e.pointerId, key);
        else releaseKey(e.pointerId);
      });

      const end = (e) => {
        pressedPointers.delete(e.pointerId);
        if (!this.state.latchOn) releaseKey(e.pointerId);
      };
      host.addEventListener('pointerup', end);
      host.addEventListener('pointercancel', end);
    }

    _releaseAllKeys() {
      this.keyVoices.forEach((held) => this.engine.releaseVoiceFast(held.voice));
      this.keyVoices.clear();
      this.latchedNotes.clear();
      this._pressedPointers?.clear();
      this._keyElements?.forEach((key) => key.classList.remove('is-hot', 'is-latched'));
    }

    /* ---- Verkabelung ---- */

    _wireControls() {
      this.shadowRoot.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        if (action === 'close') this.close();
        else if (action === 'toggle-transport') this.playing ? this.stop() : this.start();
        else if (action === 'randomize') this.randomize();
        else if (action === 'toggle-melody') { this.state.melodyOn = !this.state.melodyOn; this._renderAll(); }
        else if (action === 'toggle-arp') { this.state.arpOn = !this.state.arpOn; this._renderAll(); }
        else if (action === 'toggle-latch') {
          this.state.latchOn = !this.state.latchOn;
          if (!this.state.latchOn) this._releaseAllKeys();
          this._renderAll();
        }
      });

      this.$('.bpm-input').addEventListener('input', (e) => {
        this.state.bpm = Number(e.target.value);
        this.$('.bpm-out').textContent = `${this.state.bpm} BPM`;
      });

      this.$('[data-field="arpSource"]').addEventListener('change', (e) => { this.state.arpSourceId = e.target.value; });
      this.$('[data-field="arpMode"]').addEventListener('change', (e) => { this.state.arpMode = e.target.value; });
      this.$('[data-field="arpDivision"]').addEventListener('change', (e) => { this.state.arpDivision = Number(e.target.value); });
      this.$('[data-field="arpOctaves"]').addEventListener('change', (e) => { this.state.arpOctaves = Number(e.target.value); });
    }

    _handleKeydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
      if (event.key !== 'Tab') return;
      const focusable = this.$all('button:not([disabled]), input:not([disabled]), select:not([disabled])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && this.shadowRoot.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && this.shadowRoot.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    static markup() {
      return `
<style>
  :host {
    --accent: #f868b0;
    --accent-rgb: 248,104,176;
    --bg: #fff7ec;
    --surface: #ffffff;
    --line: #eee0e9;
    --text: #241b3d;
    --muted: #8c81a6;
    position: fixed; inset: 0; z-index: 2147483000;
    background: var(--bg);
    display: flex; flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--text);
  }
  :host([hidden]) { display: none; }
  * { box-sizing: border-box; }
  button, input, select { font: inherit; color: inherit; }
  button { cursor: pointer; -webkit-tap-highlight-color: transparent; background: none; border: 0; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

  .lab-head {
    flex: 0 0 auto; display: flex; align-items: center; gap: 12px;
    padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left));
    border-bottom: 1px solid var(--line);
  }
  .lab-head-title { flex: 1; }
  .eyebrow { color: var(--accent); font-size: .68rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .lab-head h1 { font-size: 1.3rem; margin: .1em 0 0; letter-spacing: -.02em; font-weight: 800; }
  .lab-head h1 span { color: var(--accent); }
  .icon-btn {
    width: 42px; height: 42px; flex: 0 0 auto; display: grid; place-items: center;
    border: 1px solid var(--line); border-radius: 14px; background: var(--surface);
  }

  .lab-body {
    flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
    padding: 14px max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  }

  .panel { border: 1px solid var(--line); border-radius: 18px; padding: 14px; margin-bottom: 12px; background: var(--surface); }
  .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
  .panel-head h2 { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin: 0; font-weight: 700; }
  .item-name { font-size: .74rem; font-weight: 700; }

  .transport-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; }
  .transport-play {
    width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center;
    background: var(--accent); color: #fff;
  }
  .tempo-field { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 9px; }
  .bpm-out { font-weight: 800; font-size: 1.15rem; white-space: nowrap; }
  .status-line { font-size: .7rem; color: var(--muted); text-align: center; margin: 8px 0 0; }

  input[type=range] { width: 100%; accent-color: var(--accent); }

  .pick-cell {
    aspect-ratio: 1; border: 1px solid var(--line); border-radius: 12px; background: var(--bg);
    display: grid; place-items: center; padding: 4px;
  }
  .pick-cell svg { width: 22px; height: 22px; color: var(--muted); }
  .pick-cell[aria-pressed="true"] { border-color: var(--accent); background: rgba(var(--accent-rgb), .12); }
  .pick-cell[aria-pressed="true"] svg { color: var(--accent); }
  .pattern-grid, .melody-grid, .preset-grid { display: grid; grid-template-columns: repeat(8, minmax(0,1fr)); gap: 6px; }

  .track-list { display: grid; gap: 8px; margin-top: 12px; }
  .track-row { display: grid; grid-template-columns: 34px 62px 1fr 40px; gap: 8px; align-items: center; }
  .track-row.is-off { opacity: .4; }
  .track-roll {
    width: 34px; height: 34px; border: 1px solid var(--line); border-radius: 50%;
    display: grid; place-items: center; color: var(--muted); touch-action: none;
  }
  .track-roll svg { width: 16px; height: 16px; }
  .track-roll.is-active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .track-name { font-size: .66rem; font-weight: 700; }
  .track-toggle { border: 1px solid var(--line); border-radius: 999px; background: var(--bg); padding: 6px; font-size: .6rem; text-align: center; }
  .step-row { display: grid; grid-template-columns: repeat(16, 1fr); gap: 3px; }
  .step-cell { height: 11px; border-radius: 5px; background: rgba(0,0,0,.08); }
  .step-cell.is-hit { background: var(--accent); }
  .step-cell.is-now { outline: 2px solid var(--accent); outline-offset: 2px; }

  .toggle-pill { border: 1px solid var(--line); border-radius: 999px; background: var(--bg); padding: 8px 14px; font-size: .72rem; font-weight: 700; }
  .toggle-pill[aria-pressed="true"] { background: rgba(var(--accent-rgb), .13); border-color: var(--accent); color: var(--accent); }

  .synth-section { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); }
  .synth-section h3, .fx-box h3 { font-size: .72rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin: 0 0 10px; font-weight: 700; }
  .wave-row { display: flex; gap: 8px; margin-bottom: 14px; }
  .wave-btn { flex: 1; aspect-ratio: 1.3; border: 1px solid var(--line); border-radius: 12px; background: var(--bg); display: grid; place-items: center; color: var(--muted); }
  .wave-btn svg { width: 58%; height: 58%; }
  .wave-btn[aria-pressed="true"] { border-color: var(--accent); background: rgba(var(--accent-rgb), .12); color: var(--accent); }

  .adsr-row { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .envelope-graph { width: 100%; height: 44px; }
  .envelope-path { fill: none; stroke: var(--accent); stroke-width: 2; }
  .adsr-sliders { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
  .slider-field { font-size: .6rem; font-weight: 700; display: block; }
  .slider-field input { display: block; margin-top: 4px; }

  .knob-row { display: flex; gap: 16px; margin-top: 4px; flex-wrap: wrap; }
  .knob-field { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .knob { width: 58px; height: 58px; touch-action: none; }
  .knob-track { fill: none; stroke: var(--line); stroke-width: 2.6; }
  .knob-dot { fill: var(--accent); }
  .knob-label { font-size: .62rem; font-weight: 700; color: var(--muted); }
  .knob-value { font-size: .68rem; font-weight: 700; }

  .fx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
  .fx-box { border: 1px solid var(--line); border-radius: 14px; padding: 10px; }

  .arp-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .arp-controls select { border: 1px solid var(--line); border-radius: 10px; padding: 7px 8px; background: var(--bg); font-size: .72rem; }
  .arp-toggles { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }

  .keyboard-head { display: flex; align-items: center; justify-content: space-between; margin: 0 0 8px; }
  .keyboard-head strong { font-size: .8rem; }
  .octave-list { display: flex; gap: 4px; }
  .octave-btn { border: 1px solid var(--line); background: var(--bg); border-radius: 9px; padding: 5px 9px; font-size: .68rem; font-weight: 800; }
  .octave-btn[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); background: rgba(var(--accent-rgb), .1); }
  /* Gap bewusst winzig: bei einem schnellen Glissando über die Tastatur
     reicht eine größere Lücke zwischen den Tasten aus, den Finger kurz
     "zwischen" zwei Tasten treffen zu lassen (siehe _wireKeyboard). Alle
     Tasten sind außerdem gleich hoch — unterschiedliche Höhen wie bei einem
     echten Klavier hätten unterhalb der kürzeren (schwarzen) Tasten eine
     zusätzliche tote Zone ohne Trefffläche hinterlassen. */
  .keyboard { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1px; touch-action: none; }
  .key {
    height: 64px; border: 1px solid var(--line); border-radius: 0 0 9px 9px; background: var(--bg);
    display: flex; align-items: flex-end; justify-content: center; padding: 6px 1px;
    font-size: .56rem; font-weight: 800; touch-action: none; user-select: none; color: var(--muted);
  }
  .key.is-black { background: #2d2639; color: #cbb8d8; border-color: #2d2639; }
  .key.is-hot { background: var(--accent); border-color: var(--accent); color: #fff; }
  .key.is-latched { box-shadow: inset 0 0 0 2px #fff; }

  .foot-note { text-align: center; color: var(--muted); font-size: .66rem; padding: 4px 0 0; }

  @media (max-width: 380px) {
    .adsr-sliders { grid-template-columns: repeat(2, 1fr); }
    .fx-grid { grid-template-columns: 1fr; }
    .key { height: 54px; font-size: .5rem; }
  }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>

<header class="lab-head">
  <div class="lab-head-title">
    <div class="eyebrow">Du hast das Easter Egg gefunden</div>
    <h1>Chor <span>Groove</span> Lab</h1>
  </div>
  <button class="icon-btn close-btn" type="button" data-action="close" aria-label="Groove Lab schließen">${UI_ICON.close}</button>
</header>

<div class="lab-body">
  <section class="panel">
    <div class="transport-row">
      <button class="icon-btn transport-play" type="button" data-action="toggle-transport" aria-label="Groove starten">${UI_ICON.play}</button>
      <label class="tempo-field">
        <output class="bpm-out">106 BPM</output>
        <input class="bpm-input" type="range" min="72" max="144" value="106" aria-label="Tempo">
      </label>
      <button class="icon-btn" type="button" data-action="randomize" aria-label="Zufälliger Groove">${UI_ICON.dice}</button>
    </div>
    <p class="status-line" role="status">Bereit — am besten mit Kopfhörern.</p>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>Drumloop</h2><span class="item-name pattern-name"></span></div>
    <div class="pattern-grid"></div>
    <div class="track-list"></div>
  </section>

  <section class="panel">
    <div class="panel-head">
      <h2>Melodie</h2>
      <button class="toggle-pill melody-toggle" type="button" data-action="toggle-melody" aria-pressed="true">Melodie an</button>
    </div>
    <div class="panel-head"><span class="item-name melody-name"></span></div>
    <div class="melody-grid"></div>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>Synthesizer</h2><span class="item-name preset-name"></span></div>
    <div class="preset-grid"></div>

    <div class="synth-section">
      <h3>Oszillator</h3>
      <div class="wave-row" role="group" aria-label="Wellenform"></div>

      <h3>Hüllkurve</h3>
      <div class="adsr-row">
        <svg class="envelope-graph" viewBox="0 0 92 40" preserveAspectRatio="none">
          <path class="envelope-path" d=""/>
        </svg>
        <div class="adsr-sliders"></div>
      </div>

      <h3>Filter</h3>
      <div class="knob-row filter-knobs"></div>
    </div>

    <div class="fx-grid">
      <div class="fx-box">
        <h3>Reverb</h3>
        <div class="knob-row reverb-knobs"></div>
      </div>
      <div class="fx-box">
        <h3>Echo</h3>
        <div class="knob-row echo-knobs"></div>
      </div>
    </div>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>Arpeggiator</h2></div>
    <div class="arp-toggles">
      <button class="toggle-pill arp-toggle" type="button" data-action="toggle-arp" aria-pressed="false">Arp aus</button>
      <button class="toggle-pill latch-toggle" type="button" data-action="toggle-latch" aria-pressed="false">${UI_ICON.latch} Latch</button>
    </div>
    <div class="arp-controls">
      <select data-field="arpSource" aria-label="Notenvorrat"></select>
      <select data-field="arpMode" aria-label="Richtung">
        <option value="up">Aufwärts</option>
        <option value="down">Abwärts</option>
        <option value="updown">Auf/Ab</option>
        <option value="random">Zufall</option>
      </select>
      <select data-field="arpDivision" aria-label="Geschwindigkeit">
        <option value="1">1/16</option>
        <option value="2">1/8</option>
        <option value="4">1/4</option>
      </select>
      <select data-field="arpOctaves" aria-label="Oktavbereich">
        <option value="1">1 Oktave</option>
        <option value="2">2 Oktaven</option>
        <option value="3">3 Oktaven</option>
      </select>
    </div>
    <p class="foot-note">Latch an: Tasten antippen hält sie — der Arp läuft über die gehaltenen Töne, bis du sie erneut antippst.</p>
  </section>

  <section class="panel">
    <div class="keyboard-head">
      <strong>Mini-Klaviatur</strong>
      <div class="octave-list"></div>
    </div>
    <div class="keyboard"></div>
    <p class="foot-note">100 % lokal · Web Audio API · beim Schließen vollständig beendet</p>
  </section>
</div>`;
    }
  }

  if (!customElements.get('chor-groove-lab')) customElements.define('chor-groove-lab', GrooveLabView);

  global.ChorGrooveLab = {
    open(options) {
      let lab = document.querySelector('chor-groove-lab');
      if (!lab) {
        lab = document.createElement('chor-groove-lab');
        lab.hidden = true;
        document.body.append(lab);
      }
      lab.open(options);
      return lab;
    },
  };
})(window);
