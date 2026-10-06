import type {BuildView} from '../../../packages/shared/build.ts';
import type {PlanningView} from '../../../packages/shared/planning.ts';
import type {ContractView} from '../../../packages/shared/contracts.ts';
import type {AnalysisView} from '../../../packages/shared/analysis.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
import {journey} from './presentation.ts';
import type {ContextFact} from './presentation.ts';
export function Journey({context,mission,compact=false,clarification,contract,planning,build}:{context:ContextFact;mission:Mission;compact?:boolean;clarification?:AnalysisView|null;contract?:ContractView|null;planning?:PlanningView|null;build?:BuildView|null}){
 return <section className={'journey '+(compact?'journey-compact':'')} aria-label="Engineering Journey"><div className="journey-heading"><h3>Engineering Journey</h3><span>Intent → context → clarify → define → build → await verification.</span></div>
 <ol className="stations">{journey(context,mission,clarification,contract,planning,build).map((stage,index)=><li key={stage.label} data-station={stage.label} data-state={stage.state}>
  <span className="station-number" aria-hidden="true">0{index+1}</span><svg className="station-glyph" viewBox="0 0 44 32" aria-hidden="true"><path d="M8 2H36L42 8V24L36 30H8L2 24V8Z"/><path d="M13 16H31M22 7V25"/>{stage.state==='locked'?<path d="M18 15V12A4 4 0 0 1 26 12V15M17 15H27V23H17Z"/>:<circle cx="22" cy="16" r="4"/>}</svg>
  <span className="station-name">{stage.station}</span><span className="station-label">{stage.label}</span><span className="station-status">{stage.status}</span>
 </li>)}</ol></section>;
}
