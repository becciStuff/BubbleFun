// Marker geometry follows the SAME live positions as the hanging bubbles.
// The ceiling support graph still owns colour-independent anchor decisions.
import { MOBILE_LAYOUT } from './config.js';
import { analyseSupports } from './supports.js';
import { cellKey, shooterNeighbours, shooterPosition } from './grid.js';

export function gravitySupportMarkers(board, phase = 0, layout = MOBILE_LAYOUT, positions = null) {
  const analysis = analyseSupports(board, { phase, layout });
  const markers = [];
  for (const region of analysis.regions) {
    const cells = new Set(region.cells.map(([row, col]) => cellKey(row, col)));
    for (const anchor of region.anchors) {
      const [row, col] = anchor.split(',').map(Number);
      const linked = shooterNeighbours(board, row, col, phase, layout)
        .find(([r, c]) => cells.has(cellKey(r, c)));
      if (!linked) continue;
      const start = positions?.get(anchor) ?? shooterPosition(row, col, phase, layout);
      const linkedKey = cellKey(...linked);
      const end = positions?.get(linkedKey) ?? shooterPosition(...linked, phase, layout);
      markers.push({
        anchor, start, end, weight: region.weight,
        supports: region.supportCount,
        warning: region.supportCount === 1 && region.weight * 1.5 / region.strength > 1,
      });
    }
  }
  return markers;
}
