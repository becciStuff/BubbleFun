import {
  MOBILE_LAYOUT, DESKTOP_LAYOUT, SWATCHES, PUZZLES,
  initialShooter, initialPuzzle, fireShooter, aimShooter, stepGame,
} from './game.js';
import { draw } from './render.js';

const $ = id => document.getElementById(id);
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const landscape = window.matchMedia('(min-width: 900px)');
const chosenLayout = () => landscape.matches ? DESKTOP_LAYOUT : MOBILE_LAYOUT;
let state = initialShooter(Math.random, chosenLayout());
let playStyle = 'arcade';
let puzzleIndex = 0;
let pointerDown = false;
let sound = false;
let audioContext = null;
let lastTime = 0;
let seenEvent = 0;
let bestScore = readBest('arcade');

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
      cascade: [430, 740, .24], burst: [310, 105, .25],
      chain: [245, 68, .37],
      win: [680, 1100, .35], lose: [230, 90, .4], finish: [380, 240, .25],
    };
    const [from, to, duration] = tones[type] ?? tones.pop;
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    const explosion = type === 'chain' || type === 'burst';
    oscillator.type = explosion ? 'sawtooth' : type === 'pop' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    volume.gain.setValueAtTime(.0001, now);
    volume.gain.exponentialRampToValueAtTime(explosion ? .105 : .075, now + .012);
    volume.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(volume).connect(audioContext.destination);
    oscillator.start(now); oscillator.stop(now + duration + .02);
    if (explosion) {
      const crackle = audioContext.createOscillator();
      const crackleGain = audioContext.createGain();
      crackle.type = 'square';
      crackle.frequency.setValueAtTime(990, now);
      crackle.frequency.exponentialRampToValueAtTime(220, now + .09);
      crackleGain.gain.setValueAtTime(.045, now);
      crackleGain.gain.exponentialRampToValueAtTime(.0001, now + .11);
      crackle.connect(crackleGain).connect(audioContext.destination);
      crackle.start(now); crackle.stop(now + .12);
    }
  } catch { /* Audio is an enhancement, never a gameplay requirement. */ }
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * state.layout.width / rect.width,
    y: (event.clientY - rect.top) * state.layout.height / rect.height,
  };
}

function updateTarget(event) {
  const point = pointFromEvent(event);
  aimShooter(state, point.x, point.y);
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
  updateTarget(event);
  fireShooter(state);
  event.preventDefault();
});

canvas.addEventListener('pointercancel', () => { pointerDown = false; });

window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(event.target.tagName)) return;
  if (state.status !== 'playing') return;
  if (event.key === 'ArrowLeft') { state.angle = Math.max(-1.15, state.angle - .065); event.preventDefault(); }
  if (event.key === 'ArrowRight') { state.angle = Math.min(1.15, state.angle + .065); event.preventDefault(); }
  if (event.code === 'Space') { fireShooter(state); event.preventDefault(); }
});

const scoreKey = () => playStyle === 'arcade' ? 'shooter' : `puzzle-${puzzleIndex}`;

