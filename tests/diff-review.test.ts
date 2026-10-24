import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {execFileSync} from 'node:child_process';import {openDatabase} from '../apps/server/database.ts';import {createTicketService} from '../apps/server/ticket-service.ts';
function fixture(){const root=mkdtempSync(join(tmpdir(),'cc-recheck-')),repo=join(root,'repo'),data=join(root,'data');mkdirSync(repo);const git=(...a:string[])=>execFileSync('git',['-C',repo,...a],{encoding:'utf8'}).trim();git('init','-q');writeFileSync(join(repo,'file'),'BASE');git('add','.');git('-c','user.name=test','-c','user.email=test@localhost','commit','-qm','BASE');const db=openDatabase(data,()=>{});return {root,repo,data,git,db};}
const cleanup={verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null};

test('amber Keep requires every file on exact current evidence; recheck invalidates views; discard needs no views',async()=>{
 const f=fixture();let checks=0;const service=createTicketService(f.db.connection,{port:0,dataDir:f.data,webRoot:f.root,development:false,projectRoots:[f.root]},{} as any,{driver:{run:async(c:any)=>{writeFileSync(join(c.workspace,'file'),'Candidate');writeFileSync(join(c.workspace,'second'),'two');writeFileSync(join(c.workspace,':(glob)*'),'literal path');return {summary:'done',checks:[],cleanup};},reconcile:async()=>cleanup} as any,check:async()=>({verdict:'PASSED WITH GAPS',gaps:['intent'],failures:[],evidenceHash:'check-'+(++checks)})});
 try{const t=await service.create({requestText:'Change two files',repoPath:f.repo});await service.idle();let v=service.show(t.id);const commit=v.ticket.candidateCommits.at(-1)!;
 assert.equal(v.keepAvailable,false);await assert.rejects(service.decide(t.id,'keep',commit),{code:'DIFF_REVIEW_REQUIRED'});
 const oldBinding=v.reviewBinding;
 for(const path of v.reviewPaths){const opened=await service.viewDiff(t.id,{candidateCommit:commit,reviewBinding:v.reviewBinding,path});assert.equal(opened.path,path);assert.match(opened.diff,/diff --git/);if(path===':(glob)*')assert.equal(opened.diff.includes('diff --git a/second'),false);}
 v=service.show(t.id);assert.equal(v.keepAvailable,true);assert.equal(v.viewedPaths.length,3);
 await assert.rejects(service.viewDiff(t.id,{candidateCommit:commit,reviewBinding:v.reviewBinding,path:'../elsewhere'}),{code:'STALE_DIFF'});
 service.recheck(t.id,commit);await service.idle();v=service.show(t.id);assert.notEqual(v.reviewBinding,oldBinding);assert.equal(v.keepAvailable,false);assert.deepEqual(v.viewedPaths,[]);
 await assert.rejects(service.viewDiff(t.id,{candidateCommit:commit,reviewBinding:oldBinding,path:'file'}),{code:'STALE_DIFF'});
 assert.equal((await service.decide(t.id,'discard')).status,'discarded');
 }finally{await service.close();f.db.close();}
});

for(const color of ['GREEN','AMBER','RED'] as const)test(color+' requires every changed file before Keep, with exact current binding',async()=>{
 const f=fixture();
 const qualityGates={version:'quality-gates-v1' as const,base:'base',candidate:'candidate',durationMs:1,gates:[{gate:'ruff' as const,status:'PASS' as const,findings:[],baselineCount:0,durationMs:1}]};
 const testTampering={status:color==='RED'?'FLAGGED' as const:'CLEAR' as const,flags:color==='RED'?[{path:'file',line:1,reason:'Review flag'}]:[],durationMs:1};
 const service=createTicketService(f.db.connection,{port:0,dataDir:f.data,webRoot:f.root,development:false,projectRoots:[f.root]},{} as any,{
  driver:{run:async(c:any)=>{writeFileSync(join(c.workspace,'file'),'Candidate');writeFileSync(join(c.workspace,'second'),'Two');return {summary:'done',checks:[],cleanup};},reconcile:async()=>cleanup} as any,
  check:async()=>({verdict:'VERIFIED',gaps:[],failures:[],evidenceHash:'current',testTampering,...(color==='AMBER'?{}:{qualityGates})})
 });
 try{
  const t=await service.create({requestText:'Change two source files',repoPath:f.repo});await service.idle();let view=service.show(t.id);
  assert.equal(view.risk.color,color);assert.equal(view.diffReviewRequired,true);assert.equal(view.keepAvailable,false);
  const commit=view.ticket.candidateCommits.at(-1)!;
  await assert.rejects(service.decide(t.id,'keep',commit),{code:'DIFF_REVIEW_REQUIRED'});
  for(const [index,path] of view.reviewPaths.entries()){
   await service.viewDiff(t.id,{candidateCommit:commit,reviewBinding:view.reviewBinding,path});
   assert.equal(service.show(t.id).keepAvailable,index===view.reviewPaths.length-1);
  }
  view=service.show(t.id);assert.equal(view.diffReviewRequired,false);assert.equal(view.keepAvailable,true);
  await assert.rejects(service.viewDiff(t.id,{candidateCommit:commit,reviewBinding:'stale',path:view.reviewPaths[0]!}),{code:'STALE_DIFF'});
  assert.equal((await service.decide(t.id,'discard')).status,'discarded');
 }finally{await service.close();f.db.close();}
});
