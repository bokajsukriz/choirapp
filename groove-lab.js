/* ==========================================================================
   CHOR GROOVE LAB — verstecktes Easter Egg der BVG-App.
   Sieben Tipps auf den Songtitel im Player öffnen einen kleinen, komplett
   lokalen Beat-/Synth-Spielplatz (Web Audio API, kein Sample, kein Netz). Vollbild wie die übrigen Vollbild-Ansichten der App — kein Dialog-
   Karten-Look. Diese Datei wird erst nach dem Auslöser nachgeladen.

   Aufbau:
   - Inhalt:        Drumloops, Melodien, Klang-Presets, Tonarten, Akkord-
                    folgen. (Metronom, Einsingen und Rhythmus-Spiel sind in
                    eine eigene Übe-App gewandert, siehe uebe-lab.html.)
   - Harmonik:      Tonleiterstufen → Halbtöne, Akkordnamen, SATB-Satz.
                    Melodie, Bass, Arp und Akkorde hängen alle an derselben
                    Tonart + Akkordfolge — sie können nicht mehr gegen-
                    einander klingen.
   - GrooveEngine:  reine Klangerzeugung (AudioContext, Bus-Struktur, Voices).
                    Kennt weder Muster noch UI-Zustand.
   - Knob:          eigenständiger Dreh-Regler (Pointer-Events, Tastatur).
   - GrooveLabView: die UI (Shadow-DOM-Web-Component) — sechs Reiter unter
                    einer festen Transportleiste, Zustand, Scheduler,
                    Rendering, Speichern.
   ========================================================================== */
