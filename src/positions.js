// The single position lookup used by drawing, aiming, impacts and shots.
// Resting lattice coordinates still own adjacency and match-three rules.
import { cellKey, shooterPosition } from './grid.js';

export function bubblePosition(state, row, col) {
  return state.attachedPositions?.get(cellKey(row, col))
    ?? shooterPosition(row, col, state.phase, state.layout);
}
