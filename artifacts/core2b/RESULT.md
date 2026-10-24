# CORE-2b — versioned verdict replay

Completed locally on codex/core-2b from f6327bf. No push, merge, deployment, production restart, real decision or data rewrite. All temporary files are in ignored .work/core2b.

## Versions

- v1: packages/shared/cores/verdict-core-v1.ts, 148 lines, exactly the original bytes from main 4abc25a. SHA-256: 9e343a112cb4129e2526a695127949095997eeddcd14c643c5908aafdb627d33.
- v2: packages/shared/verdict-core.ts, CORE_VERSION verdict-core-v2, 597 lines. SHA-256: 109f2081e6954fe2b0145962cb629c043ceb5246a1020be0ffc4976694489911.
- docs/CORE_VERSIONS.json records dates, source paths, hashes and changes. Both implementations pass the pinned TypeScript authority lint.

The trusted shell resolves only fixed local filenames. It checks recorded version/hash against the registry and actual source bytes on every replay, including when a module is cached. Node 24's native type stripping executes the exact checked TypeScript source, avoiding a hash over one file while executing an unbound compiled sibling. The production build packages both canonical sources and the registry. No dependency was added.

New snapshots and seals use only v2. CLI and Proof share verifyTicketSeal, which selects the recorded version and compares the complete original decision and trace without normalizing old fields. Unknown versions, unknown hashes, substituted version/hash pairs and edited registered sources produce “Seal broken: unknown core”. Signature, key lifetime/revocation, snapshot/facts/trace/diff binding and event-chain checks remain intact.

## Regression and real-data proof

Before the fix, all four existing production seals reported a current-core source mismatch on a consistent SQLite backup copy. The new version tests first reproduced four failures out of five cases. Final six cases pass: authentic v1 CLI replay (including v1's old ERROR trace), new v2 seal, unknown signed hash, unknown signed version, editing cached v1 source in the same process, and selector substitution/no-fallback checks.

Final ./cc verify --all on the real-data copy: 4 sealed and replaying, 8 older-unsealed, 0 broken. Exit code 2 is expected for the eight genuinely unsealed historical records. No signatures were manufactured for them. The compiled production runtime independently reports the same 4 / 8 / 0. No private signing key or hardware blob was copied, and production records were never rewritten.

## Formatting

.prettierrc sets printWidth 100; .prettierignore protects released cores. Prettier 3.6.2 (MIT, already cached) ran only on v2. It initially removed optional punctuation. Thirteen targeted prettier-ignore comments preserve that punctuation while allowing the rest of the core to use width 100. The final pinned TypeScript scanner comparison proves every non-trivia token kind AND literal token text identical after the version bump, before/after formatting. V2 is 606 -> 597 lines; v1 never changed. Prettier check passes.

## Optional safer review rule

Commit e579fc4 contains only ticket-service.ts, tests/diff-review.test.ts and docs/HONEST_APPROVALS.md. GREEN now requires opening every changed file, just like AMBER and RED. The GREEN regression failed first; all three colors require the exact current file views, partial views do not count, and stale bindings are rejected. Discard remains available without opening changes. Existing exact-item Touch ID is unchanged. This commit can be dropped independently of versioned replay.

## Final checks

- Full suite: 1,253/1,253, zero failed/skipped/cancelled, 364.467846334 seconds under caffeinate -dims.
- Typecheck and isolated production build PASS; nine Workshop images present; two canonical cores packaged. Existing bundle-size warning remains.
- Strict f6327bf golden comparison: 61 decisions/reasons/traces, zero differences. Registered v1 vs original 4abc25a: another 61, zero differences. Original golden files unchanged; CORE-2 command-mismatch ERROR remains separately tested.
- Twelve negative controls: five FAIL, seven INCONCLUSIVE, zero PASS; runner hashes unchanged during execution.
- Real Builder probe: 74 existing targets plus archived-core and registry targets, all 76 denied; eight sensitive endpoints and both signing helpers denied. Owned Git status/diff/log, SQLite temp and writes still work.
- Protected inventory: 277/281 unchanged. Four requested exceptions: current core, versioned snapshot/seal shell and optional all-colors diff-view predicate. New registry and packaging files are separately enumerated; package.json adds only the build packaging hook.
- Credential scan: no leaks in changed source, tests and docs. No new runtime or dev dependency; Builder model, transport, runtime, sandbox and permissions unchanged.

No requested check remains blocked. Existing host-trust, in-process-test forgery and best-effort tripwire limitations are unchanged. A seal authenticates the recorded result, including ERROR or NOT CHECKED; it never grants Accept.
