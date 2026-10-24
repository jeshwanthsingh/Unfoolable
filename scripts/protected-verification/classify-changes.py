"""Syntax-only change labels. Never imports, evaluates or executes repository code."""
import hashlib
import json
import re
import sys
from importlib.metadata import version
from tree_sitter import Language, Parser
import tree_sitter_python
import tree_sitter_javascript
import tree_sitter_typescript
import tree_sitter_markdown
import tree_sitter_json
import tree_sitter_yaml

LANGUAGES = {
    'json': Language(tree_sitter_json.language()),
    'yaml': Language(tree_sitter_yaml.language()),
    'yml': Language(tree_sitter_yaml.language()),
    'py': Language(tree_sitter_python.language()),
    'js': Language(tree_sitter_javascript.language()),
    'ts': Language(tree_sitter_typescript.language_typescript()),
    'tsx': Language(tree_sitter_typescript.language_tsx()),
    'md': Language(tree_sitter_markdown.language()),
}

def walk(node):
    yield node
    for child in node.children:
        yield from walk(child)

def signature(node, source, strings=False):
    if node.type in ('comment', 'line_comment', 'block_comment'):
        return None
    if strings and node.type in ('string', 'string_literal', 'template_string'):
        if not any(n.type in ('interpolation', 'template_substitution') for n in walk(node)):
            return ('literal',)
    children = tuple(v for c in node.children if (v := signature(c, source, strings)) is not None)
    if node.children or node.type in ('module', 'program'):
        return (node.type, children)
    return (node.type, source[node.start_byte:node.end_byte])

def family(path):
    suffix = path.rsplit('.', 1)[-1].lower()
    return {'mjs': 'js', 'cjs': 'js', 'jsx': 'js', 'mts': 'ts', 'cts': 'ts', 'markdown': 'md'}.get(suffix, suffix)

def role(path):
    if re.search(r'(^|/)([^/]*lock[^/]*|package\.json|pyproject\.toml|requirements[^/]*\.txt|go\.(mod|sum)|Cargo\.toml)$', path, re.I):
        return 'dependency/lockfile'
    if re.search(r'(^|/)(\.github|\.circleci)(/|$)|(^|/)([^/]*config[^/]*|Dockerfile[^/]*|Makefile|Jenkinsfile|\.gitlab-ci\.yml)$', path, re.I):
        return 'config/CI/build'
    if re.search(r'(^|/)(tests?|__tests__)(/|$)|(^|/)(test_[^/]+|[^/]+_test)\.|\.(test|spec)\.', path, re.I):
        return 'test code'
    return None

def overlaps(node, start, count):
    return count > 0 and node.start_point.row < start - 1 + count and node.end_point.row >= start - 1

def functions(tree, source, start, count):
    names = []
    for node in walk(tree.root_node):
        if node.type not in ('function_definition', 'function_declaration', 'method_definition', 'arrow_function', 'function_expression') or not overlaps(node, start, count):
            continue
        name = node.child_by_field_name('name')
        if name is None and node.parent and node.parent.type == 'variable_declarator':
            name = node.parent.child_by_field_name('name')
        if name:
            names.append(source[name.start_byte:name.end_byte].decode('utf-8'))
    return sorted(set(names))

def classify(file):
    path, before, after, hunks = file['path'], file['before'], file['after'], file['hunks']
    if not isinstance(path, str) or not isinstance(before, str) or not isinstance(after, str) or len(hunks) > 200:
        raise ValueError('invalid bounded file')
    f = family(path)
    parser = Parser(LANGUAGES[f]) if f in LANGUAGES else None
    old, new = before.encode('utf-8'), after.encode('utf-8')
    trees = [parser.parse(s) for s in (old, new)] if parser and max(len(old), len(new)) <= 1048576 else None
    old_lines, new_lines = before.splitlines(keepends=True), after.splitlines(keepends=True)
    result = []
    for hunk in hunks:
        if set(hunk) != {'oldStart', 'oldLines', 'newStart', 'newLines'} or any(type(v) is not int or v < 0 for v in hunk.values()):
            raise ValueError('invalid hunk range')
        for prefix, lines in [('old', old_lines), ('new', new_lines)]:
            start, count = hunk[prefix+'Start'], hunk[prefix+'Lines']
            if count and (start < 1 or start - 1 + count > len(lines)) or not count and start > len(lines):
                raise ValueError('hunk range outside frozen file')
        kind, reason = 'logic', 'Unsupported, invalid or ambiguous syntax; inspect the change.'
        names = []
        if trees and not any(t.root_node.has_error for t in trees):
            names = sorted(set(functions(trees[0], old, hunk['oldStart'], hunk['oldLines']) + functions(trees[1], new, hunk['newStart'], hunk['newLines'])))
            index = hunk['oldStart'] - (1 if hunk['oldLines'] else 0)
            start = hunk['newStart'] - (1 if hunk['newLines'] else 0)
            replacement = new_lines[start:start+hunk['newLines']]
            intermediate = ''.join(old_lines[:index]+replacement+old_lines[index+hunk['oldLines']:]).encode('utf-8')
            tree = parser.parse(intermediate)
            if not tree.root_node.has_error:
                if f == 'md':
                    dangerous = ('code', 'html', 'metadata')
                    intersects = any(any(k in n.type for k in dangerous) and overlaps(n, hunk[p+'Start'], hunk[p+'Lines']) for t,p in zip(trees, ('old','new')) for n in walk(t.root_node))
                    # Inline HTML/expressions and code-like syntax remain cautious even if the block grammar is permissive.
                    changed = ''.join(old_lines[index:index+hunk['oldLines']]+replacement)
                    if not intersects and not re.search(r'[<>{}`;]|javascript\s*:', changed, re.I):
                        kind, reason = 'comment/docs-only', 'Documentation prose changed; no executable example or markup is classified as prose.'
                elif signature(trees[0].root_node, old) == signature(tree.root_node, intermediate):
                    kind, reason = 'comment/docs-only', 'Only comments or formatting changed in this hunk.'
                elif signature(trees[0].root_node, old, True) == signature(tree.root_node, intermediate, True):
                    kind, reason = 'string-literal-only', 'Only literal text changed; this does not prove unchanged behavior.'
                else:
                    reason = 'Executable syntax changed in this hunk.'
        selected = role(path)
        if selected and trees and not any(t.root_node.has_error for t in trees):
            kind, reason = selected, 'Changed '+selected+'; existing review restrictions still apply.'
        result.append({**hunk, 'kind': kind, 'functions': names, 'reason': reason})
    digest = lambda s: hashlib.sha256(s).hexdigest()
    return {'path': path, 'beforeHash': digest(old), 'afterHash': digest(new), 'hunks': result}

packet = json.loads(sys.stdin.buffer.read(8388609))
if not isinstance(packet, dict) or set(packet) != {'files'} or not isinstance(packet['files'], list) or len(packet['files']) > 200:
    raise ValueError('invalid bounded classification packet')
print(json.dumps({'version': 'change-classification-v1', 'files': [classify(f) for f in packet['files']], 'parserVersions': {name: version(name) for name in ('tree-sitter','tree-sitter-python','tree-sitter-javascript','tree-sitter-typescript','tree-sitter-markdown', 'tree-sitter-json', 'tree-sitter-yaml')}}))
