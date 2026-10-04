/* Einsatz finden – Song-Katalog (Entwurf, 48 Songs). Frei erfundene Mini-Songs im Stil
   von Pop-/Indie-/Deutschrock; keine Melodien oder Riffs echter Songs.

   Format (Ticks wie METERS: 12 = Viertel; 4/4 = 48, 3/4 und 6/8 = 36, 12/8 = 72 Ticks je Takt):
   chords   Akkord je Takt in Stufen, immer relativ zur DUR-Leiter der Grundtonart (Moll-Songs: i, bIII, bVI, bVII …);
            ein Takt mit zwei Akkorden: ['IV','V'] (je halber Takt) oder [[0,'IV'],[36,'V']].
   push     Akkord- und Basswechsel so viele Ticks VOR der Eins (vorgezogen).
   drums    Ticks je Takt: kick, snare, rim, clap, hat, open, block; swing: Shuffle (Achtel auf Tick 8/20/32/44 schon eingetragen).
   toms     [[tick, 'hi'|'mid'|'lo']] je Takt (engine.drumTone, Sinus mit Tonhöhenfall).
   bass     [[tick, ton, länge]]: Ton relativ zum Akkord ('1','3','5','6','b7','8','-2' …); negativer Tick = vorgezogen.
   keys     Klavier (engine.keys): { at, len, voicing: 'triad'|'power'|'open' } oder { arp: [[tick, ton]] }.
   pad      Fläche (engine.saw, zwei Stimmen ±6 Cent, Einschwingen 80 ms), hält jeden Akkord bis zum nächsten.
   stab     kurze Akkord-Hits (engine.saw, Bläser/Gitarre): { at, len, voicing }.
   lead     [[takt, tick, stufe, länge]] Melodie (engine.saw gefiltert oder engine.keys hoch); stufe 1 = Grundton, 8 = Oktave,
            0/-1 … darunter; Moll-Songs: natürliches Moll.
   chop     [[takt, tick, stufe, länge, silbe]] Chor-Einwürfe (engine.voice).
   fill     im letzten Takt jeder Periode ab tick: 'snare8'|'snare16'|'toms8'|'toms16'|'stop' (Band setzt aus).
   crash    'period' = Becken (engine.drumNoise, Hochpass ≈ 6 kHz, Ausklang 1,2 s) auf Takt 1 jeder Periode.
   var      { takt: { drums, bass, keys, stab, toms } } Abweichungen einzelner Takte.
   levels   Stufen (SONG_LEVELS); noBassLevels: dort ohne Bass („Bass dazu“ ist die Hilfe).
   patterns passende Klatschmuster (SONG_PATTERNS, Schnittmenge mit den Mustern der Stufe).
   entry    Typ C: Motiv ab der Perioden-Eins [[tick, länge]] (Klatschen oder „da“ singen).
   cue      Satz für „Worauf hören?“ und die Auflösung. tricky: Stichwort der falschen Fährte.

   Fairness (Selbsttest songFairness): Jede Verschiebung um eine Zählzeit (4/4, 3/4: Viertel; 6/8, 12/8: Achtel)
   muss anders klingen – ohne Hi-Hat, Becken, Fill und Takt-Variationen; in Stufe 4 zusätzlich ohne Bass.
   Typ-C-Songs: songPeriodFairness (Verschiebung um ganze Takte innerhalb der Periode). */

const SONG_PATTERNS = {
  one4: {
    meter: '4/4',
    at: [
      0
    ],
    name: 'auf die 1'
  },
  backbeat: {
    meter: '4/4',
    at: [
      12,
      36
    ],
    name: '2 und 4 (Backbeat)'
  },
  oneFour: {
    meter: '4/4',
    at: [
      0,
      36
    ],
    name: '1 und 4'
  },
  push4: {
    meter: '4/4',
    at: [
      0,
      42
    ],
    name: '1 und 4+ (vorgezogen)'
  },
  charleston: {
    meter: '4/4',
    at: [
      0,
      18
    ],
    name: '1 und 2+ (Charleston)'
  },
  tresillo: {
    meter: '4/4',
    at: [
      0,
      18,
      36
    ],
    name: '1 · 2+ · 4 (3-3-2)'
  },
  one3: {
    meter: '3/4',
    at: [
      0
    ],
    name: 'auf die 1'
  },
  waltzPa: {
    meter: '3/4',
    at: [
      12,
      24
    ],
    name: '2 und 3 (um-pa-pa)'
  },
  one68: {
    meter: '6/8',
    at: [
      0
    ],
    name: 'auf die 1'
  },
  six8Back: {
    meter: '6/8',
    at: [
      18
    ],
    name: 'auf die 4'
  },
  hemi68: {
    meter: '6/8',
    at: [
      0,
      12,
      24
    ],
    name: '1 · 3 · 5 (wie 3/4)'
  },
  one128: {
    meter: '12/8',
    at: [
      0
    ],
    name: 'auf die 1'
  },
  back128: {
    meter: '12/8',
    at: [
      18,
      54
    ],
    name: '2 und 4 (große Schläge)'
  }
};

const SONG_LEVELS = [
  {
    n: 1,
    label: 'Klare Eins: klatsch auf die 1',
    types: [
      'A'
    ],
    patterns: [
      'one4',
      'one3',
      'one68'
    ],
    bass: true,
    starts: 'beats'
  },
  {
    n: 2,
    label: 'Backbeat und Muster',
    types: [
      'A',
      'B'
    ],
    patterns: [
      'one4',
      'backbeat',
      'oneFour'
    ],
    bass: true,
    starts: 'beats'
  },
  {
    n: 3,
    label: 'Dreier: Walzer und 6/8',
    types: [
      'A',
      'B'
    ],
    patterns: [
      'one3',
      'waltzPa',
      'one68',
      'six8Back'
    ],
    bass: true,
    starts: 'beats'
  },
  {
    n: 4,
    label: 'Ohne Bass: Akkorde und Melodie',
    types: [
      'A',
      'B'
    ],
    patterns: [
      'one4',
      'backbeat',
      'oneFour',
      'one3',
      'waltzPa'
    ],
    bass: false,
    starts: 'beats'
  },
  {
    n: 5,
    label: 'Falsche Fährten',
    types: [
      'A',
      'B'
    ],
    patterns: [
      'one4',
      'oneFour',
      'push4',
      'backbeat'
    ],
    bass: true,
    starts: 'eighths'
  },
  {
    n: 6,
    label: 'Halftime, Shuffle, 12/8',
    types: [
      'A',
      'B'
    ],
    patterns: [
      'one4',
      'backbeat',
      'charleston',
      'oneFour',
      'push4',
      'one128',
      'back128'
    ],
    bass: true,
    starts: 'eighths'
  },
  {
    n: 7,
    label: 'Die Phrase finden: dein Einsatz',
    types: [
      'C',
      'A'
    ],
    patterns: [
      'one4',
      'one3',
      'one68'
    ],
    bass: true,
    starts: 'bars'
  },
  {
    n: 8,
    label: 'Glam und Taktgefühl',
    types: [
      'A',
      'B'
    ],
    patterns: [
      'one4',
      'tresillo',
      'charleston',
      'oneFour',
      'one68',
      'hemi68',
      'six8Back'
    ],
    bass: true,
    starts: 'eighths'
  }
];

