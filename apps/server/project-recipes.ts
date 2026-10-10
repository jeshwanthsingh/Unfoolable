import {mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync,lstatSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {canonicalContractJson} from './contract-store.ts';
import {verifyHash} from './verify-only-identity.ts';
import {materializeOracleTree} from './oracle-tree.ts';
import {executeOracleTest} from './oracle-execution.ts';
import {safeBuildGit} from './build-workspace.ts';
import {verifyStep} from './verify-only-deadline.ts';
import type {OracleManifest,OracleTest} from '../../packages/shared/oracle.ts';
export type RecipeSeed={projectRoot:string;displayName:string;runnerDirectory:string;manifest:OracleManifest;tests:OracleTest[];knownGood:{repo:string;commit:string;tree:string};knownBad:{repo:string;commit:string;tree:string}};
export type ProjectRecipe={version:'project-recipe-v1';id:string;projectRoot:string;displayName:string;definition:RecipeSeed;definitionHash:string;approval:{actor:'human';reason:string;at:string};admission:{good:string[];bad:string[];evidence:{path:string;hash:string}[]};hash:string};
const fileHash=(path:string)=>verifyHash(readFileSync(path,'utf8'));
const definition=(seed:RecipeSeed)=>({projectRoot:seed.projectRoot,displayName:seed.displayName,runnerDirectory:seed.runnerDirectory,runner:seed.manifest.runner,componentPath:seed.manifest.componentPath,uiFixture:seed.manifest.uiFixture??null,tests:seed.tests});
export function createProjectRecipeStore(dataDir:string){
 const root=join(realpathSync(dataDir),'oracles','project-recipes');mkdirSync(root,{recursive:true,mode:0o700});
 const folder=(project:string)=>join(root,verifyHash(realpathSync(project)));
 const list=(project:string):ProjectRecipe[]=>{const dir=folder(project);if(!existsSync(dir))return [];if(lstatSync(dir).isSymbolicLink())throw Error('Recipe store directory identity changed');return readdirSync(dir).filter(n=>n.endsWith('.json')).sort().map(name=>{const path=join(dir,name);if(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink())throw Error('Recipe store file identity changed');const r=JSON.parse(readFileSync(path,'utf8')) as ProjectRecipe;if(r.version!=='project-recipe-v1'||r.projectRoot!==realpathSync(project)||r.id!==r.definitionHash||verifyHash(definition(r.definition))!==r.definitionHash||verifyHash({...r,hash:''})!==r.hash||r.admission.good.length!==r.definition.tests.length||!r.admission.good.every(x=>x==='PASS')||r.admission.bad.some((s,n)=>s!==(r.definition.tests[n]!.classification==='CHANGE'?'FAIL':'PASS'))||r.admission.evidence.some(e=>fileHash(e.path)!==e.hash))throw Error('Approved recipe or admission evidence changed');return r;});};
 const admit=async(seed:RecipeSeed,reason:string,signal:AbortSignal):Promise<ProjectRecipe>=>{
  if(!reason.trim()||!seed.tests.length||!seed.tests.some(t=>t.classification==='CHANGE')||seed.tests.some(t=>t.requests.some(r=>['SUITE','SCOPE'].includes(r.kind??''))))throw Error('Project recipe needs meaningful bounded behavior checks');
  seed=structuredClone(seed);seed.projectRoot=realpathSync(seed.projectRoot);const id=verifyHash(definition(seed)),existing=list(seed.projectRoot).find(r=>r.id===id);if(existing)return existing;
  const dir=folder(seed.projectRoot);mkdirSync(dir,{recursive:true,mode:0o700});const proof=join(dir,id);mkdirSync(proof,{mode:0o700});const statuses:{good:string[];bad:string[]}={good:[],bad:[]},evidence:{path:string;hash:string}[]=[];
  for(const phase of ['bad','good'] as const){const known=phase==='bad'?seed.knownBad:seed.knownGood;if((await safeBuildGit(known.repo,['rev-parse',known.commit+'^{tree}'],1000)).toString().trim()!==known.tree)throw Error('Known-version tree changed');const revision=seed.runnerDirectory==='sdk/python'?(await safeBuildGit(known.repo,['rev-parse',known.commit+':sdk/python'],1000)).toString().trim():known.commit;const workspace=join(proof,phase);await verifyStep('Project recipe '+phase+' export',60000,signal,()=>materializeOracleTree(known.repo,revision,workspace));
   for(const t of seed.tests){const manifest={...seed.manifest,sourceRoot:known.repo},result=await verifyStep('Project recipe '+phase+' '+t.claimId,180000,signal,s=>executeOracleTest(manifest,t,workspace,proof,s));if(!result.cleanup.verified||result.cleanup.ambiguous||result.cleanup.remaining.length)throw Error('Recipe admission cleanup uncertain');statuses[phase].push(result.status);const path=join(proof,phase+'-'+t.claimId+'.json');writeFileSync(path,canonicalContractJson({test:t,result}),{flag:'wx',mode:0o400});evidence.push({path,hash:fileHash(path)});if(typeof result.environment.observationPath==='string')evidence.push({path:result.environment.observationPath,hash:fileHash(result.environment.observationPath)});
   }
  }
  if(!statuses.good.every(s=>s==='PASS')||statuses.bad.some((s,n)=>s!==(seed.tests[n]!.classification==='CHANGE'?'FAIL':'PASS')))throw Error('Project recipe rejected: known-good PASS and known-bad meaningful FAIL required');
  const recipe:ProjectRecipe={version:'project-recipe-v1',id,projectRoot:seed.projectRoot,displayName:seed.displayName,definition:seed,definitionHash:id,approval:{actor:'human',reason,at:new Date().toISOString()},admission:{...statuses,evidence},hash:''};recipe.hash=verifyHash(recipe);writeFileSync(join(dir,id+'.json'),canonicalContractJson(recipe),{flag:'wx',mode:0o400});return recipe;
 };
 return {list,admit,root};
}
