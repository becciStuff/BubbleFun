import test from 'node:test';
import assert from 'node:assert/strict';
import { COLOURS, MOBILE_LAYOUT, DESKTOP_LAYOUT } from '../src/config.js';
import { shooterColumns, shooterPosition } from '../src/grid.js';
import { PUZZLES, createPuzzleBoard } from '../src/puzzles.js';
import {
  PUZZLES as legacyPuzzles, initialPuzzle, aimShooter, fireShooter, stepGame,
} from '../src/game.js';

test('puzzle metadata remains available through the old game import', () => {
  assert.equal(legacyPuzzles, PUZZLES);
  assert.deepEqual(PUZZLES.map(p => p.name), ['Twin Towers', 'Heartbreaker', 'The Crown']);
  assert.deepEqual(PUZZLES.map(p => p.shots), [16, 18, 20]);
});

test('puzzle setup reproduces every authored bubble and bomb on both layouts', () => {
  const legend = { P: 'pink', B: 'blue', Y: 'yellow', G: 'green', V: 'purple' };
  for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
    const offset = Math.floor((layout.columns - 9) / 2);
    for (let index = 0; index < PUZZLES.length; index++) {
      const { puzzle, board, bombs, index: actualIndex } = createPuzzleBoard(index, layout);
      assert.equal(actualIndex, index);
      assert.equal(puzzle, PUZZLES[index]);
      const expected = new Map();
      puzzle.rows.forEach((line, row) => {
        for (const [col, symbol] of Array.from(line).entries()) {
          if (legend[symbol]) expected.set(`${row},${col + offset}`, legend[symbol]);
        }
      });
      assert.deepEqual(board, expected);
      assert.deepEqual(bombs, new Set(puzzle.bombs.map(([r,c]) => `${r},${c + offset}`)));
      for (const [k, colour] of board) {
        const [r, c] = k.split(',').map(Number);
        assert.ok(c >= 0 && c < shooterColumns(r, 0, layout), `out of bounds: ${k}`);
        assert.ok(COLOURS.includes(colour), `unknown colour: ${colour}`);
      }
      for (const k of bombs) assert.ok(board.has(k), `bomb ${k} needs a bubble`);
      for (const colour of puzzle.ammo) assert.ok(COLOURS.includes(colour));
    }
  }
});

test('puzzle boards and bomb sets are fresh per playthrough', () => {
  const first = createPuzzleBoard(0);
  const second = createPuzzleBoard(0);
  first.board.clear();
  first.bombs.clear();
  assert.ok(second.board.size > 0);
  assert.equal(second.bombs.size, 2);
});

test('out-of-range puzzle selections retain the original clamping behaviour', () => {
  assert.equal(createPuzzleBoard(-5).index, 0);
  assert.equal(createPuzzleBoard(999).index, PUZZLES.length - 1);
});

test('every known puzzle solution still works on mobile and desktop boards', () => {
  const solutions = [
    [[5,2], [5,6]],
    [[5,4], [2,4]],
    [[6,4], [4,4], [2,1], [2,4], [2,7]],
  ];
  for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
    const offset = Math.floor((layout.columns - 9) / 2);
    for (let index = 0; index < PUZZLES.length; index++) {
      const state = initialPuzzle(index, layout, () => .2);
      for (let i = 0; i < 50; i++) stepGame(state, .02);
      assert.equal(state.status, 'playing',
        'a puzzle must not auto-complete before the player has made a shot');
      for (const [row, col] of solutions[index]) {
        // Gravity-driven contacts may earn a legitimate early victory.
        // Never fire another shot once all puzzle targets are gone.
        if (state.status === 'won') break;
        const p = shooterPosition(row, col + offset, 0, layout);
        aimShooter(state, p.x, p.y);
        assert.equal(fireShooter(state), true, `Puzzle ${index} ${layout.columns} cols before shot ${row},${col}: status=${state.status} shots=${state.shots} bombs=${state.bombs.size} falling=${state.falling.length}`);
        for (let i = 0; i < 230; i++) stepGame(state, .02);
      }
      assert.equal(state.status, 'won', `${state.puzzleName} must remain solvable on ${layout.columns}-column boards`);
      assert.equal(state.bombs.size, 0);
      assert.ok(state.shots > 0 && state.shots <= solutions[index].length,
        'physics can shorten, but must not invalidate, a known solution');
      assert.ok(state.shots <= state.shotLimit);
    }
  }
});
