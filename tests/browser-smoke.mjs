// Browser coverage checks the ACTUAL Arcade/Puzzle interface, not a Lab.
// The geometry assertion also checks moving hitboxes on both board layouts.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    for (const viewport of [{ width: 1300, height: 860 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, reducedMotion });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle' });
      await page.waitForFunction(async () => {
        const { version } = await fetch('./version.json', { cache: 'no-store' }).then(x => x.json());
        return document.querySelector('.version-number')?.textContent === version;
      });
      assert.equal(await page.locator('#game-title').textContent(), 'Bubble Shooter');
      assert.equal(await page.locator('#gravity-lab-panel, #gravity-swing-button, #gravity-surge-button').count(), 0,
        'Lab UI and buttons must be entirely absent');
      assert.equal(await page.locator('#game-canvas').isVisible(), true);

      // Both responsive play styles expose usable earned gravity controls.
      assert.equal(await page.locator('#gravity-left').count(),1);
      assert.equal(await page.locator('#gravity-right').count(),1);
      assert.equal(await page.locator('#gravity-charge-value').textContent(),'0%');
      assert.equal(await page.locator('#gravity-left').isDisabled(),true);
      assert.equal(await page.locator('#gravity-right').isDisabled(),true);

      const gravityShift = await page.evaluate(async () => {
        const [{initialShooter,stepGame},{MOBILE_LAYOUT,DESKTOP_LAYOUT},
          {awardGravityCharge,activateGravityShift,finishGravityTurn},
          {bubblePosition}] = await Promise.all([
            import('./src/game.js'),import('./src/config.js'),
            import('./src/gravity-events.js'),import('./src/positions.js'),
          ]);
        const layout=innerWidth>=900?DESKTOP_LAYOUT:MOBILE_LAYOUT;
        const board=()=>new Map([['0,3','pink'],['1,3','pink'],
          ['2,3','blue'],['2,2','blue']]);
        const normal=initialShooter(()=>.4,layout);
        const shifted=initialShooter(()=>.4,layout);
        for(const state of [normal,shifted]) {state.board=board();state.bombs.clear();}
        awardGravityCharge(shifted,20,'pop');
        const activated=activateGravityShift(shifted,1);
        for(let i=0;i<15;i++) {stepGame(normal,.045);stepGame(shifted,.045);}
        const diff=bubblePosition(shifted,2,2).x-bubblePosition(normal,2,2).x;
        const warned=initialShooter(()=>.001,layout);
        warned.shots=3;
        const roll=finishGravityTurn(warned,()=>.001);
        return {activated,diff,roll,warned:warned.gravityEvents.warning?.direction};
      });
      assert.equal(gravityShift.activated,true);
      assert.ok(gravityShift.diff>3,'an earned shift must physically move actual bubble positions');
      assert.equal(gravityShift.roll,'warning','a finished Arcade shot schedules a possible disturbance');
      assert.equal(gravityShift.warned,-1);

      // Player action, not just a direct engine call: fire the Arcade launcher.
      const canvas = page.locator('#game-canvas');
      const bounds = await canvas.boundingBox();
      const beforeTurns = await page.locator('#turns-value').textContent();
      await canvas.click({ position: { x: bounds.width * .52, y: bounds.height * .33 } });
      await page.waitForFunction(before => {
        return document.querySelector('#turns-value')?.textContent !== before;
      }, beforeTurns, { timeout: 6000 });
      assert.equal(await page.locator('#game-title').textContent(), 'Bubble Shooter');

      // Confirm both renderer and projectile hit predicate use exactly the
      // same live positions for an ordinary ceiling-connected structure.
      const geometry = await page.evaluate(async () => {
        const [{ initialShooter, stepGame }, { MOBILE_LAYOUT, DESKTOP_LAYOUT },
          { shooterPosition, shotBubbleCollision }, { bubblePosition },
          { kickAttachedSway }] = await Promise.all([
          import('./src/game.js'), import('./src/config.js'),
          import('./src/grid.js'), import('./src/positions.js'),
          import('./src/sway.js'),
        ]);
        const layout = innerWidth >= 900 ? DESKTOP_LAYOUT : MOBILE_LAYOUT;
        const s = initialShooter(() => .4, layout);
        s.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        for (let i = 0; i < 12; i++) stepGame(s, .045);
        kickAttachedSway(s, 4, 4, 350);
        for (let i = 0; i < 5; i++) stepGame(s, .045);
        const p = bubblePosition(s, 4, 4);
        const base = shooterPosition(4, 4, 0, layout);
        return {
          move: Math.hypot(p.x - base.x, p.y - base.y),
          collides: shotBubbleCollision(s.board, p.x, p.y, s.phase, layout, s.attachedPositions)?.join(','),
          fixedRoof: JSON.stringify(bubblePosition(s, 0, 4)) === JSON.stringify(shooterPosition(0, 4, 0, layout)),
        };
      });
      assert.equal(geometry.collides, '4,4');
      assert.equal(geometry.fixedRoof, true);
      if (reducedMotion === 'reduce') assert.equal(geometry.move, 0);
      else assert.ok(geometry.move > 4, 'real Arcade bubbles must visibly respond to shots');

      // The actual real-game engine must show gravity SINK on a one-bond
      // side branch, and a surviving connected cluster must react to a bomb.
      const response = await page.evaluate(async () => {
        const [{ initialShooter, stepGame, detonateNextBomb }, { MOBILE_LAYOUT, DESKTOP_LAYOUT },
          { shooterPosition, shotBubbleCollision }, { bubblePosition }] = await Promise.all([
          import('./src/game.js'), import('./src/config.js'),
          import('./src/grid.js'), import('./src/positions.js'),
        ]);
        const layout = innerWidth >= 900 ? DESKTOP_LAYOUT : MOBILE_LAYOUT;
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const hanging = initialShooter(() => .4, layout);
        hanging.board = new Map(['0,3','1,3','2,3','2,2'].map(key=>[key,'pink']));
        hanging.bombs.clear();
        hanging.reducedMotion = reduce;
        for(let i=0;i<55;i++) stepGame(hanging,.045);
        const tip = bubblePosition(hanging,2,2);
        const rest = shooterPosition(2,2,0,layout);
        const drop = tip.y-rest.y;
        const hit = shotBubbleCollision(hanging.board,tip.x,tip.y,hanging.phase,layout,
          hanging.attachedPositions)?.join(',');

        const exploding = initialShooter(() => .4,layout);
        exploding.board = new Map([
          ['0,3','pink'],['1,3','pink'],['2,3','pink'],
          ['0,7','blue'],['1,7','blue'],['2,7','blue'],
        ]);
        exploding.bombs.clear();
        exploding.reducedMotion = reduce;
        const blast = shooterPosition(2,3,0,layout);
        exploding.pendingBombs = [{x:blast.x,y:blast.y}];
        detonateNextBomb(exploding);
        for(let i=0;i<7;i++) stepGame(exploding,.045);
        const survivor = bubblePosition(exploding,2,7);
        const survivorRest = shooterPosition(2,7,0,layout);
        return {drop,hit,recoil:survivor.x-survivorRest.x};
      });
      assert.equal(response.hit,'2,2','sagging sprites and shot hitboxes agree');
      if(reducedMotion === 'reduce') {
        assert.equal(response.drop,0);
        assert.equal(response.recoil,0);
      } else {
        assert.ok(response.drop > 4, 'a sideways-supported bubble really settles lower');
        assert.ok(response.recoil > 1, 'a survivor really responds to an explosion');
      }

      // Two moving structures can *genuinely* stick at contact, not merely
      // appear to touch. The newly formed bond must survive graph traversal.
      const contact = await page.evaluate(async () => {
        const [{ initialShooter, stepGame }, { MOBILE_LAYOUT, DESKTOP_LAYOUT },
          { shooterPosition, floatingShooter }, { bondId }] = await Promise.all([
            import('./src/game.js'), import('./src/config.js'),
            import('./src/grid.js'), import('./src/physical-bonds.js'),
          ]);
        const layout = innerWidth>=900 ? DESKTOP_LAYOUT : MOBILE_LAYOUT;
        const s=initialShooter(()=>.42,layout);
        // Mixed colours: the new contact supports a bubble but cannot pop it.
        s.board=new Map([
          ['0,2','blue'],['1,2','pink'],['2,2','green'],
          ['0,6','yellow'],['1,6','blue'],['2,6','pink'],
        ]);
        s.reducedMotion=false;
        s.bombs.clear();
        const from=shooterPosition(2,2,0,layout),to=shooterPosition(2,6,0,layout);
        s.swayDynamics.set('2,2',{x:to.x-from.x-41.2,y:0,vx:0,vy:0});
        stepGame(s,.014);
        const stuck=s.extraBonds.has(bondId('2,2','2,6'));
        s.board.delete('0,2');s.board.delete('1,2');
        const attached=!floatingShooter(s.board,0,layout,s.extraBonds)
          .some(([r,c])=>r===2&&c===2);
        return {stuck,attached};
      });
      assert.deepEqual(contact,{stuck:true,attached:true},
        'real bubble-to-bubble contact creates a load-bearing connection');

      // Browser proof of the NEW feature: physics collision -> sticky bond
      // -> automatic same-colour match -> normal score and pop (no shot fired).
      const autoMatch = await page.evaluate(async () => {
        const [{initialShooter,stepGame},{MOBILE_LAYOUT,DESKTOP_LAYOUT},
          {shooterPosition},{bondId}] = await Promise.all([
          import('./src/game.js'),import('./src/config.js'),
          import('./src/grid.js'),import('./src/physical-bonds.js'),
        ]);
        const layout=innerWidth>=900?DESKTOP_LAYOUT:MOBILE_LAYOUT;
        const s=initialShooter(()=>.4,layout);
        s.board=new Map([
          ['0,2','blue'],['1,2','pink'],['2,2','pink'],
          ['0,6','blue'],['1,6','blue'],['2,6','pink'],
        ]);
        s.bombs.clear();
        const a=shooterPosition(2,2,0,layout),b=shooterPosition(2,6,0,layout);
        s.swayDynamics.set('2,2',{x:b.x-a.x-41.2,y:0,vx:0,vy:0});
        stepGame(s,.014);
        return {bond:s.extraBonds.has(bondId('2,2','2,6')),
          score:s.score,shots:s.shots,removed:['1,2','2,2','2,6'].every(k=>!s.board.has(k)),
          event:s.lastEvent};
      });
      assert.deepEqual(autoMatch,{bond:true,score:60,shots:0,removed:true,event:'pop'},
        'newly touching same-colour bubbles must pop 3+ and score automatically');

      // Full real-colour component match (six blues + one newly touching)
      // and uninterrupted swing when a new roof row enters.
      const fixes = await page.evaluate(async () => {
        const [{ initialShooter, resolveContactMatches, descendShooter, stepGame },
          { MOBILE_LAYOUT, DESKTOP_LAYOUT, ROW_HEIGHT },
          { shooterPosition }, { bondId }] = await Promise.all([
          import('./src/game.js'), import('./src/config.js'),
          import('./src/grid.js'), import('./src/physical-bonds.js'),
        ]);
        const layout = innerWidth >= 900 ? DESKTOP_LAYOUT : MOBILE_LAYOUT;
        const state = initialShooter(() => .12, layout);
        const six = ['1,2','2,2','3,2','3,1','4,1','4,2'];
        state.board = new Map([
          ['0,2','green'], ...six.map(key => [key,'blue']),
          ['0,6','pink'],['1,6','yellow'],['2,6','blue'],
        ]);
        state.bombs.clear();
        const link = bondId('2,2','2,6');
        state.extraBonds.add(link); state.newContactBonds.add(link);
        state.comboLevel = 1;
        const popped = resolveContactMatches(state);
        const remaining = [...six,'2,6'].filter(key => state.board.has(key)).length;
        const score = state.score;

        const drop = initialShooter(() => .12, layout);
        const base = shooterPosition(2,3,drop.phase,layout);
        drop.attachedPositions.set('2,3',{x:base.x+13,y:base.y+6});
        drop.swayDynamics.set('2,3',{x:13,y:6,vx:72,vy:-35});
        const oldX=drop.attachedPositions.get('2,3').x;
        const oldY=drop.attachedPositions.get('2,3').y;
        descendShooter(drop, () => .12);
        const samePlace = Math.abs(drop.attachedPositions.get('3,3').y - drop.rowShift - oldY) < 1e-7 &&
          drop.attachedPositions.get('3,3').x === oldX;
        stepGame(drop,.045); // still animating new row
        const momentum = drop.swayDynamics.get('3,3')?.vx;
        return {popped,remaining,score,samePlace,momentum};
      });
      assert.deepEqual(fixes,{popped:7,remaining:0,score:280,samePlace:true,momentum:72},
        'entire connected colour group pops and descending rows preserve live motion');

      // A previously connected colour group must survive additional bonds
      // or bouncing. The new contact must actually merge colour COMPONENTS.
      const noFalsePop = await page.evaluate(async () => {
        const [{ initialShooter, resolveContactMatches, stepGame },
          { MOBILE_LAYOUT, DESKTOP_LAYOUT }, { bondId }] = await Promise.all([
          import('./src/game.js'), import('./src/config.js'),
          import('./src/physical-bonds.js'),
        ]);
        const layout = innerWidth >= 900 ? DESKTOP_LAYOUT : MOBILE_LAYOUT;
        const state = initialShooter(() => .4, layout);
        state.board = new Map(
          ['0,2','1,2','2,2','3,2','3,1','4,1','4,2'].map(k => [k,'blue']));
        state.bombs.clear();
        state.shots = 2;
        const redundant = bondId('2,2','4,1');
        state.extraBonds.add(redundant);
        state.newContactBonds.add(redundant);
        const first = resolveContactMatches(state);
        for (let i = 0; i < 60; i++) stepGame(state,.045);
        return {first,board:state.board.size,score:state.score,shots:state.shots};
      });
      assert.deepEqual(noFalsePop,{first:0,board:7,score:0,shots:2},
        'no auto-pop when a new bond is redundant within an existing colour group');

      // Puzzles are the second real gameplay route — not another lab.
      await page.locator('[data-play="puzzle"]').click();
      assert.match(await page.locator('#game-title').textContent(), /Puzzle/);
      assert.equal(await canvas.isVisible(), true);
      await page.waitForTimeout(850); // opening entrance transition
      const beforePuzzle = await page.locator('#turns-value').textContent();
      const puzzleBounds = await canvas.boundingBox();
      await canvas.click({ position: { x: puzzleBounds.width * .5, y: puzzleBounds.height * .34 } });
      await page.waitForFunction(before => document.querySelector('#turns-value')?.textContent !== before,
        beforePuzzle, { timeout: 6000 });
      assert.deepEqual(errors, [], 'No application JS exceptions');
      await page.close();
      console.log('Arcade + Puzzle browser smoke passed at', viewport.width,
        'px, reduced motion:', reducedMotion);
    }
  }
} finally {
  await browser.close();
}