const DB_SONGS = {
  fahrradkette: { name: 'Fahrradkette', style: 'Indie-Pop-Rock, gerade Achtel', family: 'indie-rock', meter: '4/4', mode: 'major', bpm: [112, 124], bars: 4, levels: [1, 2, 7], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['I', 'V', 'vi', 'IV'], drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], keys: { at: [0, 24], len: 22, voicing: 'power' }, lead: [[0, 0, 3, 18], [0, 18, 2, 6], [0, 24, 1, 24], [1, 0, 2, 30], [1, 30, 7, 6], [1, 36, 5, 12], [2, 0, 6, 24], [2, 24, 5, 12], [2, 36, 3, 12], [3, 0, 4, 24], [3, 24, 3, 12], [3, 36, 2, 12]], fill: { from: 36, kind: 'snare16' }, crash: 'period', cue: 'Der Bass wechselt auf der Eins den Ton, die Bassdrum spielt mit, und die Melodie setzt dort neu an.' },
  stadtrand: { name: 'Stadtrand', style: 'Power-Ballade', family: 'ballad', meter: '4/4', mode: 'major', bpm: [68, 78], bars: 4, levels: [1, 2, 7], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['I', 'vi', 'IV', 'V'], drums: { kick: [0, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 30], [30, '1', 6], [36, '5', 12]], keys: { at: [0, 12, 24, 36], len: 10, voicing: 'triad' }, pad: { voicing: 'open' }, lead: [[0, 0, 5, 24], [0, 24, 3, 12], [0, 36, 4, 12], [1, 0, 3, 36], [1, 36, 1, 12], [2, 0, 4, 24], [2, 24, 6, 24], [3, 0, 5, 36], [3, 36, 2, 12]], fill: { from: 24, kind: 'toms8' }, crash: 'period', cue: 'Tiefer, langer Basston und ein neuer Klavierakkord – das ist die Eins. Die Melodie beginnt jeden Takt dort mit einem langen Ton.' },
  kneipenklavier: { name: 'Kneipenklavier', style: 'Piano-Rock', family: 'piano-rock', meter: '4/4', mode: 'major', bpm: [120, 132], bars: 4, levels: [1, 2], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['I', 'IV', 'I', 'V'], drums: { kick: [0, 24], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 12], [12, '5', 12], [24, '8', 12], [36, '5', 12]], keys: { at: [0, 6, 12, 18, 24, 30, 36, 42], len: 5, voicing: 'triad' }, lead: [[0, 0, 1, 12], [0, 12, 3, 12], [0, 24, 5, 24], [1, 0, 6, 24], [1, 24, 4, 24], [2, 0, 5, 12], [2, 12, 3, 12], [2, 24, 1, 24], [3, 0, 2, 36], [3, 36, 7, 12]], fill: { from: 36, kind: 'snare8' }, crash: 'period', cue: 'Der Bass spielt auf der Eins seinen tiefsten Ton und läuft dann hoch (Grundton – Quinte – Oktave – Quinte).' },
  garagentor: { name: 'Garagentor', style: 'Garagen-Indie-Rock (Moll)', family: 'indie-rock', meter: '4/4', mode: 'minor', bpm: [116, 128], bars: 4, levels: [1, 2], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['i', 'bVI', 'bIII', 'bVII'], drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], keys: { at: [0], len: 46, voicing: 'power' }, lead: [[0, 0, 1, 6], [0, 6, 1, 6], [0, 12, 3, 6], [0, 18, 1, 6], [0, 24, 4, 12], [0, 36, 3, 12], [1, 0, 6, 24], [1, 24, 3, 24], [2, 0, 3, 12], [2, 12, 5, 12], [2, 24, 3, 24], [3, 0, 7, 24], [3, 24, 4, 12], [3, 36, 2, 12]], fill: { from: 36, kind: 'snare16' }, crash: 'period', cue: 'Die Gitarre schlägt auf der Eins einen neuen Akkord an und lässt ihn klingen; der Bass wechselt dort den Ton.' },
  lagerfeuer: { name: 'Lagerfeuer', style: 'Indie-Folk (Akustik)', family: 'folk', meter: '4/4', mode: 'major', bpm: [92, 104], bars: 4, levels: [1, 2], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['I', 'IV', 'vi', 'V'], drums: { kick: [0, 24], rim: [12, 36] }, bass: [[0, '1', 22], [24, '5', 22]], keys: { arp: [[0, '1'], [6, '5'], [12, '8'], [18, '10'], [24, '12'], [30, '10'], [36, '8'], [42, '5']] }, lead: [[0, 0, 3, 24], [0, 24, 2, 12], [0, 36, 1, 12], [1, 0, 4, 24], [1, 24, 6, 24], [2, 0, 6, 12], [2, 12, 5, 12], [2, 24, 3, 24], [3, 0, 2, 36], [3, 36, 5, 12]], crash: 'period', cue: 'Die Gitarre zupft auf der Eins den tiefsten Ton des Akkords; Bass und Bassdrum kommen dazu.' },
  leuchtturm: { name: 'Leuchtturm', style: 'Piano-Hymne', family: 'piano-rock', meter: '4/4', mode: 'major', bpm: [76, 88], bars: 4, levels: [1, 2, 7], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['vi', 'IV', 'I', 'V'], drums: { kick: [0, 24], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 46]], keys: { at: [0, 6, 12, 18, 24, 30, 36, 42], len: 5, voicing: 'triad' }, pad: { voicing: 'open' }, lead: [[0, 0, 3, 24], [0, 24, 1, 12], [0, 36, 3, 12], [1, 0, 4, 36], [1, 36, 3, 12], [2, 0, 5, 24], [2, 24, 3, 24], [3, 0, 2, 48]], fill: { from: 36, kind: 'toms16' }, crash: 'period', cue: 'Das Klavier hämmert gleichmäßig – hör auf den Akkordwechsel und den langen Basston: beide kommen nur auf der Eins.' },
  rotlicht: { name: 'Rotlicht', style: 'Indie-Rock-Riff (Moll)', family: 'indie-rock', meter: '4/4', mode: 'minor', bpm: [104, 116], bars: 4, levels: [1, 4], noBassLevels: [4], patterns: ['one4', 'backbeat'], chords: ['i', 'bVI', 'iv', 'v'], drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], keys: { at: [0], len: 46, voicing: 'power' }, lead: [[0, 0, 1, 12], [0, 12, 1, 6], [0, 18, 3, 12], [0, 30, 1, 6], [0, 36, 5, 12], [1, 0, 6, 12], [1, 12, 6, 6], [1, 18, 8, 12], [1, 30, 6, 6], [1, 36, 10, 12], [2, 0, 4, 12], [2, 12, 4, 6], [2, 18, 6, 12], [2, 30, 4, 6], [2, 36, 8, 12], [3, 0, 5, 12], [3, 12, 5, 6], [3, 18, 7, 12], [3, 30, 5, 6], [3, 36, 9, 12]], fill: { from: 36, kind: 'snare16' }, crash: 'period', cue: 'Das Riff beginnt auf der Eins immer auf dem Grundton des Akkords und klettert dann nach oben.' },
  schwarzweiss: { name: 'Schwarzweißfilm', style: 'Punk-Pop', family: 'punk', meter: '4/4', mode: 'major', bpm: [140, 156], bars: 4, levels: [2, 5], patterns: ['backbeat', 'one4', 'oneFour'], chords: ['I', 'IV', 'V', 'IV'], drums: { kick: [0, 6, 24], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], keys: { at: [0, 24], len: 22, voicing: 'power' }, lead: [[0, 0, 5, 12], [0, 12, 5, 12], [0, 24, 6, 12], [0, 36, 5, 12], [1, 0, 4, 24], [1, 24, 6, 24], [2, 0, 2, 24], [2, 24, 7, 24], [3, 0, 1, 36]], chop: [[3, 36, 5, 6, 'hey']], crash: 'period', cue: 'Schnell, aber klar: die Bassdrum spielt „1 – und“ (Bumm-bumm), die Snare antwortet auf 2 und 4.', tricky: 'schnell' },
  gummistiefel: { name: 'Gummistiefel', style: 'Stadion-Pop', family: 'stadium', meter: '4/4', mode: 'major', bpm: [100, 112], bars: 4, levels: [2, 7], patterns: ['backbeat', 'oneFour', 'one4'], chords: ['I', 'iii', 'IV', 'V'], drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42], clap: [12, 36] }, bass: [[0, '1', 18], [18, '1', 6], [24, '5', 24]], keys: { at: [0, 24], len: 22, voicing: 'triad' }, chop: [[0, 0, 3, 24, 'oh'], [0, 24, 1, 24, 'oh'], [2, 0, 4, 24, 'oh'], [2, 24, 6, 24, 'oh']], fill: { from: 24, kind: 'toms8' }, crash: 'period', cue: 'Die Snare und das Klatschen liegen auf 2 und 4 – die Eins ist der tiefe Schlag davor, mit Basston und „Oh“.' },
  nachtbus: { name: 'Nachtbus', style: 'Synth-Indie-Rock', family: 'indie-rock', meter: '4/4', mode: 'major', bpm: [116, 128], bars: 4, levels: [2, 7], patterns: ['backbeat', 'oneFour', 'one4'], chords: ['I', 'iii', 'IV', 'iv'], drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], pad: { voicing: 'open' }, lead: [[0, 0, 5, 18], [0, 18, 5, 6], [0, 24, 3, 24], [1, 0, 5, 18], [1, 18, 7, 6], [1, 24, 5, 24], [2, 0, 6, 24], [2, 24, 4, 24], [3, 0, 4, 24], [3, 24, 1, 24]], fill: { from: 36, kind: 'snare16' }, crash: 'period', cue: 'Die Synth-Fläche wechselt auf der Eins die Farbe (zuletzt nach Moll), der Bass springt mit.' },
  hafenkneipe: { name: 'Hafenkneipe', style: 'Piano-Ballade (Deutschrock)', family: 'ballad', meter: '4/4', mode: 'major', bpm: [84, 96], bars: 8, period: 4, levels: [2, 7], patterns: ['backbeat', 'oneFour', 'one4'], chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], drums: { kick: [0, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 46]], keys: { at: [0, 12, 24, 36], len: 10, voicing: 'triad' }, lead: [[0, 0, 3, 24], [0, 24, 2, 12], [0, 36, 1, 12], [1, 0, 2, 36], [1, 36, 7, 12], [2, 0, 1, 24], [2, 24, 6, 24], [3, 0, 5, 36], [3, 36, 5, 12], [4, 0, 6, 24], [4, 24, 4, 24], [5, 0, 5, 24], [5, 24, 3, 24], [6, 0, 4, 24], [6, 24, 6, 24], [7, 0, 5, 48]], fill: { from: 24, kind: 'toms8' }, crash: 'period', cue: 'Jeder Takt ein neuer Akkord, der Bass hält ihn ab der Eins. Nach dem Tom-Wirbel beginnt eine neue Zeile.' },
  tanzverbot: { name: 'Tanzverbot', style: 'Pop-Punk (Moll)', family: 'punk', meter: '4/4', mode: 'minor', bpm: [132, 144], bars: 4, levels: [2, 5], patterns: ['oneFour', 'backbeat', 'one4'], chords: ['i', 'bVII', 'bVI', 'bVII'], drums: { kick: [0, 18, 24], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], stab: { at: [0, 36], len: 4, voicing: 'power' }, lead: [[0, 0, 1, 24], [0, 24, 3, 12], [0, 36, 4, 12], [1, 0, 2, 36], [1, 36, 1, 12], [2, 0, 1, 24], [2, 24, 6, 24], [3, 0, 7, 24], [3, 24, 4, 24]], fill: { from: 36, kind: 'snare16' }, crash: 'period', cue: 'Die Gitarren-Hits kommen auf 1 und 4 – der erste davon mit neuem Akkord und tiefem Bass ist die Eins.' },
  sommerregen: { name: 'Sommerregen', style: 'Deutsch-Indie-Pop (Klavier & Stimme)', family: 'piano-rock', meter: '4/4', mode: 'major', bpm: [88, 100], bars: 4, levels: [2, 4], noBassLevels: [4], patterns: ['backbeat', 'one4', 'oneFour'], chords: ['I', 'vi', 'ii', 'V'], drums: { kick: [0, 24], snare: [12, 36], hat: [0, 12, 24, 36] }, bass: [[0, '1', 22], [24, '5', 22]], keys: { at: [0, 12, 24, 36], len: 10, voicing: 'triad' }, lead: [[0, 0, 5, 12], [0, 12, 3, 12], [0, 24, 3, 24], [1, 0, 1, 24], [1, 24, 3, 24], [2, 0, 2, 24], [2, 24, 4, 24], [3, 0, 2, 24], [3, 24, 7, 24]], crash: 'period', cue: 'Die Melodie fängt jeden Takt neu auf der Eins an; das Klavier wechselt dort den Akkord.' },
  leiserwalzer: { name: 'Leiser Walzer', style: 'Indie-Walzer', family: 'waltz', meter: '3/4', mode: 'major', bpm: [120, 138], bars: 4, levels: [3], patterns: ['one3', 'waltzPa'], chords: ['I', 'IV', 'V', 'I'], drums: { kick: [0], rim: [12, 24], hat: [0, 6, 12, 18, 24, 30] }, bass: [[0, '1', 34]], keys: { at: [12, 24], len: 10, voicing: 'triad' }, lead: [[0, 0, 3, 24], [0, 24, 4, 12], [1, 0, 6, 36], [2, 0, 5, 24], [2, 24, 2, 12], [3, 0, 1, 36]], crash: 'period', cue: 'Um-pa-pa: Bass und Bassdrum nur auf der Eins, das Klavier tupft 2 und 3.' },
  kerzenschein: { name: 'Kerzenschein', style: '6/8-Power-Ballade', family: 'six8', meter: '6/8', mode: 'major', bpm: [52, 60], bars: 4, levels: [3, 7], patterns: ['one68', 'six8Back'], chords: ['I', 'vi', 'IV', 'V'], drums: { kick: [0], snare: [18], hat: [0, 6, 12, 18, 24, 30] }, bass: [[0, '1', 16], [18, '5', 16]], keys: { arp: [[0, '1'], [6, '5'], [12, '8'], [18, '10'], [24, '8'], [30, '5']] }, lead: [[0, 0, 3, 18], [0, 18, 5, 18], [1, 0, 1, 36], [2, 0, 4, 18], [2, 18, 6, 18], [3, 0, 5, 24], [3, 24, 2, 12]], fill: { from: 18, kind: 'toms8' }, crash: 'period', cue: 'Zähl in Sechsen: Bassdrum und tiefster Gitarrenton auf 1, Snare auf 4.' },
  seemannsgarn: { name: 'Seemannsgarn', style: 'Folk-Walzer (Banjo, Stampfen)', family: 'folk', meter: '3/4', mode: 'major', bpm: [144, 160], bars: 8, period: 4, levels: [3, 7], patterns: ['one3', 'waltzPa'], chords: ['I', 'I', 'IV', 'I', 'V', 'V', 'I', 'I'], drums: { kick: [0], clap: [12, 24] }, bass: [[0, '1', 12]], keys: { arp: [[0, '1'], [6, '5'], [12, '8'], [18, '5'], [24, '10'], [30, '5']] }, lead: [[0, 0, 1, 12], [0, 12, 3, 12], [0, 24, 5, 12], [1, 0, 5, 24], [1, 24, 3, 12], [2, 0, 4, 12], [2, 12, 6, 12], [2, 24, 8, 12], [3, 0, 5, 36], [4, 0, 2, 12], [4, 12, 4, 12], [4, 24, 7, 12], [5, 0, 5, 24], [5, 24, 7, 12], [6, 0, 8, 24], [6, 24, 5, 12], [7, 0, 8, 36]], crash: 'period', cue: 'Stampfen und Bass auf der Eins, zweimal Klatschen danach; das Banjo beginnt jeden Takt unten.' },
  dachboden: { name: 'Dachboden', style: '6/8-Indie-Folk mit Toms (Moll)', family: 'six8', meter: '6/8', mode: 'minor', bpm: [60, 68], bars: 4, levels: [3, 7], patterns: ['one68', 'six8Back'], chords: ['i', 'bVI', 'bIII', 'bVII'], drums: { kick: [0], snare: [18] }, toms: [[0, 'lo'], [6, 'lo'], [12, 'mid'], [24, 'mid'], [30, 'lo']], bass: [[0, '1', 34]], pad: { voicing: 'open' }, lead: [[0, 0, 5, 18], [0, 18, 3, 18], [1, 0, 3, 36], [2, 0, 5, 18], [2, 18, 7, 18], [3, 0, 4, 36]], chop: [[0, 0, 8, 12, 'ah'], [2, 0, 5, 12, 'ah']], crash: 'period', cue: 'Die Trommeln rollen, aber der tiefe Bass und die Fläche wechseln nur auf der Eins.' },
  zuckerwatte: { name: 'Zuckerwatte', style: 'Indie-Ballade im Dreier', family: 'waltz', meter: '3/4', mode: 'major', bpm: [84, 96], bars: 4, levels: [3, 4], noBassLevels: [4], patterns: ['one3', 'waltzPa'], chords: ['I', 'iii', 'IV', 'V'], drums: { kick: [0], rim: [24], hat: [0, 12, 24] }, bass: [[0, '1', 22], [24, '5', 10]], keys: { at: [0, 12, 24], len: 10, voicing: 'triad' }, lead: [[0, 0, 5, 24], [0, 24, 3, 12], [1, 0, 5, 36], [2, 0, 6, 24], [2, 24, 4, 12], [3, 0, 2, 36]], crash: 'period', cue: 'Der Akkord wechselt auf der Eins, die Melodie hält dort ihren längsten Ton.' },
  abschlussball: { name: 'Abschlussball', style: '6/8-Doo-Wop-Ballade', family: 'six8', meter: '6/8', mode: 'major', bpm: [54, 62], bars: 4, levels: [3, 7], patterns: ['one68', 'six8Back'], chords: ['I', 'vi', 'IV', 'V'], drums: { kick: [0], snare: [18], hat: [0, 6, 12, 18, 24, 30] }, bass: [[0, '1', 16], [18, '5', 16]], keys: { at: [0, 6, 12, 18, 24, 30], len: 5, voicing: 'triad' }, lead: [[0, 0, 5, 18], [0, 18, 6, 6], [0, 24, 5, 12], [1, 0, 3, 36], [2, 0, 6, 18], [2, 18, 4, 18], [3, 0, 2, 24], [3, 24, 7, 12]], chop: [[0, 0, 3, 34, 'uh'], [1, 0, 3, 34, 'uh'], [2, 0, 4, 34, 'uh'], [3, 0, 2, 34, 'uh']], fill: { from: 24, kind: 'snare8' }, crash: 'period', cue: 'Der Hintergrundchor („Uuh“) setzt auf jeder Eins neu ein, der Bass geht Grundton – Quinte.' },
  glasdach: { name: 'Glasdach', style: 'Piano-Indie (Stadionballade)', family: 'piano-rock', meter: '4/4', mode: 'major', bpm: [72, 84], bars: 4, levels: [1, 4], noBassLevels: [4], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['I', 'iii', 'vi', 'IV'], drums: { kick: [0, 24], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 46]], keys: { at: [0, 6, 12, 18, 24, 30, 36, 42], len: 5, voicing: 'triad' }, pad: { voicing: 'open' }, lead: [[0, 0, 3, 36], [0, 36, 2, 12], [1, 0, 3, 24], [1, 24, 5, 24], [2, 0, 6, 24], [2, 24, 5, 12], [2, 36, 3, 12], [3, 0, 4, 48]], crash: 'period', cue: 'Ohne Bass: Hör auf das Klavier – es spielt gleichmäßige Achtel, aber der Akkord wechselt nur auf der Eins. Die Melodie beginnt dort.' },
  papierflieger: { name: 'Papierflieger', style: 'Akustik-Indie (Picking)', family: 'folk', meter: '4/4', mode: 'major', bpm: [96, 108], bars: 4, levels: [4], noBassLevels: [4], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['I', 'IV', 'ii', 'V'], drums: { kick: [0, 24], rim: [12, 36] }, bass: [[0, '1', 22], [24, '5', 22]], keys: { arp: [[0, '1'], [6, '5'], [12, '10'], [18, '5'], [24, '8'], [30, '5'], [36, '10'], [42, '5']] }, lead: [[0, 0, 5, 12], [0, 12, 3, 12], [0, 24, 1, 24], [1, 0, 4, 12], [1, 12, 6, 12], [1, 24, 4, 24], [2, 0, 2, 24], [2, 24, 4, 12], [2, 36, 6, 12], [3, 0, 5, 36], [3, 36, 7, 12]], crash: 'period', cue: 'Die Gitarre zupft auf der Eins den tiefsten Ton (Grundton), auf der 3 nur die Oktave darüber.' },
  kopfstein: { name: 'Kopfsteinpflaster', style: 'Piano-Rock (Deutschrock)', family: 'piano-rock', meter: '4/4', mode: 'major', bpm: [112, 124], bars: 4, levels: [2, 4], noBassLevels: [4], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['vi', 'IV', 'I', 'V'], drums: { kick: [0, 24], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 12], [12, '5', 12], [24, '8', 12], [36, '5', 12]], keys: { at: [0, 12, 24, 36], len: 10, voicing: 'triad' }, lead: [[0, 0, 6, 12], [0, 12, 6, 12], [0, 24, 5, 12], [0, 36, 3, 12], [1, 0, 4, 24], [1, 24, 6, 24], [2, 0, 5, 12], [2, 12, 5, 12], [2, 24, 3, 24], [3, 0, 2, 24], [3, 24, 5, 24]], fill: { from: 36, kind: 'snare8' }, crash: 'period', cue: 'Das Klavier spielt Viertel, die Melodie startet jeden Takt auf der Eins mit einer neuen Zeile.' },
  morgengrauen: { name: 'Morgengrauen', style: 'Ambient-Indie', family: 'indie-rock', meter: '4/4', mode: 'major', bpm: [84, 96], bars: 4, levels: [4, 7], noBassLevels: [4], patterns: ['one4', 'backbeat'], chords: ['IV', 'I', 'V', 'vi'], drums: { kick: [0, 24], snare: [12, 36], hat: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45] }, bass: [[0, '1', 46]], pad: { voicing: 'open' }, keys: { arp: [[0, '1'], [12, '5'], [24, '8'], [36, '10']] }, lead: [[0, 0, 6, 36], [0, 36, 5, 12], [1, 0, 5, 24], [1, 24, 3, 24], [2, 0, 2, 24], [2, 24, 7, 24], [3, 0, 1, 48]], fill: { from: 36, kind: 'toms16' }, crash: 'period', cue: 'Das Klavier steigt jeden Takt von unten nach oben – der tiefste Ton ist die Eins. Die Fläche wechselt dort.' },
  altbau: { name: 'Altbau', style: 'Deutsch-Indie (Klavier, raue Stimme)', family: 'piano-rock', meter: '4/4', mode: 'major', bpm: [80, 92], bars: 4, levels: [4], noBassLevels: [4], patterns: ['one4', 'backbeat', 'oneFour'], chords: ['I', 'V', 'ii', 'IV'], drums: { kick: [0, 24], snare: [12, 36], hat: [0, 12, 24, 36] }, bass: [[0, '1', 22], [24, '5', 22]], keys: { at: [0, 24, 30], len: 6, voicing: 'triad' }, lead: [[0, 0, 3, 24], [0, 24, 5, 24], [1, 0, 5, 24], [1, 24, 2, 24], [2, 0, 4, 24], [2, 24, 2, 24], [3, 0, 6, 24], [3, 24, 4, 24]], crash: 'period', cue: 'Das Klavier spielt „1 – 3 und“: der einzelne Anschlag ist die Eins, das Doppel ist die 3.' },
  discokugel: { name: 'Discokugel', style: 'Disco-Indie (Four-on-the-floor)', family: 'disco', meter: '4/4', mode: 'major', bpm: [116, 126], bars: 4, levels: [5, 7], patterns: ['one4', 'oneFour', 'backbeat'], chords: ['vi', 'IV', 'I', 'V'], drums: { kick: [0, 12, 24, 36], snare: [12, 36], clap: [12, 36], open: [6, 18, 30, 42] }, bass: [[0, '1', 6], [6, '8', 6], [12, '1', 6], [18, '8', 6], [24, '1', 6], [30, '8', 6], [36, '1', 6], [42, '8', 6]], stab: { at: [6, 18, 30, 42], len: 3, voicing: 'triad' }, lead: [[0, 0, 6, 24], [0, 24, 5, 12], [0, 36, 3, 12], [1, 0, 4, 36], [1, 36, 6, 12], [2, 0, 5, 24], [2, 24, 3, 24], [3, 0, 2, 36], [3, 36, 7, 12]], fill: { from: 36, kind: 'snare16' }, crash: 'period', cue: 'Die Bassdrum spielt jeden Schlag – sie hilft nicht. Hör auf den Bass: er springt in Oktaven und wechselt auf der Eins den Ton.', tricky: 'Bassdrum auf jedem Schlag' },
  holzfaeller: { name: 'Holzfällerhemd', style: 'Indie-Folk-Stomp', family: 'folk', meter: '4/4', mode: 'major', bpm: [120, 132], bars: 4, levels: [5, 7], patterns: ['one4', 'oneFour', 'backbeat'], chords: ['I', 'IV', 'I', 'V'], drums: { kick: [0, 12, 24, 36], clap: [12, 36] }, bass: [[0, '1', 12], [12, '1', 12], [24, '1', 12], [36, '1', 12]], keys: { arp: [[0, '8'], [6, '5'], [12, '10'], [18, '5'], [24, '8'], [30, '5'], [36, '10'], [42, '5']] }, lead: [[0, 0, 3, 24], [0, 24, 5, 24], [1, 0, 6, 24], [1, 24, 4, 12], [2, 0, 5, 12], [2, 12, 3, 12], [2, 24, 1, 24], [3, 0, 2, 36]], chop: [[1, 36, 5, 6, 'hey'], [3, 36, 5, 6, 'hey']], crash: 'period', cue: 'Stampfen auf jedem Schlag. Das „Hey!“ kommt auf der 4 – die Eins ist gleich danach, mit neuem Akkord.', tricky: 'Stampfen auf jedem Schlag' },
  vorstadtfunk: { name: 'Vorstadtfunk', style: 'Indie-Funk, vorgezogen', family: 'disco', meter: '4/4', mode: 'major', bpm: [96, 108], bars: 4, push: 6, levels: [5, 6], patterns: ['one4', 'push4', 'backbeat'], chords: ['I', 'IV', 'vi', 'V'], drums: { kick: [18, 42], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[-6, '1', 30], [30, '5', 12]], keys: { at: [18, 42], len: 6, voicing: 'triad' }, lead: [[0, 0, 3, 36], [1, 0, 6, 36], [2, 0, 8, 36], [3, 0, 7, 24], [3, 24, 5, 12]], crash: 'period', cue: 'Bass und Akkorde kommen eine Achtel zu früh (auf 4+). Die Eins verrät die Melodie: Sie setzt genau dort mit einem langen Ton ein.', tricky: 'Bass vorgezogen' },
  auftakthymne: { name: 'Auftakt-Hymne', style: 'Pop-Rock mit Auftakt-Melodie', family: 'stadium', meter: '4/4', mode: 'major', bpm: [84, 96], bars: 4, levels: [5], patterns: ['one4', 'oneFour'], chords: ['I', 'IV', 'V', 'I'], drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 22], [24, '5', 22]], keys: { at: [0, 24], len: 22, voicing: 'triad' }, lead: [[0, 0, 8, 36], [1, 0, 6, 24], [1, 24, 3, 6], [1, 30, 4, 6], [1, 36, 5, 12], [2, 0, 7, 36], [3, 0, 1, 24], [3, 24, 5, 6], [3, 30, 6, 6], [3, 36, 7, 12]], crash: 'period', cue: 'Die Melodie holt mit drei Tönen Anlauf (3 – und – 4). Die Eins ist der lange Ton danach, mit neuem Akkord und Bass.', tricky: 'Melodie mit Auftakt' },
  neonlicht: { name: 'Neonlicht', style: 'Synth-Indie, Four-on-the-floor (Moll)', family: 'disco', meter: '4/4', mode: 'minor', bpm: [128, 136], bars: 4, levels: [5, 6], patterns: ['one4', 'oneFour', 'backbeat'], chords: ['i', 'bVII', 'bVI', 'bVII'], drums: { kick: [0, 12, 24, 36], clap: [12, 36], open: [6, 18, 30, 42] }, bass: [[0, '1', 6], [6, '8', 6], [12, '1', 6], [18, '8', 6], [24, '1', 6], [30, '8', 6], [36, '1', 6], [42, '8', 6]], pad: { voicing: 'open' }, lead: [[0, 0, 1, 6], [0, 6, 3, 6], [0, 12, 5, 6], [0, 18, 8, 6], [0, 24, 5, 6], [0, 30, 3, 6], [0, 36, 1, 12], [1, 0, 7, 6], [1, 6, 9, 6], [1, 12, 11, 6], [1, 18, 14, 6], [1, 24, 11, 6], [1, 30, 9, 6], [1, 36, 7, 12], [2, 0, 6, 6], [2, 6, 8, 6], [2, 12, 10, 6], [2, 18, 13, 6], [2, 24, 10, 6], [2, 30, 8, 6], [2, 36, 6, 12], [3, 0, 7, 6], [3, 6, 9, 6], [3, 12, 11, 6], [3, 18, 14, 6], [3, 24, 11, 6], [3, 30, 9, 6], [3, 36, 7, 12]], fill: { from: 36, kind: 'snare16' }, crash: 'period', cue: 'Bassdrum auf jedem Schlag. Das Synth-Arpeggio startet auf der Eins unten, klettert hoch und kommt wieder herunter.', tricky: 'Bassdrum auf jedem Schlag' },
  bahnsteig: { name: 'Bahnsteig', style: 'Indie-Rock, Riff mit Anlauf', family: 'indie-rock', meter: '4/4', mode: 'major', bpm: [120, 132], bars: 4, levels: [5], patterns: ['one4', 'push4', 'backbeat'], chords: ['I', 'V', 'IV', 'I'], drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], keys: { at: [0, 24], len: 22, voicing: 'power' }, lead: [[3, 42, 7, 6], [0, 0, 8, 12], [0, 18, 8, 6], [0, 24, 10, 12], [0, 42, 4, 6], [1, 0, 5, 12], [1, 18, 5, 6], [1, 24, 7, 12], [1, 42, 3, 6], [2, 0, 4, 12], [2, 18, 4, 6], [2, 24, 6, 12], [2, 42, 7, 6], [3, 0, 8, 12], [3, 18, 8, 6], [3, 24, 10, 12]], fill: { from: 36, kind: 'snare8' }, crash: 'period', cue: 'Das Gitarrenriff beginnt eine Achtel vor der Eins. Die Eins ist der Ton, auf dem es landet – zusammen mit Bassdrum und neuem Basston.', tricky: 'Riff mit Anlauf' },
  bruecke: { name: 'Brücke', style: 'Halftime-Bridge (Stadion)', family: 'stadium', meter: '4/4', mode: 'major', bpm: [128, 140], bars: 4, levels: [6, 7], patterns: ['one4', 'backbeat', 'charleston'], chords: ['vi', 'IV', 'I', 'V'], drums: { kick: [0, 30], snare: [24], hat: [0, 12, 24, 36] }, bass: [[0, '1', 46]], pad: { voicing: 'open' }, chop: [[0, 0, 6, 24, 'whoa'], [0, 24, 3, 24, 'oh'], [2, 0, 5, 24, 'whoa'], [2, 24, 3, 24, 'oh']], fill: { from: 24, kind: 'toms8' }, crash: 'period', cue: 'Die Snare kommt nur einmal im Takt, auf der 3. Die Eins ist zwei Schläge davor: tiefer Bass, neue Fläche, „Whoa“.', tricky: 'Halftime' },
  rueckspiegel: { name: 'Rückspiegel', style: 'Rockabilly-Shuffle (Deutschrock)', family: 'shuffle', meter: '4/4', mode: 'major', bpm: [120, 136], bars: 8, period: 4, levels: [6], patterns: ['one4', 'backbeat', 'charleston'], chords: ['I', 'I', 'IV', 'I', 'V', 'IV', 'I', 'V'], drums: { kick: [0, 24], snare: [12, 36], hat: [0, 8, 12, 20, 24, 32, 36, 44], swing: true }, bass: [[0, '1', 12], [12, '3', 12], [24, '5', 12], [36, '6', 12]], stab: { at: [20, 44], len: 3, voicing: 'triad' }, lead: [[0, 0, 3, 24], [0, 24, 5, 24], [2, 0, 6, 24], [2, 24, 4, 24], [4, 0, 5, 24], [4, 24, 2, 24], [6, 0, 3, 24], [6, 24, 1, 24]], fill: { from: 36, kind: 'snare8' }, crash: 'period', cue: 'Der Bass läuft in Vierteln Stufe für Stufe hoch – er beginnt auf der Eins immer mit dem Grundton.' },
  wolkenkratzer: { name: 'Wolkenkratzer', style: '12/8-Power-Ballade (bluesig)', family: 'twelve8', meter: '12/8', mode: 'major', bpm: [56, 64], bars: 4, levels: [6], patterns: ['one128', 'back128'], chords: ['I', 'IV', 'I', 'V'], drums: { kick: [0, 42], snare: [18, 54], hat: [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66] }, bass: [[0, '1', 34], [36, '5', 34]], keys: { at: [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66], len: 5, voicing: 'triad' }, lead: [[0, 0, 3, 36], [0, 36, 5, 36], [1, 0, 6, 36], [1, 36, 4, 36], [2, 0, 5, 36], [2, 36, 3, 36], [3, 0, 2, 54], [3, 54, 7, 18]], fill: { from: 54, kind: 'toms8' }, crash: 'period', cue: 'Vier große Schläge zu je drei Achteln. Die Snare liegt auf 2 und 4 – die Eins ist der tiefe Schlag davor, mit neuem Akkord.' },
  gegenwind: { name: 'Gegenwind', style: 'Halftime-Stadion mit Toms (Moll)', family: 'stadium', meter: '4/4', mode: 'minor', bpm: [120, 132], bars: 4, levels: [6, 7], patterns: ['one4', 'backbeat', 'charleston'], chords: ['i', 'bVI', 'bIII', 'bVII'], drums: { kick: [0, 30], snare: [24] }, toms: [[0, 'lo'], [6, 'lo'], [18, 'mid'], [36, 'lo'], [42, 'mid']], bass: [[0, '1', 46]], pad: { voicing: 'open' }, lead: [[0, 0, 1, 24], [0, 24, 3, 24], [1, 0, 1, 48], [2, 0, 5, 24], [2, 24, 3, 24], [3, 0, 4, 24], [3, 24, 2, 24]], chop: [[3, 36, 5, 6, 'hey']], crash: 'period', cue: 'Die Trommeln donnern, die Snare kommt nur auf der 3. Die Eins: tiefer Basston, Doppelschlag der Standtom.', tricky: 'Halftime' },
  katerstimmung: { name: 'Katerstimmung', style: 'Shuffle-Indie (Moll)', family: 'shuffle', meter: '4/4', mode: 'minor', bpm: [96, 108], bars: 4, levels: [6], patterns: ['one4', 'backbeat', 'charleston'], chords: ['i', 'bVII', 'bVI', 'V7'], drums: { kick: [0, 24, 32], snare: [12, 36], hat: [0, 8, 12, 20, 24, 32, 36, 44], swing: true }, bass: [[0, '1', 12], [12, '5', 12], [24, '8', 12], [36, '5', 12]], keys: { at: [20, 44], len: 3, voicing: 'triad' }, lead: [[0, 0, 5, 24], [0, 24, 3, 24], [1, 0, 4, 24], [1, 24, 2, 24], [2, 0, 3, 24], [2, 24, 1, 24], [3, 0, 2, 36]], crash: 'period', cue: 'Die Achtel hinken (lang–kurz). Der Bass springt auf der Eins nach unten auf den Grundton, die Bassdrum stolpert nur in die 3 hinein.' },
  doppeltezeit: { name: 'Doppelte Zeit', style: 'Polka-Punk (Humppa)', family: 'punk', meter: '4/4', mode: 'major', bpm: [100, 112], bars: 4, levels: [6, 8], patterns: ['one4', 'oneFour', 'charleston'], chords: ['I', 'V', 'IV', 'I'], drums: { kick: [0, 12, 24, 36], snare: [6, 18, 30, 42] }, bass: [[0, '1', 6], [12, '5', 6], [24, '1', 6], [36, '5', 6]], keys: { at: [6, 18, 30, 42], len: 4, voicing: 'triad' }, lead: [[0, 0, 1, 12], [0, 12, 3, 12], [0, 24, 5, 24], [1, 0, 7, 24], [1, 24, 5, 24], [2, 0, 6, 24], [2, 24, 4, 24], [3, 0, 3, 24], [3, 24, 1, 24]], crash: 'period', cue: 'Snare auf jedem „und“ – das fühlt sich doppelt so schnell an. Zähl langsam: die Eins ist dort, wo die Melodie neu anfängt und der Akkord wechselt.', tricky: 'Doppelzeit-Gefühl' },
  whoaoh: { name: 'Whoa-oh', style: 'Stadion-Hymne', family: 'stadium', meter: '4/4', mode: 'major', bpm: [104, 116], bars: 8, period: 4, levels: [7, 2], patterns: ['backbeat', 'one4'], chords: ['I', 'V', 'vi', 'IV', 'I', 'V', 'vi', 'IV'], drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42], clap: [12, 36] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], pad: { voicing: 'open' }, chop: [[0, 0, 5, 18, 'whoa'], [0, 18, 5, 6, 'o'], [0, 24, 6, 12, 'oh'], [0, 36, 5, 12, 'oh'], [2, 0, 3, 24, 'whoa'], [2, 24, 1, 24, 'oh'], [4, 0, 5, 18, 'whoa'], [4, 18, 5, 6, 'o'], [4, 24, 6, 12, 'oh'], [4, 36, 5, 12, 'oh'], [6, 0, 3, 24, 'whoa'], [6, 24, 1, 24, 'oh']], fill: { from: 24, kind: 'toms8' }, crash: 'period', entry: [[0, 12], [12, 12], [24, 24]], cue: 'Nach dem Tom-Wirbel kommt ein Becken – dort beginnt die neue Zeile, das „Whoa-oh“ geht wieder los.' },
  feuerwerk: { name: 'Feuerwerk', style: 'Pop-Rock-Aufbau', family: 'stadium', meter: '4/4', mode: 'major', bpm: [112, 124], bars: 4, levels: [7], patterns: ['one4'], chords: ['I', 'iii', 'IV', 'V'], drums: { kick: [0, 12, 24, 36] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], keys: { at: [0, 24], len: 22, voicing: 'power' }, lead: [[0, 0, 5, 48], [1, 0, 7, 48], [2, 0, 6, 48], [3, 0, 5, 24], [3, 24, 2, 24]], fill: { from: 24, kind: 'snare16' }, crash: 'period', entry: [[0, 24], [24, 24]], cue: 'Drei Takte nur Bassdrum, dann ein Snare-Wirbel – die neue Zeile beginnt mit dem Becken danach.' },
  klavierintro: { name: 'Klavierintro', style: 'Piano-Rock-Intro', family: 'piano-rock', meter: '4/4', mode: 'major', bpm: [96, 108], bars: 4, levels: [7], patterns: ['one4', 'backbeat'], chords: ['I', 'vi', 'IV', 'V'], drums: { kick: [0, 24], snare: [12, 36], hat: [0, 12, 24, 36] }, bass: [[0, '1', 12], [12, '5', 12], [24, '8', 12], [36, '5', 12]], keys: { at: [0, 6, 12, 18, 24, 30, 36, 42], len: 5, voicing: 'triad' }, lead: [[0, 0, 8, 24], [3, 24, 5, 6], [3, 30, 6, 6], [3, 36, 7, 12]], fill: { from: 36, kind: 'stop' }, crash: 'period', entry: [[0, 12], [12, 12], [24, 24]], cue: 'Auf der 4 des letzten Takts hört die Band auf, nur das Klavier läuft hoch – die nächste Eins ist dein Einsatz.' },
  mitsingrefrain: { name: 'Mitsingrefrain', style: 'Indie-Folk-Stomp', family: 'folk', meter: '4/4', mode: 'major', bpm: [116, 128], bars: 8, period: 4, levels: [7, 5], patterns: ['one4', 'oneFour'], chords: ['I', 'IV', 'vi', 'V', 'I', 'IV', 'V', 'I'], drums: { kick: [0, 12, 24, 36], clap: [12, 36] }, bass: [[0, '1', 12], [12, '1', 12], [24, '1', 12], [36, '1', 12]], keys: { arp: [[0, '8'], [6, '5'], [12, '10'], [18, '5'], [24, '8'], [30, '5'], [36, '10'], [42, '5']] }, lead: [[0, 0, 3, 24], [0, 24, 5, 24], [1, 0, 6, 24], [1, 24, 4, 24], [2, 0, 3, 24], [2, 24, 1, 24], [3, 0, 2, 36], [4, 0, 3, 24], [4, 24, 5, 24], [5, 0, 6, 24], [5, 24, 8, 24], [6, 0, 7, 24], [6, 24, 5, 24], [7, 0, 8, 36]], chop: [[3, 36, 5, 6, 'hey'], [7, 36, 5, 6, 'hey']], crash: 'period', entry: [[0, 12], [12, 12], [24, 24]], cue: 'Jede Zeile endet mit „Hey!“ auf der 4 – danach beginnt die nächste Zeile, mit Becken.', tricky: 'Stampfen auf jedem Schlag' },
  festivalwiese: { name: 'Festivalwiese', style: 'Stadion-Indie mit „Oh-oh“', family: 'stadium', meter: '4/4', mode: 'major', bpm: [120, 132], bars: 4, levels: [7], patterns: ['one4', 'backbeat'], chords: ['IV', 'I', 'V', 'vi'], drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], pad: { voicing: 'open' }, chop: [[0, 0, 6, 12, 'oh'], [0, 12, 8, 12, 'oh'], [0, 24, 6, 24, 'oh'], [2, 0, 7, 12, 'oh'], [2, 12, 5, 12, 'oh'], [2, 24, 2, 24, 'oh']], fill: { from: 36, kind: 'toms16' }, crash: 'period', entry: [[0, 12], [12, 12], [24, 24]], cue: 'Der Chor singt „Oh-oh-oh“ am Anfang jeder Zeile; davor rollen die Toms.' },
  anlauf: { name: 'Anlauf', style: '6/8-Ballade', family: 'six8', meter: '6/8', mode: 'major', bpm: [56, 64], bars: 4, levels: [7, 3], patterns: ['one68', 'six8Back'], chords: ['I', 'iii', 'IV', 'V'], drums: { kick: [0], snare: [18], hat: [0, 6, 12, 18, 24, 30] }, bass: [[0, '1', 34]], keys: { arp: [[0, '1'], [6, '5'], [12, '8'], [18, '10'], [24, '8'], [30, '5']] }, lead: [[0, 0, 5, 36], [1, 0, 5, 18], [1, 18, 3, 18], [2, 0, 4, 18], [2, 18, 6, 18], [3, 0, 5, 36]], fill: { from: 18, kind: 'toms8' }, crash: 'period', entry: [[0, 18], [18, 18]], cue: 'Am Ende jeder Zeile rollen die Toms über 4–5–6; dein Einsatz kommt mit dem Becken danach.' },
  operettenhaus: { name: 'Operettenhaus', style: 'Glam-Rock-Klavierballade', family: 'glam', meter: '4/4', mode: 'major', bpm: [76, 88], bars: 4, levels: [8], patterns: ['tresillo', 'one4', 'charleston'], chords: ['I', 'iii', 'IV', 'iv'], drums: { kick: [0, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 18], [18, '1', 18], [36, '5', 12]], keys: { at: [0, 18, 36], len: 14, voicing: 'triad' }, lead: [[0, 0, 5, 36], [0, 36, 6, 12], [1, 0, 5, 24], [1, 24, 7, 24], [2, 0, 6, 36], [2, 36, 4, 12], [3, 0, 4, 24], [3, 24, 8, 24]], crash: 'period', cue: 'Das Klavier spielt 3+3+2 (1 – 2+ – 4). Die Eins ist der erste Anschlag der Gruppe, mit tiefem Bass; am Ende wird es Moll.', tricky: '3+3+2-Klavier' },
  maskenball: { name: 'Maskenball', style: 'Glam-Walzer: 6/8 gegen 3/4', family: 'glam', meter: '6/8', mode: 'major', bpm: [56, 64], bars: 4, levels: [8], patterns: ['one68', 'hemi68', 'six8Back'], chords: ['I', 'V', 'vi', 'IV'], drums: { kick: [0], snare: [18], hat: [0, 6, 12, 18, 24, 30] }, bass: [[0, '1', 34]], keys: { at: [0, 12, 24], len: 10, voicing: 'triad' }, lead: [[0, 0, 3, 12], [0, 12, 4, 12], [0, 24, 5, 12], [1, 0, 5, 24], [1, 24, 2, 12], [2, 0, 1, 12], [2, 12, 3, 12], [2, 24, 6, 12], [3, 0, 4, 36]], crash: 'period', cue: 'Das Schlagzeug zählt 6 (1 und 4), das Klavier zählt 3 (1, 2, 3). Beide beginnen auf derselben Eins – dort, wo der Bass einsetzt.', tricky: '6/8 gegen 3/4' },
  kronleuchter: { name: 'Kronleuchter', style: 'Glam-Rock mit Stop-Time', family: 'glam', meter: '4/4', mode: 'major', bpm: [92, 104], bars: 4, levels: [8], patterns: ['one4', 'charleston', 'oneFour'], chords: ['I', 'I', 'IV', 'V'], drums: { kick: [0], hat: [0, 12, 24, 36] }, bass: [[0, '1', 6]], stab: { at: [0], len: 6, voicing: 'power' }, var: { 3: { drums: { kick: [0, 24, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 6], [6, '1', 6], [12, '1', 6], [18, '1', 6], [24, '1', 6], [30, '1', 6], [36, '1', 6], [42, '1', 6]], stab: { at: [0, 12, 24, 36], len: 6, voicing: 'power' } } }, lead: [[0, 12, 5, 6], [0, 18, 5, 6], [0, 24, 6, 12], [0, 36, 5, 12], [1, 12, 3, 12], [1, 24, 2, 12], [1, 36, 1, 12], [2, 12, 4, 12], [2, 24, 6, 12], [2, 36, 4, 12], [3, 0, 5, 24], [3, 24, 7, 24]], crash: 'period', cue: 'Stop-Time: Die Band schlägt nur auf der Eins zu, dazwischen singt die Melodie allein. Erst im vierten Takt rockt alles durch.', tricky: 'Stop-Time (Stille zwischen den Schlägen)' },
  galopp: { name: 'Galopp', style: 'Operetten-Galopp (Glam)', family: 'glam', meter: '4/4', mode: 'major', bpm: [132, 144], bars: 4, levels: [8], patterns: ['one4', 'charleston', 'oneFour'], chords: ['I', 'V7', 'I', 'V7'], drums: { kick: [0, 12, 24, 36], snare: [6, 18, 30, 42] }, bass: [[0, '1', 6], [12, '5', 6], [24, '8', 6], [36, '5', 6]], stab: { at: [6, 18, 30, 42], len: 3, voicing: 'triad' }, lead: [[0, 0, 8, 6], [0, 6, 7, 6], [0, 12, 6, 6], [0, 18, 5, 6], [0, 24, 4, 6], [0, 30, 3, 6], [0, 36, 2, 12], [1, 0, 5, 12], [1, 12, 7, 12], [1, 24, 2, 12], [1, 36, 4, 12], [2, 0, 3, 6], [2, 6, 4, 6], [2, 12, 5, 6], [2, 18, 6, 6], [2, 24, 7, 6], [2, 30, 8, 6], [2, 36, 8, 12], [3, 0, 7, 24], [3, 24, 2, 24]], crash: 'period', cue: 'Galopp: „Bum-tschak“ auf jedem Schlag. Die Melodie stürzt auf der Eins von ganz oben herunter bzw. landet dort.', tricky: 'Doppelzeit-Gefühl' },
  dreigegenvier: { name: 'Drei gegen Vier', style: 'Indie-Rock 3-3-2', family: 'indie-rock', meter: '4/4', mode: 'major', bpm: [108, 120], bars: 4, levels: [8], patterns: ['tresillo', 'charleston', 'one4'], chords: ['vi', 'V', 'IV', 'V'], drums: { kick: [0, 18, 36], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 18], [18, '1', 18], [36, '5', 12]], keys: { at: [0, 18, 36], len: 16, voicing: 'power' }, lead: [[0, 0, 6, 18], [0, 18, 3, 18], [0, 36, 1, 12], [1, 0, 5, 18], [1, 18, 7, 18], [1, 36, 5, 12], [2, 0, 4, 18], [2, 18, 6, 18], [2, 36, 8, 12], [3, 0, 7, 36], [3, 36, 5, 12]], fill: { from: 36, kind: 'snare16' }, crash: 'period', cue: 'Gitarre, Bass und Bassdrum spielen 3+3+2 – die Gruppe beginnt auf der Eins; die Snare bleibt auf 2 und 4.', tricky: '3+3+2' },
  opernteil: { name: 'Opernteil', style: 'Opern-Rock (Chor-„Ah“, Akkordrückungen)', family: 'glam', meter: '4/4', mode: 'major', bpm: [70, 80], bars: 4, levels: [8], patterns: ['charleston', 'one4'], chords: ['I', 'bVI', 'bVII', 'V'], drums: { kick: [0, 30], snare: [12, 36], hat: [0, 6, 12, 18, 24, 30, 36, 42] }, bass: [[0, '1', 18], [18, '1', 30]], keys: { at: [0, 24], len: 22, voicing: 'triad' }, stab: { at: [0, 18], len: 4, voicing: 'triad' }, lead: [[0, 0, 5, 24], [0, 24, 3, 24], [1, 0, 8, 48], [2, 0, 4, 24], [2, 24, 2, 24], [3, 0, 2, 24], [3, 24, 7, 24]], chop: [[0, 0, 3, 36, 'ah'], [1, 0, 1, 36, 'ah'], [2, 0, 2, 36, 'ah'], [3, 0, 7, 36, 'ah']], crash: 'period', cue: 'Der Chor setzt mit „Ah“ auf jeder Eins neu ein, die Orchester-Schläge kommen auf 1 und 2+.', tricky: 'Akkordrückungen' },
};

