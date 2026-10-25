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
    ctx.shadowBlur = 0;
    ctx.font = 'bold 10px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = danger ? `LOAD ${mark.weight}` : 'BRACED';
    const x = mark.start.x;
    const y = mark.start.y - RADIUS - 18;
    const half = danger ? 27 : 29;
    ctx.fillStyle = 'rgba(15,18,55,.92)';
    ctx.fillRect(x - half, y - 8, half * 2, 16);
    ctx.fillStyle = stroke;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}
