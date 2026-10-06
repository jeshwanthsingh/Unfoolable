# Command Center

A personal, local-first workspace for engineering work. Later slices may connect isolated implementation and verification to a clear human interface. Those capabilities do not exist in this foundation.

Breakouts 1–2 support persistent local Git Project registration and recording rough engineering Missions. A Mission in Breakout 2 is only durable user intent. It has not yet been analyzed. Agents, execution adapters and approval flows are absent.

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

Browser UI → local coordinator → SQLite. The APIs are GET /api/health, GET/POST /api/projects, GET/POST /api/projects/:projectId/missions and GET /api/missions/:missionId. UI initially shows checking/unknown states and refreshes health every 15 seconds or on request; a failure does not stay green. Runtime data, logs, builds and verification artifacts are Git-ignored.

SQLite is owned by one coordinator per data directory. Normal shutdown releases the lock and a restart reopens the same migration metadata. An unclean crash leaves a lock: verify the recorded PID is no longer your coordinator before removing data/.coordinator.lock. Never remove a live/uncertain owner's lock. No automatic destructive recovery is implemented.

See docs/ARCHITECTURE.md and docs/NOT_NOW.md. Development-only browser evidence is saved under artifacts/breakout-1 and artifacts/breakout-2. No paid services or AI APIs are configured.

Development browser verification uses the already-installed Playwright CLI, without a package dependency or product adapter:

```bash
node scripts/ui-smoke.mjs
# Or verify a running production build:
node scripts/ui-smoke.mjs http://127.0.0.1:3210
```

## Local Project Registration

Choose Add Project, enter a name and an absolute repository path (or ~/ path), then Register Project. The coordinator validates Git identity read-only and confirms SQLite persistence before the card appears. Dirty repositories and detached HEAD are valid. Linked working trees are discovered by Git; no worktree management is implemented. A repository needs an existing committed HEAD.

The allowed-root default is ~/Projects. To explicitly allow other existing folders:

```bash
COMMAND_CENTER_PROJECT_ROOTS='["~/Projects","~/Developer"]' npm run dev
```

Canonical paths identify duplicates; each Project gets a separate application UUID. Symlinks escaping allowed roots are rejected. No repository files or Git state are changed by registration. No README, AGENTS or source files are analyzed. registered_head and registered_branch remain historical registration metadata: listing reads SQLite, not Git. Registration persists across application restarts. No update/delete API exists.

Migration 2 upgrades the Breakout 0 metadata database without replacing its original migration row. Tests create disposable Git fixtures before registering them; application Git operations are read-only. Development UI registration/restart evidence uses an isolated verification database, not your default project registry.

## Rough Mission Creation

Open a registered Project, choose New Mission, and record your rough request. The original intent is preserved exactly, including leading/trailing whitespace, formatting and punctuation. Empty/whitespace-only intent is rejected. The limit is 8,000 UTF-16 code units (JavaScript string length), with the existing 16 KiB JSON transport limit also enforced. Malformed Unicode (unpaired UTF-16 surrogates) is rejected, since SQLite UTF-8 would otherwise replace it. Accepted text is never rewritten, summarized or analyzed.

Each Mission gets an application UUID, its Project ID, exact original intent, phase DRAFT and creation timestamp. DRAFT means recorded but not analyzed or clarified. Identical requests create separate Missions. Lists are newest-first, with ID ascending to break timestamp ties. Mission detail reads the persisted original request. Restarting reopens the same IDs and content. Creating or reading Missions uses SQLite only; it does not inspect the registered repository or refresh Project metadata.

Migration 3 adds only missions and its project/list-order index. The Project foreign key uses ON DELETE RESTRICT; there is no deletion API. Tests upgrade databases created by the exact Breakout 0 and Breakout 1 code, preserving their existing rows.

The development-only Mission verifier requires an isolated database with one registered Project and initially no Missions:

```bash
node scripts/mission-ui-smoke.mjs http://127.0.0.1:3210 create
# Restart the backend with the same data directory, then:
node scripts/mission-ui-smoke.mjs http://127.0.0.1:3210 persisted
```

It creates two disposable drafts via the UI. Do not run it against your personal registry. Evidence is saved under artifacts/breakout-2; no Playwright runtime dependency is added.
