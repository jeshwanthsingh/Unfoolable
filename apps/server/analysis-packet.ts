import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {PACKET_LIMITS,type AnalysisPacket,type EvidenceBlock} from '../../packages/shared/analysis.ts';
import type {Mission} from '../../packages/shared/missions.ts';
import type {ProjectContextSnapshot} from '../../packages/shared/context.ts';
import type {Logger} from './log.ts';
import {gitBytes,validateRepository} from './repository.ts';
import {canonicalJson,payloadHash} from './context-observation.ts';
import {AnalysisError} from './analysis-errors.ts';

const stopwords=new Set('add implement please make would want a an and are as at be by can change do fix for from how i in is it of on or our should support that the this to update use with'.split(' '));
const tokens=(intent:string)=>[...new Set((intent.toLowerCase().match(/[a-z][a-z0-9_]{2,39}/g)??[]).filter(x=>!stopwords.has(x)))].sort().slice(0,16);
const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
type Entry={path:string;oid:string;size:number;kind:EvidenceBlock['kind'];score:number};
function safePath(path:string):boolean {
 if(!path||path.length>4096||path.startsWith('/')||/[\u0000-\u001f\u007f\\]/.test(path)||path.split('/').some(p=>p==='..'||p==='.'))return false;
 const parts=path.toLowerCase().split('/');
 if(parts.some(p=>/^(?:\.codex|\.claude|browser-storage|browser_storage|browser-profiles|chrome-profile|firefox-profile|chrome|chromium|firefox)$/.test(p))||/^(?:auth|cookies?|tokens?|token[-_]store)\.(?:json|ya?ml|txt)$/.test(parts.at(-1)!)||['cookies','login data','local state','history'].includes(parts.at(-1)!))return false;
 return !parts.some(p=>/^\.env(?:\.|$)/.test(p)||/^(?:\.git|\.ssh|\.aws|\.azure|\.gcloud|\.npmrc|\.netrc|\.?credentials?(?:\.[\w-]+)?|\.?secrets?(?:\.[\w-]+)?|tokens?\.(?:json|ya?ml)|keystore(?:\..*)?|keymaterial|id_rsa(?:\..*)?|id_ed25519(?:\..*)?)$/.test(p)||/\.(?:pem|key|p12|pfx|jks|keystore)$/.test(p))&&
 !parts.some(p=>/^(?:node_modules|vendor|dist|build|coverage|\.next|generated)$/.test(p))&&!/\.(?:min\.[^.]+|map|lock|png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|woff2?|ttf|sqlite|db|exe|dll|so|class|wasm)$/i.test(path);
}
function kind(path:string):EvidenceBlock['kind'] {
 const name=path.split('/').at(-1)!;
 if(/^(?:AGENTS|CLAUDE|CONTRIBUTING)\.md$|^README(?:\.|$)/i.test(name))return 'guidance';
 if(/^(?:package\.json|pyproject\.toml|Cargo\.toml|go\.mod|pom\.xml|requirements\.txt|Makefile|Gemfile)$/i.test(name))return 'manifest';
 if(/(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\./i.test(path))return 'test';
 return /(?:config|\.ya?ml$|\.toml$)/i.test(path)?'config':'source';
}
function windows(lines:number[],length:number):[number,number][] {
 const ranges:[number,number][]=[];
 for(const line of [...new Set(lines)].sort((a,b)=>a-b)){const start=Math.max(1,line-12),end=Math.min(length,line+12);const previous=ranges.at(-1);if(previous&&start<=previous[1]+1)previous[1]=Math.max(previous[1],end);else ranges.push([start,end]);}
 return ranges;
}

export async function buildAnalysisPacket(mission:Mission,snapshot:ProjectContextSnapshot,repoRoot:string,roots:readonly string[],logger:Logger):Promise<{packet:AnalysisPacket;hash:string;elapsedMs:number}> {
 const started=performance.now();
 try {
  const identity=await validateRepository(repoRoot,roots,logger);
  if(identity.repoRoot!==repoRoot)throw new AnalysisError('ANALYSIS_REPOSITORY_CHANGED','The registered repository root changed.',409);
  const head=snapshot.payload.baseHead;
  if(snapshot.missionId!==mission.id||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(head))throw new AnalysisError('ANALYSIS_INVALID_SNAPSHOT','The context snapshot identity is invalid.');
  const pinned=(await gitBytes(repoRoot,['rev-parse','--verify',head+'^{commit}'])).toString('utf8').trim();
  if(pinned!==head)throw new AnalysisError('ANALYSIS_HEAD_UNAVAILABLE','The context commit is unavailable.');
  const terms=tokens(mission.originalIntent);
  const tree=(await gitBytes(repoRoot,['ls-tree','-rlz','--full-tree',head],PACKET_LIMITS.gitBytes)).toString('utf8');
  let truncated=false;
  const entries:Entry[]=[];
  for(const record of tree.split('\0')){
   if(!record)continue;
   const match=/^(100644|100755) blob ([a-f0-9]+)\s+(\d+)\t(.+)$/s.exec(record);
   if(!match||!safePath(match[4]!))continue;
   const path=match[4]!,size=Number(match[3]);
   if(size>PACKET_LIMITS.fileBytes){truncated=true;continue;}
   entries.push({path,oid:match[2]!,size,kind:kind(path),score:terms.reduce((n,t)=>n+(path.toLowerCase().includes(t)?1:0),0)});
  }
  entries.sort((a,b)=>b.score-a.score||compare(a.path,b.path));
  const search=entries.slice(0,PACKET_LIMITS.searchFiles);
  if(entries.length>search.length)truncated=true;
  const matches=new Map<string,number[]>();
  if(terms.length&&search.length){
   try {
    const result=await gitBytes(repoRoot,['--literal-pathspecs','grep','--no-textconv','-I','-i','-n','-z','-F','-m',String(PACKET_LIMITS.searchMatches),...terms.flatMap(t=>['-e',t]),head,'--',...search.map(e=>e.path)],PACKET_LIMITS.gitBytes);
    const text=result.toString('utf8');let cursor=0,count=0;
    while(cursor<text.length){const pathEnd=text.indexOf('\0',cursor),lineEnd=text.indexOf('\0',pathEnd+1),end=text.indexOf('\n',lineEnd+1);if(pathEnd<0||lineEnd<0||end<0)break;
     const path=text.slice(cursor,pathEnd).slice(head.length+1),line=Number(text.slice(pathEnd+1,lineEnd));cursor=end+1;
     if(++count>PACKET_LIMITS.searchMatches){truncated=true;break;}
     if(search.some(e=>e.path===path)&&Number.isSafeInteger(line)&&line>0)matches.set(path,[...(matches.get(path)??[]),line]);
    }
   }catch(error){if((error as {code?:number}).code!==1)truncated=true;}
  }
  const relevant=entries.filter(e=>e.score>0||matches.has(e.path));
  const stems=new Set(relevant.filter(e=>e.kind==='source').map(e=>e.path.split('/').at(-1)!.replace(/\.[^.]+$/,'')));
  const orientation=(entry:Entry)=>!entry.path.includes('/')||entry.score>0||matches.has(entry.path);
  const selectOrientation=(type:Entry['kind'],limit:number)=>{
   const candidates=entries.filter(e=>e.kind===type&&orientation(e)).sort((a,b)=>Number(a.path.includes('/'))-Number(b.path.includes('/'))||b.score-a.score||compare(a.path,b.path));
   if(candidates.length>limit||entries.some(e=>e.kind===type&&!orientation(e)))truncated=true;
   return candidates.slice(0,limit);
  };
  // Reserve source/test capacity; unrelated nested READMEs must not dominate a packet.
  const selected=[...selectOrientation('guidance',PACKET_LIMITS.guidanceFiles),...selectOrientation('manifest',PACKET_LIMITS.manifestFiles),...entries.filter(e=>e.kind!=='guidance'&&e.kind!=='manifest'&&(relevant.includes(e)||(e.kind==='test'&&[...stems].some(s=>e.path.includes(s)))))];
  const priority=(e:Entry)=>e.kind==='guidance'?0:e.kind==='manifest'?1:e.kind==='test'?3:2;
  selected.sort((a,b)=>priority(a)-priority(b)||b.score-a.score||compare(a.path,b.path));
  const evidence:EvidenceBlock[]=[];let bytes=0,files=0;
  for(const entry of selected){
   if(files>=PACKET_LIMITS.files||evidence.length>=PACKET_LIMITS.blocks){truncated=true;break;}
   files++;
   const raw=await gitBytes(repoRoot,['cat-file','blob',entry.oid],PACKET_LIMITS.fileBytes+1);
   if(raw.includes(0))continue;
   const content=new TextDecoder('utf-8',{fatal:true});let source:string;
   try{source=content.decode(raw);}catch{continue;}
   if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b/.test(source)){truncated=true;continue;}
   const lines=source.split('\n');if(lines.at(-1)==='')lines.pop();
   if(!lines.length)continue;
   // A single enormous/minified line is not useful engineering evidence.
   if(lines.some(line=>Buffer.byteLength(line)>PACKET_LIMITS.blockBytes)){truncated=true;continue;}
   const ranges=matches.has(entry.path)?windows(matches.get(entry.path)!,lines.length):[[1,Math.min(25,lines.length)] as [number,number]];
   if(!matches.has(entry.path)&&lines.length>25)truncated=true;
   for(const [start,end] of ranges){
    if(evidence.length>=PACKET_LIMITS.blocks){truncated=true;break;}
    let last=start-1,text='';
    for(let line=start;line<=end;line++){const next=text+(line===start?'':'\n')+lines[line-1]!;if(Buffer.byteLength(next)>PACKET_LIMITS.blockBytes){truncated=true;break;}text=next;last=line;}
    if(last<start)continue;
    const length=Buffer.byteLength(text);if(bytes+length>PACKET_LIMITS.evidenceBytes){truncated=true;break;}
    evidence.push({id:`e${evidence.length+1}`,path:entry.path,kind:entry.kind,startLine:start,endLine:last,content:text,contentHash:digest(text)});bytes+=length;
   }
  }
  // Reconstruct structure from safe committed entries, never absolute or dirty paths.
  const structure=new Map<string,{path:string;kind:'file'|'directory';count:number}>();
  for(const entry of entries){const first=entry.path.split('/')[0]!,directory=entry.path.includes('/');const old=structure.get(first);structure.set(first,{path:first,kind:directory?'directory':'file',count:(old?.count??0)+1});}
  const allStructure=[...structure.values()].sort((a,b)=>compare(a.path,b.path));
  if(allStructure.length>40)truncated=true;
  const packet:AnalysisPacket={version:'analysis-packet-v1',missionId:mission.id,snapshotId:snapshot.id,originalIntent:mission.originalIntent,project:{baseHead:head,branch:snapshot.payload.branch,dirty:!snapshot.payload.workingTree.clean,structure:allStructure.slice(0,40)},evidence,limits:PACKET_LIMITS,evidenceTruncated:truncated,sourcePolicy:'committed-head-only'};
  while(Buffer.byteLength(canonicalJson(packet))>PACKET_LIMITS.packetBytes&&packet.evidence.length){packet.evidence.pop();packet.evidenceTruncated=true;}
  if(Buffer.byteLength(canonicalJson(packet))>PACKET_LIMITS.packetBytes)throw new AnalysisError('ANALYSIS_PACKET_LIMIT','The analysis packet exceeds its safe limit.');
  return {packet,hash:payloadHash(packet),elapsedMs:Math.round(performance.now()-started)};
 }catch(error){if(error instanceof AnalysisError)throw error;throw new AnalysisError('ANALYSIS_PACKET_FAILED','Repository evidence could not be safely collected.');}
}
