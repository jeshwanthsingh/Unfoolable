# Round A — measured evidence and lower cost

## Decision

**ADVISORY. Not promoted.** Old eligibility 2/11 (18.2%), fresh 0/6. False confirmations 0/8 old and 0/6 fresh, but this includes abstentions/errors, not proof that the writer detected every defect. All actual application results remain advisory.

Eligibility is a read-only study calculation using the existing scoreV1 with the writer advisory flag disabled. No persisted decision, Keep or production result was changed. The application was never promoted during measurement.

## Old 11 correct / 8 wrong

| Case | Study eligibility | Writer tokens | Main limit |
|---|---|---:|---|
| A2-correct (correct) | PASSED WITH GAPS | 23625 | Live broker integration excluded |
| R4-correct (correct) | PASSED WITH GAPS | 11839 | UNCLEAR: research_router/cli.py is explicitly omitted, and configuration/path-resolution BASE files are not supplied. The provided database helpers alone cannot exercise the requested command, establish its invocation AP |
| T5-correct (correct) | VERIFIED | 10338 | Admitted measured check |
| R1-correct (correct) | PASSED WITH GAPS | 14185 | Concurrency checks are advisory; changed-line coverage has not been measured. |
| T3-correct (correct) | VERIFIED | 18511 | Native writer not admitted: One mutation-feedback authoring retry already consumed |
| R3-correct (correct) | PASSED WITH GAPS | 12207 | Not admitted: BASE ERROR. Requires a real assertion failure; setup errors, skips and zero tests never count. |
| A3-correct (correct) | PASSED WITH GAPS | 12576 | writer's test disagrees with this change - worth a look |
| T2-correct (correct) | PASSED WITH GAPS | 21507 | Not admitted: BASE ERROR. Requires a real assertion failure; setup errors, skips and zero tests never count. |
| kept-c6263195 (correct) | PASSED WITH GAPS | 13785 | Measured changed production lines remain incomplete or unknown |
| kept-cfaaea5b (correct) | PASSED WITH GAPS | 0 | Approved playbook exports liveness-core.mjs only; requested tracker merge is outside that approved scope. No writer was launched. |
| kept-37b3646e (correct) | PASSED WITH GAPS | 12519 | UNCLEAR: research_router/cli.py is omitted, and no CLI entry point, parser API, configuration loader, or state initialization implementation is supplied. Those BASE files are necessary to invoke top-level research --help |
| A3-wrong-reference (wrong) | PASSED WITH GAPS | 19557 | writer's test disagrees with this change - worth a look |
| T2-wrong-reference (wrong) | PASSED WITH GAPS | 21547 | Not admitted: BASE ERROR. Requires a real assertion failure; setup errors, skips and zero tests never count. |
| A2-unchanged-base (wrong) | PASSED WITH GAPS | 7036 | writer's test disagrees with this change - worth a look |
| R4-unchanged-base (wrong) | PASSED WITH GAPS | 12844 | writer's test disagrees with this change - worth a look |
| T5-unchanged-base (wrong) | PASSED WITH GAPS | 11623 | UNCLEAR: The pack omits frontend/src/store/appointmentStore.ts and frontend/src/components/CancelAppointmentDialog.tsx, which define the cancellation API, request dependencies, and local state update behavior. The suppli |
| A2-planted-half-fix (wrong) | PASSED WITH GAPS | 11854 | writer's test disagrees with this change - worth a look |
| A2-planted-special-case (wrong) | PASSED WITH GAPS | 11759 | writer's test disagrees with this change - worth a look |
| A2-planted-edge-case (wrong) | PASSED WITH GAPS | 11858 | writer's test disagrees with this change - worth a look |

All eight wrong cases remained PASSED WITH GAPS; none was genuinely classified FAILED. Do not interpret zero confirmations as successful defect detection. Three correct labels are prior human Keeps rather than independent hidden grades.

## Six fresh cases

| Case | Historical bug | Correct | Half-fix | Writer |
|---|---|---|---|---|
| H1 | Resolve the picked booking date and time against Asia/Kolkata, regardless of the browser timezone. | ERROR | ERROR | Not started |
| H2 | Only offer booking slots when the entire session fits inside the published clinic time window. | ERROR | ERROR | Not started |
| H3 | Compare booked and past booking slots using clinic-time instants rather than the browser clock. | ERROR | ERROR | Not started |
| H4 | Build the inclusive available booking dates without UTC date-only parsing and use today on the clinic clock. | ERROR | ERROR | Not started |
| H5 | Build the therapist week grid on the clinic calendar, with Monday-first columns and clinic-day session grouping. | ERROR | ERROR | Not started |
| H6 | Show the booking connection error again after a failed therapist-profile retry instead of leaving a loading screen. | ERROR | ERROR | Not started |

