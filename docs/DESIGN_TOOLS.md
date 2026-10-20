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

### Codex system and plugin-packaged skill inventory

Source is the installed package path; version is its package directory. Licenses not shipped locally are not guessed. No historical use is claimed without a repository record.

| Skill | Source | Package version / content hash | License | Use in this repository |
|---|---|---|---|---|
| computer-history | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-bundled/computer-history/1.0.1001501/skills/computer-history` | `1.0.1001501` / `7595b819ad985d0d` | Not declared in local package | Not evidenced unless listed in the round records above |
| sites-building | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-bundled/sites/0.1.70/skills/sites-building` | `0.1.70` / `5651e54e471d3040` | Not declared in local package | Not evidenced unless listed in the round records above |
| sites-hosting | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-bundled/sites/0.1.70/skills/sites-hosting` | `0.1.70` / `0d8ce03a009e434d` | Not declared in local package | Not evidenced unless listed in the round records above |
| visualize | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-bundled/visualize/1.0.50/skills/visualize` | `1.0.50` / `766f4e5ee250af9d` | Not declared in local package | Not evidenced unless listed in the round records above |
| ios-app-intents | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/ios-app-intents` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `ee3ea635ba782e99` | Not declared in local package | Not evidenced unless listed in the round records above |
| ios-debugger-agent | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/ios-debugger-agent` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `07000b6744b8cf21` | Not declared in local package | Not evidenced unless listed in the round records above |
| swiftui-liquid-glass | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/swiftui-liquid-glass` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `4894cc1b529a6c38` | Not declared in local package | Not evidenced unless listed in the round records above |
| swiftui-performance-audit | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/swiftui-performance-audit` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `55d9bd46c8c92677` | Not declared in local package | Not evidenced unless listed in the round records above |
| swiftui-ui-patterns | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/swiftui-ui-patterns` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `83099a9386e8cdb8` | Not declared in local package | Not evidenced unless listed in the round records above |
| swiftui-view-refactor | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/swiftui-view-refactor` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `5ed2af6c5d7fd4d4` | Not declared in local package | Not evidenced unless listed in the round records above |
| canva-branded-presentation | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/canva/1ddf5c3f0d9d16a8c152961bbac37d86ed31b0a3/skills/canva-branded-presentation` | `1ddf5c3f0d9d16a8c152961bbac37d86ed31b0a3` / `110b3ba5a50c22e8` | Not declared in local package | Not evidenced unless listed in the round records above |
| canva-resize-for-all-social-media | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/canva/1ddf5c3f0d9d16a8c152961bbac37d86ed31b0a3/skills/canva-resize-for-all-social-media` | `1ddf5c3f0d9d16a8c152961bbac37d86ed31b0a3` / `ca36f9b6cc9e1913` | Not declared in local package | Not evidenced unless listed in the round records above |
| canva-translate-design | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/canva/1ddf5c3f0d9d16a8c152961bbac37d86ed31b0a3/skills/canva-translate-design` | `1ddf5c3f0d9d16a8c152961bbac37d86ed31b0a3` / `950145361d04b508` | Not declared in local package | Not evidenced unless listed in the round records above |
| code-review | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/coderabbit/b7ed91c86dc6604b8217892f05c8866518c82852/skills/coderabbit-review` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `dd6ec53a9e1bd8fe` | Not declared in local package | Not evidenced unless listed in the round records above |
| gh-address-comments | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/github/f09cfd210e21e96a0031f4d247be5f2e416d23b1/skills/gh-address-comments` | `f09cfd210e21e96a0031f4d247be5f2e416d23b1` / `c1ebc337357402f7` | Apache-2.0 | Not evidenced unless listed in the round records above |
| "gh-fix-ci" | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/github/f09cfd210e21e96a0031f4d247be5f2e416d23b1/skills/gh-fix-ci` | `f09cfd210e21e96a0031f4d247be5f2e416d23b1` / `7621a3560d788fb2` | Apache-2.0 | Not evidenced unless listed in the round records above |
| github | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/github/f09cfd210e21e96a0031f4d247be5f2e416d23b1/skills/github` | `f09cfd210e21e96a0031f4d247be5f2e416d23b1` / `81dbdd90934fe86a` | Not declared in local package | Not evidenced unless listed in the round records above |
| "yeet" | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/github/f09cfd210e21e96a0031f4d247be5f2e416d23b1/skills/yeet` | `f09cfd210e21e96a0031f4d247be5f2e416d23b1` / `93a0bcbc834c9b3a` | Apache-2.0 | Not evidenced unless listed in the round records above |
| gmail | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/gmail/bd2122cb/skills/gmail` | `bd2122cb` / `3e8c0052dfd397f6` | Not declared in local package | Not evidenced unless listed in the round records above |
| gmail-inbox-triage | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/gmail/bd2122cb/skills/gmail-inbox-triage` | `bd2122cb` / `1ce1ef20bbe99da3` | Not declared in local package | Not evidenced unless listed in the round records above |
| hf-cli | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/cli` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `ee85209886c4ec3d` | Not declared in local package | Not evidenced unless listed in the round records above |
| huggingface-community-evals | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/community-evals` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `a97f1c703f55b724` | Not declared in local package | Not evidenced unless listed in the round records above |
| huggingface-datasets | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/datasets` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `d882f4e0e6a9d462` | Not declared in local package | Not evidenced unless listed in the round records above |
| huggingface-gradio | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/gradio` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `e2f4c232c38682bc` | Not declared in local package | Not evidenced unless listed in the round records above |
| huggingface-jobs | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/jobs` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `b85252f49569e97a` | Not declared in local package | Not evidenced unless listed in the round records above |
| huggingface-llm-trainer | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/llm-trainer` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `db25c7f1714057a8` | Not declared in local package | Not evidenced unless listed in the round records above |
| huggingface-paper-publisher | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/paper-publisher` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `04b59406cf88054a` | Not declared in local package | Not evidenced unless listed in the round records above |
| huggingface-papers | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/papers` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `985c2d5c7261aba2` | Not declared in local package | Not evidenced unless listed in the round records above |
| huggingface-trackio | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/trackio` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `893ac9695f8677db` | Not declared in local package | Not evidenced unless listed in the round records above |
| transformers-js | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/transformers.js` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `89a70a8a0604fc90` | Not declared in local package | Not evidenced unless listed in the round records above |
| huggingface-vision-trainer | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/vision-trainer` | `b7ed91c86dc6604b8217892f05c8866518c82852` / `c7aba4de75fa6595` | Not declared in local package | Not evidenced unless listed in the round records above |
| higgsfield | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/app-6a3293e129088191abf0875820e839da/2.2.1/skills/higgsfield` | `2.2.1` / `f696cae58184a0d0` | Not declared in local package | Not evidenced unless listed in the round records above |
| website-builder | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/app-6a3293e129088191abf0875820e839da/2.2.1/skills/website-builder` | `2.2.1` / `65e4d748c2256a74` | Not declared in local package | Not evidenced unless listed in the round records above |
| cloud-environment-runtime | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/cloud-environment/0.1.2/skills/runtime` | `0.1.2` / `c23513e361a6f9db` | Not declared in local package | Not evidenced unless listed in the round records above |
| code-review | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/coderabbit/1.1.4/skills/coderabbit-review` | `1.1.4` / `515ef4f096ff4ee9` | Not declared in local package | Not evidenced unless listed in the round records above |
| open-defense-factory | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/defense-factory/0.1.1/skills/open-defense-factory` | `0.1.1` / `fb9781bec62eff3a` | Not declared in local package | Not evidenced unless listed in the round records above |
| google-docs | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-docs` | `0.1.22` / `1c4f8e6477a61d45` | Not declared in local package | Not evidenced unless listed in the round records above |
| google-drive | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-drive` | `0.1.22` / `dabae8a192c861b7` | Not declared in local package | Not evidenced unless listed in the round records above |
| google-drive-comments | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-drive-comments` | `0.1.22` / `a3077375a8f7558b` | Not declared in local package | Not evidenced unless listed in the round records above |
| google-sheets | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-sheets` | `0.1.22` / `1851109d8f2c1822` | Not declared in local package | Not evidenced unless listed in the round records above |
| google-slides | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-slides` | `0.1.22` / `f85bd1d7080becf8` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-analytics-dashboard | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-analytics-dashboard` | `0.1.6` / `cf5360fd8b197673` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-annual-impact-report | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-annual-impact-report` | `0.1.6` / `87790da3a3482179` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-brand-guidelines | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-brand-guidelines` | `0.1.6` / `26a03eb885b8decc` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-business-review | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-business-review` | `0.1.6` / `27721fc1d67d1b41` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-calder-architecture | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-calder-architecture` | `0.1.6` / `5908d609acb0d8ab` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-creative-campaign-brief | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-creative-campaign-brief` | `0.1.6` / `816f799c5e7fe779` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-design-report | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-design-report` | `0.1.6` / `563722f53854e606` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-experiment-analysis | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-experiment-analysis` | `0.1.6` / `0b05effc47df0a14` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-financial-budget | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-financial-budget` | `0.1.6` / `c0b6b7a62a15597a` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-growth-strategy | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-growth-strategy` | `0.1.6` / `fa8e36b197e9e8cc` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-investment-committee-memo | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-investment-committee-memo` | `0.1.6` / `68abd08cfe5e073e` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-legal-memorandum | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-legal-memorandum` | `0.1.6` / `51fb9d21baf6119c` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-market-trends-report | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-market-trends-report` | `0.1.6` / `d58d019b89cb6f29` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-minimal-letterhead | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-minimal-letterhead` | `0.1.6` / `880ef094d4d0c89a` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-next-generation-os | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-next-generation-os` | `0.1.6` / `0baec9efa63b4cc0` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-operating-calendar | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-operating-calendar` | `0.1.6` / `33bb660791a0b9a2` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-photography-portfolio | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-photography-portfolio` | `0.1.6` / `5819efedf97c99ee` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-product-pitch | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-product-pitch` | `0.1.6` / `e4991bd400a9a9ac` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-product-strategy | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-product-strategy` | `0.1.6` / `946355cbc7e62f31` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-project-kickoff | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-project-kickoff` | `0.1.6` / `aa893ebd89e7c8d1` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-project-tracker | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-project-tracker` | `0.1.6` / `d97d5be20189b7f5` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-sales-pipeline | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-sales-pipeline` | `0.1.6` / `15cfeeedf440021f` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-state-of-art | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-state-of-art` | `0.1.6` / `ab2ad2557bd65327` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-strategy-memorandum | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-strategy-memorandum` | `0.1.6` / `51d7882ac94e8e57` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-system-design | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-system-design` | `0.1.6` / `87f7b7ed1b0d8410` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-three-statement-forecast | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-three-statement-forecast` | `0.1.6` / `74f4a5cccec0107b` | Not declared in local package | Not evidenced unless listed in the round records above |
| artifact-template-weekly-business-review | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-weekly-business-review` | `0.1.6` / `b925626f9b4918ee` | Not declared in local package | Not evidenced unless listed in the round records above |
| maintain-space | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/pages/0.1.23/skills/maintain-space` | `0.1.23` / `53570e6cb8663d37` | Not declared in local package | Not evidenced unless listed in the round records above |
| manage-schedules | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/pages/0.1.23/skills/manage-schedules` | `0.1.23` / `e0a464a83f15a6e8` | Not declared in local package | Not evidenced unless listed in the round records above |
| organize-space | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/pages/0.1.23/skills/organize-space` | `0.1.23` / `dfa8bfae86785a98` | Not declared in local package | Not evidenced unless listed in the round records above |
| write-page | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/pages/0.1.23/skills/write-page` | `0.1.23` / `7a997ccee8cc3214` | Not declared in local package | Not evidenced unless listed in the round records above |
| plugin-management | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/plugin-management/0.1.0/skills/plugin-management` | `0.1.0` / `653841cc21205269` | Not declared in local package | Not evidenced unless listed in the round records above |
| sites | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/sites/1.0.2-remix-a.1/skills/sites` | `1.0.2-remix-a.1` / `9e9b6665592a539a` | Not declared in local package | Not evidenced unless listed in the round records above |
| brainstorming | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/brainstorming` | `6.4.2` / `a32d2255354775aa` | MIT | Not evidenced unless listed in the round records above |
| diagnosing-superpowers | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/diagnosing-superpowers` | `6.4.2` / `5a652f8132cc901e` | MIT | Not evidenced unless listed in the round records above |
| dispatching-parallel-agents | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/dispatching-parallel-agents` | `6.4.2` / `1968923066f3b707` | MIT | Not evidenced unless listed in the round records above |
| executing-plans | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/executing-plans` | `6.4.2` / `f38e8f2ddcf079f6` | MIT | Not evidenced unless listed in the round records above |
| finishing-a-development-branch | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/finishing-a-development-branch` | `6.4.2` / `8db5a922b242dd4e` | MIT | Not evidenced unless listed in the round records above |
| receiving-code-review | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/receiving-code-review` | `6.4.2` / `091df1629510af1b` | MIT | Not evidenced unless listed in the round records above |
| requesting-code-review | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/requesting-code-review` | `6.4.2` / `cfcee1b06774e7c0` | MIT | Not evidenced unless listed in the round records above |
| subagent-driven-development | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/subagent-driven-development` | `6.4.2` / `8dde5589ee083fb4` | MIT | Not evidenced unless listed in the round records above |
| systematic-debugging | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/systematic-debugging` | `6.4.2` / `808fc5717aa88ad6` | MIT | Not evidenced unless listed in the round records above |
| test-driven-development | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/test-driven-development` | `6.4.2` / `64b03fce4aee5a97` | MIT | Not evidenced unless listed in the round records above |
| using-git-worktrees | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/using-git-worktrees` | `6.4.2` / `8cfb86f121269e8f` | MIT | Not evidenced unless listed in the round records above |
| using-superpowers | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/using-superpowers` | `6.4.2` / `82c5c8866ad7f5dd` | MIT | Not evidenced unless listed in the round records above |
| verification-before-completion | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/verification-before-completion` | `6.4.2` / `2befe7fc55bcadaa` | MIT | Not evidenced unless listed in the round records above |
| writing-plans | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/writing-plans` | `6.4.2` / `a6c67c1900064347` | MIT | Not evidenced unless listed in the round records above |
| writing-skills | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/writing-skills` | `6.4.2` / `bbdfe742f853562e` | MIT | Not evidenced unless listed in the round records above |
| create-pet | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet` | `0.1.6` / `841354fb8116f8fd` | Not declared in local package | Not evidenced unless listed in the round records above |
| pets | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/pets` | `0.1.6` / `1bf5d45fd6a6390a` | Not declared in local package | Not evidenced unless listed in the round records above |
| update-pet | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/update-pet` | `0.1.6` / `c63c98d67b6ad781` | Not declared in local package | Not evidenced unless listed in the round records above |
| write-like-me | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/write-like-me/0.1.1/skills/write-like-me` | `0.1.1` / `ae77e51569f882af` | Not declared in local package | Not evidenced unless listed in the round records above |
| documents | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/documents/26.1017.11052/skills/documents` | `26.1017.11052` / `c9b9ba61ac15f20a` | See /Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/documents/26.1017.11052/skills/documents/LICENSE.txt | Not evidenced unless listed in the round records above |
| "pdf" | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/pdf/26.1017.11052/skills/pdf` | `26.1017.11052` / `a6e20f4ae66364a0` | Not declared in local package | Not evidenced unless listed in the round records above |
| Presentations | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.11052/skills/presentations` | `26.1017.11052` / `bbc129458b6eb0dc` | Not declared in local package | Not evidenced unless listed in the round records above |
| "excel-live-control" | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/spreadsheets/26.1017.11052/skills/excel-live-control` | `26.1017.11052` / `1c27488fa2a59ce2` | Not declared in local package | Not evidenced unless listed in the round records above |
| "Spreadsheets" | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/spreadsheets/26.1017.11052/skills/spreadsheets` | `26.1017.11052` / `25da47cec10100f2` | Not declared in local package | Not evidenced unless listed in the round records above |
| template-creator | `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/template-creator/26.1017.11052/skills/template-creator` | `26.1017.11052` / `f1d14fd2847a2e87` | Not declared in local package | Not evidenced unless listed in the round records above |
| "imagegen" | `/Users/jeshwanthsingh/.codex/skills/.system/imagegen` | `host-provided` / `681ddb4ad6d06a2a` | Apache-2.0 | Not evidenced unless listed in the round records above |
| "openai-docs" | `/Users/jeshwanthsingh/.codex/skills/.system/openai-docs` | `host-provided` / `aa6829e21df22231` | Apache-2.0 | Not evidenced unless listed in the round records above |
| review-agent | `/Users/jeshwanthsingh/.codex/skills/.system/review-agent` | `host-provided` / `07079efd0dc76f05` | Not declared in local package | Not evidenced unless listed in the round records above |
| skill-creator | `/Users/jeshwanthsingh/.codex/skills/.system/skill-creator` | `host-provided` / `6656e54755638e8e` | Apache-2.0 | Not evidenced unless listed in the round records above |
| skill-installer | `/Users/jeshwanthsingh/.codex/skills/.system/skill-installer` | `host-provided` / `d68b77e5bbb34ded` | Apache-2.0 | Not evidenced unless listed in the round records above |

