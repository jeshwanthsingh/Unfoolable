# Sealed verdicts

Use `./cc verify <ticket>` or `./cc verify --all`. These commands open SQLite read-only, verify the ordered ticket-event chain, authenticate each post-SIGN-1 check against the trusted public key, hash the stored facts/diff, and replay the exact stored facts through the unchanged core. They never build, refresh a check, or accept a change.

Exit codes: 0 = all requested checks sealed and replaying; 1 = detected break; 2 = older/unsealed or no checks. Older events say “Not sealed (older than SIGN-1)”; no signatures are backfilled. A seal failure is reported separately and never rewrites the verdict.

The Statement follows [in-toto v1](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md). The payload type is application/vnd.in-toto+json and signatures cover byte-counted [DSSE PAE](https://github.com/secure-systems-lab/dsse/blob/master/protocol.md). ECDSA P-256 / SHA-256 signatures use DER encoding. The subject is the frozen diff, named by its Candidate commit; its SHA-256 is not a Git object hash.

The production public key is docs/VERIFY_KEY.pem. Only the trusted host signing shell calls scripts/seal-helper.mjs; no API or agent tool exposes signing. The Builder's enforced profile denies reading the key and loading the helper. Isolated test databases use separate keys and never authorize live decisions.

[Apple's Secure Enclave API](https://developer.apple.com/documentation/cryptokit/secureenclave/p256/signing/privatekey) was trialled without new entitlements. Compilation exited 69 because Xcode's licence is not accepted. The agent did not accept it. Therefore the active implementation uses the explicitly authorized software fallback at the app data directory's signing/private.pem (0600, parent 0700). It is portable key material; hardware protection is NOT claimed. Resolve the licence and rerun the feasibility probe before a separate hardware-key migration. Never silently rotate keys.

Backups keep signing identity, facts, sealed diffs, attestation tables and the latest chain head. The restore test checks signature/replay and the same head. Protect the backup as carefully as the live key. Signatures do not prove that a test/oracle was correct. An owner/root attacker stealing the software key, replacing trusted application code or pinned keys, or rolling back the database and every retained anchor can defeat this local scheme.

Examples in artifacts/sign1 use an isolated NOT CHECKED fixture and example-public.pem, not the production key. They demonstrate authentication without claiming that a real task was checked or approved. No AI study ran for the reviewer overlap; no review role qualified.
