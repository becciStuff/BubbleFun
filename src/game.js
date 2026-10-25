// Pure-ish game rules. Rendering, input, audio and storage live elsewhere so
// future power-ups, levels and themes can be added without rewriting the rules.
import { MOBILE_LAYOUT, RADIUS, PITCH, ROW_HEIGHT, SHOTS_PER_ROW, BOMB_RADIUS, COLOURS } from './config.js';
import { visualState, addBurst, addSpark, addPulse, addExplosion, addCallout, updateVisualEffects } from './effects.js';
import {
  cellKey as key, shooterColumns, shooterPosition, shooterNeighbours as neighbours,
  connectedShooter, shotBubbleCollision,
} from './grid.js';
import { createPuzzleBoard } from './puzzles.js';
import { findDetachedBubbles, releaseFloatingShooter, stepFallingBubbles, releaseGravitySurge } from './gravity.js';
import { createGravityLabBoard } from './gravity-lab.js';
import { bubblePosition } from './positions.js';
import { stepAttachedSway, kickAttachedSway } from './sway.js';

// Keep the existing public API during the refactor, so current tests and any
// consumers importing from game.js continue to work.
export {
  MOBILE_LAYOUT, DESKTOP_LAYOUT, WIDTH, HEIGHT, RADIUS, PITCH, ROW_HEIGHT,
  LEFT, TOP, LAUNCH_Y, SHOTS_PER_ROW, BOMB_RADIUS, SHOT_HIT_DISTANCE,
  COLOURS, SWATCHES,
} from './config.js';
export { shooterColumns, shooterPosition, connectedShooter, floatingShooter } from './grid.js';
export { PUZZLES } from './puzzles.js';
export { releaseFloatingShooter } from './gravity.js';
export { popPosition, initialPop, popGroup, hasPopMoves, collapsePop, popAt, popCellAt } from './pop-mode.js';

const randomColour = (colours, random = Math.random) => colours[Math.floor(random() * colours.length)];

export function initialShooter(random = Math.random, layout = MOBILE_LAYOUT) {
  const board = new Map();
  // Short runs of repeated colours make the first few moves approachable.
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < shooterColumns(row, 0, layout); col++) {
      const columnBand = Math.floor((col + (row % 2)) / 2);
      const palette = COLOURS.slice(0, 4);
      const colour = random() < .64 ? palette[(columnBand + Math.floor(row / 2)) % palette.length] : randomColour(palette, random);
      board.set(key(row, col), colour);
    }
  }
  const colours = Array.from(new Set(board.values()));
  // Mark existing coloured cells, rather than adding a sixth colour. Players
  // can aim at the marked bubbles using the normal match-three rules.
  const bombs = new Set();
  const candidates = row => Array.from(board.keys()).filter(k => {
    const [r, c] = k.split(',').map(Number);
    return r === row && connectedShooter(board, r, c, 0, true, layout).length >= 2;
  });
  const lower = candidates(4);
  if (lower.length) {
    const first = lower[Math.floor(random() * lower.length)];
    bombs.add(first);
    const [firstRow, firstCol] = first.split(',').map(Number);
    const centre = shooterPosition(firstRow, firstCol, 0, layout);
    const nearby = candidates(3).filter(k => {
      const [r, c] = k.split(',').map(Number);
      const p = shooterPosition(r, c, 0, layout);
      return Math.hypot(p.x - centre.x, p.y - centre.y) <= BOMB_RADIUS;
    });
    // A nearby bomb of another colour gives players a discoverable, real
    // two-stage chain without needing an unlikely falling-bubble collision.
    const different = nearby.filter(k => board.get(k) !== board.get(first));
    const secondOptions = different.length ? different : nearby;
    if (secondOptions.length) bombs.add(secondOptions[Math.floor(random() * secondOptions.length)]);
  }
  return {
    mode: 'shooter', variant: 'arcade', layout, board, bombs, pendingBombs: [], bombClock: 0,
    phase: 0, angle: 0, projectile: null,
    current: randomColour(colours, random), next: randomColour(colours, random),
    score: 0, shots: 0, shotsUntilRow: SHOTS_PER_ROW, status: 'playing',
    falling: [], lastDrop: 0, lastBombs: 0, recoil: 0, comboLevel: 0, highestCombo: 1,
    comboDisplay: 0, lastChain: null, pendingRow: false, pendingDanger: false,
    wobble: new Map(), rowShift: 0, introTime: 0, pendingPuzzleLoss: false,
    attachedPositions: new Map(), swayKicks: new Map(), swayClock: 0,
    ...visualState(),
  };
}

