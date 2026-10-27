import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialShooter, initialPuzzle, PUZZLES, MOBILE_LAYOUT, DESKTOP_LAYOUT,
  SHOT_HIT_DISTANCE, shooterPosition, shooterColumns, connectedShooter,
  floatingShooter, releaseFloatingShooter, detonateNextBomb,
  descendShooter, fireShooter, aimShooter, stepGame,
  initialPop, popGroup, popAt, popCellAt, collapsePop, hasPopMoves,
} from '../src/game.js';

test('hexagonal rows fit the board and alternate between nine and eight cells', () => {
  assert.equal(shooterColumns(0), 9);
  assert.equal(shooterColumns(1), 8);
  assert.equal(shooterPosition(0, 0).x, 48);
  assert.equal(shooterPosition(1, 0).x, 69);
});

test('desktop playfield is genuinely landscape with a wider bubble grid', () => {
  const state = initialShooter(() => .3, DESKTOP_LAYOUT);
  assert.equal(state.layout.width,760);
  assert.equal(state.layout.height,580);
  assert.equal(shooterColumns(0,0,DESKTOP_LAYOUT),16);
  assert.equal(shooterColumns(1,0,DESKTOP_LAYOUT),15);
  assert.equal(state.board.size,78);
  assert.ok(shooterPosition(0,15,0,DESKTOP_LAYOUT).x < DESKTOP_LAYOUT.width);
  assert.equal(floatingShooter(state.board,0,DESKTOP_LAYOUT).length,0);
});

test('all handcrafted puzzle shapes are attached to the ceiling and fit both screens', () => {
  assert.equal(PUZZLES.length,3);
  for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) for (let index=0;index<PUZZLES.length;index++) {
    const state = initialPuzzle(index,layout,()=>.3);
    assert.equal(state.variant,'puzzle');
    assert.equal(state.bombs.size,PUZZLES[index].bombs.length);
    assert.deepEqual(floatingShooter(state.board,0,layout),[]);
    for (const k of state.board.keys()) {
      const [r,c] = k.split(',').map(Number);
      assert.ok(c < shooterColumns(r,0,layout),`puzzle ${index} has an out-of-bounds bubble`);
    }
  }
});

test('Twin Towers can actually be solved with two aimed shots, not just mock state', () => {
  const state=initialPuzzle(0,MOBILE_LAYOUT,()=>.2);
  for(let i=0;i<50;i++) stepGame(state,.02);
  assert.equal(state.status,'playing','the Puzzle must not win before any shot');
  for(const col of [2,6]) {
    if(state.status === 'won') break; // A real swing-contact combo may finish early.
    const p=shooterPosition(5,col);
    aimShooter(state,p.x,p.y);
    assert.equal(fireShooter(state),true);
    for(let i=0;i<200;i++)stepGame(state,.02);
  }
  assert.equal(state.status,'won');
  assert.equal(state.bombs.size,0);
  assert.ok(state.shots > 0 && state.shots <= 2);
});

test('Heartbreaker and The Crown have real playable solutions within their limits', () => {
  const paths = [
    [1,[[5,4],[2,4]],2],
    [2,[[6,4],[4,4],[2,1],[2,4],[2,7]],5],
  ];
  for (const [index,targets,expectedShots] of paths) {
    const state=initialPuzzle(index,MOBILE_LAYOUT,()=>.2);
    for(let i=0;i<50;i++)stepGame(state,.02);
    assert.equal(state.status,'playing','a Puzzle needs at least one player shot');
    for(const [row,col] of targets) {
      if(state.status === 'won') break; // New physics may earn an early valid win.
      const aim=shooterPosition(row,col);
      aimShooter(state,aim.x,aim.y);
      assert.equal(fireShooter(state),true);
      for(let i=0;i<220;i++)stepGame(state,.02);
    }
    assert.equal(state.status,'won',`${state.puzzleName} should be solvable`);
    assert.ok(state.shots > 0 && state.shots <= expectedShots);
    assert.ok(state.shots <= state.shotLimit);
  }
});

