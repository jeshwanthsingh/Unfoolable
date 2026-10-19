import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {taskPresentation,mayAccept,awaySummary,latestCheckEvent,proofLines,words,aiNotePreview} from '../apps/web/src/unfoolable-model.ts';
import type {Ticket,TicketEvent} from '../packages/shared/tickets.ts';
import type {Detail} from '../apps/web/src/TicketPanel.tsx';
const ticket:Ticket={id:'one',title:'Fix a label',requestText:'Fix a label',repoPath:'/fixture',baseCommit:'a'.repeat(40),status:'ready_for_review',attemptCount:1,candidateCommits:['b'.repeat(40)],checkVerdict:'VERIFIED',createdAt:'2026-10-18T10:00:00Z',updatedAt:'2026-10-18T10:00:00Z'};
const detail=(patch:Partial<Detail>={}):Detail=>({ticket,events:[],stats:{submitToReviewMs:100,agentWorkingMs:100,agentTimeIncomplete:false,needsYouStops:0,fixAttempts:0,finalVerdict:'VERIFIED',decision:null},check:{verdict:'VERIFIED',gaps:[],failures:[]},diffAvailable:true,keepAvailable:true,diffReviewRequired:false,...patch});
test('hallmarks follow actual stored outcomes, with no implied success from missing detail',()=>{
 assert.equal(taskPresentation(ticket).mark,'waiting');
 assert.equal(taskPresentation(ticket,detail()).mark,'checked');
 assert.equal(taskPresentation({...ticket,status:'kept',checkVerdict:'PASSED WITH GAPS'},detail({check:{verdict:'PASSED WITH GAPS',gaps:['unchecked'],failures:[]}})).tone,'closer');
 assert.equal(taskPresentation(ticket,detail({check:{verdict:'PASSED WITH GAPS',gaps:['not checked'],failures:[]}})).mark,'closer');
 assert.equal(taskPresentation(ticket,detail({check:{verdict:'FAILED',gaps:[],failures:['failed']}})).mark,'wrong');
 assert.equal(taskPresentation({...ticket,status:'needs_you',checkVerdict:'FAILED'},detail({check:{verdict:'FAILED',gaps:[],failures:['failed']}})).mark,'wrong');
 assert.equal(taskPresentation(ticket,detail({check:{verdict:'NOT CHECKED',gaps:[],failures:[]}})).mark,'closer');
 assert.equal(taskPresentation(ticket,detail({evidenceStale:true})).mark,'recheck');
 assert.equal(taskPresentation({...ticket,status:'kept'},detail({risk:{color:'RED',reason:'Existing test changed',files:1,changedLines:1,cap:{lines:400,files:15}}})).tone,'wrong');
});
test('working time starts from the recorded transition; stopped work does not look busy',()=>{
 const working={...ticket,status:'building' as const};
 assert.equal(taskPresentation(working,detail(),Date.parse(ticket.updatedAt)+120000).sentence,'Working on it for 2 minutes.');
 for(const status of ['harness_error','interrupted','cancelled'] as const)assert.equal(taskPresentation({...ticket,status},detail()).mark,'stuck');
 assert.doesNotMatch(taskPresentation({...ticket,status:'cancelled'},detail()).sentence,/Try again|reject/);
 assert.equal(taskPresentation({...ticket,status:'queued'},detail()).mark,'waiting');
 assert.equal(taskPresentation({...ticket,status:'needs_you'},detail()).mark,'needs');
});
test('Accept requires fresh passing server availability and every file opened',()=>{
 assert.equal(mayAccept(detail()),true);
 for(const verdict of ['FAILED','NOT CHECKED'] as const)assert.equal(mayAccept(detail({check:{verdict,gaps:[],failures:[]}})),false);
 for(const patch of [{keepAvailable:false},{evidenceStale:true},{diffReviewRequired:true},{ticket:{...ticket,status:'building' as const}},{ticket:{...ticket,candidateCommits:[]}}])assert.equal(mayAccept(detail(patch)),false);
});
test('tampering and independent-test warnings remain conspicuous',()=>{
 const d=detail({check:{verdict:'VERIFIED',gaps:[],failures:[],testTampering:{status:'FLAGGED',flags:[],durationMs:1}}});
 assert.equal(taskPresentation(ticket,d).sentence,words.wrong);assert.equal(proofLines(d).some(l=>l.mark==='wrong'),true);
});
test('proof never invents test totals, password checks or tampering success',()=>{
 const missing=detail();delete missing.check;const lines=proofLines(missing);assert.equal(lines.some(l=>l.mark==='checked'),false);
 assert.equal(lines.some(l=>/password/.test(l.text)),false);assert.equal(lines.some(l=>/172/.test(l.text)),false);
});
test('the away summary counts real current states in its stated time window',()=>{
 assert.equal(awaySummary([ticket,{...ticket,id:'two',status:'kept'}],Date.parse('2026-10-18T12:00:00Z')),'1 decided today. 1 waiting; scroll to see all.');
 assert.match(awaySummary([ticket],Date.parse('2026-10-20T12:00:00Z')),/1 waiting; scroll to see all/);
 assert.equal(awaySummary([],Date.now()),'Nothing needs a decision right now.');
});
test('strike identity comes only from recorded check results',()=>{
 const events:TicketEvent[]=[{sequence:1,ticketId:'one',kind:'check_result',data:{},createdAt:ticket.updatedAt},{sequence:2,ticketId:'one',kind:'agent_event',data:{},createdAt:ticket.updatedAt}];
 assert.equal(latestCheckEvent(events),1);assert.equal(latestCheckEvent([...events]),1);assert.equal(latestCheckEvent([]),0);
});
test('main authored statuses are plain, short and free of technical labels',()=>{
 const forbidden=/\b(candidate|base|playbook|verdict|harness|mutation|tripwire|watchman|worktree|admission|gate|evidence)\b/i;
 const statuses=[...Object.values(words),...(['building','checking','fixing','queued','kept','discarded','needs_you','ready_for_review','harness_error','interrupted','cancelled'] as const).map(status=>taskPresentation({...ticket,status},detail()).sentence)];
 for(const line of statuses){assert.doesNotMatch(line,forbidden);assert.doesNotMatch(line,/ · |^[A-Z][A-Z\s]+$/);assert.ok(line.split(/\s+/).length<=12,line);}
 assert.equal(aiNotePreview([{sequence:1,ticketId:'one',kind:'agent_stopped',data:{summary:'Candidate passed the BASE gate.'},createdAt:ticket.updatedAt}]),'Read the original AI note in Technical details.');
 const source=readFileSync('apps/web/src/UnfoolableApp.tsx','utf8');for(const match of source.matchAll(/<button\b[^>]*>([^<{]+)<\/button>/g))assert.doesNotMatch(match[1]!,/→| · |^[A-Z][A-Z\s]+$/);
});
test('Hallmark design bans gradients, glass blur and soft-shadow card lists',()=>{
 const css=readFileSync('apps/web/src/unfoolable.css','utf8');assert.doesNotMatch(css,/gradient\s*\(|backdrop-filter\s*:|filter\s*:\s*blur/i);
 const row=css.match(/\.unfool-task\{([^}]+)\}/)?.[1]??'';assert.match(row,/box-shadow:none/);assert.match(row,/border-radius:16px/);
});
test('proof uses native modal focus handling and finite reduced-motion aware strike',()=>{
 const proof=readFileSync('apps/web/src/UnfoolableProof.tsx','utf8'),mark=readFileSync('apps/web/src/Hallmark.tsx','utf8');assert.match(proof,/showModal\(/);assert.match(proof,/returnFocus/);assert.match(proof,/onCancel/);assert.match(mark,/document.hidden\|\|reduce/);assert.match(mark,/duration:\.18,bounce:0/);assert.doesNotMatch(mark,/requestAnimationFrame|setInterval/);
});

test('offline and initial loading never assert an empty or decision-free account',()=>{const source=readFileSync('apps/web/src/UnfoolableApp.tsx','utf8');assert.match(source,/offline\?'Your saved work will return/);assert.match(source,/!offline&&key&&!data.tickets.length/);});

test('unfool retains the same executable and exposes branded help without a server',()=>{assert.equal(readlinkSync('unfool'),'cc');const help=execFileSync('./unfool',['--help'],{encoding:'utf8'});assert.match(help,/Unfoolable/);assert.match(help,/Aliases: unfool and cc/);});
