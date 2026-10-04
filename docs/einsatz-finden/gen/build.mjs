import { readFileSync, writeFileSync } from 'node:fs';
import { SONGS } from './songs-src.mjs';
import { songFairness, songPeriodFairness, SONG_METERS } from './lib.mjs';

// Ausgabe eine Ebene höher: docs/einsatz-finden/songs.js und katalog.md (Aufruf: node docs/einsatz-finden/gen/build.mjs).
const OUT = new URL('../', import.meta.url).pathname;

export const SONG_PATTERNS = {
  one4: { meter: '4/4', at: [0], name: 'auf die 1' },
  backbeat: { meter: '4/4', at: [12, 36], name: '2 und 4 (Backbeat)' },
  oneFour: { meter: '4/4', at: [0, 36], name: '1 und 4' },
  push4: { meter: '4/4', at: [0, 42], name: '1 und 4+ (vorgezogen)' },
  charleston: { meter: '4/4', at: [0, 18], name: '1 und 2+ (Charleston)' },
  tresillo: { meter: '4/4', at: [0, 18, 36], name: '1 · 2+ · 4 (3-3-2)' },
  one3: { meter: '3/4', at: [0], name: 'auf die 1' },
  waltzPa: { meter: '3/4', at: [12, 24], name: '2 und 3 (um-pa-pa)' },
  one68: { meter: '6/8', at: [0], name: 'auf die 1' },
  six8Back: { meter: '6/8', at: [18], name: 'auf die 4' },
  hemi68: { meter: '6/8', at: [0, 12, 24], name: '1 · 3 · 5 (wie 3/4)' },   // neu
  one128: { meter: '12/8', at: [0], name: 'auf die 1' },                    // neu
  back128: { meter: '12/8', at: [18, 54], name: '2 und 4 (große Schläge)' }, // neu
};
export const SONG_LEVELS = [
  { n: 1, label: 'Klare Eins: klatsch auf die 1', types: ['A'], patterns: ['one4', 'one3', 'one68'], bass: true, starts: 'beats' },
  { n: 2, label: 'Backbeat und Muster', types: ['A', 'B'], patterns: ['one4', 'backbeat', 'oneFour'], bass: true, starts: 'beats' },
  { n: 3, label: 'Dreier: Walzer und 6/8', types: ['A', 'B'], patterns: ['one3', 'waltzPa', 'one68', 'six8Back'], bass: true, starts: 'beats' },
  { n: 4, label: 'Ohne Bass: Akkorde und Melodie', types: ['A', 'B'], patterns: ['one4', 'backbeat', 'oneFour', 'one3', 'waltzPa'], bass: false, starts: 'beats' },
  { n: 5, label: 'Falsche Fährten', types: ['A', 'B'], patterns: ['one4', 'oneFour', 'push4', 'backbeat'], bass: true, starts: 'eighths' },
  { n: 6, label: 'Halftime, Shuffle, 12/8', types: ['A', 'B'], patterns: ['one4', 'backbeat', 'charleston', 'oneFour', 'push4', 'one128', 'back128'], bass: true, starts: 'eighths' },
  { n: 7, label: 'Die Phrase finden: dein Einsatz', types: ['C', 'A'], patterns: ['one4', 'one3', 'one68'], bass: true, starts: 'bars' },
  { n: 8, label: 'Glam und Taktgefühl', types: ['A', 'B'], patterns: ['one4', 'tresillo', 'charleston', 'oneFour', 'one68', 'hemi68', 'six8Back'], bass: true, starts: 'eighths' },
];

