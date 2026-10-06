import {createServer} from 'node:http';
import type {ServerResponse} from 'node:http';
import type {AppConfig} from './config.ts';
import {openDatabase} from './database.ts';
import {log} from './log.ts';
import type {Logger} from './log.ts';
import {APP_VERSION} from '../../packages/shared/health.ts';
import type {ApiError,HealthResponse} from '../../packages/shared/health.ts';
import {serveWeb} from './static.ts';

export function createApplication(config:AppConfig,logger:Logger=log){
 const database=openDatabase(config.dataDir,logger);
 const json=(res:ServerResponse,status:number,body:ApiError|HealthResponse)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 const error=(res:ServerResponse,status:number,code:string,message:string)=>json(res,status,{error:{code,message}});
 const server=createServer((req,res)=>{
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
   if(req.method==='GET'&&serveWeb(pathname,config.webRoot,res))return;
   error(res,404,'NOT_FOUND','Route not found');
  }catch{logger({level:'error',event:'http.error',code:'INTERNAL_ERROR'});if(!res.headersSent)error(res,500,'INTERNAL_ERROR','Unable to process request');else res.end();}
 });
 server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;
 let closing:Promise<void>|undefined;
 const close=()=>{
  if(closing)return closing;
  logger({event:'shutdown.started'});
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
