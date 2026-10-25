// Canvas-only diagnostic overlay. Game rules and physics never import this.
import { RADIUS } from './config.js';
import { gravitySupportMarkers } from './gravity-hints.js';

export function drawGravitySupportOverlay(ctx, state, seconds, reducedMotion = false) {
  const markers = gravitySupportMarkers(state.board, state.phase, state.layout);
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
    // Keep warnings graphical; labels up here would overlap the game banner.
    // The accessible HTML panel explains amber vs mint and the supported load.
    ctx.restore();
  }
}
