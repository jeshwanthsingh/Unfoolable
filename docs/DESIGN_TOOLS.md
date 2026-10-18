# Unfoolable design tools

UI-3, based on cd98243. Safety, plain language, accessibility and the approved brief override skill aesthetics, in that order. No paid tools or APIs added. Skill content is local guidance, not shipped application code.

## Roles and versions

| Tool / skill | Version / revision | License | One job |
|---|---|---|---|
| anthropic-frontend-design | dbd4588f9e1033efb41dad4bef2f7947c8993d44 | Apache-2.0 | Existing design guidance |
| webapp-testing | dbd4588f9e1033efb41dad4bef2f7947c8993d44 | Apache-2.0 | Existing design guidance |
| impeccable | 08d5b470495d242ca0470f4aeae1956c3a074f83 | Apache-2.0 | Existing design guidance |
| taste-skill | f624f37a8c650b9cc550253104925efe4c8de246 | MIT | Existing design guidance |
| ui-skills-reviewer | 747a47fdb6b405e5cbf268f7c410123930455157 | MIT | Existing design guidance |
| Jakub better-ui, better-typography, better-colors | 4c66b1fa86e9ab70187b43d7da9b6fdb29f2ef63 | MIT | Surface, type and contrast polish respectively |
| Jakub variant / break | Same revision | MIT | Three row-density variants / state stress cases |
| Jakub interface-review / better-accessibility | Same revision | MIT | Change review / keyboard and semantics |
| Leonxlnx minimalist-ui | f624f37a8c650b9cc550253104925efe4c8de246 | MIT | Remove unnecessary containers; brief overrides editorial defaults |
| Vercel web-design-guidelines | 063bee94c3f4df8453406c830b0a7df0f2860278, metadata 1.0.0 | Agent-skills repository license unspecified | Locally installed reviewer; not redistributed |
| Vercel web-interface-guidelines text | 434b7f91364665f2f733b310ec54809bf8f37937 | MIT | Accessibility and browser audit rules |
| OpenAI frontend-skill | Unavailable in official openai/skills at 49f948faa9258a0c61caceaf225e179651397431 | Not applicable | No substitute installed |
| Tyler Gibbs linear-design-principles | Unavailable in named repository and public skills/codeskills trees | Unknown | No substitute installed or Linear styling borrowed |
| Impeccable | 4.6.0 | Apache-2.0 | Operate-mode restraint; context launcher unavailable, documented direct-context fallback |
| Playwright MCP | 0.0.83 | Apache-2.0 | Real browser screenshots and interaction review |
| MCP SDK | 1.32.1 | MIT | Transport to official Playwright MCP |
| Instrument Sans variable regular | google/fonts 0b58fb370093f9a9f4ff785d94405710b79de67c | SIL OFL 1.1 | Sole UI font, self-hosted |

Installed skill file hashes identify the exact local guidance consulted, including pre-existing Emil skills. Native browser dialogs supply focus management. Original hallmark SVGs are project-authored; no external art or icon pack. Existing runtime libraries remain pinned in package-lock.json; no runtime dependency is added for this design.

## Local skill identities

