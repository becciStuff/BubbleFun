// Connected, damped attached-bubble motion for ordinary Arcade and Puzzles.
// Grid topology stays authoritative for matching; the shared attachedPositions
// map is authoritative for rendering, aiming, projectile hits and falling.
import { PITCH, RADIUS } from './config.js';
import { cellKey, shooterNeighbours, shooterPosition } from './grid.js';
import { planHangingSag } from './sag.js';

const RESTORING = 69;        // Pull towards the stable hex grid.
const COUPLING = 18;         // Transmit movement through real connections.
const DAMPING = 10.5;
const MAX_OFFSET = 34;      // Allow visible droop, but cap for fair aiming.
const MAX_DROP = 29;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// A real shot injects an impulse through its surrounding connected bubbles.
// It is deliberately stronger than the old purely visual .5px wobble.
export function kickAttachedSway(state, row, col, vx = 0) {
  if (state.reducedMotion) return;
  state.swayDynamics ??= new Map();
  const origin = shooterPosition(row, col, state.phase, state.layout);
  const direction = Math.abs(vx) > 50 ? Math.sign(vx) : (state.angle < 0 ? -1 : 1);
  for (const key of state.board.keys()) {
    const [r, c] = key.split(',').map(Number);
    if (r === 0) continue;
    const p = shooterPosition(r, c, state.phase, state.layout);
    const distance = Math.hypot(p.x - origin.x, p.y - origin.y);
    const reach = Math.max(0, 1 - distance / (PITCH * 5.5));
    if (reach <= 0) continue;
    const motion = state.swayDynamics.get(key) ?? { x: 0, y: 0, vx: 0, vy: 0 };
    motion.vx = clamp(motion.vx + direction * 115 * reach, -170, 170);
    motion.vy = clamp(motion.vy - 26 * reach, -65, 65);
    state.swayDynamics.set(key, motion);
  }
}

// Explosions should excite the surviving neighbours, not just burst the
// victims. Pulse sources are the ACTUAL live positions of removed bubbles.
export function kickExplosionSway(state, sources, intensity = 1) {
  if (state.reducedMotion || !sources.length) return;
  state.swayDynamics ??= new Map();
  const radius = PITCH * 5.5;
  for (const key of state.board.keys()) {
    const [row, col] = key.split(',').map(Number);
    if (row === 0) continue; // The ceiling is rigid.
    const p = state.attachedPositions?.get(key) ?? shooterPosition(row, col, state.phase, state.layout);
    let pushX = 0, pushY = 0;
    for (const source of sources) {
      const dx = p.x - source.x, dy = p.y - source.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) continue;
      const strength = Math.pow(1 - distance / radius, 1.45) * intensity;
      const directionX = distance > 1 ? dx / distance : (col % 2 ? 1 : -1);
      const directionY = distance > 1 ? dy / distance : -.3;
      pushX += directionX * 190 * strength;
      pushY += (directionY * 80 - 35) * strength;
    }
    if (Math.abs(pushX) + Math.abs(pushY) < .5) continue;
    const motion = state.swayDynamics.get(key) ?? { x: 0, y: 0, vx: 0, vy: 0 };
    motion.vx = clamp(motion.vx + pushX, -230, 230);
    motion.vy = clamp(motion.vy + pushY, -140, 140);
    state.swayDynamics.set(key, motion);
  }
}

