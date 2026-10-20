import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {explainTicket,formatExplanation} from '../apps/server/ticket-explain.ts';
import {scoreVerdict} from '../packages/shared/verdict-core.ts';
import type {TicketEvent} from '../packages/shared/tickets.ts';
const event=(data:Record<string,unknown>):TicketEvent=>({sequence:1,ticketId:'fixture',kind:'check_result',createdAt:'2026-01-01T00:00:00.000Z',data});
test('explain uses the exact core trace and does not invoke any agent or decision',()=>{
 const db=new DatabaseSync(':memory:');const scored=scoreVerdict({path:'playbook',failures:[],gaps:['Intent unchecked']});
 try{const before=db.prepare('PRAGMA data_version').get();const explained=explainTicket(db,[event({verdict:scored.verdict,coreTrace:scored.trace})]);assert.equal(explained.source,'recorded');assert.deepEqual(explained.trace,scored.trace);assert.match(formatExplanation(explained),/project checks found no new failure/);assert.deepEqual(db.prepare('PRAGMA data_version').get(),before);}finally{db.close();}
});
test('explain replays historical playbook facts honestly and refuses to invent missing facts',()=>{
 const db=new DatabaseSync(':memory:');try{const replay=explainTicket(db,[event({verdict:'PASSED WITH GAPS',playbookResultPath:'/not-read',gaps:['Intent unchecked'],failures:[]})]);assert.equal(replay.matches,true);assert.match(formatExplanation(replay),/not a fresh check/);assert.equal(explainTicket(db,[event({verdict:'NOT CHECKED',harnessError:true})]).source,'unavailable');assert.equal(explainTicket(db,[]).source,'unavailable');}finally{db.close();}
});
test('all reconstructible explanations match the pre-refactor current-policy golden',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE verify_only_runs(id TEXT,result_json TEXT)');const golden=JSON.parse(readFileSync(new URL('../artifacts/core1/golden.json',import.meta.url),'utf8'));for(const r of golden.runs)db.prepare('INSERT INTO verify_only_runs VALUES(?,?)').run(r.id,JSON.stringify(r.result));
 try{const policy=JSON.parse(readFileSync(new URL('../artifacts/core1/current-policy-golden.json',import.meta.url),'utf8'));for(const row of policy.entries){const r=golden.checks.find((r:{sequence:number})=>r.sequence===row.sequence);const result=explainTicket(db,[event(r.record)]);assert.equal(result.source,'replayed');assert.equal(result.trace.at(-1)!.explanation,'Result: '+row.expected.verdict+'. This never accepts the change.');assert.equal(r.record.verdict,row.sequence===586?'PASSED WITH GAPS':row.expected.verdict);}}finally{db.close();}
});

test('event 592 combines the missing native recipe with passing playbook facts as NOT CHECKED',()=>{
 const golden=JSON.parse(readFileSync(new URL('../artifacts/core1/golden.json',import.meta.url),'utf8'));
 const check=golden.checks.find((r:{sequence:number})=>r.sequence===592);
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE verify_only_runs(id TEXT,result_json TEXT)');for(const r of golden.runs)db.prepare('INSERT INTO verify_only_runs VALUES(?,?)').run(r.id,JSON.stringify(r.result));
 try{assert.equal(check.record.verdict,'NOT CHECKED');const result=explainTicket(db,[event(check.record)]);assert.equal(result.source,'replayed');assert.equal(result.matches,true);assert.match(result.trace.at(-1)!.explanation,/Result: NOT CHECKED/);}finally{db.close();}
});

test('explain selects the latest check sequence, never a later runtime trace, and prints its stored verdict',()=>{
 const db=new DatabaseSync(':memory:');try{
 const latest={...event({verdict:'NOT CHECKED',coreTrace:scoreVerdict({path:'unsupported',reason:'Required recipe missing'}).trace}),sequence:592};
 const older={...event({verdict:'PASSED WITH GAPS',coreTrace:scoreVerdict({path:'playbook',gaps:[],failures:[]}).trace}),sequence:586};
 const runtime={...older,kind:'agent_event' as const,sequence:600};
 const result=explainTicket(db,[latest,runtime,older]);assert.equal(result.eventSequence,592);assert.equal(result.verdict,latest.data.verdict);assert.match(formatExplanation(result),/Event 592 \(stored result: NOT CHECKED\)/);
 }finally{db.close();}
});
