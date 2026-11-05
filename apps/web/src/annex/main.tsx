import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {OfficePage} from './OfficePage.tsx';
const root = document.getElementById('root');
if (!root) throw new Error('Root missing');
createRoot(root).render(<StrictMode><OfficePage /></StrictMode>);
