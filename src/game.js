// Pure-ish game rules. Rendering, input, audio and storage live elsewhere so
// future power-ups, levels and themes can be added without rewriting the rules.
export const WIDTH = 432;
export const HEIGHT = 700;
export const RADIUS = 21;
export const PITCH = RADIUS * 2;
export const ROW_HEIGHT = Math.sqrt(3) * RADIUS;
export const LEFT = 27;
export const TOP = 56;
export const LAUNCH_Y = 639;
export const SHOTS_PER_ROW = 5;
export const COLOURS = ['pink', 'blue', 'yellow', 'green', 'purple'];
export const SWATCHES = {
  pink: '#ff559c', blue: '#4ac6ff', yellow: '#ffc44b',
  green: '#51de9b', purple: '#a78afb',
};

const key = (row, col) => `${row},${col}`;
const randomColour = (colours, random = Math.random) => colours[Math.floor(random() * colours.length)];
const CLUSTER_THRESHOLD = 2 * RADIUS + 1.2;

export function shooterColumns(row, phase = 0) {
  return (row + phase) % 2 === 0 ? 9 : 8;
}

export function shooterPosition(row, col, phase = 0) {
  return {
    x: LEFT + RADIUS + col * PITCH + (((row + phase) % 2) ? RADIUS : 0),
    y: TOP + RADIUS + row * ROW_HEIGHT,
  };
}

export function popPosition(row, col) {
  return { x: LEFT + RADIUS + col * PITCH, y: 78 + RADIUS + row * PITCH };
}

export function initialShooter(random = Math.random) {
  const board = new Map();
  // Short runs of repeated colours make the first few moves approachable.
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < shooterColumns(row); col++) {
      const columnBand = Math.floor((col + (row % 2)) / 2);
      const palette = COLOURS.slice(0, 4);
      const colour = random() < .64 ? palette[(columnBand + Math.floor(row / 2)) % palette.length] : randomColour(palette, random);
      board.set(key(row, col), colour);
    }
  }
  const colours = Array.from(new Set(board.values()));
  return {
    mode: 'shooter', board, phase: 0, angle: 0, projectile: null,
    current: randomColour(colours, random), next: randomColour(colours, random),
    score: 0, shots: 0, shotsUntilRow: SHOTS_PER_ROW, status: 'playing',
    effects: [], event: 0, lastEvent: '', lastPop: 0,
  };
}

function neighbours(board, row, col, phase) {
  const origin = shooterPosition(row, col, phase);
  const nearby = [];
  for (let r = Math.max(0, row - 1); r <= row + 1; r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(shooterColumns(r, phase) - 1, col + 1); c++) {
      if (r === row && c === col) continue;
      if (!board.has(key(r, c))) continue;
      const p = shooterPosition(r, c, phase);
      if (Math.hypot(origin.x - p.x, origin.y - p.y) <= CLUSTER_THRESHOLD) nearby.push([r, c]);
    }
  }
  return nearby;
}

export function connectedShooter(board, row, col, phase = 0, colourOnly = true) {
  const original = board.get(key(row, col));
  if (!original) return [];
  const found = new Set([key(row, col)]);
  const queue = [[row, col]];
  for (let i = 0; i < queue.length; i++) {
    for (const [nr, nc] of neighbours(board, ...queue[i], phase)) {
      const k = key(nr, nc);
      if (found.has(k) || (colourOnly && board.get(k) !== original)) continue;
      found.add(k);
      queue.push([nr, nc]);
    }
  }
  return queue;
}

export function floatingShooter(board, phase = 0) {
  const connected = new Set();
  for (let col = 0; col < shooterColumns(0, phase); col++) {
    const start = key(0, col);
    if (!board.has(start) || connected.has(start)) continue;
    for (const [r, c] of connectedShooter(board, 0, col, phase, false)) connected.add(key(r, c));
  }
  return Array.from(board.keys()).filter(k => !connected.has(k)).map(k => k.split(',').map(Number));
}

function addBurst(state, x, y, colour, count = 5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 140;
    state.effects.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, colour, life: .55 + Math.random() * .2, maxLife: .75 });
  }
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
  if (state.status !== 'playing' || state.projectile) return false;
  const speed = 810;
  state.projectile = {
    x: WIDTH / 2, y: LAUNCH_Y,
    vx: Math.sin(state.angle) * speed,
    vy: -Math.cos(state.angle) * speed,
    colour: state.current,
  };
  state.current = state.next;
  state.next = pickFromBoard(state);
  emit(state, 'fire');
  return true;
}

export function aimShooter(state, x, y) {
  if (state.status !== 'playing') return;
  // The launcher can never shoot downwards or nearly horizontally.
  state.angle = Math.max(-1.15, Math.min(1.15, Math.atan2(x - WIDTH / 2, LAUNCH_Y - y)));
}

