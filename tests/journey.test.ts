import {test} from 'node:test';
import assert from 'node:assert/strict';
import {intentPreview,recentMission,NEEDS_YOU_EMPTY} from '../apps/web/src/presentation.ts';
const mission={id:'m1',projectId:'p1',originalIntent:'  Fix login.\nKeep exact intent.  ',phase:'DRAFT' as const,createdAt:'2026-01-01T00:00:00Z'};
test('bounded previews never alter original user intent',()=>{const before=mission.originalIntent;assert.equal(intentPreview(before),'Fix login. Keep exact intent.');assert.equal(mission.originalIntent,before);assert.ok(intentPreview('x'.repeat(400)).length<=180);});
test('recent Mission uses verified last-viewed identity or truthful recorded fallback',()=>{const other={...mission,id:'m2',createdAt:'2026-01-02T00:00:00Z'};assert.equal(recentMission([mission,other],'m1')?.kind,'viewed');assert.equal(recentMission([mission,other],'m1')?.mission.id,'m1');assert.equal(recentMission([mission,other],'deleted')?.kind,'recorded');assert.equal(recentMission([mission,other],null)?.mission.id,'m2');assert.equal(recentMission([],null),null);assert.equal(NEEDS_YOU_EMPTY,'Nothing needs your attention.');});

test('multiline preview uses the literal first paragraph without inventing a title',()=>{assert.equal(intentPreview('  Fix race.\n\nObserved: duplicates.\n\nKeep API.'),'Fix race.');});
