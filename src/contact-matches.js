// Match-three triggered by newly formed PHYSICAL contacts, rather than only
// a fired projectile. Pure analysis: no scoring, effects or state mutation.
import { connectedShooter } from './grid.js';

// Only recently-created bonds can start a contact match. This prevents
// pre-existing groups from randomly popping as the physics engine ticks.
// Returns distinct, whole same-colour groups (never double-count overlaps).
export function findContactMatches(board, { phase = 0, layout, extraBonds = new Set(),
  newContacts = new Set() } = {}) {
  const checked = new Set();
  const groups = [];
  for (const bond of newContacts) {
    const [a, b] = bond.split('|');
    if (!board.has(a) || !board.has(b) || board.get(a) !== board.get(b)) continue;
    if (checked.has(a) || checked.has(b)) continue;
    const [row, col] = a.split(',').map(Number);
    const connected = connectedShooter(board, row, col, phase, true, layout, extraBonds);
    for (const [r,c] of connected) checked.add(`${r},${c}`);
    if (connected.length >= 3) groups.push(connected);
  }
  return groups;
}
