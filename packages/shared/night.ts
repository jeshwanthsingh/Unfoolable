export type NightWindow={start:string;end:string;tokenLimit:number};
export type NightEntry={id:string;draftId:string;title:string;start:string;end:string;tokenLimit:number;status:string;ticketId:string|null;reason:string|null};
export type NightView={notifications?:boolean;entries:NightEntry[];report:{ticketIds?:string[];summary:string;start:string;end:string;tokens:number;items:{title:string;status:string;verdict:string|null}[]} | null;running:boolean};
/** The next local morning window. Persist absolute instants so DST cannot extend consent. */
export function nextNightWindow(now=new Date()):NightWindow{const start=new Date(now),end=new Date(now);start.setHours(1,0,0,0);end.setHours(7,0,0,0);if(end<=now){start.setDate(start.getDate()+1);end.setDate(end.getDate()+1);}return {start:start.toISOString(),end:end.toISOString(),tokenLimit:300000};}

export function nightReplayTickets(view:NightView|undefined,available:readonly {id:string}[]){const ids=view?.report?.ticketIds??[];return ids.filter((id,i)=>ids.indexOf(id)===i&&available.some(t=>t.id===id));}
