---
name: run-choirapp
description: Serve, launch, and drive the Chor-App (choirapp) — a static HTML/JS PWA with no build step. Use when asked to run the app, take a screenshot of it, click through its UI, or verify a change (e.g. song import, notes/lyrics, settings) actually works in the browser.
---

Choirapp is a static PWA (`index.html` + `app.js`, no bundler, no
backend) that needs a real HTTP origin — `file://` breaks its Service
Worker and IndexedDB. Drive it via the Playwright REPL at
`.claude/skills/run-choirapp/driver.mjs`: headless Chromium, no xvfb
needed. All paths below are relative to the repo root.

## Prerequisites

Playwright is expected to already be installed globally in this
container (`npm root -g` should list `playwright`, with Chromium under
`/opt/pw-browsers`). If it's missing:

```bash
npm install -g playwright
npx playwright install --with-deps chromium
```

The driver resolves the global `playwright` package itself at
startup (see Gotchas) — no local `npm install` needed in this repo.

## Build

None. No package.json, no bundler — the files are served as-is.

## Run (agent path)

1. Serve the repo root over HTTP (background), waiting for it to actually respond:

```bash
(python3 -m http.server 8791 --bind 127.0.0.1 > /tmp/choirapp-http.log 2>&1 &)
timeout 10 bash -c 'until curl -sf http://127.0.0.1:8791/index.html >/dev/null; do sleep 0.5; done'
```

Stop it later with: `lsof -ti:8791 -sTCP:LISTEN | xargs -r kill`

2. Launch the driver under tmux and drive it:

```bash
tmux new-session -d -s app -x 200 -y 50
tmux send-keys -t app 'node .claude/skills/run-choirapp/driver.mjs' Enter
timeout 15 bash -c 'until tmux capture-pane -t app -p | grep -q "help for commands"; do sleep 0.3; done'

tmux send-keys -t app 'launch' Enter
timeout 30 bash -c 'until tmux capture-pane -t app -p | tail -3 | grep -q "launched\."; do sleep 0.3; done'

# Every fresh launch is a brand-new browser profile (empty IndexedDB),
# so the app always shows its two first-run overlays. Dismiss both
# before clicking anything else:
tmux send-keys -t app 'dismiss-overlays' Enter
sleep 1

tmux send-keys -t app 'ss landing' Enter
tmux capture-pane -t app -p
```

Screenshots land in `/tmp/shots/` (override with `SCREENSHOT_DIR`).
The app loads from `http://127.0.0.1:8791/index.html` by default
(override with `CHOIRAPP_URL` if you served it on a different port).

### Commands

| command | what it does |
|---|---|
| `launch` | open headless Chromium, load the app, wait for the song list host |
| `dismiss-overlays` | close the onboarding slideshow and the "data compat" notice (both appear on every fresh profile) |
| `goto <view>` | click the bottom nav to `songs` \| `playlists` \| `player` \| `settings` |
| `ss [name]` | screenshot → `/tmp/shots/<name>.png` |
| `click <css-sel>` | click an element |
| `click-text <text>` | click the first element containing this text |
| `upload <css-sel> <path>` | feed a file straight into a (often hidden) `<input type=file>` |
| `fill <css-sel> <text>` | fill a text input/textarea |
| `type <text>` / `press <key>` | keyboard input |
| `wait <css-sel>` | wait up to 10s for an element to appear |
| `text [css-sel]` | print `innerText` (omit selector for `document.body`) |
| `eval <js>` | evaluate an expression in the page, print JSON |
| `console` | dump captured browser console/pageerror lines |
| `quit` | close the browser, exit the driver |

Example: importing a notes `.txt` export and confirming the dialog
(this is how the printable-text import feature, `importPrintableFile()`
in `app.js`, was actually verified — see fixture at
`.claude/skills/run-choirapp/fixtures/notes-import-sample.txt`):

```bash
tmux send-keys -t app 'goto settings' Enter
tmux send-keys -t app 'upload #notes-import-input .claude/skills/run-choirapp/fixtures/notes-import-sample.txt' Enter
sleep 1
tmux send-keys -t app 'wait #dlg-ok' Enter    # confirm dialog appeared
tmux send-keys -t app 'click #dlg-ok' Enter
sleep 1
tmux send-keys -t app 'goto songs' Enter
tmux send-keys -t app 'text #song-list-host' Enter   # -> the imported/placeholder song title
```

## Run (human path)

```bash
python3 -m http.server
```

Then open `http://localhost:8000` in a real browser. Fine for a human;
useless for an agent since nothing renders visibly in this container.

## Test

There's no separate test runner. `runSelfTests()` and
`runAsyncSelfTests()` (in `app.js`) run automatically on page load and
log to the browser console — check them with the driver's `console`
command after `launch`. One line is an *expected* simulated failure
from the self-tests themselves, not a real bug:
`[notiz] Error: Testfehler` (thrown deliberately to test the storage
queue's error handling — see `runAsyncSelfTests` in `app.js`).

## Gotchas

- **`import 'playwright'` fails in the driver's ESM module** even
  though `playwright` is installed — Node's ESM resolver, unlike CJS
  `require`, does not consult `NODE_PATH`/the global `node_modules`
  for bare specifiers. The driver works around this with
  `createRequire(import.meta.url)` + `execSync('npm root -g')` to pull
  in the global package explicitly. If you get
  `Cannot find package 'playwright'`, this resolution shimmed is
  probably missing or broken — check the top of `driver.mjs`.
- **Every `launch` is a brand-new profile.** `chromium.launch()` +
  `newContext()` gives an ephemeral, non-persistent IndexedDB, so the
  onboarding slideshow and the "Hinweis zur Datenkompatibilität" modal
  reappear on *every* launch, not just the first ever run. Always run
  `dismiss-overlays` right after `launch`, before anything else — both
  overlays sit in a full-screen `.overlay`/`.onboarding` layer that
  intercepts all clicks underneath.
- **The compat notice renders ~200ms after the onboarding overlay
  closes** — not instantly. A naive `isVisible()` check called right
  after clicking `#onb-skip` misses it. `dismiss-overlays` polls with
  `waitFor({state:'visible', timeout:2000})` for this reason.
- **`waitForSelector('#foo[hidden]')` is a trap.** It looks like "wait
  until #foo has the hidden attribute," but Playwright's default
  `state: 'visible'` then requires the element to be *visible* — which
  a hidden element can never be — so it always times out (silently, if
  you `.catch()` it, wasting the whole timeout). Use
  `waitForSelector('#foo', { state: 'hidden' })` instead — that's what
  the onboarding-close wait in `dismiss-overlays` does.
- **Import buttons are proxies for hidden `<input type=file>`
  elements** (`#notes-import-input`, `#lyrics-notes-import-input`,
  `#backup-input`, etc.) — clicking the visible button just calls
  `.click()` on the real input. Skip the button and call `upload`
  directly on the input's selector; no native file-picker dialog to
  fight.

## Troubleshooting

- **`page.click()` times out with "element intercepts pointer
  events" on `<div class="overlay">` or `.onboarding`**: you forgot
  `dismiss-overlays` after `launch`, or ran it too early — see Gotchas.
- **`curl: (7) Failed to connect` right after starting the HTTP
  server**: the polling loop in Run (agent path) step 1 handles the
  startup race; if it still fails, something else is already bound to
  the port — `lsof -ti:8791 -sTCP:LISTEN` and kill it first.
- **IndexedDB/Service Worker silently don't work**: you loaded the
  page via `file://` instead of the HTTP server — always go through
  `http://127.0.0.1:<port>/index.html`.
