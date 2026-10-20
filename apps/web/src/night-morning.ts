import type {NightView} from '../../../packages/shared/night.ts';
/** No AI: only the last completed shift's stored report, on that local morning. */
export function nightMorning(view:NightView|undefined,now=new Date()){
 const report=view?.report;if(!report||view.notice||view.running||!report.items.length||now.getHours()>=12||new Date(report.end).toDateString()!==now.toDateString())return null;
 return {greeting:'Good morning.',summary:report.summary.replace(/^Good morning\.\s*/, '')};
}