/* ---- Referenz: Ereignisse und Fairness (rein, für Planer und Selbsttest) ---- */
// Referenz-Implementierung (rein, ohne DOM/Audio): Song -> Ereignisliste, Fairness-Prüfung.
// Wird 1:1 in songs.js mit ausgegeben.

const SONG_METERS = {
  '4/4': { ticks: 48, unit: 12 },
  '3/4': { ticks: 36, unit: 12 },
  '6/8': { ticks: 36, unit: 6 },
  '12/8': { ticks: 72, unit: 6 },
};
const ROMAN = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const REL = { '1': 0, '2': 2, 'b3': 3, '3': null, '4': 5, '5': 7, '6': 9, 'b7': 10, '7': 11, '8': 12, '10': null, '12': 19, '-1': -1, '-2': -2, '-3': -3 };

/** Akkordsymbol in Stufen (immer relativ zur Dur-Tonleiter der Grundtonart):
 *  „I“, „vi“, „bVII“, „V7“, „iv“, „IVsus“ … → { root, third, seventh }. */
function parseChord(sym) {
  const m = /^([b#]?)([ivIV]+)(.*)$/.exec(sym);
  if (!m) throw new Error(`Akkord? ${sym}`);
  const acc = m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0;
  const up = m[2].toUpperCase();
  const root = (ROMAN[up] + acc + 12) % 12;
  const minor = m[2] !== up;
  const suf = m[3];
  return { root, third: suf.includes('sus') ? 5 : minor ? 3 : 4, seventh: suf.includes('maj7') ? 11 : suf.includes('7') ? 10 : null, sym };
}
function chordPcs(c, voicing = 'triad') {
  if (voicing === 'power') return [c.root, c.root + 7, c.root + 12];
  const t = [c.root, c.root + c.third, c.root + 7];
  if (c.seventh !== null) t.push(c.root + c.seventh);
  if (voicing === 'open') return [c.root - 12, c.root + 7, c.root + 12 + c.third];
  return t;
}
/** Ton relativ zum Akkord: '1','3','5','8','b7','6','10','-2' … ('3'/'10' = Akkordterz). */
function relPitch(c, rel) {
  if (rel === '3') return c.root + c.third;
  if (rel === '10') return c.root + 12 + c.third;
  if (!(rel in REL)) throw new Error(`Ton? ${rel}`);
  return c.root + REL[rel];
}
function scalePitch(mode, deg) {
  const s = SCALE[mode];
  const i = deg - 1;
  return s[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);
}
/** Akkord-Zeitleiste der Schleife: [{ t, chord }], t in Ticks ab Schleifenbeginn (vorgezogen: push). */
function chordLine(song) {
  const bar = SONG_METERS[song.meter].ticks, L = bar * song.bars;
  const out = [];
  song.chords.forEach((c, b) => {
    const list = typeof c === 'string' ? [[0, c]] : Array.isArray(c[0]) ? c : c.map((s, i) => [i * bar / c.length, s]);
    for (const [t, s] of list) out.push({ t: (((b * bar + t - (song.push || 0)) % L) + L) % L, chord: parseChord(s) });
  });
  return out.sort((a, b) => a.t - b.t);
}
function chordAt(line, t, L) {
  const tt = ((t % L) + L) % L;
  let cur = line[line.length - 1];
  for (const x of line) if (x.t <= tt) cur = x;
  return cur.chord;
}
const DRUM_KINDS = ['kick', 'snare', 'rim', 'clap', 'hat', 'open', 'block'];
/** Ereignisse einer Schleife. opts: bass (false = stumm), phrase (Fill/Crash/Variationen), weak (Hi-Hat/offene HH).
 *  → [{ t, kind, p }] (p: Tonhöhe bzw. Tonklassen-Liste als Text). */
function songEvents(song, { bass = true, phrase = true, weak = true } = {}) {
  const m = SONG_METERS[song.meter], bar = m.ticks, L = bar * song.bars, period = song.period || song.bars;
  const line = chordLine(song);
  const ev = [];
  const add = (t, kind, p = '') => ev.push({ t: ((t % L) + L) % L, kind, p: String(p) });
  for (let b = 0; b < song.bars; b++) {
    const v = (phrase && song.var && song.var[b]) || {};
    const d = { ...song.drums, ...(v.drums || {}) };
    const fill = phrase && song.fill && b % period === period - 1 ? song.fill : null;
    const cut = fill ? fill.from : bar; // ab hier spielt der Fill statt des Grooves
    const stop = fill && fill.kind === 'stop';
    for (const k of DRUM_KINDS) {
      if (!weak && (k === 'hat' || k === 'open')) continue;
      for (const t of d[k] || []) if (t < cut) add(b * bar + t, k);
    }
    const toms = v.toms || song.toms || [];
    for (const [t, h] of toms) if (t < cut) add(b * bar + t, 'tom', h);
    if (fill && !stop) {
      const step = fill.kind.endsWith('16') ? 3 : 6;
      const n = (bar - fill.from) / step;
      for (let i = 0; i < n; i++) {
        const t = fill.from + i * step;
        if (fill.kind.startsWith('toms')) add(b * bar + t, 'tom', ['hi', 'mid', 'lo'][Math.min(2, Math.floor(3 * i / n))]);
        else add(b * bar + t, 'snare', 'fill');
      }
    }
    if (phrase && (song.crash === 'bar' || (song.crash === 'period' && b % period === 0) || (song.crash === 'two' && b % 2 === 0))) add(b * bar, 'crash');
    const at = (t) => chordAt(line, b * bar + t, L);
    const bassPat = v.bass || song.bass;
    if (bass && bassPat) for (const [t, r, len] of bassPat) {
      if (stop && t >= cut) continue;
      // negative Ticks: vorgezogen, gehört schon zum Akkord dieses Takts
      const c = t < 0 ? chordAt(line, b * bar, L) : at(t);
      add(b * bar + t, 'bass', `${relPitch(c, r) - 24}/${len}`);
    }
    for (const part of ['keys', 'stab', 'pad']) {
      const k = v[part] || song[part];
      if (!k) continue;
      const times = part === 'pad' ? line.filter((x) => x.t >= b * bar && x.t < (b + 1) * bar).map((x) => x.t - b * bar) : k.at;
      if (k.arp) { for (const [t, r] of k.arp) if (!(stop && t >= cut)) add(b * bar + t, part, relPitch(at(t), r)); continue; }
      for (const t of times) if (!(stop && t >= cut)) add(b * bar + t, part, chordPcs(at(t), k.voicing).join(','));
    }
    for (const [lb, t, deg, len] of song.lead || []) if (lb === b) add(b * bar + t, 'lead', `${scalePitch(song.mode, deg)}/${len}`);
    for (const [lb, t, deg, len, syl] of song.chop || []) if (lb === b) add(b * bar + t, 'chop', `${scalePitch(song.mode, deg)}/${len}/${syl}`);
  }
  return ev.sort((a, b) => a.t - b.t || a.kind.localeCompare(b.kind));
}
const key = (evs, d, L) => evs.map((e) => `${(((e.t + d) % L) + L) % L}|${e.kind}|${e.p}`).sort().join(';');
/** Ist die Schleife um `d` Ticks verschoben ununterscheidbar von einer Verschiebung um ganze Takte? */
function sameAsSomeBar(evs, d, bar, L) {
  const k = key(evs, d, L);
  for (let b = 0; b * bar < L; b++) if (k === key(evs, b * bar, L)) return true;
  return false;
}
const GROUPS = { bass: ['bass'], harm: ['keys', 'pad', 'stab'], kick: ['kick'], snare: ['snare', 'clap', 'rim'], toms: ['tom'], lead: ['lead'], chop: ['chop'], block: ['block'] };
/** Fairness: jede Verschiebung um eine Zählzeit (4/4, 3/4: Viertel; 6/8, 12/8: Achtel) muss anders klingen —
 *  ohne Hi-Hat, Crash, Fill und Takt-Variationen (also schon im einzelnen Takt-Groove). signs: Spuren,
 *  die die Eins ALLEIN eindeutig machen. Bei bass:false ohne Bass (Stufen „ohne Bass“). */
function songFairness(song, { bass = true } = {}) {
  const m = SONG_METERS[song.meter], bar = m.ticks, L = bar * song.bars;
  const evs = songEvents(song, { bass, phrase: false, weak: false });
  const shifts = [];
  for (let d = m.unit; d < bar; d += m.unit) shifts.push(d);
  const ambiguous = shifts.filter((d) => sameAsSomeBar(evs, d, bar, L));
  const signs = Object.entries(GROUPS).filter(([, kinds]) => {
    const sub = evs.filter((e) => kinds.includes(e.kind));
    return sub.length && shifts.every((d) => !sameAsSomeBar(sub, d, bar, L));
  }).map(([g]) => g);
  return { fair: ambiguous.length === 0, ambiguous, signs };
}
/** Perioden-Fairness (Typ C): eine Verschiebung um 1 … period−1 Takte muss anders klingen (mit Fill/Crash). */
function songPeriodFairness(song) {
  const m = SONG_METERS[song.meter], bar = m.ticks, L = bar * song.bars, period = song.period || song.bars;
  const evs = songEvents(song, { phrase: true, weak: true });
  const same = (d) => { const k = key(evs, d, L); for (let p = 0; p * period * bar < L; p++) if (k === key(evs, p * period * bar, L)) return true; return false; };
  const bad = [];
  for (let r = 1; r < period; r++) if (same(r * bar)) bad.push(r);
  const signs = ['crash', 'snare', 'tom', 'lead', 'chop', 'keys', 'bass'].filter((k) => {
    const sub = evs.filter((e) => e.kind === k);
    if (!sub.length) return false;
    for (let r = 1; r < period; r++) { const kk = key(sub, r * bar, L); for (let p = 0; p * period * bar < L; p++) if (kk === key(sub, p * period * bar, L)) return false; }
    return true;
  });
  return { fair: bad.length === 0, bad, signs };
}

