export const CONTRACT_PROMPT_VERSION='mission-contract-v1';
export const ENGINEERING_DEFAULTS_VERSION='engineering-defaults-v1';
export const CONTRACT_LIMITS=Object.freeze({requirements:20,scope:12,nonGoals:15,constraints:15,assumptions:12,risks:12,text:700,sources:6,inputBytes:393216,payloadBytes:49152,canonicalBytes:131072});
export const ENGINEERING_DEFAULTS=Object.freeze([
 {id:'default:errors',type:'ENGINEERING_DEFAULT' as const,text:'Handle relevant errors.'},
 {id:'default:preserve',type:'ENGINEERING_DEFAULT' as const,text:'Preserve existing behavior outside declared scope.'},
 {id:'default:tests',type:'ENGINEERING_DEFAULT' as const,text:'Include appropriate automated tests for new behavior.'},
 {id:'default:refactoring',type:'ENGINEERING_DEFAULT' as const,text:'Avoid unrelated refactoring.'},
 {id:'default:conventions',type:'ENGINEERING_DEFAULT' as const,text:'Maintain existing repository conventions.'}
]);
export type ContractSource={id:string;type:'ORIGINAL_INTENT'|'PROJECT_EVIDENCE'|'CLARIFICATION_ANSWER'|'ENGINEERING_DEFAULT'|'USER_EDIT';text:string;path?:string;startLine?:number;endLine?:number;questionId?:string;question?:string;updatedAt?:string};
export type ContractBinding={missionId:string;originalIntent:string;snapshotId:string;analysisId:string;packetHash:string;answers:{questionId:string;text:string;updatedAt:string}[]};
export type ContractInput={version:'contract-input-v1';bindings:ContractBinding;understanding:import('./analysis.ts').AnalysisResult['understanding'];sources:ContractSource[];defaultsVersion:typeof ENGINEERING_DEFAULTS_VERSION;promptVersion:typeof CONTRACT_PROMPT_VERSION;limits:typeof CONTRACT_LIMITS;evidenceTruncated:boolean};
export type ContractItem={id:string;text:string;sourceIds:string[]};
export type ContractPayload={goal:ContractItem;requirements:ContractItem[];scope:ContractItem[];nonGoals:ContractItem[];constraints:ContractItem[];assumptions:ContractItem[];risks:ContractItem[]};
export type ContractStatus='PREPARING'|'RUNNING'|'SUCCEEDED'|'FAILED'|'INTERRUPTED';
export type ContractDraft={id:string;missionId:string;parentDraftId:string|null;origin:'CODEX'|'USER_EDIT'|'REVISION';status:ContractStatus;input:ContractInput;inputHash:string;payload:ContractPayload|null;userEdits:ContractSource[];promptVersion:string;toolVersion:string|null;elapsedMs:number|null;createdAt:string;completedAt:string|null;error:string|null};
export type ContractRevision={input:ContractInput;id:string;missionId:string;revision:number;draftId:string;inputHash:string;payload:ContractPayload;userEdits:ContractSource[];contractHash:string;canonical:string;acceptedAt:string};
export type ContractPhase='DRAFT'|'NEEDS_CLARIFICATION'|'CLARIFIED'|'CONTRACT_REVIEW'|'CONTRACT_READY';
export type ContractView={draft:ContractDraft|null;operation:ContractDraft|null;accepted:ContractRevision|null;current:boolean;draftStale:boolean;acceptedStale:boolean;eligible:boolean;phase:ContractPhase};
export type ContractAttentionItem={kind:'contract_review';draftId:string;missionId:string;projectId:string;projectName:string;originalIntent:string;requirements:number;nonGoals:number;constraints:number};

const contractObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const contractText=(v:unknown,max=100):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max;
const contractHash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function contractKeys(v:Record<string,unknown>,keys:readonly string[]):boolean{return Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));}
function isContractSource(v:unknown):v is ContractSource{
 if(!contractObject(v)||!contractText(v.id,120)||!contractText(v.text,131072)||!['ORIGINAL_INTENT','PROJECT_EVIDENCE','CLARIFICATION_ANSWER','ENGINEERING_DEFAULT','USER_EDIT'].includes(v.type as string)||Object.keys(v).some(k=>!['id','type','text','path','startLine','endLine','questionId','question','updatedAt'].includes(k)))return false;
 if(v.type==='PROJECT_EVIDENCE')return contractText(v.path,4096)&&Number.isSafeInteger(v.startLine)&&Number(v.startLine)>0&&Number.isSafeInteger(v.endLine)&&Number(v.endLine)>=Number(v.startLine);
 if(v.type==='CLARIFICATION_ANSWER')return contractText(v.questionId)&&contractText(v.question,600)&&contractText(v.updatedAt);
 return true;
}
function isContractInput(v:unknown):v is ContractInput{
 if(!contractObject(v)||!contractKeys(v,['version','bindings','understanding','sources','defaultsVersion','promptVersion','limits','evidenceTruncated'])||v.version!=='contract-input-v1'||v.defaultsVersion!==ENGINEERING_DEFAULTS_VERSION||v.promptVersion!==CONTRACT_PROMPT_VERSION||!contractObject(v.bindings)||!contractObject(v.understanding)||!contractObject(v.limits)||typeof v.evidenceTruncated!=='boolean'||!Array.isArray(v.sources)||v.sources.length>51||!v.sources.every(isContractSource)||new Set(v.sources.map(s=>s.id)).size!==v.sources.length)return false;
 const b=v.bindings;if(!contractKeys(b,['missionId','originalIntent','snapshotId','analysisId','packetHash','answers'])||!contractText(b.missionId)||!contractText(b.originalIntent,8000)||!contractText(b.snapshotId)||!contractText(b.analysisId)||!contractHash(b.packetHash)||!Array.isArray(b.answers)||b.answers.length>5||!b.answers.every(a=>contractObject(a)&&contractKeys(a,['questionId','text','updatedAt'])&&contractText(a.questionId)&&contractText(a.text,4000)&&contractText(a.updatedAt)))return false;
 if(!Object.entries(CONTRACT_LIMITS).every(([k,n])=>v.limits&&((v.limits as Record<string,unknown>)[k]===n)))return false;
 return contractKeys(v.understanding,['relevantAreas','currentBehavior','constraints','uncertainties'])&&Object.values(v.understanding).every(a=>Array.isArray(a)&&a.length<=8&&a.every(c=>contractObject(c)&&contractText(c.text,900)&&['observation','inference','uncertainty'].includes(c.kind as string)&&Array.isArray(c.evidenceIds)&&c.evidenceIds.length<=8&&c.evidenceIds.every(id=>contractText(id))));
}
function isContractPayload(v:unknown,sources:ContractSource[]):v is ContractPayload{
 if(!contractObject(v)||!contractKeys(v,['goal','requirements','scope','nonGoals','constraints','assumptions','risks']))return false;
 const available=new Set(sources.map(s=>s.id));
 const item=(i:unknown,id:string)=>contractObject(i)&&contractKeys(i,['id','text','sourceIds'])&&i.id===id&&contractText(i.text,CONTRACT_LIMITS.text)&&Array.isArray(i.sourceIds)&&i.sourceIds.length>0&&i.sourceIds.length<=CONTRACT_LIMITS.sources&&new Set(i.sourceIds).size===i.sourceIds.length&&i.sourceIds.every(s=>typeof s==='string'&&available.has(s));
 return item(v.goal,'G1')&&([['requirements','R'],['scope','S'],['nonGoals','NG'],['constraints','C'],['assumptions','A'],['risks','K']] as const).every(([k,prefix])=>Array.isArray(v[k])&&(v[k] as unknown[]).length<=CONTRACT_LIMITS[k]&&((k!=='requirements'&&k!=='scope')||(v[k] as unknown[]).length>0)&&(v[k] as unknown[]).every((i,n)=>item(i,prefix+(n+1))));
}
function isContractDraft(v:unknown):v is ContractDraft{
 if(!contractObject(v)||!contractKeys(v,['id','missionId','parentDraftId','origin','status','input','inputHash','payload','userEdits','promptVersion','toolVersion','elapsedMs','createdAt','completedAt','error'])||!contractText(v.id)||!contractText(v.missionId)||!(v.parentDraftId===null||contractText(v.parentDraftId))||!['CODEX','USER_EDIT','REVISION'].includes(v.origin as string)||!['PREPARING','RUNNING','SUCCEEDED','FAILED','INTERRUPTED'].includes(v.status as string)||!isContractInput(v.input)||v.input.bindings.missionId!==v.missionId||!contractHash(v.inputHash)||!Array.isArray(v.userEdits)||!v.userEdits.every(s=>isContractSource(s)&&s.type==='USER_EDIT')||!contractText(v.promptVersion)||!(v.toolVersion===null||contractText(v.toolVersion))||!(v.elapsedMs===null||(typeof v.elapsedMs==='number'&&Number.isFinite(v.elapsedMs)&&v.elapsedMs>=0))||!contractText(v.createdAt)||!(v.completedAt===null||contractText(v.completedAt))||!(v.error===null||contractText(v.error,1000)))return false;
 if(v.payload!==null&&!isContractPayload(v.payload,[...v.input.sources,...v.userEdits]))return false;
 return v.status!=='SUCCEEDED'||(v.payload!==null&&v.completedAt!==null);
}
function isContractRevision(v:unknown):v is ContractRevision{
 if(!contractObject(v)||!contractKeys(v,['id','missionId','revision','draftId','input','inputHash','payload','userEdits','contractHash','canonical','acceptedAt'])||!contractText(v.id)||!contractText(v.missionId)||!Number.isSafeInteger(v.revision)||Number(v.revision)<1||!contractText(v.draftId)||!isContractInput(v.input)||v.input.bindings.missionId!==v.missionId||!contractHash(v.inputHash)||!contractHash(v.contractHash)||!contractText(v.canonical,CONTRACT_LIMITS.canonicalBytes)||!contractText(v.acceptedAt)||!Array.isArray(v.userEdits)||!v.userEdits.every(s=>isContractSource(s)&&s.type==='USER_EDIT'))return false;
 return isContractPayload(v.payload,[...v.input.sources,...v.userEdits]);
}
export function isContractView(v:unknown):v is ContractView{
 if(!contractObject(v)||!contractKeys(v,['draft','operation','accepted','current','draftStale','acceptedStale','eligible','phase'])||!['DRAFT','NEEDS_CLARIFICATION','CLARIFIED','CONTRACT_REVIEW','CONTRACT_READY'].includes(v.phase as string)||!['current','draftStale','acceptedStale','eligible'].every(k=>typeof v[k]==='boolean')||!(v.draft===null||isContractDraft(v.draft))||!(v.operation===null||isContractDraft(v.operation))||!(v.accepted===null||isContractRevision(v.accepted)))return false;
 if(v.current&&(v.accepted===null||v.acceptedStale))return false;
 if(v.phase==='CONTRACT_READY'&&!v.current)return false;
 if(v.phase==='CONTRACT_REVIEW'&&(v.draft===null||(v.draft as ContractDraft).status!=='SUCCEEDED'||v.draftStale))return false;
 return true;
}
export type AttentionResponse={items:((import('./analysis.ts').AttentionItem&{kind:'clarification'})|ContractAttentionItem)[];count:number};
export function isAttentionResponse(v:unknown):v is AttentionResponse{
 return contractObject(v)&&contractKeys(v,['items','count'])&&Array.isArray(v.items)&&v.count===v.items.length&&v.items.every(i=>contractObject(i)&&contractText(i.missionId)&&contractText(i.projectId)&&contractText(i.projectName,120)&&contractText(i.originalIntent,8000)&&((i.kind==='clarification'&&contractText(i.questionId)&&contractText(i.question,600)&&['behavior','security','compatibility','data','migration','performance','acceptance','scope','architecture','ux','failure'].includes(i.decisionArea as string))||(i.kind==='contract_review'&&contractText(i.draftId)&&['requirements','nonGoals','constraints'].every(k=>Number.isSafeInteger(i[k])&&Number(i[k])>=0))));
}
