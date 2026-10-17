import {spring} from 'motion';
// Emil review: event-driven spatial feedback, short and zero-bounce. No idle loops.
export const stationTravelMs=250;
export const calmSpring={type:'spring',duration:stationTravelMs/1000,bounce:0} as const;
export const stationSpring=()=>spring({keyframes:[0,1],duration:stationTravelMs,bounce:0});
