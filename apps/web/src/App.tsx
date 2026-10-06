import {APP_VERSION} from '../../../packages/shared/health.ts';
import {SystemStatus} from './SystemStatus.tsx';
export function App(){return <div className="shell">
 <header className="masthead"><div className="brand"><img src="/mark.svg" alt="" width="40" height="40"/><span>YOUR LOCAL WORKSHOP</span></div><span className="local-label">Local first <span aria-hidden="true">✳</span></span></header>
 <main><div className="intro-grid"><section className="intro" aria-labelledby="title"><p className="eyebrow">A CLEAR SPACE TO BUILD</p><h1 id="title"><span>Command</span> <span className="accent">Center</span><span className="title-period" aria-hidden="true">.</span></h1><p className="lead">Your engineering missions will live here.</p><p className="subcopy">Less noise. More room for the work that matters.</p></section><SystemStatus/></div>
 <section className="empty-state" aria-labelledby="empty-title"><div className="empty-mark" aria-hidden="true"><span>+</span></div><div><p className="eyebrow">ROOM TO BEGIN</p><h2 id="empty-title">No projects yet.</h2><p>Your workspace is ready for what comes next.</p></div><span className="foundation-label">FOUNDATION / 00</span></section></main>
 <footer><span>A little structure. A lot of possibility.</span><span>Breakout 0 <span className="separator">/</span> v{APP_VERSION}</span></footer>
 </div>;}
