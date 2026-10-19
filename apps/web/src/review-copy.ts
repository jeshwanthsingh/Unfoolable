import type {Mark} from './unfoolable-model.ts';
/** Words only: never a score, permission or eligibility decision. */
export const reviewWords={unchecked:"Ready for you. We couldn't check this one automatically, so take a look.",safe:'Checked. Safe to keep.',paused:'Paused. It ran out of time.'} as const;
export function reviewSentence(state:{mark:Mark;sentence:string},inNeedsYou:boolean):string{
 if(!inNeedsYou)return state.sentence;
 if(state.mark==='stuck'&&state.sentence==='Ran out of time.')return reviewWords.paused;
 if(state.mark==='checked')return reviewWords.safe;
 if(state.mark==='closer'||/^Done[.,]/.test(state.sentence))return reviewWords.unchecked;
 return state.sentence;
}
