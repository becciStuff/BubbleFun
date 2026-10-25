import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT, SHOT_HIT_DISTANCE } from '../src/config.js';
import {
  cellKey, shooterColumns, shooterPosition, shooterNeighbours,
  connectedShooter, floatingShooter, shotBubbleCollision,
} from '../src/grid.js';
import {
  shooterColumns as gameColumns, shooterPosition as gamePosition,
  connectedShooter as gameConnected, floatingShooter as gameFloating,
} from '../src/game.js';

test('legacy game exports point to the extracted grid functions', () => {
  assert.equal(gameColumns, shooterColumns);
  assert.equal(gamePosition, shooterPosition);
  assert.equal(gameConnected, connectedShooter);
  assert.equal(gameFloating, floatingShooter);
});

test('grid positions alternate by phase and respect both layouts', () => {
  for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
    for (const phase of [0, 1]) {
      const first = shooterColumns(0, phase, layout);
      const next = shooterColumns(1, phase, layout);
      assert.equal(first + next, layout.columns * 2 - 1);
      assert.ok(shooterPosition(0, first - 1, phase, layout).x < layout.width - layout.left);
      const before = shooterPosition(0, 3, phase, layout);
      const after = shooterPosition(1, 3, 1 - phase, layout);
      assert.equal(before.x, after.x, 'descending preserves horizontal bubble alignment');
    }
  }
});

test('dense hex grids have at most six symmetric physical neighbours', () => {
  for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
    for (const phase of [0, 1]) {
      const board = new Map();
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < shooterColumns(row, phase, layout); col++) board.set(cellKey(row, col), 'pink');
      }
      for (const k of board.keys()) {
        const [row, col] = k.split(',').map(Number);
        const neighbours = shooterNeighbours(board, row, col, phase, layout);
        assert.ok(neighbours.length <= 6, `${k} exceeded six neighbours`);
        for (const [nr, nc] of neighbours) {
          assert.ok(board.has(cellKey(nr, nc)));
          assert.ok(shooterNeighbours(board, nr, nc, phase, layout)
            .some(([r, c]) => r === row && c === col), `${k} adjacency should be symmetric`);
        }
      }
    }
  }
});

test('colour matching and structural connectivity are different traversals', () => {
  const board = new Map([
    ['0,3', 'pink'], ['0,4', 'blue'], ['1,3', 'yellow'], ['2,3', 'green'],
  ]);
  assert.deepEqual(connectedShooter(board, 1, 3), [[1, 3]]);
  assert.equal(connectedShooter(board, 1, 3, 0, false).length, 4);
  assert.deepEqual(floatingShooter(board), []);
  board.delete('0,3');
  assert.deepEqual(floatingShooter(board), [], 'the second ceiling anchor still holds the cluster');
  board.delete('0,4');
  assert.deepEqual(floatingShooter(board), [[1,3], [2,3]]);
});

test('shot collision uses the same near-graze boundary on desktop and mobile', () => {
  for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
    const p = shooterPosition(1, 3, 0, layout);
    const board = new Map([['1,3', 'green']]);
    assert.deepEqual(shotBubbleCollision(board, p.x, p.y, 0, layout), [1,3]);
    assert.deepEqual(shotBubbleCollision(board, p.x + SHOT_HIT_DISTANCE - .1, p.y, 0, layout), [1,3]);
    assert.equal(shotBubbleCollision(board, p.x + SHOT_HIT_DISTANCE, p.y, 0, layout), null);
    assert.equal(shotBubbleCollision(board, p.x + SHOT_HIT_DISTANCE + .1, p.y, 0, layout), null);
  }
});