test('puzzle mode ends when the last allotted shot misses its target', () => {
  const state=initialPuzzle(0,MOBILE_LAYOUT,()=>.2);
  state.board=new Map([['0,8','green']]);
  state.bombs=new Set(['0,8']);
  state.shots=state.shotLimit-1;
  state.current='pink';
  for(let i=0;i<45;i++)stepGame(state,.02);
  aimShooter(state,48,77);
  assert.equal(fireShooter(state),true);
  for(let i=0;i<160;i++)stepGame(state,.02);
  assert.equal(state.status,'lost');
  assert.equal(state.bombs.size,1);
});

test('a near-graze passes outside the actual hit radius', () => {
  const state=initialShooter(()=>.2);
  const p=shooterPosition(1,4);
  state.board=new Map([['0,4','green'],['1,4','green']]);
  state.bombs=new Set();
  state.projectile={x:p.x+SHOT_HIT_DISTANCE+.75,y:p.y+20,vx:0,vy:-700,colour:'pink',sparkleClock:0};
  stepGame(state,.022);
  assert.ok(state.projectile,'a grazing shot should keep travelling');
});

test('a direct projectile hit locks the shot instead of tunnelling through a bubble', () => {
  const state = initialShooter(() => .2);
  const p = shooterPosition(1, 4);
  state.board = new Map([['0,4', 'green'], ['1,4', 'green']]);
  state.bombs = new Set();
  state.projectile = { x: p.x, y: p.y + 30, vx: 0, vy: -900, colour: 'pink', sparkleClock: 0 };
  stepGame(state, .045);
  assert.equal(state.projectile, null, 'the shot must attach on collision');
  assert.equal(state.shots, 1);
  assert.equal(state.board.size, 3);
});

test('support traverses differently coloured bubbles and stops after a bridge is removed', () => {
  const board = new Map([
    ['0,3', 'pink'], ['1,3', 'blue'], ['2,3', 'yellow'], ['3,3', 'green'],
  ]);
  assert.deepEqual(floatingShooter(board), [], 'different colours can hold up a chain');
  board.delete('1,3');
  assert.deepEqual(floatingShooter(board), [[2,3], [3,3]], 'the orphaned chain must detach');
});

test('matching shooter bubbles connect across rows but different colours do not', () => {
  const board = new Map([['0,0','pink'],['0,1','pink'],['1,0','pink'],['1,1','green']]);
  assert.equal(connectedShooter(board, 0, 0).length, 3);
  assert.equal(connectedShooter(board, 1, 1).length, 1);
});

test('a normal starting board has visible, matchable bombs rather than a new colour', () => {
  const state = initialShooter(() => .42);
  assert.equal(state.bombs.size,2,'the opening board offers a deliberate two-bomb chain');
  for (const cell of state.bombs) {
    assert.ok(state.board.has(cell));
    assert.ok(['pink', 'blue', 'green', 'yellow'].includes(state.board.get(cell)));
  }
  const positions = Array.from(state.bombs, k => shooterPosition(...k.split(',').map(Number)));
  assert.ok(Math.hypot(positions[0].x-positions[1].x,positions[0].y-positions[1].y) <= 86);
});

test('unanchored shooter bubbles are identified after a pop', () => {
  const board = new Map([['0,0','pink'],['1,0','pink'],['3,6','blue']]);
  assert.deepEqual(floatingShooter(board), [[3,6]]);
});

test('detached bubbles fall all the way to the floor before a large burst', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([['0,0','pink'], ['3,4','yellow']]);
  assert.equal(releaseFloatingShooter(state, [[3,4]], () => .5), 1);
  assert.equal(state.board.has('3,4'), false);
  assert.equal(state.falling.length, 1);
  const startingY = state.falling[0].y;
  for (let i = 0; i < 10; i++) stepGame(state, .045);
  assert.ok(state.falling[0].y > startingY, 'gravity moves the detached bubble down');
  let sawShockwave = false;
  for (let i = 0; i < 30; i++) {
    stepGame(state, .045);
    if (state.shockwaves.length) sawShockwave = true;
  }
  assert.equal(state.falling.length, 0, 'falling bubble has exploded');
  assert.equal(state.lastEvent, 'burst');
  assert.ok(sawShockwave, 'a visible floor shockwave is drawn');
});

