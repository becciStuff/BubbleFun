// Keep the same physical bubbles alive when Arcade inserts a new ceiling row.
// Their lattice addresses change, but their offsets, velocities and sticky
// links do not disappear. The visual rowShift animates the board downward.
import { ROW_HEIGHT } from './config.js';
import { bondId } from './physical-bonds.js';

export const shiftedCellKey = key => {
  const [row, col] = key.split(',').map(Number);
  return `${row + 1},${col}`;
};

function shiftedLinks(links = new Set()) {
  return new Set([...links].map(id => {
    const [a, b] = id.split('|');
    return bondId(shiftedCellKey(a), shiftedCellKey(b));
  }));
}

export function shiftAttachedPhysicsForNewRow(state) {
  // Only call this after the old row cells have been translated one row,
  // before the transient visual row-shift begins.
  state.swayDynamics = new Map([...state.swayDynamics ?? []]
    .map(([key, motion]) => [shiftedCellKey(key), { ...motion }]));
  state.attachedPositions = new Map([...state.attachedPositions ?? []]
    .map(([key, p]) => [shiftedCellKey(key), { x: p.x, y: p.y + ROW_HEIGHT }]));
  state.extraBonds = shiftedLinks(state.extraBonds);
  state.newContactBonds = shiftedLinks(state.newContactBonds);
  state.separatedBonds = shiftedLinks(state.separatedBonds);
  state.wobble = new Map([...state.wobble ?? []]
    .map(([key, motion]) => [shiftedCellKey(key), motion]));
}
