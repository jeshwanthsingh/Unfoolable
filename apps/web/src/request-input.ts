export const sendsRequest=(key:string,shift:boolean,composing:boolean)=>key==='Enter'&&!shift&&!composing;
export const draftStatusLine=(status:string)=>status==='DRAFT'?'Nothing starts until you choose Start.':status==='QUESTION'?'Answer above, or choose Edit before starting.':'No work was started. Edit it, or try again above.';
