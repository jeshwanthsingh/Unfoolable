export type V1Verdict='VERIFIED'|'PASSED WITH GAPS'|'FAILED'|'ERROR';
export type V1Status='PASS'|'FAIL'|'ERROR'|'NOT CHECKED';
export type V1Gap={id:string;layer:1|2|3;reason:string};
export type V1Layer={layer:1|2|3;status:V1Status;checks:{id:string;status:V1Status;reason:string|null}[];gaps:V1Gap[]};
export type V1Report={version:'verification-v1';verdict:V1Verdict;canLand:boolean;layers:V1Layer[];gaps:V1Gap[];recipeIds:string[];recipeHash:string;admittedTaskChecksHash:string;candidateTests:{authoritative:false;status:string;paths:string[]}|null;landed:{branch:string;commit:string;createdAt:string}|null};

/** Layers one and two are landing gates. Unchecked optional task checks remain gaps. */
export function scoreV1(layers:V1Layer[],gaps:V1Gap[]=[]):{verdict:V1Verdict;canLand:boolean}{
 const complete=[1,2,3].every(layer=>layers.filter(l=>l.layer===layer).length===1)&&layers.length===3;
 const errors=layers.some(l=>l.status==='ERROR'||l.checks.some(c=>c.status==='ERROR'));
 const failures=layers.some(l=>l.status==='FAIL'||l.checks.some(c=>c.status==='FAIL'));
 const gates=layers.filter(l=>l.layer===1||l.layer===2).every(l=>l.status==='PASS'&&l.checks.length>0&&l.checks.every(c=>c.status==='PASS'));
 if(!complete||errors)return {verdict:'ERROR',canLand:false};
 if(failures||!gates)return {verdict:'FAILED',canLand:false};
 const hasGaps=gaps.length>0||layers.some(l=>l.gaps.length>0||l.status==='NOT CHECKED'||l.checks.some(c=>c.status==='NOT CHECKED'));
 return {verdict:hasGaps?'PASSED WITH GAPS':'VERIFIED',canLand:true};
}

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).sort().join(',')===[...names].sort().join(',');
const nonempty=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const status=(v:unknown)=>['PASS','FAIL','ERROR','NOT CHECKED'].includes(String(v));
const gap=(v:unknown):v is V1Gap=>record(v)&&keys(v,['id','layer','reason'])&&nonempty(v.id)&&[1,2,3].includes(Number(v.layer))&&typeof v.layer==='number'&&nonempty(v.reason);
export function isV1Report(value:unknown):value is V1Report{
 if(!record(value)||!keys(value,['version','verdict','canLand','layers','gaps','recipeIds','recipeHash','admittedTaskChecksHash','candidateTests','landed'])||value.version!=='verification-v1'||!['VERIFIED','PASSED WITH GAPS','FAILED','ERROR'].includes(String(value.verdict))||typeof value.canLand!=='boolean'||!Array.isArray(value.layers)||!Array.isArray(value.gaps)||!value.gaps.every(gap)||!Array.isArray(value.recipeIds)||!value.recipeIds.every(nonempty)||!hash(value.recipeHash)||!hash(value.admittedTaskChecksHash))return false;
 if(!value.layers.every(l=>record(l)&&keys(l,['layer','status','checks','gaps'])&&typeof l.layer==='number'&&[1,2,3].includes(l.layer)&&status(l.status)&&Array.isArray(l.checks)&&l.checks.every(c=>record(c)&&keys(c,['id','status','reason'])&&nonempty(c.id)&&status(c.status)&&(c.reason===null||typeof c.reason==='string'))&&Array.isArray(l.gaps)&&l.gaps.every(g=>gap(g)&&g.layer===l.layer)))return false;
 if(value.layers.length!==3||![1,2,3].every(layer=>(value.layers as V1Layer[]).filter(l=>l.layer===layer).length===1))return false;
 const candidate=value.candidateTests;
 if(candidate!==null&&(!record(candidate)||!keys(candidate,['authoritative','status','paths'])||candidate.authoritative!==false||!nonempty(candidate.status)||!Array.isArray(candidate.paths)||!candidate.paths.every(nonempty)))return false;
 const landed=value.landed;
 if(landed!==null&&(!record(landed)||!keys(landed,['branch','commit','createdAt'])||!nonempty(landed.branch)||typeof landed.commit!=='string'||!/^[a-f0-9]{40,64}$/.test(landed.commit)||!nonempty(landed.createdAt)||!Number.isFinite(Date.parse(landed.createdAt))))return false;
 const scored=scoreV1(value.layers as V1Layer[],value.gaps as V1Gap[]);
 return scored.verdict===value.verdict&&scored.canLand===value.canLand&&(landed===null||value.canLand===true);
}
