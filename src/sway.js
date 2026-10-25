// Constrained, damped sway for attached bubbles. This is a position-only
// simulation: ordinary gravity NEVER severs still-supported connections.
// The lattice remains authoritative for matching and snapping a fired shot.
import { PITCH } from './config.js';
import { cellKey, shooterPosition } from './grid.js';
import { analyseSupports } from './supports.js';

const MAX_KICK = 1.0;
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

export function kickAttachedSway(state, row, col) {
  if (state.reducedMotion || state.variant === 'lab') return;
  state.swayKicks ??= new Map();
  const impact = shooterPosition(row, col, state.phase, state.layout);
  for (const key of state.board.keys()) {
    const [r, c] = key.split(',').map(Number);
    if (!r) continue; // Ceiling bubbles are fixed anchors.
    const p = shooterPosition(r, c, state.phase, state.layout);
    const distance = Math.hypot(p.x - impact.x, p.y - impact.y);
    if (distance > PITCH * 5) continue;
    const next = clamp(1 - distance / (PITCH * 5), 0, MAX_KICK);
    state.swayKicks.set(key, Math.max(state.swayKicks.get(key) ?? 0, next));
  }
}

export function stepAttachedSway(state, dt) {
  state.attachedPositions ??= new Map();
  state.swayKicks ??= new Map();
  state.swayClock = (state.swayClock ?? 0) + Math.max(0, dt);
  // The Lab deliberately stays fixed so its support labels are exact.
  if (state.reducedMotion || state.variant === 'lab') {
    state.attachedPositions.clear();
    state.swayKicks.clear();
    return state.attachedPositions;
  }
  const analysis = analyseSupports(state.board, { phase: state.phase, layout: state.layout });
  const next = new Map();
  const t = state.swayClock;
  // Each connected region moves as a gentle, anchored hanging structure.
  // Independently braced regions are much steadier than single-anchor ones.
  for (const region of analysis.regions) {
    const single = region.supportCount === 1;
    const amplitude = single
      ? Math.min(6.8, 2.3 + Math.sqrt(region.weight) * .75)
      : Math.min(1.1, .45 + Math.sqrt(region.weight) * .065 / Math.sqrt(region.supportCount));
    const [anchorRow, anchorCol] = region.anchors[0].split(',').map(Number);
    const phase = anchorCol * .73 + anchorRow * .27;
    const speed = single ? 1.65 : 1.12;
    const swing = Math.sin(t * speed + phase);
    const lift = (1 - Math.cos(t * speed + phase)) * .18;
    for (const [row, col] of region.cells) {
      const key = cellKey(row, col);
      const base = shooterPosition(row, col, state.phase, state.layout);
      const reach = Math.min(1.35, .22 + row * .18);
      const kick = state.swayKicks.get(key) ?? 0;
      const ripple = Math.sin(t * 15 + phase + row * .45) * kick * 4;
      next.set(key, {
        x: base.x + clamp(swing * amplitude * reach + ripple, -9, 9),
        y: base.y - lift * amplitude * reach + kick * Math.cos(t * 13 + phase) * .55,
      });
    }
  }
  // Ceiling bubbles and disconnected cells have their exact lattice position.
  // This also ensures the map contains only cells that still exist.
  for (const key of state.board.keys()) {
    if (next.has(key)) continue;
    const [row, col] = key.split(',').map(Number);
    next.set(key, shooterPosition(row, col, state.phase, state.layout));
  }
  state.attachedPositions = next;
  // Frame-rate-independent damping; old keys vanish when their bubble pops.
  for (const [key, amount] of state.swayKicks) {
    if (!state.board.has(key)) { state.swayKicks.delete(key); continue; }
    const damped = amount * Math.exp(-dt * 3.2);
    if (damped < .005) state.swayKicks.delete(key);
    else state.swayKicks.set(key, damped);
  }
  return next;
}
