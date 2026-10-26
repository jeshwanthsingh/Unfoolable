# Pre-publication privacy review — 2026-10-25

Owner authorized one normal main merge/push after this scan. No force push, remote-history rewrite, tag push or private-backup-ref push is authorized.

## What was removed

The public probe report contained 84 per-target display labels, including 44 personal project-folder names. The label list was removed; counts, manifest identity, denial/absence outcomes in aggregate and owned-capability results remain unchanged. The complete private probe remains in ignored work files.

The original list was also removed from all four unpublished hardening commits, so redacting the tip does not leave it in newly published artifact history. Original WIP commits are retained only in a local private backup branch/ref; do not push those refs or use `git push --all` to publish them. Main's existing history and recovery stash 4378916 were not rewritten.

## Scope and findings

- Scanned the complete main-to-branch patch and the full content of every changed file.
- Scanned every current committed file in artifacts/prelaunch-hardening and every unique artifact blob in the unpublished branch history.
- Checked for the owner's literal home path, Tailscale/private-hostname forms, private-key material, secret/token patterns, emails and personal project contents.
- **No Tailscale hostname, literal private home path, real credential/token or personal email found in this publication change.** Email-shaped strings are explicitly synthetic test identities on reserved .invalid domains.
- **Gitleaks 8.30.1: zero findings**, using the unchanged default rules, without a suppression baseline or new exclusions.
- No real tracker, application, task log, source contents from another personal repository, credentials or live database was added. Dependency lock URLs are public registry references.

## Preserved security definitions

The new v2 source manifest necessarily retains the exact 78 v1 protection definitions already published on main; its six additions are the requested generic credential locations. Those existing source-inventory definitions were not removed, renamed or weakened for presentation. This review removes their duplicate display list from the artifact, not the protections themselves.

The two previously owner-approved frozen CORE-1 golden files are unchanged and outside this publication diff. Both verdict cores, their registry and v1 manifest bytes remain unchanged. The privacy edit changes no application/test behavior, probe counts, control results, seal facts or stored verdicts.

Raw scan logs and preserved original artifact stay ignored under .work/prelaunch-publish. This is a defined scan, not proof against every possible secret format. After the one-time merge/push, the no-merge/no-push rule applies again.
