// Draw real adhesive bonds from the same live centres as the hit predicate.
// Newly formed sticky contacts are not cosmetic: they are also used by the
// physics springs, colour matches and ceiling-support graph.
import { RADIUS } from './config.js';
import { bondEdges, bondId } from './physical-bonds.js';
import { bubblePosition } from './positions.js';

export function drawAttachmentLinks(ctx, state) {
  ctx.save();
  ctx.lineCap='round';
  for (const [a,b] of bondEdges(state.board,state.phase,state.layout,state.extraBonds)) {
    const [ar,ac]=a.split(',').map(Number),[br,bc]=b.split(',').map(Number);
    const start=bubblePosition(state,ar,ac),end=bubblePosition(state,br,bc);
    const dist=Math.hypot(start.x-end.x,start.y-end.y);
    const extra=state.extraBonds?.has(bondId(a,b));
    const stretch=Math.min(1,Math.max(0,(dist-RADIUS*2+1)/9));
    // Thin threads stay visible when bubbles pull apart; freshly stuck links
    // get a more vivid hue to make the new attachment legible.
    if (!extra && dist < RADIUS*2-1) continue;
    ctx.strokeStyle=extra ? 'rgba(126,247,208,.7)' : `rgba(185,235,255,${.19+stretch*.56})`;
    ctx.lineWidth=extra ? 4.3 : 3.2;
    ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke();
  }
  ctx.restore();
}
