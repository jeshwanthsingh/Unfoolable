export function connectionWords(offline:boolean,observedAt:string|null,backOnline=false){
 if(!offline)return backOnline?'Back online':'';
 if(!observedAt)return 'Offline. No saved list is available. Run: unfool to reconnect.';
 return 'Offline. Showing what we knew at '+new Date(observedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+'. Run: unfool to reconnect.';
}
