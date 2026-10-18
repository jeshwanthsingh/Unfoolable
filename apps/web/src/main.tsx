import {StrictMode,lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {UnfoolableApp} from './UnfoolableApp.tsx';
import './styles.css';
const CraftApp=lazy(()=>import('./craft/CraftApp.tsx').then(m=>({default:m.CraftApp})));
const LegacyApp=lazy(()=>import('./App.tsx').then(m=>({default:m.App})));
const root=document.getElementById('root');
if(!root)throw new Error('Application root missing');
const params=new URLSearchParams(location.search);
// Existing project and verification deep links remain usable as secondary tools.
const tools=params.has('labs')||['home','projects','project','mission','verify-only'].includes(params.get('view')??'');
createRoot(root).render(<StrictMode>{tools?<Suspense fallback={<p>Opening tools…</p>}>{params.has('craft')?<CraftApp/>:<LegacyApp/>}</Suspense>:<UnfoolableApp/>}</StrictMode>);
