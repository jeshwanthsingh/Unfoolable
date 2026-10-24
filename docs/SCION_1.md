# SCION-1 notes

Project rules use the already pinned Opengrep CLI with local inline rules, metrics off and network denied. A rule with any BASE finding is disclosed as pre-existing and does not score the Candidate. A BASE-clean rule can fail only for a finding on a changed line. Invalid rules, parse errors, missing reports and uncertain cleanup are errors, never clean passes. Rule definitions are part of the existing Touch ID-approved playbook hash. No current approval is edited automatically.

Weekly maintenance is coordinated in the existing server. It runs only on AC while the ticket queue and legacy execution paths are idle, at most once per seven days after a completed attempt. New writes pause maintenance before acting; STOP ALL disables it for this coordinator lifetime. Restart records incomplete maintenance as interrupted after certified owned-process cleanup. An append-only self_check_events table records actual starts, child ownership, steps and terminal outcomes. No ticket verdict is edited. The existing single SSE stream carries the status and newest successful probe date/count. Missing backup configuration or a configuration for another data directory fails honestly; restore is always into a new isolated output directory. Tests never automatically run live maintenance.

Review fixes: multiline scanner matches use their entire source range; uncertain process cleanup blocks new dispatch and survives restart; HTTP writes hold a maintenance reservation through their handler, including legacy writes without an operator header; direct Night Shift builds and rechecks await that same cleanup; active chat, reviewers, debug agents and unresolved ownership prohibit maintenance. A skipped checkpoint cannot certify an older archive. Missing recorded probes show unknown, not a build-time count.

The browser check reproduced the user's earlier blank-screen friction: generated dotted bundle names such as xstate.esm were not served. The asset matcher now permits dots within the single filename, while retaining suffix, traversal and realpath restrictions. This is a display-routing fix only.

A project rule targeting changed code outside an approved export is an error, not a clean scan. The checker does not silently expand that export or read additional project files. The owner must review any scope change through the existing approval flow.

Ownership sampling during a backup uses a protected atomic side journal. The root PID/birth and journal reference are committed before the command is released; child samples stay durable without modifying the SQLite source mid-checkpoint. The final sample is appended after the command ends. Restart reconciles the journal; restored backups can fall back to the saved root identity if the old Mac's local journal is absent. Reconciliation still never signals an unidentified process.

## Using approved project rules

Add optional fields to the existing full playbook definition, for example:

```json
{
  "riskRules": [{"path":"auth/**","kind":"logic","raiseTo":"RED","message":"Authentication logic changed; review it carefully."}],
  "projectRules": [{"id":"no-db-in-ui","path":"ui/**","language":"python","pattern":"import db","message":"The user interface must not import the database."}]
}
```

These are fields, not a replacement for the required test/setup definition. Path globs are case-sensitive. Use the existing `cc playbook edit <repo> --file definition.json` and approval flow; editing and approving require the owner's exact-item passkey confirmation. No existing live playbook was edited or approved in this round.

## SCION-1b restore budget

A restore-only measurement on the canonical checkout used its completed real
checkpoint from 2026-10-24 18:35 UTC: 541,214,047 compressed bytes, 214,391 files,
58 database tables, one passkey and 1,564 ticket events. Full extraction, every
file/link hash, table digests, chain head, SQLite integrity and foreign keys took
286.303 seconds (4m46s). It ran in a new ignored output directory, never over the
live database. This excludes creating/compressing a fresh snapshot.

Weekly maintenance still requires a **fresh completed snapshot**, then a full
restore and every-file verification. It now has **25 minutes for that step**,
including snapshot creation, rather than five. This is about five times the
measured restore-only duration, allowing compression and disk contention. It is
still idle/AC-only, interrupted by new work, battery power, STOP ALL or deadline;
an interrupted/incomplete run never becomes a pass. A skipped snapshot is not
replaced by an older one. The status explicitly identifies a completed full
restore, its date and duration; missing historical metadata is not called full.
