// Subtle visible bonds for attached bubbles. This layer never changes
// collisions or topology: it reads the SAME positions as the bubble renderer.
import { RADIUS } from './config.js';
import { shooterNeighbours, cellKey } from './grid.js';
import { bubblePosition } from './positions.js';

export function drawAttachmentLinks(ctx, state) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const key of state.board.keys()) {
    const [row, col] = key.split(',').map(Number);
    const a = bubblePosition(state, row, col);
    for (const [nr, nc] of shooterNeighbours(state.board, row, col, state.phase, state.layout)) {
      const other = cellKey(nr, nc);
      if (key >= other) continue;
      const b = bubblePosition(state, nr, nc);
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      // Threads matter mainly when the joint stretches a little.
      if (distance <= 2 * RADIUS - 1) continue;
      const excess = Math.min(1, Math.max(0, (distance - 2 * RADIUS + 1) / 9));
      ctx.strokeStyle = `rgba(185,235,255,${.22 + excess * .44})`;
      ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  ctx.restore();
}
