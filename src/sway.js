// Connected attached-bubble motion. Ceiling anchors never move; attached
// structures NEVER tear free from weight in Normal Gravity. Keep all geometry
// in the single attachedPositions map shared by visuals and hit detection.
import { PITCH } from './config.js';
import { cellKey, shooterPosition } from './grid.js';
import { analyseSupports } from './supports.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// A nudge is deliberately available only on the deterministic test board.
// The impulse drives a damped pendulum; Surge remains a separate action.
export function nudgeLabPendulum(state) {
  if (state.variant !== 'lab' || state.gravityLabUsed ||
      state.status !== 'playing' || state.falling.length || state.projectile) return false;
  // An explicit button click opts into Lab motion even when the OS preference
  // is reduced motion. Only this Lab state is overridden, never other modes.
  state.labMotionEnabled = true;
  // Begin slightly into the push so the very next rendered frame visibly moves.
  state.labSwingAt = (state.swayClock ?? 0) - .14;
  stepAttachedSway(state, 0);
  return true;
}

export function labSwingDisplacement(state) {
  if (state.variant !== 'lab') return 0;
  const tip = state.attachedPositions?.get('7,3');
  if (!tip) return 0;
  const rest = shooterPosition(7, 3, state.phase, state.layout);
  return Math.round(Math.hypot(tip.x - rest.x, tip.y - rest.y));
}

export function kickAttachedSway(state, row, col) {
  if (state.reducedMotion || state.variant === 'lab') return;
  state.swayKicks ??= new Map();
  const impact = shooterPosition(row, col, state.phase, state.layout);
  for (const key of state.board.keys()) {
    const [r, c] = key.split(',').map(Number);
    if (!r) continue; // Only anchored descendants can move.
    const p = shooterPosition(r, c, state.phase, state.layout);
    const distance = Math.hypot(p.x - impact.x, p.y - impact.y);
    if (distance > PITCH * 5) continue;
    const next = clamp(1 - distance / (PITCH * 5), 0, 1);
    state.swayKicks.set(key, Math.max(state.swayKicks.get(key) ?? 0, next));
  }
}

export function stepAttachedSway(state, dt) {
  state.attachedPositions ??= new Map();
  state.swayKicks ??= new Map();
  dt = Math.max(0, dt);
  state.swayClock = (state.swayClock ?? 0) + dt;
  if (state.reducedMotion && !(state.variant === 'lab' && state.labMotionEnabled)) {
    state.attachedPositions.clear();
    state.swayKicks.clear();
    return state.attachedPositions;
  }

  const next = new Map();
  const t = state.swayClock;
  const lab = state.variant === 'lab';
  const analysis = analyseSupports(state.board, { phase: state.phase, layout: state.layout });

  for (const region of analysis.regions) {
    const single = region.supportCount === 1;
    const [anchorRow, anchorCol] = region.anchors[0].split(',').map(Number);
    const anchor = shooterPosition(anchorRow, anchorCol, state.phase, state.layout);
    const phase = anchorCol * .73 + anchorRow * .27;

    // A rigid-body pendulum preserves the actual distance between attached
    // bubbles. A long dangling branch swings farther at its tip. Regions
    // anchored at two distinct roof cells are kept almost stationary.
    let angle = 0;
    if (single) {
      angle = (lab ? .065 : .046) * Math.sin(t * 1.55 + phase);
      if (lab && state.labSwingAt != null) {
        const elapsed = Math.max(0, t - state.labSwingAt);
        angle += .27 * Math.exp(-.55 * elapsed) * Math.sin(elapsed * 3.1);
      }
    }

    for (const [row, col] of region.cells) {
      const key = cellKey(row, col);
      const base = shooterPosition(row, col, state.phase, state.layout);
      const kick = state.swayKicks.get(key) ?? 0;
      const ripple = Math.sin(t * 15 + phase + row * .45) * kick * 3;
      if (single) {
        const dx = base.x - anchor.x;
        const dy = base.y - anchor.y;
        next.set(key, {
          x: anchor.x + dx * Math.cos(angle) - dy * Math.sin(angle) + ripple,
          y: anchor.y + dx * Math.sin(angle) + dy * Math.cos(angle),
        });
      } else {
        const motion = lab ? 0 : Math.sin(t * 1.15 + phase) * .55;
        next.set(key, { x: base.x + motion + ripple, y: base.y });
      }
    }
  }

  for (const key of state.board.keys()) {
    if (next.has(key)) continue;
    const [row, col] = key.split(',').map(Number);
    next.set(key, shooterPosition(row, col, state.phase, state.layout));
  }
  state.attachedPositions = next;
  for (const [key, amount] of state.swayKicks) {
    if (!state.board.has(key)) { state.swayKicks.delete(key); continue; }
    const damped = amount * Math.exp(-dt * 3.2);
    if (damped < .005) state.swayKicks.delete(key);
    else state.swayKicks.set(key, damped);
  }
  return next;
}
