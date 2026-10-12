import {resolve,relative,isAbsolute,join} from 'node:path';
function within(root:string,path:string){const part=relative(root,path);return part===''||!isAbsolute(part)&&part!=='..'&&!part.startsWith('../');}
/** Deny protected roots themselves; owned capabilities must be outside denied ancestors. */
export function builderFilesystem(protectedRoots:string[],workspace:string,gitCommonDir:string,gitDir?:string){
 const filesystem:Record<string,'read'|'write'|'deny'>={':root':'read'};
 // Explicit denies remain effective for children created after launch.
 for(const root of [...new Set(protectedRoots.map(resolvePath))])filesystem[root]='deny';
 filesystem[resolve(gitCommonDir)]='read';filesystem[resolve(workspace)]='write';
 if(gitDir){const dir=resolve(gitDir);if(!within(resolve(gitCommonDir),dir)||dir===resolve(gitCommonDir))throw Error('Worktree Git metadata must be private');filesystem[dir]='read';for(const file of ['index','index.lock'])filesystem[join(dir,file)]='write';}
 return filesystem;
}
const resolvePath=(p:string)=>resolve(p);
