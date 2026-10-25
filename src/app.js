import {
  WIDTH, HEIGHT, SWATCHES, initialShooter, initialPop, fireShooter,
  aimShooter, stepGame, popAt, popCellAt,
} from './game.js';
import { draw } from './render.js';

const $ = id => document.getElementById(id);
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const states = { shooter: initialShooter(), pop: initialPop() };
let mode = 'shooter';
let hover = null;
let pointerDown = false;
let sound = false;
let audioContext = null;
let lastTime = 0;
const seenEvents = { shooter: 0, pop: 0 };
const best = {
  shooter: readBest('shooter'),
  pop: readBest('pop'),
};

function readBest(gameMode) {
  try { return Number(localStorage.getItem(`bubblefun-best-${gameMode}`)) || 0; }
  catch { return 0; }
}

function saveBest(gameMode, value) {
  try { localStorage.setItem(`bubblefun-best-${gameMode}`, String(value)); }
  catch { /* Private browsing may not permit local storage. */ }
}

function playSound(type) {
  if (!sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    const tones = {
      fire: [280, 400, .08], land: [205, 140, .11],
      pop: [590, 950, .17], drop: [320, 190, .19],
      win: [680, 1100, .35], lose: [230, 90, .4], finish: [380, 240, .25],
    };
    const [from, to, duration] = tones[type] ?? tones.pop;
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.type = type === 'pop' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    volume.gain.setValueAtTime(.0001, now);
    volume.gain.exponentialRampToValueAtTime(.075, now + .012);
    volume.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(volume).connect(audioContext.destination);
    oscillator.start(now); oscillator.stop(now + duration + .02);
  } catch { /* Audio is an enhancement, never a gameplay requirement. */ }
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * WIDTH / rect.width,
    y: (event.clientY - rect.top) * HEIGHT / rect.height,
  };
}

function updateTarget(event) {
  const point = pointFromEvent(event);
  if (mode === 'shooter') aimShooter(states.shooter, point.x, point.y);
  else hover = popCellAt(point.x, point.y);
  return point;
}

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  canvas.focus();
  pointerDown = true;
  canvas.setPointerCapture?.(event.pointerId);
  updateTarget(event);
  event.preventDefault();
});

canvas.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch' && !pointerDown) return;
  updateTarget(event);
});

canvas.addEventListener('pointerup', event => {
  if (!pointerDown) return;
  pointerDown = false;
  const { x, y } = updateTarget(event);
  if (mode === 'shooter') fireShooter(states.shooter);
  else {
    const cell = popCellAt(x, y);
    if (cell) {
      const count = popAt(states.pop, ...cell);
      if (count === 0 && states.pop.status === 'playing') announce('Find two or more connected bubbles of the same colour.');
    }
  }
  event.preventDefault();
});

canvas.addEventListener('pointercancel', () => { pointerDown = false; });
canvas.addEventListener('pointerleave', () => { if (mode === 'pop') hover = null; });

window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(event.target.tagName)) return;
  if (mode !== 'shooter' || states.shooter.status !== 'playing') return;
  if (event.key === 'ArrowLeft') { states.shooter.angle = Math.max(-1.15, states.shooter.angle - .085); event.preventDefault(); }
  if (event.key === 'ArrowRight') { states.shooter.angle = Math.min(1.15, states.shooter.angle + .085); event.preventDefault(); }
  if (event.code === 'Space') { fireShooter(states.shooter); event.preventDefault(); }
});

