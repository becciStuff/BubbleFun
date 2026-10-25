// Hexagonal shooter-grid geometry and connectivity; independent of game state,
// gravity, scoring, rendering and the browser.
import { MOBILE_LAYOUT, RADIUS, PITCH, ROW_HEIGHT, SHOT_HIT_DISTANCE } from './config.js';

const CLUSTER_THRESHOLD = 2 * RADIUS + 1.2;
export const cellKey = (row, col) => `${row},${col}`;

export function shooterColumns(row, phase = 0, layout = MOBILE_LAYOUT) {
  return (row + phase) % 2 === 0 ? layout.columns : layout.columns - 1;
}

export function shooterPosition(row, col, phase = 0, layout = MOBILE_LAYOUT) {
  return {
    x: layout.left + RADIUS + col * PITCH + (((row + phase) % 2) ? RADIUS : 0),
    y: layout.top + RADIUS + row * ROW_HEIGHT,
  };
}

export function shooterNeighbours(board, row, col, phase = 0, layout = MOBILE_LAYOUT) {
  const origin = shooterPosition(row, col, phase, layout);
  const nearby = [];
  for (let r = Math.max(0, row - 1); r <= row + 1; r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(shooterColumns(r, phase, layout) - 1, col + 1); c++) {
      if (r === row && c === col) continue;
      if (!board.has(cellKey(r, c))) continue;
      const p = shooterPosition(r, c, phase, layout);
      if (Math.hypot(origin.x - p.x, origin.y - p.y) <= CLUSTER_THRESHOLD) nearby.push([r, c]);
    }
  }
  return nearby;
}

export function connectedShooter(board, row, col, phase = 0, colourOnly = true, layout = MOBILE_LAYOUT) {
  const original = board.get(cellKey(row, col));
  if (!original) return [];
  const found = new Set([cellKey(row, col)]);
  const queue = [[row, col]];
  for (let i = 0; i < queue.length; i++) {
    for (const [nr, nc] of shooterNeighbours(board, ...queue[i], phase, layout)) {
      const k = cellKey(nr, nc);
      if (found.has(k) || (colourOnly && board.get(k) !== original)) continue;
      found.add(k);
      queue.push([nr, nc]);
    }
  }
  return queue;
}

// A bubble is attached if any colour-connected path reaches the top row.
export function floatingShooter(board, phase = 0, layout = MOBILE_LAYOUT) {
  const connected = new Set();
  for (let col = 0; col < shooterColumns(0, phase, layout); col++) {
    const start = cellKey(0, col);
    if (!board.has(start) || connected.has(start)) continue;
    for (const [r, c] of connectedShooter(board, 0, col, phase, false, layout)) connected.add(cellKey(r, c));
  }
  return Array.from(board.keys()).filter(k => !connected.has(k)).map(k => k.split(',').map(Number));
}

// Shared predicate for the actual projectile and the trajectory guide.
// Returns the first occupied cell reached, or null if this point is clear.
export function shotBubbleCollision(board, x, y, phase = 0, layout = MOBILE_LAYOUT) {
  for (const [k] of board) {
    const [row, col] = k.split(',').map(Number);
    const p = shooterPosition(row, col, phase, layout);
    if (Math.hypot(x - p.x, y - p.y) < SHOT_HIT_DISTANCE) return [row, col];
  }
  return null;
}
