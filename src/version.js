// Load the released version from the single browser-readable source of truth.
// The JSON path is relative to this module, so it works under GitHub Pages
// project subpaths as well as on localhost.
export async function loadVersion(fetchVersion = fetch) {
  const url = new URL('../version.json', import.meta.url);
  const response = await fetchVersion(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load BubbleFun version: ${response.status}`);
  const data = await response.json();
  if (!data || typeof data.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(data.version)) {
    throw new Error('Invalid BubbleFun version.json');
  }
  return data.version;
}
