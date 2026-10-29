// Existing detached-bubble gravity. The grid owns connectivity; gravity owns
// what detaches and how those objects move until they burst. Scoring, effects,
// audio and turn completion stay in game.js.
import { MOBILE_LAYOUT, RADIUS } from './config.js';
import { cellKey, floatingShooter } from './grid.js';
import { bubblePosition } from './positions.js';
import { planGravitySurge } from './supports.js';
export { analyseSupports, planGravitySurge } from './supports.js';

// Currently, anything without a ceiling path drops. Future support-strength
// rules can be introduced here without changing grid geometry.
export function findDetachedBubbles(board, phase = 0, layout = MOBILE_LAYOUT, extraBonds = null) {
  return floatingShooter(board, phase, layout, extraBonds);
}

// Detached bubbles cannot match other hanging groups during the fall.
// Remove their board cells and start one falling body per bubble.
export function releaseFloatingShooter(state, cells, random = Math.random) {
  let count = 0;
  for (const [row, col] of cells) {
    const colour = state.board.get(cellKey(row, col));
    if (!colour) continue;
    const { x, y } = bubblePosition(state, row, col);
    const bomb = state.bombs.delete(cellKey(row, col));
    const gravityHost = state.gravityEvents?.hosts.delete(cellKey(row,col)) ?? false;
    state.board.delete(cellKey(row, col));
    state.falling.push({
      x, y, colour, bomb, gravityHost,
      vx: (x - state.layout.width / 2) * .09 + (random() - .5) * 50,
      vy: -25 - random() * 40,
      gravity: 885 + random() * 140,
      spin: (random() - .5) * 3.5,
      rotation: 0,
      burstAt: 3.2,
      sparkleClock: 0,
    });
    count++;
  }
  return count;
}

// Advances physical objects only. Synchronous callbacks report sparks and
// impacts in the same order as before extraction; the game chooses the visual
// effects and rewards. Callers own the clamped frame time and turn lifecycle.
export function stepFallingBubbles(fallingBubbles, layout, dt, {
  onSpark = () => {}, onBurst = () => {}, random = Math.random,
} = {}) {
  const remaining = [];
  let exploded = 0;
  for (const falling of fallingBubbles) {
    falling.vy += falling.gravity * dt;
    falling.x += falling.vx * dt;
    falling.y += falling.vy * dt;
    falling.rotation += falling.spin * dt;
    if (falling.x < layout.left + RADIUS || falling.x > layout.width - layout.left - RADIUS) {
      falling.x = Math.max(layout.left + RADIUS, Math.min(layout.width - layout.left - RADIUS, falling.x));
      falling.vx *= -.7;
    }
    falling.burstAt -= dt;
    falling.sparkleClock += dt;
    if (falling.sparkleClock >= .06) {
      falling.sparkleClock = 0;
      onSpark(falling.x, falling.y, falling.colour, (random() - .5) * 50, -35);
    }
    if (falling.burstAt <= 0 || falling.y + RADIUS >= layout.height - 22) {
      const floorY = layout.height - 22 - RADIUS;
      onBurst(falling.x, Math.min(falling.y, floorY), falling.colour, falling.bomb ? 1 : .75, falling);
      exploded++;
    } else remaining.push(falling);
  }
  return { remaining, exploded };
}

// Explicit opt-in extreme gravity. This is a physics-only entry point for a
// future special: callers decide when to activate it, scoring, FX and turns.
// Normal gameplay does not call it, so its gravity remains unchanged.
export function releaseGravitySurge(state, { random = Math.random, ...settings } = {}) {
  const plan = planGravitySurge(state.board, {
    phase: state.phase, layout: state.layout, extraBonds: state.extraBonds, ...settings,
  });
  const released = releaseFloatingShooter(state, plan.detached, random);
  return { ...plan, released };
}
