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

export function createApplication(config:AppConfig,logger:Logger=log,analyzer:MissionAnalyzer=analyzeMission,drafter:ContractDrafter=draftMissionContract,planner:PlanningDrafter=draftMissionPlan,builder:BuilderDriver=createCodexBuilderDriver(),diagnoser?:typeof diagnoseVerificationFailure,options:{autoPrepare?:boolean;prepareOracle?:typeof prepareNativeEvaluation;verifyAuthor?:typeof authorVerifyOnly;ticketDependencies?:TicketLoopDependencies}={}){
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
 const json=(res:ServerResponse,status:number,body:SpecView|DebugView|Record<string,unknown>|VerificationView|ApiError|HealthResponse|Project|ProjectsResponse|Mission|MissionsResponse|ContextResponse|ProjectContextSnapshot|AnalysisView|AttentionResponse|ContractView|CombinedAttention|PlanningView|PlanningPair|BuildView|RuntimePermissionRequest)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 const error=(res:ServerResponse,status:number,code:string,message:string)=>json(res,status,{error:{code,message}});
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  const address=server.address();if(!address||typeof address==='string'){error(res,503,'UNAVAILABLE','Coordinator unavailable');return;}
  const hosts=[`127.0.0.1:${address.port}`,`localhost:${address.port}`];
  const hostCount=req.rawHeaders.filter((_,i)=>i%2===0&&req.rawHeaders[i]?.toLowerCase()==='host').length;
  if(hostCount!==1||!req.headers.host||!hosts.includes(req.headers.host)){error(res,421,'INVALID_HOST','Unexpected local host');return;}
  const origins=new Set(hosts.map(h=>'http://'+h));if(config.development){origins.add('http://127.0.0.1:5173');origins.add('http://localhost:5173');}
  const mutating=!['GET','HEAD','OPTIONS'].includes(req.method??'');
  if((mutating&&!req.headers.origin)||(req.headers.origin&&!origins.has(req.headers.origin))){error(res,403,'INVALID_ORIGIN','Unexpected or missing request origin');return;}
  if(!req.url?.startsWith('/')){error(res,400,'INVALID_REQUEST','Invalid request target');return;}
  try{
   const url=new URL(req.url,'http://127.0.0.1'),pathname=url.pathname;
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
 });
 server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;
 let closing:Promise<void>|undefined;
 const close=()=>{
  if(closing)return closing;
  logger({event:'shutdown.started'});analyses.close();contracts.close();planning.close();
  closing=tickets.close().then(()=>Promise.all([workflow.close(),debugging.close(),verifyOnly.close()])).then(()=>Promise.all([builds.close(),verification.close()])).then(()=>new Promise<void>((resolve,reject)=>{
   const finish=(error?:Error)=>{try{database.close();logger({event:'shutdown.completed'});error?reject(error):resolve();}catch(e){reject(e);}};
   if(!server.listening){finish();return;}
   const timer=setTimeout(()=>server.closeAllConnections(),2000);timer.unref();
   server.close(error=>{clearTimeout(timer);finish(error);});server.closeIdleConnections();
  }));return closing;
 };
 const start=async()=>{await tickets.recover();await builds.recover();await verification.recover();await debugging.recover();workflow.recover();return new Promise<void>((resolve,reject)=>{
  const failed=(error:Error)=>{database.close();reject(error);};server.once('error',failed);
  server.listen(config.port,'127.0.0.1',()=>{server.off('error',failed);logger({event:'server.started',version:APP_VERSION});resolve();});
 });};
 return {server,database,start,close,workflow,tickets};
}
