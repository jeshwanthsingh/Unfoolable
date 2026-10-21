# Builder working rules

Unfoolable owns a short four-rule instruction block in `apps/server/builder-instructions.ts`: think before coding, simplicity first, surgical changes, goal-driven checks. It appends to the original scope/safety prompt rather than replacing it. The selected text goes to the isolated model-instructions file and the app-server thread instructions. No instruction file is written into a user repository. Fixed read-boundary diagnostics and single-file bug reproduction keep their original prompts.

The default remains OFF pending the RULES-1 comparison. The explicit boolean argument on internal Builder factories exists for the paired local study; it is not a chat command, API field or environment setting. Request data cannot select it. Model, runtime, permissions, budgets and protected checker policy remain unchanged.

Source: multica-ai/andrej-karpathy-skills, commit `2c606141936f1eeef17fa3043a72095b4765b9c2`. MIT is declared in the skill and README; no separate LICENSE file exists in that pinned tree. SkillSpector 2.12.0 static/no-LLM scan: SAFE, 0/100, no findings, network denied with OSV offline fallback. No global skill is installed. The short application wording is project-authored.

See `artifacts/rules1/AUDIT.md` for the exact pre-change prompts, `STUDY.json` for the 19 paired trials and promotion rule, and the final RESULT.md for measured results. Nineteen historical checker rows contain repeated tasks; their old correct/wrong labels do not describe freshly built outputs. Existing regression checks and recipes can leave task intent unchecked; those gaps remain explicit.