- anthropic-frontend-design: SHA256 `d91970639e9f5c37682ac7ab60094d35f1c7c1f38d731bd56396563aee10c1d3`.
- impeccable: SHA256 `5fb0d412928c03e62d2536adfd878ad6aad6f9ce343956aa4f7164da06da3459`.
- taste-skill: SHA256 `ee847084e58f5a81a46120912be9cd15f083570a6ca8f3d1a30372a720633043`.
- minimalist-ui: SHA256 `769ab38eed137bb22c7c09ee08ebb628e9acf3ad37f138d43f772e3af83933e4`.
- better-ui: SHA256 `fb9807bb5c59a3ca9d4a27b25f56b36e5596251d280fb30c4b7f2ff8b6f4fe2d`.
- better-typography: SHA256 `e60ca6467ba60e68f95ed2d2cfa35f2a850d96ef2a0c0d3fcfcfd9510e51f184`.
- better-colors: SHA256 `e74f1c413a4094dc2a73fb0baa0da2241465e01d593b0257ba995500df9b0068`.
- variant: SHA256 `2d8eef43768e01d7fcec5ec2fd56dcfc453904b31a23fe8ea53170eb828d24ea`.
- break: SHA256 `6b231897f10477fe2a9d335b457e53c670b07a8291a08b5d8dad3981b658b9d0`.
- interface-review: SHA256 `8977988d63d7c17b8b0cd334ebd722d4e2dff00af0f152de2bc6f100d13d59ce`.
- better-accessibility: SHA256 `df0cafe0e75a08548cf46a2a430f46c198e7e0ee9d46bdf7884c2afefb44b70e`.
- web-design-guidelines: SHA256 `f4647ca866a3accf763777f83e7682954f0187cd6bea7eea0399796652414e8f`.
- ui-skills-reviewer: SHA256 `fea3322f36d58fdafafce2aef56e4556dd2ac7b20876b7dff7d8be7f25fa597f`.
- emil-animate: SHA256 `b8ede161270458e6ae2e45e8a1985373515d4c63de5568ddb0f9012d7634356c`.
- emil-review-animations: SHA256 `6ff590d29e436766135aa3d137be1fac2a867165c7257fc315b189361f1873af`.
- emil-animation-performance: SHA256 `ceb9dd3fe912615830f725a0120ccf8d012d15a6218001a5cd6c15d38e39a957`.
- webapp-testing: SHA256 `51b7349e77ec63b7744a6f63647e7566a0b4d2e301121cc10e8c2113af6556a2`.

## Application and verification runtime

No new npm dependency. React / React DOM 19.3.0 (MIT), Motion 14.3.0 (MIT), TypeScript 7.0.2 (Apache-2.0), Vite 8.3.2 (MIT), @git-diff-view core/react/shiki 0.1.8 (MIT), Shiki 4.5.0 (MIT), @simplewebauthn browser 13.3.0 / server 13.3.3 (MIT). Existing XState 5.33.3, PixiJS 8.22.0, Three 0.186.1 and React Three Fiber 9.8.2 (all MIT) remain in secondary Labs; they create no canvas on the main screen. Node 24.21.0 (Node license: MIT plus bundled third-party notices) runs app checks; Homebrew Node 24.8.0 runs the existing MCP transport only. Playwright's server reports its bundled engine as 1.64.0-alpha-1790635538000 (Apache-2.0); Chrome is the locally installed browser, isolated profile and sandbox on. Bundled Pillow 12.3.0 (MIT-CMU) assembles review contact sheets only; no new installation or shipped dependency.

Instrument Sans TTF SHA256: b24f1812584816958afcf22e22d08e44318c5e51651e25d2438efdde389b33b1. Its OFL.txt is preserved verbatim, including upstream whitespace. Browser fetches the font from localhost. No other font family is introduced.

Credential scan: existing Gitleaks 8.30.1, MIT, protected offline invocation. No new security platform installed.


## Round UI-4 — reliability and interaction

No new npm dependency, font or art. Existing Hallmark design and the versions/licenses above are retained. Official Playwright MCP 0.0.83 (Apache-2.0), MCP SDK 1.32.1 (MIT), isolated sandboxed Chrome and Node 24.21.0 were used for verification. Homebrew Node 24.8.0 hosted the existing MCP transport. Existing Gitleaks 8.30.1 (MIT) scans changed text offline.

Installed web-design-guidelines, interface-review, better-accessibility and Emil review-animations were consulted for stable focus, native dialogs, reduced motion and finite event-driven motion. The existing web-interface-guidelines text was fetched into ignored `.work/ui4/` for this round. Reviews and their practical limits are recorded in `artifacts/ui4/REVIEW.md`. No new skill package was installed.

The local `~/.local/bin/unfool` wrapper delegates to this repository's launcher; it adds no dependency, service or billing. Node's HTTP/SSE and SQLite primitives implement the live stream. Existing Motion remains responsible for the finite hallmark strike.