export function stepAttachedSway(state, dt) {
  state.attachedPositions ??= new Map();
  state.swayDynamics ??= new Map();
  dt = Math.max(0, Math.min(.045, dt));
  state.swayClock = (state.swayClock ?? 0) + dt;
  if (state.reducedMotion) {
    state.attachedPositions.clear();
    state.swayDynamics.clear();
    return state.attachedPositions;
  }

  // Cache topology-based sag targets; only recompute after a snap, burst or
  // ceiling shift. Oscillation and impacts still advance each tick.
  const signature = state.phase + ':' + state.layout.columns + ':' + [...state.board.keys()].join(';');
  if (state.sagCache?.signature !== signature) {
    state.sagCache = { signature, ...planHangingSag(state.board, { phase: state.phase, layout: state.layout }) };
  }
  const { analysis, positions: sagPose } = state.sagCache;
  const targets = new Map();
  const live = new Map();
  const phaseTime = state.swayClock;
  const blockedByTransition = state.rowShift > .5 || state.introTime > 0;

  for (const region of analysis.regions) {
    const single = region.supportCount === 1;
    const [roofRow, roofCol] = region.anchors[0].split(',').map(Number);
    const pivot = shooterPosition(roofRow, roofCol, state.phase, state.layout);
    const mass = Math.sqrt(region.weight);
    const theta = Math.sin(phaseTime * (1.3 + .3 / Math.max(1, mass)) + roofCol * .57)
      * Math.min(.087, .038 + mass * .008);
    for (const [row, col] of region.cells) {
      const key = cellKey(row, col);
      const base = shooterPosition(row, col, state.phase, state.layout);
      const settled = sagPose.get(key) ?? base;
      let x = settled.x - base.x, y = settled.y - base.y;
      if (single) {
        // A ceiling-rooted pendulum: the more distant bubbles move farther,
        // and rotated positions preserve connections within this component.
        const dx = settled.x - pivot.x, dy = settled.y - pivot.y;
        x += dx * Math.cos(theta) - dy * Math.sin(theta) - dx;
        y += dx * Math.sin(theta) + dy * Math.cos(theta) - dy;
      } else {
        // Dense Arcade boards also react: flexible short links transmit a
        // smaller wave, but the presence of many roof anchors keeps it stable.
        const influence = Math.min(3.1, Math.max(0, row) * .76);
        x += Math.sin(phaseTime * 1.45 + roofCol * .31 + col * .12) * influence;
        y += Math.sin(phaseTime * 1.2 + col * .26) * Math.min(1.4, row * .28);
      }
      targets.set(key, { x, y });
    }
  }

  // Integrate all bubbles from the previous state before publishing positions.
  // This avoids board iteration order affecting the springs.
  const previous = state.swayDynamics;
  const next = new Map();
  for (const key of state.board.keys()) {
    const [row, col] = key.split(',').map(Number);
    const base = shooterPosition(row, col, state.phase, state.layout);
    if (!row || blockedByTransition) {
      live.set(key, base);
      continue;
    }
    const m = previous.get(key) ?? { x: 0, y: 0, vx: 0, vy: 0 };
    const sagged = sagPose.get(key) ?? base;
    const aim = targets.get(key) ?? { x: sagged.x - base.x, y: sagged.y - base.y };
    const connected = shooterNeighbours(state.board, row, col, state.phase, state.layout);
    let nx = 0, ny = 0;
    for (const [r, c] of connected) {
      const neighbor = previous.get(cellKey(r, c));
      nx += neighbor?.x ?? 0;
      ny += neighbor?.y ?? 0;
    }
    const count = Math.max(1, connected.length);
    const ax = RESTORING * (aim.x - m.x) + COUPLING * (nx / count - m.x) - DAMPING * m.vx;
    const ay = RESTORING * (aim.y - m.y) + COUPLING * (ny / count - m.y) - DAMPING * m.vy;
    const vx = (m.vx + ax * dt);
    const vy = (m.vy + ay * dt);
    const x = clamp(m.x + vx * dt, -MAX_OFFSET, MAX_OFFSET);
    const y = clamp(m.y + vy * dt, -MAX_DROP, MAX_DROP);
    const minX = state.layout.left + RADIUS;
    const maxX = state.layout.width - minX;
    live.set(key, { x: clamp(base.x + x, minX, maxX), y: base.y + y });
    next.set(key, { x, y, vx, vy });
  }
  state.swayDynamics = next;
  state.attachedPositions = live;
  return live;
}