(function (global) {
  'use strict';

  /**
   * Übersetzung. Diese Datei ist ein klassisches Skript (kein ES-Modul) und
   * wird erst nach dem Auslöser nachgeladen — sie kann STRINGS deshalb nicht
   * selbst importieren. Stattdessen reicht app.js seine t()-Funktion beim
   * Öffnen herein (siehe ChorGrooveLab.open()). Ohne sie bleibt der
   * Schlüssel stehen, statt dass die Ansicht zerfällt.
   */
  let t = (key) => key;
  const tf = (key, vars) => t(key).replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));

  const noteHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const mod = (n, m) => ((n % m) + m) % m;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  /* ------------------------------------------------------------------------
     TAKTARTEN — ein Schritt ist immer eine Sechzehntel. 6/8 hat deshalb 12
     Schritte (sechs Achtel); die Zählzeiten für die Anzeige stehen in
     `beats`, die Gruppierung im Raster in `group`.
     ------------------------------------------------------------------------ */

  const METERS = {
    '4/4': { steps: 16, beats: [0, 4, 8, 12], group: 4 },
    '3/4': { steps: 12, beats: [0, 4, 8], group: 4 },
    '6/8': { steps: 12, beats: [0, 2, 4, 6, 8, 10], group: 6 },
  };
  const METER_IDS = Object.keys(METERS);

  /* ------------------------------------------------------------------------
     INHALT — Drumloops.

     `bass`/`bassNotes` sind bewusst eigenständig von `kick`: eine Basslinie,
     die nur die Kick-Schläge doppelt, hat kein eigenes musikalisches Profil.
     bassNotes[i] ist eine TONLEITERSTUFE relativ zum Grundton des gerade
     klingenden Akkords (0 = Grundton, 2 = Terz, 4 = Quinte, 7 = Oktave,
     -1 = Stufe darunter als Auftakt) — keine feste Halbtonzahl mehr. Nur so
     passt die Linie zu jeder Tonart, jedem Modus und jedem Akkord; vorher
     lagen 14 der 16 Basslinien fest in Moll unter überwiegend Dur-Melodien.

     `roll`: die "zweite Line" fürs Halten eines Pads (siehe _startRoll) —
     eine je Loop eigene Rhythmuszelle aus [Dauer in 16teln, Lautstärke].
     `cat`: Filter in der Auswahl (calm/dance/funky/breaks); `icon`: siehe
     PICTOGRAM — ein bekanntes Symbol je Loop, keins doppelt.
     ------------------------------------------------------------------------ */

  const DRUM_PATTERNS = [
    { name: 'Pulse Basic', icon: 'pulse', meter: '4/4', cat: 'dance', kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      bass: [0, 3, 6, 8, 11, 14], bassNotes: [0, 4, -1, 0, 4, 2],
      roll: [[1.5, 1], [.5, .6], [1, .85], [1, .6]] },
    { name: 'Backbeat Open', icon: 'unlock', meter: '4/4', cat: 'calm', kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], open: [14],
      bass: [2, 5, 8, 11, 14], bassNotes: [0, 2, 4, 2, 0],
      roll: [[1.33, 1], [.67, .55]] },
    { name: 'Disco Clap', icon: 'star', meter: '4/4', cat: 'dance', kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], open: [6, 14],
      bass: [0, 3, 7, 10, 13, 15], bassNotes: [0, 0, 4, 0, 0, -1],
      roll: [[.5, .6], [.5, 1], [.5, .6], [.5, 1], [1, .9], [1, .6]] },
    { name: 'Swing Soul', icon: 'note', meter: '4/4', cat: 'funky', kick: [0, 3, 7, 10, 13], snare: [4, 12], ghost: [6, 9, 15], hat: [1, 3, 5, 7, 9, 11, 13, 15],
      bass: [1, 4, 8, 11, 14], bassNotes: [0, 3, 2, 4, 0],
      roll: [[1.33, 1], [1.33, .6], [1.34, .85]] },
    { name: 'Glass Funk', icon: 'diamond', meter: '4/4', cat: 'funky', kick: [0, 3, 6, 10, 13], snare: [4, 12], ghost: [2, 9, 14], hat: [0, 2, 4, 6, 8, 9, 11, 13, 15],
      bass: [2, 5, 8, 12, 15], bassNotes: [0, 4, 3, 2, 0],
      roll: [[.5, 1], [.25, .5], [.25, .7], [1, .9], [.5, .6], [1.5, 1]] },
    { name: 'Afrobeat Skip', icon: 'footprints', meter: '4/4', cat: 'funky', kick: [0, 3, 6, 10, 12], clap: [4, 12], ghost: [7, 9], hat: [1, 3, 5, 8, 10, 13, 15],
      bass: [1, 4, 8, 11, 13], bassNotes: [0, 2, 4, 6, 2],
      roll: [[1.5, 1], [1.5, .75], [1, .9]] },
    { name: 'Half-Time Drop', icon: 'clock', meter: '4/4', cat: 'calm', kick: [0, 6, 10], snare: [8], ghost: [3, 13, 15], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [12],
      bass: [2, 4, 9, 13], bassNotes: [0, 4, 2, 0],
      roll: [[2, 1], [1, .6], [1, .8]] },
    { name: 'House Bounce', icon: 'house', meter: '4/4', cat: 'dance', kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], open: [10, 14],
      bass: [2, 5, 9, 11, 14], bassNotes: [0, 4, 0, 3, 4],
      roll: [[.75, 1], [.75, .55], [.75, .8], [.75, .55], [1, .9]] },
    { name: 'Circuit Pulse', icon: 'bolt', meter: '4/4', cat: 'breaks', kick: [0, 5, 9, 13], snare: [4, 11], clap: [7, 14], hat: [1, 3, 6, 8, 10, 13], open: [15],
      bass: [0, 3, 6, 10, 12, 15], bassNotes: [0, 3, 6, 3, 0, 4],
      roll: [[.5, 1], [.5, .5], [.25, .7], [.25, .5], [1, .9], [1.5, .6]] },
    { name: 'Boom Bap', icon: 'speaker', meter: '4/4', cat: 'breaks', kick: [0, 10], snare: [4, 12], ghost: [7], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      bass: [3, 6, 9, 13, 15], bassNotes: [0, 4, 2, 0, 4],
      roll: [[1.5, 1], [.5, .5], [1, .85], [1, .6]] },
    { name: 'Latin Skip', icon: 'sun', meter: '4/4', cat: 'funky', kick: [0, 3, 6, 8, 11, 14], clap: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      bass: [1, 4, 7, 9, 12, 15], bassNotes: [0, 4, 0, 2, 4, 0],
      roll: [[1.5, 1], [1, .6], [.5, .8], [1, .9]] },
    { name: 'Breakbeat Cut', icon: 'scissors', meter: '4/4', cat: 'breaks', kick: [0, 10, 12], snare: [4, 11], ghost: [2, 9], hat: [0, 2, 4, 6, 7, 9, 11, 13, 15],
      bass: [1, 4, 6, 9, 13, 15], bassNotes: [0, 0, 4, 3, 0, -1],
      roll: [[.25, 1], [.25, .6], [.5, .9], [1, .5], [2, 1]] },
    { name: 'Minimal Click', icon: 'target', meter: '4/4', cat: 'calm', kick: [0, 8], snare: [12], ghost: [4], hat: [2, 6, 10, 14],
      bass: [2, 6, 10, 14], bassNotes: [0, 4, 2, 4],
      roll: [[2, 1], [2, .4]] },
    { name: 'Triplet Roll', icon: 'repeat', meter: '4/4', cat: 'breaks', kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 3, 5, 6, 8, 10, 11, 13, 14],
      bass: [1, 4, 6, 9, 12, 14], bassNotes: [0, 4, 0, 4, 0, 2],
      roll: [[1.33, 1], [1.33, .7], [1.34, .85]] },
    { name: 'Deep House', icon: 'moon', meter: '4/4', cat: 'dance', kick: [0, 4, 8, 12], clap: [4, 12], hat: [1, 3, 5, 7, 9, 11, 13, 15], open: [7, 15],
      bass: [2, 6, 9, 13], bassNotes: [0, 0, 4, 0],
      roll: [[.5, .6], [1.5, 1], [.5, .6], [1.5, .9]] },
    { name: 'Broken Beat', icon: 'puzzle', meter: '4/4', cat: 'breaks', kick: [0, 5, 8, 11], snare: [3, 10, 14], ghost: [6, 13], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      bass: [1, 4, 7, 10, 14], bassNotes: [0, 2, 4, 6, 3],
      roll: [[.75, 1], [1.25, .6], [.5, .9], [1.5, .7]] },
    // --- 3/4 und 6/8 — für Walzer, Balladen und Volkslied-Repertoire ---
    { name: 'Waltz Step', icon: 'feather', meter: '3/4', cat: 'calm', kick: [0], ghost: [4, 8], hat: [0, 2, 4, 6, 8, 10],
      bass: [0, 8], bassNotes: [0, 4],
      roll: [[4, 1], [4, .5], [4, .5]] },
    { name: 'Jazz Waltz', icon: 'glass', meter: '3/4', cat: 'funky', kick: [0, 7], snare: [8], ghost: [3, 10], hat: [0, 4, 7, 8], open: [11],
      bass: [0, 4, 8], bassNotes: [0, 2, 4],
      roll: [[2.67, 1], [1.33, .6]] },
    { name: '6/8 Ballad', icon: 'sunset', meter: '6/8', cat: 'calm', kick: [0], snare: [6], hat: [0, 2, 4, 6, 8, 10],
      bass: [0, 6, 10], bassNotes: [0, 4, 7],
      roll: [[2, 1], [2, .5], [2, .6]] },
    { name: 'Folk Jig', icon: 'flag', meter: '6/8', cat: 'dance', kick: [0, 4, 6], snare: [6], ghost: [9], hat: [0, 2, 4, 6, 8, 10], open: [10],
      bass: [0, 4, 6, 10], bassNotes: [0, 4, 0, 2],
      roll: [[2, 1], [1, .5], [1, .7], [2, .9]] },
  ];

  const TRACK_IDS = ['kick', 'snare', 'clap', 'hat', 'open', 'bass'];
  const DRUM_TRACKS = TRACK_IDS.filter((track) => track !== 'bass');
  const TRACK_KEY = { kick: 'lab.trackKick', snare: 'lab.trackSnare', clap: 'lab.trackClap',
                      hat: 'lab.trackHat', open: 'lab.trackOpen', bass: 'lab.trackBass' };
  const trackLabel = (track) => t(TRACK_KEY[track]);

  // Antippen einer Zelle im Raster schaltet durch diese Werte, danach aus.
  // Snare: voll → Ghost-Note; Bass: Grundton → Quinte → Oktave
  // (Tonleiterstufen, siehe DRUM_PATTERNS).
  const CELL_CYCLE = { kick: [1], snare: [1, .45], clap: [1], hat: [1], open: [1], bass: [0, 4, 7] };

  /** Bearbeitbare Arbeitskopie eines Loops: je Spur { Schritt: Wert }. Die
   *  Vorlagen in DRUM_PATTERNS bleiben unangetastet — "Original" stellt
   *  sie wieder her. */
  function beatFromPattern(pattern) {
    const beat = { kick: {}, snare: {}, clap: {}, hat: {}, open: {}, bass: {} };
    (pattern.kick || []).forEach((s) => { beat.kick[s] = 1; });
    (pattern.snare || []).forEach((s) => { beat.snare[s] = 1; });
    (pattern.ghost || []).forEach((s) => { beat.snare[s] = .45; });
    (pattern.clap || []).forEach((s) => { beat.clap[s] = 1; });
    (pattern.hat || []).forEach((s) => { beat.hat[s] = 1; });
    (pattern.open || []).forEach((s) => { beat.open[s] = 1; });
    (pattern.bass || []).forEach((s, i) => { beat.bass[s] = pattern.bassNotes?.[i] ?? 0; });
    return beat;
  }

  /* ------------------------------------------------------------------------
     INHALT — Melodien.

     Jede Melodie ist ein Ein-Takt-Motiv aus [Schritt, Stufe, Länge] — die
     Stufe ist eine TONLEITERSTUFE relativ zum Grundton des gerade
     klingenden Akkords, keine Halbtonzahl. Das Motiv wandert dadurch Takt
     für Takt mit der Akkordfolge mit (klassische Sequenz) und bleibt immer
     in der Tonart. `vary` enthält je Takt eine Abwandlung: rhythmShift
     (Schritte, mit Umbruch im Takt), extendLast (verlängert die letzte Note
     — kadenzierender Schluss), shift (zusätzliche Stufen) oder ein eigenes
     `motif` — so entstehen echte Frage-Antwort-Phrasen über zwei Takte.
     Bewusst sparsam: lieber Pausen und Synkopen als Dauerlauf, damit die
     Melodie Platz neben Beat und Stimmen lässt.
     ------------------------------------------------------------------------ */

  const MELODIES = [
    // --- zuerst die markanten, luftigen: Pausen und Synkopen statt Dauerlauf
    { name: 'Hook Line', meter: '4/4', cat: 'dance', motif: [[0, 4, 2], [3, 4, 1], [6, 2, 3], [10, 0, 2]],
      vary: [{}, { motif: [[2, 4, 1], [4, 5, 2], [8, 4, 4]] }] },
    { name: 'Offbeat Pop', meter: '4/4', cat: 'dance', motif: [[2, 0, 1], [4, 2, 2], [7, 4, 1], [10, 2, 3]],
      vary: [{}, { motif: [[2, 4, 1], [4, 5, 1], [6, 4, 2], [10, 7, 4]] }] },
    { name: 'Call & Response', meter: '4/4', cat: 'funky', motif: [[0, 4, 1], [2, 4, 1], [4, 2, 2]],
      vary: [{}, { motif: [[8, 2, 1], [10, 1, 1], [12, 0, 4]] }] },
    { name: 'Sunday Hymn', meter: '4/4', cat: 'calm', motif: [[0, 4, 6], [6, 2, 2], [8, 0, 8]],
      vary: [{}, { motif: [[0, 2, 4], [4, 4, 4], [8, 5, 8]] }] },
    { name: 'Pentatonic Riff', meter: '4/4', cat: 'funky', motif: [[0, 0, 1], [3, 2, 1], [6, 4, 2], [11, 2, 1], [14, 0, 2]],
      vary: [{}, { motif: [[0, 4, 1], [3, 5, 1], [6, 4, 2], [10, 2, 4]] }] },
    { name: 'Bounce', meter: '4/4', cat: 'dance', motif: [[0, 0, 1], [2, 7, 1], [6, 4, 1], [10, 7, 1], [14, 4, 2]],
      vary: [{}, { motif: [[0, 2, 1], [2, 7, 1], [6, 5, 2], [12, 4, 4]] }] },
    { name: 'Question & Answer', meter: '4/4', cat: 'calm', motif: [[0, 0, 2], [4, 2, 2], [8, 4, 4], [14, 5, 2]],
      vary: [{}, { motif: [[0, 4, 3], [6, 2, 2], [10, 1, 6]] }] },
    { name: 'Long Tones', meter: '4/4', cat: 'calm', motif: [[0, 4, 8], [8, 2, 8]],
      vary: [{}, { motif: [[0, 1, 4], [4, 2, 4], [8, 0, 8]] }] },
    { name: 'Syncopated Hook', meter: '4/4', cat: 'funky', motif: [[0, 0, 1], [3, 2, 1], [6, 4, 2], [11, 5, 1], [14, 4, 2]],
      vary: [{}, { rhythmShift: 1 }, { extendLast: 2 }] },
    { name: 'Night Window', meter: '4/4', cat: 'calm', motif: [[0, 0, 3], [4, 4, 1], [7, 6, 3], [12, 2, 1], [14, 0, 2]],
      vary: [{}, { rhythmShift: 1, extendLast: 1 }] },
    { name: 'Blue Third', meter: '4/4', cat: 'funky', motif: [[0, 0, 2], [3, 2, 1], [6, 2, 1], [9, 4, 1], [12, 6, 1], [14, 4, 1]],
      vary: [{}, {}, { rhythmShift: -1, extendLast: 2 }] },
    { name: 'Suspended Glow', meter: '4/4', cat: 'calm', motif: [[0, 0, 3], [5, 3, 2], [9, 4, 2], [13, 0, 3]],
      vary: [{}, {}, { rhythmShift: -2 }, { extendLast: 3 }] },
    { name: 'Funk Thread', meter: '4/4', cat: 'funky', motif: [[0, 0, 1], [2, 2, 1], [6, 4, 1], [9, 6, 1], [13, 2, 2]],
      vary: [{}, { rhythmShift: 1 }, { rhythmShift: -1, extendLast: 2 }] },
    { name: 'Afterglow', meter: '4/4', cat: 'calm', motif: [[0, -3, 2], [4, 0, 2], [8, 2, 1], [10, 4, 2], [12, 5, 1], [14, 4, 1]],
      vary: [{}, {}, { rhythmShift: -2, extendLast: 3 }] },
    { name: 'Modal Drift', meter: '4/4', cat: 'funky', motif: [[0, 0, 2], [3, 1, 1], [8, 4, 2], [11, 6, 1], [14, 3, 2]],
      vary: [{}, { rhythmShift: 1 }, { rhythmShift: -1 }, { extendLast: 2 }] },
    { name: 'Sevenths Hook', meter: '4/4', cat: 'funky', motif: [[0, 0, 1], [2, 2, 1], [4, 4, 1], [6, 6, 2], [10, 4, 1], [12, 2, 4]],
      vary: [{}, {}, { rhythmShift: -2, extendLast: 2 }] },
    { name: 'Echo Motif', meter: '4/4', cat: 'dance', motif: [[0, 0, 1], [2, 3, 1], [4, 4, 2], [8, 0, 1], [10, 3, 1], [12, 4, 4]],
      vary: [{}, {}, { rhythmShift: 1 }, { extendLast: 2 }] },
    { name: 'Gentle Wave', meter: '4/4', cat: 'calm', motif: [[0, 2, 2], [3, 4, 1], [6, 5, 2], [10, 4, 1], [12, 2, 4]],
      vary: [{}, { rhythmShift: 1 }, { rhythmShift: -1, extendLast: 2 }] },
    { name: 'Waltz Line', meter: '3/4', cat: 'calm', motif: [[0, 4, 4], [4, 2, 2], [6, 3, 2], [8, 4, 4]],
      vary: [{}, { extendLast: 2 }] },
    { name: 'Turning Waltz', meter: '3/4', cat: 'dance', motif: [[0, 7, 2], [2, 6, 2], [4, 4, 4], [8, 2, 2], [10, 4, 2]],
      vary: [{}, {}, { extendLast: 2 }] },
    { name: 'Lullaby', meter: '6/8', cat: 'calm', motif: [[0, 2, 4], [4, 3, 2], [6, 4, 4], [10, 2, 2]],
      vary: [{}, { extendLast: 2 }] },
    { name: 'Jig Hop', meter: '6/8', cat: 'dance', motif: [[0, 0, 2], [2, 2, 2], [4, 4, 2], [6, 5, 2], [8, 4, 2], [10, 2, 2]],
      vary: [{}, {}, { extendLast: 2 }] },
  ];

  // Je Abwandlung einmal fertig ausrechnen — der Scheduler liest nur noch.
  MELODIES.forEach((melody) => {
    const steps = METERS[melody.meter].steps;
    melody.bars = melody.vary.map(({ rhythmShift = 0, extendLast = 0, shift = 0, motif = melody.motif }) => {
      const bar = motif.map(([at, deg, len]) => [mod(at + rhythmShift, steps), deg + shift, len]);
      if (extendLast && bar.length) bar[bar.length - 1][2] += extendLast;
      return bar.sort((a, b) => a[0] - b[0]);
    });
  });

  /* ------------------------------------------------------------------------
     INHALT — Klang-Presets.

     Alle Felder außer name/icon/cat sind editierbar (siehe SOUND_RANGES).
     Gewählt wird immer eine KOPIE (soundFromPreset) — Drehen an einem Regler
     verändert nie mehr die Vorlage selbst, "Zurücksetzen" holt sie zurück.
     Neu gegenüber früher: filterType, drive, LFO auf den Filter (lfoRate in
     Hz oder lfoSync in 16teln, lfoDepth in Cent), width (Stereo-Breite der
     Unisono-Stimmen), glide (Sekunden) und mono. Hall-Länge und Echo-Zeit
     sind jetzt global (Effekte), nur die Anteile (reverbWet/echoWet) hängen
     am Klang.
     ------------------------------------------------------------------------ */

  const SOUND_DEFAULTS = {
    wave: 'triangle', attack: .01, decay: .2, sustain: .6, release: .4,
    cutoff: 3000, resonance: 2, filterEnvAmount: 0, filterType: 'lowpass', drive: 0,
    lfoRate: 0, lfoDepth: 0, lfoSync: 0,
    detune: 0, width: 0, subLevel: 0, pitchDrop: 0,
    vibratoRate: 0, vibratoDepth: 0, vibratoDelay: 0,
    glide: 0, mono: false, reverbWet: .2, echoWet: .1,
  };

  const SYNTH_PRESETS = [
    { name: 'Velvet Choir', icon: 'users', cat: 'pad', wave: 'triangle', attack: .16, decay: .22, sustain: .68, release: .8, cutoff: 2900, resonance: 2, filterEnvAmount: 600, reverbWet: .38, echoWet: .1,
      detune: 9, width: .4, vibratoRate: 4.5, vibratoDepth: 6, vibratoDelay: .3 },
    { name: 'Breath Glass', icon: 'wind', cat: 'pad', wave: 'sine', attack: .32, decay: .38, sustain: .72, release: 1.1, cutoff: 6400, resonance: 1, filterEnvAmount: 300, reverbWet: .5, echoWet: .16,
      subLevel: .12, vibratoRate: 3.8, vibratoDepth: 5, vibratoDelay: .35 },
    { name: 'Tape Keys', icon: 'cassette', cat: 'keys', wave: 'triangle', attack: .01, decay: .16, sustain: .5, release: .32, cutoff: 3100, resonance: 3, filterEnvAmount: 900, reverbWet: .12, echoWet: .06,
      detune: 5, width: .2, vibratoRate: .7, vibratoDepth: 4 },
    { name: 'Neon Pluck', icon: 'zap', cat: 'keys', wave: 'sawtooth', attack: .004, decay: .1, sustain: .3, release: .16, cutoff: 5200, resonance: 6, filterEnvAmount: 2400, reverbWet: .1, echoWet: .22,
      pitchDrop: 180, width: .3 },
    { name: 'Moon Pad', icon: 'moon', cat: 'pad', wave: 'sine', attack: .58, decay: .55, sustain: .82, release: 1.6, cutoff: 2100, resonance: 2, filterEnvAmount: 400, reverbWet: .58, echoWet: .24,
      detune: 10, width: .6, subLevel: .25, vibratoRate: 4, vibratoDepth: 8, vibratoDelay: .4 },
    { name: 'Soft Brass', icon: 'horn', cat: 'lead', wave: 'sawtooth', attack: .06, decay: .26, sustain: .58, release: .3, cutoff: 2600, resonance: 4, filterEnvAmount: 1400, reverbWet: .16, echoWet: .08,
      pitchDrop: 55, vibratoRate: 5.5, vibratoDepth: 9, vibratoDelay: .28 },
    { name: 'Crystal Drops', icon: 'droplet', cat: 'keys', wave: 'sine', attack: .005, decay: .18, sustain: .4, release: 1.3, cutoff: 9000, resonance: 7, filterEnvAmount: 1800, reverbWet: .55, echoWet: .3,
      detune: 4, width: .5, pitchDrop: 35 },
    { name: 'Dub Chamber', icon: 'door', cat: 'lead', wave: 'square', attack: .02, decay: .32, sustain: .55, release: .44, cutoff: 1400, resonance: 8, filterEnvAmount: 700, reverbWet: .26, echoWet: .34,
      detune: 12, subLevel: .2, lfoSync: 8, lfoDepth: 700 },
    { name: 'Warm Sub', icon: 'flame', cat: 'lead', wave: 'sine', attack: .03, decay: .2, sustain: .7, release: .5, cutoff: 900, resonance: 3, filterEnvAmount: 200, reverbWet: .15, echoWet: .05,
      subLevel: .5, pitchDrop: 80, mono: true, glide: .05 },
    { name: 'Square Bell', icon: 'bell', cat: 'keys', wave: 'square', attack: .005, decay: .4, sustain: .25, release: 1.8, cutoff: 4200, resonance: 5, filterEnvAmount: 2000, reverbWet: .45, echoWet: .2,
      detune: 5, pitchDrop: 25 },
    { name: 'Analog Lead', icon: 'compass', cat: 'lead', wave: 'sawtooth', attack: .008, decay: .15, sustain: .6, release: .25, cutoff: 3800, resonance: 9, filterEnvAmount: 2600, reverbWet: .08, echoWet: .14,
      pitchDrop: 130, vibratoRate: 6, vibratoDepth: 14, vibratoDelay: .18, drive: .2, mono: true, glide: .08 },
    { name: 'Airy Choir', icon: 'cloud', cat: 'pad', wave: 'triangle', attack: .4, decay: .4, sustain: .75, release: 1.4, cutoff: 3400, resonance: 1, filterEnvAmount: 350, reverbWet: .5, echoWet: .12,
      detune: 11, width: .7, subLevel: .1, vibratoRate: 4.2, vibratoDepth: 7, vibratoDelay: .3 },
    { name: 'Deep Pad', icon: 'anchor', cat: 'pad', wave: 'sine', attack: .7, decay: .6, sustain: .85, release: 2.0, cutoff: 1700, resonance: 2, filterEnvAmount: 250, reverbWet: .6, echoWet: .2,
      detune: 8, width: .6, subLevel: .3, vibratoRate: 3.5, vibratoDepth: 5, vibratoDelay: .5 },
    { name: 'Bright Saw', icon: 'sun', cat: 'lead', wave: 'sawtooth', attack: .01, decay: .2, sustain: .45, release: .4, cutoff: 7200, resonance: 5, filterEnvAmount: 1600, reverbWet: .2, echoWet: .16,
      pitchDrop: 90, width: .5, vibratoRate: 5, vibratoDepth: 9, vibratoDelay: .2 },
    { name: 'Vintage Organ', icon: 'key', cat: 'keys', wave: 'triangle', attack: .01, decay: .05, sustain: .9, release: .2, cutoff: 4600, resonance: 3, filterEnvAmount: 100, reverbWet: .3, echoWet: .1,
      detune: 7, width: .3, vibratoRate: 5.8, vibratoDepth: 4 },
    { name: 'Growl Bass', icon: 'target', cat: 'lead', wave: 'sawtooth', attack: .01, decay: .18, sustain: .6, release: .28, cutoff: 900, resonance: 9, filterEnvAmount: 500, reverbWet: .1, echoWet: .08,
      detune: 6, subLevel: .45, pitchDrop: 220, drive: .5, mono: true, glide: .06 },
    { name: 'Wobble', icon: 'wave', cat: 'lead', wave: 'sawtooth', attack: .01, decay: .2, sustain: .8, release: .2, cutoff: 600, resonance: 10, filterEnvAmount: 300, reverbWet: .1, echoWet: .1,
      lfoSync: 2, lfoDepth: 2000, drive: .35, subLevel: .3, mono: true, glide: .04 },
    { name: 'Hollow Band', icon: 'bulb', cat: 'keys', wave: 'square', attack: .01, decay: .25, sustain: .5, release: .5, cutoff: 1500, resonance: 5, filterEnvAmount: 800, filterType: 'bandpass', reverbWet: .3, echoWet: .18,
      detune: 6, width: .5 },
  ];

  // Wertebereiche für Regler UND fürs Einlesen gespeicherter/geteilter
  // Stände (sanitizeSound) — ein geteilter Code darf keine Werte setzen, die
  // die Engine nicht verträgt.
  const SOUND_RANGES = {
    attack: [.003, 1.5], decay: [.02, 2], sustain: [0, 1], release: [.03, 3],
    cutoff: [100, 12000], resonance: [0, 20], filterEnvAmount: [0, 5000], drive: [0, 1],
    lfoRate: [0, 12], lfoDepth: [0, 2400], lfoSync: [0, 16],
    detune: [0, 30], width: [0, 1], subLevel: [0, 1], pitchDrop: [0, 400],
    vibratoRate: [0, 10], vibratoDepth: [0, 30], vibratoDelay: [0, 1.5],
    glide: [0, 1], reverbWet: [0, 1], echoWet: [0, 1],
  };
  const WAVE_SHAPES = ['sine', 'triangle', 'square', 'sawtooth'];
  // Lautheitsausgleich je Wellenform (Säge und Rechteck sind bei gleichem
  // Pegel deutlich lauter als Sinus/Dreieck), siehe playTone.
  const WAVE_LEVEL = { sine: 1, triangle: .9, square: .55, sawtooth: .6 };
  const WAVE_KEY = { sine: 'lab.waveSine', triangle: 'lab.waveTriangle', square: 'lab.waveSquare', sawtooth: 'lab.waveSawtooth' };
  const FILTER_TYPES = [
    { id: 'lowpass', nameKey: 'lab.filterLow' },
    { id: 'highpass', nameKey: 'lab.filterHigh' },
    { id: 'bandpass', nameKey: 'lab.filterBand' },
  ];

  function soundFromPreset(index) {
    const preset = SYNTH_PRESETS[index] || SYNTH_PRESETS[0];
    const { name, icon, cat, ...params } = preset;
    return { ...SOUND_DEFAULTS, ...params, presetIndex: SYNTH_PRESETS.indexOf(preset), custom: false };
  }
  const presetIndexByName = (name) => Math.max(0, SYNTH_PRESETS.findIndex((p) => p.name === name));

  // Die SATB-Akkorde sind eine Hörhilfe wie der Liegeton — sie klingen fest
  // nach Chor, unabhängig vom gerade eingestellten Synth-Klang.
  const CHORD_SOUND = soundFromPreset(presetIndexByName('Airy Choir'));

  // Liegeton: bewusst schlicht und fest (gefilterte Säge, langsamer Einsatz)
  // — eine Stimmreferenz soll nicht vom gerade gewählten Klang abhängen.
  const DRONE_SOUND = { ...SOUND_DEFAULTS, wave: 'sawtooth', attack: .8, decay: .3, sustain: 1, release: 1.2,
    cutoff: 900, resonance: 1, detune: 5, width: .5, reverbWet: .25, echoWet: 0 };

  // Bass-Klänge für die Basslinie der Drumloops (eigene, einfache Stimme —
  // kein voller Synth-Klang, damit der Bass immer knapp und trocken bleibt).
  const BASS_SOUNDS = [
    { id: 'pluck', name: 'Square Pluck', wave: 'square', cutoff: 480, q: 8, decay: .14, level: .2, envAmount: 0 },
    { id: 'sub', name: 'Sub Sine', wave: 'sine', cutoff: 2000, q: 0, decay: .32, level: .42, envAmount: 0 },
    { id: 'growl', name: 'Saw Growl', wave: 'sawtooth', cutoff: 520, q: 7, decay: .22, level: .2, envAmount: 1400 },
    { id: 'round', name: 'Round Finger', wave: 'triangle', cutoff: 900, q: 1, decay: .26, level: .36, envAmount: 300 },
  ];

  /* ------------------------------------------------------------------------
     HARMONIK — Tonarten, Akkordfolgen, SATB-Satz.
     ------------------------------------------------------------------------ */

  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const MODES = [
    { id: 'major', nameKey: 'lab.modeMajor', steps: MAJOR },
    { id: 'minor', nameKey: 'lab.modeMinor', steps: [0, 2, 3, 5, 7, 8, 10] },
    { id: 'dorian', nameKey: 'lab.modeDorian', steps: [0, 2, 3, 5, 7, 9, 10] },
    { id: 'mixolydian', nameKey: 'lab.modeMixolydian', steps: [0, 2, 4, 5, 7, 9, 10] },
  ];

  // Stufen (0 = I). Die Beschriftung (I–V–vi–IV …) wird je Modus berechnet,
  // weil dieselbe Stufenfolge in Moll anders klingt und heißt.
  const PROGRESSIONS = [
    { id: 'pop', degrees: [0, 4, 5, 3] },
    { id: 'fifties', degrees: [0, 5, 3, 4] },
    { id: 'sad', degrees: [5, 3, 0, 4] },
    { id: 'jazz', degrees: [1, 4, 0, 0], sevenths: true },
    { id: 'plagal', degrees: [0, 3, 0, 3] },
    { id: 'modal', degrees: [0, 6, 3, 0] },
    { id: 'andalusian', degrees: [0, 6, 5, 4] },
    { id: 'drone', degrees: [0], nameKey: 'lab.progDrone' },
  ];

  function degreeSemis(steps, deg) { return steps[mod(deg, 7)] + 12 * Math.floor(deg / 7); }
  /** Stufe in den Bereich -3…3 falten — ein Motiv, das dem Akkord folgt,
   *  soll nicht mit jeder höheren Stufe weiter nach oben wandern. */
  function foldDegree(deg) { const d = mod(deg, 7); return d > 3 ? d - 7 : d; }
  /** Grundton-Versatz so falten, dass hohe Tonarten nicht aus der Lage laufen. */
  const foldRoot = (pc) => (pc > 6 ? pc - 12 : pc);

  function noteNames() {
    const names = t('lab.noteNames').split(',');
    return names.length === 12 ? names : 'C,C♯,D,E♭,E,F,F♯,G,A♭,A,B♭,B'.split(',');
  }
  const noteLabel = (midi) => `${noteNames()[mod(midi, 12)]}${Math.floor(midi / 12) - 1}`;

  function chordQuality(steps, deg) {
    const root = degreeSemis(steps, deg);
    const third = degreeSemis(steps, deg + 2) - root;
    const fifth = degreeSemis(steps, deg + 4) - root;
    if (fifth === 6) return 'dim';
    if (fifth === 8) return 'aug';
    return third === 3 ? 'min' : 'maj';
  }

  function romanNumeral(steps, deg, sevenths) {
    const d = mod(deg, 7);
    const quality = chordQuality(steps, d);
    const base = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][d];
    const flat = steps[d] < MAJOR[d] ? '♭' : '';
    const core = quality === 'min' || quality === 'dim' ? base.toLowerCase() : base;
    return flat + core + (quality === 'dim' ? '°' : quality === 'aug' ? '+' : '') + (sevenths ? '7' : '');
  }

  function chordName(keyRoot, steps, deg, sevenths) {
    const d = mod(deg, 7);
    const quality = chordQuality(steps, d);
    const name = noteNames()[mod(keyRoot + steps[d], 12)];
    if (quality === 'dim') return name + (sevenths ? 'm7♭5' : '°');
    const seventh = sevenths ? (degreeSemis(steps, d + 6) - steps[d] === 11 ? 'maj7' : '7') : '';
    return name + (quality === 'min' ? 'm' : quality === 'aug' ? '+' : '') + seventh;
  }

  function chordPitchClasses(keyRoot, steps, deg, sevenths) {
    return (sevenths ? [0, 2, 4, 6] : [0, 2, 4]).map((o) => mod(keyRoot + degreeSemis(steps, deg + o), 12));
  }

  // Stimmumfänge (MIDI) für den vierstimmigen Satz — bewusst die bequeme
  // Mittellage, nicht die Extreme: das ist eine Übe-Hilfe, kein Solo.
  const SATB = ['S', 'A', 'T', 'B'];
  const SATB_RANGES = { S: [60, 79], A: [55, 74], T: [48, 67], B: [40, 60] };
  const SATB_COLOR = { S: '#4ECDC4', A: '#6BCB77', T: '#FFD93D', B: '#A78BFA' }; // wie VOICE_COLOR in app.js
  const SATB_KEY = { S: 'lab.voiceS', A: 'lab.voiceA', T: 'lab.voiceT', B: 'lab.voiceB' };

  /**
   * Ein Akkord als vierstimmiger Satz. Bass immer auf dem Grundton; für
   * Sopran/Alt/Tenor werden alle Lagen im Umfang durchprobiert (wenige
   * hundert Kombinationen) und die mit der kleinsten Bewegung gegenüber dem
   * vorigen Akkord gewählt — das ist Stimmführung im Kleinen. Strafen für
   * fehlende Terz, verdoppelte Terz, Stimmkreuzung und zu weite Abstände
   * halten den Satz lehrbuchnah.
   */
  function voiceChord(pcs, prev) {
    const within = ([lo, hi], pred) => { const out = []; for (let m = lo; m <= hi; m++) if (pred(m)) out.push(m); return out; };
    const nearest = (list, target) => list.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    const B = nearest(within(SATB_RANGES.B, (m) => mod(m, 12) === pcs[0]), prev.B);
    const isChordTone = (m) => pcs.includes(mod(m, 12));
    let best = null;
    let bestScore = Infinity;
    for (const T of within(SATB_RANGES.T, isChordTone)) {
      if (T <= B || T - B > 19) continue;
      for (const A of within(SATB_RANGES.A, isChordTone)) {
        if (A <= T || A - T > 12) continue;
        for (const S of within(SATB_RANGES.S, isChordTone)) {
          if (S <= A || S - A > 12) continue;
          const voices = [B, T, A, S].map((m) => mod(m, 12));
          let score = Math.abs(S - prev.S) + Math.abs(A - prev.A) + Math.abs(T - prev.T);
          if (!voices.includes(pcs[1])) score += 20;
          if (pcs[2] !== undefined && !voices.includes(pcs[2])) score += 4;
          if (pcs[3] !== undefined && !voices.includes(pcs[3])) score += 6;
          if (voices.filter((pc) => pc === pcs[1]).length > 1) score += 3;
          if (score < bestScore) { bestScore = score; best = { S, A, T, B }; }
        }
      }
    }
    return best || { S: prev.S, A: prev.A, T: prev.T, B };
  }

  /* ------------------------------------------------------------------------
     SONSTIGE AUSWAHLLISTEN
     ------------------------------------------------------------------------ */

  // Arpeggiator: was eine einzeln gehaltene Taste spielt, und was ohne
  // gedrückte Taste passiert (siehe _arpPool).
  const ARP_KEY_MODES = [['chord', 'lab.arpKeyChord'], ['notes', 'lab.arpKeyNotes']];
  const ARP_IDLE_MODES = [['progression', 'lab.arpIdleProg'], ['off', 'lab.arpIdleOff']];

  const BEAT_CATS = ['all', 'calm', 'dance', 'funky', 'breaks'];
  const MELODY_CATS = ['all', 'calm', 'dance', 'funky'];
  const PRESET_CATS = ['all', 'pad', 'keys', 'lead'];
  const CAT_KEY = { all: 'lab.catAll', calm: 'lab.catCalm', dance: 'lab.catDance', funky: 'lab.catFunky', breaks: 'lab.catBreaks',
                    pad: 'lab.presetPad', keys: 'lab.presetKeys', lead: 'lab.presetLead' };

  // Mischpult-Kanäle. Melodie, Arp und Tasten teilen sich EINEN Synth-Klang
  // (SOUND_LAYERS), haben aber eigene Kanäle für die Lautstärke.
  const BUSES = ['drums', 'bass', 'melody', 'arp', 'chords', 'keys', 'drone'];
  const BUS_KEY = { drums: 'lab.busDrums', bass: 'lab.busBass', melody: 'lab.busMelody', arp: 'lab.busArp',
                    chords: 'lab.busChords', keys: 'lab.busKeys', drone: 'lab.busDrone' };
  const SOUND_LAYERS = ['melody', 'arp', 'keys'];
  const SYNTH_LAYERS = [...SOUND_LAYERS, 'chords', 'drone'];

  const ECHO_DIVISIONS = [[1, '1/16'], [2, '1/8'], [3, '1/8·'], [4, '1/4'], [6, '1/4·']];
  const LFO_SYNCS = [[0, 'lab.lfoFree'], [1, '1/16'], [2, '1/8'], [4, '1/4'], [8, '1/2'], [16, 'lab.bar1']];

  // Computertastatur → Halbton ab dem tiefsten C der Klaviatur. event.code
  // meint die PHYSISCHE Taste — auf QWERTZ liegt KeyY dort, wo "Z" steht,
  // also zwischen T und U, genau richtig für Gis.
  const KEY_CODES = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH',
                     'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon', 'Quote'];
  // Tonart-Tasten: die Grundreihe spielt die Stufen der Tonart der Reihe nach.
  const SCALE_KEY_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
  const SCALE_PAD_COUNT = 15; // zwei Oktaven Tonleiter plus Grundton oben

  const TABS = [
    { id: 'beat', labelKey: 'lab.tabBeat' },
    { id: 'harmony', labelKey: 'lab.tabHarmony' },
    { id: 'melody', labelKey: 'lab.tabMelody' },
    { id: 'sound', labelKey: 'lab.tabSound' },
    { id: 'mixer', labelKey: 'lab.tabMixer' },
    { id: 'keys', labelKey: 'lab.tabKeys' },
  ];

  /* ------------------------------------------------------------------------
     ZUSTAND — alles, was gespeichert, geteilt, gewürfelt und rückgängig
     gemacht werden kann. Flüchtiges (gerade gedrückte Tasten, Latch) liegt
     bewusst außerhalb in der View.
     ------------------------------------------------------------------------ */

  function defaultState() {
    return {
      bpm: 106, swing: 0, pump: 0,
      patternIndex: 0, beat: beatFromPattern(DRUM_PATTERNS[0]), beatEdited: false,
      trackOn: { kick: true, snare: true, clap: true, hat: true, open: true, bass: true },
      bassSoundId: 'pluck',
      keyRoot: 0, modeId: 'major', progId: 'pop', chordBars: 1,
      chordsOn: false, satb: { S: 'on', A: 'on', T: 'on', B: 'on' },
      droneOn: false, droneFifth: true,
      melodyIndex: 0, melodyOn: true, melodyOctave: 4,
      arpOn: false, arpKeyMode: 'chord', arpIdle: 'progression', arpMode: 'up', arpDivision: 1, arpOctaves: 1,
      keysLayout: 'piano',
      octave: 4,
      sound: soundFromPreset(presetIndexByName('Velvet Choir')),
      mix: { drums: .8, bass: .8, melody: .75, arp: .6, chords: .55, keys: .8, drone: .5, master: .8 },
      mute: { drums: false, bass: false, melody: false, arp: false, chords: false, keys: false, drone: false },
      fx: { reverbLength: 1.8, echoDiv: 3, echoFeedback: .35, chorus: .2 },
      locks: { beat: false, harmony: false, melody: false, sound: false },
    };
  }

  /** Eingelesenen Stand (Speicherplatz, geteilter Code, Undo) Feld für Feld
   *  prüfen — fremde Codes dürfen nichts setzen, woran die Engine oder das
   *  Rendering scheitern würden. Unbekanntes fällt auf den Standard zurück. */
  function sanitizeState(raw) {
    const s = defaultState();
    if (!raw || typeof raw !== 'object') return s;
    const num = (v, lo, hi, fb) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : fb);
    const int = (v, lo, hi, fb) => (Number.isInteger(v) && v >= lo && v <= hi ? v : fb);
    const bool = (v, fb) => (typeof v === 'boolean' ? v : fb);
    const oneOf = (v, list, fb) => (list.includes(v) ? v : fb);
    const obj = (v) => (v && typeof v === 'object' ? v : {});

    s.bpm = Math.round(num(raw.bpm, 40, 180, s.bpm));
    s.swing = num(raw.swing, 0, 1, s.swing);
    s.pump = num(raw.pump, 0, 1, s.pump);
    s.patternIndex = int(raw.patternIndex, 0, DRUM_PATTERNS.length - 1, 0);
    const pattern = DRUM_PATTERNS[s.patternIndex];
    s.beat = sanitizeBeat(raw.beat, pattern);
    s.beatEdited = bool(raw.beatEdited, false);
    for (const track of TRACK_IDS) s.trackOn[track] = bool(obj(raw.trackOn)[track], true);
    s.bassSoundId = oneOf(raw.bassSoundId, BASS_SOUNDS.map((b) => b.id), s.bassSoundId);
    s.keyRoot = int(raw.keyRoot, 0, 11, 0);
    s.modeId = oneOf(raw.modeId, MODES.map((m) => m.id), s.modeId);
    s.progId = oneOf(raw.progId, PROGRESSIONS.map((p) => p.id), s.progId);
    s.chordBars = oneOf(raw.chordBars, [1, 2], 1);
    s.chordsOn = bool(raw.chordsOn, false);
    for (const v of SATB) s.satb[v] = oneOf(obj(raw.satb)[v], ['on', 'focus', 'mute'], 'on');
    s.droneFifth = bool(raw.droneFifth, true);
    s.melodyIndex = int(raw.melodyIndex, 0, MELODIES.length - 1, 0);
    s.melodyOn = bool(raw.melodyOn, true);
    s.melodyOctave = int(raw.melodyOctave, 3, 5, 4);
    s.arpOn = bool(raw.arpOn, false);
    s.arpKeyMode = oneOf(raw.arpKeyMode, ARP_KEY_MODES.map(([id]) => id), 'chord');
    s.arpIdle = oneOf(raw.arpIdle, ARP_IDLE_MODES.map(([id]) => id), 'progression');
    s.keysLayout = oneOf(raw.keysLayout, ['piano', 'scale'], 'piano');
    s.arpMode = oneOf(raw.arpMode, ['up', 'down', 'updown', 'random'], 'up');
    s.arpDivision = oneOf(raw.arpDivision, [1, 2, 4], 1);
    s.arpOctaves = oneOf(raw.arpOctaves, [1, 2, 3], 1);
    s.octave = int(raw.octave, 2, 5, 4);
    // Ältere Stände hatten je Ebene einen eigenen Klang — dann gilt der der Melodie.
    s.sound = sanitizeSound(raw.sound || obj(raw.sounds).melody, s.sound);
    for (const bus of [...BUSES, 'master']) s.mix[bus] = num(obj(raw.mix)[bus], 0, 1, s.mix[bus]);
    for (const bus of BUSES) s.mute[bus] = bool(obj(raw.mute)[bus], false);
    const fx = obj(raw.fx);
    s.fx = {
      reverbLength: num(fx.reverbLength, .2, 4, s.fx.reverbLength),
      echoDiv: oneOf(fx.echoDiv, ECHO_DIVISIONS.map(([v]) => v), s.fx.echoDiv),
      echoFeedback: num(fx.echoFeedback, 0, .85, s.fx.echoFeedback),
      chorus: num(fx.chorus, 0, 1, s.fx.chorus),
    };
    for (const lock of Object.keys(s.locks)) s.locks[lock] = bool(obj(raw.locks)[lock], false);
    // Der Liegeton braucht eine Nutzergeste zum Starten — nie aus einem
    // gespeicherten Stand heraus von selbst loslaufen lassen.
    s.droneOn = false;
    if (MELODIES[s.melodyIndex].meter !== pattern.meter) {
      s.melodyIndex = Math.max(0, MELODIES.findIndex((m) => m.meter === pattern.meter));
    }
    return s;
  }

  function sanitizeBeat(raw, pattern) {
    if (!raw || typeof raw !== 'object') return beatFromPattern(pattern);
    const steps = METERS[pattern.meter].steps;
    const beat = {};
    for (const track of TRACK_IDS) {
      beat[track] = {};
      const src = raw[track];
      if (!src || typeof src !== 'object') continue;
      for (const [key, value] of Object.entries(src)) {
        const step = Number(key);
        if (Number.isInteger(step) && step >= 0 && step < steps && typeof value === 'number' && Number.isFinite(value)) {
          beat[track][step] = clamp(value, -7, 14);
        }
      }
    }
    // Ein Zwischenstand kannte die offene Hi-Hat nur als Wert 2 in der
    // Hi-Hat-Spur — solche Stände auf die eigene Spur umziehen.
    for (const [step, value] of Object.entries(beat.hat)) {
      if (value === 2) { delete beat.hat[step]; beat.open[step] = 1; }
    }
    return beat;
  }

  function sanitizeSound(raw, fallback) {
    if (!raw || typeof raw !== 'object') return fallback;
    const index = Number.isInteger(raw.presetIndex) && SYNTH_PRESETS[raw.presetIndex] ? raw.presetIndex : fallback.presetIndex;
    const sound = soundFromPreset(index);
    for (const [key, [lo, hi]] of Object.entries(SOUND_RANGES)) {
      if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) sound[key] = clamp(raw[key], lo, hi);
    }
    if (WAVE_SHAPES.includes(raw.wave)) sound.wave = raw.wave;
    if (FILTER_TYPES.some((f) => f.id === raw.filterType)) sound.filterType = raw.filterType;
    if (typeof raw.mono === 'boolean') sound.mono = raw.mono;
    sound.custom = raw.custom === true;
    return sound;
  }

  // Teilen per Code: "GL1." + Base64 des JSON-Stands (UTF-8-sicher).
  const CODE_PREFIX = 'GL1.';
  function encodeState(state) {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return CODE_PREFIX + btoa(binary);
  }
  function decodeState(code) {
    const trimmed = String(code || '').trim();
    if (!trimmed.startsWith(CODE_PREFIX)) throw new Error('Kein Groove-Lab-Code');
    const binary = atob(trimmed.slice(CODE_PREFIX.length));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return sanitizeState(JSON.parse(new TextDecoder().decode(bytes)));
  }

  /* ------------------------------------------------------------------------
     ICONS — bekannte, einfarbige Piktogramme, keine erfundenen Formen und
     keine Farbe pro Symbol. Strichstärke und -stil wie die übrigen Icons in
     der App.
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
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    unlock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7"/>'),
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    save: svg('<path d="M6 3h12v18l-6-4-6 4Z"/>'),
    reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    speaker: svg('<path d="M4 9h3l5-4v14l-5-4H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
    speakerOff: svg('<path d="M4 9h3l5-4v14l-5-4H4Z"/><path d="M16 9l5 6M21 9l-5 6"/>'),
  };

  // Ein Piktogramm je Drumloop und Klang-Preset (siehe `icon`) plus die
  // Modul-Symbole.
  const PICTOGRAM = {
    // --- Drumloops ---
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2" fill="none"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7" fill="none"/>',
    note: '<path d="M15 17V4l4-1v13" fill="none"/><circle cx="13" cy="17" r="2.6" fill="none"/>',
    diamond: '<path d="M6 9h12M9 9l3 11 3-11M6 9l3-6h6l3 6-6 11Z" fill="none"/>',
    footprints: '<ellipse cx="8" cy="15.5" rx="2.4" ry="3.6" transform="rotate(-12 8 15.5)" fill="none"/><circle cx="6" cy="10.7" r=".7" fill="currentColor" stroke="none"/><circle cx="8" cy="10" r=".7" fill="currentColor" stroke="none"/><ellipse cx="16" cy="9.5" rx="2.1" ry="3.2" transform="rotate(10 16 9.5)" fill="none"/><circle cx="14.4" cy="5.4" r=".6" fill="currentColor" stroke="none"/><circle cx="16.2" cy="4.9" r=".6" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="none"/><path d="M12 7v5l3.5 2" fill="none"/>',
    house: '<path d="M4 11 12 4 20 11" fill="none"/><path d="M6 11v9h12v-9" fill="none"/><path d="M10 20v-5h4v5" fill="none"/>',
    bolt: '<path d="M13 2 5 14h5l-1 8 8-12h-5l1-8Z" fill="none"/>',
    speaker: '<path d="M4 9h3l5-4v14l-5-4H4Z" fill="none"/><path d="M16 9a4 4 0 0 1 0 6" fill="none"/><path d="M18.5 6.5a8 8 0 0 1 0 11" fill="none"/>',
    scissors: '<circle cx="6" cy="6" r="2.2" fill="none"/><circle cx="6" cy="18" r="2.2" fill="none"/><path d="M7.8 7.6 20 19M7.8 16.4 20 5"/>',
    puzzle: '<path d="M4 4h6a2 2 0 1 1 4 0h6v6a2 2 0 1 0 0 4v6h-6a2 2 0 1 1-4 0H4v-6a2 2 0 1 0 0-4Z" fill="none"/>',
    feather: '<path d="M20 4C11 4 6 9 6 18" fill="none"/><path d="M20 4c0 8-5 12-12 12" fill="none"/><path d="M4 20l6-6"/>',
    glass: '<path d="M5 4h14l-7 8Z" fill="none"/><path d="M12 12v7M8 20h8"/>',
    sunset: '<path d="M3 18h18"/><path d="M6 18a6 6 0 0 1 12 0" fill="none"/><path d="M12 4v3M5 9l2 2M19 9l-2 2"/>',
    flag: '<path d="M5 21V4" fill="none"/><path d="M5 4h12l-2.5 4L17 12H5" fill="none"/>',

    // --- Module und Klang-Presets ---
    pulse: '<path d="M22 12h-4l-3 8L9 3l-3 9H2" fill="none"/>',
    star: '<path d="M12 3l2.5 5.6 6.1.6-4.6 4.1 1.3 6-5.3-3.2-5.3 3.2 1.3-6-4.6-4.1 6.1-.6Z" fill="none"/>',
    stairs: '<path d="M3 20v-4h4v-4h4v-4h4V4h4" fill="none"/>',
    target: '<circle cx="12" cy="12" r="8" fill="none"/><circle cx="12" cy="12" r="4.2" fill="none"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/>',
    repeat: '<path d="M4 7h11a3 3 0 0 1 3 3v2" fill="none"/><path d="M15 9l3-3 3 3" fill="none"/><path d="M20 17H9a3 3 0 0 1-3-3v-2" fill="none"/><path d="M9 15l-3 3-3-3" fill="none"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" fill="none"/>',
    sun: '<circle cx="12" cy="12" r="4.2" fill="none"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    droplet: '<path d="M12 3c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12Z" fill="none"/>',
    wave: '<path d="M2 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0M2 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0" fill="none"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V17h5v-1.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" fill="none"/>',
    users: '<circle cx="9" cy="8" r="3" fill="none"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none"/><path d="M16 8.5a2.5 2.5 0 1 1 0-5" fill="none"/><path d="M15 14.2c2.9.6 5 2.9 5 5.8" fill="none"/>',
    wind: '<path d="M2 8h11a2.5 2.5 0 1 0-2.5-2.5" fill="none"/><path d="M2 13h15a2.5 2.5 0 1 1-2.5 2.5" fill="none"/><path d="M2 18h9a2 2 0 1 0-2-2" fill="none"/>',
    cassette: '<rect x="3" y="6" width="18" height="13" rx="2" fill="none"/><circle cx="8.5" cy="12.5" r="2.2" fill="none"/><circle cx="15.5" cy="12.5" r="2.2" fill="none"/><path d="M8.5 12.5h7M6 17h12"/>',
    zap: '<path d="M13 2 5 14h5l-1 8 8-12h-5l1-8Z" fill="currentColor" stroke="none"/>',
    horn: '<path d="M3 10v4h3l6 4V6L6 10H3Z" fill="none"/><path d="M15 9a4 4 0 0 1 0 6" fill="none"/>',
    door: '<rect x="6" y="3" width="12" height="18" rx="1" fill="none"/><circle cx="14.5" cy="12" r=".9" fill="currentColor" stroke="none"/>',
    flame: '<path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1.5-1-2-1-3.5 1.5 1 2.5 3 2.5 5a5.5 5.5 0 1 1-11 0C5.5 8 9 6.5 12 3Z" fill="none"/>',
    bell: '<path d="M12 3a5 5 0 0 0-5 5v3c0 1.5-.5 3-2 4.5h14c-1.5-1.5-2-3-2-4.5V8a5 5 0 0 0-5-5Z" fill="none"/><path d="M10 19a2 2 0 0 0 4 0" fill="none"/>',
    compass: '<circle cx="12" cy="12" r="9" fill="none"/><path d="M15 9l-2 6-6 2 2-6Z" fill="none"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9 5.5 5.5 0 0 1 10.6-1.6A4 4 0 0 1 17 18H7Z" fill="none"/>',
    anchor: '<circle cx="12" cy="5" r="2" fill="none"/><path d="M12 7v14M7 13H2a10 10 0 0 0 10 8 10 10 0 0 0 10-8h-5" fill="none"/><path d="M8 9h8"/>',
    key: '<circle cx="7" cy="7" r="4" fill="none"/><path d="M10 10l10 10M17 15l3-3M14 18l2-2" fill="none"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2" fill="none"/><circle cx="10" cy="12" r="2" fill="none"/><circle cx="18" cy="18" r="2" fill="none"/>',
  };

  const pictogramIcon = (name) => svg(PICTOGRAM[name] || '');

  /** Eine Periode der Oszillator-Wellenform — für die Wellenform-Auswahl. */
  function waveIcon(wave) {
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      let y;
      if (wave === 'sine') y = Math.sin(x * Math.PI * 2);
      else if (wave === 'square') y = x < .5 ? 1 : -1;
      else if (wave === 'sawtooth') y = x * 2 - 1;
      else y = x < .5 ? x * 4 - 1 : 3 - x * 4; // triangle
      pts.push(`${(2 + x * 20).toFixed(1)},${(12 - y * 8).toFixed(1)}`);
    }
    return svg(`<polyline points="${pts.join(' ')}" fill="none"/>`);
  }

  /** Mini-Notenrolle des ersten Takts einer Melodie. */
  function melodyPreview(melody) {
    const notes = melody.bars[0];
    const degrees = notes.map((n) => n[1]);
    const lo = Math.min(...degrees);
    const span = Math.max(1, Math.max(...degrees) - lo);
    const rects = notes.map(([at, deg, len]) =>
      `<rect x="${at * 4}" y="${(12.5 - (deg - lo) / span * 11).toFixed(1)}" width="${Math.max(2, len * 4 - 1)}" height="2.6" rx="1.2"/>`).join('');
    return `<svg class="preview" viewBox="0 0 64 16" preserveAspectRatio="xMinYMid meet" aria-hidden="true">${rects}</svg>`;
  }

  /* ------------------------------------------------------------------------
     GrooveEngine — reine Klangerzeugung.

     Signalweg:
       Drums ─┐                       (Kick, Snare, Clap, Hi-Hats)
       Bass  ─┴──────────────────────────────────────┐
       Ebene (melody/arp/keys/chords):               ├→ master → Limiter → Ausgang
         Voices → input → Drive → level ─→ synthSum ─┤ (über "duck" = Pumpen,
                                    ├→ Hall-Send     │  und Chorus)
                                    └→ Echo-Send     │
       Liegeton: eigene Ebene, geht am Pumpen vorbei ┘
     ------------------------------------------------------------------------ */

  class GrooveEngine {
    constructor() {
      this.ctx = null;
      this.buses = null;
      this.layers = null;
      this.noiseBuffer = null;
      this.voices = new Set();
      this.maxVoices = 32;   // Obergrenze gleichzeitiger Synth-Stimmen (Handy-CPU)
      this.lastMidi = {};    // je Ebene: letzte Note (für Glide)
      this.monoVoice = {};   // je Ebene: aktuelle Stimme im Mono-Modus
      this._reverbTimer = 0;
      this._reverbLength = 0;
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
      const gain = (value, to) => { const g = ctx.createGain(); g.gain.value = value; if (to) g.connect(to); return g; };

      const master = gain(.8);
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -13; limiter.ratio.value = 6;
      master.connect(limiter).connect(ctx.destination);

      const drums = gain(.72, master);
      const bass = gain(.8, master);
      const duck = gain(1, master);
      // Synth-Summe: leiser als früher (.55) und mit Hochpass bei 140 Hz —
      // unten gehört der Platz Bass und Kick; ohne diese Trennung klang der
      // Synth erst bei ~30 % Kanalpegel "im Mix", vorher darüber.
      const synthHighpass = ctx.createBiquadFilter();
      synthHighpass.type = 'highpass'; synthHighpass.frequency.value = 140; synthHighpass.Q.value = .5;
      synthHighpass.connect(duck);
      const synthSum = gain(.4, synthHighpass);

      // Chorus: zwei kurze, gegenläufig modulierte Verzögerungen, hart links
      // und rechts — macht auch Mono-Klänge breit.
      const chorusWet = gain(0, duck);
      const chorusLfo = ctx.createOscillator();
      chorusLfo.frequency.value = .7;
      [[.016, -1, .003], [.023, 1, -.003]].forEach(([base, pan, depth]) => {
        const d = ctx.createDelay(.1); d.delayTime.value = base;
        const lfoGain = gain(depth); chorusLfo.connect(lfoGain).connect(d.delayTime);
        const node = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        synthSum.connect(d);
        if (node) { node.pan.value = pan; d.connect(node).connect(chorusWet); } else d.connect(chorusWet);
      });
      chorusLfo.start();

      const convolver = ctx.createConvolver();
      convolver.buffer = this._impulseResponse(1.8);
      this._reverbLength = 1.8;
      const reverbIn = gain(1);
      reverbIn.connect(convolver).connect(duck);

      const echoIn = gain(1);
      const delay = ctx.createDelay(2); delay.delayTime.value = .3;
      const feedback = gain(.35);
      const echoTone = ctx.createBiquadFilter(); echoTone.type = 'lowpass'; echoTone.frequency.value = 3200;
      echoIn.connect(delay);
      delay.connect(echoTone).connect(feedback).connect(delay);
      delay.connect(duck);

      this.layers = {};
      for (const id of SYNTH_LAYERS) {
        const input = gain(1);
        const shaper = ctx.createWaveShaper();
        shaper.oversample = '2x';
        const level = gain(.7, id === 'drone' ? master : synthSum);
        input.connect(shaper).connect(level);
        const reverbSend = gain(0, reverbIn);
        const echoSend = gain(0, echoIn);
        level.connect(reverbSend);
        level.connect(echoSend);
        this.layers[id] = { input, shaper, level, reverbSend, echoSend };
      }

      this.buses = { master, drums, bass, duck, synthSum, chorusWet, convolver, delay, feedback };
      this.noiseBuffer = this._whiteNoise(.5);
      this.lastMidi = {};
      this.monoVoice = {};
      await ctx.resume();
    }

    async stop() {
      this.voices.forEach((v) => this._releaseVoice(v, true));
      this.voices.clear();
      clearTimeout(this._reverbTimer);
      const ctx = this.ctx;
      this.ctx = null;
      this.buses = null;
      this.layers = null;
      try { await ctx?.close(); } catch { /* bereits geschlossen */ }
    }

    /* ---- Pegel & Effekte ---- */

    setMaster(value) {
      if (!this.ctx) return;
      this.buses.master.gain.setTargetAtTime(clamp(value, 0, 1), this.ctx.currentTime, .02);
    }

    setBusLevel(bus, value) {
      if (!this.ctx) return;
      const node = this.layers[bus]?.level || this.buses[bus];
      node?.gain.setTargetAtTime(clamp(value, 0, 1), this.ctx.currentTime, .02);
    }

    /** Klangabhängige Teile einer Ebene: Hall-/Echo-Anteil und Drive. */
    setLayerSound(layer, sound) {
      const L = this.layers?.[layer];
      if (!L) return;
      const now = this.ctx.currentTime;
      L.reverbSend.gain.setTargetAtTime(sound.reverbWet, now, .03);
      L.echoSend.gain.setTargetAtTime(sound.echoWet, now, .03);
      const drive = sound.drive || 0;
      if (drive !== L.drive) {
        L.drive = drive;
        L.shaper.curve = drive > 0 ? this._driveCurve(drive) : null;
        // Mehr Drive = mehr Pegel; grob ausgleichen, damit der Regler
        // nach Charakter klingt und nicht bloß nach "lauter".
        L.input.gain.value = 1 / (1 + drive * 1.2);
      }
    }

    setFx(fx, stepSeconds) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.buses.delay.delayTime.setTargetAtTime(clamp(fx.echoDiv * stepSeconds, .02, 1.9), now, .05);
      this.buses.feedback.gain.setTargetAtTime(clamp(fx.echoFeedback, 0, .85), now, .03);
      this.buses.chorusWet.gain.setTargetAtTime(clamp(fx.chorus, 0, 1) * .8, now, .03);
      this.setReverbLength(fx.reverbLength);
    }

    /** Neuer Hall-Impuls — entprellt: beim Drehen am Regler käme sonst bei
     *  jedem Pointer-Move ein neuer Stereo-Puffer von bis zu 4 s zustande
     *  (spürbares Ruckeln und Knacken auf dem Handy). */
    setReverbLength(seconds) {
      if (!this.ctx) return;
      const target = clamp(seconds, .2, 4);
      if (Math.abs(target - this._reverbLength) < .01) return;
      clearTimeout(this._reverbTimer);
      this._reverbTimer = global.setTimeout(() => {
        if (!this.ctx) return;
        this._reverbLength = target;
        this.buses.convolver.buffer = this._impulseResponse(target);
      }, 140);
    }

    /** Pumpen: die Synth-Ebenen kurz leiser, wenn die Kick kommt, und dann
     *  zurück hoch — der typische House-Sidechain-Effekt. */
    duckAt(time, depth, beatSeconds) {
      const g = this.buses.duck.gain;
      g.cancelScheduledValues(time);
      g.setValueAtTime(1 - clamp(depth, 0, 1) * .85, time);
      g.setTargetAtTime(1, time + .01, beatSeconds * .22);
    }

    _driveCurve(amount) {
      const k = 1 + amount * 12;
      const n = 1024;
      const curve = new Float32Array(n);
      const norm = Math.tanh(k);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / norm;
      }
      return curve;
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

    /* ---- Schlagzeug, Bass, Klick ---- */

    playKick(time, velocity = 1) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + .11);
      gain.gain.setValueAtTime(.7 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .19);
      osc.connect(gain).connect(this.buses.drums);
      osc.start(time); osc.stop(time + .2);
    }

    playNoise(time, { cutoff, length, volume, type = 'highpass', q = .7 }) {
      const ctx = this.ctx;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = this.noiseBuffer;
      filter.type = type; filter.frequency.value = cutoff; filter.Q.value = q;
      gain.gain.setValueAtTime(Math.max(.0002, volume), time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + length);
      source.connect(filter).connect(gain).connect(this.buses.drums);
      source.start(time); source.stop(time + length + .02);
    }

    /** Snare: ein kurzer, tonaler "Fell"-Thump (Dreieck, ~190→110 Hz) plus
     *  eng gefiltertes Bandpass-Rauschen — enger und "schnarrender" als die
     *  breitbandige Clap, damit beide klar unterscheidbar bleiben. */
    playSnare(time, velocity = 1) {
      const ctx = this.ctx;
      const body = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(190, time);
      body.frequency.exponentialRampToValueAtTime(110, time + .08);
      bodyGain.gain.setValueAtTime(.25 * velocity, time);
      bodyGain.gain.exponentialRampToValueAtTime(.0001, time + .09);
      body.connect(bodyGain).connect(this.buses.drums);
      body.start(time); body.stop(time + .1);
      this.playNoise(time, { cutoff: 1800, length: .16, volume: .22 * velocity, type: 'bandpass', q: 1.1 });
    }

    /** Clap: drei eng gestaffelte, breitere Rausch-Bursts ("Flam") statt
     *  eines einzelnen Treffers — eine echte Handclap ist immer ein kurzer
     *  Schauer aus mehreren Anschlägen. */
    playClap(time, velocity = 1) {
      const offsets = [0, .012, .026];
      offsets.forEach((offset, i) => {
        const isLast = i === offsets.length - 1;
        this.playNoise(time + offset, {
          cutoff: 1500, length: isLast ? .11 : .04, volume: (isLast ? .22 : .13) * velocity,
          type: 'bandpass', q: 3.2,
        });
      });
    }

    /** Hi-Hat: geschlossen kurz und spitz, offen deutlich länger und etwas
     *  heller — vorher klangen beide gleich, obwohl die Loops sie trennen. */
    playHat(time, velocity = 1, open = false) {
      if (open) this.playNoise(time, { cutoff: 7200, length: .3, volume: .05 * velocity, type: 'highpass', q: .9 });
      else this.playNoise(time, { cutoff: 6500, length: .045, volume: .055 * velocity, type: 'highpass', q: .7 });
    }

    hitTrack(track, time, velocity = 1) {
      if (track === 'kick') this.playKick(time, velocity);
      else if (track === 'snare') this.playSnare(time, velocity);
      else if (track === 'clap') this.playClap(time, velocity);
      else this.playHat(time, velocity, track === 'open');
    }

    playBass(time, midi, velocity, sound) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = sound.wave;
      osc.frequency.setValueAtTime(noteHz(midi), time);
      filter.type = 'lowpass'; filter.Q.value = sound.q;
      filter.frequency.setValueAtTime(sound.cutoff + sound.envAmount, time);
      if (sound.envAmount) filter.frequency.exponentialRampToValueAtTime(sound.cutoff, time + sound.decay * .8);
      gain.gain.setValueAtTime(sound.level * velocity, time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + sound.decay);
      osc.connect(filter).connect(gain).connect(this.buses.bass);
      osc.start(time); osc.stop(time + sound.decay + .02);
    }

    /* ---- Synth-Stimmen ---- */

    /**
     * Eine Synth-Note. Mit `duration` wird sie komplett auf der Audio-Uhr
     * geplant (Anschlag, Hüllkurve, Ausklingen, Stopp) — früher löste ein
     * setTimeout das Loslassen aus, was im gedrosselten Hintergrund-Tab
     * hörbar zu spät kam. Ohne `duration` klingt sie, bis releaseVoice().
     * opts: layer (Ebene/Kanal), stepSeconds (für taktsynchrone LFOs),
     * glide (überschreibt sound.glide; 0 = aus).
     */
    playTone(sound, midi, time, velocity, duration, { layer = 'melody', stepSeconds = .14, glide } = {}) {
      const ctx = this.ctx;
      const L = this.layers[layer];

      // Stimmenlimit: die älteste Stimme weicht — nie der Liegeton, der
      // ist absichtlich dauerhaft.
      if (this.voices.size >= this.maxVoices) {
        for (const oldest of this.voices) { if (oldest.layer !== 'drone') { this._releaseVoice(oldest, true); break; } }
      }
      if (sound.mono) {
        const prev = this.monoVoice[layer];
        if (prev && !prev.done) this._releaseVoiceAt(prev, time);
      }

      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      const nyquist = ctx.sampleRate * .45;
      const baseCutoff = Math.min(sound.cutoff, nyquist);
      filter.type = sound.filterType || 'lowpass';
      filter.Q.value = sound.resonance;

      // Filter-Hüllkurve: dieselbe Attack/Decay-Form wie die Lautstärke,
      // aber auf den Cutoff gelegt — ein klassischer Analog-Synth-Zug.
      const attack = Math.max(.003, sound.attack);
      const peakCutoff = Math.min(baseCutoff + (sound.filterEnvAmount || 0), nyquist);
      filter.frequency.setValueAtTime(baseCutoff, time);
      filter.frequency.linearRampToValueAtTime(peakCutoff, time + attack);
      filter.frequency.linearRampToValueAtTime(baseCutoff, time + attack + sound.decay);

      // Lautstärke-Hüllkurve. Ist die Note kürzer als Attack+Decay, wird die
      // Kurve an der Stelle abgeschnitten, statt spätere Rampen stehen zu
      // lassen, die nach dem Loslassen wieder hochziehen würden.
      // Pegelausgleich: drei verstimmte Stimmen, ein Sub-Oszillator oder eine
      // obertonreiche Welle (Säge/Rechteck) machten ein Preset bisher bis zu
      // doppelt so laut wie ein schlichtes — jetzt klingen alle etwa gleich laut.
      const voiceCount = 1 + (sound.detune ? 1.1 : 0) + (sound.subLevel || 0) * .6;
      const peak = velocity * (WAVE_LEVEL[sound.wave] ?? 1) / voiceCount;
      const sustainLevel = peak * sound.sustain;
      gain.gain.setValueAtTime(.0001, time);
      if (duration && duration < attack) {
        gain.gain.linearRampToValueAtTime(Math.max(.0001, peak * duration / attack), time + duration);
      } else {
        gain.gain.linearRampToValueAtTime(peak, time + attack);
        if (duration && duration < attack + sound.decay) {
          const v = peak + (sustainLevel - peak) * (duration - attack) / sound.decay;
          gain.gain.linearRampToValueAtTime(Math.max(.0001, v), time + duration);
        } else {
          gain.gain.linearRampToValueAtTime(Math.max(.0001, sustainLevel), time + attack + sound.decay);
        }
      }
      let stopAt = null;
      if (duration) {
        gain.gain.setTargetAtTime(0, time + duration, Math.max(.01, sound.release / 4));
        stopAt = time + duration + sound.release * 1.3 + .05;
      }

      const baseFreq = noteHz(midi);
      const glideTime = glide ?? sound.glide ?? 0;
      const fromMidi = this.lastMidi[layer];
      this.lastMidi[layer] = midi;
      const setPitch = (param, ratio) => {
        if (glideTime > 0 && fromMidi !== undefined && fromMidi !== midi) {
          param.setValueAtTime(noteHz(fromMidi) * ratio, time);
          param.exponentialRampToValueAtTime(baseFreq * ratio, time + glideTime);
        } else {
          param.setValueAtTime(baseFreq * ratio, time);
        }
      };

      const oscillators = [];
      const lfos = [];

      // Unisono: bei sound.detune zwei zusätzliche, leicht verstimmte
      // Stimmen — mit width links/rechts im Stereobild verteilt.
      const detune = sound.detune || 0;
      const spreads = detune ? [[0, 0], [detune, 1], [-detune, -1]] : [[0, 0]];
      for (const [cents, side] of spreads) {
        const osc = ctx.createOscillator();
        osc.type = sound.wave;
        osc._ratio = 1;
        setPitch(osc.frequency, 1);
        osc.detune.value = cents;

        const voiceGain = ctx.createGain();
        voiceGain.gain.value = cents === 0 ? 1 : .55;
        let out = osc.connect(voiceGain);
        if (side && sound.width && ctx.createStereoPanner) {
          const pan = ctx.createStereoPanner();
          pan.pan.value = side * sound.width;
          out = out.connect(pan);
        }
        out.connect(filter);

        // Vibrato: eine Tonhöhen-LFO, die erst nach vibratoDelay einschwingt.
        if (sound.vibratoDepth) {
          const lfo = ctx.createOscillator();
          lfo.frequency.value = sound.vibratoRate || 5;
          const lfoGain = ctx.createGain();
          const delay = sound.vibratoDelay ?? .15;
          lfoGain.gain.setValueAtTime(0, time);
          lfoGain.gain.setValueAtTime(0, time + delay);
          lfoGain.gain.linearRampToValueAtTime(sound.vibratoDepth, time + delay + .25);
          lfo.connect(lfoGain).connect(osc.detune);
          lfo.start(time);
          lfos.push(lfo);
        }

        // Pitch-Drop: schneller Gleitton von oben in die Zielnote hinein.
        if (sound.pitchDrop) {
          const drop = Math.max(.02, attack);
          osc.detune.setValueAtTime(cents + sound.pitchDrop, time);
          osc.detune.linearRampToValueAtTime(cents, time + drop);
        }

        osc.start(time);
        oscillators.push(osc);
      }

      // Sub-Oszillator: eine Oktave tiefer, immer Sinus.
      if (sound.subLevel) {
        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub._ratio = .5;
        setPitch(sub.frequency, .5);
        const subGain = ctx.createGain();
        subGain.gain.value = sound.subLevel;
        sub.connect(subGain).connect(filter);
        sub.start(time);
        oscillators.push(sub);
      }

      // LFO auf den Filter (über filter.detune, also in Cent = Oktaven-
      // gerecht): frei in Hz oder im Takt (lfoSync in 16teln) — Wah/Wobble.
      if (sound.lfoDepth && (sound.lfoRate || sound.lfoSync)) {
        const lfo = ctx.createOscillator();
        lfo.type = 'triangle';
        lfo.frequency.value = sound.lfoSync ? 1 / (sound.lfoSync * stepSeconds) : sound.lfoRate;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = sound.lfoDepth;
        lfo.connect(lfoGain).connect(filter.detune);
        lfo.start(time);
        lfos.push(lfo);
      }

      filter.connect(gain).connect(L.input);

      const voice = { oscillators, lfos, gain, release: sound.release, done: false, layer };
      if (stopAt !== null) {
        oscillators.forEach((osc) => osc.stop(stopAt));
        lfos.forEach((lfo) => lfo.stop(stopAt));
      }
      this.voices.add(voice);
      if (sound.mono) this.monoVoice[layer] = voice;
      oscillators[0].addEventListener('ended', () => { voice.done = true; this.voices.delete(voice); }, { once: true });
      return voice;
    }

    /** Stimme auf neue Tonhöhe ziehen (Liegeton folgt der Tonart). */
    retune(voice, midi, time) {
      if (!voice || voice.done || !this.ctx) return;
      voice.oscillators.forEach((osc) => osc.frequency.setTargetAtTime(noteHz(midi) * (osc._ratio || 1), time, .06));
    }

    _releaseVoice(voice, fast = false) {
      if (!voice || voice.done || !this.ctx) return;
      const now = this.ctx.currentTime;
      const release = fast ? .03 : voice.release;
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(Math.max(.0001, voice.gain.gain.value), now);
        voice.gain.gain.exponentialRampToValueAtTime(.0001, now + release);
        const stopAt = now + release + .02;
        voice.oscillators.forEach((osc) => osc.stop(stopAt));
        voice.lfos.forEach((lfo) => lfo.stop(stopAt));
      } catch { /* Oszillator kann schon beendet sein */ }
      voice.done = true;
      this.voices.delete(voice);
    }

    /** Mono-Modus: die vorige Stimme genau dann abbrechen, wenn die neue
     *  einsetzt (auf der Audio-Uhr, nicht "jetzt"). */
    _releaseVoiceAt(voice, time) {
      try {
        voice.gain.gain.cancelScheduledValues(time);
        voice.gain.gain.setTargetAtTime(0, time, .015);
        voice.oscillators.forEach((osc) => osc.stop(time + .12));
        voice.lfos.forEach((lfo) => lfo.stop(time + .12));
      } catch { /* schon beendet */ }
      voice.done = true;
      this.voices.delete(voice);
    }

    releaseVoice(voice) { this._releaseVoice(voice, false); }
    releaseVoiceFast(voice) { this._releaseVoice(voice, true); }

    releaseLayers(layers) {
      this.voices.forEach((voice) => { if (layers.includes(voice.layer)) this._releaseVoice(voice, true); });
    }
  }

  /* ------------------------------------------------------------------------
     Knob — Dreh-Regler für alle Synth-Parameter. 270°-Sweep, Pointer-Drag
     (vertikal) plus Pfeiltasten. `log: true` für Frequenzen/Zeiten, bei
     denen die untere Hälfte des Wertebereichs die feinere Hälfte ist.
     ------------------------------------------------------------------------ */

  class Knob {
    constructor({ label, min, max, value, format, onInput, log = false }) {
      this.min = min; this.max = max; this.value = value; this.log = log && min > 0;
      this.format = format || ((v) => v.toFixed(2));
      this.onInput = onInput;

      this.el = document.createElement('div');
      this.el.className = 'knob-field';
      this.el.innerHTML = `
        <button type="button" class="knob" role="slider" tabindex="0"
                aria-label="${label}" aria-valuemin="${min}" aria-valuemax="${max}">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle class="knob-track" cx="20" cy="20" r="16"/>
            <circle class="knob-fill" cx="20" cy="20" r="16"/>
            <circle class="knob-dot" cx="20" cy="6" r="2.6"/>
          </svg>
        </button>
        <span class="knob-label">${label}</span>
        <output class="knob-value"></output>`;

      this.button = this.el.querySelector('.knob');
      this.dot = this.el.querySelector('.knob-dot');
      this.fill = this.el.querySelector('.knob-fill');
      this.output = this.el.querySelector('.knob-value');
      this.button.addEventListener('pointerdown', (e) => this._startDrag(e));
      this.button.addEventListener('keydown', (e) => this._handleKey(e));
      this._render();
    }

    _toPos(v) {
      if (this.log) return Math.log(v / this.min) / Math.log(this.max / this.min);
      return (v - this.min) / (this.max - this.min || 1);
    }

    _fromPos(p) {
      const pos = clamp(p, 0, 1);
      if (this.log) return this.min * Math.pow(this.max / this.min, pos);
      return this.min + pos * (this.max - this.min);
    }

    setValue(value, { silent = true } = {}) {
      this.value = clamp(value, this.min, this.max);
      this._render();
      if (!silent) this.onInput?.(this.value);
    }

    _startDrag(event) {
      event.preventDefault();
      // Capture kann in seltenen Fällen fehlschlagen (z. B. ein bereits
      // beendeter Pointer) — das Ziehen selbst funktioniert dann trotzdem.
      try { this.button.setPointerCapture(event.pointerId); } catch { /* siehe oben */ }
      const startY = event.clientY;
      const startPos = this._toPos(this.value);
      const move = (e) => this.setValue(this._fromPos(startPos + (startY - e.clientY) / 150), { silent: false });
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
      const delta = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key];
      if (!delta) return;
      event.preventDefault();
      this.setValue(this._fromPos(this._toPos(this.value) + delta / 40), { silent: false });
    }

    _render() {
      const fraction = clamp(this._toPos(this.value), 0, 1);
      this.dot.setAttribute('transform', `rotate(${(-135 + fraction * 270).toFixed(1)} 20 20)`);
      const circumference = 2 * Math.PI * 16;
      this.fill.setAttribute('stroke-dasharray', `${(circumference * .75 * fraction).toFixed(2)} ${circumference}`);
      this.button.setAttribute('aria-valuenow', String(this.value));
      this.button.setAttribute('aria-valuetext', this.format(this.value));
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
      this.state = defaultState();
      this.ui = { tab: 'beat', beatCat: 'all', melodyCat: 'all', presetCat: 'all', latchOn: false };

      this.playing = false;
      this.globalStep = 0;
      this.nextStepTime = 0;
      this.schedulerTimer = 0;
      this.visualFrame = 0;
      this.scheduledSteps = [];
      this.shown = null;               // zuletzt angezeigter Schritt {g, h}

      this.keyVoices = new Map();      // Pointer-ID/Tastencode -> { keyEl, voice, midi }
      this.latchedNotes = new Set();   // MIDI-Noten, per Latch gehalten
      this.rollTimers = {};            // track -> Timer-Handle des Halten-Rolls
      this.droneVoices = [];
      this.history = [];               // Undo-Stapel (JSON-Stände)
      this.tapTimes = [];
      this._voicingCache = null;
      this._syncedCtx = null;
      this._soundKnobs = {};

      this._storage = null;
      this._saved = { slots: [null, null, null, null], last: null };
      this._storageRequested = false;
      this._restoreFocusTo = null;
      this._bodyOverflow = '';
      this._onKeydown = (event) => this._handleKeydown(event);
      this._onKeyup = (event) => this._handleKeyup(event);

      this._wireControls();
      this._buildKeyboard();
      this._wireKeyboard(this.$('.keyboard'), '.key');
      this._wireKeyboard(this.$('.scale-pads'), '.pad');
      this._renderAll();
      this._setTab('beat');
    }

    $(selector) { return this.shadowRoot.querySelector(selector); }
    $all(selector) { return Array.from(this.shadowRoot.querySelectorAll(selector)); }

    /* ---- Öffentliche API ---- */

    open({ accent, storage } = {}) {
      this._restoreFocusTo = document.activeElement;
      this.style.setProperty('--accent', accent || '#f868b0');
      const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(accent || '');
      this.style.setProperty('--accent-rgb', match
        ? `${parseInt(match[1], 16)},${parseInt(match[2], 16)},${parseInt(match[3], 16)}`
        : '248,104,176');

      if (storage && typeof storage.load === 'function') this._storage = storage;
      this._loadStorage();

      this._bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      this.hidden = false;
      document.addEventListener('keydown', this._onKeydown);
      document.addEventListener('keyup', this._onKeyup);
      requestAnimationFrame(() => this.$('.transport-play')?.focus());
    }

    async close() {
      this.stop();
      this._releaseAllKeys();
      this._stopDrone();
      this.state.droneOn = false;
      this._closeSheet();
      this._saved.last = this._snapshot();
      this._persist();
      this.hidden = true;
      document.removeEventListener('keydown', this._onKeydown);
      document.removeEventListener('keyup', this._onKeyup);
      document.body.style.overflow = this._bodyOverflow;
      await this.engine.stop();
      this._syncedCtx = null;
      this._renderAll();
      this._restoreFocusTo?.focus?.();
    }

    /* ---- Speichern ----------------------------------------------------
       Die Ablage kommt von außen (app.js: IndexedDB-meta-Store, siehe
       loadGrooveLab-Aufruf), diese Datei kennt keine Datenbank. Ohne
       Ablage funktionieren Codes und Undo trotzdem, nur nichts überlebt
       das Schließen. Gemerkt werden vier Speicherplätze plus der letzte
       Stand beim Schließen. */

    _loadStorage() {
      if (!this._storage || this._storageRequested) return;
      this._storageRequested = true;
      Promise.resolve(this._storage.load()).then((data) => {
        if (!data || typeof data !== 'object') return;
        const slots = Array.isArray(data.slots) ? data.slots : [];
        this._saved.slots = [0, 1, 2, 3].map((i) => (slots[i] && typeof slots[i] === 'object' ? slots[i] : null));
        // Den letzten Stand nur übernehmen, solange noch nichts gespielt oder
        // verändert wurde — sonst überschriebe ein langsames Laden Eingaben.
        if (data.last && !this.playing && !this.history.length) {
          this.state = sanitizeState(data.last);
          this._afterStateChange();
        }
        this._renderSheet();
      }).catch((err) => console.warn('[groove-lab] Stand nicht geladen', err));
    }

    _persist() {
      if (!this._storage) return;
      Promise.resolve(this._storage.save(this._saved)).catch((err) => console.warn('[groove-lab] Stand nicht gespeichert', err));
    }

    _snapshot() {
      return JSON.parse(JSON.stringify(this.state));
    }

    _pushHistory() {
      this.history.push(JSON.stringify(this.state));
      if (this.history.length > 30) this.history.shift();
      this._renderTransport();
    }

    undo() {
      const prev = this.history.pop();
      if (!prev) return;
      this._applyState(sanitizeState(JSON.parse(prev)), { history: false });
    }

    _applyState(state, { history = true } = {}) {
      if (history) this._pushHistory();
      const droneWasOn = this.state.droneOn;
      this.state = state;
      this.state.droneOn = droneWasOn;
      this._afterStateChange();
    }

    /** Nach jeder größeren Zustandsänderung: Satz neu rechnen, Engine
     *  angleichen, Liegeton umstimmen, alles neu zeichnen. */
    _afterStateChange() {
      this._voicingCache = null;
      this._syncEngine();
      this._retuneDrone();
      this._renderAll();
    }

    _summary(state) {
      const pattern = DRUM_PATTERNS[state.patternIndex];
      const mode = MODES.find((m) => m.id === state.modeId);
      return `${pattern.name} · ${noteNames()[state.keyRoot]} ${t(mode.nameKey)} · ${state.bpm} BPM`;
    }

    /* ---- Reiter ---- */

    _setTab(tab) {
      this.ui.tab = tab;
      this.$all('.tab-btn').forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.tab === tab)));
      this.$all('.tab-panel').forEach((panel) => { panel.hidden = panel.dataset.tabPanel !== tab; });
      this.$('.lab-body').scrollTop = 0;
    }

    /* ---- Abgeleitete Werte ---- */

    _pattern() { return DRUM_PATTERNS[this.state.patternIndex]; }
    _meter() { return this._pattern().meter; }
    _barSteps() { return METERS[this._meter()].steps; }
    _stepSeconds() { return 60 / this.state.bpm / 4; }
    _mode() { return MODES.find((m) => m.id === this.state.modeId) || MODES[0]; }
    _progression() { return PROGRESSIONS.find((p) => p.id === this.state.progId) || PROGRESSIONS[0]; }
    _melody() { return MELODIES[this.state.melodyIndex]; }
    _bassSound() { return BASS_SOUNDS.find((b) => b.id === this.state.bassSoundId) || BASS_SOUNDS[0]; }

    /** Harmonie an einem Schritt: Tonart, Modus, Akkordstufe. */
    _harmonyAt(g) {
      const s = this.state;
      const prog = this._progression();
      const barSteps = this._barSteps();
      const bar = Math.floor(g / barSteps);
      const index = Math.floor(bar / s.chordBars) % prog.degrees.length;
      return {
        keyRoot: s.keyRoot, steps: this._mode().steps, deg: prog.degrees[index], sevenths: !!prog.sevenths,
        index, chordStart: g % (barSteps * s.chordBars) === 0,
      };
    }

    _currentHarmony() { return this.shown?.h || this._harmonyAt(0); }

    /** Vierstimmiger Satz für alle Akkorde der aktuellen Folge — einmal je
     *  Tonart/Modus/Folge gerechnet. Zweiter Durchlauf ab dem letzten
     *  Akkord, damit auch der Übergang Ende → Anfang geführt ist. */
    _voicings() {
      const s = this.state;
      const key = `${s.keyRoot}|${s.modeId}|${s.progId}`;
      if (this._voicingCache?.key === key) return this._voicingCache.list;
      const prog = this._progression();
      const steps = this._mode().steps;
      let prev = { S: 67, A: 62, T: 55, B: 48 };
      let list = [];
      for (let pass = 0; pass < 2; pass++) {
        list = prog.degrees.map((deg) => {
          prev = voiceChord(chordPitchClasses(s.keyRoot, steps, deg, prog.sevenths), prev);
          return prev;
        });
      }
      this._voicingCache = { key, list };
      return list;
    }

    _bassMidi(h, bassDeg) {
      const rootSemis = degreeSemis(h.steps, h.deg);
      return 36 + mod(h.keyRoot + rootSemis, 12) + degreeSemis(h.steps, h.deg + bassDeg) - rootSemis;
    }

    /* ---- Transport ---- */

    async _ensureAudio() {
      await this.engine.start();
      if (this._syncedCtx !== this.engine.ctx) {
        this._syncedCtx = this.engine.ctx;
        this._syncEngine();
      }
    }

    _syncEngine() {
      if (!this.engine.ready) return;
      const s = this.state;
      this.engine.setMaster(s.mix.master);
      for (const bus of BUSES) this.engine.setBusLevel(bus, s.mute[bus] ? 0 : s.mix[bus]);
      for (const layer of SOUND_LAYERS) this.engine.setLayerSound(layer, s.sound);
      this.engine.setLayerSound('chords', CHORD_SOUND);
      this.engine.setLayerSound('drone', DRONE_SOUND);
      this.engine.setFx(s.fx, this._stepSeconds());
    }

    async start() {
      try {
        await this._ensureAudio();
      } catch {
        this._setStatus(t('lab.statusNoAudioDevice'));
        return;
      }
      this.playing = true;
      this._stopArpClock(); // ab jetzt spielt der Arp im Groove-Scheduler
      this.globalStep = 0;
      this.scheduledSteps.length = 0;
      this.nextStepTime = this.engine.ctx.currentTime + .06;
      this._renderTransport();
      this._setStatus(t('lab.statusRunning'));
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
      this.shown = null;
      // Liegeton und gehaltene Tasten laufen unabhängig vom Transport weiter.
      if (this.engine.ready) this.engine.releaseLayers(['melody', 'arp', 'chords']);
      this.$all('.step-cell.is-now').forEach((cell) => cell.classList.remove('is-now'));
      this._renderTransport();
      this._renderNow();
      this._setStatus(t('lab.statusReady'));
      this._ensureArpClock(); // noch gehaltene Tasten: der Arp läuft allein weiter
    }

    randomize() {
      this._pushHistory();
      const s = this.state;
      const locks = s.locks;
      if (!locks.beat) {
        s.patternIndex = Math.floor(Math.random() * DRUM_PATTERNS.length);
        s.beat = beatFromPattern(this._pattern());
        s.beatEdited = false;
        s.bpm = pick([78, 86, 94, 102, 108, 116, 124, 132]);
        s.swing = pick([0, 0, 0, .25, .45]);
      }
      if (!locks.harmony) {
        s.keyRoot = Math.floor(Math.random() * 12);
        s.modeId = pick(MODES).id;
        s.progId = pick(PROGRESSIONS.filter((p) => p.id !== 'drone')).id;
      }
      if (!locks.melody) {
        const candidates = MELODIES.map((m, i) => [m, i]).filter(([m]) => m.meter === this._meter());
        s.melodyIndex = pick(candidates)[1];
      }
      this._ensureMelodyMeter();
      if (!locks.sound) {
        const byCat = (cat) => SYNTH_PRESETS.map((p, i) => [p, i]).filter(([p]) => p.cat === cat).map(([, i]) => i);
        s.sound = soundFromPreset(pick([...byCat('lead'), ...byCat('keys'), ...byCat('pad')]));
      }
      this._afterStateChange();
    }

    /** Melodie und Loop müssen dieselbe Taktart haben — sonst wählt der
     *  Wechsel des Loops still die erste passende Melodie. */
    _ensureMelodyMeter() {
      const s = this.state;
      if (MELODIES[s.melodyIndex].meter === this._meter()) return;
      s.melodyIndex = Math.max(0, MELODIES.findIndex((m) => m.meter === this._meter()));
    }

    _tapTempo() {
      const now = performance.now();
      this.tapTimes = this.tapTimes.filter((time) => now - time < 2500);
      this.tapTimes.push(now);
      if (this.tapTimes.length < 2) return;
      const recent = this.tapTimes.slice(-5);
      const avg = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
      this.state.bpm = clamp(Math.round(60000 / avg), 40, 180);
      this._onTempoChange();
    }

    _onTempoChange() {
      this.engine.setFx(this.state.fx, this._stepSeconds());
      this._renderTransport();
    }

    /* ---- Lookahead-Scheduler ---- */

    _scheduleAhead() {
      if (!this.playing) return;
      const ctx = this.engine.ctx;
      while (this.nextStepTime < ctx.currentTime + .1) {
        const g = this.globalStep;
        const h = this._harmonyAt(g);
        this._playStep(g, this.nextStepTime, h);
        this.scheduledSteps.push({ g, time: this.nextStepTime, h });
        this.nextStepTime += this._stepSeconds();
        this.globalStep++;
      }
      this.schedulerTimer = global.setTimeout(() => this._scheduleAhead(), 25);
    }

    _playStep(g, time, h) {
      const s = this.state;
      const stepSec = this._stepSeconds();
      const barSteps = this._barSteps();
      const step = g % barSteps;
      // Swing: jede zweite Sechzehntel bis zu einer halben Sechzehntel später.
      const swung = time + (step % 2 === 1 ? s.swing * .5 * stepSec : 0);

      const beat = s.beat;
      for (const track of DRUM_TRACKS) {
        const value = beat[track]?.[step];
        if (value === undefined || !s.trackOn[track]) continue;
        this.engine.hitTrack(track, swung, value);
        if (track === 'kick' && s.pump > 0) this.engine.duckAt(swung, s.pump, stepSec * 4);
      }
      if (s.trackOn.bass && beat.bass?.[step] !== undefined) {
        this.engine.playBass(swung, this._bassMidi(h, beat.bass[step]), 1, this._bassSound());
      }

      if (h.chordStart && s.chordsOn) this._playChord(h, swung, stepSec * barSteps * s.chordBars);
      if (s.melodyOn) this._playMelodyStep(g, h, swung, stepSec);

      if (s.arpOn && g % s.arpDivision === 0) this._playArp(g, swung, h);
    }

    /** Ein Arp-Schritt — vom Groove-Scheduler (im Takt, mit Swing) oder,
     *  wenn der Groove steht, von der eigenen Arp-Uhr (_ensureArpClock). */
    _playArp(g, time, h) {
      const s = this.state;
      const pool = this._arpPool(h);
      if (!pool.length) return;
      const stepSec = this._stepSeconds();
      const midi = pool[this._arpIndex(Math.floor(g / s.arpDivision), pool.length)];
      this.engine.playTone(s.sound, midi, time, .15, stepSec * s.arpDivision * .9, { layer: 'arp', stepSeconds: stepSec });
      this._flashKey(midi, time);
    }

    /** Die gerade gedrückten (und per "Halten" gemerkten) Töne, sortiert. */
    _arpHeld() {
      const notes = new Set();
      this.keyVoices.forEach((held) => notes.add(held.midi));
      if (this.ui.latchOn) this.latchedNotes.forEach((midi) => notes.add(midi));
      return [...notes].sort((a, b) => a - b);
    }

    /** Dreiklang der Tonart auf einer Taste (liegt sie außerhalb der Tonart:
     *  Dur-Dreiklang) — so klingt schon ein einzelner gehaltener Ton nach
     *  Arpeggio statt nach Tonwiederholung. */
    _chordOnNote(midi) {
      const steps = this._mode().steps;
      const d = steps.indexOf(mod(midi - this.state.keyRoot, 12));
      if (d === -1) return [midi, midi + 4, midi + 7];
      return [0, 2, 4].map((o) => midi + degreeSemis(steps, d + o) - steps[d]);
    }

    /**
     * Arp-Uhr für den Fall, dass der Groove NICHT läuft: Sobald Tasten
     * gehalten werden, spielt der Arp trotzdem — im eingestellten Tempo, auf
     * der Audio-Uhr vorausgeplant wie der Haupt-Scheduler. Sie endet von
     * selbst, wenn nichts mehr gehalten wird oder der Groove startet (dann
     * übernimmt dessen Scheduler, taktgenau mit Beat und Swing).
     */
    _ensureArpClock() {
      if (this.playing || !this.state.arpOn || this._arpTimer || !this.engine.ready) return;
      if (!this._arpHeld().length) return;
      const ctx = this.engine.ctx;
      let step = 0;
      let next = ctx.currentTime + .03;
      const tick = () => {
        if (this.playing || !this.state.arpOn || !this.engine.ready || !this._arpHeld().length) { this._arpTimer = 0; return; }
        while (next < ctx.currentTime + .1) {
          if (step % this.state.arpDivision === 0) this._playArp(step, next, null);
          next += this._stepSeconds();
          step++;
        }
        this._arpTimer = global.setTimeout(tick, 25);
      };
      tick();
    }

    _stopArpClock() {
      global.clearTimeout(this._arpTimer);
      this._arpTimer = 0;
    }

    /** Taste kurz aufleuchten lassen, wenn der Arp sie spielt (zur geplanten Zeit). */
    _flashKey(midi, time) {
      const el = this._keyElFor(midi);
      if (!el || !this.engine.ready) return;
      const delay = Math.max(0, (time - this.engine.ctx.currentTime) * 1000);
      global.setTimeout(() => {
        el.classList.add('is-arp');
        global.setTimeout(() => el.classList.remove('is-arp'), 110);
      }, delay);
    }

    _playChord(h, time, duration) {
      const voicing = this._voicings()[h.index];
      if (!voicing) return;
      const s = this.state;
      const anyFocus = SATB.some((v) => s.satb[v] === 'focus');
      for (const voice of SATB) {
        const mode = s.satb[voice];
        if (mode === 'mute') continue;
        const velocity = mode === 'focus' ? .22 : anyFocus ? .05 : .11;
        this.engine.playTone(CHORD_SOUND, voicing[voice], time, velocity, duration * .97,
          { layer: 'chords', glide: 0, stepSeconds: this._stepSeconds() });
      }
    }

    _playMelodyStep(g, h, time, stepSec) {
      const s = this.state;
      const melody = this._melody();
      const barSteps = this._barSteps();
      const notes = melody.bars[Math.floor(g / barSteps) % melody.bars.length];
      const step = g % barSteps;
      const shift = foldDegree(h.deg);
      const base = 12 * (s.melodyOctave + 1) + foldRoot(h.keyRoot);
      for (const [at, deg, len] of notes) {
        if (at !== step) continue;
        const midi = base + degreeSemis(h.steps, deg + shift);
        this.engine.playTone(s.sound, midi, time, .2, len * stepSec, { layer: 'melody', stepSeconds: stepSec });
      }
    }

    /**
     * Notenvorrat des Arps:
     * - Tasten gedrückt (oder per "Halten" gemerkt): genau diese Töne; eine
     *   einzelne Taste spielt auf Wunsch den Dreiklang darauf (arpKeyMode).
     * - keine Taste: während der Groove läuft der aktuelle Akkord der
     *   Akkordfolge (arpIdle = 'progression'), sonst Pause.
     * Danach über die eingestellte Oktavzahl gestreut.
     */
    _arpPool(h) {
      const s = this.state;
      const held = this._arpHeld();
      let base = [];
      if (held.length) {
        base = s.arpKeyMode === 'chord' && held.length === 1 ? this._chordOnNote(held[0]) : held;
      } else if (s.arpIdle === 'progression' && h && this.playing) {
        const root = 12 * (s.octave + 1) + foldRoot(h.keyRoot);
        const deg = foldDegree(h.deg);
        base = (h.sevenths ? [0, 2, 4, 6] : [0, 2, 4]).map((o) => root + degreeSemis(h.steps, deg + o));
      }
      if (!base.length) return [];
      const pool = [];
      for (let oct = 0; oct < s.arpOctaves; oct++) for (const midi of base) pool.push(midi + oct * 12);
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

    /* ---- Anzeige im Takt ---- */

    _drawSteps() {
      if (!this.playing) return;
      const now = this.engine.ctx.currentTime;
      let latest;
      while (this.scheduledSteps.length && this.scheduledSteps[0].time <= now + .01) latest = this.scheduledSteps.shift();
      if (latest) {
        const chordChanged = latest.h.index !== this.shown?.h?.index;
        this.shown = latest;
        this._showStep(latest, chordChanged);
      }
      this.visualFrame = global.requestAnimationFrame(() => this._drawSteps());
    }

    _showStep({ g }, chordChanged) {
      const step = g % this._barSteps();
      this.$all('.track-list .step-cell').forEach((cell) => cell.classList.toggle('is-now', Number(cell.dataset.step) === step));
      this._renderBeatDots(step);
      if (chordChanged) this._renderNow();
    }

    _setStatus(text) { this.$all('.status-line').forEach((el) => { el.textContent = text; }); }

    /* ---- Halten-Roll: eine je Loop eigene, artikulierte Rhythmuszelle nur
       solange der Pad-Knopf gedrückt ist (siehe DRUM_PATTERNS.roll). ---- */

    async _startRoll(track) {
      if (this.rollTimers[track]) return;
      try { await this._ensureAudio(); } catch { this._setStatus(t('lab.statusNoAudioHere')); return; }
      const pattern = this._pattern();
      const cell = pattern.roll?.length ? pattern.roll : [[1, 1]];
      const bassSteps = Object.values(this.state.beat.bass);
      const notes = bassSteps.length ? bassSteps : [0];
      let cellIndex = 0;
      let bassIndex = 0;
      const tick = () => {
        const [duration, velocity] = cell[cellIndex % cell.length];
        const now = this.engine.ctx.currentTime;
        if (track === 'bass') {
          this.engine.playBass(now, this._bassMidi(this._currentHarmony(), notes[bassIndex % notes.length]), velocity, this._bassSound());
          bassIndex++;
        } else {
          this.engine.hitTrack(track, now, velocity);
        }
        cellIndex++;
        this.rollTimers[track] = global.setTimeout(tick, Math.max(30, duration * this._stepSeconds() * 1000));
      };
      tick();
    }

    _stopRoll(track) {
      global.clearTimeout(this.rollTimers[track]);
      delete this.rollTimers[track];
    }

    /* ---- Liegeton ---- */

    _droneMidis(pc) {
      const root = 48 + foldRoot(mod(pc, 12));
      return this.state.droneFifth ? [root - 12, root, root + 7] : [root - 12, root];
    }

    async _setDrone(on) {
      this.state.droneOn = on;
      if (on) {
        try { await this._ensureAudio(); } catch { this._setStatus(t('lab.statusNoAudioHere')); this.state.droneOn = false; this._renderHarmony(); return; }
        this._startDrone();
      } else {
        this._stopDrone();
      }
      this._renderHarmony();
    }

    _startDrone() {
      this._stopDrone();
      if (!this.engine.ready) return;
      const now = this.engine.ctx.currentTime;
      this.droneVoices = this._droneMidis(this.state.keyRoot).map((midi, i) =>
        this.engine.playTone(DRONE_SOUND, midi, now, i === 0 ? .12 : .16, undefined, { layer: 'drone', glide: 0 }));
    }

    _stopDrone() {
      this.droneVoices.forEach((voice) => this.engine.releaseVoice(voice));
      this.droneVoices = [];
    }

    _retuneDrone(pc = this.state.keyRoot, time) {
      if (!this.state.droneOn || !this.droneVoices.length || !this.engine.ready) return;
      const at = time ?? this.engine.ctx.currentTime;
      this._droneMidis(pc).forEach((midi, i) => this.engine.retune(this.droneVoices[i], midi, at));
    }

    /* ======================================================================
       RENDERING
       ====================================================================== */

    _renderAll() {
      this._renderBeat();
      this._renderHarmony();
      this._renderMelody();
      this._renderSound();
      this._renderMixer();
      this._renderKeys();
      this._renderTransport();
      this._renderNow();
    }

    /** Chip-Reihe: gleiche Optik und Bedienung für alle Einfach-Auswahlen. */
    _chips(host, items, active, action) {
      // Eine vorangestellte Beschriftung ("Filter:") bleibt stehen.
      const label = host.querySelector(':scope > .chip-label');
      host.replaceChildren(...(label ? [label] : []), ...items.map(({ value, label: text, title }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.dataset.action = action;
        btn.dataset.value = String(value);
        btn.textContent = text;
        if (title) btn.title = title;
        btn.setAttribute('aria-pressed', String(String(value) === String(active)));
        return btn;
      }));
    }

    /** Auswahlkarte. `iconHtml` ist entweder ein Piktogramm (Loops, Presets:
     *  Icon neben dem Namen) oder eine Mini-Notenrolle (Melodien: darüber). */
    _card(action, index, active, iconHtml, name, { icon = false } = {}) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `card${icon ? ' is-icon' : ''}`;
      btn.dataset.action = action;
      btn.dataset.value = String(index);
      btn.setAttribute('aria-pressed', String(active));
      btn.innerHTML = `${iconHtml}<span class="card-name"></span>`;
      btn.querySelector('.card-name').textContent = name;
      return btn;
    }

    _options(select, entries, value) {
      select.replaceChildren(...entries.map(([v, label]) => {
        const opt = document.createElement('option');
        opt.value = String(v);
        opt.textContent = label;
        return opt;
      }));
      select.value = String(value);
    }

    _setSwitch(key, on) {
      const input = this.$(`[data-switch="${key}"]`);
      if (input) input.checked = !!on;
    }

    _renderLock(which) {
      const btn = this.$(`[data-action="lock"][data-lock="${which}"]`);
      if (!btn) return;
      const locked = this.state.locks[which];
      btn.setAttribute('aria-pressed', String(locked));
      btn.innerHTML = locked ? UI_ICON.lock : UI_ICON.unlock;
    }

    /* ---- Beat ---- */

    _renderBeat() {
      const s = this.state;
      const meter = this._meter();
      this._chips(this.$('.meter-chips'), METER_IDS.map((id) => ({ value: id, label: id })), meter, 'meter');
      this._chips(this.$('.beat-cats'), BEAT_CATS.map((c) => ({ value: c, label: t(CAT_KEY[c]) })), this.ui.beatCat, 'beat-cat');
      const cards = DRUM_PATTERNS.map((p, i) => [p, i])
        .filter(([p]) => p.meter === meter && (this.ui.beatCat === 'all' || p.cat === this.ui.beatCat))
        .map(([p, i]) => this._card('pick-pattern', i, i === s.patternIndex, pictogramIcon(p.icon), p.name, { icon: true }));
      this.$('.pattern-grid').replaceChildren(...cards);
      this.$('.pattern-name').textContent = this._pattern().name + (s.beatEdited ? ` · ${t('lab.edited')}` : '');
      this.$('.reset-beat').hidden = !s.beatEdited;
      this._renderLock('beat');
      this._renderTracks();

      this.$('[data-field="swing"]').value = String(s.swing);
      this.$('[data-out="swing"]').textContent = `${Math.round(s.swing * 100)} %`;
      this.$('[data-field="pump"]').value = String(s.pump);
      this.$('[data-out="pump"]').textContent = `${Math.round(s.pump * 100)} %`;
      this._chips(this.$('.bass-chips'), BASS_SOUNDS.map((b) => ({ value: b.id, label: b.name })), s.bassSoundId, 'bass-sound');
    }

    _renderTracks() {
      const s = this.state;
      const meter = METERS[this._meter()];
      const host = this.$('.track-list');
      host.replaceChildren(...TRACK_IDS.map((track) => {
        const on = s.trackOn[track];
        const row = document.createElement('div');
        row.className = `track-row${on ? '' : ' is-off'}`;

        const roll = document.createElement('button');
        roll.type = 'button';
        roll.className = 'track-roll';
        roll.setAttribute('aria-label', tf('lab.rollAria', { track: trackLabel(track) }));
        roll.title = t('lab.rollTitle');
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
        label.textContent = trackLabel(track);

        const cells = document.createElement('div');
        cells.className = 'step-row';
        cells.style.gridTemplateColumns = `repeat(${meter.steps}, 1fr)`;
        for (let i = 0; i < meter.steps; i++) {
          const value = s.beat[track][i];
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.tabIndex = -1;
          cell.className = 'step-cell';
          cell.dataset.action = 'cell';
          cell.dataset.track = track;
          cell.dataset.step = String(i);
          // Zählzeit-Gruppen abwechselnd leicht getönt — ein zusätzlicher
          // Rand an der Gruppengrenze machte einzelne Zellen schmaler.
          if (Math.floor(i / meter.group) % 2 === 1) cell.classList.add('is-alt');
          if (value !== undefined) {
            cell.classList.add('is-hit');
            if (track === 'snare' && value < 1) cell.classList.add('is-soft');
            // Stufe als Intervallzahl: 1 = Grundton, 5 = Quinte, 8 = Oktave,
            // 7 = Ton unter dem Grundton.
            if (track === 'bass') cell.dataset.label = String(value < 0 ? value + 8 : value + 1);
          }
          cell.setAttribute('aria-label', `${trackLabel(track)} ${i + 1}`);
          cells.append(cell);
        }

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'track-toggle';
        toggle.dataset.action = 'track-toggle';
        toggle.dataset.value = track;
        toggle.setAttribute('aria-pressed', String(on));
        toggle.setAttribute('aria-label', trackLabel(track));
        toggle.textContent = t(on ? 'lab.trackOn' : 'lab.trackOff');

        row.append(roll, label, cells, toggle);
        return row;
      }));
    }

    _toggleCell(track, step) {
      const s = this.state;
      const cycle = CELL_CYCLE[track];
      const current = s.beat[track][step];
      const index = current === undefined ? -1 : cycle.indexOf(current);
      if (current !== undefined && (index === -1 || index === cycle.length - 1)) delete s.beat[track][step];
      else s.beat[track][step] = cycle[index + 1];
      s.beatEdited = true;
      this._renderBeat();
      // Vorhören, damit man beim Bauen nicht erst Play drücken muss.
      if (!this.playing && s.beat[track][step] !== undefined) this._preview(track, s.beat[track][step]);
    }

    async _preview(track, value) {
      try { await this._ensureAudio(); } catch { return; }
      const now = this.engine.ctx.currentTime;
      if (track === 'bass') this.engine.playBass(now, this._bassMidi(this._currentHarmony(), value), 1, this._bassSound());
      else this.engine.hitTrack(track, now, value);
    }

    /* ---- Harmonie ---- */

    _renderHarmony() {
      const s = this.state;
      const mode = this._mode();
      const names = noteNames();
      this._options(this.$('[data-field="keyRoot"]'), names.map((name, i) => [i, name]), s.keyRoot);
      this._options(this.$('[data-field="modeId"]'), MODES.map((m) => [m.id, t(m.nameKey)]), s.modeId);
      this._chips(this.$('.prog-chips'), PROGRESSIONS.map((p) => ({
        value: p.id,
        label: p.nameKey ? t(p.nameKey) : p.degrees.map((d) => romanNumeral(mode.steps, d, p.sevenths)).join('–'),
      })), s.progId, 'prog');
      this.$('.key-name').textContent = `${names[s.keyRoot]} ${t(mode.nameKey)}`;
      this.$('[data-field="chordBars"]').value = String(s.chordBars);
      this._renderLock('harmony');

      this._setSwitch('chordsOn', s.chordsOn);
      this._setSwitch('droneOn', s.droneOn);
      this._setSwitch('droneFifth', s.droneFifth);
      this._renderChordStrip();
      this._renderSatb();
    }

    _renderChordStrip() {
      const s = this.state;
      const prog = this._progression();
      const mode = this._mode();
      const current = this.playing && this.shown?.h && !this.shown.h.round ? this.shown.h.index : -1;
      const host = this.$('.chord-strip');
      host.replaceChildren(...prog.degrees.map((deg, i) => {
        const box = document.createElement('div');
        box.className = `chord-box${i === current ? ' is-now' : ''}`;
        const roman = document.createElement('span');
        roman.className = 'chord-roman';
        roman.textContent = romanNumeral(mode.steps, deg, prog.sevenths);
        const name = document.createElement('strong');
        name.textContent = chordName(s.keyRoot, mode.steps, deg, prog.sevenths);
        box.append(roman, name);
        return box;
      }));
    }

    _renderSatb() {
      const s = this.state;
      const index = this.playing && this.shown?.h && !this.shown.h.round ? this.shown.h.index : 0;
      const voicing = this._voicings()[index] || this._voicings()[0];
      const host = this.$('.satb-list');
      host.replaceChildren(...SATB.map((voice) => {
        const row = document.createElement('div');
        row.className = `satb-row is-${s.satb[voice]}`;
        row.style.setProperty('--voice', SATB_COLOR[voice]);
        const dot = document.createElement('i');
        dot.className = 'voice-dot';
        const name = document.createElement('span');
        name.className = 'satb-name';
        name.textContent = t(SATB_KEY[voice]);
        const note = document.createElement('strong');
        note.className = 'satb-note';
        note.textContent = noteLabel(voicing[voice]);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.dataset.action = 'satb';
        btn.dataset.value = voice;
        btn.setAttribute('aria-pressed', String(s.satb[voice] !== 'on'));
        btn.textContent = t({ on: 'lab.satbOn', focus: 'lab.satbFocus', mute: 'lab.satbMute' }[s.satb[voice]]);
        btn.setAttribute('aria-label', `${t(SATB_KEY[voice])}: ${btn.textContent}`);
        row.append(dot, name, note, btn);
        return row;
      }));
    }

    /* ---- Melodie ---- */

    _renderMelody() {
      const s = this.state;
      const meter = this._meter();
      this._setSwitch('melodyOn', s.melodyOn);
      this._chips(this.$('.melody-cats'), MELODY_CATS.map((c) => ({ value: c, label: t(CAT_KEY[c]) })), this.ui.melodyCat, 'melody-cat');
      const cards = MELODIES.map((m, i) => [m, i])
        .filter(([m]) => m.meter === meter && (this.ui.melodyCat === 'all' || m.cat === this.ui.melodyCat))
        .map(([m, i]) => this._card('pick-melody', i, i === s.melodyIndex, melodyPreview(m), m.name));
      this.$('.melody-grid').replaceChildren(...cards);
      this.$('.melody-name').textContent = this._melody().name;
      this._chips(this.$('.melody-octaves'), [3, 4, 5].map((o) => ({ value: o, label: String(o) })), s.melodyOctave, 'melody-octave');
      this._renderLock('melody');
    }

    /* ---- Klang ---- */

    _renderSound() {
      const sound = this.state.sound;
      this._chips(this.$('.preset-cats'), PRESET_CATS.map((c) => ({ value: c, label: t(CAT_KEY[c]) })), this.ui.presetCat, 'preset-cat');
      const cards = SYNTH_PRESETS.map((p, i) => [p, i])
        .filter(([p]) => this.ui.presetCat === 'all' || p.cat === this.ui.presetCat)
        .map(([p, i]) => this._card('pick-preset', i, !sound.custom && sound.presetIndex === i, pictogramIcon(p.icon), p.name, { icon: true }));
      this.$('.preset-grid').replaceChildren(...cards);
      this._renderLock('sound');
      this._renderSoundName();
      this._renderMacros();
      this._renderSynthControls();
      this._renderFx();
    }

    _renderSoundName() {
      const sound = this.state.sound;
      this.$('.preset-name').textContent = sound.custom ? t('lab.customSound') : SYNTH_PRESETS[sound.presetIndex].name;
      this.$('[data-action="reset-sound"]').hidden = !sound.custom;
    }

    /** Mixer als Kanalzüge: je Kanal ein breiter Pegelbalken (ein
     *  gestyltes <input type=range> — Tastatur und Screenreader bleiben
     *  erhalten) mit Name und Prozentwert im Balken, davor ein
     *  Lautsprecher-Knopf zum Stummschalten. "Gesamt" steht abgesetzt. */
    _renderMixer() {
      const s = this.state;
      const host = this.$('.mixer-list');
      const row = (bus, label, value, muted) => {
        const wrap = document.createElement('div');
        wrap.className = `mixer-row${muted ? ' is-muted' : ''}${bus === 'master' ? ' is-master' : ''}`;
        if (bus !== 'master') {
          const mute = document.createElement('button');
          mute.type = 'button';
          mute.className = 'mute-btn';
          mute.dataset.action = 'mute';
          mute.dataset.value = bus;
          mute.innerHTML = muted ? UI_ICON.speakerOff : UI_ICON.speaker;
          mute.setAttribute('aria-pressed', String(muted));
          mute.setAttribute('aria-label', tf('lab.muteAria', { bus: label }));
          wrap.append(mute);
        }
        const bar = document.createElement('label');
        bar.className = 'level-wrap';
        const input = document.createElement('input');
        input.type = 'range'; input.min = '0'; input.max = '1'; input.step = '.01';
        input.className = 'level';
        input.value = String(value);
        input.dataset.mix = bus;
        input.setAttribute('aria-label', label);
        const name = document.createElement('span');
        name.className = 'level-label';
        name.textContent = label;
        const out = document.createElement('span');
        out.className = 'level-value';
        bar.append(input, name, out);
        wrap.append(bar);
        this._paintLevel(input);
        return wrap;
      };
      host.replaceChildren(
        ...BUSES.map((bus) => row(bus, t(BUS_KEY[bus]), s.mix[bus], s.mute[bus])),
        row('master', t('lab.master'), s.mix.master, false),
      );
    }

    /** Füllung und Prozentangabe eines Pegelbalkens nachziehen. */
    _paintLevel(input) {
      const pct = Math.round(Number(input.value) * 100);
      input.style.setProperty('--val', `${pct}%`);
      const out = input.parentElement?.querySelector('.level-value');
      if (out) out.textContent = `${pct} %`;
    }

    /** Vier Makro-Regler für die schnelle Ansicht — jeder bewegt einen oder
     *  mehrere echte Parameter, die Expertenansicht zeigt sie sofort mit. */
    _renderMacros() {
      const sound = this.state.sound;
      const host = this.$('.macro-knobs');
      host.replaceChildren();
      const macros = [
        { label: t('lab.macroBright'), value: Math.log(clamp(sound.cutoff, 200, 10000) / 200) / Math.log(50),
          apply: (v) => { sound.cutoff = 200 * Math.pow(50, v); } },
        { label: t('lab.macroWidth'), value: Math.max(sound.detune / 20, sound.width),
          apply: (v) => { sound.detune = v * 20; sound.width = v; } },
        { label: t('lab.macroSpace'), value: sound.reverbWet / .7,
          apply: (v) => { sound.reverbWet = v * .7; sound.echoWet = v * .35; } },
        { label: t('lab.macroSoft'), value: Math.log(clamp(sound.attack, .004, .6) / .004) / Math.log(150),
          apply: (v) => { sound.attack = .004 * Math.pow(150, v); sound.release = clamp(.15 + v * 1.6, .03, 3); } },
      ];
      for (const macro of macros) {
        const knob = new Knob({
          label: macro.label, min: 0, max: 1, value: clamp(macro.value, 0, 1),
          format: (v) => `${Math.round(v * 100)}`,
          onInput: (v) => { macro.apply(v); this._onSoundEdit({ refreshKnobs: true }); },
        });
        host.append(knob.el);
      }
    }

    _onSoundEdit({ refreshKnobs = false } = {}) {
      const sound = this.state.sound;
      if (!sound.custom) {
        sound.custom = true;
        this.$all('.preset-grid .card').forEach((card) => card.setAttribute('aria-pressed', 'false'));
      }
      this._renderSoundName();
      this._applySound();
      if (refreshKnobs) this._refreshSoundControls();
    }

    /** Der eine Synth-Klang gilt für Melodie, Arp und Tasten. */
    _applySound() {
      for (const layer of SOUND_LAYERS) this.engine.setLayerSound(layer, this.state.sound);
    }

    _refreshSoundControls() {
      const sound = this.state.sound;
      for (const [key, knob] of Object.entries(this._soundKnobs)) knob.setValue(sound[key]);
      this.$all('[data-sound]').forEach((input) => { input.value = String(sound[input.dataset.sound]); });
      this._renderEnvelope(sound);
    }

    _renderSynthControls() {
      const sound = this.state.sound;
      this._soundKnobs = {};

      const waveHost = this.$('.wave-row');
      waveHost.replaceChildren(...WAVE_SHAPES.map((wave) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wave-btn';
        btn.dataset.action = 'wave';
        btn.dataset.value = wave;
        btn.title = t(WAVE_KEY[wave]);
        btn.setAttribute('aria-label', t(WAVE_KEY[wave]));
        btn.setAttribute('aria-pressed', String(wave === sound.wave));
        btn.innerHTML = waveIcon(wave);
        return btn;
      }));

      const adsrHost = this.$('.adsr-sliders');
      adsrHost.replaceChildren(...[
        ['attack', t('lab.envAttack'), .003, 1.5, .001],
        ['decay', t('lab.envDecay'), .02, 2, .01],
        ['sustain', t('lab.envSustain'), 0, 1, .01],
        ['release', t('lab.envRelease'), .03, 3, .01],
      ].map(([key, label, min, max, step]) => {
        const wrap = document.createElement('label');
        wrap.className = 'slider-field';
        wrap.append(label);
        const input = document.createElement('input');
        input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step);
        input.value = String(sound[key]);
        input.dataset.sound = key;
        input.setAttribute('aria-label', label);
        wrap.append(input);
        return wrap;
      }));
      this._renderEnvelope(sound);

      this._chips(this.$('.filter-type-chips'), FILTER_TYPES.map((f) => ({ value: f.id, label: t(f.nameKey) })), sound.filterType, 'filter-type');

      const knob = (host, key, label, min, max, format, extra = {}) => {
        const k = new Knob({
          label, min, max, value: sound[key] || 0, format, ...extra,
          onInput: (v) => { sound[key] = v; this._onSoundEdit(); if (key === 'attack' || key === 'release') this._renderEnvelope(sound); },
        });
        this._soundKnobs[key] = k;
        host.append(k.el);
      };
      const hz = (v) => `${Math.round(v)} Hz`;
      const cents = (v) => `${Math.round(v)}¢`;
      const pct = (v) => `${Math.round(v * 100)}%`;

      const filterHost = this.$('.filter-knobs'); filterHost.replaceChildren();
      knob(filterHost, 'cutoff', t('lab.knobCutoff'), 100, 12000, hz, { log: true });
      knob(filterHost, 'resonance', t('lab.knobResonance'), 0, 20, (v) => v.toFixed(1));
      knob(filterHost, 'filterEnvAmount', t('lab.knobEnvFilter'), 0, 5000, hz);
      knob(filterHost, 'drive', t('lab.knobDrive'), 0, 1, pct);

      const lfoHost = this.$('.lfo-knobs'); lfoHost.replaceChildren();
      knob(lfoHost, 'lfoRate', t('lab.knobRate'), 0, 12, (v) => `${v.toFixed(1)} Hz`);
      knob(lfoHost, 'lfoDepth', t('lab.knobDepth'), 0, 2400, cents);
      const lfoSelect = this.$('[data-field="lfoSync"]');
      lfoSelect.replaceChildren(...LFO_SYNCS.map(([value, label]) => {
        const opt = document.createElement('option');
        opt.value = String(value);
        opt.textContent = label.startsWith('lab.') ? t(label) : label;
        return opt;
      }));
      lfoSelect.value = String(sound.lfoSync || 0);

      const charHost = this.$('.character-knobs'); charHost.replaceChildren();
      knob(charHost, 'detune', t('lab.knobDetune'), 0, 30, cents);
      knob(charHost, 'width', t('lab.knobWidth'), 0, 1, pct);
      knob(charHost, 'subLevel', t('lab.knobSubLevel'), 0, 1, pct);
      knob(charHost, 'pitchDrop', t('lab.knobPitchDrop'), 0, 400, cents);

      const vibHost = this.$('.vibrato-knobs'); vibHost.replaceChildren();
      knob(vibHost, 'vibratoRate', t('lab.knobRate'), 0, 10, (v) => `${v.toFixed(1)} Hz`);
      knob(vibHost, 'vibratoDepth', t('lab.knobDepth'), 0, 30, cents);
      knob(vibHost, 'vibratoDelay', t('lab.knobOnset'), 0, 1.5, (v) => `${v.toFixed(2)} s`);

      const glideHost = this.$('.glide-knobs'); glideHost.replaceChildren();
      knob(glideHost, 'glide', t('lab.knobGlide'), 0, 1, (v) => `${Math.round(v * 1000)} ms`);
      this._setSwitch('mono', sound.mono);

      // Hall- und Echo-Anteil gehören zum Klang, stehen aber bei den
      // Effekten (siehe _renderFx) — ein Ort für alles, was Raum macht.
      this._soundKnob = knob;
    }

    /** Zeichnet die ADSR-Hüllkurve als kleine Linie — Phasenbreiten sind
     *  proportional zu den Werten, nicht linear in Sekunden (sonst wäre ein
     *  kurzer Attack kaum sichtbar). */
    _renderEnvelope(sound) {
      const scale = (value, max) => 6 + Math.min(value, max) / max * 22;
      const raw = [scale(sound.attack, 1.5), scale(sound.decay, 2), 16, scale(sound.release, 3)];
      const sum = raw.reduce((a, b) => a + b, 0);
      const [aw, dw, hold, rw] = raw.map((v) => v / sum * 84);
      const top = 4, bottom = 34;
      const sustainY = bottom - sound.sustain * (bottom - top);
      const x0 = 4;
      const points = [[x0, bottom], [x0 + aw, top], [x0 + aw + dw, sustainY], [x0 + aw + dw + hold, sustainY], [x0 + aw + dw + hold + rw, bottom]];
      this.$('.envelope-path').setAttribute('d', 'M' + points.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' L'));
    }

    /** Effekte an EINER Stelle: je Effekt der Anteil des Synths (gehört zum
     *  Klang, wird mit dem Preset gespeichert) und die Einstellungen des
     *  Effekts selbst (global). Früher standen die Anteile getrennt davon
     *  unter "Mehr Einstellungen" — doppelt und verwirrend. */
    _renderFx() {
      const fx = this.state.fx;
      const pct = (v) => `${Math.round(v * 100)}%`;
      const fxKnob = (host, key, label, min, max, format, log) => {
        const k = new Knob({
          label, min, max, value: fx[key], format, log,
          onInput: (v) => { fx[key] = v; this.engine.setFx(fx, this._stepSeconds()); },
        });
        host.append(k.el);
      };
      const reverb = this.$('.fx-reverb'); reverb.replaceChildren();
      this._soundKnob(reverb, 'reverbWet', t('lab.knobAmount'), 0, 1, pct);
      fxKnob(reverb, 'reverbLength', t('lab.knobLength'), .2, 4, (v) => `${v.toFixed(1)} s`, true);
      const echo = this.$('.fx-echo'); echo.replaceChildren();
      this._soundKnob(echo, 'echoWet', t('lab.knobAmount'), 0, 1, pct);
      fxKnob(echo, 'echoFeedback', t('lab.knobFeedback'), 0, .85, pct);
      const chorus = this.$('.fx-chorus'); chorus.replaceChildren();
      fxKnob(chorus, 'chorus', t('lab.knobAmount'), 0, 1, pct);
      const select = this.$('[data-field="echoDiv"]');
      select.replaceChildren(...ECHO_DIVISIONS.map(([value, label]) => {
        const opt = document.createElement('option');
        opt.value = String(value); opt.textContent = label;
        return opt;
      }));
      select.value = String(fx.echoDiv);
    }

    /* ---- Keys ---- */

    _renderKeys() {
      const s = this.state;
      this._setSwitch('arpOn', s.arpOn);
      this._setSwitch('latchOn', this.ui.latchOn);
      // "Halten" gibt es nur zusammen mit dem Arp — ohne ihn gäbe es nichts,
      // was die gemerkten Töne spielen würde.
      const latch = this.$('[data-switch="latchOn"]');
      latch.disabled = !s.arpOn;
      latch.closest('.switch').classList.toggle('is-disabled', !s.arpOn);
      this.$('.arp-options').classList.toggle('is-off', !s.arpOn);
      this._chips(this.$('.arp-keymode'), ARP_KEY_MODES.map(([id, key]) => ({ value: id, label: t(key) })), s.arpKeyMode, 'arp-keymode');
      this._chips(this.$('.arp-idle'), ARP_IDLE_MODES.map(([id, key]) => ({ value: id, label: t(key) })), s.arpIdle, 'arp-idle');
      this._chips(this.$('.keys-layout'), [
        { value: 'piano', label: t('lab.keysPiano') }, { value: 'scale', label: t('lab.keysScale') },
      ], s.keysLayout, 'keys-layout');
      this.$('.keyboard').hidden = s.keysLayout !== 'piano';
      this.$('.scale-pads').hidden = s.keysLayout !== 'scale';
      if (s.keysLayout === 'scale') this._buildPads();
      this._paintHeld();
      this.$('[data-field="arpMode"]').value = s.arpMode;
      this.$('[data-field="arpDivision"]').value = String(s.arpDivision);
      this.$('[data-field="arpOctaves"]').value = String(s.arpOctaves);
      this._chips(this.$('.octave-list'), [2, 3, 4, 5].map((o) => ({ value: o, label: String(o), title: tf('lab.octaveAria', { n: o }) })), s.octave, 'key-octave');
    }

    /* ---- Transport & "Jetzt"-Anzeige ---- */

    _renderTransport() {
      const btn = this.$('.transport-play');
      btn.innerHTML = this.playing ? UI_ICON.pause : UI_ICON.play;
      btn.setAttribute('aria-label', t(this.playing ? 'lab.stopAria' : 'lab.startAria'));
      this.$all('.bpm-input').forEach((el) => { el.value = String(this.state.bpm); });
      this.$all('.bpm-out').forEach((el) => { el.textContent = `${this.state.bpm} BPM`; });
      this.$('[data-action="undo"]').disabled = !this.history.length;
    }

    _renderBeatDots(step) {
      const meter = METERS[this._meter()];
      const host = this.$('.beat-dots');
      if (host.childElementCount !== meter.beats.length) {
        host.replaceChildren(...meter.beats.map(() => document.createElement('i')));
      }
      let current = -1;
      meter.beats.forEach((b, i) => { if (step >= b) current = i; });
      Array.from(host.children).forEach((dot, i) => dot.classList.toggle('is-now', this.playing && i === current));
    }

    /** Akkord-/Tonart-Anzeige in der Transportleiste plus Akkordleiste und
     *  SATB-Noten im Harmonie-Reiter — alles, was sich je Akkord ändert. */
    _renderNow() {
      const label = this.$('.now-chord');
      const h = (this.playing && this.shown?.h) || this._harmonyAt(0);
      label.textContent = chordName(h.keyRoot, h.steps, h.deg, h.sevenths);
      if (!this.playing) this._renderBeatDots(-1);
      this._renderChordStrip();
      this._renderSatb();
    }

    /* ---- Speichern-Blatt ---- */

    _openSheet() {
      this.$('.sheet').hidden = false;
      this._renderSheet();
      this.$('.sheet [data-action="close-sheet"]').focus();
    }

    _closeSheet() { this.$('.sheet').hidden = true; }

    _renderSheet() {
      const host = this.$('.slot-list');
      host.replaceChildren(...this._saved.slots.map((slot, i) => {
        const row = document.createElement('div');
        row.className = 'slot-row';
        const text = document.createElement('div');
        text.className = 'slot-text';
        const title = document.createElement('strong');
        title.textContent = tf('lab.slot', { n: i + 1 });
        const sub = document.createElement('span');
        sub.textContent = slot ? this._summary(sanitizeState(slot.state)) : t('lab.slotEmpty');
        text.append(title, sub);
        const save = document.createElement('button');
        save.type = 'button'; save.className = 'chip';
        save.dataset.action = 'slot-save'; save.dataset.value = String(i);
        save.textContent = t('lab.save');
        const load = document.createElement('button');
        load.type = 'button'; load.className = 'chip';
        load.dataset.action = 'slot-load'; load.dataset.value = String(i);
        load.textContent = t('lab.load');
        load.disabled = !slot;
        row.append(text, save, load);
        return row;
      }));
      this.$('.code-out').value = encodeState(this.state);
      this.$('.storage-hint').textContent = t(this._storage ? 'lab.autoSaveHint' : 'lab.noStorageHint');
    }

    _flash(text) {
      const el = this.$('.sheet-status');
      el.textContent = text;
    }

    /* ---- Mini-Tastatur ----------------------------------------------------
       Zwei Oktaven im Klavier-Layout: weiße Tasten lückenlos nebeneinander,
       schwarze darüber. Das schließt die tote Zone aus, wegen der die alte
       Tastatur alle Tasten gleich hoch hatte — unter einer schwarzen Taste
       liegt immer eine weiße. Das Capture liegt auf dem Tastatur-Container
       (nicht auf der einzelnen Taste) — nur so bleiben Move/Up/Cancel für
       einen Finger zuverlässig adressierbar, auch wenn er über mehrere
       Tasten gleitet oder außerhalb losgelassen wird. */

    _buildKeyboard() {
      const host = this.$('.keyboard');
      const names = noteNames();
      const WHITE = [0, 2, 4, 5, 7, 9, 11];
      const whites = [];
      for (let o = 0; o <= 24; o++) if (WHITE.includes(o % 12)) whites.push(o);
      const w = 100 / whites.length;
      this._keyElements = new Map();
      for (let o = 0; o <= 24; o++) {
        const isWhite = WHITE.includes(o % 12);
        const key = document.createElement('button');
        key.type = 'button';
        key.tabIndex = -1;
        key.className = `key ${isWhite ? 'is-white' : 'is-black'}`;
        key.dataset.offset = String(o);
        key.setAttribute('aria-label', names[o % 12]);
        if (isWhite) {
          key.style.left = `${whites.indexOf(o) * w}%`;
          key.style.width = `${w}%`;
          const label = document.createElement('span');
          label.className = 'key-name';
          label.textContent = names[o % 12];
          key.append(label);
        } else {
          const bw = w * .64;
          key.style.left = `${whites.indexOf(o + 1) * w - bw / 2}%`;
          key.style.width = `${bw}%`;
        }
        host.append(key);
        this._keyElements.set(o, key);
      }
    }

    /** Tonart-Tasten: die Töne der gewählten Tonart über zwei Oktaven,
     *  obere Oktave oben — nichts kann "falsch" klingen. Nur neu gebaut, wenn
     *  sich Tonart, Tongeschlecht oder Oktave ändern (nie mitten im Spielen). */
    _buildPads() {
      const s = this.state;
      const signature = `${s.keyRoot}|${s.modeId}|${s.octave}`;
      if (this._padsSignature === signature) return;
      this._padsSignature = signature;
      const steps = this._mode().steps;
      const names = noteNames();
      const makePad = (d) => {
        const offset = foldRoot(s.keyRoot) + degreeSemis(steps, d);
        const pad = document.createElement('button');
        pad.type = 'button';
        pad.tabIndex = -1;
        pad.className = `pad${d % 7 === 0 ? ' is-root' : ''}`;
        pad.dataset.offset = String(offset);
        pad.dataset.degree = String(d);
        pad.textContent = names[mod(s.keyRoot + steps[d % 7], 12)];
        pad.setAttribute('aria-label', names[mod(s.keyRoot + steps[d % 7], 12)]);
        return pad;
      };
      // Obere Reihe = obere Oktave (Stufe 8–15), untere = Stufe 1–8. Der
      // Oktavton steht bewusst in beiden Reihen — als zwei eigene Tasten.
      const upper = [];
      for (let d = 7; d < SCALE_PAD_COUNT; d++) upper.push(makePad(d));
      const lower = [];
      for (let d = 0; d <= 7; d++) lower.push(makePad(d));
      this.$('.scale-pads').replaceChildren(...upper, ...lower);
    }

    /** Bedienung einer Spielfläche (Klaviatur oder Tonart-Tasten). Das
     *  Capture liegt auf dem Container (nicht auf der einzelnen Taste) — nur
     *  so bleiben Move/Up/Cancel für einen Finger zuverlässig adressierbar,
     *  auch beim Gleiten über mehrere Tasten oder Loslassen außerhalb. */
    _wireKeyboard(host, selector) {
      const keyFromPoint = (x, y) => {
        const el = this.shadowRoot.elementFromPoint ? this.shadowRoot.elementFromPoint(x, y) : document.elementFromPoint(x, y);
        const key = el?.closest?.(selector);
        return key && host.contains(key) ? key : null;
      };

      // Ob ein Finger gerade innerhalb der Fläche unten ist — unabhängig
      // davon, ob er GERADE eine Taste trifft (sonst beendete ein kurzes
      // Rutschen über eine Kante das ganze Glissando).
      const pressedPointers = new Set();
      this._pressedPointerSets = this._pressedPointerSets || [];
      this._pressedPointerSets.push(pressedPointers);

      host.addEventListener('pointerdown', (e) => {
        const key = e.target.closest(selector);
        if (!key) return;
        e.preventDefault();
        try { host.setPointerCapture(e.pointerId); } catch { /* siehe Knob._startDrag */ }
        pressedPointers.add(e.pointerId);
        this._enterKey(e.pointerId, key, this._midiForKey(key));
      });

      host.addEventListener('pointermove', (e) => {
        if (!pressedPointers.has(e.pointerId)) return;
        const key = keyFromPoint(e.clientX, e.clientY);
        if (key) this._enterKey(e.pointerId, key, this._midiForKey(key));
        else this._releaseKey(e.pointerId);
      });

      const end = (e) => {
        pressedPointers.delete(e.pointerId);
        this._releaseKey(e.pointerId);
      };
      host.addEventListener('pointerup', end);
      host.addEventListener('pointercancel', end);
    }

    _midiForKey(key) { return 12 * (this.state.octave + 1) + Number(key.dataset.offset); }

    /** Die sichtbare Taste zu einer MIDI-Note in der gerade gezeigten Fläche. */
    _keyElFor(midi) {
      const offset = midi - 12 * (this.state.octave + 1);
      const host = this.state.keysLayout === 'scale' ? this.$('.scale-pads') : this.$('.keyboard');
      // Bei den Tonart-Tasten gibt es den Oktavton zweimal — die untere Reihe
      // (zuletzt im DOM) ist die "Hauptheimat" für Computer-Tasten und Arp.
      const all = host.querySelectorAll(`[data-offset="${offset}"]`);
      return all[all.length - 1] || null;
    }

    /**
     * Wechselt die für diesen Finger (bzw. diese Computertaste) gedrückte
     * Taste. Der sichtbare Zustand wird SOFORT gesetzt — nur das Auslösen
     * des Tons wartet auf die Engine. Ohne diese Trennung entstand beim
     * schnellen Überstreichen mehrerer Tasten ein Wettlauf, bei dem Tasten
     * an der falschen Stelle "hängen" blieben.
     *
     * Mit Arpeggiator klingt die Taste nicht selbst, sondern speist den Arp.
     * Mit "Halten" merkt er sich die Töne auch nach dem Loslassen; der
     * nächste Anschlag, nachdem alle Tasten losgelassen wurden, ersetzt den
     * gemerkten Satz (wie bei einem Hardware-Arpeggiator).
     */
    _enterKey(id, keyEl, midi) {
      const prev = this.keyVoices.get(id);
      if (prev && prev.midi === midi) return;
      const arp = this.state.arpOn;
      const latch = arp && this.ui.latchOn;
      if (prev) {
        this.keyVoices.delete(id);
        this.engine.releaseVoice(prev.voice);
        if (latch) this.latchedNotes.delete(prev.midi); // Gleiten ersetzt, statt zu sammeln
      } else if (latch && this.keyVoices.size === 0) {
        this.latchedNotes.clear();
      }
      const entry = { keyEl, voice: null, midi };
      this.keyVoices.set(id, entry);
      if (latch) this.latchedNotes.add(midi);
      this._paintHeld();
      (async () => {
        try { await this._ensureAudio(); } catch { this._setStatus(t('lab.statusNoAudioHere')); return; }
        if (this.keyVoices.get(id) !== entry) return;
        if (arp) { this._ensureArpClock(); return; }
        entry.voice = this.engine.playTone(this.state.sound, midi, this.engine.ctx.currentTime, .3, undefined,
          { layer: 'keys', stepSeconds: this._stepSeconds() });
      })();
    }

    _releaseKey(id) {
      const held = this.keyVoices.get(id);
      if (!held) return;
      this.keyVoices.delete(id);
      if (held.voice) this.engine.releaseVoice(held.voice);
      this._paintHeld();
    }

    /** Gedrückte und gemerkte Tasten markieren — in beiden Flächen. */
    _paintHeld() {
      const pressed = new Set();
      this.keyVoices.forEach((held) => pressed.add(held.midi));
      const latched = this.state.arpOn && this.ui.latchOn ? this.latchedNotes : new Set();
      this.$all('.keyboard .key, .scale-pads .pad').forEach((el) => {
        const midi = this._midiForKey(el);
        el.classList.toggle('is-hot', pressed.has(midi) || latched.has(midi));
        el.classList.toggle('is-latched', latched.has(midi) && !pressed.has(midi));
      });
    }

    _releaseAllKeys() {
      this.keyVoices.forEach((held) => this.engine.releaseVoiceFast(held.voice));
      this.keyVoices.clear();
      this.latchedNotes.clear();
      this._pressedPointerSets?.forEach((set) => set.clear());
      this._stopArpClock();
      this._paintHeld();
    }

    /* ---- Verkabelung ---- */

    _wireControls() {
      this.shadowRoot.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target || target.disabled) return;
        this._handleAction(target.dataset.action, target.dataset.value, target);
      });

      this.shadowRoot.addEventListener('input', (event) => {
        const el = event.target;
        const s = this.state;
        if (el.classList.contains('bpm-input')) {
          s.bpm = Number(el.value);
          this._onTempoChange();
        } else if (el.dataset.field === 'swing' || el.dataset.field === 'pump') {
          s[el.dataset.field] = Number(el.value);
          this.$(`[data-out="${el.dataset.field}"]`).textContent = `${Math.round(Number(el.value) * 100)} %`;
        } else if (el.dataset.mix) {
          s.mix[el.dataset.mix] = Number(el.value);
          this._paintLevel(el);
          if (el.dataset.mix === 'master') this.engine.setMaster(s.mix.master);
          else this.engine.setBusLevel(el.dataset.mix, s.mute[el.dataset.mix] ? 0 : s.mix[el.dataset.mix]);
        } else if (el.dataset.sound) {
          const sound = s.sound;
          sound[el.dataset.sound] = Number(el.value);
          this._renderEnvelope(sound);
          this._onSoundEdit();
        }
      });

      this.shadowRoot.addEventListener('change', (event) => {
        const el = event.target;
        const s = this.state;
        const field = el.dataset.field;
        if (field === 'chordBars') { s.chordBars = Number(el.value); this._renderNow(); }
        else if (field === 'arpMode') s.arpMode = el.value;
        else if (field === 'arpDivision') s.arpDivision = Number(el.value);
        else if (field === 'arpOctaves') s.arpOctaves = Number(el.value);
        else if (field === 'echoDiv') { s.fx.echoDiv = Number(el.value); this.engine.setFx(s.fx, this._stepSeconds()); }
        else if (field === 'lfoSync') { s.sound.lfoSync = Number(el.value); this._onSoundEdit(); }
        else if (field === 'keyRoot') { s.keyRoot = Number(el.value); this._onHarmonyChange(); this._retuneDrone(); }
        else if (field === 'modeId') { s.modeId = el.value; this._onHarmonyChange(); }
        else if (el.dataset.switch) this._toggleSwitch(el.dataset.switch, el.checked);
      });
    }

    _onHarmonyChange() {
      this._voicingCache = null;
      this._renderHarmony();
      this._renderNow();
      this._renderKeys(); // Tonart-Tasten folgen der Tonart
    }

    /** Alle An/Aus-Schalter (Checkbox mit role="switch") laufen hier durch. */
    _toggleSwitch(key, on) {
      const s = this.state;
      if (key === 'droneOn') { this._setDrone(on); return; }
      if (key === 'droneFifth') { s.droneFifth = on; if (s.droneOn) this._startDrone(); return; }
      if (key === 'latchOn') { this.ui.latchOn = on; if (!on) this._releaseAllKeys(); this._renderKeys(); return; }
      if (key === 'arpOn') {
        // Beim Umschalten nichts hängen lassen: klingende Tasten bzw. den
        // gemerkten Arp-Satz freigeben; "Halten" gehört zum Arp.
        s.arpOn = on;
        if (!on) this.ui.latchOn = false;
        this._releaseAllKeys();
        this._renderKeys();
        return;
      }
      if (key === 'mono') { s.sound.mono = on; this._onSoundEdit(); return; }
      s[key] = on; // melodyOn, chordsOn
    }

    _handleAction(action, value, target) {
      const s = this.state;
      switch (action) {
        case 'close': this.close(); break;
        case 'toggle-transport': if (this.playing) this.stop(); else this.start(); break;
        case 'randomize': this.randomize(); break;
        case 'undo': this.undo(); break;
        case 'tap-tempo': this._tapTempo(); break;
        case 'tab': this._setTab(target.dataset.tab); break;
        case 'lock': s.locks[target.dataset.lock] = !s.locks[target.dataset.lock]; this._renderLock(target.dataset.lock); break;
        case 'open-sheet': this._openSheet(); break;
        case 'close-sheet': this._closeSheet(); break;

        // Beat
        case 'meter': {
          if (value === this._meter()) break;
          s.patternIndex = DRUM_PATTERNS.findIndex((p) => p.meter === value);
          s.beat = beatFromPattern(this._pattern());
          s.beatEdited = false;
          this.ui.beatCat = 'all';
          this._ensureMelodyMeter();
          if (this.playing) this.globalStep = Math.ceil(this.globalStep / this._barSteps()) * this._barSteps();
          this._afterStateChange();
          break;
        }
        case 'beat-cat': this.ui.beatCat = value; this._renderBeat(); break;
        case 'pick-pattern':
          s.patternIndex = Number(value);
          s.beat = beatFromPattern(this._pattern());
          s.beatEdited = false;
          this._ensureMelodyMeter();
          this._renderBeat(); this._renderMelody();
          break;
        case 'cell': this._toggleCell(target.dataset.track, Number(target.dataset.step)); break;
        case 'track-toggle': s.trackOn[value] = !s.trackOn[value]; this._renderTracks(); break;
        case 'reset-beat':
          this._pushHistory();
          s.beat = beatFromPattern(this._pattern()); s.beatEdited = false; this._renderBeat();
          break;
        case 'bass-sound': s.bassSoundId = value; this._renderBeat(); if (!this.playing) this._preview('bass', 0); break;

        // Harmonie
        case 'prog': s.progId = value; this._onHarmonyChange(); break;
        case 'satb': s.satb[value] = { on: 'focus', focus: 'mute', mute: 'on' }[s.satb[value]]; this._renderSatb(); break;

        // Melodie
        case 'melody-cat': this.ui.melodyCat = value; this._renderMelody(); break;
        case 'pick-melody': s.melodyIndex = Number(value); s.melodyOn = true; this._renderMelody(); break;
        case 'melody-octave': s.melodyOctave = Number(value); this._renderMelody(); break;

        // Mixer & Klang
        case 'mute':
          s.mute[value] = !s.mute[value];
          this.engine.setBusLevel(value, s.mute[value] ? 0 : s.mix[value]);
          this._renderMixer();
          break;
        case 'preset-cat': this.ui.presetCat = value; this._renderSound(); break;
        case 'pick-preset':
          s.sound = soundFromPreset(Number(value));
          this._applySound();
          this._renderSound();
          this._auditionSound();
          break;
        case 'reset-sound':
          s.sound = soundFromPreset(s.sound.presetIndex);
          this._applySound();
          this._renderSound();
          break;
        case 'wave': s.sound.wave = value; this._onSoundEdit(); this._renderSynthControls(); break;
        case 'filter-type': s.sound.filterType = value; this._onSoundEdit(); this._renderSynthControls(); break;

        // Keys
        case 'arp-keymode': s.arpKeyMode = value; this._renderKeys(); break;
        case 'arp-idle': s.arpIdle = value; this._renderKeys(); break;
        case 'keys-layout': this._releaseAllKeys(); s.keysLayout = value; this._renderKeys(); break;
        case 'help': {
          const text = this.$(`[data-help-text="${target.dataset.help}"]`);
          const open = text.hidden;
          text.hidden = !open;
          target.setAttribute('aria-expanded', String(open));
          break;
        }
        case 'key-octave': s.octave = Number(value); this._renderKeys(); break;

        // Speichern
        case 'slot-save':
          this._saved.slots[Number(value)] = { state: this._snapshot(), savedAt: Date.now() };
          this._persist();
          this._renderSheet();
          this._flash(tf('lab.savedTo', { n: Number(value) + 1 }));
          break;
        case 'slot-load': {
          const slot = this._saved.slots[Number(value)];
          if (!slot) break;
          this._applyState(sanitizeState(slot.state));
          this._renderSheet();
          this._flash(tf('lab.loadedFrom', { n: Number(value) + 1 }));
          break;
        }
        case 'copy-code': {
          const field = this.$('.code-out');
          field.value = encodeState(this.state);
          const done = () => this._flash(t('lab.copied'));
          const fallback = () => { field.select(); this._flash(t('lab.copyManual')); };
          if (navigator.clipboard?.writeText) navigator.clipboard.writeText(field.value).then(done, fallback);
          else fallback();
          break;
        }
        case 'import-code':
          try {
            this._applyState(decodeState(this.$('.code-in').value));
            this.$('.code-in').value = '';
            this._renderSheet();
            this._flash(t('lab.imported'));
          } catch {
            this._flash(t('lab.importFailed'));
          }
          break;
        default: break;
      }
    }

    /** Kurzes Vorhören nach einem Preset-Wechsel (nur wenn gerade nichts
     *  läuft — sonst hört man den Klang ja ohnehin im Groove). */
    async _auditionSound() {
      if (this.playing) return;
      try { await this._ensureAudio(); } catch { return; }
      this.engine.playTone(this.state.sound, 60 + foldRoot(this.state.keyRoot), this.engine.ctx.currentTime, .22, .5,
        { layer: 'melody', glide: 0, stepSeconds: this._stepSeconds() });
    }

    _isTyping() {
      const el = this.shadowRoot.activeElement;
      // Nur echte Texteingaben zählen — ein fokussierter Schalter (Checkbox)
      // oder Regler darf die Computer-Klaviatur nicht blockieren.
      return !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
        || (el.tagName === 'INPUT' && !['range', 'checkbox', 'radio'].includes(el.type)));
    }

    _handleKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!this.$('.sheet').hidden) this._closeSheet(); else this.close();
        return;
      }
      if (event.key === 'Tab') { this._trapFocus(event); return; }
      if (this._isTyping() || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === 'Space') {
        // Leertaste auf einem fokussierten Knopf löst den Knopf aus — dort
        // nicht zusätzlich den Transport umschalten.
        const focused = this.shadowRoot.activeElement;
        if (focused && (focused.tagName === 'BUTTON' || focused.tagName === 'SUMMARY' || focused.type === 'checkbox')) return;
        event.preventDefault();
        if (this.playing) this.stop(); else this.start();
        return;
      }
      if (event.repeat) return;
      const base = 12 * (this.state.octave + 1);
      if (this.state.keysLayout === 'scale') {
        const degree = SCALE_KEY_CODES.indexOf(event.code);
        if (degree === -1) return;
        event.preventDefault();
        const midi = base + foldRoot(this.state.keyRoot) + degreeSemis(this._mode().steps, degree);
        this._enterKey(`kbd:${event.code}`, this._keyElFor(midi), midi);
        return;
      }
      const offset = KEY_CODES.indexOf(event.code);
      if (offset !== -1) {
        event.preventDefault();
        this._enterKey(`kbd:${event.code}`, this._keyElements.get(offset), base + offset);
      }
    }

    _handleKeyup(event) {
      if (KEY_CODES.includes(event.code) || SCALE_KEY_CODES.includes(event.code)) this._releaseKey(`kbd:${event.code}`);
    }

    _trapFocus(event) {
      const scope = this.$('.sheet').hidden ? this.shadowRoot : this.$('.sheet');
      const focusable = Array.from(scope.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, summary'))
        .filter((el) => el.offsetParent !== null || el === this.shadowRoot.activeElement)
        .filter((el) => scope !== this.shadowRoot || !el.closest('.sheet'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && this.shadowRoot.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && this.shadowRoot.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    static markup() {
      const lockBtn = (which) => `<button class="lock-btn" type="button" data-action="lock" data-lock="${which}" aria-pressed="false" aria-label="${t('lab.lockAria')}" title="${t('lab.lockAria')}"></button>`;
      // An/Aus-Schalter: echte Checkbox mit role="switch" — Tastatur,
      // Screenreader und Formular-Semantik gibt es dadurch geschenkt.
      const toggle = (key, labelKey) => `<label class="switch"><input type="checkbox" role="switch" data-switch="${key}"><span class="switch-track" aria-hidden="true"></span><span>${t(labelKey)}</span></label>`;
      // Erklärungen stecken hinter einem (?) neben der Überschrift und
      // klappen darunter auf — der Text steht nicht mehr dauerhaft im Weg.
      const help = (key) => `<button class="help-btn" type="button" data-action="help" data-help="${key}" aria-expanded="false" aria-label="${t('lab.helpAria')}">?</button>`;
      const helpText = (key) => `<p class="help-text" data-help-text="${key}" hidden>${t(`lab.${key}`)}</p>`;
      const filterRow = (cls) => `<div class="chip-row ${cls}"><span class="chip-label">${t('lab.filterLabel')}</span></div>`;
      return `
<style>
  :host {
    --accent: #f868b0;
    --accent-rgb: 248,104,176;
    --bg: #fff7ec;
    --surface: #ffffff;
    --surface-2: #fff1e2;
    --line: #f1ddd0;
    --text: #241b3d;
    --muted: #8c81a6;
    --bad: #e0445a;
    position: fixed; inset: 0; z-index: 2147483000;
    background:
      radial-gradient(120% 90% at 12% -10%, rgba(var(--accent-rgb), .14), transparent 55%),
      var(--bg);
    display: flex; flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--text);
  }
  :host([hidden]) { display: none; }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  button, input, select, textarea { font: inherit; color: inherit; }
  button { cursor: pointer; -webkit-tap-highlight-color: transparent; background: none; border: 0; }
  button:disabled { opacity: .35; cursor: default; }
  button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

  .lab-head {
    flex: 0 0 auto; display: flex; align-items: center; gap: 10px;
    padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 10px max(16px, env(safe-area-inset-left));
  }
  .lab-head-title { flex: 1; min-width: 0; }
  .eyebrow { color: var(--accent); font-size: .66rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
  .lab-head h1 { font-size: 1.32rem; margin: .15em 0 0; letter-spacing: -.02em; font-weight: 800; }
  .lab-head h1 span { color: var(--accent); }
  .icon-btn {
    width: 40px; height: 40px; flex: 0 0 auto; display: grid; place-items: center;
    border: 1px solid var(--line); border-radius: 13px; background: var(--surface-2); color: var(--muted);
  }

  .tab-bar {
    flex: 0 0 auto; display: flex; gap: 4px; padding: 0 max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left));
    overflow-x: auto; scrollbar-width: none;
  }
  .tab-bar::-webkit-scrollbar { display: none; }
  .tab-btn {
    flex: 1 0 auto; padding: 9px 8px; border-radius: 999px; border: 1px solid var(--line);
    background: var(--surface-2); color: var(--muted); font-size: .72rem; font-weight: 700; text-align: center;
    transition: background .15s, border-color .15s, color .15s;
  }
  .tab-btn[aria-selected="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }

  .lab-body {
    flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
    padding: 2px max(16px, env(safe-area-inset-right)) 18px max(16px, env(safe-area-inset-left));
  }

  .panel { border: 1px solid var(--line); border-radius: 20px; padding: 14px; margin-bottom: 12px; background: var(--surface-2); }
  .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
  .panel-head h2 { font-size: .72rem; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin: 0; font-weight: 800; }
  /* Überschrift links, ein (?) direkt daneben, alles Weitere rechts. */
  .panel-head > h2 { margin-right: auto; }
  .panel-head > h2:has(+ .help-btn) { margin-right: 0; }
  .panel-head > .help-btn { margin: 0 auto 0 -4px; }
  .help-btn {
    width: 22px; height: 22px; flex: 0 0 auto; border-radius: 50%; border: 1px solid var(--line); background: var(--surface);
    color: var(--muted); font-size: .68rem; font-weight: 800; line-height: 1; display: grid; place-items: center; padding: 0;
  }
  .help-btn[aria-expanded="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
  .help-text {
    margin: 0 0 12px; padding: 10px 12px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line);
    font-size: .72rem; line-height: 1.45; color: var(--text);
  }
  .module-head .help-btn { margin-left: auto; }
  .module .help-text { margin-top: -2px; }
  .item-name { font-size: .74rem; font-weight: 700; color: var(--accent); text-align: right; }
  .sub-label { display: block; font-size: .62rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin: 12px 0 6px; }
  .foot-note { text-align: center; color: var(--muted); font-size: .66rem; line-height: 1.4; padding: 10px 0 0; margin: 0; }

  .lock-btn { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; color: var(--muted); border: 1px solid transparent; }
  .lock-btn svg { width: 16px; height: 16px; }
  .lock-btn[aria-pressed="true"] { color: var(--accent); border-color: var(--accent); background: rgba(var(--accent-rgb), .12); }

  .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip-row + .chip-row, .chip-row + .card-grid { margin-top: 8px; }
  .chip {
    border: 1px solid var(--line); border-radius: 999px; background: var(--surface);
    padding: 6px 11px; font-size: .7rem; font-weight: 700; color: var(--muted);
  }
  .chip[aria-pressed="true"] { background: rgba(var(--accent-rgb), .16); border-color: var(--accent); color: var(--accent); }
  .chip-label { align-self: center; font-size: .66rem; font-weight: 800; color: var(--muted); margin-right: 2px; }
  .pill-row { display: flex; gap: 6px; flex-wrap: wrap; }

  .switch-row { display: flex; gap: 8px 18px; flex-wrap: wrap; margin-bottom: 10px; }
  .switch { display: inline-flex; align-items: center; gap: 9px; font-size: .76rem; font-weight: 700; cursor: pointer; position: relative; }
  .switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .switch-track {
    width: 40px; height: 24px; border-radius: 999px; background: var(--line); position: relative; flex: 0 0 auto;
    transition: background .15s;
  }
  .switch-track::after {
    content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%;
    background: #fff; box-shadow: 0 1px 3px rgba(36,27,61,.3); transition: transform .15s;
  }
  .switch input:checked + .switch-track { background: var(--accent); }
  .switch input:checked + .switch-track::after { transform: translateX(16px); }
  .switch input:focus-visible + .switch-track { outline: 3px solid var(--accent); outline-offset: 2px; }

  .select-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .select-field { display: grid; gap: 5px; font-size: .64rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .select-field select { font-size: .86rem; font-weight: 700; padding: 10px; text-transform: none; letter-spacing: 0; color: var(--text); }

  .card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .card {
    border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 7px 7px 6px;
    display: grid; gap: 4px; text-align: left; color: var(--muted); min-width: 0;
  }
  .card .preview { width: 100%; height: 22px; fill: currentColor; stroke: none; }
  .card.is-icon { grid-template-columns: auto 1fr; align-items: center; gap: 6px; }
  .card.is-icon svg { width: 19px; height: 19px; }
  .card.is-icon .card-name { white-space: normal; line-height: 1.2; }
  .card-name { font-size: .64rem; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card[aria-pressed="true"] { border-color: var(--accent); background: rgba(var(--accent-rgb), .14); color: var(--accent); box-shadow: 0 0 0 1px rgba(var(--accent-rgb), .3) inset; }

  .track-list { display: grid; gap: 7px; }
  .track-row { display: grid; grid-template-columns: 30px 46px 1fr 34px; gap: 6px; align-items: center; }
  .track-row.is-off .step-row, .track-row.is-off .track-name { opacity: .35; }
  .track-roll {
    width: 30px; height: 30px; border: 1px solid var(--line); border-radius: 50%; background: var(--surface);
    display: grid; place-items: center; color: var(--muted); touch-action: none;
  }
  .track-roll svg { width: 14px; height: 14px; }
  .track-roll.is-active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .track-name { font-size: .62rem; font-weight: 700; color: var(--muted); overflow: hidden; text-overflow: ellipsis; }
  .track-toggle { border: 1px solid var(--line); border-radius: 999px; background: var(--surface); padding: 6px 0; font-size: .58rem; text-align: center; font-weight: 700; }
  .step-row { display: grid; gap: 2px; }
  .step-cell {
    height: 22px; border-radius: 5px; background: rgba(36,27,61,.08); padding: 0; position: relative;
    font-size: .5rem; font-weight: 800; color: #fff; display: grid; place-items: center;
  }
  .step-cell.is-alt { background: rgba(36,27,61,.15); }
  .step-cell.is-hit { background: var(--accent); }
  .step-cell.is-soft { background: rgba(var(--accent-rgb), .45); }
  .step-cell[data-label]::after { content: attr(data-label); }
  .step-cell.is-now { outline: 2px solid var(--text); outline-offset: 1px; }

  .slider-line { display: grid; grid-template-columns: 72px 1fr 44px; gap: 10px; align-items: center; font-size: .72rem; font-weight: 700; margin: 6px 0; }
  .slider-line output { font-size: .68rem; color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }
  .select-line { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: .72rem; font-weight: 700; margin-top: 12px; }
  select { border: 1px solid var(--line); border-radius: 11px; padding: 7px 8px; background: var(--surface); font-size: .72rem; }
  input[type=range] { width: 100%; accent-color: var(--accent); }

  .chord-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(56px, 1fr)); gap: 6px; margin-top: 12px; }
  .chord-box { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 7px 4px; text-align: center; display: grid; gap: 2px; }
  .chord-box strong { font-size: .86rem; }
  .chord-roman { font-size: .6rem; font-weight: 800; color: var(--muted); }
  .chord-box.is-now { border-color: var(--accent); background: rgba(var(--accent-rgb), .16); }
  .chord-box.is-now strong { color: var(--accent); }

  .satb-list { display: grid; gap: 6px; }
  .satb-row { display: grid; grid-template-columns: 12px 1fr 52px 96px; gap: 10px; align-items: center; border-radius: 12px; background: var(--surface); padding: 7px 8px 7px 10px; border: 1px solid var(--line); }
  .voice-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--voice); }
  .satb-name { font-size: .74rem; font-weight: 700; }
  .satb-note { font-size: .86rem; font-variant-numeric: tabular-nums; }
  .satb-row .chip { text-align: center; }
  .satb-row.is-focus { border-color: var(--voice); box-shadow: 0 0 0 1px var(--voice) inset; }
  .satb-row.is-mute .satb-name, .satb-row.is-mute .satb-note { opacity: .35; text-decoration: line-through; }

  .mixer-list { display: grid; gap: 8px; }
  .mixer-row { display: grid; grid-template-columns: 40px 1fr; gap: 8px; align-items: center; }
  .mixer-row.is-master { grid-template-columns: 1fr; margin-top: 8px; padding-top: 12px; border-top: 1px dashed var(--line); }
  .mute-btn {
    width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
    border: 1px solid var(--line); background: var(--surface); color: var(--accent);
  }
  .mute-btn svg { width: 19px; height: 19px; }
  .mute-btn[aria-pressed="true"] { color: var(--muted); background: var(--surface-2); }
  .level-wrap { position: relative; display: block; }
  /* Pegelbalken: das Range-Feld selbst ist der Balken, die Füllung kommt
     aus --val (siehe _paintLevel); der Griff ist nur ein schmaler Strich. */
  .level {
    -webkit-appearance: none; appearance: none; display: block; width: 100%; height: 40px; margin: 0;
    border-radius: 12px; border: 1px solid var(--line); cursor: pointer; touch-action: pan-y;
    background: linear-gradient(to right, rgba(var(--accent-rgb), .5) var(--val, 0%), var(--surface) var(--val, 0%));
  }
  .level::-webkit-slider-runnable-track { background: transparent; height: 100%; }
  .level::-moz-range-track { background: transparent; height: 100%; }
  .level::-webkit-slider-thumb { -webkit-appearance: none; width: 5px; height: 40px; border-radius: 3px; background: var(--accent); }
  .level::-moz-range-thumb { width: 5px; height: 40px; border: 0; border-radius: 3px; background: var(--accent); }
  .level-label, .level-value {
    position: absolute; top: 50%; transform: translateY(-50%); pointer-events: none;
    font-size: .76rem; font-weight: 800; color: var(--text);
  }
  .level-label { left: 12px; }
  .level-value { right: 12px; font-variant-numeric: tabular-nums; color: var(--muted); }
  .mixer-row.is-muted .level { background: linear-gradient(to right, rgba(140,129,166,.22) var(--val, 0%), var(--surface-2) var(--val, 0%)); }
  .mixer-row.is-muted .level::-webkit-slider-thumb { background: var(--muted); }
  .mixer-row.is-muted .level::-moz-range-thumb { background: var(--muted); }
  .mixer-row.is-muted .level-label { color: var(--muted); text-decoration: line-through; }
  .mixer-row.is-master .level { height: 46px; background: linear-gradient(to right, var(--accent) var(--val, 0%), var(--surface) var(--val, 0%)); }
  .mixer-row.is-master .level::-webkit-slider-thumb { height: 46px; background: var(--text); }
  .mixer-row.is-master .level::-moz-range-thumb { height: 46px; background: var(--text); }
  .mixer-row.is-master .level-label { color: #fff; text-shadow: 0 1px 2px rgba(36,27,61,.35); }

  .macro-knobs { justify-content: space-between; }
  .expert { margin-top: 12px; }
  .expert summary { cursor: pointer; font-size: .74rem; font-weight: 800; color: var(--accent); padding: 8px 0; list-style: none; display: flex; align-items: center; gap: 6px; }
  .expert summary::-webkit-details-marker { display: none; }
  .expert summary svg { width: 16px; height: 16px; }
  .expert[open] summary { margin-bottom: 8px; }

  .module-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .module {
    grid-column: span 2; border: 1px solid var(--line); border-radius: 18px; padding: 13px;
    background: var(--surface); box-shadow: 0 3px 10px -6px rgba(36,27,61,.18);
  }
  .module.module-half { grid-column: span 1; }
  .module-head { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; }
  .module-icon {
    width: 28px; height: 28px; flex: 0 0 auto; border-radius: 50%; display: grid; place-items: center;
    background: rgba(var(--accent-rgb), .15); color: var(--accent);
  }
  .module-icon svg { width: 15px; height: 15px; }
  .module-head h3 { font-size: .72rem; color: var(--text); text-transform: uppercase; letter-spacing: .06em; margin: 0; font-weight: 800; }
  .wave-row { display: flex; gap: 8px; }
  .wave-btn { flex: 1; aspect-ratio: 1.3; border: 1px solid var(--line); border-radius: 13px; background: var(--surface); display: grid; place-items: center; color: var(--muted); }
  .wave-btn svg { width: 58%; height: 58%; }
  .wave-btn[aria-pressed="true"] { border-color: var(--accent); background: rgba(var(--accent-rgb), .16); color: var(--accent); }

  .envelope-graph { width: 100%; height: 42px; }
  .envelope-path { fill: none; stroke: var(--accent); stroke-width: 2; }
  .adsr-sliders { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
  .slider-field { font-size: .58rem; font-weight: 700; display: block; color: var(--muted); }
  .slider-field input { display: block; margin-top: 4px; }

  .knob-row { display: flex; gap: 12px; margin-top: 2px; flex-wrap: wrap; }
  .knob-field { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 58px; }
  .knob { width: 50px; height: 50px; padding: 0; touch-action: none; }
  .knob svg { width: 100%; height: 100%; }
  .knob-track { fill: none; stroke: var(--line); stroke-width: 3.2; }
  .knob-fill { fill: none; stroke: var(--accent); stroke-width: 3.2; stroke-linecap: round; transform: rotate(135deg); transform-origin: 20px 20px; }
  .knob-dot { fill: var(--accent); stroke: none; }
  .knob-label { font-size: .58rem; font-weight: 700; color: var(--muted); text-align: center; line-height: 1.15; }
  .knob-value { font-size: .62rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .module-half .knob-row { gap: 6px; }
  .module-half .knob-field { width: 52px; }
  .module-half .knob { width: 44px; height: 44px; }
  .module .chip-row { margin-bottom: 10px; }
  .module .select-line { margin-top: 8px; }

  .arp-controls { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .arp-options.is-off { opacity: .45; }
  .switch.is-disabled { opacity: .4; cursor: default; }
  .scale-pads { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; touch-action: none; user-select: none; -webkit-user-select: none; }
  .pad {
    height: 56px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); padding: 0;
    font-size: .74rem; font-weight: 800; color: var(--text); touch-action: none;
  }
  .pad.is-root { border-color: rgba(var(--accent-rgb), .55); background: rgba(var(--accent-rgb), .08); }
  .pad.is-hot { background: var(--accent); border-color: var(--accent); color: #fff; }
  .pad.is-latched, .key.is-latched { box-shadow: inset 0 0 0 2px #fff, 0 0 0 2px var(--accent); }
  .key.is-arp, .pad.is-arp { filter: brightness(1.15); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), .55); }
  .fx-groups { display: grid; gap: 12px; }
  .fx-group + .fx-group { padding-top: 12px; border-top: 1px dashed var(--line); }
  .fx-group .sub-label { margin-top: 0; }

  .keyboard-head { display: flex; align-items: center; justify-content: space-between; margin: 0 0 8px; gap: 10px; }
  .keyboard-head strong { font-size: .8rem; }
  .keyboard { position: relative; height: 128px; touch-action: none; user-select: none; -webkit-user-select: none; }
  .key { position: absolute; top: 0; padding: 0 0 6px; display: flex; align-items: flex-end; justify-content: center; touch-action: none; user-select: none; }
  .key.is-white { height: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 0 0 9px 9px; color: var(--muted); font-size: .5rem; font-weight: 800; z-index: 1; }
  .key.is-black { height: 60%; background: #2d2639; border-radius: 0 0 7px 7px; z-index: 2; }
  .key.is-hot { background: var(--accent); border-color: var(--accent); color: #fff; }

  .transport-bar {
    flex: 0 0 auto; border-top: 1px solid var(--line); background: var(--surface);
    padding: 10px max(16px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  }
  .transport-row { display: grid; grid-template-columns: auto 1fr auto auto auto; align-items: center; gap: 8px; }
  .transport-play {
    width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; border: 0;
    background: var(--accent); color: #fff; box-shadow: 0 6px 20px -6px rgba(var(--accent-rgb), .7);
  }
  .tempo-field { display: grid; gap: 2px; min-width: 0; }
  .bpm-out { font-weight: 800; font-size: 1rem; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .tap-btn { width: auto; padding: 0 10px; font-size: .68rem; font-weight: 800; }
  .now-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; min-height: 18px; }
  .beat-dots { display: flex; gap: 4px; }
  .beat-dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
  .beat-dots i:first-child { width: 10px; height: 10px; margin-top: -1px; }
  .beat-dots i.is-now { background: var(--accent); }
  .now-chord { font-weight: 800; font-size: .8rem; color: var(--accent); }
  .status-line { flex: 1; font-size: .66rem; color: var(--muted); text-align: right; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .sheet { position: absolute; inset: 0; background: rgba(36,27,61,.35); display: flex; align-items: flex-end; justify-content: center; z-index: 5; }
  .sheet-card {
    width: 100%; max-width: 520px; max-height: 88%; overflow-y: auto; background: var(--bg); border-radius: 22px 22px 0 0;
    padding: 16px max(16px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  }
  .slot-list { display: grid; gap: 6px; }
  .slot-row { display: grid; grid-template-columns: 1fr auto auto; gap: 6px; align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 8px 8px 8px 12px; }
  .slot-text { display: grid; min-width: 0; }
  .slot-text strong { font-size: .76rem; }
  .slot-text span { font-size: .64rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  textarea { width: 100%; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 8px; font-size: .66rem; font-family: ui-monospace, monospace; resize: vertical; min-height: 54px; }
  .sheet-status { min-height: 1.2em; font-size: .7rem; font-weight: 700; color: var(--accent); text-align: center; margin: 10px 0 0; }

  @media (max-width: 380px) {
    .adsr-sliders { grid-template-columns: repeat(2, 1fr); }
    .module-grid { grid-template-columns: 1fr; }
    .module, .module.module-half { grid-column: span 1; }
    .card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .track-row { grid-template-columns: 28px 38px 1fr 30px; gap: 5px; }
    .satb-row { grid-template-columns: 12px 1fr 44px 84px; gap: 6px; }
  }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; animation: none !important; } }
</style>

<header class="lab-head">
  <div class="lab-head-title">
    <div class="eyebrow">${t('lab.eyebrow')}</div>
    <h1>Chor <span>Groove</span> Lab</h1>
  </div>
  <button class="icon-btn" type="button" data-action="open-sheet" aria-label="${t('lab.saveAria')}" title="${t('lab.saveAria')}">${UI_ICON.save}</button>
  <button class="icon-btn close-btn" type="button" data-action="close" aria-label="${t('lab.closeAria')}">${UI_ICON.close}</button>
</header>

<nav class="tab-bar" role="tablist">
  ${TABS.map((tab) => `<button class="tab-btn" type="button" role="tab" data-action="tab" data-tab="${tab.id}" aria-selected="${tab.id === 'beat'}">${t(tab.labelKey)}</button>`).join('')}
</nav>

<div class="lab-body">
  <section class="tab-panel" data-tab-panel="beat">
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.drumloop')}</h2><span class="item-name pattern-name"></span>${lockBtn('beat')}</div>
      <div class="chip-row meter-chips" role="group" aria-label="${t('lab.meterAria')}"></div>
      ${filterRow('beat-cats')}
      <div class="card-grid pattern-grid"></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.pattern')}</h2>${help('editHint')}<button class="chip reset-beat" type="button" data-action="reset-beat">${t('lab.resetBeat')}</button></div>
      ${helpText('editHint')}
      <div class="track-list"></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.bassSound')}</h2>${help('helpBass')}</div>
      ${helpText('helpBass')}
      <div class="chip-row bass-chips"></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.groove')}</h2>${help('helpGroove')}</div>
      ${helpText('helpGroove')}
      <label class="slider-line"><span>${t('lab.swing')}</span><input type="range" data-field="swing" min="0" max="1" step=".01"><output data-out="swing"></output></label>
      <label class="slider-line"><span>${t('lab.pump')}</span><input type="range" data-field="pump" min="0" max="1" step=".01"><output data-out="pump"></output></label>
    </section>
  </section>

  <section class="tab-panel" data-tab-panel="harmony" hidden>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.key')}</h2>${help('helpKey')}<span class="item-name key-name"></span>${lockBtn('harmony')}</div>
      ${helpText('helpKey')}
      <div class="select-grid">
        <label class="select-field"><span>${t('lab.keyRoot')}</span><select data-field="keyRoot"></select></label>
        <label class="select-field"><span>${t('lab.keyMode')}</span><select data-field="modeId"></select></label>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.progression')}</h2>${help('helpProgression')}</div>
      ${helpText('helpProgression')}
      <div class="chip-row prog-chips"></div>
      <div class="chord-strip"></div>
      <label class="select-line"><span>${t('lab.chordChange')}</span>
        <select data-field="chordBars"><option value="1">${t('lab.everyBar')}</option><option value="2">${t('lab.everyTwoBars')}</option></select>
      </label>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.satbTitle')}</h2>${help('satbHint')}</div>
      ${helpText('satbHint')}
      <div class="switch-row">${toggle('chordsOn', 'lab.chordsPlay')}</div>
      <div class="satb-list"></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.drone')}</h2>${help('droneHint')}</div>
      ${helpText('droneHint')}
      <div class="switch-row">${toggle('droneOn', 'lab.droneOn')}${toggle('droneFifth', 'lab.droneFifth')}</div>
    </section>
  </section>

  <section class="tab-panel" data-tab-panel="melody" hidden>
    <section class="panel">
      <div class="panel-head">
        <h2>${t('lab.melody')}</h2>${help('melodyHint')}
        <span class="item-name melody-name"></span>
        ${lockBtn('melody')}
      </div>
      ${helpText('melodyHint')}
      <div class="switch-row">${toggle('melodyOn', 'lab.melodyOn')}</div>
      ${filterRow('melody-cats')}
      <div class="card-grid melody-grid"></div>
      <span class="sub-label">${t('lab.melodyOctave')}</span>
      <div class="chip-row melody-octaves"></div>
    </section>
  </section>

  <section class="tab-panel" data-tab-panel="sound" hidden>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.sound')}</h2>${help('helpSound')}${lockBtn('sound')}</div>
      ${helpText('helpSound')}
      ${filterRow('preset-cats')}
      <div class="card-grid preset-grid"></div>
      <div class="panel-head" style="margin:12px 0 4px"><span class="item-name preset-name" style="text-align:left"></span>
        <button class="chip" type="button" data-action="reset-sound">${t('lab.resetSound')}</button></div>
      <div class="knob-row macro-knobs"></div>

      <details class="expert">
        <summary>${pictogramIcon('sliders')} ${t('lab.allControls')}</summary>
        <div class="module-grid">
          <div class="module">
            <div class="module-head"><span class="module-icon">${pictogramIcon('pulse')}</span><h3>${t('lab.oscillator')}</h3>${help('helpOsc')}</div>
            ${helpText('helpOsc')}
            <div class="wave-row" role="group" aria-label="${t('lab.waveformAria')}"></div>
          </div>
          <div class="module">
            <div class="module-head"><span class="module-icon">${pictogramIcon('stairs')}</span><h3>${t('lab.envelope')}</h3>${help('helpEnv')}</div>
            ${helpText('helpEnv')}
            <svg class="envelope-graph" viewBox="0 0 92 40" preserveAspectRatio="none"><path class="envelope-path" d=""/></svg>
            <div class="adsr-sliders"></div>
          </div>
          <div class="module">
            <div class="module-head"><span class="module-icon">${pictogramIcon('target')}</span><h3>${t('lab.filter')}</h3>${help('helpFilter')}</div>
            ${helpText('helpFilter')}
            <div class="chip-row filter-type-chips"></div>
            <div class="knob-row filter-knobs"></div>
          </div>
          <div class="module">
            <div class="module-head"><span class="module-icon">${pictogramIcon('wave')}</span><h3>${t('lab.lfo')}</h3>${help('helpLfo')}</div>
            ${helpText('helpLfo')}
            <div class="knob-row lfo-knobs"></div>
            <label class="select-line"><span>${t('lab.lfoSyncLabel')}</span><select data-field="lfoSync"></select></label>
          </div>
          <div class="module">
            <div class="module-head"><span class="module-icon">${pictogramIcon('star')}</span><h3>${t('lab.character')}</h3>${help('helpCharacter')}</div>
            ${helpText('helpCharacter')}
            <div class="knob-row character-knobs"></div>
          </div>
          <div class="module">
            <div class="module-head"><span class="module-icon">${pictogramIcon('wave')}</span><h3>${t('lab.vibrato')}</h3>${help('helpVibrato')}</div>
            ${helpText('helpVibrato')}
            <div class="knob-row vibrato-knobs"></div>
          </div>
          <div class="module">
            <div class="module-head"><span class="module-icon">${pictogramIcon('stairs')}</span><h3>${t('lab.glide')}</h3>${help('helpGlide')}</div>
            ${helpText('helpGlide')}
            <div class="knob-row glide-knobs"></div>
            <div class="switch-row" style="margin-top:8px">${toggle('mono', 'lab.mono')}</div>
          </div>
        </div>
      </details>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>${t('lab.effects')}</h2>${help('helpEffects')}</div>
      ${helpText('helpEffects')}
      <div class="fx-groups">
        <div class="fx-group"><span class="sub-label">${t('lab.reverb')}</span><div class="knob-row fx-reverb"></div></div>
        <div class="fx-group">
          <span class="sub-label">${t('lab.echo')}</span><div class="knob-row fx-echo"></div>
          <label class="select-line"><span>${t('lab.echoTime')}</span><select data-field="echoDiv"></select></label>
        </div>
        <div class="fx-group"><span class="sub-label">${t('lab.knobChorus')}</span><div class="knob-row fx-chorus"></div></div>
      </div>
    </section>
  </section>

  <section class="tab-panel" data-tab-panel="mixer" hidden>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.mixer')}</h2>${help('helpMixer')}</div>
      ${helpText('helpMixer')}
      <div class="mixer-list"></div>
    </section>
  </section>

  <section class="tab-panel" data-tab-panel="keys" hidden>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.arpeggiator')}</h2>${help('helpArp')}</div>
      ${helpText('helpArp')}
      <div class="switch-row">${toggle('arpOn', 'lab.arpOn')}${toggle('latchOn', 'lab.latch')}</div>
      <div class="arp-options">
        <span class="sub-label">${t('lab.arpKeyMode')}</span>
        <div class="chip-row arp-keymode"></div>
        <span class="sub-label">${t('lab.arpIdle')}</span>
        <div class="chip-row arp-idle"></div>
        <div class="arp-controls">
          <select data-field="arpMode" aria-label="${t('lab.directionAria')}">
            <option value="up">${t('lab.arpUp')}</option>
            <option value="down">${t('lab.arpDown')}</option>
            <option value="updown">${t('lab.arpUpDown')}</option>
            <option value="random">${t('lab.arpRandom')}</option>
          </select>
          <select data-field="arpDivision" aria-label="${t('lab.speedAria')}">
            <option value="1">1/16</option>
            <option value="2">1/8</option>
            <option value="4">1/4</option>
          </select>
          <select data-field="arpOctaves" aria-label="${t('lab.octaveRangeAria')}">
            <option value="1">${t('lab.octave1')}</option>
            <option value="2">${t('lab.octave2')}</option>
            <option value="3">${t('lab.octave3')}</option>
          </select>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>${t('lab.miniKeyboard')}</h2>${help('keysHint')}</div>
      ${helpText('keysHint')}
      <div class="keyboard-head">
        <div class="chip-row keys-layout" role="group" aria-label="${t('lab.keysLayoutAria')}"></div>
        <div class="chip-row octave-list"></div>
      </div>
      <div class="keyboard"></div>
      <div class="scale-pads" hidden></div>
    </section>
  </section>
</div>

<footer class="transport-bar">
  <div class="transport-row">
    <button class="transport-play" type="button" data-action="toggle-transport" aria-label="${t('lab.startAria')}">${UI_ICON.play}</button>
    <label class="tempo-field">
      <output class="bpm-out">106 BPM</output>
      <input class="bpm-input" type="range" min="40" max="180" value="106" aria-label="${t('lab.tempoAria')}">
    </label>
    <button class="icon-btn tap-btn" type="button" data-action="tap-tempo" aria-label="${t('lab.tapAria')}">${t('lab.tapTempo')}</button>
    <button class="icon-btn" type="button" data-action="randomize" aria-label="${t('lab.randomAria')}" title="${t('lab.randomAria')}">${UI_ICON.dice}</button>
    <button class="icon-btn" type="button" data-action="undo" aria-label="${t('lab.undoAria')}" title="${t('lab.undoAria')}" disabled>${UI_ICON.undo}</button>
  </div>
  <div class="now-row">
    <div class="beat-dots" aria-hidden="true"></div>
    <strong class="now-chord"></strong>
    <p class="status-line" role="status">${t('lab.statusReady')}</p>
  </div>
</footer>

<div class="sheet" hidden>
  <div class="sheet-card" role="dialog" aria-modal="true" aria-label="${t('lab.saveTitle')}">
    <div class="panel-head"><h2>${t('lab.saveTitle')}</h2>
      <button class="icon-btn" type="button" data-action="close-sheet" aria-label="${t('lab.closeAria')}">${UI_ICON.close}</button></div>
    <div class="slot-list"></div>
    <p class="foot-note storage-hint"></p>
    <span class="sub-label">${t('lab.codeTitle')}</span>
    <textarea class="code-out" readonly aria-label="${t('lab.codeTitle')}"></textarea>
    <div class="pill-row" style="margin-top:6px"><button class="chip" type="button" data-action="copy-code">${t('lab.copy')}</button></div>
    <span class="sub-label">${t('lab.importTitle')}</span>
    <textarea class="code-in" aria-label="${t('lab.importTitle')}" placeholder="GL1.…"></textarea>
    <div class="pill-row" style="margin-top:6px"><button class="chip" type="button" data-action="import-code">${t('lab.importCode')}</button></div>
    <p class="sheet-status" role="status"></p>
  </div>
</div>`;
    }
  }

  if (!customElements.get('chor-groove-lab')) customElements.define('chor-groove-lab', GrooveLabView);

  global.ChorGrooveLab = {
    open(options) {
      // app.js reicht seine t()-Funktion herein; diese Datei ist ein
      // klassisches Skript und kann STRINGS nicht selbst importieren.
      if (typeof options?.t === 'function') t = options.t;

      let lab = document.querySelector('chor-groove-lab');
      // Die Vorlage wird einmal beim Aufbau der Komponente gerendert. Wurde
      // die Sprache seitdem umgestellt, stünde sie sonst weiter in der alten
      // da — dann neu aufbauen. Der letzte Stand kommt über die Ablage
      // (options.storage) zurück, sofern eine gereicht wird.
      if (lab && lab.dataset.lang !== (options?.lang || '')) {
        lab.remove();
        lab = null;
      }
      if (!lab) {
        lab = document.createElement('chor-groove-lab');
        lab.dataset.lang = options?.lang || '';
        lab.hidden = true;
        document.body.append(lab);
      }
      lab.open(options);
      return lab;
    },
  };
})(window);
