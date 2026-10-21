import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Workshop initializes Pixi with its no-eval implementation under the unchanged strict CSP',async()=>{
 const source=readFileSync('apps/web/src/WorkshopRoom.tsx','utf8');assert.ok(source.indexOf("await import('pixi.js/unsafe-eval')")>=0&&source.indexOf("await import('pixi.js/unsafe-eval')")<source.indexOf('await app.init('),'Load the CSP-safe implementation before initializing the renderer');
 const {AbstractRenderer}=await import('pixi.js');const original=globalThis.Function;let calls=0;
 try{globalThis.Function=function(){calls++;throw Error('CSP denies generated code');} as unknown as FunctionConstructor;await import('pixi.js/unsafe-eval');const before=calls;assert.doesNotThrow(()=>AbstractRenderer.prototype._unsafeEvalCheck.call({} as any));assert.equal(calls,before,'The renderer must not attempt eval');}
 finally{globalThis.Function=original;}
});
test('Workshop decodes images without blob workers under strict CSP',async()=>{
 const source=readFileSync('apps/web/src/WorkshopRoom.tsx','utf8');assert.ok(source.indexOf('Assets.setPreferences({preferWorkers:false})')>=0&&source.indexOf('Assets.setPreferences({preferWorkers:false})')<source.indexOf('const textures='),'Disable blob-worker loading before the first asset request');
 const {Assets}=await import('pixi.js');assert.doesNotThrow(()=>Assets.setPreferences({preferWorkers:false}));
});
