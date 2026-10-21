import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {serveWeb} from '../apps/server/static.ts';
const names=['room-light','room-dark','builder-light','builder-dark','builder','grader','writer','owner','package'];
test('production static server serves every tracked Workshop PNG with image MIME',()=>{
 for(const name of names){let status=0,headers:Record<string,string>={},body:Buffer|undefined;const response={writeHead:(s:number,h:Record<string,string>)=>{status=s;headers=h;},end:(b:Buffer)=>{body=b;}};
  assert.equal(serveWeb('/workshop-pixel/'+name+'.png','apps/web/public',response as any),true,name);assert.equal(status,200);assert.equal(headers['Content-Type'],'image/png');assert.ok(body&&body.length>8);assert.equal(headers['Cache-Control'],'no-cache');
 }
});
test('Workshop route refuses unknown files, source, traversal and symlink escapes',()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-workshop-assets-'));const web=join(root,'public');mkdirSync(join(web,'workshop-pixel'),{recursive:true});const response={writeHead:()=>{},end:()=>{}};
 try{for(const path of ['/workshop-pixel/secret.png','/workshop-pixel/source.py','/workshop-pixel/../mark.svg','/workshop-pixel/%2e%2e/private'])assert.equal(serveWeb(path,web,response as any),false);writeFileSync(join(root,'outside'),'private');symlinkSync(join(root,'outside'),join(web,'workshop-pixel','builder.png'));assert.equal(serveWeb('/workshop-pixel/builder.png',web,response as any),false);}finally{rmSync(root,{recursive:true,force:true});}
});

test('build guard fails when any Workshop image is missing or invalid',async()=>{
 const {checkWorkshopAssets}=await import('../scripts/check-workshop-assets.ts');const root=mkdtempSync(join(tmpdir(),'cc-workshop-build-'));mkdirSync(join(root,'workshop-pixel'));
 try{for(const name of names)copyFileSync('apps/web/public/workshop-pixel/'+name+'.png',join(root,'workshop-pixel',name+'.png'));assert.equal(checkWorkshopAssets(root),names.length);
 for(const name of names){const file=join(root,'workshop-pixel',name+'.png');rmSync(file);assert.throws(()=>checkWorkshopAssets(root));copyFileSync('apps/web/public/workshop-pixel/'+name+'.png',file);}
 writeFileSync(join(root,'workshop-pixel','builder.png'),'not a PNG');assert.throws(()=>checkWorkshopAssets(root),/Invalid Workshop PNG/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
