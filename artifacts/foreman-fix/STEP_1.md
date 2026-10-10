# Step1 — reproduced root cause

The HTTP chat Start regression fails before the fix with the same `Kernel process ownership could not be recorded` result. Its child exits immediately and is reaped700ms later; the production supervisor records real kernel identities. Evidence: `.work/foreman-fix/chat-startup-red.txt`.

Ten real Darwin probes of an exited, unreaped child all returned: libproc BSD info0 bytes, proc_pidpath0/ESRCH, getsidESRCH, but kill(pid,0) succeeded. No PID/birth was fabricated. See `zombie-probe.json`.

## Launch comparison

| Surface | CLI | Chat |
|---|---|---|
| Entry | POST /api/tickets | Draft Start -> same tickets.create |
| Parent | local Node coordinator | same local Node coordinator |
| Execution | durable FIFO -> ticketLoop -> createCodexTicketDriver | identical |
| Worker group | detached PID=PGID=SID | identical |
| Environment | prepareBuilderRuntime's scrubbed launcher env and workspace tool env | identical function; chat request adds done criteria only |
| Sandbox | Builder's named profile; kernel recorder executes in coordinator | same; drafting profile is separate and does not wrap Builder |
| Version/model | pinned existing Codex | unchanged |
| Timing | monitor catches a changing process inventory every200ms | same; exited-child race occurred on these attempts |

Historical records show the successful CLI worker parent4431 and failed chat worker parent8749, both Node24.21.0 coordinators; these are different server lifetimes, not different authority. Workspace layout and Builder filesystem profile were tightened in the intervening Playbooks round. Those changes apply to both current entry points; they do not grant/deny kernel identity calls made by the coordinator. No earlier environment dump was retained, so historical full environment equality is not asserted.

The kernel recorder retried only3×15ms. The synthetic chat case proves the causal defect independently of a model, profile or credentials: an exited-but-unreaped PID stays present longer than45ms and makes the whole snapshot fail. Both entry points can hit it; a direct protocol-only probe does not exercise the production ownership gate.

Fix contract: briefly retry complete kernel recording with an overall deadline below the existing3s helper limit; accept only real PID+start time+group/session+executable records, or ESRCH proof of absence. Persistent live/permission uncertainty still stops work. Never signal an unidentified PID.
