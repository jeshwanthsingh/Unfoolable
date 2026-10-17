# Step 3 — approved playbook and grouped review

Each ticket proposes free language-appropriate quality gates into the existing playbook. A new tool/rule policy has a new playbook hash, no approval, and Needs You before Builder. Existing passkey approval remains the only live approval path. The same approved policy is reused; changing tools/rules invalidates evidence and requires reapproval/recheck. Historical approved definitions are not rewritten.

Results are bound into existing immutable playbook evidence. New quality findings fail checks; BASE setup failures are not applicable, Candidate setup failures are harness errors. Export whitelists, restored BASE tests, native evidence and Keep confirmation are preserved. AST test-change flags are red review flags, not substitutes for protected tests.

Both review surfaces group Locked checks / Quality gates / Test-tampering / Independent test warning / Mutation & coverage. Existing independent red warning still precedes Keep. Native test details remain available.

Verification so far: focused approval/chat/quality/warning suite 42/42; earlier focused native/playbook/tampering suite 48/48; strict typecheck and build passed. Full final verification and real card evidence follow in Step 4.
