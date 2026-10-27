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

export function shooterNeighbours(board, row, col, phase = 0, layout = MOBILE_LAYOUT, extraBonds = null) {
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
  // Added when two already-attached bubbles physically touch during a swing.
  // These are real mechanical links, not just lines drawn on the canvas.
  if (extraBonds?.size) {
    const from = cellKey(row,col);
    const included = new Set(nearby.map(([r,c]) => cellKey(r,c)));
    for (const bond of extraBonds) {
      const [a,b] = bond.split('|');
      const opposite = a===from ? b : b===from ? a : null;
      if (opposite && board.has(opposite) && !included.has(opposite)) {
        nearby.push(opposite.split(',').map(Number));
        included.add(opposite);
      }
    }
  }
  return nearby;
}

export function connectedShooter(board, row, col, phase = 0, colourOnly = true, layout = MOBILE_LAYOUT, extraBonds = null) {
  const original = board.get(cellKey(row, col));
  if (!original) return [];
  const found = new Set([cellKey(row, col)]);
  const queue = [[row, col]];
  for (let i = 0; i < queue.length; i++) {
    for (const [nr, nc] of shooterNeighbours(board, ...queue[i], phase, layout, extraBonds)) {
      const k = cellKey(nr, nc);
      if (found.has(k) || (colourOnly && board.get(k) !== original)) continue;
      found.add(k);
      queue.push([nr, nc]);
    }
  }
  return queue;
}

// A bubble is attached if any colour-connected path reaches the top row.
export function floatingShooter(board, phase = 0, layout = MOBILE_LAYOUT, extraBonds = null) {
  const connected = new Set();
  for (let col = 0; col < shooterColumns(0, phase, layout); col++) {
    const start = cellKey(0, col);
    if (!board.has(start) || connected.has(start)) continue;
    for (const [r, c] of connectedShooter(board, 0, col, phase, false, layout, extraBonds)) connected.add(cellKey(r, c));
  }
  return Array.from(board.keys()).filter(k => !connected.has(k)).map(k => k.split(',').map(Number));
}

// Shared predicate for the actual projectile and trajectory guide. If moving,
// use their SAME live positions supplied by the attached-bubble sway engine.
// Returns the first occupied cell reached, or null if this point is clear.
export function shotBubbleCollision(board, x, y, phase = 0, layout = MOBILE_LAYOUT, positions = null) {
  for (const [k] of board) {
    const [row, col] = k.split(',').map(Number);
    const p = positions?.get(k) ?? shooterPosition(row, col, phase, layout);
    if (Math.hypot(x - p.x, y - p.y) < SHOT_HIT_DISTANCE) return [row, col];
  }
  return null;
}
