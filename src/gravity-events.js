// Rare host-bubble surprises and earned, SELECTABLE Gravity Orb shots.
// Inactive between events: the existing spring/downward-gravity game stays
// unchanged. No periodic rolls, charge bars or permanent gravity controls.
export const EVENT_DURATION = 3.2;
export const HOST_CHANCE = .007; // 0.7% per eligible bubble at spawn.
export const ORB_MATCH_THRESHOLD = 6;
const SIDE_FORCE = 600;
const HEAVY_FORCE = 850;
const clamp = (x,a,b) => Math.min(b,Math.max(a,x));

export function initialGravityEvents() {
  return { hosts:new Set(), orbs:0, armed:0, kind:null,
    source:null, remaining:0, lastEvent:null };
}

export function maybePlaceGravityHost(state, key, random=Math.random) {
  const e=state.gravityEvents;
  // At most one rare host is on the board, never in existing
  // handcrafted Puzzles or on top of an ordinary marked bomb.
  if (!e || state.variant !== 'arcade' || e.hosts.size ||
      !state.board.has(key) || state.bombs.has(key)) return false;
  if (random() <= 1-HOST_CHANCE) return false;
  e.hosts.add(key);
  return true;
}

export function earnGravityOrb(state, groupSize) {
  if (groupSize < ORB_MATCH_THRESHOLD || !state.gravityEvents) return false;
  const e=state.gravityEvents;
  if (e.orbs >= 1) return false;
  e.orbs=1; // One held special; prevent farming an inventory.
  return true;
}

export function canArmGravityOrb(state) {
  const e=state.gravityEvents;
  return !!e && !!e.orbs && state.mode==='shooter' &&
    state.status==='playing' && !state.reducedMotion &&
    !e.kind && !state.projectile && !state.pendingBombs.length &&
    !state.falling.length && state.rowShift <= .5 &&
    !state.introTime;
}

// Select an earned SPECIAL for the next fired bubble. It remains the
// player's ordinary colour/ammo and uses the regular aiming/impact rules.
export function armGravityOrb(state, direction) {
  if (direction!==-1 && direction!==1) return false;
  if (!canArmGravityOrb(state)) return false;
  state.gravityEvents.armed=direction;
  return true;
}

export function takeArmedGravityOrb(state) {
  const e=state.gravityEvents;
  if (!e?.armed || !e.orbs) return 0;
  const direction=e.armed;
  e.orbs--;
  e.armed=0;
  return direction;
}

export function triggerGravityEvent(state, source='host', random=Math.random, direction=0) {
  const e=state.gravityEvents;
  if (!e || state.status!=='playing' || state.reducedMotion) return false;
  const type=direction===-1?'left':direction===1?'right':
    (random()<1/3?'left':random()<.5?'right':'heavy');
  e.kind=type; e.source=source; e.remaining=EVENT_DURATION;
  e.lastEvent=type;
  return type;
}

export function popGravityHost(state, key, random=Math.random) {
  if (!state.gravityEvents?.hosts.delete(key)) return null;
  return triggerGravityEvent(state,'host',random);
}

export function advanceGravityEvent(state, dt) {
  const e=state.gravityEvents;
  if (!e?.kind) return;
  e.remaining=Math.max(0,e.remaining-Math.max(0,dt));
  if (e.remaining===0) {e.kind=null;e.source=null;}
}

export function gravityEventForces(state) {
  const e=state.gravityEvents;
  if (!e?.kind || state.reducedMotion) return {ax:0,ay:0};
  const since=EVENT_DURATION-e.remaining;
  const envelope=clamp(Math.min(since/.38,e.remaining/.5),0,1);
  return {
    ax: e.kind==='left' ? -SIDE_FORCE*envelope :
      e.kind==='right' ? SIDE_FORCE*envelope : 0,
    ay: e.kind==='heavy' ? HEAVY_FORCE*envelope : 0,
  };
}

export function gravityEventLabel(state) {
  switch(state.gravityEvents?.kind) {
    case 'left': return 'GRAVITY SHIFT ←';
    case 'right': return 'GRAVITY SHIFT →';
    case 'heavy': return 'HEAVY GRAVITY ↓';
    default: return '';
  }
}
