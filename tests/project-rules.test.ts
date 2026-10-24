import test from 'node:test';import assert from 'node:assert/strict';import {mkdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {resolve,join} from 'node:path';import {execFileSync} from 'node:child_process';
import {runProjectRules} from '../apps/server/project-rules.ts';
const rule={id:'no-db-in-ui',path:'ui/**',language:'python' as const,pattern:'import db',message:'The user interface must not import the database.'};
async function fixture(before:string,after:string,pattern='import db',exportFiles?:string[]){
 mkdirSync('.work/scion1',{recursive:true});const root=mkdtempSync(resolve('.work/scion1/rules-')),repo=join(root,'repo');mkdirSync(join(repo,'ui'),{recursive:true});const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
 try{git('init','-q');writeFileSync(join(repo,'README.md'),'Isolated fixture.\n');writeFileSync(join(repo,'ui/view.py'),before);git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','BASE');const base=git('rev-parse','HEAD');writeFileSync(join(repo,'ui/view.py'),after);git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','change');const candidate=git('rev-parse','HEAD');return await runProjectRules(repo,base,candidate,[{...rule,pattern}],join(root,'evidence'),new AbortController().signal,exportFiles);}finally{rmSync(root,{recursive:true,force:true});}
}
test('a new changed-line architectural violation fails with the approved message',{skip:process.platform!=='darwin',timeout:90000},async()=>{
 const result=await fixture('value=1\n','import db\nvalue=1\n');assert.equal(result.status,'FAIL');assert.equal(result.findings.length,1);assert.equal(result.findings[0]?.message,rule.message);assert.equal(result.preexisting.length,0);
});
test('a rule already failing on BASE is disclosed as pre-existing, not blamed on the change',{skip:process.platform!=='darwin',timeout:90000},async()=>{
 const result=await fixture('import db\nvalue=1\n','import db\nvalue=2\n');assert.equal(result.status,'PASS');assert.equal(result.findings.length,0);assert.equal(result.preexisting.length,1);
});
test('an invalid scanner rule is an execution error, never a clean pass',{skip:process.platform!=='darwin',timeout:90000},async()=>{
 await assert.rejects(fixture('value=1\n','value=2\n','def ( invalid'),/rule|scanner/i);
});

test('a multiline match fails when a changed interior line introduces the violation',{skip:process.platform!=='darwin',timeout:90000},async()=>{
 const result=await fixture('query(\n    safe=True\n)\n','query(\n    unsafe=True\n)\n','query(unsafe=True)');assert.equal(result.status,'FAIL');assert.equal(result.findings[0]?.line,1);
});

test('a changed rule target outside the approved export cannot be reported clean',{skip:process.platform!=='darwin',timeout:90000},async()=>{await assert.rejects(fixture('value=1\n','import db\nvalue=1\n','import db',['README.md']),/export|scope|scanner/i);});
