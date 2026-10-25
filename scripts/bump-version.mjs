// Lightweight release helper; no framework, bundler or dependency required.
// Usage: node scripts/bump-version.mjs patch|minor|major
import { readFile, writeFile } from 'node:fs/promises';

const part = process.argv[2];
if (!['patch', 'minor', 'major'].includes(part)) {
  console.error('Usage: npm run version:patch | npm run version:minor');
  process.exitCode = 1;
} else {
  const root = new URL('../', import.meta.url);
  const paths = ['package.json', 'src/version.js', 'index.html'];
  const urls = paths.map(path => new URL(path, root));
  const [packageSource, moduleSource, htmlSource] = await Promise.all(urls.map(url => readFile(url, 'utf8')));
  const packageVersion = JSON.parse(packageSource).version;
  const moduleVersion = moduleSource.match(/export const VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';/)?.[1];
  const htmlVersion = htmlSource.match(/<span class="version-number">v([0-9]+\.[0-9]+\.[0-9]+)<\/span>/)?.[1];
  if (packageVersion !== moduleVersion || moduleVersion !== htmlVersion) {
    throw new Error('Version identifiers are out of sync; reconcile package.json, src/version.js and index.html before bumping.');
  }
  const parts = packageVersion.split('.').map(Number);
  if (part === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
  else if (part === 'minor') { parts[1]++; parts[2] = 0; }
  else parts[2]++;
  const next = parts.join('.');
  const outputs = [
    packageSource.replace(/("version":\s*")[0-9]+\.[0-9]+\.[0-9]+(")/, (_match, before, after) => before + next + after),
    moduleSource.replace(/export const VERSION = '[0-9]+\.[0-9]+\.[0-9]+';/, "export const VERSION = '" + next + "';"),
    htmlSource.replace(/<span class="version-number">v[0-9]+\.[0-9]+\.[0-9]+<\/span>/, '<span class="version-number">v' + next + '</span>'),
  ];
  // Files change together when this command completes. Tests catch incomplete commits.
  await Promise.all(urls.map((url, i) => writeFile(url, outputs[i])));
  console.log('BubbleFun version: ' + packageVersion + ' → ' + next);
}
