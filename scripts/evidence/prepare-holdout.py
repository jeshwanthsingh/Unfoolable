import pathlib,subprocess,os,json,hashlib
root=pathlib.Path('.work/evidence/data/holdout').resolve();root.mkdir(parents=True,mode=0o700)
repo=root/'repo'; source='/Users/jeshwanthsingh/Projects/Therapy2'
env={**os.environ,'GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_NOSYSTEM':'1','GIT_AUTHOR_NAME':'CC historical holdout','GIT_AUTHOR_EMAIL':'holdout@localhost','GIT_COMMITTER_NAME':'CC historical holdout','GIT_COMMITTER_EMAIL':'holdout@localhost'}
def git(*args,index=None,input=None):
 e=dict(env)
 if index:e['GIT_INDEX_FILE']=str(index)
 return subprocess.run(['git','-C',str(repo),*args],env=e,input=input,capture_output=True,check=True).stdout.decode().strip()
if repo.exists():raise Exception('Holdout preparation already exists; refuse overwrite')
subprocess.run(['git','clone','--no-checkout','--shared',source,str(repo)],env=env,capture_output=True,check=True);git('remote','remove','origin')
(repo/'frontend').mkdir();(repo/'frontend/node_modules').symlink_to(pathlib.Path(source+'/frontend/node_modules').resolve())
rows=[
 ('H1','6342ce3','Resolve the picked booking date and time against Asia/Kolkata, regardless of the browser timezone.','frontend/src/__tests__/clinicTime.test.ts','frontend/src/lib/clinicTime.ts','CLINIC_TIME_ZONE = "Asia/Kolkata"','CLINIC_TIME_ZONE = "UTC"'),
 ('H2','ebf3b79','Only offer booking slots when the entire session fits inside the published clinic time window.','frontend/src/__tests__/buildSlotTimes.test.ts','frontend/src/lib/dateutils.ts','m + slotDurationMinutes <= close','m < close'),
 ('H3','b304abe','Compare booked and past booking slots using clinic-time instants rather than the browser clock.','frontend/src/__tests__/clinicTime.test.ts','frontend/src/lib/clinicTime.ts','const instant = clinicDateTimeToInstant(dateString, convertTo24Hour(slot)).getTime();','const instant = new Date(`${dateString}T${convertTo24Hour(slot)}`).getTime();'),
 ('H4','a82907e','Build the inclusive available booking dates without UTC date-only parsing and use today on the clinic clock.','frontend/src/__tests__/availableDates.test.ts','frontend/src/lib/clinicTime.ts','day <= endDate!.trim()','day < endDate!.trim()'),
 ('H5','80b3ac5','Build the therapist week grid on the clinic calendar, with Monday-first columns and clinic-day session grouping.','frontend/src/__tests__/clinicWeek.test.ts','frontend/src/lib/clinicTime.ts','weekday === 0 ? -6 : 1 - weekday','weekday === 0 ? -6 : -weekday'),
 ('H6','9e97da0','Show the booking connection error again after a failed therapist-profile retry instead of leaving a loading screen.','frontend/src/__tests__/bookingPage.test.tsx','frontend/src/app/patient/booking/[therapistid]/page.tsx','onClick={() => loadDoctor()}','onClick={() => { setDoctorFetchError(false); fetchDoctorById(doctorId); }}'),
]
def is_test(p):return '/__tests__/' in p or '/tests/' in p or '.test.' in p or '.spec.' in p
cases=[]
for id,short,intent,test_path,patch_path,before,after in rows:
 fix=git('rev-parse',short);base=git('rev-parse',fix+'^');index=root/(id+'.index');git('read-tree',fix,index=index)
 changed=git('diff','--name-only',base,fix).splitlines();tests=[p for p in changed if is_test(p)]
 if test_path not in tests:raise Exception('Historical test missing '+id)
 for p in tests:
  old=git('ls-tree',base,'--',p)
  if old:
   mode,kind,oid_path=old.split(' ',2);oid=oid_path.split('\t')[0];git('update-index','--add','--cacheinfo',mode,oid,p,index=index)
  else:git('update-index','--force-remove',p,index=index)
 tree=git('write-tree',index=index);correct=git('commit-tree',tree,'-p',base,input=('Historical correct '+id+' without its tests\n').encode());git('update-ref','refs/heads/'+id+'-correct',correct)
 if any(is_test(p) for p in git('diff','--name-only',base,correct).splitlines()):raise Exception('Candidate contains historical test edits')
 code=git('show',correct+':'+patch_path)
 if before not in code:raise Exception('Half-fix hunk missing '+id)
 wrong_code=code.replace(before,after,1);blob=git('hash-object','-w','--stdin',input=wrong_code.encode());git('update-index','--add','--cacheinfo','100644',blob,patch_path,index=index);wrong_tree=git('write-tree',index=index);wrong=git('commit-tree',wrong_tree,'-p',base,input=('Historical planted half-fix '+id+'\n').encode());git('update-ref','refs/heads/'+id+'-wrong',wrong)
 folder=root/'truth'/id;folder.mkdir(parents=True,mode=0o700); test={'framework':'vitest','runnerDirectory':'frontend','path':'src/__tests__/cc-history-'+id+'.test.tsx','code':git('show',fix+':'+test_path),'summary':intent,'complete':False,'reason':'Historical test packet; correctness label only, never sent to Test Writer'};text=json.dumps(test);(folder/'test-file.json').write_text(text);(folder/'test-file.json').chmod(0o400)
 cases.append({'id':id,'repo':str(repo),'projectRoot':source,'base':base,'fix':fix,'intent':intent,'historicalTest':test_path,'testPacketHash':hashlib.sha256(text.encode()).hexdigest(),'correct':correct,'correctTree':tree,'wrong':wrong,'wrongTree':wrong_tree,'halfFix':{'path':patch_path,'before':before,'after':after}})
manifest={'version':'history-holdout-v1','frozenScorer':'faa4adc','policy':'No tuning after first holdout measurement. Six distinct historical commits, all Therapy2 frontend; five related clinic-calendar bugs, so results are correlated and do not prove cross-repository generalization. Correct candidates contain the exact fix with BASE tests restored. Wrong candidates contain one planted half-fix. No checkout/worktree materialization.','cases':cases};text=json.dumps(manifest,indent=2);(root/'scoring-set.json').write_text(text);(root/'scoring-set.json').chmod(0o400);digest=hashlib.sha256(text.encode()).hexdigest();(root/'scoring-set.sha256').write_text(digest+'\n');print(json.dumps({'cases':len(cases),'manifestHash':digest,'repo':str(repo)}))