### Existing offline quality-tool installation

These remain unchanged; source/download and checksum provenance is in `artifacts/quality-gates/TOOLS.json`. Round B installed/used them; UI-5 executes the regression suite and reuses Gitleaks for the credential audit.

| Tool | Installed version | License |
|---|---|---|
| ruff | 0.17.1 | MIT |
| pyright | 1.1.414 | MIT |
| bandit | 1.9.4 | Apache-2.0 |
| detect-secrets | 1.5.0 | Apache-2.0 |
| oxlint | 1.88.0 | MIT |
| @ast-grep/cli | 0.51.0 | MIT |
| eslint | 10.13.0 | MIT |
| typescript-eslint | 8.71.2 | MIT |
| typescript | 6.0.3 | Apache-2.0 |
| opengrep | 1.31.0 | LGPL-2.1 |
| gitleaks | 8.30.1 | MIT |
| osv-scanner | 2.7.0 | Apache-2.0 |

UI-5 recording post-processing uses the existing Homebrew FFmpeg 8.0 (GPL-3.0-or-later build: --enable-gpl, --enable-version3), source https://ffmpeg.org/. No FFmpeg library is bundled into the application. It extracts contact sheets and trims clearly labelled historical review clips.

UI-5 local verification helpers (not bundled): Node 24.21.0 (MIT), Python 3.14.4 (PSF), Git 2.51.0 (GPL-2.0), RTK 0.37.2 (Apache-2.0; official rtk-ai/rtk v0.37.2), installed Codex CLI 0.160.0 (Apache-2.0). Codex model/runtime configuration was not changed. FFmpeg edits both explicitly labelled recorded-event reviews and genuine live-run clips; it never fabricates task events.

