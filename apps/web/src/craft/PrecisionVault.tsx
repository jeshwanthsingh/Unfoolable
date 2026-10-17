import {useReducedMotionPreference} from '../useReducedMotionPreference.ts';
import {calmSpring} from '../workshop-motion.ts';
import {motion} from 'motion/react';
import type {WorkshopTicket} from '../../../../packages/shared/workshop.ts';
export function PrecisionVault({state}:{state:WorkshopTicket}){
 const reduced=useReducedMotionPreference();
 return <svg className="precision-vault" viewBox="0 0 500 500" role="img" aria-label={'Historical Vault locked. '+state.locks.map(l=>l.name+': '+(l.state==='open'?'Passed':l.state==='closed'?'Flagged':l.state==='turning'?'Running':'Not checked')).join('. ')+'. Replay cannot authorize Keep.'}><defs>
 <radialGradient id="steel"><stop stopColor="#454d4d"/><stop offset=".7" stopColor="#252c2d"/><stop offset="1" stopColor="#131819"/></radialGradient>
 <linearGradient id="brass" x2=".8" y2="1"><stop stopColor="#ead3a1"/><stop offset=".45" stopColor="#9b7848"/><stop offset=".7" stopColor="#d9bc83"/><stop offset="1" stopColor="#685236"/></linearGradient>
 <filter id="vault-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="18" stdDeviation="16" floodOpacity=".6"/></filter>
 </defs><g filter="url(#vault-shadow)"><circle cx="250" cy="250" r="207" fill="#101415" stroke="#41494a" strokeWidth="2"/><circle cx="250" cy="250" r="190" fill="url(#steel)" stroke="url(#brass)" strokeWidth="5"/>
 {Array.from({length:60},(_,i)=><path key={i} d={i%5?'M250 66v5':'M250 64v13'} transform={`rotate(${i*6} 250 250)`} stroke={i%5?'#748080':'#d8bc85'} strokeWidth={i%5?1:2}/>)}
 <circle cx="250" cy="250" r="158" fill="none" stroke="#687170" strokeWidth=".6"/>
 {state.locks.map((l,i)=>{const a=(i*72-90)*Math.PI/180,x=250+122*Math.cos(a),y=250+122*Math.sin(a);return <g key={l.name}><circle cx={x} cy={y} r="33" fill="#151b1d" stroke={l.state==='open'?'#bfa271':l.state==='closed'?'#dc6a61':'#505c5f'} strokeWidth="1.5"/><text x={x} y={y-5} fill="#e4e4dd" textAnchor="middle" fontSize="11">{['Tests','Gates','Integrity','Writer','Coverage'][i]}</text><text x={x} y={y+13} fill={l.state==='open'?'#d9c393':l.state==='closed'?'#f68d82':'#a0acb0'} textAnchor="middle" fontSize="10">{l.state==='open'?'Passed':l.state==='closed'?'Flagged':l.state==='turning'?'Running':'Not checked'}</text></g>;})}
 <circle cx="250" cy="250" r="53" fill="url(#steel)" stroke="url(#brass)" strokeWidth="3"/>
 <motion.g animate={{rotate:state.sequence?state.station*28:0}} transition={reduced?{duration:0}:calmSpring} style={{transformOrigin:'250px 250px'}}>
 {[0,120,240].map(a=><path key={a} d="M250 250v-40" transform={`rotate(${a} 250 250)`} stroke="#cdb07a" strokeWidth="8" strokeLinecap="round"/>)}<circle cx="250" cy="250" r="12" fill="url(#brass)"/>
 </motion.g><text x="250" y="430" textAnchor="middle" fontSize="10" fill="#b7c0c0">Evidence under lock</text></g></svg>;
}
