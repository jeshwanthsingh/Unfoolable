import type {ChatCard} from './chat.ts';

/** Presentation only: server-side bindings remain the authority for every decision. */
export function groupChatCards(cards:readonly ChatCard[]):{needsYou:ChatCard[];stuck:ChatCard[];history:ChatCard[]} {
 const latest=new Map<string,ChatCard>();
 for(const card of cards){
  const key=card.kind+':'+card.targetId,previous=latest.get(key);
  // The server returns creation order. Later delivery breaks timestamp ties.
  if(!previous||card.createdAt>=previous.createdAt)latest.set(key,card);
 }
 const needsYou:ChatCard[]=[],stuck:ChatCard[]=[],history:ChatCard[]=[];
 for(const card of cards){
  const current=latest.get(card.kind+':'+card.targetId)===card;
  if(!current||!['PENDING','RESOLVING'].includes(card.status))history.push(card);
  else if(card.kind==='ticket'&&card.actions.includes('retry'))stuck.push(card);
  else needsYou.push(card);
 }
 return {needsYou,stuck,history};
}
