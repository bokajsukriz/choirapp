# Handoff — the "HQ" slow-play mode: what the problem is, and what has failed

For a fresh session. Written in English deliberately: this is a
cross-session briefing, not app documentation. Everything else in this
repo is German.

Repo: `bokajsukriz/choirapp`, `main` at `2b10c33`, shipped `SW_VERSION`
`v118`. Navigate by function/ID names, never line numbers.

---

## 0. Read this first — the premise has never been tested

The whole project is: **beat Chrome's built-in time-stretcher with a
phase vocoder written in JavaScript, in real time, on a 2019-class
Android phone.**

Nobody has ever verified that this is worth doing. "Standard" mode uses
the browser's native `preservesPitch` (WSOLA, C++, essentially free). HQ
exists because a phase vocoder is *supposed* to sound better on sustained
notes — which is what a choir sings. But there is no recorded A/B test of
Standard vs HQ, on any device, at any tempo, by any human.

**Do that first.** It costs one desktop session, where both modes run
clean. If the difference is small or arguable, four rounds of work have
been spent on the wrong problem and the honest move is to delete HQ. If
the difference is obvious and worth having, everything below applies.

I did not ask this question across three planning documents. That is the
single biggest failure in this history.

---

## 1. The feature and the signal chain

Songs are local recordings (imported from a ZIP, stored in IndexedDB),
loaded into an `<audio>` element as a Blob URL. The element stays the
source in every mode — that is what keeps lock-screen controls and
background playback working via the Media Session API.

Tempo presets: 0.85× / 0.7× / 0.6×. Four modes were planned, three exist:

- **Standard** — `preservesPitch = true`. The browser's WSOLA. Free.
- **HQ** — `preservesPitch = false` (the element resamples: slower *and*
  lower), then an `AudioWorklet` phase vocoder shifts the pitch back up by
  `shift = 1/rate`.
- **Raw** — like HQ but without the worklet correction; pitch deliberately
  drops. Diagnostic only.

After the worklet: `ChannelSplitter` → 4 gains (normal / L↔R swap / mono,
the "one earbud" feature) → `ChannelMerger` → destination.

`DEFAULT_SETTINGS.slowMode` is `'standard'` and must stay that way until a
device test passes cleanly.

---

## 2. Current state on the target device

Android 10, Chrome Mobile 152, 8 cores. The number reported is the
fraction of real time the AudioContext achieves (`ctx.currentTime` vs
`performance.now()`, sampled together on the main thread — an unbiased
measure).

Measured on `v117`, before the mono round:

| Mode | 0.85× | 0.7× | 0.6× |
|---|---|---|---|
| Standard | ~100 % | ~100 % | ~100 % |
| Raw | ~100 % | ~100 % | ~100 % |
| **HQ** | **96–97 %, audibly crackling** | **75–78 %** | **65 %** |

`v118` then shipped the mono round, which delivered its predicted 2× on
the benchmark machine. The user's verdict after trying it: **"still
shit."**

### The immediate problem with that verdict

**No numbers came back from `v118`, and no mode was named.** Three very
different situations are consistent with "still shit", and they need
opposite responses:

1. **They tested `HQ`, not `HQ Mono`.** The stereo path is unchanged since
   `v117` — same crackle, by construction. The fourth button is new and
   easy to miss.
2. **They tested `HQ Mono` and the estimate was wrong again.** Plausible:
   see §6. The two estimates this project produced for the same quantity,
   from the same method, were 62–79 % and 90–112 % load.
3. **They tested `HQ Mono`, the load is fine, and something else is
   broken** — the jumping (§7), or a defect in the mono path itself.

**Get these numbers before doing anything else:** diagnostic log on, ~10 s
each in `HQ` and `HQ Mono` at 0.85× / 0.7× / 0.6×, and read back the
percentage plus `inCh` and `underruns`. Without them the next round is
another guess.

## 3. What is proven — do not re-derive any of this

- **The DSP is correct.** The phase-coupling rewrite (spectrum rotation
  `Y[b] = X[b]·e^{iθ_p}`) was verified bit-exact against the older
  reconstruction. Pitch, length, gain and reset self-tests all pass. There
  is no numerical bug to hunt.
- **The pitch drop is fixed and understood.** It was `port.postMessage()`
  starving: under render-thread load the worklet's task queue never ran,
  so `shift` never arrived and the vocoder kept correcting for the
  previous tempo. Moving `shift` to a k-rate `AudioParam` fixed it. Proof:
  load now scales with tempo, which it provably did not before.
