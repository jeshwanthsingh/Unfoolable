# Command Center

A personal, local-first workspace for engineering work. Later slices may connect isolated implementation and verification to a clear human interface. The first bounded builder now produces isolated candidates; explicit protected verification is available for a narrow denial fixture, objective path checks and manual claims. Other claims remain unsupported. Explicit Attempt Fix now starts at most two evidence-backed corrections, each automatically checked against the same protected oracle.

Breakouts 1–10 support persistent local Git Project registration, rough engineering Missions, explicit Project Context capture, bounded evidence-backed analysis with clarification decisions, and explicitly reviewed Mission Contract revisions, and paired Vertical Slice Plans/Evaluation Contracts. A new Mission begins as exact durable user intent; analysis happens only when requested. An explicit one-Slice Codex Builder can produce a frozen candidate. Human-mediated narrow runtime permissions and composite Cancel are available; the Test Chamber now records protected claim evidence against exact frozen Candidate and accepted-artifact identities.

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

SQLite is owned by one coordinator per data directory. Normal shutdown releases the lock and a restart reopens the same migration metadata. Startup reclaims a lock only when its recorded coordinator PID is confirmed absent; living/reused or ambiguous ownership fails closed. Interrupted Builder attempts invalidate their transport and reconcile exact recorded process identities. They never resume or become Candidates automatically.

See docs/ARCHITECTURE.md and docs/NOT_NOW.md. Development-only browser evidence is saved under artifacts/breakout-1 and artifacts/breakout-2. No paid services or AI APIs are configured.

Development browser verification uses the already-installed Playwright CLI, without a package dependency or product adapter:

```bash
node scripts/ui-smoke.mjs
# Or verify a running production build:
node scripts/ui-smoke.mjs http://127.0.0.1:3210
```

## Local Project Registration

Choose Add Project, enter a name and an absolute repository path (or ~/ path), then Register Project. The coordinator validates Git identity read-only and confirms SQLite persistence before the card appears. Dirty repositories and detached HEAD are valid. Linked working trees are discovered by Git; registration itself performs no worktree management. A repository needs an existing committed HEAD.

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

## Read-Only Project Context

Open a Mission and choose Understand Project. This captures observed Git facts and paths, not semantic understanding. The Mission remains DRAFT. The registered Project path is resolved server-side; the browser cannot supply a replacement path. GET/POST /api/missions/:missionId/context-snapshots returns the latest persisted snapshot/count or appends a new snapshot. Earlier snapshots remain immutable.

Project → Mission → 0..N Project Context Snapshots. A snapshot contains an application UUID, Mission ID, typed observed payload, SHA-256 payload hash and timestamp. Migration 4 adds one snapshot table/index and database triggers rejecting update/delete. The foreign key restricts Mission deletion.

Observed facts: current HEAD/branch, Git porcelain working-tree changes, unique tracked-path count/fingerprint, top-level tracked structure, conventional important/manifest paths and heuristic test-like paths. Ignored files and submodule contents are not inventoried. No README, AGENTS, manifests, test/source contents or credential values are collected. Git itself reads its metadata and examines tracked files as needed to calculate status; external clean/process filters, hooks, fsmonitor, prompts and lazy network fetching are disabled. Filter configuration queries retrieve names only, never values. Filter-disabled status can differ from a project's filter-aware status. Repository symlinks are inventoried as paths and not followed by the application.

Capture compares before/after HEAD, branch, full observed status records and tracked-path set fingerprint, revalidating the canonical allowed repository root each time. Differences reject capture before insertion. This checks Git-observable endpoint state, not every intervening change. It does not prove bytes in an already-dirty file remained unchanged when its status stayed equivalent; it does not identify a repository replaced in place with identical observable metadata.

Canonical serialization sorts object keys and unordered arrays; SHA-256 identifies only that observed payload. The tracked-path fingerprint identifies the unique path set, not contents. Neither is a security/correctness proof or full filesystem/dirty-content snapshot. Capture is explicit, never automatic on Mission creation or retrieval.

Bounds: one capture at a time, 4-second timeout and 32 MiB stdout/stderr buffer bound per Git command, 250,000 tracked/changed entries, 4,096-character relative paths, 2 MiB stored payload. Summaries retain up to 40 structural groups, 40 important paths, 40 manifests, 40 test-like paths and 60 changed paths. Counts and truncation are explicit. Unsafe/resource failures create no snapshot.

