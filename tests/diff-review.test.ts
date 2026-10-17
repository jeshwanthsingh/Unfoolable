import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {execFileSync} from 'node:child_process';import {openDatabase} from '../apps/server/database.ts';import {createTicketService} from '../apps/server/ticket-service.ts';import {createTicketLoop} from '../apps/server/ticket-loop.ts';import {createTicketQueue} from '../apps/server/ticket-queue.ts';import {createTicket,transitionTicket,updateTicket,beginTicketRecheck,getTicket,listTicketEvents} from '../apps/server/ticket-store.ts';
function fixture(){const root=mkdtempSync(join(tmpdir(),'cc-recheck-')),repo=join(root,'repo'),data=join(root,'data');mkdirSync(repo);const git=(...a:string[])=>execFileSync('git',['-C',repo,...a],{encoding:'utf8'}).trim();git('init','-q');writeFileSync(join(repo,'file'),'BASE');git('add','.');git('-c','user.name=test','-c','user.email=test@localhost','commit','-qm','BASE');const db=openDatabase(data,()=>{});return {root,repo,data,git,db};}
const cleanup={verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null};

test('amber Keep requires every file on exact current evidence; recheck invalidates views; discard needs no views',async()=>{
 const f=fixture();let checks=0;const service=createTicketService(f.db.connection,{port:0,dataDir:f.data,webRoot:f.root,development:false,projectRoots:[f.root]},{} as any,{driver:{run:async(c:any)=>{writeFileSync(join(c.workspace,'file'),'Candidate');writeFileSync(join(c.workspace,'second'),'two');return {summary:'done',checks:[],cleanup};},reconcile:async()=>cleanup} as any,check:async()=>({verdict:'PASSED WITH GAPS',gaps:['intent'],failures:[],evidenceHash:'check-'+(++checks)})});
 try{const t=await service.create({requestText:'Change two files',repoPath:f.repo});await service.idle();let v=service.show(t.id);const commit=v.ticket.candidateCommits.at(-1)!;
 assert.equal(v.keepAvailable,false);await assert.rejects(service.decide(t.id,'keep',commit),{code:'DIFF_REVIEW_REQUIRED'});
 const oldBinding=v.reviewBinding;
 for(const path of v.reviewPaths){const opened=await service.viewDiff(t.id,{candidateCommit:commit,reviewBinding:v.reviewBinding,path});assert.equal(opened.path,path);assert.match(opened.diff,/diff --git/);}
 v=service.show(t.id);assert.equal(v.keepAvailable,true);assert.equal(v.viewedPaths.length,2);
 await assert.rejects(service.viewDiff(t.id,{candidateCommit:commit,reviewBinding:v.reviewBinding,path:'../elsewhere'}),{code:'STALE_DIFF'});
 service.recheck(t.id,commit);await service.idle();v=service.show(t.id);assert.notEqual(v.reviewBinding,oldBinding);assert.equal(v.keepAvailable,false);assert.deepEqual(v.viewedPaths,[]);
 await assert.rejects(service.viewDiff(t.id,{candidateCommit:commit,reviewBinding:oldBinding,path:'file'}),{code:'STALE_DIFF'});
 assert.equal((await service.decide(t.id,'discard')).status,'discarded');
 }finally{await service.close();f.db.close();}
});
