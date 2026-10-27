import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LAYOUT, DESKTOP_LAYOUT, ROW_HEIGHT } from '../src/config.js';
import { shooterPosition } from '../src/grid.js';
import { bondId } from '../src/physical-bonds.js';
import { initialShooter, descendShooter, stepGame } from '../src/game.js';
import { bubblePosition } from '../src/positions.js';

for (const layout of [MOBILE_LAYOUT, DESKTOP_LAYOUT]) {
  test(`ceiling row preserves the SAME swinging bubble centres, velocities and contacts (${layout.columns})`, () => {
    const state = initialShooter(() => .12, layout);
    const oldCell = '2,3', newCell = '3,3';
    const rest = shooterPosition(2,3,state.phase,layout);
    const oldPosition = {x:rest.x + 14.5,y:rest.y + 8.25};
    const oldMotion = {x:14.5,y:8.25,vx:-83,vy:46};
    state.swayDynamics.set(oldCell, {...oldMotion});
    state.attachedPositions.set(oldCell, {...oldPosition});
    state.wobble.set(oldCell,.6);
    const oldBond = bondId('1,3','2,3');
    const newBond = bondId('2,3','3,3');
    state.extraBonds.add(oldBond);
    state.newContactBonds.add(oldBond);
    state.separatedBonds.add(oldBond);
    descendShooter(state, () => .11);
    assert.equal(state.phase,1);
    assert.equal(state.board.has(newCell),true);
    assert.equal(state.board.has(oldCell),true, 'the NEW top row is in the old addresses');
    assert.deepEqual(state.swayDynamics.get(newCell),oldMotion);
    assert.equal(state.swayDynamics.has(oldCell),false);
    assert.deepEqual(state.attachedPositions.get(newCell),{
      x:oldPosition.x,y:oldPosition.y + ROW_HEIGHT,
    });
    assert.ok(Math.abs(bubblePosition(state,3,3).y - state.rowShift - oldPosition.y)<1e-8,
      'the old bubble stays in precisely the same visible place at the start of the drop');
    for (const set of [state.extraBonds,state.newContactBonds,state.separatedBonds]) {
      assert.ok(set.has(newBond),'sticky, pending and separated bonds must follow their original cells');
      assert.equal(set.has(oldBond),false,'no stale bond references after key translation');
    }
    assert.equal(state.wobble.get(newCell),.6);
    stepGame(state,.045); // still in row transition; physics must be paused, NOT erased
    assert.equal(state.swayDynamics.get(newCell).vx,-83);
    assert.equal(state.swayDynamics.get(newCell).vy,46);
    assert.ok(state.attachedPositions.has(newCell));
  });

  test(`row transition resumes from existing momentum, not from a frozen new grid (${layout.columns})`,()=>{
    const state=initialShooter(()=>.25,layout);
    state.swayDynamics.set('3,4',{x:15,y:6,vx:94,vy:-38});
    const base=shooterPosition(3,4,state.phase,layout);
    state.attachedPositions.set('3,4',{x:base.x+15,y:base.y+6});
    descendShooter(state,()=>.3);
    // Complete the visible drop with simulation steps. Momentum should be
    // unchanged until the row-drop animation ends, then evolve naturally.
    let previous=state.swayDynamics.get('4,4').vx;
    for (let i=0;i<15 && state.rowShift>.5;i++) {
      stepGame(state,.045);
      if(state.rowShift>.5) assert.equal(state.swayDynamics.get('4,4').vx,previous);
    }
    assert.ok(state.rowShift<=.5,'row animation eventually finishes');
    stepGame(state,.045);
    const current=state.swayDynamics.get('4,4');
    assert.ok(current && Number.isFinite(current.vx) && Number.isFinite(current.vy));
    assert.notEqual(current.vx,0, 'bubble continues with its previous momentum');
    assert.ok(Math.abs(current.x)>1, 'bubble does not restart at zero offset');
    assert.notEqual(current.vx,previous, 'springs respond to the newly added ceiling');
  });
}
