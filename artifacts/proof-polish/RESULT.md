# Proof polish

Base: f257041. Local branch: codex/proof-polish. Main and the recovery stash are
unchanged. No merge, push, production restart, approval or data change.

- The selected task stays as a compact highlighted row while its pass is open.
  The shared card-to-pass crossfade caused the old empty gap. The list row now
  remains independent; position motion settles in 180ms and reduced motion is instant.
- Closing Proof restores the full task and keyboard focus. Existing action
  handlers, Touch ID and open-every-file requirements remain unchanged.
- Proof facts are borderless rows with 18px icons and 44px touch targets. Unknown
  fuel remains unknown; architecture facts use neutral locks, not passing-test ticks.
- The probe manifest version/hash are under Technical details in the pass.
  The dated count stays visible. The room's version label is unchanged.

Validation: 1,303/1,303 suite tests, zero failures/skips; typecheck/build pass.
Eight browser combinations pass (desktop/phone, light/dark, normal/reduced motion),
covering painted compact selection, highlight, restore-on-close, keyboard focus,
plain fact rows, touch size, retained metadata, locked Accept, reachable Stop all
and no horizontal overflow. The original browser regression failed before the fix.
Golden replay: 61 comparisons, zero differences. All 233 server/shared/protected
files including signing/core registry metadata are byte-identical to f257041.
The existing SCION-1b denial/control evidence is retained; those studies were not
rerun for this display-only patch.

## Screenshots

Official Playwright MCP captures at 100% zoom, using the same labelled isolated
fixture before and after. No production approval was performed.

| Size/theme | Before | After |
| --- | --- | --- |
| Desktop light | [Before](before/1440-light-proof.png) | [After](after/1440-light-proof.png) |
| Desktop dark | [Before](before/1440-dark-proof.png) | [After](after/1440-dark-proof.png) |
| Phone light | [Before](before/390-light-proof.png) | [After](after/390-light-proof.png) |
| Phone dark | [Before](before/390-dark-proof.png) | [After](after/390-dark-proof.png) |

## Interface review

Scope: the selected list row and Wallet Proof facts in React/plain CSS.
Typography: existing scale retained. Surfaces: selected row stays grounded; boxes
removed from facts. Motion: crossfade no longer erases the row; bounded position
spring and reduced-motion preference verified. Icons: consistent 18px neutral
architecture symbols, with known probe state colored from its saved result.
Performance: no new polling, animation loop, dependency or data request.
Accessibility: focus return, 44px targets, keyboard metadata disclosure, disabled
Accept and emergency-control hit testing pass. No remaining material blockers in
this scope. Broader screens were not redesigned.
