import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILDER_RULES_ENABLED,KARPATHY_RULES,withBuilderRules} from '../apps/server/builder-instructions.ts';
import {TICKET_BUILDER_PROMPT,runBuilderSupervisorFixture} from '../apps/server/build-runtime.ts';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {BUILDER_PROMPT} from '../apps/server/build-compatibility.ts';

test('rules OFF preserves every existing Builder instruction byte',()=>{for(const original of [TICKET_BUILDER_PROMPT,BUILDER_PROMPT])assert.equal(withBuilderRules(original,false),original);});
test('rules ON adds all four principles without replacing safety instructions',()=>{for(const original of [TICKET_BUILDER_PROMPT,BUILDER_PROMPT]){const prompt=withBuilderRules(original,true);assert.equal(prompt,original+'\n\n'+KARPATHY_RULES);for(const rule of ['Think before coding','Simplicity first','Surgical changes','Goal-driven'])assert.ok(prompt.includes(rule));assert.ok(prompt.includes('Do not'));}assert.ok(KARPATHY_RULES.length<1400);});
test('ordinary request data cannot select rules or alter the owned block',()=>{assert.equal(withBuilderRules('fixed',false),'fixed');assert.equal(withBuilderRules('fixed',true),'fixed\n\n'+KARPATHY_RULES);assert.equal(typeof BUILDER_RULES_ENABLED,'boolean');});
test('the application does not write rule files into user repositories',()=>{const source=readFileSync(new URL('../apps/server/builder-instructions.ts',import.meta.url),'utf8');assert.doesNotMatch(source,/node:fs|writeFile|appendFile|AGENTS\.md/);});

for(const enabled of [false,true])test('the actual supervisor sends the chosen rule block in thread/start: '+enabled,async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-builder-rules-')),workspace=join(root,'workspace'),artifactDir=join(root,'artifacts');mkdirSync(workspace);mkdirSync(artifactDir);
 const script=join(root,'server.cjs');writeFileSync(script,`const fs=require('fs'),r=require('readline');const send=m=>process.stdout.write(JSON.stringify(m)+'\\n');r.createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(!m.id)return;const ok=result=>send({id:m.id,result});if(m.method==='initialize')return ok({});if(m.method==='thread/start'){fs.writeFileSync('instructions.txt',m.params.developerInstructions);return ok({thread:{id:'thread',cliVersion:'0.160.0'},sandbox:{type:'workspaceWrite',networkAccess:false}});}if(m.method==='turn/start'){ok({turn:{id:'turn'}});return send({method:'turn/completed',params:{threadId:'thread',turn:{id:'turn',status:'completed'}}});}if(m.method==='thread/backgroundTerminals/list')return ok({data:[],nextCursor:null});return ok({});});`);
 try{const result=await runBuilderSupervisorFixture({attemptId:'attempt',generation:1,transportId:'transport',workspace,artifactDir,dataDir:root,sourceRoot:workspace,gitCommonDir:join(workspace,'.git')},{version:'ticket-builder-v1',requestText:'rulesEnabled='+!enabled} as any,new AbortController().signal,{binding:()=>{},processes:()=>{},event:()=>true,truncated:()=>{}},{launcher:process.execPath,args:[script],env:{PATH:process.env.PATH,HOME:workspace},timeoutMs:10000},enabled);assert.equal(result.cleanup.verified,true);assert.equal(readFileSync(join(workspace,'instructions.txt'),'utf8'),withBuilderRules(TICKET_BUILDER_PROMPT,enabled));}finally{rmSync(root,{recursive:true,force:true});}
});
