import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const python=resolve('.work/tools/tree-sitter/bin/python');
function classify(path:string,before:string,after:string,hunks?:unknown[]){
 const range=(s:string)=>s? s.split('\n').length-(s.endsWith('\n')?1:0):0;
 const input={files:[{path,before,after,hunks:hunks??[{oldStart:1,oldLines:range(before),newStart:1,newLines:range(after)}]}]};
 return JSON.parse(execFileSync(python,['scripts/protected-verification/classify-changes.py'],{input:JSON.stringify(input),encoding:'utf8',timeout:10000})).files[0];
}
const kind=(path:string,before:string,after:string)=>classify(path,before,after).hunks[0].kind;
test('real comments are distinct from comment-looking strings and executable interpolation',()=>{
 assert.equal(kind('app.py','x = 1 # old\n','x = 1 # new\n'),'comment/docs-only');
 assert.equal(kind('app.py','x = "# old"\n','x = "# new"\n'),'string-literal-only');
 assert.equal(kind('app.js','const x = "// old";\n','const x = "// new";\n'),'string-literal-only');
 assert.equal(kind('app.js','const x = `hi ${1}`;\n','const x = `hi ${run()}`;\n'),'logic');
 assert.equal(kind('app.py','x = f"hi {1}"\n','x = f"hi {run()}"\n'),'logic');
});
test('logic, changed indentation and invalid or unsupported syntax use the cautious label',()=>{
 assert.equal(kind('app.py','def run():\n return 1\n','def run():\n return 2\n'),'logic');
 assert.equal(kind('app.py','if ok:\n run()\n','if ok:\n pass\nrun()\n'),'logic');
 assert.equal(kind('app.py','x=1\n','def (\n'),'logic');
 assert.equal(kind('app.unknown','old','new'),'logic');
});
test('documentation prose is distinct from executable examples, HTML and build front matter',()=>{
 assert.equal(kind('README.md','# Hello\nRead this.\n','# Hello\nRead that.\n'),'comment/docs-only');
 assert.equal(kind('README.md','```python\nx=1\n```\n','```python\nx=2\n```\n'),'logic');
 assert.equal(kind('README.md','<script>run(1)</script>\n','<script>run(2)</script>\n'),'logic');
 assert.equal(kind('README.md','---\nredirect: /one\n---\n','---\nredirect: /two\n---\n'),'logic');
});
test('file roles stay visible for tests, configuration and dependencies',()=>{
 assert.equal(kind('tests/test_value.py','assert x == 1\n','assert x == 2\n'),'test code');
 assert.equal(kind('.github/workflows/check.yml','run: old','run: new'),'config/CI/build');
 assert.equal(kind('package-lock.json','{}','{"x":1}'),'dependency/lockfile');
});
test('separate hunks retain distinct labels and name real enclosing functions',()=>{
 const before='# old\n\ndef parse_args():\n return "old"\n\ndef run():\n return 1\n';
 const after='# new\n\ndef parse_args():\n return "new"\n\ndef run():\n return 2\n';
 const result=classify('cli.py',before,after,[{oldStart:1,oldLines:1,newStart:1,newLines:1},{oldStart:4,oldLines:1,newStart:4,newLines:1},{oldStart:7,oldLines:1,newStart:7,newLines:1}]);
 assert.deepEqual(result.hunks.map((h:any)=>h.kind),['comment/docs-only','string-literal-only','logic']);
 assert.deepEqual(result.hunks[2].functions,['run']);
});
test('adding only a comment to an empty Python file is documentation, not executable code',()=>{
 assert.equal(kind('app.py','','# A useful note\n'),'comment/docs-only');
});
