// Real browser smoke test. Run from the browser CI workflow after installing
// Playwright and starting the repository's static HTTP server.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 1300, height: 860 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('.version-number')?.textContent === '0.6.0');
    assert.equal(await page.locator('#game-title').textContent(), 'Bubble Shooter');
    assert.equal(await page.locator('#gravity-lab-panel').isVisible(), true);
    assert.equal(await page.locator('#gravity-surge-button').isDisabled(), true);

    await page.locator('#gravity-demo-button').click();
    assert.equal(await page.locator('#game-title').textContent(), 'Gravity Lab');
    assert.equal(await page.locator('#gravity-surge-button').isEnabled(), true);
    assert.match(await page.locator('#instructions-copy').textContent(), /Amber outlines/);
    // The Arcade shooter is intentionally replaced by a deterministic lab.
    await page.locator('#gravity-surge-button').click();
    assert.equal(await page.locator('#gravity-surge-button').isDisabled(), true);
    assert.match(await page.locator('#gravity-lab-message').textContent(), /3 bubbles falling/);
    await page.waitForFunction(() =>
      document.querySelector('#gravity-lab-message')?.textContent?.includes('Mint bracing held'),
      null, { timeout: 8000 });
    assert.equal(await page.locator('#result-overlay').isVisible(), false);
    // Reload gives a fresh repeatable experiment.
    await page.locator('#gravity-demo-button').click();
    assert.equal(await page.locator('#gravity-surge-button').isEnabled(), true);
    // Puzzle choice must not inherit the lab or its special action.
    await page.locator('[data-play="puzzle"]').click();
    assert.equal(await page.locator('#gravity-lab-panel').isVisible(), false);
    assert.match(await page.locator('#game-title').textContent(), /Puzzle/);
    assert.deepEqual(errors, [], 'No application JavaScript exceptions');
    await page.close();
    console.log('Gravity Lab browser smoke passed at', viewport.width, 'px');
  }
} finally {
  await browser.close();
}