// ---- Prüfen ----
const problems = [];
const report = {};
for (const s of SONGS) {
  const bar = SONG_METERS[s.meter].ticks;
  if (s.chords.length !== s.bars) problems.push(`${s.id}: ${s.chords.length} Akkorde für ${s.bars} Takte`);
  for (const p of s.patterns) if (!SONG_PATTERNS[p] || SONG_PATTERNS[p].meter !== s.meter) problems.push(`${s.id}: Muster ${p}`);
  for (const n of s.levels) if (!s.patterns.some((p) => SONG_LEVELS[n - 1].patterns.includes(p))) problems.push(`${s.id}: kein Muster für Stufe ${n}`);
  for (const [b, t] of [...(s.lead || []), ...(s.chop || [])]) if (b < 0 || b >= s.bars || t < 0 || t >= bar) problems.push(`${s.id}: Note ${b}/${t}`);
  const f = songFairness(s);
  const nb = s.levels.includes(4) ? songFairness(s, { bass: false }) : null;
  const pf = s.levels.includes(7) ? songPeriodFairness(s) : null;
  if (!f.fair) problems.push(`${s.id}: Eins mehrdeutig (${f.ambiguous})`);
  if (nb && !nb.fair) problems.push(`${s.id}: ohne Bass mehrdeutig`);
  if (pf && !pf.fair) problems.push(`${s.id}: Periode mehrdeutig (${pf.bad})`);
  const minSigns = Math.min(...s.levels.map((n) => (n <= 3 ? 2 : 1)));
  if (f.signs.length < minSigns) problems.push(`${s.id}: zu wenig Zeichen`);
  report[s.id] = { signs: f.signs, noBass: nb && nb.signs, period: pf && pf.signs };
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ---- JS-Datei ----
const lib = readFileSync(new URL('./lib.mjs', import.meta.url), 'utf8').replace(/^export /gm, '');
const clean = (s) => { const o = { ...s }; delete o.id; return o; };
const json = (x) => (Array.isArray(x) ? `[${x.map(json).join(', ')}]`
  : x && typeof x === 'object' ? `{ ${Object.entries(x).map(([k, v]) => `${/^\w+$/.test(k) ? k : JSON.stringify(k)}: ${json(v)}`).join(', ')} }`
  : typeof x === 'string' ? `'${x.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(x));
const songsJs = SONGS.map((s) => `  ${s.id}: ${json(clean(s))},`).join('\n');
const js = `/* Einsatz finden – Song-Katalog (Entwurf, ${SONGS.length} Songs). Frei erfundene Mini-Songs im Stil
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

const SONG_PATTERNS = ${JSON.stringify(SONG_PATTERNS, null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'")};

const SONG_LEVELS = ${JSON.stringify(SONG_LEVELS, null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'")};

const DB_SONGS = {
${songsJs}
};

/* ---- Referenz: Ereignisse und Fairness (rein, für Planer und Selbsttest) ---- */
${lib}
`;
writeFileSync(OUT + 'songs.js', js);

// ---- Markdown ----
const cnt = (t, meter) => {
  if (meter === '6/8' || meter === '12/8') { const e = Math.floor(t / 6) + 1, r = t % 6; return r ? `${e}.${r}` : `${e}`; }
  const beat = Math.floor(t / 12) + 1, r = t % 12;
  return { 0: `${beat}`, 3: `${beat}e`, 6: `${beat}+`, 8: `${beat}+ (sw)`, 9: `${beat}a`, 4: `${beat} (Tr2)` }[r] || `${beat}:${r}`;
};
const ticks = (arr, meter) => (arr && arr.length ? arr.map((t) => cnt(t, meter)).join(' ') : '–');
const lenTxt = (l, meter) => { const q = meter === '6/8' || meter === '12/8' ? 6 : 12; const n = l / q; return meter === '6/8' || meter === '12/8' ? `${n}♪` : `${n}♩`; };
const notes = (list, meter, chop = false) => {
  const by = {};
  for (const x of list || []) (by[x[0]] ||= []).push(x);
  return Object.keys(by).sort((a, b) => a - b).map((b) => `T${+b + 1}: ` + by[b].map(([, t, d, l, syl]) => `${cnt(t, meter)}→${d}${chop ? `„${syl}“` : ''} (${lenTxt(l, meter)})`).join(', ')).join(' · ');
};
const drumsTxt = (d, meter) => ['kick', 'snare', 'rim', 'clap', 'hat', 'open'].filter((k) => d[k]).map((k) => `${{ kick: 'Bassdrum', snare: 'Snare', rim: 'Rim', clap: 'Clap', hat: 'Hi-Hat', open: 'offene HH' }[k]} ${ticks(d[k], meter)}`).join('; ') + (d.swing ? ' (Shuffle)' : '');
const partTxt = (k, meter) => (k ? (k.arp ? `Arpeggio ${k.arp.map(([t, r]) => `${cnt(t, meter)}:${r}`).join(' ')}` : k.at ? `${k.voicing || 'triad'} auf ${ticks(k.at, meter)} (je ${lenTxt(k.len, meter)})` : `${k.voicing || 'triad'}, hält jeden Akkord`) : null);
const bassTxt = (b, meter) => (b ? b.map(([t, r, l]) => `${t < 0 ? `${cnt(t + SONG_METERS[meter].ticks, meter)} (Vortakt)` : cnt(t, meter)}:${r}`).join(' ') : null);
const fam = { 'indie-rock': 'Indie-Rock', ballad: 'Power-Ballade', 'piano-rock': 'Piano-Rock/Deutsch-Indie', punk: 'Punk-Pop', stadium: 'Stadion-Hymne', folk: 'Indie-Folk/Stomp', waltz: 'Walzer 3/4', six8: '6/8-Ballade', disco: 'Disco-/Synth-Indie', shuffle: 'Shuffle', twelve8: '12/8', glam: 'Glam/Opern-Rock' };

let md = readFileSync(new URL('./konzept.md', import.meta.url), 'utf8');
md = md.replace('{{COUNT}}', String(SONGS.length));
// Stufentabelle mit Pool-Größen
md += `\n## Stufen und Song-Pools\n\n| Stufe | Lernschritt | Typen | Muster | Einstieg | Songs (Pool) |\n|---|---|---|---|---|---|\n`;
for (const l of SONG_LEVELS) {
  const pool = SONGS.filter((s) => s.levels.includes(l.n));
  md += `| ${l.n} | ${l.label}${l.bass ? '' : ' (Bass stumm)'} | ${l.types.join('/')} | ${l.patterns.map((p) => SONG_PATTERNS[p].name + (SONG_PATTERNS[p].meter !== '4/4' ? ` (${SONG_PATTERNS[p].meter})` : '')).join(', ')} | ${{ beats: 'Schläge', eighths: 'auch „und“', bars: 'beliebig in der Periode' }[l.starts]} | ${pool.length}: ${pool.map((s) => s.name).join(', ')} |\n`;
}
md += `\n## Übersicht nach Stil\n\n| Stil-Familie | Songs | Taktarten | Tempo-Spanne |\n|---|---|---|---|\n`;
for (const f of Object.keys(fam)) {
  const ss = SONGS.filter((s) => s.family === f);
  if (!ss.length) continue;
  md += `| ${fam[f]} | ${ss.length}: ${ss.map((s) => s.name).join(', ')} | ${[...new Set(ss.map((s) => s.meter))].join(', ')} | ${Math.min(...ss.map((s) => s.bpm[0]))}–${Math.max(...ss.map((s) => s.bpm[1]))} |\n`;
}
md += `\n## Steckbriefe\n\nNotation: Zählzeiten 1 e + a (4/4, 3/4), in 6/8 und 12/8 Achtel 1–6 bzw. 1–12; „(sw)“ = geswingt. Bass/Arpeggio: Ton relativ zum Akkord. Melodie/Chor: T = Takt, Zählzeit→Stufe (Länge). Akkorde in Stufen relativ zur Dur-Leiter (Moll: i, bIII …). Tonart in der App zufällig (F–A bzw. d–fis). Die Zeichen-Spalte ist vom Fairness-Test berechnet (Spuren, die die Eins allein eindeutig machen).\n`;
let lastStage = 0;
for (const s of [...SONGS].sort((a, b) => a.levels[0] - b.levels[0])) {
  if (s.levels[0] !== lastStage) { lastStage = s.levels[0]; md += `\n### Stufe ${lastStage}: ${SONG_LEVELS[lastStage - 1].label}\n`; }
  const r0 = report[s.id], de = (l) => l && l.map((x) => ({ bass: 'Bass', harm: 'Harmonie', kick: 'Bassdrum', snare: 'Snare/Clap/Rim', toms: 'Toms', lead: 'Melodie', chop: 'Chor', block: 'Block', crash: 'Becken', tom: 'Toms', keys: 'Akkorde' }[x] || x));
  const r = { signs: de(r0.signs), noBass: de(r0.noBass), period: de(r0.period) };
  const tempo = s.meter === '6/8' || s.meter === '12/8' ? `♩. ${s.bpm[0]}–${s.bpm[1]}` : `♩ ${s.bpm[0]}–${s.bpm[1]}`;
  md += `\n#### ${s.name} \`${s.id}\`${s.tricky ? ` – tückisch: ${s.tricky}` : ''}\n`;
  md += `- **Stil:** ${s.style} · ${s.meter} · ${tempo} · ${s.bars} Takte${s.period && s.period !== s.bars ? ` (Periode ${s.period})` : ''} · ${s.mode === 'minor' ? 'Moll' : 'Dur'}\n`;
  md += `- **Akkorde:** ${s.chords.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join(' – ')}${s.push ? ` · **vorgezogen** um ${s.push} Ticks (Achtel)` : ''}\n`;
  md += `- **Drums:** ${drumsTxt(s.drums, s.meter)}${s.toms ? `; Toms ${s.toms.map(([t, h]) => `${cnt(t, s.meter)}:${h}`).join(' ')}` : ''}\n`;
  const parts = [['Bass', bassTxt(s.bass, s.meter)], ['Klavier', partTxt(s.keys, s.meter)], ['Fläche', partTxt(s.pad, s.meter)], ['Stabs', partTxt(s.stab, s.meter)]].filter(([, v]) => v);
  md += parts.map(([k, v]) => `- **${k}:** ${v}${k === 'Bass' && s.noBassLevels ? ` (stumm in Stufe ${s.noBassLevels.join(', ')})` : ''}\n`).join('');
  if (s.lead) md += `- **Melodie:** ${notes(s.lead, s.meter)}\n`;
  if (s.chop) md += `- **Chor-Chops:** ${notes(s.chop, s.meter, true)}\n`;
  if (s.var) md += `- **Variation:** ${Object.entries(s.var).map(([b, v]) => `Takt ${+b + 1}: ${v.drums ? drumsTxt(v.drums, s.meter) : ''}${v.bass ? `; Bass ${bassTxt(v.bass, s.meter)}` : ''}${v.stab ? `; Stabs ${partTxt(v.stab, s.meter)}` : ''}`).join(' · ')}\n`;
  md += `- **Phrase:** ${s.fill ? `Fill ${s.fill.kind} ab ${cnt(s.fill.from, s.meter)} im letzten Takt` : 'kein Fill'}; ${s.crash === 'period' ? 'Becken auf Takt 1 der Periode' : 'kein Becken'}${s.entry ? `; Einsatz-Motiv (Typ C): ${s.entry.map(([t, l]) => `${cnt(t, s.meter)} (${lenTxt(l, s.meter)})`).join(', ')}` : ''}\n`;
  md += `- **Eins hörbar an:** ${r.signs.join(', ')}${r.noBass ? ` · ohne Bass: ${r.noBass.join(', ')}` : ''}${r.period ? ` · Periode: ${r.period.join(', ')}` : ''}\n`;
  md += `- **Worauf hören?** „${s.cue}“\n`;
  md += `- **Stufen:** ${s.levels.join(', ')} · **Muster:** ${s.patterns.map((p) => SONG_PATTERNS[p].name).join(', ')}${s.levels.includes(7) ? ' · Typ C' : ''}\n`;
}
writeFileSync(OUT + 'katalog.md', md);
console.log('ok', SONGS.length, 'Songs');
for (const l of SONG_LEVELS) console.log(l.n, SONGS.filter((s) => s.levels.includes(l.n)).length);
