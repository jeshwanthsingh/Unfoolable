import type {VerificationAttention} from './verification.ts';
import {isAttentionResponse as isPlanningAttentionResponse,type AttentionResponse as PlanningAttentionResponse} from './planning.ts';
import type {RuntimeAttentionItem,ReconciliationAttentionItem} from './permissions.ts';
export type AttentionItem=PlanningAttentionResponse['items'][number]|RuntimeAttentionItem|ReconciliationAttentionItem|VerificationAttention;
export type AttentionResponse={items:AttentionItem[];count:number};
const text=(v:unknown,max=8000):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
export function isAttentionResponse(value:unknown):value is AttentionResponse{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 if(Object.keys(v).some(k=>!['items','count'].includes(k))||!Array.isArray(v.items)||v.count!==v.items.length)return false;
 return v.items.every(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return false;
  const i=item as Record<string,unknown>;
  if(i.kind==='manual_evaluation')return Object.keys(i).length===7&&['kind','runId','claimId','missionId','projectId','projectName','originalIntent'].every(k=>Object.hasOwn(i,k))&&text(i.runId,200)&&text(i.claimId,200)&&text(i.missionId,200)&&text(i.projectId,200)&&text(i.projectName,120)&&text(i.originalIntent);
  if(i.kind!=='runtime_permission'&&i.kind!=='reconciliation')return isPlanningAttentionResponse({items:[i],count:1});
  const fields=i.kind==='runtime_permission'?['kind','requestId','missionId','projectId','projectName','originalIntent','sliceId','path','reason','requestedScope']:['kind','attemptId','missionId','projectId','projectName','originalIntent','reason'];
  if(Object.keys(i).length!==fields.length||Object.keys(i).some(k=>!fields.includes(k)))return false;
  if(!text(i.missionId,200)||!text(i.projectId,200)||!text(i.projectName,120)||!text(i.originalIntent)||typeof i.reason!=='string'||i.reason.length>2000)return false;
  return i.kind==='runtime_permission'?text(i.requestId,200)&&text(i.sliceId,200)&&text(i.path,4096)&&i.requestedScope==='turn':text(i.attemptId,200);
 });
}
