// Pure-ish game rules. Rendering, input, audio and storage live elsewhere so
// future power-ups, levels and themes can be added without rewriting the rules.
import { MOBILE_LAYOUT, RADIUS, PITCH, ROW_HEIGHT, LEFT, SHOTS_PER_ROW, BOMB_RADIUS, COLOURS } from './config.js';
import {
  cellKey as key, shooterColumns, shooterPosition, shooterNeighbours as neighbours,
  connectedShooter, floatingShooter, shotBubbleCollision,
} from './grid.js';
import { createPuzzleBoard } from './puzzles.js';

// Keep the existing public API during the refactor, so current tests and any
// consumers importing from game.js continue to work.
export {
  MOBILE_LAYOUT, DESKTOP_LAYOUT, WIDTH, HEIGHT, RADIUS, PITCH, ROW_HEIGHT,
  LEFT, TOP, LAUNCH_Y, SHOTS_PER_ROW, BOMB_RADIUS, SHOT_HIT_DISTANCE,
  COLOURS, SWATCHES,
} from './config.js';
export { shooterColumns, shooterPosition, connectedShooter, floatingShooter } from './grid.js';
export { PUZZLES } from './puzzles.js';

const randomColour = (colours, random = Math.random) => colours[Math.floor(random() * colours.length)];

function visualState() {
  return {
    effects: [], pulses: [], shockwaves: [], callouts: [], shake: 0, flash: 0,
    event: 0, lastEvent: '', lastPop: 0,
  };
}

export function popPosition(row, col) {
  return { x: LEFT + RADIUS + col * PITCH, y: 78 + RADIUS + row * PITCH };
}

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

function addBurst(state, x, y, colour, count = 5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 85 + Math.random() * 200;
    const life = .45 + Math.random() * .4;
    state.effects.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      colour, life, maxLife: life, size: 2.8 + Math.random() * 3.4,
      kind: i % 3 === 0 ? 'star' : 'spark',
    });
  }
}

function addSpark(state, x, y, colour, vx = 0, vy = 0) {
  const life = .17 + Math.random() * .25;
  state.effects.push({ x, y, vx, vy, colour, life, maxLife: life, size: 1.7 + Math.random() * 2.2, kind: 'spark' });
}

function addPulse(state, x, y, colour, strength = 1) {
  state.pulses.push({ x, y, colour, radius: 11, speed: 145 * strength, life: .38, maxLife: .38 });
  state.flash = Math.max(state.flash, strength * .15);
}

function addExplosion(state, x, y, colour, strength = 1) {
  addBurst(state, x, y, colour, Math.round(23 * strength));
  addPulse(state, x, y, colour, 1.7 * strength);
  state.pulses.push({ x, y, colour: 'yellow', radius: 5, speed: 320 * strength, life: .47, maxLife: .47 });
  state.shockwaves.push({ x, y, radius: 10, life: .46, maxLife: .46, strength });
  state.shake = Math.max(state.shake, 1.1 * strength);
  state.flash = Math.max(state.flash, .95 * strength);
}

function addCallout(state, x, y, text, colour = 'yellow') {
  state.callouts.push({ x, y, text, colour, life: 1.15, maxLife: 1.15 });
}