test('board-clear victory waits until detached bubbles finish exploding', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([['2,2','blue']]);
  releaseFloatingShooter(state, [[2,2]], () => .5);
  state.status = 'clearing';
  stepGame(state, .045);
  assert.equal(state.status, 'clearing');
  for (let i = 0; i < 45; i++) stepGame(state, .045);
  assert.equal(state.status, 'won');
  assert.equal(state.lastEvent, 'win');
});

test('a bomb blast clears nearby colours but leaves distant bubbles alone', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([['0,0','pink'],['0,1','blue'],['0,2','yellow'],['0,8','green']]);
  state.bombs = new Set();
  const {x,y} = shooterPosition(0,0);
  state.pendingBombs = [{x,y,row:0,col:0}];
  state.comboLevel = 1;
  assert.equal(detonateNextBomb(state), true);
  assert.equal(state.comboLevel, 2);
  assert.equal(state.score, (50 + 3 * 25) * 2);
  assert.equal(state.board.has('0,0'), false);
  assert.equal(state.board.has('0,1'), false);
  assert.equal(state.board.has('0,2'), false);
  assert.equal(state.board.has('0,8'), true);
  assert.ok(state.shockwaves.length);
});

test('an actual aimed colour match triggers a bomb and a second bomb in its blast', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([
    ['0,0','pink'],['1,0','pink'],['0,1','blue'],['0,2','green'],
    ['1,2','blue'],['0,5','purple'],
  ]);
  state.bombs = new Set(['1,0','1,2']);
  state.current = 'pink';
  state.next = 'green';
  aimShooter(state,48,150);
  assert.equal(fireShooter(state),true);
  let sawFirstBlast = false;
  let sawSecondBlast = false;
  for (let i=0; i<170; i++) {
    stepGame(state,.016);
    if (state.lastBombs >= 1) sawFirstBlast = true;
    if (state.lastBombs >= 2) sawSecondBlast = true;
  }
  assert.equal(sawFirstBlast,true,'the launched shot should match the marked pink bubble');
  assert.equal(sawSecondBlast,true,'the first blast should detonate the second bomb');
  assert.equal(state.comboLevel,3);
  assert.ok(state.score > 200);
  assert.equal(state.bombs.size,0);
  assert.equal(state.board.get('0,5'),'purple');
});

test('subsequent bombs increment the combo and cannot fire out of turn', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([['0,0','pink'], ['0,1','pink'], ['0,5','green']]);
  state.bombs = new Set();
  state.pendingBombs = [{...shooterPosition(0,0)}];
  state.comboLevel = 1;
  assert.equal(fireShooter(state),false);
  detonateNextBomb(state);
  state.pendingBombs = [{...shooterPosition(0,5)}];
  detonateNextBomb(state);
  assert.equal(state.comboLevel,3);
  assert.equal(state.highestCombo,3);
  assert.ok(state.score>0);
  assert.equal(state.lastBombs,2);
  assert.equal(state.board.size,0);
});

test('a new ceiling row waits while bombs are detonating', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([['0,0','pink'], ['1,0','pink'], ['0,7','green']]);
  state.bombs = new Set(['1,0']);
  state.current = 'pink';
  state.shotsUntilRow = 1;
  aimShooter(state,48,150);
  fireShooter(state);
  for (let i=0;i<100 && !state.pendingBombs.length;i++) stepGame(state,.016);
  assert.equal(state.pendingBombs.length,1);
  assert.equal(state.phase,0,'the row must not descend during a bomb countdown');
  assert.equal(fireShooter(state),false);
  for (let i=0;i<100;i++) stepGame(state,.016);
  assert.equal(state.pendingBombs.length,0);
  assert.equal(state.phase,1,'the row can descend once the blast and gravity finish');
});

