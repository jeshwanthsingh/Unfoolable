// Explicit bounded development run: five independent cases, one analyzer call per case.
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {buildAnalysisPacket} from '../apps/server/analysis-packet.ts';
import {observeRepository} from '../apps/server/context-repository.ts';
import {payloadHash} from '../apps/server/context-observation.ts';
import {analyzeMission} from '../apps/server/mission-analyzer.ts';
import {validateAnalysisResult} from '../apps/server/analysis-validation.ts';
const cases=JSON.parse(readFileSync('tests/fixtures/clarification-quality.json','utf8'));
const artifacts=resolve('artifacts/breakout-4');mkdirSync(artifacts,{recursive:true});
const results=[];
for(const sample of cases){
 const root=mkdtempSync(join(tmpdir(),'cc-quality-'));const git=(...args)=>execFileSync('git',['--no-optional-locks','-C',root,...args],{encoding:'utf8',env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}}).trim();
 try{git('init','-q','-b','main');for(const [path,text] of Object.entries(sample.files)){mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),text+'\n');}git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','quality fixture');
  const {realpathSync}=await import('node:fs');const canonical=realpathSync(root);const mission={id:randomUUID(),projectId:randomUUID(),originalIntent:sample.intent,phase:'DRAFT',createdAt:new Date().toISOString()};const payload=await observeRepository(canonical,[canonical],()=>{});const snapshot={id:randomUUID(),missionId:mission.id,payload,snapshotHash:payloadHash(payload),createdAt:new Date().toISOString()};const built=await buildAnalysisPacket(mission,snapshot,canonical,[canonical],()=>{});const analyzed=await analyzeMission(built.packet,new AbortController().signal);const output=validateAnalysisResult(analyzed.output,built.packet);
  const questions=output.questions;const all=JSON.stringify(output);let pass=true;
  if(sample.expected==='performance')pass=questions.some(q=>q.decisionArea==='performance'&&/target|workload|latency|throughput|measure/i.test(q.question))&&!/p95\s*[<=>]\s*100|\b100\s*ms/i.test(all);
  if(sample.expected==='compatibility-known')pass=!questions.some(q=>/(?:should|must|do we|whether).*(?:preserve|maintain|matter).*compatib|compatibility.*matter/i.test(q.question));
  if(sample.expected==='deletion')pass=questions.some(q=>/soft|permanent|retention|eras|recover/i.test(q.question));
  if(sample.expected==='clear-bug')pass=questions.length<=1;
  if(sample.expected==='migration')pass=questions.some(q=>['migration','data'].includes(q.decisionArea)&&/existing|backfill|default/i.test(q.question));
  const row={id:sample.id,pass,expected:sample.expected,packetHash:built.hash,packetMillis:built.elapsedMs,analysisMillis:analyzed.elapsedMs,version:analyzed.toolVersion,questions,understanding:output.understanding};results.push(row);console.log(JSON.stringify({id:row.id,pass:row.pass,questions:questions.length,packetMillis:row.packetMillis,analysisMillis:row.analysisMillis}));writeFileSync(join(artifacts,'quality-results.json'),JSON.stringify(results,null,2));
 }catch(error){results.push({id:sample.id,pass:false,error:error.message});writeFileSync(join(artifacts,'quality-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({id:sample.id,pass:false,error:error.message}));}
 finally{rmSync(root,{recursive:true,force:true});}
}
if(results.some(r=>!r.pass))process.exitCode=1;