// Detached bubbles fall to the floor and burst. They cannot magically match
// another hanging group on the way down; bomb chains happen on the grid.
export function releaseFloatingShooter(state, cells, random = Math.random) {
  let count = 0;
  for (const [row, col] of cells) {
    const colour = state.board.get(key(row, col));
    if (!colour) continue;
    const { x, y } = shooterPosition(row, col, state.phase, state.layout);
    const bomb = state.bombs.delete(key(row, col));
    state.board.delete(key(row, col));
    state.falling.push({
      x, y, colour, bomb,
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
  if (state.status !== 'playing' || state.projectile || state.pendingBombs.length || state.falling.length || state.rowShift > 1 || state.introTime > 0) return false;
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
    const { x, y } = shooterPosition(r, c, state.phase, state.layout);
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
    const p = shooterPosition(r, c, state.phase, state.layout);
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
  const floaters = floatingShooter(state.board, state.phase, state.layout);
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
  const impact = shooterPosition(row, col, state.phase, state.layout);
  const same = connectedShooter(state.board, row, col, state.phase, true, state.layout);
  for (const [k] of state.board) {
    const [r, c] = k.split(',').map(Number);
    const p = shooterPosition(r, c, state.phase, state.layout);
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
  for (const particle of state.effects) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 175 * dt;
    particle.life -= dt;
  }
  state.effects = state.effects.filter(p => p.life > 0);
  for (const pulse of state.pulses) {
    pulse.radius += pulse.speed * dt;
    pulse.life -= dt;
  }
  state.pulses = state.pulses.filter(p => p.life > 0);
  for (const wave of state.shockwaves) {
    wave.radius += dt * 285 * wave.strength;
    wave.life -= dt;
  }
  state.shockwaves = state.shockwaves.filter(w => w.life > 0);
  for (const callout of state.callouts) {
    callout.y -= 46 * dt;
    callout.life -= dt;
  }
  state.callouts = state.callouts.filter(c => c.life > 0);

  if (state.mode === 'shooter') {
    let detonated = false;
    if (state.pendingBombs.length) {
      state.bombClock -= dt;
      if (state.bombClock <= 0) {
        detonated = detonateNextBomb(state);
        if (!state.pendingBombs.length) settleShooter(state);
      }
    }
    const remaining = [];
    let exploded = 0;
    for (const falling of state.falling) {
      falling.vy += falling.gravity * dt;
      falling.x += falling.vx * dt;
      falling.y += falling.vy * dt;
      falling.rotation += falling.spin * dt;
      if (falling.x < state.layout.left + RADIUS || falling.x > state.layout.width - state.layout.left - RADIUS) {
        falling.x = Math.max(state.layout.left + RADIUS, Math.min(state.layout.width - state.layout.left - RADIUS, falling.x));
        falling.vx *= -.7;
      }
      falling.burstAt -= dt;
      falling.sparkleClock += dt;
      if (falling.sparkleClock >= .06) {
        falling.sparkleClock = 0;
        addSpark(state, falling.x, falling.y, falling.colour, (Math.random() - .5) * 50, -35);
      }
      if (falling.burstAt <= 0 || falling.y + RADIUS >= state.layout.height - 22) {
        const floorY = state.layout.height - 22 - RADIUS;
        addExplosion(state, falling.x, Math.min(falling.y, floorY), falling.colour, falling.bomb ? 1 : .75);
        exploded++;
      } else remaining.push(falling);
    }
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
    if (shotBubbleCollision(state.board, shot.x, shot.y, state.phase, state.layout)) {
      lockShooter(state);
      break;
    }
  }
}

export function initialPop(random = Math.random) {
  const board = [];
  for (let row = 0; row < 11; row++) {
    board.push([]);
    for (let col = 0; col < 9; col++) {
      // Four-colour boards make groups plentiful and visually readable.
      board[row].push(randomColour(COLOURS.slice(0, 4), random));
    }
  }
  return { mode: 'pop', board, score: 0, status: 'playing', moves: 0, ...visualState() };
}

export function popGroup(board, row, col) {
  const colour = board[row]?.[col];
  if (!colour) return [];
  const queue = [[row, col]];
  const seen = new Set([key(row, col)]);
  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i];
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (board[nr]?.[nc] !== colour || seen.has(key(nr, nc))) continue;
      seen.add(key(nr, nc));
      queue.push([nr, nc]);
    }
  }
  return queue;
}

export function hasPopMoves(board) {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const colour = board[r][c];
      if (colour && (board[r + 1]?.[c] === colour || board[r]?.[c + 1] === colour)) return true;
    }
  }
  return false;
}

export function collapsePop(board) {
  const rows = board.length;
  const cols = board[0].length;
  const keptColumns = [];
  for (let c = 0; c < cols; c++) {
    const bubbles = [];
    for (let r = rows - 1; r >= 0; r--) if (board[r][c]) bubbles.push(board[r][c]);
    if (bubbles.length) keptColumns.push(bubbles);
  }
  // Bubbles fall down; completely empty columns slide left.
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => keptColumns[c]?.[rows - r - 1] ?? null));
}

export function popAt(state, row, col) {
  if (state.status !== 'playing') return 0;
  const group = popGroup(state.board, row, col);
  if (group.length < 2) return 0;
  for (const [r, c] of group) {
    const { x, y } = popPosition(r, c);
    addBurst(state, x, y, state.board[r][c], 7);
    addPulse(state, x, y, state.board[r][c], .8);
    state.board[r][c] = null;
  }
  state.board = collapsePop(state.board);
  state.score += group.length * group.length * 5;
  state.lastPop = group.length;
  const [firstRow, firstCol] = group[Math.floor(group.length / 2)];
  const point = popPosition(firstRow, firstCol);
  addCallout(state, point.x, point.y, `+${group.length * group.length * 5}`, 'yellow');
  state.shake = Math.max(state.shake, Math.min(.75, group.length * .065));
  state.moves++;
  emit(state, 'pop');
  if (state.board.every(rowValues => rowValues.every(cell => !cell))) {
    state.score += 500;
    state.status = 'won';
    emit(state, 'win');
  } else if (!hasPopMoves(state.board)) {
    state.status = 'finished';
    emit(state, 'finish');
  }
  return group.length;
}

export function popCellAt(x, y) {
  const col = Math.round((x - (LEFT + RADIUS)) / PITCH);
  const row = Math.round((y - (78 + RADIUS)) / PITCH);
  if (row < 0 || row >= 11 || col < 0 || col >= 9) return null;
  const p = popPosition(row, col);
  return Math.hypot(p.x - x, p.y - y) <= RADIUS + 4 ? [row, col] : null;
}
