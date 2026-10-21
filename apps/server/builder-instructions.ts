// Project-authored summary of multica-ai/andrej-karpathy-skills, MIT-declared.
// Pinned source and static scan: artifacts/rules1/source.json.
// The 38-build paired study did not meet the promotion rule; keep OFF.
export const BUILDER_RULES_ENABLED: boolean = false;
export const KARPATHY_RULES = `Builder working rules:
1. Think before coding: inspect the relevant code, state assumptions that affect correctness, and stop with a concise question if the request is genuinely ambiguous.
2. Simplicity first: solve only the requested problem. Avoid speculative features, single-use abstractions and unnecessary configuration.
3. Surgical changes: match the existing style and touch only what the request needs. Leave unrelated code, comments and formatting alone; remove only unused code your change creates.
4. Goal-driven: define observable success checks, reproduce a bug when practical, and run the relevant local tests. Report actual results and unresolved concerns; your own tests never replace protected verification.`;
export function withBuilderRules(prompt: string, enabled = BUILDER_RULES_ENABLED): string {
 return enabled ? prompt + '\n\n' + KARPATHY_RULES : prompt;
}
