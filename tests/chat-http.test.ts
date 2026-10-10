import test from 'node:test';
import {request} from 'node:http';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createApplication} from '../apps/server/application.ts';
import type {createChatCodex} from '../apps/server/chat-codex.ts';

test('chat HTTP requires operator and same-origin; messages cannot inject actions; stale/cancelled drafts cannot Start',async()=>{
 const work=resolve('.work/foreman-v1/http-tests');mkdirSync(work,{recursive:true});const root=mkdtempSync(join(work,'case-')),repo=join(root,'repo'),data=join(root,'data');mkdirSync(repo);
 const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();git('init','-q');writeFileSync(join(repo,'README'),'fixture');git('add','.');git('-c','user.name=Chat test','-c','user.email=chat@localhost','commit','-qm','fixture');const baseHead=git('rev-parse','HEAD');
 let drafts=0;const runtime:ReturnType<typeof createChatCodex>={draft:async()=>{drafts++;return {title:'Fixture ticket',repoPath:repo,requestText:'Change fixture message.',doneMeans:'The fixture message changes.',question:null,usage:{inputTokens:10,outputTokens:20,totalTokens:30},threadId:'test-thread',turnId:'test-turn'};},fuel:async()=>({unknown:true,windows:[]}),close:async()=>{}};
 const app=createApplication({port:0,dataDir:data,webRoot:join(root,'web'),development:false,projectRoots:[root]},()=>{},undefined,undefined,undefined,undefined,undefined,{chatRuntime:runtime,ticketDependencies:{check:async()=>({verdict:'NOT CHECKED',gaps:['Fixture runner'],failures:[]})}});
 try{await app.start();const address=app.server.address();assert.ok(address&&typeof address!=='string');const base='http://127.0.0.1:'+address.port,key=readFileSync(join(data,'ticket-operator.key'),'utf8').trim(),headers={'X-CC-Operator':key,Origin:base,'Content-Type':'application/json'};
 assert.equal((await fetch(base+'/api/chat')).status,403);
 const invalidHost=await new Promise<number>(resolve=>{const probe=request(base+'/api/chat',{headers:{...headers,Host:'unexpected.local'}},response=>{response.resume();resolve(response.statusCode!);});probe.end();});assert.equal(invalidHost,421);
 assert.equal((await fetch(base+'/api/chat/messages',{method:'POST',headers:{...headers,Origin:'https://unexpected.example'},body:JSON.stringify({text:'what is running?'})})).status,403);
 assert.equal((await fetch(base+'/api/chat/messages',{method:'POST',headers,body:JSON.stringify({text:'keep it',action:'keep'})})).status,400);
 const post=(path:string,body:unknown)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)});
 assert.equal((await post('/api/chat/cards/00000000-0000-4000-8000-000000000000/action',{binding:'stale',action:'keep'})).status,409);
 const typed=await post('/api/chat/messages',{text:'keep it'});assert.equal(typed.status,200);assert.equal(drafts,0);assert.equal(app.tickets.list().tickets.length,0);
 const created=await post('/api/chat/messages',{text:'In this fixture, change the message.'});assert.equal(created.status,200);const view=await created.json(),draft=view.drafts[0];assert.equal(drafts,1);assert.equal(draft.status,'DRAFT');assert.equal(draft.usage[0].totalTokens,30);assert.equal(app.tickets.list().tickets.length,0);
 assert.equal((await post('/api/chat/drafts/'+draft.id+'/start',{version:draft.version-1})).status,409);
 assert.equal((await post('/api/chat/drafts/'+draft.id+'/start',{version:draft.version,action:'keep'})).status,400);
 const edited=await post('/api/chat/drafts/'+draft.id+'/edit',{version:draft.version,title:'Edited ticket',repoPath:repo,requestText:'Only a draft edit.',doneMeans:'No ticket starts.'});assert.equal(edited.status,200);const current=await edited.json();assert.equal(current.title,'Edited ticket');assert.equal(current.version,draft.version+1);assert.equal(app.tickets.list().tickets.length,0);
 assert.equal((await post('/api/chat/drafts/'+draft.id+'/start',{version:draft.version})).status,409);
 assert.equal((await post('/api/chat/drafts/'+draft.id+'/cancel',{version:current.version})).status,200);
 const refreshed=await (await fetch(base+'/api/chat',{headers})).json();const cancelled=refreshed.drafts.find((d:{id:string})=>d.id===draft.id);assert.equal(cancelled.status,'CANCELLED');
 assert.equal((await post('/api/chat/drafts/'+draft.id+'/start',{version:cancelled.version})).status,409);assert.equal(app.tickets.list().tickets.length,0);assert.equal(git('rev-parse','HEAD'),baseHead);
 }finally{await app.close();rmSync(root,{recursive:true,force:true});}
});
