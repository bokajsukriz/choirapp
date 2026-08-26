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
  ];

  const SOUNDS = [
    { icon: '🌸', name: 'Velvet Choir', wave: 'triangle', attack: .18, release: .72, cutoff: 3000, reverb: .34 },
    { icon: '🫧', name: 'Breath Glass', wave: 'sine', attack: .3, release: 1.05, cutoff: 6200, reverb: .48 },
    { icon: '📼', name: 'Tape Keys', wave: 'triangle', attack: .015, release: .36, cutoff: 3300, reverb: .14 },
    { icon: '💡', name: 'Neon Pluck', wave: 'sawtooth', attack: .006, release: .18, cutoff: 5000, reverb: .12 },
    { icon: '🌙', name: 'Moon Pad', wave: 'sine', attack: .62, release: 1.5, cutoff: 2300, reverb: .55 },
    { icon: '🎺', name: 'Soft Brass', wave: 'sawtooth', attack: .07, release: .34, cutoff: 2800, reverb: .18 },
    { icon: '💎', name: 'Crystal Drops', wave: 'sine', attack: .005, release: 1.2, cutoff: 8500, reverb: .52 },
    { icon: '🌊', name: 'Midnight Dub', wave: 'square', attack: .018, release: .48, cutoff: 1500, reverb: .24 },
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
      this.state = { bpm: 108, drum: 0, melody: 0, sound: 0, melodyOn: true, octave: 4 };
      this.ctx = null;
      this.nodes = null;
      this.playing = false;
      this.step = 0;
      this.nextTime = 0;
      this.timer = 0;
      this.raf = 0;
      this.queue = [];
      this.voices = new Set();
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
        .veil{height:100%;background:rgba(36,27,61,.42);padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));display:flex;justify-content:center}
        .lab{isolation:isolate;position:relative;width:min(760px,100%);height:100%;overflow:auto;overscroll-behavior:contain;background:#fff7ec;border-radius:24px;padding:16px;box-shadow:0 24px 80px rgba(36,27,61,.3)}
        .lab:before,.lab:after{content:"";position:fixed;border-radius:50%;pointer-events:none;z-index:-1;opacity:.25}.lab:before{width:230px;height:230px;right:-70px;top:-80px;background:#33c9dc}.lab:after{width:290px;height:290px;left:-130px;bottom:-130px;background:#ffd23f}
        header{display:flex;align-items:center;gap:12px;margin-bottom:14px}.title{flex:1}.eyebrow{color:var(--gl-accent);font-size:.7rem;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.title h1{font-size:clamp(1.65rem,6vw,2.3rem);line-height:1;margin:.08em 0 0;letter-spacing:-.04em}.title h1 span{color:var(--gl-accent)}
        .round{width:46px;height:46px;display:grid;place-items:center;border:1px solid #eedde7;border-radius:50%;background:#fff}.card{background:rgba(255,255,255,.95);border:1px solid #f1dce7;border-radius:20px;padding:14px;margin-bottom:12px;box-shadow:0 9px 24px rgba(36,27,61,.07)}
        .transport{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px}.play{width:56px;height:56px;border:0;border-radius:50%;display:grid;place-items:center;background:var(--gl-accent);color:#fff;box-shadow:0 7px 18px rgba(var(--gl-accent-rgb),.32)}.tempo{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:9px}.tempo output{font-weight:850;font-size:1.25rem;white-space:nowrap}.status{font-size:.72rem;color:#8c81a6;text-align:center;margin-top:8px}
        input[type=range]{width:100%;accent-color:var(--gl-accent)}.section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.section-head h2{font-size:.78rem;color:#8c81a6;text-transform:uppercase;letter-spacing:.08em;margin:0}.name{font-size:.75rem;font-weight:750}.choices{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px}.choice{position:relative;aspect-ratio:1;border:1px solid #f1dce7;border-radius:14px;background:#fff;font-size:1.25rem}.choice small{position:absolute;right:4px;bottom:3px;font-size:.52rem;color:#8c81a6}.choice[aria-pressed=true]{border-color:var(--gl-accent);background:rgba(var(--gl-accent-rgb),.13);box-shadow:0 0 0 2px rgba(var(--gl-accent-rgb),.12)}
        .steps{display:grid;grid-template-columns:repeat(16,1fr);gap:4px;margin-top:12px}.step{height:12px;border-radius:6px;background:#eee5eb}.step.hit{background:var(--gl-accent)}.step.now{outline:2px solid var(--gl-accent);outline-offset:2px}.toggle{border:1px solid #f1dce7;border-radius:999px;background:#fff;padding:7px 10px;font-size:.72rem;font-weight:800}.toggle[aria-pressed=true]{background:rgba(var(--gl-accent-rgb),.13);border-color:var(--gl-accent)}
        .sound-row{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.sound{min-height:55px;border:1px solid #f1dce7;border-radius:14px;background:#fff;padding:6px;font-size:.7rem;font-weight:750}.sound b{display:block;font-size:1.15rem}.sound[aria-pressed=true]{border-color:var(--gl-accent);background:rgba(var(--gl-accent-rgb),.13)}
        .keyboard-head{display:flex;align-items:center;justify-content:space-between;margin:12px 0 8px}.keyboard-head strong{font-size:.82rem}.octaves{display:flex;gap:4px}.oct{border:1px solid #f1dce7;background:#fff;border-radius:9px;padding:5px 8px;font-size:.7rem;font-weight:800}.oct[aria-pressed=true]{border-color:#33c9dc;background:#e7f9fb}.keys{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}.key{height:68px;border:1px solid #e9dce4;border-radius:0 0 9px 9px;background:#fff;display:flex;align-items:flex-end;justify-content:center;padding:5px 1px;font-size:.58rem;font-weight:800;touch-action:none;user-select:none}.key.black{height:55px;background:#2d2639;color:#fff;border-color:#2d2639}.key.hot{background:var(--gl-accent);border-color:var(--gl-accent);color:#fff}.foot{text-align:center;color:#8c81a6;font-size:.68rem;padding:3px 0 7px}
        @media(max-width:520px){.lab{border-radius:19px;padding:11px}.choices{gap:4px}.choice{border-radius:11px}.sound-row{grid-template-columns:repeat(4,1fr)}.key{height:58px;font-size:.5rem}.key.black{height:48px}.tempo{grid-template-columns:1fr}.tempo output{font-size:1.05rem}.tempo input{grid-row:2}}
        @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
      </style>
      <div class="veil">
        <main class="lab" role="dialog" aria-modal="true" aria-labelledby="gl-title">
          <header><div class="title"><div class="eyebrow">Du hast das Easter Egg gefunden 🎉</div><h1 id="gl-title">Chor <span>Groove</span> Lab</h1></div><button class="round" data-action="close" aria-label="Groove Lab schließen">${icons.close}</button></header>
          <section class="card"><div class="transport"><button class="play" data-action="play" aria-label="Groove starten">${icons.play}</button><label class="tempo"><output data-out="bpm">108 BPM</output><input data-control="bpm" type="range" min="72" max="144" value="108" aria-label="Tempo"></label><button class="round" data-action="random" aria-label="Zufälliger Groove">${icons.dice}</button></div><div class="status" role="status" data-out="status">Bereit · Kopfhörer empfohlen</div></section>
          <section class="card"><div class="section-head"><h2>Drumloop</h2><span class="name" data-out="drum"></span></div><div class="choices" data-host="drums"></div><div class="steps" data-host="steps"></div></section>
          <section class="card"><div class="section-head"><h2>Melodie</h2><button class="toggle" data-action="melody" aria-pressed="true">🎵 an</button></div><div class="section-head"><span class="name" data-out="melody"></span></div><div class="choices" data-host="melodies"></div></section>
          <section class="card"><div class="section-head"><h2>Synthesizer</h2><span class="name" data-out="sound"></span></div><div class="sound-row" data-host="sounds"></div><div class="keyboard-head"><strong>Mini-Klaviatur</strong><div class="octaves" data-host="octaves"></div></div><div class="keys" data-host="keys"></div></section>
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
      });
      this.$('[data-control="bpm"]').addEventListener('input', (event) => {
        this.state.bpm = Number(event.target.value);
        this.$('[data-out="bpm"]').textContent = `${this.state.bpm} BPM`;
      });
      this.$('.veil').addEventListener('pointerdown', (event) => {
        if (event.target === this.$('.veil')) this.close();
      });
    }

    _render() {
      this._renderChoices('drums', DRUMS, 'drum');
      this._renderChoices('melodies', MELODIES, 'melody');
      this._renderSounds();
      this._renderOctaves();
      this._renderKeys();
      this._renderSteps();
      this._renderToggle();
      this.$('[data-out="drum"]').textContent = DRUMS[this.state.drum].name;
      this.$('[data-out="melody"]').textContent = MELODIES[this.state.melody].name;
      this.$('[data-out="sound"]').textContent = SOUNDS[this.state.sound].name;
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
        button.innerHTML = `<b>${sound.icon}</b>${sound.name}`;
        button.addEventListener('click', () => { this.state.sound = index; this._render(); });
        return button;
      }));
    }

    _renderOctaves() {
      const host = this.$('[data-host="octaves"]');
      host.replaceChildren(...[3, 4, 5].map((octave) => {
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
        const release = () => { key.classList.remove('hot'); this._releaseVoice(key._voice); key._voice = null; };
        key.addEventListener('pointerdown', async (event) => {
          event.preventDefault();
          try {
            await this._ensureAudio();
            key.setPointerCapture(event.pointerId);
            key.classList.add('hot');
            key._voice = this._voice(12 * (this.state.octave + 1) + offset, this.ctx.currentTime, .35);
          } catch (_) { this._status('Audio ist hier nicht verfügbar'); }
        });
        key.addEventListener('pointerup', release);
        key.addEventListener('pointercancel', release);
        return key;
      }));
    }

    _renderSteps() {
      const pattern = DRUMS[this.state.drum];
      const hits = new Set([...(pattern.kick || []), ...(pattern.snare || []), ...(pattern.clap || []), ...(pattern.hat || [])]);
      const host = this.$('[data-host="steps"]');
      host.replaceChildren(...Array.from({ length: 16 }, (_, index) => {
        const dot = document.createElement('i'); dot.className = `step${hits.has(index) ? ' hit' : ''}`; dot.dataset.step = index; return dot;
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
      const synth = this.ctx.createGain(); synth.gain.value = .55; synth.connect(master);
      const convolver = this.ctx.createConvolver(); convolver.buffer = this._impulse(1.25);
      const wet = this.ctx.createGain(); wet.gain.value = SOUNDS[this.state.sound].reverb;
      synth.connect(convolver).connect(wet).connect(master);
      const noise = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * .35), this.ctx.sampleRate);
      const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.nodes = { master, drums, synth, wet, noise };
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

    _kick(time) {
      const oscillator = this.ctx.createOscillator(); const gain = this.ctx.createGain();
      oscillator.frequency.setValueAtTime(145, time); oscillator.frequency.exponentialRampToValueAtTime(45, time + .1);
      gain.gain.setValueAtTime(.65, time); gain.gain.exponentialRampToValueAtTime(.0001, time + .18);
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
      if (pattern.kick?.includes(step)) this._kick(time);
      if (pattern.snare?.includes(step)) this._noise(time, 900, .12, .2);
      if (pattern.ghost?.includes(step)) this._noise(time, 1200, .07, .07);
      if (pattern.clap?.includes(step)) { this._noise(time, 1300, .09, .15); this._noise(time + .018, 1800, .065, .09); }
      if (pattern.hat?.includes(step)) this._noise(time, 6500, .04, .055);
      if (pattern.open?.includes(step)) this._noise(time, 4800, .17, .085);
    }

    _voice(midi, time, velocity, duration) {
      const sound = SOUNDS[this.state.sound];
      this.nodes.wet.gain.setTargetAtTime(sound.reverb, time, .02);
      const oscillator = this.ctx.createOscillator(); const filter = this.ctx.createBiquadFilter(); const gain = this.ctx.createGain();
      oscillator.type = sound.wave; oscillator.frequency.value = noteHz(midi);
      filter.type = 'lowpass'; filter.frequency.value = Math.min(sound.cutoff, this.ctx.sampleRate * .45); filter.Q.value = 1.5;
      gain.gain.setValueAtTime(.0001, time); gain.gain.linearRampToValueAtTime(velocity, time + sound.attack);
      oscillator.connect(filter).connect(gain).connect(this.nodes.synth); oscillator.start(time);
      const voice = { oscillator, gain, release: sound.release, done: false }; this.voices.add(voice);
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
        this.queue.push({ step, time: this.nextTime });
        this.nextTime += 60 / this.state.bpm / 4;
        this.step = (this.step + 1) % 16;
      }
      this.timer = global.setTimeout(() => this._schedule(), 25);
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
      this.voices.forEach((voice) => this._releaseVoice(voice, true));
      this.$$('.step').forEach((dot) => dot.classList.remove('now'));
      const button = this.$('[data-action="play"]'); button.innerHTML = icons.play; button.setAttribute('aria-label', 'Groove starten');
      this._status('Bereit · Kopfhörer empfohlen');
    }

    randomize() {
      this.state.drum = Math.floor(Math.random() * DRUMS.length);
      this.state.melody = Math.floor(Math.random() * MELODIES.length);
      this.state.sound = Math.floor(Math.random() * SOUNDS.length);
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
