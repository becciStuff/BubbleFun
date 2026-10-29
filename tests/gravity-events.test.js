import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT } from '../src/config.js';
import { initialShooter, initialPuzzle, stepGame } from '../src/game.js';
import { shooterPosition } from '../src/grid.js';
import { bubblePosition } from '../src/positions.js';
import { awardGravityCharge, assessGravityInstability, activateGravityShift,
  advanceGravityShift, canActivateGravityShift, finishGravityTurn, gravityShiftPull,
  SHIFT_DURATION } from '../src/gravity-events.js';

for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
  const make = () => {
    const s=initialShooter(()=>.44,layout);
    s.board=new Map([['0,3','pink'],['1,3','pink'],['2,3','blue'],['2,2','blue']]);
    s.bombs.clear();
    return s;
  };
  test(`earned shift changes real connected body motion left and right (${layout.columns})`,()=>{
    const baseline=make(), left=make(), right=make();
    for(const s of [left,right]) {
      awardGravityCharge(s,20,'pop');
      assert.equal(s.gravityEvents.charge,100);
    }
    assert.equal(activateGravityShift(left,-1),true);
    assert.equal(activateGravityShift(right,1),true);
    assert.equal(left.gravityEvents.charge,0);
    assert.equal(right.gravityEvents.charge,0);
    for(let i=0;i<14;i++) for(const s of [baseline,left,right]) stepGame(s,.045);
    const x0=bubblePosition(baseline,2,2).x;
    const xL=bubblePosition(left,2,2).x;
    const xR=bubblePosition(right,2,2).x;
    assert.ok(xL<x0-3,`left real spring position ${xL} < ${x0}`);
    assert.ok(xR>x0+3,`right real spring position ${xR} > ${x0}`);
    assert.deepEqual(bubblePosition(left,0,3),shooterPosition(0,3,0,layout),
      'the roof stays pinned while hanging bodies are pulled sideways');
    assert.equal(baseline.gravityEvents.activeDirection,0);
  });
  test(`gravity charge is capped, spent once, and disabled during shots and row transitions (${layout.columns})`,()=>{
    const s=make();
    awardGravityCharge(s,300,'drop');
    assert.equal(s.gravityEvents.charge,100);
    s.projectile={};
    assert.equal(canActivateGravityShift(s),false);
    assert.equal(activateGravityShift(s,-1),false);
    s.projectile=null;
    s.rowShift=14;
    assert.equal(activateGravityShift(s,1),false);
    s.rowShift=0;
    assert.equal(activateGravityShift(s,1),true);
    assert.equal(activateGravityShift(s,-1),false);
    assert.ok(gravityShiftPull(s)===0,'directional force fades in instead of jerking the structure');
    advanceGravityShift(s,.5);
    assert.ok(gravityShiftPull(s)>0);
    advanceGravityShift(s,SHIFT_DURATION);
    assert.equal(s.gravityEvents.activeDirection,0);
    assert.equal(gravityShiftPull(s),0);
  });
  test(`deeper and longer hanging chains raise instability (${layout.columns})`,()=>{
    const s=make();
    const low=assessGravityInstability(s);
    s.board.set('7,3','blue');
    const medium=assessGravityInstability(s);
    s.board.set('10,3','blue');
    const high=assessGravityInstability(s);
    assert.ok(medium>low,`${medium} should exceed ${low}`);
    assert.ok(high>medium,`${high} should exceed ${medium}`);
    assert.ok(high<=100);
  });
  test(`warned random disturbance occurs after the NEXT resolved shot, never mid-shot (${layout.columns})`,()=>{
    const s=make();
    let rolls=0;
    const random=()=>{rolls++;return .001};
    s.shots=3;
    s.projectile={};
    assert.equal(finishGravityTurn(s,random),null);
    assert.equal(rolls,0);
    s.projectile=null;
    assert.equal(finishGravityTurn(s,random),'warning');
    assert.deepEqual(s.gravityEvents.warning,{direction:-1,afterShot:3});
    assert.equal(s.gravityEvents.activeDirection,0);
    assert.equal(finishGravityTurn(s,random),null);
    assert.equal(rolls,2,'the game must not reroll each frame');
    s.shots=4;
    s.pendingBombs=[{x:0,y:0}];
    assert.equal(finishGravityTurn(s,random),null);
    s.pendingBombs=[];
    s.rowShift=23;
    assert.equal(finishGravityTurn(s,random),null);
    s.rowShift=0;
    assert.equal(finishGravityTurn(s,random),'disturbance');
    assert.equal(s.gravityEvents.warning,null);
    assert.equal(s.gravityEvents.activeSource,'environment');
    assert.equal(s.gravityEvents.activeDirection,-1);
    assert.equal(finishGravityTurn(s,random),null);
    assert.equal(rolls,2);
    assert.equal(s.gravityEvents.cooldownShots,3);
  });
  test(`disturbances have a cooldown and are disabled for reduced motion and puzzles (${layout.columns})`,()=>{
    const s=make();s.shots=3;
    s.reducedMotion=true;
    assert.equal(finishGravityTurn(s,()=>0),null);
    assert.equal(s.gravityEvents.warning,null);
    awardGravityCharge(s,25,'pop');
    assert.equal(activateGravityShift(s,1),false);
    const p=initialPuzzle(0,layout,()=>0);
    p.introTime=0;p.shots=4;
    assert.equal(finishGravityTurn(p,()=>0),null,'handcrafted puzzles do not have random roll');
    awardGravityCharge(p,30,'pop');
    assert.equal(activateGravityShift(p,1),true,'earned control works in puzzles');
  });
}
