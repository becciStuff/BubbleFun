// Actual gravity + spring dynamics for ceiling-attached bubbles.
// No looping sine wave or animation-only positions. Forces move physical
// bubble centres and the SAME centres are used for drawing and shooting.
import { RADIUS, PITCH } from './config.js';
import { shooterPosition } from './grid.js';
import { bondEdges, cleanExtraBonds, resolveContacts } from './physical-bonds.js';

const GRAVITY = 395;           // Downward force, in pixels/s².
const SPRING = 170;            // Adhesive bubble-to-bubble bond stiffness.
const DAMPING = 3.0;           // Velocity loss / s; permits visible recoil.
const HOME = 1.1;              // Very weak horizontal centring for gameplay.
const MAX_SPEED = 480;
const MAX_OFFSET_X = 150;
const MAX_OFFSET_Y = 145;
const clamp = (n, low, high) => Math.max(low,Math.min(high,n));

function motionFor(state, key) {
  state.swayDynamics ??= new Map();
  if (!state.swayDynamics.has(key)) state.swayDynamics.set(key, { x:0, y:0, vx:0, vy:0 });
  return state.swayDynamics.get(key);
}

// A landing shot produces a LOCAL physical impulse; connection springs move
// its energy into the rest of the structure naturally.
export function kickAttachedSway(state, row, col, shotVx = 0) {
  if (state.reducedMotion) return;
  const source = shooterPosition(row,col,state.phase,state.layout);
  const direction = Math.abs(shotVx) > 30 ? Math.sign(shotVx) : (state.angle < 0 ? -1 : 1);
  for (const key of state.board.keys()) {
    const [r,c] = key.split(',').map(Number);
    if (!r) continue;
    const p = state.attachedPositions?.get(key) ?? shooterPosition(r,c,state.phase,state.layout);
    const distance = Math.hypot(p.x-source.x,p.y-source.y);
    const weight = Math.max(0, 1-distance/(PITCH*3.3));
    if (!weight) continue;
    const m = motionFor(state,key);
    m.vx = clamp(m.vx + direction*190*weight,-MAX_SPEED,MAX_SPEED);
    m.vy = clamp(m.vy - 145*weight,-MAX_SPEED,MAX_SPEED);
  }
}

// A popped cluster or bomb drives nearby *survivors*, so the graph and
// collision system — not merely the canvas — visibly responds.
export function kickExplosionSway(state, sources, intensity = 1) {
  if (state.reducedMotion || !sources.length) return;
  const reach = PITCH * 5.8;
  for (const key of state.board.keys()) {
    const [r,c] = key.split(',').map(Number);
    if (!r) continue; // Ceiling fixed even during a huge explosion.
    const p = state.attachedPositions?.get(key) ?? shooterPosition(r,c,state.phase,state.layout);
    let vx = 0, vy = 0;
    for (const source of sources) {
      const dx = p.x-source.x, dy = p.y-source.y;
      const distance = Math.hypot(dx,dy);
      if (distance >= reach) continue;
      const strength = Math.pow(1-distance/reach,1.1)*intensity;
      const nx = distance > .5 ? dx/distance : (c%2 ? 1 : -1);
      const ny = distance > .5 ? dy/distance : -.4;
      vx += nx*380*strength;
      vy += (ny*350-50)*strength;
    }
    if (Math.abs(vx)+Math.abs(vy) < 1) continue;
    const m = motionFor(state,key);
    m.vx = clamp(m.vx+vx,-MAX_SPEED,MAX_SPEED);
    m.vy = clamp(m.vy+vy,-MAX_SPEED,MAX_SPEED);
  }
}

