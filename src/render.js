import {
  WIDTH, HEIGHT, RADIUS, LEFT, TOP, LAUNCH_Y, ROW_HEIGHT,
  SWATCHES, shooterPosition, shooterColumns, popPosition, popGroup,
} from './game.js';

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

function bubble(ctx, x, y, colour, radius = RADIUS, highlight = false, opacity = 1) {
  const base = SWATCHES[colour] ?? colour;
  ctx.save();
  ctx.globalAlpha = opacity;
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

function star(ctx, x, y, radius, alpha = 1, colour = '#c5d9ff') {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - radius); ctx.quadraticCurveTo(x + radius * .13, y - radius * .13, x + radius, y);
  ctx.quadraticCurveTo(x + radius * .13, y + radius * .13, x, y + radius);
  ctx.quadraticCurveTo(x - radius * .13, y + radius * .13, x - radius, y);
  ctx.quadraticCurveTo(x - radius * .13, y - radius * .13, x, y - radius); ctx.fill();
  ctx.restore();
}

function background(ctx, seconds) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#263b81');
  gradient.addColorStop(.44, '#1b2d70');
  gradient.addColorStop(1, '#171746');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH / 2, 180, 0, WIDTH / 2, 180, 390);
  glow.addColorStop(0, 'rgba(94,113,225,.3)');
  glow.addColorStop(1, 'rgba(51,73,173,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Low-contrast drifting orbs give the still board a lively backdrop.
  for (let i = 0; i < 13; i++) {
    const x = 25 + (i * 97) % 385 + Math.sin(seconds * .37 + i) * 11;
    const y = ((i * 121 - seconds * (7 + i % 4 * 2)) % (HEIGHT + 90) + HEIGHT + 90) % (HEIGHT + 90) - 45;
    const radius = 5 + (i * 7) % 12;
    ctx.strokeStyle = `rgba(180,196,255,${.055 + i % 3 * .025})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - radius * .23, y - radius * .35, radius * .2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.055)'; ctx.fill();
  }
  ctx.strokeStyle = 'rgba(188,200,255,.037)';
  ctx.lineWidth = 1;
  for (let x = 15; x < WIDTH; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
  }
  for (let y = 12; y < HEIGHT; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }
  const stars = [[30,150,2.6],[389,92,3],[54,321,1.8],[388,440,2.3],[115,575,2.2],[355,602,1.5],[204,51,1.6],[323,264,1.9]];
  for (let i = 0; i < stars.length; i++) {
    const [x,y,r] = stars[i];
    star(ctx,x,y,r,.17 + (Math.sin(seconds * 1.5 + i * 1.8) + 1) * .12);
  }
  const floor = ctx.createLinearGradient(0, 580, 0, HEIGHT);
  floor.addColorStop(0,'rgba(42,25,97,0)');
  floor.addColorStop(1,'rgba(18,9,51,.78)');
  ctx.fillStyle = floor; ctx.fillRect(0, 580, WIDTH, 120);
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
  // Follow a thin, wall-bouncing trajectory until it touches the top or a bubble.
  const dx = Math.sin(state.angle) * 5;
  const dy = -Math.cos(state.angle) * 5;
  let x = WIDTH / 2;
  let y = LAUNCH_Y - 28;
  let vx = dx;
  const trail = [];
  for (let i = 0; i < 160; i++) {
    x += vx; y += dy;
    if (x < LEFT + RADIUS || x > WIDTH - LEFT - RADIUS) {
      vx = -vx;
      x = Math.max(LEFT + RADIUS, Math.min(WIDTH - LEFT - RADIUS, x));
    }
    trail.push([x,y]);
    if (y <= TOP + RADIUS) break;
    let hit = false;
    for (const [k] of state.board) {
      const [row,col] = k.split(',').map(Number);
      const p = shooterPosition(row,col,state.phase);
      if (Math.hypot(x-p.x,y-p.y) < RADIUS*2) { hit=true; break; }
    }
    if (hit) break;
  }
  for (let i = 5; i < trail.length; i += 5) {
    const [px,py] = trail[i];
    const scale = 1-i/trail.length;
    ctx.beginPath(); ctx.arc(px,py,2.5*scale + 1,0,Math.PI*2);
    ctx.fillStyle = `rgba(245,240,255,${.18+scale*.52})`;
    ctx.fill();
  }
}

function shooter(ctx, state, seconds) {
  const chainActive = state.comboLevel >= 2 && state.comboDisplay > 0;
  roundRect(ctx, chainActive ? 119 : 100, 17, chainActive ? WIDTH - 238 : WIDTH - 200, 24, 12,
    chainActive ? 'rgba(225,61,154,.65)' : 'rgba(13,20,72,.4)');
  label(ctx, chainActive ? `CHAIN REACTION ×${state.comboLevel}` : 'MATCH 3+ TO POP', WIDTH/2, 29,
    chainActive ? '#fff0b3' : '#acbdfa', 11);
  ctx.strokeStyle = `rgba(255,148,198,${.17 + Math.sin(seconds * 2) * .045})`; ctx.lineWidth = 1.3;
  ctx.setLineDash([8,10]);
  ctx.beginPath(); ctx.moveTo(30,LAUNCH_Y-47); ctx.lineTo(WIDTH-30,LAUNCH_Y-47); ctx.stroke();
  ctx.setLineDash([]);
  if (!state.projectile && !state.falling.length && state.status === 'playing') aimGuide(ctx,state);
  for (const [k,colour] of state.board) {
    const [row,col] = k.split(',').map(Number);
    const {x,y} = shooterPosition(row,col,state.phase);
    bubble(ctx,x,y,colour);
  }
  // Detached bubbles no longer disappear: gravity takes over until they burst.
  for (const falling of state.falling) {
    ctx.save();
    ctx.translate(falling.x, falling.y);
    ctx.rotate(falling.rotation);
    bubble(ctx, 0, 0, falling.colour, RADIUS, true);
    star(ctx, -12, 14, 3.1, .75, '#fff5df');
    ctx.restore();
  }
  const x = WIDTH/2;
  ctx.save();
  ctx.translate(x,LAUNCH_Y+8+state.recoil*7);
  ctx.rotate(state.angle);
  roundRect(ctx,-25,-22,50,61,24,'#654394');
  roundRect(ctx,-17,-29,34,54,15,'#9071c6');
  roundRect(ctx,-9,-33,18,40,9,'#c1a6ef');
  ctx.restore();
  ctx.fillStyle='#1d1245'; ctx.beginPath(); ctx.ellipse(x,LAUNCH_Y+40,48,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#805baa'; ctx.beginPath();ctx.ellipse(x,LAUNCH_Y+34,43,12,0,0,Math.PI*2);ctx.fill();
  bubble(ctx,x,LAUNCH_Y+state.recoil*5,state.current,21);
  if (state.projectile) {
    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = SWATCHES[state.projectile.colour];
    bubble(ctx,state.projectile.x,state.projectile.y,state.projectile.colour,21,true);
    ctx.restore();
  }
  label(ctx,'BUBBLE LAUNCHER',x,HEIGHT-17,'#8e85c8',10);
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
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  background(ctx,reducedMotion ? 0 : seconds);
  ctx.save();
  if (!reducedMotion && state.shake > 0) {
    const strength = state.shake * 5;
    ctx.translate(Math.sin(seconds*89)*strength, Math.cos(seconds*71)*strength*.66);
  }
  if(state.mode==='shooter') shooter(ctx,state,seconds);
  else popBoard(ctx,state,hover);
  effects(ctx,state);
  ctx.restore();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,241,255,${state.flash * .18})`;
    ctx.fillRect(0,0,WIDTH,HEIGHT);
  }
}
