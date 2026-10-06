# Command Center

A personal, local-first workspace for engineering work. Later slices may connect isolated implementation and verification to a clear human interface. Those capabilities do not exist in this foundation.

Breakout 0 provides a React shell, a loopback Node coordinator, real health status and SQLite migration infrastructure. There are no project/mission models, agents, execution adapters or approval flows.

## Setup and development

Use Node 24 LTS (24.15 or newer within Node 24, tested with 24.21.0). This repository includes .node-version; use `fnm use` with your configured manager, or the existing AI-lab environment:

```bash
cd ~/Projects/ai-lab/command-center
source ../env.sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. One dev command launches Node's server watcher and Vite; Ctrl-C stops both. Default coordinator port 3210; optional COMMAND_CENTER_PORT must be 1024–65535. COMMAND_CENTER_DATA_DIR defaults to ./data; relative paths are anchored to the repository working directory. No provider/model environment configuration exists.

```bash
npm test
npm run typecheck
npm run build
npm start
```

After building, npm start serves UI and API together at http://127.0.0.1:3210. Run commands from the repository root. The Node-version guard fails clearly on an unsupported runtime; it does not alter other projects' Node settings.

## Current architecture

Browser UI → local coordinator → SQLite. The only API is GET /api/health with version and measured database readiness. UI initially shows checking/unknown states and refreshes health every 15 seconds or on request; a failure does not stay green. Runtime data, logs, builds and verification artifacts are Git-ignored.

SQLite is owned by one coordinator per data directory. Normal shutdown releases the lock and a restart reopens the same migration metadata. An unclean crash leaves a lock: verify the recorded PID is no longer your coordinator before removing data/.coordinator.lock. Never remove a live/uncertain owner's lock. No automatic destructive recovery is implemented.

See docs/ARCHITECTURE.md and docs/NOT_NOW.md. Development-only browser evidence is saved under artifacts/breakout-0. No paid services or AI APIs are configured.

Development browser verification uses the already-installed Playwright CLI, without a package dependency or product adapter:

```bash
node scripts/ui-smoke.mjs
# Or verify a running production build:
node scripts/ui-smoke.mjs http://127.0.0.1:3210
```
