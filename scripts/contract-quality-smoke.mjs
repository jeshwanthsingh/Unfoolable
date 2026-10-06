// Explicit development verifier: exactly five small independent subscription-backed drafts.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {draftMissionContract} from '../apps/server/contract-drafter.ts';
import {validateContractPayload} from '../apps/server/contract-validation.ts';
import {checkContractQuality} from './contract-quality-check.ts';
import {payloadHash} from '../apps/server/context-observation.ts';
const fixtures=JSON.parse(readFileSync('tests/fixtures/contract-quality.json','utf8'));
const artifact=resolve('artifacts/breakout-5');mkdirSync(artifact,{recursive:true});const results=[];const recheck=process.argv.includes('--recheck');const prior=recheck?JSON.parse(readFileSync(join(artifact,'quality-results.json'),'utf8')):[];
for(const fixture of fixtures){
 try{
  const previous=prior.find(r=>r.name===fixture.name);
  if(recheck&&(!previous?.payload||previous.inputHash!==payloadHash(fixture.input)))throw Error('Recorded result does not match fixture input.');
  const generated=recheck?{output:previous.payload,toolVersion:previous.version,elapsedMs:previous.elapsedMs}:await draftMissionContract(fixture.input,new AbortController().signal);
  const payload=validateContractPayload(generated.output,fixture.input);
  const pass=checkContractQuality(fixture.name,payload);
  results.push({name:fixture.name,pass,...(recheck?{initialCheckPassed:previous.initialCheckPassed??previous.pass,review:'Same generated output revalidated with wording-independent fixture checks; no additional AI call.'}:{}),inputHash:payloadHash(fixture.input),version:generated.toolVersion,promptVersion:fixture.input.promptVersion,elapsedMs:generated.elapsedMs,requirements:payload.requirements.length,payload});
 }catch(error){results.push({name:fixture.name,pass:false,error:error.message});}
 writeFileSync(join(artifact,'quality-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({name:fixture.name,pass:results.at(-1).pass,requirements:results.at(-1).requirements,error:results.at(-1).error}));
}
if(results.some(r=>!r.pass))process.exitCode=1;
