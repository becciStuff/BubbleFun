// Handcrafted shooter puzzles and their grid setup. Keep this module independent
// of game turns, scoring, rendering and the browser.
import { MOBILE_LAYOUT } from './config.js';
import { cellKey } from './grid.js';

const PUZZLE_COLOURS = { P: 'pink', B: 'blue', Y: 'yellow', G: 'green', V: 'purple' };

export const PUZZLES = Object.freeze([
  {
    name: 'Twin Towers', goal: 'Bring down both glowing supports', shots: 16,
    rows: ['..PPPPP..', '..PYYYP..', '..P...P..', '..B...B..', '..B...B..', '..B...B..'],
    bombs: [[3, 2], [3, 6]],
    ammo: ['blue', 'blue', 'pink', 'blue', 'yellow', 'pink', 'blue', 'yellow'],
  },
  {
    name: 'Heartbreaker', goal: 'Find the two weak points', shots: 18,
    rows: ['..PP.PP..', '.PYY.YYP.', '.PYYYYYP.', '..PBBBP..', '...BBB...', '....B....'],
    bombs: [[2, 2], [2, 6]],
    ammo: ['blue', 'yellow', 'pink', 'blue', 'yellow', 'pink', 'yellow', 'blue'],
  },
  {
    name: 'The Crown', goal: 'Destroy the three royal bombs', shots: 20,
    rows: ['P..Y.Y..P', 'PP.YYY.P.', 'PPYYYYYPP', '.PBBBBBP.', '..BBBBB..', '...GGG...', '....G....'],
    bombs: [[2, 1], [2, 4], [2, 7]],
    ammo: ['green', 'blue', 'pink', 'yellow', 'pink', 'blue', 'yellow', 'green'],
  },
]);

// Return new collections for each playthrough. The game module coordinates the
// rest of the shooter state and remains responsible for puzzle victory/loss.
export function createPuzzleBoard(index = 0, layout = MOBILE_LAYOUT) {
  const safeIndex = Math.max(0, Math.min(PUZZLES.length - 1, index));
  const puzzle = PUZZLES[safeIndex];
  const offset = Math.floor((layout.columns - 9) / 2);
  const board = new Map();
  puzzle.rows.forEach((line, row) => {
    Array.from(line).forEach((symbol, col) => {
      if (PUZZLE_COLOURS[symbol]) board.set(cellKey(row, col + offset), PUZZLE_COLOURS[symbol]);
    });
  });
  const bombs = new Set(puzzle.bombs.map(([row, col]) => cellKey(row, col + offset)));
  return { index: safeIndex, puzzle, board, bombs };
}
