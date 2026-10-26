import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT, SHOT_HIT_DISTANCE } from '../src/config.js';
import { cellKey, shooterPosition, shotBubbleCollision } from '../src/grid.js';
import { bubblePosition } from '../src/positions.js';
import { stepAttachedSway, kickAttachedSway, nudgeLabPendulum } from '../src/sway.js';
import { releaseFloatingShooter } from '../src/gravity.js';
import { initialShooter, initialPuzzle, initialGravityLab, stepGame } from '../src/game.js';

function stateWithBoard(layout, keys) {
  const state = initialShooter(() => .4, layout);
  state.board = new Map(keys.map((key, i) => [key, i % 2 ? 'blue' : 'pink']));
  state.bombs.clear();
  return state;
}

for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
  test(`single-roof hanging chains sway; ceiling anchors remain still (${layout.columns})`, () => {
    const state = stateWithBoard(layout, ['0,3', '1,3', '2,3', '3,3']);
    stepAttachedSway(state, .52);
    assert.deepEqual(bubblePosition(state, 0, 3), shooterPosition(0, 3, 0, layout));
    const live = bubblePosition(state, 3, 3);
    const base = shooterPosition(3, 3, 0, layout);
    assert.ok(Math.abs(live.x - base.x) > .15, 'hanging bubbles have meaningful motion');
    assert.ok(Math.abs(live.x - base.x) < 10, 'sway stays constrained');
    assert.equal(state.board.size, 4, 'normal gravity does not snap loaded bonds');
    stepGame(state, .045);
    assert.equal(state.board.size, 4, 'tick keeps weight-supported bubbles attached');
  });

  test(`independently anchored branches sway less than single-anchor branches (${layout.columns})`, () => {
    const state = stateWithBoard(layout, ['0,3','0,4','1,3','2,3','0,8','1,8','2,8']);
    // Separate single-anchor branch deliberately placed away from doubly anchored branch.
    stepAttachedSway(state, .4);
    const braced = bubblePosition(state, 2, 3);
    const base = shooterPosition(2, 3, 0, layout);
    assert.ok(Math.abs(braced.x - base.x) <= 2, 'independently supported section is stable');
  });

  test(`live positions own shooter hit tests and detached-body origins (${layout.columns})`, () => {
    const state = stateWithBoard(layout, ['0,3', '1,3', '2,3', '3,3']);
    stepAttachedSway(state, .52);
    const p = bubblePosition(state, 3, 3);
    const canonical = shooterPosition(3, 3, state.phase, layout);
    assert.notDeepEqual(p, canonical);
    const dx = p.x - canonical.x;
    assert.ok(Math.abs(dx) > .15);
    // A near-edge hit against the live bubble must not use its stale lattice point.
    const edgeX = p.x + Math.sign(dx) * (SHOT_HIT_DISTANCE - .25);
    assert.deepEqual(shotBubbleCollision(state.board, edgeX, p.y, state.phase, layout, state.attachedPositions), [3,3]);
    assert.notDeepEqual(shotBubbleCollision(state.board, edgeX, p.y, state.phase, layout), [3,3]);
    releaseFloatingShooter(state, [[3,3]], () => .5);
    assert.equal(state.falling.length, 1);
    assert.equal(state.falling[0].x, p.x);
    assert.equal(state.falling[0].y, p.y);
  });
}
test('shot impacts produce damped local swaying, never a severed connection', () => {
  const state = stateWithBoard(MOBILE_LAYOUT, ['0,3','1,3','2,3']);
  stepAttachedSway(state, .3);
  kickAttachedSway(state, 2, 3);
  assert.ok((state.swayKicks.get(cellKey(1,3)) ?? 0) > 0);
  const initial = state.swayKicks.get(cellKey(1,3));
  stepAttachedSway(state, .1);
  assert.ok(state.swayKicks.get(cellKey(1,3)) < initial);
  assert.equal(state.board.size, 3);
});
test('reduced motion leaves geometry unchanged for both Arcade and puzzles', () => {
  for (const state of [
    stateWithBoard(MOBILE_LAYOUT, ['0,3','1,3','2,3']),
    initialPuzzle(0, DESKTOP_LAYOUT, () => .5),
  ]) {
    state.reducedMotion = true;
    stepAttachedSway(state, 3);
    assert.equal(state.attachedPositions.size, 0);
    const [row, col] = state.board.keys().next().value.split(',').map(Number);
    assert.deepEqual(bubblePosition(state,row,col), shooterPosition(row,col,state.phase,state.layout));
  }
});
test('Gravity Lab pendulum swings around a fixed roof pivot while braced bubbles remain still', () => {
  const state = initialGravityLab();
  const tip = shooterPosition(7, 3, 0, state.layout);
  const pivot = shooterPosition(0, 2, 0, state.layout);
  const braced = shooterPosition(2, 5, 0, state.layout);
  stepAttachedSway(state, .42);
  assert.equal(state.board.size, 16);
  assert.deepEqual(bubblePosition(state, 0, 2), pivot);
  assert.ok(Math.abs(bubblePosition(state, 7, 3).x - tip.x) > 3);
  assert.deepEqual(bubblePosition(state, 2, 5), braced);
  assert.equal(nudgeLabPendulum(state), true);
  const oldX = bubblePosition(state, 7, 3).x;
  for (let i = 0; i < 12; i++) stepAttachedSway(state, .045);
  assert.ok(Math.abs(bubblePosition(state, 7, 3).x - oldX) > 10,
    'visible nudge moves the suspended tip by more than ten pixels');
  const distance = pos => Math.hypot(pos.x - pivot.x, pos.y - pivot.y);
  assert.ok(Math.abs(distance(bubblePosition(state, 7, 3)) - distance(tip)) < .01,
    'rigid pendulum rotation preserves attachment length');
});
test('reduced-motion mode explicitly disables the lab pendulum', () => {
  const state = initialGravityLab();
  state.reducedMotion = true;
  assert.equal(nudgeLabPendulum(state), false);
  stepAttachedSway(state, .5);
  assert.equal(state.attachedPositions.size, 0);
});
test('sway state is specific to each game and never persists after restarting', () => {
  const first = stateWithBoard(MOBILE_LAYOUT, ['0,3','1,3']);
  kickAttachedSway(first, 1, 3);
  const next = initialShooter(() => .3);
  assert.equal(next.swayKicks.size, 0);
  assert.equal(next.attachedPositions.size, 0);
  assert.equal(next.swayClock, 0);
});
