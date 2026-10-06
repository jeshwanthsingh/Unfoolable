export const FRAME_LIMIT=1024*1024,RAW_LOG_LIMIT=2*1024*1024,EVENT_LIMIT=4096;
export function sanitizeBuildValue(value:unknown,depth=0):unknown{
 if(depth>16)return '[DEPTH_LIMIT]';
 if(Array.isArray(value))return [...value.slice(0,1000).map(v=>sanitizeBuildValue(v,depth+1)),...(value.length>1000?['[ITEM_LIMIT]']:[])];
 if(value&&typeof value==='object'){const entries=Object.entries(value);return Object.fromEntries([...entries.slice(0,1000).map(([key,v])=>[key,/token|password|credential|authorization|cookie|api.?key|secret/i.test(key)?'[REDACTED]':sanitizeBuildValue(v,depth+1)]),...(entries.length>1000?[['truncated',true]]:[])]);}
 if(typeof value==='string')return value.replace(/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z ]+ )?PRIVATE KEY-----|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|Bearer\s+[^\s"']+|(?:password|api[_-]?key|secret|token)\s*[=:]\s*[^\s"']+/gi,'[REDACTED]');return value;
}
export function boundedBuildData(value:unknown):unknown{const sanitized=sanitizeBuildValue(value);const serialized=JSON.stringify(sanitized);return Buffer.byteLength(serialized)<=EVENT_LIMIT?sanitized:{truncated:true,detail:Buffer.from(serialized).subarray(0,1500).toString('utf8')};}
export function unsupportedResponse(method:string,id:string|number){
 if(method==='item/permissions/requestApproval')return {id,result:{permissions:{},scope:'turn'}};
 if(method==='item/commandExecution/requestApproval'||method==='item/fileChange/requestApproval')return {id,result:{decision:'decline'}};
 if(method==='execCommandApproval'||method==='applyPatchApproval')return {id,result:{decision:'denied'}};
 return {id,error:{code:-32601,message:'Unsupported server request; no capability granted'}};
}
export function normalizeBuildEvent(method:string,params:Record<string,any>):{kind:string;data:unknown}|null{
 if(method==='turn/started')return {kind:'turn.started',data:{status:params.turn?.status}};
 if(method==='turn/completed')return {kind:'builder.completed',data:{status:params.turn?.status,error:params.turn?.error?.message}};
 if(method==='item/started'||method==='item/completed'){
  const item=params.item;if(!item)return null;
  if(item.type==='commandExecution')return {kind:method==='item/started'?'tool.started':'tool.completed',data:{itemId:item.id,type:item.type,command:item.command,cwd:item.cwd,actions:item.commandActions,status:item.status,exitCode:item.exitCode,durationMs:item.durationMs}};
  if(item.type==='fileChange')return {kind:method==='item/started'?'tool.started':'tool.completed',data:{itemId:item.id,type:item.type,status:item.status,changes:Array.isArray(item.changes)?item.changes.map((c:any)=>({path:c?.path,kind:c?.kind})):[]}};
 }
 return null;
}
