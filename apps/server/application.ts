import {createPhonePush} from './phone-push.ts';
import {phoneJson} from './phone-routes.ts';
import {createPhoneAuth} from './phone-auth.ts';
import {createPhoneRoutes} from './phone-routes.ts';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {phoneOrigin} from './phone-access.ts';
import {archivedDraftIds,changeDraftArchive} from './draft-archive.ts';
import {skillProposal,installSkill} from './skill-imports.ts';
import {createDeskStream} from './desk-stream.ts';
import {createHumanConfirmation,requiresHuman,type HumanOperation} from './human-confirmation.ts';
import {withHumanReceipt,enterHumanReceipt} from './human-context.ts';
import {fixtureApprovalsEnabled} from './data-mode.ts';
import type {RegistrationResponseJSON,AuthenticationResponseJSON} from '@simplewebauthn/server';
import {createChatService} from './chat-service.ts';
import {createChatCodex} from './chat-codex.ts';
import {chatRoute} from './chat-routes.ts';
import {ProjectPlaybookError} from './project-playbooks.ts';
import {createTicketService} from './ticket-service.ts';
import {ticketRoute} from './ticket-routes.ts';
import type {TicketLoopDependencies} from './ticket-loop.ts';
import type {authorVerifyOnly} from './verify-only-author.ts';
import {createVerifyOnly} from './verify-only.ts';
import {verifyOnlyRoute} from './verify-only-routes.ts';
import {createMissionWorkflow} from './mission-workflow.ts';
import {createMissionOutcomeStore} from './mission-outcomes.ts';
import {specRoute} from './spec-routes.ts';
import {SpecError} from './spec-errors.ts';
import {prepareNativeEvaluation} from './oracle-author.ts';
import {constrainFastLanePlanning,isFastLaneAnalysis} from './planning-drafter.ts';
import type {SpecView} from '../../packages/shared/spec.ts';
import type {diagnoseVerificationFailure} from './debug-diagnosis.ts';
import {createDebugStore} from './debug-store.ts';
import {debugRoute} from './debug-routes.ts';
import type {DebugView} from '../../packages/shared/debug.ts';
import {createVerificationStore} from "./verification-store.ts";
import {verificationRoute} from "./verification-routes.ts";
import type {VerificationView} from "../../packages/shared/verification.ts";
import {createBuildStore} from "./build-store.ts";
import {createCodexBuilderDriver} from "./build-runtime.ts";
import {buildRoute} from "./build-routes.ts";
import {BuildError} from "./build-errors.ts";
import type {BuilderDriver,BuildView} from "../../packages/shared/build.ts";
import {createServer} from 'node:http';
import type {ServerResponse} from 'node:http';
import type {AppConfig} from './config.ts';
import {openDatabase} from './database.ts';
import {log} from './log.ts';
import type {Logger} from './log.ts';
import {APP_VERSION} from '../../packages/shared/health.ts';
import type {ApiError,HealthResponse} from '../../packages/shared/health.ts';
import {serveWeb} from './static.ts';
import {listProjects,registerProject} from './projects.ts';
import {projectBody} from './project-body.ts';
import {ProjectError} from './project-errors.ts';
import {MissionError} from './mission-errors.ts';
import {createPlanningStore} from './planning-store.ts';
import {draftMissionPlan} from './planning-drafter.ts';
import type {PlanningDrafter} from './planning-drafter.ts';
import {PlanningError} from './planning-errors.ts';
import type {PlanningView,PlanningPair} from '../../packages/shared/planning.ts';
import type {AttentionResponse as CombinedAttention} from '../../packages/shared/attention.ts';
import type {RuntimePermissionRequest} from '../../packages/shared/permissions.ts';
import {createContractStore} from './contract-store.ts';
import {draftMissionContract} from './contract-drafter.ts';
import type {ContractDrafter} from './contract-drafter.ts';
import {ContractError} from './contract-errors.ts';
import type {ContractView} from '../../packages/shared/contracts.ts';
import {createAnalysisStore} from './analysis-store.ts';
import {analyzeMission} from './mission-analyzer.ts';
import type {MissionAnalyzer} from './mission-analyzer.ts';
import {AnalysisError} from './analysis-errors.ts';
import type {AnalysisView,AttentionResponse} from '../../packages/shared/analysis.ts';
import {createContextStore} from './context-store.ts';
import {ContextError} from './context-errors.ts';
import type {ContextResponse,ProjectContextSnapshot} from '../../packages/shared/context.ts';
import {createMission,listMissions,getMission} from './missions.ts';
import type {Mission,MissionsResponse} from '../../packages/shared/missions.ts';
import type {Project,ProjectsResponse} from '../../packages/shared/projects.ts';

