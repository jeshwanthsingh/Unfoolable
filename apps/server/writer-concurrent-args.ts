/** Remove only the observer-owned scratch flags accidentally echoed by an author.
 * No supplied path reaches execution: the recorder creates those paths itself. */
export function concurrentPublicArgs(args:unknown[]):string[]{
 const scratch=new Map([['--state-dir','state'],['--proof-lab-root','proof-lab'],['--codex-kit-root','codex-kit']]);
 const out:string[]=[],seen=new Set<string>();
 for(let i=0;i<args.length;i++){
  const arg=args[i];if(typeof arg!=='string')throw Error('Invalid fixed concurrency technique');
  if(scratch.has(arg)){
   const value=args[++i];if(seen.has(arg)||!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||(value as Record<string,unknown>).$scratch!==scratch.get(arg))throw Error('Invalid observer scratch flag');
   seen.add(arg);continue;
  }
  out.push(arg);
 }
 if(out.length>20||out[0]!=='source'||out[1]!=='add'||!out.includes('$URL'))throw Error('Invalid fixed concurrency technique');
 return out;
}
