import { WIDTH, HEIGHT, RADIUS, SWATCHES } from './config.js';
import { shooterPosition, shotBubbleCollision } from './grid.js';
import { drawGravitySupportOverlay } from './gravity-overlay.js';
import { popPosition, popGroup } from './game.js';

const shade = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16);
  const channel = shift => Math.max(0, Math.min(255, ((n >> shift) & 255) + amount));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
};

function roundRect(ctx, x, y, width, height, radius, colour) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = colour;
  ctx.fill();
}

function paintBubble(ctx, x, y, colour, radius = RADIUS, highlight = false) {
  const base = SWATCHES[colour] ?? colour;
  ctx.save();
  if (highlight) {
    ctx.shadowColor = base;
    ctx.shadowBlur = 21;
  } else {
    ctx.shadowColor = '#030d44';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 3;
  }
  const gradient = ctx.createRadialGradient(x - radius * .36, y - radius * .48, radius * .03, x + radius * .18, y + radius * .25, radius * 1.26);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(.09, shade(base, 90));
  gradient.addColorStop(.38, shade(base, 17));
  gradient.addColorStop(.76, base);
  gradient.addColorStop(1, shade(base, -67));
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.arc(x, y, radius - .8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.47)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x - radius * .28, y - radius * .45, radius * .34, radius * .2, -.65, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x + radius * .43, y + radius * .4, radius * .085, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.43)'; ctx.fill();
  // Curved glass reflection and a thin bright edge add an arcade-toy finish.
  ctx.beginPath();
  ctx.arc(x - radius * .06, y - radius * .04, radius * .75, 3.45, 4.95);
  ctx.strokeStyle = 'rgba(255,255,255,.26)';
  ctx.lineWidth = Math.max(1, radius * .065);
  ctx.stroke();
  ctx.restore();
}

// Gradient glass bubbles are expensive to rebuild dozens of times every
// frame. Paint each colour/style once, then animate lightweight bitmaps.
const bubbleSprites = new Map();
function bubble(ctx, x, y, colour, radius = RADIUS, highlight = false, opacity = 1) {
  const id = `${colour}:${radius}:${highlight}`;
  let sprite = bubbleSprites.get(id);
  if (!sprite && typeof document !== 'undefined') {
    const padding = highlight ? 30 : 14;
    const size = Math.ceil((radius + padding) * 2);
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    paintBubble(canvas.getContext('2d'),size/2,size/2,colour,radius,highlight);
    sprite = {canvas,padding,size};
    bubbleSprites.set(id,sprite);
  }
  if (!sprite) { paintBubble(ctx,x,y,colour,radius,highlight); return; }
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.drawImage(sprite.canvas,x-sprite.size/2,y-sprite.size/2);
  ctx.restore();
}

function bombMark(ctx, x, y, seconds) {
  const beat = (Math.sin(seconds * 5 + x * .07) + 1) * .5;
  ctx.save();
  ctx.shadowBlur = 13 + beat * 10;
  ctx.shadowColor = '#ffe59e';
  ctx.fillStyle = '#36234e';
  ctx.strokeStyle = '#ffe296';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y + 2, 11.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffdb83'; ctx.lineWidth = 2.7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 5, y - 9); ctx.quadraticCurveTo(x + 8, y - 17, x + 13, y - 16); ctx.stroke();
  star(ctx, x + 15, y - 17, 4.1 + beat * 1.8, .92, '#fff0ae');
  star(ctx, x - 1, y + 2, 5.7, 1, '#ffe39c');
  ctx.restore();
}

function star(ctx, x, y, radius, alpha = 1, colour = '#c5d9ff') {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - radius); ctx.quadraticCurveTo(x + radius * .13, y - radius * .13, x + radius, y);
  ctx.quadraticCurveTo(x + radius * .13, y + radius * .13, x, y + radius);
  ctx.quadraticCurveTo(x - radius * .13, y + radius * .13, x - radius, y);
  ctx.quadraticCurveTo(x - radius * .13, y - radius * .13, x, y - radius); ctx.fill();
  ctx.restore();
}

