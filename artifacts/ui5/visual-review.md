# UI-5 review record

Scope: main..codex/alive; live list, stage track, result hallmark and Watch it work. Existing Hallmark styling, protected checker rules and human confirmation endpoints remain authoritative.

Skills applied: Emil animate/design-eng, review-animations, animation-performance; Jakub better-ui/interface-review with better-interface; Vercel web-design-guidelines. Variant considered density in the existing Style 1/2/3, without introducing a new visual direction. Break scenarios: no progress, long relative filename, no files yet, desktop/390px, reduced motion, recorded result. Original source pins/licenses and installed inventory are in docs/DESIGN_TOOLS.md.

## Three screenshot and recording passes

| Pass | Before | After | Why |
|---|---|---|---|
| 1 | Repeated identical read/search lines and AM/PM wrapping | Consecutive identical lines collapse; 24-hour locale-formatted timestamps stay on one line | Less noise, phone rows remain legible |
| 2 | Files fell below a long timeline on phones | Files precede the timeline at small widths; full record remains in Proof | The changed file is visible without searching |
| 3 | A scan label could precede the specific scanner | Read-only callback announces the scanner at its actual invocation | Activity must describe a real operation |

Official Playwright MCP captures/recordings: pass-1, pass-2, pass-3, each at 1440 and 390. These replay the same 18 stored events from real ticket e4f4596f, rebased/compressed delivery time for review; the fixture refuses all decision writes. They are not new live-task evidence.

## Motion audit

| Before | After | Why |
|---|---|---|
| Generic mount animation could imply new work | Initial snapshot is stationary; only fresh increasing event identities can start row movement | No fake activity from load, search or history |
| Counter interpolation could trigger per render | Actual native count plus increasing event identity required | No estimated test progress |
| Cached Proof could hide a new result identity | Use the maximum stored check-result sequence | One fresh result strike still arrives |
| Working arc could turn on process-inventory updates | Use meaningful activity sequence while working | Process housekeeping is not progress |

All new movements use full transform strings/opacity with Motion springs, 180/220/240 ms, bounce 0. Hidden-page cleanup stops controls; reduced motion skips them. No new ambient animation, animation interval or React state-per-frame loop. Number interpolation writes to a span; accessible text exposes the final observed count. Sound remains opt-in and off by default.

## Measured performance

Final pass: phone 947 sampled frame intervals, maximum 16.8 ms, zero over 34 ms; desktop 935 intervals, maximum 33.3 ms, zero over 34 ms. First desktop pass had one 450 ms interval during capture; this was not hidden. Screenshot/profiling tools perturb timings. This is local Chrome evidence, not proof of 60fps on every phone/GPU. Real mid-range phone profiling remains unverified.

Each pass found zero app requests and zero app-requested animation frames during the isolated idle measurement; zero active animations after settling. Native reduced-motion check found zero running animations. Opening Watch uses the existing detail cache; it adds no stream or polling loop.

## Interface audit coverage

Accessibility: semantic buttons, native modal focus/escape, restored focus/scroll, visible inherited focus rings, real-step live status, stage text beyond color. Layout: desktop and phone screenshots inspected; no horizontal overflow in assertions. Writing: no invented completion, counts, worker activity or test success. Typography/color: existing Instrument Sans and semantic pewter tokens retained. Exact contrast tokens unchanged. Motion: recordings and frame-sequence contact review, finite-event checks as above. No safety changes or new approval control in Watch.

Verdict: no remaining high-severity finding in the reviewed surfaces. Physical-device smoothness and subjective sound quality not verified. Existing legacy/Labs surfaces are outside this change review.

## Final code-review corrections

The first full suite passed 987/987 before these two additional narrow regressions: the real coordinator served 404 for the existing Instrument Sans font (the fixture did not), and progress initially counted every reported test rather than only passing BASE identities. The exact font route is now allowlisted with the existing realpath containment check. Display counts now use passing BASE identities per command, excluding added/skipped/known-failing tests. Both reproductions failed before the fix; focused regressions pass afterwards. Neither change alters assertion admission, verdicts, sandbox policy, or passkey authorization. A new full suite is required and recorded separately.

Final MCP confirmation after the review fixes: desktop/phone `final/` captures passed exact scroll and focus restoration. Actual coordinator GET /fonts/InstrumentSans.ttf returned 200, font/ttf, 194336 bytes. Final native controls again produced 5 FAIL + 7 INCONCLUSIVE, zero PASS. One launch-pipe EPIPE before any result was retained as an environment interruption, followed by a clean explicit-Node-24 retry; no assertion or control was edited.

One final regression reproduced `checked` instead of `wrong` when an old cached passing detail met a newer failed stream result. `currentResultDetail` now excludes that cache from the mark and list actions until fresh details arrive. The server authorization path is unchanged. This is a truthful-display fix, not a new decision rule. Focused tests pass; the full suite is rerun on this source.

First-count regression: the native report previously mounted its numeric component at 172, bypassing interpolation. Official MCP replay failed before the fix (only 172 observed), then passed with intermediate finite values after keeping the unknown counter mounted but visually/accessibly hidden. Reduced-motion MCP showed only the final count, instantly. Reserved space avoids a layout jump. This uses a real recorded native report; it is not a new live task. Screenshot: counter-after/1440/reported-count.png.

Full suite on f7072cb: 990/990, zero skipped, 330.554 seconds; source unchanged throughout. Final suite will follow the counter-only correction.
