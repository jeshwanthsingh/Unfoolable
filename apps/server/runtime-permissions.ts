import {randomUUID} from 'node:crypto';
import type {DatabaseSync,SQLInputValue} from 'node:sqlite';
import type {RuntimeBinding} from '../../packages/shared/build.ts';
import type {PermissionEnvelope,PermissionDispatch,PermissionDecision,RuntimePermissionRequest,RuntimeAttentionItem} from '../../packages/shared/permissions.ts';
import {BuildError} from './build-errors.ts';
import {validatePermission} from './permission-validation.ts';
type Row=Record<string,SQLInputValue>;
function binding(r:RuntimePermissionRequest):RuntimeBinding{return {attemptId:r.attemptId,generation:r.generation,transportId:r.transportId,threadId:r.threadId,turnId:r.turnId};}
function read(r:Row):RuntimePermissionRequest{return {id:String(r.id),missionId:String(r.mission_id),attemptId:String(r.attempt_id),generation:Number(r.generation),transportId:String(r.transport_id),threadId:String(r.thread_id),turnId:String(r.turn_id),providerMethod:String(r.provider_method),providerRequestId:JSON.parse(String(r.provider_id_json)),providerItemId:String(r.provider_item_id),payloadCanonical:String(r.payload_canonical),payloadHash:String(r.payload_hash),path:String(r.path),requestedScope:'turn',reason:String(r.reason),status:r.status as RuntimePermissionRequest['status'],decision:r.decision as PermissionDecision|null,createdAt:String(r.created_at),resolvedAt:r.resolved_at as string|null,decidedAt:r.decided_at as string|null,writeAttemptedAt:r.write_attempted_at as string|null,writtenAt:r.written_at as string|null,providerResolvedAt:r.provider_resolved_at as string|null,invalidatedAt:r.invalidated_at as string|null};}
export function createPermissionStore(db:DatabaseSync,config:{dataDir:string},hooks:{current:(binding:RuntimeBinding)=>boolean;event:(binding:RuntimeBinding,kind:string,data:Record<string,unknown>)=>void;dispatch:(decision:PermissionDispatch)=>Promise<void>}){
 const get=(id:string)=>{const row=db.prepare('SELECT * FROM runtime_permission_requests WHERE id=?').get(id);if(!row)throw new BuildError('PERMISSION_NOT_FOUND','Permission request was not found.',404);return read(row);};
 function current(b:RuntimeBinding){const row=db.prepare("SELECT b.* FROM build_attempts b LEFT JOIN build_runtime_state r ON r.attempt_id=b.id WHERE b.id=? AND b.generation=? AND b.transport_id=? AND b.provider_thread_id=? AND b.provider_turn_id=? AND b.status='RUNNING' AND b.transport_valid=1 AND r.cancel_requested_at IS NULL").get(b.attemptId,b.generation,b.transportId,b.threadId,b.turnId);return !!row&&hooks.current(b);}
 function stale():never{throw new BuildError('STALE_PERMISSION_REQUEST','This permission belongs to an inactive Build Attempt or transport.');}
 function request(envelope:PermissionEnvelope){
  if(!current(envelope.binding))stale();
  const attempt=db.prepare('SELECT mission_id,workspace_path FROM build_attempts WHERE id=?').get(envelope.binding.attemptId)!;
  const b=envelope.binding;
  const prior=db.prepare('SELECT * FROM runtime_permission_requests WHERE mission_id=? AND attempt_id=? AND generation=? AND transport_id=? AND thread_id=? AND provider_method=? AND provider_id_json=?').get(attempt.mission_id!,b.attemptId,b.generation,b.transportId,b.threadId,envelope.request.method,JSON.stringify(envelope.request.id));
  let validated:ReturnType<typeof validatePermission>;
  try{validated=validatePermission(envelope,config.dataDir,String(attempt.workspace_path));}catch(error){if(prior){invalidate(b.attemptId);throw new BuildError('PERMISSION_PAYLOAD_MISMATCH','An existing provider binding no longer carries a supported exact payload.');}throw error;}
  if(prior){if(prior.payload_hash!==validated.payloadHash||prior.turn_id!==b.turnId||prior.provider_item_id!==validated.providerItemId){invalidate(b.attemptId);throw new BuildError('PERMISSION_PAYLOAD_MISMATCH','Provider changed a previously bound permission payload.');}return String(prior.id);}
  if(Number(db.prepare('SELECT count(*) AS n FROM runtime_permission_requests WHERE attempt_id=?').get(b.attemptId)?.n)>=31)throw new BuildError('PERMISSION_LIMIT','This Attempt has reached its bounded permission inventory.');
  const id=randomUUID();
  db.prepare("INSERT INTO runtime_permission_requests(id,mission_id,attempt_id,generation,transport_id,thread_id,turn_id,provider_method,provider_id_json,provider_item_id,payload_canonical,payload_hash,path,requested_scope,reason,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'turn',?,'PENDING',?)").run(id,attempt.mission_id!,b.attemptId,b.generation,b.transportId,b.threadId,b.turnId,envelope.request.method,JSON.stringify(envelope.request.id),validated.providerItemId,validated.payloadCanonical,validated.payloadHash,validated.path,validated.reason,envelope.receivedAt);
  hooks.event(b,'permission.requested',{requestId:id,payloadHash:validated.payloadHash});return id;
 }
 async function decide(id:string,decision:PermissionDecision,payloadHash:string){
  if(decision!=='ALLOW'&&decision!=='DENY')throw new BuildError('INVALID_PERMISSION_DECISION','Decision must be Allow or Deny.',400);
  db.exec('BEGIN IMMEDIATE');let r:RuntimePermissionRequest;
  try{
   r=get(id);if(r.status==='INVALIDATED'||!current(binding(r))||r.payloadHash!==payloadHash)stale();
   if(r.status!=='PENDING'||r.decision!==null)throw new BuildError('ALREADY_RESOLVED','A decision has already been committed for this request.');
   // Revalidate the narrow namespace immediately before committing capability authority.
   const attempt=db.prepare('SELECT workspace_path FROM build_attempts WHERE id=?').get(r.attemptId)!;
   validatePermission({binding:binding(r),request:{method:r.providerMethod,id:r.providerRequestId,params:JSON.parse(r.payloadCanonical)},receivedAt:r.createdAt},config.dataDir,String(attempt.workspace_path));
   const now=new Date().toISOString();const changed=db.prepare("UPDATE runtime_permission_requests SET decision=?,decided_at=?,status=? WHERE id=? AND status='PENDING' AND decision IS NULL").run(decision,now,decision==='ALLOW'?'ALLOW_DECIDED':'DENY_DECIDED',id);
   if(changed.changes!==1)throw new BuildError('ALREADY_RESOLVED','A decision has already been committed for this request.');
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  hooks.event(binding(r),'permission.decided',{requestId:id,decision});
  if(!current(binding(r))){invalidate(r.attemptId);stale();}
  const attempted=new Date().toISOString();db.prepare('UPDATE runtime_permission_requests SET write_attempted_at=? WHERE id=?').run(attempted,id);
  try{
   const permissions=decision==='ALLOW'?{fileSystem:JSON.parse(r.payloadCanonical).permissions.fileSystem}:{};
   await hooks.dispatch({requestId:id,binding:binding(r),method:r.providerMethod,providerId:r.providerRequestId,payloadHash:r.payloadHash,response:{permissions,scope:'turn'}});
   // The resolved notification may arrive synchronously during dispatch.
   const after=get(id);if(after.status!=='INVALIDATED'){db.prepare("UPDATE runtime_permission_requests SET written_at=?,status=CASE WHEN status='RESOLVED' THEN status ELSE 'TRANSPORT_WRITTEN' END WHERE id=?").run(new Date().toISOString(),id);hooks.event(binding(r),'permission.transport_written',{requestId:id});}
  }catch(error){db.prepare("UPDATE runtime_permission_requests SET status='DELIVERY_UNKNOWN' WHERE id=? AND status IN('ALLOW_DECIDED','DENY_DECIDED')").run(id);throw new BuildError('PERMISSION_DELIVERY_UNKNOWN','Permission decision was committed, but transport delivery could not be established.');}
  return get(id);
 }
 function resolved(b:RuntimeBinding,providerId:string|number){if(!current(b))return;const row=db.prepare("SELECT * FROM runtime_permission_requests WHERE attempt_id=? AND generation=? AND transport_id=? AND thread_id=? AND turn_id=? AND provider_id_json=? AND decision IS NOT NULL AND status IN('ALLOW_DECIDED','DENY_DECIDED','TRANSPORT_WRITTEN','DELIVERY_UNKNOWN')").get(b.attemptId,b.generation,b.transportId,b.threadId,b.turnId,JSON.stringify(providerId));if(!row)return;const now=new Date().toISOString();db.prepare("UPDATE runtime_permission_requests SET status='RESOLVED',provider_resolved_at=?,resolved_at=? WHERE id=?").run(now,now,row.id!);hooks.event(b,'permission.resolved',{requestId:row.id});}
 function invalidate(attemptId:string){db.prepare("UPDATE runtime_permission_requests SET status='INVALIDATED',invalidated_at=?,resolved_at=? WHERE attempt_id=? AND status NOT IN('INVALIDATED','RESOLVED')").run(new Date().toISOString(),new Date().toISOString(),attemptId);}
 const list=(attemptId:string)=>db.prepare('SELECT * FROM runtime_permission_requests WHERE attempt_id=? ORDER BY created_at,id').all(attemptId).map(read);
 const unresolved=(attemptId:string)=>!!db.prepare("SELECT id FROM runtime_permission_requests WHERE attempt_id=? AND status NOT IN('INVALIDATED','RESOLVED') LIMIT 1").get(attemptId);
 function attention():RuntimeAttentionItem[]{return db.prepare("SELECT p.id,p.mission_id,p.path,p.reason,b.slice_id,m.project_id,m.original_intent,j.display_name FROM runtime_permission_requests p JOIN build_attempts b ON b.id=p.attempt_id JOIN missions m ON m.id=p.mission_id JOIN projects j ON j.id=m.project_id LEFT JOIN build_runtime_state r ON r.attempt_id=b.id WHERE p.status='PENDING' AND b.status='RUNNING' AND b.transport_valid=1 AND r.cancel_requested_at IS NULL ORDER BY p.created_at,p.id").all().filter(row=>current(binding(get(String(row.id))))).map(row=>({kind:'runtime_permission',requestId:String(row.id),missionId:String(row.mission_id),projectId:String(row.project_id),projectName:String(row.display_name),originalIntent:String(row.original_intent),sliceId:String(row.slice_id),path:String(row.path),reason:String(row.reason),requestedScope:'turn'}));}
 const history=(missionId:string,attemptId:string)=>db.prepare('SELECT * FROM runtime_permission_requests WHERE mission_id=? AND attempt_id!=? ORDER BY created_at DESC LIMIT 100').all(missionId,attemptId).map(read);
 return {request,decide,resolved,invalidate,list,unresolved,attention,history};
}