function background(ctx, seconds, layout) {
  const { width, height } = layout;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#263b81');
  gradient.addColorStop(.44, '#1b2d70');
  gradient.addColorStop(1, '#171746');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width / 2, height * .32, 0, width / 2, height * .32, height * .67);
  glow.addColorStop(0, 'rgba(94,113,225,.3)');
  glow.addColorStop(1, 'rgba(51,73,173,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  // Low-contrast drifting orbs give the still board a lively backdrop.
  for (let i = 0; i < 13; i++) {
    const x = 25 + (i * 97) % (width - 48) + Math.sin(seconds * .37 + i) * 11;
    const y = ((i * 121 - seconds * (7 + i % 4 * 2)) % (height + 90) + height + 90) % (height + 90) - 45;
    const radius = 5 + (i * 7) % 12;
    ctx.strokeStyle = `rgba(180,196,255,${.055 + i % 3 * .025})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - radius * .23, y - radius * .35, radius * .2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.055)'; ctx.fill();
  }
  ctx.strokeStyle = 'rgba(188,200,255,.037)';
  ctx.lineWidth = 1;
  for (let x = 15; x < width; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 12; y < height; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  const stars = [[30,150,2.6],[width-40,92,3],[54,321,1.8],[width-44,440,2.3],[115,height-105,2.2],[width-77,height-98,1.5],[width*.47,51,1.6],[width*.75,264,1.9]];
  for (let i = 0; i < stars.length; i++) {
    const [x,y,r] = stars[i];
    star(ctx,x,y,r,.17 + (Math.sin(seconds * 1.5 + i * 1.8) + 1) * .12);
  }
  const floor = ctx.createLinearGradient(0, height-120, 0, height);
  floor.addColorStop(0,'rgba(42,25,97,0)');
  floor.addColorStop(1,'rgba(18,9,51,.78)');
  ctx.fillStyle = floor; ctx.fillRect(0, height-120, width, 120);
}

function label(ctx, text, x, y, colour = '#93a9e6', size = 12, align = 'center') {
  ctx.save();
  ctx.font = `900 ${size}px Nunito, Trebuchet MS, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function aimGuide(ctx, state) {
  // This uses the *same* collision distance as the moving shot, including
  // near-grazes and wall bounces, so the guide never lies about a clear gap.
  const {width,left,top,launchY} = state.layout;
  const dx = Math.sin(state.angle) * 5;
  const dy = -Math.cos(state.angle) * 5;
  let x = width / 2;
  let y = launchY;
  let vx = dx;
  const trail = [];
  for (let i = 0; i < 300; i++) {
    x += vx; y += dy;
    const low = left + RADIUS, high = width - low;
    if (x < low) { x = low + (low - x); vx = Math.abs(vx); }
    if (x > high) { x = high - (x - high); vx = -Math.abs(vx); }
    trail.push([x,y]);
    if (y <= top + RADIUS) break;
    if (shotBubbleCollision(state.board,x,y,state.phase,state.layout)) break;
  }
  for (let i = 5; i < trail.length; i += 5) {
    const [px,py] = trail[i];
    const scale = 1-i/trail.length;
    ctx.beginPath(); ctx.arc(px,py,2.5*scale + 1,0,Math.PI*2);
    ctx.fillStyle = `rgba(245,240,255,${.18+scale*.52})`;
    ctx.fill();
  }
  if (trail.length) {
    const [lastX,lastY] = trail[trail.length-1];
    ctx.beginPath(); ctx.arc(lastX,lastY,13,0,Math.PI*2);
    ctx.strokeStyle = 'rgba(255,246,208,.5)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
  }
}

function shooter(ctx, state, seconds, reducedMotion = false) {
  const {width,height,launchY} = state.layout;
  const chainActive = state.comboLevel >= 2 && state.comboDisplay > 0;
  const bannerWidth = state.variant === 'puzzle' ? 310 : state.variant === 'lab' ? 330 : chainActive ? 235 : 227;
  roundRect(ctx, (width - bannerWidth)/2, 17, bannerWidth, 24, 12,
    chainActive ? 'rgba(225,61,154,.65)' : 'rgba(13,20,72,.4)');
  label(ctx, state.variant === 'lab' ? 'GRAVITY LAB · SUPPORT EXPERIMENT' : chainActive ? `EXPLOSIVE COMBO ×${state.comboLevel}` : state.variant === 'puzzle' ? `PUZZLE ${state.puzzleIndex + 1} · ${state.puzzleName.toUpperCase()}` : 'MATCH 3+ · DETONATE BOMBS', width/2, 29,
    chainActive ? '#fff0b3' : '#acbdfa', 11);
  ctx.strokeStyle = `rgba(255,148,198,${.17 + Math.sin(seconds * 2) * .045})`; ctx.lineWidth = 1.3;
  ctx.setLineDash([8,10]);
  ctx.beginPath(); ctx.moveTo(30,launchY-47); ctx.lineTo(width-30,launchY-47); ctx.stroke();
  ctx.setLineDash([]);
  if (state.variant !== 'lab' && !state.projectile && !state.falling.length && !state.pendingBombs.length && state.status === 'playing') aimGuide(ctx,state);
  for (const [k,colour] of state.board) {
    const [row,col] = k.split(',').map(Number);
    const {x,y:baseY} = shooterPosition(row,col,state.phase,state.layout);
    const entrance = state.introTime ? Math.min(1,Math.max(0,(.78-state.introTime-row*.052)/.3)) : 1;
    const y = baseY - state.rowShift - Math.pow(1 - entrance, 2) * 90;
    const power = state.wobble.get(k) ?? 0;
    const squash = 1 + Math.sin((1-power)*24)*power*.07;
    ctx.save(); ctx.translate(x,y); ctx.scale(squash,1+(1-squash)*.7);
    bubble(ctx,0,0,colour,RADIUS,false,Math.max(.1,entrance));
    if (state.bombs.has(k)) bombMark(ctx,0,0,seconds);
    ctx.restore();
  }
  if (state.variant === 'lab') drawGravitySupportOverlay(ctx, state, seconds, reducedMotion);
  // Detached bubbles no longer disappear: gravity takes over until they burst.
  for (const falling of state.falling) {
    ctx.save();
    ctx.translate(falling.x, falling.y);
    ctx.rotate(falling.rotation);
    bubble(ctx, 0, 0, falling.colour, RADIUS, true);
    if (falling.bomb) bombMark(ctx,0,0,seconds);
    star(ctx, -12, 14, 3.1, .75, '#fff5df');
    ctx.restore();
  }
  if (state.variant !== 'lab') {
  const x = width/2;
  ctx.save();
  ctx.translate(x,launchY+8+state.recoil*7);
  ctx.rotate(state.angle);
  roundRect(ctx,-25,-22,50,61,24,'#654394');
  roundRect(ctx,-17,-29,34,54,15,'#9071c6');
  roundRect(ctx,-9,-33,18,40,9,'#c1a6ef');
  ctx.restore();
  ctx.fillStyle='#1d1245'; ctx.beginPath(); ctx.ellipse(x,launchY+40,48,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#805baa'; ctx.beginPath();ctx.ellipse(x,launchY+34,43,12,0,0,Math.PI*2);ctx.fill();
  bubble(ctx,x,launchY+state.recoil*5,state.current,21);
  if (state.projectile) {
    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = SWATCHES[state.projectile.colour];
    bubble(ctx,state.projectile.x,state.projectile.y,state.projectile.colour,21,true);
    ctx.restore();
  }
  label(ctx,state.variant === 'puzzle' ? `${state.bombs.size} TARGET${state.bombs.size===1?'':'S'} REMAINING` : 'BUBBLE LAUNCHER',x,height-17,'#a596d1',10);
  } else {
    label(ctx, state.gravityLabUsed ? 'PRESS LOAD TEST BOARD TO TRY AGAIN' : 'PRESS GRAVITY SURGE TO TEST SUPPORTS',
      width / 2, height - 17, '#e7d5ff', 11);
  }
}

function popBoard(ctx, state, hover) {
  roundRect(ctx,110,24,WIDTH-220,24,12,'rgba(13,20,72,.4)');
  label(ctx, 'MATCH 2+ TO POP',WIDTH/2,36,'#acbdfa',11);
  roundRect(ctx,20,70,WIDTH-40,508,17,'rgba(9,21,71,.25)');
  let hovered = [];
  if (hover && state.status === 'playing') hovered = popGroup(state.board, ...hover);
  const hoverKeys = hovered.length>=2 ? new Set(hovered.map(([r,c])=>`${r},${c}`)) : new Set();
  for (let r=0;r<state.board.length;r++) for(let c=0;c<state.board[r].length;c++) {
    const colour = state.board[r][c];
    if (!colour) continue;
    const {x,y}=popPosition(r,c);
    bubble(ctx,x,y,colour,20,hoverKeys.has(`${r},${c}`),hoverKeys.has(`${r},${c}`)?1:.96);
  }
  if (hoverKeys.size) {
    roundRect(ctx,WIDTH/2-94,585,188,41,21,'rgba(248,93,168,.21)');
    label(ctx,`POP ${hoverKeys.size}  ·  +${hoverKeys.size*hoverKeys.size*5}`, WIDTH/2,605,'#ffd2e9',17);
  } else {
    label(ctx,'TAP A GROUP OF MATCHING BUBBLES',WIDTH/2,607,'#aab3ea',12);
  }
  label(ctx,'THE BIGGER THE GROUP, THE BIGGER THE SCORE!',WIDTH/2,657,'#898dc9',10);
}

function effects(ctx,state) {
  for (const wave of state.shockwaves) {
    const alpha = Math.max(0, wave.life / wave.maxLife);
    ctx.save();
    const aura = ctx.createRadialGradient(wave.x,wave.y,2,wave.x,wave.y,wave.radius);
    aura.addColorStop(0,`rgba(255,254,231,${.33*alpha})`);
    aura.addColorStop(.35,`rgba(255,183,75,${.26*alpha})`);
    aura.addColorStop(1,'rgba(255,90,115,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(wave.x,wave.y,wave.radius,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(255,239,175,${.88*alpha})`;
    ctx.lineWidth = 3.5 + 4 * alpha;
    ctx.shadowBlur = 23; ctx.shadowColor = '#ffca68';
    ctx.stroke();
    ctx.restore();
  }
  for (const pulse of state.pulses) {
    const strength = Math.max(0, pulse.life / pulse.maxLife);
    ctx.save();
    ctx.globalAlpha = strength * .73;
    ctx.strokeStyle = SWATCHES[pulse.colour] ?? pulse.colour;
    ctx.lineWidth = 1.6 + strength * 3.1;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  for(const p of state.effects) {
    const alpha = Math.max(0,p.life/p.maxLife);
    const colour = SWATCHES[p.colour] ?? p.colour;
    if (p.kind === 'star') {
      star(ctx,p.x,p.y,p.size * (1.2 + (1-alpha)),alpha,colour);
    } else {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = colour;
      ctx.shadowColor = colour; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size * (.5 + alpha*.5),0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
  for (const callout of state.callouts) {
    const alpha = Math.min(1,callout.life * 3);
    const colour = callout.colour === 'pink' ? '#ffb1dc' : '#ffe58c';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${callout.text.length > 13 ? 17 : 24}px Baloo 2, Trebuchet MS, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2c1b65';
    ctx.shadowBlur = 12; ctx.shadowColor = colour;
    ctx.strokeText(callout.text,callout.x,callout.y);
    ctx.fillStyle = colour; ctx.fillText(callout.text,callout.x,callout.y);
    ctx.restore();
  }
}

export function draw(ctx, state, hover, seconds=0, reducedMotion=false) {
  const layout = state.layout ?? {width:WIDTH,height:HEIGHT};
  ctx.clearRect(0,0,layout.width,layout.height);
  background(ctx,reducedMotion ? 0 : seconds,layout);
  ctx.save();
  if (!reducedMotion && state.shake > 0) {
    const strength = state.shake * 5;
    ctx.translate(Math.sin(seconds*89)*strength, Math.cos(seconds*71)*strength*.66);
  }
  if(state.mode==='shooter') shooter(ctx,state,seconds,reducedMotion);
  else popBoard(ctx,state,hover);
  effects(ctx,state);
  ctx.restore();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,241,255,${state.flash * .18})`;
    ctx.fillRect(0,0,layout.width,layout.height);
  }
}
