import {readdirSync,statSync,existsSync} from 'node:fs';import {resolve,relative,isAbsolute,join} from 'node:path';
function within(root:string,path:string){const part=relative(root,path);return part===''||!isAbsolute(part)&&part!=='..'&&!part.startsWith('../');}
/** Keep protected contents denied without denying metadata traversal into an owned child. */
export function builderFilesystem(protectedRoots:string[],workspace:string,gitCommonDir:string,gitDir?:string){
 const allowed=[resolve(workspace),resolve(gitCommonDir)],filesystem:Record<string,'read'|'write'|'deny'>={':root':'read'};
 function protect(root:string){root=resolve(root);if(allowed.some(p=>within(p,root)))return;
  if(!allowed.some(p=>within(root,p))){filesystem[root]='deny';return;}
  // Only ancestors of owned capabilities are traversable. Every other existing child is denied.
  if(!existsSync(root)||!statSync(root).isDirectory())throw Error('Protected ancestor unavailable');
  for(const entry of readdirSync(root))protect(join(root,entry));
 }
 for(const root of [...new Set(protectedRoots.map(resolvePath))])protect(root);
 filesystem[resolve(gitCommonDir)]='read';filesystem[resolve(workspace)]='write';
 if(gitDir){const dir=resolve(gitDir);if(!within(resolve(gitCommonDir),dir)||dir===resolve(gitCommonDir))throw Error('Worktree Git metadata must be private');filesystem[dir]='read';for(const file of ['index','index.lock'])filesystem[join(dir,file)]='write';}
 return filesystem;
}
const resolvePath=(p:string)=>resolve(p);
