import type {DatabaseSync} from 'node:sqlite';import {listTicketEvents} from './ticket-store.ts';import {sanitizeBuildValue} from './build-protocol.ts';
export const WATCHMAN_LIMIT=10;
export type BlockedAction={itemId:string;category:'read'|'network'|'install'|'sandbox';command:string;reason:string;exitCode:number|null};
export function blockedCommand(itemId:string,command:string,output:string,exitCode:number|null):BlockedAction|null{
 const denied=/permission denied|operation not permitted|\bEPERM\b|\bEACCES\b|PermissionError|sandbox[^\n]*den(?:y|ied)|network is unreachable|\bENETUNREACH\b|\bENOTFOUND\b|NameResolutionError|Failed to resolve|\bENOTCACHED\b|no matching distribution[^\n]*offline/i;
 if(!denied.test(output))return null;
 const install=/(?:npm|pnpm|yarn)\s+(?:install|ci|add)|(?:pip|pip3|uv)(?:\s+-m\s+pip)?\s+(?:install|download|sync)|-m\s+pip\s+(?:install|download)/.test(command);
 const network=/network|ENETUNREACH|ENOTFOUND|NameResolutionError|Failed to resolve/i.test(output)||/\b(?:curl|wget)\b/.test(command);
 const read=/\b(?:cat|head|tail|ls|open|read_text|read_bytes|scandir)\b/.test(command);
 const category=install?'install':network?'network':read?'read':'sandbox';
 return {itemId,category,command:String(sanitizeBuildValue(command)).slice(0,500),reason:{install:'Package installation was blocked.',network:'Network access was blocked.',read:'A read was denied.',sandbox:'The tool reported a sandbox/permission denial.'}[category],exitCode};
}
export function watchmanActions(db:DatabaseSync,id:string){const events=listTicketEvents(db,id),reset=events.filter(e=>e.kind==='retry_requested').at(-1)?.sequence??0;const seen=new Set<string>(),actions:BlockedAction[]=[];
 for(const e of events.filter(e=>e.sequence>reset&&e.kind==='agent_event'&&e.data.kind==='blocked_action')){const a=e.data.data as BlockedAction,key=String(e.data.attemptId)+':'+a.itemId;if(!seen.has(key)){seen.add(key);actions.push(a);}}return actions;
}
