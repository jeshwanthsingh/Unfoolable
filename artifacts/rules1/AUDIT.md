# Builder instructions before RULES-1

The normal ticket prompt is reproduced verbatim in before-ticket-prompt.txt. The legacy Mission prompt and its bounded correction addition are reproduced separately. build-runtime.ts selects a distinct single-file reproduction prompt for Bug-from-log; diagnostic probes use fixed single-command prompts.

The chosen system prompt is written as provider-private/prompt.md, selected with model_instructions_file, and also supplied as thread/start.developerInstructions (legacy correction instructions append there). The turn receives only the serialized engineering request/accepted artifacts and coordinator effect-file description.

The runtime creates a private CODEX_HOME, removes model catalog base_instructions/instructions_template, disables host skill discovery, plugins, memory, planning tools and multiple agents, and denies CC's source tree. CC's AGENTS.md is not read or injected by the coordinator. The target repository's own project instructions may still be observed; these vary by repository. Provider-internal tool instructions are not fully exposed by the app-server, so this audit describes exactly what CC supplies, not a claimed dump of undocumented provider policy.

CC's AGENTS.md already states four Karpathy-style principles for developers of CC. The actual normal Builder prompt contains some overlapping scope/simplicity guidance but not the complete four-rule block. No source skill is globally installed.

Tracked study BASEs: Aegis has its own AGENTS.md (containment, narrow checks, smallest safe fix and a Graphify workflow); career-ops has AGENTS.md linking CLAUDE.md and docs/CODEX.md; the other two have none. Their paths/hashes are in project-instructions.json and remain constant across arms. These are target-project instructions, separate from the CC-owned block. Provider-internal policy is not claimed to be observable.