export function initialPuzzle(index = 0, layout = MOBILE_LAYOUT, random = Math.random) {
  const { index: safeIndex, puzzle, board, bombs } = createPuzzleBoard(index, layout);
  const state = initialShooter(random, layout);
  state.board = board;
  state.bombs = bombs;
  state.variant = 'puzzle';
  state.puzzleIndex = safeIndex;
  state.puzzleName = puzzle.name;
  state.puzzleGoal = puzzle.goal;
  state.shotLimit = puzzle.shots;
  state.ammo = puzzle.ammo;
  state.ammoIndex = 2;
  state.current = puzzle.ammo[0];
  state.next = puzzle.ammo[1];
  state.introTime = .72;
  return state;
}

// A self-contained demonstration of weight versus independent ceiling support.
export function initialGravityLab(layout = MOBILE_LAYOUT) {
  const state = initialShooter(() => .35, layout);
  state.board = createGravityLabBoard(layout);
  state.bombs = new Set();
  state.variant = 'lab';
  state.gravityLabUsed = false;
  state.lastGravityRelease = 0;
  return state;
}

export function canTriggerGravityLabSurge(state) {
  return state.variant === 'lab' && state.status === 'playing' &&
    !state.gravityLabUsed && !state.projectile && !state.pendingBombs.length &&
    !state.falling.length && !state.rowShift && !state.introTime;
}

// Lab-only physics demonstration; never alters puzzle rules or leaderboard.
// Falling and support calculations remain in dedicated modules.
export function triggerGravityLabSurge(state, options = {}) {
  if (!canTriggerGravityLabSurge(state)) return { activated: false, released: 0 };
  state.gravityLabUsed = true;
  const result = releaseGravitySurge(state, options);
  state.lastGravityRelease = result.released;
  state.lastDrop = result.released;
  if (result.released) {
    addCallout(state, state.layout.width / 2, state.layout.height * .37,
      `GRAVITY SURGE! ${result.released} FALLING`, 'pink');
    addPulse(state, state.layout.width / 2, state.layout.height * .30, 'yellow', 1.7);
    state.shake = Math.max(state.shake, .7);
  }
  emit(state, 'surge');
  return { activated: true, ...result };
}

function emit(state, type) {
  state.lastEvent = type;
  state.event++;
}

function pickFromBoard(state, random = Math.random) {
  const colours = Array.from(new Set(state.board.values()));
  return randomColour(colours.length ? colours : COLOURS.slice(0, 4), random);
}

export function fireShooter(state) {
  // A shot owns its entire bomb sequence and falling cascade.
  if (state.status !== 'playing' || state.variant === 'lab' || state.projectile || state.pendingBombs.length || state.falling.length || state.rowShift > 1 || state.introTime > 0) return false;
  state.comboLevel = 0;
  state.comboDisplay = 0;
  state.lastChain = null;
  state.lastPop = 0;
  state.lastDrop = 0;
  state.lastBombs = 0;
  const speed = 810;
  state.projectile = {
    x: state.layout.width / 2, y: state.layout.launchY,
    vx: Math.sin(state.angle) * speed,
    vy: -Math.cos(state.angle) * speed,
    colour: state.current,
    sparkleClock: 0,
  };
  state.recoil = 1;
  state.current = state.next;
  state.next = state.variant === 'puzzle' && state.ammoIndex < state.ammo.length
    ? state.ammo[state.ammoIndex++] : pickFromBoard(state);
  emit(state, 'fire');
  return true;
}

