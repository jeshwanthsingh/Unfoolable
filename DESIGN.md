# Unfoolable — Design

*AI does the work. Nothing fools the check.*

I built Unfoolable because I wanted an AI coding agent to do real work on my projects, but I didn't want to trust its word that the work was correct. This page explains the problem, the design, why I made the choices I did, and what the system does **not** protect against.

## 1. The problem

AI coding agents are fast, but they grade their own homework. When an agent is told "make the tests pass", the easiest path is sometimes to change the tests, special-case the input, or simply say "done". This is called reward hacking, and it isn't hypothetical: in July 2026 AI agents reportedly escaped a package proxy and went after the scoring system itself during the OpenAI–Hugging Face incident.

Most agent tools let the same system that wrote the code also decide whether it worked. I wanted the opposite: **the worker and the judge are kept apart, and the judge can't be reached by the worker.**

## 2. The idea

Three roles, never mixed:

- **The Builder** (OpenAI Codex) does the work in a private copy of my project.
- **The Grader** decides pass or fail. It runs in a separate process the Builder can't read or change.
- **Me.** Nothing is kept until I look at the changes and confirm with Touch ID.

The Grader's answer is only one of five results: `VERIFIED`, `PASSED WITH GAPS`, `FAILED`, `ERROR` or `NOT CHECKED`. "Passed with gaps" is common and honest: it means the existing checks passed, but something about the new behavior couldn't be proven automatically. **No result ever accepts a change by itself.**

## 3. How a task flows

```
Request -> Builder (sandboxed copy) -> frozen change -> Grader (separate process)
        -> pure verdict function -> sealed record -> me: look at changes -> Touch ID
```

1. **Request.** I describe a change in plain English. Starting work needs Touch ID.
2. **Build.** Codex works in its own copy under `~/.cc-work`, inside a macOS sandbox: no outside network, 78 protected targets (`protected-paths-v1`) (keys, credentials, the grader's own files) blocked from reading, decoy "tripwire" files that stop the run if touched, and token, command and time budgets.
3. **Freeze.** When the Builder says it's done, its change is frozen. It can't edit anything after this point.
4. **Check.** The Grader restores the **original** tests (so edited tests can't sneak through), runs project checks that were approved ahead of time, and runs free code-quality and secret-scanning tools on only the changed lines.
5. **Decide.** Everything the Grader observed is passed to one small function, `scoreVerdict` in `packages/shared/verdict-core.ts`. It takes facts in and returns a verdict plus a step-by-step trace. It has no database, files, network or clock, so the same facts always give the same answer. Released cores v1/v2 remain registered; old seals replay their recorded version and source hash.
6. **Seal.** The facts, verdict and trace are saved and signed by a key inside the Mac's Secure Enclave chip (in-toto/DSSE format), and linked into a hash chain. Seal format v2 also binds the request hash and recorded Builder identity. `./cc verify` checks the recorded bindings and replay; the latest activation check found 6 sealed, 8 older-unsealed and 0 broken latest ticket records.
7. **Review.** I see the result, the evidence and the exact changes. Accept unlocks only after I've opened the changes, and Touch ID is bound to that exact item. Accept saves a local branch; it never merges or pushes.

Two extra flows reuse the same path. **Bug from this log:** the Builder must first write a test that reproduces the exact error on the old code, and only then may a fresh session fix it. **Night Shift:** I approve each task separately with Touch ID before bed, it runs on AC power within a fuel limit, and everything waits for me in the morning.

## 4. Why it's hard to fool

- **The judge is out of reach.** The Builder can't read the grader's files, the signing key or the protected tests. I prove this with a probe that runs as the real Builder and tries the 78 targets in `protected-paths-v1`. The dated Builder probe found none readable; missing targets are not successful read-denial proofs.
- **The tester gets tested.** A new test only counts if it **fails on the old code** and **passes on the new code**. A test that passes on both proves nothing, so it isn't admitted.
- **Planted cheats.** I keep 12 deliberately wrong changes (edited tests, special-casing, empty tests and more). None of them may ever pass. Today: 5 fail, 7 are "not checked", 0 pass.
- **Caution always wins.** When two checks disagree, the more cautious result wins (FAILED > ERROR > NOT CHECKED > PASSED WITH GAPS > VERIFIED). A missing check can never make a result look better.
- **One readable core.** Pass/fail logic used to live in 8 places. I moved it into one pure function. Before changing anything, I recorded old verdicts and proved the new core gives exactly the same answers (61 comparisons, zero differences, plus 80,000 random property tests). That replay caught a real bug: a version that would have quietly upgraded a "not checked" result.
- **Records can't be quietly edited.** Changing one byte of a stored fact, editing a verdict or deleting an event breaks the seal or the chain.

Rules that must always hold are listed with their tests in `docs/INVARIANTS.md`. Three I care most about:
1. A harness error is never a pass.
2. Adding bad evidence never improves a verdict.
3. The Builder's own claims never decide a result.

## 5. Decisions and trade-offs

- **I measure before adding anything.** The independent Test Writer only confirmed 2 of 11 correct changes, so it stays a warning light, not a judge. AI reviewers caught nothing my free tools didn't already catch, so they're off. The popular "Karpathy rules" file made my Builder use 12% more tokens and finish fewer tasks, so it's off.
- **A Mac-native sandbox, not VMs.** Unfoolable uses macOS Seatbelt plus process ownership checks. My other project, Aegis, uses Firecracker microVMs on Linux. On one personal Mac, a VM layer adds a lot of complexity for little gain.
- **Secure Enclave over a key file.** A file key can be copied and ends up in backups. The Secure Enclave key can't leave this Mac. The old software key was revoked once the hardware key was working.
- **Honest gaps over green checkmarks.** If something can't be checked, the app says so instead of guessing.

SCION-1 classifies changed code deterministically for review and only raises baseline risk. Its weekly self-check runs when idle and on AC power; it records real results and never repairs or approves automatically.

## 6. What it does not do

- **It trusts the host.** Someone with full control of my Mac could replace the code or keys. Signatures prove a record wasn't edited; they don't prove the machine was honest.
- **Native tests share a process with the code they test.** Deliberate in-process forgery of test results is a known, documented risk.
- **Passing tests isn't proof of new behavior.** That's why "passed with gaps" exists.
- **Small studies.** My measurements come from a few dozen local cases, not a benchmark.
- **One user, one Mac.** It's a personal tool, not a team product. The phone app is built but not fully tested on a real iPhone.
- **Tripwires are best effort.** They raise the alarm; the sandbox is the real wall.

---

Further detail: [license](LICENSE), [threat model](docs/THREAT_MODEL.md), [negative controls](docs/NEGATIVE_CONTROLS.md), `docs/DESIGN_FACTS.md` (component facts), `docs/INVARIANTS.md` (rules and their tests), `docs/SIGNING.md` (sealing), `README.md` (setup and measurements).
