import {mkdirSync,writeFileSync} from 'node:fs';import {join,dirname} from 'node:path';import {safeBuildGit} from './build-workspace.ts';
/** Read-only committed blob view, never an executable tree. Link targets are inert text, never followed. */
export async function exportWriterBase(repo:string,commit:string,target:string){
 if(!/^[a-f0-9]{40,64}$/.test(commit))throw Error('Writer BASE must be an exact commit');
 const entries=(await safeBuildGit(repo,['ls-tree','-r','-l','-z',commit],8*1024*1024)).toString().split('\0').filter(Boolean);if(entries.length>20000)throw Error('Writer BASE path cap');
 mkdirSync(target,{mode:0o700});let bytes=0;const links:Record<string,{mode:string;identity:string}>={},omittedSensitivePaths:string[]=[];
 for(const entry of entries){const match=/^(100644|100755|120000|160000) (blob|commit) ([a-f0-9]+)\s+(\d+|-)\t(.+)$/s.exec(entry);if(!match)throw Error('Unsupported BASE entry');const [,mode,,oid,,path]=match;
 if(!path||path.startsWith('/')||path.includes('\\')||path.split('/').some(p=>!p||p==='.'||p==='..')||/[\x00-\x1f]/.test(path))throw Error('Unsafe BASE read path');
 if(/(?:^|\/)(?:\.env(?:\.[^/]*)?|[^/]+\.(?:pem|key)|(?:credentials|tokens|secrets|auth|cookies)(?:\.[^/]*)?)$/i.test(path)){omittedSensitivePaths.push(path);continue;}
 const blob=mode==='160000'?Buffer.from('BASE submodule identity: '+oid):await safeBuildGit(repo,['cat-file','blob',oid!],8*1024*1024);bytes+=blob.length;if(blob.length>8*1024*1024||bytes>64*1024*1024)throw Error('Writer BASE byte cap');
 // Preserve full committed source bytes, including source filenames such as credential.go.
 // This view cannot be executed: the author has only the read_base host capability.
 const file=join(target,path);mkdirSync(dirname(file),{recursive:true,mode:0o700});writeFileSync(file,blob,{mode:0o400,flag:'wx'});if(mode==='120000'||mode==='160000')links[path]={mode:mode!,identity:oid!};
 }
 return {links,omittedSensitivePaths,files:entries.length-omittedSensitivePaths.length,bytes};
}