export function aimShooter(state, x, y) {
  if (state.status !== 'playing') return;
  // The launcher can never shoot downwards or nearly horizontally.
  state.angle = Math.max(-1.15, Math.min(1.15, Math.atan2(x - state.layout.width / 2, state.layout.launchY - y)));
}

function landingSlot(state, x, y) {
  let closest = null;
  let minDistance = Infinity;
  const maxRow = Math.min(18, Math.max(1, ...Array.from(state.board.keys(), k => Number(k.split(',')[0]) + 1)));
  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c < shooterColumns(r, state.phase, state.layout); c++) {
      if (state.board.has(key(r, c))) continue;
      // A shot must attach to the ceiling or an existing bubble.
      if (r !== 0 && neighbours(state.board, r, c, state.phase, state.layout).length === 0) continue;
      const p = shooterPosition(r, c, state.phase, state.layout);
      const distance = Math.hypot(x - p.x, y - p.y);
      if (distance < minDistance) { minDistance = distance; closest = [r, c]; }
    }
  }
  return closest && minDistance <= PITCH * 1.65 ? closest : null;
}

function removeCells(state, cells, effectCount) {
  const bombs = [];
  for (const [r, c] of cells) {
    const colour = state.board.get(key(r, c));
    if (!colour) continue;
    const { x, y } = bubblePosition(state, r, c);
    if (state.bombs.delete(key(r, c))) bombs.push({ x, y, row: r, col: c });
    addBurst(state, x, y, colour, effectCount);
    addPulse(state, x, y, colour, .65);
    state.board.delete(key(r, c));
  }
  return bombs;
}

// A matched bomb explodes on the board. The blast reaches neighbouring cells
// regardless of colour, and caught bombs are queued for subsequent blasts.
export function detonateNextBomb(state) {
  const bomb = state.pendingBombs.shift();
  if (!bomb) return false;
  const victims = [];
  for (const k of state.board.keys()) {
    const [r, c] = k.split(',').map(Number);
    const p = bubblePosition(state, r, c);
    if (Math.hypot(p.x - bomb.x, p.y - bomb.y) <= BOMB_RADIUS) victims.push([r, c]);
  }
  state.pendingBombs.push(...removeCells(state, victims, 11));
  state.comboLevel = Math.min(8, Math.max(2, state.comboLevel + 1));
  state.highestCombo = Math.max(state.highestCombo, state.comboLevel);
  state.comboDisplay = 2.8;
  state.lastBombs++;
  const points = (50 + victims.length * 25) * state.comboLevel;
  state.score += points;
  state.lastPop += victims.length;
  state.lastChain = { multiplier: state.comboLevel, points, popped: victims.length, detonated: state.lastBombs };
  addExplosion(state, bomb.x, bomb.y, 'yellow', 1.15 + Math.min(.35, state.comboLevel * .05));
  addCallout(state, bomb.x, bomb.y - 76, `BOOM ×${state.comboLevel}! +${points}`, 'pink');
  state.bombClock = .22;
  emit(state, 'chain');
  return true;
}

export function descendShooter(state, random = Math.random) {
  const shifted = new Map();
  const shiftedBombs = new Set();
  for (const [k, colour] of state.board) {
    const [row, col] = k.split(',').map(Number);
    shifted.set(key(row + 1, col), colour);
    if (state.bombs.has(k)) shiftedBombs.add(key(row + 1, col));
  }
  state.phase = 1 - state.phase; // Preserves the x positions of existing rows.
  state.board = shifted;
  for (let col = 0; col < shooterColumns(0, state.phase, state.layout); col++) {
    state.board.set(key(0, col), randomColour(COLOURS.slice(0, 4), random));
    if (shiftedBombs.size < 4 && random() < .09) shiftedBombs.add(key(0, col));
  }
  state.bombs = shiftedBombs;
  state.shotsUntilRow = SHOTS_PER_ROW;
  state.pendingRow = false;
  state.rowShift = ROW_HEIGHT;
  emit(state, 'drop');
  if (ceilingReachedLauncher(state)) {
    state.status = 'lost';
    emit(state, 'lose');
  }
}

