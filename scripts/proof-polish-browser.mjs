import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const fixture=JSON.parse(readFileSync(process.argv[2], 'utf8'));
assert.equal(fixture.fixture,true);
assert.equal(JSON.parse(readFileSync(join(fixture.data,'.cc-data-mode.json'),'utf8')).mode,'TEST');
const {chromium}=await import(pathToFileURL(resolve(process.env.CC_PLAYWRIGHT_MODULE)).href);
const key=readFileSync(join(fixture.data,'ticket-operator.key'),'utf8').trim();
const out=resolve(process.argv[3]);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try {
 for(const width of [1440,390])for(const theme of ['light','dark'])for(const reducedMotion of ['reduce','no-preference']){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},colorScheme:theme,reducedMotion});
  await context.addInitScript(({key,theme})=>{sessionStorage.setItem('cc-ticket-key',key);localStorage.setItem('unfool-theme',theme);localStorage.setItem('unfool-classic','0');},{key,theme});
  const page=await context.newPage();
  try {
   await page.goto('http://localhost:'+fixture.port+'/');
   const row=page.locator('[data-ticket-id="'+fixture.ticket+'"]');
   await row.getByRole('button',{name:'See the proof',exact:true}).waitFor();
   const original=await row.boundingBox();const originalBorder=await row.evaluate(el=>getComputedStyle(el).borderLeftColor);
   await row.getByRole('button',{name:'See the proof',exact:true}).click();
   const pass=page.locator('.observatory-pass');await pass.getByRole('heading',{name:'What this change contains'}).waitFor();
   await page.waitForTimeout(400);
   const compact=await row.evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {opacity:Number(s.opacity),visibility:s.visibility,height:r.height,selected:el.getAttribute('data-proof-selected')};});
   assert.ok(compact.opacity>.95&&compact.visibility!=='hidden','Selected task must remain painted in the list');
   assert.ok(compact.height>0&&compact.height<original.height,'Selected task must be compact, not a gap');
   assert.equal(compact.selected,'true');assert.notEqual(await row.evaluate(el=>getComputedStyle(el).borderLeftColor),originalBorder,'Selected card must be highlighted');
   assert.ok((await row.innerText()).includes('Clearer setup help'));
   assert.equal(await pass.getByRole('button',{name:'Accept with Touch ID'}).isDisabled(),true);
   const facts=pass.locator('.obs2-room-facts button');assert.equal(await facts.count(),4);
   for(const fact of await facts.all()){
    assert.equal(await fact.evaluate(el=>getComputedStyle(el).borderTopWidth),'0px','Facts must be borderless plain rows');
    assert.ok((await fact.boundingBox()).height>=44,'Plain fact rows retain a 44px touch target');
    const icon=fact.locator('svg');assert.equal(await icon.count(),1);
    assert.ok((await icon.boundingBox()).width<=24,'Fact icon must stay small');
   }
   assert.ok(!(await pass.innerText()).includes('protected-paths-v1'),'Manifest version belongs only in closed Technical details');
   await pass.getByText('Technical details',{exact:true}).click();
   assert.ok((await pass.locator('.proof-technical').innerText()).includes('protected-paths-v1'));
   const stop=page.getByRole('button',{name:'Stop all',exact:true});await stop.click({trial:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.getByRole('button',{name:'Close proof'}).click();
   await page.getByRole('button',{name:'See the proof',exact:true}).waitFor();
   await page.waitForFunction(({id,height})=>document.querySelector('[data-ticket-id="'+id+'"]').getBoundingClientRect().height>height,{id:fixture.ticket,height:compact.height},{timeout:3000});
   await page.waitForFunction(id=>document.activeElement?.closest('[data-ticket-id]')?.getAttribute('data-ticket-id')===id,fixture.ticket,{timeout:3000});
   results.push({width,theme,reducedMotion,pass:true});
  } catch(error){results.push({width,theme,reducedMotion,error:error.message});}
  finally {await context.close();}
 }
} finally {await browser.close();}
writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results));if(results.some(r=>r.error))process.exitCode=1;
