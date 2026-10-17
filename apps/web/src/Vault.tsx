import {motion,useReducedMotion} from 'motion/react';
import {vaultMayOpen,type WorkshopTicket} from '../../../packages/shared/workshop.ts';
import type {ReviewRisk} from '../../../packages/shared/review-risk.ts';
const colors={open:'#98b5a5',closed:'#ed9888',turning:'#d8ba7e',greyed:'#7e8783'};
export function Vault({state,keepAvailable=false,evidenceStale=false,risk,replay=false}:{state:WorkshopTicket;keepAvailable?:boolean;evidenceStale?:boolean;risk?:ReviewRisk|undefined;replay?:boolean}){
 const reduced=useReducedMotion(),open=vaultMayOpen(state,keepAvailable,evidenceStale);
 return <section className={'vault '+(risk?.color==='RED'?'vault-red':'')} aria-label="Checker vault"><div className="vault-face"><svg viewBox="0 0 300 280" role="img" aria-label={open?'Vault open: current evidence allows Keep':'Vault locked: Keep is not available'}>
 <defs><radialGradient id={'metal-'+state.id}><stop stopColor="#505448"/><stop offset="1" stopColor="#242d2d"/></radialGradient></defs>
 <circle cx="150" cy="136" r="117" fill="#161e20" stroke="#796b51" strokeWidth="9"/>
 <motion.g animate={{rotate:open?-18:0,x:open?26:0,scaleX:open?.8:1}} transition={{duration:reduced?0:.35}} style={{transformOrigin:'150px 136px'}}>
 <circle cx="150" cy="136" r="103" fill={'url(#metal-'+state.id+')'} stroke="#b79c6c" strokeWidth="2"/>
 <circle cx="150" cy="136" r="83" fill="none" stroke="#6e6f59" strokeWidth="1" strokeDasharray="2 10"/>
 <circle cx="150" cy="136" r="31" fill="#222c2c" stroke="#ae986d" strokeWidth="4"/>
 {[0,60,120].map(r=><path key={r} d="M150 96v80" stroke="#ad9b75" strokeWidth="6" strokeLinecap="round" transform={'rotate('+r+' 150 136)'}/>)}
 </motion.g>
 {state.locks.map((lock,i)=>{const a=(-90+i*72)*Math.PI/180,x=150+Math.cos(a)*106,y=136+Math.sin(a)*106;return <motion.g key={lock.name} initial={false} animate={{rotate:lock.state==='open'?12:lock.state==='turning'?35:0}} transition={{duration:reduced?0:.25}} style={{transformOrigin:x+'px '+y+'px'}}><title>{lock.name+': '+lock.state+' — '+lock.reason}</title><circle cx={x} cy={y} r="15" fill="#202a29" stroke={colors[lock.state]} strokeWidth="2"/><path d={'M'+(x-5)+' '+(y+4)+'h10v-7h-10z M'+(x-3)+' '+(y-3)+'v-3a3 3 0 0 1 6 0v'+(lock.state==='open'?'0':'3')} stroke={colors[lock.state]} fill="none" strokeWidth="2"/></motion.g>;})}
 <text x="150" y="273" fill="#c9b68f" fontSize="11" textAnchor="middle" fontFamily="system-ui">{replay?'RECORDED CHECK EVENTS':open?'EVIDENCE READY · YOUR DECISION':'EVIDENCE UNDER LOCK'}</text></svg></div>
 <div className="vault-readout"><span className="eyebrow">CHECKER VAULT</span><h3>{state.verdict??'No check result yet'}</h3>{risk&&<p className="vault-risk">{risk.color} · {risk.reason}</p>}<ul>{state.locks.map(lock=><li key={lock.name} data-state={lock.state}><details><summary><span className="lock-light"/><strong>{lock.name}</strong><span>{lock.state==='open'?'Passed':lock.state==='closed'?'Flag / failure':lock.state==='turning'?'Running · result pending':'Not checked / not applicable'}</span></summary><p>{lock.reason}</p></details></li>)}</ul>{!open&&<p className="vault-note">{replay?'Replay cannot authorize a decision.':evidenceStale?'Evidence is stale. Recheck before Keep.':'Keep still requires current evidence, any required file review, and your passkey.'}</p>}</div></section>;
}
