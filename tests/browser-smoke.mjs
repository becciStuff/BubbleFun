// Real browser smoke test. Run from the browser CI workflow after installing
// Playwright and starting the repository's static HTTP server.
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
      const manifest = await fetch('./version.json', { cache: 'no-store' }).then(r => r.json());
      return document.querySelector('.version-number')?.textContent === manifest.version;
    });
    assert.equal(await page.locator('#game-title').textContent(), 'Bubble Shooter');
    assert.equal(await page.locator('#gravity-lab-panel').isVisible(), true);
    assert.equal(await page.locator('#gravity-surge-button').isDisabled(), true);
    // The Swing button must be usable immediately from normal Arcade.
    assert.equal(await page.locator('#gravity-swing-button').isEnabled(), true);
    await page.locator('#gravity-swing-button').click();
    assert.equal(await page.locator('#game-title').textContent(), 'Gravity Lab');
    assert.match(await page.locator('#live-status').textContent(), /Swing activated/);
    await page.waitForFunction(() => {
      const text = document.querySelector('#gravity-lab-message')?.textContent ?? '';
      return Number(text.match(/Tip is (\d+)px/)?.[1] ?? 0) > 15;
    }, null, { timeout: 3000 });
    const offsetBefore = await page.locator('#gravity-lab-message').textContent();
    await page.waitForTimeout(200);
    const offsetAfter = await page.locator('#gravity-lab-message').textContent();
    assert.notEqual(offsetAfter, offsetBefore, 'UI reports changing real physics displacement');

    await page.locator('#gravity-demo-button').click();
    assert.equal(await page.locator('#game-title').textContent(), 'Gravity Lab');
    assert.equal(await page.locator('#gravity-surge-button').isEnabled(), true);
    assert.equal(await page.locator('#gravity-swing-button').isEnabled(), true);
    assert.match(await page.locator('#instructions-copy').textContent(), /Swing the chain/);
    await page.locator('#gravity-swing-button').click();
    assert.match(await page.locator('#live-status').textContent(), /Swing activated/);
    await page.waitForTimeout(600);
    // The Arcade shooter is intentionally replaced by a deterministic lab.
    await page.locator('#gravity-surge-button').click();
    assert.equal(await page.locator('#gravity-surge-button').isDisabled(), true);
    assert.match(await page.locator('#gravity-lab-message').textContent(), /9 bubbles falling/);
    assert.equal(await page.locator('#gravity-swing-button').isEnabled(), true);
    assert.match(await page.locator('#gravity-swing-button').textContent(), /Reset & swing/);
    await page.waitForFunction(() =>
      document.querySelector('#gravity-lab-message')?.textContent?.includes('Mint bracing held'),
      null, { timeout: 8000 });
    assert.equal(await page.locator('#result-overlay').isVisible(), false);
    // Reload gives a fresh repeatable experiment.
    await page.locator('#gravity-demo-button').click();
    assert.equal(await page.locator('#gravity-surge-button').isEnabled(), true);
    assert.equal(await page.locator('#gravity-swing-button').isEnabled(), true);
    // Puzzle choice must not inherit the lab or its special action.
    await page.locator('[data-play="puzzle"]').click();
    assert.equal(await page.locator('#gravity-lab-panel').isVisible(), false);
    assert.match(await page.locator('#game-title').textContent(), /Puzzle/);
    // A real non-reduced-motion browser must compute the same moving point
    // for rendering and collision tests; the Lab itself stays diagnostic.
    const live = await page.evaluate(async () => {
      const [{ initialShooter, stepGame }, { MOBILE_LAYOUT, DESKTOP_LAYOUT, SHOT_HIT_DISTANCE },
        { shooterPosition, shotBubbleCollision }, { bubblePosition }] = await Promise.all([
          import('./src/game.js'), import('./src/config.js'),
          import('./src/grid.js'), import('./src/positions.js'),
        ]);
      const layout = innerWidth >= 900 ? DESKTOP_LAYOUT : MOBILE_LAYOUT;
      const state = initialShooter(() => .4, layout);
      state.board = new Map([['0,3','pink'],['1,3','blue'],['2,3','pink'],['3,3','blue']]);
      for (let frame = 0; frame < 12; frame++) stepGame(state, .045);
      const p = bubblePosition(state, 3, 3);
      const base = shooterPosition(3, 3, 0, layout);
      return {
        displaced: Math.hypot(p.x - base.x, p.y - base.y),
        collides: shotBubbleCollision(state.board, p.x, p.y, 0, layout, state.attachedPositions)?.join(','),
      };
    });
    assert.ok(live.displaced > .2, 'regular Arcade bubble coordinates should actually sway');
    assert.equal(live.collides, '3,3', 'projectiles must target the visible swaying bubble');
    // Independently check a lab pendulum from the actual browser's physics
    // modules: a nudge must move the tip while retaining a fixed pivot.
    const pendulum = await page.evaluate(async () => {
      const [{ initialGravityLab, nudgeGravityLab, stepGame },
        { shooterPosition }, { bubblePosition }] = await Promise.all([
          import('./src/game.js'), import('./src/grid.js'),
          import('./src/positions.js'),
        ]);
      const s = initialGravityLab();
      const start = shooterPosition(7, 3, 0, s.layout);
      stepGame(s, .045);
      nudgeGravityLab(s);
      for (let i = 0; i < 11; i++) stepGame(s, .045);
      const live = bubblePosition(s, 7, 3);
      return { delta: Math.hypot(live.x - start.x, live.y - start.y),
        fixed: JSON.stringify(bubblePosition(s, 0, 2)) === JSON.stringify(shooterPosition(0, 2, 0, s.layout)),
        braced: JSON.stringify(bubblePosition(s, 2, 5)) === JSON.stringify(shooterPosition(2, 5, 0, s.layout)) };
    });
    assert.ok(pendulum.delta > 20, 'test board should show a clearly swinging pendulum');
    assert.equal(pendulum.fixed, true);
    assert.equal(pendulum.braced, true);
    assert.deepEqual(errors, [], 'No application JavaScript exceptions');
    await page.close();
    console.log('Gravity Lab browser smoke passed at', viewport.width, 'px; reduced motion:', reducedMotion);
    }
  }
} finally {
  await browser.close();
}
