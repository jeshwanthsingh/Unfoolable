export type LogEvent={event:string;level?:'info'|'error';version?:string;schemaVersion?:number;code?:string;message?:string;operation?:string;processCode?:number|string;signal?:string|null;elapsedMs?:number;draftingMillis?:number;validationMillis?:number};
export type Logger=(entry:LogEvent)=>void;
export const log:Logger=entry=>{process.stdout.write(JSON.stringify({time:new Date().toISOString(),level:'info',...entry})+'\n');};
