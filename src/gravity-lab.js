// A small deterministic diagnostic board for demonstrating support physics.
// No game state, DOM or rendering here: just a shaped Map of cells.
import { MOBILE_LAYOUT } from './config.js';
import { shooterColumns, cellKey } from './grid.js';

const LEFT_CHAIN = [
  [0, 1, 'pink'], [1, 1, 'blue'], [2, 1, 'yellow'], [3, 1, 'green'],
];
const RIGHT_BRACE = [
  [0, 5, 'pink'], [0, 6, 'blue'],
  [1, 5, 'yellow'], [1, 6, 'green'],
  [2, 5, 'purple'], [2, 6, 'pink'],
];

// Both structures fit the narrowest 9/8 board and retain the same support
// relationships on desktop. The left chain has one ceiling anchor; the
// right structure has two genuinely independent ceiling anchors.
export function createGravityLabBoard(layout = MOBILE_LAYOUT) {
  const board = new Map();
  for (const [row, col, colour] of [...LEFT_CHAIN, ...RIGHT_BRACE]) {
    if (col >= shooterColumns(row, 0, layout)) {
      throw new RangeError('Gravity Lab board does not fit the chosen layout');
    }
    board.set(cellKey(row, col), colour);
  }
  return board;
}
