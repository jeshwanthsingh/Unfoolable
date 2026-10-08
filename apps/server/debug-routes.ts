import type {IncomingMessage} from 'node:http';
import {projectBody} from './project-body.ts';
import {BuildError} from './build-errors.ts';
import type {createDebugStore} from './debug-store.ts';
export async function debugRoute(req:IncomingMessage,url:URL,store:ReturnType<typeof createDebugStore>){
 const read=/^\/api\/missions\/([^/]+)\/debug$/.exec(url.pathname);
 if(read&&req.method==='GET')return {status:200,body:store.view(read[1]!)};
 const stop=/^\/api\/debug-sessions\/([^/]+)\/stop$/.exec(url.pathname);
 if(stop&&req.method==='POST'){if(Object.keys(await projectBody(req,'debug control')).length)throw new BuildError('INVALID_REQUEST','Stop accepts only the Debug Session identity.',400);return {status:200,body:await store.stop(stop[1]!)};}
 return null;
}
