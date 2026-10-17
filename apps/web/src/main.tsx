import {StrictMode,lazy,Suspense} from 'react';
const CraftApp=lazy(()=>import('./craft/CraftApp.tsx').then(m=>({default:m.CraftApp})));
import {createRoot} from 'react-dom/client';
import {App} from './App.tsx';
import './styles.css';
const root=document.getElementById('root');
if(!root)throw new Error('Application root missing');
createRoot(root).render(<StrictMode>{new URLSearchParams(location.search).has('craft')?<Suspense fallback={<p>Loading design gallery…</p>}><CraftApp/></Suspense>:<App/>}</StrictMode>);
