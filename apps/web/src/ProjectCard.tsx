import type {Project} from '../../../packages/shared/projects.ts';
export function shortPath(path: string): string {
  const pieces = path.split('/').filter(Boolean);
  return pieces.length > 2 ? '…/' + pieces.slice(-2).join('/') : path;
}
export function ProjectCard({project}: {project: Project}) {
  return <article className="project-card" data-project-id={project.id}>
    <div className="project-card-heading"><span className="project-symbol" aria-hidden="true">⌁</span><h3>{project.displayName}</h3></div>
    <div className="registration-meta"><span className="branch" title={project.registeredBranch ?? 'Detached HEAD'}>{project.registeredBranch ?? 'Detached HEAD'}</span><code title={project.registeredHead}>{project.registeredHead.slice(0, 7)}</code></div>
    <details className="path-details"><summary title={project.repoRoot}>{shortPath(project.repoRoot)}</summary><code>{project.repoRoot}</code></details>
    <p className="card-note">HEAD recorded at registration</p>
  </article>;
}
