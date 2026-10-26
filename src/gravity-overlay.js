// Canvas-only support wires/strain overlay for the swinging demonstration.
// No physics here; all endpoints use the actual live positions from sway.js.
import { RADIUS } from './config.js';
import { shooterNeighbours, cellKey } from './grid.js';
import { bubblePosition } from './positions.js';
import { gravitySupportMarkers } from './gravity-hints.js';

export function drawGravitySupportOverlay(ctx, state, seconds, reducedMotion = false) {
  const markers = gravitySupportMarkers(state.board, state.phase, state.layout, state.attachedPositions);
  const weakCells = new Set();
  for (const mark of markers.filter(mark => mark.warning)) {
    // Find the dangling structure anchored by this roof bubble. The lab's
    // chains are arranged by region in the model, not fixed screen labels.
    const start = mark.anchor;
    const visited = new Set([start]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const key = queue[i];
      if (key !== start) weakCells.add(key);
      const [r, c] = key.split(',').map(Number);
      for (const [nr, nc] of shooterNeighbours(state.board, r, c, state.phase, state.layout)) {
        const next = cellKey(nr, nc);
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
  }

  // Draw real links between bubbles, following their current coordinates.
  // The moving chain is visually connected to its fixed ceiling pivot.
  ctx.save();
  ctx.lineCap = 'round';
  for (const key of state.board.keys()) {
    const [r, c] = key.split(',').map(Number);
    const a = bubblePosition(state, r, c);
    for (const [nr, nc] of shooterNeighbours(state.board, r, c, state.phase, state.layout)) {
      const other = cellKey(nr, nc);
      if (key >= other) continue; // Draw each connection just once.
      const b = bubblePosition(state, nr, nc);
      ctx.strokeStyle = weakCells.has(key) || weakCells.has(other) ? 'rgba(255,184,91,.68)' : 'rgba(102,229,213,.42)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();

  for (const mark of markers) {
    const danger = mark.warning;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(seconds * 5) * .1;
    const stroke = danger ? '#ffbf61' : '#72f4de';
    ctx.save();
    ctx.shadowColor = stroke;
    ctx.shadowBlur = danger ? (reducedMotion ? 6 : 12 * pulse) : 5;
    ctx.lineWidth = danger ? 3.5 : 2;
    ctx.strokeStyle = stroke;
    ctx.setLineDash(danger ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(mark.start.x, mark.start.y);
    ctx.lineTo(mark.end.x, mark.end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(mark.start.x, mark.start.y, RADIUS + 4 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
