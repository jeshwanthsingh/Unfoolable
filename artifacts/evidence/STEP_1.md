# Setup audit (in progress)
- R1 retained proposal includes recorder scratch objects in argsJson; validator required strings. Strip only exact canonical recorder-owned tokens, refuse user paths/other objects. Recorder still chooses paths.
- A3 BASE lacks timeout constructor argument; retained test calls it before an assertion. Writer must assert requested new API exists before invoking it. Setup errors remain ERROR.
- Oversized --since BASE throws OverflowError before assertion; writer must explicitly assert requested successful behavior and report exception as native assertion failure, not silently reclassify ERROR.
- T3 unexpected promise rejection is native Vitest expectation failure rendered as Error; strict classifier needs structured native assertion evidence, not broad prose matching. Fixed narrowly for native Vitest promise-expectation frames; arbitrary error prose remains ERROR.
- Career-ops approved playbook exports only liveness-core.mjs. Generic unittest/Vitest preflight is wrong for that playbook. Writer must not claim tracker-merge coverage from liveness checks. Not fixed yet.
- Aegis test_broker_smoke.BrokerSmokeIntegrationTests.test_broker_examples runs broker_allowed.py and broker_denied.py with a live GitHub token. A fake token cannot exercise live broker behavior; retain explicitly EXCLUDED, never PASS.
Fresh holdout not selected or measured.

Focused validation: 20/20 tests passed, 0 skipped; strict typecheck passed. Native runner and path-argument tests preserve missing/zero/skipped/error rejection.
Career-ops integration will use its existing approved playbook check path rather than pretend it has unittest/Vitest. Its tracker-merge ticket is outside the liveness-only whitelist and cannot honestly receive complete writer coverage without a separately approved broader safe playbook.
