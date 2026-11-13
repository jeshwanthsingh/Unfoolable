import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Turn} from './Turn.tsx';
import './turn.css';
const root = document.getElementById('root');
if (!root) throw new Error('Root missing');
const render = () => createRoot(root).render(<StrictMode><Turn /></StrictMode>);
// The link carries a per-launch key in #t=. Swap it for a same-site HttpOnly cookie, then strip it from the address bar so it never stays in history.
const key = new URLSearchParams(location.hash.slice(1)).get('t');
if (key) fetch(`/k/${encodeURIComponent(key)}`, {credentials: 'same-origin', signal: AbortSignal.timeout(5000)}).catch(() => undefined).finally(() => { history.replaceState(null, '', location.pathname + location.search); render(); });
else render();
