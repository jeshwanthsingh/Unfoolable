import {readFile,mkdir,writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import type {BuildCandidate} from '../../packages/shared/build.ts';
import type {BuildAdmission} from './build-admission.ts';
import {createBuildWorkspace,safeBuildGit,sourceIndexHash} from './build-workspace.ts';
import {materializeCandidate} from './verification-workspace.ts';
import {BuildError} from './build-errors.ts';
/** Coordinator-only seed: HEAD stays the original accepted BASE; index/files become the exact parent tree. */
export async function createCorrectionWorkspace(admission:BuildAdmission,attemptId:string,dataDir:string,parent:BuildCandidate){
 const started=performance.now();if(parent.baseHead!==admission.baseHead)throw new BuildError('CORRECTION_BASE_MISMATCH','Correction must preserve the original accepted BASE.');
 const seed=await materializeCandidate(dataDir,'correction-seed-'+attemptId,parent);
 const workspace=await createBuildWorkspace(admission,attemptId,dataDir);
 const pack=await readFile(join(dataDir,'attempts',parent.attemptId,'candidate.pack'));
 await safeBuildGit(workspace.workspacePath,['unpack-objects','-r'],65*1024*1024,undefined,pack);
 await safeBuildGit(workspace.workspacePath,['read-tree','--reset','-u',parent.treeHash]);
 const index=join(workspace.artifactDir,'seed-index');
 try{await safeBuildGit(workspace.workspacePath,['read-tree','--empty'],undefined,index);await safeBuildGit(workspace.workspacePath,['add','-f','-A','--','.'],undefined,index);const tree=(await safeBuildGit(workspace.workspacePath,['write-tree'],undefined,index)).toString().trim();if(tree!==parent.treeHash)throw new BuildError('CORRECTION_TREE_MISMATCH','The correction seed differs from the frozen parent.');}finally{await unlink(index).catch(()=>{});}
 if((await safeBuildGit(admission.sourceRoot,['rev-parse','HEAD'])).toString().trim()!==admission.baseHead||await sourceIndexHash(admission.sourceRoot)!==admission.sourceIndexHash)throw new BuildError('SOURCE_CHANGED','Source identity changed while seeding correction.');
 await mkdir(join(workspace.artifactDir,'correction'),{mode:0o700});
 await writeFile(join(workspace.artifactDir,'correction','parent.json'),JSON.stringify({parentCandidateId:parent.id,parentTreeHash:parent.treeHash,parentDiffHash:parent.diffHash,baseHead:parent.baseHead,seedWorkspace:seed.workspace,seedObjectDir:seed.objectDir}),{flag:'wx',mode:0o400});
 return {...workspace,worktreeMs:Math.round(performance.now()-started)};
}
