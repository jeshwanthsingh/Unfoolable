import {createBuildStore} from '../apps/server/build-store.ts';
import type {DatabaseSync} from 'node:sqlite';
// Explicit disposable B9 fixture generator. No AI calls; not a product execution adapter.
import {mkdirSync,writeFileSync,readFileSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const {createApplication}=process.argv.includes('--production')?await import('../dist/server/apps/server/application.js'):await import('../apps/server/application.ts');
import {registerProject} from '../apps/server/projects.ts';
import {createMission} from '../apps/server/missions.ts';
import {createContextStore} from '../apps/server/context-store.ts';
import {createAnalysisStore} from '../apps/server/analysis-store.ts';
import {createContractStore} from '../apps/server/contract-store.ts';
import {createPlanningStore} from '../apps/server/planning-store.ts';
import type {ContractPayload} from '../packages/shared/contracts.ts';
import type {PlanningPayload} from '../packages/shared/planning.ts';
if(!process.argv.includes('--fixture'))throw Error('Explicit --fixture required; disposable local fixtures only.');
const mode=process.argv[process.argv.indexOf('--case')+1]??'bad';
if(!['bad','fixed','tampered','slow','manual'].includes(mode))throw Error('Unknown fixture case');
const root=resolve(process.argv[process.argv.indexOf('--root')+1]??'data/breakout9-smoke');
mkdirSync(root,{recursive:true,mode:0o700});const canonical=realpathSync(root),repo=join(canonical,'source'),dataDir=join(canonical,'data'),artifact=resolve('artifacts/breakout-9');mkdirSync(artifact,{recursive:true});
const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
const logger=(entry:unknown)=>console.log(JSON.stringify(entry));
const app=createApplication({dataDir,projectRoots:[canonical],port:0,development:false,webRoot:resolve('dist/web')},logger);
if(!app.database.connection.prepare('SELECT id FROM projects').get()){
 mkdirSync(repo);git('init','-q');git('config','user.name','Disposable Fixture');git('config','user.email','fixture@example.invalid');
 writeFileSync(join(repo,'approval.py'),'def apply_proposal(allowed, effect):\n    effect()\n    return allowed\n');
 writeFileSync(join(repo,'test_approval.py'),`import unittest\nfrom approval import apply_proposal\n\nclass ApprovalTests(unittest.TestCase):\n    def test_allowed_runs_once(self):\n        effects = []\n        self.assertTrue(apply_proposal(True, lambda: effects.append("effect")))\n        self.assertEqual(effects, ["effect"])\n\n    def test_denied_never_runs(self):\n        effects = []\n        self.assertFalse(apply_proposal(False, lambda: effects.append("effect")))\n        self.assertEqual(effects, [])\n`);
 writeFileSync(join(repo,'.gitignore'),'__pycache__/\n.cc-runtime/\n');git('add','.');git('commit','-qm','Disposable denial fixture base');
 const db=app.database.connection,project=await registerProject(db,{displayName:'Verification '+mode+' fixture',repoPath:repo},[canonical],logger),mission=createMission(db,project.id,{originalIntent:'Fix the denial path: a denied proposal must never run its effect. Preserve the allowed path and the public API.'},logger);
 const context=createContextStore(db,[canonical],logger);await context.capture(mission.id);
 const analyses=createAnalysisStore(db,[canonical],logger,async()=>({output:{understanding:{relevantAreas:[],currentBehavior:[],constraints:[],uncertainties:[]},questions:[]},toolVersion:'deterministic-development-fixture',elapsedMs:0}));await analyses.analyze(mission.id);analyses.close();
 const item=(id:string,text:string)=>({id,text,sourceIds:['intent']});
 const contract:ContractPayload={goal:item('G1','Prevent denied proposals from running effects.'),requirements:[item('R1','A denied proposal returns false without invoking the effect.'),item('R2','An allowed proposal invokes the effect exactly once and returns true.')],scope:[item('S1','The tiny approval module and its existing tests.')],nonGoals:[item('NG1','No runtime permissions, networking, storage, or new dependencies.')],constraints:[item('C1','Preserve the public apply_proposal API.')],assumptions:[],risks:[]};
 const contracts=createContractStore(db,logger,async()=>({output:contract,toolVersion:'deterministic-development-fixture',elapsedMs:0}));contracts.accept((await contracts.compile(mission.id)).draft!.id);contracts.close();
 const plan:PlanningPayload={plan:{verticalSlices:[{id:'S1',title:'Denied proposal produces no effect',outcome:'A denied proposal returns false and does not invoke its effect.',requirementIds:['R1','R2'],preconditions:[],userVisibleFlow:['Submit a denied proposal.','Observe false and zero effects.','Allowed proposals retain their existing behavior.'],evaluationClaimIds:['E1','E2'],order:1}],crossCuttingRequirements:[],riskHandling:[]},evaluationContract:{claims:[{id:'E1',claim:'Denied proposals never invoke the effect.',requirementIds:['R1'],constraintIds:['C1'],riskIds:[],verificationType:'unit',requiredEvidence:['Denial test records zero effects and false return.'],preconditions:[],manualRationale:null,notes:''},{id:'E2',claim:'Allowed proposals run exactly once with true return.',requirementIds:['R2'],constraintIds:[],riskIds:[],verificationType:'unit',requiredEvidence:['Existing allowed-path test records one effect and true return.'],preconditions:[],manualRationale:null,notes:''}]}};
 const planning=createPlanningStore(db,logger,async()=>({output:plan,toolVersion:'deterministic-development-fixture',elapsedMs:0}));if(mode==='manual'){plan.evaluationContract.claims.push({id:'E3',claim:'Inspect the fixture presentation.',requirementIds:['R1'],constraintIds:[],riskIds:[],verificationType:'manual',requiredEvidence:['Local operator evidence note.'],preconditions:[],manualRationale:'A subjective human judgment must assess fixture evidence readability; deterministic automated checks cannot establish that observation.',notes:''});plan.plan.verticalSlices[0]!.evaluationClaimIds.push('E3');}
 planning.accept((await planning.compile(mission.id)).draft!.id);planning.close();
 writeFileSync(join(artifact,'source-before-'+mode+'.json'),JSON.stringify({head:git('rev-parse','HEAD'),status:git('status','--porcelain'),indexHash:createHash('sha256').update(readFileSync(join(repo,'.git/index'))).digest('hex'),approval:readFileSync(join(repo,'approval.py'),'utf8')},null,2));
}
await app.start();
await initializeCandidate(app.database.connection,dataDir,canonical,mode);const address=app.server.address();if(!address||typeof address==='string')throw Error('No loopback address');
const project=app.database.connection.prepare('SELECT id FROM projects').get()!,mission=app.database.connection.prepare('SELECT id FROM missions').get()!;
writeFileSync(join(artifact,'session-'+(process.argv.includes('--fresh')?'fresh':mode)+'.json'),JSON.stringify({coordinatorPid:process.pid,url:`http://127.0.0.1:${address.port}`,root:canonical,dataDir,source:repo,projectId:project.id,missionId:mission.id},null,2));
console.log(JSON.stringify({event:'smoke.ready',url:`http://127.0.0.1:${address.port}`,missionId:mission.id}));
process.on('SIGINT',()=>void app.close());process.on('SIGTERM',()=>void app.close());

async function initializeCandidate(db:DatabaseSync,data:string,root:string,mode:string){
 const mission=String(db.prepare('SELECT id FROM missions').get()!.id);
 if(db.prepare('SELECT id FROM build_candidates').get())return;
 const clean={verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null};
 const store=createBuildStore(db,{dataDir:data,projectRoots:[root]},logger,{version:async()=>'codex-cli 0.160.0',reconcile:async()=>clean,run:async(context,_input,_signal,callbacks)=>{
  callbacks.binding({attemptId:context.attemptId,generation:context.generation,transportId:context.transportId,threadId:'fixture-thread',turnId:'fixture-turn'});
  if(['fixed','manual'].includes(mode))writeFileSync(join(context.workspace,'approval.py'),'def apply_proposal(allowed, effect):\n    if allowed:\n        effect()\n    return allowed\n');
  if(mode==='tampered')writeFileSync(join(context.workspace,'test_approval.py'),'import unittest\nclass HiddenBug(unittest.TestCase):\n    def test_always_passes(self):\n        self.assertTrue(True)\n');
  if(mode==='slow')writeFileSync(join(context.workspace,'approval.py'),'import time\ndef apply_proposal(allowed, effect):\n    time.sleep(60)\n    if allowed:\n        effect()\n    return allowed\n');
  return {threadId:'fixture-thread',turnId:'fixture-turn',summary:'Deterministic development fixture; no AI Builder call.',checks:[],cleanup:clean,startupMs:0,builderMs:0};
 }});
 await store.recover();await store.start(mission,'S1');
 for(const end=Date.now()+10000;Date.now()<end;){const view=store.view(mission);if(view.attempt?.status==='CANDIDATE'){await store.close();return;}if(view.attempt&&['FAILED','RECONCILE_REQUIRED'].includes(view.attempt.status))throw Error(view.attempt.failureMessage??'Fixture capture failed');await new Promise(r=>setTimeout(r,25));}
 throw Error('Fixture capture timed out');
}
