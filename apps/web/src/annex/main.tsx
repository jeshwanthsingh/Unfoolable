import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {OfficePage} from './OfficePage.tsx';
const root = document.getElementById('root');
if (!root) throw new Error('Root missing');
const render = () => createRoot(root).render(<StrictMode><OfficePage /></StrictMode>);
// The link carries a one-time key in #t=. Swap it for a same-site HttpOnly cookie, then strip it from the address bar so it never stays in history.
const key = new URLSearchParams(location.hash.slice(1)).get('t');
if (key) fetch(`/k/${key}`, {credentials: 'same-origin'}).finally(() => { history.replaceState(null, '', location.pathname + location.search); render(); });
else render();
