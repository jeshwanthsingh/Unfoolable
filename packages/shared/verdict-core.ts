export const CORE_VERSION = 'verdict-core-v1';
/** Deterministic policy only. Authorities and observations belong to the shell. */
export type CheckStatus = 'PASS' | 'FAIL' | 'ERROR' | 'NOT CHECKED';
export type Verdict = 'VERIFIED' | 'PASSED WITH GAPS' | 'FAILED' | 'ERROR' | 'NOT CHECKED';
export type ClaimStatus = CheckStatus | 'CANCELLED' | 'STALE';
export type TraceStep = {rule: string; passed: boolean; explanation: string};
type Gap = {id: string; layer: 1 | 2 | 3; reason: string};
type Layer = {layer: 1 | 2 | 3; status: CheckStatus; checks: {id: string; status: CheckStatus; reason: string | null; baseStatus?: 'PASS' | 'FAIL' | 'ERROR'; candidateStatus?: 'PASS' | 'FAIL' | 'ERROR'}[]; gaps: Gap[]};
type TestRow = {id: string; status: 'PASS' | 'FAIL' | 'SKIPPED'};
type CommandResult = {exitCode: number; tests: TestRow[]};
export type Outcome = {verdict: Verdict; gaps: string[]; failures: string[]};
export type VerdictFacts =
 | {path: 'budget'; commands: number; reportedCodexTokens: number|null; reportedWriterTokens: number|null; limits: {maxCommands: number; maxCodexTokens: number; maxWriterTokens?: number}}
 | {path: 'unsupported'; reason: string}
 | {path: 'native-ticket'; layers: Layer[]; gaps: Gap[]; supplied?: {verdict: Verdict; provenance: {source: 'protected-verifier'; verificationId: string; evidenceHash: string|null}}}
 | {path: 'native'; layers: Layer[]; gaps?: Gap[]}
 | {path: 'project-tests'; base: CommandResult[]; candidate: CommandResult[]}
 | {path: 'writer-admission'; baseStatus: string; baseIds: string[]; candidates: {status: string; ids: string[]}[]}
 | {path: 'playbook'; failures: string[]; gaps: string[]; qualityGates?: {gate:string;status:string;findings:{path:string;line:number;message:string}[]}[]; tamperStatus?:string}
 | {path: 'combined'; native: Outcome; project: Outcome}
 | {path: 'claims'; claims: {id: string; requirement: 'REQUIRED' | 'ADVISORY'; status: ClaimStatus; reason: string | null}[]}
 | {path: 'runtime'; code: string; aborted: boolean; queued: boolean; reason: string};
export type VerdictDecision = {facts: VerdictFacts; verdict: Verdict; canLand: boolean; reasons: string[]; trace: TraceStep[]; status?: ClaimStatus; gaps?: string[]; failures?: string[]; executionError?: boolean; budgetReason?: string|null; admitted?: boolean; phase?: 'needs_you' | 'interrupted' | 'harness_error'};

