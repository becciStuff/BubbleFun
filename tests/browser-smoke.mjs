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
