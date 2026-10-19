# SkillSpector audit — every discovered installed skill

147 unique skill folders; 161 discovery paths, deduplicated by canonical folder. User, agent links, Codex-kit, system and plugin caches were inspected; absent repo skill folders contained no extra skills. Linked collections were checked separately: zero additional unique folders.

SkillSpector 2.12.0, official NVIDIA commit 95a52d89fa16f608f0b18ccee76b0918ea4b7eef, Apache-2.0. `--no-llm`; scrubbed credentials; enforced network denial; OSV offline fallback. No AI calls or keys. Static scores are warnings, not proof of malice or safety. 0 does not mean fully audited. Cached and loaded skills are distinguished by quarantine-protocol.json.

Results: SAFE: 66, DO_NOT_INSTALL: 21, CAUTION: 60. All 147 produced reports; zero scanner errors.

All 21 DO_NOT_INSTALL skills are disabled through exact-file Codex overrides; original files retained. Twelve were present in the installed CLI catalog and all twelve returned enabled=false. Nine are inactive cached entries, with overrides ready if loaded. Restart the desktop app to refresh its loaded catalog. Model/runtime settings were not changed.

| Skill / source | Score | Scanner advice | Plain findings |
|---|---:|---|---|
| computer-history — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-bundled/computer-history/1.0.1001501/skills/computer-history` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| sites-building — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-bundled/sites/0.1.70/skills/sites-building` | 100 | Disabled; do not install | Generated text may be used as executable input (1); Instructions can run powerful tools (2); MCP Least Privilege (1); Actions may happen without enough user review (3); Downloads or dependencies need review (20) |
| sites-hosting — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-bundled/sites/0.1.70/skills/sites-hosting` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| visualize — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-bundled/visualize/1.0.50/skills/visualize` | 56 | Disabled; do not install | analysis-evasion (3); MCP Least Privilege (1); Rogue Agent (1) |
| browse-collections — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/app-68de829bf7648191acd70a907364c67c/4.3.0/skills/browse-collections` | 12 | safe | Memory Poisoning (2) |
| build-playlists — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/app-68de829bf7648191acd70a907364c67c/4.3.0/skills/build-playlists` | 8 | caution | Memory Poisoning (1) |
| manage-library — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/app-68de829bf7648191acd70a907364c67c/4.3.0/skills/manage-library` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| now-playing — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/app-68de829bf7648191acd70a907364c67c/4.3.0/skills/now-playing` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| search-spotify — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/app-68de829bf7648191acd70a907364c67c/4.3.0/skills/search-spotify` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| higgsfield — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/app-6a3293e129088191abf0875820e839da/2.2.1/skills/higgsfield` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| website-builder — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/app-6a3293e129088191abf0875820e839da/2.2.1/skills/website-builder` | 100 | Disabled; do not install | analysis-evasion (5); Internal instructions may be exposed (4); Memory Poisoning (1); Instructions can run powerful tools (1); Server-Side Request Forgery (2); Generated text may be used as executable input (4); Actions may happen without enough user review (7); Instructions may override other rules (18); Data may be sent outside the machine (1) |
| cloud-environment-runtime — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/cloud-environment/0.1.2/skills/runtime` | 100 | Disabled; do not install | Instructions request broader access (3); Instructions can run powerful tools (1); Downloads or dependencies need review (1); MCP Least Privilege (1); Rogue Agent (1); MCP Rug Pull (1); Data may be sent outside the machine (1); Actions may happen without enough user review (1) |
| code-review — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/coderabbit/1.1.4/skills/coderabbit-review` | 40 | caution | Downloads or dependencies need review (1); Instructions can run powerful tools (1) |
| open-defense-factory — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/defense-factory/0.1.1/skills/open-defense-factory` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| google-docs — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-docs` | 44 | caution | analysis-evasion (2); MCP Least Privilege (1) |
| google-drive — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-drive` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| google-drive-comments — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-drive-comments` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| google-sheets — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-sheets` | 21 | caution | Internal instructions may be exposed (1) |
| google-slides — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/google-drive/0.1.22/skills/google-slides` | 28 | caution | Internal instructions may be exposed (1); MCP Least Privilege (1) |
| artifact-template-analytics-dashboard — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-analytics-dashboard` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-annual-impact-report — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-annual-impact-report` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-brand-guidelines — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-brand-guidelines` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-business-review — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-business-review` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-calder-architecture — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-calder-architecture` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-creative-campaign-brief — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-creative-campaign-brief` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-design-report — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-design-report` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-experiment-analysis — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-experiment-analysis` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-financial-budget — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-financial-budget` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-growth-strategy — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-growth-strategy` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-investment-committee-memo — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-investment-committee-memo` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-legal-memorandum — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-legal-memorandum` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-market-trends-report — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-market-trends-report` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-minimal-letterhead — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-minimal-letterhead` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-next-generation-os — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-next-generation-os` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-operating-calendar — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-operating-calendar` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-photography-portfolio — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-photography-portfolio` | 18 | safe | YARA Match (1) |
| artifact-template-product-pitch — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-product-pitch` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-product-strategy — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-product-strategy` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-project-kickoff — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-project-kickoff` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-project-tracker — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-project-tracker` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-sales-pipeline — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-sales-pipeline` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-state-of-art — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-state-of-art` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-strategy-memorandum — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-strategy-memorandum` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-system-design — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-system-design` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-three-statement-forecast — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-three-statement-forecast` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| artifact-template-weekly-business-review — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.6/skills/artifact-template-weekly-business-review` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| maintain-space — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/pages/0.1.23/skills/maintain-space` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| manage-schedules — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/pages/0.1.23/skills/manage-schedules` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| organize-space — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/pages/0.1.23/skills/organize-space` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| write-page — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/pages/0.1.23/skills/write-page` | 20 | safe | Anti-Refusal (1) |
| plugin-management — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/plugin-management/0.1.0/skills/plugin-management` | 11 | safe | Actions may happen without enough user review (2) |
| sites — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/sites/1.0.2-remix-a.1/skills/sites` | 100 | Disabled; do not install | Anti-Refusal (1); Instructions request broader access (1); Generated text may be used as executable input (1); Instructions can run powerful tools (2); MCP Least Privilege (1); Actions may happen without enough user review (4); Downloads or dependencies need review (20) |
| brainstorming — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/brainstorming` | 52 | Disabled; do not install | Instructions can run powerful tools (1); MCP Least Privilege (1); Rogue Agent (6) |
| diagnosing-superpowers — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/diagnosing-superpowers` | 26 | caution | Anti-Refusal (1); Data may be sent outside the machine (1) |
| dispatching-parallel-agents — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/dispatching-parallel-agents` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| executing-plans — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/executing-plans` | 17 | caution | Instructions can run powerful tools (1) |
| finishing-a-development-branch — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/finishing-a-development-branch` | 17 | caution | Instructions can run powerful tools (1) |
| receiving-code-review — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/receiving-code-review` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| requesting-code-review — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/requesting-code-review` | 7 | caution | Actions may happen without enough user review (1) |
| subagent-driven-development — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/subagent-driven-development` | 17 | caution | Instructions can run powerful tools (1) |
| systematic-debugging — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/systematic-debugging` | 77 | Disabled; do not install | Instructions request broader access (2); analysis-evasion (1); Data may be sent outside the machine (1); Actions may happen without enough user review (1) |
| test-driven-development — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/test-driven-development` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| using-git-worktrees — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/using-git-worktrees` | 11 | caution | Actions may happen without enough user review (2) |
| using-superpowers — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/using-superpowers` | 49 | caution | Agent Snooping (2); Actions may happen without enough user review (1); Memory Poisoning (1) |
| verification-before-completion — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/verification-before-completion` | 7 | safe | Actions may happen without enough user review (1) |
| writing-plans — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/writing-plans` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| writing-skills — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/writing-skills` | 100 | Disabled; do not install | Rogue Agent (9); analysis-evasion (4); Agent Snooping (8) |
| create-pet — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet` | 36 | caution | Data may be sent outside the machine (1); MCP Least Privilege (1); Generated text may be used as executable input (1) |
| pets — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/pets` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| update-pet — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/update-pet` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| write-like-me — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated-remote/write-like-me/0.1.1/skills/write-like-me` | 4 | safe | Instructions request broader access (1) |
| ios-app-intents — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/ios-app-intents` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| ios-debugger-agent — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/ios-debugger-agent` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| swiftui-liquid-glass — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/swiftui-liquid-glass` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| swiftui-performance-audit — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/swiftui-performance-audit` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| swiftui-ui-patterns — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/swiftui-ui-patterns` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| swiftui-view-refactor — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/build-ios-apps/b7ed91c86dc6604b8217892f05c8866518c82852/skills/swiftui-view-refactor` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| canva-branded-presentation — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/canva/1ddf5c3f0d9d16a8c152961bbac37d86ed31b0a3/skills/canva-branded-presentation` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| canva-resize-for-all-social-media — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/canva/1ddf5c3f0d9d16a8c152961bbac37d86ed31b0a3/skills/canva-resize-for-all-social-media` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| canva-translate-design — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/canva/1ddf5c3f0d9d16a8c152961bbac37d86ed31b0a3/skills/canva-translate-design` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| code-review — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/coderabbit/b7ed91c86dc6604b8217892f05c8866518c82852/skills/coderabbit-review` | 40 | caution | Downloads or dependencies need review (1); Instructions can run powerful tools (1) |
| gh-address-comments — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/github/f09cfd210e21e96a0031f4d247be5f2e416d23b1/skills/gh-address-comments` | 16 | safe | MCP Least Privilege (1); Dangerous Code Execution (1) |
| gh-fix-ci — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/github/f09cfd210e21e96a0031f4d247be5f2e416d23b1/skills/gh-fix-ci` | 22 | caution | MCP Least Privilege (1); Dangerous Code Execution (3) |
| github — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/github/f09cfd210e21e96a0031f4d247be5f2e416d23b1/skills/github` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| yeet — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/github/f09cfd210e21e96a0031f4d247be5f2e416d23b1/skills/yeet` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| gmail — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/gmail/bd2122cb/skills/gmail` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| gmail-inbox-triage — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/gmail/bd2122cb/skills/gmail-inbox-triage` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| hf-cli — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/cli` | 70 | Disabled; do not install | Downloads or dependencies need review (1); Instructions request broader access (3); Instructions can run powerful tools (1) |
| huggingface-community-evals — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/community-evals` | 40 | caution | Data may be sent outside the machine (1); MCP Least Privilege (1); Dangerous Code Execution (5) |
| huggingface-datasets — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/datasets` | 12 | caution | MCP Rug Pull (5) |
| huggingface-gradio — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/gradio` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| huggingface-jobs — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/jobs` | 67 | Disabled; do not install | MCP Least Privilege (1); Rogue Agent (1); Actions may happen without enough user review (3); Data may be sent outside the machine (15); Instructions request broader access (4) |
| huggingface-llm-trainer — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/llm-trainer` | 100 | Disabled; do not install | analysis-evasion (2); Instructions can run powerful tools (3); MCP Least Privilege (1); Generated text may be used as executable input (1); MCP Rug Pull (1); Instructions request broader access (11); Dangerous Code Execution (4); Data Flow (1); Data may be sent outside the machine (3) |
| huggingface-paper-publisher — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/paper-publisher` | 50 | caution | Instructions request broader access (5); MCP Least Privilege (1); Data may be sent outside the machine (1); analysis-evasion (1) |
| huggingface-papers — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/papers` | 6 | caution | Data may be sent outside the machine (1) |
| huggingface-trackio — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/trackio` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| transformers-js — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/transformers.js` | 43 | caution | analysis-evasion (7) |
| huggingface-vision-trainer — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-curated/hugging-face/b7ed91c86dc6604b8217892f05c8866518c82852/skills/vision-trainer` | 7 | caution | MCP Least Privilege (1) |
| documents — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/documents/26.1017.11052/skills/documents` | 80 | Disabled; do not install | Internal instructions may be exposed (2); Data may be sent outside the machine (1); MCP Least Privilege (1); Dangerous Code Execution (4) |
| pdf — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/pdf/26.1017.11052/skills/pdf` | 28 | caution | Internal instructions may be exposed (1); Instructions request broader access (1) |
| Presentations — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/presentations/26.1017.11052/skills/presentations` | 100 | Disabled; do not install | analysis-evasion (2); Internal instructions may be exposed (1); Downloads or dependencies need review (3); MCP Least Privilege (1); Dangerous Code Execution (4); Actions may happen without enough user review (1) |
| excel-live-control — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/spreadsheets/26.1017.11052/skills/excel-live-control` | 11 | caution | Actions may happen without enough user review (2) |
| Spreadsheets — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/spreadsheets/26.1017.11052/skills/spreadsheets` | 53 | Disabled; do not install | analysis-evasion (1); Internal instructions may be exposed (1); Actions may happen without enough user review (1) |
| template-creator — `/Users/jeshwanthsingh/.codex/plugins/cache/openai-primary-runtime/template-creator/26.1017.11052/skills/template-creator` | 99 | Disabled; do not install | analysis-evasion (5); Instructions request broader access (4); MCP Least Privilege (1); Trigger Abuse (1) |
| imagegen — `/Users/jeshwanthsingh/.codex/skills/.system/imagegen` | 100 | Disabled; do not install | Instructions can run powerful tools (1); Agent Snooping (1); Internal instructions may be exposed (2); MCP Least Privilege (1); Actions may happen without enough user review (2); Dangerous Code Execution (1) |
| openai-docs — `/Users/jeshwanthsingh/.codex/skills/.system/openai-docs` | 7 | caution | MCP Least Privilege (1) |
| review-agent — `/Users/jeshwanthsingh/.codex/skills/.system/review-agent` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| skill-creator — `/Users/jeshwanthsingh/.codex/skills/.system/skill-creator` | 45 | caution | Rogue Agent (2); MCP Least Privilege (1); Data may be sent outside the machine (1) |
| skill-installer — `/Users/jeshwanthsingh/.codex/skills/.system/skill-installer` | 23 | caution | MCP Least Privilege (1); Data may be sent outside the machine (1); Dangerous Code Execution (1) |
| frontend-design — `/Users/jeshwanthsingh/.codex/skills/anthropic-frontend-design` | 13 | safe | Anti-Refusal (1) |
| better-accessibility — `/Users/jeshwanthsingh/.codex/skills/better-accessibility` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| better-colors — `/Users/jeshwanthsingh/.codex/skills/better-colors` | 8 | caution | analysis-evasion (1) |
| better-interface — `/Users/jeshwanthsingh/.codex/skills/better-interface` | 7 | caution | Actions may happen without enough user review (1) |
| better-typography — `/Users/jeshwanthsingh/.codex/skills/better-typography` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| better-ui — `/Users/jeshwanthsingh/.codex/skills/better-ui` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| break — `/Users/jeshwanthsingh/.codex/skills/break` | 6 | safe | Generated text may be used as executable input (1) |
| deep-code-review — `/Users/jeshwanthsingh/.codex/skills/deep-code-review` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| animate — `/Users/jeshwanthsingh/.codex/skills/emil-animate` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| animation-performance — `/Users/jeshwanthsingh/.codex/skills/emil-animation-performance` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| emil-design-eng — `/Users/jeshwanthsingh/.codex/skills/emil-design-eng` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| review-animations — `/Users/jeshwanthsingh/.codex/skills/emil-review-animations` | 43 | caution | analysis-evasion (3) |
| impeccable — `/Users/jeshwanthsingh/.codex/skills/impeccable` | 100 | Disabled; do not install | analysis-evasion (3); Anti-Refusal (4); Memory Poisoning (3); Agent Snooping (2); MCP Least Privilege (1); Actions may happen without enough user review (23); MCP Rug Pull (1); Server-Side Request Forgery (12); Data may be sent outside the machine (2) |
| interface-review — `/Users/jeshwanthsingh/.codex/skills/interface-review` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| job-search-os — `/Users/jeshwanthsingh/.codex/skills/job-search-os` | 100 | Disabled; do not install | YARA Match (1); analysis-evasion (2); Downloads or dependencies need review (94); MCP Least Privilege (1); Actions may happen without enough user review (1); Data may be sent outside the machine (5); Dangerous Code Execution (1) |
| minimalist-ui — `/Users/jeshwanthsingh/.codex/skills/minimalist-ui` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| playwright — `/Users/jeshwanthsingh/.codex/skills/playwright` | 21 | caution | Agent Snooping (1); MCP Rug Pull (3) |
| design-taste-frontend — `/Users/jeshwanthsingh/.codex/skills/taste-skill` | 100 | Disabled; do not install | analysis-evasion (15); Instructions can run powerful tools (3); Instructions request broader access (3); MCP Least Privilege (1); Data may be sent outside the machine (52); Actions may happen without enough user review (1) |
| baseline-ui — `/Users/jeshwanthsingh/.codex/skills/ui-skills-reviewer` | 3 | safe | Actions may happen without enough user review (1) |
| variant — `/Users/jeshwanthsingh/.codex/skills/variant` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| verified-job-scout — `/Users/jeshwanthsingh/.codex/skills/verified-job-scout` | 7 | safe | MCP Least Privilege (1) |
| web-design-guidelines — `/Users/jeshwanthsingh/.codex/skills/web-design-guidelines` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| webapp-testing — `/Users/jeshwanthsingh/.codex/skills/webapp-testing` | 49 | caution | Instructions can run powerful tools (1); MCP Least Privilege (1); Dangerous Code Execution (2) |
| workflow-orchestration — `/Users/jeshwanthsingh/.codex/skills/workflow-orchestration` | 11 | caution | Actions may happen without enough user review (2) |
| advisor-mode — `/Users/jeshwanthsingh/Projects/codex-kit/skills/advisor-mode` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| architecture-review — `/Users/jeshwanthsingh/Projects/codex-kit/skills/architecture-review` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| code-review — `/Users/jeshwanthsingh/Projects/codex-kit/skills/code-review` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| debug-loop — `/Users/jeshwanthsingh/Projects/codex-kit/skills/debug-loop` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| graphify — `/Users/jeshwanthsingh/Projects/codex-kit/skills/graphify` | 75 | Disabled; do not install | Agent Snooping (1); Instructions can run powerful tools (1); Anti-Refusal (1); Actions may happen without enough user review (2) |
| performance-review — `/Users/jeshwanthsingh/Projects/codex-kit/skills/performance-review` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| planning — `/Users/jeshwanthsingh/Projects/codex-kit/skills/planning` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| playwright-cli — `/Users/jeshwanthsingh/Projects/codex-kit/skills/playwright-cli` | 80 | Disabled; do not install | analysis-evasion (2); Memory Poisoning (1); MCP Rug Pull (14); Data may be sent outside the machine (1); Rogue Agent (1) |
| proof-lab-context — `/Users/jeshwanthsingh/Projects/codex-kit/skills/proof-lab-context` | 7 | safe | Actions may happen without enough user review (1) |
| proof-lab-recall — `/Users/jeshwanthsingh/Projects/codex-kit/skills/proof-lab-recall` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |
| qa-test-design — `/Users/jeshwanthsingh/Projects/codex-kit/skills/qa-test-design` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| release-check — `/Users/jeshwanthsingh/Projects/codex-kit/skills/release-check` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| security-review — `/Users/jeshwanthsingh/Projects/codex-kit/skills/security-review` | 0 | safe | No static pattern found; live OSV and semantic analysis not performed. |
| token-discipline — `/Users/jeshwanthsingh/Projects/codex-kit/skills/token-discipline` | 0 | caution | No static pattern found; live OSV and semantic analysis not performed. |

## Exact findings

Rule names and locations below come from the scanner. Code snippets, keys and full skill instructions are not included.

### sites-building (4b33aab091d2d836)
- OH1: Unvalidated Output Injection; HIGH; {'file': 'templates/vinext-starter/components/ui/chart.tsx', 'start_line': 97, 'end_line': None, 'start_column': 6}
- TM1: Tool Parameter Abuse; HIGH; {'file': 'templates/vinext-starter/scripts/install-ci.sh', 'start_line': 42, 'end_line': None, 'start_column': 0}
- TM2: Chaining Abuse; HIGH; {'file': 'templates/vinext-starter/scripts/install-pnpm.sh', 'start_line': 173, 'end_line': None, 'start_column': 50}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 37, 'end_line': None, 'start_column': 205}
- EA3: Scope Creep; LOW; {'file': 'templates/vinext-starter/build/sites-vite-plugin.LICENSE', 'start_line': 16, 'end_line': None, 'start_column': 23}
- EA3: Scope Creep; LOW; {'file': 'templates/vinext-starter/vendor/shadcn-tailwind-4.13.0.LICENSE.md', 'start_line': 16, 'end_line': None, 'start_column': 23}
- SC4: 🟡 SC4: OSV.dev unreachable, using static fallback (9 packages). Results may be incomplete. Set SKILLSPECTOR_OSV_TIMEOUT to increase timeout or check network connectivity to api.osv.dev.; LOW; {'file': 'templates/vinext-starter/package-lock.json', 'start_line': 1, 'end_line': None}
- SC4: 🟡 SC4: OSV.dev unreachable, using static fallback (9 packages). Results may be incomplete. Set SKILLSPECTOR_OSV_TIMEOUT to increase timeout or check network connectivity to api.osv.dev.; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 1, 'end_line': None}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 17, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 18, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 19, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 22, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 23, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 25, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 26, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 27, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 29, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 30, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 32, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 34, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 35, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 36, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 37, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 39, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 40, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 56, 'end_line': None, 'start_column': 4}

### visualize (454149c62d6a3a83)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 112, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 113, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 125, 'end_line': None}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: file_read, file_write, network.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- RA2: Session Persistence; MEDIUM; {'file': 'SKILL.md', 'start_line': 106, 'end_line': None, 'start_column': 2}

### browse-collections (d93ee2c0558f8b3f)
- MP2: Context Window Stuffing; MEDIUM; {'file': 'SKILL.md', 'start_line': 39, 'end_line': None, 'start_column': 35}
- MP2: Context Window Stuffing; MEDIUM; {'file': 'SKILL.md', 'start_line': 41, 'end_line': None, 'start_column': 51}

### build-playlists (a281a9e7145daca6)
- MP2: Context Window Stuffing; MEDIUM; {'file': 'SKILL.md', 'start_line': 60, 'end_line': None, 'start_column': 82}

### website-builder (de68e0ec3810fa8e)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 146, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 147, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 157, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 168, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 172, 'end_line': None}
- P6: Direct Prompt Extraction; HIGH; {'file': 'references/fnf-react.md', 'start_line': 183, 'end_line': None, 'start_column': 2}
- P6: Direct Prompt Extraction; HIGH; {'file': 'references/fnf-sdk.md', 'start_line': 101, 'end_line': None, 'start_column': 2}
- MP3: Memory Manipulation; HIGH; {'file': 'references/fnf-react.md', 'start_line': 228, 'end_line': None, 'start_column': 63}
- TM1: Tool Parameter Abuse; HIGH; {'file': 'references/fnf-sdk.md', 'start_line': 395, 'end_line': None, 'start_column': 70}
- P6: Direct Prompt Extraction; HIGH; {'file': 'references/fnf-sdk.md', 'start_line': 779, 'end_line': None, 'start_column': 7}
- P6: Direct Prompt Extraction; HIGH; {'file': 'references/reference-boards.md', 'start_line': 7, 'end_line': None, 'start_column': 7}
- SSRF1: Cloud Metadata Access; HIGH; {'file': 'references/security.md', 'start_line': 228, 'end_line': None, 'start_column': 100}
- SSRF1: Cloud Metadata Access; HIGH; {'file': 'references/security.md', 'start_line': 774, 'end_line': None, 'start_column': 89}
- OH1: Unvalidated Output Injection; HIGH; {'file': 'references/security.md', 'start_line': 821, 'end_line': None, 'start_column': 5}
- OH1: Unvalidated Output Injection; HIGH; {'file': 'references/security.md', 'start_line': 824, 'end_line': None, 'start_column': 5}
- OH1: Unvalidated Output Injection; HIGH; {'file': 'references/security.md', 'start_line': 828, 'end_line': None, 'start_column': 5}
- OH1: Unvalidated Output Injection; HIGH; {'file': 'references/seo.md', 'start_line': 387, 'end_line': None, 'start_column': 6}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 127, 'end_line': None, 'start_column': 47}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/app-flow.md', 'start_line': 413, 'end_line': None, 'start_column': 19}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/cover-animator.md', 'start_line': 11, 'end_line': None, 'start_column': 35}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/website-flow.md', 'start_line': 532, 'end_line': None, 'start_column': 19}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/design-taste-frontend.md', 'start_line': 51, 'end_line': None, 'start_column': 76}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/fnf-sdk.md', 'start_line': 669, 'end_line': None, 'start_column': 8}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 276, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 278, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 286, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 294, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 279, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 285, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 280, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 281, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 283, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 284, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 287, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 288, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 293, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 289, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 290, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 291, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 292, 'end_line': None}
- P9: Whitespace Padding; MEDIUM; {'file': 'references/quanta-design.md', 'start_line': 296, 'end_line': None}
- E1: External Transmission; MEDIUM; {'file': 'references/security.md', 'start_line': 906, 'end_line': None, 'start_column': 161}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/website-flow.md', 'start_line': 24, 'end_line': None, 'start_column': 20}

### cloud-environment-runtime (5fe3ad20a9628d85)
- PE4: Docker Socket Access; HIGH; {'file': 'references/docker.md', 'start_line': 13, 'end_line': None, 'start_column': 25}
- TM1: Tool Parameter Abuse; HIGH; {'file': 'references/docker.md', 'start_line': 42, 'end_line': None, 'start_column': 0}
- PE4: Docker Socket Access; HIGH; {'file': 'references/docker.md', 'start_line': 43, 'end_line': None, 'start_column': 32}
- PE4: Docker Socket Access; HIGH; {'file': 'references/docker.md', 'start_line': 45, 'end_line': None, 'start_column': 18}
- SC2: External Script Fetching; HIGH; {'file': 'scripts/ensure-socat.sh', 'start_line': 44, 'end_line': None, 'start_column': 7}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- RA2: Session Persistence; MEDIUM; {'file': 'references/docker.md', 'start_line': 44, 'end_line': None, 'start_column': 0}
- RP1: Docker image referenced without tag or digest: 'docker run --rm'.; MEDIUM; {'file': 'references/docker.md', 'start_line': 114, 'end_line': None}
- E1: External Transmission; MEDIUM; {'file': 'references/vpn.md', 'start_line': 27, 'end_line': None, 'start_column': 46}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/vpn.md', 'start_line': 59, 'end_line': None, 'start_column': 53}

### code-review (dcb7869c1f36ab21)
- SC2: External Script Fetching; HIGH; {'file': 'SKILL.md', 'start_line': 24, 'end_line': None, 'start_column': 0}
- TM2: Chaining Abuse; HIGH; {'file': 'SKILL.md', 'start_line': 24, 'end_line': None, 'start_column': 48}

### google-docs (fec4dea21d0f584c)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 13, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 74, 'end_line': None}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}

### google-sheets (23473934cef525f9)
- P6: Direct Prompt Extraction; HIGH; {'file': 'SKILL.md', 'start_line': 83, 'end_line': None, 'start_column': 228}

### google-slides (769a09bb7ea58a43)
- P6: Direct Prompt Extraction; HIGH; {'file': 'SKILL.md', 'start_line': 177, 'end_line': None, 'start_column': 229}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: network.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}

### artifact-template-photography-portfolio (57aeae250b4a0e9c)
- YR4: YARA rule 'privilege_escalation_tools': Privilege escalation tools and techniques [hacktools]; HIGH; {'file': 'assets/reference.pptx', 'start_line': 5302, 'end_line': None}

### write-page (0ecbec4611d72388)
- AR2: Anti-Refusal Statement; HIGH; {'file': 'writing_quality.md', 'start_line': 63, 'end_line': 63, 'start_column': 234, 'end_column': 247}

### plugin-management (eaa2632c48bd1379)
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 43, 'end_line': None, 'start_column': 35}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 58, 'end_line': None, 'start_column': 0}

### sites (3a84202fe6cdae03)
- AR3: Anti-Refusal Statement; HIGH; {'file': 'references/app-integrations.md', 'start_line': 11, 'end_line': 11, 'start_column': 379, 'end_column': 392}
- PE3: Credential Access; HIGH; {'file': 'templates/vinext-starter/build/connector-preview-plugin.mjs', 'start_line': 55, 'end_line': None, 'start_column': 15}
- OH1: Unvalidated Output Injection; HIGH; {'file': 'templates/vinext-starter/components/ui/chart.tsx', 'start_line': 97, 'end_line': None, 'start_column': 6}
- TM1: Tool Parameter Abuse; HIGH; {'file': 'templates/vinext-starter/scripts/install-ci.sh', 'start_line': 42, 'end_line': None, 'start_column': 0}
- TM2: Chaining Abuse; HIGH; {'file': 'templates/vinext-starter/scripts/install-pnpm.sh', 'start_line': 173, 'end_line': None, 'start_column': 50}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/remix.md', 'start_line': 25, 'end_line': None, 'start_column': 94}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/remix.md', 'start_line': 32, 'end_line': None, 'start_column': 101}
- EA3: Scope Creep; LOW; {'file': 'templates/vinext-starter/build/sites-vite-plugin.LICENSE', 'start_line': 16, 'end_line': None, 'start_column': 23}
- EA3: Scope Creep; LOW; {'file': 'templates/vinext-starter/vendor/shadcn-tailwind-4.13.0.LICENSE.md', 'start_line': 16, 'end_line': None, 'start_column': 23}
- SC4: 🟡 SC4: OSV.dev unreachable, using static fallback (9 packages). Results may be incomplete. Set SKILLSPECTOR_OSV_TIMEOUT to increase timeout or check network connectivity to api.osv.dev.; LOW; {'file': 'templates/vinext-starter/package-lock.json', 'start_line': 1, 'end_line': None}
- SC4: 🟡 SC4: OSV.dev unreachable, using static fallback (9 packages). Results may be incomplete. Set SKILLSPECTOR_OSV_TIMEOUT to increase timeout or check network connectivity to api.osv.dev.; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 1, 'end_line': None}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 17, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 18, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 19, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 22, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 23, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 25, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 26, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 27, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 29, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 30, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 32, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 34, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 35, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 36, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 37, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 39, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 40, 'end_line': None, 'start_column': 4}
- SC1: Unpinned Dependencies; LOW; {'file': 'templates/vinext-starter/package.json', 'start_line': 58, 'end_line': None, 'start_column': 4}

### brainstorming (08008dad354d0c9f)
- TM1: Tool Parameter Abuse; HIGH; {'file': 'scripts/stop-server.sh', 'start_line': 22, 'end_line': None, 'start_column': 2}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- RA2: Session Persistence; MEDIUM; {'file': 'SKILL.md', 'start_line': 112, 'end_line': None, 'start_column': 40}
- RA2: Session Persistence; MEDIUM; {'file': 'scripts/start-server.sh', 'start_line': 102, 'end_line': None, 'start_column': 25}
- RA2: Session Persistence; MEDIUM; {'file': 'scripts/start-server.sh', 'start_line': 179, 'end_line': None, 'start_column': 6}
- RA2: Session Persistence; MEDIUM; {'file': 'scripts/start-server.sh', 'start_line': 180, 'end_line': None, 'start_column': 0}
- RA2: Session Persistence; MEDIUM; {'file': 'scripts/start-server.sh', 'start_line': 179, 'end_line': None, 'start_column': 35}
- RA2: Session Persistence; MEDIUM; {'file': 'scripts/start-server.sh', 'start_line': 182, 'end_line': None, 'start_column': 0}

### diagnosing-superpowers (2b25da3a54c42b03)
- AR2: Anti-Refusal Statement; HIGH; {'file': 'prompts/request-conflicts.md', 'start_line': 19, 'end_line': 19, 'start_column': 3, 'end_column': 15}
- E1: External Transmission; MEDIUM; {'file': 'references/github-issues.md', 'start_line': 18, 'end_line': None, 'start_column': 3}

### executing-plans (4be1c1ef4284ee59)
- TM1: Tool Parameter Abuse; HIGH; {'file': 'SKILL.md', 'start_line': 140, 'end_line': None, 'start_column': 3}

### finishing-a-development-branch (4accc662fb83854e)
- TM1: Tool Parameter Abuse; HIGH; {'file': 'SKILL.md', 'start_line': 116, 'end_line': None, 'start_column': 0}

### requesting-code-review (72e8d27b39a0fdf2)
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'code-reviewer.md', 'start_line': 147, 'end_line': None, 'start_column': 23}

### subagent-driven-development (d224aafbdbbc716c)
- TM1: Tool Parameter Abuse; HIGH; {'file': 'SKILL.md', 'start_line': 153, 'end_line': None, 'start_column': 3}

### systematic-debugging (9ceb26a67a46186c)
- PE3: Credential Access; HIGH; {'file': 'SKILL.md', 'start_line': 98, 'end_line': None, 'start_column': 13}
- PE3: Credential Access; HIGH; {'file': 'SKILL.md', 'start_line': 99, 'end_line': None, 'start_column': 17}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 283, 'end_line': None}
- E4: Context Leakage; HIGH; {'file': 'defense-in-depth.md', 'start_line': 73, 'end_line': None, 'start_column': 13}
- EA4: Unbounded Resource Access; MEDIUM; {'file': 'condition-based-waiting.md', 'start_line': 89, 'end_line': None, 'start_column': 18}

### using-git-worktrees (6094aaca59db4fa0)
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 45, 'end_line': None, 'start_column': 39}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 67, 'end_line': None, 'start_column': 123}

### using-superpowers (ad3a46b0abdbc976)
- AS1: Agent Config Directory Access; HIGH; {'file': 'references/codex-tools.md', 'start_line': 3, 'end_line': None, 'start_column': 27}
- AS1: Agent Config Directory Access; HIGH; {'file': 'references/codex-tools.md', 'start_line': 71, 'end_line': None, 'start_column': 1}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/codex-tools.md', 'start_line': 35, 'end_line': None, 'start_column': 29}
- MP2: Context Window Stuffing; MEDIUM; {'file': 'references/muse-tools.md', 'start_line': 31, 'end_line': None, 'start_column': 61}

### verification-before-completion (bde1dcc5754ed34c)
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 54, 'end_line': None, 'start_column': 26}

### writing-skills (17ad8340d60d8642)
- RA1: Self-Modification; HIGH; {'file': 'SKILL.md', 'start_line': 41, 'end_line': None, 'start_column': 21}
- RA1: Self-Modification; HIGH; {'file': 'SKILL.md', 'start_line': 384, 'end_line': None, 'start_column': 0}
- RA1: Self-Modification; HIGH; {'file': 'SKILL.md', 'start_line': 569, 'end_line': None, 'start_column': 0}
- RA1: Self-Modification; HIGH; {'file': 'testing-skills-with-subagents.md', 'start_line': 36, 'end_line': None, 'start_column': 14}
- RA1: Self-Modification; HIGH; {'file': 'testing-skills-with-subagents.md', 'start_line': 84, 'end_line': None, 'start_column': 0}
- RA1: Self-Modification; HIGH; {'file': 'testing-skills-with-subagents.md', 'start_line': 364, 'end_line': None, 'start_column': 14}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 318, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 320, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 321, 'end_line': None}
- RA1: Self-Modification; HIGH; {'file': 'SKILL.md', 'start_line': 385, 'end_line': None, 'start_column': 0}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 589, 'end_line': None}
- RA1: Self-Modification; HIGH; {'file': 'anthropic-best-practices.md', 'start_line': 5, 'end_line': None, 'start_column': 132}
- AS1: Agent Config Directory Access; HIGH; {'file': 'examples/CLAUDE_MD_TESTING.md', 'start_line': 85, 'end_line': None, 'start_column': 9}
- AS1: Agent Config Directory Access; HIGH; {'file': 'examples/CLAUDE_MD_TESTING.md', 'start_line': 95, 'end_line': None, 'start_column': 9}
- AS1: Agent Config Directory Access; HIGH; {'file': 'examples/CLAUDE_MD_TESTING.md', 'start_line': 123, 'end_line': None, 'start_column': 14}
- RA1: Self-Modification; HIGH; {'file': 'testing-skills-with-subagents.md', 'start_line': 9, 'end_line': None, 'start_column': 62}
- AS3: Skill Enumeration; MEDIUM; {'file': 'SKILL.md', 'start_line': 263, 'end_line': None, 'start_column': 6}
- AS3: Skill Enumeration; MEDIUM; {'file': 'examples/CLAUDE_MD_TESTING.md', 'start_line': 84, 'end_line': None, 'start_column': 9}
- AS3: Skill Enumeration; MEDIUM; {'file': 'examples/CLAUDE_MD_TESTING.md', 'start_line': 94, 'end_line': None, 'start_column': 20}
- AS3: Skill Enumeration; MEDIUM; {'file': 'examples/CLAUDE_MD_TESTING.md', 'start_line': 107, 'end_line': None, 'start_column': 26}
- AS3: Skill Enumeration; MEDIUM; {'file': 'examples/CLAUDE_MD_TESTING.md', 'start_line': 122, 'end_line': None, 'start_column': 14}

### create-pet (a9bbd63dfc2f4ca9)
- E4: Context Leakage; HIGH; {'file': 'SKILL.md', 'start_line': 171, 'end_line': None, 'start_column': 149}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: file_read, file_write.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- OH3: Unbounded Output; MEDIUM; {'file': 'scripts/prepare_pet_run.py', 'start_line': 592, 'end_line': None, 'start_column': 251}

### write-like-me (d6cac48343d8e2bc)
- PE1: Excessive Permissions; LOW; {'file': 'SKILL.md', 'start_line': 57, 'end_line': None, 'start_column': 66}

### code-review (b560bf6d17bd9175)
- SC2: External Script Fetching; HIGH; {'file': 'SKILL.md', 'start_line': 24, 'end_line': None, 'start_column': 0}
- TM2: Chaining Abuse; HIGH; {'file': 'SKILL.md', 'start_line': 24, 'end_line': None, 'start_column': 48}

### gh-address-comments (d1e29b8f536ca717)
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/fetch_comments.py', 'start_line': 96, 'end_line': 96, 'start_column': 8, 'end_column': 72}

### gh-fix-ci (fdded93de3cc14e4)
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/inspect_pr_checks.py', 'start_line': 59, 'end_line': 64, 'start_column': 14, 'end_column': 5}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/inspect_pr_checks.py', 'start_line': 69, 'end_line': 73, 'start_column': 14, 'end_column': 5}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/inspect_pr_checks.py', 'start_line': 139, 'end_line': 144, 'start_column': 13, 'end_column': 5}

### hf-cli (f1a6b1401919a117)
- SC2: External Script Fetching; HIGH; {'file': 'SKILL.md', 'start_line': 6, 'end_line': None, 'start_column': 10}
- PE3: Credential Access; HIGH; {'file': 'SKILL.md', 'start_line': 23, 'end_line': None, 'start_column': 35}
- PE3: Credential Access; HIGH; {'file': 'SKILL.md', 'start_line': 26, 'end_line': None, 'start_column': 36}
- TM1: Tool Parameter Abuse; HIGH; {'file': 'SKILL.md', 'start_line': 147, 'end_line': None, 'start_column': 128}
- PE3: Credential Access; HIGH; {'file': 'SKILL.md', 'start_line': 166, 'end_line': None, 'start_column': 25}

### huggingface-community-evals (5870315d96a9d508)
- E2: Env Variable Harvesting; HIGH; {'file': 'SKILL.md', 'start_line': 47, 'end_line': None, 'start_column': 0}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/inspect_eval_uv.py', 'start_line': 94, 'end_line': 94, 'start_column': 8, 'end_column': 55}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/inspect_vllm_uv.py', 'start_line': 105, 'end_line': 105, 'start_column': 8, 'end_column': 39}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/inspect_vllm_uv.py', 'start_line': 170, 'end_line': 170, 'start_column': 8, 'end_column': 39}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/lighteval_vllm_uv.py', 'start_line': 101, 'end_line': 101, 'start_column': 8, 'end_column': 39}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/lighteval_vllm_uv.py', 'start_line': 165, 'end_line': 165, 'start_column': 8, 'end_column': 39}

### huggingface-datasets (1730c0c191b5b9a8)
- RP1: MCP server referenced without pinned version: 'npx parquetlens'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 58, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx -y -p parquetlens'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 76, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx @huggingface/hub'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 101, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx -y @huggingface/hub'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 112, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx -y @huggingface/hub'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 118, 'end_line': None}

### huggingface-jobs (aa32c12022533673)
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- RA2: Session Persistence; MEDIUM; {'file': 'SKILL.md', 'start_line': 30, 'end_line': None, 'start_column': 2}
- EA1: Unrestricted Tool Access; MEDIUM; {'file': 'SKILL.md', 'start_line': 425, 'end_line': None, 'start_column': 57}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'SKILL.md', 'start_line': 513, 'end_line': None, 'start_column': 3}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'SKILL.md', 'start_line': 527, 'end_line': None, 'start_column': 2}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'SKILL.md', 'start_line': 559, 'end_line': None, 'start_column': 3}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'references/hub_saving.md', 'start_line': 35, 'end_line': None, 'start_column': 3}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'references/hub_saving.md', 'start_line': 49, 'end_line': None, 'start_column': 2}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'references/hub_saving.md', 'start_line': 190, 'end_line': None, 'start_column': 3}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'references/hub_saving.md', 'start_line': 191, 'end_line': None, 'start_column': 3}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'references/token_usage.md', 'start_line': 146, 'end_line': None, 'start_column': 3}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'references/token_usage.md', 'start_line': 155, 'end_line': None, 'start_column': 3}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'scripts/finepdfs-stats.py', 'start_line': 506, 'end_line': None, 'start_column': 11}
- E1: External Transmission; MEDIUM; {'file': 'SKILL.md', 'start_line': 535, 'end_line': None, 'start_column': 0}
- E1: External Transmission; MEDIUM; {'file': 'references/hub_saving.md', 'start_line': 65, 'end_line': None, 'start_column': 0}
- E1: External Transmission; MEDIUM; {'file': 'SKILL.md', 'start_line': 535, 'end_line': None, 'start_column': 0}
- E1: External Transmission; MEDIUM; {'file': 'references/hub_saving.md', 'start_line': 65, 'end_line': None, 'start_column': 0}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'references/hub_saving.md', 'start_line': 58, 'end_line': None, 'start_column': 4}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'scripts/generate-responses.py', 'start_line': 207, 'end_line': None, 'start_column': 27}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'scripts/generate-responses.py', 'start_line': 536, 'end_line': None, 'start_column': 18}
- PE1: Excessive Permissions; LOW; {'file': 'references/token_usage.md', 'start_line': 17, 'end_line': None, 'start_column': 4}
- PE1: Excessive Permissions; LOW; {'file': 'references/token_usage.md', 'start_line': 22, 'end_line': None, 'start_column': 4}
- PE1: Excessive Permissions; LOW; {'file': 'references/token_usage.md', 'start_line': 28, 'end_line': None, 'start_column': 4}
- PE1: Excessive Permissions; LOW; {'file': 'references/token_usage.md', 'start_line': 282, 'end_line': None, 'start_column': 14}

### huggingface-llm-trainer (c2a9d4d8653f0a93)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 605, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 676, 'end_line': None}
- TM2: Chaining Abuse; HIGH; {'file': 'scripts/convert_to_gguf.py', 'start_line': 27, 'end_line': None, 'start_column': 37}
- TM2: Chaining Abuse; HIGH; {'file': 'scripts/convert_to_gguf.py', 'start_line': 28, 'end_line': None, 'start_column': 60}
- TM2: Chaining Abuse; HIGH; {'file': 'scripts/convert_to_gguf.py', 'start_line': 69, 'end_line': None, 'start_column': 75}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- OH3: Unbounded Output; MEDIUM; {'file': 'SKILL.md', 'start_line': 151, 'end_line': None, 'start_column': 26}
- RP1: MCP server referenced without pinned version: 'uvx trl-jobs'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 332, 'end_line': None}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 27, 'end_line': None, 'start_column': 17}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 27, 'end_line': None, 'start_column': 40}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 28, 'end_line': None, 'start_column': 15}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 28, 'end_line': None, 'start_column': 63}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 57, 'end_line': None, 'start_column': 35}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 58, 'end_line': None, 'start_column': 33}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 68, 'end_line': None, 'start_column': 35}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 69, 'end_line': None, 'start_column': 33}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 69, 'end_line': None, 'start_column': 78}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 55, 'end_line': 55, 'start_column': 7, 'end_column': 60}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 63, 'end_line': 63, 'start_column': 15, 'end_column': 69}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 64, 'end_line': 64, 'start_column': 16, 'end_column': 71}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 81, 'end_line': 86, 'start_column': 17, 'end_column': 9}
- TT2: Tainted flow: 'cmd' from os.environ.get (line 209, credential/environment) → subprocess.run (code execution); MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 81, 'end_line': 86, 'start_column': 17, 'end_column': 9}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 296, 'end_line': None, 'start_column': 7}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 310, 'end_line': None, 'start_column': 11}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'scripts/convert_to_gguf.py', 'start_line': 405, 'end_line': None, 'start_column': 7}
- PE1: Excessive Permissions; LOW; {'file': 'references/troubleshooting.md', 'start_line': 181, 'end_line': None, 'start_column': 17}
- PE1: Excessive Permissions; LOW; {'file': 'references/troubleshooting.md', 'start_line': 191, 'end_line': None, 'start_column': 16}

### huggingface-paper-publisher (0a2a5d3e41f6f50e)
- PE3: Credential Access; HIGH; {'file': 'SKILL.md', 'start_line': 62, 'end_line': None, 'start_column': 49}
- PE3: Credential Access; HIGH; {'file': 'examples/example_usage.md', 'start_line': 306, 'end_line': None, 'start_column': 9}
- PE3: Credential Access; HIGH; {'file': 'examples/example_usage.md', 'start_line': 307, 'end_line': None, 'start_column': 34}
- PE3: Credential Access; HIGH; {'file': 'references/quick_reference.md', 'start_line': 139, 'end_line': None, 'start_column': 11}
- PE3: Credential Access; HIGH; {'file': 'references/quick_reference.md', 'start_line': 141, 'end_line': None, 'start_column': 29}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, file_read, file_write, network.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- E5: Cloud Storage Exfiltration; MEDIUM; {'file': 'scripts/paper_manager.py', 'start_line': 170, 'end_line': None, 'start_column': 20}
- AE4: None; MEDIUM; {'file': 'templates/arxiv.md', 'start_line': 1, 'end_line': None}

### huggingface-papers (a2cc340a2bc367d9)
- E1: External Transmission; MEDIUM; {'file': 'SKILL.md', 'start_line': 46, 'end_line': None, 'start_column': 0}

### transformers-js (3ae032dde7606358)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 57, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 556, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 583, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 510, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 578, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 534, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 580, 'end_line': None}

### huggingface-vision-trainer (f949b3d522f7b275)
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, network.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}

### documents (76c71405bc6769ca)
- P6: Direct Prompt Extraction; HIGH; {'file': 'SKILL.md', 'start_line': 529, 'end_line': None, 'start_column': 225}
- E2: Env Variable Harvesting; HIGH; {'file': 'render_docx.py', 'start_line': 226, 'end_line': 226, 'start_column': 10}
- P6: Direct Prompt Extraction; HIGH; {'file': 'scripts/redact_docx.py', 'start_line': 254, 'end_line': None, 'start_column': 4}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, file_read, file_write, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- AST4: subprocess module call; MEDIUM; {'file': 'render_docx.py', 'start_line': 238, 'end_line': 245, 'start_column': 11, 'end_column': 5}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/render_and_diff.py', 'start_line': 50, 'end_line': 50, 'start_column': 4, 'end_column': 30}
- AST7: Dynamic attribute access via getattr(); LOW; {'file': 'scripts/style_normalize.py', 'start_line': 102, 'end_line': 102, 'start_column': 15, 'end_column': 32}
- AST7: Dynamic attribute access via getattr(); LOW; {'file': 'scripts/style_normalize.py', 'start_line': 112, 'end_line': 112, 'start_column': 15, 'end_column': 32}

### pdf (c73d064b3e81dedf)
- P6: Direct Prompt Extraction; HIGH; {'file': 'SKILL.md', 'start_line': 149, 'end_line': None, 'start_column': 220}
- PE2: Sudo/Root Execution; MEDIUM; {'file': 'SKILL.md', 'start_line': 116, 'end_line': None, 'start_column': 0}

### Presentations (3cfd0ea984fe3c2e)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 252, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 255, 'end_line': None}
- P6: Direct Prompt Extraction; HIGH; {'file': 'SKILL.md', 'start_line': 267, 'end_line': None, 'start_column': 229}
- SC8: Skill ships a __pycache__ directory that normal discovery skips; HIGH; {'file': 'container_tools/__pycache__/', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'container_tools/__pycache__/runtime_helpers.cpython-312.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'container_tools/__pycache__/runtime_helpers.cpython-312.pyc', 'start_line': 1, 'end_line': None}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, file_read, file_write, network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- AST4: subprocess module call; MEDIUM; {'file': 'container_tools/ensure_raster_image.py', 'start_line': 77, 'end_line': 80, 'start_column': 4, 'end_column': 5}
- AST4: subprocess module call; MEDIUM; {'file': 'container_tools/ensure_raster_image.py', 'start_line': 153, 'end_line': 153, 'start_column': 8, 'end_column': 82}
- AST4: subprocess module call; MEDIUM; {'file': 'container_tools/ensure_raster_image.py', 'start_line': 162, 'end_line': 162, 'start_column': 8, 'end_column': 55}
- AST4: subprocess module call; MEDIUM; {'file': 'container_tools/render_slides.py', 'start_line': 107, 'end_line': 121, 'start_column': 11, 'end_column': 5}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'routing/google_slides.md', 'start_line': 11, 'end_line': None, 'start_column': 203}

### excel-live-control (ad8b7abc09492d64)
- EA4: Unbounded Resource Access; MEDIUM; {'file': 'SKILL.md', 'start_line': 95, 'end_line': None, 'start_column': 248}
- EA4: Unbounded Resource Access; MEDIUM; {'file': 'SKILL.md', 'start_line': 503, 'end_line': None, 'start_column': 7}

### Spreadsheets (dac385cd9ace8be4)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 290, 'end_line': None}
- P6: Direct Prompt Extraction; HIGH; {'file': 'SKILL.md', 'start_line': 431, 'end_line': None, 'start_column': 228}
- EA4: Unbounded Resource Access; MEDIUM; {'file': 'SKILL.md', 'start_line': 425, 'end_line': None, 'start_column': 7}

### template-creator (726de4aeac822a94)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 17, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 54, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 83, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 136, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 140, 'end_line': None}
- PE3: Credential Access; HIGH; {'file': 'scripts/create-template-skill.mjs', 'start_line': 22, 'end_line': None, 'start_column': 3}
- PE3: Credential Access; HIGH; {'file': 'scripts/create-template-skill.mjs', 'start_line': 24, 'end_line': None, 'start_column': 3}
- PE3: Credential Access; HIGH; {'file': 'scripts/create-template-skill.mjs', 'start_line': 34, 'end_line': None, 'start_column': 3}
- PE3: Credential Access; HIGH; {'file': 'scripts/create-template-skill.mjs', 'start_line': 491, 'end_line': None, 'start_column': 39}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, network.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- TR2: Shadow Command Trigger; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}

### imagegen (d7542c15cbc32f7e)
- TM1: Tool Parameter Abuse; HIGH; {'file': 'references/cli.md', 'start_line': 220, 'end_line': None, 'start_column': 0}
- AS1: Agent Config Directory Access; HIGH; {'file': 'references/codex-network.md', 'start_line': 20, 'end_line': None, 'start_column': 9}
- P6: Direct Prompt Extraction; HIGH; {'file': 'scripts/image_gen.py', 'start_line': 88, 'end_line': None, 'start_column': 8}
- P6: Direct Prompt Extraction; HIGH; {'file': 'scripts/image_gen.py', 'start_line': 266, 'end_line': None, 'start_column': 8}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, file_read, file_write, network.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 294, 'end_line': None, 'start_column': 2}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 295, 'end_line': None, 'start_column': 2}
- AST7: Dynamic attribute access via getattr(); LOW; {'file': 'scripts/image_gen.py', 'start_line': 525, 'end_line': 525, 'start_column': 14, 'end_column': 38}

### openai-docs (0e4c042981f5b548)
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}

### skill-creator (2a9cef905a396572)
- RA1: Self-Modification; HIGH; {'file': 'scripts/init_skill.py', 'start_line': 223, 'end_line': None, 'start_column': 14}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: file_read, file_write, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- RA2: Session Persistence; MEDIUM; {'file': 'SKILL.md', 'start_line': 151, 'end_line': None, 'start_column': 147}
- E1: External Transmission; MEDIUM; {'file': 'references/openai_yaml.md', 'start_line': 22, 'end_line': None, 'start_column': 12}

### skill-installer (7169456d502a8ffd)
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, file_read, file_write, network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- E1: External Transmission; MEDIUM; {'file': 'scripts/github_utils.py', 'start_line': 21, 'end_line': None, 'start_column': 13}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/install-skill-from-github.py', 'start_line': 101, 'end_line': 103, 'start_column': 13, 'end_column': 5}

### frontend-design (a58d70124ef02e98)
- AR2: Anti-Refusal Statement; HIGH; {'file': 'SKILL.md', 'start_line': 69, 'end_line': 69, 'start_column': 163, 'end_column': 178}

### better-colors (bb5254a4c0a10622)
- AE4: None; MEDIUM; {'file': 'palette-structure.md', 'start_line': 1, 'end_line': None}

### better-interface (f764f2cf58d1c5c8)
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 84, 'end_line': None, 'start_column': 28}

### break (842098913b5b270f)
- OH3: Unbounded Output; MEDIUM; {'file': 'SKILL.md', 'start_line': 57, 'end_line': None, 'start_column': 72}

### review-animations (012f47622aaa72eb)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 25, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 37, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 115, 'end_line': None}

### impeccable (f1f7bd4ae5ec6925)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 50, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 56, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 67, 'end_line': None}
- AR2: Anti-Refusal Statement; HIGH; {'file': 'agents/impeccable_finish_reviewer.toml', 'start_line': 12, 'end_line': 12, 'start_column': 33, 'end_column': 48}
- AR2: Anti-Refusal Statement; HIGH; {'file': 'reference/degraded/finish-reviewer.md', 'start_line': 10, 'end_line': 10, 'start_column': 33, 'end_column': 48}
- MP3: Memory Manipulation; HIGH; {'file': 'reference/colorize.md', 'start_line': 23, 'end_line': None, 'start_column': 5}
- AR2: Anti-Refusal Statement; HIGH; {'file': 'reference/critique.md', 'start_line': 278, 'end_line': 278, 'start_column': 96, 'end_column': 108}
- AS1: Agent Config Directory Access; HIGH; {'file': 'reference/hooks.md', 'start_line': 17, 'end_line': None, 'start_column': 94}
- AS1: Agent Config Directory Access; HIGH; {'file': 'reference/hooks.md', 'start_line': 108, 'end_line': None, 'start_column': 240}
- MP3: Memory Manipulation; HIGH; {'file': 'reference/mode-operate.md', 'start_line': 15, 'end_line': None, 'start_column': 211}
- AR2: Anti-Refusal Statement; HIGH; {'file': 'reference/new-work.md', 'start_line': 136, 'end_line': 136, 'start_column': 1504, 'end_column': 1515}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'agents/impeccable_finish_reviewer.toml', 'start_line': 21, 'end_line': None, 'start_column': 1376}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/degraded/finish-reviewer.md', 'start_line': 19, 'end_line': None, 'start_column': 1376}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/new-work.md', 'start_line': 53, 'end_line': None, 'start_column': 3661}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/visualize.md', 'start_line': 31, 'end_line': None, 'start_column': 513}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'agents/impeccable_finish_reviewer.toml', 'start_line': 22, 'end_line': None, 'start_column': 933}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'agents/impeccable_finish_reviewer.toml', 'start_line': 22, 'end_line': None, 'start_column': 3039}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'agents/impeccable_finish_reviewer.toml', 'start_line': 36, 'end_line': None, 'start_column': 188}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/degraded/finish-reviewer.md', 'start_line': 20, 'end_line': None, 'start_column': 933}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/degraded/finish-reviewer.md', 'start_line': 20, 'end_line': None, 'start_column': 3039}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/degraded/finish-reviewer.md', 'start_line': 34, 'end_line': None, 'start_column': 188}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/audit.md', 'start_line': 139, 'end_line': None, 'start_column': 25}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/audit.native.md', 'start_line': 139, 'end_line': None, 'start_column': 25}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/critique.md', 'start_line': 722, 'end_line': None, 'start_column': 2}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/delight.md', 'start_line': 55, 'end_line': None, 'start_column': 13}
- RP1: MCP server referenced without pinned version: 'npx impeccable'.; MEDIUM; {'file': 'reference/doctor.md', 'start_line': 9, 'end_line': None}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/document.md', 'start_line': 411, 'end_line': None, 'start_column': 40}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/new-work.md', 'start_line': 55, 'end_line': None, 'start_column': 1885}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/visualize.md', 'start_line': 37, 'end_line': None, 'start_column': 311}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/init.md', 'start_line': 112, 'end_line': None, 'start_column': 618}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'reference/live.md', 'start_line': 78, 'end_line': None, 'start_column': 113}
- MP1: Persistent Context Injection; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 1008, 'end_line': None, 'start_column': 51}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 3825, 'end_line': None, 'start_column': 24}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 7172, 'end_line': None, 'start_column': 4}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 7294, 'end_line': None, 'start_column': 11}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 7819, 'end_line': None, 'start_column': 25}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 11581, 'end_line': None, 'start_column': 4}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 11593, 'end_line': None, 'start_column': 4}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 4141, 'end_line': None, 'start_column': 24}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 4161, 'end_line': None, 'start_column': 24}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 4205, 'end_line': None, 'start_column': 24}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 4254, 'end_line': None, 'start_column': 24}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 4273, 'end_line': None, 'start_column': 24}
- SSRF2: Internal Network Request; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 8752, 'end_line': None, 'start_column': 32}
- E1: External Transmission; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 7172, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'scripts/live-browser.js', 'start_line': 7294, 'end_line': None, 'start_column': 11}
- EA3: Scope Creep; LOW; {'file': 'LICENSE.upstream', 'start_line': 27, 'end_line': None, 'start_column': 20}
- EA3: Scope Creep; LOW; {'file': 'LICENSE.upstream', 'start_line': 32, 'end_line': None, 'start_column': 6}
- EA3: Scope Creep; LOW; {'file': 'LICENSE.upstream', 'start_line': 56, 'end_line': None, 'start_column': 10}
- EA3: Scope Creep; LOW; {'file': 'LICENSE.upstream', 'start_line': 161, 'end_line': None, 'start_column': 26}

### job-search-os (3eea9597632871ba)
- YR4: YARA rule 'agent_skill_mcp_tool_poisoning_metadata': MCP/tool metadata poisoning indicators in tool schemas or skill manifests [agent_skills]; HIGH; {'file': 'SKILL.md', 'start_line': 3, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 29, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 106, 'end_line': None}
- SC8: Skill ships a __pycache__ directory that normal discovery skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/__init__.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/__init__.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/__init__.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/__init__.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/__init__.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/__init__.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/analytics.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/analytics.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/analytics.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/analytics.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/assessment.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/assessment.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/assessment.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/assessment.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/db.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/db.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/db.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/db.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/eligibility.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/eligibility.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/eligibility.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/eligibility.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/extract.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/extract.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/extract.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/extract.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/fetch.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/fetch.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/fetch.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/fetch.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/freshness.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/freshness.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/freshness.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/freshness.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/logging_utils.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/logging_utils.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/logging_utils.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/logging_utils.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/matching.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/matching.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/matching.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/matching.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/migration.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/migration.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/migration.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/migration.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/normalize.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/normalize.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/normalize.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/normalize.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/paths.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/paths.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/paths.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/paths.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/people.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/people.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/people.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/people.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/reporting.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/reporting.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/reporting.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/reporting.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/runner.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/runner.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/__pycache__/runner.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/__pycache__/runner.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships a __pycache__ directory that normal discovery skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/__init__.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/__init__.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/ashby.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/ashby.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/ashby.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/ashby.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/base.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/base.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/base.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/base.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/generic_json.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/generic_json.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/generic_json.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/generic_json.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/greenhouse.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/greenhouse.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/greenhouse.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/greenhouse.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/lever.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/lever.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/lever.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/lever.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/smartrecruiters.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/smartrecruiters.cpython-313.pyc', 'start_line': 1, 'end_line': None}
- SC8: Skill ships Python bytecode (.pyc/.pyo) that normal analysis skips; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/smartrecruiters.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- SC9: Concealed Executable Artifact; HIGH; {'file': 'scripts/job_search_os/adapters/__pycache__/smartrecruiters.cpython-314.pyc', 'start_line': 1, 'end_line': None}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, file_read, file_write, network.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'references/safety.md', 'start_line': 36, 'end_line': None, 'start_column': 154}
- E1: External Transmission; MEDIUM; {'file': 'scripts/job_search_os/adapters/ashby.py', 'start_line': 13, 'end_line': None, 'start_column': 16}
- E1: External Transmission; MEDIUM; {'file': 'scripts/job_search_os/adapters/lever.py', 'start_line': 14, 'end_line': None, 'start_column': 16}
- E1: External Transmission; MEDIUM; {'file': 'scripts/job_search_os/adapters/smartrecruiters.py', 'start_line': 14, 'end_line': None, 'start_column': 16}
- E1: External Transmission; MEDIUM; {'file': 'scripts/job_search_os/adapters/smartrecruiters.py', 'start_line': 26, 'end_line': None, 'start_column': 19}
- E1: External Transmission; MEDIUM; {'file': 'tests/test_adapters_runner.py', 'start_line': 108, 'end_line': None, 'start_column': 24}
- AST7: Dynamic attribute access via getattr(); LOW; {'file': 'scripts/job_search_os/db.py', 'start_line': 127, 'end_line': 127, 'start_column': 26, 'end_column': 51}

### playwright (1343f8b4a97bc487)
- AS3: Skill Enumeration; MEDIUM; {'file': 'NOTICE.txt', 'start_line': 5, 'end_line': None, 'start_column': 8}
- RP1: MCP server referenced without pinned version: 'npx --package @playwright/cli'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 124, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx is'.; MEDIUM; {'file': 'scripts/playwright_cli.sh', 'start_line': 5, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx --yes --package @playwright/cli'.; MEDIUM; {'file': 'scripts/playwright_cli.sh', 'start_line': 19, 'end_line': None}

### design-taste-frontend (ab6216768602a7d5)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 15, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 410, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 20, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 241, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 290, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 379, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 412, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 32, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 45, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 394, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 411, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 241, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 379, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 391, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 412, 'end_line': None}
- TM1: Tool Parameter Abuse; HIGH; {'file': 'library/photos.json', 'start_line': 2632, 'end_line': None, 'start_column': 24}
- PE3: Credential Access; HIGH; {'file': 'library/sites.json', 'start_line': 1902, 'end_line': None, 'start_column': 599}
- PE3: Credential Access; HIGH; {'file': 'library/sites.json', 'start_line': 2600, 'end_line': None, 'start_column': 74}
- PE3: Credential Access; HIGH; {'file': 'library/sites.json', 'start_line': 2609, 'end_line': None, 'start_column': 248}
- TM1: Tool Parameter Abuse; HIGH; {'file': 'scripts/assets.mjs', 'start_line': 15, 'end_line': None, 'start_column': 11}
- TM1: Tool Parameter Abuse; HIGH; {'file': 'scripts/assets.mjs', 'start_line': 63, 'end_line': None, 'start_column': 6}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: env, network, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 15, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 27, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 41, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 63, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 75, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 89, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 293, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 305, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 319, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 387, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 399, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 412, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 708, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 708, 'end_line': None, 'start_column': 259}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 720, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 720, 'end_line': None, 'start_column': 259}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 735, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 736, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 898, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 910, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 923, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1214, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1226, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1239, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1261, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1273, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1285, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1307, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1319, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1331, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1353, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1353, 'end_line': None, 'start_column': 260}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1365, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1365, 'end_line': None, 'start_column': 260}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1379, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1380, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1489, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1501, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1515, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1537, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1549, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1562, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1630, 'end_line': None, 'start_column': 417}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1641, 'end_line': None, 'start_column': 417}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1657, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1679, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1691, 'end_line': None, 'start_column': 160}
- E1: External Transmission; MEDIUM; {'file': 'library/type.json', 'start_line': 1705, 'end_line': None, 'start_column': 4}
- E1: External Transmission; MEDIUM; {'file': 'scripts/assets.mjs', 'start_line': 329, 'end_line': None, 'start_column': 20}
- E1: External Transmission; MEDIUM; {'file': 'scripts/assets.mjs', 'start_line': 720, 'end_line': None, 'start_column': 63}
- E1: External Transmission; MEDIUM; {'file': 'scripts/assets.mjs', 'start_line': 422, 'end_line': None, 'start_column': 34}
- E1: External Transmission; MEDIUM; {'file': 'scripts/assets.mjs', 'start_line': 727, 'end_line': None, 'start_column': 53}
- EA3: Scope Creep; LOW; {'file': 'LICENSE.upstream', 'start_line': 16, 'end_line': None, 'start_column': 23}

### baseline-ui (4291357df4f72648)
- EA3: Scope Creep; LOW; {'file': 'LICENSE.upstream', 'start_line': 16, 'end_line': None, 'start_column': 23}

### verified-job-scout (1b25f50130ad2b15)
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: file_read, file_write, network.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}

### webapp-testing (6addb814b9dd7631)
- TM1: Tool Parameter Abuse; HIGH; {'file': 'scripts/with_server.py', 'start_line': 69, 'end_line': None, 'start_column': 22}
- LP3: Skill declares no tool scope ('permissions' or 'allowed-tools') but code capabilities were detected: file_write, shell.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/with_server.py', 'start_line': 69, 'end_line': 74, 'start_column': 22, 'end_column': 13}
- AST4: subprocess module call; MEDIUM; {'file': 'scripts/with_server.py', 'start_line': 88, 'end_line': 88, 'start_column': 17, 'end_column': 45}

### workflow-orchestration (80398cbce3175e80)
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 122, 'end_line': None, 'start_column': 0}
- EA3: Scope Creep; LOW; {'file': 'references/orchestration-patterns.md', 'start_line': 76, 'end_line': None, 'start_column': 25}

### graphify (870f1d55d27f4c6b)
- AS1: Agent Config Directory Access; HIGH; {'file': 'SKILL.md', 'start_line': 236, 'end_line': None, 'start_column': 55}
- TM1: Tool Parameter Abuse; HIGH; {'file': 'SKILL.md', 'start_line': 705, 'end_line': None, 'start_column': 0}
- AR2: Anti-Refusal Statement; HIGH; {'file': 'SKILL.md', 'start_line': 1244, 'end_line': 1244, 'start_column': 59, 'end_column': 74}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 54, 'end_line': None, 'start_column': 51}
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 1174, 'end_line': None, 'start_column': 221}

### playwright-cli (f30f230d97711081)
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 476, 'end_line': None}
- AE1: Incomplete referenced artifact analysis; HIGH; {'file': 'SKILL.md', 'start_line': 488, 'end_line': None}
- MP3: Memory Manipulation; HIGH; {'file': 'references/storage-state.md', 'start_line': 273, 'end_line': None, 'start_column': 2}
- RP1: Manifest references MCP server without version pin: 'npx playwright'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 1, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 4, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 402, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'SKILL.md', 'start_line': 408, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/playwright-tests.md', 'start_line': 3, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/playwright-tests.md', 'start_line': 7, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/playwright-tests.md', 'start_line': 23, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/pr-attachments.md', 'start_line': 46, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/test-generation.md', 'start_line': 10, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/test-generation.md', 'start_line': 208, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/test-generation.md', 'start_line': 296, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/test-generation.md', 'start_line': 359, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/test-generation.md', 'start_line': 373, 'end_line': None}
- RP1: MCP server referenced without pinned version: 'npx playwright'.; MEDIUM; {'file': 'references/test-generation.md', 'start_line': 383, 'end_line': None}
- E1: External Transmission; MEDIUM; {'file': 'SKILL.md', 'start_line': 168, 'end_line': None, 'start_column': 22}
- RA2: Session Persistence; MEDIUM; {'file': 'references/storage-state.md', 'start_line': 258, 'end_line': None, 'start_column': 2}

### proof-lab-context (7d3ad7d41fcec06e)
- EA2: Autonomous Decision Making; MEDIUM; {'file': 'SKILL.md', 'start_line': 15, 'end_line': None, 'start_column': 43}
