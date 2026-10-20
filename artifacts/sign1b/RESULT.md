# SIGN-1b — active device-bound sealing

## Activation

Branched from 2b8d918 on codex/sign-1b. Fresh standard Litestream/file checkpoint was force-created and fully restored before activation: 178,472 files, 51 tables, one passkey and 1,061 ticket events; all table/file hashes matched, integrity OK and zero foreign-key errors. Only the recorded PID/start-time-matched coordinator was stopped using existing owned-process controls. Normal launcher restarted it with schema 21. No user decision or stored verdict was changed.

Activation and final read-only audits: 0 sealed check events, 19 older check events, 0 broken seals, 0 seal errors. CLI --all exits 2 because older/unsealed records remain. Ten tickets have an older latest check; one ticket has no check. Old events were not backfilled. No real task was rechecked merely to create a production signature.

## Hardware and rotation

Unsigned Swift/CryptoKit SecureEnclave.P256 worked without special entitlements (Xcode 27.1 / 27A9275). Both standalone and production signing-shell signatures verified independently with Node crypto. Access control is AfterFirstUnlockThisDeviceOnly + privateKeyUsage, with no userPresence/biometric flags and no finger prompt. Before first unlock or hardware failure, sealing fails visibly, never silently substitutes software.

Current public identity: 874c3c9309f3 (full fingerprint in docs/VERIFY_KEYS.json).
Retired public identity: fc261d6df296 (full fingerprint in docs/VERIFY_KEYS.json).
Rotation: 2026-10-20T19:11:41.426Z. Full public material and validity intervals are in docs/VERIFY_KEYS.json. docs/VERIFY_KEY.pem remains the original public key, not the active signer. DSSE keyid is the public SPKI SHA-256. Key lifetime is checked after signature authentication; retirement is exclusive. Old seals dated before retirement pass; at/after retirement fail. A current key cannot authenticate earlier timestamps.

After proving the replacement and restarting normally, the exact local software private.pem was overwritten, fsynced and unlinked. APFS/SSD/snapshot physical erasure is not guaranteed. Older backups and the pre-activation proof restore can retain it. Future checkpoints omit exact private.pem/blob paths, preserving public verification metadata. Recovery tests verify seals without any private key. BACKUPS.md documents conservative older-archive removal; no recovery history was deleted this round. SIGNING.md documents explicit new-Mac hardware provisioning and preservation of all old public keys.

## Validation

Final counters are in FINAL_VALIDATION.json. Full golden comparison against fbad889: 61 complete verdict/trace comparisons, zero differences. All 20 protected core/scorer/sandbox/decision file hashes are unchanged. All 12 negative controls remain non-PASS. The real Builder and direct exact-profile probe deny all 73 targets, deny both signing helpers (zero signature bytes) and six sensitive HTTP endpoints, while owned Git/temp/SQLite work and cleanup is certified.

The first full suite found one outdated probe assertion (expected one helper, now there are two). It was strengthened to require both helper denials, passed its focused rerun, and the whole suite was rerun fresh. No verdict rule changed.

## Limits

There has been no real post-activation completed check yet, so production sealed-event count is honestly zero. Hardware signing is proven independently; historical seals are not invented. Signed times are authenticated signer data, not an external timestamp service. Whole-machine owner/root compromise, trusted-history replacement and rollback of all retained anchors remain outside this local boundary. Hardware signing while this Mac is locked was not separately exercised; the access-control policy is chosen for after-first-unlock use. Existing passkey records survived offline restoration; no new physical passkey decision was exercised.

No merge, push, deployment, new paid service or billing was performed.

## Final result

Full suite: 1,130/1,130 passed, zero failed/cancelled/skipped, 345,865.414834 ms. Typecheck and production build pass (existing chunk/Pixi warnings only). A second fresh, post-rotation backup was fully restored: 178,472 files, 56 tables, one passkey, 1,061 ticket events, all hashes/integrity/FKs clean and chain head preserved. Its manifest excludes both signing secrets and restores the matching current public key. Old backups were retained. All 73 live probe targets are denied; both helper attempts return zero signature bytes. 12/12 controls remain non-PASS. Golden 61/61 matches and all 20 protected policy file hashes unchanged.
