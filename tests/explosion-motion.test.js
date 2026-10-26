import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT } from '../src/config.js';
import { shooterPosition } from '../src/grid.js';
import { kickExplosionSway, stepAttachedSway } from '../src/sway.js';
import { initialShooter, detonateNextBomb, stepGame } from '../src/game.js';
import { bubblePosition } from '../src/positions.js';

for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
  test(`popped bombs kick surviving connected structures (${layout.columns} columns)`, () => {
    const state = initialShooter(() => .4, layout);
    state.board = new Map([
      ['0,3','pink'],['1,3','pink'],['2,3','pink'],
      ['0,7','blue'],['1,7','blue'],['2,7','blue'],
    ]);
    state.bombs.clear();
    const centre = shooterPosition(2,3,0,layout);
    state.pendingBombs = [{x:centre.x,y:centre.y}];
    assert.equal(detonateNextBomb(state),true);
    assert.ok(!state.board.has('2,3'), 'bomb removes nearby bubble');
    assert.ok(state.board.has('2,7'), 'other hanging cluster survives');
    const motion = state.swayDynamics.get('2,7');
    assert.ok(motion?.vx > 10, 'blast gives outward momentum to surviving connected bubbles');
    const base = shooterPosition(2,7,0,layout);
    for(let i=0;i<7;i++) stepAttachedSway(state,.045);
    const live = bubblePosition(state,2,7);
    assert.ok(live.x > base.x + 1.2, 'survivors visibly recoil');
    assert.deepEqual(bubblePosition(state,0,7),shooterPosition(0,7,0,layout),
      'ceiling anchoring remains fixed after explosion');
  });
}

test('explosion shocks are radial, not a global synchronized screen wobble', () => {
  const state=initialShooter(() => .4);
  state.board=new Map([
    ['0,1','pink'],['1,1','blue'],['2,1','blue'],
    ['0,4','green'],['1,4','pink'],['2,4','purple'],
    ['0,7','blue'],['1,7','green'],['2,7','pink'],
  ]);
  state.bombs.clear();
  const left=shooterPosition(2,1,0,state.layout);
  kickExplosionSway(state,[left],1);
  const near=state.swayDynamics.get('2,1');
  const middle=state.swayDynamics.get('2,4');
  const far=state.swayDynamics.get('2,7');
  assert.ok(near && middle);
  assert.ok(Math.abs(near.vx)+Math.abs(near.vy) > Math.abs(middle.vx)+Math.abs(middle.vy));
  assert.ok(!far || Math.hypot(far.vx,far.vy) < Math.hypot(middle.vx,middle.vy));
  const before=state.swayDynamics.size;
  state.reducedMotion=true;
  kickExplosionSway(state,[left],1);
  assert.equal(state.swayDynamics.size,before,'no new pulses when reduced motion is requested');
});

test('blast energy decays while ceiling support and scoring stay intact', () => {
  const state=initialShooter(() => .4);
  const score=state.score;
  const pivot=shooterPosition(0,4,0,state.layout);
  const p=shooterPosition(4,4,0,state.layout);
  kickExplosionSway(state,[p],1.2);
  const start=state.swayDynamics.get('4,4');
  assert.ok(start);
  for(let i=0;i<80;i++) stepGame(state,.045);
  assert.deepEqual(bubblePosition(state,0,4),pivot);
  assert.equal(state.score,score);
  assert.ok(Math.abs(state.swayDynamics.get('4,4')?.vx ?? 0) < 25,
    'the oscillation slows rather than accelerating forever');
});
