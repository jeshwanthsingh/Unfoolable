import test from 'node:test';import assert from 'node:assert/strict';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from 'vite';
import {ticketStatuses} from '../packages/shared/tickets.ts';import {needsYouTickets} from '../apps/web/src/task-groups.ts';
// Render the actual page, replacing only its HTTP data hook. No database or real operator capability.
test('rendered greeting equals rendered Needs you heading for every state, drafts, empty and paged lists',async()=>{
 const previous=new Map<string,PropertyDescriptor|undefined>();const fixtures:Record<string,unknown>={};
 for(const [key,value] of Object.entries({window:{location:{hash:'',search:'',href:'http://localhost/'}},location:{search:'',href:'http://localhost/'},sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null},matchMedia:()=>({matches:false}),__ui7bCountData:fixtures})){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value,writable:true});}
 const server=await createServer({configFile:'apps/web/vite.config.ts',server:{middlewareMode:true,watch:null},appType:'custom',plugins:[{name:'isolated-page-data',enforce:'pre',resolveId(source,importer){if(source==='./useUnfoolableData.ts'&&importer?.endsWith('/UnfoolableApp.tsx'))return '\0isolated-counts';},load(id){if(id==='\0isolated-counts')return 'export function useUnfoolableData(){return globalThis.__ui7bCountData} export function localRequest(){throw Error("No HTTP in renderer test")}'}}]});
 try{
  const {UnfoolableApp}=await server.ssrLoadModule('/src/UnfoolableApp.tsx');const now=new Date().toISOString();
  const row=(status:string,id='x')=>({id,title:'A plain request',status,checkVerdict:null,createdAt:now,updatedAt:now,revision:1,summary:{result:null,gaps:0,wrong:false}});
  const draft=(status:string)=>({id:'draft-'+status,originalMessageId:1,version:1,status,title:'A draft',repoPath:'/isolated',requestText:'A request',doneMeans:'A result',question:status==='QUESTION'?'Which folder?':null,questionAsked:status==='QUESTION',usage:[],ticketId:null,createdAt:now,updatedAt:now});
  const cases=[[],...ticketStatuses.map(s=>[row(s)]),ticketStatuses.map((s,i)=>row(s,String(i))),Array.from({length:50},(_,i)=>row('ready_for_review',String(i)))];
  for(const tickets of cases)for(const drafts of [[],['DRAFT','QUESTION','ERROR','STARTED','STARTING','CANCELLED'].map(draft)]){
   Object.assign(fixtures,{tickets,details:{},chat:{drafts,cards:[],messages:[]},error:null,loading:false,backOnline:false,observedAt:now,loadDetail:async()=>{}});
   const html=renderToStaticMarkup(createElement(UnfoolableApp));const greeting=/<section class="unfool-greeting"[\s\S]*?<\/section>/.exec(html)?.[0]??'';
   const count=Number(/(\d+) (?:thing needs|things need) you/.exec(greeting)?.[1]??0),heading=Number(/<h2>Needs you <span>(\d+)<\/span>/.exec(html)?.[1]??0);
   assert.equal(count,heading,JSON.stringify({states:tickets.map(t=>t.status),drafts:drafts.map(d=>d.status)}));assert.equal(count,needsYouTickets(tickets).length);
  }
 }finally{await server.close();for(const [key,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
});
