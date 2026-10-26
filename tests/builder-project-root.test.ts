import {nativeBuilderSkip} from './helpers/portable-dependencies.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {mkdirSync,rmSync} from 'node:fs';import {resolve,join} from 'node:path';import {homedir} from 'node:os';import {randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import {builderFilesystem} from '../apps/server/builder-filesystem.ts';
test('whole Projects denial includes a repository created after the native worker starts; owned SQLite stays usable',{skip:nativeBuilderSkip},()=>{
 const owned=join(homedir(),'.cc-work','native-probe-'+randomUUID()),late=resolve('.work/tripwires','late-'+randomUUID());mkdirSync(owned,{recursive:true});
 try{const filesystem=builderFilesystem([join(homedir(),'Projects')],owned,join(owned,'git'));assert.equal(filesystem[join(homedir(),'Projects')],'deny');
 const profile=JSON.stringify({filesystem,network:{enabled:false}}).replace(/"([^"\n]+)":/g,'"$1"=');const child=`import pathlib,sys,time,json,sqlite3
p=pathlib.Path.cwd();print("READY",flush=True)
end=time.monotonic()+10
while not (p/"go").exists():
 if time.monotonic()>end:raise RuntimeError("parent deadline")
 time.sleep(.01)
r={}
try:pathlib.Path(sys.argv[1]).read_text();r["late_readable"]=True
except PermissionError:r["late_readable"]=False
c=sqlite3.connect(str(p/"test.sqlite"));c.execute("create table t(x)");c.close();r["sqlite"]=True
print(json.dumps(r),flush=True)`;
 const argv=[join(homedir(),'Projects/ai-lab/bin/codex'),'sandbox','-c','permissions.probe='+profile,'-c','default_permissions="probe"','-P','probe','-C',owned,'--','python3','-c',child,join(late,'value')];
 const parent=`import subprocess,pathlib,json,sys
a=json.loads(sys.argv[1]);p=subprocess.Popen(a,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
assert p.stdout.readline().strip()=="READY"
late=pathlib.Path(sys.argv[2]);late.mkdir(parents=True);subprocess.run(["git","init","-q",str(late)],check=True);(late/"value").write_text("harmless")
(pathlib.Path(sys.argv[3])/"go").write_text("go")
o,e=p.communicate(timeout=15);assert p.returncode==0,e
print(o)`;
 const result=JSON.parse(execFileSync('python3',['-c',parent,JSON.stringify(argv),late,owned],{encoding:'utf8',timeout:20000}));assert.deepEqual(result,{late_readable:false,sqlite:true});
 }finally{rmSync(owned,{recursive:true,force:true});rmSync(late,{recursive:true,force:true});}
});
