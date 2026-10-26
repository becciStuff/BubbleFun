import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT, RADIUS } from '../src/config.js';
import { cellKey, shooterPosition, shotBubbleCollision } from '../src/grid.js';
import { planHangingSag } from '../src/sag.js';
import { stepAttachedSway } from '../src/sway.js';
import { initialShooter, stepGame } from '../src/game.js';
import { bubblePosition } from '../src/positions.js';

const boardFor = cells => new Map(cells.map((key, i) => [key, i % 2 ? 'pink' : 'blue']));
const d = (a, b) => Math.hypot(a.x-b.x, a.y-b.y);

for(const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
  test(`sideways single-bond leaf sags BELOW its original row (${layout.columns} columns)`, () => {
    const board = boardFor(['0,3','1,3','2,3','2,2']);
    const plan = planHangingSag(board, {layout});
    const leaf = plan.positions.get('2,2');
    const rest = shooterPosition(2,2,0,layout);
    assert.ok(leaf.y > rest.y + 6, `side leaf must droop, got ${leaf.y - rest.y}px`);
    assert.deepEqual(plan.positions.get('0,3'), shooterPosition(0,3,0,layout),
      'ceiling anchor must never slide');
    assert.equal(board.size, 4, 'sag does not break or delete connections');
    // Every planned hanging connection stays within the original bond length.
    const pivot = plan.positions.get('2,3');
    assert.ok(d(pivot,leaf) <= RADIUS*2 + .01);
    assert.ok(d(pivot,leaf) >= RADIUS*2 - .1);
    // Live game catches up with this sag target, so it is not purely cosmetic.
    const state = initialShooter(() => .4,layout);
    state.board = board;
    state.bombs.clear();
    for (let i=0; i<55; i++) stepAttachedSway(state,.045);
    const live = bubblePosition(state,2,2);
    assert.ok(live.y > rest.y + 4, 'real gameplay physics settles lower');
    assert.deepEqual(shotBubbleCollision(board,live.x,live.y,0,layout,state.attachedPositions),[2,2],
      'collision uses the sagged position');
  });

  test(`braced ceiling cells remain fixed and collision-safe (${layout.columns})`, () => {
    const board = boardFor(['0,3','0,4','1,3','1,4','2,3','2,4']);
    const {positions} = planHangingSag(board, {layout});
    for (const col of [3,4]) assert.deepEqual(positions.get(cellKey(0,col)), shooterPosition(0,col,0,layout));
    for (const [key,p] of positions) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      assert.ok(p.x >= layout.left+RADIUS-.001 && p.x <= layout.width-layout.left-RADIUS+.001);
      for (const [other,q] of positions) {
        if (other === key) continue;
        assert.ok(d(p,q) >= RADIUS*2-2.3, `sag must not overlap ${key} and ${other}`);
      }
    }
  });

  test(`wall-adjacent hangers sag without leaving playfield (${layout.columns})`, () => {
    const board = boardFor(['0,0','1,0','2,0','2,1']);
    const {positions} = planHangingSag(board, {layout});
    for(const p of positions.values()) {
      assert.ok(p.x >= layout.left+RADIUS-.001);
      assert.ok(p.x <= layout.width-layout.left-RADIUS+.001);
    }
  });
}

test('sag is pure and recomputed when matching changes the support graph', () => {
  const state = initialShooter(() => .4);
  state.board = boardFor(['0,3','1,3','2,3','2,2']);
  state.bombs.clear();
  const before = [...state.board];
  const first=planHangingSag(state.board,{layout:state.layout});
  assert.deepEqual([...state.board],before);
  stepGame(state,.045);
  const cache = state.sagCache;
  stepGame(state,.045);
  assert.equal(state.sagCache,cache,'unchanged topology should reuse graph computations');
  state.board.delete('2,2');
  stepGame(state,.045);
  assert.notEqual(state.sagCache,cache,'removing bubbles should change sag targets');
  assert.equal(first.positions.has('2,2'),true);
  assert.equal(state.sagCache.positions.has('2,2'),false);
});