function updatePlayUI() {
  for (const button of document.querySelectorAll('.mode-card')) {
    const selected = button.dataset.play === playStyle;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  for (const button of document.querySelectorAll('.puzzle-choice')) {
    const selected = Number(button.dataset.puzzle) === puzzleIndex;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  const puzzle = playStyle === 'puzzle';
  $('puzzle-picker').hidden = !puzzle;
  $('mission-strip').hidden = !puzzle;
  putText('game-title', puzzle ? `Puzzle ${puzzleIndex + 1}: ${PUZZLES[puzzleIndex].name}` : 'Bubble Shooter');
  putText('mission-strip', puzzle ? `✦  ${PUZZLES[puzzleIndex].goal}  ·  ${PUZZLES[puzzleIndex].shots} shots` : '');
  putText('instructions-title', puzzle ? 'Every shot matters.' : 'Make your shot count.');
  putText('instructions-copy', puzzle
    ? `Clear the glowing bomb targets in ${PUZZLES[puzzleIndex].shots} shots or fewer. The bubbles form a handcrafted pattern — look for a weak point and bring down whole sections.`
    : 'Match three or more colours. Hit marked bomb bubbles to set off explosive chains, then watch unsupported bubbles tumble and burst.');
  putText('tip-copy', puzzle
    ? 'You don’t need to clear every bubble. Break the supports or detonate the marked targets to solve the puzzle.'
    : 'Those glowing bubbles are bombs. Aim for a colour match, or use another explosion to trigger them.');
  canvas.setAttribute('aria-label', `${puzzle ? PUZZLES[puzzleIndex].name + ' puzzle' : 'Bubble Shooter'} playfield. Aim with mouse or touch; arrow keys and Space also work.`);
}

function reset() {
  state = playStyle === 'puzzle' ? initialPuzzle(puzzleIndex, chosenLayout()) : initialShooter(Math.random, chosenLayout());
  if (reducedMotion) state.introTime = 0;
  canvas.width = state.layout.width;
  canvas.height = state.layout.height;
  canvas.style.aspectRatio = `${state.layout.width} / ${state.layout.height}`;
  seenEvent = 0;
  bestScore = readBest(scoreKey());
  pointerDown = false;
  updatePlayUI();
  announce(`${playStyle === 'puzzle' ? state.puzzleName : 'Arcade'} started.`);
  updateUI();
}

function selectPlay(nextStyle) {
  if (nextStyle !== 'arcade' && nextStyle !== 'puzzle') return;
  if (playStyle !== nextStyle) { playStyle = nextStyle; reset(); }
}

function selectPuzzle(index) {
  if (!Number.isInteger(index) || index < 0 || index >= PUZZLES.length) return;
  playStyle = 'puzzle';
  puzzleIndex = index;
  reset();
}

function announce(message) { $('live-status').textContent = message; }

function putText(id, value) {
  const element = $(id);
  if (element.textContent !== String(value)) element.textContent = String(value);
}

function updateUI() {
  if (state.score > bestScore) { bestScore = state.score; saveBest(scoreKey(), state.score); }
  putText('score-value', state.score.toLocaleString('en-NZ'));
  putText('best-value', bestScore.toLocaleString('en-NZ'));
  const showCombo = state.comboDisplay > 0 && state.comboLevel >= 2;
  putText('turn-label', showCombo ? 'EXPLOSIVE COMBO' : playStyle === 'puzzle' ? 'SHOTS LEFT' : 'NEXT ROW IN');
  const remaining = playStyle === 'puzzle' ? Math.max(0,state.shotLimit - state.shots) : state.shotsUntilRow;
  putText('turns-value', showCombo ? `×${state.comboLevel} COMBO` : `${remaining} shot${remaining === 1 ? '' : 's'}`);
  const orb = $('next-orb');
  if (orb.dataset.colour !== state.next) {
    orb.style.backgroundColor = SWATCHES[state.next];
    orb.style.backgroundImage = `radial-gradient(circle at 30% 22%, #fff, ${SWATCHES[state.next]} 38%, #442464 125%)`;
    orb.dataset.colour = state.next;
  }
  const status = (state.status === 'clearing' ? 'Final bubbles tumbling down!'
      : state.pendingBombs.length ? 'Bombs are going off — here comes the chain!'
      : state.comboDisplay > 0 && state.lastChain ? `${state.lastBombs} bomb${state.lastBombs === 1 ? '' : 's'}! Combo ×${state.lastChain.multiplier}!`
      : state.falling.length ? 'Gravity cascade — wait for the floor bursts!'
      : state.lastDrop ? `${state.lastDrop} bubble${state.lastDrop === 1 ? '' : 's'} dropped and bursting!`
      : state.lastPop ? `${state.lastPop} popped! Keep going!`
      : playStyle === 'puzzle' ? `${state.bombs.size} bomb target${state.bombs.size===1?'':'s'} to clear` : 'Match 3+ — glowing bubbles are bombs!');
  putText('game-status', `✦ ${status}`);

  const overlay = $('result-overlay');
  const finished = state.status === 'won' || state.status === 'lost';
  overlay.classList.toggle('hidden', !finished);
  $('next-puzzle-button').hidden = !(finished && state.status === 'won' && playStyle === 'puzzle' && puzzleIndex < PUZZLES.length - 1);
  if (finished) {
    const victory = state.status === 'won';
    putText('result-title', victory ? (playStyle === 'puzzle' ? 'Puzzle solved!' : 'Bubble-tastic!') : 'Oh, bubbles!');
    putText('result-message', victory ? (playStyle === 'puzzle' ? `All targets cleared in ${state.shots} shots. Nicely done!` : 'You cleared the board. Absolutely brilliant!')
      : playStyle === 'puzzle' ? 'Out of shots! Try a different angle or look for a weaker support.' : 'The bubbles reached your launcher. Fancy another go?');
    putText('result-score', `${state.score.toLocaleString('en-NZ')} points`);
  }
}

document.querySelectorAll('.mode-card').forEach(button => button.addEventListener('click', () => selectPlay(button.dataset.play)));
document.querySelectorAll('.puzzle-choice').forEach(button => button.addEventListener('click', () => selectPuzzle(Number(button.dataset.puzzle))));
$('restart-button').addEventListener('click', reset);
$('play-again-button').addEventListener('click', reset);
$('next-puzzle-button').addEventListener('click', () => selectPuzzle(puzzleIndex + 1));
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
  stepGame(state, dt);
  if (reducedMotion) {
    state.rowShift = 0;
    state.wobble.clear();
  }
  if (seenEvent !== state.event) {
    seenEvent = state.event;
    playSound(state.lastEvent);
    if (state.lastEvent === 'pop') announce(`${state.lastPop} bubbles popped. Score ${state.score}.`);
    if (state.lastEvent === 'cascade') announce(`Gravity combo! ${state.lastDrop} disconnected bubbles are falling. Score ${state.score}.`);
    if (state.lastEvent === 'chain') announce(`Bomb explosion! Combo times ${state.lastChain.multiplier}! ${state.lastChain.points} points. Total score ${state.score}.`);
    if (['won', 'lost', 'finished'].includes(state.status)) announce(`Game over. Score ${state.score}.`);
  }
  updateUI();
  draw(ctx, state, null, timestamp / 1000, reducedMotion);
  requestAnimationFrame(frame);
}

landscape.addEventListener('change', () => {
  if (state.shots === 0 && !state.projectile && !state.pendingBombs.length) reset();
  else announce('Display size changed. Restart when you are ready to switch between desktop and mobile boards.');
});
reset();
requestAnimationFrame(frame);
