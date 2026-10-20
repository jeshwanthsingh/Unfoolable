/** Local clock colors only. Never a work/progress signal. */
export function officeLight(hour:number){
 if(!Number.isFinite(hour)||hour<0||hour>=24)throw new RangeError('Local hour must be between 0 and 24');
 if(hour<6||hour>=20)return {period:'night',sky:0x181425,brightness:.30,red:.68,green:.79,blue:1,lamps:.8,beam:0};
 if(hour<10)return {period:'morning',sky:0xe4a672,brightness:.94,red:1,green:.91,blue:.78,lamps:.22,beam:.09};
 if(hour<17)return {period:'noon',sky:0xc0cbdc,brightness:1,red:1,green:.97,blue:.91,lamps:.1,beam:.07};
 return {period:'evening',sky:0xbe4a2f,brightness:.74,red:1,green:.77,blue:.65,lamps:.6,beam:.035};
}
