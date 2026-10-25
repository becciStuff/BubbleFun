// Visual diagnostics sourced from the same ceiling support graph as physics.
// Positions are the existing fixed shooter geometry; no simulated sway in G2.
import { MOBILE_LAYOUT } from './config.js';
import { analyseSupports } from './supports.js';
import { cellKey, shooterNeighbours, shooterPosition } from './grid.js';

export function gravitySupportMarkers(board, phase = 0, layout = MOBILE_LAYOUT) {
  const analysis = analyseSupports(board, { phase, layout });
  const markers = [];
  for (const region of analysis.regions) {
    const cells = new Set(region.cells.map(([row, col]) => cellKey(row, col)));
    for (const anchor of region.anchors) {
      const [row, col] = anchor.split(',').map(Number);
      const linked = shooterNeighbours(board, row, col, phase, layout)
        .find(([r, c]) => cells.has(cellKey(r, c)));
      if (!linked) continue;
      const start = shooterPosition(row, col, phase, layout);
      const end = shooterPosition(...linked, phase, layout);
      markers.push({
        anchor, start, end, weight: region.weight,
        supports: region.supportCount,
        warning: region.supportCount === 1 && region.weight * 1.5 / region.strength > 1,
      });
    }
  }
  return markers;
}
