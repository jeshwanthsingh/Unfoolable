import {test} from 'node:test';
import assert from 'node:assert/strict';
import {journey} from '../apps/web/src/presentation.ts';
import type {AnalysisView} from '../packages/shared/analysis.ts';
import {PACKET_LIMITS} from '../packages/shared/analysis.ts';
const mission={id:'mission',projectId:'project',originalIntent:'Fix retry behavior.',phase:'DRAFT' as const,createdAt:'2026-01-01'};
const completed:NonNullable<AnalysisView['analysis']>={id:'analysis',missionId:mission.id,snapshotId:'snapshot',baseHead:'a'.repeat(40),packetHash:'b'.repeat(64),promptVersion:'mission-analysis-v1',toolVersion:'fake',status:'SUCCEEDED',createdAt:'2026-01-02',completedAt:'2026-01-02',error:null,packetMillis:1,analysisMillis:2,packet:{version:'analysis-packet-v1',missionId:mission.id,snapshotId:'snapshot',originalIntent:mission.originalIntent,project:{baseHead:'a'.repeat(40),branch:'main',dirty:false,structure:[]},evidence:[],limits:PACKET_LIMITS,evidenceTruncated:false,sourcePolicy:'committed-head-only'},result:{understanding:{relevantAreas:[],currentBehavior:[],constraints:[],uncertainties:[]},questions:[]}};
const view:AnalysisView={analysis:null,operation:null,questions:[],phase:'DRAFT',stale:false};
test('Clarify distinguishes absent context, available analysis and real process activity',()=>{
 const stage=(context:'absent'|'captured',data:AnalysisView)=>journey(context,mission,data)[2]!;
 assert.equal(stage('absent',view).status,'Context required');assert.equal(stage('captured',view).status,'Analysis available');
 assert.equal(stage('captured',{...view,operation:{...completed,status:'PREPARING'}}).status,'Preparing evidence');
 assert.equal(stage('captured',{...view,operation:{...completed,status:'RUNNING'}}).status,'ANALYZING');
});
test('zero-question success clarifies, while failed and unavailable outcomes never imply completion',()=>{
 assert.equal(journey('captured',mission,{...view,analysis:completed,operation:completed,phase:'CLARIFIED'})[2]!.status,'CLARIFIED');
 assert.equal(journey('captured',mission,{...view,operation:{...completed,status:'FAILED'}})[2]!.state,'failed');
 assert.equal(journey('captured',mission,null)[2]!.state,'unknown');
});
test('required unanswered questions activate attention while all execution stations remain unavailable',()=>{
 const question={id:'question',analysisId:'analysis',question:'Which retry behavior?',whyItMatters:'Changes failure behavior.',decisionArea:'failure' as const,options:[],evidenceIds:[],required:true as const,order:0,createdAt:'2026-01-02',answer:null};
 const stations=journey('captured',mission,{...view,analysis:completed,operation:completed,phase:'NEEDS_CLARIFICATION',questions:[question]});
 assert.equal(stations[2]!.state,'attention');assert.equal(stations[2]!.status,'NEEDS YOU · 1');
 assert.deepEqual(stations.slice(3).map(s=>[s.label,s.state,s.status]),['Define','Build','Verify','Proof'].map(label=>[label,'locked','Not available yet']));
});
