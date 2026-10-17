import {useSyncExternalStore} from 'react';
const query='(prefers-reduced-motion: reduce)';
export const readReducedMotion=()=>matchMedia(query).matches;
export function subscribeReducedMotion(changed:()=>void){const media=matchMedia(query);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);}
// Motion 14's hook snapshots only at mount; observe actual preference changes too.
export const useReducedMotionPreference=()=>useSyncExternalStore(subscribeReducedMotion,readReducedMotion,()=>false);
