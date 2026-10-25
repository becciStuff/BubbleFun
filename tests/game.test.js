import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialShooter, shooterPosition, shooterColumns, connectedShooter,
  floatingShooter, releaseFloatingShooter, triggerChainReaction,
  descendShooter, fireShooter, stepGame,
  initialPop, popGroup, popAt, popCellAt, collapsePop, hasPopMoves,
} from '../src/game.js';

test('hexagonal rows fit the board and alternate between nine and eight cells', () => {
  assert.equal(shooterColumns(0), 9);
  assert.equal(shooterColumns(1), 8);
  assert.equal(shooterPosition(0, 0).x, 48);
  assert.equal(shooterPosition(1, 0).x, 69);
});

test('matching shooter bubbles connect across rows but different colours do not', () => {
  const board = new Map([['0,0','pink'],['0,1','pink'],['1,0','pink'],['1,1','green']]);
  assert.equal(connectedShooter(board, 0, 0).length, 3);
  assert.equal(connectedShooter(board, 1, 1).length, 1);
});

test('unanchored shooter bubbles are identified after a pop', () => {
  const board = new Map([['0,0','pink'],['1,0','pink'],['3,6','blue']]);
  assert.deepEqual(floatingShooter(board), [[3,6]]);
});

test('detached bubbles become falling physics objects before bursting', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([['0,0','pink'], ['3,4','yellow']]);
  assert.equal(releaseFloatingShooter(state, [[3,4]], () => .5), 1);
  assert.equal(state.board.has('3,4'), false);
  assert.equal(state.falling.length, 1);
  const startingY = state.falling[0].y;
  for (let i = 0; i < 10; i++) stepGame(state, .045);
  assert.ok(state.falling[0].y > startingY, 'gravity moves the detached bubble down');
  for (let i = 0; i < 30; i++) stepGame(state, .045);
  assert.equal(state.falling.length, 0, 'falling bubble has exploded');
  assert.equal(state.lastEvent, 'burst');
  assert.ok(state.pulses.length > 0 || state.effects.length > 0);
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

test('a falling bubble completes a matching pair and starts a ×2 chain', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([['0,0','pink'], ['0,1','pink'], ['0,5','green']]);
  state.comboLevel = 1;
  const falling = { x: 90, y: 94, colour: 'pink' };
  assert.equal(triggerChainReaction(state, falling, 0, 0), true);
  assert.equal(state.comboLevel, 2);
  assert.equal(state.score, 80);
  assert.equal(state.board.has('0,0'), false);
  assert.equal(state.board.has('0,1'), false);
  assert.equal(state.board.has('0,5'), true);
  assert.equal(state.lastChain.multiplier, 2);
  assert.ok(state.comboDisplay > 0);
});

test('successive secondary matches raise the multiplier and points', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([['0,0','pink'],['0,1','pink'],['0,5','blue'],['0,6','blue']]);
  state.comboLevel = 1;
  assert.equal(triggerChainReaction(state,{x:60,y:77,colour:'pink'},0,0),true);
  assert.equal(triggerChainReaction(state,{x:290,y:77,colour:'blue'},0,5),true);
  assert.equal(state.comboLevel,3);
  assert.equal(state.highestCombo,3);
  assert.equal(state.score,200); // 40×2 then 40×3
});

test('a lone bubble or mismatched colour cannot trigger a chain', () => {
  const state = initialShooter(() => .1);
  state.board = new Map([['0,0','pink'],['0,1','blue']]);
  state.comboLevel = 1;
  assert.equal(triggerChainReaction(state,{x:48,y:77,colour:'blue'},0,0),false);
  assert.equal(triggerChainReaction(state,{x:48,y:77,colour:'pink'},0,0),false);
  assert.equal(state.score,0);
});

test('falling bubbles ricochet off mismatched bubbles instead of popping them', () => {
  const state = initialShooter(() => .1);
  const target = shooterPosition(5,4);
  state.board = new Map([['5,4','pink']]);
  state.falling = [{ x:target.x, y:target.y - 42, colour:'blue', vx:0,vy:200,gravity:900,
    rotation:0, spin:0, burstAt:1.5, sparkleClock:0, hitCooldown:0 }];
  stepGame(state,.03);
  assert.equal(state.board.get('5,4'),'pink');
  assert.equal(state.falling.length,1);
  assert.ok(state.falling[0].vy < 0, 'the bubble bounced upwards');
});

test('physical collisions trigger chains and eventually finish a cleared board', () => {
  const state = initialShooter(() => .1);
  const target = shooterPosition(5,4);
  state.board = new Map([['5,4','green'],['6,4','green']]);
  state.comboLevel = 1;
  state.falling = [{ x:target.x, y:target.y-55, colour:'green', vx:0,vy:30,gravity:900,
    rotation:0, spin:0, burstAt:1.5, sparkleClock:0, hitCooldown:0 }];
  assert.equal(fireShooter(state),false, 'the next turn waits for the cascade');
  for (let i=0;i<30 && state.status!=='won';i++) stepGame(state,.025);
  assert.equal(state.score,80);
  assert.equal(state.comboLevel,2);
  assert.equal(state.status,'won');
  assert.equal(state.board.size,0);
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
  const before = shooterPosition(0, 0, state.phase).x;
  descendShooter(state, () => .1);
  assert.equal(shooterPosition(1, 0, state.phase).x, before);
  assert.equal(state.shotsUntilRow, 5);
  assert.equal(state.board.get('1,0'), 'pink');
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