function landingSlot(state, x, y) {
  let closest = null;
  let minDistance = Infinity;
  const maxRow = Math.min(18, Math.max(1, ...Array.from(state.board.keys(), k => Number(k.split(',')[0]) + 1)));
  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c < shooterColumns(r, state.phase); c++) {
      if (state.board.has(key(r, c))) continue;
      // A shot must attach to the ceiling or an existing bubble.
      if (r !== 0 && neighbours(state.board, r, c, state.phase).length === 0) continue;
      const p = shooterPosition(r, c, state.phase);
      const distance = Math.hypot(x - p.x, y - p.y);
      if (distance < minDistance) { minDistance = distance; closest = [r, c]; }
    }
  }
  return closest && minDistance <= PITCH * 1.65 ? closest : null;
}

function removeCells(state, cells, effectCount) {
  for (const [r, c] of cells) {
    const colour = state.board.get(key(r, c));
    if (!colour) continue;
    const { x, y } = shooterPosition(r, c, state.phase);
    addBurst(state, x, y, colour, effectCount);
    state.board.delete(key(r, c));
  }
}

export function descendShooter(state, random = Math.random) {
  const shifted = new Map();
  for (const [k, colour] of state.board) {
    const [row, col] = k.split(',').map(Number);
    shifted.set(key(row + 1, col), colour);
  }
  state.phase = 1 - state.phase; // Preserves the x positions of existing rows.
  state.board = shifted;
  for (let col = 0; col < shooterColumns(0, state.phase); col++) {
    state.board.set(key(0, col), randomColour(COLOURS.slice(0, 4), random));
  }
  state.shotsUntilRow = SHOTS_PER_ROW;
  emit(state, 'drop');
  for (const k of state.board.keys()) {
    const [row, col] = k.split(',').map(Number);
    if (shooterPosition(row, col, state.phase).y + RADIUS >= LAUNCH_Y - 43) {
      state.status = 'lost';
      emit(state, 'lose');
      return;
    }
  }
}

function lockShooter(state) {
  const shot = state.projectile;
  state.projectile = null;
  const slot = landingSlot(state, shot.x, shot.y);
  if (!slot) { state.status = 'lost'; emit(state, 'lose'); return; }
  const [row, col] = slot;
  state.board.set(key(row, col), shot.colour);
  const same = connectedShooter(state.board, row, col, state.phase);
  state.lastPop = 0;
  if (same.length >= 3) {
    removeCells(state, same, 5);
    const floaters = floatingShooter(state.board, state.phase);
    removeCells(state, floaters, 3);
    state.lastPop = same.length + floaters.length;
    state.score += same.length * 20 + floaters.length * 30;
    emit(state, 'pop');
  } else {
    emit(state, 'land');
  }
  state.shots++;
  if (state.board.size === 0) { state.status = 'won'; emit(state, 'win'); return; }
  for (const k of state.board.keys()) {
    const [r, c] = k.split(',').map(Number);
    if (shooterPosition(r, c, state.phase).y + RADIUS >= LAUNCH_Y - 43) {
      state.status = 'lost'; emit(state, 'lose'); return;
    }
  }
  state.shotsUntilRow--;
  if (state.shotsUntilRow <= 0) descendShooter(state);
}

export function stepGame(state, dt) {
  dt = Math.min(.045, Math.max(0, dt));
  for (const particle of state.effects) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 175 * dt;
    particle.life -= dt;
  }
  state.effects = state.effects.filter(p => p.life > 0);
  if (state.mode !== 'shooter' || !state.projectile || state.status !== 'playing') return;
  // Substeps prevent a fast bubble passing through a row on slower devices.
  const steps = Math.max(1, Math.ceil(dt / .007));
  const tick = dt / steps;
  for (let i = 0; i < steps; i++) {
    const shot = state.projectile;
    if (!shot) break;
    shot.x += shot.vx * tick;
    shot.y += shot.vy * tick;
    const low = LEFT + RADIUS;
    const high = WIDTH - low;
    if (shot.x < low) { shot.x = low + (low - shot.x); shot.vx = Math.abs(shot.vx); }
    if (shot.x > high) { shot.x = high - (shot.x - high); shot.vx = -Math.abs(shot.vx); }
    if (shot.y <= TOP + RADIUS) { shot.y = TOP + RADIUS; lockShooter(state); break; }
    for (const [k] of state.board) {
      const [row, col] = k.split(',').map(Number);
      const p = shooterPosition(row, col, state.phase);
      if (Math.hypot(shot.x - p.x, shot.y - p.y) < PITCH - 1.5) {
        lockShooter(state);
        break;
      }
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
  return { mode: 'pop', board, score: 0, status: 'playing', effects: [], event: 0, lastEvent: '', lastPop: 0, moves: 0 };
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
    addBurst(state, x, y, state.board[r][c], 4);
    state.board[r][c] = null;
  }
  state.board = collapsePop(state.board);
  state.score += group.length * group.length * 5;
  state.lastPop = group.length;
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
