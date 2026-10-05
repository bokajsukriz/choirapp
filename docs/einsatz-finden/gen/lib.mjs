// Referenz-Implementierung (rein, ohne DOM/Audio): Song -> Ereignisliste, Fairness-Prüfung.
// Wird 1:1 in songs.js mit ausgegeben.

export const SONG_METERS = {
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
export function parseChord(sym) {
  const m = /^([b#]?)([ivIV]+)(.*)$/.exec(sym);
  if (!m) throw new Error(`Akkord? ${sym}`);
  const acc = m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0;
  const up = m[2].toUpperCase();
  const root = (ROMAN[up] + acc + 12) % 12;
  const minor = m[2] !== up;
  const suf = m[3];
  return { root, third: suf.includes('sus') ? 5 : minor ? 3 : 4, seventh: suf.includes('maj7') ? 11 : suf.includes('7') ? 10 : null, sym };
}
export function chordPcs(c, voicing = 'triad') {
  if (voicing === 'power') return [c.root, c.root + 7, c.root + 12];
  const t = [c.root, c.root + c.third, c.root + 7];
  if (c.seventh !== null) t.push(c.root + c.seventh);
  if (voicing === 'open') return [c.root - 12, c.root + 7, c.root + 12 + c.third];
  return t;
}
/** Ton relativ zum Akkord: '1','3','5','8','b7','6','10','-2' … ('3'/'10' = Akkordterz). */
export function relPitch(c, rel) {
  if (rel === '3') return c.root + c.third;
  if (rel === '10') return c.root + 12 + c.third;
  if (!(rel in REL)) throw new Error(`Ton? ${rel}`);
  return c.root + REL[rel];
}
export function scalePitch(mode, deg) {
  const s = SCALE[mode];
  const i = deg - 1;
  return s[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);
}
/** Akkord-Zeitleiste der Schleife: [{ t, chord }], t in Ticks ab Schleifenbeginn (vorgezogen: push). */
export function chordLine(song) {
  const bar = SONG_METERS[song.meter].ticks, L = bar * song.bars;
  const out = [];
  song.chords.forEach((c, b) => {
    const list = typeof c === 'string' ? [[0, c]] : Array.isArray(c[0]) ? c : c.map((s, i) => [i * bar / c.length, s]);
    for (const [t, s] of list) out.push({ t: (((b * bar + t - (song.push || 0)) % L) + L) % L, chord: parseChord(s) });
  });
  return out.sort((a, b) => a.t - b.t);
}
export function chordAt(line, t, L) {
  const tt = ((t % L) + L) % L;
  let cur = line[line.length - 1];
  for (const x of line) if (x.t <= tt) cur = x;
  return cur.chord;
}
const DRUM_KINDS = ['kick', 'snare', 'rim', 'clap', 'hat', 'open', 'block'];
/** Ereignisse einer Schleife. opts: bass (false = stumm), phrase (Fill/Crash/Variationen), weak (Hi-Hat/offene HH).
 *  → [{ t, kind, p }] (p: Tonhöhe bzw. Tonklassen-Liste als Text). */
export function songEvents(song, { bass = true, phrase = true, weak = true } = {}) {
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
export function songFairness(song, { bass = true } = {}) {
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
export function songPeriodFairness(song) {
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
