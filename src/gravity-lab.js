// A deterministic physics demonstration: one long swinging pendulum suspended
// from a SINGLE ceiling bubble, alongside a structure with TWO independent
// ceiling anchors. Shared on desktop and mobile. No UI or physics in this file.
import { MOBILE_LAYOUT } from './config.js';
import { shooterColumns, cellKey } from './grid.js';

const HANGING_PENDULUM = [
  [0, 2, 'pink'], // Fixed ceiling anchor (the pivot).
  [1, 2, 'blue'], [2, 2, 'yellow'], [3, 2, 'green'],
  [4, 2, 'purple'], [5, 2, 'blue'],
  [6, 2, 'yellow'], [6, 3, 'pink'],
  [7, 2, 'green'], [7, 3, 'purple'], // Wider weighted-looking tip.
];
const BRACED_STRUCTURE = [
  [0, 5, 'pink'], [0, 6, 'blue'],
  [1, 5, 'yellow'], [1, 6, 'green'],
  [2, 5, 'purple'], [2, 6, 'pink'],
];

export function createGravityLabBoard(layout = MOBILE_LAYOUT) {
  const board = new Map();
  for (const [row, col, colour] of [...HANGING_PENDULUM, ...BRACED_STRUCTURE]) {
    if (col >= shooterColumns(row, 0, layout)) {
      throw new RangeError('Gravity Lab board does not fit the chosen layout');
    }
    board.set(cellKey(row, col), colour);
  }
  return board;
}
