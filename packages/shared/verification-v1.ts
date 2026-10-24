import {scoreVerdict} from './verdict-core.ts';
import {isTestWriterEvidence,type TestWriterEvidence} from './test-writer.ts';
export type V1Verdict='VERIFIED'|'PASSED WITH GAPS'|'FAILED'|'ERROR';
export type V1Status='PASS'|'FAIL'|'ERROR'|'NOT CHECKED';
export type V1Gap={id:string;layer:1|2|3;reason:string};
export type V1Layer={layer:1|2|3;status:V1Status;checks:{id:string;status:V1Status;reason:string|null;baseStatus?:'PASS'|'FAIL'|'ERROR';candidateStatus?:'PASS'|'FAIL'|'ERROR'}[];gaps:V1Gap[]};
export type V1Report={version:'verification-v1';testWriter?:TestWriterEvidence;verdict:V1Verdict;eligibleForReview:boolean;layers:V1Layer[];gaps:V1Gap[];recipeIds:string[];recipeHash:string;admittedTaskChecksHash:string;candidateTests:{authoritative:false;status:string;paths:string[]}|null;landed:{branch:string;commit:string;createdAt:string}|null};

/** Advisory writer information cannot strengthen or weaken the protected verdict. */
export function testWriterLayer(evidence:TestWriterEvidence):V1Layer{
 const contributes=evidence.coverage==='FULL'&&!evidence.advisoryOnly;
 return {layer:3,status:contributes?'PASS':'NOT CHECKED',checks:evidence.checks.map(c=>({id:c.id,status:c.status==='ADMITTED'?'PASS':'NOT CHECKED',reason:c.reason})),gaps:contributes?[]:[{id:'test-writer-coverage',layer:3,reason:evidence.advisoryOnly?'Test Writer is advisory only; it cannot change the verdict.':evidence.reason??'Focused tests were not fully admitted.'}]};
}

/** Layers one and two are landing gates. Unchecked optional task checks remain gaps. */
export function scoreV1(layers:V1Layer[],gaps:V1Gap[]=[]):{verdict:V1Verdict;eligibleForReview:boolean}{
 const result=scoreVerdict({path:'native',layers,gaps});
 return {verdict:result.verdict as V1Verdict,eligibleForReview:result.eligibleForReview};
}

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).sort().join(',')===[...names].sort().join(',');
const nonempty=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const status=(v:unknown)=>['PASS','FAIL','ERROR','NOT CHECKED'].includes(String(v));
const gap=(v:unknown):v is V1Gap=>record(v)&&keys(v,['id','layer','reason'])&&nonempty(v.id)&&[1,2,3].includes(Number(v.layer))&&typeof v.layer==='number'&&nonempty(v.reason);
export function isV1Report(value:unknown):value is V1Report{
 if(!record(value)||!keys(value,['version','verdict','eligibleForReview','layers','gaps','recipeIds','recipeHash','admittedTaskChecksHash','candidateTests','landed',...(Object.hasOwn(value,'testWriter')?['testWriter']:[])])||value.version!=='verification-v1'||!['VERIFIED','PASSED WITH GAPS','FAILED','ERROR'].includes(String(value.verdict))||typeof value.eligibleForReview!=='boolean'||!Array.isArray(value.layers)||!Array.isArray(value.gaps)||!value.gaps.every(gap)||!Array.isArray(value.recipeIds)||!value.recipeIds.every(nonempty)||!hash(value.recipeHash)||!hash(value.admittedTaskChecksHash))return false;
 if(!value.layers.every(l=>record(l)&&keys(l,['layer','status','checks','gaps'])&&typeof l.layer==='number'&&[1,2,3].includes(l.layer)&&status(l.status)&&Array.isArray(l.checks)&&l.checks.every(c=>record(c)&&keys(c,['id','status','reason',...(Object.hasOwn(c,'baseStatus')?['baseStatus','candidateStatus']:[])])&&(!Object.hasOwn(c,'baseStatus')||(l.layer===2&&['PASS','FAIL','ERROR'].includes(String(c.baseStatus))&&['PASS','FAIL','ERROR'].includes(String(c.candidateStatus))&&(c.baseStatus==='PASS'?c.status===c.candidateStatus:c.baseStatus==='FAIL'?c.status==='NOT CHECKED':c.status==='ERROR')))&&nonempty(c.id)&&status(c.status)&&(c.reason===null||typeof c.reason==='string'))&&Array.isArray(l.gaps)&&l.gaps.every(g=>gap(g)&&g.layer===l.layer)))return false;
 if(value.layers.length!==3||![1,2,3].every(layer=>(value.layers as V1Layer[]).filter(l=>l.layer===layer).length===1))return false;
 if(Object.hasOwn(value,'testWriter')&&(!isTestWriterEvidence(value.testWriter)||value.testWriter.advisoryOnly&&(value.layers as V1Layer[]).find(l=>l.layer===3)?.status!=='NOT CHECKED'))return false;
 const candidate=value.candidateTests;
 if(candidate!==null&&(!record(candidate)||!keys(candidate,['authoritative','status','paths'])||candidate.authoritative!==false||!nonempty(candidate.status)||!Array.isArray(candidate.paths)||!candidate.paths.every(nonempty)))return false;
 const landed=value.landed;
 if(landed!==null&&(!record(landed)||!keys(landed,['branch','commit','createdAt'])||!nonempty(landed.branch)||typeof landed.commit!=='string'||!/^[a-f0-9]{40,64}$/.test(landed.commit)||!nonempty(landed.createdAt)||!Number.isFinite(Date.parse(landed.createdAt))))return false;
 return landed===null||value.eligibleForReview===true;
}

/** Read old stored reports without changing their bytes, hashes or approval binding. */
export function readV1Report(value:unknown):V1Report|null{
 if(isV1Report(value))return value;
 if(!record(value)||!Object.hasOwn(value,'canLand')||Object.hasOwn(value,'eligibleForReview'))return null;
 const {canLand:legacyEligibility,...rest}=value;
 const report={...rest,eligibleForReview:legacyEligibility};
 return isV1Report(report)?report:null;
}
