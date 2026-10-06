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
import {planningRoute} from './planning-routes.ts';
import {PlanningError} from './planning-errors.ts';
import type {PlanningView,PlanningPair,AttentionResponse as CombinedAttention} from '../../packages/shared/planning.ts';
import {createContractStore} from './contract-store.ts';
import {draftMissionContract} from './contract-drafter.ts';
import type {ContractDrafter} from './contract-drafter.ts';
import {contractRoute} from './contract-routes.ts';
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

export function createApplication(config:AppConfig,logger:Logger=log,analyzer:MissionAnalyzer=analyzeMission,drafter:ContractDrafter=draftMissionContract,planner:PlanningDrafter=draftMissionPlan){
 const database=openDatabase(config.dataDir,logger);
 const context=createContextStore(database.connection,config.projectRoots,logger);
 const analyses=createAnalysisStore(database.connection,config.projectRoots,logger,analyzer);
 const contracts=createContractStore(database.connection,logger,drafter);
 const planning=createPlanningStore(database.connection,logger,planner);
 const json=(res:ServerResponse,status:number,body:ApiError|HealthResponse|Project|ProjectsResponse|Mission|MissionsResponse|ContextResponse|ProjectContextSnapshot|AnalysisView|AttentionResponse|ContractView|CombinedAttention|PlanningView|PlanningPair)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
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
   const pathname=new URL(req.url,'http://127.0.0.1').pathname;
   if(req.method==='GET'&&pathname==='/api/health'){
    try{json(res,200,{status:'ok',version:APP_VERSION,coordinator:'online',database:{status:'ready',schemaVersion:database.version()}});}
    catch{json(res,503,{status:'error',version:APP_VERSION,coordinator:'online',database:{status:'unavailable'},error:{code:'DATABASE_UNAVAILABLE',message:'Database is not ready'}});}
    return;
   }
   if(pathname==='/api/projects'&&req.method==='GET'){json(res,200,{projects:listProjects(database.connection),allowedRoots:[...config.projectRoots]});return;}
   if(pathname==='/api/projects'&&req.method==='POST'){const created=await registerProject(database.connection,await projectBody(req),config.projectRoots,logger);json(res,201,created);return;}
   const projectMissions=/^\/api\/projects\/([^/]+)\/missions$/.exec(pathname);
   if(projectMissions && req.method==='GET'){json(res,200,{missions:listMissions(database.connection,projectMissions[1]!,logger)});return;}
   if(projectMissions && req.method==='POST'){json(res,201,createMission(database.connection,projectMissions[1]!,await projectBody(req,'mission'),logger));return;}
   if(pathname==='/api/attention'&&req.method==='GET'){const items=[...analyses.attention().items.map(item=>({...item,kind:'clarification' as const})),...contracts.attention(),...planning.attention()];json(res,200,{items,count:items.length});return;}
   const planningResponse=await planningRoute(req,pathname,planning);if(planningResponse){json(res,planningResponse.status,planningResponse.body);return;}
   const contractResponse=await contractRoute(req,pathname,contracts);if(contractResponse){json(res,contractResponse.status,contractResponse.body);return;}
   if(pathname==='/api/clarifications'&&req.method==='GET'){json(res,200,analyses.attention());return;}
   const answerRoute=/^\/api\/clarifications\/([^/]+)\/answer$/.exec(pathname);
   if(answerRoute&&req.method==='PUT'){const body=await projectBody(req,'clarification answer');if(Object.keys(body).some(k=>k!=='text'))throw new AnalysisError('INVALID_REQUEST','Only an answer text is accepted.',400);const view=analyses.answer(answerRoute[1]!,body.text);json(res,200,view);return;}
   const analysisRead=/^\/api\/missions\/([^/]+)\/analysis$/.exec(pathname);
   if(analysisRead&&req.method==='GET'){json(res,200,analyses.view(analysisRead[1]!));return;}
   const analysisWrite=/^\/api\/missions\/([^/]+)\/analyses$/.exec(pathname);
   if(analysisWrite&&req.method==='POST'){const body=await projectBody(req,'mission analysis');if(Object.keys(body).length)throw new AnalysisError('INVALID_REQUEST','Analysis accepts only the Mission identity in its URL.',400);json(res,201,await analyses.analyze(analysisWrite[1]!));return;}
   const contextRoute=/^\/api\/missions\/([^/]+)\/context-snapshots$/.exec(pathname);
   if(contextRoute&&req.method==='GET'){json(res,200,context.list(contextRoute[1]!));return;}
   if(contextRoute&&req.method==='POST'){
    const body=await projectBody(req,'context capture');
    if(Object.keys(body).length)throw new ProjectError('INVALID_REQUEST','Context capture accepts only the Mission identity in its URL.',400);
    json(res,201,await context.capture(contextRoute[1]!));return;
   }
   const mission=/^\/api\/missions\/([^/]+)$/.exec(pathname);
   if(mission && req.method==='GET'){json(res,200,getMission(database.connection,mission[1]!,logger));return;}
   if(req.method==='GET'&&serveWeb(pathname,config.webRoot,res))return;
   error(res,404,'NOT_FOUND','Route not found');
  }catch(problem){if(res.destroyed)return;if(problem instanceof ProjectError||problem instanceof MissionError||problem instanceof ContextError||problem instanceof AnalysisError||problem instanceof ContractError||problem instanceof PlanningError){error(res,problem.status,problem.code,problem.message);return;}logger({level:'error',event:'http.error',code:'INTERNAL_ERROR'});if(!res.headersSent)error(res,500,'INTERNAL_ERROR','Unable to process request');else res.end();}
 });
 server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;
 let closing:Promise<void>|undefined;
 const close=()=>{
  if(closing)return closing;
  logger({event:'shutdown.started'});analyses.close();contracts.close();planning.close();
  closing=new Promise<void>((resolve,reject)=>{
   const finish=(error?:Error)=>{try{database.close();logger({event:'shutdown.completed'});error?reject(error):resolve();}catch(e){reject(e);}};
   if(!server.listening){finish();return;}
   const timer=setTimeout(()=>server.closeAllConnections(),2000);timer.unref();
   server.close(error=>{clearTimeout(timer);finish(error);});server.closeIdleConnections();
  });return closing;
 };
 const start=()=>new Promise<void>((resolve,reject)=>{
  const failed=(error:Error)=>{database.close();reject(error);};server.once('error',failed);
  server.listen(config.port,'127.0.0.1',()=>{server.off('error',failed);logger({event:'server.started',version:APP_VERSION});resolve();});
 });
 return {server,database,start,close};
}