function ceilingReachedLauncher(state) {
  for (const k of state.board.keys()) {
    const [row, col] = k.split(',').map(Number);
    if (shooterPosition(row, col, state.phase, state.layout).y + RADIUS >= state.layout.launchY - 43) return true;
  }
  return false;
}

function settleShooter(state) {
  const floaters = findDetachedBubbles(state.board, state.phase, state.layout);
  const detached = releaseFloatingShooter(state, floaters);
  state.lastDrop += detached;
  state.lastPop += detached;
  state.score += detached * 30;
  if (detached) {
    addCallout(state, state.layout.width / 2, state.layout.height * .58, `GRAVITY! ${detached} FALLING +${detached * 30}`, 'pink');
    if (!state.lastBombs) emit(state, 'cascade');
  }
  if (state.variant === 'puzzle' ? state.bombs.size === 0 : state.board.size === 0) {
    if (state.falling.length) state.status = 'clearing';
    else { state.status = 'won'; emit(state, 'win'); }
    return;
  }
  if (ceilingReachedLauncher(state)) {
    if (state.falling.length) state.pendingDanger = true;
    else { state.status = 'lost'; emit(state, 'lose'); return; }
  }
  if (state.variant === 'puzzle') {
    if (state.shots >= state.shotLimit) {
      if (state.falling.length) state.pendingPuzzleLoss = true;
      else { state.status = 'lost'; emit(state, 'lose'); }
    }
    return;
  }
  if (state.shotsUntilRow <= 0) {
    if (state.falling.length) state.pendingRow = true;
    else descendShooter(state);
  }
}

function lockShooter(state) {
  const shot = state.projectile;
  state.projectile = null;
  const slot = landingSlot(state, shot.x, shot.y);
  if (!slot) { state.status = 'lost'; emit(state, 'lose'); return; }
  const [row, col] = slot;
  state.board.set(key(row, col), shot.colour);
  const impact = bubblePosition(state, row, col);
  const same = connectedShooter(state.board, row, col, state.phase, true, state.layout);
  for (const [k] of state.board) {
    const [r, c] = k.split(',').map(Number);
    const p = bubblePosition(state, r, c);
    const proximity = Math.hypot(p.x - impact.x, p.y - impact.y);
    if (proximity < PITCH * 3.1) state.wobble.set(k, .85 * (1 - proximity / (PITCH * 4)));
  }
  state.lastPop = 0;
  state.lastDrop = 0;
  if (same.length >= 3) {
    state.comboLevel = 1;
    state.pendingBombs.push(...removeCells(state, same, 13));
    state.lastPop = same.length;
    state.score += same.length * 20;
    state.shake = Math.max(state.shake, Math.min(.9, same.length * .085));
    addPulse(state, impact.x, impact.y, shot.colour, 1.35);
    addCallout(state, impact.x, impact.y - 25, `POP! +${same.length * 20}`, 'yellow');
    emit(state, 'pop');
  } else {
    addPulse(state, impact.x, impact.y, shot.colour, .38);
    emit(state, 'land');
  }
  kickAttachedSway(state, row, col);
  state.shots++;
  state.shotsUntilRow--;
  if (!state.pendingBombs.length) settleShooter(state);
}

