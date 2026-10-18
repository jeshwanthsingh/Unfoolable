# Unfoolable — design outline

## Architecture

- React/Vite browser UI; loopback Node 24 coordinator; SQLite.
- Plain Codex builds in private copies; the owner decides Accept or Reject.

## Event log

- Append-only `ticket_events`: typed events, sequence numbers and timestamps.
- Main-screen updates use one authenticated SSE stream from stored state.

## Grader isolation

- Original tests are restored into disposable exports before checking frozen code.
- Project-recipe judges run separately from Candidate execution. Native existing tests retain in-process risks.
- The independent Test Writer sees original code and remains advisory.

## Sandbox

- Owned workspaces live under `~/.cc-work`; protected folders stay deny-read.
- Builder has no outside network. Checker fixtures may use loopback; owned-child signalling is scoped.
- Process ownership requires PID plus kernel start identity.

## Approvals

- WebAuthn/Touch ID binds a one-use, two-minute confirmation to the exact current item.
- Flagged or incomplete reviews require opening every changed file. Changed evidence invalidates approval.
- Messages and scripts cannot silently make human decisions; tests use isolated data.

## Measurement

- Latest writer study: 2/11 correct confirmed; 0/8 wrong confirmed. Writer stays advisory.
- Historical study: 1/6 correct confirmed, with correlated tasks and blocked artifacts.
- Twelve planted controls stayed non-PASS; uncertainty is recorded rather than promoted to success.
- Sources: `artifacts/warning-signal/RESULT.md`, `artifacts/ui4/REPORT.md`, `artifacts/cleanup/`.
