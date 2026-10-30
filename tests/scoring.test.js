import test from 'node:test';
import assert from 'node:assert/strict';
import { RADIUS, MOBILE_LAYOUT, DESKTOP_LAYOUT } from '../src/config.js';
import { SCORING_CONFIG } from '../src/scoring-config.js';
import { bubbleDepth, depthMultiplier, awardBubbleClear,
  nextComboMultiplier, isDeepClear } from '../src/scoring.js';
import { initialShooter, stepGame } from '../src/game.js';
import { shooterPosition } from '../src/grid.js';

const near = (a,b) => Math.abs(a-b)<1e-10;

test('depth is continuous, clamped, and identical across desktop/mobile percentages', () => {
  for (const layout of [MOBILE_LAYOUT,DESKTOP_LAYOUT]) {
    const top=layout.top+RADIUS;
    const danger=layout.launchY-SCORING_CONFIG.dangerLineOffset;
    assert.equal(bubbleDepth(top-100,layout),0);
    assert.equal(bubbleDepth(danger+100,layout),1);
    assert.equal(depthMultiplier(top,layout),1);
    assert.equal(depthMultiplier(danger,layout),3);
    assert.ok(near(bubbleDepth(top+(danger-top)*.5,layout),.5));
    assert.ok(near(depthMultiplier(top+(danger-top)*.5,layout),
      1+2*Math.pow(.5,1.5)));
  }
});

for (const layout of [MOBILE_LAYOUT,DESKTOP_LAYOUT]) {
  const make=(cells,ys)=> {
    const state=initialShooter(()=>.2,layout);
    state.board=new Map(cells.map((key,i)=>[key,i%2?'pink':'blue']));
    state.bombs.clear();
    cells.forEach((key,i)=>{
      const [r,c]=key.split(',').map(Number);
      const old=shooterPosition(r,c,0,layout);
      state.attachedPositions.set(key,{x:old.x,y:ys[i]});
    });
    return state;
  };
  const top=layout.top+RADIUS;
  const danger=layout.launchY-SCORING_CONFIG.dangerLineOffset;

  test('mixed depth is scored PER BUBBLE with one combo and one rounding ('+layout.columns+')',()=>{
    const state=make(['0,2','1,2','2,2'],[top,top+(danger-top)*.5,danger]);
    const award=awardBubbleClear(state,[[0,2],[1,2],[2,2]],'match',2);
    const expected=Math.round((1+(1+2*Math.pow(.5,1.5))+3)*20*2);
    assert.equal(award.points,expected);
    assert.equal(award.basePoints,3*20*2);
    assert.equal(award.depthBonus,expected-120);
    assert.equal(state.score,expected);
    assert.ok(near(award.averageDepth,.5));
    assert.ok(!isDeepClear(award),'only a substantial deep clear gets the banner');
  });

  test('deep gravity cascade earns extra points at detachment, once ('+layout.columns+')',()=>{
    const cells=['5,2','6,2','7,2','8,2','9,2','10,2'];
    const state=make(cells,Array(6).fill(danger));
    const result=awardBubbleClear(state,cells.map(key=>key.split(',').map(Number)),'drop');
    assert.equal(result.basePoints,180);
    assert.equal(result.points,540,'six 30-point bubbles near danger worth three times the base');
    assert.equal(result.depthBonus,360);
    assert.equal(isDeepClear(result),true);
    for(const cell of cells)state.board.delete(cell);
    const again=awardBubbleClear(state,cells.map(key=>key.split(',').map(Number)),'drop');
    assert.equal(again.points,0,'an already detached cell cannot score twice');
    assert.equal(state.score,540);
    // Falling visual/floor bursts are never reward events.
    state.falling=[{x:100,y:layout.height-55,colour:'pink',bomb:false,
      vx:0,vy:180,gravity:800,spin:0,rotation:0,burstAt:1,sparkleClock:0}];
    for(let i=0;i<10;i++)stepGame(state,.045);
    assert.equal(state.score,540);
  });

  test('bomb activation bonus stays flat while victim depth increases ('+layout.columns+')',()=>{
    const state=make(['0,2','1,2'],[top,danger]);
    const award=awardBubbleClear(state,[[0,2],[1,2]],'bomb',3);
    assert.equal(award.points,(50+25*(1+3))*3);
    assert.equal(award.basePoints,(50+25*2)*3);
    assert.equal(award.depthBonus,150);
    assert.equal(state.score,450);
    assert.equal(nextComboMultiplier(0,'bomb'),2);
    assert.equal(nextComboMultiplier(7,'bomb'),8);
    assert.equal(nextComboMultiplier(0,'contact'),1);
    assert.equal(nextComboMultiplier(11,'contact'),8);
  });

  test('configurable amounts, exponent and caps are applied without changing physics ('+layout.columns+')',()=>{
    const state=make(['1,1'],[danger]);
    state.scoringConfig={...SCORING_CONFIG,matchPointsPerBubble:10,
      maximumDepthMultiplier:4,depthExponent:1,maxComboMultiplier:3};
    assert.equal(depthMultiplier(danger,layout,state.scoringConfig),4);
    assert.equal(awardBubbleClear(state,[[1,1]],'match',2).points,80);
    assert.equal(nextComboMultiplier(3,'contact',state.scoringConfig),3);
    assert.equal(state.score,80);
  });

  test('duplicate cells and non-existent cells never earn extra points ('+layout.columns+')',()=>{
    const state=make(['0,2'],[top]);
    const award=awardBubbleClear(state,[[0,2],[0,2],[7,7]],'match');
    assert.equal(award.count,1);
    assert.equal(award.points,20);
  });
}