## UI-5b skill safety

NVIDIA SkillSpector 2.12.0, official source https://github.com/NVIDIA/SkillSpector at `95a52d89fa16f608f0b18ccee76b0918ea4b7eef`, Apache-2.0. Installed only in ignored `.work/skill-tools/venv` with existing Python 3.13.0 (PSF). Static `--no-llm`, credential-free environment, network denied; OSV offline fallback accepted, so live vulnerability data is unavailable. No AI provider/account/billing was configured. Upstream dependencies include optional-capability AI SDKs, but no inference is requested or permitted by the scan environment. Exact installed package versions/licenses and per-skill results are in `artifacts/ui5b/`.

Quarantine keeps original files. Installed Codex 0.160.0 required exact `SKILL.md` enablement overrides: folder-only overrides documented by newer Codex did not disable two loaded plugin skills. This difference was observed via `skills/list`; exact-file overrides returned `enabled: false`. Inactive cached skills are listed separately from loaded catalog entries. Restart Codex to refresh a previously loaded skill catalog.


## UI-6 polish

New requested skill: jakubkrehel/make-interfaces-feel-better, MIT, official main snapshot, content SHA256 7624b549f04b3f7d464a1f76a82ed8bc15499543881d86eba69693cdc444c689. SkillSpector 2.12.0 scanned it before loading/installing, --no-llm, network denied, OSV offline fallback: score 0/100 LOW, recommendation CAUTION. Immutable report hash a3fcea4d488cef57f41d0abbce218e4e28c295fe1f069a21d2358abe22aff747. Installed using CC's scanned-content helper. Static result is not a safety guarantee. Available to future Codex turns after installation. Taste and Impeccable remain disabled, as explicitly directed. No app dependency/font/art change. Existing frontend-design, Jakub better-* skills, Emil skills, web-design-guidelines, Playwright MCP 0.0.83 (Apache-2.0) / MCP SDK 1.32.1 (MIT) retained; versions/licenses above.

