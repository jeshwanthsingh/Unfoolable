import {reviewerFlag,type ReviewerPanel} from '../../../packages/shared/reviewers.ts';
const labels={intent:'Intent',readability:'Readability',ui:'Screen'};
export function ReviewerNotes({panel,compact=false}:{panel?:ReviewerPanel|null|undefined;compact?:boolean}){
 if(!panel?.runs.length)return null;
 const density=compact?'compact':'full';
 return <section className="reviewer-notes" data-density={density} aria-label="Reviewer notes"><h3>Reviewer notes</h3>{reviewerFlag(panel)&&<p className="reviewer-flag" role="status">Reviewer flag — advisory only</p>}<p className="unfool-muted">Extra opinions. Your checks and choices are unchanged.</p>{panel.runs.map(run=><div key={run.role}><h4>{labels[run.role]}</h4>{run.status==='ERROR'||run.status==='SKIPPED'?<p>Review unavailable: {run.limitation}</p>:run.findings.length?<ul>{run.findings.map((f,i)=><li key={i}>{f.message}<small>{f.file}:{f.line}</small></li>)}</ul>:<p>No finding reported. This is not a check.</p>}<p className="unfool-meta">Reviewer allowance: {run.usage&&<meter aria-label={labels[run.role]+' reviewer allowance'} min={0} max={run.tokenLimit} value={run.usage.totalTokens}/>} {run.usage?.totalTokens.toLocaleString()??'unknown'} / {run.tokenLimit.toLocaleString()} tokens{run.limitation&&run.status==='DONE'?' — '+run.limitation:''}</p></div>)}</section>;
}
