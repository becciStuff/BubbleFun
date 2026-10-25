import test from 'node:test';
import assert from 'node:assert/strict';
import { visualState, addPulse, updateVisualEffects } from '../src/effects.js';
import { initialPop, popAt, popCellAt, collapsePop } from '../src/pop-mode.js';
import { initialPop as legacyInitialPop, popAt as legacyPopAt } from '../src/game.js';

test('archived Pop API is preserved through game.js', () => {
  assert.equal(legacyInitialPop, initialPop);
  assert.equal(legacyPopAt, popAt);
});
test('visual effects are independent of game logic', () => {
  const state = visualState();
  addPulse(state, 12, 24, 'blue');
  assert.equal(state.pulses.length, 1);
  const r = state.pulses[0].radius;
  updateVisualEffects(state, .02);
  assert.ok(state.pulses[0].radius > r);
  updateVisualEffects(state, 1);
  assert.equal(state.pulses.length, 0);
});
test('archived Pop still removes groups and scores moves', () => {
  const state = initialPop(() => .1);
  state.board = [['blue','blue'], ['pink','pink']];
  assert.equal(popAt(state, 0, 0), 2);
  assert.equal(state.score, 20);
  assert.equal(state.moves, 1);
  assert.equal(state.board[0][0], null);
  assert.deepEqual(collapsePop([['blue',null],['pink',null]]), [['blue',null],['pink',null]]);
});
test('archived Pop screen-to-cell mapping is preserved', () => {
  assert.equal(popCellAt(-99, -99), null);
});
