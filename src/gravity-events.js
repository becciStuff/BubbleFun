// Earned directional gravity and warned environmental disturbances.
// Intentionally separate from spring integration, scoring and rendering.
// Normal gravity remains untouched, and ordinary shifts never break bonds.
import { bubblePosition } from './positions.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const SHIFT_DURATION = 2.4;
const SHIFT_STRENGTH = 325;

export function initialGravityEvents() {
  return {
    charge: 0, instability: 0, warning: null,
    activeDirection: 0, activeSource: null, remaining: 0,
    cooldownShots: 0, lastResolvedShot: 0,
  };
}

export function assessGravityInstability(state) {
  if (!state.board?.size) return 0;
  const start = state.layout.top + 21;
  const bottom = state.layout.launchY - 55;
  const span = Math.max(1, bottom - start);
  let deepest = 0, exposed = 0, total = 0;
  for (const key of state.board.keys()) {
    const [r,c] = key.split(',').map(Number);
    if (r === 0) continue;
    const pos = bubblePosition(state,r,c);
    const depth = clamp((pos.y - start)/span, 0, 1);
    deepest = Math.max(deepest,depth);
    if (depth >= .58) exposed++;
    total++;
  }
  return clamp(Math.round(5 + 66 * deepest * deepest +
    29 * (total ? exposed / total : 0)),0,100);
}

export function awardGravityCharge(state, bubbles, kind = 'pop') {
  const events = state.gravityEvents;
  if (!events || bubbles <= 0) return;
  const perBubble = kind === 'drop' ? 7 : kind === 'bomb' ? 8 : 5;
  events.charge = clamp(events.charge + bubbles * perBubble,0,100);
}

export function canActivateGravityShift(state) {
  const e=state.gravityEvents;
  return !!e && state.status === 'playing' && state.mode === 'shooter' &&
    !state.reducedMotion && e.charge >= 100 && !e.activeDirection &&
    !state.projectile && !state.pendingBombs.length && !state.falling.length &&
    !state.introTime && state.rowShift <= .5;
}

function startShift(state, direction, source) {
  const e=state.gravityEvents;
  e.activeDirection=direction;
  e.activeSource=source;
  e.remaining=SHIFT_DURATION;
  e.warning=null;
  e.cooldownShots=Math.max(e.cooldownShots,3);
}

export function activateGravityShift(state, direction) {
  if (direction !== -1 && direction !== 1 || !canActivateGravityShift(state)) return false;
  state.gravityEvents.charge=0;
  startShift(state,direction,'player');
  return true;
}

// Each *completed* shot is considered once. Instability affects the odds
// but not an ongoing aim: a random direction is announced ONE SHOT in advance.
// No random disturbances in handcrafted puzzles, whose solutions should stay
// deterministic. They still support earned manual shifts.
export function finishGravityTurn(state, random = Math.random) {
  const e=state.gravityEvents;
  if (!e || state.mode !== 'shooter' || state.status !== 'playing' ||
    state.projectile || state.pendingBombs.length || state.falling.length ||
    state.pendingRow || state.rowShift > .5 || state.introTime > 0 ||
    e.lastResolvedShot >= state.shots) return null;
  e.lastResolvedShot=state.shots;
  e.instability=assessGravityInstability(state);
  if (e.warning && state.shots > e.warning.afterShot) {
    const direction=e.warning.direction;
    startShift(state,direction,'environment');
    return 'disturbance';
  }
  if (e.cooldownShots > 0) { e.cooldownShots--; return null; }
  if (state.variant !== 'arcade' || state.reducedMotion || e.activeDirection ||
    e.warning || state.shots < 3) return null;
  const chance=.035 + e.instability * .0035;
  if (random() < chance) {
    e.warning={ direction:random() < .5 ? -1 : 1, afterShot:state.shots };
    return 'warning';
  }
  return null;
}

export function advanceGravityShift(state, dt) {
  const e=state.gravityEvents;
  if (!e) return;
  if (!e.activeDirection) return;
  e.remaining=Math.max(0,e.remaining - Math.max(0,dt));
  if (e.remaining === 0) {
    e.activeDirection=0;
    e.activeSource=null;
  }
}

export function gravityShiftPull(state) {
  const e=state.gravityEvents;
  if (!e?.activeDirection || state.reducedMotion) return 0;
  const elapsed=SHIFT_DURATION-e.remaining;
  const envelope=clamp(Math.min(elapsed/.3,e.remaining/.45),0,1);
  return e.activeDirection * SHIFT_STRENGTH * envelope;
}
