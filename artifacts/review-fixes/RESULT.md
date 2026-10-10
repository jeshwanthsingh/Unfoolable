# Review fixes

Branch codex/review-fixes from52bb647. Two local step WIP commits; no push, merge or deployment.

## Why Keep was blocked

The protected checker changed in the playbooks update, so CC correctly treated the older evidence as stale even though the Candidate stayed the same. The stored evaluator hash800a2f… differed from the pre-round evaluator4f33eb…; STALE_REASON.json contains the exact comparison.

## Same-Candidate recheck

./cc ticket recheck ID and the stale-review Recheck button explicitly queue check-only work. The shared durable single-ticket queue runs it without a Builder, worktree creation or correction loop. The same Candidate commit/tree and BASE are checked before/after; attempts and intent are unchanged. New evidence is appended while old evidence stays inspectable. Stale/cancelled/nonpassing evidence blocks Keep. Fresh passing evidence returns ready_for_review. Failed checks become needs_you; infrastructure problems become harness_error/interrupted and never auto-build. Restart interrupts unfinished checks and waits for explicit retry/recheck. Legacy reviews retain the original native-check scope; modern playbook reviews require current approval. Keep revalidates evidence before the branch effect.

Real ticket c6263195-76c4-4732-ae06-f28ef6c30767 is ready_for_review, PASSED WITH GAPS, Keep available. Candidate remains924fea07e68959d5e150d5f6aa8b72a7453f46c7, BASE/intent/attempt1 unchanged, zero Builder launches or human decisions added. New verification differs from the original b7bf19ea… record. Two rechecks ran while finalizing evaluator changes; neither rebuilt. The second followed final safety hardening so the evidence remains current. RECHECK_PROOF.json and before/after events bind this result. No Keep was performed.

## Career-ops review, in plain words

(a) --quick skips only compiling the Go dashboard (go build to /tmp/career-dashboard-test). Syntax, script execution, liveness, data/paths, documentation and version checks still run.

(b) The old suite is not just a test: CV sync reads cv.md and config/profile.yml; pipeline validation reads application trackers, additions and reports; normalize/dedup can rewrite the tracker and backups; merge can write it and move additions into merged; update check attempts GitHub network access. Gitignored/untracked local files do not enter git archive. Tracked personal files would enter a full archive. At the frozen career BASE, the familiar CV/profile/application paths are not tracked; only empty .gitkeep markers are tracked under reports/additions. This review inspected code and filenames, not personal file contents. Old Git-dependent checks can misleadingly pass when there is no .git, and --quick's plain-text skip is not a named native outcome.

(c) Exit0 alone is insufficient. The new protected command reports structured JSON with exactly five unique expected check IDs, explicit PASS/FAIL outcomes, and testsRun=5. Missing, zero, duplicate, mismatched or skipped records cannot pass. The observer must exit successfully and cleanup must be certified. This detects omitted work; it is not a promise against arbitrary deliberate in-process reporter forgery.

## Safer proposal, still unapproved

Only liveness-core.mjs is exported. One protected Node command checks its syntax and four synthetic page examples: closed-page Apply text, active Workday job, expired URL, listing-only page. No tracker, applications, CV/profile, operational scripts or Git checks are copied/run; no network requests are made by the proposed checks. Whole-tree symlink/submodule/path/size guards still apply before selecting files, so selection does not weaken original rejection rules. Synthetic tests prove tracked personal fixtures stay excluded and unselected malicious entries remain rejected.

The approval card begins with one plain-English paragraph, shows the five-check requirement and retains exact code/identity in expandable details. It explicitly does not check tracker merging, dashboard compilation or personal-data correctness. Its hashff4de1504a7a32112a28bf55f6f6dbe5b6dff37f98c0caffc8f67f811b25ef4f remains unapproved. Waiting ticket cfaaea5b-737e-4e5c-b489-cf16e14d44b8 is needs_you, attempt0; no real BASE admission or Builder starts occurred for it. Approval is for the user.

## Verification

Fresh full suite703/703 passed, zero failures/skips/cancellations,166.311 seconds. Typecheck and production build exit0. All12 unchanged negative controls non-PASS with zero malicious PASS; final control core identity unchanged during replay. Targeted checks cover stale/fresh/cancelled Keep, same-Candidate immutability, no build/fix, restart recovery, duplicate recheck, count-zero/missing/mismatch, known-wrong classifier, tracked-personal-data exclusion, and whole-tree symlink/submodule/oversized rejection despite selection. Browser verified stale Recheck/disabled Keep, fresh enabled Keep, the visible paragraph/count requirement, and no horizontal overflow at390px; no Keep or approval clicked.

Initial full run698/700: one timing fixture did not settle within its existing deadline; one old assertion correctly caught loss of the actionable word Approve. Message restored without weakening the assertion; fresh suites passed. Later review found selection originally skipped guards for unselected files; that was corrected and explicit regression tests added before final recheck. Basic credential scan has zero findings. No new dependencies, AI roles/model/runtime, paid APIs, or registered-repository changes.

Remaining limits: research-router's new intent remains an advisory gap; successful regression checks are not independent proof of the requested behaviour. Career's safe proposal is limited to liveness and has not been approved/admitted on the real BASE. Missing reports/dependencies or environment/cleanup errors fail closed.
