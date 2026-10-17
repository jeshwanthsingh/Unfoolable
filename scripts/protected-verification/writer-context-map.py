"""Tree-sitter BASE excerpts. Parses bytes only; never imports repository code.
Inspired by Aider's bounded symbol repo map; no Aider implementation copied.
"""
import json, sys, re
from importlib.metadata import version
from tree_sitter import Language, Parser
import tree_sitter_python, tree_sitter_javascript, tree_sitter_typescript

packet=json.load(sys.stdin)
source=packet['source'].encode('utf-8');path=packet['path'];budget=packet['budget']
if len(source)>1048576 or not isinstance(budget,int) or budget<0 or budget>32000:raise ValueError('context bounds')
if path.endswith('.py'):language=Language(tree_sitter_python.language());family='python'
elif path.endswith('.tsx'):language=Language(tree_sitter_typescript.language_tsx());family='typescript'
elif path.endswith(('.ts','.mts','.cts')):language=Language(tree_sitter_typescript.language_typescript());family='typescript'
else:language=Language(tree_sitter_javascript.language());family='javascript'
tree=Parser(language).parse(source)
if tree.root_node.has_error:raise ValueError('BASE parse contains ERROR or MISSING nodes')
words=set(re.findall(r'[a-z_]{3,}',packet['request'].lower()))
def text(node):return source[node.start_byte:node.end_byte].decode('utf-8')
def walk(node):
 yield node
 for child in node.named_children:yield from walk(child)
def identifiers(node):return {text(n) for n in walk(node) if n.type in ('identifier','property_identifier','type_identifier')}
imports=[n for n in tree.root_node.named_children if n.type in ('import_statement','import_from_statement')]
definitions=[]
for node in walk(tree.root_node):
 if node.type not in ('function_definition','class_definition','function_declaration','class_declaration','method_definition','function_expression','arrow_function'):continue
 name=node.child_by_field_name('name')
 if name is None and node.parent.type=='variable_declarator':name=node.parent.child_by_field_name('name')
 if name is None:continue
 # Preserve decorators/export wrappers, and arrow variable declarations.
 outer=node
 if node.parent.type in ('decorated_definition','export_statement'):outer=node.parent
 if node.type in ('arrow_function','function_expression') and node.parent.type=='variable_declarator':outer=node.parent.parent
 symbol=text(name);refs=identifiers(node)
 score=sum(8 for w in words if w in symbol.lower())+sum(1 for w in words if any(w in ref.lower() for ref in refs))
 if score:definitions.append({'node':outer,'score':score})
definitions.sort(key=lambda d:(-d['score'],d['node'].start_byte))
selected=[]
for item in definitions:
 node=item['node']
 if any(n.start_byte<=node.start_byte and n.end_byte>=node.end_byte for n in selected):continue
 candidate=[n for n in selected if not(node.start_byte<=n.start_byte and node.end_byte>=n.end_byte)]+[node]
 refs=set().union(*(identifiers(n) for n in candidate))
 needed=[n for n in imports if identifiers(n)&refs or '__future__' in text(n) or not identifiers(n)]
 nodes=sorted({(n.start_byte,n.end_byte):n for n in needed+candidate}.values(),key=lambda n:n.start_byte)
 chunks=[f"# BASE excerpt {path}:{n.start_point.row+1}-{n.end_point.row+1}\n"+text(n) if family=='python' else f"// BASE excerpt {path}:{n.start_point.row+1}-{n.end_point.row+1}\n"+text(n) for n in nodes]
 content='\n\n'.join(chunks)+'\n'
 if len(content.encode('utf-8'))<=budget and len(candidate)<=8:selected=candidate
if not selected:raise ValueError('No relevant complete BASE definition fits the context budget')
refs=set().union(*(identifiers(n) for n in selected))
needed=[n for n in imports if identifiers(n)&refs or '__future__' in text(n) or not identifiers(n)]
nodes=sorted({(n.start_byte,n.end_byte):n for n in needed+selected}.values(),key=lambda n:n.start_byte)
content='\n\n'.join((('#' if family=='python' else '//')+f" BASE excerpt {path}:{n.start_point.row+1}-{n.end_point.row+1}\n"+text(n)) for n in nodes)+'\n'
print(json.dumps({'content':content,'language':family,'ranges':[{'startLine':n.start_point.row+1,'endLine':n.end_point.row+1,'kind':n.type} for n in nodes],'versions':{n:version(n) for n in ('tree-sitter','tree-sitter-python','tree-sitter-javascript','tree-sitter-typescript')}}))
