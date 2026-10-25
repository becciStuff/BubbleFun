// Archived Bubble Pop mode. Not exposed in the game's menus.
import { LEFT, RADIUS, PITCH, COLOURS } from './config.js';
import { visualState, addBurst, addPulse, addCallout } from './effects.js';
const key = (r,c) => `${r},${c}`;
const randomColour = (colours, random = Math.random) => colours[Math.floor(random() * colours.length)];
function emit(state, type) { state.lastEvent = type; state.event++; }
export function popPosition(row, col) {
  return { x: LEFT + RADIUS + col * PITCH, y: 78 + RADIUS + row * PITCH };
}

export function initialPop(random = Math.random) {
  const board = [];
  for (let row = 0; row < 11; row++) {
    board.push([]);
    for (let col = 0; col < 9; col++) {
      // Four-colour boards make groups plentiful and visually readable.
      board[row].push(randomColour(COLOURS.slice(0, 4), random));
    }
  }
  return { mode: 'pop', board, score: 0, status: 'playing', moves: 0, ...visualState() };
}

export function popGroup(board, row, col) {
  const colour = board[row]?.[col];
  if (!colour) return [];
  const queue = [[row, col]];
  const seen = new Set([key(row, col)]);
  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i];
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (board[nr]?.[nc] !== colour || seen.has(key(nr, nc))) continue;
      seen.add(key(nr, nc));
      queue.push([nr, nc]);
    }
  }
  return queue;
}

export function hasPopMoves(board) {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const colour = board[r][c];
      if (colour && (board[r + 1]?.[c] === colour || board[r]?.[c + 1] === colour)) return true;
    }
  }
  return false;
}

export function collapsePop(board) {
  const rows = board.length;
  const cols = board[0].length;
  const keptColumns = [];
  for (let c = 0; c < cols; c++) {
    const bubbles = [];
    for (let r = rows - 1; r >= 0; r--) if (board[r][c]) bubbles.push(board[r][c]);
    if (bubbles.length) keptColumns.push(bubbles);
  }
  // Bubbles fall down; completely empty columns slide left.
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => keptColumns[c]?.[rows - r - 1] ?? null));
}

export function popAt(state, row, col) {
  if (state.status !== 'playing') return 0;
  const group = popGroup(state.board, row, col);
  if (group.length < 2) return 0;
  for (const [r, c] of group) {
    const { x, y } = popPosition(r, c);
    addBurst(state, x, y, state.board[r][c], 7);
    addPulse(state, x, y, state.board[r][c], .8);
    state.board[r][c] = null;
  }
  state.board = collapsePop(state.board);
  state.score += group.length * group.length * 5;
  state.lastPop = group.length;
  const [firstRow, firstCol] = group[Math.floor(group.length / 2)];
  const point = popPosition(firstRow, firstCol);
  addCallout(state, point.x, point.y, `+${group.length * group.length * 5}`, 'yellow');
  state.shake = Math.max(state.shake, Math.min(.75, group.length * .065));
  state.moves++;
  emit(state, 'pop');
  if (state.board.every(rowValues => rowValues.every(cell => !cell))) {
    state.score += 500;
    state.status = 'won';
    emit(state, 'win');
  } else if (!hasPopMoves(state.board)) {
    state.status = 'finished';
    emit(state, 'finish');
  }
  return group.length;
}

export function popCellAt(x, y) {
  const col = Math.round((x - (LEFT + RADIUS)) / PITCH);
  const row = Math.round((y - (78 + RADIUS)) / PITCH);
  if (row < 0 || row >= 11 || col < 0 || col >= 9) return null;
  const p = popPosition(row, col);
  return Math.hypot(p.x - x, p.y - y) <= RADIUS + 4 ? [row, col] : null;
}
