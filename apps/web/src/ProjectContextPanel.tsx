import {useEffect,useState} from 'react';
import {isContextResponse,isContextSnapshot,CHANGE_CATEGORIES} from '../../../packages/shared/context.ts';
import type {ContextResponse,PathSummary} from '../../../packages/shared/context.ts';
import './context.css';
type State={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:ContextResponse};
async function readContext(missionId:string,signal:AbortSignal):Promise<ContextResponse>{
 const r=await fetch(`/api/missions/${encodeURIComponent(missionId)}/context-snapshots`,{signal,cache:'no-store'});const data:unknown=await r.json();
 if(!r.ok||!isContextResponse(data)||(data.latest&&data.latest.missionId!==missionId))throw new Error('Context could not be loaded.');
 return data;
}
function PathList({title,data}:{title:string;data:PathSummary}){
 return <section className="context-paths"><h4>{title}</h4>{data.paths.length?<ul>{data.paths.map(path=><li key={path}><code>{path}</code></li>)}</ul>:<p>None found in tracked paths.</p>}{data.truncated&&<p className="context-notice">Showing {data.paths.length} of {data.total} paths.</p>}</section>;
}
export function ProjectContextPanel({missionId}:{missionId:string}){
 const [state,setState]=useState<State>({kind:'loading'}),[revision,setRevision]=useState(0);
 const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  void readContext(missionId,controller.signal).then(data=>{if(active)setState({kind:'loaded',data});}).catch(()=>{if(active)setState({kind:'failed'});});
  return ()=>{active=false;controller.abort();};
 },[missionId,revision]);
 async function capture(){
  setPending(true);setError(null);
  try{
   const r=await fetch(`/api/missions/${encodeURIComponent(missionId)}/context-snapshots`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(60000)});const data:unknown=await r.json();
   if(!r.ok){const problem=data as {error?:{message?:unknown}};throw new Error(typeof problem?.error?.message==='string'?problem.error.message:'Context capture could not be confirmed.');}
   if(!isContextSnapshot(data)||data.missionId!==missionId)throw new Error('Capture response could not be confirmed. Refresh context before retrying.');
   setState({kind:'loaded',data:await readContext(missionId,AbortSignal.timeout(20000))});
  }catch(problem){setError(problem instanceof Error&&problem.name!=='TypeError'&&problem.name!=='TimeoutError'?problem.message:'Capture could not be confirmed. Refresh context before retrying.');}
  finally{setPending(false);}
 }
 const snapshot=state.kind==='loaded'?state.data.latest:null;
 return <section className="context-panel" aria-labelledby="context-title">
  <div className="projects-heading"><div><p className="eyebrow">OBSERVED REPOSITORY FACTS</p><h3 id="context-title">Project Context</h3></div><button className="primary-button" disabled={pending||state.kind!=='loaded'} onClick={()=>{void capture();}}>{pending?'Capturing…':snapshot?'Capture again':'Understand Project'}</button></div>
  {pending&&<p role="status" className="context-note">Capturing project context…</p>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  {state.kind==='loading'&&<p role="status">Loading captured context…</p>}
  {state.kind==='failed'&&<p role="alert" className="form-error">Project context could not be loaded. Check the local coordinator.</p>}
  {(error||state.kind==='failed')&&<button className="secondary-button" disabled={pending} onClick={()=>{setError(null);setRevision(x=>x+1);}}>Refresh context</button>}
  {state.kind==='loaded'&&!snapshot&&<div className="context-empty"><h4>Not captured yet.</h4><p>Command Center has not inspected this Project for this Mission.</p><p>Capture records paths and Git facts. Your Mission remains a draft.</p></div>}
  {snapshot&&<article className="context-snapshot" data-context-id={snapshot.id} data-context-hash={snapshot.snapshotHash}>
   <p className="context-note">Project context captured · <time dateTime={snapshot.createdAt}>{new Date(snapshot.createdAt).toLocaleString()}</time> · {state.kind==='loaded'?state.data.count:0} context captures</p>
   <dl className="context-facts"><div><dt>Repository revision</dt><dd><code title={snapshot.payload.baseHead}>{snapshot.payload.baseHead.slice(0,12)}</code></dd></div><div><dt>Branch</dt><dd>{snapshot.payload.branch??'Detached HEAD'}</dd></div><div><dt>Working tree</dt><dd>{snapshot.payload.workingTree.clean?'Clean':`${snapshot.payload.workingTree.count} changes`}</dd></div><div><dt>Tracked files</dt><dd>{snapshot.payload.trackedFiles.count.toLocaleString()}</dd></div></dl>
   {!snapshot.payload.workingTree.clean&&<section className="context-changes"><h4>Git working-tree changes</h4>{CHANGE_CATEGORIES.filter(category=>snapshot.payload.workingTree.summary[category]>0).map(category=><div key={category}><h5>{category} · {snapshot.payload.workingTree.summary[category]}</h5><ul>{snapshot.payload.workingTree.changes.filter(change=>change.category===category).map(change=><li key={change.path}><code>{change.from?change.from+' → ':''}{change.path}</code></li>)}</ul></div>)}{snapshot.payload.workingTree.truncated&&<p className="context-notice">Showing {snapshot.payload.workingTree.changes.length} of {snapshot.payload.workingTree.count} changed paths.</p>}</section>}
   <section className="context-structure"><h4>Top-level structure</h4><ul>{snapshot.payload.structure.entries.map(entry=><li key={entry.path}><code>{entry.path}</code><span>{entry.count} tracked {entry.count===1?'file':'files'}</span></li>)}</ul>{snapshot.payload.structure.truncated&&<p className="context-notice">Showing {snapshot.payload.structure.entries.length} of {snapshot.payload.structure.total} structural entries.</p>}</section>
   <div className="context-path-grid"><PathList title="Important paths" data={snapshot.payload.importantPaths}/><PathList title="Manifest paths" data={snapshot.payload.manifestPaths}/><PathList title="Test-like paths" data={snapshot.payload.testLikePaths}/></div>
   <p className="context-note">Paths and Git state only. Ignored files and submodule contents are excluded; external Git filters are disabled. No semantic analysis. Uncommitted file contents are not captured. Test-like paths are a heuristic, not a complete test suite.</p>
   <details className="context-identity"><summary>Snapshot identity</summary><p>SHA-256 of the canonical observed payload</p><code>{snapshot.snapshotHash}</code><p>Tracked-path set fingerprint</p><code>{snapshot.payload.trackedFiles.pathSetHash}</code></details>
  </article>}
 </section>;
}
