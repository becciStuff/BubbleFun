import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { VERSION } from '../src/version.js';

const root = new URL('../', import.meta.url);

test('browser version, package version and HTML fallback agree', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.version, VERSION);
  assert.match(html, new RegExp('<span class="version-number">v' + VERSION.replaceAll('.', '\\.') + '</span>'));
});