export function createApplication(config:AppConfig,logger:Logger=log,analyzer:MissionAnalyzer=analyzeMission,drafter:ContractDrafter=draftMissionContract,planner:PlanningDrafter=draftMissionPlan,builder:BuilderDriver=createCodexBuilderDriver(),diagnoser?:typeof diagnoseVerificationFailure,options:{autoPrepare?:boolean;prepareOracle?:typeof prepareNativeEvaluation;verifyAuthor?:typeof authorVerifyOnly;ticketDependencies?:TicketLoopDependencies;enforcePasskeys?:boolean;humanAuthenticator?:Parameters<typeof createHumanConfirmation>[3];chatRuntime?:Omit<ReturnType<typeof createChatCodex>,'stopAll'>&{stopAll?:()=>Promise<void>}}={}){
 const database=openDatabase(config.dataDir,logger);
 const verifyOnly=createVerifyOnly(database.connection,config,logger,options.verifyAuthor);
 const tickets=createTicketService(database.connection,config,verifyOnly,options.ticketDependencies);
 const context=createContextStore(database.connection,config.projectRoots,logger);
 const analyses=createAnalysisStore(database.connection,config.projectRoots,logger,(packet,signal,onStarted)=>analyzer(packet,signal,onStarted,config.dataDir));
 const contracts=createContractStore(database.connection,logger,(input,signal,onStarted)=>drafter(input,signal,onStarted,config.dataDir));
 const coordinatedPlanner:PlanningDrafter=async(input,signal,onStarted)=>{const result=await planner(input,signal,onStarted,config.dataDir);return {...result,output:constrainFastLanePlanning(result.output,input,analyses.view(input.missionId).analysis?.result??undefined)};};
 const planning=createPlanningStore(database.connection,logger,coordinatedPlanner,{dataDir:config.dataDir,...(options.prepareOracle?{prepareOracle:options.prepareOracle}:planner===draftMissionPlan?{prepareOracle:(db,dataDir,missionId,input,payload,signal)=>prepareNativeEvaluation(db,dataDir,missionId,input,payload,signal,{fastLane:isFastLaneAnalysis(analyses.view(missionId).analysis?.result??null)})}:{})});
 const builds=createBuildStore(database.connection,config,logger,builder);
 const verification=createVerificationStore(database.connection,config,logger);
 builds.bindCorrectionVerifier(verification.view);
 const debugging=createDebugStore(database.connection,config,logger,{builder:builds,verification,...(diagnoser?{diagnose:diagnoser}:{})});
 const outcomes=createMissionOutcomeStore(database.connection,config,logger,{verification:verification.view,build:builds.view});
 const workflow=createMissionWorkflow(database.connection,{context,analysis:analyses,contract:contracts,planning,build:builds,verification,debug:debugging,outcomes},logger);
 const chat=createChatService(database.connection,tickets,options.chatRuntime??createChatCodex({dataDir:config.dataDir}),builds.decide);
 let stopping:Promise<unknown>|null=null;
 const stopAll=()=>{if(stopping)return stopping;phone.audit('stop.all',{});const ticketStop=tickets.stopAll('Requested by the local operator');stopping=(async()=>{const results=await Promise.allSettled([ticketStop,chat.stopAll(),analyses.stopAll(),contracts.stopAll(),planning.stopAll(),debugging.stopAll(),builds.stopAll(),verification.stopAll(),verifyOnly.stopAll(),workflow.stopAll()]);chat.project();const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw new SpecError('STOP_CLEANUP_REQUIRED','STOP ALL requested; owned cleanup could not be certified. Inspect recorded evidence before Retry.');return {stopped:true,tickets:results[0]?.status==='fulfilled'?results[0].value:null};})().finally(()=>{stopping=null;});return stopping;};
 function humanEvidence(op:HumanOperation,reserved=false):{scope:{item:string;action:string};state:unknown}{
  const path=op.path;let m:RegExpExecArray|null;
  if(m=/^\/api\/phone\/pairs\/([^/]+)\/approve$/.exec(path))return {scope:{item:'phone-pair:'+m[1]!,action:'approve'},state:phone.pairEvidence(m[1]!)};
  if(m=/^\/api\/phone\/devices\/([^/]+)\/remove$/.exec(path))return {scope:{item:'phone-device:'+m[1]!,action:'remove'},state:phone.removeEvidence(m[1]!)};
  if(path==='/api/stop-all')return {scope:{item:'running-agents',action:'stop'},state:database.connection.prepare("SELECT id,status,attempt_count,candidate_commits FROM tickets WHERE status IN('building','fixing','checking','queued') ORDER BY id").all()};
  if(m=/^\/api\/skills\/([a-f0-9]{64})\/install$/.exec(path))return {scope:{item:'skill:'+m[1]!,action:'install'},state:skillProposal(config.dataDir,m[1]!)};
  if(m=/^\/api\/tickets\/([^/]+)\/(keep|discard|retry|recheck|continue)$/.exec(path))return {scope:{item:'ticket:'+m[1]!,action:m[2]!},state:tickets.show(m[1]!)};
  if(m=/^\/api\/chat\/cards\/([^/]+)\/action$/.exec(path)){const state=chat.decisionEvidence(m[1]!,reserved?String(op.body.action):undefined),c=state.card;const action=String(op.body.action);let item=c.kind==='ticket'?'ticket:'+c.targetId:'permission:'+c.targetId;if(action==='approve_playbook'){const b=tickets.show(c.targetId).playbook;if(!b)throw new SpecError('PLAYBOOK_REQUIRED','Playbook unavailable.');item='playbook:'+b.repoRoot;}return {scope:{item,action},state};}
  if(m=/^\/api\/chat\/drafts\/([^/]+)\/(start|edit|cancel)$/.exec(path)){const d=chat.store.draft(m[1]!);if(!d)throw new SpecError('DRAFT_NOT_FOUND','Draft not found.',404);return {scope:{item:'draft:'+m[1]!,action:m[2]!},state:d};}
  if(/^\/api\/playbooks\/(approve|edit)$/.test(path)){if(typeof op.body.repoPath!=='string')throw new SpecError('INVALID_REQUEST','Repository required.',400);const b=tickets.playbookEvidence(op.body.repoPath);if(!b)throw new SpecError('PLAYBOOK_REQUIRED','Propose the playbook first.');return {scope:{item:'playbook:'+b.repoRoot,action:path.endsWith('/edit')?'edit_playbook':'approve_playbook'},state:b};}
  if(m=/^\/api\/runtime-permissions\/([^/]+)\/decision$/.exec(path)){const row=database.connection.prepare('SELECT * FROM runtime_permission_requests WHERE id=? AND status=?').get(m[1]!,'PENDING');if(!row)throw new SpecError('STALE_PERMISSION','Permission is no longer pending.');return {scope:{item:'permission:'+m[1]!,action:String(op.body.decision).toLowerCase()},state:row};}
  if(m=/^\/api\/missions\/([^/]+)\/spec\//.exec(path))return {scope:{item:'mission:'+m[1]!,action:path.split('/').at(-1)!},state:workflow.view(m[1]!)};
  if(m=/^\/api\/verify-only\/([^/]+)\//.exec(path))return {scope:{item:'verification:'+m[1]!,action:path.split('/').at(-1)!},state:verifyOnly.view(m[1]!)};
  if(m=/^\/api\/verification-runs\/([^/]+)\/claims\/([^/]+)\/decision$/.exec(path)){const row=database.connection.prepare('SELECT * FROM verification_runs WHERE id=?').get(m[1]!);if(!row)throw new SpecError('RUN_NOT_FOUND','Verification run unavailable.',404);return {scope:{item:'claim:'+m[1]!+':'+m[2]!,action:'decision'},state:row};}
  throw new SpecError('INVALID_DECISION','Unsupported human decision.',400);
 }
 const desk=createDeskStream(database.connection,()=>({...chat.store.view(),notice:chat.problem(),playbookApprovalsEnabled:tickets.playbookApprovalEnabled()}));
 const phone=createPhoneAuth(database.connection,config.dataDir,humanEvidence,options.humanAuthenticator);
 const phoneRoutes=createPhoneRoutes(phone,config.dataDir);
 const phonePush=createPhonePush(database.connection,config.dataDir);
 const human=createHumanConfirmation(database.connection,config.dataDir,humanEvidence,options.humanAuthenticator);
 const json=(res:ServerResponse,status:number,body:import('../../packages/shared/chat.ts').ChatDraft|SpecView|DebugView|Record<string,unknown>|VerificationView|ApiError|HealthResponse|Project|ProjectsResponse|Mission|MissionsResponse|ContextResponse|ProjectContextSnapshot|AnalysisView|AttentionResponse|ContractView|CombinedAttention|PlanningView|PlanningPair|BuildView|RuntimePermissionRequest)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 const error=(res:ServerResponse,status:number,code:string,message:string)=>json(res,status,{error:{code,message}});
 const server=createServer((req,res)=>void withHumanReceipt(null,async()=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  const address=server.address();if(!address||typeof address==='string'){error(res,503,'UNAVAILABLE','Coordinator unavailable');return;}
  const privateOrigin=phoneOrigin(config.dataDir),privateHost=privateOrigin?new URL(privateOrigin).host:null;const remote=!!privateHost&&req.headers.host===privateHost;
  const hosts=[`127.0.0.1:${address.port}`,`localhost:${address.port}`,...(privateHost?[privateHost]:[])];
  const hostCount=req.rawHeaders.filter((_,i)=>i%2===0&&req.rawHeaders[i]?.toLowerCase()==='host').length;
  if(hostCount!==1||!req.headers.host||!hosts.includes(req.headers.host)){error(res,421,'INVALID_HOST','Unexpected local host');return;}
  const origins=new Set(remote&&privateOrigin?[privateOrigin]:hosts.filter(h=>h!==privateHost).map(h=>'http://'+h));if(config.development&&!remote){origins.add('http://127.0.0.1:5173');origins.add('http://localhost:5173');}
  const mutating=!['GET','HEAD','OPTIONS'].includes(req.method??'');
  if((mutating&&!req.headers.origin)||(req.headers.origin&&!origins.has(req.headers.origin))){error(res,403,'INVALID_ORIGIN','Unexpected or missing request origin');return;}
  if(!req.url?.startsWith('/')){error(res,400,'INVALID_REQUEST','Invalid request target');return;}
  try{
   const url=new URL(req.url,'http://127.0.0.1'),pathname=url.pathname;
   if(remote&&pathname.startsWith('/api/')){if(await phoneRoutes.remote(req,res,pathname,privateOrigin!))return;phone.session(phone.token(req.headers.cookie));req.headers['x-cc-operator']=readFileSync(join(config.dataDir,'ticket-operator.key'),'utf8');}
   if(remote&&pathname==='/api/phone/alerts'){const device=phone.session(phone.token(req.headers.cookie)).device;if(req.method==='GET'){phoneJson(res,phonePush.settings(String(device.id)));return;}if(req.method==='POST'){phoneJson(res,phonePush.update(String(device.id),await projectBody(req,'phone alerts',16000)));return;}}
   if(pathname==='/api/chat/archive'){if(!tickets.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open Unfoolable first.',403);if(req.method==='GET'){json(res,200,{archivedDraftIds:archivedDraftIds(database.connection)});return;}if(req.method==='POST'){json(res,200,changeDraftArchive(database.connection,await projectBody(req,'draft visibility')));return;}}
   if(pathname==='/api/desk/events'&&req.method==='GET'){if(!tickets.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open Unfoolable with unfool.',403);desk.connect(res,remote?()=>{try{phone.session(phone.token(req.headers.cookie));return true;}catch{return false;}}:undefined);return;}
   if(pathname==='/api/stop-all'&&req.method==='POST'){if(!tickets.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open the local cc command first.',403);const body=await projectBody(req,'stop all');if(remote){const receipt=phone.consume(phone.token(req.headers.cookie),req.headers['x-cc-confirmation'],{path:pathname,body});receipt.revalidate();}json(res,200,await stopAll() as Record<string,unknown>);return;}
   if(stopping&&mutating)throw new SpecError('STOP_IN_PROGRESS','STOP ALL is cleaning up owned work. Wait before starting or resuming.',409);
   const skillInstall=/^\/api\/skills\/([a-f0-9]{64})\/install$/.exec(pathname);
   if(skillInstall&&req.method==='POST'){if(!tickets.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open the local command first.',403);const body=await projectBody(req,'skill approval');enterHumanReceipt(human.consume(req.headers['x-cc-confirmation'],{path:pathname,body}));const inspected=skillProposal(config.dataDir,skillInstall[1]!);if(Object.keys(body).some(k=>!['name','score','reportHash'].includes(k))||body.name!==inspected.name||body.score!==inspected.risk.score||body.reportHash!==inspected.reportHash)throw new SpecError('INVALID_REQUEST','Confirm the exact inspected skill and risk report.',400);json(res,200,installSkill(config.dataDir,skillInstall[1]!));return;}
   if(pathname.startsWith('/api/human')){
    if(!tickets.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open the local cc command first.',403);
    if(req.method==='GET'&&pathname==='/api/human'){json(res,200,{registered:human.registered()});return;}
    const read=/^\/api\/human\/requests\/([a-f0-9-]{36})$/.exec(pathname);if(read&&req.method==='GET'){json(res,200,human.view(read[1]!));return;}
    if(req.method==='POST'){
     const b=await projectBody(req,'passkey',160000),origin=String(req.headers.origin);
     if(pathname==='/api/human/register/options'){json(res,200,await human.registerOptions(origin));return;}
     if(pathname==='/api/human/register/verify'){json(res,200,await human.register(String(b.id),b.response as RegistrationResponseJSON,origin));return;}
     if(pathname==='/api/human/options'){if(typeof b.path!=='string'||!b.body||typeof b.body!=='object'||Array.isArray(b.body))throw new SpecError('INVALID_DECISION','Provide the exact action and its body.',400);json(res,200,await human.options({path:b.path,body:b.body as Record<string,unknown>},origin));return;}
     if(pathname==='/api/human/confirm'){json(res,200,await human.confirm(String(b.id),b.response as AuthenticationResponseJSON,origin));return;}
    }
    throw new SpecError('NOT_FOUND','Passkey route not found.',404);
   }
   if(mutating&&requiresHuman(pathname)&&(remote||!fixtureApprovalsEnabled(config.dataDir)||options.enforcePasskeys)){
    if(!tickets.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open the local cc command first.',403);
    const body=await projectBody(req,'human decision',160000);enterHumanReceipt(remote?phone.consume(phone.token(req.headers.cookie),req.headers['x-cc-confirmation'],{path:pathname,body}):human.consume(req.headers['x-cc-confirmation'],{path:pathname,body}));
   }
   if(!remote&&pathname.startsWith('/api/phone/')){if(!tickets.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open Unfoolable on your Mac first.',403);if(await phoneRoutes.owner(req,res,pathname))return;}
   const chatResponse=await chatRoute(req,pathname,chat,tickets);if(chatResponse){json(res,chatResponse.status,chatResponse.body);return;}
   const ticketResponse=await ticketRoute(req,pathname,tickets);if(ticketResponse){if('text' in ticketResponse){res.writeHead(ticketResponse.status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(ticketResponse.text);}else json(res,ticketResponse.status,ticketResponse.body);return;}
   const verifyResponse=await verifyOnlyRoute(req,pathname,verifyOnly);if(verifyResponse){json(res,verifyResponse.status,verifyResponse.body);return;}
   const specResponse=await specRoute(req,pathname,workflow);if(specResponse){json(res,specResponse.status,specResponse.body);return;}
   const debugResponse=await debugRoute(req,url,debugging);if(debugResponse){json(res,debugResponse.status,debugResponse.body);return;}
   const verificationResponse=await verificationRoute(req,url,verification);if(verificationResponse){json(res,verificationResponse.status,verificationResponse.body);return;}
   const buildResponse=await buildRoute(req,url,builds);if(buildResponse){json(res,buildResponse.status,buildResponse.body);return;}
   if(req.method==='GET'&&pathname==='/api/health'){
    try{json(res,200,{status:'ok',version:APP_VERSION,coordinator:'online',database:{status:'ready',schemaVersion:database.version()}});}
    catch{json(res,503,{status:'error',version:APP_VERSION,coordinator:'online',database:{status:'unavailable'},error:{code:'DATABASE_UNAVAILABLE',message:'Database is not ready'}});}
    return;
   }
   if(pathname==='/api/projects'&&req.method==='GET'){json(res,200,{projects:listProjects(database.connection),allowedRoots:[...config.projectRoots]});return;}
   if(pathname==='/api/projects'&&req.method==='POST'){const created=await registerProject(database.connection,await projectBody(req),config.projectRoots,logger);json(res,201,created);return;}
   const projectMissions=/^\/api\/projects\/([^/]+)\/missions$/.exec(pathname);
   if(projectMissions && req.method==='GET'){json(res,200,{missions:listMissions(database.connection,projectMissions[1]!,logger)});return;}
   if(projectMissions && req.method==='POST'){const created=createMission(database.connection,projectMissions[1]!,await projectBody(req,'mission'),logger);json(res,201,created);if(options.autoPrepare!==false)void workflow.prepare(created.id).catch(()=>{});return;}
   if(pathname==='/api/attention'&&req.method==='GET'){const items=[...analyses.attention().items.map(item=>({...item,kind:'clarification' as const})),...workflow.attention(),...builds.attention(),...verification.attention(),...debugging.attention()];json(res,200,{items,count:items.length});return;}
   if(pathname==='/api/clarifications'&&req.method==='GET'){json(res,200,analyses.attention());return;}
   const answerRoute=/^\/api\/clarifications\/([^/]+)\/answer$/.exec(pathname);
   if(answerRoute&&req.method==='PUT'){const body=await projectBody(req,'clarification answer');if(Object.keys(body).some(k=>k!=='text'))throw new AnalysisError('INVALID_REQUEST','Only an answer text is accepted.',400);const view=analyses.answer(answerRoute[1]!,body.text);const q=database.connection.prepare('SELECT a.mission_id FROM clarification_questions q JOIN mission_analyses a ON a.id=q.analysis_id WHERE q.id=?').get(answerRoute[1]!);json(res,200,view);if(q&&options.autoPrepare!==false&&database.connection.prepare('SELECT mission_id FROM mission_workflows WHERE mission_id=?').get(q.mission_id!))void workflow.prepare(String(q.mission_id)).catch(()=>{});return;}
   const analysisRead=/^\/api\/missions\/([^/]+)\/analysis$/.exec(pathname);
   if(analysisRead&&req.method==='GET'){json(res,200,analyses.view(analysisRead[1]!));return;}
   const contextRoute=/^\/api\/missions\/([^/]+)\/context-snapshots$/.exec(pathname);
   if(contextRoute&&req.method==='GET'){json(res,200,context.list(contextRoute[1]!));return;}
   const mission=/^\/api\/missions\/([^/]+)$/.exec(pathname);
   if(mission && req.method==='GET'){json(res,200,getMission(database.connection,mission[1]!,logger));return;}
   if(req.method==='GET'&&serveWeb(pathname,config.webRoot,res))return;
   error(res,404,'NOT_FOUND','Route not found');
  }catch(problem){if(res.destroyed)return;if(problem instanceof ProjectPlaybookError||problem instanceof SpecError||problem instanceof ProjectError||problem instanceof MissionError||problem instanceof ContextError||problem instanceof AnalysisError||problem instanceof ContractError||problem instanceof PlanningError||problem instanceof BuildError){error(res,problem.status,problem.code,problem.message);return;}logger({level:'error',event:'http.error',code:'INTERNAL_ERROR'});if(!res.headersSent)error(res,500,'INTERNAL_ERROR','Unable to process request');else res.end();}
 }));
 server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;
 let closing:Promise<void>|undefined;
 const close=()=>{
  if(closing)return closing;
  logger({event:'shutdown.started'});desk.close();analyses.close();contracts.close();planning.close();
  closing=phonePush.close().then(()=>chat.close()).then(()=>tickets.close()).then(()=>Promise.all([workflow.close(),debugging.close(),verifyOnly.close()])).then(()=>Promise.all([builds.close(),verification.close()])).then(()=>new Promise<void>((resolve,reject)=>{
   const finish=(error?:Error)=>{try{database.close();logger({event:'shutdown.completed'});error?reject(error):resolve();}catch(e){reject(e);}};
   if(!server.listening){finish();return;}
   const timer=setTimeout(()=>server.closeAllConnections(),2000);timer.unref();
   server.close(error=>{clearTimeout(timer);finish(error);});server.closeIdleConnections();
  }));return closing;
 };
 const start=async()=>{await verifyOnly.recover();await tickets.recover();await builds.recover();await verification.recover();await debugging.recover();workflow.recover();return new Promise<void>((resolve,reject)=>{
  const failed=(error:Error)=>{database.close();reject(error);};server.once('error',failed);
  server.listen(config.port,'127.0.0.1',()=>{server.off('error',failed);logger({event:'server.started',version:APP_VERSION});resolve();});
 });};
 return {server,database,start,close,stopAll,workflow,tickets,chat,phone,phonePush};
}
