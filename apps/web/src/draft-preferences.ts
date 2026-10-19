import type {ChatDraft} from '../../../packages/shared/chat.ts';
type DraftAge=Pick<ChatDraft,'id'|'status'|'createdAt'>;
export function oldDraft(draft:DraftAge,now=Date.now()){return draft.status==='ERROR'||Date.parse(draft.createdAt)<now-86400000;}
export function readArchivedDrafts(raw:string|null):string[]{try{const values:unknown=JSON.parse(raw??'[]');return Array.isArray(values)?values.filter((id):id is string=>typeof id==='string'&&id.length<=80).slice(0,5000):[];}catch{return [];}}
export function archiveDrafts(ids:readonly string[],drafts:readonly DraftAge[],now=Date.now()){return [...new Set([...ids,...drafts.filter(d=>oldDraft(d,now)).map(d=>d.id)])];}
