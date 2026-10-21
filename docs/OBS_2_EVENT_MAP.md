# OBS-2: live room sources

The main app uses its unchanged authenticated desk SSE stream. A changed selected ticket sequence permits a detail GET; the room never polls. The first asynchronous history load snaps to the current saved state. Only subsequent unseen event sequences enter the live queue.

| Recorded source | Display |
|---|---|
| submitted / workspace_prepared | Intake / Sandbox visit. Preparation does not mean the Builder started. |
| agent_started, state_changed building/fixing | Recorded Builder session / bench. |
| tool.started commandExecution explicit read actions | Bookcase; safe basename, or exact distinct-path burst count. No file count is inferred from a shell string. |
| tool.started fileChange | Finite typing pose. |
| tool.started commandExecution otherwise | Terminal movement; no command/output displayed. |
| tool.completed, agent_stopped | Settles the tool/worker; no correctness claim. |
| candidate_frozen | Real package appears for inspection. A new build/fix clears the previous package until another freeze. |
| verification_started / state_changed checking | Glass lab. Builder remains outside its boundary. |
| check_progress | Existing named check / actual pass-total counts only. Tube indicators summarize counts; they do not invent per-test identities. |
| test_writer_launch_pending | Preparing the Test Writer; no invented writing progress. |
| check_result | Tick / magnifier / failure stamp from the exact saved result. Never acceptance. |
| verdict_sealed | Wax mark only if bound to the same protected check event. Current seal verification remains in live Proof. |
| ready_for_review / needs_you | Package/attention at your desk. |
| decision kept/discarded | Recorded human choice only, not a fresh check. |
| TRIPWIRE / tripwire | Immediate freeze and red barrier; bypasses queued older work. |
| STOP_ALL | Immediate dim and settle; no motion behind offline/hidden veil. |
| retry_requested | New attempt visitation/fuel scope. Never authorization inferred from replay. |
| unknown / prose / rejected transitions / process inventory | No invented motion. |

XState receives only derived facts from the selected recorded event prefix. Dots mean a stage was recorded, not that its work was successful. Queue beats last at least 350 ms; adjacent explicit reads merge with retained source sequence IDs.

Replay freezes a copy of the selected real event log. The scrubber selects an exact count of ordered unique events, including non-animated events. Seeking backwards recomputes state/fuel/journey from that prefix, never from current ticket totals. Playback compresses timing and pauses hidden/offline/collapsed. The live Proof and decision eligibility never receive replay facts.

## Other sources

- Protected paths: latest completed real probe metadata in observatory-probe.ts, paired with artifacts/obs2/protected-probe.json and its capture time. This is a dated system check, not a count of secrets or per-task protection proof. Old Workshop's 71 constant is not used.
- No internet / locked Grader: actual unchanged permission profile and separate-process architecture, plus dated denial probe; not continuous monitoring.
- Fuel: recorded Builder-only usage_observed and budget limits/extensions at the selected prefix. Missing/invalid counters stay unknown. Test Writer tokens never inflate Builder fuel.
- Lighting/clock: current local time, recorded local event time in replay; decorative, never progress. Idle blink is decorative and finite. No ambient animation runs hidden, offline, collapsed or reduced-motion.
- No data: individual test identities/counts, absent Test Writer progress and unknown worker activity remain absent/unknown. No new backend or display events were introduced. The 12 negative controls are global self-tests, never task achievements.
