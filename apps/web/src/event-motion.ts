type EventRow={id:string;status:string;revision:number;updatedAt:string};
export function motionReason(before:EventRow|undefined,after:EventRow,initialized:boolean,now:number):'arrival'|'accepted'|'rejected'|'attention'|null{
 const age=now-Date.parse(after.updatedAt);
 if(!initialized||!Number.isFinite(age)||age<0||age>5000||!after.revision)return null;
 if(!before)return 'arrival';
 if(after.revision<=before.revision||after.status===before.status)return null;
 if(after.status==='kept')return 'accepted';
 if(after.status==='discarded')return 'rejected';
 if(after.status==='needs_you'||after.status==='ready_for_review'||after.status==='harness_error')return 'attention';
 return null;
}