- **The hardware is not the limit.** Raw and Standard hold ~100 % at every
  tempo, and in Raw the worklet node is *still in the graph and still
  called every quantum* (pass-through). So the callback, the port and the
  graph cost nothing. The base load is negligible; the vocoder's
  arithmetic is the entire deficit.
- **One analysis frame per render quantum is free.** Both channels' frames
  used to land in the same quantum (histogram at 0.6×: 875 quanta with
  none, **0 with one**, 625 with two). A global budget of one frame per
  quantum, round-robin, is bit-identical (`maxDiff === 0`) with zero
  underruns and halves peak load.
- **The real FFT is exact and 61 % faster** than the complex pair it
  replaced (0.1554 → 0.0602 ms for forward+inverse at N=2048).

**Measured dead ends — do not spend time here:**

- `% ringSize` → `& (ringSize−1)`: 0.1607 → 0.1618 ms. Nothing. V8 already
  optimises modulo by a power of two.
- `N` 2048 → 1024: about 10 %. Cost per second goes as `4·log₂N` because
  `N` cancels against `Hs = N/4`. Not worth the resolution loss.
- Polyphase sinc resampler: raises cost, doesn't lower it.

---

## 4. What was concluded and later proven wrong

Two wrong conclusions are on the record; both cost a round.

1. **"The device has hit a hard ceiling (thermal throttling / weak
   core)."** Written into `SLOWPLAY-HQ-FIX-PLAN.md` because load did not
   rise from 0.85× to 0.6×. It didn't rise because the worklet never
   received the new `shift` and was doing identical work at all three
   tempos. The evidence was in the same log (missing `shiftAck`).
2. **"Mono processing will probably be enough."** My estimate, from an
   x86→device scaling factor of 26–33 derived from three approximate
   points. Unverified. See §6.

---

## 5. What was tried, round by round

**Round 1** (before this history): HQ shipped as default. Pixel 9
(GrapheneOS): stutter at 0.85×, clear pitch drop at 0.7×, a distorted
fragment every few ms at 0.6×. Default switched off.

**Round 2** — load measurement in the worklet, `shiftAck`, no allocations
in the audio thread, trig functions only at spectral peaks.
Result: 40–45 % less compute on x86. Device: 50–60 % of real time at every
tempo, pitch drop persists. Concluded "hard ceiling" (wrong, see §4).

**Interlude** — "Raw" mode added as a diagnostic. It plays smoothly at
0.7×/0.6× on the same device. This is the observation that unlocked
everything: the hardware is fine, the vocoder is not.

