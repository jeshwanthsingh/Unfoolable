import {APP_VERSION} from '../../../packages/shared/health.ts';
import {SystemStatus} from './SystemStatus.tsx';
import {ProjectsPanel} from './ProjectsPanel.tsx';
import './projects.css';
export function App(){return <div className="shell">
 <header className="masthead"><div className="brand"><img src="/mark.svg" alt="" width="40" height="40"/><span>YOUR LOCAL WORKSHOP</span></div><span className="local-label">Local first <span aria-hidden="true">✳</span></span></header>
 <main><div className="intro-grid"><section className="intro" aria-labelledby="title"><p className="eyebrow">A CLEAR SPACE TO BUILD</p><h1 id="title"><span>Command</span> <span className="accent">Center</span><span className="title-period" aria-hidden="true">.</span></h1><p className="lead">Your local projects. One clear starting point.</p><p className="subcopy">Less noise. More room for the work that matters.</p></section><SystemStatus/></div>
 <ProjectsPanel/></main>
 <footer><span>A little structure. A lot of possibility.</span><span>Breakout 3 <span className="separator">/</span> v{APP_VERSION}</span></footer>
 </div>;}