function setMode(nextMode) {
  if (nextMode !== 'shooter' && nextMode !== 'pop') return;
  mode = nextMode;
  hover = null;
  pointerDown = false;
  for (const button of document.querySelectorAll('.mode-card')) {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  const shooter = mode === 'shooter';
  canvas.setAttribute('aria-label', shooter
    ? 'Bubble Shooter playfield. Aim with a pointer and shoot, or use Left and Right arrow keys and Space.'
    : 'Bubble Pop playfield. Tap or click connected groups of two or more bubbles to pop them.');
  $('game-title').textContent = shooter ? 'Bubble Shooter' : 'Bubble Pop';
  $('turn-label').textContent = shooter ? 'NEXT ROW IN' : 'BUBBLES LEFT';
  $('next-area').hidden = !shooter;
  $('instructions-title').textContent = shooter ? 'Make your shot count.' : 'Find the big groups.';
  $('instructions-copy').textContent = shooter
    ? 'Aim at the bubbles above. Match three or more of the same colour to pop them and keep the ceiling at bay.'
    : 'Tap any connected group of two or more matching bubbles. They disappear, the rest fall, and empty columns slide together.';
  $('control-primary').textContent = shooter ? 'Move to aim' : 'Find matching neighbours';
  $('control-secondary').textContent = shooter ? 'Click or tap to shoot' : 'Click or tap a group to pop';
  $('control-keyboard').textContent = shooter ? 'Arrow keys + Space also work' : 'Bigger groups earn more points';
  $('tip-copy').textContent = shooter
    ? 'Pop a group holding other bubbles up and the loose ones fall too. Bonus points!'
    : 'A group of 5 earns much more than five groups of 2. Plan a few moves ahead!';
  announce(`${shooter ? 'Bubble Shooter' : 'Bubble Pop'} selected.`);
  updateUI();
}

function reset() {
  states[mode] = mode === 'shooter' ? initialShooter() : initialPop();
  seenEvents[mode] = 0;
  hover = null;
  announce('New game started.');
  updateUI();
}

function announce(message) { $('live-status').textContent = message; }

function putText(id, value) {
  const element = $(id);
  if (element.textContent !== String(value)) element.textContent = String(value);
}

function updateUI() {
  const state = states[mode];
  if (state.score > best[mode]) { best[mode] = state.score; saveBest(mode, state.score); }
  putText('score-value', state.score.toLocaleString('en-NZ'));
  putText('best-value', best[mode].toLocaleString('en-NZ'));
  if (mode === 'shooter') {
    putText('turns-value', `${state.shotsUntilRow} shot${state.shotsUntilRow === 1 ? '' : 's'}`);
    const orb = $('next-orb');
    if (orb.dataset.colour !== state.next) {
      orb.style.backgroundColor = SWATCHES[state.next];
      orb.style.backgroundImage = `radial-gradient(circle at 30% 22%, #fff, ${SWATCHES[state.next]} 38%, #442464 125%)`;
      orb.dataset.colour = state.next;
    }
  } else {
    putText('turns-value', state.board.flat().filter(Boolean).length);
  }
  const status = mode === 'shooter'
    ? (state.lastPop ? `${state.lastPop} popped! Keep going!` : 'Aim and shoot to match 3+')
    : (state.lastPop ? `${state.lastPop} popped! Nice one!` : 'Tap matching groups of 2+');
  putText('game-status', `✦ ${status}`);

  const overlay = $('result-overlay');
  const finished = state.status !== 'playing';
  overlay.classList.toggle('hidden', !finished);
  if (finished) {
    const victory = state.status === 'won';
    putText('result-title', victory ? 'Bubble-tastic!' : state.status === 'lost' ? 'Oh, bubbles!' : 'All done!');
    putText('result-message', victory ? 'You cleared the board. Absolutely brilliant!'
      : state.status === 'lost' ? 'The bubbles reached your launcher. Fancy another go?'
      : 'No more matching groups. Can you beat that score?');
    putText('result-score', `${state.score.toLocaleString('en-NZ')} points`);
  }
}

document.querySelectorAll('.mode-card').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
$('restart-button').addEventListener('click', reset);
$('play-again-button').addEventListener('click', reset);
$('sound-button').addEventListener('click', () => {
  sound = !sound;
  const button = $('sound-button');
  button.setAttribute('aria-pressed', String(sound));
  button.setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on');
  putText('sound-label', sound ? 'Sound on' : 'Sound off');
  if (sound) playSound('pop');
});

function frame(timestamp) {
  const dt = lastTime ? (timestamp - lastTime) / 1000 : 0;
  lastTime = timestamp;
  // Preserve the inactive mode's animation state until it is selected again.
  const state = states[mode];
  stepGame(state, dt);
  if (seenEvents[mode] !== state.event) {
    seenEvents[mode] = state.event;
    playSound(state.lastEvent);
    if (state.lastEvent === 'pop') announce(`${state.lastPop} bubbles popped. Score ${state.score}.`);
    if (state.status !== 'playing') announce(`Game over. Score ${state.score}.`);
  }
  updateUI();
  draw(ctx, state, hover, timestamp / 1000);
  requestAnimationFrame(frame);
}

setMode('shooter');
requestAnimationFrame(frame);