/** Both checker paths and runtime classification terminate here. No result is evidence of a human decision. */
export function scoreVerdict(facts: VerdictFacts): VerdictDecision {
 const trace: TraceStep[] = [];
 const note = (rule: string, passed: boolean, explanation: string) => {trace.push({rule, passed, explanation});};
 const finish = (verdict: Verdict, reasons: string[], extra: Pick<VerdictDecision, 'status' | 'phase'> = {}): VerdictDecision => {
  note('result', verdict === 'VERIFIED' || verdict === 'PASSED WITH GAPS', 'Result: ' + verdict + '. This never accepts the change.');
  return {facts, verdict, canLand: verdict === 'VERIFIED' || verdict === 'PASSED WITH GAPS', reasons, trace, ...extra};
 };
 if (facts.path === 'budget') {
  const reason = facts.commands > facts.limits.maxCommands ? 'Stopped because this ticket exceeded ' + facts.limits.maxCommands + ' Builder commands.'
   : facts.reportedCodexTokens !== null && facts.reportedCodexTokens > facts.limits.maxCodexTokens ? 'Stopped because Builder reported more than ' + facts.limits.maxCodexTokens + ' tokens for this ticket.'
   : facts.reportedWriterTokens !== null && facts.reportedWriterTokens > (facts.limits.maxWriterTokens ?? 40000) ? 'Stopped because Test Writer used its full token budget.' : null;
  return {...finish('NOT CHECKED', reason ? [reason] : []), budgetReason: reason};
 }
 if (facts.path === 'unsupported') {note('unsupported', false, facts.reason);return finish('NOT CHECKED', [facts.reason]);}
 if (facts.path === 'native-ticket') {
  // Compatibility authority is the protected verifier, never Builder prose. Preserve its
  // supplied aggregate (including empty layers); tightening this is a separate policy change.
  const scored = facts.supplied ? {verdict: facts.supplied.verdict} : scoreVerdict({path: 'native', layers: facts.layers, gaps: facts.gaps});
  // The ticket adapter historically abstains when its mandatory recipe is missing.
  if (scored.verdict === 'ERROR' && facts.layers[0]?.status === 'PASS' && facts.layers[1]?.gaps.some(g => g.id === 'project-recipes')) {
   note('missing-recipe', false, 'Native check: NOT CHECKED, because a required project recipe is missing: ' + facts.layers[1]!.gaps.filter(g => g.id === 'project-recipes').map(g => g.reason).join('; '));
   return finish('NOT CHECKED', facts.gaps.map(g => g.reason));
  }
  note('native-source', scored.verdict === 'VERIFIED' || scored.verdict === 'PASSED WITH GAPS', 'Native check: ' + scored.verdict + (facts.gaps.length ? ', because ' + facts.gaps.map(g => g.reason).join('; ') : '.') + (facts.supplied ? ' Supplied by protected verifier ' + facts.supplied.provenance.verificationId + '.' : ' Replayed from retained layers.'));
  return finish(scored.verdict, facts.gaps.map(g => g.reason));
 }
 if (facts.path === 'writer-admission') {
  const identities = (ids: string[]) => [...ids].sort().join('\n');
  const admitted = facts.baseStatus === 'ASSERTION_FAIL' && facts.candidates.length === 2 && facts.candidates.every(c => c.status === 'PASS' && identities(c.ids) === identities(facts.baseIds));
  note('writer-admission', admitted, admitted ? 'The independent test failed by assertion on the original code and passed twice on the change.' : 'The independent test did not meet the existing admission rule.');
  return {...finish('NOT CHECKED', []), admitted};
 }
 if (facts.path === 'project-tests') {
  const baseline = facts.base.flatMap(r => r.tests);
  const gaps = baseline.filter(r => r.status !== 'PASS').map(r => r.id + ': BASE ' + r.status + ' (not a passing check)');
  const failures: string[] = [];
  for (let index = 0; index < facts.base.length; index++) {
   for (const row of facts.base[index]!.tests.filter(r => r.status === 'PASS')) {
    const found = facts.candidate[index]?.tests.filter(r => r.id === row.id) ?? [];
    if (found.length !== 1 || found[0]!.status !== 'PASS') failures.push('Command ' + (index + 1) + ' ' + row.id + ': ' + (found[0]?.status ?? 'not collected'));
   }
  }
  for (let index = 0; index < facts.candidate.length; index++) {
   const baseRows = facts.base[index]!.tests;
   for (const row of facts.candidate[index]!.tests) {
    if (row.status === 'FAIL' && !baseRows.some(b => b.id === row.id && b.status === 'FAIL')) failures.push('Command ' + (index + 1) + ' ' + row.id + ': unexpected Candidate failure');
    if (row.status === 'SKIPPED') gaps.push(row.id + ': Candidate SKIPPED (never passing)');
    if (!baseRows.some(b => b.id === row.id)) gaps.push(row.id + ': Candidate-only result, not admitted on BASE');
   }
  }
  const executionError = facts.candidate.some(r => r.exitCode !== 0 && !r.tests.some(t => t.status === 'FAIL'));
  note('base-identities', failures.length === 0, failures.length ? failures.join('; ') : 'Every passing original test retained its passing identity.');
  return {...finish(executionError ? 'ERROR' : failures.length ? 'FAILED' : 'PASSED WITH GAPS', [...gaps, ...failures]), gaps, failures, executionError};
 }
 if (facts.path === 'runtime') {
  // A broken harness cannot masquerade as a defect in the requested code.
  const policy = ['WATCHMAN_LIMIT', 'ACTION_BUDGET'].includes(facts.code);
  const attention = ['UNSUPPORTED_PERMISSION_REQUEST', 'TRIPWIRE'].includes(facts.code) || facts.code.startsWith('PLAYBOOK_');
  const phase = policy ? 'needs_you' : facts.aborted ? facts.queued ? 'needs_you' : 'interrupted' : attention ? 'needs_you' : 'harness_error';
  note('runtime', false, facts.reason);
  return finish('NOT CHECKED', [facts.reason], {phase});
 }
 if (facts.path === 'claims') {
  const required = facts.claims.filter(c => c.requirement === 'REQUIRED');
  const status = !required.length ? 'NOT CHECKED' : (['STALE', 'CANCELLED', 'ERROR', 'FAIL', 'NOT CHECKED'] as const).find(s => required.some(c => c.status === s)) ?? 'PASS';
  note('required-claims', status === 'PASS', required.length + ' required checks; aggregate ' + status + '.');
  return finish(status === 'PASS' ? 'VERIFIED' : status === 'FAIL' ? 'FAILED' : status === 'ERROR' ? 'ERROR' : 'NOT CHECKED', required.filter(c => c.status !== 'PASS' && c.reason).map(c => c.reason!), {status});
 }
 if (facts.path === 'combined') {
  // Caution table (lower wins); original reachable pairs use only the non-error rows.
  // FAILED: required failure > NOT CHECKED: missing required part > GAPS > VERIFIED.
  // ERROR never returned from the original adapter (it threw); retain a non-passing fallback.
  const caution = {'FAILED': 0, 'ERROR': 1, 'NOT CHECKED': 2, 'PASSED WITH GAPS': 3, 'VERIFIED': 4};
  const verdict = caution[facts.native.verdict] <= caution[facts.project.verdict] ? facts.native.verdict : facts.project.verdict;
  note('native-result', facts.native.verdict === 'VERIFIED', 'Native check: ' + facts.native.verdict + (facts.native.gaps.length || facts.native.failures.length ? ', because ' + [...facts.native.gaps, ...facts.native.failures].join('; ') : '.'));
  note('project-result', facts.project.verdict === 'VERIFIED', 'Project checks: ' + facts.project.verdict + (facts.project.gaps.length || facts.project.failures.length ? ' (gaps or failures: ' + [...facts.project.gaps, ...facts.project.failures].join('; ') + ').' : '.'));
  note('combined-checks', verdict !== 'FAILED' && verdict !== 'NOT CHECKED', 'Combined by caution order: ' + verdict + ' wins.');
  return finish(verdict, [...facts.native.gaps.map(g => 'Existing verifier: ' + g), ...facts.project.gaps, ...facts.native.failures, ...facts.project.failures]);
 }
 if (facts.path === 'playbook') {
  // Project commands prove regressions, not the new request itself.
  const failures = [...facts.failures, ...(facts.qualityGates ?? []).filter(g => g.status === 'FAIL').flatMap(g => g.findings.map(f => g.gate + ': ' + f.path + ':' + f.line + ' ' + f.message))];
  if (facts.tamperStatus === 'ERROR' || facts.qualityGates?.some(g => g.status === 'ERROR')) return {...finish('ERROR', ['Quality gate or test-tampering runner failed after BASE admission.']), failures};
  const verdict = failures.length ? 'FAILED' : 'PASSED WITH GAPS';
  note('project-checks', failures.length === 0, failures.length ? failures.join('; ') : 'The admitted project checks found no new failure.');
  note('new-behavior', false, 'Project checks alone do not prove the requested change.');
  return {...finish(verdict, [...facts.gaps, ...failures]), failures};
 }
 const {layers} = facts;
 const complete = [1, 2, 3].every(layer => layers.filter(l => l.layer === layer).length === 1) && layers.length === 3;
 const errors = layers.some(l => l.status === 'ERROR' || l.checks.some(c => c.status === 'ERROR'));
 const failures = layers.some(l => l.status === 'FAIL' || l.checks.some(c => c.status === 'FAIL'));
 const guards = layers.filter(l => l.layer === 1 || l.layer === 2).every(l => l.status === 'PASS' && l.checks.length > 0 && l.checks.every(c => c.status === 'PASS' || l.layer === 2 && c.status === 'NOT CHECKED' && c.baseStatus === 'FAIL'));
 const reasons = [...(facts.gaps ?? []).map(g => g.reason), ...layers.flatMap(l => [...l.gaps.map(g => g.reason), ...l.checks.filter(c => c.status === 'FAIL' || c.status === 'ERROR').map(c => c.id + ': ' + (c.reason ?? 'protected assertion failed'))])];
 note('complete-input', complete, complete ? 'All three check layers were supplied exactly once.' : 'Check layers are missing or repeated.');
 note('harness', !errors, errors ? 'A check reported an execution error.' : 'No supplied check reported an execution error.');
 // Error precedence and the recipe BASE exception intentionally match the frozen policy.
 if (!complete || errors) return finish('ERROR', reasons);
 note('protected-checks', !failures && guards, failures || !guards ? 'A required check failed, was empty, or did not pass.' : 'Protected tests and applicable project checks passed.');
 if (failures || !guards) return finish('FAILED', reasons);
 const gaps = (facts.gaps?.length ?? 0) > 0 || layers.some(l => l.gaps.length > 0 || l.status === 'NOT CHECKED' || l.checks.some(c => c.status === 'NOT CHECKED' && !(l.layer === 2 && c.baseStatus === 'FAIL')));
 note('coverage', !gaps, gaps ? 'Some behavior remains unchecked; the gaps are listed separately.' : 'All supplied authoritative layers passed without gaps.');
 return finish(gaps ? 'PASSED WITH GAPS' : 'VERIFIED', reasons);
}

/** Live checking and historical replay share this entry; neither may select just one required part. */
export function combineResults(native: Outcome, project: Outcome): VerdictDecision {
 const outcome=(v:Outcome):Outcome=>({verdict:v.verdict,gaps:v.gaps,failures:v.failures});
 return scoreVerdict({path: 'combined', native:outcome(native), project:outcome(project)});
}
