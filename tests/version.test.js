import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { VERSION } from '../src/version.js';

const root = new URL('../', import.meta.url);

test('browser version, package version and HTML fallback agree', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.version, VERSION);
  assert.match(html, new RegExp('<span class="version-number">v' + VERSION.replaceAll('.', '\\.') + '</span>'));
});

test('version bump command advances patch and minor versions together', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'bubblefun-version-'));
  const [major, minor, patch] = VERSION.split('.').map(Number);
  const patchVersion = [major, minor, patch + 1].join('.');
  const minorVersion = [major, minor + 1, 0].join('.');
  try {
    await mkdir(join(folder, 'src'));
    await mkdir(join(folder, 'scripts'));
    for (const file of ['package.json', 'src/version.js', 'index.html', 'scripts/bump-version.mjs']) {
      await copyFile(new URL(file, root), join(folder, file));
    }
    const command = join(folder, 'scripts/bump-version.mjs');
    execFileSync(process.execPath, [command, 'patch'], { stdio: 'pipe' });
    let pkg = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
    assert.equal(pkg.version, patchVersion);
    assert.ok((await readFile(join(folder, 'src/version.js'), 'utf8')).includes("VERSION = '" + patchVersion + "'"));
    execFileSync(process.execPath, [command, 'minor'], { stdio: 'pipe' });
    pkg = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'));
    assert.equal(pkg.version, minorVersion);
    assert.ok((await readFile(join(folder, 'index.html'), 'utf8')).includes('class="version-number">v' + minorVersion + '</span>'));
    // The command rejects drift rather than silently masking a release error.
    await writeFile(join(folder, 'src/version.js'), "export const VERSION = '9.9.9';\n");
    assert.throws(() => execFileSync(process.execPath, [command, 'patch'], { stdio: 'pipe' }));
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
