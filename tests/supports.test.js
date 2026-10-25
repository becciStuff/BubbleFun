import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT } from '../src/config.js';
import { analyseSupports, planGravitySurge } from '../src/supports.js';
const board = (...cells) => new Map(cells.map((key,i) => [key, i % 2 ? 'blue':'pink']));

for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
  test(`a single anchor holds weight in Normal Gravity (${layout.columns} columns)`, () => {
    const b = board('0,3','1,3','2,3');
    const r = analyseSupports(b, {layout});
    assert.deepEqual(r.unsupported, []);
    assert.equal(r.bridges.length, 2);
    assert.deepEqual(r.bridges.map(x=>x.weight).sort((a,b)=>a-b), [1,2]);
    assert.equal(b.size,3, 'inspection must never detach bubbles');
  });
  test(`separate supports protect a mutually braced pair (${layout.columns} columns)`, () => {
    const b=board('0,3','0,5','1,3','1,4');
    const r=analyseSupports(b,{layout});
    assert.deepEqual(r.unsupported,[]);
    assert.equal(r.bridges.length,0, 'each support provides a separate route to ceiling');
    assert.deepEqual(planGravitySurge(b,{layout}).detached,[]);
  });
  test(`double-supported branch can still have a vulnerable leaf (${layout.columns} columns)`, () => {
    const b=board('0,3','0,4','1,3','2,3');
    const r=analyseSupports(b,{layout});
    assert.equal(r.bridges.length,1);
    assert.equal(r.bridges[0].to,'2,3');
    assert.deepEqual(planGravitySurge(b,{layout}).detached,[[2,3]]);
  });
}
test('weighted branch breaks only when surge is explicitly planned', () => {
  const b=board('0,3','1,3','2,3');
  const r=planGravitySurge(b);
  assert.equal(r.releasedRegions.length,1,'single-anchor branch releases once');
  assert.equal(r.brokenBonds.length,0,'nested bonds must not be double-counted');
  assert.deepEqual(new Set(r.detached.map(x=>x.join(','))),new Set(['1,3','2,3']));
  assert.equal(b.size,3,'planning has no side effects');
});
test('reinforced stickiness prevents single-support failure', () => {
  const b=board('0,3','1,3');
  assert.deepEqual(planGravitySurge(b,{bondStrength:4}).detached,[]);
  assert.deepEqual(planGravitySurge(b,{bondStrength:1}).detached,[[1,3]]);
});
test('unsupported old floating bubbles are reported but not confused with broken supports',()=>{
  const b=board('0,3','3,7');
  const r=analyseSupports(b);
  assert.deepEqual(r.unsupported,[[3,7]]);
  assert.deepEqual(r.bridges,[]);
});
test('board phase 1 uses the proper staggered adjacency',()=>{
  const b=board('0,3','1,3','2,3');
  const r=analyseSupports(b,{phase:1});
  assert.equal(r.bridges.length,2);
});
test('zero force never breaks connections and invalid parameters are rejected',()=>{
  const b=board('0,3','1,3');
  assert.deepEqual(planGravitySurge(b,{force:0}).detached,[]);
  assert.throws(()=>planGravitySurge(b,{force:-1}),RangeError);
  assert.throws(()=>analyseSupports(b,{bondStrength:0}),RangeError);
});

test('two links to one ceiling bubble do NOT count as independent supports', () => {
  const b=board('0,3','1,2','1,3');
  const a=analyseSupports(b);
  assert.equal(a.regions.length,1);
  assert.deepEqual(a.regions[0].anchors,['0,3']);
  assert.equal(a.regions[0].supportCount,1);
  assert.equal(a.bridges.length,0,'there are two bonds but only one roof anchor');
  assert.deepEqual(new Set(planGravitySurge(b).detached.map(c=>c.join(','))),new Set(['1,2','1,3']));
});
