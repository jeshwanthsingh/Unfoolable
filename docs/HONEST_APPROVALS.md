# Honest approvals

Playbooks are keyed by repository identity (sorted Git root commits plus the exact origin URL), and approval binds the exact playbook hash. A missing origin is an explicit NO_REMOTE value, as approved for local-only repositories. Remote URLs are hashed, never persisted in this identity. Clean clones must have the same origin identity. Changing history roots, origin, or playbook content cannot borrow another approval.

Legacy path-only approvals need a fresh passkey confirmation before reuse. Approved recipe evidence remains immutable; recipes are reused only across matching repo identities and retain their BASE-applicability rule.

Review colors:
- GREEN: VERIFIED, every gate passes, no gaps or flags, and a small textual diff.
- AMBER: gaps or incomplete evidence.
- RED: tests, playbook, CI or lockfiles changed; independent-test warning; tampering; a new gate finding; failed checks; unmeasurable binary changes; or the diff cap exceeded.

The default cap is 400 added/deleted lines or 15 files. A playbook can override it with `diffCap: {lines, files}`; this changes its hash and requires passkey approval again.

Keep requires opening every changed file for ALL risk colors, including GREEN. Protected, timestamped view records bind the exact Candidate, checks, playbook and risk policy; rechecking invalidates earlier views. Opening is evidence of access, not proof of reading or understanding. The server enforces the rule even if a client bypasses disabled buttons. Discard does not require opening changes. After the view requirement is met, Keep retains its exact-item passkey confirmation. Every decision still requires a fresh exact-item passkey confirmation.


CORE-2b records this safer rule in its own optional commit. It changes review eligibility only; verdicts, risk colors, sealing and passkey checks are unchanged. Opening some files is insufficient, a stale view cannot count, and a fresh check invalidates previous views.
