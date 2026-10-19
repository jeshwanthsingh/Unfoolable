import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {reviewWords} from '../apps/web/src/review-copy.ts';
test('phone review copy is short and exact',()=>assert.equal(reviewWords.unchecked,'Ready for you. Not auto-checked, so take a look.'));
test('phone seals leave room for titles and cards match the composer radius',()=>{const css=readFileSync('apps/web/src/unfoolable.css','utf8');assert.match(css,/\.unfool-task\{[^}]*border-radius:16px/);assert.match(css,/@media\(max-width:480px\)[^{]*\{[\s\S]*\.unfool-task \.hallmark-well\{width:32px;height:32px;align-self:start/);});