export function stepAttachedSway(state, dt) {
  state.attachedPositions ??= new Map();
  state.swayDynamics ??= new Map();
  state.extraBonds ??= new Set();
  state.newContactBonds ??= new Set();
  dt = clamp(dt,0,.045);
  state.swayClock = (state.swayClock ?? 0)+dt;
  if (state.reducedMotion) {
    state.attachedPositions.clear();
    state.swayDynamics.clear();
    state.extraBonds.clear();
    state.newContactBonds.clear();
    return state.attachedPositions;
  }
  // The entrance / descending-row visuals have their own interpolation.
  // Restart physics when those board transforms end.
  if (state.introTime > 0 || state.rowShift > .5) {
    state.attachedPositions.clear();
    state.swayDynamics.clear();
    return state.attachedPositions;
  }

  cleanExtraBonds(state.board,state.extraBonds);
  const keys = [...state.board.keys()];
  const rest = new Map(keys.map(key => {
    const [r,c] = key.split(',').map(Number);
    return [key,shooterPosition(r,c,state.phase,state.layout)];
  }));
  const old = state.swayDynamics;
  const bodies = new Map(keys.map(key => {
    const r = +key.split(',')[0], base = rest.get(key);
    const m = old.get(key) ?? {x:0,y:0,vx:0,vy:0};
    return [key,{
      x:r ? clamp(base.x+m.x,state.layout.left+RADIUS,state.layout.width-state.layout.left-RADIUS) : base.x,
      y:r ? base.y+m.y : base.y,
      vx:r ? m.vx : 0, vy:r ? m.vy : 0, fixed:r===0,
    }];
  }));

  const count = Math.max(1,Math.ceil(dt/.009));
  const tick = dt/count;
  const floor = state.layout.launchY-RADIUS*1.65;
  const left = state.layout.left+RADIUS, right = state.layout.width-left;
  for (let step=0; step<count; step++) {
    const edges = bondEdges(state.board,state.phase,state.layout,state.extraBonds);
    const forces = new Map(keys.map(key => [key,{ax:0,ay:0}]));
    for (const key of keys) {
      const body = bodies.get(key), f = forces.get(key);
      if (body.fixed) continue;
      f.ay += GRAVITY;
      f.ax -= HOME*(body.x-rest.get(key).x);
    }
    for (const [a,b] of edges) {
      const pa = bodies.get(a), pb = bodies.get(b);
      const dx = pb.x-pa.x, dy=pb.y-pa.y;
      const distance = Math.max(.01,Math.hypot(dx,dy));
      const impulse = SPRING*(distance-PITCH)/distance;
      if (!pa.fixed) {
        forces.get(a).ax += impulse*dx;
        forces.get(a).ay += impulse*dy;
      }
      if (!pb.fixed) {
        forces.get(b).ax -= impulse*dx;
        forces.get(b).ay -= impulse*dy;
      }
    }
    const fade = Math.exp(-DAMPING*tick);
    for (const key of keys) {
      const body=bodies.get(key);
      if (body.fixed) continue;
      const f=forces.get(key), base=rest.get(key);
      body.vx = clamp((body.vx+f.ax*tick)*fade,-MAX_SPEED,MAX_SPEED);
      body.vy = clamp((body.vy+f.ay*tick)*fade,-MAX_SPEED,MAX_SPEED);
      body.x=clamp(body.x+body.vx*tick,Math.max(left,base.x-MAX_OFFSET_X),Math.min(right,base.x+MAX_OFFSET_X));
      body.y=clamp(body.y+body.vy*tick,Math.max(state.layout.top+RADIUS,base.y-MAX_OFFSET_Y),
        Math.min(floor,base.y+MAX_OFFSET_Y));
    }
    const before = new Map(keys.map(k=>[k,{x:bodies.get(k).x,y:bodies.get(k).y}]));
    resolveContacts(state.board,bodies,state.phase,state.layout,state.extraBonds,edges,state.newContactBonds);
    // Project collision corrections back into velocities so collision does
    // not instantly vanish on the next physics substep.
    for (const key of keys) {
      const p=bodies.get(key);
      if (p.fixed) continue;
      const previous=before.get(key);
      const correctionX=p.x-previous.x, correctionY=p.y-previous.y;
      if (Math.abs(correctionX)+Math.abs(correctionY) > .001) {
        p.vx=clamp(p.vx+correctionX/tick*.35,-MAX_SPEED,MAX_SPEED);
        p.vy=clamp(p.vy+correctionY/tick*.35,-MAX_SPEED,MAX_SPEED);
      }
    }
  }

  const next=new Map(), positions=new Map();
  for (const key of keys) {
    const p=bodies.get(key),base=rest.get(key);
    next.set(key,{x:p.x-base.x,y:p.y-base.y,vx:p.vx,vy:p.vy});
    positions.set(key,{x:p.x,y:p.y});
  }
  state.swayDynamics=next;
  state.attachedPositions=positions;
  return positions;
}
