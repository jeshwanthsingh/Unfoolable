export class VerifyDeadline extends Error {readonly step:string;constructor(step:string){super(`${step} exceeded its deadline.`);this.step=step;}}
export async function verifyStep<T>(step:string,milliseconds:number,signal:AbortSignal,job:(signal:AbortSignal)=>Promise<T>,cleanupMilliseconds=30000):Promise<T>{
 const controller=new AbortController();let rejectStop:(reason:unknown)=>void=()=>{};
 const stopped=new Promise<never>((_,reject)=>{rejectStop=reject;}),abort=()=>{controller.abort(signal.reason);rejectStop(signal.reason??Error(step+' cancelled'));};
 signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 const task=Promise.resolve().then(()=>{if(controller.signal.aborted)throw controller.signal.reason??Error(step+' cancelled');return job(controller.signal);});let timer:ReturnType<typeof setTimeout>|undefined,cleanupTimer:ReturnType<typeof setTimeout>|undefined;
 try{timer=setTimeout(()=>{const error=new VerifyDeadline(step);controller.abort(error);rejectStop(error);},milliseconds);return await Promise.race([task,stopped]);}
 catch(error){controller.abort(error);await Promise.race([task.then(value=>{if(value&&typeof value==='object'&&'cleanup' in value){const cleanup=(value as {cleanup:{verified?:boolean;ambiguous?:boolean;remaining?:unknown[]}}).cleanup;if(!cleanup.verified||cleanup.ambiguous||cleanup.remaining?.length)throw Error(step+' cleanup not certified');}},reason=>{if(/cleanup.*(?:uncertain|not certified)|not certified.*cleanup/i.test(reason instanceof Error?reason.message:String(reason)))throw reason;}),new Promise<never>((_,reject)=>{cleanupTimer=setTimeout(()=>reject(Error(step+' cleanup remained uncertain')),cleanupMilliseconds);})]);throw error;}
 finally{clearTimeout(timer);clearTimeout(cleanupTimer);signal.removeEventListener('abort',abort);}
}
