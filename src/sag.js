// Pure, bounded static sag. A weak, side-hung bridge is allowed to pivot
// DOWNWARD around its existing attachment. Normal gravity never cuts bonds.
// Rejection checks keep transformed bubbles away from walls and other cells.
import { MOBILE_LAYOUT, RADIUS } from './config.js';
import { shooterPosition, cellKey } from './grid.js';
import { analyseSupports } from './supports.js';

const MIN_SEPARATION = RADIUS * 2 - 2.2;
const MAX_SHIFT = 29;
const STEP_ATTEMPTS = 11;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function rotated(source, pivot, angle) {
  const dx = source.x - pivot.x, dy = source.y - pivot.y;
  return {
    x: pivot.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: pivot.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

// Returns a rest target for every existing bubble, plus the original graph
// analysis. Ordering matters: root-facing bridges pivot before their children.
// No state is mutated; the same geometry can be used in tests and game.
export function planHangingSag(board, { phase = 0, layout = MOBILE_LAYOUT } = {}) {
  const analysis = analyseSupports(board, { phase, layout });
  const rest = new Map();
  const positions = new Map();
  for (const key of board.keys()) {
    const [r, c] = key.split(',').map(Number);
    const p = shooterPosition(r, c, phase, layout);
    rest.set(key, p);
    positions.set(key, p);
  }

  for (const bridge of analysis.bridges) {
    const keys = bridge.cells.map(([r,c]) => cellKey(r,c));
    const moved = new Set(keys);
    const pivot = positions.get(bridge.from);
    if (!pivot || !keys.length) continue;
    let weightedX = 0, weightedY = 0;
    for (const key of keys) {
      const p = positions.get(key);
      weightedX += p.x - pivot.x;
      weightedY += p.y - pivot.y;
    }
    const leanX = weightedX / keys.length;
    const leanY = weightedY / keys.length;
    // Right-hung masses rotate clockwise (+ angle); left-hung ones rotate
    // anticlockwise. Already vertical hangers don't drift arbitrarily.
    const slope = Math.atan2(leanX, Math.max(0, leanY));
    if (Math.abs(slope) < .045) continue;
    const intended = Math.sign(slope) *
      Math.min(.58, Math.abs(slope) * .65 + .085 + Math.min(.07, Math.sqrt(keys.length) * .013));

    // Turn the WHOLE hanging subtree together, conserving all lengths within
    // that subtree (as opposed to moving each sprite down independently).
    // If it would overlap another bubble or leave the playable board, reduce
    // its angle. This keeps narrow levels and edge formations fair.
    let angle = intended;
    for (let attempt = 0; attempt < STEP_ATTEMPTS; attempt++, angle *= .5) {
      const proposed = new Map(keys.map(key => [key, rotated(positions.get(key), pivot, angle)]));
      let valid = true;
      for (const [key, p] of proposed) {
        const initial = rest.get(key);
        if (distance(initial, p) > MAX_SHIFT ||
            p.x < layout.left + RADIUS || p.x > layout.width - layout.left - RADIUS ||
            p.y < layout.top + RADIUS || p.y > layout.launchY - RADIUS * 2) {
          valid = false;
          break;
        }
        for (const [otherKey, other] of positions) {
          if (moved.has(otherKey)) continue;
          if (distance(p, other) < MIN_SEPARATION) { valid = false; break; }
        }
        if (!valid) break;
      }
      if (!valid) continue;
      for (const [key, p] of proposed) positions.set(key, p);
      break;
    }
  }

  return { positions, analysis };
}
