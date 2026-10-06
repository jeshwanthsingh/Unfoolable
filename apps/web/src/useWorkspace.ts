import {useEffect,useState} from 'react';
import {isProjectsResponse} from '../../../packages/shared/projects.ts';
import type {ProjectsResponse} from '../../../packages/shared/projects.ts';
import {isMissionsResponse} from '../../../packages/shared/missions.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
export type WorkspaceData=ProjectsResponse&{missions:Record<string,Mission[]|null>};
export type WorkspaceState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:WorkspaceData};
export async function loadWorkspace(signal:AbortSignal,request:typeof fetch=fetch):Promise<WorkspaceData>{
 const bounded=()=>AbortSignal.any([signal,AbortSignal.timeout(20000)]);
 const r=await request('/api/projects',{signal:bounded(),cache:'no-store'});const projects:unknown=await r.json();
 if(!r.ok||!isProjectsResponse(projects))throw new Error('Projects unavailable');
 const entries=await Promise.all(projects.projects.map(async p=>{
  try{const r=await request(`/api/projects/${encodeURIComponent(p.id)}/missions`,{signal:bounded(),cache:'no-store'});const data:unknown=await r.json();
   if(!r.ok||!isMissionsResponse(data)||data.missions.some(m=>m.projectId!==p.id))throw new Error('Missions unavailable');return [p.id,data.missions] as const;
  }catch{return [p.id,null] as const;}
 }));
 return {...projects,missions:Object.fromEntries(entries)};
}
export function useWorkspace(){
 const [state,setState]=useState<WorkspaceState>({kind:'loading'}),[revision,setRevision]=useState(0);
 useEffect(()=>{const controller=new AbortController();let active=true;
  void loadWorkspace(controller.signal).then(data=>{if(active)setState({kind:'loaded',data});}).catch(()=>{if(active)setState({kind:'failed'});});
  return ()=>{active=false;controller.abort();};
 },[revision]);
 return {state,reload:()=>setRevision(n=>n+1)};
}
