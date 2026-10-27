import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT } from '../src/config.js';
import { bondId } from '../src/physical-bonds.js';
import { findContactMatches } from '../src/contact-matches.js';
import { connectionThreadGeometry } from '../src/attachment-visuals.js';
import { initialShooter, initialPuzzle, resolveContactMatches, stepGame } from '../src/game.js';
import { shooterPosition } from '../src/grid.js';

// Two pink bubbles hanging from one roof and one independent pink bubble.
// No match exists until their moving structures form the NEW sticky bridge.
const matchBoard = () => new Map([
  ['0,2','blue'], ['1,2','pink'], ['2,2','pink'],
  ['0,6','blue'], ['1,6','blue'], ['2,6','pink'],
]);
const sticky = bondId('2,2','2,6');

for(const layout of [MOBILE_LAYOUT,DESKTOP_LAYOUT]) {
  test(`moving bubbles physically contact and automatically pop three matching colours (${layout.columns})`,()=>{
    const state=initialShooter(()=>.4,layout);
    state.board=matchBoard();
    state.bombs.clear();
    const from=shooterPosition(2,2,0,layout), to=shooterPosition(2,6,0,layout);
    // A physically displaced hanging tip swings into the far structure.
    // No manual call to the match resolver: the normal frame must do it.
    state.swayDynamics.set('2,2',{x:to.x-from.x-41.2,y:0,vx:0,vy:0});
    const score=state.score, shots=state.shots;
    stepGame(state,.014);
    assert.equal(state.extraBonds.has(sticky),true,'real collision establishes a sticky link');
    for(const key of ['1,2','2,2','2,6'])
      assert.equal(state.board.has(key),false,`${key} should pop as part of same-colour group`);
    assert.equal(state.score-score,60,'standard match points, no phantom turn cost');
    assert.equal(state.shots,shots,'a gravity contact does not consume ammunition');
    assert.equal(state.lastPop,3);
    assert.equal(state.lastEvent,'pop');
    const after=state.score;
    for(let i=0;i<15;i++) stepGame(state,.025);
    assert.equal(state.score,after,'same match cannot score repeatedly');
  });

  test(`just two same-colour bubbles touching do not pop (${layout.columns})`,()=>{
    const state=initialShooter(()=>.4,layout);
    state.board=new Map([['0,2','blue'],['1,2','pink'],['0,6','blue'],['1,6','pink']]);
    state.bombs.clear();
    const bond=bondId('1,2','1,6');
    state.extraBonds.add(bond);state.newContactBonds.add(bond);
    const score=state.score;
    assert.equal(resolveContactMatches(state),0);
    assert.equal(state.board.size,4);
    assert.equal(state.score,score);
    assert.equal(state.newContactBonds.size,0,'contact is processed just once');
  });

  test(`match detection is triggered only by NEW contact, not old groups (${layout.columns})`,()=>{
    const state=initialShooter(()=>.4,layout);
    state.board=new Map([['0,2','pink'],['1,2','pink'],['2,2','pink'],['0,6','blue']]);
    state.bombs.clear();
    stepGame(state,.045);
    assert.equal(state.board.size,4,'old three-matches do not explode spontaneously');
    const unrelated=bondId('2,2','0,6');
    state.extraBonds.add(unrelated);
    state.newContactBonds.add(unrelated);
    assert.equal(resolveContactMatches(state),0,'a different-coloured link does not trigger an existing group');
    assert.equal(state.board.size,4);
  });

  test(`sticky match can detonate a marked bomb in the standard chain system (${layout.columns})`,()=>{
    const state=initialShooter(()=>.4,layout);
    state.board=matchBoard(); state.bombs=new Set(['2,6']);
    state.extraBonds.add(sticky);state.newContactBonds.add(sticky);
    assert.equal(resolveContactMatches(state),3);
    assert.equal(state.pendingBombs.length,1,'matched bomb enters ordinary bomb queue');
    assert.ok(state.bombClock>0,'bomb has time to animate before exploding');
    for(let i=0;i<9;i++) stepGame(state,.045);
    assert.equal(state.pendingBombs.length,0);
    assert.ok(state.lastBombs>=1,'normal bomb explosion runs');
    assert.ok(state.score>60,'bomb points are added');
  });
}

test('automatic contact matches honour Puzzle rules without using a shot',()=>{
  const state=initialPuzzle(0);
  state.introTime=0;
  state.board=matchBoard();state.bombs=new Set(['0,6']);
  state.extraBonds.add(sticky);state.newContactBonds.add(sticky);
  const limit=state.shotLimit, spent=state.shots, originalAmmo=state.ammoIndex;
  assert.equal(resolveContactMatches(state),3);
  assert.equal(state.shots,spent);
  assert.equal(state.shotLimit,limit);
  assert.equal(state.ammoIndex,originalAmmo);
  assert.equal(state.bombs.has('0,6'),true,'an unrelated target remains for puzzle completion');
});

