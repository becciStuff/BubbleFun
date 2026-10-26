import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT, SHOT_HIT_DISTANCE } from '../src/config.js';
import { shooterPosition, shotBubbleCollision } from '../src/grid.js';
import { bubblePosition } from '../src/positions.js';
import { stepAttachedSway, kickAttachedSway } from '../src/sway.js';
import { releaseFloatingShooter } from '../src/gravity.js';
import { initialShooter, initialPuzzle, fireShooter, stepGame } from '../src/game.js';

function simpleBoard(layout, keys) {
  const state = initialShooter(() => .4, layout);
  state.board = new Map(keys.map((key, i) => [key, i % 2 ? 'blue' : 'pink']));
  state.bombs.clear();
  return state;
}
const distance = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
  test(`real Arcade board moves after a shot impact (${layout.columns} columns)`, () => {
    const state = initialShooter(() => .4, layout);
    for (let i = 0; i < 12; i++) stepGame(state, .045);
    const base = shooterPosition(4, 4, state.phase, layout);
    const before = bubblePosition(state, 4, 4);
    assert.ok(Number.isFinite(before.x));
    kickAttachedSway(state, 4, 4, 350);
    const positions = [];
    for (let i = 0; i < 12; i++) {
      stepGame(state, .045);
      positions.push(bubblePosition(state, 4, 4));
    }
    assert.ok(Math.max(...positions.map(p => p.x)) - Math.min(...positions.map(p => p.x)) > 3.5,
      'ordinary densely connected Arcade bubbles must noticeably react, too');
    assert.ok(positions.some(p => distance(p, base) > 4), 'shot impact produces visible displacement');
    assert.equal(state.board.size, initialShooter(() => .4, layout).board.size,
      'Normal Gravity must not break connections');
    assert.deepEqual(bubblePosition(state, 0, 4), shooterPosition(0, 4, 0, layout),
      'roof anchors stay fixed');
  });

  test(`single-anchor chain swings farther than braced region (${layout.columns} columns)`, () => {
    const hanging = simpleBoard(layout, ['0,3','1,3','2,3','3,3']);
    const braced = simpleBoard(layout, ['0,3','0,4','1,3','2,3']);
    for (let i = 0; i < 16; i++) {
      stepAttachedSway(hanging, .045);
      stepAttachedSway(braced, .045);
    }
    const a = distance(bubblePosition(hanging, 3, 3), shooterPosition(3, 3, 0, layout));
    const b = distance(bubblePosition(braced, 2, 3), shooterPosition(2, 3, 0, layout));
    assert.ok(a > b, `single anchor should move more (${a} vs ${b})`);
  });

  test(`collision and falling agree on exact visible positions (${layout.columns} columns)`, () => {
    const s = simpleBoard(layout, ['0,3','1,3','2,3','3,3']);
    for (let i = 0; i < 11; i++) stepAttachedSway(s, .045);
    const p = bubblePosition(s, 3, 3);
    const base = shooterPosition(3, 3, 0, layout);
    assert.ok(distance(p, base) > .5);
    assert.deepEqual(shotBubbleCollision(s.board, p.x, p.y, s.phase, layout, s.attachedPositions), [3,3]);
    const side = Math.sign(p.x - base.x) || 1;
    const edge = p.x + side * (SHOT_HIT_DISTANCE - .1);
    assert.deepEqual(shotBubbleCollision(s.board, edge, p.y, s.phase, layout, s.attachedPositions), [3,3]);
    releaseFloatingShooter(s, [[3,3]], () => .5);
    assert.equal(s.falling[0].x, p.x);
    assert.equal(s.falling[0].y, p.y);
  });
}

test('Arcade and all puzzles use live movement, without needing another mode', () => {
  const examples = [initialShooter(() => .4), ...[0,1,2].map(i => initialPuzzle(i))];
  for (const state of examples) {
    assert.notEqual(state.variant, 'lab');
    state.introTime = 0;
    for (let i = 0; i < 10; i++) stepGame(state, .045);
    assert.ok(state.attachedPositions.size > 0);
    assert.ok(fireShooter(state), 'the launcher remains usable');
    assert.ok(state.projectile);
    assert.equal(state.status, 'playing');
  }
});

test('reduced-motion settings leave normal and puzzle positions fixed', () => {
  for (const state of [initialShooter(() => .4), initialPuzzle(0, DESKTOP_LAYOUT)]) {
    state.reducedMotion = true;
    state.introTime = 0;
    stepAttachedSway(state, .5);
    assert.equal(state.attachedPositions.size, 0);
    kickAttachedSway(state, 4, 4, 400);
    assert.equal(state.swayDynamics.size, 0);
    const [row,col] = state.board.keys().next().value.split(',').map(Number);
    assert.deepEqual(bubblePosition(state,row,col), shooterPosition(row,col,state.phase,state.layout));
  }
});
test('new games do not inherit impulses or old board positions', () => {
  const old = initialShooter(() => .3);
  kickAttachedSway(old, 4, 4, 300);
  assert.ok(old.swayDynamics.size > 0);
  const next = initialShooter(() => .3);
  assert.equal(next.swayDynamics.size, 0);
  assert.equal(next.attachedPositions.size, 0);
  assert.equal(next.swayClock, 0);
});
