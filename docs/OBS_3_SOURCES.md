# Observatory finish: display sources

- Alarm sheet: new `needs_you/TRIPWIRE`, `agent_event/tripwire`, or `cancellation_requested|needs_you/STOP_ALL` in the existing ticket event log. Shows a fixed safe description, stored time and task title. No raw tool output, external path or token is displayed. Close only closes the sheet; See the proof opens the unchanged actions. Never retries, accepts or clears an alarm.
- Morning briefing: the last stored `NightView.report` items and exact `ticketIds`, not AI copy. VERIFIED means checked; all other saved results require a closer look. Missing/empty reports say so. Links only resolve saved IDs present in the current list.
- Sounds: one session-local toggle, off on every initial load. Fresh Builder start, ready-for-review, bound seal, and tripwire/STOP events only. Existing history and duplicate snapshots are consumed silently. Hidden/offline and running/active-window Night Shift are muted. No routine tool sound; no samples or network. Classic and Observatory share this one source.
- Seal emboss: only a newly observed seal bound to the latest protected check and its recorded attestation hash. 180ms press and 240ms CSS shimmer, once while the pass is already open. Opening old Proof or replaying history never creates a new live seal moment. Reduced motion is instant. Seal verification label still comes from the unchanged protected result.
- Recording: explicit local user action only. Copies the existing Pixi canvas, recorded task title and plain event line into a 1920×1080 or 1080×1920 canvas. Vertical framing follows the actual selected station. Replay is labelled; timing compressed; final brand end card is not a new check or decision. 24-second WebM with 30fps requested. Recording aborts hidden/offline/collapsed/unmounted; tracks and timers are cleaned. Browser support errors are plain. No capture of raw logs, diff, secrets or confirmation UI. Reduced-motion recording is disabled rather than inventing movement.

The existing single SSE stream remains authoritative. State transitions may fetch the existing task detail, as does the room/Proof; routine updates do not start polling. Historical hydration is muted by the first snapshot's per-task sequence watermark. The 30-second honesty test permits a decorative finite idle blink, but no work movement, work counter change or queued work.

## Dependency maintenance

Vite 8.3.2 → **8.3.5**, MIT. Official registry pins; six baseline advisories recorded in `artifacts/obs3/osv-before.json` / `npm-audit-before.json`. Updated exact lockfile rechecked with OSV-Scanner 2.7.0 and npm audit. No runtime safety profile changed.

`@axe-core/playwright` **4.14.0**, MPL-2.0, dev-only; transitive axe-core 4.14.0 (MPL-2.0), playwright-core Apache-2.0 (exact version in lockfile). Install used `--ignore-scripts`. Automated axe is not manual VoiceOver verification. See VOICEOVER_CHECKLIST.md.

Sources: https://github.com/vitejs/vite/security/advisories and https://www.npmjs.com/package/@axe-core/playwright . Reused React, Motion, Radix, Vaul, Pixi and original room assets retain the recorded versions/licenses in DESIGN_TOOLS.md. No new art, font, AI or audio asset.
