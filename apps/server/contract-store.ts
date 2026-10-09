import {acceptedContractRow,draftAccepted,migrateContentIdentity} from './content-identity.ts';
import {createHash,randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import type {DatabaseSync} from 'node:sqlite';
import {CONTRACT_LIMITS} from '../../packages/shared/contracts.ts';
import type {ContractAttentionItem,ContractDraft,ContractInput,ContractPayload,ContractRevision,ContractSource,ContractView} from '../../packages/shared/contracts.ts';
import {buildContractInput} from './contract-input.ts';
import {validateContractPayload} from './contract-validation.ts';
import {ContractError} from './contract-errors.ts';
import {contractPhase,currentContractInputHash} from './contract-phase.ts';
import type {Logger} from './log.ts';

export type ContractDrafter=(input:ContractInput,signal:AbortSignal,onStarted?:()=>void)=>Promise<{output:unknown;toolVersion:string;elapsedMs:number}>;
export function canonicalContractJson(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonicalContractJson).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalContractJson((value as Record<string,unknown>)[key])).join(',')+'}';
 const encoded=JSON.stringify(value);if(encoded===undefined)throw new Error('Invalid canonical value');return encoded;
}
// Semantic documents exclude acceptance provenance; immutable rows retain input fencing.
const semanticContent=(value:unknown):unknown=>{
 if(Array.isArray(value))return value.map(semanticContent);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='sourceIds').map(([key,item])=>[key,semanticContent(item)]));
 return value;
};
export const acceptedContentCanonical=(payload:unknown)=>canonicalContractJson({identityVersion:'accepted-content-v1',payload:semanticContent(payload)});
export const boundContentId=(kind:string,missionId:string,contentHash:string,inputHash:string)=>kind+':'+createHash('sha256').update(canonicalContractJson({missionId,contentHash,inputHash})).digest('hex');
export function acceptedCanonicalMatches(canonical:string,payload:unknown,legacy:unknown):boolean {
 return canonical===acceptedContentCanonical(payload)||canonical===canonicalContractJson(legacy);
}
type Row=Record<string,string|number|null>;
const draftRecord=(r:Row):ContractDraft=>({id:String(r.id),missionId:String(r.mission_id),parentDraftId:r.parent_draft_id as string|null,origin:r.origin as ContractDraft['origin'],status:r.status as ContractDraft['status'],input:JSON.parse(String(r.input_json)),inputHash:String(r.input_hash),payload:r.payload_json===null?null:JSON.parse(String(r.payload_json)),userEdits:JSON.parse(String(r.user_edits_json)),promptVersion:String(r.prompt_version),toolVersion:r.tool_version as string|null,elapsedMs:r.elapsed_ms as number|null,createdAt:String(r.created_at),completedAt:r.completed_at as string|null,error:r.error as string|null});
const revisionRecord=(r:Row):ContractRevision=>({input:JSON.parse(String(r.input_json)),id:String(r.id),missionId:String(r.mission_id),revision:Number(r.revision),draftId:String(r.draft_id),inputHash:String(r.input_hash),payload:JSON.parse(String(r.payload_json)),userEdits:JSON.parse(String(r.user_edits_json)),contractHash:String(r.contract_hash),canonical:String(r.canonical),acceptedAt:String(r.accepted_at)});
const fields=['requirements','scope','nonGoals','constraints','assumptions','risks'] as const;
export function createContractStore(db:DatabaseSync,logger:Logger,drafter:ContractDrafter){
 migrateContentIdentity(db);
 let closed=false,active:{id:string;controller:AbortController}|null=null;
 db.prepare("UPDATE contract_drafts SET status='INTERRUPTED',completed_at=?,error=? WHERE status IN('PREPARING','RUNNING')").run(new Date().toISOString(),'Contract compilation was interrupted when the coordinator stopped.');
 const ensureOpen=()=>{if(closed)throw new ContractError('CONTRACT_INTERRUPTED','The contract coordinator has stopped.',409);};
 const latestDraft=(missionId:string)=>{const r=db.prepare("SELECT * FROM contract_drafts WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId) as Row|undefined;return r?draftRecord(r):null;};
 const latestRevision=(missionId:string)=>{const r=acceptedContractRow(db,missionId) as Row|undefined;return r?revisionRecord(r):null;};
 const view=(missionId:string):ContractView=>{
  ensureOpen();if(!db.prepare('SELECT id FROM missions WHERE id=?').get(missionId))throw new ContractError('MISSION_NOT_FOUND','That mission could not be found.',404);
  const draft=latestDraft(missionId),accepted=latestRevision(missionId),r=db.prepare('SELECT * FROM contract_drafts WHERE mission_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').get(missionId) as Row|undefined;
  const hash=currentContractInputHash(db,missionId),draftStale=!!draft&&hash!==draft.inputHash,acceptedStale=!!accepted&&hash!==accepted.inputHash;
  const analysis=db.prepare("SELECT id FROM mission_analyses WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId);
  const pending=analysis?Number(db.prepare('SELECT count(*) AS n FROM clarification_questions q LEFT JOIN clarification_answers a ON a.question_id=q.id WHERE q.analysis_id=? AND a.question_id IS NULL').get(analysis.id!)?.n):0;
  const base=analysis?(pending?'NEEDS_CLARIFICATION':'CLARIFIED'):'DRAFT';
  return {draft,operation:r?draftRecord(r):null,accepted,current:!!accepted&&!acceptedStale,draftStale,acceptedStale,eligible:hash!==null,phase:contractPhase(db,missionId,base)};
 };
 const getDraft=(id:string)=>{ensureOpen();const r=db.prepare("SELECT * FROM contract_drafts WHERE id=? AND status='SUCCEEDED'").get(id) as Row|undefined;if(!r)throw new ContractError('CONTRACT_DRAFT_NOT_FOUND','That successful contract draft could not be found.',404);return draftRecord(r);};
 const checkCurrent=(draft:ContractDraft)=>{if(currentContractInputHash(db,draft.missionId)!==draft.inputHash)throw new ContractError('STALE_CONTRACT_DRAFT','Mission decisions or evidence changed. Compile a fresh contract draft.',409);if(latestDraft(draft.missionId)?.id!==draft.id)throw new ContractError('SUPERSEDED_CONTRACT_DRAFT','Review the latest contract draft.',409);};
 const transact=<T>(fn:()=>T):T=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}};
 const candidate=(previous:ContractDraft,payload:ContractPayload,userEdits:ContractSource[],origin:'USER_EDIT'|'REVISION')=>{
  const id=randomUUID(),now=new Date().toISOString();
  const referenced=new Set([payload.goal,...fields.flatMap(k=>payload[k])].flatMap(item=>item.sourceIds));userEdits=userEdits.filter(source=>referenced.has(source.id));
  db.prepare("INSERT INTO contract_drafts(id,mission_id,parent_draft_id,origin,status,input_json,input_hash,payload_json,user_edits_json,prompt_version,tool_version,elapsed_ms,created_at,completed_at,error) VALUES(?,?,?,?,'SUCCEEDED',?,?,?,?,?,?,NULL,?,?,NULL)").run(id,previous.missionId,previous.id,origin,JSON.stringify(previous.input),previous.inputHash,JSON.stringify(payload),JSON.stringify(userEdits),previous.promptVersion,previous.toolVersion,now,now);
 };
 const compile=async(missionId:string):Promise<ContractView>=>{
  ensureOpen();if(active)throw new ContractError('CONTRACT_BUSY','Another contract compilation is in progress.',409);
  const before=performance.now(),built=buildContractInput(db,missionId);logger({event:'contract.input_prepared',elapsedMs:performance.now()-before});
  const owned={id:randomUUID(),controller:new AbortController()};active=owned;
  try{
   try{db.prepare("INSERT INTO contract_drafts(id,mission_id,parent_draft_id,origin,status,input_json,input_hash,user_edits_json,prompt_version,created_at) VALUES(?,?,NULL,'CODEX','PREPARING',?,?,'[]',?,?)").run(owned.id,missionId,JSON.stringify(built.input),built.hash,built.input.promptVersion,new Date().toISOString());}catch(error){if(db.prepare("SELECT id FROM contract_drafts WHERE mission_id=? AND input_hash=? AND status IN('PREPARING','RUNNING')").get(missionId,built.hash))throw new ContractError('CONTRACT_BUSY','This mission input is already being compiled.',409);throw error;}
   const output=await drafter(built.input,owned.controller.signal,()=>{ensureOpen();if(owned.controller.signal.aborted||Number(db.prepare("UPDATE contract_drafts SET status='RUNNING' WHERE id=? AND status='PREPARING'").run(owned.id).changes)!==1)throw new ContractError('CONTRACT_INTERRUPTED','Contract compilation was interrupted.',409);});
   ensureOpen();if(owned.controller.signal.aborted)throw new ContractError('CONTRACT_INTERRUPTED','Contract compilation was interrupted.',409);
   const validationStart=performance.now(),payload=validateContractPayload(output.output,built.input);
   if(Number(db.prepare("UPDATE contract_drafts SET status='SUCCEEDED',payload_json=?,tool_version=?,elapsed_ms=?,completed_at=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(JSON.stringify(payload),output.toolVersion,output.elapsedMs,new Date().toISOString(),owned.id).changes)!==1)throw new ContractError('CONTRACT_INTERRUPTED','Contract compilation was interrupted.',409);
   logger({event:'contract.completed',draftingMillis:output.elapsedMs,validationMillis:performance.now()-validationStart});return view(missionId);
  }catch(error){
   if(closed)throw new ContractError('CONTRACT_INTERRUPTED','Contract compilation was interrupted when the coordinator stopped.',409);
   const failure=error instanceof ContractError?error:new ContractError('CONTRACT_FAILED','Contract compilation failed. Try again.',502);
   db.prepare("UPDATE contract_drafts SET status=?,completed_at=?,error=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(owned.controller.signal.aborted?'INTERRUPTED':'FAILED',new Date().toISOString(),failure.message,owned.id);logger({event:'contract.failed',code:failure.code});throw failure;
  }finally{if(active===owned)active=null;}
 };
 const edit=(draftId:string,body:{payload:unknown}):ContractView=>{
  const draft=getDraft(draftId);if(!body||Object.keys(body).length!==1||!('payload'in body))throw new ContractError('INVALID_CONTRACT_EDIT','Provide the complete draft payload only.',400);
  transact(()=>{
   checkCurrent(draft);if(db.prepare('SELECT id FROM mission_contract_revisions WHERE draft_id=?').get(draft.id)||draftAccepted(db,'contract',draft.id))throw new ContractError('CONTRACT_ALREADY_ACCEPTED','Choose Revise Contract before editing an accepted revision.',409);
   // Validate the browser payload against the existing provenance before replacing any changed claim.
   const raw=body.payload,original=draft.payload!;
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||canonicalContractJson(Object.keys(raw).sort())!==canonicalContractJson(Object.keys(original).sort()))throw new ContractError('INVALID_CONTRACT_EDIT','Provide the complete structured payload.',400);
   const proposed=structuredClone(raw) as ContractPayload;
   if(!proposed.goal||typeof proposed.goal!=='object'||fields.some(k=>!Array.isArray(proposed[k])))throw new ContractError('INVALID_CONTRACT_EDIT','Keep the structured contract fields.',400);
   const oldItems=[original.goal,...fields.flatMap(k=>original[k])],newItems=[proposed.goal,...fields.flatMap(k=>proposed[k])];
   if(fields.some(k=>proposed[k].length!==original[k].length)||oldItems.some((item,i)=>item.id!==newItems[i]?.id||!newItems[i]||Object.keys(newItems[i]!).sort().join(',')!=='id,sourceIds,text'||typeof newItems[i]!.text!=='string'||canonicalContractJson(item.sourceIds)!==canonicalContractJson(newItems[i]!.sourceIds)))throw new ContractError('INVALID_CONTRACT_EDIT','Only item text can change; keep IDs, order and provenance unchanged.',400);
   const edits=[...draft.userEdits];let changed=false;
   newItems.forEach((item,i)=>{if(item.text!==oldItems[i]!.text){changed=true;const source:ContractSource={id:'user-edit:'+randomUUID(),type:'USER_EDIT',text:item.text};edits.push(source);item.sourceIds=[source.id];}});
   if(changed){const payload=validateContractPayload(proposed,draft.input,edits,true);candidate(draft,payload,edits,'USER_EDIT');}
  });return view(draft.missionId);
 };
 const accept=(draftId:string):ContractView=>{
  const draft=getDraft(draftId);
  transact(()=>{
   const existing=db.prepare('SELECT id FROM mission_contract_revisions WHERE draft_id=?').get(draft.id);if(existing||draftAccepted(db,'contract',draft.id)){if(currentContractInputHash(db,draft.missionId)!==draft.inputHash)throw new ContractError('STALE_CONTRACT_DRAFT','Mission decisions or evidence changed. Compile a fresh contract draft.',409);return;}
   checkCurrent(draft);const payload=validateContractPayload(draft.payload,draft.input,draft.userEdits,true);
   const canonical=acceptedContentCanonical(payload),hash=createHash('sha256').update(canonical).digest('hex');
   if(Buffer.byteLength(canonical)>CONTRACT_LIMITS.canonicalBytes)throw new ContractError('CONTRACT_CANONICAL_LIMIT','The accepted contract exceeds its canonical document size bound.',422);
   const matching=(db.prepare('SELECT * FROM mission_contract_revisions WHERE mission_id=? AND input_hash=? ORDER BY revision DESC').all(draft.missionId,draft.inputHash)).find(row=>acceptedContentCanonical(JSON.parse(String(row.payload_json)))===canonical);
   if(matching){db.prepare('INSERT INTO contract_acceptances VALUES(?,?,?,?)').run(draft.id,draft.missionId,matching.id!,new Date().toISOString());return;}
   const id=boundContentId('contract',draft.missionId,hash,draft.inputHash);
   const revision=Number(db.prepare('SELECT COALESCE(MAX(revision),0)+1 AS n FROM mission_contract_revisions WHERE mission_id=?').get(draft.missionId)?.n);
   db.prepare('INSERT INTO mission_contract_revisions VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,draft.missionId,revision,draft.id,draft.inputHash,JSON.stringify(payload),JSON.stringify(draft.userEdits),hash,canonical,new Date().toISOString());
   db.prepare('INSERT INTO contract_acceptances VALUES(?,?,?,?)').run(draft.id,draft.missionId,id,new Date().toISOString());
  });return view(draft.missionId);
 };
 const revise=(missionId:string,revisionId:string):ContractView=>{
  ensureOpen();transact(()=>{const accepted=latestRevision(missionId);if(!accepted||accepted.id!==revisionId)throw new ContractError('CONTRACT_REVISION_NOT_FOUND','Choose the latest accepted contract revision.',409);const draft=getDraft(accepted.draftId);checkCurrent(draft);candidate(draft,validateContractPayload(draft.payload,draft.input,draft.userEdits,true),draft.userEdits,'REVISION');});return view(missionId);
 };
 const attention=():ContractAttentionItem[]=>{
  ensureOpen();const items:ContractAttentionItem[]=[];
  for(const row of db.prepare('SELECT m.id,p.id AS project_id,p.display_name,m.original_intent FROM missions m JOIN projects p ON p.id=m.project_id').all()){
   const state=view(String(row.id));if(state.phase!=='CONTRACT_REVIEW'||!state.draft||state.draftStale)continue;
   const payload=state.draft.payload!;items.push({kind:'contract_review',draftId:state.draft.id,missionId:String(row.id),projectId:String(row.project_id),projectName:String(row.display_name),originalIntent:String(row.original_intent),requirements:payload.requirements.length,nonGoals:payload.nonGoals.length,constraints:payload.constraints.length});
  }return items;
 };
 const interrupt=(missionId:string)=>{if(active&&db.prepare('SELECT mission_id FROM contract_drafts WHERE id=?').get(active.id)?.mission_id===missionId)active.controller.abort();};
 const close=()=>{if(closed)return;if(active){active.controller.abort();db.prepare("UPDATE contract_drafts SET status='INTERRUPTED',completed_at=?,error=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(new Date().toISOString(),'Contract compilation was interrupted when the coordinator stopped.',active.id);}closed=true;};
 return {view,compile,edit,accept,revise,attention,close,interrupt};
}