Development-only context verification uses an isolated database with one registered disposable Project and one Mission:

```bash
node scripts/context-ui-smoke.mjs http://127.0.0.1:3210 capture
# Change the disposable repository, then:
node scripts/context-ui-smoke.mjs http://127.0.0.1:3210 recapture
# Restart with the same data directory, then:
node scripts/context-ui-smoke.mjs http://127.0.0.1:3210 persisted
```

Do not run this verifier against your personal registry. Evidence is saved under artifacts/breakout-3. No dependencies, AI providers or paid services were added.

## Command Center shell

The Workbench shows registered workspaces, API-derived Mission counts and a bounded literal preview of the last viewed Mission (or recently recorded fallback). The optional browser preference stores only a Mission ID and is checked against current records. It is not an execution state. Existing APIs and SQLite models are unchanged.

Engineering stations derive Intent from an actual Mission and Context from its actual latest snapshot. Loading/unavailable context stays distinct from no context. Clarify uses explicit analysis and saved decisions; Define now uses draft review and accepted revisions. Build requires an explicitly accepted Plan and Start Build; Verify and Proof remain unavailable. Needs You derives its real count from unanswered required questions.

Mission detail keeps the exact Original Request, changes, inventory, complete hashes, UUID, limits and fingerprint in native keyboard-accessible disclosures. Motion respects reduced-motion preferences. See docs/VISUAL_LANGUAGE.md for design constraints. Development visual verification uses scripts/shell-ui-smoke.mjs with an isolated registry and disposable repositories; artifacts and visual review live under artifacts/breakout-3.5.

## Targeted analysis and clarification

With context captured, choose Analyze Mission. This is one bounded read-only Codex interpretation—not a builder. It reads selected committed text through Git, never runs registered project code and does not give Codex the repository. Evidence is bounded to 12 files (at most three root/relevant guidance files and two root/relevant manifests), 40 blocks, 8 KiB/block, 128 KiB evidence and 256 KiB packet; individual files are capped at 1 MiB, searches at 200 files/160 recorded matches. A broad/truncated packet is marked incomplete. Source contents in dirty changes are intentionally excluded.

The packet contains exact Mission intent, snapshot identity/HEAD and selected evidence with path/line provenance. Analysis references must resolve to packet blocks. Model output is untrusted: strict fields, text bounds, evidence IDs, option/decision-area checks and at most five questions are enforced atomically. Zero questions is valid. Observations and inferences are separately labelled; references do not mechanically prove every AI claim.

The current installed codex-cli 0.160.0 uses the existing ChatGPT entitlement. The adapter is intentionally pinned to its verified capability boundary, uses no LLM SDK or API keys and fails safely if login/version changes. No billing is configured. Analysis has a 90-second process limit; failures do not mean no clarification is needed. Interrupted work is marked on restart and requires explicit retry.

Needs You now shows real required questions. Choose an option or supply free text; saving updates the durable count and phase. Answers never trigger AI, requirements or execution. DRAFT means no successful current analysis; NEEDS_CLARIFICATION means required decisions remain; CLARIFIED means only that none remain. Contract drafting and explicit acceptance are described below; construction requires a separate explicit Start Build, described below. A newer context displays an earlier-context warning; old analyses and answers remain intact.

Development-only verification: tests use fake analyzers; scripts/analysis-ui-smoke.mjs runs one real disposable UI analysis; scripts/analysis-quality-smoke.mjs runs exactly five explicit small quality fixtures. Both require existing ChatGPT authentication and should be used only with disposable data. Evidence lives under artifacts/breakout-4. No new application dependencies were added.

## Mission Contract review

A current clarified Mission can draft a bounded contract from its already-persisted analysis evidence and exact answers. The compiler does not reopen the repository. Codex produces a candidate, never an accepted contract. Prompt `mission-contract-v1` and defaults `engineering-defaults-v1` are recorded with the bound input.

Goal, required behavior, scope, non-goals, constraints, assumptions and risks carry source references. The validator rejects unknown sources, malformed fields, excessive content and common unsupported prescriptions; this finite detector does not prove semantic correctness. Inspect provenance before acceptance. Five defaults cover relevant errors, preserving unrelated behavior, appropriate tests, avoiding unrelated refactors and repository conventions.

