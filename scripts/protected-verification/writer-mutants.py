"""Generate mutmut mutations on supplied changed lines; never import the project."""
import json,sys,pathlib,difflib
from mutmut.mutation.file_mutation import create_mutations
policy=json.loads(sys.stdin.readline()); root=pathlib.Path(policy['root']); out=[]; total=0
for path, lines in policy['lines'].items():
 if not path.endswith('.py'): continue
 source=(root/path).read_text(); module, mutations, _, _=create_mutations(path,source,set(lines))
 for mutation in mutations:
  changed=module.deep_replace(mutation.original_node,mutation.mutated_node).code
  edits=[]
  for op,a,b,c,d in difflib.SequenceMatcher(a=source.splitlines(),b=changed.splitlines(),autojunk=False).get_opcodes():
   if op!='equal': edits.extend(range(a+1,b+1))
  if not edits or not set(edits).issubset(lines): continue
  total+=1
  if len(out)<policy['limit']: out.append({'path':path,'line':min(edits),'code':changed})
print(json.dumps({'mutants':out,'total':total}))
