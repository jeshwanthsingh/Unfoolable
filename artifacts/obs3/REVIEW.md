# OBS-3 review and corrections

## Real-size visual review

Official Playwright MCP captures cover real main data at 1440/390 light/dark. Isolated, visibly labelled fixture captures exercise tripwire, STOP, completed shift and fresh seal. The calm sheet uses existing Proof only; Escape closes. Morning links use exact saved IDs. The seal settles after its finite press/shimmer. No real alarm or signed record was created.

Axe 4.14.0 reports zero violations on all 16 combinations (main, room, settings, pass × 1440/390 × light/dark), with no disabled rules. Manual VoiceOver and physical iPhone checks remain for the user; the ten-step checklist is separate.

## Problems found and fixed

- The first seal test opened a different grouped task than the one receiving the fixture event. Corrected the test to use its exact stored task ID, rather than weakening the binding.
- The first idle test shared a preview while another test injected an event. It correctly detected a sequence change and request. Repeated it serially on an actually idle stream, then retained a standalone read-only 30-second test.
- Actual decoded recording frames exposed a WebGL buffer issue: source room had 0 visible pixels despite the on-screen room being correct. Added a delayed real canvas-copy regression, enabled Pixi's documented preserveDrawingBuffer option, and added a fail-closed recording preflight. Regenerated both clips and inspected decoded room/end-card frames. No custom video parser.
- Background stop events could be missed until their task was opened. Read existing detail on a real status transition/new stop revision, with the initial snapshot watermark preventing old history from making sounds. No polling.
- One sound source replaces duplicate legacy Hallmark playback; Night Shift, hidden and offline playback are suppressed.

## Limits

Chrome/Mac is the verified capture target. Browser WebM exports can lack seek-duration metadata; accompanying MP4s are encoded from those actual exports with existing FFmpeg 8.0, without changing speed or event content. The optional sounds were checked structurally and with isolated browser observation; no physical speaker/listening or VoiceOver result is claimed. Missing stored report links or event detail are not invented. Four historical golden events still lack original facts, as in the baseline.

Final binding review: a new browser regression reproduced recording continuing after live Proof took over. Replay now pins its task ID; opening live Proof or changing the task aborts export instead of mixing states. The exact regression passed. The briefing waits for the first real chat snapshot before asserting an empty report.
