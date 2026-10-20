import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'vite';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
test('discarded notes are disclosed on the card and Proof; all-dropped output is incomplete, never clean',async()=>{
 const server=await createServer({configFile:'apps/web/vite.config.ts',server:{middlewareMode:true,watch:null,hmr:false},appType:'custom'});
 try{const {ReviewerNotes}=await server.ssrLoadModule('/src/ReviewerNotes.tsx');
 for(const compact of [true,false])for(const mixed of [true,false]){
 const run={role:'intent',status:mixed?'DONE':'INCOMPLETE',discardedNotes:1,findings:mixed?[{file:'code.py',line:1,message:'A required value is discarded.',serious:true}]:[],limitation:'',usage:{totalTokens:10},sessionId:'saved',tokenLimit:15000};
 const html=renderToStaticMarkup(createElement(ReviewerNotes,{panel:{candidate:'frozen',checkSequence:1,runs:[run]},compact}));
 assert.match(html,/1 reviewer note was discarded \(pointed outside this change\)/);
 if(mixed){assert.match(html,/A required value is discarded/);assert.match(html,/Reviewer flag/);}else{assert.match(html,/Review incomplete/);assert.doesNotMatch(html,/No finding reported|Reviewer flag/);}
 }
 }finally{await server.close();}
});
