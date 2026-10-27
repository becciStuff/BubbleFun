import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT, RADIUS } from '../src/config.js';
import { cellKey, connectedShooter, shooterPosition, shotBubbleCollision } from '../src/grid.js';
import { bondEdges, bondId, resolveContacts, cleanExtraBonds } from '../src/physical-bonds.js';
import { findDetachedBubbles } from '../src/gravity.js';
import { stepAttachedSway } from '../src/sway.js';
import { bubblePosition } from '../src/positions.js';
import { initialShooter } from '../src/game.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const makeState=(layout,cells)=>{
  const state=initialShooter(()=>.42,layout);
  state.board=new Map(cells.map((key,i)=>[key,i%2?'pink':'blue']));
  state.bombs.clear();
  return state;
};

for(const layout of [MOBILE_LAYOUT,DESKTOP_LAYOUT]) {
  test(`gravity pulls a sideways pendant DOWN without sine-wave targets (${layout.columns})`,()=>{
    const state=makeState(layout,['0,3','1,3','2,3','2,2']);
    const original=shooterPosition(2,2,0,layout);
    const roof=shooterPosition(0,3,0,layout);
    const start=new Map(state.board);
    const samples=[];
    for(let i=0;i<100;i++){
      stepAttachedSway(state,.045);
      samples.push(bubblePosition(state,2,2).y);
    }
    const leaf=bubblePosition(state,2,2);
    assert.ok(leaf.y>original.y+16,
      `side-connected bubble needs gravity-driven drop; got ${leaf.y-original.y}px`);
    assert.ok(Math.max(...samples)-Math.min(...samples)>12,
      'gravity creates actual travel, rather than a scripted sway');
    assert.deepEqual(bubblePosition(state,0,3),roof,'ceiling remains completely pinned');
    assert.deepEqual(state.board,start,'physical sag never removes attached cells');
    const neighbour=bubblePosition(state,2,3);
    assert.ok(distance(leaf,neighbour)<RADIUS*2+25,'spring limits link extension');
    assert.deepEqual(shotBubbleCollision(state.board,leaf.x,leaf.y,0,layout,state.attachedPositions),[2,2],
      'shot collisions follow the genuinely moved bubble');
  });

  test(`real contact creates a sticky connection and a replacement ceiling path (${layout.columns})`,()=>{
    const state=makeState(layout,['0,2','1,2','2,2','0,6','1,6','2,6']);
    // An incoming swing has already brought the two independent branches
    // into contact. The physics update must recognise and join them.
    const left=shooterPosition(2,2,0,layout);
    const right=shooterPosition(2,6,0,layout);
    state.swayDynamics.set('2,2',{x:right.x-left.x-(RADIUS*2-.8),y:0,vx:0,vy:0});
    stepAttachedSway(state,.014);
    const newLink=bondId('2,2','2,6');
    assert.equal(state.extraBonds.has(newLink),true,'contact becomes a real bond');
    assert.ok(bondEdges(state.board,0,layout,state.extraBonds)
      .some(([a,b])=>bondId(a,b)===newLink),'the new contact joins the spring network');
    const actualDistance=distance(bubblePosition(state,2,2),bubblePosition(state,2,6));
    assert.ok(actualDistance>=RADIUS*2-1.2,'bubbles do not visually overlap');

    state.board.delete('0,2');
    state.board.delete('1,2');
    assert.ok(!findDetachedBubbles(state.board,0,layout,state.extraBonds)
      .some(([r,c])=>cellKey(r,c)==='2,2'),
      'the new bond holds the leaf after its original support is popped');
    cleanExtraBonds(state.board,state.extraBonds);
    assert.equal(state.extraBonds.has(newLink),true);
    state.board.delete('2,6');
    cleanExtraBonds(state.board,state.extraBonds);
    assert.equal(state.extraBonds.has(newLink),false,'removed nodes release their old sticky links');
    assert.ok(findDetachedBubbles(state.board,0,layout,state.extraBonds)
      .some(([r,c])=>cellKey(r,c)==='2,2'),'losing the last ceiling path makes it fall');
  });

  test(`contact links can participate in actual colour matching (${layout.columns})`,()=>{
    const board=new Map([['0,1','pink'],['1,1','pink'],['2,1','pink'],
      ['0,6','pink'],['1,6','pink'],['2,6','pink']]);
    const links=new Set([bondId('2,1','2,6')]);
    assert.equal(connectedShooter(board,2,1,0,true,layout).length,3);
    assert.equal(connectedShooter(board,2,1,0,true,layout,links).length,6,
      'the physically sticky contact belongs to the gameplay graph too');
  });
}

test('no artificial ambient oscillation is injected into physics',async()=>{
  const {readFile}=await import('node:fs/promises');
  const src=await readFile(new URL('../src/sway.js',import.meta.url),'utf8');
  assert.doesNotMatch(src,/Math\.sin\s*\(/,
    'swing must come from gravity, links and momentum, never a ticking sine wave');
});

test('reduced motion disables forces and contact creation',()=>{
  const state=makeState(MOBILE_LAYOUT,['0,3','1,3','2,3','2,2']);
  state.reducedMotion=true;
  stepAttachedSway(state,.045);
  assert.equal(state.attachedPositions.size,0);
  assert.equal(state.extraBonds.size,0);
  assert.deepEqual(bubblePosition(state,2,2),shooterPosition(2,2,0,state.layout));
});
