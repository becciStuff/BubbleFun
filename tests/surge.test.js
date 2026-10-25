import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT } from '../src/config.js';
import { releaseGravitySurge } from '../src/gravity.js';

test('opt-in surge releases overloaded branches without awarding points', () => {
  const state = {
    layout: MOBILE_LAYOUT, phase: 0,
    board: new Map([['0,3','pink'], ['1,3','blue'], ['2,3','green']]),
    bombs: new Set(['2,3']), falling: [], score: 50,
  };
  const result = releaseGravitySurge(state, { random: () => .5 });
  assert.equal(result.released, 2);
  assert.equal(state.board.size, 1);
  assert.equal(state.board.get('0,3'), 'pink');
  assert.equal(state.falling.length, 2);
  assert.equal(state.falling.filter(b=>b.bomb).length, 1);
  assert.equal(state.bombs.size, 0);
  assert.equal(state.score, 50, 'physics must not decide points');
});

test('reinforced single anchor survives an opt-in surge', () => {
  const state = {
    layout: MOBILE_LAYOUT, phase: 0,
    board: new Map([['0,3','pink'], ['1,3','blue']]),
    bombs: new Set(), falling: [], score: 0,
  };
  const result = releaseGravitySurge(state, { bondStrength: 4, random: () => .5 });
  assert.equal(result.released, 0);
  assert.equal(state.board.size, 2);
  assert.equal(state.falling.length, 0);
});
