import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT } from '../src/config.js';
import { createGravityLabBoard } from '../src/gravity-lab.js';
import { gravitySupportMarkers } from '../src/gravity-hints.js';
import { analyseSupports, planGravitySurge } from '../src/supports.js';
import {
  initialShooter, initialPuzzle, initialGravityLab,
  canTriggerGravityLabSurge, triggerGravityLabSurge, nudgeGravityLab, fireShooter, stepGame,
} from '../src/game.js';

for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
  test(`lab shows one weak group and a twice-braced group (${layout.columns} columns)`, () => {
    const board = createGravityLabBoard(layout);
    const analysis = analyseSupports(board, { layout });
    assert.equal(board.size, 16);
    assert.deepEqual(analysis.unsupported, []);
    assert.deepEqual(analysis.regions.map(x => x.supportCount).sort(), [1, 2]);
    const marks = gravitySupportMarkers(board, 0, layout);
    assert.equal(marks.filter(x => x.warning).length, 1);
    assert.equal(marks.filter(x => !x.warning).length, 2);
    for (const mark of marks) {
      assert.ok(Number.isFinite(mark.start.x) && Number.isFinite(mark.start.y));
      assert.ok(Number.isFinite(mark.end.x) && Number.isFinite(mark.end.y));
    }
    assert.deepEqual(
      new Set(planGravitySurge(board, { layout }).detached.map(([r,c]) => `${r},${c}`)),
      new Set(['1,2','2,2','3,2','4,2','5,2','6,2','6,3','7,2','7,3']),
    );
  });

  test(`Surge releases a hanging chain but retains separate ceiling anchors (${layout.columns} columns)`, () => {
    const state = initialGravityLab(layout);
    assert.equal(state.variant, 'lab');
    assert.equal(state.gravityLabUsed, false);
    assert.equal(fireShooter(state), false, 'lab mode does not launch bubbles');
    assert.equal(canTriggerGravityLabSurge(state), true);
    const scoreBefore = state.score;
    assert.equal(nudgeGravityLab(state), true);
    for (let i = 0; i < 11; i++) stepGame(state, .045);
    const swungTip = state.attachedPositions.get('7,3');
    assert.ok(Math.abs(swungTip.x - state.layout.left - 21 - 3 * 42 - 21) > 5, 'pendulum is visibly swinging before Surge');
    const result = triggerGravityLabSurge(state, { random: () => .5 });
    assert.equal(result.activated, true);
    assert.equal(result.released, 9);
    assert.equal(state.board.size, 7);
    assert.equal(state.falling.length, 9);
    assert.equal(state.board.has('0,2'), true);
    assert.equal(state.board.has('0,5'), true);
    assert.equal(state.board.has('0,6'), true);
    assert.equal(state.score, scoreBefore, 'lab does not award persistent points');
    assert.equal(state.lastEvent, 'surge');
    assert.equal(canTriggerGravityLabSurge(state), false);
    assert.equal(triggerGravityLabSurge(state).activated, false, 'a test board gets one surge');
    for (let i = 0; i < 110; i++) stepGame(state, .045);
    assert.equal(state.falling.length, 0, 'all fallen bubbles eventually burst');
    assert.equal(state.status, 'playing', 'braced bubbles keep the board alive');
    assert.equal(state.board.size, 7);
    assert.equal(state.score, scoreBefore);
    assert.equal(initialGravityLab(layout).gravityLabUsed, false, 'reloading re-arms the experiment');
    assert.equal(nudgeGravityLab(state), false, 'cannot push a completed experiment');
  });
}

test('Surge does not activate on a moving or unfinished lab state', () => {
  const state = initialGravityLab();
  state.projectile = {x: 0, y: 0};
  assert.equal(canTriggerGravityLabSurge(state), false);
  assert.equal(triggerGravityLabSurge(state).activated, false);
  state.projectile = null;
  state.pendingBombs.push({ x:0, y:0 });
  assert.equal(canTriggerGravityLabSurge(state), false);
  state.pendingBombs = [];
  state.status = 'lost';
  assert.equal(canTriggerGravityLabSurge(state), false);
});

test('Arcade and puzzles cannot trigger experimental Surge', () => {
  for (const state of [initialShooter(() => .5), initialPuzzle(0)]) {
    const before = state.board.size;
    assert.equal(canTriggerGravityLabSurge(state), false);
    assert.equal(triggerGravityLabSurge(state).activated, false);
    assert.equal(state.board.size, before);
  }
});