**Round 3** (PR #57, merged, `v117`) — `shift` via `AudioParam`; a
cross-mode load meter (`renderCapacity` where available, otherwise
`ctx.currentTime` vs `performance.now()` on the main thread); one frame
per quantum; real FFT.
Result on x86: mean −33–40 %, p99 −61–77 %. Device: the table in §2. The
pitch drop is gone. It still crackles.

**Round 4** (PR #58 for the plan, then implemented and merged as `v118`) —
input channel count in the load report; `renderCapacity` availability
logged and `start()` guarded; reset when reconnecting the worklet node; a
mono fast path (one shifter for a mono source, output copied); and a
fourth mode `HQ Mono` that downmixes before the vocoder via
`channelCount = 1, channelCountMode = 'explicit'` — Web Audio does the
`0.5·(L+R)` itself, so it needed no DSP code.

Measured, benchmark machine, mean ms per 128-sample quantum (deadline
2.67 ms):

| Tempo | HQ stereo | HQ Mono | factor |
|---|---|---|---|
| 0.85× | 0.130 | 0.066 | 1.97× |
| 0.7× | 0.158 | 0.078 | 2.03× |
| 0.6× | 0.180 | 0.091 | 1.98× |

Exactly the predicted 2×. Correctness was proven rather than
listened to: two shifters fed identical input produce bit-identical
output, and the real `HqShiftProcessor` produces bit-identical output on
both channels for a mono source (verified in Node with the worklet
globals stubbed).

Step 3 of that plan — 50 % overlap with a sine window, worth another 2× at
some cost in sound — was deliberately left conditional and is **not
implemented**.

### The cumulative picture

Rounds 2, 3 and 4 together cut the vocoder's cost by roughly **5–6×**
(≈1.75× × ≈1.6× × ≈2×). The device still does not play cleanly at 0.6×.
The only remaining lever inside the current design is one more 2×, and it
is the one that costs sound quality.

That is the signal worth acting on: **this is not a "one more round will
do it" situation.** Five rounds of arithmetic on a hand-written JS phase
vocoder have not reached the target, and the remaining headroom in that
direction is a single factor of two.

## 6. Why five rounds have not landed

The technical work was sound. The **method** was not, in three specific
ways:

1. **Everything was optimised against a proxy.** All benchmarks ran in
   Node on a server x86 core. The device was reached only through an
   estimated scaling factor (26–33) derived from three approximate numbers
   the user read off a screen. How unreliable that is, is now a matter of
   record: **the same method, applied twice to the same quantity, gave
   62–79 % and 90–112 % load** — the difference being nothing but noise in
   the x86 baseline of a shared machine. Predictions built on it have not
   survived contact. There is still **no measurement of the real shifter
   on the real phone.**
2. **Each iteration costs a human.** The only way to learn anything about
   the target device is to ask the user to play three tempos in three
   modes and read numbers back. That is the actual bottleneck, and it has
   never been engineered away — even though the app is the perfect place
   to put a self-benchmark.
3. **A self-imposed constraint went unexamined for three documents.**
   Every plan says "keine Fremdbibliothek" (no third-party library). That
   rule was inherited from the first plan and repeated without anyone
   asking whether it should hold — **while the repo already ships
   `lame.min.js` (LGPL) with a `THIRD-PARTY.md` entry and a licence
   file.** The project plainly has a process for third-party code. See
   §8, option C.

---

## 7. Known unknowns

- **Is the material mono or stereo?** The logging shipped in `v118`
  (`inCh` in every load report) but the answer has not been read back.
  It no longer gates anything — `HQ Mono` forces the saving either way —
  but it tells you whether plain `HQ` was ever paying double.
- **Why doesn't `AudioContext.renderCapacity` engage?** Chrome 152 should
  have it, but the device reports the fallback wording. Its `peakLoad` and
  `underrunRatio` would answer both the crackle and the jumping question
  directly.
- **Is the render thread the slow place, or the device?** The worklet does
  ~5 ms of work then sleeps ~13 ms, repeatedly. A CPU frequency governor
  may never boost that core, and Android often schedules audio callbacks
  on the efficiency cluster. The same code in a plain Worker, running
  continuously, could be substantially faster on identical hardware. This
  is a hypothesis, cheap to test, never tested.
- **What causes the jumping?** Three candidates, each with a decisive test
  in `SLOWPLAY-HQ-FIX-PLAN-3.md` §4. The most likely is a side effect of
  round 3: `applyHqMode()` now disconnects the worklet node outside HQ,
  the shifter keeps its state, and on reconnect it emits up to 43 ms of
  audio from before the disconnect. Two-line fix.

---

## 8. Options, ranked by expected value

**A. Test the premise (§0).** One desktop A/B of Standard vs HQ. If HQ
isn't clearly better, delete it. Highest value, lowest cost, never done.
Note what makes this urgent now: the only remaining lever inside the
current design (option D) degrades exactly the quality that justifies the
feature. Before trading that away, establish that there is something worth
trading for.

**B. Put the benchmark in the app.** A diagnostic button that runs the
actual `HqPitchShifter` on the actual device — once inside the worklet,
once in a plain Worker — and reports seconds-of-audio per second of wall
clock. This turns every future user test from one data point into
calibrated numbers, and it answers the Worker hypothesis in §7 at the same
time. Everything else should wait behind this.

**C. Drop the no-dependency rule and use a WASM stretcher.** — **A device
probe has moved this from a hunch to the leading option.** On the target
phone at 0.6×, our JS vocoder reaches 65 % of real time;
`signalsmith-stretch` reaches **100 %**. The 35 % gap that five rounds of
hand-optimisation could not close is simply absent.

Verified, not recalled: `signalsmith-stretch@1.3.2` is **MIT**, a single
113 KB JS file with its ~64 KB WASM embedded as a `data:` URI, so it needs
no network — it runs under the artifact CSP and would run offline in the
PWA. It is already an AudioWorklet node, and it brings two things our
vocoder does not have: **formant compensation** (without it, pitched-up
singing goes chipmunky — for a choir possibly the largest audible
difference of all) and **built-in looping** on a loaded buffer, which would
make the A-B loop sample-accurate instead of "a few hundred milliseconds at
best". WASM SIMD is available on the target device.

What the probe does **not** establish: 100 % is a ceiling, so the headroom
behind it is unmeasured; it ran in the Claude app's WebView rather than
Chrome or the installed PWA; it used a 4 s synthetic chord in buffer mode,
not choir material on live input; and it says nothing about sound. That is
what `SLOWPLAY-TESTLABOR-PLAN.md` is for.

Also checked: `rubberband-web@0.2.1` is GPL-2.0-or-later — valuable as a
private quality yardstick, not shippable on a publicly hosted page. The
SoundTouch packages are pure JS, no speed to be had. And the rule itself
was never the project's: the repo already ships `lame.min.js` (LGPL) with
a `THIRD-PARTY.md` entry and a licence file.

**D. Spend the last JS lever: 50 % overlap with a sine window.** Written up
in `SLOWPLAY-HQ-FIX-PLAN-3.md` §3, another ~2×, measured on x86 as
costing little in steady-state distortion (0.7–1.6 dB worse at 220 Hz and
1 kHz, 1.3–1.4 dB *better* at 6 kHz, level and pitch accuracy slightly
better) — but the characteristic weakness of 2× overlap, phasiness on
sustained notes, is exactly what HQ exists to avoid, and no measurement
settles it. This is the last move available inside the current design, and
it trades away the thing the feature is for. Do not spend it on a guess:
only after B, and only if the numbers say it would actually close the gap.

**E. Ship an honest partial.** HQ (or `HQ Mono`) at 0.85× only, Standard
below that. Nobody has proposed this in five rounds. It is a real product
that works today, with no further architecture — and a choir practising a
passage at 0.85× is a perfectly normal use of the app.

**F. Move the vocoder off the audio thread** (Worker + ring buffer, run
ahead ~1 s). Converts a hard per-quantum deadline into a soft throughput
requirement. **Only helps if throughput exceeds 1× real time** — buffering
cannot create CPU: with lead `L` and producer rate `p < 1`, clean playback
lasts `L/(1−p)`, which at today's `p = 0.65` means one second of buffer
buys 2.9 seconds. Needs B first. Note it does *not* need
`SharedArrayBuffer` (the app is on GitHub Pages and cannot set COOP/COEP
headers) — transferable `ArrayBuffer`s via `postMessage` are enough,
because in that design the worklet is nearly idle and its message queue
drains fine. The catch for this app specifically: a 1 s pipeline delays
A-B loop jumps, which matters for practice loops.

**G. Full offline pre-render.** Note the trap: the total work is
unchanged, it is merely not deadline-bound. At `p = 0.65` rendering a
4-minute song at 0.6× takes about 10 minutes. Only viable if B shows a
Worker is much faster, and even then it fits the app best as "render the
current loop during the first pass, then every repetition is free."

---

## 9. Where things are

- `index.html` — everything. Worklet building blocks: `hqPrincipalAngle`,
  `hqAnalysisHop`, `hqPitchRatio`, `HqFft`, `HqRealFft`, `HqPitchShifter`,
  assembled by `hqBuildWorkletSource()` via `Function.prototype.toString()`.
  Wiring: `hqCreateNode`, `applyHqMode`, `applyRateToElement`,
  `renderSlowMode`, `updateHqLoadVisibility`. Self-tests: `runSelfTests()`.
- **Trap:** anything a new worklet building block references must itself be
  in the array inside `hqBuildWorkletSource()`, and the source is embedded
  in a template literal — an unescaped backtick in a *comment* silently
  breaks `addModule()` in the browser only. This has already happened once.
  Extract the blocks into Node and run the self-tests there; that is what
  caught it.
- `SLOWPLAY-HQ-PLAN.md` — original design and the first measurement series.
- `SLOWPLAY-HQ-FIX-PLAN.md` — round 2. Its "Einordnung" section is wrong;
  a Nachtrag at the end says so.
- `SLOWPLAY-HQ-FIX-PLAN-2.md` — round 3. Implemented, shipped as `v117`.
- `SLOWPLAY-HQ-FIX-PLAN-3.md` — round 4. Steps 1, 2 and 2.5 implemented
  and shipped as `v118`; step 3 (50 % overlap) written up but deliberately
  **not implemented**. Its §7 lists the reserve options; its appendix has
  the reproducible benchmark harness; its Messergebnisse section has the
  round-4 numbers.
- `SLOWPLAY-HQ-HANDOFF.md` — this file.
- `sw.js` — `SW_VERSION`, bump on any change to `index.html`, `sw.js` or
  `manifest.json`. Documentation-only changes do not need a bump.
