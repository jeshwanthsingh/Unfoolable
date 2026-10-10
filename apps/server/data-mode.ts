import {existsSync,lstatSync,mkdirSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,relative,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const testing=typeof process.env.NODE_TEST_CONTEXT==='string';
const name='.cc-data-mode.json';
function canonical(path:string){let parent=resolve(path),parts:string[]=[];while(!existsSync(parent)){parts.unshift(basename(parent));parent=dirname(parent);}return resolve(realpathSync(parent),...parts);}
function isolated(path:string){const root=realpathSync(tmpdir()),rel=relative(root,path);return !!rel&&!rel.startsWith('..')&&!rel.startsWith('/');}
export function dataMode(dataDir:string):'LIVE'|'TEST'{
 const path=canonical(dataDir),marker=join(path,name);let mode:'LIVE'|'TEST';
 if(existsSync(marker)){if(lstatSync(marker).isSymbolicLink()||!lstatSync(marker).isFile())throw Error('Data mode identity is unsafe');const value=JSON.parse(readFileSync(marker,'utf8')) as {version:unknown;mode:unknown};if(value.version!==1||!['LIVE','TEST'].includes(String(value.mode)))throw Error('Data mode identity is invalid');mode=value.mode as 'LIVE'|'TEST';}
 else{if(testing&&(!isolated(path)||existsSync(join(path,'ticket-operator.key'))))throw Error('Tests may only open isolated test data, never live data');mode=testing?'TEST':'LIVE';mkdirSync(path,{recursive:true,mode:0o700});try{writeFileSync(marker,JSON.stringify({version:1,mode}),{flag:'wx',mode:0o400});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;return dataMode(dataDir);}}
 if(testing&&(mode!=='TEST'||!isolated(path)))throw Error('Tests cannot open a live data directory');return mode;
}
export function fixtureApprovalsEnabled(dataDir:string){return testing&&dataMode(dataDir)==='TEST';}

export function assertDataEntry(path:string,kind:'file'|'directory'){try{const stat=lstatSync(path);if(stat.isSymbolicLink()||(kind==='file'?!stat.isFile():!stat.isDirectory()))throw Error('Data entry is unsafe: '+basename(path));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
