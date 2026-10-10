# Touch ID / process ownership — PARTIAL, owner interaction required

Branch codex/touch-id from 5de20ea. Step 1 WIP 264c7ba; Step 2 WIP follows this report. No push, merge, deployment, paid API or model/runtime change.

## Process ownership

The true failure was an unreaped macOS zombie: kill(pid,0) succeeds, but both libproc identity APIs return ESRCH. Longer retries could not certify it. A bounded KERN_PROC_PID query now certifies its exact PID, microsecond birth and SZOMB state. Certified dead children leave the live inventory; they are never signalled. Unknown live identities still fail closed. A prolonged-zombie chat Start reproduced the original failure before the patch.

Three independent 50-session chat-server stress rounds passed 50/50 each: 150 starts, 75 immediate exact-card retries, 75 fixture tickets ready_for_review, kernel births persisted before agent_started. These use actual supervised processes and the real HTTP/event/cleanup path with a disposable provider, not 150 Codex model calls. See PROCESS_OWNERSHIP.md, kernel-root-cause.json and stress-summary.json.

The real career-ops ticket cfaaea5b remains at its prior harness_error, attemptCount2, no Candidate. Its requested fresh Retry is blocked on real owner passkey enrollment/confirmation. Do not call it ready_for_review.

## Human confirmation

One owner platform passkey is sealed in SQLite. Private key/biometrics stay with the OS. Initial LIVE enrollment additionally requires macOS biometrics, matched fingerprint and single-flight serialization; no password/software fallback. Decisions require signed user verification, exact item/action/body/current evidence, two-minute expiry and one use. Evidence is checked again at persistence. Automatic queue work loses the human authority. CLI opens an exact-operation link and waits; it never posts the decision.

Keep, Discard, playbook approval/edit, permission Allow/Deny, Retry and Recheck are covered, plus draft Start/Edit/Cancel and existing Spec/manual verification decisions. New live approval is available only after owner enrollment and still requires a verified scoped receipt. Existing approved books are unchanged. Test authenticator injection is allowed only in isolated TEST data; focused HTTP tests enforce the production gate. Ordinary legacy unit fixtures remain confined to TEST stores. Standard WebAuthn does not attest Touch ID specifically; the extra native bootstrap protects initial enrollment. A malicious same-user process able to rewrite CC source/SQLite is outside this boundary.

The real native enrollment ceremony is PENDING, not verified. Phone access is not built. The same protocol can later use a stable private HTTPS hostname; the current localhost credential requires re-enrollment when RP changes. See docs/PASSKEYS.md.

## Verification

Fresh full suite 791/791, zero failed/skipped, 255.752 seconds. Focused passkey21/21. Typecheck/build passed. All12 negative controls non-PASS. Compiled native-helper path verified from another cwd; native callback argument delivery tested harmlessly. Desktop/390px enrollment UI reviewed, no mobile horizontal overflow. No real key, biometric approval or decision was simulated.

## User steps

1. From this repository run ./cc chat (http://localhost:3225/?view=chat).
2. Click Register platform passkey; complete the browser's platform prompt.
3. Approve the separate macOS biometric enrollment only when its 12-character code matches the page. Wait for Passkey registered.
4. For career-ops use its exact Retry card, or ./cc ticket retry cfaaea5b-737e-4e5c-b489-cf16e14d44b8. This requires a separate fresh browser passkey confirmation. Keep/Discard remain the user's decision.

Artifacts remain in artifacts/touch-id; temporary logs/stores are under ignored .work/touch-id.
