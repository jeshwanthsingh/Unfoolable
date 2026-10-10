import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
let active:{port?:number;dataDir?:string}={};
try{active=JSON.parse(readFileSync(join(root,'.work/ticket-loop-v1/ACTIVE.json'),'utf8'));}catch{}
const port=process.env.COMMAND_CENTER_PORT??active.port??3210;
const data=resolve(root,process.env.COMMAND_CENTER_DATA_DIR??active.dataDir??'data');
const base='http://127.0.0.1:'+port;
const shellQuote=(value:string)=>"'"+value.replaceAll("'","'\"'\"'")+"'";
const usage='Usage: cc ticket new "request" --repo path | list | show id [--open] | keep id | discard id | retry id | recheck id | stats; cc playbook show|approve|edit <repo> [--file definition.json]';
async function main(){
 const args=process.argv.slice(2),resource=args.shift(),command=args.shift();
 if(resource!=='ticket'&&resource!=='playbook')throw Error(usage);
 const key=readFileSync(join(data,'ticket-operator.key'),'utf8').trim();
 const call=async(path:string,body?:unknown)=>{
  const response=await fetch(base+'/api/'+resource+'s'+path,{method:body===undefined?'GET':'POST',headers:{'X-CC-Operator':key,Origin:base,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json();if(!response.ok)throw Error(result.error?.message??'Operation failed');return result;
 };
 if(resource==='playbook'){
  const repoPath=args[0];if(!repoPath||!['show','approve','edit'].includes(command??''))throw Error(usage);
  if(command==='show'&&args.length===1){console.log(JSON.stringify(await call('/show',{repoPath}),null,2));return;}
  if(command==='approve'&&args.length===1){const current=await call('/show',{repoPath});console.log('Approving playbook '+current.hash);console.log(JSON.stringify(await call('/approve',{repoPath,expectedHash:current.hash}),null,2));return;}
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
   console.log(JSON.stringify(await call('/edit',{repoPath,definition,expectedHash:current.hash}),null,2));return;
  }
  throw Error(usage);
 }
 const id=args[0];let result:unknown;
 if(command==='new'){const at=args.indexOf('--repo');if(at!==1||!args[2]||args.length!==3)throw Error('Usage: cc ticket new "request" --repo path');result=await call('',{requestText:args[0],repoPath:args[2]});}
 else if(command==='list')result=await call('');else if(command==='stats')result=await call('/stats');
 else if(command==='show'&&id){result=await call('/'+id);if(args.includes('--open')){const url=base+'/?ticket='+encodeURIComponent(id)+'#operator='+key;execFile('/usr/bin/open',[url],error=>{if(error)console.error('Could not open browser');});}}
 else if(['keep','discard','retry','recheck'].includes(command??'')&&id){const view=(command==='keep'||command==='recheck')?await call('/'+id):null;result=await call('/'+id+'/'+command,(command==='keep'||command==='recheck')?{candidateCommit:view.ticket.candidateCommits.at(-1)}:{});}
 else throw Error('Unknown ticket command');
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
