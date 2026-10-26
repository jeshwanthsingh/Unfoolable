# Threat model

Updated 2026-10-25. “Unfoolable” is an aspiration, not a guarantee. These boundaries come from [the design](../DESIGN.md); they do not promise resistance to a compromised host.

## In scope: the untrusted Builder and its output

The Builder may misunderstand a request, conceal edits, change tests or configuration, introduce dependencies, probe private files, attempt network access, or violate approved project rules. Repository files, parser inputs and diagnostics are untrusted. Builder explanations never authorize work, classify changes, supply signing identity or decide results.

The Builder works in an owned copy under a macOS permission profile. Outside network access and protected reads are denied. The current released inventory is **84 targets, `protected-paths-v2`**. This is a versioned target list, not 84 secrets and not proof that every target exists. [Manifest and hash](../scripts/probe-manifests/registry.json); [dated Builder probe](../artifacts/prelaunch-hardening/probe.json).

The 2026-10-25 Builder probe recorded **74 denied, 10 absent, zero readable** targets. The six additions are `.npmrc`, `.netrc`, `.pypirc`, `.git-credentials`, `.docker/config.json` and `.kube`. V1 remains available for historical records. Optional `COMMAND_CENTER_EXTRA_PROTECTED_PATHS` adds validated absolute or `~/` paths, including absent paths and canonical symlink targets; extras supplement the versioned manifest rather than rewriting it.

The frozen change is checked separately. Original tests are restored; approved project checks, applicable regression recipes and quality tools feed the pure verdict core. Candidate-authored tests are non-authoritative. Missing coverage stays visible. SCION-1 change classification describes syntax, not semantic equivalence; risk rules only raise baseline risk. Every changed file must still be opened before Accept. Exact-item passkey confirmation is required; no verdict accepts work automatically.

## In scope: grading-time access and record integrity

The career liveness checker now runs its candidate module in a bounded child; only JSON returns to a parent that owns assertions and check reporting. A shared-assert attack passed before this fix and fails afterwards (control #13). Old approved copies of that checker cannot execute until the isolated replacement is approved. This does not solve all forms of in-process forgery in other native runners.

Candidate code also executes during checking. It must not read separate judge code, private records or signing material, write outside its scratch space, signal the harness, inherit host secrets or make non-loopback outbound connections. Local HTTP test fixtures are deliberately allowed; private application endpoints still require authentication.

The [2026-10-24 grading-time diagnostic](../artifacts/recover-docs/grading-probe.json) exercised the actual protected Python observer/separate judge and project unittest runner. Each made 87 checks: 76 denials, nine absent targets and two permitted positive controls (own export read and scratch write). Nothing forbidden succeeded. Absent targets are untested, not proven denied. The initial project report-collection failure is [retained](../artifacts/recover-docs/grading-probe-attempt-1.json). Browser/Vitest grading-time access was not measured in this diagnostic. A signal-zero attempt tests permission, not delivery of a destructive signal.

A stale result, changed request, wrong artifact attribution, altered fact or damaged event chain must not masquerade as current evidence. Seals bind recorded facts and trace to the frozen change and recorded core version/source hash. Format v2 additionally binds request hash and Builder identity with explicit provenance; unreported model versions remain unknown. Released cores v1/v2 remain registered so old seals replay with their own policy. The latest activation check found **six sealed, eight older-unsealed, zero broken** latest ticket records; that is a dated installation observation, not a universal guarantee. [Signing](SIGNING.md); [core registry](CORE_VERSIONS.json).

SCION-1 weekly self-checks address configuration drift: idle and AC-only, bounded, interruptible diagnostics, recorded as events. They never repair or approve work automatically. Protection labels must name the observed manifest and date, not imply a fresh per-task probe.

## Trusted components

The owner, host macOS, protected Unfoolable installation, approved checks, process-ownership helper and signing boundary are trusted. Someone controlling the Mac can replace code or future observations. A seal proves integrity against a signing key, not host honesty or code correctness.

## Explicit limits

- Native tests may share a process with the code they test. Deliberate in-process result forgery is not fully prevented. A separate judge does not make untrusted observations intrinsically authentic.
- Protected runners use targeted read restrictions and runtime exceptions, not a proven universal default-deny read allowlist. Cross-runner feasibility remains unmeasured.
- Passing old tests does not prove the requested behavior. Documentation and string edits can still be wrong.
- Static tools do not prove absence of secrets or vulnerabilities. Tripwire alarms are best effort; enforced read denial is the stronger boundary.
- Small, correlated studies do not establish broad reliability. Abstention is not defect detection.
- Private phone access relies on trusted host/device configuration. Real-iPhone and manual VoiceOver validation remain limited.
- Older unsealed records remain unsealed. No recovery step invents missing evidence.

See [negative controls](NEGATIVE_CONTROLS.md), [invariants](INVARIANTS.md) and the [ADV-1 status](ADV_1_STATUS.md).
