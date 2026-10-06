/* ==========================================================================
   HARMONY — gemeinsame Harmonik-Quelle für Groove Lab, Ausbildung,
   Einsingen und Piano (Musiktheorie-Review Paket 13). Klassisches Skript
   ohne Abhängigkeiten, kein DOM: registriert window.ChorHarmony.

   Enthält: Modi, Akkordbau (inkl. Dur-Dominante in Moll und Dominant-
   septakkorden, chordSteps), Tonnamen (spell/noteLabel), Stimmumfänge
   (Satz: VOICE_RANGES; Üben: PRACTICE_RANGES/practiceRange),
   vierstimmigen Satz (voiceChord/voiceProgressionSatb) und den engen
   Oberstimmen-Satz der Gehörbildung (voiceUpperClose).

   Geladen von groove-lab.js (über loadGrooveLab in app.js, vorher),
   uebe-lab.html, einsingen.html und piano.html (<script src>). Steht in
   SHELL_OPTIONAL (sw.js) — Änderungen hier brauchen einen SW_VERSION-Bump.
   ========================================================================== */
(function (global) {
  'use strict';

  const mod = (n, m) => ((n % m) + m) % m;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---- Modi ---- */

  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];
  const MODES = [
    { id: 'major', steps: MAJOR },
    { id: 'minor', steps: MINOR },
    { id: 'dorian', steps: [0, 2, 3, 5, 7, 9, 10] },
    { id: 'mixolydian', steps: MIXOLYDIAN },
  ];
  /** Tonleiter eines Modus (unbekannt = Dur). */
  const modeSteps = (id) => (MODES.find((m) => m.id === id) || MODES[0]).steps;
  function degreeSemis(steps, deg) { return steps[mod(deg, 7)] + 12 * Math.floor(deg / 7); }

  /* ---- Tonnamen (Testfälle SPELL_CASES, geprüft in spellCheck).

     spell(pc, keyRoot, mode, lang): Name der Tonhöhenklasse pc in der
     Tonart keyRoot/mode ('major' | 'minor' | 'dorian' | 'mixolydian').
     ♭-Tonarten schreiben mit ♭, alle anderen mit ♯ — maßgeblich ist die
     Dur-Paralleltonart: F, B, Es, As, Des, Ges (Moll also d, g, c, f, b;
     dis-Moll statt es-Moll). In Moll steht der Leitton (erhöhte 7. Stufe)
     immer mit ♯ (d-Moll: Cis). Ohne Tonart (keyRoot null) gilt die
     neutrale Liste C, Cis, D, Es, E, F, Fis, G, As, A, B, H.
     lang: 'en' englisch (B = H, B♭ = B), sonst deutsch (auch 'pl').

     noteLabel(midi, keyRoot, mode, lang): mit Oktave — deutsch Helmholtz
     (C₁, C, c, c′, c″ …; 60 = c′), englisch wissenschaftlich (60 = C4). */
  const SPELL_SHARP = {
    de: ['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'Ais', 'H'],
    en: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'],
  };
  const SPELL_FLAT = {
    de: ['C', 'Des', 'D', 'Es', 'E', 'F', 'Ges', 'G', 'As', 'A', 'B', 'H'],
    en: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'],
  };
  const SPELL_NEUTRAL = {
    de: ['C', 'Cis', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H'],
    en: ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'],
  };
  const SPELL_FLAT_MAJORS = [5, 10, 3, 8, 1, 6];
  const SPELL_RELATIVE_MAJOR = { major: 0, minor: 3, dorian: -2, mixolydian: -7 };
  const spellPc = (n) => ((n % 12) + 12) % 12;
  function spellUsesFlats(keyRoot, mode) {
    const major = spellPc(keyRoot + (SPELL_RELATIVE_MAJOR[mode] ?? 0));
    if (mode === 'minor' && major === 6) return false; // dis-Moll, nicht es-Moll
    return SPELL_FLAT_MAJORS.includes(major);
  }
  function spell(pc, keyRoot = null, mode = 'major', lang = 'de') {
    const l = lang === 'en' ? 'en' : 'de';
    const p = spellPc(pc);
    if (keyRoot === null || keyRoot === undefined) return SPELL_NEUTRAL[l][p];
    const k = spellPc(keyRoot);
    if (mode === 'minor' && p === spellPc(k + 11)) return SPELL_SHARP[l][p];
    return (spellUsesFlats(k, mode) ? SPELL_FLAT : SPELL_SHARP)[l][p];
  }
  function noteLabel(midi, keyRoot = null, mode = 'major', lang = 'de') {
    const name = spell(midi, keyRoot, mode, lang);
    const octave = Math.floor(midi / 12) - 1;
    if (lang === 'en') return `${name}${octave}`;
    if (octave >= 3) return name.toLowerCase() + '′'.repeat(octave - 3).replace('′′′′', '⁗').replace('′′′', '‴').replace('′′', '″');
    return name + ['', '₁', '₂', '₃', '₄'][Math.min(4, 2 - octave)];
  }
  // [Funktion, Argumente, erwartet] — dieselbe Liste in jedem Tool.
  const SPELL_CASES = [
    ['spell', [1, 8, 'major', 'de'], 'Des'], ['spell', [8, 4, 'major', 'de'], 'Gis'], ['spell', [8, 4, 'major', 'en'], 'G♯'],
    ['spell', [10, 11, 'major', 'de'], 'Ais'], ['spell', [6, 6, 'major', 'de'], 'Ges'], ['spell', [3, 3, 'minor', 'de'], 'Dis'],
    ['spell', [1, 2, 'minor', 'de'], 'Cis'], ['spell', [10, 2, 'minor', 'de'], 'B'], ['spell', [3, 0, 'minor', 'de'], 'Es'],
    ['spell', [10, 0, 'mixolydian', 'de'], 'B'], ['spell', [10, 0, 'mixolydian', 'en'], 'B♭'], ['spell', [6, 2, 'dorian', 'de'], 'Fis'],
    ['spell', [10, null, 'major', 'de'], 'B'], ['spell', [11, null, 'major', 'en'], 'B'], ['spell', [1, null, 'major', 'de'], 'Cis'],
    ['spell', [3, null, 'major', 'en'], 'E♭'], ['spell', [8, 9, 'minor', 'de'], 'Gis'], ['spell', [1, 1, 'major', 'pl'], 'Des'],
    ['noteLabel', [60, null, 'major', 'de'], 'c′'], ['noteLabel', [60, null, 'major', 'en'], 'C4'], ['noteLabel', [48, null, 'major', 'de'], 'c'],
    ['noteLabel', [36, null, 'major', 'de'], 'C'], ['noteLabel', [24, null, 'major', 'de'], 'C₁'], ['noteLabel', [72, null, 'major', 'de'], 'c″'],
    ['noteLabel', [84, null, 'major', 'de'], 'c‴'], ['noteLabel', [61, 1, 'major', 'de'], 'des′'], ['noteLabel', [47, 7, 'major', 'de'], 'H'],
    ['noteLabel', [70, 5, 'major', 'en'], 'B♭4'], ['noteLabel', [69, null, 'major', 'de'], 'a′'], ['noteLabel', [40, null, 'major', 'de'], 'E'],
  ];
  /** Prüft SPELL_CASES; liefert die Liste der Abweichungen (leer = ok). */
  function spellCheck() {
    const fns = { spell, noteLabel };
    return SPELL_CASES.map(([fn, args, want]) => {
      const got = fns[fn](...args);
      return got === want ? null : `${fn}(${args.join(', ')}) = ${got}, erwartet ${want}`;
    }).filter(Boolean);
  }

  /* ---- Akkordbau ---- */

  function chordQuality(steps, deg) {
    const root = degreeSemis(steps, deg);
    const third = degreeSemis(steps, deg + 2) - root;
    const fifth = degreeSemis(steps, deg + 4) - root;
    if (fifth === 6) return 'dim';
    if (fifth === 8) return 'aug';
    return third === 3 ? 'min' : 'maj';
  }

  function chordPitchClasses(keyRoot, steps, deg, sevenths) {
    return (sevenths ? [0, 2, 4, 6] : [0, 2, 4]).map((o) => mod(keyRoot + degreeSemis(steps, deg + o), 12));
  }

  /**
   * Tonleiter, aus der der Akkord auf Stufe `deg` gebaut wird. In Moll mit
   * `prog.dominant` ist die V. Stufe die Dur-Dominante: die 7. Stufe wird
   * erhöht (harmonisches Moll, in a-Moll gis statt g) — V = E–Gis–H,
   * V7 = E–Gis–H–D. Weil Satz, Bass, Arp, Melodie und Anzeige alle über
   * diese Tonleiter rechnen, folgen sie dem Dur-Akkord (kein Querstand g
   * gegen gis). Nur Moll: Dorisch und Mixolydisch leben vom Moll-v und
   * behalten es (keine Leitton-Regeln dort).
   */
  function chordSteps(steps, modeId, prog, deg) {
    if (prog?.dom7) {
      // Blues: über jedem Akkordgrundton die Mixolydisch-Leiter, damit
      // Akkord (Septime klein), Arp und Melodie zum Dominantseptakkord
      // passen: C7 = C–E–G–B, F7 = F–A–C–Es, G7 = G–H–D–F. Die Stufen
      // unterhalb des Grundtons liegen eine Oktave tiefer, damit
      // degreeSemis über den ganzen Bereich weiter aufsteigt.
      const d = mod(deg, 7);
      const root = steps[d];
      return MIXOLYDIAN.map((_, i) => root + MIXOLYDIAN[mod(i - d, 7)] - (i < d ? 12 : 0));
    }
    if (!prog || !prog.dominant || modeId !== 'minor' || mod(deg, 7) !== 4) return steps;
    const out = steps.slice();
    out[6] = 11;
    return out;
  }


  // Akkordformen der Gehörbildung (Halbtöne über dem Grundton).
  const CHORD_SHAPES = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], dom7: [0, 4, 7, 10], add6: [0, 4, 7, 9] };

  /* ---- Stimmumfänge (MIDI) für alle Tools — bewusst die bequeme
     Mittellage, nicht die Extreme: Übe-Hilfen, kein Solo. Einsingen setzt
     die Startlage tiefer an, die Obergrenzen sind dieselben. ---- */

  const SATB = ['S', 'A', 'T', 'B'];
  const VOICE_RANGES = { S: [60, 79], A: [55, 74], T: [48, 67], B: [40, 62] };

  // Bequeme Übe-Umfänge (klingend, MIDI). Bewusst ein, zwei Töne innerhalb
  // der Literaturangaben — Üben soll aufwärmen, nicht an die Grenze gehen.
  // Gilt für Einsingen, Singen mit Mikrofon und die Chor-Aufgaben; die
  // Satz-Tabelle VOICE_RANGES oben bleibt davon unberührt.
  const PRACTICE_RANGES = {
    // Werte wie bisher VOICES in einsingen.html — nur hierher verschoben.
    S: { floor: 57, ceil: 79, name: 'Sopran' }, // a  – g″
    A: { floor: 53, ceil: 74, name: 'Alt' },    // f  – d″
    T: { floor: 47, ceil: 67, name: 'Tenor' },  // H  – g′
    B: { floor: 41, ceil: 62, name: 'Bass' },   // F  – d′
  };

  /** Wirksamer Übe-Umfang: Standard der Stimmlage, bei gemessenem Umfang
   *  dessen Innenbereich (je 2 Halbtöne Abstand), aber höchstens 4 Halbtöne
   *  vom Standard entfernt (schützt vor Oktavfehlern der Messung).
   *  profile: { part, low, high } wie settings.voiceProfile (app.js). */
  function practiceRange(profile) {
    const base = PRACTICE_RANGES[profile?.part] || PRACTICE_RANGES.A;
    if (profile?.low == null || profile?.high == null || profile.high - profile.low < 14) return { ...base, personal: false };
    const floor = clamp(profile.low + 2, base.floor - 4, base.floor + 4);
    const ceil = clamp(profile.high - 2, base.ceil - 4, base.ceil + 4);
    return ceil - floor >= 12 ? { ...base, floor, ceil, personal: true } : { ...base, personal: false };
  }

  /* ---- Vierstimmiger Satz ---- */

  /**
   * Ein Akkord als vierstimmiger Satz. Bass auf dem Grundton (verminderte
   * Akkorde als Sextakkord: Bass auf der Terz, `bassIndex`); für Bass
   * (beide Oktavlagen), Tenor, Alt und Sopran werden alle Lagen im Umfang
   * durchprobiert (wenige hundert Kombinationen) und die mit der kleinsten
   * Bewegung gegenüber dem vorigen Akkord gewählt — Stimmführung im Kleinen.
   *
   * Harte Regeln (Kandidat verworfen): offene Quint- und Oktavparallelen
   * zwischen beliebigen Stimmen (gleiches reines Intervall, beide Stimmen
   * gleichgerichtet bewegt) und ein verdoppelter Leitton (`leading`: nur
   * in Akkorden mit Dominantfunktion, siehe leadingToneOf).
   * Weiche Regeln (Strafpunkte): fehlende Terz/Quinte/Septime, verdoppelte
   * Terz, verdeckte Quint/Oktave der Außenstimmen mit Sprung im Sopran,
   * Leitton im Sopran (`prevLeading`), der nicht zum Grundton hinaufgeht.
   * Bleibt nach den harten Regeln nichts übrig, gilt wie bisher der beste
   * Kandidat nach Strafpunkten (gezählt in VOICING_STATS.fallbacks).
   * `next`: fester Folgeakkord (Übergang Ende → Anfang beim Loopen) — auch
   * dorthin sollen die harten Regeln gelten; geht das nicht, zählt er nicht.
   */
  const VOICING_STATS = { fallbacks: 0 };
  function voicePairs(prev, next) {
    let parallels = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const [x, y] = [SATB[i], SATB[j]];
        const mx = next[x] - prev[x];
        const my = next[y] - prev[y];
        if (!mx || !my || Math.sign(mx) !== Math.sign(my)) continue;
        const before = mod(prev[x] - prev[y], 12);
        const after = mod(next[x] - next[y], 12);
        if (before === after && (after === 0 || after === 7)) parallels++;
      }
    }
    return parallels;
  }
  function voiceChord(pcs, prev, { leading = null, prevLeading = null, bassIndex = 0, next: after = null } = {}) {
    const within = ([lo, hi], pred) => { const out = []; for (let m = lo; m <= hi; m++) if (pred(m)) out.push(m); return out; };
    const bassPc = pcs[bassIndex] ?? pcs[0];
    const isChordTone = (m) => pcs.includes(mod(m, 12));
    let best = null;
    let bestScore = Infinity;
    let fallback = null;
    let fallbackScore = Infinity;
    let closed = null;
    let closedScore = Infinity;
    for (const B of within(VOICE_RANGES.B, (m) => mod(m, 12) === bassPc)) {
      for (const T of within(VOICE_RANGES.T, isChordTone)) {
        if (T <= B || T - B > 19) continue;
        for (const A of within(VOICE_RANGES.A, isChordTone)) {
          if (A <= T || A - T > 12) continue;
          for (const S of within(VOICE_RANGES.S, isChordTone)) {
            if (S <= A || S - A > 12) continue;
            const next = { S, A, T, B };
            const voices = [B, T, A, S].map((m) => mod(m, 12));
            let score = Math.abs(S - prev.S) + Math.abs(A - prev.A) + Math.abs(T - prev.T) + Math.abs(B - prev.B) * .5;
            if (!voices.includes(pcs[1])) score += 20;
            if (pcs[2] !== undefined && !voices.includes(pcs[2])) score += 4;
            if (pcs[3] !== undefined && !voices.includes(pcs[3])) score += 6;
            if (voices.filter((pc) => pc === pcs[1]).length > 1) score += 3;
            // Verdeckte Quinte/Oktave: Außenstimmen gleichgerichtet in ein
            // reines Intervall, Sopran springt.
            const outer = mod(S - B, 12);
            if ((outer === 0 || outer === 7) && Math.abs(S - prev.S) > 2 && Math.sign(S - prev.S) === Math.sign(B - prev.B) && S !== prev.S) score += 10;
            if (prevLeading !== null && mod(prev.S, 12) === prevLeading && pcs.includes(mod(prevLeading + 1, 12)) && S !== prev.S + 1) score += 8;
            if (score < fallbackScore) { fallbackScore = score; fallback = next; }
            const hard = voicePairs(prev, next) > 0 || (leading !== null && voices.filter((pc) => pc === leading).length > 1);
            if (!hard && score < bestScore) { bestScore = score; best = next; }
            if (after && !hard && !voicePairs(next, after)) {
              const both = score + Math.abs(after.S - S) + Math.abs(after.A - A) + Math.abs(after.T - T);
              if (both < closedScore) { closedScore = both; closed = next; }
            }
          }
        }
      }
    }
    if (!best && fallback) VOICING_STATS.fallbacks++;
    return closed || best || fallback || { S: prev.S, A: prev.A, T: prev.T, B: prev.B };
  }

  /** Leitton (Tonhöhenklasse) des Akkords auf Stufe `deg`, sofern er
   *  Dominantfunktion hat: Dur V/V7/vii° (7. Stufe), Moll mit Dur-Dominante
   *  V/V7 (erhöhte 7. Stufe). Sonst — natürliches Moll, Dorisch,
   *  Mixolydisch — null: dort gelten keine Leitton-Regeln. */
  function leadingToneOf(keyRoot, modeId, prog, deg) {
    const d = mod(deg, 7);
    if (modeId === 'major' && (d === 4 || d === 6)) return mod(keyRoot + 11, 12);
    if (modeId === 'minor' && prog?.dominant && d === 4) return mod(keyRoot + 11, 12);
    return null;
  }

  /** Satz einer ganzen Folge. Mehrere Durchläufe, jeder ab dem letzten
   *  Akkord des vorigen, bis sich nichts mehr ändert (höchstens 6) — erst
   *  dann ist auch der Übergang Ende → Anfang beim Loopen genau der, gegen
   *  den geprüft wurde. */
  function voiceProgressionSatb(keyRoot, mode, prog) {
    let prev = { S: 67, A: 62, T: 55, B: 48 };
    let prevLeading = null;
    let list = [];
    for (let pass = 0; pass < 6; pass++) {
      const before = JSON.stringify(list);
      list = prog.degrees.map((deg) => {
        const steps = chordSteps(mode.steps, mode.id, prog, deg);
        const pcs = chordPitchClasses(keyRoot, steps, deg, prog.sevenths);
        const leading = leadingToneOf(keyRoot, mode.id, prog, deg);
        const bassIndex = chordQuality(steps, deg) === 'dim' ? 1 : 0;
        prev = voiceChord(pcs, prev, { leading, prevLeading, bassIndex });
        prevLeading = leading;
        return prev;
      });
      if (pass > 0 && JSON.stringify(list) === before) break;
    }
    // Wandert der Satz von Durchlauf zu Durchlauf weiter (kein Fixpunkt),
    // den letzten Akkord so setzen, dass er auch sauber in den ersten führt.
    const n = list.length;
    if (n > 1 && voicePairs(list[n - 1], list[0])) {
      const deg = prog.degrees[n - 1];
      const steps = chordSteps(mode.steps, mode.id, prog, deg);
      list[n - 1] = voiceChord(chordPitchClasses(keyRoot, steps, deg, prog.sevenths), list[n - 2], {
        leading: leadingToneOf(keyRoot, mode.id, prog, deg), prevLeading: leadingToneOf(keyRoot, mode.id, prog, prog.degrees[n - 2]),
        bassIndex: chordQuality(steps, deg) === 'dim' ? 1 : 0, next: list[0],
      });
    }
    return list;
  }

  /**
   * Pop-Satz einer Folge (neben dem SATB-Satz): Bass auf dem Akkordgrundton
   * (oder dem Basston `bassIndexes[i]`: 0 Grundton, 1 Terz, 2 Quinte) im Bereich
   * 40–52, die drei Oberstimmen in enger Lage (alle innerhalb einer Oktave),
   * Oberstimme in 60–`topMax`. Jede Stimme geht zum nächsten Akkordton mit
   * kleinster Gesamtbewegung, ohne Stimmkreuzung und, wenn möglich, ohne
   * offene Quint-/Oktavparallelen. Gleiches Format wie voiceProgressionSatb:
   * Liste von { S, A, T, B } je Akkord (S = höchste, T = tiefste Oberstimme),
   * deshalb gelten Fokus/Stumm je Stimme weiter.
   * `add9`: bei Dur-/Moll-Dreiklängen ohne Septime ersetzt die None (in der
   * Tonart) den verdoppelten Grundton in den Oberstimmen; nie bei vermindert,
   * nie bei Dominantseptakkorden, nie bei Umkehrungen.
   */
  function voiceProgressionPop(keyRoot, mode, prog, { add9 = false, topMax = 69, bassIndexes = null } = {}) {
    const chords = prog.degrees.map((deg, i) => {
      const steps = chordSteps(mode.steps, mode.id, prog, deg);
      const pcs = chordPitchClasses(keyRoot, steps, deg, prog.sevenths);
      const bi = Math.min(bassIndexes?.[i] ?? 0, pcs.length - 1);
      const quality = chordQuality(steps, deg);
      let upper = pcs.length === 4 ? pcs.filter((_, k) => k !== bi) : pcs.slice();
      if (add9 && bi === 0 && pcs.length === 3 && !prog.dom7 && (quality === 'maj' || quality === 'min')) {
        upper = [mod(keyRoot + degreeSemis(steps, deg + 1), 12), pcs[1], pcs[2]];
      }
      return { bassPc: pcs[bi], upper };
    });
    const top = clamp(topMax, 60, 72);
    let prev = { S: 64, A: 60, T: 55, B: 46 };
    let list = [];
    const voice = (chord, prior) => {
      // Bass: Grundton (Oktavlage 40–52); Oberstimmen: oberste Stimme 60–top, die
      // anderen als nächste tiefere Akkordtöne (enge Lage, höchstens eine Oktave
      // zwischen T und S). Gewählt wird die kleinste Gesamtbewegung, möglichst
      // ohne offene Quint-/Oktavparallelen (nur wenn es nicht anders geht, mit).
      // Liegt unter einer niedrigen Obergrenze (Melodie an) kein Akkordton im
      // Bereich 60–top, darf die Oberstimme ausnahmsweise bis 54 hinabgehen.
      for (const lowest of [60, 54]) {
        let best = null;
        let bestScore = Infinity;
        let fallback = null;
        let fallbackScore = Infinity;
        for (let B = 40; B <= 52; B++) {
          if (mod(B, 12) !== chord.bassPc) continue;
          for (let S = lowest; S <= top; S++) {
            if (!chord.upper.includes(mod(S, 12))) continue;
            const rest = chord.upper.filter((pc) => pc !== mod(S, 12));
            const below = (from, pcs) => { let m = from - 1; while (!pcs.includes(mod(m, 12))) m--; return m; };
            const A = below(S, rest);
            const T = below(A, rest.filter((pc) => pc !== mod(A, 12)));
            if (T <= B || S - T > 12) continue;
            const next = { S, A, T, B };
            const score = Math.abs(S - prior.S) + Math.abs(A - prior.A) + Math.abs(T - prior.T) + Math.abs(B - prior.B) * .5 + (B + 100) * 1e-6;
            if (score < fallbackScore) { fallbackScore = score; fallback = next; }
            if (voicePairs(prior, next) === 0 && score < bestScore) { bestScore = score; best = next; }
          }
        }
        if (best || fallback) return best || fallback;
      }
      return { S: prior.S, A: prior.A, T: prior.T, B: prior.B };
    };
    for (let pass = 0; pass < 6; pass++) {
      const before = JSON.stringify(list);
      list = chords.map((chord) => { prev = voice(chord, prev); return prev; });
      if (pass > 0 && JSON.stringify(list) === before) break;
    }
    return list;
  }

  /** Offene Quint-/Oktavparallelen zwischen zwei Klängen als Listen
   *  ([Bass, …Oberstimmen]) — dieselbe Regel wie voicePairs. */
  function parallelCount(prev, next) {
    let n = 0;
    for (let i = 0; i < next.length; i++) {
      for (let j = i + 1; j < next.length; j++) {
        const mi = next[i] - prev[i];
        const mj = next[j] - prev[j];
        if (!mi || !mj || Math.sign(mi) !== Math.sign(mj)) continue;
        const before = mod(prev[i] - prev[j], 12);
        const after = mod(next[i] - next[j], 12);
        if (before === after && (after === 0 || after === 7)) n++;
      }
    }
    return n;
  }

  /**
   * Drei Oberstimmen über einem festen Bass (Gehörbildung): enge Lage (bei
   * Vierklängen die drei Töne außer dem Basston, sonst der Dreiklang),
   * bei `spread` 'open' weite Lage (mittlere Stimme eine Oktave höher).
   * Gewählt wird die Lage mit der kleinsten Bewegung zum vorigen Klang
   * `prev` ({ bass, upper } oder null), ohne offene Quint-/Oktavparallelen;
   * gibt es keine parallelenfreie, die mit der kleinsten Bewegung.
   */
  function voiceUpperClose(upperPcs, bass, prev, spread = 'close') {
    const prevUpper = prev ? prev.upper : [60, 64, 67];
    let best = null, bestScore = Infinity, fallback = null, fallbackScore = Infinity;
    for (let rot = 0; rot < 3; rot++) {
      const order = [upperPcs[rot], upperPcs[(rot + 1) % 3], upperPcs[(rot + 2) % 3]];
      for (let start = 55; start <= 66; start++) {
        if (mod(start, 12) !== order[0]) continue;
        let upper = [start];
        for (const pc of order.slice(1)) { let n = upper[upper.length - 1] + 1; while (mod(n, 12) !== pc) n++; upper.push(n); }
        if (spread === 'open') {
          const [a, b, c] = upper;
          upper = [a, c, b + 12].sort((x, y) => x - y);
          if (upper[2] > 81) upper = upper.map((m) => m - 12);
        }
        if (upper[0] <= bass) continue;
        const score = upper.reduce((sum, n, k) => sum + Math.abs(n - prevUpper[k]), 0);
        if (score < fallbackScore) { fallbackScore = score; fallback = upper; }
        const clean = !prev || !parallelCount([prev.bass, ...prev.upper], [bass, ...upper]);
        if (clean && score < bestScore) { bestScore = score; best = upper; }
      }
    }
    return best || fallback;
  }

  global.ChorHarmony = Object.freeze({
    MAJOR, MINOR, MIXOLYDIAN, MODES, modeSteps, degreeSemis,
    spell, noteLabel, SPELL_CASES, spellCheck,
    chordQuality, chordPitchClasses, chordSteps, CHORD_SHAPES,
    SATB, VOICE_RANGES, PRACTICE_RANGES, practiceRange,
    VOICING_STATS, voicePairs, voiceChord, leadingToneOf, voiceProgressionSatb, voiceProgressionPop,
    parallelCount, voiceUpperClose,
  });
})(typeof window !== 'undefined' ? window : globalThis);