Choose Edit Draft to change item text. Save creates an immutable child candidate, marks changed items USER_EDIT and retains the original AI draft. IDs/order and source references are controlled by the server; add/remove/reordering and rich-text editing are not implemented. Only the separate Accept Contract action validates current inputs and creates an immutable accepted revision. Revise Contract explicitly forks the latest accepted revision; it does not overwrite it.

CONTRACT_REVIEW means a current candidate needs review. CONTRACT_READY means the agreed WHAT exists and is still bound to the current context, successful analysis and exact answer state. It does not mean execution, planning, evaluation or verification is available. Answer edits, newer analysis/context and active analysis invalidate currentness; historical revisions remain intact. A stale draft cannot be accepted. Startup interrupts unfinished drafting without resumption.

Input is limited to 384 KiB, statement text to 700 characters, required behavior to 20 items and canonical payload to 48 KiB. Accepted canonical documents are bounded to 128 KiB, sort object keys and preserve array order. SHA-256 identifies the accepted document (payload, bound input hash and user-edit sources); it does not prove correctness. Known risks and assumptions are disclosed, not silently resolved.

Development verifiers: scripts/contract-quality-smoke.mjs runs five small real Codex fixtures; --recheck revalidates recorded outputs without another AI call. scripts/contract-ui-smoke.mjs exercises a disposable clarified registry. Evidence, screenshots, exact live contract and visual critique are in artifacts/breakout-5. No new dependencies, providers, API keys or billing were added.

## Vertical slices and Evaluation Contract

Only a current accepted Contract can be planned. Choose Draft Plan + Evaluation Contract for one bounded Codex drafting operation (`mission-planning-v2`, `planning-defaults-v1`). Input is built entirely from stored accepted artifacts, current analysis/answer/context bindings and original sources; no repository is reopened.

Slices describe observable end-to-end increments, not database/backend/frontend/tests phases. Evaluation claims define future evidence, never collected evidence or passing tests. Every required behavior needs slice coverage or explicit cross-cutting classification plus evaluation coverage; every constraint needs evaluation coverage. Risk classifications retain their distinction from requirements. The server derives the matrix and validates references, links, bounds, browser basis, measurable accepted targets and manual rationale. Finite semantic guards and six fixtures do not establish general semantic correctness: review the actual outcomes and obligations.

The first prompt bundled independent approval/recovery outcomes into one large slice. Its results remain in artifacts/breakout-6/quality-results-v1.json; the versioned v2 prompt separates independently demonstrable outcomes without forcing a fixed slice count. Installed strict output rejects uniqueItems; duplicate ID references are enforced by server validation instead.

Edit titles, outcomes, flows, requirement bindings, evaluation wording/types/evidence and related bindings through structured fields. Invalid edits remain unsaved and cannot be accepted; saving valid edits forks an immutable candidate with USER_EDIT field attribution. Accept Plan + Evaluation Contract is a separate action: both revisions commit in one transaction or neither does. Explicit revision workflows retain old pairs, available through Accepted history.

PLAN_REVIEW means a current candidate requires human review. PLAN_READY means a current immutable pair is agreed. PLAN_READY does not start a builder, make a worktree, run tests/browser verification, or execute project code. Changed Contract revision identity, decisions, analysis or context makes older artifacts historical; stale acceptance fails closed. Unfinished drafting is interrupted on restart, never resumed.

Bounds: 1–8 slices, 1–30 claims, 700 characters per text field, at most eight flow/evidence steps, 512 KiB input, 64 KiB draft payload and 128 KiB per accepted canonical document. Hashes sort object keys and preserve array order; they identify documents, not correctness. Required evidence lives in native disclosures, and planning coverage uses accent/neutral colors. Build shows preparation until explicit Start Build; Verify/Proof execution remain unavailable.

Development verifiers: scripts/planning-quality-smoke.mjs runs six explicit subscription-backed fixtures (--recheck makes no AI calls); scripts/planning-ui-smoke.mjs and planning-followup-ui-smoke.mjs exercise disposable registries. Exact outputs, runtime/browser evidence, screenshots, refinement and reproducible smoke helpers are under artifacts/breakout-6. No dependencies, providers, API keys or paid billing were added.

## One-Slice Builder

Choose an accepted Slice and explicitly Start Build. Admission requires current PLAN_READY artifacts, clean canonical source inside allowed roots, unchanged accepted base HEAD, no active/reconciliation attempt, and codex-cli 0.160.0. One Builder runs globally at a time, with a 15-minute wall-clock limit. Failures retain the accepted plan for an explicit fresh attempt. A current Candidate blocks additional construction.

