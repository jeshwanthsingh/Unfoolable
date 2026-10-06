import {CONTRACT_LIMITS,ENGINEERING_DEFAULTS,type ContractInput,type ContractPayload,type ContractItem,type ContractSource} from '../../packages/shared/contracts.ts';
import {canonicalJson} from './context-observation.ts';
import {ContractError} from './contract-errors.ts';
const invalid=():never=>{throw new ContractError('INVALID_CONTRACT_OUTPUT','The contract draft failed structural or provenance validation.');};
const unsupported=():never=>{throw new ContractError('UNSUPPORTED_CONTRACT_CLAIM','The contract draft expands scope or prescribes implementation without a cited source constraint.');};
function object(v:unknown,keys:readonly string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))return invalid();const r=v as Record<string,unknown>;if(Object.keys(r).length!==keys.length||!keys.every(k=>Object.hasOwn(r,k)))return invalid();return r;}
const normalize=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const numericTargets=(text:string)=>Array.from(text.matchAll(/\b(\d+(?:\.\d+)?)\s*(ms|milliseconds?|seconds?|rps|requests per second|%)(?:\b|(?<=%))/gi),match=>{
 const unit=match[2]!.toLowerCase();return Number(match[1])+':'+(unit.startsWith('millisecond')?'ms':unit.startsWith('second')?'s':unit==='requests per second'?'rps':unit);
});
// This conservative detector covers named forbidden patterns; it does not prove semantic entailment.
function semantic(item:ContractItem,section:string,sources:ContractSource[]):void{
 if(sources.some(s=>s.type==='USER_EDIT')){if(!sources.some(s=>s.type==='USER_EDIT'&&s.text===item.text))return invalid();return;}
 const material=sources.filter(s=>s.type!=='ENGINEERING_DEFAULT');
 if(!material.length&&section!=='constraints')return unsupported();
 const cited=material.map(s=>normalize(s.text));const supports=(phrase:string)=>cited.some(s=>s.includes(normalize(phrase)));
 const authorizes=(phrase:string)=>material.some(source=>source.text.split(/[.\n;]/).some(clause=>normalize(clause).includes(normalize(phrase))&&!/\b(?:no|not|never|without|exclude[ds]?|non-goal|out of scope)\b/i.test(clause)));
 const text=item.text;
 if(!material.length){const defaults=sources.map(s=>normalize(s.text));if(!defaults.some(s=>normalize(text)===s))return unsupported();}
 // A non-goal may exclude mobile/Slack/etc; mentioning a topic there grants no scope.
 if(section!=='nonGoals')for(const match of text.matchAll(/\b(?:ios|android|mobile|slack|session-wide permissions?|production deployment)\b/gi))if(!authorizes(match[0]))return unsupported();
 if(section!=='nonGoals')for(const match of text.matchAll(/\b(?:redis|postgres(?:ql)?|mongodb|sqlite|kafka|rabbitmq|distributed lock(?:s|ing)?)\b/gi))if(!authorizes(match[0]))return unsupported();
 const prescriptions=[/\b(?:use|adopt|introduce|implement with)\s+(?:redis|postgres(?:ql)?|mongodb|sqlite|kafka|rabbitmq|distributed locks?)\b[^.\n]*/gi,/\b(?:create|add|introduce)\s+(?:[A-Za-z_][\w]*\s+){0,3}(?:class|table|schema|index|repository class)\b[^.\n]*/gi,/\b(?:create|add)\s+(?:a\s+)?(?:table|class)\b[^.\n]*/gi,/\b(?:modify|edit|change)\s+[\w./-]+\.(?:ts|js|tsx|jsx|py|go|rs|sql)(?:\s+line\s+\d+)?/gi,/\b(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:test|build|check)\b/gi,/\b(?:implementation plan|files to change|classes to create|database schema proposal|vertical slices?|evaluation contract|acceptance tests?|test commands?)\b/gi];
 for(const pattern of prescriptions)for(const match of text.matchAll(pattern))if(!(section==='nonGoals'?supports(match[0]):authorizes(match[0])))return unsupported();
 const suppliedNumbers=new Set(material.flatMap(source=>numericTargets(source.text)));
 for(const target of numericTargets(text))if(!suppliedNumbers.has(target))return unsupported();
}
export function validateContractPayload(output:unknown,input:ContractInput,userEdits:ContractSource[]=[],allowUserEdits=false):ContractPayload{
 let value=output;if(typeof value==='string'){if(Buffer.byteLength(value)>CONTRACT_LIMITS.payloadBytes)return invalid();try{value=JSON.parse(value);}catch{return invalid();}}
 const root=object(value,['goal','requirements','scope','nonGoals','constraints','assumptions','risks']);
 const sourceMap=new Map<string,ContractSource>();
 for(const source of input.sources){if(source.type==='USER_EDIT'||sourceMap.has(source.id))return invalid();if(source.type==='ENGINEERING_DEFAULT'&&!ENGINEERING_DEFAULTS.some(d=>d.id===source.id&&d.text===source.text))return invalid();sourceMap.set(source.id,source);}
 if(allowUserEdits)for(const source of userEdits){if(source.type!=='USER_EDIT'||!source.id.startsWith('user-edit:')||sourceMap.has(source.id)||!source.text.trim()||source.text.length>CONTRACT_LIMITS.text)return invalid();sourceMap.set(source.id,source);}
 const item=(value:unknown,id:string,section:string):ContractItem=>{const row=object(value,['id','text','sourceIds']);if(row.id!==id||typeof row.text!=='string'||!row.text.trim()||row.text.length>CONTRACT_LIMITS.text||/[\uD800-\uDFFF]/u.test(row.text)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(row.text))return invalid();if(!Array.isArray(row.sourceIds)||!row.sourceIds.length||row.sourceIds.length>CONTRACT_LIMITS.sources||new Set(row.sourceIds).size!==row.sourceIds.length||!row.sourceIds.every(id=>typeof id==='string'&&sourceMap.has(id)))return invalid();const result={id,text:row.text,sourceIds:[...row.sourceIds] as string[]};semantic(result,section,result.sourceIds.map(id=>sourceMap.get(id)!));return result;};
 const array=(key:Exclude<keyof ContractPayload,'goal'>,prefix:string,min=0):ContractItem[]=>{const rows=root[key];if(!Array.isArray(rows)||rows.length<min||rows.length>CONTRACT_LIMITS[key])return invalid();return rows.map((r,i)=>item(r,prefix+(i+1),key));};
 const payload:ContractPayload={goal:item(root.goal,'G1','goal'),requirements:array('requirements','R',1),scope:array('scope','S',1),nonGoals:array('nonGoals','NG'),constraints:array('constraints','C'),assumptions:array('assumptions','A'),risks:array('risks','K')};
 if(Buffer.byteLength(canonicalJson(payload))>CONTRACT_LIMITS.payloadBytes)return invalid();return payload;
}
const itemSchema={type:'object',additionalProperties:false,required:['id','text','sourceIds'],properties:{id:{type:'string',maxLength:6},text:{type:'string',minLength:1,maxLength:CONTRACT_LIMITS.text},sourceIds:{type:'array',minItems:1,maxItems:CONTRACT_LIMITS.sources,items:{type:'string',minLength:1,maxLength:120}}}};
export const CONTRACT_OUTPUT_SCHEMA={type:'object',additionalProperties:false,required:['goal','requirements','scope','nonGoals','constraints','assumptions','risks'],properties:{goal:itemSchema,...Object.fromEntries((['requirements','scope','nonGoals','constraints','assumptions','risks'] as const).map(key=>[key,{type:'array',minItems:key==='requirements'||key==='scope'?1:0,maxItems:CONTRACT_LIMITS[key],items:itemSchema}]))}};
