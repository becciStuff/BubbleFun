import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT, RADIUS } from '../src/config.js';
import { shooterPosition } from '../src/grid.js';
import { findDetachedBubbles, releaseFloatingShooter, stepFallingBubbles } from '../src/gravity.js';
import { initialShooter, releaseFloatingShooter as oldRelease } from '../src/game.js';

const fallingAt = (layout, overrides = {}) => ({
  x: layout.width / 2, y: 100, colour: 'blue', bomb: false,
  vx: 0, vy: 0, gravity: 900, spin: 0, rotation: 0,
  burstAt: 3.2, sparkleClock: 0, ...overrides,
});

test('legacy release export still points to the independent gravity module', () => {
  assert.equal(oldRelease, releaseFloatingShooter);
});

test('detachment checks ceiling connectivity regardless of bubble colour', () => {
  for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
    const board = new Map([
      ['0,3','pink'], ['1,3','blue'], ['2,3','yellow'],
      ['4,6','green'], ['5,6','purple'],
    ]);
    assert.deepEqual(findDetachedBubbles(board, 0, layout), [[4,6],[5,6]]);
    board.delete('1,3');
    assert.deepEqual(findDetachedBubbles(board, 0, layout), [[2,3],[4,6],[5,6]]);
  }
});

test('release removes only requested board cells and retains bomb identity', () => {
  const state = initialShooter(() => .2);
  state.board = new Map([['0,0','pink'], ['2,3','green']]);
  state.bombs = new Set(['2,3']);
  const score = state.score;
  assert.equal(releaseFloatingShooter(state, [[2,3], [8,8]], () => .5), 1);
  assert.equal(state.board.size, 1);
  assert.equal(state.board.get('0,0'), 'pink');
  assert.equal(state.bombs.size, 0);
  assert.equal(state.falling.length, 1);
  const bubble = state.falling[0];
  const p = shooterPosition(2,3);
  assert.equal(bubble.x, p.x);
  assert.equal(bubble.y, p.y);
  assert.equal(bubble.colour, 'green');
  assert.equal(bubble.bomb, true);
  assert.equal(bubble.vx, (p.x - state.layout.width / 2) * .09);
  assert.equal(bubble.vy, -45);
  assert.equal(bubble.gravity, 955);
  assert.equal(bubble.spin, 0);
  assert.equal(bubble.burstAt, 3.2);
  assert.equal(state.score, score, 'gravity itself never awards points');
  assert.equal(releaseFloatingShooter(state, [[2,3]], () => .5), 0, 'cannot detach twice');
});

test('falling physics integrates gravity, spin and wall bounce', () => {
  for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
    const low = layout.left + RADIUS;
    const bubble = fallingAt(layout, { x: low + 1, vx: -100, vy: 0, gravity: 1000, spin: 1.25 });
    const result = stepFallingBubbles([bubble], layout, .02);
    assert.equal(result.exploded, 0);
    assert.deepEqual(result.remaining, [bubble]);
    assert.equal(bubble.x, low);
    assert.equal(bubble.vx, 70);
    assert.equal(bubble.vy, 20);
    assert.equal(bubble.y, 100.4);
    assert.equal(bubble.rotation, .025);
  }
});

test('spark events report existing timing and seeded sideways velocity', () => {
  const bubble = fallingAt(MOBILE_LAYOUT, { sparkleClock: .04 });
  const sparks = [];
  const bursts = [];
  const result = stepFallingBubbles([bubble], MOBILE_LAYOUT, .02, {
    random: () => .75,
    onSpark: (...args) => sparks.push(args),
    onBurst: (...args) => bursts.push(args),
  });
  assert.equal(result.exploded, 0);
  assert.equal(sparks.length, 1);
  assert.deepEqual(sparks[0], [bubble.x, bubble.y, 'blue', 12.5, -35]);
  assert.equal(bubble.sparkleClock, 0);
  assert.deepEqual(bursts, []);
});

test('floor impacts burst on the floor and preserve bomb explosion strength', () => {
  for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
    const floorY = layout.height - 22 - RADIUS;
    const normal = fallingAt(layout, { y: floorY - 1, vy: 300 });
    const bomb = fallingAt(layout, { y: floorY - 1, vy: 300, bomb: true, colour: 'pink' });
    const bursts = [];
    const result = stepFallingBubbles([normal, bomb], layout, .02, {
      onBurst: (...args) => bursts.push(args),
    });
    assert.equal(result.exploded, 2);
    assert.deepEqual(result.remaining, []);
    assert.deepEqual(bursts, [
      [normal.x, floorY, 'blue', .75],
      [bomb.x, floorY, 'pink', 1],
    ]);
  }
});

test('the burst timeout still expires even before a bubble reaches the floor', () => {
  const bubble = fallingAt(MOBILE_LAYOUT, { burstAt: .005, y: 120 });
  const events = [];
  const result = stepFallingBubbles([bubble], MOBILE_LAYOUT, .01, {
    onBurst: (x, y, colour, strength) => events.push({ x, y, colour, strength }),
  });
  assert.equal(result.exploded, 1);
  assert.deepEqual(result.remaining, []);
  assert.deepEqual(events, [{ x: bubble.x, y: bubble.y, colour: 'blue', strength: .75 }]);
});

test('spark callbacks occur before burst callbacks within the same tick', () => {
  const layout = MOBILE_LAYOUT;
  const bubble = fallingAt(layout, {
    y: layout.height - 22 - RADIUS - 1, vy: 300, sparkleClock: .05,
  });
  const order = [];
  const result = stepFallingBubbles([bubble], layout, .02, {
    random: () => .5,
    onSpark: () => order.push('spark'),
    onBurst: () => order.push('burst'),
  });
  assert.equal(result.exploded, 1);
  assert.deepEqual(order, ['spark', 'burst']);
});
