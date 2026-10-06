import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../../apps/server/database.ts';
import {createContractStore,type ContractDrafter} from '../../apps/server/contract-store.ts';
import {payloadHash} from '../../apps/server/context-observation.ts';
import {PACKET_LIMITS} from '../../packages/shared/analysis.ts';
import type {ContractPayload} from '../../packages/shared/contracts.ts';
const quiet=()=>{};
const payload=():ContractPayload=>({goal:{id:'G1',text:'Preserve retry behavior.',sourceIds:['intent']},requirements:[{id:'R1',text:'Stop retrying after denial.',sourceIds:['answer:question']}],scope:[{id:'S1',text:'Retry behavior.',sourceIds:['intent']}],nonGoals:[{id:'NG1',text:'Mobile integrations.',sourceIds:['intent']}],constraints:[],assumptions:[],risks:[]});
function contractFixture(drafter:ContractDrafter=async()=>({output:payload(),toolVersion:'fake',elapsedMs:2})){
 const root=mkdtempSync(join(tmpdir(),'cc-contract-')),database=openDatabase(join(root,'data'),quiet),db=database.connection;
 db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('project','Project','/fixture','a'.repeat(40),null,'2026-01-01');
 db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('mission','project','Preserve retry behavior.','DRAFT','2026-01-02');
 db.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run('snapshot','mission','{}','b'.repeat(64),'2026-01-03');
 const packet={version:'analysis-packet-v1',missionId:'mission',snapshotId:'snapshot',originalIntent:'Preserve retry behavior.',project:{baseHead:'a'.repeat(40),branch:'main',dirty:false,structure:[]},evidence:[],limits:PACKET_LIMITS,evidenceTruncated:false,sourcePolicy:'committed-head-only'};
 db.prepare("INSERT INTO mission_analyses(id,mission_id,context_snapshot_id,base_head,status,packet_json,packet_hash,prompt_version,tool_version,result_json,created_at,completed_at) VALUES('analysis','mission','snapshot',?,'SUCCEEDED',?,?,'v1','fake',?,'2026-01-04','2026-01-05')").run('a'.repeat(40),JSON.stringify(packet),payloadHash(packet),JSON.stringify({understanding:{relevantAreas:[],currentBehavior:[],constraints:[],uncertainties:[]},questions:[]}));
 db.prepare("INSERT INTO clarification_questions VALUES('question','analysis','What happens after denial?','Determine behavior','behavior','[]','[]',1,0,'2026-01-05')").run();
 db.prepare("INSERT INTO clarification_answers VALUES('question','Stop retrying after denial.','2026-01-06')").run();
 const store=createContractStore(db,quiet,drafter);
 return {root,database,db,store,finish(){store.close();database.close();rmSync(root,{recursive:true,force:true});}};
}
import {createPlanningStore,type PlanningDrafter} from '../../apps/server/planning-store.ts';
import type {PlanningPayload} from '../../packages/shared/planning.ts';
const planningPayload=():PlanningPayload=>({plan:{verticalSlices:[{id:'S1',title:'Denial stops retrying',outcome:'Denied retry produces no subsequent action.',requirementIds:['R1'],preconditions:[],userVisibleFlow:['Retry request is denied.','No subsequent retry occurs.'],evaluationClaimIds:['E1'],order:1}],crossCuttingRequirements:[],riskHandling:[]},evaluationContract:{claims:[{id:'E1',claim:'Denied retry produces no subsequent retry.',requirementIds:['R1'],constraintIds:[],riskIds:[],verificationType:'integration',requiredEvidence:['Observable retry count remains unchanged after denial.'],preconditions:[],manualRationale:null,notes:''}]}});
export async function planningFixture(drafter:PlanningDrafter=async()=>({output:planningPayload(),toolVersion:'fake',elapsedMs:2})){
 const f=contractFixture();f.store.accept((await f.store.compile('mission')).draft!.id);const planning=createPlanningStore(f.db,quiet,drafter);
 return {...f,planning,finish(){planning.close();f.finish();}};
}
