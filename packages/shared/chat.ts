import {isNightView} from './night.ts';
import {isReviewRisk,type ReviewRisk} from './review-risk.ts';
import {isReviewEvidence,type TicketReviewEvidence} from './quality-gates.ts';
import {isWriterWarning,type WriterWarning} from './test-writer.ts';
export type ChatRole='user'|'jarvis';
export type ChatUsage={inputTokens:number|null;outputTokens:number|null;totalTokens:number|null;cachedInputTokens:number|null;model:string|null;threadId:string|null};
export type ChatMessage={sequence:number;role:ChatRole;text:string;kind:'message'|'status'|'update'|'draft'|'decision'|'error';draftId:string|null;cardId:string|null;ticketEventSequence:number|null;createdAt:string};
export type ChatDraftStatus='DRAFT'|'QUESTION'|'STARTING'|'STARTED'|'CANCELLED'|'ERROR';
export type ChatDraft={similarTicketId?:string;existingTicketId?:string;id:string;originalMessageId:number;version:number;status:ChatDraftStatus;title:string;repoPath:string;requestText:string;doneMeans:string;question:string|null;questionAsked:boolean;usage:ChatUsage[];ticketId:string|null;createdAt:string;updatedAt:string};
export type ChatAction='keep'|'discard'|'recheck'|'retry'|'continue'|'approve_playbook'|'allow'|'deny';
export type ChatCard={risk?:ReviewRisk;diffReviewRequired?:boolean;review?:TicketReviewEvidence;warnings?:WriterWarning[];id:string;kind:'ticket'|'playbook'|'permission';targetId:string;binding:string;summary:string;verdict:string|null;actions:ChatAction[];status:'PENDING'|'RESOLVING'|'RESOLVED'|'STALE'|'ERROR';resolution:ChatAction|null;createdAt:string;resolvedAt:string|null};
export type ChatFuel={status:'known'|'unknown';windows:{usedPercent:number;windowMinutes:number;resetsAt:number}[]};
export type ChatView={night?:import('./night.ts').NightView;phoneRevision?:number;archivedDraftIds?:string[];notice?:string|null;messages:ChatMessage[];drafts:ChatDraft[];cards:ChatCard[]};

function object(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
const nullableString=(v:unknown)=>v===null||typeof v==='string';
const tokenCount=(v:unknown)=>v===null||(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0);
function isUsage(value:unknown):value is ChatUsage{return object(value)&&['inputTokens','outputTokens','totalTokens','cachedInputTokens'].every(k=>tokenCount(value[k]))&&nullableString(value.model)&&nullableString(value.threadId);}
export function isChatView(value:unknown):value is ChatView{
 if(!object(value)||(value.night!==undefined&&!isNightView(value.night))||(value.phoneRevision!==undefined&&(!Number.isSafeInteger(value.phoneRevision)||Number(value.phoneRevision)<0))||(value.archivedDraftIds!==undefined&&(!Array.isArray(value.archivedDraftIds)||!value.archivedDraftIds.every(id=>typeof id==='string')))||!Array.isArray(value.messages)||!Array.isArray(value.drafts)||!Array.isArray(value.cards))return false;
 return value.messages.every(m=>object(m)&&Number.isSafeInteger(m.sequence)&&['user','jarvis'].includes(String(m.role))&&typeof m.text==='string'&&['message','status','update','draft','decision','error'].includes(String(m.kind))&&nullableString(m.draftId)&&nullableString(m.cardId)&&(m.ticketEventSequence===null||Number.isSafeInteger(m.ticketEventSequence))&&typeof m.createdAt==='string')&&
 value.drafts.every(d=>object(d)&&(d.existingTicketId===undefined||typeof d.existingTicketId==='string')&&(d.similarTicketId===undefined||typeof d.similarTicketId==='string')&&typeof d.id==='string'&&Number.isSafeInteger(d.originalMessageId)&&Number.isSafeInteger(d.version)&&['DRAFT','QUESTION','STARTING','STARTED','CANCELLED','ERROR'].includes(String(d.status))&&['title','repoPath','requestText','doneMeans','createdAt','updatedAt'].every(k=>typeof d[k]==='string')&&nullableString(d.question)&&typeof d.questionAsked==='boolean'&&Array.isArray(d.usage)&&d.usage.every(isUsage)&&nullableString(d.ticketId))&&
 value.cards.every(c=>object(c)&&(c.risk===undefined||isReviewRisk(c.risk))&&(c.diffReviewRequired===undefined||typeof c.diffReviewRequired==='boolean')&&(c.review===undefined||isReviewEvidence(c.review))&&(c.warnings===undefined||Array.isArray(c.warnings)&&c.warnings.every(isWriterWarning))&&['id','targetId','binding','summary','createdAt'].every(k=>typeof c[k]==='string')&&['ticket','playbook','permission'].includes(String(c.kind))&&nullableString(c.verdict)&&Array.isArray(c.actions)&&c.actions.every(a=>['keep','discard','recheck','retry','continue','approve_playbook','allow','deny'].includes(String(a)))&&['PENDING','RESOLVING','RESOLVED','STALE','ERROR'].includes(String(c.status))&&(c.resolution===null||['keep','discard','recheck','retry','continue','approve_playbook','allow','deny'].includes(String(c.resolution)))&&nullableString(c.resolvedAt));
}
