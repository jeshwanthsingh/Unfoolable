import {useRef,type ReactNode} from 'react';
/** Native disclosure: secondary actions retain their existing exact-item callbacks. */
export function TaskMenu({label,children}:{label:string;children:ReactNode}){
 const root=useRef<HTMLDetailsElement>(null);
 return <details ref={root} className="observatory-menu" onKeyDown={e=>{if(e.key==='Escape'&&root.current?.open){e.preventDefault();root.current.open=false;root.current.querySelector('summary')?.focus();}}}><summary aria-label={'More actions for '+label}>•••</summary><div className="observatory-menu-actions" onClickCapture={e=>{if(e.target instanceof Element&&e.target.closest('button')&&root.current)root.current.open=false;}}>{children}</div></details>;
}
