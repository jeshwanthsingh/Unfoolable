import {BUG_LOG_LIMIT,BUG_LOG_PREFIX} from '../apps/server/bug-log.ts';
import {verifyTicketSeal} from '../apps/server/verdict-seal.ts';
import {verifyEventChain} from '../apps/server/event-chain.ts';
import {DatabaseSync} from 'node:sqlite';
import {listTicketEvents} from '../apps/server/ticket-store.ts';
import {explainTicket,formatExplanation} from '../apps/server/ticket-explain.ts';
import {enablePrivatePhone} from '../apps/server/phone-access.ts';
import {proposeSkill,installSkill} from '../apps/server/skill-imports.ts';
import {ensureCoordinator} from './launcher.ts';
import {readFileSync,mkdirSync,writeFileSync,lstatSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
let active:{port?:number;dataDir?:string}={};
try{active=JSON.parse(readFileSync(join(root,'.work/ticket-loop-v1/ACTIVE.json'),'utf8'));}catch{}
const port=process.env.COMMAND_CENTER_PORT??active.port??3210;
const data=resolve(root,process.env.COMMAND_CENTER_DATA_DIR??active.dataDir??'data');
const base='http://localhost:'+port;
const shellQuote=(value:string)=>"'"+value.replaceAll("'","'\"'\"'")+"'";
const usage='Unfoolable — AI does the work. Nothing fools the check.\nUsage: cc bug <file>; cc verify <ticket>|--all; cc explain <ticket>; cc ticket new "request" --repo path | list | show id [--open] | keep id | discard id | retry id | recheck id | stats; cc playbook show|approve|edit <repo> [--file definition.json]; cc chat ["message"]; cc stop-all; cc skill add <local-skill-directory>; cc phone serve';
async function main(){
 const args=process.argv.slice(2);if(args.length===0)args.push('chat');if(args.length===1&&['--help','-h'].includes(args[0]!)){console.log(usage+'\nAliases: unfool and cc.');return;}const resource=args.shift(),command=args.shift();
 if(resource==='verify'){if(!command||args.length||command!=='--all'&&!/^[a-f0-9-]{6,36}$/.test(command))throw Error('Usage: cc verify <ticket>|--all');const db=new DatabaseSync(join(data,'command-center.sqlite'),{readOnly:true});let reading=false;try{db.exec('BEGIN');reading=true;const version=Number(db.prepare('SELECT max(version) AS n FROM schema_migrations').get()!.n);if(version>=21)verifyEventChain(db);const matches=command==='--all'?db.prepare('SELECT id FROM tickets ORDER BY created_at,id').all():db.prepare('SELECT id FROM tickets WHERE id LIKE ?').all(command+'%');if(command==='--all'&&!matches.length){console.log('No sealed checks to verify.');process.exitCode=2;}if(command!=='--all'&&matches.length!==1)throw Error('Use one unambiguous ticket ID.');for(const row of matches){const id=String(row.id),seal=verifyTicketSeal(db,data,id);console.log(id+' — Event '+(seal.eventId??'none')+': '+seal.label+(seal.replays?'. Replays the same. Log chain intact.':'.')+(seal.reason?' '+seal.reason:''));if(seal.state==='BROKEN')process.exitCode=1;else if(seal.state!=='SEALED'&&process.exitCode!==1)process.exitCode=2;}}finally{if(reading)db.exec('ROLLBACK');db.close();}return;}
 if(resource==='explain'){if(!command||args.length||!/^[a-f0-9-]{6,36}$/.test(command))throw Error('Usage: cc explain <ticket>');const db=new DatabaseSync(join(data,'command-center.sqlite'),{readOnly:true});try{const matches=db.prepare('SELECT id FROM tickets WHERE id LIKE ?').all(command+'%');if(matches.length!==1)throw Error('Use one unambiguous ticket ID.');console.log(formatExplanation(explainTicket(db,listTicketEvents(db,String(matches[0]!.id)))));}finally{db.close();}return;}
 if(resource==='phone'){if(command!=='serve'||args.length)throw Error('Usage: cc phone serve');console.log(JSON.stringify(enablePrivatePhone(data,Number(port)),null,2));return;}
 if(resource==='bug'){if(!command||args.length)throw Error('Usage: cc bug <file>');const file=resolve(command),st=lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||st.size>BUG_LOG_LIMIT)throw Error('Choose a regular log file smaller than 19 KB.');await ensureCoordinator(root,data,port);const key=readFileSync(join(data,'ticket-operator.key'),'utf8').trim();const response=await fetch(base+'/api/chat/messages',{method:'POST',headers:{'X-CC-Operator':key,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({text:BUG_LOG_PREFIX+readFileSync(file,'utf8')})});if(!response.ok)throw Error((await response.json()).error?.message??'Could not prepare the bug draft.');console.log('Redacted bug draft prepared. Run ./cc chat to review and Start with Touch ID. Nothing started.');return;}
 if(resource!=='ticket'&&resource!=='playbook'&&resource!=='chat'&&resource!=='stop-all'&&resource!=='skill')throw Error(usage);
 if(resource==='chat'||resource==='skill')await ensureCoordinator(root,data,port);
 const key=readFileSync(join(data,'ticket-operator.key'),'utf8').trim();
 if(resource==='stop-all'){if(command||args.length)throw Error('Usage: cc stop-all');const response=await fetch(base+'/api/stop-all',{method:'POST',headers:{'X-CC-Operator':key,Origin:base,'Content-Type':'application/json'},body:'{}'});const result=await response.json();if(!response.ok)throw Error(result.error?.message??'STOP ALL cleanup failed');console.log(JSON.stringify(result,null,2));return;}
 const confirmInBrowser=async(path:string,body:unknown)=>{
  const humanCall=async(route:string,payload?:unknown)=>{
   const response=await fetch(base+route,{method:payload===undefined?'GET':'POST',headers:{'X-CC-Operator':key,Origin:base,...(payload===undefined?{}:{'Content-Type':'application/json'})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
   const result=await response.json();if(!response.ok)throw Error(result.error?.message??'Confirmation request failed');return result;
  };
  const pending=await humanCall('/api/human/options',{path,body});
  if(typeof pending.id!=='string'||typeof pending.expiresAt!=='number')throw Error('Confirmation identity unavailable');
  const link=base+'/?view=chat&confirm='+encodeURIComponent(pending.id);
  console.log('Confirm this exact decision with your platform passkey: '+link);
  console.log('This command cannot decide. The browser confirmation expires in two minutes.');
  // The operator capability goes only to the opened browser fragment, never terminal output.
  execFile('/usr/bin/open',[link+'#operator='+key],error=>{if(error)console.error('Could not open browser; use ./cc chat and the pending confirmation link.');});
  const deadline=pending.expiresAt;if(!Number.isFinite(deadline))throw Error('Confirmation expiry unavailable');
  while(Date.now()<deadline){
   const current=await humanCall('/api/human/requests/'+encodeURIComponent(pending.id));
   if(current.status==='CONSUMED'){console.log('Browser decision consumed. Inspect the item for its recorded result.');return;}
   if(['EXPIRED','STALE','CANCELLED','ERROR','REJECTED'].includes(current.status))throw Error('Confirmation '+String(current.status).toLowerCase()+'. No decision was made by the CLI.');
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw Error('Confirmation expired. No decision was made by the CLI.');
 };

 if(resource==='skill'){if(command!=='add'||args.length!==1)throw Error('Usage: cc skill add <local-skill-directory>; cc phone serve');const p=await proposeSkill(data,resolve(args[0]!));console.log('Skill '+p.name+': score '+p.risk.score+'/100, '+p.risk.recommendation+'. Static only; network denied, OSV offline fallback.');if(p.risk.recommendation==='DO_NOT_INSTALL'){console.log('Nothing installed. Touch ID is required for this exact inspected content.');await confirmInBrowser('/api/skills/'+p.id+'/install',{name:p.name,score:p.risk.score,reportHash:p.reportHash});}else console.log(JSON.stringify(installSkill(data,p.id)));return;}
 if(resource==='chat'){
  if(args.length)throw Error('Usage: cc chat ["message"]; cc stop-all');
  if(command===undefined){execFile('/usr/bin/open',[base+'/?view=chat#operator='+key],error=>{if(error)console.error('Could not open browser');});console.log('Unfoolable: '+base+'/?view=chat');return;}
  const response=await fetch(base+'/api/chat/messages',{method:'POST',headers:{'X-CC-Operator':key,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({text:command})});
  const result=await response.json();if(!response.ok)throw Error(result.error?.message??'Chat request failed');console.log(JSON.stringify(result,null,2));console.log('Use ./cc chat to open the exact-item buttons. No action was taken by this command.');return;
 }
 const call=async(path:string,body?:unknown)=>{
  const response=await fetch(base+'/api/'+resource+'s'+path,{method:body===undefined?'GET':'POST',headers:{'X-CC-Operator':key,Origin:base,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json();if(!response.ok)throw Error(result.error?.message??'Operation failed');return result;
 };
 if(resource==='playbook'){
  const repoPath=args[0];if(!repoPath||!['show','approve','edit'].includes(command??''))throw Error(usage);
  if(command==='show'&&args.length===1){console.log(JSON.stringify(await call('/show',{repoPath}),null,2));return;}
  if(command==='approve'&&args.length===1){const current=await call('/show',{repoPath});await confirmInBrowser('/api/playbooks/approve',{repoPath,expectedHash:current.hash});return;}
  if(command==='edit'){
   const current=await call('/show',{repoPath});
   if(args.length===1){
    const directory=join(root,'.work/playbooks-v1');mkdirSync(directory,{recursive:true});
    if(typeof current.hash!=='string'||!/^[a-f0-9]{64}$/.test(current.hash))throw Error('Playbook identity could not be confirmed.');
    const path=join(directory,'edit-'+current.hash+'.json');
    // Do not overwrite a previously prepared local draft.
    try{writeFileSync(path,JSON.stringify(current.definition,null,2)+'\n',{flag:'wx',mode:0o600});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
    console.log('Edit the definition at '+path+'. No server change or approval has been made.');
    console.log('Then run: ./cc playbook edit '+shellQuote(repoPath)+' --file '+shellQuote(path));return;
   }
   if(args.length!==3||args[1]!=='--file'||!args[2])throw Error(usage);
   const draftIdentity=/^edit-([a-f0-9]{64})\.json$/.exec(basename(args[2]));
   if(draftIdentity&&draftIdentity[1]!==current.hash)throw Error('This draft was prepared for an older playbook. Run edit again and review the current definition before applying it.');
   const definition=JSON.parse(readFileSync(resolve(args[2]),'utf8'));
   await confirmInBrowser('/api/playbooks/edit',{repoPath,definition,expectedHash:current.hash});return;
  }
  throw Error(usage);
 }
 const id=args[0];let result:unknown;
 if(command==='new'){const at=args.indexOf('--repo');if(at!==1||!args[2]||args.length!==3)throw Error('Usage: cc explain <ticket>; cc ticket new "request" --repo path');result=await call('',{requestText:args[0],repoPath:args[2]});}
 else if(command==='list')result=await call('');else if(command==='stats')result=await call('/stats');
 else if(command==='show'&&id){result=await call('/'+id);if(args.includes('--open')){const url=base+'/?ticket='+encodeURIComponent(id)+'#operator='+key;execFile('/usr/bin/open',[url],error=>{if(error)console.error('Could not open browser');});}}
 else if(['keep','discard','retry','recheck'].includes(command??'')&&id){const view=(command==='keep'||command==='recheck')?await call('/'+id):null;await confirmInBrowser('/api/tickets/'+encodeURIComponent(id)+'/'+command,(command==='keep'||command==='recheck')?{candidateCommit:view.ticket.candidateCommits.at(-1)}:{});return;}
 else throw Error('Unknown ticket command');
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