UI-6 source/verification links: [make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better), [MIT license](https://raw.githubusercontent.com/jakubkrehel/make-interfaces-feel-better/main/LICENSE). New skill content hash and scanner report are recorded above. The three review passes and four same-data comparisons are in artifacts/ui6/. Read-only visual comparisons use the existing Vite build and official MCP; no extra app framework, font or art pack.

UI-7 reuses the UI-6 pinned approved skills and tools, unchanged: official Playwright MCP 0.0.83 (Apache-2.0), MCP SDK 1.32.1 (MIT), Motion 14.3.0 (MIT), Instrument Sans (OFL). No new dependency or art. Taste and Impeccable remain quarantined. Original seal SVGs are project-authored.

UI-7b reuses the same approved frontend-design, Jakub UI/typography/accessibility and make-interfaces-feel-better, Emil design/motion review, and web-design-guidelines skills. Playwright MCP 0.0.83 (Apache-2.0) performs the actual screenshot/audit loop, MCP SDK 1.32.1 (MIT); Instrument Sans (OFL), existing React/Motion and Node tooling are unchanged. No new app dependencies, fonts, art or skills. Taste and Impeccable remain quarantined. Three explicitly requested fresh read-only AI viewers received only the unlabelled seal sheet, not its intended meanings. Their literal observations and resulting refinements are in artifacts/ui7b/viewer-review.md. This is not a human usability study.


## PHONE-1

Pinned app additions: qrcode-generator 2.0.4 (MIT), web-push 3.6.7 (MPL-2.0). Full resolved versions, licenses and integrities: artifacts/phone1/dependencies.json. Existing OSV-Scanner 2.7.0 checked their lockfile offline against its pre-downloaded npm database: no known vulnerabilities in that snapshot. No package registry access during protected checks.

Existing SimpleWebAuthn 13.3.3 (MIT), React, Instrument Sans (OFL), Node 24.21.0 (MIT), and original seal artwork retained. Official Playwright MCP 0.0.83 (Apache-2.0), MCP SDK 1.32.1 (MIT), Playwright's pinned WebKit build 2368 / WebKit 26.6 perform iPhone-profile screenshots and interaction checks. Browser-specific component licenses remain in the installed browser distribution; WebKit uses LGPL/BSD licenses. Test-only biometric substitutes are confined to an ignored isolated TEST build.

Official Tailscale macOS 1.104.1 installer, downloaded from pkgs.tailscale.com, verified against its published SHA256, Apple notarization and Developer ID Installer signature. Tailscale client source is BSD-3-Clause; the official macOS GUI distribution is vendor software, not represented here as wholly BSD licensed. Installation, VPN approval and account login were completed by Jesh. No Funnel or billing enabled.


## OFFICE-1

No dependencies installed. Existing PixiJS 8.22.0 (MIT), Motion 14.3.0 (MIT), React 19.3.0 (MIT) and Instrument Sans (OFL) retained. Kenney Prototype Pack 2.3 crate_E.png is reused under CC0, with its existing public/workshop/License.txt. The room and characters are original vector primitives; no Munder, LimeZu or TV-show assets/code/layout. Official Playwright MCP 0.0.83 (Apache-2.0), MCP SDK 1.32.1 (MIT), isolated Chrome contexts perform screenshots, native reduced-motion and request/frame audits, and native context video recording. Existing FFmpeg extracts a contact sheet; it does not generate events or animation frames.

Approved frontend-design and Emil animate/review-animations guidance applied to the room/motion plan and screenshot refinements; webapp-testing used for interaction verification. Taste/Impeccable quarantine unchanged. No skill installation or permissions change. The live backend/approval/checker code remains unchanged; the demo uses an isolated read-only snapshot of a real ticket, not a newly run agent.

## OFFICE-2

No runtime dependencies added. Existing PixiJS 8.22.0 (MIT), React 19.3.0 (MIT), Instrument Sans (OFL), Playwright MCP 0.0.83 (Apache-2.0), bundled Playwright 1.64.0-alpha-1790635538000 (Apache-2.0), MCP SDK 1.32.1 (MIT), FFmpeg 8.0 (existing GPL-3.0-or-later build), local Pillow 11.3.0 (HPND). Original 32px sprite atlas/room/source are CC0-1.0 with LICENSE.txt beside assets; no external art copied.

Official find-skills from vercel-labs/skills used for discovery; exact search results in artifacts/office2. Official pixijs/pixijs-skills MIT snapshot 83760c6f53462ca9cecd68055041f5a8c94758ce: 26 SkillSpector 2.12.0 static/offline scans (Apache-2.0), 25 CAUTION, pixijs-scene-text DO_NOT_INSTALL; all skipped, none activated. Existing approved Emil and make-interfaces-feel-better used; Taste/Impeccable quarantine unchanged. References are look/read only, exact URLs and screenshots in artifacts/office2/refs.
