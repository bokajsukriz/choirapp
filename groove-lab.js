/* ==========================================================================
   CHOR GROOVE LAB — verstecktes Easter Egg der BVG-App.
   Sieben Tipps auf den Songtitel im Player öffnen einen kleinen, komplett
   lokalen Beat-/Synth-Spielplatz (Web Audio API, kein Sample, kein Netz).
   Diese Datei wird erst nach dem Auslöser nachgeladen (siehe index.html,
   loadGrooveLab()) und bleibt bis dahin ungeparst.

   Aufbau in zwei Teilen:
   - GrooveEngine:  reine Klangerzeugung (AudioContext, Bus-Struktur, Voices).
                    Weiß nichts von DOM oder Zustand — bekommt Zeitpunkt und
                    Parameter übergeben und erzeugt genau einen Klang.
   - GrooveLabView: die UI (Shadow-DOM-Web-Component). Hält den Zustand
                    (welches Pattern, welche Stimme, BPM, …), plant die
                    16tel-Schritte voraus und ruft dafür die Engine auf.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------------
     INHALT — Drumloops, Melodien, Synth-Voreinstellungen.
     Bewusst acht statt scheinbar sechzehn: jeder Eintrag ist eigenständig,
     keine umbenannten Kopien.
     ------------------------------------------------------------------------ */

  const DRUM_PATTERNS = [
    { icon: '🥁', name: 'Velvet Kick',
      kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [14] },
    { icon: '🪩', name: 'Disco Skip',
      kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], open: [6, 14] },
    { icon: '🕺', name: 'Neo Soul Sway',
      kick: [0, 3, 7, 10, 13], snare: [4, 12], ghost: [6, 9, 15], hat: [1, 3, 5, 7, 9, 11, 13, 15] },
    { icon: '🧩', name: 'Glass Funk',
      kick: [0, 3, 6, 10, 13], snare: [4, 12], ghost: [2, 9, 14], hat: [0, 2, 4, 6, 8, 9, 11, 13, 15] },
    { icon: '🪘', name: 'Afrobeat Pulse',
      kick: [0, 3, 6, 10, 12], clap: [4, 12], ghost: [7, 9], hat: [1, 3, 5, 8, 10, 13, 15] },
    { icon: '🌒', name: 'Half-Time Cloud',
      kick: [0, 6, 10], snare: [8], ghost: [3, 13, 15], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [12] },
    { icon: '🛸', name: 'House Bounce',
      kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], open: [10, 14] },
    { icon: '🤖', name: 'Circuit Choir',
      kick: [0, 5, 9, 13], snare: [4, 11], clap: [7, 14], hat: [1, 3, 6, 8, 10, 13], open: [15] },
  ];

  // [Schritt, Halbtonabstand zur Grundtonart, Länge in 16teln]
  const MELODIES = [
    { icon: '🌿', name: 'Velvet Rise',   notes: [[0, 0, 2], [3, 4, 1], [6, 7, 2], [9, 9, 1], [11, 7, 1], [14, 4, 2]] },
    { icon: '✨', name: 'Lydian Wink',   notes: [[0, 0, 1], [2, 2, 1], [5, 6, 1], [8, 7, 2], [10, 11, 1], [12, 9, 1], [15, 7, 1]] },
    { icon: '🏮', name: 'Blue Lantern',  notes: [[0, 0, 2], [3, 3, 1], [7, 7, 1], [9, 10, 2], [12, 7, 1], [14, 2, 1]] },
    { icon: '☀️', name: 'Sunbeam Arc',   notes: [[0, 4, 1], [2, 7, 1], [4, 9, 1], [7, 11, 1], [9, 7, 1], [11, 4, 1], [14, 2, 1]] },
    { icon: '🌙', name: 'Night Window',  notes: [[0, 0, 3], [4, 7, 1], [7, 10, 2], [10, 3, 1], [13, 2, 1], [15, 0, 2]] },
    { icon: '🔥', name: 'Funk Thread',   notes: [[0, 0, 1], [2, 3, 1], [4, 5, 1], [6, 7, 1], [9, 10, 1], [11, 7, 1], [13, 3, 1]] },
    { icon: '💎', name: 'Glass Runner',  notes: [[0, 0, 1], [1, 2, 1], [3, 4, 1], [6, 7, 1], [9, 11, 1], [11, 9, 1], [13, 7, 1], [15, 2, 1]] },
    { icon: '🌅', name: 'Afterglow',     notes: [[0, -5, 2], [4, 0, 2], [8, 4, 1], [10, 7, 2], [12, 9, 1], [14, 7, 1]] },
  ];

  const SYNTH_PRESETS = [
    { icon: '🌸', name: 'Velvet Choir', wave: 'triangle', attack: .16, decay: .22, sustain: .68, release: .8,  cutoff: 2900, resonance: 2,  echo: .10, reverb: .38 },
    { icon: '🫧', name: 'Breath Glass', wave: 'sine',     attack: .32, decay: .38, sustain: .72, release: 1.1, cutoff: 6400, resonance: 1,  echo: .16, reverb: .5 },
    { icon: '📼', name: 'Tape Keys',    wave: 'triangle', attack: .01, decay: .16, sustain: .5,  release: .32, cutoff: 3100, resonance: 3,  echo: .06, reverb: .12 },
    { icon: '💡', name: 'Neon Pluck',   wave: 'sawtooth', attack: .004,decay: .1,  sustain: .3,  release: .16, cutoff: 5200, resonance: 6,  echo: .22, reverb: .1 },
    { icon: '🌙', name: 'Moon Pad',     wave: 'sine',     attack: .58, decay: .55, sustain: .82, release: 1.6, cutoff: 2100, resonance: 2,  echo: .24, reverb: .58 },
    { icon: '🎺', name: 'Soft Brass',   wave: 'sawtooth', attack: .06, decay: .26, sustain: .58, release: .3,  cutoff: 2600, resonance: 4,  echo: .08, reverb: .16 },
    { icon: '💎', name: 'Crystal Drops',wave: 'sine',     attack: .005,decay: .18, sustain: .4,  release: 1.3, cutoff: 9000, resonance: 7,  echo: .3,  reverb: .55 },
    { icon: '🌊', name: 'Dub Chamber',  wave: 'square',   attack: .02, decay: .32, sustain: .55, release: .44, cutoff: 1400, resonance: 8,  echo: .34, reverb: .26 },
  ];

  const STEP_COUNT = 16;
  const ARP_SCALE = [0, 4, 7, 11]; // Maj7 über der Grundtonart — passt zu allen Melodien oben.
  const TRACK_IDS = ['kick', 'snare', 'clap', 'hat', 'bass'];
  const TRACK_LABEL = { kick: 'Kick', snare: 'Snare', clap: 'Clap', hat: 'Hi-Hat', bass: 'Basslauf' };
  const VARIANT_LABEL = ['Original', 'Doppelt', '16tel durch'];

  const noteHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  function stepsForTrack(pattern, track) {
    if (track === 'kick' || track === 'bass') return pattern.kick || [];
    if (track === 'snare') return [...(pattern.snare || []), ...(pattern.ghost || [])];
    if (track === 'clap') return pattern.clap || [];
    return [...(pattern.hat || []), ...(pattern.open || [])]; // hat
  }

  /* ------------------------------------------------------------------------
     GrooveEngine — reine Klangerzeugung. Kennt keine Muster, keinen
     Zustand — bekommt für jeden Klang Zeitpunkt und Parameter mitgegeben.
     ------------------------------------------------------------------------ */

  class GrooveEngine {
    constructor() {
      this.ctx = null;
      this.buses = null;
      this.noiseBuffer = null;
      this.voices = new Set();
    }

    get ready() { return !!this.ctx; }

    /** Baut den Audio-Graph einmalig auf; spätere Aufrufe wecken ihn nur wieder auf. */
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

      // Ein gemeinsamer Hall/Echo-Send fürs Synth-Signal — die Menge kommt
      // pro Voice aus dem gewählten Preset (siehe playTone()).
      const reverbSend = ctx.createGain(); reverbSend.gain.value = 0;
      const convolver = ctx.createConvolver();
      convolver.buffer = this._impulseResponse(1.4);
      synth.connect(convolver).connect(reverbSend).connect(master);

      const echoSend = ctx.createGain(); echoSend.gain.value = 0;
      const delay = ctx.createDelay(1); delay.delayTime.value = .22;
      const feedback = ctx.createGain(); feedback.gain.value = .3;
      synth.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(echoSend).connect(master);

      this.buses = { master, drums, synth, reverbSend, echoSend };
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

    _whiteNoise(seconds) {
      const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * seconds), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    _impulseResponse(seconds) {
      const length = Math.ceil(this.ctx.sampleRate * seconds);
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

    /** Gefilterter Noise-Burst — bedient Snare, Clap und Hi-Hat gleichermaßen. */
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

    /**
     * Ein gehaltener Synth-Ton (Melodie, Arpeggio oder Tastatur). `duration`
     * gesetzt: löst sich nach Ablauf selbst; sonst hält er, bis releaseVoice()
     * gerufen wird (Taste losgelassen).
     */
    playTone(preset, midi, time, velocity, duration) {
      const ctx = this.ctx;
      this.buses.reverbSend.gain.setTargetAtTime(preset.reverb, time, .02);
      this.buses.echoSend.gain.setTargetAtTime(preset.echo, time, .02);

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = preset.wave;
      osc.frequency.value = noteHz(midi);
      filter.type = 'lowpass';
      filter.frequency.value = Math.min(preset.cutoff, ctx.sampleRate * .45);
      filter.Q.value = preset.resonance;

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
     Kleine SVG-Icons — als Strings statt Dateien, damit die ganze
     Komponente ein einzelnes lazy-geladenes Skript bleibt.
     ------------------------------------------------------------------------ */

  const ICON = {
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    play: '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    shuffle: '<path d="M3 6h4l7 12h4M3 18h4l3-5.2M17 6h4M17 6l-2.5 2.5M17 6l-2.5-2.5M21 18l-2.5 2.5M21 18l-2.5-2.5"/>',
  };
  const svgIcon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  /* ------------------------------------------------------------------------
     GrooveLabView — die Web Component. Hält Auswahl/Zustand, plant Schritte
     voraus (klassisches Lookahead-Scheduling gegen Timer-Jitter) und
     zeichnet die Bedienoberfläche im Shadow DOM.
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
        trackVariant: { kick: 0, snare: 0, clap: 0, hat: 0, bass: 0 },
        arpOn: false,
        arpMode: 'up',
        arpDivision: 1,
      };

      this.playing = false;
      this.step = 0;
      this.nextStepTime = 0;
      this.schedulerTimer = 0;
      this.visualFrame = 0;
      this.scheduledSteps = [];
      this.heldVoices = new Map(); // pointerId -> Voice, für die Mini-Tastatur

      this._restoreFocusTo = null;
      this._bodyOverflow = '';
      this._onKeydown = (event) => this._handleKeydown(event);

      this._wireControls();
      this._renderAll();
    }

    $(selector) { return this.shadowRoot.querySelector(selector); }
    $all(selector) { return Array.from(this.shadowRoot.querySelectorAll(selector)); }

    /* ---- Öffentliche API (siehe window.ChorGrooveLab am Dateiende) ---- */

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
      } catch {
        this._setStatus('Web Audio ist auf diesem Gerät nicht verfügbar.');
        return;
      }
      this.playing = true;
      this.step = 0;
      this.scheduledSteps.length = 0;
      this.nextStepTime = this.engine.ctx.currentTime + .05;

      const btn = this.$('.transport-play');
      btn.innerHTML = svgIcon('pause');
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

      this.heldVoices.forEach((voice) => this.engine.releaseVoiceFast(voice));
      this.heldVoices.clear();
      this.engine.voices.forEach((voice) => this.engine.releaseVoiceFast(voice));

      this.$all('.step-cell').forEach((cell) => cell.classList.remove('is-now'));
      const btn = this.$('.transport-play');
      btn.innerHTML = svgIcon('play');
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
    }

    /* ---- Lookahead-Scheduler: plant ~100ms voraus, prüft alle 25ms nach ---- */

    _scheduleAhead() {
      if (!this.playing) return;
      const ctx = this.engine.ctx;
      const stepSeconds = 60 / this.state.bpm / 4;

      while (this.nextStepTime < ctx.currentTime + .1) {
        this._playStep(this.step, this.nextStepTime, stepSeconds);
        this.scheduledSteps.push({ step: this.step, time: this.nextStepTime });
        this.nextStepTime += stepSeconds;
        this.step = (this.step + 1) % STEP_COUNT;
      }
      this.schedulerTimer = global.setTimeout(() => this._scheduleAhead(), 25);
    }

    _playStep(step, time, stepSeconds) {
      const pattern = DRUM_PATTERNS[this.state.patternIndex];
      for (const track of TRACK_IDS) this._playDrumTrack(track, pattern, step, time, stepSeconds);

      if (this.state.melodyOn) {
        for (const [at, offset, lengthSteps] of MELODIES[this.state.melodyIndex].notes) {
          if (at === step) {
            const midi = 60 + offset + (this.state.octave - 4) * 12;
            this.engine.playTone(SYNTH_PRESETS[this.state.presetIndex], midi, time, .17, lengthSteps * stepSeconds);
          }
        }
      }

      if (this.state.arpOn && step % this.state.arpDivision === 0) {
        const phase = Math.floor(step / this.state.arpDivision);
        this.engine.playTone(SYNTH_PRESETS[this.state.presetIndex], 12 * (this.state.octave + 1) + this._arpNote(phase), time, .13, stepSeconds);
      }
    }

    _arpNote(phase) {
      const n = ARP_SCALE.length;
      if (this.state.arpMode === 'down') return ARP_SCALE[n - 1 - (phase % n)];
      if (this.state.arpMode === 'updown') return ARP_SCALE[[0, 1, 2, 3, 2, 1][phase % 6]];
      if (this.state.arpMode === 'random') return ARP_SCALE[Math.floor(Math.random() * n)];
      return ARP_SCALE[phase % n]; // 'up'
    }

    _playDrumTrack(track, pattern, step, time, stepSeconds) {
      if (!this.state.trackOn[track]) return;
      const variant = this.state.trackVariant[track];
      const hits = variant === 2 ? true : stepsForTrack(pattern, track).includes(step);
      if (!hits) return;

      const strike = (at) => {
        if (track === 'kick') this.engine.playKick(at);
        else if (track === 'bass') this.engine.playBass(at, 36 + (step % 4) * 2);
        else if (track === 'snare') this.engine.playNoise(at, { cutoff: 900, length: .12, volume: .2 });
        else if (track === 'clap') { this.engine.playNoise(at, { cutoff: 1300, length: .09, volume: .15 }); this.engine.playNoise(at + .018, { cutoff: 1800, length: .065, volume: .09 }); }
        else this.engine.playNoise(at, { cutoff: 6500, length: .045, volume: .055 }); // hat
      };

      strike(time);
      if (variant === 1) strike(time + stepSeconds / 2); // "Doppelt": ein zweiter Schlag zwischen den 16teln
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

    /* ---- Rendering ---- */

    _renderAll() {
      this._renderPicker('.pattern-grid', DRUM_PATTERNS, this.state.patternIndex, (i) => { this.state.patternIndex = i; this._renderAll(); });
      this._renderPicker('.melody-grid', MELODIES, this.state.melodyIndex, (i) => { this.state.melodyIndex = i; this._renderAll(); });
      this._renderPicker('.preset-grid', SYNTH_PRESETS, this.state.presetIndex, (i) => { this.state.presetIndex = i; this._renderAll(); }, true);

      this.$('.pattern-name').textContent = DRUM_PATTERNS[this.state.patternIndex].name;
      this.$('.melody-name').textContent = MELODIES[this.state.melodyIndex].name;
      this.$('.preset-name').textContent = SYNTH_PRESETS[this.state.presetIndex].name;

      this._renderTracks();
      this._renderPresetControls();
      this._renderOctaves();
      this._renderKeyboard();

      const melodyBtn = this.$('.melody-toggle');
      melodyBtn.setAttribute('aria-pressed', String(this.state.melodyOn));
      melodyBtn.textContent = this.state.melodyOn ? '🎵 an' : '🎵 aus';

      const arpBtn = this.$('.arp-toggle');
      arpBtn.setAttribute('aria-pressed', String(this.state.arpOn));
      arpBtn.textContent = this.state.arpOn ? 'Arpeggio an' : 'Arpeggio aus';

      this.$('.bpm-input').value = this.state.bpm;
      this.$('.bpm-out').textContent = `${this.state.bpm} BPM`;
      this.$('[data-field="arpMode"]').value = this.state.arpMode;
      this.$('[data-field="arpDivision"]').value = String(this.state.arpDivision);
    }

    _renderPicker(hostSelector, items, activeIndex, onPick, isSoundGrid) {
      const host = this.$(hostSelector);
      host.replaceChildren(...items.map((item, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isSoundGrid ? 'preset-cell' : 'pick-cell';
        btn.title = item.name;
        btn.setAttribute('aria-pressed', String(index === activeIndex));
        btn.innerHTML = isSoundGrid
          ? `<b>${item.icon}</b>${item.name}`
          : `${item.icon}<small>${index + 1}</small>`;
        btn.addEventListener('click', () => onPick(index));
        return btn;
      }));
    }

    _renderTracks() {
      const pattern = DRUM_PATTERNS[this.state.patternIndex];
      const host = this.$('.track-list');
      host.replaceChildren(...TRACK_IDS.map((track) => {
        const on = this.state.trackOn[track];
        const variant = this.state.trackVariant[track];
        const hits = variant === 2
          ? Array.from({ length: STEP_COUNT }, (_, i) => i)
          : stepsForTrack(pattern, track);

        const row = document.createElement('div');
        row.className = `track-row${on ? '' : ' is-off'}`;

        const nameBtn = document.createElement('button');
        nameBtn.type = 'button';
        nameBtn.className = 'track-name';
        nameBtn.innerHTML = `${TRACK_LABEL[track]}<small>${VARIANT_LABEL[variant]}</small>`;
        nameBtn.title = 'Variante wechseln';
        nameBtn.addEventListener('click', () => {
          this.state.trackVariant[track] = (variant + 1) % VARIANT_LABEL.length;
          this._renderTracks();
        });

        const cells = document.createElement('div');
        cells.className = 'step-row';
        for (let i = 0; i < STEP_COUNT; i++) {
          const cell = document.createElement('i');
          cell.className = `step-cell${hits.includes(i) ? ' is-hit' : ''}${variant === 1 && hits.includes(i) ? ' is-doubled' : ''}`;
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

        row.append(nameBtn, cells, toggle);
        return row;
      }));
    }

    _renderPresetControls() {
      const preset = SYNTH_PRESETS[this.state.presetIndex];
      this.$('[data-field="wave"]').value = preset.wave;

      const fields = [
        ['attack', 'Attack', .005, 1, .005],
        ['decay', 'Decay', .05, 1.5, .01],
        ['sustain', 'Sustain', .05, 1, .01],
        ['release', 'Release', .05, 2, .01],
        ['cutoff', 'Filter', 300, 10000, 10],
        ['resonance', 'Resonanz', 0, 15, .1],
        ['reverb', 'Hall', 0, .8, .01],
        ['echo', 'Echo', 0, .7, .01],
      ];
      const host = this.$('.preset-controls');
      host.replaceChildren(...fields.map(([key, label, min, max, step]) => {
        const wrap = document.createElement('label');
        wrap.className = 'preset-control';
        wrap.append(label);
        const input = document.createElement('input');
        input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step);
        input.value = String(preset[key]);
        input.setAttribute('aria-label', label);
        input.addEventListener('input', (e) => {
          preset[key] = Number(e.target.value);
          this.$('.preset-name').textContent = 'Eigene Einstellung';
          this.$all('.preset-cell').forEach((cell) => cell.setAttribute('aria-pressed', 'false'));
        });
        wrap.append(input);
        return wrap;
      }));
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
        btn.addEventListener('click', () => {
          this.state.octave = octave;
          this._renderOctaves();
          this._renderKeyboard();
        });
        return btn;
      }));
    }

    _renderKeyboard() {
      const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'H'];
      const BLACK = new Set([1, 3, 6, 8, 10]);
      const host = this.$('.keyboard');
      host.replaceChildren(...NAMES.map((name, offset) => {
        const key = document.createElement('button');
        key.type = 'button';
        key.className = `key${BLACK.has(offset) ? ' is-black' : ''}`;
        key.textContent = `${name}${this.state.octave}`;

        const midi = 12 * (this.state.octave + 1) + offset;
        const press = async (pointerId) => {
          try {
            await this.engine.start();
          } catch {
            this._setStatus('Web Audio ist hier nicht verfügbar.');
            return;
          }
          key.classList.add('is-hot');
          this.heldVoices.set(pointerId, this.engine.playTone(SYNTH_PRESETS[this.state.presetIndex], midi, this.engine.ctx.currentTime, .32));
        };
        const release = (pointerId) => {
          key.classList.remove('is-hot');
          const voice = this.heldVoices.get(pointerId);
          if (voice) this.engine.releaseVoice(voice);
          this.heldVoices.delete(pointerId);
        };

        key.addEventListener('pointerdown', (e) => { e.preventDefault(); key.setPointerCapture(e.pointerId); press(e.pointerId); });
        key.addEventListener('pointerup', (e) => release(e.pointerId));
        key.addEventListener('pointercancel', (e) => release(e.pointerId));
        key.addEventListener('pointerenter', (e) => { if (e.buttons) press(e.pointerId); });
        return key;
      }));
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
      });

      this.$('.bpm-input').addEventListener('input', (e) => {
        this.state.bpm = Number(e.target.value);
        this.$('.bpm-out').textContent = `${this.state.bpm} BPM`;
      });

      this.$('[data-field="wave"]').addEventListener('change', (e) => {
        SYNTH_PRESETS[this.state.presetIndex].wave = e.target.value;
        this.$('.preset-name').textContent = 'Eigene Einstellung';
        this.$all('.preset-cell').forEach((cell) => cell.setAttribute('aria-pressed', 'false'));
      });
      this.$('[data-field="arpMode"]').addEventListener('change', (e) => { this.state.arpMode = e.target.value; });
      this.$('[data-field="arpDivision"]').addEventListener('change', (e) => { this.state.arpDivision = Number(e.target.value); });

      // Tippen auf den Hintergrund (nicht auf die Karte selbst) schließt — wie ein Bottom-Sheet.
      this.$('.backdrop').addEventListener('pointerdown', (e) => {
        if (e.target === this.$('.backdrop')) this.close();
      });
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
    position: fixed; inset: 0; z-index: 2147483000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #241b3d;
  }
  * { box-sizing: border-box; }
  button, input, select { font: inherit; color: inherit; }
  button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

  .backdrop {
    height: 100%; background: rgba(36,27,61,.45); display: flex; justify-content: center;
    padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right))
             max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
  }
  .card {
    position: relative; isolation: isolate; width: min(760px, 100%); height: 100%;
    overflow: auto; overscroll-behavior: contain;
    background: #fff7ec; border-radius: 24px; padding: 16px;
    box-shadow: 0 24px 80px rgba(36,27,61,.32);
  }
  .card::before, .card::after { content: ''; position: fixed; border-radius: 50%; pointer-events: none; z-index: -1; opacity: .25; }
  .card::before { width: 220px; height: 220px; right: -70px; top: -80px; background: #33c9dc; }
  .card::after  { width: 280px; height: 280px; left: -120px; bottom: -120px; background: #ffd23f; }

  .head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .head .titles { flex: 1; }
  .eyebrow { color: var(--accent); font-size: .7rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
  .head h1 { font-size: clamp(1.6rem, 6vw, 2.2rem); line-height: 1; margin: .1em 0 0; letter-spacing: -.03em; }
  .head h1 span { color: var(--accent); }
  .round-btn {
    width: 46px; height: 46px; flex: 0 0 auto; display: grid; place-items: center;
    border: 1px solid #eedde7; border-radius: 50%; background: #fff;
  }

  .panel { background: rgba(255,255,255,.95); border: 1px solid #f1dce7; border-radius: 20px; padding: 14px; margin-bottom: 12px; box-shadow: 0 9px 24px rgba(36,27,61,.07); }
  .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
  .panel-head h2 { font-size: .78rem; color: #8c81a6; text-transform: uppercase; letter-spacing: .08em; margin: 0; }
  .item-name { font-size: .75rem; font-weight: 750; }

  .transport-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; }
  .transport-play {
    width: 56px; height: 56px; border: 0; border-radius: 50%; display: grid; place-items: center;
    background: var(--accent); color: #fff; box-shadow: 0 7px 18px rgba(var(--accent-rgb), .32);
  }
  .tempo-field { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 9px; }
  .bpm-out { font-weight: 800; font-size: 1.2rem; white-space: nowrap; }
  .status-line { font-size: .72rem; color: #8c81a6; text-align: center; margin-top: 8px; }

  input[type=range] { width: 100%; accent-color: var(--accent); }

  .pick-cell, .preset-cell {
    position: relative; border: 1px solid #f1dce7; border-radius: 14px; background: #fff; font-size: 1.2rem;
  }
  .pick-cell { aspect-ratio: 1; }
  .pick-cell small { position: absolute; right: 4px; bottom: 3px; font-size: .5rem; color: #8c81a6; }
  .pick-cell[aria-pressed="true"], .preset-cell[aria-pressed="true"] {
    border-color: var(--accent); background: rgba(var(--accent-rgb), .13); box-shadow: 0 0 0 2px rgba(var(--accent-rgb), .12);
  }
  .pattern-grid, .melody-grid { display: grid; grid-template-columns: repeat(8, minmax(0,1fr)); gap: 6px; }
  .preset-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 7px; }
  .preset-cell { min-height: 58px; padding: 6px; font-size: .68rem; font-weight: 750; }
  .preset-cell b { display: block; font-size: 1.15rem; }

  .track-list { display: grid; gap: 7px; margin-top: 12px; }
  .track-row { display: grid; grid-template-columns: 76px 1fr 42px; gap: 7px; align-items: center; }
  .track-row.is-off { opacity: .4; }
  .track-name { border: 0; background: none; padding: 0; text-align: left; font-size: .66rem; font-weight: 800; }
  .track-name small { display: block; font-weight: 600; color: #8c81a6; }
  .track-toggle { border: 1px solid #f1dce7; border-radius: 999px; background: #fff; padding: 6px; font-size: .62rem; }
  .step-row { display: grid; grid-template-columns: repeat(16, 1fr); gap: 3px; }
  .step-cell { height: 12px; border-radius: 6px; background: #eee5eb; }
  .step-cell.is-hit { background: var(--accent); }
  .step-cell.is-doubled { background: repeating-linear-gradient(135deg, var(--accent) 0 3px, #fff 3px 5px); }
  .step-cell.is-now { outline: 2px solid var(--accent); outline-offset: 2px; }

  .toggle-pill { border: 1px solid #f1dce7; border-radius: 999px; background: #fff; padding: 7px 12px; font-size: .72rem; font-weight: 800; }
  .toggle-pill[aria-pressed="true"] { background: rgba(var(--accent-rgb), .13); border-color: var(--accent); }

  .preset-controls { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
  .preset-control { font-size: .62rem; display: block; }
  .preset-control input { display: block; margin-top: 4px; }

  .arp-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
  .arp-row select { border: 1px solid #f1dce7; border-radius: 10px; padding: 6px 8px; background: #fff; font-size: .72rem; }

  .keyboard-head { display: flex; align-items: center; justify-content: space-between; margin: 12px 0 8px; }
  .keyboard-head strong { font-size: .82rem; }
  .octave-list { display: flex; gap: 4px; }
  .octave-btn { border: 1px solid #f1dce7; background: #fff; border-radius: 9px; padding: 5px 9px; font-size: .7rem; font-weight: 800; }
  .octave-btn[aria-pressed="true"] { border-color: #33c9dc; background: #e7f9fb; }
  .keyboard { display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px; }
  .key {
    height: 68px; border: 1px solid #e9dce4; border-radius: 0 0 9px 9px; background: #fff;
    display: flex; align-items: flex-end; justify-content: center; padding: 5px 1px;
    font-size: .58rem; font-weight: 800; touch-action: none; user-select: none;
  }
  .key.is-black { height: 55px; background: #2d2639; color: #fff; border-color: #2d2639; }
  .key.is-hot { background: var(--accent); border-color: var(--accent); color: #fff; }

  .foot-note { text-align: center; color: #8c81a6; font-size: .68rem; padding: 4px 0 8px; }

  @media (max-width: 520px) {
    .card { border-radius: 18px; padding: 11px; }
    .pattern-grid, .melody-grid { gap: 4px; }
    .preset-grid { grid-template-columns: repeat(4, 1fr); }
    .key { height: 58px; font-size: .5rem; }
    .key.is-black { height: 48px; }
    .tempo-field { grid-template-columns: 1fr; }
    .tempo-field input { grid-row: 2; }
  }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>

<div class="backdrop">
  <main class="card" role="dialog" aria-modal="true" aria-labelledby="gl-title">
    <div class="head">
      <div class="titles">
        <div class="eyebrow">Du hast das Easter Egg gefunden 🎉</div>
        <h1 id="gl-title">Chor <span>Groove</span> Lab</h1>
      </div>
      <button class="round-btn close-btn" type="button" data-action="close" aria-label="Groove Lab schließen">${svgIcon('close')}</button>
    </div>

    <section class="panel">
      <div class="transport-row">
        <button class="transport-play" type="button" data-action="toggle-transport" aria-label="Groove starten">${svgIcon('play')}</button>
        <label class="tempo-field">
          <output class="bpm-out">106 BPM</output>
          <input class="bpm-input" type="range" min="72" max="144" value="106" aria-label="Tempo">
        </label>
        <button class="round-btn" type="button" data-action="randomize" aria-label="Zufälliger Groove">${svgIcon('shuffle')}</button>
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
        <button class="toggle-pill melody-toggle" type="button" data-action="toggle-melody" aria-pressed="true">🎵 an</button>
      </div>
      <div class="panel-head"><span class="item-name melody-name"></span></div>
      <div class="melody-grid"></div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Synthesizer</h2><span class="item-name preset-name"></span></div>
      <div class="preset-grid"></div>
      <label class="preset-control" style="margin-top:10px">Wellenform
        <select data-field="wave" aria-label="Wellenform">
          <option value="sine">Sinus</option>
          <option value="triangle">Dreieck</option>
          <option value="square">Rechteck</option>
          <option value="sawtooth">Sägezahn</option>
        </select>
      </label>
      <div class="preset-controls"></div>

      <div class="arp-row">
        <button class="toggle-pill arp-toggle" type="button" data-action="toggle-arp" aria-pressed="false">Arpeggio aus</button>
        <select data-field="arpMode" aria-label="Arpeggiator-Richtung">
          <option value="up">Aufwärts</option>
          <option value="down">Abwärts</option>
          <option value="updown">Auf/Ab</option>
          <option value="random">Zufall</option>
        </select>
        <select data-field="arpDivision" aria-label="Arpeggiator-Raster">
          <option value="1">1/16</option>
          <option value="2">1/8</option>
          <option value="4">1/4</option>
        </select>
      </div>

      <div class="keyboard-head">
        <strong>Mini-Klaviatur</strong>
        <div class="octave-list"></div>
      </div>
      <div class="keyboard"></div>
    </section>

    <p class="foot-note">100 % lokal · Web Audio API · beim Schließen vollständig beendet</p>
  </main>
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
