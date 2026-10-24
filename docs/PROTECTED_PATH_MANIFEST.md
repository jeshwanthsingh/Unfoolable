# Protected-path inventory

SCION-1b freezes the inventory as `scripts/probe-manifests/protected-paths-v1.json`.
The report records its version, SHA-256 and exact target count. The server refuses a
report whose binding or count differs. The UI shows the recorded version; older
unversioned runs stay labelled unversioned.

## Why 74 became 76, then 71

- RULES-1's real probe recorded 74 paths.
- CORE-2b added the archived verdict core and core registry metadata: 76.
- SCION-1's generic runner omitted six release-specific checks: those two, the
  locked bug reproduction, mid-session repository, friendly backup directory and
  backup canary. Its dynamic repository scan also found the new playground: 71.
  This was a probe inventory regression, not an intentional reduction in protection.
- Version 1 restores all six. The union of the historical and current lists is 77;
  an explicit Projects-parent target brings it to **78**. Eight existing protected
  HTTP endpoint attempts and two signing-helper attempts are also retained, counted
  separately from filesystem paths. Sandbox rules were not changed.

The late repository is created only after the real Builder session starts. The
probe checks git status/diff/log, SQLite temp files and worktree writes still work.
It emits no secret contents. A readable target, reachable protected endpoint or
usable signing helper fails the run.

## Changes require review

Directory discovery never changes the count. New versions must retain released
IDs, roots, paths, kinds and endpoints. CI pins the released inventory hash and
rejects target replacement, removal and silent version reuse. An intentional
reduction requires explicit owner approval, a documented migration and a reviewed
update to that pinned test baseline. There is no runtime bypass or self-approval.