The coordinator creates a detached attempt worktree under the data directory. The worktree isolates source changes; Codex native sandboxing is a separate capability boundary. Network and unrelated host integrations are disabled. Only certified exact current-turn file requests can be explicitly allowed; unsupported requests grant nothing and trigger composite cleanup. No package installation, browser, remote Git mutation, automatic retry or second Slice.

After verified process cleanup, a temporary Git index captures tracked changes, deletions and new nonignored files as a tree, without a user-visible commit. SQLite freezes the Candidate and its diff hash. Builder-reported commands are development evidence only. CANDIDATE_READY is not verified, and Evaluation Claims remain unexecuted. Symlinks/submodules and ignored outputs outside .cc-runtime conservatively prevent capture in this first bounded version.

See docs/BUILDER_RUNTIME.md for ownership, fencing, restart, event bounds and limitations. Development-only live smoke: node scripts/build-smoke.ts --run-live --root /absolute/disposable/fixture. It prepares deterministic reviewed fixture artifacts, serves the UI, and waits for explicit Start Build; it never starts automatically. Use only a disposable fixture with your existing ChatGPT/Codex entitlement.

## Runtime decisions and Cancel

A genuine supported request pauses the Builder and appears in Needs You. Allow grants exactly the displayed file-write capability for the current Codex turn; it is not one write. Deny grants nothing. Decisions are durable before transport writes, and provider acknowledgment is distinct from observed effects. Cancel invalidates pending authority and reconciles owned processes/effects before reporting interruption. Unknown recovery blocks new builds; no Force clear or callback resume. Explicit Retry creates a new generation/worktree/transport. See docs/RUNTIME_PERMISSIONS.md.

## Protected verification (Breakout 9)

Choose Run Verification explicitly after a Candidate exists. Each Run gets a fresh workspace from its frozen object archive, an immutable coordinator-owned recipe and bounded evidence. Builder checks remain non-authoritative. All accepted claims are required: unsupported, missing, interrupted or inconclusive evidence prevents acceptance. Acceptance checks passed means only the recorded finite checks passed for the bound Candidate/recipe/environment; it does not mean fully verified or production ready.

The initial automatic recipe supports the explicitly accepted `approval.py` denial/allowed-effect fixture from stored pre-Build evidence, plus the exact objective protected-path claim. Arbitrary commands, browser and performance claims are unsupported. Accepted manual claims wait for a local operator result and nonempty evidence note. A new Run is required to revise a finalized result.

Native execution currently requires macOS and the existing Python 3 interpreter. A process-local native sandbox denies network, fork, exec, signalling, user/control reads and writes outside disposable scratch. System/framework reads remain available; this is no Aegis microVM or universal hostile-code security certification. Missing sandbox/toolchain support fails inconclusive. See docs/PROTECTED_VERIFICATION.md for the precise boundary.

Rerun creates independent history. Restart interrupts unfinished Runs and reconciles recorded process identities; it never resumes or infers PASS. Changed evidence or bindings make old results historical. Proof/receipt and automatic correction remain unavailable.

## Bounded debugging

An eligible current definitive protected FAIL exposes **Attempt Fix**. The Debug Bench records a bounded, hashed Failure Packet and a tool-free subscription-backed Codex diagnosis. Only a validated `candidate_defect` classification can start correction. Ambiguity, evaluator/environment issues, stale identities, uncertain cleanup and exhausted budgets need human attention. ERROR/UNSUPPORTED/INCONCLUSIVE are never code-fix admission states.

Each correction uses the existing Builder in a fresh workspace seeded from the exact frozen parent Candidate; its original accepted base is preserved. The existing explicit permission, cancellation and reconciliation boundaries apply. All required claims run automatically against the unchanged Evaluation, Recipe and evaluator. Two corrections is a durable maximum. `RESOLVED` means protected acceptance checks passed, not Mission completion; no receipt exists. Restart interrupts work and never resumes partial diagnosis or grants permission.

See [DEBUGGING.md](docs/DEBUGGING.md). Development-only reproducible fixture: `node scripts/debug-smoke.ts --fixture --production --scenario two --case bad --root /private/tmp/command-center-debug-smoke` after `npm run build`. The CLI prints a loopback URL. Use the UI Run Verification → Attempt Fix. `real` uses the existing ChatGPT-backed Codex for diagnosis/correction; other enumerated scenarios are explicitly labeled lifecycle adapters, not product providers.