test('multiple fresh contacts connecting one group cannot double-count the same bubbles',()=>{
  const board=matchBoard();
  const another=bondId('1,2','2,6');
  const both=new Set([sticky,another]);
  const groups=findContactMatches(board,{phase:0,layout:MOBILE_LAYOUT,
    extraBonds:both,newContacts:both});
  assert.equal(groups.length,1);
  assert.equal(groups[0].length,3);
});

for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
  test(`six already-connected blues + one swinging blue all burst, with combo scoring (${layout.columns})`, () => {
    const state = initialShooter(() => .4, layout);
    const six = ['1,2','2,2','3,2','3,1','4,1','4,2'];
    state.board = new Map([
      ['0,2','green'], ...six.map(k=>[k,'blue']),
      ['0,6','pink'],['1,6','yellow'],['2,6','blue'],
    ]);
    state.bombs.clear();
    const bond = bondId('2,2','2,6');
    // This is the swinging leaf arriving at a *whole* connected colour group.
    state.extraBonds.add(bond);
    state.newContactBonds.add(bond);
    state.comboLevel = 1; // previous match in the same chain
    const oldScore = state.score;
    assert.equal(resolveContactMatches(state), 7);
    for (const k of [...six, '2,6']) assert.equal(state.board.has(k), false,
      `connected blue ${k} must also burst, not just the pair that touched`);
    assert.equal(state.lastPop, 7);
    assert.equal(state.score - oldScore, 7 * 20 * 2, 'combo scores the full group');
    assert.equal(state.comboLevel, 2);
    assert.equal(state.shots, 0, 'swing-assisted match costs no turn');
  });

  test(`an old connection re-touching does NOT explode an already connected group (${layout.columns})`, () => {
    const state = initialShooter(() => .4, layout);
    const seven = ['0,2','1,2','2,2','3,2','3,1','4,1','4,2'];
    state.board = new Map(seven.map(k=>[k,'blue']));
    state.bombs.clear();
    state.shots = 3; // this remains true even after the user starts playing
    const oldLink = bondId('3,1','4,1');
    state.newContactBonds.add(oldLink); // simulate an erroneous bounce event
    assert.equal(resolveContactMatches(state), 0);
    assert.equal(state.board.size, 7, 'all existing connected blues stay on the board');
    assert.equal(state.score, 0, 're-touching an old connection gives no free score');
    assert.equal(state.newContactBonds.size, 0, 'ignored events are still consumed once');
  });

  test(`a new redundant sticky link inside an existing same-colour group does not pop it (${layout.columns})`, () => {
    const state = initialShooter(() => .4, layout);
    const cells = ['0,2','1,2','2,2','3,2','3,1','4,1','4,2'];
    state.board = new Map(cells.map(k=>[k,'blue']));
    state.bombs.clear();
    const redundant = bondId('2,2','4,1');
    state.extraBonds.add(redundant);
    state.newContactBonds.add(redundant);
    assert.equal(resolveContactMatches(state), 0,
      'a new link between bubbles already reachable through blue neighbours is not a colour merge');
    assert.equal(state.board.size, cells.length);
    assert.equal(state.score, 0);
    assert.ok(state.extraBonds.has(redundant), 'physical link is still valid, just not a new match');
  });

  test(`normal spring settling must not auto-pop a pre-existing 3+ group after a shot (${layout.columns})`, () => {
    const state = initialShooter(() => .4, layout);
    state.board = new Map([
      ['0,2','blue'], ['1,2','blue'], ['2,2','blue'],
      ['3,2','blue'], ['3,1','blue'], ['4,1','blue'],
    ]);
    state.bombs.clear();
    state.shots = 1; // regression: previous code let already connected bonds pop after this
    for (let frame = 0; frame < 140; frame++) stepGame(state, .045);
    assert.equal(state.board.size, 6);
    assert.equal(state.score, 0);
    assert.equal(state.lastPop, 0);
  });
}

test('gel bonds render only the exposed gap and curve rather than connecting bubble centres',()=>{
  assert.equal(connectionThreadGeometry({x:20,y:20},{x:62,y:20}),null,
    'touching bubbles need no luminous rod through their centres');
  const segment=connectionThreadGeometry({x:20,y:20},{x:20,y:86});
  assert.ok(segment);
  assert.ok(segment.from.y>20 && segment.to.y<86,
    'the drawn thread starts and ends near bubble rims');
  assert.notEqual(segment.control.x,segment.from.x,
    'the connection has a small elastic curve rather than a straight rod');
});
