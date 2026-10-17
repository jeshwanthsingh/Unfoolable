# Command Center engineering rules

## Simplicity, surgical changes, proof

These project rules apply the Karpathy-style guidelines requested by Jesh; this wording is project-authored, not a copied or officially endorsed skill.

- Think before editing. State assumptions that affect the solution. Inspect the existing interface, architecture and repository state; ask only when ambiguity changes correctness or design.
- Use the simplest implementation that satisfies the current request. No speculative features, single-use abstractions, unrelated cleanup or new AI roles.
- Make surgical changes. Every changed line must trace to the request. Preserve existing tests, sandbox boundaries, protected checks, exact-item decisions and Touch ID.
- Define done as observable checks, then verify before claiming success. Installation, compilation and an agent saying done are different from verified behavior. Report failures and unknowns plainly.
- Keep work local. Never push, merge or deploy without explicit authorization. Keep temporary tools and files in ignored `.work/` (owned Builder worktrees may use the separately approved `~/.cc-work/`). Never expose credentials or approval capabilities.

## UI-2 design and motion work

- Preserve the original UI and all three alternatives until Jesh selects a direction. Do not choose for him.
- Use official Playwright MCP for the screenshot review loop: after each completed visual/motion change batch, capture and visually inspect every direction at 1440px and 390px. Save before/after evidence and review notes. Do not relabel old CLI captures as MCP evidence.
- Follow the pinned Emil animate, review-animations and animation-performance skills. Motion must have a named purpose, follow real recorded events, settle quickly and remain interruptible. Favor transform/opacity and finite, calm springs; no ambient loops or invented progress.
- Keep sound optional and off by default. A quiet lock click is feedback for an observed passing lock, not proof that a Mission is complete.
- Reduced motion snaps positional movement. Hidden/idle rendering must stop. Do not add entry/exit animation to frequent keyboard navigation just for decoration.
- Historical replay cannot authorize Keep, Discard or any decision. The existing live evidence/passkey flow remains authoritative.
