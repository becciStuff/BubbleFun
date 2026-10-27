// Physical contact matching: only a NEW same-colour connection that joins
// previously SEPARATE colour groups may trigger a pop. Merely bouncing or
// adding a redundant link inside an already-connected group must not pop it.
import { cellKey, connectedShooter } from './grid.js';

// Pure analysis. "newContacts" are freshly created physical sticky links.
// Compare the colour connectivity BEFORE these links were introduced with
// the full graph AFTER they were introduced. This also handles multiple
// new bonds in one frame without double counting overlapping groups.
export function findContactMatches(board, { phase = 0, layout, extraBonds = new Set(),
  newContacts = new Set() } = {}) {
  const previousBonds = new Set(
    [...extraBonds].filter(bond => !newContacts.has(bond)));
  const oldComponentByCell = new Map();

  function previousComponent(cell) {
    if (!oldComponentByCell.has(cell)) {
      const [row, col] = cell.split(',').map(Number);
      const members = connectedShooter(board, row, col, phase, true, layout, previousBonds);
      const component = new Set(members.map(([r,c]) => cellKey(r,c)));
      for (const member of component) oldComponentByCell.set(member, component);
    }
    return oldComponentByCell.get(cell);
  }

  const qualifying = new Set();
  for (const bond of newContacts) {
    const [a, b] = bond.split('|');
    if (!board.has(a) || !board.has(b) || board.get(a) !== board.get(b)) continue;
    // Both endpoints already belonged to the same colour group BEFORE
    // this contact. A re-touch or redundant cycle is NOT a new match.
    if (previousComponent(a).has(b)) continue;
    qualifying.add(a);
  }

  const checked = new Set();
  const groups = [];
  for (const cell of qualifying) {
    if (checked.has(cell)) continue;
    const [row, col] = cell.split(',').map(Number);
    const connected = connectedShooter(board, row, col, phase, true, layout, extraBonds);
    for (const [r,c] of connected) checked.add(cellKey(r,c));
    if (connected.length >= 3) groups.push(connected);
  }
  return groups;
}
