// REPL driver for the Chor-App (static PWA: index.html + app.js, no build
// step, no backend). Run headless on Linux; no xvfb needed since Playwright
// launches Chromium itself. Designed for agents: wrap in tmux, send-keys
// commands, capture-pane output. See SKILL.md for the full command table
// and the two first-load overlays this app always shows.
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

// playwright is installed globally in this container (not as a local
// dependency of this static-file app), and ESM `import 'playwright'`
// does not consult NODE_PATH the way CJS `require` does — so resolve
// it explicitly via `npm root -g` and pull it in through `require`.
const require = createRequire(import.meta.url);
const globalModules = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalModules, 'playwright'));

const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });
const BASE_URL = process.env.CHOIRAPP_URL || 'http://127.0.0.1:8791/index.html';

let browser = null;
let page = null;
const consoleLog = [];

function requirePage() {
  if (!page) { console.log('ERROR: launch first'); return null; }
  return page;
}

const COMMANDS = {
  async launch() {
    if (browser) return console.log('already launched');
    browser = await chromium.launch({ args: ['--no-sandbox'] });
    page = await (await browser.newContext()).newPage();
    page.on('console', (m) => consoleLog.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => consoleLog.push(`[pageerror] ${e.message}`));
    await page.goto(BASE_URL, { waitUntil: 'load' });
    await page.waitForSelector('#song-list-host', { timeout: 15_000 });
    console.log('launched. loaded', BASE_URL);
  },

  // The app shows two one-time overlays on a fresh IndexedDB (first run in
  // this browser context): a 5-slide onboarding, then a "data compat"
  // notice. Both block clicks on everything behind them. Run this right
  // after launch, before navigating anywhere.
  async 'dismiss-overlays'() {
    const p = requirePage(); if (!p) return;
    const skip = p.locator('#onb-skip');
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      await p.waitForSelector('#onboarding', { state: 'hidden', timeout: 5000 }).catch(() => {});
      console.log('dismissed onboarding');
    } else {
      console.log('no onboarding overlay');
    }
    // The compat notice renders slightly after the onboarding overlay
    // closes (a transition, not instant) — a plain isVisible() check
    // right after clicking onb-skip misses it, so poll for up to 2s.
    const verstanden = p.locator('button:has-text("Verstanden")');
    await verstanden.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    if (await verstanden.isVisible().catch(() => false)) {
      await verstanden.click();
      await p.waitForTimeout(300);
      console.log('dismissed compat notice');
    } else {
      console.log('no compat notice');
    }
  },

  // Bottom nav: songs | playlists | player | settings
  async goto(view) {
    const p = requirePage(); if (!p) return;
    await p.click(`[data-view="${view}"]`);
    await p.waitForSelector(`#view-${view}.is-active`, { timeout: 5000 });
    console.log('view ->', view);
  },

  async ss(name) {
    const p = requirePage(); if (!p) return;
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await p.screenshot({ path: f, fullPage: true });
    console.log('screenshot:', f);
  },

  async click(sel) {
    const p = requirePage(); if (!p) return;
    try { await p.click(sel, { timeout: 5000 }); console.log('click', sel, '-> OK'); }
    catch (e) { console.log('click', sel, '-> ERROR:', e.message.split('\n')[0]); }
  },

  async 'click-text'(text) {
    const p = requirePage(); if (!p) return;
    try { await p.click(`text=${text}`, { timeout: 5000 }); console.log('click-text', JSON.stringify(text), '-> OK'); }
    catch (e) { console.log('click-text', JSON.stringify(text), '-> ERROR:', e.message.split('\n')[0]); }
  },

  // Feeds a file straight into a (usually visually-hidden) <input
  // type=file> without needing to click the button that normally
  // triggers it — this is how the app's import buttons work (button
  // click just proxies to input.click()).
  async upload(args) {
    const p = requirePage(); if (!p) return;
    const [sel, filePath] = args.split(/\s+(.+)/).map((s) => s?.trim());
    if (!sel || !filePath) return console.log('usage: upload <selector> <path>');
    await p.setInputFiles(sel, filePath);
    console.log('uploaded', filePath, '->', sel);
  },

  async fill(args) {
    const p = requirePage(); if (!p) return;
    const [sel, ...rest] = args.split(/\s+/);
    await p.fill(sel, rest.join(' '));
    console.log('fill', sel);
  },

  async type(text) { const p = requirePage(); if (p) await p.keyboard.type(text, { delay: 20 }); },
  async press(key) { const p = requirePage(); if (p) await p.keyboard.press(key); },

  async wait(sel) {
    const p = requirePage(); if (!p) return;
    try { await p.waitForSelector(sel, { timeout: 10_000 }); console.log('found:', sel); }
    catch { console.log('TIMEOUT:', sel); }
  },

  async eval(expr) {
    const p = requirePage(); if (!p) return;
    try { console.log(JSON.stringify(await p.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
  },

  async text(sel) {
    const p = requirePage(); if (!p) return;
    console.log(await p.evaluate(
      (s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
      sel || null,
    ));
  },

  // Dumps everything captured via page.on('console'/'pageerror') so far.
  // Note: this app's own self-tests log one *expected* simulated error
  // ("[notiz] Error: Testfehler") on every load — that's not a real bug.
  console() {
    console.log(consoleLog.length ? consoleLog.join('\n') : '(empty)');
  },

  async quit() { if (browser) await browser.close().catch(() => {}); browser = null; page = null; },
  help() { console.log('commands:', Object.keys(COMMANDS).join(', ')); },
};

const stdin = fs.createReadStream(null, { fd: fs.openSync('/dev/stdin', 'r') });
const rl = readline.createInterface({ input: stdin, output: process.stdout, prompt: 'driver> ' });

rl.on('line', async (line) => {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  if (!cmd) return rl.prompt();
  const fn = COMMANDS[cmd];
  if (!fn) { console.log('unknown:', cmd, '- try: help'); return rl.prompt(); }
  try { await fn(rest.join(' ')); } catch (e) { console.log('ERROR:', e.message); }
  if (cmd === 'quit') { rl.close(); process.exit(0); }
  rl.prompt();
});
rl.on('close', async () => { await COMMANDS.quit(); process.exit(0); });

console.log('choirapp driver - "help" for commands, "launch" to start');
console.log('(loads', BASE_URL, '- override with CHOIRAPP_URL)');
rl.prompt();
