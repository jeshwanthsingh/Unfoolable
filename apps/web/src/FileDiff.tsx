import {useEffect,useState} from 'react';
import {DiffView,DiffModeEnum} from '@git-diff-view/react';
import {DiffFile} from '@git-diff-view/core';
import {getDiffViewHighlighter} from '@git-diff-view/shiki';
import '@git-diff-view/react/styles/diff-view-pure.css';
const langs={py:'python',ts:'typescript',tsx:'tsx',js:'javascript',mjs:'javascript',jsx:'jsx',json:'json',css:'css',md:'markdown',sh:'bash',yml:'yaml',yaml:'yaml'} as const;
export function FileDiff({path,diff}:{path:string;diff:string}){
 const [file,setFile]=useState<DiffFile|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let stale=false;setFile(null);setError(false);void (async()=>{
  const lang=langs[path.split('.').at(-1) as keyof typeof langs]??'text';
  const f=new DiffFile(path,'',path,'',[diff],lang,lang);f.initTheme('dark');f.initRaw();
  const highlighter=await getDiffViewHighlighter(['python','typescript','tsx','javascript','jsx','json','css','markdown','bash','yaml']);
  f.initSyntax({registerHighlighter:highlighter});f.buildUnifiedDiffLines();f.buildSplitDiffLines();if(!stale)setFile(f);
 })().catch(()=>{if(!stale)setError(true);});return()=>{stale=true;};},[path,diff]);
 if(!diff.includes('@@ '))return <p>No textual hunks: binary, mode-only, empty-file, or rename metadata. <details><summary>Exact Git metadata</summary><pre>{diff}</pre></details></p>;
 return <div className="file-diff" aria-label={'Highlighted diff for '+path}>{file?<DiffView diffFile={file} diffViewMode={DiffModeEnum.Unified} diffViewTheme="dark" diffViewHighlight diffViewWrap diffViewFontSize={12}/>:error?<><p role="status">Highlighting unavailable. Exact patch:</p><pre>{diff}</pre></>:<p role="status">Highlighting patch…</p>}</div>;
}
