# CORE-2 result

Completed locally on codex/core-2 from main 4abc25a. No push, merge, deployment, production restart or human decision.

## Design

The owner-supplied DESIGN.md was installed byte for byte (including no final newline); its SHA256 is in design-install.json. README now links to it as the design document. docs/DESIGN_CHECK.md contains the complete claim table with source/test/artifact pointers, primary-source links for the July incident, and minimal suggested wording. No factual corrections were applied to the owner prose.

## Fixes and tests

- Unequal project command arrays, including missing rows, return ERROR with the exact requested reason. Four mismatched cases and the equal-array passing/failing controls are in tests/core2-regressions.test.ts.
- Combined ERROR has passed:false in the trace. Explicit native handling ends in a never guard; unknown runtime paths return ERROR. A compile-negative test proves a newly added typed path cannot silently fall through.
- Writer limit defaults moved into ticket-budget.ts; legacy missing limits still use 40,000 and explicit limits win. The core has no hidden writer default.
- Live code uses eligibleForReview. The user approved retaining original historical bytes and a legacy-data reader; stored old reports normalize only after their integrity checks. Ambiguous old/new fields are refused. No verdict is a human decision.
- Cached Prettier 3.6.2 (MIT) formatted only verdict-core.ts. No repository formatter config existed, so its defaults were used. Baseline 148 lines -> final 606. Existing WHY comments remain, with one plain comment per path.

## Verification

- Full suite: 1,243/1,243, no failures/skips/cancellations; 355.547501833 seconds under caffeinate -dims.
- Afterwards, one formatting-only line wrap was applied. Pinned TypeScript scanning proves its token stream identical; 49 core, property, historical, authority, snapshot and seal tests passed afterwards. Typecheck and isolated build were rerun successfully on the final formatted source; no running dist was replaced.
- Current-main golden: 61 exact decision/reason comparisons, zero differences after normalizing the requested field rename. Both frozen original archives remain byte-identical. New unequal-command ERROR behavior is tested separately. The combined ERROR trace correction is separately tested.
- Real Builder: 74/74 protected paths denied; eight sensitive endpoints and both signer helpers denied; owned Git status/diff/log, SQLite/temp and writes work.
- Negative controls: five FAIL, seven INCONCLUSIVE, zero PASS. Final run-end runner hashes unchanged. The first run also had zero PASS but was invalidated because the approved dependency-path privacy edit happened during execution; it is not used as final proof.
- Protected inventory: 265/281 byte-identical; 16 explicit changes are enumerated in protected-hashes.json (core/default adapter, renamed callers/legacy reader and owner-authorized equivalent privacy paths). No sandbox, permission, Touch ID or decision handler policy was expanded.
- Gitleaks found no leaks in changed source/tests/docs. Existing production build chunk-size warnings remain. No new package dependency.

## Privacy

321 tracked files were changed/redacted, including deletion of artifacts/phone1/private-https.json. privacy-files.json lists every file. The two frozen CORE-1 golden archives retain their original private paths by explicit owner approval. Synthetic private-domain test values remain fake. No other tracked file contains the searched real private hostname/home path; ignored runtime data and .git history were not edited.

Hard-coded trusted browser-tool paths now resolve identically using the OS home. The observer uses userInfo().homedir because its HOME is intentionally a disposable sandbox directory. Real browser-observer execution passes. No broader read allowance was introduced.

Optional history cleanup is a separate, coordinated git-filter-repo rewrite of the offending paths/text, followed by reviewed force-push and replacement clones. It was not performed. A rewrite alone would not remove the two deliberately retained current golden archives; their publication policy must be decided separately.

## Limits

Existing seals bind exact original core bytes, not just the verdict. Code inspection shows cc verify on edited core source reports an older source mismatch; original signatures/facts were not changed or resealed. Verification with the recorded core, or a fresh authorized Recheck for current review, remains necessary. The live coordinator was not restarted.

This refactor does not remove the documented in-process-test forgery risk, best-effort tripwire sensor limitation, missing historical facts or host-trust assumption.