export function stepGame(state, dt) {
  dt = Math.min(.045, Math.max(0, dt));
  state.shake = Math.max(0, state.shake - dt * 2.4);
  state.flash = Math.max(0, state.flash - dt * 1.5);
  if (state.recoil) state.recoil = Math.max(0, state.recoil - dt * 5);
  if (state.rowShift) state.rowShift = state.rowShift < .4 ? 0 : state.rowShift * Math.exp(-13 * dt);
  if (state.introTime) state.introTime = Math.max(0, state.introTime - dt);
  if (state.wobble) {
    for (const [k, value] of state.wobble) {
      const reduced = value - dt * 1.4;
      if (reduced <= 0) state.wobble.delete(k);
      else state.wobble.set(k, reduced);
    }
  }
  if (state.comboDisplay) state.comboDisplay = Math.max(0, state.comboDisplay - dt);
  if (state.mode === 'shooter') stepAttachedSway(state, dt);
  updateVisualEffects(state, dt);

  if (state.mode === 'shooter') {
    let detonated = false;
    if (state.pendingBombs.length) {
      state.bombClock -= dt;
      if (state.bombClock <= 0) {
        detonated = detonateNextBomb(state);
        if (!state.pendingBombs.length) settleShooter(state);
      }
    }
    const { remaining, exploded } = stepFallingBubbles(state.falling, state.layout, dt, {
      onSpark: (x, y, colour, vx, vy) => addSpark(state, x, y, colour, vx, vy),
      onBurst: (x, y, colour, strength) => addExplosion(state, x, y, colour, strength),
    });
    state.falling = remaining;
    if (exploded) {
      state.shake = Math.max(state.shake, Math.min(1.25, exploded * .18));
      if (!detonated) emit(state, 'burst');
    }
    if ((state.variant === 'puzzle' ? state.bombs.size === 0 : state.board.size === 0) && state.status === 'playing' && !state.projectile && !state.pendingBombs.length) {
      if (state.falling.length) state.status = 'clearing';
      else { state.status = 'won'; emit(state, 'win'); }
    }
    if (state.status === 'clearing' && state.falling.length === 0) {
      state.status = 'won';
      emit(state, 'win');
    }
    if (state.status === 'playing' && state.falling.length === 0) {
      if (state.pendingRow) descendShooter(state);
      if (state.pendingPuzzleLoss && state.status === 'playing') {
        state.pendingPuzzleLoss = false;
        state.status = 'lost';
        emit(state, 'lose');
      }
      if (state.status === 'playing' && state.pendingDanger) {
        state.pendingDanger = false;
        if (ceilingReachedLauncher(state)) {
          state.status = 'lost';
          emit(state, 'lose');
        }
      }
    }
  }
  if (state.mode !== 'shooter' || !state.projectile || state.status !== 'playing') return;
  // Substeps prevent a fast bubble passing through a row on slower devices.
  const steps = Math.max(1, Math.ceil(dt / .007));
  const tick = dt / steps;
  for (let i = 0; i < steps; i++) {
    const shot = state.projectile;
    if (!shot) break;
    shot.x += shot.vx * tick;
    shot.y += shot.vy * tick;
    shot.sparkleClock += tick;
    if (shot.sparkleClock > .026) {
      shot.sparkleClock = 0;
      addSpark(state, shot.x, shot.y, shot.colour, -shot.vx * .045 + (Math.random() - .5) * 45, -shot.vy * .045);
    }
    const low = state.layout.left + RADIUS;
    const high = state.layout.width - low;
    if (shot.x < low) { shot.x = low + (low - shot.x); shot.vx = Math.abs(shot.vx); }
    if (shot.x > high) { shot.x = high - (shot.x - high); shot.vx = -Math.abs(shot.vx); }
    if (shot.y <= state.layout.top + RADIUS) { shot.y = state.layout.top + RADIUS; lockShooter(state); break; }
    if (shotBubbleCollision(state.board, shot.x, shot.y, state.phase, state.layout, state.attachedPositions)) {
      lockShooter(state);
      break;
    }
  }
}

