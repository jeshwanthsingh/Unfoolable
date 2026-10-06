import {useEffect,useRef,useState} from 'react';
import type {AnalysisClaim,AnalysisPacket,ClarificationQuestion} from '../../../packages/shared/analysis.ts';
import type {AnalysisControl} from './useMissionAnalysis.ts';
function Evidence({ids,packet}:{ids:string[];packet:AnalysisPacket|null}){return ids.length?<details className="evidence-disclosure"><summary>Evidence · {ids.length} references</summary>{ids.map(id=>{const block=packet?.evidence.find(b=>b.id===id);return block?<div key={id}><p><code>{block.path}:{block.startLine}–{block.endLine}</code></p><pre>{block.content}</pre></div>:<p key={id}>Evidence {id} unavailable.</p>;})}</details>:<p className="evidence-note">No repository evidence cited.</p>;}
function ClaimList({title,claims,packet}:{title:string;claims:AnalysisClaim[];packet:AnalysisPacket|null}){
 const item=(claim:AnalysisClaim,index:number)=><li key={index}><span className="claim-kind">{claim.kind}</span><p>{claim.text}</p><Evidence ids={claim.evidenceIds} packet={packet}/></li>;
 return <section className="analysis-claims"><h4>{title}</h4>{claims.length?<><ul>{claims.slice(0,1).map(item)}</ul>{claims.length>1&&<details className="additional-claims"><summary>{claims.length-1} more {title.toLowerCase()} entries</summary><ul>{claims.slice(1).map(item)}</ul></details>}</>:<p>None reported.</p>}</section>;
}
function Question({question,packet,control,onSaved,active}:{question:ClarificationQuestion;packet:AnalysisPacket|null;control:AnalysisControl;onSaved:()=>void;active:boolean}){
 const [text,setText]=useState(question.answer?.text??''),[confirmed,setConfirmed]=useState(false);
 useEffect(()=>{setText(question.answer?.text??'');},[question.answer?.text]);
 const busy=control.saving===question.id;const [open,setOpen]=useState(active);
 useEffect(()=>{if(active)setOpen(true);},[active]);
 return <form className="clarification-question" id={'question-'+question.id} onSubmit={event=>{event.preventDefault();setConfirmed(false);void control.answer(question.id,text).then(ok=>{if(ok){setConfirmed(true);onSaved();}});}} aria-busy={busy}>
 <div className="question-heading"><span className="eyebrow">{question.decisionArea} · Required</span><span>{question.answer?'Answered':'Needs You'}</span></div>
 <h4 tabIndex={-1} data-question-focus={question.id}>{question.question}</h4><p className="question-reason">{question.whyItMatters}</p><Evidence ids={question.evidenceIds} packet={packet}/>
 <details className="decision-editor" open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary>{question.answer?'Saved answer: '+question.answer.text.slice(0,120):'Answer this decision'}</summary>
 {question.options.length>0&&<fieldset disabled={busy||control.pending}><legend>Suggested choices</legend>{question.options.map((option,index)=><label className="question-option" key={index}><input type="radio" name={question.id} checked={text===option} onChange={()=>{setText(option);setConfirmed(false);}}/>{option}</label>)}</fieldset>}
 <label htmlFor={'answer-'+question.id}>Your decision <span>Choose a suggestion or write another answer.</span></label><textarea id={'answer-'+question.id} required maxLength={4000} value={text} disabled={busy||control.pending} onChange={event=>{setText(event.target.value);setConfirmed(false);}}/>
 <button className="secondary-button" disabled={busy||control.pending||!text.trim()||control.saving!==null}>{busy?'Saving answer…':question.answer?'Update answer':'Save answer'}</button>
 </details>
 {confirmed&&<p role="status" className="answer-confirmed">Answer saved.</p>}{question.answer&&<p className="answer-date">Saved {new Date(question.answer.updatedAt).toLocaleString()}</p>}
 </form>;
}
export function AnalysisPanel({control,contextCaptured,questionId}:{control:AnalysisControl;contextCaptured:boolean;questionId?:string|undefined}){
 const panel=useRef<HTMLElement>(null),[focusId,setFocusId]=useState(questionId);
 useEffect(()=>{setFocusId(questionId);},[questionId]);
 const data=control.state.kind==='loaded'?control.state.data:null;
 useEffect(()=>{if(focusId&&data){const target=panel.current?.querySelector<HTMLElement>('[data-question-focus="'+CSS.escape(focusId)+'"]');target?.focus();target?.scrollIntoView({block:'center'});}},[focusId,data]);
 const analysis=data?.analysis,operation=data?.operation;
 return <section className="analysis-panel bench" ref={panel} aria-labelledby="analysis-title" aria-busy={control.pending}>
 <div className="bench-heading"><div><p className="eyebrow">CLARIFY</p><h3 id="analysis-title">Mission Analysis</h3></div></div><p>Interpret the captured repository facts and resolve the decisions needed for this intent.</p>
 <button className="primary-button" disabled={!contextCaptured||control.pending||control.state.kind!=='loaded'} onClick={()=>void control.analyze()}>{control.pending?'Analyzing Mission…':operation?'Rerun Analysis':'Analyze Mission'}</button>
 {!contextCaptured&&<p>Capture repository context before analysis.</p>}
 {control.state.kind==='loading'&&<p role="status">Loading analysis…</p>}{control.state.kind==='failed'&&<p role="alert" className="form-error">Analysis unavailable. Its outcome has not been confirmed.</p>}
 {(control.state.kind==='failed'||control.error)&&<button className="secondary-button" onClick={control.refresh}>Refresh analysis</button>}{control.error&&<p role="alert" className="form-error">{control.error}</p>}
 {control.pending&&<p role="status">Analysis requested. The coordinator is confirming the outcome.</p>}
 {operation?.status==='FAILED'&&<p role="alert" className="form-error">Analysis failed. {operation.error??'No successful result was produced.'}</p>}{operation?.status==='INTERRUPTED'&&<p role="alert" className="form-error">Analysis interrupted. Rerun to produce a result.</p>}
 {data?.stale&&<p role="status" className="analysis-warning">This analysis uses older context. Capture current facts and rerun analysis before relying on these conclusions.</p>}
 {analysis?.result&&<><p className="analysis-provenance">{operation?.id!==analysis.id?'Previous successful analysis · ':''}Committed repository evidence · {analysis.baseHead.slice(0,7)}</p>
 <ClaimList title="Relevant areas" claims={analysis.result.understanding.relevantAreas} packet={analysis.packet}/><ClaimList title="Current behavior" claims={analysis.result.understanding.currentBehavior} packet={analysis.packet}/><ClaimList title="Constraints" claims={analysis.result.understanding.constraints} packet={analysis.packet}/><ClaimList title="Uncertainties" claims={analysis.result.understanding.uncertainties} packet={analysis.packet}/>
 <div className="decisions-heading"><h4>Required decisions</h4><p>{data?.questions.filter(q=>!q.answer).length??0} unanswered</p></div>
 {data?.questions.length===0&&<p>{['CLARIFIED','CONTRACT_REVIEW','CONTRACT_READY','PLAN_REVIEW','PLAN_READY','BUILDING','CANDIDATE_READY'].includes(data.phase)?'The successful analysis reported no required decisions.':'No clarification outcome has been confirmed.'}</p>}
 {data?.questions.map(question=><Question key={question.id} question={question} packet={analysis.packet} control={control} active={question.id===(focusId??data.questions.find(q=>!q.answer)?.id)} onSaved={()=>{const next=data.questions.find(q=>!q.answer&&q.id!==question.id);setFocusId(next?.id??question.id);}}/>)}
 {data&&['CLARIFIED','CONTRACT_REVIEW','CONTRACT_READY','PLAN_REVIEW','PLAN_READY','BUILDING','CANDIDATE_READY'].includes(data.phase)&&<p className="clarified-note">Clarified. Builder candidates require future independent verification; Verify and Proof are unavailable.</p>}
 <details className="analysis-metadata"><summary>Analysis record</summary><dl><dt>ID</dt><dd>{analysis.id}</dd><dt>Snapshot</dt><dd>{analysis.snapshotId}</dd><dt>Prompt</dt><dd>{analysis.promptVersion}</dd><dt>Packet hash</dt><dd>{analysis.packetHash??'Unavailable'}</dd><dt>Evidence limits</dt><dd>{analysis.packet?.evidenceTruncated?'Evidence truncated to packet limits':'Evidence within packet limits'}</dd></dl></details></>}
 {data&&!analysis&&!control.pending&&operation?.status!=='FAILED'&&operation?.status!=='INTERRUPTED'&&<p>Analysis has not been recorded.</p>}
 </section>;
}
