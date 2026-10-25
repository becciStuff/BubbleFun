// Release helper. The JSON manifest drives the displayed version;
// package.json mirrors it for tooling. No HTML/JS version numbers to edit.
// Usage: npm run version:patch | npm run version:minor
import { readFile, writeFile } from 'node:fs/promises';

const part = process.argv[2];
if (!['patch', 'minor', 'major'].includes(part)) {
  console.error('Usage: node scripts/bump-version.mjs patch|minor|major');
  process.exitCode = 1;
} else {
  const root = new URL('../', import.meta.url);
  const manifestUrl = new URL('version.json', root);
  const packageUrl = new URL('package.json', root);
  const [manifest, pkg] = await Promise.all([
    readFile(manifestUrl, 'utf8').then(JSON.parse),
    readFile(packageUrl, 'utf8').then(JSON.parse),
  ]);
  const current = manifest.version;
  if (typeof current !== 'string' || !/^\d+\.\d+\.\d+$/.test(current) || pkg.version !== current) {
    throw new Error('version.json and package.json are missing or out of sync');
  }
  const parts = current.split('.').map(Number);
  if (part === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
  else if (part === 'minor') { parts[1]++; parts[2] = 0; }
  else parts[2]++;
  const next = parts.join('.');
  manifest.version = next;
  pkg.version = next;
  await Promise.all([
    writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + '\n'),
    writeFile(packageUrl, JSON.stringify(pkg, null, 2) + '\n'),
  ]);
  console.log('BubbleFun version: ' + current + ' → ' + next);
}
