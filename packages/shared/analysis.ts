export const ANALYSIS_PROMPT_VERSION='mission-analysis-v1';
export const PACKET_LIMITS=Object.freeze({files:12,guidanceFiles:3,manifestFiles:2,blocks:40,blockBytes:8192,evidenceBytes:131072,packetBytes:262144,fileBytes:1048576,searchFiles:200,searchMatches:160,gitBytes:33554432,searchMs:4000});
export type EvidenceBlock={id:string;path:string;kind:'guidance'|'manifest'|'source'|'test'|'config';startLine:number;endLine:number;content:string;contentHash:string};
export type AnalysisPacket={version:'analysis-packet-v1';missionId:string;snapshotId:string;originalIntent:string;project:{baseHead:string;branch:string|null;dirty:boolean;structure:{path:string;kind:'file'|'directory';count:number}[]};evidence:EvidenceBlock[];limits:typeof PACKET_LIMITS;evidenceTruncated:boolean;sourcePolicy:'committed-head-only'};
export const DECISION_AREAS=['behavior','security','compatibility','data','migration','performance','acceptance','scope','architecture','ux','failure'] as const;
export type DecisionArea=typeof DECISION_AREAS[number];
export type AnalysisClaim={text:string;kind:'observation'|'inference'|'uncertainty';evidenceIds:string[]};
export type QuestionDraft={question:string;whyItMatters:string;decisionArea:DecisionArea;options:string[];evidenceIds:string[]};
// A tool-free candidate description; native BASE admission is the only execution witness.
export type ReproducibleBug={summary:string;reproduction:string;expectedBehavior:string;evidenceIds:string[];sourcePaths:string[];existingTestPaths:string[]};
export type AnalysisResult={reproducibleBug?:ReproducibleBug|null;understanding:{relevantAreas:AnalysisClaim[];currentBehavior:AnalysisClaim[];constraints:AnalysisClaim[];uncertainties:AnalysisClaim[]};questions:QuestionDraft[]};
export type AnalysisStatus='PREPARING'|'RUNNING'|'SUCCEEDED'|'FAILED'|'INTERRUPTED';
export type MissionAnalysis={id:string;missionId:string;snapshotId:string;baseHead:string;packetHash:string|null;promptVersion:string;toolVersion:string|null;status:AnalysisStatus;packet:AnalysisPacket|null;result:AnalysisResult|null;packetMillis:number|null;analysisMillis:number|null;createdAt:string;completedAt:string|null;error:string|null};
export type ClarificationQuestion=QuestionDraft&{id:string;analysisId:string;required:true;order:number;createdAt:string;answer:{text:string;updatedAt:string}|null};
export type MissionPhase='DRAFT'|'NEEDS_CLARIFICATION'|'CLARIFIED'|'CONTRACT_REVIEW'|'CONTRACT_READY'|'PLAN_REVIEW'|'PLAN_READY'|'BUILDING'|'CANDIDATE_READY';
export type AnalysisView={analysis:MissionAnalysis|null;operation:MissionAnalysis|null;questions:ClarificationQuestion[];phase:MissionPhase;stale:boolean};
export type AttentionItem={questionId:string;missionId:string;projectId:string;projectName:string;originalIntent:string;question:string;decisionArea:DecisionArea};
export type AttentionResponse={items:AttentionItem[];count:number};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
function hash(v:unknown):v is string{return typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);}
function strings(v:unknown,max:number,count:number):v is string[]{return Array.isArray(v)&&v.length<=count&&v.every(s=>text(s,max));}
function isResult(v:unknown):v is AnalysisResult {
 if(!object(v)||!(v.reproducibleBug===undefined||v.reproducibleBug===null||(object(v.reproducibleBug)&&Object.keys(v.reproducibleBug).sort().join(',')==='evidenceIds,existingTestPaths,expectedBehavior,reproduction,sourcePaths,summary'&&text(v.reproducibleBug.summary,600)&&text(v.reproducibleBug.reproduction,700)&&text(v.reproducibleBug.expectedBehavior,700)&&strings(v.reproducibleBug.evidenceIds,100,8)&&strings(v.reproducibleBug.sourcePaths,500,6)&&strings(v.reproducibleBug.existingTestPaths,500,6)))||!object(v.understanding)||!Array.isArray(v.questions)||v.questions.length>5)return false;
 const claims=(value:unknown)=>Array.isArray(value)&&value.length<=8&&value.every(c=>object(c)&&text(c.text,900)&&['observation','inference','uncertainty'].includes(c.kind as string)&&strings(c.evidenceIds,100,8));
 return ['relevantAreas','currentBehavior','constraints','uncertainties'].every(k=>claims((v.understanding as Record<string,unknown>)[k]))&&v.questions.every(q=>object(q)&&text(q.question,600)&&text(q.whyItMatters,500)&&DECISION_AREAS.includes(q.decisionArea as DecisionArea)&&strings(q.options,180,5)&&strings(q.evidenceIds,100,8));
}
function isPacket(v:unknown):v is AnalysisPacket {
 if(!object(v)||v.version!=='analysis-packet-v1'||!text(v.missionId,100)||!text(v.snapshotId,100)||!text(v.originalIntent,8000)||!object(v.project)||typeof v.project.baseHead!=='string'||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(v.project.baseHead)||!(v.project.branch===null||typeof v.project.branch==='string')||typeof v.project.dirty!=='boolean'||!Array.isArray(v.project.structure)||!Array.isArray(v.evidence)||v.evidence.length>40)return false;
 return typeof v.evidenceTruncated==='boolean'&&v.sourcePolicy==='committed-head-only'&&object(v.limits)&&v.evidence.every(e=>object(e)&&text(e.id,100)&&text(e.path,4096)&&['guidance','manifest','source','test','config'].includes(e.kind as string)&&Number.isInteger(e.startLine)&&Number.isInteger(e.endLine)&&Number(e.startLine)>0&&Number(e.endLine)>=Number(e.startLine)&&typeof e.content==='string'&&e.content.length<=8192&&hash(e.contentHash));
}
function isAnalysis(v:unknown):v is MissionAnalysis {
 if(!object(v)||!text(v.id,100)||!text(v.missionId,100)||!text(v.snapshotId,100)||!['PREPARING','RUNNING','SUCCEEDED','FAILED','INTERRUPTED'].includes(v.status as string)||!text(v.baseHead,64)||!text(v.promptVersion,100)||!text(v.createdAt,100))return false;
 if(!(v.packet===null||isPacket(v.packet))||!(v.result===null||isResult(v.result))||!(v.packetHash===null||hash(v.packetHash))||!(v.error===null||text(v.error,1000)))return false;
 return v.status!=='SUCCEEDED'||(v.packet!==null&&v.result!==null&&v.packetHash!==null&&text(v.toolVersion,100));
}
export function isAnalysisView(v:unknown):v is AnalysisView {
 return object(v)&&['DRAFT','NEEDS_CLARIFICATION','CLARIFIED','CONTRACT_REVIEW','CONTRACT_READY','PLAN_REVIEW','PLAN_READY','BUILDING','CANDIDATE_READY'].includes(v.phase as string)&&typeof v.stale==='boolean'&&Array.isArray(v.questions)&&v.questions.length<=5&&v.questions.every(q=>object(q)&&text(q.id,100)&&text(q.analysisId,100)&&text(q.question,600)&&text(q.whyItMatters,500)&&DECISION_AREAS.includes(q.decisionArea as DecisionArea)&&strings(q.options,180,5)&&strings(q.evidenceIds,100,8)&&q.required===true&&Number.isInteger(q.order)&&Number(q.order)>=0&&Number(q.order)<5&&(q.answer===null||(object(q.answer)&&text(q.answer.text,4000)&&text(q.answer.updatedAt,100))))&&(v.analysis===null||isAnalysis(v.analysis))&&(v.operation===null||isAnalysis(v.operation));
}
export function isAttentionResponse(v:unknown):v is AttentionResponse{return object(v)&&Array.isArray(v.items)&&v.items.length===v.count&&v.items.every(i=>object(i)&&text(i.questionId,100)&&text(i.missionId,100)&&text(i.projectId,100)&&text(i.projectName,120)&&text(i.originalIntent,8000)&&text(i.question,600)&&DECISION_AREAS.includes(i.decisionArea as DecisionArea));}
