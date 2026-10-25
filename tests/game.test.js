import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialShooter, shooterPosition, shooterColumns, connectedShooter,
  floatingShooter, releaseFloatingShooter, descendShooter, fireShooter, stepGame,
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
