"""Native denied-parent probe. No personal data; all fixtures under .work/."""
import json, pathlib, re, subprocess, sys, uuid
root=pathlib.Path('.work/tripwires').resolve()/('probe-'+uuid.uuid4().hex)
owned=root/'owned';late=root/'created-after-start';owned.mkdir(parents=True)
profile=re.sub(r'"([^"\n]+)":',r'"\1"=',json.dumps({'filesystem':{':root':'read',str(root):'deny',str(owned):'write'},'network':{'enabled':False}}))
program="""import json,pathlib,sys,time,sqlite3,os
own=pathlib.Path.cwd();print('READY',flush=True)
end=time.monotonic()+10
while not (own/'go').exists():
 if time.monotonic()>end:raise RuntimeError('parent deadline')
 time.sleep(.01)
r={}
try:(own/'normal').write_text('fixture');r['owned_write']=True
except OSError as e:r['owned_write']=False
try:(pathlib.Path(sys.argv[1])/'fixture').read_text();r['mid_session_sibling_readable']=True
except OSError as e:r['mid_session_sibling_readable']=False;r['sibling_errno']=e.errno
try:os.stat(own.parent);r['parent_metadata']=True
except OSError as e:r['parent_metadata']=False;r['metadata_errno']=e.errno
try:c=sqlite3.connect(str(own/'temporary.sqlite'));c.execute('create table t(x)');c.close();r['sqlite']=True
except sqlite3.Error as e:r['sqlite']=False;r['sqlite_error']=str(e)
print(json.dumps(r),flush=True)
"""
argv=[str(pathlib.Path.home()/'Projects/ai-lab/bin/codex'),'sandbox','-c','permissions.probe='+profile,'-c','default_permissions="probe"','-P','probe','-C',str(owned),'--',sys.executable,'-c',program,str(late)]
p=subprocess.Popen(argv,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
assert p.stdout.readline().strip()=='READY','worker did not reach owned probe'
late.mkdir();subprocess.run(['git','init','-q',str(late)],check=True);(late/'fixture').write_text('harmless fixture');(owned/'go').write_text('go')
out,err=p.communicate(timeout=15);assert p.returncode==0,err
result=json.loads(out);assert result['owned_write'] and not result['mid_session_sibling_readable']
assert not result['parent_metadata'] and not result['sqlite'], 'limitation changed; investigate safe profile'
result.update({'exit_code':p.returncode,'created_after_worker_ready':True,'fixture':str(root),'codex_version':subprocess.check_output([argv[0],'--version'],text=True).strip(),'production_profile_changed':False})
pathlib.Path('artifacts/tripwires/step-1-native-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
