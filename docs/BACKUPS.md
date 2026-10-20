# Local backups

Litestream **0.5.17**, Apache-2.0, continuously replicates the live SQLite WAL to a local file replica. No cloud service, billing, HTTP listener or cloud credential is configured. The official macOS ARM64 archive SHA256 was verified: `e211f68ff7658d19f193f2914417afdf8f89a053ff8f263e5d6b3b1d3bbc7b08`. Binary: `.work/backup-tools/v0.5.17/litestream`; license beside it. [Upstream release](https://github.com/benbjohnson/litestream/releases/tag/v0.5.17), [local replicas](https://litestream.io/guides/file/), [restore](https://litestream.io/reference/restore/).

## Location and schedule

`~/UnfoolableBackups` links to `~/.config/unfoolable/backups`. This is deliberate: the existing Builder profile denies `~/.config`, including access through the friendly link. Merely making a directory mode 0700 would not protect it from a same-user Builder. The sandbox rules are unchanged.

- SQLite replication: approximately one-second synchronization, seven-day snapshot retention, while the Mac is awake and the user service is running.
- Complete file checkpoint: every five minutes when tickets are idle; keep the latest three successful archives. Unchanged application state reuses its last checkpoint instead of repeatedly copying gigabytes of old proofs. A checkpoint may take longer than five minutes. Busy tickets delay files, not SQLite replication.
- Copies include the operator capability, LIVE data marker, passkey registration in SQLite, playbook approvals, oracle definitions, proof files and referenced private Candidate directories. Live database/WAL/lock files are not raw-copied.
- File checkpoints require unchanged logical application tables and a matching, integrity-checked Litestream restore. A changed file or database rejects the checkpoint and retains the previous one. In-flight work is not paused to obtain a checkpoint.

The two per-user LaunchAgents are `local.unfoolable.litestream` and `local.unfoolable.backup-files`. Their plists are in `~/Library/LaunchAgents`. Settings, socket and private logs are in `~/.config/unfoolable`. `backup.json` contains paths and scheduling metadata, not cloud secrets. Litestream uses `litestream.yml` there. Nothing is committed from these private directories.

## Commands

From this repository:

```sh
python3 scripts/backup.py status
python3 scripts/backup.py snapshot
python3 scripts/backup.py restore --output "$PWD/.work/restore-check"
```

Restore refuses an existing output. It validates the archive hash, every file/link, every logical database table, SQLite integrity and foreign keys. It writes only the requested new staging directory; it does not start the app, decide anything or overwrite live data.

The `database.sqlite` in the restored bundle came from Litestream, not a raw copy. `data/` holds sidecar files. `external/` holds referenced code copies. `manifest.json` records their original locations. Preserve absolute paths when doing a real recovery: stop Unfoolable and both backup services first; keep the current data separately; restore the verified database and sidecars to their recorded locations. Do not start a second live coordinator on the proof restore. Historical or interrupted work must not be silently resumed; approvals still require a fresh passkey check. Let old two-minute confirmations expire before activation.

## Configuration

Initial installation uses:

```sh
python3 scripts/backup.py install --data-dir /absolute/live/data \
  --backup-dir "$HOME/UnfoolableBackups" --litestream /absolute/litestream
```

Custom storage must resolve under `~/.config` or `~/.bench-private`, both existing deny roots. To reconfigure, stop only these jobs using `launchctl bootout gui/$(id -u)/local.unfoolable.litestream` and the equivalent `local.unfoolable.backup-files`; save/remove their two owned plist files, then run install with the new paths. Existing jobs are refused before settings are changed. This restriction avoids making protected copies readable to Builder. Other backup locations require a separate sandbox review.

## Limits

Same-disk local backups do not cover loss of the Mac or its disk. They are private, not separately encrypted; normal macOS disk protection still matters. SQLite can be newer than the last complete file checkpoint, so use a complete checkpoint for consistent full recovery. No checkpoint is promised while work keeps changing.

The passkey's stored public credential and counters are backed up; its hardware/Keychain private key is intentionally not exported. Record/hash equality on this Mac is verified. A fresh physical Touch ID assertion against a restored server and moving the credential to a replacement Mac are not proven by the offline restore test. Dependencies, source repositories and macOS itself are not a complete machine image.

## SIGN-1b signing-key rotation

Future file checkpoints omit **only** `data/signing/private.pem` and `data/signing/device-key.blob`; public.pem and mode.json remain. Public key history is `docs/VERIFY_KEYS.json` in the reviewed source checkout. Restored evidence can be verified without any private key; new signatures require explicit hardware provisioning on the destination Mac. A device-bound blob is unusable on another Mac and is also omitted.

**Older snapshots, including the required SIGN-1b pre-activation snapshot, may contain the retired software private key.** The isolated proof restore under `.work/sign1b/restore-preactivation` may contain that key too. Keep these locations Builder-denied. Removing the live private file does not remove these copies, Time Machine/APFS snapshots, or SSD remnants.

To remove older copies safely: first run `snapshot --force` and a new `restore --output <new ignored path>` with this version; keep that successful archive and its last-success.json. Inspect each older archive manifest for `data/signing/private.pem` (without printing its contents), then remove only the explicitly identified obsolete `snapshot-*.tar.gz` files and the isolated old proof-restore directory. Do not delete the current last-success archive, SQLite replica, manifests, source public keys, or live data. Remove copies in Time Machine or other backup systems separately using their normal controls. APFS/SSD physical secure erase of an individual file cannot be promised. This round retained older archives rather than deleting recovery history.

For one explicitly identified obsolete archive (replace the placeholder; do not use a wildcard):

```sh
tar -tzf "$HOME/UnfoolableBackups/<old-snapshot>.tar.gz" | rg '^data/signing/private.pem$'
# Only after a newer restore proof succeeds and this is not the current last-success archive:
rm -i "$HOME/UnfoolableBackups/<old-snapshot>.tar.gz"
```

This lists the key pathname, not its contents. Do not run the removal against the current archive. Removing backups is a separate human choice; this round did not do it.
