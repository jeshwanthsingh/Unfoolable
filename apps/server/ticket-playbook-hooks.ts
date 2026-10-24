import {classifyChange} from './change-classification.ts';
import {reviewRisk} from './review-risk.ts';
import {reviewTestEdits} from './test-edit-review.ts';
import {readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import type {TicketCheck} from './ticket-checker.ts';
import {combineResults} from '../../packages/shared/verdict-core.ts';
import {prepareTicketDependencies} from './ticket-dependencies.ts';
import {existsSync,symlinkSync,realpathSync} from 'node:fs';import {join} from 'node:path';
import type {TicketLoopDependencies} from './ticket-loop.ts';import type {createPlaybookChecks} from './playbook-checks.ts';import type {createTicketChecker} from './ticket-checker.ts';import {ProjectPlaybookError} from './project-playbooks.ts';
export function ticketPlaybookHooks(playbooks:ReturnType<typeof createPlaybookChecks>,nativeCheck:ReturnType<typeof createTicketChecker>):TicketLoopDependencies{
 return {
  ensurePlaybook:async(ticket,signal)=>{
   await playbooks.store.proposeGates(ticket.repoPath,ticket.baseCommit);
   const approved=playbooks.store.requireApproved(ticket.repoPath);
   await playbooks.admit(approved,ticket.repoPath,ticket.baseCommit,signal);
  },
  prepareBuild:async(ticket,owned,signal)=>prepareTicketDependencies(owned,playbooks.store.requireApproved(ticket.repoPath).definition,signal),
  check:async(ticket,candidate,signal,progress)=>{
   const approved=playbooks.store.requireApproved(ticket.repoPath);
   const finish=async(check:TicketCheck):Promise<TicketCheck>=>{
    let classification:TicketCheck['classification'];
    try{classification=await classifyChange(candidate.repo,ticket.baseCommit,candidate.commit,join(dirname(candidate.diffPath),'classification'),signal);}catch(error){if(signal.aborted||(error as {oracleCleanup?:unknown}).oracleCleanup)throw error;}
    const risk=reviewRisk(check,candidate.paths,readFileSync(candidate.diffPath,'utf8'),approved.definition.diffCap,reviewTestEdits(candidate.repo,ticket.baseCommit,candidate.commit,candidate.paths),{classification,rules:approved.definition.riskRules??[]});
    return {...check,...(classification?{classification}:{}),reviewRisk:risk};
   };
   if(approved.definition.runner==='node-script')return finish(await playbooks.check(approved,candidate.repo,ticket.baseCommit,candidate.commit,signal,progress));
   if(approved.definition.runner==='vitest'&&approved.definition.tests.some(c=>c.cwd==='frontend')){
    const path=join(candidate.repo,'frontend','node_modules');
    if(!existsSync(path))symlinkSync(realpathSync(join(ticket.repoPath,'frontend','node_modules')),path);
   }
   // Retain the existing protected native gate before the additional project commands.
   const native=await nativeCheck(ticket,candidate,signal);
   if(playbooks.store.requireApproved(ticket.repoPath).hash!==approved.hash)throw new ProjectPlaybookError('PLAYBOOK_CHANGED','Playbook approval changed during native checking.');
   if(native.verdict==='FAILED')return finish({...native,playbookHash:approved.hash});
   const project=await playbooks.check(approved,candidate.repo,ticket.baseCommit,candidate.commit,signal,progress);
   const combined=combineResults(native,project);
   return finish({...native,...project,coreFacts:combined.facts,coreTrace:combined.trace,verdict:combined.verdict as typeof native.verdict,gaps:[...native.gaps.map(g=>'Existing verifier: '+g),...project.gaps],failures:[...native.failures,...project.failures]});
  }
 };
}