All twelve stopped before authoring: the protected native BASE inventory does not recognize parameterized Unicode test names (for example `round-trips a 2000-code-unit Hindi message`) even though they are native tests from frozen BASE files. No tuning, replacement or rescue was made on the holdout. This is a checker compatibility failure, so this round does not establish fresh-task writer quality. Six historical correct references separately passed their original tests; all six half-fixes were non-PASS. Several historical BASE tests import newly extracted APIs and therefore ERROR, not assertion-red; that does not relax writer admission. Five cases share the clinic-calendar domain and are correlated.

## Cost

Old total: 259170 actual reported writer tokens, including repairs and the authorized survivor feedback retry. Mean per started case: **14398.3** across 18; mean over all 19 slots: 13640.5. Every old slot stayed below 40,000. Fresh: zero writer starts and zero writer tokens; per-start mean is unavailable, not a successful zero-cost writer result. The separate development proof used 3,575 tokens; Builder read-probe usage is not included in writer means. No dollar/API price estimates. Existing ChatGPT entitlement only; no new paid API billing.

Compared with v2 recorded 1,423,853 tokens across 17 starts (83,756.1/start), the observed per-start writer mean fell about 82.8%. The sets share 19 slots but differ in number of writer starts; this is not a controlled cost-only comparison.

The 40k limit stops on reported provider usage and shares remaining budget among repair/feedback attempts. Notifications can arrive after consumption; it is not a prepaid hard quota. Overshoot/unknown usage is retained and cannot be hidden as zero.

## Implemented

- Fixed the reproduced canonical concurrency scratch-argument rejection and native Vitest promise assertion classification; setup errors still never count as red.
- Native writer coverage uses coverage.py or real worker V8 data converted by c8, then production-only diff-cover. Full eligibility requires nonzero changed executable lines covered on both Candidate runs, with no missing changed source. Author complete flags do not decide it.
- Advisory mutmut/StrykerJS mutants execute in separate disposable exports. Up to 12 are sampled, explicitly labelled; errors and zero mutants produce unknown scores. One short survivor note is allowed.
- Fixed BASE context pack: up to six full relevant files, request, changed filenames and existing approved playbook command; no Candidate content, labels, truth packets or read tools. Missing context can exit UNCLEAR/IMPOSSIBLE.
- Card shows measured coverage, mutation counts/score and actual tokens. Career-ops uses its unchanged approved liveness-only playbook, so tracker merge remains unproved. Live broker integration stays explicitly excluded.

## Still blocked

Large CLI files omitted by the bounded context; BASE setup errors or writer disagreements; unmeasured concurrency line coverage; type-only/runtime-inaccessible changes; approved career scope narrower than the kept change; real broker credentials; and the fresh parameterized-test inventory bug. No holdout-driven patch was made.

Normal native writer tests and coverage still run with Candidate code: deliberate in-memory/channel/instrumentation forgery remains a residual risk. Existing tripwires and primary protected gates stay unchanged. Line coverage is execution evidence, not semantic proof. Review other limits in CODE_REVIEW.md.

## Verification

- Full suite outside outer sandbox: **864/864**, zero failed/skipped, 289.767 seconds. Earlier interim failure was a valid evaluator-staleness failure caused by a concurrent source edit; preserved, then rerun against frozen source.
- Strict typecheck and production build passed.
- All 12 negative controls non-PASS: 5 FAIL, 7 INCONCLUSIVE.
- Real 65-path Builder probe: no readable protected paths; owned Git status/diff/log, SQLite and writes all worked. Builder model/runtime/profile unchanged.
- Desktop/390px metrics inspected. Document width 390px, no overflow; no decision clicked. Own test browser/server cleaned; live app/data untouched.
- No hidden grader assertion/hash was changed or consumed; no source repositories modified, pushes, merges or deployments.
- Free measurement tools installed only under ignored .work/evidence/tools; app runtime dependencies unchanged.

## Evidence

Full protected data: `.work/evidence/scoring-data`, `.work/evidence/data/holdout`. Sanitized tables/summary and screenshots under `artifacts/evidence`. Trusted reproduction scripts are in `scripts/evidence`. Original observations and all corrections are retained. Historical observations are not current Keep authority.
