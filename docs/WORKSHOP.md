# Interactive Workshop + Vault

The Workshop presents the existing append-only ticket log. XState replays recorded events; no timer advances domain state. Pixi crates move only after station changes. The marker describes working, needs-you, stopped, or observed sandbox denials. Movement settles in 600 ms, then the ticker stops. Hidden tabs do not render. Below 1000px, phones/tablets never import Pixi; keyboard-accessible station and ticket buttons remain.

The SVG Vault shows recorded check results, not a second verifier. Coverage/mutation is advisory with no invented passing threshold. Its door requires the server's current keepAvailable and non-stale evidence. Exact-file diff receipts and fresh passkeys remain enforced by the server. Replay cannot perform decisions.

## Libraries

| Library | Version | License |
|---|---|---|
| xstate | 5.33.3 | MIT |
| pixi.js | 8.22.0 | MIT |
| motion | 14.3.0 | MIT |
| @git-diff-view/react | 0.1.8 | MIT |
| @git-diff-view/core | 0.1.8 | MIT |
| @git-diff-view/shiki | 0.1.8 | MIT |
| shiki | 4.5.0 | MIT |

Art: Kenney Isometric Miniature Prototype v1.0 (2019), CC0, https://kenney.nl/assets/isometric-miniature-prototype . Only Angle/crate_E.png is used; original license retained beside it. Archive SHA256: 8f35b991d0bad7ebad586c74522a8285cd33b2ef68b78429b0c9d254d22757a5. Room geometry and worker marker are original Pixi primitives. No Munder code/assets.

skipLibCheck bypasses upstream Pixi/XState declaration conflicts with exact optional properties; application code remains strict, including exactOptionalPropertyTypes. Diff viewer/Shiki are lazy-loaded on file-open. Pixi is desktop-only. These dependencies add larger lazy chunks; no remote font/CDN/paid service.

## Use

Start CC as usual (npm run dev, or existing production server); open private chat with ./cc chat. Click a crate or ticket to review beside the Workshop. Click a station to filter its recorded tickets. Replay recorded events is explicitly labelled and cannot authorize actions; Return to live restores review.
