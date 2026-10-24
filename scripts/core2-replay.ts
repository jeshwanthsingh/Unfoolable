import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {scoreVerdict} from '../packages/shared/verdict-core.ts';
const baseline='4abc25a76c46e7f05aa5fcae12788a114b3054e1';
mkdirSync('.work/core2',{recursive:true});
const original=execFileSync('git',['show',baseline+':packages/shared/verdict-core.ts']);
writeFileSync('.work/core2/main-verdict.ts',original);
const before=(await import(pathToFileURL(resolve('.work/core2/main-verdict.ts')).href)).scoreVerdict;
const frozen=JSON.parse(readFileSync('artifacts/core1/golden.json','utf8'));
const policy=JSON.parse(readFileSync('artifacts/core1/current-policy-golden.json','utf8'));
const rows=[...frozen.replay.map((r:any)=>({id:r.id,facts:r.facts})),...policy.entries.map((r:any)=>({id:'event-'+r.sequence,facts:r.facts}))];
// Compare the same behavior across the requested public-name change, never rewrite history.
const normalize=(v:any):any=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k==='canLand'?'eligibleForReview':k,normalize(x)])):v;
const differences:string[]=[],traceCorrections:string[]=[];
for(const row of rows){
 const old=normalize(before(row.facts)),now=scoreVerdict(row.facts);
 for(const step of old.trace)if(step.rule==='combined-checks'&&old.verdict==='ERROR'&&step.passed){step.passed=false;traceCorrections.push(row.id);}
 if(!isDeepStrictEqual(old,now))differences.push(row.id);
}
const hashesPreserved=['artifacts/core1/golden.json','artifacts/core1/current-policy-golden.json'].every(path=>readFileSync(path).equals(execFileSync('git',['show',baseline+':'+path],{maxBuffer:32*1024*1024})));
const result={baseline,compared:rows.length,differences,traceCorrections,hashesPreserved,originalCoreHash:createHash('sha256').update(original).digest('hex'),note:'All decision fields and reasons compared; eligibility rename normalized, combined ERROR trace flag corrected as requested. Original golden files untouched. New unequal-command ERROR and unknown-path behavior have separate regressions.'};
mkdirSync('artifacts/core2',{recursive:true});writeFileSync('artifacts/core2/golden-replay.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));if(differences.length||!hashesPreserved)process.exitCode=1;
