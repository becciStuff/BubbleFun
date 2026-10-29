import test from 'node:test';
import assert from 'node:assert/strict';
import {MOBILE_LAYOUT,DESKTOP_LAYOUT,ROW_HEIGHT} from '../src/config.js';
import {initialShooter,initialPuzzle,stepGame,fireShooter,aimShooter,
  resolveContactMatches,descendShooter,detonateNextBomb} from '../src/game.js';
import {shooterPosition} from '../src/grid.js';
import {bubblePosition} from '../src/positions.js';
import {releaseFloatingShooter} from '../src/gravity.js';
import {bondId} from '../src/physical-bonds.js';
import {maybePlaceGravityHost,earnGravityOrb,armGravityOrb,
  takeArmedGravityOrb,triggerGravityEvent,advanceGravityEvent,
  gravityEventForces,EVENT_DURATION} from '../src/gravity-events.js';

for(const layout of [MOBILE_LAYOUT,DESKTOP_LAYOUT]){
  const make=()=>{
    const s=initialShooter(()=>.4,layout);
    s.board=new Map([['0,3','pink'],['1,3','pink'],['2,3','blue'],['2,2','blue']]);
    s.bombs.clear();s.gravityEvents.hosts.clear();
    return s;
  };

  test(`rare gravity hosts are attached to bubbles, not rolled after shots (${layout.columns})`,()=>{
    const s=make();
    assert.equal(maybePlaceGravityHost(s,'2,3',()=>.2),false);
    assert.equal(maybePlaceGravityHost(s,'2,3',()=>.999),true);
    assert.equal(s.gravityEvents.hosts.has('2,3'),true);
    assert.equal(maybePlaceGravityHost(s,'1,3',()=>.999),false,'one host max');
    s.shots=50;
    for(let i=0;i<20;i++) stepGame(s,.045);
    assert.equal(s.gravityEvents.kind,null,'shots and elapsed time alone cannot trigger events');
    const p=initialPuzzle(0,layout,()=>.999);
    assert.equal(p.gravityEvents.hosts.size,0,'handcrafted Puzzles get no random hosts');
    assert.equal(maybePlaceGravityHost(p,'0,1',()=>.999),false);
  });

  test(`popping a visible gravity host triggers a temporary real event (${layout.columns})`,()=>{
    const s=make();
    // Three pinks become connected only by a fresh sticky physical contact.
    s.board=new Map([['0,2','green'],['1,2','pink'],['2,2','pink'],
      ['0,6','blue'],['1,6','blue'],['2,6','pink']]);
    s.gravityEvents.hosts.add('2,6');
    const link=bondId('2,2','2,6');
    s.extraBonds.add(link);s.newContactBonds.add(link);
    s.gravityRandom=()=>.1; // left
    assert.equal(resolveContactMatches(s),3);
    assert.equal(s.gravityEvents.hosts.has('2,6'),false,'host consumed exactly once');
    assert.equal(s.gravityEvents.kind,'left');
    assert.equal(s.gravityEvents.source,'host');
    advanceGravityEvent(s,.5);
    assert.ok(gravityEventForces(s).ax<0,'real attached spring bodies feel a sideways force');
    const score=s.score;
    for(let i=0;i<100;i++) stepGame(s,.045);
    assert.equal(s.gravityEvents.kind,null,'gravity returns to normal after the short event');
    assert.equal(gravityEventForces(s).ax,0);
    assert.ok(s.score>=score);
  });

  test(`all three gravity event types change physical force temporarily (${layout.columns})`,()=>{
    const base=make(),left=make(),right=make(),heavy=make();
    assert.equal(triggerGravityEvent(left,'host',()=>.1),'left');
    assert.equal(triggerGravityEvent(right,'host',()=>.4),'right');
    assert.equal(triggerGravityEvent(heavy,'host',()=>.9),'heavy');
    for(let i=0;i<18;i++)for(const s of [base,left,right,heavy])stepGame(s,.045);
    const x0=bubblePosition(base,2,2).x;
    assert.ok(bubblePosition(left,2,2).x<x0-3,'left event moves actual hanging bubble');
    assert.ok(bubblePosition(right,2,2).x>x0+3,'right event moves actual hanging bubble');
    assert.ok(gravityEventForces(heavy).ay>0,'heavy event strengthens downward gravity');
    assert.deepEqual(bubblePosition(left,0,3),shooterPosition(0,3,0,layout),'roof stays fixed');
    advanceGravityEvent(heavy,EVENT_DURATION);
    assert.deepEqual(gravityEventForces(heavy),{ax:0,ay:0});
  });

  test(`large combos earn ONE selectable orb; the next fired bubble activates it on impact (${layout.columns})`,()=>{
    const s=make();
    assert.equal(armGravityOrb(s,-1),false,'no special until earned');
    assert.equal(earnGravityOrb(s,5),false);
    assert.equal(earnGravityOrb(s,7),true);
    assert.equal(s.gravityEvents.orbs,1);
    assert.equal(earnGravityOrb(s,9),false,'inventory capped at one');
    assert.equal(armGravityOrb(s,-1),true);
    assert.equal(s.gravityEvents.kind,null,'selecting a special does not immediately change gravity');
    aimShooter(s,s.layout.width/2,s.layout.top);
    assert.equal(fireShooter(s),true);
    assert.equal(s.projectile.gravitySpecialDirection,-1,'armed power is carried by the projectile');
    assert.equal(s.gravityEvents.orbs,0);
    assert.equal(s.gravityEvents.kind,null,'special waits for shot impact');
    for(let i=0;i<200 && s.projectile;i++)stepGame(s,.02);
    assert.equal(s.projectile,null);
    assert.equal(s.gravityEvents.kind,'left','impact, not button click, triggers special');
    assert.equal(s.gravityEvents.source,'special');
    assert.equal(s.shots,1,'normal shot and ammo rules apply');
    assert.equal(takeArmedGravityOrb(s),0,'special is consumed only once');
  });

  test(`bombs, falling bursts, and ceiling-row shifts preserve host identity (${layout.columns})`,()=>{
    const s=make();
    s.gravityEvents.hosts.add('1,3');
    descendShooter(s,()=>.2);
    assert.equal(s.gravityEvents.hosts.has('2,3'),true);
    assert.equal(s.gravityEvents.hosts.has('1,3'),false);

    const bomb=make();
    bomb.gravityEvents.hosts.add('1,3');
    const p=shooterPosition(1,3,0,layout);
    bomb.pendingBombs=[{x:p.x,y:p.y}];
    bomb.gravityRandom=()=>.9;
    assert.equal(detonateNextBomb(bomb),true);
    assert.equal(bomb.gravityEvents.kind,'heavy','marked host hit by bomb still activates');

    const falling=make();
    falling.board=new Map([['2,2','pink'],['0,7','blue']]);
    falling.gravityEvents.hosts.add('2,2');
    assert.equal(releaseFloatingShooter(falling,[[2,2]],()=>.5),1);
    assert.equal(falling.gravityEvents.hosts.size,0);
    assert.equal(falling.falling[0].gravityHost,true);
    assert.equal(falling.gravityEvents.kind,null,'detachment is not the burst');
    falling.falling[0].y=layout.height-40;
    falling.gravityRandom=()=>.4;
    stepGame(falling,.045);
    assert.equal(falling.gravityEvents.kind,'right','host triggers when falling bubble bursts');
  });

  test(`reduced motion does not consume or activate inaccessible gravity specials (${layout.columns})`,()=>{
    const s=make();s.reducedMotion=true;
    earnGravityOrb(s,6);
    assert.equal(armGravityOrb(s,1),false);
    assert.equal(s.gravityEvents.orbs,1);
    assert.equal(triggerGravityEvent(s,'host',()=>.1),false);
    assert.deepEqual(gravityEventForces(s),{ax:0,ay:0});
  });
}
