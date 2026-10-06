import {useEffect, useState} from 'react';
import {isProjectsResponse} from '../../../packages/shared/projects.ts';
import type {Project, ProjectsResponse} from '../../../packages/shared/projects.ts';
import {ProjectCard} from './ProjectCard.tsx';
import {ProjectDialog} from './ProjectDialog.tsx';
type State = {kind: 'loading'} | {kind: 'loaded'; data: ProjectsResponse} | {kind: 'failed'};
export function ProjectsPanel() {
  const [state, setState] = useState<State>({kind: 'loading'}); const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    void fetch('/api/projects', {signal: controller.signal, cache: 'no-store'}).then(async response => {
      const data: unknown = await response.json(); if (!response.ok || !isProjectsResponse(data)) throw new Error('Unable to list');
      if (active) setState({kind: 'loaded', data});
    }).catch(() => {if (active) setState({kind: 'failed'});});
    return () => {active = false; controller.abort();};
  }, [revision]);
  function registered(project: Project) {
    // This is a confirmed server response, never an optimistic local registration.
    setState(previous => previous.kind === 'loaded' ? {kind: 'loaded', data: {...previous.data, projects: [project, ...previous.data.projects]}} : previous);
    setOpen(false);
  }
  return <section className="projects-section" aria-labelledby="projects-title">
    <div className="projects-heading"><div><p className="eyebrow">YOUR STARTING POINTS</p><h2 id="projects-title">Projects</h2></div><button className="primary-button" disabled={state.kind !== 'loaded'} onClick={() => setOpen(true)}>Add Project <span aria-hidden="true">+</span></button></div>
    {state.kind === 'loading' && <p className="projects-feedback" role="status">Loading your registered projects…</p>}
    {state.kind === 'failed' && <div className="projects-feedback"><p role="alert">Projects could not be loaded. Check the local coordinator.</p><button className="secondary-button" onClick={() => setRevision(x => x + 1)}>Try again</button></div>}
    {state.kind === 'loaded' && (state.data.projects.length ? <div className="project-grid">{state.data.projects.map(project => <ProjectCard key={project.id} project={project}/>)}</div> : <div className="empty-state project-empty"><div className="empty-mark" aria-hidden="true">⌁</div><div><h3>No projects yet.</h3><p>Bring in a local Git repository. Keep its story here.</p></div></div>)}
    {open && state.kind === 'loaded' && <ProjectDialog allowedRoots={state.data.allowedRoots} onClose={() => setOpen(false)} onRegistered={registered}/>}
  </section>;
}
