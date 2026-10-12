# Step 2 — Coordinator dependency preparation

Builder network remains disabled; npm/pip real download attempts failed under the native permission profile (including when offline environment defaults are removed). Offline npm/pip/uv defaults also guide well-behaved commands.

Preparation is a separate coordinator operation before every Builder start. It accepts unchanged BASE npm v2/v3 integrity-pinned registry lockfiles, or exact-version SHA256-pinned Python binary wheels. No lifecycle scripts, source distributions, local/git URLs or repo npm configuration execute in the installer. Unknown formats and changed dependency inputs fail to Needs You. Installer PID/start time and cleanup use the existing protected-process supervisor.

The moved clone exposed an internal checker allowed-root mismatch. A narrowly bound ticket-only entry now requires the current durable frozen Candidate, BASE, request, registered Project and canonical app-owned clone. Public allowed roots were not broadened. Isolated regression proves public rejection, mismatch rejection and the valid protected native test run.

Real ticket f5fe8c34 initially built but encountered that harness error; a fresh user passkey Retry reached ready_for_review / PASSED WITH GAPS. Keep/Discard untouched. Protected regressions pass; new intent remains an advisory gap. See step-2-normal-ticket.json.

Focused final tests: 9/9. Earlier full suite before final checker/preparation refinements: 798/798; final full-suite rerun still required in Step 4. All 12 unchanged negative controls non-PASS. No dependencies added.

Follow-up review: only coordinator-certified dependency directories are excluded from Candidate capture. A private record outside the Builder controls these exclusions; tracked dependency directories are rejected. Focused snapshot/dependency tests pass.
