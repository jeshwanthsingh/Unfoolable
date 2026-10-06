import {useEffect, useRef, useState} from 'react';
import type {FormEvent} from 'react';
import {isProject} from '../../../packages/shared/projects.ts';
import type {Project} from '../../../packages/shared/projects.ts';
type Props = {allowedRoots: string[]; onClose: () => void; onRegistered: (project: Project) => void};
export function ProjectDialog({allowedRoots, onClose, onRegistered}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(''); const [path, setPath] = useState('');
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => {const current = dialog.current; current?.showModal(); current?.querySelector<HTMLElement>('#project-name')?.focus(); return () => current?.close();}, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    try {
      const response = await fetch('/api/projects', {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({displayName: name, repoPath: path}), signal: AbortSignal.timeout(20000)});
      const body: unknown = await response.json();
      if (!response.ok) {
        const problem = body as {error?: {message?: unknown}};
        throw new Error(typeof problem?.error?.message === 'string' ? problem.error.message : 'Registration could not be confirmed.');
      }
      if (!isProject(body)) throw new Error('Registration returned an invalid response. Refresh to check your projects.');
      onRegistered(body);
    } catch (problem) {setError(problem instanceof Error && problem.name !== 'TypeError' ? problem.message : 'Could not confirm registration. Check the connection and try again.');}
    finally {setPending(false);}
  }
  return <dialog ref={dialog} className="project-dialog" aria-labelledby="registration-title" onCancel={event => {if (pending) event.preventDefault(); else onClose();}}>
    <div className="dialog-heading"><div><p className="eyebrow">BRING YOUR WORK IN</p><h2 id="registration-title">Add a project</h2></div><button className="close-dialog" aria-label="Close registration" onClick={onClose} disabled={pending}>×</button></div>
    <p className="dialog-intro">Connect an existing Git repository. Registration is read-only; it does not analyze your files.</p>
    <form onSubmit={event => {void submit(event);}}>
      <fieldset disabled={pending}><label htmlFor="project-name">Project name</label><input id="project-name" value={name} onChange={event => setName(event.target.value)} required maxLength={120} autoFocus autoComplete="off" placeholder="A name you recognize"/>
      <label htmlFor="repository-path">Repository path</label><input id="repository-path" value={path} onChange={event => setPath(event.target.value)} required maxLength={4096} autoComplete="off" spellCheck={false} placeholder="~/Projects/my-repository" aria-describedby="path-hint"/>
      <p id="path-hint" className="field-hint">An absolute folder path or a path starting with ~/.</p></fieldset>
      <details className="allowed-locations"><summary>Allowed project locations</summary><ul>{allowedRoots.map(root => <li key={root}><code>{root}</code></li>)}</ul></details>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={pending}>Cancel</button><button type="submit" className="primary-button" disabled={pending}>{pending ? 'Registering…' : 'Register Project'}</button></div>
    </form>
  </dialog>;
}
