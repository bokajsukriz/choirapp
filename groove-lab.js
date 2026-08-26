/* Chor Groove Lab — lazy Easter Egg for the BVG choir app.
 * This file is cached for offline use, but only parsed after the secret trigger.
 */
(function (global) {
  'use strict';

  const DRUMS = [
    { icon: '🥁', name: 'Deep Pocket', kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [14] },
    { icon: '🪩', name: 'Disco Lift', kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], open: [14] },
    { icon: '🕺', name: 'Neo Soul', kick: [0, 3, 7, 10, 14], snare: [4, 12], ghost: [6, 15], hat: [1, 3, 5, 7, 9, 11, 13, 15] },
    { icon: '🧩', name: 'Broken Funk', kick: [0, 5, 8, 11, 15], snare: [4, 12], ghost: [7, 14], hat: [0, 2, 3, 6, 8, 10, 11, 14] },
    { icon: '🪘', name: 'Afro Pocket', kick: [0, 3, 7, 10, 13], clap: [4, 12], ghost: [6], hat: [1, 4, 6, 9, 11, 14] },
    { icon: '🌒', name: 'Half-Time Bloom', kick: [0, 3, 10, 14], snare: [8], ghost: [12, 15], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [14] },
    { icon: '🛸', name: 'Offbeat House', kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], open: [14] },
    { icon: '🤖', name: 'Glitch Choir', kick: [0, 5, 9, 12, 15], snare: [4, 11], clap: [7, 14], hat: [1, 3, 6, 10, 13], open: [15] },
    { icon: '🛼', name: 'Boogie Skip', kick: [0, 4, 7, 10, 12], snare: [4, 12], ghost: [14], hat: [1, 3, 5, 7, 9, 11, 13, 15], open: [15] },
    { icon: '🌺', name: 'Latin Pop', kick: [0, 3, 8, 11, 13], clap: [4, 12], ghost: [6, 15], hat: [0, 2, 5, 6, 9, 10, 14] },
    { icon: '⚡', name: 'Electro Pulse', kick: [0, 4, 9, 12, 14], snare: [4, 12], ghost: [7], hat: [2, 6, 10, 14], open: [14] },
    { icon: '🎸', name: 'Indie Drive', kick: [0, 6, 8, 10, 14], snare: [4, 12], ghost: [3], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [15] },
    { icon: '🎈', name: 'Elastic Bounce', kick: [0, 4, 7, 10, 12, 15], clap: [4, 12], ghost: [2], hat: [1, 3, 5, 7, 9, 11, 13], open: [15] },
    { icon: '🌴', name: 'Tropic Shift', kick: [0, 5, 8, 11, 13], snare: [4, 12], ghost: [3, 15], hat: [2, 6, 9, 10, 14], open: [15] },
    { icon: '🫧', name: 'Loose Shuffle', kick: [0, 6, 8, 14], snare: [4, 12], ghost: [3, 11, 15], hat: [0, 3, 6, 8, 11, 14], open: [15] },
    { icon: '💥', name: 'Break Room', kick: [0, 3, 7, 10, 14], snare: [4, 8, 12], ghost: [6, 15], hat: [0, 2, 5, 6, 9, 10, 13, 15] },
  ];

  const MELODIES = [
    { icon: '🌿', name: 'Velvet Rise', notes: [[0, 0, 2], [3, 4, 1], [5, 7, 2], [8, 9, 1], [10, 7, 1], [13, 4, 2]] },
    { icon: '✨', name: 'Lydian Wink', notes: [[0, 0, 1], [3, 2, 1], [5, 6, 1], [8, 7, 2], [11, 11, 1], [13, 9, 1], [15, 7, 1]] },
    { icon: '🏮', name: 'Blue Lantern', notes: [[0, 0, 2], [3, 3, 1], [6, 7, 1], [8, 10, 2], [11, 7, 1], [13, 2, 1], [15, 3, 1]] },
    { icon: '☀️', name: 'Sunbeam', notes: [[0, 4, 1], [2, 7, 1], [5, 9, 1], [8, 11, 1], [10, 7, 1], [12, 4, 1], [15, 2, 1]] },
    { icon: '🌙', name: 'Night Window', notes: [[0, 0, 3], [5, 7, 1], [8, 10, 2], [11, 3, 1], [14, 2, 1], [15, 0, 2]] },
    { icon: '🔥', name: 'Funk Thread', notes: [[0, 0, 1], [2, 3, 1], [5, 5, 1], [7, 7, 1], [10, 10, 1], [12, 7, 1], [14, 3, 1]] },
    { icon: '💎', name: 'Glass Runner', notes: [[0, 0, 1], [1, 2, 1], [3, 4, 1], [5, 7, 1], [8, 11, 1], [10, 9, 1], [12, 7, 1], [15, 2, 1]] },
    { icon: '🌅', name: 'Afterglow', notes: [[0, -5, 2], [3, 0, 2], [7, 4, 1], [9, 7, 2], [12, 9, 1], [14, 7, 1], [15, 4, 2]] },
    { icon: '🪐', name: 'Soft Orbit', notes: [[0, 0, 2], [3, 7, 1], [5, 14, 2], [8, 16, 1], [10, 9, 1], [12, 7, 2], [15, 2, 1]] },
    { icon: '🕊️', name: 'Open Fifths', notes: [[0, 0, 2], [4, 7, 2], [7, 12, 1], [9, 9, 2], [12, 5, 1], [14, 2, 2]] },
    { icon: '🪩', name: 'Disco Ribbon', notes: [[1, 7, 1], [3, 12, 1], [5, 9, 1], [7, 16, 1], [9, 12, 1], [11, 7, 1], [13, 9, 1], [15, 4, 1]] },
    { icon: '🌫️', name: 'Suspended Air', notes: [[0, 0, 3], [4, 5, 2], [7, 7, 2], [10, 2, 1], [12, 10, 2], [15, 7, 2]] },
    { icon: '🥀', name: 'Minor Bloom', notes: [[0, 12, 2], [3, 10, 1], [5, 7, 2], [8, 3, 2], [11, 5, 1], [13, 2, 1], [15, 0, 2]] },
    { icon: '🌈', name: 'Bright Strange', notes: [[0, 0, 1], [2, 2, 1], [4, 6, 2], [7, 7, 1], [9, 11, 2], [12, 9, 1], [14, 4, 2]] },
    { icon: '❔', name: 'Question Mark', notes: [[0, 0, 1], [3, 1, 1], [5, 4, 1], [8, 3, 1], [10, 7, 1], [12, 6, 1], [15, 2, 2]] },
    { icon: '🪡', name: 'Kintsugi', notes: [[0, 0, 1], [2, 4, 1], [5, 9, 2], [8, 7, 1], [10, 4, 1], [12, 2, 1], [14, 9, 2]] },
  ];

  const SOUNDS = [
    { icon: '🌸', name: 'Velvet Choir', wave: 'triangle', attack: .18, decay: .4, sustain: .72, release: .72, cutoff: 3000, resonance: 1.3, reverb: .34, echo: .04 },
    { icon: '🫧', name: 'Breath Glass', wave: 'sine', attack: .3, decay: .5, sustain: .62, release: 1.05, cutoff: 6200, resonance: 1.1, reverb: .48, echo: .11 },
    { icon: '📼', name: 'Tape Keys', wave: 'triangle', attack: .015, decay: .3, sustain: .4, release: .36, cutoff: 3300, resonance: 2, reverb: .14, echo: .03 },
    { icon: '💡', name: 'Neon Pluck', wave: 'sawtooth', attack: .006, decay: .16, sustain: .1, release: .18, cutoff: 5000, resonance: 6, reverb: .12, echo: .24 },
    { icon: '🌙', name: 'Moon Pad', wave: 'sine', attack: .62, decay: .8, sustain: .86, release: 1.5, cutoff: 2300, resonance: .7, reverb: .55, echo: .1 },
    { icon: '🎺', name: 'Soft Brass', wave: 'sawtooth', attack: .07, decay: .26, sustain: .68, release: .34, cutoff: 2800, resonance: 3.5, reverb: .18, echo: .02 },
    { icon: '💎', name: 'Crystal Drops', wave: 'sine', attack: .005, decay: .6, sustain: .04, release: 1.2, cutoff: 8500, resonance: 3, reverb: .52, echo: .2 },
    { icon: '🌊', name: 'Midnight Dub', wave: 'square', attack: .018, decay: .38, sustain: .2, release: .48, cutoff: 1500, resonance: 10, reverb: .24, echo: .43 },
    { icon: '🧡', name: 'Amber Pad', wave: 'triangle', attack: .46, decay: .62, sustain: .79, release: 1.38, cutoff: 2750, resonance: 1.6, reverb: .47, echo: .08 },
    { icon: '🪈', name: 'Hollow Reed', wave: 'square', attack: .035, decay: .24, sustain: .58, release: .36, cutoff: 2350, resonance: 5.8, reverb: .17, echo: .04 },
    { icon: '🟠', name: 'Rubber Funk', wave: 'sawtooth', attack: .005, decay: .21, sustain: .22, release: .15, cutoff: 1700, resonance: 9.4, reverb: .07, echo: .08 },
    { icon: '🧸', name: 'Choir Toy', wave: 'triangle', attack: .055, decay: .22, sustain: .52, release: .58, cutoff: 4700, resonance: 2.3, reverb: .31, echo: .16 },
    { icon: '🌄', name: 'Wide Horizon', wave: 'sawtooth', attack: .58, decay: .76, sustain: .81, release: 1.62, cutoff: 2050, resonance: 2.1, reverb: .61, echo: .13 },
    { icon: '🔔', name: 'Silver Bell', wave: 'sine', attack: .004, decay: .62, sustain: .04, release: 1.45, cutoff: 9200, resonance: 3.1, reverb: .55, echo: .2 },
    { icon: '🕯️', name: 'Dusty Organ', wave: 'square', attack: .028, decay: .2, sustain: .86, release: .42, cutoff: 1850, resonance: 1.2, reverb: .24, echo: .02 },
    { icon: '👾', name: 'Pixel Velvet', wave: 'square', attack: .045, decay: .28, sustain: .46, release: .62, cutoff: 2600, resonance: 4.2, reverb: .29, echo: .19 },
  ];

  const noteHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const svg = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  const icons = {
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    play: svg('<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>'),
    pause: svg('<path d="M8 5v14M16 5v14"/>'),
    dice: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1" fill="currentColor" stroke="none"/>'),
  };

  class GrooveLab extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.state = {
        bpm: 108, drum: 0, melody: 0, sound: 0, melodyOn: true, octave: 4,
        wave: 'triangle', attack: .18, decay: .4, sustain: .72, release: .72,
        cutoff: 3000, resonance: 1.3, reverb: .34, echo: .04,
        arpOn: false, arpRate: 1, arpMode: 'up', arpStep: 0,
        trackOn: { kick: true, snare: true, clap: true, hat: true, bass: true },
        trackVariant: { kick: 0, snare: 0, clap: 0, hat: 0, bass: 0 },
      };
      this.ctx = null;
      this.nodes = null;
      this.playing = false;
      this.step = 0;
      this.nextTime = 0;
      this.timer = 0;
      this.raf = 0;
      this.queue = [];
      this.voices = new Set();
      this.pointerVoices = new Map();
      this.returnFocus = null;
      this.previousOverflow = '';
      this.onKeydown = (event) => this._keydown(event);
      this.shadowRoot.innerHTML = this._template();
      this._bind();
      this._render();
    }

    _template() {
      return `<style>
        :host{--gl-accent:#f868b0;--gl-accent-rgb:248,104,176;position:fixed;inset:0;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#241b3d}
        *{box-sizing:border-box}button,input{font:inherit}button{color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}button:focus-visible,input:focus-visible{outline:3px solid var(--gl-accent);outline-offset:2px}svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
        .veil{height:100%;background:#fff7ec;display:flex;justify-content:center}
        .lab{isolation:isolate;position:relative;width:100%;height:100%;overflow:auto;overscroll-behavior:contain;background:#fff7ec;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
        .lab:before,.lab:after{content:"";position:fixed;border-radius:50%;pointer-events:none;z-index:-1;opacity:.25}.lab:before{width:230px;height:230px;right:-70px;top:-80px;background:#33c9dc}.lab:after{width:290px;height:290px;left:-130px;bottom:-130px;background:#ffd23f}
        header{display:flex;align-items:center;gap:12px;margin-bottom:14px}.title{flex:1}.eyebrow{color:var(--gl-accent);font-size:.7rem;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.title h1{font-size:clamp(1.65rem,6vw,2.3rem);line-height:1;margin:.08em 0 0;letter-spacing:-.04em}.title h1 span{color:var(--gl-accent)}
        .round{width:46px;height:46px;display:grid;place-items:center;border:1px solid #eedde7;border-radius:50%;background:#fff}.card{background:rgba(255,255,255,.95);border:1px solid #f1dce7;border-radius:20px;padding:14px;margin-bottom:12px;box-shadow:0 9px 24px rgba(36,27,61,.07)}
        .transport{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px}.play{width:56px;height:56px;border:0;border-radius:50%;display:grid;place-items:center;background:var(--gl-accent);color:#fff;box-shadow:0 7px 18px rgba(var(--gl-accent-rgb),.32)}.tempo{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:9px}.tempo output{font-weight:850;font-size:1.25rem;white-space:nowrap}.status{font-size:.72rem;color:#8c81a6;text-align:center;margin-top:8px}
        input[type=range]{width:100%;accent-color:var(--gl-accent)}.section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.section-head h2{font-size:.78rem;color:#8c81a6;text-transform:uppercase;letter-spacing:.08em;margin:0}.name{font-size:.75rem;font-weight:750}.choices{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px}.choice{position:relative;aspect-ratio:1;border:1px solid #f1dce7;border-radius:14px;background:#fff;font-size:1.25rem}.choice small{position:absolute;right:4px;bottom:3px;font-size:.52rem;color:#8c81a6}.choice[aria-pressed=true]{border-color:var(--gl-accent);background:rgba(var(--gl-accent-rgb),.13);box-shadow:0 0 0 2px rgba(var(--gl-accent-rgb),.12)}
        .pattern{display:grid;grid-template-columns:76px 1fr 42px;align-items:center;gap:7px 9px;margin-top:12px}.pattern-label{min-height:32px;border:1px solid #f1dce7;border-radius:10px;background:#fff;padding:4px 5px;font-size:.64rem;font-weight:850;color:#5f5577;text-align:left}.pattern-label small{display:block;color:#8c81a6;font-size:.52rem}.track-toggle{width:42px;min-height:32px;border:1px solid #f1dce7;border-radius:999px;background:#fff;font-size:.58rem;font-weight:850}.track-toggle[aria-pressed=true]{border-color:var(--gl-accent);background:rgba(var(--gl-accent-rgb),.13)}.track-off{opacity:.38}.steps{display:grid;grid-template-columns:repeat(16,1fr);gap:4px}.step{height:12px;border-radius:6px;background:#eee5eb}.step:nth-child(4n+1){margin-left:3px}.step.hit{background:var(--gl-accent)}.step.ghost{background:rgba(var(--gl-accent-rgb),.38)}.step.ratchet{background:repeating-linear-gradient(90deg,var(--gl-accent) 0 2px,rgba(var(--gl-accent-rgb),.25) 2px 4px)}.step.now{outline:2px solid var(--gl-accent);outline-offset:2px}.toggle{border:1px solid #f1dce7;border-radius:999px;background:#fff;padding:7px 10px;font-size:.72rem;font-weight:800}.toggle[aria-pressed=true]{background:rgba(var(--gl-accent-rgb),.13);border-color:var(--gl-accent)}
        .sound-row{display:grid;grid-template-columns:repeat(8,1fr);gap:7px}.sound{position:relative;aspect-ratio:1;border:1px solid #f1dce7;border-radius:14px;background:#fff;padding:6px 3px;font-size:.62rem;font-weight:750}.sound b{display:block;font-size:1.2rem}.sound small{position:absolute;right:4px;bottom:3px;font-size:.52rem;color:#8c81a6}.sound[aria-pressed=true]{border-color:var(--gl-accent);background:rgba(var(--gl-accent-rgb),.13);box-shadow:0 0 0 2px rgba(var(--gl-accent-rgb),.12)}
        .synth-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.module{border:1px solid #f1dce7;border-radius:16px;padding:12px;background:#fff}.module h3{font-size:.76rem;margin:0 0 10px}.wave-row,.arp-row{display:flex;gap:6px;flex-wrap:wrap}.mini{flex:1;border:1px solid #f1dce7;border-radius:10px;background:#fff;padding:7px;font-size:.7rem;font-weight:800}.mini[aria-pressed=true]{border-color:#33c9dc;background:#e7f9fb}.controls{display:grid;gap:7px}.control{display:grid;grid-template-columns:64px 1fr 48px;align-items:center;gap:7px;font-size:.68rem;font-weight:750}.control output{text-align:right;color:#8c81a6;font-variant-numeric:tabular-nums}.arp-chord{font-size:.68rem;color:#8c81a6;margin:8px 0 0}
        .keyboard-head{display:flex;align-items:center;justify-content:space-between;margin:12px 0 8px}.keyboard-head strong{font-size:.82rem}.octaves{display:flex;gap:4px}.oct{border:1px solid #f1dce7;background:#fff;border-radius:9px;padding:5px 8px;font-size:.7rem;font-weight:800}.oct[aria-pressed=true]{border-color:#33c9dc;background:#e7f9fb}.keys{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}.key{height:68px;border:1px solid #e9dce4;border-radius:0 0 9px 9px;background:#fff;display:flex;align-items:flex-end;justify-content:center;padding:5px 1px;font-size:.58rem;font-weight:800;touch-action:none;user-select:none}.key.black{height:55px;background:#2d2639;color:#fff;border-color:#2d2639}.key.hot{background:var(--gl-accent);border-color:var(--gl-accent);color:#fff}.foot{text-align:center;color:#8c81a6;font-size:.68rem;padding:3px 0 7px}
        @media(max-width:620px){.lab{padding:max(11px,env(safe-area-inset-top)) max(11px,env(safe-area-inset-right)) max(11px,env(safe-area-inset-bottom)) max(11px,env(safe-area-inset-left))}.choices{gap:4px}.choice{border-radius:11px}.sound-row{gap:4px}.sound{font-size:.5rem;border-radius:11px}.synth-grid{grid-template-columns:1fr}.key{height:58px;font-size:.5rem}.key.black{height:48px}.tempo{grid-template-columns:1fr}.tempo output{font-size:1.05rem}.tempo input{grid-row:2}.pattern{grid-template-columns:58px 1fr 36px;gap:5px}.pattern-label{font-size:.56rem;padding:3px}.track-toggle{width:36px;font-size:.52rem}.step{height:10px}}
        @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
      </style>
      <div class="veil">
        <main class="lab" role="dialog" aria-modal="true" aria-labelledby="gl-title">
          <header><div class="title"><div class="eyebrow">Du hast das Easter Egg gefunden 🎉</div><h1 id="gl-title">Chor <span>Groove</span> Lab</h1></div><button class="round" data-action="close" aria-label="Groove Lab schließen">${icons.close}</button></header>
          <section class="card"><div class="transport"><button class="play" data-action="play" aria-label="Groove starten">${icons.play}</button><label class="tempo"><output data-out="bpm">108 BPM</output><input data-control="bpm" type="range" min="72" max="144" value="108" aria-label="Tempo"></label><button class="round" data-action="random" aria-label="Zufälliger Groove">${icons.dice}</button></div><div class="status" role="status" data-out="status">Bereit · Kopfhörer empfohlen</div></section>
          <section class="card"><div class="section-head"><h2>Drumloops · 2 × 8</h2><span class="name" data-out="drum"></span></div><div class="choices" data-host="drums"></div><p class="arp-chord">Spurname tippen: Original → Ratchet → 16tel</p><div class="pattern" data-host="pattern"></div></section>
          <section class="card"><div class="section-head"><h2>Melodien · 2 × 8</h2><button class="toggle" data-action="melody" aria-pressed="true">🎵 an</button></div><div class="section-head"><span class="name" data-out="melody"></span></div><div class="choices" data-host="melodies"></div></section>
          <section class="card"><div class="section-head"><h2>Synthesizer · 2 × 8 Presets</h2><span class="name" data-out="sound"></span></div><div class="sound-row" data-host="sounds"></div>
            <div class="synth-grid">
              <div class="module"><h3>Wellenform</h3><div class="wave-row" data-host="waves"></div><h3 style="margin-top:12px">Filter</h3><div class="controls"><label class="control">Cutoff<input data-synth="cutoff" type="range" min="120" max="10000"><output data-value="cutoff"></output></label><label class="control">Resonanz<input data-synth="resonance" type="range" min="0.1" max="18" step="0.1"><output data-value="resonance"></output></label></div></div>
              <div class="module"><h3>ADSR Envelope</h3><div class="controls"><label class="control">Attack<input data-synth="attack" type="range" min=".005" max="1.2" step=".005"><output data-value="attack"></output></label><label class="control">Decay<input data-synth="decay" type="range" min=".01" max="1.5" step=".01"><output data-value="decay"></output></label><label class="control">Sustain<input data-synth="sustain" type="range" min="0" max="1" step=".01"><output data-value="sustain"></output></label><label class="control">Release<input data-synth="release" type="range" min=".01" max="2" step=".01"><output data-value="release"></output></label></div></div>
              <div class="module"><h3>Effekte</h3><div class="controls"><label class="control">Reverb<input data-synth="reverb" type="range" min="0" max=".65" step=".01"><output data-value="reverb"></output></label><label class="control">Echo<input data-synth="echo" type="range" min="0" max=".55" step=".01"><output data-value="echo"></output></label></div></div>
              <div class="module"><div class="section-head"><h3 style="margin:0">Arpeggiator</h3><button class="toggle" data-action="arp" aria-pressed="false">⚡ aus</button></div><div class="arp-row" data-host="arp-modes"></div><div class="arp-row" style="margin-top:6px" data-host="arp-rates"></div><p class="arp-chord">Akkord: Grundton · Terz · Quinte · Septime · Oktave</p></div>
            </div>
            <div class="keyboard-head"><strong>Klaviatur · gedrückt halten und ziehen</strong><div class="octaves" data-host="octaves"></div></div><div class="keys" data-host="keys"></div>
          </section>
          <div class="foot">100 % lokal · Web Audio API · beim Schließen vollständig beendet</div>
        </main>
      </div>`;
    }

    $(selector) { return this.shadowRoot.querySelector(selector); }
    $$(selector) { return Array.from(this.shadowRoot.querySelectorAll(selector)); }

    _bind() {
      this.shadowRoot.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'close') this.close();
        if (action === 'play') this.playing ? this.stop() : this.start();
        if (action === 'random') this.randomize();
        if (action === 'melody') {
          this.state.melodyOn = !this.state.melodyOn;
          this._renderToggle();
        }
        if (action === 'arp') {
          this.state.arpOn = !this.state.arpOn;
          this.state.arpStep = 0;
          this._renderArp();
        }
      });
      this.$('[data-control="bpm"]').addEventListener('input', (event) => {
        this.state.bpm = Number(event.target.value);
        this.$('[data-out="bpm"]').textContent = `${this.state.bpm} BPM`;
      });
      this.$$('[data-synth]').forEach((input) => input.addEventListener('input', () => {
        this.state[input.dataset.synth] = Number(input.value);
        this.state.sound = -1;
        this._renderSynthValues();
        this._renderSounds();
        this._updateFx();
      }));
      this.$('.veil').addEventListener('pointerdown', (event) => {
        if (event.target === this.$('.veil')) this.close();
      });
    }

    _render() {
      this._renderChoices('drums', DRUMS, 'drum');
      this._renderChoices('melodies', MELODIES, 'melody');
      this._renderSounds();
      this._renderWaves();
      this._renderArp();
      this._renderSynthValues();
      this._renderOctaves();
      this._renderKeys();
      this._renderPattern();
      this._renderToggle();
      this.$('[data-out="drum"]').textContent = DRUMS[this.state.drum].name;
      this.$('[data-out="melody"]').textContent = MELODIES[this.state.melody].name;
      this.$('[data-out="sound"]').textContent = this.state.sound >= 0 ? SOUNDS[this.state.sound].name : 'Eigene Einstellung';
      this.$('[data-out="bpm"]').textContent = `${this.state.bpm} BPM`;
      this.$('[data-control="bpm"]').value = this.state.bpm;
    }

    _renderChoices(hostName, items, stateName) {
      const host = this.$(`[data-host="${hostName}"]`);
      host.replaceChildren(...items.map((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choice';
        button.title = item.name;
        button.setAttribute('aria-label', item.name);
        button.setAttribute('aria-pressed', String(this.state[stateName] === index));
        button.innerHTML = `${item.icon}<small>${index + 1}</small>`;
        button.addEventListener('click', () => {
          this.state[stateName] = index;
          this._render();
        });
        return button;
      }));
    }

    _renderSounds() {
      const host = this.$('[data-host="sounds"]');
      host.replaceChildren(...SOUNDS.map((sound, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sound';
        button.setAttribute('aria-pressed', String(index === this.state.sound));
        button.innerHTML = `<b>${sound.icon}</b>${sound.name}<small>${index + 1}</small>`;
        button.addEventListener('click', () => {
          this.state.sound = index;
          Object.assign(this.state, sound);
          this._render();
          this._updateFx();
        });
        return button;
      }));
    }

    _renderOctaves() {
      const host = this.$('[data-host="octaves"]');
      host.replaceChildren(...[0, 1, 2, 3, 4, 5, 6].map((octave) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'oct'; button.textContent = octave;
        button.setAttribute('aria-label', `Oktave ${octave}`);
        button.setAttribute('aria-pressed', String(octave === this.state.octave));
        button.addEventListener('click', () => { this.state.octave = octave; this._renderOctaves(); this._renderKeys(); });
        return button;
      }));
    }

    _renderKeys() {
      const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'H'];
      const black = new Set([1, 3, 6, 8, 10]);
      const host = this.$('[data-host="keys"]');
      host.replaceChildren(...names.map((name, offset) => {
        const key = document.createElement('button');
        key.type = 'button'; key.className = `key${black.has(offset) ? ' black' : ''}`;
        key.textContent = `${name}${this.state.octave}`;
        key.dataset.midi = 12 * (this.state.octave + 1) + offset;
        return key;
      }));
      host.onpointerdown = async (event) => {
        event.preventDefault();
        try {
          await this._ensureAudio();
          host.setPointerCapture(event.pointerId);
          this._playPointerKey(event.pointerId, this._keyAt(event.clientX, event.clientY));
        } catch (_) { this._status('Audio ist hier nicht verfügbar'); }
      };
      host.onpointermove = (event) => {
        if (!host.hasPointerCapture(event.pointerId)) return;
        this._playPointerKey(event.pointerId, this._keyAt(event.clientX, event.clientY));
      };
      const release = (event) => this._playPointerKey(event.pointerId, null);
      host.onpointerup = release;
      host.onpointercancel = release;
    }

    _keyAt(x, y) {
      const key = this.shadowRoot.elementFromPoint?.(x, y)?.closest?.('.key');
      return key && this.$('[data-host="keys"]').contains(key) ? key : null;
    }

    _playPointerKey(pointerId, key) {
      const current = this.pointerVoices.get(pointerId);
      if (current?.key === key) return;
      if (current) { current.key.classList.remove('hot'); this._releaseVoice(current.voice); this.pointerVoices.delete(pointerId); }
      if (!key || !this.ctx) return;
      key.classList.add('hot');
      const voice = this._voice(Number(key.dataset.midi), this.ctx.currentTime, .35);
      this.pointerVoices.set(pointerId, { key, voice });
    }

    _renderPattern() {
      const pattern = DRUMS[this.state.drum];
      const rows = [
        ['kick', 'Kick', pattern.kick || [], []],
        ['snare', 'Snare', pattern.snare || [], pattern.ghost || []],
        ['clap', 'Clap', pattern.clap || [], []],
        ['hat', 'Hi-Hat', pattern.hat || [], pattern.open || []],
        ['bass', 'Basslauf', this._bassSteps(pattern), []],
      ];
      const parts = [];
      const variantNames = ['Original', 'Ratchet', '16tel'];
      for (const [id, label, originalHits, ghosts] of rows) {
        const variant = this.state.trackVariant[id];
        const hits = variant === 2 ? Array.from({ length: 16 }, (_, index) => index) : originalHits;
        const labelElement = document.createElement('button');
        labelElement.type = 'button'; labelElement.className = 'pattern-label';
        labelElement.innerHTML = `${label}<small>${variantNames[variant]}</small>`;
        labelElement.title = `${label}: Variante wechseln`;
        labelElement.setAttribute('aria-label', `${label}, Variante ${variantNames[variant]}. Variante wechseln`);
        labelElement.addEventListener('click', () => {
          this.state.trackVariant[id] = (variant + 1) % 3;
          this._renderPattern();
        });
        parts.push(labelElement);
        const steps = document.createElement('div'); steps.className = `steps${this.state.trackOn[id] ? '' : ' track-off'}`;
        for (let index = 0; index < 16; index++) {
          const dot = document.createElement('i');
          dot.className = `step${hits.includes(index) ? variant === 1 ? ' ratchet' : ' hit' : ghosts.includes(index) ? ' ghost' : ''}`;
          dot.dataset.step = index; dot.title = `${label} · Schritt ${index + 1}`; steps.append(dot);
        }
        parts.push(steps);
        const toggle = document.createElement('button');
        toggle.type = 'button'; toggle.className = 'track-toggle'; toggle.textContent = this.state.trackOn[id] ? 'An' : 'Aus';
        toggle.setAttribute('aria-label', `${label} ${this.state.trackOn[id] ? 'ausschalten' : 'einschalten'}`);
        toggle.setAttribute('aria-pressed', String(this.state.trackOn[id]));
        toggle.addEventListener('click', () => { this.state.trackOn[id] = !this.state.trackOn[id]; this._renderPattern(); });
        parts.push(toggle);
      }
      this.$('[data-host="pattern"]').replaceChildren(...parts);
    }

    _bassSteps(pattern) {
      const kicks = pattern.kick || [];
      return kicks.filter((_, index) => index % 2 === 0 || kicks.length < 5);
    }

    _renderWaves() {
      const host = this.$('[data-host="waves"]');
      const waves = [['sine', '∿ Sinus'], ['triangle', '△ Dreieck'], ['square', '▣ Rechteck'], ['sawtooth', '◢ Sägezahn']];
      host.replaceChildren(...waves.map(([value, label]) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'mini'; button.textContent = label;
        button.setAttribute('aria-pressed', String(this.state.wave === value));
        button.addEventListener('click', () => { this.state.wave = value; this.state.sound = -1; this._renderWaves(); this._renderSounds(); this.$('[data-out="sound"]').textContent = 'Eigene Einstellung'; });
        return button;
      }));
    }

    _renderSynthValues() {
      for (const input of this.$$('[data-synth]')) input.value = this.state[input.dataset.synth];
      const formats = { cutoff: (v) => `${Math.round(v)} Hz`, resonance: (v) => Number(v).toFixed(1), attack: seconds, decay: seconds, sustain: percent, release: seconds, reverb: percent, echo: percent };
      for (const output of this.$$('[data-value]')) output.textContent = formats[output.dataset.value](this.state[output.dataset.value]);
      function seconds(value) { return `${Number(value).toFixed(2)} s`; }
      function percent(value) { return `${Math.round(Number(value) * 100)} %`; }
    }

    _renderArp() {
      const toggle = this.$('[data-action="arp"]');
      toggle.setAttribute('aria-pressed', String(this.state.arpOn)); toggle.textContent = this.state.arpOn ? '⚡ an' : '⚡ aus';
      this._renderButtonGroup('arp-modes', [['up', '↑ Auf'], ['down', '↓ Ab'], ['updown', '↕ Auf/Ab'], ['random', '🎲 Zufall']], 'arpMode');
      this._renderButtonGroup('arp-rates', [[1, '1/16'], [2, '1/8'], [4, '1/4']], 'arpRate');
    }

    _renderButtonGroup(hostName, choices, stateName) {
      const host = this.$(`[data-host="${hostName}"]`);
      host.replaceChildren(...choices.map(([value, label]) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'mini'; button.textContent = label;
        button.setAttribute('aria-pressed', String(this.state[stateName] === value));
        button.addEventListener('click', () => { this.state[stateName] = value; this._renderArp(); });
        return button;
      }));
    }

    _renderToggle() {
      const button = this.$('[data-action="melody"]');
      button.setAttribute('aria-pressed', String(this.state.melodyOn));
      button.textContent = this.state.melodyOn ? '🎵 an' : '🎵 aus';
    }

    _status(text) { this.$('[data-out="status"]').textContent = text; }

    async _ensureAudio() {
      if (this.ctx) {
        if (this.ctx.state !== 'running') await this.ctx.resume();
        return;
      }
      const AudioContext = global.AudioContext || global.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio unavailable');
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      const master = this.ctx.createGain(); master.gain.value = .68;
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14; compressor.ratio.value = 5;
      master.connect(compressor).connect(this.ctx.destination);
      const drums = this.ctx.createGain(); drums.gain.value = .7; drums.connect(master);
      const bass = this.ctx.createGain(); bass.gain.value = .42; bass.connect(master);
      const synth = this.ctx.createGain(); synth.gain.value = .55; synth.connect(master);
      const convolver = this.ctx.createConvolver(); convolver.buffer = this._impulse(1.25);
      const wet = this.ctx.createGain(); wet.gain.value = this.state.reverb;
      synth.connect(convolver).connect(wet).connect(master);
      const delay = this.ctx.createDelay(1); delay.delayTime.value = .285;
      const delayWet = this.ctx.createGain(); delayWet.gain.value = this.state.echo;
      const feedback = this.ctx.createGain(); feedback.gain.value = .24;
      synth.connect(delay); delay.connect(delayWet).connect(master); delay.connect(feedback).connect(delay);
      const noise = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * .35), this.ctx.sampleRate);
      const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.nodes = { master, drums, bass, synth, wet, delayWet, noise };
      if (this.ctx.state !== 'running') await this.ctx.resume();
    }

    _impulse(seconds) {
      const length = Math.ceil(this.ctx.sampleRate * seconds);
      const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
      return buffer;
    }

    _updateFx() {
      if (!this.ctx || !this.nodes) return;
      const now = this.ctx.currentTime;
      this.nodes.wet.gain.setTargetAtTime(this.state.reverb, now, .02);
      this.nodes.delayWet.gain.setTargetAtTime(this.state.echo, now, .02);
    }

    _kick(time, velocity = 1) {
      const oscillator = this.ctx.createOscillator(); const gain = this.ctx.createGain();
      oscillator.frequency.setValueAtTime(145, time); oscillator.frequency.exponentialRampToValueAtTime(45, time + .1);
      gain.gain.setValueAtTime(.65 * velocity, time); gain.gain.exponentialRampToValueAtTime(.0001, time + .18);
      oscillator.connect(gain).connect(this.nodes.drums); oscillator.start(time); oscillator.stop(time + .19);
    }

    _noise(time, cutoff, length, volume) {
      const source = this.ctx.createBufferSource(); const filter = this.ctx.createBiquadFilter(); const gain = this.ctx.createGain();
      source.buffer = this.nodes.noise; filter.type = 'highpass'; filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(.0001, time + length);
      source.connect(filter).connect(gain).connect(this.nodes.drums); source.start(time); source.stop(time + length + .01);
    }

    _drum(step, time) {
      const pattern = DRUMS[this.state.drum];
      const halfStep = 60 / this.state.bpm / 8;
      const playTrack = (id, originalHits, hit) => {
        if (!this.state.trackOn[id]) return;
        const variant = this.state.trackVariant[id];
        if (variant === 2 || originalHits.includes(step)) {
          hit(time, variant === 2 ? .72 : 1);
          if (variant === 1) hit(time + halfStep, .62);
        }
      };
      playTrack('kick', pattern.kick || [], (at, velocity) => this._kick(at, velocity));
      playTrack('snare', pattern.snare || [], (at, velocity) => this._noise(at, 900, .12, .2 * velocity));
      if (this.state.trackOn.snare && this.state.trackVariant.snare === 0 && pattern.ghost?.includes(step)) this._noise(time, 1200, .07, .07);
      playTrack('clap', pattern.clap || [], (at, velocity) => { this._noise(at, 1300, .09, .15 * velocity); this._noise(at + .018, 1800, .065, .09 * velocity); });
      playTrack('hat', pattern.hat || [], (at, velocity) => this._noise(at, 6500, .04, .055 * velocity));
      if (this.state.trackOn.hat && this.state.trackVariant.hat === 0 && pattern.open?.includes(step)) this._noise(time, 4800, .17, .085);
      playTrack('bass', this._bassSteps(pattern), (at, velocity) => this._bass(step, at, velocity));
    }

    _bass(step, time, velocity = 1) {
      const scale = [0, 0, 3, 5, 7, 5, 10, 7];
      const midi = 36 + scale[(step + this.state.drum) % scale.length];
      const oscillator = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      oscillator.type = 'square'; oscillator.frequency.setValueAtTime(noteHz(midi), time);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(620, time); filter.Q.value = 4.5;
      filter.frequency.exponentialRampToValueAtTime(180, time + .18);
      gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(.24 * velocity, time + .008); gain.gain.exponentialRampToValueAtTime(.0001, time + .24);
      oscillator.connect(filter).connect(gain).connect(this.nodes.bass);
      oscillator.start(time); oscillator.stop(time + .26);
    }

    _voice(midi, time, velocity, duration) {
      const oscillator = this.ctx.createOscillator(); const filter = this.ctx.createBiquadFilter(); const gain = this.ctx.createGain();
      oscillator.type = this.state.wave; oscillator.frequency.value = noteHz(midi);
      filter.type = 'lowpass'; filter.frequency.value = Math.min(this.state.cutoff, this.ctx.sampleRate * .45); filter.Q.value = this.state.resonance;
      const attackEnd = time + this.state.attack;
      const decayEnd = attackEnd + this.state.decay;
      const sustainLevel = Math.max(.0001, velocity * this.state.sustain);
      gain.gain.setValueAtTime(.0001, time); gain.gain.linearRampToValueAtTime(velocity, attackEnd); gain.gain.linearRampToValueAtTime(sustainLevel, decayEnd);
      oscillator.connect(filter).connect(gain).connect(this.nodes.synth); oscillator.start(time);
      const voice = { oscillator, gain, release: this.state.release, done: false }; this.voices.add(voice);
      oscillator.addEventListener('ended', () => { voice.done = true; this.voices.delete(voice); }, { once: true });
      if (duration) global.setTimeout(() => this._releaseVoice(voice), Math.max(0, (time + duration - this.ctx.currentTime) * 1000));
      return voice;
    }

    _releaseVoice(voice, fast = false) {
      if (!voice || voice.done || !this.ctx) return;
      const now = this.ctx.currentTime; const release = fast ? .03 : voice.release;
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(Math.max(.0001, voice.gain.gain.value), now);
        voice.gain.gain.exponentialRampToValueAtTime(.0001, now + release);
        voice.oscillator.stop(now + release + .02);
        voice.done = true; this.voices.delete(voice);
      } catch (_) { /* The oscillator may already have ended. */ }
    }

    _schedule() {
      if (!this.playing || !this.ctx) return;
      while (this.nextTime < this.ctx.currentTime + .1) {
        const step = this.step;
        this._drum(step, this.nextTime);
        if (this.state.melodyOn) {
          for (const [at, offset, length] of MELODIES[this.state.melody].notes) {
            if (at === step) this._voice(60 + offset + (this.state.octave - 4) * 12, this.nextTime, .18, length * 60 / this.state.bpm / 4);
          }
        }
        if (this.state.arpOn && step % this.state.arpRate === 0) this._arpNote(this.nextTime);
        this.queue.push({ step, time: this.nextTime });
        this.nextTime += 60 / this.state.bpm / 4;
        this.step = (this.step + 1) % 16;
      }
      this.timer = global.setTimeout(() => this._schedule(), 25);
    }

    _arpNote(time) {
      const chord = [0, 4, 7, 11, 12];
      let index;
      if (this.state.arpMode === 'random') index = Math.floor(Math.random() * chord.length);
      else if (this.state.arpMode === 'down') index = chord.length - 1 - (this.state.arpStep % chord.length);
      else if (this.state.arpMode === 'updown') {
        const cycle = [...chord, ...chord.slice(1, -1).reverse()];
        index = cycle[this.state.arpStep % cycle.length];
        this._voice(12 * (this.state.octave + 1) + index, time, .15, Math.max(.06, 60 / this.state.bpm / 4 * this.state.arpRate * .72));
        this.state.arpStep++;
        return;
      } else index = this.state.arpStep % chord.length;
      this._voice(12 * (this.state.octave + 1) + chord[index], time, .15, Math.max(.06, 60 / this.state.bpm / 4 * this.state.arpRate * .72));
      this.state.arpStep++;
    }

    _visual() {
      if (!this.playing || !this.ctx) return;
      let latest;
      while (this.queue.length && this.queue[0].time <= this.ctx.currentTime + .008) latest = this.queue.shift().step;
      if (latest !== undefined) this.$$('.step').forEach((dot) => dot.classList.toggle('now', Number(dot.dataset.step) === latest));
      this.raf = global.requestAnimationFrame(() => this._visual());
    }

    async start() {
      try { await this._ensureAudio(); } catch (_) { this._status('Web Audio ist hier nicht verfügbar'); return; }
      this.playing = true; this.step = 0; this.queue.length = 0; this.nextTime = this.ctx.currentTime + .05;
      const button = this.$('[data-action="play"]'); button.innerHTML = icons.pause; button.setAttribute('aria-label', 'Groove pausieren');
      this._status('Groove läuft'); this._schedule(); this._visual();
    }

    stop() {
      this.playing = false; global.clearTimeout(this.timer); global.cancelAnimationFrame(this.raf);
      this.timer = 0; this.raf = 0; this.queue.length = 0;
      for (const pointerId of this.pointerVoices.keys()) this._playPointerKey(pointerId, null);
      this.voices.forEach((voice) => this._releaseVoice(voice, true));
      this.$$('.step').forEach((dot) => dot.classList.remove('now'));
      const button = this.$('[data-action="play"]'); button.innerHTML = icons.play; button.setAttribute('aria-label', 'Groove starten');
      this._status('Bereit · Kopfhörer empfohlen');
    }

    randomize() {
      this.state.drum = Math.floor(Math.random() * DRUMS.length);
      this.state.melody = Math.floor(Math.random() * MELODIES.length);
      this.state.sound = Math.floor(Math.random() * SOUNDS.length);
      Object.assign(this.state, SOUNDS[this.state.sound]);
      this.state.bpm = [88, 96, 104, 108, 116, 124, 132][Math.floor(Math.random() * 7)];
      this._render();
    }

    open(options = {}) {
      this.returnFocus = document.activeElement;
      const accent = options.accent || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f868b0';
      this.style.setProperty('--gl-accent', accent);
      const rgb = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(accent);
      if (rgb) this.style.setProperty('--gl-accent-rgb', `${parseInt(rgb[1], 16)},${parseInt(rgb[2], 16)},${parseInt(rgb[3], 16)}`);
      this.previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
      this.hidden = false; document.addEventListener('keydown', this.onKeydown);
      global.requestAnimationFrame(() => this.$('[data-action="close"]').focus());
    }

    async close() {
      this.stop(); this.hidden = true; document.removeEventListener('keydown', this.onKeydown);
      document.body.style.overflow = this.previousOverflow;
      const ctx = this.ctx; this.ctx = null; this.nodes = null;
      try { await ctx?.close(); } catch (_) { /* Context can already be closed. */ }
      this.returnFocus?.focus?.();
      global.dispatchEvent(new CustomEvent('groovelabclose'));
    }

    _keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
      if (event.key !== 'Tab') return;
      const focusable = this.$$('button:not([disabled]),input:not([disabled])');
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && this.shadowRoot.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && this.shadowRoot.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  if (!customElements.get('chor-groove-lab')) customElements.define('chor-groove-lab', GrooveLab);
  global.ChorGrooveLab = {
    open(options) {
      let lab = document.querySelector('chor-groove-lab');
      if (!lab) { lab = document.createElement('chor-groove-lab'); lab.hidden = true; document.body.append(lab); }
      lab.open(options);
      return lab;
    },
  };
})(window);