## UI-5 complete installed skill inventory (2026-10-18)

Scope: user Codex skills, codex-kit, agent skill links, repository skill directories and installed plugin skill packages. A content hash identifies local files when an upstream version is not recorded. Installed does not mean used. Unknown provenance/license is explicitly unverified; no license is inferred from a name. System/runtime skills supplied by Codex are listed in the runtime inventory below.

| Skill | Installed location/source | Local SHA256 prefix | License / use evidence |
|---|---|---|---|
| frontend-design | `/Users/jeshwanthsingh/.codex/skills/anthropic-frontend-design` | `d91970639e9f5c37` | See pinned upstream tables above |
| better-accessibility | `/Users/jeshwanthsingh/.codex/skills/better-accessibility` | `df0cafe0e75a0854` | See pinned upstream tables above |
| better-colors | `/Users/jeshwanthsingh/.codex/skills/better-colors` | `e74f1c413a4094dc` | See pinned upstream tables above |
| better-interface | `/Users/jeshwanthsingh/.codex/skills/better-interface` | `23416fef4d08e041` | MIT; installed UI-5 to support interface-review |
| better-typography | `/Users/jeshwanthsingh/.codex/skills/better-typography` | `e60ca6467ba60e68` | See pinned upstream tables above |
| better-ui | `/Users/jeshwanthsingh/.codex/skills/better-ui` | `fb9807bb5c59a3ca` | See pinned upstream tables above |
| break | `/Users/jeshwanthsingh/.codex/skills/break` | `6b231897f10477fe` | See pinned upstream tables above |
| deep-code-review | `/Users/jeshwanthsingh/.codex/skills/deep-code-review` | `595de77d776e8836` | Not recorded locally; use not evidenced by this repository |
| animate | `/Users/jeshwanthsingh/.codex/skills/emil-animate` | `b8ede161270458e6` | MIT; UI-5 motion design/review; prior Emil use recorded above |
| animation-performance | `/Users/jeshwanthsingh/.codex/skills/emil-animation-performance` | `ceb9dd3fe9126158` | MIT; UI-5 motion design/review; prior Emil use recorded above |
| emil-design-eng | `/Users/jeshwanthsingh/.codex/skills/emil-design-eng` | `ffbe68e6007fb42c` | MIT; UI-5 motion design/review; prior Emil use recorded above |
| review-animations | `/Users/jeshwanthsingh/.codex/skills/emil-review-animations` | `6ff590d29e436766` | MIT; UI-5 motion design/review; prior Emil use recorded above |
| impeccable | `/Users/jeshwanthsingh/.codex/skills/impeccable` | `5fb0d412928c03e6` | See pinned upstream tables above |
| interface-review | `/Users/jeshwanthsingh/.codex/skills/interface-review` | `8977988d63d7c17b` | See pinned upstream tables above |
| job-search-os | `/Users/jeshwanthsingh/.codex/skills/job-search-os` | `301ffa262cf21756` | Not recorded locally; use not evidenced by this repository |
| minimalist-ui | `/Users/jeshwanthsingh/.codex/skills/minimalist-ui` | `769ab38eed137bb2` | See pinned upstream tables above |
| "playwright" | `/Users/jeshwanthsingh/.codex/skills/playwright` | `0ffaabcc8e099062` | Not recorded locally; use not evidenced by this repository |
| design-taste-frontend | `/Users/jeshwanthsingh/.codex/skills/taste-skill` | `ee847084e58f5a81` | See pinned upstream tables above |
| baseline-ui | `/Users/jeshwanthsingh/.codex/skills/ui-skills-reviewer` | `fea3322f36d58fda` | See pinned upstream tables above |
| variant | `/Users/jeshwanthsingh/.codex/skills/variant` | `2d8eef43768e01d7` | See pinned upstream tables above |
| verified-job-scout | `/Users/jeshwanthsingh/.codex/skills/verified-job-scout` | `7a27680038e507a5` | Not recorded locally; use not evidenced by this repository |
| web-design-guidelines | `/Users/jeshwanthsingh/.codex/skills/web-design-guidelines` | `f4647ca866a3accf` | See pinned upstream tables above |
| webapp-testing | `/Users/jeshwanthsingh/.codex/skills/webapp-testing` | `51b7349e77ec63b7` | See pinned upstream tables above |
| workflow-orchestration | `/Users/jeshwanthsingh/.codex/skills/workflow-orchestration` | `a5e470040e7960af` | Not recorded locally; use not evidenced by this repository |
| advisor-mode | `/Users/jeshwanthsingh/Projects/codex-kit/skills/advisor-mode` | `8995bb32bd69e23d` | Not recorded locally; use not evidenced by this repository |
| architecture-review | `/Users/jeshwanthsingh/Projects/codex-kit/skills/architecture-review` | `4c570b0dcda24428` | Not recorded locally; use not evidenced by this repository |
| code-review | `/Users/jeshwanthsingh/Projects/codex-kit/skills/code-review` | `e3a036bbf01b7916` | Not recorded locally; use not evidenced by this repository |
| debug-loop | `/Users/jeshwanthsingh/Projects/codex-kit/skills/debug-loop` | `f7d4b71e454f76f2` | Not recorded locally; use not evidenced by this repository |
| graphify | `/Users/jeshwanthsingh/Projects/codex-kit/skills/graphify` | `545bff01c9d140c4` | Not recorded locally; use not evidenced by this repository |
| performance-review | `/Users/jeshwanthsingh/Projects/codex-kit/skills/performance-review` | `857b5e840d5d05ae` | Not recorded locally; use not evidenced by this repository |
| planning | `/Users/jeshwanthsingh/Projects/codex-kit/skills/planning` | `44b01f0b573c3f18` | Not recorded locally; use not evidenced by this repository |
| playwright-cli | `/Users/jeshwanthsingh/Projects/codex-kit/skills/playwright-cli` | `9bba755285a4c9ad` | Not recorded locally; use not evidenced by this repository |
| proof-lab-context | `/Users/jeshwanthsingh/Projects/codex-kit/skills/proof-lab-context` | `0a900304cda143d8` | Not recorded locally; use not evidenced by this repository |
| proof-lab-recall | `/Users/jeshwanthsingh/Projects/codex-kit/skills/proof-lab-recall` | `d1e0139d74f647f1` | Not recorded locally; use not evidenced by this repository |
| qa-test-design | `/Users/jeshwanthsingh/Projects/codex-kit/skills/qa-test-design` | `d814f1ae6666b561` | Not recorded locally; use not evidenced by this repository |
| release-check | `/Users/jeshwanthsingh/Projects/codex-kit/skills/release-check` | `1d634acf8e0b61d1` | Not recorded locally; use not evidenced by this repository |
| security-review | `/Users/jeshwanthsingh/Projects/codex-kit/skills/security-review` | `b58568264e4416c9` | Not recorded locally; use not evidenced by this repository |
| token-discipline | `/Users/jeshwanthsingh/Projects/codex-kit/skills/token-discipline` | `1e5691c77edbb691` | Not recorded locally; use not evidenced by this repository |
| advisor-mode | `/Users/jeshwanthsingh/.agents/skills/advisor-mode` | `8995bb32bd69e23d` | Not recorded locally; use not evidenced by this repository |
| architecture-review | `/Users/jeshwanthsingh/.agents/skills/architecture-review` | `4c570b0dcda24428` | Not recorded locally; use not evidenced by this repository |
| code-review | `/Users/jeshwanthsingh/.agents/skills/code-review` | `e3a036bbf01b7916` | Not recorded locally; use not evidenced by this repository |
| debug-loop | `/Users/jeshwanthsingh/.agents/skills/debug-loop` | `f7d4b71e454f76f2` | Not recorded locally; use not evidenced by this repository |
| graphify | `/Users/jeshwanthsingh/.agents/skills/graphify` | `545bff01c9d140c4` | Not recorded locally; use not evidenced by this repository |
| performance-review | `/Users/jeshwanthsingh/.agents/skills/performance-review` | `857b5e840d5d05ae` | Not recorded locally; use not evidenced by this repository |
| planning | `/Users/jeshwanthsingh/.agents/skills/planning` | `44b01f0b573c3f18` | Not recorded locally; use not evidenced by this repository |
| playwright-cli | `/Users/jeshwanthsingh/.agents/skills/playwright-cli` | `9bba755285a4c9ad` | Not recorded locally; use not evidenced by this repository |
| proof-lab-context | `/Users/jeshwanthsingh/.agents/skills/proof-lab-context` | `0a900304cda143d8` | Not recorded locally; use not evidenced by this repository |
| proof-lab-recall | `/Users/jeshwanthsingh/.agents/skills/proof-lab-recall` | `d1e0139d74f647f1` | Not recorded locally; use not evidenced by this repository |
| qa-test-design | `/Users/jeshwanthsingh/.agents/skills/qa-test-design` | `d814f1ae6666b561` | Not recorded locally; use not evidenced by this repository |
| release-check | `/Users/jeshwanthsingh/.agents/skills/release-check` | `1d634acf8e0b61d1` | Not recorded locally; use not evidenced by this repository |
| security-review | `/Users/jeshwanthsingh/.agents/skills/security-review` | `b58568264e4416c9` | Not recorded locally; use not evidenced by this repository |
| token-discipline | `/Users/jeshwanthsingh/.agents/skills/token-discipline` | `1e5691c77edbb691` | Not recorded locally; use not evidenced by this repository |

