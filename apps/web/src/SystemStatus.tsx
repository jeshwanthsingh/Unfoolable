import {useHealth} from './useHealth.ts';
export function SystemStatus(){
 const {state,refresh}=useHealth();const connected=state.kind==='connected';
 const coordinator=connected?'Online':state.kind==='checking'?'Checking…':'Unavailable';
 const database=connected?(state.health.database.status==='ready'?'Ready':'Unavailable'):state.kind==='checking'?'Checking…':'Unknown';
 const ready=connected&&state.health.status==='ok';
 return <section className="system" aria-labelledby="system-title">
  <div className="panel-heading"><h2 id="system-title">System</h2><span className="eyebrow">ON THIS MACHINE</span></div>
  <dl className="status-list"><div><dt>Local coordinator</dt><dd data-ready={connected} data-unavailable={coordinator==='Unavailable'}><span className="status-dot"/>{coordinator}</dd></div><div><dt>Database</dt><dd data-ready={database==='Ready'} data-unavailable={database==='Unavailable'}><span className="status-dot"/>{database}</dd></div></dl>
  <p className="connection-note" role="status">{ready?'Local services connected.':state.kind==='checking'?'Checking your local connection.':connected?'The coordinator is online; the database needs attention.':'Coordinator unavailable. Start the local app and try again.'}</p>
  <button onClick={refresh} disabled={state.kind==='checking'} className="refresh">Check connection <span aria-hidden="true">↗</span></button>
 </section>;
}
