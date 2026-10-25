import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadVersion } from '../src/version.js';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('version.json', root), 'utf8'));
const current = manifest.version;

test('JSON manifest is the only display source and agrees with package metadata', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(current, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.version, current);
  assert.match(html, /<span class="version-pill">Version <span class="version-number">—<\/span><\/span>/);
  assert.doesNotMatch(html, /PUZZLE EDITION|version-number">v?\d/);
});

test('browser loader reads version.json relative to its module without stale caching', async () => {
  let requested;
  const version = await loadVersion(async (url, options) => {
    requested = { url, options };
    return { ok: true, json: async () => manifest };
  });
  assert.equal(version, current);
  assert.equal(requested.url.pathname.endsWith('/version.json'), true);
  assert.equal(requested.options.cache, 'no-store');
});

test('browser loader rejects missing and malformed release manifests', async () => {
  await assert.rejects(loadVersion(async () => ({ ok: false, status: 404 })), /Unable to load/);
  await assert.rejects(loadVersion(async () => ({ ok: true, json: async () => ({ version: 'latest' }) })), /Invalid/);
});

test('version bump command advances patch and minor versions together', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'bubblefun-version-'));
  const [major, minor, patch] = current.split('.').map(Number);
  const patchVersion = [major, minor, patch + 1].join('.');
  const minorVersion = [major, minor + 1, 0].join('.');
  try {
    await mkdir(join(folder, 'scripts'));
    for (const file of ['package.json', 'version.json', 'scripts/bump-version.mjs']) {
      await copyFile(new URL(file, root), join(folder, file));
    }
    const command = join(folder, 'scripts/bump-version.mjs');
    execFileSync(process.execPath, [command, 'patch'], { stdio: 'pipe' });
    let pkg = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
    let info = JSON.parse(await readFile(join(folder, 'version.json'), 'utf8'));
    assert.equal(pkg.version, patchVersion);
    assert.equal(info.version, patchVersion);

    execFileSync(process.execPath, [command, 'minor'], { stdio: 'pipe' });
    pkg = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
    info = JSON.parse(await readFile(join(folder, 'version.json'), 'utf8'));
    assert.equal(pkg.version, minorVersion);
    assert.equal(info.version, minorVersion);

    // Reject drift instead of pretending to have released a version.
    info.version = '9.9.9';
    await writeFile(join(folder, 'version.json'), JSON.stringify(info));
    assert.throws(() => execFileSync(process.execPath, [command, 'patch'], { stdio: 'pipe' }));
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
