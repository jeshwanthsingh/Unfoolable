// Development-only: six fixed small subscription-backed drafts; --recheck performs no AI call.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {draftMissionPlan} from '../apps/server/planning-drafter.ts';
import {validatePlanningPayload} from '../apps/server/planning-validation.ts';
import {canonicalContractJson} from '../apps/server/contract-store.ts';
import {checkPlanningQuality} from './planning-quality-check.ts';
const fixtures=JSON.parse(readFileSync('tests/fixtures/planning-quality.json','utf8')),artifact=resolve('artifacts/breakout-6');mkdirSync(artifact,{recursive:true});const results=[];
const recheck=process.argv.includes('--recheck'),prior=recheck?JSON.parse(readFileSync(join(artifact,'quality-results.json'),'utf8')):[];
for(const fixture of fixtures){
 try{
  const inputHash=createHash('sha256').update(canonicalContractJson(fixture.input)).digest('hex'),previous=prior.find(r=>r.name===fixture.name);
  if(recheck&&(!previous?.payload||previous.inputHash!==inputHash))throw Error('Recorded result does not match fixture input.');
  const generated=recheck?{output:previous.payload,toolVersion:previous.version,elapsedMs:previous.elapsedMs}:await draftMissionPlan(fixture.input,new AbortController().signal);
  const {payload,coverage}=validatePlanningPayload(generated.output,fixture.input),pass=checkPlanningQuality(fixture.name,payload);
  results.push({name:fixture.name,pass,inputHash,version:generated.toolVersion,promptVersion:fixture.input.promptVersion,elapsedMs:generated.elapsedMs,slices:payload.plan.verticalSlices.length,claims:payload.evaluationContract.claims.length,payload,coverage,...(recheck?{initialCheckPassed:previous.initialCheckPassed??previous.pass,recheck:true}:{})});
 }catch(error){results.push({name:fixture.name,pass:false,error:error.message,code:error.code});}
 writeFileSync(join(artifact,'quality-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({name:fixture.name,pass:results.at(-1).pass,slices:results.at(-1).slices,claims:results.at(-1).claims,error:results.at(-1).error,code:results.at(-1).code}));
}
if(results.some(r=>!r.pass))process.exitCode=1;