Missing requested skills installed: `emil-design-eng` from emilkowalski/skills@2d228630ba1446365f614a108cb8252f1feda202 (MIT); supporting `better-interface` from jakubkrehel/skills@4c66b1fa86e9ab70187b43d7da9b6fdb29f2ef63 (MIT). Other requested skills and Playwright MCP were already present. The three existing Emil skill files were preserved. New skills are discoverable on the next Codex turn; their installed instructions are read directly for this work.

UI-5 use: Emil animate/design-eng chooses finite event-triggered springs; animation-performance checks compositor-only work/idle; review-animations audits three recordings; better-ui handles controls; variant compares live-line density in the existing three styles (no new picker); break checks long filenames/empty streams; interface-review + better-interface and web-design-guidelines review the changed surfaces. User brief wins over skill defaults (instant reduced motion, no redesign or extra variants).

### Repository and supporting tools

| Tool | Version | License | Used rounds |
|---|---|---|---|
| @git-diff-view/core | 0.1.8 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @git-diff-view/react | 0.1.8 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @git-diff-view/shiki | 0.1.8 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @react-three/fiber | 9.8.2 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @simplewebauthn/browser | 13.3.0 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @simplewebauthn/server | 13.3.3 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| motion | 14.3.0 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| pixi.js | 8.22.0 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| react | 19.3.0 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| react-dom | 19.3.0 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| shiki | 4.5.0 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| three | 0.186.1 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| xstate | 5.33.3 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @types/node | 24.19.1 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @types/react | 19.3.0 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @types/react-dom | 19.3.0 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @types/three | 0.186.0 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| @vitejs/plugin-react | 6.1.2 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| typescript | 7.0.2 | Apache-2.0 | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| vite | 8.3.2 | MIT | Installed; UI-5 only uses React, Motion, TypeScript and Vite directly; historical use above |
| Playwright MCP | 0.0.83 | Apache-2.0 | UI-2 through UI-5, screenshot/recording review |
| Instrument Sans | pinned Google Fonts revision above | SIL OFL-1.1 | UI-3 onward |
| Litestream | 0.5.17 | Apache-2.0 | Cleanup; unchanged in UI-5 |
| Python stdlib | system Python | PSF | Inventory and ignored test glue |

Plugin-packaged skills retain their package versions in the installed path. Codex-provided tools (exec/file operations, browser control and collaboration) have no independently published local library license/version; they are host capabilities, not new dependencies. Actual historical invocation cannot be recovered for every installed skill; those entries deliberately say not evidenced.
