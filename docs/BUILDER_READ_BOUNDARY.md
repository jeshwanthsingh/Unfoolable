# Builder read boundary

Shell tools cannot read the named SSH, Codex/auth, config, AWS, GnuPG, user Keychain and browser private roots. Existing root aliases receive canonical-target denials; missing roots receive explicit rules. A workspace/private-root overlap is rejected. Host-side subscription authentication remains outside the tool sandbox; no credentials are copied by CC.

The owned worktree remains writable. Its cloned Git common metadata is read-only; only its private index/index.lock are writable. Network stays off and read permission escalations remain unsupported. The whole ~/Projects root is denied, including repositories created mid-session. New ticket clones/worktrees and their temporary files live under ~/.cc-work, outside the denied ancestor. Existing workspaces are not moved. The public verifier retains its configured allowed roots. An internal ticket-only verifier entry accepts the exact canonical clone, BASE, Candidate and request already bound in CC's frozen-Candidate event; it does not widen public repository registration. Owned cloned Git metadata remains read-only except for the private worktree index. This closes the measured Projects gap; it is not a home-wide allowlist. Host-side provider authentication remains outside the tool sandbox.

Live evidence is in artifacts/read-guard/before-after-table.md. Six paths were absent and return ENOENT; named rules remain installed and native synthetic fixtures prove those rules deny later-created private directories. The permanent local integration test uses isolated CC-data fixtures, scans current real private roots/projects, tests aliases and owned Git/SQLite, and never emits contents. It needs the already-installed pinned Codex and local model catalog, not a live CC deployment. It makes no model calls.


# Package preparation and alarms

Builder network remains off. npm, pip and uv also receive offline defaults. Only the coordinator prepares unchanged BASE lockfile inputs, with npm scripts disabled and Python hash-pinned binary wheels. Installed libraries are excluded using a protected coordinator record; an agent cannot supply that exclusion list. Unsupported formats, missing prerequisites or setup failures go to Needs You. BASE admission still precedes a build; missing source test dependencies can require a reviewed project setup before admission.

Decoys live under ~/.cc-work/tripwires/<attempt-id>, outside the worktree, with deny-read protection. Their token is synthetic and grants nothing. A macOS denial-log sensor checks itself before and after a real Builder run. An observed attempt stops the owned worker and records a TRIPWIRE marker in Needs You with the path/time; it never signals the PID merely reported by a log event. The existing passkey gate protects Retry/Discard.

**Alarm limitation, explicitly accepted by Jesh:** this is best-effort detection, not guaranteed observation of every open. macOS log events can be delayed or absent. Read denial is the security boundary. A failed self-test or stopped/unavailable logger blocks a build or Candidate capture as a harness error. This remains a named-path policy, not a home-wide allowlist.
