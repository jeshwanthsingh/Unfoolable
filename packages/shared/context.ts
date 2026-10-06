export const CONTEXT_LIMITS = Object.freeze({gitBytes:33554432,gitTimeoutMs:4000,pathCharacters:4096,snapshotBytes:2097152,trackedEntries:250000,changeEntries:250000,structure:40,importantPaths:40,manifestPaths:40,testLikePaths:40,dirtyPaths:60});
export type ChangeCategory='modified'|'added'|'deleted'|'renamed'|'untracked'|'conflicted';
export type WorkingChange={path:string;category:ChangeCategory;status:string;from?:string};
export type PathSummary={paths:string[];total:number;truncated:boolean};
export type ProjectContextPayload={
 baseHead:string;branch:string|null;
 workingTree:{clean:boolean;count:number;summary:Record<ChangeCategory,number>;changes:WorkingChange[];truncated:boolean};
 trackedFiles:{count:number;pathSetHash:string};
 structure:{entries:{path:string;kind:'file'|'directory';count:number}[];total:number;truncated:boolean};
 importantPaths:PathSummary;manifestPaths:PathSummary;testLikePaths:PathSummary;
 limits:typeof CONTEXT_LIMITS;
};
export type ProjectContextSnapshot={id:string;missionId:string;payload:ProjectContextPayload;snapshotHash:string;createdAt:string};
export type ContextResponse={latest:ProjectContextSnapshot|null;count:number};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const count=(value:unknown):value is number=>Number.isSafeInteger(value)&&typeof value==='number'&&value>=0;
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export const CHANGE_CATEGORIES:readonly ChangeCategory[]=['modified','added','deleted','renamed','untracked','conflicted'];
function paths(value:unknown,limit:number):value is PathSummary {
 return record(value)&&Array.isArray(value.paths)&&value.paths.length<=limit&&value.paths.every(x=>typeof x==='string')&&count(value.total)&&value.total>=value.paths.length&&value.truncated===(value.total>value.paths.length);
}
export function isContextPayload(value:unknown):value is ProjectContextPayload {
 if(!record(value)||typeof value.baseHead!=='string'||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value.baseHead)||(value.branch!==null&&typeof value.branch!=='string'))return false;
 const w=value.workingTree,t=value.trackedFiles,s=value.structure,l=value.limits;
 if(!record(w)||!count(w.count)||w.clean!==(w.count===0)||!record(w.summary)||!Array.isArray(w.changes)||w.changes.length>CONTEXT_LIMITS.dirtyPaths||w.truncated!==(w.count>w.changes.length))return false;
 if(!CHANGE_CATEGORIES.every(k=>count((w.summary as Record<string,unknown>)[k]))||Object.values(w.summary).reduce<number>((n,x)=>n+(typeof x==='number'?x:0),0)!==w.count)return false;
 if(!w.changes.every(x=>record(x)&&typeof x.path==='string'&&typeof x.status==='string'&&x.status.length===2&&CHANGE_CATEGORIES.includes(x.category as ChangeCategory)&&(x.from===undefined||typeof x.from==='string')))return false;
 return record(t)&&count(t.count)&&hash(t.pathSetHash)&&record(s)&&Array.isArray(s.entries)&&s.entries.length<=CONTEXT_LIMITS.structure&&s.entries.every(x=>record(x)&&typeof x.path==='string'&&(x.kind==='file'||x.kind==='directory')&&count(x.count))&&count(s.total)&&s.total>=s.entries.length&&s.truncated===(s.total>s.entries.length)&&
  paths(value.importantPaths,CONTEXT_LIMITS.importantPaths)&&paths(value.manifestPaths,CONTEXT_LIMITS.manifestPaths)&&paths(value.testLikePaths,CONTEXT_LIMITS.testLikePaths)&&record(l)&&Object.entries(CONTEXT_LIMITS).every(([k,v])=>l[k]===v);
}
export function isContextSnapshot(value:unknown):value is ProjectContextSnapshot {
 return record(value)&&typeof value.id==='string'&&value.id.length>0&&typeof value.missionId==='string'&&value.missionId.length>0&&hash(value.snapshotHash)&&typeof value.createdAt==='string'&&Number.isFinite(Date.parse(value.createdAt))&&isContextPayload(value.payload);
}
export function isContextResponse(value:unknown):value is ContextResponse {
 return record(value)&&count(value.count)&&((value.latest===null&&value.count===0)||(value.count>0&&isContextSnapshot(value.latest)));
}
