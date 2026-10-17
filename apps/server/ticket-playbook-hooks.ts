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
  check:async(ticket,candidate,signal)=>{
   const approved=playbooks.store.requireApproved(ticket.repoPath);
   if(approved.definition.runner==='node-script')return playbooks.check(approved,candidate.repo,ticket.baseCommit,candidate.commit,signal);
   if(approved.definition.runner==='vitest'&&approved.definition.tests.some(c=>c.cwd==='frontend')){
    const path=join(candidate.repo,'frontend','node_modules');
    if(!existsSync(path))symlinkSync(realpathSync(join(ticket.repoPath,'frontend','node_modules')),path);
   }
   // Retain the existing protected native gate before the additional project commands.
   const native=await nativeCheck(ticket,candidate,signal);
   if(playbooks.store.requireApproved(ticket.repoPath).hash!==approved.hash)throw new ProjectPlaybookError('PLAYBOOK_CHANGED','Playbook approval changed during native checking.');
   if(native.verdict==='FAILED')return {...native,playbookHash:approved.hash};
   const project=await playbooks.check(approved,candidate.repo,ticket.baseCommit,candidate.commit,signal);
   return {...native,...project,verdict:project.verdict==='FAILED'?'FAILED':native.verdict==='NOT CHECKED'?'NOT CHECKED':project.verdict,gaps:[...native.gaps.map(g=>'Existing verifier: '+g),...project.gaps],failures:[...native.failures,...project.failures]};
  }
 };
}
