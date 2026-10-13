// Use StrykerJS's real mutators, then run each original-source mutant in our
// protected native runner. The instrumenter never imports Candidate code.
import {readFileSync} from 'node:fs';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const input=JSON.parse(readFileSync(0,'utf8'));const {Instrumenter}=await import(pathToFileURL(join(input.tools,'js/node_modules/@stryker-mutator/instrumenter/dist/src/index.js')).href);
const logger={debug(){},info(){},warn(){},error(){},trace(){},isDebugEnabled(){return false;}};
const {parseAsync}=await import(pathToFileURL(join(input.tools,'js/node_modules/@babel/core/lib/index.js')).href);
const safeParser=()=>async(text,name)=>({originFileName:name,rawContent:text,format:/\.tsx$/.test(name)?'tsx':/\.ts$/.test(name)?'ts':'js',root:await parseAsync(text,{filename:name,configFile:false,babelrc:false,browserslistConfigFile:false,targets:{node:'24'},sourceType:'module',parserOpts:{plugins:[...(/\.[cm]?tsx?$/.test(name)?['typescript']:[]),'jsx']}})});
const mutator=new Instrumenter(logger,safeParser);let total=0;const mutants=[];
for(const [path,lines]of Object.entries(input.lines)){
 if(!/\.[cm]?[jt]sx?$/.test(path))continue;const source=readFileSync(join(input.root,path),'utf8');
 const ranges=lines.map(line=>({start:{line:line-1,column:0},end:{line:line-1,column:source.split('\n')[line-1].length}}));
 const result=await mutator.instrument([{name:join(input.root,path),content:source,mutate:ranges}],{plugins:null,excludedMutations:[],ignorers:[]});
 const offsets=[0];for(let i=0;i<source.length;i++)if(source[i]==='\n')offsets.push(i+1);
 for(const m of result.mutants){const location=m.location;const touched=Array.from({length:location.end.line-location.start.line+1},(_,i)=>location.start.line+i+1);if(!touched.every(n=>lines.includes(n)))continue;total++;if(mutants.length<input.limit){const start=offsets[location.start.line]+location.start.column,end=offsets[location.end.line]+location.end.column;mutants.push({path,line:location.start.line+1,code:source.slice(0,start)+m.replacement+source.slice(end)});}}
}
process.stdout.write(JSON.stringify({mutants,total}));
