// Translucent elastic gel between attached bubbles. All geometry uses the
// same physical centres as collisions. Draw this BEHIND the bubbles.
import { RADIUS } from './config.js';
import { bondEdges, bondId } from './physical-bonds.js';
import { bubblePosition } from './positions.js';

// Only the exposed space BETWEEN bubble rims needs a visible connection.
// A small sideways bow gives a stretchy attachment shape, not a rigid rod.
export function connectionThreadGeometry(start, end, radius = RADIUS) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance < .01) return null;
  const gap = distance - 2 * radius;
  if (gap <= 1.5) return null;
  const ux = dx / distance, uy = dy / distance;
  const inset = radius - 2.5; // Slightly overlap the sprites for a seamless join.
  const from = { x: start.x + ux * inset, y: start.y + uy * inset };
  const to = { x: end.x - ux * inset, y: end.y - uy * inset };
  const bend = Math.min(6.5, Math.max(0, gap) * .22);
  return {
    from, to, gap,
    control: {
      x: (from.x + to.x) / 2 - uy * bend,
      y: (from.y + to.y) / 2 + ux * bend,
    },
  };
}

export function drawAttachmentLinks(ctx, state) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [a, b] of bondEdges(state.board, state.phase, state.layout, state.extraBonds)) {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    const link = connectionThreadGeometry(
      bubblePosition(state, ar, ac), bubblePosition(state, br, bc));
    if (!link) continue;
    const fresh = state.extraBonds?.has(bondId(a, b));
    const stretch = Math.min(1, link.gap / 25);
    // The dim broad pass is gel, the narrow pass a soft pearly glint.
    // Increasing tension makes the connection a little more visible.
    ctx.beginPath();
    ctx.moveTo(link.from.x, link.from.y);
    ctx.quadraticCurveTo(link.control.x, link.control.y, link.to.x, link.to.y);
    ctx.strokeStyle = fresh
      ? `rgba(90,220,179,${.16 + stretch * .13})`
      : `rgba(129,194,222,${.10 + stretch * .13})`;
    ctx.lineWidth = 6.2;
    ctx.stroke();
    ctx.strokeStyle = fresh
      ? `rgba(166,246,220,${.30 + stretch * .19})`
      : `rgba(205,226,240,${.20 + stretch * .19})`;
    ctx.lineWidth = 2.0 + stretch * .7;
    ctx.stroke();
  }
  ctx.restore();
}
