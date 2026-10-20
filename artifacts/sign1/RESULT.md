# SIGN-1

Local branch codex/sign-1, based on f947240. No push, merge, deployment, new dependency, new reviewer study or paid API billing.

## Step 0: reviewer cost decision

[Updated overlap table](overlap.md), eight wrong saved patches plus the twelve saved controls. Existing local tools ran offline. Intent and Readability catch the same five wrong cases with zero false alarms in eleven correct cases. Four already had Test Writer alarms; the special-case patch also has a Pyright flag. Therefore unique reviewer-only catches: zero. All reviewers remain OFF. The conditional Intent-only AMBER/RED activation, desk and allowance-spending button were not enabled. Reviewer cost remains zero.

Precision: the extra Pyright diagnostics are in the changed test file (import/type diagnostics), not semantic proof of the SDK behavior. They are a reason to inspect the patch, which is the specified case-overlap signal. Inapplicable/error gates are listed rather than called passes. No tools, grader assertions, saved BASEs or old study outputs were changed.

## Attestation

[Pretty-printed Statement](example-statement.json), [DSSE envelope](example-attestation.json), [exact fixture facts](example-facts.json), [public example key](example-public.pem), [independent example audit](example-audit.json). The example is an isolated NOT CHECKED fixture, never a real task or human decision. It uses its own test key. Production verification pins docs/VERIFY_KEY.pem.

A byte-counted DSSE PAE covers an in-toto Statement v1 using ECDSA P-256/SHA-256. It binds ticket/event identity, unchanged verdict, exact facts snapshot and trace hashes, core version/source, BASE, Candidate commit/diff hash, tool versions, event-chain hash and timestamp. The signer never imports Candidate code.

## Key choice

**Protected P-256 file fallback, NOT hardware-backed.** The unsigned Swift/CryptoKit feasibility compile exited 69 because Xcode's licence has not been accepted. No licence was accepted and no entitlements or security settings changed. Secure Enclave feasibility remains unknown. Private key: app-data signing/private.pem, 0600; parent 0700. Only its public PEM is committed. The real Builder cannot read it or load the signing helper, and invocation returned no signature. See signing-mode.json, secure-enclave-probe.json and after-probe.json.

## Log, verification and backup

Migration 21 adds a global chain over ticket_events, an origin/head and immutable attestation records. Older events retain their exact bytes and are not sealed. Every new ticket event links to the previous hash. Publishing a check event, its signature and signed display marker is atomic. Signing errors are disclosed separately; no stored/core verdict is replaced.

cc verify <ticket> and cc verify --all use one read-only SQLite snapshot, validate the chain/signature/facts/core/trace/diff and replay the stored facts. Exit 0 means sealed and replaying; 1 means a break; 2 means older/unsealed/no checks. Proof shows Sealed and Replays the same, or red Seal broken with the exact reason. The existing verdict and passkey decision rules are unchanged.

Actual [good CLI output](verify-good.txt) and [fact-tampered output](verify-tampered.txt). Existing real ticket b15600b3 was read only: [older result](verify-older.txt), event 664, Not sealed (older than SIGN-1), exit 2. No real record was backfilled or rewritten.

Backup manifests and last-success records include the current chain head. Replicated SQLite retains its chain tables; protected file checkpoints retain signing identity, facts, signatures and sealed diffs. The restore test verifies the same head and a valid replaying seal after copying to a separate data directory.

## Attack evidence

| Attack | Result |
|---|---|
| One byte in saved facts | BROKEN, hash mismatch |
| Edited stored verdict | BROKEN, chain mismatch |
| Deleted check event | BROKEN, chain mismatch, even with no remaining check |
| Another ticket's attestation | BROKEN, identity mismatch |
| Changed frozen diff bytes | BROKEN, diff mismatch |
| Builder reads key | denied in real pinned session and exact-profile probe |
| Builder loads/invokes helper | denied; zero signature bytes |
| Concurrent normal event appends | valid verification from one read snapshot |

Further tests cover signature payload edits, Unicode byte lengths, rollback atomicity, original-history preservation, restart and backup replay.

## Workshop

A small press at the Grader desk shows a wax mark only after a matching signed-attestation event, authenticated by the read-only detail status. Stale/missing events do not stamp. Broken state is red. Phone/reduced motion uses the static illustration. All four existing roles remain; no reviewer desk was invented. Screenshots seal-1440-dark-signed.png and seal-390-light-broken.png show explicitly labelled isolated fixtures, not new real work.

## Validation and limits

Final complete suite: 1125/1125 pass, zero failures/skips/cancelled, 329.614 seconds. Typecheck and build pass. Exact results are in FINAL_VALIDATION.json and full-suite-complete.log. The first full suite exposed four stale schema/table-count expectations; these were corrected while preserving historical row/hash and behavior assertions. A subsequent full run passed 1124/1124; final validation includes the added concurrent-read regression and strict isolated-test key selection.

Golden replay compares all 61 frozen decisions and traces to fbad889, with zero differences. Twenty protected core/scorer/sandbox/permission files retain their fbad889 hashes. All twelve protected negative controls remain non-PASS. The real path probe covers 71 paths, including the actual initialized key and helper, with zero readable paths, no signature output, six sensitive endpoints denied, owned Git/SQLite/temp capabilities intact and certified cleanup.

This is tamper-evident authentication against a trusted key, not proof that an oracle was correct. The software key is portable and must be protected with its backups. An owner/root attacker replacing code/keys, stealing the software key, or rolling back the database and every retained anchor is outside this local boundary. No automatic acceptance or new scoring gate was introduced. The existing live coordinator/data were not restarted or migrated during this round; migration and sealing activate on the new version's next start.