test('detached bubbles never magically pop a different hanging cluster', () => {
  const state = initialShooter(() => .1);
  const target = shooterPosition(5,4);
  state.board = new Map([['0,0','pink'],['5,4','green'],['6,4','green']]);
  state.bombs = new Set();
  state.falling = [{ x:target.x, y:target.y-55, colour:'green', vx:0,vy:30,gravity:900,
    rotation:0, spin:0, burstAt:2.5, sparkleClock:0 }];
  for (let i=0;i<75;i++) stepGame(state,.025);
  assert.equal(state.board.size,3,'falling bubbles no longer remove on-board matches');
  assert.equal(state.comboLevel,0);
  assert.equal(state.falling.length,0);
});

test('a scheduled new row waits until the falling cascade has settled', () => {
  const state = initialShooter(() => .1);
  state.shotsUntilRow = 0;
  state.pendingRow = true;
  state.falling = [{ x:216,y:480,colour:'purple',vx:0,vy:50,gravity:800,
    rotation:0,spin:0,burstAt:.11,sparkleClock:0,hitCooldown:0 }];
  stepGame(state,.03);
  assert.equal(state.phase,0);
  assert.equal(state.pendingRow,true);
  for(let i=0;i<6;i++) stepGame(state,.03);
  assert.equal(state.falling.length,0);
  assert.equal(state.phase,1);
  assert.equal(state.pendingRow,false);
  assert.equal(state.shotsUntilRow,5);
});

test('descending the ceiling preserves bubble x positions', () => {
  const state = initialShooter(() => .1);
  state.bombs = new Set(['0,0']);
  const before = shooterPosition(0, 0, state.phase).x;
  descendShooter(state, () => .1);
  assert.equal(shooterPosition(1, 0, state.phase).x, before);
  assert.equal(state.shotsUntilRow, 5);
  assert.equal(state.board.get('1,0'), 'pink');
  assert.ok(state.bombs.has('1,0'));
});

test('shooter fire creates an upward projectile and prevents double firing', () => {
  const state = initialShooter(() => .1);
  const first = state.current;
  assert.equal(fireShooter(state), true);
  assert.equal(state.projectile.colour, first);
  assert.ok(state.projectile.vy < 0);
  assert.equal(fireShooter(state), false);
  const y = state.projectile.y;
  stepGame(state, .016);
  assert.ok(state.projectile.y < y);
});

test('pop groups use horizontal and vertical neighbours, not diagonals', () => {
  const board = [['pink',null,'pink'],['pink','pink',null],[null,null,'pink']];
  assert.equal(popGroup(board,0,0).length,3);
  assert.equal(popGroup(board,0,2).length,1);
  assert.deepEqual(popGroup(board,0,1),[]);
});

test('popped bubbles fall down and empty columns slide left', () => {
  const board = [
    ['pink',null,'blue'],
    [null,null,null],
    ['yellow',null,'green'],
  ];
  assert.deepEqual(collapsePop(board), [
    [null,null,null],
    ['pink','blue',null],
    ['yellow','green',null],
  ]);
});

test('pop scoring rewards larger groups and full clear gives a bonus', () => {
  const state = initialPop(() => .1);
  state.board = state.board.map(row => row.map(() => null));
  state.board[10][0] = 'pink';
  state.board[10][1] = 'pink';
  state.board[10][2] = 'blue';
  state.board[10][3] = 'blue';
  assert.equal(popAt(state,10,0),2);
  assert.equal(state.score,20);
  assert.equal(state.status,'playing');
  assert.equal(popAt(state,10,0),2);
  assert.equal(state.score,540);
  assert.equal(state.status,'won');
});

test('pop mode recognises dead boards and hit testing', () => {
  assert.equal(hasPopMoves([['pink','blue'],['green','yellow']]),false);
  assert.deepEqual(popCellAt(48,99),[0,0]);
  assert.equal(popCellAt(0,0),null);
});
