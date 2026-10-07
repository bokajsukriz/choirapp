/* ==========================================================================
   CHOR GROOVE LAB — verstecktes Easter Egg der BVG-App.
   Sieben Tipps auf den Songtitel im Player öffnen einen kleinen, komplett
   lokalen Beat-/Synth-Spielplatz (Web Audio API; Schlagzeug bei Bedarf aus
   den Samples in samples/drums, ohne sie klingt alles per Synthese). Vollbild wie die übrigen Vollbild-Ansichten der App — kein Dialog-
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
  /** Heutiges Datum (lokal) als 'YYYY-MM-DD'. */
  const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
  // Tempo-Bezug (gleich in Metronom und Rhythmus-Training): in 6/8 zählt
  // die punktierte Viertel, sonst die Viertel. Beim Taktartwechsel bleibt
  // die Achtel gleich schnell (siehe _convertTempo).
  const TEMPO_EIGHTHS = { '6/8': 3 };
  const eighthsPerBeat = (meter) => TEMPO_EIGHTHS[meter] ?? 2;
  const tempoSymbol = (meter) => (eighthsPerBeat(meter) === 3 ? '♩.' : '♩');
  /** Dauer einer Sechzehntel (Schritt) bei `bpm` im Tempo-Bezug der Taktart. */
  const stepSecondsFor = (bpm, meter) => 60 / bpm / (eighthsPerBeat(meter) * 2);
  const BPM_MIN = 30;
  const BPM_MAX = 180;

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
     `swingUnit: 8`: Swing auf Achteln statt Sechzehnteln (siehe
     _swingOffset); `swing`: Vorgabe für den Swing-Regler beim Wählen.
     Reihenfolge nie ändern — gespeichert wird der Index (patternIndex).
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
    { name: 'Swing Soul', icon: 'note', meter: '4/4', cat: 'funky', kick: [0, 3, 7, 10, 13], snare: [4, 12], ghost: [6, 9, 15], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      swingUnit: 8, swing: .6,
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
    { name: 'Shuffle Roll', icon: 'repeat', meter: '4/4', cat: 'breaks', kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 3, 5, 6, 8, 10, 11, 13, 14],
      bass: [1, 4, 6, 9, 12, 14], bassNotes: [0, 4, 0, 4, 0, 2],
      roll: [[1.33, 1], [1.33, .7], [1.34, .85]] },
    { name: 'Deep House', icon: 'moon', meter: '4/4', cat: 'dance', kick: [0, 4, 8, 12], clap: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [2, 6, 10, 14],
      bass: [2, 6, 9, 13], bassNotes: [0, 0, 4, 0],
      roll: [[.5, .6], [1.5, 1], [.5, .6], [1.5, .9]] },
    { name: 'Broken Beat', icon: 'puzzle', meter: '4/4', cat: 'breaks', kick: [0, 5, 8, 11], snare: [3, 10, 14], ghost: [6, 13], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      bass: [1, 4, 7, 10, 14], bassNotes: [0, 2, 4, 6, 3],
      roll: [[.75, 1], [1.25, .6], [.5, .9], [1.5, .7]] },
    // --- 3/4 und 6/8 — für Walzer, Balladen und Volkslied-Repertoire ---
    { name: 'Waltz Step', icon: 'feather', meter: '3/4', cat: 'calm', kick: [0], ghost: [4, 8], hat: [0, 2, 4, 6, 8, 10],
      bass: [0], bassNotes: [0],
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
    // Chor-Grooves (Didaktik Paket 8) — nur angehängt, nie umsortieren.
    // `vocal`: Silben fürs Mundschlagzeug (nur Anzeige, Chor-Ansicht).
    { name: 'Gospel Shuffle', icon: 'users', meter: '4/4', cat: 'calm', kick: [0, 6, 8], clap: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], ghost: [14],
      perc: [4, 12], percSound: 'tamb',
      swingUnit: 8, swing: .67,
      bass: [0, 6, 8, 14], bassNotes: [0, 2, 4, 5],
      roll: [[1.33, 1], [1.33, .6], [1.34, .85]] },
    { name: 'Swing Ride', icon: 'horn', meter: '4/4', cat: 'calm', kick: [0, 8], ghost: [4, 12], hat: [0, 4, 6, 8, 12, 14], hatSound: 'ride',
      swingUnit: 8, swing: .67,
      bass: [0, 4, 8, 12], bassNotes: [0, 2, 4, 5],
      roll: [[1.33, 1], [1.33, .6], [1.34, .85]] },
    { name: 'Vocal Perc Basic', icon: 'wind', meter: '4/4', cat: 'calm', kick: [0, 6, 8], snare: [4, 12], hat: [2, 6, 10], open: [14],
      vocal: { kick: 'bm', snare: 'ka', hat: 'ts', open: 'tsch' },
      bass: [0, 8], bassNotes: [0, 0],
      roll: [[1, 1], [1, .6], [2, .85]] },
    // Popchor-Grooves (Paket 7b) — mit Percussion-Spur (`perc`, Klang `percSound`).
    { name: 'Pop Ballad', icon: 'heart', meter: '4/4', cat: 'calm',
      kick: [0, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      perc: [2, 6, 10, 14], percSound: 'shaker',
      bass: [0, 10], bassNotes: [0, 0], roll: [[2, 1], [1.5, .6], [.5, .8]] },
    { name: 'Pop Stomp', icon: 'boot', meter: '4/4', cat: 'dance',
      kick: [0, 4, 8, 12], snare: [4, 12], clap: [4, 12], hat: [2, 6, 10, 14],
      perc: [2, 6, 10, 14], percSound: 'tamb',
      bass: [0, 6, 8, 14], bassNotes: [0, 0, 0, 4], roll: [[1, 1], [.5, .6], [.5, .8], [2, .9]] },
    { name: 'Motown Stomp', icon: 'tambourine', meter: '4/4', cat: 'funky',
      kick: [0, 8, 14], snare: [0, 4, 8, 12], hat: [2, 6, 10, 14],
      perc: [4, 12], percSound: 'tamb',
      bass: [0, 4, 8, 12], bassNotes: [0, 4, 7, 4], roll: [[1, 1], [1, .7], [1, .85], [1, .7]] },
    { name: 'Halftime Pop', icon: 'hourglass', meter: '4/4', cat: 'calm',
      kick: [0, 3, 10], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14],
      perc: [4, 12], percSound: 'snap',
      bass: [0, 3, 10], bassNotes: [0, 0, 4], roll: [[2, 1], [1, .6], [1, .8]] },
  ];

  const TRACK_IDS = ['kick', 'snare', 'clap', 'hat', 'open', 'perc', 'bass'];
  const DRUM_TRACKS = TRACK_IDS.filter((track) => track !== 'bass');
  const TRACK_KEY = { kick: 'lab.trackKick', snare: 'lab.trackSnare', clap: 'lab.trackClap',
                      hat: 'lab.trackHat', open: 'lab.trackOpen', perc: 'lab.trackPerc', bass: 'lab.trackBass' };
  const trackLabel = (track) => t(TRACK_KEY[track]);

  // Antippen einer Zelle im Raster schaltet durch diese Werte, danach aus.
  // Snare: voll → Ghost-Note; Bass: Grundton → Quinte → Oktave
  // (Tonleiterstufen, siehe DRUM_PATTERNS).
  const CELL_CYCLE = { kick: [1], snare: [1, .45], clap: [1], hat: [1], open: [1], perc: [1, .5], bass: [0, 4, 7] };

  /** Bearbeitbare Arbeitskopie eines Loops: je Spur { Schritt: Wert }. Die
   *  Vorlagen in DRUM_PATTERNS bleiben unangetastet — "Original" stellt
   *  sie wieder her. */
  /** Schlagzeug-Klänge: Kit-Wahl, Percussion-Klang (siehe LabSamples). */
  const DRUM_KITS = ['auto', 'synth', 'acoustic', 'hybrid'];
  const PERC_SOUNDS = ['tamb', 'shaker', 'snap'];
  const FILL_LENGTHS = [0, 4, 8];
  const percOf = (pattern) => (PERC_SOUNDS.includes(pattern.percSound) ? pattern.percSound : 'tamb');
  /** 'auto' nach Loop-Kategorie auflösen: dance → synth, breaks → hybrid,
   *  calm/funky → acoustic. */
  const AUTO_KIT = { dance: 'synth', breaks: 'hybrid', calm: 'acoustic', funky: 'acoustic' };
  const resolveKit = (drumKit, pattern) => (drumKit === 'auto' ? AUTO_KIT[pattern.cat] || 'acoustic' : drumKit);
  /** Akzentfaktor einer Hi-Hat nach Position im Schlag (Feel): 4/4 voll auf
   *  der Zählzeit, .72 auf dem Achtel, .55 auf den Sechzehnteln; in 6/8 ebenso
   *  mit der punktierten Viertel als Zählzeit (alle 6 Schritte); in 3/4 voll auf
   *  dem Schlagbeginn (METERS.beats), sonst .6. */
  function hatAccent(step, meter) {
    if (meter === '4/4') return step % 4 === 0 ? 1 : step % 2 === 0 ? .72 : .55;
    if (meter === '6/8') return step % 6 === 0 ? 1 : step % 2 === 0 ? .72 : .55;
    return METERS[meter].beats.includes(step) ? 1 : .6;
  }
  /** Fill: im letzten Takt jedes `fills`-Takte-Blocks spielen die letzten vier
   *  Schritte Toms (idx 0–3 → Tom, Velocity) statt Snare/Clap/Hat/Open/Perc;
   *  auf Schritt 0 des Folgetakts kommt ein Crash. Nur Wiedergabe. */
  const FILL_HITS = [['tom-hi', 1], ['tom-hi', .7], ['tom-lo', 1], ['tom-lo', .85]];
  const FILL_MUTED = ['snare', 'clap', 'hat', 'open', 'perc'];
  function fillAt(g, barSteps, fills) {
    if (!fills) return { idx: -1, crash: false, fillBar: false };
    const bar = Math.floor(g / barSteps);
    const step = g % barSteps;
    const fillBar = bar % fills === fills - 1;
    return {
      idx: fillBar && step >= barSteps - 4 ? step - (barSteps - 4) : -1,
      crash: step === 0 && bar > 0 && (bar - 1) % fills === fills - 1,
      fillBar,
    };
  }
  /** Workshop und de:construct beginnen mit dem früheren Standard-Klang der Melodie. */
  const pinLegacyVoice = (s) => { s.sound = soundFromPreset(presetIndexByName('Velvet Choir')); return s; };
  /** Chor-Aufgaben, Workshop und de:construct klingen wie vor dem Sample-Kit. */
  function pinLegacySound(s) {
    s.drumKit = 'synth'; s.feel = false; s.fills = 0; s.trackOn.perc = false; s.bassSoundId = 'pluck';
    s.chordVoicing = 'satb'; s.chordAdd9 = false; s.chordSound = 'synth'; s.mix.chords = .55;
    return s;
  }
  /** Workshop und de:construct beginnen mit dem früheren Standard-Stand der Studio-Ansicht:
   *  erster Loop, erste Melodie, Velvet Choir, Pad aus. */
  function pinLegacyStudio(s) {
    s.patternIndex = 0; s.beat = beatFromPattern(DRUM_PATTERNS[0]); s.percSound = percOf(DRUM_PATTERNS[0]);
    s.melodyIndex = 0; s.chordsOn = false;
    return pinLegacyVoice(s);
  }

  function beatFromPattern(pattern) {
    const beat = { kick: {}, snare: {}, clap: {}, hat: {}, open: {}, perc: {}, bass: {} };
    (pattern.kick || []).forEach((s) => { beat.kick[s] = 1; });
    (pattern.snare || []).forEach((s) => { beat.snare[s] = 1; });
    (pattern.ghost || []).forEach((s) => { beat.snare[s] = .45; });
    (pattern.clap || []).forEach((s) => { beat.clap[s] = 1; });
    (pattern.hat || []).forEach((s) => { beat.hat[s] = 1; });
    (pattern.open || []).forEach((s) => { beat.open[s] = 1; });
    (pattern.perc || []).forEach((s) => { beat.perc[s] = 1; });
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

     Optional viertes Element `alt` (−1/+1): Verschiebung in Halbtönen NACH
     der Umrechnung der Stufe über dem aktuellen Akkordgrundton
     (midi = base + degreeSemis(steps, deg + shift) + alt). Ausnahme (siehe
     melodyOffset): Stufe 2 mit alt −1 über einem Akkord, dessen Terz schon
     klein ist, bleibt die kleine Terz — sonst entstünde eine Sekunde.
     Reihenfolge nie ändern — gespeichert wird der Index (melodyIndex).
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
    { name: 'Blue Third', meter: '4/4', cat: 'funky', motif: [[0, 0, 2], [3, 2, 1, -1], [4, 2, 1], [6, 4, 1], [9, 6, 1], [12, 4, 2]],
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
    // Synco Verse endet auf der Quinte (Vorlage: Oktave): Oktave → Tonika im nächsten
    // Durchlauf wäre ein Sprung von 12 Halbtönen (Prüfung: höchstens 9).
    // --- Tonart-Bezug (ref 'key'): fertige Takte, Stufen über der Tonika (0 = Tonika,
    // 7 = Oktave, negativ = darunter) — keine Motive über dem Akkordgrundton, sondern
    // eine singbare Linie, die über jede Folge passt (siehe snapMelodyMidi). ---
    { name: 'Pop Hook', meter: '4/4', cat: 'dance', ref: 'key', bars: [
      [[0, 2, 2], [2, 2, 1], [3, 4, 3], [6, 2, 2], [10, 1, 2], [12, 0, 4]],
      [[0, 1, 2], [2, 1, 1], [3, 4, 3], [6, 1, 2], [10, 0, 2], [12, -1, 4]],
      [[0, 0, 2], [2, 0, 1], [3, 2, 3], [6, 4, 2], [8, 5, 4], [12, 2, 4]],
      [[0, 5, 3], [3, 7, 3], [6, 5, 2], [8, 3, 4], [12, 0, 4]]] },
    { name: 'Ballad Line', meter: '4/4', cat: 'calm', ref: 'key', bars: [
      [[0, 2, 6], [6, 1, 2], [8, 0, 6], [14, -1, 2]],
      [[0, 1, 8], [8, -1, 4], [12, 1, 4]],
      [[0, 0, 6], [6, -1, 2], [8, 0, 4], [12, 2, 4]],
      [[0, 5, 8], [8, 3, 4], [12, 1, 4]]] },
    { name: 'Offbeat Chant', meter: '4/4', cat: 'dance', ref: 'key', bars: [
      [[2, 4, 1], [4, 4, 1], [6, 2, 2], [10, 4, 1], [12, 4, 2]],
      [[2, 4, 1], [4, 4, 1], [6, 6, 2], [10, 4, 1], [12, 1, 4]],
      [[2, 2, 1], [4, 2, 1], [6, 0, 2], [10, 2, 1], [12, 2, 2]],
      [[2, 3, 1], [4, 3, 1], [6, 5, 2], [10, 5, 1], [12, 7, 4]]] },
    { name: 'Gospel Call', meter: '4/4', cat: 'funky', ref: 'key', bars: [
      [[0, 4, 2], [2, 5, 2], [4, 4, 2], [6, 2, 2], [8, 4, 6], [14, 2, 2]],
      [[0, 1, 4], [4, 2, 2], [6, 1, 2], [8, -1, 6]],
      [[0, 4, 2], [2, 5, 2], [4, 4, 2], [6, 2, 2], [8, 0, 6], [14, 2, 2]],
      [[0, 5, 4], [4, 4, 2], [6, 2, 2], [8, 0, 8]]] },
    { name: 'Synco Verse', meter: '4/4', cat: 'funky', ref: 'key', bars: [
      [[0, 0, 1], [2, 0, 1], [3, 0, 1], [6, 2, 2], [9, 2, 1], [11, 0, 1], [12, -1, 1], [14, 0, 2]],
      [[0, -1, 1], [2, -1, 1], [3, -1, 1], [6, 1, 2], [9, 1, 1], [11, -1, 1], [12, -3, 1], [14, -1, 2]],
      [[0, 0, 1], [2, 0, 1], [3, 0, 1], [6, 2, 2], [9, 2, 1], [11, 4, 1], [12, 2, 2], [14, 0, 2]],
      [[0, 0, 1], [2, 0, 1], [3, 0, 1], [6, 3, 2], [9, 3, 1], [11, 5, 1], [12, 4, 4]]] },
    { name: 'Anthem Oh', meter: '4/4', cat: 'dance', ref: 'key', bars: [
      [[0, 4, 3], [3, 4, 3], [6, 5, 2], [8, 4, 4], [12, 2, 4]],
      [[0, 4, 3], [3, 4, 3], [6, 5, 2], [8, 4, 4], [12, 1, 4]],
      [[0, 4, 3], [3, 4, 3], [6, 5, 2], [8, 4, 4], [12, 2, 4]],
      [[0, 5, 3], [3, 5, 3], [6, 7, 2], [8, 5, 4], [12, 4, 4]]] },
    { name: 'Guide Tones', meter: '4/4', cat: 'calm', ref: 'key', bars: [
      [[0, 2, 16]], [[0, 1, 16]], [[0, 0, 16]], [[0, 0, 8], [8, -2, 8]]] },
  ];
  /** Bezug der Stufen einer Vorlage: 'chord' (über dem Akkordgrundton) oder 'key' (über der Tonika). */
  const melodyRefOf = (index) => MELODIES[index]?.ref ?? 'chord';

  // Je Abwandlung einmal fertig ausrechnen — der Scheduler liest nur noch.
  MELODIES.forEach((melody) => {
    if (!melody.vary) return; // fertige Takte (ref 'key', siehe unten): nichts auszurechnen
    const steps = METERS[melody.meter].steps;
    melody.bars = melody.vary.map(({ rhythmShift = 0, extendLast = 0, shift = 0, motif = melody.motif }) => {
      const bar = motif.map(([at, deg, len, alt]) => (alt ? [mod(at + rhythmShift, steps), deg + shift, len, alt] : [mod(at + rhythmShift, steps), deg + shift, len]));
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
    // Sample-Instrumente (Paket 7c): `sample` nennt den Ordner/das Instrument; Wellenform, Detune,
    // Sub, Pitch-Drop, LFO, Vibrato und Breite gelten dort nicht. Ohne geladene Samples klingt
    // der Ersatzklang (SAMPLE_FALLBACK).
    { name: 'Klavier', icon: 'piano', cat: 'keys', sample: 'piano', attack: .003, decay: .3, sustain: 1, release: .35, cutoff: 12000, resonance: 0, reverbWet: .18, echoWet: .05 },
    { name: 'E-Gitarre', icon: 'guitar', cat: 'keys', sample: 'guitar', attack: .003, decay: .3, sustain: 1, release: .25, cutoff: 9000, resonance: 0, reverbWet: .15, echoWet: .18 },
    { name: 'Chor Ooh', icon: 'mic', cat: 'pad', sample: 'choir', attack: .12, decay: .3, sustain: 1, release: .6, cutoff: 8000, resonance: 0, reverbWet: .35, echoWet: .05 },
    { name: 'Streicher', icon: 'harp', cat: 'pad', sample: 'strings', attack: .25, decay: .3, sustain: 1, release: .7, cutoff: 7000, resonance: 0, reverbWet: .3, echoWet: 0 },
    { name: 'Brass Stab', icon: 'trumpet', cat: 'lead', sample: 'brass', attack: .005, decay: .2, sustain: 1, release: .15, cutoff: 9000, resonance: 0, reverbWet: .15, echoWet: .08 },
  ];

  /** Sample-Instrumente der Klang-Presets. */
  const SAMPLE_INSTRUMENTS = ['piano', 'guitar', 'choir', 'strings', 'brass'];
  /** Ersatzklang je Instrument, solange die Samples fehlen (offline, Ladefehler, noch beim Laden). */
  const SAMPLE_FALLBACK = { piano: 'Tape Keys', guitar: 'Tape Keys', choir: 'Airy Choir', strings: 'Moon Pad', brass: 'Soft Brass' };
  // Dateien und Töne je Instrument (samples/<Ordner>, MIDI-Nummer als Name, ein Ton alle drei Halbtöne —
  // dieselben Listen wie SAMPLE_INST in uebe-lab.html); `long`: Überblend-Loop für lange Töne
  // (Vorbild SAMPLE_LONG/sampleNote dort); `level`: Pegel gegenüber den Synth-Klängen.
  const noteRange = (lo, hi) => Array.from({ length: (hi - lo) / 3 + 1 }, (_, i) => lo + i * 3);
  const SAMPLE_LONG = { loopFrom: .9, tail: .2, xfade: .4 };
  const LAB_INST = {
    guitar: { folder: 'guitar', notes: noteRange(54, 87), level: 1.15 },
    choir: { folder: 'choir', notes: noteRange(45, 81), long: SAMPLE_LONG, level: .7 },
    strings: { folder: 'strings', notes: noteRange(39, 81), long: SAMPLE_LONG, level: .55 },
    brass: { folder: 'brass', notes: noteRange(51, 75), level: 1.4 },
    piano: { level: 4.8, notes: noteRange(48, 84) },
  };

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
  // Echter Chor für die Akkorde (chordSound 'choir'): Sample-Preset 'Chor Ooh', die Engine fällt ohne Samples auf Airy Choir zurück.
  const CHOIR_CHORD_SOUND = soundFromPreset(presetIndexByName('Chor Ooh'));

  // Liegeton: bewusst schlicht und fest (gefilterte Säge, langsamer Einsatz)
  // — eine Stimmreferenz soll nicht vom gerade gewählten Klang abhängen.
  const DRONE_SOUND = { ...SOUND_DEFAULTS, wave: 'sawtooth', attack: .8, decay: .3, sustain: 1, release: 1.2,
    cutoff: 900, resonance: 1, detune: 5, width: .5, reverbWet: .25, echoWet: 0 };

  // Bass-Klänge für die Basslinie der Drumloops (eigene, einfache Stimme —
  // kein voller Synth-Klang, damit der Bass immer knapp und trocken bleibt).
  const BASS_SOUNDS = [
    { id: 'pluck', name: 'Square Pluck', wave: 'square', cutoff: 480, q: 8, decay: .14, sustain: 0, level: .2, envAmount: 0 },
    { id: 'sub', name: 'Sub Sine', wave: 'sine', cutoff: 2000, q: 0, decay: .32, sustain: .8, level: .42, envAmount: 0 },
    { id: 'growl', name: 'Saw Growl', wave: 'sawtooth', cutoff: 520, q: 7, decay: .22, sustain: .6, level: .2, envAmount: 1400 },
    { id: 'round', name: 'Round Finger', wave: 'triangle', cutoff: 900, q: 1, decay: .26, sustain: .7, level: .36, envAmount: 300 },
    // Echter Bass aus samples/bass (nächster Ton, umgestimmt); ohne geladene
    // Samples klingt stattdessen 'round' (siehe GrooveEngine.playBass).
    { id: 'finger', name: 'Finger Bass', sample: 'bass', decay: .3, sustain: .9, level: .6 },
  ];
  const BASS_SAMPLE_NOTES = [30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66];

  /** Länge eines Basstons in Schritten: bis zum nächsten Bass-Ton im selben
   *  Takt, sonst bis zum Taktende; mindestens ein Schritt. */
  function bassNoteSteps(bassSteps, step, barSteps) {
    let next = barSteps;
    for (const key of Object.keys(bassSteps)) {
      const at = Number(key);
      if (at > step && at < next) next = at;
    }
    return Math.max(1, next - step);
  }

  /** MIDI-Ton einer Bassstufe `bassDeg` über dem Akkord auf Stufe `deg`: `root` ist der Basston
   *  des Akkords (bei einer Umkehrung Terz/Quinte), Stufe 0 liegt auf diesem Basston, alle
   *  anderen Stufen bleiben Stufen über dem Akkordgrundton. */
  function bassNoteMidi(root, steps, deg, bassIndex, bassDeg) {
    const inv = 2 * bassIndex;
    return root + degreeSemis(steps, deg + (bassDeg === 0 ? inv : bassDeg)) - degreeSemis(steps, deg + inv);
  }

  /** Grundtöne des Basses je Akkord mit Stimmführung: der erste im Bereich
   *  36–47, jeder weitere in der Oktavlage 28–47 (Anweisung: 33–47; die fünf
   *  Halbtöne mehr nach unten (bis zum tiefen E der Bassgitarre) braucht es,
   *  damit kein Sprung über 7 Halbtöne entsteht, z. B. C → G → A → F), die dem vorherigen am nächsten liegt
   *  (Gleichstand → tiefer). `pcs`: Tonhöhenklassen. */
  function bassRootsFor(pcs) {
    const roots = [];
    for (const pc of pcs) {
      if (!roots.length) { roots.push(36 + pc); continue; }
      const prev = roots[roots.length - 1];
      let best = null;
      for (let m = 28; m <= 47; m++) {
        if (mod(m, 12) !== pc) continue;
        if (best === null || Math.abs(m - prev) < Math.abs(best - prev)) best = m;
      }
      roots.push(best);
    }
    return roots;
  }

  // Kick-Parameter (Workshop Paket 6): Start-/Endtonhöhe in Hz, Länge in s.
  // Die Standardwerte ergeben genau die bisherige Kick.
  const KIT_DEFAULTS = { kickStart: 150, kickEnd: 42, kickDecay: .19 };
  const KIT_RANGES = { kickStart: [60, 300], kickEnd: [25, 200], kickDecay: [.08, 1.2] };

  /* ------------------------------------------------------------------------
     HARMONIK — Tonarten, Akkordfolgen, SATB-Satz.
     ------------------------------------------------------------------------ */

  // Modi, Akkordbau, Tonnamen, Stimmumfänge und Satz kommen aus
  // harmony.js (window.ChorHarmony, von app.js vor dieser Datei geladen).
  const H = global.ChorHarmony;
  if (!H) throw new Error('Groove Lab: harmony.js ist nicht geladen.');
  const {
    MAJOR, degreeSemis, spell, noteLabel, SPELL_CASES, spellCheck,
    chordQuality, chordPitchClasses, chordSteps, SATB, VOICE_RANGES: SATB_RANGES,
    VOICING_STATS, voicePairs, voiceChord, leadingToneOf, voiceProgressionSatb, voiceProgressionPop,
  } = H;
  const MODE_NAME_KEYS = { major: 'lab.modeMajor', minor: 'lab.modeMinor', dorian: 'lab.modeDorian', mixolydian: 'lab.modeMixolydian' };
  const MODES = H.MODES.map((m) => ({ ...m, nameKey: MODE_NAME_KEYS[m.id] }));

  // Stufen (0 = I). Die Beschriftung (I–V–vi–IV …) wird je Modus berechnet,
  // weil dieselbe Stufenfolge in Moll anders klingt und heißt.
  /* Akkordfolgen: Stufen der gewählten Tonart (0 = I … 6 = VII), je
     Eintrag ein Akkord (ein oder zwei Takte, siehe chordBars). Name und
     Kurz-Erklärung stehen in strings.js (lab.progName…/lab.progInfo…).
     Die alten Ids bleiben, damit gespeicherte Stände weiter passen.
     dominant: in Moll klingt die V. Stufe als Dur-Dominante (mit Leitton,
     siehe chordSteps) — nur bei Folgen mit Kadenz-/Dominantfunktion; bei
     pop, sad, fifties, pachelbel und epic ist das Moll-v idiomatisch.
     dom7: alle Septakkorde sind Dominantseptakkorde (Blues: I7, IV7, V7),
     unabhängig vom Modus — nicht über den globalen sevenths-Schalter, der
     tonleitereigen Cmaj7/Fmaj7 ergäbe (siehe chordSteps).
     modes: nur in diesen Modi sinnvoll (fehlt = alle). In Dur ergäben die
     modalen Folgen vii° statt ♭VII; wer eine davon wählt, bekommt den Modus
     modes[0] dazu (siehe modeForProg). */
  const PROGRESSIONS = [
    { id: 'pop', cat: 'pop', degrees: [0, 4, 5, 3] },
    { id: 'sad', cat: 'pop', degrees: [5, 3, 0, 4] },
    { id: 'fifties', cat: 'pop', degrees: [0, 5, 3, 4] },
    { id: 'royal', cat: 'pop', degrees: [3, 4, 2, 5] },
    { id: 'pendulum', cat: 'pop', degrees: [0, 3] },
    { id: 'blues', cat: 'pop', degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 0], sevenths: true, dom7: true, dominant: true, modes: ['major', 'mixolydian'] },
    { id: 'cadence', cat: 'classic', degrees: [0, 3, 4, 0], dominant: true },
    { id: 'cadence3', cat: 'classic', degrees: [0, 3, 4], dominant: true },
    { id: 'amen', cat: 'classic', degrees: [0, 3, 0] },
    { id: 'plagal', cat: 'classic', degrees: [0, 3, 0, 3] },
    { id: 'pachelbel', cat: 'classic', degrees: [0, 4, 5, 2, 3, 0, 3, 4] },
    { id: 'circle', cat: 'classic', degrees: [0, 3, 6, 2, 5, 1, 4, 0], dominant: true },
    { id: 'jazz', cat: 'jazz', degrees: [1, 4, 0, 0], sevenths: true, dominant: true },
    { id: 'twoFiveOne', cat: 'jazz', degrees: [1, 4, 0], sevenths: true, dominant: true },
    { id: 'turnaround', cat: 'jazz', degrees: [0, 5, 1, 4], sevenths: true, dominant: true },
    { id: 'chain', cat: 'jazz', degrees: [2, 5, 1, 4], sevenths: true, dominant: true },
    { id: 'modal', cat: 'modal', degrees: [0, 6, 3, 0], modes: ['mixolydian', 'dorian', 'minor'] },
    { id: 'rock3', cat: 'modal', degrees: [0, 6, 3], modes: ['mixolydian', 'dorian', 'minor'] },
    { id: 'andalusian', cat: 'modal', degrees: [0, 6, 5, 4], dominant: true, modes: ['minor'] },
    { id: 'epic', cat: 'modal', degrees: [0, 5, 2, 6], modes: ['minor'] },
    { id: 'drone', cat: 'modal', degrees: [0] },
    // Paket 8: geliehene Akkorde, Zwischendominanten, Umkehrungen. `alter` und `bass` sind
    // optionale Parallel-Arrays zu `degrees`: alter[i] null | 'borrow' | 'secdom', bass[i]
    // 0 | 1 | 2 (Grundton, Terz, Quinte im Bass). In C: C – G/H – Am – F …
    { id: 'descend', cat: 'pop', degrees: [0, 4, 5, 3], bass: [0, 1, 0, 0] },
    { id: 'gospelIv', cat: 'pop', degrees: [0, 3, 3, 0], alter: [null, null, 'borrow', null] },
    { id: 'mixFlat7', cat: 'pop', degrees: [0, 6, 3, 0], alter: [null, 'borrow', null, null] },
    { id: 'secDom', cat: 'pop', degrees: [0, 2, 5, 3], alter: [null, 'secdom', null, null] },
  ];
  const PROG_ALTERS = ['borrow', 'secdom'];
  /** alter/bass auf `n` Akkorde bringen (fehlend/ungültig → normal bzw. Grundton). */
  const normAlter = (arr, n) => Array.from({ length: n }, (_, i) => (PROG_ALTERS.includes(arr?.[i]) ? arr[i] : null));
  const normBass = (arr, n) => Array.from({ length: n }, (_, i) => ([0, 1, 2].includes(arr?.[i]) ? arr[i] : 0));
  const plainAlter = (arr) => !arr || arr.every((x) => !x);
  const plainBass = (arr) => !arr || arr.every((x) => !x);
  /** Eingelesene Arrays prüfen: null, wenn nichts Besonderes übrig bleibt. */
  const sanitizeProgAlter = (raw, n) => { const a = Array.isArray(raw) ? normAlter(raw, n) : null; return a && !plainAlter(a) ? a : null; };
  const sanitizeProgBass = (raw, n) => { const b = Array.isArray(raw) ? normBass(raw, n) : null; return b && !plainBass(b) ? b : null; };
  const PROG_CATS = ['pop', 'classic', 'jazz', 'modal'];
  /** Passt die Folge zum Modus? Eigene Folgen (ohne `modes`) immer. */
  const progFitsMode = (prog, modeId) => !prog?.modes || prog.modes.includes(modeId);
  /** Modus, der beim Wählen einer Folge gilt: der bisherige, wenn er passt. */
  const modeForProg = (prog, modeId) => (progFitsMode(prog, modeId) ? modeId : prog.modes[0]);
  /** Folgen, die der Zufall zu einem Modus wählen darf. */
  const progsForRandom = (modeId) => PROGRESSIONS.filter((p) => p.id !== 'drone' && progFitsMode(p, modeId));
  const PROG_MAX_CHORDS = 16;
  const PROG_MAX_OWN = 24;
  const progKey = (kind, id) => `lab.prog${kind}${id[0].toUpperCase()}${id.slice(1)}`;

  /** Mini-Bild einer Akkordfolge: je Akkord ein Balken, Höhe = Stufe. */
  function progPreview(degrees, alter = null) {
    const w = 64 / degrees.length;
    const rects = degrees.map((d, i) => {
      const h = 3 + (mod(d, 7) / 6) * 11;
      // Geliehene Akkorde und Zwischendominanten: Balken blasser, mit hellem Kopf.
      const tint = alter?.[i] ? ' fill-opacity=".5"' : '';
      return `<rect x="${(i * w + .6).toFixed(2)}" y="${(15 - h).toFixed(2)}" width="${Math.max(1, w - 1.2).toFixed(2)}" height="${h.toFixed(2)}" rx="1"${tint}/>`;
    }).join('');
    return `<svg class="preview" viewBox="0 0 64 16" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>`;
  }

  function sanitizeProgDegrees(raw) {
    if (!Array.isArray(raw) || !raw.length) return null;
    const list = raw.slice(0, PROG_MAX_CHORDS).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    return list.length ? list : null;
  }

  function sanitizeProgLibrary(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw.slice(0, PROG_MAX_OWN).map((p) => {
      if (!p || typeof p !== 'object' || typeof p.id !== 'string' || seen.has(p.id)) return null;
      const degrees = sanitizeProgDegrees(p.degrees);
      if (!degrees) return null;
      seen.add(p.id);
      const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 40) : 'Progression';
      const entry = { id: p.id.slice(0, 24), name, degrees, sevenths: p.sevenths === true, dominant: p.dominant === true, dom7: p.dom7 === true };
      const alter = sanitizeProgAlter(p.alter, degrees.length);
      const bass = sanitizeProgBass(p.bass, degrees.length);
      if (alter) entry.alter = alter;
      if (bass) entry.bass = bass;
      return entry;
    }).filter(Boolean);
  }

  /**
   * Halbtöne einer Melodiestufe `deg` über dem Akkordgrundton (Stufe
   * `shift`), plus Alteration `alt` (−1/+1, siehe MELODIES). Blue-Note-
   * Regel: Stufe 2 (Terz) mit alt −1 über einem Akkord mit schon kleiner
   * Terz bleibt die kleine Terz (über a-Moll c, nie h).
   */
  function melodyOffset(steps, shift, deg, alt = 0) {
    const semis = degreeSemis(steps, deg + shift);
    if (alt === -1 && mod(deg, 7) === 2 && degreeSemis(steps, shift + 2) - degreeSemis(steps, shift) === 3) return semis;
    return semis + alt;
  }
  /**
   * MIDI-Ton einer Melodiestufe. ref 'chord' (Vorlagen, Editor, alte
   * Aufnahmen): Stufe über dem Grundton des klingenden Akkords `h` — das
   * Motiv wandert mit der Folge. ref 'key' (Aufnahmen ab v302): Stufe über
   * der Tonika in der Tonleiter des Modus — klingt über jedem Akkord gleich,
   * auch wenn die Aufnahme kürzer ist als die Folge.
   */
  function melodyMidi(deg, alt, h, ref, modeSteps, melodyOctave, shift = 0) {
    const base = 12 * (melodyOctave + 1) + foldRoot(h.keyRoot);
    if (ref === 'key') return base + degreeSemis(modeSteps, deg) + alt;
    return base + melodyOffset(h.steps, foldDegree(h.deg), deg, alt) + shift;
  }
  /**
   * Akkord-Anpassung auf schweren Zählzeiten (alle Vorlagen): liegt der Ton
   * genau einen Halbton über einem Akkordton (kleine None, reibt), wird er auf
   * diesen Akkordton abgesenkt. Alles andere (Optionen, Sexten, Septimen)
   * bleibt. `pcs`: Tonhöhenklassen des klingenden Akkords.
   */
  function snapMelodyMidi(midi, pcs) {
    return pcs.includes(mod(midi - 1, 12)) ? midi - 1 : midi;
  }
  /**
   * Oktavlage je Takt für Melodien mit Akkord-Bezug (statt foldDegree): der
   * erste Ton eines Takts soll dem letzten Ton des Vortakts möglichst nah
   * liegen (Gleichstand → tiefer), je Takt um höchstens eine Oktave nach oben
   * oder unten gegenüber der bisherigen Lage (melodyOctave ± 1). Weil Takt
   * für Takt nacheinander gewählt an der Grenze „hängen bleibt“ (der Akkord-
   * grundton wandert reihum), wird die ganze Periode (Ende → Anfang inklusive)
   * auf einmal gelöst: kleinste Summe der Sprünge, bei Gleichstand die
   * Lage nahe der bisherigen, dann die tiefere.
   * `bars`: Takte der Melodie; `count`: Takte der Periode; `midiAt(bar, deg, alt)`:
   * Ton im Takt `bar` ohne Verschiebung; `altBars`: nur jeder zweite Takt.
   * Liefert je Takt der Periode eine Verschiebung in {−12, 0, 12}.
   */
  function melodyBarShifts(bars, count, midiAt, altBars = false) {
    const shifts = new Array(count).fill(0);
    const idx = [];
    for (let n = 0; n < count; n++) {
      if (altBars && n % 2 === 1) continue;
      if (bars[n % bars.length].length) idx.push(n);
    }
    const L = idx.length;
    if (L < 2) return shifts;
    const options = [-12, 0, 12];
    const first = idx.map((n) => { const note = bars[n % bars.length][0]; return midiAt(n, note[1], note[3] || 0); });
    const last = idx.map((n) => { const notes = bars[n % bars.length]; const note = notes[notes.length - 1]; return midiAt(n, note[1], note[3] || 0); });
    const stateCost = (b) => Math.abs(options[b]) * 1e-3 + (options[b] + 12) * 1e-6;
    let best = null;
    for (let start = 0; start < 3; start++) {
      // cost[b]: bester Gesamtpreis bis Takt i, wenn dort Zustand b gewählt ist
      let cost = [Infinity, Infinity, Infinity];
      let back = [];
      cost[start] = stateCost(start);
      for (let i = 1; i <= L; i++) {
        const next = [Infinity, Infinity, Infinity];
        const from = [0, 0, 0];
        for (let b = 0; b < 3; b++) {
          if (i === L && b !== start) continue; // Ende schließt an den Anfang an
          for (let a = 0; a < 3; a++) {
            if (cost[a] === Infinity) continue;
            const c = cost[a] + Math.abs(first[i % L] + options[b] - (last[i - 1] + options[a])) + (i === L ? 0 : stateCost(b));
            if (c < next[b]) { next[b] = c; from[b] = a; }
          }
        }
        back.push(from);
        cost = next;
      }
      if (cost[start] === Infinity) continue;
      if (!best || cost[start] < best.cost) {
        const path = new Array(L);
        let b = start;
        for (let i = L; i >= 1; i--) { path[i % L] = b; b = back[i - 1][b]; }
        path[0] = start;
        best = { cost: cost[start], path };
      }
    }
    if (best) idx.forEach((n, i) => { shifts[n] = options[best.path[i]]; });
    return shifts;
  }
  /** Stufe in den Bereich -3…3 falten — ein Motiv, das dem Akkord folgt,
   *  soll nicht mit jeder höheren Stufe weiter nach oben wandern. */
  function foldDegree(deg) { const d = mod(deg, 7); return d > 3 ? d - 7 : d; }
  /** Grundton-Versatz so falten, dass hohe Tonarten nicht aus der Lage laufen. */
  const foldRoot = (pc) => (pc > 6 ? pc - 12 : pc);

  function noteNames() {
    const names = t('lab.noteNames').split(',');
    return names.length === 12 ? names : 'C,C♯,D,E♭,E,F,F♯,G,A♭,A,B♭,B'.split(',');
  }
  // Sprache der Tonnamen (spell/noteLabel), gesetzt in ChorGrooveLab.open.
  let labLang = 'de';

  /**
   * Stufenzahl eines Akkords: „V“, „vi“, „♭VII“, „iv“. `alter` 'secdom' → „V/vi“ (Dominante der
   * Zielstufe; `modeSteps` = Leiter des Modus, daraus der Zielakkord), `bassIndex` → Umkehrung
   * („V⁶“, „I⁶₄“, bei Septakkorden „⁶₅“, „⁴₃“).
   */
  function romanNumeral(steps, deg, sevenths, alter = null, bassIndex = 0, modeSteps = MAJOR) {
    const d = mod(deg, 7);
    const quality = chordQuality(steps, d);
    const base = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][d];
    const figure = bassIndex === 1 ? (sevenths ? '⁶₅' : '⁶') : bassIndex === 2 ? (sevenths ? '⁴₃' : '⁶₄') : '';
    if (alter === 'secdom') return `V${sevenths ? '7' : ''}${figure}/${romanNumeral(modeSteps, d + 3, false)}`;
    const flat = steps[d] < MAJOR[d] ? '♭' : '';
    const core = quality === 'min' || quality === 'dim' ? base.toLowerCase() : base;
    return flat + core + (quality === 'dim' ? '°' : quality === 'aug' ? '+' : '') + (sevenths ? '7' : '') + figure;
  }

  function chordName(keyRoot, steps, deg, sevenths, modeId = 'major', lang = labLang, alter = null, bassIndex = 0) {
    const d = mod(deg, 7);
    const quality = chordQuality(steps, d);
    // Geliehene Akkorde schreibt man wie in der Gegen-Tonart (in C: B♭, A♭, Fm).
    const spellMode = alter === 'borrow' ? (modeId === 'minor' || modeId === 'dorian' ? 'major' : 'minor') : modeId;
    const name = spell(keyRoot + steps[d], keyRoot, spellMode, lang);
    const slash = bassIndex ? `/${spell(keyRoot + degreeSemis(steps, d + 2 * bassIndex), keyRoot, spellMode, lang)}` : '';
    if (quality === 'dim') return name + (sevenths ? 'm7♭5' : '°') + slash;
    const seventh = sevenths ? (degreeSemis(steps, d + 6) - steps[d] === 11 ? 'maj7' : '7') : '';
    return name + (quality === 'min' ? 'm' : quality === 'aug' ? '+' : '') + seventh + slash;
  }

  // Farbe und Name je Stimme (Umfänge: VOICE_RANGES in harmony.js).
  const SATB_COLOR = { S: '#4ECDC4', A: '#6BCB77', T: '#FFD93D', B: '#A78BFA' }; // wie VOICE_COLOR in app.js
  const SATB_KEY = { S: 'lab.voiceS', A: 'lab.voiceA', T: 'lab.voiceT', B: 'lab.voiceB' };

  /* ------------------------------------------------------------------------
     SONSTIGE AUSWAHLLISTEN
     ------------------------------------------------------------------------ */

  // Arpeggiator-Muster (siehe _arpSequence). Stufen-Abstände in der
  // Tonleiter: 0 = der Ton selbst, 2 = Terz, 4 = Quinte, 6 = Septime,
  // 7 = Oktave. Manuell wird jede gewählte Taste so erweitert; automatisch
  // gilt das Muster ab dem Grundton des gerade klingenden Akkords.
  const ARP_PATTERNS = [
    ['selection', 'lab.patSelection', [0]],
    ['thirds', 'lab.patThirds', [0, 2]],
    ['fifths', 'lab.patFifths', [0, 4]],
    ['octaves', 'lab.patOctaves', [0, 7]],
    ['triad', 'lab.patTriad', [0, 2, 4]],
    ['seventh', 'lab.patSeventh', [0, 2, 4, 6]],
  ];
  const ARP_AUTO_PATTERNS = [
    ['root', 'lab.autoRoot', [0]],
    ['rootFifth', 'lab.autoRootFifth', [0, 4]],
    ['rootOctave', 'lab.autoRootOctave', [0, 7]],
    ['triad', 'lab.autoTriad', [0, 2, 4]],
    ['seventh', 'lab.autoSeventh', [0, 2, 4, 6]],
  ];
  const ARP_MODES = [['up', 'lab.arpUp'], ['down', 'lab.arpDown'], ['updown', 'lab.arpUpDown'], ['order', 'lab.arpOrder'], ['random', 'lab.arpRandom']];
  // Tempo in Sechzehnteln; 3 und 6 sind punktierte Achtel bzw. Viertel —
  // die punktierte Achtel gegen den geraden Beat ist ein klassischer
  // Arp-Trick (die Töne verschieben sich jeden Schlag gegeneinander).
  const ARP_DIVISIONS = [[1, '1/16'], [2, '1/8'], [3, '1/8 ·'], [4, '1/4'], [6, '1/4 ·']];
  // Rhythmus: Längen je Schritt als Vielfache einer Einheit (siehe _arpTrigger).
  const ARP_RHYTHMS = [
    ['straight', 'lab.rhythmStraight', null],
    ['longShort', 'lab.rhythmLongShort', [1.5, .5]],
    ['shortLong', 'lab.rhythmShortLong', [.5, 1.5]],
    ['gallop', 'lab.rhythmGallop', [.5, .5, 1]],
  ];

  /**
   * Manueller Arp im Akkord: Taste auf den nächsten Akkordton runden (bei
   * Gleichstand nach unten), dann die Muster-Abstände auf der Leiter der
   * Akkordtöne: je 2 Stufen = nächster Akkordton, 7 = Oktave. E + Dreiklang
   * über F-Dur ergibt f–a–c statt e–g–h. `h`: Harmonie wie _harmonyAt.
   */
  function chordArpNotes(midi, h, offsets) {
    const rootPc = mod(h.keyRoot + h.steps[mod(h.deg, 7)], 12);
    const rel = (j) => degreeSemis(h.steps, h.deg + j) - degreeSemis(h.steps, h.deg);
    const ladder = (h.sevenths ? [0, 2, 4, 6] : [0, 2, 4]).map(rel);
    let best = null;
    for (let base = midi - 24; base <= midi + 12; base++) {
      if (mod(base, 12) !== rootPc) continue;
      ladder.forEach((semis, i) => {
        const cand = base + semis;
        const dist = Math.abs(cand - midi);
        if (!best || dist < best.dist || (dist === best.dist && cand < best.midi)) best = { midi: cand, i, base, dist };
      });
    }
    const n = ladder.length;
    return offsets.map((o) => {
      if (o === 7) return best.midi + 12;
      const k = best.i + o / 2;
      return best.base + ladder[mod(k, n)] + 12 * Math.floor(k / n);
    });
  }

  /** Längen (in 16teln) einer Arp-Rhythmuszelle beim Tempo `division`. */
  const arpRhythmLengths = (cells, division) => cells.map((c) => c * 2 * division);
  // Manueller Arp: Muster in der Tonart (wie bisher) oder im Akkord — dann
  // rundet jede Taste auf den nächsten Akkordton, und Terzen sind Akkordtöne.
  const ARP_REFS = [['key', 'lab.arpRefKey'], ['chord', 'lab.arpRefChord']];

  // Filter-Kategorien; 'all' (kein Filter) hat keine eigene Bubble, sondern ein X.
  const BEAT_CATS = ['calm', 'dance', 'funky', 'breaks'];
  const MELODY_CATS = ['calm', 'dance', 'funky'];
  // Eigene Melodien bekommen eine eigene Filter-Kategorie (nur sichtbar, wenn es welche gibt).
  const OWN_CAT = 'own';
  const PRESET_CATS = ['pad', 'keys', 'lead'];
  const CAT_KEY = { calm: 'lab.catCalm', dance: 'lab.catDance', funky: 'lab.catFunky', breaks: 'lab.catBreaks',
                    pad: 'lab.presetPad', keys: 'lab.presetKeys', lead: 'lab.presetLead', own: 'lab.catOwn',
                    pop: 'lab.catPop', classic: 'lab.catClassic', jazz: 'lab.catJazz', modal: 'lab.catModal' };

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

  /* ------------------------------------------------------------------------
     CHOR-AUFGABEN (Didaktik Paket 8). Eine Aufgabe setzt beim Wählen einen
     Teil des Zustands (ein Undo-Schritt) und bestimmt die Anzeige „Jetzt“.
     own: eigene Stimme auf focus/mute, übrige on; satb: feste Zuordnung;
     groove: Name aus DRUM_PATTERNS (null = Drums und Bass stumm); melody:
     Name aus MELODIES; display: siehe _choirNow. Texte: lab.task.<id>.*
     ------------------------------------------------------------------------ */
  const CHOIR_TASKS = [
    { id: 'meineStimme', set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'cadence', bpm: 72 }, own: 'focus', display: 'ownNote', groove: 'Minimal Click' },
    { id: 'minusEins', set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'cadence', bpm: 72 }, own: 'mute', display: 'ownNote', groove: 'Minimal Click' },
    { id: 'bass', set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'pop', bpm: 80 }, satb: { B: 'focus' }, display: 'root', groove: 'Backbeat Open' },
    { id: 'terzen', set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'pop', bpm: 76 }, display: 'third', groove: 'Backbeat Open' },
    { id: 'liegeton', set: { chordsOn: false, droneOn: true, droneFifth: true, melodyOn: false, arpOn: false, progId: 'drone', bpm: 60 }, display: 'scale', groove: null },
    { id: 'pentatonik', set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'pop', modeId: 'major', bpm: 88 }, display: 'pentatonic', groove: 'Backbeat Open' },
    { id: 'echo', set: { chordsOn: true, melodyOn: true, arpOn: false, progId: 'cadence', bpm: 84 }, melody: 'Call & Response', melodyAltBars: true, display: 'echo', groove: 'Minimal Click' },
    { id: 'zweiVier', set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'blues', bpm: 92 }, display: 'beats24', groove: 'Gospel Shuffle' },
    { id: 'swing', set: { chordsOn: true, melodyOn: false, arpOn: false, progId: 'twoFiveOne', bpm: 120 }, display: 'swingSyllables', groove: 'Swing Ride' },
    { id: 'beatbox', set: { chordsOn: false, melodyOn: false, arpOn: false, bpm: 84 }, display: 'vocalPerc', groove: 'Vocal Perc Basic', fadeDrums: true },
  ];
  const CHOIR_PARTS = ['S', 'A', 'T', 'B'];
  const patternIndexByName = (name) => DRUM_PATTERNS.findIndex((p) => p.name === name);
  const melodyIndexByName = (name) => MELODIES.findIndex((m) => m.name === name);

  /* Kuratierte Auswahl (Paket 7e): in den Auswahllisten stehen zuerst die Vorlagen mit
     klarer Rolle für einen Popchor, in dieser Reihenfolge; alles andere liegt eingeklappt
     unter „Weitere“. Nichts wird gelöscht oder umsortiert — gespeichert wird weiter der
     Index, Workshop, Chor-Aufgaben und de:construct finden ihre Vorlagen per Name. Die
     Listen nennen Namen (lesbar) und werden mit *IndexByName aufgelöst. */
  const MELODY_ORDER = [
    'Pop Hook', 'Offbeat Chant', 'Anthem Oh', 'Ballad Line', 'Gospel Call',
    'Synco Verse', 'Call & Response', 'Question & Answer', 'Guide Tones',
    // andere Taktarten (der Picker zeigt ohnehin nur die passende)
    'Waltz Line', 'Turning Waltz', 'Lullaby', 'Jig Hop',
  ];
  const BEAT_ORDER = [
    'Pop Stomp', 'Pop Ballad', 'Backbeat Open', 'Gospel Shuffle', 'Motown Stomp',
    'Halftime Pop', 'Disco Clap', 'Boom Bap', 'Swing Soul', 'Swing Ride',
    'Vocal Perc Basic', 'Minimal Click',
    // andere Taktarten
    'Waltz Step', 'Jazz Waltz', '6/8 Ballad', 'Folk Jig',
  ];
  const PRESET_ORDER = [
    // keys
    'Klavier', 'Tape Keys', 'Vintage Organ', 'E-Gitarre', 'Neon Pluck', 'Crystal Drops',
    // pad
    'Chor Ooh', 'Streicher', 'Moon Pad', 'Breath Glass',
    // lead
    'Brass Stab', 'Analog Lead', 'Bright Saw',
  ];
  /** Indizes einer Namensliste (unbekannte Namen fallen weg; der Selbsttest meldet sie). */
  const orderIndexes = (order, byName) => order.map(byName).filter((i) => i >= 0);
  /** Erster Eintrag einer Taktart in der sichtbaren Reihenfolge (sonst der erste überhaupt). */
  const firstPatternOfMeter = (meter) => orderIndexes(BEAT_ORDER, patternIndexByName).find((i) => DRUM_PATTERNS[i].meter === meter)
    ?? DRUM_PATTERNS.findIndex((p) => p.meter === meter);
  const firstMelodyOfMeter = (meter) => orderIndexes(MELODY_ORDER, melodyIndexByName).find((i) => MELODIES[i].meter === meter)
    ?? Math.max(0, MELODIES.findIndex((m) => m.meter === meter));

  /** Zustandsfelder einer Aufgabe/Einheit übernehmen. progId setzt eine
   *  bearbeitete Folge zurück und nimmt ggf. den passenden Modus mit
   *  (außer `set` nennt selbst einen Modus). */
  function applyTaskSet(s, set) {
    for (const [key, value] of Object.entries(set)) {
      if (key === 'progId') {
        s.progId = value;
        s.progDegrees = null; s.progSevenths = false; s.progDominant = false; s.progDom7 = false; s.progName = null; s.progOwnId = null; s.progAlter = null; s.progBass = null;
        const prog = PROGRESSIONS.find((p) => p.id === value);
        if (!set.modeId) s.modeId = modeForProg(prog, s.modeId);
      } else if (key === 'bpm') {
        s.bpm = value;
      } else s[key] = value;
    }
  }

  /** Neuer Zustand nach dem Wählen einer Aufgabe (reine Funktion; der
   *  Liegeton startet erst in der View, er braucht eine Nutzergeste). */
  function choirTaskState(state, task, part) {
    const s = JSON.parse(JSON.stringify(state));
    applyTaskSet(s, task.set);
    if (task.groove) {
      s.patternIndex = patternIndexByName(task.groove);
      const pattern = DRUM_PATTERNS[s.patternIndex];
      s.beat = beatFromPattern(pattern);
      s.percSound = percOf(pattern);
      s.beatEdited = false;
      s.swing = typeof pattern.swing === 'number' ? pattern.swing : 0;
      s.mute.drums = false; s.mute.bass = false;
    } else {
      s.mute.drums = true; s.mute.bass = true;
    }
    s.eighths = s.bpm * eighthsPerBeat(DRUM_PATTERNS[s.patternIndex].meter);
    if (task.melody) {
      s.melodyIndex = melodyIndexByName(task.melody);
      s.melodyBars = null; s.melodyMeter = null; s.melodyName = null; s.melodyOwnId = null; s.melodyRef = 'chord';
    }
    s.melodyAltBars = !!task.melodyAltBars;
    pinLegacySound(s);
    for (const v of CHOIR_PARTS) s.satb[v] = 'on';
    if (task.own && CHOIR_PARTS.includes(part)) s.satb[part] = task.own;
    if (task.satb) Object.assign(s.satb, task.satb);
    s.choirTask = task.id;
    return s;
  }

  /** Melodietöne, die im Schritt `g` beginnen. `altBars`: nur in
   *  ungeraden Takten (1, 3, …), in geraden (2, 4, …) Stille — Echo. */
  function melodyNotesAt(g, bars, barSteps, altBars = false) {
    const barIndex = Math.floor(g / barSteps);
    if (altBars && barIndex % 2 === 1) return [];
    const notes = bars[barIndex % bars.length];
    const step = g % barSteps;
    return notes.filter(([at]) => Math.floor(at) === step);
  }

  /** Zielton-Tonhöhenklassen eines Akkords für die Anzeige „Jetzt“:
   *  Grundton oder Terz (in Moll mit Dur-Dominante: Leitton). */
  function choirTargetPc(keyRoot, steps, deg, which) {
    const [root, third] = chordPitchClasses(keyRoot, steps, deg, false);
    return which === 'third' ? third : root;
  }

  /* ------------------------------------------------------------------------
     WORKSHOP (siehe ARBEITSANWEISUNG-WORKSHOP.md). Eine Einheit setzt beim
     Wählen einen reproduzierbaren Ausgangszustand (lessonState) und prüft
     danach ihre Teilziele der Reihe nach. Texte: lab.lesson.<id>.*
     IDs nie ändern — gespeichert wird der Fortschritt je ID.
     ------------------------------------------------------------------------ */
  const LESSON_TIERS = ['tour', 'deep', 'challenge'];
  const LESSON_AREAS = ['rhythm', 'harmony', 'melody', 'sound', 'mix'];
  const TIER_KEY = { tour: 'lab.ws.tierTour', deep: 'lab.ws.tierDeep', challenge: 'lab.ws.tierChallenge' };
  const AREA_KEY = { rhythm: 'lab.ws.areaRhythm', harmony: 'lab.ws.areaHarmony', melody: 'lab.ws.areaMelody',
                     sound: 'lab.ws.areaSound', mix: 'lab.ws.areaMix' };

  // Kleine Helfer für die Zielprüfungen (rein, exportieren).
  const stepsOn = (s, track) => Object.keys(s.beat[track] || {}).map(Number).sort((a, b) => a - b);
  const sameSteps = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const hitAt = (s, track, step) => s.beat[track]?.[step] !== undefined;
  const progOf = (s) => PROGRESSIONS.find((p) => p.id === s.progId) || PROGRESSIONS[0];
  const progDegreesOf = (s) => s.progDegrees || progOf(s).degrees;
  const progSeventhsOf = (s) => (s.progDegrees ? !!s.progSevenths : !!progOf(s).sevenths);
  const melodyBarsOf = (s) => s.melodyBars || MELODIES[s.melodyIndex].bars;
  const lastPlayed = (ctx, n) => ctx.played.slice(-n).map((p) => p.deg);
  const hasRun = (list, run) => list.some((_, i) => run.every((d, k) => list[i + k] === d));

  const WORKSHOP_LESSONS = [
    // --- Rundgang: alles einmal, je Einheit 2–3 Minuten ---
    { id: 'puls', tier: 'tour', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
      set: { bpm: 90 }, trackOn: { snare: false, clap: false, hat: false, open: false, bass: false },
      focus: ['bpm'],
      checks: [(s) => s.bpm >= 58 && s.bpm <= 62, (s) => s.bpm >= 118 && s.bpm <= 122],
      solution: [(s) => { s.bpm = 60; s.eighths = 120; }, (s) => { s.bpm = 120; s.eighths = 240; }] },

    { id: 'backbeat', tier: 'tour', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
      set: { bpm: 100 }, beat: { snare: [] }, trackOn: { hat: false, open: false, clap: false, bass: false },
      focus: ['track:snare'], mark: { snare: { to: [4, 12] } },
      checks: [(s) => sameSteps(stepsOn(s, 'snare'), [4, 12]) && s.beat.snare[4] === 1 && s.beat.snare[12] === 1],
      solution: [(s) => { s.beat.snare = { 4: 1, 12: 1 }; }] },

    { id: 'offbeat', tier: 'tour', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
      set: { bpm: 120 }, trackOn: { bass: false },
      focus: ['track:hat'], mark: { hat: { from: [0, 4, 8, 12] } },
      checks: [(s) => sameSteps(stepsOn(s, 'hat'), [2, 6, 10, 14])],
      solution: [(s) => { s.beat.hat = { 2: 1, 6: 1, 10: 1, 14: 1 }; }] },

    { id: 'synkope', tier: 'tour', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
      set: { bpm: 100 }, trackOn: { bass: false },
      focus: ['track:kick'], mark: { kick: { from: [8], to: [10] } },
      checks: [(s) => sameSteps(stepsOn(s, 'kick'), [0, 4, 10, 12])],
      solution: [(s) => { delete s.beat.kick[8]; s.beat.kick[10] = 1; }] },

    { id: 'bass', tier: 'tour', area: 'harmony', tab: 'beat', groove: 'Backbeat Open',
      set: { bpm: 96, progId: 'pop', chordsOn: false },
      focus: ['chordsOn', 'track:bass'],
      checks: [(s) => s.chordsOn, (s) => !s.trackOn.bass, (s) => s.trackOn.bass],
      solution: [(s) => { s.chordsOn = true; }, (s) => { s.trackOn.bass = false; }, (s) => { s.trackOn.bass = true; }] },

    // Bewusst progId 'drone' (nur der Tonika-Akkord): bei einer ganzen Folge
    // änderten sich beim Moduswechsel mehr Töne als die Terz.
    { id: 'durMoll', tier: 'tour', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
      set: { bpm: 84, progId: 'drone', modeId: 'major', chordsOn: true }, trackOn: { bass: false },
      focus: ['mode'],
      checks: [(s) => s.modeId === 'minor'],
      solution: [(s) => { s.modeId = 'minor'; }] },

    // keysLayout wird in lessonState eigentlich behalten — hier bewusst
    // gesetzt und nach der Einheit nicht zurückgestellt.
    { id: 'melodie', tier: 'tour', area: 'melody', tab: 'keys', groove: 'Backbeat Open',
      set: { bpm: 88, progId: 'drone', modeId: 'major', chordsOn: true, keysLayout: 'scale' },
      focus: ['pads'],
      checks: [(s, ctx) => [0, 2, 4].every((d) => lastPlayed(ctx, 6).includes(d)),
               (s, ctx) => lastPlayed(ctx, 1).some((d) => d === 1 || d === 3 || d === 5)],
      solution: [(s, ctx) => { ctx.played.push({ deg: 0 }, { deg: 2 }, { deg: 4 }); },
                 (s, ctx) => { ctx.played.push({ deg: 3 }); }] },

    { id: 'klang', tier: 'tour', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
      preset: 'Tape Keys', sound: { wave: 'sine', cutoff: 12000, filterEnvAmount: 0 },
      set: { bpm: 90 },
      focus: ['wave', 'sound:cutoff'],
      checks: [(s) => s.sound.wave === 'sawtooth', (s) => s.sound.cutoff <= 800],
      solution: [(s) => { s.sound.wave = 'sawtooth'; }, (s) => { s.sound.cutoff = 700; }] },

    { id: 'ersterTrack', tier: 'tour', area: 'mix', tab: 'beat', groove: 'House Bounce', melody: 'Hook Line',
      set: { bpm: 122, progId: 'pop', chordsOn: true },
      focus: ['track:kick', 'track:hat', 'picker:prog', 'picker:preset'],
      checks: [(s) => s.beatEdited,
               (s, ctx) => s.progId !== ctx.start.progId || !!s.progDegrees || s.modeId !== ctx.start.modeId || s.keyRoot !== ctx.start.keyRoot,
               (s) => s.sound.custom || s.sound.presetIndex !== presetIndexByName('Velvet Choir')],
      solution: [(s) => { s.beat.hat[0] = 1; s.beatEdited = true; },
                 (s) => { s.progId = 'sad'; },
                 (s) => { s.sound = soundFromPreset(presetIndexByName('Neon Pluck')); }] },

    // --- Vertiefung Rhythmus ---
    { id: 'raster', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
      set: { bpm: 90 }, beat: { clap: [] }, trackOn: { snare: false, bass: false },
      focus: ['track:clap'], mark: { clap: { to: [14, 5] } },
      checks: [(s) => hitAt(s, 'clap', 14), (s) => hitAt(s, 'clap', 5)],
      solution: [(s) => { s.beat.clap[14] = 1; }, (s) => { s.beat.clap[5] = 1; }] },

    { id: 'halftime', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
      set: { bpm: 140 }, trackOn: { bass: false },
      focus: ['track:kick', 'track:snare'], mark: { snare: { from: [4, 12], to: [8] }, kick: { from: [8] } },
      checks: [(s) => sameSteps(stepsOn(s, 'snare'), [8]) && !hitAt(s, 'kick', 8)],
      solution: [(s) => { s.beat.snare = { 8: 1 }; delete s.beat.kick[8]; }] },

    // Nur Loops mit swingUnit 8 swingen die Achtel — deshalb Swing Soul.
    { id: 'swing', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Swing Soul',
      set: { bpm: 96, swing: 0 },
      focus: ['swing'],
      checks: [(s) => s.swing >= .6],
      solution: [(s) => { s.swing = .67; }] },

    { id: 'houseHipHop', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'House Bounce',
      set: { bpm: 124 }, trackOn: { bass: false },
      focus: ['bpm', 'track:kick', 'track:hat', 'track:open'],
      checks: [(s) => s.bpm >= 85 && s.bpm <= 95,
               (s) => sameSteps(stepsOn(s, 'kick'), [0, 10]),
               (s) => sameSteps(stepsOn(s, 'hat'), [0, 2, 4, 6, 8, 10, 12, 14]),
               (s) => stepsOn(s, 'open').length === 0],
      solution: [(s) => { s.bpm = 90; s.eighths = 180; },
                 (s) => { s.beat.kick = { 0: 1, 10: 1 }; },
                 (s) => { s.beat.hat = { 0: 1, 2: 1, 4: 1, 6: 1, 8: 1, 10: 1, 12: 1, 14: 1 }; },
                 (s) => { s.beat.open = {}; }] },

    { id: 'tresillo', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Pulse Basic',
      set: { bpm: 100 }, beat: { kick: [], snare: [] }, trackOn: { bass: false },
      focus: ['track:kick'], mark: { kick: { to: [0, 3, 6, 8, 11, 14] } },
      checks: [(s) => sameSteps(stepsOn(s, 'kick').filter((x) => x < 8), [0, 3, 6]),
               (s) => sameSteps(stepsOn(s, 'kick'), [0, 3, 6, 8, 11, 14])],
      solution: [(s) => { s.beat.kick = { 0: 1, 3: 1, 6: 1 }; },
                 (s) => { Object.assign(s.beat.kick, { 8: 1, 11: 1, 14: 1 }); }] },

    { id: 'ghost', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Backbeat Open',
      set: { bpm: 92 }, trackOn: { bass: false },
      focus: ['track:snare'], mark: { snare: { to: [7, 14] } },
      checks: [(s) => s.beat.snare[7] !== undefined && s.beat.snare[7] < .6,
               (s) => s.beat.snare[14] !== undefined && s.beat.snare[14] < .6],
      solution: [(s) => { s.beat.snare[7] = .45; }, (s) => { s.beat.snare[14] = .45; }] },

    // Lösung wie der Loop-Wechsel im Picker: Achtel bleiben gleich schnell
    // (_convertTempo: 120 Achtel → ♩. = 40), Melodie in passender Taktart.
    { id: 'dreiSechs', tier: 'deep', area: 'rhythm', tab: 'beat', groove: 'Waltz Step',
      set: { bpm: 60 },
      focus: ['picker:beat'],
      checks: [(s) => DRUM_PATTERNS[s.patternIndex].meter === '6/8'],
      solution: [(s) => {
        s.patternIndex = patternIndexByName('6/8 Ballad');
        s.beat = beatFromPattern(DRUM_PATTERNS[s.patternIndex]);
        s.beatEdited = false;
        s.bpm = clamp(Math.round(s.eighths / eighthsPerBeat('6/8')), BPM_MIN, BPM_MAX);
        s.melodyIndex = Math.max(0, MELODIES.findIndex((m) => m.meter === '6/8'));
      }] },

    // --- Vertiefung Harmonie ---
    { id: 'leitton', tier: 'deep', area: 'harmony', tab: 'keys', groove: null,
      set: { bpm: 60, progId: 'drone', modeId: 'major', droneOn: true, droneFifth: true, keysLayout: 'scale' },
      focus: ['pads'],
      checks: [(s, ctx) => hasRun(lastPlayed(ctx, 8), [6, 0])],
      solution: [(s, ctx) => { ctx.played.push({ deg: 6 }, { deg: 0 }); }] },

    { id: 'dreiklang', tier: 'deep', area: 'harmony', tab: 'harmony', groove: null,
      set: { bpm: 60, progId: 'drone', modeId: 'major', chordsOn: true },
      focus: ['satb'],
      checks: [(s) => CHOIR_PARTS.filter((v) => s.satb[v] === 'mute').length === 2],
      solution: [(s) => { s.satb.A = 'mute'; s.satb.T = 'mute'; }] },

    // Lösung wie der Editor: _progBegin übernimmt die Vorlage (cadence ist
    // dominant), prog-deg tauscht den letzten Akkord.
    { id: 'halbschluss', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
      set: { bpm: 84, progId: 'cadence', modeId: 'major', chordsOn: true },
      focus: ['progEditor'],
      checks: [(s) => progDegreesOf(s).at(-1) === 4],
      solution: [(s) => { s.progDegrees = [0, 3, 4, 4]; s.progSevenths = false; s.progDominant = true; s.progDom7 = false; }] },

    { id: 'popSad', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
      set: { bpm: 90, progId: 'pop', modeId: 'major', chordsOn: true },
      focus: ['picker:prog'],
      checks: [(s) => s.progId === 'sad' && !s.progDegrees],
      solution: [(s) => { s.progId = 'sad'; }] },

    { id: 'harmRhythmus', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
      set: { bpm: 100, progId: 'pop', chordsOn: true },
      focus: ['chordBars'],
      checks: [(s) => s.chordBars === 2],
      solution: [(s) => { s.chordBars = 2; }] },

    // Lösung wie der Septimen-Schalter: aus → bearbeitete Kopie der Vorlage
    // ohne Septimen; wieder an → gleich der Vorlage, _progCommit räumt auf.
    { id: 'bluesSept', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Gospel Shuffle',
      set: { bpm: 92, progId: 'blues', chordsOn: true },
      focus: ['progSevenths'],
      checks: [(s) => !progSeventhsOf(s), (s) => progSeventhsOf(s)],
      solution: [(s) => { s.progDegrees = [...progOf(s).degrees]; s.progSevenths = false; s.progDominant = true; s.progDom7 = true; },
                 (s) => { s.progDegrees = null; s.progSevenths = false; s.progDominant = false; s.progDom7 = false; s.progAlter = null; s.progBass = null; }] },

    { id: 'modi', tier: 'deep', area: 'harmony', tab: 'harmony', groove: 'Backbeat Open',
      set: { bpm: 96, progId: 'modal', modeId: 'minor', chordsOn: true },
      focus: ['mode'],
      checks: [(s) => s.modeId === 'dorian', (s) => s.modeId === 'mixolydian'],
      solution: [(s) => { s.modeId = 'dorian'; }, (s) => { s.modeId = 'mixolydian'; }] },

    { id: 'stimmfuehrung', tier: 'deep', area: 'harmony', tab: 'harmony', groove: null,
      set: { bpm: 66, progId: 'cadence', modeId: 'major', chordsOn: true, chordBars: 2 },
      focus: ['satb'],
      checks: [(s) => CHOIR_PARTS.some((v) => s.satb[v] === 'focus')],
      solution: [(s) => { s.satb.A = 'focus'; }] },

    // --- Vertiefung Melodie ---
    { id: 'stufen', tier: 'deep', area: 'melody', tab: 'keys', groove: 'Minimal Click',
      set: { bpm: 80, progId: 'drone', modeId: 'major', chordsOn: true, keysLayout: 'scale' },
      focus: ['pads'],
      checks: [(s, ctx) => hasRun(lastPlayed(ctx, 10), [0, 1, 2, 3, 4])],
      solution: [(s, ctx) => { [0, 1, 2, 3, 4].forEach((deg) => ctx.played.push({ deg })); }] },

    // Lösungen wie der Editor (_melBegin kopiert die Vorlage, _melPlace setzt
    // einstimmig: kürzt den vorigen Ton, verdrängt, was im neuen Ton beginnt).
    // Long Tones, Takt 1: [[0, 4, 8], [8, 2, 8]] (so auf 1, mi auf 3).
    { id: 'reibung', tier: 'deep', area: 'melody', tab: 'melody', groove: 'Minimal Click', melody: 'Long Tones',
      set: { bpm: 76, progId: 'drone', modeId: 'major', chordsOn: true },
      focus: ['melEditor'],
      checks: [(s) => melodyBarsOf(s)[0].some(([at, deg]) => at === 0 && deg === 3)],
      solution: [(s) => {
        s.melodyBars = melodyBarsOf(s).map((bar) => bar.map((n) => [...n]));
        s.melodyBars[0] = [[0, 3, 8], [8, 2, 8]];
        s.melodyMeter = '4/4'; s.melodyRef = 'chord';
      }] },

    { id: 'pentatonik', tier: 'deep', area: 'melody', tab: 'keys', groove: 'Backbeat Open',
      set: { bpm: 92, progId: 'pop', modeId: 'major', chordsOn: true, keysLayout: 'scale' },
      focus: ['pads'],
      checks: [(s, ctx) => ctx.played.length >= 8 && lastPlayed(ctx, 8).every((d) => [0, 1, 2, 4, 5].includes(d))],
      solution: [(s, ctx) => { [0, 2, 4, 5, 4, 2, 1, 0].forEach((deg) => ctx.played.push({ deg })); }] },

    // Ton auf Feld 7 setzen und lang ziehen: der Ton auf Feld 9 wird
    // verdrängt, der erste auf sechs Sechzehntel gekürzt.
    { id: 'antizipation', tier: 'deep', area: 'melody', tab: 'melody', groove: 'Backbeat Open', melody: 'Long Tones',
      set: { bpm: 88, progId: 'drone', modeId: 'major', chordsOn: true },
      focus: ['melEditor'],
      checks: [(s) => { const bar = melodyBarsOf(s)[0]; return bar.some(([at, deg]) => at === 6 && deg === 2) && !bar.some(([at]) => at === 8); }],
      solution: [(s) => {
        s.melodyBars = melodyBarsOf(s).map((bar) => bar.map((n) => [...n]));
        s.melodyBars[0] = [[0, 4, 6], [6, 2, 8]];
        s.melodyMeter = '4/4'; s.melodyRef = 'chord';
      }] },

    { id: 'echo', tier: 'deep', area: 'melody', tab: 'melody', groove: 'Minimal Click', melody: 'Call & Response',
      set: { bpm: 84, progId: 'cadence', chordsOn: true },
      focus: ['melodyAltBars'],
      checks: [(s) => s.melodyAltBars],
      solution: [(s) => { s.melodyAltBars = true; }] },

    { id: 'arpeggio', tier: 'deep', area: 'melody', tab: 'keys', groove: 'Pulse Basic',
      set: { bpm: 110, progId: 'pop', chordsOn: false },
      focus: ['arp'],
      checks: [(s) => s.arpOn && s.arpAuto, (s) => s.arpDivision === 1, (s) => s.arpMode === 'down'],
      solution: [(s) => { s.arpOn = true; s.arpAuto = true; }, (s) => { s.arpDivision = 1; }, (s) => { s.arpMode = 'down'; }] },

    // --- Vertiefung Klang ---
    { id: 'wellen', tier: 'deep', area: 'sound', tab: 'sound', groove: null, melody: 'Long Tones',
      preset: 'Tape Keys', sound: { wave: 'sine', cutoff: 12000, filterEnvAmount: 0 },
      set: { bpm: 80, progId: 'drone' },
      focus: ['wave'],
      checks: [(s) => s.sound.wave === 'triangle', (s) => s.sound.wave === 'square', (s) => s.sound.wave === 'sawtooth'],
      solution: [(s) => { s.sound.wave = 'triangle'; }, (s) => { s.sound.wave = 'square'; }, (s) => { s.sound.wave = 'sawtooth'; }] },

    { id: 'filter', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
      preset: 'Bright Saw', sound: { cutoff: 12000, filterEnvAmount: 0 },
      set: { bpm: 84, progId: 'pop' },
      focus: ['sound:cutoff'],
      checks: [(s) => s.sound.cutoff <= 600],
      solution: [(s) => { s.sound.cutoff = 500; }] },

    { id: 'resonanz', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
      preset: 'Bright Saw', sound: { cutoff: 800, resonance: 1, filterEnvAmount: 0 },
      set: { bpm: 84, progId: 'drone' },
      focus: ['sound:resonance', 'sound:cutoff'],
      checks: [(s) => s.sound.resonance >= 12, (s) => s.sound.cutoff >= 3000],
      solution: [(s) => { s.sound.resonance = 14; }, (s) => { s.sound.cutoff = 3500; }] },

    { id: 'huellkurve', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
      preset: 'Neon Pluck', set: { bpm: 80, progId: 'pop' },
      focus: ['sound:attack', 'sound:sustain', 'sound:release'],
      checks: [(s) => s.sound.attack >= .3, (s) => s.sound.sustain >= .6, (s) => s.sound.release >= 1],
      solution: [(s) => { s.sound.attack = .4; }, (s) => { s.sound.sustain = .7; }, (s) => { s.sound.release = 1.2; }] },

    { id: 'detune', tier: 'deep', area: 'sound', tab: 'sound', groove: null, melody: 'Long Tones',
      preset: 'Tape Keys', sound: { detune: 0, width: 0 },
      set: { bpm: 72, progId: 'drone' },
      focus: ['sound:detune', 'sound:width'],
      checks: [(s) => s.sound.detune >= 8 && s.sound.detune <= 14,
               (s) => s.sound.detune >= 25,
               (s) => s.sound.detune >= 6 && s.sound.detune <= 15 && s.sound.width >= .5],
      solution: [(s) => { s.sound.detune = 10; }, (s) => { s.sound.detune = 28; }, (s) => { s.sound.detune = 10; s.sound.width = .6; }] },

    { id: 'lfo', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Half-Time Drop', melody: 'Long Tones',
      preset: 'Wobble', sound: { lfoDepth: 0, lfoSync: 0, lfoRate: 0 },
      set: { bpm: 140, progId: 'drone', modeId: 'minor' },
      focus: ['sound:lfoDepth', 'sound:lfoSync'],
      checks: [(s) => s.sound.lfoDepth >= 1000, (s) => s.sound.lfoSync === 2, (s) => s.sound.lfoSync === 1],
      solution: [(s) => { s.sound.lfoDepth = 1500; }, (s) => { s.sound.lfoSync = 2; }, (s) => { s.sound.lfoSync = 1; }] },

    { id: 'vibrato', tier: 'deep', area: 'sound', tab: 'sound', groove: null, melody: 'Long Tones',
      preset: 'Soft Brass', sound: { vibratoDepth: 0, vibratoDelay: 0 },
      set: { bpm: 66, progId: 'drone' },
      focus: ['sound:vibratoDepth', 'sound:vibratoDelay'],
      checks: [(s) => s.sound.vibratoDepth >= 10, (s) => s.sound.vibratoDelay >= .4],
      solution: [(s) => { s.sound.vibratoDepth = 12; }, (s) => { s.sound.vibratoDelay = .5; }] },

    { id: 'kick', tier: 'deep', area: 'sound', tab: 'beat', groove: 'Pulse Basic',
      set: { bpm: 90 }, trackOn: { snare: false, clap: false, hat: false, open: false, bass: false },
      focus: ['kit'],
      checks: [(s) => s.kit.kickEnd >= 140, (s) => s.kit.kickEnd <= 50 && s.kit.kickDecay >= .6],
      solution: [(s) => { s.kit.kickEnd = 150; }, (s) => { s.kit.kickEnd = 40; s.kit.kickDecay = .8; }] },

    { id: 'glide', tier: 'deep', area: 'sound', tab: 'sound', groove: 'Minimal Click', melody: 'Long Tones',
      preset: 'Analog Lead', sound: { glide: 0 },
      set: { bpm: 80, progId: 'pop' },
      focus: ['sound:glide'],
      checks: [(s) => s.sound.glide >= .25],
      solution: [(s) => { s.sound.glide = .3; }] },

    // --- Vertiefung Mix ---
    { id: 'pump', tier: 'deep', area: 'mix', tab: 'beat', groove: 'Deep House', melody: 'Long Tones',
      set: { bpm: 122, progId: 'pop', chordsOn: true, pump: 0 },
      focus: ['pump'],
      checks: [(s) => s.pump >= .5],
      solution: [(s) => { s.pump = .6; }] },

    { id: 'raum', tier: 'deep', area: 'mix', tab: 'mixer', groove: 'Minimal Click', melody: 'Hook Line',
      preset: 'Neon Pluck', sound: { echoWet: 0 }, fx: { echoOn: false, echoDiv: 2 },
      set: { bpm: 100, progId: 'pop' },
      focus: ['fx:echo', 'sound:echoWet'],
      checks: [(s) => s.fx.echoOn && s.fx.echoDiv === 3, (s) => s.sound.echoWet >= .3],
      solution: [(s) => { s.fx.echoOn = true; s.fx.echoDiv = 3; }, (s) => { s.sound.echoWet = .35; }] },

    // Lösung in der Form von _autoFinish/sanitizeAutomation: eine Spur je
    // Parameter mit genau `steps` Werten (hier vier Takte, 64 Sechzehntel).
    { id: 'buildup', tier: 'deep', area: 'mix', tab: 'sound', groove: 'House Bounce', melody: 'Hook Line',
      preset: 'Bright Saw', set: { bpm: 124, progId: 'pop', chordsOn: true },
      focus: ['sound:cutoff', 'automation'],
      checks: [(s) => { const lane = s.automation?.lanes?.cutoff; return Array.isArray(lane) && Math.max(...lane) - Math.min(...lane) >= 3000; }],
      solution: [(s) => { s.automation = { on: true, steps: 64, lanes: { cutoff: Array.from({ length: 64 }, (_, i) => 300 + i * 100) }, bars: 4, offset: 0 }; }] },

    { id: 'arrangement', tier: 'deep', area: 'mix', tab: 'mixer', groove: 'House Bounce', melody: 'Hook Line',
      set: { bpm: 124, progId: 'pop', chordsOn: true },
      focus: ['mute:drums', 'mute:bass'],
      checks: [(s) => s.mute.drums && s.mute.bass, (s) => !s.mute.drums && !s.mute.bass],
      solution: [(s) => { s.mute.drums = true; s.mute.bass = true; }, (s) => { s.mute.drums = false; s.mute.bass = false; }] },

    // --- Challenges: Start mit „Los“, Runden siehe _wsCh… (kind) ---
    { id: 'hoerDetektiv', tier: 'challenge', area: 'rhythm', tab: 'beat', kind: 'detective', rounds: 5,
      focus: ['track:kick', 'track:snare', 'track:hat'], checks: [(s, ctx) => ctx.round >= 5], solution: [(s, ctx) => { ctx.round = 5; }] },
    { id: 'nachbauen', tier: 'challenge', area: 'rhythm', tab: 'beat', kind: 'rebuild', rounds: 3,
      focus: ['track:kick', 'track:snare', 'track:hat'], checks: [(s, ctx) => ctx.round >= 3], solution: [(s, ctx) => { ctx.round = 3; }] },
    // Zum Hören braucht das Rätsel eine Melodie (sonst klingt der Synth nicht).
    { id: 'klangRaetsel', tier: 'challenge', area: 'sound', tab: 'sound', kind: 'soundMatch', rounds: 3,
      groove: 'Minimal Click', melody: 'Hook Line', set: { bpm: 96, progId: 'pop' },
      focus: ['wave', 'sound:cutoff', 'sound:attack', 'sound:release'], checks: [(s, ctx) => ctx.round >= 3], solution: [(s, ctx) => { ctx.round = 3; }] },
    // Pulse Basic swingt keine Achtel (swingUnit fehlt) — geprüft wird der
    // Regler; der Text verweist für echten Shuffle auf „Gospel Shuffle“.
    { id: 'gospelRemix', tier: 'challenge', area: 'mix', tab: 'beat', groove: 'Pulse Basic',
      set: { bpm: 120 }, focus: ['bpm', 'swing', 'track:clap', 'picker:prog'],
      checks: [(s) => s.bpm >= 80 && s.bpm <= 100,
               (s) => sameSteps(stepsOn(s, 'clap'), [4, 12]),
               (s) => s.swing >= .5,
               (s) => s.chordsOn && s.progId === 'blues'],
      solution: [(s) => { s.bpm = 90; s.eighths = 180; }, (s) => { s.beat.clap = { 4: 1, 12: 1 }; },
                 (s) => { s.swing = .6; }, (s) => { s.chordsOn = true; s.progId = 'blues'; s.modeId = 'major'; }] },
  ];

  /** Fokus-Schlüssel, die die Ansicht kennt (siehe _wsFocusEls). */
  const WS_FOCUS_SIMPLE = ['bpm', 'swing', 'pump', 'picker:beat', 'picker:prog', 'picker:melody', 'picker:preset',
    'mode', 'key', 'chordsOn', 'chordBars', 'satb', 'drone', 'progEditor', 'progSevenths', 'melEditor', 'melodyAltBars',
    'pads', 'arp', 'wave', 'filterType', 'fx:echo', 'automation', 'kit'];
  function focusKeyKnown(key) {
    if (WS_FOCUS_SIMPLE.includes(key)) return true;
    const [kind, arg] = String(key).split(':');
    if (kind === 'track') return TRACK_IDS.includes(arg);
    if (kind === 'sound') return hasOwn(SOUND_RANGES, arg);
    if (kind === 'mute' || kind === 'mix') return BUSES.includes(arg);
    return false;
  }

  /** Ausgangszustand einer Einheit — immer aus defaultState(), damit jede
   *  Einheit gleich beginnt. Behält nur Ansicht, Tastenlayout, Oktave und
   *  Master-Pegel des aktuellen Stands. */
  function lessonState(current, lesson) {
    const s = pinLegacyStudio(pinLegacySound(defaultState()));
    s.view = current.view; s.keysLayout = current.keysLayout; s.octave = current.octave;
    s.mix.master = current.mix.master;
    s.chordsOn = false; s.melodyOn = false; s.arpOn = false;
    if (lesson.groove === null) { s.mute.drums = true; s.mute.bass = true; }
    else if (lesson.groove) {
      s.patternIndex = patternIndexByName(lesson.groove);
      const pattern = DRUM_PATTERNS[s.patternIndex];
      s.beat = beatFromPattern(pattern);
      s.percSound = percOf(pattern);
      s.swing = typeof pattern.swing === 'number' ? pattern.swing : 0;
    }
    if (lesson.melody) { s.melodyIndex = melodyIndexByName(lesson.melody); s.melodyOn = true; }
    // Melodie und Loop brauchen dieselbe Taktart (wie _ensureMelodyMeter).
    const meter = DRUM_PATTERNS[s.patternIndex].meter;
    if (MELODIES[s.melodyIndex].meter !== meter) s.melodyIndex = Math.max(0, MELODIES.findIndex((m) => m.meter === meter));
    if (lesson.preset) s.sound = soundFromPreset(presetIndexByName(lesson.preset));
    applyTaskSet(s, lesson.set || {});
    if (lesson.sound) Object.assign(s.sound, lesson.sound, { custom: true });
    for (const key of ['trackOn', 'mute', 'fx', 'kit']) if (lesson[key] && s[key]) Object.assign(s[key], lesson[key]);
    if (lesson.beat) {
      for (const [track, list] of Object.entries(lesson.beat)) s.beat[track] = Object.fromEntries(list.map((x) => [x, 1]));
      s.beatEdited = true;
    }
    s.eighths = s.bpm * eighthsPerBeat(meter);
    s.choirTask = null;
    s.lessonId = lesson.id;
    return s;
  }

  /** Gespeicherter Workshop-Fortschritt: { done: { id: 'YYYY-MM-DD' }, last }.
   *  Unbekannte IDs und kaputte Daten fallen weg. */
  function sanitizeWorkshopProgress(raw) {
    const ids = WORKSHOP_LESSONS.map((l) => l.id);
    const out = { done: {}, last: null };
    if (!raw || typeof raw !== 'object') return out;
    if (raw.done && typeof raw.done === 'object' && !Array.isArray(raw.done)) {
      for (const [id, date] of Object.entries(raw.done)) {
        if (ids.includes(id) && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) out.done[id] = date;
      }
    }
    out.last = ids.includes(raw.last) ? raw.last : null;
    return out;
  }

  /* Challenges (Paket 8). Zufall über eine injizierbare Funktion `rng`
     (Standard Math.random), damit die Tests feste Folgen nutzen können. */
  const CHALLENGE_TRACKS = ['kick', 'snare', 'hat'];
  const SOUND_MATCH_PRESETS = ['Tape Keys', 'Neon Pluck', 'Soft Brass', 'Moon Pad', 'Bright Saw', 'Warm Sub'];
  const SOUND_MATCH_START = { ...SOUND_DEFAULTS, presetIndex: 0, custom: true };
  const MATCH_EPS = 1e-9; // genau auf der Grenze = Treffer

  /** Zufälliger 4/4-Loop ohne Mundschlagzeug-Silben (Index), möglichst nicht `not`. */
  function pickChallengePattern(rng, not = -1) {
    const all = DRUM_PATTERNS.map((p, i) => [p, i]).filter(([p]) => p.meter === '4/4' && !p.vocal).map(([, i]) => i);
    const list = all.length > 1 ? all.filter((i) => i !== not) : all;
    return list[Math.floor(rng() * list.length)];
  }

  /** Hör-Detektiv: genau eine Zelle von Kick, Snare oder Hat umschalten
   *  (hinzufügen oder entfernen), nie Feld 1 der Kick. */
  function detectiveVariant(beat, rng, steps = 16) {
    const options = [];
    for (const track of CHALLENGE_TRACKS) for (let step = 0; step < steps; step++) if (track !== 'kick' || step !== 0) options.push([track, step]);
    const [track, step] = options[Math.floor(rng() * options.length)];
    const variant = JSON.parse(JSON.stringify(beat));
    if (variant[track][step] !== undefined) delete variant[track][step];
    else variant[track][step] = 1;
    return { track, step, beat: variant };
  }

  /** Nachbauen: Treffer und zusätzliche Schläge in Kick, Snare, Hat (nur
   *  ob ein Schlag da ist, nicht wie laut). Angezeigt wird Treffer minus
   *  Extras, nie negativ; geschafft bei genauer Übereinstimmung. */
  function rebuildScore(model, mine) {
    const keys = (b) => new Set(CHALLENGE_TRACKS.flatMap((track) => Object.keys(b?.[track] || {}).map((st) => `${track}:${Number(st)}`)));
    const m = keys(model);
    const y = keys(mine);
    const hits = [...y].filter((k) => m.has(k)).length;
    const extras = y.size - hits;
    return { hits, extras, total: m.size, shown: Math.max(0, hits - extras), done: hits === m.size && extras === 0 };
  }

  /** Klang-Rätsel: welche der vier Größen passen? Wellenform gleich,
   *  Cutoff innerhalb Faktor 1,35, Attack/Release je ±40 % oder ±0,05 s. */
  function soundMatch(target, mine) {
    const near = (a, b) => Math.abs(a - b) <= Math.max(.4 * b, .05) + MATCH_EPS;
    return {
      wave: mine.wave === target.wave,
      cutoff: Math.abs(Math.log(mine.cutoff / target.cutoff)) <= Math.log(1.35) + MATCH_EPS,
      attack: near(mine.attack, target.attack),
      release: near(mine.release, target.release),
    };
  }
  const soundMatched = (target, mine) => Object.values(soundMatch(target, mine)).every(Boolean);

  /** Zielklang: Preset auf Wellenform, Cutoff, Attack, Release reduziert.
   *  Ziele, die der Startklang schon trifft (Tape Keys), fallen weg. */
  function soundMatchTarget(rng, not = null) {
    const targets = SOUND_MATCH_PRESETS.map((name) => {
      const p = soundFromPreset(presetIndexByName(name));
      return { name, sound: { ...SOUND_DEFAULTS, wave: p.wave, cutoff: p.cutoff, attack: p.attack, release: p.release, presetIndex: p.presetIndex, custom: true } };
    }).filter((x) => !soundMatched(x.sound, SOUND_MATCH_START));
    const list = targets.length > 1 ? targets.filter((x) => x.name !== not) : targets;
    return list[Math.floor(rng() * list.length)];
  }

  /* ------------------------------------------------------------------------
     DE:CONSTRUCT — ein fertiger, verborgener Song („Original“) läuft, die
     Nutzerin baut ihn mit den vorhandenen Reitern nach („Meine Version“)
     und vergleicht per A/B. Alles hier ist rein (keine View, kein
     Math.random): feste Songs je Stufe (DC_SONGS), Vergleich je Element,
     Positionswechsel beim A/B-Umschalten, Einlesen des gespeicherten Stands.

     Didaktik: Der Grundton ist immer vorgegeben (absolutes Hören ist keine
     Chor-Fähigkeit), gesucht wird relativ — Tempo, Groove, Bass als Stufen,
     Akkorde als Funktionen, Melodie, Klangfarbe. Was die Stufe nicht
     abfragt, steht in „Meine Version“ schon richtig (vorgegeben).
     ------------------------------------------------------------------------ */
  const DC_ELEMENTS = ['tempo', 'beat', 'bass', 'chords', 'melody', 'sound'];
  const DC_LEVELS = [
    { id: 'easy', elements: ['tempo', 'beat', 'bass'] },
    { id: 'medium', elements: ['tempo', 'beat', 'bass', 'chords'] },
    { id: 'hard', elements: DC_ELEMENTS },
  ];
  // Wohin „Bauen“ springt (Reiter des Groove Labs).
  const DC_TAB = { tempo: 'beat', beat: 'beat', bass: 'beat', chords: 'harmony', melody: 'melody', sound: 'sound' };
  // Reihenfolge des Vorschlags „Danach: …“ (nur ein Vorschlag, keine Pflicht).
  const DC_ORDER = ['tempo', 'beat', 'bass', 'chords', 'melody', 'sound'];
  /** Aktives Element, wenn noch keins gewählt ist: das erste nicht geschaffte. */
  const dcFirstOpen = (elements, done) => elements.find((el) => !done[el]) || elements[0];
  /** „Danach“: das erste nicht geschaffte Element nach dem aktiven (in
   *  Reihenfolge, dann von vorn); null, wenn alles andere geschafft ist. */
  function dcNextElement(elements, done, active) {
    const order = DC_ORDER.filter((el) => elements.includes(el));
    const at = order.indexOf(active);
    return [...order.slice(at + 1), ...order.slice(0, Math.max(at, 0))].find((el) => el !== active && !done[el]) || null;
  }
  // „Nur …“-Hören: Spuren, die es im Song gibt (Tempo und Klang sind keine Spur).
  const DC_FOCUS = ['all', 'beat', 'bass', 'chords', 'melody'];
  const DC_STATUS = ['ok', 'near', 'no'];
  // Tempi in Vierteln (6/8: punktierte Viertel) — bewusst nie um 100, dem
  // Starttempo von „Meine Version“: sonst wäre Tempo schon gelöst.
  const DC_MINE_BPM = 100;
  const DC_TEMPO_OK = 3;   // ±3 BPM gilt als gleich
  const DC_TEMPO_NEAR = 10;

  /*
   * Die Songs — je Stufe ein fester Satz eigener Pop-Kompositionen (für
   * einen Popchor: Ballade, Eurodance, Punk-Pop, Boyband, Disco, Reggae,
   * Soul, Rock …; keine echten Titel oder Melodien), von Hand komponiert und komplett
   * mit den Reitern nachbaubar (Selbsttest „Nachbau“ in app.js):
   *  - Raster als Zeichenketten, eine Stelle je Sechzehntel: x = Schlag,
   *    g = Ghost-Note (nur Snare), . = Pause. Bass: 1 / 5 / 8 = Grundton,
   *    Quinte, Oktave des klingenden Akkords — genau das, was das Antippen
   *    einer Bass-Zelle durchschaltet (CELL_CYCLE).
   *  - Taktart über den ersten Loop dieser Taktart (wie der Taktart-Knopf);
   *    Swing deshalb immer auf Sechzehnteln (keiner dieser Loops hat
   *    swingUnit 8 — sonst hinge das Gefühl am gewählten Loop).
   *  - chords: Stufen der Tonart (0 = I) wie im Akkord-Editor, dazu
   *    Septimen/Dominante; melody: Takte wie im Melodie-Editor
   *    ([Schritt, Stufe über dem Akkordgrundton, Länge]); sound: ein Preset.
   *    Melodien: ein Takt je Akkordtakt, in Tonart-Stufen gedacht und je
   *    Takt um den gefalteten Akkordgrundton (foldDegree) zurückgerechnet —
   *    sonst springt die Linie bei IV→V um eine Septime.
   * Reihenfolge innerhalb einer Stufe = vom Einfachen zum Schweren. Ids nie
   * ändern — gespeichert wird die Id (deconstruct.song, deconstruct.solved).
   */
  const DC_SONGS = [
    // --- Leicht: Tempo & Takt, Beat, Bass (4/4; Akkordfolge vorgegeben, klingt nicht).
    // Power-Pop-Ballade (Stadion-Feuerzeug-Moment): Grundbeat Kick 1+3, Snare 2+4, Achtel-Hi-Hat, Bass halbe Noten auf dem Grundton
    { id: 'e1', level: 'easy', name: 'Lighthouse Hands', genre: 'Power-Ballade', meter: '4/4', bpm: 72, key: 7, mode: 'major', chords: { degrees: [0, 4, 5, 3] },
      kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
      bass: '1.......1.......' },
    // 90er-Eurodance: Kick auf jeder Viertel, Clap statt Snare, offene Hi-Hat und Bass auf der Offbeat-Achtel
    { id: 'e2', level: 'easy', name: 'Neon Kilometer', genre: 'Eurodance', meter: '4/4', bpm: 136, key: 9, mode: 'minor', chords: { degrees: [0, 6, 5, 6] },
      kick: 'x...x...x...x...', clap: '....x.......x...', open: '..x...x...x...x.',
      bass: '..1...1...1...1.' },
    // Deutscher Fun-Punk / Punk-Pop: schnell, Kick-Doppelschläge, durchgehende Achtel im Bass
    { id: 'e3', level: 'easy', name: 'Kaputtes Fahrrad', genre: 'Punk-Pop', meter: '4/4', bpm: 168, key: 4, mode: 'major', chords: { degrees: [0, 3, 4, 3] },
      kick: 'x.x.....x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
      bass: '1.1.1.1.1.1.1.1.' },
    // Motown-/Soul-Pop: Snare auf allen vier Vierteln, Bass in Vierteln Grundton–Quinte–Oktave–Quinte
    { id: 'e4', level: 'easy', name: 'Sunday Stomp', genre: 'Motown', meter: '4/4', bpm: 112, key: 5, mode: 'major', chords: { degrees: [0, 5, 3, 4] },
      kick: 'x.......x.....x.', snare: 'x...x...x...x...', hat: '..x...x...x...x.',
      bass: '1...5...8...5...' },
    // 90er-Boyband-/R&B-Midtempo: synkopierte Kick, Sechzehntel-Hi-Hat, Bass mit Quinte
    { id: 'e5', level: 'easy', name: 'Pager Love', genre: 'R&B', meter: '4/4', bpm: 88, key: 10, mode: 'major', chords: { degrees: [0, 5, 1, 4] },
      kick: 'x......x..x.....', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx',
      bass: '1......1..5.....' },
    // Indie-Disco / Synth-Pop (isländisch-skandinavischer Feel-Good-Pop): Four-on-the-floor, Snare+Clap gedoppelt, offene Offbeat-Hat, Oktav-Bass
    { id: 'e6', level: 'easy', name: 'Polaroid Summer', genre: 'Indie-Disco', meter: '4/4', bpm: 122, key: 2, mode: 'major', chords: { degrees: [0, 2, 5, 3] },
      kick: 'x...x...x...x...', snare: '....x.......x...', clap: '....x.......x...', hat: 'x...x...x...x...', open: '..x...x...x...x.',
      bass: '1.8.1.8.1.8.1.8.' },
    // Reggae-Pop („One Drop“): die Eins bleibt leer, Kick und Snare zusammen auf der Drei
    { id: 'e7', level: 'easy', name: 'Island Postcard', genre: 'Reggae', meter: '4/4', bpm: 78, key: 8, mode: 'major', chords: { degrees: [0, 3, 0, 4] },
      kick: '........x.......', snare: '........x.......', hat: '..x...x...x...x.',
      bass: '1.....1.5.......' },
    // Pop-Rap / Hip-Hop-Pop mit Sechzehntel-Swing (Tempo-Element: Swing mitbestimmen)
    { id: 'e8', level: 'easy', name: 'Rooftop Cypher', genre: 'Hip-Hop', meter: '4/4', bpm: 90, swing: .4, key: 0, mode: 'minor', chords: { degrees: [0, 3, 5, 4] },
      kick: 'x......x.xx.....', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx',
      bass: '1......1.5......' },
    // Funk-Pop: Sechzehntel-Kick-Synkopen, offene Hat vor der Eins, Bass mit Grundton, Quinte und Oktave
    { id: 'e9', level: 'easy', name: 'Elastic Monday', genre: 'Funk-Pop', meter: '4/4', bpm: 108, key: 3, mode: 'major', chords: { degrees: [0, 3] },
      kick: 'x..x..x...x..x..', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '..............x.',
      bass: '1..1..5...8..5..' },

    // --- Mittel: zusätzlich die Akkordfolge als Funktionen, Dur/Moll (4/4).
    // Pop-Rock-Mitsinghymne: die bekannteste Popfolge I–V–vi–IV, jetzt hörbar
    { id: 'm1', level: 'medium', name: 'Paper Crown', genre: 'Pop-Rock', meter: '4/4', bpm: 126, key: 2, mode: 'major', chords: { degrees: [0, 4, 5, 3] },
      kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x...', open: '..............x.',
      bass: '1.....1.5.......' },
    // Moll-Power-Ballade: i–VI–III–VII, Ghost-Notes auf der Snare
    { id: 'm2', level: 'medium', name: 'Ashes and Ivory', genre: 'Power-Ballade', meter: '4/4', bpm: 74, key: 4, mode: 'minor', chords: { degrees: [0, 5, 2, 6] },
      kick: 'x.......xx......', snare: '....x..g....x..g', hat: 'x.x.x.x.x.x.x.x.',
      bass: '1.......1.5.....' },
    // 50er-Doo-Wop/Soul-Ballade mit Swing: die „Ice-Cream“-Folge I–vi–IV–V
    { id: 'm3', level: 'medium', name: 'Milkshake Moon', genre: 'Doo-Wop', meter: '4/4', bpm: 64, swing: .5, key: 0, mode: 'major', chords: { degrees: [0, 5, 3, 4] },
      kick: 'x.......x.....x.', snare: '....x.......x...', hat: 'x.x.x.xxx.x.x.xx',
      bass: '1.....5.8.....5.' },
    // 80er-Synth-Pop: beginnt auf vi — klingt nach Moll, ist aber Dur (vi–IV–I–V)
    { id: 'm4', level: 'medium', name: 'Afterglow Arcade', genre: 'Synth-Pop', meter: '4/4', bpm: 118, key: 7, mode: 'major', chords: { degrees: [5, 3, 0, 4] },
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
      bass: '1.1.1.1.1.1.8.1.' },
    // Deutschpop-Ballade: Akkorde wechseln nur alle zwei Takte (I–IV–vi–V)
    { id: 'm5', level: 'medium', name: 'Rosengarten', genre: 'Deutschpop', meter: '4/4', bpm: 68, key: 3, mode: 'major', chordBars: 2, chords: { degrees: [0, 3, 5, 4] },
      kick: 'x.........x.....', snare: '....x.......x...', hat: 'x...x...x...x...', open: '..............x.',
      bass: '1.........1.5...' },
    // Latin-Pop/Reggaeton (Dembow): Moll mit Dur-Dominante i–VI–iv–V
    { id: 'm6', level: 'medium', name: 'Fuego Lento', genre: 'Reggaeton', meter: '4/4', bpm: 92, key: 11, mode: 'minor', chords: { degrees: [0, 5, 3, 4], dominant: true },
      kick: 'x...x...x...x...', snare: '...x..x....x..x.', hat: 'x.x.x.x.x.x.x.x.',
      bass: '1.....1.1.....5.' },
    // Neo-Soul/R&B-Pop: Septakkorde, ii7–V7–Imaj7 mit leichtem Swing
    { id: 'm7', level: 'medium', name: 'Velvet Elevator', genre: 'Neo-Soul', meter: '4/4', bpm: 82, swing: .3, key: 1, mode: 'major', chords: { degrees: [1, 4, 0, 0], sevenths: true },
      kick: 'x..x......x..x..', snare: '....x..g.g..x...', hat: 'x.x.x.x.x.x.x.x.',
      bass: '1..5....1..8....' },
    // Gospel-Pop mit Mitklatschen: IV–V–iii–vi — startet nicht auf der Tonika
    { id: 'm8', level: 'medium', name: 'Second Sunrise', genre: 'Gospel-Pop', meter: '4/4', bpm: 132, key: 9, mode: 'major', chords: { degrees: [3, 4, 2, 5] },
      kick: 'x.....x...x.....', snare: '....x.......x..g', clap: '....x.......x...', hat: '..x...x...x...x.',
      bass: '1.....1...5...8.' },
    // Pop-Noir / Agenten-Ballade: Moll-Septakkorde mit Dur-Dominante i7–iv7–VImaj7–V7
    { id: 'm9', level: 'medium', name: 'Midnight Casino', genre: 'Pop-Noir', meter: '4/4', bpm: 86, key: 6, mode: 'minor', chords: { degrees: [0, 3, 5, 4], sevenths: true, dominant: true },
      kick: 'x.....xx..x.....', snare: '....x..g....x.g.', hat: 'x.x.x.x.x.x.x.x.', open: '......x.......x.',
      bass: '1.....18..5.....' },

    // --- Schwer: alles inkl. Melodie und Klang; auch 3/4, 6/8 und Kirchentonarten.
    // 90er-Boyband-Ballade, E-Piano, I–V–vi–IV, Melodie in Vierteln/Achteln
    { id: 'h1', level: 'hard', name: 'Windowsill Promise', genre: 'Boyband-Ballade', meter: '4/4', bpm: 70, key: 4, mode: 'major', chords: { degrees: [0, 4, 5, 3] },
      kick: 'x.......x..x....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '..............x.',
      bass: '1.......1..5....',
      melody: [[[0, 2, 4], [4, 4, 4], [8, 4, 6], [14, 5, 2]],
        [[0, 7, 4], [4, 4, 4], [8, 4, 8]],
        [[0, 5, 2], [2, 4, 2], [4, 5, 4], [8, 7, 6], [14, 6, 2]],
        [[0, 0, 4], [4, -1, 4], [8, -3, 8]]],
      sound: 'Tape Keys' },
    // Eurodance/Synth-Pop in Moll: Achtel-Hook mit Sägezahn-Lead, i–VI–III–VII
    { id: 'h2', level: 'hard', name: 'Laser Halo', genre: 'Eurodance', meter: '4/4', bpm: 128, key: 6, mode: 'minor', chords: { degrees: [0, 5, 2, 6] },
      kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x...x...x...x...', open: '..x...x...x...x.',
      bass: '..1...1...8...1.',
      melody: [[[0, 4, 2], [2, 4, 2], [4, 2, 2], [6, 4, 4], [10, 2, 2], [12, 0, 4]],
        [[0, 4, 2], [2, 4, 2], [4, 2, 2], [6, 4, 4], [10, 2, 2], [12, 1, 4]],
        [[0, -1, 2], [2, -1, 2], [4, -3, 2], [6, -1, 4], [10, 0, 2], [12, 2, 4]],
        [[0, 4, 6], [6, 2, 2], [8, 2, 4], [12, 0, 4]]],
      sound: 'Bright Saw' },
    // Reggae-Pop (Steppers): Melodie setzt auf der Offbeat-Achtel ein, Dub-Echo
    { id: 'h3', level: 'hard', name: 'Salt Water Radio', genre: 'Reggae', meter: '4/4', bpm: 76, key: 5, mode: 'major', chords: { degrees: [0, 3, 4, 3] },
      kick: 'x...x...x...x...', snare: '........x.......', hat: '..x...x...x...x.',
      bass: '1...1.5.1...5...',
      melody: [[[2, 2, 2], [4, 4, 4], [8, 4, 2], [10, 5, 2], [12, 4, 4]],
        [[2, 2, 2], [4, 0, 4], [8, -1, 2], [10, 0, 2], [12, 0, 4]],
        [[2, 4, 2], [4, 7, 4], [8, 9, 2], [10, 7, 2], [12, 4, 4]],
        [[2, 0, 2], [4, -1, 4], [8, -3, 8]]],
      sound: 'Dub Chamber' },
    // Stadion-Rock in Mixolydisch: I–♭VII–IV–I, Orgel, Mitgröl-Hook
    { id: 'h4', level: 'hard', name: 'Highway Sermon', genre: 'Stadium-Rock', meter: '4/4', bpm: 132, key: 9, mode: 'mixolydian', chords: { degrees: [0, 6, 3, 0] },
      kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '......x.........',
      bass: '1.1.1.1.1.1.5.8.',
      melody: [[[0, 4, 2], [2, 4, 2], [4, 7, 4], [8, 6, 2], [10, 4, 2], [12, 4, 4]],
        [[0, 7, 2], [2, 7, 2], [4, 9, 4], [8, 8, 2], [10, 7, 2], [12, 4, 4]],
        [[0, 2, 4], [4, 4, 4], [8, 2, 4], [12, 0, 4]],
        [[0, 4, 4], [4, 2, 4], [8, 0, 8]]],
      sound: 'Vintage Organ' },
    // Piano-Bar-Mitsinger / Musical-Ballade im 3/4 (Rock-Halftime-Feel, kein Walzer-Humtata)
    { id: 'h5', level: 'hard', name: 'Bar Stool Philosophy', genre: 'Musical-Ballade', meter: '3/4', bpm: 144, key: 7, mode: 'major', chords: { degrees: [0, 3, 5, 4] },
      kick: 'x.....x.....', snare: '........x...', hat: 'x.x.x.x.x.x.',
      bass: '1.......5...',
      melody: [[[0, 4, 4], [4, 7, 4], [8, 9, 4]],
        [[0, 5, 4], [4, 4, 4], [8, 2, 4]],
        [[0, 6, 4], [4, 9, 4], [8, 8, 4]],
        [[0, 9, 8], [8, 7, 4]]],
      sound: 'Soft Brass' },
    // Doo-Wop-/Soul-Ballade im 6/8 (Boygroup-Harmonie-Sound), I–vi–IV–V
    { id: 'h6', level: 'hard', name: 'Jukebox Promise', genre: 'Doo-Wop', meter: '6/8', bpm: 52, key: 10, mode: 'major', chords: { degrees: [0, 5, 3, 4] },
      kick: 'x.....x.....', snare: '......x.....', hat: 'x.x.x.x.x.x.',
      bass: '1...5.1...8.',
      melody: [[[0, 4, 6], [6, 7, 4], [10, 6, 2]],
        [[0, 7, 6], [6, 6, 2], [8, 4, 4]],
        [[0, 0, 4], [4, 1, 2], [6, 2, 4], [10, 4, 2]],
        [[0, 9, 6], [6, 7, 6]]],
      sound: 'Velvet Choir' },
    // Disco-Funk in Dorisch: Moll-Vamp i7–IV7 (Dur-IV!), Sechzehntel-Synkopen, Pluck-Synth
    { id: 'h7', level: 'hard', name: 'Golden Hour Funk', genre: 'Disco-Funk', meter: '4/4', bpm: 108, swing: .25, key: 9, mode: 'dorian', chordBars: 2, chords: { degrees: [0, 3], sevenths: true },
      kick: 'x...x...x...x...', snare: '....x..g....x.g.', hat: 'xxxxxxxxxxxxxxxx', open: '......x.......x.',
      bass: '1..8..1.1.8..5..',
      melody: [[[0, 4, 2], [3, 7, 1], [4, 6, 2], [6, 4, 2], [10, 2, 2], [12, 4, 4]],
        [[0, 6, 2], [2, 7, 2], [4, 6, 2], [6, 4, 6], [14, 3, 2]],
        [[0, 2, 2], [3, 4, 1], [4, 2, 2], [6, 0, 2], [10, 2, 2], [12, 4, 4]],
        [[0, 5, 2], [2, 4, 2], [4, 2, 2], [6, 0, 6], [14, -1, 2]]],
      sound: 'Neon Pluck' },
    // Schlager/Deutschpop in Moll mit Discofox-Beat: i–VII–III–V (Dur-Dominante mit Leitton)
    { id: 'h8', level: 'hard', name: 'Herzschlag-Hotel', genre: 'Schlager', meter: '4/4', bpm: 120, key: 2, mode: 'minor', chords: { degrees: [0, 6, 2, 4], dominant: true },
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', open: '..............x.',
      bass: '1...8...5...8...',
      melody: [[[0, 0, 4], [4, 4, 2], [6, 5, 2], [8, 4, 4], [12, 2, 4]],
        [[0, 4, 4], [4, 4, 2], [6, 5, 2], [8, 4, 4], [12, 2, 4]],
        [[0, 0, 4], [4, 0, 2], [6, 1, 2], [8, 2, 2], [10, 3, 2], [12, 4, 4]],
        [[0, 7, 6], [6, 6, 2], [8, 4, 4], [12, 2, 4]]],
      sound: 'Analog Lead' },
    // Rock-Oper-/Power-Ballade im 6/8: absteigende Moll-Kadenz i–VII–VI–V mit Dur-Dominante
    { id: 'h9', level: 'hard', name: 'Crimson Overture', genre: 'Rock-Oper', meter: '6/8', bpm: 56, key: 0, mode: 'minor', chords: { degrees: [0, 6, 5, 4], dominant: true },
      kick: 'x...x.....x.', snare: '......x.....', hat: 'x.x.x.x.x.x.', open: '..........x.',
      bass: '1.....1...5.',
      melody: [[[0, 4, 6], [6, 5, 2], [8, 4, 2], [10, 2, 2]],
        [[0, 4, 6], [6, 5, 2], [8, 4, 2], [10, 2, 2]],
        [[0, 4, 6], [6, 2, 2], [8, 4, 2], [10, 7, 2]],
        [[0, 7, 6], [6, 2, 4], [10, 4, 2]]],
      sound: 'Airy Choir' },
    // Neo-Soul/Gospel-R&B: Septakkorde I–vi–ii–V im Swing, Melodie mit Optionstönen
    { id: 'h10', level: 'hard', name: 'Silk Static', genre: 'Neo-Soul', meter: '4/4', bpm: 80, swing: .4, key: 3, mode: 'major', chords: { degrees: [0, 5, 1, 4], sevenths: true },
      kick: 'x......x..x..x..', snare: '....x..g....x..g', hat: 'x.xxx.x.x.xxx.x.',
      bass: '1......8..5..1..',
      melody: [[[0, 4, 2], [2, 6, 4], [6, 4, 2], [8, 2, 6], [14, 1, 2]],
        [[0, 4, 4], [4, 2, 2], [6, 3, 2], [8, 4, 4], [12, 6, 4]],
        [[0, 4, 2], [2, 3, 2], [4, 2, 4], [8, 1, 2], [10, 2, 2], [12, 4, 4]],
        [[0, 7, 6], [6, 6, 2], [8, 4, 8]]],
      sound: 'Crystal Drops' },
  ];
  const DC_BASS_CHAR = { 1: 0, 5: 4, 8: 7 };
  const dcLevel = (id) => DC_LEVELS.find((l) => l.id === id) || DC_LEVELS[0];
  const dcSong = (id) => DC_SONGS.find((s) => s.id === id) || null;
  const dcSongsOf = (levelId) => DC_SONGS.filter((s) => s.level === levelId);
  /** Tempo-Gefühl für die Songliste (nie die BPM-Zahl zeigen): Grenzen in Vierteln;
   *  6/8 zählt in punktierten Vierteln und wird über die Achtel umgerechnet. */
  function dcTempoFeel(song) {
    const quarters = song.bpm * eighthsPerBeat(song.meter) / 2;
    return quarters < 80 ? 'calm' : quarters < 105 ? 'mid' : quarters < 125 ? 'brisk' : 'fast';
  }

  /** Klingende Akkordfolge eines Stands (wie GrooveLabView._progression). */
  function progressionOfState(s) {
    const base = PROGRESSIONS.find((p) => p.id === s.progId) || PROGRESSIONS[0];
    if (!s.progDegrees) return base;
    // Eigene/neue Folgen (mit Namen) erben von der zuletzt gewählten
    // Vorlage nur Id und Kategorie — keine Modus-Bindung.
    const from = s.progName ? { id: base.id, cat: base.cat } : base;
    return { ...from, degrees: s.progDegrees, sevenths: s.progSevenths, dominant: !!s.progDominant, dom7: !!s.progDom7, alter: s.progAlter || undefined, bass: s.progBass || undefined, custom: true };
  }
  const meterOfState = (s) => DRUM_PATTERNS[s.patternIndex].meter;
  const modeStepsOf = (s) => (MODES.find((m) => m.id === s.modeId) || MODES[0]).steps;

  /** Harmonie eines Stands am Schritt g (wie GrooveLabView._harmonyAt). */
  function harmonyOfState(s, g) {
    const prog = progressionOfState(s);
    const barSteps = METERS[meterOfState(s)].steps;
    const index = Math.floor(Math.floor(g / barSteps) / s.chordBars) % prog.degrees.length;
    const deg = prog.degrees[index];
    const alter = prog.alter?.[index] || null;
    return { keyRoot: s.keyRoot, steps: chordSteps(modeStepsOf(s), s.modeId, prog, deg, alter), deg, sevenths: !!prog.sevenths, index, alter, bass: prog.bass?.[index] || 0 };
  }

  /** Beat eines Songs aus seinen Rasterzeilen (siehe DC_SONGS). */
  function dcBeat(song) {
    const beat = { kick: {}, snare: {}, clap: {}, hat: {}, open: {}, perc: {}, bass: {} };
    for (const track of DRUM_TRACKS) {
      [...(song[track] || '')].forEach((c, st) => { if (c === 'x') beat[track][st] = 1; else if (c === 'g') beat[track][st] = .45; });
    }
    [...song.bass].forEach((c, st) => { if (hasOwn(DC_BASS_CHAR, c)) beat.bass[st] = DC_BASS_CHAR[c]; });
    return beat;
  }

  /**
   * Song `songId` als { original, mine } — vollständige, sanitizeState-feste
   * Stände. Was die Stufe nicht abfragt, steht in „Meine Version“ schon wie
   * im Original (Leicht: Tonart und Akkordfolge; Leicht/Mittel: Melodie aus).
   */
  function dcBuild(songId) {
    const song = dcSong(songId);
    if (!song) return null;
    const level = dcLevel(song.level);
    const has = (el) => level.elements.includes(el);
    const o = pinLegacyStudio(pinLegacySound(defaultState()));
    o.bassSoundId = 'round'; // hält Noten (Gate), „Bass halbe Noten“ klingt so; Workshop/Chor bleiben bei 'pluck'
    o.patternIndex = DRUM_PATTERNS.findIndex((p) => p.meter === song.meter);
    o.beat = dcBeat(song);
    o.beatEdited = true;
    o.swing = song.swing || 0;
    o.bpm = song.bpm;
    o.eighths = o.bpm * eighthsPerBeat(song.meter);
    o.keyRoot = song.key;
    o.modeId = song.mode;
    o.progId = 'pop';
    o.progDegrees = [...song.chords.degrees];
    o.progSevenths = !!song.chords.sevenths;
    o.progDominant = !!song.chords.dominant;
    o.progDom7 = false;
    o.chordBars = song.chordBars || 1;
    o.chordsOn = has('chords');
    o.melodyIndex = Math.max(0, MELODIES.findIndex((x) => x.meter === song.meter));
    o.melodyOn = has('melody');
    if (song.melody) {
      o.melodyBars = song.melody.map((bar) => bar.map((n) => [...n]));
      o.melodyMeter = song.meter;
      o.melodyRef = 'chord';
    }
    if (song.sound) o.sound = soundFromPreset(presetIndexByName(song.sound));
    o.view = 'deconstruct';

    // „Meine Version“: Vorgegebenes wie im Original, Gesuchtes neutral —
    // leeres Raster, Tempo 100, ein einziger Akkord, Melodie aus.
    const m = pinLegacySound(defaultState());
    m.bassSoundId = 'round';
    m.view = 'deconstruct';
    m.keyRoot = o.keyRoot;
    m.patternIndex = 0;
    m.beat = { kick: {}, snare: {}, clap: {}, hat: {}, open: {}, perc: {}, bass: {} };
    m.beatEdited = true;
    m.bpm = DC_MINE_BPM;
    m.eighths = m.bpm * eighthsPerBeat(meterOfState(m));
    m.swing = 0;
    if (has('chords')) { m.modeId = 'major'; m.progId = 'drone'; m.chordsOn = true; }
    else {
      for (const k of ['modeId', 'progId', 'progDegrees', 'progSevenths', 'progDominant', 'progDom7', 'chordBars']) m[k] = JSON.parse(JSON.stringify(o[k]));
      m.chordsOn = false;
    }
    m.melodyOn = false;
    m.melodyIndex = 0;
    if (has('sound')) {
      const start = SYNTH_PRESETS.map((p, i) => i).find((i) => !soundMatched(o.sound, soundFromPreset(i)));
      m.sound = soundFromPreset(start ?? 0);
    } else m.sound = JSON.parse(JSON.stringify(o.sound));
    return { original: sanitizeState(o), mine: sanitizeState(m) };
  }

  const dcHint = (key, vars = {}) => ({ key, vars });
  const dcResult = (status, ...hints) => ({ status, hints });
  /** Ergebnis mit Detaildaten fürs Prüf-Blatt: nur ✓/✗ je Spur bzw. Teil,
   *  nie Schritte oder Werte des Originals. */
  const dcWithParts = (result, parts) => ({ ...result, parts });
  /** Gesetzte Schritte einer Spur, die auch klingen (Spur an). */
  const dcTrack = (s, track) => (s.trackOn[track] ? s.beat[track] || {} : {});
  const dcStepsOf = (map) => Object.keys(map).map(Number).sort((x, y) => x - y);

  /** Melodie-Ereignisse über `bars` Takte, gerechnet über der Harmonie
   *  von `ref` — so wird die Melodie unabhängig von den Akkorden geprüft. */
  function dcMelodyEvents(s, ref, bars) {
    if (!s.melodyOn) return [];
    const barSteps = METERS[meterOfState(ref)].steps;
    const melBars = s.melodyBars || MELODIES[s.melodyIndex].bars;
    const melRef = s.melodyBars ? s.melodyRef : melodyRefOf(s.melodyIndex);
    const out = [];
    for (let g = 0; g < bars * barSteps; g++) {
      for (const [at, deg, , alt = 0] of melodyNotesAt(g, melBars, barSteps, s.melodyAltBars && !(s.melodyBars && melRef === 'key'))) {
        out.push({ g: Math.floor(g / barSteps) * barSteps + Math.round(at), midi: melodyMidi(deg, alt, harmonyOfState(ref, g), melRef, modeStepsOf(ref), s.melodyOctave) });
      }
    }
    return out;
  }
  const dcGcd = (a, b) => (b ? dcGcd(b, a % b) : a);
  const dcLcm = (...list) => list.reduce((a, b) => (a * b) / dcGcd(a, b), 1);

  /**
   * Vergleich eines Elements: { status: 'ok' | 'near' | 'no', hints, parts? }.
   * parts (nur Beat: [{ id, ok, soft }] je Spur, Bass: { rhythm, notes })
   * speist das Prüf-Blatt. Die Hinweise sagen, WAS passt und in welche Richtung es geht — nie,
   * wie die Lösung lautet.
   */
  function dcCompare(o, m, element) {
    const meterO = meterOfState(o);
    const meterM = meterOfState(m);
    // Beat, Bass, Akkorde und Melodie lassen sich nur im selben Takt vergleichen.
    if (element !== 'tempo' && element !== 'sound' && meterO !== meterM) {
      if (element === 'chords' && !m.chordsOn) return dcResult('no', dcHint('lab.dc.hint.chordsOff'));
      if (element === 'melody' && !m.melodyOn) return dcResult('no', dcHint('lab.dc.hint.melodyOff'));
      return dcResult('no', dcHint('lab.dc.hint.meterFirst'));
    }
    if (element === 'tempo') {
      if (meterO !== meterM) return dcResult('no', dcHint('lab.dc.hint.meter'));
      const diff = o.bpm - m.bpm;
      const dir = diff > 0 ? 'Faster' : 'Slower';
      if (Math.abs(diff) > DC_TEMPO_NEAR) return dcResult('no', dcHint(`lab.dc.hint.much${dir}`));
      if (Math.abs(diff) > DC_TEMPO_OK) return dcResult('near', dcHint(`lab.dc.hint.bit${dir}`));
      if (Math.abs(o.swing - m.swing) > .15) return dcResult('near', dcHint('lab.dc.hint.swing'));
      return dcResult('ok');
    }
    if (element === 'beat') {
      const fit = [];
      const miss = [];
      let softOnly = true;
      const parts = [];
      for (const track of DRUM_TRACKS) {
        const a = dcTrack(o, track);
        const b = dcTrack(m, track);
        const ka = dcStepsOf(a);
        if (!ka.length && !dcStepsOf(b).length) continue;
        if (!sameSteps(ka, dcStepsOf(b))) { miss.push(track); softOnly = false; parts.push({ id: track, ok: false, soft: false }); continue; }
        // Gleiche Schläge — und gleich laut (Ghost-Note < 1 gegen voll)?
        if (ka.every((st) => (a[st] < 1) === (b[st] < 1))) { fit.push(track); parts.push({ id: track, ok: true, soft: false }); }
        else { miss.push(track); parts.push({ id: track, ok: false, soft: true }); }
      }
      if (!miss.length) return dcWithParts(dcResult('ok'), parts);
      if (softOnly) return dcWithParts(dcResult('near', dcHint('lab.dc.hint.ghost')), parts);
      if (!DRUM_TRACKS.some((track) => dcStepsOf(dcTrack(m, track)).length)) return dcResult('no', dcHint('lab.dc.hint.beatEmpty'));
      const names = (list) => list.map(trackLabel).join(', ');
      const hint = fit.length ? dcHint('lab.dc.hint.parts', { fit: names(fit), miss: names(miss) }) : dcHint('lab.dc.hint.partsNone', { miss: names(miss) });
      return dcWithParts(dcResult(fit.length && miss.length === 1 ? 'near' : 'no', hint), parts);
    }
    if (element === 'bass') {
      const a = dcTrack(o, 'bass');
      const b = dcTrack(m, 'bass');
      const ka = dcStepsOf(a);
      const kb = dcStepsOf(b);
      if (!kb.length) return dcResult('no', dcHint('lab.dc.hint.bassEmpty'));
      const common = ka.filter((st) => b[st] !== undefined);
      const rhythmOk = sameSteps(ka, kb);
      const notesOk = common.length * 2 >= ka.length && common.every((st) => a[st] === b[st]);
      const parts = { rhythm: rhythmOk, notes: notesOk };
      if (rhythmOk && notesOk) return dcWithParts(dcResult('ok'), parts);
      if (rhythmOk) return dcWithParts(dcResult('near', dcHint('lab.dc.hint.bassNotes')), parts);
      if (notesOk) return dcWithParts(dcResult('near', dcHint('lab.dc.hint.bassRhythm')), parts);
      return dcWithParts(dcResult('no', dcHint('lab.dc.hint.bassBoth')), parts);
    }
    if (element === 'chords') {
      if (!m.chordsOn) return dcResult('no', dcHint('lab.dc.hint.chordsOff'));
      const lenO = progressionOfState(o).degrees.length * o.chordBars;
      const lenM = progressionOfState(m).degrees.length * m.chordBars;
      const bars = Math.min(96, dcLcm(lenO, lenM));
      const barSteps = METERS[meterO].steps;
      const chord = (s, bar) => { const h = harmonyOfState(s, bar * barSteps); return chordPitchClasses(h.keyRoot, h.steps, h.deg, h.sevenths); };
      let same = 0;
      let roots = 0;
      for (let bar = 0; bar < bars; bar++) {
        const ca = chord(o, bar);
        const cb = chord(m, bar);
        if (ca[0] === cb[0]) roots++;
        if (ca.length === cb.length && ca.every((pc, i) => pc === cb[i])) same++;
      }
      if (same === bars) return dcResult('ok');
      if (roots === bars) return dcResult('near', dcHint('lab.dc.hint.chordsQuality'));
      if (o.chordBars !== m.chordBars && dcCompare(o, { ...m, chordBars: o.chordBars }, 'chords').status === 'ok') {
        return dcResult('near', dcHint(o.chordBars < m.chordBars ? 'lab.dc.hint.chordsFaster' : 'lab.dc.hint.chordsSlower'));
      }
      return dcResult(same / bars >= .6 ? 'near' : 'no', dcHint('lab.dc.hint.chordsBars', { n: Math.round((same / bars) * 100) }));
    }
    if (element === 'melody') {
      if (!m.melodyOn) return dcResult('no', dcHint('lab.dc.hint.melodyOff'));
      const melLen = (s) => (s.melodyBars || MELODIES[s.melodyIndex].bars).length;
      const bars = Math.min(64, dcLcm(progressionOfState(o).degrees.length * o.chordBars, melLen(o), melLen(m), 2));
      const ea = dcMelodyEvents(o, o, bars);
      const eb = dcMelodyEvents(m, o, bars);
      const onsets = (list) => [...new Set(list.map((e) => e.g))].sort((x, y) => x - y);
      const rhythmOk = sameSteps(onsets(ea), onsets(eb));
      const byG = new Map(eb.map((e) => [e.g, e.midi]));
      const common = ea.filter((e) => byG.has(e.g));
      const exact = common.filter((e) => byG.get(e.g) === e.midi).length;
      const pcs = common.filter((e) => mod(byG.get(e.g) - e.midi, 12) === 0).length;
      if (rhythmOk && exact === ea.length) return dcResult('ok');
      if (rhythmOk && pcs === ea.length) return dcResult('near', dcHint('lab.dc.hint.octave'));
      if (rhythmOk) return dcResult('near', dcHint('lab.dc.hint.melNotes'));
      if (ea.length && pcs / ea.length >= .75) return dcResult('near', dcHint('lab.dc.hint.melRhythm'));
      return dcResult('no', dcHint('lab.dc.hint.melBoth'));
    }
    if (element === 'sound') {
      const match = soundMatch(o.sound, m.sound);
      const keys = Object.keys(match);
      const label = { wave: 'lab.waveformAria', cutoff: 'lab.knobCutoff', attack: 'lab.envAttack', release: 'lab.envRelease' };
      const fit = keys.filter((k) => match[k]);
      if (fit.length === keys.length) return dcResult('ok');
      const names = (list) => list.map((k) => t(label[k])).join(', ');
      const miss = keys.filter((k) => !match[k]);
      const hint = fit.length ? dcHint('lab.dc.hint.parts', { fit: names(fit), miss: names(miss) }) : dcHint('lab.dc.hint.partsNone', { miss: names(miss) });
      return dcResult(fit.length >= 2 ? 'near' : 'no', hint);
    }
    return dcResult('no');
  }

  /**
   * A/B-Wechsel im laufenden Takt: gleiche Taktart → derselbe Schritt
   * (nahtlos). Andere Taktart → Anfang des nächsten Takts, mit derselben
   * Taktnummer — Akkord und Melodietakt bleiben an ihrer Stelle im Song.
   */
  function dcSwitchStep(g, fromSteps, toSteps) {
    if (fromSteps === toSteps) return g;
    return Math.ceil(g / fromSteps) * toSteps;
  }

  /** Neuer de:construct-Stand (für Ansicht und Tests). `solved` (Song-Id →
   *  Datum) wandert von Song zu Song mit. */
  function dcNewSong(songId, today = null, solved = {}) {
    const song = dcSong(songId) || DC_SONGS[0];
    const { original, mine } = dcBuild(song.id);
    return { v: 2, song: song.id, level: song.level, created: today, original, mine, checks: {}, done: {}, revealed: false, revealedEls: {}, solved: { ...solved } };
  }

  /** Gespeicherter de:construct-Stand (Ablage `deconstruct`). Fehlt er
   *  (Ablage von vor de:construct), ist er kaputt oder stammt er aus der
   *  Zeit der zufälligen Songs (v1, nur Seed): null — dann beginnt
   *  de:construct mit der Auswahl. Das Original entsteht immer neu aus
   *  dem Katalog; nur „Meine Version“ und der Fortschritt kommen aus der
   *  Ablage. */
  function sanitizeDeconstruct(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const song = typeof raw.song === 'string' ? dcSong(raw.song) : null;
    if (!song) return null;
    const level = dcLevel(song.level);
    const fresh = dcBuild(song.id);
    const mine = sanitizeState(raw.mine && typeof raw.mine === 'object' ? raw.mine : fresh.mine);
    mine.view = 'deconstruct';
    const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const out = { v: 2, song: song.id, level: level.id, created: isDate(raw.created) ? raw.created : null,
      original: fresh.original, mine, checks: {}, done: {}, revealed: raw.revealed === true, revealedEls: {}, solved: {} };
    for (const el of level.elements) {
      if (DC_STATUS.includes(raw.checks?.[el])) out.checks[el] = raw.checks[el];
      if (isDate(raw.done?.[el])) out.done[el] = raw.done[el];
      if (raw.revealedEls?.[el] === true) out.revealedEls[el] = true;
    }
    if (raw.solved && typeof raw.solved === 'object') {
      for (const s of DC_SONGS) if (isDate(raw.solved[s.id])) out.solved[s.id] = raw.solved[s.id];
    }
    return out;
  }

  // Ansichten des Labs (state.view); 'deconstruct' seit de:construct.
  const VIEWS = ['choir', 'studio', 'workshop', 'deconstruct'];

  const TABS = [
    { id: 'beat', labelKey: 'lab.tabBeat' },
    { id: 'harmony', labelKey: 'lab.tabHarmony' },
    { id: 'melody', labelKey: 'lab.tabMelody' },
    { id: 'sampler', labelKey: 'lab.tabSampler' },
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
    // Neue Stände der Studio-Ansicht (Paket 7d): Pop Stomp, Pop Hook, Klavier, Pop-Satz,
    // Chor-Pad an. Workshop und de:construct beginnen über pinLegacy… wie früher.
    const pattern = DRUM_PATTERNS[patternIndexByName('Pop Stomp')];
    return {
      // bpm im Tempo-Bezug der Taktart (tempoRef 'beat' seit v305, vorher
      // immer Viertel); eighths: genaues Tempo in Achteln pro Minute — bleibt
      // beim Taktartwechsel gleich, damit nichts durch Runden wandert.
      bpm: 106, tempoRef: 'beat', eighths: 212, swing: 0, pump: 0,
      patternIndex: patternIndexByName('Pop Stomp'), beat: beatFromPattern(pattern), beatEdited: false,
      trackOn: { kick: true, snare: true, clap: true, hat: true, open: true, perc: true, bass: true },
      // Schlagzeug-Klang: 'auto' (je Loop-Kategorie) | 'synth' | 'acoustic' | 'hybrid';
      // feel: Akzente/Mikro-Timing nur bei der Wiedergabe; percSound: Klang der
      // Percussion-Spur (übernimmt beim Loop-Wählen den Wert des Loops).
      drumKit: 'auto', feel: true, percSound: percOf(pattern),
      // Fill im letzten Takt jedes Blocks: 0 (aus) | 4 | 8 Takte.
      fills: 8,
      // Sampler (Paket 9): Kits mit acht Pads (Verweise auf Samples) und Sample-Spuren im Raster.
      sampler: sanitizeSampler(null), sampleLanes: [],
      bassSoundId: 'finger',
      keyRoot: 0, modeId: 'major', progId: 'pop', chordBars: 1,
      // Bearbeitete oder eigene Akkordfolge (null = Vorlage progId).
      progDegrees: null, progSevenths: false, progDominant: false, progDom7: false, progName: null, progOwnId: null,
      // Geliehene Akkorde/Umkehrungen der bearbeiteten Folge (Parallel-Arrays zu progDegrees, siehe PROGRESSIONS).
      progAlter: null, progBass: null,
      chordsOn: true, satb: { S: 'on', A: 'on', T: 'on', B: 'on' },
      // Satz der Akkorde ('satb' Chor | 'pop' enge Lage), Farbe add9, Klang ('synth' | 'choir').
      chordVoicing: 'pop', chordAdd9: false, chordSound: 'choir',
      droneOn: false, droneFifth: true,
      melodyIndex: melodyIndexByName('Pop Hook'), melodyOn: true, melodyOctave: 4,
      // Bearbeitete oder eigene Melodie: die Takte selbst (null = Vorlage
      // melodyIndex unverändert), dazu Taktart, Name und ggf. Bibliotheks-Id.
      melodyBars: null, melodyMeter: null, melodyName: null, melodyOwnId: null,
      // Bezug der Stufen in melodyBars: 'chord' (Grundton des klingenden
      // Akkords, Vorlagen/Editor) oder 'key' (Tonika, Aufnahmen).
      melodyRef: 'chord',
      arpOn: false, arpAuto: false, arpPattern: 'triad', arpAutoPattern: 'triad', arpMode: 'up',
      arpDivision: 2, arpRhythm: 'straight', arpOctaves: 1, arpRef: 'key',
      keysLayout: 'piano',
      octave: 4,
      sound: soundFromPreset(presetIndexByName('Klavier')),
      mix: { drums: .8, bass: .8, melody: .75, arp: .6, chords: .45, keys: .8, drone: .5, master: .8 },
      mute: { drums: false, bass: false, melody: false, arp: false, chords: false, keys: false, drone: false },
      fx: { reverbLength: 1.8, echoDiv: 3, echoFeedback: .35, chorus: .2, reverbOn: true, echoOn: true, chorusOn: true },
      // Aufgenommene Reglerbewegungen: je Klang-Parameter ein Wert pro
      // Sechzehntel, geloopt über `steps` Schritte ab `offset`.
      automation: null,
      locks: { beat: false, harmony: false, melody: false, sound: false },
      // Didaktik Paket 8: Ansicht ('choir' | 'studio', null = je nach
      // Einstieg), gewählte Chor-Aufgabe, Melodie nur jeden zweiten Takt.
      view: null, choirTask: null, melodyAltBars: false,
      // Workshop: zuletzt gewählte Einheit (Ansicht 'workshop').
      lessonId: null,
      // Kick-Klang (Workshop Paket 6), siehe KIT_DEFAULTS.
      kit: { ...KIT_DEFAULTS },
    };
  }

  /* Melodie-Editor: sichtbarer Stufenbereich (8 oben … eine Oktave tiefer
     bis zur 5 unten), wählbare Tonlängen in Sechzehnteln und Obergrenzen. */
  // Drei Oktaven: 1–7 höher, 1–7 (Mitte), 1–7 tiefer.
  const MEL_HIGH = 13;
  const MEL_LOW = -7;
  // Tonartbezogene Aufnahmen (ref 'key') werden als Ganzes nur in Oktaven
  // verschoben, nie Ton für Ton gefaltet — dafür dürfen sie weiter reichen.
  const MEL_REC_HIGH = 20;
  const MEL_REC_LOW = -14;
  const MEL_ROW_PX = 21;
  const MEL_LENGTHS = [[1, '1/16'], [2, '1/8'], [4, '1/4'], [6, '1/4 ·'], [8, '1/2']];
  const MEL_MAX_BARS = 4;
  const MEL_MAX_OWN = 24;
  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  /** Takte einer Melodie prüfen: [Schritt, Stufe, Länge, Vorzeichen?] —
   *  einstimmig, im Takt, Stufe im Editorbereich, Vorzeichen nur ±1.
   *  Liefert null, wenn nichts Brauchbares übrig bleibt. */
  /** `wide`: Stufenbereich tonartbezogener Aufnahmen (MEL_REC_…). */
  function sanitizeMelodyBars(raw, meter, wide = false) {
    if (!hasOwn(METERS, meter) || !Array.isArray(raw) || !raw.length) return null;
    const steps = METERS[meter].steps;
    const [low, high] = wide ? [MEL_REC_LOW, MEL_REC_HIGH] : [MEL_LOW, MEL_HIGH];
    return raw.slice(0, MEL_MAX_BARS).map((bar) => {
      if (!Array.isArray(bar)) return [];
      // Position und Länge dürfen gebrochen sein (eingespielt, ohne Raster).
      const r2 = (v) => Math.round(v * 100) / 100;
      const notes = bar
        .filter((n) => Array.isArray(n) && Number.isFinite(n[0]) && Number.isInteger(n[1]) && Number.isFinite(n[2])
          && n[0] >= 0 && n[0] < steps && n[1] >= low && n[1] <= high && n[2] >= .1)
        .slice(0, 64)
        .map(([at, deg, len, alt]) => {
          // Ein Ton darf über den Taktstrich klingen (gehalten eingespielt),
          // aber nicht über das Ende der Melodie hinaus.
          const note = [r2(at), deg, r2(Math.min(len, steps * MEL_MAX_BARS - at))];
          if (alt === 1 || alt === -1) note.push(alt);
          return note;
        })
        .sort((a, b) => a[0] - b[0])
        .filter((n, i, arr) => !i || arr[i - 1][0] !== n[0]);
      notes.forEach((n, i) => { if (notes[i + 1] && n[0] + n[2] > notes[i + 1][0]) n[2] = Math.round((notes[i + 1][0] - n[0]) * 100) / 100; });
      return notes;
    });
  }

  /**
   * Mitschrift einer Aufnahme → Takte aus [Schritt, Stufe, Länge, Vorzeichen?]
   * in Aufnahme-Reihenfolge, Stufen relativ zur TONIKA (ref 'key'): so
   * klingt eine Aufnahme, die kürzer ist als die Akkordfolge, beim Loopen
   * über jedem Akkord mit denselben Tönen (Befund 16 — vorher akkordbezogen,
   * also über fremden Akkorden transponiert). Töne außerhalb der Tonleiter
   * als Stufe darunter mit ♯. Die ganze Aufnahme wird nur in Oktaven
   * verschoben (erst in den Editorbereich, sonst in MEL_REC_…) — keine
   * einzelnen Töne gefaltet, die Kontur bleibt.
   * `notes`: [{ midi, t0, t1 }] in Sekunden der Audio-Uhr.
   */
  function recNotesToBars(notes, { startTime, stepSec, bars: barCount, barSteps, meter, keyRoot, modeSteps, melodyOctave }) {
    const total = barCount * barSteps;
    const r2 = (v) => Math.round(v * 100) / 100;
    const base = 12 * (melodyOctave + 1) + foldRoot(keyRoot);
    const list = notes.map(({ midi, t0, t1 }) => {
      let pos = (t0 - startTime) / stepSec;
      // knapp vor dem Einsatz angeschlagen zählt als "auf Eins"
      if (pos < 0 && pos > -.5) pos = 0;
      const endPos = Math.min(total, (t1 - startTime) / stepSec);
      if (pos < 0 || pos >= total) return null;
      const target = midi - base;
      let deg = null;
      let alt = 0;
      for (let d = -35; d <= 42 && deg === null; d++) if (degreeSemis(modeSteps, d) === target) deg = d;
      for (let d = -35; d <= 42 && deg === null; d++) if (degreeSemis(modeSteps, d) === target - 1) { deg = d; alt = 1; }
      if (deg === null) return null;
      return { pos, len: Math.max(.25, endPos - pos), deg, alt };
    }).filter(Boolean).sort((a, b) => a.pos - b.pos);
    if (list.length) {
      const hi = Math.max(...list.map((n) => n.deg));
      const lo = Math.min(...list.map((n) => n.deg));
      const fits = (low, high, m) => lo + m >= low && hi + m <= high;
      let move = 0;
      // Oktave suchen, in der alles im Editorbereich liegt, sonst im
      // erweiterten Aufnahmebereich; am nächsten an der gespielten Lage.
      const candidates = [0, -7, 7, -14, 14, -21, 21];
      move = candidates.find((m) => fits(MEL_LOW, MEL_HIGH, m))
        ?? candidates.find((m) => fits(MEL_REC_LOW, MEL_REC_HIGH, m)) ?? 0;
      list.forEach((n) => { n.deg += move; });
    }
    const bars = Array.from({ length: barCount }, () => []);
    list.forEach((n, i) => {
      // erst runden, dann Takt bestimmen — sonst landet 15,999… als
      // Schritt 16 im ersten Takt und fällt aus dem Raster.
      const p = Math.min(total - .01, r2(n.pos));
      const bar = Math.floor(p / barSteps);
      const at = r2(p - bar * barSteps);
      // Gehaltene Töne klingen über den Taktstrich weiter — nur bis zum
      // nächsten Anschlag (einstimmig) und bis zum Ende der Aufnahme.
      const next = list[i + 1];
      const limit = Math.min(next ? next.pos - n.pos : Infinity, total - n.pos);
      const len = r2(Math.max(.25, Math.min(n.len, limit)));
      bars[bar].push(n.alt ? [at, n.deg, len, n.alt] : [at, n.deg, len]);
    });
    return sanitizeMelodyBars(bars, meter, true) || bars;
  }

  /** Bibliothek eigener Melodien (liegt neben den Speicherplätzen, nicht im
   *  Stand — ein geladener Speicherplatz soll sie nicht überschreiben). */
  function sanitizeMelodyLibrary(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw.slice(0, MEL_MAX_OWN).map((m) => {
      if (!m || typeof m !== 'object' || typeof m.id !== 'string' || seen.has(m.id)) return null;
      const key = m.ref === 'key';
      const bars = sanitizeMelodyBars(m.bars, m.meter, key);
      if (!bars) return null;
      seen.add(m.id);
      const name = typeof m.name === 'string' && m.name.trim() ? m.name.trim().slice(0, 40) : 'Melody';
      // ref 'key': Stufen relativ zur Tonika (Aufnahmen ab v302); fehlt es,
      // sind sie wie bisher relativ zum Grundton des klingenden Akkords.
      return key ? { id: m.id.slice(0, 24), name, meter: m.meter, bars, ref: 'key' } : { id: m.id.slice(0, 24), name, meter: m.meter, bars };
    }).filter(Boolean);
  }

  function sanitizeAutomation(raw) {
    if (!raw || typeof raw !== 'object' || !raw.lanes || typeof raw.lanes !== 'object') return null;
    const steps = Number.isInteger(raw.steps) && raw.steps >= 1 && raw.steps <= 64 ? raw.steps : null;
    if (!steps) return null;
    const lanes = {};
    for (const [key, values] of Object.entries(raw.lanes)) {
      if (!hasOwn(SOUND_RANGES, key) || !Array.isArray(values) || values.length !== steps) continue;
      const [lo, hi] = SOUND_RANGES[key];
      if (!values.every((v) => Number.isFinite(v))) continue;
      lanes[key] = values.map((v) => clamp(v, lo, hi));
    }
    if (!Object.keys(lanes).length) return null;
    return {
      on: raw.on !== false, steps, lanes,
      bars: Number.isInteger(raw.bars) ? clamp(raw.bars, 1, 4) : 1,
      offset: Number.isInteger(raw.offset) ? mod(raw.offset, steps) : 0,
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


    s.swing = num(raw.swing, 0, 1, s.swing);
    s.pump = num(raw.pump, 0, 1, s.pump);
    s.patternIndex = int(raw.patternIndex, 0, DRUM_PATTERNS.length - 1, 0);
    const pattern = DRUM_PATTERNS[s.patternIndex];
    // Alte Stände (ohne tempoRef) zählten immer in Vierteln.
    const fromQuarter = raw.tempoRef !== 'beat';
    const rawBpm = typeof raw.bpm === 'number' && fromQuarter ? raw.bpm * 2 / eighthsPerBeat(pattern.meter) : raw.bpm;
    s.bpm = Math.round(num(rawBpm, BPM_MIN, BPM_MAX, s.bpm));
    s.eighths = !fromQuarter && typeof raw.eighths === 'number' && Number.isFinite(raw.eighths)
      && Math.round(raw.eighths / eighthsPerBeat(pattern.meter)) === s.bpm ? raw.eighths : s.bpm * eighthsPerBeat(pattern.meter);
    s.beat = sanitizeBeat(raw.beat, pattern);
    s.beatEdited = bool(raw.beatEdited, false);
    for (const track of TRACK_IDS) s.trackOn[track] = bool(obj(raw.trackOn)[track], true);
    s.bassSoundId = oneOf(raw.bassSoundId, BASS_SOUNDS.map((b) => b.id), raw.view === 'deconstruct' ? 'round' : ['choir', 'workshop'].includes(raw.view) || raw.choirTask || raw.lessonId ? 'pluck' : s.bassSoundId);
    // Alte Stände aus Chor-Aufgaben, Workshop und de:construct (ohne die
    // neuen Felder) klingen weiter wie damals.
    const legacy = ['choir', 'workshop', 'deconstruct'].includes(raw.view) || !!raw.choirTask || !!raw.lessonId;
    s.drumKit = oneOf(raw.drumKit, DRUM_KITS, legacy ? 'synth' : 'auto');
    s.feel = bool(raw.feel, !legacy);
    s.fills = oneOf(raw.fills, FILL_LENGTHS, legacy ? 0 : 8);
    s.sampler = sanitizeSampler(raw.sampler);
    s.sampleLanes = sanitizeSampleLanes(raw.sampleLanes, METERS[pattern.meter].steps);
    s.percSound = oneOf(raw.percSound, PERC_SOUNDS, percOf(pattern));
    s.keyRoot = int(raw.keyRoot, 0, 11, 0);
    s.modeId = oneOf(raw.modeId, MODES.map((m) => m.id), s.modeId);
    s.progId = oneOf(raw.progId, PROGRESSIONS.map((p) => p.id), s.progId);
    s.progDegrees = sanitizeProgDegrees(raw.progDegrees);
    if (s.progDegrees) {
      s.progSevenths = bool(raw.progSevenths, false);
      s.progName = typeof raw.progName === 'string' && raw.progName.trim() ? raw.progName.trim().slice(0, 40) : null;
      s.progOwnId = typeof raw.progOwnId === 'string' ? raw.progOwnId.slice(0, 24) : null;
      // progDominant gibt es erst seit v296. Fehlt es, erbt eine bearbeitete
      // Vorlage (ohne Namen) die Einstellung der Vorlage, alles Eigene bleibt
      // beim bisherigen Moll-v.
      const base = PROGRESSIONS.find((p) => p.id === s.progId) || PROGRESSIONS[0];
      s.progDominant = bool(raw.progDominant, !s.progName && !!base.dominant);
      // progDom7 (Dominantseptakkorde, Blues) ebenso, seit v298.
      s.progDom7 = bool(raw.progDom7, !s.progName && !!base.dom7);
      // Geliehene Akkorde/Umkehrungen (seit Paket 8); eine bearbeitete Vorlage ohne diese Felder erbt die der Vorlage.
      const inherit = !s.progName && s.progDegrees.length === base.degrees.length;
      s.progAlter = sanitizeProgAlter('progAlter' in raw ? raw.progAlter : inherit ? base.alter : null, s.progDegrees.length);
      s.progBass = sanitizeProgBass('progBass' in raw ? raw.progBass : inherit ? base.bass : null, s.progDegrees.length);
    }
    s.chordBars = oneOf(raw.chordBars, [1, 2], 1);
    s.chordsOn = bool(raw.chordsOn, false);
    // Stände ohne diese Felder klingen wie vor Paket 7: SATB-Satz, Synth-Chor.
    s.chordVoicing = oneOf(raw.chordVoicing, ['satb', 'pop'], 'satb');
    s.chordAdd9 = bool(raw.chordAdd9, false);
    s.chordSound = oneOf(raw.chordSound, ['synth', 'choir'], 'synth');
    for (const v of SATB) s.satb[v] = oneOf(obj(raw.satb)[v], ['on', 'focus', 'mute'], 'on');
    s.droneFifth = bool(raw.droneFifth, true);
    s.melodyIndex = int(raw.melodyIndex, 0, MELODIES.length - 1, 0);
    s.melodyOn = bool(raw.melodyOn, true);
    s.melodyOctave = int(raw.melodyOctave, 3, 5, 4);
    s.arpOn = bool(raw.arpOn, false);
    s.arpAuto = bool(raw.arpAuto, false);
    s.arpPattern = oneOf(raw.arpPattern, ARP_PATTERNS.map(([id]) => id), 'triad');
    s.arpAutoPattern = oneOf(raw.arpAutoPattern, ARP_AUTO_PATTERNS.map(([id]) => id), 'triad');
    s.arpRhythm = oneOf(raw.arpRhythm, ARP_RHYTHMS.map(([id]) => id), 'straight');
    s.keysLayout = oneOf(raw.keysLayout, ['piano', 'scale'], 'piano');
    s.arpMode = oneOf(raw.arpMode, ARP_MODES.map(([id]) => id), 'up');
    s.arpDivision = oneOf(raw.arpDivision, ARP_DIVISIONS.map(([v]) => v), 2);
    s.arpOctaves = oneOf(raw.arpOctaves, [1, 2, 3], 1);
    s.arpRef = oneOf(raw.arpRef, ARP_REFS.map(([id]) => id), 'key');
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
      reverbOn: bool(fx.reverbOn, true),
      echoOn: bool(fx.echoOn, true),
      chorusOn: bool(fx.chorusOn, true),
    };
    s.automation = sanitizeAutomation(raw.automation);
    for (const lock of Object.keys(s.locks)) s.locks[lock] = bool(obj(raw.locks)[lock], false);
    s.view = oneOf(raw.view, VIEWS, null);
    s.choirTask = oneOf(raw.choirTask, CHOIR_TASKS.map((x) => x.id), null);
    s.lessonId = oneOf(raw.lessonId, WORKSHOP_LESSONS.map((l) => l.id), null);
    for (const [key, [lo, hi]] of Object.entries(KIT_RANGES)) s.kit[key] = num(obj(raw.kit)[key], lo, hi, KIT_DEFAULTS[key]);
    s.melodyAltBars = bool(raw.melodyAltBars, false);
    // Der Liegeton braucht eine Nutzergeste zum Starten — nie aus einem
    // gespeicherten Stand heraus von selbst loslaufen lassen.
    s.droneOn = false;
    if (MELODIES[s.melodyIndex].meter !== pattern.meter) {
      s.melodyIndex = Math.max(0, MELODIES.findIndex((m) => m.meter === pattern.meter));
    }
    if (raw.melodyMeter === pattern.meter) {
      s.melodyBars = sanitizeMelodyBars(raw.melodyBars, pattern.meter, raw.melodyRef === 'key');
      if (s.melodyBars) {
        s.melodyRef = raw.melodyRef === 'key' ? 'key' : 'chord';
        s.melodyMeter = pattern.meter;
        s.melodyName = typeof raw.melodyName === 'string' && raw.melodyName.trim() ? raw.melodyName.trim().slice(0, 40) : null;
        s.melodyOwnId = typeof raw.melodyOwnId === 'string' ? raw.melodyOwnId.slice(0, 24) : null;
      }
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
    // `sample` nur aus der Liste, sonst entfernen (geteilte Codes dürfen keinen Ordner erfinden).
    if (SAMPLE_INSTRUMENTS.includes(raw.sample)) sound.sample = raw.sample; else delete sound.sample;
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
    prev: svg('<path d="m15 6-6 6 6 6"/>'),
    edit: svg('<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m14 6 4 4"/>'),
    redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
    newPage: svg('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>'),
    next: svg('<path d="m9 6 6 6-6 6"/>'),
    play: svg('<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>'),
    pause: svg('<path d="M8 5v14M16 5v14"/>'),
    dice: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.1" fill="currentColor" stroke="none"/>'),
    latch: svg('<rect x="5" y="10" width="14" height="9" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    unlock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7"/>'),
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    zoom: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/>'),
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
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="none"/>',
    boot: '<path d="M7 3h7v8l5 3v6H5V12l2-2Z" fill="none"/><path d="M5 17h14"/>',
    tambourine: '<circle cx="12" cy="12" r="8" fill="none"/><circle cx="12" cy="4.2" r=".9" fill="currentColor" stroke="none"/><circle cx="19.8" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="19.8" r=".9" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2.4" fill="none"/>',
    hourglass: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9" fill="none"/><path d="M16 3c0 5-8 5-8 9s8 4 8 9" fill="none"/>',
    piano: '<rect x="3" y="5" width="18" height="14" rx="1.5" fill="none"/><path d="M8 19v-6M12 19v-6M16 19v-6M7 5v8h2V5M11 5v8h2V5M15 5v8h2V5" fill="none"/>',
    guitar: '<circle cx="9" cy="15" r="4.6" fill="none"/><circle cx="9" cy="15" r="1.2" fill="none"/><path d="M12.4 11.6 19.5 4.5M17.5 3l3.5 3.5" fill="none"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3" fill="none"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" fill="none"/>',
    harp: '<path d="M6 21V8c0-3 3-5 6-5 3 0 6 2 6 5v13" fill="none"/><path d="M9 8v10M12 8v10M15 8v10"/>',
    trumpet: '<path d="M3 12h10M13 8l7-3v14l-7-3Z" fill="none"/><path d="M5 12v4h3v-4" fill="none"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2" fill="none"/><circle cx="10" cy="12" r="2" fill="none"/><circle cx="18" cy="18" r="2" fill="none"/>',
  };

  const pictogramIcon = (name) => svg(PICTOGRAM[name] || '');
  /** Kurzbeschreibung eines Klang-Presets, z. B. 'lab.toneVelvetChoir'. */
  const presetDescKey = (preset) => `lab.tone${preset.name.replace(/[^A-Za-z]/g, '')}`;

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
    const notes = melody.bars.find((bar) => bar.length) || [];
    if (!notes.length) return '<svg class="preview" viewBox="0 0 64 16" aria-hidden="true"></svg>';
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
       Hall-Send → Vorverzögerung 25 ms → Convolver → Hochpass 250 Hz
                 → reverbReturn → master   (am Pumpen vorbei: die Hallfahne
                                            pumpt nicht mit)
       Echo-Send → Delay → duck           (pumpt mit)
       Limiter: threshold -3, ratio 20, attack 2 ms — fängt nur Spitzen,
       kein Bus-Kompressor (der pumpte hörbar).
     ------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------
     SAMPLER (Paket 9) — reine Funktionen: Grenzen, Bereinigung gespeicherter
     Daten, Auto-Schnitt, Tonhöhenerkennung, Tonziel, Quantisierung. Kein DOM,
     kein AudioContext — per Node und in runMusicSelfTests prüfbar.

     Aufbau der Daten: Das Audio (Blob des MediaRecorders, unverändert) liegt in
     IndexedDB (`files`, Schlüssel `labSample:<id>`), die Metadaten als meta-Typ
     `labSample`. Im Lab-Zustand stehen nur Verweise: `sampler` (Kits mit acht
     Pads) und `sampleLanes` (Sample-Spuren im Raster). Samples reisen nicht
     mit einem GL1.-Code — fehlt eins auf dem Gerät, bleibt die Spur stumm.
     ------------------------------------------------------------------------ */
  const SAMPLER_MAX_SAMPLES = 64;
  const SAMPLER_MAX_SEC = { hit: 2, tone: 4, loop: 10 };
  const SAMPLER_MAX_LOOP_BARS = 2;
  const SAMPLER_MAX_LANES = 4;
  const SAMPLER_MAX_KITS = 8;
  const SAMPLER_PADS = 8;
  const SAMPLE_KINDS = ['hit', 'tone', 'loop'];
  const SAMPLE_TRACKS = ['kick', 'snare', 'clap', 'hat', 'open', 'perc'];
  const SAMPLE_TONE_ROLES = ['auto', 'root', 'third', 'fifth'];
  /** Werks-Sampler: die Schlagzeug-Dateien aus samples/drums (CC0). */
  const FACTORY_SAMPLES = [
    ['kick', 'kick'], ['snare', 'snare'], ['rim', 'perc'], ['hat', 'hat'], ['open', 'open'], ['clap', 'clap'],
    ['tom-hi', 'perc'], ['tom-lo', 'perc'], ['crash', 'perc'], ['ride', 'hat'], ['tamb', 'perc'], ['shaker', 'perc'],
  ].map(([file, track]) => ({ id: `f:${file}`, name: file.length > 12 ? file.slice(0, 12) : file, kind: 'hit', track, file, factory: true,
    trim: [0, 2], gainDb: 0, pitch: 0, reverse: false, decay: 2, reverb: 0, layerOriginal: false, toneRole: 'auto', detectedMidi: null,
    detectedCents: 0, loopBars: 1, bpmAtRec: null, meterAtRec: null, by: '', createdAt: 0 }));
  /** Werks-Kits (schreibgeschützt). */
  const FACTORY_KITS = [
    { id: 'f-acoustic', name: 'Akustik', nameKey: 'lab.sampler.kitAcoustic', factory: true, pads: ['f:kick', 'f:snare', 'f:hat', 'f:open', 'f:clap', 'f:tom-hi', 'f:rim', 'f:crash'] },
    { id: 'f-electro', name: 'Elektro', nameKey: 'lab.sampler.kitElectro', factory: true, pads: ['f:kick', 'f:clap', 'f:hat', 'f:open', 'f:tom-lo', 'f:tamb', 'f:shaker', 'f:ride'] },
  ];
  const isFactoryId = (id) => typeof id === 'string' && id.startsWith('f:');
  const factorySample = (id) => FACTORY_SAMPLES.find((s) => s.id === id) || null;
  const SAMPLE_ID_RE = /^[A-Za-z0-9_-]{1,24}$/;
  const SAMPLE_PAD_ID_RE = /^(f:[a-z-]{1,12}|[A-Za-z0-9_-]{1,24})$/;
  const dbToGain = (db) => Math.pow(10, db / 20);

  /** Metadaten eines Samples prüfen (gespeicherte Datensätze sind fremde Daten). Null = unbrauchbar. */
  function sanitizeSampleMeta(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !SAMPLE_ID_RE.test(raw.id)) return null;
    const num = (v, lo, hi, fb) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : fb);
    const kind = SAMPLE_KINDS.includes(raw.kind) ? raw.kind : 'hit';
    const trimRaw = Array.isArray(raw.trim) ? raw.trim : [];
    let start = num(trimRaw[0], 0, 600, 0);
    let end = num(trimRaw[1], 0, 600, 0);
    if (end - start < .02) end = start + .02;
    // Länge je Art begrenzen (Schlag ≤ 2 s, Ton ≤ 4 s, Loop ≤ 10 s).
    end = Math.min(end, start + SAMPLER_MAX_SEC[kind]);
    const meter = ['4/4', '3/4', '6/8'].includes(raw.meterAtRec) ? raw.meterAtRec : null;
    return {
      id: raw.id,
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 12) : '?',
      kind,
      trim: [Math.round(start * 1000) / 1000, Math.round(end * 1000) / 1000],
      gainDb: num(raw.gainDb, -24, 6, 0),
      pitch: Math.round(num(raw.pitch, -12, 12, 0) * 100) / 100,
      reverse: raw.reverse === true,
      decay: num(raw.decay, .05, 10, SAMPLER_MAX_SEC[kind]),
      reverb: num(raw.reverb, 0, 1, 0),
      track: SAMPLE_TRACKS.includes(raw.track) ? raw.track : 'perc',
      layerOriginal: raw.layerOriginal === true,
      toneRole: SAMPLE_TONE_ROLES.includes(raw.toneRole) ? raw.toneRole : 'auto',
      detectedMidi: typeof raw.detectedMidi === 'number' && Number.isFinite(raw.detectedMidi) ? clamp(Math.round(raw.detectedMidi), 20, 120) : null,
      detectedCents: num(raw.detectedCents, -50, 50, 0),
      loopBars: raw.loopBars === 2 ? 2 : 1,
      bpmAtRec: typeof raw.bpmAtRec === 'number' && Number.isFinite(raw.bpmAtRec) ? clamp(Math.round(raw.bpmAtRec), BPM_MIN, 300) : null,
      meterAtRec: meter,
      by: typeof raw.by === 'string' ? raw.by.trim().slice(0, 24) : '',
      createdAt: num(raw.createdAt, 0, 8.64e15, 0),
    };
  }

  /** Sampler-Zustand (Kits mit je acht Pads, gewähltes Kit) prüfen; unbekannte Pad-Ids bleiben stehen
   *  (das Sample kann auf einem anderen Gerät liegen) — sie klingen nur nicht. */
  function sanitizeSampler(raw) {
    const out = { kits: [], kitId: 'k1' };
    const obj = raw && typeof raw === 'object' ? raw : {};
    const seen = new Set();
    for (const kit of (Array.isArray(obj.kits) ? obj.kits : []).slice(0, SAMPLER_MAX_KITS)) {
      if (!kit || typeof kit !== 'object' || typeof kit.id !== 'string' || !SAMPLE_ID_RE.test(kit.id) || seen.has(kit.id)) continue;
      seen.add(kit.id);
      const pads = Array.from({ length: SAMPLER_PADS }, (_, i) => (typeof kit.pads?.[i] === 'string' && SAMPLE_PAD_ID_RE.test(kit.pads[i]) ? kit.pads[i] : null));
      out.kits.push({ id: kit.id, name: typeof kit.name === 'string' && kit.name.trim() ? kit.name.trim().slice(0, 16) : 'Kit', pads });
    }
    if (!out.kits.length) out.kits.push({ id: 'k1', name: 'Chor-Kit', pads: Array(SAMPLER_PADS).fill(null) });
    const wanted = obj.kitId;
    out.kitId = out.kits.some((k) => k.id === wanted) || FACTORY_KITS.some((k) => k.id === wanted) ? wanted : out.kits[0].id;
    return out;
  }

  /** Sample-Spuren im Raster: höchstens vier, je Pad eine; Schritte als { Schritt: Anschlagstärke }. */
  function sanitizeSampleLanes(raw, steps = 16) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const seen = new Set();
    for (const lane of raw) {
      if (out.length >= SAMPLER_MAX_LANES) break;
      if (!lane || typeof lane !== 'object' || typeof lane.padId !== 'string' || !SAMPLE_PAD_ID_RE.test(lane.padId) || seen.has(lane.padId)) continue;
      seen.add(lane.padId);
      const hits = {};
      for (const [key, value] of Object.entries(lane.steps && typeof lane.steps === 'object' ? lane.steps : {})) {
        const step = Number(key);
        if (Number.isInteger(step) && step >= 0 && step < steps && typeof value === 'number' && Number.isFinite(value)) hits[step] = clamp(value, .1, 1);
      }
      out.push({ padId: lane.padId, on: lane.on !== false, layer: lane.layer === true, steps: hits });
    }
    return out;
  }

  /** Auto-Schnitt: Anfang/Ende (Sekunden) bei −45 dBFS relativ zum Spitzenwert, 2 ms Vorlauf. */
  function autoTrimBounds(data, sampleRate, { thresholdDb = -45, lead = .002, tail = .01 } = {}) {
    let peak = 0;
    for (let i = 0; i < data.length; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
    if (!(peak > 0)) return { start: 0, end: data.length / sampleRate, peak: 0 };
    const limit = peak * Math.pow(10, thresholdDb / 20);
    let first = 0;
    while (first < data.length && Math.abs(data[first]) < limit) first++;
    let last = data.length - 1;
    while (last > first && Math.abs(data[last]) < limit) last--;
    return { start: Math.max(0, first / sampleRate - lead), end: Math.min(data.length / sampleRate, last / sampleRate + tail), peak };
  }

  /** Mini-Wellenform: `n` Spitzenwerte (0–1) über den ganzen Puffer. */
  function wavePeaks(data, n = 14) {
    const out = [];
    const size = Math.max(1, Math.floor(data.length / n));
    let max = 0;
    for (let i = 0; i < n; i++) {
      let peak = 0;
      for (let j = i * size; j < Math.min(data.length, (i + 1) * size); j++) { const a = Math.abs(data[j]); if (a > peak) peak = a; }
      out.push(peak);
      if (peak > max) max = peak;
    }
    return max > 0 ? out.map((v) => v / max) : out;
  }

  /**
   * Tonhöhe per YIN (de Cheveigné & Kawahara) über die mittleren 50 % des geschnittenen Bereichs.
   * Mehrere Fenster, Median; null, wenn keine verlässliche Tonhöhe da ist (Geräusch, Klatschen).
   * Liefert { midi (ganzzahlig), cents (−50…50), hz }.
   */
  function detectPitch(data, sampleRate, { minHz = 70, maxHz = 1100, threshold = .15, windows = 5 } = {}) {
    const from = Math.floor(data.length * .25);
    const to = Math.floor(data.length * .75);
    const tauMax = Math.min(Math.floor(sampleRate / minHz), 1500);
    const tauMin = Math.max(2, Math.floor(sampleRate / maxHz));
    const win = Math.max(1024, tauMax * 2);
    if (to - from < win + tauMax) {
      // Zu kurz für eine Messung mit Fenster und Verschiebung — ganze Strecke als ein Fenster versuchen.
      if (to - from < tauMax * 2 + 64) return null;
    }
    const results = [];
    const span = Math.max(0, to - from - win - tauMax);
    for (let w = 0; w < windows; w++) {
      const start = from + (windows > 1 ? Math.floor((span * w) / (windows - 1)) : 0);
      const len = Math.min(win, to - start - tauMax);
      if (len < tauMax) continue;
      const d = new Float64Array(tauMax + 1);
      for (let tau = 1; tau <= tauMax; tau++) {
        let sum = 0;
        for (let i = 0; i < len; i++) { const diff = data[start + i] - data[start + i + tau]; sum += diff * diff; }
        d[tau] = sum;
      }
      // kumulierte mittlere normalisierte Differenz
      const cm = new Float64Array(tauMax + 1);
      cm[0] = 1;
      let running = 0;
      for (let tau = 1; tau <= tauMax; tau++) { running += d[tau]; cm[tau] = running > 0 ? (d[tau] * tau) / running : 1; }
      let found = -1;
      for (let tau = tauMin; tau < tauMax; tau++) {
        if (cm[tau] < threshold) {
          while (tau + 1 < tauMax && cm[tau + 1] < cm[tau]) tau++;
          found = tau;
          break;
        }
      }
      if (found < 0) continue;
      // parabolische Verfeinerung
      const a = cm[found - 1];
      const b = cm[found];
      const c = cm[found + 1] ?? b;
      const denom = a - 2 * b + c;
      const shift = denom ? (a - c) / (2 * denom) : 0;
      results.push(sampleRate / (found + clamp(shift, -1, 1)));
    }
    if (results.length < Math.ceil(windows / 2)) return null;
    results.sort((x, y) => x - y);
    const hz = results[results.length >> 1];
    const midiFloat = 69 + 12 * Math.log2(hz / 440);
    const midi = Math.round(midiFloat);
    return { hz, midi, cents: Math.round((midiFloat - midi) * 100) };
  }

  /**
   * Zielton eines Ton-Samples über dem klingenden Akkord. `pcs`: Tonhöhenklassen des Akkords
   * [Grundton, Terz, Quinte, …]. `auto`: der Akkordton (Grundton/Terz/Quinte) mit dem kleinsten
   * Abstand zu `detectedMidi`; sonst die gewählte Rolle in der nächstgelegenen Oktave.
   */
  function sampleToneTarget(role, detectedMidi, pcs) {
    const wrap = (semis) => mod(semis + 6, 12) - 6; // −6 … +5
    const nearest = (pc) => detectedMidi + wrap(pc - mod(detectedMidi, 12));
    const index = { root: 0, third: 1, fifth: 2 }[role];
    if (index !== undefined) return nearest(pcs[index] ?? pcs[0]);
    let best = null;
    for (const pc of pcs.slice(0, 3)) {
      const target = nearest(pc);
      if (best === null || Math.abs(target - detectedMidi) < Math.abs(best - detectedMidi)) best = target;
    }
    return best;
  }

  /** Abspielrate eines Ton-Samples: (Ziel − erkannt − Cent/100 + Feinstimmung) Halbtöne, die Umstimmung
   *  selbst auf ±7 begrenzt (sonst eine Oktave gefaltet), danach die Feinstimmung `pitch`. */
  function sampleToneRate(target, detectedMidi, detectedCents, pitch = 0) {
    let semis = target - detectedMidi - detectedCents / 100;
    while (semis > 7) semis -= 12;
    while (semis < -7) semis += 12;
    return Math.pow(2, (semis + pitch) / 12);
  }

  /** Globaler Schritt zu einem Tipp: Zeit des Tipps minus Ausgabe-Latenz, gegen einen bekannten
   *  Schritt (refStep zur Audio-Zeit refTime) abgeglichen und auf die nächste Sechzehntel gerundet. */
  function quantizeTapStep(tapTime, refTime, refStep, stepSec, latency = 0) {
    return refStep + Math.round((tapTime - latency - refTime) / stepSec);
  }

  /** Loop-Tempo: gleiche Rate, wenn das Tempo höchstens 3 % vom Aufnahmetempo abweicht, sonst null
   *  (v1: kein Strecken ohne Tonhöhenänderung — der Loop schweigt und die Oberfläche nennt das Tempo). */
  function loopRate(bpm, bpmAtRec) {
    if (!bpmAtRec) return 1;
    const ratio = bpm / bpmAtRec;
    return Math.abs(ratio - 1) <= .03 ? ratio : null;
  }

  /* ------------------------------------------------------------------------
     LabSamples — das Schlagzeug-Kit aus samples/drums (VCSL, CC0), im
     Hintergrund geladen. Fehlt eine Datei oder schlägt das Laden fehl, bleibt
     der Eintrag null und die Engine nimmt die Synthese. Gehört einem
     AudioContext (decodeAudioData) und wird mit ihm verworfen.
     ------------------------------------------------------------------------ */
  const LAB_DRUM_FILES = ['kick', 'snare', 'snare-soft', 'rim', 'hat', 'hat-soft', 'open', 'clap', 'tom-hi', 'tom-lo', 'crash', 'ride', 'tamb', 'shaker']; // snap: keine Quelle mit geklärter Lizenz (samples/LIZENZ.md) — Synthese
  // Pegel je Sample: die Dateien sind auf −1 dBFS normalisiert, die Synthese
  // klingt je Instrument deutlich leiser — so passen beide zusammen.
  const LAB_DRUM_LEVEL = { kick: .6, snare: .33, 'snare-soft': .33, rim: .3, hat: .13, 'hat-soft': .13, open: .13, clap: .3,
    'tom-hi': .45, 'tom-lo': .45, crash: .22, ride: .16, tamb: .16, shaker: .14, snap: .3 };

  class LabSamples {
    constructor(ctx) {
      this.ctx = ctx;
      this.buffers = {};
      this.alive = true;
      this.loading = null;
    }

    /** Stille am Anfang abschneiden (MP3-Vorlauf), sonst kommen die Schläge zu spät. */
    static trimOnset(ctx, buffer) {
      const data = buffer.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
      let start = 0;
      while (start < data.length && Math.abs(data[start]) < peak * .02) start++;
      start = Math.max(0, start - Math.round(buffer.sampleRate * .001));
      if (!start) return buffer;
      const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length - start, buffer.sampleRate);
      for (let c = 0; c < buffer.numberOfChannels; c++) out.copyToChannel(buffer.getChannelData(c).subarray(start), c);
      return out;
    }

    /** Alle Dateien laden, höchstens 3 gleichzeitig; Fehler → null, kein Abbruch. */
    load(files = LAB_DRUM_FILES, folder = 'drums') {
      const queue = [...files];
      const worker = async () => {
        while (queue.length && this.alive) {
          const id = queue.shift();
          try {
            const response = await fetch(`./samples/${folder}/${id}.mp3`);
            if (!response.ok) throw new Error(String(response.status));
            const decoded = await this.ctx.decodeAudioData(await response.arrayBuffer());
            if (this.alive) this.buffers[id] = LabSamples.trimOnset(this.ctx, decoded);
          } catch { if (this.alive) this.buffers[id] = null; }
        }
      };
      this.loading = Promise.all([worker(), worker(), worker()]);
      return this.loading;
    }

    get(id) { return this.buffers[id] || null; }
    dispose() { this.alive = false; this.buffers = {}; }
  }

  class GrooveEngine {
    constructor() {
      this.ctx = null;
      this.buses = null;
      this.layers = null;
      this.noiseBuffer = null;
      this.voices = new Set();
      this.inst = {};        // Sample-Instrumente (ensureInstrument): name → { ready, promise, samples | set }
      this.maxVoices = 32;   // Obergrenze gleichzeitiger Synth-Stimmen (Handy-CPU)
      this.lastMidi = {};    // je Ebene: letzte Note (für Glide)
      this.monoVoice = {};   // je Ebene: aktuelle Stimme im Mono-Modus
      this._reverbTimer = 0;
      this._reverbLength = 0;
      this.latencyHint = 'interactive'; // Puffer: 'interactive' (klein) | 'balanced' | 'playback' (groß) — gilt ab dem nächsten Kontext
    }

    get ready() { return !!this.ctx; }

    async start() {
      if (this.ctx) {
        if (this.ctx.state !== 'running') await this.ctx.resume();
        return;
      }
      const AudioContextClass = global.AudioContext || global.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio API nicht verfügbar');
      const ctx = new AudioContextClass({ latencyHint: this.latencyHint });
      this.ctx = ctx;
      this._buildGraph(ctx);
      this.labSamples = new LabSamples(ctx);
      this.labSamples.load(); // im Hintergrund; bis dahin klingt die Synthese
      this.bassSamples = new LabSamples(ctx);
      this.bassSamples.load(BASS_SAMPLE_NOTES.map(String), 'bass');
      this.lastMidi = {};
      this.monoVoice = {};
      await ctx.resume();
    }

    /** Der Audio-Graph (Pegel, Limiter, Chorus, Hall, Echo, Ebenen mit
     *  Waveshaper) — für den Live-Kontext und für den Lasttest im
     *  OfflineAudioContext derselbe Aufbau. Setzt `this.ctx === ctx` voraus
     *  (die Hilfen _impulseResponse/_whiteNoise lesen `this.ctx`). */
    _buildGraph(ctx) {
      const gain = (value, to) => { const g = ctx.createGain(); g.gain.value = value; if (to) g.connect(to); return g; };

      const master = gain(.8);
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = .002; limiter.release.value = .12;
      // Fester Vorpegel: gleicht die Lautheit an den früheren Kompressor an
      // (gemessen: Default-Groove, Peak -1,1 dBFS, Lautheit ±0,7 dB zu vorher) und hält
      // den Peak unter -1 dBFS. Bewusst nicht am Nutzer-Regler "master".
      const limiterTrim = gain(.78);
      master.connect(limiterTrim).connect(limiter).connect(ctx.destination);

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
      // Hall am Pumpen vorbei, mit Vorverzögerung und Hochpass: die Fahne
      // soll weder mitpumpen noch den Bass-/Kick-Bereich zuschmieren.
      const preDelay = ctx.createDelay(.1); preDelay.delayTime.value = .025;
      const reverbHP = ctx.createBiquadFilter();
      reverbHP.type = 'highpass'; reverbHP.frequency.value = 250; reverbHP.Q.value = .7;
      const reverbReturn = gain(1, master);
      reverbIn.connect(preDelay).connect(convolver).connect(reverbHP).connect(reverbReturn);

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

      this.buses = { master, drums, bass, duck, synthSum, chorusWet, convolver, delay, feedback, reverbIn, reverbReturn, echoIn };
      this.noiseBuffer = this._whiteNoise(.5);
    }

    async stop() {
      this.voices.forEach((v) => this._releaseVoice(v, true));
      this.voices.clear();
      clearTimeout(this._reverbTimer);
      this.labSamples?.dispose();
      this.labSamples = null;
      this.bassSamples?.dispose();
      this.bassSamples = null;
      for (const entry of Object.values(this.inst)) entry.samples?.dispose();
      this.inst = {};
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
      this.buses.chorusWet.gain.setTargetAtTime(fx.chorusOn === false ? 0 : clamp(fx.chorus, 0, 1) * .8, now, .03);
      // An/Aus je Effekt: nur der Eingang wird zu- bzw. aufgedreht — so
      // klingt ein Hall- oder Echo-Rest natürlich aus statt abzureißen.
      this.buses.reverbIn.gain.setTargetAtTime(fx.reverbOn === false ? 0 : 1, now, .03);
      this.buses.echoIn.gain.setTargetAtTime(fx.echoOn === false ? 0 : 1, now, .03);
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

    /** Kick: Sinus, der schnell von kickStart auf kickEnd fällt (Workshop
     *  Paket 6: einstellbar über state.kit). Mit KIT_DEFAULTS exakt der
     *  bisherige Klang: Fall in .11 s, Ausklang .19 s, Stopp nach .2 s. */
    playKick(time, velocity = 1, kit = KIT_DEFAULTS) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(kit.kickStart, time);
      osc.frequency.exponentialRampToValueAtTime(kit.kickEnd, time + Math.min(.11, kit.kickDecay * .6));
      gain.gain.setValueAtTime(.7 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + kit.kickDecay);
      osc.connect(gain).connect(this.buses.drums);
      osc.start(time); osc.stop(time + (kit.kickDecay + .01));
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

    /** Ein Sample über den Drum-Bus (oder `bus`) spielen. */
    playSample(buffer, time, velocity = 1, { bus = this.buses.drums, rate = 1, level = 1, highpass = 0 } = {}) {
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      gain.gain.value = level * velocity;
      let node = source;
      if (highpass) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = highpass; filter.Q.value = .7;
        node = source.connect(filter);
      }
      node.connect(gain).connect(bus);
      source.start(time);
      return gain;
    }

    /** Rückwärts abspielbarer Puffer (je Puffer einmal gerechnet). */
    _reversedBuffer(buffer) {
      this._reversed ||= new WeakMap();
      let reversed = this._reversed.get(buffer);
      if (!reversed) {
        reversed = this.ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
        for (let c = 0; c < buffer.numberOfChannels; c++) reversed.copyToChannel(buffer.getChannelData(c).slice().reverse(), c);
        this._reversed.set(buffer, reversed);
      }
      return reversed;
    }

    /**
     * Ein Sampler-Pad spielen (Paket 9): Bereich `meta.trim`, Lautstärke `gainDb`, Umstimmung
     * (`rate` oder `meta.pitch` + `semitones`), Rückwärts, Ausklingen (`decay`), Hall-Send.
     * Schläge und Loops laufen über den Drum-Bus, Töne (`layer: 'keys'`) über die Synth-Ebene —
     * so greifen Mixer, Pumpen und Effekte. Mit `duration` (Töne) hält die Note so lange, danach
     * 80 ms Release; ist der Bereich kürzer, wird er überblendet wiederholt (wie bei Chor/Streichern).
     * Liefert die Länge in Sekunden bis zum Ende (für Anzeige/Tests).
     */
    playPad(buffer, meta, time, velocity, { rate = null, semitones = 0, duration = null, layer = null } = {}) {
      const ctx = this.ctx;
      const total = buffer.duration;
      const start = clamp(meta.trim[0], 0, Math.max(0, total - .01));
      const end = clamp(meta.trim[1], start + .01, total);
      const length = end - start;
      const playRate = rate ?? Math.pow(2, (meta.pitch + semitones) / 12);
      const used = meta.reverse ? this._reversedBuffer(buffer) : buffer;
      const regionStart = meta.reverse ? total - end : start;
      const dest = layer ? this.layers[layer].input : this.buses.drums;
      const level = dbToGain(meta.gainDb) * velocity * .7;
      const wet = clamp(meta.reverb || 0, 0, 1);
      const piece = (t, offset, audible, fadeIn, fadeOut, endless = false) => {
        const src = ctx.createBufferSource();
        src.buffer = used;
        src.playbackRate.value = playRate;
        const g = ctx.createGain();
        g.gain.setValueAtTime(.0001, t);
        g.gain.linearRampToValueAtTime(level, t + Math.max(.002, fadeIn));
        src.connect(g).connect(dest);
        if (wet > 0) {
          const send = ctx.createGain();
          send.gain.value = wet * .9;
          g.connect(send).connect(this.buses.reverbIn);
        }
        let stop;
        if (endless) stop = t + audible; // bis zum Ende des Bereichs
        else {
          g.gain.setValueAtTime(level, t + audible);
          g.gain.linearRampToValueAtTime(.0001, t + audible + fadeOut);
          stop = t + audible + fadeOut + .02;
        }
        src.start(t, offset, (stop - t) * playRate + .05);
        src.stop(stop + .05);
        return stop;
      };
      const regionSec = length / playRate;
      if (duration === null) {
        // Schlag/Loop: ganzer Bereich, am Ende 10 ms ausgeblendet; `decay` kürzt ihn.
        const audible = Math.min(regionSec - .01, Math.max(.03, meta.decay));
        return piece(time, regionStart, Math.max(.02, audible), .002, .01) - time;
      }
      // Ton: hält `duration`, bei kurzem Bereich überblendet wiederholt.
      const loopFrom = regionStart + length * .35;
      const xfade = Math.min(.25, regionSec * .2);
      let t = time;
      let left = duration;
      let offset = regionStart;
      let fadeIn = .004;
      for (let k = 0; k < 64; k++) {
        const avail = (regionStart + length - offset) / playRate;
        if (left + .08 <= avail || k === 63) { piece(t, offset, Math.max(.02, left), fadeIn, .08); break; }
        const pieceLen = avail - xfade;
        piece(t, offset, pieceLen, fadeIn, xfade);
        t += pieceLen; left -= pieceLen; offset = loopFrom; fadeIn = xfade;
      }
      return duration + .08;
    }

    /** Synth-Tom (Fill ohne Tom-Samples): Sinus fällt von `from` auf `to` Hz. */
    playTom(time, velocity, low) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const [from, to] = low ? [140, 85] : [200, 120];
      osc.frequency.setValueAtTime(from, time);
      osc.frequency.exponentialRampToValueAtTime(to, time + .2);
      gain.gain.setValueAtTime(.5 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .25);
      osc.connect(gain).connect(this.buses.drums);
      osc.start(time); osc.stop(time + .27);
    }

    /**
     * Ein Schlag. `o`: mode ('synth' | 'acoustic' | 'hybrid' — aufgelöstes Kit),
     * hat ('ride'), soft (leise Hi-Hat), perc ('tamb' | 'shaker' | 'snap').
     * Je Spur: Sample, falls das Kit es verlangt und es geladen ist, sonst Synthese.
     */
    hitTrack(track, time, velocity = 1, kit = KIT_DEFAULTS, o = {}) {
      const mode = o.mode || 'synth';
      const sample = (id, v = velocity) => {
        if (mode === 'synth' || (mode === 'hybrid' && track === 'kick')) return false;
        const buffer = this.labSamples?.get(id);
        if (!buffer) return false;
        const gain = this.playSample(buffer, time, Math.min(1, v), { level: LAB_DRUM_LEVEL[id] ?? .3 });
        if (id === 'ride') {
          // Choke: der vorige Ride-Treffer blendet beim nächsten Schlag in 80 ms auf 30 % ab, das Becken staut sich nicht auf.
          const prev = this._lastRide;
          if (prev) { prev.gain.gain.setValueAtTime(prev.level, time); prev.gain.gain.linearRampToValueAtTime(prev.level * .3, time + .08); }
          this._lastRide = { gain, level: gain.gain.value };
        }
        return true;
      };
      if (track === 'kick') { if (!sample('kick')) this.playKick(time, velocity, kit); }
      else if (track === 'snare') {
        const ghost = velocity < .6;
        if (!sample(ghost ? 'snare-soft' : 'snare', ghost ? velocity * 1.8 : velocity)) this.playSnare(time, velocity);
      } else if (track === 'clap') { if (!sample('clap')) this.playClap(time, velocity); }
      else if (track === 'perc') {
        const perc = o.perc || 'tamb';
        if (sample(perc)) return;
        // Ohne Fingerschnipser-Sample: das Clap-Sample, ab 1,5 kHz (heller, trockener), Pegel .5; Rauschen nur, wenn auch das fehlt.
        const clap = perc === 'snap' && mode !== 'synth' ? this.labSamples?.get('clap') : null;
        if (clap) this.playSample(clap, time, Math.min(1, velocity), { level: .5, highpass: 1500 });
        else this.playNoise(time, { cutoff: 5000, length: .08, volume: .08 * velocity, type: 'bandpass', q: 1 });
      } else if (track === 'tom-hi' || track === 'tom-lo') { if (!sample(track)) this.playTom(time, velocity, track === 'tom-lo'); }
      else if (track === 'crash') { if (!sample('crash')) this.playNoise(time, { cutoff: 5500, length: .7, volume: .06 * velocity, type: 'highpass', q: .8 }); }
      else {
        const open = track === 'open';
        const id = open ? 'open' : o.hat === 'ride' ? 'ride' : o.soft ? 'hat-soft' : 'hat';
        if (!sample(id, o.soft && !open ? velocity * 1.4 : velocity)) this.playHat(time, velocity, open);
      }
    }

    /**
     * Bassnote. `duration` (s) = Gate: 5 ms Anstieg → Peak → in `decay` auf
     * Peak × `sustain` → halten bis `duration` → 60 ms Release. Ohne `duration`
     * (Vorhören, Pads) klingt sie kurz. `sound.sample`: nächster Ton aus
     * samples/bass, umgestimmt; fehlt er, klingt 'round'.
     */
    playBass(time, midi, velocity, sound, duration = .3) {
      const ctx = this.ctx;
      let buffer = null;
      let base = 0;
      if (sound.sample) {
        const bank = this.bassSamples;
        base = BASS_SAMPLE_NOTES.reduce((best, n) => (Math.abs(n - midi) < Math.abs(best - midi) ? n : best), BASS_SAMPLE_NOTES[0]);
        buffer = bank?.get(String(base)) || null;
        if (!buffer) { sound = BASS_SOUNDS.find((b) => b.id === 'round'); }
      }
      const gain = ctx.createGain();
      const t0 = time + .005;
      const decayEnd = t0 + sound.decay;
      const holdEnd = Math.max(t0 + .01, time + duration);
      const floor = .0001;
      const peak = sound.level * velocity;
      const sustain = Math.max(floor, peak * sound.sustain);
      gain.gain.setValueAtTime(floor, time);
      gain.gain.linearRampToValueAtTime(peak, t0);
      if (holdEnd <= decayEnd) {
        // Note endet noch im Abklingen: dort ansetzen, wo die Kurve gerade steht.
        gain.gain.exponentialRampToValueAtTime(Math.max(floor, peak * Math.pow(sustain / peak, (holdEnd - t0) / sound.decay)), holdEnd);
      } else {
        gain.gain.exponentialRampToValueAtTime(sustain, decayEnd);
        gain.gain.setValueAtTime(sustain, holdEnd);
      }
      gain.gain.exponentialRampToValueAtTime(floor, holdEnd + .06);
      const stop = holdEnd + .08;
      let source;
      if (buffer) {
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = Math.pow(2, (midi - base) / 12);
        source.connect(gain).connect(this.buses.bass);
      } else {
        source = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        source.type = sound.wave;
        source.frequency.setValueAtTime(noteHz(midi), time);
        filter.type = 'lowpass'; filter.Q.value = sound.q;
        filter.frequency.setValueAtTime(sound.cutoff + sound.envAmount, time);
        if (sound.envAmount) filter.frequency.exponentialRampToValueAtTime(sound.cutoff, time + sound.decay * .8);
        source.connect(filter).connect(gain).connect(this.buses.bass);
      }
      source.start(time); source.stop(stop);
    }

    /* ---- Sample-Instrumente (Klavier, Gitarre, Chor, Streicher, Brass) ---- */

    /** Instrument im Hintergrund laden (einmal je Kontext). Liefert ein Promise
     *  auf true/false; bis es fertig ist, klingt der Ersatzklang (SAMPLE_FALLBACK). */
    ensureInstrument(name) {
      if (!this.ctx || !LAB_INST[name]) return Promise.resolve(false);
      if (this.inst[name]) return this.inst[name].promise;
      const cfg = LAB_INST[name];
      const entry = { ready: false, promise: null, samples: null, set: null };
      this.inst[name] = entry;
      const fail = () => { if (this.inst[name] === entry) delete this.inst[name]; return false; }; // später erneut versuchen
      if (name === 'piano') {
        // Das Klavier lädt piano-samples.js (Salamander, mit Stimmungskorrektur), falls die App es geladen hat.
        if (!global.ChorPiano) entry.promise = Promise.resolve(fail());
        else {
          entry.promise = global.ChorPiano.load({ notes: cfg.notes, keepSec: () => 4 })
            .then((set) => { entry.set = set; entry.ready = true; return true; }, fail);
        }
      } else {
        const samples = new LabSamples(this.ctx);
        entry.samples = samples;
        entry.promise = samples.load(cfg.notes.map(String), cfg.folder)
          .then(() => { entry.ready = cfg.notes.some((n) => samples.get(String(n))); return entry.ready || fail(); }, fail);
      }
      return entry.promise;
    }

    instrumentReady(name) { return !!this.inst[name]?.ready; }

    /** Eine Sample-Note als Stimme (gleiche Form wie eine Synth-Stimme, damit Freigabe,
     *  Stimmenlimit und Automation sie gleich behandeln). Hüllkurve: Attack/Release aus
     *  dem Klang, Filter und Drive (Ebene) bleiben wirksam. Chor und Streicher halten
     *  lange Töne mit überblendetem Loop, die übrigen klingen natürlich aus. */
    _playSampleTone(sound, midi, time, velocity, duration, layer) {
      const ctx = this.ctx;
      const L = this.layers[layer];
      const cfg = LAB_INST[sound.sample];
      const entry = this.inst[sound.sample];
      let buffer;
      let rate;
      let level = cfg.level;
      if (sound.sample === 'piano') {
        const base = global.ChorPiano.nearest(entry.set, midi);
        buffer = entry.set.bufs[base];
        rate = global.ChorPiano.rateFor(midi, base);
        level *= entry.set.gain[base] || 1;
      } else {
        const loaded = cfg.notes.filter((n) => entry.samples.get(String(n)));
        const base = loaded.reduce((best, n) => (Math.abs(n - midi) < Math.abs(best - midi) ? n : best), loaded[0]);
        buffer = entry.samples.get(String(base));
        rate = Math.pow(2, (midi - base) / 12);
      }
      if (this.voices.size >= this.maxVoices) {
        for (const oldest of this.voices) { if (oldest.layer !== 'drone') { this._releaseVoice(oldest, true); break; } }
      }
      const filter = ctx.createBiquadFilter();
      filter.type = sound.filterType || 'lowpass';
      filter.Q.value = sound.resonance;
      filter.frequency.value = Math.min(sound.cutoff, ctx.sampleRate * .45);
      const gain = ctx.createGain();
      const attack = Math.max(.003, sound.attack);
      const peak = velocity * level;
      gain.gain.setValueAtTime(.0001, time);
      if (duration && duration < attack) gain.gain.linearRampToValueAtTime(Math.max(.0001, peak * duration / attack), time + duration);
      else gain.gain.linearRampToValueAtTime(peak, time + attack);
      let stopAt = null;
      if (duration) {
        gain.gain.setTargetAtTime(0, time + duration, Math.max(.01, sound.release / 4));
        stopAt = time + duration + sound.release * 1.3 + .05;
      }
      filter.connect(gain).connect(L.input);

      const sources = [];
      const piece = (t, offset, length, fadeIn, fadeOut) => {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;
        const g = ctx.createGain();
        g.gain.setValueAtTime(fadeIn ? .0001 : 1, t);
        if (fadeIn) g.gain.linearRampToValueAtTime(1, t + fadeIn);
        let end = null;
        if (length !== null) {
          g.gain.setValueAtTime(1, t + length);
          g.gain.linearRampToValueAtTime(.0001, t + length + fadeOut);
          end = t + length + fadeOut + .02;
        }
        src.connect(g).connect(filter);
        src.start(t, offset);
        if (end !== null) src.stop(end);
        sources.push(src);
      };
      const long = cfg.long;
      if (!long) piece(time, 0, null, 0, 0);
      else {
        // Wie sampleNote in uebe-lab.html: Stücke ab loopFrom, am Übergang überblendet.
        let t = time;
        let left = duration ?? 10;
        let offset = 0;
        let fadeIn = 0;
        for (let k = 0; k < 64; k++) {
          const avail = (buffer.duration - offset) / rate - long.tail;
          if (left + sound.release <= avail || k === 63) { piece(t, offset, null, fadeIn, 0); break; }
          const length = avail - long.xfade;
          piece(t, offset, length, fadeIn, long.xfade);
          t += length; left -= length; offset = long.loopFrom; fadeIn = long.xfade;
        }
      }
      if (stopAt !== null) sources.forEach((src) => { try { src.stop(Math.min(stopAt, ctx.currentTime + 60)); } catch { /* schon gestoppt */ } });
      const voice = { oscillators: sources, lfos: [], gain, filter, envEnd: time + attack, release: sound.release, done: false, layer };
      this.voices.add(voice);
      sources[sources.length - 1].addEventListener('ended', () => { voice.done = true; this.voices.delete(voice); }, { once: true });
      return voice;
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
      if (sound.sample) {
        if (this.instrumentReady(sound.sample)) return this._playSampleTone(sound, midi, time, velocity, duration, layer);
        // Samples fehlen noch (oder offline): Ersatzklang, nebenbei weiter laden.
        this.ensureInstrument(sound.sample);
        sound = soundFromPreset(presetIndexByName(SAMPLE_FALLBACK[sound.sample]));
      }
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

      const voice = { oscillators, lfos, gain, filter, envEnd: time + attack + sound.decay, release: sound.release, done: false, layer };
      if (stopAt !== null) {
        oscillators.forEach((osc) => osc.stop(stopAt));
        lfos.forEach((lfo) => lfo.stop(stopAt));
      }
      this.voices.add(voice);
      if (sound.mono) this.monoVoice[layer] = voice;
      oscillators[0].addEventListener('ended', () => { voice.done = true; this.voices.delete(voice); }, { once: true });
      return voice;
    }

    /** Automation: Filter klingender Stimmen nachführen (nach ihrer
     *  Filter-Hüllkurve, sonst würde deren Verlauf abgeschnitten). */
    modulateLive(layers, sound, time) {
      if (!this.ctx) return;
      const nyquist = this.ctx.sampleRate / 2 - 100;
      this.voices.forEach((voice) => {
        if (voice.done || !voice.filter || !layers.includes(voice.layer) || time < voice.envEnd) return;
        voice.filter.frequency.setTargetAtTime(Math.min(sound.cutoff, nyquist), time, .03);
        voice.filter.Q.setTargetAtTime(sound.resonance, time, .03);
      });
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

  /* Überlastung: Puffergrößen (latencyHint) und Schwellen der Erkennung. */
  const LATENCY_HINTS = ['interactive', 'balanced', 'playback'];
  const OVERLOAD_WINDOW_MS = 10000;   // so viele Aussetzer ...
  const OVERLOAD_EVENTS = 3;          // ... in diesem Fenster zeigen das Ausrufezeichen
  const OVERLOAD_GAP_MS = 150;        // Scheduler-Lücke (erwartet 25 ms) = Hauptthread hängt
  const OVERLOAD_RATIO = .9;          // Audiozeit pro Wanduhrzeit darunter = Audiothread kommt nicht hinterher
  const RC_PEAK_LOAD = .95;           // renderCapacity: Spitzenlast ab hier (oder underrunRatio > 0) = Aussetzer
  const LOADTEST_SECONDS = 4;         // Lasttest: so lange Musik im OfflineAudioContext rendern
  const LOADTEST_WARN = 40, LOADTEST_HIGH = 70; // % Echtzeit: ab hier gelb bzw. rot
  /** Einordnung des Lasttests (Renderdauer in % der Musikdauer). */
  const loadLevel = (pct) => (pct >= LOADTEST_HIGH ? 'high' : pct >= LOADTEST_WARN ? 'mid' : 'ok');

  class GrooveLabView extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = GrooveLabView.markup();

      this.engine = new GrooveEngine();
      this.state = defaultState();
      this.ui = { tab: 'beat', beatCat: 'all', melodyCat: 'all', presetCat: 'all', latchOn: false, picker: null,
        melEdit: false, melBar: 0, melLen: 2, melChroma: false, melAlt: 0, melUndo: [], melRedo: [],
        progCat: 'all', progEdit: false, progSel: 0, progUndo: [], progRedo: [],
        // de:construct: was gerade klingt (A = 'orig', B = 'mine'), welche
        // Spur allein, Stufenwahl offen?, Rückfrage vor dem Auflösen.
        dc: { listen: 'orig', focus: 'all', choosing: false, level: 'easy', song: null, revealAsk: false, active: null, tpl: false,
          tries: {}, sheet: null, last: null, menu: false } };
      // Einspielen: Phase idle → armed (zählt ein) → recording → done.
      // Automation aufnehmen: Phase idle → armed (zählt ein) → recording.
      this.autoRec = { phase: 'idle', bars: 2, startStep: 0, startTime: 0, stepSec: 0, barSteps: 16, events: [], last: null, base: null };
      this._soundLabels = {};
      this.rec = { phase: 'idle', bars: 2, startStep: 0, startTime: 0, stepSec: 0, barSteps: 16, notes: [], open: new Map(), take: null };

      // Überlastungsanzeige: Zeitpunkte erkannter Aussetzer, letzter Scheduler-
      // Tick, letzter Vergleich Audiozeit/Wanduhr, Zähler der Browser-Statistik.
      this._ovl = { events: [], lastEvent: 0, lastTick: 0, ratioWall: 0, ratioAudio: 0, underruns: 0, underrunDuration: 0, warn: false, visibleSince: performance.now(),
        // Diagnose: wie oft welches Anzeichen angeschlagen hat, Rechenlast-Quelle (renderCapacity),
        // Lasttest-Ergebnis, Ausgabegerät, Sekundentakt der Anzeige.
        counts: { gap: 0, ratio: 0, underrun: 0, load: 0 }, rc: null, rcCtx: null, rcHandler: null, rcStats: null,
        test: null, testing: false, device: '', timer: 0 };
      document.addEventListener('visibilitychange', () => { this._ovl.visibleSince = performance.now(); this._ovl.lastTick = 0; this._ovl.ratioWall = 0; });

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
      this._mic = null;
      // Sampler (Paket 9): Metadaten, Puffer und Blobs der Samples dieses Geräts, Ansicht und Aufnahme.
      this.sampler = { meta: new Map(), buffers: new Map(), blobs: new Map(), loading: new Map(), peaks: new Map(), peakCache: new Map(),
        decoder: null, loaded: false, view: 'pads', sel: 0, draft: null, draftBuffer: null, draftPeaks: null, draftNew: false, rec: null, live: true, bluetoothHint: false };
      this.stepClock = null;   // zuletzt eingeplanter Schritt { g, time } — für das Einrasten beim Live-Einspielen
      this._saved = { slots: [null, null, null, null], last: null, melodies: [], progressions: [], workshop: sanitizeWorkshopProgress(null), deconstruct: null, latency: 'interactive' };
      // de:construct: Solange die Ansicht offen ist, hält this.state „Meine
      // Version“ (_dcActive); der Studio-Stand wartet samt Undo in _dcStash.
      this._dcActive = false;
      this._dcStash = null;
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

    open({ accent, storage, entry, mic } = {}) {
      this._restoreFocusTo = document.activeElement;
      // Einstieg: über Tools → „Chor“, Easter Egg → „Studio“ (solange keine
      // Ansicht gespeichert ist).
      // Kachel „de:construct“ im Tools-Reiter öffnet direkt diese Ansicht.
      this._entry = entry === 'tools' || entry === 'deconstruct' ? entry : 'egg';
      this._applyView(this._entry === 'deconstruct' ? 'deconstruct' : this.state.view);
      this.style.setProperty('--accent', accent || '#f868b0');
      const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(accent || '');
      this.style.setProperty('--accent-rgb', match
        ? `${parseInt(match[1], 16)},${parseInt(match[2], 16)},${parseInt(match[3], 16)}`
        : '248,104,176');

      if (storage && typeof storage.load === 'function') this._storage = storage;
      this._mic = mic && typeof mic.open === 'function' ? mic : null;
      this._loadStorage();

      this._bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      this.hidden = false;
      document.addEventListener('keydown', this._onKeydown);
      document.addEventListener('keyup', this._onKeyup);
      requestAnimationFrame(() => this.$('.transport-play')?.focus());
    }

    async close() {
      this._toggleOverloadPop(false, { focus: false });
      this._smpRecAbort();
      this._closeConfirm();
      this._setBeatZoom(false);
      this.stop();
      this._releaseAllKeys();
      this._stopDrone();
      this.state.droneOn = false;
      this._closeSheet();
      this._dcSheetClose({ focus: false });
      this.ui.dc.menu = false;
      this._closePicker({ focus: false });
      this._wsAbReset(); // nie im „Vorher“ speichern
      clearTimeout(this._dcSaveTimer);
      // In de:construct hält this.state „Meine Version“ (landet über
      // _persist in der Ablage `deconstruct`); als letzter Stand gilt der
      // Studio-Stand — mit der Ansicht, damit es beim nächsten Mal hier weitergeht.
      this._saved.last = this._dcActive && this._dcStash
        ? { ...JSON.parse(JSON.stringify(this._dcStash.state)), view: 'deconstruct' }
        : this._snapshot();
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
      this._loadSamplesFromStorage();
      Promise.resolve(this._storage.load()).then((data) => {
        if (!data || typeof data !== 'object') return;
        const slots = Array.isArray(data.slots) ? data.slots : [];
        this._saved.slots = [0, 1, 2, 3].map((i) => (slots[i] && typeof slots[i] === 'object' ? slots[i] : null));
        this._saved.melodies = sanitizeMelodyLibrary(data.melodies);
        this._saved.progressions = sanitizeProgLibrary(data.progressions);
        this._saved.workshop = sanitizeWorkshopProgress(data.workshop);
        // Ablagen von vor de:construct haben kein Feld `deconstruct` → null.
        this._saved.deconstruct = sanitizeDeconstruct(data.deconstruct);
        if (LATENCY_HINTS.includes(data.latency)) {
          this._saved.latency = data.latency;
          this.engine.latencyHint = data.latency;
        }
        this._renderMelody();
        this._renderHarmony();
        // Den letzten Stand nur übernehmen, solange noch nichts gespielt oder
        // verändert wurde — sonst überschriebe ein langsames Laden Eingaben.
        if (data.last && !this.playing && !this.history.length) {
          // Lief de:construct schon (noch ohne Song), neu betreten: dann
          // wird der geladene Stand zum Studio-Stand und „Meine Version“ geladen.
          this._dcActive = false;
          this._dcStash = null;
          this.state = sanitizeState(data.last);
          this._afterStateChange();
          this._applyView(this._entry === 'deconstruct' ? 'deconstruct' : this.state.view);
        } else if (this._dcActive && this._saved.deconstruct && !this.history.length && !this.playing) {
          this._applyState(sanitizeState(this._saved.deconstruct.mine), { history: false });
          this._applyView('deconstruct');
        }
        this._renderWorkshop();
        this._renderSheet();
      }).catch((err) => console.warn('[groove-lab] Stand nicht geladen', err));
    }

    _persist() {
      if (this._dcActive && this._saved.deconstruct) this._saved.deconstruct.mine = this._snapshot();
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
      this._wsAbReset();
      const prev = this.history.pop();
      if (!prev) return;
      this._applyState(sanitizeState(JSON.parse(prev)), { history: false });
    }

    _applyState(state, { history = true } = {}) {
      if (history) this._pushHistory();
      const droneWasOn = this.state.droneOn;
      const view = this.state.view;
      this.state = state;
      this.state.droneOn = droneWasOn;
      this.state.view = view; // die Ansicht ist keine Musik — Undo/Zufall lassen sie
      this._afterStateChange();
    }

    /** Nach jeder größeren Zustandsänderung: Satz neu rechnen, Engine
     *  angleichen, Liegeton umstimmen, alles neu zeichnen. */
    _afterStateChange() {
      this._voicingCache = null;
      this._syncEngine();
      this._retuneDrone();
      this._renderAll();
      this._wsSchedule();
    }

    _summary(state) {
      const pattern = DRUM_PATTERNS[state.patternIndex];
      const mode = MODES.find((m) => m.id === state.modeId);
      return `${pattern.name} · ${spell(state.keyRoot, state.keyRoot, state.modeId, labLang)} ${t(mode.nameKey)} · ${tempoSymbol(pattern.meter)} = ${state.bpm}`;
    }

    /* ---- Ansicht: Chor · Studio (Didaktik Paket 8) ---- */

    _applyView(view) {
      const v = VIEWS.includes(view) ? view : (this._entry === 'tools' ? 'choir' : 'studio');
      // Beim Verlassen des Workshops immer auf „Nachher“ zurück.
      if (v !== 'workshop') this._wsAbReset();
      // de:construct verlassen: „Meine Version“ ablegen, Studio-Stand zurück.
      if (v !== 'deconstruct' && this._dcActive) { this._dcSheetClose({ focus: false }); this.ui.dc.menu = false; this._dcLeave(); }
      this.state.view = v;
      if (v === 'deconstruct' && !this._dcActive) this._dcEnter();
      const choir = v === 'choir';
      const workshop = v === 'workshop';
      const dcView = v === 'deconstruct';
      // Ohne Song zeigt de:construct nur die Auswahl, keine Reiter.
      const dcEmpty = dcView && (!this._saved.deconstruct || this.ui.dc.choosing);
      this.$all('[data-action="view"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === v)));
      this.$('.view-select').value = v;
      this.$('.tab-bar').hidden = choir || workshop || dcEmpty;
      // de:construct baut mit den bekannten Reitern — der Sampler gehört nicht dazu.
      const smpBtn = this.$('.tab-btn[data-tab="sampler"]');
      if (smpBtn) smpBtn.hidden = dcView;
      if ((dcView || workshop) && this.ui.tab === 'sampler') this.ui.tab = 'beat';
      this.$('.choir-view').hidden = !choir;
      this.$('.workshop-view').hidden = !workshop;
      this.$('.dc-view').hidden = !dcView;
      if (choir || dcEmpty) this.$all('.tab-panel').forEach((panel) => { panel.hidden = true; });
      else this._setTab(this.ui.tab);
      if (workshop) this._wsEnter();
      this._renderChoir();
      this._renderDeconstruct();
      this._wsDecorate();
      this._applySound(); // Klang-Rätsel: außerhalb des Workshops immer der eigene Klang
    }

    /* ---- Ansicht: de:construct ----
       Ein verborgener Song (this._saved.deconstruct.original) läuft; gebaut
       wird mit den normalen Reitern in this.state („Meine Version“). Der
       Scheduler spielt je Schritt entweder das eine oder das andere
       (_dcHeard), ohne den Transport anzuhalten. */

    /** Laufender de:construct-Song oder null (nur in der Ansicht). */
    _dc() {
      return this._dcActive ? this._saved.deconstruct : null;
    }

    _dcEnter() {
      this._dcStash = { state: this._snapshot(), history: this.history };
      this.history = [];
      this._dcActive = true;
      this.ui.dc.listen = 'orig';
      this.ui.dc.focus = 'all';
      this.ui.dc.revealAsk = false;
      const dc = this._saved.deconstruct;
      this.ui.dc.choosing = !dc;
      if (dc) this._dcSwap(sanitizeState(dc.mine));
      else this._renderTransport();
    }

    _dcLeave() {
      const dc = this._saved.deconstruct;
      if (dc) dc.mine = this._snapshot();
      const stash = this._dcStash;
      this._dcActive = false;
      this._dcStash = null;
      this.ui.dc.listen = 'mine';
      this.ui.dc.choosing = false;
      if (stash) {
        this._dcSwap(sanitizeState(stash.state));
        this.history = stash.history;
      }
      this._syncEngine();
      this._renderTransport();
      this._persist();
    }

    /** Zustand tauschen ohne Undo-Eintrag, taktgenau weiter (wie _wsSwap). */
    _dcSwap(state) {
      const stepsBefore = this._barSteps();
      this._applyState(state, { history: false });
      if (this.playing) this.globalStep = dcSwitchStep(this.globalStep, stepsBefore, this._barSteps());
    }

    /** Was der Scheduler gerade spielt: Original nur in de:construct mit
     *  Song, auf A, und nicht während einer Aufnahme. */
    _dcHearsOriginal() {
      const dc = this._dc();
      return !!dc && !this.ui.dc.choosing && this.ui.dc.listen === 'orig'
        && this.rec.phase === 'idle' && this.autoRec.phase === 'idle';
    }

    /** fn mit dem gerade hörbaren Stand als this.state ausführen. Alle
     *  abgeleiteten Werte (Takt, Tempo, Harmonie, Klang) lesen this.state —
     *  so spielt der unveränderte Scheduler das Original, ohne dass es je
     *  in den Editoren sichtbar wird. */
    _dcHeard(fn) {
      if (!this._dcHearsOriginal()) return fn();
      const mine = this.state;
      this.state = this._saved.deconstruct.original;
      this._dcMine = mine;
      const cache = this._voicingCache;
      this._voicingCache = this._dcVoicingCache || null;
      try { return fn(); } finally {
        this._dcVoicingCache = this._voicingCache;
        this._voicingCache = cache;
        this._dcMine = null;
        this.state = mine;
      }
    }

    /** „Nur …“: diese Spur klingt (in A und B), alle anderen schweigen. */
    _dcHears(part) {
      const focus = this._dc() ? this.ui.dc.focus : 'all';
      return focus === 'all' || focus === part;
    }

    /** A/B umschalten — gleicher Takt, gleiche Stelle (dcSwitchStep). */
    _dcListen(side) {
      const dc = this._dc();
      if (!dc || (side !== 'orig' && side !== 'mine') || side === this.ui.dc.listen) return;
      const stepsBefore = this._dcHeard(() => this._barSteps());
      this.ui.dc.listen = side;
      const stepsAfter = this._dcHeard(() => this._barSteps());
      if (this.playing) this.globalStep = dcSwitchStep(this.globalStep, stepsBefore, stepsAfter);
      this._syncEngine(); // Pegel, Klang und Effekte der jetzt hörbaren Seite
      this._renderDeconstruct();
      this._renderNow();
    }

    _dcFocus(part) {
      if (!DC_FOCUS.includes(part)) return;
      this.ui.dc.focus = part;
      this._renderDeconstruct();
    }

    /** Aktives Element: gewähltes, sonst das erste nicht geschaffte der Stufe. */
    _dcActiveElement() {
      const dc = this._saved.deconstruct;
      if (!dc) return null;
      const elements = dcLevel(dc.level).elements;
      if (!elements.includes(this.ui.dc.active)) this.ui.dc.active = dcFirstOpen(elements, dc.done);
      return this.ui.dc.active;
    }

    /** Element wählen: passender Reiter, aber kein Wegscrollen. */
    _dcPick(element) {
      const dc = this._dc();
      if (!dc || !dcLevel(dc.level).elements.includes(element)) return;
      this.ui.dc.active = element;
      const body = this.$('.lab-body');
      const top = body.scrollTop;
      this._setTab(DC_TAB[element]);
      body.scrollTop = top;
      this._renderDeconstruct();
    }

    /** Beat-Raster komplett leeren (alle Spuren inkl. Bass) — ein Undo-Schritt. */
    _dcClearGrid() {
      if (!this._dc()) return;
      this._pushHistory();
      for (const track of Object.keys(this.state.beat)) this.state.beat[track] = {};
      this.state.beatEdited = true;
      this._renderBeat();
      this._dcAutosave();
    }

    /** Lupe: Beat-Editor bildschirmfüllend mit großen Feldern (Kopf, Reiter
     *  und übrige Panels weg, Transport bleibt). Hochkant teilt sich jeder
     *  Takt auf zwei Zeilen, damit die Felder breit genug zum Tippen sind. */
    _setBeatZoom(on) {
      on = !!on && this.ui.tab === 'beat';
      if (!!this.ui.beatZoom === on) return;
      this.ui.beatZoom = on;
      this.classList.toggle('beat-zoom', on);
      this.$('.lab-body').scrollTop = 0;
      const target = on ? this.$('.zoom-done') : [...this.$all('.zoom-btn')].find((b) => b.getClientRects().length);
      target?.focus({ preventScroll: true });
      if (on) this._zoomLandscape(); else this._zoomRelease();
    }

    /** Lupe am Handy quer: Das Manifest hält die installierte App im
     *  Hochformat (Android dreht dann gar nicht mit) — deshalb wie beim Piano
     *  Vollbild und Querformat-Sperre, beim Schließen wieder frei. Wo es das
     *  nicht gibt (iOS), bleibt das Drehen des Geräts bzw. hochkant die
     *  zweizeilige Ansicht. */
    async _zoomLandscape() {
      if (!global.matchMedia?.('(pointer: coarse)').matches) return;
      try {
        if (!document.fullscreenElement && this.requestFullscreen) { await this.requestFullscreen({ navigationUI: 'hide' }); this._zoomFs = true; }
      } catch { /* ohne Vollbild */ }
      try { await global.screen?.orientation?.lock?.('landscape'); this._zoomLocked = true; } catch { /* nicht unterstützt */ }
      if (!this.ui.beatZoom) this._zoomRelease(); // schon wieder zu
    }

    _zoomRelease() {
      if (this._zoomLocked) { try { global.screen.orientation.unlock(); } catch { /* nichts zu entsperren */ } }
      if (this._zoomFs && document.fullscreenElement === this) document.exitFullscreen?.().catch(() => {});
      this._zoomLocked = false;
      this._zoomFs = false;
    }

    /** Rückfrage im Lab selbst — window.confirm beendet das Vollbild der Lupe. */
    _confirm({ text, ok, onOk }) {
      this._confirmOk = onOk;
      this._confirmReturn = this.shadowRoot.activeElement;
      this.$('.confirm-text').textContent = text;
      this.$('.confirm-yes').textContent = ok;
      this.$('.confirm').hidden = false;
      this.$('.confirm-no').focus();
    }

    _closeConfirm() {
      const box = this.$('.confirm');
      this._confirmOk = null;
      if (box.hidden) return;
      box.hidden = true;
      if (this._confirmReturn?.isConnected) this._confirmReturn.focus({ preventScroll: true });
      this._confirmReturn = null;
    }

    /** Neuer Song: ersetzt Original, „Meine Version“ und Fortschritt.
     *  Das Antippen ist die Geste für den AudioContext — das Original läuft los. */
    _dcNew(songId) {
      if (!this._dcActive || !DC_SONGS.some((x) => x.id === songId)) return;
      const dc = dcNewSong(songId, localDate(), this._saved.deconstruct?.solved);
      this._dcSheetClose({ focus: false });
      this._saved.deconstruct = dc;
      this.history = [];
      this.ui.dc = { ...this.ui.dc, listen: 'orig', focus: 'all', choosing: false, level: dc.level, song: dc.song, revealAsk: false, active: null, tpl: false, hints: {}, tries: {}, sheet: null, last: null, menu: false };
      this.tapTimes = [];
      this._dcSwap(sanitizeState(dc.mine));
      this.ui.tab = 'beat';
      this._applyView('deconstruct');
      this._dcAnnounce(t('lab.dc.started'));
      this._persist();
      if (!this.playing) this.start();
    }

    /** Vorschlag in der Auswahl: der nächste noch nicht geschaffte Song
     *  der Stufe nach dem laufenden (sonst der erste der Stufe). */
    _dcSuggest(levelId) {
      const list = dcSongsOf(levelId);
      const dc = this._saved.deconstruct;
      const solved = dc?.solved || {};
      const at = list.findIndex((x) => x.id === dc?.song);
      const order = [...list.slice(at + 1), ...list.slice(0, at + 1)];
      return (order.find((x) => !solved[x.id] && x.id !== dc?.song) || order[0]).id;
    }

    /** Ein Element prüfen; „stimmt“ markiert es dauerhaft als geschafft. */
    _dcCheck(element) {
      const dc = this._dc();
      if (!dc || !dcLevel(dc.level).elements.includes(element)) return;
      const result = dcCompare(dc.original, this.state, element);
      dc.checks[element] = result.status;
      this.ui.dc.hints = { ...(this.ui.dc.hints || {}), [element]: result.hints };
      // Versuche je Element (nur Sitzung): ab dem dritten ohne „stimmt“ bietet das Blatt Hilfe an.
      const tries = this.ui.dc.tries || (this.ui.dc.tries = {});
      tries[element] = result.status === 'ok' ? 0 : (tries[element] || 0) + 1;
      if (result.status === 'ok' && !dc.done[element]) dc.done[element] = localDate();
      // Ganz nachgebaut (ohne Auflösen, auch nicht einzeln): der Song zählt in der Auswahl als geschafft.
      const pure = !dc.revealed && !Object.values(dc.revealedEls || {}).some(Boolean);
      if (pure && !dc.solved[dc.song] && dcLevel(dc.level).elements.every((el) => dc.done[el])) dc.solved[dc.song] = localDate();
      const text = `${t(`lab.dc.el.${element}`)}: ${t(`lab.dc.status.${result.status}`)}${result.hints.length ? ` – ${this._dcHintText(result.hints)}` : ''}`;
      this._dcAnnounce(text);
      this._persist();
      this.ui.dc.last = { element, status: result.status, hints: result.hints, parts: result.parts || null, tries: tries[element] };
      this.ui.dc.sheet = element;
      this.ui.dc.menu = false;
      this._renderDeconstruct();
      this._dcSheetOpen();
    }

    /* ---- Prüf-Blatt (Bottom-Sheet) ---- */

    _dcSheetOpen() {
      const sheet = this.$('.dc-sheet');
      if (!sheet || !this.ui.dc.last) return;
      sheet.style.setProperty('--dc-bar-h', `${this.$('.transport-bar').offsetHeight}px`);
      this._renderDcSheet();
      sheet.hidden = false;
      this.$('.dc-sheet-card').focus();
    }

    _dcSheetClose({ focus = true } = {}) {
      const sheet = this.$('.dc-sheet');
      this.ui.dc.sheet = null;
      if (!sheet || sheet.hidden) return;
      sheet.hidden = true;
      const check = this.$('.dc-check-btn');
      if (focus && check?.getClientRects().length) check.focus();
    }

    /** Hören-Fokus, der zu einem Element passt (Tempo und Klang haben keine Spur). */
    _dcFocusOf(element) {
      return DC_FOCUS.includes(element) && element !== 'all' ? element : null;
    }

    _dcHelpListen(element) {
      const part = this._dcFocusOf(element);
      if (!this._dc() || !part) return;
      this._dcSheetClose({ focus: false });
      this.ui.dc.focus = part;
      this._dcListen('orig');
      this._renderDeconstruct();
      this._dcAnnounce(tf('lab.dc.help.listening', { part: t(`lab.dc.short.${element}`) }));
      this.$('.dc-check-btn')?.focus();
    }

    /** Nur dieses Element auflösen: Lösung nur hier sichtbar, der Song zählt nicht mehr als ganz selbst gebaut. */
    _dcHelpReveal(element) {
      const dc = this._dc();
      if (!dc || !dcLevel(dc.level).elements.includes(element)) return;
      if (!dc.revealedEls) dc.revealedEls = {};
      dc.revealedEls[element] = true;
      this.ui.dc.active = element;
      this._dcSheetClose({ focus: false });
      this._persist();
      this._renderDeconstruct();
      this.$('.dc-el-solution')?.focus();
    }

    _renderDcSheet() {
      const dc = this._saved.deconstruct;
      const last = this.ui.dc.last;
      if (!dc || !last) return;
      const { element, status, parts } = last;
      const elements = dcLevel(dc.level).elements;
      const next = dcNextElement(elements, dc.done, element);
      const allDone = status === 'ok' && elements.every((el) => dc.done[el]);
      const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
      const sym = { ok: '✓', near: '≈', no: '✗' };
      const name = t(`lab.dc.el.${element}`);

      const mark = this.$('.dc-sheet-mark');
      mark.className = `dc-sheet-mark is-${status}`;
      mark.textContent = sym[status];
      this.$('.dc-sheet-title').textContent = allDone ? t('lab.dc.sheet.allDone') : tf(`lab.dc.sheet.title.${status}`, { el: name });
      // Kurze Zeile: bei Beat/Bass zählt sie die Treffer, sonst nur die Stufe.
      let sub = t(`lab.dc.sheet.sub.${status}`);
      if (Array.isArray(parts) && parts.length) sub = tf('lab.dc.sheet.sub.tracks', { n: parts.filter((x) => x.ok).length, total: parts.length });
      else if (parts && typeof parts === 'object') sub = tf('lab.dc.sheet.sub.bass', { n: Number(parts.rhythm) + Number(parts.notes) });
      if (allDone) sub = tf('lab.dc.sheet.sub.all', { n: elements.length });
      this.$('.dc-sheet-sub').textContent = sub;

      // Detail-Liste: ✓/✗ je Spur bzw. Teil — ohne Schritte.
      const list = this.$('.dc-parts');
      const rows = [];
      if (Array.isArray(parts)) {
        for (const p of parts) rows.push({ ok: p.ok, soft: p.soft, name: trackLabel(p.id), sub: t(`lab.dc.bridge.${p.id}`) });
      } else if (parts) {
        rows.push({ ok: parts.rhythm, name: t('lab.dc.part.rhythm'), sub: t('lab.dc.part.rhythmSub') });
        rows.push({ ok: parts.notes, name: t('lab.dc.part.notes'), sub: t('lab.dc.part.notesSub') });
      }
      list.hidden = !rows.length;
      list.replaceChildren(...rows.map((r) => {
        const kind = r.ok ? 'ok' : r.soft ? 'near' : 'no';
        const li = el('li', `dc-part is-${kind}`);
        const m = el('span', 'dc-part-mark');
        m.setAttribute('aria-hidden', 'true');
        m.textContent = sym[kind];
        const text = el('span', 'dc-part-text');
        text.append(el('span', 'dc-part-name', r.name), el('span', 'dc-part-sub', r.sub));
        li.append(m, text, el('span', 'dc-vh', t(`lab.dc.status.${kind}`)));
        return li;
      }));

      // Hinweis: bei Beat nennt die Liste schon, was passt — der Satz zeigt dann nur die Richtung.
      let hint = '';
      if (status !== 'ok') {
        const texts = last.hints.filter((h) => !(rows.length && (h.key === 'lab.dc.hint.parts' || h.key === 'lab.dc.hint.partsNone')));
        hint = this._dcHintText(texts);
        const firstMiss = Array.isArray(parts) ? parts.find((p) => !p.ok && !p.soft) : null;
        if (firstMiss) hint = `${tf('lab.dc.sheet.beatTip', { track: trackLabel(firstMiss.id), bridge: t(`lab.dc.bridge.${firstMiss.id}`) })} ${hint}`.trim();
      }
      const hintEl = this.$('.dc-sheet-hint');
      hintEl.hidden = !hint;
      hintEl.textContent = hint;

      // Gestufte Hilfe ab dem dritten Versuch ohne „stimmt“.
      const help = this.$('.dc-help');
      const tries = this.ui.dc.tries?.[element] || 0;
      const showHelp = status !== 'ok' && tries >= 3;
      help.hidden = !showHelp;
      if (showHelp) {
        this.$('.dc-help-title').textContent = t(tries === 3 ? 'lab.dc.help.title' : 'lab.dc.help.titleMore');
        const listen = this.$('.dc-help-listen');
        const part = this._dcFocusOf(element);
        listen.hidden = !part;
        listen.dataset.value = element;
        listen.textContent = part ? tf('lab.dc.help.listen', { part: t(`lab.dc.short.${element}`) }) : '';
        const reveal = this.$('.dc-help-reveal');
        reveal.hidden = !!dc.revealedEls?.[element];
        reveal.dataset.value = element;
      }

      // Knöpfe: stimmt → weiter (oder nächster Song), sonst weiter bauen.
      const main = this.$('.dc-sheet-main');
      const close = this.$('.dc-sheet-close');
      if (status === 'ok') {
        main.dataset.action = allDone ? 'dc-sheet-song' : 'dc-sheet-next';
        main.dataset.value = next || '';
        main.textContent = allDone ? t('lab.dc.sheet.nextSong') : tf('lab.dc.sheet.next', { el: next ? t(`lab.dc.short.${next}`) : '' });
        main.hidden = !allDone && !next;
        close.textContent = t('lab.dc.sheet.close');
      } else {
        main.dataset.action = 'dc-sheet-close';
        main.dataset.value = '';
        main.textContent = t('lab.dc.sheet.keepBuilding');
        main.hidden = false;
        close.textContent = '';
      }
      close.hidden = status !== 'ok';
      this.$('.dc-sheet-card').setAttribute('aria-labelledby', 'dc-sheet-title');
    }

    _dcHintText(hints) {
      return hints.map(({ key, vars }) => tf(key, vars)).join(' ');
    }

    _dcReveal() {
      const dc = this._dc();
      if (!dc) return;
      if (!this.ui.dc.revealAsk && !dc.revealed) { this.ui.dc.revealAsk = true; this._renderDeconstruct(); return; }
      this.ui.dc.revealAsk = false;
      this.ui.dc.menu = false;
      dc.revealed = true;
      this._persist();
      this._renderDeconstruct();
      this.$('.dc-solution')?.focus();
    }

    /** Nach dem Auflösen: das Original als „Meine Version“ übernehmen
     *  (ein Undo-Schritt) — dann steht es in allen Reitern zum Ansehen. */
    _dcAdopt() {
      const dc = this._dc();
      if (!dc?.revealed) return;
      this._pushHistory();
      this._dcSwap(sanitizeState(JSON.parse(JSON.stringify(dc.original))));
      this._renderTransport();
      this._persist();
      this._dcAnnounce(t('lab.dc.adopted'));
    }

    _dcAnnounce(text) {
      const live = this.$('.dc-live');
      if (live) live.textContent = text;
    }

    /** Nach Eingaben „Meine Version“ gebündelt sichern — auch wenn die App
     *  danach im Hintergrund beendet wird, bleibt der Nachbau erhalten. */
    _dcAutosave() {
      if (!this._dc()) return;
      clearTimeout(this._dcSaveTimer);
      this._dcSaveTimer = setTimeout(() => this._persist(), 1500);
    }

    /** Lösung eines Elements in Worten (erst nach dem Auflösen sichtbar);
     *  Beat und Bass zeigt _dcSolutionNodes als Raster, Akkorde als Kacheln. */
    _dcSolution(element) {
      const o = this._saved.deconstruct.original;
      const pattern = DRUM_PATTERNS[o.patternIndex];
      if (element === 'tempo') {
        return `${tempoSymbol(pattern.meter)} = ${o.bpm} · ${pattern.meter}${o.swing ? ` · ${t('lab.swing')} ${Math.round(o.swing * 100)} %` : ''}`;
      }
      if (element === 'chords') {
        const mode = MODES.find((m) => m.id === o.modeId) || MODES[0];
        return `${t(mode.nameKey)}${o.chordBars === 2 ? ` · ${t('lab.dc.twoBars')}` : ''}`;
      }
      if (element === 'melody') {
        // Je Takt die Stufen über dem Akkordgrundton (wie im Editor, 1 = Grundton).
        const bars = o.melodyBars || MELODIES[o.melodyIndex].bars;
        return bars.map((bar) => bar.map(([, deg]) => `${mod(deg, 7) + 1}${deg > 6 ? '↑' : deg < 0 ? '↓' : ''}`).join(' ')).join(' | ');
      }
      if (element === 'sound') return `„${SYNTH_PRESETS[o.sound.presetIndex]?.name || ''}“`;
      return '';
    }

    /** Auflösung als Knoten: Beat/Bass als Mini-Raster Original gegen Meine
     *  Version, Akkorde als Kacheln (Name + Stufe), sonst Text. */
    _dcSolutionNodes(element) {
      const o = this._saved.deconstruct.original;
      const m = this.state;
      const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
      const label = mk('span', 'dc-sol-label', t('lab.dc.solution'));
      if (element === 'beat' || element === 'bass') {
        const meter = meterOfState(o);
        const { steps, group } = METERS[meter];
        const groups = steps / group;
        const sameMeter = meterOfState(m) === meter;
        const tracks = element === 'bass' ? ['bass'] : DRUM_TRACKS.filter((track) => dcStepsOf(dcTrack(o, track)).length || dcStepsOf(dcTrack(m, track)).length);
        const grid = mk('div', 'dc-mini');
        const head = mk('div', 'dc-mini-row dc-mini-head');
        head.setAttribute('aria-hidden', 'true');
        head.append(mk('span'));
        for (let g = 0; g < groups; g++) head.append(mk('span', '', String(g + 1)));
        grid.append(head);
        let ghosts = false;
        for (const track of tracks) {
          const a = dcTrack(o, track);
          const b = sameMeter ? dcTrack(m, track) : {};
          const row = mk('div', 'dc-mini-row');
          row.setAttribute('role', 'img');
          let miss = 0;
          let extra = 0;
          const bassNote = (v) => String(v < 0 ? v + 8 : v + 1);
          row.append(mk('span', 'dc-mini-name', track === 'bass' ? t('lab.dc.el.bass') : trackLabel(track)));
          for (let g = 0; g < groups; g++) {
            const cells = mk('div', 'dc-mini-group');
            cells.style.setProperty('--g', String(group));
            for (let k = 0; k < group; k++) {
              const i = g * group + k;
              const inO = a[i] !== undefined;
              const inM = b[i] !== undefined;
              const cell = mk('span', `dc-cell${k === 0 ? ' is-beat' : ''}`);
              const right = inO && inM && (track !== 'bass' || a[i] === b[i]);
              if (right) { cell.classList.add('is-ok'); cell.textContent = track === 'bass' ? bassNote(a[i]) : ''; }
              else if (inO) { cell.classList.add('is-miss'); cell.textContent = track === 'bass' ? bassNote(a[i]) : ''; miss++; }
              else if (inM) { cell.classList.add('is-extra'); cell.textContent = '×'; extra++; }
              if (track !== 'bass' && inO && a[i] < 1) { cell.classList.add('is-ghost'); ghosts = true; }
              cells.append(cell);
            }
            row.append(cells);
          }
          const name = track === 'bass' ? t('lab.dc.el.bass') : trackLabel(track);
          const said = [];
          if (miss) said.push(tf(miss === 1 ? 'lab.dc.grid.missOne' : 'lab.dc.grid.missMany', { n: miss }));
          if (extra) said.push(tf('lab.dc.grid.extra', { n: extra }));
          row.setAttribute('aria-label', `${name}: ${said.length ? said.join(', ') : t('lab.dc.grid.rowOk')}`);
          grid.append(row);
        }
        const legend = mk('div', 'dc-legend');
        const item = (cls, mark, text) => { const li = mk('span', 'dc-legend-item'); li.append(mk('i', `dc-cell ${cls}`, mark), document.createTextNode(text)); return li; };
        legend.append(item('is-ok', '', t('lab.dc.legend.ok')), item('is-miss', '', t('lab.dc.legend.miss')), item('is-extra', '×', t('lab.dc.legend.extra')));
        if (ghosts) legend.append(item('is-ok is-ghost', '', t('lab.dc.legend.ghost')));
        return [label, grid, legend];
      }
      if (element === 'chords') {
        const prog = progressionOfState(o);
        const tiles = mk('div', 'dc-tiles');
        tiles.setAttribute('role', 'list');
        for (const [i, deg] of prog.degrees.entries()) {
          const alter = prog.alter?.[i] || null;
          const steps = chordSteps(modeStepsOf(o), o.modeId, prog, deg, alter);
          const tile = mk('div', 'dc-tile');
          tile.setAttribute('role', 'listitem');
          tile.append(mk('strong', '', chordName(o.keyRoot, steps, deg, !!prog.sevenths, o.modeId, labLang, alter, prog.bass?.[i] || 0)), mk('span', '', romanNumeral(steps, deg, prog.sevenths, alter, prog.bass?.[i] || 0, modeStepsOf(o))));
          tiles.append(tile);
        }
        return [label, tiles, mk('span', 'dc-sol-text', this._dcSolution('chords'))];
      }
      return [label, mk('span', 'dc-sol-text', this._dcSolution(element))];
    }

    _renderDeconstruct() {
      const host = this.$('.dc-view');
      if (!host) return;
      const dcView = this.state.view === 'deconstruct';
      // Markierung an der Transportleiste, nicht am Host: ein Custom Element
      // darf im Konstruktor (der _renderAll aufruft) keine Attribute setzen.
      this.$('.transport-bar').classList.toggle('is-dc-orig', dcView && !!this._saved.deconstruct && !this.ui.dc.choosing && this.ui.dc.listen === 'orig');
      this._renderDcQuick();
      const slim = dcView && !!this._saved.deconstruct && !this.ui.dc.choosing;
      this.$('.transport-bar').classList.toggle('is-dc-song', slim);
      if (!slim) this.$('[data-tab-panel="beat"]').classList.remove('is-dc', 'is-dc-hard', 'is-dc-tpl');
      if (!dcView) return;
      const dc = this._saved.deconstruct;
      const choosing = !dc || this.ui.dc.choosing;
      this.$('.dc-intro').hidden = !choosing;
      this.$('.dc-song').hidden = choosing;
      // Stufenwahl (Segmented Control), Fortschritt, Songliste
      const lv = this.ui.dc.level;
      this.$all('.dc-seg [data-value]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === lv)));
      this.$('.dc-level-info').textContent = t(`lab.dc.levelInfo.${lv}`);
      const songs = dcSongsOf(lv);
      if (!songs.some((x) => x.id === this.ui.dc.song)) this.ui.dc.song = this._dcSuggest(lv);
      const solved = dc?.solved || {};
      const solvedCount = songs.filter((x) => solved[x.id]).length;
      const prog = this.$('.dc-prog');
      prog.setAttribute('aria-valuemax', String(songs.length));
      prog.setAttribute('aria-valuenow', String(solvedCount));
      this.$('.dc-prog-fill').style.width = `${songs.length ? Math.round(100 * solvedCount / songs.length) : 0}%`;
      this.$('.dc-prog-text').textContent = tf('lab.dc.songsOf', { done: solvedCount, total: songs.length });
      const runId = dc?.song;
      const elCount = dc ? dcLevel(dc.level).elements.length : 0;
      this.$('.dc-list').replaceChildren(...songs.map((x, i) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dc-row';
        btn.dataset.action = 'dc-song';
        btn.dataset.value = x.id;
        btn.setAttribute('aria-pressed', String(x.id === this.ui.dc.song));
        const num = document.createElement('span');
        num.className = 'dc-row-n';
        num.textContent = String(i + 1);
        const main = document.createElement('span');
        main.className = 'dc-row-main';
        const name = document.createElement('span');
        name.className = 'dc-row-name';
        name.textContent = x.name;
        const tag = document.createElement('span');
        tag.className = 'dc-row-tag';
        tag.textContent = `${x.genre} · ${t(`lab.dc.feel.${dcTempoFeel(x)}`)}`;
        main.append(name, tag);
        btn.append(num, main);
        const mark = document.createElement('span');
        const isRun = !!dc && runId === x.id && dc.level === lv;
        if (solved[x.id]) {
          mark.className = 'dc-row-mark is-done';
          mark.textContent = '✓';
          mark.title = t('lab.dc.status.done');
        } else if (isRun) {
          mark.className = 'dc-row-mark is-run';
          mark.textContent = `${dcLevel(dc.level).elements.filter((el) => dc.done[el]).length}/${elCount}`;
        }
        if (mark.className) btn.append(mark);
        if (solved[x.id]) {
          const sr = document.createElement('span');
          sr.className = 'dc-sr';
          sr.textContent = ` (${t('lab.dc.status.done')})`;
          btn.append(sr);
        }
        li.append(btn);
        return li;
      }));
      // Startknopf: der laufende Song heißt „Weiter“, jeder andere ersetzt ihn.
      const pick = dcSong(this.ui.dc.song);
      const resume = !!dc && pick?.id === dc.song;
      this.$('.dc-primary span').textContent = tf(resume ? 'lab.dc.resume' : 'lab.dc.startSong', { name: pick?.name || '' });
      this.$('.dc-replace').hidden = !(dc && !resume && Object.values(dc.done || {}).some(Boolean));
      if (choosing) return;

      const level = dcLevel(dc.level);
      const elements = level.elements;
      const doneCount = elements.filter((el) => dc.done[el]).length;
      const levelSongs = dcSongsOf(dc.level);
      const song = levelSongs.find((x) => x.id === dc.song);
      this.$('.dc-song-title').textContent = tf('lab.dc.songTitle', { n: levelSongs.indexOf(song) + 1, name: song.name, genre: song.genre, level: t(`lab.dc.level.${dc.level}`) });
      this.$('.dc-count').textContent = tf('lab.dc.count', { done: doneCount, total: elements.length });
      const given = [tf('lab.dc.givenKey', { key: spell(dc.original.keyRoot, dc.original.keyRoot, 'major', labLang) })];
      if (!elements.includes('chords')) given.push(t('lab.dc.givenChords'));
      this.$('.dc-given').textContent = `${t('lab.dc.given')} ${given.join(' · ')}`;
      // Nur hören
      const parts = DC_FOCUS.filter((p) => p === 'all' || elements.includes(p));
      if (!parts.includes(this.ui.dc.focus)) this.ui.dc.focus = 'all';
      this._chips(this.$('.dc-focus'), parts.map((p) => ({ value: p, label: t(`lab.dc.focus.${p}`) })), this.ui.dc.focus, 'dc-focus');
      // Element-Leiste: eine Zeile Chips, Status als Symbol (nie nur Farbe)
      const hints = this.ui.dc.hints || {};
      const active = this._dcActiveElement();
      const mark = (el) => (dc.done[el] ? 'ok' : dc.checks[el] || 'open');
      const stat = (el) => ({ ok: '✓', near: '≈', no: '✗', open: '○' })[mark(el)];
      const bar = this.$('.dc-elements');
      bar.style.setProperty('--dc-cols', String(elements.length === 4 ? 4 : 3));
      bar.replaceChildren(...elements.map((el) => {
        const status = mark(el);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `dc-el is-${status}`;
        chip.dataset.action = 'dc-pick';
        chip.dataset.value = el;
        chip.setAttribute('aria-pressed', String(el === active));
        chip.setAttribute('aria-label', `${t(`lab.dc.el.${el}`)}: ${t(dc.done[el] ? 'lab.dc.status.done' : `lab.dc.status.${status}`)}`);
        const sym = document.createElement('span');
        sym.className = 'dc-mark';
        sym.setAttribute('aria-hidden', 'true');
        sym.textContent = stat(el);
        const name = document.createElement('span');
        name.className = 'dc-el-name';
        name.textContent = t(`lab.dc.short.${el}`);
        chip.append(sym, name);
        return chip;
      }));
      // Hinweis-Karte nur für das aktive Element
      const aStatus = mark(active);
      this.$('.dc-card-name').textContent = t(`lab.dc.el.${active}`);
      const pill = this.$('.dc-card-state');
      pill.className = `dc-card-state is-${aStatus}`;
      pill.textContent = `${stat(active)} ${t(dc.done[active] ? 'lab.dc.status.done' : `lab.dc.status.${aStatus}`)}`;
      this.$('.dc-card-hint').textContent = hints[active]?.length && aStatus !== 'ok' ? this._dcHintText(hints[active]) : t(`lab.dc.do.${active}`);
      this.$('.dc-card-tip').textContent = t(`lab.dc.tip.${active}`);
      this.$('.dc-tap-box').hidden = active !== 'tempo';
      const sol = this.$('.dc-el-solution');
      const showSol = dc.revealed || !!dc.revealedEls?.[active];
      sol.hidden = !showSol;
      sol.replaceChildren(...(showSol ? this._dcSolutionNodes(active) : []));
      // Danach: Vorschlag (nur Hinweis, keine Reihenfolge erzwingen)
      const next = dcNextElement(elements, dc.done, active);
      const nextBtn = this.$('.dc-next');
      nextBtn.hidden = !next;
      nextBtn.dataset.value = next || '';
      nextBtn.textContent = next ? tf('lab.dc.next', { el: t(`lab.dc.short.${next}`) }) : '';
      // Prüfen-Knopf in der unteren Leiste
      const checkBtn = this.$('.dc-check-btn');
      checkBtn.textContent = tf('lab.dc.checkEl', { el: t(`lab.dc.short.${active}`) });
      checkBtn.setAttribute('aria-label', tf('lab.dc.checkEl', { el: t(`lab.dc.el.${active}`) }));
      // Beat-Reiter: schlanke Fassung, Kick-Klang und Taktart nur auf Schwer
      const beatPanel = this.$('[data-tab-panel="beat"]');
      beatPanel.classList.add('is-dc');
      beatPanel.classList.toggle('is-dc-hard', dc.level === 'hard');
      beatPanel.classList.toggle('is-dc-tpl', !!this.ui.dc.tpl);
      this.$('[data-action="dc-tpl"]').setAttribute('aria-expanded', String(!!this.ui.dc.tpl));
      this.$('.dc-all-done').hidden = doneCount < elements.length;
      // „⋯“-Menü im Kopf: Neuer Song, Auflösen (mit Rückfrage)
      const reveal = this.$('[data-action="dc-reveal"]');
      reveal.hidden = dc.revealed;
      reveal.textContent = t(this.ui.dc.revealAsk ? 'lab.dc.revealSure' : 'lab.dc.reveal');
      reveal.classList.toggle('is-ask', this.ui.dc.revealAsk);
      this.$('.dc-menu').hidden = !this.ui.dc.menu;
      this.$('.dc-more').setAttribute('aria-expanded', String(!!this.ui.dc.menu));
      this.$('.dc-solution').hidden = !dc.revealed;
    }

    /** A/B-Knopf in der Transportleiste — immer erreichbar, auch tief im Editor. */
    _renderDcQuick() {
      const btn = this.$('.dc-quick');
      if (!btn) return;
      const on = this.state.view === 'deconstruct' && !!this._saved.deconstruct && !this.ui.dc.choosing;
      btn.hidden = !on;
      // Würfeln würde in de:construct auch Vorgegebenes (Grundton) verstellen.
      this.$('[data-action="randomize"]').hidden = this.state.view === 'deconstruct';
      if (!on) return;
      const orig = this.ui.dc.listen === 'orig';
      btn.setAttribute('aria-pressed', String(orig));
      btn.querySelector('.dc-quick-letter').textContent = orig ? 'A' : 'B';
      btn.querySelector('.dc-quick-text').textContent = t(orig ? 'lab.dc.original' : 'lab.dc.mineShort');
      const now = t(orig ? 'lab.dc.quickNow.orig' : 'lab.dc.quickNow.mine');
      btn.setAttribute('aria-label', now);
      btn.title = now;
    }

    /* ---- Ansicht: Workshop ----
       ui.ws = { lesson, reached, played, start, ab }: gewählte Einheit,
       erreichte Teilziele (Anzahl, der Reihe nach), zuletzt gespielte Töne,
       Ausgangszustand und Vorher/Nachher. Der Stand selbst liegt ganz
       normal in this.state — Wechsel ins Studio nimmt ihn mit. */

    /** Workshop öffnen: die Einheit des Stands weiterführen, sonst die
     *  zuletzt gewählte bzw. die erste nicht geschaffte des Rundgangs. */
    _wsEnter() {
      const id = this.state.lessonId;
      const lesson = WORKSHOP_LESSONS.find((l) => l.id === id);
      if (lesson) {
        if (this.ui.ws?.lesson !== lesson) this._wsInit(lesson, sanitizeState(lessonState(this.state, lesson)));
        this._setTab(lesson.tab);
        this._renderWorkshop();
        this._wsSchedule();
        return;
      }
      const progress = this._saved.workshop;
      const first = WORKSHOP_LESSONS.find((l) => l.id === progress.last)
        || WORKSHOP_LESSONS.find((l) => l.tier === 'tour' && !progress.done[l.id])
        || WORKSHOP_LESSONS[0];
      this._wsSelect(first.id, { play: false });
    }

    _wsInit(lesson, start) {
      this.ui.ws = { lesson, reached: 0, played: [], start: JSON.parse(JSON.stringify(start)), ab: null,
        ch: lesson.kind ? { kind: lesson.kind, phase: 'ready', round: 0, hits: 0 } : null };
      this.ui.wsTier = lesson.tier;
      if (lesson.tier === 'deep') this.ui.wsArea = lesson.area;
      if (lesson.focus.includes('progEditor') || lesson.focus.includes('progSevenths')) this.ui.progEdit = true;
      if (lesson.focus.includes('melEditor')) this.ui.melEdit = true;
    }

    /** Einheit wählen: ein Undo-Schritt, Zustand über lessonState. Das
     *  Antippen ist die Geste für den AudioContext — die Wiedergabe startet
     *  (außer bei Challenges, die starten mit „Los“). */
    _wsSelect(id, { play = true } = {}) {
      const lesson = WORKSHOP_LESSONS.find((l) => l.id === id);
      if (!lesson) return;
      this._wsAbReset();
      if (this.ui.ws) this.ui.ws.ch = null; // laufende Challenge endet, Klang/Beat wieder der eigene
      const meterBefore = this._meter();
      const next = sanitizeState(lessonState(this.state, lesson));
      this._applyState(JSON.parse(JSON.stringify(next)));
      if (this._meter() !== meterBefore && this.playing) this.globalStep = Math.ceil(this.globalStep / this._barSteps()) * this._barSteps();
      this._fadeDrums(false);
      this._wsInit(lesson, next);
      this._saved.workshop.last = lesson.id;
      this._persist();
      // Liegeton wie bei den Chor-Aufgaben erst hier (Nutzergeste).
      if (lesson.set?.droneOn) this._setDrone(true);
      else if (this.state.droneOn) this._setDrone(false);
      this._afterStateChange();
      this._setTab(lesson.tab);
      this._renderWorkshop();
      this._wsDecorate();
      // Challenges mit eigenem Ablauf starten erst mit „Los“.
      if (play && !this.playing && !lesson.kind) this.start();
    }

    /* ---- Challenges (Paket 8): Hör-Detektiv, Nachbauen, Klang-Rätsel ----
       ui.ws.ch = { kind, phase: 'ready' | 'running' | 'result', round,
       hits, … }. Keine Zeitlimits, keine Wertung: „x von y“ zählt beim
       Detektiv die Runden, die im ersten Versuch sitzen. */

    /** Laufende Challenge (nur in der Workshop-Ansicht wirksam). */
    _wsCh() {
      return this.state.view === 'workshop' ? this.ui?.ws?.ch || null : null;
    }

    /** Beat, der an Schritt g klingt: beim Detektiv abwechselnd zwei Takte
     *  Original (A) und zwei Takte Variante (B), beim Nachbauen auf Wunsch
     *  das Vorbild. Sonst der Stand. */
    _beatAt(g) {
      const ch = this._wsCh();
      if (ch?.phase === 'running') {
        if (ch.kind === 'detective' && ch.variant && this._wsChSide(g) === 'B') return ch.variant.beat;
        if (ch.kind === 'rebuild' && ch.listen === 'model') return ch.model;
      }
      return this.state.beat;
    }

    _wsChSide(g) {
      const bar = Math.floor((g - (this.ui.ws.ch.baseStep || 0)) / this._barSteps());
      return bar >= 0 && Math.floor(bar / 2) % 2 === 1 ? 'B' : 'A';
    }

    /** Synth-Klang, der zu hören ist: beim Klang-Rätsel auf Wunsch der Zielklang. */
    _heardSound() {
      if (this._dcHearsOriginal()) return this._saved.deconstruct.original.sound;
      const ch = this._wsCh();
      return ch?.phase === 'running' && ch.kind === 'soundMatch' && ch.listen === 'model' ? ch.target.sound : this.state.sound;
    }

    /** „Los“ bzw. „Noch eine Runde“. Startet die Wiedergabe. */
    _wsChGo() {
      const ws = this.ui.ws;
      if (!ws?.ch) return;
      ws.ch = { kind: ws.lesson.kind, phase: 'running', round: 0, hits: 0, rng: this._wsRng || Math.random, prevPattern: -1, prevTarget: null };
      this._wsChRound();
      if (!this.playing) this.start();
    }

    /** Neue Aufgabe innerhalb der Runde (Zustand ohne Undo-Eintrag). */
    _wsChRound() {
      const ch = this.ui.ws.ch;
      const s = this._snapshot();
      ch.tries = 0; ch.hint = false; ch.msg = ''; ch.score = null; ch.match = null;
      if (ch.kind === 'detective' || ch.kind === 'rebuild') {
        const index = pickChallengePattern(ch.rng, ch.prevPattern);
        ch.prevPattern = index;
        const pattern = DRUM_PATTERNS[index];
        s.patternIndex = index;
        s.beat = beatFromPattern(pattern);
        s.beatEdited = false;
        s.swing = typeof pattern.swing === 'number' ? pattern.swing : 0;
        Object.assign(s.trackOn, { kick: true, snare: true, hat: true, clap: false, open: false, perc: false, bass: false });
        if (ch.kind === 'detective') {
          ch.variant = detectiveVariant(s.beat, ch.rng, METERS[pattern.meter].steps);
        } else {
          ch.model = beatFromPattern(pattern);
          for (const track of CHALLENGE_TRACKS) s.beat[track] = {};
          ch.listen = 'model';
        }
      } else if (ch.kind === 'soundMatch') {
        ch.target = soundMatchTarget(ch.rng, ch.prevTarget);
        ch.prevTarget = ch.target.name;
        s.sound = { ...SOUND_MATCH_START };
        ch.listen = 'model';
      }
      // Wechsel mitten im Spiel: A/B zählen ab dem nächsten Taktanfang.
      ch.baseStep = this.playing ? Math.ceil(this.globalStep / this._barSteps()) * this._barSteps() : 0;
      this._applyState(s, { history: false });
      this._renderWorkshop();
    }

    /** Hör-Detektiv: getippte Zelle ist die, die in B anders ist? */
    _wsChGuess(track, step) {
      const ch = this._wsCh();
      if (!ch || ch.phase !== 'running' || !ch.variant) return;
      if (track === ch.variant.track && step === ch.variant.step) { this._wsChSuccess(ch.tries === 0); return; }
      ch.tries++;
      ch.hint = ch.tries >= 3;
      ch.msg = t(ch.hint ? 'lab.ws.hint' : 'lab.ws.notYet');
      this._wsAnnounce(ch.msg);
      this._renderWorkshop();
      this._wsDecorate();
    }

    /** Nachbauen und Klang-Rätsel: nach jeder Eingabe vergleichen. */
    _wsChEval() {
      const ch = this._wsCh();
      if (!ch || ch.phase !== 'running') return;
      if (ch.kind === 'rebuild') {
        ch.score = rebuildScore(ch.model, this.state.beat);
        if (ch.score.done) { this._wsChSuccess(true); return; }
      } else if (ch.kind === 'soundMatch') {
        ch.match = soundMatch(ch.target.sound, this.state.sound);
        if (Object.values(ch.match).every(Boolean)) { this._wsChSuccess(true); return; }
      }
      this._renderWorkshop();
    }

    /** Wer selbst baut, will sich hören: Eingabe schaltet auf „Deins“. */
    _wsChTouched() {
      const ch = this._wsCh();
      if (ch?.phase === 'running' && ch.listen === 'model') this._wsChListen('mine');
    }

    _wsChListen(value) {
      const ch = this._wsCh();
      if (!ch || ch.phase !== 'running') return;
      ch.listen = value === 'model' ? 'model' : 'mine';
      this._applySound();
      this._renderWorkshop();
    }

    _wsChSuccess(firstTry) {
      const ch = this.ui.ws.ch;
      const lesson = this.ui.ws.lesson;
      ch.round++;
      if (firstTry) ch.hits++;
      this._wsAnnounce(`✓ ${tf('lab.ws.roundOf', { n: ch.round, total: lesson.rounds })}`);
      if (ch.round >= lesson.rounds) {
        ch.phase = 'result';
        ch.listen = 'mine';
        ch.hint = false;
        this._applySound();
      } else {
        this._wsChRound();
      }
      this._wsCheck();
      this._renderWorkshop();
      this._wsDecorate();
    }

    /** Anzeige „A“/„B“ im Takt dessen, was gerade klingt. */
    _wsChShow(g) {
      const ch = this._wsCh();
      if (ch?.kind !== 'detective') return;
      const side = ch.phase === 'running' ? this._wsChSide(g) : '';
      if (this._wsSide === side) return;
      this._wsSide = side;
      const badge = this.$('.ws-ch-badge');
      badge.textContent = side;
      badge.classList.toggle('is-b', side === 'B');
    }

    _renderWsChallenge() {
      const ws = this.ui.ws;
      const ch = ws?.ch;
      const host = this.$('.ws-ch');
      host.hidden = !ch;
      if (!ch) return;
      const lesson = ws.lesson;
      const running = ch.phase === 'running';
      this.$('.ws-ch-round').textContent = running ? tf('lab.ws.roundOf', { n: Math.min(ch.round + 1, lesson.rounds), total: lesson.rounds }) : '';
      const badge = this.$('.ws-ch-badge');
      badge.hidden = !(running && ch.kind === 'detective');
      if (badge.hidden) this._wsSide = null;
      const listen = this.$('.ws-listen');
      listen.hidden = !(running && ch.kind !== 'detective');
      this._chips(listen, [{ value: 'model', label: t('lab.ws.model') }, { value: 'mine', label: t('lab.ws.mine') }], ch.listen, 'ws-listen');
      const score = this.$('.ws-ch-score');
      score.hidden = !(running && ch.kind === 'rebuild' && ch.score);
      if (!score.hidden) score.textContent = tf('lab.ws.beatsMatch', { hits: ch.score.shown, total: ch.score.total });
      const params = this.$('.ws-ch-params');
      params.hidden = !(running && ch.kind === 'soundMatch');
      if (!params.hidden) {
        const match = ch.match || soundMatch(ch.target.sound, this.state.sound);
        params.replaceChildren(...[['wave', 'lab.waveformAria'], ['cutoff', 'lab.knobCutoff'], ['attack', 'lab.envAttack'], ['release', 'lab.envRelease']].map(([key, label]) => {
          const li = document.createElement('li');
          li.className = `ws-check${match[key] ? ' is-fit' : ''}`;
          li.innerHTML = `<span class="ws-box" aria-hidden="true">${match[key] ? '✓' : ''}</span><span></span>`;
          li.lastChild.textContent = `${t(label)}: ${t(match[key] ? 'lab.ws.fits' : 'lab.ws.fitsNot')}`;
          return li;
        }));
      }
      const msg = this.$('.ws-ch-msg');
      msg.textContent = running ? ch.msg || '' : '';
      const result = this.$('.ws-ch-result');
      result.hidden = ch.phase !== 'result';
      result.textContent = tf('lab.ws.result', { hits: ch.kind === 'detective' ? ch.hits : ch.round, total: lesson.rounds });
      const go = this.$('[data-action="ws-go"]');
      go.hidden = running;
      go.textContent = t(ch.phase === 'result' ? 'lab.ws.again' : 'lab.ws.goChallenge');
    }

    _wsDone() {
      const ws = this.ui.ws;
      return !!ws && ws.reached >= ws.lesson.checks.length;
    }

    /** Höchstens einmal pro Frame prüfen und Markierungen nachziehen. */
    _wsSchedule() {
      if (this._wsFrame || this.state.view !== 'workshop') return;
      this._wsFrame = global.requestAnimationFrame(() => {
        this._wsFrame = 0;
        this._wsChEval();
        this._wsCheck();
        this._wsDecorate();
      });
    }

    /** Teilziele der Reihe nach prüfen; mehrere können in einem Durchgang
     *  fallen. Erreicht bleibt erreicht. */
    _wsCheck() {
      const ws = this.ui.ws;
      if (!ws || this.state.view !== 'workshop' || ws.ab?.showing === 'before') return;
      const { lesson } = ws;
      const ctx = this._wsCtx();
      const reachedBefore = ws.reached;
      while (ws.reached < lesson.checks.length) {
        let ok = false;
        try { ok = !!lesson.checks[ws.reached](this.state, ctx); } catch { ok = false; }
        if (!ok) break;
        ws.reached++;
        this._wsAnnounce(tf('lab.ws.reached', { check: t(`lab.lesson.${lesson.id}.check${ws.reached}`) }));
      }
      if (ws.reached === reachedBefore) return;
      if (this._wsDone()) {
        const progress = this._saved.workshop;
        if (!progress.done[lesson.id]) progress.done[lesson.id] = localDate();
        progress.last = lesson.id;
        this._persist();
        this._wsAnnounce(`${t('lab.ws.done')} ${t(`lab.lesson.${lesson.id}.aha`)}`);
      }
      this._renderWorkshop();
    }

    _wsCtx() {
      const ws = this.ui.ws;
      return { played: ws.played, start: ws.start, round: ws.ch?.round || 0 };
    }

    _wsAnnounce(text) {
      const live = this.$('.ws-live');
      if (live) live.textContent = text;
    }

    /** Aus _enterKey: gespielten Ton als Tonleiterstufe der Tonart merken. */
    _wsNote(midi) {
      const ws = this.ui.ws;
      if (!ws || this.state.view !== 'workshop') return;
      const pc = mod(midi - this.state.keyRoot, 12);
      const steps = this._mode().steps;
      let deg = null;
      for (let d = 0; d < 7 && deg === null; d++) if (mod(degreeSemis(steps, d), 12) === pc) deg = d;
      ws.played.push({ pc, deg, t: performance.now() });
      if (ws.played.length > 32) ws.played.splice(0, ws.played.length - 32);
      this._wsSchedule();
    }

    /** Vorher/Nachher: tauscht den Zustand ohne Undo-Eintrag. */
    _wsToggleAb() {
      const ws = this.ui.ws;
      if (!ws || !this._wsDone()) return;
      if (ws.ab?.showing === 'before') { this._wsAbReset(); }
      else {
        ws.ab = { mine: this._snapshot(), showing: 'before' };
        this._wsSwap(ws.start);
      }
      this._renderWorkshop();
      this._wsDecorate();
    }

    /** Immer zurück auf „Nachher“ (eigener Stand). */
    _wsAbReset() {
      const ws = this.ui?.ws;
      if (!ws?.ab) return;
      const { mine, showing } = ws.ab;
      ws.ab = null;
      if (showing === 'before' && mine) this._wsSwap(mine);
      this._renderWorkshop();
    }

    _wsSwap(state) {
      const meterBefore = this._meter();
      this._applyState(JSON.parse(JSON.stringify(state)), { history: false });
      // Taktgenau weiter, wie beim Wechsel der Chor-Aufgabe.
      if (this._meter() !== meterBefore && this.playing) this.globalStep = Math.ceil(this.globalStep / this._barSteps()) * this._barSteps();
    }

    /** Nächste Einheit derselben Stufe (bei Vertiefung: desselben Bereichs). */
    /** Einheiten derselben Reihe (Rundgang, Vertiefungs-Bereich, Challenges). */
    _wsSiblings(lesson) {
      return WORKSHOP_LESSONS.filter((l) => l.tier === lesson.tier && (lesson.tier !== 'deep' || l.area === lesson.area));
    }

    _wsNext() {
      const lesson = this.ui.ws?.lesson;
      if (!lesson) return null;
      const list = this._wsSiblings(lesson);
      return list[list.indexOf(lesson) + 1] || null;
    }

    _wsPrev() {
      const lesson = this.ui.ws?.lesson;
      if (!lesson) return null;
      const list = this._wsSiblings(lesson);
      return list[list.indexOf(lesson) - 1] || null;
    }

    /** Elemente zu einem Fokus-Schlüssel (leer, wenn unbekannt/nicht da). */
    _wsFocusEls(key) {
      const inPanels = (sel) => this.$all(`.tab-panel ${sel}`);
      const up = (list, sel) => list.map((el) => el.closest(sel) || el);
      const [kind, arg] = key.split(':');
      switch (kind) {
        case 'bpm': return this.$all('.transport-bar .tempo-field');
        case 'swing': case 'pump': return up(inPanels(`[data-field="${kind}"]`), '.slider-line');
        case 'track': return inPanels(`.track-list .track-row[data-track="${arg}"]`);
        case 'picker': return inPanels(`.picker-trigger[data-picker="${arg === 'preset' ? 'sound' : arg}"]`);
        case 'mode': return up(inPanels('[data-field="modeId"]'), '.select-field');
        case 'key': return up(inPanels('[data-field="keyRoot"]'), '.select-field');
        case 'chordsOn': return up(inPanels('[data-switch="chordsOn"]'), '.switch');
        case 'chordBars': return up(inPanels('[data-field="chordBars"]'), '.select-line');
        case 'satb': return inPanels('.satb-list');
        case 'drone': return up(inPanels('[data-switch="droneOn"]'), '.switch-row');
        case 'progEditor': return inPanels('.chord-strip, [data-action="prog-edit"], .prog-editor');
        case 'progSevenths': return [...up(inPanels('[data-switch="progSevenths"]'), '.switch'), ...inPanels('[data-action="prog-edit"]')];
        case 'melEditor': return inPanels('.mel-card');
        case 'melodyAltBars': return up(inPanels('[data-switch="melodyAltBars"]'), '.switch');
        case 'pads': return inPanels('.scale-pads');
        case 'arp': return up(inPanels('[data-switch="arpOn"]'), '.panel');
        case 'wave': return inPanels('.wave-row');
        case 'filterType': return inPanels('.filter-type-chips');
        case 'sound': {
          const knob = this._soundKnobs[arg]?.el;
          if (knob?.isConnected) return [knob];
          return [...up(inPanels(`[data-sound="${arg}"]`), '.slider-field'), ...up(inPanels(`[data-field="${arg}"]`), '.select-line')];
        }
        case 'mute': return inPanels(`.mixer-list [data-action="mute"][data-value="${arg}"]`);
        case 'mix': return up(inPanels(`.mixer-list [data-mix="${arg}"]`), '.mixer-row');
        case 'fx': return arg === 'echo' ? up(inPanels('.fx-echo'), '.fx-group') : [];
        case 'automation': return inPanels('.auto-box');
        case 'kit': return inPanels('.kit-box');
        default: return [];
      }
    }

    /** Fokus, Dimmen und Markierungen im Raster. Studio-Panels werden
     *  wiederverwendet: das Panel der Einheit (lesson.tab), dazu aus anderen
     *  Reitern nur die Abschnitte, in denen ein Fokus-Element steht. */
    _wsDecorate() {
      this.$all('.ws-dim, .ws-focus, .ws-from, .ws-to, .ws-hide, .ws-hint').forEach((el) => el.classList.remove('ws-dim', 'ws-focus', 'ws-from', 'ws-to', 'ws-hide', 'ws-hint'));
      this.$all('.tab-panel[inert], .ws-panel [inert]').forEach((el) => { el.inert = false; });
      const ws = this.ui.ws;
      if (this.state.view !== 'workshop' || !ws) return;
      const { lesson } = ws;
      const focusEls = lesson.focus.flatMap((key) => this._wsFocusEls(key));
      const home = this.$(`.tab-panel[data-tab-panel="${lesson.tab}"]`);
      const panels = new Set([home]);
      for (const el of focusEls) { const p = el.closest('.tab-panel'); if (p) panels.add(p); }
      this.$all('.tab-panel').forEach((p) => { p.hidden = !panels.has(p); });
      const dimAround = (node) => {
        for (const child of node.children) {
          if (focusEls.includes(child)) continue;
          if (focusEls.some((el) => child.contains(el))) dimAround(child);
          else child.classList.add('ws-dim');
        }
      };
      for (const p of panels) {
        if (p !== home) p.querySelectorAll(':scope > .panel').forEach((sec) => { if (!focusEls.some((el) => sec.contains(el))) sec.classList.add('ws-hide'); });
        dimAround(p);
      }
      focusEls.forEach((el) => {
        el.classList.add('ws-focus');
        const details = el.closest('details');
        if (details && !details.open) details.open = true;
      });
      if (lesson.mark && !this._wsDone()) {
        for (const [track, { from = [], to = [] }] of Object.entries(lesson.mark)) {
          for (const [list, cls] of [[from, 'ws-from'], [to, 'ws-to']]) {
            list.forEach((step) => this.$(`.track-list .step-cell[data-track="${track}"][data-step="${step}"]`)?.classList.add(cls));
          }
        }
      }
      const ch = ws.ch;
      if (ch?.phase === 'running' && ch.hint && ch.variant) this.$(`.track-list .track-row[data-track="${ch.variant.track}"]`)?.classList.add('ws-hint');
      // „Vorher“: nur der Umschalter bleibt bedienbar (sonst gingen
      // Änderungen am Ausgangszustand beim Zurückschalten verloren).
      if (ws.ab?.showing === 'before') {
        panels.forEach((p) => { p.inert = true; });
        this.$all('.ws-panel .ws-head, .ws-panel .ws-picker, .ws-card [data-action="ws-restart"], .ws-card [data-action="ws-prev"], .ws-card [data-action="ws-next"]').forEach((el) => { el.inert = true; });
      }
    }

    _renderWorkshop() {
      const host = this.$('.workshop-view');
      if (!host || host.hidden) return;
      const ws = this.ui.ws;
      const lesson = ws?.lesson || null;
      const progress = this._saved.workshop;
      const tier = this.ui.wsTier || lesson?.tier || 'tour';
      const area = this.ui.wsArea || (lesson?.tier === 'deep' ? lesson.area : LESSON_AREAS[0]);
      this._chips(this.$('.ws-tiers'), LESSON_TIERS.map((id) => ({ value: id, label: t(TIER_KEY[id]) })), tier, 'ws-tier');
      const tour = WORKSHOP_LESSONS.filter((l) => l.tier === 'tour');
      const tourDone = tour.filter((l) => progress.done[l.id]).length;
      this.$('.ws-progress').textContent = tf('lab.ws.progress', { done: tourDone, total: tour.length });
      const areas = this.$('.ws-areas');
      areas.hidden = tier !== 'deep';
      this._chips(areas, LESSON_AREAS.map((id) => ({ value: id, label: t(AREA_KEY[id]) })), area, 'ws-area');
      const list = WORKSHOP_LESSONS.filter((l) => l.tier === tier && (tier !== 'deep' || l.area === area));
      // Kopf: wo man steht, Punkte für die Einheiten dieser Reihe.
      const siblings = lesson ? this._wsSiblings(lesson) : [];
      const where = lesson ? [t(TIER_KEY[lesson.tier]), lesson.tier === 'deep' ? t(AREA_KEY[lesson.area]) : null,
        tf('lab.ws.stepOf', { n: siblings.indexOf(lesson) + 1, total: siblings.length })].filter(Boolean).join(' · ') : t('lab.viewWorkshop');
      this.$('.ws-where').textContent = where;
      this.$('.ws-dots').replaceChildren(...siblings.map((l) => {
        const dot = document.createElement('i');
        if (l === lesson) dot.className = 'is-now';
        else if (progress.done[l.id]) dot.className = 'is-done';
        return dot;
      }));
      const pickerOpen = !lesson || !!this.ui.wsPicker;
      this.$('.ws-picker').hidden = !pickerOpen;
      this.$('.ws-all-btn').setAttribute('aria-expanded', String(pickerOpen));
      this.$('.ws-lessons').replaceChildren(...list.map((l) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip ws-lesson';
        btn.dataset.action = 'ws-lesson';
        btn.dataset.value = l.id;
        btn.setAttribute('aria-pressed', String(l === lesson));
        const title = t(`lab.lesson.${l.id}.title`);
        const done = !!progress.done[l.id];
        btn.innerHTML = done ? '<span class="ws-tick" aria-hidden="true">✓</span>' : '';
        btn.append(title);
        if (done) btn.setAttribute('aria-label', `${title}, ${t('lab.ws.doneAria')}`);
        return btn;
      }));
      const card = this.$('.ws-card');
      card.hidden = !lesson;
      if (!lesson) return;
      const key = (name) => `lab.lesson.${lesson.id}.${name}`;
      const done = this._wsDone();
      this.$('.ws-title').textContent = t(key('title'));
      this.$('.ws-do').textContent = t(key('do'));
      this.$('.ws-checks').replaceChildren(...lesson.checks.map((_, i) => {
        const li = document.createElement('li');
        li.className = `ws-check${i < ws.reached ? ' is-reached' : ''}`;
        li.innerHTML = `<span class="ws-box" aria-hidden="true">${i < ws.reached ? '✓' : ''}</span><span class="ws-check-text"></span>`;
        li.querySelector('.ws-check-text').textContent = t(key(`check${i + 1}`));
        if (i < ws.reached) li.setAttribute('aria-label', `${t(key(`check${i + 1}`))}, ${t('lab.ws.doneAria')}`);
        return li;
      }));
      this.$('.ws-why-text').textContent = t(key('why'));
      const aha = this.$('.ws-aha');
      aha.hidden = !done;
      aha.querySelector('strong').textContent = t('lab.ws.done');
      aha.querySelector('span').textContent = t(key('aha'));
      this.$('.ws-tour-done').hidden = !(lesson.tier === 'tour' && tourDone === tour.length);
      const ab = this.$('[data-action="ws-ab"]');
      ab.hidden = !done || !!lesson.kind;
      const before = ws.ab?.showing === 'before';
      ab.setAttribute('aria-pressed', String(before));
      const which = t(before ? 'lab.ws.before' : 'lab.ws.after');
      ab.setAttribute('aria-label', tf('lab.ws.abHint', { which }));
      ab.querySelector('.ws-ab-before').classList.toggle('is-on', before);
      ab.querySelector('.ws-ab-after').classList.toggle('is-on', !before);
      const hint = this.$('.ws-ab-hint');
      hint.hidden = !done || !!lesson.kind;
      hint.textContent = tf('lab.ws.abHint', { which });
      this.$('[data-action="ws-next"]').hidden = !this._wsNext();
      this.$('[data-action="ws-prev"]').hidden = !this._wsPrev();
      this._renderWsChallenge();
    }

    /** Eigene Stimme: aus dem Stimmprofil der App, sonst hier gewählt. */
    _choirPart() {
      let part = null;
      try { part = global.chorVoiceProfile?.get()?.part || null; } catch { /* ohne App */ }
      return CHOIR_PARTS.includes(part) ? part : CHOIR_PARTS.includes(this.ui.choirPart) ? this.ui.choirPart : null;
    }

    /** Aufgabe wählen: ein Undo-Schritt, Zustand über choirTaskState. */
    _applyChoirTask(id) {
      const task = CHOIR_TASKS.find((x) => x.id === id);
      if (!task) return;
      const next = choirTaskState(this.state, task, this._choirPart());
      const meterBefore = this._meter();
      this._applyState(sanitizeState(next));
      if (this._meter() !== meterBefore && this.playing) this.globalStep = Math.ceil(this.globalStep / this._barSteps()) * this._barSteps();
      this._fadeDrums(false);
      // Liegeton braucht eine Nutzergeste — das Antippen der Aufgabe ist eine.
      if (task.set.droneOn) this._setDrone(true);
      this._renderChoir();
    }

    /** „Beat ausblenden“: Drums in vier Takten auf 0; „Beat zurück“. */
    _fadeDrums(out) {
      this.ui.drumsFaded = !!out;
      const eng = this.engine;
      if (eng.ready) {
        const node = eng.layers?.drums?.level || eng.buses?.drums;
        const now = eng.ctx.currentTime;
        if (node) {
          node.gain.cancelScheduledValues(now);
          node.gain.setValueAtTime(node.gain.value, now);
          const target = out || this.state.mute.drums ? 0 : this.state.mix.drums;
          node.gain.linearRampToValueAtTime(target, now + (out ? 4 * this._barSteps() * this._stepSeconds() : .3));
        }
      }
      this._renderChoir();
    }

    _renderChoir() {
      const host = this.$('.choir-view');
      if (!host || host.hidden) return;
      const s = this.state;
      const task = CHOIR_TASKS.find((x) => x.id === s.choirTask) || null;
      const chips = (el, pairs, active, action) => this._chips(el, pairs.map(([value, label]) => ({ value, label })), active, action);
      chips(this.$('.choir-task-chips'), CHOIR_TASKS.map((x) => [x.id, t(`lab.task.${x.id}.title`)]), s.choirTask, 'choir-task');
      this.$('.task-title').textContent = task ? t(`lab.task.${task.id}.title`) : t('lab.choirPick');
      this.$('.task-help').textContent = task ? `${t(`lab.task.${task.id}.help1`)} ${t(`lab.task.${task.id}.help2`)}` : t('lab.choirPickHint');
      const part = this._choirPart();
      this.$('.choir-part').hidden = !!part && !!this._profilePart();
      chips(this.$('.choir-part-chips'), CHOIR_PARTS.map((v) => [v, t(SATB_KEY[v])]), part, 'choir-part');
      const grooves = DRUM_PATTERNS.map((p, i) => [p, i]).filter(([p]) => p.cat === 'calm');
      chips(this.$('.choir-grooves'), [['none', t('lab.choirNoBeat')], ...grooves.map(([p, i]) => [String(i), p.name])],
        s.mute.drums ? 'none' : String(s.patternIndex), 'choir-groove');
      const fade = this.$('[data-action="fade-drums"]');
      fade.hidden = !task?.fadeDrums;
      fade.textContent = t(this.ui.drumsFaded ? 'lab.choirBeatBack' : 'lab.choirBeatFade');
      this._renderChoirNow(this.playing && this.shown ? this.shown.g : 0);
    }
    _profilePart() { try { return global.chorVoiceProfile?.get()?.part || null; } catch { return null; } }

    /** Anzeige „Jetzt“: Akkord groß, darunter je Aufgabe der Zielton bzw.
     *  Hilfe (Tonleiter, Pentatonik, Echo, 2 und 4, Swing, Mundschlagzeug). */
    _renderChoirNow(g) {
      const host = this.$('.choir-display');
      if (!host || this.$('.choir-view').hidden) return;
      const s = this.state;
      const task = CHOIR_TASKS.find((x) => x.id === s.choirTask) || null;
      const h = this._harmonyAt(Math.max(0, g));
      const [spellRoot, spellMode] = this._spellKeyAt(h.index);
      const name = (pc) => { const n = spell(pc, spellRoot, spellMode, labLang); return labLang === 'en' ? n : n.charAt(0).toLowerCase() + n.slice(1); };
      this.$('.choir-now-chord').textContent = chordName(h.keyRoot, h.steps, h.deg, h.sevenths, s.modeId, labLang, h.alter, h.bass);
      const barSteps = this._barSteps();
      const step = mod(g, barSteps);
      const bar = Math.floor(Math.max(0, g) / barSteps);
      const meter = METERS[this._meter()];
      let target = '';
      let html = '';
      const display = task?.display;
      if (display === 'ownNote') {
        const part = this._choirPart();
        const v = this._voicings()[h.index];
        target = part && v ? `${t(SATB_KEY[part])}: ${noteLabel(v[part], spellRoot, spellMode, labLang)}` : t('lab.choirPartAsk');
      } else if (display === 'root' || display === 'third') {
        target = `${t(display === 'root' ? 'lab.choirRoot' : 'lab.choirThird')}: ${name(choirTargetPc(h.keyRoot, h.steps, h.deg, display))}`;
      } else if (display === 'scale') {
        const steps = this._mode().steps;
        const walk = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];
        const cur = walk[bar % walk.length];
        html = `<div class="scale-row">${Array.from({ length: 8 }, (_, d) => `<span class="scale-note${d === cur ? ' is-now' : ''}"><b>${name(s.keyRoot + degreeSemis(steps, d))}</b><small>${['do', 're', 'mi', 'fa', 'so', 'la', 'ti', 'do′'][d]}</small></span>`).join('')}</div>`;
        target = `${t('lab.choirSing')}: ${name(s.keyRoot + degreeSemis(steps, cur))}`;
      } else if (display === 'pentatonic') {
        const semis = s.modeId === 'minor' ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
        html = `<div class="scale-row">${semis.map((x) => `<span class="scale-note"><b>${name(s.keyRoot + x)}</b></span>`).join('')}</div>`;
      } else if (display === 'echo') {
        target = bar % 2 === 0 ? t('lab.choirListen') : t('lab.choirYouSing');
      } else if (display === 'beats24') {
        const beat = meter.beats.findIndex((b, i) => step >= b && (i === meter.beats.length - 1 || step < meter.beats[i + 1]));
        html = `<div class="beat-fields">${meter.beats.map((_, i) => `<span class="beat-field${i % 2 ? ' is-clap' : ''}${this.playing && i === beat ? ' is-now' : ''}">${i + 1}</span>`).join('')}</div>`;
        target = t('lab.choirClap24');
      } else if (display === 'swingSyllables') {
        const beat = meter.beats.findIndex((b, i) => step >= b && (i === meter.beats.length - 1 || step < meter.beats[i + 1]));
        html = `<div class="beat-fields">${meter.beats.map((_, i) => `<span class="beat-field${this.playing && i === beat ? ' is-now' : ''}">du-ba</span>`).join('')}</div>`;
      } else if (display === 'vocalPerc') {
        const vocal = this._pattern().vocal || {};
        const beatData = s.beat;
        html = `<div class="vp-grid">${Object.entries(vocal).map(([track, syl]) => `<div class="vp-row"><span class="vp-name">${syl}</span>${Array.from({ length: barSteps }, (_, i) => `<span class="vp-cell${beatData[track]?.[i] !== undefined ? ' is-on' : ''}${this.playing && i === step ? ' is-now' : ''}">${beatData[track]?.[i] !== undefined ? syl : ''}</span>`).join('')}</div>`).join('')}</div>`;
      }
      const key = `${display}|${target}|${html}`;
      if (this._choirNowKey === key) return;
      this._choirNowKey = key;
      this.$('.choir-now-target').textContent = target;
      host.innerHTML = html;
    }

    /* ---- Reiter ---- */

    _setTab(tab) {
      if (tab !== 'beat') this._setBeatZoom(false);
      this.ui.tab = tab;
      if (tab === 'sampler') { this._primeSamples(); this._renderSampler(); }
      this.$all('.tab-btn').forEach((btn) => btn.setAttribute('aria-selected', String(btn.dataset.tab === tab)));
      this.$all('.tab-panel').forEach((panel) => { panel.hidden = panel.dataset.tabPanel !== tab; });
      this.$('.lab-body').scrollTop = 0;
    }

    /* ---- Abgeleitete Werte ---- */

    _pattern() { return DRUM_PATTERNS[this.state.patternIndex]; }
    _meter() { return this._pattern().meter; }
    _barSteps() { return METERS[this._meter()].steps; }
    _stepSeconds() { return stepSecondsFor(this.state.bpm, this._meter()); }
    /** Tempo setzen (im Tempo-Bezug der aktuellen Taktart). */
    _setBpm(bpm) {
      const s = this.state;
      s.bpm = clamp(Math.round(bpm), BPM_MIN, BPM_MAX);
      s.eighths = s.bpm * eighthsPerBeat(this._meter());
    }
    /** Nach einem Taktartwechsel: Achtel gleich schnell, Anzeige im neuen Bezug. */
    _convertTempo() {
      const s = this.state;
      s.bpm = clamp(Math.round(s.eighths / eighthsPerBeat(this._meter())), BPM_MIN, BPM_MAX);
    }
    _mode() { return MODES.find((m) => m.id === this.state.modeId) || MODES[0]; }
    /** Klingende Akkordfolge: Vorlage, bearbeitete Vorlage oder eigene. */
    _progression() { return progressionOfState(this.state); }
    /** Tonleiter für den Akkord auf Stufe `deg` (siehe chordSteps). */
    _stepsFor(deg, prog = this._progression(), index = -1) { return chordSteps(this._mode().steps, this.state.modeId, prog, deg, prog.alter?.[index] || null); }
    /** Stufenzahl/Name des Akkords an Stelle `index` der Folge (mit geliehenen Akkorden und Umkehrung). */
    _romanAt(prog, index) { return romanNumeral(this._stepsFor(prog.degrees[index], prog, index), prog.degrees[index], prog.sevenths, prog.alter?.[index] || null, prog.bass?.[index] || 0, this._mode().steps); }
    _nameAt(prog, index) { return chordName(this.state.keyRoot, this._stepsFor(prog.degrees[index], prog, index), prog.degrees[index], prog.sevenths, this.state.modeId, labLang, prog.alter?.[index] || null, prog.bass?.[index] || 0); }
    _progName() {
      const s = this.state;
      return s.progName || t(progKey('Name', (PROGRESSIONS.find((p) => p.id === s.progId) || PROGRESSIONS[0]).id));
    }
    _clearProgEdit() {
      const s = this.state;
      s.progDegrees = null; s.progSevenths = false; s.progDominant = false; s.progDom7 = false; s.progName = null; s.progOwnId = null; s.progAlter = null; s.progBass = null;
      this.ui.progUndo = []; this.ui.progRedo = []; this.ui.progSel = 0;
    }
    /** Die klingende Melodie: Vorlage, bearbeitete Vorlage oder eigene. */
    _melody() {
      const s = this.state;
      const base = MELODIES[s.melodyIndex];
      if (!s.melodyBars) return { ...base, ref: base.ref ?? 'chord' };
      return { name: s.melodyName || base.name, meter: s.melodyMeter, cat: s.melodyOwnId ? OWN_CAT : base.cat, bars: s.melodyBars, ref: s.melodyRef };
    }
    _clearMelodyEdit() {
      const s = this.state;
      s.melodyBars = null; s.melodyMeter = null; s.melodyName = null; s.melodyOwnId = null; s.melodyRef = 'chord';
      this.ui.melUndo = []; this.ui.melRedo = []; this.ui.melBar = 0;
    }
    /** Klang der Akkorde: Synth-Chor (fest, 'Airy Choir') oder echter Chor ('Chor Ooh';
     *  ohne geladene Samples übernimmt die Engine den Ersatzklang 'Airy Choir'). */
    _chordSound() { return this.state.chordSound === 'choir' ? CHOIR_CHORD_SOUND : CHORD_SOUND; }
    /** Sample-Instrumente laden, die gerade gebraucht werden (Melodieklang, Akkorde). */
    _loadInstruments() {
      if (!this.engine.ready) return;
      const s = this.state;
      if (s.sound.sample) this.engine.ensureInstrument(s.sound.sample).then(() => this._renderSampleNote());
      if (s.chordSound === 'choir') this.engine.ensureInstrument('choir');
    }
    _renderSampleNote() {
      const note = this.$('.sample-note');
      if (note) note.hidden = !(this.state.sound.sample && !this.engine.instrumentReady(this.state.sound.sample));
    }
    _bassSound() { return BASS_SOUNDS.find((b) => b.id === this.state.bassSoundId) || BASS_SOUNDS[0]; }

    /** Harmonie an einem Schritt: Tonart, Modus, Akkordstufe. */
    _harmonyAt(g) {
      const s = this.state;
      const prog = this._progression();
      const barSteps = this._barSteps();
      const bar = Math.floor(g / barSteps);
      const index = Math.floor(bar / s.chordBars) % prog.degrees.length;
      const deg = prog.degrees[index];
      return {
        keyRoot: s.keyRoot, steps: this._stepsFor(deg, prog, index), deg, sevenths: !!prog.sevenths, alter: prog.alter?.[index] || null, bass: prog.bass?.[index] || 0,
        index, chordStart: g % (barSteps * s.chordBars) === 0,
      };
    }

    _currentHarmony() { return (!this._shownOriginal() && this.shown?.h) || this._harmonyAt(this.shown?.g || 0); }

    /** Zeigt die Anzeige gerade einen Schritt des de:construct-Originals? */
    _shownOriginal() { return this.playing && this.shown?.side === 'orig'; }

    /** Vierstimmiger Satz für alle Akkorde der aktuellen Folge — einmal je
     *  Tonart/Modus/Folge gerechnet. Zweiter Durchlauf ab dem letzten
     *  Akkord, damit auch der Übergang Ende → Anfang geführt ist. */
    _voicings() {
      const s = this.state;
      const prog = this._progression();
      // Pop-Satz: bei laufender Melodie liegt die Oberstimme höchstens auf 64 (statt 69).
      const pop = s.chordVoicing === 'pop';
      const key = `${s.keyRoot}|${s.modeId}|${prog.degrees.join(',')}|${!!prog.sevenths}|${!!prog.dominant}|${!!prog.dom7}|${(prog.alter || []).join()}|${(prog.bass || []).join()}`
        + (pop ? `|pop|${s.chordAdd9}|${s.melodyOn}` : '');
      if (this._voicingCache?.key === key) return this._voicingCache.list;
      const list = pop
        ? voiceProgressionPop(s.keyRoot, this._mode(), prog, { add9: s.chordAdd9, topMax: s.melodyOn ? 64 : 69 })
        : voiceProgressionSatb(s.keyRoot, this._mode(), prog);
      this._voicingCache = { key, list };
      return list;
    }

    /** Tonart, in der die Töne des Akkords `index` geschrieben werden:
     *  sonst die gewählte, bei Dominantseptakkorden (Blues) die Mixolydisch-
     *  Leiter des Akkordgrundtons (C7 in C: B, nicht Ais). */
    _spellKeyAt(index) {
      const s = this.state;
      const prog = this._progression();
      const deg = prog.degrees[index] ?? prog.degrees[0];
      if (prog.dom7) return [s.keyRoot + this._mode().steps[mod(deg, 7)], 'mixolydian'];
      return [s.keyRoot, s.modeId];
    }

    /** Bass-Grundtöne je Akkord der aktuellen Folge, mit Stimmführung
     *  (bassRootsFor) — einmal je Tonart/Modus/Folge gerechnet. */
    _bassRoots() {
      const s = this.state;
      const prog = this._progression();
      const key = `${s.keyRoot}|${s.modeId}|${prog.degrees.join(',')}|${!!prog.sevenths}|${!!prog.dominant}|${!!prog.dom7}|${(prog.alter || []).join()}|${(prog.bass || []).join()}`;
      if (this._bassRootCache?.key === key) return this._bassRootCache.list;
      // Der Basston ist der Akkordton der Umkehrung (bass: 0 Grundton, 1 Terz, 2 Quinte).
      const list = bassRootsFor(prog.degrees.map((deg, i) => mod(s.keyRoot + degreeSemis(this._stepsFor(deg, prog, i), deg + 2 * (prog.bass?.[i] || 0)), 12)));
      this._bassRootCache = { key, list };
      return list;
    }

    _bassMidi(h, bassDeg) {
      // Die Linie hängt am Basston des Akkords: bei einer Umkehrung (h.bass) liegt die Stufe 0
      // auf Terz oder Quinte, die übrigen Stufen bleiben Stufen über dem Akkordgrundton.
      const invSemis = degreeSemis(h.steps, h.deg + 2 * (h.bass || 0));
      return bassNoteMidi(this._bassRoots()[h.index] ?? 36 + mod(h.keyRoot + invSemis, 12), h.steps, h.deg, h.bass || 0, bassDeg);
    }

    /* ---- Transport ---- */

    async _ensureAudio() {
      await this.engine.start();
      if (this._syncedCtx !== this.engine.ctx) {
        this._syncedCtx = this.engine.ctx;
        this._syncEngine();
        // Werks-Samples sind jetzt (im Hintergrund) dabei: Pads und Wellenformen neu zeichnen.
        this.engine.labSamples?.loading?.then(() => { this._renderSampler(); this._renderLive(); }).catch(() => {});
      }
    }

    _syncEngine() {
      if (!this.engine.ready) return;
      // de:construct auf A: Pegel und Effekte des Originals.
      if (this._dcHearsOriginal() && this.state !== this._saved.deconstruct.original) { this._dcHeard(() => this._syncEngine()); return; }
      const s = this.state;
      // Gesamtlautstärke bleibt beim A/B-Wechsel die eigene.
      this.engine.setMaster((this._dcMine || s).mix.master);
      for (const bus of BUSES) this.engine.setBusLevel(bus, s.mute[bus] || (bus === 'drums' && this.ui.drumsFaded) ? 0 : s.mix[bus]);
      for (const layer of SOUND_LAYERS) this.engine.setLayerSound(layer, this._heardSound());
      this.engine.setLayerSound('chords', this._chordSound());
      this._loadInstruments();
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
      this._ovl.lastTick = 0; this._ovl.ratioWall = 0; this._ovl.underruns = this._playbackStats()?.underrunEvents || 0;
      this._syncRenderCapacity();
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
      this._syncRenderCapacity();
      // Liegeton und gehaltene Tasten laufen unabhängig vom Transport weiter.
      if (this.engine.ready) this.engine.releaseLayers(['melody', 'arp', 'chords']);
      this.$all('.step-cell.is-now, .step-cell.is-fill').forEach((cell) => cell.classList.remove('is-now', 'is-fill'));
      this._showMelodyStep(-1);
      this._showRecLoopStep(-1);
      if (this.autoRec.phase !== 'idle') this._autoFinish();
      if (this.rec.phase === 'recording') this._recFinish();
      else if (this.rec.phase === 'armed') { this.rec.phase = 'idle'; this._renderRec(); }
      this._renderTransport();
      this._renderNow();
      this._setStatus(t('lab.statusReady'));
      this._ensureArpClock(); // noch gehaltene Tasten: der Arp läuft allein weiter
    }

    randomize() {
      this._wsAbReset();
      this._pushHistory();
      const s = this.state;
      const locks = s.locks;
      if (!locks.beat) {
        s.patternIndex = pick(orderIndexes(BEAT_ORDER, patternIndexByName));
        s.beat = beatFromPattern(this._pattern());
        s.percSound = percOf(this._pattern());
        s.beatEdited = false;
        // Tempi als Viertel gedacht — in 6/8 in punktierte Viertel umgerechnet.
        this._setBpm(pick([78, 86, 94, 102, 108, 116, 124, 132]) * 2 / eighthsPerBeat(this._meter()));
        s.swing = pick([0, 0, 0, .25, .45]);
      }
      if (!locks.harmony) {
        s.keyRoot = Math.floor(Math.random() * 12);
        s.modeId = pick(MODES).id;
        s.progId = pick(progsForRandom(s.modeId)).id;
        this._clearProgEdit();
      }
      if (!locks.melody) {
        const candidates = orderIndexes(MELODY_ORDER, melodyIndexByName).map((i) => [MELODIES[i], i]).filter(([m]) => m.meter === this._meter());
        s.melodyIndex = pick(candidates)[1];
        this._clearMelodyEdit();
      }
      this._ensureMelodyMeter();
      if (!locks.sound) {
        // Nur aus der kuratierten Liste; Sample-Klänge erst, wenn ihre Samples geladen sind.
        s.sound = soundFromPreset(pick(orderIndexes(PRESET_ORDER, presetIndexByName)
          .filter((i) => !SYNTH_PRESETS[i].sample || this.engine.instrumentReady(SYNTH_PRESETS[i].sample))));
      }
      this._afterStateChange();
    }

    /** Melodie und Loop müssen dieselbe Taktart haben — sonst wählt der
     *  Wechsel des Loops still die erste passende Melodie. */
    _ensureMelodyMeter() {
      const s = this.state;
      if (s.melodyBars && s.melodyMeter !== this._meter()) this._clearMelodyEdit();
      if (MELODIES[s.melodyIndex].meter === this._meter()) return;
      s.melodyIndex = firstMelodyOfMeter(this._meter());
    }

    _tapTempo() {
      const now = performance.now();
      this.tapTimes = this.tapTimes.filter((time) => now - time < 2500);
      this.tapTimes.push(now);
      if (this.tapTimes.length < 2) return;
      const recent = this.tapTimes.slice(-5);
      const avg = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
      this._setBpm(60000 / avg);
      this._onTempoChange();
    }

    _onTempoChange() {
      // Echo-Zeit folgt dem Tempo dessen, was klingt (de:construct: ggf. Original).
      this._dcHeard(() => this.engine.setFx(this.state.fx, this._stepSeconds()));
      this._dcAutosave();
      this._renderTransport();
    }

    /* ---- Überlastung erkennen und anzeigen ----
       Drei Anzeichen, jeweils nur bei sichtbarer Seite und laufendem Kontext:
       (1) der Scheduler-Takt (25 ms) reißt ab — der Hauptthread hängt;
       (2) die Audiozeit läuft langsamer als die Wanduhr — der Audiothread
           kommt nicht hinterher;
       (3) der Browser meldet selbst Unterläufe (AudioContext.playbackStats, Chrome
           ab 146; früher im Spec-Entwurf playoutStats genannt — bleibt als Rückfall).
       Drei Aussetzer innerhalb von 10 s zeigen das rote Ausrufezeichen am Titel. */

    /** Die Wiedergabe-Statistik des Browsers (live, ~1×/s aktualisiert) oder
     *  null, wenn es sie nicht gibt (Firefox, Safari, ältere Chromium). */
    _playbackStats() {
      try { const ctx = this.engine.ctx; return ctx?.playbackStats ?? ctx?.playoutStats ?? null; } catch { return null; }
    }

    /** Steigt der Unterlauf-Zähler der Statistik, ist das ein Aussetzer. */
    _pollPlaybackStats() {
      const o = this._ovl, stats = this._playbackStats();
      let underruns = 0, duration = 0;
      try { underruns = Number(stats?.underrunEvents) || 0; duration = Number(stats?.underrunDuration) || 0; } catch { /* Statistik nicht lesbar */ }
      if (underruns > o.underruns) this._noteOverload('underrun');
      o.underruns = underruns;
      o.underrunDuration = duration;
    }

    _watchOverload(ctx) {
      const o = this._ovl, now = performance.now();
      if (document.visibilityState !== 'visible' || ctx.state !== 'running' || now - o.visibleSince < 1500) { o.lastTick = 0; o.ratioWall = 0; return; }
      if (o.lastTick && now - o.lastTick > OVERLOAD_GAP_MS) this._noteOverload('gap');
      o.lastTick = now;
      if (o.ratioWall && now - o.ratioWall >= 1000) {
        const ratio = (ctx.currentTime - o.ratioAudio) / ((now - o.ratioWall) / 1000);
        if (ratio < OVERLOAD_RATIO) this._noteOverload('ratio');
        o.ratioWall = now; o.ratioAudio = ctx.currentTime;
      } else if (!o.ratioWall) { o.ratioWall = now; o.ratioAudio = ctx.currentTime; }
      this._pollPlaybackStats();
    }

    _noteOverload(reason) {
      const o = this._ovl, now = performance.now();
      if (reason in o.counts) o.counts[reason]++; // gezählt wird jedes Anschlagen, auch das entprellte
      if (now - o.lastEvent < 300) return; // ein Aussetzer löst oft mehrere Anzeichen zugleich aus
      o.lastEvent = now;
      o.events = o.events.filter((time) => now - time < OVERLOAD_WINDOW_MS);
      o.events.push(now);
      if (o.events.length >= OVERLOAD_EVENTS) this._renderOverload();
    }

    /** Warnung (roter Knopf mit „!“) oder neutral (gedämpfter Knopf „Audio & Leistung“). */
    _overloadWarn() { return !!this._ovl.warn; }

    _renderOverload() {
      this._ovl.cleared = false;
      this._ovl.warn = true;
      this._renderOverloadBtn();
      this._renderOverloadPop();
    }

    /** Der Knopf am Titel ist immer da; nur Aussehen und Beschriftung wechseln. */
    _renderOverloadBtn() {
      const btn = this.$('.ovl-btn');
      if (!btn) return;
      const warn = this._overloadWarn();
      const label = t(warn ? 'lab.ovl.aria' : 'lab.ovl.ariaIdle');
      btn.classList.toggle('is-warn', warn);
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }

    _renderOverloadPop() {
      const pop = this.$('.ovl-pop');
      if (!pop) return;
      const current = this._saved.latency;
      const warn = this._overloadWarn();
      this.$('.ovl-pop').setAttribute('aria-label', t(warn ? 'lab.ovl.title' : 'lab.ovl.titleIdle'));
      this.$('.ovl-title').textContent = t(warn ? 'lab.ovl.title' : 'lab.ovl.titleIdle');
      this.$('.ovl-text').textContent = t(warn ? 'lab.ovl.text' : 'lab.ovl.textIdle');
      this._rememberLatency();
      this.$all('.ovl-pop [data-action="latency"]').forEach((chip) => {
        chip.setAttribute('aria-pressed', String(chip.dataset.value === current));
        const info = this._ovl.bufInfo?.[chip.dataset.value];
        chip.querySelector('.lat-info').textContent = info ? tf('lab.ovl.chipInfo', info) : '';
      });
      const ctx = this.engine.ctx;
      const ms = ctx ? Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000) : 0;
      this.$('.ovl-measured').textContent = ms > 0 ? tf('lab.ovl.measured', { ms }) : '';
      this.$('.ovl-max').hidden = current !== 'playback';
      this._renderDiag();
    }

    _toggleOverloadPop(open = this.$('.ovl-pop').hidden, { focus = true } = {}) {
      this.$('.ovl-pop').hidden = !open;
      this.$('.ovl-btn').setAttribute('aria-expanded', String(open));
      global.clearInterval(this._ovl.timer);
      this._ovl.timer = 0;
      if (open) {
        this._renderOverloadPop();
        // Diagnose: einmal pro Sekunde auffrischen, solange das Panel offen ist.
        this._ovl.timer = global.setInterval(() => this._renderDiag(), 1000);
        this._readOutputDevice();
        this._probeBuffers();
        if (focus) this.$('.ovl-pop [aria-pressed="true"]')?.focus();
      } else if (focus) this.$('.ovl-btn').focus();
      this._syncRenderCapacity();
    }

    /* ---- Diagnose ---- */

    /** Puffergröße eines Kontexts: baseLatency (s) × Abtastrate = Samples je Callback. */
    _bufferInfo(ctx) {
      try {
        const frames = Math.round(ctx.baseLatency * ctx.sampleRate);
        return frames > 0 ? { frames, ms: Math.round(ctx.baseLatency * 1000) } : null;
      } catch { return null; }
    }

    /** Wert des laufenden Kontexts für den gewählten Puffer merken. */
    _rememberLatency() {
      const info = this.engine.ctx && this._bufferInfo(this.engine.ctx);
      if (info) (this._ovl.bufInfo ||= {})[this._saved.latency] = info;
    }

    /** Die anderen Puffer einmal je Sitzung kurz ausprobieren (Wegwerf-Kontext, sofort wieder zu),
     *  damit die Chips ihre Größe nennen können. Nicht während der Wiedergabe: ein zusätzlicher
     *  Kontext könnte dort knacken lassen. */
    async _probeBuffers() {
      const o = this._ovl, Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx || this.playing || o.probing || o.probed) return;
      o.probing = true;
      try {
        for (const hint of LATENCY_HINTS) {
          if (o.bufInfo?.[hint]) continue;
          let probe = null;
          try { probe = new Ctx({ latencyHint: hint }); const info = this._bufferInfo(probe); if (info) (o.bufInfo ||= {})[hint] = info; } catch { /* nicht möglich */ }
          try { await probe?.close(); } catch { /* schon zu */ }
        }
        o.probed = true;
      } finally { o.probing = false; this._renderOverloadPop(); }
    }

    /** Rechenlast des Audio-Threads laut Browser (AudioRenderCapacity, per
     *  Feature-Detection): läuft nur, solange der Transport spielt oder das
     *  Panel offen ist; sonst stop(). Folgt einem neu gebauten Kontext. */
    _syncRenderCapacity() {
      const o = this._ovl, ctx = this.engine.ctx;
      const want = !!ctx && (this.playing || !this.$('.ovl-pop').hidden);
      if (o.rc && (!want || o.rcCtx !== ctx)) {
        try { o.rc.removeEventListener('update', o.rcHandler); o.rc.stop(); } catch { /* Kontext schon zu */ }
        o.rc = null; o.rcCtx = null; o.rcStats = null;
      }
      if (!want || o.rc) return;
      try {
        const rc = ctx.renderCapacity;
        if (!rc || typeof rc.start !== 'function') return;
        o.rcHandler = (event) => this._onRenderCapacity(event);
        rc.addEventListener('update', o.rcHandler);
        o.rc = rc; o.rcCtx = ctx;
        rc.start({ updateInterval: 1 });
      } catch { o.rc = null; o.rcCtx = null; }
    }

    /** `update` der Renderkapazität (1×/s): Werte merken — die Anzeige holt sie sich selbst —
     *  und eine Spitze oder ein Unterlauf als viertes Anzeichen („load“) melden. */
    _onRenderCapacity(event) {
      const num = (value) => (Number.isFinite(value) ? value : 0);
      const stats = this._ovl.rcStats = { avg: num(event?.averageLoad), peak: num(event?.peakLoad), ratio: num(event?.underrunRatio) };
      if (this._rcOverload(stats) && document.visibilityState === 'visible' && this.engine.ctx?.state === 'running') this._noteOverload('load');
    }

    /** Spitzenlast ab 95 % oder irgendein Unterlauf in der letzten Sekunde: der Audiothread hat Töne verpasst oder fast. */
    _rcOverload({ peak, ratio }) { return peak >= RC_PEAK_LOAD || ratio > 0; }

    /** Ausgabegerät beim Namen nennen — nur wenn der Browser die Namen ohne
     *  Berechtigungsabfrage herausgibt (Labels sind sonst leer); sonst weglassen. */
    async _readOutputDevice() {
      const o = this._ovl;
      try {
        const list = await navigator.mediaDevices?.enumerateDevices?.();
        const sink = this.engine.ctx?.sinkId;
        const id = (typeof sink === 'string' ? sink : sink?.deviceId) || 'default';
        o.device = (list || []).find((d) => d.kind === 'audiooutput' && d.label && d.deviceId === id)?.label || '';
      } catch { o.device = ''; }
    }

    /** Alle Diagnosewerte als [Beschriftung, Text] — für die Anzeige und fürs Kopieren. */
    _diagLines() {
      const o = this._ovl, ctx = this.engine.ctx, stats = this._playbackStats();
      const pct = (x) => Math.round(x * 100);
      const read = (fn) => { try { return fn(); } catch { return undefined; } };
      const canTest = !!(global.OfflineAudioContext || global.webkitOfflineAudioContext);
      const testText = o.test && !o.test.failed ? tf('lab.ovl.loadTest', { pct: o.test.pct }) : '';
      let load;
      if (o.rc && o.rcStats) load = tf('lab.ovl.loadRc', { avg: pct(o.rcStats.avg), peak: pct(o.rcStats.peak), ratio: pct(o.rcStats.ratio) });
      else if (o.rc) load = t('lab.ovl.loadWait');
      else if (testText) load = testText;
      else load = t(canTest ? 'lab.ovl.loadNone' : 'lab.ovl.loadNA');
      const lines = [[t('lab.ovl.load'), load]];
      if (o.rc && testText) lines.push([t('lab.ovl.testLabel'), testText]);

      const events = read(() => stats?.underrunEvents);
      lines.push([t('lab.ovl.underruns'), stats && Number.isFinite(events)
        ? tf('lab.ovl.underrunsVal', { n: events, sec: (Number(read(() => stats.underrunDuration)) || 0).toFixed(2) })
        : t('lab.ovl.notReported')]);

      // Latenz in ms. Die Statistik nennt Sekunden; Werte über 10 gelten als schon in ms.
      const ms = (v) => Math.round(v > 10 ? v : v * 1000);
      const lat = [];
      const base = read(() => ctx?.baseLatency), out = read(() => ctx?.outputLatency);
      if (base > 0) lat.push(tf('lab.ovl.latBase', { ms: ms(base) }));
      if (out > 0) lat.push(tf('lab.ovl.latOut', { ms: ms(out) }));
      const avg = read(() => stats?.averageLatency), max = read(() => stats?.maximumLatency);
      if (avg > 0) lat.push(tf('lab.ovl.latAvg', { ms: ms(avg) }));
      if (max > 0) lat.push(tf('lab.ovl.latMax', { ms: ms(max) }));
      lines.push([t('lab.ovl.latency'), lat.length ? lat.join(' · ') : '–']);

      const ctxParts = [tf('lab.ovl.ctxBuffer', { name: t(`lab.ovl.${this._saved.latency}`) })];
      if (ctx) ctxParts.push(`${ctx.sampleRate} Hz`, String(ctx.state));
      if (o.device) ctxParts.push(o.device);
      lines.push([t('lab.ovl.context'), ctxParts.join(' · ')]);

      lines.push([t('lab.ovl.counts'), tf('lab.ovl.countsVal', { gap: o.counts.gap, ratio: o.counts.ratio, underrun: o.counts.underrun, load: o.counts.load })]);
      return lines;
    }

    _renderDiag() {
      const pop = this.$('.ovl-pop'), o = this._ovl;
      if (!pop || pop.hidden) return;
      const dl = this.$('.ovl-diag');
      dl.replaceChildren(...this._diagLines().flatMap(([label, value]) => {
        const dt = document.createElement('dt'), dd = document.createElement('dd');
        dt.textContent = label; dd.textContent = value;
        return [dt, dd];
      }));
      const canTest = !!(global.OfflineAudioContext || global.webkitOfflineAudioContext);
      const measure = this.$('[data-action="ovl-measure"]');
      measure.hidden = !canTest;
      measure.disabled = o.testing;
      measure.textContent = t(o.testing ? 'lab.ovl.measuring' : 'lab.ovl.measure');
      const res = this.$('.ovl-test');
      let text = '', level = '';
      if (o.test?.failed) text = t('lab.ovl.testFail');
      else if (o.test) {
        level = loadLevel(o.test.pct);
        text = tf('lab.ovl.testResult', { pct: o.test.pct });
        // Wenig Last, aber kleinster Puffer: Knacken kommt dann vom Puffer, nicht von der CPU.
        if (level !== 'ok') text += ` ${t(`lab.ovl.test_${level}`)}`;
        else if (this._saved.latency === 'interactive') text += ` ${tf('lab.ovl.test_okSmall', { name: t('lab.ovl.balanced') })}`;
      }
      if (res.textContent !== text) res.textContent = text; // Screenreader: nur bei Änderung
      res.className = `ovl-test${level ? ` is-${level}` : ''}`;
    }

    /** Lasttest: die aktuelle Groove-Einstellung 4 s lang im OfflineAudioContext
     *  rendern und die Wanduhrzeit messen — Renderdauer ÷ Musikdauer = Anteil
     *  der Echtzeit, den dieses Gerät dafür braucht (überall verfügbar, auch iPhone). */
    async _measureLoad() {
      const o = this._ovl;
      if (o.testing) return;
      o.testing = true;
      this._renderDiag();
      try {
        await this._ensureAudio(); // Abtastrate und Samples des Live-Kontexts
        o.test = { pct: Math.round(await this._renderLoadTest()) };
      } catch {
        o.test = { failed: true };
      } finally {
        o.testing = false;
        this._renderDiag();
      }
    }

    /** Baut mit demselben Graph-Aufbau wie live (GrooveEngine._buildGraph) eine
     *  zweite Engine auf einem OfflineAudioContext, plant über die echten
     *  Spielfunktionen (_playStep: alle Spuren, Bass, Akkorde, Melodie, Arp) die
     *  ersten 4 s ein und gibt die Renderdauer in % der Musikdauer zurück. */
    async _renderLoadTest() {
      const OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
      const live = this.engine;
      const sampleRate = live.ctx.sampleRate;
      const off = new OAC(2, Math.ceil(sampleRate * LOADTEST_SECONDS), sampleRate);
      const eng = new GrooveEngine();
      eng.ctx = off;
      eng.maxVoices = Infinity; // alles ist vorab eingeplant: das Live-Limit (32) würde hier früh Töne abschneiden
      eng._buildGraph(off);
      // Bereits dekodierte Samples des Live-Kontexts mitbenutzen (Puffer sind kontextunabhängig).
      eng.labSamples = live.labSamples; eng.bassSamples = live.bassSamples; eng.inst = { ...live.inst };

      const prev = this.engine;
      this._offline = true;
      this.engine = eng;
      try {
        this._dcHeard(() => {
          const s = this.state;
          eng.setMaster(s.mix.master);
          for (const bus of BUSES) eng.setBusLevel(bus, s.mute[bus] || (bus === 'drums' && this.ui.drumsFaded) ? 0 : s.mix[bus]);
          for (const layer of SOUND_LAYERS) eng.setLayerSound(layer, this._heardSound());
          eng.setLayerSound('chords', this._chordSound());
          eng.setLayerSound('drone', DRONE_SOUND);
          // Hall-Impuls sofort in der gewünschten Länge (live kommt er entprellt per Timer).
          const length = clamp(s.fx.reverbLength, .2, 4);
          eng._reverbLength = length;
          eng.buses.convolver.buffer = eng._impulseResponse(length);
          eng.setFx(s.fx, this._stepSeconds());
          if (s.droneOn) this._droneMidis(s.keyRoot).forEach((midi, i) => eng.playTone(DRONE_SOUND, midi, 0, i === 0 ? .12 : .16, undefined, { layer: 'drone', glide: 0 }));
          // Start: am Anfang des Akkords, der gerade spielt (im Stand: bei 0) — damit Akkorde von Anfang an klingen.
          let g0 = this.playing ? this.globalStep : 0;
          for (let back = 0; back < 256 && g0 > 0 && !this._harmonyAt(g0).chordStart; back++) g0--;
          const stepSec = this._stepSeconds();
          for (let k = 0; k * stepSec < LOADTEST_SECONDS; k++) this._playStep(g0 + k, .01 + k * stepSec, this._harmonyAt(g0 + k));
        });
      } finally {
        this.engine = prev;
        this._offline = false;
      }
      const t0 = performance.now();
      await off.startRendering();
      return (performance.now() - t0) / (LOADTEST_SECONDS * 1000) * 100;
    }

    /** Alle Diagnosewerte als Text — fürs Einfügen in Fehlerberichte. */
    _diagText() {
      const o = this._ovl;
      const rows = this._diagLines();
      if (o.test) rows.push([t('lab.ovl.testLabel'), o.test.failed ? t('lab.ovl.testFail') : tf('lab.ovl.testResult', { pct: o.test.pct })]);
      rows.push(['User-Agent', navigator.userAgent], [t('lab.ovl.when'), new Date().toISOString()]);
      return `Groove Lab – ${t('lab.ovl.titleIdle')}\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n`;
    }

    async _copyDiag() {
      const text = this._diagText();
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch {
        try { // Rückfall ohne Clipboard-API
          const area = document.createElement('textarea');
          area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
          this.shadowRoot.append(area);
          area.select();
          ok = document.execCommand('copy');
          area.remove();
        } catch { ok = false; }
      }
      this.$('.ovl-note').textContent = t(ok ? 'lab.ovl.copied' : 'lab.ovl.copyFail');
    }

    /** Puffer wechseln: die Latenz lässt sich nach dem Anlegen des Kontexts nicht
     *  mehr ändern, also Audio sauber anhalten, Kontext schließen und neu
     *  aufbauen (wie Schließen und Öffnen) — Transport und Liegeton laufen danach weiter. */
    async _setLatency(hint) {
      if (!LATENCY_HINTS.includes(hint)) return;
      const wasPlaying = this.playing, droneWasOn = this.state.droneOn;
      this._saved.latency = hint;
      this._persist();
      this.engine.latencyHint = hint;
      this._ovl.events = []; this._ovl.cleared = true; this._ovl.warn = false;
      this._renderOverloadBtn();
      if (this.engine.ready) {
        this.stop();
        this._releaseAllKeys();
        this._stopDrone();
        await this.engine.stop();
        this._syncedCtx = null;
        if (droneWasOn) await this._setDrone(true);
        if (wasPlaying) await this.start();
      }
      this._setStatus(tf('lab.ovl.applied', { name: t(`lab.ovl.${hint}`) }));
      this._syncRenderCapacity();
      this._renderOverloadPop();
    }

    /* ---- Lookahead-Scheduler ---- */

    _scheduleAhead() {
      if (!this.playing) return;
      const ctx = this.engine.ctx;
      this._watchOverload(ctx);
      while (this.nextStepTime < ctx.currentTime + .1) {
        const g = this.globalStep;
        const h = this._harmonyAt(g);
        if (this.autoRec.phase === 'armed' && g === this.autoRec.startStep) {
          this.autoRec.startTime = this.nextStepTime;
          this.autoRec.stepSec = this._stepSeconds();
        }
        if (this.rec.phase === 'armed' && g === this.rec.startStep) {
          this.rec.startTime = this.nextStepTime;
          this.rec.stepSec = this._stepSeconds();
        }
        // de:construct: Schritt für Schritt das, was gerade hörbar ist (A
        // Original / B Meine Version) — Umschalten greift ab dem nächsten
        // Schritt, die Position läuft weiter.
        const side = this._dcHearsOriginal() ? 'orig' : 'mine';
        this._dcHeard(() => {
          const heard = side === 'orig' ? this._harmonyAt(g) : h;
          this.stepClock = { g, time: this.nextStepTime };
          this._playStep(g, this.nextStepTime, heard);
          this.scheduledSteps.push({ g, time: this.nextStepTime, h: heard, side });
          this.nextStepTime += this._stepSeconds();
        });
        this.globalStep++;
      }
      this.schedulerTimer = global.setTimeout(() => this._scheduleAhead(), 25);
    }

    /**
     * Swing-Verzögerung eines Schritts. Standard: jede zweite Sechzehntel
     * bis zu einer halben Sechzehntel später. Loops mit `swingUnit: 8`
     * swingen Achtel: der Achtel-Offbeat (Schritt 2, 6, 10, 14) kommt bis
     * zu einer Sechzehntel später (≈ .67 = Triolen-Feel), die Sechzehntel
     * dazwischen werden anteilig mitverschoben — jeder Schlag wird gedehnt
     * bzw. gestaucht, die Reihenfolge bleibt.
     */
    /** Optionen fürs Schlagzeug: aufgelöstes Kit, Ride statt Hi-Hat, Percussion-Klang. */
    _drumOpts() {
      const pattern = this._pattern();
      return { mode: resolveKit(this.state.drumKit, pattern), hat: pattern.hatSound, perc: this.state.percSound };
    }

    _swingOffset(step, stepSec) {
      const swing = this.state.swing;
      if (!swing) return 0;
      if (this._pattern().swingUnit === 8) {
        const d = swing * stepSec;
        const p = step % 4;
        return p === 0 ? 0 : p === 2 ? d : d / 2;
      }
      return step % 2 === 1 ? swing * .5 * stepSec : 0;
    }

    _playStep(g, time, h) {
      const s = this.state;
      this._playAutomation(g, time);
      const stepSec = this._stepSeconds();
      const barSteps = this._barSteps();
      const step = g % barSteps;
      const swung = time + this._swingOffset(step, stepSec);

      const beat = this._beatAt(g);
      // de:construct „Nur …“: nur die gewählte Spur klingt (in A und B).
      const hearBeat = this._dcHears('beat');
      const drumOpts = this._drumOpts();
      // Sample-Spuren mit „Originalklang leise darunter“: die Zielspur spielt nur mit 35 %.
      const layered = new Set(s.sampleLanes.filter((l) => l.layer && l.on).map((l) => this._sampleMeta(l.padId)?.track));
      const fill = fillAt(g, barSteps, s.fills);
      if (hearBeat && fill.idx >= 0) {
        const [tom, velocity] = FILL_HITS[fill.idx];
        this.engine.hitTrack(tom, swung, s.feel ? Math.min(1, velocity * (.94 + Math.random() * .12)) : velocity, s.kit, drumOpts);
      }
      if (hearBeat && fill.crash) this.engine.hitTrack('crash', swung, .8, s.kit, drumOpts);
      for (const track of DRUM_TRACKS) {
        let value = beat[track]?.[step];
        if (value === undefined || !s.trackOn[track] || !hearBeat) continue;
        if (fill.idx >= 0 && FILL_MUTED.includes(track)) continue;
        if (layered.has(track)) value *= .35;
        let when = swung;
        let opts = drumOpts;
        if (s.feel) {
          // Nur beim Spielen, das Raster bleibt unverändert: leichte
          // Lautstärke-Schwankung, Hi-Hats mit Akzent und ±3 ms Timing.
          value *= .94 + Math.random() * .12;
          if (track === 'hat' || track === 'open') {
            const accent = hatAccent(step, this._meter());
            value *= accent;
            when = Math.max(this.engine.ctx.currentTime, swung + (Math.random() * 2 - 1) * .003);
            if (track === 'hat' && accent < .7) opts = { ...drumOpts, soft: true };
          }
          value = Math.min(1, value);
        }
        this.engine.hitTrack(track, when, value, this.state.kit, opts);
        if (track === 'kick' && s.pump > 0) this.engine.duckAt(swung, s.pump, stepSec * 4);
      }
      if (hearBeat && s.sampleLanes.length) this._playLanes(g, step, swung, stepSec, h);
      if (s.trackOn.bass && beat.bass?.[step] !== undefined && this._dcHears('bass')) {
        this.engine.playBass(swung, this._bassMidi(h, beat.bass[step]), 1, this._bassSound(), bassNoteSteps(beat.bass, step, barSteps) * stepSec * .92);
      }

      if (h.chordStart && s.chordsOn && this._dcHears('chords')) this._playChord(h, swung, stepSec * barSteps * s.chordBars);
      // Nach einer Aufnahme loopt die Aufnahme statt der Melodie, bis sie
      // gespeichert oder verworfen ist; beim Einzählen/Aufnehmen: Stille.
      const recPhase = this.rec.phase;
      if (recPhase === 'done') {
        if (this.rec.looping) this._playMelodyStep(g, h, swung, stepSec, this.rec.loopBars, 'key', true);
      } else if (s.melodyOn && recPhase !== 'armed' && recPhase !== 'recording' && this._dcHears('melody')) this._playMelodyStep(g, h, swung, stepSec);

      if (s.arpOn && this._dcHears('all')) {
        const trigger = this._arpTrigger(g);
        if (trigger) this._playArp(trigger, swung, h);
      }
    }

    /**
     * Fällt auf diesen Sechzehntel-Schritt ein Arp-Ton? Liefert dessen
     * laufende Nummer (für die Tonfolge) und Länge in Schritten, sonst null.
     * "Gerade" = alle arpDivision Schritte; die punktierten Rhythmen
     * wiederholen eine Längen-Zelle (lang–kurz, kurz–lang, Galopp), die
     * zwei Töne des gewählten Tempos umfasst: 1/16 + punktiert = 3+1
     * Sechzehntel, 1/8 + punktiert = 6+2 (Befund 36 — vorher klangen 1/16,
     * 1/8 und 1/8· gleich). Die Zellen sind Vielfache von ½, die Längen
     * also immer ganze Schritte.
     */
    _arpTrigger(g) {
      const s = this.state;
      const cells = ARP_RHYTHMS.find(([id]) => id === s.arpRhythm)?.[2];
      if (!cells) return g % s.arpDivision === 0 ? { index: g / s.arpDivision, len: s.arpDivision } : null;
      const lengths = arpRhythmLengths(cells, s.arpDivision);
      const cycle = lengths.reduce((a, b) => a + b, 0);
      const pos = g % cycle;
      let at = 0;
      for (let i = 0; i < lengths.length; i++) {
        if (pos === at) return { index: Math.floor(g / cycle) * lengths.length + i, len: lengths[i] };
        at += lengths[i];
      }
      return null;
    }

    /** Ein Arp-Ton — vom Groove-Scheduler (im Takt, mit Swing) oder, wenn
     *  der Groove steht, von der eigenen Arp-Uhr (_ensureArpClock). */
    _playArp({ index, len }, time, h) {
      const s = this.state;
      const seq = this._arpSequence(h);
      if (!seq.length) return;
      const stepSec = this._stepSeconds();
      const midi = seq[this._arpIndex(index, seq.length)];
      this.engine.playTone(s.sound, midi, time, .15, stepSec * len * .9, { layer: 'arp', stepSeconds: stepSec });
      this._flashKey(midi, time);
    }

    /** Manuell: Arp gibt es, sobald er an und nicht auf Automatik ist. */
    _arpManual() { return this.state.arpOn && !this.state.arpAuto; }
    /** "Halten" wirkt nur im manuellen Arp. */
    _latchActive() { return this._arpManual() && this.ui.latchOn; }

    /** Die gewählten Töne in der Reihenfolge, in der sie gedrückt wurden:
     *  mit "Halten" die gesammelten, sonst die gerade gedrückten. */
    _arpHeld() {
      if (this._latchActive()) return [...this.latchedNotes];
      const notes = [];
      this.keyVoices.forEach((held) => { if (!notes.includes(held.midi)) notes.push(held.midi); });
      return notes;
    }

    /** Ton k Tonleiterstufen über einer Taste (in der gewählten Tonart;
     *  liegt die Taste außerhalb, gelten Dur-Abstände). */
    _diatonicAbove(midi, k) {
      if (!k) return midi;
      const steps = this._mode().steps;
      const d = steps.indexOf(mod(midi - this.state.keyRoot, 12));
      if (d === -1) return midi + ({ 2: 4, 4: 7, 6: 10, 7: 12 }[k] ?? 0);
      return midi + degreeSemis(steps, d + k) - steps[d];
    }

    /**
     * Die Tonfolge des Arps, noch vor der Richtung:
     * - automatisch: das Muster ab dem Grundton des aktuellen Akkords (nur
     *   solange der Groove läuft — ohne Groove gibt es keine Harmonie);
     * - manuell: jede gewählte Taste nach dem Muster erweitert, in der
     *   Reihenfolge des Drückens.
     * Danach über die Oktavzahl gestreut. Außer bei "Spielreihenfolge" wird
     * aufsteigend sortiert, damit auf-/abwärts wirklich steigt bzw. fällt.
     */
    _arpSequence(h) {
      const s = this.state;
      let seq = [];
      if (s.arpAuto) {
        if (!h || !this.playing) return [];
        const offsets = ARP_AUTO_PATTERNS.find(([id]) => id === s.arpAutoPattern)[2];
        const root = 12 * (s.octave + 1) + foldRoot(h.keyRoot);
        const deg = foldDegree(h.deg);
        seq = offsets.map((o) => root + degreeSemis(h.steps, deg + o));
      } else {
        const offsets = ARP_PATTERNS.find(([id]) => id === s.arpPattern)[2];
        const chord = s.arpRef === 'chord' ? (h || this._currentHarmony()) : null;
        seq = this._arpHeld().flatMap((midi) => (chord
          ? chordArpNotes(midi, chord, offsets)
          : offsets.map((o) => this._diatonicAbove(midi, o))));
      }
      if (!seq.length) return [];
      const spread = [];
      for (let oct = 0; oct < s.arpOctaves; oct++) for (const midi of seq) spread.push(midi + oct * 12);
      if (s.arpMode === 'order') return spread;
      return [...new Set(spread)].sort((a, b) => a - b);
    }

    /**
     * Arp-Uhr für den Fall, dass der Groove NICHT läuft: Sobald Tasten
     * gewählt sind, spielt der manuelle Arp trotzdem — im eingestellten
     * Tempo, auf der Audio-Uhr vorausgeplant wie der Haupt-Scheduler. Sie
     * endet von selbst, wenn nichts mehr gewählt ist oder der Groove startet
     * (dann übernimmt dessen Scheduler, taktgenau mit Beat und Swing).
     */
    _ensureArpClock() {
      if (this.playing || !this._arpManual() || this._arpTimer || !this.engine.ready) return;
      if (!this._arpHeld().length) return;
      const ctx = this.engine.ctx;
      let step = 0;
      let next = ctx.currentTime + .03;
      const tick = () => {
        if (this.playing || !this._arpManual() || !this.engine.ready || !this._arpHeld().length) { this._arpTimer = 0; return; }
        while (next < ctx.currentTime + .1) {
          const trigger = this._arpTrigger(step);
          if (trigger) this._playArp(trigger, next, null);
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
      if (!el || !this.engine.ready || this._offline) return;
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
        this.engine.playTone(this._chordSound(), voicing[voice], time, velocity, duration * .97,
          { layer: 'chords', glide: 0, stepSeconds: this._stepSeconds() });
      }
    }

    /** Klingender Ton einer Melodiestufe über der Harmonie `h`. */
    _melodyMidi(deg, alt, h, ref, shift = 0) {
      return melodyMidi(deg, alt, h, ref, this._mode().steps, this.state.melodyOctave, shift);
    }

    /** Oktavlage je Takt (melodyBarShifts) für Melodien mit Akkord-Bezug;
     *  null bei Tonart-Bezug (feste Tonhöhen). Je Folge/Melodie gecacht. */
    _melodyShifts(bars, ref, altBars) {
      if (ref === 'key') return null;
      const s = this.state;
      const prog = this._progression();
      const key = `${s.keyRoot}|${s.modeId}|${prog.degrees.join(',')}|${!!prog.sevenths}|${!!prog.dominant}|${!!prog.dom7}|${(prog.alter || []).join()}|${s.chordBars}|${s.melodyOctave}|${altBars}|${this._barSteps()}|${JSON.stringify(bars)}`;
      if (this._melShiftCache?.key === key) return this._melShiftCache.shifts;
      const barSteps = this._barSteps();
      const gcd = (a, b) => (b ? gcd(b, a % b) : a);
      const lcm = (a, b) => (a * b) / gcd(a, b);
      const count = lcm(lcm(bars.length, prog.degrees.length * s.chordBars), altBars ? 2 : 1);
      const modeSteps = this._mode().steps;
      const shifts = melodyBarShifts(bars, count, (bar, deg, alt) => melodyMidi(deg, alt, this._harmonyAt(bar * barSteps), 'chord', modeSteps, s.melodyOctave), altBars);
      this._melShiftCache = { key, shifts };
      return shifts;
    }

    /** `rec`: Schleife einer Aufnahme (kein Echo, keine Anpassung). */
    _playMelodyStep(g, h, time, stepSec, bars = this._melody().bars, ref = this._melody().ref, rec = false) {
      const s = this.state;
      const barSteps = this._barSteps();
      const step = g % barSteps;
      // Echo (melodyAltBars): nur jeden zweiten Takt; Aufnahmen immer.
      const altBars = s.melodyAltBars && !rec && !(s.melodyBars && ref === 'key');
      const template = !rec && !s.melodyBars;
      const shifts = this._melodyShifts(bars, ref, altBars);
      for (const [at, deg, len, alt = 0] of melodyNotesAt(g, bars, barSteps, altBars)) {
        // Eingespielte Töne liegen zwischen den Sechzehnteln: im Schritt, in
        // dem sie beginnen, mit dem Rest als Verzögerung ansetzen.
        let midi = this._melodyMidi(deg, alt, h, ref, shifts ? shifts[Math.floor(g / barSteps) % shifts.length] : 0);
        // Vorlagen: auf dem Schlag keine kleine None über einem Akkordton.
        if (template && METERS[this._meter()].beats.includes(at)) midi = snapMelodyMidi(midi, chordPitchClasses(h.keyRoot, h.steps, h.deg, h.sevenths));
        const barIndex = Math.floor(g / barSteps) % bars.length;
        const room = bars.length * barSteps - (barIndex * barSteps + at);
        this.engine.playTone(this._heardSound(), midi, time + (at - step) * stepSec, .2, Math.min(len, room) * stepSec, { layer: 'melody', stepSeconds: stepSec });
      }
    }

    _arpIndex(phase, n) {
      if (this.state.arpMode === 'down') return n - 1 - (phase % n);
      if (this.state.arpMode === 'updown') {
        const cycle = 2 * (n - 1) || 1;
        const p = phase % cycle;
        return p < n ? p : cycle - p;
      }
      if (this.state.arpMode === 'random') return Math.floor(Math.random() * n);
      return phase % n; // 'up' und 'order' (die Folge ist dann schon so geordnet)
    }

    /* ---- Anzeige im Takt ---- */

    _drawSteps() {
      if (!this.playing) return;
      const now = this.engine.ctx.currentTime;
      let latest;
      while (this.scheduledSteps.length && this.scheduledSteps[0].time <= now + .01) latest = this.scheduledSteps.shift();
      if (latest) {
        const chordChanged = latest.h.index !== this.shown?.h?.index || latest.side !== this.shown?.side;
        this.shown = latest;
        this._showStep(latest, chordChanged);
      }
      if (this.rec.phase === 'armed' || this.rec.phase === 'recording') this._recTick(now);
      if (this.autoRec.phase !== 'idle') this._autoTick(now);
      this.visualFrame = global.requestAnimationFrame(() => this._drawSteps());
    }

    _showStep({ g }, chordChanged) {
      const step = g % this._barSteps();
      const barSteps = this._barSteps();
      const fillBar = fillAt(g, barSteps, this.state.fills).fillBar;
      this.$all('.track-list .step-cell').forEach((cell) => {
        cell.classList.toggle('is-now', Number(cell.dataset.step) === step);
        cell.classList.toggle('is-fill', fillBar && Number(cell.dataset.step) >= barSteps - 4 && cell.dataset.track !== 'kick' && cell.dataset.track !== 'bass');
      });
      this._renderBeatDots(step);
      this._showMelodyStep(g);
      this._showRecLoopStep(g);
      if (chordChanged) this._renderNow();
      if (this.state.view === 'choir') this._renderChoirNow(g);
      else if (this.state.view === 'workshop') this._wsChShow(g);
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
          this.engine.hitTrack(track, now, velocity, this.state.kit, this._drumOpts());
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
      this._renderRec();
      this._renderSampler();
      this._renderLive();
      this._renderTransport();
      this._renderNow();
      this._renderChoir();
      this._renderWorkshop();
      this._renderDeconstruct();
      this._wsDecorate();
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
      this.$all(`[data-switch="${key}"]`).forEach((input) => { input.checked = !!on; });
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
      this._renderPickerFor('beat');
      this.$('.reset-beat').hidden = !s.beatEdited;
      this._renderLock('beat');
      this._renderTracks();

      this.$('[data-field="swing"]').value = String(s.swing);
      this.$('[data-out="swing"]').textContent = `${Math.round(s.swing * 100)} %`;
      this.$('[data-field="pump"]').value = String(s.pump);
      this.$('[data-out="pump"]').textContent = `${Math.round(s.pump * 100)} %`;
      this.$('.dc-meter').value = this._meter();
      this._chips(this.$('.bass-chips'), BASS_SOUNDS.map((b) => ({ value: b.id, label: b.name })), s.bassSoundId, 'bass-sound');
      this.$('.kit-panel').hidden = s.view === 'workshop';
      this.$('.live-panel').hidden = s.view === 'workshop';
      this._chips(this.$('.kit-chips'), DRUM_KITS.map((id) => ({ value: id, label: t(`lab.kit.${id}`) })), s.drumKit, 'drum-kit');
      this._chips(this.$('.fill-chips'), FILL_LENGTHS.map((n) => ({ value: n, label: t(`lab.fill.${n}`) })), s.fills, 'fills');
      this._renderKit();
    }

    /** Kick-Klang: Regler, Anzeige und „geändert“ im eingeklappten Kopf —
     *  eine im Workshop veränderte Kick klingt im Studio nie unsichtbar anders. */
    _renderKit() {
      const kit = this.state.kit;
      const changed = Object.keys(KIT_DEFAULTS).some((key) => kit[key] !== KIT_DEFAULTS[key]);
      for (const key of Object.keys(KIT_DEFAULTS)) {
        this.$(`[data-kit="${key}"]`).value = String(kit[key]);
        this.$(`[data-kit-out="${key}"]`).textContent = key === 'kickDecay' ? `${kit[key].toFixed(2)} s` : `${Math.round(kit[key])} Hz`;
      }
      this.$('.kit-sum').textContent = t('lab.kitTitle') + (changed ? ` · ${t('lab.edited')}` : '');
      this.$('[data-action="kit-reset"]').disabled = !changed;
    }

    _renderTracks() {
      const s = this.state;
      const meter = METERS[this._meter()];
      const host = this.$('.track-list');
      // Workshop und de:construct bauen mit den bekannten fünf Schlagzeugspuren.
      const hidePerc = s.view === 'workshop' || s.view === 'deconstruct';
      const laneRows = (track) => s.sampleLanes.flatMap((lane, i) => {
        const meta = this._sampleMeta(lane.padId);
        const target = meta ? (meta.kind === 'hit' ? meta.track : 'bass') : 'bass';
        return target === track ? [this._laneRow(lane, i, meta, meter)] : [];
      });
      host.replaceChildren(...TRACK_IDS.filter((track) => !(hidePerc && track === 'perc')).flatMap((track) => {
        const on = s.trackOn[track];
        const row = document.createElement('div');
        row.className = `track-row${on ? '' : ' is-off'}`;
        row.dataset.track = track;

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
        cells.style.setProperty('--half', String(Math.ceil(meter.steps / 2))); // Lupe hochkant: zwei Zeilen je Takt
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
        return [row, ...laneRows(track)];
      }));
      if (this.state.view === 'workshop') this._wsDecorate();
    }

    /** Zeile einer Sample-Spur: Vorhören, Name, Zellen (Anschlagstärke, bei Tönen der klingende Ton), An/Aus. */
    _laneRow(lane, index, meta, meter) {
      const row = this._mk('div', `track-row is-lane${lane.on ? '' : ' is-off'}`);
      row.dataset.lane = String(index);
      const name = meta ? meta.name : t('lab.sampler.missing');
      const roll = this._mk('button', 'track-roll');
      roll.type = 'button'; roll.dataset.action = 'lane-preview'; roll.dataset.value = String(index);
      roll.setAttribute('aria-label', `${t('lab.sampler.listen')}: ${name}`);
      roll.innerHTML = svg('<path d="M8 5l11 7-11 7z" fill="none"/>');
      const label = this._mk('span', 'track-name', name);
      label.title = meta ? `${name} · ${this._kindLabel(meta.kind)}` : t('lab.sampler.missing');
      const cells = this._mk('div', 'step-row');
      cells.style.gridTemplateColumns = `repeat(${meter.steps}, 1fr)`;
      cells.style.setProperty('--half', String(Math.ceil(meter.steps / 2)));
      for (let i = 0; i < meter.steps; i++) {
        const value = lane.steps[i];
        const cell = this._mk('button', 'step-cell');
        cell.type = 'button'; cell.tabIndex = -1; cell.dataset.action = 'lane-cell'; cell.dataset.lane = String(index); cell.dataset.step = String(i);
        if (Math.floor(i / meter.group) % 2 === 1) cell.classList.add('is-alt');
        if (value !== undefined) {
          cell.classList.add('is-hit');
          if (value < 1) cell.classList.add('is-soft');
          if (!meta) cell.classList.add('is-missing');
          const label2 = meta ? this._laneNoteLabel(meta, i) : '';
          if (label2) cell.dataset.label = label2;
        }
        cell.setAttribute('aria-label', `${name} ${i + 1}`);
        cells.append(cell);
      }
      const toggle = this._mk('button', 'track-toggle', t(lane.on ? 'lab.trackOn' : 'lab.trackOff'));
      toggle.type = 'button'; toggle.dataset.action = 'lane-toggle'; toggle.dataset.value = String(index);
      toggle.setAttribute('aria-pressed', String(lane.on));
      toggle.setAttribute('aria-label', name);
      row.append(roll, label, cells, toggle);
      return row;
    }

    _toggleCell(track, step) {
      this._wsChTouched();
      const s = this.state;
      const cycle = CELL_CYCLE[track];
      const current = s.beat[track][step];
      const index = current === undefined ? -1 : cycle.indexOf(current);
      if (current !== undefined && (index === -1 || index === cycle.length - 1)) delete s.beat[track][step];
      else s.beat[track][step] = cycle[index + 1];
      s.beatEdited = true;
      this._renderBeat();
      this._wsSchedule();
      // Vorhören, damit man beim Bauen nicht erst Play drücken muss.
      if (!this.playing && s.beat[track][step] !== undefined) this._preview(track, s.beat[track][step]);
    }

    async _preview(track, value) {
      try { await this._ensureAudio(); } catch { return; }
      const now = this.engine.ctx.currentTime;
      if (track === 'bass') this.engine.playBass(now, this._bassMidi(this._currentHarmony(), value), 1, this._bassSound());
      else this.engine.hitTrack(track, now, value, this.state.kit, this._drumOpts());
    }

    /* ---- Sampler (Paket 9) ----------------------------------------------
       Eigene Klänge als Pads: aufnehmen (Mikrofon), zuschneiden, als Schlag, Ton
       (folgt den Akkorden) oder Loop spielen, ins Raster legen oder live
       einspielen. Das Audio liegt in der Ablage (options.storage.samples), das
       Lab hält nur Metadaten, Puffer und Kits. Texte: lab.sampler.* */

    _smp() { return this.sampler; }

    _allKits() {
      return [...this.state.sampler.kits, ...FACTORY_KITS.map((k) => ({ ...k, name: t(k.nameKey) }))];
    }

    _kit() {
      const kits = this._allKits();
      return kits.find((k) => k.id === this.state.sampler.kitId) || kits[0];
    }

    /** Der eigene Kit, in den Aufnahmen und Bibliothek-Klänge gelegt werden (ein Werks-Kit ist schreibgeschützt). */
    _ownKit() {
      const s = this.state;
      return s.sampler.kits.find((k) => k.id === s.sampler.kitId) || s.sampler.kits[0];
    }

    _sampleMeta(id) {
      if (!id) return null;
      return isFactoryId(id) ? factorySample(id) : this.sampler.meta.get(id) || null;
    }

    _kindLabel(kind) { return t(`lab.sampler.kind${kind[0].toUpperCase()}${kind.slice(1)}`); }

    _roleLabel(meta) {
      if (meta.kind === 'tone') return t('lab.sampler.roleTone');
      if (meta.kind === 'loop') return tf('lab.sampler.roleLoop', { n: meta.loopBars });
      return t(`lab.sampler.role${meta.track[0].toUpperCase()}${meta.track.slice(1)}`);
    }

    _secLabel(sec) { return `${(Math.round(sec * 100) / 100).toFixed(2).replace('.', ',')} s`; }

    /** Lautstärke-Ausgleich je Art: Aufnahmen sind unterschiedlich laut, die Spur bestimmt, wie präsent sie sind. */
    _padLevel(meta, buffer) {
      if (meta.factory) return (LAB_DRUM_LEVEL[meta.file] ?? .3) / .7;
      const kindLevel = meta.kind === 'tone' ? .55 : meta.kind === 'loop' ? .6 : { kick: .9, snare: .55, clap: .5, hat: .3, open: .3, perc: .4 }[meta.track];
      const key = `${meta.id}|${meta.trim.join()}`;
      let peak = this.sampler.peakCache.get(key);
      if (peak === undefined) {
        const data = buffer.getChannelData(0);
        const from = Math.max(0, Math.floor(meta.trim[0] * buffer.sampleRate));
        const to = Math.min(data.length, Math.ceil(meta.trim[1] * buffer.sampleRate));
        peak = 0;
        for (let i = from; i < to; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
        this.sampler.peakCache.set(key, peak);
      }
      return peak > 0 ? kindLevel * clamp(.9 / peak, .25, 8) : 0;
    }

    /** Decodierter Puffer eines Pads (Werks-Sample aus dem Kit der Engine, eigenes aus der Ablage); null, solange er fehlt. */
    _bufferNow(id) {
      if (isFactoryId(id)) return this.engine.labSamples?.get(factorySample(id)?.file) || null;
      return this.sampler.buffers.get(id) || null;
    }

    async _decodeBlob(blob) {
      const OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
      if (!OAC) throw new Error('Kein Web Audio');
      this.sampler.decoder ||= new OAC(1, 1, 44100);
      return this.sampler.decoder.decodeAudioData(await blob.arrayBuffer());
    }

    /** Puffer laden (aus der Ablage, einmal je Sample); löst nie mit einem Fehler auf. */
    async _loadBuffer(id) {
      const smp = this.sampler;
      if (isFactoryId(id)) { await this._ensureAudio().catch(() => {}); return this._bufferNow(id); }
      if (smp.buffers.has(id)) return smp.buffers.get(id);
      if (smp.loading.has(id)) return smp.loading.get(id);
      const job = (async () => {
        try {
          const blob = smp.blobs.get(id) || await this._storage?.samples?.get?.(id);
          if (!blob) return null;
          smp.blobs.set(id, blob);
          const buffer = await this._decodeBlob(blob);
          smp.buffers.set(id, buffer);
          return buffer;
        } catch (err) {
          console.warn('[groove-lab] Sample nicht lesbar', id, err);
          return null;
        } finally { smp.loading.delete(id); }
      })();
      smp.loading.set(id, job);
      return job;
    }

    /** Alles laden, was Kit und Sample-Spuren brauchen — im Hintergrund, danach neu zeichnen. */
    _primeSamples() {
      const ids = new Set([...this._kit().pads.filter(Boolean), ...this.state.sampleLanes.map((l) => l.padId)]);
      const missing = [...ids].filter((id) => !isFactoryId(id) && this._sampleMeta(id) && !this.sampler.buffers.has(id));
      if (!missing.length) return;
      Promise.all(missing.map((id) => this._loadBuffer(id))).then(() => { this._renderSampler(); this._renderTracks(); this._renderLive(); });
    }

    /** Metadaten der Ablage einlesen (beim Öffnen). */
    _loadSamplesFromStorage() {
      const store = this._storage?.samples;
      if (!store?.list) { this.sampler.loaded = true; return; }
      Promise.resolve(store.list()).then((list) => {
        for (const raw of Array.isArray(list) ? list : []) {
          const meta = sanitizeSampleMeta(raw);
          if (meta && !this.sampler.meta.has(meta.id)) this.sampler.meta.set(meta.id, meta);
        }
        this.sampler.loaded = true;
        this._renderSampler(); this._renderTracks(); this._renderLive();
        this._primeSamples();
      }).catch((err) => { this.sampler.loaded = true; console.warn('[groove-lab] Samples nicht geladen', err); });
    }

    /** Ein Pad mit Anschlagstärke `velocity` hören (Antippen, Anhören, Live). Liefert den Puffer oder null. */
    async _auditionPad(id, { velocity = 1, meta: override = null } = {}) {
      try { await this._ensureAudio(); } catch { return null; }
      const meta = override || this._sampleMeta(id);
      if (!meta) { this._setStatus(t('lab.sampler.missing')); return null; }
      const buffer = override ? this.sampler.draftBuffer || await this._loadBuffer(meta.id) : this._bufferNow(id) || await this._loadBuffer(id);
      if (!buffer) { this._setStatus(t('lab.sampler.missing')); return null; }
      const now = this.engine.ctx.currentTime + .01;
      const level = this._padLevel(meta, buffer) * velocity;
      if (meta.kind === 'tone' && meta.detectedMidi !== null) {
        const h = this._currentHarmony();
        const target = sampleToneTarget(meta.toneRole, meta.detectedMidi, chordPitchClasses(h.keyRoot, h.steps, h.deg, h.sevenths).slice(0, 3));
        this.engine.playPad(buffer, meta, now, level, { rate: sampleToneRate(target, meta.detectedMidi, meta.detectedCents, meta.pitch), duration: Math.max(.6, Math.min(2, (meta.trim[1] - meta.trim[0]))), layer: 'keys' });
      } else {
        this.engine.playPad(buffer, meta, now, level, { rate: meta.kind === 'loop' ? 1 : null });
      }
      return buffer;
    }

    /** Pad `index` des Kits antippen: hören, wählen — ein freies Pad führt zum Aufnehmen. */
    async _tapPad(index, { fromKey = false } = {}) {
      const smp = this.sampler;
      smp.sel = index;
      const id = this._kit().pads[index];
      if (!id) {
        if (!fromKey) this._samplerGo('record'); else this._renderSampler();
        return;
      }
      this._renderSampler();
      await this._auditionPad(id);
    }

    _samplerGo(view) {
      const smp = this.sampler;
      clearTimeout(this._padHold);
      if (smp.view === 'record' && view !== 'record') this._smpRecAbort();
      smp.view = view;
      if (view === 'record') smp.rec = { kind: 'hit', countIn: true, click: true, trim: true, bars: 1, phase: 'idle', level: -90 };
      this._renderSampler();
      this.$('.lab-body').scrollTop = 0;
      this.$('.sampler-root [data-first]')?.focus?.();
    }

    /* -- Pads -- */

    _renderSampler() {
      const root = this.$('.sampler-root');
      if (!root) return;
      const smp = this.sampler;
      const draw = { pads: () => this._renderSamplerPads(root), record: () => this._renderSamplerRecord(root), edit: () => this._renderSamplerEdit(root), library: () => this._renderSamplerLibrary(root) }[smp.view] || (() => this._renderSamplerPads(root));
      draw();
    }

    _mk(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }

    _smpHead(titleText, { back = true, backAction = 'smp-back', done = null } = {}) {
      const head = this._mk('div', 'smp-head');
      if (back) {
        const b = this._mk('button', 'smp-back');
        b.type = 'button'; b.dataset.action = backAction; b.dataset.first = '1';
        b.setAttribute('aria-label', t('lab.sampler.back'));
        b.innerHTML = UI_ICON.prev;
        head.append(b);
      }
      head.append(this._mk('h2', 'smp-title', titleText));
      if (done) { const d = this._mk('button', 'smp-done', done); d.type = 'button'; d.dataset.action = 'smp-done'; head.append(d); }
      return head;
    }

    _renderSamplerPads(root) {
      const s = this.state;
      const smp = this.sampler;
      const kit = this._kit();
      const nodes = [];

      // Kit
      const kitPanel = this._mk('section', 'panel smp-panel');
      kitPanel.append(this._panelHead(t('lab.sampler.kit')));
      const kitChips = this._mk('div', 'chip-row');
      for (const k of this._allKits()) {
        const b = this._mk('button', 'chip', k.name);
        b.type = 'button'; b.dataset.action = 'smp-kit'; b.dataset.value = k.id;
        b.setAttribute('aria-pressed', String(k.id === kit.id));
        kitChips.append(b);
      }
      if (s.sampler.kits.length < SAMPLER_MAX_KITS) {
        const add = this._mk('button', 'chip', t('lab.sampler.kitNew'));
        add.type = 'button'; add.dataset.action = 'smp-kit-new';
        kitChips.append(add);
      }
      kitPanel.append(kitChips);
      if (!kit.factory && s.sampler.kits.length > 1) {
        const del = this._mk('button', 'chip smp-kit-del', t('lab.sampler.kitDelete'));
        del.type = 'button'; del.dataset.action = 'smp-kit-del';
        kitPanel.append(del);
      }
      nodes.push(kitPanel);

      // Pads
      const padPanel = this._mk('section', 'panel smp-panel');
      const padHead = this._mk('div', 'panel-head');
      padHead.append(this._mk('h2', '', t('lab.sampler.pads')), this._mk('span', 'smp-hint', t('lab.sampler.padsHint')));
      const grid = this._mk('div', 'pad-grid');
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', t('lab.sampler.pads'));
      kit.pads.forEach((id, i) => {
        const meta = this._sampleMeta(id);
        const btn = this._mk('button', 'pad-btn');
        btn.type = 'button';
        btn.dataset.pad = String(i);
        btn.setAttribute('aria-pressed', String(i === smp.sel));
        if (!id) {
          btn.classList.add('is-free');
          btn.setAttribute('aria-label', tf('lab.sampler.padFreeAria', { n: i + 1 }));
          btn.append(this._mk('span', 'pad-plus', '+'), this._mk('span', 'pad-kind', t('lab.sampler.free')));
        } else if (!meta) {
          btn.classList.add('is-missing');
          btn.setAttribute('aria-label', tf('lab.sampler.padAria', { n: i + 1, name: t('lab.sampler.missing'), kind: '' }));
          btn.append(this._mk('span', 'pad-name', '?'), this._mk('span', 'pad-kind', t('lab.sampler.missingShort')));
        } else {
          btn.classList.add(`is-${meta.kind}`);
          if (meta.factory) btn.classList.add('is-factory');
          btn.setAttribute('aria-label', tf('lab.sampler.padAria', { n: i + 1, name: meta.name, kind: this._kindLabel(meta.kind) }));
          const bars = this._mk('span', 'pad-bars');
          const buffer = this._bufferNow(id);
          const peaks = buffer ? this._peaks14(id, buffer) : Array(14).fill(.15);
          for (const p of peaks) { const bar = this._mk('i'); bar.style.height = `${Math.max(2, Math.round(p * 22))}px`; bars.append(bar); }
          btn.append(this._mk('span', 'pad-name', meta.name), bars, this._mk('span', 'pad-kind', this._kindLabel(meta.kind)));
        }
        this._wirePad(btn, i);
        grid.append(btn);
      });
      padPanel.append(padHead, grid);

      const selId = kit.pads[smp.sel];
      const selMeta = this._sampleMeta(selId);
      const info = this._mk('div', 'smp-info');
      const text = this._mk('div', 'smp-info-text');
      if (!selId) {
        text.append(this._mk('strong', '', t('lab.sampler.freeInfo')), this._mk('span', '', t('lab.sampler.freeInfoSub')));
      } else if (!selMeta) {
        text.append(this._mk('strong', '', t('lab.sampler.missing')), this._mk('span', '', t('lab.sampler.missingSub')));
      } else {
        const len = selMeta.kind === 'loop' ? tf('lab.sampler.loopLen', { n: selMeta.loopBars }) : this._secLabel(selMeta.trim[1] - selMeta.trim[0]);
        text.append(this._mk('strong', '', `„${selMeta.name}“ · ${this._kindLabel(selMeta.kind)}`),
          this._mk('span', '', [this._roleLabel(selMeta), selMeta.by, len].filter(Boolean).join(' · ')));
      }
      info.append(text);
      if (selMeta && !selMeta.factory) {
        const edit = this._mk('button', 'chip', t('lab.sampler.edit'));
        edit.type = 'button'; edit.dataset.action = 'smp-edit';
        info.append(edit);
      }
      if (selMeta) {
        const toBeat = this._mk('button', 'chip', t('lab.sampler.toBeat'));
        toBeat.type = 'button'; toBeat.dataset.action = 'smp-to-beat'; toBeat.dataset.value = selId;
        info.append(toBeat);
      }
      padPanel.append(info);
      nodes.push(padPanel);

      // Quelle
      const src = this._mk('section', 'panel smp-panel');
      src.append(this._panelHead(t('lab.sampler.sourceTitle')));
      const row = this._mk('div', 'smp-source');
      const rec = this._mk('button', 'smp-big is-primary', t('lab.sampler.record'));
      rec.type = 'button'; rec.dataset.action = 'smp-record';
      rec.prepend(this._svgIcon('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'));
      const lib = this._mk('button', 'smp-big', t('lab.sampler.library'));
      lib.type = 'button'; lib.dataset.action = 'smp-library';
      lib.prepend(this._svgIcon('<path d="M4 5h6v14H4zM14 5l6 1.5-3 13-6-1.5z"/>'));
      row.append(rec, lib);
      src.append(row, this._mk('p', 'smp-hint', t('lab.sampler.libraryHint')));
      if (!this._storage?.samples) src.append(this._mk('p', 'smp-warn', t('lab.sampler.noStorage')));
      nodes.push(src);

      // Sample-Spuren im Beat
      if (s.sampleLanes.length) {
        const lanes = this._mk('section', 'panel smp-panel');
        lanes.append(this._panelHead(t('lab.sampler.lanes')));
        for (const [i, lane] of s.sampleLanes.entries()) {
          const meta = this._sampleMeta(lane.padId);
          const line = this._mk('div', 'smp-lane-line');
          line.append(this._mk('span', '', meta ? `${meta.name} · ${this._kindLabel(meta.kind)}` : t('lab.sampler.missing')));
          const rm = this._mk('button', 'chip', t('lab.sampler.laneRemove'));
          rm.type = 'button'; rm.dataset.action = 'smp-lane-remove'; rm.dataset.value = String(i);
          line.append(rm);
          lanes.append(line);
        }
        nodes.push(lanes);
      }
      root.replaceChildren(...nodes);
    }

    _panelHead(title) { const head = this._mk('div', 'panel-head'); head.append(this._mk('h2', '', title)); return head; }

    _svgIcon(inner) {
      const wrap = this._mk('span', 'smp-ico');
      wrap.innerHTML = svg(inner);
      return wrap;
    }

    _peaks14(id, buffer) {
      const cache = this.sampler.peaks;
      if (!cache.has(id)) cache.set(id, wavePeaks(buffer.getChannelData(0), 14));
      return cache.get(id);
    }

    /** Antippen spielt (sofort beim Aufsetzen), Halten (500 ms) öffnet den Editor; Tastatur: Enter/Leertaste spielen.
     *  Der Halte-Zähler hängt an der Ansicht, nicht am Knopf: das Antippen zeichnet die Pads neu, der alte Knopf
     *  ist dann schon weg, wenn der Finger losgelassen wird (pointerup/-cancel räumt in _wireControls auf). */
    _wirePad(btn, index) {
      btn.addEventListener('pointerdown', (event) => {
        if (event.button > 0) return;
        const id = this._kit().pads[index];
        clearTimeout(this._padHold);
        this._padHold = global.setTimeout(() => {
          const meta = this._sampleMeta(id);
          if (meta && !meta.factory) { this.sampler.sel = index; this._openEditor(id); }
        }, 500);
        this._padHoldFired = false;
        this._tapPad(index);
      });
      btn.addEventListener('click', (event) => {
        // Echte Zeigerklicks hat pointerdown schon behandelt; Tastatur (detail 0) spielt hier.
        if (event.detail === 0) this._tapPad(index, { fromKey: true });
      });
      btn.addEventListener('contextmenu', (event) => event.preventDefault());
    }

    /* -- Aufnehmen -- */

    _renderSamplerRecord(root) {
      const smp = this.sampler;
      const rec = smp.rec || (smp.rec = { kind: 'hit', countIn: true, click: true, trim: true, bars: 1, phase: 'idle', level: -90 });
      const nodes = [this._smpHead(tf('lab.sampler.recTitle', { n: smp.sel + 1 }))];

      const kindPanel = this._mk('section', 'panel smp-panel');
      kindPanel.append(this._panelHead(t('lab.sampler.whatTitle')));
      const kinds = this._mk('div', 'smp-kinds');
      for (const kind of SAMPLE_KINDS) {
        const b = this._mk('button', 'smp-kind');
        b.type = 'button'; b.dataset.action = 'smp-rec-kind'; b.dataset.value = kind;
        b.setAttribute('aria-pressed', String(rec.kind === kind));
        b.disabled = rec.phase !== 'idle';
        b.append(this._mk('strong', '', this._kindLabel(kind)), this._mk('span', '', t(`lab.sampler.kind${kind[0].toUpperCase()}${kind.slice(1)}Sub`)));
        kinds.append(b);
      }
      kindPanel.append(kinds, this._mk('p', 'smp-hint', t(`lab.sampler.hint${rec.kind[0].toUpperCase()}${rec.kind.slice(1)}`)));
      if (rec.kind === 'loop') {
        const bars = this._mk('div', 'chip-row');
        for (const n of [1, 2]) {
          const b = this._mk('button', 'chip', t(`lab.sampler.loopBars${n}`));
          b.type = 'button'; b.dataset.action = 'smp-rec-bars'; b.dataset.value = String(n);
          b.setAttribute('aria-pressed', String(rec.bars === n));
          b.disabled = rec.phase !== 'idle';
          bars.append(b);
        }
        kindPanel.append(bars);
      }
      nodes.push(kindPanel);

      const input = this._mk('section', 'panel smp-panel');
      const inHead = this._mk('div', 'panel-head');
      inHead.append(this._mk('h2', '', t('lab.sampler.input')));
      const state = this._mk('span', 'smp-level-state');
      state.dataset.role = 'level-state';
      inHead.append(state);
      const canvas = this._mk('canvas', 'smp-live');
      canvas.width = 640; canvas.height = 120;
      canvas.setAttribute('aria-hidden', 'true');
      const meter = this._mk('div', 'smp-meter');
      meter.innerHTML = '<i class="low"></i><i class="good"></i><i class="high"></i><b></b>';
      const ends = this._mk('div', 'smp-meter-ends');
      ends.append(this._mk('span', '', t('lab.sampler.levelQuiet')), this._mk('span', '', t('lab.sampler.levelLoud')));
      input.append(inHead, canvas, meter, ends);
      nodes.push(input);

      const opts = this._mk('section', 'panel smp-panel smp-opts');
      for (const [key, label, sub, locked] of [
        ['countIn', 'lab.sampler.optCountIn', 'lab.sampler.optCountInSub', rec.kind === 'loop'],
        ['click', 'lab.sampler.optClick', 'lab.sampler.optClickSub', false],
        ['trim', 'lab.sampler.optTrim', 'lab.sampler.optTrimSub', rec.kind === 'loop'],
      ]) {
        const line = this._mk('label', 'smp-opt');
        const text = this._mk('span');
        text.append(this._mk('strong', '', t(label)), this._mk('span', '', t(sub)));
        const box = this._mk('input');
        box.type = 'checkbox'; box.dataset.smpOpt = key;
        box.checked = key === 'countIn' && rec.kind === 'loop' ? true : key === 'trim' && rec.kind === 'loop' ? false : rec[key];
        box.disabled = locked || rec.phase !== 'idle';
        line.append(text, box);
        opts.append(line);
      }
      nodes.push(opts);

      nodes.push(this._mk('p', 'smp-note', t('lab.sampler.headphones')));
      if (smp.bluetoothHint) nodes.push(this._mk('p', 'smp-note', t('lab.sampler.bluetooth')));

      const foot = this._mk('div', 'smp-rec-foot');
      const btn = this._mk('button', 'smp-rec-btn');
      btn.type = 'button'; btn.dataset.action = 'smp-rec-toggle';
      btn.classList.toggle('is-on', rec.phase !== 'idle');
      btn.setAttribute('aria-label', t(rec.phase === 'idle' ? 'lab.sampler.recStart' : 'lab.sampler.recStop'));
      btn.append(this._mk('i'));
      const label = this._mk('span', 'smp-rec-label', this._smpRecLabel());
      label.dataset.role = 'rec-label';
      foot.append(btn, label);
      nodes.push(foot);
      root.replaceChildren(...nodes);
      this._paintRecLevel();
    }

    _smpRecLabel() {
      const rec = this.sampler.rec;
      if (!rec) return '';
      if (rec.phase === 'counting') return t('lab.sampler.recCounting');
      if (rec.phase === 'recording') return t('lab.sampler.recRunning');
      return t((rec.countIn || rec.kind === 'loop') ? 'lab.sampler.recTapCount' : 'lab.sampler.recTapNow');
    }

    /** Pegelanzeige: Spitze in dBFS; „gut“ zwischen −18 und −3. */
    _paintRecLevel() {
      const rec = this.sampler.rec;
      const root = this.$('.sampler-root');
      if (!rec || !root) return;
      const db = rec.level ?? -90;
      const state = root.querySelector('[data-role="level-state"]');
      if (state) {
        const good = db >= -18 && db <= -3;
        const key = rec.phase === 'idle' && db <= -89 ? '' : good ? 'lab.sampler.levelGood' : db > -3 ? 'lab.sampler.levelHigh' : 'lab.sampler.levelLow';
        state.textContent = key ? t(key) : '';
        state.className = `smp-level-state${key ? (good ? ' is-good' : db > -3 ? ' is-high' : ' is-low') : ''}`;
      }
      const bar = root.querySelector('.smp-meter b');
      if (bar) bar.style.left = `${clamp((db + 48) / 48, 0, 1) * 100}%`;
      const label = root.querySelector('[data-role="rec-label"]');
      if (label) label.textContent = this._smpRecLabel();
    }

    _smpRecTickDraw() {
      const rec = this.sampler.rec;
      if (!rec?.analyser) return;
      const analyser = rec.analyser;
      const data = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
      const db = peak > 0 ? 20 * Math.log10(peak) : -90;
      rec.level = Math.max(db, (rec.level ?? -90) - 1.2); // Spitze fällt langsam
      const canvas = this.$('.sampler-root .smp-live');
      if (canvas) {
        const g = canvas.getContext('2d');
        const style = getComputedStyle(this);
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.fillStyle = style.getPropertyValue('--accent') || '#f868b0';
        const bars = 64;
        const size = Math.floor(data.length / bars);
        for (let b = 0; b < bars; b++) {
          let max = 0;
          for (let i = b * size; i < (b + 1) * size; i++) max = Math.max(max, Math.abs(data[i]));
          const h = Math.max(3, Math.min(canvas.height, max * canvas.height * 1.6));
          g.fillRect(b * (canvas.width / bars) + 1, (canvas.height - h) / 2, canvas.width / bars - 2, h);
        }
      }
      this._paintRecLevel();
      rec.raf = global.requestAnimationFrame(() => this._smpRecTickDraw());
    }

    /** Klick (Einzählen/Metronom) auf der Audio-Uhr. */
    _smpClick(time, strong) {
      this.engine.playNoise(time, { cutoff: strong ? 2600 : 1800, length: .05, volume: strong ? .5 : .3, type: 'bandpass', q: 4 });
    }

    async _smpRecStart() {
      const smp = this.sampler;
      const rec = smp.rec;
      if (!rec || rec.phase !== 'idle') return;
      if (smp.meta.size >= SAMPLER_MAX_SAMPLES) { this._setStatus(tf('lab.sampler.full', { n: SAMPLER_MAX_SAMPLES })); return; }
      if (!this._mic || !global.MediaRecorder) { this._setStatus(t('lab.sampler.noMic')); return; }
      try { await this._ensureAudio(); } catch { this._setStatus(t('lab.statusNoAudioHere')); return; }
      let stream;
      try { stream = await this._mic.open(); } catch (err) { console.warn('[groove-lab] Mikrofon', err); this._setStatus(t('lab.sampler.micFailed')); return; }
      if (smp.view !== 'record' || smp.rec !== rec) { this._mic.close?.(stream); return; }
      const ctx = this.engine.ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser); // bewusst nicht zum Ausgang: sonst gäbe es eine Rückkopplung
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) => global.MediaRecorder.isTypeSupported?.(m)) || '';
      let recorder;
      try { recorder = new global.MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 128000 } : { audioBitsPerSecond: 128000 }); } catch (err) {
        console.warn('[groove-lab] MediaRecorder', err);
        this._mic.close?.(stream); this._setStatus(t('lab.sampler.micFailed')); return;
      }
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      Object.assign(rec, { stream, source, analyser, recorder, chunks, mimeType: recorder.mimeType || mimeType || 'audio/webm' });
      // Zeitplan: Einzählen (ein Takt Klicks), dann Aufnahme; bei Loops fester Takt.
      const stepSec = this._stepSeconds();
      const barSteps = this._barSteps();
      const barSec = stepSec * barSteps;
      const meter = METERS[this._meter()];
      const countIn = rec.kind === 'loop' || rec.countIn;
      const start = ctx.currentTime + .12;
      rec.barSec = barSec;
      rec.bpm = this.state.bpm;
      rec.meter = this._meter();
      rec.downbeat = countIn ? start + barSec : start;
      if (countIn) meter.beats.forEach((step, i) => this._smpClick(start + step * stepSec, i === 0));
      if (rec.click) {
        const bars = rec.kind === 'loop' ? rec.bars : 2;
        for (let b = 0; b < bars; b++) meter.beats.forEach((step, i) => this._smpClick(rec.downbeat + b * barSec + step * stepSec, i === 0 && b === 0));
      }
      recorder.start();
      rec.startedAt = ctx.currentTime;
      rec.phase = countIn ? 'counting' : 'recording';
      const toRecording = global.setTimeout(() => { if (rec.phase === 'counting') { rec.phase = 'recording'; this._paintRecLevel(); } }, Math.max(0, (rec.downbeat - ctx.currentTime) * 1000));
      const maxSec = rec.kind === 'loop' ? Math.min(SAMPLER_MAX_SEC.loop, rec.bars * barSec) : 8;
      const stopAfter = (rec.downbeat - ctx.currentTime) + maxSec + (rec.kind === 'loop' ? .25 : 0);
      rec.timers = [toRecording, global.setTimeout(() => this._smpRecStop(), stopAfter * 1000)];
      // Bluetooth-Headset (Freisprechprofil) oder Schmalband-Mikrofon: Hinweis wie im Player.
      smp.bluetoothHint = (this._mic.quality?.(stream) || 'ok') !== 'ok';
      this._renderSampler();
      this._smpRecTickDraw();
    }

    _smpRecStop() {
      const rec = this.sampler.rec;
      if (!rec || !rec.recorder || rec.phase === 'idle' || rec.stopping) return;
      rec.stopping = true;
      (rec.timers || []).forEach(clearTimeout);
      const done = new Promise((resolve) => { rec.recorder.onstop = resolve; });
      try { rec.recorder.stop(); } catch { /* schon gestoppt */ }
      done.then(() => this._smpRecFinish(rec));
    }

    /** Aufnahme abbrechen (Ansicht verlassen): Mikrofon frei, nichts speichern. */
    _smpRecAbort() {
      const rec = this.sampler.rec;
      if (!rec) return;
      (rec.timers || []).forEach(clearTimeout);
      global.cancelAnimationFrame(rec.raf);
      if (rec.recorder && rec.recorder.state !== 'inactive') { rec.recorder.onstop = null; try { rec.recorder.stop(); } catch { /* egal */ } }
      this._smpRecRelease(rec);
      this.sampler.rec = null;
    }

    _smpRecRelease(rec) {
      try { rec.source?.disconnect(); } catch { /* egal */ }
      if (rec.stream) { try { this._mic?.close?.(rec.stream); } catch { /* egal */ } rec.stream = null; }
    }

    async _smpRecFinish(rec) {
      const smp = this.sampler;
      global.cancelAnimationFrame(rec.raf);
      this._smpRecRelease(rec);
      const blob = new Blob(rec.chunks, { type: rec.mimeType });
      rec.phase = 'idle';
      rec.stopping = false;
      if (smp.rec !== rec) return;
      let buffer;
      try { buffer = await this._decodeBlob(blob); } catch (err) { console.warn('[groove-lab] Aufnahme nicht lesbar', err); this._setStatus(t('lab.sampler.recEmpty')); this._renderSampler(); return; }
      const data = buffer.getChannelData(0);
      const sr = buffer.sampleRate;
      const maxSec = SAMPLER_MAX_SEC[rec.kind];
      let start;
      let end;
      if (rec.kind === 'loop') {
        // Ab Takt-Eins, um die Ausgabe-/Basis-Latenz verschoben (wie anchor.lat im Player); Länge = Takte × Taktdauer.
        const ctx = this.engine.ctx;
        const latency = (ctx?.outputLatency || 0) + (ctx?.baseLatency || 0);
        start = Math.max(0, rec.downbeat - rec.startedAt + latency);
        end = Math.min(buffer.duration, start + rec.bars * rec.barSec, start + maxSec);
      } else if (rec.trim) {
        ({ start, end } = autoTrimBounds(data, sr));
      } else { start = 0; end = buffer.duration; }
      end = Math.min(end, start + maxSec);
      let peak = 0;
      for (let i = Math.floor(start * sr); i < Math.min(data.length, Math.ceil(end * sr)); i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
      if (!(peak > .002) || end - start < .02) { this._setStatus(t('lab.sampler.recEmpty')); this._renderSampler(); return; }
      let kind = rec.kind;
      let pitch = null;
      if (kind === 'tone') {
        pitch = detectPitch(data.subarray(Math.floor(start * sr), Math.ceil(end * sr)), sr);
        if (!pitch) { kind = 'hit'; this._setStatus(t('lab.sampler.noPitch')); }
      }
      const id = `s${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
      let n = smp.meta.size + 1;
      const taken = new Set([...smp.meta.values()].map((m) => m.name));
      while (taken.has(tf('lab.sampler.defaultName', { n }))) n++;
      const meta = sanitizeSampleMeta({
        id, name: tf('lab.sampler.defaultName', { n }), kind, trim: [start, end], gainDb: 0, pitch: 0, reverse: false, decay: SAMPLER_MAX_SEC[kind], reverb: 0,
        track: 'perc', layerOriginal: false, toneRole: 'auto', detectedMidi: pitch?.midi ?? null, detectedCents: pitch?.cents ?? 0,
        loopBars: rec.bars, bpmAtRec: kind === 'loop' ? rec.bpm : null, meterAtRec: kind === 'loop' ? rec.meter : null, by: '', createdAt: Date.now(),
      });
      await this._saveSample(meta, blob, buffer);
      this._assignPad(smp.sel, id);
      smp.rec = null;
      this._openEditor(id, { isNew: true });
    }

    /** Sample in der Ablage speichern (mit Audio) bzw. nur die Metadaten ändern (blob = null). */
    async _saveSample(meta, blob, buffer) {
      const smp = this.sampler;
      smp.meta.set(meta.id, meta);
      if (blob) smp.blobs.set(meta.id, blob);
      if (buffer) smp.buffers.set(meta.id, buffer);
      smp.peaks.delete(meta.id);
      for (const key of [...smp.peakCache.keys()]) if (key.startsWith(`${meta.id}|`)) smp.peakCache.delete(key);
      try { await this._storage?.samples?.put?.(meta, blob || undefined); } catch (err) { console.warn('[groove-lab] Sample nicht gespeichert', err); this._setStatus(t('lab.sampler.saveFailed')); }
    }

    /** Pad `index` des eigenen Kits mit einem Sample belegen (ein Werks-Kit ist schreibgeschützt → in den eigenen Kit). */
    _assignPad(index, id) {
      const s = this.state;
      this._pushHistory();
      const own = this._ownKit();
      s.sampler.kitId = own.id;
      own.pads[index] = id;
      this.sampler.sel = index;
    }

    /* -- Bearbeiten -- */

    async _openEditor(id, { isNew = false } = {}) {
      const smp = this.sampler;
      const meta = this._sampleMeta(id);
      if (!meta || meta.factory) return;
      const buffer = await this._loadBuffer(id);
      if (!buffer) { this._setStatus(t('lab.sampler.missing')); return; }
      smp.draft = { ...meta, trim: [...meta.trim] };
      smp.draftBuffer = buffer;
      smp.draftPeaks = wavePeaks(buffer.getChannelData(0), 160);
      smp.draftNew = isNew;
      smp.draftTone = null;
      smp.view = 'edit';
      this._renderSampler();
      this.$('.lab-body').scrollTop = 0;
    }

    _renderSamplerEdit(root) {
      const smp = this.sampler;
      const d = smp.draft;
      if (!d) { smp.view = 'pads'; this._renderSamplerPads(root); return; }
      const nodes = [this._smpHead(tf('lab.sampler.editTitle', { name: d.name }), { done: t('lab.sampler.done') })];

      // Wellenform mit zwei Schnittmarken
      const wave = this._mk('section', 'panel smp-panel');
      const frame = this._mk('div', 'smp-wave');
      const canvas = this._mk('canvas');
      canvas.width = 640; canvas.height = 128;
      canvas.setAttribute('aria-hidden', 'true');
      frame.append(canvas);
      const dur = smp.draftBuffer.duration;
      for (const [which, labelKey] of [['start', 'lab.sampler.trimStart'], ['end', 'lab.sampler.trimEnd']]) {
        const handle = this._mk('div', `smp-trim is-${which}`);
        handle.tabIndex = 0;
        handle.setAttribute('role', 'slider');
        handle.setAttribute('aria-label', t(labelKey));
        handle.setAttribute('aria-valuemin', '0');
        handle.setAttribute('aria-valuemax', String(Math.round(dur * 1000)));
        handle.dataset.which = which;
        this._wireTrim(handle, frame, which);
        frame.append(handle);
      }
      frame.append(this._mk('div', 'smp-shade is-start'), this._mk('div', 'smp-shade is-end'));
      wave.append(frame);
      const tools = this._mk('div', 'smp-tools');
      for (const [action, key] of [['smp-listen', 'lab.sampler.listen'], ['smp-autocut', 'lab.sampler.autoCut'], ['smp-reverse', 'lab.sampler.reverse']]) {
        const b = this._mk('button', 'chip', t(key));
        b.type = 'button'; b.dataset.action = action;
        if (action === 'smp-reverse') b.setAttribute('aria-pressed', String(d.reverse));
        tools.append(b);
      }
      wave.append(tools);
      nodes.push(wave);

      // Spielt als
      const play = this._mk('section', 'panel smp-panel');
      play.append(this._panelHead(t('lab.sampler.playsAs')));
      const seg = this._mk('div', 'smp-seg');
      seg.setAttribute('role', 'group');
      for (const kind of SAMPLE_KINDS) {
        const b = this._mk('button', 'smp-seg-btn', this._kindLabel(kind));
        b.type = 'button'; b.dataset.action = 'smp-kind'; b.dataset.value = kind;
        b.setAttribute('aria-pressed', String(d.kind === kind));
        seg.append(b);
      }
      play.append(seg);
      if (d.kind === 'tone') {
        const info = this._mk('div', 'smp-detected');
        info.append(this._mk('strong', '', d.detectedMidi === null ? '–' : noteLabel(d.detectedMidi, null, 'major', labLang)),
          this._mk('span', '', d.detectedMidi === null ? t('lab.sampler.noPitchShort') : `${tf('lab.sampler.detected', { cents: `${d.detectedCents > 0 ? '+' : ''}${d.detectedCents}` })} · ${t('lab.sampler.detectedAuto')}`));
        play.append(info, this._mk('div', 'smp-sub', t('lab.sampler.whichTone')));
        const chips = this._mk('div', 'chip-row');
        for (const role of SAMPLE_TONE_ROLES) {
          const b = this._mk('button', 'chip', t(`lab.sampler.tone${role[0].toUpperCase()}${role.slice(1)}`));
          b.type = 'button'; b.dataset.action = 'smp-tone-role'; b.dataset.value = role;
          b.setAttribute('aria-pressed', String(d.toneRole === role));
          chips.append(b);
        }
        play.append(chips);
      } else if (d.kind === 'hit') {
        play.append(this._mk('div', 'smp-sub', t('lab.sampler.whichTrack')));
        const chips = this._mk('div', 'chip-row');
        for (const track of SAMPLE_TRACKS) {
          const b = this._mk('button', 'chip', t(TRACK_KEY[track]));
          b.type = 'button'; b.dataset.action = 'smp-track'; b.dataset.value = track;
          b.setAttribute('aria-pressed', String(d.track === track));
          chips.append(b);
        }
        const layer = this._mk('label', 'smp-opt');
        const text = this._mk('span');
        text.append(this._mk('strong', '', t('lab.sampler.layerOriginal')), this._mk('span', '', t('lab.sampler.layerOriginalSub')));
        const box = this._mk('input');
        box.type = 'checkbox'; box.dataset.smpDraft = 'layerOriginal'; box.checked = d.layerOriginal;
        layer.append(text, box);
        play.append(chips, layer);
      } else {
        const chips = this._mk('div', 'chip-row');
        for (const n of [1, 2]) {
          const b = this._mk('button', 'chip', t(`lab.sampler.loopBars${n}`));
          b.type = 'button'; b.dataset.action = 'smp-loop-bars'; b.dataset.value = String(n);
          b.setAttribute('aria-pressed', String(d.loopBars === n));
          chips.append(b);
        }
        play.append(chips, this._mk('p', 'smp-hint', d.bpmAtRec ? tf('lab.sampler.loopHint', { bpm: d.bpmAtRec }) : t('lab.sampler.loopHintFree')));
      }
      nodes.push(play);

      // Regler
      const sliders = this._mk('section', 'panel smp-panel');
      const defs = [
        ['pitch', 'lab.sampler.pitch', -12, 12, .5, (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(v % 1 ? 1 : 0).replace('.', ',')}`],
        ['decay', 'lab.sampler.decay', .05, SAMPLER_MAX_SEC[d.kind], .05, (v) => this._secLabel(v)],
        ['reverb', 'lab.sampler.reverb', 0, 1, .01, (v) => `${Math.round(v * 100)} %`],
        ['gainDb', 'lab.sampler.gain', -24, 6, .5, (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(v % 1 ? 1 : 0).replace('.', ',')} dB`],
      ];
      for (const [key, labelKey, min, max, step, format] of defs) {
        const line = this._mk('label', 'smp-slider');
        const out = this._mk('output', '', format(d[key]));
        const input = this._mk('input');
        input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(d[key]);
        input.dataset.smpSlider = key;
        input.setAttribute('aria-label', t(labelKey));
        input.addEventListener('input', () => {
          d[key] = Number(input.value);
          out.textContent = format(d[key]);
        });
        line.append(this._mk('span', '', t(labelKey)), input, out);
        sliders.append(line);
      }
      nodes.push(sliders);

      // Name und Herkunft
      const names = this._mk('section', 'panel smp-panel');
      for (const [key, labelKey, max, placeholder] of [['name', 'lab.sampler.name', 12, ''], ['by', 'lab.sampler.by', 24, t('lab.sampler.byPlaceholder')]]) {
        const line = this._mk('label', 'smp-field');
        const input = this._mk('input');
        input.type = 'text'; input.maxLength = max; input.value = d[key]; input.autocomplete = 'off'; input.placeholder = placeholder;
        input.addEventListener('input', () => { d[key] = input.value; });
        line.append(this._mk('span', '', t(labelKey)), input);
        names.append(line);
      }
      nodes.push(names);

      const foot = this._mk('div', 'smp-foot');
      for (const [action, key, cls] of [['smp-to-beat', 'lab.sampler.toBeat', 'chip'], ['smp-cancel', 'lab.sampler.cancel', 'chip'], ['smp-delete', 'lab.sampler.delete', 'chip is-danger']]) {
        const b = this._mk('button', cls, t(key));
        b.type = 'button'; b.dataset.action = action;
        if (action === 'smp-to-beat') b.dataset.value = d.id;
        foot.append(b);
      }
      nodes.push(foot);
      root.replaceChildren(...nodes);
      this._paintEditor();
    }

    /** Wellenform und Schnittmarken zeichnen. */
    _paintEditor() {
      const smp = this.sampler;
      const root = this.$('.sampler-root');
      const d = smp.draft;
      const canvas = root?.querySelector('.smp-wave canvas');
      if (!d || !canvas) return;
      const dur = smp.draftBuffer.duration;
      const g = canvas.getContext('2d');
      const peaks = smp.draftPeaks;
      g.clearRect(0, 0, canvas.width, canvas.height);
      const style = getComputedStyle(this);
      g.fillStyle = style.getPropertyValue('--accent').trim() || '#f868b0';
      const bw = canvas.width / peaks.length;
      peaks.forEach((p, i) => { const h = Math.max(3, p * canvas.height * .9); g.fillRect(i * bw + 1, (canvas.height - h) / 2, Math.max(1, bw - 2), h); });
      const a = d.trim[0] / dur;
      const b = d.trim[1] / dur;
      const set = (sel, fn) => { const node = root.querySelector(sel); if (node) fn(node); };
      set('.smp-trim.is-start', (n) => { n.style.left = `${a * 100}%`; n.setAttribute('aria-valuenow', String(Math.round(d.trim[0] * 1000))); n.setAttribute('aria-valuetext', this._secLabel(d.trim[0])); });
      set('.smp-trim.is-end', (n) => { n.style.left = `${b * 100}%`; n.setAttribute('aria-valuenow', String(Math.round(d.trim[1] * 1000))); n.setAttribute('aria-valuetext', this._secLabel(d.trim[1])); });
      set('.smp-shade.is-start', (n) => { n.style.width = `${a * 100}%`; });
      set('.smp-shade.is-end', (n) => { n.style.left = `${b * 100}%`; n.style.right = '0'; });
    }

    /** Schnittmarke ziehen (Zeiger) oder mit Pfeiltasten (±10 ms, mit Umschalt ±1 ms) schieben; mindestens 20 ms Abstand,
     *  höchstens so lang, wie die Art erlaubt. */
    _wireTrim(handle, frame, which) {
      const move = (seconds) => {
        const d = this.sampler.draft;
        const dur = this.sampler.draftBuffer.duration;
        const max = SAMPLER_MAX_SEC[d.kind];
        const t0 = which === 'start' ? clamp(seconds, 0, d.trim[1] - .02) : d.trim[0];
        let t1 = which === 'end' ? clamp(seconds, d.trim[0] + .02, dur) : d.trim[1];
        d.trim[0] = Math.round(t0 * 1000) / 1000;
        t1 = Math.min(t1, d.trim[0] + max);
        d.trim[1] = Math.round(t1 * 1000) / 1000;
        this._paintEditor();
      };
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        try { handle.setPointerCapture(event.pointerId); } catch { /* wie Knob */ }
        handle.dataset.drag = '1';
        const onMove = (e) => {
          const rect = frame.getBoundingClientRect();
          move(clamp((e.clientX - rect.left) / rect.width, 0, 1) * this.sampler.draftBuffer.duration);
        };
        const onEnd = () => { delete handle.dataset.drag; handle.removeEventListener('pointermove', onMove); handle.removeEventListener('pointerup', onEnd); handle.removeEventListener('pointercancel', onEnd); };
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onEnd);
        handle.addEventListener('pointercancel', onEnd);
      });
      handle.addEventListener('keydown', (event) => {
        const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
        if (!dir) return;
        event.preventDefault();
        event.stopPropagation();
        const d = this.sampler.draft;
        move(d.trim[which === 'start' ? 0 : 1] + dir * (event.shiftKey ? .001 : .01));
      });
    }

    async _editorFinish(save) {
      const smp = this.sampler;
      const d = smp.draft;
      let pending = null;
      if (save && d) {
        const meta = sanitizeSampleMeta({ ...d, name: d.name.trim() || tf('lab.sampler.defaultName', { n: smp.meta.size }) });
        if (meta) {
          pending = this._saveSample(meta, null, null);
          this._setStatus(tf('lab.sampler.saved', { n: smp.sel + 1, name: meta.name }));
        }
      }
      smp.draft = null; smp.draftBuffer = null; smp.draftPeaks = null;
      this._samplerGo('pads');
      if (pending) await pending;
      this._renderTracks(); this._renderLive(); this._renderSampler();
    }

    _editorKind(kind) {
      const smp = this.sampler;
      const d = smp.draft;
      if (!SAMPLE_KINDS.includes(kind) || kind === d.kind) return;
      const sr = smp.draftBuffer.sampleRate;
      if (kind === 'tone' && d.detectedMidi === null) {
        const data = smp.draftBuffer.getChannelData(0).subarray(Math.floor(d.trim[0] * sr), Math.ceil(d.trim[1] * sr));
        const pitch = detectPitch(data, sr);
        if (!pitch) { this._setStatus(t('lab.sampler.noPitch')); return; }
        d.detectedMidi = pitch.midi; d.detectedCents = pitch.cents;
      }
      d.kind = kind;
      d.trim[1] = Math.min(d.trim[1], d.trim[0] + SAMPLER_MAX_SEC[kind]);
      d.decay = Math.min(Math.max(d.decay, .05), SAMPLER_MAX_SEC[kind]);
      this._renderSampler();
    }

    _deleteSample(id) {
      const smp = this.sampler;
      const s = this.state;
      this._pushHistory();
      smp.meta.delete(id); smp.buffers.delete(id); smp.blobs.delete(id); smp.peaks.delete(id);
      for (const kit of s.sampler.kits) kit.pads = kit.pads.map((p) => (p === id ? null : p));
      s.sampleLanes = s.sampleLanes.filter((l) => l.padId !== id);
      Promise.resolve(this._storage?.samples?.remove?.(id)).catch((err) => console.warn('[groove-lab] Sample nicht gelöscht', err));
      smp.draft = null; smp.draftBuffer = null; smp.draftPeaks = null;
      this._samplerGo('pads');
      this._renderTracks(); this._renderLive();
    }

    /* -- Bibliothek -- */

    _renderSamplerLibrary(root) {
      const smp = this.sampler;
      const nodes = [this._smpHead(t('lab.sampler.libTitle'))];
      const section = (titleKey, metas, emptyKey) => {
        const panel = this._mk('section', 'panel smp-panel');
        panel.append(this._panelHead(t(titleKey)));
        if (!metas.length) panel.append(this._mk('p', 'smp-hint', t(emptyKey)));
        const list = this._mk('div', 'smp-lib');
        for (const meta of metas) {
          const row = this._mk('div', 'smp-lib-row');
          const listen = this._mk('button', 'chip', '▶');
          listen.type = 'button'; listen.dataset.action = 'smp-lib-listen'; listen.dataset.value = meta.id;
          listen.setAttribute('aria-label', `${t('lab.sampler.listen')}: ${meta.name}`);
          const use = this._mk('button', 'smp-lib-use');
          use.type = 'button'; use.dataset.action = 'smp-lib-use'; use.dataset.value = meta.id;
          use.append(this._mk('strong', '', meta.name), this._mk('span', '', `${this._kindLabel(meta.kind)} · ${this._roleLabel(meta)}`));
          row.append(listen, use);
          list.append(row);
        }
        panel.append(list);
        return panel;
      };
      nodes.push(this._mk('p', 'smp-hint', tf('lab.sampler.libHint', { n: smp.sel + 1 })));
      nodes.push(section('lab.sampler.libFactory', FACTORY_SAMPLES, ''));
      nodes.push(section('lab.sampler.libOwn', [...smp.meta.values()].sort((a, b) => b.createdAt - a.createdAt), 'lab.sampler.libEmpty'));
      root.replaceChildren(...nodes);
    }

    /* -- Im Beat -- */

    /** Sample-Spur anlegen (höchstens vier): bei Schlägen die Schritte der Zielspur übernehmen und diese stummschalten
     *  (mit „Originalklang leise darunter“ spielt sie mit 35 %). */
    _padToBeat(padId) {
      const s = this.state;
      const meta = this._sampleMeta(padId);
      if (!meta) { this._setStatus(t('lab.sampler.missing')); return; }
      if (s.sampleLanes.some((l) => l.padId === padId)) { this._setStatus(t('lab.sampler.laneExists')); return; }
      if (s.sampleLanes.length >= SAMPLER_MAX_LANES) { this._setStatus(tf('lab.sampler.lanesFull', { n: SAMPLER_MAX_LANES })); return; }
      this._pushHistory();
      const lane = { padId, on: true, layer: false, steps: {} };
      if (meta.kind === 'hit') {
        for (const [step, value] of Object.entries(s.beat[meta.track] || {})) lane.steps[step] = value < 1 ? Math.max(.1, value) : 1;
        if (meta.layerOriginal) lane.layer = true; else s.trackOn[meta.track] = false;
      } else lane.steps[0] = 1;
      s.sampleLanes.push(lane);
      s.beatEdited = true;
      this._primeSamples();
      this._renderBeat(); this._renderSampler();
      this._setStatus(tf('lab.sampler.toBeatDone', { name: meta.name }));
    }

    _laneRemove(index) {
      const s = this.state;
      const lane = s.sampleLanes[index];
      if (!lane) return;
      this._pushHistory();
      s.sampleLanes.splice(index, 1);
      this._renderBeat(); this._renderSampler();
    }

    /** Zellen einer Sample-Spur: antippen schaltet 1 → .6 → aus (wie die Drum-Spuren). */
    _toggleLaneCell(laneIndex, step) {
      const s = this.state;
      const lane = s.sampleLanes[laneIndex];
      if (!lane) return;
      const cycle = [1, .6];
      const current = lane.steps[step];
      const index = current === undefined ? -1 : cycle.indexOf(current);
      if (current !== undefined && (index === -1 || index === cycle.length - 1)) delete lane.steps[step]; else lane.steps[step] = cycle[index + 1];
      s.beatEdited = true;
      this._renderTracks();
      if (!this.playing && lane.steps[step] !== undefined) this._auditionPad(lane.padId, { velocity: lane.steps[step] });
    }

    /** Anzeige des klingenden Tons in einer Ton-Zelle (Zielton des Akkords an dieser Stelle des Takts). */
    _laneNoteLabel(meta, step) {
      if (meta.kind !== 'tone' || meta.detectedMidi === null) return '';
      const g = this.playing && this.shown ? Math.floor(this.shown.g / this._barSteps()) * this._barSteps() + step : step;
      const h = this._harmonyAt(g);
      const target = sampleToneTarget(meta.toneRole, meta.detectedMidi, chordPitchClasses(h.keyRoot, h.steps, h.deg, h.sevenths).slice(0, 3));
      return noteLabel(target, ...this._spellKeyAt(h.index), labLang);
    }

    /** Live einspielen: Pad-Reihe unter dem Raster (die ersten vier Pads des Kits). */
    _renderLive() {
      const host = this.$('.live-pads');
      if (!host) return;
      const smp = this.sampler;
      const kit = this._kit();
      host.replaceChildren(...[0, 1, 2, 3].map((i) => {
        const id = kit.pads[i];
        const meta = this._sampleMeta(id);
        const btn = this._mk('button', `pad-btn live-pad${meta ? ` is-${meta.kind}` : ' is-free'}`);
        btn.type = 'button';
        btn.setAttribute('aria-label', meta ? tf('lab.sampler.padAria', { n: i + 1, name: meta.name, kind: this._kindLabel(meta.kind) }) : tf('lab.sampler.padFreeAria', { n: i + 1 }));
        btn.append(this._mk('span', 'pad-name', meta ? meta.name : '+'));
        btn.addEventListener('pointerdown', (event) => { if (event.button > 0) return; event.preventDefault(); this._livePad(i); });
        btn.addEventListener('click', (event) => { if (event.detail === 0) this._livePad(i); });
        return btn;
      }));
      const toggle = this.$('[data-switch="liveWrite"]');
      if (toggle) toggle.checked = smp.live;
    }

    /** Pad live spielen; läuft der Loop und „Ins Raster schreiben“ ist an, wird der Anschlag auf die nächste Sechzehntel gelegt. */
    async _livePad(index) {
      const s = this.state;
      const smp = this.sampler;
      const id = this._kit().pads[index];
      if (!id) { this.sampler.sel = index; this._setTab('sampler'); this._samplerGo('record'); return; }
      const tap = this.engine.ready ? this.engine.ctx.currentTime : null;
      await this._auditionPad(id);
      if (!smp.live || !this.playing || tap === null || !this.stepClock) return;
      const meta = this._sampleMeta(id);
      if (!meta) return;
      const ctx = this.engine.ctx;
      const latency = ctx.outputLatency || ctx.baseLatency || 0;
      const g = quantizeTapStep(tap, this.stepClock.time, this.stepClock.g, this._stepSeconds(), latency);
      const step = mod(g, this._barSteps());
      let lane = s.sampleLanes.find((l) => l.padId === id);
      this._pushHistory();
      if (!lane) {
        if (s.sampleLanes.length >= SAMPLER_MAX_LANES) { this._setStatus(tf('lab.sampler.lanesFull', { n: SAMPLER_MAX_LANES })); return; }
        lane = { padId: id, on: true, layer: false, steps: {} };
        s.sampleLanes.push(lane);
      }
      lane.steps[step] = 1;
      s.beatEdited = true;
      this._renderTracks();
    }

    /** Sample-Spuren eines Schritts spielen (Teil von _playStep). */
    _playLanes(g, step, swung, stepSec, h) {
      const s = this.state;
      const barSteps = this._barSteps();
      for (const lane of s.sampleLanes) {
        if (!lane.on) continue;
        let velocity = lane.steps[step];
        if (velocity === undefined) continue;
        const meta = this._sampleMeta(lane.padId);
        if (!meta) { if (!this._missingSaid) { this._missingSaid = true; this._setStatus(t('lab.sampler.missing')); } continue; }
        const buffer = this._bufferNow(lane.padId);
        if (!buffer) { this._loadBuffer(lane.padId); continue; } // erster Durchlauf: noch nicht dekodiert
        let when = swung;
        if (s.feel) {
          velocity *= .94 + Math.random() * .12;
          if (meta.kind === 'hit' && (meta.track === 'hat' || meta.track === 'open')) {
            velocity *= hatAccent(step, this._meter());
            when = Math.max(this.engine.ctx.currentTime, swung + (Math.random() * 2 - 1) * .003);
          }
          velocity = Math.min(1, velocity);
        }
        const level = this._padLevel(meta, buffer) * velocity;
        if (meta.kind === 'tone') {
          if (meta.detectedMidi === null) continue;
          const target = sampleToneTarget(meta.toneRole, meta.detectedMidi, chordPitchClasses(h.keyRoot, h.steps, h.deg, h.sevenths).slice(0, 3));
          // Dauer: bis zum nächsten Treffer der Spur im Takt bzw. zum Akkordwechsel.
          const chordSteps = barSteps * s.chordBars;
          const untilChord = chordSteps - (g % chordSteps);
          const untilNext = bassNoteSteps(lane.steps, step, barSteps);
          const steps = Math.min(untilChord, untilNext);
          this.engine.playPad(buffer, meta, when, level, { rate: sampleToneRate(target, meta.detectedMidi, meta.detectedCents, meta.pitch), duration: Math.max(.05, steps * stepSec * .92), layer: 'keys' });
        } else if (meta.kind === 'loop') {
          // Loops starten nur auf einer Takt-Eins und laufen taktweise (jeden `loopBars`-ten Takt).
          if (step !== 0 || Math.floor(g / barSteps) % meta.loopBars !== 0) continue;
          const rate = loopRate(s.bpm, meta.bpmAtRec);
          if (rate === null) { this._setStatus(tf('lab.sampler.loopTempo', { bpm: meta.bpmAtRec })); continue; }
          this.engine.playPad(buffer, meta, swung, level, { rate });
        } else {
          this.engine.playPad(buffer, meta, when, level, {});
          if (meta.track === 'kick' && s.pump > 0) this.engine.duckAt(swung, s.pump, stepSec * 4);
        }
      }
    }

    /* ---- Harmonie ---- */

    _renderHarmony() {
      const s = this.state;
      const mode = this._mode();
      // Tonart-Namen je Modus geschrieben (a-Moll-Liste: Cis, Dis, Fis, Gis).
      const keyNames = Array.from({ length: 12 }, (_, pc) => spell(pc, pc, s.modeId, labLang));
      this.$all('[data-field="keyRoot"]').forEach((el) => this._options(el, keyNames.map((name, i) => [i, name]), s.keyRoot));
      this.$all('[data-field="modeId"]').forEach((el) => this._options(el, MODES.map((m) => [m.id, t(m.nameKey)]), s.modeId));
      const progSel = this.$('[data-choir="prog"]');
      if (progSel) this._options(progSel, PROGRESSIONS.map((p) => [p.id, t(progKey('Name', p.id))]), s.progDegrees ? '' : s.progId);
      this._renderPickerFor('prog');
      this.$('.key-name').textContent = `${keyNames[s.keyRoot]} ${t(mode.nameKey)}`;
      this.$('[data-field="chordBars"]').value = String(s.chordBars);
      this._renderLock('harmony');

      this._setSwitch('chordsOn', s.chordsOn);
      this._setSwitch('chordAdd9', s.chordAdd9);
      this.$('.add9-row').hidden = s.chordVoicing !== 'pop';
      this._chips(this.$('.voicing-chips'), [['satb', 'lab.voicingSatb'], ['pop', 'lab.voicingPop']].map(([value, key]) => ({ value, label: t(key) })), s.chordVoicing, 'chord-voicing');
      this._chips(this.$('.chordsound-chips'), [['synth', 'lab.chordSoundSynth'], ['choir', 'lab.chordSoundChoir']].map(([value, key]) => ({ value, label: t(key) })), s.chordSound, 'chord-sound');
      this._setSwitch('droneOn', s.droneOn);
      this._setSwitch('droneFifth', s.droneFifth);
      this._renderChordStrip();
      this._renderProgEditor();
      this._renderSatb();
    }

    _renderChordStrip() {
      const s = this.state;
      const prog = this._progression();
      const current = this.playing && this.shown?.h && !this.shown.h.round && !this._shownOriginal() ? this.shown.h.index : -1;
      const host = this.$('.chord-strip');
      const editing = this.ui.progEdit;
      host.replaceChildren(...prog.degrees.map((deg, i) => {
        // Im Editor sind die Akkorde Knöpfe: antippen wählt den Platz.
        const box = document.createElement(editing ? 'button' : 'div');
        box.className = `chord-box${i === current ? ' is-now' : ''}${editing && i === this.ui.progSel ? ' is-selected' : ''}`;
        if (editing) {
          box.type = 'button';
          box.dataset.action = 'prog-slot';
          box.dataset.value = String(i);
          box.setAttribute('aria-pressed', String(i === this.ui.progSel));
        }
        const roman = document.createElement('span');
        roman.className = 'chord-roman';
        roman.textContent = this._romanAt(prog, i);
        const name = document.createElement('strong');
        name.textContent = this._nameAt(prog, i);
        box.append(roman, name);
        return box;
      }));
    }

    _renderSatb() {
      const s = this.state;
      const index = this.playing && this.shown?.h && !this.shown.h.round && !this._shownOriginal() ? this.shown.h.index : 0;
      const voicing = this._voicings()[index] || this._voicings()[0];
      const own = this._choirPart();
      this.$all('.satb-list').forEach((host) => host.replaceChildren(...SATB.map((voice) => {
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
        note.textContent = noteLabel(voicing[voice], ...this._spellKeyAt(index), labLang);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.dataset.action = 'satb';
        btn.dataset.value = voice;
        btn.setAttribute('aria-pressed', String(s.satb[voice] !== 'on'));
        btn.textContent = t({ on: 'lab.satbOn', focus: 'lab.satbFocus', mute: 'lab.satbMute' }[s.satb[voice]]);
        btn.setAttribute('aria-label', `${t(SATB_KEY[voice])}: ${btn.textContent}`);
        if (voice === own) { row.classList.add('is-own'); name.textContent += ` · ${t('lab.choirYou')}`; }
        row.append(dot, name, note, btn);
        return row;
      })));
    }

    /* ---- Melodie ---- */

    _renderMelody() {
      const s = this.state;
      this._setSwitch('melodyOn', s.melodyOn);
      this._setSwitch('melodyAltBars', s.melodyAltBars);
      this._renderPickerFor('melody');
      this._chips(this.$('.melody-octaves'), [3, 4, 5].map((o) => ({ value: o, label: String(o) })), s.melodyOctave, 'melody-octave');
      this._renderLock('melody');
      this._renderMelEditor();
    }

    /* ---- Melodie-Editor (Notenrolle) ----
       Zeilen sind Tonleiterstufen über dem gerade klingenden Akkord, wie bei
       den eingebauten Melodien — eigene Melodien wandern dadurch mit der
       Akkordfolge mit und bleiben in der Tonart. "Zwischentöne" erlaubt
       bewusst ♭/♯ (ein Halbton neben der Stufe), als Vorzeichen am Ton. */

    _renderMelEditor() {
      const s = this.state;
      const editing = this.ui.melEdit;
      const bars = this._melody().bars;
      this.ui.melBar = Math.min(this.ui.melBar, bars.length - 1);
      this.$('.mel-view').hidden = editing;
      this.$('.mel-editor').hidden = !editing;
      this._paintMelRoll(this.$('.mel-mini'), bars.map((_, i) => i), false);
      if (!editing) return;
      // Takt-Reiter, dazu + (Takt anhängen) und − (gewählten Takt entfernen)
      const tabs = bars.map((_, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mel-bar-tab';
        btn.dataset.action = 'mel-bar';
        btn.dataset.value = String(i);
        btn.textContent = String(i + 1);
        btn.setAttribute('aria-label', tf('lab.melBarAria', { n: i + 1 }));
        btn.setAttribute('aria-pressed', String(i === this.ui.melBar));
        return btn;
      });
      const extra = (action, label, text, disabled) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mel-bar-tab is-extra';
        btn.dataset.action = action;
        btn.setAttribute('aria-label', label);
        btn.title = label;
        btn.textContent = text;
        btn.disabled = disabled;
        return btn;
      };
      this.$('.mel-bars').replaceChildren(...tabs,
        extra('mel-add-bar', t('lab.melAddBar'), '+', bars.length >= MEL_MAX_BARS),
        extra('mel-remove-bar', t('lab.melRemoveBar'), '−', bars.length <= 1));
      this.$('[data-action="mel-undo"]').disabled = !this.ui.melUndo.length;
      this.$('[data-action="mel-redo"]').disabled = !this.ui.melRedo.length;
      this._paintMelRoll(this.$('.mel-grid'), [this.ui.melBar], true);
      this._chips(this.$('.mel-lengths'), MEL_LENGTHS.map(([v, label]) => ({ value: v, label })), this.ui.melLen, 'mel-len');
      this._setSwitch('melChroma', this.ui.melChroma);
      const alts = this.$('.mel-alts');
      alts.hidden = !this.ui.melChroma;
      this._chips(alts, [[-1, '♭'], [0, '♮'], [1, '♯']].map(([v, label]) => ({ value: v, label })), this.ui.melAlt, 'mel-alt');
      const own = s.melodyOwnId && this._saved.melodies.find((m) => m.id === s.melodyOwnId);
      this.$('.mel-name-row').hidden = !own;
      const nameInput = this.$('.mel-name');
      if (own && this.shadowRoot.activeElement !== nameInput) nameInput.value = own.name;
      this.$('[data-action="mel-original"]').hidden = !s.melodyBars || !!s.melodyName;
      this.$('[data-action="mel-save"]').hidden = !!own;
      this.$('[data-action="mel-delete"]').hidden = !own;
    }

    /** Notenrolle zeichnen — klein (alle Takte, zum Anschauen) oder groß
     *  (ein Takt, zum Bearbeiten, mit Stufen-Beschriftung links). */
    _paintMelRoll(host, barIdx, large, bars = this._melody().bars) {
      const steps = this._barSteps();
      const meter = METERS[this._meter()];
      const cols = barIdx.length * steps;
      // Groß: alle drei Oktaven (scrollbar). Klein: nur der benutzte Bereich,
      // mindestens die mittlere Oktave — sonst würden die Töne winzig.
      let hi = MEL_HIGH;
      let lo = MEL_LOW;
      if (!large) {
        const degs = barIdx.flatMap((bi) => (bars[bi] || []).map((n) => n[1]));
        hi = Math.max(7, ...degs);
        lo = Math.min(0, ...degs);
      }
      const rows = hi - lo + 1;
      const pct = (v) => `${(v * 100).toFixed(3)}%`;
      if (large) host.style.height = `${rows * MEL_ROW_PX}px`;
      let html = '';
      for (let d = hi; d >= lo; d--) {
        const cls = [mod(d, 7) === 0 ? 'is-root' : '', [2, 4].includes(mod(d, 7)) ? 'is-chord' : '',
          d < 0 || d > 6 ? 'is-outer' : '', d === -1 || d === 6 ? 'is-split' : ''].join(' ');
        html += `<span class="mel-row ${cls}" style="top:${pct((hi - d) / rows)};height:${pct(1 / rows)}"></span>`;
      }
      for (let c = 1; c < cols; c++) {
        const inBar = c % steps;
        if (!inBar) html += `<span class="mel-line is-bar" style="left:${pct(c / cols)}"></span>`;
        else if (meter.beats.includes(inBar)) html += `<span class="mel-line is-beat" style="left:${pct(c / cols)}"></span>`;
        else if (large) html += `<span class="mel-line" style="left:${pct(c / cols)}"></span>`;
      }
      // Alle Töne relativ zum ersten gezeigten Takt — so erscheint auch ein
      // Ton, der aus dem vorigen Takt herüberklingt, im gezeigten Takt.
      const first = barIdx[0] * steps;
      bars.forEach((bar, bi) => (bar || []).forEach(([at, deg, len, alt]) => {
        const start = bi * steps + at - first;
        if (start + len <= 0 || start >= cols) return;
        const sign = alt === 1 ? '♯' : alt === -1 ? '♭' : '';
        html += `<span class="mel-note${alt ? ' is-alt' : ''}" style="left:${pct(start / cols)};width:${pct(len / cols)};top:${pct((hi - deg) / rows)};height:${pct(1 / rows)}">${large && sign ? `<b>${sign}</b>` : ''}</span>`;
      }));
      html += '<span class="mel-playhead" hidden></span>';
      host.innerHTML = html;
      host.dataset.bars = barIdx.join(',');
      if (large) {
        // Beschriftung: 1–7 je Oktave, 1 = Grundton des Akkords, Akkordtöne
        // rosa; die äußeren Oktaven tragen eine Klammer "höher"/"tiefer".
        // Die Leiste ist zugleich der Griff zum Scrollen (die Rolle selbst
        // fängt Berührungen zum Zeichnen ab).
        let labels = '';
        for (let d = hi; d >= lo; d--) {
          labels += `<span class="${[0, 2, 4].includes(mod(d, 7)) ? 'is-chord' : ''}${d < 0 || d > 6 ? ' is-outer' : ''}">${mod(d, 7) + 1}</span>`;
        }
        labels += `<span class="mel-band" style="top:0;height:${pct((hi - 6) / rows)}"><i>${t('lab.melHigher')}</i></span>`;
        labels += `<span class="mel-band" style="top:${pct((hi + 1) / rows)};height:${pct(-lo / rows)}"><i>${t('lab.melLower')}</i></span>`;
        const labelHost = this.$('.mel-labels');
        labelHost.innerHTML = labels;
        labelHost.style.height = `${rows * MEL_ROW_PX}px`;
      }
    }

    /** Rolle so scrollen, dass die Töne des Takts (sonst die mittlere
     *  Oktave) mittig im Blick sind. */
    _scrollMelRoll() {
      const roll = this.$('.mel-roll');
      const notes = this._melody().bars[this.ui.melBar] || [];
      const degs = notes.map((n) => n[1]);
      const center = degs.length ? (Math.max(...degs) + Math.min(...degs)) / 2 : 3;
      roll.scrollTop = (MEL_HIGH - center + .5) * MEL_ROW_PX - roll.clientHeight / 2;
    }

    /** Abspielmarke in Mini- und großer Rolle. */
    _showMelodyStep(g) {
      const bars = this._melody().bars.length;
      const steps = this._barSteps();
      for (const host of [this.$('.mel-mini'), this.ui.melEdit ? this.$('.mel-grid') : null]) {
        const ph = host?.querySelector('.mel-playhead');
        if (!ph) continue;
        const shown = (host.dataset.bars || '').split(',').map(Number);
        const k = g < 0 || !this.state.melodyOn ? -1 : shown.indexOf(Math.floor(g / steps) % bars);
        ph.hidden = k === -1;
        if (k !== -1) ph.style.left = `${((k * steps + (g % steps)) / (shown.length * steps)) * 100}%`;
      }
    }

    /** Veränderbare Takte der aktuellen Melodie (legt beim ersten Eingriff
     *  eine Kopie der Vorlage an) — vorher den Stand fürs Rückgängig merken. */
    _melBegin() {
      const s = this.state;
      this.ui.melUndo.push(JSON.stringify([s.melodyBars, s.melodyName, s.melodyOwnId, s.melodyRef]));
      if (this.ui.melUndo.length > 60) this.ui.melUndo.shift();
      this.ui.melRedo = [];
      if (!s.melodyBars) {
        s.melodyBars = MELODIES[s.melodyIndex].bars.map((bar) => bar.map((n) => [...n]));
        s.melodyMeter = this._meter();
        s.melodyRef = melodyRefOf(s.melodyIndex);
      }
      return s.melodyBars;
    }

    /** Nach jeder Änderung: unveränderte Vorlage wieder als Vorlage führen,
     *  eigene Melodie in der Bibliothek nachziehen, neu zeichnen. */
    _melCommit({ persist = true } = {}) {
      const s = this.state;
      if (s.melodyBars && !s.melodyName && s.melodyRef === melodyRefOf(s.melodyIndex) && JSON.stringify(s.melodyBars) === JSON.stringify(MELODIES[s.melodyIndex].bars)) {
        s.melodyBars = null; s.melodyMeter = null;
      }
      const own = s.melodyOwnId && this._saved.melodies.find((m) => m.id === s.melodyOwnId);
      if (own && s.melodyBars) {
        own.bars = s.melodyBars.map((bar) => bar.map((n) => [...n]));
        own.name = s.melodyName || own.name;
        if (persist) this._persist();
      }
      this._renderMelody();
      this._wsSchedule();
    }

    _melRestore(from, to) {
      const snap = from.pop();
      if (!snap) return;
      const s = this.state;
      to.push(JSON.stringify([s.melodyBars, s.melodyName, s.melodyOwnId, s.melodyRef]));
      [s.melodyBars, s.melodyName, s.melodyOwnId, s.melodyRef = 'chord'] = JSON.parse(snap);
      s.melodyMeter = s.melodyBars ? this._meter() : null;
      this._melCommit();
    }

    /** Einstimmig setzen: kürzt die vorige Note, verdrängt, was im neuen
     *  Bereich beginnt. Liefert die neue Note. */
    _melPlace(bar, at, deg, len, alt) {
      const steps = this._barSteps();
      const notes = bar;
      len = Math.max(1, Math.min(len, steps - at));
      for (let i = notes.length - 1; i >= 0; i--) {
        const [a, , l] = notes[i];
        if (a >= at && a < at + len) notes.splice(i, 1);
        else if (a < at && a + l > at) notes[i][2] = at - a;
      }
      const note = alt ? [at, deg, len, alt] : [at, deg, len];
      notes.push(note);
      notes.sort((x, y) => x[0] - y[0]);
      return note;
    }

    /** Einen Ton kurz anspielen — über dem Akkord, der in diesem Takt klingt. */
    async _melPreview(deg, alt, barIndex) {
      try { await this._ensureAudio(); } catch { return; }
      const s = this.state;
      const h = this._harmonyAt(barIndex * this._barSteps());
      const midi = this._melodyMidi(deg, alt || 0, h, this._melody().ref);
      this.engine.playTone(s.sound, midi, this.engine.ctx.currentTime + .01, .22, this._stepSeconds() * 2.5,
        { layer: 'keys', stepSeconds: this._stepSeconds() });
    }

    /** Tippen/Ziehen in der großen Rolle. */
    _wireMelGrid() {
      const grid = this.$('.mel-grid');
      let drag = null;
      const cellAt = (e) => {
        const r = grid.getBoundingClientRect();
        const steps = this._barSteps();
        const rows = MEL_HIGH - MEL_LOW + 1;
        return {
          step: clamp(Math.floor(((e.clientX - r.left) / r.width) * steps), 0, steps - 1),
          deg: MEL_HIGH - clamp(Math.floor(((e.clientY - r.top) / r.height) * rows), 0, rows - 1),
        };
      };
      grid.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        e.preventDefault();
        const { step, deg } = cellAt(e);
        const barIndex = this.ui.melBar;
        const bars = this._melBegin();
        const bar = bars[barIndex];
        const hit = bar.find(([a, d, l]) => d === deg && step >= a && step < a + l);
        if (hit) {
          bar.splice(bar.indexOf(hit), 1);
          this._melCommit();
          return;
        }
        const alt = this.ui.melChroma ? this.ui.melAlt : 0;
        drag = { note: this._melPlace(bar, step, deg, this.ui.melLen, alt), start: step, bar, id: e.pointerId, stretched: false };
        try { grid.setPointerCapture(e.pointerId); } catch { /* siehe Knob._startDrag */ }
        this._melPreview(deg, alt, barIndex);
        this._melCommit({ persist: false });
      });
      grid.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const { step } = cellAt(e);
        const len = step - drag.start + 1;
        // Weiterziehen macht den Ton länger (nie kürzer als die gewählte Länge,
        // außer man zieht bewusst zurück in den ersten Schritt).
        if (len < 1 || (!drag.stretched && len <= drag.note[2])) return;
        drag.stretched = true;
        drag.bar.splice(drag.bar.indexOf(drag.note), 1);
        drag.note = this._melPlace(drag.bar, drag.start, drag.note[1], len, drag.note[3]);
        this._melCommit({ persist: false });
      });
      const end = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        this._melCommit();
      };
      grid.addEventListener('pointerup', end);
      grid.addEventListener('pointercancel', end);
    }

    _melSaveOwn() {
      const s = this.state;
      const bars = (s.melodyBars || MELODIES[s.melodyIndex].bars).map((bar) => bar.map((n) => [...n]));
      const lib = this._saved.melodies;
      if (lib.length >= MEL_MAX_OWN) { this._setStatus(t('lab.melLibraryFull')); return; }
      let n = lib.length + 1;
      while (lib.some((m) => m.name === tf('lab.myMelodyN', { n }))) n++;
      const name = s.melodyName && !s.melodyOwnId && s.melodyName !== t('lab.newMelody') ? s.melodyName : tf('lab.myMelodyN', { n });
      const id = `m${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
      const ref = s.melodyBars ? s.melodyRef : melodyRefOf(s.melodyIndex);
      lib.push(ref === 'key' ? { id, name, meter: this._meter(), bars, ref } : { id, name, meter: this._meter(), bars });
      s.melodyBars = bars.map((bar) => bar.map((note) => [...note]));
      s.melodyMeter = this._meter();
      s.melodyName = name;
      s.melodyOwnId = id;
      s.melodyRef = ref;
      this._persist();
      this._renderMelody();
      this._setStatus(tf('lab.melSaved', { name }));
    }

    _melDeleteOwn() {
      const s = this.state;
      const own = this._saved.melodies.find((m) => m.id === s.melodyOwnId);
      if (!own || !global.confirm(tf('lab.melDeleteConfirm', { name: own.name }))) return;
      this._saved.melodies = this._saved.melodies.filter((m) => m !== own);
      this._clearMelodyEdit();
      this.ui.melEdit = false;
      this._persist();
      this._renderMelody();
    }

    /* ---- Klang ---- */

    _renderSound() {
      this._renderLock('sound');
      this._renderSoundName();
      this._renderMacros();
      this._renderSynthControls();
      this._renderFx();
      this._renderAutomation();
    }

    _renderSoundName() {
      const sound = this.state.sound;
      this.$('[data-action="reset-sound"]').hidden = !sound.custom;
      this._renderPickerFor('sound');
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
        ...(sound.sample ? [] : [{ label: t('lab.macroWidth'), value: Math.max(sound.detune / 20, sound.width),
          apply: (v) => { sound.detune = v * 20; sound.width = v; } }]),
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
      this._wsChTouched();
      const sound = this.state.sound;
      this._autoCapture();
      if (!sound.custom) {
        sound.custom = true;
      }
      this._renderSoundName();
      this._applySound();
      if (refreshKnobs) this._refreshSoundControls();
      this._wsSchedule();
    }

    /** Der eine Synth-Klang gilt für Melodie, Arp und Tasten. */
    _applySound() {
      for (const layer of SOUND_LAYERS) this.engine.setLayerSound(layer, this._heardSound());
      this._loadInstruments();
      this._renderSampleNote();
    }

    /** Sample-Klänge: nur die wirksamen Regler zeigen (Attack, Release, Cutoff, Resonanz,
     *  Drive, Hall, Echo) — Wellenform, Decay/Sustain, Filter-Hüllkurve, LFO, Charakter,
     *  Vibrato und Gleiten gelten dort nicht (ausgeblendet, nicht nur ausgegraut). */
    _applySampleControls() {
      const sampled = !!this.state.sound.sample;
      for (const m of ['osc', 'lfo', 'char', 'vib', 'glide']) this.$(`[data-mod="${m}"]`).hidden = sampled;
      this.$all('[data-sound="decay"], [data-sound="sustain"]').forEach((input) => { input.closest('.slider-field').hidden = sampled; });
      this.$('.filter-type-chips').hidden = sampled;
      if (this._soundKnobs.filterEnvAmount) this._soundKnobs.filterEnvAmount.el.hidden = sampled;
      this._renderSampleNote();
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
        this._soundLabels[key] = label;
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
        this._soundLabels[key] = key === 'reverbWet' ? t('lab.reverb') : key === 'echoWet' ? t('lab.echo') : label;
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
      this._applySampleControls();

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
      for (const [key, cls] of [['reverbOn', 'fx-reverb'], ['echoOn', 'fx-echo'], ['chorusOn', 'fx-chorus']]) {
        this._setSwitch(key, fx[key]);
        this.$(`.${cls}`).closest('.fx-group').classList.toggle('is-off', !fx[key]);
      }
    }

    /* ---- Keys ---- */

    _renderKeys() {
      const s = this.state;
      this._setSwitch('arpOn', s.arpOn);
      this._setSwitch('latchOn', this.ui.latchOn);
      this._setSwitch('arpAuto', s.arpAuto);
      // "Halten" gibt es nur beim manuellen Arp, "Automatisch" nur mit Arp.
      const enable = (key, on) => {
        const input = this.$(`[data-switch="${key}"]`);
        input.disabled = !on;
        input.closest('.switch').classList.toggle('is-disabled', !on);
      };
      enable('latchOn', this._arpManual());
      enable('arpAuto', s.arpOn);
      // Ausgeschaltet eingeklappt: nur Überschrift und An/Aus bleiben.
      this.$('.arp-options').hidden = !s.arpOn;
      this.$('.arp-switches').hidden = !s.arpOn;
      const patterns = s.arpAuto ? ARP_AUTO_PATTERNS : ARP_PATTERNS;
      this._options(this.$('[data-field="arpPattern"]'), patterns.map(([id, key]) => [id, t(key)]), s.arpAuto ? s.arpAutoPattern : s.arpPattern);
      this._options(this.$('[data-field="arpMode"]'), ARP_MODES.map(([id, key]) => [id, t(key)]), s.arpMode);
      this._options(this.$('[data-field="arpDivision"]'), ARP_DIVISIONS.map(([v, label]) => [v, label]), s.arpDivision);
      this._options(this.$('[data-field="arpRhythm"]'), ARP_RHYTHMS.map(([id, key]) => [id, t(key)]), s.arpRhythm);
      this._options(this.$('[data-field="arpRef"]'), ARP_REFS.map(([id, key]) => [id, t(key)]), s.arpRef);
      // Nur der manuelle Arp hat einen Musterbezug; automatisch gilt der Akkord.
      this.$('.arp-ref').hidden = s.arpAuto;
      this.$('[data-action="arp-clear"]').hidden = !(this._latchActive() && this.latchedNotes.size);
      this.$('.arp-status').textContent = !s.arpOn ? '' : s.arpAuto ? t('lab.arpStatusAuto')
        : this._latchActive() ? t('lab.arpStatusLatch') : t('lab.arpStatusHold');
      this._chips(this.$('.keys-layout'), [
        { value: 'piano', label: t('lab.keysPiano') }, { value: 'scale', label: t('lab.keysScale') },
      ], s.keysLayout, 'keys-layout');
      this.$('.keyboard').hidden = s.keysLayout !== 'piano';
      this.$('.scale-pads').hidden = s.keysLayout !== 'scale';
      if (s.keysLayout === 'scale') this._buildPads();
      this._paintHeld();
      this.$('[data-field="arpOctaves"]').value = String(s.arpOctaves);
      this._chips(this.$('.octave-list'), [2, 3, 4, 5].map((o) => ({ value: o, label: String(o), title: tf('lab.octaveAria', { n: o }) })), s.octave, 'key-octave');
    }

    /* ---- Transport & "Jetzt"-Anzeige ---- */

    _renderTransport() {
      const btn = this.$('.transport-play');
      btn.innerHTML = this.playing ? UI_ICON.pause : UI_ICON.play;
      btn.setAttribute('aria-label', t(this.playing ? 'lab.stopAria' : 'lab.startAria'));
      this._renderRecPlay();
      this.$all('.bpm-input').forEach((el) => { el.value = String(this.state.bpm); });
      this.$all('.bpm-out').forEach((el) => { el.textContent = `${tempoSymbol(this._meter())} = ${this.state.bpm}`; });
      this.$('[data-action="undo"]').disabled = !this.history.length;
      this._renderDcQuick();
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
      // de:construct: Während das Original klingt, verrät die Anzeige keinen Akkord.
      if (this._shownOriginal()) {
        label.textContent = t('lab.dc.original');
      } else {
        const h = (this.playing && this.shown?.h) || this._harmonyAt(0);
        label.textContent = chordName(h.keyRoot, h.steps, h.deg, h.sevenths, this.state.modeId, labLang, h.alter, h.bass);
      }
      if (!this.playing) this._renderBeatDots(-1);
      this._renderChordStrip();
      this._renderSatb();
    }

    /* ---- Akkordfolgen-Editor ----
       Die Akkordleiste wird zum Bearbeiten antippbar; darunter die sieben
       Akkorde der Tonart zum Austauschen, dazu Einfügen, Entfernen,
       Verschieben und Septakkorde. Eigene Folgen landen wie eigene
       Melodien in einer Bibliothek neben den Speicherplätzen. */

    _renderProgEditor() {
      const s = this.state;
      const editing = this.ui.progEdit;
      const prog = this._progression();
      this.$('[data-action="prog-edit"]').hidden = editing;
      this.$('.prog-editor').hidden = !editing;
      this.$('.prog-info').textContent = s.progOwnId || (s.progDegrees && s.progName) ? '' : t(progKey('Info', prog.id));
      if (!editing) return;
      this.ui.progSel = Math.min(this.ui.progSel, prog.degrees.length - 1);
      const sel = prog.degrees[this.ui.progSel];
      const degHost = this.$('.prog-degrees');
      degHost.replaceChildren(...[0, 1, 2, 3, 4, 5, 6].map((d) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prog-deg';
        btn.dataset.action = 'prog-deg';
        btn.dataset.value = String(d);
        btn.setAttribute('aria-pressed', String(d === sel));
        btn.innerHTML = '<span></span><strong></strong>';
        btn.querySelector('span').textContent = romanNumeral(this._stepsFor(d, prog), d, prog.sevenths);
        btn.querySelector('strong').textContent = chordName(s.keyRoot, this._stepsFor(d, prog), d, prog.sevenths, s.modeId);
        return btn;
      }));
      this._chips(this.$('.prog-alter-chips'), [['', 'lab.alterNormal'], ['borrow', 'lab.alterBorrow'], ['secdom', 'lab.alterSecdom']].map(([value, key]) => ({ value, label: t(key) })), prog.alter?.[this.ui.progSel] || '', 'prog-alter');
      this._chips(this.$('.prog-bass-chips'), [[0, 'lab.bassRoot'], [1, 'lab.bassThird'], [2, 'lab.bassFifth']].map(([value, key]) => ({ value, label: t(key) })), prog.bass?.[this.ui.progSel] || 0, 'prog-bass');
      this.$('.prog-count').textContent = tf('lab.progCount', { n: prog.degrees.length });
      this.$('[data-action="prog-undo"]').disabled = !this.ui.progUndo.length;
      this.$('[data-action="prog-redo"]').disabled = !this.ui.progRedo.length;
      this.$('[data-action="prog-add"]').disabled = prog.degrees.length >= PROG_MAX_CHORDS;
      this.$('[data-action="prog-remove"]').disabled = prog.degrees.length <= 1;
      this.$('[data-action="prog-move"][data-value="-1"]').disabled = this.ui.progSel <= 0;
      this.$('[data-action="prog-move"][data-value="1"]').disabled = this.ui.progSel >= prog.degrees.length - 1;
      this._setSwitch('progSevenths', !!prog.sevenths);
      this._setSwitch('progDominant', !!prog.dominant);
      const own = s.progOwnId && this._saved.progressions.find((p) => p.id === s.progOwnId);
      this.$('.prog-name-row').hidden = !own;
      const nameInput = this.$('.prog-name');
      if (own && this.shadowRoot.activeElement !== nameInput) nameInput.value = own.name;
      this.$('[data-action="prog-original"]').hidden = !s.progDegrees || !!s.progName;
      this.$('[data-action="prog-save"]').hidden = !!own;
      this.$('[data-action="prog-delete"]').hidden = !own;
    }

    _progBegin() {
      const s = this.state;
      this.ui.progUndo.push(JSON.stringify([s.progDegrees, s.progSevenths, s.progName, s.progOwnId, s.progDominant, s.progDom7, s.progAlter, s.progBass]));
      if (this.ui.progUndo.length > 60) this.ui.progUndo.shift();
      this.ui.progRedo = [];
      let baseAlter = null;
      let baseBass = null;
      if (!s.progDegrees) {
        const base = this._progression();
        s.progDegrees = [...base.degrees];
        s.progSevenths = !!base.sevenths;
        s.progDominant = !!base.dominant;
        s.progDom7 = !!base.dom7;
        baseAlter = base.alter; baseBass = base.bass;
      }
      // Parallel-Arrays immer in voller Länge, solange die Folge bearbeitet wird.
      s.progAlter = normAlter(s.progAlter ?? baseAlter, s.progDegrees.length);
      s.progBass = normBass(s.progBass ?? baseBass, s.progDegrees.length);
      return s.progDegrees;
    }

    _progCommit() {
      const s = this.state;
      const base = PROGRESSIONS.find((p) => p.id === s.progId) || PROGRESSIONS[0];
      if (s.progDegrees && !s.progName && s.progDegrees.join() === base.degrees.join() && s.progSevenths === !!base.sevenths
        && !!s.progDominant === !!base.dominant && !!s.progDom7 === !!base.dom7
        && normAlter(s.progAlter, s.progDegrees.length).join() === normAlter(base.alter, base.degrees.length).join()
        && normBass(s.progBass, s.progDegrees.length).join() === normBass(base.bass, base.degrees.length).join()) {
        s.progDegrees = null; s.progSevenths = false; s.progDominant = false; s.progDom7 = false; s.progAlter = null; s.progBass = null;
      }
      const own = s.progOwnId && this._saved.progressions.find((p) => p.id === s.progOwnId);
      if (own && s.progDegrees) {
        own.degrees = [...s.progDegrees];
        own.sevenths = s.progSevenths;
        own.dominant = !!s.progDominant;
        own.dom7 = !!s.progDom7;
        const ownAlter = sanitizeProgAlter(s.progAlter, s.progDegrees.length);
        const ownBass = sanitizeProgBass(s.progBass, s.progDegrees.length);
        if (ownAlter) own.alter = ownAlter; else delete own.alter;
        if (ownBass) own.bass = ownBass; else delete own.bass;
        own.name = s.progName || own.name;
        this._persist();
      }
      this._onHarmonyChange();
      this._wsSchedule();
    }

    _progRestore(from, to) {
      const snap = from.pop();
      if (!snap) return;
      const s = this.state;
      to.push(JSON.stringify([s.progDegrees, s.progSevenths, s.progName, s.progOwnId, s.progDominant, s.progDom7, s.progAlter, s.progBass]));
      [s.progDegrees, s.progSevenths, s.progName, s.progOwnId, s.progDominant = false, s.progDom7 = false, s.progAlter = null, s.progBass = null] = JSON.parse(snap);
      this._progCommit();
    }

    /** Akkord kurz anspielen (vierstimmig, im Chorklang). */
    async _previewChord(deg, index = -1) {
      try { await this._ensureAudio(); } catch { return; }
      const s = this.state;
      const prog = this._progression();
      const alter = prog.alter?.[index] || null;
      const steps = this._stepsFor(deg, prog, index);
      const voicing = voiceChord(chordPitchClasses(s.keyRoot, steps, deg, prog.sevenths), { S: 67, A: 62, T: 55, B: 48 },
        { leading: leadingToneOf(s.keyRoot, s.modeId, prog, deg, alter), bassIndex: prog.bass?.[index] || (chordQuality(steps, deg) === 'dim' ? 1 : 0) });
      const now = this.engine.ctx.currentTime + .01;
      for (const voice of SATB) {
        this.engine.playTone(this._chordSound(), voicing[voice], now, .1, .9, { layer: 'keys', glide: 0, stepSeconds: this._stepSeconds() });
      }
    }

    _progSaveOwn() {
      const s = this.state;
      const lib = this._saved.progressions;
      if (lib.length >= PROG_MAX_OWN) { this._setStatus(t('lab.progLibraryFull')); return; }
      const prog = this._progression();
      let n = 1;
      while (lib.some((p) => p.name === tf('lab.myProgN', { n }))) n++;
      const name = s.progName && !s.progOwnId && s.progName !== t('lab.newProg') ? s.progName : tf('lab.myProgN', { n });
      const id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
      const entry = { id, name, degrees: [...prog.degrees], sevenths: !!prog.sevenths, dominant: !!prog.dominant, dom7: !!prog.dom7 };
      const keepAlter = sanitizeProgAlter(prog.alter, prog.degrees.length);
      const keepBass = sanitizeProgBass(prog.bass, prog.degrees.length);
      if (keepAlter) entry.alter = keepAlter;
      if (keepBass) entry.bass = keepBass;
      lib.push(entry);
      s.progAlter = keepAlter;
      s.progBass = keepBass;
      s.progDegrees = [...prog.degrees];
      s.progSevenths = !!prog.sevenths;
      s.progDominant = !!prog.dominant;
      s.progDom7 = !!prog.dom7;
      s.progName = name;
      s.progOwnId = id;
      this._persist();
      this._onHarmonyChange();
      this._setStatus(tf('lab.progSaved', { name }));
    }

    _progDeleteOwn() {
      const s = this.state;
      const own = this._saved.progressions.find((p) => p.id === s.progOwnId);
      if (!own || !global.confirm(tf('lab.melDeleteConfirm', { name: own.name }))) return;
      this._saved.progressions = this._saved.progressions.filter((p) => p !== own);
      this._clearProgEdit();
      this.ui.progEdit = false;
      this._persist();
      this._onHarmonyChange();
    }

    /* ---- Auswahl-Dialog (Drumloop, Melodie, Klang) ----
       Im Panel steht nur die aktuelle Auswahl, mit ‹ › zum direkten
       Weiterblättern. Ein Tipp darauf öffnet ein Blatt von unten mit
       Filtern und allen Optionen; Antippen wählt sofort (das Blatt bleibt
       offen, damit man in Ruhe durchhören kann), "Fertig" schließt. */

    _pickerDef(which) {
      const s = this.state;
      const meter = this._meter();
      // Kuratiert: zuerst die Einträge der *_ORDER-Liste in ihrer Reihenfolge, die übrigen
      // (more: true) folgen in Indexreihenfolge und erscheinen eingeklappt unter „Weitere“.
      const curated = (items, order, byName) => {
        const rank = new Map(orderIndexes(order, byName).map((i, r) => [i, r]));
        const shown = items.filter((it) => rank.has(it.i)).sort((a, b) => rank.get(a.i) - rank.get(b.i));
        return [...shown, ...items.filter((it) => !rank.has(it.i)).map((it) => ({ ...it, more: true }))];
      };
      const catLabel = (c) => t(CAT_KEY[c]);
      if (which === 'beat') {
        return {
          title: 'lab.pickBeat', action: 'pick-pattern', catAction: 'beat-cat', cats: BEAT_CATS, cat: this.ui.beatCat,
          current: s.patternIndex, edited: s.beatEdited,
          items: curated(DRUM_PATTERNS.map((p, i) => ({ i, name: p.name, visual: pictogramIcon(p.icon), cat: p.cat,
            inMeter: p.meter === meter, sub: `${p.meter} · ${catLabel(p.cat)}`, short: catLabel(p.cat) })), BEAT_ORDER, patternIndexByName),
        };
      }
      if (which === 'prog') {
        const romans = (p) => p.degrees.map((d, i) => this._romanAt(p, i)).join('–');
        const own = this._saved.progressions;
        return {
          title: 'lab.pickProg', action: 'pick-prog', catAction: 'prog-cat',
          cats: own.length ? [...PROG_CATS, OWN_CAT] : PROG_CATS, cat: this.ui.progCat,
          current: s.progOwnId && own.some((p) => p.id === s.progOwnId) ? `own:${s.progOwnId}` : s.progOwnId ? -1 : s.progId,
          fallback: s.progId, wide: true,
          items: [
            ...PROGRESSIONS.map((p) => ({ i: p.id, name: t(progKey('Name', p.id)), visual: progPreview(p.degrees, p.alter), cat: p.cat,
              inMeter: true, sub: romans(p), short: romans(p), info: t(progKey('Info', p.id)),
              mismatch: !progFitsMode(p, s.modeId) })),
            ...own.map((p) => ({ i: `own:${p.id}`, name: p.name, visual: progPreview(p.degrees, p.alter), cat: OWN_CAT,
              inMeter: true, sub: romans(p), short: romans(p) })),
          ],
        };
      }
      if (which === 'melody') {
        const own = this._saved.melodies.filter((m) => m.meter === meter);
        return {
          title: 'lab.pickMelody', action: 'pick-melody', catAction: 'melody-cat',
          cats: own.length ? [...MELODY_CATS, OWN_CAT] : MELODY_CATS, cat: this.ui.melodyCat,
          current: s.melodyOwnId && own.some((m) => m.id === s.melodyOwnId) ? `own:${s.melodyOwnId}` : s.melodyOwnId ? -1 : s.melodyIndex,
          wide: true,
          items: [
            ...curated(MELODIES.map((m, i) => ({ i, name: m.name, visual: melodyPreview(m), cat: m.cat,
              inMeter: m.meter === meter, sub: `${m.meter} · ${catLabel(m.cat)}`, short: catLabel(m.cat) })), MELODY_ORDER, melodyIndexByName),
            ...own.map((m) => ({ i: `own:${m.id}`, name: m.name, visual: melodyPreview(m), cat: OWN_CAT,
              inMeter: true, sub: `${m.meter} · ${catLabel(OWN_CAT)}`, short: catLabel(OWN_CAT) })),
          ],
        };
      }
      return {
        title: 'lab.pickSound', action: 'pick-preset', catAction: 'preset-cat', cats: PRESET_CATS, cat: this.ui.presetCat,
        current: s.sound.custom ? -1 : s.sound.presetIndex,
        items: curated(SYNTH_PRESETS.map((p, i) => ({ i, name: p.name, visual: pictogramIcon(p.icon), cat: p.cat,
          inMeter: true, sub: t(presetDescKey(p)), short: t(presetDescKey(p)) })), PRESET_ORDER, presetIndexByName),
      };
    }

    /** Anzeige im Panel und — falls gerade offen — das Blatt. */
    _renderPickerFor(which) {
      const def = this._pickerDef(which);
      const trigger = this.$(`.picker-trigger[data-picker="${which}"]`);
      if (trigger) {
        let name;
        let sub;
        let visual;
        if (which === 'sound' && this.state.sound.custom) {
          const base = SYNTH_PRESETS[this.state.sound.presetIndex];
          name = t('lab.customSound');
          sub = tf('lab.basedOn', { name: base.name });
          visual = pictogramIcon(base.icon);
        } else if (which === 'prog') {
          const prog = this._progression();
          const s = this.state;
          name = this._progName();
          sub = prog.degrees.map((d, i) => this._romanAt(prog, i)).join('–') + (s.progDegrees && !s.progName ? ` · ${t('lab.edited')}` : '')
            + (progFitsMode(prog, s.modeId) ? '' : ` · ${t('lab.progModeMismatch')}`);
          visual = progPreview(prog.degrees, prog.alter);
        } else if (which === 'melody') {
          const melody = this._melody();
          const s = this.state;
          name = melody.name;
          sub = `${this._meter()} · ${t(CAT_KEY[melody.cat])}${s.melodyBars && !s.melodyName ? ` · ${t('lab.edited')}` : ''}`;
          visual = melodyPreview(melody);
        } else {
          const item = def.items.find((it) => it.i === def.current);
          name = item.name;
          sub = item.sub + (def.edited ? ` · ${t('lab.edited')}` : '');
          visual = item.visual;
        }
        trigger.querySelector('.picker-ico').innerHTML = visual;
        trigger.querySelector('.picker-name').textContent = name;
        trigger.querySelector('.picker-sub').textContent = sub;
      }
      if (this.ui.picker === which) this._renderPicker();
    }

    _renderPicker() {
      const which = this.ui.picker;
      if (!which) return;
      const def = this._pickerDef(which);
      const root = this.$('.picker');
      root.querySelector('.picker-title').textContent = t(def.title);
      const chips = root.querySelector('.picker-chips');
      const catChips = def.cats.map((c) => ({ value: c, label: t(CAT_KEY[c]) }));
      this._chips(chips, catChips, def.cat, def.catAction);
      if (def.cat !== 'all') {
        // Filter aktiv: X zum Zurücksetzen (statt einer "Alle"-Bubble).
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'chip chip-clear';
        clear.dataset.action = def.catAction;
        clear.dataset.value = 'all';
        clear.setAttribute('aria-label', t('lab.filterClear'));
        clear.title = t('lab.filterClear');
        clear.innerHTML = UI_ICON.close;
        chips.append(clear);
      }
      if (which === 'beat' && !(this._dc() && dcLevel(this._dc().level).elements.length < DC_ELEMENTS.length)) {
        // Taktart gehört zum Drumloop: 3/4 antippen wechselt gleich den Loop.
        const meterHost = document.createElement('div');
        this._chips(meterHost, METER_IDS.map((id) => ({ value: id, label: id })), this._meter(), 'meter');
        const sep = document.createElement('span');
        sep.className = 'chip-sep';
        chips.prepend(...meterHost.children, sep);
      }
      const makeCard = (it, { chosen = false } = {}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `pick-card${def.wide ? ' is-wide' : ''}${it.mismatch ? ' is-mismatch' : ''}`;
        btn.dataset.action = def.action;
        btn.dataset.value = String(it.i);
        btn.setAttribute('aria-pressed', String(it.i === def.current));
        btn.innerHTML = `<span class="pick-ico">${it.visual}</span><span class="pick-text"><strong></strong><span></span></span>`;
        btn.querySelector('strong').textContent = it.name;
        btn.querySelector('.pick-text span').textContent = it.short;
        if (it.info) {
          const info = document.createElement('em');
          info.textContent = it.info;
          btn.querySelector('.pick-text').append(info);
        }
        if (it.mismatch) {
          const note = document.createElement('small');
          note.className = 'pick-mismatch';
          note.textContent = t('lab.progModeMismatch');
          btn.querySelector('.pick-text').append(note);
        }
        if (chosen) {
          const badge = document.createElement('small');
          badge.className = 'pick-chosen';
          badge.textContent = t('lab.chosenTemplate');
          btn.querySelector('.pick-text').append(badge);
        }
        return btn;
      };
      const visible = def.items.filter((it) => it.inMeter && (def.cat === 'all' || it.cat === def.cat));
      const shown = visible.filter((it) => !it.more);
      const more = visible.filter((it) => it.more);
      const cards = shown.map((it) => makeCard(it));
      // Eine ausgeblendete Vorlage, die gerade gewählt ist, steht zusätzlich ganz oben.
      const chosenHidden = more.find((it) => it.i === def.current);
      if (chosenHidden) cards.unshift(makeCard(chosenHidden, { chosen: true }));
      if (more.length) {
        const details = document.createElement('details');
        details.className = 'pick-more';
        details.open = !!this._pickMoreOpen;
        details.addEventListener('toggle', () => { this._pickMoreOpen = details.open; });
        const summary = document.createElement('summary');
        summary.textContent = tf('lab.moreTemplates', { n: more.length });
        const grid = document.createElement('div');
        grid.className = 'pick-more-grid';
        grid.append(...more.map((it) => makeCard(it)));
        details.append(summary, grid);
        cards.push(details);
      }
      root.querySelector('.picker-grid').replaceChildren(...cards);
      root.querySelector('.picker-now-name').textContent = this.$(`.picker-trigger[data-picker="${which}"] .picker-name`).textContent;
    }

    _openPicker(which) {
      this.ui.picker = which;
      const root = this.$('.picker');
      root.hidden = false;
      this._renderPicker();
      const grid = root.querySelector('.picker-grid');
      grid.scrollTop = 0;
      requestAnimationFrame(() => {
        root.classList.add('is-open');
        const active = grid.querySelector('[aria-pressed="true"]') || grid.querySelector('button');
        if (active) {
          active.scrollIntoView({ block: 'center' });
          active.focus({ preventScroll: true });
        }
      });
    }

    _closePicker({ focus = true } = {}) {
      const which = this.ui.picker;
      if (!which) return;
      this.ui.picker = null;
      const root = this.$('.picker');
      root.classList.remove('is-open');
      root.hidden = true;
      if (focus) this.$(`.picker-trigger[data-picker="${which}"] .picker-main`)?.focus();
    }

    /** ‹ › im Panel: nächster/voriger Eintrag (in der aktuellen Taktart). */
    _stepPicker(which, dir) {
      const def = this._pickerDef(which);
      const list = def.items.filter((it) => it.inMeter && (!it.more || it.i === (which === 'sound' ? this.state.sound.presetIndex : def.current)));
      const current = which === 'sound' ? this.state.sound.presetIndex
        : which === 'melody' && def.current === -1 ? this.state.melodyIndex
          : def.current === -1 ? def.fallback : def.current;
      const pos = list.findIndex((it) => it.i === current);
      const next = list[(pos + dir + list.length) % list.length];
      this._handleAction(def.action, String(next.i), null);
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
      const padName = (d) => spell(s.keyRoot + steps[d % 7], s.keyRoot, s.modeId, labLang);
      const makePad = (d) => {
        const offset = foldRoot(s.keyRoot) + degreeSemis(steps, d);
        const pad = document.createElement('button');
        pad.type = 'button';
        pad.tabIndex = -1;
        pad.className = `pad${d % 7 === 0 ? ' is-root' : ''}`;
        pad.dataset.offset = String(offset);
        pad.dataset.degree = String(d);
        pad.textContent = padName(d);
        pad.setAttribute('aria-label', padName(d));
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
        if (!pressedPointers.has(e.pointerId) || this._latchActive()) return; // Halten: nur Antippen
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
     * Mit manuellem Arpeggiator klingt die Taste nicht selbst, sondern
     * speist den Arp. (Mit "Halten" läuft das über _toggleLatched.)
     */
    _enterKey(id, keyEl, midi) {
      if (this._latchActive()) { this._toggleLatched(midi); this._wsNote(midi); return; }
      const prev = this.keyVoices.get(id);
      if (prev && prev.midi === midi) return;
      this._wsNote(midi);
      const arp = this._arpManual();
      if (prev) {
        this.keyVoices.delete(id);
        this.engine.releaseVoice(prev.voice);
        this._recNoteOff(id);
      }
      const entry = { keyEl, voice: null, midi };
      this.keyVoices.set(id, entry);
      this._recNoteOn(id, midi);
      this._paintHeld();
      (async () => {
        try { await this._ensureAudio(); } catch { this._setStatus(t('lab.statusNoAudioHere')); return; }
        if (this.keyVoices.get(id) !== entry) return;
        if (arp) { this._ensureArpClock(); return; }
        entry.voice = this.engine.playTone(this.state.sound, midi, this.engine.ctx.currentTime, .3, undefined,
          { layer: 'keys', stepSeconds: this._stepSeconds() });
      })();
    }

    /** "Halten": Antippen nimmt einen Ton in die Auswahl auf, erneutes
     *  Antippen nimmt ihn wieder heraus — Töne lassen sich so nacheinander
     *  sammeln, ohne dass ein neuer Anschlag alles zurücksetzt. Die
     *  Reihenfolge des Antippens bleibt erhalten (Richtung "Spielreihenfolge"). */
    _toggleLatched(midi) {
      if (this.latchedNotes.has(midi)) this.latchedNotes.delete(midi);
      else this.latchedNotes.add(midi);
      this._paintHeld();
      this.$('[data-action="arp-clear"]').hidden = !this.latchedNotes.size;
      (async () => {
        try { await this._ensureAudio(); } catch { this._setStatus(t('lab.statusNoAudioHere')); return; }
        this._ensureArpClock();
      })();
    }

    _releaseKey(id) {
      const held = this.keyVoices.get(id);
      if (!held) return;
      this.keyVoices.delete(id);
      if (held.voice) this.engine.releaseVoice(held.voice);
      this._recNoteOff(id);
      this._paintHeld();
    }

    /** Gedrückte und gemerkte Tasten markieren — in beiden Flächen. */
    _paintHeld() {
      const pressed = new Set();
      this.keyVoices.forEach((held) => pressed.add(held.midi));
      const latched = this._latchActive() ? this.latchedNotes : new Set();
      this.$all('.keyboard .key, .scale-pads .pad').forEach((el) => {
        const midi = this._midiForKey(el);
        el.classList.toggle('is-hot', pressed.has(midi) || latched.has(midi));
        el.classList.toggle('is-latched', latched.has(midi) && !pressed.has(midi));
      });
    }

    /** Nur die gerade gedrückten Tasten loslassen — die mit "Halten"
     *  gemerkten Töne bleiben (Layout-Wechsel, Arp/Halten umschalten). */
    _releasePressedKeys() {
      this.keyVoices.forEach((held, id) => { this.engine.releaseVoiceFast(held.voice); this._recNoteOff(id); });
      this.keyVoices.clear();
      this._pressedPointerSets?.forEach((set) => set.clear());
      this._paintHeld();
    }

    _releaseAllKeys() {
      this.keyVoices.forEach((held, id) => { this.engine.releaseVoiceFast(held.voice); this._recNoteOff(id); });
      this.keyVoices.clear();
      this.latchedNotes.clear();
      this._pressedPointerSets?.forEach((set) => set.clear());
      this._stopArpClock();
      this._paintHeld();
    }

    /* ---- Automation ----
       Reglerbewegungen im Klang-Reiter aufnehmen und im Takt loopen: nach
       einem Takt Einzählen wird jede Änderung eines Klang-Parameters mit
       ihrer Position (in Sechzehnteln) mitgeschrieben; daraus wird je
       Parameter eine Spur mit einem Wert pro Schritt (Wert hält bis zur
       nächsten Änderung). Filter-Cutoff und -Resonanz wirken auch auf
       klingende Töne, alles andere ab dem nächsten Ton. */

    _autoSnapshot() {
      const sound = this.state.sound;
      const snap = {};
      for (const key of Object.keys(SOUND_RANGES)) if (Number.isFinite(sound[key])) snap[key] = sound[key];
      return snap;
    }

    async _autoArm() {
      const a = this.autoRec;
      const barSteps = this._barSteps();
      a.barSteps = barSteps;
      a.events = [];
      a.startTime = 0;
      a.base = this._autoSnapshot();
      a.last = { ...a.base };
      if (!this.playing) {
        await this.start();
        if (!this.playing) return;
        a.startStep = barSteps;
      } else {
        let next = Math.ceil(this.globalStep / barSteps) * barSteps;
        if (next - this.globalStep < barSteps / 2) next += barSteps;
        a.startStep = next;
      }
      a.phase = 'armed';
      this._renderAutomation();
    }

    /** Aus _onSoundEdit: geänderte Parameter mit Position mitschreiben. */
    _autoCapture() {
      const a = this.autoRec;
      if (this._autoApplying || (a.phase !== 'armed' && a.phase !== 'recording')) return;
      const sound = this.state.sound;
      const pos = a.startTime && this.engine.ready ? (this._recNow() - a.startTime) / a.stepSec : -1;
      for (const key of Object.keys(a.last)) {
        if (sound[key] !== a.last[key] && Number.isFinite(sound[key])) {
          a.events.push({ pos, key, value: sound[key] });
          a.last[key] = sound[key];
        }
      }
    }

    _autoTick(now) {
      const a = this.autoRec;
      const heard = now - (this.engine.ctx.outputLatency || this.engine.ctx.baseLatency || 0);
      const startTime = a.startTime || this.nextStepTime + (a.startStep - this.globalStep) * this._stepSeconds();
      if (a.phase === 'armed') {
        const left = startTime - heard;
        const beats = METERS[this._meter()].beats.length;
        const beatSec = (a.barSteps / beats) * this._stepSeconds();
        this.$('.auto-count').textContent = left > 0 ? String(Math.min(beats, Math.ceil(left / beatSec))) : '';
        if (left <= 0 && a.startTime) { a.phase = 'recording'; this._renderAutomation(); }
        return;
      }
      const pos = clamp((heard - a.startTime) / (a.bars * a.barSteps * a.stepSec), 0, 1);
      Array.from(this.$('.auto-meter').children).forEach((seg, i) => {
        const fill = clamp(pos * a.bars - i, 0, 1);
        seg.firstChild.style.width = `${fill * 100}%`;
        seg.classList.toggle('is-full', fill >= 1);
      });
      if (pos >= 1) this._autoFinish();
    }

    _autoFinish() {
      const a = this.autoRec;
      if (a.phase === 'recording' && a.events.length) {
        const steps = a.bars * a.barSteps;
        const lanes = {};
        const keys = [...new Set(a.events.map((e) => e.key))];
        for (const key of keys) {
          const events = a.events.filter((e) => e.key === key).sort((x, y) => x.pos - y.pos);
          let value = a.base[key];
          let i = 0;
          lanes[key] = Array.from({ length: steps }, (_, step) => {
            while (i < events.length && events[i].pos < step + .5) value = events[i++].value;
            return value;
          });
        }
        this.state.automation = { on: true, bars: a.bars, steps, lanes, offset: mod(a.startStep, steps) };
        this._setStatus(t('lab.autoDone'));
      } else if (a.phase === 'recording') {
        this._setStatus(t('lab.autoEmpty'));
      }
      a.phase = 'idle';
      a.events = [];
      this._renderAutomation();
      this._wsSchedule();
    }

    /** Aus dem Scheduler: Spurwerte dieses Schritts setzen (zur Audio-Zeit). */
    _playAutomation(g, time) {
      if (this._offline) return; // Lasttest: Automation darf weder den Klang noch die Regler verstellen
      const auto = this.state.automation;
      if (!auto || !auto.on || this.autoRec.phase === 'recording' || this.autoRec.phase === 'armed') return;
      const idx = mod(g - auto.offset, auto.steps);
      const sound = this.state.sound;
      let changed = false;
      for (const [key, lane] of Object.entries(auto.lanes)) {
        if (sound[key] !== lane[idx]) { sound[key] = lane[idx]; changed = true; }
      }
      if (!changed) return;
      this._applySound();
      this.engine.modulateLive(SOUND_LAYERS, sound, time);
      // Regler sichtbar mitlaufen lassen — gebündelt, nicht jeden Schritt.
      if (this.ui.tab === 'sound' && !this._autoRefresh) {
        this._autoRefresh = global.setTimeout(() => {
          this._autoRefresh = 0;
          this._autoApplying = true;
          try { this._refreshSoundControls(); this._renderMacros(); } finally { this._autoApplying = false; }
        }, 120);
      }
    }

    _renderAutomation() {
      const a = this.autoRec;
      const auto = this.state.automation;
      const busy = a.phase === 'armed' || a.phase === 'recording';
      this._chips(this.$('.auto-bars'), [1, 2, 4].map((n) => ({ value: n, label: String(n) })), a.bars, 'auto-bars');
      this.$all('.auto-bars .chip').forEach((chip) => { chip.disabled = busy; });
      const btn = this.$('[data-action="auto-rec"]');
      btn.classList.toggle('is-live', busy);
      btn.querySelector('span').textContent = t(busy ? 'lab.recStop' : 'lab.autoRec');
      this.$('.auto-live').hidden = !busy;
      this.$('.auto-count').hidden = a.phase !== 'armed';
      this.$('.auto-status').textContent = a.phase === 'armed' ? t('lab.autoArmed') : a.phase === 'recording' ? t('lab.autoRecording') : '';
      const meter = this.$('.auto-meter');
      meter.hidden = a.phase !== 'recording';
      if (a.phase === 'recording') meter.innerHTML = Array.from({ length: a.bars }, (_, i) => `<span><i></i><b>${i + 1}</b></span>`).join('');
      const has = !!auto && !busy;
      this.$('.auto-result').hidden = !has;
      if (has) {
        const names = Object.keys(auto.lanes).map((key) => this._soundLabels[key] || key);
        this.$('.auto-params').textContent = tf(auto.bars === 1 ? 'lab.autoParamsOne' : 'lab.autoParams', { params: names.join(', '), bars: auto.bars });
        this._setSwitch('autoOn', auto.on);
      }
    }

    /* ---- Einspielen ----
       Aufnahme über die Groove-Uhr: Nach einem Takt Einzählen werden die
       gewählten Takte lang alle Tastenanschläge mit ihrer Audio-Zeit
       mitgeschrieben — ohne Raster. Beim Speichern wird jeder Ton in eine
       Stufe über dem Akkord umgerechnet, der an dieser Stelle klang (plus
       ♭/♯, falls er außerhalb der Tonart liegt); so verhält sich die
       Aufnahme wie jede andere Melodie und lässt sich im Editor bearbeiten. */

    /** Audio-Zeitpunkt, den man gerade HÖRT (Ausgabelatenz abgezogen). */
    _recNow() {
      const ctx = this.engine.ctx;
      return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
    }

    async _recArm() {
      const rec = this.rec;
      const barSteps = this._barSteps();
      rec.barSteps = barSteps;
      rec.notes = [];
      rec.open.clear();
      rec.take = null;
      rec.startTime = 0;
      if (!this.playing) {
        await this.start();
        if (!this.playing) return;
        rec.startStep = barSteps; // ein Takt Einzählen
      } else {
        // nächster Taktanfang, der noch mindestens einen halben Takt entfernt ist
        let next = Math.ceil(this.globalStep / barSteps) * barSteps;
        if (next - this.globalStep < barSteps / 2) next += barSteps;
        rec.startStep = next;
      }
      rec.phase = 'armed';
      this._renderRec();
    }

    _recTick(now) {
      const rec = this.rec;
      // Noch nicht vom Scheduler erreicht: Startzeit aus dem Raster schätzen.
      const startTime = rec.startTime || this.nextStepTime + (rec.startStep - this.globalStep) * this._stepSeconds();
      const heard = now - (this.engine.ctx.outputLatency || this.engine.ctx.baseLatency || 0);
      const total = rec.bars * rec.barSteps * rec.stepSec;
      if (rec.phase === 'armed') {
        const left = startTime - heard;
        const beats = METERS[this._meter()].beats.length;
        const beatSec = (rec.barSteps / beats) * this._stepSeconds();
        this.$('.rec-count').textContent = left > 0 ? String(Math.min(beats, Math.ceil(left / beatSec))) : '';
        if (left <= 0 && rec.startTime) { rec.phase = 'recording'; this._renderRec(); }
        return;
      }
      const pos = clamp((heard - rec.startTime) / total, 0, 1);
      if (pos >= 1) { this._recFinish(); return; }
      // Notenrolle live mitzeichnen (gehaltene Töne wachsen mit), etwa
      // zehnmal pro Sekunde — dazu Abspielmarke und Taktleiste.
      if (!rec.lastPaint || now - rec.lastPaint > .09) {
        rec.lastPaint = now;
        this._paintRecRoll(this._recToBars({ until: heard }), pos);
      } else {
        this._paintRecProgress(pos);
      }
    }

    _recNoteOn(id, midi) {
      const rec = this.rec;
      if (rec.phase !== 'armed' && rec.phase !== 'recording') return;
      if (!this.engine.ready) return;
      rec.open.set(id, { midi, t0: this._recNow() });
    }

    _recNoteOff(id) {
      const rec = this.rec;
      const open = rec.open.get(id);
      if (!open) return;
      rec.open.delete(id);
      rec.notes.push({ ...open, t1: this._recNow() });
    }

    _recFinish() {
      const rec = this.rec;
      if (rec.phase !== 'recording' && rec.phase !== 'armed') return;
      const end = rec.startTime + rec.bars * rec.barSteps * rec.stepSec;
      const now = this.engine.ready ? this._recNow() : end;
      rec.open.forEach((open) => rec.notes.push({ ...open, t1: Math.min(now, end) }));
      rec.open.clear();
      rec.take = rec.startTime ? this._recToBars() : null;
      rec.phase = rec.take && rec.take.some((bar) => bar.length) ? 'done' : 'idle';
      // Fertig: direkt im Loop weiterspielen (der Groove läuft ja noch).
      rec.loopBars = rec.phase === 'done' ? this._recRotated(rec.take) : null;
      rec.looping = rec.phase === 'done';
      if (rec.phase === 'idle') this._setStatus(t('lab.recEmpty'));
      this._renderRec();
    }

    /** Abspielmarke der loopenden Aufnahme (Takte in Aufnahme-Reihenfolge). */
    _showRecLoopStep(g) {
      const rec = this.rec;
      if (rec.phase !== 'done') return;
      const ph = this.$('.rec-roll .mel-playhead');
      if (!ph) return;
      if (!rec.looping) g = -1;
      const n = rec.take.length;
      const steps = rec.barSteps;
      ph.hidden = g < 0;
      if (g < 0) return;
      const k = mod(Math.floor(g / steps) - Math.round(rec.startStep / steps), n);
      ph.style.left = `${((k * steps + (g % steps)) / (n * steps)) * 100}%`;
    }

    /** Schwebender Play/Pause-Knopf über der Aufnahme: schaltet nur den
     *  Loop — der Groove läuft weiter (steht er, startet Play ihn mit). */
    _renderRecPlay() {
      const btn = this.$('.rec-play');
      if (!btn) return;
      const on = this.playing && this.rec.looping;
      btn.innerHTML = on ? UI_ICON.pause : UI_ICON.play;
      btn.setAttribute('aria-label', t(on ? 'lab.recLoopPause' : 'lab.recLoopPlay'));
      const ph = this.$('.rec-roll .mel-playhead');
      if (ph && !on) ph.hidden = true;
    }

    _toggleRecLoop() {
      const rec = this.rec;
      if (this.playing && rec.looping) {
        rec.looping = false;
        this.engine.releaseLayers(['melody']);
      } else {
        rec.looping = true;
        if (!this.playing) this.start();
      }
      this._renderRecPlay();
    }

    /** Aufnahme-Rolle zeichnen: Takte in Aufnahme-Reihenfolge. */
    _paintRecRoll(bars, pos) {
      this._paintMelRoll(this.$('.rec-roll'), bars.map((_, i) => i), false, bars);
      this._paintRecProgress(pos);
    }

    /** Abspielmarke in der Rolle und Taktleiste darunter: jeder Takt füllt
     *  sich, volle Takte sind markiert — so sieht man, wann Schluss ist. */
    _paintRecProgress(pos) {
      const rec = this.rec;
      const ph = this.$('.rec-roll .mel-playhead');
      if (ph) {
        ph.hidden = pos === null || pos >= 1;
        if (pos !== null) ph.style.left = `${pos * 100}%`;
      }
      const host = this.$('.rec-meter');
      if (host.children.length !== rec.bars) {
        host.innerHTML = Array.from({ length: rec.bars }, (_, i) => `<span><i></i><b>${i + 1}</b></span>`).join('');
      }
      Array.from(host.children).forEach((seg, i) => {
        const fill = pos === null ? 0 : clamp(pos * rec.bars - i, 0, 1);
        seg.firstChild.style.width = `${fill * 100}%`;
        seg.classList.toggle('is-full', fill >= 1);
        seg.classList.toggle('is-now', fill > 0 && fill < 1);
      });
    }

    /** Mitschrift → Takte aus [Schritt, Stufe, Länge, Vorzeichen?], in
     *  Aufnahme-Reihenfolge. `until`: noch gehaltene Töne bis hierhin. */
    _recToBars({ until = null } = {}) {
      const rec = this.rec;
      const all = until === null ? rec.notes : [...rec.notes, ...[...rec.open.values()].map((o) => ({ ...o, t1: until }))];
      return recNotesToBars(all, {
        startTime: rec.startTime, stepSec: rec.stepSec, bars: rec.bars, barSteps: rec.barSteps, meter: this._meter(),
        keyRoot: this.state.keyRoot, modeSteps: this._mode().steps, melodyOctave: this.state.melodyOctave,
      });
    }

    /** Melodie-Takt k klingt später im Groove-Takt (k mod Anzahl). Die
     *  Aufnahme begann im Groove-Takt startBar — also so drehen, dass jeder
     *  Takt wieder über dem Akkord landet, über dem er eingespielt wurde. */
    _recRotated(bars) {
      const startBar = Math.round(this.rec.startStep / this.rec.barSteps);
      return bars.map((_, k) => bars[mod(k - startBar, bars.length)].map((note) => [...note]));
    }

    _recSave() {
      const rec = this.rec;
      if (!rec.take) return;
      const s = this.state;
      const lib = this._saved.melodies;
      if (lib.length >= MEL_MAX_OWN) { this._setStatus(t('lab.melLibraryFull')); return; }
      let n = 1;
      while (lib.some((m) => m.name === tf('lab.recTakeN', { n }))) n++;
      const name = tf('lab.recTakeN', { n });
      const id = `m${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
      const bars = this._recRotated(rec.take);
      lib.push({ id, name, meter: this._meter(), bars, ref: 'key' });
      this._clearMelodyEdit();
      s.melodyBars = bars.map((bar) => bar.map((note) => [...note]));
      s.melodyMeter = this._meter();
      s.melodyName = name;
      s.melodyOwnId = id;
      s.melodyRef = 'key';
      s.melodyOn = true;
      rec.phase = 'idle';
      rec.take = null;
      this._persist();
      this._renderMelody();
      this._renderRec();
      this._setStatus(tf('lab.melSaved', { name }));
    }

    _renderRec() {
      const rec = this.rec;
      const phase = rec.phase;
      this._chips(this.$('.rec-bars'), [1, 2, 3, 4].map((n) => ({ value: n, label: String(n) })), rec.bars, 'rec-bars');
      this.$all('.rec-bars .chip').forEach((chip) => { chip.disabled = phase === 'armed' || phase === 'recording'; });
      const btn = this.$('[data-action="rec-toggle"]');
      const busy = phase === 'armed' || phase === 'recording';
      btn.classList.toggle('is-live', busy);
      btn.querySelector('span').textContent = t(busy ? 'lab.recStop' : 'lab.recStart');
      this.$('.rec-live').hidden = phase !== 'armed';
      this.$('.rec-status').textContent = phase === 'armed' ? t('lab.recArmed') : '';
      // Die Rolle steht ab dem Einzählen da und füllt sich beim Spielen.
      this.$('.rec-result').hidden = phase === 'idle';
      this.$('.rec-actions').hidden = phase !== 'done';
      if (phase === 'armed') this._paintRecRoll(Array.from({ length: rec.bars }, () => []), null);
      if (phase === 'recording') this._paintRecRoll(this._recToBars({ until: this._recNow() }), 0);
      if (phase === 'done') this._paintRecRoll(rec.take, 1);
      this.$('.rec-play').hidden = phase !== 'done';
      this._renderRecPlay();
    }

    /* ---- Verkabelung ---- */

    _wireControls() {
      this.shadowRoot.addEventListener('click', (event) => {
        // Ein Tipp außerhalb schließt das „⋯“-Menü.
        if (this.ui.dc.menu && !event.target.closest('.dc-menu-wrap')) { this.ui.dc.menu = false; this.ui.dc.revealAsk = false; this._renderDeconstruct(); }
        const target = event.target.closest('[data-action]');
        if (!target || target.disabled) return;
        this._handleAction(target.dataset.action, target.dataset.value, target);
      });

      this.shadowRoot.addEventListener('input', (event) => {
        const el = event.target;
        const s = this.state;
        if (el.classList.contains('bpm-input')) {
          this._setBpm(Number(el.value));
          this._onTempoChange();
        } else if (el.dataset.field === 'swing' || el.dataset.field === 'pump') {
          s[el.dataset.field] = Number(el.value);
          this.$(`[data-out="${el.dataset.field}"]`).textContent = `${Math.round(Number(el.value) * 100)} %`;
        } else if (el.dataset.kit) {
          s.kit[el.dataset.kit] = Number(el.value);
          this._renderKit();
        } else if (el.dataset.mix) {
          s.mix[el.dataset.mix] = Number(el.value);
          this._paintLevel(el);
          if (el.dataset.mix === 'master') this.engine.setMaster(s.mix.master);
          else this.engine.setBusLevel(el.dataset.mix, s.mute[el.dataset.mix] ? 0 : s.mix[el.dataset.mix]);
        } else if (el.classList.contains('prog-name')) {
          const name = el.value.trim().slice(0, 40);
          if (name && s.progOwnId) {
            s.progName = name;
            const own = this._saved.progressions.find((p) => p.id === s.progOwnId);
            if (own) own.name = name;
            this._renderPickerFor('prog');
          }
        } else if (el.classList.contains('mel-name')) {
          const name = el.value.trim().slice(0, 40);
          if (name && s.melodyOwnId) { s.melodyName = name; this._melCommit({ persist: false }); }
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
        else if (field === 'meter') this._handleAction('meter', el.value, el);
        else if (field === 'arpMode') s.arpMode = el.value;
        else if (field === 'arpDivision') s.arpDivision = Number(el.value);
        else if (field === 'arpRhythm') s.arpRhythm = el.value;
        else if (field === 'arpRef') s.arpRef = el.value;
        else if (field === 'arpPattern') s[s.arpAuto ? 'arpAutoPattern' : 'arpPattern'] = el.value;
        else if (field === 'arpOctaves') s.arpOctaves = Number(el.value);
        else if (field === 'echoDiv') { s.fx.echoDiv = Number(el.value); this.engine.setFx(s.fx, this._stepSeconds()); }
        else if (field === 'lfoSync') { s.sound.lfoSync = Number(el.value); this._onSoundEdit(); }
        else if (field === 'keyRoot') { s.keyRoot = Number(el.value); this._onHarmonyChange(); this._retuneDrone(); }
        else if (field === 'modeId') { s.modeId = el.value; this._onHarmonyChange(); }
        else if (el.dataset.choir === 'prog' && el.value) this._handleAction('pick-prog', el.value, el);
        else if (el.classList.contains('view-select')) this._applyView(el.value);
        else if (el.classList.contains('mel-name') || el.classList.contains('prog-name')) this._persist();
        else if (el.dataset.kit) { if (!this.playing) this._preview('kick', 1); }
        else if (el.dataset.switch) this._toggleSwitch(el.dataset.switch, el.checked);
        else if (el.dataset.smpOpt && this.sampler.rec) { this.sampler.rec[el.dataset.smpOpt] = el.checked; this._paintRecLevel(); }
        else if (el.dataset.smpDraft && this.sampler.draft) this.sampler.draft[el.dataset.smpDraft] = el.checked;
      });
      // Workshop: nach jeder Eingabe (nach den Handlern oben) die Teilziele
      // prüfen — höchstens einmal pro Frame.
      for (const type of ['click', 'input', 'change', 'pointerup', 'keyup']) {
        this.shadowRoot.addEventListener(type, () => { this._wsSchedule(); this._dcAutosave(); });
      }
      for (const type of ['pointerup', 'pointercancel']) this.shadowRoot.addEventListener(type, () => clearTimeout(this._padHold));
      this._wireMelGrid();
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
      if (key === 'latchOn' || key === 'arpOn' || key === 'arpAuto') {
        // Umschalten lässt nur die gedrückten Tasten los. "Halten" und die
        // gemerkten Töne bleiben erhalten (ruhen nur, solange der Arp aus
        // oder automatisch ist) und sind beim Wiedereinschalten wieder da.
        if (key === 'latchOn') this.ui.latchOn = on; else s[key] = on;
        this._releasePressedKeys();
        this._renderKeys();
        if (this._latchActive() && this.latchedNotes.size) {
          this._ensureAudio().then(() => this._ensureArpClock()).catch(() => {});
        }
        return;
      }
      if (key === 'liveWrite') { this.sampler.live = on; return; }
      if (key === 'mono') { s.sound.mono = on; this._onSoundEdit(); return; }
      if (key === 'autoOn') { if (s.automation) s.automation.on = on; this._renderAutomation(); return; }
      if (key === 'reverbOn' || key === 'echoOn' || key === 'chorusOn') {
        s.fx[key] = on;
        this.engine.setFx(s.fx, this._stepSeconds());
        this._renderFx();
        return;
      }
      if (key === 'melChroma') { this.ui.melChroma = on; this._renderMelEditor(); return; }
      if (key === 'progSevenths') { this._progBegin(); s.progSevenths = on; this._progCommit(); return; }
      if (key === 'progDominant') { this._progBegin(); s.progDominant = on; this._progCommit(); return; }
      if (key === 'chordAdd9') { this._pushHistory(); s.chordAdd9 = on; this._renderSatb(); return; }
      s[key] = on; // melodyOn, chordsOn
    }

    _handleAction(action, value, target) {
      const s = this.state;
      switch (action) {
        case 'close': this.close(); break;
        case 'view': this._applyView(value); break;
        case 'choir-task': this._applyChoirTask(value); break;
        case 'choir-part': {
          this.ui.choirPart = value;
          try { global.chorVoiceProfile?.set({ part: value }); } catch { /* ohne App */ }
          const task = CHOIR_TASKS.find((x) => x.id === s.choirTask);
          if (task?.own) this._applyChoirTask(task.id); else this._renderChoir();
          break;
        }
        case 'choir-groove': {
          this._pushHistory();
          if (value === 'none') { s.mute.drums = true; s.mute.bass = true; this._syncEngine(); this._renderChoir(); this._renderMixer(); break; }
          s.mute.drums = false; s.mute.bass = false;
          this._handleAction('pick-pattern', value, target);
          this._syncEngine();
          this._renderChoir();
          break;
        }
        case 'fade-drums': this._fadeDrums(!this.ui.drumsFaded); break;
        case 'ws-tier': this.ui.wsTier = value; this._renderWorkshop(); break;
        case 'ws-area': this.ui.wsArea = value; this._renderWorkshop(); break;
        case 'ws-lesson': this.ui.wsPicker = false; this._wsSelect(value); break;
        case 'ws-all': this.ui.wsPicker = !this.ui.wsPicker; this._renderWorkshop(); break;
        case 'ws-prev': { const prev = this._wsPrev(); if (prev) this._wsSelect(prev.id); break; }
        case 'ws-restart': if (this.ui.ws) this._wsSelect(this.ui.ws.lesson.id); break;
        case 'ws-next': { const next = this._wsNext(); if (next) this._wsSelect(next.id); break; }
        case 'ws-ab': this._wsToggleAb(); break;
        // de:construct
        case 'dc-level':
          this.ui.dc.level = DC_LEVELS.some((l) => l.id === value) ? value : 'easy';
          this.ui.dc.song = this._dcSuggest(this.ui.dc.level);
          this._renderDeconstruct();
          break;
        case 'dc-song': if (DC_SONGS.some((x) => x.id === value && x.level === this.ui.dc.level)) { this.ui.dc.song = value; this._renderDeconstruct(); } break;
        case 'dc-new':
          // Der laufende Song heißt „Weiter“: zurück zu ihm, ohne Neustart.
          if (this._saved.deconstruct?.song === this.ui.dc.song) { this.ui.dc.choosing = false; this._applyView('deconstruct'); } else this._dcNew(this.ui.dc.song);
          break;
        case 'dc-menu':
          this.ui.dc.menu = !this.ui.dc.menu;
          if (!this.ui.dc.menu) this.ui.dc.revealAsk = false;
          this._renderDeconstruct();
          if (this.ui.dc.menu) this.$('.dc-menu button:not([hidden])')?.focus();
          break;
        case 'dc-sheet-close': this._dcSheetClose(); break;
        case 'dc-sheet-next': this._dcSheetClose({ focus: false }); if (value) this._dcPick(value); this.$('.dc-check-btn')?.focus(); break;
        case 'dc-sheet-song': this._dcSheetClose({ focus: false }); this._handleAction('dc-choose', '', null); break;
        case 'dc-help-listen': this._dcHelpListen(value); break;
        case 'dc-help-reveal': this._dcHelpReveal(value); break;
        case 'dc-choose':
          this.ui.dc.menu = false;
          this.ui.dc.revealAsk = false;
          this.ui.dc.choosing = true;
          this.ui.dc.level = this._saved.deconstruct?.level || this.ui.dc.level;
          this.ui.dc.song = this._dcSuggest(this.ui.dc.level);
          this._applyView('deconstruct');
          this.$('.dc-intro [data-action="dc-new"]')?.focus();
          break;
        case 'dc-listen': this._dcListen(value); break;
        case 'dc-quick': this._dcListen(this.ui.dc.listen === 'orig' ? 'mine' : 'orig'); break;
        case 'dc-focus': this._dcFocus(value); break;
        case 'dc-pick': this._dcPick(value); break;
        case 'dc-check-active': this._dcCheck(this._dcActiveElement()); break;
        case 'dc-tpl': this.ui.dc.tpl = !this.ui.dc.tpl; this._renderDeconstruct(); break;
        case 'dc-clear-grid':
          this._confirm({ text: t('lab.dc.clearGridConfirm'), ok: t('lab.dc.clearGrid'), onOk: () => this._dcClearGrid() });
          break;
        case 'confirm-yes': { const onOk = this._confirmOk; this._closeConfirm(); onOk?.(); break; }
        case 'confirm-no': this._closeConfirm(); break;
        case 'beat-zoom': this._setBeatZoom(true); break;
        case 'beat-zoom-close': this._setBeatZoom(false); break;
        case 'dc-reveal': this._dcReveal(); break;
        case 'dc-adopt': this._dcAdopt(); break;
        case 'toggle-transport': if (this.playing) this.stop(); else this.start(); break;
        case 'randomize': this.randomize(); break;
        case 'undo': this.undo(); break;
        case 'tap-tempo': this._tapTempo(); break;
        case 'tab': this._setTab(target.dataset.tab); break;
        case 'lock': s.locks[target.dataset.lock] = !s.locks[target.dataset.lock]; this._renderLock(target.dataset.lock); break;
        case 'open-sheet': this._openSheet(); break;
        case 'overload': this._toggleOverloadPop(); break;
        case 'overload-close': this._toggleOverloadPop(false); break;
        case 'ovl-measure': this._measureLoad(); break;
        case 'ovl-copy': this._copyDiag(); break;
        case 'latency': this._setLatency(value); break;
        case 'picker-open': this._openPicker(target.dataset.picker); break;
        case 'picker-close': this._closePicker(); break;
        case 'picker-step': this._stepPicker(target.dataset.picker, Number(value)); break;
        case 'close-sheet': this._closeSheet(); break;

        // Beat
        case 'meter': {
          if (value === this._meter()) break;
          s.patternIndex = firstPatternOfMeter(value);
          s.beat = beatFromPattern(this._pattern());
          s.percSound = percOf(this._pattern());
          s.beatEdited = false;
          this._convertTempo();
          this._onTempoChange();
          this.ui.beatCat = 'all';
          this._ensureMelodyMeter();
          if (this.playing) this.globalStep = Math.ceil(this.globalStep / this._barSteps()) * this._barSteps();
          this._afterStateChange();
          break;
        }
        case 'beat-cat': this.ui.beatCat = value === this.ui.beatCat ? 'all' : value; this._renderBeat(); break;
        case 'pick-pattern': {
          const meterBefore = this._meter();
          s.patternIndex = Number(value);
          s.beat = beatFromPattern(this._pattern());
          s.percSound = percOf(this._pattern());
          s.beatEdited = false;
          if (this._meter() !== meterBefore) { this._convertTempo(); this._onTempoChange(); }
          // Loops mit eigener Swing-Vorgabe (Swing Soul) bringen sie mit.
          if (typeof this._pattern().swing === 'number') { s.swing = this._pattern().swing; }
          this._ensureMelodyMeter();
          if (this.playing && this._meter() !== meterBefore) this.globalStep = Math.ceil(this.globalStep / this._barSteps()) * this._barSteps();
          this._renderBeat(); this._renderMelody();
          break;
        }
        case 'cell':
          if (this._wsCh()?.kind === 'detective') this._wsChGuess(target.dataset.track, Number(target.dataset.step));
          else this._toggleCell(target.dataset.track, Number(target.dataset.step));
          break;
        case 'ws-go': this._wsChGo(); break;
        case 'ws-listen': this._wsChListen(value); break;
        case 'track-toggle': s.trackOn[value] = !s.trackOn[value]; this._renderTracks(); break;
        case 'reset-beat': {
          const reset = () => { this._pushHistory(); s.beat = beatFromPattern(this._pattern()); s.beatEdited = false; this._renderBeat(); };
          if (s.beatEdited) this._confirm({ text: t('lab.resetBeatConfirm'), ok: t('lab.resetBeat'), onOk: reset });
          else reset();
          break;
        }
        case 'kit-reset': this._pushHistory(); s.kit = { ...KIT_DEFAULTS }; this._renderKit(); if (!this.playing) this._preview('kick', 1); break;
        // Sampler (Paket 9)
        case 'smp-back': if (this.sampler.view === 'edit') this._editorFinish(false); else this._samplerGo('pads'); break;
        case 'smp-done': this._editorFinish(true); break;
        case 'smp-cancel': this._editorFinish(false); break;
        case 'smp-kit': this._pushHistory(); s.sampler.kitId = value; this.sampler.sel = 0; this._primeSamples(); this._renderSampler(); this._renderLive(); break;
        case 'smp-kit-new': {
          if (s.sampler.kits.length >= SAMPLER_MAX_KITS) break;
          this._pushHistory();
          let n = s.sampler.kits.length + 1;
          while (s.sampler.kits.some((k) => k.name === tf('lab.sampler.kitNewName', { n }))) n++;
          const id = `k${Date.now().toString(36)}`;
          s.sampler.kits.push({ id, name: tf('lab.sampler.kitNewName', { n }), pads: Array(SAMPLER_PADS).fill(null) });
          s.sampler.kitId = id; this.sampler.sel = 0;
          this._renderSampler(); this._renderLive();
          break;
        }
        case 'smp-kit-del': {
          const kit = s.sampler.kits.find((k) => k.id === s.sampler.kitId);
          if (!kit || s.sampler.kits.length < 2) break;
          this._confirm({ text: tf('lab.sampler.kitDeleteConfirm', { name: kit.name }), ok: t('lab.sampler.kitDelete'), onOk: () => {
            this._pushHistory();
            s.sampler.kits = s.sampler.kits.filter((k) => k !== kit);
            s.sampler.kitId = s.sampler.kits[0].id;
            this._renderSampler(); this._renderLive();
          } });
          break;
        }
        case 'smp-edit': { const id = this._kit().pads[this.sampler.sel]; if (id) this._openEditor(id); break; }
        case 'smp-to-beat':
          // Im Editor zuerst die Änderungen übernehmen (Schlag/Spur/Schnitt), dann ins Raster legen.
          if (this.sampler.view === 'edit' && this.sampler.draft) this._editorFinish(true).then(() => this._padToBeat(value));
          else this._padToBeat(value);
          break;
        case 'smp-record': {
          // Aufnahmen kommen auf das gewählte Pad; ist es belegt und noch eines frei, auf das erste freie.
          const pads = this._ownKit().pads;
          const free = pads.findIndex((id) => !id);
          if (pads[this.sampler.sel] && free >= 0) this.sampler.sel = free;
          this._samplerGo('record');
          break;
        }
        case 'smp-library': this._samplerGo('library'); break;
        case 'smp-lane-remove': this._laneRemove(Number(value)); break;
        case 'smp-rec-kind': if (this.sampler.rec && this.sampler.rec.phase === 'idle') { this.sampler.rec.kind = SAMPLE_KINDS.includes(value) ? value : 'hit'; this._renderSampler(); } break;
        case 'smp-rec-bars': if (this.sampler.rec && this.sampler.rec.phase === 'idle') { this.sampler.rec.bars = Number(value) === 2 ? 2 : 1; this._renderSampler(); } break;
        case 'smp-rec-toggle': if (this.sampler.rec?.phase === 'idle') this._smpRecStart(); else if (this.sampler.rec) this._smpRecStop(); break;
        case 'smp-listen': if (this.sampler.draft) this._auditionPad(this.sampler.draft.id, { meta: this.sampler.draft }); break;
        case 'smp-autocut': {
          const d = this.sampler.draft;
          const buffer = this.sampler.draftBuffer;
          if (!d || !buffer) break;
          const { start, end } = autoTrimBounds(buffer.getChannelData(0), buffer.sampleRate);
          d.trim = [Math.round(start * 1000) / 1000, Math.round(Math.min(end, start + SAMPLER_MAX_SEC[d.kind]) * 1000) / 1000];
          this._paintEditor();
          break;
        }
        case 'smp-reverse': { const d = this.sampler.draft; if (d) { d.reverse = !d.reverse; target?.setAttribute?.('aria-pressed', String(d.reverse)); } break; }
        case 'smp-kind': this._editorKind(value); break;
        case 'smp-tone-role': if (this.sampler.draft && SAMPLE_TONE_ROLES.includes(value)) { this.sampler.draft.toneRole = value; this._renderSampler(); } break;
        case 'smp-track': if (this.sampler.draft && SAMPLE_TRACKS.includes(value)) { this.sampler.draft.track = value; this._renderSampler(); } break;
        case 'smp-loop-bars': if (this.sampler.draft) { this.sampler.draft.loopBars = Number(value) === 2 ? 2 : 1; this._renderSampler(); } break;
        case 'smp-delete': {
          const d = this.sampler.draft;
          if (!d) break;
          this._confirm({ text: tf('lab.sampler.deleteConfirm', { name: d.name }), ok: t('lab.sampler.delete'), onOk: () => this._deleteSample(d.id) });
          break;
        }
        case 'smp-lib-listen': this._auditionPad(value); break;
        case 'smp-lib-use': this._assignPad(this.sampler.sel, value); this._primeSamples(); this._samplerGo('pads'); this._renderLive(); break;
        case 'lane-cell': this._toggleLaneCell(Number(target.dataset.lane), Number(target.dataset.step)); break;
        case 'lane-toggle': { const lane = s.sampleLanes[Number(value)]; if (lane) { lane.on = !lane.on; this._renderTracks(); } break; }
        case 'lane-preview': this._auditionPad(s.sampleLanes[Number(value)]?.padId); break;
        case 'drum-kit': this._pushHistory(); s.drumKit = DRUM_KITS.includes(value) ? value : 'auto'; this._renderBeat(); if (!this.playing) this._preview('snare', 1); break;
        case 'chord-voicing': this._pushHistory(); s.chordVoicing = value === 'pop' ? 'pop' : 'satb'; this._renderHarmony(); this._renderSatb(); break;
        case 'chord-sound': this._pushHistory(); s.chordSound = value === 'choir' ? 'choir' : 'synth'; this._syncEngine(); this._renderHarmony(); break;
        case 'fills': this._pushHistory(); s.fills = FILL_LENGTHS.includes(Number(value)) ? Number(value) : 0; this._renderBeat(); break;
        case 'bass-sound': s.bassSoundId = value; this._renderBeat(); if (!this.playing) this._preview('bass', 0); break;

        // Harmonie
        case 'prog-cat': this.ui.progCat = value === this.ui.progCat ? 'all' : value; this._renderHarmony(); break;
        case 'pick-prog': {
          this._clearProgEdit();
          const own = String(value).startsWith('own:') && this._saved.progressions.find((p) => `own:${p.id}` === value);
          if (own) {
            s.progDegrees = [...own.degrees];
            s.progSevenths = own.sevenths;
            s.progDominant = !!own.dominant;
            s.progDom7 = !!own.dom7;
            s.progAlter = own.alter ? [...own.alter] : null;
            s.progBass = own.bass ? [...own.bass] : null;
            s.progName = own.name;
            s.progOwnId = own.id;
          } else if (PROGRESSIONS.some((p) => p.id === value)) {
            s.progId = value;
            // Modale Folgen nur in passenden Modi (Befund 2): sonst den
            // Modus mitnehmen und das sagen, statt still vii° zu spielen.
            const prog = PROGRESSIONS.find((p) => p.id === value);
            const modeId = modeForProg(prog, s.modeId);
            if (modeId !== s.modeId) {
              s.modeId = modeId;
              this._setStatus(tf('lab.progModeSwitched', { name: t(progKey('Name', prog.id)), mode: t(MODES.find((m) => m.id === modeId).nameKey) }));
            }
          }
          this._onHarmonyChange();
          break;
        }
        case 'prog-edit': this.ui.progEdit = true; this.ui.progSel = 0; this._renderHarmony(); break;
        case 'prog-done': this.ui.progEdit = false; this._renderHarmony(); this.$('[data-action="prog-edit"]').focus(); break;
        case 'prog-slot':
          this.ui.progSel = Number(value);
          this._renderChordStrip(); this._renderProgEditor();
          this._previewChord(this._progression().degrees[this.ui.progSel], this.ui.progSel);
          break;
        case 'prog-deg': {
          const degrees = this._progBegin();
          degrees[this.ui.progSel] = Number(value);
          this._progCommit();
          this._previewChord(Number(value), this.ui.progSel);
          break;
        }
        // Akkord tauschen: normal | geliehen (aus der Gegen-Tonart) | Zwischendominante; Bass: Grundton | Terz | Quinte.
        case 'prog-alter': {
          const degrees = this._progBegin();
          s.progAlter[this.ui.progSel] = PROG_ALTERS.includes(value) ? value : null;
          this._progCommit();
          this._previewChord(degrees[this.ui.progSel], this.ui.progSel);
          break;
        }
        case 'prog-bass': {
          const degrees = this._progBegin();
          s.progBass[this.ui.progSel] = [1, 2].includes(Number(value)) ? Number(value) : 0;
          this._progCommit();
          this._previewChord(degrees[this.ui.progSel], this.ui.progSel);
          break;
        }
        case 'prog-add': {
          const degrees = this._progBegin();
          if (degrees.length < PROG_MAX_CHORDS) {
            degrees.splice(this.ui.progSel + 1, 0, degrees[this.ui.progSel]);
            s.progAlter.splice(this.ui.progSel + 1, 0, s.progAlter[this.ui.progSel]);
            s.progBass.splice(this.ui.progSel + 1, 0, s.progBass[this.ui.progSel]);
            this.ui.progSel++;
          }
          this._progCommit();
          break;
        }
        case 'prog-remove': {
          const degrees = this._progBegin();
          if (degrees.length > 1) { degrees.splice(this.ui.progSel, 1); s.progAlter.splice(this.ui.progSel, 1); s.progBass.splice(this.ui.progSel, 1); }
          this.ui.progSel = Math.max(0, this.ui.progSel - 1);
          this._progCommit();
          break;
        }
        case 'prog-move': {
          const to = this.ui.progSel + Number(value);
          const degrees = this._progBegin();
          if (to >= 0 && to < degrees.length) {
            for (const list of [degrees, s.progAlter, s.progBass]) [list[this.ui.progSel], list[to]] = [list[to], list[this.ui.progSel]];
            this.ui.progSel = to;
          }
          this._progCommit();
          break;
        }
        case 'prog-undo': this._progRestore(this.ui.progUndo, this.ui.progRedo); break;
        case 'prog-redo': this._progRestore(this.ui.progRedo, this.ui.progUndo); break;
        case 'prog-new':
          this._progBegin();
          s.progDegrees = [0];
          s.progSevenths = false;
          s.progDominant = false;
          s.progDom7 = false;
          s.progAlter = null; s.progBass = null;
          s.progName = t('lab.newProg');
          s.progOwnId = null;
          this.ui.progSel = 0;
          this._progCommit();
          break;
        case 'prog-original':
          this._progBegin();
          s.progDegrees = null; s.progSevenths = false; s.progDominant = false; s.progDom7 = false; s.progAlter = null; s.progBass = null;
          this._progCommit();
          break;
        case 'prog-save': this._progSaveOwn(); break;
        case 'prog-delete': this._progDeleteOwn(); break;
        case 'satb': s.satb[value] = { on: 'focus', focus: 'mute', mute: 'on' }[s.satb[value]]; this._renderSatb(); break;

        // Melodie
        case 'melody-cat': this.ui.melodyCat = value === this.ui.melodyCat ? 'all' : value; this._renderMelody(); break;
        case 'pick-melody': {
          this._clearMelodyEdit();
          const own = String(value).startsWith('own:') && this._saved.melodies.find((m) => `own:${m.id}` === value);
          if (own) {
            s.melodyBars = own.bars.map((bar) => bar.map((n) => [...n]));
            s.melodyMeter = own.meter;
            s.melodyName = own.name;
            s.melodyOwnId = own.id;
            s.melodyRef = own.ref === 'key' ? 'key' : 'chord';
          } else if (!String(value).startsWith('own:')) {
            s.melodyIndex = Number(value);
          }
          s.melodyOn = true;
          this._renderMelody();
          break;
        }
        case 'mel-edit': this.ui.melEdit = true; this.ui.melBar = 0; this._renderMelEditor(); this._scrollMelRoll(); break;
        case 'mel-done': this.ui.melEdit = false; this._renderMelEditor(); this.$('[data-action="mel-edit"]').focus(); break;
        case 'mel-bar': this.ui.melBar = Number(value); this._renderMelEditor(); this._scrollMelRoll(); break;
        case 'mel-add-bar': {
          const bars = this._melBegin();
          if (bars.length < MEL_MAX_BARS) { bars.push([]); this.ui.melBar = bars.length - 1; }
          this._melCommit();
          break;
        }
        case 'mel-remove-bar': {
          const bars = this._melBegin();
          if (bars.length > 1) bars.splice(this.ui.melBar, 1);
          this.ui.melBar = Math.max(0, this.ui.melBar - 1);
          this._melCommit();
          break;
        }
        case 'mel-undo': this._melRestore(this.ui.melUndo, this.ui.melRedo); break;
        case 'mel-redo': this._melRestore(this.ui.melRedo, this.ui.melUndo); break;
        case 'mel-new':
          this._melBegin();
          s.melodyBars = [[]];
          s.melodyMeter = this._meter();
          s.melodyName = t('lab.newMelody');
          s.melodyOwnId = null;
          s.melodyRef = 'chord';
          s.melodyOn = true;
          this.ui.melBar = 0;
          this._melCommit();
          break;
        case 'mel-original':
          this._melBegin();
          s.melodyBars = null; s.melodyMeter = null; s.melodyRef = 'chord';
          this._melCommit();
          break;
        case 'mel-len': this.ui.melLen = Number(value); this._renderMelEditor(); break;
        case 'mel-alt': this.ui.melAlt = Number(value); this._renderMelEditor(); break;
        case 'mel-save': this._melSaveOwn(); break;
        case 'rec-bars': this.rec.bars = Number(value); this._renderRec(); break;
        case 'auto-bars': this.autoRec.bars = Number(value); this._renderAutomation(); break;
        case 'auto-rec':
          if (this.autoRec.phase === 'idle') this._autoArm(); else this._autoFinish();
          break;
        case 'auto-clear': s.automation = null; this._renderAutomation(); break;
        case 'rec-toggle':
          if (this.rec.phase === 'armed' || this.rec.phase === 'recording') this._recFinish();
          else this._recArm();
          break;
        case 'rec-save': this._recSave(); break;
        case 'rec-loop': this._toggleRecLoop(); break;
        case 'rec-discard': this.rec.phase = 'idle'; this.rec.take = null; this._renderRec(); break;
        case 'mel-delete': this._melDeleteOwn(); break;
        case 'melody-octave': s.melodyOctave = Number(value); this._renderMelody(); break;

        // Mixer & Klang
        case 'mute':
          s.mute[value] = !s.mute[value];
          this.engine.setBusLevel(value, s.mute[value] ? 0 : s.mix[value]);
          this._renderMixer();
          break;
        case 'preset-cat': this.ui.presetCat = value === this.ui.presetCat ? 'all' : value; this._renderSound(); break;
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
        case 'arp-clear': this.latchedNotes.clear(); this._paintHeld(); this._renderKeys(); break;
        case 'keys-layout': this._releasePressedKeys(); s.keysLayout = value; this._renderKeys(); this._paintHeld(); break;
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
        if (!this.$('.confirm').hidden) this._closeConfirm();
        else if (this.ui.picker) this._closePicker();
        else if (!this.$('.dc-sheet').hidden) this._dcSheetClose();
        else if (!this.$('.ovl-pop').hidden) this._toggleOverloadPop(false);
        else if (this.ui.dc.menu) { this.ui.dc.menu = false; this.ui.dc.revealAsk = false; this._renderDeconstruct(); this.$('.dc-more')?.focus(); }
        else if (!this.$('.sheet').hidden) this._closeSheet();
        else if (this.ui.beatZoom) this._setBeatZoom(false);
        else this.close();
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
      if (this.ui.tab === 'sampler' && this.sampler.view === 'pads' && /^(Digit|Numpad)[1-8]$/.test(event.code)) {
        event.preventDefault();
        this._tapPad(Number(event.code.slice(-1)) - 1, { fromKey: true });
        return;
      }
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
      const scope = [this.$('.confirm-card'), this.$('.picker-card'), this.$('.sheet'), this.$('.dc-sheet-card')].find((el) => !el.closest('[hidden]')) || this.shadowRoot;
      const focusable = Array.from(scope.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, summary'))
        .filter((el) => el.offsetParent !== null || el === this.shadowRoot.activeElement)
        .filter((el) => scope !== this.shadowRoot || !el.closest('.sheet, .picker'));
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
      // Ohne sichtbaren Text, z. B. rechts oben im Panel-Kopf als An/Aus.
      const bareToggle = (key, labelKey) => `<label class="switch switch-bare"><input type="checkbox" role="switch" data-switch="${key}" aria-label="${t(labelKey)}"><span class="switch-track" aria-hidden="true"></span></label>`;
      // Erklärungen stecken hinter einem (?) neben der Überschrift und
      // klappen darunter auf — der Text steht nicht mehr dauerhaft im Weg.
      const help = (key) => `<button class="help-btn" type="button" data-action="help" data-help="${key}" aria-expanded="false" aria-label="${t('lab.helpAria')}">?</button>`;
      const helpText = (key) => `<p class="help-text" data-help-text="${key}" hidden>${t(`lab.${key}`)}</p>`;
      // Lupe: Beat-Editor bildschirmfüllend (Studio im Kopf, de:construct in der Werkzeugzeile).
      const zoomBtn = `<button class="zoom-btn" type="button" data-action="beat-zoom" aria-label="${t('lab.zoomAria')}" title="${t('lab.zoomAria')}">${UI_ICON.zoom}</button>`;
      // Aktuelle Auswahl mit ‹ › — ein Tipp auf die Mitte öffnet den Auswahl-Dialog.
      const pickerTrigger = (which) => `<div class="picker-trigger" data-picker="${which}">
        <button class="picker-step" type="button" data-action="picker-step" data-picker="${which}" data-value="-1" aria-label="${t('lab.prevAria')}">${UI_ICON.prev}</button>
        <button class="picker-main${which === 'melody' || which === 'prog' ? ' is-wide' : ''}" type="button" data-action="picker-open" data-picker="${which}" aria-haspopup="dialog">
          <span class="picker-ico"></span><span class="picker-text"><strong class="picker-name"></strong><span class="picker-sub"></span></span></button>
        <button class="picker-step" type="button" data-action="picker-step" data-picker="${which}" data-value="1" aria-label="${t('lab.nextAria')}">${UI_ICON.next}</button>
      </div>`;
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
    --warn: #a86a00;
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
  .lab-head-title { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; position: relative; }
  .ovl-btn {
    width: 26px; height: 26px; flex: 0 0 auto; border-radius: 50%; background: transparent; color: var(--muted);
    border: 1px solid var(--line); display: inline-flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: .95rem; line-height: 1; margin-top: .15em; padding: 0;
  }
  .ovl-btn .ovl-ico { width: 16px; height: 16px; }
  .ovl-btn.is-warn .ovl-ico, .ovl-btn:not(.is-warn) .ovl-bang { display: none; }
  .ovl-btn.is-warn { background: var(--bad); border-color: var(--bad); color: #fff; box-shadow: 0 0 0 3px rgba(224, 68, 90, .25); }
  .ovl-pop {
    position: absolute; top: calc(100% + 6px); left: 0; z-index: 20; width: min(92vw, 340px);
    background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px;
    box-shadow: 0 10px 30px rgba(36, 27, 61, .22); display: flex; flex-direction: column; gap: 8px; font-size: .82rem; line-height: 1.4;
  }
  .ovl-pop { max-height: calc(100vh - 90px); overflow-y: auto; }
  .ovl-pop p { margin: 0; }
  .ovl-pop .chip small { display: block; font-size: .62rem; font-weight: 600; color: var(--muted); }
  .ovl-diag { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; font-size: .74rem; }
  .ovl-diag dt { color: var(--muted); }
  .ovl-diag dd { margin: 0; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  .ovl-pop .ovl-test { font-weight: 700; }
  .ovl-pop .ovl-test.is-mid { color: var(--warn); }
  .ovl-pop .ovl-test.is-high { color: var(--bad); }
  .ovl-pop .ovl-note { color: var(--muted); }
  .ovl-pop .ovl-effect, .ovl-pop .ovl-measured { color: var(--muted); }
  .ovl-pop .ovl-max { color: var(--bad); font-weight: 700; }
  .ovl-pop .chip-row { margin: 0; }
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
  .chip-row + .chip-row { margin-top: 8px; }
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

  .preview { fill: currentColor; stroke: none; }

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
  .prog-alter-row { margin-top: 8px; }
  .voicing-chips, .chordsound-chips, .fill-chips, .kit-chips { margin-top: 8px; }
  .add9-row { margin-top: 8px; }
  /* Sampler (Paket 9) */
  .sampler-root { display: block; }
  .smp-panel { margin-bottom: 12px; }
  .smp-hint { margin: 6px 0 0; font-size: .74rem; color: var(--muted); line-height: 1.45; }
  .smp-warn { margin: 8px 0 0; padding: 8px 10px; border-radius: 12px; background: #fff0c4; color: #5c4400; font-size: .74rem; line-height: 1.45; }
  .smp-note { margin: 0 0 12px; padding: 8px 10px; border-radius: 12px; background: #fff0c4; color: #5c4400; font-size: .76rem; line-height: 1.45; }
  .smp-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .smp-title { flex: 1; margin: 0; font-size: 1.05rem; font-weight: 800; }
  .smp-back { width: 44px; height: 44px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); display: grid; place-items: center; }
  .smp-done { min-height: 44px; padding: 0 16px; border-radius: 12px; background: var(--accent); color: #fff; font-weight: 800; }
  .pad-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .pad-btn { --pad: var(--muted); position: relative; height: 92px; padding: 9px; border-radius: 16px; text-align: left; display: flex; flex-direction: column; justify-content: space-between;
    border: 0; background: color-mix(in srgb, var(--pad) 16%, var(--surface)); color: var(--text); box-shadow: inset 0 -3px 0 rgba(0,0,0,.06); touch-action: manipulation; user-select: none; -webkit-user-select: none; }
  .pad-btn.is-hit { --pad: #A78BFA; }
  .pad-btn.is-tone { --pad: #4ECDC4; }
  .pad-btn.is-loop { --pad: #6BCB77; }
  .pad-btn.is-factory { --pad: #c9a98c; }
  .pad-btn[aria-pressed="true"] { box-shadow: 0 0 0 3px var(--text); }
  .pad-btn[data-pressed] { transform: scale(.97); }
  .pad-btn.is-free { background: transparent; border: 1.5px dashed color-mix(in srgb, var(--accent) 45%, var(--line)); align-items: center; justify-content: center; gap: 4px; color: var(--accent); }
  .pad-btn.is-missing { border: 1.5px dashed var(--bad); background: transparent; }
  .pad-name { font-size: 1.05rem; font-weight: 800; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .pad-plus { font-size: 1.4rem; font-weight: 800; line-height: 1; }
  .pad-kind { font-size: .62rem; font-weight: 700; opacity: .85; }
  .pad-bars { display: flex; align-items: center; gap: 1.5px; height: 22px; }
  .pad-bars i { width: 2.5px; border-radius: 2px; background: var(--pad); }
  .smp-info { margin-top: 12px; padding: 12px; border-radius: 14px; background: var(--bg); border: 1px solid var(--line); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .smp-info-text { flex: 1; min-width: 140px; display: grid; gap: 2px; }
  .smp-info-text strong { font-size: .92rem; }
  .smp-info-text span { font-size: .74rem; color: var(--muted); }
  .smp-kit-del { margin-top: 8px; }
  .smp-source { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .smp-big { min-height: 52px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 14px; border: 1px solid var(--line); background: var(--bg); font-weight: 800; font-size: .88rem; }
  .smp-big.is-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .smp-ico svg { width: 18px; height: 18px; }
  .smp-lane-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; font-size: .82rem; }
  .smp-kinds { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .smp-kind { min-height: 84px; padding: 10px 8px; border-radius: 14px; border: 1px solid var(--line); background: var(--bg); text-align: left; display: grid; align-content: start; gap: 4px; }
  .smp-kind strong { font-size: .92rem; }
  .smp-kind span { font-size: .68rem; line-height: 1.35; color: var(--muted); }
  .smp-kind[aria-pressed="true"] { border: 2px solid var(--accent); background: rgba(var(--accent-rgb), .12); }
  .smp-live { width: 100%; height: 96px; border-radius: 14px; background: var(--text); display: block; }
  .smp-meter { position: relative; height: 8px; margin-top: 10px; border-radius: 4px; overflow: hidden; display: flex; background: var(--line); }
  .smp-meter i { display: block; height: 100%; }
  .smp-meter .low { width: 37.5%; background: #c9b9a8; }
  .smp-meter .good { width: 31%; background: #3f9a4a; }
  .smp-meter .high { flex: 1; background: #d9a300; }
  .smp-meter b { position: absolute; top: -2px; bottom: -2px; width: 3px; border-radius: 2px; background: var(--text); left: 0; }
  .smp-meter-ends { display: flex; justify-content: space-between; font-size: .66rem; color: var(--muted); margin-top: 4px; }
  .smp-level-state { font-size: .76rem; font-weight: 700; color: var(--muted); }
  .smp-level-state.is-good { color: #2c6a33; }
  .smp-level-state.is-high { color: #8a5a00; }
  .smp-opts { padding-top: 6px; padding-bottom: 6px; }
  .smp-opt { display: flex; align-items: center; gap: 12px; min-height: 52px; border-bottom: 1px solid var(--line); }
  .smp-opt:last-child { border-bottom: 0; }
  .smp-opt > span { flex: 1; display: grid; gap: 1px; }
  .smp-opt strong { font-size: .84rem; }
  .smp-opt span span { font-size: .72rem; color: var(--muted); }
  .smp-opt input[type="checkbox"] { width: 22px; height: 22px; accent-color: var(--accent); }
  .smp-rec-foot { display: grid; justify-items: center; gap: 8px; padding: 8px 0 16px; }
  .smp-rec-btn { width: 88px; height: 88px; border-radius: 50%; border: 6px solid color-mix(in srgb, var(--bad) 25%, #fff); background: var(--bad); display: grid; place-items: center; padding: 0; }
  .smp-rec-btn i { width: 30px; height: 30px; border-radius: 50%; background: #fff; transition: border-radius .15s; }
  .smp-rec-btn.is-on i { border-radius: 6px; }
  .smp-rec-label { font-size: .8rem; font-weight: 700; color: var(--muted); }
  .smp-wave { position: relative; height: 104px; border-radius: 14px; background: var(--text); overflow: hidden; touch-action: none; }
  .smp-wave canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .smp-shade { position: absolute; top: 0; bottom: 0; background: rgba(36,27,61,.72); pointer-events: none; }
  .smp-shade.is-start { left: 0; }
  .smp-trim { position: absolute; top: 0; bottom: 0; width: 28px; margin-left: -14px; cursor: ew-resize; touch-action: none; display: flex; justify-content: center; }
  .smp-trim::before { content: ""; width: 4px; background: var(--bg); border-radius: 2px; }
  .smp-trim::after { content: ""; position: absolute; width: 22px; height: 22px; border-radius: 6px; background: var(--bg); }
  .smp-trim.is-start::after { top: 4px; }
  .smp-trim.is-end::after { bottom: 4px; }
  .smp-tools { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .smp-seg { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 14px; background: var(--bg); border: 1px solid var(--line); }
  .smp-seg-btn { min-height: 40px; border-radius: 10px; font-weight: 800; font-size: .86rem; color: var(--muted); }
  .smp-seg-btn[aria-pressed="true"] { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(36,27,61,.18); }
  .smp-detected { margin-top: 12px; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, #4ECDC4 22%, var(--surface)); }
  .smp-detected strong { font-size: 1.3rem; }
  .smp-detected span { font-size: .74rem; line-height: 1.4; }
  .smp-sub { margin: 12px 0 6px; font-size: .68rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .smp-slider { display: grid; grid-template-columns: 96px 1fr 62px; align-items: center; gap: 10px; min-height: 46px; font-size: .82rem; font-weight: 700; }
  .smp-slider input { width: 100%; accent-color: var(--accent); }
  .smp-slider output { font-size: .74rem; color: var(--muted); text-align: right; font-weight: 400; }
  .smp-field { display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 10px; min-height: 48px; font-size: .82rem; font-weight: 700; }
  .smp-field input { min-height: 40px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); padding: 0 10px; }
  .smp-foot { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .chip.is-danger { color: var(--bad); border-color: var(--bad); }
  .smp-lib { display: grid; gap: 6px; margin-top: 8px; }
  .smp-lib-row { display: flex; gap: 8px; align-items: stretch; }
  .smp-lib-use { flex: 1; text-align: left; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg); display: grid; gap: 1px; }
  .smp-lib-use strong { font-size: .88rem; }
  .smp-lib-use span { font-size: .7rem; color: var(--muted); }
  .live-pads { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
  .live-pad { height: 72px; align-items: center; justify-content: center; }
  .live-switch { margin-left: auto; }
  .track-row.is-lane .track-name { color: #5b3fa8; }
  .track-row.is-lane .step-cell.is-hit { background: #A78BFA; }
  .track-row.is-lane .step-cell.is-hit::after { content: attr(data-label); font-size: .55rem; font-weight: 800; color: #fff; }
  .step-cell.is-missing { background: repeating-linear-gradient(45deg, var(--bad), var(--bad) 3px, transparent 3px, transparent 6px) !important; }
  .pick-more { grid-column: 1 / -1; margin-top: 4px; }
  .pick-more > summary { cursor: pointer; font-size: .82rem; font-weight: 700; color: var(--muted); padding: 8px 2px; }
  .pick-more-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .pick-chosen { color: var(--accent); font-weight: 700; }
  .sample-note { margin: 6px 0 0; font-size: .8rem; color: var(--muted); }
  .step-cell.is-fill { opacity: .4; box-shadow: inset 0 0 0 1px var(--accent); }

  /* Lupe (Beat-Editor bildschirmfüllend, _setBeatZoom) */
  .zoom-btn {
    width: 36px; height: 36px; flex: 0 0 auto; display: grid; place-items: center; padding: 0;
    border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--muted);
  }
  .zoom-btn svg { width: 18px; height: 18px; }
  .dc-tools .zoom-btn { width: 44px; height: 44px; margin-left: auto; flex-shrink: 0; }
  .zoom-head, .zoom-hint { display: none; }
  :host(.beat-zoom) .lab-head, :host(.beat-zoom) .tab-bar,
  :host(.beat-zoom) .lab-body > :not([data-tab-panel="beat"]),
  :host(.beat-zoom) [data-tab-panel="beat"] > :not(.beat-panel),
  :host(.beat-zoom) .beat-panel > .panel-head, :host(.beat-zoom) .beat-panel .kit-box, :host(.beat-zoom) .beat-panel .help-text,
  :host(.beat-zoom) .zoom-btn, :host(.beat-zoom) .dc-tools [data-action="dc-tpl"] { display: none !important; }
  :host(.beat-zoom) .lab-body { padding-top: max(10px, env(safe-area-inset-top)); }
  /* Kopfzeile: Überschrift · Werkzeuge (de:construct) · Fertig — alles Weitere volle Breite */
  :host(.beat-zoom) .beat-panel { margin: 0; padding: 0; border: 0; background: none; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; }
  :host(.beat-zoom) .beat-panel > * { grid-column: 1 / -1; }
  :host(.beat-zoom) .zoom-head { display: contents; }
  :host(.beat-zoom) .zoom-head h2 { grid-column: 1; grid-row: 1; }
  :host(.beat-zoom) .zoom-done { grid-column: 3; grid-row: 1; }
  :host(.beat-zoom) .dc-tools { grid-column: 2; grid-row: 1; margin: 0; justify-content: flex-end; }
  :host(.beat-zoom) .zoom-head h2 { font-size: .8rem; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin: 0; font-weight: 800; }
  :host(.beat-zoom) .zoom-done { min-height: 44px; padding: 0 18px; background: var(--accent); border-color: var(--accent); color: #fff; }
  :host(.beat-zoom) .track-list { gap: 12px; }
  :host(.beat-zoom) .track-row { grid-template-columns: 40px 54px 1fr 44px; gap: 8px; }
  :host(.beat-zoom) .track-roll { width: 40px; height: 40px; }
  :host(.beat-zoom) .track-name { font-size: .74rem; }
  :host(.beat-zoom) .track-toggle { padding: 12px 0; font-size: .66rem; }
  :host(.beat-zoom) .step-row { gap: 4px; }
  :host(.beat-zoom) .step-cell { height: clamp(34px, calc((100dvh - 250px) / 6 - 12px), 64px); border-radius: 8px; font-size: .74rem; }
  @media (orientation: portrait) {
    :host(.beat-zoom) .step-row { grid-template-columns: repeat(var(--half, 8), 1fr) !important; row-gap: 6px; }
    :host(.beat-zoom) .step-cell { height: 42px; }
    :host(.beat-zoom) .zoom-hint { display: block; margin: 0; font-size: .7rem; color: var(--muted); }
  }
  /* Quer auf dem Handy: alle sechs Spuren ohne Scrollen */
  @media (orientation: landscape) and (max-height: 520px) {
    :host(.beat-zoom) .lab-body { padding-top: max(6px, env(safe-area-inset-top)); padding-bottom: 6px; }
    :host(.beat-zoom) .beat-panel { row-gap: 6px; }
    :host(.beat-zoom) .zoom-done, :host(.beat-zoom) .dc-tools .chip { min-height: 36px; }
    :host(.beat-zoom) .track-list { gap: 6px; }
    :host(.beat-zoom) .track-roll { width: 30px; height: 30px; }
    :host(.beat-zoom) .track-toggle { padding: 7px 0; }
    :host(.beat-zoom) .step-cell { height: clamp(28px, calc((100dvh - 190px) / 6 - 6px), 64px); }
  }

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
  button.chord-box { font: inherit; color: inherit; cursor: pointer; }
  .chord-box.is-selected { border-color: var(--text); box-shadow: 0 0 0 1.5px var(--text) inset; }
  .prog-info { font-size: .7rem; color: var(--muted); margin: 8px 2px 0; line-height: 1.4; }
  .prog-info:empty { display: none; }
  .prog-editor { margin-top: 12px; border-top: 1px solid var(--line); padding-top: 10px; }
  .prog-count { margin-right: auto; font-size: .72rem; font-weight: 800; color: var(--muted); }
  .prog-degrees { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .prog-deg { display: grid; gap: 1px; padding: 6px 2px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); text-align: center; }
  .prog-deg span { font-size: .56rem; font-weight: 800; color: var(--muted); }
  .prog-deg strong { font-size: .72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .prog-deg[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
  .prog-deg[aria-pressed="true"] span { color: rgba(255,255,255,.85); }
  .prog-tools { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .prog-tools .chip svg { width: 14px; height: 14px; }
  .prog-tools .chip { display: inline-flex; align-items: center; gap: 4px; }

  .satb-list { display: grid; gap: 6px; }
  .satb-row.is-own .satb-name { font-weight: 800; }
  .view-switch { display: flex; gap: 4px; margin-left: auto; flex-wrap: wrap; justify-content: flex-end; }
  .view-switch .chip { min-height: 44px; }
  /* Drei Ansichten passen auf schmalen Bildschirmen nicht neben den Titel —
     dort steht statt der Knöpfe eine Auswahlliste in der Kopfzeile. */
  .view-select { display: none; min-height: 44px; margin-left: auto; font-size: .8rem; font-weight: 800; color: var(--accent); padding: 8px 10px; }
  @media (max-width: 560px) {
    .view-switch { display: none; }
    .view-select { display: block; }
  }
  .kit-box { margin-top: 10px; border-top: 1px solid var(--line); padding-top: 6px; }
  .kit-box summary { min-height: 44px; display: flex; align-items: center; font-size: .72rem; font-weight: 800; color: var(--muted); cursor: pointer; }
  .kit-box .slider-line { grid-template-columns: 96px 1fr 56px; }
  .kit-box .chip { min-height: 44px; }
  /* de:construct */
  .dc-view .chip { min-height: 44px; }
  .dc-panel { background: var(--surface); }
  .dc-title { margin: 0; font-size: 1.3rem; font-weight: 900; letter-spacing: -.02em; }
  .dc-title span { color: var(--accent); }
  .dc-title-small { font-size: 1rem; }
  .dc-lead { margin: 6px 0 0; font-size: .86rem; line-height: 1.45; color: #4a3f66; }
  .dc-steps { margin: 0 0 4px; padding-left: 1.3em; font-size: .78rem; line-height: 1.5; color: var(--text); }
  .dc-seg { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin-top: 12px; padding: 4px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; }
  .dc-seg button { min-height: 44px; border-radius: 12px; font-size: .86rem; font-weight: 700; color: #4a3f66; }
  .dc-seg button[aria-pressed="true"] { background: #d42f83; color: #fff; font-weight: 800; }
  .dc-prog-line { display: flex; align-items: center; gap: 10px; margin: 12px 2px 8px; }
  .dc-prog-label { font-size: .7rem; font-weight: 800; color: #6b6086; text-transform: uppercase; letter-spacing: .06em; }
  .dc-prog { flex: 1; height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; }
  .dc-prog-fill { height: 100%; width: 0; background: #1f7a4d; }
  .dc-prog-text { font-size: .78rem; font-weight: 700; color: #1f7a4d; font-variant-numeric: tabular-nums; }
  .dc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .dc-row { width: 100%; min-height: 58px; display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 16px; text-align: left; color: var(--text); background: var(--surface); border: 1px solid var(--line); }
  .dc-row[aria-pressed="true"] { background: #fde3f0; border: 2px solid #d42f83; padding: 5px 13px; }
  .dc-row-n { width: 26px; flex: none; font-size: .8rem; font-weight: 800; color: #6b6086; }
  .dc-row-main { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .dc-row-name { font-size: .94rem; font-weight: 700; overflow-wrap: anywhere; }
  .dc-row-tag { font-size: .74rem; color: #6b6086; }
  .dc-row-mark { flex: none; font-size: .75rem; font-weight: 700; color: #8a5a00; font-variant-numeric: tabular-nums; }
  .dc-row-mark.is-done { font-size: 1.1rem; font-weight: 800; color: #1f7a4d; }
  .dc-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .dc-how { margin-top: 10px; }
  .dc-how summary { min-height: 44px; display: flex; align-items: center; font-size: .78rem; font-weight: 800; color: #6b6086; cursor: pointer; }
  .dc-start { margin-top: 10px; }
  /* Auf hohen Bildschirmen bleibt der Startknopf unten stehen, auf niedrigen scrollt er mit. */
  @media (min-height: 700px) {
    .lab-body:has(.dc-intro:not([hidden])) { padding-bottom: 0; }
    .dc-panel:has(.dc-intro:not([hidden])) { margin-bottom: 0; border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
    .dc-start { position: sticky; bottom: 0; margin: 4px -14px -14px; padding: 12px 14px calc(14px + env(safe-area-inset-bottom)); background: var(--surface); border-top: 1px solid var(--line); }
  }
  .dc-start .dc-primary { width: 100%; justify-content: center; min-height: 56px; border-radius: 18px; background: #d42f83; font-size: 1rem; box-shadow: none; }
  .dc-start .dc-replace { margin: 0 2px 8px; text-align: center; }
  .dc-level-info, .dc-replace, .dc-tip, .dc-given, .dc-song-title { margin: 8px 2px 0; font-size: .74rem; line-height: 1.4; color: var(--muted); }
  .dc-replace { color: var(--bad); font-weight: 700; }
  .dc-song-title { margin-top: 2px; font-weight: 800; color: var(--text); }
  .dc-given { margin-top: 2px; }
  .dc-primary {
    min-height: 48px; padding: 0 20px 0 14px; border-radius: 999px; background: var(--accent); color: #fff;
    display: inline-flex; align-items: center; gap: 8px; font-size: .9rem; font-weight: 800;
    box-shadow: 0 6px 20px -8px rgba(var(--accent-rgb), .8);
  }
  .dc-primary svg { width: 20px; height: 20px; }
  .dc-head { display: flex; align-items: center; gap: 10px; position: relative; }
  .dc-head .dc-count { margin-left: auto; }
  .dc-menu-wrap { position: relative; }
  .dc-more { width: 44px; height: 44px; margin: -6px -8px -6px 0; border-radius: 14px; display: grid; place-items: center; color: #6b6086; }
  .dc-more[aria-expanded="true"] { background: var(--surface-2); }
  .dc-menu { position: absolute; right: 0; top: 100%; z-index: 4; min-width: 200px; padding: 6px; display: grid; gap: 2px;
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 14px 30px -12px rgba(36,27,61,.35); }
  .dc-menu-item { min-height: 44px; padding: 0 12px; border-radius: 10px; text-align: left; font-size: .86rem; font-weight: 700; color: var(--text); }
  .dc-menu-item:hover { background: var(--surface-2); }
  .dc-count { font-size: .74rem; font-weight: 800; color: var(--accent); white-space: nowrap; }
  /* Element-Leiste: eine Zeile Chips, Status als Symbol + Text, nie nur Farbe */
  .dc-elements { margin: 10px 0 0; display: grid; grid-template-columns: repeat(var(--dc-cols, 4), minmax(0, 1fr)); gap: 6px; }
  .dc-el { min-height: 52px; min-width: 0; padding: 4px 2px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface);
    color: var(--text); display: grid; place-items: center; align-content: center; gap: 1px; font: inherit; }
  .dc-el[aria-pressed="true"] { border: 2px solid #d42f83; background: #fde3f0; }
  .dc-mark { font-size: .95rem; font-weight: 900; line-height: 1; color: #6b6086; }
  .dc-el.is-ok .dc-mark { color: #1f7a4d; }
  .dc-el.is-near .dc-mark { color: #8a5a00; }
  .dc-el.is-no .dc-mark { color: #c0364a; }
  .dc-el-name { max-width: 100%; font-size: .74rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Hinweis-Karte des aktiven Elements */
  .dc-card { margin-top: 10px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 18px; background: var(--surface); display: grid; gap: 8px; }
  .dc-card p { margin: 0; }
  .dc-card-head { display: flex; align-items: center; gap: 8px; }
  .dc-card-name { font-size: .95rem; font-weight: 800; }
  .dc-card-state { font-size: .72rem; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: #6b6086; background: var(--surface-2); }
  .dc-card-state.is-ok { color: #1f7a4d; background: #dff3e8; }
  .dc-card-state.is-near { color: #8a5a00; background: #fff1cc; }
  .dc-card-state.is-no { color: #c0364a; background: #fde4e8; }
  .dc-card-hint { font-size: .86rem; line-height: 1.45; }
  .dc-card-tip, .dc-card-sub { font-size: .8rem; line-height: 1.45; color: #6b6086; }
  .dc-el-solution { display: grid; gap: 8px; font-size: .78rem; font-weight: 700; color: #9d1f60; font-variant-numeric: tabular-nums; word-break: break-word; padding: 10px 10px 12px; border: 1px dashed #d42f83; border-radius: 14px; background: #fff7ec; }
  .dc-sol-label { font-size: .66rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: #6b6086; }
  /* Mini-Raster: Original gegen Meine Version */
  .dc-mini { display: grid; gap: 5px; }
  .dc-mini-row { display: grid; grid-template-columns: 58px; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); column-gap: 6px; align-items: center; }
  .dc-mini-head { font-size: .66rem; font-weight: 700; color: #6b6086; }
  .dc-mini-name { font-size: .72rem; font-weight: 700; color: #4a3f66; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dc-mini-group { display: grid; grid-template-columns: repeat(var(--g, 4), minmax(0, 1fr)); gap: 2px; }
  .dc-cell { height: 24px; border-radius: 5px; background: #f3e4d6; display: flex; align-items: center; justify-content: center;
    font-size: .66rem; font-weight: 800; font-style: normal; box-sizing: border-box; color: #fff; }
  .dc-cell.is-beat { background: #ead6c4; }
  .dc-cell.is-ok { background: #241b3d; }
  .dc-cell.is-ok.is-ghost { background: #6b6086; }
  .dc-cell.is-miss { background: #fff; border: 2px dashed #d42f83; color: #9d1f60; }
  .dc-cell.is-extra { background: #f3c2ca; color: #c0364a; }
  .dc-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .72rem; font-weight: 600; color: #4a3f66; }
  .dc-legend-item { display: inline-flex; align-items: center; gap: 6px; }
  .dc-legend-item .dc-cell { width: 16px; height: 16px; border-radius: 4px; flex: 0 0 auto; font-size: .62rem; }
  .dc-legend-item .dc-cell.is-miss { border-width: 2px; }
  .dc-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(56px, 1fr)); gap: 6px; }
  .dc-tile { min-height: 54px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--line); display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .dc-tile strong { font-size: 1.05rem; font-weight: 800; color: var(--text); }
  .dc-tile span { font-size: .68rem; font-weight: 700; color: #6b6086; }
  .dc-sol-text { font-size: .8rem; }
  .dc-focus-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .dc-focus-label { font-size: .66rem; font-weight: 800; color: #6b6086; text-transform: uppercase; letter-spacing: .06em; }
  .dc-focus-row .chip-row { gap: 6px; }
  .dc-focus-row .chip { font-size: .74rem; padding: 0 12px; }
  .dc-next { margin-top: 4px; min-height: 44px; width: 100%; text-align: left; padding: 0 4px; font-size: .84rem; font-weight: 700; color: var(--text); }
  .dc-next::before { content: '→ '; color: #d42f83; font-weight: 900; }
  /* Tempo: großer Tap-Knopf */
  .dc-tap-box { display: grid; justify-items: center; gap: 10px; text-align: center; }
  .dc-tap { width: 132px; height: 132px; border-radius: 50%; border: 6px solid #fde3f0; background: #d42f83; color: #fff; font-size: 1.4rem; font-weight: 800;
    box-shadow: 0 0 0 8px rgba(212, 47, 131, .10); touch-action: manipulation; }
  .dc-tap:active { transform: scale(.97); }
  .dc-tap-bpm { font-size: 1.9rem; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  /* Prüfen in der Transportleiste (nur de:construct mit Song) */
  .dc-check-btn { display: none; min-height: 52px; max-width: 96px; padding: 0 12px; border-radius: 16px; background: #241b3d; color: #fff;
    font-size: .8rem; font-weight: 800; line-height: 1.15; text-align: center; }
  .transport-bar.is-dc-song .dc-check-btn { display: block; }
  .transport-bar.is-dc-song .tap-btn { display: none; }
  .transport-bar.is-dc-song .transport-row { grid-template-columns: auto minmax(0, 1fr) auto auto auto; }
  .transport-bar.is-dc-song .bpm-out { font-size: .9rem; }
  .transport-bar.is-dc-song .icon-btn { min-width: 44px; min-height: 44px; }
  /* Beat-Reiter in de:construct: schlank — Vorlage, Bass-/Kick-Klang eingeklappt oder weg */
  .dc-tools { display: none; }
  .is-dc .dc-tools { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0; }
  .is-dc .dc-tools .chip { min-height: 44px; }
  .dc-meter { display: none; }
  .is-dc.is-dc-hard .dc-meter { display: block; flex: 0 0 auto; min-height: 44px; border-radius: 999px; padding: 0 10px; font-weight: 700; color: var(--text); }
  /* Werkzeugzeile bleibt einzeilig: Texte kürzen sich, die Lupe bleibt rechts */
  .is-dc .dc-tools { flex-wrap: nowrap; }
  .is-dc .dc-tools .chip { flex: 0 1 auto; min-width: 0; padding: 6px 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .is-dc .dc-tpl-panel, .is-dc .dc-bass-panel, .is-dc .reset-beat, .is-dc .dc-pattern-head { display: none; }
  .is-dc.is-dc-tpl .dc-tpl-panel { display: block; }
  .is-dc:not(.is-dc-hard) .kit-box { display: none; }
  .dc-all-done { margin: 10px 0 0; padding: 10px 12px; border-radius: 12px; background: rgba(var(--accent-rgb), .14); border: 2px solid var(--accent); font-size: .8rem; font-weight: 700; line-height: 1.45; }
  /* Nur für Screenreader — sichtbar steht das Ergebnis schon am Element. */
  .dc-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; margin: 0; }
  .dc-solution { margin-top: 10px; padding: 10px 12px; border-radius: 12px; border: 1px dashed var(--accent); font-size: .76rem; line-height: 1.45; }
  .dc-solution p { margin: 0 0 8px; }
  .dc-menu .dc-reveal.is-ask { color: #c0364a; background: #fde4e8; }
  /* Prüf-Blatt: unten im Lab, über der Transportleiste (Höhe per --dc-bar-h) */
  .confirm { position: absolute; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(36,27,61,.38); }
  .confirm-card { width: min(100%, 340px); background: var(--surface); border-radius: 20px; padding: 18px; box-shadow: 0 12px 40px rgba(36,27,61,.3); }
  .confirm-text { margin: 0 0 16px; font-size: .9rem; font-weight: 700; line-height: 1.4; }
  .confirm-row { display: flex; justify-content: flex-end; gap: 8px; }
  .confirm-row .chip { min-height: 44px; padding: 0 16px; font-size: .78rem; }
  .confirm-yes { background: var(--accent); border-color: var(--accent); color: #fff; }
  .dc-sheet { position: absolute; left: 0; right: 0; top: 0; bottom: var(--dc-bar-h, 0px); z-index: 6; display: flex; align-items: flex-end; justify-content: center; }
  .dc-sheet-backdrop { position: absolute; inset: 0; background: rgba(36,27,61,.38); }
  .dc-sheet-card { position: relative; width: 100%; max-width: 520px; max-height: 92%; overflow-y: auto; display: grid; gap: 14px; background: var(--surface);
    border-radius: 26px 26px 0 0; padding: 10px max(18px, env(safe-area-inset-right)) 18px max(18px, env(safe-area-inset-left)); box-shadow: 0 -14px 40px -16px rgba(36,27,61,.4); }
  .dc-sheet-card:focus { outline: none; }
  .dc-sheet-grab { width: 40px; height: 5px; border-radius: 3px; background: var(--line); justify-self: center; }
  .dc-sheet-head { display: flex; align-items: center; gap: 12px; }
  .dc-sheet-mark { width: 40px; height: 40px; flex: 0 0 auto; border-radius: 50%; display: grid; place-items: center; font-size: 1.25rem; font-weight: 800; }
  .dc-sheet-mark.is-ok { background: #dff3e8; color: #1f7a4d; }
  .dc-sheet-mark.is-near { background: #fff1cc; color: #8a5a00; }
  .dc-sheet-mark.is-no { background: #fde4e8; color: #c0364a; }
  .dc-sheet-heads { display: grid; gap: 2px; min-width: 0; }
  .dc-sheet-title { margin: 0; font-size: 1.12rem; font-weight: 800; }
  .dc-sheet-sub { margin: 0; font-size: .82rem; color: #6b6086; }
  .dc-parts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .dc-part { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; border: 1px solid; min-width: 0; }
  .dc-part.is-ok { border-color: #cfe8da; background: #effaf3; }
  .dc-part.is-near { border-color: #f0dca4; background: #fff8e1; }
  .dc-part.is-no { border-color: #f3c2ca; background: #fff0f2; }
  .dc-part-mark { width: 28px; height: 28px; flex: 0 0 auto; border-radius: 50%; display: grid; place-items: center; font-size: .95rem; font-weight: 800; color: #fff; }
  .dc-part.is-ok .dc-part-mark { background: #1f7a4d; }
  .dc-part.is-near .dc-part-mark { background: #8a5a00; }
  .dc-part.is-no .dc-part-mark { background: #c0364a; }
  .dc-part-text { display: grid; min-width: 0; }
  .dc-part-name { font-size: .88rem; font-weight: 700; }
  .dc-part-sub { font-size: .74rem; color: #6b6086; }
  .dc-vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .dc-sheet-hint { margin: 0; font-size: .88rem; line-height: 1.45; }
  .dc-help { display: grid; gap: 10px; padding: 12px 14px; border: 1px dashed #d9b9a2; border-radius: 16px; background: var(--bg); }
  .dc-help-title { font-size: .8rem; font-weight: 700; color: #4a3f66; }
  .dc-help-btns { display: flex; flex-wrap: wrap; gap: 8px; }
  .dc-help-btns .chip { min-height: 44px; color: #4a3f66; font-weight: 700; }
  .dc-sheet-main { min-height: 54px; border-radius: 18px; background: #241b3d; color: #fff; font-size: 1rem; font-weight: 800; }
  .dc-sheet-close { min-height: 44px; border-radius: 14px; font-size: .9rem; font-weight: 700; color: #4a3f66; }
  .dc-quick {
    min-width: 52px; height: 44px; padding: 0 8px; border-radius: 13px; border: 2px solid var(--accent); background: var(--surface);
    color: var(--accent); display: grid; place-items: center; line-height: 1; gap: 1px;
  }
  .dc-quick b { font-size: .95rem; font-weight: 900; }
  .dc-quick span { font-size: .56rem; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; }
  .dc-quick[aria-pressed="true"] { background: var(--accent); color: #fff; }
  /* Während das Original klingt: ein Rand um die Transportleiste — man
     soll beim Bauen nie raten müssen, was man gerade hört. */
  .transport-bar.is-dc-orig { box-shadow: inset 0 3px 0 var(--accent); }
  /* Workshop */
  .workshop-view .chip { min-height: 44px; }
  .ws-progress { margin: 8px 2px; font-size: .72rem; font-weight: 800; color: var(--muted); }
  .ws-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .ws-where { min-width: 0; font-size: .7rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .ws-all-btn { flex: none; min-height: 44px; display: inline-flex; align-items: center; gap: 4px; padding: 0 2px 0 8px; font-size: .78rem; font-weight: 800; color: var(--accent); }
  .ws-all-btn[aria-expanded="true"] .ws-caret { transform: rotate(180deg); }
  .ws-dots { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin: 0 2px 4px; }
  .ws-dots i { width: 9px; height: 9px; border-radius: 999px; background: var(--line); }
  .ws-dots i.is-done { background: var(--accent); opacity: .45; }
  .ws-dots i.is-now { width: 24px; background: var(--accent); }
  .ws-picker { margin: 6px 0 4px; padding-top: 8px; border-top: 1px solid var(--line); }
  .ws-actions .ws-next { margin-left: auto; background: var(--accent); border-color: var(--accent); color: #fff; }
  .ws-areas { margin-bottom: 8px; }
  .ws-lessons { margin-top: 4px; }
  .ws-lesson { display: inline-flex; align-items: center; gap: 5px; }
  .ws-tick { font-weight: 900; color: var(--accent); }
  .ws-card { margin-top: 12px; padding: 12px 14px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); }
  .ws-title { display: block; font-size: 1rem; }
  .ws-do { margin: 6px 0 8px; font-size: .82rem; line-height: 1.45; }
  .ws-checks { list-style: none; margin: 0 0 8px; padding: 0; display: grid; gap: 6px; }
  .ws-check { display: flex; align-items: center; gap: 8px; font-size: .8rem; font-weight: 700; }
  .ws-box { width: 22px; height: 22px; flex: 0 0 auto; border: 2px solid var(--muted); border-radius: 6px; display: grid; place-items: center; font-size: .8rem; font-weight: 900; }
  .ws-check.is-reached .ws-box { border-color: var(--accent); background: rgba(var(--accent-rgb), .16); color: var(--accent); }
  .ws-check.is-reached .ws-check-text { text-decoration: line-through; color: var(--muted); }
  .ws-why summary { font-size: .76rem; font-weight: 800; color: var(--muted); cursor: pointer; min-height: 44px; display: flex; align-items: center; }
  .ws-why p { margin: 0 0 8px; font-size: .76rem; line-height: 1.45; }
  .ws-aha { margin: 8px 0; padding: 10px 12px; border-radius: 12px; background: rgba(var(--accent-rgb), .14); border: 2px solid var(--accent); font-size: .82rem; line-height: 1.45; }
  .ws-aha strong { color: var(--accent); }
  .ws-tour-done { margin: 8px 0; font-size: .8rem; font-weight: 700; line-height: 1.45; }
  .ws-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .ws-ab { display: inline-flex; padding: 0; overflow: hidden; }
  .ws-ab span { padding: 0 12px; display: grid; place-items: center; }
  .ws-ab span.is-on { background: var(--accent); color: #fff; }
  .ws-ab-hint, .ws-to-studio { margin: 8px 0 0; font-size: .7rem; color: var(--muted); }
  .ws-ab-hint { font-weight: 800; color: var(--text); }
  .ws-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; margin: 0; }
  .ws-ch { margin: 10px 0; padding: 10px 12px; border-radius: 12px; border: 1px dashed var(--line); }
  .ws-ch-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: .78rem; font-weight: 800; }
  .ws-ch-badge { min-width: 64px; min-height: 64px; border-radius: 16px; display: grid; place-items: center; font-size: 2.2rem; border: 3px solid var(--text); }
  .ws-ch-badge.is-b { background: var(--text); color: var(--surface); }
  .ws-listen { margin: 8px 0; }
  .ws-ch-score, .ws-ch-result { margin: 8px 0; font-size: .9rem; font-weight: 800; }
  .ws-ch-msg { margin: 6px 0; font-size: .8rem; font-weight: 700; min-height: 1.2em; }
  .ws-ch-params { margin-top: 8px; }
  .ws-ch-params .is-fit .ws-box { border-color: var(--accent); color: var(--accent); }
  .ws-go { font-size: .86rem; padding: 8px 22px; background: var(--accent); border-color: var(--accent); color: #fff; }
  .track-row.ws-hint { outline: 3px dashed var(--text); outline-offset: 2px; border-radius: 8px; animation: ws-blink 1s steps(2, start) infinite; }
  @keyframes ws-blink { 50% { outline-color: transparent; } }
  .ws-dim { opacity: .35; }
  .ws-hide { display: none !important; }
  .ws-focus { outline: 2px dashed rgba(var(--accent-rgb), .8); outline-offset: 3px; border-radius: 10px; }
  .step-cell.ws-from { border: 2px dashed var(--text); }
  .step-cell.ws-to { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--text); animation: ws-pulse 1.1s ease-in-out infinite; }
  @keyframes ws-pulse { 50% { box-shadow: 0 0 0 2px var(--surface), 0 0 0 6px rgba(var(--accent-rgb), .6); } }
  .choir-view .chip-row .chip { min-height: 40px; }
  .task-card { margin-top: 10px; padding: 10px 12px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); }
  .task-card strong { display: block; font-size: .9rem; }
  .task-card p { margin: 4px 0 0; font-size: .78rem; line-height: 1.45; }
  .choir-part { margin-top: 8px; }
  .choir-now { display: grid; justify-items: center; gap: 2px; text-align: center; }
  .choir-now-label { font-size: .62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
  .choir-now-chord { font-size: 2.6rem; line-height: 1.1; }
  .choir-now-target { font-size: 1.15rem; font-weight: 800; color: var(--accent); min-height: 1.3em; }
  .choir-display { margin-top: 10px; }
  .scale-row, .beat-fields { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  .scale-note { display: grid; justify-items: center; min-width: 36px; padding: 6px 4px; border-radius: 10px; background: var(--surface); border: 1px solid var(--line); }
  .scale-note small { font-size: .62rem; color: var(--muted); }
  .scale-note.is-now { background: var(--accent); border-color: var(--accent); color: #fff; font-size: 1.2rem; }
  .scale-note.is-now small { color: #fff; }
  .beat-field { min-width: 52px; min-height: 44px; display: grid; place-items: center; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); font-weight: 800; }
  .beat-field.is-clap { border-color: var(--accent); color: var(--accent); }
  .beat-field.is-now { background: var(--accent); color: #fff; }
  .vp-grid { display: grid; gap: 4px; overflow-x: auto; }
  .vp-row { display: grid; grid-template-columns: 40px repeat(16, minmax(14px, 1fr)); gap: 2px; align-items: center; }
  .vp-name { font-weight: 800; font-size: .72rem; }
  .vp-cell { height: 26px; border-radius: 5px; background: var(--surface); font-size: .55rem; font-weight: 800; display: grid; place-items: center; }
  .vp-cell.is-on { background: rgba(var(--accent-rgb), .25); }
  .vp-cell.is-now { outline: 2px solid var(--accent); }
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

  .arp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .arp-grid .arp-pattern { grid-column: span 2; }
  .arp-status { margin: 0 0 10px; font-size: .72rem; font-weight: 700; color: var(--accent); min-height: 1em; }
  .arp-clear { margin-top: 12px; }

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
  /* Effekte: Hall und Chorus nebeneinander, Echo darunter in einer Zeile;
     jeder Block mit eigenem An/Aus rechts oben, Regler etwas kleiner. */
  .fx-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .fx-group { border: 1px solid var(--line); border-radius: 14px; background: var(--surface); padding: 8px 10px 10px; transition: opacity .15s; }
  .fx-group.is-wide { grid-column: 1 / -1; }
  .fx-group.is-off .knob-row, .fx-group.is-off .fx-echo-time { opacity: .4; }
  .fx-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px; }
  .fx-head .sub-label { margin: 0; }
  .fx-head .switch-track { transform: scale(.85); transform-origin: right center; }
  .fx-groups .knob-row { gap: 6px; }
  .fx-groups .knob-field { width: 50px; }
  .fx-groups .knob { width: 40px; height: 40px; }
  .fx-echo-row { display: flex; align-items: flex-end; gap: 10px; }
  .fx-echo-time { flex: 1; min-width: 0; margin-bottom: 4px; }

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

  .picker-trigger { display: flex; align-items: stretch; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); overflow: hidden; }
  .picker-step { flex: 0 0 42px; display: grid; place-items: center; color: var(--muted); }
  .picker-step svg { width: 20px; height: 20px; }
  .picker-step:active { background: var(--surface-2); }
  .picker-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 9px 8px; text-align: left; border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
  .picker-ico { flex: 0 0 auto; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; background: rgba(var(--accent-rgb), .12); color: var(--accent); }
  .picker-main.is-wide .picker-ico { width: 64px; padding: 0 7px; }
  .picker-ico .preview, .pick-ico .preview { width: 100%; height: 20px; }
  .picker-text { min-width: 0; display: grid; }
  .picker-name { font-size: .88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .picker-sub { font-size: .66rem; color: var(--muted); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .reset-sound-row { margin-top: 8px; }
  .reset-sound-row:has([hidden]) { display: none; }

  .mel-card { margin-top: 10px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); padding: 10px; }
  .mel-mini, .mel-grid { position: relative; overflow: hidden; background: var(--surface); }
  .mel-mini { height: 80px; border-radius: 10px; }
  .mel-row { position: absolute; left: 0; right: 0; }
  .mel-row.is-root { background: rgba(var(--accent-rgb), .07); }
  .mel-grid .mel-row.is-chord { background: rgba(var(--accent-rgb), .04); }
  .mel-grid .mel-row.is-outer { background-color: rgba(140,129,166,.07); }
  .mel-grid .mel-row.is-outer.is-root { background: rgba(var(--accent-rgb), .07); }
  .mel-grid .mel-row { border-top: 1px solid rgba(241,221,208,.7); }
  .mel-grid .mel-row.is-split { border-top: 2px solid #d9bfae; }
  .mel-line { position: absolute; top: 0; bottom: 0; width: 1px; background: #f6ebe2; }
  .mel-line.is-beat { background: #ead6c8; }
  .mel-line.is-bar { width: 2px; background: #d9bfae; }
  .mel-note { position: absolute; border-radius: 5px; background: var(--accent); box-shadow: inset 0 -2px 0 rgba(0,0,0,.12); pointer-events: none;
    display: flex; align-items: center; padding-left: 3px; color: #fff; font-size: .62rem; }
  .mel-note { border: 1px solid var(--surface); }
  .mel-note.is-alt { background: #8c6bf0; }
  .mel-mini .mel-note { border-radius: 3px; box-shadow: none; }
  .mel-playhead { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: rgba(36,27,61,.55); pointer-events: none; }
  .mel-edit-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-size: .74rem; font-weight: 800; color: var(--accent); }
  .mel-edit-link svg { width: 16px; height: 16px; }
  .mel-top { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
  .mel-bars { display: flex; gap: 4px; flex-wrap: wrap; margin-right: auto; }
  .mel-bar-tab { min-width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--line); font-size: .74rem; font-weight: 800; color: var(--muted); background: var(--surface-2); }
  .mel-bar-tab[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
  .mel-bar-tab.is-extra { background: var(--surface); font-size: .9rem; }
  .mel-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 11px; border: 1px solid var(--line); background: var(--surface-2); color: var(--text); }
  .mel-icon svg { width: 18px; height: 18px; }
  /* Die Rolle zeigt ~12 der 21 Zeilen; gescrollt wird über die Leiste links
     (bzw. Mausrad) — das Raster selbst zeichnet und scrollt deshalb nicht. */
  .mel-roll { display: grid; grid-template-columns: 30px 1fr; gap: 4px; height: 256px; overflow-y: auto; overscroll-behavior: contain;
    border-radius: 10px; scrollbar-width: thin; }
  .mel-grid { border-radius: 10px; border: 1px solid var(--line); touch-action: none; user-select: none; -webkit-user-select: none; cursor: crosshair; }
  .mel-labels { position: relative; display: grid; grid-auto-rows: 1fr; padding: 1px 0; border-radius: 10px; background: var(--surface-2);
    touch-action: pan-y; cursor: ns-resize; }
  .mel-labels span { display: grid; place-items: center end; padding-right: 4px; font-size: .64rem; font-weight: 800; color: var(--muted); }
  .mel-labels span.is-chord { color: var(--accent); }
  .mel-labels span.is-outer { opacity: .7; }
  .mel-band { position: absolute !important; left: 3px; width: 8px; border: 1.5px solid #cbbfd8; border-right: 0; border-radius: 4px 0 0 4px; padding: 0 !important; }
  .mel-band i { position: absolute; left: 5px; top: 50%; transform: translate(-50%, -50%) rotate(-90deg); font-size: .5rem; font-style: normal; font-weight: 800; color: var(--muted); background: var(--surface-2); padding: 0 2px; text-transform: uppercase; letter-spacing: .04em; }
  .mel-tools { margin-top: 4px; }
  .mel-chroma { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
  .mel-alts .chip { min-width: 36px; text-align: center; font-size: .82rem; }
  .mel-name-row, .prog-name-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: .7rem; font-weight: 800; color: var(--muted); }
  .mel-name, .prog-name { flex: 1; min-width: 0; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 7px 9px; font-size: .8rem; color: var(--text); }
  .mel-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 12px; }
  .mel-done { margin-left: auto; padding: 9px 20px; border-radius: 999px; background: var(--accent); color: #fff; font-weight: 800; font-size: .76rem; }

  .auto-box { margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--line); }
  .auto-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .auto-row .help-btn { margin: 0; }
  .auto-bars .chip { min-width: 32px; text-align: center; }
  .auto-live { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
  .auto-result { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .auto-params { flex: 1; min-width: 0; font-size: .7rem; font-weight: 700; color: var(--text); }
  .rec-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .rec-bars .chip { min-width: 34px; text-align: center; }
  .rec-btn { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--surface); font-weight: 800; font-size: .76rem; }
  .rec-btn i { width: 12px; height: 12px; border-radius: 50%; background: var(--bad); }
  .rec-btn.is-live { background: var(--bad); border-color: var(--bad); color: #fff; }
  .rec-btn.is-live i { background: #fff; border-radius: 2px; animation: rec-blink 1s steps(2) infinite; }
  @keyframes rec-blink { 50% { opacity: .3; } }
  .rec-live { display: flex; align-items: center; gap: 10px; margin-top: 10px; min-height: 30px; }
  .rec-count { font-size: 1.4rem; font-weight: 800; color: var(--bad); min-width: 1ch; }
  .rec-status { font-size: .72rem; font-weight: 700; color: var(--muted); }
  .rec-meter { display: flex; gap: 4px; margin-top: 6px; }
  .rec-meter span { position: relative; flex: 1; height: 18px; border-radius: 6px; background: var(--line); overflow: hidden; }
  .rec-meter i { position: absolute; inset: 0 auto 0 0; width: 0; background: rgba(224,68,90,.55); }
  .rec-meter span.is-full i { background: var(--bad); }
  .rec-meter b { position: relative; display: grid; place-items: center; height: 100%; font-size: .62rem; font-weight: 800; color: var(--text); }
  .rec-meter span.is-full b { color: #fff; }
  .rec-roll .mel-playhead { background: var(--bad); width: 2px; }
  .rec-stage { position: relative; }
  .rec-play { position: absolute; right: 8px; bottom: 8px; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
    background: var(--accent); color: #fff; box-shadow: 0 4px 12px rgba(var(--accent-rgb), .45); }
  .rec-play svg { width: 18px; height: 18px; }
  .rec-result { margin-top: 10px; }
  .rec-result .mel-mini { border: 1px solid var(--line); }
  .rec-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; }

  .picker { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; justify-content: flex-end; }
  .picker-backdrop { position: absolute; inset: 0; background: rgba(36,27,61,.38); opacity: 0; transition: opacity .22s; }
  .picker-card {
    position: relative; width: 100%; max-width: 560px; margin: 0 auto; height: 82%; display: flex; flex-direction: column;
    background: var(--bg); border-radius: 24px 24px 0 0; box-shadow: 0 -10px 30px rgba(36,27,61,.18);
    transform: translateY(100%); transition: transform .28s cubic-bezier(.2,.8,.2,1);
  }
  .picker.is-open .picker-backdrop { opacity: 1; }
  .picker.is-open .picker-card { transform: none; }
  .picker-grab { width: 40px; height: 5px; border-radius: 3px; background: var(--line); margin: 8px auto 2px; flex: 0 0 auto; }
  .picker-card > .panel-head { padding: 4px 16px 0; margin-bottom: 8px; }
  .picker-title { font-size: .95rem !important; color: var(--text) !important; text-transform: none !important; letter-spacing: 0 !important; }
  .picker-chips { padding: 0 16px 10px; flex: 0 0 auto; }
  .chip-clear { display: inline-grid; place-items: center; padding: 0; width: 32px; align-self: stretch; color: var(--accent); border-color: var(--accent); }
  .chip-clear svg { width: 14px; height: 14px; stroke-width: 2.4; }
  .chip-sep { flex: 0 0 1px; align-self: stretch; background: var(--line); margin: 3px 2px; }
  .picker-grid { flex: 1; min-height: 0; overflow-y: auto; padding: 2px 16px 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-content: start; }
  .pick-card { display: flex; align-items: center; gap: 9px; padding: 9px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); text-align: left; min-width: 0; }
  .pick-card.is-wide { flex-direction: column; align-items: stretch; gap: 6px; }
  .pick-ico { flex: 0 0 auto; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: rgba(var(--accent-rgb), .12); color: var(--accent); }
  .pick-ico svg { width: 19px; height: 19px; }
  .pick-card.is-wide .pick-ico { width: 100%; height: 30px; padding: 0 8px; }
  .pick-card.is-wide .pick-ico .preview { width: 100%; }
  .pick-text { min-width: 0; display: grid; }
  .pick-text strong { font-size: .74rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pick-text span { font-size: .64rem; color: var(--muted); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pick-text em { font-style: normal; font-size: .6rem; line-height: 1.35; color: var(--muted); margin-top: 3px;
    display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .pick-mismatch { display: block; font-size: .7rem; font-weight: 700; color: var(--muted); }
  .pick-card.is-mismatch .pick-ico { opacity: .5; }
  .pick-card[aria-pressed="true"] { border-color: var(--accent); background: rgba(var(--accent-rgb), .12); box-shadow: 0 0 0 1px rgba(var(--accent-rgb), .35) inset; }
  .pick-card[aria-pressed="true"] .pick-ico { background: var(--accent); color: #fff; }
  .picker-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; border-top: 1px solid var(--line);
    padding: 10px max(16px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
  .picker-now { flex: 1; min-width: 0; display: grid; }
  .picker-now span { font-size: .62rem; color: var(--muted); font-weight: 700; }
  .picker-now strong { font-size: .8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .picker-done { padding: 11px 24px; border-radius: 999px; background: var(--accent); color: #fff; font-weight: 800; font-size: .8rem; }
  @media (prefers-reduced-motion: reduce) { .picker-card, .picker-backdrop { transition: none; } }

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
    .track-row { grid-template-columns: 28px 38px 1fr 30px; gap: 5px; }
    .satb-row { grid-template-columns: 12px 1fr 44px 84px; gap: 6px; }
  }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; animation: none !important; } }
</style>

<header class="lab-head">
  <div class="lab-head-title">
    <h1><span>Groove</span> Lab</h1>
    <button class="ovl-btn" type="button" data-action="overload" aria-expanded="false" aria-label="${t('lab.ovl.ariaIdle')}" title="${t('lab.ovl.ariaIdle')}"><svg class="ovl-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-5"/></svg><span class="ovl-bang" aria-hidden="true">!</span></button>
    <div class="ovl-pop" role="dialog" aria-label="${t('lab.ovl.titleIdle')}" hidden>
      <strong class="ovl-title">${t('lab.ovl.titleIdle')}</strong>
      <p class="ovl-text">${t('lab.ovl.textIdle')}</p>
      <span class="sub-label">${t('lab.ovl.buffer')}</span>
      <div class="chip-row">
        ${LATENCY_HINTS.map((hint) => `<button class="chip" type="button" data-action="latency" data-value="${hint}" aria-pressed="false"><span>${t(`lab.ovl.${hint}`)}</span><small class="lat-info"></small></button>`).join('')}
      </div>
      <p class="ovl-effect">${t('lab.ovl.effect')}</p>
      <p class="ovl-measured"></p>
      <p class="ovl-max" hidden>${t('lab.ovl.max')}</p>
      <span class="sub-label">${t('lab.ovl.diag')}</span>
      <dl class="ovl-diag"></dl>
      <div class="chip-row">
        <button class="chip" type="button" data-action="ovl-measure">${t('lab.ovl.measure')}</button>
        <button class="chip" type="button" data-action="ovl-copy">${t('lab.ovl.copy')}</button>
      </div>
      <p class="ovl-test" role="status"></p>
      <p class="ovl-note" role="status"></p>
      <button class="chip" type="button" data-action="overload-close">${t('lab.ovl.close')}</button>
    </div>
  </div>
  <div class="view-switch" role="group" aria-label="${t('lab.viewAria')}">
    <button class="chip" type="button" data-action="view" data-value="choir" aria-pressed="false">${t('lab.viewChoir')}</button>
    <button class="chip" type="button" data-action="view" data-value="studio" aria-pressed="true">${t('lab.viewStudio')}</button>
    <button class="chip" type="button" data-action="view" data-value="workshop" aria-pressed="false">${t('lab.viewWorkshop')}</button>
    <button class="chip" type="button" data-action="view" data-value="deconstruct" aria-pressed="false">${t('lab.viewDeconstruct')}</button>
  </div>
  <select class="view-select" aria-label="${t('lab.viewAria')}">
    <option value="choir">${t('lab.viewChoir')}</option>
    <option value="studio">${t('lab.viewStudio')}</option>
    <option value="workshop">${t('lab.viewWorkshop')}</option>
    <option value="deconstruct">${t('lab.viewDeconstruct')}</option>
  </select>
  <button class="icon-btn" type="button" data-action="open-sheet" aria-label="${t('lab.saveAria')}" title="${t('lab.saveAria')}">${UI_ICON.save}</button>
  <button class="icon-btn close-btn" type="button" data-action="close" aria-label="${t('lab.closeAria')}">${UI_ICON.close}</button>
</header>

<nav class="tab-bar" role="tablist">
  ${TABS.map((tab) => `<button class="tab-btn" type="button" role="tab" data-action="tab" data-tab="${tab.id}" aria-selected="${tab.id === 'beat'}">${t(tab.labelKey)}</button>`).join('')}
</nav>

<div class="lab-body">
  <section class="choir-view" hidden>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.choirTask')}</h2>${help('choirHelp')}</div>
      ${helpText('choirHelp')}
      <div class="chip-row choir-task-chips"></div>
      <div class="task-card"><strong class="task-title"></strong><p class="task-help"></p></div>
      <div class="choir-part"><span class="sub-label">${t('lab.choirPartAsk')}</span><div class="chip-row choir-part-chips"></div></div>
    </section>
    <section class="panel choir-now-panel">
      <div class="choir-now" aria-live="polite"><span class="choir-now-label">${t('lab.choirNow')}</span><strong class="choir-now-chord"></strong><span class="choir-now-target"></span></div>
      <div class="choir-display"></div>
      <div class="pill-row"><button class="chip" type="button" data-action="fade-drums" hidden></button></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.drumloop')}</h2></div>
      <div class="chip-row choir-grooves"></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.key')}</h2></div>
      <div class="select-grid">
        <label class="select-field"><span>${t('lab.keyRoot')}</span><select data-field="keyRoot"></select></label>
        <label class="select-field"><span>${t('lab.keyMode')}</span><select data-field="modeId"></select></label>
      </div>
      <label class="select-field" style="margin-top:8px"><span>${t('lab.choirProg')}</span><select data-choir="prog"></select></label>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.satbTitle')}</h2></div>
      <div class="satb-list"></div>
    </section>
    <section class="panel">
      <div class="switch-row">${toggle('droneOn', 'lab.droneOn')}${toggle('droneFifth', 'lab.droneFifth')}</div>
    </section>
  </section>
  <section class="workshop-view" hidden>
    <section class="panel ws-panel">
      <!-- Schritt für Schritt: oben wo man steht („Einheit 3 von 9“, Punkte),
           die volle Auswahl (Rundgang/Vertiefung/Challenges, alle Einheiten)
           klappt erst unter „Alle Einheiten“ auf. -->
      <div class="ws-head">
        <span class="ws-where"></span>
        <button class="ws-all-btn" type="button" data-action="ws-all" aria-expanded="false">${t('lab.ws.all')}<span class="ws-caret" aria-hidden="true">▾</span></button>
      </div>
      <div class="ws-dots" aria-hidden="true"></div>
      <div class="ws-picker" hidden>
        <div class="chip-row ws-tiers" role="group" aria-label="${t('lab.viewWorkshop')}"></div>
        <p class="ws-progress"></p>
        <div class="chip-row ws-areas" role="group" aria-label="${t('lab.ws.tierDeep')}" hidden></div>
        <div class="chip-row ws-lessons" role="group" aria-label="${t('lab.viewWorkshop')}"></div>
      </div>
      <div class="ws-card" hidden>
        <strong class="ws-title"></strong>
        <p class="ws-do"></p>
        <ul class="ws-checks"></ul>
        <details class="ws-why"><summary>${t('lab.ws.why')}</summary><p class="ws-why-text"></p></details>
        <p class="ws-aha" hidden><strong></strong> <span></span></p>
        <p class="ws-tour-done" hidden>${t('lab.ws.tourDone')}</p>
        <div class="ws-ch" hidden>
          <div class="ws-ch-top"><span class="ws-ch-round"></span><strong class="ws-ch-badge" aria-hidden="true" hidden></strong></div>
          <div class="chip-row ws-listen" role="group" aria-label="${t('lab.ws.model')} / ${t('lab.ws.mine')}" hidden></div>
          <p class="ws-ch-score" hidden></p>
          <ul class="ws-checks ws-ch-params" hidden></ul>
          <p class="ws-ch-msg" role="status"></p>
          <p class="ws-ch-result" hidden></p>
          <button class="chip ws-go" type="button" data-action="ws-go"></button>
        </div>
        <div class="ws-actions">
          <button class="chip ws-prev" type="button" data-action="ws-prev">‹ ${t('lab.ws.prev')}</button>
          <button class="chip" type="button" data-action="ws-restart">${t('lab.ws.restart')}</button>
          <button class="chip ws-ab" type="button" data-action="ws-ab" aria-pressed="false" hidden><span class="ws-ab-before">${t('lab.ws.before')}</span><span class="ws-ab-after is-on">${t('lab.ws.after')}</span></button>
          <button class="chip ws-next" type="button" data-action="ws-next">${t('lab.ws.next')} ›</button>
        </div>
        <p class="ws-ab-hint" hidden></p>
        <p class="ws-to-studio">${t('lab.ws.toStudio')}</p>
      </div>
      <p class="ws-live" aria-live="polite"></p>
    </section>
  </section>
  <section class="dc-view" hidden aria-labelledby="dc-heading">
    <section class="panel dc-panel">
      <div class="dc-intro">
        <h2 class="dc-title" id="dc-heading"><span>de:</span>construct</h2>
        <p class="dc-lead">${t('lab.dc.intro')}</p>
        <div class="dc-seg" role="group" aria-label="${t('lab.dc.levelTitle')}">
          ${DC_LEVELS.map((l) => `<button type="button" data-action="dc-level" data-value="${l.id}" aria-pressed="false">${t(`lab.dc.level.${l.id}`)}</button>`).join('')}
        </div>
        <p class="dc-level-info"></p>
        <div class="dc-prog-line">
          <span class="dc-prog-label" id="dc-song-label">${t('lab.dc.songsTitle')}</span>
          <div class="dc-prog" role="progressbar" aria-labelledby="dc-song-label" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><div class="dc-prog-fill"></div></div>
          <span class="dc-prog-text"></span>
        </div>
        <ul class="dc-list" aria-labelledby="dc-song-label"></ul>
        <details class="dc-how">
          <summary>${t('lab.dc.how')}</summary>
          <ol class="dc-steps">
            <li>${t('lab.dc.step1')}</li>
            <li>${t('lab.dc.step2')}</li>
            <li>${t('lab.dc.step3')}</li>
          </ol>
        </details>
        <div class="dc-start">
          <p class="dc-replace" hidden>${t('lab.dc.replaceWarn')}</p>
          <button class="dc-primary" type="button" data-action="dc-new">${UI_ICON.play}<span></span></button>
        </div>
      </div>
      <div class="dc-song" hidden>
        <div class="dc-head">
          <h2 class="dc-title dc-title-small"><span>de:</span>construct</h2>
          <span class="dc-count"></span>
          <div class="dc-menu-wrap">
            <button class="dc-more" type="button" data-action="dc-menu" aria-haspopup="true" aria-expanded="false" aria-label="${t('lab.dc.moreAria')}" title="${t('lab.dc.moreAria')}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none"/></svg></button>
            <div class="dc-menu" hidden>
              <button class="dc-menu-item" type="button" data-action="dc-choose">${t('lab.dc.newSong')}</button>
              <button class="dc-menu-item dc-reveal" type="button" data-action="dc-reveal">${t('lab.dc.reveal')}</button>
            </div>
          </div>
        </div>
        <p class="dc-song-title"></p>
        <p class="dc-given"></p>
        <nav class="dc-elements" aria-label="${t('lab.dc.elementsTitle')}"></nav>
        <section class="dc-card" aria-live="off">
          <div class="dc-card-head"><strong class="dc-card-name"></strong><span class="dc-card-state"></span></div>
          <p class="dc-card-hint"></p>
          <div class="dc-tap-box" hidden>
            <p class="dc-card-sub">${t('lab.dc.tapSub')}</p>
            <button class="dc-tap" type="button" data-action="tap-tempo" aria-label="${t('lab.dc.tapAria')}">${t('lab.tapTempo')}</button>
            <output class="bpm-out dc-tap-bpm"></output>
          </div>
          <p class="dc-card-tip"></p>
          <div class="dc-el-solution" tabindex="-1" hidden></div>
          <div class="dc-focus-row">
            <span class="dc-focus-label" id="dc-focus-label">${t('lab.dc.focusTitle')}</span>
            <div class="chip-row dc-focus" role="group" aria-labelledby="dc-focus-label"></div>
          </div>
        </section>
        <button class="dc-next" type="button" data-action="dc-pick" hidden></button>
        <p class="dc-all-done" hidden>${t('lab.dc.allDone')}</p>
        <p class="dc-live" role="status" aria-live="polite"></p>
        <div class="dc-solution" tabindex="-1" hidden>
          <p>${t('lab.dc.revealed')}</p>
          <button class="chip" type="button" data-action="dc-adopt">${t('lab.dc.adopt')}</button>
        </div>
      </div>
    </section>
  </section>
  <section class="tab-panel" data-tab-panel="beat">
    <section class="panel dc-tpl-panel">
      <div class="panel-head"><h2>${t('lab.drumloop')}</h2>${lockBtn('beat')}</div>
      ${pickerTrigger('beat')}
    </section>
    <section class="panel beat-panel">
      <div class="zoom-head"><h2>${t('lab.pattern')}</h2><button class="chip zoom-done" type="button" data-action="beat-zoom-close">${t('lab.zoomClose')}</button></div>
      <div class="panel-head dc-pattern-head"><h2>${t('lab.pattern')}</h2>${help('editHint')}<button class="chip reset-beat" type="button" data-action="reset-beat">${t('lab.resetBeat')}</button>${zoomBtn}</div>
      <div class="dc-tools">
        <select class="dc-meter" data-field="meter" aria-label="${t('lab.dc.meterAria')}">${METER_IDS.map((id) => `<option value="${id}">${id}</option>`).join('')}</select>
        <button class="chip" type="button" data-action="dc-tpl" aria-expanded="false">${t('lab.dc.tpl')}</button>
        <button class="chip" type="button" data-action="dc-clear-grid">${t('lab.dc.clearGrid')}</button>
        ${zoomBtn}
      </div>
      <p class="zoom-hint">${t('lab.zoomHint')}</p>
      ${helpText('editHint')}
      <div class="track-list"></div>
      <details class="kit-box">
        <summary><span class="kit-sum">${t('lab.kitTitle')}</span></summary>
        <div class="kit-sliders">
          ${[['kickStart', 'lab.kitStart', 60, 300, 1], ['kickEnd', 'lab.kitEnd', 25, 200, 1], ['kickDecay', 'lab.kitDecay', .08, 1.2, .01]].map(([key, label, min, max, step]) =>
            `<label class="slider-line"><span>${t(label)}</span><input type="range" data-kit="${key}" min="${min}" max="${max}" step="${step}"><output data-kit-out="${key}"></output></label>`).join('')}
        </div>
        <div class="pill-row"><button class="chip" type="button" data-action="kit-reset">${t('lab.kitReset')}</button></div>
      </details>
    </section>
    <section class="panel dc-bass-panel live-panel">
      <div class="panel-head"><h2>${t('lab.sampler.liveTitle')}</h2>${help('helpLive')}<label class="switch live-switch"><input type="checkbox" role="switch" data-switch="liveWrite" checked><span class="switch-track" aria-hidden="true"></span><span>${t('lab.sampler.liveWrite')}</span></label></div>
      ${helpText('helpLive')}
      <div class="live-pads" role="group" aria-label="${t('lab.sampler.liveTitle')}"></div>
    </section>
    <section class="panel dc-bass-panel kit-panel">
      <div class="panel-head"><h2>${t('lab.drumKit')}</h2>${help('helpKit')}</div>
      ${helpText('helpKit')}
      <div class="chip-row kit-chips" role="group" aria-label="${t('lab.drumKit')}"></div>
      <div class="panel-head"><h2>${t('lab.fills')}</h2>${help('helpFills')}</div>
      ${helpText('helpFills')}
      <div class="chip-row fill-chips" role="group" aria-label="${t('lab.fills')}"></div>
    </section>
    <section class="panel dc-bass-panel">
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
      ${pickerTrigger('prog')}
      <p class="prog-info"></p>
      <div class="chord-strip"></div>
      <button class="mel-edit-link" type="button" data-action="prog-edit">${UI_ICON.edit}${t('lab.progEdit')}</button>
      <div class="prog-editor" hidden>
        <div class="mel-top">
          <span class="prog-count"></span>
          <button class="mel-icon" type="button" data-action="prog-undo" aria-label="${t('lab.melUndo')}" title="${t('lab.melUndo')}">${UI_ICON.undo}</button>
          <button class="mel-icon" type="button" data-action="prog-redo" aria-label="${t('lab.melRedo')}" title="${t('lab.melRedo')}">${UI_ICON.redo}</button>
          <button class="mel-icon" type="button" data-action="prog-new" aria-label="${t('lab.progNew')}" title="${t('lab.progNew')}">${UI_ICON.newPage}</button>
        </div>
        <span class="sub-label">${t('lab.progChordAt')}</span>
        <div class="prog-degrees" role="group" aria-label="${t('lab.progChordAt')}"></div>
        <div class="prog-tools">
          <button class="chip" type="button" data-action="prog-move" data-value="-1" aria-label="${t('lab.progMoveLeft')}">${UI_ICON.prev}</button>
          <button class="chip" type="button" data-action="prog-move" data-value="1" aria-label="${t('lab.progMoveRight')}">${UI_ICON.next}</button>
          <button class="chip" type="button" data-action="prog-add">+ ${t('lab.progAdd')}</button>
          <button class="chip" type="button" data-action="prog-remove">− ${t('lab.progRemove')}</button>
        </div>
        <div class="switch-row" style="margin-top:10px">${toggle('progSevenths', 'lab.progSevenths')}${toggle('progDominant', 'lab.progDominant')}</div>
        <div class="prog-alter-row"><span class="chip-label">${t('lab.alterLabel')}</span><div class="chip-row prog-alter-chips" role="group" aria-label="${t('lab.alterLabel')}"></div></div>
        <div class="prog-alter-row"><span class="chip-label">${t('lab.bassLabel')}</span><div class="chip-row prog-bass-chips" role="group" aria-label="${t('lab.bassLabel')}"></div></div>
        <label class="prog-name-row" hidden><span>${t('lab.melName')}</span><input class="mel-name-input prog-name" type="text" maxlength="40" autocomplete="off"></label>
        <div class="mel-foot">
          <button class="chip" type="button" data-action="prog-original">${t('lab.melOriginal')}</button>
          <button class="chip" type="button" data-action="prog-save">${t('lab.melSave')}</button>
          <button class="chip" type="button" data-action="prog-delete">${t('lab.melDelete')}</button>
          <button class="mel-done" type="button" data-action="prog-done">${t('lab.melDone')}</button>
        </div>
      </div>
      <label class="select-line"><span>${t('lab.chordChange')}</span>
        <select data-field="chordBars"><option value="1">${t('lab.everyBar')}</option><option value="2">${t('lab.everyTwoBars')}</option></select>
      </label>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.satbTitle')}</h2>${help('satbHint')}</div>
      ${helpText('satbHint')}
      <div class="switch-row">${toggle('chordsOn', 'lab.chordsPlay')}</div>
      <div class="chip-row voicing-chips" role="group" aria-label="${t('lab.voicing')}"></div>
      <div class="switch-row add9-row">${toggle('chordAdd9', 'lab.chordAdd9')}</div>
      <div class="chip-row chordsound-chips" role="group" aria-label="${t('lab.chordSoundLabel')}"></div>
      <div class="satb-list"></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.drone')}</h2>${help('droneHint')}</div>
      ${helpText('droneHint')}
      <div class="switch-row">${toggle('droneOn', 'lab.droneOn')}${toggle('droneFifth', 'lab.droneFifth')}</div>
    </section>
  </section>

  <section class="tab-panel" data-tab-panel="sampler" hidden>
    <div class="sampler-root"></div>
  </section>

  <section class="tab-panel" data-tab-panel="melody" hidden>
    <section class="panel">
      <div class="panel-head">
        <h2>${t('lab.melody')}</h2>${help('melodyHint')}
        ${lockBtn('melody')}${bareToggle('melodyOn', 'lab.melodyOn')}
      </div>
      ${helpText('melodyHint')}
      ${pickerTrigger('melody')}
      <div class="switch-row" style="margin-top:8px">${toggle('melodyAltBars', 'lab.melodyAltBars')}</div>
      <div class="mel-card">
        <div class="mel-view">
          <div class="mel-mini" aria-hidden="true"></div>
          <button class="mel-edit-link" type="button" data-action="mel-edit">${UI_ICON.edit}${t('lab.melEdit')}</button>
        </div>
        <div class="mel-editor" hidden>
          <div class="mel-top">
            <div class="mel-bars" role="group" aria-label="${t('lab.melBarsAria')}"></div>
            <button class="mel-icon" type="button" data-action="mel-undo" aria-label="${t('lab.melUndo')}" title="${t('lab.melUndo')}">${UI_ICON.undo}</button>
            <button class="mel-icon" type="button" data-action="mel-redo" aria-label="${t('lab.melRedo')}" title="${t('lab.melRedo')}">${UI_ICON.redo}</button>
            <button class="mel-icon" type="button" data-action="mel-new" aria-label="${t('lab.melNew')}" title="${t('lab.melNew')}">${UI_ICON.newPage}</button>
          </div>
          <div class="mel-roll">
            <div class="mel-labels" aria-hidden="true"></div>
            <div class="mel-grid" role="img" aria-label="${t('lab.melRollAria')}"></div>
          </div>
          <div class="mel-tools">
            <span class="sub-label">${t('lab.melLength')}</span>
            <div class="chip-row mel-lengths"></div>
            <div class="mel-chroma">${toggle('melChroma', 'lab.melChroma')}<div class="chip-row mel-alts" role="group" aria-label="${t('lab.melAltAria')}"></div></div>
          </div>
          <label class="mel-name-row" hidden><span>${t('lab.melName')}</span><input class="mel-name" type="text" maxlength="40" autocomplete="off"></label>
          <div class="mel-foot">
            <button class="chip" type="button" data-action="mel-original">${t('lab.melOriginal')}</button>
            <button class="chip" type="button" data-action="mel-save">${t('lab.melSave')}</button>
            <button class="chip" type="button" data-action="mel-delete">${t('lab.melDelete')}</button>
            <button class="mel-done" type="button" data-action="mel-done">${t('lab.melDone')}</button>
          </div>
        </div>
      </div>
      <span class="sub-label">${t('lab.melodyOctave')}</span>
      <div class="chip-row melody-octaves"></div>
    </section>
  </section>

  <section class="tab-panel" data-tab-panel="sound" hidden>
    <section class="panel">
      <div class="panel-head"><h2>${t('lab.sound')}</h2>${help('helpSound')}${lockBtn('sound')}</div>
      ${helpText('helpSound')}
      ${pickerTrigger('sound')}
      <div class="reset-sound-row"><button class="chip" type="button" data-action="reset-sound">${t('lab.resetSound')}</button></div>
      <p class="sample-note" role="status" hidden>${t('lab.sampleFallback')}</p>
      <div class="knob-row macro-knobs"></div>
      <div class="auto-box">
        <div class="auto-row">
          <span class="chip-label">${t('lab.autoTitle')}</span>${help('autoHint')}
          <div class="chip-row auto-bars" role="group" aria-label="${t('lab.recBars')}"></div>
          <button class="rec-btn" type="button" data-action="auto-rec"><i aria-hidden="true"></i><span>${t('lab.autoRec')}</span></button>
        </div>
        ${helpText('autoHint')}
        <div class="auto-live" hidden><strong class="auto-count rec-count"></strong><span class="auto-status rec-status"></span></div>
        <div class="rec-meter auto-meter" hidden></div>
        <div class="auto-result" hidden>
          <span class="auto-params"></span>
          ${bareToggle('autoOn', 'lab.autoOnAria')}
          <button class="chip" type="button" data-action="auto-clear">${t('lab.autoClear')}</button>
        </div>
      </div>

      <details class="expert">
        <summary>${pictogramIcon('sliders')} ${t('lab.allControls')}</summary>
        <div class="module-grid">
          <div class="module" data-mod="osc">
            <div class="module-head"><span class="module-icon">${pictogramIcon('pulse')}</span><h3>${t('lab.oscillator')}</h3>${help('helpOsc')}</div>
            ${helpText('helpOsc')}
            <div class="wave-row" role="group" aria-label="${t('lab.waveformAria')}"></div>
          </div>
          <div class="module" data-mod="env">
            <div class="module-head"><span class="module-icon">${pictogramIcon('stairs')}</span><h3>${t('lab.envelope')}</h3>${help('helpEnv')}</div>
            ${helpText('helpEnv')}
            <svg class="envelope-graph" viewBox="0 0 92 40" preserveAspectRatio="none"><path class="envelope-path" d=""/></svg>
            <div class="adsr-sliders"></div>
          </div>
          <div class="module" data-mod="filter">
            <div class="module-head"><span class="module-icon">${pictogramIcon('target')}</span><h3>${t('lab.filter')}</h3>${help('helpFilter')}</div>
            ${helpText('helpFilter')}
            <div class="chip-row filter-type-chips"></div>
            <div class="knob-row filter-knobs"></div>
          </div>
          <div class="module" data-mod="lfo">
            <div class="module-head"><span class="module-icon">${pictogramIcon('wave')}</span><h3>${t('lab.lfo')}</h3>${help('helpLfo')}</div>
            ${helpText('helpLfo')}
            <div class="knob-row lfo-knobs"></div>
            <label class="select-line"><span>${t('lab.lfoSyncLabel')}</span><select data-field="lfoSync"></select></label>
          </div>
          <div class="module" data-mod="char">
            <div class="module-head"><span class="module-icon">${pictogramIcon('star')}</span><h3>${t('lab.character')}</h3>${help('helpCharacter')}</div>
            ${helpText('helpCharacter')}
            <div class="knob-row character-knobs"></div>
          </div>
          <div class="module" data-mod="vib">
            <div class="module-head"><span class="module-icon">${pictogramIcon('wave')}</span><h3>${t('lab.vibrato')}</h3>${help('helpVibrato')}</div>
            ${helpText('helpVibrato')}
            <div class="knob-row vibrato-knobs"></div>
          </div>
          <div class="module" data-mod="glide">
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
        <div class="fx-group"><div class="fx-head"><span class="sub-label">${t('lab.reverb')}</span>${bareToggle('reverbOn', 'lab.reverb')}</div>
          <div class="knob-row fx-reverb"></div></div>
        <div class="fx-group"><div class="fx-head"><span class="sub-label">${t('lab.knobChorus')}</span>${bareToggle('chorusOn', 'lab.knobChorus')}</div>
          <div class="knob-row fx-chorus"></div></div>
        <div class="fx-group is-wide"><div class="fx-head"><span class="sub-label">${t('lab.echo')}</span>${bareToggle('echoOn', 'lab.echo')}</div>
          <div class="fx-echo-row">
            <div class="knob-row fx-echo"></div>
            <label class="select-field fx-echo-time"><span>${t('lab.echoTime')}</span><select data-field="echoDiv"></select></label>
          </div>
        </div>
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
      <div class="panel-head"><h2>${t('lab.arpeggiator')}</h2>${help('helpArp')}${bareToggle('arpOn', 'lab.arpOn')}</div>
      ${helpText('helpArp')}
      <div class="switch-row arp-switches">${toggle('latchOn', 'lab.latch')}${toggle('arpAuto', 'lab.arpAuto')}</div>
      <div class="arp-options">
        <p class="arp-status" role="status"></p>
        <div class="arp-grid">
          <label class="select-field arp-pattern"><span>${t('lab.arpPattern')}</span><select data-field="arpPattern"></select></label>
          <label class="select-field"><span>${t('lab.directionAria')}</span><select data-field="arpMode"></select></label>
          <label class="select-field"><span>${t('lab.speedAria')}</span><select data-field="arpDivision"></select></label>
          <label class="select-field"><span>${t('lab.arpRhythm')}</span><select data-field="arpRhythm"></select></label>
          <label class="select-field arp-ref"><span>${t('lab.arpRef')}</span><select data-field="arpRef"></select></label>
          <label class="select-field"><span>${t('lab.octaveRangeAria')}</span>
            <select data-field="arpOctaves">
              <option value="1">${t('lab.octave1')}</option>
              <option value="2">${t('lab.octave2')}</option>
              <option value="3">${t('lab.octave3')}</option>
            </select>
          </label>
        </div>
        <button class="chip arp-clear" type="button" data-action="arp-clear" hidden>${t('lab.arpClear')}</button>
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

    <section class="panel rec-panel">
      <div class="panel-head"><h2>${t('lab.recTitle')}</h2>${help('recHint')}</div>
      ${helpText('recHint')}
      <div class="rec-row">
        <span class="chip-label">${t('lab.recBars')}</span>
        <div class="chip-row rec-bars" role="group" aria-label="${t('lab.recBars')}"></div>
        <button class="rec-btn" type="button" data-action="rec-toggle"><i aria-hidden="true"></i><span>${t('lab.recStart')}</span></button>
      </div>
      <div class="rec-live" hidden>
        <strong class="rec-count" aria-live="polite"></strong>
        <span class="rec-status"></span>
      </div>
      <div class="rec-result" hidden>
        <div class="rec-stage">
          <div class="mel-mini rec-roll" aria-hidden="true"></div>
          <button class="rec-play" type="button" data-action="rec-loop" hidden></button>
        </div>
        <div class="rec-meter" aria-hidden="true"></div>
        <div class="rec-actions">
          <button class="chip" type="button" data-action="rec-discard">${t('lab.recDiscard')}</button>
          <button class="chip" type="button" data-action="rec-toggle">${t('lab.recAgain')}</button>
          <button class="mel-done" type="button" data-action="rec-save">${t('lab.recSave')}</button>
        </div>
      </div>
    </section>
  </section>
</div>

<footer class="transport-bar">
  <div class="transport-row">
    <button class="transport-play" type="button" data-action="toggle-transport" aria-label="${t('lab.startAria')}">${UI_ICON.play}</button>
    <label class="tempo-field">
      <output class="bpm-out">106 BPM</output>
      <input class="bpm-input" type="range" min="30" max="180" value="106" aria-label="${t('lab.tempoAria')}">
    </label>
    <button class="icon-btn tap-btn" type="button" data-action="tap-tempo" aria-label="${t('lab.tapAria')}">${t('lab.tapTempo')}</button>
    <button class="icon-btn" type="button" data-action="randomize" aria-label="${t('lab.randomAria')}" title="${t('lab.randomAria')}">${UI_ICON.dice}</button>
    <button class="dc-check-btn" type="button" data-action="dc-check-active"></button>
    <button class="dc-quick" type="button" data-action="dc-quick" aria-pressed="true" aria-label="${t('lab.dc.quickAria')}" title="${t('lab.dc.quickAria')}" hidden><b class="dc-quick-letter">A</b><span class="dc-quick-text"></span></button>
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
</div>

<div class="confirm" hidden>
  <div class="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="gl-confirm-text">
    <p class="confirm-text" id="gl-confirm-text"></p>
    <div class="confirm-row">
      <button class="chip confirm-no" type="button" data-action="confirm-no">${t('common.cancel')}</button>
      <button class="chip confirm-yes" type="button" data-action="confirm-yes"></button>
    </div>
  </div>
</div>

<div class="dc-sheet" hidden>
  <div class="dc-sheet-backdrop" data-action="dc-sheet-close"></div>
  <section class="dc-sheet-card" role="dialog" aria-modal="true" aria-labelledby="dc-sheet-title" tabindex="-1">
    <div class="dc-sheet-grab" aria-hidden="true"></div>
    <div class="dc-sheet-head">
      <span class="dc-sheet-mark" aria-hidden="true"></span>
      <div class="dc-sheet-heads">
        <h2 class="dc-sheet-title" id="dc-sheet-title"></h2>
        <p class="dc-sheet-sub"></p>
      </div>
    </div>
    <ul class="dc-parts" hidden></ul>
    <p class="dc-sheet-hint" hidden></p>
    <div class="dc-help" hidden>
      <span class="dc-help-title"></span>
      <div class="dc-help-btns">
        <button class="chip dc-help-listen" type="button" data-action="dc-help-listen"></button>
        <button class="chip dc-help-reveal" type="button" data-action="dc-help-reveal">${t('lab.dc.help.reveal')}</button>
      </div>
    </div>
    <button class="dc-sheet-main" type="button" data-action="dc-sheet-close"></button>
    <button class="dc-sheet-close" type="button" data-action="dc-sheet-close" hidden></button>
  </section>
</div>

<div class="picker" hidden>
  <div class="picker-backdrop" data-action="picker-close"></div>
  <div class="picker-card" role="dialog" aria-modal="true" aria-labelledby="picker-title">
    <div class="picker-grab" aria-hidden="true"></div>
    <div class="panel-head"><h2 class="picker-title" id="picker-title"></h2>
      <button class="icon-btn" type="button" data-action="picker-close" aria-label="${t('lab.closeAria')}">${UI_ICON.close}</button></div>
    <div class="chip-row picker-chips"></div>
    <div class="picker-grid"></div>
    <div class="picker-foot">
      <div class="picker-now"><span>${t('lab.pickerChosen')}</span><strong class="picker-now-name"></strong></div>
      <button class="picker-done" type="button" data-action="picker-close">${t('lab.pickerDone')}</button>
    </div>
  </div>
</div>`;
    }
  }

  if (!customElements.get('chor-groove-lab')) customElements.define('chor-groove-lab', GrooveLabView);

  // Für die Musik-Selbsttests in app.js (runMusicSelfTests) und die Konsole:
  // Daten und reine Funktionen, ohne die Oberfläche zu öffnen.
  const TEST_EXPORT = {
    MODES, PROGRESSIONS, MELODIES, DRUM_PATTERNS, METERS, SATB_RANGES,
    voiceChord, voicePairs, voiceProgressionSatb, leadingToneOf, VOICING_STATS, chordPitchClasses, chordSteps, degreeSemis, progFitsMode, modeForProg, progsForRandom,
    eighthsPerBeat, tempoSymbol, stepSecondsFor, sanitizeSound, PROG_ALTERS, normAlter, normBass, sanitizeProgAlter, sanitizeProgBass, bassNoteMidi,
    SAMPLER_MAX_SAMPLES, SAMPLER_MAX_SEC, SAMPLER_MAX_LANES, SAMPLER_PADS, FACTORY_SAMPLES, FACTORY_KITS, sanitizeSampleMeta, sanitizeSampler, sanitizeSampleLanes, autoTrimBounds, wavePeaks, detectPitch, sampleToneTarget, sampleToneRate, quantizeTapStep, loopRate, MELODY_ORDER, BEAT_ORDER, PRESET_ORDER, orderIndexes, firstPatternOfMeter, firstMelodyOfMeter, SAMPLE_INSTRUMENTS, SAMPLE_FALLBACK, LAB_INST, hatAccent, fillAt, bassNoteSteps, bassRootsFor, BASS_SOUNDS, FILL_HITS, FILL_LENGTHS, resolveKit, pinLegacySound, LabSamples, DRUM_KITS, PERC_SOUNDS, percOf,
    melodyOffset, snapMelodyMidi, melodyBarShifts, melodyRefOf, arpRhythmLengths, chordArpNotes, ARP_RHYTHMS, foldDegree,
    spell, noteLabel, spellCheck, SPELL_CASES, romanNumeral, chordName, chordQuality,
    sanitizeProgLibrary, sanitizeState, defaultState, sanitizeMelodyLibrary, sanitizeMelodyBars, recNotesToBars, melodyMidi,
    GrooveEngine, CHOIR_TASKS, choirTaskState, melodyNotesAt, choirTargetPc, patternIndexByName, beatFromPattern,
    // Workshop
    LESSON_TIERS, LESSON_AREAS, WORKSHOP_LESSONS, lessonState, applyTaskSet, sanitizeWorkshopProgress, focusKeyKnown,
    stepsOn, sameSteps, hitAt, progOf, progDegreesOf, progSeventhsOf, melodyBarsOf, lastPlayed, hasRun,
    melodyIndexByName, presetIndexByName, soundFromPreset, SYNTH_PRESETS, SOUND_DEFAULTS, SOUND_RANGES, CHOIR_PARTS,
    KIT_DEFAULTS, KIT_RANGES,
    pickChallengePattern, detectiveVariant, rebuildScore, soundMatch, soundMatchTarget, SOUND_MATCH_START, CHALLENGE_TRACKS,
    // de:construct
    VIEWS, DC_LEVELS, DC_ELEMENTS, DC_FOCUS, DC_TAB, DC_SONGS, DRUM_TRACKS, CELL_CYCLE, dcSongsOf, dcTempoFeel, dcFirstOpen, dcNextElement, dcBeat, dcBuild, dcCompare, dcSwitchStep, dcNewSong, sanitizeDeconstruct,
    progressionOfState, harmonyOfState, GrooveLabView, loadLevel,
  };

  global.ChorGrooveLab = {
    open(options) {
      // app.js reicht seine t()-Funktion herein; diese Datei ist ein
      // klassisches Skript und kann STRINGS nicht selbst importieren.
      if (typeof options?.t === 'function') t = options.t;
      labLang = ['de', 'en', 'pl'].includes(options?.lang) ? options.lang : labLang;

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
    _test: TEST_EXPORT,
  };
})(window);
