# Threat model

Derived from the existing boundaries and limitations in [DESIGN.md](../DESIGN.md). This document does not add a promise to resist a compromised host.

## In-scope attacker: the untrusted Builder and its output

A Builder can misunderstand the request, conceal an edit in its explanation, modify tests or configuration, introduce an unsafe dependency, probe protected files, attempt network access, or produce code that violates approved project constraints. Builder text is not proof, an approval, a classification input or a source of signing identity. Repository files, parser input and diagnostic output are also untrusted.

Defenses are the existing sandbox and protected checker, restored original tests, explicit checks, bounded execution, exact-item human approval and honest reporting of unsupported behavior. New change labels describe syntax; they do not prove semantic equivalence or harmlessness. Risk rules cannot erase existing warnings.

## In-scope integrity failures

A stale result, request mismatch, wrong Candidate/Builder attribution, altered stored fact or broken event chain must not look like current passing evidence. Versioned cores, signed bindings, immutable snapshots and replay detect defined forms of alteration. Historical unsealed records stay unsealed. Missing provenance is unknown, never invented.

Weekly diagnostics address real configuration drift, stale dated protection labels and environment failures. They record observed results, run only when idle and on AC power, never approve work and never automatically repair anything.

## Trusted components

The owner, macOS, Unfoolable's protected installation, approved project checks, process-ownership helper and signing boundary are trusted. A person with full control of the Mac can replace code or future observations. A signature proves record integrity against a key; it does not prove host honesty or program correctness.

## Explicit limits

- Native tests can share a process with the code under test. Complete prevention of deliberate in-process result forgery is not claimed.
- Passing existing tests does not prove a requested new behavior. Missing checks remain visible.
- String-only and documentation edits can still matter. Classification is a review aid, never permission to skip a file.
- Static tools do not prove the absence of vulnerabilities or secrets.
- Tripwire observation is best effort; the sandbox enforces read denial.
- Small, correlated local studies do not establish broad reliability.
- Private-device access relies on correct host/device configuration; real iPhone and VoiceOver validation remains limited.

See [invariants](INVARIANTS.md) and [signing](SIGNING.md) for exact tested properties.
